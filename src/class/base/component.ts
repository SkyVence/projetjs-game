/**
 * Base contract for all components that can be attached to an entity.
 * Each component must expose a unique `type` identifier.
 */
export interface Component {
  /** Unique key used to register and look up this component. */
  readonly type: string;
}
