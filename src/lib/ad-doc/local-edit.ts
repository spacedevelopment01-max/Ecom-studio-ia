/**
 * Retouches demandées en langage naturel sur une création : une demande simple et déterministe est exécutée
 * LOCALEMENT, gratuitement, en ne touchant que les calques concernés (« mets le titre plus grand », « change la
 * couleur du bouton en vert », « déplace le logo en haut à droite », « cache le logo »…). Une demande qui exige
 * une génération (nouvel arrière-plan, « version plus élégante ») n'est PAS exécutée ici : elle est renvoyée comme
 * demande payante à annoncer au client, avec son budget, avant tout appel.
 */
import { applyOps, byRole, type DocOp } from "./ops";
import type { AdDocument, ButtonLayer, Layer, TextLayer } from "./types";

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

  // Tailles et centrage : la demande est découpée en morceaux (« augmente la taille du texte et du titre et
  // centre-le avec le bouton ») ; un morceau sans verbe reprend le précédent, un morceau sans élément (« centre-le »)
  // reprend les éléments précédents.
  const layout = sizeAndCenter(doc, t);
  ops.push(...layout.ops);
  done.push(...layout.done);
  if (title && TITLE.test(t)) {
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
  if (!ops.length) return { local: false, paid: null, reason: "demande non reconnue pour une retouche locale : précisez l'élément (titre, texte, bouton, logo) et le changement, ou demandez-la à l'IA" };
  const next = applyOps(doc, ops);
  return { local: true, ops, doc: { ...next, meta: { ...next.meta, source: "ai_local" } }, summary: done.join(", ") };
}

const TEXT = /\b(texte|textes|text|sous[- ]titre|subtitle|ligne|description|phrase|ecrit|ecriture|paragraphe)\b/;
const BIGGER = /(plus grand|agrandi|grossi|augment|bigger|larger|plus gros|increase|plus visible)/;
const SMALLER = /(plus petit|reduis|reduire|diminu|smaller|moins grand|decrease)/;
const CENTER = /\b(centr|center|centre|au milieu)/;

type Target = "title" | "text" | "cta";

/** Calques de texte hors titre (ligne, accroche, sous-titre) ; jamais la signature de la marque. */
const textLayers = (doc: AdDocument) => doc.layers.filter((l): l is TextLayer => l.kind === "text" && l.role !== "title" && l.id !== "brand" && l.name !== "Marque" && l.visible && !l.locked);

function sizeAndCenter(doc: AdDocument, t: string): { ops: DocOp[]; done: string[] } {
  const scale = new Map<Target, number>();
  const center = new Set<Target>();
  let lastAct: "up" | "down" | "center" | null = null;
  let lastTargets: Target[] = [];
  for (const part of t.split(/\s*(?:,|;|\bet\b|\bpuis\b|\band\b|\bthen\b)\s*/).filter(Boolean)) {
    const targets: Target[] = [];
    if (TITLE.test(part)) targets.push("title");
    if (TEXT.test(part)) targets.push("text");
    if (BUTTON.test(part)) targets.push("cta");
    const act = CENTER.test(part) ? "center" : BIGGER.test(part) ? "up" : SMALLER.test(part) ? "down" : null;
    // « centre-le avec le bouton » : les éléments précédents ET le bouton.
    const withPrev = act && /\b(le|la|les|l'|tout|ensemble)\b|-le\b|-les\b/.test(part) && /\bavec\b/.test(part);
    const tg = targets.length ? (withPrev ? [...new Set([...lastTargets, ...targets])] : targets) : lastTargets;
    const a = act ?? lastAct;
    if (a && tg.length) {
      for (const x of tg) {
        if (a === "center") center.add(x);
        else scale.set(x, a === "up" ? 1.2 : 0.85);
      }
    }
    if (act) lastAct = act;
    // « du texte et du titre » : un morceau sans verbe s'ajoute au groupe précédent (même action).
    if (tg.length) lastTargets = !act && targets.length ? [...new Set([...lastTargets, ...tg])] : tg;
  }
  if (!scale.size && !center.size) return { ops: [], done: [] };
  // Zone du texte : toute l'affiche, ou le côté libre quand une photo occupe un panneau (photo d'un côté, texte de
  // l'autre) — centrer ne fait jamais passer le texte sur la photo.
  const panel = doc.layers.find((l) => l.kind === "image" && l.role !== "logo" && l.role !== "background" && l.visible && l.h >= doc.height * 0.9 && l.w < doc.width * 0.8 && (l.x <= 1 || l.x + l.w >= doc.width - 1));
  const zx = panel ? (panel.x <= 1 ? panel.w : 0) : 0;
  const zw = panel ? doc.width - panel.w : doc.width;
  const W = zw;
  const side = panel ? doc.safe.side * 0.8 : doc.safe.side;
  const title = byRole(doc, "title") as TextLayer | undefined;
  const cta = byRole(doc, "cta") as ButtonLayer | undefined;
  const of = (x: Target): Layer[] => (x === "title" ? (title && !title.locked ? [title] : []) : x === "cta" ? (cta && !cta.locked ? [cta] : []) : textLayers(doc));
  const out = new Map<string, Layer>();
  const cur = (l: Layer) => out.get(l.id) ?? l;
  const done: string[] = [];
  const NAMES: Record<Target, string> = { title: "titre", text: "texte", cta: "bouton" };
  for (const [x, k] of scale) {
    for (const l0 of of(x)) {
      const l = cur(l0);
      if (l.kind === "text") {
        const w = Math.min(W - side * 2, Math.max(l.w, l.w * k));
        out.set(l.id, { ...l, font: { ...l.font, size: Math.round(l.font.size * k) }, autoFit: l.autoFit ? { minSize: Math.round(l.autoFit.minSize * k) } : null, h: l.h * k, w, x: Math.max(zx + side, Math.min(l.x, zx + W - side - w)) });
      } else if (l.kind === "button") {
        const w = Math.min(W - side * 2, l.w * k);
        out.set(l.id, { ...l, font: { ...l.font, size: Math.round(l.font.size * k) }, w, h: l.h * k, x: l.x - (w - l.w) / 2, y: l.y - (l.h * k - l.h) / 2 });
      }
    }
    if (of(x).length) done.push(`${NAMES[x]} ${k > 1 ? "agrandi" : "réduit"}`);
  }
  // Le bloc texte (titre, lignes, bouton) garde ses écarts après un changement de taille : rien ne se chevauche.
  if (scale.size) {
    const stack = ([title, ...textLayers(doc), cta] as (Layer | undefined)[]).filter((l): l is Layer => !!l).sort((a, b) => a.y - b.y);
    let y = stack[0]?.y ?? 0;
    stack.forEach((l0, i) => {
      const l = cur(l0);
      if (i > 0) {
        const prev0 = stack[i - 1];
        // Déplacé seulement s'il serait recouvert (écart minimal gardé) : les autres éléments ne bougent pas.
        const gap = Math.min(Math.max(0, l0.y - (prev0.y + prev0.h)), doc.width * 0.012);
        const ny = Math.max(l.y, y + gap);
        if (ny !== l.y) out.set(l.id, { ...l, y: ny });
      }
      y = cur(l0).y + cur(l0).h;
    });
    const over = y - (doc.height - doc.safe.bottom);
    if (over > 0) for (const l0 of stack) out.set(l0.id, { ...cur(l0), y: cur(l0).y - over });
  }
  for (const x of center) {
    for (const l0 of of(x)) {
      const l = cur(l0);
      if (l.kind === "text") out.set(l.id, { ...l, x: zx + side, w: W - side * 2, align: "center", anchor: { ...l.anchor, h: "center" } });
      else out.set(l.id, { ...l, x: zx + (W - l.w) / 2, anchor: { ...l.anchor, h: "center" } });
    }
    if (of(x).length) done.push(`${NAMES[x]} centré`);
  }
  const ops: DocOp[] = [...out.values()].map((l) => {
    const { id, kind: _k, ...patch } = l as Layer & { kind: string };
    return { op: "update", id, patch } as DocOp;
  });
  return { ops, done: [...new Set(done)] };
}
