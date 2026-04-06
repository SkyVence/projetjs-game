import type { Entity } from "@/class/entity";
import type { Position } from "@/class/base/position";

export interface CameraConfig {
  viewportWidth: number;
  viewportHeight: number;
  mapWidth: number;
  mapHeight: number;
  smoothness?: number;
  scrollMargin?: number;
}

export class Camera {
  private x: number = 0;
  private y: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private config: CameraConfig;

  constructor(config: CameraConfig) {
    this.config = { smoothness: 0.1, scrollMargin: 150, ...config };
  }

  follow(target: Entity): void {
    const pos = target.getComponent<Position>("position");
    if (!pos) return;

    const margin = this.config.scrollMargin || 150;
    const entitySize = 40; // PLAYER_SIZE
    const entityCenterX = pos.x + entitySize / 2;
    const entityCenterY = pos.y + entitySize / 2;

    // Calculate max scroll bounds
    const maxX = Math.max(0, this.config.mapWidth - this.config.viewportWidth);
    const maxY = Math.max(0, this.config.mapHeight - this.config.viewportHeight);

    // Clamp current position to valid bounds first
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));

    // Calculate the entity position relative to current camera view
    const relativeX = entityCenterX - this.x;
    const relativeY = entityCenterY - this.y;

    // Calculate scroll boundaries
    const leftBound = margin;
    const rightBound = this.config.viewportWidth - margin;
    const topBound = margin;
    const bottomBound = this.config.viewportHeight - margin;

    // Only update target if entity is outside the margin area
    let newTargetX = this.targetX;
    let newTargetY = this.targetY;

    if (relativeX < leftBound) {
      newTargetX = entityCenterX - leftBound;
    } else if (relativeX > rightBound) {
      newTargetX = entityCenterX - rightBound;
    }

    if (relativeY < topBound) {
      newTargetY = entityCenterY - topBound;
    } else if (relativeY > bottomBound) {
      newTargetY = entityCenterY - bottomBound;
    }

    // Clamp to map bounds
    this.targetX = Math.max(0, Math.min(newTargetX, maxX));
    this.targetY = Math.max(0, Math.min(newTargetY, maxY));
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

  updateViewport(width: number, height: number): void {
    this.config.viewportWidth = width;
    this.config.viewportHeight = height;

    // Clamp current position to new bounds
    const maxX = Math.max(0, this.config.mapWidth - width);
    const maxY = Math.max(0, this.config.mapHeight - height);

    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
    this.targetX = Math.max(0, Math.min(this.targetX, maxX));
    this.targetY = Math.max(0, Math.min(this.targetY, maxY));
  }
}
