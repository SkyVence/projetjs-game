import { PlayBtn } from "@/interface";

const app = document.getElementById("app");
if (app) {
  app.textContent = "Game loading...";
  app.appendChild(PlayBtn);
}
