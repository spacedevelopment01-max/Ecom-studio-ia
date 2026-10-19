# Contrat d'édition des sections — studio et export (lot 2C, 18 octobre)

Objet : ce que chaque section expose pour être modifiée **manuellement** (panneau « Modifier les réglages »), **par l'IA** (discussion), et **après installation** sur la plateforme cible. Préparé par Claude pour la coordination avec Codex (PR #138 non modifiée) ; les manques sont écrits, rien n'est présenté comme universel.

## 1. Une seule source de données

- Une section est une entrée `{ type, settings, blocks, block_order, disabled }` d'un gabarit JSON (`spec.templates[...]`) ou d'un groupe (`spec.groups.header / footer`). Son **schéma** (`{% schema %}` du fichier `theme-base/sections/<type>.liquid`) déclare chaque réglage avec un identifiant stable, un type, un libellé (traduit en anglais par `theme-base/i18n/schema.en.json`), ses options et sa valeur par défaut.
- Toute modification — panneau manuel, discussion, IA, bibliothèque, glisser-déposer — passe par les **opérations** de `src/lib/theme/ops.ts` (`set_setting`, `use_media`, `add_block`, `remove_block`, `move_block`, `add_section`, `duplicate_section`, `move_section`, `toggle_section`, `remove_section`, `replace_section`, `section_colors`, `set_scheme_color`, `set_global`, `lock`) validées par `validateSpec`, puis par `saveThemeVersion` : **chaque changement crée une version restaurable** (bouton Historique / `theme/restore`). Il n'existe pas de second chemin d'écriture.
- Le panneau manuel (`src/components/studio/section-settings.tsx`) lit `GET /api/projects/:id/theme/section?template=&section=` (schéma traduit, réglages, blocs, schémas de couleurs, fichiers image **et vidéo** du thème) et écrit par `POST /api/projects/:id/theme/ops` — exactement la route de la discussion. Il reste monté d'une version à l'autre (blocs dépliés, défilement et champ en cours conservés) et relit ses données quand la version change ailleurs (discussion, historique).

## 2. Réglages structurés attendus par section (ce que le panneau et l'IA savent modifier)

| Besoin | Type de réglage dans le schéma | Panneau manuel | IA / discussion | Export Shopify (éditeur de thème) |
|---|---|---|---|---|
| Textes (surtitre, titre, fin de titre en accent, texte, légende, mention) | `text`, `textarea`, `richtext` | champ ou zone de texte, Entrée / perte du focus = appliqué | `set_setting` | champ natif du même type |
| Visuels | `image` (`image_picker`) **et** `image_asset` (fichier fourni avec le thème) + `image_alt`, `media_role`, `focus_x/y` | sélecteur des fichiers du thème + « Mes images » (opération `use_media`) ; `image_picker` indiqué comme réglé dans la plateforme | `use_media`, `set_setting` | `image_picker` natif ; **`image_asset` reste un champ texte** (nom de fichier dans `assets/`) — manque n° 1 ci-dessous |
| Vidéos et affiches | `video` (bibliothèque de la plateforme) **et** `video_asset` (fichier fourni avec le thème) ; `video_url` (adresse) ; `poster` / `poster_asset` (affiche) | sélecteur des fichiers vidéo du thème + « Mes vidéos » (opération `use_media` sur `video_asset`) ; poster : sélecteur des fichiers image + « Mes images » ; `video` indiqué comme réglé dans la plateforme | `use_media`, `set_setting` | `video` natif ; **`video_asset` et `poster_asset` restent des champs texte** (fichiers de `assets/`), même manque que `image_asset` |
| Icônes | `select` (liste fermée d'icônes du thème) | liste | `set_setting` | liste native |
| Liens et boutons | `text` (libellé) + `url` | champs | `set_setting` | `url` natif |
| Couleurs | `color_scheme` (schémas du thème) ; `color` ponctuel | liste des schémas ; sélecteur de couleur | `section_colors`, `set_scheme_color` | natifs |
| Typographies | réglages généraux `type_*` (`settings_schema.json`, `font_picker`) | hors section : réglages généraux | `set_global` | `font_picker` natif |
| Fonds, espacements, alignements | `color_scheme`, `range` (`padding_top/bottom`), `select` (`heading_align`, `align`) | curseurs et listes | `set_setting` | natifs |
| Formats et dispositions mobile / ordinateur | `select` (`layout`, `ratio`, `style`), `range` (`columns`), `select` (`columns_mobile`) | listes et curseurs | `set_setting` (et « Choisir la disposition » pour les thèmes v2) | natifs |
| Blocs et leur ordre | `blocks` du schéma (`max_blocks`, `limit`) | ajouter, déplier, monter / descendre, supprimer | `add_block`, `move_block`, `remove_block` | blocs natifs (ajout, ordre, suppression dans l'éditeur) |
| Animations | `select` `animation` (aucune / fondu / montée / zoom) + `animation_speed` | listes | `set_setting` | natifs ; CSS/JS du thème (`cv-reveal`, `theme.js`), mouvement réduit respecté |
| Visibilité | `disabled` de l'instance | icône œil | `toggle_section` | « Masquer la section » natif |

Règle : **aucun contenu essentiel n'est figé dans une image ou dans le code** ; un texte visible est toujours un réglage (`text`, `richtext`) ou un bloc. Les sections `cv-*` respectent cette règle (contrôlé par rendu dans `tests/lot2c-conversion.test.ts`).

## 3. Couverture par plateforme et manques (à traiter par Codex dans les exports, après la PR #138)

Référence : registre des capacités réelles `src/lib/cms-v2/capabilities.ts` (statuts et niveaux de preuve, jamais une simulation présentée comme réelle).

| Plateforme | Ce qui est éditable nativement après installation | Manques connus (à écrire tels quels à l'utilisateur) |
|---|---|---|
| **Shopify** (thème OS 2.0) | Tous les réglages et blocs des schémas dans l'éditeur de thème ; gabarits JSON ; identifiants de sections stables. Theme Check valide la syntaxe, **pas une installation** (jamais installé sur une vraie boutique : `installation = UNVERIFIED`). | (1) `image_asset` : fichier du thème, donc **champ texte** dans l'éditeur ; pour un vrai sélecteur, le marchand utilise le réglage `image` (image_picker) présent à côté — ou l'export convertit les fichiers du thème en images de la boutique (à faire côté export, non fait). (2) Les mentions de démonstration (« Avis fictif », « [À compléter] ») sont des réglages à vider par le marchand. (3) Aucune IA après export : l'édition par l'IA existe dans le studio seulement ; une intégration dans l'éditeur Shopify serait un développement distinct, non inclus. |
| **WordPress / WooCommerce** (thème de blocs) | Chaque section = bloc dynamique dont les attributs reprennent les réglages du schéma ; rendu par les mêmes gabarits Liquid (moteur PHP) ; `native_editing = SUPPORTED (installed_local)`. | Types à adapter dans l'adaptateur : `image_asset` (fichier → média WordPress), `richtext` (HTML), `video_url`, `color_scheme` (correspondance avec les palettes du thème), `animation`/`animation_speed` (déjà de simples `select`). Le panier et la fiche produit sont les blocs natifs WooCommerce (pas le tiroir du thème). |
| **PrestaShop** | Produits, prix, stocks, commandes dans l'administration ; `native_editing = PARTIAL` : textes et mise en page des sections **dans les fichiers du thème** ou par une nouvelle exportation (pas d'éditeur visuel). | L'édition section par section après installation n'est pas « native » : à dire clairement ; l'édition se fait dans le studio puis réexport. |
| **Wix, Squarespace** | Kit de reconstruction (`delivery = kit`) : le site se refait dans l'éditeur de la plateforme. | Pas de thème installable ni de réglages transférés : les sections et réglages servent de guide, pas d'export natif. |

## 3 bis. Thèmes de référence FRAISE / ONDE / ORBE / Atelier Rive (mission E, 19 octobre) — réglages à signaler dans les exports

Les quatre thèmes de référence sont des thèmes du studio comme les 30 autres (même source de données, mêmes schémas). Leurs réglages particuliers sont exportés nativement dans le thème Shopify (schémas de sections, `settings_schema.json` : `style_preset` fraise / onde / orbe / rive). Pour les autres plateformes, l'adaptateur Codex doit **écrire tel quel à l'utilisateur** ce qu'il ne rend pas, jamais l'ignorer en silence :

| Réglage | Où | Effet | À signaler si non rendu |
|---|---|---|---|
| `conversion_profile` (`pop`, `contrast`) | thème (FRAISE, ONDE) | profil graphique des sections `cv-*`, panier, boutons | oui — le site perd son style de référence |
| `editorial_profile` (`object`, `journal`) | thème (ORBE, Rive) | profil des sections `ed-*` | oui |
| `look_*` (en-tête flottant / barre, tiroir, bouton plein, halo) | thème | en-tête, menus, boutons | oui |
| `heading_tag` | `cv-hero`, `cv-banner`, `ed-opening` | niveau du titre d'ouverture (h1 une fois par page) | oui (référencement) |
| `columns_mobile` | `features-grid` | deux colonnes sur téléphone quand il y a quatre bénéfices | non bloquant, à dire |
| `gallery_ratio`, `gallery_layout`, `sticky_bar` | `main-product` | cadres carrés, carrousel, barre d'achat fixe | oui pour la barre d'achat |
| `animation`, `animation_speed` | sections `cv-*` | mouvement réglable et désactivable | non bloquant, à dire |
| Blocs `cv-*` / `ed-*` | sections de référence | sections propres aux profils | oui : sans adaptateur, la section n'existe pas sur la plateforme |

**Catalogue actif = exactement ces quatre thèmes** (commentaire 6264783184) : tout identifiant d'ancien thème dans un contrat de recommandation est ignoré avec avertissement ; les anciens thèmes ne sont lus que pour les projets qui les utilisent déjà. Catégorie du projet (`storeKind` : `services` / `catalog` / `specialty`) et thèmes éligibles : contrat dans [`LOT_2E_QUATRE_THEMES_RESULTATS.md`](LOT_2E_QUATRE_THEMES_RESULTATS.md), §2. Rien de ceci ne modifie `src/lib/cms-v2/**` ni `catalog-export.ts` : c'est une liste de besoins pour Codex.

## 4. Identifiants et stabilité

- Identifiants de réglages en `snake_case`, stables depuis leur création ; les ajouts du 18 octobre (`layout`, `columns_mobile` sur `features-grid` ; `gallery_ratio` sur `main-product` ; `price`, `link_label`, `link` sur les colonnes de `comparison-table` ; `animation`, `animation_speed` sur les sections `cv-*`) ont des valeurs par défaut : un thème existant se rend sans changement.
- Noms de schéma ≤ 25 caractères (Theme Check) ; libellés, infos, options et textes par défaut traduits (`tests/theme-en.test.ts`).
- Les sections structurelles (`header`, `footer`, `announcement-bar`, `cart-drawer`, `main-*`) ne s'ajoutent ni ne se dupliquent ; leurs réglages se modifient par le même panneau (catégorie « Structure » de la bibliothèque) ; le panier partage ses réglages généraux (`cart_*`).

## 5. Ce qui est vérifié et ce qui ne l'est pas

- Vérifié : rendu de chaque section (tests), bibliothèque complète (`tests/section-library-coverage.test.ts`), panneau manuel et discussion sur la même donnée dans le studio réel (`scripts/lot2c-studio-check.ts`), scénario complet de persistance et de restauration depuis l'interface (`scripts/lot2c-persistence-check.ts` : ajout, textes, image du thème et de « Mes images », disposition, déplacement, duplication indépendante, masquage, suppression, restauration, pied de page, en-tête, story avec fichier vidéo et poster, rechargement), Theme Check sur le thème exporté.
- Non vérifié : installation et édition sur une vraie boutique Shopify, un vrai WordPress distant ou PrestaShop (niveaux de preuve dans le registre) ; c'est le chantier de Codex pour les exports.
