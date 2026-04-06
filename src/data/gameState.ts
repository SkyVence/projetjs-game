import type { Player } from "@/class/player";
import type { SaveSlot } from "@/db";

export const MAX_SLOTS = 3;
export const SLOT_IDS = ["slot-1", "slot-2", "slot-3"];

export interface SlotViewModel {
  id: string;
  isEmpty: boolean;
  name?: string;
  level?: number;
  dungeonLevel?: number;
  savedAt?: number;
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
    return SLOT_IDS.map((id) => {
      const slot = this.slots.find((s) => s.id === id);
      if (slot) {
        return {
          id,
          isEmpty: false,
          name: slot.player.name,
          level: slot.player.stats.level,
          dungeonLevel: slot.dungeonLevel,
          savedAt: slot.savedAt,
        };
      }
      return {
        id,
        isEmpty: true,
      };
    });
  },

  getFirstEmptySlot(): string | null {
    return SLOT_IDS.find((id) => !this.slots.some((s) => s.id === id)) || null;
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
