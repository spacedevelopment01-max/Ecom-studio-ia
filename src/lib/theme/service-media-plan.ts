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
export type ServiceSlot = { key: string; template: string; sectionId: string; blockId?: string; field: string; shows: string; aspect: "1:1" | "4:5" | "16:9" | "9:16"; filled: boolean; /** Section masquée faute de photo : elle réapparaît quand ses photos sont posées. */ hidden?: boolean };

export const SERVICE_PLAN_THEMES = Object.keys((plans as { themes: Record<string, PlanSlot[]> }).themes);
export const hasServicePlan = (direction: string | null | undefined) => !!direction && SERVICE_PLAN_THEMES.includes(direction);

/** Format d'une case : celui de la photo de démonstration, sinon d'après le nom de la section (bandeau large, sinon portrait). */
function aspectOf(s: PlanSlot): ServiceSlot["aspect"] {
  if (s.aspect === "1:1" || s.aspect === "4:5" || s.aspect === "16:9" || s.aspect === "9:16") return s.aspect;
  if (/mobile/.test(s.field)) return "4:5";
  return /hero|banner|bandeau|wide|split|map|cta/.test(`${s.section} ${s.field}`) ? "16:9" : "4:5";
}

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
      const take = (field: string, values: Record<string, unknown> | undefined, blockId?: string, block?: string, bocc?: number) => {
        const p = index.get([template, sec.type, occurrence, block ?? "", bocc ?? "", field].join("|"));
        if (!p) return;
        const v = values?.[field];
        out.push({ key: [template, sid, blockId ?? "", field].join(":"), template, sectionId: sid, ...(blockId ? { blockId } : {}), field, shows: p.shows, aspect: aspectOf(p), filled: typeof v === "string" && !!v && (!spec.files || !!spec.files[v]), ...(sec.disabled ? { hidden: true } : {}) });
      };
      for (const d of sch.settings ?? []) if (d.type === "image_picker") take(d.id, sec.settings);
      const bseen: Record<string, number> = {};
      for (const bid of sec.block_order ?? Object.keys(sec.blocks ?? {})) {
        const b = sec.blocks?.[bid];
        if (!b) continue;
        const bocc = (bseen[b.type] = (bseen[b.type] ?? -1) + 1);
        const bs = (sch.blocks ?? []).find((x) => x.type === b.type);
        for (const d of bs?.settings ?? []) if (d.type === "image_picker") take(d.id, b.settings, bid, b.type, bocc);
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
  target.settings = { ...(target.settings ?? {}), [slot.field]: file };
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
