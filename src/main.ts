import { Player } from "@/class/player";
import { GameScene } from "@/systems/GameScene";
import { MenuView, ExitTitle } from "@/menu";
import { startRouter, navigateTo, registerRoutes } from "./router";
import { clearSave, hasSave, loadGame } from "@/utils/save";
import { IndexedDB } from "@/db";
import { Logger, SystemName } from "./utils/logger";

let player: Player | null = null;
let dungeonLevel = 1;
let gameScene: GameScene | null = null;
let gameEscapeHandler: ((e: KeyboardEvent) => void) | null = null;
let app: HTMLElement | null = null;

const db = new IndexedDB("test", 3);
const logger = new Logger()

db.getDatabase().then((database) => {
  logger.log(SystemName.Database, `Database is correctly opened with name: ${database.name}`);
});


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
    onCredits: () => {
      navigateTo("/credits");
    },
    onSettings: () => {
      navigateTo("/settings");
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

function CreditsRoute(): HTMLElement {
  const container = document.createElement("div");
  container.className = "credits-screen";

  const title = document.createElement("h1");
  title.textContent = "Credits";
  title.className = "credits-title";

  const content = document.createElement("div");
  content.className = "credits-content";
  content.innerHTML = `
    <p>VillainDungeon</p>
    <p>A dungeon crawler game</p>
    <p>Built with TypeScript and Vite</p>
  `;

  const backBtn = document.createElement("button");
  backBtn.className = "menu-item";
  backBtn.textContent = "Back to Menu";
  backBtn.addEventListener("click", () => {
    navigateTo("/");
  });

  container.append(title, content, backBtn);
  return container;
}

function SettingsRoute(): HTMLElement {
  const container = document.createElement("div");
  container.className = "settings-screen";

  const title = document.createElement("h1");
  title.textContent = "Settings";
  title.className = "settings-title";

  const content = document.createElement("div");
  content.className = "settings-content";
  content.innerHTML = `
    <p>Settings will be available soon.</p>
  `;

  const backBtn = document.createElement("button");
  backBtn.className = "menu-item";
  backBtn.textContent = "Back to Menu";
  backBtn.addEventListener("click", () => {
    navigateTo("/");
  });

  container.append(title, content, backBtn);
  return container;
}

function ExitRoute(): HTMLElement {
  return ExitTitle();
}

const routes = {
  "/": MenuRoute,
  "/game": GameRoute,
  "/credits": CreditsRoute,
  "/settings": SettingsRoute,
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
