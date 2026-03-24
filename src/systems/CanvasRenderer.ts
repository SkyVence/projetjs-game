import type { Entity } from "@/class/entity";
import type { Position } from "@/class/base/position";

export interface RenderConfig {
  width: number;
  height: number;
  backgroundColor?: string;
  tileSize?: number;
}

/**
 * Canvas-based renderer for the game.
 * Handles drawing entities on a canvas element.
 */
export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;

  constructor(container: HTMLElement, config: RenderConfig) {
    // Create and setup canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.canvas.style.border = "2px solid #333";
    this.canvas.style.imageRendering = "pixelated"; // Crisp pixels
    this.canvas.style.display = "block";
    this.canvas.style.margin = "0 auto";

    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context from canvas");
    }
    this.ctx = ctx;
    this.config = config;
  }

  /**
   * Clear the canvas with background color.
   */
  clear(): void {
    this.ctx.fillStyle = this.config.backgroundColor || "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw a simple colored rectangle (placeholder for sprites).
   */
  drawEntity(
    entity: Entity,
    offsetX: number = 0,
    offsetY: number = 0,
    color: string = "#fff",
    size: number = 32,
  ): void {
    const pos = entity.getComponent<Position>("position");
    if (!pos) return;

    const x = pos.x + offsetX;
    const y = pos.y + offsetY;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, size, size);

    // Optional: Draw entity ID for debugging
    this.ctx.fillStyle = "#000";
    this.ctx.font = "10px Arial";
    this.ctx.fillText(entity.id.substring(0, 4), x + 2, y + 12);
  }

  /**
   * Draw a grid for debugging purposes.
   */
  drawGrid(gridSize: number = 32, color: string = "#333"): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 0.5;

    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Get canvas dimensions.
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }
}
