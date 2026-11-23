/**
 * L'atelier embelli (23 novembre 2026, maquette approuvée par le propriétaire, « Yes ») : seule la présentation change.
 * Ces essais tiennent ce que l'écran promet :
 *  - la scène du haut ne montre que les vraies créations réussies du client, sinon ses vraies photos, sinon rien ;
 *  - une carte de vidéo sans photo du produit dit « Ta photo ici » (jamais un produit inventé) ;
 *  - une carte réservée à un autre forfait reste visible, avec un cadenas et sa phrase ;
 *  - les mises en garde et le « au plus » s'affichent au choix du modèle, avant le départ vers la vidéo guidée ;
 *  - les prix affichés sont ceux d'`etatAtelier` (même coût, forme courte « ≈ 1,6 % ») ;
 *  - aucun texte anglais en français, aucun texte français en anglais ;
 *  - la barre d'une création en cours n'invente jamais un pourcentage.
 * Essais simulés : aucune clé, aucun appel.
 */
vi.mock("@/lib/public-download", () => import("./public-download-double"));
vi.mock("next/navigation", () => ({ usePathname: () => "/studio/p1/atelier", useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }) }));
import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: null as any, pid: "p1" }));
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<any>()), requireUser: async () => state.user, currentUser: async () => state.user }));
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<any>()), activeProviderKey: () => "TEST NO REAL PROVIDER" }));
vi.mock("@/components/studio/project-context", () => ({ useProject: () => ({ id: state.pid, data: null, reload: async () => {}, error: null }), useOptionalProject: () => null }));
import fs from "node:fs";
import { createUser } from "@/lib/auth";
import { id as newId, now, run } from "@/lib/db";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { setJsonSetting, setSetting } from "@/lib/settings";
import { MEDIA_MODELS } from "@/lib/ai/media-models";
import { GET as atelierGet } from "@/app/api/projects/[id]/atelier/route";
import { formatPctShort, pctOfBudget } from "@/lib/budget-pct";
import { pctBaseFor } from "@/lib/ai/budget-pct";
import { creationsEnCours, photosDuProduit, prixCourt } from "@/lib/atelier/service";
import { MODELES_VIDEOS } from "@/lib/atelier/modeles-videos";
import { LangProvider } from "@/components/i18n";
import { BarreCreation, imagesDeLaScene, ModeleDialog, MurCreations, RetouchesSection, Scene, VideosSection, type Etat, type ModeleVideoVue } from "@/components/studio/tab-atelier";
import { seedImageFixture } from "./image-v2-fixtures";
import { loadProject } from "@/lib/projects";
import { devisVideoGuidee } from "@/lib/video-v2/guided-quote";
import { reglagesDuModele } from "@/lib/atelier/modeles-videos";
import { GESTES } from "@/lib/atelier/gestes";
import { OUTILS, outilsPour, type GesteId } from "@/lib/atelier/outils";
import { MODES, conseilOutil } from "@/lib/atelier/conseil";
import { CONDITIONS } from "@/lib/atelier/garde-fous";
import { MODELES_IMAGES } from "@/lib/atelier/modeles-images";
import { SOUS_LE_PRIX } from "@/lib/atelier/prix";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => { throw Error("HTTP provider forbidden"); }));
  setJsonSetting("billing.markup", 1);
  setJsonSetting("ai.media.models", Object.fromEntries(MEDIA_MODELS.map((m) => [`${m.provider}:${m.model}`, { enabled: true, confirmedAt: Date.now() }])));
  setSetting("ai.prices.checkedAt", String(Date.now()));
});

/** Un projet abonné, et l'état de son atelier tel que l'écran le reçoit. */
async function projet(plan: "vendre" | "dominer" = "dominer") {
  const u = await createUser(`atelier-embelli-${crypto.randomUUID()}@example.invalid`, "synthetic-test-only", "Test");
  state.user = { ...u, role: "client" };
  const pid = seedImageFixture(u.id, "cosmetic");
  grantProjectPlan(pid, plan);
  state.pid = pid;
  const etat = async (): Promise<Etat> => (await atelierGet(new Request(`http://localhost/api/projects/${pid}/atelier`), { params: Promise.resolve({ id: pid }) })).json();
  return { u, pid, etat };
}

/** Une photo inscrite directement (aucun fichier lu : la présentation n'a besoin que de l'adresse). */
function photo(userId: string, pid: string, o: { origin: string; role: string; meta?: object }) {
  const aid = newId();
  run("INSERT INTO assets (id, user_id, project_id, kind, role, origin, name, mime, size, storage_key, meta, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", aid, userId, pid, "image", o.role, o.origin, `${aid}.jpg`, "image/jpeg", 10, `essai/${aid}.jpg`, JSON.stringify(o.meta ?? {}), "approved", now());
  return aid;
}

const rendu = (el: ReactNode, lang: "fr" | "en" = "fr") => renderToStaticMarkup(h(LangProvider, { initial: lang, children: el }));
const texte = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/g, " ").replace(/\u00a0/g, " ");
const scene = (etat: Etat) => h(Scene, { etat, mode: "ensemble", setMode: () => {}, type: "image", setType: () => {}, decor: "", setDecor: () => {}, ajouts: [], setAjouts: () => {}, onStarted: () => {}, disabled: false, decorRef: { current: null }, onModele: () => {} });

describe("l'atelier embelli : seule la présentation change", () => {
  it("la scène sans création montre les vraies photos du produit, sinon rien ; jamais une image créée par ailleurs", async () => {
    const { u, pid, etat } = await projet();
    const vide = await etat();
    const sansPhoto = { ...vide, creations: [], photosProduit: [] };
    const html0 = rendu(scene(sansPhoto));
    expect(html0).not.toContain("<img");
    expect(html0).not.toContain("<video");
    expect(html0).not.toContain("data-atelier-scene-images");

    const vraie = photo(u.id, pid, { origin: "upload", role: "original" });
    const creee = photo(u.id, pid, { origin: "generated", role: "generated" }); // une image créée ailleurs n'est pas une photo du client
    const refusee = photo(u.id, pid, { origin: "upload", role: "original", meta: { verification: { etat: "refusee" } } });
    const ids = photosDuProduit(pid).map((p) => p.id);
    expect(ids).toContain(vraie);
    expect(ids).not.toContain(creee);
    expect(ids).not.toContain(refusee);
    const e = await etat();
    const html = rendu(scene({ ...e, creations: [], photosProduit: e.photosProduit.filter((p) => p.id === vraie) }));
    expect(html).toContain('data-atelier-scene-images="photo"');
    expect([...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1])).toEqual([`/api/files/${vraie}`]);
    // Toutes les images de la scène sont des photos du client (aucune autre adresse).
    const toutes = rendu(scene({ ...e, creations: [] }));
    for (const m of toutes.matchAll(/<img[^>]+src="([^"]+)"/g)) expect(ids.map((x) => `/api/files/${x}`)).toContain(m[1]);
    // Le titre parle du vrai produit quand on connaît son nom.
    expect(texte(html)).toContain("comme dans une");
    expect(imagesDeLaScene([{ id: "r", url: "/x", thumbUrl: null, kind: "image", status: "rate" }], [])).toEqual([]);
    expect(imagesDeLaScene([{ id: "c", url: "/api/files/c", thumbUrl: null, kind: "video", status: "ok" }], [{ id: "p", url: "/api/files/p", thumbUrl: null }]).map((i) => i.creation)).toEqual([true, false]);
  });

  it("une carte de vidéo sans photo du produit dit « Ta photo ici », jamais un produit inventé", async () => {
    const { etat } = await projet();
    const e = { ...(await etat()), photosProduit: [] };
    const html = rendu(h(VideosSection, { etat: e, onChoisir: () => {} }));
    expect(html.match(/data-atelier-ta-photo/g)?.length).toBe(e.modelesVideos.length);
    expect(texte(html).match(/Ta photo ici/g)?.length).toBe(e.modelesVideos.length);
    expect(html).not.toContain("<img");
  });

  it("une carte réservée à un autre forfait reste visible, avec son cadenas et sa phrase", async () => {
    const { etat } = await projet("vendre");
    const e = await etat();
    const fermees = e.modelesVideos.filter((m) => m.raison);
    expect(fermees.length).toBeGreaterThan(0);
    const html = rendu(h(VideosSection, { etat: e, onChoisir: () => {} }));
    for (const m of fermees) {
      expect(html).toContain(`data-atelier-modele-video="${m.id}"`);
      expect(html).toContain(`data-atelier-verrou="${m.id}"`);
      expect(texte(html)).toContain(m.raison!.split(" ").slice(0, 4).join(" "));
    }
  });

  it("au choix d'un modèle, ses mises en garde et son « au plus » s'affichent avant le départ vers la vidéo guidée", async () => {
    const { pid, etat } = await projet();
    const e = await etat();
    for (const m of e.modelesVideos) {
      const html = rendu(h(ModeleDialog, { etat: e, modele: m, onClose: () => {}, projectId: pid, onAvantApres: () => {} }));
      expect(html, m.id).toContain(`data-atelier-garde="${m.id}"`);
      expect(texte(html), m.id).toContain(m.garde[0].split(" ").slice(0, 3).join(" "));
      if (m.auPlus) expect(html, m.id).toContain("data-atelier-au-plus");
      if (m.offre) expect(texte(html)).toContain("je ne l'invente pas");
      if (m.prix && !m.gratuit && !m.raison) {
        // La garde et le « au plus » sont écrits AVANT le lien vers la vidéo guidée.
        const go = html.indexOf("data-atelier-video-go");
        expect(go, m.id).toBeGreaterThan(html.indexOf("data-atelier-garde"));
        if (m.auPlus) expect(go).toBeGreaterThan(html.indexOf("data-atelier-au-plus"));
      }
    }
    const tourne = e.modelesVideos.find((m) => m.id === "tourne")!, deballage = e.modelesVideos.find((m) => m.id === "deballage")!, cadeau = e.modelesVideos.find((m) => m.id === "cadeau")!;
    expect(texte(rendu(h(ModeleDialog, { etat: e, modele: tourne, onClose: () => {}, projectId: pid, onAvantApres: () => {} })))).toContain("un demi-tour seulement");
    expect(texte(rendu(h(ModeleDialog, { etat: e, modele: deballage, onClose: () => {}, projectId: pid, onAvantApres: () => {} })))).toContain("Sans mains");
    expect(texte(rendu(h(ModeleDialog, { etat: e, modele: cadeau, onClose: () => {}, projectId: pid, onAvantApres: () => {} })))).toContain("posé par le Studio");
    // Le modèle réservé au forfait Dominer garde sa phrase et n'ouvre aucune vidéo.
    const v = await projet("vendre");
    const ev = await v.etat();
    const pub = ev.modelesVideos.find((m) => m.id === "pub-15")!;
    const hp = rendu(h(ModeleDialog, { etat: ev, modele: pub, onClose: () => {}, projectId: v.pid, onAvantApres: () => {} }));
    expect(texte(hp)).toContain("Dominer");
    expect(hp).not.toContain("data-atelier-video-go");
  });

  it("les prix affichés sont ceux d'etatAtelier : même coût, forme courte tirée du même calcul", async () => {
    const { u, pid, etat } = await projet();
    const e = await etat();
    const base = pctBaseFor(u.id, pid);
    expect(base).toBeTruthy();
    const videos = rendu(h(VideosSection, { etat: e, onChoisir: () => {} }));
    let vus = 0;
    for (const m of e.modelesVideos as (ModeleVideoVue & { estimateMicro: number })[]) {
      if (m.gratuit || !m.prix) continue;
      expect(m.prixCourt, m.id).toBe(formatPctShort(pctOfBudget(m.estimateMicro, base), "fr"));
      expect(m.prix).toContain(m.prixCourt!.replace(/^≈\s*/, "").replace(/^<\s*/, ""));
      expect(videos).toContain(`data-atelier-video-prix="${m.id}" title="${m.prix}">${m.prixCourt}<`);
      vus++;
    }
    expect(vus).toBeGreaterThan(0);
    const retouches = rendu(h(RetouchesSection, { etat: e, disabled: false, onGeste: () => {}, onScene: () => {}, onAvantApres: () => {} }));
    for (const [tuile, geste] of [["fond", "fond"], ["scene", "scene"], ["retirer", "retirer"], ["agrandir", "story"]] as const) {
      const o = e.gestes.find((g) => g.id === geste)!.outils.find((x) => x.conseille)!;
      expect(o.prixCourt).toBe(prixCourt(o.prixMicro!, base, "fr"));
      expect(retouches).toContain(`data-atelier-geste-prix="${tuile}">${o.prixCourt}<`);
    }
    expect(texte(retouches)).toContain("Gratuit");
    // Jamais d'euros à l'écran.
    expect(texte(videos + retouches)).not.toMatch(/€|\beuros?\b/i);
  });

  it("aucun mot anglais en français, aucun mot français en anglais", async () => {
    const { u, pid, etat } = await projet();
    photo(u.id, pid, { origin: "upload", role: "original" });
    const e = await etat();
    const plein: Etat = { ...e, enCours: [{ id: "j1", kind: "image", progress: null, sourceUrl: null }], creations: [{ id: "c1", assetId: "a1", url: "/api/files/a1", thumbUrl: null, geste: "scene", mode: "ensemble", kind: "image", outil: "OpenAI", cout: "environ 1 % de ton budget du mois", costMicro: 1, status: "ok", at: Date.now(), servie: false, usages: [] }, { id: "c2", assetId: null, url: null, thumbUrl: null, geste: "retirer", mode: "moi", kind: "image", outil: "OpenAI", cout: "gratuit", costMicro: 0, status: "rate", at: Date.now(), servie: false, usages: [] }] };
    const tout = (lang: "fr" | "en") => texte(rendu(h("div", null, scene(plein), h(VideosSection, { etat: plein, onChoisir: () => {} }), h(RetouchesSection, { etat: plein, disabled: false, onGeste: () => {}, onScene: () => {}, onAvantApres: () => {} }), h(MurCreations, { etat: plein, projectId: pid, onNouvelle: () => {} })), lang));
    const fr = tout("fr");
    expect(fr).not.toMatch(/\b(prompts?|clips?|upscale|template|Create|Choose|Free|Video|Used|Your|Before|After|Edit|New creation|IA générative)\b/);
    expect(fr).toContain("Que veux-tu créer");
    expect(fr).toContain("Améliorer avec SINA (gratuit)");
    // Les noms des modèles et des gestes viennent du serveur dans la langue du compte : on ne vérifie ici que l'écran.
    const en = texte(rendu(h("div", null, h(RetouchesSection, { etat: plein, disabled: false, onGeste: () => {}, onScene: () => {}, onAvantApres: () => {} }), h(MurCreations, { etat: plein, projectId: pid, onNouvelle: () => {} })), "en"));
    expect(en).not.toMatch(/Créer|Choisir|Ta photo|Mes créations|Retoucher|Gratuit|Pas encore servie|Nouvelle création/);
    // Les boutons à icône sont nommés pour les lecteurs d'écran et au survol.
    const mur = rendu(h(MurCreations, { etat: plein, projectId: pid, onNouvelle: () => {} }));
    for (const cible of ["publication", "publicite", "site"]) expect(mur).toMatch(new RegExp(`data-atelier-poser="${cible}" title="[^"]+" aria-label="[^"]+"`));
    // Une création ratée reste dite ratée, en une ligne.
    expect(mur).toContain('data-atelier-etat="rate"');
    expect(texte(mur)).toContain("Ratée le");
  });

  it("la barre d'une création en cours n'invente jamais un pourcentage", async () => {
    const sans = rendu(h(BarreCreation, { progress: null, label: "Avancement" }));
    expect(sans).toContain('data-atelier-barre-creation="sans-chiffre"');
    expect(sans).not.toContain("aria-valuenow");
    expect(texte(sans)).not.toMatch(/\d|%/);
    const reelle = rendu(h(BarreCreation, { progress: 0.4, label: "Avancement" }));
    expect(reelle).toContain('aria-valuenow="40"');
    expect(texte(reelle)).not.toMatch(/\d/); // aucun chiffre écrit, seulement la largeur de la barre
    // L'avancement vient de la tâche : 0 (pas encore donné) n'est jamais montré comme un chiffre.
    const { u, pid } = await projet();
    const tache = (type: string, progress: number, payload: object) => { const jid = newId(); run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, progress, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, type, "essai", JSON.stringify(payload), "queued", progress, now() + 86400_000 * 365, now(), now()); return jid; };
    const a = tache("image.edit", 0, { assetId: "rien" }), b = tache("image.edit", 0.4, {}), c = tache("image.v2", 0.2, { request: { kind: "packshot" } }), d = tache("image.v2", 0, { request: { atelier: { mode: "sina" } } });
    const en = creationsEnCours(pid);
    expect(en.find((x) => x.id === a)?.progress).toBeNull();
    expect(en.find((x) => x.id === a)?.sourceUrl).toBeNull();
    expect(en.find((x) => x.id === b)?.progress).toBe(0.4);
    expect(en.find((x) => x.id === c)).toBeUndefined(); // une image d'un autre écran n'est pas une création de l'atelier
    expect(en.find((x) => x.id === d)?.progress).toBeNull();
    run("DELETE FROM jobs WHERE id IN (?,?,?,?)", a, b, c, d);
  });

  it("l'aperçu animé de chaque modèle est fait en CSS sur la vraie photo, et respecte « moins de mouvement »", () => {
    const css = fs.readFileSync("src/app/globals.css", "utf8");
    const src = fs.readFileSync("src/components/studio/tab-atelier.tsx", "utf8");
    for (const m of MODELES_VIDEOS) expect(src, m.geste).toContain(m.geste.includes("-") ? `"${m.geste}":` : `${m.geste}:`);
    for (const anim of ["tour", "rapprochement", "eloignement", "travelling", "plongee", "pres", "respire"]) expect(css).toContain(`.atelier-apercu[data-mouvement="${anim}"] img`);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.atelier-apercu img, \.atelier-net, \.atelier-barre-indet \{ animation: none !important; \}/);
    // Jamais d'arche, de demi-lune ni de dôme : aucun arrondi seulement en haut, aucune ellipse.
    expect(src).not.toMatch(/rounded-t-|rounded-\[[^\]]*\/|ellipse|border-radius:\s*\d+%\s+\d+%/);
  });

  it("jamais « story » en français : le client lit « format vertical » partout dans l'atelier (retouché le 23 novembre 2026)", async () => {
    const fr: string[] = [];
    for (const g of Object.values(GESTES)) fr.push(g.nom[0], g.aide[0], g.demande?.label[0] ?? "", g.demande?.exemple[0] ?? "");
    for (const o of OUTILS) fr.push(o.nom[0], o.mieux[0]);
    for (const m of MODES) fr.push(m.nom[0], m.aide[0]);
    for (const c of CONDITIONS) fr.push(c[0]);
    for (const m of MODELES_VIDEOS) fr.push(m.nom[0], m.quoi[0], m.garde[0]);
    for (const m of MODELES_IMAGES) fr.push(m.nom[0], m.idee[0]);
    fr.push(SOUS_LE_PRIX[0]);
    for (const g of Object.keys(GESTES) as GesteId[]) fr.push(conseilOutil(g, outilsPour(g, () => true), "fr") ?? "");
    // Les libellés de l'écran : le premier texte (français) de chaque t("…", "…").
    const src = fs.readFileSync("src/components/studio/tab-atelier.tsx", "utf8");
    for (const m of src.matchAll(/\bt\(\s*(["`])((?:\\.|(?!\1).)*)\1/g)) fr.push(m[2]);
    expect(fr.filter((x) => /story/i.test(x))).toEqual([]);
    expect(GESTES.story.nom[0]).toBe("Format vertical");
    // Et l'écran rendu en français non plus.
    const { etat } = await projet();
    const e = await etat();
    const html = texte(rendu(h("div", null, scene(e), h(VideosSection, { etat: e, onChoisir: () => {} }), h(RetouchesSection, { etat: e, disabled: false, onGeste: () => {}, onScene: () => {}, onAvantApres: () => {} }))));
    expect(html).not.toMatch(/story/i);
    for (const g of e.gestes) { expect(g.nom[0]).not.toMatch(/story/i); expect(g.aide[0]).not.toMatch(/story/i); for (const o of g.outils) expect(o.mieux[0]).not.toMatch(/story/i); expect(g.conseil ?? "").not.toMatch(/story/i); }
  });

  it("la durée d'un modèle de vidéo est celle du devis (ce qui est vraiment fait et compté), sur la carte et dans sa fenêtre", async () => {
    const { pid, etat } = await projet();
    const e = await etat();
    const p = loadProject(pid);
    const cartes = rendu(h(VideosSection, { etat: e, onChoisir: () => {} }));
    let filmes = 0;
    for (const m of MODELES_VIDEOS) {
      const vue = e.modelesVideos.find((x) => x.id === m.id)!;
      let attendu = m.dureeS;
      if (!m.sansIa) {
        const r = reglagesDuModele(m);
        const q = devisVideoGuidee(p, { ...r, subject: null, request: m.scene });
        attendu = (q.generatedSeconds ?? 0) > 0 && r.scenes === 1 ? q.generatedSeconds! : r.totalS;
        expect(vue.secondesFilmees, m.id).toBe(q.generatedSeconds ?? 0);
        if ((q.generatedSeconds ?? 0) > 0) filmes++;
      }
      expect(vue.dureeAffichee, m.id).toBe(attendu);
      expect(cartes, m.id).toContain(`data-atelier-duree="${m.id}">${attendu} s<`);
      const fenetre = rendu(h(ModeleDialog, { etat: e, modele: vue, onClose: () => {}, projectId: pid, onAvantApres: () => {} }));
      expect(texte(fenetre), m.id).toContain(`${attendu} secondes`);
    }
    expect(filmes).toBeGreaterThan(0);
    // « Le produit qui tourne » et « Les détails » sont écrits 5 s dans le modèle, mais l'outil en fait et en compte plus.
    for (const id of ["tourne", "details"]) expect(e.modelesVideos.find((x) => x.id === id)!.dureeAffichee, id).toBeGreaterThanOrEqual(6);
  });
});
