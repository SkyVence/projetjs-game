import type { Component } from "@/class/base/component";

class Position implements Component {
  readonly type = "position";

  constructor(
    public x: number,
    public y: number,
  ) {
    this.x = x;
    this.y = y;
  }
}

export { Position };
