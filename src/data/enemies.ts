export interface EnemyTemplate {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  xpReward: number;
  color: string;
  behavior: "aggressive" | "defensive" | "random";
  worldSprite: "slime" | "bat" | "skeleton" | "mush";
  combatSprite: "slime" | "bat" | "skeleton" | "mush";
}

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    id: "slime-red",
    name: "Slime Rouge",
    maxHp: 24,
    attack: 8,
    defense: 1,
    speed: 8,
    xpReward: 22,
    color: "#ff3b30",
    behavior: "aggressive",
    worldSprite: "slime",
    combatSprite: "slime",
  },
  {
    id: "bat-cave",
    name: "Chauve-souris",
    maxHp: 26,
    attack: 10,
    defense: 1,
    speed: 52,
    xpReward: 25,
    color: "#7f4cff",
    behavior: "random",
    worldSprite: "bat",
    combatSprite: "bat",
  },
  {
    id: "skeleton-guard",
    name: "Squelette",
    maxHp: 40,
    attack: 11,
    defense: 2,
    speed: 30,
    xpReward: 36,
    color: "#d4d8de",
    behavior: "aggressive",
    worldSprite: "skeleton",
    combatSprite: "skeleton",
  },
  {
    id: "mush-elder",
    name: "Champi Noir",
    maxHp: 36,
    attack: 9,
    defense: 3,
    speed: 28,
    xpReward: 30,
    color: "#8b4d2f",
    behavior: "defensive",
    worldSprite: "mush",
    combatSprite: "mush",
  },
];
