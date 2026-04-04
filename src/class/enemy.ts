import { Entity } from "@/class/entity";
import { Health } from "@/class/base/health";
import { Position } from "@/class/base/position";
import type { EnemyTemplate } from "@/data/enemies";

export class Enemy extends Entity {
  public readonly template: EnemyTemplate;
  public currentHp: number;

  constructor(template: EnemyTemplate, x: number, y: number) {
    super();
    this.template = template;
    this.currentHp = template.maxHp;

    this.addComponent(new Position(x, y));
    this.addComponent(new Health(template.maxHp));
  }

  public get name(): string {
    return this.template.name;
  }

  public get attack(): number {
    return this.template.attack;
  }

  public get defense(): number {
    return this.template.defense;
  }

  public get xpReward(): number {
    return this.template.xpReward;
  }

  public get color(): string {
    return this.template.color;
  }

  public get behavior(): EnemyTemplate["behavior"] {
    return this.template.behavior;
  }

  public isAlive(): boolean {
    return this.currentHp > 0;
  }

  public takeDamage(amount: number): number {
    const damage = Math.max(1, amount - this.defense);
    this.currentHp = Math.max(0, this.currentHp - damage);

    const health = this.getComponent<Health>("health");
    if (health) {
      health.setHealth(this.currentHp);
    }

    return damage;
  }

  public attackTarget(target: { takeDamage: (amount: number) => number }): number {
    return target.takeDamage(this.attack);
  }
}
