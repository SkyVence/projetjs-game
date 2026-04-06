import { navigateTo } from "../router";

export function CreditsRoute(): HTMLElement {
  const container = document.createElement("div");
  container.className = "credits-screen";

  const title = document.createElement("h1");
  title.textContent = "Credits";
  title.className = "credits-title";

  const content = document.createElement("div");
  content.className = "credits-content";
  content.innerHTML = `
    <p>VillainDungeon</p>
    <p>A dungeon crawler game</p>
    <p>Built with TypeScript and Vite</p>
  `;

  const backBtn = document.createElement("button");
  backBtn.className = "menu-item";
  backBtn.textContent = "Back to Menu";
  backBtn.addEventListener("click", () => {
    navigateTo("/");
  });

  container.append(title, content, backBtn);
  return container;
}
