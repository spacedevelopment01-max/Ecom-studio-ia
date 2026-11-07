/** Libellé d'une étape du parcours SINA (frise et page Pilote) : jamais « en cours » si rien n'a commencé. */
export type StepView = { n: number; status: "todo" | "doing" | "review" | "done" | "skipped"; ready?: boolean };
export function stepLabel(s: StepView, current: number, t: (fr: string, en: string) => string): string {
  if (s.status === "done") return t("validée", "approved");
  if (s.status === "doing") return t("en cours", "in progress");
  if (s.status === "review") return t("à valider", "to approve");
  if (s.status === "skipped") return t("sans objet", "not needed");
  if (s.n === current) return s.ready === false ? t("prochaine étape · bientôt disponible", "next step · coming soon") : t("prochaine étape", "next step");
  return t("à faire", "to do");
}
