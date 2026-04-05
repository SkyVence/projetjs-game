import { Player } from "@/class/player";
import { GameScene } from "@/systems/GameScene";
import { registerRoute, startRouter, navigateTo } from "@/router";
import { MenuView, ExitTitle } from "@/menu";
import { MapGenerator } from "@/utils/MapGen";
import { MapRenderer } from "@/utils/MapRenderer";

let player: Player | null = null;
let gameScene: GameScene | null = null;

function MenuRoute(): HTMLElement {
  return MenuView({
    onExit: () => navigateTo("/exit"),
    onNewGame: (playerName: string) => {
      player = new Player(playerName);
      navigateTo("/game");
    },
    onCredits: () => navigateTo("/credits"),
    onContinue: () => navigateTo("/game"),
    onSettings: () => navigateTo("/settings"),
  });
}

function GameView(): HTMLElement {
  const gameContainer = document.createElement("div");
  gameContainer.className = "game-container";

  gameScene?.destroy();
  gameScene = null;

  gameScene = new GameScene(gameContainer, {
    viewportWidth: 800,
    viewportHeight: 600,
    mapWidth: 2400,
    mapHeight: 2400,
  });
  gameScene.initialize();

  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      gameScene?.destroy();
      gameScene = null;
      navigateTo("/");
      window.removeEventListener("keydown", escapeHandler);
    }
  };
  window.addEventListener("keydown", escapeHandler);

  return gameContainer;
}

function CreditsView(): HTMLElement {
  const container = document.createElement("div");
  container.className = "credits-view";
  container.innerHTML = `
    <h1>Credits</h1>
    <p>Game developed with love!</p>
    <button id="back-btn" class="menu-item">Back to Menu</button>
  `;

  const backBtn = container.querySelector("#back-btn");
  backBtn?.addEventListener("click", () => {
    navigateTo("/");
  });

  return container;
}

function SettingsView(): HTMLElement {
  const container = document.createElement("div");
  container.className = "settings-view";
  container.innerHTML = `
    <h1>Settings</h1>
    <p>Game settings will appear here.</p>
    <button id="back-btn" class="menu-item">Back to Menu</button>
  `;

  const backBtn = container.querySelector("#back-btn");
  backBtn?.addEventListener("click", () => {
    navigateTo("/");
  });

  return container;
}

function ExitView(): HTMLElement {
  const container = document.createElement("div");
  container.className = "exit-view";
  container.appendChild(ExitTitle());
  return container;
}

registerRoute("/", MenuRoute);
registerRoute("/game", GameView);
registerRoute("/credits", CreditsView);
registerRoute("/settings", SettingsView);
registerRoute("/exit", ExitView);

const app = document.getElementById("app");

if (app) {
  startRouter(app);

  // Générer et afficher la map immédiatement
  app.textContent = "";

  const canvas = document.createElement("canvas");
  app.appendChild(canvas);

  const generator = new MapGenerator({ width: 80, height: 50, maxDepth: 4 });
  const map = generator.generate();

  const renderer = new MapRenderer(canvas, { tileSize: 16 });
  renderer.render(map);
}
