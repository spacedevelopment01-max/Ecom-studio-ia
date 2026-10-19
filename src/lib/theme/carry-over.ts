/**
 * Changement de thème et nouveau remplissage automatique sans perdre le travail du client (mission du 19 octobre,
 * issue #137, §4 et §5) :
 *
 *  - `userAdditions(baseline, current)` : les sections que le client a ajoutées depuis la composition automatique
 *    (absentes de la version composée par le studio, présentes dans la version courante), avec leurs réglages ;
 *  - `carryOver(fresh, additions, ctx)` : après une recomposition (autre thème ou même thème), ces sections sont
 *    reportées dans la nouvelle composition : visibles si elles sont compatibles avec le thème installé et la catégorie
 *    du projet, posées MASQUÉES sinon (jamais supprimées en silence), et listées dans un compte rendu ;
 *  - `manualEdits(baseline, current)` / `reapplyEdits(fresh, edits)` : les réglages que le client a modifiés sur les
 *    sections composées (même identifiant, même type) sont réappliqués sur la nouvelle composition ; quand le
 *    remplissage automatique propose lui aussi une nouvelle valeur pour le même réglage, la valeur du client gagne et
 *    le conflit est signalé.
 *
 * Module pur (aucun accès serveur) : testé à part, utilisé par le moteur de composition.
 */
import type { SectionInstance, TemplateJson, ThemeSpec } from "./spec";
import { fitContextOf, sectionFitReason } from "./section-fit";
import type { StoreKind } from "./store-kind";

type Templates = Record<string, TemplateJson>;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export type Addition = { template: string; id: string; section: SectionInstance; after: string | null };
export type Edit = { template: string; id: string; type: string; key: string; value: unknown; before: unknown };

export type CarryReport = {
  /** Sections du client reportées visibles. */
  kept: { template: string; id: string; type: string }[];
  /** Sections du client devenues incompatibles : reportées masquées, avec le motif. */
  hidden: { template: string; id: string; type: string; reason: string }[];
  /** Réglages du client réappliqués (section, réglage). */
  reapplied: { template: string; id: string; key: string }[];
  /** Réglages où la nouvelle composition proposait une autre valeur : la valeur du client a été gardée. */
  conflicts: { template: string; id: string; key: string; kept: unknown; proposed: unknown }[];
  /** Réglages du client sans équivalent dans la nouvelle composition (section ou type disparu) : non réappliqués. */
  dropped: { template: string; id: string; key: string }[];
};

export const emptyReport = (): CarryReport => ({ kept: [], hidden: [], reapplied: [], conflicts: [], dropped: [] });

/** Sections présentes dans la version courante mais absentes de la version composée par le studio (ajouts du client). */
export function userAdditions(baseline: Pick<ThemeSpec, "templates">, current: Pick<ThemeSpec, "templates">): Addition[] {
  const out: Addition[] = [];
  for (const [template, tpl] of Object.entries(current.templates)) {
    const base = baseline.templates[template];
    tpl.order.forEach((id, i) => {
      const s = tpl.sections[id];
      if (!s || base?.sections[id]) return;
      if (s.type.startsWith("main-")) return;
      out.push({ template, id, section: clone(s), after: i > 0 ? tpl.order[i - 1] : null });
    });
  }
  return out;
}

/** Réglages (et blocs) modifiés par le client sur les sections composées : même identifiant dans les deux versions. */
export function manualEdits(baseline: Pick<ThemeSpec, "templates">, current: Pick<ThemeSpec, "templates">): Edit[] {
  const out: Edit[] = [];
  for (const [template, tpl] of Object.entries(current.templates)) {
    const base = baseline.templates[template];
    if (!base) continue;
    for (const id of tpl.order) {
      const cur = tpl.sections[id], before = base.sections[id];
      if (!cur || !before || cur.type !== before.type) continue;
      for (const [key, value] of Object.entries(cur.settings)) if (!same(value, before.settings[key])) out.push({ template, id, type: cur.type, key, value: clone(value), before: clone(before.settings[key]) });
      if (!same(cur.blocks ?? {}, before.blocks ?? {}) || !same(cur.block_order ?? [], before.block_order ?? [])) out.push({ template, id, type: cur.type, key: "@blocks", value: { blocks: clone(cur.blocks ?? {}), block_order: clone(cur.block_order ?? []) }, before: { blocks: clone(before.blocks ?? {}), block_order: clone(before.block_order ?? []) } });
      if (!!cur.disabled !== !!before.disabled) out.push({ template, id, type: cur.type, key: "@disabled", value: !!cur.disabled, before: !!before.disabled });
    }
  }
  return out;
}

/**
 * Reporte les ajouts du client dans la nouvelle composition. Une section compatible garde sa visibilité ; une section
 * incompatible avec le thème installé ou la catégorie est posée masquée et signalée. Position : après la section qui
 * la précédait si elle existe encore, sinon à la fin du gabarit.
 */
export function carryOver(fresh: ThemeSpec, additions: Addition[], kind: StoreKind | null, lang: "fr" | "en" = "fr", report = emptyReport()): { spec: ThemeSpec; report: CarryReport } {
  const spec = clone(fresh);
  const ctx = fitContextOf(spec, kind);
  for (const a of additions) {
    const tpl: TemplateJson = spec.templates[a.template] ?? (spec.templates[a.template] = { order: [], sections: {} });
    let id = a.id;
    while (tpl.sections[id]) id = `${a.id}_${Math.random().toString(36).slice(2, 6)}`;
    const reason = sectionFitReason(a.section.type, ctx, lang);
    const section = { ...clone(a.section), ...(reason ? { disabled: true } : {}) };
    tpl.sections[id] = section;
    const at = a.after ? tpl.order.indexOf(a.after) : -1;
    if (at >= 0) tpl.order.splice(at + 1, 0, id);
    else tpl.order.push(id);
    if (reason) report.hidden.push({ template: a.template, id, type: section.type, reason });
    else report.kept.push({ template: a.template, id, type: section.type });
  }
  return { spec, report };
}

/** Réapplique les réglages du client sur la nouvelle composition (même section, même type) ; la valeur du client gagne. */
export function reapplyEdits(fresh: ThemeSpec, edits: Edit[], baseline: Pick<ThemeSpec, "templates">, report = emptyReport()): { spec: ThemeSpec; report: CarryReport } {
  const spec = clone(fresh);
  for (const e of edits) {
    const s = spec.templates[e.template]?.sections[e.id];
    if (!s || s.type !== e.type) { report.dropped.push({ template: e.template, id: e.id, key: e.key }); continue; }
    const proposed = e.key === "@blocks" ? { blocks: s.blocks ?? {}, block_order: s.block_order ?? [] } : e.key === "@disabled" ? !!s.disabled : s.settings[e.key];
    const baseValue = e.before;
    if (!same(proposed, baseValue) && !same(proposed, e.value)) report.conflicts.push({ template: e.template, id: e.id, key: e.key, kept: e.value, proposed });
    if (e.key === "@blocks") { const v = e.value as { blocks: SectionInstance["blocks"]; block_order: string[] }; s.blocks = clone(v.blocks); s.block_order = clone(v.block_order); }
    else if (e.key === "@disabled") { if (e.value) s.disabled = true; else delete s.disabled; }
    else s.settings[e.key] = clone(e.value);
    report.reapplied.push({ template: e.template, id: e.id, key: e.key });
  }
  return { spec, report };
}

/** Résumé lisible du compte rendu (annexé au résumé de la version). */
export function describeReport(r: CarryReport, lang: "fr" | "en" = "fr"): string {
  const parts: string[] = [];
  const n = (k: number, fr: string, en: string) => (lang === "en" ? `${k} ${en}${k > 1 ? "s" : ""}` : `${k} ${fr}${k > 1 ? "s" : ""}`);
  if (r.kept.length) parts.push(n(r.kept.length, "section du client reportée", "client section carried over"));
  if (r.hidden.length) parts.push(lang === "en" ? `${r.hidden.length} client section${r.hidden.length > 1 ? "s" : ""} incompatible with this theme or category, kept hidden (${r.hidden.map((x) => x.type).join(", ")})` : `${r.hidden.length} section${r.hidden.length > 1 ? "s" : ""} du client incompatible${r.hidden.length > 1 ? "s" : ""} avec ce thème ou cette catégorie, conservée${r.hidden.length > 1 ? "s" : ""} masquée${r.hidden.length > 1 ? "s" : ""} (${r.hidden.map((x) => x.type).join(", ")})`);
  if (r.reapplied.length) parts.push(n(r.reapplied.length, "réglage du client réappliqué", "client setting reapplied"));
  if (r.conflicts.length) parts.push(lang === "en" ? `${r.conflicts.length} conflict${r.conflicts.length > 1 ? "s" : ""}: the client's value was kept over the new automatic one` : `${r.conflicts.length} conflit${r.conflicts.length > 1 ? "s" : ""} : la valeur du client a été gardée face à la nouvelle valeur automatique`);
  if (r.dropped.length) parts.push(lang === "en" ? `${r.dropped.length} client setting${r.dropped.length > 1 ? "s" : ""} without equivalent in the new composition` : `${r.dropped.length} réglage${r.dropped.length > 1 ? "s" : ""} du client sans équivalent dans la nouvelle composition`);
  return parts.join(" · ");
}

/** Réglages et sections à préserver : calculés entre la dernière composition automatique et la version courante. */
export function preservation(baseline: Pick<ThemeSpec, "templates"> | null, current: Pick<ThemeSpec, "templates">): { additions: Addition[]; edits: Edit[] } {
  if (!baseline) return { additions: [], edits: [] };
  return { additions: userAdditions(baseline, current), edits: manualEdits(baseline, current) };
}

/** Applique ajouts et réglages du client sur une composition fraîche, dans l'ordre : réglages puis ajouts. */
export function preserve(fresh: ThemeSpec, p: { additions: Addition[]; edits: Edit[] }, baseline: Pick<ThemeSpec, "templates"> | null, kind: StoreKind | null, lang: "fr" | "en" = "fr"): { spec: ThemeSpec; report: CarryReport } {
  const report = emptyReport();
  const a = baseline ? reapplyEdits(fresh, p.edits, baseline, report) : { spec: fresh, report };
  return carryOver(a.spec, p.additions, kind, lang, report);
}

export type { Templates };
