import type { View } from "@/router/types";
import { GameScene } from "@/systems/GameScene";

export class LevelView implements View {
  private params: Record<string, string>;
  private gameScene: GameScene | null = null;

  constructor(params: Record<string, string> = {}) {
    this.params = params;
  }

  mount(root: HTMLElement) {
    const { id } = this.params;

    // Create a container for the game
    const gameContainer = document.createElement("div");
    gameContainer.style.width = "100%";
    gameContainer.style.height = "100vh";
    gameContainer.style.display = "flex";
    gameContainer.style.flexDirection = "column";
    gameContainer.style.alignItems = "center";
    gameContainer.style.justifyContent = "center";
    gameContainer.style.backgroundColor = "#000";

    root.appendChild(gameContainer);

    // Initialize game scene (800x600 viewport, 2400x2400 map)
    this.gameScene = new GameScene(gameContainer, {
      viewportWidth: 800,
      viewportHeight: 600,
      mapWidth: 2400,
      mapHeight: 2400,
    });

    this.gameScene.initialize();

    console.log(`Level ${id} loaded — game scene running`);
  }

  unmount() {
    if (this.gameScene) {
      this.gameScene.destroy();
      this.gameScene = null;
    }
    console.log(`Leaving Level ${this.params.id} view — game scene cleaned up`);
  }
}
