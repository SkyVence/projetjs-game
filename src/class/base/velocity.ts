import type { Component } from "@/class/base/component";

/**
 * Component representing 2D velocity (speed) for an entity.
 */
class Velocity implements Component {
  /** Unique component key. */
  readonly type = "velocity";
  /**
   * Create a Velocity component.
   * @param x Horizontal velocity (pixels per frame).
   * @param y Vertical velocity (pixels per frame).
   */
  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {
    this.x = x;
    this.y = y;
  }
}

export { Velocity };
