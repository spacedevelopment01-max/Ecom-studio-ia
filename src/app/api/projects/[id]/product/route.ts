import { z } from "zod";
import { all, now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { FactSchema } from "@/lib/project-types";
import { currentTheme, factPlaceholderRegex, saveProduct, saveThemeVersion, remember } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { eachSection } from "@/lib/theme/spec";
import { L } from "@/lib/i18n-server";

/**
 * Mise à jour du produit. Une réponse à une question remplace uniquement les
 * passages « [À compléter : …] » concernés dans la boutique et les
 * publications non envoyées — sans toucher au reste ni aux contenus publiés.
 */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(
    req,
    z.object({
      name: z.string().max(120).optional(),
      price: z.number().int().min(0).nullable().optional(),
      facts: z.array(FactSchema).optional(),
      answers: z.array(z.object({ id: z.string(), answer: z.string().max(2000) })).optional(),
      variants: z.array(z.object({ name: z.string(), values: z.array(z.string()) })).optional(),
    }),
  );
  const prod = { ...p.product };
  const replacements: { needle: RegExp; value: string; label: string }[] = [];
  if (b.name !== undefined) {
    prod.name = b.name;
    prod.nameStatus = "provided";
  }
  if (b.price !== undefined) prod.price = { ...prod.price, amount: b.price, status: b.price === null ? "unknown" : "confirmed" };
  if (b.facts) prod.facts = b.facts;
  if (b.variants) prod.variants = b.variants;
  for (const a of b.answers ?? []) {
    const q = prod.questions.find((x) => x.id === a.id);
    if (!q) continue;
    q.answer = a.answer;
    if (q.factKey === "price") {
      const m = a.answer.replace(/\s/g, "").replace(",", ".").match(/(\d+(?:\.\d{1,2})?)/);
      if (m) prod.price = { ...prod.price, amount: Math.round(Number(m[1]) * 100), status: "confirmed" };
    } else if (q.factKey === "name") {
      prod.name = a.answer;
      prod.nameStatus = "provided";
    } else {
      const f = prod.facts.find((x) => x.key === q.factKey);
      if (f) Object.assign(f, { value: a.answer, status: "confirmed", source: "user" });
      else prod.facts.push({ key: q.factKey, label: q.question.replace(/\?$/, ""), value: a.answer, status: "confirmed", source: "user" });
      const label = (f?.label ?? q.factKey).toLowerCase();
      replacements.push({ needle: factPlaceholderRegex(label, q.factKey), value: a.answer, label });
    }
    remember(p.id, { kind: "fact", key: q.factKey, value: a.answer, source: "user" });
  }
  saveProduct(p.id, prod);

  let themeUpdated = false;
  let postsUpdated = 0;
  if (replacements.length) {
    const cur = currentTheme(p.id);
    if (cur) {
      const spec = cur.spec;
      let changed = 0;
      const patch = (v: unknown): unknown => {
        if (typeof v !== "string") return v;
        let s = v;
        for (const r of replacements) s = s.replace(r.needle, () => (changed++, r.value));
        return s;
      };
      for (const { section } of eachSection(spec)) {
        for (const k of Object.keys(section.settings)) section.settings[k] = patch(section.settings[k]);
        for (const bl of Object.values(section.blocks ?? {})) for (const k of Object.keys(bl.settings)) bl.settings[k] = patch(bl.settings[k]);
      }
      if (changed) {
        saveThemeVersion(p.id, spec, L(`Informations complétées : ${replacements.map((r) => r.label).join(", ")}`, `Details completed: ${replacements.map((r) => r.label).join(", ")}`), "user");
        themeUpdated = true;
      }
    }
    for (const post of all<{ id: string; caption: string }>("SELECT id, caption FROM posts WHERE project_id = ? AND status IN ('draft','review','scheduled')", p.id)) {
      let c = post.caption;
      for (const r of replacements) c = c.replace(r.needle, r.value);
      if (c !== post.caption) {
        run("UPDATE posts SET caption = ?, updated_at = ? WHERE id = ?", c, now(), post.id);
        postsUpdated++;
      }
    }
    // Les textes de la boutique gardés en mémoire sont mis à jour pour les prochaines créations.
    const copyRow = one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'shop_copy'", p.id);
    if (copyRow) {
      let v = copyRow.value;
      for (const r of replacements) v = v.replace(r.needle, r.value.replace(/"/g, '\\"'));
      run("UPDATE memory SET value = ?, updated_at = ? WHERE project_id = ? AND kind = 'artifact' AND key = 'shop_copy'", v, now(), p.id);
    }
  }
  return ok({ product: prod, themeUpdated, postsUpdated });
});
