# Publicités au niveau des références (Ads V2, version 6b)

But : que le studio produise, à partir des éléments du client (photo, lien, description, logo, identité), des
publicités pour les réseaux sociaux comparables aux 10 références fournies (Nomade, Brume, Aura, Azur Piscines,
Nuance, Lumen, Onde, Net & Clair, Minuit 13, Atelier Carrosserie).

## Ce que les références ont en commun (et ce qui manquait)

| Référence | Ce qui fait la qualité | Avant (6a) |
|---|---|---|
| Photo | vraie photographie publicitaire, produit mis en scène, lumière travaillée | décor « sans le produit » + détourage collé avec une ombre ovale |
| Titre | 2 à 6 mots, très grand, graisse franche, interligne serré | accroche de 8 à 12 mots, serif fin (graisse 500), qui rétrécissait jusqu'à 4 % de la largeur |
| Ligne secondaire | « Café en grains • Torréfaction artisanale » | absente (le texte « headline » n'était jamais affiché) |
| Logo | visible sur tous les formats | retiré en 9:16, petit en bas à droite ailleurs |
| Bouton | pilule ou rectangle net, flèche | pilule seule, sans variation |
| Mise en page | une composition propre à chaque marque | 5 gabarits choisis selon l'angle, identiques d'un projet à l'autre |
| Formats | recomposés (story ≠ carré ≠ paysage) | même gabarit étiré ; changement de format dans l'éditeur = mise à l'échelle |

## Ce qui a été fait

1. **Direction artistique par projet** (`src/lib/ads-v2/art.ts`) : style (premium, franc, artisan, chaleureux) déduit
   de la marque (personnalité, positionnement, typographies). Le style fixe une rotation de compositions propre au
   projet. Les créations d'une même campagne utilisent toutes une composition différente, et deux projets ne commencent
   pas par la même composition.
2. **Six compositions refaites pour chaque format** (`src/lib/ads-v2/compose.ts`) :
   - *editorial* (Nomade, Aura, Nuance) : photo plein cadre, voile dégradé teinté de la couleur sombre de la marque, logo, titre, ligne, bouton ;
   - *poster* (Brume, Onde, Minuit 13) : titre centré en haut, ligne espacée, bouton en bas sur les formats hauts ;
   - *panel* (Azur Piscines) : panneau de marque (logo, filet d'accent, titre, ligne, bouton) + photo ;
   - *band* (Net & Clair) : grand aplat arrondi de couleur franche, titre très gras ;
   - *frame* (Atelier Carrosserie) : photo sombre, surtitre et filet d'accent, titre, ligne en capitales espacées ;
   - *typographic* : sans photo (jamais une image inventée).

   Pour chaque format (1:1, 4:5, 9:16, 1,91:1, 16:9), le moteur recalcule la colonne de texte, les tailles, les
   marges, la place du produit et celle du bouton. Le titre est limité à 3 lignes (4 en story), avec des lignes
   équilibrées. Le logo figure sur tous les formats ; sa version claire est utilisée sur les photos sombres.
3. **Lisibilité garantie par la mesure** : chaque texte est mesuré sur ce qui est réellement dessiné sous lui.
   - Le voile se renforce au besoin (3 fois au plus).
   - Un aplat de teinte moyenne est éclairci.
   - Un texte resté sous 4,6:1 prend l'encre la plus lisible.
   - Les contrôles gratuits existants restent en place : taille minimale 22 px, zones de sécurité, chevauchements.
4. **Produit réel mis en scène** (`src/lib/ads-v2/engine.ts`, `src/lib/image-v2/deps.ts`) : pour un produit avec
   détourage, le studio demande d'abord une photographie publicitaire qui contient le vrai produit. Il passe par les
   chemins de fidélité déjà en place : retouche par masque, ou décor généré puis produit composé. Dans les deux cas,
   les pixels d'origine du produit sont remis par-dessus.
   - Le produit est placé à l'opposé du texte : à droite si le texte est à gauche, en bas s'il est en haut.
   - Sans génération possible (forfait sans IA, aucun fournisseur), le studio prend un décor d'univers et y pose le détourage.
5. **Texte** : l'accroche est demandée comme un titre d'affiche (2 à 7 mots). Une ligne secondaire (`sub`, 60
   caractères au plus) passe les mêmes contrôles d'affirmations que le reste. Sans elle, le studio utilise des faits
   confirmés (prestations réelles, catégorie). L'image idéale décrite par le rédacteur sert maintenant de consigne
   d'image (elle était perdue).
6. **Consignes d'image publicitaires** :
   - un seul point focal, une lumière travaillée, des matières, de la profondeur, de l'air pour le texte ;
   - une zone de l'image gardée calme, choisie selon la composition et le format ;
   - le texte de génération d'ambiance, qui ne parlait que de métiers, est corrigé pour les produits.
7. **Contrôle qualité** : la relecture finale compare la création au niveau attendu. Elle vérifie l'orthographe, le
   nom de marque exact, les textes coupés ou posés sur le produit, les déformations de l'IA, la fidélité du produit,
   et qu'une scène de service ne se présente pas comme une réalisation réelle. Les reprises restent limitées (2 au
   plus), d'abord gratuites (autre composition), et le plafond de dépense par tâche est inchangé.
8. **Formats** : le paysage 1,91:1 est ajouté (Google Display). Le 16:9 reste disponible (LinkedIn, éditeur).
9. **Éditeur** : changer de format **recompose** la création avec sa recette : même composition, mêmes images,
   textes actuels du client. Si le client a ajouté ses propres calques, l'ancienne adaptation géométrique prend le
   relais, pour ne rien perdre.

## Vérifié ici

- `npx tsc --noEmit` : aucune erreur.
- Tests automatiques : `tests/ads-premium.test.ts` (nouveau), plus les tests existants des publicités, de l'éditeur, des images et des réseaux sociaux.
- Six compositions × quatre formats rendues localement par `scripts/ad-art-preview.ts`, sur des photos de test.
  Toutes les créations respectent un contraste de 4,5:1 au moins, des textes de 22 px au moins, les zones de
  sécurité, et aucun chevauchement.

## Non vérifié ici (à faire dans le Codespace du propriétaire)

- **Aucune image réelle n'a été générée** : ce conteneur n'a aucune clé d'IA ni accès réseau aux fournisseurs. La
  qualité photographique finale dépend du modèle d'images choisi dans Administration › Images & Vidéos (usage
  « Visuel publicitaire »). À valider sur 2 projets produits et 2 projets services, après `npm run maj`, dans
  l'onglet Publicités.
- La relecture IA de la création ne porte que sur le format principal de chaque concept (pour le coût). Les autres
  formats passent les contrôles locaux gratuits.
- La police condensée très haute de la référence « Brume » n'existe pas dans les polices embarquées. Le studio
  utilise les familles disponibles les plus proches.

## Essai réel du 11 octobre (vos API, projets d'essai)

Projets d'essai créés par Claude : un produit (drone, avec une vraie photo détourée) et un service (Sébastien Blanc,
plâtrier-peintre). Images générées avec la clé OpenAI de l'environnement (gpt-image-1). Rédaction et relecture par
l'IA : **indisponibles** ici (aucune clé Anthropic) ; les textes étaient donc ceux du moteur local.

- **Coût réel : 2,70 € pour 14 images** (0,15 à 0,23 € l'image), budget autorisé de 3 €.
- **Défaut trouvé et corrigé** : sans relecture IA possible, une image générée ne peut jamais être validée. Elle
  était pourtant payée, puis mise de côté, et les publicités sortaient sans photo.
  Correctif : **aucune génération payante quand le contrôle est impossible** (`src/lib/image-v2/engine.ts`). Un test
  le garantit (`tests/image-v2.test.ts`). Ces 2,70 € n'auraient pas été dépensés.
- **Qualité des images obtenues** : photographies réalistes et soignées (lumière, matières), avec le vrai drone mis en
  scène et des outils de plâtrier sur chantier.
- **Défaut du modèle, déjà visé par la relecture finale** : sur 3 des 4 mises en scène du drone, le modèle a redessiné
  un second drone plus sombre derrière le vrai, que le studio pose ensuite par-dessus. La relecture IA (« produit
  altéré ») doit écarter ces images : c'est une raison de plus de ne jamais générer sans elle.
- Les images payées ont été recomposées dans les nouvelles mises en page, sans aucun frais supplémentaire, pour juger
  le rendu réel. Les textes de cette planche ont été écrits pour la démonstration et ne sont pas ceux du moteur.

À faire avec une clé Anthropic disponible (votre Codespace) : le même essai avec la rédaction et la relecture par
l'IA.

## Images : Pixabay d'abord, et plus jamais de second produit (suite de l'essai)

Demande du propriétaire : chercher d'abord sur Pixabay pour toutes les images du studio, IA seulement à défaut. Il
garde la direction des décors de l'essai, mais refuse le drone noir en double.

- **Ordre des banques** : Pixabay, puis Pexels, puis Openverse, pour les photos comme pour les vidéos.
- **Images avec le produit** (publicités, photos en situation, images produit) : nouvelle étape « décor libre »
  (`src/lib/image-v2/plates.ts`).
  1. Le studio cherche un décor **vide** sur Pixabay : plan de travail, étagère, table, socle, fond flou adapté à la
     famille du produit.
  2. Il choisit le décor d'après la description de la photo, sans IA. Une photo avec une personne ou un autre objet
     au premier plan est écartée.
  3. Il pose le vrai produit sur ce décor, avec une ombre de contact en deux couches. Les pixels du produit ne
     changent pas.
  4. La relecture IA (si elle est disponible) juge le résultat avec la photo de référence du produit.
  5. Si aucun décor ne convient, l'IA crée un décor vide, puis le studio y pose le produit de la même façon.
- **Cause du drone noir supprimée** : la retouche par masque n'est plus utilisée. Avec elle, la photo du produit était
  envoyée à l'IA, qui le redessinait derrière le vrai. Désormais, aucune photo du produit n'est envoyée à une IA
  d'images : un second produit est impossible par construction.
- **Image seule** (onglet Images, produits) : même ordre, décor Pixabay d'abord. Pour une entreprise de services,
  l'image d'ambiance cherche d'abord une photo libre du métier avant l'IA.
- **Économie** :
  - un décor Pixabay posé par le studio ne coûte aucune image (0 €) ;
  - seule la relecture IA de l'image composée est payée : un contrôle, et non une génération à 0,15–0,23 €.
- **Forfait Découverte** : décor Pixabay et produit posé, gratuits. Ces images ne sont jamais validées comme
  définitives sans contrôle.

Vérifié ici : `npx tsc --noEmit`, toute la suite de tests, et le nouveau test `tests/image-plates.test.ts`.

Non vérifié ici : la qualité réelle des décors Pixabay. Le réseau de ce conteneur bloque Pixabay. À juger dans votre
Codespace, sur un projet produit, dans les onglets Publicités et Images.
