import type { Player } from "@/class/player";
import type { SaveSlot } from "@/db";

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
      if (match) {
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
};
