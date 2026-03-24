import type { Component } from "@/class/base/component";

/**
 * Component representing 2D coordinates for an entity.
 */
class Position implements Component {
  /** Unique component key. */
  readonly type = "position";
  /**
   * Create a Position component.
   * @param x Horizontal coordinate.
   * @param y Vertical coordinate.
   */
  constructor(
    public x: number,
    public y: number,
  ) {
    this.x = x;
    this.y = y;
  }
}

export { Position };
