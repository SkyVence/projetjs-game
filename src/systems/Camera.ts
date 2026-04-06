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

  // Change tracking for dirty rendering
  private lastX: number = 0;
  private lastY: number = 0;
  private changeDetected: boolean = true;

  constructor(config: CameraConfig) {
    this.config = { smoothness: 0.1, scrollMargin: 150, ...config };
  }

  /**
   * Check if camera has moved beyond the specified threshold since last markClean()
   */
  hasChanged(threshold: number = 1): boolean {
    if (this.changeDetected) return true;
    const dx = Math.abs(this.x - this.lastX);
    const dy = Math.abs(this.y - this.lastY);
    return dx >= threshold || dy >= threshold;
  }

  /**
   * Get the delta movement since last markClean()
   */
  getChangeDelta(): { dx: number; dy: number } {
    return {
      dx: this.x - this.lastX,
      dy: this.y - this.lastY,
    };
  }

  /**
   * Mark camera as clean (reset change tracking)
   */
  markClean(): void {
    this.lastX = this.x;
    this.lastY = this.y;
    this.changeDetected = false;
  }

  /**
   * Force camera to report as changed on next check
   */
  forceDirty(): void {
    this.changeDetected = true;
  }

  follow(target: Entity): void {
    const pos = target.getComponent<Position>("position");
    if (!pos) return;

    const margin = this.config.scrollMargin || 150;
    const entitySize = 40;
    const entityCenterX = pos.x + entitySize / 2;
    const entityCenterY = pos.y + entitySize / 2;

    const maxX = Math.max(0, this.config.mapWidth - this.config.viewportWidth);
    const maxY = Math.max(0, this.config.mapHeight - this.config.viewportHeight);

    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));

    const relativeX = entityCenterX - this.x;
    const relativeY = entityCenterY - this.y;

    const leftBound = margin;
    const rightBound = this.config.viewportWidth - margin;
    const topBound = margin;
    const bottomBound = this.config.viewportHeight - margin;

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

    this.targetX = Math.max(0, Math.min(newTargetX, maxX));
    this.targetY = Math.max(0, Math.min(newTargetY, maxY));
  }

  update(): void {
    const smoothness = this.config.smoothness || 0.1;
    const prevX = this.x;
    const prevY = this.y;

    this.x += (this.targetX - this.x) * smoothness;
    this.y += (this.targetY - this.y) * smoothness;

    // Mark as changed if position actually moved
    if (Math.abs(this.x - prevX) > 0.001 || Math.abs(this.y - prevY) > 0.001) {
      this.changeDetected = true;
    }
  }

  getOffset(): { offsetX: number; offsetY: number } {
    return {
      offsetX: -this.x,
      offsetY: -this.y,
    };
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  updateViewport(width: number, height: number): void {
    this.config.viewportWidth = width;
    this.config.viewportHeight = height;

    const maxX = Math.max(0, this.config.mapWidth - width);
    const maxY = Math.max(0, this.config.mapHeight - height);

    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
    this.targetX = Math.max(0, Math.min(this.targetX, maxX));
    this.targetY = Math.max(0, Math.min(this.targetY, maxY));

    // Viewport change requires full redraw
    this.forceDirty();
  }
}
