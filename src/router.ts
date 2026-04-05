type View = () => HTMLElement;

let routes: Record<string, View> = {};

let base: HTMLElement;

const allowedPattern = new RegExp("^/$|^/[A-Za-z0-9]+(/[A-Za-z0-9]+)*$"); // Check if the path is valid

function NotFound(): HTMLElement {
  const div = document.createElement("div");
  div.setAttribute("class", "not-found");
  div.textContent = "404 - Not Found";
  return div;
}

export function registerRoute(path: string, view: View) {
  if (!allowedPattern.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  routes[path] = view;
}

function renderView(view: View) {
  base.innerHTML = "";
  base.appendChild(view());
}

export function startRouter(root: HTMLElement | null) {
  if (!root) throw new Error("Root element is null");
  base = root;
  let currentPath = window.location.pathname;

  const view = routes[currentPath];
  if (!view) {
    renderView(NotFound);
    throw new Error(`No route found for path: ${currentPath}`);
  }

  renderView(view);
}

export function navigateTo(path: string) {
  if (!allowedPattern.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const view = routes[path];
  window.history.pushState({}, "", path);
  if (!view) {
    renderView(NotFound);
    throw new Error(`No route found for path: ${path}`);
  }
  renderView(view);
}

window.addEventListener("popstate", () => {
  const currentPath = window.location.pathname;
  const view = routes[currentPath];
  if (!view) {
    renderView(NotFound);
    throw new Error(`No route found for path: ${currentPath}`);
  }
  renderView(view);
});
