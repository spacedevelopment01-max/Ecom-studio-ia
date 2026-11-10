/**
 * Montage du thème sur mesure À LA MARQUE du client (consigne du propriétaire du 9 novembre 2026 : « sina monte le thème
 * avec toutes les sections prévues, avec image et texte ») : tâche de fond « syna.custom.brand », reprenable (chaque
 * section et chaque photo a son point de reprise : une reprise ne repaie rien de ce qui est fait).
 *  1) Textes : pour chaque section, un appel écrit TOUS ses textes pour la marque (faits du client seulement, jamais ceux
 *     d'un modèle, « [À compléter : …] » pour un fait inconnu) et décrit chaque photo à créer.
 *  2) Photos : la vraie photo d'un produit du client quand la photo montre ce produit, sinon une photo créée par l'IA
 *     d'images des sites, dans la direction artistique de la famille choisie (personnes seulement si autorisées).
 * Le thème est ensuite en place dans l'onglet Boutique, où le client demande ses changements.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { UserFacingError, type JobContext } from "../../jobs";
import { loadProject, notify, type Project } from "../../projects";
import { all } from "../../db";
import { getSetting } from "../../settings";
import { assetData, assetUrl, getAsset, saveAsset } from "../../library";
import { llmJson } from "../../ai/llm";
import { withTrace } from "../../ai/trace";
import { aiSiteImageHd, withQuotedImageRoute } from "../../ai/media-providers";
import { loadWordingRules, wordingPromptLine } from "../../client-wording";
import { listProducts } from "../../products/catalog";
import { peopleAllowed } from "../../people-policy";
import { loadFamilyChoice, siteArtUniverse, type FamilyUniverse } from "../section-families";
import { activityPlan } from "../activity";
import { journeyOf, setStep, updateJourney, type Journey } from "../journey";
import { angleDetails, COPY_MODEL } from "../mockup-code/copy";
import { codePhotoPrompt } from "../mockup-code/code-mockup";
import { hdAspect } from "../mockup-code/prompts";
import { mockupImageRoute } from "../mockup-code/tools";
import { libSection, withBrandName } from "./library";
import { allSections, loadCustomTheme, pushCustomThemeHistory, replaceOnce, saveCustomTheme, sectionHtml, type CustomTheme } from "./theme";

export const CUSTOM_BRAND_JOB = "syna.custom.brand";
/**
 * Images du thème (consigne du propriétaire du 9 novembre 2026) : « sina » = SINA crée toutes les photos ; « client » =
 * les images du client seulement (il en faut autant que d'emplacements) ; « mix » = ses images d'abord, SINA crée les
 * autres. Les vraies photos de ses produits servent toujours aux photos de ses produits.
 */
export type ImagesMode = "sina" | "client" | "mix";
export type CustomBrandPayload = { projectId: string; capMicro: number; conversationId?: string | null; photos?: boolean; images?: ImagesMode; clientAssets?: string[]; rewrite?: boolean; consigne?: string | null };

/** Plafond d'un appel d'écriture d'une section (même modèle que les textes du site). */
export const SECTION_TEXT_CAP_MICRO = 150_000;
/**
 * Rédacteur des textes du site (réglage d'administration « site.copy_model », ex. « openai:gpt-5.6-sol ») : demande du
 * propriétaire du 9 novembre 2026 d'essayer OpenAI. Par défaut le modèle des textes du Studio (Claude). Un modèle
 * choisi mais inutilisable (tarif ou confirmation manquants) n'est jamais appelé : le routage habituel reprend.
 */
export function siteCopyModel(): { provider: "anthropic" | "openai" | "google"; model: string; effort?: string } {
  const v = (getSetting("site.copy_model") ?? "").trim();
  const m = /^(anthropic|openai|google):([\w.-]+)$/.exec(v);
  return m ? { provider: m[1] as "anthropic" | "openai" | "google", model: m[2] } : COPY_MODEL;
}

/** Plafond du plan des textes de tout le site (un appel par montage). */
export const SITE_PLAN_CAP_MICRO = 250_000;
const RATIOS = ["1:1", "4:5", "2:3", "16:9", "9:16"] as const;

export const SectionWriteSchema = z.object({
  edits: z.array(z.object({ find: z.string().min(1).max(4000), replace: z.string().max(8000) })).max(80),
  links: z.array(z.object({ text: z.string().min(1).max(120), to: z.string().min(1).max(60) })).max(20),
  photos: z.array(z.object({ find: z.string().min(3).max(200), description: z.string().min(20).max(2500), ratio: z.enum(RATIOS), product: z.string().max(160).nullable() })).max(14),
});
export type SectionWrite = z.infer<typeof SectionWriteSchema>;

/**
 * Règles d'écriture du site (retour du propriétaire du 9 novembre 2026 sur l'essai Heure Dorée : « Lis les étiquettes :
 * c'est quoi ce copywriting, ça doit être bien mieux ». L'accroche de l'angle était reprise mot pour mot puis déclinée
 * partout, menus compris, et chaque section, écrite seule, répétait les mêmes faits).
 */
export const COPY_CRAFT = `Écriture (comme le meilleur concepteur-rédacteur d'une vraie marque française) :
- L'ÉMOTION D'ABORD, partout : chaque titre, chaque texte et chaque bouton qui vend fait RESSENTIR l'émotion de l'angle par une scène, un moment, une sensation (ce qu'on voit, goûte, touche, ressent), jamais par une simple description du produit. Un texte qui informe sans émouvoir est raté.
- Les boutons qui vendent portent le désir et l'émotion (ex. « Retrouver l'été », « Goûter le soleil », « Offrir un matin doré ») ; seuls les boutons purement pratiques (panier, commande, compte, formulaire, aide, légal) restent simples et clairs.
- L'angle choisi est l'ÉMOTION à faire ressentir sur tout le site, jamais une formule à répéter. Son accroche est une piste : elle ne sert, au plus, qu'une fois (l'ouverture de l'accueil), et seulement si elle donne vraiment envie ; sinon tu écris mieux. Ses mots ne vont jamais dans les menus, les liens ni les boutons.
- Un titre donne envie : une image concrète, un goût, une texture, un moment, un bénéfice. Jamais un ordre au lecteur (« Lis… », « Découvre… », « Plonge… »), jamais un slogan creux ni un jeu de mots forcé.
- Un bouton : 2 à 5 mots, un verbe qui donne envie (ex. « Retrouver l'été en pot ») ; « Ajouter au panier » seulement sur le bouton d'achat lui-même.
- Menus, pied de page, liens : les mots simples que le visiteur cherche (ex. « Nos confitures », « Coffret cadeau », « Notre histoire », « Livraison et retours », « Contact »).
- Chaque fait fort (pourcentage, savoir-faire, livraison, retours) apparaît au plus UNE fois par page : on prouve une fois, on ne martèle pas.
- Une même formule n'apparaît qu'UNE fois sur tout le site (hors noms de produits et libellés du menu) ; la promesse du site est une idée à faire sentir, jamais une phrase à recopier.
- Phrases courtes et vivantes (15 mots au plus), des mots qui se goûtent, se touchent, se voient, des détails précis du client plutôt que des adjectifs vagues. Court ne veut pas dire pauvre : une description, une réponse à une objection, un comparatif ou une histoire développe plusieurs idées en plusieurs phrases.
- Jamais de tics d'écriture automatique : pas de « ce n'est pas X, c'est Y », pas de listes de négations, pas de tiret cadratin, pas de deux-points dramatiques en série.`;

export const SECTION_WRITE_SYSTEM = `Tu es concepteur-rédacteur web senior et directeur artistique. Tu adaptes UNE section de site (son HTML) à une petite marque, en français.
Règles absolues :
- Tu remplaces TOUS les textes visibles de la section (titres, paragraphes, boutons, libellés, listes, textes alternatifs des images, questions et réponses) par des textes pour CETTE marque, dans sa voix (tutoiement si elle tutoie), au moins aussi riches que l'original et plus riches quand la conception de la section le demande (description racontée, réponses aux objections, comparatif, questions, avant / après) : jamais trois phrases creuses là où le visiteur attend du contenu. Pour ajouter un élément du même modèle (une question, une ligne de comparatif, un point fort, une étape), recopie exactement la structure HTML d'un élément existant dans le replace.
- RIEN d'inventé : aucun avis, note, nombre d'avis, chiffre, label, certification, promesse de santé, délai, prix, ingrédient ou matière qui ne soit pas dans les faits fournis. Ne remplace jamais un fait du client par un autre (s'il dit « tout est bio », tu gardes le bio). Un fait inconnu s'écrit « [À compléter : …] » ou n'est pas écrit.
- Les textes de la section d'origine viennent d'une démonstration : tu n'en reprends JAMAIS une phrase, même traduite ou retouchée.
${COPY_CRAFT}
- La CONCEPTION de la section (pourquoi elle est là dans le parcours du visiteur, ce qu'elle doit dire) et le parcours de la page s'imposent : la section répond exactement au moment du visiteur et prolonge la section d'avant.
- Le PLAN DES TEXTES DU SITE fourni s'impose : le titre et le bouton de CETTE section tels quels (ajuste-les seulement s'ils ne tiennent pas dans la mise en page), son message, et seulement SES faits chiffrés. Tu ne reprends ni ne paraphrases le titre d'une autre section.
- LIENS : pour CHAQUE bouton ou lien de la section dont tu écris le texte (sauf « Ajouter au panier », les flèches et les onglets), dis où il mène dans links : text = son texte exact tel que tu l'écris, to = la clé d'une page du site (liste fournie), « legal:mentions », « legal:cgv » ou « shop:Nom de famille ». Un bouton ne mène jamais nulle part : s'il n'a pas de destination logique, ce n'est pas un bouton.
- Les coordonnées de la marque (raison sociale, adresse, e-mail, téléphone) et les mentions légales présentes dans la section restent TOUJOURS, écrites exactement, même si le plan ne les cite pas.
- Noms et prix de produits : seulement ceux de la liste fournie, écrits exactement.
- Le vocabulaire imposé par le client est respecté.
- Tu ne touches ni aux balises, ni aux classes, ni aux attributs (sauf alt et les textes) : chaque modification est un remplacement { find, replace } où find est un passage EXACT du HTML fourni, présent une seule fois (prends assez de contexte pour qu'il soit unique), et replace le même passage avec les nouveaux textes.
- Cartes de produits : une carte par produit de la liste, jamais de carte « [À compléter : produit] ». S'il y a plus de cartes que de produits, retire les cartes en trop : find = la carte entière (de sa balise ouvrante à sa balise fermante), replace = "" ; et ne décris pas leurs photos.
- Pour CHAQUE image de la section dont la source commence par « photos/ », décris la photo à créer pour la marque : find = la source exacte (ex. « photos/sl-b1.webp »), description = UNE photo décrite en phrases complètes, dans l'ordre : type de photo, format, point de vue, cadrage ; surface et fond ; chaque objet à sa place (forme, matière, couleur, état) ; « La scène contient exactement N objets : … » ; ce qui est dégagé ; lumière, ombres, ambiance ; « Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane. » ; ratio = format de la photo ; product = le nom exact d'un produit de la liste dès que la photo le montre (sa vraie photo sera utilisée : jamais de pot, flacon ou emballage générique), sinon null. Une photo d'ouverture ou d'ambiance est une scène de vie MAGNIFIQUE qui remplit tout le cadre et fait ressentir l'émotion de l'angle (un lieu vrai, un moment de la journée, une lumière), jamais un produit posé sur un fond uni.
Réponse : uniquement le JSON demandé.`;

/** Faits de la marque donnés à chaque écriture (les mêmes pour toutes les sections). */
export function brandBrief(p: Project, j: Journey | null): string {
  const plan = j ? activityPlan(p.id, j) : null;
  const d = j ? angleDetails(j) : {};
  const products = (() => { try { return listProducts(p.id).map((x) => `${x.data.title}${x.data.price != null ? ` (${(x.data.price / 100).toFixed(2).replace(".", ",")} €)` : ""}`); } catch { return []; } })();
  const wording = wordingPromptLine(loadWordingRules(p.id));
  const b = p.brand;
  return [
    `Marque : « ${b?.name ?? p.name} »${b?.tagline ? `, slogan (mot pour mot) « ${b.tagline} »` : ""}.`,
    b?.positioning ? `Positionnement : ${b.positioning}.` : "",
    b?.audience ? `Clientèle : ${b.audience}.` : "",
    b?.personality?.length ? `Personnalité : ${b.personality.join(", ")}.` : "",
    b?.tone?.voice ? `Voix : ${b.tone.voice}.` : "",
    plan?.angle ? `Angle marketing choisi : « ${plan.angle.title} »${d.emotion ? `, émotion : ${d.emotion}` : ""}${plan.angle.message ? `, accroche proposée à l'étape des angles (une piste, pas un texte imposé) « ${plan.angle.message} »` : ""}${plan.angle.cta ? `, idée d'appel à l'action « ${plan.angle.cta} »` : ""}.` : "",
    d.story ? `Ce qu'on raconte : ${d.story}` : "",
    d.show ? `Ce qu'on montre (scènes de l'angle, pour les photos) : ${d.show}` : "",
    plan?.keyMessages.length ? `Messages clés : ${plan.keyMessages.map((m) => `« ${m} »`).join(" ; ")}.` : "",
    ((a) => (a ? [a.audience ? `Cible de l'angle : ${a.audience}` : "", a.motivation ? `Ce qui la fait acheter : ${a.motivation}` : ""].filter(Boolean).join(". ") : ""))(j ? j.angles?.list.find((x) => x.id === (j.angleChoice?.ids?.[0] ?? j.angleChoice?.id)) : undefined),
    plan?.objections.length ? `Objections du client idéal (recherche) et réponses vraies : ${plan.objections.map((o) => `« ${o.objection} » → ${o.answer}`).join(" ; ")}.` : "",
    products.length ? `Produits (noms et prix exacts) : ${products.join(" ; ")}.` : "",
    plan?.offer.facts.length ? `Faits confirmés par le client : ${plan.offer.facts.join(" ; ")}.` : "",
    d.toConfirm?.length ? `NON confirmés, à ne JAMAIS affirmer : ${d.toConfirm.join(" ; ")}.` : "",
    plan?.company.shipping ? `Livraison : ${plan.company.shipping}.` : "",
    plan?.company.returns ? `Retours : ${plan.company.returns}.` : "",
    ((c) => (c.length ? `Coordonnées : ${c.join(" · ")}.` : ""))([plan?.company.legalName, plan?.company.email, plan?.company.address, plan?.company.phone].filter((x): x is string => !!x)),
    wording,
  ].filter(Boolean).join("\n");
}

export const SitePlanSchema = z.object({
  promesse: z.string().min(5).max(240),
  voix: z.string().min(5).max(400),
  menu: z.array(z.string().min(1).max(40)).max(8),
  sections: z.array(z.object({
    uid: z.string().max(12), message: z.string().min(3).max(320), titre: z.string().max(110).nullable(),
    bouton: z.string().max(40).nullable(), faits: z.array(z.string().max(160)).max(4),
  })).max(40),
});
export type SitePlan = z.infer<typeof SitePlanSchema>;

export const SITE_PLAN_SYSTEM = `Tu es le concepteur-rédacteur en chef d'une petite marque. AVANT que chaque section de son site soit écrite, tu fais le PLAN DES TEXTES de tout le site, en français : la promesse, la voix, les libellés du menu principal, et pour CHAQUE section son message (différent de toutes les autres), son titre, son bouton (null si elle n'en a pas) et les faits qu'elle seule utilise.
${COPY_CRAFT}
- Rôle des pages : accueil = donner envie puis choisir ; boutique = choisir vite ; fiche produit = décider et rassurer ; panier = finir sans hésiter ; à propos = l'histoire vraie de la marque ; aide, contact, légal = répondre clairement, sans effet de style.
- Les faits forts sont RÉPARTIS entre les sections : jamais deux sections d'une même page avec le même fait. Aucun titre ne se répète sur le site.
- RIEN d'inventé : seulement les faits fournis ; un fait inconnu n'est pas écrit.
- Titre null pour une section sans titre (en-tête, bandeau, pied de page) ; dans l'en-tête, le menu suit tes libellés.
- Le pied de page garde les coordonnées complètes de la marque (ses faits les citent).
Réponse : uniquement le JSON demandé.`;

export function sitePlanPrompt(brief: string, sections: { uid: string; page: string; title: string; does: string; texts: string; intent?: string }[], o: { concept?: string; journeys?: { page: string; journey: string }[] } = {}): string {
  return [brief, "", o.concept ? `IDÉE DU SITE (conception) : ${o.concept}` : "", ...(o.journeys ?? []).map((x) => `PARCOURS DU VISITEUR · ${x.page} : ${x.journey}`), "", "Sections du site, dans l'ordre (uid · page · section · ce qu'elle fait · conception · ses textes de démonstration, à NE PAS reprendre) :",
    ...sections.map((x) => `- ${x.uid} · ${x.page} · « ${x.title} » · ${x.does}${x.intent ? ` · CONCEPTION : ${x.intent}` : ""} · démo : ${x.texts}`)].filter((x, i) => x !== "" || i === 1).join("\n");
}

/** Textes visibles d'une section (titres, boutons, liens), pour montrer sa forme au plan sans tout son HTML. */
export function sectionSkeleton(html: string): string {
  const bits = [...html.matchAll(/<(h[1-4]|button|a|summary)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => `${m[1]}:${m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`).filter((x) => x.length > 3 && x.length < 90);
  return [...new Set(bits)].slice(0, 14).join(" | ") || "(aucun titre)";
}

export function sectionWritePrompt(brief: string, place: string, title: string, does: string, html: string, plan?: { site: SitePlan; uid: string }, design?: { intent?: string; journey?: string; pages?: string }): string {
  const mine = plan?.site.sections.find((x) => x.uid === plan.uid);
  const others = plan ? plan.site.sections.filter((x) => x.uid !== plan.uid && x.titre).map((x) => `« ${x.titre} »`) : [];
  const planText = plan ? [
    "PLAN DES TEXTES DU SITE (à suivre) :",
    `Promesse : ${plan.site.promesse}`, `Voix : ${plan.site.voix}`, plan.site.menu.length ? `Menu principal : ${plan.site.menu.join(" · ")}` : "",
    mine ? `CETTE section : message : ${mine.message}${mine.titre ? ` ; titre : « ${mine.titre} »` : ""}${mine.bouton ? ` ; bouton : « ${mine.bouton} »` : ""} ; faits à utiliser ici (et aucun autre chiffre) : ${mine.faits.length ? mine.faits.join(" ; ") : "aucun"}.` : "",
    others.length ? `Titres des autres sections (ne les répète pas) : ${others.join(", ")}.` : "",
  ].filter(Boolean).join("\n") : "";
  const designText = [design?.pages ? `PAGES DU SITE (clé : nom) : ${design.pages}` : "", design?.journey ? `PARCOURS DU VISITEUR SUR CETTE PAGE : ${design.journey}` : "", design?.intent ? `CONCEPTION DE CETTE SECTION : ${design.intent}` : ""].filter(Boolean).join("\n");
  return [brief, "", ...(planText ? [planText, ""] : []), ...(designText ? [designText, ""] : []), `Section à adapter : « ${title} » (${place}). Ce qu'elle fait : ${does}`, "HTML actuel de la section (textes de démonstration à remplacer) :", html].join("\n");
}

/** Applique les remplacements d'une écriture : ceux qui ne s'appliquent pas sont comptés, jamais devinés. */
/** Entités HTML courantes décodées (comparaison du texte d'un lien avec la section). */
const decodeEntities = (v: string) => v.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|laquo|raquo|eacute|egrave|agrave|ccedil));/gi, (_m, d, h, n) => d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç" } as Record<string, string>)[n.toLowerCase()]);

export function applyWrite(html: string, w: SectionWrite): { html: string; failed: number; applied: number } {
  let out = html, failed = 0, applied = 0;
  for (const e of w.edits) {
    if (/<\s*script\b|\son[a-z]+\s*=(?!"return false")/i.test(e.replace)) { failed++; continue; }
    try { out = replaceOnce(out, e.find, e.replace); applied++; } catch { failed++; }
  }
  return { html: out, failed, applied };
}

/** Emplacements de photos encore d'exemple dans le thème (une photo par emplacement, dédoublonnés par section). */
export function photoSlots(t: CustomTheme): { uid: string; place: string; section: string; file: string }[] {
  // Les cartes (plan d'adresse) ne sont jamais des photos à créer : la vraie carte s'ouvre à l'adresse du client.
  return allSections(t).flatMap((x) => [...new Set([...sectionHtml(x.s).matchAll(/photos\/([\w-]+\.(?:webp|png|jpg))/g)].map((m) => m[1]).filter((f) => !/^(carte|map|plan)-/.test(f)))]
    .map((file) => ({ uid: x.s.uid, place: x.page?.label ?? x.place, section: libSection(x.s.id)?.title ?? x.s.id, file })));
}
export const examplePhotoCount = (t: CustomTheme): number => photoSlots(t).length;

/**
 * Nom d'une photo créée pour le site : la page et ce qu'elle montre (essai réel du 9 novembre : nommées d'après la photo
 * d'exemple remplacée, « theme-sur-mesure-rooibos.png », elles passaient pour des photos de thé aux yeux de SINA).
 */
export function sitePhotoName(place: string, description: string): string {
  const STOP = /^(photo|grande|petite|une|un|des|de|du|la|le|les|en|et|au|aux|pour|sur|avec|d|l|plan|vue|format|cadrage|carree|carre|horizontale|verticale|ambiance|bord|a)$/;
  const words = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.test(w)).slice(0, 5);
  const slug = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `site-${slug(place) || "page"}-${words.join("-") || "photo"}.png`;
}

/**
 * Photo posée DERRIÈRE le texte d'une section (ouverture, bandeau) : le sujet va du côté opposé au texte, le texte se
 * pose sur la partie calme (consigne du propriétaire du 9 novembre 2026 : « on met le texte où c'est vide, c'est
 * logique » ; la photo d'ouverture d'Heure Dorée avait ses pots sous le titre et le vide de l'autre côté).
 * Le côté du texte vient de la description de la section (« À gauche : le titre… »).
 */
export function textPlacementLine(html: string, find: string, does: string): string {
  const esc = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`background-image:\\s*url\\(['"]?${esc}`).test(html)) return "";
  const side = /(^|[.;:]\s*)à gauche\s*:/i.test(does) ? "gauche" : /(^|[.;:]\s*)à droite\s*:/i.test(does) ? "droite" : null;
  if (!side) return "Le texte de la section est posé PAR-DESSUS cette photo : garde une zone calme (flou, ombre douce, mur, ciel, nappe) là où il se pose, le sujet principal autour, jamais sous le texte.";
  const other = side === "gauche" ? "droite" : "gauche";
  return `Le texte de la section est posé PAR-DESSUS la partie ${side} de cette photo : le sujet principal, et tout ce qui attire l'œil, est dans le tiers ${other} de l'image, entier ; la partie ${side} reste calme (flou, ombre douce, mur, ciel, nappe) pour que le texte se lise, tout en appartenant à la scène. Jamais de sujet sous le texte, jamais un côté ${other} vide.`;
}

/** Direction artistique d'une photo du site : l'univers de la famille + l'émotion de l'angle choisi + les couleurs. */
export function siteArtDirection(p: Project, fu: FamilyUniverse | null, j: Journey | null): string | null {
  if (!fu) return null;
  const d = j ? angleDetails(j) : {};
  return `${fu.style} ; ${fu.idea} ; lumière : ${fu.light} ; décors : ${fu.setting} ; composition : ${fu.composition.join(" ; ")} ; émotion à faire ressentir : ${d.emotion ?? fu.emotion}${d.story ? ` (l'histoire de la marque : ${d.story})` : ""} ; couleurs de la marque : ${[p.brand?.palette?.dark, p.brand?.palette?.primary, p.brand?.palette?.accent].filter(Boolean).join(", ")}.`;
}

/**
 * Photos envoyées par le client (Fichiers du projet), dans l'ordre d'arrivée, utilisables sur son site : jamais son logo
 * (ni ses déclinaisons), jamais une image marquée comme inspiration, jamais une image trop petite pour une section
 * (moins de 500 px de côté : icône, capture réduite). Audit du 10 novembre 2026 : le logo envoyé à l'étape 0 comptait
 * comme une photo du site.
 */
export function clientImages(projectId: string): { id: string; name: string }[] {
  return all<{ id: string; name: string; meta: string | null }>(
    "SELECT id, name, meta FROM assets WHERE project_id=? AND deleted_at IS NULL AND kind='image' AND origin='upload' AND COALESCE(role,'') NOT LIKE 'logo%' AND (width IS NULL OR width>=500) AND (height IS NULL OR height>=500) ORDER BY created_at",
    projectId,
  ).filter((a) => { try { return !JSON.parse(a.meta ?? "{}").inspiration; } catch { return true; } }).map(({ id, name }) => ({ id, name }));
}

/** Photos que SINA créera, selon le choix du client. */
export function photosToCreate(needed: number, mode: ImagesMode, clientCount: number): number {
  return mode === "client" ? 0 : mode === "mix" ? Math.max(0, needed - clientCount) : needed;
}

/** Remplaçables par les tests (aucun appel réel). */
export const customBrandDeps: {
  plan?: (prompt: string, usageKey: string) => Promise<SitePlan>;
  write?: (prompt: string, usageKey: string) => Promise<SectionWrite>;
  photo?: (prompt: string, product: Buffer | null, aspect: string, usageKey: string) => Promise<Buffer>;
} = {};

export async function runCustomBrandJob(ctx: JobContext) {
  const a = ctx.payload as CustomBrandPayload;
  const p = loadProject(a.projectId);
  let t = loadCustomTheme(p.id);
  if (!t) throw new UserFacingError(L("Aucun thème sur mesure à monter : choisis d'abord ta famille (Classique ou Moderne), puis SINA monte les pages.", "No custom theme yet."));
  const j = a.conversationId ? (() => { try { return journeyOf(a.conversationId!); } catch { return null; } })() : null;
  // Demande du client pour ses textes (essai Heure Dorée : « le matin d'hiver où l'été revient » n'arrivait pas au rédacteur).
  const brief = [brandBrief(p, j), a.consigne ? `DEMANDE DU CLIENT POUR SES TEXTES (prioritaire, à suivre dans tout le site, ses mots) : « ${a.consigne} »` : ""].filter(Boolean).join("\n");
  const name = p.brand?.name ?? p.name;
  const products = (() => { try { return listProducts(p.id); } catch { return []; } })();
  const fam = loadFamilyChoice(p.id), people = peopleAllowed(p.id), fu = siteArtUniverse(fam, { people });
  const direction = siteArtDirection(p, fu, j);
  // rewrite : le client n'aime pas les textes, tout le site est réécrit (sinon seules les sections encore d'exemple).
  const sections = allSections(t).filter((x) => a.rewrite || !x.s.clientTexts);
  const writer = siteCopyModel();
  const report = { sections: 0, failedEdits: 0, photosMade: 0, photosReal: 0, photosClient: 0, problems: [] as string[], redacteur: `${writer.provider}:${writer.model}` };
  const briefs: Record<string, SectionWrite["photos"]> = {};

  // Un seul point d'annulation pour tout le montage : « Annuler » revient au thème d'avant le montage.
  await ctx.step("undo-point", async () => { pushCustomThemeHistory(p.id); return true; });

  // 0) Plan des textes de tout le site (un appel) : chaque section reçoit SON message, son titre et ses faits.
  let sitePlan: SitePlan | null = null;
  if (sections.length) {
    ctx.progress(0.03, L("Plan des textes du site", "Site copy plan"));
    try {
      sitePlan = await ctx.step("text-plan", async () => {
        const prompt = sitePlanPrompt(brief, sections.map((x) => { const l = libSection(x.s.id); return { uid: x.s.uid, page: x.page?.label ?? x.place, title: l?.title ?? x.s.id, does: l?.does ?? "", texts: sectionSkeleton(withBrandName(sectionHtml(x.s), name)), intent: x.s.intent }; }),
          { concept: t!.concept, journeys: t!.pages.filter((pg) => pg.journey).map((pg) => ({ page: pg.label, journey: pg.journey! })) });
        const usageKey = `${ctx.job.id}:text-plan`;
        return customBrandDeps.plan ? customBrandDeps.plan(prompt, usageKey)
          : SitePlanSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-text-plan", costCapMicro: a.capMicro }, () =>
              llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: SITE_PLAN_SYSTEM, promptKey: "syna-custom-plan-1", prompt, maxTokens: 8000, maxOutputTokens: 8000, usageKey, routing: { difficulty: "complex", prefer: siteCopyModel() } }, SitePlanSchema, { strict: true })));
      });
    } catch (e) { report.problems.push(`plan des textes non fait (${(e as Error).message.slice(0, 120)}) : sections écrites sans plan`); }
  }

  // 1) Textes, section par section (un point de reprise chacune).
  for (const [i, x] of sections.entries()) {
    const l = libSection(x.s.id);
    ctx.progress(0.05 + (0.45 * i) / Math.max(1, sections.length), L(`Textes : ${l?.title ?? x.s.id}`, `Copy: ${l?.title ?? x.s.id}`));
    try {
      const w = await ctx.step(`text:${x.s.uid}`, async () => {
        const html = withBrandName(sectionHtml(x.s), name);
        const prompt = sectionWritePrompt(brief, x.page?.label ?? x.place, l?.title ?? x.s.id, l?.does ?? "", html, sitePlan ? { site: sitePlan, uid: x.s.uid } : undefined, { intent: x.s.intent, journey: x.page?.journey, pages: t!.pages.map((pg) => `${pg.key} : ${pg.label}`).join(" · ") });
        const usageKey = `${ctx.job.id}:text:${x.s.uid}`;
        return customBrandDeps.write ? customBrandDeps.write(prompt, usageKey)
          : SectionWriteSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-text", costCapMicro: a.capMicro }, () =>
              llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: SECTION_WRITE_SYSTEM, promptKey: "syna-custom-section-1", prompt, maxTokens: 12000, maxOutputTokens: 12000, usageKey, routing: { difficulty: "complex", prefer: siteCopyModel() } }, SectionWriteSchema, { strict: true })));
      });
      // Écriture posée une seule fois : à la reprise d'une tâche, une section déjà enregistrée n'est pas réappliquée
      // (sinon tous ses remplacements échouaient sur un texte déjà réécrit, audit du 10 novembre 2026).
      const r = await ctx.step(`text-saved:${x.s.uid}`, async () => {
        t = loadCustomTheme(p.id)!;
        const cur = allSections(t).find((y) => y.s.uid === x.s.uid);
        if (!cur) return null;
        const out = applyWrite(withBrandName(sectionHtml(cur.s), name), w);
        // « Textes du client » seulement si la section a VRAIMENT été réécrite (une réponse vide ne compte pas).
        cur.s.html = out.html; cur.s.clientTexts = out.failed === 0 && out.applied > 0;
        // Liens : seulement vers une page du site, et seulement pour un texte réellement écrit dans la section.
        const keys = new Set(t.pages.map((pg) => pg.key)), text = decodeEntities(out.html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
        const clean = (v: string) => v.replace(/[→↗]/g, "").replace(/\s+/g, " ").trim();
        const kept = w.links.filter((k) => keys.has(k.to.split(":")[0]) && text.includes(clean(k.text)));
        const links = Object.fromEntries(kept.map((k) => [clean(k.text), k.to]));
        const dead = w.links.filter((k) => !keys.has(k.to.split(":")[0])).map((k) => `« ${k.text} » → ${k.to}`);
        const lost = w.links.filter((k) => keys.has(k.to.split(":")[0]) && !kept.includes(k)).map((k) => `« ${k.text} »`);
        if (Object.keys(links).length) cur.s.links = links;
        t = saveCustomTheme(p.id, t, { history: false });
        return { failed: out.failed, applied: out.applied, dead, lost };
      });
      if (!r) continue;
      if (r.dead.length) report.problems.push(`${l?.title} : bouton(s) vers une page qui n'existe pas (${r.dead.join(", ")})`);
      if (r.lost.length) report.problems.push(`${l?.title} : lien(s) non posé(s), texte introuvable dans la section (${r.lost.join(", ")})`);
      briefs[x.s.uid] = w.photos;
      report.sections++; report.failedEdits += r.failed;
      if (r.failed) report.problems.push(`${l?.title} : ${r.failed} texte(s) non remplacé(s)`);
      if (!r.applied) report.problems.push(`${l?.title} : aucun texte réécrit, les textes d'exemple restent`);
    } catch (e) { report.problems.push(`${l?.title ?? x.s.id} : textes non écrits (${(e as Error).message.slice(0, 120)})`); }
  }

  // 2) Photos : vraie photo du produit, sinon photo créée dans la direction artistique de la marque.
  if (a.photos !== false) {
    const todo = Object.entries(briefs).flatMap(([uid, list]) => list.map((ph) => ({ uid, ph }))).filter((x) => !/(^|\/)(carte|map|plan)-[\w-]*\.(?:webp|png|jpe?g)/.test(x.ph.find));
    const mode: ImagesMode = a.images ?? "sina";
    // Images du client d'abord (« client » ou « mix »), dans l'ordre ; jamais une même image sur deux emplacements.
    const own = mode === "sina" ? [] : (a.clientAssets ?? []).filter((id) => { const x = getAsset(id); return !!x && x.project_id === p.id && !x.deleted_at && x.kind === "image"; });
    let next = 0;
    for (const [i, { uid, ph }] of todo.entries()) {
      ctx.progress(0.5 + (0.48 * i) / Math.max(1, todo.length), L(`Photos : ${i + 1} sur ${todo.length}`, `Photos: ${i + 1} of ${todo.length}`));
      const file = ph.find.replace(/^.*\//, "");
      // Photo d'un élément retiré par le rédacteur (carte en trop) : rien à créer, rien à payer.
      const here = allSections(loadCustomTheme(p.id)!).find((y) => y.s.uid === uid);
      if (!here || !sectionHtml(here.s).includes(ph.find)) continue;
      try {
        const real = ph.product ? products.find((x) => x.data.title.trim().toLowerCase() === ph.product!.trim().toLowerCase())?.data.images[0]?.assetId : undefined;
        const mine = !(real && getAsset(real)) && next < own.length ? own[next++] : undefined;
        if (!(real && getAsset(real)) && !mine && mode === "client") { report.problems.push(`photo ${file} : aucune image du client pour cet emplacement`); continue; }
        const assetId = real && getAsset(real) ? real : mine ? mine : await ctx.step(`photo:${uid}:${file}`, async () => {
          const prodRef = ph.product ? products.find((x) => x.data.title.trim().toLowerCase() === ph.product!.trim().toLowerCase())?.data.images[0]?.assetId : undefined;
          const ref = prodRef ? getAsset(prodRef) : undefined;
          const place = textPlacementLine(sectionHtml(here.s), ph.find, libSection(here.s.id)?.does ?? "");
          const prompt = codePhotoPrompt({ id: `ct-${uid}-${file}`, description: [ph.description, place].filter(Boolean).join("\n"), ratio: ph.ratio, product: !!ph.product }, { name, logo: false, product: !!ref, direction, people: !!fu && people });
          const usageKey = `${ctx.job.id}:photo:${uid}:${file}`;
          const data = customBrandDeps.photo ? await customBrandDeps.photo(prompt, ref ? assetData(ref) : null, ph.ratio, usageKey)
            : await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-photo", costCapMicro: a.capMicro }, () => withQuotedImageRoute(mockupImageRoute(), () => aiSiteImageHd({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey }, { prompt, product: ref ? assetData(ref) : null, aspect: hdAspect(ph.ratio) })));
          const asset = await saveAsset({ projectId: p.id, userId: p.userId, data, name: sitePhotoName(here.page?.label ?? here.place, ph.description), mime: "image/png", role: "site", origin: "generated", meta: { synaPhoto: { description: ph.description, ratio: ph.ratio, direction: "custom", product: !!ph.product, replaced: file } } });
          return asset.id;
        });
        if (real) report.photosReal++; else if (mine) report.photosClient++; else report.photosMade++;
        t = loadCustomTheme(p.id)!;
        const cur = allSections(t).find((y) => y.s.uid === uid);
        if (cur) { cur.s.html = sectionHtml(cur.s).split(ph.find).join(assetUrl({ id: assetId })); t = saveCustomTheme(p.id, t, { history: false }); }
      } catch (e) { report.problems.push(`photo ${file} non créée (${(e as Error).message.slice(0, 120)})`); }
    }
  }

  ctx.progress(1, L("Thème monté à ta marque", "Theme built for your brand"));
  if (a.conversationId) { try { updateJourney(a.conversationId, (x) => setStep(x, 6, "review", L("thème sur mesure monté à la marque, à voir dans la Boutique", "custom theme built"))); } catch { /* fil supprimé */ } }
  notify(p.userId, p.id, report.problems.length ? L("Ton thème sur mesure est monté : des points restent à voir", "Your custom theme is built: some points remain") : L("Ton thème sur mesure est monté à ta marque", "Your custom theme is built"), L("Il est en place dans l'onglet Boutique.", "It is in the Boutique tab."), report.problems.length ? "warning" : "success");
  return { ...report, version: loadCustomTheme(p.id)?.rev ?? null };
}

export const customBrandHandlers: Record<string, (ctx: JobContext) => Promise<unknown>> = {
  [CUSTOM_BRAND_JOB]: (ctx) => runCustomBrandJob(ctx),
};
