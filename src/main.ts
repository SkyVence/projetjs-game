import { Player } from "@/class/player";
import { MenuView, ExitTitle } from "@/menu";
import { GameScene } from "@/systems/GameScene";
import { startRouter, navigateTo, registerRoutes } from "./router";
import { clearSave, hasSave, loadGame } from "@/utils/save";

let player: Player | null = null;
let dungeonLevel = 1;
let gameScene: GameScene | null = null;
let gameEscapeHandler: ((e: KeyboardEvent) => void) | null = null;
let app: HTMLElement | null = null;

function cleanupGame(): void {
  if (gameEscapeHandler) {
    window.removeEventListener("keydown", gameEscapeHandler);
    gameEscapeHandler = null;
  }
  if (gameScene) {
    dungeonLevel = gameScene.getDungeonLevel();
  }
  gameScene?.destroy();
  gameScene = null;
}

function MenuRoute(): HTMLElement {
  return MenuView({
    onExit: () => {
      navigateTo("/exit");
    },
    onNewGame: (playerName: string) => {
      player = new Player(playerName);
      dungeonLevel = 1;
      clearSave();
      navigateTo("/game");
    },
    onContinue: () => {
      const save = loadGame();
      if (save) {
        player = save.player;
        dungeonLevel = save.dungeonLevel;
      }
      if (!player) return;
      navigateTo("/game");
    },

    canContinue: hasSave() || !!player,
  });
}

function GameRoute(): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "game-wrapper";

  const container = document.createElement("div");
  container.className = "game-container";
  wrapper.appendChild(container);

  if (!player) {
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
    return MenuRoute();
  }

  gameScene = new GameScene(container, {
    mapWidth: 40 * 48,
    mapHeight: 40 * 48,
    aspectRatio: 16 / 9,
  });
  gameScene.setPlayer(player);
  gameScene.setDungeonLevel(dungeonLevel);
  requestAnimationFrame(() => {
    if (!wrapper.isConnected || !gameScene) return;
    gameScene.initialize();
  });

  gameEscapeHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      navigateTo("/");
    }
  };
  window.addEventListener("keydown", gameEscapeHandler);

  return wrapper;
}

function GameRouteCleanup(): void {
  cleanupGame();
}

function ExitRoute(): HTMLElement {
  return ExitTitle();
}

const routes = {
  "/": MenuRoute,
  "/game": GameRoute,
  "/exit": ExitRoute,
};

const cleanups: Record<string, () => void> = {
  "/game": GameRouteCleanup,
};

registerRoutes(routes, cleanups);

app = document.getElementById("app");
if (app) {
  startRouter(app);
  if (window.location.pathname === "/game" && !player) {
    navigateTo("/");
  }
}
