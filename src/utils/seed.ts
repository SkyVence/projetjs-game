/**
 * Seed derivation utilities for dungeon level generation
 * Ensures deterministic, hierarchical seed generation for floor progression
 */

/**
 * Deterministically derive the next level's seed from the current level's seed.
 * This creates a chain of seeds where each floor's seed is derived from the previous,
 * ensuring consistent dungeon generation while maintaining per-floor uniqueness.
 *
 * @param currentSeed - The seed of the current level
 * @param nextLevel - The level number to derive seed for
 * @returns A deterministic seed for the next level
 */
export function deriveNextSeed(currentSeed: number, nextLevel: number): number {
  // Mix current seed with level number using a simple hash
  let hash = currentSeed;
  hash = ((hash << 5) - hash) + nextLevel;
  hash = hash & 0xffffffff;
  return Math.abs(hash);
}

/**
 * Generate an initial seed for a new game.
 * Uses current timestamp mixed with some entropy.
 */
export function generateInitialSeed(): number {
  return Date.now();
}
