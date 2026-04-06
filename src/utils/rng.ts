/**
 * Seeded Random Number Generator
 * Uses Linear Congruential Generator (LCG) algorithm
 * Same algorithm as MapGen for consistency
 */
export class SeededRNG {
  constructor(private seed: number) {}

  /**
   * Get next random integer from the sequence
   */
  next(): number {
    this.seed = (this.seed * 1_664_525 + 1_013_904_223) & 0xffffffff;
    return Math.abs(this.seed);
  }

  /**
   * Get random float between 0 and 1
   */
  random(): number {
    return this.next() / 0xffffffff;
  }

  /**
   * Get random integer between min and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    return min + (this.next() % (max - min + 1));
  }

  /**
   * Test if a random chance succeeds (probability between 0 and 1)
   */
  chance(probability: number): boolean {
    return this.random() < probability;
  }
}
