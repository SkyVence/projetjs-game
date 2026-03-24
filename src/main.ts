import {
  // GameTitle,
  PatchNote,
  ContinueBtn,
  NewGameBtn,
  SettingsBtn,
  ExitBtn,
  GameLogo,
  ExitTitle,
} from "@/menu";
import { playerNameInput } from "@/input";
import { Player } from "@/class/player";

let player: Player;

const app = document.getElementById("app");
if (app) {
  // app.appendChild(GameTitle);
  app.appendChild(GameLogo);
  app.appendChild(PatchNote);
  app.appendChild(ContinueBtn);
  app.appendChild(NewGameBtn);
  app.appendChild(SettingsBtn);
  app.appendChild(ExitBtn);

  // Bouton afin de quitter le jeu :

  ExitBtn.addEventListener("click", () => {
    if (confirm("Quitter VillainDungeon ?")) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      app.innerHTML = "";
      app.appendChild(ExitTitle);
    }
  });

  // Bouton afin de commencer une nouvelle partie :

  // Attach directly to the imported element
  NewGameBtn.addEventListener("click", () => {
    if (playerNameInput.isConnected) {
      playerNameInput.remove();
    } else {
      app.append(playerNameInput);
    }
    playerNameInput.focus();
  });

  // Bouton afin de valider le nom du joueur :

  playerNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const playerNameValue = playerNameInput.value.trim();
      if (playerNameValue) {
        player = new Player(playerNameValue);
        app.textContent = `Hello, ${player.getPlayerName()}!`;
      }
    }
  });
}

// import { Router } from "@/router/class/router";
// import { HomeView, LevelView } from "@/router/examples/";

// const router = new Router(
//   [
//     { path: /^\/$/, view: HomeView },
//     { path: /^\/level\/(?<id>\d+)$/, view: LevelView },
//   ],
//   "#app",
// );

// router.enableLinks();
// router.handleLocation();
