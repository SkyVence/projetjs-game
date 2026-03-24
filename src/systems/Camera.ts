import type { Entity } from "@/class/entity";
import type { Position } from "@/class/base/position";

export interface CameraConfig {
  viewportWidth: number;
  viewportHeight: number;
  mapWidth: number;
  mapHeight: number;
  smoothness?: number;
}

export class Camera {
  private x: number = 0;
  private y: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private config: CameraConfig;

  constructor(config: CameraConfig) {
    this.config = { smoothness: 0.1, ...config };
  }

  follow(target: Entity): void {
    const pos = target.getComponent<Position>("position");
    if (!pos) return;

    const halfViewportW = this.config.viewportWidth / 2;
    const halfViewportH = this.config.viewportHeight / 2;

    this.targetX = pos.x - halfViewportW + 16;
    this.targetY = pos.y - halfViewportH + 16;

    this.targetX = Math.max(0, Math.min(this.targetX, this.config.mapWidth - this.config.viewportWidth));
    this.targetY = Math.max(0, Math.min(this.targetY, this.config.mapHeight - this.config.viewportHeight));
  }

  update(): void {
    const smoothness = this.config.smoothness || 0.1;
    this.x += (this.targetX - this.x) * smoothness;
    this.y += (this.targetY - this.y) * smoothness;
  }

  getOffset(): { offsetX: number; offsetY: number } {
    return {
      offsetX: -Math.round(this.x),
      offsetY: -Math.round(this.y),
    };
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
