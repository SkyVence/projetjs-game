import "../index.css";

export type NavigateFunction = (path: string) => void;

export interface MenuViewCallbacks {
  onExit: () => void;
  onNewGame: (playerName: string) => void;
  onCredits: () => void;
  onContinue: () => void;
  onSettings: () => void;
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

  const menuNav = document.createElement("nav");
  menuNav.className = "menu-nav";

  // Game Logo
  const gameLogo = document.createElement("img");
  gameLogo.src = "../src/assets/villain-dungeon-logo.png";
  gameLogo.className = "game-logo";

  // Menu Buttons
  const continueBtn = document.createElement("button");
  continueBtn.className = "menu-item";
  continueBtn.textContent = "Continue";

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

  // Player Name Input
  const playerNameInput = document.createElement("input");
  playerNameInput.id = "playerName";
  playerNameInput.type = "text";
  playerNameInput.placeholder = "Enter your name";
  playerNameInput.className = "player-name-input";
  playerNameInput.hidden = true;

  // Layout
  const newGameWrap = document.createElement("div");
  newGameWrap.className = "new-game-wrap";
  newGameWrap.append(newGameBtn, playerNameInput);

  logoFrame.appendChild(gameLogo);
  menuNav.append(continueBtn, newGameWrap, settingsBtn, creditsBtn, exitBtn);

  menuLeft.append(logoFrame, menuNav);
  menuScreen.append(menuLeft, menuRight);

  // Event Listeners
  exitBtn.addEventListener("click", () => {
    if (confirm("Quitter VillainDungeon ?")) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      callbacks.onExit();
    }
  });

  newGameBtn.addEventListener("click", () => {
    playerNameInput.hidden = false;
    playerNameInput.focus();
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
    callbacks.onCredits();
  });

  continueBtn.addEventListener("click", () => {
    callbacks.onContinue();
  });

  settingsBtn.addEventListener("click", () => {
    callbacks.onSettings();
  });

  return menuScreen;
}

export function ExitTitle(): HTMLElement {
  const exitTitle = document.createElement("h2");
  exitTitle.className = "exit-title";
  exitTitle.textContent = "Goodbye !";
  return exitTitle;
}

// Legacy exports for backward compatibility (creates fresh instances)
export function createGameLogo(): HTMLImageElement {
  const img = document.createElement("img");
  img.src = "../src/assets/villain-dungeon-logo.png";
  img.className = "game-logo";
  return img;
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

export function createSettingsBtn(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "menu-item";
  btn.textContent = "Settings";
  return btn;
}

export function createCreditsBtn(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "menu-item";
  btn.textContent = "Credits";
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
