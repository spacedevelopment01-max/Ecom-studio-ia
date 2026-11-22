/**
 * L'atelier de création (rapport 10 du 22 novembre 2026) : les règles pures, sans base ni appel. Outils accordés
 * seulement, prix en pourcentage du budget du mois chaîne entière comptée, plafond des vidéos, garde-fous d'entrée,
 * Flux en direct, gestes, « vrais pixels reposés » éteint, mentions obligatoires, modèles prêts, vidéos sans mains.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { OUTILS, OUTILS_ECARTES, OUTILS_MAX, OUTIL_DE_SINA, outilPermis, outilsPour } from "@/lib/atelier/outils";
import { chaineGeste, plafondTexte, plafondVideos, prixBouton, prixTexte, RELECTURE_IMAGE_MICRO, SOUS_LE_PRIX, VIDEOS_ATELIER_PAR_MOIS } from "@/lib/atelier/prix";
import { accordValide, CONDITIONS, controlePersonnes, demandeModeration, lireModeration, modererEntree, MODERATION_INDISPONIBLE, niveauModeration, PHRASE_ACCORD } from "@/lib/atelier/garde-fous";
import { BFL_BASE, BFL_SAFETY, bflExpandRequest, bflImageRequest, bflPoll, bflSize, bflSubmitted, margesPour } from "@/lib/ai/bfl";
import { consigneGeste, demandeIncomplete, GESTES } from "@/lib/atelier/gestes";
import { boiteProduit, JUGE_ETIQUETTE, REGLAGE_VRAIS_PIXELS, reposerVraisPixels, vraisPixelsActifs } from "@/lib/atelier/scene";
import { legendeAvecMentions, mentionsDe, mentionsPour } from "@/lib/atelier/mentions";
import { feteDesMeres, modelesPour, paques } from "@/lib/atelier/modeles-images";
import { demandeDuModele, GESTES_CAMERA, gesteDuModele, MODELES_VIDEOS, modeleVideo } from "@/lib/atelier/modeles-videos";
import { ameliorerDemande, avertissement, conseilOutil, MODES } from "@/lib/atelier/conseil";
import { manifesteStudio, signatureActive, signerImage } from "@/lib/atelier/c2pa";
import { ELEVENLABS_BRANCHE } from "@/lib/atelier/musique";
import { phraseNonServies } from "@/lib/atelier/journal";
import { adaptForPlatform } from "@/lib/social-v2/platforms";
import { avecModele, motionPrompt } from "@/lib/video-v2/three-scenes";
import { SPACES } from "@/lib/studio-nav";

const tous = () => true;
const aucun = () => false;

describe("les outils de l'atelier (point 8)", () => {
  it("seulement les fournisseurs accordés ; jamais fal, Higgsfield, Bria, Ideogram, MiniMax ni Imagen Product Recontext", () => {
    const accordes = new Set(["openai", "google", "vertex", "kling", "byteplus", "bfl", "alibaba", "runware"]);
    for (const o of OUTILS) expect(accordes.has(o.provider)).toBe(true);
    expect(OUTILS.some((o) => /fal|higgs|bria|ideogram|minimax|recontext/i.test(o.id))).toBe(false);
    for (const k of ["fal", "higgsfield", "bria", "ideogram", "minimax", "imagen-product-recontext"]) expect(OUTILS_ECARTES[k]).toBeTruthy();
    // Vertex : Veo 3.1 Fast et Lite seulement.
    expect(OUTILS.filter((o) => o.provider === "vertex").map((o) => o.model).sort()).toEqual(["veo-3.1-fast-generate-001", "veo-3.1-lite-generate-001"]);
  });

  it("quatre ou cinq outils au plus, le premier ouvert marqué « conseillé », chacun avec sa ligne « ce qu'il fait de mieux »", () => {
    for (const g of Object.keys(GESTES) as (keyof typeof GESTES)[]) {
      const l = outilsPour(g, tous);
      expect(l.length).toBeLessThanOrEqual(OUTILS_MAX);
      expect(l.filter((o) => o.conseille)).toHaveLength(l.length ? 1 : 0);
      for (const o of l) expect(o.mieux[0].length > 10 && o.mieux[1].length > 10).toBe(true);
    }
    const ferme = outilsPour("fond", (id) => id !== OUTIL_DE_SINA);
    expect(ferme[0].disponible).toBe(false);
    expect(ferme.find((o) => o.conseille)!.id).not.toBe(OUTIL_DE_SINA);
    expect(outilsPour("fond", aucun).some((o) => o.conseille)).toBe(false);
  });

  it("Runware n'apparaît qu'en secours, quand aucun fabricant n'est ouvert", () => {
    expect(outilsPour("video", tous).some((o) => o.provider === "runware")).toBe(false);
    expect(outilsPour("video", (id) => id.startsWith("runware:")).find((o) => o.conseille)?.provider).toBe("runware");
  });

  it("mode « SINA s'en occupe » : OpenAI seulement pour les images ; la scène reste faite par OpenAI dans tous les modes", () => {
    expect(outilsPour("fond", tous, { mode: "sina" }).map((o) => o.id)).toEqual([OUTIL_DE_SINA]);
    expect(outilsPour("scene", tous).map((o) => o.id)).toEqual([OUTIL_DE_SINA]);
    expect(outilPermis("bfl:flux-kontext-pro", "fond", tous, "moi")).toBe(true);
    expect(outilPermis("bfl:flux-kontext-pro", "fond", tous, "sina")).toBe(false);
    expect(outilPermis("bfl:flux-kontext-pro", "fond", aucun, "moi")).toBe(false);
    expect(outilPermis("bfl:flux-kontext-pro", "story", tous, "moi")).toBe(false);
  });
});

describe("le compteur de l'atelier (point 1)", () => {
  it("chaîne entière : création, relecture du juge quand il relit, une reprise probable", () => {
    const img = chaineGeste({ kind: "image", unitMicro: 100_000 });
    expect(img.relectureMicro).toBe(RELECTURE_IMAGE_MICRO);
    expect(img.repriseMicro).toBe(Math.round((100_000 + RELECTURE_IMAGE_MICRO) * 0.25));
    expect(img.totalMicro).toBe(img.creationMicro + img.relectureMicro + img.repriseMicro);
    const video = chaineGeste({ kind: "video", unitMicro: 364_000 });
    expect(video.repriseMicro).toBe(Math.round((364_000 + 3 * RELECTURE_IMAGE_MICRO) * 0.5));
    expect(chaineGeste({ kind: "image", unitMicro: 50_000, relu: false }).relectureMicro).toBe(0);
    expect(chaineGeste({ kind: "image", unitMicro: 50_000, nombre: 12 }).creationMicro).toBe(600_000);
  });

  it("le prix dit en pourcentage du budget du mois, en tutoyant, jamais en euros", () => {
    // Forfait à 69 € : 23 € de budget le mois courant ; une vidéo de 8 s Veo 3.1 Lite (0,364 €) + relecture + reprise.
    const total = chaineGeste({ kind: "video", unitMicro: 364_000 }).totalMicro;
    const t = prixBouton("Vidéo de 8 secondes", total, 23_000_000, "fr");
    expect(t).toMatch(/^Vidéo de 8 secondes : environ \d+(,\d)? % de ton budget du mois$/);
    expect(t).not.toMatch(/€|eur|illimit/i);
    expect(prixTexte(1_000, 23_000_000, "fr")).toBe("moins de 0,1 % de ton budget du mois");
    expect(prixTexte(1_000, 23_000_000, "en")).toBe("less than 0.1% of your monthly budget");
    expect(prixTexte(1_000, null, "fr")).toBe("pris sur ton budget du mois");
    expect(SOUS_LE_PRIX[0]).toMatch(/jamais compté/);
  });

  it("le plafond des vidéos par forfait : 0, 3 et 6 par mois (forfaits validés), dit en clair", () => {
    expect(VIDEOS_ATELIER_PAR_MOIS).toEqual({ creer: 0, vendre: 3, dominer: 6 });
    expect(plafondVideos("vendre", 1)).toEqual({ inclus: 3, faites: 1, restantes: 2 });
    expect(plafondTexte(plafondVideos("vendre", 1), "fr")).toBeNull();
    expect(plafondTexte(plafondVideos("vendre", 3), "fr")).toMatch(/tes 3 vidéos du mois/);
    expect(plafondTexte(plafondVideos("creer", 0), "fr")).toMatch(/ne comprend pas de vidéo/);
    expect(plafondTexte(plafondVideos(null, 0), "en")).toMatch(/doesn't include videos/);
  });
});

describe("les garde-fous d'entrée (point 2)", () => {
  it("la modération gratuite d'OpenAI lit le texte et les images dans la même demande", () => {
    const b = demandeModeration({ texte: "  un flacon sur du marbre ", images: [{ mime: "image/jpeg", base64: "AAA" }] });
    expect(b.model).toBe("omni-moderation-latest");
    expect(b.input).toEqual([{ type: "text", text: "un flacon sur du marbre" }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAA" } }]);
  });

  it("une demande signalée est refusée avec une phrase claire ; sans vérification possible, rien n'est lancé", async () => {
    expect(lireModeration({ results: [{ flagged: false, categories: {} }] }, "fr")).toEqual({ ok: true });
    const v = lireModeration({ results: [{ flagged: true, categories: { violence: true, sexual: false } }] }, "fr");
    expect(v.ok).toBe(false);
    if (!v.ok) { expect(v.raison).toMatch(/^Je ne peux pas faire cette création : la vérification a trouvé violence\./); expect(v.familles).toEqual(["violence"]); }
    const sansCle = await modererEntree({ texte: "un décor" }, async () => null, "fr");
    expect(sansCle).toEqual({ ok: false, raison: MODERATION_INDISPONIBLE[0], familles: [] });
    const panne = await modererEntree({ texte: "un décor" }, async () => { throw new Error("réseau"); }, "en");
    expect(panne.ok).toBe(false);
    let appels = 0;
    expect(await modererEntree({ texte: "  " }, async () => { appels++; return null; }, "fr")).toEqual({ ok: true });
    expect(appels).toBe(0);
  });

  it("une personne seulement avec sa photo et son accord écrit ; l'accord porte le nom et la phrase recopiée", () => {
    expect(controlePersonnes("ma cliente qui tient le flacon", false, "fr")).toMatch(/sans sa photo et son accord écrit/);
    expect(controlePersonnes("ma cliente qui tient le flacon", true, "fr")).toBeNull();
    expect(controlePersonnes("un flacon sur du marbre", false, "fr")).toBeNull();
    expect(controlePersonnes("des mains qui ouvrent la boîte", false, "fr")).not.toBeNull();
    expect(controlePersonnes("a woman holding the bottle", false, "en")).toMatch(/written consent/);
    expect(accordValide({ nom: "Jeanne", phrase: PHRASE_ACCORD[0], par: "u", at: 1 })).toBe(true);
    expect(accordValide({ nom: "Jeanne", phrase: "oui", par: "u", at: 1 })).toBe(false);
    expect(accordValide({ nom: "", phrase: PHRASE_ACCORD[0], par: "u", at: 1 })).toBe(false);
    expect(CONDITIONS.length).toBeGreaterThanOrEqual(5);
  });

  it("la modération des images d'OpenAI n'est jamais « low » : le mot n'est écrit nulle part dans le code", () => {
    expect(() => niveauModeration("low")).toThrow();
    expect(niveauModeration(undefined)).toBe("auto");
    const fichiers: string[] = [];
    const walk = (d: string) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(ts|tsx|mjs)$/.test(f.name)) fichiers.push(p); } };
    walk(path.join(process.cwd(), "src")); walk(path.join(process.cwd(), "worker"));
    for (const f of fichiers) expect(fs.readFileSync(f, "utf8")).not.toMatch(/moderation\s*:\s*["']low["']/);
  });
});

describe("Black Forest Labs (Flux) en direct (points 5 et 8)", () => {
  it("demandes au point d'accès européen, clé dans x-key, modération jamais relâchée", () => {
    const k = bflImageRequest("cle-factice", "flux-kontext-pro", { prompt: "change le fond", references: ["AAA"], aspect: "4:5" });
    expect(k.url).toBe(`${BFL_BASE}/flux-kontext-pro`);
    expect(BFL_BASE).toMatch(/^https:\/\/api\.eu\.bfl\.ai\//);
    expect(k.headers["x-key"]).toBe("cle-factice");
    expect(k.body).toMatchObject({ prompt: "change le fond", input_image: "AAA", aspect_ratio: "4:5", safety_tolerance: BFL_SAFETY, output_format: "png" });
    expect(BFL_SAFETY).toBe(2);
    const f2 = bflImageRequest("k", "flux-2-pro", { prompt: "scène", references: ["A", "B"], aspect: "9:16" });
    expect(f2.body).toMatchObject({ input_image: "A", input_image_2: "B" });
    expect(() => bflImageRequest("k", "flux-pro-1.0-expand", { prompt: "", references: [], aspect: "1:1" })).toThrow();
    const s = bflSize("9:16");
    expect(s.width % 16 + s.height % 16).toBe(0);
    expect(s.height).toBeGreaterThan(s.width);
  });

  it("agrandir le cadre : la photo reste entière au centre ; marges justes pour la story et le carré", () => {
    expect(margesPour(1000, 1000, "9:16")).toEqual({ left: 0, right: 0, top: 389, bottom: 389, width: 1000, height: 1778 });
    expect(margesPour(800, 1000, "1:1")).toEqual({ left: 100, right: 100, top: 0, bottom: 0, width: 1000, height: 1000 });
    const e = bflExpandRequest("k", { image: "A", top: 10.4, bottom: 9000, left: -3, right: 0, prompt: "p" });
    expect(e.body).toMatchObject({ top: 10, bottom: 2048, left: 0, right: 0, safety_tolerance: 2 });
  });

  it("lecture du suivi ; une adresse de suivi hors de bfl.ai est refusée", () => {
    expect(bflSubmitted({ id: "abc", polling_url: "https://api.eu.bfl.ai/v1/get_result?id=abc" }).id).toBe("abc");
    expect(() => bflSubmitted({ id: "abc", polling_url: "https://pirate.example/x" })).toThrow();
    expect(bflPoll({ status: "Pending" })).toEqual({ state: "running" });
    expect(bflPoll({ status: "Ready", result: { sample: "https://delivery.bfl.ai/x.png" } })).toEqual({ state: "done", imageUrl: "https://delivery.bfl.ai/x.png" });
    expect(bflPoll({ status: "Content Moderated" })).toMatchObject({ state: "failed", moderated: true });
  });
});

describe("les gestes simples (point 5)", () => {
  it("les mots du client repris tels quels ; une seule chose change ; la story et le carré ne touchent pas la photo", () => {
    expect(consigneGeste("fond", "un mur de   pierre clair")).toMatch(/^Remplacer seulement le fond de la photo par : un mur de pierre clair\./);
    expect(consigneGeste("fond", "x")).toMatch(/même étiquette et mêmes inscriptions, lettre pour lettre/);
    expect(consigneGeste("retirer", "le câble")).toMatch(/^Retirer seulement ceci de la photo : le câble\./);
    expect(consigneGeste("story", "")).toMatch(/La photo d'origine reste intacte au centre/);
    expect(consigneGeste("story", "")).toMatch(/aucune personne/);
    expect(demandeIncomplete("fond", "", "fr")).toMatch(/^Dis-moi le nouveau fond/);
    expect(demandeIncomplete("story", "", "fr")).toBeNull();
  });
});

describe("« Mets mon produit dans une scène » (point 3)", () => {
  it("le juge lit l'étiquette mot à mot, dans la consigne de relecture de toute image du vrai produit", async () => {
    const { reviewPrompt } = await import("@/lib/image-v2/deps");
    const brief = { kind: "usage_scene", support: "social", format: { aspect: "4:5", textZone: "none" }, subject: "flacon", positive: [], negative: [], facts: [], artDirection: "x", composition: "x", lighting: "x", framing: "x", productFidelity: true, people: false } as never;
    expect(reviewPrompt(brief)).toContain(JUGE_ETIQUETTE);
    expect(reviewPrompt({ ...(brief as object), productFidelity: false } as never)).not.toContain("LABEL CHECK");
  });

  it("« vrais pixels reposés » reste éteint sans le réglage du propriétaire", () => {
    expect(vraisPixelsActifs(() => null)).toBe(false);
    expect(vraisPixelsActifs((k) => (k === REGLAGE_VRAIS_PIXELS ? "0" : null))).toBe(false);
    expect(vraisPixelsActifs((k) => (k === REGLAGE_VRAIS_PIXELS ? "1" : null))).toBe(true);
  });

  it("essai simulé : les pixels du détourage sont reposés dans la boîte où le modèle a placé le produit", async () => {
    const scene = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 200, g: 200, b: 200, alpha: 1 } } }).png().toBuffer();
    const cut = await sharp({ create: { width: 50, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
    const masque = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: await sharp({ create: { width: 40, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer(), left: 80, top: 100 }]).png().toBuffer();
    expect(await boiteProduit(masque)).toEqual({ x: 80, y: 100, w: 40, h: 80 });
    const out = await reposerVraisPixels(scene, cut, masque);
    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
    expect(px(100, 140)).toEqual([255, 0, 0]);
    expect(px(10, 10)).toEqual([200, 200, 200]);
  });
});

describe("la signature C2PA du Studio (point 4) : préparée, éteinte", () => {
  it("le manifeste cite l'image d'OpenAI ; aucune signature sans le réglage et un certificat", () => {
    const m = manifesteStudio({ titre: "scène", image: Buffer.from("x"), ingredients: [{ titre: "openai", sha256: "ab", faitParIa: true, fabricant: "OpenAI" }], actions: ["placed"] });
    expect(m.ingredients[0]).toMatchObject({ sha256: "ab", relationship: "parentOf" });
    expect(JSON.stringify(m)).toContain("compositeWithTrainedAlgorithmicMedia");
    expect(signatureActive(() => null, Buffer.from("cert"))).toBe(false);
    expect(signatureActive(() => "1", null)).toBe(false);
    expect(() => signerImage()).toThrow(/juriste/);
  });
});

describe("les mentions obligatoires posées seules (point 12)", () => {
  it("« Images virtuelles » pour une personne créée, « Images retouchées » pour une personne fournie modifiée, mention IA des publicités", () => {
    expect(mentionsPour({})).toEqual([]);
    expect(mentionsPour({ personneCreee: true })).toEqual(["images_virtuelles"]);
    expect(mentionsPour({ personneCreee: true, publicite: true })).toEqual(["images_virtuelles", "ia_publicite"]);
    expect(mentionsPour({ personneFournieModifiee: true })).toEqual(["images_retouchees"]);
    expect(mentionsDe({ mentions: ["images_virtuelles", "autre"] })).toEqual(["images_virtuelles"]);
    const l = legendeAvecMentions("Le coffret t'attend.", ["images_virtuelles"]);
    expect(l).toBe("Le coffret t'attend.\n\nImages virtuelles.");
    expect(legendeAvecMentions(l, ["images_virtuelles"])).toBe(l);
  });

  it("la mention reste après la coupe de la légende sur chaque réseau", () => {
    const long = "Une phrase calme. ".repeat(200);
    const a = adaptForPlatform("pinterest", { caption: long, title: "t", hashtags: [], link: null, format: "pin", mediaCount: 1, mentions: ["images_virtuelles"] });
    expect(a.caption.endsWith("Images virtuelles.")).toBe(true);
    const b = adaptForPlatform("instagram", { caption: "Bonjour.", title: "t", hashtags: [], link: null, format: "image", mediaCount: 1 });
    expect(b.caption).toBe("Bonjour.");
    expect("mentions" in b).toBe(false);
  });
});

describe("les modèles prêts en images (point 9)", () => {
  it("les fêtes datées justes (Pâques, fête des mères décalée quand c'est la Pentecôte)", () => {
    expect(paques(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(feteDesMeres(2026).toISOString().slice(0, 10)).toBe("2026-05-31");
    // 2020 : la Pentecôte tombait le dernier dimanche de mai (31 mai) → fête des mères le 7 juin.
    expect(feteDesMeres(2020).toISOString().slice(0, 10)).toBe("2020-06-07");
    expect(feteDesMeres(2024).toISOString().slice(0, 10)).toBe("2024-05-26");
  });

  it("trois épinglés par SINA : les fêtes des trois semaines, puis la saison, puis la nouveauté ; l'offre seulement avec une offre", () => {
    const fin = modelesPour(new Date(Date.UTC(2026, 11, 10)), { offreSaisie: false });
    expect(fin.filter((m) => m.epingle).map((m) => m.id)).toEqual(["noel", "hiver", "nouveaute"]);
    expect(fin.some((m) => m.id === "offre" && !m.epingle)).toBe(true);
    const avecOffre = modelesPour(new Date(Date.UTC(2026, 11, 10)), { offreSaisie: true });
    expect(avecOffre.filter((m) => m.epingle).map((m) => m.id)).toEqual(["offre", "noel", "hiver"]);
    const juillet = modelesPour(new Date(Date.UTC(2026, 6, 1)), { offreSaisie: false });
    expect(juillet.filter((m) => m.epingle).map((m) => m.id)).toEqual(["ete", "nouveaute", "rentree"]);
    for (const m of fin) expect(`${m.idee[0]} ${m.idee[1]}`).not.toMatch(/personne|femme|homme|enfant|main|person|woman|man|child|hand/i);
  });
});

describe("les vidéos pour vendre (point 10)", () => {
  it("huit modèles et douze gestes de caméra nommés en français", () => {
    expect(MODELES_VIDEOS).toHaveLength(8);
    expect(GESTES_CAMERA).toHaveLength(12);
    for (const g of GESTES_CAMERA) expect(g.nom[0]).not.toBe(g.nom[1].toLowerCase());
  });

  it("« Le déballage » se fait SANS MAINS : la boîte s'ouvre seule, jamais une personne", () => {
    const m = modeleVideo("deballage")!;
    expect(m.garde[0]).toMatch(/Sans mains/);
    const d = demandeDuModele(m, { photoDuDos: false }, "fr");
    expect(d.ok).toBe(true);
    if (d.ok) { expect(d.demande.request).toMatch(/aucune main/i); expect(d.demande.motion).toMatch(/no hands, no people/); expect(d.demande.motion).toMatch(/opens? by itself|open by itself/); }
    const plan = avecModele({ scenes: [{ still: "boîte", motion: "camera push-in", title: "" }] }, { modele: "deballage" });
    expect(plan.scenes[0].motion).toMatch(/no hands, no people/);
    expect(motionPrompt(plan.scenes[0])).toMatch(/Only the camera and the light move, and the lid of the box, lifting open by itself:/);
    expect(motionPrompt(plan.scenes[0])).toMatch(/no people, no hands/);
    // Aucun modèle ne montre une main ou une personne : ces mots n'apparaissent que dans « aucune main, aucune personne ».
    for (const x of MODELES_VIDEOS) expect(x.scene.replace(/aucune (main|personne)/gi, "")).not.toMatch(/\b(mains?|personnes?|client|cliente)\b/i);
  });

  it("l'avant-après n'invente jamais l'après ; l'offre n'est jamais inventée ; le tour complet seulement avec une photo du dos", () => {
    expect(demandeDuModele(modeleVideo("avant-apres")!, { photoDuDos: false }, "fr")).toMatchObject({ ok: false });
    expect(modeleVideo("avant-apres")!.sansIa).toBe(true);
    expect(demandeDuModele(modeleVideo("offre")!, { photoDuDos: false, offre: "" }, "fr")).toMatchObject({ ok: false });
    const o = demandeDuModele(modeleVideo("offre")!, { photoDuDos: false, offre: "-20 % jusqu'au 30 novembre" }, "fr");
    expect(o.ok && o.demande.request).toMatch(/« -20 % jusqu'au 30 novembre »/);
    expect(gesteDuModele(modeleVideo("tourne")!, { photoDuDos: false }).id).toBe("demi-tour");
    expect(gesteDuModele(modeleVideo("tourne")!, { photoDuDos: true }).id).toBe("tour");
    expect(avecModele({ scenes: [{ still: "x", motion: "m", title: "" }] }, {}).scenes[0].motion).toBe("m");
  });

  it("la musique vient du compositeur du Studio ; ElevenLabs n'est pas branché (point 11)", () => {
    expect(ELEVENLABS_BRANCHE).toBe(false);
  });
});

describe("SINA en direct dans l'atelier (point 7) et « Mes créations » (point 6)", () => {
  it("trois façons de faire ; le conseil d'outil en une phrase ; l'avertissement avant un risque sur l'étiquette", () => {
    expect(MODES.map((m) => m.id)).toEqual(["sina", "ensemble", "moi"]);
    const l = outilsPour("fond", tous);
    expect(conseilOutil("fond", l, "fr")).toMatch(/^Je prends OpenAI GPT-Image 2\.6 pour « change le fond » : /);
    const kontext = outilsPour("fond", tous).find((o) => o.provider === "bfl")!;
    expect(avertissement({ outil: kontext, produitATexte: true, vraisPixels: false }, "fr")).toMatch(/ton étiquette risque de changer/);
    expect(avertissement({ outil: kontext, produitATexte: false, vraisPixels: false }, "fr")).toBeNull();
    expect(avertissement({ outil: l[0], produitATexte: true, vraisPixels: false }, "fr")).toBeNull();
  });

  it("« Améliorer ma demande avec SINA » : les mots du client d'abord, les ajouts montrés à part, rien d'inventé", () => {
    const a = ameliorerDemande("sur une table en chêne", { couleurs: ["#123456"], ton: "chaleureuse", aspect: "4:5", geste: "scene" }, "fr");
    expect(a.texte.startsWith("sur une table en chêne ; ")).toBe(true);
    expect(a.ajouts.length).toBeGreaterThanOrEqual(3);
    for (const x of a.ajouts) expect(a.texte).toContain(x);
    expect(a.ajouts.join(" ")).toContain("#123456");
  });

  it("la phrase sur ce qui dort", () => {
    expect(phraseNonServies(0, "fr")).toBeNull();
    expect(phraseNonServies(3, "fr")).toBe("3 créations n'ont pas encore servi : je les mets dans ton calendrier ?");
    expect(phraseNonServies(1, "en")).toMatch(/^1 creation/);
  });

  it("l'atelier a sa place dans « Créer », avec sa phrase en français et en anglais", () => {
    const s = SPACES.find((x) => x.id === "atelier")!;
    expect(s.group).toBe("creer");
    expect(s.purpose[0]).toMatch(/ton vrai produit/);
    expect(s.purpose[1].length).toBeGreaterThan(10);
  });
});
