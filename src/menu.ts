// Importer le CSS ici :

import "../menu.css";

// Les boutons sont à coder ici :

const ContinueBtn = document.createElement("button");
ContinueBtn.className = "box-button";
ContinueBtn.innerHTML = "<span>Continue Game</span>";

const NewGameBtn = document.createElement("button");
NewGameBtn.className = "box-button";
NewGameBtn.innerHTML = "<span>New Game</span>";

const SettingsBtn = document.createElement("button");
SettingsBtn.className = "box-button";
SettingsBtn.innerHTML = "<span>Settings</span>";

const ExitBtn = document.createElement("button");
ExitBtn.className = "box-button";
ExitBtn.innerHTML = "<span>Exit</span>";

// Les titres sont à coder ici :

const GameTitle = document.createElement("h1");
GameTitle.textContent = "VillainDungeon";

// Les paragraphes sont à coder ici :

const PatchNote = document.createElement("p");
PatchNote.textContent = "";

// Tous les exports sont à faire ici :

export { ContinueBtn, NewGameBtn, SettingsBtn, ExitBtn, GameTitle, PatchNote };
