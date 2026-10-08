/**
 * Éditeur visuel des publicités — fondation (documents en calques, opérations, versions, formats, export).
 * Critère de réussite vérifié SANS aucun appel d'IA : ouvrir une publicité générée, sélectionner son titre, changer
 * son texte, remplacer sa photo, modifier une forme, déplacer son logo, enregistrer et exporter.
 * (L'interface interactive de l'éditeur n'est pas encore livrée : voir reports/remaining-work.md.)
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Éditeur visuel des publicités — documents en calques", async () => {
  const { createUser } = await import("@/lib/auth");
  const { json, one } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset, assetData, saveAsset } = await import("@/lib/library");
  const { runAdEngineV2 } = await import("@/lib/ads-v2/engine");
  const { applyOp, applyOps, History, LockedLayerError, byRole } = await import("@/lib/ad-doc/ops");
  const { reflow } = await import("@/lib/ad-doc/reflow");
  const { localAdEdit } = await import("@/lib/ad-doc/local-edit");
  const { latestDoc, listVersions, saveAndRender, exportDoc, restoreVersion, duplicateDoc, userOwned, AdDocumentSchema, foreignAssets, docImages } = await import("@/lib/ad-doc/store");
  const { renderDocToBuffer, docMetrics } = await import("@/lib/ad-doc/server");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { mockImage } = await import("./image-v2-mock");
  const { mockAdDeps } = await import("./ads-v2-mock");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const u = await createUser(`edit-${Date.now()}@test.fr`, "motdepasse-test", "E");

  /** Une publicité générée par le moteur V2 (outils simulés), avec produit et logo. */
  async function generated() {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const cutId = await seedCutout(u.id, p.id);
    const cut = assetData(getAsset(cutId)!);
    const logoPng = await sharp({ create: { width: 400, height: 120, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } }).png().toBuffer();
    const logo = await saveAsset({ projectId: p.id, userId: u.id, data: logoPng, name: "logo.png", mime: "image/png", role: "logo", origin: "generated" });
    const { deps, log } = mockAdDeps({ userId: u.id, projectId: p.id, cutout: { id: cutId, data: cut }, logo: { id: logo.id, data: logoPng } });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 1, platforms: ["meta_feed"] }, deps));
    const o = r.outcomes.find((x) => x.aspect === "1:1")!;
    const docKey = json<any>(getAsset(o.assetId!)!.meta, {}).adV2.docKey as string;
    return { p, docKey, log, asset: getAsset(o.assetId!)! };
  }

  it("une publicité générée est un document en calques (fond, image, produit, marque, titre, bouton, logo), rendu identique à l'export", async () => {
    const { p, docKey, asset } = await generated();
    const cur = latestDoc(p.id, docKey)!;
    expect(cur.version.source).toBe("engine");
    const roles = cur.doc.layers.map((l) => l.role);
    expect(roles).toEqual(expect.arrayContaining(["title", "cta", "product", "logo", "subtitle"]));
    expect(AdDocumentSchema.safeParse(cur.doc).success).toBe(true);
    // Ce que l'on voit est ce que l'on exporte : même moteur, même image.
    const again = await renderDocToBuffer(cur.doc, await docImages(p.id, cur.doc), "jpeg");
    expect(again.equals(assetData(asset))).toBe(true);
  });

  it("CRITÈRE DE RÉUSSITE — titre, photo, forme, logo modifiés, enregistrés et exportés sans aucun appel d'IA", async () => {
    const { p, docKey, log } = await generated();
    const before = { copy: log.copyCalls.length, reviews: log.reviews, images: log.images.length };
    const calls0 = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE project_id = ?", p.id)!.n;
    let doc = latestDoc(p.id, docKey)!.doc;
    const title = byRole(doc, "title")!;
    const logo = byRole(doc, "logo")!;
    const photo = doc.layers.find((l) => l.kind === "image" && (l.role === "image" || l.role === "background"));
    // 1. Sélection du titre et nouveau texte.
    doc = applyOp(doc, { op: "text", id: title.id, text: "Mon nouveau titre, écrit à la main" });
    // 2. Photo remplacée par une image de la bibliothèque.
    const newPhoto = await saveAsset({ projectId: p.id, userId: u.id, data: await mockImage(77, 1600, 1200), name: "photo.jpg", mime: "image/jpeg", role: "ambiance", origin: "upload" });
    if (photo) doc = applyOp(doc, { op: "image", id: photo.id, assetId: newPhoto.id });
    else doc = applyOp(doc, { op: "add", index: 1, layer: { id: "photo-client", name: "Photo", role: "image", kind: "image", assetId: newPhoto.id, fit: "cover", crop: null, radius: 24, shadow: null, x: 0, y: 0, w: doc.width, h: doc.height * 0.4, rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "stretch", v: "top" } } });
    // 3. Forme ajoutée puis modifiée (couleur, arrondi, rotation).
    doc = applyOp(doc, { op: "add", layer: { id: "pastille", name: "Pastille", role: "decor", kind: "shape", shape: "ellipse", fill: "#D81B60", stroke: null, radius: 0, shadow: null, x: 60, y: 60, w: 120, h: 120, rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "left", v: "top" } } });
    doc = applyOp(doc, { op: "fill", id: "pastille", fill: { type: "linear", angle: 45, stops: [{ offset: 0, color: "#D81B60" }, { offset: 1, color: "rgba(216,27,96,0.4)" }] } });
    doc = applyOp(doc, { op: "rotate", id: "pastille", rotation: 15 });
    // 4. Logo déplacé en haut à droite.
    doc = applyOp(doc, { op: "move", id: logo.id, x: doc.width - doc.safe.side - logo.w, y: doc.safe.top });
    // 5. Enregistrement (nouvelle version + rendu dans la bibliothèque), puis exports.
    const v = await saveAndRender(p.id, u.id, docKey, doc, "test");
    expect(v.version).toBe(2);
    const saved = latestDoc(p.id, docKey)!.doc;
    expect(byRole(saved, "title")!.userEdited).toBe(true);
    expect((byRole(saved, "title") as any).text).toBe("Mon nouveau titre, écrit à la main");
    expect(byRole(saved, "logo")!.y).toBe(doc.safe.top);
    const png = await exportDoc(p.id, saved, "png");
    const jpg = await exportDoc(p.id, saved, "jpeg");
    const editable = await exportDoc(p.id, saved, "json");
    expect((await sharp(png.data).metadata()).format).toBe("png");
    expect((await sharp(jpg.data).metadata()).width).toBe(saved.width);
    expect(AdDocumentSchema.safeParse(JSON.parse(editable.data.toString())).success).toBe(true);
    expect(jpg.data.equals(assetData(getAsset(v.renderedAssetId!)!))).toBe(true);
    // Aucun appel d'IA, aucune image ni relecture payées.
    expect({ copy: log.copyCalls.length, reviews: log.reviews, images: log.images.length }).toEqual(before);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE project_id = ?", p.id)!.n).toBe(calls0);
  });

  it("calques : masquer, verrouiller (refus de déplacer), réordonner, dupliquer, supprimer ; annuler / rétablir", async () => {
    const { p, docKey } = await generated();
    const h = new History(latestDoc(p.id, docKey)!.doc);
    const t = byRole(h.current, "title")!;
    h.apply({ op: "lock", id: t.id, locked: true });
    expect(() => h.apply({ op: "move", id: t.id, x: 0, y: 0 })).toThrow(LockedLayerError);
    h.apply({ op: "lock", id: t.id, locked: false });
    h.apply({ op: "visible", id: t.id, visible: false });
    h.apply({ op: "reorder", id: t.id, index: 0 });
    expect(h.current.layers[0].id).toBe(t.id);
    h.apply({ op: "duplicate", id: t.id, newId: "titre-2" });
    h.apply({ op: "remove", id: "titre-2" });
    expect(h.current.layers.some((l) => l.id === "titre-2")).toBe(false);
    h.undo();
    expect(h.current.layers.some((l) => l.id === "titre-2")).toBe(true);
    h.redo();
    expect(h.current.layers.some((l) => l.id === "titre-2")).toBe(false);
    while (h.canUndo) h.undo();
    expect(byRole(h.current, "title")!.visible).toBe(true);
  });

  it("autre format : modifications conservées, textes et produit entiers dans la zone sûre", async () => {
    const { p, docKey } = await generated();
    let doc = latestDoc(p.id, docKey)!.doc;
    doc = applyOp(doc, { op: "text", id: byRole(doc, "title")!.id, text: "Texte du client" });
    doc = applyOp(doc, { op: "fill", id: byRole(doc, "cta")!.id, fill: "#2E7D32" });
    for (const [w, h, aspect] of [[1080, 1920, "9:16"], [1920, 1080, "16:9"], [2400, 800, "3:1"], [1080, 1350, "4:5"]] as const) {
      const safe = { top: Math.round(h * 0.1), bottom: Math.round(h * 0.12), side: Math.round(w * 0.06) };
      const next = reflow(doc, { width: w, height: h, aspect, safe });
      expect((byRole(next, "title") as any).text).toBe("Texte du client");
      expect((byRole(next, "cta") as any).fill).toBe("#2E7D32");
      for (const l of next.layers.filter((x) => ["title", "cta", "logo", "product"].includes(x.role))) {
        expect(l.x, `${aspect} ${l.role}`).toBeGreaterThanOrEqual(safe.side - 1);
        expect(l.x + l.w, `${aspect} ${l.role}`).toBeLessThanOrEqual(w - safe.side + 1);
        expect(l.y + l.h, `${aspect} ${l.role}`).toBeLessThanOrEqual(h - safe.bottom + 1);
      }
      expect(next.width).toBe(w);
    }
  });

  it("retouches en langage naturel : simples → locales et gratuites, ciblées ; génération → annoncée, jamais lancée", async () => {
    const { p, docKey } = await generated();
    const doc = latestDoc(p.id, docKey)!.doc;
    const big = localAdEdit(doc, "Mets le titre plus grand.");
    expect(big.local).toBe(true);
    if (big.local) {
      expect((byRole(big.doc, "title") as any).font.size).toBeGreaterThan((byRole(doc, "title") as any).font.size);
      expect(big.doc.layers.filter((l, i) => JSON.stringify(l) !== JSON.stringify(doc.layers[i])).map((l) => l.role)).toEqual(["title"]);
    }
    const btn = localAdEdit(doc, "Change la couleur du bouton en vert");
    expect(btn.local && (byRole(btn.doc, "cta") as any).fill).toBe("#2E7D32");
    const lg = localAdEdit(doc, "Déplace le logo en haut à droite");
    expect(lg.local && byRole(lg.doc, "logo")!.y).toBe(doc.safe.top);
    const bg = localAdEdit(doc, "Remplace l'arrière-plan par une ambiance premium");
    expect(bg).toMatchObject({ local: false, paid: { kind: "image" } });
    expect(localAdEdit(doc, "Fais une version plus élégante")).toMatchObject({ local: false, paid: { kind: "creative" } });
  });

  it("modifications préservées : une régénération n'écrase jamais une création modifiée ; versions, restauration, duplication", async () => {
    const { p, docKey } = await generated();
    let doc = latestDoc(p.id, docKey)!.doc;
    doc = applyOp(doc, { op: "text", id: byRole(doc, "title")!.id, text: "Choix du client" });
    await saveAndRender(p.id, u.id, docKey, doc);
    expect(userOwned(p.id, docKey)).toBe(true);
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id, cutout: null });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 1, platforms: ["meta_feed"] }, deps));
    expect(r.outcomes.some((o) => o.reason.includes("modifiée par le client"))).toBe(true);
    expect((byRole(latestDoc(p.id, docKey)!.doc, "title") as any).text).toBe("Choix du client");
    expect(listVersions(p.id, docKey).length).toBe(2);
    restoreVersion(p.id, docKey, 1);
    expect((byRole(latestDoc(p.id, docKey)!.doc, "title") as any).text).not.toBe("Choix du client");
    expect(listVersions(p.id, docKey).length).toBe(3); // rien n'est perdu
    const copy = duplicateDoc(p.id, docKey);
    expect(copy.docKey).not.toBe(docKey);
  });

  it("contrôles signalés après modification (lisibilité, zone sûre) ; images d'un autre projet refusées", async () => {
    const { p, docKey } = await generated();
    let doc = latestDoc(p.id, docKey)!.doc;
    doc = applyOp(doc, { op: "color", id: byRole(doc, "title")!.id, color: doc.layers.find((l) => l.role === "background" || l.role === "shape") ? "#F7F7F7" : "#FFFFFF" });
    doc = applyOp(doc, { op: "move", id: byRole(doc, "cta")!.id, x: 0, y: doc.height - 10 });
    const m = docMetrics(doc, await docImages(p.id, doc));
    expect(m.problems.map((x) => x.code)).toContain("safe_zone");
    const other = loadProject(seedImageFixture(u.id, "saas"));
    const foreign = await saveAsset({ projectId: other.id, userId: u.id, data: await mockImage(5, 800, 600), name: "x.jpg", mime: "image/jpeg", role: "ambiance", origin: "upload" });
    const bad = applyOp(doc, { op: "add", layer: { id: "x", name: "x", role: "image", kind: "image", assetId: foreign.id, fit: "cover", crop: null, radius: 0, shadow: null, x: 0, y: 0, w: 10, h: 10, rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "left", v: "top" } } });
    expect(foreignAssets(p.id, bad)).toEqual([foreign.id]);
    expect(applyOps(doc, []).layers.length).toBe(doc.layers.length);
  });
});
