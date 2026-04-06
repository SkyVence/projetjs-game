import { MenuView, SlotListView, type ContinuePreview } from "@/menu";
import { gameState, gameDataService } from "@/data";
import { navigateTo } from "../router";

let unsubscribe: (() => void) | null = null;
let menuElementRef: HTMLElement | null = null;

/**
 * Updates the preview card in the menu when state changes.
 * This is called by the subscription callback.
 */
function updateMenuPreview(): void {
  if (!menuElementRef) return;

  // Find the preview body element and update it
  const previewBody = menuElementRef.querySelector(".save-preview-body");
  if (!previewBody) return;

  if (gameState.isLoading && gameState.slots.length === 0) {
    previewBody.innerHTML = `<p class="save-preview-empty">Loading save data...</p>`;
  } else if (gameState.player) {
    const preview = {
      name: gameState.player.getPlayerName(),
      level: gameState.player.stats.level,
      layer: gameState.dungeonLevel,
    };
    previewBody.innerHTML = `
      <p><strong>Name:</strong> ${preview.name}</p>
      <p><strong>Level:</strong> ${preview.level}</p>
      <p><strong>Layer:</strong> ${preview.layer}</p>
    `;
  } else if (gameState.canContinue) {
    // Show that saves exist but no current player loaded
    const latestSlot = gameState.slots[0];
    if (latestSlot) {
      previewBody.innerHTML = `
        <p><strong>Name:</strong> ${latestSlot.player.name}</p>
        <p><strong>Level:</strong> ${latestSlot.player.stats.level}</p>
        <p><strong>Layer:</strong> ${latestSlot.dungeonLevel}</p>
      `;
    }
  } else {
    previewBody.innerHTML = `<p class="save-preview-empty">No save available.</p>`;
  }

  // Update the Continue button state
  const continueBtn = menuElementRef.querySelector(".menu-item") as HTMLButtonElement | null;
  if (continueBtn && continueBtn.textContent === "Continue") {
    continueBtn.disabled = !gameState.canContinue || gameState.isLoading;
  }
}

export function MenuRoute(): HTMLElement {
  // Subscribe to state changes for reactive preview updates
  // This updates the preview card without triggering navigation
  if (!unsubscribe) {
    unsubscribe = gameDataService.subscribe(() => {
      updateMenuPreview();
    });
  }

  // Refresh slots every time menu opens (user requirement #2)
  // This ensures we always have fresh data
  gameDataService.refreshSlots();

  // Build preview from current player if exists
  const currentPreview = gameState.player
    ? ({
        name: gameState.player.getPlayerName(),
        level: gameState.player.stats.level,
        layer: gameState.dungeonLevel,
        savedAt: Date.now(),
      } as ContinuePreview)
    : null;

  const menuElement = MenuView({
    onExit: () => {
      navigateTo("/exit");
    },
    onNewGame: async (playerName: string) => {
      const slotId = await gameDataService.startNewGame(playerName);
      if (slotId) {
        navigateTo("/game");
      }
    },
    onContinue: () => {
      // Show slot selection
      const app = document.getElementById("app");
      if (!app) return;

      app.innerHTML = "";
      app.appendChild(
        SlotListView({
          slots: gameState.getSlotViewModels(),
          isLoading: gameState.isLoading,
          onSelectSlot: async (slotId: string) => {
            const success = await gameDataService.loadGame(slotId);
            if (success) {
              navigateTo("/game");
            }
          },
          onBack: () => {
            navigateTo("/");
          },
        })
      );
    },
    onCredits: () => {
      navigateTo("/credits");
    },
    onSettings: () => {
      navigateTo("/settings");
    },
    canContinue: gameState.canContinue,
    continuePreview: currentPreview,
    loadingContinuePreview: gameState.isLoading && gameState.slots.length === 0,
  });

  // Store reference for subscription updates
  menuElementRef = menuElement;

  return menuElement;
}

export function cleanupMenuRoute(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  menuElementRef = null;
}
