import { MapGenerator } from "@/utils/MapGen";
import { MapRenderer } from "@/utils/MapRenderer";

const app = document.getElementById("app");

if (app) {
  // Générer et afficher la map immédiatement
  app.textContent = "";

  const canvas = document.createElement("canvas");
  app.appendChild(canvas);

  const generator = new MapGenerator({ width: 80, height: 50, maxDepth: 4 });
  const map = generator.generate();

  const renderer = new MapRenderer(canvas, { tileSize: 16 });
  renderer.render(map);
}
