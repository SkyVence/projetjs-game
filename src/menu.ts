import "../index.css";
import type { SlotViewModel } from "@/data";

export interface MenuViewCallbacks {
  onExit: () => void;
  onNewGame: (playerName: string) => void;
  onContinue: () => void;

  canContinue?: boolean;
}

export interface SlotListCallbacks {
  slots: SlotViewModel[];
  isLoading: boolean;
  onSelectSlot: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onNewGame: () => void;
  onBack: () => void;
}

export function MenuView(callbacks: MenuViewCallbacks): HTMLElement {
  const menuScreen = document.createElement("div");
  menuScreen.className = "menu-screen";

  const menuLeft = document.createElement("section");
  menuLeft.className = "menu-left";

  const logoFrame = document.createElement("div");
  logoFrame.className = "logo-frame";

  const gameLogo = document.createElement("h1");
  gameLogo.className = "game-logo";
  gameLogo.textContent = "VillainDungeon";

  const menuNav = document.createElement("nav");
  menuNav.className = "menu-nav";

  const continueBtn = document.createElement("button");
  continueBtn.className = "menu-item";
  continueBtn.textContent = "Select a save";
  continueBtn.disabled = !callbacks.canContinue;

  const newGameBtn = document.createElement("button");
  newGameBtn.className = "menu-item";
  newGameBtn.textContent = "New Game";

  const settingsBtn = document.createElement("button");
  settingsBtn.className = "menu-item";
  settingsBtn.textContent = "Settings";

  const creditsBtn = document.createElement("button");
  creditsBtn.className = "menu-item";
  creditsBtn.textContent = "Credits";

  const exitBtn = document.createElement("button");
  exitBtn.className = "menu-item";
  exitBtn.textContent = "Exit";

  const playerNameInput = document.createElement("input");
  playerNameInput.id = "playerName";
  playerNameInput.type = "text";
  playerNameInput.placeholder = "Enter your name";
  playerNameInput.className = "player-name-input";
  playerNameInput.hidden = true;

  const newGameWrap = document.createElement("div");
  newGameWrap.className = "new-game-wrap";
  newGameWrap.append(newGameBtn, playerNameInput);

  logoFrame.appendChild(gameLogo);
  menuNav.append(continueBtn, newGameWrap, exitBtn);

  menuLeft.append(logoFrame, menuNav);
  menuScreen.append(menuLeft);

  exitBtn.addEventListener("click", () => {
    if (confirm("Quitter VillainDungeon ?")) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      callbacks.onExit();
    }
  });

  newGameBtn.addEventListener("click", () => {
    playerNameInput.hidden = !playerNameInput.hidden;
    if (!playerNameInput.hidden) {
      playerNameInput.focus();
    }
  });

  playerNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const playerNameValue = playerNameInput.value.trim();
      if (playerNameValue) {
        callbacks.onNewGame(playerNameValue);
      }
    }
  });

  continueBtn.addEventListener("click", () => {
    callbacks.onContinue();
  });

  settingsBtn.addEventListener("click", () => {
    // Settings route is handled by the app router when available.
  });

  return menuScreen;
}

export function SlotListView(callbacks: SlotListCallbacks): HTMLElement {
  const container = document.createElement("div");
  container.className = "slot-list-screen";

  const header = document.createElement("h2");
  header.className = "slot-list-header";
  header.textContent = "Select Save";

  const scrollContainer = document.createElement("div");
  scrollContainer.className = "slot-list-scroll";

  const slotList = document.createElement("div");
  slotList.className = "slot-list";

  if (callbacks.isLoading) {
    const loadingMsg = document.createElement("p");
    loadingMsg.className = "slot-list-loading";
    loadingMsg.textContent = "Loading saves...";
    slotList.appendChild(loadingMsg);
  } else {
    // Show existing saves
    for (const slot of callbacks.slots) {
      const slotItem = document.createElement("div");
      slotItem.className = "slot-item";

      const infoDiv = document.createElement("div");
      infoDiv.className = "slot-info";

      const nameSpan = document.createElement("span");
      nameSpan.className = "slot-name";
      nameSpan.textContent = slot.name || "Unknown";

      const detailsSpan = document.createElement("span");
      detailsSpan.className = "slot-details";
      detailsSpan.textContent = `Level ${slot.level} | Floor ${slot.dungeonLevel}`;

      infoDiv.append(nameSpan, detailsSpan);
      slotItem.appendChild(infoDiv);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "slot-delete-btn";
      deleteBtn.textContent = "×";
      deleteBtn.title = "Delete save";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onDeleteSlot(slot.id);
      });
      slotItem.appendChild(deleteBtn);

      // Click on slot to select it
      slotItem.addEventListener("click", () => {
        callbacks.onSelectSlot(slot.id);
      });

      slotList.appendChild(slotItem);
    }

    // Add "New Game +" button
    const newGameBtn = document.createElement("button");
    newGameBtn.className = "slot-item new-game-slot";
    newGameBtn.innerHTML = `
      <div class="slot-info">
        <span class="slot-name">+ New Game</span>
        <span class="slot-details">Create a new adventure</span>
      </div>
    `;
    newGameBtn.addEventListener("click", () => {
      callbacks.onNewGame();
    });
    slotList.appendChild(newGameBtn);
  }

  scrollContainer.appendChild(slotList);

  const backBtn = document.createElement("button");
  backBtn.className = "slot-list-back";
  backBtn.textContent = "Back";
  backBtn.addEventListener("click", () => {
    callbacks.onBack();
  });

  container.append(header, scrollContainer, backBtn);
  return container;
}

export function NewGameDialog(callbacks: {
  onConfirm: (playerName: string) => void;
  onCancel: () => void;
}): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "new-game-dialog-overlay";

  const dialog = document.createElement("div");
  dialog.className = "new-game-dialog";

  const title = document.createElement("h3");
  title.className = "new-game-dialog-title";
  title.textContent = "New Adventure";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter your hero's name";
  input.className = "new-game-dialog-input";

  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "new-game-dialog-buttons";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "new-game-dialog-btn cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    callbacks.onCancel();
  });

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "new-game-dialog-btn confirm";
  confirmBtn.textContent = "Start";
  confirmBtn.addEventListener("click", () => {
    const name = input.value.trim();
    if (name) {
      callbacks.onConfirm(name);
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const name = input.value.trim();
      if (name) {
        callbacks.onConfirm(name);
      }
    }
  });

  buttonsDiv.append(cancelBtn, confirmBtn);
  dialog.append(title, input, buttonsDiv);
  overlay.appendChild(dialog);

  // Focus input after a short delay
  setTimeout(() => input.focus(), 100);

  return overlay;
}

export function ExitTitle(): HTMLElement {
  const exitTitle = document.createElement("h2");
  exitTitle.className = "exit-title";
  exitTitle.textContent = "Goodbye !";
  return exitTitle;
}

export function createContinueBtn(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "menu-item";
  btn.textContent = "Continue";
  return btn;
}

export function createNewGameBtn(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "menu-item";
  btn.textContent = "New Game";
  return btn;
}

export function createExitBtn(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "menu-item";
  btn.textContent = "Exit";
  return btn;
}

export function createExitTitle(): HTMLHeadingElement {
  const h2 = document.createElement("h2");
  h2.className = "exit-title";
  h2.textContent = "Goodbye !";
  return h2;
}
