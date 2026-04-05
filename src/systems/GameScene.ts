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
import { CombatManager } from "@/systems/combat/CombatManager";

export interface GameSceneConfig {
  mapWidth: number;
  mapHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

export class GameScene {
  private renderer: CanvasRenderer;
  private camera: Camera;
  private gameLoop: GameLoop;
  private input: InputManager;

  private entities: Entity[] = [];
  private enemies: Enemy[] = [];
  private player: Player | null = null;
  private inCombat = false;
  private lastSafePosition = { x: 0, y: 0 };
  private combatManager: CombatManager | null = null;
  private lastMovementInput = { dx: 0, dy: 0 };
  private movementAccumulator = 0;
  private escapeCollisionLockUntil = 0;

  private readonly PLAYER_SPEED = 150;
  private readonly TILE_SIZE = 32;

  constructor(private container: HTMLElement, private config: GameSceneConfig) {
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
    this.movementAccumulator = 0;

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

  destroy(): void {
    this.gameLoop.stop();
    this.combatManager?.destroy();
    this.combatManager = null;
    this.container.innerHTML = "";
  }

  private spawnEnemies(): void {
    const enemyPositions: Array<[number, number]> = [
      [300, 300],
      [520, 420],
      [760, 220],
      [980, 760],
      [1240, 1040],
      [1680, 560],
    ];

    enemyPositions.forEach((pos, index) => {
      const template = ENEMY_TEMPLATES[index % ENEMY_TEMPLATES.length]!;
      const enemy = new Enemy(template, pos[0], pos[1]);
      this.enemies.push(enemy);
      this.entities.push(enemy);
    });
  }

  private update(deltaTime: number): void {
    if (!this.player || this.inCombat) return;

    this.movementAccumulator += deltaTime;
    const movementStep = Math.min(this.movementAccumulator, 0.1);
    this.movementAccumulator = 0;

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
      if (!pos || !vel) return;

      pos.x += vel.x * movementStep;
      pos.y += vel.y * movementStep;
      pos.x = Math.max(0, Math.min(pos.x, this.config.mapWidth - this.TILE_SIZE));
      pos.y = Math.max(0, Math.min(pos.y, this.config.mapHeight - this.TILE_SIZE));
    });

    this.updateEnemyMovement(movementStep);

    const canTriggerCombat = performance.now() >= this.escapeCollisionLockUntil;
    const collidedEnemy = canTriggerCombat
      ? this.enemies.find((enemy) => this.isColliding(this.player!, enemy))
      : null;

    if (collidedEnemy) {
      const playerPosition = this.player.getComponent<Position>("position");
      if (playerPosition) {
        playerPosition.x = this.lastSafePosition.x;
        playerPosition.y = this.lastSafePosition.y;
      }
      this.startCombat(collidedEnemy);
    }

    this.camera.follow(this.player);
    this.camera.update();
  }

  private render(deltaTime: number): void {
    this.renderer.clear();
    const { offsetX, offsetY } = this.camera.getOffset();

    this.renderer.drawDungeonBackground(
      offsetX,
      offsetY,
      this.TILE_SIZE,
      this.config.mapWidth,
      this.config.mapHeight,
    );

    this.enemies.forEach((enemy) => {
      this.renderer.drawEnemy(enemy, offsetX, offsetY, this.TILE_SIZE);
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

    this.renderer.drawFPS(1 / Math.max(deltaTime, 0.001));
  }

  private updateEnemyMovement(deltaTime: number): void {
    if (!this.player) return;

    const playerPos = this.player.getComponent<Position>("position");
    if (!playerPos) return;

    this.enemies.forEach((enemy) => {
      if (!enemy.isAlive()) return;

      const pos = enemy.getComponent<Position>("position");
      if (!pos) return;

      const dx = playerPos.x - pos.x;
      const dy = playerPos.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 320) {
        return;
      }

      const patrol = enemy.tickPatrol(deltaTime);
      const speed = enemy.speed * deltaTime;
      const step = Math.max(0.2, speed);

      const chaseX = Math.abs(dx) > 18 ? Math.sign(dx) * step : 0;
      const chaseY = Math.abs(dy) > 18 ? Math.sign(dy) * step : 0;

      pos.x += chaseX + patrol.dx * deltaTime * 0.05;
      pos.y += chaseY + patrol.dy * deltaTime * 0.05;

      pos.x = Math.max(0, Math.min(pos.x, this.config.mapWidth - this.TILE_SIZE));
      pos.y = Math.max(0, Math.min(pos.y, this.config.mapHeight - this.TILE_SIZE));
    });
  }

  private startCombat(enemy: Enemy): void {
    if (this.inCombat) return;
    if (!this.player) return;

    this.inCombat = true;
    this.gameLoop.stop();

    const engagedEnemy = enemy;
    this.combatManager?.destroy();
    this.combatManager = new CombatManager(this.container, this.player, enemy);

    void this.combatManager.start().then((result) => {
      if (!this.player) return;

      if (result.outcome === "victory") {
        this.removeEnemy(engagedEnemy);
        this.player.gainExperience(result.xpGained);
      } else if (result.outcome === "defeat") {
        this.player.revive(1);
      } else if (result.outcome === "escaped") {
        this.handleEscapeFrom(engagedEnemy);
      }

      this.combatManager?.destroy();
      this.combatManager = null;
      this.inCombat = false;
      this.gameLoop.start();
    });
  }

  private handleEscapeFrom(enemy: Enemy): void {
    const playerPos = this.player?.getComponent<Position>("position");
    const enemyPos = enemy.getComponent<Position>("position");
    if (!playerPos || !enemyPos) return;

    playerPos.x = this.lastSafePosition.x;
    playerPos.y = this.lastSafePosition.y;

    const dx = enemyPos.x - playerPos.x;
    const dy = enemyPos.y - playerPos.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const push = 128;

    enemyPos.x = Math.max(0, Math.min(enemyPos.x + (dx / len) * push, this.config.mapWidth - this.TILE_SIZE));
    enemyPos.y = Math.max(0, Math.min(enemyPos.y + (dy / len) * push, this.config.mapHeight - this.TILE_SIZE));
    this.escapeCollisionLockUntil = performance.now() + 1200;
  }

  private removeEnemy(enemy: Enemy): void {
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.entities = this.entities.filter((candidate) => candidate !== enemy);
  }

  private isColliding(a: Entity, b: Entity): boolean {
    const aPos = a.getComponent<Position>("position");
    const bPos = b.getComponent<Position>("position");
    if (!aPos || !bPos) return false;

    return !(
      aPos.x + this.TILE_SIZE <= bPos.x
      || aPos.x >= bPos.x + this.TILE_SIZE
      || aPos.y + this.TILE_SIZE <= bPos.y
      || aPos.y >= bPos.y + this.TILE_SIZE
    );
  }
}
