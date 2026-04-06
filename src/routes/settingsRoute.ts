import { navigateTo } from "../router";

export function SettingsRoute(): HTMLElement {
  const container = document.createElement("div");
  container.className = "settings-screen";

  const title = document.createElement("h1");
  title.textContent = "Settings";
  title.className = "settings-title";

  const content = document.createElement("div");
  content.className = "settings-content";
  content.innerHTML = `
    <p>Settings will be available soon.</p>
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
