import { Entity } from "@/class/entity";
import { Player } from "@/class/player";
import { Position } from "@/class/base/position";
import { Velocity } from "@/class/base/velocity";
import { Health } from "@/class/base/health";
import { InputManager } from "@/systems/InputManager";
import { CanvasRenderer } from "@/systems/CanvasRenderer";
import { Camera } from "@/systems/Camera";
import { GameLoop } from "@/systems/GameLoop";

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
    this.player = new Player("Hero");
    this.player.addComponent(new Position(100, 100));
    this.player.addComponent(new Velocity(0, 0));
    this.player.addComponent(new Health(100));

    this.entities.push(this.player);
    this.spawnEnemies();
    this.gameLoop.start();
  }

  private spawnEnemies(): void {
    const enemyPositions: Array<[number, number]> = [
      [300, 300],
      [500, 400],
      [700, 200],
      [900, 500],
      [400, 600],
      [1000, 150],
      [1200, 400],
      [600, 800],
    ];

    enemyPositions.forEach((pos) => {
      const enemy = new Entity();
      enemy.addComponent(new Position(pos[0], pos[1]));
      enemy.addComponent(new Velocity(0, 0));
      enemy.addComponent(new Health(50));
      this.enemies.push(enemy);
      this.entities.push(enemy);
    });
  }

  private update(deltaTime: number): void {
    if (!this.player) return;

    const { dx, dy } = this.input.getMovementInput();
    this.lastMovementInput = { dx, dy };

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
      this.renderer.drawEntity(enemy, offsetX, offsetY, "#888", this.TILE_SIZE);
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

  destroy(): void {
    this.gameLoop.stop();
    this.container.innerHTML = "";
  }
}
