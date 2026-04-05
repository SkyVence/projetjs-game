import type { Entity } from "@/class/entity";
import type { Position } from "@/class/base/position";
import type { Enemy } from "@/class/enemy";

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
    this.canvas.style.border = "4px solid #111";
    this.canvas.style.imageRendering = "pixelated";
    this.canvas.style.display = "block";
    this.canvas.style.margin = "0 auto";
    this.canvas.style.boxShadow = "6px 6px 0 #000";

    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
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

  drawDungeonBackground(
    offsetX: number,
    offsetY: number,
    tileSize: number,
    mapWidth: number,
    mapHeight: number,
  ): void {
    const startX = Math.floor(-offsetX / tileSize) - 1;
    const startY = Math.floor(-offsetY / tileSize) - 1;
    const endX = startX + Math.ceil(this.canvas.width / tileSize) + 3;
    const endY = startY + Math.ceil(this.canvas.height / tileSize) + 3;

    this.ctx.fillStyle = "#100e14";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let gy = startY; gy < endY; gy += 1) {
      for (let gx = startX; gx < endX; gx += 1) {
        const worldX = gx * tileSize;
        const worldY = gy * tileSize;
        if (worldX < 0 || worldY < 0 || worldX >= mapWidth || worldY >= mapHeight) {
          continue;
        }

        const px = Math.round(worldX + offsetX);
        const py = Math.round(worldY + offsetY);
        const isWalkable = this.isWalkableTile(gx, gy);
        const isWall = !isWalkable;

        this.ctx.fillStyle = isWalkable ? "#50495f" : "#221d2b";
        this.ctx.fillRect(px, py, tileSize, tileSize);

        this.ctx.fillStyle = isWalkable ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.25)";
        this.ctx.fillRect(px, py, tileSize, 2);
        this.ctx.fillRect(px, py, 2, tileSize);

        if (isWall) {
          this.ctx.fillStyle = "#0f0c14";
          this.ctx.fillRect(px + 2, py + tileSize - 4, tileSize - 4, 2);
          this.ctx.fillStyle = "#2f2839";
          this.ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
        }

        if (isWalkable && (gx + gy) % 9 === 0) {
          this.ctx.fillStyle = "#5e576e";
          this.ctx.fillRect(px + 8, py + 8, tileSize - 16, tileSize - 16);
        }

        if (this.isTorchTile(gx, gy)) {
          this.ctx.fillStyle = "#6e4f2f";
          this.ctx.fillRect(px + tileSize / 2 - 2, py + 6, 4, 8);
          this.ctx.fillStyle = "#ffcf6a";
          this.ctx.fillRect(px + tileSize / 2 - 2, py + 3, 4, 4);
          this.ctx.fillStyle = "rgba(255, 211, 120, 0.2)";
          this.ctx.fillRect(px + tileSize / 2 - 6, py + 0, 12, 12);
        }

        if (this.isPuddleTile(gx, gy)) {
          this.ctx.fillStyle = "#2a4f8f";
          this.ctx.fillRect(px + 6, py + 10, tileSize - 12, tileSize - 14);
          this.ctx.fillStyle = "rgba(141, 193, 255, 0.35)";
          this.ctx.fillRect(px + 10, py + 12, tileSize - 22, 4);
        }
      }
    }
  }

  drawCharacter(
    entity: Entity,
    offsetX: number = 0,
    offsetY: number = 0,
    size: number = 32,
    _direction: { dx: number; dy: number } = { dx: 0, dy: 0 },
  ): void {
    const pos = entity.getComponent<Position>("position");
    if (!pos) return;

    const x = Math.round(pos.x + offsetX);
    const y = Math.round(pos.y + offsetY);

    this.ctx.fillStyle = "#2f58c8";
    this.ctx.fillRect(x, y, size, size);

    this.ctx.fillStyle = "#1a2f77";
    this.ctx.fillRect(x + 6, y + size - 12, size - 12, 8);

    this.ctx.fillStyle = "#f2dfb2";
    this.ctx.fillRect(x + size / 2 - 6, y + 4, 12, 10);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(x + size / 2 - 5, y + 8, 3, 2);
    this.ctx.fillRect(x + size / 2 + 2, y + 8, 3, 2);

  }

  drawEnemy(enemy: Enemy, offsetX: number = 0, offsetY: number = 0, size: number = 32): void {
    const pos = enemy.getComponent<Position>("position");
    if (!pos) return;

    const x = Math.round(pos.x + offsetX);
    const y = Math.round(pos.y + offsetY);
    const sprite = enemy.worldSprite;

    this.ctx.fillStyle = "rgba(0,0,0,0.35)";
    this.ctx.fillRect(x + 6, y + size - 4, size - 12, 4);

    if (sprite === "bat") {
      this.ctx.fillStyle = "#5f4ec9";
      this.ctx.fillRect(x + 6, y + 10, size - 12, 14);
      this.ctx.fillRect(x + 2, y + 13, 8, 8);
      this.ctx.fillRect(x + size - 10, y + 13, 8, 8);
      this.ctx.fillStyle = "#f5f5f5";
      this.ctx.fillRect(x + 11, y + 14, 3, 3);
      this.ctx.fillRect(x + size - 14, y + 14, 3, 3);
      this.ctx.fillStyle = "#111";
      this.ctx.fillRect(x + 11, y + 16, 2, 2);
      this.ctx.fillRect(x + size - 13, y + 16, 2, 2);
      return;
    }

    if (sprite === "skeleton") {
      this.ctx.fillStyle = "#d9dde3";
      this.ctx.fillRect(x + 6, y + 6, size - 12, size - 10);
      this.ctx.fillStyle = "#131313";
      this.ctx.fillRect(x + 11, y + 12, 4, 4);
      this.ctx.fillRect(x + size - 15, y + 12, 4, 4);
      this.ctx.fillRect(x + size / 2 - 3, y + 21, 6, 4);
      return;
    }

    if (sprite === "mush") {
      this.ctx.fillStyle = "#6d3f2e";
      this.ctx.fillRect(x + 6, y + 6, size - 12, 12);
      this.ctx.fillStyle = "#c9c2ab";
      this.ctx.fillRect(x + 12, y + 18, size - 24, 10);
      this.ctx.fillStyle = "#f2f2f2";
      this.ctx.fillRect(x + 13, y + 11, 3, 3);
      this.ctx.fillRect(x + size - 16, y + 11, 3, 3);
      this.ctx.fillStyle = "#111";
      this.ctx.fillRect(x + 13, y + 13, 2, 2);
      this.ctx.fillRect(x + size - 15, y + 13, 2, 2);
      return;
    }

    this.ctx.fillStyle = enemy.color;
    this.ctx.fillRect(x + 4, y + 8, size - 8, size - 10);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(x + 11, y + 14, 4, 4);
    this.ctx.fillRect(x + size - 15, y + 14, 4, 4);
    this.ctx.fillStyle = "#220000";
    this.ctx.fillRect(x + 11, y + 16, 3, 3);
    this.ctx.fillRect(x + size - 14, y + 16, 3, 3);
  }

  private isWalkableTile(gx: number, gy: number): boolean {
    const chunkX = Math.floor(gx / 12);
    const chunkY = Math.floor(gy / 9);
    const seed = (chunkX * 92821 + chunkY * 68917) % 7;
    const localX = gx % 12;
    const localY = gy % 9;

    if (seed <= 2) {
      return localX >= 2 && localX <= 9 && localY >= 2 && localY <= 6;
    }
    if (seed <= 4) {
      return localX >= 1 && localX <= 10 && localY >= 3 && localY <= 5;
    }

    return localX >= 5 && localX <= 6;
  }

  private isTorchTile(gx: number, gy: number): boolean {
    return gx % 14 === 0 && gy % 10 === 0;
  }

  private isPuddleTile(gx: number, gy: number): boolean {
    return gx % 16 === 5 && gy % 12 === 8;
  }

  drawFPS(fps: number): void {
    this.ctx.fillStyle = "#00ff00";
    this.ctx.font = "bold 14px Arial";
    this.ctx.fillText(`FPS: ${Math.round(fps)}`, 10, 20);
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }
}
