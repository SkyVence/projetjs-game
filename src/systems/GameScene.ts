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
  private combatMessage: HTMLParagraphElement | null = null;
  private combatStats: HTMLDivElement | null = null;
  private attackBtn: HTMLButtonElement | null = null;
  private itemBtn: HTMLButtonElement | null = null;
  private runBtn: HTMLButtonElement | null = null;
  private currentEnemy: Enemy | null = null;
  private inCombat = false;
  private actionLocked = false;
  private pendingStart = false;
  private lastSafePosition = { x: 0, y: 0 };
  private potionCount = 3;

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

    const frame = document.createElement("div");
    frame.className = "combat-frame";

    const title = document.createElement("h2");
    title.className = "combat-title";
    title.textContent = "Combat";

    this.combatStats = document.createElement("div");
    this.combatStats.className = "combat-stats";

    this.combatMessage = document.createElement("p");
    this.combatMessage.className = "combat-message";

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
    frame.append(title, this.combatStats, this.combatMessage, actions);
    this.combatOverlay.appendChild(frame);
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

    this.setCombatMessage(`Un ${enemy.name} apparaît !`);
    this.refreshCombatUI();
  }

  private async playerAttack(): Promise<void> {
    if (!this.player || !this.currentEnemy || this.actionLocked) return;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);

    const damage = this.player.attackTarget(this.currentEnemy);
    this.setCombatMessage(`${this.player.getPlayerName()} attaque et inflige ${damage} dégâts.`);
    this.refreshCombatUI();

    await this.delay(350);

    if (!this.currentEnemy.isAlive()) {
      this.setCombatMessage(`${this.currentEnemy.name} est vaincu !`);
      this.player.gainExperience(this.currentEnemy.xpReward);
      this.removeEnemy(this.currentEnemy);
      await this.delay(500);
      this.endCombat();
      return;
    }

    const enemy = this.currentEnemy;
    const counterDamage = enemy.attackTarget(this.player);
    this.setCombatMessage(`${enemy.name} contre-attaque pour ${counterDamage} dégâts.`);
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

  private async usePotion(): Promise<void> {
    if (!this.player || this.actionLocked) return;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);

    if (this.potionCount <= 0) {
      this.setCombatMessage("Plus de potions.");
      await this.delay(500);
      this.actionLocked = false;
      this.setCombatButtonsDisabled(false);
      return;
    }

    this.potionCount -= 1;
    const healed = this.player.heal(30);
    this.setCombatMessage(`Potion utilisée : +${healed} PV.`);
    this.refreshCombatUI();

    await this.delay(350);
    await this.enemyTurnAfterPlayerAction();
  }

  private async tryRun(): Promise<void> {
    if (this.actionLocked) return;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);

    this.setCombatMessage("Vous prenez la fuite !");
    await this.delay(250);
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

    this.combatOverlay = null;
    this.combatMessage = null;
    this.combatStats = null;
    this.attackBtn = null;
    this.itemBtn = null;
    this.runBtn = null;

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
    const enemyLine = enemy
      ? `<strong>${enemy.name}</strong> PV ${enemy.currentHp}/${enemy.template.maxHp}`
      : "Aucun ennemi";

    this.combatStats.innerHTML = `
      <div>Joueur : PV ${this.player.stats.hp}/${this.player.getMaxHp()} | ATQ ${this.player.getAttackPower()} | DEF ${this.player.getDefensePower()} | Niveau ${this.player.stats.level}</div>
      <div>${enemyLine}</div>
      <div>Potions : ${this.potionCount}</div>
    `;
  }

  private setCombatMessage(message: string): void {
    if (this.combatMessage) {
      this.combatMessage.textContent = message;
    }
  }

  private setCombatButtonsDisabled(disabled: boolean): void {
    if (this.attackBtn) this.attackBtn.disabled = disabled;
    if (this.itemBtn) this.itemBtn.disabled = disabled;
    if (this.runBtn) this.runBtn.disabled = disabled;
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
    this.combatOverlay?.remove();
    this.container.innerHTML = "";
  }
}
