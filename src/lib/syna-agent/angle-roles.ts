/**
 * Les trois angles montrés au client (décision du propriétaire du 14 novembre 2026 : « Ok pour 3 ») : un sûr, un
 * d'émotion, un audacieux. Module léger (aucune dépendance) : le parcours, la boucle et les outils le lisent.
 */
import type { SinaAngle, SinaAngles } from "./angles";

export type AngleRole = "sur" | "emotion" | "audacieux";
export const ANGLE_ROLE_LABEL: Record<AngleRole, { fr: string; en: string }> = {
  sur: { fr: "L'angle sûr", en: "The safe angle" }, emotion: { fr: "L'angle d'émotion", en: "The emotional angle" }, audacieux: { fr: "L'angle audacieux", en: "The bold angle" },
};
/** Les angles que le client voit et peut choisir (les trois, ou tous pour une recherche d'avant). */
export const shownAngles = (a: SinaAngles): SinaAngle[] => (a.shown?.length ? a.shown.map((x) => a.list.find((y) => y.id === x.id)).filter((x): x is SinaAngle => !!x) : a.list);
/** Le rôle d'un angle montré (sûr, émotion, audacieux), s'il en a un. */
export const roleOf = (a: SinaAngles, id: string): AngleRole | null => a.shown?.find((x) => x.id === id)?.role ?? null;
