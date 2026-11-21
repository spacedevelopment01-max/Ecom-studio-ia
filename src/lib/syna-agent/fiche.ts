/**
 * LA FICHE DU CLIENT (le socle, accepté par le propriétaire le 21 novembre 2026) : tout ce que le client a dit, avec ses
 * mots exacts et la date — ce qu'il fait, ce qu'il aime, ce qu'il refuse, ce qu'il a choisi — et la portée de chaque
 * élément (pour tout, ou seulement pour le logo, les images, le site, les publications, les publicités).
 *
 * Une seule façon de faire : ses réponses de départ (`journey.start`), ses notes (ici), ses mots corrigés
 * (`client-wording`), ce qu'il garde en refonte et ses choix (identité, angle, site : lus dans le parcours). La fiche est
 * relue EN ENTIER par SINA à chaque pas, et donnée en entier avant chaque création (recherche : une information donnée
 * par morceaux fait perdre 39 % de qualité, la redonner en un bloc rétablit le niveau ; cause réelle du 21 novembre :
 * le refus de la goutte d'eau n'arrivait ni au dessinateur du logo ni au relecteur). Le client la lit et la corrige
 * (« Ce que SINA sait de toi »).
 *
 * Les notes vivent dans `agent_conversations.state_json.fiche`, à côté du parcours : elles existent aussi pour un fil
 * ouvert sur un projet d'avant SINA (qui n'a pas de parcours).
 */
import { all, json, now, one, run, tx } from "../db";
import { HttpError } from "../auth";
import { L } from "../i18n-server";
import { loadWordingRules } from "../client-wording";
import { memory } from "../projects";
import { FIELD_LABEL, START_FIELDS, journeyOf, updateJourney, type Journey } from "./journey";

export const GENRES = ["fait", "aime", "refuse"] as const;
export type Genre = (typeof GENRES)[number];
/** À quoi s'applique ce que le client a dit. « tout » vaut partout. */
export const PORTEES = ["tout", "marque", "logo", "images", "site", "publications", "publicites"] as const;
export type Portee = (typeof PORTEES)[number];
export const PORTEE_LABEL: Record<Portee, { fr: string; en: string }> = {
  tout: { fr: "pour tout", en: "for everything" }, marque: { fr: "pour la marque", en: "for the brand" }, logo: { fr: "pour le logo", en: "for the logo" },
  images: { fr: "pour les images", en: "for the images" }, site: { fr: "pour le site", en: "for the site" },
  publications: { fr: "pour les publications", en: "for the posts" }, publicites: { fr: "pour les publicités", en: "for the ads" },
};
export const GENRE_LABEL: Record<Genre, { fr: string; en: string }> = { fait: { fr: "Ce qu'il nous a dit", en: "What they told us" }, aime: { fr: "Ce qu'il aime", en: "What they like" }, refuse: { fr: "Ce qu'il refuse", en: "What they refuse" } };

/**
 * Ce qu'une portée couvre : un refus « pour la marque » vaut pour son logo et ses images ; « pour les images » vaut pour
 * toutes les images (logo compris, publications et publicités comprises).
 */
const COUVRE: Record<Portee, Portee[]> = {
  tout: [...PORTEES], marque: ["marque", "logo", "images"], logo: ["logo"], images: ["images", "logo", "publications", "publicites"],
  site: ["site"], publications: ["publications"], publicites: ["publicites"],
};
export const couvre = (portee: Portee, usage: Portee) => COUVRE[portee].includes(usage);

export type FicheNote = {
  sujet: string; value: string; at: number;
  /** Fait, goût ou refus ; une ancienne note sans genre est un fait. */
  genre?: Genre;
  /** Portée ; une ancienne note sans portée vaut pour tout. */
  portee?: Portee;
  /** Corrigée par le client lui-même, sur sa fiche. */
  corrigeLe?: number;
};
export type Fiche = { version: 1; notes: FicheNote[] };
export const NOTES_MAX = 80;

const stateOf = (cid: string) => one<{ state_json: string | null }>("SELECT state_json FROM agent_conversations WHERE id=?", cid);

/** La fiche d'un fil (ses anciennes notes, gardées dans le parcours avant le 21 novembre 2026, y sont reprises). */
export function ficheOf(cid: string): Fiche {
  const row = stateOf(cid);
  if (!row) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
  const st = json<any>(row.state_json ?? "{}", {});
  const notes = Array.isArray(st.fiche?.notes) ? st.fiche.notes : Array.isArray(st.parcours?.notes) ? st.parcours.notes : [];
  return { version: 1, notes: notes.filter((n: any) => n && typeof n.sujet === "string" && typeof n.value === "string") };
}

/** Mise à jour atomique de la fiche. */
export function updateFiche(cid: string, change: (f: Fiche) => void): Fiche {
  return tx(() => {
    const row = stateOf(cid);
    if (!row) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
    const st = json<any>(row.state_json ?? "{}", {});
    const f = ficheOf(cid);
    change(f);
    f.notes = f.notes.slice(-NOTES_MAX);
    run("UPDATE agent_conversations SET state_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...st, fiche: f }), now(), cid);
    return f;
  });
}

const sameSubject = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
/** Une note ajoutée remplace celle du même sujet (le client a changé d'avis : la plus récente compte). */
export function addNotes(cid: string, notes: { sujet: string; value: string; genre?: Genre; portee?: Portee }[]): Fiche {
  return updateFiche(cid, (f) => {
    const at = Date.now();
    for (const n of notes) f.notes = [...f.notes.filter((x) => !sameSubject(x.sujet, n.sujet)), { sujet: n.sujet.trim(), value: n.value.trim(), at, genre: n.genre ?? "fait", portee: n.portee ?? "tout" }];
  });
}

/** Les fils d'un projet, du plus récent au plus ancien. */
const threadsOf = (projectId: string) => all<{ id: string }>("SELECT id FROM agent_conversations WHERE project_id=? ORDER BY updated_at DESC", projectId).map((r) => r.id);

/** Toutes les notes d'un projet (tous ses fils), sans doublon de sujet : la plus récente compte. */
export function notesDuProjet(projectId: string): FicheNote[] {
  const out: FicheNote[] = [];
  for (const cid of threadsOf(projectId)) for (const n of ficheOf(cid).notes) {
    const i = out.findIndex((x) => sameSubject(x.sujet, n.sujet));
    if (i < 0) out.push(n); else if (n.at > out[i].at) out[i] = n;
  }
  // Notes d'avant la fiche, écrites dans la mémoire du projet (clés « syna.* » de source client) : lues, jamais réécrites.
  try {
    for (const m of memory(projectId)) {
      if (!m.key.startsWith("syna.") || !["fact", "decision"].includes(m.kind) || m.source !== "user" || m.status !== "confirmed") continue;
      const sujet = m.key.slice(5).trim(), value = m.value.replace(/\s+/g, " ").trim();
      if (!sujet || !value || /^[[{]/.test(value) || ANCIENNES_CLES_DU_STUDIO.test(sujet) || out.some((x) => sameSubject(x.sujet, sujet))) continue;
      out.push({ sujet, value, at: m.updated_at, genre: "fait", portee: "tout" });
    }
  } catch { /* mémoire absente */ }
  return out.sort((a, b) => a.at - b.at);
}
/** Clés « syna.* » que le Studio écrivait lui-même dans la mémoire (ce ne sont pas des paroles du client). */
const ANCIENNES_CLES_DU_STUDIO = /^(identite|nom|langues|slogan|depart|garder|custom_|mockup|css|step|product_|remises|agent|site|brand|angles|posts|studio|dessin)/i;

/** Le fil du parcours de création d'un projet (le plus récent qui en a un), pour lire ses choix. */
export function journeyDuProjet(projectId: string): { cid: string; j: Journey } | null {
  for (const cid of threadsOf(projectId)) { try { const j = journeyOf(cid); if (!j.outside) return { cid, j }; } catch { /* fil illisible */ } }
  return null;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const dateFr = (t: number) => { const d = new Date(t); return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
const genreOf = (n: FicheNote): Genre => n.genre ?? "fait";
const porteeOf = (n: FicheNote): Portee => n.portee ?? "tout";

/** Les refus du client qui valent pour cet usage, mot pour mot. */
const vautPour = (n: FicheNote, usages: Portee | Portee[]) => (Array.isArray(usages) ? usages : [usages]).some((u) => couvre(porteeOf(n), u));
export function refusPour(notes: FicheNote[], usage: Portee | Portee[]): string[] {
  return notes.filter((n) => genreOf(n) === "refuse" && vautPour(n, usage)).map((n) => n.value);
}
/** Ce que le client a dit de l'image qu'il veut (ses goûts et ses refus qui valent pour ces usages), mot pour mot. */
export function goutsPour(notes: FicheNote[], usage: Portee | Portee[]): string[] {
  return notes.filter((n) => genreOf(n) !== "fait" && vautPour(n, usage)).map((n) => `${genreOf(n) === "refuse" ? "Il ne veut pas : " : "Il aime : "}${n.value}`);
}

/** Ses choix, lus dans le parcours (jamais écrits par SINA). */
export function choixDuClient(j: Journey): string[] {
  const out: string[] = [];
  const route = j.identityChoice ? j.identities?.list.find((x) => x.key === j.identityChoice!.key) : undefined;
  if (j.identityChoice) out.push(`Identité choisie : ${j.identityChoice.key}${route ? ` « ${j.identityChoice.edits?.name ?? route.name} »` : ""}${Object.keys(j.identityChoice.mix ?? {}).length ? ` (avec ${Object.entries(j.identityChoice.mix).map(([p, k]) => `${p} de ${k}`).join(", ")})` : ""}, le ${dateFr(j.identityChoice.at)}.`);
  if (j.steps[3]?.status === "done" && j.steps[3].at) out.push(`Marque complète validée le ${dateFr(j.steps[3].at)}.`);
  const angle = j.angleChoice ? j.angles?.list.find((x) => x.id === (j.angleChoice!.ids?.[0] ?? j.angleChoice!.id)) : undefined;
  if (j.angleChoice) out.push(`Angle choisi : « ${angle?.title ?? j.angleChoice.id} », le ${dateFr(j.angleChoice.at)}.`);
  if (j.steps[5]?.status === "done" && j.steps[5].at) out.push(`Activité validée le ${dateFr(j.steps[5].at)}.`);
  if (j.customChosenAt) out.push(`Site validé le ${dateFr(j.customChosenAt)}.`);
  else if (j.steps[8]?.status === "done" && j.steps[8].at) out.push(`Site validé le ${dateFr(j.steps[8].at)}.`);
  return out;
}

/**
 * La fiche entière, telle qu'elle est relue avant chaque création et à chaque pas de SINA. Rien n'y est résumé ni
 * reformulé : ses mots sont entre guillemets.
 */
export function ficheTexte(o: { j: Journey; notes: FicheNote[]; projectId?: string | null }): string {
  const { j, notes } = o;
  const lines: string[] = ["# La fiche du client (tout ce qu'il a dit, avec ses mots ; relue en entier)"];
  const start = START_FIELDS.filter((f) => j.start[f]).map((f) => {
    const a = j.start[f]!;
    const v = a.status === "answered" ? (f === "business" ? (a.value === "services" ? "des services" : "des produits") : `« ${a.value} »`) : a.status === "later" ? "il répondra plus tard" : "rien à dire";
    return `- ${FIELD_LABEL[f].fr} : ${v} (${dateFr(a.at)}${a.source !== "client" ? `, source : ${a.source === "site" ? "son site" : a.source === "photo" ? "ses photos" : "formulaire"}` : ""})`;
  });
  if (start.length) lines.push("## Ses réponses", ...start);
  for (const g of GENRES) {
    const list = notes.filter((n) => genreOf(n) === g);
    if (list.length) lines.push(`## ${GENRE_LABEL[g].fr}`, ...list.map((n) => `- ${n.sujet} : « ${n.value} » (${PORTEE_LABEL[porteeOf(n)].fr}, ${dateFr(n.corrigeLe ?? n.at)}${n.corrigeLe ? ", corrigé par lui" : ""})`));
  }
  const choix = choixDuClient(j);
  if (choix.length) lines.push("## Ses choix (validés par lui : on n'y touche que s'il le demande)", ...choix.map((c) => `- ${c}`));
  if (j.keep.length) lines.push("## Ce qu'il garde tel quel", `- ${j.keep.join(", ")}${j.keptValues?.name ? ` ; nom « ${j.keptValues.name} »` : ""}${j.keptValues?.slogan ? ` ; slogan « ${j.keptValues.slogan} »` : ""}`);
  if (o.projectId) {
    const w = (() => { try { return loadWordingRules(o.projectId!); } catch { return []; } })();
    if (w.length) lines.push("## Ses mots (corrigés une fois, valables pour toujours)", ...w.map((r) => `- « ${r.use} », jamais « ${r.avoid} »`));
  }
  if (lines.length === 1) lines.push("Rien encore.");
  return lines.join("\n");
}

/** La fiche entière d'un fil. */
export function ficheDuFil(cid: string, projectId?: string | null): string {
  const j = journeyOf(cid);
  return ficheTexte({ j, notes: projectId ? notesDuProjet(projectId) : ficheOf(cid).notes, projectId });
}
/** La fiche entière d'un projet (fil du parcours, notes de tous ses fils). */
export function ficheDuProjet(projectId: string): string {
  const jp = journeyDuProjet(projectId);
  return ficheTexte({ j: jp?.j ?? journeyOf(threadsOf(projectId)[0] ?? ""), notes: notesDuProjet(projectId), projectId });
}

/** Ce que le client voit sur sa fiche (« Ce que SINA sait de toi »). */
export type FicheVue = {
  reponses: { champ: string; label: string; value: string; status: string; at: number }[];
  notes: (FicheNote & { genre: Genre; portee: Portee; genreLabel: string; porteeLabel: string })[];
  choix: string[]; mots: { avoid: string; use: string }[]; garde: string[];
};
export function ficheVue(cid: string, projectId: string | null, lang: "fr" | "en" = "fr"): FicheVue {
  const j = journeyOf(cid);
  const notes = projectId ? notesDuProjet(projectId) : ficheOf(cid).notes;
  return {
    reponses: START_FIELDS.filter((f) => j.start[f] && f !== "business").map((f) => ({ champ: f, label: FIELD_LABEL[f][lang], value: j.start[f]!.value, status: j.start[f]!.status, at: j.start[f]!.at })),
    notes: notes.map((n) => ({ ...n, genre: genreOf(n), portee: porteeOf(n), genreLabel: GENRE_LABEL[genreOf(n)][lang], porteeLabel: PORTEE_LABEL[porteeOf(n)][lang] })),
    choix: choixDuClient(j),
    mots: projectId ? (() => { try { return loadWordingRules(projectId).map((r) => ({ avoid: r.avoid, use: r.use })); } catch { return []; } })() : [],
    garde: j.keep,
  };
}

/** Ce que le client corrige lui-même sur sa fiche : une note (changée ou effacée) ou une de ses réponses de départ. */
export type Correction =
  | { type: "note"; sujet: string; value: string | null; genre?: Genre; portee?: Portee }
  | { type: "reponse"; champ: (typeof START_FIELDS)[number]; value: string };

/**
 * Le client corrige sa fiche (« Ce que SINA sait de toi ») : sa correction remplace ce qui était noté, datée et marquée
 * « corrigé par lui » ; une note effacée ne revient pas (une ancienne note de la mémoire du projet est écartée aussi).
 */
export function corrigerFiche(projectId: string, c: Correction): void {
  const jp = journeyDuProjet(projectId), cids = threadsOf(projectId), home = jp?.cid ?? cids[0];
  if (!home) throw new HttpError(404, L("Aucune conversation avec SINA pour ce projet.", "No conversation with SINA for this project."));
  if (c.type === "reponse") {
    if (c.champ === "business" || c.champ === "keep") throw new HttpError(400, L("Cette réponse ne se corrige pas ici : demande-le à SINA.", "Ask SINA to change this."));
    if (!c.value.trim()) throw new HttpError(400, L("Réponse vide.", "Empty answer."));
    updateJourney(home, (j) => { j.start[c.champ] = { value: c.value.trim(), status: "answered", source: "client", at: Date.now() }; });
    return;
  }
  const sujet = c.sujet.trim();
  tx(() => {
    // Le sujet est effacé de tous les fils du projet ; la correction s'écrit dans le fil du parcours.
    for (const cid of cids) {
      const f = ficheOf(cid), before = f.notes.find((n) => sameSubject(n.sujet, sujet));
      if (!before && cid !== home) continue;
      updateFiche(cid, (x) => {
        const old = x.notes.find((n) => sameSubject(n.sujet, sujet));
        x.notes = x.notes.filter((n) => !sameSubject(n.sujet, sujet));
        if (cid === home && c.value != null && c.value.trim()) x.notes.push({ sujet, value: c.value.trim(), at: old?.at ?? Date.now(), corrigeLe: Date.now(), genre: c.genre ?? old?.genre ?? "fait", portee: c.portee ?? old?.portee ?? "tout" });
      });
    }
    run("UPDATE memory SET status='rejected', updated_at=? WHERE project_id=? AND key=? AND kind IN ('fact','decision')", now(), projectId, `syna.${sujet}`);
  });
}
