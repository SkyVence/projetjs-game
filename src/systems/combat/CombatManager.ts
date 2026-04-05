import { Player } from "@/class/player";
import { Enemy } from "@/class/enemy";
import { Fighter } from "./Fighter";
import { CombatPhase, GameState } from "./GameState";
import { UIRenderer } from "./UIRenderer";

export interface CombatResult {
  outcome: "victory" | "defeat" | "escaped";
  xpGained: number;
}

export class CombatManager {
  private ui: UIRenderer;
  private state = new GameState();
  private player: Fighter;
  private enemy: Fighter;
  private resolveEnd: ((result: CombatResult) => void) | null = null;
  private combatPromise: Promise<CombatResult> | null = null;
  private animationFrame: number | null = null;
  private timingActive = false;
  private startTime = 0;
  private timingCursor = 0;
  private timingZoneStart = 0.25;
  private timingZoneWidth = 0.16;
  private timingLastFrame = 0;
  private spaceHeld = false;
  private enemyTurnTimer: number | null = null;
  private readonly enemyParryChance = 0.2;
  private readonly damageBoost = 1.7;
  private readonly enemyDelay = 1500;

  constructor(private container: HTMLElement, player: Player, enemy: Enemy) {
    this.player = new Fighter(player);
    this.enemy = new Fighter(enemy);
    this.ui = new UIRenderer(container, this.player.name, this.enemy.name);
    this.ui.setPlayerStats(this.player.name, this.player.hp, this.player.maxHp);
    this.ui.setEnemyStats(this.enemy.name, this.enemy.hp, this.enemy.maxHp);
  }

  get root(): HTMLElement {
    return this.ui.root;
  }

  get view(): HTMLElement {
    return this.ui.root;
  }

  start(): Promise<CombatResult> {
    if (!this.combatPromise) {
      this.combatPromise = new Promise<CombatResult>((resolve) => {
        this.resolveEnd = resolve;
      });

      this.bindInput();
      this.ui.setMessage(`Un ${this.enemy.name} apparaît !`);
      this.ui.setTurnLabel("Ton tour");
      this.state.setPhase(CombatPhase.PlayerTurn, "Ton tour");
      this.ui.showTiming(false);
      this.ui.setButtonsDisabled(false);
      this.timingCursor = 0;
      this.timingActive = false;
    }

    return this.combatPromise;
  }

  destroy(): void {
    this.unbindInput();
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.enemyTurnTimer !== null) {
      window.clearTimeout(this.enemyTurnTimer);
    }
    this.timingActive = false;
    this.ui.destroy();
  }

  private bindInput(): void {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp, { passive: false });

    this.ui.attackButton.addEventListener("click", this.beginPlayerAttack);
    this.ui.itemButton.addEventListener("click", this.useItem);
    this.ui.runButton.addEventListener("click", this.escapeCombat);
  }

  private unbindInput(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.ui.attackButton.removeEventListener("click", this.beginPlayerAttack);
    this.ui.itemButton.removeEventListener("click", this.useItem);
    this.ui.runButton.removeEventListener("click", this.escapeCombat);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "Space") return;
    if (this.state.phase === CombatPhase.PlayerTiming) {
      event.preventDefault();
      this.spaceHeld = true;
      if (this.animationFrame === null) {
        this.startTimingLoop();
      }
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.code !== "Space") return;
    event.preventDefault();
    if (this.state.phase === CombatPhase.PlayerTiming && this.spaceHeld) {
      this.spaceHeld = false;
      this.resolvePlayerTiming();
    }
  };

  private beginPlayerAttack = (): void => {
    if (this.state.phase !== CombatPhase.PlayerTurn) return;
    this.state.setPhase(CombatPhase.PlayerTiming, "Maintiens Espace");
    this.ui.setTurnLabel("Maintiens Espace");
    this.ui.setButtonsDisabled(true);
    this.ui.showTiming(true);
    this.ui.setMessage("Maintiens Espace puis relâche dans le vert.");
    this.timingZoneStart = 0.2 + Math.random() * 0.45;
    this.timingZoneWidth = 0.12 + Math.random() * 0.12;
    this.timingCursor = 0;
    this.startTime = performance.now();
    this.timingLastFrame = this.startTime;
    this.spaceHeld = false;
    this.timingActive = true;
    this.ui.updateTiming(this.timingCursor, this.timingZoneStart, this.timingZoneWidth);
    this.startTimingLoop();
  };

  private startTimingLoop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    const tick = (now: number): void => {
      if (this.state.phase !== CombatPhase.PlayerTiming) return;
      const delta = Math.min((now - this.timingLastFrame) / 1000, 0.05);
      this.timingLastFrame = now;

      if (this.spaceHeld) {
        this.timingCursor = Math.min(1, this.timingCursor + delta * 0.85);
      } else {
        this.timingCursor = Math.max(0, this.timingCursor - delta * 1.25);
      }

      this.ui.updateTiming(this.timingCursor, this.timingZoneStart, this.timingZoneWidth);

      if (this.timingCursor >= 1 && this.spaceHeld) {
        this.resolvePlayerTiming();
        return;
      }

      this.animationFrame = requestAnimationFrame(tick);
    };

    this.animationFrame = requestAnimationFrame(tick);
  }

  private resolvePlayerTiming(): void {
    if (this.state.phase !== CombatPhase.PlayerTiming) return;

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.timingActive = false;

    const inGreen = this.timingCursor >= this.timingZoneStart && this.timingCursor <= this.timingZoneStart + this.timingZoneWidth;
    const parried = Math.random() < this.enemyParryChance;
    const rawDamage = inGreen ? Math.round(this.player.attack * this.damageBoost) : 0;
    const dealtDamage = rawDamage <= 0 ? 0 : parried ? Math.max(1, Math.floor(rawDamage * 0.5)) : rawDamage;

    this.state.setPhase(CombatPhase.Animating, inGreen ? "Impact" : "Raté");
    this.ui.setTurnLabel(inGreen ? "Impact" : "Raté");
    this.ui.showTiming(false);
    this.ui.setMessage(inGreen ? "Parfait !" : "Raté !");
    this.ui.flash("enemy");

    window.setTimeout(() => {
      if (dealtDamage <= 0) {
        this.ui.setMessage("Aucun dégât.");
      } else {
        const damage = this.enemy.applyDamage(dealtDamage);
        this.ui.setMessage(parried ? `L'ennemi pare partiellement et prend ${damage} dégâts.` : `Vous infligez ${damage} dégâts.`);
      }

      this.ui.setPlayerStats(this.player.name, this.player.hp, this.player.maxHp);
      this.ui.setEnemyStats(this.enemy.name, this.enemy.hp, this.enemy.maxHp);

      if (!this.enemy.isAlive()) {
        this.finish({ outcome: "victory", xpGained: 20 });
        return;
      }

      this.state.setPhase(CombatPhase.EnemyTurn, "Tour ennemi");
      this.ui.setTurnLabel("Tour ennemi");
      this.ui.setButtonsDisabled(true);

      this.enemyTurnTimer = window.setTimeout(() => this.resolveEnemyTurn(), this.enemyDelay);
    }, 450);
  }

  private resolveEnemyTurn(): void {
    if (this.state.phase !== CombatPhase.EnemyTurn) return;

    const variance = 0.85 + Math.random() * 0.3;
    const rawDamage = Math.max(1, Math.round(this.enemy.attack * variance));
    const dealt = this.player.applyDamage(rawDamage);

    this.ui.flash("player");
    this.ui.setMessage(`${this.enemy.name} attaque pour ${dealt} dégâts.`);
    this.ui.setPlayerStats(this.player.name, this.player.hp, this.player.maxHp);
    this.ui.setEnemyStats(this.enemy.name, this.enemy.hp, this.enemy.maxHp);

    if (!this.player.isAlive()) {
      this.finish({ outcome: "defeat", xpGained: 0 });
      return;
    }

    this.state.setPhase(CombatPhase.PlayerTurn, "Ton tour");
    this.ui.setTurnLabel("Ton tour");
    this.ui.setButtonsDisabled(false);
  }

  private useItem = (): void => {
    if (this.state.phase !== CombatPhase.PlayerTurn) return;
    const healed = this.player.heal(25);
    this.ui.setMessage(`Potion: +${healed} PV.`);
    this.ui.setPlayerStats(this.player.name, this.player.hp, this.player.maxHp);
    this.state.setPhase(CombatPhase.EnemyTurn, "Tour ennemi");
    this.ui.setButtonsDisabled(true);
    this.enemyTurnTimer = window.setTimeout(() => this.resolveEnemyTurn(), this.enemyDelay);
  };

  private escapeCombat = (): void => {
    if (this.state.phase === CombatPhase.Victory || this.state.phase === CombatPhase.Defeat) return;
    this.finish({ outcome: "escaped", xpGained: 0 });
  };

  private finish(result: CombatResult): void {
    if (this.resolveEnd) {
      this.resolveEnd(result);
      this.resolveEnd = null;
    }
    this.state.setPhase(result.outcome === "victory" ? CombatPhase.Victory : result.outcome === "defeat" ? CombatPhase.Defeat : CombatPhase.Escaped, result.outcome.toUpperCase());
    this.destroy();
  }
}
