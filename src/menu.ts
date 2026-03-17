// Les boutons sont à coder ici :

const ContinueBtn = document.createElement("button");
ContinueBtn.textContent = "Continue Game";

const NewGameBtn = document.createElement("button");
NewGameBtn.textContent = "New Game";

const SettingsBtn = document.createElement("button");
SettingsBtn.textContent = "Settings";

const ExitBtn = document.createElement("button");
ExitBtn.textContent = "Exit";

// Les titres sont à coder ici :

const GameTitle = document.createElement("h1");
GameTitle.textContent = "VillainDungeon";

const PatchNote = document.createElement("p");
PatchNote.textContent = "";

// Tous les exports sont à faire ici :

export { ContinueBtn, NewGameBtn, SettingsBtn, ExitBtn, GameTitle, PatchNote };
