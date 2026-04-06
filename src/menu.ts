import "../index.css";
import type { SlotViewModel } from "@/data";

export interface ContinuePreview {
  name: string;
  level: number;
  layer: number;
  savedAt?: number;
}

export interface MenuViewCallbacks {
  onExit: () => void;
  onNewGame: (playerName: string) => void;
  onContinue: () => void;
  onCredits?: () => void;

  canContinue?: boolean;
  continuePreview?: ContinuePreview | null;
  loadingContinuePreview?: boolean;
}

export interface SlotListCallbacks {
  slots: SlotViewModel[];
  isLoading: boolean;
  onSelectSlot: (slotId: string) => void;
  onBack: () => void;
}

export function MenuView(callbacks: MenuViewCallbacks): HTMLElement {
  const menuScreen = document.createElement("div");
  menuScreen.className = "menu-screen";

  const menuLeft = document.createElement("section");
  menuLeft.className = "menu-left";

  const menuRight = document.createElement("aside");
  menuRight.className = "menu-right";

  const logoFrame = document.createElement("div");
  logoFrame.className = "logo-frame";

  const gameLogo = document.createElement("h1");
  gameLogo.className = "game-logo";
  gameLogo.textContent = "VillainDungeon";

  const menuNav = document.createElement("nav");
  menuNav.className = "menu-nav";

  const continueBtn = document.createElement("button");
  continueBtn.className = "menu-item";
  continueBtn.textContent = "Continue";
  continueBtn.disabled = !callbacks.canContinue || !!callbacks.loadingContinuePreview;

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

  const savePreviewCard = document.createElement("section");
  savePreviewCard.className = "save-preview-card";

  const savePreviewTitle = document.createElement("h2");
  savePreviewTitle.className = "save-preview-title";
  savePreviewTitle.textContent = "Continue";

  const savePreviewBody = document.createElement("div");
  savePreviewBody.className = "save-preview-body";

  if (callbacks.loadingContinuePreview) {
    savePreviewBody.innerHTML = `
      <p class="save-preview-empty">Loading save data...</p>
    `;
  } else if (callbacks.continuePreview) {
    const preview = callbacks.continuePreview;
    savePreviewBody.innerHTML = `
      <p><strong>Name:</strong> ${preview.name}</p>
      <p><strong>Level:</strong> ${preview.level}</p>
      <p><strong>Layer:</strong> ${preview.layer}</p>
    `;
  } else {
    savePreviewBody.innerHTML = `<p class="save-preview-empty">No save available.</p>`;
  }

  savePreviewCard.append(savePreviewTitle, savePreviewBody);

  logoFrame.appendChild(gameLogo);
  menuNav.append(continueBtn, newGameWrap, settingsBtn, creditsBtn, exitBtn);

  menuLeft.append(logoFrame, menuNav);
  menuRight.appendChild(savePreviewCard);
  menuScreen.append(menuLeft, menuRight);

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

  creditsBtn.addEventListener("click", () => {
    callbacks.onCredits?.();
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
  header.textContent = "Select Save Slot";

  const slotList = document.createElement("div");
  slotList.className = "slot-list";

  if (callbacks.isLoading) {
    const loadingMsg = document.createElement("p");
    loadingMsg.className = "slot-list-loading";
    loadingMsg.textContent = "Loading saves...";
    slotList.appendChild(loadingMsg);
  } else {
    for (const slot of callbacks.slots) {
      const slotItem = document.createElement("button");
      slotItem.className = `slot-item${slot.isEmpty ? " empty" : ""}`;

      if (slot.isEmpty) {
        slotItem.textContent = `Empty Slot ${slot.id.replace("slot-", "")}`;
        slotItem.disabled = true;
      } else {
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

        slotItem.addEventListener("click", () => {
          callbacks.onSelectSlot(slot.id);
        });
      }

      slotList.appendChild(slotItem);
    }
  }

  const backBtn = document.createElement("button");
  backBtn.className = "slot-list-back";
  backBtn.textContent = "Back";
  backBtn.addEventListener("click", () => {
    callbacks.onBack();
  });

  container.append(header, slotList, backBtn);
  return container;
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
