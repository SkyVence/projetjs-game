import {
  ContinueBtn,
  NewGameBtn,
  SettingsBtn,
  ExitBtn,
  GameLogo,
  CreditsBtn,
  ExitTitle,
} from "@/menu";
import { playerNameInput } from "@/input";
import { Player } from "@/class/player";

let player: Player;

playerNameInput.hidden = true;

const app = document.getElementById("app");

if (app) {
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
    playerNameInput.hidden = !playerNameInput.hidden;
    if (!playerNameInput.hidden) {
      playerNameInput.focus();
    }
  });

  playerNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const playerNameValue = playerNameInput.value.trim();
      if (playerNameValue) {
        player = new Player(playerNameValue);
        app.textContent = `Hello, ${player.getPlayerName()}!`;
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
}
