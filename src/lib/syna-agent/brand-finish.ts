/**
 * La marque FINIE de l'identité choisie (lot 2, 15 novembre 2026). Second temps de l'étape « La marque » : les planches
 * proposées n'ont que leur logo et leur grande scène ; une fois l'identité choisie, le Studio
 *
 *   1. crée les images qui lui manquent (l'objet qui porte le logo, les signes, les trois publications ; et le logo ou
 *      la scène si le client a mélangé deux identités ou demande un autre logo), relues avant d'être montrées ;
 *   2. adopte son logo comme logo de la marque : celui créé par OpenAI pour sa planche, fond retiré, avec ses
 *      déclinaisons ; s'il n'y en a pas de validé, le nom dessiné (exact à la lettre) sert de secours, et c'est dit ;
 *   3. prépare la charte complète (déclinaisons, favicons, avatar, planche, charte PDF), sans IA.
 *
 * Une seule façon de faire un logo : celui de la planche. « Un autre logo » repasse par ici (`slots` = logo), avec
 * les mots du client, et ce qui porte le logo est refait avec le nouveau.
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
import { cleanArtwork } from "../logo-v2/artwork";
import type { Territory } from "../logo-v2/types";
import type { ChainAi } from "./brand-chain";
import { clientWords, goutsDuClient } from "./brand-chain";
import { CREATED_SLOTS, ImagerySchema, clientLogoOf, logoOnWhite, onWhite, runBoardImages, type ImageSlot, type Imagery } from "./brand-images";
import { buildBrandKit } from "./brand-kit";
import type { Route } from "./brand-routes";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";
import { chosenRoute, freeLogoFacts, saveBoardLogo, savePlancheLogo, singleTerritory, type SinaLogo } from "./logos";

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
  const ancien = (j.identities?.siteAncienLogo ?? []).includes(x.key);
  return CREATED_SLOTS.filter((s) => (s !== "site" || ancien) && !(s === "logo" && j.keep.includes("logo")) && (!has(x.board.images, s) || (s === "site" && ancien)));
}

/** Images réellement refaites : un nouveau logo entraîne ce qui le porte (jamais deux logos différents sur la marque). */
export function finishSlots(j: Journey, redo?: readonly ImageSlot[]): ImageSlot[] {
  let slots: ImageSlot[] = redo?.length ? [...redo] : missingSlots(j);
  if (j.keep.includes("logo")) slots = slots.filter((s) => s !== "logo");
  if (slots.includes("logo")) slots = [...slots, "object", "signs"];
  return CREATED_SLOTS.filter((s) => slots.includes(s));
}

/** La direction artistique écrite pour la planche au premier temps (même tâche de création) : reprise sans la repayer. */
function proposalImagery(j: Journey, x: Route): Imagery | undefined {
  const id = j.identities?.chainJobId, round = j.identities?.round;
  if (!id || !round) return undefined;
  try {
    const cp = parseJson<Record<string, unknown>>(getJob(id)?.checkpoint ?? "{}", {});
    const key = Object.keys(cp).find((k) => k.startsWith(`brand:imagery:${round}:${x.key}`));
    const r = key ? ImagerySchema.safeParse(cp[key]) : null;
    return r?.success ? r.data : undefined;
  } catch { return undefined; }
}

/** Demande du symbole seul : le signe du logo, isolé (ou sa lettre la plus reconnaissable quand le logo n'a pas de signe). */
export const symbolPrompt = (x: Route) => [
  `Voici le logo de la marque « ${x.name} » (image de référence). Crée son SYMBOLE SEUL, celui qui servira d'icône de site et d'avatar : reprends EXACTEMENT le signe du logo (le même dessin, les mêmes traits, les mêmes couleurs), sans le nom ni aucun autre texte.`,
  "Si le logo n'a pas de signe à côté du nom, prends sa lettre la plus reconnaissable, dessinée exactement comme dans le logo (même forme, même graisse, même couleur).",
  "Simplifie seulement ce qu'il faut pour qu'il reste lisible en tout petit (16 pixels) : formes pleines, peu de détails. On doit reconnaître le logo au premier regard.",
  "Un seul symbole, centré, à plat, sur un fond BLANC uni jusqu'aux bords, avec de l'air autour. Ni cadre, ni rond autour, ni ombre, ni maquette.",
].join("\n");
const SYMBOL_REVIEW = "Tu contrôles le symbole d'une marque avant qu'il serve d'icône de site. Compare-le au logo fourni. ok = true seulement si : c'est bien le signe du logo (ou une lettre du nom dessinée comme dans le logo), reconnaissable au premier regard, dans ses couleurs ; il est seul, sans le nom entier ni autre texte ; il resterait lisible en tout petit. Sinon ok = false et why dit le défaut en une phrase simple, à la première personne. Réponds UNIQUEMENT avec l'objet JSON {\"ok\": true, \"why\": \"\"}.";
const SymbolReviewSchema = z.object({ ok: z.boolean(), why: z.string().max(300).default("") });

export const FinishPayload = z.object({ slots: z.array(z.enum(CREATED_SLOTS)).optional(), guidance: z.string().max(1500).optional() });

export async function runBrandFinish(o: {
  ctx: JobContext; ai: ChainAi; projectId: string; userId: string; conversationId: string; brief: string; kind: "produits" | "services";
  slots?: ImageSlot[]; guidance?: string;
}) {
  const { ctx, ai } = o, who = { userId: o.userId, projectId: o.projectId };
  const j = journeyOf(o.conversationId), p = loadProject(o.projectId);
  const route = chosenRoute(j);
  if (!route || !p.brand || !j.identityChoice) throw new UserFacingError(L("Ton identité doit être choisie avant que je finisse ta marque. Rien n'a été décompté.", "Choose your identity first. Nothing was charged."));
  const round = j.identities?.round ?? 1, keptLogo = j.keep.includes("logo");
  const clientLogo = keptLogo ? await clientLogoOf(o.projectId) : null;
  const slots = finishSlots(j, o.slots);
  const mixed = Object.entries(j.identityChoice.mix ?? {}).some(([, k]) => k && k !== j.identityChoice!.key) || !!j.identityChoice.edits;
  const notes: string[] = [], issues: string[] = [];

  // 1. Les images. La direction artistique du premier temps ressert telle quelle, sauf si le client a mélangé deux
  // identités ou demande un changement avec ses mots (elle est alors réécrite, pour ce qu'il veut vraiment).
  let current: Route = route;
  if (slots.length) {
    ctx.progress(0.1, L("Je crée les images de ta marque", "Creating your brand's images"));
    const before = route.board.images;
    const r = await runBoardImages({
      ctx, ai, who, brief: o.brief, kind: o.kind, route, round, slots, clientLogo,
      imagery: mixed || o.guidance ? undefined : proposalImagery(j, route),
      // Logo refait avec les mots du client : la consigne écrite par SINA ne va jamais au dessinateur du logo (essai réel
      // du 21 novembre 2026 : « un fil à plomb stylisé, vert profond »), seulement ce qu'on savait de la marque avant ;
      // le relecteur reçoit les mots du client (sa fiche et ce qu'il vient de dire).
      ...(slots.includes("logo") && o.guidance ? { logoLine: proposalImagery(j, route)?.logo ?? before?.logoIdea ?? null } : {}),
      gouts: goutsDuClient(j, o.projectId, clientWords(o.guidance)),
    });
    current = r.route; notes.push(...r.notes);
    // La maquette refaite avec le bon logo : la planche n'est plus notée « ancien logo ».
    if (slots.includes("site") && current.board.images?.site) updateJourney(o.conversationId, (y) => { if (y.identities?.siteAncienLogo) y.identities.siteAncienLogo = y.identities.siteAncienLogo.filter((k) => k !== route.key); });
    // « Identité A : … » n'a plus de sens une fois l'identité choisie : c'est SA marque.
    issues.push(...r.issues.map((l) => l.replace(/^Identité [A-D] : /, "").replace(/^Identity [A-D]: /, "")).map((l) => l.charAt(0).toUpperCase() + l.slice(1)));
  }
  const images = current.board.images;

  // 2. Le logo de la marque : celui de la planche, fond retiré. Sans logo validé : le nom dessiné, et c'est dit.
  let logos = j.logos?.list ?? [], logoChoice = j.logoChoice;
  const from = images?.logo?.id ?? null;
  if (!keptLogo && (!logoChoice || slots.includes("logo") || (j.brandFinish as { logoFrom?: string | null } | undefined)?.logoFrom !== from)) {
    ctx.progress(0.8, L("Je prépare ton logo", "Preparing your logo"));
    const draft = singleTerritory(freeLogoFacts(p.brand, j), current);
    const boardAsset = images?.logo ? getAsset(images.logo.id) : undefined;
    let assetId: string, kind: "image" | "planche";
    if (boardAsset && boardAsset.project_id === o.projectId && !boardAsset.deleted_at) {
      assetId = await saveBoardLogo(ctx, who, current, { ...draft, id: "planche-logo", style: "libre" } as Territory, await cleanArtwork(assetData(boardAsset)));
      kind = "image";
    } else {
      assetId = await savePlancheLogo(ctx, who, current, { ...draft, id: "planche", style: "libre" } as Territory);
      kind = "planche";
      issues.push(L("Je n'ai pas de logo qui passe ma relecture : ton nom dessiné, exact à la lettre, sert de logo en attendant. Je peux t'en créer un autre, je t'annonce son prix avant.", "No logo passed my review: your drawn name is used meanwhile. I can create another one; I will tell you the price first."));
    }
    await chooseLogoV2(null, o.projectId, assetId);
    const logo: SinaLogo = { source: "A", name: kind === "image" ? L("Ton logo", "Your logo") : L("Ton nom dessiné", "Your drawn name"), style: "libre", assetId, verdict: "PROVISIONAL", score: null, reason: kind === "image" ? L("créé pour ta marque et relu : ton nom y est exact", "made for your brand and reviewed: your name is exact") : L("dessiné par le Studio, exact à la lettre", "drawn by the Studio, letter-perfect"), kind, choosable: true };
    logos = [logo]; logoChoice = { source: "A", assetId, at: Date.now() };
  }

  // 2 bis. Le symbole seul, tiré du LOGO (retour du propriétaire du 15 novembre 2026 : « ça doit reprendre le logo pour en
  // faire un vrai favicon qui a une corrélation avec le logo » ; avant, le Studio dessinait une initiale dans un rond).
  // OpenAI reçoit le logo et en isole le signe ; relu avant d'être gardé. Le favicon et l'avatar de la charte en partent.
  const brandNow = loadProject(o.projectId).brand, mainLogo = brandNow?.logo.assetId ? getAsset(brandNow.logo.assetId) : undefined;
  const symbolDone = (j.brandFinish as { symbolFor?: string } | undefined)?.symbolFor;
  let symbolFor = symbolDone;
  if (brandNow && mainLogo && !mainLogo.deleted_at && symbolDone !== mainLogo.id && symbolDone !== `refus:${mainLogo.id}` && !(logos[0]?.kind === "planche")) {
    ctx.progress(0.85, L("Je tire le symbole de ton logo", "Deriving the symbol from your logo"));
    try {
      const made = await ctx.step(`brand:symbol:${round}:${mainLogo.id}`, async () => {
        const logoPng = await onWhite(assetData(mainLogo));
        const data = await ai.draw(`symbol-${round}`, { prompt: symbolPrompt(current), aspect: "1:1", logo: await onWhite(logoPng) });
        const png = await sharp(data).png().toBuffer();
        if (!(await logoOnWhite(png))) return { ok: false as const, why: L("il n'est pas sur un fond blanc net", "it is not on a clean white background") };
        const seen = await ai.look(`symbolcheck-${round}`, { system: SYMBOL_REVIEW, schema: SymbolReviewSchema, prompt: `Marque : « ${current.name} ». Image 1 : le symbole proposé. Image 2 : le logo de la marque.`, images: [{ data: png, label: "symbole" }, { data: logoPng, label: "logo" }] });
        if (!seen.ok) return { ok: false as const, why: seen.why.replace(/\.+$/, "") || L("il ne reprend pas le logo", "it does not match the logo") };
        const asset = await saveAsset({ projectId: o.projectId, userId: o.userId, data: await cleanArtwork(png), name: "symbole.png", mime: "image/png", role: "logo-mark", folderKey: "brand.logos", origin: "generated", sourceAssetId: mainLogo.id, meta: { engine: "syna-brand-symbol" } });
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

  // 3. La charte complète (gratuite, rendue par le Studio). Le slogan choisi est validé : la planche et la charte l'écrivent.
  ctx.progress(0.9, L("Je prépare ta charte", "Preparing your brand guidelines"));
  const b = loadProject(o.projectId).brand;
  if (b?.tagline?.trim() && !(b.validated ?? []).includes("tagline")) saveBrand(o.projectId, { ...b, validated: [...(b.validated ?? []), "tagline"] });
  let kit: Awaited<ReturnType<typeof buildBrandKit>> | null = null;
  if (loadProject(o.projectId).brand?.logo.assetId) {
    try { kit = await buildBrandKit(o.projectId); } catch (e) { notes.push(`charte non préparée : ${String((e as Error)?.message ?? e).slice(0, 140)}`); issues.push(L("Je n'ai pas pu préparer ta charte : je la refais dès que tu me le dis, sans rien compter.", "I could not prepare your guidelines: I will redo them when you ask, at no cost.")); }
  }

  updateJourney(o.conversationId, (x) => {
    x.brandFinish = { ...(x.brandFinish ?? {}), prepaidMicro: 0, ...(images ? { images } : {}), at: Date.now(), issues: [...new Set(issues)], logoFrom: from, ...(symbolFor ? { symbolFor } : {}) } as Journey["brandFinish"];
    if (!keptLogo && logoChoice) { x.logos = { list: logos, at: Date.now(), round: (x.logos?.round ?? 0) + 1, notes: [] }; x.logoChoice = logoChoice; setStep(x, 2, "done"); }
    if (kit) { x.brandKit = kit; setStep(x, 3, "review"); } else setStep(x, 3, "todo");
  });
  return { finished: true, name: current.name, created: slots, issues: [...new Set(issues)], notes, kit: !!kit, images: Object.values(images ?? {}).flat().filter((v) => v && typeof v === "object").length };
}
