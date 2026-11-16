/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « coque » : ses pièces nouvelles (COQUE_SECTIONS) et les
 * façons de bâtir ajoutées à des pièces d'autres modules (COQUE_FACONS : identifiant de la pièce → ses constructions,
 * la première étant le rendu d'origine). Feuille : public/sections/tenue-coque.css. Règles : docs/sina-savoir/sections-a-tenue.md.
 *
 * LES HUIT EN-TÊTES (une clé chacun, voir ENTETES) tiennent dans trois pièces, parce que leur balisage diffère :
 *  - « tn-entete-liens » (menu visible sur ordinateur, replié sur téléphone) : classique, logo-centre, sur-photo,
 *    mega-colonnes, mega-produits, plein-ecran ;
 *  - « tn-entete-annonce » : annonce (la ligne de message est écrite dans la pièce) ;
 *  - « tn-entete-services » : services (le téléphone et le bouton de rendez-vous sont écrits dans la pièce).
 * L'en-tête du socle (« tn-entete » : centre, gauche, sangle) reste tel quel.
 *
 * LES SIX PIEDS DE PAGE (voir PIEDS) : deux existaient (« tn-pied-complet » : colonnes, grand-nom), un est une façon de
 * plus du pied complet (centre-minimal ; sa façon « centre », avec l'inscription, reste), trois sont des pièces nouvelles
 * (lettre d'information, services, réassurance et paiement).
 *
 * Le menu n'est jamais écrit à la main : menu.ts le calcule depuis les pages et le catalogue, et lui donne la forme de
 * la construction choisie. Tout s'ouvre sans script (cases à cocher cachées, lues par la feuille) : l'en-tête marche
 * dans l'aperçu et dans la boutique. Le petit script tenue-coque.js n'ajoute que du confort (Échap, clic à côté).
 */
import type { Construction, TenueSection } from "./tenue-base";
import { sec } from "./tenue-base";

const L = 'href="#" onclick="return false"';
const lien = (texte: string, go: string) => `<a ${L} data-go="${go}">${texte}</a>`;
const LOUPE = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>`;
const COMPTE = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.2-6 8-6s6.8 2 8 6"/></svg>`;
const SAC = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12.5H6L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>`;

/** Le bouton qui ouvre le menu : une case à cocher cachée (aucun script), le mot « Menu », puis « Fermer ». */
const OUVRIR = `<label class="tn-e-burger"><input type="checkbox" aria-label="Menu"><i aria-hidden="true"></i><b>Menu</b><em>Fermer</em></label>`;
const NOM = `<a class="tn-e-home" ${L} data-go="home"><span class="tn-nom lg">Brindi</span></a>`;
/** Liens d'exemple, neutres : le menu calculé (menu.ts) les remplace par les vraies pages et le vrai catalogue. */
const LIENS = `<div class="tn-e-liens">${lien("Accueil", "home")}${lien("Boutique", "shop")}${lien("Notre histoire", "about")}${lien("Aide", "aide")}${lien("Contact", "contact")}</div>`;
const MENU = `<nav class="tn-e-nav" aria-label="Menu principal">${LIENS}<div class="tn-e-bas"><a ${L} data-go="compte" data-tn-boutique>Mon compte</a></div></nav>`;
/** Recherche, compte, panier : retirés d'un site de services sans panier (attribut data-tn-boutique). */
const OUTILS = `<div class="tn-e-outils"><button type="button" class="tn-e-ic" aria-label="Rechercher" data-tn-boutique>${LOUPE}</button><a class="tn-e-ic tn-e-cpt" ${L} data-go="compte" aria-label="Mon compte" data-tn-boutique>${COMPTE}</a><button type="button" class="tn-pan" aria-label="Panier" data-tn-boutique>${SAC}<b>Panier</b> <u>(</u><span>0</span><u>)</u></button></div>`;
const BARRE = `<div class="tn-e-barre">${OUVRIR}${NOM}${MENU}${OUTILS}</div>`;

const MENU_VRAI = "Le menu est calculé depuis les vraies pages et le vrai catalogue ; il s'ouvre sans script, au doigt, à la souris et au clavier.";

const ENTETE_LIENS = sec({
  id: "tn-entete-liens", title: "En-tête à menu visible", kind: "En-tête · tout le site", role: "en-tête",
  does: `L'en-tête du thème unique : le nom de la marque, le menu écrit en toutes lettres sur ordinateur (replié derrière un bouton sur téléphone, dans un panneau qui prend l'écran), la recherche, le compte et le panier. Il reste en haut de l'écran quand on défile. ${MENU_VRAI} Six constructions : les deux grands menus demandent un catalogue rangé en familles (deux au moins), « sur-photo » demande une ouverture en photo pleine, « plein-ecran » va aux marques qui ont peu de pages et beaucoup de caractère. Sur un site de services, le panier, la recherche et le compte ne s'affichent pas.`,
  data: "le menu calculé (pages et catalogue), les familles du catalogue avec la photo d'un de leurs produits, les produits avec leur photo et leur prix",
  constructions: [
    { key: "classique", label: "le nom à gauche, le menu en toutes lettres au milieu, la recherche, le compte et le panier à droite ; sur téléphone : le nom à gauche, le bouton du menu à droite" },
    { key: "logo-centre", label: "le nom au centre, la recherche à gauche, le compte et le panier à droite, le menu sur une seconde ligne centrée dessous ; sur téléphone : le menu à gauche, le nom au centre, le panier à droite" },
    { key: "sur-photo", label: "posé par-dessus la grande photo d'ouverture de l'accueil, sans fond, en lettres claires ; il prend un fond plein dès qu'on défile et sur les pages sans photo d'ouverture" },
    { key: "mega-colonnes", label: "grand menu à colonnes avec images : sous le menu, un panneau sur toute la largeur, une colonne par famille avec la photo d'un de ses produits et ses liens ; sur téléphone : des rubriques qui se déplient, chacune avec sa vignette" },
    { key: "mega-produits", label: "grand menu à produits mis en avant : les familles à gauche, les vrais produits de la famille choisie à droite, avec photo et prix ; sur téléphone : les familles en onglets en haut du panneau, les produits défilent au doigt" },
    { key: "plein-ecran", label: "menu plein écran des marques éditoriales : le nom, le panier en mots et le seul mot « Menu » ; il ouvre un panneau sombre sur tout l'écran, les pages en très grands mots numérotés" },
  ],
  trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 60 },
  anim: "Le panneau du menu s'ouvre au toucher ; sur la photo, l'en-tête prend son fond en défilant.",
  html: `<section class="tn tn-entete-liens tn-ent">${BARRE}</section>`,
});

const ENTETE_ANNONCE = sec({
  id: "tn-entete-annonce", title: "En-tête avec bande d'annonce", kind: "En-tête · tout le site", role: "en-tête",
  does: `L'en-tête classique du thème unique, avec au-dessus du menu une ligne de message à la couleur de la marque : une seule phrase vraie, donnée par le client (la livraison, une fermeture, une nouveauté). Sans message vrai, prends « En-tête à menu visible » : jamais de fausse urgence ni d'offre inventée. ${MENU_VRAI} Sur un site de services, le panier, la recherche et le compte ne s'affichent pas.`,
  data: "le menu calculé (pages et catalogue) ; le message du moment, écrit avec les mots du client",
  constructions: [{ key: "annonce", label: "une ligne de message à la couleur de la marque, puis le nom à gauche, le menu en toutes lettres au milieu, la recherche, le compte et le panier à droite" }],
  trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 98 },
  anim: "Le panneau du menu s'ouvre au toucher.",
  html: `<section class="tn tn-entete-annonce tn-ent"><p class="tn-e-msg">[À compléter : message du moment]</p>${BARRE}</section>`,
});

const ENTETE_SERVICES = sec({
  id: "tn-entete-services", title: "En-tête de services, téléphone et rendez-vous", kind: "En-tête · tout le site", role: "en-tête", pour: "services",
  does: `L'en-tête compact d'un métier de services : le nom, le menu, et, toujours visibles sur téléphone comme sur ordinateur, le numéro de téléphone (on appelle d'un toucher) et un bouton « Rendez-vous » ou « Devis » qui mène à la page de prise de rendez-vous ou de demande de devis. Ni panier ni recherche de produits. ${MENU_VRAI}`,
  data: "le téléphone du client (profil des services, sinon fiche de l'entreprise) ; le menu calculé depuis les pages",
  constructions: [{ key: "services", label: "le nom à gauche, le menu au milieu, le téléphone et le bouton de rendez-vous à droite ; sur téléphone : le nom et le menu, puis une ligne toujours visible avec le numéro et le bouton" }],
  trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 116 },
  anim: "Le panneau du menu s'ouvre au toucher.",
  html: `<section class="tn tn-entete-services tn-ent"><div class="tn-e-barre">${OUVRIR}${NOM}<nav class="tn-e-nav" aria-label="Menu principal"><div class="tn-e-liens">${lien("Accueil", "home")}${lien("Prestations", "prestations")}${lien("Notre histoire", "about")}${lien("Contact", "contact")}</div></nav><ul class="tn-e-actions"><li><a class="tn-e-tel" ${L} data-tn-tel>[À compléter : téléphone]</a></li><li><a class="tn-bt" ${L} data-go="reservation">Rendez-vous</a></li></ul></div></section>`,
});

// ---------------------------------------------------------------- pieds de page

const LIENS_PIED = (liens: [string, string][]) => `<nav class="tn-p-liens" aria-label="Pied de page">${liens.map(([t, go]) => lien(t, go)).join("")}</nav>`;
const CAMION = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 8h15v14H3zM18 13h6l5 5v4H18z"/><circle cx="9" cy="23.5" r="2.5"/><circle cx="23" cy="23.5" r="2.5"/></svg>`;
const RETOUR = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 6l-5 5 5 5"/><path d="M4 11h15a8 8 0 0 1 0 16h-9"/></svg>`;
const CADENAS = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="14" width="20" height="14" rx="1.5"/><path d="M10.5 14v-3.5a5.5 5.5 0 0 1 11 0V14"/></svg>`;

const PIED_LETTRE = sec({
  id: "tn-pied-lettre", title: "Pied de page avec lettre d'information", kind: "Pied de page · tout le site", role: "pied de page",
  does: "Un pied de page sombre dont le sujet est l'inscription à la lettre : un grand titre, une phrase qui dit ce qu'on y reçoit, le champ et son bouton en grand ; les liens utiles viennent après, sur une ligne. Pour une marque qui écrit vraiment à ses clients ; aucune remise promise à l'inscription sans l'accord du client.",
  trait: { fond: "sombre", densite: "aérée", photos: 0, hauteur: 520 },
  html: `<footer class="tn tn-pied-lettre tn-sombre"><div class="tn-p-appel"><small>La lettre</small><h2>Des nouvelles,<br>de temps en temps.</h2><p>Les nouveautés et les coulisses, dans ta boîte. Rien d'autre.</p></div><form class="tn-form" onsubmit="return false"><label class="tn-champ"><input type="email" placeholder=" " autocomplete="email"><span>Ton e-mail</span></label><button type="submit" class="tn-ok">Je m'inscris</button></form><small class="tn-p-mot">Tu te désinscris quand tu veux.</small>${LIENS_PIED([["Boutique", "shop"], ["Notre histoire", "about"], ["Aide", "aide"], ["Contact", "contact"], ["Mentions légales", "legal"]])}<div class="tn-fin"><span class="tn-nom">Brindi</span><span>© Brindi</span></div></footer>`,
});

const PIED_SERVICES = sec({
  id: "tn-pied-services", title: "Pied de page de services", kind: "Pied de page · tout le site", role: "pied de page", pour: "services",
  does: "Le pied de page d'un métier de services, sombre : le nom, le téléphone en très grand (on appelle d'un toucher) et le bouton de devis ou de rendez-vous ; puis l'adresse avec le bouton d'itinéraire qui ouvre la vraie carte, les horaires jour par jour, et les villes où le professionnel se déplace. Tout vient du profil du client : rien n'est inventé, et aucun plan n'est dessiné.",
  data: "le téléphone, l'adresse, les horaires et la zone d'intervention du client (profil des services, sinon fiche de l'entreprise)",
  trait: { fond: "sombre", densite: "moyenne", photos: 0, hauteur: 640 },
  html: `<footer class="tn tn-pied-services tn-sombre"><div class="tn-p-appel"><span class="tn-nom">Brindi</span><p>Une question, un projet&nbsp;? Appelle : on te répond, et on te dit quand on vient.</p><ul class="tn-p-joindre"><li><a class="tn-p-tel" ${L} data-tn-tel>[À compléter : téléphone]</a></li><li><a class="tn-bt" ${L} data-go="devis">Demander un devis</a></li></ul></div><div class="tn-p-blocs"><div class="tn-p-bloc"><small>Nous trouver</small><p><span data-tn-adresse>[À compléter : adresse]</span><a class="tn-p-iti" ${L} data-tn-itineraire>Voir l'itinéraire</a></p></div><div class="tn-p-bloc"><small>Les horaires</small><table data-tn-horaires="jours"><tbody><tr><td colspan="2">[À compléter : jours et heures d'ouverture]</td></tr></tbody></table></div><div class="tn-p-bloc"><small>Nous nous déplaçons à</small><ul data-tn-zone="villes"><li>[À compléter : villes desservies]</li></ul></div></div><div class="tn-fin">${LIENS_PIED([["Mentions légales", "legal"], ["Confidentialité", "legal"], ["Contact", "contact"]])}<span>© Brindi</span></div></footer>`,
});

const PIED_REASSURANCE = sec({
  id: "tn-pied-reassurance", title: "Pied de page de réassurance et de paiement", kind: "Pied de page · tout le site", role: "pied de page", pour: "produits",
  does: "Un pied de page de boutique qui lève les derniers doutes avant l'achat : trois repères en grand (la livraison, les retours, le paiement) remplis avec les vraies conditions du client et les moyens de paiement que sa boutique accepte réellement, puis le nom, les liens utiles et la mention légale. Ce que le client n'a pas donné reste à compléter, jamais inventé.",
  data: "la livraison et les retours du client (fiche de l'entreprise) ; les moyens de paiement réellement acceptés (lus dans la boutique)",
  trait: { fond: "sombre", densite: "moyenne", photos: 0, hauteur: 560 },
  html: `<footer class="tn tn-pied-reassurance tn-sombre"><ul class="tn-p-gar" data-tn-garanties><li data-tn-cle="livraison">${CAMION}<b>Livraison</b><span>[À compléter : livraison]</span></li><li data-tn-cle="retours">${RETOUR}<b>Retours</b><span>[À compléter : retours]</span></li><li data-tn-cle="paiement">${CADENAS}<b>Paiement</b><span data-tn-paiements>[À compléter : moyens de paiement acceptés]</span></li></ul><div class="tn-p-bas"><span class="tn-nom">Brindi</span>${LIENS_PIED([["Boutique", "shop"], ["Notre histoire", "about"], ["Aide", "aide"], ["Contact", "contact"], ["Mentions légales", "legal"], ["Conditions de vente", "legal"]])}<span class="tn-p-c">© Brindi</span></div></footer>`,
});

export const COQUE_SECTIONS: TenueSection[] = [ENTETE_LIENS, ENTETE_ANNONCE, ENTETE_SERVICES, PIED_LETTRE, PIED_SERVICES, PIED_REASSURANCE];

/** Le pied complet (tenue-recit.ts) garde ses trois façons, dans l'ordre ; une quatrième, sans rien d'autre que l'essentiel. */
const PIED_MINIMAL: Construction = { key: "centre-minimal", label: "centré et minimal : le nom de la marque, les liens utiles sur une ligne, la mention légale ; ni phrase ni inscription" };
export const COQUE_FACONS: Record<string, Construction[]> = {
  "tn-pied-complet": [
    { key: "colonnes", label: "le nom et l'inscription d'un côté, les liens en colonnes de l'autre" },
    { key: "grand-nom", label: "les liens en colonnes, puis le nom de la marque en très grand tout en bas" },
    { key: "centre", label: "tout centré : le nom, l'inscription, les liens sur une ligne" },
    PIED_MINIMAL,
  ],
};

/** Un choix de coque : la pièce, sa construction (null : la pièce n'en a qu'une), et ce qu'on voit, dit en clair. */
export type Coque = { n: number; cle: string; nom: string; piece: string; construction: string | null; label: string };
const facon = (s: TenueSection, key: string) => s.constructions.find((c) => c.key === key)!.label;

/** Les huit en-têtes du thème unique (référence, partie 15), dans l'ordre décidé : une clé chacun. */
export const ENTETES: Coque[] = [
  { n: 1, cle: "classique", nom: "Classique, logo à gauche", piece: "tn-entete-liens", construction: "classique", label: facon(ENTETE_LIENS, "classique") },
  { n: 2, cle: "logo-centre", nom: "Logo centré", piece: "tn-entete-liens", construction: "logo-centre", label: facon(ENTETE_LIENS, "logo-centre") },
  { n: 3, cle: "sur-photo", nom: "Transparent sur la photo d'ouverture", piece: "tn-entete-liens", construction: "sur-photo", label: facon(ENTETE_LIENS, "sur-photo") },
  { n: 4, cle: "annonce", nom: "Avec bande d'annonce", piece: "tn-entete-annonce", construction: "annonce", label: facon(ENTETE_ANNONCE, "annonce") },
  { n: 5, cle: "mega-colonnes", nom: "Grand menu à colonnes avec images", piece: "tn-entete-liens", construction: "mega-colonnes", label: facon(ENTETE_LIENS, "mega-colonnes") },
  { n: 6, cle: "mega-produits", nom: "Grand menu avec produits mis en avant", piece: "tn-entete-liens", construction: "mega-produits", label: facon(ENTETE_LIENS, "mega-produits") },
  { n: 7, cle: "services", nom: "Services compact, téléphone et rendez-vous", piece: "tn-entete-services", construction: "services", label: facon(ENTETE_SERVICES, "services") },
  { n: 8, cle: "plein-ecran", nom: "Menu plein écran", piece: "tn-entete-liens", construction: "plein-ecran", label: facon(ENTETE_LIENS, "plein-ecran") },
];

/** Les six pieds de page du thème unique, dans l'ordre décidé. */
export const PIEDS: Coque[] = [
  { n: 1, cle: "colonnes", nom: "Complet en colonnes", piece: "tn-pied-complet", construction: "colonnes", label: "le nom et l'inscription d'un côté, les liens en colonnes de l'autre" },
  { n: 2, cle: "centre-minimal", nom: "Centré et minimal", piece: "tn-pied-complet", construction: "centre-minimal", label: PIED_MINIMAL.label },
  { n: 3, cle: "lettre", nom: "Avec lettre d'information", piece: "tn-pied-lettre", construction: null, label: "l'inscription à la lettre en grand : un titre, une phrase, le champ et son bouton ; les liens sur une ligne dessous" },
  { n: 4, cle: "services", nom: "Services", piece: "tn-pied-services", construction: null, label: "le téléphone en très grand et le bouton de devis, puis l'adresse et son itinéraire, les horaires, les villes desservies" },
  { n: 5, cle: "grand-nom", nom: "Grand logo éditorial", piece: "tn-pied-complet", construction: "grand-nom", label: "les liens en colonnes, puis le nom de la marque en très grand tout en bas" },
  { n: 6, cle: "reassurance", nom: "Réassurance et moyens de paiement", piece: "tn-pied-reassurance", construction: null, label: "trois repères en grand (livraison, retours, paiement), puis le nom, les liens utiles et la mention légale" },
];
