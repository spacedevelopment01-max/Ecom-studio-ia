# FRAISE GUMMIES et ONDE AUDIO — thèmes fidèles aux références Lumora / Pawish (issue #137)

## État courant (19 octobre, mission « finition et vérification complète », commentaires 6256994995 et 6257020151)

| | |
|---|---|
| **Commit réellement testé** | `e2a33888` — toutes les vérifications ci-dessous ont été exécutées sur ce commit (arbre de travail identique, aucune modification de code pendant la passe) |
| **Commit livré (tête de la branche)** | le commit suivant (hash dans la PR et dans `VERIFICATION.txt` du ZIP) — n'ajoute que ce rapport, les journaux publics `reports/lot2c/*.json` et `reports/lot2c/preuves.json` ; aucun fichier du thème, du studio ni des scripts n'est modifié entre les deux |
| **CI GitHub** | `e2a33888` : succès (typecheck, suite complète, Theme Check, build — https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39190049233) ; `9c79ba72` (premier lot de cette passe) : succès |
| **Aperçus livrés** | FRAISE https://claude.ai/artifact/76G1kbkrCrk47173e39MLM (version `1792398197-77ab`, republiée après réception de l'image 04 ; précédente `1792378270-869c`) · ONDE https://claude.ai/artifact/To1HtwE7JbUpaypAVtFUk2 (version `1792378319-6ff2`) — mêmes liens que les livraisons précédentes, contenu **remplacé**, commit affiché sur la page d'entrée ; fichiers retéléchargés depuis claude.ai et repassés dans les vérifications (navigation, mobile, audit) |
| **ZIP privé** | `FRAISE_ONDE_themes_Claude_issue137_<commit livré>.zip` (même état fonctionnel que les aperçus ; `VERIFICATION.txt` : SHA-256 identiques à GitHub) |
| **Branche** | `claude/fraise-onde-themes-reference`, PR #139 en brouillon ; aucune fusion, aucun déploiement, aucun appel IA payant, aucun envoi externe ; partie E (quatre thèmes) **suspendue, non relancée** ; chantier Codex PR #138 / PR #140 non touché |

### Synthèse : défaut → correction → vérification → limite restante

| Défaut | Correction (commit `e2a33888`) | Vérification exécutée | Limite restante |
|---|---|---|---|
| **Lien du pied de page → la nouvelle page reste en bas** (signalé par Thomas à 1 h 58) | Reproduit **uniquement dans une enveloppe** : servi directement, chaque page s'ouvre déjà en haut ; dans le visualiseur claude.ai, l'aperçu est un cadre de toute sa hauteur dans une page parente qui défile, et c'est la **page parente** qui reste en bas. Correction dans le script de l'aperçu statique (`scripts/lot2c-static-demo.js`) : à l'arrivée sur une page affichée dans un cadre, sans ancre et hors précédent / suivant, le haut du document est ramené en vue (`scrollIntoView`) ; rien n'est appelé au re-rendu d'une section, au panier ni à une ancre. Dans le **studio**, la position de défilement de l'aperçu n'est plus restaurée que si la **même page** est rendue à nouveau (réglage, version, panier) ; une autre page ou une ancre s'ouvre à sa place (`tab-boutique.tsx`, `preview-tools.ts`). | `scripts/lot2c-nav-proof.ts` sur les aperçus **retéléchargés** : téléphone et ordinateur, départ du bas de l'accueil, de la fiche et de la FAQ vers 4 pages chacune, en direct (position 0) et dans une enveloppe d'une autre origine (page parente revenue à ≤ 60 px) ; ancre `#MainContent` → cible, pas de remise en haut ; « précédent » → position restaurée ; +1 dans le panier → aucune variation. Vidéos `10-navigation/*.webm`. Studio : étape 0 de `lot2c-persistence-check.ts` (lien FAQ dans l'aperçu → `scrollY` 0, chemin `/pages/faq`). | Le comportement exact du visualiseur claude.ai sur l'appareil de Thomas n'est reproduit que par l'enveloppe de test (cadre haut d'une autre origine) : à confirmer par lui sur les liens régénérés. |
| **Réglages non utilisables depuis les panneaux** : vidéo / poster des stories, « Mes vidéos » absents ; panneau remonté à chaque version (blocs repliés, défilement perdu) ; panneau plus large que sa colonne ; phrase du pied de page sans effet en style « Colonnes » | Panneau : réglage `video` expliqué (vidéo de la plateforme), `video_asset` avec les fichiers vidéo du thème **et « Mes vidéos »** (`use_media`, extension conservée), posters par les fichiers image et « Mes images » ; le panneau reste monté d'une version à l'autre et relit ses données quand la version change ailleurs (discussion, historique) ; largeur de colonne respectée. Pied de page : la phrase s'affiche aussi en tête des colonnes (schéma et traduction mis à jour). | Scénario complet depuis l'interface (ci-dessous), FRAISE et ONDE. | Édition par une **IA fournisseur non testée** (aucune clé, aucun appel payant) : seules les commandes du moteur local sont exercées (« Masque la section… », « Reviens à la version précédente »). `image_asset` / `video_asset` restent des champs texte dans l'éditeur Shopify (contrat d'export). |
| **Persistance et restauration non prouvées de bout en bout** | — (comportement déjà en place) | `scripts/lot2c-persistence-check.ts` dans le **vrai studio** (Next.js + worker, base temporaire), par thème : lien du pied de page dans l'aperçu → ajout « Témoignage à la une » depuis le bouton Sections → panneau : citation, fichier image du thème, image de « Mes images », disposition « côte à côte » → Monter → Dupliquer → citation de la **copie seule** (original relu intact) → masquage de la copie → suppression (confirmation) → **Restaurer** la version précédente depuis « Versions » (copie revenue, toujours masquée, avec son texte ; nouvelle version créée) → pied de page (phrase) et en-tête (disposition) par le même panneau → story : fichier vidéo du thème, poster, puis vidéo de « Mes vidéos » ; lecteur ouvert sur cette vidéo → **rechargement complet** : ordre, réglages, références de médias, indépendance original / copie, pied de page conservés ; 17 versions dont 16 restaurables. 12 captures et journal par thème (`11-persistance-studio/`). | Scénario joué par Chromium, pas sur l'appareil de Thomas. |
| **Finition responsive** : accents de texte peu lisibles (vert ONDE sur blanc 2,1:1, rouge FRAISE sur crème 3,7:1 pour les surtitres et prix), blanc sur rouge des boutons FRAISE à 3,98:1, points de carrousel de 10 px, phrase du pied de page | Variables dérivées **par schéma** dans le thème (filtre `color_contrast`, natif Shopify) : `--c-accent-ink` pour l'accent employé en texte, rapproché du texte par petits pas jusqu'à 4,5:1 ; `--c-accent-fill` pour un fond d'accent sous le texte d'accent (boutons, pastilles, cases du comparatif), rapproché du noir ou du blanc jusqu'à 4,5:1. Un accent déjà lisible reste **strictement identique** (ONDE : boutons inchangés, texte sombre sur vert 9:1 ; FRAISE : bandes et fonds de schéma inchangés). Points de carrousel : zone tactile 24 px (point visible 10 px) ; points interactifs 40 px. | Test `accents lisibles` (rendu des deux thèmes : chaque schéma ≥ 4,5:1, inchangé si déjà lisible) ; audit automatique `scripts/lot2c-responsive-audit.ts` sur les aperçus livrés : 6 cadres (360 × 740, 390 × 844, 768 × 1024, 1440 × 900, 360 × 560, 390 × 620), toutes les pages — après correction : 0 débordement, 0 texte coupé, 0 image déformée, **0 texte sous le seuil de contraste** (avant : 444 relevés FRAISE, 360 ONDE, dont le vert ONDE et les blancs sur rouge FRAISE) ; parcours clavier de 40 arrêts avec indicateur de focus visible ; mouvement réduit respecté (`prefers-reduced-motion`). | Rouge des boutons FRAISE légèrement assombri sous texte blanc (E4473F → fond `--c-accent-fill`, 4,6:1) : écart assumé avec le rouge pur de Lumora, limité aux fonds portant du texte. Restent, volontairement : la barre d'achat fixe de la fiche recouvre les vignettes de la galerie tant qu'on n'a pas défilé (360 × 560), le défilement en « peek » de la galerie mobile (le visuel suivant dépasse à droite : disposition voulue). |
| **Rapport** : en-tête annonçant encore l'ancien commit testé `7649674a` | Cette synthèse d'état courant remplace l'en-tête ; l'historique des revues précédentes est conservé plus bas, daté, sans valeur d'état courant. | — | — |

### Vérifications réellement exécutées sur `e2a33888`

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx vitest run` | suite complète locale OK sur `9c79ba72` (premier lot de cette passe, 614 s) ; sur `e2a33888` (CSS, Liquid, scripts et test de contraste) : `lot2c-conversion`, `theme`, `theme-en`, `themes-catalogue`, `section-library-coverage` OK, suite complète par la CI (succès) |
| `bash scripts/verify-theme.sh --rapide` (Theme Check) | OK — « Thème : tout est valide » |
| `scripts/lot2c-proof.ts` 1440 / 768 / 390 / 360 px | OK — FRAISE 56 visites (14 pages × 4 largeurs), ONDE 48 ; 0 erreur JavaScript, 0 débordement horizontal, 0 image cassée, polices chargées ; édition par les opérations du moteur 8/8 (FRAISE) et 7/7 (ONDE) appliquées, 0 rejet ; 0 appel IA payant ; rejouée après réception de l'image 04 : 9/9 médias pour les deux thèmes, `missing: []` (`reports/lot2c/preuves.json`, arbre `b6a878a2` = code de `e2a33888`) |
| `scripts/lot2c-static-preview.ts` → aperçus republiés, retéléchargés, `lot2c-static-check.ts` (390 et 1440 px) | OK — 17 et 15 pages, 60 (FRAISE, avec l'image 04) et 57 fichiers par thème ; `static-check` (toutes les pages, menu, fiche, galerie, panier, stories, recherche, contact) vert sur le local **et** sur les copies retéléchargées (SHA-256 identiques au local, sauf la page d'entrée enveloppée par la plateforme) |
| `scripts/lot2c-mobile-proof.ts` (390 × 620, 360 × 560 : FAQ, tiroir du panier) sur les aperçus retéléchargés | OK — FAQ ouverte : question et réponse sombres sur fond clair, 17,3:1 (FRAISE) et 16,5:1 (ONDE) ; tiroir du panier : zone des articles 409 px à 390 × 620 et 349 px à 360 × 560, ligne complète visible à l'ouverture, +1, retrait, fermeture ; vidéos `9-preuves-mobile/*.webm` (exécuté sur les copies retéléchargées, `reports/lot2c/mobile-*.json`) |
| `scripts/lot2c-nav-proof.ts` (navigation, direct + enveloppe, ancre, précédent, panier) sur les aperçus retéléchargés | OK — par appareil (téléphone 390 × 700, ordinateur 1280 × 800) : 12 liens du pied de page en direct → position 0 puis « précédent » → position restaurée ; enveloppe : FAQ, contact et fiche → page parente revenue à 60 px (hauteur du bandeau de test) ; ancre `#MainContent` → page parente laissée à 3 000–4 300 px ; +1 dans le panier → position inchangée ; vidéos `10-navigation/*.webm` (exécuté sur les copies retéléchargées, `reports/lot2c/navigation-*.json`) |
| `scripts/lot2c-responsive-audit.ts` (6 cadres, toutes les pages) sur les aperçus retéléchargés | 16 et 14 pages × 6 cadres : **0** débordement de page, **0** élément hors cadre, **0** texte coupé, **0** image déformée, **0** texte sous le seuil de contraste, un seul h1 partout, 40 arrêts clavier avec focus visible ; restent 34 (FRAISE) et 32 (ONDE) liens texte de 20 à 22 px de haut (liens « Voir… » des cartes stories, titres de cartes produit : liens dans du texte, sous le seuil de 24 px de WCAG 2.5.8 qui exempte ce cas) et, à 360 × 560 seulement, les 9 vignettes de la galerie de la fiche sous la barre d'achat fixe avant tout défilement (`reports/lot2c/audit-*.json`, résumé dans le ZIP) |
| `scripts/lot2c-studio-check.ts` (bouton Sections, panneau, discussion locale, restauration, rechargement) | OK — FRAISE et ONDE : ajout depuis le bouton, point interactif ouvert, duplication, disposition, panneau (titre, disposition, bloc ajouté, titre de bloc), discussion locale « Masque… » puis « Reviens à la version précédente », rechargement (`reports/lot2c/studio-*.json`, 9 captures par thème) |
| `scripts/lot2c-persistence-check.ts` (scénario complet ci-dessus) | OK — ONDE dans la chaîne complète ; FRAISE rejoué seul juste après (la première exécution de la chaîne s'était interrompue sur une coupure de connexion du serveur de développement, `ECONNRESET`, pendant que d'autres contrôles Chromium tournaient en parallèle : incident d'environnement, pas du produit) ; 12 captures et journal par thème (`reports/lot2c/persistance-*.json`, 17 versions dont 16 restaurables) |
| CI GitHub | `e2a33888` : succès (run 39190049233) |

**Exécuté / simulé / non vérifié.** Exécuté : tout le tableau ci-dessus, dans Chromium, sur le commit testé et sur les fichiers réellement livrés. Simulé : téléphone, tablette et petites hauteurs imités par Chromium (tactile, mouvement réduit) ; visualiseur imité par une enveloppe d'une autre origine ; discussion sans IA connectée (moteur local). Non vérifié : appareil réel de Thomas ; IA fournisseur ; installation et édition native sur Shopify, WordPress / WooCommerce, PrestaShop (PrestaShop et les kits Wix / Squarespace ne satisfont pas l'objectif d'édition native universelle, voir le contrat d'export) ; image `04-detail-gummies` : **reçue le 19 octobre dans la conversation** (fichier WebP 1254 × 1254, même format que les huit autres ; gros plan sur trois gummies et deux fraises devant le flacon, flacon coupé en haut du cadre, aucun texte parasite, aucune personne), placée dans le kit à l'emplacement prévu et versée telle quelle au kit du ZIP ; elle devient le 4ᵉ visuel de la galerie de la fiche produit (« Gros plan sur les gummies à la fraise ») ; aucun code modifié, preuves FRAISE régénérées (`missing: []`), aperçu FRAISE republié (version `1792398197-77ab`) et retéléchargé ; le pack corrigé complet (18 images) n'a pas été reçu, seule cette image l'a été.

Inventaire des références et correspondance section par section : [`LOT_2C_FRAISE_ONDE_INVENTAIRE.md`](LOT_2C_FRAISE_ONDE_INVENTAIRE.md). Couverture de la bibliothèque : [`BIBLIOTHEQUE_SECTIONS_COUVERTURE.md`](BIBLIOTHEQUE_SECTIONS_COUVERTURE.md). Contrat d'édition et d'export : [`LOT_2C_CONTRAT_EDITION_EXPORT.md`](LOT_2C_CONTRAT_EDITION_EXPORT.md). Manifeste des ressources et licences : [`reports/lot2c/ressources-licences.json`](../../reports/lot2c/ressources-licences.json). Les captures, comparaisons et vidéos contenant les 18 images IA et les logos du kit sont privées (ZIP remis à Thomas).

---

# Historique des livraisons précédentes (conservé tel quel, sans valeur d'état courant)

> Les sections ci-dessous décrivent les revues du 18 octobre dans l'ordre inverse de leur date. Les commits qu'elles citent (`7649674a`, `26e71355`, `7e04880d`, `436cc174`, `d1b682cd`, `2f336202`, `ba1cf4bc`) sont **antérieurs** au commit testé actuel ; les constats de la première livraison (« Vérifications réellement exécutées » de `7649674a`) ne décrivent plus l'état livré.

## Ce qui a été construit

### Dans le moteur (réutilisable par tous les thèmes)

- **Profil « conversion »** (réglage global `conversion_profile` : aucun / pop / contrast) : feuille `conversion.css` et script `conversion.js`, attribut `data-conversion` sur `body`. « Pop » = fond crème, accent vif, boutons bordés noirs à ombre portée, titres capitales (Lumora) ; « contrast » = ouverture anthracite, accent vert, boutons arrondis dégradés (Pawish). Les titres en deux temps (gras + accent) utilisent un italique serif local : aucune police manuscrite n'est disponible hors ligne, écart assumé.
- **Sept sections éditables** : `cv-hero` (ouverture produit, note toujours marquée fictive sans application d'avis, coches, bouton, garantie), `cv-cards` (cartes visuel + texte), `cv-reviews` (carrousel d'avis avec note agrégée fictive, mention « Avis fictif » par carte, initiales au lieu de portraits, flèches, points, clavier), `cv-feature` (visuel + argumentaire, pastilles ou points iconés), `cv-guarantee` (bouclier, titre, texte, mention d'exemple, coches), `cv-article` (article éditorial : listicle ou récit, voir ci-dessous), `cv-stories` (voir ci-dessous). Toutes dans la bibliothèque FR/EN du studio, schémas traduits, choix de disposition exposés.
- **Stories vidéo en cartes** (`cv-stories`) : blocs réordonnables, format 9/16, 4/5 ou carré, largeur des cartes, poster (image ou fichier), vidéo de la bibliothèque, fichier du thème ou adresse directe, titre, sous-titre, lien produit, mention « Image IA — démonstration » par carte ; lecteur en boîte de dialogue (source chargée à l'ouverture seulement, lecture/pause, son, précédent/suivant, Échap, vidéo déchargée à la fermeture) ; **sans vidéo, la carte affiche son poster et « Vidéo à venir », sans bouton de lecture**.
- **Panier (tiroir et page)** piloté par des réglages globaux, désactivés par défaut : titre et compteur, bandeau sous le titre, bloc « commande réservée » **toujours marqué « Démonstration fictive »** (le studio ne réserve pas de stock), champ code de réduction (transmis à la plateforme au paiement, note explicite dans l'aperçu), ligne « Économies » (prix barrés et offres), « Total : N articles », libellé et cadenas du bouton, logos des moyens de paiement confirmés uniquement, bloc protection des expéditions (**interrupteur visuel jamais précoché, aucun montant ajouté**), invitation à se connecter si les comptes clients existent. Traductions FR/EN naturelles (erreurs, états vides, accessibilité).
- **Offres** : visuel facultatif par offre et prix de référence barré (prix barrés des variantes, sinon somme des prix) ; **badge de remise** sur le prix principal quand un prix barré existe ; **carte produit** qui montre le visuel de la variante par défaut (fond clair pour le catalogue et le panier).
- **Formulaires** : contact et newsletter indiquent, dans l'aperçu du studio seulement, que l'envoi n'est pas actif ; la validation HTML des champs reste réelle.
- **Article éditorial** (`cv-article`) : page « liste de raisons » ou « récit publi-rédactionnel » (bandeau d'étiquette, fil d'Ariane, titre en deux temps, chapeau, signature en initiales sans portrait, date, mention de démonstration séparée du texte ; blocs réordonnables : intertitre, paragraphe, visuel, point numéroté, liste cochée, citation, encadré, bouton, notes fictives à barres). Sert aux pages listicle et advertorial de FRAISE.
- **Panier** : réglage global `cart_color_scheme` (tiroir et page) pour un panier anthracite (ONDE) ou clair (FRAISE) ; profil contrast : bandeau de réservation et bouton sur l'accent, zone basse distincte, champ clair et bouton « Appliquer » sombre, comme la référence Pawish.
- **Logos** : vectorisation réelle des PNG du kit (`tests/lot2c-logo.ts`, tracé par couleur) en SVG couleur, monochrome, inverse pour fond sombre et favicon SVG + PNG ; aucun PNG encodé dans un SVG. Propositions non validées par Thomas : produites à la composition, jamais figées dans le dépôt. Les SVG portent désormais une taille intrinsèque (`width`/`height`) : sans elle, Chromium rendait l'image d'en-tête à 0 × 0 (constaté à la revue). Le pied de page « Colonnes » affiche le logo de section au-dessus des colonnes.

### Les deux démonstrations (`tests/lot2c-fixtures.ts`)

| | FRAISE GUMMIES | ONDE AUDIO |
|---|---|---|
| Référence | Lumora (profil pop) | Pawish (profil contrast) |
| Produit | Gummies à la fraise, 24,90 € (barré 34,90 €, « exemple de promotion ») | Casque ONDE Audio, 149,00 € (barré 189,00 €, « exemple de promotion ») |
| Achat | offres 1 flacon / 2 + 1 offert (3) / 3 + 2 offerts (5) : 24,90 / 49,80 / 74,70 €, totaux fixes calculés par le serveur, barre d'achat mobile | achat simple avec quantité, barre fixe mobile |
| Pages | accueil, fiche, boutique (1 produit, aucun catalogue inventé), **listicle et advertorial** (modèles Lumora, contenu original), à propos, contact, FAQ, livraison et retours (exemples identifiés), mentions légales, confidentialité, conditions (à compléter, rien d'inventé), 404, recherche, panier page et tiroir | idem, sans listicle ni advertorial (absents de Pawish) |
| Avis | 6 avis fictifs étiquetés, note agrégée fictive | idem |
| Images | 8 des 9 images du kit (`04-detail-gummies.webp` vide dans le ZIP → cadre « visuel à importer », non remplacé) | 9 images |
| Panier | schéma clair, tête noire, bandeau corail ; compteur, bandeau livraison (exemple), économies, total avec articles, « Paiement sécurisé » avec cadenas, protection des expéditions (visuelle), garantie en exemple | **schéma anthracite, bandeau vert** ; compteur, réservation marquée fictive, code de réduction (champ clair, bouton sombre), économies, total avec articles, « Paiement sécurisé » vert à texte sombre, invitation à se connecter (si comptes) |
| Contraste | texte blanc sur corail (boutons) : 3,9:1 ; texte noir ailleurs | texte **sombre** sur le vert vif (le blanc sur #4ECD01 était sous 2,2:1) ; identité verte conservée ; focus visible sur tous les boutons |

## Aperçu consultable (demande de Thomas, 18 octobre soir)

Aucun environnement hébergé du studio n'est accessible depuis cette session (pas d'adresse de déploiement, et déployer en production est exclu). L'aperçu distant est donc un **aperçu statique privé** produit par `scripts/lot2c-static-preview.ts` :

- toutes les pages de chaque thème sont rendues par les vraies routes d'aperçu du studio, puis figées en fichiers HTML relatifs avec leurs images, logos SVG, polices, scripts et le clip de test des stories ;
- le **panier de démonstration** rejoue des états rendus par le vrai serveur : chaque état atteignable depuis l'interface (ajout d'une offre ou d'une quantité, +1 / −1, retrait, jusqu'à 12 articles et 3 lignes) a été calculé et enregistré (`panier/*.json`, graphe `transitions.json`) ; le script `scripts/lot2c-static-demo.js` répond aux appels du thème (ajout, modification, `cart.js`, formulaire de la page panier, liens « Retirer ») avec ces réponses, sans réécrire la logique du thème ; au-delà, un message l'indique ;
- recherche (états avec et sans résultat pré-rendus), contact et newsletter (validation HTML réelle, aucun envoi) ; mention « Aperçu statique de démonstration · paiement désactivé » toujours visible ;
- vérification Chromium `scripts/lot2c-static-check.ts` (390 et 1440 px) : chaque page se charge sans erreur ni ressource manquante, un seul h1, aucun débordement ; menu → fiche → galerie ; ajout → tiroir → quantité → retrait → page panier ; stories ; recherche ; contact.

Publication : deux pages privées claude.ai (compte de Thomas), une par thème, avec page d'entrée listant les pages et les limites. Liens dans la PR #139. Mise à jour du 19 octobre (commit `d1b682cd`, versions d'artefact `1792367363-7625` FRAISE et `1792367374-00aa` ONDE ; précédente : commit `7e04880d`) : page « Bibliothèque de sections » (dix sections de démonstration), tiroir du panier et FAQ corrigés ; **l'aperçu livré a été vérifié tel quel** : les 59 + 58 fichiers publiés ont été retéléchargés depuis claude.ai, comparés au local (identiques, sauf la page d'entrée enveloppée par la plateforme) et repassés dans `lot2c-static-check.ts` (390 et 1440 px, tout vert). Ce n'est ni un déploiement ni un site de paiement : les exports CMS restent à faire avec Codex.

## Revue du 18 octobre, 22 h 14 (commentaires 6255031332, 6255612438, 6255637317, 6255813800) — panier, FAQ, bibliothèque exhaustive, édition manuelle

Partie E (quatre thèmes) **toujours suspendue, non relancée**. Commits du code : `436cc174` (corrections, bibliothèque, panneau, nouvelles sections), `d1b682cd` (étoiles du témoignage : commit des preuves régénérées) et `2f336202` (correction d'un test de catalogue, seule cause de l'échec CI de `436cc174`) ; documentation : commit suivant. CI complète (typecheck, 2 005 tests, Theme Check, build) : voir le badge de la PR.

### 1. Défauts bloquants : reproduits, corrigés, mesurés sur l'aperçu livré

| Défaut (capture de Thomas) | Reproduit tel quel | Cause | Correction | Après (mesuré sur l'aperçu statique régénéré, `scripts/lot2c-mobile-proof.ts`) |
|---|---|---|---|---|
| Tiroir panier FRAISE : bandeau livraison sur le haut de la ligne, quantités coupées par le pied, fenêtre minuscule pour les articles | Oui, à 390 × 620 px (hauteur utile d'un téléphone avec les barres de l'application) : zone des articles réduite à **44 px**, pied de **518 px** débordant de l'écran, ligne produit sous le pied | Le panneau empilait en-tête, bandeaux, zone des articles (seule à défiler) et un pied fixe énorme (protection, code, économies, total, taxes, bouton, réassurance) ; sur petite hauteur la zone des articles s'écrasait | **Un seul corps défilable** (`.es-drawer__scroll`) : bandeaux, articles, protection, code, économies, taxes, réassurance ; **pied fixe compact** : total + bouton + mention d'aperçu (hauteur réservée) ; en-tête et bandeaux compacts sous 720 px de haut ; position de défilement conservée au re-rendu ; pastille « Démo » masquée quand le tiroir est ouvert (la mention est dans le pied du tiroir) | 390 × 620 : zone des articles **409 px**, pied 143 px ; dès l'ouverture la ligne complète (image, titre, prix, quantités, « Retirer ») est visible sous le bandeau, rien sous le pied ; 360 × 560 : zone 349 px, même résultat ; ONDE identique ; protection, économies et réassurance atteintes par défilement ; +1 → total mis à jour ; retrait → panier vide ; fermeture. Vidéos `panier-sequence-390x620.webm` / `360x560.webm` par thème, captures `panier-1…4-*.png`, mesures `*-mobile.json` |
| FAQ FRAISE : accordéons ouverts fond clair, question et réponse blanches | Oui : ouvert = fond `rgba(20,20,20,.05)` (règle de la section pour le style « cartes »), texte blanc (règle du profil « pop ») | La règle `.es-faq--cards .es-faq__item[open]` posait un fond clair sans changer la couleur du texte ; le profil « pop » laissait le texte accent-text | État **ouvert** : fond `--c-bg` (ivoire), question **et** réponse en `--c-text` (sombre), bordure et icône accent ; état fermé : rouge / blanc avec question en **grand texte gras (19 px)** pour atteindre le seuil AA « grand texte » ; liens de réponse en accent soulignés ; focus visible dans les deux états ; transitions fond + texte synchrones ; mouvement réduit : aucune transition | Mesuré (couleurs calculées) : ouvert `rgb(251,247,242)` / `rgb(20,20,20)` → contraste **17,4:1** question et réponse ; fermé `rgb(228,71,63)` / blanc → 3,3:1 sur 19 px gras (seuil 3:1) ; captures 2 ouvertes + 2 fermées : `faq-faq-*.png` (page FAQ) et `faq-accueil-*.png` (« La recette », accueil) ; ONDE vérifié sans régression |

### 2. Bibliothèque exhaustive (demande explicite)

- **137 sections** dans `theme-base/sections/` : **123 ajoutables** et **14 composants structurels** (en-tête, bandeau d'annonce, pied de page, panier latéral, corps des gabarits produit / collection / collections / panier / page / recherche / blog / article / 404 / mot de passe), tous présents dans la bibliothèque FR et EN. Les structurels sont dans la catégorie **« Structure »** : visibles et retrouvables dans « Ajouter une section », avec contrainte explicite (unique, ni ajouté ni dupliqué) et un bouton **« Déjà présente · ouvrir ses réglages »** qui ouvre leur panneau (et la page concernée).
- Inventaire complet (section, nom, catégorie, famille d'origine, fichiers qui l'utilisent, variantes, réglages par type, blocs, bibliothèque, animation, visuel par fichier) : `docs/coordination/BIBLIOTHEQUE_SECTIONS_COUVERTURE.md`, généré par `scripts/sections-inventory.ts`.
- **Contrôle de couverture automatique** : `tests/section-library-coverage.test.ts` — un fichier de section sans entrée FR/EN, sans catégorie connue, sans préréglage (si ajoutable), ou absent de l'inventaire fait échouer la CI.
- Réutilisation sans duplication : les variantes sont des réglages (`layout`, `style`, `ratio`, `columns`, `columns_mobile`…) d'un même composant ; aucune section recyclée sous un autre nom.

### 3. Bilan exact des sections de la consigne de 22 h 41 (existant / enrichi / nouveau)

| Statut | Sections | Ce qui change visuellement |
|---|---|---|
| Existant, enrichi | `features-grid` (grille de bénéfices) | + Disposition grille / rangée / carrousel, + Colonnes sur téléphone 1–2, + animation |
| Existant, enrichi | `comparison-table` (comparatif) | + prix et lien par colonne, + animation ; colonne « exemple fictif » |
| Nouveau (22 h 41) | `cv-hotspots`, `cv-alternating`, `cv-steps`, `cv-gallery`, `cv-specs`, `cv-banner` | points interactifs ; image + texte alternés ; étapes cartes / frise ; galerie grille / carrousel / mosaïque + visionneuse ; fiche dépliable + contenu du colis ; bannière d'achat visuel gauche / droite / fond |
| **Nouveau (22 h 14)** | `cv-ingredients` — Composition du produit | une carte par composant (icône ou petit visuel, nom, rôle, note, étiquette « [À compléter] ») ; cartes / liste compacte / grand visuel + liste ; mention réglable |
| **Nouveau (22 h 14)** | `cv-quote` — Témoignage à la une | une seule citation mise en avant : initiales, prénom, précision, étoiles facultatives, étiquette « Avis fictif » ; carte centrée / visuel + citation / bande pleine largeur |

Les deux nouvelles sont sur la page de démonstration « Bibliothèque de sections » des deux thèmes (dispositions « grand visuel + liste » et « côte à côte »).

### 4. Édition manuelle ET par IA sur la même source (exécuté dans le vrai studio)

- Nouveau panneau **« Modifier les réglages »** (menu « … » de toute section, en-tête et pied de page compris ; `src/components/studio/section-settings.tsx`, API `GET /theme/section`) : chaque réglage du schéma avec le contrôle adapté (texte, zone de texte, HTML simple, liste, interrupteur, curseur, couleur, schéma de couleurs, fichier image du thème + « Mes images » du projet), blocs (ajouter, déplier, monter / descendre, supprimer, régler), masquer / afficher. Chaque validation = une opération `/theme/ops` = **une version restaurable**.
- Preuve `scripts/lot2c-studio-check.ts` (studio Next.js + worker lancés sur une base temporaire, Chromium piloté, FRAISE et ONDE) : ajout depuis le bouton Sections → point ouvert → duplication → **panneau** : titre, disposition « Titre, visuel, puis liste », bloc « Point » ajouté (3 → 4), titre d'un bloc modifié, chaque fois visible dans l'aperçu → **discussion sans IA connectée** (moteur local) : « Masque la section points interactifs » masque la section ; « Reviens à la version précédente » la rétablit **avec les réglages du panneau intacts** → **rechargement complet** : titre, disposition, bloc et image conservés, copie masquée toujours listée. Captures `studio-bouton-sections/<thème>-01…09.png`, journal `reports/lot2c/studio-<thème>.json`.
- Limite dite telle quelle : sans fournisseur d'IA connecté, la discussion n'exécute que les commandes du moteur local ; avec l'IA, les mêmes opérations sont produites par le modèle (même route, même validation).

### 5. Export réellement éditable

Contrat d'édition et manques par plateforme : `docs/coordination/LOT_2C_CONTRAT_EDITION_EXPORT.md` (types de réglages → contrôles de l'éditeur Shopify ; `image_asset` = champ texte dans Shopify, l'image native passe par `image` ; WordPress = bloc dynamique à attributs ; PrestaShop = fichiers du thème, pas d'éditeur visuel ; Wix / Squarespace = kit ; **aucune IA après export** ; installation réelle non vérifiée). PR #138 non touchée.

### Exécuté / simulé / non testé

- **Exécuté** : reproduction et mesure des deux défauts ; corrections ; preuves mobiles petite hauteur sur l'aperçu statique régénéré (vidéos) ; test complet du studio (bouton, panneau, discussion, restauration, rechargement) ; tests `vitest` (dont couverture de bibliothèque, traductions, rendu des 10 sections de démonstration, animations) ; Theme Check ; passe de preuves 4 largeurs ; aperçus republiés et retéléchargés.
- **Simulé** : le téléphone de Thomas est imité par Chromium à 390 × 620 et 360 × 560 (tactile) ; la discussion est testée sans IA connectée (moteur local).
- **Non testé** : installation sur une vraie boutique ; capture sur l'appareil réel de Thomas (à confirmer par lui sur les liens régénérés).

## Consigne du 18 octobre, 22 h 41 — corrections mobile, huit sections, animations

Partie E (personnalisation des quatre thèmes) **suspendue par Thomas : non commencée**. Commit du code testé : `7e04880d` (CI GitHub sur ce commit) ; ce rapport, `reports/lot2c/preuves.json` et les journaux `reports/lot2c/studio-*.json` sont ajoutés par le commit de documentation qui le suit sur la branche.

### Corrigé (défauts vus par Thomas, avant / après)

| Défaut | Cause trouvée | Correction | Avant → après |
|---|---|---|---|
| FAQ « La recette » : texte blanc sur fond blanc (390 px) | Les règles communes aux deux profils (`body[data-conversion]:not([data-conversion="none"])`) étaient **plus spécifiques** que les règles propres au profil « pop » : elles gagnaient sur la couleur du texte des questions ouvertes | Même spécificité pour toutes les règles de profil (`:is(body[data-conversion="pop"],body[data-conversion="contrast"])`), l'ordre décide ; règles de lisibilité de la FAQ « pop » | fond rouge, texte blanc, question et réponse lisibles (`faq-mobile.png`, planche `faq-ouverte-mobile.png`) |
| « Ce que l'on voit dans le flacon » : une seule colonne sur téléphone | La grille d'icônes n'avait pas de réglage téléphone | `features-grid` : **Disposition** (grille / une rangée / carrousel) et **Colonnes sur téléphone** (1 ou 2), indépendantes de l'ordinateur ; démonstration en 2 × 2 | grille 2 × 2 à 390 px (`accueil-mobile.png`), carrousel sur la page de démonstration |
| Galerie produit : bandes parasites autour des visuels | Cadre portrait imposé à des images carrées, fond différent de la zone | **Format de la galerie** sur la fiche (naturel / carré / portrait / paysage), image entière (`object-fit: contain`) sur fond de surface harmonisé ; démonstration en carré | cadres 304 × 304 sans bande (`produit-mobile.png`) |
| Bandeau d'aperçu qui couvre les boutons | Bandeau pleine largeur fixe | Pastille compacte et repliable (« Aperçu de démonstration · paiement désactivé »), placée **au-dessus** de la barre d'achat mobile et du tiroir, jamais sur un bouton d'action ; en studio, pastille basse déjà discrète | vérification Chromium `lot2c-static-check.ts` : aucun recouvrement d'un bouton d'achat |
| Image 04 manquante (« visuel à importer ») | Pack corrigé **toujours non reçu** dans la conversation | Rien à coder : dès réception du ZIP, relancer la démonstration et les preuves | emplacement explicite conservé (FRAISE uniquement) |

### Construit : huit types de sections dans Thème → Sections (`theme-base/sections/`)

| Section (nom FR dans la bibliothèque) | Fichier | Réglages principaux | Blocs |
|---|---|---|---|
| Grille de bénéfices avec icônes | `features-grid.liquid` (enrichie) | disposition grille / rangée / carrousel, colonnes téléphone 1–2, animation | icône + titre + texte |
| Image à points interactifs | `cv-hotspots.liquid` | visuel, format, disposition (liste sous le visuel ou à côté), liste lisible sans survol ni JavaScript, mention de démonstration | points (position %, titre, texte), max 8 |
| Image et texte alternés | `cv-alternating.liquid` | alternance / visuel à gauche / à droite, format des visuels | rangées (visuel, surtitre, titre, texte, bouton), max 6 |
| Utilisation en étapes | `cv-steps.liquid` | cartes ou frise, bouton final | 3 à 4 étapes (visuel, titre, texte) |
| Tableau comparatif personnalisable | `comparison-table.liquid` (enrichi) | colonnes, prix et lien par colonne, mention, animation | critères (coche / croix / texte) |
| Galerie en situation | `cv-gallery.liquid` | grille / carrousel / mosaïque, colonnes, format, mention sur chaque visuel, visionneuse plein écran (clavier, Échap) | visuels avec légende, max 12 |
| Fiche et contenu du colis | `cv-specs.liquid` | titre puis groupes / titre à gauche, mention | groupes dépliables « Libellé : valeur » (`[À compléter]` pour l'inconnu), contenu de la boîte |
| Bannière d'achat | `cv-banner.liquid` | visuel à gauche / à droite / en fond, prix et mention, bouton, note | — |

Toutes : nom et description **en français** dans la bibliothèque (`src/lib/theme/section-library.ts`), aperçu au survol, préréglage rempli avec les **visuels du projet** (`section-defaults.ts`), schéma traduit en anglais (`schema.en.json`, test `theme-en`), clés de locale FR/EN, choix de disposition déclarés (`layout-choices.ts`). Aucune caractéristique inventée : les textes de démonstration sont identifiés (« Détails de démonstration », « Image IA — démonstration », « Valeurs à confirmer avant publication », « exemple de promotion »).

### Animations (réglables et désactivables, par section)

- Chaque section ci-dessus (et les sections `cv-*` existantes : ouverture, cartes, avis, argumentaire, garantie, stories, article) a deux réglages : **Animation** (Aucune / Fondu / Montée en fondu / Léger zoom) et **Vitesse** (Lente / Normale / Rapide). « Aucune » retire toute apparition au défilement (test automatique : plus aucun attribut d'apparition dans les huit sections).
- Garde-fous, vérifiés par test et par la passe Chromium : les textes ne sont **jamais masqués en attendant une animation** — sans JavaScript tout est visible (les règles d'apparition ne s'appliquent que sous `.motion-ready`) ; au-delà de 3,2 s tout ce qui n'est pas apparu est révélé (`theme.js`) ; `prefers-reduced-motion` coupe les apparitions, le survol zoom et les pulsations (page à 390 px en mouvement réduit : 0 animation en cours).

### Testé réellement

- **Depuis le vrai bouton « Ajouter une section »** de l'onglet Boutique, studio Next.js lancé en développement sur une base temporaire, Chromium piloté (`scripts/lot2c-studio-check.ts`, FRAISE et ONDE) : recherche « Points interactifs » → aperçu de la section dans la boutique au survol (avec le visuel du projet) → clic = ajout → section listée et rendue dans l'aperçu → point interactif ouvert dans l'aperçu (vue Téléphone) → menu de la section : **Dupliquer** (2 sections rendues) → texte et image modifiés et copie **masquée** par les opérations du studio (`/theme/ops`, mêmes appels que les panneaux) → **rechargement complet** : titre modifié, image remplacée, copie non rendue mais toujours listée, original intact. Captures `studio/<thème>-01…07.png`, journal `studio/<thème>-studio.json`.
- Passe de preuves complète `lot2c-proof.ts` à **1440, 768, 390 et 360 px** sur toutes les pages (dont `pages/sections`) : un seul h1, aucun débordement, aucune image cassée, aucune erreur JavaScript, interactions (menu, stories, FAQ, comparatif, offres, barre d'achat, tiroir, remise, recherche), pass d'édition, mouvement réduit.
- Tests : `tsc`, `vitest` (suites thème dont `lot2c-conversion` étendue : huit types sur la page de démonstration, animation « Aucune » / « Lente » / « Fondu », garde-fous CSS/JS, grille 2 × 2, format de galerie), Theme Check (échantillon rapide puis CI complète).
- Aperçus statiques régénérés et revérifiés (`lot2c-static-check.ts`, 390 et 1440 px) : pages de démonstration `bibliotheque-de-sections.html` ajoutées sans toucher aux pages de référence.

### Simulé ou partiel (dit tel quel)

- L'entrée de menu « Choisir la disposition » n'apparaît, pour les sections de page, que dans les thèmes du nouveau moteur (v2) : comportement existant de l'onglet Boutique, non modifié. Pour ces thèmes, la disposition se change par les réglages de la section (opérations `set_setting`, testées) ou en discutant avec le studio.
- Le clic sur un point interactif dans l'aperçu « Ordinateur » du studio n'a pas pu être automatisé (l'aperçu est réduit par une transformation CSS, ce qui fausse les coordonnées du robot) ; il l'a été en vue « Téléphone » dans le studio, et à 1440 / 390 px hors studio par la passe de preuves. Ce n'est pas un défaut du thème.
- Les cadres gris vus sur une première capture pleine page de la page de démonstration ONDE étaient un **artefact de capture** (images chargées mais non peintes par Chromium dans une page de 12 000 px) : la passe de preuves décode désormais toutes les images avant la prise de vue ; vérifié section par section à l'écran.

### Restant

- Pack d'images corrigé : à joindre à la conversation (le ZIP de référence SHA-256 `07a1e028…` n'a jamais été reçu).
- Partie E (personnalisation des quatre thèmes) : suspendue, à relancer sur consigne.
- Hébergement du studio pour un aperçu distant **interactif** complet (le lien actuel est un aperçu statique privé).

### Pour Codex (contrat de données, PR #138 non touchée)

Aucun blocage rencontré. À signaler pour les exports : les huit sections ont des réglages `image_asset` (fichier du thème) **ou** `image` (image Shopify) ; les textes multi-lignes (« Libellé : valeur », contenu de la boîte) sont des `textarea` ; `animation` / `animation_speed` sont des `select` à valeurs fixes ; `features-grid` gagne `layout` et `columns_mobile`, `main-product` gagne `gallery_ratio`, `comparison-table` gagne `price`, `link_label`, `link` par colonne. Noms de schéma ≤ 25 caractères (Theme Check).

## Réponse point par point à la revue du 18 octobre

| Point | Correction | Fichiers | Preuve |
|---|---|---|---|
| 1. Logos invisibles | Cause : SVG sans `width`/`height` + règle `width:auto` du profil → image rendue 0 × 0. SVG avec taille intrinsèque, règle d'en-tête `width:var(--logo-width)`, logo du pied de page « Colonnes » au-dessus des colonnes (déclinaison inverse sur fond sombre) | `tests/lot2c-logo.ts`, `conversion.css`, `footer.liquid`, `theme.css` | passe de preuves : taille rendue ≥ 80 × 24 px **et** part de pixels dessinés > 4 % (`metrics.logos`), captures `logo-entete-*`, `logo-pied-*` |
| 2. Panier ONDE blanc | Réglage global `cart_color_scheme` (tiroir + page), bandeau de réservation et zone basse du profil contrast, champ clair et bouton sombre, texte sombre sur le vert | `settings_schema.json`, `cart-drawer.liquid`, `main-cart.liquid`, `conversion.css`, fixtures | comparaisons **tiroir à tiroir** (référence recadrée sans chrome téléphone) `comparaison-tiroir-rempli-390`, `comparaison-tiroir-vide-390` ; `tiroir-*-panneau-mobile` |
| 3. Bouton « Appliquer » rogné | Grille `minmax(0,1fr) auto`, champ `min-width:0`, bouton sans retour à la ligne | `conversion.css` | passe de preuves : `scrollWidth ≤ clientWidth` et bord droit dans la zone pour le bouton **et** le champ, tiroir et page panier (`interactions.discountDrawer`, `discountPage`) |
| 4. Listicle et advertorial | Section `cv-article` et deux pages FRAISE (contenu original, visuels produit sans personne, liens : menu, pied de page « À lire », fil d'Ariane, boutons vers la fiche, lien croisé) | `cv-article.liquid`, `conversion.css`, bibliothèque, fixtures | captures `listicle-*`, `advertorial-*`, comparaisons `comparaison-listicle-390`, `comparaison-advertorial-390` |
| 5. Contenus | Comparatif rempli (colonne « exemple fictif », aucune marque) ; chiffres d'exemple produit (60 douceurs, 3 formats, 30 jours…) ; FAQ, bandeau défilant, parcours et descriptions sans « calculé par le serveur », « identifiés comme démonstration », « étiquetés fictifs » ; mentions de démonstration conservées dans les notes de section et les étiquettes ; pastille d'aperçu en français (navigateur de preuve en `fr-FR`) | fixtures, `scripts/lot2c-proof.ts` | captures `comparatif-*`, accueil, vidéos |
| 6. 18 images | **Pack corrigé non reçu** dans cette conversation (seul le ZIP d'origine, image 04 vide, est présent). Rien n'est prétendu : l'emplacement « visuel à importer » reste explicite. Dès réception du ZIP (SHA-256 `07a1e028…`), relancer `lot2c-demo-local.ts` et la passe de preuves : aucune modification de code nécessaire | — | `preuves.json` : `missing: ["04-detail-gummies"]` |
| 8. Finitions vérifiées sur les pages complètes (revue du soir) | Planches contact des premiers écrans et détails (390 et 1440 px) relues : logos entiers avec le sous-texte « AUDIO », boutons, comparatifs remplis, stories, paniers ; un défaut corrigé : titre de carte produit coupé dans le mot sur la boutique mobile (titre puis prix l'un sous l'autre, césure interdite) | `conversion.css` | captures `boutique-mobile`, planches privées |
| 7. Lisibilité, livraison, édition | Texte sombre sur vert, focus visibles ; pack source reproductible (archive git du commit testé + kit + instructions) ; **édition réelle** par les opérations du moteur (texte, image, visibilité, duplication, réordonnancement, bloc story avec adresse vidéo, en-tête, pied de page), nouvelle version enregistrée, page rechargée, version d'origine inchangée | fixtures, `conversion.css`, `scripts/lot2c-proof.ts` | captures `edition-avant-*`, `edition-apres-*`, `edition-stories-*` ; `preuves.json` : `editing` — FRAISE 8 opérations appliquées, ONDE 7 (la 8e, même image d'ouverture, est sans effet), 0 rejet |

## Vérifications de la première livraison (commit `7649674a`, 18 octobre — historique)

Commit `7649674a` :

| Contrôle | État | Détail |
|---|---|---|
| `npx tsc --noEmit` | OK | |
| `npx vitest run` — thème, catalogue, EN, lot 2A, lot 2B, audit Boutique, lot 2C, cms-v2 | OK — 134 tests, 14 fichiers (`theme`, `theme-v2`, `theme-custom`, `banque-du-theme`, `themes-catalogue`, `theme-en`, `audit-onglet-boutique`, `lot2a-php-export`, `lot2a-purchase`, `lot2a-reference`, `lot2b-editorial`, `lot2b-featured`, `lot2c-conversion`, `cms-v2`) | |
| `scripts/verify-theme.sh --rapide` | OK | |
| `scripts/verify-theme.sh` complet (`JOBS=2`) | OK — « Thème : tout est valide », 137 contrôles, 0 erreur, 0 avertissement (compositions FR/EN et ZIP client) | |
| `scripts/lot2c-proof.ts` (390 et 1440 px, vidéos, comparaisons, logos, champ de réduction, édition) | OK — FRAISE 26 visites (13 pages × 2 largeurs), ONDE 22 ; 0 erreur JavaScript, 0 débordement, 0 image cassée ; logos rendus 150 × 48 / 170 × 46 px avec 37 à 47 % de pixels dessinés ; champ et bouton de réduction entiers (tiroir et page, 1440 et 390 px) ; 6 comparaisons FRAISE et 4 ONDE ; 12 et 16 interactions ; édition : 8 opérations soumises, 8 appliquées (FRAISE) et 7 (ONDE, une opération sans effet), 0 rejet ; 2 vidéos par thème ; 0 appel IA payant ; seul média manquant : `04-detail-gummies` (vide dans le kit) |
| `scripts/lot2c-demo-local.ts` sur une base temporaire | OK — 2 projets créés sur `DATA_DIR` temporaire, 8/9 et 9/9 images, logos vectorisés, pages listicle et advertorial listées | |
| CI GitHub sur le commit testé | OK (succès) — https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39153487962 |
| Suite complète `npm test` en local | non exécutée | prise en charge par la CI |
| Import dans Shopify, WordPress/WooCommerce, PrestaShop et test du panier natif | **non exécuté** | critère de réception à réaliser avec Codex (voir « Raccordements ») |
| Vues ordinateur et interactions des démonstrations de référence | **non observées** | kit limité aux captures mobiles |

### Interactions testées dans Chromium

Exécutées à 1440 px puis à 390 px sur chaque thème (`preuves.json`, champ `interactions`) :

- **Accueil** : menu ouvert et fermé au clavier (mobile), cartes stories sans vidéo sans bouton de lecture, 6 mentions « Avis fictif », flèche droite → deuxième avis, question de FAQ ouverte (FRAISE ; ONDE n'a pas de FAQ en accueil).
- **Stories** : lecteur ouvert sur le clip de test (mire générée par ffmpeg, VP9), pause et reprise, son activé, Échap ferme la boîte de dialogue et décharge la vidéo ; les deux autres cartes restent « Vidéo à venir ».
- **FRAISE, offres** : 1 / 2+1 / 3+2 → 24,90 / 49,80 / 74,70 €, prix de référence barré 104,70 € ; ajout du 2+1 → panier 49,80 €, 3 articles, économies affichées.
- **ONDE, achat** : quantité 2 → ajout → tiroir ouvert « Total : 2 articles », 298,00 €, économies, bloc réservation marqué « Démonstration fictive », code DEMO10 → note « aucun code actif », total inchangé.
- **Panier** : tiroir ouvert, protection jamais précochée (FRAISE : interrupteur → note « aucun montant ajouté »), quantité modifiée (ONDE : 2 → 1 = 149,00 €), ligne retirée → panier vide, tiroir vide capturé ; page panier remplie et vide capturées.
- **Mobile** : barre d'achat fixe visible après défilement, menu plein écran.
- **Vidéos** : parcours ordinateur et mobile enregistrés (accueil → fiche → ajout → panier → retrait), 19 à 24 s chacune.
- **Logos** : taille rendue et part de pixels dessinés mesurées en en-tête et pied de page, captures des deux logos.
- **Code de réduction** (ONDE) : bouton « Appliquer » et champ mesurés (texte entier, dans la zone) dans le tiroir et sur la page panier.
- **Édition** : 8 opérations du moteur soumises, 8 appliquées pour FRAISE et 7 pour ONDE (0 rejet), nouvelle version enregistrée, page rechargée, contrôles DOM (titre, image, section masquée, garantie dupliquée, ordre stories/avis, story ajoutée avec source, annonce, pied de page), version d'origine revisitée inchangée.
- **Mesures** : 26 (FRAISE) et 22 (ONDE) visites sans erreur JavaScript, sans débordement horizontal, sans image cassée, polices chargées ; aucun appel IA payant (`paidCalls: 0`).

## Écarts assumés et limites

- Compte à rebours des bandeaux d'annonce retiré (consigne) ; bloc « commande réservée » du panier présent mais marqué fictif.
- Abonnement « Subscribe & Save » de Lumora non reproduit : le moteur n'a pas de plans d'abonnement, aucune fausse option.
- « Selling fast ! 44 people… », « #1 Bestseller », « Trusted by 13K+ », « Verified customer », logos de paiement : remplacés par des mentions de démonstration ou omis.
- Colonne de droite des tableaux comparatifs remplie en **exemple fictif** clairement signalé : rien n'est affirmé sur une marque réelle.
- Chiffres des sections « preuve » = faits de la démonstration (nombre de visuels, d'offres, d'avis fictifs), pas des résultats clients.
- Accent manuscrit remplacé par Instrument Serif italique (fichier local du studio) ; typographies « proches », pas identiques. La disponibilité d'Instrument Serif dans la bibliothèque de polices Shopify est à confirmer à l'export, sinon basculer sur Cormorant italique.
- Listicle et advertorial reproduits pour FRAISE seulement (Pawish n'en a pas) ; portraits de la référence remplacés par le produit en situation.
- Compositions ordinateur : propositions cohérentes, non vérifiées contre les références (captures mobiles uniquement).
- Image `04-detail-gummies.webp` vide dans le kit reçu ; le pack corrigé annoncé (SHA-256 `07a1e028…`) n'a pas été reçu dans cette conversation : emplacement « visuel à importer » explicite, à remplacer dès réception.
- Les logos restent des propositions ; le packaging photographié FRAISE garde sa typographie d'origine.
- Contraste : ONDE utilise un texte sombre sur le vert (écart assumé avec le blanc sur vert de Pawish, illisible). Depuis le 19 octobre, les accents employés en texte et les fonds d'accent sous texte d'accent sont dérivés par schéma à 4,5:1 au moins (`--c-accent-ink`, `--c-accent-fill`) : le rouge des boutons FRAISE est légèrement assombri sous le texte blanc.
- Le ZIP privé contient le code source du commit testé, le kit et les preuves : ce n'est pas un thème installable dans un CMS ; les exports et leurs tests d'installation restent à faire avec Codex.

## Raccordements à prévoir avec Codex (exports et catalogues)

Aucun fichier de `src/lib/cms-v2/**`, `src/lib/theme/catalog-export.ts` ni `assets/cms/**` n'a été modifié. Pour que les sections et réglages soient réellement éditables après import, les adaptateurs devront connaître :

1. les réglages globaux `conversion_profile` et `cart_*` (schéma `settings_schema.json`, groupe « Panier ») ;
2. les sept types de sections `cv-hero`, `cv-cards`, `cv-reviews`, `cv-feature`, `cv-guarantee`, `cv-article`, `cv-stories` (Liquid avec schémas : natifs sur Shopify OS2 ; à mapper vers des blocs/patterns WordPress et des modules PrestaShop) ;
3. le réglage `video_url` et le fichier vidéo des stories, le réglage `image_asset` des offres par quantité ;
4. le panier : les règles d'offres restent côté serveur (`purchase_rules_require_server`) ; le code de réduction du tiroir vise `/discount/<code>` (Shopify) et doit être relié au mécanisme natif de chaque CMS.

### Liste de raccordement (pour les exports de Codex, après la PR #138)

| Élément | Identifiants | Remarque |
|---|---|---|
| Sections | `cv-hero`, `cv-cards`, `cv-reviews`, `cv-feature`, `cv-guarantee`, `cv-article`, `cv-stories` | Liquid + schéma ; blocs : `check`/`pill`/`point`, `card`, `review`, `check`, `heading`/`paragraph`/`image`/`point`/`checklist`/`quote`/`box`/`cta`/`rating`, `story` |
| Stories | section : `ratio`, `size`, `ai_label` ; bloc `story` : `poster`, `poster_asset`, `ai_poster`, `video`, `video_asset`, `video_url`, `title`, `subtitle`, `link`, `link_label` | fichier vidéo du thème (`video_asset`) ou adresse directe (`video_url`) ; lecteur en `<dialog>` dans `conversion.js` |
| Panier (réglages globaux) | `cart_type`, `cart_color_scheme`, `cart_heading`, `cart_show_count`, `cart_promo_text`, `cart_reservation`, `cart_reservation_minutes`, `cart_discount_code`, `cart_show_savings`, `cart_total_count`, `cart_checkout_label`, `cart_checkout_lock`, `cart_show_payment_icons`, `cart_protection`, `cart_protection_title`, `cart_protection_text`, `cart_show_login`, `cart_empty_title`, `cart_reassurance`, `cart_show_note` | tiroir `cart-drawer.liquid` et page `main-cart.liquid` ; code de réduction → `/discount/<code>` (Shopify), à relier au mécanisme natif ailleurs |
| Offres | blocs `quantity_offer` (+ `image_asset`), règles côté serveur (`purchase_rules_require_server`) | WooCommerce / PrestaShop : règles de prix natives à configurer |
| Profil | `conversion_profile` (none / pop / contrast), `conversion.css`, `conversion.js` | chargés par `theme.liquid` |

Le test d'import par plateforme (modifier un texte et une image, réordonner et dupliquer une section, modifier en-tête et pied de page, ajouter une source vidéo, enregistrer, recharger, panier natif) n'a pas été exécuté dans cette livraison.
