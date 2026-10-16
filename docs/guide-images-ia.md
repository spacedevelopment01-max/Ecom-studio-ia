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

## Modèle d'images du studio : Qwen-Image 3.0 Pro (choix du propriétaire, 16/10/2026)

Toutes les images du studio, pour tous les comptes (logos, produits, publicités, publications, décors), sont créées
par **Qwen-Image 3.0 Pro** (Alibaba), confirmé d'office (`adminConfirm: false` dans `src/lib/ai/media-models.ts`).
Un choix fait dans Administration › Images & Vidéos reste prioritaire. Sans clé Alibaba active, le studio retombe sur
le défaut historique (OpenAI, plus cher) : l'administration l'affiche en avertissement (« Qwen-Image 3.0 Pro n'est pas
utilisable… les images passent par … à la place »), avec la raison. Décision du propriétaire (16/10/2026) : ce passage automatique
est gardé, mais l'administrateur est **alerté** dès la première image créée ailleurs (`src/lib/ai/media-alerts.ts`,
appelé avant chaque génération payante) : e-mail aux administrateurs (si l'envoi d'e-mails est configuré) et
notification dans l'administration — quoi, pourquoi, depuis quand, projet et usage, surcoût estimé par image, quoi
faire. Au plus un rappel par heure tant que l'incident dure, puis une alerte « rétabli » quand Qwen refonctionne. Un
modèle choisi exprès par l'administration n'est pas un incident. Sans aucun modèle utilisable, l'onglet Images le
dit au client (raison affichée, bouton « Créer » désactivé) et rien n'est créé à la place.

Consignes au modèle d'images **en français** (règle du propriétaire) : moteur Image V2 (banque, jeu d'images),
photo du vrai produit en scène, ambiance, retouche et reconstruction du produit ; directions artistiques
(`src/lib/image-v2/direction.ts`) en français ; produit entier exigé ; clause « aucune personne » en français
(`NO_PEOPLE_FR`). Restent en anglais (à traiter avec leurs onglets) : la consigne des publications et publicités
(`src/lib/social-v2/ai-post.ts`, avec `briefPrompt`/`briefScenePrompt`), les logos, et les descriptions des métiers
et catégories de produits reprises dans les consignes (sujet, décor, interdits).

Publications et publicités : **une seule étape** — Qwen-Image 3.0 Pro crée l'image entière (scène, vrai produit en
référence, textes exacts, bouton, vrai logo). Essais réels ARVEN du 16/10 : la version 3.0 standard a raté trois fois la
même scène (bracelet tronqué, lettre en trop, fausses lettres), la 3.0 Pro l'a réussie du premier coup.

Deuxième étape facultative : si l'administration règle l'usage « Texte et logo sur les images », la photo est d'abord
créée sans texte, puis cette IA pose les textes, le bouton et le logo (texte raté → seule l'étape 2 est refaite).

Produit entier exigé à chaque génération (aucune partie coupée ou manquante, ex. le bracelet complet d'une montre).

## Chaque parcours appelle un modèle d'images

| Parcours | Avant | Maintenant |
|---|---|---|
| Publications (Social V2, pilote automatique) | affiche du studio sur photo, gabarit en secours | `designPostWithAi` ; sans dépense acceptée : aucun visuel, raison dite |
| Publicités (Ads V2, création du projet) | composition à calques sur photo | `finalAd` → `designPostWithAi` (as « ad ») ; sans IA : `ai_blocked` |
| Onglet Images (créer une image) | « image gratuite » du studio (packshot, mise en scène) | Image V2 en génération seule (`noStock` imposé par le serveur à toute génération demandée) ; sans IA : raison affichée, bouton désactivé ; tâche sans image retenue : dit au client |
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

## Modèle de consigne du propriétaire (essai réussi du 16/10/2026)

Image « univers de marque » ARVEN réussie du premier coup avec ce texte (Qwen-Image 3.0 Pro, 3:4, une seule étape ;
résultat : branche `claude/essai-qwen-fr-resultats`, `reports/essai-qwen-consignes-fr/v4-proprietaire/`). Les essais
précédents, écrits par morceaux, avaient produit une personne, un faux texte, un faux logo, puis une montre inventée.

> Photographie de nature morte haut de gamme, photoréaliste, au format vertical 3:4. Vue de face légèrement plongeante,
> cadrage rapproché.
>
> La scène se déroule sur une surface en marbre blanc poli, parcourue de fines veines grises naturelles. Un fond uni brun
> chocolat chaud occupe le tiers supérieur de l'image, légèrement flou.
>
> Au premier plan, au centre et légèrement décalé vers la droite, se trouve un écrin rond en cuir cognac, avec de fines
> coutures ton sur ton sur son pourtour. Sa base cylindrique repose à plat sur le marbre. Son couvercle circulaire est
> ouvert, relevé presque verticalement vers l'arrière, laissant voir sa doublure en velours noir.
>
> L'intérieur de la base contient uniquement un coussin de velours noir mat, bien visible, entièrement nu et intact.
> L'écrin ne contient aucun objet : aucune montre, aucun cadran, aucun bracelet, aucun bijou, aucune pièce métallique. Le
> velours forme une surface continue et naturelle, sans empreinte ni silhouette de produit.
>
> À l'arrière-plan à droite, un grand sablier vertical en verre transparent et laiton doré patiné. Il possède deux
> plateaux circulaires reliés par de fines colonnes métalliques. Du sable beige clair est visible dans les deux ampoules.
> Son sommet arrive près du bord supérieur de l'image.
>
> À l'arrière-plan à gauche, une large bande de cuir cognac est enroulée à plat en une spirale serrée, dont les couches
> sont bien visibles. Elle est légèrement coupée par le bord gauche du cadrage. Elle ne comporte ni boucle ni accessoire.
>
> La scène contient exactement trois objets : l'écrin ouvert avec son coussin vide, le sablier et le rouleau de cuir. Le
> bas de l'image laisse une zone dégagée de marbre devant l'écrin.
>
> Éclairage chaud et doux venant du haut à gauche, comme une lumière de fin d'après-midi. Ombres délicates vers la
> droite, reflets dorés subtils sur le laiton, grain du cuir et texture du velours réalistes. Mise au point précise sur
> l'écrin, arrière-plan légèrement adouci. Ambiance élégante, sobre et chaleureuse, rendu photographique naturel.
>
> Aucun texte, aucune lettre, aucun chiffre, aucune gravure, aucun logo, aucun filigrane, aucune personne. Aucun objet
> supplémentaire.

Ce qu'il faut en retenir (règle pour toute consigne du studio) : une seule photo décrite du début à la fin ; chaque objet
placé, décrit et dénombré ; ce qui doit rester vide l'est explicitement ; rien de vague ni de contradictoire ; les
interdits regroupés en une phrase finale.
