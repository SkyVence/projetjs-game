export interface EnemyTemplate {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  xpReward: number;
  color: string;
}

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    id: "slime-red",
    name: "Slime Rouge",
    maxHp: 30,
    attack: 8,
    defense: 2,
    xpReward: 20,
    color: "#ff3b30",
  },
  {
    id: "goblin-brute",
    name: "Gobelin",
    maxHp: 45,
    attack: 11,
    defense: 3,
    xpReward: 30,
    color: "#d43b2f",
  },
];
