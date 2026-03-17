import type { Route, View } from "@/router/types"

export class Router {
  private routes: Route[]
  private rootElement: HTMLElement
  private currentView: View | null = null


  constructor(routes: Route[], rootSelector: string) {
    this.routes = routes
    const root = document.querySelector(rootSelector);
    if (!root) throw Error("Root container not found");
    this.rootElement = root as HTMLElement;

    window.addEventListener("popstate", () => this.handleLocation());
  }

  private matchRoute(path: string): { route: Route; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const match = path.match(route.path);
      if (match) {
        const params = match.groups || {};
        return { route, params };
      }
    }
    return null; // Could throw error maybe ?
  }

  async handleLocation() {
    const path = window.location.pathname;
    const match = this.matchRoute(path);
    if (!match) {
      this.rootElement.innerHTML = "<h1>404 - Not Found</h1>";
      return;
    }

    this.currentView?.unmount?.();

    const { route, params } = match;
    const view = new route.view(params);
    this.currentView = view;
    view.mount(this.rootElement);
  }

  navigate(path: string): void {
    history.pushState({}, "", path);
    this.handleLocation();
  }

  enableLinks(): void {
    document.body.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest("a[data-link]");
      if (target && target instanceof HTMLAnchorElement) {
        e.preventDefault();
        this.navigate(target.getAttribute("href")!);
      }
    });
  }
}
