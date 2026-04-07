import { type PlayerSnapshot } from "@/class/player";
import { Logger, SystemName } from "@/utils/logger";

const DB_NAME = "VillainDungeon";
const DB_VERSION = 3;
const GAME_SAVE_VERSION = 3;

/**
 * State tracked per dungeon level
 * Used for deterministic dungeon generation and world-state persistence
 */
export interface LevelState {
  /** RNG seed for this level - ensures consistent dungeon layout */
  seed: number;
  /** UUIDs of enemies that have been killed on this level */
  deadEnemies: string[];
  // Future replay extensions:
  // exploredTiles?: boolean[][];
  // openedChests?: string[];
  // triggeredEvents?: string[];
}

export interface SaveSlot {
  id: string;
  player: PlayerSnapshot;
  dungeonLevel: number;
  savedAt: number;
  version: number;
  /** Per-level state for deterministic regeneration and enemy persistence */
  levelStates: Record<number, LevelState>;
}

export class GameDatabase {
  private db: IDBDatabase | null = null;
  private ready: Promise<IDBDatabase>;
  private logger = new Logger();

  constructor() {
    this.ready = this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is not supported"));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to open database"));
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const target = event.target;
        if (!(target instanceof IDBOpenDBRequest)) {
          reject(new Error("Failed to access upgrade request"));
          return;
        }

        const db = target.result;

        // Delete legacy stores if they exist
        if (db.objectStoreNames.contains("save")) {
          db.deleteObjectStore("save");
        }
        if (db.objectStoreNames.contains("players")) {
          db.deleteObjectStore("players");
        }
        if (db.objectStoreNames.contains("inventories")) {
          db.deleteObjectStore("inventories");
        }

        // Create canonical game_saves store
        if (!db.objectStoreNames.contains("game_saves")) {
          const gameSaves = db.createObjectStore("game_saves", { keyPath: "id" });
          gameSaves.createIndex("savedAt", "savedAt", { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
    });
  }

  async getDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    return this.ready;
  }

  async getAllSlots(): Promise<SaveSlot[]> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("game_saves", "readonly");
      const store = transaction.objectStore("game_saves");
      const request = store.getAll();

      request.onerror = () => {
        this.logger.error(SystemName.Database, "Failed to get all slots", request.error);
        reject(request.error ?? new Error("Failed to get all slots"));
      };

      request.onsuccess = () => {
        const slots = (request.result as SaveSlot[]).sort((a, b) => b.savedAt - a.savedAt);
        resolve(slots);
      };
    });
  }

  async getSlot(slotId: string): Promise<SaveSlot | null> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("game_saves", "readonly");
      const store = transaction.objectStore("game_saves");
      const request = store.get(slotId);

      request.onerror = () => {
        this.logger.error(SystemName.Database, `Failed to get slot ${slotId}`, request.error);
        reject(request.error ?? new Error("Failed to get slot"));
      };

      request.onsuccess = () => {
        const result = request.result as SaveSlot | undefined;
        resolve(result ?? null);
      };
    });
  }

  async saveSlot(slotId: string, data: { player: PlayerSnapshot; dungeonLevel: number; levelStates: Record<number, LevelState> }): Promise<void> {
    const db = await this.getDatabase();

    const slot: SaveSlot = {
      id: slotId,
      player: data.player,
      dungeonLevel: Math.max(1, Math.floor(data.dungeonLevel)),
      savedAt: Date.now(),
      version: GAME_SAVE_VERSION,
      levelStates: data.levelStates,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("game_saves", "readwrite");
      const store = transaction.objectStore("game_saves");
      const request = store.put(slot);

      request.onerror = () => {
        this.logger.error(SystemName.Database, `Failed to save slot ${slotId}`, request.error);
        reject(request.error ?? new Error("Failed to save slot"));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        this.logger.error(SystemName.Database, "Save transaction failed", transaction.error);
        reject(transaction.error ?? new Error("Save transaction failed"));
      };
    });
  }

  async deleteSlot(slotId: string): Promise<void> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("game_saves", "readwrite");
      const store = transaction.objectStore("game_saves");
      const request = store.delete(slotId);

      request.onerror = () => {
        this.logger.error(SystemName.Database, `Failed to delete slot ${slotId}`, request.error);
        reject(request.error ?? new Error("Failed to delete slot"));
      };

      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  async hasAnySave(): Promise<boolean> {
    const slots = await this.getAllSlots();
    return slots.length > 0;
  }
}

export const db = new GameDatabase();
