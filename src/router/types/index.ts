export interface Route {
  path: RegExp;
  view: new (params?: Record<string, string>) => View;
}

export interface View {
  mount(root: HTMLElement): void;
  unmount(): void;
}
