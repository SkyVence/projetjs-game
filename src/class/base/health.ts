import type { Component } from "@/class/base/component";

class Health implements Component {
  readonly type = "health";

  constructor(public health: number) {
    this.health = health;
  }
}

export { Health };
