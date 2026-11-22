/**
 * « Mes créations » : un lien pose vraiment l'image à l'endroit choisi (limites de l'atelier, point 3), pour l'écran
 * comme pour SINA. Brouillon de publication avec l'image, publicité préparée avec l'image (rien n'est publié ni
 * diffusé), photo d'une section du site ; jamais une création ratée, « produit modifié », refusée ou pas vérifiée ; les
 * photos des produits restent sur leurs emplacements ; jamais deux fois la même photo sur le site.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const state = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<any>()), requireUser: async () => state.user, currentUser: async () => state.user }));
import { createUser } from "@/lib/auth";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { json, one, run } from "@/lib/db";
import { seedImageFixture } from "./image-v2-fixtures";
import { saveAsset } from "@/lib/library";
import { POST as atelierPost } from "@/app/api/projects/[id]/atelier/route";
import { inscrireCreation, mesCreations } from "@/lib/atelier/journal";
import { allSections, loadCustomTheme, saveCustomTheme, sectionHtml } from "@/lib/syna-agent/custom-theme/theme";
import { libSection } from "@/lib/syna-agent/custom-theme/library";
import { isCutoutPhoto } from "@/lib/syna-agent/custom-theme/library";
import { getTool } from "@/lib/syna-agent/registry";

beforeEach(() => { vi.stubGlobal("fetch", vi.fn(() => { throw Error("HTTP provider forbidden"); })); });
afterEach(() => vi.unstubAllGlobals());

async function fixture(plan: "creer" | "vendre" | "dominer" = "dominer") {
  const u = await createUser(`poser-${crypto.randomUUID()}@example.invalid`, "synthetic-test-only", "Test");
  state.user = { ...u, role: "client" };
  const pid = seedImageFixture(u.id, "cosmetic");
  grantProjectPlan(pid, plan);
  const creation = async (status: "ok" | "rate" | "produit_modifie" = "ok", couleur = "#cba") => {
    const data = await sharp({ create: { width: 80, height: 100, channels: 3, background: couleur } }).jpeg().toBuffer();
    const a = await saveAsset({ userId: u.id, projectId: pid, data, name: "scene.jpg", mime: "image/jpeg", role: "lifestyle", origin: "generated", status: "review" });
    return { asset: a, id: inscrireCreation({ projectId: pid, userId: u.id, assetId: a.id, geste: "scene", mode: "sina", kind: "image", provider: "openai", model: "gpt-image-2.6-flare", costMicro: 1000, status }) };
  };
  const ctx = { params: Promise.resolve({ id: pid }) };
  const poser = (b: Record<string, unknown>) => atelierPost(new Request(`http://localhost/api/projects/${pid}/atelier`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "poser", ...b }) }), ctx);
  return { u, pid, creation, poser };
}

describe("poser une création là où le client la veut", () => {
  it("« Une publication » : un brouillon avec l'image (rien n'est publié), une seule fois ; la création compte comme servie", async () => {
    const f = await fixture();
    const c = await f.creation();
    const r = await f.poser({ creationId: c.id, cible: "publication" });
    expect(r.status, await r.clone().text()).toBe(200);
    const j = await r.json();
    const post = one<{ status: string; media: string; caption: string }>("SELECT status, media, caption FROM posts WHERE id=?", j.postId)!;
    expect(post.status).toBe("review");
    expect(json(post.media, [])).toEqual([c.asset.id]);
    expect(post.caption).toBe("");
    expect(j.lien).toBe(`/studio/${f.pid}/publications`);
    expect((await (await f.poser({ creationId: c.id, cible: "publication" })).json())).toMatchObject({ postId: j.postId, deja: true });
    expect(mesCreations(f.pid).find((x) => x.id === c.id)).toMatchObject({ servie: true, usages: ["post"] });
  });

  it("« Une publicité » : une publicité préparée avec l'image, en brouillon, textes à écrire ; pas sans un forfait qui comprend les publicités", async () => {
    const f = await fixture();
    const c = await f.creation();
    const j = await (await f.poser({ creationId: c.id, cible: "publicite" })).json();
    const camp = one<{ status: string; plan: string }>("SELECT status, plan FROM campaigns WHERE id=?", j.campaignId)!;
    expect(camp.status).toBe("draft");
    const ad = json<any>(camp.plan, {}).ads[0];
    expect(ad.media[0].id).toBe(c.asset.id);
    expect([ad.primary, ad.headline, ad.cta]).toEqual(["", "", ""]);
    expect(mesCreations(f.pid).find((x) => x.id === c.id)?.usages).toContain("campaign");
    const petit = await fixture("creer");
    const c2 = await petit.creation();
    expect((await petit.poser({ creationId: c2.id, cible: "publicite" })).status).toBeGreaterThanOrEqual(400);
  });

  it("une création ratée, « produit modifié », refusée par le client ou pas vérifiée ne part nulle part", async () => {
    const f = await fixture();
    for (const [status, code] of [["rate", "creation_ratee"], ["produit_modifie", "creation_a_part"]] as const) {
      const c = await f.creation(status);
      const r = await f.poser({ creationId: c.id, cible: "publication" });
      expect(r.status).toBe(409);
      expect((await r.json()).code).toBe(code);
    }
    const refusee = await f.creation();
    run("UPDATE assets SET status='rejected', meta=json_set(meta,'$.userRejected',1) WHERE id=?", refusee.asset.id);
    expect((await (await f.poser({ creationId: refusee.id, cible: "publicite" })).json()).code).toBe("creation_refusee");
    const deCote = await f.creation();
    run("UPDATE assets SET meta=json_set(meta,'$.verification',json(?)) WHERE id=?", JSON.stringify({ etat: "a_verifier", at: 1 }), deCote.asset.id);
    expect((await (await f.poser({ creationId: deCote.id, cible: "publication" })).json()).code).toBe("photo_a_verifier");
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id=?", f.pid)!.n).toBe(0);
  });

  it("« Mon site » : la photo désignée d'une section est remplacée ; jamais sur un emplacement de produit ; jamais deux fois", async () => {
    const f = await fixture();
    const { starterTheme } = await import("@/lib/syna-agent/custom-theme/starters");
    saveCustomTheme(f.pid, starterTheme("classique", "classique"));
    const photoDe = (html: string) => html.match(/(?:\.\/)?photos\/[\w-]+\.(?:webp|png|jpe?g)/g)?.find((m) => !isCutoutPhoto(m)) ?? null;
    const sections = allSections(loadCustomTheme(f.pid)!);
    const libre = sections.find((x) => !x.page?.product && !["produit", "produits", "produit vedette", "panier", "rayons", "looks", "commande", "comparatif", "lot"].includes(libSection(x.s.id)?.role ?? "") && photoDe(sectionHtml(x.s)));
    const produit = sections.find((x) => ["produit", "produits", "produit vedette"].includes(libSection(x.s.id)?.role ?? "") && photoDe(sectionHtml(x.s)));
    expect(libre, "une section du site avec une photo qui n'est pas celle d'un produit").toBeTruthy();
    const c = await f.creation();
    if (produit) {
      const r = await f.poser({ creationId: c.id, cible: "site", uid: produit.s.uid, src: photoDe(sectionHtml(produit.s)) });
      expect(r.status).toBe(409);
      expect((await r.json()).code).toBe("emplacement_produit");
    }
    const src = photoDe(sectionHtml(libre!.s))!;
    const r = await f.poser({ creationId: c.id, cible: "site", uid: libre!.s.uid, src });
    expect(r.status, await r.clone().text()).toBe(200);
    const apres = allSections(loadCustomTheme(f.pid)!).find((x) => x.s.uid === libre!.s.uid)!;
    expect(sectionHtml(apres.s)).toContain(`/api/files/${c.asset.id}`);
    expect(sectionHtml(apres.s)).not.toContain(src);
    expect(mesCreations(f.pid).find((x) => x.id === c.id)?.usages).toContain("theme_section");
    // Jamais deux fois la même photo sur le site.
    const autre = sections.find((x) => x.s.uid !== libre!.s.uid && !x.page?.product && !["produit", "produits", "produit vedette", "panier"].includes(libSection(x.s.id)?.role ?? "") && photoDe(sectionHtml(x.s)));
    const deux = await f.poser({ creationId: c.id, cible: "site", uid: (autre ?? libre!).s.uid, src: photoDe(sectionHtml((autre ?? libre!).s)) ?? src });
    expect(deux.status).toBe(409);
    expect((await deux.json()).code).toBe("photo_en_double");
  });

  it("SINA pose une création par le même chemin, seulement quand le client le demande", async () => {
    const f = await fixture();
    const c = await f.creation();
    const t = getTool("atelier.placer")!;
    expect(t.estimate).toBeUndefined();
    expect(t.description).toMatch(/SEULEMENT quand le client te le demande/);
    const ctx = { user: state.user, projectId: f.pid, conversationId: "c", runId: "r", attachment: () => null };
    const r: any = await t.run(ctx as any, { creationId: c.id, cible: "publication" });
    expect(r.ok, r.summary).toBe(true);
    expect(one("SELECT 1 FROM posts WHERE id=?", r.data.postId)).toBeTruthy();
    const rate = await f.creation("rate");
    const non: any = await t.run(ctx as any, { creationId: rate.id, cible: "publication" });
    expect(non.ok).toBe(false);
    expect(non.summary).toMatch(/ratée/);
  });
});
