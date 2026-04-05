import type { Component } from "@/class/base/component";

class Health implements Component {
  readonly type = "health";

  constructor(
    public health: number,
    public maxHealth: number = health,
  ) {
    this.health = health;
    this.maxHealth = maxHealth;
  }

  setHealth(value: number): void {
    this.health = Math.max(0, Math.min(value, this.maxHealth));
  }

  setMaxHealth(value: number): void {
    this.maxHealth = Math.max(0, value);
    this.health = Math.min(this.health, this.maxHealth);
  }
}

export { Health };
