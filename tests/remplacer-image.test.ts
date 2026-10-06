/**
 * Discussion de la boutique : « Remplace cette image par celle-ci » sur une image désignée dans l'aperçu,
 * avec une image jointe — fonctionne sans IA et ne touche que l'emplacement désigné.
 */
import { describe, expect, it } from "vitest";
import { applyOps } from "@/lib/theme/ops";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { localMediaReplace, mediaTargetOf } from "@/lib/theme/image-target";
import { runWithLang } from "@/lib/i18n-server";
import { sampleSpec } from "./fixtures";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const att = { assetId: "asset-neuve", name: "nouvelle-photo.jpg", kind: "image" };

/** Première section de l'accueil dont une image vient d'un réglage *_asset rempli, avec l'adresse affichée. */
async function imageInPreview(spec: ReturnType<typeof sampleSpec>) {
  const html = (await renderPage({ spec, base: "/p", files: compileTheme(spec), cart: [] }, "/", new URLSearchParams())).html;
  for (const id of spec.templates.index.order) {
    const s = spec.templates.index.sections[id];
    const all = [{ block: undefined as string | undefined, settings: s.settings }, ...Object.entries(s.blocks ?? {}).map(([b, v]) => ({ block: b, settings: v.settings }))];
    for (const { block, settings } of all)
      for (const [k, v] of Object.entries(settings ?? {}))
        if (k.endsWith("_asset") && !/video/.test(k) && typeof v === "string" && v && html.includes(`/assets/${v}`)) {
          const src = html.match(new RegExp(`src="([^"]*/assets/${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"]*)"`))?.[1];
          if (src) return { id, block, key: k, file: v, src };
        }
  }
  throw new Error("aucune image trouvée");
}

describe("remplacer une image désignée", () => {
  it("l'adresse de l'image désigne le bon réglage", async () => {
    const spec = sampleSpec();
    const img = await imageInPreview(spec);
    const t = mediaTargetOf(spec, { template: "index", section: img.id, kind: "Image", tag: "img", src: img.src });
    expect(t).toMatchObject({ section: img.id, key: img.key, current: img.file, ...(img.block ? { block: img.block } : {}) });
  });

  it("sans IA : use_media appliqué, seul cet emplacement change", async () => {
    const spec = sampleSpec();
    const img = await imageInPreview(spec);
    const sel = { template: "index", section: img.id, kind: "Image", tag: "img", src: img.src };
    const r = fr(() => localMediaReplace(spec, "Remplace cette image par celle-ci", sel, [att]))!;
    expect(r.ops).toEqual([{ op: "use_media", template: "index", section: img.id, ...(img.block ? { block: img.block } : {}), key: img.key, assetId: "asset-neuve" }]);
    expect(r.reply).toMatch(/remplacée/);
    const before = JSON.stringify(spec.templates.index.sections);
    const out = fr(() => applyOps(spec, r.ops, { mediaFile: (id) => (id === "asset-neuve" ? { filename: "chat-nouvelle-photo.jpg" } : null) }));
    expect(out.rejected).toEqual([]);
    const s = out.spec.templates.index.sections[img.id];
    const target = img.block ? s.blocks![img.block] : s;
    expect(target.settings[img.key]).toBe("chat-nouvelle-photo.jpg");
    expect(out.spec.files["chat-nouvelle-photo.jpg"]).toBe("asset-neuve");
    // Les autres sections ne bougent pas.
    const old = JSON.parse(before);
    for (const id of spec.templates.index.order) if (id !== img.id) expect(out.spec.templates.index.sections[id]).toEqual(old[id]);
  });

  it("sans image jointe : explique comment joindre la nouvelle image", async () => {
    const spec = sampleSpec();
    const img = await imageInPreview(spec);
    const r = fr(() => localMediaReplace(spec, "remplace cette image", { template: "index", section: img.id, kind: "Image", src: img.src }, []))!;
    expect(r.ops).toEqual([]);
    expect(r.reply).toMatch(/trombone/);
  });

  it("image jointe sans désignation : demande de désigner l'image", () => {
    const spec = sampleSpec();
    const r = fr(() => localMediaReplace(spec, "remplace l'image du haut par celle-ci", null, [att]))!;
    expect(r.ops).toEqual([]);
    expect(r.reply).toMatch(/viseur|cible/);
  });

  it("demande sans rapport avec une image : le moteur local habituel prend le relais", () => {
    const spec = sampleSpec();
    expect(fr(() => localMediaReplace(spec, "ajoute une FAQ", null, []))).toBeNull();
  });
});
