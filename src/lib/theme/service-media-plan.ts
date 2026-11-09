/**
 * Listes de photos des 6 thèmes de services construits sans plan d'emplacements (TABLE SAISON, ATELIER NUANCE,
 * PARENTHÈSE, PHASE, MAISON & HORIZON, APLAT ; demande du propriétaire du 9 novembre 2026) : chaque case qui porte une
 * photo dans la démonstration du thème est un emplacement à remplir pour le client (service-media-plans.json, préparé par
 * tests/build-service-media-plans.test.ts). On compte les emplacements présents dans SON site, on y pose ses images ou
 * celles créées par SINA (case photo du client, prioritaire sur le fichier du thème). Sans IA.
 */
import plans from "./service-media-plans.json";
import { sectionSchema, type ThemeSpec } from "./spec";
import { getAsset } from "../library";

type PlanSlot = { template: string; section: string; occurrence: number; block?: string; blockOccurrence?: number; field: string; shows: string; aspect: string | null };
export type ServiceSlot = { key: string; template: string; sectionId: string; blockId?: string; field: string; /** Champ « fichier du thème » qui affiche vraiment la photo (asset_url : aperçu et boutique Shopify). */ assetField?: string; shows: string; aspect: "1:1" | "4:5" | "16:9" | "9:16"; filled: boolean; /** Section masquée faute de photo : elle réapparaît quand ses photos sont posées. */ hidden?: boolean; /** Photo que SINA ne peut pas inventer (réalisation, lieu, équipe, villes) : seule la vraie photo du client va ici. */ authentic?: AuthenticKind };

/** Photos qui doivent montrer le vrai travail, le vrai lieu, la vraie équipe ou les vraies villes du client. */
export type AuthenticKind = "realisation" | "lieu" | "equipe" | "ville";

/**
 * Classement sans IA d'après la page, la section, le champ et la photo de démonstration (demande du propriétaire du
 * 9 novembre 2026 : « faire comprendre au client que SINA ne peut pas inventer cette image »).
 */
export function authenticKind(s: { template: string; section: string; block?: string; field: string; shows: string }): AuthenticKind | null {
  const t = `${s.template} ${s.section} ${s.block ?? ""} ${s.field} ${s.shows}`.toLowerCase().replace(/_/g, " ");
  if (/realisation|page\.ph-projet-|detail-chantier|compare|\b(before|after|avant|apres)\b|project image|\bprojet (avant|ambiance)\b/.test(t)) return "realisation";
  if (/equipe|portrait|fondat|\bteam\b/.test(t) || (s.template === "page.about" && s.section === "about")) return "equipe";
  if (/\b(aix|marseille|paris|luberon|lyon|village|ville|quartier)\b/.test(t)) return "ville";
  // Le lieu : pages dédiées, sinon d'après la seule photo de démonstration (jamais le nom de page, ex. « article-lieu »).
  const shown = s.shows.toLowerCase().replace(/_/g, " ");
  if (/^page\.(an-salon|ts-lieu|pa-cabinet|agence)$/.test(s.template) || s.section === "an-details" || /\b(lieu|facade|salle|cabinet|agence|plaque|jardin entree|devanture|vitrine)\b|accueil salon|contact terrasse|salon (hero|cadre|details|approche)/.test(shown)) return "lieu";
  return null;
}

export const SERVICE_PLAN_THEMES = Object.keys((plans as { themes: Record<string, PlanSlot[]> }).themes);
export const hasServicePlan = (direction: string | null | undefined) => !!direction && SERVICE_PLAN_THEMES.includes(direction);

/** Format d'une case : celui de la photo de démonstration, sinon d'après le nom de la section (bandeau large, sinon portrait). */
function aspectOf(s: PlanSlot): ServiceSlot["aspect"] {
  if (s.aspect === "1:1" || s.aspect === "4:5" || s.aspect === "16:9" || s.aspect === "9:16") return s.aspect;
  if (/mobile/.test(s.field)) return "4:5";
  return /hero|banner|bandeau|wide|split|map|cta/.test(`${s.section} ${s.field}`) ? "16:9" : "4:5";
}

/** Champ texte « x_asset » associé à la case photo « x » (ou « x_image » → « x_asset »), comme dans les démonstrations. */
function assetFieldOf(defs: { id: string; type: string }[], picker: string): string | undefined {
  const ids = new Set(defs.filter((d) => d.type === "text").map((d) => d.id));
  if (ids.has(`${picker}_asset`)) return `${picker}_asset`;
  if (picker.endsWith("_image") && ids.has(`${picker.slice(0, -6)}_asset`)) return `${picker.slice(0, -6)}_asset`;
  return undefined;
}
const placeholderSlotName = (v: string) => /^es-ph-[0-9a-f]{8}\.svg$/.test(v);

/** Emplacements de photos de la liste présents dans le site du client (même page, même section, même rang). */
export function serviceMediaSlots(spec: ThemeSpec): ServiceSlot[] {
  const list = (plans as { themes: Record<string, PlanSlot[]> }).themes[spec.direction as string];
  if (!list) return [];
  const out: ServiceSlot[] = [];
  const index = new Map<string, PlanSlot>();
  for (const s of list) index.set([s.template, s.section, s.occurrence, s.block ?? "", s.blockOccurrence ?? "", s.field].join("|"), s);
  for (const [template, t] of Object.entries(spec.templates)) {
    const seen: Record<string, number> = {};
    for (const sid of t.order ?? Object.keys(t.sections)) {
      const sec = t.sections[sid] as { type: string; disabled?: boolean; settings?: Record<string, unknown>; blocks?: Record<string, { type: string; settings?: Record<string, unknown> }>; block_order?: string[] } | undefined;
      if (!sec) continue;
      // Les sections masquées faute de photo comptent aussi (jamais un cadre vide : elles reviennent avec leurs photos).
      const occurrence = (seen[sec.type] = (seen[sec.type] ?? -1) + 1);
      const sch = sectionSchema(spec, sec.type) as { settings?: { id: string; type: string }[]; blocks?: { type: string; settings?: { id: string; type: string }[] }[] } | null;
      if (!sch) continue;
      const take = (field: string, values: Record<string, unknown> | undefined, defs: { id: string; type: string }[], blockId?: string, block?: string, bocc?: number) => {
        const p = index.get([template, sec.type, occurrence, block ?? "", bocc ?? "", field].join("|"));
        if (!p) return;
        const assetField = assetFieldOf(defs, field);
        const v = values?.[field], va = assetField ? values?.[assetField] : undefined;
        const filled = (typeof va === "string" && !!va && !placeholderSlotName(va)) || (typeof v === "string" && !!v && (!spec.files || !!spec.files[v]));
        out.push({ key: [template, sid, blockId ?? "", field].join(":"), template, sectionId: sid, ...(blockId ? { blockId } : {}), field, ...(assetField ? { assetField } : {}), shows: p.shows, aspect: aspectOf(p), filled, ...(sec.disabled ? { hidden: true } : {}) });
        const k = authenticKind({ template, section: sec.type, block, field, shows: p.shows });
        if (k) out[out.length - 1].authentic = k;
      };
      for (const d of sch.settings ?? []) if (d.type === "image_picker") take(d.id, sec.settings, sch.settings ?? []);
      const bseen: Record<string, number> = {};
      for (const bid of sec.block_order ?? Object.keys(sec.blocks ?? {})) {
        const b = sec.blocks?.[bid];
        if (!b) continue;
        const bocc = (bseen[b.type] = (bseen[b.type] ?? -1) + 1);
        const bs = (sch.blocks ?? []).find((x) => x.type === b.type);
        for (const d of bs?.settings ?? []) if (d.type === "image_picker") take(d.id, b.settings, bs?.settings ?? [], bid, b.type, bocc);
      }
    }
  }
  return out;
}

/** Pose une image du projet dans un emplacement (case photo du client ; le fichier du thème reste en secours). */
export function placeServiceImage(spec: ThemeSpec, slot: ServiceSlot, assetId: string): ThemeSpec {
  const a = getAsset(assetId);
  if (!a) throw new Error(`image ${assetId} introuvable`);
  const ext = a.mime === "image/webp" ? "webp" : a.mime === "image/png" ? "png" : a.mime === "image/avif" ? "avif" : "jpg";
  const file = `es-client-${a.id}.${ext}`;
  const sec = spec.templates[slot.template]?.sections[slot.sectionId] as { settings?: Record<string, unknown>; blocks?: Record<string, { settings?: Record<string, unknown> }> } | undefined;
  if (!sec) throw new Error(`section ${slot.sectionId} absente`);
  const target = slot.blockId ? sec.blocks?.[slot.blockId] : sec;
  if (!target) throw new Error(`bloc ${slot.blockId} absent`);
  // Le thème affiche la photo par son champ « fichier du thème » (asset_url) : c'est lui qu'on remplit quand il existe.
  target.settings = { ...(target.settings ?? {}), [slot.assetField ?? slot.field]: file };
  spec.files = { ...(spec.files ?? {}), [file]: a.id };
  return spec;
}

/**
 * Sections masquées faute de photo dont toutes les photos prévues sont maintenant posées : elles réapparaissent.
 * Renvoie les sections réaffichées.
 */
export function revealFilledSections(spec: ThemeSpec): string[] {
  const slots = serviceMediaSlots(spec), shown: string[] = [];
  const bySection = new Map<string, ServiceSlot[]>();
  for (const x of slots) bySection.set(`${x.template}|${x.sectionId}`, [...(bySection.get(`${x.template}|${x.sectionId}`) ?? []), x]);
  for (const [k, list] of bySection) {
    const [template, sid] = k.split("|");
    const sec = spec.templates[template]?.sections[sid] as { disabled?: boolean } | undefined;
    if (sec?.disabled && list.every((x) => x.filled)) { sec.disabled = false; shown.push(`${template} › ${sid}`); }
  }
  return shown;
}

/** Noms des fichiers de démonstration écrits sans accents. */
const ACCENTS: Record<string, string> = { piece: "pièce", apres: "après", facade: "façade", equipe: "équipe", eclairage: "éclairage", eclaire: "éclairé", electrique: "électrique", renove: "rénové", renovation: "rénovation", sejour: "séjour", entree: "entrée", reservation: "réservation", detail: "détail", etageres: "étagères", dejeuner: "déjeuner", diner: "dîner", evenements: "événements", categorie: "catégorie", creneau: "créneau", legal: "légal", proprietaires: "propriétaires", amenagement: "aménagement", realisation: "réalisation", protegee: "protégée", deplacer: "déplacer", recapitulatif: "récapitulatif", interieur: "intérieur", exterieur: "extérieur" };

/** Ce que montrait la photo de démonstration, lisible (« parenthese 38 cabinet accueil » → « cabinet accueil »). */
export function showsLabel(shows: string): string {
  const t = shows.replace(/_/g, " ").replace(/^(parenthese|mh|saison)\s+/i, "").replace(/^\d+\s+/, "").trim();
  if (/^(photo|scene) \d+ [a-z0-9]{6}$/i.test(t)) return "";
  return t.replace(/[a-z]+/gi, (w) => ACCENTS[w.toLowerCase()] ?? w);
}

/** Fichier de remplacement d'une photo à fournir (aperçu du Studio seulement), d'après la clé stable de l'emplacement. */
export function placeholderFile(slot: { key: string }): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < slot.key.length; i++) h = Math.imul(h ^ slot.key.charCodeAt(i), 0x01000193) >>> 0;
  return `es-ph-${h.toString(16).padStart(8, "0")}.svg`;
}
/** Emplacement « photo à fournir » désigné par ce fichier, s'il est encore vide. */
export function placeholderSlot(spec: ThemeSpec, file: string): ServiceSlot | undefined {
  if (!/^es-ph-[0-9a-f]{8}\.svg$/.test(file)) return undefined;
  return serviceMediaSlots(spec).find((x) => x.authentic && !x.filled && placeholderFile(x) === file);
}

/**
 * Copie de l'APERÇU DU STUDIO seulement (jamais la version enregistrée, l'export ni le site publié) : chaque photo que
 * SINA ne peut pas inventer et que le client n'a pas encore fournie est remplacée par un cadre qui l'explique ; les
 * sections masquées faute de ces photos réapparaissent dans l'aperçu pour que le client voie où elles vont.
 */
export function withAuthenticPlaceholders(spec: ThemeSpec): ThemeSpec {
  if (!hasServicePlan(spec.direction as string)) return spec;
  const slots = serviceMediaSlots(spec);
  if (!slots.some((x) => x.authentic && !x.filled)) return spec;
  const copy = JSON.parse(JSON.stringify(spec)) as ThemeSpec;
  const bySection = new Map<string, ServiceSlot[]>();
  slots.forEach((x) => {
    bySection.set(`${x.template}|${x.sectionId}`, [...(bySection.get(`${x.template}|${x.sectionId}`) ?? []), x]);
    if (!x.authentic || x.filled) return;
    const sec = copy.templates[x.template]?.sections[x.sectionId] as { settings?: Record<string, unknown>; blocks?: Record<string, { settings?: Record<string, unknown> }> } | undefined;
    const target = x.blockId ? sec?.blocks?.[x.blockId] : sec;
    if (target) target.settings = { ...(target.settings ?? {}), [x.assetField ?? x.field]: placeholderFile(x) };
  });
  for (const [k, list] of bySection) {
    const [template, sid] = k.split("|");
    const sec = copy.templates[template]?.sections[sid] as { disabled?: boolean } | undefined;
    if (sec?.disabled && list.some((x) => x.authentic && !x.filled) && list.every((x) => x.filled || x.authentic)) sec.disabled = false;
  }
  return copy;
}

const KIND_TEXT: Record<AuthenticKind, [string, string]> = {
  realisation: ["tes réalisations", "your own work"],
  lieu: ["ton lieu", "your own place"],
  equipe: ["ton équipe", "your team"],
  ville: ["les villes où tu travailles", "the places you work in"],
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/ +/)) {
    if (line && (line + " " + w).length > max) { out.push(line); line = w; } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}

/** Cadre « photo à fournir » : explique que SINA ne peut pas inventer cette photo (texte centré, lisible même petit). */
export function authenticPlaceholderSvg(slot: ServiceSlot, lang: "fr" | "en" = "fr"): string {
  const [w, h] = slot.aspect === "16:9" ? [1600, 900] : slot.aspect === "9:16" ? [900, 1600] : slot.aspect === "1:1" ? [1200, 1200] : [1200, 1500];
  const fr = lang !== "en", kind = KIND_TEXT[slot.authentic ?? "lieu"][fr ? 0 : 1];
  const raw = showsLabel(slot.shows), what = raw ? raw[0].toUpperCase() + raw.slice(1) : "";
  // Tailles proportionnelles au cadre : le texte reste lisible dans une petite vignette.
  const u = Math.min(w, h * 1.4) / 100;
  const chars = (size: number) => Math.max(16, Math.floor((w * 0.8) / (size * 0.52)));
  const why = fr ? `SINA ne peut pas inventer ${kind}.` : `SINA cannot invent ${kind}.`;
  const sizes = { title: 7.5 * u, body: 4.8 * u, what: 4 * u, small: 3.4 * u };
  const lines: { t: string; size: number; weight: number; color: string; gap: number }[] = [
    { t: fr ? "Photo à fournir" : "Photo to provide", size: sizes.title, weight: 700, color: "#1c1c1c", gap: 0 },
    ...wrap(why, chars(sizes.body)).map((t, i) => ({ t, size: sizes.body, weight: 400, color: "#2b2b2b", gap: i ? 0 : 2.4 * u })),
    ...(what ? wrap(fr ? `Ici : ${what}` : `Here: ${what}`, chars(sizes.what)).map((t, i) => ({ t, size: sizes.what, weight: 400, color: "#5a5a5a", gap: i ? 0 : 1.6 * u })) : []),
    ...wrap(fr ? "Ajoute ta vraie photo. Ce cadre n'apparaît jamais sur ton site publié." : "Add your real photo. This frame never shows on your published site.", chars(sizes.small)).map((t, i) => ({ t, size: sizes.small, weight: 400, color: "#6b6b6b", gap: i ? 0 : 2.4 * u })),
  ];
  const lh = (l: { size: number }) => l.size * 1.3;
  const icon = 8 * u, iconGap = 2.4 * u;
  const total = icon + iconGap + lines.reduce((sum, l) => sum + lh(l) + l.gap, 0);
  const top = Math.max(3 * u, (h - total) / 2);
  let y = top + icon + iconGap;
  const r = (n: number) => Math.round(n);
  const text = lines.map((l) => { y += l.gap; y += l.size; const out = `<text x="${w / 2}" y="${r(y)}" text-anchor="middle" font-size="${r(l.size)}" font-weight="${l.weight}" fill="${l.color}">${esc(l.t)}</text>`; y += lh(l) - l.size; return out; }).join("");
  const k = icon / 88;
  const camera = `<g transform="translate(${r(w / 2 - 44 * k)} ${r(top)}) scale(${k.toFixed(3)})" fill="none" stroke="#1c1c1c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="18" width="84" height="62" rx="10"/><path d="M28 18l8-14h16l8 14"/><circle cx="44" cy="49" r="17"/></g>`;
  const pad = r(2 * u);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(`${lines[0].t}. ${why}`)}"><desc>${esc(why)}</desc><rect width="${w}" height="${h}" fill="#f3efe8"/><rect x="${pad}" y="${pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" fill="none" stroke="#b9ab97" stroke-width="${r(0.4 * u)}" stroke-dasharray="${r(1.6 * u)} ${r(1.2 * u)}" rx="${r(1.5 * u)}"/><g font-family="Helvetica, Arial, sans-serif">${camera}${text}</g></svg>`;
}

/**
 * Page de l'aperçu du Studio : chaque cadre « photo à fournir » est inclus dans la page elle-même (aucun fichier à
 * charger), qu'il soit appelé par l'adresse des fichiers du thème ou par son seul nom.
 */
export function inlineAuthenticPlaceholders(html: string, spec: ThemeSpec, base: string, lang: "fr" | "en" = "fr"): string {
  if (!html.includes("es-ph-")) return html;
  const slots = serviceMediaSlots(spec).filter((x) => x.authentic && !x.filled);
  if (!slots.length) return html;
  const byFile = new Map(slots.map((x) => [placeholderFile(x), x]));
  const uri = new Map<string, string>();
  const escBase = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`(?:${escBase}/assets/)?(es-ph-[0-9a-f]{8}\\.svg)(?:\\?[^\\s"'<>)\\\\]*)?`, "g"), (m, name: string) => {
    const slot = byFile.get(name);
    if (!slot) return m;
    if (!uri.has(name)) uri.set(name, `data:image/svg+xml;base64,${Buffer.from(authenticPlaceholderSvg(slot, lang)).toString("base64")}`);
    return uri.get(name)!;
  });
}
