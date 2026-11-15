/**
 * Démonstration du thème sur mesure à tenue (14 novembre 2026 ; demande du propriétaire : « refaire toute les sections
 * qui manque […] tu dois faire tout ce qu'on a dit pour la partie thème avec sina »). Deux sites COMPLETS montés par le
 * Studio avec les nouvelles sections et les données du client : un électricien (site de services) et une boutique de
 * yoga à quatre produits et deux familles. Les textes sont ceux qu'un rédacteur rendrait (écrits ici à la main), les
 * photos sont celles de la démonstration, les clients et leurs valeurs (prix, téléphone, adresse) sont inventés pour
 * l'essai. Aucune IA, aucun appel réel.
 *
 * Toujours : chaque texte d'exemple est remplacé (aucun mot de la maison de thé ne reste), aucune photo d'exemple ne
 * reste, les vraies données sont posées, et le site entier part en boutique sans refus.
 * Avec DEMO_OUT=<dossier> : chaque page est capturée sur téléphone et sur ordinateur (DEMO_NET=1 : téléphone deux fois
 * plus fin), puis le thème Shopify est rendu par l'aperçu Liquid du Studio.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

type Inst = { id: string; construction?: string; texts?: [string, string][]; photos?: [string, string][] };
type Site = {
  brand: unknown; tenue: Record<string, string>; business: "products" | "services";
  /** Photos du client : nom → fichier (dossier des photos de la démonstration). */
  photos: Record<string, string>;
  pages: { key: string; label: string; sections: Inst[] }[]; header: Inst; footer: Inst; extras?: Inst[];
};

const SECTION_PHOTOS = path.join(process.cwd(), "public", "sections", "photos");

// ---------------------------------------------------------------- un électricien (site de services)

const ELECTRICIEN: Site = {
  business: "services",
  brand: {
    name: "Courant Clair", nameStatus: "validated", alternatives: [], tagline: "", positioning: "Un électricien qui explique ce qu'il fait et qui repart quand tout fonctionne.", audience: "", personality: ["franche", "soignée"],
    tone: { voice: "Vouvoiement, phrases courtes.", do: [], dont: [] },
    palette: { primary: "#F2B33D", secondary: "#D9E1E6", accent: "#F2B33D", light: "#EEF2F4", dark: "#10202E" },
    fonts: { heading: "space_grotesk", body: "work_sans" }, logo: { concept: "", status: "proposed" },
  },
  tenue: { titres: "gras", bouton: "droit", cadre: "droit", fond: "uni", petits: "machine", signe: "l'interrupteur" },
  photos: { depannage: "sv-depannage.jpg", spots: "sv-spots.jpg", cuisine: "sv-cuisine.jpg", sdb: "sv-sdb.jpg", exterieur: "sv-exterieur.jpg", reno: "sv-reno.jpg", avant: "sv-avant.jpg", apres: "sv-apres.jpg", quartier: "im-quartier.jpg" },
  header: { id: "tn-entete", construction: "gauche" },
  footer: { id: "tn-pied", texts: [[">Livraison<", ">Demander un devis<"], [">Retours<", ">Nous trouver<"]] },
  pages: [
    { key: "home", label: "Accueil", sections: [
      { id: "tn-ouverture-metier", construction: "appel", photos: [["be-coupe.jpg", "depannage"]], texts: [
        ["Salon de coiffure · [À compléter : ville]", "Électricien · Lyon et alentours"], ["Le temps<br>de souffler.", "La lumière revient.<br>Le calme aussi."],
        ["Une coupe pensée pour toi, un soin, un café. Tu ressors léger, sans avoir regardé l'heure.", "Une panne, un tableau qui saute, une pièce à éclairer : vous appelez, on vous dit quand on vient, et on repart quand tout fonctionne."],
        ['data-go="reservation">Prendre rendez-vous', 'data-go="devis">Demander un devis'],
      ] },
      { id: "tn-prestations", construction: "liste", photos: [["be-salon.jpg", "spots"]], texts: [
        ["La carte du salon.", "Ce que nous faisons."], ["Chaque rendez-vous commence par un vrai échange, devant le miroir.", "Chaque chantier commence par une visite : on regarde, on mesure, on vous explique."],
        ['data-go="reservation">Prendre rendez-vous', 'data-go="devis">Demander un devis'],
      ] },
      { id: "tn-exemples-prix", construction: "colonnes", texts: [
        ["[À compléter : prix]", "1 480 €"], ["[À compléter : ville et durée]", "Lyon 3e · deux jours"], ["[À compléter : prix]", "2 150 €"], ["[À compléter : ville et durée]", "Villeurbanne · trois jours"],
        ["[À compléter : prix]", "1 290 €"], ["[À compléter : ville et durée]", "Caluire · une demi-journée"],
      ] },
      { id: "tn-realisations", construction: "grille", photos: [["sv-cuisine.jpg", "cuisine"], ["sv-sdb.jpg", "sdb"], ["sv-exterieur.jpg", "exterieur"], ["sv-spots.jpg", "spots"]], texts: [
        ["[À compléter : ville]", "Lyon 6e"], ["[À compléter : ville]", "Bron"], ["[À compléter : ville]", "Caluire"], ["[À compléter : ville]", "Villeurbanne"],
      ] },
      { id: "tn-avant-apres", construction: "cote-a-cote", photos: [["sv-avant.jpg", "avant"], ["sv-apres.jpg", "apres"]], texts: [["[À compléter : ville et durée du chantier]", "Lyon 7e · quatre jours"]] },
      { id: "tn-deroule", construction: "frise", texts: [["Écrit, ligne par ligne. Délai d'envoi : [À compléter]", "Écrit, ligne par ligne, sous trois jours."]] },
      { id: "tn-zone", construction: "villes", photos: [["im-quartier.jpg", "quartier"]] },
      { id: "tn-urgence" },
    ] },
    { key: "devis", label: "Demander un devis", sections: [
      { id: "tn-devis", construction: "etapes", texts: [
        ["Parlez-nous<br>de vos murs.", "Parlez-nous<br>de votre installation."], ["Peinture intérieure", "Tableau électrique"], ["Peinture extérieure, façade", "Éclairage d'une pièce"], ["Enduits et plâtrerie", "Borne de recharge"], ["Papier peint", "Dépannage"],
        ["Le devis : [À compléter : gratuit ou payant, délai de réponse]", "Le devis est gratuit. Vous le recevez sous trois jours."],
      ] },
    ] },
    { key: "contact", label: "Nous trouver", sections: [
      { id: "tn-acces", construction: "horaires", photos: [["rs-salle.jpg", "reno"]], texts: [
        ["Venir nous voir.", "Passer à l'atelier."], ["[À compléter : parking le plus proche]", "Deux places devant l'atelier."], ["[À compléter : étage, ascenseur, accès en fauteuil]", "De plain-pied, sans marche."], ["[À compléter : arrêt le plus proche]", "Tram T1, arrêt à deux pas."],
      ] },
    ] },
  ],
};
const ELECTRICIEN_PROFIL = {
  services: [{ name: "Tableau électrique remis aux normes", price: "Sur devis", duration: "une à deux journées" }, { name: "Éclairage d'une pièce", price: "Sur devis", duration: "selon la pièce" }, { name: "Borne de recharge à domicile", price: "Sur devis", duration: "une demi-journée" }, { name: "Dépannage", price: "Déplacement : 90 €", duration: "dans la journée" }],
  // Numéro de la tranche réservée aux œuvres de fiction : il n'appartient à personne.
  phone: "04 65 71 00 12", address: "12 rue des Ateliers, 69000 Lyon", hours: "Du lundi au vendredi 8 h – 18 h ; samedi 9 h – 12 h", area: "Lyon, Villeurbanne, Bron, Caluire, Vénissieux et Oullins",
};

// ---------------------------------------------------------------- une boutique de yoga (quatre produits, deux familles)

const SOUPLE_DIR = path.join(process.cwd(), "public", "theme-assets", "souple");
const YOGA: Site = {
  business: "products",
  brand: {
    name: "Souple", nameStatus: "validated", alternatives: [], tagline: "", positioning: "Quatre essentiels de yoga aux couleurs douces, pour pratiquer chez soi.", audience: "", personality: ["douce", "soignée"],
    tone: { voice: "Vouvoiement, phrases courtes.", do: [], dont: [] },
    palette: { primary: "#C98A55", secondary: "#EFE1DD", accent: "#C98A55", light: "#FDF8F1", dark: "#35041B" },
    fonts: { heading: "playfair_display", body: "jost" }, logo: { concept: "", status: "proposed" },
  },
  tenue: { titres: "fins", bouton: "pilule", cadre: "niche", fond: "uni", petits: "normal", signe: "la courbe du tapis roulé" },
  photos: {
    accueil: "02-accueil-espace.webp", espace: "11-tapis-pouf.webp", piece: "10-tapis-piece.webp", tasse: "19-journal-tasse.webp", roule: "ambiance-06.webp", sangle: "04-sangle-principale.webp", colis: "23-colis-ouvert.webp",
    amb1: "ambiance-01.webp", amb3: "ambiance-03.webp", amb4: "ambiance-04.webp", amb5: "ambiance-05.webp", art1: "17-journal-coin-pouf.webp", art2: "28-journal-feuillage.webp", art3: "20-article-coin-pratique.webp",
    tapis: "tapis-01.webp", tapis2: "tapis-02.webp", tapis3: "tapis-03.webp", brique: "brique-01.webp", sangleP: "sangle-01.webp", anneau: "anneau-01.webp",
  },
  header: { id: "tn-entete", construction: "centre" },
  footer: { id: "tn-pied-complet", construction: "grand-nom", texts: [
    ["Des thés en feuilles entières, pour les pauses qui comptent.", "Des essentiels de yoga aux couleurs douces."], ["Ton e-mail", "Votre e-mail"], ["Tous les mélanges", "Tous les produits"],
    ["Paiement : [À compléter : moyens de paiement acceptés]", "Paiement par carte bancaire"],
  ] },
  extras: [{ id: "tn-annonce", texts: [["[À compléter : message du moment]", "Livraison offerte dès 60 € d'achat"]] }],
  pages: [
    { key: "home", label: "Accueil", sections: [
      { id: "tn-ouverture-carte", photos: [["hero.jpg", "accueil"]], texts: [
        ["Pose ta tasse.<br>Le reste attendra.", "Déroulez le tapis.<br>Le reste attendra."], ["Des thés en feuilles entières, pour les pauses qui comptent.", "Quatre essentiels aux couleurs douces, pour une pratique qui vous ressemble."], ["Choisir mon mélange", "Voir les essentiels"],
      ] },
      { id: "tn-rayons", construction: "bandes" },
      { id: "tn-texte-photo", construction: "carte-a-cheval", photos: [["infusion.jpg", "espace"]], texts: [
        ["Des feuilles entières.<br>Rien de broyé.", "Un coin à vous.<br>Même petit."],
        ["Ouvre le sachet : tu vois des feuilles, pas de la poussière. Dans l'eau chaude, elles se déplient lentement. Regarde-les faire, la pause a déjà commencé.", "Un tapis déroulé près de la fenêtre, et la pièce change. Plus besoin d'attendre le bon moment ni la bonne salle : la séance commence là où vous êtes."],
      ] },
      { id: "tn-produits", texts: [["Les mélanges.", "Les quatre essentiels."]] },
      { id: "tn-engagements", construction: "deux-colonnes", texts: [
        ["Ce qu'on te doit.", "Ce que nous vous devons."], ["Du thé, des fleurs, rien d'autre.", "Des matières agréables sous la main."], ["La liste tient sur une ligne.", "Du liège pour la brique, une surface douce pour le tapis."],
        ["Aucun arôme ajouté.", "Des couleurs qui apaisent."], ["Ce que tu sens vient de la feuille.", "Rose poudré, prune, liège naturel."], ["Un sachet qui se referme.", "Des objets qui vont ensemble."], ["Le parfum reste dedans.", "Le tapis, la brique, la sangle, l'anneau."],
        ["[À compléter : qui répond]", "C'est une personne qui vous écrit."],
      ] },
      { id: "tn-citation-photo", construction: "voile", photos: [["bureau.jpg", "piece"]], texts: [["La première gorgée, et le bruit s'arrête.", "La première respiration, et la journée ralentit."], ["[À compléter : qui le dit]", "L'équipe Souple"]] },
      { id: "tn-garanties", construction: "bande", texts: [["[À compléter : moyens acceptés]", "Carte bancaire, paiement sécurisé."]] },
      { id: "tn-infolettre-photo", construction: "a-cote", photos: [["tasse.jpg", "tasse"]], texts: [
        ["Un mélange de saison, une recette, une histoire de feuilles. Rien d'autre.", "Une séance à essayer, une couleur qui arrive, un conseil pour tenir la posture. Rien d'autre."], ["Ton e-mail", "Votre e-mail"], ["Tu te désinscris quand tu veux.", "Vous vous désinscrivez quand vous voulez."],
      ] },
    ] },
    { key: "shop", label: "La boutique", sections: [
      { id: "tn-catalogue", construction: "grille", texts: [
        ["Tous les mélanges.", "Les essentiels."], ["Thés, rooibos, infusions : choisis selon le moment.", "Un tapis, une brique, une sangle, un anneau : de quoi pratiquer partout."],
        ["Aucun mélange ne réunit tous ces choix. Enlève un filtre, ou repars de l'ensemble.", "Aucun produit ne réunit tous ces choix. Retirez un filtre, ou repartez de l'ensemble."], ["Voir tous les mélanges", "Voir tous les produits"],
      ] },
    ] },
    { key: "product", label: "Fiche produit", sections: [
      { id: "tn-achat", texts: [
        ["<small>Le thé</small>", "<small>Le tapis</small>"], ["<h1>Thé vert jasmin</h1>", "<h1>Tapis de yoga</h1>"],
        ["Des feuilles fines et de vraies fleurs de jasmin, pour une tasse douce qui s'ouvre dès que l'eau chaude la touche.", "Une surface douce qui accroche juste ce qu'il faut, un rose poudré qui repose les yeux : il se déroule, et la séance commence."],
        // La pastille prend la vraie teinte du produit (variable « --teinte »), pas la couleur de la marque.
        ['<i></i><span>Sachet de 100 g</span>', '<i style="--teinte:#C9A3AA"></i><span>Rose poudré</span>'],
      ] },
      { id: "tn-fiche-technique", construction: "tuiles", texts: [
        ["Thé vert aux fleurs de jasmin", "Tapis de yoga antidérapant"], ["<span>Origine</span>", "<span>Couleur</span>"], ["[À compléter : région et pays]", "Rose poudré"], ["<span>Récolte</span>", "<span>Surface</span>"], ["[À compléter : saison]", "Douce, antidérapante"],
        ["Dans le sachet", "Ses mesures"], ["<span>Poids net</span>", "<span>Longueur</span>"], ["[À compléter : poids]", "183 cm"], ["<span>Nombre de tasses</span>", "<span>Largeur</span>"], ["<b>[À compléter]</b>", "<b>61 cm</b>"], ["<span>Fermeture</span>", "<span>Épaisseur</span>"], ["Un sachet qui se referme", "6 mm"],
        ["À la maison", "Au quotidien"], ["<span>Conservation</span>", "<span>Entretien</span>"], ["À l'abri de la lumière", "Une éponge humide, puis à l'air"], ["<span>À boire avant</span>", "<span>Rangement</span>"], ["[À compléter : date]", "Roulé, avec sa sangle"],
      ] },
      { id: "tn-colis", construction: "liste", photos: [["sachet-bois.jpg", "roule"], ["infuseur.jpg", "sangle"], ["rooibos.jpg", "colis"]], texts: [
        ["Tout ce que tu reçois, pièce par pièce.", "Tout ce que vous recevez, pièce par pièce."], ["Le sachet de thé", "Le tapis, roulé"], ["Des feuilles entières, dans un sachet qui se referme.", "Roulé serré, prêt à être déroulé."],
        ["L'infuseur et sa cuillère", "Sa sangle de transport"], ["Une cuillère rase, une tasse.", "Elle le tient roulé et se passe à l'épaule."], ["Un mélange à découvrir", "Un colis en carton"], ["[À compléter : lequel]", "Du papier de soie, rien d'autre autour."],
        ["La boîte en métal", "La brique en liège"], ["[À compléter : prix]", "19 €"], ["Le paquet cadeau", "L'anneau Pilates"], ["[À compléter : prix]", "29 €"],
      ] },
      { id: "tn-pour-qui", construction: "panneaux", texts: [
        ["Fait pour toi si…", "Fait pour vous si…"], ["Tu cherches une vraie pause dans l'après-midi.", "Vous pratiquez chez vous, deux ou trois fois par semaine."], ["Tu aimes les parfums de fleurs, tout en douceur.", "Vous aimez un appui souple sous les genoux."], ["Tu bois ton thé sans sucre.", "Vous voulez un tapis qui reste beau, déroulé dans le salon."],
        ["Pas fait pour toi si…", "Pas fait pour vous si…"], ["Tu veux un thé corsé, qui réveille.", "Vous cherchez un tapis de voyage, très fin et très léger."], ["Tu n'aimes pas les notes fleuries.", "Vous pratiquez un yoga très dynamique, en salle chauffée."],
      ] },
      { id: "tn-avis", construction: "liste", texts: [["Ils l'ont goûté.", "Ils l'ont déroulé."]] },
    ] },
    { key: "journal", label: "Le journal", sections: [{ id: "tn-journal", construction: "cartes", texts: [["Des recettes, des gestes, des histoires de feuilles.", "Des séances, des gestes, de quoi pratiquer un peu mieux."]] }] },
    { key: "article", label: "Article", sections: [{ id: "tn-article" }] },
    { key: "about", label: "Notre histoire", sections: [
      { id: "tn-manifeste", texts: [
        ["On ne vend pas du thé.<br>On vend une pause.", "On ne vend pas un tapis.<br>On vend un moment à soi."],
        ["Un moment où personne ne te demande rien. L'eau chauffe, les feuilles s'ouvrent, la tasse tient chaud aux mains.", "Un moment où personne ne vous demande rien. Le tapis se déroule, le souffle ralentit, les épaules redescendent."],
        ["On a monté Souple pour ça. Pas pour remplir un placard de boîtes : pour que la pause existe encore, quelque part dans la journée.", "Nous avons créé Souple pour cela. Pas pour remplir un placard d'accessoires : pour que ce moment existe encore, quelque part dans la journée."],
        ["Alors on fait simple. De belles feuilles, de vraies fleurs, et le temps qu'il faut.", "Alors nous faisons simple. Quatre objets, de belles matières, et le temps qu'il faut."], ["[À compléter : signature]", "L'équipe Souple"],
      ] },
      { id: "tn-mosaique", construction: "une-grande", photos: [["tasse-fruits.jpg", "amb1"], ["trois-bols.jpg", "amb3"], ["fenetre.jpg", "amb4"], ["infuseur.jpg", "amb5"]], texts: [
        ["Dans la tasse.", "Chez vous."], ["L'été, glacé", "Le matin, au calme"], ["À la fenêtre", "Près de la fenêtre"], ["Une cuillère par tasse", "Tout est là"],
      ] },
    ] },
    { key: "aide", label: "Aide", sections: [
      { id: "tn-suivi", texts: [
        ["Donne le numéro reçu par e-mail : on te dit où elle se trouve.", "Donnez le numéro reçu par e-mail : nous vous disons où elle se trouve."], ["Ton e-mail", "Votre e-mail"],
        ["[À compléter : conditions de retour]", "30 jours pour changer d'avis."], ["Réponse sous [À compléter : délai]", "Réponse sous deux jours ouvrés."],
      ] },
    ] },
    { key: "cart", label: "Panier", sections: [{ id: "tn-panier", texts: [["Ton panier.", "Votre panier."], ["Livraison : [À compléter]", "Livraison offerte dès 60 € d'achat."]] }] },
  ],
};
/** Catalogue de la boutique : prix de démonstration de la marque (tests/souple-fixtures.ts), deux familles. */
const YOGA_PRODUITS: { title: string; photos: string[]; price: number; family: string }[] = [
  { title: "Tapis de yoga", photos: ["tapis", "tapis2", "tapis3"], price: 5900, family: "Tapis" }, { title: "Brique de yoga", photos: ["brique"], price: 1900, family: "Accessoires" },
  { title: "Sangle de yoga", photos: ["sangleP"], price: 1500, family: "Accessoires" }, { title: "Anneau Pilates", photos: ["anneau"], price: 2900, family: "Accessoires" },
];
const YOGA_ARTICLES: { title: string; excerpt: string; tag: string; cover: string; body: string }[] = [
  { title: "Dix minutes au réveil", excerpt: "Trois postures, pas une de plus, pour commencer la journée sans la brusquer.", tag: "Séance", cover: "art1", body: "<p>Le réveil sonne, et tout le corps proteste. Dix minutes suffisent pour le réconcilier avec la journée.</p><h2>Commencez assis</h2><p>Asseyez-vous sur le tapis, le dos droit, et laissez le souffle s'allonger. Rien d'autre.</p><blockquote>« Ce n'est pas la durée qui compte. C'est d'y revenir. »</blockquote><p>Puis une torsion douce, une posture de l'enfant, et vous êtes debout.</p>" },
  { title: "À quoi sert vraiment une brique", excerpt: "Elle ne sert pas à tricher : elle rapproche le sol.", tag: "Geste", cover: "art2", body: "<p>Une brique rapproche le sol de vos mains.</p>" },
  { title: "Faire de la place chez soi", excerpt: "Deux mètres carrés, un peu de lumière, et l'habitude s'installe.", tag: "Carnet", cover: "art3", body: "<p>Il ne faut pas une pièce. Il faut un coin.</p>" },
];

// ---------------------------------------------------------------- montage

describe("démonstration : deux sites complets montés avec les sections à tenue et les données du client", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const { run } = await import("@/lib/db");
  const { saveBrand, saveServices, loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const M = await import("@/lib/syna-agent/custom-theme/menu");
  const { tenueSection } = await import("@/lib/syna-agent/custom-theme/tenue");
  const { renderCustomTheme, linkMap, tenuePrestations, menuProducts } = await import("@/lib/syna-agent/custom-theme/render");
  const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
  const { validateCustomSection, validateSpec } = await import("@/lib/theme/ops");
  const out = process.env.DEMO_OUT;

  /** Le HTML d'une section écrit pour la marque : chaque texte d'exemple remplacé une fois, chaque photo remplacée par celle du client. */
  const fill = (x: Inst, assets: Record<string, string>, name: string) => {
    let h = tenueSection(x.id)!.html.replace(/Brindi/g, name); // le nom de la marque, comme le Studio le pose
    for (const [a, b] of x.texts ?? []) { expect(h.includes(a), `${x.id} : le texte d'exemple « ${a} » n'existe plus dans la section`).toBe(true); h = h.replace(a, () => b); }
    for (const [file, key] of x.photos ?? []) { expect(h.includes(`photos/${file}`), `${x.id} : la photo d'exemple ${file} n'existe plus`).toBe(true); expect(assets[key], `photo du client « ${key} »`).toBeTruthy(); h = h.replace(`photos/${file}`, `/api/files/${assets[key]}`); }
    return h;
  };
  async function mount(site: Site, dir: string, setup: (pid: string, userId: string, assets: Record<string, string>) => Promise<void> | void) {
    const user = await account(), pid = await project(user);
    if (site.business === "services") run("UPDATE projects SET business_type='services' WHERE id=?", pid);
    saveBrand(pid, site.brand as any);
    const assets: Record<string, string> = {};
    for (const [key, file] of Object.entries(site.photos)) assets[key] = (await saveAsset({ projectId: pid, userId: user.id, data: fs.readFileSync(path.join(dir, file)), name: file, mime: file.endsWith(".webp") ? "image/webp" : "image/jpeg", role: "original", origin: "upload" })).id;
    await setup(pid, user.id, assets);
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
    t = S.applyStructure(t, [
      ...site.pages.flatMap((pg) => [{ op: "page", key: pg.key, label: pg.label } as const, ...pg.sections.map((x) => ({ op: "add", page: pg.key, section: x.id, ...(x.construction ? { construction: x.construction } : {}) }) as const)]),
      { op: "shell", slot: "header", section: site.header.id, ...(site.header.construction ? { construction: site.header.construction } : {}) }, { op: "shell", slot: "footer", section: site.footer.id, ...(site.footer.construction ? { construction: site.footer.construction } : {}) },
      { op: "tenue", tenue: site.tenue }, ...(site.extras ?? []).map((x) => ({ op: "extra", section: x.id }) as const),
    ] as any);
    const write = (s: any, x: Inst) => { s.html = fill(x, assets, (site.brand as { name: string }).name); s.clientTexts = true; };
    for (const pg of site.pages) pg.sections.forEach((x, i) => write(t.pages.find((p: any) => p.key === pg.key).sections[i], x));
    write(t.header, site.header); write(t.footer, site.footer);
    (site.extras ?? []).forEach((x, i) => write(t.extras[i], x));
    // Le menu : calculé depuis les pages et le catalogue, comme SINA le propose.
    t.menu = M.validMenu(t, M.proposeMenu(t, menuProducts(pid), site.business)).menu;
    const p = loadProject(pid);
    return { pid, t, p, html: renderCustomTheme(p, t, { embed: true }), assets };
  }
  /** Le site converti pour Shopify : aucun refus, chaque section acceptée par le contrôle du Studio. */
  const shopify = (m: Awaited<ReturnType<typeof mount>>, site: Site, over: Record<string, unknown> = {}) => {
    const sv = m.p.services;
    const x = customThemeSpec(m.t, {
      name: (site.brand as any).name, palette: (site.brand as any).palette, fonts: (site.brand as any).fonts, business: site.business, products: menuProducts(m.pid), prestations: tenuePrestations(m.pid),
      company: { shipping: null, returns: null }, site: { phone: sv.phone, address: sv.address, hours: sv.hours, area: sv.area }, assetExt: () => "jpg", linkMap: linkMap(m.t), logoAssetId: null, dropMissing: false, base: null, ...over,
    });
    for (const [type, c] of Object.entries(x.spec.customSections)) expect(validateCustomSection(c.liquid), `${type} : contrôle du Studio`).toBeNull();
    return x;
  };
  /** Captures de chaque page, téléphone et ordinateur (seulement à la demande). */
  async function shoot(name: string, html: string, keys: string[]) {
    if (!out) return;
    const { shootPages } = await import("@/lib/syna-agent/custom-theme/shots");
    fs.mkdirSync(path.join(out, name), { recursive: true });
    const overflow: string[] = [];
    for (const view of ["téléphone", "ordinateur"] as const) {
      // DEMO_NET=1 : captures du téléphone deux fois plus fines, à montrer.
      const shots = await shootPages(html, keys, { view, maxHeight: 9000, quality: 88, ...(process.env.DEMO_NET && view === "téléphone" ? { scale: 2 } : {}) });
      expect(shots, "Chromium présent").not.toBeNull();
      for (const s of shots!) { fs.writeFileSync(path.join(out, name, `${s.key}__${view === "téléphone" ? "tel" : "ordi"}.jpg`), s.data); if (s.overflow > 1) overflow.push(`${s.key} · ${view} : dépasse de ${s.overflow} px`); }
    }
    expect(overflow, "rien ne dépasse de l'écran").toEqual([]);
  }

  it("un électricien : téléphone, horaires, zone et prestations du profil ; rien d'exemple ne reste ; le site part en boutique", async () => {
    const m = await mount(ELECTRICIEN, SECTION_PHOTOS, (pid) => { saveServices(pid, { ...loadProject(pid).services, ...ELECTRICIEN_PROFIL } as any); });
    // Les données du profil sont partout où le site les montre.
    expect(m.html).toContain('href="tel:0465710012" data-tn-tel>04 65 71 00 12</a>');
    expect((m.html.match(/04 65 71 00 12/g) ?? []).length).toBeGreaterThanOrEqual(3); // ouverture, zone, bandeau d'appel
    expect(m.html).toContain("<li>Villeurbanne</li>");
    expect(m.html.replace(/\u00a0/g, " ")).toContain("<tr><th>Du lundi au vendredi</th><td>8 h – 18 h</td></tr><tr><th>Samedi</th><td>9 h – 12 h</td></tr>");
    expect(m.html).toContain("--tn-poids:700"); // tenue « gras » : la police de la marque a une graisse forte, les titres la prennent
    expect(m.html).toContain('"hdCart":"0"'); // un site de services n'a pas de panier
    expect(m.html).toMatch(/<ul class="tn-liste-p"[^>]*><li><b>Tableau électrique remis aux normes<\/b><span>Durée : une à deux journées<\/span><i>Sur devis<\/i><\/li>/);
    expect(m.html).toContain("<option>Borne de recharge</option>"); // écrit par le rédacteur (devis), pas la liste des prestations
    // Aucun mot de l'exemple (salon, thé, peintre), aucune photo d'exemple, rien à compléter.
    const pages = m.html.slice(m.html.indexOf('<div class="tb-wrap'), m.html.indexOf("<template"));
    expect(pages).not.toMatch(/salon|coiffage|Brindi|jasmin|vos murs|Peinture/i);
    expect(pages).not.toMatch(/photos\/[\w-]+\.jpg/);
    expect(pages).not.toMatch(/À compléter/);
    // Le menu calculé : les pages qui existent, rien d'autre.
    expect(m.t.menu.map((x: any) => x.to)).toEqual(["devis", "contact"]);
    // Mise en boutique : aucun refus, sans avoir rien à retirer.
    const x = shopify(m, ELECTRICIEN);
    expect(x.problems.filter((q) => q.level === "bloquant").map((q) => q.text)).toEqual([]);
    expect(validateSpec(x.spec)).toEqual([]);
    const all = Object.values(x.spec.customSections).map((c) => c.liquid).join("\n");
    expect(all).toMatch(/\{%- form 'contact' -%\}[^]*name="contact\[Les travaux\]"[^]*name="contact\[La ville du chantier\]"/);
    expect(all).toContain('href="tel:0465710012"');
    await shoot("electricien", m.html, ELECTRICIEN.pages.map((pg) => pg.key));
  }, 600_000);

  it("une boutique de yoga : quatre produits, deux familles, filtres, journal, panier ; rien d'exemple ne reste ; le site part en boutique", async () => {
    const { createProduct } = await import("@/lib/products/catalog");
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    const m = await mount(YOGA, SOUPLE_DIR, (pid, userId, assets) => {
      for (const x of YOGA_PRODUITS) createProduct(pid, { title: x.title, price: x.price, categories: [x.family], images: x.photos.map((k) => ({ assetId: assets[k] })) } as any);
      saveCompany(pid, { shipping: "Offerte dès 60 € d'achat, sinon 4,90 €. Chez vous en 2 à 4 jours ouvrés.", returns: "30 jours pour changer d'avis, produit non utilisé." });
      YOGA_ARTICLES.forEach((a, i) => run("INSERT INTO blog_articles (id, project_id, user_id, title, slug, excerpt, body_html, tags, cover_asset_id, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        `demo-${pid}-${i}`, pid, userId, a.title, `article-${i}`, a.excerpt, a.body, JSON.stringify([a.tag]), assets[a.cover], "ready", Date.now() - i * 1000, Date.now() - i * 1000));
    });
    const pages = m.html.slice(m.html.indexOf('<div class="tb-wrap'), m.html.indexOf("<template"));
    // Le catalogue : les quatre produits, leurs prix, leurs familles ; les filtres de la page boutique ; les familles de l'accueil.
    expect(pages).toMatch(/data-go="product" data-tn-fams="Tapis" data-tn-prix="5900"><div class="tn-ph" style="background-image:url\(\/api\/files\/[\w-]+\)"><\/div><b>Tapis de yoga<\/b><span>59 €<\/span>/);
    expect(pages).toContain('<fieldset><legend>Famille</legend><label><input type="checkbox" data-tn-fam="Tapis"><span>Tapis</span></label><label><input type="checkbox" data-tn-fam="Accessoires"><span>Accessoires</span></label></fieldset>');
    expect(pages).toMatch(/data-go="shop:Accessoires"><div class="tn-ph tn-cadre" style="background-image:url\(\/api\/files\/[\w-]+\)"><\/div><b>Accessoires<\/b><span>Brique de yoga, Sangle de yoga, Anneau Pilates<\/span>/);
    // Le menu calculé : la boutique et ses deux familles, puis les pages qui existent.
    expect(m.t.menu[0]).toEqual({ label: "La boutique", to: "shop", children: [{ label: "Tout voir", to: "shop" }, { label: "Tapis", to: "shop:Tapis" }, { label: "Accessoires", to: "shop:Accessoires" }] });
    // Bloc d'achat : le premier produit, son prix, la livraison et les retours du client.
    expect(pages).toContain('<div class="tn-prix">59 €</div>');
    expect(pages).toContain("<li>Retours : 30 jours pour changer d'avis, produit non utilisé.</li>");
    // Journal : les articles prêts, le premier ouvert sur sa page ; avis : aucun d'exemple, l'invitation seule.
    expect(pages).toContain("<b>Dix minutes au réveil</b><span>Trois postures, pas une de plus, pour commencer la journée sans la brusquer.</span>");
    expect(pages).toContain("<h1>Dix minutes au réveil</h1>");
    expect(pages).toContain('<ul data-tn-avis></ul><div class="tn-premier">');
    // Aucun mot de la maison de thé, aucune photo d'exemple, rien à compléter.
    expect(pages).not.toMatch(/Brindi|jasmin|rooibos|mélange|sachet|infus|\bthé\b|\btasse\b/i);
    expect(pages).not.toMatch(/photos\/[\w-]+\.jpg/);
    expect(pages).not.toMatch(/À compléter/);
    // Mise en boutique : aucun refus ; la page boutique, le journal et l'article lisent la boutique.
    const co = { shipping: "Offerte dès 60 € d'achat, sinon 4,90 €. Chez vous en 2 à 4 jours ouvrés.", returns: "30 jours pour changer d'avis, produit non utilisé." };
    const x = shopify(m, YOGA, { company: co });
    expect(x.problems.filter((q) => q.level === "bloquant").map((q) => q.text)).toEqual([]);
    expect(validateSpec(x.spec)).toEqual([]);
    expect(Object.keys(x.spec.templates)).toEqual(expect.arrayContaining(["index", "product", "collection", "cart", "blog", "article", "page.about", "page.aide"]));
    expect(x.spec.store.collections!.map((c) => [c.handle, c.products.length])).toEqual([["tapis", 1], ["accessoires", 3]]);
    // Par le chemin du Studio (étape 7 de SINA) : une version de thème prête pour Shopify, NON activée, sans rien retirer.
    const I = await import("@/lib/syna-agent/custom-theme/install");
    S.saveCustomTheme(m.pid, m.t);
    const done = I.installCustomTheme(m.pid);
    expect(done.ok, JSON.stringify(done).slice(0, 900)).toBe(true);
    await shoot("yoga", m.html, YOGA.pages.map((pg) => pg.key));
    // À la demande : le thème Shopify rendu par l'aperçu Liquid du Studio (accueil, boutique, fiche, journal, panier).
    if (out && done.ok) {
      const { snapshotTheme } = await import("@/lib/theme/snapshot");
      const { themeVersion } = await import("@/lib/projects");
      const { withStudioProducts, listProducts } = await import("@/lib/products/catalog");
      const full = withStudioProducts(themeVersion(m.pid, done.versionId)!.spec, m.pid);
      fs.mkdirSync(path.join(out, "shopify"), { recursive: true });
      for (const [name, url] of [["accueil", "/"], ["boutique", "/collections/all"], ["fiche", `/products/${listProducts(m.pid)[0].handle}`], ["journal", "/blogs/journal"], ["panier", "/cart"]] as const) {
        const shots = await snapshotTheme(full, url, { desktopSheets: 0, mobileSheets: 6 }).catch((e) => { fs.writeFileSync(path.join(out, "shopify", `${name}-erreur.txt`), String((e as Error).stack ?? e)); return null; });
        (shots?.mobile ?? []).forEach((data, i) => fs.writeFileSync(path.join(out, "shopify", `${name}-${i}.jpg`), data));
      }
    }
  }, 600_000);
});
