export interface ErrorScreenCallbacks {
  message: string;
  onRetry: () => void;
}

export function ErrorScreen(callbacks: ErrorScreenCallbacks): HTMLElement {
  const container = document.createElement("div");
  container.className = "error-screen";

  const icon = document.createElement("div");
  icon.className = "error-icon";
  icon.textContent = "⚠";

  const title = document.createElement("h2");
  title.className = "error-title";
  title.textContent = "Error";

  const message = document.createElement("p");
  message.className = "error-message";
  message.textContent = callbacks.message;

  const retryBtn = document.createElement("button");
  retryBtn.className = "error-retry-btn";
  retryBtn.textContent = "Retry";
  retryBtn.addEventListener("click", () => {
    callbacks.onRetry();
  });

  container.append(icon, title, message, retryBtn);
  return container;
}
