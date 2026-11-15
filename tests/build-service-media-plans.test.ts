/**
 * Générateur (lancé à la main : BUILD_SERVICE_PLANS=1 npx vitest run tests/build-service-media-plans.test.ts) des
 * « listes de photos » des 6 thèmes de services construits sans plan d'emplacements (TABLE SAISON, ATELIER NUANCE,
 * PARENTHÈSE, PHASE, MAISON & HORIZON, APLAT) : chaque case d'image qui porte une photo dans la démonstration du thème
 * (kits de Thomas) devient un emplacement à remplir pour un client (page, section, champ, format, ce que la photo
 * montrait). Écrit src/lib/theme/service-media-plans.json. Sans la variable, le test est sauté.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const BUILD = process.env.BUILD_SERVICE_PLANS === "1";

describe.skipIf(!BUILD)("listes de photos des thèmes de services", () => {
  it("construit les listes d'après les démonstrations", async () => {
    const { account } = await import("./conversation209-fixtures");
    const { sectionSchema } = await import("@/lib/theme/spec");
    const { getAsset } = await import("@/lib/library");
    const builders: Record<string, () => Promise<{ spec: any }>> = {};
    const user = await account();
    builders["table-saison"] = async () => (await import("./table-saison-fixtures")).tableSaisonProject(user.id);
    builders["atelier-nuance"] = async () => (await import("./atelier-nuance-fixtures")).atelierNuanceProject(user.id) as any;
    builders["parenthese"] = async () => (await import("./parenthese-fixtures")).parentheseProject(user.id) as any;
    builders["phase"] = async () => (await import("./phase-fixtures")).phaseProject(user.id) as any;
    builders["maison-horizon"] = async () => (await import("./maison-horizon-fixtures")).maisonHorizonProject(user.id) as any;
    builders["aplat"] = async () => (await import("./aplat-fixtures")).aplatProject(user.id) as any;
    const out: Record<string, unknown[]> = {};
    for (const [theme, build] of Object.entries(builders)) {
      const { spec } = await build();
      const slots: unknown[] = [];
      const kitDescription = (file: string) => file.replace(/\.(webp|jpg|png)$/, "").replace(/^[a-z]+(-[a-z]+)?-(?=[a-z])/, (m) => (m.length > 14 ? "" : "")).replace(/-/g, " ");
      const aspectOf = (file: string) => {
        const id = spec.files?.[file];
        const a = id ? getAsset(id) : undefined;
        const r = a?.width && a?.height ? a.width / a.height : null;
        return r == null ? null : r < 0.7 ? "9:16" : r < 0.95 ? "4:5" : r > 1.2 ? "16:9" : "1:1";
      };
      /** Cases d'image d'un réglage : la case photo du client (image_picker) et, pour un fichier du thème « x_asset », la case « x ». */
      const fieldsOf = (settingsDef: any[], values: Record<string, unknown>) => {
        const out: { field: string; shows: string; aspect: string | null }[] = [];
        const pickers = new Set(settingsDef.filter((d) => d.type === "image_picker").map((d) => d.id));
        for (const d of settingsDef) {
          const v = values?.[d.id];
          if (typeof v !== "string" || !v) continue;
          if (d.type === "image_picker") out.push({ field: d.id, shows: "", aspect: aspectOf(v) });
          else if (/_asset$/.test(d.id) && !/^logo/.test(d.id) && /\.(webp|jpg|png)$/.test(v)) {
            const base = d.id.replace(/_asset$/, ""), picker = pickers.has(base) ? base : pickers.has(`${base}_image`) ? `${base}_image` : null;
            if (picker && !values[picker]) out.push({ field: picker, shows: kitDescription(v), aspect: null });
          }
        }
        return out;
      };
      for (const [template, t] of Object.entries<any>(spec.templates)) {
        const seen: Record<string, number> = {};
        for (const sid of t.order ?? Object.keys(t.sections)) {
          const s = t.sections[sid];
          if (!s || s.disabled) continue;
          const occurrence = (seen[s.type] = (seen[s.type] ?? -1) + 1);
          const sch: any = sectionSchema(spec, s.type);
          if (!sch) continue;
          for (const f of fieldsOf(sch.settings ?? [], s.settings ?? {})) slots.push({ template, section: s.type, occurrence, ...f });
          const bseen: Record<string, number> = {};
          for (const bid of s.block_order ?? Object.keys(s.blocks ?? {})) {
            const b = s.blocks?.[bid];
            if (!b) continue;
            const bocc = (bseen[b.type] = (bseen[b.type] ?? -1) + 1);
            const bs = (sch.blocks ?? []).find((x: any) => x.type === b.type);
            for (const f of fieldsOf(bs?.settings ?? [], b.settings ?? {})) slots.push({ template, section: s.type, occurrence, block: b.type, blockOccurrence: bocc, ...f });
          }
        }
      }
      // Une même photo de démonstration posée deux fois (bureau et téléphone) reste deux cases : le client voit les deux.
      out[theme] = slots;
      expect(slots.length, theme).toBeGreaterThan(3);
    }
    const file = path.join(process.cwd(), "src", "lib", "theme", "service-media-plans.json");
    fs.writeFileSync(file, JSON.stringify({ source: "démonstrations des thèmes (kits de Thomas)", generatedAt: new Date().toISOString().slice(0, 10), themes: out }, null, 1));
    for (const [k, v] of Object.entries(out)) console.log(k, v.length, "photos");
  }, 600_000);
});
