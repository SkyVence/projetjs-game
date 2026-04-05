import { Entity } from "./entity";
import { Health } from "@/class/base/health";
import { PlayerStatus } from "@/types/status";

export interface PlayerBaseStats {
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface PlayerProgression {
  level: number;
  xp: number;
  xpToNext: number;
}

export type InventoryItemId = "potion" | "power_tonic" | "guard_charm";

export interface PlayerInventoryItem {
  id: InventoryItemId;
  name: string;
  quantity: number;
  effect: "heal" | "buff" | "guard";
  value: number;
  durationTurns?: number;
}

export interface PlayerSnapshot {
  name: string;
  stats: PlayerBaseStats & PlayerProgression & { hp: number };
  status: PlayerStatus;
  inventory: PlayerInventoryItem[];
}

export class Player extends Entity {
  public name: string;
  public stats: PlayerBaseStats & PlayerProgression & { hp: number };
  public status: PlayerStatus;
  private inventory: PlayerInventoryItem[];

  constructor(name: string, baseStats: Partial<PlayerBaseStats> = {}) {
    super();
    this.name = name;
    this.stats = {
      maxHp: baseStats.maxHp ?? 100,
      hp: baseStats.maxHp ?? 100,
      attack: baseStats.attack ?? 15,
      defense: baseStats.defense ?? 5,
      speed: baseStats.speed ?? 10,
      level: 1,
      xp: 0,
      xpToNext: 100,
    };
    this.status = PlayerStatus.ALIVE;
    this.inventory = [
      {
        id: "potion",
        name: "Potion de soin",
        quantity: 3,
        effect: "heal",
        value: 25,
      },
      {
        id: "power_tonic",
        name: "Tonique de force",
        quantity: 2,
        effect: "buff",
        value: 8,
        durationTurns: 2,
      },
      {
        id: "guard_charm",
        name: "Charme garde",
        quantity: 2,
        effect: "guard",
        value: 1,
        durationTurns: 1,
      },
    ];
  }

  public getPlayerName(): string {
    return this.name;
  }

  public getCurrentHp(): number {
    return this.stats.hp;
  }

  public setCurrentHp(value: number): void {
    this.stats.hp = Math.max(0, Math.min(value, this.getMaxHp()));
    this.syncHealthComponent();
    if (this.stats.hp <= 0) {
      this.status = PlayerStatus.DEAD;
    }
  }

  public getMaxHp(): number {
    return this.stats.maxHp;
  }

  public getAttackPower(): number {
    return this.stats.attack;
  }

  public getDefensePower(): number {
    return this.stats.defense;
  }

  public getSpeed(): number {
    return this.stats.speed;
  }

  public isAlive(): boolean {
    return this.status === PlayerStatus.ALIVE;
  }

  public takeDamage(amount: number): number {
    if (!this.isAlive()) return 0;

    const damage = Math.max(1, amount - this.getDefensePower());
    this.stats.hp = Math.max(0, this.stats.hp - damage);
    this.syncHealthComponent();

    if (this.stats.hp === 0) {
      this.status = PlayerStatus.DEAD;
    }

    return damage;
  }

  public heal(amount: number): number {
    if (!this.isAlive()) return 0;

    const healed = Math.max(0, amount);
    const previousHp = this.stats.hp;
    this.stats.hp = Math.min(this.getMaxHp(), this.stats.hp + healed);
    this.syncHealthComponent();
    return this.stats.hp - previousHp;
  }

  public revive(hp: number = 1): void {
    this.status = PlayerStatus.ALIVE;
    this.stats.hp = Math.max(1, Math.min(hp, this.getMaxHp()));
    this.syncHealthComponent();
  }

  public gainExperience(amount: number): number {
    if (amount <= 0) return 0;

    this.stats.xp += amount;
    let levelsGained = 0;

    while (this.stats.xp >= this.stats.xpToNext) {
      this.stats.xp -= this.stats.xpToNext;
      this.levelUp();
      levelsGained += 1;
    }

    return levelsGained;
  }

  public levelUp(): void {
    this.stats.level += 1;
    this.stats.maxHp += 20;
    this.stats.attack += 4;
    this.stats.defense += 2;
    this.stats.speed += 1;
    this.stats.xpToNext = Math.floor(this.stats.xpToNext * 1.35);
    this.stats.hp = this.getMaxHp();
    this.syncHealthComponent();
  }

  public attackTarget(target: { takeDamage: (amount: number) => number }): number {
    return target.takeDamage(this.getAttackPower());
  }

  public getInventory(): PlayerInventoryItem[] {
    return this.inventory.map((item) => ({ ...item }));
  }

  public getInventoryItem(id: InventoryItemId): PlayerInventoryItem | null {
    const item = this.inventory.find((entry) => entry.id === id);
    return item ? { ...item } : null;
  }

  public consumeInventoryItem(id: InventoryItemId): PlayerInventoryItem | null {
    const item = this.inventory.find((entry) => entry.id === id);
    if (!item || item.quantity <= 0) return null;
    item.quantity -= 1;
    return { ...item, quantity: 1 };
  }

  public addInventoryItem(id: InventoryItemId, amount: number): void {
    const qty = Math.max(0, Math.floor(amount));
    if (qty === 0) return;

    const item = this.inventory.find((entry) => entry.id === id);
    if (!item) return;
    item.quantity += qty;
  }

  public toSnapshot(): PlayerSnapshot {
    return {
      name: this.name,
      stats: { ...this.stats },
      status: this.status,
      inventory: this.getInventory(),
    };
  }

  private clampHp(): void {
    this.stats.hp = Math.max(0, Math.min(this.stats.hp, this.getMaxHp()));
    if (this.stats.hp === 0) {
      this.status = PlayerStatus.DEAD;
    }
  }

  private syncHealthComponent(): void {
    const health = this.getComponent<Health>("health");
    if (!health) return;

    health.setMaxHealth(this.getMaxHp());
    health.setHealth(this.stats.hp);
  }
}
