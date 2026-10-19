# Mission E — quatre démonstrations, trois catégories, quatre thèmes de référence (issue #137, PR #139)

## État courant

| | |
|---|---|
| **Consignes suivies** | commentaires 6263159896 (08 h 37) et 6263246796 (08 h 42) — mission E ; commentaire **6264718511 (10 h 06) : périmètre restreint aux quatre démonstrations conservées** ; commentaire **6264783184 (10 h 09) : les trente anciens thèmes quittent le catalogue actif**, seuls FRAISE, ONDE, ORBE et Atelier Rive sont proposés |
| **Commit testé** | `d12013d0` (code : mission E `84251d65` + reprise ORBE et corrections CI ; ce rapport est complété par le commit de documentation qui suit, sans changement de code) — toutes les vérifications ci-dessous exécutées sur cet arbre de travail |
| **Branche** | `claude/fraise-onde-themes-reference`, PR #139 en brouillon ; aucune fusion, aucun déploiement, aucun appel IA payant, aucun envoi externe ; fichiers Codex (`src/lib/cms-v2/**`, `src/lib/theme/catalog-export.ts`, `assets/cms/**`) non modifiés ; PR #138 / PR #140 non touchées |
| **Aperçus consultables** | https://claude.ai/artifact/Fh8L9hmmEKTygrPRHbVnou (version `1792416743-97ec`, page d'entrée avec la matrice de statut et les captures avant / après d'ORBE ; dossiers `fraise/`, `onde/`, `orbe/`, `rive/`, `fraise-en-onde/`, `onde-en-fraise/`, `preuves/` — export statique des pages rendues par le vrai moteur, panier simulé). Les aperçus FRAISE / ONDE du lot 2C (https://claude.ai/artifact/76G1kbkrCrk47173e39MLM et https://claude.ai/artifact/To1HtwE7JbUpaypAVtFUk2) restent ceux des fixtures du lot 2C, inchangés |
| **ZIP privé** | `QUATRE_THEMES_Claude_issue137_<commit>.zip` (visuels du kit, captures, aperçus statiques, audits, rapports) — les visuels des démonstrations et les vignettes des thèmes **ne sont pas dans GitHub** (voir « Décisions demandées ») |

## 1. Démonstrations : quatre conservées, les autres retirées

**Conservées (seules démonstrations du studio, `public/demo/manifest.json`)** : FRAISE (gummies — boutique spécialisée, thème `fraise`), ONDE (casque — boutique spécialisée, thème `onde`), ORBE (lampe — e-commerce, thème `orbe`), Atelier Rive (décoration d'intérieur — prestations de services, thème `rive`).

**Retirées de l'expérience livrée** : ARVEN (montre, `montre`), Cime (gourde, `gourde`), Les Tribunes (`tribunes`), Sonore (casque, `casque`), Racines & Pierres (paysagiste, `paysagiste`), Atelier Pivoine (fleuriste, `fleuriste`), Ostral (drone, `services`), la démonstration « pub vidéo » (`pub-video`) et les anciennes vignettes de thèmes (`public/demo/directions/`, régénérées à partir des quatre démonstrations).

| Où | Ce qui a été fait |
|---|---|
| Dossiers `public/demo/<ancienne démo>/` | Retirés du dépôt (`git rm`), y compris captures, films et visuels |
| Manifestes `public/demo/manifest.json` / `manifest.en.json` | Réécrits : quatre démonstrations, avec `category` (services / catalog / specialty), `business`, `storeType`, palette, visuels étiquetés |
| Sélecteurs et données initiales (`src/lib/demo-content.ts`, `src/components/home/demo-curation.ts`, `src/lib/discovery-demos.ts`) | `DEMO_IDS` = les quatre ; curation par section réaffectée aux quatre ; aucun identifiant ancien ; un fichier absent du kit est omis côté serveur (`onlyPresentFiles`), jamais d'image cassée |
| Pages de présentation (`src/app/page.tsx`, `src/app/studio/decouverte/page.tsx`, `src/app/themes/page.tsx`, `src/components/auth-form.tsx`, galerie des thèmes) | Textes et visuels réaffectés aux quatre démonstrations |
| Mécanismes de recréation automatique | `scripts/build-demos.ts`, `scripts/demo-products/`, `scripts/demo-renders/` supprimés ; `scripts/theme-previews.ts` réécrit, piloté par le manifeste (vignettes des 34 thèmes et captures des quatre démonstrations) ; scripts propres à ARVEN / Sonore supprimés (`demo-arven-*`, `demo-sonore-*`, `pub-correction-*.cjs`, `pub-remplace-ligne.cjs`) |
| Libellés | « Fichiers · Cime » de l'animation de rangement → « Fichiers · ORBE » ; partenaire d'exemple « Atelier Cime » renommé ; commentaire de la bibliothèque d'icônes |
| Tests | `tests/accueil-demos-ia.test.ts` (cinq anciennes démos) supprimé ; `tests/accueil-audit.test.ts`, `tests/decouverte-visuels.test.ts` réécrits pour les quatre ; `tests/lot2a-fixtures.ts` prend ses visuels dans les quatre démonstrations (fixture synthétique « ARVEN / Racines & Pierres » conservée comme fixture isolée, pas comme démo) |
| Projets clients | **Aucun projet supprimé** ; rien n'est déduit d'un nom |

**Ce qui reste et pourquoi (dit tel quel)** :
- Les films explicatifs de l'accueil (`public/explainers/*.mp4`, sources `scripts/film/*.html`) et les vidéos de tutoriel (`public/tutorials/`) ont été montés avec les anciennes démonstrations : ils les montrent encore. Les remonter avec les quatre démonstrations est un chantier à part (montage FFmpeg, musique, versions FR/EN) : **non fait dans ce lot**, deux contrôles de provenance de `tests/films-accueil.test.ts` sont suspendus explicitement avec ce motif. Décision demandée à Thomas (remonter les films / les retirer de l'accueil en attendant).
- Les dossiers racine `ARVEN_*`, `SONORE_*`, `PAYSAGISTE_*` (essais Qwen / Wan des missions précédentes) et les notes d'ingénierie qui citent ces essais dans les commentaires du code (`image-v2`, `ads-v2`, `media`) ne font pas partie de l'expérience livrée : laissés tels quels (domaine Codex pour les publicités).
- `scripts/demo-planche-locale.ts`, `scripts/demo-posts-ia-spec.ts`, `scripts/alibaba-wan-essai.ts` : outils paramétrés qui citent encore d'anciennes démonstrations dans leurs données ; ils ne sont appelés par aucune page ni aucun test. À migrer vers les quatre démonstrations si on veut refaire des publications IA (appels payants : non faits).

## 1 bis. Catalogue actif réduit aux quatre thèmes (commentaire 6264783184)

**Proposés (catalogue actif)** : `fraise`, `onde`, `orbe`, `rive` — `ACTIVE_THEMES` (`src/lib/theme/theme-fit.ts`), `ACTIVE_DIRECTIONS` (`directions.ts`). **Retirés** : les trente anciens thèmes (atelier, clinique, brut, terroir, nocturne, pop, galerie, elan, flux, gourmand, joaillerie, vitrine, magazine, lookbook, marche, jardin, reception, cabinet, recre, epure, manifeste, laboratoire, cinema, rituel, horizon, signal, tribu, etabli, velours, lancement). Leurs définitions restent dans le code **uniquement pour lire les projets existants** ; ils ne sont ni modernisés ni remplacés dans ce lot.

| Où un thème est proposé | Comportement maintenant |
|---|---|
| Galerie « Thèmes » du studio (`GET …/theme` → `directions`, `theme-gallery.tsx`) | Quatre cartes. Un projet dont le thème installé est retiré voit ce thème en plus, signalé « Retiré du catalogue », conservé pour lui seul |
| Onglet Marque (`tab-marque.tsx`) | Quatre directions, plus la direction installée si elle est retirée (infobulle) |
| Sélection côté serveur (`plan-gates.assertThemeAllowed`, routes `theme/build`, `brand`, `switchDirection` du worker) | Un thème retiré est refusé pour toute nouvelle sélection (400, motif explicite), même avec le forfait le plus large ; le thème déjà installé reste recomposable |
| Forfaits (`plans.ts`, `theme-access.ts`) | Les quatre thèmes sont inclus dans tout forfait payant ; l'ancien palier 10 / 20 / 30 disparaît avec l'ancien catalogue (tarifs : « les quatre thèmes de référence ») ; rien sans forfait |
| IA (`prompts.DIRECTION_LIST`, schéma de `tasks.ts`) et commandes locales (`localThemeCommand`) | Ne connaissent que les quatre ; « passe en thème Jardin » ne fait plus rien ; une réponse IA hors catalogue retombe sur un thème actif |
| Moteur local (`localBrand`, `SECTOR_DIRECTION`) | Direction par défaut : services → Rive, plusieurs produits → ORBE, un produit → FRAISE (ONDE pour son / high-tech) |
| Recommandation (`theme-recommendation.ts`) | `eligible` / `excluded` calculés sur le catalogue actif seulement ; un contrat Codex qui cite un thème retiré est ignoré avec un avertissement ; **aucun repli** vers l'ancien catalogue quand aucun thème actif ne convient (liste vide + motifs) |
| Découverte, page publique `/themes`, accueil, tarifs | Textes et grilles : quatre thèmes de référence |
| Aperçu `dir-<thème>` (vignettes) | Thèmes actifs, ou le thème déjà installé du projet |
| Vignettes (`scripts/theme-previews.ts`) | Par défaut les quatre ; un identifiant explicite reste accepté |
| Bibliothèque « Sections » | Sections `cv-*` (FRAISE, ONDE), `ed-*` (ORBE, Rive), `ref-*` (ORBE, Rive) et les composants partagés, filtrés par thème installé ET catégorie. Aucune section n'est propre à un seul ancien thème ; `ref-*` reste rendu par Vitrine / Jardin pour les projets qui les utilisent encore (compatibilité de lecture), sans être proposé à un autre thème |
| Compatibilité de lecture | `buildSpec`, rendu, versions et retouches d'un projet composé dans un ancien thème fonctionnent à l'identique ; aucune migration ni suppression silencieuse ; cas réellement rencontré dans ce lot : aucun projet client (base locale de test seulement) |
| Codex | Le studio ne lit le contrat `project.ready_for_theme` que pour les quatre identifiants actifs ; à aligner côté Codex : catalogue de recommandation = `fraise`, `onde`, `orbe`, `rive` (tout autre identifiant est ignoré avec avertissement). `src/lib/cms-v2/**` et `catalog-export.ts` n'importent pas le catalogue : rien à y changer |

Contrôle automatique : `tests/catalogue-actif.test.ts` (quatre actifs, trente retirés jamais proposés, galerie, IA, commandes locales, moteur local, lecture d'un ancien thème), `tests/permissions-forfaits.test.ts`, `tests/themes-catalogue.test.ts`, `tests/categories-sections.test.ts`, `tests/handoff-contrat.test.ts` réalignés.

## 2. Trois catégories et recommandation de thème (contrat avec le chantier Codex)

- **Clé stable** `storeKind` : `services` (prestations de services), `catalog` (e-commerce, plusieurs produits), `specialty` (boutique spécialisée, un produit phare) — `src/lib/theme/store-kind.ts` (libellés FR/EN, règles de classement avec niveau de certitude `sure` / `ask`).
- **Source de la catégorie d'un projet** (`src/lib/theme/project-kind.ts`) dans l'ordre : réglage explicite du client (`settings.storeKind`, posé par `POST /api/projects/:id/theme/store-kind`), contrat de préparation Codex (`project.ready_for_theme`), puis déduction locale (activité, type de boutique, taille du catalogue). En cas de doute (`ask`), le studio **demande** une question simple, il ne change jamais le thème installé en silence.
- **Thèmes éligibles** (`src/lib/theme/theme-fit.ts`) : `fraise`, `onde` → boutique spécialisée ; `orbe` → e-commerce ; `rive` → prestations ; les 30 thèmes du catalogue restent éligibles aux trois catégories. Motif lisible pour chaque exclusion.
- **Recommandation** (`src/lib/theme/theme-recommendation.ts`) : lue depuis le contrat Codex (`recommendation.recommendedId`, `alternatives`, `reasons`, `status`) **sans recalcul**, filtrée par la catégorie ; repli local étiqueté `source: "local"` ; `GET /api/projects/:id/theme` renvoie `storeKind`, `recommendation` (`category`, `eligible`, `excluded`, `recommended`, `alternatives`, `reasons`, `source`, `warnings`). La galerie des thèmes affiche la catégorie, « Recommandé », « Alternative », « Thème de référence » et le motif d'inéligibilité.
- **Pour Codex** : le contrat `project.ready_for_theme` est consommé tel quel (`revision`, `provenance`, `recommendation`, `media`, `copy`, `copyReadiness`) ; aucune duplication du moteur de recommandation. Besoin signalé : exposer `storeKind` dans le contrat quand la préparation le connaît (lu si présent, sinon déduit).

## 3. Galerie « Sections » strictement contextuelle

- Métadonnées explicites par type de section (`src/lib/theme/section-fit.ts`, `SECTION_FIT`) : catégories compatibles, thèmes compatibles, profil graphique requis (`conversion` pour `cv-*`, `editorial` pour `ed-*`), motif lisible.
- **Mêmes règles pour tous les chemins d'ajout** : panneau manuel (`GET …/theme` → `library` filtrée, `incompatible` listé), ajout par IA et commandes locales (`local.ts`, `custom-theme.ts`, `tasks.ts`), serveur (`ops.ts` : `add_section` et `replace_section` refusent une section incompatible avec un motif).
- **Changement de thème ou nouveau remplissage** : `src/lib/theme/carry-over.ts` reporte les ajouts du client, garde **masquées avec motif** les sections devenues incompatibles (jamais supprimées en silence), réapplique les réglages modifiés et signale les conflits (valeur du client gardée) ; compte rendu lisible dans la version composée (`meta.carryOver`).

## 4. Quatre thèmes de référence comme vrais thèmes du studio

| Thème | Catégorie | Polices | Profil | Accueil (ordre des sections) |
|---|---|---|---|---|
| `fraise` | boutique spécialisée | Montserrat 800 / DM Sans | conversion « pop », bouton plein ; palette de direction : principal `#C4312A` (5,1:1 sur le crème), accent `#E4473F` | cv-hero, bandeau, avis, bénéfices, grille d'icônes (2 colonnes sur téléphone), comparatif, chiffres, garantie, stories, FAQ, lettre |
| `onde` | boutique spécialisée | Inter 700 / DM Sans | conversion « contrast », en-tête flottant, halo ; palette de direction : principal `#257A10` (5,4:1 sur blanc), accent `#4ECD01` | cv-banner en ouverture (titre h1), bandeau, FAQ en lignes… |
| `orbe` | e-commerce | Cormorant 500 / DM Sans | éditorial « object » | ed-opening immersive, scènes, étude, cartes… |
| `rive` | prestations | Archivo 600 / Work Sans | éditorial « journal » | ed-opening, déclaration, récit, prestations, méthode, diptyque, réalisations, témoignages, pratique, FAQ, contact |

Chacun a sa palette (`direction-palettes.ts`), son préréglage `style_preset`, sa signature CSS (`.dir-<id>`), ses compositions accueil / fiche / prestations (`src/lib/theme/reference-themes.ts`), sa vignette (34 thèmes, `scripts/theme-previews.ts`) et ses droits (`theme-access.ts`, forfait « créer »).

## 5. Remplissage automatique et préservation des retouches

- `src/lib/theme/handoff.ts` : chaque média du contrat (10 images + vidéo d'ouverture pour un produit ; 10 photos + 2 vidéos pour des prestations) est affecté **explicitement** à un emplacement du thème selon son format et son usage ; rien n'est inventé ; « non placé » et « emplacement vide » sont listés (`meta.handoff`) ; la rédaction du contrat est reprise quand elle est prête (`copyReadiness.mapped`). Testé avec un contrat simulé (`tests/handoff-contrat.test.ts`), **pas avec une préparation Codex réelle**.
- Sans contrat (les quatre démonstrations) : visuels du projet placés par rôles ; ce qui manque reste « à compléter » et les sections incomplètes sont masquées (`library-fill.ts`).

## 6. Corrections faites dans ce lot

| Défaut | Correction |
|---|---|
| Pages FAQ, contact, à propos, prestations sans `h1` (toutes les compositions du catalogue) | `ensurePageTitles` (`directions.ts`) : un titre de page (`main-page`) est ajouté quand la première section visible ne porte pas le h1 |
| Accueil ONDE sans `h1` (ouverture `cv-banner`) | `heading_tag` ajouté à `cv-banner` (h1 en ouverture) |
| Quatre icônes en une colonne sur téléphone | `features-grid` : `columns_mobile = 2` quand il y a quatre bénéfices |
| Cadres d'images produit irréguliers | `gallery_ratio = square` sur FRAISE / ONDE, galerie en carrousel ; bouton FRAISE plein (le contour rendait le texte invisible) ; stories masquées sans vidéo |
| Pied de page FRAISE : blanc sur le rouge d'identité à 3,98:1 (audit : 360 textes sur 10 pages × 6 cadres) | Cause réelle : le constructeur de schéma visait 7:1 et basculait le texte sombre (4,62:1) vers le blanc (3,98:1). Correction (`scheme`, `directions.ts`) : le meilleur des deux textes est gardé ; et le schéma « plein » (`filled`) assombrit la couleur quand ni le noir ni le blanc n'atteint 4,5:1 — tous les thèmes |
| Texte atténué 4,07:1 sur les cartes sombres (Atelier Rive, page contact) et 4,48:1 sur les cartes claires (à propos) | Le texte atténué de chaque schéma est garanti 4,5:1 sur le fond ET sur la surface des cartes — tous les thèmes |
| Nom « Atelier Rive » rogné à 60 px dans l'en-tête sur téléphone | Cause réelle : le bouton d'appel de l'en-tête gardait la largeur minimale des boutons du thème (200 px) au lieu de passer en rond de 44 px. Correction : règle mobile renforcée dans `header.liquid` ; en plus, colonnes latérales de l'en-tête à leur contenu et nom de marque en `clamp()` |
| Bouton flottant (contact) recouvrant « FAQ » / « Recherche » de la ligne basse du pied de page (ORBE, 5 pages) | Le bouton flottant s'efface aussi quand cette ligne est à l'écran (`initFabAvoid`) |
| Titre de carte produit : cible tactile de 19 px (boutique, 3 thèmes) | Lien en bloc avec marge interne (≥ 24 px) |
| Appel à l'action sur photo (page à propos) : voile de 45 % — blanc non garanti lisible sur une photo claire ; **non mesurable** par l'audit (il voit « blanc sur blanc ») | Voile porté à 60 % dans la composition ; lisibilité réelle à juger sur les captures, dite telle quelle |
| Bouton « Envoyer » invisible (anthracite sur anthracite, 1,12:1) sur la section sombre de la FAQ en profil « conversion » avec la palette ONDE (preuve d'adaptation) | Variable CSS `--cv-button-bg` calculée une fois sur `:root` avec l'accent de la page : redéclarée dans chaque section à schéma (`conversion.css`) |
| Palettes de direction FRAISE / ONDE refusées par les contrôles de marque (principal 3,7:1 et 2,1:1 sur le clair, secondaire trop sombre pour un fond doux) | Principal assombri (`#C4312A`, `#257A10`), secondaire pâle, accent d'identité inchangé — ce sont les couleurs de repli d'un projet sans palette ; les démonstrations gardent leurs propres rôles de couleur |

## 6 bis. Reprise visuelle d'ORBE (commentaires 6267178241 et 6267186666, 12 h 26 / 12 h 27)

Thomas a testé l'aperçu sur son téléphone : accordéons « À compléter », titres et slogan répétés, grands vides, deux vues
proches empilées, produit coupé, deux gros boutons flottants, paiement accéléré grisé ; « la mise en page n'est pas belle ».
Reproduit sur l'aperçu livré (commit `84251d65`, dossiers `orbe/`) et **diagnostiqué dans les données composées**, pas d'après les captures :

| Défaut constaté | Cause réelle (où) | Correction |
|---|---|---|
| Même slogan et même résumé dans cinq sections (ouverture, déclaration, diptyque, scène, finitions, étude) ; « Lampe nomade ORBE » deux fois dans le diptyque | `section-copy-editorial.ts` donnait à toute section `ed-*` la signature de la marque, le résumé et le nom du produit | Rédaction **par rôle** : ouverture = signature + résumé ; déclaration = histoire courte + repères (faits confirmés) ; diptyque = « Vue complète et détail », cadres légendés par le rôle du visuel ; scène = positionnement ; finitions = fait « finitions » ; étude = deux vues légendées. Un texte « [À définir / À compléter] » compte pour vide |
| Cadres gris vides (diptyque, finitions, étude) | Cadres du préréglage sans image ; sélecteur de finition avec une seule variante « Default Title » ; images différées non chargées dans les captures | Diptyque : cadres sans image non rendus, cadres pris dans la galerie (vue complète + second détail) ; finitions : sélecteur seulement avec de vraies variantes ; captures après défilement complet |
| « Default Title / Choisir les variantes » | Produit ORBE sans variante alors que le kit montre trois finitions | Démonstration ORBE : option **Finition** (Dune, Argile, Charbon), une image par finition (`meta.variant`), reprise par le moteur (`collectImages` → `variantImages`, image de variante dans la galerie, sélecteur, finitions, panier) ; les images de variantes ouvrent la galerie dans l'ordre des options |
| Accordéons « [À compléter : caractéristiques / matières / livraison] » visibles | Onglets posés même sans contenu | Onglet dont tout le contenu est « à compléter » non posé (tous les thèmes) ; faits ORBE descriptifs (finitions, silhouette) → onglet « Caractéristiques » réel |
| Résumé lu trois fois (texte, description, onglet) et points forts tronqués (« Dune ») | Description = résumé + faits ; point fort = premier mot avant la virgule | Description posée seulement si elle apporte autre chose que l'accroche, les points forts et les onglets (`directions.ts`, `product-content.ts`) ; point fort en liste = intitulé + liste entière |
| Produit coupé en haut et en bas | Cadre de galerie par défaut | ORBE : cadre portrait (images 4:5 du kit, rien de coupé) |
| Deux boutons flottants volumineux sur les médias | Retour en haut + contact, 58 px, halo | Téléphone : un seul bouton (contact) de 46 px sans halo ; retour en haut masqué |
| Paiement accéléré : gros bouton grisé | Bouton factice désactivé dans l'aperçu | Mention discrète : « ajouté par Shopify sur la boutique en ligne » — aucun paiement promis |
| Ouverture ordinateur : titre sombre sur photo sombre | Voile radial trop léger (55 %) | Voile renforcé (92 % au centre) : titre lisible sur toute photo, photo visible à droite |
| Composition sans hiérarchie ni ensembles texte/image | Enchaînement accueil / fiche hérité | **Accueil** : ouverture en situation (h1) → déclaration + repères → diptyque vue complète / détail → scène du soir → finitions avec sélecteur et accès à la fiche → FAQ (masquée sans réponses) → appel à l'action. **Fiche** : galerie portrait + titre / prix / finition / achat regroupés, points forts, onglet Caractéristiques → finitions (vues par finition) → scène. Marges 72 px, un rôle par section, aucune répétition |

Vérifié visuellement (captures pleine page 390 et 1 440 px, après défilement) : accueil, fiche, boutique, FAQ, contact, livraison, histoire, panier vide / rempli, recherche, 404. Composants partagés touchés (rédaction `ed-*`, onglets, description, points forts, boutons flottants, mention de paiement, voile d'ouverture) : les trois autres thèmes sont **ré-exportés et revérifiés** (contrôle statique + audit, tableau §9). Atelier Rive : sa composition « boutique » de repli prend une étude à la place du diptyque (distinction des enchaînements). Le téléphone de Thomas n'est pas testé directement.

## 7. Exports : réglages à signaler (pour Codex, sans toucher `cms-v2`)

Réglages propres aux thèmes de référence que les exports non Shopify doivent **signaler comme non pris en charge** quand leur adaptateur ne les rend pas (jamais les ignorer en silence) : `conversion_profile`, `editorial_profile`, `look_*` (en-tête flottant, halo, bouton), `heading_tag`, `columns_mobile`, `gallery_ratio`, `sticky_bar`, `animation` / `animation_speed`, blocs `cv-*` et `ed-*`. Le thème Shopify les exporte nativement (schémas, `settings_schema.json`). Contrat détaillé : [`LOT_2C_CONTRAT_EDITION_EXPORT.md`](LOT_2C_CONTRAT_EDITION_EXPORT.md), §3 bis.

## 8. Matrice de statut par thème

| Thème | Identité | Remplissage | Bibliothèque | Édition | Responsive | Export |
|---|---|---|---|---|---|---|
| FRAISE (`fraise`) | **exécuté** : palette, polices, profil « pop », logo et favicon du kit, aperçu complet (11 pages) | **exécuté** (visuels du projet par rôles, 13 images) · **simulé** (contrat Codex : test avec contrat simulé) | **exécuté** (moteur, route, tests) · interface non rejouée | **simulé** (opérations, report des retouches testés) · interface rejouée lors des lots précédents | **exécuté** : 6 cadres, 0 débordement, 0 texte coupé, 0 élément recouvert, 0 cible < 24 px, 0 contraste < seuil | **exécuté** Theme Check (Shopify) · autres plateformes **non vérifié** (Codex) |
| ONDE (`onde`) | **exécuté** (profil « contrast », ouverture h1, logo et favicon) | idem FRAISE | idem | idem FRAISE | **exécuté** : idem ; 1 titre blanc sur photo + voile 60 % **non mesurable** par l'audit | idem |
| ORBE (`orbe`) | **exécuté** (profil éditorial « object », 13 images ; pas de logo dans le kit → nom en toutes lettres) | **exécuté** (visuels) · **simulé** (contrat) | **exécuté** (moteur, route, tests) | **simulé** (opérations) · interface **non vérifiée** dans ce lot | **exécuté** : idem ; 1 titre sur photo **non mesurable** | idem |
| Atelier Rive (`rive`) | **exécuté** (profil « journal », 14 photos, prestations, pas de logo dans le kit) | **exécuté** (visuels) · **simulé** (contrat services) | **exécuté** (sections de prestations seulement, boutique exclue) | **simulé** (opérations) · interface **non vérifiée** dans ce lot | **exécuté** : idem ; 2 titres sur photo **non mesurables** | idem |
| Adaptation FRAISE → ONDE et ONDE → FRAISE | **exécuté** (nom, couleurs et visuels de l'une dans la composition de l'autre) | **exécuté** | — | — | **exécuté** (0 défaut mesurable, 1 titre sur photo non mesurable) | — |

Légende : **exécuté** = vérifié par un script ou un test sur le commit testé ; **simulé** = vérifié par le moteur (tests, opérations) sans passage par l'interface du studio ; **non vérifié** = rien d'exécuté dans ce lot.

## 9. Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx vitest run` (suite complète, hors `migration-v2` qui dépasse 120 s dans cet environnement et passe en CI) | 270 fichiers, 2 016 tests : **2 009 OK, 2 suspendus explicitement** (films : anciennes démos), 5 échecs : 2 dus aux deux derniers correctifs encore en cours pendant la suite (`handoff-contrat` alias, `lot2b-editorial`), **rejoués seuls sur le commit testé : 11 / 11 OK** ; 3 dépassements de délai sous charge (`workflow-v2`, 240 s, pendant les audits Chromium) — rejoué seul : voir ligne suivante |
| `npx vitest run tests/workflow-v2.test.ts` (seul, sur le commit testé) | **11 / 11 OK** en 430 s (les dépassements de délai de la suite complète venaient de la charge machine, pas du code) |
| `bash scripts/verify-theme.sh --rapide` (Theme Check) | OK — « Thème : tout est valide » (après chaque modification Liquid / CSS) |
| `scripts/reference-static-preview.ts --cross` (6 compositions, vrai moteur, routes d'aperçu réelles) | OK — FRAISE / ONDE / ORBE : 11 pages + 13 états de panier ; Atelier Rive : 10 pages ; 0 visuel manquant |
| `scripts/reference-static-check.ts` × 6 (390 et 1 440 px : chaque page, 1 seul h1, aucun débordement, menu → boutique ou prestations, fiche → panier → retrait, recherche, formulaire, 0 ressource manquante, 0 erreur console) | OK × 6 |
| `scripts/lot2c-responsive-audit.ts` × 6 (360 / 390 / 768 / 1 440 px + 360 × 560 et 390 × 620) | 0 débordement, 0 élément hors cadre, 0 texte coupé, 0 image déformée, 0 élément recouvert, 0 cible < 24 px ; contrastes : 0 défaut mesurable, **5 titres blancs sur photo + voile (non mesurables)** |
| `tests/demos-quatre-themes.test.ts`, `catalogue-actif`, `categories-sections`, `carry-over`, `handoff-contrat`, `themes-catalogue`, `permissions-forfaits`, `accueil-audit`, `decouverte-visuels` | OK |
| CI GitHub | **OK** — exécution 39260276111 sur `d12013d0` (typecheck, tests sans kit privé, Theme Check 30 thèmes, build de production, image Docker construite et démarrée) : https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39260276111 ; l'exécution précédente `84251d65` (39250244250) avait échoué (accueil sans démonstration installée, images de connexion, fixtures sans kit) — corrigé dans `d12013d0` |

## 10. Décisions demandées et restant

1. **Visuels des démonstrations dans GitHub ?** Les images du kit (sans personne, IA) et les vignettes générées sont exclues du dépôt (`.gitignore`) : la page d'accueil et la galerie des thèmes les montrent seulement quand le dossier `public/demo/<id>/` est installé (ZIP → procédure dans `LISEZMOI`). Autoriser leur ajout au dépôt, ou garder la livraison par ZIP ?
2. **Films et tutoriels** montrant les anciennes démonstrations : remonter avec les quatre (chantier dédié) ou retirer de l'accueil ?
3. **Logos ORBE et Atelier Rive** : le kit n'en contient pas ; l'en-tête affiche le nom en toutes lettres (proposition de logo = chantier « logo », non fait ici).
4. **Édition dans le vrai studio sur les quatre thèmes** : les opérations du moteur sont testées ; le scénario complet par l'interface (`lot2c-studio-check`, `lot2c-persistence-check`) n'a été rejoué que sur FRAISE / ONDE lors des lots précédents — ORBE / Rive : **non vérifié** par l'interface dans ce lot.
5. **Export** : les thèmes Shopify des quatre démonstrations passent Theme Check ; les exports WordPress / PrestaShop (Codex) doivent signaler les réglages du §7.
