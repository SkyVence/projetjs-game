import "../index.css";

const GameLogo = document.createElement("img");
GameLogo.src = "../src/assets/villain-dungeon-logo.png";
GameLogo.className = "game-logo";

const ContinueBtn = document.createElement("button");
ContinueBtn.className = "menu-item";
ContinueBtn.textContent = "Continue";

const NewGameBtn = document.createElement("button");
NewGameBtn.className = "menu-item";
NewGameBtn.textContent = "New Game";

const SettingsBtn = document.createElement("button");
SettingsBtn.className = "menu-item";
SettingsBtn.textContent = "Settings";

const CreditsBtn = document.createElement("button");
CreditsBtn.className = "menu-item";
CreditsBtn.textContent = "Credits";

const ExitBtn = document.createElement("button");
ExitBtn.className = "menu-item";
ExitBtn.textContent = "Exit";

const ExitTitle = document.createElement("h2");
ExitTitle.className = "exit-title";
ExitTitle.textContent = "Goodbye !";

export {
  ContinueBtn,
  NewGameBtn,
  SettingsBtn,
  ExitBtn,
  GameLogo,
  CreditsBtn,
  ExitTitle,
};
