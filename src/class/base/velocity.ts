import type { Component } from "@/class/base/component";

class Velocity implements Component {
  readonly type = "velocity";

  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {
    this.x = x;
    this.y = y;
  }
}

export { Velocity };
