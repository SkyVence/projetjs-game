import { GameScene } from "@/systems/GameScene";
import { gameState, gameDataService } from "@/data";
import { navigateTo } from "../router";

let gameScene: GameScene | null = null;
let gameEscapeHandler: ((e: KeyboardEvent) => void) | null = null;

function cleanupGame(): void {
  if (gameEscapeHandler) {
    window.removeEventListener("keydown", gameEscapeHandler);
    gameEscapeHandler = null;
  }

  gameScene?.destroy();
  gameScene = null;
}

export function createGameRoute(): HTMLElement {
  cleanupGame();

  // Check if we have a player
  if (!gameState.player) {
    navigateTo("/");
    return document.createElement("div");
  }

  const wrapper = document.createElement("div");
  wrapper.className = "game-wrapper";

  const container = document.createElement("div");
  container.className = "game-container";
  wrapper.appendChild(container);

  gameScene = new GameScene(container, {
    mapWidth: 40 * 48,
    mapHeight: 40 * 48,
    aspectRatio: 16 / 9,
  });

  gameScene.setPlayer(gameState.player);
  gameScene.setDungeonLevel(gameState.dungeonLevel);

  requestAnimationFrame(() => {
    if (!wrapper.isConnected || !gameScene) return;
    gameScene.initialize();
  });

  gameEscapeHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      // Save dungeon level before leaving
      if (gameScene) {
        gameDataService.setDungeonLevel(gameScene.getDungeonLevel());
      }
      navigateTo("/");
    }
  };

  window.addEventListener("keydown", gameEscapeHandler);

  return wrapper;
}

export function cleanupGameRoute(): void {
  cleanupGame();
}
