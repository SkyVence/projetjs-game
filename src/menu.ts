// Importer le CSS ici :

import "../menu.css";

// Les images sont à coder ici :

const GameLogo = document.createElement("img");
GameLogo.src = "../src/assets/villain-dungeon-logo.png";
GameLogo.className = "game-logo";
Object.assign(GameLogo.style, {
  position: "absolute" as const,
  left: "600px",
  top: "100px",
  width: "min(700px, 50vw)",
  height: "auto",
  zIndex: "10",
});

// Les boutons sont à coder ici :

const ContinueBtn = document.createElement("button");
ContinueBtn.className = "box-button";
ContinueBtn.innerHTML = "<span>Continue Game</span>";
Object.assign(ContinueBtn.style, {
  position: "absolute" as const,
  left: "100px",
  top: "100px",
  minWidth: "clamp(150px, 20vw, 200px)",
  height: "60px",
});

const NewGameBtn = document.createElement("button");
NewGameBtn.className = "box-button";
NewGameBtn.innerHTML = "<span>New Game</span>";
Object.assign(NewGameBtn.style, {
  position: "absolute" as const,
  left: "100px",
  top: "200px",
  minWidth: "clamp(150px, 20vw, 200px)",
  height: "60px",
});

const SettingsBtn = document.createElement("button");
SettingsBtn.className = "box-button";
SettingsBtn.innerHTML = "<span>Settings</span>";
Object.assign(SettingsBtn.style, {
  position: "absolute" as const,
  left: "100px",
  top: "300px",
  minWidth: "clamp(150px, 20vw, 200px)",
  height: "60px",
});

const CreditsBtn = document.createElement("button");
CreditsBtn.className = "box-button";
CreditsBtn.innerHTML = "<span>Credits</span>";
Object.assign(CreditsBtn.style, {
  position: "absolute" as const,
  left: "100px",
  top: "400px",
  minWidth: "clamp(150px, 20vw, 200px)",
  height: "60px",
});

const ExitBtn = document.createElement("button");
ExitBtn.className = "box-button";
ExitBtn.innerHTML = "<span>Exit</span>";
Object.assign(ExitBtn.style, {
  position: "absolute" as const,
  left: "100px",
  top: "500px",
  minWidth: "clamp(150px, 20vw, 200px)",
  height: "60px",
});

// Les titres sont à coder ici :

// const GameTitle = document.createElement("h1");
// GameTitle.textContent = "VillainDungeon";

const ExitTitle = document.createElement("h2");
ExitTitle.textContent = "Goodbye !";
ExitTitle.style.position = "absolute";
Object.assign(ExitTitle.style, {
  position: "absolute" as const,
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  fontSize: "3rem",
});

// Les paragraphes sont à coder ici :

const PatchNote = document.createElement("p");
PatchNote.textContent = "";

// Tous les exports sont à faire ici :

export {
  ContinueBtn,
  NewGameBtn,
  SettingsBtn,
  ExitBtn,
  // GameTitle,
  PatchNote,
  GameLogo,
  CreditsBtn,
  ExitTitle,
};
