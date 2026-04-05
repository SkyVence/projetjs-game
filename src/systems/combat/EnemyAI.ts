import { Fighter } from "./Fighter";

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

    if (hpRatio <= 0.3 && enemy.hp < enemy.maxHp) {
      const action: EnemyAction = {
        type: "heal",
        amount: Math.max(14, Math.round(enemy.maxHp * 0.28)),
        label: "Soin critique",
      };
      this.remember(action);
      return action;
    }

    const canEmergencyHeal = this.lastAction !== "heal";
    if (canEmergencyHeal && hpRatio <= 0.45 && Math.random() < 0.55) {
      const action: EnemyAction = {
        type: "heal",
        amount: Math.max(12, Math.round(enemy.maxHp * 0.24)),
        label: "Soin d'urgence",
      };
      this.remember(action);
      return action;
    }

    const heavyPressureChance = playerHpRatio <= 0.4 ? 0.55 : 0.3;
    const forceHeavyAfterBasics = this.basicChain >= 2;
    const isSlime = enemy.name.toLowerCase().includes("slime");
    const heavyChance = isSlime ? heavyPressureChance * 0.5 : heavyPressureChance;
    const heavyMultiplier = isSlime
      ? (playerHpRatio <= 0.4 ? 1.08 : 1.04)
      : (playerHpRatio <= 0.4 ? 1.2 : 1.14);
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
      powerMultiplier: isSlime ? 0.74 : 0.88,
      label: "Attaque rapide",
    };
    this.remember(action);
    return action;
  }

  private remember(action: EnemyAction): void {
    if (action.type === "attack_basic") {
      this.basicChain += 1;
    } else {
      this.basicChain = 0;
    }
    this.lastAction = action.type;
  }
}
