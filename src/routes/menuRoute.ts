import { MenuView, SlotListView, NewGameDialog } from "@/menu";
import { gameState, gameDataService } from "@/data";
import { navigateTo, setDynamicTitle } from "../router";

let unsubscribe: (() => void) | null = null;
let menuElementRef: HTMLElement | null = null;

/**
 * Updates the Continue button state when slots load.
 * This is called by the subscription callback.
 */
function updateContinueButton(): void {
  if (!menuElementRef) return;

  // Update the Select a save button state
  const continueBtn = menuElementRef.querySelector(".menu-item") as HTMLButtonElement | null;
  if (continueBtn && continueBtn.textContent === "Select a save") {
    continueBtn.disabled = !gameState.canContinue || gameState.isLoading;
  }
}

export function MenuRoute(): HTMLElement {
  // Subscribe to state changes for reactive updates
  if (!unsubscribe) {
    unsubscribe = gameDataService.subscribe(() => {
      updateContinueButton();
    });
  }

  // Refresh slots every time menu opens
  // This ensures we always have fresh data
  gameDataService.refreshSlots();

  const menuElement = MenuView({
    onExit: () => {
      navigateTo("/exit");
    },
    onNewGame: async (playerName: string) => {
      // Clear last run stats when starting a new game
      gameState.clearLastRunStats();
      const slotId = await gameDataService.startNewGame(playerName);
      if (slotId) {
        navigateTo("/game");
      }
    },
    onContinue: () => {
      // Show slot selection
      const app = document.getElementById("app");
      if (!app) return;

      renderSlotSelection(app);
    },
    canContinue: gameState.canContinue,
    lastRunStats: gameState.lastRunStats,
  });

  // Store reference for subscription updates
  menuElementRef = menuElement;

  return menuElement;
}

function renderSlotSelection(app: HTMLElement): void {
  // Update page title for slot selection view
  setDynamicTitle("Select Save");

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
      onDeleteSlot: async (slotId: string) => {
        const slot = gameState.slots.find((s) => s.id === slotId);
        const playerName = slot?.player.name || "this save";

        if (confirm(`Are you sure you want to delete "${playerName}"? This action cannot be undone.`)) {
          const success = await gameDataService.deleteSlot(slotId);
          if (success) {
            // Re-render slot selection after deletion
            renderSlotSelection(app);
          }
        }
      },
      onNewGame: () => {
        // Show new game dialog
        const dialog = NewGameDialog({
          onConfirm: async (playerName: string) => {
            const slotId = await gameDataService.startNewGame(playerName);
            if (slotId) {
              navigateTo("/game");
            }
          },
          onCancel: () => {
            // Close dialog and re-render slot selection
            renderSlotSelection(app);
          },
        });
        app.innerHTML = "";
        app.appendChild(dialog);
      },
      onBack: () => {
        navigateTo("/");
      },
    })
  );
}

export function cleanupMenuRoute(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  menuElementRef = null;
}
