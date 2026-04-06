import { GameScene } from "@/systems/GameScene";
import { gameState, gameDataService } from "@/data";
import { navigateTo } from "../router";

let gameScene: GameScene | null = null;
let gameEscapeHandler: ((e: KeyboardEvent) => void) | null = null;

function cleanupGame(): void {
  if (gameEscapeHandler) {
    window.removeEventListener("keydown", gameEscapeHandler);
    gameEscapeHandler = null;
  }

  gameScene?.destroy();
  gameScene = null;
}

export function createGameRoute(): HTMLElement {
  cleanupGame();

  // Check if we have a player
  if (!gameState.player) {
    navigateTo("/");
    return document.createElement("div");
  }

  const wrapper = document.createElement("div");
  wrapper.className = "game-wrapper";

  // Top meta bar (always visible, sticky)
  const metaBar = document.createElement("div");
  metaBar.className = "game-meta-bar";
  metaBar.id = "game-meta-bar";
  wrapper.appendChild(metaBar);

  // Main game area container
  const gameArea = document.createElement("div");
  gameArea.className = "game-area";

  // Canvas container
  const container = document.createElement("div");
  container.className = "game-container";
  gameArea.appendChild(container);

  // Bottom UI panel (responsive - hidden on small screens)
  const uiPanel = document.createElement("div");
  uiPanel.className = "game-ui-panel";
  uiPanel.id = "game-ui-panel";
  
  // Single compact row: HP | Stats | XP
  const uiRow = document.createElement("div");
  uiRow.className = "game-ui-row";

  const hpSection = document.createElement("div");
  hpSection.className = "game-ui-section hp-section";
  hpSection.innerHTML = `
    <span class="game-ui-label">PV</span>
    <div class="game-ui-bar">
      <div class="game-ui-fill hp-fill" id="ui-hp-fill"></div>
    </div>
    <span class="game-ui-value" id="ui-hp-text">--/--</span>
  `;

  const statsSection = document.createElement("div");
  statsSection.className = "game-ui-section stats-section";
  statsSection.innerHTML = `
    <div class="game-stat"><span class="stat-label">ATQ</span><span class="stat-value" id="ui-atk">--</span></div>
    <div class="game-stat"><span class="stat-label">DEF</span><span class="stat-value" id="ui-def">--</span></div>
    <div class="game-stat"><span class="stat-label">VIT</span><span class="stat-value" id="ui-spd">--</span></div>
  `;

  const xpSection = document.createElement("div");
  xpSection.className = "game-ui-section xp-section";
  xpSection.innerHTML = `
    <span class="game-ui-label">XP</span>
    <span class="game-ui-value" id="ui-xp-text">Niv -- (--%)</span>
  `;

  uiRow.appendChild(hpSection);
  uiRow.appendChild(statsSection);
  uiRow.appendChild(xpSection);
  
  // Close button for drawer mode (only visible on small screens)
  const closeBtn = document.createElement("button");
  closeBtn.className = "game-ui-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Fermer");
  closeBtn.addEventListener("click", () => {
    uiPanel.classList.remove("drawer-open");
  });
  
  uiPanel.appendChild(uiRow);
  uiPanel.appendChild(closeBtn);
  gameArea.appendChild(uiPanel);

  // Toggle button for small screens
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "game-ui-toggle";
  toggleBtn.id = "game-ui-toggle";
  toggleBtn.textContent = "Stats";
  toggleBtn.addEventListener("click", () => {
    uiPanel.classList.toggle("drawer-open");
  });
  gameArea.appendChild(toggleBtn);

  // Close drawer when clicking outside
  uiPanel.addEventListener("click", (e) => {
    if (e.target === uiPanel) {
      uiPanel.classList.remove("drawer-open");
    }
  });

  wrapper.appendChild(gameArea);

  gameScene = new GameScene(container, {
    mapWidth: 40 * 48,
    mapHeight: 40 * 48,
    aspectRatio: 16 / 9,
  });

  gameScene.setPlayer(gameState.player);
  gameScene.setDungeonLevel(gameState.dungeonLevel);

  requestAnimationFrame(() => {
    if (!wrapper.isConnected || !gameScene) return;
    gameScene.initialize();
  });

  gameEscapeHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      // Close drawer if open
      if (uiPanel.classList.contains("drawer-open")) {
        uiPanel.classList.remove("drawer-open");
        return;
      }
      // Save dungeon level before leaving
      if (gameScene) {
        gameDataService.setDungeonLevel(gameScene.getDungeonLevel());
      }
      navigateTo("/");
    }
  };

  window.addEventListener("keydown", gameEscapeHandler);

  return wrapper;
}

export function cleanupGameRoute(): void {
  cleanupGame();
}
