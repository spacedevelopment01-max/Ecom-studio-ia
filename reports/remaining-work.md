# REGISTRE DES TRAVAUX RESTANTS

Tenu à jour à chaque phase. Rien de ce qui figure ici n'est présenté comme fait.
Règle pour les phases 6, 7, 9 et 10 : réutiliser **en priorité l'Image Engine V2** (`src/lib/image-v2/`) et, pour
les publicités, l'**Advertising Engine V2** (`src/lib/ads-v2/`), plutôt que créer des moteurs d'images concurrents.

Dernière mise à jour : phase 6A.

## Validations visuelles réelles en attente (benchmarks payants, dans le Codespace du propriétaire)

| Phase | Objet | Script | État |
|---|---|---|---|
| 4B | Logos (Brand & Logo Engine V2) | `scripts/benchmark-logo-v2.ts` | en attente |
| 5B | Images et recherche (Image Engine V2) | `scripts/benchmark-image-v2.ts` | en attente |
| 6B | Publicités (Advertising Engine V2) | `scripts/benchmark-ads-v2.ts` | en attente |

La qualité visuelle réelle de ces trois moteurs n'est PAS prouvée tant que ces benchmarks n'ont pas été faits.

## Chemins d'images encore ANCIENS (pas encore sur l'Image Engine V2)

| Parcours | Code | Ce qu'il fait aujourd'hui | Phase prévue pour la reprise |
|---|---|---|---|
| Images produit de la création complète | `src/lib/engine/images.ts` → `generateImageSet` | scènes IA autour du détourage (`openaiScene`, `geminiPlate`), contrôle `verifyAiImage` (barrière phase 1), compositions `renderCreative` / `renderProCreatives` | à reprendre (images de boutique) |
| Image seule (onglet Images) | `images.ts` → `generateSingleImage` | même chemin que ci-dessus | à reprendre |
| Images d'une entreprise de services | `src/lib/engine/service-media.ts` → `generateServiceImageSet`, `ambianceChecked`, `postAmbiance` | ambiances IA (`ambianceImage`) contrôlées par `checkAmbiance` ; photos libres par `stockFill` (règles V2 partagées : tri par scène, mémoire des refus, licence) | à reprendre |
| Photos libres des publications | `service-media.ts` → `postStockPhoto` / `topicQueries` | recherche existante alignée sur les règles V2, pas le moteur V2 complet | phase 7 (réseaux sociaux) |
| Visuels des publications (calendrier) | `src/lib/engine/calendar.ts` (`renderCreative`) | composition locale à partir du détourage | phase 7 |
| Retouche d'un visuel de publication | `worker/handlers.ts` (`post.regenerate`, `renderCreative`) | composition locale | phase 7 |
| Kit réseaux sociaux, maquettes de marque | `src/lib/media/social-kit.ts`, `src/lib/media/brand-mockups.ts` | compositions locales | à évaluer |
| Vidéos (plans libres, images de départ) | `src/lib/engine/videos.ts` (`searchStockVideos`, `rankStock`) | recherche de vidéos libres (tri par scène V2 partagé) | phase vidéo |
| Images UGC | `src/lib/engine/ugc.ts` (`ugcFrame`) | images de personnes générées | phase vidéo |
| Univers produit (ancienne fonction) | `src/lib/engine/stock-universe.ts` → `universePhotos` | requêtes locales V2 (catégories), contrôle existant | remplacée dans les plans par l'Image V2 ; fonction encore utilisée par d'anciens appels |

Déjà sur l'Image Engine V2 : étape « photos libres » des plans (`findStockPhotos`), action `image.v2` (API
`/api/projects/[id]/images/v2`), visuels des publicités V2 (phase 6A).

## Chemins publicitaires encore ANCIENS (pas encore sur l'Advertising Engine V2)

| Parcours | Code | Ce qu'il fait aujourd'hui |
|---|---|---|
| Fenêtre « Campagne » de l'onglet Publicités | `src/app/api/projects/[id]/campaigns/draft/route.ts` → `draftAds` (`src/lib/engine/ads.ts`) | textes et plan de test (IA ou local), sans créations visuelles ; reste en place tant que l'onglet n'a pas d'écran V2 |
| Visuels « publicité » de la création complète | `images.ts` → `generateImageSet` (rôle `ad`, `renderCreative`) | visuels génériques à partir du titre de marque |
| Publicités d'une entreprise de services | `service-media.ts` → `serviceCardPlan` (rôle `ad`, gabarits « booking ») | cartes à la marque, sans angle ni barrière publicitaire |
| Vidéos publicitaires | `src/lib/engine/videos.ts` (`produceVideo`, cible `ads`) | montage vidéo existant |

Déjà sur l'Advertising Engine V2 : étape « publicités » des plans (`ad`), action `ads.v2` (API
`/api/projects/[id]/campaigns/v2`).

## Autres limites connues

- Pas encore d'écran dédié dans le studio pour les images V2 ni pour les créations publicitaires V2 (bibliothèque
  et API seulement).
- Seuils locaux (netteté, exposition, contraste, part de texte) non calibrés sur de vrais rendus.
- Limites de texte et zones de sécurité des régies : valeurs publiques au moment du développement, à revérifier.
