/**
 * L'ATELIER DANS LA CONVERSATION DE SINA (22 novembre 2026, limites de l'atelier, point 1). SINA propose l'atelier au
 * bon moment et s'en sert pour le client, avec les trois façons de faire :
 *  - « SINA s'en occupe » (mode sina) : elle choisit tout, l'outil est toujours OpenAI ; le client confirme la carte ;
 *  - « On le fait ensemble » (mode ensemble) : elle remplit la demande et conseille l'outil, le client le choisit ;
 *  - « Je fais moi-même » : le client fait le geste lui-même dans l'atelier ; SINA lui dit où et quoi, sans rien lancer.
 *
 * Une seule façon de faire : ces outils appellent le MÊME cœur que l'écran (`lib/atelier/coeur.ts` et `service.ts`) :
 * mêmes garde-fous (conditions acceptées, demande et photo vérifiées, personnes seulement avec leur accord écrit),
 * même devis en part du budget du mois sur la carte d'accord, même plafond de vidéos, même « Mes créations ». Aucune
 * dépense sans la carte : le Studio la montre avant chaque création payante, et le client la confirme.
 */
import { z } from "zod";
import { id as newId } from "../../db";
import { L } from "../../i18n-server";
import { imageBindingHash } from "../../image-v2/request-binding";
import { devisRetouche, devisScene, lancerRetouche, lancerScene, type GesteRetoucheId } from "../../atelier/coeur";
import { conditionsAcceptees, outilOuvert, photosDuCatalogue, plafondDuProjet, prixDuGeste } from "../../atelier/service";
import { GESTES } from "../../atelier/gestes";
import { outilsPour, type GesteId } from "../../atelier/outils";
import { conseilOutil } from "../../atelier/conseil";
import { modelesPour } from "../../atelier/modeles-images";
import { lienVideoGuidee, MODELES_VIDEOS, modeleVideo, type ModeleVideoId } from "../../atelier/modeles-videos";
import { mesCreations, nonServies } from "../../atelier/journal";
import { plafondTexte } from "../../atelier/prix";
import type { AgentTool, ToolContext } from "../types";
import { project } from "./common";

const lang = (): "fr" | "en" => L("fr", "en") as "fr" | "en";
const nom = (x: readonly [string, string]) => x[lang() === "fr" ? 0 : 1];
const lienAtelier = (projectId: string) => `/studio/${projectId}/atelier`;

const etatTool: AgentTool<Record<string, never>> = {
  name: "atelier.etat", module: "atelier", kind: "read", needsProject: true,
  description: "Gratuit : ce que l'atelier peut faire pour le client maintenant (mettre son produit dans une scène, changer un fond, version story ou carrée, retirer un objet, tout son catalogue, une vidéo pour vendre), avec l'outil que tu conseilles par geste et son prix en part de son budget du mois, le plafond de vidéos de son forfait, ses conditions de l'atelier (acceptées ou non), les modèles prêts épinglés (fêtes qui approchent, saison, nouveauté) et ses créations qui n'ont pas encore servi. À lire avant de lui proposer l'atelier.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), lg = lang();
    const gestes = (Object.keys(GESTES) as GesteId[]).map((g) => {
      const outils = outilsPour(g, outilOuvert);
      const conseille = outils.find((o) => o.conseille) ?? null;
      const prix = conseille ? prixDuGeste(ctx.user.id, p.id, g, conseille.id, { nombre: g === "lot" ? 1 : undefined, secondes: g === "video" ? 8 : undefined }) : null;
      return { geste: g, nom: nom(GESTES[g].nom), conseil: conseilOutil(g, outils, lg), prixParCreation: prix?.texte ?? null, outils: outils.map((o) => ({ outil: o.id, nom: nom(o.nom), mieux: nom(o.mieux), ouvert: o.disponible, conseille: o.conseille, redessineLeProduit: o.redessine })) };
    });
    const plafond = plafondDuProjet(ctx.user.id, p.id), dorment = nonServies(mesCreations(p.id));
    return {
      ok: true,
      summary: L(`Atelier : ${dorment.length} création(s) pas encore servie(s) ; vidéos du mois : ${plafond.faites}/${plafond.inclus}.`, `Workshop: ${dorment.length} unused creation(s).`),
      data: {
        lien: lienAtelier(p.id), conditionsAcceptees: conditionsAcceptees(ctx.user.id), gestes,
        videos: { ...plafond, phrase: plafondTexte(plafond, lg), modeles: MODELES_VIDEOS.map((m) => ({ modele: m.id, nom: nom(m.nom), quoi: nom(m.quoi), gratuit: !!m.sansIa, demandeUneOffre: !!m.offre })) },
        modelesEpingles: modelesPour(new Date(), { offreSaisie: false }).filter((m) => m.epingle).map((m) => ({ nom: nom(m.nom), idee: nom(m.idee), dansJours: m.dansJours })),
        creationsQuiDorment: dorment.slice(0, 12).map((c) => ({ creationId: c.id, assetId: c.assetId, geste: c.geste, at: c.at })),
      },
      hint: "Propose l'atelier en une phrase au bon moment, avec ce qu'il y gagne et le prix donné ici (jamais un autre). Demande-lui sa façon de faire s'il ne l'a pas dite : « Je m'en occupe », « On le fait ensemble » (tu remplis, il choisit l'outil) ou « Tu le fais toi-même » (donne-lui le lien de l'atelier). Conditions pas encore acceptées : il les lit et les accepte lui-même, une fois, en haut de l'atelier ; tu ne les acceptes jamais pour lui.",
    };
  },
};

type CreerArgs = { geste: Exclude<GesteId, "video">; mode: "sina" | "ensemble"; assetId?: string; mots?: string; outil?: string; aspect?: "4:5" | "1:1" | "9:16" | "16:9" };
type Devis = { kind: "scene"; operationId: string; request: Parameters<typeof devisScene>[3]; token: string; maxMicro: number } | { kind: "retouche"; operationId: string; demande: Parameters<typeof devisRetouche>[3]; token: string; maxMicro: number };

/** Devis gardés entre la carte d'accord et la création d'une même action (la carte montre exactement ce prix). */
const devisGardes = new Map<string, Devis[]>();
const cleDevis = (ctx: ToolContext, a: CreerArgs) => `${ctx.runId}:${imageBindingHash(a)}`;

/** Les demandes d'un geste (le lot : toutes ses photos de produit), chacune passée par le cœur de l'atelier. */
async function devisDuGeste(ctx: ToolContext, a: CreerArgs): Promise<Devis[]> {
  const p = project(ctx);
  if (a.geste === "scene") {
    const request = { kind: "usage_scene" as const, aspect: a.aspect ?? "4:5", topic: a.mots?.trim() || undefined, count: 1, allowGenerate: true, noStock: true, atelier: { mode: a.mode } };
    const operationId = `syna-atelier-${newId()}`, q = await devisScene(ctx.user, p.id, operationId, request);
    if ("jobId" in q) throw new Error(L("Cette création est déjà lancée.", "This creation has already started."));
    return [{ kind: "scene", operationId, request, token: q.approvalToken, maxMicro: q.maximumMicro }];
  }
  const photos = a.geste === "lot" ? photosDuCatalogue(p.id) : a.assetId ? [a.assetId] : [];
  if (!photos.length) throw Object.assign(new Error(a.geste === "lot" ? L("Aucune photo de produit à lui dans ce projet.", "No product photo of theirs in this project.") : "assetId manquant : la photo à retoucher (files.list)."), { internal: a.geste !== "lot" });
  const out: Devis[] = [];
  for (const assetId of photos) {
    // En mode « SINA s'en occupe », l'outil est toujours OpenAI : le cœur l'impose, l'outil donné est ignoré.
    const demande = { assetId, instruction: a.mots ?? "", geste: a.geste as GesteRetoucheId, mode: a.mode, ...(a.mode === "ensemble" && a.outil ? { outil: a.outil } : {}) };
    const operationId = `syna-atelier-${newId()}`, q = await devisRetouche(ctx.user, p.id, operationId, demande);
    if ("jobId" in q) continue;
    out.push({ kind: "retouche", operationId, demande, token: q.approvalToken, maxMicro: q.maximumMicro });
  }
  return out;
}

const creerTool: AgentTool<CreerArgs> = {
  name: "atelier.creer", module: "atelier", kind: "generate", needsProject: true,
  description: "PAYANT (le Studio montre le prix sur la carte d'accord, en part de son budget du mois ; rien ne part sans sa confirmation) : fait un geste de l'atelier pour le client, par le même chemin que l'écran. geste : scene (son vrai produit dans un décor, toujours fait par OpenAI et relu par le juge qui lit l'étiquette), fond (change le fond), retirer (retire un objet), story, carre, lot (le même fond pour toutes ses photos de produit, 30 au plus). mode : sina (« je m'en occupe » : outil OpenAI) ou ensemble (« on le fait ensemble » : outil = celui qu'IL a choisi parmi ceux d'atelier.etat). assetId : la photo à retoucher (files.list), sauf scene et lot. mots : SES mots, repris tels quels (le décor, le fond, l'objet à retirer) ; story et carre n'en ont pas besoin. aspect : format de la scène. Jamais de personne sans sa photo et son accord écrit. Le résultat arrive dans « Mes créations » ; une image ratée ou dont le produit a changé lui est dite telle quelle.",
  args: z.object({
    geste: z.enum(["scene", "fond", "story", "carre", "retirer", "lot"]),
    mode: z.enum(["sina", "ensemble"]),
    assetId: z.string().max(40).optional(),
    mots: z.string().max(300).optional(),
    outil: z.string().max(80).optional(),
    aspect: z.enum(["4:5", "1:1", "9:16", "16:9"]).optional(),
  }).strict(),
  estimate: async (ctx, a) => {
    const devis = await devisDuGeste(ctx, a);
    devisGardes.set(cleDevis(ctx, a), devis);
    const maxMicro = devis.reduce((s, d) => s + d.maxMicro, 0);
    const n = devis.length;
    return { maxMicro, label: L(`${nom(GESTES[a.geste].nom)}${n > 1 ? ` (${n} photos)` : ""}, dans l'atelier`, `${nom(GESTES[a.geste].nom)}${n > 1 ? ` (${n} photos)` : ""}, in the workshop`) };
  },
  run: async (ctx, a) => {
    const p = project(ctx), key = cleDevis(ctx, a);
    const devis = devisGardes.get(key) ?? (await devisDuGeste(ctx, a));
    devisGardes.delete(key);
    if (!devis.length) return { ok: false, summary: L("Rien à lancer : cette création est déjà en cours.", "Nothing to start: already in progress.") };
    const jobs: string[] = [];
    for (const d of devis) {
      if (d.kind === "scene") jobs.push((await lancerScene(ctx.user, p.id, d.operationId, d.request, d.token)).jobId);
      else jobs.push((await lancerRetouche(ctx.user, p.id, d.operationId, d.demande, d.token)).jobId);
    }
    return { ok: true, jobs, summary: L(`${nom(GESTES[a.geste].nom)} lancé${jobs.length > 1 ? ` sur ${jobs.length} photos` : ""} ; le résultat arrivera dans « Mes créations ».`, "Started; the result will be in My creations."), hint: "À la fin : regarde le résultat avant d'en parler ; une image ratée ou « produit modifié » se dit telle quelle." };
  },
};

const videoTool: AgentTool<{ modele: ModeleVideoId }> = {
  name: "atelier.video", module: "atelier", kind: "read", needsProject: true,
  description: "Gratuit : prépare une vidéo pour vendre à partir d'un modèle de l'atelier (tourne, cadeau, deballage, vraie-vie, details, avant-apres, offre, pub-15) et rend l'adresse de la vidéo guidée déjà remplie, où le client voit le prix et confirme (même devis, même accord, même plafond de vidéos du mois que l'écran). Vérifie d'abord le plafond de son forfait. avant-apres : gratuit, deux de ses vraies photos montées par le Studio, dans l'atelier ; offre : seulement avec son offre écrite, jamais inventée.",
  args: z.object({ modele: z.enum(["tourne", "cadeau", "deballage", "vraie-vie", "details", "avant-apres", "offre", "pub-15"]) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), lg = lang(), m = modeleVideo(a.modele)!;
    if (m.sansIa) return { ok: true, summary: L("L'avant et l'après se fait dans l'atelier, gratuitement, avec deux de ses vraies photos.", "Before and after is made in the workshop, for free, from two real photos."), data: { lien: lienAtelier(p.id) }, hint: "Dis-lui de choisir ses deux vraies photos, l'avant puis l'après ; tu n'inventes jamais l'après." };
    const plafond = plafondDuProjet(ctx.user.id, p.id), raison = plafondTexte(plafond, lg);
    if (raison) return { ok: false, summary: raison };
    return { ok: true, summary: L(`Vidéo « ${nom(m.nom)} » prête à lancer dans la vidéo guidée (vidéos du mois : ${plafond.faites}/${plafond.inclus}).`, `Video "${nom(m.nom)}" ready in the guided video.`), data: { lien: lienVideoGuidee(p.id, m, lg), garde: nom(m.garde), dureeS: m.dureeS, plans: m.plans }, hint: "Donne-lui le lien : il y voit le prix en part de son budget du mois et confirme lui-même ; l'image fixe est validée d'abord, puis le mouvement. Jamais de personne ni de main dans la vidéo." };
  },
};

export const atelierTools: AgentTool[] = [etatTool, creerTool, videoTool];
