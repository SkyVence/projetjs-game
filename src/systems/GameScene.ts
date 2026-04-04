import { Entity } from "@/class/entity";
import { Player } from "@/class/player";
import { Enemy } from "@/class/enemy";
import { Position } from "@/class/base/position";
import { Velocity } from "@/class/base/velocity";
import { Health } from "@/class/base/health";
import { InputManager } from "@/systems/InputManager";
import { CanvasRenderer } from "@/systems/CanvasRenderer";
import { Camera } from "@/systems/Camera";
import { GameLoop } from "@/systems/GameLoop";
import { ENEMY_TEMPLATES } from "@/data/enemies";

export interface GameSceneConfig {
  mapWidth: number;
  mapHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

export class GameScene {
  private container: HTMLElement;
  private config: GameSceneConfig;

  private renderer: CanvasRenderer;
  private camera: Camera;
  private gameLoop: GameLoop;
  private input: InputManager;

  private entities: Entity[] = [];
  private enemies: Entity[] = [];
  private player: Player | null = null;
  private combatOverlay: HTMLDivElement | null = null;
  private combatBackdrop: HTMLDivElement | null = null;
  private combatPanel: HTMLDivElement | null = null;
  private combatHeader: HTMLDivElement | null = null;
  private combatLog: HTMLDivElement | null = null;
  private combatHint: HTMLDivElement | null = null;
  private combatMessage: HTMLParagraphElement | null = null;
  private combatStats: HTMLDivElement | null = null;
  private playerHpFill: HTMLDivElement | null = null;
  private enemyHpFill: HTMLDivElement | null = null;
  private playerHpText: HTMLSpanElement | null = null;
  private enemyHpText: HTMLSpanElement | null = null;
  private enemyNameLabel: HTMLSpanElement | null = null;
  private timingWrap: HTMLDivElement | null = null;
  private timingTrack: HTMLDivElement | null = null;
  private timingZone: HTMLDivElement | null = null;
  private timingCursor: HTMLDivElement | null = null;
  private attackBtn: HTMLButtonElement | null = null;
  private itemBtn: HTMLButtonElement | null = null;
  private runBtn: HTMLButtonElement | null = null;
  private currentEnemy: Enemy | null = null;
  private inCombat = false;
  private actionLocked = false;
  private pendingStart = false;
  private lastSafePosition = { x: 0, y: 0 };
  private potionCount = 3;
  private combatSequenceRunning = false;
  private timingActive = false;
  private timingAnimation: number | null = null;
  private timingLastFrame = 0;
  private timingStart = 0;
  private timingDuration = 1200;
  private timingZoneStart = 0.25;
  private timingZoneWidth = 0.2;
  private timingCursorPosition = 0;
  private waitingTimingResult = false;
  private spaceHeld = false;
  private combatKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private combatKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private timingResetCallback: (() => void) | null = null;
  private readonly enemyParryChance = 0.25;

  private readonly PLAYER_SPEED = 150;
  private readonly TILE_SIZE = 32;
  private lastMovementInput = { dx: 0, dy: 0 };

  constructor(container: HTMLElement, config: GameSceneConfig) {
    this.container = container;
    this.config = config;

    this.renderer = new CanvasRenderer(container, {
      width: config.viewportWidth,
      height: config.viewportHeight,
      backgroundColor: "#000",
      tileSize: this.TILE_SIZE,
    });

    this.camera = new Camera({
      viewportWidth: config.viewportWidth,
      viewportHeight: config.viewportHeight,
      mapWidth: config.mapWidth,
      mapHeight: config.mapHeight,
      smoothness: 0.15,
    });

    this.gameLoop = new GameLoop();
    this.input = InputManager.getInstance();

    this.gameLoop.addUpdateListener((dt) => this.update(dt));
    this.gameLoop.addRenderListener((dt) => this.render(dt));
  }

  initialize(): void {
    if (!this.player) {
      throw new Error("Player must be provided before initializing the scene");
    }

    this.entities = [];
    this.enemies = [];
    this.player.addComponent(new Position(100, 100));
    this.player.addComponent(new Velocity(0, 0));
    this.player.addComponent(new Health(this.player.stats.hp, this.player.getMaxHp()));

    this.entities.push(this.player);
    this.spawnEnemies();
    this.gameLoop.start();
  }

  setPlayer(player: Player): void {
    this.player = player;
  }

  private spawnEnemies(): void {
    const enemyPositions: Array<[number, number]> = [
      [300, 300],
      [520, 420],
      [760, 220],
    ];

    enemyPositions.forEach((pos) => {
      const template = ENEMY_TEMPLATES[0]!;
      const enemy = new Enemy(template, pos[0], pos[1]);
      this.enemies.push(enemy);
      this.entities.push(enemy);
    });
  }

  private update(deltaTime: number): void {
    if (!this.player) return;

    if (this.inCombat) {
      return;
    }

    const { dx, dy } = this.input.getMovementInput();
    this.lastMovementInput = { dx, dy };

    const playerPos = this.player.getComponent<Position>("position");
    if (playerPos) {
      this.lastSafePosition = { x: playerPos.x, y: playerPos.y };
    }

    const velocity = this.player.getComponent<Velocity>("velocity");
    if (velocity) {
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        velocity.x = (dx / length) * this.PLAYER_SPEED;
        velocity.y = (dy / length) * this.PLAYER_SPEED;
      } else {
        velocity.x = 0;
        velocity.y = 0;
      }
    }

    this.entities.forEach((entity) => {
      const pos = entity.getComponent<Position>("position");
      const vel = entity.getComponent<Velocity>("velocity");

      if (pos && vel) {
        pos.x += vel.x * deltaTime;
        pos.y += vel.y * deltaTime;

        pos.x = Math.max(0, Math.min(pos.x, this.config.mapWidth - this.TILE_SIZE));
        pos.y = Math.max(0, Math.min(pos.y, this.config.mapHeight - this.TILE_SIZE));
      }
    });

    const collidedEnemy = this.enemies.find((enemy) => this.isColliding(this.player!, enemy as Enemy));
    if (collidedEnemy) {
      this.pendingStart = true;
      const playerPosition = this.player.getComponent<Position>("position");
      if (playerPosition) {
        playerPosition.x = this.lastSafePosition.x;
        playerPosition.y = this.lastSafePosition.y;
      }
      this.startCombat(collidedEnemy as Enemy);
    }

    if (this.player) {
      this.camera.follow(this.player);
      this.camera.update();
    }
  }

  private render(_deltaTime: number): void {
    this.renderer.clear();
    this.renderer.drawGrid(this.TILE_SIZE, "#222");

    const { offsetX, offsetY } = this.camera.getOffset();

    this.enemies.forEach((enemy) => {
      const enemyEntity = enemy as Enemy;
      this.renderer.drawEntity(enemyEntity, offsetX, offsetY, enemyEntity.color, this.TILE_SIZE);
    });

    if (this.player) {
      this.renderer.drawCharacter(
        this.player,
        offsetX,
        offsetY,
        this.TILE_SIZE,
        this.lastMovementInput,
      );
    }

    this.renderer.drawFPS(1 / _deltaTime);
  }

  private mountCombatUI(): void {
    if (this.combatOverlay) return;

    this.combatOverlay = document.createElement("div");
    this.combatOverlay.className = "combat-overlay";
    this.combatOverlay.hidden = true;

    this.combatBackdrop = document.createElement("div");
    this.combatBackdrop.className = "combat-backdrop";

    this.combatPanel = document.createElement("div");
    this.combatPanel.className = "combat-frame";

    this.combatHeader = document.createElement("div");
    this.combatHeader.className = "combat-header";

    const titleBlock = document.createElement("div");
    titleBlock.className = "combat-title-block";

    const title = document.createElement("h2");
    title.className = "combat-title";
    title.textContent = "Combat";

    const subtitle = document.createElement("p");
    subtitle.className = "combat-subtitle";
    subtitle.textContent = "Tour par tour";

    titleBlock.append(title, subtitle);

    this.enemyNameLabel = document.createElement("span");
    this.enemyNameLabel.className = "combat-enemy-name";
    this.enemyNameLabel.textContent = "";

    this.combatHeader.append(titleBlock, this.enemyNameLabel);

    this.combatStats = document.createElement("div");
    this.combatStats.className = "combat-stats";

    const statsCards = document.createElement("div");
    statsCards.className = "combat-stats-cards";

    const playerCard = document.createElement("div");
    playerCard.className = "combat-card combat-card-player";
    const playerLabel = document.createElement("div");
    playerLabel.className = "combat-card-label";
    playerLabel.textContent = this.player?.getPlayerName() ?? "Joueur";
    this.playerHpText = document.createElement("span");
    this.playerHpText.className = "combat-card-value";
    this.playerHpText.textContent = "";
    const playerBar = document.createElement("div");
    playerBar.className = "combat-hp-bar";
    this.playerHpFill = document.createElement("div");
    this.playerHpFill.className = "combat-hp-fill";
    playerBar.appendChild(this.playerHpFill);
    playerCard.append(playerLabel, this.playerHpText, playerBar);

    const enemyCard = document.createElement("div");
    enemyCard.className = "combat-card combat-card-enemy";
    const enemyLabel = document.createElement("div");
    enemyLabel.className = "combat-card-label";
    enemyLabel.textContent = "Enemy";
    this.enemyHpText = document.createElement("span");
    this.enemyHpText.className = "combat-card-value";
    this.enemyHpText.textContent = "";
    const enemyBar = document.createElement("div");
    enemyBar.className = "combat-hp-bar";
    this.enemyHpFill = document.createElement("div");
    this.enemyHpFill.className = "combat-hp-fill combat-hp-fill-enemy";
    enemyBar.appendChild(this.enemyHpFill);
    enemyCard.append(enemyLabel, this.enemyHpText, enemyBar);

    statsCards.append(playerCard, enemyCard);

    this.timingWrap = document.createElement("div");
    this.timingWrap.className = "timing-wrap";
    this.timingWrap.hidden = true;

    this.timingTrack = document.createElement("div");
    this.timingTrack.className = "timing-track";

    this.timingZone = document.createElement("div");
    this.timingZone.className = "timing-zone";

    this.timingCursor = document.createElement("div");
    this.timingCursor.className = "timing-cursor";

    this.timingTrack.append(this.timingZone, this.timingCursor);
    this.timingWrap.appendChild(this.timingTrack);

    this.combatMessage = document.createElement("p");
    this.combatMessage.className = "combat-message";

    this.combatLog = document.createElement("div");
    this.combatLog.className = "combat-log";

    this.combatHint = document.createElement("div");
    this.combatHint.className = "combat-hint";
    this.combatHint.textContent = "Maintiens Espace pour valider au bon moment.";

    const actions = document.createElement("div");
    actions.className = "combat-actions";

    this.attackBtn = document.createElement("button");
    this.attackBtn.className = "combat-action";
    this.attackBtn.textContent = "Attaquer";

    this.itemBtn = document.createElement("button");
    this.itemBtn.className = "combat-action";
    this.itemBtn.textContent = "Objet";

    this.runBtn = document.createElement("button");
    this.runBtn.className = "combat-action";
    this.runBtn.textContent = "Fuir";

    this.attackBtn.addEventListener("click", () => this.playerAttack());
    this.itemBtn.addEventListener("click", () => this.usePotion());
    this.runBtn.addEventListener("click", () => this.tryRun());

    actions.append(this.attackBtn, this.itemBtn, this.runBtn);
    this.combatLog.append(this.combatMessage);
    this.combatPanel.append(this.combatHeader, statsCards, this.combatStats, this.timingWrap, this.combatHint, this.combatLog, actions);
    this.combatOverlay.append(this.combatBackdrop, this.combatPanel);
    this.container.appendChild(this.combatOverlay);
  }

  private startCombat(enemy: Enemy): void {
    if (this.inCombat || this.actionLocked) return;

    this.inCombat = true;
    this.currentEnemy = enemy;
    this.mountCombatUI();
    if (this.combatOverlay) {
      this.combatOverlay.hidden = false;
    }

    this.setEnemyLabel(enemy.name);
    this.refreshCombatUI();
    this.playCombatIntro(enemy);
    this.bindCombatControls();
  }

  private bindCombatControls(): void {
    if (this.combatKeyDownHandler || this.combatKeyUpHandler) return;

    this.combatKeyDownHandler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (this.inCombat && !this.spaceHeld) {
        e.preventDefault();
        this.spaceHeld = true;
        if (this.timingActive) {
          this.resolveTimingAttack();
        }
      }
    };

    this.combatKeyUpHandler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      this.spaceHeld = false;
      if (this.timingActive) {
        this.resetTimingCursor();
      }
    };

    window.addEventListener("keydown", this.combatKeyDownHandler, { passive: false });
    window.addEventListener("keyup", this.combatKeyUpHandler, { passive: false });
  }

  private unbindCombatControls(): void {
    if (this.combatKeyDownHandler) {
      window.removeEventListener("keydown", this.combatKeyDownHandler);
      this.combatKeyDownHandler = null;
    }
    if (this.combatKeyUpHandler) {
      window.removeEventListener("keyup", this.combatKeyUpHandler);
      this.combatKeyUpHandler = null;
    }
  }

  private async playCombatIntro(enemy: Enemy): Promise<void> {
    if (this.combatSequenceRunning) return;
    this.combatSequenceRunning = true;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);

    await this.pushCombatMessage(`Un ${enemy.name} apparaît !`, 700);
    await this.pushCombatMessage("Prépare ton attaque...", 450);

    this.actionLocked = false;
    this.setCombatButtonsDisabled(false);
    this.combatSequenceRunning = false;
  }

  private async playerAttack(): Promise<void> {
    if (!this.player || !this.currentEnemy || this.actionLocked) return;
    if (!this.timingActive) {
      this.startTimingAttack();
      return;
    }

    this.resolveTimingAttack();
  }

  private startTimingAttack(): void {
    if (!this.player || !this.currentEnemy || this.actionLocked) return;

    this.waitingTimingResult = true;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);
    if (this.attackBtn) {
      this.attackBtn.disabled = false;
      this.attackBtn.textContent = "Valider";
    }

    this.timingDuration = 1200;
    this.timingZoneWidth = 0.16 + Math.random() * 0.14;
    this.timingZoneStart = 0.15 + Math.random() * (0.78 - this.timingZoneWidth);
    this.timingCursorPosition = 0;
    this.timingStart = performance.now();
    this.timingActive = true;

    if (this.timingWrap) {
      this.timingWrap.hidden = false;
    }
    if (this.combatHint) {
      this.combatHint.hidden = false;
    }

    this.refreshTimingUI();
    this.setCombatMessage("Appuie au bon moment dans la zone verte.");
    this.startTimingLoop();
  }

  private startTimingLoop(): void {
    if (this.timingAnimation !== null) {
      cancelAnimationFrame(this.timingAnimation);
    }

    const tick = (now: number) => {
      if (!this.timingActive) return;

      const elapsed = now - this.timingStart;
      const target = Math.min(elapsed / this.timingDuration, 1);
      this.timingCursorPosition = target;
      this.refreshTimingUI();

      if (target >= 1) {
        this.resolveTimingAttack();
        return;
      }

      this.timingAnimation = requestAnimationFrame(tick);
    };

    this.timingAnimation = requestAnimationFrame(tick);
  }

  private resetTimingCursor(): void {
    this.timingStart = performance.now();
    this.timingCursorPosition = 0;
    this.refreshTimingUI();
    this.setCombatMessage("Relâche et recommence.");
  }

  private resolveTimingAttack(): void {
    if (!this.player || !this.currentEnemy || !this.timingActive || !this.waitingTimingResult) return;

    this.timingActive = false;
    this.waitingTimingResult = false;
    this.spaceHeld = false;

    if (this.timingAnimation !== null) {
      cancelAnimationFrame(this.timingAnimation);
      this.timingAnimation = null;
    }

    const inGreen =
      this.timingCursorPosition >= this.timingZoneStart &&
      this.timingCursorPosition <= this.timingZoneStart + this.timingZoneWidth;

    const baseDamage = this.player.getAttackPower();
    const damageMultiplier = inGreen ? 1.6 : 0.85;
    const parried = Math.random() < this.enemyParryChance;
    const finalDamage = parried ? Math.max(1, Math.floor(baseDamage * 0.35)) : Math.max(1, Math.floor(baseDamage * damageMultiplier));

    this.hideTimingUI();
    if (this.attackBtn) {
      this.attackBtn.textContent = "Attaquer";
    }

    this.setCombatMessage(
      parried
        ? `${this.currentEnemy.name} pare partiellement l'attaque !`
        : inGreen
          ? "Parfait !"
          : "Raté de peu...",
    );

    this.finishPlayerAttack(finalDamage, parried);
  }

  private async finishPlayerAttack(finalDamage: number, parried: boolean): Promise<void> {
    if (!this.player || !this.currentEnemy) return;
    this.setCombatButtonsDisabled(true);

    await this.pushCombatMessage(parried ? "La garde ennemie tremble..." : "Impact !", 220);

    const damage = this.currentEnemy.takeDamage(finalDamage);
    await this.pushCombatMessage(
      parried
        ? `${this.currentEnemy.name} pare et subit ${damage} dégâts.`
        : `Vous infligez ${damage} dégâts.`,
      650,
    );
    this.refreshCombatUI();

    if (!this.currentEnemy.isAlive()) {
      this.setCombatMessage(`${this.currentEnemy.name} est vaincu !`);
      this.player.gainExperience(this.currentEnemy.xpReward);
      this.removeEnemy(this.currentEnemy);
      await this.delay(500);
      this.endCombat();
      return;
    }

    const enemy = this.currentEnemy;
    const enemyResult = this.resolveEnemyTurn(enemy);

    await this.pushCombatMessage(enemyResult.message, 650);
    if (enemyResult.damage > 0) {
      this.player.takeDamage(enemyResult.damage);
    }
    this.refreshCombatUI();

    await this.delay(350);

    if (!this.player.isAlive()) {
      this.setCombatMessage("Vous avez perdu le combat...");
      await this.delay(700);
      this.endCombat(true);
      return;
    }

    this.actionLocked = false;
    this.setCombatButtonsDisabled(false);
  }

  private resolveEnemyTurn(enemy: Enemy): { damage: number; message: string } {
    const roll = Math.random();
    const baseDamage = enemy.attack;

    if (enemy.behavior === "defensive") {
      if (roll < 0.35) {
        return {
          damage: 0,
          message: `${enemy.name} se protège et prépare son prochain coup.`,
        };
      }

      return {
        damage: Math.max(1, Math.floor(baseDamage * 0.8)),
        message: `${enemy.name} attaque prudemment.`,
      };
    }

    if (enemy.behavior === "random") {
      if (roll < 0.2) {
        return {
          damage: 0,
          message: `${enemy.name} hésite et ne fait rien.`,
        };
      }

      if (roll < 0.5) {
        return {
          damage: Math.max(1, Math.floor(baseDamage * 0.7)),
          message: `${enemy.name} attaque faiblement.`,
        };
      }

      return {
        damage: Math.max(1, Math.floor(baseDamage * 1.15)),
        message: `${enemy.name} frappe violemment !`,
      };
    }

    return {
      damage: baseDamage,
      message: `${enemy.name} contre-attaque !`,
    };
  }

  private async usePotion(): Promise<void> {
    if (!this.player || this.actionLocked) return;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);

    if (this.potionCount <= 0) {
      await this.pushCombatMessage("Plus de potions.", 500);
      this.actionLocked = false;
      this.setCombatButtonsDisabled(false);
      return;
    }

    this.potionCount -= 1;
    const healed = this.player.heal(30);
    await this.pushCombatMessage(`Potion utilisée : +${healed} PV.`, 650);
    this.refreshCombatUI();

    await this.enemyTurnAfterPlayerAction();
  }

  private async tryRun(): Promise<void> {
    if (this.actionLocked) return;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);

    await this.pushCombatMessage("Vous prenez la fuite !", 350);
    this.endCombat(false, true);
  }

  private async enemyTurnAfterPlayerAction(): Promise<void> {
    if (!this.player || !this.currentEnemy) return;

    const enemy = this.currentEnemy;
    const counterDamage = enemy.attackTarget(this.player);
    this.setCombatMessage(`${enemy.name} attaque pour ${counterDamage} dégâts.`);
    this.refreshCombatUI();

    await this.delay(350);

    if (!this.player.isAlive()) {
      this.setCombatMessage("Vous avez perdu le combat...");
      await this.delay(700);
      this.endCombat(true);
      return;
    }

    this.actionLocked = false;
    this.setCombatButtonsDisabled(false);
  }

  private endCombat(gameOver = false, escaped = false): void {
    this.inCombat = false;
    this.actionLocked = false;
    this.currentEnemy = null;
    this.pendingStart = false;

    if (escaped) {
      const playerPos = this.player?.getComponent<Position>("position");
      if (playerPos) {
        playerPos.x = this.lastSafePosition.x;
        playerPos.y = this.lastSafePosition.y;
      }
    }

    if (this.combatOverlay) {
      this.combatOverlay.hidden = true;
      this.combatOverlay.remove();
    }

    if (this.timingWrap) {
      this.timingWrap.hidden = true;
    }
    if (this.combatHint) {
      this.combatHint.hidden = true;
    }

    this.combatOverlay = null;
    this.combatBackdrop = null;
    this.combatPanel = null;
    this.combatHeader = null;
    this.combatLog = null;
    this.combatHint = null;
    this.combatMessage = null;
    this.combatStats = null;
    this.playerHpFill = null;
    this.enemyHpFill = null;
    this.playerHpText = null;
    this.enemyHpText = null;
    this.enemyNameLabel = null;
    this.timingWrap = null;
    this.timingTrack = null;
    this.timingZone = null;
    this.timingCursor = null;
    this.attackBtn = null;
    this.itemBtn = null;
    this.runBtn = null;
    this.timingActive = false;
    this.waitingTimingResult = false;
    this.combatSequenceRunning = false;
    this.spaceHeld = false;

    this.unbindCombatControls();

    if (this.timingAnimation !== null) {
      cancelAnimationFrame(this.timingAnimation);
      this.timingAnimation = null;
    }

    this.setCombatButtonsDisabled(false);

    if (gameOver) {
      this.gameLoop.stop();
    }
  }

  private removeEnemy(enemy: Enemy): void {
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.entities = this.entities.filter((candidate) => candidate !== enemy);
  }

  private refreshCombatUI(): void {
    if (!this.player || !this.combatStats) return;

    const enemy = this.currentEnemy;
    const playerHpRatio = this.player.stats.hp / this.player.getMaxHp();
    if (this.playerHpFill) {
      this.playerHpFill.style.width = `${Math.max(0, playerHpRatio) * 100}%`;
    }
    if (this.playerHpText) {
      this.playerHpText.textContent = `${this.player.stats.hp}/${this.player.getMaxHp()} PV`;
    }

    if (enemy) {
      const enemyHpRatio = enemy.currentHp / enemy.template.maxHp;
      if (this.enemyHpFill) {
        this.enemyHpFill.style.width = `${Math.max(0, enemyHpRatio) * 100}%`;
      }
      if (this.enemyHpText) {
        this.enemyHpText.textContent = `${enemy.currentHp}/${enemy.template.maxHp} PV`;
      }
      this.setEnemyLabel(enemy.name);
    }

    this.combatStats.innerHTML = `
      <div class="combat-meta">ATQ ${this.player.getAttackPower()} • DEF ${this.player.getDefensePower()} • Niveau ${this.player.stats.level} • Potions ${this.potionCount}</div>
    `;
  }

  private setCombatMessage(message: string): void {
    if (this.combatMessage) {
      this.combatMessage.textContent = message;
    }
  }

  private async pushCombatMessage(message: string, delayMs: number = 700): Promise<void> {
    this.setCombatMessage(message);
    await this.delay(delayMs);
  }

  private setEnemyLabel(name: string): void {
    if (this.enemyNameLabel) {
      this.enemyNameLabel.textContent = name;
    }
  }

  private setCombatButtonsDisabled(disabled: boolean): void {
    if (this.attackBtn) this.attackBtn.disabled = disabled;
    if (this.itemBtn) this.itemBtn.disabled = disabled;
    if (this.runBtn) this.runBtn.disabled = disabled;
  }

  private refreshTimingUI(): void {
    if (!this.timingTrack || !this.timingZone || !this.timingCursor) return;

    this.timingZone.style.left = `${this.timingZoneStart * 100}%`;
    this.timingZone.style.width = `${this.timingZoneWidth * 100}%`;
    this.timingCursor.style.left = `${this.timingCursorPosition * 100}%`;
    this.timingTrack.style.setProperty("--cursor-x", `${this.timingCursorPosition * 100}%`);
  }

  private hideTimingUI(): void {
    if (this.timingWrap) this.timingWrap.hidden = true;
    if (this.combatHint) this.combatHint.hidden = true;
  }

  private isColliding(a: Entity, b: Entity): boolean {
    const aPos = a.getComponent<Position>("position");
    const bPos = b.getComponent<Position>("position");
    if (!aPos || !bPos) return false;

    return !(
      aPos.x + this.TILE_SIZE <= bPos.x ||
      aPos.x >= bPos.x + this.TILE_SIZE ||
      aPos.y + this.TILE_SIZE <= bPos.y ||
      aPos.y >= bPos.y + this.TILE_SIZE
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  destroy(): void {
    this.gameLoop.stop();
    if (this.timingAnimation !== null) {
      cancelAnimationFrame(this.timingAnimation);
      this.timingAnimation = null;
    }
    this.combatOverlay?.remove();
    this.container.innerHTML = "";
  }
}
