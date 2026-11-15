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
import { assetData, getAsset } from "../library";
import { loadProject, saveBrand } from "../projects";
import { chooseLogoV2 } from "../logo-v2/choose";
import { cleanArtwork } from "../logo-v2/artwork";
import type { Territory } from "../logo-v2/types";
import type { ChainAi } from "./brand-chain";
import { CREATED_SLOTS, ImagerySchema, clientLogoOf, runBoardImages, type ImageSlot, type Imagery } from "./brand-images";
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
  return CREATED_SLOTS.filter((s) => !(s === "logo" && j.keep.includes("logo")) && !has(x.board.images, s));
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
      // Un autre logo : nettement différent de celui que le client n'a pas voulu.
      otherLogos: slots.includes("logo") && before?.logoIdea ? [before.logoIdea] : [],
    });
    current = r.route; notes.push(...r.notes);
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

  // 3. La charte complète (gratuite, rendue par le Studio). Le slogan choisi est validé : la planche et la charte l'écrivent.
  ctx.progress(0.9, L("Je prépare ta charte", "Preparing your brand guidelines"));
  const b = loadProject(o.projectId).brand;
  if (b?.tagline?.trim() && !(b.validated ?? []).includes("tagline")) saveBrand(o.projectId, { ...b, validated: [...(b.validated ?? []), "tagline"] });
  let kit: Awaited<ReturnType<typeof buildBrandKit>> | null = null;
  if (loadProject(o.projectId).brand?.logo.assetId) {
    try { kit = await buildBrandKit(o.projectId); } catch (e) { notes.push(`charte non préparée : ${String((e as Error)?.message ?? e).slice(0, 140)}`); issues.push(L("Je n'ai pas pu préparer ta charte : je la refais dès que tu me le dis, sans rien compter.", "I could not prepare your guidelines: I will redo them when you ask, at no cost.")); }
  }

  updateJourney(o.conversationId, (x) => {
    x.brandFinish = { ...(x.brandFinish ?? {}), prepaidMicro: 0, ...(images ? { images } : {}), at: Date.now(), issues: [...new Set(issues)], logoFrom: from } as Journey["brandFinish"];
    if (!keptLogo && logoChoice) { x.logos = { list: logos, at: Date.now(), round: (x.logos?.round ?? 0) + 1, notes: [] }; x.logoChoice = logoChoice; setStep(x, 2, "done"); }
    if (kit) { x.brandKit = kit; setStep(x, 3, "review"); } else setStep(x, 3, "todo");
  });
  return { finished: true, name: current.name, created: slots, issues: [...new Set(issues)], notes, kit: !!kit, images: Object.values(images ?? {}).flat().filter((v) => v && typeof v === "object").length };
}
