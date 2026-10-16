# Guide du moteur d'images — images finales 100 % IA

Règle du propriétaire : **toute image finale** (publication, publicité, visuel de prestation, image produit, bénéfice,
bannière, ambiance, promotion, image du site ou de la fiche produit) est **créée par un modèle d'images**. Un gabarit,
une composition du studio ou une photo de banque avec un texte posé ne la remplacent jamais. Après la création, seules
des opérations techniques sont permises (redimensionner, compresser, convertir).

Échec ou budget insuffisant : nouvel essai ciblé dans le budget, autre modèle autorisé, ou **blocage signalé** — jamais
de bascule silencieuse vers un gabarit. Le moteur vidéo n'a pas changé (Pixabay reste permis pour les vidéos de
services) ; les **images fixes** de services sont créées par l'IA, jamais une photo Pixabay.

## Où sont les règles et comment le moteur les charge

| Règle | Où elle vit | Chargée par |
|---|---|---|
| Rôles d'image (texte permis, bouton, zone calme), tailles de texte (px à 1080), marges 60–90 px, compositions, contraste 4,5:1, effets avec intention, clichés interdits, grille de contrôle, nombre d'essais | `src/lib/image-v2/image-guide.ts` (`DEFAULT_IMAGE_GUIDE`) | `loadImageGuide()` à chaque image finale |
| Modifications du propriétaire, sans code, persistantes (la règle « IA obligatoire » et les clichés ne se désactivent pas) | réglage `image.creative_guide` (table `settings`) | API `GET/PUT /api/admin/image-guide` |
| Direction artistique **propre à chaque client** (idée, composition, palette de la charte, typographie, lumière, décor, style, densité, émotion, à éviter, justification) — mémoire versionnée | table `memory`, portée `images`, clé `image.art_direction` (anciennes versions gardées, statut `rejected`) | `artDirectionFor(p)` (`src/lib/image-v2/art-direction.ts`) ; API `GET/PATCH /api/projects/[id]/images/art-direction` |
| Brief de génération en 16 points (objectif, sujet, références, concept, composition, cadrage, décor, lumière, palette, typographie, textes exacts entre « », logo, fidélité, interdits, format, contrôles) | `buildGenerationBrief` + `briefPrompt` | `designPostWithAi` (publications, publicités) |
| Diversité : compositions récentes du projet ; au niveau du studio, seulement les **univers** choisis par les autres projets du même secteur (jamais leurs données) | `universesUsedElsewhere`, `meta.finalImage` des images | `artDirectionFor`, `designPostWithAi` |

## Publications et publicités : deux étapes (choix du propriétaire)

1. **Photo** — Qwen-Image (usage « Images réseaux sociaux / Publicités visuelles ») : la scène avec le vrai produit en
   référence, **sans aucun texte ni logo** (les notes de direction artistique sont des instructions, jamais écrites).
2. **Texte et logo** — ChatGPT Images d'OpenAI (usage « Texte et logo sur les images », réglable dans
   Administration › Images & Vidéos) : sur cette photo, inchangée, l'IA pose les textes exacts, le bouton et le vrai
   logo (tailles, marges, contraste du guide).

Contrôle : texte raté → seule l'étape 2 est refaite (la photo payée est gardée) ; produit raté → la photo est refaite.
Essai réel du 16/10 (une seule étape, Qwen) : produit fidèle mais mots des consignes recopiés dans l'image — d'où
cette séparation.

## Chaque parcours appelle un modèle d'images

| Parcours | Avant | Maintenant |
|---|---|---|
| Publications (Social V2, pilote automatique) | affiche du studio sur photo, gabarit en secours | `designPostWithAi` ; sans dépense acceptée : aucun visuel, raison dite |
| Publicités (Ads V2, création du projet) | composition à calques sur photo | `finalAd` → `designPostWithAi` (as « ad ») ; sans IA : `ai_blocked` |
| Onglet Images (créer une image) | « image gratuite » du studio (packshot, mise en scène) | Image V2 en génération seule (`noStock`) ou publication IA ; sans IA : refus 402 |
| Jeu d'images de la création | packshots, recadrages, mises en scène du studio, photos de banque | `runImageSetV2` : image principale, en situation 16:9 et 4:5, ambiance (produit) ; scènes du métier et bannière (service) — toutes par l'IA |
| Banque du thème | 15 photos de banque | aucune photo de banque (`THEME_BANK_IMAGES = 0`) ; vidéos libres inchangées |
| « Régénérer le visuel » d'une publication | mise en page du studio | publication IA ; sans IA : refus expliqué |
| Ancien calendrier, anciennes tâches `image.single` | cartes et affiches du studio | plus de visuel composé ; `image.single` passe par Image V2 en génération seule |

Le détourage reste un outil de **préparation** de la référence (le vrai produit), jamais une image finale.

## Contrôle et correction

`designPostWithAi` fait relire chaque image par l'IA de vision (textes exacts, produit, logo, marques tierces) et
recommence au plus 3 fois avec la correction ciblée ; Image V2 applique sa barrière (fidélité, artefacts, diversité).
**Limite vérifiée** : sans IA de vision configurée, ces contrôles ne peuvent pas être faits — l'image est alors
« à vérifier », jamais déclarée conforme. Aucun OCR local n'est installé sur ce serveur.

## Budget

Toujours dans les plafonds existants (40 % de l'abonnement HT, 50 % des recharges, plafond de chaque tâche). Budget
insuffisant : le moteur le dit et ne crée rien à la place.

## Encore à décider par le propriétaire

- La recherche **manuelle** de photos libres dans la banque (onglet Images › Chercher des photos libres) reste
  disponible comme matière brute choisie par le client ; elle n'est plus utilisée automatiquement comme image finale.
