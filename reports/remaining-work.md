# REGISTRE DES TRAVAUX RESTANTS

Tenu à jour à chaque phase. Rien de ce qui figure ici n'est présenté comme fait.
Règle pour les phases 6, 7, 9 et 10 : réutiliser **en priorité l'Image Engine V2** (`src/lib/image-v2/`) et, pour
les publicités, l'**Advertising Engine V2** (`src/lib/ads-v2/`), plutôt que créer des moteurs d'images concurrents.

Dernière mise à jour : phase 8A validée techniquement (SEO, Copywriting & Blog Engine V2) ; 8B reportée.

## Validations visuelles réelles en attente (benchmarks payants, dans le Codespace du propriétaire)

| Phase | Objet | Script | État |
|---|---|---|---|
| 4B | Logos (Brand & Logo Engine V2) | `scripts/benchmark-logo-v2.ts` | en attente |
| 5B | Images et recherche (Image Engine V2) | `scripts/benchmark-image-v2.ts` | en attente |
| 6B | Publicités (Advertising Engine V2) | `scripts/benchmark-ads-v2.ts` | en attente |
| 7B | Vidéos et UGC (Video Engine V2) | `scripts/benchmark-video-v2.ts` | en attente |
| 8B | Textes SEO, fiches, pages, articles (SEO Engine V2) | `scripts/benchmark-seo-v2.ts` | **reporté** par décision du propriétaire |
| 8B | SEO des fiches Shopify (métachamps) | `scripts/verify-shopify-seo.ts` | **reporté** — mécanisme NON VÉRIFIÉ |

La qualité visuelle réelle de ces quatre moteurs n'est PAS prouvée tant que ces benchmarks n'ont pas été faits.
En 7A, toutes les vidéos ont été produites avec des fournisseurs SIMULÉS (mires, images de test) : aucune vidéo
réelle n'a été générée ni jugée.

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

Éditeur validé techniquement par le propriétaire (810 tests automatisés, 28 tests navigateur). **La qualité
esthétique réelle des publicités reste NON VALIDÉE** jusqu'au benchmark 6B avec les API du propriétaire.

Limites connues de l'éditeur (à traiter plus tard) :
- génération payante après accord (photo IA, nouvelle version IA) : branchée, jamais exécutée avec un vrai fournisseur ;
- pas de sélection multiple ni de groupes ;
- pas de « pincer pour zoomer » sur téléphone (boutons de zoom à la place) ; un tiroir ouvert cache le bas de la publicité ;
- tablette réelle, Safari et Firefox non testés (Chromium seulement) ;
- polices du studio uniquement (pas d'import de police personnelle) ;
- l'historique « annuler » ne survit pas au rechargement (les versions enregistrées et le brouillon local, si) ;
- exports PNG, JPEG, JSON seulement (pas de PDF, SVG, vidéo) ;
- relancer la création avec les mêmes angles met à jour les créations existantes (nouvelle version) au lieu d'ajouter des doublons ;
- aperçu du navigateur non identique à l'octet près à l'export (lissage), composition identique ;
- tests faits avec des images de test, pas de vraies photos.

## Video & UGC Engine V2 (phase 7A) — fait et ce qui reste

| Élément | État |
|---|---|
| Intention, stratégie créative, script (local + IA contrôlée), storyboard, planification des plans | **fait**, testé (fournisseurs simulés) |
| Router V2 vidéo : capacités déclarées ET vérifiées, repli sur un fournisseur compatible, estimation avant envoi | **fait**, testé ; capacités « annoncées » (texte vers vidéo de Veo) **non utilisées** tant que non vérifiées (7B) |
| Plans générés contrôlés (produit, personnage, sujet, artefacts), reprise ciblée d'un plan, mémoire des plans payés | **fait**, testé avec des relectures simulées |
| Document vidéo éditable (timeline, calques de l'éditeur publicitaire, sous-titres, pistes audio), opérations gratuites, historique, versions | **fait**, testé |
| Retouches par conversation (raccourcir, musique, sous-titres, rythme, supprimer ; remplacement et nouvelle version annoncés) | **fait**, testé |
| Rendu MP4 (H.264/AAC), sous-titres incrustés + SRT/VTT, affiche, mixage audio (atténuation sous la voix, normalisation) | **fait**, testé (rendu réduit dans les tests) |
| API (`/api/projects/[id]/videos/v2`, `/videos/v2/[docKey]`), tâches `video.v2`, `video.v2.render`, `video.v2.clip`, étape « vidéo » des plans | **fait** (API non testée par un navigateur) |
| **Interface de montage** (timeline visuelle dans le studio) | **À FAIRE** (7A : modèle, opérations et API seulement, comme demandé) |
| **Voix off synthétique** | **À FAIRE** : aucun fournisseur de synthèse vocale branché ; la voix est préparée (texte, timing) et portée par les sous-titres |
| Musique de bibliothèque sous licence | modèle prêt (licence obligatoire), **aucune bibliothèque musicale branchée** ; seule la musique composée par le studio est utilisée |
| Benchmark réel 7B (qualité, coûts réels, continuité réelle des personnages) | **en attente** (`scripts/benchmark-video-v2.ts`) |

**Reportés par décision du propriétaire (après la Phase 8, non développés pendant la Phase 8)** : finalisation de
l'éditeur vidéo (interface de montage dans le studio, bascule de l'onglet Vidéos sur le V2) et voix off
synthétique (fournisseur de synthèse vocale, test d'écoute).

Chemins vidéo encore ANCIENS (conservés pour compatibilité) : onglet Vidéos → `video.render` (`engine/videos.ts`,
`produceVideo`) et `video.ugc` (`engine/ugc.ts`, `produceUgc`). L'étape « vidéo » des plans passe déjà par le
Video Engine V2 ; l'onglet Vidéos sera basculé avec l'interface de montage.

## SEO, Copywriting & Blog Engine V2 (phase 8A) — fait et ce qui reste

Fait (fournisseurs simulés, aucun appel payant) : moteur `src/lib/seo-v2/` (intention, recherche de mots-clés en
HYPOTHÈSES sémantiques, stratégie par projet, brief, faits vérifiés, rédaction locale puis IA contrôlée, 8 politiques
de barrière `seo_*_v2`, reprises ciblées, idempotence, plafond de coût), documents texte versionnés (table
`content_documents`), éditeur de blocs dans les onglets Produit / Activité et Blog, retouches en conversation,
export HTML / Markdown / JSON-LD, Blog V2 rangé dans le blog existant, test navigateur 12/12.

Validé techniquement par le propriétaire (8 octobre 2026) : stratégie SEO V2, intentions, fiches produit et pages
de services, Blog V2, SEO local, multilingue, éditeur de contenus, barrière SEO, intégration Project Brain et
Router V2 (877/877 tests, 12/12 tests navigateur, TypeScript et build OK). **NON VALIDÉS** : qualité réelle des
rédactions IA et performances SEO. **Phase 8B reportée** par décision du propriétaire.

Reste à faire :
- **Intégration Shopify (limite principale)** : le SEO des fiches passe par les métachamps
  `global.title_tag / description_tag` — mécanisme **NON VÉRIFIÉ** (aucun essai sur une vraie boutique ; script
  `scripts/verify-shopify-seo.ts` prêt). Les fiches produit, pages de collection, accueil, « À propos », pages de
  prestation et FAQ rédigées en V2 ne sont **pas envoyées automatiquement** à Shopify : export HTML / Markdown /
  JSON-LD ou copier-coller. Seuls les articles du Blog V2 passent par l'envoi Shopify existant du blog. Les
  données structurées (JSON-LD) ne sont pas installées dans le thème Shopify.
- **Ancien Blog V1 toujours en service** à côté du Blog V2 : « Écrire un article » de l'onglet Blog utilise encore
  l'ancien moteur (700 mots minimum, mots-clés devinés par l'IA sans étiquette « hypothèse », pas de stratégie ni de
  contrôle de cannibalisation, pas de versions). Les deux cohabitent dans la même liste d'articles ; à remplacer par
  le Blog V2 après le benchmark 8B.
- **Benchmark 8B avec vos clés** (`scripts/benchmark-seo-v2.ts`) : la qualité RÉELLE de la rédaction IA n'est pas
  jugée — seules des réponses simulées ont été contrôlées. Aucune performance SEO (positions, trafic) n'est mesurée.
- **Mots-clés** : aucun fournisseur de données (volumes, CPC, difficulté) n'est branché ; l'interface
  `KeywordDataProvider` est prête. Tout reste « hypothèse sémantique ».
- **hreflang** : recommandation seulement, rien n'est installé sur les sites.
- **Audit technique** : indexation, sitemap, robots.txt, redirections, vitesse = exploration du site en ligne, non faite.
- **Espagnol** : textes du moteur et intitulés prêts ; l'interface du studio reste FR/EN ; libellés de métier
  espagnols repris du français (pas de dictionnaire métier ES).
- Retouches IA d'un passage : branchées, testées en simulé seulement.
- Routage : métadonnées et petites réécritures au niveau « standard » (pas de niveau plus économique pour la
  rédaction dans la politique actuelle) ; pages et articles au niveau « fort ».

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
| Vidéos (plans libres, images de départ) | `src/lib/engine/videos.ts` (`searchStockVideos`, `rankStock`) | ancien moteur vidéo (onglet Vidéos) ; le Video Engine V2 demande ses images à l'Image Engine V2 | bascule de l'onglet Vidéos |
| Images UGC | `src/lib/engine/ugc.ts` (`ugcFrame`) | ancien moteur UGC (onglet Vidéos) ; le Video Engine V2 part d'images de l'Image Engine V2 | bascule de l'onglet Vidéos |
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
