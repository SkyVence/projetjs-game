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
import { MapGenerator, TileType } from "@/utils/MapGen";
import type { GeneratedMap, Room } from "@/utils/MapGen";
import { navigateTo } from "@/router";

export interface GameSceneConfig {
  mapWidth: number;
  mapHeight: number;
  viewportWidth?: number;
  viewportHeight?: number;
  aspectRatio?: number;
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
      width: fixedWidth,
      height: fixedHeight,
      backgroundColor: "#000",
      tileSize: this.TILE_SIZE,
      aspectRatio: config.aspectRatio ?? 16 / 9,
      fixedResolution: true,
    });

    // Use fixed internal resolution for camera (all players see same area)
    this.camera = new Camera({
      viewportWidth: fixedWidth,
      viewportHeight: fixedHeight,
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

    // Generate dungeon map
    const mapGen = new MapGenerator({
      width: this.MAP_TILES_W,
      height: this.MAP_TILES_H,
      maxDepth: 4,
    });
    this.map = mapGen.generate();

    // Get spawn room (first room where entry is)
    this.spawnRoom = this.map.rooms[0] ?? null;

    // Fixed viewport size for fair gameplay (same for all players)
    const fixedViewportWidth = 1280;
    const fixedViewportHeight = 720;

    // Update camera with fixed viewport dimensions
    this.camera = new Camera({
      viewportWidth: fixedViewportWidth,
      viewportHeight: fixedViewportHeight,
      mapWidth: this.MAP_TILES_W * this.TILE_SIZE,
      mapHeight: this.MAP_TILES_H * this.TILE_SIZE,
      smoothness: 0.15,
      scrollMargin: 150,
    });

    this.entities = [];
    this.enemies = [];
    this.movementAccumulator = 0;

    this.player.addComponent(new Position(100, 100));
    this.player.addComponent(new Velocity(0, 0));
    this.player.addComponent(new Health(this.player.stats.hp));

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
        this.PLAYER_SIZE,
        this.lastMovementInput,
      );
    }

    this.renderer.drawFPS(1 / Math.max(deltaTime, 0.001));
  }

  // Wall collision helpers
  private pixelToTile(pixel: number): number {
    return Math.floor(pixel / this.TILE_SIZE);
  }

  private isWallTile(tx: number, ty: number): boolean {
    if (!this.map) return true;
    if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) {
      return true;
    }
    const row = this.map.grid[ty];
    if (!row) return true;
    const tile = row[tx];
    return tile === TileType.Wall;
  }

  private canMoveTo(x: number, y: number, size: number = this.TILE_SIZE): boolean {
    // Check all four corners of the entity
    const corners = [
      { x: x, y: y },
      { x: x + size - 1, y: y },
      { x: x, y: y + size - 1 },
      { x: x + size - 1, y: y + size - 1 },
    ];

    for (const corner of corners) {
      const tx = this.pixelToTile(corner.x);
      const ty = this.pixelToTile(corner.y);
      if (this.isWallTile(tx, ty)) {
        return false;
      }
    }
    return true;
  }

  private checkExitReached(x: number, y: number): boolean {
    if (!this.map) return false;
    const tx = this.pixelToTile(x + this.PLAYER_SIZE / 2);
    const ty = this.pixelToTile(y + this.PLAYER_SIZE / 2);
    const row = this.map.grid[ty];
    if (!row) return false;
    return row[tx] === TileType.Exit;
  }

  private updatePlayerMovement(deltaTime: number): void {
    if (!this.player) return;

    const pos = this.player.getComponent<Position>("position");
    const vel = this.player.getComponent<Velocity>("velocity");
    if (!pos || !vel) return;

    // Save safe position before moving
    if (pos.x !== this.lastSafePosition.x || pos.y !== this.lastSafePosition.y) {
      this.lastSafePosition = { x: pos.x, y: pos.y };
    }

    // Calculate new position
    const newX = pos.x + vel.x * deltaTime;
    const newY = pos.y + vel.y * deltaTime;

    // Clamp to map bounds (using PLAYER_SIZE)
    const maxX = this.MAP_TILES_W * this.TILE_SIZE - this.PLAYER_SIZE;
    const maxY = this.MAP_TILES_H * this.TILE_SIZE - this.PLAYER_SIZE;
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    // Try X movement with player size collision
    if (this.canMoveTo(clampedX, pos.y, this.PLAYER_SIZE)) {
      pos.x = clampedX;
    }

    // Try Y movement with player size collision
    if (this.canMoveTo(pos.x, clampedY, this.PLAYER_SIZE)) {
      pos.y = clampedY;
    }

    // Check if player reached exit
    if (this.checkExitReached(pos.x, pos.y)) {
      navigateTo("/");
      return;
    }
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

      const newX = pos.x + chaseX + patrol.dx * deltaTime * 0.05;
      const newY = pos.y + chaseY + patrol.dy * deltaTime * 0.05;

      // Clamp to map bounds
      const maxX = this.MAP_TILES_W * this.TILE_SIZE - this.TILE_SIZE;
      const maxY = this.MAP_TILES_H * this.TILE_SIZE - this.TILE_SIZE;
      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      // Try X movement with wall collision
      if (this.canMoveTo(clampedX, pos.y)) {
        pos.x = clampedX;
      }

      // Try Y movement with wall collision
      if (this.canMoveTo(pos.x, clampedY)) {
        pos.y = clampedY;
      }
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

    // Player uses PLAYER_SIZE, enemies use TILE_SIZE
    const aSize = a === this.player ? this.PLAYER_SIZE : this.TILE_SIZE;
    const bSize = b === this.player ? this.PLAYER_SIZE : this.TILE_SIZE;

    return !(
      aPos.x + this.TILE_SIZE <= bPos.x
      || aPos.x >= bPos.x + this.TILE_SIZE
      || aPos.y + this.TILE_SIZE <= bPos.y
      || aPos.y >= bPos.y + this.TILE_SIZE
    );
  }
}
