import type { Component } from "@/class/base/component";

/**
 * Component representing an entity's hit points.
 */
class Health implements Component {
  /** Unique component key. */
  readonly type = "health";
  /**
   * Create a Health component.
   * @param health Current hit points value.
   */
  constructor(public health: Number) {
    this.health = health;
  }
}
