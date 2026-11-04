/** Format affiché d'une image : le format courant le plus proche de ses dimensions réelles (640 × 480 → 4:3, jamais 16:9). */
const RATIOS: [string, number][] = [["16:9", 16 / 9], ["3:2", 3 / 2], ["4:3", 4 / 3], ["1:1", 1], ["4:5", 4 / 5], ["3:4", 3 / 4], ["2:3", 2 / 3], ["9:16", 9 / 16]];
export function aspectLabel(width: number, height: number): string | null {
  if (!(width > 0 && height > 0)) return null;
  const r = Math.log(width / height);
  return RATIOS.reduce((best, cur) => (Math.abs(Math.log(cur[1]) - r) < Math.abs(Math.log(best[1]) - r) ? cur : best))[0];
}
