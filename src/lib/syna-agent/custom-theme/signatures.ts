/**
 * Signatures des familles, réglages des sections et signe de la marque (17 novembre 2026).
 *
 * Le propriétaire, devant les deux premiers sites de SINA (deux familles différentes) : « les thèmes entre les deux
 * marques sont très identiques ». Rendu dans cinq allures, le même site se reconnaissait toujours : même fond crème du
 * haut en bas, mêmes cadres droits, même rythme. Il a validé (« Fait les 5 ») trois chantiers, faits ici :
 *
 *  1) LES RÉGLAGES D'UNE SECTION (point 3) : en plus de sa disposition, chaque pièce qui s'y prête prend trois réglages,
 *     choisis par le concepteur et rendus par attributs : son FOND (clair, doux, sombre, couleur de la marque), son
 *     ALIGNEMENT (titre à gauche ou centré) et la taille de son TITRE (normal ou grand). Une même pièce dans une même
 *     disposition a ainsi seize allures. Le fond change les couleurs de la pièce entière (variables --tn-* redéfinies
 *     sur la section, calculées lisibles par le Studio : tenue.ts) : aucune pièce n'a à être réécrite.
 *  2) LA SIGNATURE DE CHAQUE FAMILLE (point 2), reconnaissable au premier coup d'œil, pas seulement par sa police : sa
 *     façon de poser les fonds (un rythme de fonds propre à la famille, contrôlé ici), et son dessin (feuille
 *     public/sections/tenue-familles.css, lue sur l'attribut data-tn-famille du site) : cadres, espaces, titres.
 *  3) LE SIGNE DE LA MARQUE (point 4) : le concepteur choisit une forme (étiquette ronde, tampon, ligne, couture, ruban)
 *     et quelques signes de texte ; le Studio le pose sur l'ouverture, sur un moment du milieu et sur l'appel final de
 *     l'accueil, et sur la fin de chaque page importante. Aucun pictogramme dessiné : du texte et une forme simple.
 *
 * Aucune porte de sortie : le contrôle du Studio (sans IA) rend les écarts au concepteur pour sa seule reprise ; ce qui
 * reste est corrigé par le Studio lui-même (fitSignature), et un site d'une famille rendu sans réglage enregistré prend
 * quand même le rythme de sa famille (fondsDePage, au rendu). Gratuit, sans IA.
 */
import { z } from "zod";
import { familleOf, type FamilleId } from "./familles";
import { tenueSection, validConstruction } from "./tenue";

// ─────────────────────────────────────────────────────────────── les réglages d'une section

export const FONDS = ["clair", "doux", "sombre", "marque"] as const;
export type Fond = (typeof FONDS)[number];
export const ALIGNEMENTS = ["gauche", "centre"] as const;
export type Alignement = (typeof ALIGNEMENTS)[number];
export const TAILLES_TITRE = ["normal", "grand"] as const;
export type TailleTitre = (typeof TAILLES_TITRE)[number];
export type Reglages = { fond?: Fond; alignement?: Alignement; titre?: TailleTitre };
/** Le fond que l'on VOIT pour une pièce sans réglage de fond : celui de son dessin. */
export type FondVu = Fond | "photo" | "couleur";

const plain = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : v);
const MOTS_FOND: Record<string, Fond> = { clair: "clair", blanc: "clair", doux: "doux", pale: "doux", teinte: "doux", sombre: "sombre", fonce: "sombre", noir: "sombre", marque: "marque", couleur: "marque", "couleur de la marque": "marque", vif: "marque" };
/** Lecture indulgente des réglages rendus par le concepteur : une valeur inconnue est oubliée, jamais un appel payé perdu. */
export const ReglagesPick = z.preprocess((v) => {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>, out: Reglages = {};
  const f = MOTS_FOND[String(plain(o.fond) ?? "")];
  if (f) out.fond = f;
  const a = plain(o.alignement);
  if (a === "gauche" || a === "centre" || a === "centré" || a === "centre") out.alignement = a === "gauche" ? "gauche" : "centre";
  const t = plain(o.titre);
  if (t === "normal" || t === "grand") out.titre = t;
  return out;
}, z.object({ fond: z.enum(FONDS).optional(), alignement: z.enum(ALIGNEMENTS).optional(), titre: z.enum(TAILLES_TITRE).optional() })).catch({});

/** Rôles qui ne prennent pas de réglage : la coque du site, l'ouverture, l'achat et les pages pratiques gardent leur allure. */
const ROLES_FIXES = new Set(["en-tête", "pied de page", "recherche", "ouverture", "produit vedette", "panier", "compte", "légal", "404"]);
/**
 * Pièces (« pièce » ou « pièce:disposition ») mesurées dans chaque fond par le banc (tour des sections du 17 novembre
 * 2026 : 3 216 rendus, `tour.ts --fond doux,sombre,marque`) et qui ne s'y lisent pas assez bien : elles gardent leur
 * fond. Une pièce n'entre ici que sur une mesure du banc. La valeur dit le fond que l'on voit (son dessin).
 */
export const FOND_FIXE: Record<string, FondVu> = {
  // L'échelle d'énergie a ses propres couleurs (de A à G) : sur un fond sombre ou de couleur, ses lettres ne se lisent plus.
  "tn-bien-energie": "clair",
  // Le ticket en couches : sa troisième couche est peinte d'une teinte qui ne se lit plus sur un fond sombre ou de couleur.
  "tn-prix-explique:couches": "clair",
  // Des bandes déjà pleines (l'encre ou la couleur de la marque) : elles sont elles-mêmes le moment de couleur.
  "tn-devis:bande": "sombre", "tn-offre-visite:bande": "couleur", "tn-delai-reponse:bande": "couleur", "tn-presentation:bande": "couleur",
};
const fixe = (id: string, construction: string | null) => FOND_FIXE[`${id}:${construction ?? ""}`] ?? FOND_FIXE[id] ?? null;
/** Une disposition déjà sombre (« panneau sombre », « ardoise ») garde son fond. */
const DISPO_SOMBRE = /sombre|ardoise/;
/** La pièce a-t-elle une tête (un grand titre au début) que l'alignement et la taille de titre peuvent régler ? */
const aUneTete = (html: string) => /^\s*<section\b[^>]*>\s*(?:<small\b[^>]*>[\s\S]*?<\/small>\s*)?<h2\b/.test(html);

/** Les réglages qu'une pièce (dans cette disposition) accepte. */
export function reglagesPermis(id: string, wanted?: string | null): { fond: boolean; alignement: boolean; titre: boolean } {
  const s = tenueSection(id), construction = s ? validConstruction(id, wanted) : null;
  if (!s || ROLES_FIXES.has(s.role) || s.group === "bandeau" || s.group === "partout") return { fond: false, alignement: false, titre: false };
  const tete = aUneTete(s.html);
  return { fond: s.trait.fond === "clair" && !fixe(id, construction) && !DISPO_SOMBRE.test(construction ?? ""), alignement: tete, titre: tete };
}

export function fondDessine(id: string, wanted?: string | null): FondVu {
  const s = tenueSection(id), construction = s ? validConstruction(id, wanted) : null;
  if (!s) return "clair";
  const f = fixe(id, construction);
  if (f) return f;
  if (DISPO_SOMBRE.test(construction ?? "")) return "sombre";
  return s.trait.fond === "photo" ? "photo" : s.trait.fond === "sombre" ? "sombre" : s.trait.fond === "couleur" ? "couleur" : "clair";
}

/** Les attributs posés sur la section rendue (lus par tenue-familles.css et par les variables de tenue.ts). */
export function reglagesAttrs(id: string, construction: string | null | undefined, r: Reglages | null | undefined): string {
  if (!r) return "";
  const ok = reglagesPermis(id, construction);
  return `${ok.fond && r.fond ? ` data-tn-fd="${r.fond}"` : ""}${ok.alignement && r.alignement ? ` data-tn-al="${r.alignement}"` : ""}${ok.titre && r.titre === "grand" ? ' data-tn-ti="grand"' : ""}`;
}

// ─────────────────────────────────────────────────────────────── la signature de chaque famille

export type Signature = {
  /** Ce que l'on voit au premier coup d'œil, dit au concepteur. */
  dessin: string;
  /** L'ordre des fonds sur les pièces qui en prennent un (repris en boucle). */
  cycle: Fond[];
  /** Sur l'accueil, au moins tant de sections de ce fond (quand l'accueil a assez de pièces réglables). */
  min: Partial<Record<Fond, number>>;
  /** Sur chaque page, au plus tant de sections de ce fond (0 : interdit dans la famille). */
  max: Partial<Record<Fond, number>>;
  /** Deux sections voisines peuvent-elles avoir le même fond teinté ? (Seul le spectaculaire enchaîne les sombres.) */
  sombresALaSuite: boolean;
  /** Réglages par défaut d'une pièce qui n'en dit rien. */
  alignement: Alignement;
  /** La forme du signe proposée quand le concepteur n'en donne pas. */
  signe: SigneForme;
};

export const SIGNATURES: Record<FamilleId, Signature> = {
  "maison-chaleureuse": {
    dessin: "des fonds de couleur chaude et douce qui alternent avec le clair (un moment sombre au plus), des photos aux coins arrondis, beaucoup d'air, les titres centrés",
    cycle: ["doux", "clair"], min: { doux: 2 }, max: { sombre: 1, marque: 0 }, sombresALaSuite: false, alignement: "centre", signe: "couture",
  },
  "epure-editorial": {
    dessin: "un fond presque blanc du haut en bas, de fins filets qui séparent les parties, de petits textes en capitales espacées, des titres à gauche, beaucoup de vide ; jamais de fond de couleur",
    cycle: ["clair"], min: {}, max: { doux: 1, sombre: 0, marque: 0 }, sombresALaSuite: false, alignement: "gauche", signe: "ligne",
  },
  "naturel-sincere": {
    dessin: "des fonds teintés de la couleur de la marque qui alternent avec le clair, les photos posées sur un passe-partout coloré, les petits textes en étiquettes",
    cycle: ["clair", "doux"], min: { doux: 2 }, max: { sombre: 0, marque: 1 }, sombresALaSuite: false, alignement: "gauche", signe: "tampon",
  },
  "gourmand-joyeux": {
    dessin: "chaque partie est un bloc encadré comme un objet (bord épais, coins ronds, ombre décalée), posé sur la page ; les fonds changent à chaque bloc, dont la couleur franche de la marque",
    cycle: ["marque", "doux", "clair"], min: { marque: 1, doux: 1 }, max: { sombre: 1 }, sombresALaSuite: false, alignement: "centre", signe: "etiquette",
  },
  "confiance-savoir-faire": {
    dessin: "des sections sombres et sérieuses qui alternent avec le clair, un trait épais de la couleur d'action au-dessus de chaque titre, des angles nets, un seul bouton fort",
    cycle: ["sombre", "clair"], min: { sombre: 2 }, max: { marque: 0, doux: 1 }, sombresALaSuite: false, alignement: "gauche", signe: "tampon",
  },
  spectaculaire: {
    dessin: "un site surtout sombre, des titres immenses en capitales, des bandes pleines de la couleur vive de la marque, un fort contraste, peu d'air entre les plans",
    cycle: ["sombre", "sombre", "marque", "sombre", "clair"], min: { sombre: 3, marque: 1 }, max: {}, sombresALaSuite: true, alignement: "gauche", signe: "ruban",
  },
};
export const signatureOf = (famille: string | null | undefined): Signature | null => (familleOf(famille) ? SIGNATURES[famille as FamilleId] : null);

type PieceVue = { id: string; construction?: string | null; reglages?: Reglages | null };
const teinte = (f: FondVu) => f === "doux" || f === "sombre" || f === "marque" || f === "couleur";
const pareils = (a: FondVu, b: FondVu) => a === b || (a === "couleur" && (b === "doux" || b === "marque")) || (b === "couleur" && (a === "doux" || a === "marque"));

/**
 * Les fonds d'une page dans sa famille : pour chaque pièce, son fond réglé (null : la pièce n'en prend pas). Les choix du
 * concepteur sont gardés tant qu'ils restent dans la famille ; le reste suit le rythme de la famille. Jamais deux fonds
 * teintés pareils à la suite (sauf les sombres du spectaculaire), jamais plus que le plafond de la famille ; sur l'accueil,
 * le minimum de la famille est atteint dès que la page a assez de pièces réglables.
 */
export function fondsDePage(famille: string | null | undefined, pieces: PieceVue[], o: { accueil?: boolean; garderChoix?: boolean } = {}): (Fond | null)[] {
  const sig = signatureOf(famille);
  const ok = pieces.map((p) => reglagesPermis(p.id, p.construction).fond);
  if (!sig) return pieces.map((p, i) => (ok[i] ? p.reglages?.fond ?? null : null));
  const vus: FondVu[] = pieces.map((p) => fondDessine(p.id, p.construction));
  const out: (Fond | null)[] = pieces.map(() => null);
  const compte: Record<Fond, number> = { clair: 0, doux: 0, sombre: 0, marque: 0 };
  const permis = (f: Fond) => (sig.max[f] ?? Infinity) > compte[f];
  const voisinOk = (f: Fond, i: number) => {
    if (!teinte(f)) return true;
    const avant = i > 0 ? vus[i - 1] : null, apres = i + 1 < pieces.length && (!ok[i + 1] || out[i + 1] != null) ? vus[i + 1] : null;
    const colle = (x: FondVu | null) => !!x && pareils(x, f) && !(sig.sombresALaSuite && f === "sombre" && x === "sombre");
    return !colle(avant) && !colle(apres);
  };
  let k = 0;
  pieces.forEach((p, i) => {
    if (!ok[i]) return;
    const voulu = o.garderChoix === false ? undefined : p.reglages?.fond;
    let f: Fond | undefined = voulu && permis(voulu) && voisinOk(voulu, i) ? voulu : undefined;
    if (!f) for (let n = 0; n < sig.cycle.length && !f; n++) { const c = sig.cycle[(k + n) % sig.cycle.length]; if (permis(c) && voisinOk(c, i)) f = c; }
    f ??= "clair";
    k++;
    out[i] = f; vus[i] = f; compte[f]++;
  });
  // L'accueil montre la signature : le minimum de chaque fond de la famille, posé sur des pièces claires sans voisin pareil.
  if (o.accueil) for (const [f, n] of Object.entries(sig.min) as [Fond, number][]) {
    for (let i = 0; i < pieces.length && compte[f] < n; i++) {
      if (out[i] !== "clair" || !permis(f)) continue;
      vus[i] = "clair";
      if (!voisinOk(f, i)) continue;
      out[i] = f; vus[i] = f; compte[f]++; compte.clair--;
    }
    // Les choix du concepteur empêchent le rythme de la famille d'apparaître : la famille passe d'abord (sans porte de sortie).
    if (o.garderChoix !== false) {
      const sans = fondsDePage(famille, pieces, { accueil: true, garderChoix: false });
      if ((Object.entries(sig.min) as [Fond, number][]).some(([f, n]) => compte[f] < n && sans.filter((x) => x === f).length > compte[f])) return sans;
    }
  }
  return out;
}

/**
 * Un écart de la signature ou du signe (pour le distinguer des autres écarts d'une conception) : le Studio les corrige
 * toujours lui-même en dernier (fitSignature, fitSigne), ils ne bloquent donc jamais une autre correction sans IA.
 */
export const estSignature = (gap: string) => /^(signature|signe) : /.test(gap);

/** Le minimum de la famille que CETTE page peut atteindre (une page courte n'en a pas les moyens : jamais d'impasse). */
function minAtteignable(famille: string, pieces: PieceVue[]): Partial<Record<Fond, number>> {
  const sig = signatureOf(famille)!;
  const best = fondsDePage(famille, pieces.map((p) => ({ ...p, reglages: null })), { accueil: true });
  return Object.fromEntries((Object.entries(sig.min) as [Fond, number][]).map(([f, n]) => [f, Math.min(n, best.filter((x) => x === f).length)]));
}

type PageVue = { key: string; label?: string; sections: { section: string; construction?: string | null; reglages?: Reglages | null }[] };
const piecesDe = (pg: PageVue, id: (s: string) => string): PieceVue[] => pg.sections.map((s) => ({ id: id(s.section), construction: s.construction, reglages: s.reglages }));

/**
 * Contrôle du Studio, sans IA : la conception porte-t-elle la signature de sa famille ? Les fonds réglés restent dans
 * ses choix (aucun fond interdit, aucun plafond dépassé, jamais deux fonds teintés pareils à la suite), et l'accueil
 * montre son rythme (le minimum de chaque fond de la famille, quand l'accueil a de quoi le porter).
 */
export function signatureGaps(d: { famille?: string | null; pages: PageVue[] }, id: (s: string) => string = (s) => s): string[] {
  const sig = signatureOf(d.famille);
  if (!sig) return [];
  const out: string[] = [];
  for (const pg of d.pages) {
    const pieces = piecesDe(pg, id), name = `« ${pg.label ?? pg.key} »`;
    const choisis = pieces.map((p) => (reglagesPermis(p.id, p.construction).fond ? p.reglages?.fond ?? null : null));
    const vus: FondVu[] = pieces.map((p, i) => choisis[i] ?? fondDessine(p.id, p.construction));
    for (const f of FONDS) {
      const n = choisis.filter((x) => x === f).length, max = sig.max[f];
      if (max != null && n > max) out.push(`signature : ${name} : ${n} section(s) au fond « ${f} », la famille ${d.famille} en permet ${max} (signature : ${sig.dessin})`);
    }
    for (let i = 1; i < pieces.length; i++) {
      const a = vus[i - 1], b = vus[i];
      if ((choisis[i] || choisis[i - 1]) && teinte(a) && pareils(a, b) && !(sig.sombresALaSuite && a === "sombre" && b === "sombre")) out.push(`signature : ${name} : deux sections au même fond « ${b === "couleur" ? a : b} » à la suite (${pieces[i - 1].id}, ${pieces[i].id}) : alterne les fonds`);
    }
    if (pg.key === "home") {
      const atteint = minAtteignable(d.famille!, pieces);
      for (const [f, n] of Object.entries(atteint) as [Fond, number][]) {
        const has = choisis.filter((x) => x === f).length;
        if (has < n) out.push(`signature : ${name} : la signature de la famille ${d.famille} demande au moins ${n} section(s) au fond « ${f} » sur l'accueil (ici ${has}) : ${sig.dessin}`);
      }
    }
    for (const p of pieces) if (p.reglages?.fond && !reglagesPermis(p.id, p.construction).fond) out.push(`signature : ${name} : ${p.id} ne prend pas de réglage de fond (sa disposition a déjà le sien) : retire-le`);
  }
  return out;
}

/**
 * Dernier recours, sans IA : chaque page reçoit les fonds de sa famille (les choix du concepteur gardés quand ils y
 * tiennent), et chaque pièce réglable un alignement. Rend la conception ajustée et ce qui a changé. Après lui,
 * signatureGaps ne trouve plus rien (essai : tests/signatures-familles.test.ts).
 */
export function fitSignature<D extends { famille?: string | null; pages: PageVue[] }>(d: D, id: (s: string) => string = (s) => s): { d: D; changed: string[] } {
  const sig = signatureOf(d.famille);
  if (!sig) return { d, changed: [] };
  const out: D = JSON.parse(JSON.stringify(d));
  const changed: string[] = [];
  for (const pg of out.pages) {
    const pieces = piecesDe(pg, id);
    const fonds = fondsDePage(d.famille, pieces, { accueil: pg.key === "home" });
    pg.sections.forEach((s, i) => {
      const ok = reglagesPermis(pieces[i].id, s.construction);
      const r: Reglages = { ...(s.reglages ?? {}) };
      if (!ok.fond) delete r.fond;
      else if (fonds[i] && r.fond !== fonds[i]) { changed.push(`${pg.key} › ${pieces[i].id} : fond ${r.fond ?? "—"} → ${fonds[i]}`); r.fond = fonds[i]!; }
      if (!ok.alignement) delete r.alignement; else r.alignement ??= sig.alignement;
      if (!ok.titre) delete r.titre;
      s.reglages = Object.keys(r).length ? r : null;
    });
  }
  return { d: out, changed };
}

// ─────────────────────────────────────────────────────────────── le signe de la marque

export const SIGNE_FORMES = ["etiquette", "tampon", "ligne", "couture", "ruban"] as const;
export type SigneForme = (typeof SIGNE_FORMES)[number];
export const SIGNE_TEXTE_MAX = 28;
export const SIGNE_FORMES_TEXTE = "« etiquette » (une étiquette ronde, légèrement penchée, le texte au centre), « tampon » (un tampon rectangulaire à double bord, en capitales), « ligne » (une ligne de texte typographique entre deux filets, comme une date à remplir ou un numéro de série), « couture » (le texte entre deux lignes de points cousus), « ruban » (une bande pleine penchée, comme un ruban collé)";
export type Signe = { forme: SigneForme; texte: string };

/** Le signe d'une tenue, s'il est complet. */
export function signeDe(t: { signeForme?: string | null; signeTexte?: string | null } | null | undefined): Signe | null {
  const forme = SIGNE_FORMES.find((f) => f === t?.signeForme);
  const texte = (t?.signeTexte ?? "").replace(/\s+/g, " ").trim();
  return forme && texte ? { forme, texte: texte.slice(0, SIGNE_TEXTE_MAX) } : null;
}

/** Contrôle sans IA : le signe est donné (forme connue, texte court, aucun dessin). */
export function signeGaps(t: { signeForme?: string | null; signeTexte?: string | null } | null | undefined): string[] {
  const out: string[] = [];
  if (!SIGNE_FORMES.includes(t?.signeForme as SigneForme)) out.push(`signe : le signe de la marque n'a pas de forme (champ tenue.signeForme : ${SIGNE_FORMES.join(", ")}) : il revient sur l'ouverture, au milieu et à la fin de l'accueil`);
  const texte = (t?.signeTexte ?? "").trim();
  if (!texte) out.push(`signe : le signe de la marque n'a pas de texte (champ tenue.signeTexte, ${SIGNE_TEXTE_MAX} signes au plus : quelques mots ou un motif de texte tiré du produit ou du métier)`);
  else if (texte.length > SIGNE_TEXTE_MAX) out.push(`signe : le texte du signe fait ${texte.length} signes (${SIGNE_TEXTE_MAX} au plus)`);
  return out;
}

/** Dernier recours, sans IA : un signe incomplet prend la forme de la famille et, pour texte, le nom de la marque. */
export function fitSigne<T extends { signeForme?: string | null; signeTexte?: string | null }>(t: T, famille: string | null | undefined, marque: string): { t: T; changed: string[] } {
  const out = { ...t }, changed: string[] = [];
  if (!SIGNE_FORMES.includes(out.signeForme as SigneForme)) { out.signeForme = signatureOf(famille)?.signe ?? "etiquette"; changed.push(`signe : forme ${out.signeForme}`); }
  const texte = (out.signeTexte ?? "").replace(/\s+/g, " ").trim();
  if (!texte) { out.signeTexte = marque.trim().slice(0, SIGNE_TEXTE_MAX); changed.push(`signe : texte « ${out.signeTexte} »`); }
  else if (texte.length > SIGNE_TEXTE_MAX) { out.signeTexte = texte.slice(0, SIGNE_TEXTE_MAX).replace(/\s+\S*$/, "") || texte.slice(0, SIGNE_TEXTE_MAX); changed.push("signe : texte raccourci"); }
  return { t: out, changed };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Le signe tel qu'il s'écrit dans un titre : une ligne à lui, au-dessus du titre, jamais lu par un lecteur d'écran. */
export const signeHtml = (s: Signe) => `<span class="tn-signe-m" data-f="${s.forme}" aria-hidden="true"><span>${esc(s.texte)}</span></span>`;
export const SIGNE_RX = /<span class="tn-signe-m"[^>]*>[\s\S]*?<\/span><\/span>/g;

/** Pose le signe au début du premier grand titre (h1, sinon h2) d'une section rendue. Rend null si elle n'en a pas. */
export function avecSigne(html: string, s: Signe): string | null {
  if (html.includes('class="tn-signe-m"')) return html;
  const m = /<(h1|h2)\b[^>]*>/.exec(html) ?? null;
  if (!m) return null;
  const h1 = /<h1\b[^>]*>/.exec(html), at = h1 ?? m;
  return html.slice(0, at.index + at[0].length) + signeHtml(s) + html.slice(at.index + at[0].length);
}

/**
 * Où revient le signe sur une page (indices des sections) : sur l'accueil, l'ouverture, une section du milieu et la
 * dernière section à grand titre ; sur une autre page importante, la dernière section à grand titre. Les sections sans
 * grand titre sont passées. Une page pratique (panier, compte, mentions, page introuvable) n'en a pas.
 */
export function placesDuSigne(pageKey: string, sections: string[]): number[] {
  if (/^(cart|panier|compte|account|legal|404|commande|recherche|search|merci)/.test(pageKey)) return [];
  const titre = sections.map((h) => /<h[12]\b/.test(h));
  const derniere = titre.lastIndexOf(true);
  if (pageKey !== "home") return derniere >= 0 ? [derniere] : [];
  const out = new Set<number>();
  if (titre[0]) out.add(0);
  if (derniere > 0) out.add(derniere);
  const milieu = Math.floor(sections.length / 2);
  const proches = sections.map((_x, i) => i).filter((i) => titre[i] && i > 0 && i < derniere && Math.abs(i - derniere) > 1).sort((a, b) => Math.abs(a - milieu) - Math.abs(b - milieu));
  if (proches.length) out.add(proches[0]);
  return [...out].sort((a, b) => a - b);
}

/** Pose le signe sur les sections d'une page (HTML rendu de chacune, dans l'ordre). */
export function signeSurPage(pageKey: string, sections: string[], s: Signe | null): string[] {
  if (!s) return sections;
  const places = new Set(placesDuSigne(pageKey, sections));
  return sections.map((h, i) => (places.has(i) ? avecSigne(h, s) ?? h : h));
}

/** Ce qui est dit au concepteur : les réglages des sections, la signature de sa famille et le signe. */
export function signaturesBrief(): string {
  return [
    "RÉGLAGES DE CHAQUE SECTION (champ « reglages » de chaque section, en plus de sa construction) : « fond » (clair, doux, sombre ou marque : la couleur de la marque en aplat ; le Studio recalcule toutes les couleurs de la section pour qu'elles restent lisibles), « alignement » (gauche ou centre : le titre et sa phrase), « titre » (normal ou grand). Seules les pièces de contenu à fond clair prennent un fond ; l'en-tête, le pied de page, l'ouverture, le bloc d'achat et les pages pratiques gardent le leur. Une même pièce change ainsi d'allure d'un site à l'autre : choisis ces réglages pour CETTE marque.",
    "SIGNATURE DE LA FAMILLE : chaque famille se reconnaît au premier coup d'œil, et ses fonds suivent son rythme (contrôlé par le Studio) :",
    ...(Object.entries(SIGNATURES) as [FamilleId, Signature][]).map(([id, s]) => `- ${id} : ${s.dessin}. Fonds : ${s.cycle.join(" puis ")} en boucle${Object.keys(s.min).length ? ` ; sur l'accueil au moins ${Object.entries(s.min).map(([f, n]) => `${n} « ${f} »`).join(" et ")}` : ""}${Object.entries(s.max).length ? ` ; par page au plus ${Object.entries(s.max).map(([f, n]) => `${n} « ${f} »`).join(", ")}` : ""} ; ${s.sombresALaSuite ? "les sections sombres peuvent s'enchaîner" : "jamais deux fonds teintés pareils à la suite"}.`),
    `LE SIGNE DE LA MARQUE (champs « signeForme » et « signeTexte » de la tenue) : le Studio le pose sur l'ouverture, sur un moment du milieu et sur l'appel final de l'accueil, et à la fin de chaque page importante. Forme : ${SIGNE_FORMES_TEXTE}. Texte : ${SIGNE_TEXTE_MAX} signes au plus, tiré du produit ou du métier de CETTE marque (un mot de son métier, une mesure, un numéro d'atelier, une ligne à remplir comme « __ / __ / ____ ») ; jamais un dessin, jamais une phrase de vente, jamais un fait inventé (ni date de création, ni chiffre que le dossier n'a pas).`,
  ].join("\n");
}

/**
 * Les réglages d'une page telle qu'elle se rend : ceux enregistrés, et, pour un site d'une famille, les fonds de sa
 * famille et son alignement là où rien n'est enregistré (un site monté avant les réglages prend quand même sa
 * signature). Sert au rendu du Studio, à la mise en boutique et au banc du tour des sections.
 */
export function reglagesDePage<S extends { id: string; construction?: string | null; reglages?: Reglages | null }>(famille: string | null | undefined, pageKey: string, sections: S[]): S[] {
  const sig = signatureOf(famille);
  if (!sig) return sections;
  const fonds = fondsDePage(famille, sections.map((s) => ({ id: s.id, construction: s.construction, reglages: s.reglages })), { accueil: pageKey === "home" });
  return sections.map((s, i) => {
    const ok = reglagesPermis(s.id, s.construction);
    if (!ok.fond && !ok.alignement) return s;
    const r: Reglages = { ...(s.reglages ?? {}) };
    if (fonds[i]) r.fond = fonds[i]!;
    if (ok.alignement) r.alignement ??= sig.alignement;
    return { ...s, reglages: r };
  });
}
