export function LoadingScreen(): HTMLElement {
  const container = document.createElement("div");
  container.className = "loading-screen";

  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";

  const text = document.createElement("p");
  text.className = "loading-text";
  text.textContent = "awaiting indexed db";

  container.append(spinner, text);
  return container;
}
