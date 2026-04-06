import "../index.css";

export type NavigateFunction = (path: string) => void;

export interface MenuViewCallbacks {
  onExit: () => void;
  onNewGame: (playerName: string) => void;
  onContinue: () => void;

  canContinue?: boolean;
}

export function MenuView(callbacks: MenuViewCallbacks): HTMLElement {
  const menuScreen = document.createElement("div");
  menuScreen.className = "menu-screen";

  const menuLeft = document.createElement("section");
  menuLeft.className = "menu-left";

  const menuRight = document.createElement("aside");
  menuRight.className = "menu-right";

  const menuNav = document.createElement("nav");
  menuNav.className = "menu-nav";

  const continueBtn = document.createElement("button");
  continueBtn.className = "menu-item";
  continueBtn.textContent = "Continue";
  continueBtn.disabled = !callbacks.canContinue;

  const newGameBtn = document.createElement("button");
  newGameBtn.className = "menu-item";
  newGameBtn.textContent = "New Game";

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

  menuNav.append(continueBtn, newGameWrap, exitBtn);
  menuLeft.append(menuNav);
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

  continueBtn.addEventListener("click", () => {
    callbacks.onContinue();
  });

  return menuScreen;
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
