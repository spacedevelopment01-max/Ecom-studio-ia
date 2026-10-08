# Theme Engine V2 — revue visuelle (phase 10A)

Date : 8 octobre 2026. Tout a été produit **localement**, sans aucun appel d'IA (0 €), sans clé, sans envoi vers une
vraie boutique. Les sites ont été **réellement ouverts dans un navigateur** (Chromium, Playwright) : aucune capture
n'est une maquette ni un montage. Les planches « comparaison-* » posent simplement côte à côte deux vraies captures
réduites, avec un titre.

> **Verdict technique : PASS. Verdict artistique : EN ATTENTE DE LA VALIDATION DU PROPRIÉTAIRE.**
> Ce document ne prétend pas que les sites sont « niveau agence ». L'outil de contrôle mesure des défauts
> (débordements, textes coupés, contrastes, images déformées…), **pas la beauté**. Le jugement artistique vous revient.

## 1. Comment les captures ont été faites

- Banc : `scripts/theme-v2-bench.ts` (base de démonstration séparée). Pour chaque projet : composition, version
  enregistrée, aperçu réel du studio (même moteur Liquid que l'onglet Boutique), ouverture dans Chromium.
- Conditions identiques AVANT / APRÈS : mêmes données de projet, mêmes médias, mêmes tailles d'écran
  (ordinateur 1440 × 900, téléphone 390 × 844), même script de capture (animations figées pour la capture, images
  chargées avant les captures pleine page). AVANT = ancien moteur (11 directions, `engine: "v1"`), APRÈS = Theme Engine V2.
- Contrôle visuel automatique : `scripts/lib/visual-check.ts` (voir § 6).
- Export : `scripts/theme-v2-check.ts` (ZIP réel + Theme Check officiel de Shopify).
- Planches : `scripts/theme-v2-compare.ts`. Diversité : `scripts/theme-v2-diversity.ts`.

### Médias de démonstration (signalés comme tels)

Aucune image hors sujet, aucun avis, aucun chiffre ni « Lorem » n'a été ajouté. Les médias de démonstration portent
`meta.demo = true` et une note dans la bibliothèque :

| Projet | Médias | Nature |
|---|---|---|
| A — Sébastien Blanc | aucun | aucune photo authentique de chantier disponible : le site est composé **sans image** (typographie) plutôt qu'avec un mur nu ou une photo hors sujet |
| B — Sérum Éclat | flacon compte-gouttes, mise en scène, texture | **dessinés localement** (SVG + sharp) — démonstration |
| C — Ostral (drone) | détouré, packshot, détails, scènes, bannière, logo | photos réelles d'un fournisseur (démo « drone » du studio, `public/demo/drone`) |
| D — Chez Lison | aucun | aucune photo authentique de la salle ou des plats : composition **sans image** |
| E — Nuvia (SaaS) | 2 captures d'interface | **dessinées localement**, données fictives, mention « Données de démonstration » visible dans l'image |

### Références externes

Les sites de référence cités dans la demande (scale-ova.ai et banques d'images) **n'ont pas pu être consultés** : le
réseau de l'environnement de travail les bloque. Aucune référence n'a donc été copiée ni examinée ; les choix
ci-dessous viennent des règles du moteur (type de site, traits de la marque), pas d'un modèle extérieur.

## 2. Les cinq sites

Dossiers : `reports/screenshots/theme-v2/<artisan|cosmetic|hightech|restaurant|saas>/`. Dans chaque dossier :
`avant-*` et `apres-*` (`accueil-desktop`, `accueil-mobile`, `secondaire-desktop`, `secondaire-mobile`, chacun en écran
et en page complète `-complet`), `navigation-desktop`, `navigation-mobile`, une interaction (`interaction-faq` ou
`interaction-panier`), et les planches `comparaison-accueil-desktop`, `comparaison-accueil-mobile-complet`,
`comparaison-secondaire-desktop`.

| | A — Sébastien Blanc | B — Sérum Éclat | C — Ostral | D — Chez Lison | E — Nuvia |
|---|---|---|---|---|---|
| Type de site (déduit du métier) | artisan, devis | boutique 1 produit | boutique 1 produit high-tech | restaurant | logiciel (SaaS) |
| Langage visuel | **Atelier précis** (craft) | **Maison éditoriale** (maison) | **Précision technique** (precision) | **Bistrot** (bistro) | **Produit numérique** (product) |
| Typographies | Archivo / Work Sans | Cormorant / Jost | Space Grotesk / Inter | Libre Baskerville / Karla | DM Sans |
| Fond | clair, matière plâtre discrète | crème, arche | sombre, trame fine | crème, ardoise sombre | blanc, halo |
| Ouverture | typographique (métier + ville), carte « Coordonnées » | produit en scène sous une arche, faits confirmés | produit en scène, grille, accent violet | enseigne en très grand + ardoise « Au menu » | titre centré + capture d'interface encadrée |
| En-tête | logo à gauche, barre | logo centré | menu à droite | navigation partagée autour du nom | logo à gauche |
| Accueil | ouverture › prestations › déroulé › infos › questions › appel | ouverture › en détail › appel | ouverture › galerie › en détail › appel | ouverture › la maison › infos pratiques › appel | ouverture › le produit › appel |
| Page secondaire contrôlée | Prestations | Fiche produit | Fiche produit | La carte | Fonctionnalités |
| Appel principal | Demander un devis | Acheter | Acheter | Nous contacter | Demander une démo |

Sébastien Blanc : **pas de mur de pierre générique**, ni d'image d'illustration. L'ouverture annonce le métier réel
(« Plâtrerie, enduits et peinture intérieure à Mâcon. »), le numéro, la zone, les horaires et l'adresse saisis à la
création du projet.

## 3. Différences de direction artistique (mesurées)

Mesure anti-gabarits (`reports/screenshots/theme-v2/diversite.json`), 0 = même gabarit, 1 = rien en commun ; les
couleurs ne pèsent que 5 % (changer les couleurs ne suffit pas à « différencier »).

| | Distance minimale | Distance moyenne | Paires « même gabarit » (< 0,35) |
|---|---|---|---|
| AVANT (V1) | **0,05** | 0,71 | **Ostral / Nuvia** (même ouverture plein écran, même titre « La technologie, sans détour. », mêmes sections) |
| APRÈS (V2) | **0,74** | 0,88 | aucune |

## 4. Avant / après — ce qui a changé à l'œil

| Projet | AVANT (défauts vus sur les captures) | APRÈS |
|---|---|---|
| A — Sébastien Blanc | cadres d'image vides (icône « montagne ») en ouverture ; nom coupé en pied de page (« SEBASTIE BLANC ») ; 3 boutons invisibles ; bouton de l'ouverture sous la ligne de flottaison | ouverture typographique lisible avec carte « Coordonnées » ; prestations en liste numérotée ; déroulé réel (« Votre demande / Le devis / La prestation ») ; aucun cadre vide |
| B — Sérum Éclat | pas de bouton dans l'ouverture (ordinateur) ; section d'avis **vide** sur la fiche produit ; nom coupé en pied de page | arche + flacon, bouton « Acheter » visible ; fiche produit sans note ni avis inventés ; une caractéristique **déduite d'une photo** (« Texture : gel fluide ») n'est plus affirmée |
| C — Ostral | logo cassé ; même gabarit et même titre que le SaaS ; section d'avis vide sur la fiche | langage sombre et technique propre au produit ; logo remplacé par le nom en texte (pas de version claire du logo) ; galerie en mosaïque sans trou |
| D — Chez Lison | cadre d'image vide ; « Prestations » et « Nous appeler » génériques d'un artisan ; palette identique à celle de l'artisan ; contrastes à 4,33:1 | enseigne + ardoise ; la liste des formules n'est plus répétée deux fois ; infos pratiques avec « [À compléter] » honnêtes (horaires, réservation, adresse) |
| E — Nuvia | fond flou illisible derrière le texte ; panier et « Boutique » dans le menu d'un logiciel ; titre « La technologie, sans détour. » | capture d'interface encadrée et nette ; ni panier ni boutique ; « Demander une démo » ; fonctionnalités et tarifs signalés « À compléter » plutôt qu'inventés |

## 5. Défauts trouvés pendant la phase et corrections

Défauts relevés **sur les captures V2 elles-mêmes** au fil des passes, puis corrigés dans le moteur (jamais par un
cas particulier du type `if (projet == …)`) :

| Défaut observé | Correction (générale) |
|---|---|
| Logo du drone cassé (SVG nommé .png, ancien cache) | SVG rastérisé à l'export ; clé de cache renouvelée |
| Logo foncé illisible sur langage sombre | nom en texte quand aucune version claire n'existe |
| Accent du high-tech terne | accent choisi parmi les couleurs de la marque, la plus saturée d'abord |
| Contenus en double (résumé répété, offres = faits, liste des formules répétée sous l'ardoise) | une information n'apparaît qu'une fois ; titre neutre quand le résumé est déjà dans l'ouverture |
| Fait déduit (« Texture gel fluide ») affiché comme vrai | contenu V2 = faits **confirmés** seulement (description, points forts, caractéristiques) |
| Bannière publicitaire (texte incrusté) dans la galerie | bannières exclues des galeries |
| Trous dans la mosaïque | règles de grille selon le nombre d'images |
| Pied de page V1 générique (newsletter, textes) | pied de page reconstruit ; colonnes sans liens en double |
| « À table chez Chez Lison » | grammaire du nom (« Chez … ») gérée |
| Ouverture « maison » non empilée sur téléphone | correction de spécificité CSS |
| Bande d'accent à 4,24:1 (drone) ; couleurs qui oscillaient | fond de bande assombri jusqu'à 4,5:1 ; ajustement dans un seul sens ; texte jamais moins lisible qu'au départ |
| Appel final « stabilisée » (un mot isolé) | les valeurs ne sont listées que s'il y en a au moins deux |
| Note d'avis sans avis | bloc retiré tant qu'il n'y a pas de vrais avis |

Faux positifs de l'outil de contrôle corrigés (l'outil ne doit pas inventer de défauts) : texte réservé aux lecteurs
d'écran compté comme « coupé », éléments fixes comptés comme chevauchements, défilement doux mesuré avant la fin.

## 6. Contrôle visuel automatique — résultats

Vérifie : débordement horizontal, éléments hors écran, textes coupés, chevauchements, images manquantes ou déformées,
contrastes (fonds unis), boutons invisibles, cibles tactiles, bouton de l'ouverture visible, sections vides, « Lorem »,
liens cassés, erreurs JavaScript, navigation mobile, clavier (focus visible), mouvements réduits
(`prefers-reduced-motion` : aucun texte ne reste invisible). **Il ne mesure pas la beauté.**

| Projet | AVANT bloquants / avertissements | APRÈS bloquants / avertissements |
|---|---|---|
| A — Sébastien Blanc | 0 / 14 | **0 / 0** |
| B — Sérum Éclat | 1 / 6 (section d'avis vide) | **0 / 0** |
| C — Ostral | 1 / 2 (section d'avis vide) | **0 / 0** |
| D — Chez Lison | 0 / 14 | **0 / 0** |
| E — Nuvia | 1 / 2 (section d'avis vide) | **0 / 0** |

Performances mesurées en local (pas Lighthouse, qui n'est pas installé ici ; aucune note Lighthouse n'est annoncée) —
accueil, ordinateur : LCP 140 à 252 ms, CLS ≤ 0,06, JavaScript 66 Ko ; téléphone : LCP 120 à 160 ms, CLS 0. Le poids
total (polices comprises, servies par l'aperçu local) baisse sur 4 projets sur 5 (ex. Sébastien Blanc 2 236 → 1 065 Ko,
Nuvia 2 560 → 780 Ko) ; Ostral reste lourd (2 724 Ko, photos du fournisseur). Ces chiffres sont ceux d'un serveur
local : ils ne prédisent pas les performances d'une vraie boutique Shopify.

## 7. Limites (honnêtes)

- Jugement artistique : **non fait par la machine**. Typographie, composition, originalité restent « non mesurées »
  dans le Quality Gate (`theme_v2`), qui ne peut pas dépasser PROVISOIRE sans vous.
- A et D n'ont aucune photo : les sites sont typographiques. Avec de vraies photos du client (chantiers, salle, plats),
  le moteur les place automatiquement ; ce cas n'a pas pu être vu ici faute de photos authentiques.
- Les médias de B et E sont des dessins de démonstration, pas des photos réelles.
- Chromium seulement (ni Safari ni Firefox) ; tablette vue seulement dans l'aperçu du studio.
- Fiche produit : la barre d'achat collante apparaît au milieu des captures « pleine page » (c'est un élément fixe :
  normal à l'écran, visible ainsi uniquement dans ce type de capture).
- L'aperçu local n'est pas une boutique Shopify réelle : l'installation et le rendu réels sont pour la phase 10B.
