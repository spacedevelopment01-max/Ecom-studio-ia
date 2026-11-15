/**
 * La tenue de la marque et les sections « à tenue » du thème sur mesure (13 novembre 2026).
 *
 * Retour du propriétaire : « juste changer les images et les textes ferais déjà des thèmes trop basique car les
 * sections sur le studio sont loin d'être à la hauteur » ; puis, devant les écrans faits à la main (un fauteuil, un sac
 * de voyage) : « tu t'arrête pas tant que le résultat n'est pas le même que tu m'a envoyé exactement le meme ».
 *
 * Deux idées :
 *  1) LA TENUE : la façon dont tout le site s'habille, tirée de la marque. Couleurs et polices du projet, plus cinq
 *     réglages choisis par le concepteur : les titres, la forme des boutons, le cadre des photos, le fond, les petits
 *     textes. Le Studio la pose sur le thème (attributs data-tn-*, variables --tn-*) ; toutes les sections à tenue la
 *     prennent, du menu au pied de page.
 *  2) LES CONSTRUCTIONS : une section à tenue a plusieurs façons d'être bâtie (attribut data-tn-c). SINA n'écrit pas
 *     de code : elle choisit la section, sa construction et la tenue ; le Studio fabrique.
 * Les sections à tenue vont avec les deux familles (leur allure vient de la marque, pas d'une famille). Feuille :
 * public/sections/tenue.css, écrite à la main. Gratuit, sans IA.
 */
import { z } from "zod";
import type { LibSection, Trait } from "./library";
import { TENUE_TAG, VOLET, ph, sec, type Construction, type TenueSection } from "./tenue-base";
import { PRODUIT_SECTIONS } from "./tenue-produit";
import { SERVICES_SECTIONS } from "./tenue-services";
import { RECIT_SECTIONS } from "./tenue-recit";

export { TENUE_TAG, type Construction, type TenueSection } from "./tenue-base";

export const TenueSchema = z.object({
  /** Titres : fins (lettres fines, serrées), gras (très gras, très serrés), capitales. */
  titres: z.enum(["fins", "gras", "capitales"]).default("fins"),
  /** Boutons : pilule, droit, étiquette cousue, rond à ombre dure. */
  bouton: z.enum(["pilule", "droit", "etiquette", "ombre"]).default("pilule"),
  /** Cadre des photos : niche (arrondi en haut), droit, penché. */
  cadre: z.enum(["niche", "droit", "penche"]).default("droit"),
  /** Fond : uni, ou toile (trame fine). */
  fond: z.enum(["uni", "toile"]).default("uni"),
  /** Petits textes : normaux (italique des titres), ou à la machine. */
  petits: z.enum(["normal", "machine"]).default("normal"),
  /** Le signe pris sur le produit ou le métier, en quelques mots (« la niche du mur », « l'étiquette cousue ») : dit au client. */
  signe: z.string().max(120).default(""),
});
export type Tenue = z.infer<typeof TenueSchema>;
export const DEFAULT_TENUE: Tenue = TenueSchema.parse({});

/**
 * La tenue telle que la rend le concepteur (un modèle) : lue avec indulgence. Le fournisseur ne fait pas respecter les
 * listes de choix (elles ne sont qu'indiquées) : un accent (« étiquette »), une majuscule ou une valeur inconnue ne
 * doivent jamais faire échouer un appel déjà payé. Une valeur inconnue prend le réglage par défaut ; le signe est coupé.
 */
const plain = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : v);
const pick = <const T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) => z.preprocess(plain, z.enum(values)).catch(fallback as never) as unknown as z.ZodType<T[number]>;
export const TenuePickSchema = z.object({
  titres: pick(["fins", "gras", "capitales"], "fins"),
  bouton: pick(["pilule", "droit", "etiquette", "ombre"], "pilule"),
  cadre: pick(["niche", "droit", "penche"], "droit"),
  fond: pick(["uni", "toile"], "uni"),
  petits: pick(["normal", "machine"], "normal"),
  signe: z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, 120) : ""), z.string()),
});

export const TENUE_CHOICES = `titres : « fins » (lettres fines et serrées, pour une marque calme ou soignée), « gras » (très gras, très serrés, pour une marque franche, brute, de terrain), « capitales » (tout en capitales, pour une marque joyeuse ou sportive) ; bouton : « pilule » (arrondi plein), « droit » (angles vifs), « etiquette » (une étiquette cousue, pour ce qui est fabriqué, cousu, d'atelier), « ombre » (rond à ombre dure, joueur) ; cadre : « niche » (photos arrondies en haut, comme une niche ou une arche), « droit », « penche » (photo penchée, bordée, joueuse) ; fond : « uni » ou « toile » (trame fine, pour le textile, le papier, l'artisanat) ; petits : « normal » ou « machine » (petits textes à la machine à écrire, pour l'outil, le technique) ; signe : en quelques mots, le signe pris sur le produit ou le métier de CETTE marque et repris à plusieurs endroits (la niche du mur, l'étiquette cousue, la sangle).`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
type Palette = { dark?: string; primary?: string; secondary?: string; accent?: string; light?: string };

/** Couleurs de la tenue, tirées de la palette de la marque. */
export function tenueCss(palette: Palette | null | undefined, tenue: Tenue | null | undefined, monoFontCss = "", /** Graisse des titres quand la police de la marque en a une plus forte que la normale (tenue « gras »). */ poids: number | null = null): string {
  const pal = palette ?? {};
  const fond = pal.light ?? "#F6F1E7", encre = pal.dark ?? "#1F1B16", accent = pal.primary ?? encre;
  const doux = pal.secondary ?? `color-mix(in srgb,${fond} 86%,${encre})`;
  const vars: Record<string, string> = {
    "--tn-fond": fond, "--tn-encre": encre, "--tn-accent": accent, "--tn-doux": doux,
    "--tn-texte": `color-mix(in srgb,${encre} 90%,${fond})`, "--tn-sourd": `color-mix(in srgb,${encre} 62%,${fond})`,
    "--tn-bouton": encre, "--tn-sur-bouton": `color-mix(in srgb,${fond} 70%,#fff)`,
    "--tn-arrondi": tenue?.cadre === "droit" || !tenue ? "0px" : "14px",
    ...(poids && poids !== 400 ? { "--tn-poids": String(poids) } : {}),
  };
  return `${monoFontCss}\n.ctw{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;
}
/** Attributs posés sur le thème : chaque section à tenue les lit. */
export function tenueAttrs(tenue: Tenue | null | undefined): string {
  const t = tenue ?? DEFAULT_TENUE;
  return ` data-tn-titres="${t.titres}" data-tn-bouton="${t.bouton}" data-tn-cadre="${t.cadre}" data-tn-fond="${t.fond}" data-tn-petits="${t.petits}"`;
}
/** Ce qui manque au dossier s'affiche en jaune dans l'aperçu du Studio, sans crochets : « [À compléter : délai] ». */
export const markMissing = (html: string): string => html.replace(/\[À compléter(?:\s*:\s*([^\]<]{1,80}))?\]/g, (_m, what: string | undefined) => `<mark class="tn-manque">À compléter${what ? ` : ${what.trim()}` : ""}</mark>`);

const FORMES = `<g class="tn-forme" data-f="boite"><rect x="52" y="36" width="106" height="92" rx="8" fill="var(--tn-accent)"/><path d="M52 62h106" stroke="var(--tn-encre)" stroke-opacity=".25" stroke-width="3"/></g><g class="tn-forme" data-f="fauteuil"><path d="M50 96c-6-40 14-64 55-64s61 24 55 64c-2 14-10 22-22 22H72c-12 0-20-8-22-22z" fill="var(--tn-accent)"/><path d="M66 92c0-10 14-16 39-16s39 6 39 16-14 14-39 14-39-4-39-14z" fill="var(--tn-encre)" fill-opacity=".16"/><path d="M70 118l-5 16M140 118l5 16" stroke="var(--tn-encre)" stroke-width="6" stroke-linecap="round"/></g><g class="tn-forme" data-f="sac"><path d="M78 52c0-22 54-22 54 0" fill="none" stroke="var(--tn-encre)" stroke-width="6"/><rect x="56" y="50" width="98" height="84" rx="14" fill="var(--tn-accent)"/><rect x="72" y="84" width="66" height="34" rx="6" fill="var(--tn-encre)" fill-opacity=".16"/></g><g class="tn-forme" data-f="flacon"><rect x="90" y="30" width="30" height="20" rx="3" fill="var(--tn-encre)"/><path d="M78 62c0-8 6-12 12-12h30c6 0 12 4 12 12v60c0 8-6 12-12 12H90c-6 0-12-4-12-12z" fill="var(--tn-accent)"/></g>`;

/** Le socle des sections à tenue. Leurs textes sont des exemples (une maison de thé, comme le reste de la bibliothèque). */
const SOCLE_SECTIONS: TenueSection[] = [
  sec({
    id: "tn-entete", title: "En-tête à la tenue de la marque", kind: "En-tête · tout le site", role: "en-tête",
    does: "Le menu, le nom de la marque et le panier, dans la tenue de la marque. Le menu s'ouvre sous l'en-tête, en grands mots.",
    constructions: [{ key: "centre", label: "le nom au centre, le menu à gauche, le panier à droite" }, { key: "gauche", label: "le nom à gauche, « Menu » et le panier en mots à droite" }, { key: "sangle", label: "une bande sombre comme une sangle, le nom sur une étiquette cousue" }],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 54 },
    html: `<section class="tn tn-entete"><details class="tn-menu"><summary aria-label="Menu"><i></i><b>Menu</b></summary><nav><a href="#" onclick="return false">Accueil</a><a href="#" onclick="return false">Boutique</a><a href="#" onclick="return false">Notre histoire</a><a href="#" onclick="return false">Aide</a><a href="#" onclick="return false">Contact</a></nav></details><span class="tn-nom lg">Brindi</span><button type="button" class="tn-pan" aria-label="Panier">Panier <u>(</u><span>0</span><u>)</u></button></section>`,
  }),
  sec({
    id: "tn-ouverture", title: "Ouverture à la tenue de la marque", kind: "Ouverture · accueil", role: "ouverture",
    does: "Le premier écran de l'accueil : une grande photo, un titre, une phrase et un seul bouton. Trois constructions selon la photo et le tempérament de la marque.",
    constructions: [{ key: "dans-la-photo", label: "photo pleine, le titre posé dans la partie calme du HAUT de la photo, le texte et le bouton dessous (la photo garde son sujet en bas)" }, { key: "titre-puis-cadre", label: "le grand titre d'abord, puis la photo dans le cadre de la marque, le bouton à cheval sur la photo" }, { key: "titre-geant", label: "une petite étiquette, un titre très grand, puis la photo sur toute la largeur, le bouton à cheval sur la photo" }],
    trait: { fond: "photo", densite: "aérée", photos: 1, hauteur: 710 },
    html: `<section class="tn tn-ouverture"><div class="tn-ph" ${ph("hero.jpg")}></div><div class="tn-in"><span class="tn-etq">Thés et infusions bio</span><small>Le thé vert au jasmin</small><h1>Pose ton écran.<br>Respire.</h1></div><div class="tn-bas"><p>Quelques minutes, une tasse chaude, plus rien d'autre. Le reste de la journée attendra.</p><a class="tn-bt" href="#" onclick="return false">Choisir mon mélange</a></div></section>`,
  }),
  sec({
    id: "tn-bande", title: "Bande de photo", kind: "Respiration · toutes les pages", role: "mise en avant",
    does: "Un détail du produit ou du lieu, en bande étroite sur toute la largeur, sans texte : une respiration entre deux parties.",
    trait: { fond: "photo", densite: "aérée", photos: 1, hauteur: 92 },
    html: `<section class="tn tn-bande"><div class="tn-ph" ${ph("infusion.jpg")}></div></section>`,
  }),
  sec({
    id: "tn-de-pres", title: "De près", kind: "Détails · accueil et fiche produit", role: "contenu",
    does: "Trois photos de détail dans le cadre de la marque, chacune avec une ligne. Sans titre ni légende, elle sert de bande de trois photos sous une ouverture.",
    constructions: [{ key: "avec-titre", label: "un titre court, trois photos, une ligne sous chacune" }, { key: "sans-titre", label: "trois photos seules, en bande" }],
    trait: { fond: "clair", densite: "moyenne", photos: 3, hauteur: 280 },
    html: `<section class="tn tn-de-pres"><h2>De près.</h2><div class="tn-trois"><figure><div class="tn-ph" ${ph("seches.jpg")}></div><figcaption>Des feuilles entières, roulées à la main.</figcaption></figure><figure><div class="tn-ph" ${ph("jasmin.jpg")}></div><figcaption>De vraies fleurs de jasmin.</figcaption></figure><figure><div class="tn-ph" ${ph("infuseur.jpg")}></div><figcaption>Une cuillère par tasse.</figcaption></figure></div></section>`,
  }),
  sec({
    id: "tn-achat", title: "Bloc d'achat à la tenue de la marque", kind: "Achat · fiche produit", role: "produit vedette",
    does: "Le haut de la fiche produit : les vraies photos du produit (la grande et ses vignettes), son nom, son vrai prix, une phrase, le bouton d'achat, la livraison et les retours du client. Ce qui manque au dossier s'écrit « [À compléter] », jamais inventé. Une barre d'achat reste en bas de l'écran si le client la coche.",
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 900 },
    html: `<section class="tn tn-achat" data-tn-achat><div class="tn-galerie"><div class="tn-grande tn-ph" ${ph("sachet.jpg")}></div><div class="tn-vignettes"><i class="tn-ph" ${ph("sachet.jpg")}></i></div></div><small>Le thé</small><h1>Thé vert jasmin</h1><div class="tn-prix">Prix : [À compléter]</div><p>Des feuilles fines et de vraies fleurs de jasmin, pour une tasse douce qui s'ouvre dès que l'eau chaude la touche.</p><div class="tn-option"><i></i><span>Sachet de 100 g</span></div><a class="tn-bt" href="#" onclick="return false" data-pogo>Ajouter au panier</a><ul class="tn-reperes"><li>Livraison : [À compléter]</li><li>Retours : [À compléter]</li></ul><div class="tn-barre"><b>Thé vert jasmin</b><a class="tn-bt" href="#" onclick="return false" data-pogo>Ajouter au panier</a></div></section>`,
  }),
  sec({
    id: "tn-description", title: "Description en volets", kind: "Description · fiche produit", role: "produit",
    does: "La description racontée du produit, en volets qui s'ouvrent l'un sous l'autre, juste sous le bloc d'achat. Le premier est ouvert.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 260 },
    html: `<section class="tn tn-volets" data-tn-c="sans-titre"><h2>En détail.</h2><div class="tn-liste">${VOLET("Son rôle", "La pause de l'après-midi, quand on veut ralentir sans s'endormir.", true)}${VOLET("Ce qu'il y a dedans", "Du thé vert, des fleurs de jasmin. Rien d'autre.")}${VOLET("Comment le préparer", "[À compléter : quantité, température, durée]")}</div></section>`,
  }),
  sec({
    id: "tn-emotion", title: "Grande photo et sa phrase", kind: "Émotion · toutes les pages", role: "mise en avant",
    does: "Une grande photo de scène sur toute la largeur, avec une seule phrase posée sur sa partie calme du haut. Le moment d'émotion de la page.",
    trait: { fond: "photo", densite: "aérée", photos: 1, hauteur: 514 },
    html: `<section class="tn tn-emotion"><div class="tn-ph" ${ph("fenetre.jpg")}></div><h2>La journée s'arrête<br>à la première gorgée.</h2></section>`,
  }),
  sec({
    id: "tn-places", title: "En situation", kind: "Scènes · fiche produit et accueil", role: "contenu",
    does: "Un titre, une ligne, puis une file de photos de scène dans le cadre de la marque, chacune nommée : où le produit se pose, quand il sert.",
    trait: { fond: "clair", densite: "moyenne", photos: 2, hauteur: 440 },
    html: `<section class="tn tn-places"><h2>Quand le boire.</h2><p>Trois moments où il fait la différence.</p><div class="tn-file"><figure><div class="tn-ph" ${ph("nl-tasse.jpg")}></div><figcaption>Au réveil</figcaption></figure><figure><div class="tn-ph" ${ph("film-affiche.jpg")}></div><figcaption>Après le déjeuner</figcaption></figure></div></section>`,
  }),
  sec({
    id: "tn-mesures", title: "Mesures en schéma", kind: "Mesures · fiche produit", role: "produit",
    does: "Le dessin simple du produit avec ses mesures repérées par des lettres, et le tableau des mesures. Les vraies mesures du client seulement : ce qui manque s'écrit « [À compléter] ». Quatre dessins au choix.",
    constructions: [{ key: "boite", label: "une boîte ou un paquet" }, { key: "fauteuil", label: "un fauteuil ou un meuble" }, { key: "sac", label: "un sac, un bagage ou une housse" }, { key: "flacon", label: "un flacon ou une bouteille" }],
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 420 },
    html: `<section class="tn tn-mesures"><div class="tn-carte"><h2>Ses mesures.</h2><svg viewBox="0 0 210 150" aria-hidden="true">${FORMES}<path d="M46 144h118M46 139v10M164 139v10" stroke="var(--tn-encre)" stroke-width="1.6" fill="none"/><path d="M184 30v104M179 30h10M179 134h10" stroke="var(--tn-encre)" stroke-width="1.6" fill="none"/><circle cx="105" cy="144" r="9" fill="var(--tn-encre)"/><text x="105" y="148" text-anchor="middle" font-size="11" font-weight="700" fill="var(--tn-sur-bouton)">A</text><circle cx="184" cy="82" r="9" fill="var(--tn-encre)"/><text x="184" y="86" text-anchor="middle" font-size="11" font-weight="700" fill="var(--tn-sur-bouton)">B</text></svg><table><tr><td><b>A</b>Largeur</td><td>[À compléter]</td></tr><tr><td><b>B</b>Hauteur</td><td>[À compléter]</td></tr><tr><td>Poids</td><td>[À compléter]</td></tr></table></div></section>`,
  }),
  sec({
    id: "tn-questions", title: "Questions en volets", kind: "Questions · toutes les pages", role: "aide",
    does: "Les vraies questions avant l'achat, en volets, sous un titre court. Une réponse que le dossier ne donne pas s'écrit « [À compléter] ».",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 330 },
    html: `<section class="tn tn-volets"><h2>Avant de choisir.</h2><div class="tn-liste">${VOLET("Combien de tasses dans un sachet ?", "[À compléter : nombre de tasses]", true)}${VOLET("Et s'il ne me plaît pas ?", "[À compléter : retours]")}${VOLET("Comment le conserver ?", "À l'abri de la lumière, dans son sachet refermé.")}</div></section>`,
  }),
  sec({
    id: "tn-final", title: "Appel final", kind: "Appel à agir · fin de page", role: "conversion",
    does: "Une bande sombre en fin de page : une dernière phrase et le bouton d'achat. La page ne finit jamais sans un moyen d'agir.",
    trait: { fond: "sombre", densite: "aérée", photos: 0, hauteur: 250 },
    html: `<section class="tn tn-final tn-sombre"><h2>Cinq minutes.<br>Rien que pour toi.</h2><a class="tn-bt" href="#" onclick="return false">Choisir mon mélange</a></section>`,
  }),
  sec({
    id: "tn-404", title: "Page introuvable à la tenue de la marque", kind: "Page · erreur", role: "404",
    does: "Un mot dans le ton de la marque, une photo dans son cadre, et trois façons de repartir : chercher, revenir à l'accueil, deux liens.",
    trait: { fond: "clair", densite: "aérée", photos: 1, hauteur: 720 },
    html: `<section class="tn tn-404"><div class="tn-ph" ${ph("bol.jpg")}></div><small>Page introuvable</small><h1>Cette page<br>a trop infusé.</h1><p>Elle n'existe plus, ou son adresse a changé. Le thé, lui, t'attend toujours.</p><div class="tn-champ"><span>Chercher sur le site</span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="1.8"/></svg></div><a class="tn-bt" href="#" onclick="return false">Retour à l'accueil</a><div class="tn-liens"><a href="#" onclick="return false">Boutique</a><a href="#" onclick="return false">Contact</a></div></section>`,
  }),
  sec({
    id: "tn-contact", title: "Contact à la tenue de la marque", kind: "Page · contact", role: "contact",
    does: "Un grand titre, une phrase, le formulaire (nom, e-mail, message) et les coordonnées du client dans le cadre de la marque. Les coordonnées viennent du projet ; ce qui manque s'écrit « [À compléter] ».",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 730 },
    html: `<section class="tn tn-contact"><h1>Écris-nous.</h1><p>Une question sur un mélange, une commande en cours : nous lisons tout.<br>Réponse sous [À compléter : délai]</p><form onsubmit="return false"><label>Ton nom</label><label>Ton e-mail</label><label class="tn-haut">Ton message</label><a class="tn-bt" href="#" onclick="return false">Envoyer</a></form><div class="tn-infos"><b>Nous joindre</b>E-mail : [À compléter : e-mail]<br>Horaires : [À compléter]</div></section>`,
  }),
  sec({
    id: "tn-atouts", title: "Trois atouts vrais", kind: "Atouts · accueil et fiche produit", role: "confiance",
    does: "Trois faits vrais et courts sur le produit ou le métier, l'un sous l'autre, chacun avec une ligne. Jamais un chiffre ni une promesse que le dossier ne donne pas.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 300 },
    html: `<section class="tn tn-atouts"><ul><li><b>Tout est bio</b><span>Du thé, des fleurs, rien d'autre.</span></li><li><b>Assemblé à la main</b><span>Par petites quantités, à la commande.</span></li><li><b>En vrac</b><span>Dans un sachet qui se referme.</span></li></ul></section>`,
  }),
  sec({
    id: "tn-produits", title: "Les produits en cartes", kind: "Produits · accueil et boutique", role: "produits",
    does: "Les vrais produits du catalogue en cartes : la vraie photo de chacun dans le cadre de la marque, son nom, son vrai prix. Chaque carte mène à la fiche du produit. Rien d'affiché pour un produit sans prix : « [À compléter] ».",
    trait: { fond: "clair", densite: "moyenne", photos: 2, hauteur: 420 },
    html: `<section class="tn tn-produits" data-tn-produits><h2>Les mélanges.</h2><div class="tn-cartes"><a class="tn-carte-p" href="#" onclick="return false" data-go="product"><div class="tn-ph" ${ph("sachet.jpg")}></div><b>Thé vert jasmin</b><span>[À compléter : prix]</span></a><a class="tn-carte-p" href="#" onclick="return false" data-go="product"><div class="tn-ph" ${ph("sachet-ouvert.jpg")}></div><b>Rooibos vanille</b><span>[À compléter : prix]</span></a></div></section>`,
  }),
  sec({
    id: "tn-histoire", title: "L'histoire de la marque", kind: "Page · à propos", role: "à propos",
    does: "La page de la marque : un grand titre, une photo dans son cadre, l'histoire vraie en deux paragraphes et la signature de la personne. Aucun chiffre ni date que le dossier ne donne pas.",
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 900 },
    html: `<section class="tn tn-histoire"><h1>D'où ça vient.</h1><div class="tn-ph" ${ph("bureau.jpg")}></div><p>Brindi est né d'une envie simple : une vraie pause, sans écran, avec quelque chose de bon dans la tasse.</p><p>[À compléter : l'histoire de la personne, son métier, son lieu]</p><small>[À compléter : prénom de la personne]</small></section>`,
  }),
  sec({
    id: "tn-panier", title: "Panier à la tenue de la marque", kind: "Page · panier", role: "panier",
    does: "La page panier, sobre : le produit choisi avec sa vraie photo et son vrai prix, le total, le bouton de commande. Sur Shopify, ce bouton ouvre le paiement de Shopify.",
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 520 },
    html: `<section class="tn tn-panier" data-tn-panier><h1>Ton panier.</h1><div class="tn-ligne"><div class="tn-ph" ${ph("sachet.jpg")}></div><div><b>Thé vert jasmin</b><span>Quantité : 1</span></div><span class="tn-prix-l">[À compléter : prix]</span></div><div class="tn-total"><span>Total</span><span class="tn-prix-t">[À compléter : prix]</span></div><a class="tn-bt" href="#" onclick="return false">Passer commande</a><p>Livraison : [À compléter]</p></section>`,
  }),
  sec({
    id: "tn-compte", title: "Compte à la tenue de la marque", kind: "Page · compte", role: "compte",
    does: "La page de connexion, sobre : e-mail, mot de passe, un bouton, et le lien pour créer un compte.",
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-compte"><h1>Ton compte.</h1><p>Retrouve tes commandes et tes adresses.</p><form onsubmit="return false"><label>Ton e-mail</label><label>Ton mot de passe</label><a class="tn-bt" href="#" onclick="return false">Me connecter</a></form><div class="tn-liens"><a href="#" onclick="return false">Créer un compte</a></div></section>`,
  }),
  sec({
    id: "tn-legal", title: "Informations légales en volets", kind: "Page · légal", role: "légal",
    does: "Les informations légales en volets : mentions, conditions de vente, confidentialité, retours, cookies. Chaque texte vient du client : ce qui manque s'écrit « [À compléter] », rien n'est inventé.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-legal"><h1>Informations légales</h1><div class="tn-liste">${VOLET("Mentions légales", "[À compléter : raison sociale, adresse, numéro d'immatriculation, hébergeur]", true)}${VOLET("Conditions générales de vente", "[À compléter : conditions de vente]")}${VOLET("Confidentialité", "[À compléter : politique de confidentialité]")}${VOLET("Retours et remboursements", "[À compléter : politique de retours]")}${VOLET("Cookies", "[À compléter : cookies utilisés]")}</div></section>`,
  }),
  sec({
    id: "tn-pied", title: "Pied de page à la tenue de la marque", kind: "Pied de page · tout le site", role: "pied de page",
    does: "Une bande sombre et sobre en bas de toutes les pages : les liens utiles, rien de plus.",
    trait: { fond: "sombre", densite: "aérée", photos: 0, hauteur: 62 },
    html: `<footer class="tn tn-pied tn-sombre"><a href="#" onclick="return false">Livraison</a><a href="#" onclick="return false">Retours</a><a href="#" onclick="return false">Mentions légales</a></footer>`,
  }),
];

/** Toutes les sections à tenue : le socle, puis les modules (produit et achat, métiers de services, récit et navigation). */
export const TENUE_SECTIONS: TenueSection[] = [...SOCLE_SECTIONS, ...PRODUIT_SECTIONS, ...SERVICES_SECTIONS, ...RECIT_SECTIONS];
/** Feuilles et scripts des sections à tenue, dans l'ordre de chargement (un fichier absent est ignoré). */
export const TENUE_FILES = { css: ["tenue.css", "tenue-produit.css", "tenue-services.css", "tenue-recit.css"], js: ["tenue.js", "tenue-produit.js", "tenue-services.js", "tenue-recit.js"] };

const BY_ID = new Map(TENUE_SECTIONS.map((s) => [s.id, s]));
export const tenueSection = (id: string): TenueSection | null => BY_ID.get(id) ?? null;
export const isTenueSection = (l: Pick<LibSection, "tags"> | null | undefined) => !!l && (l.tags ?? []).includes(TENUE_TAG);
/** Constructions d'une section (vide : la section n'en a qu'une). */
export const constructionsOf = (id: string): Construction[] => BY_ID.get(id)?.constructions ?? [];
/** Construction retenue : celle demandée si elle existe, sinon la première de la section (ou aucune). */
export function validConstruction(id: string, wanted: string | null | undefined): string | null {
  const list = constructionsOf(id);
  if (!list.length) return null;
  return list.some((c) => c.key === wanted) ? wanted! : list[0].key;
}
export const tenueTraits = (): Record<string, Trait> => Object.fromEntries(TENUE_SECTIONS.map((s) => [s.id, s.trait]));

/** Vraies données du bloc d'achat à tenue : photos du produit, prix, livraison, retours. */
export type TenueBuy = { images: string[]; price: string | null; shipping: string | null; returns: string | null; /** Plus de stock : dit sous le prix, le bouton ne commande plus. */ soldOut?: boolean; /** Mentions vraies à dire près du prix (indice de réparabilité, paiement en plusieurs fois) : seulement celles que le client a confirmées. */ notes?: string[] };
/**
 * Pose les vraies données du produit dans le bloc d'achat à tenue : ses photos (la grande, puis jusqu'à cinq vignettes),
 * son vrai prix, la livraison et les retours du client. Ce qui manque reste « [À compléter] ». La barre d'achat reprend
 * le nom et le bouton du bloc.
 */
export function withTenueBuyBlock(html: string, d: TenueBuy | null): string {
  if (!/\sdata-tn-achat\b/.test(html)) return html;
  let out = html;
  if (d?.images.length) {
    const url = (u: string) => `style="background-image:url(${esc(u)})"`;
    out = out.replace(/(<div class="tn-grande tn-ph") style="[^"]*"/, `$1 ${url(d.images[0])}`);
    out = out.replace(/<div class="tn-vignettes">[\s\S]*?<\/div>/, d.images.length > 1 ? `<div class="tn-vignettes">${d.images.slice(0, 5).map((u) => `<i class="tn-ph" ${url(u)}></i>`).join("")}</div>` : "");
  }
  if (d?.price) out = out.replace(/<div class="tn-prix">[\s\S]*?<\/div>/, `<div class="tn-prix">${esc(d.price)}</div>`);
  // Rupture de stock : dite franchement ; le délai de retour n'est jamais inventé.
  if (d?.soldOut) out = out.replace(/(<div class="tn-prix">[\s\S]*?<\/div>)/, `$1<div class="tn-rupture">Épuisé pour l'instant. Retour en stock : [À compléter]</div>`).replace(/<a class="tn-bt"/g, '<a class="tn-bt tn-off" aria-disabled="true"');
  // Près du prix : l'indice de réparabilité, le paiement en plusieurs fois. Jamais affichés sans le fait confirmé par le client.
  if (d?.notes?.length) out = out.replace(/(<div class="tn-prix">[\s\S]*?<\/div>(?:<div class="tn-rupture">[\s\S]*?<\/div>)?)/, `$1<ul class="tn-pres-prix">${d.notes.slice(0, 3).map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`);
  if (d) out = out.replace(/<ul class="tn-reperes">[\s\S]*?<\/ul>/, `<ul class="tn-reperes"><li>Livraison : ${d.shipping ? esc(d.shipping) : "[À compléter]"}</li><li>Retours : ${d.returns ? esc(d.returns) : "[À compléter]"}</li></ul>`);
  // La barre d'achat suit le bloc : même nom, même bouton.
  const name = /<h1>([\s\S]*?)<\/h1>/.exec(out)?.[1]?.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").trim();
  const label = /<a class="tn-bt"[^>]*>([\s\S]*?)<\/a>/.exec(out)?.[1]?.replace(/<[^>]+>/g, "").trim();
  if (name && label) out = out.replace(/<div class="tn-barre">[\s\S]*?<\/div>/, `<div class="tn-barre"><b>${name}</b><a class="tn-bt" href="#" onclick="return false" data-pogo>${label}</a></div>`);
  return markMissing(out);
}

/** Vrais produits du catalogue pour les cartes et le panier à tenue. */
export type TenueProduct = { title: string; image: string | null; price: string | null; /** Page de sa fiche (clé de page) ; absente : la fiche commune. */ go?: string | null; /** Plus de stock sur aucune variante, et pas de commande permise. */ soldOut?: boolean; /** Ses familles (filtre de la page boutique). */ families?: string[]; /** Son prix en centimes (tri de la page boutique). */ cents?: number | null };
/**
 * Pose les vrais produits dans les cartes à tenue (huit au plus) et dans la ligne du panier (le premier produit). Sans
 * produit au catalogue, la section garde ses exemples, annoncés comme tels.
 */
export function withTenueProducts(html: string, products: TenueProduct[]): string {
  if (!products.length) return html;
  const pic = (u: string | null) => (u ? ` style="background-image:url(${esc(u)})"` : "");
  // La page boutique montre tout le catalogue ; une section de l'accueil, les huit premiers.
  const shop = /class="tn tn-catalogue/.test(html), max = shop ? 60 : 8;
  let out = html;
  // Sur la page boutique, chaque carte porte ses familles et son prix (filtre et tri), et garde son prix à côté de « Épuisé ».
  const card = (p: TenueProduct) => {
    const price = p.price ? esc(p.price) : "[À compléter : prix]";
    const data = shop ? ` data-tn-fams="${esc((p.families ?? []).join("|"))}"${p.cents != null ? ` data-tn-prix="${Math.round(p.cents)}"` : ""}` : "";
    return `<a class="tn-carte-p${p.soldOut ? " tn-epuise" : ""}" href="#" onclick="return false" data-go="${esc(p.go ?? "product")}"${data}><div class="tn-ph"${pic(p.image)}></div><b>${esc(p.title)}</b>${shop ? `<span>${price}</span>${p.soldOut ? "<em>Épuisé</em>" : ""}` : `<span>${p.soldOut ? "Épuisé" : price}</span>`}</a>`;
  };
  if (/\sdata-tn-produits\b/.test(out)) out = out.replace(/<div class="tn-cartes">[\s\S]*<\/div>(?=<\/section>)/, `<div class="tn-cartes">${products.slice(0, max).map(card).join("")}</div>`);
  if (/\sdata-tn-panier\b/.test(out)) {
    const p = products[0], price = p.price ? esc(p.price) : "[À compléter : prix]";
    out = out.replace(/(<div class="tn-ligne"><div class="tn-ph")[^>]*(><\/div><div><b>)[\s\S]*?(<\/b>)/, (_m, a: string, b: string, c: string) => `${a}${pic(p.image)}${b}${esc(p.title)}${c}`)
      .replace(/<span class="tn-prix-l">[\s\S]*?<\/span>/, `<span class="tn-prix-l">${price}</span>`).replace(/<span class="tn-prix-t">[\s\S]*?<\/span>/, `<span class="tn-prix-t">${price}</span>`);
  }
  return markMissing(out);
}

/** Une prestation du client (profil des services) : son nom, sa durée, son prix. */
export type TenuePrestation = { name: string; duration: string | null; price: string | null };
/**
 * Pose les vraies prestations du client dans une liste à tenue (« data-tn-prestations », lignes d'une liste
 * « tn-liste-p ») : le nom, la durée, le prix ; ce que le client n'a pas donné reste « [À compléter] ». Sans prestation
 * connue, la section garde ses lignes d'exemple, annoncées comme telles.
 */
export function withTenuePrestations(html: string, list: TenuePrestation[]): string {
  if (!list.length || !/\sdata-tn-prestations\b/.test(html)) return html;
  const row = (p: TenuePrestation) => `<li><b>${esc(p.name)}</b><span>Durée : ${p.duration ? esc(p.duration) : "[À compléter]"}</span><i>${p.price ? esc(p.price) : "[À compléter : prix]"}</i></li>`;
  // Une seule liste : toutes les prestations ; plusieurs listes (rubriques d'une carte) : la première les reçoit, les autres restent écrites.
  let done = false;
  return markMissing(html.replace(/(<ul class="tn-liste-p"[^>]*>)[\s\S]*?(<\/ul>)/g, (m, a: string, b: string) => { if (done) return m; done = true; return `${a}${list.slice(0, 40).map(row).join("")}${b}`; }));
}
