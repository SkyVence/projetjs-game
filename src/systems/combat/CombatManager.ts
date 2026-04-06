import { Player } from "@/class/player";
import { Enemy } from "@/class/enemy";
import { Fighter } from "./Fighter";
import { CombatPhase, GameState } from "./GameState";
import { UIRenderer } from "./UIRenderer";
import { EnemyAI } from "./EnemyAI";
import type { InventoryItemId } from "@/class/player";

type LootDropId = InventoryItemId;

type LootTableEntry = {
  id: LootDropId;
  name: string;
  chance: number;
  minAmount: number;
  maxAmount: number;
};

export interface CombatResult {
  outcome: "victory" | "defeat" | "escaped";
  xpGained: number;
  loot?: {
    id: LootDropId;
    name: string;
    amount: number;
  };
}

const LOOT_TABLE: LootTableEntry[] = [
  {
    id: "potion",
    name: "Potion de soin",
    chance: 0.5,
    minAmount: 1,
    maxAmount: 2,
  },
  {
    id: "power_tonic",
    name: "Tonique de force",
    chance: 0.3,
    minAmount: 1,
    maxAmount: 1,
  },
  {
    id: "guard_charm",
    name: "Charme garde",
    chance: 0.2,
    minAmount: 1,
    maxAmount: 1,
  },
];

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
  private enemyAI = new EnemyAI();
  private attackBuff = 0;
  private buffTurnsLeft = 0;
  private guardCharges = 0;
  private lootGranted = false;
  private readonly enemyParryChance = 0.2;
  private readonly damageBoost = 1.7;
  private readonly enemyDelay = 1900;

  constructor(
    private container: HTMLElement,
    player: Player,
    enemy: Enemy,
  ) {
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
      this.ui.setMessage(
        `<strong class="enemy-name-line">${this.enemy.name}</strong>Un ${this.enemy.name} apparaît !`,
      );
      this.ui.setTurnLabel("Ton tour");
      this.state.setPhase(CombatPhase.PlayerTurn, "Ton tour");
      this.ui.showTiming(false);
      this.ui.setButtonsDisabled(false);
      this.timingCursor = 0;
      this.timingActive = false;
      this.refreshActionLabels();
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
    this.ui.hideInventory();
    this.ui.hideReward();
    this.refreshActionLabels();
    this.state.setPhase(CombatPhase.PlayerTiming, "Maintiens Espace");
    this.ui.setTurnLabel("Maintiens Espace");
    this.ui.setButtonsDisabled(true);
    this.ui.showTiming(true);
    this.ui.setMessage(
      `<strong class="action-name">Attaque</strong>Maintiens Espace puis relâche dans le vert.`,
    );
    this.timingZoneStart = 0.2 + Math.random() * 0.45;
    this.timingZoneWidth = 0.12 + Math.random() * 0.12;
    this.timingCursor = 0;
    this.startTime = performance.now();
    this.timingLastFrame = this.startTime;
    this.spaceHeld = false;
    this.timingActive = true;
    this.ui.updateTiming(
      this.timingCursor,
      this.timingZoneStart,
      this.timingZoneWidth,
    );
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

      this.ui.updateTiming(
        this.timingCursor,
        this.timingZoneStart,
        this.timingZoneWidth,
      );

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

    const inGreen =
      this.timingCursor >= this.timingZoneStart &&
      this.timingCursor <= this.timingZoneStart + this.timingZoneWidth;
    const parried = Math.random() < this.enemyParryChance;
    const rawDamage = inGreen
      ? Math.round((this.player.attack + this.attackBuff) * this.damageBoost)
      : 0;
    const dealtDamage =
      rawDamage <= 0
        ? 0
        : parried
          ? Math.max(1, Math.floor(rawDamage * 0.5))
          : rawDamage;
    const defenseMitigation = Math.max(
      0,
      Math.round(this.player.defense * 0.35),
    );
    const finalDamage =
      dealtDamage <= 0 ? 0 : Math.max(1, dealtDamage - defenseMitigation);

    this.state.setPhase(CombatPhase.Animating, inGreen ? "Impact" : "Raté");
    this.ui.setTurnLabel(inGreen ? "Impact" : "Raté");
    this.ui.showTiming(false);
    this.ui.setMessage(
      inGreen
        ? '<strong class="action-name">Parfait !</strong>'
        : '<strong class="action-name">Raté !</strong>',
    );
    this.ui.flash("enemy");

    window.setTimeout(() => {
      if (dealtDamage <= 0) {
        this.ui.setMessage(
          `<strong class="action-name">Aucun dégât.</strong><br>${this.enemy.name} prépare sa riposte...`,
        );
      } else {
        const damage = this.enemy.applyDamage(finalDamage);
        this.ui.setMessage(
          parried
            ? `<strong class="action-name">Parade partielle.</strong><br>${this.enemy.name} prend ${damage} dégâts.`
            : `<strong class="action-name">Vous infligez ${damage} dégâts.</strong><br>${this.enemy.name} vacille.`,
        );
      }

      this.ui.setPlayerStats(
        this.player.name,
        this.player.hp,
        this.player.maxHp,
      );
      this.ui.setTurnLabel(`Ton tour | DEF ${this.player.defense}`);
      this.ui.setEnemyStats(this.enemy.name, this.enemy.hp, this.enemy.maxHp);
      this.tickBuffDuration();

      window.setTimeout(() => {
        if (!this.enemy.isAlive()) {
          const loot = this.rollLootDrop();
          const result: CombatResult = { outcome: "victory", xpGained: 20 };
          if (loot) {
            result.loot = loot;
          }

          this.ui.showReward(
            "Victoire !",
            loot
              ? [
                  `${this.enemy.name} laisse tomber ${loot.amount} ${loot.name}${loot.amount > 1 ? "s" : ""}.`,
                  `Tu gagnes 20 XP.`,
                ]
              : [
                  `${this.enemy.name} ne laisse rien derrière lui.`,
                  `Tu gagnes 20 XP.`,
                ],
            () => {
              this.finish(result);
            },
          );
          return;
        }

        this.state.setPhase(CombatPhase.EnemyTurn, "Tour ennemi");
        this.ui.setTurnLabel("Tour ennemi");
        this.ui.setButtonsDisabled(true);
        this.refreshActionLabels();

        this.enemyTurnTimer = window.setTimeout(
          () => this.resolveEnemyTurn(),
          this.enemyDelay,
        );
      }, 1100);
    }, 650);
  }

  private resolveEnemyTurn(): void {
    if (this.state.phase !== CombatPhase.EnemyTurn) return;

    const action = this.enemyAI.chooseAction(this.enemy, this.player);
    this.ui.setTurnLabel(action.label);

    if (action.type === "heal") {
      const healed = this.enemy.heal(action.amount);
      this.ui.setMessage(
        `<strong class="action-name">${this.enemy.name} utilise ${action.label}</strong><br>+${healed} PV récupérés.`,
      );
      this.ui.setEnemyStats(this.enemy.name, this.enemy.hp, this.enemy.maxHp);
    } else {
      const variance = 0.8 + Math.random() * 0.18;
      const rawDamage = Math.max(
        1,
        Math.round(this.enemy.attack * action.powerMultiplier * variance),
      );
      const dealt =
        this.guardCharges > 0 ? 0 : this.player.applyDamage(rawDamage);
      if (this.guardCharges > 0) {
        this.guardCharges -= 1;
      }
      this.ui.flash("player");
      this.ui.setMessage(
        dealt === 0
          ? `<strong class="action-name">${this.enemy.name} utilise ${action.label}</strong><br>Le charme bloque l'attaque !`
          : `<strong class="action-name">${this.enemy.name} utilise ${action.label}</strong><br>${dealt} dégâts encaissés.`,
      );
      this.ui.setPlayerStats(
        this.player.name,
        this.player.hp,
        this.player.maxHp,
      );
      this.ui.setTurnLabel(`Tour ennemi | DEF ${this.player.defense}`);
    }

    if (!this.player.isAlive()) {
      this.finish({ outcome: "defeat", xpGained: 0 });
      return;
    }

    window.setTimeout(() => {
      this.state.setPhase(CombatPhase.PlayerTurn, "Ton tour");
      this.ui.setTurnLabel("Ton tour");
      this.ui.setButtonsDisabled(false);
      this.refreshActionLabels();
    }, 900);
  }

  private useItem = (): void => {
    if (this.state.phase !== CombatPhase.PlayerTurn) return;

    const inventory = this.player.getInventory();
    this.ui.showInventory(
      inventory,
      (id) => this.consumeItemFromInventory(id as InventoryItemId),
      () => {
        this.ui.hideInventory();
        this.refreshActionLabels();
      },
    );
  };

  private escapeCombat = (): void => {
    if (
      this.state.phase === CombatPhase.Victory ||
      this.state.phase === CombatPhase.Defeat
    )
      return;
    this.finish({ outcome: "escaped", xpGained: 0 });
  };

  private finish(result: CombatResult): void {
    if (this.resolveEnd) {
      this.resolveEnd(result);
      this.resolveEnd = null;
    }
    this.state.setPhase(
      result.outcome === "victory"
        ? CombatPhase.Victory
        : result.outcome === "defeat"
          ? CombatPhase.Defeat
          : CombatPhase.Escaped,
      result.outcome.toUpperCase(),
    );
    this.destroy();
  }

  private tickBuffDuration(): void {
    if (this.buffTurnsLeft <= 0) return;
    this.buffTurnsLeft -= 1;
    if (this.buffTurnsLeft <= 0) {
      this.attackBuff = 0;
      this.ui.setMessage(
        `<strong class="action-name">Effet terminé</strong>Le bonus d'attaque disparaît.`,
      );
    }
  }

  private refreshActionLabels(): void {
    const attackLabel =
      this.attackBuff > 0 ? `Attaquer (+${this.attackBuff})` : "Attaquer";

    this.ui.setActionLabels(attackLabel, "Objet", "Fuir");
  }

  private consumeItemFromInventory(itemId: InventoryItemId): void {
    if (this.state.phase !== CombatPhase.PlayerTurn) return;

    const item = this.player.consumeInventoryItem(itemId);
    if (!item) {
      const itemName =
        itemId === "potion"
          ? "Potion de soin"
          : itemId === "power_tonic"
            ? "Tonique de force"
            : "Charme garde";
      this.ui.setMessage(
        `<strong class="action-name">${itemName}</strong>Il n'y en a plus.`,
      );
      this.ui.hideInventory();
      this.refreshActionLabels();
      return;
    }

    if (item.effect === "heal") {
      const healed = this.player.heal(item.value);
      this.ui.setMessage(
        `<strong class="action-name">${item.name}</strong>+${healed} PV.`,
      );
      this.ui.setPlayerStats(
        this.player.name,
        this.player.hp,
        this.player.maxHp,
      );
    } else if (item.effect === "buff") {
      this.attackBuff += item.value;
      this.buffTurnsLeft = item.durationTurns ?? 2;
      this.ui.setMessage(
        `<strong class="action-name">${item.name}</strong>ATQ +${item.value} pour ${this.buffTurnsLeft} tours.`,
      );
    } else {
      this.guardCharges += 1;
      this.ui.setMessage(
        `<strong class="action-name">${item.name}</strong>Le prochain coup ennemi est bloqué.`,
      );
    }

    this.ui.hideInventory();
    this.state.setPhase(CombatPhase.EnemyTurn, "Tour ennemi");
    this.ui.setButtonsDisabled(true);
    this.refreshActionLabels();
    this.enemyTurnTimer = window.setTimeout(
      () => this.resolveEnemyTurn(),
      this.enemyDelay,
    );
  }

  private rollLootDrop(): {
    id: LootDropId;
    name: string;
    amount: number;
  } | null {
    if (this.lootGranted) return null;
    this.lootGranted = true;

    const roll = Math.random();
    if (roll > 0.72) return null;

    const lootPool = LOOT_TABLE.map((entry, index) => {
      const bonus = index === 0 ? 0.1 : index === 1 ? 0.04 : 0.0;
      return { ...entry, chance: entry.chance + bonus };
    });

    const totalChance = lootPool.reduce((sum, entry) => sum + entry.chance, 0);
    let cursor = 0;
    const normalizedRoll = roll * totalChance;

    for (const entry of lootPool) {
      cursor += entry.chance;
      if (normalizedRoll <= cursor) {
        const amount =
          entry.minAmount === entry.maxAmount
            ? entry.minAmount
            : Math.floor(
                entry.minAmount +
                  Math.random() * (entry.maxAmount - entry.minAmount + 1),
              );

        this.player.addInventoryItem(entry.id, amount);

        return {
          id: entry.id,
          name: entry.name,
          amount,
        };
      }
    }

    return null;
  }
}
