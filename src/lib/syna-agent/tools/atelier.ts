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
import { conditionsAcceptees, outilOuvert, photosDuCatalogue, plafondDuProjet, prixDuGeste, prixModeleVideo } from "../../atelier/service";
import { GESTES } from "../../atelier/gestes";
import { OUTIL_DE_SINA, outilsPour, type GesteId } from "../../atelier/outils";
import { conseilOutil } from "../../atelier/conseil";
import { modelesPour } from "../../atelier/modeles-images";
import { lienVideoGuidee, MODELES_VIDEOS, modeleVideo, type ModeleVideoId } from "../../atelier/modeles-videos";
import { mesCreations, nonServies } from "../../atelier/journal";
import { plafondTexte } from "../../atelier/prix";
import type { AgentTool, ToolContext } from "../types";
import { project } from "./common";
import { poserDansPublication, poserDansPublicite, poserSurLeSite } from "../../atelier/placer";

const lang = (): "fr" | "en" => L("fr", "en") as "fr" | "en";
const nom = (x: readonly [string, string]) => x[lang() === "fr" ? 0 : 1];
const lienAtelier = (projectId: string) => `/studio/${projectId}/atelier`;

const etatTool: AgentTool<Record<string, never>> = {
  name: "atelier.etat", module: "atelier", kind: "read", needsProject: true,
  description: "Gratuit, à lire avant de lui proposer l'atelier : ce que l'atelier peut faire maintenant (produit dans une scène, fond changé, version story ou carrée, objet retiré, tout son catalogue, vidéo pour vendre), l'outil conseillé par geste et son prix en part de son budget du mois, le plafond de vidéos de son forfait, ses conditions de l'atelier (acceptées ou non), les modèles prêts épinglés (fêtes proches, saison, nouveauté) et ses créations pas encore servies.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), lg = lang();
    const gestes = (Object.keys(GESTES) as GesteId[]).map((g) => {
      const outils = outilsPour(g, outilOuvert);
      const conseille = outils.find((o) => o.conseille) ?? null;
      // Une vidéo n'a pas de prix par outil : son prix est celui du devis de la vidéo guidée, par modèle (videos.modeles),
      // le même que l'écran de l'atelier et la page de réglage (une seule façon de calculer).
      const prix = conseille && g !== "video" ? prixDuGeste(ctx.user.id, p.id, g, conseille.id, { nombre: g === "lot" ? 1 : undefined }) : null;
      return { geste: g, nom: nom(GESTES[g].nom), conseil: conseilOutil(g, outils, lg), prixParCreation: g === "video" ? L("selon le modèle : voir videos.modeles", "per template: see videos.modeles") : prix?.texte ?? null, outils: outils.map((o) => ({ outil: o.id, nom: nom(o.nom), mieux: nom(o.mieux), ouvert: o.disponible, conseille: o.conseille, redessineLeProduit: o.redessine })) };
    });
    const plafond = plafondDuProjet(ctx.user.id, p.id), dorment = nonServies(mesCreations(p.id));
    return {
      ok: true,
      summary: L(`Atelier : ${dorment.length} création(s) pas encore servie(s) ; vidéos du mois : ${plafond.faites}/${plafond.inclus}.`, `Workshop: ${dorment.length} unused creation(s).`),
      data: {
        lien: lienAtelier(p.id), conditionsAcceptees: conditionsAcceptees(ctx.user.id), gestes,
        videos: { ...plafond, phrase: plafondTexte(plafond, lg), modeles: MODELES_VIDEOS.map((m) => { const d = prixModeleVideo(ctx.user.id, p, m); return { modele: m.id, nom: nom(m.nom), quoi: nom(m.quoi), gratuit: !!m.sansIa, demandeUneOffre: !!m.offre, prix: d.prix, auPlus: d.auPlus, planSur: d.planSur, raison: d.raison }; }) },
        modelesEpingles: modelesPour(new Date(), { offreSaisie: false }).filter((m) => m.epingle).map((m) => ({ nom: nom(m.nom), idee: nom(m.idee), dansJours: m.dansJours })),
        creationsQuiDorment: dorment.slice(0, 12).map((c) => ({ creationId: c.id, assetId: c.assetId, geste: c.geste, at: c.at })),
      },
      hint: "Propose l'atelier en une phrase au bon moment, avec ce qu'il y gagne et le prix donné ici (jamais un autre) : le prix probable seul, jamais de plafond, de « au plus » ni de pire cas ; pour une vidéo, celui de son modèle ; si planSur est donné, dis-le-lui tel quel. Demande-lui sa façon de faire s'il ne l'a pas dite : « Je m'en occupe », « On le fait ensemble » (tu remplis, il choisit l'outil) ou « Tu le fais toi-même » (donne-lui le lien de l'atelier). Conditions pas encore acceptées : il les lit et les accepte lui-même, une fois, en haut de l'atelier ; tu ne les acceptes jamais pour lui.",
    };
  },
};

type CreerArgs = { geste: Exclude<GesteId, "video">; mode: "sina" | "ensemble"; assetId?: string; mots?: string; outil?: string; aspect?: "4:5" | "1:1" | "9:16" | "16:9" };
/** maxMicro : la borne haute signée de l'accord ; probableMicro : le prix probable, le même que le bouton de l'atelier. */
type Devis = { kind: "scene"; operationId: string; request: Parameters<typeof devisScene>[3]; token: string; maxMicro: number; probableMicro: number | null } | { kind: "retouche"; operationId: string; demande: Parameters<typeof devisRetouche>[3]; token: string; maxMicro: number; probableMicro: number | null };

/** Le prix probable d'une création, calculé comme le bouton de l'atelier (`prixDuGeste`, chaîne entière), jamais au-dessus de la borne. */
function probableDuGeste(ctx: ToolContext, projectId: string, a: CreerArgs, maxMicro: number): number | null {
  const outil = a.geste === "scene" || a.mode === "sina" || !a.outil ? OUTIL_DE_SINA : a.outil;
  const prix = prixDuGeste(ctx.user.id, projectId, a.geste, outil, { nombre: a.geste === "lot" ? 1 : undefined });
  return prix ? Math.min(prix.totalMicro, maxMicro) : null;
}

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
    return [{ kind: "scene", operationId, request, token: q.approvalToken, maxMicro: q.maximumMicro, probableMicro: probableDuGeste(ctx, p.id, a, q.maximumMicro) }];
  }
  const photos = a.geste === "lot" ? photosDuCatalogue(p.id) : a.assetId ? [a.assetId] : [];
  if (!photos.length) throw Object.assign(new Error(a.geste === "lot" ? L("Aucune photo de produit à lui dans ce projet.", "No product photo of theirs in this project.") : "assetId manquant : la photo à retoucher (files.list)."), { internal: a.geste !== "lot" });
  const out: Devis[] = [];
  for (const assetId of photos) {
    // En mode « SINA s'en occupe », l'outil est toujours OpenAI : le cœur l'impose, l'outil donné est ignoré.
    const demande = { assetId, instruction: a.mots ?? "", geste: a.geste as GesteRetoucheId, mode: a.mode, ...(a.mode === "ensemble" && a.outil ? { outil: a.outil } : {}) };
    const operationId = `syna-atelier-${newId()}`, q = await devisRetouche(ctx.user, p.id, operationId, demande);
    if ("jobId" in q) continue;
    out.push({ kind: "retouche", operationId, demande, token: q.approvalToken, maxMicro: q.maximumMicro, probableMicro: probableDuGeste(ctx, p.id, a, q.maximumMicro) });
  }
  return out;
}

const creerTool: AgentTool<CreerArgs> = {
  name: "atelier.creer", module: "atelier", kind: "generate", needsProject: true,
  description: "PAYANT (prix sur la carte d'accord, en part de son budget du mois ; rien ne part sans sa confirmation) : fait un geste de l'atelier, par le même chemin que l'écran. geste : scene (son vrai produit dans un décor, toujours fait par OpenAI et relu par le juge qui lit l'étiquette), fond (change le fond), retirer (retire un objet), story, carre, lot (le même fond pour toutes ses photos de produit, 30 au plus). mode : sina (« je m'en occupe » : outil OpenAI) ou ensemble (« on le fait ensemble » : l'outil qu'IL a choisi dans atelier.etat). assetId : la photo à retoucher (files.list), sauf scene et lot. mots : SES mots tels quels (décor, fond, objet à retirer) ; inutiles pour story et carre. aspect : format de la scène. Jamais de personne sans sa photo et son accord écrit. Le résultat arrive dans « Mes créations » ; une image ratée ou dont le produit a changé lui est dite telle quelle.",
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
    // La carte montre le prix probable (le même que le bouton de l'atelier) ; la borne signée reste en coulisses.
    const probableMicro = devis.every((d) => d.probableMicro != null) ? devis.reduce((s, d) => s + (d.probableMicro ?? 0), 0) : undefined;
    return { maxMicro, ...(probableMicro ? { probableMicro } : {}), label: L(`${nom(GESTES[a.geste].nom)}${n > 1 ? ` (${n} photos)` : ""}, dans l'atelier`, `${nom(GESTES[a.geste].nom)}${n > 1 ? ` (${n} photos)` : ""}, in the workshop`) };
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
    return { ok: true, jobs, summary: L(`${nom(GESTES[a.geste].nom)} lancé${jobs.length > 1 ? ` sur ${jobs.length} photos` : ""} ; le résultat arrivera dans « Mes créations ».`, "Started; the result will be in My creations."), hint: "À la fin : regarde le résultat avant d'en parler ; une image ratée ou « produit modifié » se dit telle quelle. Propose ensuite où la poser (une publication, une publicité, son site) ; atelier.placer seulement s'il le veut." };
  },
};

const videoTool: AgentTool<{ modele: ModeleVideoId }> = {
  name: "atelier.video", module: "atelier", kind: "read", needsProject: true,
  description: "Gratuit : prépare une vidéo pour vendre d'après un modèle de l'atelier (tourne, cadeau, deballage, vraie-vie, details, avant-apres, offre, pub-15) et rend l'adresse de la vidéo guidée déjà remplie, où le client voit le prix et confirme (même devis, même accord, même plafond de vidéos du mois que l'écran). Vérifie d'abord le plafond de son forfait. avant-apres : gratuit, deux de ses vraies photos montées par le Studio ; offre : seulement avec son offre écrite, jamais inventée.",
  args: z.object({ modele: z.enum(["tourne", "cadeau", "deballage", "vraie-vie", "details", "avant-apres", "offre", "pub-15"]) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), lg = lang(), m = modeleVideo(a.modele)!;
    if (m.sansIa) return { ok: true, summary: L("L'avant et l'après se fait dans l'atelier, gratuitement, avec deux de ses vraies photos.", "Before and after is made in the workshop, for free, from two real photos."), data: { lien: lienAtelier(p.id) }, hint: "Dis-lui de choisir ses deux vraies photos, l'avant puis l'après ; tu n'inventes jamais l'après." };
    const plafond = plafondDuProjet(ctx.user.id, p.id), raison = plafondTexte(plafond, lg);
    if (raison) return { ok: false, summary: raison };
    const d = prixModeleVideo(ctx.user.id, p, m);
    if (d.raison) return { ok: false, summary: d.raison };
    return { ok: true, summary: L(`Vidéo « ${nom(m.nom)} » prête à lancer dans la vidéo guidée (vidéos du mois : ${plafond.faites}/${plafond.inclus}).`, `Video "${nom(m.nom)}" ready in the guided video.`), data: { lien: lienVideoGuidee(p.id, m, lg), garde: nom(m.garde), dureeS: m.dureeS, plans: m.plans, prix: d.prix, auPlus: d.auPlus, planSur: d.planSur }, hint: "Donne-lui le prix tel quel (prix, puis « au plus » s'il est donné) : c'est le même que sur la page de la vidéo guidée. Si planSur est donné, dis-le-lui tel quel. Donne-lui le lien : il confirme lui-même ; l'image fixe est validée d'abord, puis le mouvement. Jamais de personne ni de main dans la vidéo." };
  },
};

type PoserArgs = { creationId: string; cible: "publication" | "publicite" | "site"; uid?: string; src?: string };
const poserTool: AgentTool<PoserArgs> = {
  name: "atelier.placer", module: "atelier", kind: "write", needsProject: true,
  description: "Gratuit, SEULEMENT quand le client te le demande : pose une création réussie de « Mes créations » (creationId, lu dans atelier.etat) où il la veut. cible : publication (brouillon de publication avec l'image, rien n'est publié), publicite (publicité préparée en brouillon, textes à écrire avec lui, aucune diffusion), site (photo d'une section : uid et src de la photo qu'il a désignée sur l'aperçu). Une création ratée, « produit modifié », refusée ou pas encore vérifiée ne part nulle part ; les photos de ses produits restent sur leurs emplacements ; jamais deux fois la même photo sur son site.",
  args: z.object({ creationId: z.string().max(40), cible: z.enum(["publication", "publicite", "site"]), uid: z.string().regex(/^s[0-9a-f]{8}$/).optional(), src: z.string().max(400).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    try {
      if (a.cible === "publication") { const r = poserDansPublication(p, ctx.user, a.creationId); return { ok: true, summary: L(r.deja ? "Elle était déjà dans un brouillon de publication." : "Brouillon de publication créé avec l'image (rien n'est publié).", "Draft post with the image."), data: r, changes: [{ module: "publications", object: r.postId, summary: L("brouillon avec la création", "draft with the creation"), verified: !!r.postId }] }; }
      if (a.cible === "publicite") { const r = poserDansPublicite(p, ctx.user, a.creationId); return { ok: true, summary: L(r.deja ? "Elle était déjà dans une publicité préparée." : "Publicité préparée avec l'image, en brouillon (aucune diffusion ; textes à écrire avec lui).", "Ad prepared with the image."), data: r, changes: [{ module: "publicités", object: r.campaignId, summary: L("publicité préparée avec la création", "ad prepared with the creation"), verified: !!r.campaignId }] }; }
      if (!a.uid || !a.src) return { ok: false, internal: true, summary: "uid et src de la photo désignée sur l'aperçu sont nécessaires pour le site." };
      const r = poserSurLeSite(p, a.creationId, { uid: a.uid, src: a.src });
      return { ok: true, summary: L("La création est posée sur son site, à l'endroit désigné.", "The creation is on the site."), data: r, changes: [{ module: "site", object: r.uid, summary: L("photo remplacée par la création", "photo replaced by the creation"), verified: true }] };
    } catch (e) { return { ok: false, summary: (e as Error).message, hint: "Dis-lui la raison telle quelle, simplement, et propose une autre création ou un autre endroit." }; }
  },
};

export const atelierTools: AgentTool[] = [etatTool, creerTool, videoTool, poserTool];
