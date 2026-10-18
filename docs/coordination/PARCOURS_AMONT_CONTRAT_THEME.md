# PR 138 — contrat à raccorder au moteur de thème

Ce document décrit le raccordement **à réaliser lors de la reprise des thèmes**. Cette livraison prépare les données ; elle ne modifie pas les thèmes de Claude et ne certifie aucun export CMS. Conserver le point de reprise [REPRISE_EXPORTS_PR_136.md](REPRISE_EXPORTS_PR_136.md).

## Entrée unique et barrières

Lire `readyContract(projectId)` dans `src/lib/preparation/engine.ts`. Une valeur `null` signifie que le projet n'est pas prêt. Ne pas fabriquer un contrat à partir de la dernière tâche marquée `done`. Le pointeur mémoire `project.ready_for_theme` appartient à une révision ; une mutation le retire jusqu'à nouvelle validation. Recontrôler les droits et la révision au moment de construire/exporter.

Le contrat existant est enrichi de champs optionnels pour les anciennes sauvegardes ; aucune migration destructive :

- `provenance`: `production` ou `simulation`. Un contrat synthétique n'autorise aucune publication client.
- `clientBrief`: demande exacte et références ; `profile`, `services`, `strategy` : données et positionnement validés.
- `brand.artIdentity`: `seriesId`, `directionId`, signature, palette et rôles, polices, ton, ambiance, langage graphique, règles et exemple rédactionnel. Ne pas reconstituer une autre identité à partir du seul logo.
- `recommendation`: identifiant existant recommandé, raisons, alternatives, catalogue avec `available` / `in_progress` / `incompatible`, `selectedId` et état `proposal` / `selected`. La suggestion ne vaut pas choix client. Un choix devenu incompatible est conservé et demande confirmation.
- `pages`: identifiant, chemin, but, sections et clé du document. Contact fait partie des pages à rédiger.
- `documents`: documents éditables complets et versionnés, jamais des extraits. `copy` est la liaison historique, `copyReadiness` doit être `mapped` ; les documents restent la référence.
- `editorial`: pour chaque bloc, `pageKey`, `sectionKey`, objectif, message, `docKey`, `blockIds`, texte intégral, `mediaSlotKeys`, justification du rapprochement.
- `media`: chaque emplacement final avec fichier, format, provenance, scène, légende, texte alternatif, validation et contrôle de cohérence.
- `mediaPolicy`: dix images, une vidéo produit / deux vidéos service, source attendue et vidéo hero obligatoire.
- `sources`, `research`, `warnings`, `approvals`: pages effectivement consultées, couverture et limites, hypothèses et approbations. Aucun volume SEO ou classement réel implicite.

Complément palettes [6255416899](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/138#issuecomment-6255416899) : conserver les cinq rôles de la direction choisie, pas seulement `primary`. `primary` porte les titres/signatures, `secondary` les surfaces et `accent` les appels à l’action ; `light`/`dark` forment la base neutre. Les trois premiers rôles varient réellement entre les trois directions, les neutres peuvent être communs. `palettePresentation` dans `src/lib/logo-v2/direction-palette.ts` décrit les associations de comparaison contrôlées (4,5:1). Au raccordement, préserver les valeurs et descriptions de `brand.artIdentity.colorRoles`, vérifier les associations propres au thème et signaler une incompatibilité ; ne pas recolorer silencieusement ni tirer une autre palette du PNG. [Preuves et limites du complément](PR_138_PALETTES_DIRECTIONS.md).

## Médias à consommer

| Projet | Photos finales | Vidéos finales | Références conservées à part |
|---|---|---|---|
| Produit | 10 créations IA distinctes : 4 × 1:1, 4 × 16:9, 2 × 9:16 | 1 Pixabay d'ambiance | Originaux client et fichiers HQ fournisseur ; ni essais refusés ni recadrages multiples comptés comme créations |
| Service | 10 photos Pixabay téléchargées et contrôlées | 2 Pixabay, dont une pour le hero | Photos client préexistantes, logos et réalisations validées conservés |

Un emplacement possède `key`, `pageKey`, `sectionKey`, `kind`, `source`, `aspect`, `scene`, `purpose`, `assetId`, éventuellement `webAssetId` et `posterId`, `caption`, `alt`, `rationale`, `peopleConsent`, `reviewed` et `alignment`.

Utiliser les identifiants de la bibliothèque du **même projet**, jamais une URL CDN Pixabay comme ressource permanente. `webAssetId` désigne un dérivé optimisé ; `assetId` reste le résultat contrôlé. Les originaux HQ sont des fichiers séparés liés au résultat par `source_asset_id`. Un fichier PNG n'est pas une version SVG ; seules les vectorisations ayant passé leur contrôle de fidélité peuvent être annoncées vectorielles.

`alignment.contextHash` lie l'acceptation à l'identité, aux faits, au texte adjacent, à la scène, au consentement et à l'affectation. Un texte, une identité ou une affectation modifiés demandent un nouveau contrôle. Un fichier compatible peut être relu sans être régénéré. Les validations de contextes antérieurs sont archivées dans les métadonnées pour permettre leur réutilisation après restauration.

La politique finale exclut les originaux, essais, fichiers rejetés ou supprimés, doublons d'identifiant/contenu/source, mauvais types, formats et résolutions insuffisants. Le contrôle visuel API vérifie le sujet, les gestes, les personnes, marques, filigranes, défauts, diversité et texte adjacent. La pertinence réelle ne sera démontrée que par les essais fournisseurs et l'inspection humaine, pas par le seul schéma.

## Hero vidéo et mise en page

Le premier emplacement vidéo reste affecté à `home/hero`. Son contrat `playback` demande : muet, `playsInline`, boucle si appropriée, pause accessible, poster en mouvement réduit et fallback mobile. Le fichier est une vraie vidéo décodée ; un poster doit appartenir à cette vidéo. Le contrôle analyse trois images du clip, pas seulement sa miniature.

Lors du raccordement :

1. Vérifier une zone lisible pour le texte sur ordinateur et mobile ; ne pas masquer le produit, un geste ou une information importante.
2. Utiliser le poster pour `prefers-reduced-motion`, les contraintes de données/lecture automatique et le fallback mobile. Fournir un bouton pause/reprise utilisable au clavier et un contraste suffisant.
3. Ne jamais imposer une bande-son. Une vidéo d'ambiance ne prouve ni les caractéristiques du produit exact ni les locaux, salariés ou réalisations de l'entreprise.
4. Charger les images hors écran en différé, fournir dimensions et tailles responsives. La vidéo hors hero reste différée ; limiter le préchargement et contrôler le poids réel.
5. Employer les formats verticaux dans une story ou un carrousel adapté. Conserver les proportions, sans étirement ni découpe automatique du produit. Les photos de stock sont conservées sans recadrage destructif ; leur format de recherche est une préférence de placement.
6. Affecter chaque média final à un emplacement utile sur l'ensemble des pages. Éviter les répétitions ; ne pas écraser les packshots, logos et créations approuvées. Les affectations restent modifiables dans Préparation.

Le présent lot n'ajoute pas de lecteur hero au moteur Liquid. La lecture/pause vérifiée dans le studio utilise le lecteur HTML de l'éditeur ; elle ne constitue pas une preuve d'autoplay, pause accessible ou fallback dans un thème exporté.

## Export et droits

Les métadonnées Pixabay conservent source, identifiant, auteur, page d'origine, licence, usages prévus et la restriction `standaloneRedistribution:false`. Documentation consultée : [API officielle](https://pixabay.com/api/docs/) et [licence](https://pixabay.com/service/license-summary/), le 18/10/2026. Les recherches sont mises en cache 24 h sur disque ; les fichiers sont téléchargés avec les protections existantes contre les téléchargements dangereux.

Un export de site doit intégrer les médias dans une création adaptée et préserver leur traçabilité. Ne pas fournir ces fichiers comme banque de stock autonome, ni promettre des droits sur les personnes, marques ou biens visibles. Une offre d'archive brute nécessite une vérification de licence distincte.

| Cible de la reprise | Vérification restant à faire |
|---|---|
| Aperçu studio / HTML | Consommation de tous les blocs, fichiers et affectations ; rendu responsive, clavier, poids et mouvement réduit |
| Shopify | Sections et réglages Liquid compatibles, hébergement/import des vidéos et posters, variantes et panier préservés ; contrôles Theme Check et boutique de test |
| WooCommerce | Raccordement du renderer/plugin, transfert des fichiers et métadonnées, lecteur et contenu de toutes les pages dans une installation de test |
| PrestaShop | Équivalent via son module et ses contraintes de stockage/vidéo ; vérifier version et capacités du thème cible |

Aucun de ces raccordements ou résultats CMS n'est déclaré vérifié par cette passe. Aucun thème, export client, merge ou déploiement n'a été lancé.
