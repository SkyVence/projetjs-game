import { Player, type PlayerSnapshot } from "@/class/player";

const SAVE_KEY = "villain_dungeon_save_v1";

export interface SaveData {
  player: PlayerSnapshot;
  dungeonLevel: number;
  savedAt: number;
}

export function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function saveGame(player: Player, dungeonLevel: number): SaveData {
  const payload: SaveData = {
    player: player.toSnapshot(),
    dungeonLevel,
    savedAt: Date.now(),
  };

  if (!canUseStorage()) {
    throw new Error("Local storage unavailable");
  }

  window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  return payload;
}

export function loadGame(): { player: Player; dungeonLevel: number } | null {
  if (!canUseStorage()) return null;

  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SaveData;
    if (!parsed?.player || typeof parsed.dungeonLevel !== "number") {
      return null;
    }

    const player = Player.fromSnapshot(parsed.player);
    const dungeonLevel = Math.max(1, Math.floor(parsed.dungeonLevel));
    return { player, dungeonLevel };
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  if (!canUseStorage()) return false;
  return !!window.localStorage.getItem(SAVE_KEY);
}

export function clearSave(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(SAVE_KEY);
}
