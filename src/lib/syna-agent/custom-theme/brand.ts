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
import { famillePhotoLine } from "./familles";
import { z } from "zod";
import { L } from "../../i18n-server";
import { UserFacingError, type JobContext } from "../../jobs";
import { loadProject, notify, type Project } from "../../projects";
import { all } from "../../db";
import { getSetting } from "../../settings";
import { assetData, assetUrl, getAsset, saveAsset } from "../../library";
import { llmJson, type LlmCall } from "../../ai/llm";
import { lintClaims } from "../../ai/tasks";
import { withTrace } from "../../ai/trace";
import { aiSiteImageHd, photoRequestMaxMicro, PUBLICATION_PROMPT_MAX_BYTES, withQuotedImageRoute } from "../../ai/media-providers";
import { loadWordingRules, wordingPromptLine } from "../../client-wording";
import { listProducts } from "../../products/catalog";
import { peopleAllowed } from "../../people-policy";
import { loadFamilyChoice, siteArtUniverse, type FamilyUniverse } from "../section-families";
import { activityPlan } from "../activity";
import { asShown, clientNotes, clientNotesBrief, factFlags, fillKnownGaps, shownFacts, siteFacts } from "./site-facts";
import { hoursLine, zoneCities } from "./tenue-data";
import { journeyOf, setStep, updateJourney, type Journey } from "../journey";
import { jobSpentMicro } from "../budget";
import { angleDetails, COPY_MODEL } from "../mockup-code/copy";
import { codePhotoPrompt } from "../mockup-code/code-mockup";
import { hdAspect } from "../mockup-code/prompts";
import { mockupImageRoute } from "../mockup-code/tools";
import { authenticSection, isCutoutPhoto, isProductPhotoSection, libSection, withBrandName, type LibSection } from "./library";
import { cutoutPhoto, FOND_A_DETOURER } from "./cutout-photo";
import { checkCreatedImage, galleryCheckMaxMicro, galleryDeps } from "./gallery";
import { CHECK_MODEL } from "../mockup-code/check";
import { customThemePageShots } from "./shots";
import { LOOK_PAGES_MAX, LOOK_SYSTEM, LookSchema, lookProblems, lookPrompt, type LooksReport } from "./looks";
import { educated } from "./knowledge";
import { riskCount } from "./risk";
import { allSections, deadLinks, loadCustomTheme, pushCustomThemeHistory, replaceOnce, saveCustomTheme, sectionHtml, type CustomTheme } from "./theme";

export const CUSTOM_BRAND_JOB = "syna.custom.brand";
/**
 * Images du thème (consigne du propriétaire du 9 novembre 2026) : « sina » = SINA crée toutes les photos ; « client » =
 * les images du client seulement (il en faut autant que d'emplacements) ; « mix » = ses images d'abord, SINA crée les
 * autres. Les vraies photos de ses produits servent toujours aux photos de ses produits.
 */
export type ImagesMode = "sina" | "client" | "mix";
export type CustomBrandPayload = { projectId: string; capMicro: number; conversationId?: string | null; photos?: boolean; newPhotos?: boolean; /** Pages dont les photos sont créées maintenant (null : toutes). */ pages?: string[] | null; images?: ImagesMode; clientAssets?: string[]; rewrite?: boolean; consigne?: string | null };

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
/**
 * Règle du propriétaire : jamais de personne dans une image sans photo fournie par le client ou accord écrit. Essai réel
 * du 16 novembre 2026 : les descriptions demandaient un geste fait par des mains ; le contrôle refusait ensuite chaque
 * photo, et la photo d'exemple restait sur le site. La règle est donc dite à celui qui décrit les photos (ici), rappelée
 * dans le dossier de chaque montage (peopleBriefLine), et tenue sans IA juste avant la création (briefWithoutPeople).
 */
export const NO_PEOPLE_PHOTO_RULE = "PERSONNES : aucune personne, aucune main, aucun visage, aucune silhouette, aucune partie du corps dans une photo, sauf si le dossier dit en toutes lettres que les personnes sont autorisées (photo de personne fournie par le client, ou son accord écrit). Sans cela, un geste ne se montre jamais par celui qui le fait : il se montre par l'outil posé, l'objet en cours, la trace du travail.";

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
- Les boutons qui vendent portent le désir et l'émotion (un verbe d'envie et ce que le client de CETTE marque vient chercher, avec ses mots à elle) ; seuls les boutons purement pratiques (panier, commande, compte, formulaire, aide, légal) restent simples et clairs.
- L'angle choisi est l'ÉMOTION à faire ressentir sur tout le site, jamais une formule à répéter. Son accroche est une piste : elle ne sert, au plus, qu'une fois (l'ouverture de l'accueil), et seulement si elle donne vraiment envie ; sinon tu écris mieux. Ses mots ne vont jamais dans les menus, les liens ni les boutons.
- Un titre donne envie : une image concrète, un goût, une texture, un moment, un bénéfice. Jamais un ordre au lecteur (« Lis… », « Découvre… », « Plonge… »), jamais un slogan creux ni un jeu de mots forcé.
- Un bouton : 2 à 5 mots, un verbe qui donne envie ; « Ajouter au panier » seulement sur le bouton d'achat lui-même.
- Menus, pied de page, liens : les mots simples que le visiteur cherche (le nom courant de ce qui est vendu, puis l'histoire, la livraison et les retours, le contact).
- Chaque fait fort (pourcentage, savoir-faire, livraison, retours) apparaît au plus UNE fois par page : on prouve une fois, on ne martèle pas.
- Une même formule n'apparaît qu'UNE fois sur tout le site (hors noms de produits et libellés du menu) ; la promesse du site est une idée à faire sentir, jamais une phrase à recopier.
- Phrases courtes et vivantes (15 mots au plus), des mots qui se goûtent, se touchent, se voient, des détails précis du client plutôt que des adjectifs vagues. Court ne veut pas dire pauvre : une description, une réponse à une objection, un comparatif ou une histoire développe plusieurs idées en plusieurs phrases.
- Jamais de tics d'écriture automatique : pas de « ce n'est pas X, c'est Y », pas de listes de négations, pas de tiret cadratin, pas de deux-points dramatiques en série.`;

export const SECTION_WRITE_SYSTEM = `Tu es concepteur-rédacteur web senior et directeur artistique. Tu adaptes UNE section de site (son HTML) à une petite marque, en français.
Règles absolues :
- Tu remplaces TOUS les textes visibles de la section (titres, paragraphes, boutons, libellés, listes, textes alternatifs des images, questions et réponses) par des textes pour CETTE marque, dans sa voix (tutoiement si elle tutoie), au moins aussi riches que l'original et plus riches quand la conception de la section le demande (description racontée, réponses aux objections, comparatif, questions, avant / après) : jamais trois phrases creuses là où le visiteur attend du contenu. Pour ajouter un élément du même modèle (une question, une ligne de comparatif, un point fort, une étape), recopie exactement la structure HTML d'un élément existant dans le replace.
- Chaque texte alternatif (alt) décrit précisément l'image pour une personne qui ne la voit pas (ce qu'on voit, et le nom exact du produit quand il apparaît) : il sert aussi au référencement ; jamais de bourrage de mots, jamais vide sur une image qui montre quelque chose.
- RIEN d'inventé : aucun avis, note, nombre d'avis, chiffre, label, certification, promesse de santé, délai, prix, ingrédient ou matière qui ne soit pas dans les faits fournis. Ne remplace jamais un fait du client par un autre (s'il dit « tout est bio », tu gardes le bio). Un fait inconnu s'écrit « [À compléter : …] » ou n'est pas écrit.
- Les textes de la section d'origine viennent d'une démonstration : tu n'en reprends JAMAIS une phrase, même traduite ou retouchée.
${COPY_CRAFT}
- La CONCEPTION de la section (pourquoi elle est là dans le parcours du visiteur, ce qu'elle doit dire) et le parcours de la page s'imposent : la section répond exactement au moment du visiteur et prolonge la section d'avant.
- Le PLAN DES TEXTES DU SITE fourni s'impose : le titre et le bouton de CETTE section tels quels (ajuste-les seulement s'ils ne tiennent pas dans la mise en page), son message, et seulement SES faits chiffrés. Tu ne reprends ni ne paraphrases le titre d'une autre section.
- LIENS : pour CHAQUE bouton ou lien de la section dont tu écris le texte (sauf « Ajouter au panier », les flèches et les onglets), dis où il mène dans links : text = son texte exact tel que tu l'écris, to = la clé d'une page du site (liste fournie), « legal:mentions », « legal:cgv » ou « shop:Nom de famille ». Un bouton ne mène jamais nulle part : s'il n'a pas de destination logique, ce n'est pas un bouton.
- Les coordonnées de la marque (raison sociale, adresse, e-mail, téléphone) et les mentions légales présentes dans la section restent TOUJOURS, écrites exactement, même si le plan ne les cite pas.
- Noms et prix de produits : seulement ceux de la liste fournie, écrits exactement.
- EMPLACEMENTS AUTOMATIQUES : quand la consigne dit « CE QUE LE STUDIO AFFICHERA LUI-MÊME DANS CETTE SECTION », ces faits (liste entière des prestations ou des produits, horaires, zone, téléphone, adresse) seront posés tels quels à la place des emplacements d'exemple. Le titre et le texte ne donnent jamais un nombre qui contredit ce qui s'affiche (jamais « trois formules » devant une liste de cinq), et tu n'écris jamais « [À compléter : …] » pour un fait présent dans le dossier ou dans « CE QUE LE CLIENT A DIT ».
- ADRESSE DISCRÈTE : quand le dossier dit que l'adresse ne s'écrit que dans les informations légales, tu ne l'écris nulle part ailleurs (ni pied de page, ni contact, ni « venir nous voir ») : tu parles de la zone où le client se déplace.
- Le vocabulaire imposé par le client est respecté.
- Tu ne touches ni aux balises, ni aux classes, ni aux attributs (sauf alt et les textes) : chaque modification est un remplacement { find, replace } où find est un passage EXACT du HTML fourni, présent une seule fois (prends assez de contexte pour qu'il soit unique), et replace le même passage avec les nouveaux textes.
- Cartes de produits : une carte par produit de la liste, jamais de carte « [À compléter : produit] ». S'il y a plus de cartes que de produits, retire les cartes en trop : find = la carte entière (de sa balise ouvrante à sa balise fermante), replace = "" ; et ne décris pas leurs photos.
- Pour CHAQUE image de la section dont la source commence par « photos/ », décris TOUJOURS la photo à créer pour la marque (même si le client a dit de ne pas créer de photo maintenant : la description sert au montage des photos, plus tard) : find = la source exacte (ex. « photos/sl-b1.webp »), description = UNE photo décrite en phrases complètes, dans l'ordre : type de photo, format, point de vue, cadrage ; surface et fond ; chaque objet à sa place (forme, matière, couleur, état) ; « La scène contient exactement N objets : … » ; ce qui est dégagé ; lumière, ombres, ambiance ; « Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane. » ; ratio = format de la photo ; product = le nom exact d'un produit de la liste dès que la photo le montre (sa vraie photo sera utilisée : jamais de pot, flacon ou emballage générique), sinon null. Une carte ou une vignette (produit seul) commence par « Photo produit » : sa vraie photo y est posée telle quelle. Une scène peut montrer le produit (sa vraie photo sert de modèle ; UN seul paquet, jamais plusieurs produits ni plusieurs paquets dans la même photo ; ne décris JAMAIS son emballage ni son étiquette, écris seulement « le sachet » + son nom : sa vraie photo jointe les donne ; product = null si la photo ne montre pas l'emballage), mais pas toutes : les autres photos d'ambiance montrent l'univers de la marque SANS le produit (ce qui l'entoure dans la vraie vie : les objets, les matières, le lieu et le moment où l'on s'en sert), toujours en accord avec le texte d'en face ; jamais deux fois la même scène. Une photo d'ouverture ou d'ambiance est une scène de vie MAGNIFIQUE qui remplit tout le cadre et fait ressentir l'émotion de l'angle (un lieu vrai, un moment de la journée, une lumière), jamais un produit posé sur un fond uni. ${NO_PEOPLE_PHOTO_RULE}
Réponse : uniquement le JSON demandé.`;

/** Faits de la marque donnés à chaque écriture (les mêmes pour toutes les sections). */
export function brandBrief(p: Project, j: Journey | null): string {
  const plan = j ? activityPlan(p.id, j) : null;
  const d = j ? angleDetails(j, plan?.company) : {};
  // Nom, prix et options de chaque produit (essai réel du 17 novembre 2026 : sans les options, la relecture a cru les
  // teintes inventées et les a fait remplacer par « [À compléter] »). Le prix s'écrit comme sur le site (« 420 € »).
  const products = (() => { try { return listProducts(p.id).map((x) => { const prix = x.data.price ?? x.variants.find((v) => v.price != null)?.price ?? null; const bits = [prix != null ? `${(prix / 100).toFixed(2).replace(/[.,]00$/, "").replace(".", ",")} €` : "", ...x.data.options.filter((o) => o.values.length).map((o) => `${o.name} au choix : ${o.values.join(", ")}`)].filter(Boolean); return `${x.data.title}${bits.length ? ` (${bits.join(" ; ")})` : ""}`; }); } catch { return []; } })();
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
    products.length ? `Produits du catalogue (noms, prix et options exacts : des faits confirmés, à écrire tels quels, jamais « [À compléter] » ni « à confirmer ») : ${products.join(" ; ")}.` : "",
    plan?.offer.facts.length ? `Faits confirmés par le client : ${plan.offer.facts.join(" ; ")}.` : "",
    d.toConfirm?.length ? `NON confirmés, à ne JAMAIS affirmer : ${d.toConfirm.join(" ; ")}.` : "",
    plan?.company.shipping ? `Livraison : ${plan.company.shipping}.` : "",
    plan?.company.returns ? `Retours : ${plan.company.returns}.` : "",
    ((c) => (c.length ? `Coordonnées : ${c.join(" · ")}.` : ""))([plan?.company.legalName, plan?.company.email, plan?.company.address, plan?.company.phone].filter((x): x is string => !!x)),
    plan?.company.addressDiscreet === true && plan.company.address ? "ADRESSE DISCRÈTE (demande du client) : son adresse ne s'écrit QUE dans les informations légales, jamais ailleurs sur le site (ni pied de page, ni contact, ni carte, ni itinéraire) ; ailleurs, on dit la zone où il se déplace." : "",
    // Entreprise de services : ce que le profil sait et que les pièces afficheront telles quelles (essai réel du 16
    // novembre 2026 : le rédacteur ne recevait ni les prestations, ni les horaires, ni la zone).
    ...(p.business === "services" ? ((sv) => [
      sv?.services?.length ? `Prestations (noms, durées et prix exacts ; il y en a ${sv.services.length}, toutes affichées dans les listes de prestations) : ${sv.services.map((x) => `${x.name}${x.duration?.trim() || x.price?.trim() ? ` (${[x.duration?.trim(), x.price?.trim()].filter(Boolean).join(", ")})` : ""}`).join(" ; ")}.` : "",
      sv?.hours?.trim() ? `Horaires (donnés par le client) : ${sv.hours.trim()}.` : "",
      sv?.area?.trim() ? `Zone desservie (donnée par le client) : ${sv.area.trim()}.` : "",
      sv?.phone?.trim() && sv.phone.trim() !== plan?.company.phone ? `Téléphone : ${sv.phone.trim()}.` : "",
    ])(p.services) : []),
    wording,
    clientNotesBrief(p.id),
  ].filter(Boolean).join("\n");
}

/** Un fait fort du client se dit en toutes lettres à deux endroits du site au plus (là où il décide). */
export const FACT_PLACES_MAX = 2;
export const SitePlanSchema = z.object({
  promesse: z.string().min(5).max(240),
  voix: z.string().min(5).max(400),
  menu: z.array(z.string().min(1).max(40)).max(8),
  sections: z.array(z.object({
    uid: z.string().max(12), message: z.string().min(3).max(320), titre: z.string().max(110).nullable(),
    bouton: z.string().max(40).nullable(), faits: z.array(z.string().max(160)).max(4),
  })).max(40),
  /** Référencement de chaque page (décision du propriétaire du 10 novembre 2026) : titre et description pour Google. */
  seo: z.array(z.object({ page: z.string().max(40), titre: z.string().min(5).max(80), description: z.string().min(20).max(200) })).max(20).default([]),
  /**
   * Répartition des faits forts (deuxième essai réel, 17 novembre 2026 : le même fait était redit dans presque toutes
   * les sections) : chaque fait fort du client, et les DEUX sections au plus qui le disent en toutes lettres. Lue avec
   * indulgence (un champ mal formé ne fait jamais perdre un appel payé) ; au-delà de deux sections, les deux premières.
   */
  repartition: z.array(z.object({ fait: z.string().min(2).max(200), sections: z.array(z.string().max(12)).max(8) })).max(40).optional().catch(undefined),
});
export type SitePlan = z.infer<typeof SitePlanSchema>;

export const SITE_PLAN_SYSTEM = `Tu es le concepteur-rédacteur en chef d'une petite marque. AVANT que chaque section de son site soit écrite, tu fais le PLAN DES TEXTES de tout le site, en français : la promesse, la voix, les libellés du menu principal, et pour CHAQUE section son message (différent de toutes les autres), son titre, son bouton (null si elle n'en a pas) et les faits qu'elle seule utilise.
${COPY_CRAFT}
- Rôle des pages : accueil = donner envie puis choisir ; boutique = choisir vite ; fiche produit = décider et rassurer ; panier = finir sans hésiter ; à propos = l'histoire vraie de la marque ; aide, contact, légal = répondre clairement, sans effet de style.
- Les faits forts sont RÉPARTIS entre les sections : jamais deux sections d'une même page avec le même fait. Aucun titre ne se répète sur le site.
- RÉPARTITION (repartition) : chaque fait fort du client (un prix ou sa façon de l'annoncer, une garantie, un délai, une façon de travailler, une zone, une livraison, une matière, un savoir-faire) n'est dit EN TOUTES LETTRES qu'à DEUX endroits du site au plus, là où il décide le visiteur ; ailleurs il est sous-entendu ou absent. Pour chaque fait fort, donne « fait » (le fait, en quelques mots) et « sections » (les uid des deux sections au plus qui le disent). Les « faits » d'une section ne reprennent que les faits qui lui sont attribués là. Tous les faits utiles du dossier ont leur place : chaque produit et chaque prestation de la liste est présenté quelque part, aucun n'est oublié.
- Chaque FORMULE de style (une image, une tournure, une fin de phrase qui sonne) n'apparaît qu'UNE fois sur tout le site : ne la donne jamais dans deux messages, deux titres ou deux boutons.
- RIEN d'inventé : seulement les faits fournis ; un fait inconnu n'est pas écrit.
- Titre null pour une section sans titre (en-tête, bandeau, pied de page) ; dans l'en-tête, le menu suit tes libellés.
- Le pied de page garde les coordonnées complètes de la marque (ses faits les citent).
- RÉFÉRENCEMENT (seo) : pour CHAQUE page (sa clé), un titre de 50 à 60 signes (ce que la page propose, avec les mots que ses clients tapent dans Google : le produit, sa matière ou sa saveur, et la ville pour un service local, puis le nom de la marque) et une description de 140 à 155 signes qui donne envie de cliquer (la promesse et un fait vrai), sans bourrage de mots, sans rien d'inventé ; jamais deux pages avec le même titre.
Réponse : uniquement le JSON demandé.`;

/** Descriptions des photos d'une section déjà écrite (montage en deux fois sans descriptions). */
export const PhotoBriefSchema = z.object({ photos: SectionWriteSchema.shape.photos });
/** Ligne du dossier donné à tous ceux qui écrivent, décrivent ou relisent les photos de ce montage. */
export const peopleBriefLine = (allowed: boolean) => allowed
  ? "PERSONNES DANS LES PHOTOS : autorisées pour ce client (photo de personne fournie par lui, ou son accord écrit)."
  : "PERSONNES DANS LES PHOTOS : NON autorisées (le dossier ne contient ni photo de personne fournie par le client, ni son accord écrit). Aucune personne, aucune main, aucun visage, aucune silhouette dans les photos à créer : un geste se montre par l'outil posé, l'objet en cours, la trace du travail.";
/**
 * Mots qui désignent une personne ou une partie du corps dans une description de photo (contrôle sans IA). Deuxième
 * essai réel (17 novembre 2026) : « un cycliste vu de dos » est passé. Une personne se dit aussi par son RÔLE ou son
 * ACTIVITÉ (cycliste, passant, piéton, conducteur, livreur, coureur, promeneur…) : ces mots comptent comme elle.
 */
const PEOPLE_ROLES = "cyclistes?|pi[ée]ton(?:ne)?s?|passant(?:e|s|es)?|conduct(?:eur|rice)s?|chauffeu(?:r|se)s?|livreu(?:r|se)s?|coursi(?:er|[èe]re)s?|coureu(?:r|se)s?|joggeu(?:r|se)s?|promeneu(?:r|se)s?|marcheu(?:r|se)s?|randonneu(?:r|se)s?|voyageu(?:r|se)s?|nageu(?:r|se)s?|baigneu(?:r|se)s?|skieu(?:r|se)s?|danseu(?:r|se)s?|joueu(?:r|se)s?|motard(?:e|s|es)?|athl[èe]tes?|serveu(?:r|se)s?|cuisini(?:er|[èe]re)s?|vendeu(?:r|se)s?|coiffeu(?:r|se)s?|ouvri(?:er|[èe]re)s?|technicien(?:ne)?s?|m[ée]canicien(?:ne)?s?|r[ée]parat(?:eur|rice)s?|employ[ée]e?s?|invit[ée]e?s?|convives?|touristes?|spectat(?:eur|rice)s?|habitant(?:e|s|es)?|foule|adolescent(?:e|s|es)?|ados?|seniors?|parents?|papas?|mamans?|grands?-(?:m[èe]res?|p[èe]res?|parents)|artisan(?:e|s|es)?|client(?:e|s|es)?|[ée]quipes?|visiteu(?:r|rs|se|ses)|mannequins?";
const PEOPLE_WORDS = new RegExp(`(?<!\\p{L})(personnes?|personnages?|gens|quelqu['’]une?|humaine?s?|hommes?|femmes?|enfants?|b[ée]b[ée]s?|filles?|gar[çc]ons?|adultes?|couples?|familles?|mains?|doigts?|paumes?|poings?|poignets?|ongles?|bras|avant-bras|coudes?|[ée]paules?|jambes?|genoux?|cuisses?|mollets?|chevilles?|pieds?|orteils?|visages?|sourires?|regards?|yeux|l[èe]vres|cheveux|peau|corps|torses?|dos|nuques?|silhouettes?|portraits?|${PEOPLE_ROLES})(?!\\p{L})`, "iu");
/** Ce qui écarte déjà la personne (« aucune main », « sans personne », « ni visage ») : jamais compté comme une personne demandée. */
const PEOPLE_DENIED = /(?<!\p{L})(?:aucune?|sans|ni|pas d['’]|pas de|jamais d['’]|jamais de)\s*(?:autres?\s+)?(?:(?:personnes?|mains?|visages?|silhouettes?|doigts?|corps|pr[ée]sence humaine|humaine?s?)(?:\s*(?:,|ni|et|ou)\s*(?:aucune?\s+|d['’]|de\s+)?)?)+/giu;
/** Le mot qui suit une négation (« aucun passant », « sans cycliste », « ni piéton ») est écarté lui aussi. */
const PEOPLE_DENIED_WORD = /(?<!\p{L})(?:aucune?|sans|ni|pas d['’]|pas de|jamais d['’]|jamais de)\s*(?:autres?\s+)?\p{L}+/giu;
/**
 * Un mot du corps qui désigne une partie d'OBJET n'est pas une personne : « le dos d'un fauteuil », « un pied de
 * table », « le bras du canapé » (le mot du corps suivi de « de » et d'un nom qui n'est pas une personne), et les
 * tournures figées (« main courante », « sac à dos », « fait main », « au pied du mur », « à pied »).
 */
const BODY_PART_OF = /(?<!\p{L})(dos|pieds?|bras|jambes?|mains?|coudes?|genoux?|[ée]paules?|corps|peau)\s+(?:d['’]une?\s+|du\s+|de la\s+|de l['’]\s*|des\s+|d['’]\s*|de\s+)(\p{L}+)/giu;
const PERSON_AFTER_DE = new RegExp(`^(?:mains?|bras|jambes?|pieds?|corps|visages?|personnes?|gens|quelqu|humaine?s?|hommes?|femmes?|enfants?|b[ée]b[ée]s?|filles?|gar[çc]ons?|adultes?|couples?|familles?|${PEOPLE_ROLES}|[a-zà-ÿ]+(?:eur|euse|rice|iste)s?)$`, "iu");
const BODY_IDIOMS = /(?<!\p{L})(?:mains? courantes?|sacs? à dos|(?:fait|faite|faits|faites|cousu|cousue|cousus|cousues|peint|peinte|peints|peintes|[ée]crit|[ée]crite|[ée]crits|[ée]crites|tiss[ée]e?s?|fabriqu[ée]e?s?) (?:à la )?main|à pied|au pied (?:du|de|des|d['’])|aux pieds (?:du|de|des|d['’])|sur pieds?|bras de (?:mer|lumi[èe]re|levier|rivi[èe]re)|corps de (?:ferme|b[âa]timent|logis|texte))(?!\p{L})/giu;
/** La description demande-t-elle une personne ou une partie du corps ? (sans IA) */
export const briefShowsPeople = (description: string) => PEOPLE_WORDS.test(description
  .replace(PEOPLE_DENIED, " ").replace(PEOPLE_DENIED_WORD, " ").replace(BODY_IDIOMS, " ")
  .replace(BODY_PART_OF, (m, _part: string, noun: string) => (PERSON_AFTER_DE.test(noun) ? m : " ")));
/** Phrase posée en tête d'une description qui demande une personne sans y être autorisée. */
export const NO_PEOPLE_PREFIX = "Aucune personne, aucune main, aucun visage, aucune silhouette dans l'image : tout geste décrit ci-dessous se montre SANS celui qui le fait, par l'outil posé, l'objet en cours, la trace du travail.";
/**
 * Description envoyée à la création d'une photo : si elle demande une personne ou une partie du corps alors que rien ne
 * l'autorise, elle n'est jamais envoyée telle quelle. force : pour la reprise après un refus du contrôle.
 */
export function briefWithoutPeople(description: string, allowed: boolean, force = false): string {
  if (allowed || description.startsWith(NO_PEOPLE_PREFIX) || !(force || briefShowsPeople(description))) return description;
  return `${NO_PEOPLE_PREFIX} ${description}`;
}
/** Le contrôle d'une image créée a-t-il refusé la photo pour une personne ou une main sans accord ? */
export const refusedForPeople = (problems: string[]) => problems.some((x) => /une personne ou une main apparaît sans accord/.test(x));
export const PHOTO_BRIEF_SYSTEM = `Tu es le directeur artistique d'une petite marque. Pour une section de son site dont les textes sont déjà écrits, tu décris chaque photo à créer, en français, en accord avec le texte d'en face et l'émotion de l'angle : find = la source exacte donnée ; description = UNE photo décrite en phrases complètes, dans l'ordre : type de photo, format, point de vue, cadrage ; surface et fond ; chaque objet à sa place (forme, matière, couleur, état) ; « La scène contient exactement N objets : … » ; ce qui est dégagé (le texte se pose sur la partie calme) ; lumière, ombres, ambiance ; « Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane. » ; ratio = format ; product = le nom exact d'un produit dès que la photo le montre, sinon null. Une carte ou une vignette (produit seul) commence par « Photo produit ». Une partie des scènes montre le vrai produit (UN seul paquet par photo, jamais plusieurs produits ; ne décris JAMAIS son emballage ni son étiquette, écris seulement « le sachet » + son nom : sa vraie photo jointe les donne ; product = null si la photo ne montre pas l'emballage), les autres l'univers de la marque SANS lui ; jamais deux fois la même scène. ${NO_PEOPLE_PHOTO_RULE} Réponse : uniquement le JSON demandé.`;

/** Référencement seul (pages déjà écrites) : titre et description de chaque page. */
export const SeoSchema = z.object({ seo: SitePlanSchema.shape.seo });
export const SEO_SYSTEM = `Tu es le rédacteur web d'une petite marque. Tu écris le RÉFÉRENCEMENT de pages de son site, en français : pour CHAQUE page (sa clé), un titre de 50 à 60 signes (ce que la page propose, avec les mots que ses clients tapent dans Google : le produit, sa matière ou sa saveur, la ville pour un service local, puis le nom de la marque) et une description de 140 à 155 signes qui donne envie de cliquer (la promesse et un fait vrai), sans bourrage de mots, sans rien d'inventé ; jamais deux pages avec le même titre. Réponse : uniquement le JSON demandé.`;

export function sitePlanPrompt(brief: string, sections: { uid: string; page: string; title: string; does: string; texts: string; intent?: string }[], o: { concept?: string; journeys?: { page: string; journey: string }[]; pages?: { key: string; label: string }[] } = {}): string {
  return [brief, "", o.concept ? `IDÉE DU SITE (conception) : ${o.concept}` : "", o.pages?.length ? `PAGES DU SITE (clé · nom), une entrée seo pour chacune : ${o.pages.map((x) => `${x.key} · ${x.label}`).join(" ; ")}` : "", ...(o.journeys ?? []).map((x) => `PARCOURS DU VISITEUR · ${x.page} : ${x.journey}`), "", "Sections du site, dans l'ordre (uid · page · section · ce qu'elle fait · conception · ses textes de démonstration, à NE PAS reprendre) :",
    ...sections.map((x) => `- ${x.uid} · ${x.page} · « ${x.title} » · ${x.does}${x.intent ? ` · CONCEPTION : ${x.intent}` : ""} · démo : ${x.texts}`)].filter((x, i) => x !== "" || i === 1).join("\n");
}

// ---------------------------------------------------------------- relecture de tous les textes du site

/**
 * Le directeur de création des textes (carte des spécialistes de SINA, lot 2, 13 novembre 2026). Jusque-là, chaque
 * section était écrite par un appel et personne ne relisait le site entier : une accroche pouvait revenir trois fois,
 * un titre donner un ordre au lecteur, un texte décrire sans rien faire ressentir. Celui qui écrit n'est jamais celui
 * qui juge : un appel séparé lit TOUS les textes écrits et désigne les sections à reprendre, avec des corrections
 * précises. Chaque section refusée est réécrite UNE fois ; ce qui reste est dit au client, jamais caché.
 */
export const COPY_REVIEW_CAP_MICRO = 250_000;
/** Sections reprises au plus après la relecture (les pires d'abord) : borne le coût annoncé. */
export const MAX_COPY_FIXES = 6;
export const CopyReviewSchema = z.object({
  sections: z.array(z.object({ uid: z.string().max(12), fixes: z.array(z.string().min(3).max(320)).min(1).max(5) })).max(20).default([]),
  site: z.string().max(600).default(""),
});
export type CopyReview = z.infer<typeof CopyReviewSchema>;

export const COPY_REVIEW_SYSTEM = `Tu es le directeur de création qui signe les textes d'un site avant qu'un client ne les voie. Tu n'écris rien toi-même : tu lis TOUT le site, d'un bout à l'autre, comme un visiteur, puis tu désignes les sections à reprendre et tu dis précisément quoi corriger.

Les règles d'écriture que les textes devaient suivre :
${COPY_CRAFT}

Ce que tu cherches, et seulement cela :
1. Un titre, un texte ou un bouton qui vend et qui DÉCRIT sans rien faire ressentir (aucune scène, aucun moment, aucune sensation), alors que l'angle du site est une émotion.
2. Une même formule, une même accroche ou un même fait fort qui revient dans plusieurs sections (cite les sections) : la première garde, les suivantes changent.
3. Un ordre donné au lecteur dans un titre (« Lis… », « Découvre… », « Plonge… »), un slogan creux, un jeu de mots forcé.
4. Un chiffre, un avis, un délai, une garantie, une certification ou un résultat qui ne figure pas dans le dossier du client : il doit disparaître.
5. Un tic d'écriture automatique (« ce n'est pas X, c'est Y », négations en rafale, deux-points dramatiques en série).
6. Un texte d'exemple resté en place : il parle d'une autre marque, d'un autre produit ou d'un autre métier que celui du client.

Sois sévère mais juste : une section correcte n'est pas citée, et tu ne cites pas une section pour une préférence de style. Au plus ${MAX_COPY_FIXES} sections, les plus gênantes d'abord.

Pour chaque section à reprendre : uid (recopié), fixes (1 à 5 corrections exécutables, chacune cite entre guillemets le texte fautif et dit ce qui ne va pas et ce qu'il faut à la place, sans écrire le nouveau texte à la place de la rédactrice). site : en une ou deux phrases, ce que le site fait bien et ce qui lui manque, dit simplement.

Réponds par un objet JSON, sans rien autour. Forme exacte : {"sections": [{"uid": "", "fixes": [""]}], "site": ""}`;

/** Les textes qu'un visiteur lit dans une section (titres, paragraphes, boutons, liens), sans le code. */
export function sectionReadableTexts(html: string): string[] {
  const bits = [...html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, " ").matchAll(/<(h[1-6]|p|li|button|a|summary|blockquote|figcaption|span|strong|em|label|td|th)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .map((m) => `${/^h[1-6]$/.test(m[1]) ? "TITRE" : m[1] === "button" || m[1] === "a" ? "BOUTON" : "TEXTE"} : ${decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()}`)
    .filter((x) => x.length > 12 && x.length < 420);
  return [...new Set(bits)].slice(0, 24);
}

/** Ce que le directeur de création reçoit : le dossier du client, puis chaque section avec ses textes, page par page. */
export function copyReviewPrompt(brief: string, sections: { uid: string; place: string; title: string; html: string }[], flags: Record<string, string[]> = {}, facts: Record<string, string[]> = {}, repeats: RepeatedPhrase[] = []): string {
  return [
    // Le contrôle des répétitions (sans IA) : la même suite de mots dans plus de REPEAT_SECTIONS_MAX sections.
    ...(repeats.length ? [`RÉPÉTITIONS RELEVÉES PAR LE STUDIO (la même suite de mots revient dans plus de ${REPEAT_SECTIONS_MAX} sections ; la section où elle décide le visiteur la garde, les autres la retirent ou disent autre chose : désigne celles à reprendre) :\n${repeats.map((r) => `- « ${r.phrase} » : ${r.sections.join(", ")}`).join("\n")}`, ""] : []),
    brief, "", `TEXTES DU SITE À RELIRE (${sections.length} sections, dans l'ordre des pages) :`,
    ...sections.map((x) => [`## ${x.uid} · ${x.place} · ${x.title}`, ...sectionReadableTexts(x.html),
      // Le gardien des faits (contrôle du Studio, sans IA) : ce que la fiche du client ne confirme pas.
      ...(flags[x.uid]?.length ? [`SIGNALÉ PAR LE STUDIO, à faire corriger si la fiche ne le confirme pas : ${flags[x.uid].join(" ; ")}`] : []),
      // Le contrôle des faits (sans IA) : un nombre qui contredit la liste affichée, un « À compléter » pour un fait connu, une adresse à ne pas montrer.
      ...(facts[x.uid]?.length ? [`CONTREDIT LE DOSSIER DU CLIENT (contrôle du Studio), à faire corriger : ${facts[x.uid].join(" ; ")}`] : [])].join("\n")),
  ].join("\n\n");
}

// ---------------------------------------------------------------- répétitions d'un bout à l'autre du site (sans IA)

/** Une suite de mots peut revenir dans ce nombre de sections au plus ; au-delà, elle est signalée. */
export const REPEAT_SECTIONS_MAX = 3;
export type RepeatedPhrase = { phrase: string; sections: string[] };
/** Mots vides : ils comptent dans une suite, mais une suite doit porter au moins deux mots pleins. */
const EMPTY_WORDS = new Set("a à au aux avec ce ces cet cette c ça chez comme d dans de des du elle elles en et est il ils j je l la le les leur leurs lui ma mais me mes moi mon n ne ni nos notre nous on ou où par pas plus pour qu que qui s sa sans se ses si son sur t ta te tes toi ton tu un une vos votre vous y être avoir es sont ont as ai tout tous toute toutes très bien aussi puis donc car quand ici là même dès entre vers sous après avant chaque rien autre autres fait faire faut peut cela ceci moins trop encore toujours jamais alors ainsi dont quel quelle depuis pendant quelques celui celle ceux deux trois sera seront était cette comment pourquoi parce simplement vraiment".split(" ").map((w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
const foldWord = (w: string) => w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/**
 * Les suites de 3 mots ou plus (dont deux mots pleins au moins) qui reviennent dans plus de REPEAT_SECTIONS_MAX
 * sections différentes du site. Deuxième essai réel (17 novembre 2026) : la relecture a vu le même fait et les mêmes
 * formules répétés « sans fin » ; le rédacteur de chaque section n'en savait rien. Sans IA.
 * Ne comptent pas : les libellés de boutons et de liens, le nom de la marque, les noms de produits et de prestations,
 * et tout ce que le Studio pose lui-même (téléphone, horaires, zone, adresse, prix : `ignore`, et tout mot à chiffre).
 */
export function repeatedPhrases(sections: { uid: string; label: string; html: string }[], o: { ignore?: (string | null | undefined)[]; /** Textes de faits du client (livraison, retours, horaires) : aucune suite de mots tirée d'eux n'est une répétition. */ facts?: (string | null | undefined)[]; /** Nombre de sections à partir duquel une suite est relevée (par défaut : plus de REPEAT_SECTIONS_MAX). */ atLeast?: number } = {}): RepeatedPhrase[] {
  const least = Math.max(2, o.atLeast ?? REPEAT_SECTIONS_MAX + 1);
  const ignore = (o.ignore ?? []).map((x) => (x ?? "").trim()).filter((x) => x.length >= 2).sort((a, b) => b.length - a.length);
  // Les suites de trois mots des faits du client : la condition de retour ou la livraison se redisent sur chaque fiche, à raison.
  const given = new Set<string>();
  for (const text of o.facts ?? []) { const w = (text ?? "").split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(foldWord); for (let i = 0; i + 3 <= w.length; i++) given.add(w.slice(i, i + 3).join(" ")); }
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cut = ignore.length ? new RegExp(ignore.map(esc).join("|"), "giu") : null;
  /** Suite de 3 mots (pliée) → les sections où elle se lit, et sa forme d'origine. */
  const grams = new Map<string, { uids: Set<string>; words: string[] }>();
  for (const x of sections) {
    // Titres et textes seulement : un bouton ou un lien (son libellé peut revenir) n'est pas lu.
    const pieces = sectionReadableTexts(x.html.replace(/<mark class="tn-manque">[\s\S]*?<\/mark>/g, " | ").replace(/<(a|button)\b[\s\S]*?<\/\1>/g, " | ")).filter((b) => !b.startsWith("BOUTON")).map((b) => b.replace(/^(?:TITRE|TEXTE) : /, ""));
    for (const piece of new Set(pieces)) {
      // Un nom ignoré, un chiffre ou une ponctuation forte coupe la suite.
      const runs = (cut ? piece.replace(cut, " | ") : piece).replace(/\[(?:À|A) compléter[^\]]*\]/gi, " | ").split(/[|.!?;:«»()\[\]…–—\n]|,\s/);
      for (const run of runs) {
        const words = run.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
        for (let i = 0; i + 3 <= words.length; i++) {
          const w = words.slice(i, i + 3), f = w.map(foldWord);
          if (f.some((k) => /\d/.test(k)) || f.filter((k) => k.length >= 4 && !EMPTY_WORDS.has(k)).length < 2) continue;
          const key = f.join(" ");
          if (given.has(key)) continue;
          const g = grams.get(key) ?? { uids: new Set<string>(), words: w };
          g.uids.add(x.uid); grams.set(key, g);
        }
      }
    }
  }
  const many = new Map([...grams].filter(([, g]) => g.uids.size >= least));
  const label = new Map(sections.map((x) => [x.uid, x.label] as const));
  // Les suites qui se chevauchent (« prix annoncé avant », « annoncé avant de ») se réunissent en une seule phrase.
  const used = new Set<string>(), out: RepeatedPhrase[] = [];
  const starts = [...many.keys()].filter((k) => ![...many.keys()].some((q) => q !== k && q.split(" ").slice(1).join(" ") === k.split(" ").slice(0, 2).join(" ") && [...many.get(q)!.uids].filter((u) => many.get(k)!.uids.has(u)).length >= least));
  for (const k of [...starts, ...many.keys()]) {
    if (used.has(k)) continue;
    used.add(k);
    let cur = k, uids = new Set(many.get(k)!.uids);
    const words = [...many.get(k)!.words];
    for (;;) {
      const tail = cur.split(" ").slice(1).join(" ");
      const next = [...many.keys()].find((q) => !used.has(q) && q.split(" ").slice(0, 2).join(" ") === tail && [...many.get(q)!.uids].filter((u) => uids.has(u)).length >= least);
      if (!next) break;
      used.add(next); words.push(many.get(next)!.words[2]); uids = new Set([...many.get(next)!.uids].filter((u) => uids.has(u))); cur = next;
    }
    // « l esprit léger » se redit « l'esprit léger ».
    out.push({ phrase: words.map((w, i) => (i < words.length - 1 && /^(?:[ldjnstcm]|qu)$/i.test(w) ? `${w}'` : `${w} `)).join("").trim(), sections: [...uids].map((u) => `${u} (${label.get(u) ?? u})`) });
  }
  return out.sort((a, b) => b.sections.length - a.sections.length || b.phrase.length - a.phrase.length).slice(0, 8);
}

/**
 * Qui garde une formule répétée, qui la retire (sans IA) : les REPEAT_SECTIONS_MAX premières sections du site où elle se
 * lit la gardent, les suivantes la retirent. Rend, par section à reprendre (uid), les formules exactes à ne plus employer
 * et les endroits où elles restent ; les sections qui en ont le plus d'abord.
 */
export function repeatDrops(repeats: RepeatedPhrase[]): { uid: string; drops: { phrase: string; kept: string[] }[] }[] {
  const by = new Map<string, { phrase: string; kept: string[] }[]>();
  for (const r of repeats) {
    const all = r.sections.map((x) => ({ uid: x.split(" ")[0], label: x.replace(/^\S+ \((.*)\)$/, "$1") }));
    const kept = all.slice(0, REPEAT_SECTIONS_MAX).map((x) => x.label);
    for (const x of all.slice(REPEAT_SECTIONS_MAX)) by.set(x.uid, [...(by.get(x.uid) ?? []), { phrase: r.phrase, kept }]);
  }
  return [...by].map(([uid, drops]) => ({ uid, drops })).sort((a, b) => b.drops.length - a.drops.length);
}
/** La consigne de reprise d'une section pour ses répétitions : la liste exacte, et où chaque formule reste permise. */
export const repeatFixLines = (drops: { phrase: string; kept: string[] }[]): string[] => drops.map((d) => `La formule « ${d.phrase} » revient dans trop de sections du site : ici, ne l'emploie plus (ni elle, ni ses mots dans le même ordre) et dis autre chose, autrement. Elle reste seulement dans : ${d.kept.join(" ; ")}.`);
/**
 * Le budget des reprises partagé (jamais plus de `max`) : les sections à reprendre pour répétition d'abord, mais pas plus
 * de la moitié quand la relecture a aussi ses sections (une faute de fait passe avant une formule redite) ; les places
 * libres d'un côté servent à l'autre. Une section citée des deux côtés n'est reprise qu'une fois, avec les deux listes.
 */
export function planCopyFixes(review: { uid: string; fixes: string[] }[], drops: ReturnType<typeof repeatDrops>, max = MAX_COPY_FIXES): { uid: string; fixes: string[]; repeats: boolean }[] {
  const mine = new Map(drops.map((d) => [d.uid, repeatFixLines(d.drops)] as const));
  const both = (uid: string, fixes: string[]) => ({ uid, fixes: [...(mine.get(uid) ?? []), ...fixes].slice(0, 8), repeats: mine.has(uid) });
  const forRepeats = drops.filter((d) => !review.some((r) => r.uid === d.uid));
  const quota = review.length ? Math.max(Math.ceil(max / 2), max - review.length) : max;
  const first = forRepeats.slice(0, Math.min(quota, max)).map((d) => both(d.uid, []));
  const rest = review.slice(0, max - first.length).map((r) => both(r.uid, r.fixes));
  return [...first, ...rest];
}

/**
 * Le gardien des faits des textes du site (carte des spécialistes : « ce qui vaut pour toutes les étapes ») : promesses,
 * chiffres et prix d'une section que la fiche du client ne confirme pas, relevés sans IA par le contrôle des promesses
 * du Studio. Un « [À compléter : …] » n'est jamais une promesse.
 */
export function unconfirmedClaims(p: Project, html: string, known: KnownFacts = knownFacts(p)): string[] {
  // Le total d'un panier d'essai est calculé par le Studio (somme de prix du catalogue) : ce n'est pas un prix écrit.
  const texts = sectionReadableTexts(html.replace(/<span class="tn-prix-t">[\s\S]*?<\/span>/g, " ")).map((x) => x.replace(/\[(?:À|A) compléter[^\]]*\]/gi, " "));
  try { return [...new Set(lintClaims(texts, p, known).map((c) => `« ${c.term} » (${c.label})`))].slice(0, 4); } catch { return []; }
}
/**
 * Ce que le Studio sait de vrai en dehors de la fiche du projet, pour le contrôle des promesses : le catalogue (noms,
 * descriptions, options, prix de chaque produit et de chaque version, en euros) et les notes du client prises par SINA.
 * Un prix du catalogue ou un fait dit par le client n'est jamais « à confirmer ».
 */
export type KnownFacts = { facts: string[]; prices: number[] };
export function knownFacts(p: Pick<Project, "id">): KnownFacts {
  const facts: string[] = [], prices: number[] = [];
  try {
    for (const x of listProducts(p.id)) {
      facts.push(x.data.title, x.data.description_html.replace(/<[^>]+>/g, " "), x.data.productType, ...x.data.options.flatMap((o) => [o.name, ...o.values]));
      for (const c of [x.data.price, x.data.compareAt, ...x.variants.flatMap((v) => [v.price, v.compareAt])]) if (typeof c === "number") prices.push(c / 100);
    }
  } catch { /* catalogue indisponible : seuls les faits de la fiche comptent */ }
  try { for (const n of clientNotes(p.id)) facts.push(`${n.title} ${n.value}`); } catch { /* notes indisponibles */ }
  return { facts: facts.map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean), prices: [...new Set(prices)] };
}

/** Textes visibles d'une section (titres, boutons, liens), pour montrer sa forme au plan sans tout son HTML. */
/** Plafond de la relecture des descriptions de photos par la directrice artistique (un appel pour tout le site). */
export const PHOTO_REVIEW_CAP_MICRO = 200_000;
/** Sections dont les photos sont redécrites après sa relecture, au plus ; le reste est dit dans le compte rendu. */
export const MAX_PHOTO_FIXES = 5;
/** En dessous, pas de relecture : une photo seule ne peut ni se répéter ni déséquilibrer le site. */
export const MIN_PHOTOS_TO_REVIEW = 2;
/**
 * Ce que le fournisseur reçoit comme format (sortie structurée) : la même forme, SANS longueur maximale. Essai réel du
 * 16 novembre 2026 : une seule correction de plus de 400 signes faisait refuser toute la réponse (« too_big »), et
 * aucune description n'était relue.
 */
export const PhotoReviewWireSchema = z.object({
  photos: z.array(z.object({ uid: z.string(), find: z.string(), fixes: z.array(z.string()) })),
  site: z.string(),
});
const PhotoReviewEntry = z.object({ uid: z.string().min(1).max(40), find: z.string().min(1).max(200), fixes: z.array(z.string().min(8)).min(1) });
/**
 * Lecture tolérante de la relecture des photos : un texte trop long est coupé (jamais refusé), une correction trop
 * courte est écartée, et une entrée mal formée est ignorée seule : elle ne fait plus tomber toute la relecture.
 */
export const PhotoReviewSchema = z.object({
  photos: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown())).transform((list) => list.flatMap((x) => {
    const o = x && typeof x === "object" ? x as Record<string, unknown> : {};
    const r = PhotoReviewEntry.safeParse({ uid: typeof o.uid === "string" ? o.uid.trim() : o.uid, find: typeof o.find === "string" ? o.find.trim() : o.find,
      fixes: Array.isArray(o.fixes) ? o.fixes.filter((f): f is string => typeof f === "string").map((f) => f.trim()).filter((f) => f.length >= 8) : o.fixes });
    return r.success ? [{ uid: r.data.uid, find: r.data.find, fixes: r.data.fixes.slice(0, 4).map((f) => f.slice(0, 400)) }] : [];
  }).slice(0, 30)),
  site: z.preprocess((v) => (typeof v === "string" ? v.slice(0, 600) : ""), z.string()),
});
/**
 * La directrice artistique des photos (carte des spécialistes, lot 2) : le rédacteur décrit les photos section par
 * section, sans voir les autres ; elle lit TOUTES les descriptions du site, avec le texte d'en face, AVANT qu'une seule
 * photo soit payée. Elle ne décrit rien elle-même (celle qui juge n'est pas celle qui fait).
 */
export const PHOTO_REVIEW_SYSTEM = `Tu es la directrice artistique qui valide les photos d'un site AVANT qu'elles ne soient créées : chaque photo se paie, une description ratée aussi. Tu ne décris rien toi-même : tu lis TOUTES les descriptions de photos du site, chacune avec le texte qu'elle accompagne, comme si tu regardais la planche-contact d'une seule séance photo, puis tu désignes les descriptions à reprendre et tu dis précisément quoi corriger.

Ce que tu cherches, dans cet ordre :
1. LA MÊME SCÈNE DEUX FOIS, dans une page ou d'une page à l'autre : même décor, mêmes objets, même cadrage, même moment. Tu gardes la meilleure et tu fais changer l'autre (dis vers quelle scène : un autre lieu, un autre moment, un autre point de vue).
2. UNE PHOTO QUI NE VA PAS AVEC SON TEXTE : elle ne montre pas ce que le texte d'en face raconte, ou elle ne fait pas ressentir l'émotion de l'angle.
3. UNE PHOTO PLATE : un produit seul sur fond uni pour une ouverture ou une ambiance, un objet posé sans vie, une scène sans lumière ni profondeur, un objet vague (« quelques accessoires », « des éléments de décor »).
4. L'ÉQUILIBRE DU SITE : une partie des scènes met en scène le vrai produit, les autres montrent l'univers de la marque SANS lui (les objets, les matières, le lieu, le moment). Le produit dans toutes les scènes, ou dans aucune, est un défaut : dis lesquelles changer.
5. UNE DESCRIPTION QUI NE SUIT PAS LA MÉTHODE : elle ne dit pas le type de photo et le cadrage, la place exacte de chaque objet, « La scène contient exactement N objets », la partie calme où le texte se pose, la lumière ; elle se contredit ; elle montre plusieurs paquets du produit ; elle décrit l'emballage ou l'étiquette du produit (la vraie photo jointe les donne).
6. CE QUI EST INTERDIT : une personne quand la fiche ne l'autorise pas, un texte, un chiffre, un logo ou un nom de marque demandé dans l'image, une photo que seul le client peut fournir (ses clients, son équipe, ses vrais chantiers) inventée à sa place.
7. UNE SÉANCE QUI SE DISPERSE : lumière, décors, matières et couleurs qui changent d'une photo à l'autre sans raison. La direction artistique donnée se tient d'un bout à l'autre.

Sévère mais juste : une description qui fera une belle photo, à sa place, tu la laisses. Ne désigne que ce qu'un bon directeur artistique refuserait de payer. Aucune correction de goût personnel, aucune qui demande un fait absent de la fiche.

Réponse : uniquement le JSON demandé.
- photos : la liste des descriptions à reprendre (vide si tout est bon), chacune avec uid (l'identifiant exact de sa section), find (la source exacte de la photo) et fixes (1 à 4 corrections précises, chacune dit ce qui ne va pas et vers quoi aller).
- site : ton avis sur la séance entière en deux phrases (ce qui tient, ce qui manque).`;

/** Demande de relecture des photos : la direction artistique, puis chaque section avec son texte et ses descriptions. */
export function photoReviewPrompt(brief: string, direction: string | null, sections: { uid: string; place: string; title: string; html: string; photos: { find: string; description: string; ratio: string; product: string | null }[] }[]): string {
  const n = sections.reduce((k, x) => k + x.photos.length, 0);
  return [brief, "", direction ? `DIRECTION ARTISTIQUE DE LA MARQUE (à tenir sur toutes les photos) : ${direction}` : "",
    `PHOTOS DU SITE À RELIRE (${n} photos dans ${sections.length} sections, dans l'ordre des pages) :`,
    ...sections.map((x) => [`## ${x.uid} · ${x.place} · ${x.title}`,
      `TEXTE D'EN FACE : ${sectionReadableTexts(x.html).slice(0, 6).join(" / ").slice(0, 700) || "(aucun texte)"}`,
      ...x.photos.map((ph) => `- ${ph.find} (format ${ph.ratio}${ph.product ? `, produit « ${ph.product} »` : ", sans produit"}) : ${ph.description}`)].join("\n")),
  ].filter(Boolean).join("\n\n");
}

/**
 * Direction artistique écrite pour la planche de marque que le client a choisie (images de planche) : reprise par les
 * photos de son site, pour que la planche et le site aient l'air d'une même marque. Identité mélangée ou retouchée :
 * la direction de la planche n'est plus sûre d'être vraie, elle n'est pas reprise.
 */
export function boardLook(j: Journey | null): string | null {
  const c = j?.identityChoice;
  if (!c || Object.keys(c.mix ?? {}).length || Object.keys(c.edits ?? {}).length) return null;
  const look = (j!.identities?.list.find((x) => x.key === c.key) as { board?: { images?: { look?: string } } } | undefined)?.board?.images?.look;
  return look?.trim() ? look.trim().slice(0, 700) : null;
}

/** Les faits d'un produit du catalogue, pour le rédacteur de SA fiche : nom, prix, options, familles, description. */
export function productFacts(projectId: string, handle: string | null | undefined): string | null {
  if (!handle) return null;
  const x = (() => { try { return listProducts(projectId).find((q) => q.handle === handle); } catch { return undefined; } })();
  if (!x) return null;
  const d = x.data, price = d.price ?? x.variants.find((v) => v.price != null)?.price ?? null;
  return [`Produit : « ${d.title} »`, price != null ? `prix : ${(price / 100).toFixed(2).replace(/[.,]00$/, "").replace(".", ",")} €` : "prix : non donné (écris « [À compléter : prix] »)",
    d.options.length ? `options au choix (faits du catalogue ; le bloc d'achat pose lui-même ce choix : n'écris pas de ligne d'option qui le redit, et jamais « [À compléter] » pour elles) : ${d.options.map((o) => `${o.name} (${o.values.join(", ")})`).join(" ; ")}` : "", d.categories.length ? `familles : ${d.categories.join(", ")}` : "",
    d.description_html ? `description donnée par le client : ${d.description_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 900)}` : "aucune description donnée : ne décris que ce que ses photos et son nom permettent, le reste s'écrit « [À compléter : …] »"].filter(Boolean).join(" · ");
}

export function sectionSkeleton(html: string): string {
  const bits = [...html.matchAll(/<(h[1-4]|button|a|summary)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => `${m[1]}:${m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`).filter((x) => x.length > 3 && x.length < 90);
  return [...new Set(bits)].slice(0, 14).join(" | ") || "(aucun titre)";
}

/** Les faits forts du plan : ceux que CETTE section dit en toutes lettres, et ceux qui se disent ailleurs. */
export function factPlaces(plan: SitePlan, uid: string): { mine: string[]; elsewhere: string[] } {
  const list = (plan.repartition ?? []).map((x) => ({ fait: x.fait, sections: x.sections.slice(0, FACT_PLACES_MAX) })).filter((x) => x.sections.length);
  return { mine: list.filter((x) => x.sections.includes(uid)).map((x) => x.fait), elsewhere: list.filter((x) => !x.sections.includes(uid)).map((x) => x.fait).slice(0, 20) };
}

export function sectionWritePrompt(brief: string, place: string, title: string, does: string, html: string, plan?: { site: SitePlan; uid: string }, design?: { intent?: string; journey?: string; pages?: string; /** Fiche d'UN produit du catalogue : ses faits. */ product?: string | null; /** Ce que le Studio posera lui-même dans la section (faits exacts). */ shown?: string; /** Formules déjà employées dans REPEAT_SECTIONS_MAX sections déjà écrites (relevé sans IA) : à ne plus employer. */ deja?: string[] }): string {
  const mine = plan?.site.sections.find((x) => x.uid === plan.uid);
  const others = plan ? plan.site.sections.filter((x) => x.uid !== plan.uid && x.titre).map((x) => `« ${x.titre} »`) : [];
  const planText = plan ? [
    "PLAN DES TEXTES DU SITE (à suivre) :",
    `Promesse : ${plan.site.promesse}`, `Voix : ${plan.site.voix}`, plan.site.menu.length ? `Menu principal : ${plan.site.menu.join(" · ")}` : "",
    mine ? `CETTE section : message : ${mine.message}${mine.titre ? ` ; titre : « ${mine.titre} »` : ""}${mine.bouton ? ` ; bouton : « ${mine.bouton} »` : ""} ; faits à utiliser ici (et aucun autre chiffre) : ${mine.faits.length ? mine.faits.join(" ; ") : "aucun"}.` : "",
    others.length ? `Titres des autres sections (ne les répète pas) : ${others.join(", ")}.` : "",
    ...(plan ? ((r) => [
      r.mine.length ? `Faits forts que CETTE section dit en toutes lettres (c'est l'un des ${FACT_PLACES_MAX} endroits du site où ils se disent) : ${r.mine.join(" ; ")}.` : "",
      r.elsewhere.length ? `Faits forts DITS AILLEURS sur le site (ici, ne les redis PAS en toutes lettres : sous-entends-les ou tais-les) : ${r.elsewhere.join(" ; ")}.` : "",
    ])(factPlaces(plan.site, plan.uid)) : []),
    "Une formule de style (une image, une tournure, une fin de phrase qui sonne) ne sert qu'UNE fois sur tout le site : n'en reprends aucune d'un titre ou d'un message d'une autre section.",
  ].filter(Boolean).join("\n") : "";
  const designText = [design?.pages ? `PAGES DU SITE (clé : nom) : ${design.pages}` : "", design?.product ? `CETTE PAGE EST LA FICHE D'UN SEUL PRODUIT : écris pour LUI, avec SES faits, jamais ceux d'un autre produit du catalogue. ${design.product}` : "", design?.journey ? `PARCOURS DU VISITEUR SUR CETTE PAGE : ${design.journey}` : "", design?.intent ? `CONCEPTION DE CETTE SECTION : ${design.intent}` : "", design?.shown ?? "",
    design?.deja?.length ? `FORMULES DÉJÀ EMPLOYÉES DANS ${REPEAT_SECTIONS_MAX} SECTIONS DU SITE (relevé du Studio ; ne les emploie plus ici, ni elles ni leurs mots dans le même ordre : dis autre chose, autrement) : ${design.deja.map((x) => `« ${x} »`).join(" ; ")}.` : ""].filter(Boolean).join("\n");
  return [brief, "", ...(planText ? [planText, ""] : []), ...(designText ? [designText, ""] : []), `Section à adapter : « ${title} » (${place}). Ce qu'elle fait : ${does}`, "HTML actuel de la section (textes de démonstration à remplacer) :", html].join("\n");
}

/** Applique les remplacements d'une écriture : ceux qui ne s'appliquent pas sont comptés, jamais devinés. */
/** Entités HTML courantes décodées (comparaison du texte d'un lien avec la section). */
const decodeEntities = (v: string) => v.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|laquo|raquo|eacute|egrave|agrave|ccedil));/gi, (_m, d, h, n) => d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç" } as Record<string, string>)[n.toLowerCase()]);

export function applyWrite(html: string, w: SectionWrite): { html: string; failed: number; applied: number } {
  let out = html, failed = 0, applied = 0;
  for (const e of w.edits) {
    // Même filtre que custom.edit, et sur le résultat : aucun code ajouté à la section, même en deux remplacements.
    try { const next = replaceOnce(out, e.find, e.replace); if (riskCount(next) > riskCount(out)) { failed++; continue; } out = next; applied++; } catch { failed++; }
  }
  return { html: out, failed, applied };
}

/**
 * Emplacements de photos encore d'exemple dans le thème (une photo par emplacement, dédoublonnés par section), classés
 * (audit du 10 novembre 2026, « le nombre exact ») : « produit » (cartes et bloc d'achat : la vraie photo du produit
 * quand il en a une), « a-fournir » (impossible à inventer : seule une vraie photo du client va là), « ambiance » (photo
 * que SINA peut créer).
 */
/**
 * Photo qui montre le produit SEUL (carte, bloc d'achat, vignette d'un lot, d'un panier, de la recherche, du bouton
 * d'achat) : sa vraie photo y est posée telle quelle, jamais recréée (essai Éclat de thé du 10 novembre 2026 : des
 * vignettes de « Complète ta commande » ou de la recherche allaient être recréées en photos payantes).
 */
const THUMB_ROLES = new Set(["lot", "panier", "recherche", "conversion"]);
export const productSlotSection = (l: Pick<LibSection, "role" | "title">) => isProductPhotoSection(l) || THUMB_ROLES.has(l.role);
// Vignettes de produits dans une section de scène (la liste de la « Scène achetable ») : la vraie photo, si la description
// le dit. Partout ailleurs (ouverture, avant / après, inscription…), jamais la photo du produit telle quelle : une scène
// est créée avec elle en modèle (essai réel du 10 novembre 2026 : ouverture et avant / après remplis par le sachet seul).
// Les « stories » (un rond par produit, le produit à ajouter en bas) mettent chaque produit en avant : sa vraie photo y va.
const THUMB_TITLES = new Set(["Scène achetable", "Histoires façon « stories »"]);
/** La photo montre-t-elle l'emballage du produit ? Sinon (feuilles en gros plan, tasse…), aucune photo du produit n'est jointe. */
export const showsPackaging = (description: string) => /(?<!\p{L})(sachets?|paquets?|emballages?|pots?|flacons?|bo[iî]tes?|bocal|bocaux|coffrets?|tubes?|bouteilles?|étuis?|boîtiers?)(?!\p{L})/iu.test(description);
/**
 * Description utilisable : une seule photo du produit est jointe, donc jamais plusieurs paquets dans la scène (relecture
 * du 10 novembre 2026 : « trois sachets dans un pot et un quatrième devant », les autres auraient été inventés). Une
 * description qui en demande plusieurs est réécrite avant la création.
 */
export const briefUsable = (description: string) => !/(?<!\p{L})(deux|trois|quatre|cinq|six|sept|huit|plusieurs|\d+)\s+(sachets|paquets|pots|flacons|bo[iî]tes|bocaux|coffrets|tubes|bouteilles)(?!\p{L})|(?<!\p{L})(quatrième|troisième|deuxième|second|seconde|autre)\s+(sachet|paquet|pot|flacon|bo[iî]te)(?!\p{L})/iu.test(description);
export const showsProductAlone = (l: Pick<LibSection, "role" | "title">, description: string) => productSlotSection(l) || (THUMB_TITLES.has(l.title) && /^\s*photo(?:graphie)? (?:de )?produit\b/i.test(description));
/** Section où une photo de produit posée à la place d'une scène redevient une photo à créer (toutes ses photos sont des scènes). */
export const healable = (l: Pick<LibSection, "role" | "title"> | null | undefined, briefs: { description: string }[]) => !!l && briefs.length > 0 && !briefs.some((b) => showsProductAlone(l, b.description));
/** Nombre de photos de produits mal placées dans une section (remplacées par une scène au prochain montage, comptées au devis). */
export function misplacedProductPhotos(l: Pick<LibSection, "role" | "title"> | null | undefined, briefs: { find: string; description: string }[], html: string, productIds: Set<string>): number {
  if (!healable(l, briefs)) return 0;
  const missing = briefs.filter((b) => !html.includes(b.find)).length;
  const prod = [...html.matchAll(/\/api\/files\/([\w-]+)/g)].filter((m) => productIds.has(m[1])).length;
  return Math.min(missing, prod);
}
/** Photos des fiches produits du projet : elles restent sur les emplacements produit, jamais posées en photo d'ambiance. */
export function productImageIds(projectId: string): Set<string> {
  try { return new Set(listProducts(projectId).flatMap((x) => x.data.images.map((i) => i.assetId).filter((id): id is string => !!id))); } catch { return new Set(); }
}

export type PhotoSlot = { uid: string; place: string; section: string; file: string; kind: "produit" | "a-fournir" | "ambiance"; authentic?: string };
export function photoSlots(t: CustomTheme, site: { business?: "products" | "services"; productPhotos?: boolean; productIds?: Set<string> } = {}): PhotoSlot[] {
  const business = site.business ?? "products";
  // Les cartes (plan d'adresse) ne sont jamais des photos à créer : la vraie carte s'ouvre à l'adresse du client.
  return allSections(t).flatMap((x) => {
    const l = libSection(x.s.id), authentic = authenticSection(x.s.id, business);
    const kind: PhotoSlot["kind"] = authentic ? "a-fournir" : l && site.productPhotos && productSlotSection(l) ? "produit" : "ambiance";
    // Photo d'une fiche produit posée par erreur dans une section de scènes : à recréer en scène (comptée au devis).
    const misplaced = site.productIds && l && x.s.photoBriefs?.length && !x.s.photoBriefs.some((b) => showsProductAlone(l, b.description))
      ? [...sectionHtml(x.s).matchAll(/\/api\/files\/([\w-]+)/g)].filter((m) => site.productIds!.has(m[1])).map((m, i) => `fichier:${m[1]}:${i}`) : [];
    return [...[...new Set([...sectionHtml(x.s).matchAll(/photos\/([\w-]+\.(?:webp|png|jpg))/g)].map((m) => m[1]).filter((f) => !/^(carte|map|plan)-/.test(f)))].map((file) => ({ file, kind })),
      ...misplaced.map((file) => ({ file, kind: "ambiance" as const }))]
      .map(({ file, kind: k }) => ({ uid: x.s.uid, place: x.page?.label ?? x.place, section: l?.title ?? x.s.id, file, kind: k, ...(authentic ? { authentic } : {}) }));
  });
}
/** Photos que le client peut envoyer ou que SINA peut créer : les photos d'ambiance (le reste a sa propre source). */
export const examplePhotoCount = (t: CustomTheme, site: { business?: "products" | "services"; productPhotos?: boolean; productIds?: Set<string> } = {}): number => photoSlots(t, site).filter((x) => x.kind === "ambiance").length;

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
/** Lot 4 : où le titre se pose sur la photo d'ouverture, selon la façon dont l'ouverture est bâtie (grande photo pleine, titre dessus). */
const OPENING_PLACEMENT: Record<string, string> = {
  "dans-la-photo": "Le titre se pose dans le HAUT de cette photo : le tiers haut reste calme (ciel, mur, flou, lumière douce) ; le sujet principal, entier, est dans la moitié basse.",
  "titre-centre": "Le titre, la phrase et le bouton se posent AU CENTRE de cette photo : le centre reste calme et un peu plus sombre ou flou ; le sujet principal, entier, est sur un côté ou dans le bas, jamais sous le texte.",
  "titre-en-bas": "Le titre et le bouton se posent EN BAS À GAUCHE de cette photo, sur une ombre qui monte du bas : le sujet principal, entier, est dans la moitié haute, plutôt à droite ; le bas gauche reste calme.",
  "titre-massif": "Un titre énorme couvre toute la largeur du BAS de cette photo : le sujet principal, entier, est dans les deux tiers hauts ; le tiers bas reste calme (sol, table, ombre).",
  "bandeau": "Une bande pleine couvre le tiers BAS de cette photo : le sujet principal, entier, tient dans les deux tiers hauts ; rien d'important dans le tiers bas.",
};
export function textPlacementLine(html: string, find: string, does: string, construction?: string | null): string {
  const esc = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`background-image:\\s*url\\(['"]?${esc}`).test(html)) return "";
  if (construction && OPENING_PLACEMENT[construction] && /class="tn tn-ouverture[ "]/.test(html)) return `${OPENING_PLACEMENT[construction]} Sur téléphone la photo est en hauteur, sur ordinateur en largeur : le sujet reste entier dans les deux cadrages.`;
  const side = /(^|[.;:]\s*)à gauche\s*:/i.test(does) ? "gauche" : /(^|[.;:]\s*)à droite\s*:/i.test(does) ? "droite" : null;
  if (!side) return "Le texte de la section est posé PAR-DESSUS cette photo : garde une zone calme (flou, ombre douce, mur, ciel, nappe) là où il se pose, le sujet principal autour, jamais sous le texte.";
  const other = side === "gauche" ? "droite" : "gauche";
  return `Le texte de la section est posé PAR-DESSUS la partie ${side} de cette photo : le sujet principal, et tout ce qui attire l'œil, est dans le tiers ${other} de l'image, entier ; la partie ${side} reste calme (flou, ombre douce, mur, ciel, nappe) pour que le texte se lise, tout en appartenant à la scène. Jamais de sujet sous le texte, jamais un côté ${other} vide.`;
}

/** Direction artistique d'une photo du site : l'univers de la famille + l'émotion de l'angle choisi + les couleurs. */
export function siteArtDirection(p: Project, fu: FamilyUniverse | null, j: Journey | null): string | null {
  if (!fu) return null;
  const d = j ? angleDetails(j) : {}, look = boardLook(j);
  return `${fu.style} ; ${fu.idea} ; lumière : ${fu.light} ; décors : ${fu.setting} ; composition : ${fu.composition.join(" ; ")} ; émotion à faire ressentir : ${d.emotion ?? fu.emotion}${d.story ? ` (l'histoire de la marque : ${d.story})` : ""} ; couleurs de la marque : ${[p.brand?.palette?.dark, p.brand?.palette?.primary, p.brand?.palette?.accent].filter(Boolean).join(", ")}.${look ? ` Direction artistique de sa planche de marque (la même marque, la même séance) : ${look}` : ""}`;
}

/** Direction artistique des photos d'un site conçu dans une famille du Studio : sa façon de photographier, l'émotion de l'angle, la planche. */
export function familleArtDirection(p: Project, famille: string | null | undefined, j: Journey | null): string | null {
  const line = famillePhotoLine(famille);
  if (!line) return null;
  const d = j ? angleDetails(j) : {}, look = boardLook(j);
  return `${line}${d.emotion ? ` Émotion à faire ressentir : ${d.emotion}${d.story ? ` (l'histoire de la marque : ${d.story})` : ""}.` : ""} Couleurs de la marque : ${[p.brand?.palette?.dark, p.brand?.palette?.primary, p.brand?.palette?.accent].filter(Boolean).join(", ")}.${look ? ` Direction artistique de sa planche de marque (la même marque, la même séance) : ${look}` : ""}`;
}

/**
 * Photos envoyées par le client (Fichiers du projet), dans l'ordre d'arrivée, utilisables sur son site : jamais son logo
 * (ni ses déclinaisons), jamais une image marquée comme inspiration, jamais une image trop petite pour une section
 * (moins de 500 px de côté : icône, capture réduite). Audit du 10 novembre 2026 : le logo envoyé à l'étape 0 comptait
 * comme une photo du site.
 */
export function clientImages(projectId: string): { id: string; name: string }[] {
  const productIds = productImageIds(projectId);
  return all<{ id: string; name: string; meta: string | null }>(
    "SELECT id, name, meta FROM assets WHERE project_id=? AND deleted_at IS NULL AND kind='image' AND origin='upload' AND COALESCE(role,'') NOT LIKE 'logo%' AND (width IS NULL OR width>=500) AND (height IS NULL OR height>=500) ORDER BY created_at",
    projectId,
  ).filter((a) => { try { return !JSON.parse(a.meta ?? "{}").inspiration; } catch { return true; } })
    // Photos de ses fiches produits : elles vont aux emplacements produit et servent de modèle aux scènes, jamais en ambiance.
    .filter((a) => !productIds.has(a.id)).map(({ id, name }) => ({ id, name }));
}

/** Photos que SINA créera, selon le choix du client. */
export function photosToCreate(needed: number, mode: ImagesMode, clientCount: number): number {
  return mode === "client" ? 0 : mode === "mix" ? Math.max(0, needed - clientCount) : needed;
}

/** Titres d'accroche de la bibliothèque (30 signes ou plus) restés mot pour mot dans la section écrite pour le client. */
export function exampleHeadlines(libHtml: string, html: string): string[] {
  const heads = (h: string) => [...h.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)].map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()).filter((x) => x.length >= 30);
  const lib = new Set(heads(libHtml));
  return heads(html).filter((h) => lib.has(h));
}

/** Remplaçables par les tests (aucun appel réel). */
export const customBrandDeps: {
  plan?: (prompt: string, usageKey: string) => Promise<z.input<typeof SitePlanSchema>>;
  seo?: (prompt: string, usageKey: string) => Promise<z.infer<typeof SeoSchema>>;
  photoBrief?: (prompt: string, usageKey: string) => Promise<z.infer<typeof PhotoBriefSchema>>;
  write?: (prompt: string, usageKey: string) => Promise<SectionWrite>;
  /** Relecture de tous les textes par le directeur de création (essais sans IA : seulement si le test la fournit). */
  review?: (prompt: string, usageKey: string) => Promise<z.input<typeof CopyReviewSchema>>;
  /** Relecture de toutes les descriptions de photos par la directrice artistique (essais sans IA : seulement si fournie). */
  photoReview?: (prompt: string, usageKey: string) => Promise<z.input<typeof PhotoReviewSchema>>;
  photo?: (prompt: string, product: Buffer | null, aspect: string, usageKey: string) => Promise<Buffer>;
  /** Regard en image sur une page montée (essais sans IA : seulement si le test le fournit). */
  look?: (prompt: string, image: Buffer, usageKey: string) => Promise<z.input<typeof LookSchema>>;
  /** Prix le plus haut d'une photo créée (essais sans IA). */
  photoUnit?: () => number | null;
} = {};
/**
 * Prix le plus haut de la reprise d'une photo (la photo et son contrôle), même calcul que le devis du montage. Null :
 * prix inconnu, donc aucune reprise.
 */
function retryCost(): number | null {
  const unit = (customBrandDeps.photoUnit ?? (() => { try { return photoRequestMaxMicro(mockupImageRoute(), { prompt: "x".repeat(PUBLICATION_PROMPT_MAX_BYTES), references: 2, aspect: "2:3", quality: "high" }); } catch { return null; } }))();
  return unit == null ? null : unit + galleryCheckMaxMicro();
}

export async function runCustomBrandJob(ctx: JobContext) {
  const a = ctx.payload as CustomBrandPayload;
  const p = loadProject(a.projectId);
  let t = loadCustomTheme(p.id);
  if (!t) throw new UserFacingError(L("Aucun site à monter pour l'instant : SINA le conçoit d'abord, puis elle le monte à ta marque.", "No custom theme yet."));
  const j = a.conversationId ? (() => { try { return journeyOf(a.conversationId!); } catch { return null; } })() : null;
  // Demande du client pour ses textes (essai Heure Dorée : « le matin d'hiver où l'été revient » n'arrivait pas au rédacteur).
  const fam = loadFamilyChoice(p.id), people = peopleAllowed(p.id), fu = siteArtUniverse(fam, { people });
  // Personnes dans les photos créées : seulement si le client l'autorise (photo de personne fournie ou accord écrit).
  const photoPeople = !!fu && people;
  const brief = [brandBrief(p, j), peopleBriefLine(photoPeople), a.consigne ? `DEMANDE DU CLIENT POUR SES TEXTES (prioritaire, à suivre dans tout le site, ses mots) : « ${a.consigne} »` : ""].filter(Boolean).join("\n");
  const name = p.brand?.name ?? p.name;
  const products = (() => { try { return listProducts(p.id); } catch { return []; } })();
  // Ce que le Studio posera lui-même dans les pièces (prestations, horaires, zone, adresse) et ce que le client a dit :
  // dit au rédacteur section par section, puis contrôlé sans IA après l'écriture.
  const facts = siteFacts(p, t);
  // Lot 4 : les photos suivent la façon de photographier de la famille du Studio choisie d'après la planche (et non plus
  // un univers commun à tous les sites).
  const direction = familleArtDirection(p, t.famille, j) ?? siteArtDirection(p, fu, j);
  // rewrite : le client n'aime pas les textes, tout le site est réécrit (sinon seules les sections encore d'exemple).
  const sections = allSections(t).filter((x) => a.rewrite || !x.s.clientTexts);
  const writer = siteCopyModel();
  const report = { sections: 0, failedEdits: 0, photosMade: 0, photosReal: 0, photosClient: 0, photosToProvide: 0, photosLeft: 0, photosFailed: 0, photosReprises: 0, /** Faits connus posés à la place d'un « À compléter » (sans IA). */ faitsPoses: 0, /** Suites de mots encore répétées dans plus de trois sections après les reprises. */ repetitions: [] as string[], regardNonFait: null as null | string, redacteur: `${writer.provider}:${writer.model}`, relecture: null as null | { reprises: number; refusees: number; avis: string }, relecturePhotos: null as null | { reprises: number; refusees: number; avis: string }, regards: null as null | LooksReport, problems: [] as string[] };
  const briefs: Record<string, SectionWrite["photos"]> = {};
  /**
   * Les faits que le Studio connaît (téléphone, e-mail, horaires, zone, adresse, prestations) restés « [À compléter] »
   * dans un texte écrit sont POSÉS à leur place, sans IA : après l'écriture, puis après les reprises (deuxième essai
   * réel : ils étaient signalés, jamais corrigés). Gratuit, sans effet la seconde fois.
   */
  const poseFaits = () => {
    try {
      const now = loadCustomTheme(p.id)!;
      let n = 0;
      for (const x of allSections(now)) {
        if (x.s.html == null) continue;
        const r = fillKnownGaps(x.s.html, facts, x.page?.key, x.page?.product);
        if (r.filled.length) { x.s.html = r.html; n += r.filled.length; }
      }
      if (n) { t = saveCustomTheme(p.id, now, { history: false }); report.faitsPoses += n; }
    } catch { /* remplissage indisponible : les manques restent signalés */ }
  };
  /** Une section telle qu'un visiteur la verra (vraies données posées) : c'est elle que la relecture et les contrôles lisent. */
  const shown = (x: ReturnType<typeof allSections>[number]) => asShown(withBrandName(sectionHtml(x.s), name), facts, x.page?.key);
  /** Les suites de mots qui reviennent dans plus de trois sections (sans IA), hors noms et faits posés par le Studio. */
  const repeats = (list: ReturnType<typeof allSections>, o: { atLeast?: number } = {}) => {
    try {
      return repeatedPhrases(list.map((x) => ({ uid: x.s.uid, label: `${libSection(x.s.id)?.title ?? x.s.id}, ${x.page?.label ?? x.place}`, html: shown(x) })),
        { ...repeatScope(), ...o });
    } catch { return []; }
  };
  /**
   * Ce qui ne compte pas comme une répétition : les noms (marque, produits, prestations, options et leurs valeurs), les
   * coordonnées, la ville de l'entreprise et les villes de sa zone (un lieu se redit à raison d'une page à l'autre), et
   * toute suite de mots tirée des faits que le client a donnés tels quels (livraison, retours, horaires).
   */
  const repeatScope = () => {
    const villes = [facts.address, facts.site.address].flatMap((x) => { const v = /\b\d{5}\s+([^,\n]+)/.exec(x ?? "")?.[1]?.trim(); return v ? [v, v.replace(/-/g, " ")] : []; });
    const zone = facts.site.area ? zoneCities(facts.site.area).filter((x) => x.length <= 40) : [];
    return {
      ignore: [name, p.name, ...products.flatMap((x) => [x.data.title, ...x.data.options.flatMap((q) => [q.name, ...q.values])]), ...facts.prestations.map((x) => x.name), facts.site.phone, facts.site.area, facts.site.address, facts.address, facts.email, facts.site.hours ? hoursLine(facts.site.hours) : null, ...villes, ...zone],
      facts: [facts.site.shipping, facts.site.returns, facts.site.hours],
    };
  };

  // Un seul point d'annulation pour tout le montage : « Annuler » revient au thème d'avant le montage.
  await ctx.step("undo-point", async () => { pushCustomThemeHistory(p.id); return true; });

  // 0) Plan des textes de tout le site (un appel) : chaque section reçoit SON message, son titre et ses faits.
  let sitePlan: SitePlan | null = null;
  if (sections.length) {
    ctx.progress(0.03, L("Plan des textes du site", "Site copy plan"));
    try {
      sitePlan = await ctx.step("text-plan", async () => {
        const prompt = sitePlanPrompt(brief, sections.map((x) => { const l = libSection(x.s.id); return { uid: x.s.uid, page: x.page?.label ?? x.place, title: l?.title ?? x.s.id, does: l?.does ?? "", texts: sectionSkeleton(withBrandName(sectionHtml(x.s), name)), intent: x.s.intent }; }),
          { concept: t!.concept, journeys: t!.pages.filter((pg) => pg.journey).map((pg) => ({ page: pg.label, journey: pg.journey! })), pages: t!.pages.map((pg) => ({ key: pg.key, label: pg.label })) });
        const usageKey = `${ctx.job.id}:text-plan`;
        return customBrandDeps.plan ? SitePlanSchema.parse(await customBrandDeps.plan(prompt, usageKey))
          : SitePlanSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-text-plan", costCapMicro: a.capMicro }, () =>
              llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(SITE_PLAN_SYSTEM, "redacteur"), promptKey: "syna-custom-plan-2", prompt, maxTokens: 18000, maxOutputTokens: 32000, usageKey, routing: { difficulty: "complex", prefer: siteCopyModel() } }, SitePlanSchema, { strict: true })));
      });
    } catch (e) { report.problems.push(`plan des textes non fait (${(e as Error).message.slice(0, 120)}) : sections écrites sans plan`); }
    // Référencement de chaque page, gardé dans le thème (titre de l'onglet et description pour Google).
    if (sitePlan?.seo?.length) {
      t = loadCustomTheme(p.id)!;
      for (const pg of t.pages) { const s = sitePlan.seo.find((x) => x.page === pg.key); if (s) pg.seo = { title: s.titre, description: s.description }; }
      t = saveCustomTheme(p.id, t, { history: false });
      const missing = t.pages.filter((pg) => !pg.seo).map((pg) => pg.label);
      if (missing.length) report.problems.push(`référencement non écrit pour : ${missing.join(", ")}`);
    }
  }
  // Pages encore sans référencement (plan déjà fait ou coupé, montage en deux fois) : écrit à part, un petit appel.
  {
    const cur = loadCustomTheme(p.id)!;
    const without = cur.pages.filter((pg) => !pg.seo);
    // (Essais sans IA : seulement si le test fournit aussi le référencement.)
    if (without.length && (!customBrandDeps.plan || customBrandDeps.seo)) {
      try {
        const seo = await ctx.step("seo", async () => {
          const prompt = [brief, "", cur.concept ? `IDÉE DU SITE : ${cur.concept}` : "", "Pages à référencer (clé · nom · ce qu'elle propose) :",
            ...without.map((pg) => `- ${pg.key} · ${pg.label} · ${(pg.journey ?? pg.sections.map((s) => libSection(s.id)?.title ?? s.id).join(", ")).slice(0, 400)}`)].join("\n");
          const usageKey = `${ctx.job.id}:seo`;
          return customBrandDeps.seo ? customBrandDeps.seo(prompt, usageKey)
            : SeoSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-seo", costCapMicro: a.capMicro }, () =>
                llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: SEO_SYSTEM, promptKey: "syna-custom-seo-1", prompt, maxTokens: 4000, maxOutputTokens: 8000, usageKey, routing: { difficulty: "standard", prefer: siteCopyModel() } }, SeoSchema, { strict: true })));
        });
        const t2 = loadCustomTheme(p.id)!;
        for (const pg of t2.pages) { const s = seo.seo.find((x) => x.page === pg.key); if (!pg.seo && s) pg.seo = { title: s.titre, description: s.description }; }
        saveCustomTheme(p.id, t2, { history: false });
      } catch (e) { report.problems.push(`référencement non écrit (${(e as Error).message.slice(0, 120)})`); }
    }
  }

  // 1) Textes, section par section (un point de reprise chacune).
  for (const [i, x] of sections.entries()) {
    const l = libSection(x.s.id);
    ctx.progress(0.05 + (0.45 * i) / Math.max(1, sections.length), L(`Textes : ${l?.title ?? x.s.id}`, `Copy: ${l?.title ?? x.s.id}`));
    try {
      const w = await ctx.step(`text:${x.s.uid}`, async () => {
        const html = withBrandName(sectionHtml(x.s), name);
        const prompt = sectionWritePrompt(brief, x.page?.label ?? x.place, l?.title ?? x.s.id, l?.does ?? "", html, sitePlan ? { site: sitePlan, uid: x.s.uid } : undefined, { intent: x.s.intent, journey: x.page?.journey, product: productFacts(p.id, x.page?.product), pages: t!.pages.map((pg) => `${pg.key} : ${pg.label}`).join(" · "), shown: shownFacts(html, facts, x.page?.key),
          // Les formules déjà dites dans trois sections écrites avant celle-ci (sans IA) : le rédacteur ne les emploie plus.
          deja: repeats(allSections(loadCustomTheme(p.id)!).filter((y) => y.s.clientTexts && y.s.uid !== x.s.uid), { atLeast: REPEAT_SECTIONS_MAX }).slice(0, 12).map((r) => r.phrase) });
        const usageKey = `${ctx.job.id}:text:${x.s.uid}`;
        return customBrandDeps.write ? customBrandDeps.write(prompt, usageKey)
          : SectionWriteSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-text", costCapMicro: a.capMicro }, () =>
              llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(SECTION_WRITE_SYSTEM, "redacteur"), promptKey: "syna-custom-section-2", prompt, maxTokens: 14000, maxOutputTokens: 28000, usageKey, routing: { difficulty: "complex", prefer: siteCopyModel() } }, SectionWriteSchema, { strict: true })));
      });
      // Écriture posée une seule fois : à la reprise d'une tâche, une section déjà enregistrée n'est pas réappliquée
      // (sinon tous ses remplacements échouaient sur un texte déjà réécrit, audit du 10 novembre 2026).
      const r = await ctx.step(`text-saved:${x.s.uid}`, async () => {
        t = loadCustomTheme(p.id)!;
        const cur = allSections(t).find((y) => y.s.uid === x.s.uid);
        if (!cur) return null;
        const out = applyWrite(withBrandName(sectionHtml(cur.s), name), w);
        // « Textes du client » seulement si la section a VRAIMENT été réécrite (une réponse vide ne compte pas).
        // Une pièce sans aucun texte (une bande de photo) n'a rien à réécrire : elle n'est plus « d'exemple ».
        const wordless = !w.edits.length && !sectionReadableTexts(out.html).length && !sectionSkeleton(out.html).replace("(aucun titre)", "");
        cur.s.html = out.html; cur.s.clientTexts = out.failed === 0 && (out.applied > 0 || wordless);
        // Liens : seulement vers une page du site, et seulement pour un texte réellement écrit dans la section.
        const keys = new Set(t.pages.map((pg) => pg.key)), text = decodeEntities(out.html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
        const clean = (v: string) => v.replace(/[→↗]/g, "").replace(/\s+/g, " ").trim();
        const kept = w.links.filter((k) => keys.has(k.to.split(":")[0]) && text.includes(clean(k.text)));
        const links = Object.fromEntries(kept.map((k) => [clean(k.text), k.to]));
        const dead = w.links.filter((k) => !keys.has(k.to.split(":")[0])).map((k) => `« ${k.text} » → ${k.to}`);
        const lost = w.links.filter((k) => keys.has(k.to.split(":")[0]) && !kept.includes(k)).map((k) => `« ${k.text} »`);
        if (Object.keys(links).length) cur.s.links = links;
        cur.s.photoBriefs = w.photos.length ? w.photos : undefined;
        t = saveCustomTheme(p.id, t, { history: false });
        return { failed: out.failed, applied: out.applied, dead, lost, wordless };
      });
      if (!r) continue;
      // Accroche d'exemple gardée mot pour mot (essai Éclat de thé : « Pose ton écran. Ces quelques minutes sont à toi. »
      // restait le titre de l'ouverture) : signalée, jamais laissée en silence. Les titres pratiques courts restent permis.
      const kept = exampleHeadlines(l?.html ?? "", sectionHtml(allSections(loadCustomTheme(p.id)!).find((y) => y.s.uid === x.s.uid)?.s ?? x.s));
      if (kept.length) report.problems.push(`${l?.title} : titre d'exemple gardé tel quel (« ${kept.join(" », « ")} ») : à réécrire pour la marque`);
      if (r.dead.length) report.problems.push(`${l?.title} : bouton(s) vers une page qui n'existe pas (${r.dead.join(", ")})`);
      if (r.lost.length) report.problems.push(`${l?.title} : lien(s) non posé(s), texte introuvable dans la section (${r.lost.join(", ")})`);
      briefs[x.s.uid] = w.photos;
      report.sections++; report.failedEdits += r.failed;
      if (r.failed) report.problems.push(`${l?.title} : ${r.failed} texte(s) non remplacé(s)`);
      // Jamais signalé pour une pièce qui n'a aucun texte (essai réel du 16 novembre 2026 : « Bande de photo »).
      if (!r.applied && !r.wordless) report.problems.push(`${l?.title} : aucun texte réécrit, les textes d'exemple restent`);
    } catch (e) { report.problems.push(`${l?.title ?? x.s.id} : textes non écrits (${(e as Error).message.slice(0, 120)})`); }
  }

  if (report.sections) poseFaits();

  // 1 bis) Relecture de TOUS les textes par un directeur de création, puis une reprise des sections refusées.
  // (Essais sans IA : seulement si le test fournit la relecture, comme pour le référencement.)
  if (report.sections && (!customBrandDeps.write || customBrandDeps.review)) {
    ctx.progress(0.5, L("Je relis tous les textes du site", "Reviewing all the site copy"));
    try {
      const review = await ctx.step("text-review", async () => {
        const all = allSections(loadCustomTheme(p.id)!).filter((x) => x.s.clientTexts || sections.some((y) => y.s.uid === x.s.uid));
        const known0 = knownFacts(p);
        const flags = Object.fromEntries(all.map((x) => [x.s.uid, unconfirmedClaims(p, shown(x), known0)] as const).filter(([, list]) => list.length));
        const contradictions = Object.fromEntries(all.map((x) => [x.s.uid, factFlags(withBrandName(sectionHtml(x.s), name), facts, x.page?.key)] as const).filter(([, list]) => list.length));
        const prompt = copyReviewPrompt(brief, all.map((x) => ({ uid: x.s.uid, place: x.page?.label ?? x.place, title: libSection(x.s.id)?.title ?? x.s.id, html: shown(x) })), flags, contradictions, repeats(all));
        const usageKey = `${ctx.job.id}:text-review`;
        return CopyReviewSchema.parse(customBrandDeps.review ? await customBrandDeps.review(prompt, usageKey)
          : await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-text-review", costCapMicro: a.capMicro }, () =>
              llmJson({ task: "quality_control", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(COPY_REVIEW_SYSTEM, "relecteurTextes"), promptKey: "syna-custom-copy-review-2", prompt, maxTokens: 8000, maxOutputTokens: 16000, usageKey, routing: { difficulty: "complex", prefer: siteCopyModel() } }, CopyReviewSchema, { strict: true })));
      });
      const known = new Map(allSections(loadCustomTheme(p.id)!).map((x) => [x.s.uid, x] as const));
      const refused = review.sections.filter((f, i, all) => known.has(f.uid) && all.findIndex((g) => g.uid === f.uid) === i);
      // Les répétitions relevées sans IA décident elles-mêmes qui garde chaque formule et qui la retire : ces sections
      // passent d'abord (la moitié du budget au plus quand la relecture a aussi les siennes), avec la liste exacte.
      const drops = repeatDrops(repeats([...known.values()].filter((x) => x.s.clientTexts || sections.some((y) => y.s.uid === x.s.uid)))).filter((d) => known.has(d.uid));
      const todo = planCopyFixes(refused, drops);
      let fixed = 0;
      for (const [i, f] of todo.entries()) {
        const x = known.get(f.uid)!, l = libSection(x.s.id), label = l?.title ?? x.s.id;
        ctx.progress(0.5 + (0.08 * i) / todo.length, L(`Je reprends : ${label}`, `Reworking: ${label}`));
        try {
          const w = await ctx.step(`text-fix:${f.uid}`, async () => {
            const cur = allSections(loadCustomTheme(p.id)!).find((y) => y.s.uid === f.uid) ?? x;
            const prompt = `${sectionWritePrompt(brief, cur.page?.label ?? cur.place, label, l?.does ?? "", withBrandName(sectionHtml(cur.s), name), sitePlan ? { site: sitePlan, uid: f.uid } : undefined, { intent: cur.s.intent, journey: cur.page?.journey, product: productFacts(p.id, cur.page?.product), pages: t!.pages.map((pg) => `${pg.key} : ${pg.label}`).join(" · "), shown: shownFacts(sectionHtml(cur.s), facts, cur.page?.key) })}\n\nCORRECTIONS EXIGÉES PAR LE DIRECTEUR DE CRÉATION (la section est déjà écrite : ne change QUE ce que ces corrections visent ; chaque « find » porte sur le HTML ci-dessus, tel qu'il est maintenant ; garde les liens et les photos, ne les redonne que s'ils changent) :\n${f.fixes.map((c) => `- ${c}`).join("\n")}`;
            const usageKey = `${ctx.job.id}:text-fix:${f.uid}`;
            return customBrandDeps.write ? customBrandDeps.write(prompt, usageKey)
              : SectionWriteSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-text-fix", costCapMicro: a.capMicro }, () =>
                  llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(SECTION_WRITE_SYSTEM, "redacteur"), promptKey: "syna-custom-section-2", prompt, maxTokens: 14000, maxOutputTokens: 28000, usageKey, routing: { difficulty: "complex", prefer: siteCopyModel() } }, SectionWriteSchema, { strict: true })));
          });
          const r = await ctx.step(`text-fix-saved:${f.uid}`, async () => {
            t = loadCustomTheme(p.id)!;
            const cur = allSections(t).find((y) => y.s.uid === f.uid);
            if (!cur) return null;
            const out = applyWrite(withBrandName(sectionHtml(cur.s), name), w);
            if (!out.applied) return { applied: 0, failed: out.failed };
            cur.s.html = out.html;
            // Photos redécrites par la reprise : elles remplacent les anciennes descriptions ; sinon rien ne bouge.
            if (w.photos.length) { cur.s.photoBriefs = w.photos; briefs[f.uid] = w.photos; }
            // Liens redonnés par la reprise (un bouton réécrit garde une destination) : seulement vers une page du site.
            if (w.links.length) { const keys = new Set(t.pages.map((pg) => pg.key)); const more = Object.fromEntries(w.links.filter((k) => keys.has(k.to.split(":")[0])).map((k) => [k.text.replace(/[→↗]/g, "").replace(/\s+/g, " ").trim(), k.to])); if (Object.keys(more).length) cur.s.links = { ...(cur.s.links ?? {}), ...more }; }
            t = saveCustomTheme(p.id, t, { history: false });
            return { applied: out.applied, failed: out.failed };
          });
          if (r?.applied) fixed++;
          else report.problems.push(`${label} : ma relecture demandait une reprise (${f.fixes[0].slice(0, 140)}), elle n'a pas pu être posée : à relire`);
        } catch (e) { report.problems.push(`${label} : reprise demandée par ma relecture non faite (${(e as Error).message.slice(0, 100)})`); }
      }
      for (const f of refused.filter((r) => !todo.some((d) => d.uid === r.uid))) report.problems.push(`${libSection(known.get(f.uid)!.s.id)?.title ?? f.uid} : à relire (${f.fixes[0].slice(0, 140)})`);
      report.relecture = { reprises: fixed, refusees: refused.length, avis: review.site };
      // Ce que la fiche ne confirme toujours pas après la relecture : dit au client, jamais laissé en silence.
      const known1 = knownFacts(p);
      const left = allSections(loadCustomTheme(p.id)!).map((x) => ({ x, claims: unconfirmedClaims(p, shown(x), known1) })).filter((y) => y.claims.length);
      for (const y of left.slice(0, 6)) report.problems.push(`${libSection(y.x.s.id)?.title ?? y.x.s.id} (${y.x.page?.label ?? y.x.place}) : à confirmer par toi ou à retirer : ${y.claims.join(" ; ")}`);
      if (left.length > 6) report.problems.push(`${left.length - 6} autre(s) section(s) avec une promesse à confirmer`);
    } catch (e) { report.problems.push(`relecture des textes non faite (${(e as Error).message.slice(0, 120)}) : les textes n'ont pas été relus`); }
  }

  // 1 ter) Contrôle des faits, sans IA, sur les textes tels qu'ils restent (avec ou sans relecture) : un nombre qui
  // contredit la liste affichée, un « À compléter » pour un fait donné, une adresse à ne pas montrer, un bouton vers
  // une page absente. Dit dans le compte rendu, jamais laissé en silence.
  if (report.sections) {
    // Après les reprises : les faits connus sont posés une dernière fois ; seul ce qui reste ambigu est signalé.
    poseFaits();
    try {
      const now = loadCustomTheme(p.id)!, wrote = new Set(sections.map((y) => y.s.uid));
      const seen = allSections(now).filter((x) => x.s.clientTexts || wrote.has(x.s.uid));
      // Répétitions encore là après les reprises : dites dans le compte rendu, jamais laissées en silence.
      const again = repeats(seen);
      report.repetitions = again.slice(0, 5).map((r) => `« ${r.phrase} » revient dans ${r.sections.length} sections (${r.sections.map((x) => x.replace(/^\S+ \((.*)\)$/, "$1")).slice(0, 6).join(" ; ")})`);
      if (again.length) report.problems.push(`répétitions : ${again.length} suite(s) de mots reviennent encore dans plus de ${REPEAT_SECTIONS_MAX} sections, par exemple ${report.repetitions[0]}`);
      const found = seen.flatMap((x) => factFlags(withBrandName(sectionHtml(x.s), name), facts, x.page?.key).map((f) => `${libSection(x.s.id)?.title ?? x.s.id} (${x.page?.label ?? x.place}) : ${f}`));
      for (const f of found.slice(0, 8)) report.problems.push(f);
      if (found.length > 8) report.problems.push(`${found.length - 8} autre(s) texte(s) qui contredisent le dossier du client`);
      const dead = deadLinks(now).filter((d) => seen.some((x) => x.s.uid === d.uid));
      for (const d of dead.slice(0, 6)) report.problems.push(`${d.title} (${d.place}) : le bouton « ${d.text} » mène à une page qui n'existe pas dans ce site (${d.to})`);
    } catch { /* contrôle des faits indisponible : le montage continue */ }
  }

  // 2) Photos : vraie photo du produit, sinon photo créée dans la direction artistique de la marque.
  if (a.photos !== false) {
    // Photo d'une fiche produit posée par erreur en photo d'ambiance (essai Éclat de thé : le sachet en ouverture, titre
    // illisible dessus) : dans une section qui n'a que des scènes, l'emplacement redevient une photo à créer.
    const productIds = productImageIds(p.id);
    {
      let fixed = 0;
      t = loadCustomTheme(p.id)!;
      for (const y of allSections(t)) {
        const ly = libSection(y.s.id), briefs0 = y.s.photoBriefs ?? [];
        if (!healable(ly, briefs0)) continue;
        let html = sectionHtml(y.s);
        for (const b of briefs0) {
          if (html.includes(b.find)) continue;
          const m = [...html.matchAll(/\/api\/files\/([\w-]+)/g)].find((x) => productIds.has(x[1]));
          if (!m) break;
          html = html.replace(m[0], b.find); fixed++;
        }
        if (html !== sectionHtml(y.s)) y.s.html = html;
      }
      if (fixed) { t = saveCustomTheme(p.id, t, { history: false }); report.problems.push(`${fixed} photo(s) de produit retirée(s) d'un emplacement d'ambiance : une scène est créée à leur place`); }
    }
    // Photos décrites lors d'un montage précédent (montage en deux fois) : créées maintenant, dans le même ordre.
    for (const y of allSections(loadCustomTheme(p.id)!)) if (!briefs[y.s.uid] && y.s.photoBriefs?.length) briefs[y.s.uid] = y.s.photoBriefs as SectionWrite["photos"];
    // Descriptions à plusieurs paquets : réécrites ci-dessous (une seule photo du produit peut être jointe).
    for (const uid of Object.keys(briefs)) briefs[uid] = briefs[uid].filter((b) => briefUsable(b.description));
    // Sections aux photos d'exemple encore SANS description (essai réel du 10 novembre 2026 : le rédacteur, lisant « sans
    // créer de photo », n'en avait décrit aucune ; le montage des photos n'avait rien à créer et ne l'a pas dit) : la
    // description est écrite maintenant, d'après le texte déjà écrit de la section (un petit appel par section).
    const onPage = (y: { page?: { key: string } | null }) => !a.pages?.length || (!!y.page && a.pages.includes(y.page.key));
    if (a.newPhotos !== false && (!customBrandDeps.photo || customBrandDeps.photoBrief)) for (const y of allSections(loadCustomTheme(p.id)!).filter(onPage)) {
      const ly = libSection(y.s.id), html = sectionHtml(y.s);
      const left = [...new Set([...html.matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((m) => m[0]))].filter((f) => !(briefs[y.s.uid] ?? []).some((b) => b.find === f) && !/(^|\/)(carte|map|plan)-/.test(f));
      if (!ly || !left.length || authenticSection(y.s.id, p.business === "services" ? "services" : "products")) continue;
      try {
        const got = await ctx.step(`photo-brief:${y.s.uid}`, async () => {
          const prompt = `${brief}\n\nSECTION « ${ly.title} » (${y.page?.label ?? y.place}) : ${ly.does}${y.s.intent ? `\nCONCEPTION : ${y.s.intent}` : ""}\n\nHTML actuel (textes déjà écrits pour la marque) :\n${html.slice(0, 12000)}\n\nPHOTOS À DÉCRIRE (source exacte) : ${left.join(", ")}`;
          const usageKey = `${ctx.job.id}:photo-brief:${y.s.uid}`;
          return customBrandDeps.photoBrief ? customBrandDeps.photoBrief(prompt, usageKey)
            : PhotoBriefSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-photo-brief", costCapMicro: a.capMicro }, () =>
                llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(PHOTO_BRIEF_SYSTEM, "directriceArtistique"), promptKey: "syna-custom-photo-brief-2", prompt, maxTokens: 6000, maxOutputTokens: 12000, usageKey, routing: { difficulty: "complex", prefer: siteCopyModel() } }, PhotoBriefSchema, { strict: true })));
        });
        const ok = got.photos.filter((x) => left.includes(x.find));
        if (ok.length) {
          briefs[y.s.uid] = [...(briefs[y.s.uid] ?? []), ...ok];
          const t3 = loadCustomTheme(p.id)!, z = allSections(t3).find((w) => w.s.uid === y.s.uid);
          if (z) { z.s.photoBriefs = briefs[y.s.uid]; saveCustomTheme(p.id, t3, { history: false }); }
        }
      } catch (e) { report.problems.push(`${ly.title} : photos non décrites (${(e as Error).message.slice(0, 100)})`); }
    }
    const mode: ImagesMode = a.images ?? "sina";
    /**
     * Photos (section|source) dont la relecture a refusé la description pour une PERSONNE que rien n'autorise, et dont
     * la description n'a pas pu être refaite (deuxième essai réel, 17 novembre 2026 : « photo à revoir (Le cycliste vu
     * de dos est une personne…) », et la photo était créée telle quelle). Elles ne partent jamais telles quelles :
     * consigne durcie dès la création, puis le contrôle de l'image décide (refus : cadre vide, et c'est dit).
     */
    const sansPersonne = new Set<string>();
    // 2 bis) Relecture de TOUTES les descriptions par la directrice artistique, avant de payer la moindre photo, puis
    // une reprise des descriptions refusées (un appel par section). Jamais pour une photo du produit seul (sa vraie
    // photo y va), ni pour une photo que seul le client peut fournir. (Essais sans IA : seulement si le test la fournit.)
    if (a.newPhotos !== false && mode !== "client" && (!customBrandDeps.photo || customBrandDeps.photoReview)) {
      const reviewable = () => allSections(loadCustomTheme(p.id)!).filter(onPage).map((y) => {
        const ly = libSection(y.s.id), html = sectionHtml(y.s);
        if (!ly || authenticSection(y.s.id, p.business === "services" ? "services" : "products")) return null;
        const photos = (briefs[y.s.uid] ?? []).filter((b) => html.includes(b.find) && !/(^|\/)(carte|map|plan)-/.test(b.find) && !showsProductAlone(ly, b.description));
        return photos.length ? { y, ly, html, photos } : null;
      }).filter((x): x is NonNullable<typeof x> => !!x);
      const seen = reviewable();
      if (seen.reduce((k, x) => k + x.photos.length, 0) >= MIN_PHOTOS_TO_REVIEW) {
        ctx.progress(0.5, L("Je relis toutes les photos prévues avant de les créer", "Reviewing every planned photo before creating it"));
        try {
          const review = await ctx.step("photo-review", async () => {
            const prompt = photoReviewPrompt(brief, direction, seen.map((x) => ({ uid: x.y.s.uid, place: x.y.page?.label ?? x.y.place, title: x.ly.title, html: withBrandName(x.html, name), photos: x.photos.map((b) => ({ find: b.find, description: b.description, ratio: b.ratio, product: b.product ?? null })) })));
            const usageKey = `${ctx.job.id}:photo-review`;
            return PhotoReviewSchema.parse(customBrandDeps.photoReview ? await customBrandDeps.photoReview(prompt, usageKey)
              : await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-photo-review", costCapMicro: a.capMicro }, () =>
                  llmJson({ task: "quality_control", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(PHOTO_REVIEW_SYSTEM, "directriceArtistique"), promptKey: "syna-custom-photo-review-2", prompt, maxTokens: 7000, maxOutputTokens: 14000, usageKey, routing: { difficulty: "complex", prefer: siteCopyModel() } }, PhotoReviewWireSchema, { strict: true })));
          });
          // Seules les photos réellement relues comptent (une section ou une source inconnue est ignorée).
          const refused = review.photos.filter((f, i, list) => seen.some((x) => x.y.s.uid === f.uid && x.photos.some((b) => b.find === f.find)) && list.findIndex((g) => g.uid === f.uid && g.find === f.find) === i);
          // Ce qui est INTERDIT (une personne sans accord) passe avant toute correction de goût, dans la limite des reprises.
          const forPeople = (f: { fixes: string[] }) => !photoPeople && f.fixes.some((c) => briefShowsPeople(c));
          const uids = [...new Set([...refused.filter(forPeople), ...refused].map((f) => f.uid))];
          const before = new Map<string, string>(seen.flatMap((x) => x.photos.map((b) => [`${x.y.s.uid}|${b.find}`, b.description.trim()] as [string, string])));
          let redone = 0;
          for (const [i, uid] of uids.slice(0, MAX_PHOTO_FIXES).entries()) {
            const x = seen.find((z) => z.y.s.uid === uid)!, mine = refused.filter((f) => f.uid === uid);
            ctx.progress(0.5 + (0.04 * i) / Math.max(1, Math.min(uids.length, MAX_PHOTO_FIXES)), L(`Je revois les photos : ${x.ly.title}`, `Reworking photos: ${x.ly.title}`));
            try {
              const got = await ctx.step(`photo-fix:${uid}`, async () => {
                const prompt = `${brief}\n\nSECTION « ${x.ly.title} » (${x.y.page?.label ?? x.y.place}) : ${x.ly.does}${x.y.s.intent ? `\nCONCEPTION : ${x.y.s.intent}` : ""}${direction ? `\nDIRECTION ARTISTIQUE DE LA MARQUE : ${direction}` : ""}\n\nHTML actuel (textes déjà écrits pour la marque) :\n${x.html.slice(0, 12000)}\n\nPHOTOS À REDÉCRIRE (source exacte ; garde le format et la place du texte) :\n${mine.map((f) => { const old = x.photos.find((b) => b.find === f.find)!; return `- ${f.find} (format ${old.ratio}) · description refusée : ${old.description}\n  CORRECTIONS EXIGÉES PAR LA DIRECTRICE ARTISTIQUE :\n${f.fixes.map((c) => `  - ${c}`).join("\n")}`; }).join("\n")}\n\nAUTRES PHOTOS DU SITE (ne refais aucune de ces scènes) :\n${seen.flatMap((z) => z.photos.filter((b) => !(z.y.s.uid === uid && mine.some((f) => f.find === b.find))).map((b) => `- ${b.description.slice(0, 160)}`)).slice(0, 40).join("\n")}`;
                const usageKey = `${ctx.job.id}:photo-fix:${uid}`;
                return customBrandDeps.photoBrief ? customBrandDeps.photoBrief(prompt, usageKey)
                  : PhotoBriefSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-photo-fix", costCapMicro: a.capMicro }, () =>
                      llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(PHOTO_BRIEF_SYSTEM, "directriceArtistique"), promptKey: "syna-custom-photo-brief-2", prompt, maxTokens: 6000, maxOutputTokens: 12000, usageKey, routing: { difficulty: "complex", prefer: siteCopyModel() } }, PhotoBriefSchema, { strict: true })));
              });
              // Une reprise ne change que la description (et le produit montré) : jamais la source ni le format.
              let here = 0;
              briefs[uid] = (briefs[uid] ?? []).map((b) => {
                const next = mine.some((f) => f.find === b.find) ? got.photos.find((g) => g.find === b.find && briefUsable(g.description) && g.description.trim() !== b.description.trim()) : undefined;
                if (!next) return b;
                here++;
                return { ...b, description: next.description, product: next.product ?? null };
              });
              redone += here;
              if (here) { const t3 = loadCustomTheme(p.id)!, z = allSections(t3).find((w) => w.s.uid === uid); if (z) { z.s.photoBriefs = briefs[uid]; saveCustomTheme(p.id, t3, { history: false }); } }
              if (here < mine.length) report.problems.push(`${x.ly.title} : ${mine.length - here} photo(s) que ma relecture voulait revoir n'ont pas pu être redécrites (${mine[0].fixes[0].slice(0, 120)})`);
            } catch (e) { report.problems.push(`${x.ly.title} : photos non redécrites après ma relecture (${(e as Error).message.slice(0, 100)})`); }
          }
          // Refusée pour une personne et pas redécrite (au-delà des reprises, ou reprise ratée) : consigne durcie à la création.
          for (const f of refused.filter(forPeople)) {
            const key = `${f.uid}|${f.find}`, nowText = (briefs[f.uid] ?? []).find((b) => b.find === f.find)?.description.trim();
            if (nowText == null || nowText !== before.get(key)) continue;
            sansPersonne.add(key);
            report.problems.push(`${seen.find((z) => z.y.s.uid === f.uid)!.ly.title} : ma relecture voyait une personne dans la photo prévue (${f.fixes.find((c) => briefShowsPeople(c))!.slice(0, 120)}) et sa description n'a pas pu être refaite : photo créée avec la consigne « aucune personne », puis contrôlée`);
          }
          for (const uid of uids.slice(MAX_PHOTO_FIXES)) { const rest = refused.filter((f) => f.uid === uid && !sansPersonne.has(`${f.uid}|${f.find}`)); if (rest.length) report.problems.push(`${seen.find((z) => z.y.s.uid === uid)!.ly.title} : photo à revoir (${rest[0].fixes[0].slice(0, 140)})`); }
          report.relecturePhotos = { reprises: redone, refusees: refused.length, avis: review.site };
        } catch (e) { report.problems.push(`relecture des photos non faite (${(e as Error).message.slice(0, 120)}) : les descriptions n'ont pas été relues`); }
      }
    }
    const pageOfUid = new Map(allSections(loadCustomTheme(p.id)!).map((y) => [y.s.uid, y] as const));
    const todo = Object.entries(briefs).flatMap(([uid, list]) => list.map((ph) => ({ uid, ph }))).filter((x) => !/(^|\/)(carte|map|plan)-[\w-]*\.(?:webp|png|jpe?g)/.test(x.ph.find) && (!a.pages?.length || onPage(pageOfUid.get(x.uid) ?? {})));
    // Images du client d'abord (« client » ou « mix »), dans l'ordre ; jamais une même image sur deux emplacements.
    const allOwn = (a.clientAssets ?? []).filter((id) => { const x = getAsset(id); return !!x && x.project_id === p.id && !x.deleted_at && x.kind === "image" && !productIds.has(id); });
    const own = mode === "sina" ? [] : allOwn;
    // Ses images vont d'abord aux photos impossibles à inventer, les suivantes aux photos d'ambiance.
    const isAuthentic = (uid: string) => { const y = allSections(loadCustomTheme(p.id)!).find((z) => z.s.uid === uid); return !!y && !!authenticSection(y.s.id, p.business === "services" ? "services" : "products"); };
    const reserved = Math.min(allOwn.length, todo.filter((x) => isAuthentic(x.uid)).length);
    let nextA = 0, next = reserved;
    for (const [i, { uid, ph }] of todo.entries()) {
      ctx.progress(0.5 + (0.48 * i) / Math.max(1, todo.length), L(`Photos : ${i + 1} sur ${todo.length}`, `Photos: ${i + 1} of ${todo.length}`));
      const file = ph.find.replace(/^.*\//, "");
      // Photo d'un élément retiré par le rédacteur (carte en trop) : rien à créer, rien à payer.
      const here = allSections(loadCustomTheme(p.id)!).find((y) => y.s.uid === uid);
      if (!here || !sectionHtml(here.s).includes(ph.find)) continue;
      try {
        const lib = libSection(here.s.id);
        // Photo impossible à inventer (réalisations, photos de clients, biens…) : seule une vraie photo du client va là,
        // quel que soit son choix d'images ; sinon elle reste à fournir (cadre « Photo à fournir » dans l'aperçu).
        const authentic = authenticSection(here.s.id, p.business === "services" ? "services" : "products");
        if (authentic) {
          const given = nextA < reserved ? allOwn[nextA++] : undefined;
          if (!given) { report.photosToProvide++; continue; }
          report.photosClient++;
          t = loadCustomTheme(p.id)!;
          const cur0 = allSections(t).find((y) => y.s.uid === uid);
          if (cur0) { cur0.s.html = sectionHtml(cur0.s).split(ph.find).join(assetUrl({ id: given })); t = saveCustomTheme(p.id, t, { history: false }); }
          continue;
        }
        // La vraie photo du produit telle quelle seulement sur sa carte ou dans le bloc d'achat ; ailleurs (ouverture,
        // ambiance), une scène est créée avec elle en référence (audit du 10 novembre 2026 : le même packshot partout).
        const realId = ph.product ? products.find((x) => x.data.title.trim().toLowerCase() === ph.product!.trim().toLowerCase())?.data.images[0]?.assetId : undefined;
        const real = realId && lib && showsProductAlone(lib, ph.description) && getAsset(realId) ? realId : undefined;
        const mine = !real && next < own.length ? own[next++] : undefined;
        // Montage en deux fois (newPhotos:false) : rien de créé, la photo d'exemple attend le second montage.
        if (!real && !mine && a.newPhotos === false) { report.photosLeft++; continue; }
        if (!real && !mine && mode === "client") { report.problems.push(`photo ${file} : aucune image du client pour cet emplacement`); continue; }
        // Une photo créée : la description ne part jamais avec une personne ou une main que rien n'autorise (contrôle sans
        // IA) ; « retry » : la seule reprise permise, après un refus du contrôle pour une personne, description durcie.
        const create = (retry: boolean) => ctx.step(`${retry ? "photo-retry" : "photo"}:${uid}:${file}`, async () => {
          const prodRef = ph.product && showsPackaging(ph.description) ? products.find((x) => x.data.title.trim().toLowerCase() === ph.product!.trim().toLowerCase())?.data.images[0]?.assetId : undefined;
          const ref = prodRef ? getAsset(prodRef) : undefined;
          const place = textPlacementLine(sectionHtml(here.s), ph.find, libSection(here.s.id)?.does ?? "", here.s.construction);
          // Photo d'exemple détourée (ouverture Moderne) : créée sur fond uni, puis détourée (gratuit).
          const cut = isCutoutPhoto(file);
          const prompt = codePhotoPrompt({ id: `ct-${uid}-${file}`, description: [briefWithoutPeople(ph.description, photoPeople, retry || sansPersonne.has(`${uid}|${ph.find}`)), place].filter(Boolean).join("\n"), ratio: ph.ratio, product: !!ph.product, ...(cut ? { background: FOND_A_DETOURER } : {}) }, { name, logo: false, product: !!ref, direction, people: photoPeople });
          const usageKey = `${ctx.job.id}:${retry ? "photo-retry" : "photo"}:${uid}:${file}`;
          const made = customBrandDeps.photo ? await customBrandDeps.photo(prompt, ref ? assetData(ref) : null, ph.ratio, usageKey)
            : await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-photo", costCapMicro: a.capMicro }, () => withQuotedImageRoute(mockupImageRoute(), () => aiSiteImageHd({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey }, { prompt, product: ref ? assetData(ref) : null, aspect: hdAspect(ph.ratio) })));
          const done = cut ? await cutoutPhoto(made) : { data: made, cut: false };
          if (done.problem) report.problems.push(`photo ${file} : ${done.problem}`);
          const data = done.data;
          const asset = await saveAsset({ projectId: p.id, userId: p.userId, data, name: sitePhotoName(here.page?.label ?? here.place, ph.description), mime: "image/png", role: "site", origin: "generated", meta: { synaPhoto: { description: ph.description, ratio: ph.ratio, direction: "custom", product: !!ph.product, replaced: file } } });
          return asset.id;
        });
        let assetId = real ? real : mine ? mine : await create(false);
        // Chaque photo créée est contrôlée (décision du propriétaire du 10 novembre 2026) : une photo ratée n'est jamais
        // posée comme bonne ; elle est signalée et ne sera refaite qu'avec l'accord du client.
        if (!real && !mine && (!customBrandDeps.photo || galleryDeps.check)) {
          const prodRef = ph.product && showsPackaging(ph.description) ? products.find((x) => x.data.title.trim().toLowerCase() === ph.product!.trim().toLowerCase())?.data.images[0]?.assetId : undefined;
          const check = (id: string, retry: boolean) => ctx.step(`${retry ? "photo-recheck" : "photo-check"}:${uid}:${file}`, async () => checkCreatedImage({ jobId: ctx.job.id, projectId: p.id, userId: p.userId, usageKey: `${ctx.job.id}:${retry ? "photo-recheck" : "photo-check"}:${uid}:${file}`, capMicro: a.capMicro }, assetData(getAsset(id)!), prodRef && getAsset(prodRef) ? assetData(getAsset(prodRef)!) : null, [], people, ph.product ?? undefined));
          let problems = await check(assetId, false);
          // Refus pour une personne ou une main sans accord (essai réel du 16 novembre 2026 : quatre photos refusées ainsi,
          // l'accueil gardait une photo d'exemple) : UNE seule nouvelle création, description durcie, et seulement si le
          // prix le plus haut d'une photo et de son contrôle tient dans ce qui reste du plafond accordé. Une erreur du
          // fournisseur n'est jamais relancée : elle sort par le « catch » plus bas, sans reprise.
          if (problems.length && refusedForPeople(problems)) {
            // Décision gardée (point de reprise) : à la reprise de la tâche, une reprise déjà payée n'est pas recomptée.
            const go = await ctx.step(`photo-retry-ok:${uid}:${file}`, async () => { const cost = retryCost(); return cost == null ? "inconnu" as const : cost <= a.capMicro - jobSpentMicro(ctx.job.id) ? "oui" as const : "plafond" as const; });
            if (go === "oui") {
              report.photosReprises++;
              assetId = await create(true);
              const again = await check(assetId, true);
              if (again.length) { report.photosFailed++; report.problems.push(`photo ${file} ratée au contrôle deux fois, reprise comprise (${again.join(" ; ").slice(0, 200)}) : non posée, à refaire avec ton accord (un cadre vide tient sa place)`); continue; }
              problems = [];
            } else problems = [...problems, go === "inconnu" ? "reprise non tentée : prix d'une photo inconnu" : "reprise non tentée : le plafond accordé ne le permettait pas"];
          }
          if (problems.length) { report.photosFailed++; report.problems.push(`photo ${file} ratée au contrôle (${problems.join(" ; ").slice(0, 200)}) : non posée, à refaire avec ton accord (un cadre vide tient sa place)`); continue; }
        }
        if (real) report.photosReal++; else if (mine) report.photosClient++; else report.photosMade++;
        t = loadCustomTheme(p.id)!;
        const cur = allSections(t).find((y) => y.s.uid === uid);
        if (cur) { cur.s.html = sectionHtml(cur.s).split(ph.find).join(assetUrl({ id: assetId })); t = saveCustomTheme(p.id, t, { history: false }); }
      } catch (e) { report.problems.push(`photo ${file} non créée (${(e as Error).message.slice(0, 120)})`); }
    }
  }

  // Aucune photo d'exemple ne reste en silence (décision du 10 novembre 2026).
  if (a.photos !== false && a.newPhotos !== false) {
    const stay = photoSlots(loadCustomTheme(p.id)!, { business: p.business === "services" ? "services" : "products", productPhotos: true }).filter((x) => x.kind !== "produit").length;
    if (stay) report.problems.push(`${stay} photo(s) d'exemple encore en place : à créer (custom.build) ou à remplacer par tes images`);
  }
  if (report.photosLeft) report.problems.push(`${report.photosLeft} photo(s) d'exemple encore à remplacer : aucune photo créée à ta demande, elles le seront au second montage`);

  // 3) Regards en image (13 novembre 2026) : l'accueil et la page qui vend, capturés sur téléphone puis regardés par un
  //    modèle qui voit (« est-ce que ça donne envie ? »). Rien n'est corrigé tout seul : c'est dit au client. Seulement sur
  //    le montage qui pose les photos (le site fini) : un montage de textes seuls, ou sans photo créée, n'est pas regardé.
  if (a.photos !== false && a.newPhotos !== false && (!customBrandDeps.write || customBrandDeps.look)) {
    const missed: string[] = [];
    try {
      const now = loadCustomTheme(p.id)!;
      const sell = now.pages.find((x) => /^product/.test(x.key))?.key ?? now.pages.find((x) => x.key === "prestations")?.key;
      const shots = await customThemePageShots(p.id, ["home", ...(sell ? [sell] : [])].slice(0, LOOK_PAGES_MAX));
      if (!shots.length) { missed.push("aucun navigateur pour capturer les pages"); report.problems.push("pages non regardées en image (aucun navigateur pour les capturer) : regarde-les sur ton téléphone"); }
      const seen: LooksReport = { pages: [], problemes: 0 }, failed: { page: string; why: string }[] = [];
      const sells = products.length ? products.slice(0, 6).map((x) => x.data.title).join(", ") : (p.product?.name ?? p.product?.category ?? "");
      for (const s of shots) {
        // Une page dont le regard échoue ne fait plus tomber celui de l'autre page.
        try {
          const look = await ctx.step(`look:${now.rev}:${s.key}`, async () => {
            const prompt = lookPrompt({ brand: name, sells, page: s.label, concept: now.concept }), usageKey = `${ctx.job.id}:look:${s.key}`;
            return LookSchema.parse(customBrandDeps.look ? await customBrandDeps.look(prompt, s.data, usageKey)
              : await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-look", costCapMicro: a.capMicro }, () => llmJson({ task: "quality_control", userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey, promptKey: "syna-custom-look-1", system: LOOK_SYSTEM, prompt, images: [{ data: s.data, label: `page ${s.label} sur téléphone` }], maxTokens: 1500, maxOutputTokens: 3000, routing: { difficulty: "standard", prefer: CHECK_MODEL } } as LlmCall, LookSchema)));
          });
          seen.pages.push({ page: s.label, envie: look.cliente.envie, beau: look.directeurArtistique.note, avis: [look.cliente.avis, look.directeurArtistique.avis].filter(Boolean).join(" ").slice(0, 400) });
          const found = lookProblems(s.label, look);
          seen.problemes += found.length;
          report.problems.push(...found);
        } catch (e) { failed.push({ page: s.label, why: (e as Error).message.slice(0, 120) }); }
      }
      if (failed.length) { missed.push(...failed.map((f) => `${f.page} : ${f.why}`)); report.problems.push(`pages non regardées en image (${failed[0].why}) : ${failed.map((f) => f.page).join(", ")}`); }
      if (seen.pages.length) report.regards = seen;
    } catch (e) { missed.push((e as Error).message.slice(0, 120)); report.problems.push(`pages non regardées en image (${(e as Error).message.slice(0, 120)})`); }
    // Dit à part, en clair (la liste des problèmes est coupée dans le compte rendu : ce point ne doit jamais s'y perdre).
    if (missed.length) report.regardNonFait = `${report.regards ? "une partie des pages n'a pas pu être regardée en image" : "je n'ai pas pu regarder le site en image"} (${missed.join(" ; ").slice(0, 300)})`;
  }
  ctx.progress(1, L("Thème monté à ta marque", "Theme built for your brand"));
  if (a.conversationId) { try { updateJourney(a.conversationId, (x) => setStep(x, 6, "review", L("site monté à la marque, à voir dans la Boutique", "custom theme built"))); } catch { /* fil supprimé */ } }
  notify(p.userId, p.id, report.problems.length ? L("Ton site est monté : des points restent à voir", "Your custom theme is built: some points remain") : L("Ton site est monté à ta marque", "Your custom theme is built"), L("Il est en place dans l'onglet Boutique.", "It is in the Boutique tab."), report.problems.length ? "warning" : "success");
  return { ...report, version: loadCustomTheme(p.id)?.rev ?? null };
}

export const customBrandHandlers: Record<string, (ctx: JobContext) => Promise<unknown>> = {
  [CUSTOM_BRAND_JOB]: (ctx) => runCustomBrandJob(ctx),
};
