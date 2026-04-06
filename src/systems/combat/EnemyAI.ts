import { Fighter } from "./Fighter";

const BASE_HEAL_CRITICAL_THRESHOLD = 0.24;
const BASE_HEAL_CRITICAL_AMOUNT_RATIO = 0.2;
const BASE_HEAL_EMERGENCY_THRESHOLD = 0.38;
const BASE_HEAL_EMERGENCY_CHANCE = 0.4;
const BASE_HEAL_EMERGENCY_AMOUNT_RATIO = 0.16;
const BASE_HEAVY_PRESSURE_CHANCE = 0.24;
const BASE_HEAVY_PRESSURE_CHANCE_LOW_HP = 0.42;
const BASE_BASIC_MULTIPLIER_SLIME = 0.64;
const BASE_BASIC_MULTIPLIER_OTHER = 0.78;
const BASE_HEAVY_MULTIPLIER_SLIME_LOW = 0.98;
const BASE_HEAVY_MULTIPLIER_SLIME_HIGH = 0.92;
const BASE_HEAVY_MULTIPLIER_OTHER_LOW = 1.08;
const BASE_HEAVY_MULTIPLIER_OTHER_HIGH = 1.02;

const DEPTH_HEAL_CRITICAL_STEP = 0.012;
const DEPTH_HEAL_EMERGENCY_STEP = 0.015;
const DEPTH_HEAL_AMOUNT_STEP = 0.012;
const DEPTH_HEAVY_CHANCE_STEP = 0.045;
const DEPTH_BASIC_MULTIPLIER_STEP = 0.03;
const DEPTH_HEAVY_MULTIPLIER_STEP = 0.045;
const DEPTH_BASIC_CHAIN_MIN = 2;

export type EnemyAction =
  | { type: "attack_basic"; powerMultiplier: number; label: string }
  | { type: "attack_heavy"; powerMultiplier: number; label: string }
  | { type: "heal"; amount: number; label: string };

export class EnemyAI {
  private lastAction: EnemyAction["type"] | null = null;
  private basicChain = 0;

  chooseAction(enemy: Fighter, player: Fighter): EnemyAction {
    const hpRatio = enemy.hp / Math.max(1, enemy.maxHp);
    const playerHpRatio = player.hp / Math.max(1, player.maxHp);
    const difficultyTier = Math.max(0, Math.floor((player.level ?? 1) / 2));

    const healCriticalThreshold = Math.max(
      0.1,
      BASE_HEAL_CRITICAL_THRESHOLD - difficultyTier * DEPTH_HEAL_CRITICAL_STEP,
    );
    const healEmergencyThreshold = Math.max(
      0.22,
      BASE_HEAL_EMERGENCY_THRESHOLD -
        difficultyTier * DEPTH_HEAL_EMERGENCY_STEP,
    );
    const healEmergencyChance = Math.min(
      0.7,
      BASE_HEAL_EMERGENCY_CHANCE + difficultyTier * 0.03,
    );
    const healCriticalAmount = Math.max(
      10,
      Math.round(
        enemy.maxHp *
          (BASE_HEAL_CRITICAL_AMOUNT_RATIO +
            difficultyTier * DEPTH_HEAL_AMOUNT_STEP),
      ),
    );
    const healEmergencyAmount = Math.max(
      8,
      Math.round(
        enemy.maxHp *
          (BASE_HEAL_EMERGENCY_AMOUNT_RATIO +
            difficultyTier * (DEPTH_HEAL_AMOUNT_STEP * 0.75)),
      ),
    );
    const heavyPressureChance = Math.min(
      0.85,
      (playerHpRatio <= 0.4
        ? BASE_HEAVY_PRESSURE_CHANCE_LOW_HP
        : BASE_HEAVY_PRESSURE_CHANCE) +
        difficultyTier * DEPTH_HEAVY_CHANCE_STEP,
    );
    const forceHeavyAfterBasics =
      this.basicChain >=
      Math.max(2, DEPTH_BASIC_CHAIN_MIN - Math.floor(difficultyTier / 3));
    const isSlime = enemy.name.toLowerCase().includes("slime");
    const heavyChance = isSlime
      ? heavyPressureChance * 0.55
      : heavyPressureChance;
    const heavyMultiplier = isSlime
      ? playerHpRatio <= 0.4
        ? BASE_HEAVY_MULTIPLIER_SLIME_LOW +
          difficultyTier * DEPTH_HEAVY_MULTIPLIER_STEP
        : BASE_HEAVY_MULTIPLIER_SLIME_HIGH +
          difficultyTier * DEPTH_HEAVY_MULTIPLIER_STEP
      : playerHpRatio <= 0.4
        ? BASE_HEAVY_MULTIPLIER_OTHER_LOW +
          difficultyTier * DEPTH_HEAVY_MULTIPLIER_STEP
        : BASE_HEAVY_MULTIPLIER_OTHER_HIGH +
          difficultyTier * DEPTH_HEAVY_MULTIPLIER_STEP;
    const basicMultiplier = isSlime
      ? BASE_BASIC_MULTIPLIER_SLIME +
        difficultyTier * DEPTH_BASIC_MULTIPLIER_STEP
      : BASE_BASIC_MULTIPLIER_OTHER +
        difficultyTier * (DEPTH_BASIC_MULTIPLIER_STEP * 1.15);

    if (hpRatio <= healCriticalThreshold && enemy.hp < enemy.maxHp) {
      const action: EnemyAction = {
        type: "heal",
        amount: healCriticalAmount,
        label: "Soin critique",
      };
      this.remember(action);
      return action;
    }

    const canEmergencyHeal = this.lastAction !== "heal";
    if (
      canEmergencyHeal &&
      hpRatio <= healEmergencyThreshold &&
      Math.random() < healEmergencyChance
    ) {
      const action: EnemyAction = {
        type: "heal",
        amount: healEmergencyAmount,
        label: "Soin d'urgence",
      };
      this.remember(action);
      return action;
    }

    if (forceHeavyAfterBasics || Math.random() < heavyChance) {
      const action: EnemyAction = {
        type: "attack_heavy",
        powerMultiplier: heavyMultiplier,
        label: "Frappe lourde",
      };
      this.remember(action);
      return action;
    }

    const action: EnemyAction = {
      type: "attack_basic",
      powerMultiplier: basicMultiplier,
      label: "Attaque rapide",
    };
    this.remember(action);
    return action;
  }

  private remember(action: EnemyAction): void {
    if (action.type === "attack_basic") {
      this.basicChain += 1;
      return;
    }

    this.basicChain = 0;
    this.lastAction = action.type;
  }
}
