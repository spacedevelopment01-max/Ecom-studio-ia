/**
 * Retouches demandées en langage naturel sur une création : une demande simple et déterministe est exécutée
 * LOCALEMENT, gratuitement, en ne touchant que les calques concernés (« mets le titre plus grand », « change la
 * couleur du bouton en vert », « déplace le logo en haut à droite », « cache le logo »…). Une demande qui exige
 * une génération (nouvel arrière-plan, « version plus élégante ») n'est PAS exécutée ici : elle est renvoyée comme
 * demande payante à annoncer au client, avec son budget, avant tout appel.
 */
import { applyOps, byRole, type DocOp } from "./ops";
import type { AdDocument, Layer, TextLayer } from "./types";

export type LocalEditResult =
  | { local: true; ops: DocOp[]; doc: AdDocument; summary: string }
  | { local: false; paid: { kind: "image" | "creative"; reason: string; imageRequest?: { kind: "ambiance"; topic: string } } | null; reason: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const COLORS: Record<string, string> = {
  rouge: "#C62828", red: "#C62828", bleu: "#1E5BB8", blue: "#1E5BB8", vert: "#2E7D32", green: "#2E7D32", noir: "#111111", black: "#111111",
  blanc: "#FFFFFF", white: "#FFFFFF", orange: "#E65100", jaune: "#F2B705", yellow: "#F2B705", violet: "#6A1B9A", purple: "#6A1B9A", rose: "#D81B60", pink: "#D81B60", gris: "#5F6368", grey: "#5F6368", gray: "#5F6368", or: "#B8902F", gold: "#B8902F",
};

function colorIn(t: string, doc: AdDocument): string | null {
  const hex = t.match(/#[0-9a-f]{6}\b/)?.[0];
  if (hex) return hex.toUpperCase();
  if (/(couleur|color)s? de (la )?marque|brand colou?r|accent/.test(t)) return doc.brand.palette.accent ?? null;
  for (const [k, v] of Object.entries(COLORS)) if (new RegExp(`\\b${k}\\b`).test(t)) return v;
  return null;
}

const TITLE = /\b(titre|title|accroche|headline|hook)\b/;
const BUTTON = /\b(bouton|button|cta)\b/;
const LOGO = /\blogo\b/;

export function localAdEdit(doc: AdDocument, instruction: string): LocalEditResult {
  const t = norm(instruction);
  const ops: DocOp[] = [];
  const done: string[] = [];
  const title = byRole(doc, "title") as TextLayer | undefined;
  const button = byRole(doc, "cta");
  const logo = byRole(doc, "logo");

  // Génération nécessaire : jamais en local, toujours annoncée avant de dépenser.
  if (/(arriere[- ]plan|fond|background|photo|image)\b.*(remplac|change|autre|nouvel|premium|ambiance)|(remplac|change).*(arriere[- ]plan|fond|background|photo|image)/.test(t) && !colorIn(t, doc))
    return { local: false, paid: { kind: "image", reason: "un nouvel arrière-plan demande une recherche ou une génération d'image (Image Engine V2)", imageRequest: { kind: "ambiance", topic: instruction.slice(0, 200) } }, reason: "génération d'image nécessaire" };
  if (/(plus elegant|plus premium|plus moderne|plus luxe|version|refai|more elegant|more premium|redesign)/.test(t))
    return { local: false, paid: { kind: "creative", reason: "une nouvelle version de la création demande une direction artistique (IA)" }, reason: "IA nécessaire" };

  if (title && TITLE.test(t)) {
    const k = /(plus grand|agrandi|grossi|bigger|larger|plus gros)/.test(t) ? 1.2 : /(plus petit|reduis|reduire|smaller|moins grand)/.test(t) ? 0.85 : null;
    if (k) {
      const size = Math.round(title.font.size * k);
      ops.push({ op: "update", id: title.id, patch: { font: { ...title.font, size }, autoFit: title.autoFit ? { minSize: Math.round(title.autoFit.minSize * k) } : null, h: title.h * k } as Partial<Layer> });
      done.push(k > 1 ? "titre agrandi" : "titre réduit");
    }
    const c = /(couleur|color)/.test(t) ? colorIn(t, doc) : null;
    if (c) {
      ops.push({ op: "color", id: title.id, color: c });
      done.push(`titre en ${c}`);
    }
  }
  if (button && BUTTON.test(t)) {
    const c = colorIn(t, doc);
    if (c) {
      ops.push({ op: "fill", id: button.id, fill: c });
      done.push(`bouton en ${c}`);
    }
  }
  if (logo && LOGO.test(t)) {
    if (/(cache|masque|retire|supprime|hide|remove)/.test(t)) {
      ops.push({ op: "visible", id: logo.id, visible: false });
      done.push("logo masqué");
    } else if (/(affiche|montre|show)/.test(t)) {
      ops.push({ op: "visible", id: logo.id, visible: true });
      done.push("logo affiché");
    } else {
      const top = /(haut|top)/.test(t);
      const bottom = /(bas|bottom)/.test(t);
      const right = /(droite|right)/.test(t);
      const left = /(gauche|left)/.test(t);
      if (top || bottom || left || right) {
        const S = doc.safe;
        const x = right ? doc.width - S.side - logo.w : left ? S.side : (doc.width - logo.w) / 2;
        const y = top ? S.top : bottom ? doc.height - S.bottom - logo.h : (doc.height - logo.h) / 2;
        ops.push({ op: "move", id: logo.id, x, y });
        ops.push({ op: "update", id: logo.id, patch: { anchor: { h: right ? "right" : left ? "left" : "center", v: top ? "top" : bottom ? "bottom" : "middle" } } });
        done.push(`logo ${top ? "en haut" : bottom ? "en bas" : "au milieu"}${right ? " à droite" : left ? " à gauche" : ""}`);
      }
    }
  }
  if (!ops.length) return { local: false, paid: null, reason: "demande non reconnue pour une retouche locale : précisez l'élément (titre, bouton, logo) et le changement" };
  const next = applyOps(doc, ops);
  return { local: true, ops, doc: { ...next, meta: { ...next.meta, source: "ai_local" } }, summary: done.join(", ") };
}
