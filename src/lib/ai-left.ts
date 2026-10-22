/** Part non consommée du budget, distincte du droit de lancer un appel (paused/pending). */
export function aiLeftPct(ai: { plan: { used: number }; credits: { used: number } | null; paused: boolean }): number {
  if (ai.plan.used < 100) return 100 - ai.plan.used;
  return ai.credits ? 100 - ai.credits.used : 0;
}
