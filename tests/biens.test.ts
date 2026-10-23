/**
 * Biens immobiliers d'un projet (onglet « Biens », thème Maison & Horizon, issue #172) :
 *  - un bien naît en brouillon avec une référence libre (V-0001, L-0001) ; référence unique dans le projet ;
 *  - publication refusée tant que manquent titre, ville, photo, surface, prix (vente) ou loyer (location) ;
 *  - photos et plan : seulement des images de CE projet, sans doublon dans la galerie ;
 *  - « vendu » seulement pour une vente, « loué » seulement pour une location ; archivé = hors affichage, jamais effacé ;
 *  - seuls les biens publiés, vendus ou loués alimentent le thème, avec leurs photos (fichiers du projet) ;
 *  - un autre compte ne voit ni ne modifie les biens du projet (routes) ;
 *  - l'adresse de la fiche reste la même après la première publication.
 */
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { saveAsset } from "@/lib/library";
import { createBien, getBien, listBiens, missingForPublication, setBienStatus, storeBiens, updateBien, withBiens } from "@/lib/biens";
import { bienDrop, euros } from "@/lib/theme/biens-drop";
import { routeFor } from "@/lib/theme/render";
import { seedHoldout } from "./lot1-holdout-fixtures";
import type { ThemeSpec } from "@/lib/theme/spec";

let sessionUser: unknown = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => { if (!sessionUser) throw new real.HttpError(401, "Connexion requise."); return sessionUser; } };
});
beforeEach(() => { sessionUser = null; vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }); });

const jpeg = (color: string) => sharp({ create: { width: 64, height: 48, channels: 3, background: color } }).jpeg().toBuffer();

async function setup(label: string) {
  const user = await createUser(`biens-${label}@example.invalid`, "isolated-test-only", "Biens");
  const pid = seedHoldout(user.id, 2, `Agence ${label}`);
  const photo = async (name: string, color: string) => (await saveAsset({ projectId: pid, userId: user.id, data: await jpeg(color), name, mime: "image/jpeg", origin: "upload", status: "approved" })).id;
  return { user, pid, photo };
}

const complete = (assetId: string) => ({ title: "Une maison ouverte sur le jardin", city: "Lyon", surface: 128, price: 485000, photos: [{ assetId, alt: "Façade et jardin" }] });

describe("Biens : saisie, contrôles et états", () => {
  it("brouillon, références libres et uniques, publication contrôlée, vendu / loué, archivage", async () => {
    const { user, pid, photo } = await setup("etats");
    const a = createBien(user.id, pid, { transaction: "vente" });
    expect(a.ref).toBe("V-0001");
    expect(a.status).toBe("draft");
    expect(createBien(user.id, pid, { transaction: "location" }).ref).toBe("L-0001");
    expect(() => createBien(user.id, pid, { transaction: "vente", ref: "V-0001" })).toThrow(/déjà utilisée/);

    expect(missingForPublication("vente", a.data)).toEqual(["le titre", "la ville", "au moins une photo", "la surface", "le prix de vente"]);
    expect(() => setBienStatus(pid, a.id, "published")).toThrow(/il manque/);

    const p1 = await photo("facade.jpg", "#b25b3c");
    updateBien(pid, a.id, { data: complete(p1) });
    const pub = setBienStatus(pid, a.id, "published");
    expect(pub.status).toBe("published");
    expect(pub.publishedAt).toBeTruthy();
    const handle = pub.handle;
    expect(handle).toBe("une-maison-ouverte-sur-le-jardin-v-0001");

    // En ligne : impossible d'enregistrer une fiche incomplète ; le titre change, l'adresse de la fiche non.
    expect(() => updateBien(pid, a.id, { data: { price: null } })).toThrow(/en ligne/);
    expect(updateBien(pid, a.id, { data: { title: "Maison avec jardin" } }).handle).toBe(handle);

    expect(() => setBienStatus(pid, a.id, "rented")).toThrow(/à louer/);
    expect(setBienStatus(pid, a.id, "sold").status).toBe("sold");
    setBienStatus(pid, a.id, "archived");
    expect(listBiens(pid).some((b) => b.id === a.id)).toBe(false);
    expect(listBiens(pid, { archived: true }).find((b) => b.id === a.id)?.status).toBe("archived");
  });

  it("photos : seulement les images de ce projet, jamais deux fois la même dans la galerie", async () => {
    const one = await setup("photos-a"), other = await setup("photos-b");
    const mine = await one.photo("salon.jpg", "#1f3a2f"), theirs = await other.photo("autre.jpg", "#000000");
    const b = createBien(one.user.id, one.pid, { transaction: "location" });
    expect(() => updateBien(one.pid, b.id, { data: { photos: [{ assetId: theirs, alt: "" }] } })).toThrow(/n'appartient pas/);
    expect(() => updateBien(one.pid, b.id, { data: { photos: [{ assetId: mine, alt: "" }, { assetId: mine, alt: "" }] } })).toThrow(/deux fois/);
    expect(() => getBien(other.pid, b.id)).toThrow(/introuvable/);
  });
});

describe("Biens : alimentation du thème", () => {
  it("seuls les biens publiés, vendus ou loués passent au thème, avec leurs photos ; montants mis en forme", async () => {
    const { user, pid, photo } = await setup("theme");
    const p1 = await photo("jardin.jpg", "#b25b3c"), p2 = await photo("salon.jpg", "#f6f1e8"), p3 = await photo("sejour.jpg", "#1f3a2f");
    const vente = createBien(user.id, pid, { transaction: "vente", data: complete(p1) });
    setBienStatus(pid, vente.id, "published");
    const loc = createBien(user.id, pid, { transaction: "location", data: { title: "Un appartement lumineux", city: "Lyon", postalCode: "69006", surface: 64, rent: 1200, charges: 90, furnished: true, photos: [{ assetId: p2, alt: "Séjour" }, { assetId: p3, alt: "Salle à manger" }] } });
    setBienStatus(pid, loc.id, "published");
    createBien(user.id, pid, { transaction: "vente", data: complete(p3) }); // brouillon : jamais visible

    const { biens, files } = storeBiens(pid);
    expect(biens.map((b) => b.ref)).toEqual(["V-0001", "L-0001"]);
    expect(Object.values(files).sort()).toEqual([p1, p2, p3].sort());
    const drop = bienDrop(biens[1], "/p");
    expect(drop.loyer_cc_texte.value).toBe(euros(1290));
    expect(euros(1290)).toBe("1 290 €");
    expect(drop.photos_count.value).toBe(2);
    expect(drop.system.url).toBe(`/p/pages/bien/${biens[1].handle}`);
    expect(drop.filtres.value).toContain("meuble");

    const spec = { files: {}, templates: { "metaobject/bien": { sections: {}, order: [] } }, store: { pages: [], biens: undefined } } as unknown as ThemeSpec;
    const withData = withBiens(spec, pid);
    expect(withData.store.biens).toHaveLength(2);
    expect(spec.store.biens).toBeUndefined(); // le thème enregistré n'est jamais modifié
    expect(routeFor(withData, `/pages/bien/${biens[0].handle}`, new URLSearchParams())).toMatchObject({ template: "metaobject/bien", status: 200 });
    expect(routeFor(withData, "/pages/bien/inconnu", new URLSearchParams()).status).toBe(404);
  });
});

describe("Biens : routes du studio", () => {
  it("un autre compte ne voit pas les biens du projet ; création, modification et publication par les routes", async () => {
    const { user, pid, photo } = await setup("routes");
    const intruder = await createUser("biens-intrus@example.invalid", "isolated-test-only", "Intrus");
    const p1 = await photo("jardin.jpg", "#b25b3c");
    const { GET, POST } = await import("@/app/api/projects/[id]/biens/route");
    const item = await import("@/app/api/projects/[id]/biens/[bid]/route");
    const ctx = { params: Promise.resolve({ id: pid }) };
    const as = (u: typeof user) => { sessionUser = u; };

    as(intruder);
    expect((await GET(new Request("http://x/"), ctx)).status).toBe(404);
    expect((await POST(new Request("http://x/", { method: "POST", body: JSON.stringify({ transaction: "vente" }) }), ctx)).status).toBe(404);

    as(user);
    const created = await (await POST(new Request("http://x/", { method: "POST", body: JSON.stringify({ transaction: "vente", data: complete(p1) }) }), ctx)).json();
    expect(created.bien.missing).toEqual([]);
    const bctx = { params: Promise.resolve({ id: pid, bid: created.bien.id }) };
    const r = await item.PATCH(new Request("http://x/", { method: "PATCH", body: JSON.stringify({ status: "published" }) }), bctx);
    expect((await r.json()).bien.status).toBe("published");
    // Retirer de l'affichage puis enregistrer une fiche incomplète dans la même demande.
    const w = await item.PATCH(new Request("http://x/", { method: "PATCH", body: JSON.stringify({ status: "withdrawn", data: { price: null } }) }), bctx);
    expect((await w.json()).bien).toMatchObject({ status: "withdrawn", missing: ["le prix de vente"] });
  });
});
