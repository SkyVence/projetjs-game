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
    maxHp: 30,
    attack: 8,
    defense: 2,
    speed: 8,
    xpReward: 20,
    color: "#ff3b30",
    behavior: "aggressive",
    worldSprite: "slime",
    combatSprite: "slime",
  },
  {
    id: "bat-cave",
    name: "Chauve-souris",
    maxHp: 26,
    attack: 9,
    defense: 1,
    speed: 55,
    xpReward: 24,
    color: "#7f4cff",
    behavior: "random",
    worldSprite: "bat",
    combatSprite: "bat",
  },
  {
    id: "skeleton-guard",
    name: "Squelette",
    maxHp: 42,
    attack: 10,
    defense: 3,
    speed: 30,
    xpReward: 34,
    color: "#d4d8de",
    behavior: "aggressive",
    worldSprite: "skeleton",
    combatSprite: "skeleton",
  },
  {
    id: "mush-elder",
    name: "Champi Noir",
    maxHp: 36,
    attack: 7,
    defense: 4,
    speed: 28,
    xpReward: 28,
    color: "#8b4d2f",
    behavior: "defensive",
    worldSprite: "mush",
    combatSprite: "mush",
  },
];
