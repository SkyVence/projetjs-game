import type { Route } from "@/router/types"

export class Router {
  private routes: Route[]

  constructor(routes: Route[]) {
    this.routes = routes
  }
}
