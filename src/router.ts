type View = () => HTMLElement;
type ViewWithCleanup = View & { _cleanup?: () => void };

let routes: Record<string, ViewWithCleanup> = {};

let base: HTMLElement;
let currentCleanup: (() => void) | null = null;

const allowedPattern = new RegExp("^/$|^/[A-Za-z0-9]+(/[A-Za-z0-9]+)*$");

function NotFound(): HTMLElement {
  const div = document.createElement("div");
  div.setAttribute("class", "not-found");
  div.textContent = "404 - Not Found";
  return div;
}

export function registerRoute(
  path: string,
  view: ViewWithCleanup,
  cleanup?: () => void,
) {
  if (!allowedPattern.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  routes[path] = view;
  if (cleanup) {
    view._cleanup = cleanup;
  }
}

export function registerRoutes(
  routeMap: Record<string, ViewWithCleanup>,
  cleanupMap?: Record<string, () => void>,
) {
  for (const [path, view] of Object.entries(routeMap)) {
    const cleanup = cleanupMap?.[path];
    registerRoute(path, view, cleanup);
  }
}

function runCleanup() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
}

function renderView(path: string) {
  runCleanup();

  const view = routes[path];
  if (!view) {
    base.innerHTML = "";
    base.appendChild(NotFound());
    throw new Error(`No route found for path: ${path}`);
  }

  base.innerHTML = "";
  base.appendChild(view());

  if (view._cleanup) {
    currentCleanup = view._cleanup;
  }
}

export function startRouter(root: HTMLElement | null) {
  if (!root) throw new Error("Root element is null");
  base = root;
  let currentPath = window.location.pathname;

  handleRouteChange(currentPath);
}

function handleRouteChange(path: string) {
  const view = routes[path];
  if (!view) {
    renderView(path);
    return;
  }

  renderView(path);
}

export function navigateTo(path: string) {
  if (!allowedPattern.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }

  window.history.pushState({}, "", path);
  handleRouteChange(path);
}

window.addEventListener("popstate", () => {
  const currentPath = window.location.pathname;
  handleRouteChange(currentPath);
});

export function cleanup() {
  runCleanup();
  routes = {};
  currentCleanup = null;
}
