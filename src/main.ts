import { Player } from "@/class/player";
import { GameScene } from "@/systems/GameScene";
import { registerRoute, startRouter, navigateTo } from "@/router";
import { MenuView, ExitTitle } from "@/menu";

let player: Player | null = null;
let gameScene: GameScene | null = null;
let menuListenersBound = false;

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

if (app) {
  const showMenu = () => {
    app.innerHTML = "";
    gameScene?.destroy();
    gameScene = null;
    playerNameInput.hidden = true;

    const menuScreen = document.createElement("div");
    menuScreen.className = "menu-screen";

    const menuLeft = document.createElement("section");
    menuLeft.className = "menu-left";

    const menuRight = document.createElement("aside");
    menuRight.className = "menu-right";

    const logoFrame = document.createElement("div");
    logoFrame.className = "logo-frame";

    const menuNav = document.createElement("nav");
    menuNav.className = "menu-nav";

    const newGameWrap = document.createElement("div");
    newGameWrap.className = "new-game-wrap";
    newGameWrap.append(NewGameBtn, playerNameInput);

    logoFrame.appendChild(GameLogo);
    menuNav.append(ContinueBtn, newGameWrap, SettingsBtn, CreditsBtn, ExitBtn);

    menuLeft.append(logoFrame, menuNav);
    menuScreen.append(menuLeft, menuRight);
    app.appendChild(menuScreen);

    if (!menuListenersBound) {
      ExitBtn.addEventListener("click", () => {
        if (confirm("Quitter VillainDungeon ?")) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          app.innerHTML = "";
          app.appendChild(ExitTitle);
        }
      });

      NewGameBtn.addEventListener("click", () => {
        playerNameInput.hidden = false;
        playerNameInput.focus();
      });

      playerNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const playerNameValue = playerNameInput.value.trim();
          if (playerNameValue) {
            player = new Player(playerNameValue);
            startGame();
          }
        }
      });

      CreditsBtn.addEventListener("click", () => {
        app.textContent = "Credits";
      });

      ContinueBtn.addEventListener("click", () => {
        app.textContent = "Hello !";
      });

      SettingsBtn.addEventListener("click", () => {
        app.textContent = "Settings";
      });

      menuListenersBound = true;
    }
  };
  window.addEventListener("keydown", escapeHandler);

  const startGame = () => {
    if (!player) return;

    app.innerHTML = "";
    gameScene = new GameScene(app, {
      viewportWidth: 800,
      viewportHeight: 600,
      mapWidth: 2400,
      mapHeight: 2400,
    });
    gameScene.setPlayer(player);
    gameScene.initialize();

    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        showMenu();
        window.removeEventListener("keydown", escapeHandler);
      }
    };
    window.addEventListener("keydown", escapeHandler);
  };

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
}
