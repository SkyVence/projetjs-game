type View = () => HTMLElement;
type ViewWithCleanup = View & { _cleanup?: () => void };
export type TitleGetter = string | (() => string);

interface RouteConfig {
  view: ViewWithCleanup;
  title?: TitleGetter;
  cleanup?: () => void;
}

let routes: Record<string, RouteConfig> = {};
let dynamicTitleOverride: string | null = null;

let base: HTMLElement;
let currentCleanup: (() => void) | null = null;

const allowedPattern = new RegExp("^/$|^/[A-Za-z0-9]+(/[A-Za-z0-9]+)*$");
const BASE_TITLE = "Villain Dungeon";

function NotFound(): HTMLElement {
  const div = document.createElement("div");
  div.setAttribute("class", "not-found");
  div.textContent = "404 - Not Found";
  return div;
}

function getTitle(title: TitleGetter | undefined): string {
  if (!title) return "";
  return typeof title === "function" ? title() : title;
}

export function updatePageTitle(path?: string): void {
  const currentPath = path || window.location.pathname;
  const route = routes[currentPath];

  let pageTitle: string;
  if (dynamicTitleOverride) {
    pageTitle = dynamicTitleOverride;
  } else if (route?.title) {
    pageTitle = getTitle(route.title);
  } else {
    pageTitle = "";
  }

  document.title = pageTitle ? `${BASE_TITLE} | ${pageTitle}` : BASE_TITLE;
}

export function setDynamicTitle(title: string | null): void {
  dynamicTitleOverride = title;
  updatePageTitle();
}

export function registerRoute(
  path: string,
  view: ViewWithCleanup,
  title?: TitleGetter,
  cleanup?: () => void,
) {
  if (!allowedPattern.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  routes[path] = { view, title, cleanup };
  if (cleanup) {
    view._cleanup = cleanup;
  }
}

export function registerRoutes(
  routeMap: Record<string, ViewWithCleanup>,
  titleMap?: Record<string, TitleGetter>,
  cleanupMap?: Record<string, () => void>,
) {
  for (const [path, view] of Object.entries(routeMap)) {
    const title = titleMap?.[path];
    const cleanup = cleanupMap?.[path];
    registerRoute(path, view, title, cleanup);
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

  const route = routes[path];
  if (!route) {
    base.innerHTML = "";
    base.appendChild(NotFound());
    throw new Error(`No route found for path: ${path}`);
  }

  base.innerHTML = "";
  base.appendChild(route.view());

  if (route.cleanup) {
    currentCleanup = route.cleanup;
  }

  // Update page title after rendering
  updatePageTitle(path);
}

export function startRouter(root: HTMLElement | null) {
  if (!root) throw new Error("Root element is null");
  base = root;
  let currentPath = window.location.pathname;

  handleRouteChange(currentPath);
}

function handleRouteChange(path: string) {
  const route = routes[path];
  if (!route) {
    renderView(path);
    return;
  }

  renderView(path);
}

export function navigateTo(path: string) {
  if (!allowedPattern.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }

  // Clear dynamic title override when navigating
  dynamicTitleOverride = null;

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
  dynamicTitleOverride = null;
}
