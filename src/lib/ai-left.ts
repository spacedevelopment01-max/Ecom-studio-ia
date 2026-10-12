/** Part du budget IA encore disponible, en % : celle du forfait, puis celle des recharges une fois le forfait épuisé. */
export function aiLeftPct(ai: { plan: { used: number }; credits: { used: number } | null; paused: boolean }): number {
  if (ai.paused) return 0;
  if (ai.plan.used < 100) return 100 - ai.plan.used;
  return ai.credits ? 100 - ai.credits.used : 0;
}
