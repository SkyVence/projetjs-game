import type { Component } from "@/class/base/component";
import { generateId } from "@/utils/generateId";

export class Entity {
  public id: string;
  public components: Map<string, Component>;

  constructor() {
    this.id = generateId();
    this.components = new Map<string, Component>();
  }

  addComponent(component: Component) {
    this.components.set(component.type, component);
    return this;
  }

  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  hasComponent(type: string): boolean {
    return this.components.has(type);
  }
}
