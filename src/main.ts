import { Player } from "@/class/player";
import { GameScene } from "@/systems/GameScene";
import { MenuView, ExitTitle } from "@/menu";

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
    viewportWidth: 1100,
    viewportHeight: 700,
    mapWidth: 3200,
    mapHeight: 3200,
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
  showMenu(app);
}
