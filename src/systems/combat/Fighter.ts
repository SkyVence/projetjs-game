import { Player } from "@/class/player";
import { Enemy } from "@/class/enemy";

type FighterSource = Player | Enemy;

export class Fighter {
  constructor(public readonly source: FighterSource) {}

  get name(): string {
    return this.source instanceof Player ? this.source.getPlayerName() : this.source.name;
  }

  get hp(): number {
    return this.source instanceof Player ? this.source.getCurrentHp() : this.source.currentHp;
  }

  set hp(value: number) {
    if (this.source instanceof Player) {
      this.source.setCurrentHp(value);
      return;
    }

    this.source.currentHp = Math.max(0, Math.min(value, this.maxHp));
    const health = this.source.getComponent("health");
    if (health && typeof health === "object" && "setHealth" in health) {
      (health as { setHealth: (n: number) => void }).setHealth(this.source.currentHp);
    }
  }

  get maxHp(): number {
    return this.source instanceof Player ? this.source.getMaxHp() : this.source.template.maxHp;
  }

  get attack(): number {
    return this.source instanceof Player ? this.source.getAttackPower() : this.source.attack;
  }

  get defense(): number {
    return this.source instanceof Player ? this.source.getDefensePower() : this.source.defense;
  }

  get speed(): number {
    return this.source instanceof Player ? this.source.getSpeed() : this.source.speed;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  applyDamage(rawDamage: number): number {
    const damage = Math.max(0, rawDamage - this.defense);
    this.hp = Math.max(0, this.hp - damage);
    return damage;
  }

  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.max(0, amount));
    return this.hp - before;
  }

  rawAttackDamage(): number {
    return this.attack;
  }
}
