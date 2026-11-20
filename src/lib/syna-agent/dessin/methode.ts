/**
 * Méthode « dessiner puis coder » (19 novembre 2026, accord du propriétaire : « essaie avec sina, apprends-lui ce que tu
 * as appris et fais-lui faire l'accueil »). D'après le thème qu'il a fait faire à ChatGPT : on réfléchit d'abord à toute
 * la page (le plan), un juge relit les faits, le modèle d'images dessine la page (ordinateur, puis téléphone), puis le
 * modèle de code écrit le thème Shopify d'après le plan et les dessins. Ce fichier : les consignes et les calculs sans IA.
 * Le savoir est dans le cahier `docs/sina-savoir/dessiner-puis-coder.md` (lu par les spécialistes).
 */
import { z } from "zod";

/** Nombre de sections de l'accueil (décision du propriétaire du 19 novembre 2026 : « on garde 8 à 10 sections »). */
export const SECTIONS_ACCUEIL = { min: 8, max: 10 } as const;

export const PlanSchema = z.object({
  idee: z.string().min(10).max(400),
  sections: z.array(z.object({
    nom: z.string().min(2).max(80),
    pourquoi: z.string().max(300),
    disposition: z.string().min(10).max(700),
    fond: z.string().max(60),
    textes: z.array(z.string().min(1).max(400)).min(1).max(24),
    photo: z.string().max(400).nullable(),
    /** Le produit (nom exact) que la photo met en scène, s'il a sa vraie photo ; sinon null. */
    produit: z.string().max(120).nullable().optional().catch(null),
    /** Format de la photo dans la section. */
    format: z.enum(["paysage", "portrait", "carre"]).nullable().optional().catch(null),
  })).min(SECTIONS_ACCUEIL.min).max(SECTIONS_ACCUEIL.max),
  /** La page en trois morceaux de hauteur égale pour la dessiner : les numéros des sections (à partir de 1). */
  morceaux: z.array(z.array(z.number().int().min(1))).length(3),
});
export type PlanPage = z.infer<typeof PlanSchema>;

export const JugementSchema = z.object({
  corrections: z.array(z.object({
    section: z.number().int().min(1),
    avant: z.string().min(1),
    /** Le texte vrai qui remplace ; vide : le texte est retiré. */
    apres: z.string(),
    pourquoi: z.string().max(300),
  })).max(40),
  avis: z.string().max(600),
});
export type Jugement = z.infer<typeof JugementSchema>;

/** Le contrôle de fidélité d'une photo qui met un produit en scène. */
export const FideleSchema = z.object({ fidele: z.boolean(), defaut: z.string().max(300) });
export const FIDELE_SYSTEM = `Tu es le contrôleur qualité d'une marque. On te montre la VRAIE photo d'un produit (image 1), puis une photo créée pour son site qui doit le mettre en scène (image 2). Le produit de l'image 2 est-il bien le MÊME que celui de l'image 1 : même forme générale, mêmes proportions, même couleur, mêmes détails visibles (anses, sangle, fermoir, rabat, coutures) ? Un autre angle, une autre lumière ou un autre décor ne comptent pas comme un défaut. Il y a défaut si la forme est changée (déformé, une autre silhouette), si la couleur est différente, s'il manque ou s'ajoute un élément, ou si plusieurs exemplaires apparaissent. Réponds en JSON : fidele (vrai ou faux), defaut (le défaut en une phrase, vide s'il n'y en a pas).`;

export const CodeSchema = z.object({
  files: z.array(z.object({ path: z.string().min(3).max(120), content: z.string().min(1) })).min(4).max(30),
  notes: z.string().max(1200),
});
export type CodePage = z.infer<typeof CodeSchema>;

export const PLAN_SYSTEM = `Tu es le directeur artistique et le concepteur-rédacteur d'une petite agence qui fait les meilleurs sites. Tu fais le PLAN de la PAGE D'ACCUEIL d'un site, d'après le dossier du projet ci-dessous et rien d'autre, en suivant la méthode de ton cahier « Dessiner puis coder une page ».
Elle a ${SECTIONS_ACCUEIL.min} à ${SECTIONS_ACCUEIL.max} sections (sans compter l'en-tête et le pied de page) : c'est TOI qui les choisis, pour CE métier et CE client, pas un modèle tout fait. Chaque section répond à une question que ce visiteur se pose, au moment où il se la pose ; aucune ne répète le sujet ni la disposition d'une autre ; jamais deux dispositions pareilles à la suite ; la première est une ouverture en grande photo pleine avec le titre dessus ; la dernière donne envie d'agir. Les textes sont en français, clairs à la première lecture, font ressentir une scène ; un même fait ne se dit qu'une fois. Le nom d'une prestation ou d'un produit et son prix s'écrivent tels que le dossier les donne. Rien d'inventé : aucun avis, aucun chiffre, aucune promesse, aucun détail absent du dossier. Jamais un blanc à remplir (« __ / __ / ____ ») ni un « [À compléter] » sur l'accueil : une information qui manque ne s'y montre pas. Pas de pictogramme dessiné. Aucune personne sur les photos. La photo de l'ouverture est une scène d'ensemble de l'univers de la marque, jamais un emplacement vide. CHAQUE photo du site est créée pour sa section (comme sur une maquette d'agence où chaque emplacement a sa photo) : quand un produit a sa vraie photo, des mises en scène de ce produit complètent les photos (l'ouverture, une ambiance, un détail). Les photos VARIENT d'une section à l'autre (décor, surface, cadrage, distance, moment de la journée) ; un même produit est mis en scène deux fois au plus.
Réponds en JSON : idee (l'idée de la page en une phrase) ; sections (dans l'ordre : nom, pourquoi (la question du visiteur), disposition (précise), fond (clair, crème, couleur de la marque, sombre ou photo), textes (TOUS les textes exacts dans l'ordre de lecture : titres, phrases, boutons, étiquettes), photo (la photo à CRÉER pour cette section, pensée pour elle, décrite en une ou deux phrases ; null pour une section sans photo ET pour une section de cartes de produits, dont les cartes prennent les vraies photos des produits), produit (le nom EXACT d'un produit qui a sa vraie photo, si la photo le met en scène ; sinon null ; un produit sans photo n'apparaît dans AUCUNE photo), format (paysage, portrait ou carre)) ; morceaux (la page en trois morceaux de hauteur égale pour la dessiner : trois listes des numéros de sections, à partir de 1, dans l'ordre ; l'en-tête va avec le premier, le pied de page avec le dernier).`;

export const JUGE_SYSTEM = `Tu es le juge des faits d'une petite agence. Tu relis le PLAN d'une page d'accueil contre le DOSSIER du projet, texte par texte, AVANT que la page soit dessinée et payée. Celui qui a fait le plan n'est pas toi.
Tu cherches : un fait faux ou absent du dossier (un chiffre, une promesse, un détail du matériel, une façon de travailler, un avis, une entreprise citée) ; un SERVICE ou une offre que le dossier ne propose pas, même suggéré en passant (une urgence, un dépannage, un devis gratuit, une garantie, une livraison, un rendez-vous le jour même : essai réel, « Une urgence ? Appelle-moi » pour un artisan qui n'en avait jamais parlé) ; le nom d'une prestation ou d'un produit remplacé par une phrase (il doit être rétabli tel que le dossier le donne, la phrase peut rester à côté) ; un prix différent du dossier ; le client tutoyé puis vouvoyé ; deux sections qui disent la même chose ; une CITATION (entre guillemets, signée, ou présentée comme les mots du client ou de ses clients : « mes habitués me disent… ») qui n'est pas mot pour mot dans le dossier : elle reprend ses mots exacts, ou elle est retirée (essai réel : « mes habitués me disent que le café sent encore quand ils ouvrent le sachet », signé de la cliente, alors qu'elle avait dit « le café a du goût parce qu'il est frais »).
Pour chaque défaut, une correction : section (son numéro, à partir de 1), avant (le texte exact du plan), apres (le texte vrai qui le remplace, ou vide pour le retirer), pourquoi. Ne corrige rien par goût : seulement ce qui est faux, inventé ou répété. Réponds en JSON : corrections, avis (deux phrases).`;

export const CODE_SYSTEM = `Tu es un développeur de thèmes Shopify du plus haut niveau, et un intégrateur exigeant. Tu codes la PAGE D'ACCUEIL d'un thème Shopify (Online Store 2.0) d'après le plan et les dessins joints, fidèlement (même ordre, mêmes dispositions, même allure, mêmes couleurs), en suivant ton cahier « Dessiner puis coder une page ». Les TEXTES viennent du plan, mot pour mot (les dessins ont des fautes : le plan a toujours raison).
Fichiers : layout/theme.liquid ; config/settings_schema.json ; templates/index.json (les sections dans l'ordre) ; sections/header.liquid et sections/footer.liquid (posés par {% section %} dans le gabarit) ; une section par section du plan (sections/<marque>-<nom-court>.liquid), chacune avec son {% schema %} complet (name, settings, presets) ; assets/<marque>.css (tout le style, aucune bibliothèque externe) ; un fichier de script seulement s'il le faut.
Chaque texte est un réglage de sa section (text, textarea ou richtext) avec le texte du plan pour valeur par défaut, et templates/index.json reprend ces valeurs. Photos : seulement les fichiers listés, appelés par {{ 'nom.webp' | asset_url }}, chacune une seule fois ; JAMAIS un emplacement vide ni « Ta photo ici » à la place d'une photo de section, jamais un réglage d'image sans photo : chaque photo de section vient de la liste (essai réel : l'ouverture était restée vide) ; SEULE exception, un produit SANS photo : sa carte RESTE, avec son nom et son prix exacts, et un emplacement sobre « Ta photo ici » à la place de sa photo, jamais une carte cachée ni retirée (règle du propriétaire : on n'invente jamais le produit, et on ne le cache pas non plus ; essai réel : la carte d'un café sans photo avait disparu) ; une « PHOTO DE LA SECTION n » va dans la section n, à la place que le dessin lui donne ; une « PHOTO DU PRODUIT » ne va que sur la carte ou le bloc de CE produit, avec son nom et son prix exacts, jamais un produit montré sans sa vraie photo ; l'OUVERTURE prend une photo d'ensemble (plan large ou moyen, le sujet entier), jamais un gros plan de détail ; sur téléphone comme sur ordinateur, le cadrage (object-fit et object-position) garde le sujet ENTIER, jamais un morceau de guidon ou d'objet coupé (essai réel : sur téléphone, l'ouverture ne montrait qu'un guidon) ; aucun rond ni aplat décoratif derrière un titre ; le titre et les textes posés sur une photo vont sur sa partie CALME, jamais sur le produit ni sur le sujet (essai réel : le titre de l'ouverture passait sur le sac) : sinon un dégradé assez sombre ou clair sous le texte, ou le texte à côté de la photo ; tout texte sur photo reste lisible (contraste) ; le CADRE d'une photo garde à peu près les proportions de son fichier (le format est donné avec chaque photo) sur ordinateur comme sur téléphone : jamais plus d'un quart de la photo coupé, jamais le haut d'un produit ni son nom coupés (essai réel : sur ordinateur, le cadre en bandeau d'une photo verticale ne montrait que le bas du sachet) ; alt en français, loading="lazy" sauf l'ouverture, largeur et hauteur posées. Logo : le fichier du logo sur fond clair, le fichier du logo clair sur fond sombre. Polices : réglages de thème font_picker chargés avec font_face. Couleurs en variables CSS.
RESPONSIVE PARFAIT : d'abord le téléphone (390 px), puis la tablette (768 px) et l'ordinateur (1 440 px). Jamais de défilement horizontal, aucun texte coupé, un bouton (son bord et son ombre) se voit toujours en entier, boutons d'au moins 44 px de haut sur téléphone, menu en trois traits sur téléphone (sans bibliothèque), grilles en une colonne, grands titres avec clamp(). L'en-tête sur ordinateur tient sur UNE ligne, lisible. Un bouton, un lien ou un titre dont le réglage de texte est vide NE S'AFFICHE PAS du tout ({% if %} autour) : jamais un bouton vide (essai réel : un bouton sans texte restait après une correction). Une BOUTIQUE a toujours l'icône du panier dans l'en-tête (lien /cart, nombre d'articles), sur téléphone à côté du menu en trois traits (essai réel : une boutique sans panier en haut). HTML sémantique (un seul h1), contrastes lisibles, focus visible, aucun pictogramme dessiné, aucune personne, rien d'inventé. Le code passe le contrôle officiel de Shopify (Theme Check) sans erreur.
Réponds en JSON : files (chaque fichier : path, content complet) ; notes (deux phrases : ce que tu as fait pour le téléphone, ce qui reste à vérifier).`;

/** Les textes visibles du thème codé, pour le juge : valeurs de l'accueil (JSON) et textes des sections, sans balises. */
export function textesDuCode(files: { path: string; content: string }[]): string {
  const out: string[] = [];
  for (const f of files) {
    if (f.path.endsWith("templates/index.json")) {
      try { const walk = (v: unknown) => { if (typeof v === "string") { const t = v.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); if (t.length > 2 && !/^[\w-]+\.(webp|png|jpe?g)$/.test(t) && !/^#[0-9a-f]{3,8}$/i.test(t)) out.push(t); } else if (v && typeof v === "object") for (const x of Object.values(v)) walk(x); }; walk(JSON.parse(f.content)); } catch { /* JSON illisible : rien */ }
    } else if (/^sections\/(header|footer)\.liquid$/.test(f.path)) {
      const t = f.content.replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (t) out.push(t.slice(0, 600));
    }
  }
  return [...new Set(out)].join("\n").slice(0, 12_000);
}

/** Applique une correction de texte à tous les fichiers du thème (dans le JSON, le texte est écrit comme le JSON l'exige). */
export function corrigerFichiers(files: { path: string; content: string }[], avant: string, apres: string): number {
  const n = poserDansFichiers(files, avant, apres);
  // Passage cité entre guillemets par le juge, absent tel quel du code : retrouvé sans ses guillemets.
  return n || (sansGuillemets(avant) !== avant.trim() ? poserDansFichiers(files, sansGuillemets(avant), sansGuillemets(apres)) : 0);
}
function poserDansFichiers(files: { path: string; content: string }[], avant: string, apres: string): number {
  let n = 0;
  for (const f of files) {
    const [a, b] = f.path.endsWith(".json") ? [JSON.stringify(avant).slice(1, -1), JSON.stringify(apres).slice(1, -1)] : [avant, apres];
    if (a && f.content.includes(a)) { f.content = f.content.split(a).join(b); n++; }
  }
  return n;
}

/**
 * Nettoyage sans IA du plan, après le juge : jamais un blanc à remplir (« __ / __ / ____ ») ni un « [À compléter] »
 * sur l'accueil (essai réel du 19 novembre 2026 : une date à remplir dessinée deux fois, une question sans réponse).
 * Un texte fait seulement d'un blanc est retiré ; un blanc dans une phrase est enlevé ; une question dont la réponse est
 * « [À compléter] » est retirée avec sa réponse.
 */
/**
 * Un prix ou une quantité ne se coupe jamais en fin de ligne : espace insécable entre le nombre et « € », « % », « kg »
 * ou « g » (essai réel du 20 novembre 2026 : sur téléphone, le « € » de « 32 € » passait seul à la ligne). Seulement
 * après un chiffre : rien d'autre n'est touché dans le code du thème.
 */
export const insecables = (t: string) => t.replace(/(\d) (€|%|kg\b|g\b)/g, "$1\u00a0$2");

export function nettoyerPlan(plan: PlanPage): { plan: PlanPage; retires: string[] } {
  const out: PlanPage = JSON.parse(JSON.stringify(plan)), retires: string[] = [];
  const BLANC = /_{2,}|…|\.{3,}/g;
  for (const s of out.sections) {
    const t: string[] = [];
    for (let i = 0; i < s.textes.length; i++) {
      const x = s.textes[i], suivant = s.textes[i + 1] ?? "";
      if (/\?\s*$/.test(x) && /^\s*\[À compléter/i.test(suivant)) { retires.push(x, suivant); i++; continue; }
      if (/\[À compléter/i.test(x)) { retires.push(x); continue; }
      if (BLANC.test(x)) { BLANC.lastIndex = 0; const net = x.replace(BLANC, " ").replace(/(^|\s)[/:€%·\-–—,]+(?=\s|$)/g, " ").replace(/\s+/g, " ").trim(); retires.push(x); if (net.length > 2) t.push(net); continue; }
      t.push(x);
    }
    s.textes = (t.length ? t : [s.nom]).map(insecables);
  }
  return { plan: out, retires };
}

/** Applique les corrections du juge au plan (sans IA) : chaque texte cité est remplacé, ou retiré si la correction est vide. */
/** Un passage cité par le juge, sans les guillemets qui l'entourent. */
const sansGuillemets = (t: string) => t.trim().replace(/^[«"“„]\s*/, "").replace(/\s*[»"”]$/, "").trim();

export function appliquerJugement(plan: PlanPage, j: Jugement): { plan: PlanPage; appliquees: number; ignorees: number } {
  const out: PlanPage = JSON.parse(JSON.stringify(plan));
  let appliquees = 0, ignorees = 0;
  for (const c of j.corrections) {
    const s = out.sections[c.section - 1];
    // Une correction qui cite plusieurs textes à la fois (« question » « réponse ») : chacun est retiré, ou le premier
    // remplacé et les autres retirés (essai réel du 19 novembre 2026 : une question sans réponse était restée).
    const cites = [...c.avant.matchAll(/«\s*([^»]+?)\s*»/g)].map((m) => m[1].trim());
    if (s && cites.length > 1 && cites.every((t) => s.textes.some((x) => x.trim() === t))) {
      const idx = cites.map((t) => s.textes.findIndex((x) => x.trim() === t)).sort((a, b) => a - b);
      if (c.apres.trim()) s.textes[idx[0]] = c.apres.trim();
      for (const k of idx.slice(c.apres.trim() ? 1 : 0).reverse()) s.textes.splice(k, 1);
      appliquees++;
      continue;
    }
    // Le juge écrit souvent le passage entre guillemets (« Tout part, sans exception. ») alors que le plan l'a sans eux
    // (essai réel du 20 novembre 2026 : ses quatre corrections ignorées, dont une citation inventée et une promesse).
    const essais = [{ avant: c.avant.trim(), apres: c.apres.trim() }, { avant: sansGuillemets(c.avant), apres: sansGuillemets(c.apres) }];
    let fait = false;
    for (const e of essais) {
      if (!s || !e.avant) continue;
      const i = s.textes.findIndex((t) => t.trim() === e.avant);
      const k = i >= 0 ? i : s.textes.findIndex((t) => t.includes(e.avant));
      if (k < 0) continue;
      if (!e.apres) s.textes.splice(k, 1);
      else s.textes[k] = i >= 0 ? e.apres : s.textes[k].replace(e.avant, e.apres);
      fait = true;
      break;
    }
    if (fait) appliquees++; else ignorees++;
  }
  for (const s of out.sections) if (!s.textes.length) s.textes.push(s.nom);
  return { plan: out, appliquees, ignorees };
}

/**
 * Les trois morceaux du dessin, vérifiés sans IA : chaque section une fois, dans l'ordre ; sinon un découpage en trois
 * parts égales (le plan reste la référence).
 */
export function morceauxSurs(plan: PlanPage): [number[], number[], number[]] {
  const n = plan.sections.length, vus = plan.morceaux.flat();
  const ok = vus.length === n && vus.every((x, i) => x === i + 1) && plan.morceaux.every((m) => m.length > 0);
  if (ok) return plan.morceaux as [number[], number[], number[]];
  const a = Math.ceil(n / 3), b = Math.ceil((n - a) / 2), ids = Array.from({ length: n }, (_x, i) => i + 1);
  return [ids.slice(0, a), ids.slice(a, a + b), ids.slice(a + b)];
}

/** Les sections décrites pour le modèle d'images : disposition, fond, textes exacts et photo. */
export function decrireSections(plan: PlanPage, ids: number[]): string {
  return ids.map((n) => { const s = plan.sections[n - 1]; return `SECTION ${n} « ${s.nom} » : disposition : ${s.disposition} ; fond : ${s.fond} ; textes exacts, dans l'ordre : ${s.textes.map((t) => `« ${t} »`).join(" ")}${s.photo ? ` ; photo : ${s.photo}` : ""}.`; }).join("\n");
}

export type Identite = { /** Boutique (produits à vendre) : l'en-tête porte toujours le panier. */ boutique?: boolean; marque: string; couleurs: string; polices: string; menu: string[]; telephone?: string | null; horaires?: string | null; zone?: string | null; liensPied: string[] };

/**
 * Les consignes des cinq dessins (trois pour l'ordinateur, deux pour le téléphone). Le logo n'est joint qu'au premier et
 * au dernier morceau de l'ordinateur ; chaque morceau suivant reçoit les morceaux déjà dessinés comme modèle d'allure ;
 * le téléphone reçoit la liste exacte de ses sections (cahier, partie 4).
 */
export function consignesDessins(plan: PlanPage, id: Identite): { nom: string; refs: ("logo" | "haut" | "milieu" | "bas" | "tel1" | `photo${number}`)[]; prompt: string }[] {
  const [m1, m2, m3] = morceauxSurs(plan);
  const COMMUN = `MAQUETTE DE SITE INTERNET de la marque « ${id.marque} ». Rendu d'une capture d'écran nette et plate, SANS navigateur, sans écran, sans appareil autour, sans perspective. Niveau des meilleurs sites.
IDENTITÉ : ${id.couleurs}. ${id.polices}. Le LOGO fourni (image 1), reproduit tel quel ; sur un fond sombre, en version claire.
Écrire EXACTEMENT les textes donnés, en français avec leurs accents, et aucun autre texte. Aucune personne, aucun visage, aucune main. Aucun pictogramme. Chaque photo différente.
IDÉE DE LA PAGE : ${plan.idee}`;
  const entete = `EN-TÊTE : le logo à gauche ; le menu ${id.menu.map((x) => `« ${x} »`).join(" ")}${id.telephone ? ` ; « ${id.telephone} »` : ""}${id.boutique ? " ; à droite, l'icône du PANIER (un sac ou un panier simple, avec un petit nombre d'articles) et l'icône du compte" : " ; aucun panier ni icône de compte (rien ne s'achète en ligne)"}.`;
  const pied = `PIED DE PAGE sur fond sombre : le logo en version claire${id.telephone ? `, « ${id.telephone} »` : ""}${id.horaires ? `, « ${id.horaires} »` : ""}${id.zone ? `, « ${id.zone} »` : ""}, liens ${id.liensPied.map((x) => `« ${x} »`).join(" ")}.`;
  const tous = [...m1, ...m2, ...m3], moitie = Math.ceil(tous.length / 2);
  return [
    { nom: "1-haut", refs: ["logo"], prompt: `${COMMUN}\nVue ORDINATEUR, pleine largeur. CE MORCEAU : LE HAUT DE LA PAGE, de haut en bas :\n${entete}\n${decrireSections(plan, m1)}\nL'image s'arrête nettement à la fin de la dernière section, sur toute la largeur.` },
    { nom: "2-milieu", refs: ["haut"], prompt: `${COMMUN.replace("Le LOGO fourni (image 1), reproduit tel quel ; sur un fond sombre, en version claire.", "AUCUN logo ni en-tête dans ce morceau.")}\nVue ORDINATEUR. CE MORCEAU : LA SUITE DE LA MÊME PAGE (elle suit l'image 1 : même largeur, mêmes marges, mêmes polices, même allure). Il commence directement par sa première section. De haut en bas :\n${decrireSections(plan, m2)}\nL'image commence et s'arrête nettement sur toute la largeur.` },
    { nom: "3-bas", refs: ["logo", "haut", "milieu"], prompt: `${COMMUN}\nVue ORDINATEUR. CE MORCEAU : LA FIN DE LA MÊME PAGE (elle suit les images 2 et 3 : même largeur, mêmes marges, mêmes polices, même allure). AUCUN en-tête en haut : il commence directement par sa première section ; le logo ne va QUE dans le pied de page. De haut en bas :\n${decrireSections(plan, m3)}\n${pied}` },
    { nom: "4-tel-haut", refs: ["logo", "haut"], prompt: `${COMMUN}\nVue TÉLÉPHONE de la MÊME page que l'image 2, adaptée : une seule colonne, textes lisibles, boutons larges et entiers. Présentation : TROIS écrans de téléphone longs, étroits, côte à côte, sans cadre de téléphone, qui se suivent de gauche à droite. Le premier commence par l'en-tête : le logo à gauche, un menu en trois traits à droite. Ces trois écrans montrent EXACTEMENT ces sections, une seule fois chacune, dans l'ordre :\n${decrireSections(plan, tous.slice(0, moitie))}` },
    { nom: "5-tel-bas", refs: ["logo", "tel1"], prompt: `${COMMUN}\nVue TÉLÉPHONE, même présentation que l'image 2 (TROIS écrans de téléphone longs et étroits côte à côte, sans cadre, une seule colonne), qu'elle continue. AUCUN en-tête en haut. Ces trois écrans montrent EXACTEMENT ces sections, une seule fois chacune, dans l'ordre, puis le pied de page :\n${decrireSections(plan, tous.slice(moitie))}\n${pied}` },
  ];
}

/** La demande de code : le plan complet, l'en-tête, le pied de page, les liens et la liste exacte des fichiers. */
export function demandeCode(plan: PlanPage, id: Identite, o: { photos: { fichier: string; format: string; description: string }[]; logo: string; logoClair: string; liens: string }): string {
  return [
    `PLAN DE LA PAGE (idée : ${plan.idee}) :`,
    ...plan.sections.map((s, i) => `${i + 1}. « ${s.nom} » — disposition : ${s.disposition} — fond : ${s.fond} — textes, dans l'ordre : ${s.textes.map((t) => `« ${t} »`).join(" ")}${s.photo ? ` — photo voulue : ${s.photo}` : ""}`),
    `IDENTITÉ : ${id.couleurs}. ${id.polices}.`,
    `EN-TÊTE : logo ; menu ${id.menu.map((x) => `« ${x} »`).join(" ")}${id.telephone ? ` ; « ${id.telephone} » (lien tel:)` : ""}${id.boutique ? " ; ICÔNE DU PANIER toujours visible, sur téléphone comme sur ordinateur : lien /cart avec le nombre d'articles ({{ cart.item_count }}) ; lien du compte" : " ; AUCUN panier ni lien /cart ni compte : ce métier vend des prestations, rien ne s'achète en ligne (essai réel du 20 novembre 2026 : un panier dans l'en-tête d'un réparateur de vélos)"}.`,
    `PIED DE PAGE (fond sombre) : logo clair${id.telephone ? ` ; « ${id.telephone} »` : ""}${id.horaires ? ` ; « ${id.horaires} »` : ""}${id.zone ? ` ; « ${id.zone} »` : ""} ; liens ${id.liensPied.map((x) => `« ${x} »`).join(" ")}.`,
    `LIENS : ${o.liens}`,
    `LOGO : '${o.logo}' (fond clair) ; '${o.logoClair}' (fond sombre).`,
    `PHOTOS DISPONIBLES (dans assets) :`, ...o.photos.map((p) => `- ${p.fichier} (${p.format}) : ${p.description}`),
    `IMAGES JOINTES : 1 à 3 = la page sur ordinateur, de haut en bas ; 4 = le haut de la page sur téléphone (trois écrans côte à côte).`,
  ].join("\n");
}

/** Nom court et sûr d'une marque pour les noms de fichiers (« Bécane » → « becane »). */
export const slugMarque = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "marque";

/** Un chemin de fichier de thème accepté (aucun chemin qui sort du thème, seulement les dossiers d'un thème Shopify). */
export const cheminSur = (p: string) => /^(layout|templates|sections|snippets|assets|config|locales)\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)?$/.test(p.replace(/^\/+/, "")) && !p.includes("..");
