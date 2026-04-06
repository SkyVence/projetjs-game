import type { Player } from "@/class/player";
import type { SaveSlot, LevelState } from "@/db";
import { deriveNextSeed, generateInitialSeed } from "@/utils/seed";

export interface SlotViewModel {
  id: string;
  name: string;
  level: number;
  dungeonLevel: number;
  savedAt: number;
}

export const gameState = {
  // Current game
  currentSlotId: null as string | null,
  player: null as Player | null,
  dungeonLevel: 1,

  // UI state
  isLoading: false,
  initError: null as Error | null,

  // Slots cache
  slots: [] as SaveSlot[],

  // Per-level state for deterministic dungeon generation and enemy persistence
  levelStates: {} as Record<number, LevelState>,

  // Getters
  get canContinue(): boolean {
    return this.slots.length > 0;
  },

  get hasAnySave(): boolean {
    return this.slots.length > 0;
  },

  getSlotViewModels(): SlotViewModel[] {
    // Return only existing saves, no empty slots
    return this.slots.map((slot) => ({
      id: slot.id,
      name: slot.player.name,
      level: slot.player.stats.level,
      dungeonLevel: slot.dungeonLevel,
      savedAt: slot.savedAt,
    }));
  },

  getNextSlotId(): string {
    // Find the highest slot number and add 1
    let maxNum = 0;
    for (const slot of this.slots) {
      const match = slot.id.match(/slot-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
    return `slot-${maxNum + 1}`;
  },

  getCurrentSlotPreview() {
    if (!this.player) return null;
    return {
      name: this.player.getPlayerName(),
      level: this.player.stats.level,
      dungeonLevel: this.dungeonLevel,
      savedAt: Date.now(),
    };
  },

  // === Level State Management ===

  /**
   * Get or initialize level state for a given dungeon level.
   * If the level doesn't have state yet, derives seed from previous level
   * or generates a new one if it's level 1.
   */
  getLevelState(level: number): LevelState {
    if (!this.levelStates[level]) {
      // Derive seed from previous level if available
      let seed: number;
      const prevLevel = level - 1;

      if (prevLevel >= 1 && this.levelStates[prevLevel]) {
        seed = deriveNextSeed(this.levelStates[prevLevel].seed, level);
      } else {
        // Generate fresh seed (for level 1 or orphaned levels)
        seed = generateInitialSeed() + level * 1000;
      }

      this.levelStates[level] = {
        seed,
        deadEnemies: [],
      };
    }
    return this.levelStates[level];
  },

  /**
   * Check if an enemy is marked as dead on a specific level.
   */
  isEnemyDead(level: number, enemyId: string): boolean {
    return this.levelStates[level]?.deadEnemies.includes(enemyId) ?? false;
  },

  /**
   * Mark an enemy as dead on a specific level.
   */
  markEnemyDead(level: number, enemyId: string): void {
    const state = this.levelStates[level];
    if (state && !state.deadEnemies.includes(enemyId)) {
      state.deadEnemies.push(enemyId);
    }
  },

  /**
   * Reset a level's state (for debugging or "reset floor" feature).
   * This will regenerate the seed and clear dead enemies.
   */
  resetLevel(level: number): void {
    delete this.levelStates[level];
  },

  /**
   * Clear all level states (for new game).
   */
  clearAllLevelStates(): void {
    this.levelStates = {};
  },
};
