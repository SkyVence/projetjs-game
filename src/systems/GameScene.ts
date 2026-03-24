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

/**
 * Main game scene manager that orchestrates all game systems.
 */
export class GameScene {
  private container: HTMLElement;
  private config: GameSceneConfig;

  private renderer: CanvasRenderer;
  private camera: Camera;
  private gameLoop: GameLoop;
  private input: InputManager;

  private entities: Entity[] = [];
  private player: Player | null = null;

  // Configuration
  private readonly PLAYER_SPEED = 100; // pixels per second
  private readonly TILE_SIZE = 32;

  constructor(container: HTMLElement, config: GameSceneConfig) {
    this.container = container;
    this.config = config;

    // Initialize systems
    this.renderer = new CanvasRenderer(container, {
      width: config.viewportWidth,
      height: config.viewportHeight,
      backgroundColor: "#1a1a2e",
      tileSize: this.TILE_SIZE,
    });

    this.camera = new Camera({
      viewportWidth: config.viewportWidth,
      viewportHeight: config.viewportHeight,
      mapWidth: config.mapWidth,
      mapHeight: config.mapHeight,
      smoothness: 0.15, // Smooth camera follow
    });

    this.gameLoop = new GameLoop();
    this.input = InputManager.getInstance();

    // Register game loop callbacks
    this.gameLoop.addUpdateListener((dt) => this.update(dt));
    this.gameLoop.addRenderListener((dt) => this.render(dt));
  }

  /**
   * Initialize the game scene with a player.
   */
  initialize(): void {
    // Create player
    this.player = new Player("Hero");
    this.player.addComponent(new Position(100, 100)); // Starting position
    this.player.addComponent(new Velocity(0, 0));
    this.player.addComponent(new Health(100));

    this.entities.push(this.player);

    // Start game loop
    this.gameLoop.start();
  }

  /**
   * Update game logic (input, physics, etc).
   */
  private update(deltaTime: number): void {
    if (!this.player) return;

    // Handle input
    const { dx, dy } = this.input.getMovementInput();

    // Update player velocity based on input
    const velocity = this.player.getComponent<Velocity>("velocity");
    if (velocity) {
      velocity.x = dx * this.PLAYER_SPEED;
      velocity.y = dy * this.PLAYER_SPEED;
    }

    // Update entity positions based on velocity
    this.entities.forEach((entity) => {
      const pos = entity.getComponent<Position>("position");
      const vel = entity.getComponent<Velocity>("velocity");

      if (pos && vel) {
        // Apply velocity
        pos.x += vel.x * deltaTime;
        pos.y += vel.y * deltaTime;

        // Clamp to map bounds
        pos.x = Math.max(0, Math.min(pos.x, this.config.mapWidth - this.TILE_SIZE));
        pos.y = Math.max(0, Math.min(pos.y, this.config.mapHeight - this.TILE_SIZE));
      }
    });

    // Update camera
    if (this.player) {
      this.camera.follow(this.player);
      this.camera.update();
    }
  }

  /**
   * Render the game scene.
   */
  private render(_deltaTime: number): void {
    // Clear canvas
    this.renderer.clear();

    // Draw grid for reference
    this.renderer.drawGrid(this.TILE_SIZE, "#2a2a4e");

    // Get camera offset
    const { offsetX, offsetY } = this.camera.getOffset();

    // Draw entities
    this.entities.forEach((entity) => {
      let color = "#fff";
      if (entity === this.player) {
        color = "#00ff00"; // Green for player
      }
      this.renderer.drawEntity(entity, offsetX, offsetY, color, this.TILE_SIZE);
    });
  }

  /**
   * Cleanup and stop the game scene.
   */
  destroy(): void {
    this.gameLoop.stop();
    this.container.innerHTML = "";
  }
}
