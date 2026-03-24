export function normalizeVector(dx: number, dy: number): { dx: number; dy: number } {
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) {
    return { dx: 0, dy: 0 };
  }
  
  return {
    dx: dx / length,
    dy: dy / length,
  };
}
