import { Player } from "@/class/player";
import { GameDatabase, type SaveSlot } from "@/db";
import { Logger, SystemName } from "@/utils/logger";
import { generateInitialSeed } from "@/utils/seed";
import { gameState } from "./gameState";

class GameDataService {
  private db = new GameDatabase();
  private listeners = new Set<() => void>();
  private logger = new Logger();
  private initialized = false;

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  /**
   * Initialize the service - just opens the DB connection.
   * Does not fetch any data (lazy loading).
   */
  async init(): Promise<void> {
    try {
      await this.db.getDatabase();
      this.initialized = true;
      gameState.initError = null;
      this.logger.log(SystemName.Database, "Database connection established");
    } catch (error) {
      this.initialized = false;
      gameState.initError = error as Error;
      this.logger.error(SystemName.Database, "Failed to initialize database", error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  getInitError(): Error | null {
    return gameState.initError;
  }

  clearError(): void {
    gameState.initError = null;
  }

  /**
   * Refresh slots from database. Call this when menu opens.
   */
  async refreshSlots(): Promise<void> {
    if (!this.initialized) {
      this.logger.error(SystemName.Database, "Cannot refresh slots: service not initialized");
      return;
    }

    gameState.isLoading = true;
    this.notify();

    try {
      gameState.slots = await this.db.getAllSlots();
      this.logger.log(SystemName.Database, `Loaded ${gameState.slots.length} save slots`);
    } catch (error) {
      this.logger.error(SystemName.Database, "Failed to load slots", error);
    } finally {
      gameState.isLoading = false;
      this.notify();
    }
  }

  async startNewGame(playerName: string): Promise<string | null> {
    const slotId = gameState.getNextSlotId();

    gameState.isLoading = true;
    this.notify();

    try {
      gameState.currentSlotId = slotId;
      gameState.player = new Player(playerName);
      gameState.dungeonLevel = 1;

      // Initialize level states for new game
      gameState.clearAllLevelStates();
      const initialSeed = generateInitialSeed();
      gameState.levelStates[1] = {
        seed: initialSeed,
        deadEnemies: [],
      };

      await this.saveCurrentGame();
      await this.refreshSlots();

      this.logger.log(SystemName.Database, `New game started in ${slotId}`);
      return slotId;
    } catch (error) {
      this.logger.error(SystemName.Database, "Failed to start new game", error);
      return null;
    } finally {
      gameState.isLoading = false;
      this.notify();
    }
  }

  async loadGame(slotId: string): Promise<boolean> {
    gameState.isLoading = true;
    this.notify();

    try {
      const slot = await this.db.getSlot(slotId);
      if (!slot) {
        this.logger.error(SystemName.Database, `Slot ${slotId} not found`);
        return false;
      }

      gameState.currentSlotId = slotId;
      gameState.player = Player.fromSnapshot(slot.player);
      gameState.dungeonLevel = slot.dungeonLevel;

      // Restore level states (with migration for old saves)
      gameState.levelStates = slot.levelStates ?? {};

      // Migration: ensure current level has a state for old saves
      if (!gameState.levelStates[gameState.dungeonLevel]) {
        const prevLevel = gameState.dungeonLevel - 1;
        let seed: number;
        if (prevLevel >= 1 && gameState.levelStates[prevLevel]) {
          seed = gameState.levelStates[prevLevel].seed;
        } else {
          seed = generateInitialSeed() + gameState.dungeonLevel * 1000;
        }
        gameState.levelStates[gameState.dungeonLevel] = {
          seed,
          deadEnemies: [],
        };
      }

      this.logger.log(SystemName.Database, `Game loaded from ${slotId}`);
      return true;
    } catch (error) {
      this.logger.error(SystemName.Database, "Failed to load game", error);
      return false;
    } finally {
      gameState.isLoading = false;
      this.notify();
    }
  }

  async saveGame(player: Player, dungeonLevel: number): Promise<void> {
    gameState.player = player;
    gameState.dungeonLevel = dungeonLevel;
    await this.saveCurrentGame();
  }

  private async saveCurrentGame(): Promise<void> {
    if (!gameState.player || !gameState.currentSlotId) {
      this.logger.error(SystemName.Database, "Cannot save: no player or slot");
      return;
    }

    try {
      await this.db.saveSlot(gameState.currentSlotId, {
        player: gameState.player.toSnapshot(),
        dungeonLevel: gameState.dungeonLevel,
        levelStates: gameState.levelStates,
      });
      await this.refreshSlots();

      this.logger.log(SystemName.Database, `Game saved to ${gameState.currentSlotId}`);
    } catch (error) {
      this.logger.error(SystemName.Database, "Failed to save game", error);
    }
  }

  setDungeonLevel(level: number): void {
    gameState.dungeonLevel = level;
    this.notify();
  }

  getCurrentSlotId(): string | null {
    return gameState.currentSlotId;
  }

  getSlots(): SaveSlot[] {
    return gameState.slots;
  }

  async deleteSlot(slotId: string): Promise<boolean> {
    gameState.isLoading = true;
    this.notify();

    try {
      await this.db.deleteSlot(slotId);
      this.logger.log(SystemName.Database, `Slot ${slotId} deleted`);

      // If the current slot was deleted, clear it
      if (gameState.currentSlotId === slotId) {
        gameState.currentSlotId = null;
        gameState.player = null;
        gameState.dungeonLevel = 1;
        gameState.clearAllLevelStates();
      }

      await this.refreshSlots();
      return true;
    } catch (error) {
      this.logger.error(SystemName.Database, "Failed to delete slot", error);
      return false;
    } finally {
      gameState.isLoading = false;
      this.notify();
    }
  }
}

export const gameDataService = new GameDataService();
