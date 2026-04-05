import { Player } from "@/class/player";
import { GameScene } from "@/systems/GameScene";
import { MenuView, ExitTitle } from "@/menu";
import { MapGenerator } from "@/utils/MapGen";
import { MapRenderer } from "@/utils/MapRenderer";
import { startRouter } from "./router";

let player: Player | null = null;
let gameScene: GameScene | null = null;

function showMenu(app: HTMLElement): void {
  app.innerHTML = "";
  gameScene?.destroy();
  gameScene = null;

  const menu = MenuView({
    onExit: () => {
      app.innerHTML = "";
      app.appendChild(ExitTitle());
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
  });

  app.appendChild(menu);
}

function startGame(app: HTMLElement): void {
  if (!player) return;

  app.innerHTML = "";
  gameScene?.destroy();

  gameScene = new GameScene(app, {
    viewportWidth: 800,
    viewportHeight: 600,
    mapWidth: 2400,
    mapHeight: 2400,
  });
  gameScene.setPlayer(player);
  gameScene.initialize();

  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    showMenu(app);
    window.removeEventListener("keydown", escapeHandler);
  };

  window.addEventListener("keydown", escapeHandler);
}

const app = document.getElementById("app");
if (app) {
  // startRouter(app);
  showMenu(app);

  // Générer et afficher la map immédiatement
  // app.textContent = "";

  // const canvas = document.createElement("canvas");
  // app.appendChild(canvas);

  // const generator = new MapGenerator({ width: 80, height: 50, maxDepth: 4 });
  // const map = generator.generate();

  // const renderer = new MapRenderer(canvas, { tileSize: 16 });
  // renderer.render(map);
}
