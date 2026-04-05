import { Player } from "@/class/player";
import { MenuView, ExitTitle } from "@/menu";

let player: Player | null = null;
let gameScene: GameScene | null = null;

function MenuRoute(): HTMLElement {
  return MenuView({
    onExit: () => navigateTo("/exit"),
    onNewGame: (playerName: string) => {
      player = new Player(playerName);
      navigateTo("/game");
    },
    onContinue: () => navigateTo("/game"),
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

function ExitView(): HTMLElement {
  const container = document.createElement("div");
  container.className = "exit-view";
  container.appendChild(ExitTitle());
  return container;
}

registerRoute("/", MenuRoute);
registerRoute("/game", GameView);
registerRoute("/exit", ExitView);

const app = document.getElementById("app");
if (app) {
  startRouter(app);
}
