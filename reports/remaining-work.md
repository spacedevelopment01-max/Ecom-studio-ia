# REGISTRE DES TRAVAUX RESTANTS

Tenu à jour à chaque phase. Rien de ce qui figure ici n'est présenté comme fait.
Règle pour les phases 6, 7, 9 et 10 : réutiliser **en priorité l'Image Engine V2** (`src/lib/image-v2/`) et, pour
les publicités, l'**Advertising Engine V2** (`src/lib/ads-v2/`), plutôt que créer des moteurs d'images concurrents.

Dernière mise à jour : phase 6A + éditeur visuel des publicités (interface livrée, testée en navigateur).

## Validations visuelles réelles en attente (benchmarks payants, dans le Codespace du propriétaire)

| Phase | Objet | Script | État |
|---|---|---|---|
| 4B | Logos (Brand & Logo Engine V2) | `scripts/benchmark-logo-v2.ts` | en attente |
| 5B | Images et recherche (Image Engine V2) | `scripts/benchmark-image-v2.ts` | en attente |
| 6B | Publicités (Advertising Engine V2) | `scripts/benchmark-ads-v2.ts` | en attente |

La qualité visuelle réelle de ces trois moteurs n'est PAS prouvée tant que ces benchmarks n'ont pas été faits.

## FONCTIONNALITÉ OBLIGATOIRE — ÉDITEUR VISUEL DES PUBLICITÉS (avant la validation finale de l'Advertising Engine V2)

L'Advertising Engine V2 ne sera pas validé définitivement tant que le client ne peut pas, dans le studio, ouvrir une
publicité générée, sélectionner son titre, changer son texte, remplacer sa photo, modifier une forme, déplacer son
logo, enregistrer et exporter — sans aucun appel d'IA. Une publicité n'est pas « modifiable » parce que l'IA peut
régénérer son texte. Architecture : `reports/ad-editor-architecture.md`.

| Élément | État |
|---|---|
| Document en calques (fond, image, voile, produit, marque, titre, bouton, logo, formes) produit par le moteur V2 | **fait** (`src/lib/ad-doc/types.ts`, `ads-v2/compose.ts`) |
| Moteur de rendu unique aperçu = export (isomorphe navigateur / serveur) | **fait** (`ad-doc/render.ts`) ; vérifié : rendu du document = image enregistrée, à l'octet près |
| Opérations d'édition gratuites (texte, image, recadrage, couleurs, dégradés, transparence, formes, polices, position, taille, rotation, ordre, masquer, verrouiller, dupliquer, supprimer) | **fait** (`ad-doc/ops.ts`) |
| Annuler / rétablir | **fait** (classe `History`, côté éditeur) |
| Versions, historique, restauration, duplication, modifications persistantes | **fait** (table `ad_documents`, `ad-doc/store.ts`) |
| Une régénération n'écrase jamais une création modifiée par le client | **fait** (moteur V2 : `userOwned`) |
| Adaptation aux formats (1:1, 4:5, 9:16, 16:9, bannières) en gardant les modifications | **fait** (`ad-doc/reflow.ts`) |
| Export PNG, JPEG, document éditable (JSON) fidèle à l'aperçu | **fait** (`exportDoc`, API `?export=`) |
| Retouches en langage naturel : simples en local et gratuites ; génération annoncée, jamais lancée sans accord | **fait** (`ad-doc/local-edit.ts`, zone « Demander une retouche » de l'éditeur ; refus vérifié en navigateur : aucune tâche lancée). Génération payante après accord (photo IA, nouvelle version) : **branchée mais jamais exécutée avec un vrai fournisseur** — à vérifier au benchmark 6B |
| Contrôles signalés après modification (lisibilité, zones de sécurité, produit recouvert, texte sur le bouton, affirmations) | **fait** (API : `problems`, bouton « problèmes » de l'éditeur) |
| API de l'éditeur (`/api/projects/[id]/ads/docs`, `/ads/docs/[docKey]`) | **fait** |
| **Interface de l'éditeur** : bouton « Modifier », canevas interactif (sélection, double-clic sur un texte, glisser-déposer, poignées de redimensionnement et de rotation, repères d'alignement), panneau des calques, panneaux couleurs / polices / formes / images (bibliothèque, recadrage), annuler / rétablir, enregistrer, versions, exporter | **fait** (`src/components/studio/ad-editor/`) ; testé en navigateur réel (`scripts/e2e-ad-editor.ts`, 28/28) |
| **Interface mobile et tablette** (gestes tactiles, panneaux d'outils en bas d'écran, édition du texte au clavier mobile) — pas une réduction de l'écran ordinateur | **fait** ; testé au format téléphone (390 × 844, tactile). Pincer pour zoomer : **non fait** (boutons de zoom à la place). Tablette réelle : **non testée** |
| Polices de la marque chargées dans le navigateur (@font-face) pour un aperçu identique à l'export | **fait** (`/api/fonts`, mêmes fichiers et mêmes noms que le serveur) ; mesuré : écart moyen aperçu / export ≈ 0,6 à 1,4 sur 255 (lissage des bords), composition identique |
| Tests de l'interface (captures ordinateur et téléphone) | **fait** (`reports/screenshots/ad-editor/`, `reports/ad-editor-final-report.md`) |

Reste à faire pour l'éditeur : voir « Limites » dans `reports/ad-editor-final-report.md` (sélection multiple,
pincer pour zoomer, test sur tablette réelle, génération payante vérifiée avec un vrai fournisseur).

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
| Fenêtre « Campagne » de l'onglet Publicités | `src/app/api/projects/[id]/campaigns/draft/route.ts` → `draftAds` (`src/lib/engine/ads.ts`) | textes et plan de test (IA ou local), sans créations visuelles ; conservée pour compatibilité, sous la nouvelle section V2 « Créations publicitaires » |
| Visuels « publicité » de la création complète | `images.ts` → `generateImageSet` (rôle `ad`, `renderCreative`) | visuels génériques à partir du titre de marque |
| Publicités d'une entreprise de services | `service-media.ts` → `serviceCardPlan` (rôle `ad`, gabarits « booking ») | cartes à la marque, sans angle ni barrière publicitaire |
| Vidéos publicitaires | `src/lib/engine/videos.ts` (`produceVideo`, cible `ads`) | montage vidéo existant |

Déjà sur l'Advertising Engine V2 : étape « publicités » des plans (`ad`), action `ads.v2` (API
`/api/projects/[id]/campaigns/v2`), section « Créations publicitaires » de l'onglet Publicités (créer, modifier,
exporter).

## Autres limites connues

- Pas encore d'écran dédié dans le studio pour les images V2 (bibliothèque et API seulement). Les créations
  publicitaires V2 ont leur écran (onglet Publicités).
- Seuils locaux (netteté, exposition, contraste, part de texte) non calibrés sur de vrais rendus.
- Limites de texte et zones de sécurité des régies : valeurs publiques au moment du développement, à revérifier.
