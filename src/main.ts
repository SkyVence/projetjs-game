import {
  ContinueBtn,
  NewGameBtn,
  SettingsBtn,
  ExitBtn,
  GameTitle,
  PatchNote,
} from "@/menu";

const app = document.getElementById("app");
if (app) {
  app.textContent = "Game loading...";
  app.appendChild(GameTitle);
  app.appendChild(PatchNote);
  app.appendChild(ContinueBtn);
  app.appendChild(NewGameBtn);
  app.appendChild(SettingsBtn);
  app.appendChild(ExitBtn);
}
