// import {
//   ContinueBtn,
//   NewGameBtn,
//   SettingsBtn,
//   ExitBtn,
//   GameTitle,
//   PatchNote,
// } from "@/menu";
// import { playerNameInput } from "@/input";
// import { Player } from "@/class/player";

// let player: Player;

// const app = document.getElementById("app");
// if (app) {
//   app.textContent = "Game loading...";
//   app.appendChild(GameTitle);
//   app.appendChild(PatchNote);
//   app.appendChild(ContinueBtn);
//   app.appendChild(NewGameBtn);
//   app.appendChild(SettingsBtn);
//   app.appendChild(ExitBtn);

//   // Attach directly to the imported element
//   NewGameBtn.addEventListener("click", () => {
//     if (!playerNameInput.isConnected) {
//       app.appendChild(playerNameInput);
//     }
//     playerNameInput.focus();
//   });

//   playerNameInput.addEventListener("keydown", (e) => {
//     if (e.key === "Enter") {
//       const playerNameValue = playerNameInput.value.trim();
//       if (playerNameValue) {
//         player = new Player(playerNameValue);
//         app.textContent = `Hello, ${player.getPlayerName()}!`;
//       }
//     }
//   });
// }

import { Router } from "@/router/class/router";
import { HomeView, LevelView } from "@/router/examples/";

const router = new Router(
  [
    { path: /^\/$/, view: HomeView },
    { path: /^\/level\/(?<id>\d+)$/, view: LevelView },
  ],
  "#app"
);

router.enableLinks();
router.handleLocation();
