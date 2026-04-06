import { Player } from "@/class/player";
import { GameScene } from "@/systems/GameScene";
import { MenuView, ExitTitle } from "@/menu";
import { startRouter, navigateTo, registerRoutes } from "./router";

let player: Player | null = null;
let gameScene: GameScene | null = null;

// Cleanup function for game route
function cleanupGame() {
  gameScene?.destroy();
  gameScene = null;
}

// Route: / (Menu - default)
function MenuRoute(): HTMLElement {
  const menu = MenuView({
    onExit: () => {
      navigateTo("/exit");
    },
    onNewGame: (playerName: string) => {
      player = new Player(playerName);
      startGame(app);
    },
    onCredits: () => {
      app.textContent = "Credits";
    },
    onContinue: () => {
      if (!player) return;
      startGame(app);
    },
    onSettings: () => {
      app.textContent = "Settings";
    },
    onCredits: () => {
      navigateTo("/credits");
    },
    onContinue: () => {
      if (!player) return;
      navigateTo("/game");
    },
    onSettings: () => {
      navigateTo("/settings");
    },
  });

  return menu;
}

// Route: /game (Game)
function GameRoute(): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "game-wrapper";

  const container = document.createElement("div");
  container.className = "game-container";

  gameScene = new GameScene(app, {
    viewportWidth: 1100,
    viewportHeight: 700,
    mapWidth: 3200,
    mapHeight: 3200,
  });
  gameScene.setPlayer(player);
  gameScene.initialize();

  // Handle Escape key to go back to menu
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      navigateTo("/");
    }
  };

  window.addEventListener("keydown", escapeHandler);

  // Store reference to handler for cleanup
  (GameRoute as typeof GameRoute & { _escapeHandler?: (e: KeyboardEvent) => void })._escapeHandler = escapeHandler;

  return wrapper;
}

// Define the cleanup function that will be called when leaving the game route
function GameRouteCleanup() {
  const handler = (GameRoute as typeof GameRoute & { _escapeHandler?: (e: KeyboardEvent) => void })._escapeHandler;
  if (handler) {
    window.removeEventListener("keydown", handler);
  }
  cleanupGame();
}

// Route: /credits
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

// Route: /settings
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

// Route: /exit
function ExitRoute(): HTMLElement {
  return ExitTitle();
}

// Register all routes
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

// Start the router
const app = document.getElementById("app");
if (app) {
  showMenu(app);
}
