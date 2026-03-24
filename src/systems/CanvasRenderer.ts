import type { Entity } from "@/class/entity";
import type { Position } from "@/class/base/position";

export interface RenderConfig {
  width: number;
  height: number;
  backgroundColor?: string;
  tileSize?: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;

  constructor(container: HTMLElement, config: RenderConfig) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.canvas.style.border = "1px solid #fff";
    this.canvas.style.imageRendering = "pixelated";
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

  clear(): void {
    this.ctx.fillStyle = this.config.backgroundColor || "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

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
  }

  drawCharacter(
    entity: Entity,
    offsetX: number = 0,
    offsetY: number = 0,
    size: number = 32,
    direction: { dx: number; dy: number } = { dx: 0, dy: 0 },
  ): void {
    const pos = entity.getComponent<Position>("position");
    if (!pos) return;

    const x = pos.x + offsetX;
    const y = pos.y + offsetY;

    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(x, y, size, size);

    if (direction.dx !== 0 || direction.dy !== 0) {
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      const arrowLength = size / 3;

      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(
        centerX + direction.dx * arrowLength,
        centerY + direction.dy * arrowLength,
      );
      this.ctx.stroke();
    }
  }

  drawGrid(gridSize: number = 32, color: string = "#222"): void {
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

  getDimensions(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }
}
