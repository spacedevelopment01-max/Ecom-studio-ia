/**
 * La tâche de fond de la méthode des graphistes (`syna.logo.graphistes`) : une recherche (la première, ou « d'autres
 * pistes »), ou les finalisations des esquisses choisies. Chaque image est rangée dans la bibliothèque du client avec ce
 * qui a servi à la faire (le texte envoyé, le modèle, l'identifiant de requête, la consommation). Une esquisse refusée
 * n'y est jamais rangée comme une image montrable.
 *
 * La première recherche part d'identity.nom (ou d'identity.propose quand le client garde son nom) ; quand chaque esquisse
 * choisie a son logo relu, les planches partent (`lancerLesPlanches`), couvertes par l'accord de l'étape. Une fois les
 * planches faites (anciens projets compris), une recherche ou une finalisation vise UNE planche (`planche`) : le logo fini
 * y est posé tel quel (`poserSurLaPlanche`). `studio` : la planche n'a pas son logo, la finir est à la charge du Studio.
 */
import { z } from "zod";
import { UserFacingError, enqueue, pendingJob, type JobContext } from "../jobs";
import { SINA_BRAND_JOB } from "./brand-chain";
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import sharp from "sharp";
import { assetData, getAsset, saveAsset } from "../library";
import { lightLogo, logoDetoure, manqueDeLaPlanche } from "./brand-images";
import { nameKindsFor } from "./identities";
import { journeyOf, updateJourney } from "./journey";
import { planOfProject } from "../plan-gates";
import { retoucherLesCouleurs } from "./logo-finalisation";
import { couleursDuLogo } from "./couleurs-du-logo";
import { aLaChargeDuStudio } from "../billing";
import { ecrireLeMetier, esquissesAChoisir, graphistesDeps, phraseDuLogoNonConstruit, uneFinalisation, uneRecherche, vraisAppels, type EtatGraphistes, type GraphistesAi, type LogoFini } from "./logo-graphistes";

export const LOGO_GRAPHISTES_JOB = "syna.logo.graphistes";

const Payload = z.object({
  projectId: z.string(), conversationId: z.string(),
  phase: z.enum(["recherche", "pistes", "finalisation", "couleurs"]),
  /** La retouche des couleurs : le logo fini (son numéro d'esquisse) et la demande du client, ses mots. */
  numero: z.number().int().min(1).optional(), demande: z.string().min(1).max(600).optional(),
  /** Le nom choisi par le client (point 0) : seulement pour la première recherche. */
  nom: z.string().min(1).max(60).optional(),
  numeros: z.array(z.number().int().min(1)).max(4).optional(),
  capMicro: z.number().min(0), studioCapMicro: z.number().min(0).optional(),
  /** La part de l'accord de l'étape « La marque » réservée aux finalisations (posée par identity.nom, point 0). */
  finalisationsAccordees: z.number().min(0).optional(),
  /** Une fois les planches faites : la planche qui reçoit le logo (sa recherche se fait pour son nom). */
  planche: z.enum(["A", "B", "C", "D"]).optional(),
  /** Une planche à qui il manque son logo : la finir est une reprise du travail de SINA, à la charge du Studio. */
  studio: z.boolean().optional(),
});
export type PayloadGraphistes = z.infer<typeof Payload>;

const activiteDu = (j: ReturnType<typeof journeyOf>, positionnement?: string) => (j.start.offer?.status === "answered" ? j.start.offer.value : "") || positionnement || "";

export async function runLogoGraphistesJob(ctx: JobContext) {
  const a = Payload.parse(ctx.payload);
  // Finir une planche à qui il manque son logo : toute la tâche à la charge du Studio, jamais au budget du client.
  return a.studio ? aLaChargeDuStudio(() => tacheDuLogo(ctx, a)) : tacheDuLogo(ctx, a);
}

async function tacheDuLogo(ctx: JobContext, a: PayloadGraphistes) {
  const p = loadProject(a.projectId);
  const who = { userId: p.userId, projectId: p.id };
  const ai: GraphistesAi = graphistesDeps.ai ? graphistesDeps.ai(ctx.job.id) : vraisAppels({ ...who, jobId: ctx.job.id, capMicro: a.capMicro, studioCapMicro: a.studioCapMicro ?? 0 });
  const j = journeyOf(a.conversationId);
  if (a.phase === "finalisation") return finaliserLesChoix(ai, who, a.conversationId, a.numeros ?? j.graphistes?.choix ?? [], a.planche ?? j.graphistes?.planche);
  if (a.phase === "couleurs") return retoucherUnLogo(ai, who, a.conversationId, a.numero ?? 0, a.demande ?? "");
  const avant = j.graphistes;
  if (a.phase === "pistes" && !avant?.metier) throw new UserFacingError(L("Il n'y a pas encore d'esquisses : rien n'a été décompté.", "There are no sketches yet: nothing was charged."));
  const nom = avant?.nom ?? a.nom ?? p.brand?.name ?? "";
  if (!nom.trim()) throw new UserFacingError(L("Le nom de la marque n'est pas encore choisi : rien n'a été décompté.", "The brand name is not chosen yet: nothing was charged."));
  let metier = avant?.metier;
  if (!metier) {
    const m = await ecrireLeMetier(ai, { nom, activite: activiteDu(j, p.brand?.positioning), kind: nameKindsFor(j) });
    if (!m.ok) throw new UserFacingError(L(`Je n'ai pas réussi à écrire ton métier en mots simples (${m.raison}).`, "I could not write your trade in plain words."));
    metier = m.metier;
  }
  const recherche = (avant?.recherches ?? 0) + 1;
  const depart = (avant?.esquisses.at(-1)?.numero ?? 0) + 1;
  const r = await uneRecherche(ai, { nom, metier, depart, eviter: (avant?.esquisses ?? []).map((e) => e.piste).filter(Boolean), recherche });
  // Les planches, rangées pour le diagnostic (jamais montrées) avec leur reçu ; les esquisses gardées, montrables.
  const planches = await Promise.all(r.planches.map(async (pl) => {
    const asset = await saveAsset({ ...who, data: pl.png, name: `recherche-${recherche}-${pl.modele}.png`, mime: "image/png", role: "logo-recherche", origin: "generated", status: "ready", meta: { graphistes: { recherche, modele: pl.modele, texteEnvoye: pl.texteEnvoye, requestId: pl.requestId, usage: pl.usage, coutMicro: pl.coutMicro } } });
    return { modele: pl.modele, recherche, tour: 1, assetId: asset.id, texteEnvoye: pl.texteEnvoye, requestId: pl.requestId, coutMicro: pl.coutMicro };
  }));
  const esquisses = await Promise.all(r.esquisses.map(async (e) => {
    const asset = await saveAsset({ ...who, data: e.png, name: `esquisse-${e.numero}.png`, mime: "image/png", role: "logo-esquisse", origin: "generated", status: "ready", meta: { graphistes: { numero: e.numero, modele: e.modele, piste: e.piste, recherche, tour: e.tour, requestId: e.requestId } } });
    return { numero: e.numero, assetId: asset.id, modele: e.modele, piste: e.piste, tour: e.tour, recherche, requestId: e.requestId };
  }));
  const toutes = [...(avant?.esquisses ?? []), ...esquisses];
  const contact = toutes.length ? await (await import("./esquisses")).plancheContact(toutes.map((e) => ({ numero: e.numero, png: assetData(getAsset(e.assetId)!) }))) : null;
  const contactAsset = contact ? await saveAsset({ ...who, data: contact, name: "esquisses-numerotees.png", mime: "image/png", role: "logo-esquisses", origin: "generated", status: "ready", meta: { graphistes: { contact: true } } } as never) : null;
  const planche = a.planche ?? avant?.planche;
  const etat: EtatGraphistes = {
    // Pour une seule planche, une seule esquisse se choisit (elle devient son logo).
    nom, metier, max: planche ? 1 : esquissesAChoisir(planOfProject(p.id)), ...(planche ? { planche } : {}), esquisses: toutes, refusees: (avant?.refusees ?? 0) + r.refusees.length,
    ...(contactAsset ? { contactAssetId: contactAsset.id } : {}),
    planches: [...(avant?.planches ?? []), ...planches, ...r.manquees.filter((m) => m.modele !== "relecture").map((m) => ({ modele: m.modele, recherche, tour: 1, texteEnvoye: "", requestId: null, coutMicro: null, manquee: m.raison }))],
    recherches: recherche, ...(avant?.choix ? { choix: avant.choix } : {}), ...(avant?.logos ? { logos: avant.logos } : {}),
    ...((avant?.finalisationsAccordees ?? a.finalisationsAccordees) != null ? { finalisationsAccordees: avant?.finalisationsAccordees ?? a.finalisationsAccordees } : {}),
    notes: [...(avant?.notes ?? []), ...r.notes].slice(-40), at: Date.now(),
  };
  updateJourney(a.conversationId, (x) => { x.graphistes = etat; });
  const nouvelles = esquisses.length;
  return {
    esquisses: nouvelles, total: toutes.length, refusees: r.refusees.length, reprise: r.reprise, manquees: r.manquees.map((m) => m.modele),
    notice: nouvelles
      ? L(`${nouvelles} esquisse${nouvelles > 1 ? "s" : ""} ${recherche > 1 ? "de plus " : ""}prête${nouvelles > 1 ? "s" : ""}, numérotée${nouvelles > 1 ? "s" : ""}.`, `${nouvelles} sketch(es) ready.`)
      : L("Aucune esquisse n'a passé ma relecture : rien ne t'est montré.", "No sketch passed my review."),
  };
}

/** Les finalisations des esquisses choisies, dans l'ordre de leurs numéros. Un logo refusé deux fois n'est pas gardé. */
async function finaliserLesChoix(ai: GraphistesAi, who: { userId: string; projectId: string }, cid: string, numeros: number[], planche?: string) {
  const etat = journeyOf(cid).graphistes;
  if (!etat?.metier || !numeros.length) throw new UserFacingError(L("Aucune esquisse choisie : rien n'a été décompté.", "No sketch chosen: nothing was charged."));
  const logos: LogoFini[] = [...(etat.logos ?? [])];
  const dits: string[] = [];
  for (const numero of [...new Set(numeros)].sort((x, y) => x - y)) {
    const e = etat.esquisses.find((x) => x.numero === numero);
    const data = e ? assetData(getAsset(e.assetId)!) : null;
    if (!e || !data) { dits.push(L(`L'esquisse ${numero} n'est plus là.`, `Sketch ${numero} is gone.`)); continue; }
    const f = await uneFinalisation(ai, { nom: etat.nom, metier: etat.metier.metier, esquisse: data, numero, detourer: (png) => logoDetoure(png) });
    const sans = logos.filter((l) => l.numero !== numero);
    if (!f.ok) {
      sans.push({ numero, ok: false, raison: f.raison, essais: f.essais.length });
      dits.push(phraseDuLogoNonConstruit(numero, etat.esquisses.map((x) => x.numero).filter((n) => !numeros.includes(n))));
      logos.splice(0, logos.length, ...sans);
      continue;
    }
    const recu = f.recus.at(-1) ?? null;
    const logo = await saveAsset({ ...who, data: f.logo, name: `logo-esquisse-${numero}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { graphistes: { numero, texteEnvoye: f.texte, ideeCentrale: f.essais.at(-1)?.ideeCentrale, recu, essais: f.essais.length, palette: f.palette } } });
    const detoure = await saveAsset({ ...who, data: f.detoure, name: `logo-esquisse-${numero}-sans-fond.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { graphistes: { numero, sansFond: true, de: logo.id } } });
    sans.push({ numero, ok: true, assetId: logo.id, detoureAssetId: detoure.id, texte: f.texte, ideeCentrale: f.essais.at(-1)?.ideeCentrale, ...(f.palette ? { palette: f.palette } : {}), essais: f.essais.length });
    logos.splice(0, logos.length, ...sans);
  }
  updateJourney(cid, (x) => { if (x.graphistes) x.graphistes = { ...x.graphistes, logos, at: Date.now() }; });
  const faits = logos.filter((l) => l.ok && numeros.includes(l.numero)).length;
  // Les planches sont déjà faites : le logo fini se pose sur la planche visée, tel quel.
  if (planche && journeyOf(cid).identities?.list.some((x) => x.key === planche)) {
    const l = logos.find((y) => y.ok && y.assetId && y.detoureAssetId && numeros.includes(y.numero));
    const pose = l ? await poserSurLaPlanche(who, cid, planche, l.assetId!, l.detoureAssetId!) : null;
    return { logos: faits, notice: [pose ? L(`Le logo est posé sur la planche « ${pose} », relu.`, "The logo is on the board, reviewed.") : "", ...dits].filter(Boolean).join(" ") || L("Aucun logo n'a passé ma relecture.", "No logo passed my review.") };
  }
  const planches = lancerLesPlanches(who, cid);
  return { logos: faits, ...(planches ? { planchesJob: planches } : {}), notice: [L(`${faits} logo${faits > 1 ? "s" : ""} fini${faits > 1 ? "s" : ""}, relu${faits > 1 ? "s" : ""}.`, `${faits} finished logo(s).`), ...(planches ? [L("Je prépare maintenant tes identités, chacune avec son logo.", "Now preparing your identities, each with its logo.")] : []), ...dits].join(" ") };
}

/**
 * Quand chaque esquisse choisie a son logo fini et relu : les planches partent, couvertes par l'accord de l'étape « La
 * marque ». Ses 2, 3 ou 4 identités partagent le nom choisi, chacune avec son propre logo, dans l'ordre des numéros.
 * Rien ne part s'il manque un logo (SINA propose une autre esquisse) ou sans accord enregistré.
 */
export function lancerLesPlanches(who: { userId: string; projectId: string }, cid: string): string | null {
  const j = journeyOf(cid), acc = j.accordGraphistes, e = j.graphistes;
  const choix = [...(e?.choix ?? [])].sort((x, y) => x - y);
  if (!acc || !e || choix.length < 2 || j.identities?.list.length || pendingJob(who.projectId, SINA_BRAND_JOB)) return null;
  const logos = choix.map((n) => e.logos?.find((l) => l.numero === n && l.ok && l.assetId));
  if (logos.some((l) => !l)) return null;
  const garde = j.keep.includes("nom");
  const job = enqueue({
    userId: who.userId, projectId: who.projectId, type: SINA_BRAND_JOB, label: L(`${choix.length} identités de marque (SINA)`, `${choix.length} brand identities (SINA)`),
    payload: { projectId: who.projectId, conversationId: cid, capMicro: acc.planchesMicro, ...(acc.planchesStudioMicro != null ? { studioCapMicro: acc.planchesStudioMicro } : {}), count: choix.length, ...(garde ? {} : { names: choix.map(() => e.nom) }), logosGraphistes: logos.map((l) => ({ assetId: l!.assetId!, ...(l!.palette ? { palette: l!.palette } : {}) })), plancheDeMarque: true, ...(j.nomsDeLaMarque?.atelier ? { atelier: j.nomsDeLaMarque.atelier } : {}) },
    maxAttempts: 1, idempotencyKey: `syna:${cid}:planches:${choix.join("-")}:${logos.map((l) => l!.assetId).join("-")}`,
  });
  return job.id;
}

/**
 * Le logo fini posé sur une planche déjà faite (ancien projet, ou « un autre logo » une fois les planches faites) : il
 * devient son logo, avec sa version sans fond et sa version claire (gratuites, sans IA). Ce qui porte l'ancien logo (le
 * haut du site) est noté à refaire ; après le choix, la marque finie refait ce qui le porte (brand.finish). Rend le nom de
 * la planche, ou null.
 */
export async function poserSurLaPlanche(who: { userId: string; projectId: string }, cid: string, key: string, logoId: string, detoureId: string): Promise<string | null> {
  const x = journeyOf(cid).identities?.list.find((y) => y.key === key);
  const logo = getAsset(logoId), detoure = getAsset(detoureId);
  if (!x || !logo || !detoure) return null;
  const dims = async (id: string) => { const m = await sharp(assetData(getAsset(id)!)).metadata().catch(() => ({ width: 1024, height: 1024 })); return { id, w: m.width ?? 1024, h: m.height ?? 1024 }; };
  const clair = await saveAsset({ ...who, data: await lightLogo(assetData(detoure)), name: `logo-${key}-clair.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { synaBoard: { key, slot: "markDark", name: x.name, from: logoId } } });
  const images = { logo: await dims(logoId), mark: await dims(detoureId), markDark: await dims(clair.id) };
  updateJourney(cid, (y) => {
    const id = y.identities;
    if (!id) return;
    id.list = id.list.map((o) => (o.key === key && o.board ? { ...o, board: { ...o.board, images: { ...(o.board.images ?? {}), ...images } } } : o)) as typeof id.list;
    // Le haut du site montre encore l'ancien logo (ou aucun) : il est refait avec celui-ci.
    if (id.list.find((o) => o.key === key)?.board?.images?.site) id.siteAncienLogo = [...new Set([...(id.siteAncienLogo ?? []), key])];
    const inc = (id.incompletes ?? []).map((z) => (z.key === key ? { ...z, manque: manqueDeLaPlanche(id.list.find((o) => o.key === key)!, y.keep.includes("logo")) as string[] } : z)).filter((z) => z.manque.length);
    if (inc.length) id.incompletes = inc; else delete id.incompletes;
    id.at = Date.now();
    // Après le choix : la marque finie prend ce logo, et ce qui le porte est refait avec lui (brand.finish).
    const c = y.identityChoice;
    if (c && (c.mix?.logo ?? c.key) === key) {
      if (y.brandFinish?.images) y.brandFinish.images = { ...y.brandFinish.images, ...images };
      if (y.brandFinish?.manque?.includes("logo")) { delete y.brandFinish.manque; y.brandFinish.studio = true; }
      if (y.steps[3]?.status === "done" || y.steps[3]?.status === "review") y.steps[3] = { status: "todo" };
    }
  });
  return x.name;
}

/** La retouche des couleurs d'un logo fini, sur la demande du client (sur son budget ; la reprise à la charge du Studio). */
async function retoucherUnLogo(ai: GraphistesAi, who: { userId: string; projectId: string }, cid: string, numero: number, demande: string) {
  const etat = journeyOf(cid).graphistes, l = etat?.logos?.find((x) => x.numero === numero && x.ok && x.assetId);
  if (!etat?.metier || !l?.assetId || !demande.trim()) throw new UserFacingError(L("Ce logo n'est pas encore fini : rien n'a été décompté.", "This logo is not finished yet: nothing was charged."));
  const data = assetData(getAsset(l.assetId)!);
  const f = await retoucherLesCouleurs({
    rediger: async () => { throw new Error("aucun texte à écrire pour une retouche"); },
    finaliser: async (logo, t, tour) => (await ai.finaliser(logo, t, `e${numero}-couleurs-${tour}-${Date.now()}`)).png,
    relire: (logo, avant, d, tour) => ai.relireLogo(logo, avant, d, `e${numero}-couleurs-relecture-${tour}`),
    detourer: (png) => logoDetoure(png),
    aLaChargeDuStudio: (fn) => aLaChargeDuStudio(fn),
  }, { nom: etat.nom, metier: etat.metier.metier, logo: data, demande });
  if (!f.ok) return { logos: 0, notice: L(`Je n'ai pas réussi à changer les couleurs de ce logo sans l'abîmer (${f.raison}) : je garde celui d'avant.`, "I could not recolour this logo cleanly: I keep the previous one.") };
  const palette = (await couleursDuLogo(f.detoure).catch(() => null))?.palette;
  const logo = await saveAsset({ ...who, data: f.logo, name: `logo-esquisse-${numero}-couleurs.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { graphistes: { numero, texteEnvoye: f.texte, retouche: demande, palette } } });
  const detoure = await saveAsset({ ...who, data: f.detoure, name: `logo-esquisse-${numero}-couleurs-sans-fond.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { graphistes: { numero, sansFond: true, de: logo.id } } });
  updateJourney(cid, (x) => { if (x.graphistes?.logos) x.graphistes.logos = x.graphistes.logos.map((y) => (y.numero === numero ? { ...y, assetId: logo.id, detoureAssetId: detoure.id, texte: f.texte, ...(palette ? { palette } : {}) } : y)); });
  return { logos: 1, notice: L("Les couleurs de ton logo sont changées, relues.", "Your logo colours are changed, reviewed.") };
}
