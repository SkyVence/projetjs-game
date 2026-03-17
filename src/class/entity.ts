import type { Component } from "@/class/base/component";
import { generateId } from "@/utils/generateId";

/**
 * Represents a game entity composed of typed components.
 * Provides helpers to register and query component instances.
 */
export class Entity {
  /** Unique identifier for the entity instance. */
  public id: string;
  /** Component map keyed by component type. */
  public components: Map<string, Component>;

  /**
   * Create a new entity with a random id.
   */
  constructor() {
    this.id = generateId();
    this.components = new Map<string, Component>();
  }

  /**
   * Add or replace a component on this entity.
   * @param component Component instance to attach.
   * @returns The current entity for chaining.
   */
  addComponent(component: Component) {
    this.components.set(component.type, component);
    return this;
  }

  /**
   * Retrieve a component by its type key.
   * @param type Component type identifier.
   * @returns The typed component if present, otherwise undefined.
   */
  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  /**
   * Check whether a component of the given type exists on this entity.
   * @param type Component type identifier.
   * @returns True if the component exists, otherwise false.
   */
  hasComponent(type: string): boolean {
    return this.components.has(type);
  }
}
