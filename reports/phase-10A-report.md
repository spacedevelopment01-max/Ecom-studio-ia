# Phase 10A — Theme Engine V2 (design system et création de sites)

Date : 8 octobre 2026 · Branche `claude/ecom-studio-ia-platform-8cwl79` · Fusion : **NON** · 10B : **NON COMMENCÉE** ·
Phase 11 : **NON COMMENCÉE** · Dépenses IA : **0 €**

> En bref pour le propriétaire : quand le studio compose un site, il utilise maintenant un **nouveau moteur** qui part
> de votre métier (boutique, artisan, restaurant, logiciel…), choisit un **langage visuel** adapté (typographies,
> couleurs, ouverture, rythme des sections), construit les **pages utiles à ce métier** et n'écrit que ce qui est
> **confirmé** — le reste est marqué « [À compléter] ». Les cinq sites de référence (Sébastien Blanc, sérum, drone,
> restaurant, logiciel) ne se ressemblent plus entre eux, n'ont plus de cadres vides ni de sections vides, et passent
> le contrôle officiel de Shopify sans erreur. Vous pouvez tout modifier dans l'onglet Boutique, gratuitement, sans
> que le site entier soit régénéré.
>
> **Ce qui n'est PAS prouvé** : la beauté (c'est à vous d'en juger, captures à l'appui), le rendu sur une vraie
> boutique Shopify installée (10B), les vrais thèmes WooCommerce / PrestaShop installés (10B). L'ancien moteur reste
> disponible (directions de la galerie des thèmes).

Étiquettes : **DÉVELOPPÉ** (écrit et testé automatiquement) · **VÉRIFIÉ EN NAVIGATEUR** (ouvert et contrôlé dans
Chromium, captures à l'appui) · **NON VALIDÉ** (qualité ou fonctionnement réel non prouvés) · **NON DISPONIBLE**.

Rapport visuel détaillé : `reports/theme-v2-visual-review.md`. Captures : `reports/screenshots/theme-v2/`.

## 1. GIT STATE

- Départ : `d20b65e` (branche synchronisée avec `main` après la fusion de 9A).
- Phase 10A : un commit sur `claude/ecom-studio-ia-platform-8cwl79`, poussé sans forcer. **Aucune PR, aucune fusion.**
- Aucune migration de base (le thème V2 est enregistré dans les versions de thème existantes, champ `meta`).

## 2. PHASE 9A MERGE

PR #61 fusionnée après CI entièrement verte (squash `0b8d45c`), branche resynchronisée (`d20b65e`), registre mis à
jour (`fb6b9d6` : 9A validée, 9B reportée, règle des tests visuels pour la phase 10).

## 3. EXISTING THEME ENGINE AUDIT (avant 10A)

| Élément | Code | Constat |
|---|---|---|
| 11 directions | `src/lib/theme/directions.ts` (`buildSpec`, `CHROME`) | une direction = un habillage (couleurs, polices, en-tête) + une suite de sections ; le choix se faisait surtout par secteur |
| Composition | `src/lib/engine/shop.ts` (`composeShop`, `buildShop`) | même ossature pour des métiers différents (ex. drone et logiciel : même ouverture, même titre) |
| Bibliothèque | `theme-base/sections` (94 sections) | sections génériques ; des cadres d'image vides quand il n'y a pas de photo ; section d'avis présente même sans avis |
| Textes | `src/lib/engine/local-copy.ts` | faits « déduits » d'une photo affichés comme des faits (« Texture : gel fluide ») |
| Retouches | `src/lib/theme/ops.ts`, `engine/local.ts`, `local-first.ts` | opérations validées, versions, restauration — **réutilisées telles quelles** |
| Aperçu / export | `render.ts` (LiquidJS), `compile.ts` (`exportThemeZip`), `platforms.ts` | réutilisés ; ajout : rastérisation des SVG nommés .png |
| Défauts mesurés AVANT | banc `scripts/theme-v2-bench.ts --engine v1` | 3 sections vides bloquantes, 38 avertissements, 1 paire de sites quasi identiques (distance 0,05) |

## 4. NEW THEME ENGINE ARCHITECTURE

`PROJECT BRAIN → WEBSITE INTENT → ART DIRECTION → DESIGN SYSTEM → CONTENU & MÉDIAS → PAGE PLANNER → SECTIONS →
THEMESPEC (Shopify OS 2.0) → aperçu / éditeur / export / Quality Gate existants`.

| Brique | Fichier |
|---|---|
| Orchestration | `src/lib/theme-v2/engine.ts` (`composeThemeV2`, `buildShopV2`, version `10a.1`) |
| Intention du site | `src/lib/theme-v2/intent.ts` |
| Direction artistique | `src/lib/theme-v2/art-direction.ts` (5 langages visuels) |
| Design system | `src/lib/theme-v2/design-system.ts` |
| Contenu vérifié | `src/lib/theme-v2/content.ts` |
| Planificateur et sections | `src/lib/theme-v2/compose.ts` |
| Quality Gate | `src/lib/theme-v2/quality.ts` + politique `theme_v2` (`src/lib/quality/policies.ts`, version `2026-10-p10a`) |
| Diversité | `src/lib/theme-v2/diversity.ts` |
| Retouches locales | `src/lib/theme-v2/local-edit.ts` |
| Sections Liquid | `theme-base/sections/v2-{hero,index,split,steps,facts,specs,faq,cta,media}.liquid` |
| Feuille de style | `theme-base/assets/theme-v2.css` (chargée seulement si `ds_language` ≠ « none ») |

Aucun moteur existant n'a été reconstruit : la composition V2 part de la composition de base (`composeShop` : fiche
produit, panier, catalogue, gabarits obligatoires, médias), puis remplace l'accueil, les pages, l'en-tête, le pied de
page et les réglages globaux. **Nouveau par défaut** : `buildShop` utilise V2, sauf si une direction V1 est choisie
(galerie des thèmes, « change de direction ») ou si le projet est réglé `themeEngine: "v1"`. Le moteur V1 n'a pas été
modifié dans son rendu (vérifié : Theme Check complet des 11 directions FR/EN, multi, niche, services — tout valide).

## 5. WEBSITE INTENT

- Ancien : un « secteur » produit. Nouveau : `websiteIntent(p)` → type de site (`shop_mono`, `shop_multi`,
  `services_trade`, `local_service`, `restaurant`, `saas`), conversion (`buy`, `quote`, `call`, `book`, `demo`,
  `contact`), traits (premium, tech, chaleureux, beauté, alimentation), préférences mémorisées (ex. « tons chauds »),
  langue. Déduit du métier, des prestations et de la mémoire — **jamais du nom du client**.
- Tests : intentions des 5 projets, conversions. Statut : DÉVELOPPÉ.

## 6. ART DIRECTION

- Nouveau : 5 langages visuels — **Atelier précis** (Archivo / Work Sans, terre cuite, matière plâtre), **Maison
  éditoriale** (Cormorant / Jost, arche), **Précision technique** (Space Grotesk / Inter, sombre, trame),
  **Bistrot** (Libre Baskerville / Karla, ardoise), **Produit numérique** (DM Sans, cadre d'interface). Choix par
  score (type de site + traits), modifiable dans le studio.
- Palette : palette **validée** de la marque reprise telle quelle ; sinon couleurs de la marque compatibles avec le
  langage (la plus saturée d'abord) ; préférence « tons chauds » respectée ; contrastes corrigés.
- Typographies : validées par le client > piste de logo validée > langage.
- Tests : langage différent pour les 5 projets ; langage imposé respecté ; verrous palette et typographies respectés.
  Statut : DÉVELOPPÉ, VÉRIFIÉ EN NAVIGATEUR. Qualité artistique : **NON VALIDÉE** (à vous).

## 7. DESIGN SYSTEM

- Les choix deviennent de **vrais réglages du thème** (`settings_data.json`), modifiables dans l'éditeur Shopify :
  4 schémas de couleurs, typographies, échelle des titres (`ds_ratio`), densité (`ds_density`), rayons, boutons,
  animations, largeur, langage (`ds_language`). Nouveau groupe « Design system V2 » dans `settings_schema.json`
  (traduit en anglais).
- Contrastes garantis : texte ≥ 4,5:1 (vise 7:1), texte secondaire ≥ 4,5:1, texte des boutons ≥ 4,5:1, sur les
  4 schémas des 5 projets (testé). Deux défauts trouvés par les tests puis corrigés : couleur d'accent qui oscillait
  entre éclaircir et foncer ; texte rendu moins lisible sur un fond de luminance moyenne.

## 8. PAGE PLANNER

- Nouveau : pages selon le type de site (prestations, carte, fonctionnalités, tarifs, questions, contact, livraison,
  mentions légales…), chacune avec ses **données indispensables** ; une page incomplète est **signalée** (pastille
  orange dans le studio, liste « Informations à fournir ») au lieu d'être remplie de texte inventé.
- Tests : pages attendues par type ; gabarit présent pour chaque page ; « complète » ⇔ rien ne manque.

## 9. SECTION ENGINE

- 9 sections V2 à variantes : ouverture (scène, partagée, typographique, cadre, enseigne), liste (lignes, cartes,
  bento, menu), image + texte (gauche, droite, chevauchement ; devient une citation sans image), déroulé (ligne, pile,
  cartes), informations (bande, grille, registre), caractéristiques, questions (côte à côte, centré), appel final
  (bande, carte, partagé), galerie (mosaïque, rail).
- Règles : **aucune section vide** (une section sans contenu suffisant n'est pas posée), aucune image hors sujet,
  bannières publicitaires exclues des galeries, une information n'apparaît qu'une fois, fonds alternés.
- Tests : aucune `empty_section`, aucune affirmation inventée, spécification valide, un seul héros. Theme Check :
  0 erreur, 0 avertissement sur les 5 thèmes.

## 10. HEADER AND NAVIGATION

- Disposition et forme d'en-tête propres au langage (logo à gauche, centré, menu à droite, navigation autour du nom) ;
  bandeau d'annonce retiré (aucune offre réelle à annoncer) ; bouton d'appel adapté (devis, appel, démo) ; menu
  construit depuis le plan (SaaS : ni « Boutique » ni panier) ; pied de page reconstruit (plus de newsletter ni de
  textes génériques, plus de liens en double).
- Vérifié en navigateur : menu mobile ouvert sur les 5 sites (`apres-navigation-mobile.png`), navigation clavier
  avec repère de focus visible.

## 11. HERO DESIGN

- Ouverture choisie selon les médias réellement disponibles : produit détouré → scène ; capture d'interface → cadre ;
  pas d'image → typographique ou enseigne (jamais de cadre vide). Titre = positionnement réel ou métier + ville ;
  faits confirmés sous les boutons ; bouton principal visible sans défiler (contrôlé sur ordinateur et téléphone).

## 12. PRODUCT PAGES

- Ancien : description avec faits déduits d'une photo, note d'avis sans avis, section d'avis vide.
- Nouveau : bloc d'achat existant conservé (galerie, variantes, prix, panier, barre d'achat collante) ; description
  reconstruite à partir des faits **confirmés** ; points forts = valeurs confirmées courtes (jamais une valeur de
  déclinaison comme « 30 ml » quand 15 ml et 30 ml existent) ; ni note ni avis sans vrais avis ; caractéristiques et
  questions réelles en sections V2.
- Vérifié en navigateur (fiche Sérum Éclat et Ostral) ; ajout au panier testé (`apres-interaction-panier.png`).

## 13. SERVICE PAGES

- Page « Prestations » (artisan), « La carte » (restaurant), « Fonctionnalités » / « Tarifs » (logiciel), contact
  avec formulaire + coordonnées saisies. Sébastien Blanc : métier, ville, zone, numéro, horaires, adresse repris de la
  création du projet (jamais redemandés), **aucun mur de pierre ni image générique**.
- Tarifs du logiciel et plats du restaurant : « [À compléter] » (aucun prix ni plat inventé).

## 14. TYPOGRAPHY

- Associations libres (Google Fonts / bibliothèque Shopify), échelle modulaire par langage (`ds_ratio` 112 à 150),
  casse des titres par langage. Retouche « Change la typographie » : association suivante, **refusée** si les
  typographies ont été validées par le client.

## 15. ANIMATIONS

- Apparitions au défilement selon le langage (discrètes à marquées), parallaxe optionnelle ; « Réduis / supprime /
  plus d'animations » en conversation, sans IA. `prefers-reduced-motion` : animations coupées, **aucun texte ne reste
  invisible** (contrôlé en navigateur sur les 5 sites).

## 16. RESPONSIVE

- Mise en page téléphone propre (empilement, tailles, cibles tactiles ≥ 44 px, bouton d'en-tête réduit à l'icône avec
  libellé pour lecteur d'écran). Contrôlé à 390 × 844 : 0 débordement, 0 chevauchement, 0 texte coupé sur les 5 sites
  (accueil et page secondaire).

## 17. PERFORMANCE

- Mesures locales (pas Lighthouse, non installé ; **aucune note Lighthouse n'est annoncée**) — accueil :
  LCP 140–252 ms (ordinateur), 120–160 ms (téléphone) ; CLS ≤ 0,06 ; JavaScript ≤ 66 Ko ;
  poids total en baisse sur 4 projets sur 5 par rapport à V1. Feuille V2 chargée seulement pour les thèmes V2.
  Valeurs d'un serveur local : non représentatives d'une vraie boutique.

## 18. ACCESSIBILITY

- Contrastes calculés pour chaque schéma (testé) et mesurés en navigateur (aucun avertissement de contraste APRÈS ; plusieurs à 4,33–4,42:1 AVANT) ;
  un seul H1 ; navigation clavier avec focus visible ; libellés des boutons icônes ; mouvements réduits respectés.
  Non fait : audit complet par un outil spécialisé (axe) ni test avec un vrai lecteur d'écran.

## 19. THEME EDITOR

Parcours réel dans le studio (`scripts/e2e-theme-v2.ts`, compte en découverte gratuite, serveur + worker réels,
**24/24**, captures `reports/screenshots/theme-v2/editeur/`) :

| Étape (section 35) | Résultat |
|---|---|
| Ouvrir le projet, aperçu réel | ✓ |
| Aperçu ordinateur / tablette / téléphone | ✓ |
| Choisir une page (fiche produit) | ✓ |
| Modifier un texte désigné dans l'aperçu | ✓ sans IA, nouvelle version |
| Remplacer une image désignée par une image du projet | ✓ sans IA |
| Couleur des boutons | ✓ moteur local |
| Typographie | ✓ association V2 |
| Disposition d'une section (cette section seulement) | ✓ |
| Ajouter une section (FAQ V2, « [À compléter] ») | ✓ |
| Déplacer une section (panneau Structure) | ✓ |
| Supprimer une section (avec confirmation) | ✓ |
| Libellé d'un bouton | ✓ |
| Enregistrement + rechargement : tout est conservé | ✓ |
| Restaurer une version | ✓ (nouvelle version créée) |
| Export Shopify, WooCommerce, PrestaShop, kits Wix / Squarespace | ✓ (forfait payant ; refusé en découverte, règle du produit) |
| Téléphone : éditeur sans débordement | ✓ |
| Aucun appel d'IA, aucune erreur JavaScript | ✓ |

Ajouts dans l'onglet Boutique : panneau « Site — moteur V2 » (langage visuel, « Recomposer » gratuit, plan des pages
avec statut, informations à fournir), bouton « Disposition » pour les sections des pages V2, liste des pages selon
le plan. Les retouches ciblées ne régénèrent **jamais** le site entier (testé : une seule section change).

Manquant (documenté) : pas d'édition directe « dans la page » (on désigne puis on écrit la demande) ; pas de
sélecteur de couleur visuel par schéma dans l'onglet (réglage par la conversation ou dans l'éditeur Shopify) ;
remplacement d'image testé sur une section image + texte seulement.

## 20. PROJECT BRAIN INTEGRATION

Verrous de marque (`isLocked` : palette, typographies) respectés et testés ; préférences mémorisées lues (ex. tons
chauds) ; coordonnées et prestations de la création du projet reprises ; faits vérifiés uniquement.

## 21. IMAGE ENGINE V2 INTEGRATION

Médias pris dans la bibliothèque via `collectImages` (images refusées ou non utilisables exclues) ; rôles respectés
(détouré, mise en scène, détail, scène, bannière) ; bannières exclues des galeries ; aucune image générée pendant la
composition (0 €).

## 22. SEO ENGINE V2 INTEGRATION

Faits via `verifiedFacts` (SEO Engine V2) : seuls les faits confirmés et les réponses du client sont affichés ; un
seul H1 ; titres de pages et menus issus du plan. Le contenu SEO long (articles, pages riches) reste du ressort du
SEO Engine V2, non régénéré ici.

## 23. QUALITY GATE

Politique `theme_v2` : critères mesurés localement (sections remplies, hiérarchie, conversion, contrastes,
complétude, honnêteté, fidélité de marque, cohérence, responsive si contrôle navigateur) ; critères **artistiques non
mesurés** (direction artistique, originalité, composition, qualité typographique). Un thème techniquement valide
n'est **jamais FINAL automatiquement** : au mieux PROVISOIRE sans votre validation (testé). Chaque version V2
enregistre son contrôle.

## 24. SHOPIFY EXPORT

ZIP OS 2.0 réel (médias compris) pour les 5 projets : **Theme Check officiel 0 erreur, 0 avertissement** ;
correspondance aperçu ↔ export vérifiée (sections V2 utilisées, `theme-v2.css`, lien dans `theme.liquid`,
`ds_language`, gabarits des pages, médias) — `reports/screenshots/theme-v2/export-shopify.json`. Testé aussi dans
`tests/theme-v2.test.ts` (donc dans la CI). **Installation sur une vraie boutique : NON FAITE (10B).**

## 25. OTHER CMS STATUS

| Plateforme | Ce qui existe | Statut 10A |
|---|---|---|
| WooCommerce | thème bloc WordPress (theme.json, modèles, motifs) + CSV produits | ZIP produit et vérifié ; **défaut trouvé et corrigé** : les sections V2 sortaient vides → leur contenu est maintenant converti (titres, textes, boutons, faits, questions, images). Mise en page V2 non reproduite. **Jamais installé sur un vrai WordPress : NON VALIDÉ** |
| PrestaShop | thème enfant (accueil, CSS, médias) | même correction ; ZIP vérifié ; **jamais installé : NON VALIDÉ** |
| Wix / Squarespace | **kit** (médias, textes, couleurs, polices, mode d'emploi) | ce n'est **pas un thème natif** et n'est jamais présenté comme tel |

## 26. FIVE VISUAL BENCHMARKS

A — Sébastien Blanc (Atelier précis), B — Sérum Éclat (Maison éditoriale), C — Ostral (Précision technique),
D — Chez Lison (Bistrot), E — Nuvia (Produit numérique). Thèmes réels, ouverts dans Chromium ; accueil et page
secondaire, ordinateur et téléphone, navigation, une interaction. Résultat du contrôle automatique : **0 bloquant,
0 avertissement** sur les 5 (AVANT : 3 bloquants, 38 avertissements). Diversité : distance minimale **0,74** (AVANT
0,05). Détail et médias de démonstration : `reports/theme-v2-visual-review.md`. Les références externes demandées
(scale-ova.ai, banques d'images) étaient **bloquées par le réseau** : non consultées.

## 27. BEFORE / AFTER COMPARISON

Mêmes données, mêmes médias, mêmes conditions de capture. Planches :
`reports/screenshots/theme-v2/<projet>/comparaison-{accueil-desktop,accueil-mobile-complet,secondaire-desktop}.png`.
Résumés chiffrés : `avant-resume.json`, `apres-resume.json`, `diversite.json`.

## 28. SCREENSHOTS

`reports/screenshots/theme-v2/` : 5 dossiers de projet (captures AVANT et APRÈS + 3 planches + JSON des défauts et
mesures) ; `editeur/` (15 captures du parcours + `resultats.json`). Captures recompressées (PNG à palette)
pour alléger le dépôt.

## 29. VISUAL DEFECTS FOUND

AVANT (V1) : cadres d'image vides (artisan, restaurant), sections d'avis vides (3 fiches produit), logo cassé (drone),
drone et logiciel quasi identiques (même titre « La technologie, sans détour. »), fond flou illisible (logiciel),
panier et « Boutique » sur un logiciel, nom coupé en pied de page (5 sites), boutons invisibles, contrastes à 4,33:1,
bouton d'ouverture sous la ligne de flottaison, fait déduit affiché comme confirmé.
PENDANT (V2, avant correction) : voir le tableau du rapport visuel § 5 (doublons de contenu, contraste de la bande
d'accent, mot isolé dans l'appel final, mosaïque trouée, ouverture non empilée sur téléphone, liens en double…).

## 30. CORRECTIONS MADE

Toutes dans le moteur général (aucun cas particulier par client) : contenu confirmé seulement (description, points
forts, caractéristiques), dédoublonnage, titre neutre si le résumé est déjà dans l'ouverture, ardoise sans liste
répétée, bande d'accent à 4,5:1, ajustement des couleurs dans un seul sens, mosaïque sans trou, pied de page
reconstruit, grammaire « Chez … », logo texte sur fond sombre, SVG rastérisés, exports WooCommerce / PrestaShop
alimentés par les sections V2, retouche « disposition de l'appel final / de la galerie / de l'image et texte »,
panneau V2 sans texte coupé. Outil de contrôle : faux positifs retirés (texte pour lecteur d'écran, éléments fixes,
défilement doux).

## 31. TEST RESULTS

- Suite complète : **919/919** (109 fichiers), dont `tests/theme-v2.test.ts` (15 tests : intention, direction
  artistique, verrous, contrastes, planificateur, composition, contenu confirmé, retouches ciblées, Quality Gate,
  diversité, idempotence, export Shopify + Theme Check, exports WooCommerce / PrestaShop / kit, `buildShop` V2 par
  défaut et V1 sur demande, 0 appel d'IA).
- Navigateur : parcours de l'éditeur **24/24** ; banc visuel **20/20** pages contrôlées (5 projets × accueil et page
  secondaire × ordinateur et téléphone) sans défaut bloquant. Total : **44/44**.

## 32. TYPESCRIPT

`npx tsc --noEmit` : **OK** (aucune erreur).

## 33. BUILD

`npm run build` : **OK**.

## 34. THEME CHECK

`scripts/verify-theme.sh` (comme la CI) : 11 directions FR/EN, multi-produit, niche, services FR/EN, ZIP client —
**tout valide**. Thèmes V2 : 5/5 ZIP, 0 erreur, 0 avertissement.

## 35. KNOWN LIMITATIONS

- Qualité artistique : **non mesurable par la machine, en attente de votre validation**.
- Artisan et restaurant de référence sans photo authentique : sites typographiques ; rendu avec vraies photos non vu.
- Médias du sérum et du logiciel : dessins de démonstration.
- Chromium seulement ; pas de vraie tablette ; pas d'audit axe ni de lecteur d'écran réel ; pas de Lighthouse.
- Aucun thème installé sur une vraie boutique Shopify, WordPress ou PrestaShop (10B).
- WooCommerce / PrestaShop : contenu V2 repris, mise en page V2 non reproduite ; Wix / Squarespace : kits seulement.
- Éditeur : pas d'édition directe dans la page, pas de sélecteur visuel des schémas de couleurs, remplacement d'image
  testé sur un seul type de section.
- 5 langages visuels seulement ; les boutiques à plusieurs produits utilisent les mêmes langages (non testé en
  navigateur dans ce banc).
- Les projets dont la version actuelle est V1 restent en V1 tant que le site n'est pas recomposé.

## 36. REMAINING WORK

Voir `reports/remaining-work.md` (10B ajoutée, limites de 10A listées).

## 37. READY FOR PHASE 10B

Oui, techniquement : thèmes V2 valides (Theme Check), exports produits, éditeur testé, banc et scripts prêts
(`theme-v2-bench.ts`, `theme-v2-check.ts`, `theme-v2-compare.ts`, `theme-v2-diversity.ts`, `e2e-theme-v2.ts`).
10B (vraies plateformes : installation Shopify, WordPress, PrestaShop ; éventuelles retouches IA réelles) **n'a pas
été commencée** et ne le sera qu'avec votre accord. Votre validation artistique des captures est attendue avant.
