/**
 * La marque FINIE de l'identité choisie (lot 2, 15 novembre 2026). Second temps de l'étape « La marque » : les planches
 * proposées n'ont que leur logo et leur grande scène ; une fois l'identité choisie, le Studio
 *
 *   1. crée les images qui lui manquent (l'objet qui porte le logo, les signes, les trois publications ; et ce qui porte
 *      le logo quand il a changé), relues avant d'être montrées ;
 *   2. adopte son logo comme logo de la marque : celui créé par OpenAI pour sa planche, fond retiré, avec ses
 *      déclinaisons ; s'il n'y en a pas de validé, le nom dessiné (exact à la lettre) sert de secours, et c'est dit ;
 *   3. prépare la charte complète (déclinaisons, favicons, avatar, planche, charte PDF), sans IA.
 *
 * Une seule façon de faire un logo : la méthode des graphistes (logo-graphistes.ts). Le logo ne se dessine jamais ici :
 * « un autre logo » passe par logo.autre ou logo.pistes, qui posent le logo fini sur la planche ; ce qui le porte est
 * alors refait ici, avec lui.
 */
import { z } from "zod";
import { UserFacingError, getJob, type JobContext } from "../jobs";
import { json as parseJson } from "../db";
import { L } from "../i18n-server";
import sharp from "sharp";
import { assetData, getAsset, saveAsset } from "../library";
import { CostCapReached } from "../ai/trace";
import { loadProject, saveBrand } from "../projects";
import { chooseLogoV2 } from "../logo-v2/choose";
import type { Territory } from "../logo-v2/types";
import type { ChainAi } from "./brand-chain";
import { clientWords, goutsDuClient } from "./brand-chain";
import { CREATED_SLOTS, clientLogoOf, logoDetoure, onWhite, proposalImagery, runBoardImages, sansFond, type ImageSlot } from "./brand-images";
import { buildBrandKit } from "./brand-kit";
import type { Route } from "./brand-routes";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";
import { chosenRoute, freeLogoFacts, saveBoardLogo, singleTerritory, type SinaLogo } from "./logos";
import { plancheEnVraiActive, type EtatPlancheEnVrai } from "./planche-en-vrai";
import { peopleAllowed } from "../people-policy";

type Images = NonNullable<Route["board"]["images"]>;
const has = (i: Images | undefined, s: ImageSlot): boolean =>
  !!i && (s === "logo" ? !!i.logo : s === "hero" ? !!i.hero : s === "object" ? !!i.object : s === "signs" ? !!i.signs : s === "site" ? !!i.site : !!i.posts?.[Number(s.slice(4))]);

/** Images qui manquent encore à l'identité choisie (un logo gardé par le client n'est jamais à créer). */
export function missingSlots(j: Journey): ImageSlot[] {
  const x = chosenRoute(j);
  if (!x) return [];
  // La maquette du site appartient à la proposition : absente (refusée, ou jamais demandée), elle ne se refait que si
  // le client la demande (redo « site »), jamais d'office à la fin de la marque, qui reste couverte par son accord.
  // Sauf un logo refait SEUL avant le choix (20 novembre 2026) : la maquette montre encore l'ancien logo, elle est refaite.
  // Nom retouché ou pris à une autre identité : le téléphone portait l'ancien nom, il est refait (sinon la marque finie
  // restait sans téléphone, audit du 22 novembre 2026).
  const c = j.identityChoice, nomChange = !!c?.edits?.name || (!!c?.mix?.name && c.mix.name !== c.key);
  // Un logo pris à une autre identité, ou posé depuis la fin de la marque (logo.autre, logo.pistes) : ce qui porte
  // l'ancien est refait avec lui (jamais deux logos différents sur la marque).
  const logoPris = !!c?.mix?.logo && c.mix.logo !== c.key;
  const logoChange = !!j.brandFinish?.logoFrom && !!x.board.images?.logo && x.board.images.logo.id !== j.brandFinish.logoFrom;
  const ancien = (j.identities?.siteAncienLogo ?? []).includes(x.key) || nomChange || logoPris || logoChange;
  return CREATED_SLOTS.filter((s) => (s !== "site" || ancien) && (!has(x.board.images, s) || (s === "site" && ancien) || (logoChange && s !== "hero")));
}

/** Images réellement refaites : un nouveau logo entraîne ce qui le porte (jamais deux logos différents sur la marque). */
export function finishSlots(j: Journey, redo?: readonly ImageSlot[]): ImageSlot[] {
  let slots: ImageSlot[] = redo?.length ? [...redo] : missingSlots(j);
  return CREATED_SLOTS.filter((s) => slots.includes(s));
}

/**
 * Demande du symbole seul, tirée du logo (décision du propriétaire du 23 novembre 2026, « le plus libre possible » : plus
 * aucune consigne de dessin ni de fond). Le logo est la seule image jointe : sans lui, le symbole ne serait pas tiré du
 * logo (règle du 15 novembre 2026 : « une corrélation avec le logo »). Le fond est retiré par le Studio ; le relecteur du
 * symbole juge s'il reprend le logo et reste lisible en petit.
 */
export const symbolPrompt = (x: Pick<Route, "name">) => `Voici le logo de la marque « ${x.name.normalize("NFC").trim()} ». Fais-moi son symbole seul, sans le nom, pour l'icône de son site.`;
const SYMBOL_REVIEW = "Tu contrôles le symbole d'une marque avant qu'il serve d'icône de site. Compare-le au logo fourni. ok = true seulement si : c'est bien le signe du logo (ou une lettre du nom dessinée comme dans le logo), reconnaissable au premier regard, dans ses couleurs ; il est seul, sans le nom entier ni autre texte ; il resterait lisible en tout petit. Sinon ok = false et why dit le défaut en une phrase simple, à la première personne. Réponds UNIQUEMENT avec l'objet JSON {\"ok\": true, \"why\": \"\"}.";
const SymbolReviewSchema = z.object({ ok: z.boolean(), why: z.string().max(300).default("") });

export const FinishPayload = z.object({ slots: z.array(z.enum(CREATED_SLOTS)).optional(), guidance: z.string().max(1500).optional() });

export async function runBrandFinish(o: {
  ctx: JobContext; ai: ChainAi; projectId: string; userId: string; conversationId: string; brief: string; kind: "produits" | "services";
  slots?: ImageSlot[]; guidance?: string; /** La planche en vrai : ses produits imaginés refaits avec les photos du client. */ produitsEnVrai?: boolean;
}) {
  const { ctx, ai } = o, who = { userId: o.userId, projectId: o.projectId };
  const j = journeyOf(o.conversationId), p = loadProject(o.projectId);
  if (o.produitsEnVrai) {
    const r0 = chosenRoute(j), ev = j.plancheEnVrai;
    if (!r0 || !ev) throw new UserFacingError(L("Ta planche en vrai n'est pas encore faite : rien n'a été décompté.", "Your full-resolution board is not done yet. Nothing was charged."));
    const T = await import("./planche-en-vrai-tache");
    ctx.progress(0.1, L("Je refais tes produits avec tes photos", "Redoing your products with your photos"));
    const enVraiAi = T.plancheEnVraiDeps.ai ? T.plancheEnVraiDeps.ai(ctx.job.id) : T.vraisAppelsEnVrai({ ...who, jobId: ctx.job.id });
    const etat = await T.refaireLesProduitsEnVrai({ ctx, ai: enVraiAi, who, route: r0, etat: ev, personnes: peopleAllowed(o.projectId) });
    updateJourney(o.conversationId, (x) => { x.plancheEnVrai = etat; if (x.brandFinish) x.brandFinish.issues = [...new Set([...(x.brandFinish.issues ?? []).filter((l) => !/image d'ambiance|mood image/.test(l)), ...etat.issues])]; });
    return { finished: true, name: r0.name, created: [], issues: etat.issues, notes: etat.notes, kit: !!j.brandKit, images: etat.elements.filter((e) => e.id).length };
  }
  const choisie = chosenRoute(j);
  if (!choisie || !p.brand || !j.identityChoice) throw new UserFacingError(L("Ton identité doit être choisie avant que je finisse ta marque. Rien n'a été décompté.", "Choose your identity first. Nothing was charged."));
  const route: Route = choisie;
  const round = j.identities?.round ?? 1, keptLogo = j.keep.includes("logo");
  const clientLogo = keptLogo ? await clientLogoOf(o.projectId) : null;
  // LA PLANCHE EN VRAI (25 novembre 2026, réglage sina.planche.envrai) : un nouveau projet dont la planche de marque est
  // choisie n'a plus d'images créées ici ni de symbole tiré du logo ; sa planche de démonstration est refaite en vrai.
  const enVrai = plancheEnVraiActive() && !keptLogo && !!route.board.planche?.image;
  const slots = enVrai ? [] : finishSlots(j, o.slots);
  // La direction artistique n'est réécrite que si ce que les images montrent change (couleurs, polices, nom, logo pris
  // ailleurs) ; une signature retouchée, un ton pris ailleurs ne la touchent pas (audit de la marque, 22 novembre 2026).
  const c = j.identityChoice, ailleurs = (part: string) => { const k = (c.mix as Record<string, string | undefined> | undefined)?.[part]; return !!k && k !== c.key; };
  const mixed = ["palette", "fonts", "name", "logo"].some(ailleurs) || !!c.edits?.name;
  const notes: string[] = [], issues: string[] = [];

  // 1. Les images. La direction artistique du premier temps ressert telle quelle, sauf si le client a mélangé deux
  // identités ou demande un changement avec ses mots (elle est alors réécrite, pour ce qu'il veut vraiment).
  let current: Route = route;
  if (slots.length) {
    ctx.progress(0.1, L("Je crée les images de ta marque", "Creating your brand's images"));
    const r = await runBoardImages({
      ctx, ai, who, brief: o.brief, kind: o.kind, route, round, slots, clientLogo,
      imagery: mixed || o.guidance ? undefined : proposalImagery(j, route),
      // Le relecteur reçoit les mots du client (sa fiche et ce qu'il vient de dire), refus compris.
      gouts: goutsDuClient(j, o.projectId, clientWords(o.guidance)),
    });
    current = r.route; notes.push(...r.notes);
    // La maquette refaite avec le bon logo : la planche n'est plus notée « ancien logo ».
    if (slots.includes("site") && current.board.images?.site) updateJourney(o.conversationId, (y) => { if (y.identities?.siteAncienLogo) y.identities.siteAncienLogo = y.identities.siteAncienLogo.filter((k) => k !== route.key); });
    // « Identité A : … » n'a plus de sens une fois l'identité choisie : c'est SA marque.
    issues.push(...r.issues.map((l) => l.replace(/^Identité [A-D] : /, "").replace(/^Identity [A-D]: /, "")).map((l) => l.charAt(0).toUpperCase() + l.slice(1)));
  }
  const images = current.board.images;

  // 2. Le logo de la marque : celui de la planche (fini par la méthode des graphistes), fond retiré. Sans logo, plus de nom
  // dessiné en secours (règle du propriétaire : « Jamais une planche incomplète ») : la marque n'est pas montrée comme
  // finie, SINA dit ce qui bloque et cherche les pistes de son logo à sa charge (logo.pistes, « À ma charge : 0 % »).
  let logos = j.logos?.list ?? [], logoChoice = j.logoChoice;
  const from = images?.logo?.id ?? null;
  const boardLogo = images?.logo ? getAsset(images.logo.id) : undefined;
  const manqueLogo = !keptLogo && !(boardLogo && boardLogo.project_id === o.projectId && !boardLogo.deleted_at);
  if (manqueLogo) issues.push(L("Ta marque n'est pas encore finie : il lui manque son logo. Je ne te la montre pas sans logo : je cherche les pistes de ton logo, à ma charge, et tu choisis ton esquisse ; rien n'est compté pour toi.", "Your brand is not finished yet: its logo is missing. I look for your logo directions at my expense, and you choose your sketch."));
  if (!keptLogo && !manqueLogo && (!logoChoice || (j.brandFinish as { logoFrom?: string | null } | undefined)?.logoFrom !== from)) {
    ctx.progress(0.8, L("Je prépare ton logo", "Preparing your logo"));
    const draft = singleTerritory(freeLogoFacts(p.brand, j), current);
    const assetId = await saveBoardLogo(ctx, who, current, { ...draft, id: "planche-logo", style: "libre" } as Territory, await sansFond(assetData(boardLogo!), current.palette.dark));
    await chooseLogoV2(null, o.projectId, assetId);
    const logo: SinaLogo = { source: "A", name: L("Ton logo", "Your logo"), style: "libre", assetId, verdict: "PROVISIONAL", score: null, reason: L("créé pour ta marque et relu : ton nom y est exact", "made for your brand and reviewed: your name is exact"), kind: "image", choosable: true };
    logos = [logo]; logoChoice = { source: "A", assetId, at: Date.now() };
  }

  // 2 bis. Le symbole seul, tiré du LOGO (retour du propriétaire du 15 novembre 2026 : « ça doit reprendre le logo pour en
  // faire un vrai favicon qui a une corrélation avec le logo » ; avant, le Studio dessinait une initiale dans un rond).
  // OpenAI reçoit le logo et en isole le signe ; relu avant d'être gardé. Le favicon et l'avatar de la charte en partent.
  const brandNow = loadProject(o.projectId).brand, mainLogo = brandNow?.logo.assetId ? getAsset(brandNow.logo.assetId) : undefined;
  const symbolDone = (j.brandFinish as { symbolFor?: string } | undefined)?.symbolFor;
  let symbolFor = symbolDone;
  if (!manqueLogo && brandNow && mainLogo && !mainLogo.deleted_at && symbolDone !== mainLogo.id && symbolDone !== `refus:${mainLogo.id}` && !(logos[0]?.kind === "planche") && !enVrai) {
    ctx.progress(0.85, L("Je tire le symbole de ton logo", "Deriving the symbol from your logo"));
    try {
      const made = await ctx.step(`brand:symbol:${round}:${mainLogo.id}`, async () => {
        const logoPng = await onWhite(assetData(mainLogo));
        // Le symbole est un dessin du logo : usage « logo », modèle imposé (logo-policy.ts).
        const data = await ai.draw(`symbol-${round}`, { prompt: symbolPrompt(current), aspect: "1:1", logo: await onWhite(logoPng), usage: "logo" });
        // Le fond du symbole est retiré par le Studio (creux compris) ; un fond qu'il ne sait pas retirer est un refus.
        const net = await logoDetoure(await sharp(data).png().toBuffer(), current.palette.dark);
        if (!net.ok) return { ok: false as const, why: net.why };
        const png = await onWhite(net.png);
        const seen = await ai.look(`symbolcheck-${round}`, { system: SYMBOL_REVIEW, schema: SymbolReviewSchema, prompt: `Marque : « ${current.name} ». Image 1 : le symbole proposé. Image 2 : le logo de la marque.`, images: [{ data: png, label: "symbole" }, { data: logoPng, label: "logo" }] });
        if (!seen.ok) return { ok: false as const, why: seen.why.replace(/\.+$/, "") || L("il ne reprend pas le logo", "it does not match the logo") };
        const asset = await saveAsset({ projectId: o.projectId, userId: o.userId, data: net.png, name: "symbole.png", mime: "image/png", role: "logo-mark", folderKey: "brand.logos", origin: "generated", sourceAssetId: mainLogo.id, meta: { engine: "syna-brand-symbol" } });
        return { ok: true as const, id: asset.id };
      });
      if (made.ok) { const b2 = loadProject(o.projectId).brand!; saveBrand(o.projectId, { ...b2, logo: { ...b2.logo, markAssetId: made.id } }); symbolFor = mainLogo.id; }
      else symbolFor = `refus:${mainLogo.id}`;
      if (!made.ok) issues.push(L(`Je n'ai pas gardé le symbole tiré de ton logo (${made.why}) : ton favicon ne change pas pour l'instant. Je peux le refaire, je t'annonce son prix avant.`, `I did not keep the symbol derived from your logo (${made.why}).`));
    } catch (e) {
      if (!(e instanceof CostCapReached)) notes.push(`symbole non créé : ${String((e as Error)?.message ?? e).slice(0, 140)}`);
      issues.push(L("Je n'ai pas pu tirer le symbole de ton logo : ton favicon ne change pas pour l'instant.", "I could not derive the symbol from your logo."));
    }
  }

  // Symbole déjà refusé pour ce logo : pas de nouvel essai tout seul, mais le refus reste dit au client.
  if (mainLogo && symbolDone === `refus:${mainLogo.id}`) issues.push(...(j.brandFinish?.issues ?? []).filter((l) => /symbole/i.test(l)));

  // 2 ter. La planche en vrai : la planche choisie refaite à l'identique, ses logos, sa palette et ses polices.
  let etatEnVrai: EtatPlancheEnVrai | null = null;
  if (enVrai && !manqueLogo) {
    const T = await import("./planche-en-vrai-tache");
    const logoId = loadProject(o.projectId).brand?.logo.assetId;
    // Le logo a changé après le choix : la démonstration est refaite d'abord (jamais deux logos différents).
    if (T.logoChangeDepuisLaDemo(route, from)) issues.push(T.phraseDuLogoChange());
    else if (logoId) {
      const enVraiAi = T.plancheEnVraiDeps.ai ? T.plancheEnVraiDeps.ai(ctx.job.id) : T.vraisAppelsEnVrai({ ...who, jobId: ctx.job.id });
      try {
        etatEnVrai = await T.plancheEnVrai({ ctx, ai: enVraiAi, who, route: current, logoAssetId: logoId, personnes: peopleAllowed(o.projectId), phrase: loadProject(o.projectId).brand?.tagline?.trim() || current.slogan || "" });
        issues.push(...etatEnVrai.issues); notes.push(...etatEnVrai.notes);
      } catch (e) {
        if (e instanceof CostCapReached) issues.push(L("Le plafond annoncé a été atteint avant la fin de ta planche en vrai : ce qui est fait est gardé, je la reprends là sans rien repayer.", "The announced cap was reached before your board was finished."));
        else throw e;
      }
    }
  }

  // 3. La charte complète (gratuite, rendue par le Studio). Le slogan choisi est validé : la planche et la charte l'écrivent.
  ctx.progress(0.9, L("Je prépare ta charte", "Preparing your brand guidelines"));
  const b = loadProject(o.projectId).brand;
  if (b?.tagline?.trim() && !(b.validated ?? []).includes("tagline")) saveBrand(o.projectId, { ...b, validated: [...(b.validated ?? []), "tagline"] });
  let kit: Awaited<ReturnType<typeof buildBrandKit>> | null = null;
  // Sans logo, pas de charte : la marque n'est pas finie (jamais une planche incomplète).
  if (!manqueLogo && loadProject(o.projectId).brand?.logo.assetId) {
    try { kit = await buildBrandKit(o.projectId); } catch (e) { notes.push(`charte non préparée : ${String((e as Error)?.message ?? e).slice(0, 140)}`); issues.push(L("Je n'ai pas pu préparer ta charte : je la refais dès que tu me le dis, sans rien compter.", "I could not prepare your guidelines: I will redo them when you ask, at no cost.")); }
  }

  updateJourney(o.conversationId, (x) => {
    const { manque: _avant, studio: _studio, ...avant } = x.brandFinish ?? {};
    x.brandFinish = { ...avant, prepaidMicro: 0, ...(images ? { images } : {}), at: Date.now(), issues: [...new Set(issues)], logoFrom: from, ...(symbolFor ? { symbolFor } : {}), ...(manqueLogo ? { manque: ["logo"] } : {}) } as Journey["brandFinish"];
    if (!keptLogo && logoChoice) { x.logos = { list: logos, at: Date.now(), round: (x.logos?.round ?? 0) + 1, notes: [] }; x.logoChoice = logoChoice; setStep(x, 2, "done"); }
    if (kit) { x.brandKit = kit; setStep(x, 3, "review"); } else setStep(x, 3, "todo");
    if (etatEnVrai) x.plancheEnVrai = etatEnVrai;
    // Le logo manque : l'étape du logo n'est pas faite, la marque n'est pas montrée comme finie.
    if (manqueLogo) { x.brandKit = undefined; if (x.steps[2]?.status !== "skipped") setStep(x, 2, "todo"); }
  });
  return { finished: true, name: current.name, created: slots, issues: [...new Set(issues)], notes, kit: !!kit, images: Object.values(images ?? {}).flat().filter((v) => v && typeof v === "object").length };
}
