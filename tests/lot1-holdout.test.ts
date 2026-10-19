/** Validation ajoutée après correction ; vrais moteurs, aucun appel IA. */
import { describe, it, expect } from "vitest";
import { HOLDOUTS, seedHoldout } from "./lot1-holdout-fixtures";
import { createUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { runWithLang } from "@/lib/i18n-server";
import { runContentEngineV2, saveUserEdit } from "@/lib/seo-v2/engine";
import { localOnlyDeps } from "@/lib/seo-v2/deps";
import { composeThemeV2 } from "@/lib/theme-v2/engine";
import { renderPage } from "@/lib/theme/render";
import { cmsExport } from "@/lib/cms-v2/export";
import { shopifyProductsCsv } from "@/lib/theme/catalog-export";
import { latestContent } from "@/lib/seo-v2/store";
import { unzipSync, strFromU8 } from "fflate";

describe("Lot 1 — validation indépendante", async () => {
  const user = await createUser(`holdout-${Date.now()}@example.invalid`, "test-only-password", "Données synthétiques");
  it.each(HOLDOUTS.map((c, i) => [c.key, i] as const))("%s : texte complet, métadonnées, rendu et export après renommage du projet", async (_key, index) => {
    await runWithLang({ content: "fr", ui: "fr" }, async () => {
      const pid = seedHoldout(user.id, index);
      const services = HOLDOUTS[index].business === "services";
      const result = await runContentEngineV2(null, pid, { type: services ? "service_page" : "product_page", pageKey: services ? "service:offer-one" : "product:main" }, localOnlyDeps());
      const ending = `Formulation conservée pour le cas ${index}, sans réduction du dernier paragraphe.`;
      const edited = { ...result.doc!, blocks: [{ id: "h", kind: "h1" as const, text: `Titre complet ${index}` }, { id: "intro", kind: "p" as const, text: (HOLDOUTS[index].detail + " ").repeat(25) }, { id: "end", kind: "p" as const, text: ending }] };
      saveUserEdit(pid, result.docKey!, edited);
      run("UPDATE projects SET name=? WHERE id=?", "Projet renommé sans logique dédiée", pid);
      const built = await composeThemeV2(pid);
      const page = built.spec.store.pages.find((p) => p.handle === "texte-service-offer-one");
      const target = services ? page!.body_html : built.spec.store.product.description_html;
      expect(target).toContain(ending);
      const url = services ? `/pages/${page!.handle}` : `/products/${built.spec.store.product.handle}`;
      const rendered = await renderPage({ spec: built.spec, base: "", cart: [] }, url, new URLSearchParams());
      expect(rendered.status).toBe(200);
      expect(rendered.html).toContain(ending);
      const exp = await cmsExport("shopify", built.spec, () => null);
      expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
      if (services) expect(Object.values(unzipSync(exp.zip)).map((b) => strFromU8(b)).join("\n")).toContain(ending);
      else expect(shopifyProductsCsv(built.spec)).toContain(ending);
      expect(latestContent(pid, result.docKey!)!.doc.blocks).toEqual(edited.blocks);
    });
  });
});
