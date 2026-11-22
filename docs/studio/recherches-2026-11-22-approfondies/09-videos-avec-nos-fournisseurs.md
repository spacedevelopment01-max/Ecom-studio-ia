# Les vidéos courtes de SINA et de l'atelier, avec les fournisseurs accordés

Recherche approfondie du 22 novembre 2026. Aucun appel payant, aucun autre fichier du dépôt modifié.

Point de départ : le rapport du matin (`docs/studio/recherches-2026-11-22/06-videos.md`), qui raisonnait surtout avec
fal. Ce rapport-ci reprend tout avec les fournisseurs accordés par le propriétaire : Kling en direct, Google Vertex
(Veo 3.1 Fast et Lite), Seedance (ByteDance), Alibaba (Wan), Runware en secours, ElevenLabs pour le son.


**Niveaux de preuve :** **officiel** (page du fabricant ou de la plateforme), **étude publiée**, **test indépendant**
(un tiers qui ne vend pas l'outil), **éditeur** (blog d'un vendeur), **avis**, **mon avis** (proposition non vérifiée).
Les prix sont en dollars, comme sur les pages officielles ; je n'ai pas vérifié le taux de change du jour.

**Ce que ce rapport apporte de neuf par rapport au matin :**
- les prix officiels **en direct** de Kling (table des « unités » publiée par Kling), de Google Vertex, de Seedance chez
  BytePlus, d'Alibaba et de Runware ;
- deux pièges trouvés dans les documentations (Veo sur Vertex n'existe qu'aux États-Unis ; Kling 4.0 facture 10
  secondes si on oublie la durée) ;
- ce qui existe déjà dans le code du Studio pour la vidéo (il a déjà son propre moteur de montage, sans Remotion) ;
- le prix d'une vidéo de 15 secondes avec chaque fournisseur accordé, rapporté au budget d'IA de chaque forfait.

---

## 1. Les fournisseurs accordés, un par un

### 1.1 Google Vertex : Veo 3.1, Veo 3.1 Fast et Veo 3.1 Lite

**Les modèles (page officielle, mise à jour le 20 novembre 2026)** :

| Modèle | Identifiant | État | Durées | Formats | Sortie | Image de départ et de fin |
|---|---|---|---|---|---|---|
| Veo 3.1 | `veo-3.1-generate-001` | général (depuis le 17 novembre 2025), arrêt « 4 mai 2027 ou plus tard » | 4, 6 ou 8 s (8 s seulement avec images de référence) | 9:16, 16:9 | 720p, 1080p, 4K ; 24 images par seconde | oui, plus « prolonger une vidéo » et images de référence |
| Veo 3.1 Fast | `veo-3.1-fast-generate-001` | général, même date d'arrêt | 4, 6 ou 8 s | 9:16, 16:9 | 720p, 1080p | oui, plus images de référence |
| Veo 3.1 Lite | `veo-3.1-lite-generate-001` | **aperçu** (sorti le 2 avril 2026) | 4, 6 ou 8 s | 9:16, 16:9 | 720p, 1080p | oui ; **pas d'images de référence** |

Source (**officiel**) : https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate

- **Piège n° 1 : la région.** La page indique pour les trois modèles une seule région : « United States: us-central1 ».
  Aucune région européenne n'est proposée. Les photos des clients partiraient donc aux États-Unis. Preuve : **officiel**,
  même page. Ce point ne contredit pas une règle écrite du propriétaire, mais il diffère d'Alibaba, choisi pour
  garder les données à Francfort : à lui dire avant d'ouvrir Veo aux clients.
- **Contradiction relevée sur la page** : pour Veo 3.1 Lite, le tableau des entrées dit « Image : Not supported » alors
  que les capacités disent « image to video, from first and last frame : Supported ». À vérifier au premier essai.
- **Le format carré (1:1) et le 4:5 n'existent pas chez Veo** : seulement 9:16 et 16:9. Pour une publication carrée, le
  Studio doit recadrer au montage.
- **Les personnes** : le réglage `personGeneration` accepte « allow_adult » (par défaut) ou « disallow » (« Doesn't
  generate people or faces »). Preuve : **officiel**.
  https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-an-image
  **Pour SINA :** envoyer toujours « disallow » quand le client n'a fourni ni photo ni accord écrit : la règle « jamais de
  personne » devient un réglage du fournisseur, en plus du juge.
- **L'accès** : compte Google Cloud, projet, appel `predictLongRunning`, puis interrogation de l'opération par
  `fetchPredictOperation` jusqu'à « done » ; la vidéo arrive dans un dossier Cloud Storage (`storageUri`) ou dans la
  réponse. Aucun rappel automatique n'est décrit : il faut interroger. 1 à 4 vidéos par demande (`sampleCount`). Quota
  affiché : 50 demandes par minute et par modèle. Preuve : **officiel**, même page.
- **Mention imposée** : les trois modèles écrivent les « Content Credentials (C2PA) » dans le fichier (certificat
  d'origine lisible par TikTok et Meta). Google annonce aussi un filigrane invisible SynthID dans chaque image des vidéos
  Veo ; je ne l'ai lu que dans des articles et une page d'aide de Gemini, pas sur la page de Vertex. Preuve : **officiel**
  pour C2PA ; **non vérifié** sur Vertex pour SynthID.
- **Droits et garantie** : la page des services couverts par la garantie de Google contre les plaintes pour droits
  d'auteur cite « Veo » pour les « generally available versions » seulement. Veo 3.1 et 3.1 Fast sont couverts ; **Veo
  3.1 Lite, en aperçu, ne l'est pas**. Preuve : **officiel**. https://cloud.google.com/terms/generative-ai-indemnified-services

**Prix officiels sur Vertex** (en dollars, « par unité » ; l'unité est la seconde de vidéo produite, comme l'indiquent
les autres pages de Google ; la page des prix elle-même écrit seulement « / 1 count ») :

| Modèle | 720p sans son | 720p avec son | 1080p sans son | 1080p avec son | 4K sans son | 4K avec son |
|---|---|---|---|---|---|---|
| Veo 3.1 | 0,20 | 0,40 | 0,20 | 0,40 | 0,40 | 0,60 |
| Veo 3.1 Fast | 0,08 | 0,10 | 0,10 | 0,12 | 0,25 | 0,30 |
| Veo 3.1 Lite | 0,03 | 0,05 | 0,05 | 0,08 | — | — |

Source (**officiel**, lue le 22 novembre 2026) : https://cloud.google.com/vertex-ai/generative-ai/pricing

- Le prix de Veo 3.1 Lite sur Vertex est **le même que chez fal** (0,03 $ en 720p sans son) : le direct ne fait rien
  gagner sur Lite, mais il retire un intermédiaire. Veo 3.1 Fast sans son en 720p coûte 0,08 $.
- **Ce qui existe dans le code** (`src/lib/ai/media-models.ts`) : l'adaptateur `veo` appelle encore les identifiants
  « preview » (`veo-3.1-generate-preview`, `veo-3.1-fast-generate-preview`, `veo-3.1-lite-generate-preview`) de l'API
  Gemini, et Veo 3 en défaut principal. Les identifiants de Vertex sont les `-001` ci-dessus, et l'appel se fait par
  `predictLongRunning` : l'adaptateur est à refaire pour Vertex.

### 1.2 Kling en direct (Kuaishou)

Kling publie sa documentation en texte lisible : https://kling.ai/document-api/llms.txt. Tout ce qui suit vient de là
(**officiel**).

**Les modèles (carte des capacités, mise à jour le 20 octobre 2026, et journal des nouveautés)** :

| Modèle | Identifiant | Durées | Résolutions | Formats | Image de départ / de fin |
|---|---|---|---|---|---|
| Kling 4.0 | `kling-4.0` (accès par programme depuis le 28 octobre 2026) | 3 à 30 s | 720p, 1080p, 4K (4K et HDR depuis le 19 novembre 2026) | 21:9, 16:9, 1:1, 9:16, 4:3, 3:4, adaptatif | début, milieu et fin, jusqu'à 10 images clés |
| Kling 4.0 Flash | `kling-4.0-flash` (depuis le 4 novembre 2026) | 3 à 20 s | 720p | mêmes formats | image de départ seulement |
| Kling 3.0 Turbo | `kling-3.0-turbo` | 3 à 15 s | 720p, 1080p | 16:9, 1:1, 9:16 | image de départ seulement |
| Kling 3.0 | `kling-v3` | 3 à 15 s | 720p, 1080p, 4K | 16:9, 1:1, 9:16 | début et fin |
| Kling 2.6 | `kling-v2-6` | 5 ou 10 s | 720p, 1080p | 16:9, 1:1, 9:16 | début et fin en 1080p sans son |
| Kling 2.5 Turbo | `kling-v2-5-turbo` | 5 ou 10 s | 720p, 1080p | 16:9, 1:1, 9:16 | début et fin en 1080p |

Sources : https://kling.ai/document-api/guides/capability-map/video.md ; https://kling.ai/document-api/updates/api.md

**Prix officiels en direct** (Kling compte en « unités » ; la page donne l'équivalent en dollars) :

| Modèle | 720p | 1080p | 4K |
|---|---|---|---|
| Kling 4.0, sans vidéo d'entrée (la page ne fait pas de prix à part pour le son) | 0,157 $/s | 0,235 $/s | 0,549 $/s |
| Kling 4.0 Flash, sans vidéo d'entrée | 0,094 $/s | — | — |
| Kling 3.0 Turbo, avec son | 0,112 $/s | 0,14 $/s | — |
| Kling 3.0, sans son | 0,084 $/s | 0,112 $/s | 0,42 $/s |
| Kling 3.0, avec son | 0,126 $/s | 0,168 $/s | 0,42 $/s |
| Kling 2.6, sans son | 0,042 $/s | 0,07 $/s | — |
| Kling 2.5 Turbo, sans son | 0,042 $/s | 0,07 $/s | — |
| Kling, bruitage à partir d'une vidéo (« Video to Audio ») | 0,035 $ par demande | | |

Source : https://kling.ai/document-api/pricing/base/video.md

- L'unité vaut 0,14 $ pour Kling 3.0 et 2.x (0,6 unité = 0,084 $), mais 0,157 $ pour Kling 4.0 (1 unité = 0,157 $). Les
  pages ne l'expliquent pas. Le prix des paquets d'unités (Basic, Pro, General, Flagship) n'est visible que sur la page
  d'achat, qui ne s'affiche pas sans navigateur : **non vérifié**. Des tiers parlent de 0,14 $ l'unité au prix normal et
  0,126 $ en gros volume, et d'une validité de 180 jours (**non vérifié** chez Kling).
- **Kling 2.5 Turbo et 2.6 à 0,042 $/s en 720p sans son** sont aussi bon marché que Veo 3.1 Lite ou Wan « flash », avec
  début et fin en 1080p (0,07 $/s). C'est le chemin le moins cher pour l'image de départ ET de fin.
- **Piège n° 2 : la durée par défaut de Kling 4.0.** « When this parameter is omitted and no explicit duration is
  identified in the prompt, the default is 10 seconds », et c'est cette durée qui est facturée. Le Studio doit toujours
  envoyer `settings.duration`. Source : https://kling.ai/document-api/api/video/4-0/image-to-video.md
- **Filigrane** : aucun par défaut (`watermark_info.enabled` vaut « false » ; une version filigranée peut être demandée en
  plus). **Les fichiers ne sont gardés que 30 jours** chez Kling : le Studio doit les copier chez lui tout de suite. Même
  source.
- **Mouvements de caméra** : pour Kling 4.0, ils se décrivent dans la demande écrite (« Use the prompt to describe …
  camera movements »). Le réglage `camera_control` des anciens modèles n'est pas listé pour 4.0 (lu sur la page).
- **Accès** : clé créée dans la console (https://kling.ai/dev/api-key), envoyée en « Authorization: Bearer » ; adresse
  `https://api-singapore.klingai.com` (Singapour, aucune région européenne indiquée). Achat de paquets d'unités ; un
  « Business Inquiry » pour les gros volumes. Source : https://kling.ai/document-api/guides/get-started/quick-start.md
- **File d'attente** : la limite porte sur le nombre de tâches en cours en même temps, selon le paquet acheté ; au-delà,
  erreur 1303, à reprendre avec un délai qui grandit. Aucune limite de demandes par seconde. Source :
  https://kling.ai/document-api/api/get-started/concurrency-rules.md
- **Rappel quand c'est fini** : `options.callback_url`, avec signature des rappels par un secret séparé de la clé.
  Source : https://kling.ai/document-api/api/get-started/callbacks.md
- **Conditions du service payant** (en vigueur le 21 avril 2026,
  https://kling.ai/document-api/guides/protocols/paid-service.md) :
  - « You use of the AI-generated content for commercial purposes is not restricted » (6.4) ; les droits sur la
    création vous reviennent si vous avez les droits sur ce que vous envoyez (6.3) ;
  - Kling n'entraîne pas ses modèles sur nos données (5.1 et 5.5) et garde les demandes et réponses 30 jours (5.5) ;
  - **à vérifier avec le propriétaire** : l'article 10.3 interdit de « granting, borrowing, renting, transferring,
    selling or otherwise licensing the use of the User Account and the API Services … to others » sans accord écrit, et
    l'article 3.8 limite la clé à « your Client Application ». Le Studio qui appelle Kling pour ses clients, dans son
    propre outil, semble entrer dans « Client Application » (défini en 1.4 comme le site ou l'application que vous
    exploitez), mais l'atelier où le client choisit lui-même « Kling » ressemble davantage à une revente d'accès. La
    recherche du 18 novembre l'avait déjà signalé comme « pas encore vérifié ». Preuve : **officiel** ; la lecture
    juridique est **mon avis**.
- **Ce que Kling vend en plus pour le commerce** : « Goods Studio » fait seul une publicité produit de 15 à 60 secondes
  à partir de photos, d'un titre et d'une description (0,238 $/s en 720p, 0,28 $/s en 1080p) ; « Video Commerce » ajoute
  un présentateur créé par IA (contraire à la règle « aucune personne inventée »). Goods Studio coûte deux fois plus que
  Kling 3.0 et on n'y contrôle ni les plans, ni le texte, ni la fidélité. Sources :
  https://kling.ai/document-api/api/ecommerce-replication/goods-studio.md ;
  https://kling.ai/document-api/pricing/solutions/ecommerce.md
- **Ce qui existe dans le code** : seulement Kling par fal (`fal-ai/kling-video/v2.1` et `v3`). Aucun adaptateur Kling en
  direct.

### 1.3 Seedance (ByteDance), par BytePlus ModelArk

**Par quel accès officiel.** Hors de Chine, ByteDance vend Seedance par **BytePlus ModelArk** (Volcengine est l'offre
pour la Chine). Les documents de BytePlus nomment les modèles « Dreamina Seedance ». Sources (**officiel**) :
https://docs.byteplus.com/en/docs/modelark/model-list ; https://docs.byteplus.com/en/docs/modelark/model-pricing (mise à
jour du 19 novembre 2026). Ces pages se chargent par un programme dans le navigateur ; j'en ai lu le texte complet
caché dans la page.

**Les modèles et leurs capacités :**

| Modèle | Identifiant | Résolutions | Durées | Image de départ / de fin |
|---|---|---|---|---|
| Seedance 2.5 | `dreamina-seedance-2-5-260628` | 480p, 720p, 1080p (10 bits), 4K | 4 à 30 s | oui, les deux |
| Seedance 2.5 Flash | `dreamina-seedance-2-5-flash-261115` | 480p, 720p | 4 à 30 s | oui |
| Seedance 2.0 | `dreamina-seedance-2-0-260128` | 480p, 720p, 1080p, 4K | 4 à 15 s | oui |
| Seedance 2.0 Fast | `dreamina-seedance-2-0-fast-260128` | 480p, 720p | 4 à 15 s | oui |
| Seedance 2.0 Mini | `dreamina-seedance-2-0-mini-260615` | 480p, 720p | 4 à 15 s | oui |

Tous en 24 images par seconde, avec son créé par le modèle (`generate_audio`, activé par défaut : à couper si la
musique vient d'ElevenLabs). Le tableau des capacités dit « Yes » pour le texte, l'image de départ, le départ et la fin,
les images de référence, la retouche et le prolongement, pour toute la série 2.0 et 2.5.

**Prix officiels.** BytePlus compte en jetons : `(durée de la vidéo d'entrée + durée produite) × largeur × hauteur ×
images par seconde / 1024`, multiplié par le prix du million de jetons. Ses propres exemples (5 secondes en 16:9, sans
vidéo d'entrée ; le 9:16 a le même nombre de points, donc le même prix) :

| Modèle | 480p | 720p | 1080p | 4K |
|---|---|---|---|---|
| Seedance 2.5 | 0,103 $/s | 0,231 $/s | 0,569 $/s | 0,914 $/s |
| Seedance 2.5 Flash | 0,07 $/s | 0,15 $/s | — | — |
| Seedance 2.0 | 0,07 $/s | 0,15 $/s | 0,37 $/s | 0,78 $/s |
| Seedance 2.0 Fast | 0,06 $/s | 0,12 $/s | — | — |
| Seedance 2.0 Mini | 0,04 $/s | 0,08 $/s | — | — |

- **Seulement les vidéos réussies sont payées** : « No fee is charged if generation fails due to reasons such as content
  moderation ». Preuve : **officiel**.
- **Comparé à fal** (rapport du matin : Seedance 2.5 à 0,47 $/s en 720p chez fal), le direct coûte **deux fois moins**
  (0,231 $/s), ce que disait déjà la recherche du 18 novembre. Seedance 2.0 Mini en 720p (0,08 $/s) est au niveau de Veo
  3.1 Fast sans son.
- Un mode « Draft » (aperçu en 480p, au prix du 480p) existe pour Seedance 2.5 : on paie un brouillon bon marché, puis
  la version finale à partir du brouillon validé. Preuve : **officiel**. **Pour SINA :** c'est exactement la règle « le
  plus petit essai avant toute dépense » : brouillon en 480p (0,10 $/s), jugé, puis seulement la version finale.

**Accès, file d'attente, rappel :**
- Clé d'API par région ; tâche créée, puis interrogée (« Retrieve a video generation task ») ; un `callback_url` prévient
  quand l'état change ; une tâche expire après 48 heures par défaut ; l'identifiant d'une tâche vaut 7 jours.
  Source : https://docs.byteplus.com/en/docs/modelark/create-video-generation-task-api
- **Limites** : compte d'entreprise 600 demandes par minute et 10 vidéos en même temps ; compte individuel 180 et 3.
  **Pour SINA :** faire vérifier le compte comme entreprise, sinon 3 vidéos à la fois pour tous les clients.
- **Région** : deux régions existent (Johor en Asie, Dublin en Europe), mais **la région européenne ne propose que des
  modèles de texte et d'images, pas Seedance**. Les photos partent donc en Asie. Et « some requests may be routed to
  inference resources in other regions ». Source : https://docs.byteplus.com/en/docs/modelark/region-availability
- Le paramètre `safety_identifier` sert à donner un identifiant (haché) de l'utilisateur final, pour que BytePlus repère
  un client qui abuse. **Pour SINA :** l'envoyer à chaque appel, haché à partir du compte du client.

**Filigrane et mention IA :** `watermark` vaut « false » par défaut ; à « true », la mention « AI Generated » s'affiche en
bas à droite. Rien n'est imposé à l'écran par l'API, et la partie vidéo des conditions (ci-dessous) n'impose pas de mention
visible ; la mention reste due quand la loi l'exige (partie 6). Preuve : **officiel**. Je n'ai pas trouvé de mention de C2PA chez
BytePlus : **non vérifié**.

**Les personnes :** « Dreamina Seedance 2.5 series and Dreamina Seedance 2.0 series models do not support directly
uploading reference images or videos that contain real human faces. » Il faut passer par des personnages tout faits,
par des visages déjà créés par leurs modèles, ou par des « authorized real-person assets ». Source :
https://docs.byteplus.com/en/docs/modelark/seedance-portrait-asset-guide. **Pour SINA :** une photo de produit tenue par
une main du client peut être refusée par la modération ; il faut le savoir avant de promettre.

**Les conditions qui comptent pour le Studio** (conditions particulières des services de modèles, partie 4 « Specific
Terms for BytePlus Video Generation Model Service »,
https://docs.byteplus.com/en/docs/legal/docs-service-specific-terms) :
- Le Studio est un « Platform Customer » : il « integrates BytePlus video generation model APIs into its own platform and
  makes them available to external enterprises or creators ».
- Il doit avoir au minimum : la vérification d'identité de ses clients, une procédure en cas d'incident, une gestion des
  manquements par paliers (traçabilité du contenu, avertissement, retrait, action sur le compte) « with complete
  records », et une vérification des droits sur ce que le client envoie, « including real-person imagery ».
- Interdits sans accord écrit : revendre l'accès, ou l'intégrer dans un outil de création ouvert au public (« UGC
  platforms, including AI content creation tools ») ; sur une plateforme qui regroupe plusieurs modèles, « end users may
  only generate video content for their own use ». C'est l'accord écrit que le propriétaire a reçu le 21 novembre 2026.
- Sanctions : suspension et pénalité de 10 % des commandes ; 20 % de l'engagement minimum en cas de revente non
  autorisée.
- Garantie contre les plaintes pour droits d'auteur sur les créations (article 3.1), sauf en aperçu ou si les filtres
  de sécurité sont contournés.
- « The BytePlus Model Services are not available in the United States. »

**Ce qu'il faut donc pour ouvrir Seedance dans l'atelier** (mon avis, sur la base du texte) : un journal de chaque
création (qui, quoi, quand, quel modèle), un bouton de signalement et de retrait, la confirmation par le client qu'il a
les droits sur sa photo, et l'envoi du `safety_identifier`. Une partie existe déjà dans le Studio (les reçus durables
de `video-v2/receipts.ts`, les comptes et les abonnements) ; la vérification d'identité des clients n'existe pas.
[À compléter : le texte exact de l'autorisation de ByteDance, pour savoir si elle remplace ou complète ces obligations.]

**Ce qui existe dans le code** : aucun adaptateur Seedance (ni BytePlus ni fal). Le mot n'apparaît que dans le catalogue
Higgsfield (`src/lib/ai/higgsfield/catalog.ts`).

### 1.4 Alibaba Cloud Model Studio : Wan

**Les modèles utiles en novembre 2026** (pages officielles, mises à jour les 12 et 20 novembre 2026) :
- **Wan 3.0** (`wan3.0-video`, et `wan3.0-video-prime`, plus rapide) : texte, image de départ, **départ et fin**
  (`first_frame` et `last_frame`, « strictly used as the first/last frame »), jusqu'à 10 images de référence ; 2 à 30
  secondes ; 480P, 720P ou 1080P ; 30 images par seconde ; formats 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 ou adaptatif ; son
  activé par défaut (`audio: false` pour le couper) ; filigrane **désactivé par défaut**. **Encore en aperçu.** Source
  (**officiel**) : https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference
- **Wan 2.7** image vers vidéo (`wan2.7-i2v`), **Wan 2.6** (`wan2.6-i2v`, `wan2.6-i2v-flash`) et, pour le départ et la fin
  à petit prix, **Wan 2.2 « kf2v-flash »** (`wan2.2-kf2v-flash`). Source : https://www.alibabacloud.com/help/en/model-studio/model-pricing

**Prix officiels** (sortie seulement, à la seconde réussie ; « failed requests incur no fees ») :

| Modèle | Région | 480P | 720P | 1080P |
|---|---|---|---|---|
| Wan 3.0 | Singapour | 0,05 $ | 0,10 $ | 0,20 $ |
| Wan 3.0 | Francfort (portée « Global ») | 0,041 $ | 0,083 $ | 0,165 $ |
| Wan 3.0 Prime | Singapour | 0,068 $ | 0,14 $ | 0,28 $ |
| Wan 2.7 image vers vidéo, avec son | Singapour | — | 0,10 $ | 0,15 $ |
| Wan 2.6 image vers vidéo, avec son | Francfort (portée « Global ») | — | 0,086 $ | 0,143 $ |
| Wan 2.2 départ et fin « flash » | Singapour | 0,015 $ | 0,036 $ | 0,07 $ |
| Wan 2.6 « flash » (rapport du matin) | Singapour | — | 0,05 $ | 0,075 $ |

- Pour Wan 3.0, la page écrit « Original … (30% off for a limited time) » : une remise de 30 % est en cours, sans date de
  fin lue. Je compte le prix « Original ».
- Le code du Studio note pour Wan 2.6 « flash » **0,0375 $/s en 1080P sans son, vérifié par un essai réel le 15 octobre
  2026** (`src/lib/ai/media-models.ts`) : c'est le seul prix vidéo du Studio confirmé par une vraie facture.

**Un point à signaler au propriétaire : « données gardées en Europe » n'est vrai qu'à moitié.**
- À Francfort, deux portées existent : « Global (any available node, including Chinese mainland and overseas) » et « EU
  (inference within the region) ». Source (**officiel**) :
  https://www.alibabacloud.com/help/en/model-studio/germany-frankfurt-global
- Dans la table des prix, **les modèles vidéo de Francfort (Wan 3.0 et Wan 2.6) ne sont listés qu'en portée « Global »**.
  Les fichiers restent stockés à Francfort (« Your static data always remains in the selected region »), mais le calcul
  de la vidéo peut se faire ailleurs, y compris en Chine. Source : https://www.alibabacloud.com/help/en/model-studio/regions
- **Dans le code**, l'adaptateur Alibaba ne connaît que Singapour, la Virginie et Pékin (`src/lib/ai/alibaba.ts`) ; une
  adresse personnalisée en `aliyuncs.com` est acceptée, donc l'adresse de Francfort
  (`{WorkspaceId}.eu-central-1.maas.aliyuncs.com`) pourrait y être saisie, mais ce n'est pas fait. Et l'ancien domaine
  `dashscope-intl.aliyuncs.com` « will no longer support new features after September 30, 2026 » : les nouveaux modèles
  peuvent ne plus y arriver.

**Accès** : clé par région ; en-tête `X-DashScope-Async: enable` ; création de tâche puis interrogation (« typically 1-5
minutes ») ; l'identifiant de tâche vaut 24 heures. Aucun rappel automatique lu pour la vidéo. Source : page Wan 3.0
ci-dessus.

**Droits, mention IA** : je n'ai pas relu aujourd'hui les conditions d'Alibaba sur l'usage commercial des vidéos (la
recherche du 18 novembre les avait lues). Le filigrane est facultatif. **Non vérifié** : un marquage C2PA ou invisible
chez Alibaba.

### 1.5 Runware, le secours

**Ce qu'il propose.** Une seule adresse pour tous les modèles (`taskType: "videoInference"`), avec, parmi les
fabricants accordés : Veo 3.1, 3.1 Fast et 3.1 Lite ; Kling 2.5 Turbo, 2.6, 3.0 (standard, pro, 4K, Turbo, Omni), O1,
4.0 et 4.0 Flash ; Seedance 1.0, 2.0, 2.0 Fast, 2.0 Mini, 2.5 et 2.5 Flash ; Wan 2.5 à 3.0. Tous indiqués « live » dans
la liste officielle lue le 22 novembre 2026. Source (**officiel**) : https://runware.ai/docs/models/index.json

**Ses prix officiels** (lus dans la fiche de chaque modèle, `https://runware.ai/docs/models/<modèle>/schema.json`,
champ « x-pricing ») comparés au direct :

| Modèle | Runware | En direct | Écart |
|---|---|---|---|
| Veo 3.1 Lite, 720p sans son | 0,03 $/s | 0,03 $/s (Vertex) | aucun |
| Veo 3.1 Fast, 720p sans son | 0,10 $/s | 0,08 $/s (Vertex) | Runware +25 % |
| Veo 3.1 Fast, avec son | 0,15 $/s | 0,10 à 0,12 $/s | Runware +25 à 50 % |
| Kling 2.5 Turbo, 720p | 0,042 $/s | 0,042 $/s | aucun |
| Kling 3.0, 720p sans son | 0,084 $/s | 0,084 $/s | aucun |
| Kling 3.0 Turbo, 720p | 0,112 $/s | 0,112 $/s | aucun |
| Kling 4.0, 720p | 0,157 $/s | 0,157 $/s | aucun |
| Kling 4.0 Flash, 720p | 0,094 $/s | 0,094 $/s | aucun |
| Seedance 2.0 Mini, 720p | 0,081 $/s | 0,08 $/s | presque aucun |
| Seedance 2.0 Fast, 720p | 0,13 $/s | 0,12 $/s | +8 % |
| Seedance 2.5, 720p | 0,23 $/s | 0,231 $/s | aucun |
| Wan 3.0, 720p | 0,10 $/s | 0,10 $/s (Singapour) | aucun |
| **Wan 2.6 « flash », 720p sans son** | **0,025 $/s** | 0,05 $/s avec son (Alibaba) | le moins cher de tous |

- Runware publie aussi le **coût mesuré d'essais réels** (« examples ») : par exemple Veo 3.1 Lite, départ et fin, 720p, 4
  secondes : 0,20 $ en 47 secondes d'attente ; Kling 3.0, départ et fin, 8 secondes : 0,672 $ en 78 secondes ; Wan 3.0,
  départ et fin, 1080p, 8 secondes : 1,62 $ en 3 minutes 12. Preuve : **officiel** (essais de Runware).
- **Accès** : clé d'API ; `"deliveryMethod": "async"` puis `getResponse` pour interroger, ou un `webhookURL` qui reçoit
  le résultat « with no polling at all » ; `includeCost: true` renvoie le coût exact de chaque demande ; les fichiers
  restent 7 jours (réglable par `ttl`) ; « Zero Data Retention » possible pour les comptes d'entreprise. Les modèles des
  fabricants gardent leurs propres limites (« Their rate limits and capacity constraints affect our service »). Source
  (**officiel**) : https://runware.ai/docs/llms.txt
- 2 $ d'essai offerts à l'inscription avec une adresse professionnelle, sans carte. Source : https://runware.ai/llms.txt
- **Pour SINA :** Runware n'est pas plus cher que le direct pour Kling, Veo Lite, Seedance et Wan. Il sert de secours
  quand un fabricant est en panne, et il donne le coût exact de chaque appel, utile pour le compteur du budget. Il ne
  remplace pas le direct pour Seedance : l'accord de ByteDance porte sur l'API de ByteDance, et je n'ai pas vérifié s'il
  couvre un passage par Runware. [À compléter : demander à ByteDance ou relire l'autorisation.]
- **Ce qui existe dans le code** : aucun adaptateur Runware.

### 1.6 ElevenLabs pour le son

Voir la partie 5 (musique, voix, bruitages, droits).

---

## 2. La qualité comparée, et surtout la fidélité au produit

### 2.1 Le classement indépendant, relu pour nos fournisseurs

Artificial Analysis, animation d'une image **avec son** (« AA-Video-I2V v2.1 »), lu le 22 novembre 2026, date de mise
à jour non affichée. Des personnes comparent deux vidéos à l'aveugle ; Kling 3.0 1080p Pro sert de point zéro (1000).
Source (**test indépendant**) : https://artificialanalysis.ai/video/leaderboard/image-to-video

| Rang | Modèle accordé | Score | Prix affiché par minute |
|---|---|---|---|
| 1 | Seedance 2.5 | 1162 ± 14 | 34,12 $ |
| 4 | Seedance 2.0 | 1141 ± 14 | 22,45 $ |
| 12 | Wan 3.0 | 1110 ± 14 | 12,00 $ |
| 23 | Kling 3.0 Omni 1080p Pro | 1005 ± 15 | 8,40 $ |
| 24 | Kling 3.0 1080p Pro | 1000 (référence) | 10,08 $ |
| 28 | Veo 3.1 | 955 | — |
| 29 | Veo 3.1 Fast | 936 | — |
| 30 | Veo 3.1 Lite | 933 | — |

Absents du classement : Kling 4.0 et 4.0 Flash, Seedance 2.5 Flash, 2.0 Fast et 2.0 Mini, Wan 2.6 et 2.7. Je n'ai pas
trouvé l'adresse du classement sans son (le nôtre, puisque la musique vient d'ElevenLabs).

**Ce que ça dit pour nous :** parmi nos fournisseurs, Seedance est devant, Wan 3.0 ensuite, Kling 3.0 et Veo 3.1 loin
derrière (plus de 150 points d'écart entre Seedance 2.5 et Veo 3.1 Lite, bien au-delà de la marge d'erreur). Mais ce
score mesure le goût d'ensemble, pas la fidélité au produit (rappel du rapport du matin).

### 2.2 Les essais publiés sur la fidélité au produit

1. **Masonry, « same-brief », mis à jour le 17 novembre 2026** : un même mug noir avec le mot « NORTH » en blanc, demandé
   à six modèles, **un seul essai par modèle, en texte vers vidéo (sans photo du produit)**, noté par une seule personne
   qui savait quel modèle avait fait quoi. Résultats sur le logo : MiniMax H3 Max propre (86/100) ; **Wan 3.0 propre mais
   avec un petit texte inventé dessous** (81) ; **Seedance 2.5 juste mais minuscule** (78) ; **Veo 3.1 Fast redessine le
   logo avec une vague** (71, « A brand team would reject this clip ») ; PixVerse se brouille à la fin (68) ; **Kling O3
   Standard met le logo deux fois** (59). « Three of six clips damaged a simple five-letter wordmark. » Preuve :
   **éditeur** (Masonry revend ces modèles, l'auteur est cofondateur, sans mention de conflit), un seul essai, sans
   photo de départ. https://masonry.so/blog/best-ai-video-generator-2025-comparison
2. **« Faithful Where You Look » (arXiv, 18 octobre 2026)** : quatre modèles de trois fabricants (non nommés sur la page
   lue), 48 photos de devantures. Sur l'enseigne elle-même, les modèles sont presque parfaits (0,90 à 0,94) ; mais **36 à
   54 % des textes visibles ailleurs dans l'image n'existent pas sur la photo d'origine**, alors que chaque demande
   interdisait tout nouveau texte. Les mesures habituelles (VBench-I2V) ne le voient pas. Preuve : **étude publiée**
   (prépublication, un seul auteur, lu le résumé seulement). https://arxiv.org/abs/2611.00079
3. **ConsID-Gen (CVPR 2026)** : publié comme article de conférence, il décrit le cas exact du commerce (« a single catalog
   photo must be turned into multiple … videos … while preserving the exact appearance ») et montre que donner
   **plusieurs vues du même produit** réduit la dérive. Preuve : **étude publiée**, résumé lu seulement (le matin aussi).
   https://openaccess.thecvf.com/content/CVPR2026/papers/Wu_ConsID-Gen_View-Consistent_and_Identity-Preserving_Image-to-Video_Generation_CVPR_2026_paper.pdf

**Ce que SINA doit en tirer :**
- aucun modèle accordé n'est sûr pour une étiquette, d'après le seul essai publié ; le choix se fait sur notre propre
  essai, avec la vraie photo en image de départ (Masonry n'en avait pas) ;
- **le juge doit regarder toute l'image, pas seulement l'étiquette** : le défaut le plus fréquent est un texte inventé à
  côté du produit (étude 2) ;
- donner deux ou trois photos du produit sous des angles différents quand le modèle accepte des images de référence
  (Veo 3.1 et 3.1 Fast « asset images », Kling 4.0 jusqu'à 10 images, Seedance, Wan 3.0 jusqu'à 10).

---

## 3. Garder le produit intact

### 3.1 Ce que les fournisseurs accordés offrent pour cela (pages officielles)

| Moyen | Veo 3.1 (Vertex) | Kling | Seedance | Wan |
|---|---|---|---|---|
| Image de départ ET de fin | oui, les trois modèles (`image` + `lastFrame`) | 4.0 (début, milieu, fin, jusqu'à 10 images clés), 3.0, 2.6 et 2.5 Turbo en 1080p ; **pas** 4.0 Flash ni 3.0 Turbo | oui, toute la série 2.0 et 2.5 | Wan 3.0 (« strictly used as the first/last frame »), Wan 2.2 « kf2v » |
| Photos du produit en référence | Veo 3.1 et Fast (« asset » : objet, décor ou personnage ; 8 s seulement) ; pas Lite | 4.0 et 4.0 Flash, jusqu'à 10 images | oui | Wan 3.0, jusqu'à 10 images |
| Caméra fixe | dans la demande écrite | dans la demande écrite (4.0) | `camera_fixed` seulement pour Seedance 1.0, et « the actual result is not guaranteed » | dans la demande écrite |
| Interdire les personnes | `personGeneration: "disallow"` | non trouvé | les visages réels sont refusés à l'entrée | non trouvé |
| Récupérer la dernière image | — | — | `return_last_frame` (sans filigrane) | — |

Sources : pages citées en partie 1.

**L'astuce de la dernière image (Seedance)** : en demandant la dernière image d'un plan, on peut la comparer
directement à la photo du produit, et s'en servir comme image de départ du plan suivant pour que deux plans se
raccordent. Preuve : **officiel** pour la fonction ; l'usage est **mon avis**.

### 3.2 La méthode, dans l'ordre (mon avis, construit sur les pages lues et le rapport du matin)

1. **Le plan sûr d'abord** : la vraie photo détourée posée en calque fixe, avec ombre de contact, sur un décor créé par
   OpenAI ; le mouvement vient de la caméra au montage (avancée, recul, panoramique). Rien ne peut déformer le produit.
   **Cela existe déjà dans le code** : `packshotDoc` (`src/lib/video-v2/doc.ts`) pose le produit détouré avec
   `contactShadow`, et le moteur connaît huit mouvements de caméra (`CameraMove` dans `src/lib/video-v2/types.ts` :
   fixe, avancée, recul, panoramiques, bascule, orbite, caméra à l'épaule).
2. **Un seul plan animé par IA**, quand il apporte quelque chose (vapeur, liquide, lumière qui passe, tissu) : image de
   départ = la photo du produit dans sa scène ; **image de fin = la même photo** ou la vraie photo sous un autre angle ;
   2 ou 3 photos en référence si le modèle l'accepte ; demande écrite « caméra lente, le produit ne bouge pas, aucun
   nouveau texte » ; durée courte (4 à 6 s).
3. **Contrôle mécanique, gratuit, image par image** : une image sur cinq (ou chaque image) est comparée au calque du
   produit (forme, couleurs dominantes) ; tout écart arrête le plan. Le code actuel ne regarde que trois images par plan
   (début, milieu, fin : `src/lib/video-v2/quality.ts`).
4. **Le juge visuel** (le modèle le plus fort, comme pour les images) sur les plans qui passent : il décrit d'abord ce
   qu'il voit, cherche **tout texte nouveau dans toute l'image** (étude « Faithful Where You Look »), le produit, le
   logo, les mains et les visages, puis note ; il ne garde que 8 sur 10 ou plus. Le schéma de relecture du code a déjà
   `sameProduct`, `productAltered`, `textCorrect` et `foreignBrands`.
5. **Un plan refusé est remplacé par le plan sûr** (étape 1), jamais montré, jamais facturé au client ; c'est déjà la
   logique du « plan de remplacement » dans `src/lib/video-v2/engine.ts`.

**Ce qu'aucune source ne prouve encore** : qu'un modèle accordé garde une étiquette mieux qu'un autre. Il faut notre
essai (point 3 de la liste finale).

---

## 4. Le montage « niveau CapCut »

### 4.1 Remotion, ou le moteur que le Studio a déjà ?

- **Remotion** : gratuit pour « individuals and companies up to three people » ; au-delà, « Remotion for Automators » à
  0,01 $ par rendu avec 100 $ par mois au minimum, prévu pour les « automated video products, such as video editors,
  prompt-to-video apps » ; « Enterprise » à partir de 500 $ par mois. Source (**officiel**) :
  https://www.remotion.dev/license. Rendu sur AWS Lambda : 0,017 $ pour une vidéo d'une minute dans l'exemple officiel
  (région de la côte est des États-Unis). Source : https://www.remotion.dev/docs/lambda/cost-example
- **Le Studio a déjà son propre moteur de montage** (`src/lib/video-v2/render.ts`, `audio.ts`, `final-check.ts`) : il
  dessine chaque image avec le moteur de calques des publicités (`ad-doc`), lit les plans vidéo avec ffmpeg, fait les
  transitions, les sous-titres, la mention « générée par IA », le mixage audio avec la musique baissée sous la voix, la
  mesure du volume, et contrôle le fichier final sans IA (contraste, carte de fin visible 2,5 à 4 s, format, son).
  L'inventaire du code le classe « à garder » pour le rendu, l'audio et les contrôles.
- **Ce qui manque à ce moteur** (inventaire, `docs/studio/inventaire/4-communication.md`) : les sous-titres animés mot à
  mot, les coupes calées sur le rythme de la musique, les effets.

**Ma décision proposée :** ne pas ajouter Remotion. La règle du propriétaire est « une seule façon de faire chaque
chose », et le moteur existant fait déjà le rendu au niveau d'une image près, chez nous, sans licence. Remotion aurait
un sens seulement si on voulait le lecteur interactif dans le navigateur (aperçu modifiable). On ajoute au moteur
existant les trois pièces qui manquent (ci-dessous). Si le Studio dépasse trois personnes, Remotion coûterait au moins
100 $ par mois, ce qui pèse contre lui.

### 4.2 Les sous-titres animés, sans transcription

- SINA écrit elle-même le texte de la voix. Avec ElevenLabs, l'adresse `POST /v1/text-to-speech/{voice_id}/with-timestamps`
  renvoie **l'heure de début et de fin de chaque lettre** (`character_start_times_seconds`, `character_end_times_seconds`),
  ce qui donne le minutage mot à mot sans transcrire. Source (**officiel**) :
  https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- Pour une voix qui ne vient pas d'ElevenLabs (celle d'OpenAI, utilisée aujourd'hui par le code), Scribe donne le
  début et la fin de chaque mot, le français est dans le niveau « Excellent (≤ 5% WER) », 0,20 $ de l'heure (moins d'un
  dixième de centime pour 15 secondes). Sources (**officiel**) : https://elevenlabs.io/docs/capabilities/speech-to-text ;
  https://elevenlabs.io/pricing/api
- Le code actuel le dit lui-même : les sous-titres utilisent « la durée mesurée des phrases ; groupes proportionnels,
  sans prétendre fournir un alignement mot à mot » (`src/lib/video-v2/voice.ts`).
- Règles d'affichage (rapport du matin, guide officiel de TikTok) : 5 à 10 mots par seconde au plus ; 2 à 4 mots par
  page ; mot prononcé surligné aux couleurs de la marque.

### 4.3 Rythme, texte, carte de fin, zones interdites

- **Meta, publicités Reels (officiel)** : format plein écran 9:16 ; moins de 90 secondes ; **« the bottom 35% » de
  l'image doit rester libre de texte, de logos et d'éléments importants** ; le son est conseillé ; aucune « copyrighted
  music … from a third party ». Source : https://developers.facebook.com/documentation/ads-commerce/marketing-api/creative/reels-ads
- **TikTok (officiel, lu ce matin)** : produit en action dans les 2 premières secondes, message principal dans les 3
  premières, aucune longue ouverture ni animation de logo, coupes rapides, chaque point sous 4 secondes, l'offre ou le
  prix sur la dernière image, images calées sur la musique, 1080 × 1920 ; 21 à 34 secondes « performs best » pour les
  publicités. Sources : https://ads.tiktok.com/business/en/guides/video-advertising-guide ;
  https://ads.tiktok.com/help/article/creative-best-practices
- **Conséquence pour la carte de fin** : logo et offre dans le tiers du milieu, jamais dans le bas (35 % chez Meta),
  tenue 2,5 à 4 secondes (déjà contrôlé par `final-check.ts`).

**Deux grilles proposées (mon avis, sur ces règles) :**

*Publication de 9 à 15 secondes (5 temps, 5 à 7 plans) :*

| Temps | Image | Texte à l'écran |
|---|---|---|
| 0 à 2 s | le plan animé par IA : le produit en action ou le résultat | l'accroche de l'angle choisi |
| 2 à 5 s | plan sûr, autre cadrage | premier bénéfice |
| 5 à 9 s | gros plan matière (plan sûr, avancée lente) | deuxième bénéfice |
| 9 à 12 s | le produit dans son décor | troisième bénéfice ou une preuve vraie |
| 12 à 15 s | produit entier et net, logo | l'offre, en clair |

*Publicité de 21 à 30 secondes :* les mêmes temps, plus une partie « preuve » (un vrai chiffre, un vrai avis fourni par
le client, une démonstration) et deux plans animés au lieu d'un ; jamais d'avis ni de chiffre inventé.

---

## 5. La musique, la voix et les bruitages

### 5.1 Ce que le code fait aujourd'hui

Correction du rapport du matin, qui disait ElevenLabs « déjà branché » : **le code n'appelle pas ElevenLabs**. La
musique vient du compositeur du Studio (`src/lib/media/song.ts` : « de VRAIS morceaux joués par de vrais instruments
enregistrés … Aucun appel payant, aucun droit tiers à déclarer »), et la voix d'OpenAI ou de Kokoro
(`src/lib/video-v2/voice.ts`). Vérifié par recherche du mot « elevenlabs » dans `src/` et `worker/` : aucun résultat.

### 5.2 ElevenLabs Music : les droits dépendent de l'abonnement et de la taille de l'entreprise

Conditions de la musique, mises à jour le 9 octobre 2026 (**officiel**) : https://elevenlabs.io/eleven-music-model-specific-terms

| Abonnement | Prix par mois | Pour qui | Accès par programme | Diffusion |
|---|---|---|---|---|
| Starter | 6 $ | « For Individual Use Only » | oui | interdite en plateforme d'écoute |
| Creator | 22 $ | « For Individual Use Only » | oui | permise |
| Pro | 99 $ | « For Individual Use Only » | oui | permise |
| Scale | 299 $ | entreprises de moins de 10 salariés | oui | permise |
| Business | 990 $ | moins de 50 salariés | oui | permise |

Prix des abonnements : https://elevenlabs.io/pricing/api

- Usage permis pour tous les abonnements payants : « All online and offline commercial use permitted, except film, TV,
  radio, and Studio Games ». La publicité sur les réseaux n'est pas citée à part ; elle entre dans « online commercial
  use ». Aucune mention d'origine exigée hors de l'offre gratuite.
- **Point à signaler** : Starter, Creator et Pro sont réservés à l'usage individuel. Pour une société qui crée des
  vidéos pour ses clients, l'abonnement qui convient d'après ce texte est **Scale (299 $ par mois)**. C'est un coût fixe
  nouveau, à décider par le propriétaire.
- **Interdits** : la « Model Resale » (« making available of Music Models … through your … platform ») et la
  « Music Library » (une collection de morceaux mise à disposition de tiers pour qu'ils les réutilisent). Le texte
  précise qu'on ne devient pas revendeur « solely by generating and distributing Output through its own product ». Donc
  (lecture **mon avis**) :
  - SINA qui crée la musique d'une vidéo livrée au client : permis ;
  - l'atelier où le client demande lui-même « une musique » à ElevenLabs : risque de « Model Resale » ;
  - donner au client le fichier de musique seul, réutilisable : risque de « Music Library ».
- Mention IA : « no marking ElevenLabs applies satisfies your disclosure obligations under applicable law ». C'est au
  Studio de mettre la mention quand la loi ou la plateforme l'exigent.
- Prix à l'usage : musique 0,15 $ la minute ; bruitages 0,12 $ la minute (la page dit aussi « billed per generation »,
  contradiction notée) ; voix 0,04 $ (modèles rapides) ou 0,08 $ (v2 et v3) les 1 000 caractères.

**Ma proposition :** garder le compositeur du Studio comme musique par défaut (gratuit, sans droits tiers, déjà fait) ;
ElevenLabs Music seulement si le propriétaire prend l'abonnement Scale et après un essai d'écoute comparé ; ElevenLabs
pour la voix (meilleur minutage pour les sous-titres) en option, la vidéo devant toujours se comprendre sans le son.

### 5.3 Les règles des réseaux sur la musique

- Meta interdit dans les publicités Reels la musique protégée d'un tiers (page ci-dessus).
- Les bibliothèques de TikTok et de Meta ne servent que dans leurs applications (rapport du matin) : le client peut y
  ajouter un son au moment de publier, le Studio ne le grave pas.
- Le son créé par les modèles vidéo (Veo, Kling, Seedance, Wan) est à couper par défaut : il coûte plus cher (par
  exemple Veo 3.1 Lite 0,05 $ au lieu de 0,03 $ par seconde) et se mélangerait à la musique.

---

## 6. La mention IA et le filigrane, fournisseur par fournisseur

| Fournisseur | Filigrane visible | Marquage dans le fichier | Ce que le Studio doit faire |
|---|---|---|---|
| Veo (Vertex) | aucun | « Content Credentials (C2PA) » écrits par Google ; SynthID annoncé (non vérifié sur Vertex) | garder ces données ; Meta et TikTok les lisent et peuvent étiqueter seuls |
| Kling | aucun par défaut (`watermark_info.enabled: false`) | non trouvé | mention selon la loi |
| Seedance | aucun par défaut ; « AI Generated » en bas à droite si demandé | non trouvé | mention selon la loi ; obligations de « Platform Customer » (partie 1.3) |
| Wan | aucun par défaut | non trouvé | mention selon la loi |
| ElevenLabs | — | « no marking ElevenLabs applies satisfies your disclosure obligations » | mention selon la loi |

Les règles de la loi européenne (article 50) et des réseaux ont été lues ce matin (rapport 06, partie 5) : je ne les
répète pas. Le code met déjà une mention « générée par IA » au rendu (`render.ts`) et la contrôle (`quality.ts`,
`needsDisclosure`).

---

## 7. Le prix réel d'une vidéo de 15 secondes

**Hypothèses :**
- 15 secondes à l'écran, faites de 3 plans animés de 5 secondes (Veo n'accepte que 4, 6 ou 8 s : 3 plans de 6 s,
  recoupés au montage), son des modèles coupé ;
- **deux essais par plan** (pour pouvoir en rejeter un), donc chaque seconde est payée deux fois ;
- postes communs, comptés à part : 3 images fixes d'OpenAI au prix prudent que compte le Studio (0,13 € l'image, partie
  13 de la référence), soit 0,39 € ; musique ElevenLabs 0,04 $ ; voix 0,02 $ ; sous-titres par le minutage de la voix,
  0 $ ; montage par le moteur du Studio, 0 $. Total ≈ **0,45**. Le compositeur du Studio ramènerait la musique à 0 ;
- **non compté** : la relecture des plans par le juge [À compléter : coût d'une relecture vidéo par le modèle le plus
  fort, à mesurer] ;
- **je compte 1 $ pour 1 €** : c'est prudent (le dollar vaut moins que l'euro), le taux du jour n'est pas vérifié ;
- budgets d'IA d'un mois courant (partie 13 de la référence) : 23,00 €, 33,00 € et 56,33 € ; le forfait à 99 € compte
  environ 2 € par vidéo (3 vidéos pour 6 €), celui à 169 € aussi (6 vidéos pour 12 €).

| Chemin | Prix par seconde ($) | Secondes payées par essai | Animation, 2 essais par plan ($) | Total avec postes communs | Tient dans 2 € ? | % du budget du mois, forfait 69 € | 99 € | 169 € |
|---|---|---|---|---|---|---|---|---|
| A. Aucune animation par IA : vrai produit en calque, mouvement de caméra au montage | 0 | 0 | 0,00 | **0,45** | oui | 2 % | 1 % | 1 % |
| Veo 3.1 Lite, Vertex, 720p sans son | 0,03 | 18 | 1,08 | **1,53** | oui | 7 % | 5 % | 3 % |
| Veo 3.1 Fast, Vertex, 720p sans son | 0,08 | 18 | 2,88 | **3,33** | non | 14 % | 10 % | 6 % |
| Veo 3.1, Vertex, 720p sans son | 0,2 | 18 | 7,20 | **7,65** | non | 33 % | 23 % | 14 % |
| Kling 2.5 Turbo, direct, 720p sans son | 0,042 | 15 | 1,26 | **1,71** | oui | 7 % | 5 % | 3 % |
| Kling 3.0, direct, 720p sans son | 0,084 | 15 | 2,52 | **2,97** | non | 13 % | 9 % | 5 % |
| Kling 3.0 Turbo, direct, 720p (son compris) | 0,112 | 15 | 3,36 | **3,81** | non | 17 % | 12 % | 7 % |
| Kling 4.0 Flash, direct, 720p | 0,094 | 15 | 2,82 | **3,27** | non | 14 % | 10 % | 6 % |
| Kling 4.0, direct, 720p | 0,157 | 15 | 4,71 | **5,16** | non | 22 % | 16 % | 9 % |
| Seedance 2.0 Mini, BytePlus, 720p | 0,08 | 15 | 2,40 | **2,85** | non | 12 % | 9 % | 5 % |
| Seedance 2.0 Fast, BytePlus, 720p | 0,12 | 15 | 3,60 | **4,05** | non | 18 % | 12 % | 7 % |
| Seedance 2.0, BytePlus, 720p | 0,15 | 15 | 4,50 | **4,95** | non | 22 % | 15 % | 9 % |
| Seedance 2.5 Flash, BytePlus, 720p | 0,15 | 15 | 4,50 | **4,95** | non | 22 % | 15 % | 9 % |
| Seedance 2.5, BytePlus, 720p | 0,231 | 15 | 6,93 | **7,38** | non | 32 % | 22 % | 13 % |
| Wan 2.6 « flash », Alibaba, 1080p sans son (prix confirmé par un essai réel) | 0,0375 | 15 | 1,12 | **1,57** | oui | 7 % | 5 % | 3 % |
| Wan 2.6 « flash », Runware, 720p sans son | 0,025 | 15 | 0,75 | **1,20** | oui | 5 % | 4 % | 2 % |
| Wan 2.2 départ et fin « flash », Alibaba Singapour, 720p | 0,036 | 15 | 1,08 | **1,53** | oui | 7 % | 5 % | 3 % |
| Wan 3.0, Alibaba Singapour, 720p | 0,1 | 15 | 3,00 | **3,45** | non | 15 % | 10 % | 6 % |
| I. Mélange : 1 plan de 5 s par Wan 2.6 « flash » + 2 plans en calque | 0,0375 | 5 | 0,38 | **0,82** | oui | 4 % | 2 % | 1 % |
| I. Mélange : 1 plan de 6 s par Veo 3.1 Lite + 2 plans en calque | 0,03 | 6 | 0,36 | **0,81** | oui | 4 % | 2 % | 1 % |
| I. Mélange : 1 plan de 5 s par Kling 2.5 Turbo + 2 plans en calque | 0,042 | 5 | 0,42 | **0,87** | oui | 4 % | 3 % | 2 % |
| I. Mélange : 1 plan de 5 s par Seedance 2.0 Mini + 2 plans en calque | 0,08 | 5 | 0,80 | **1,25** | oui | 5 % | 4 % | 2 % |
| I. Mélange : 1 plan de 5 s par Seedance 2.5 + 2 plans en calque | 0,231 | 5 | 2,31 | **2,76** | non | 12 % | 8 % | 5 % |

Prix lus sur les pages officielles citées en partie 1. Kling 2.5 Turbo n'accepte l'image de fin qu'en 1080p (0,07 $/s) :
avec l'image de fin, sa ligne passe à 2,10 $ d'animation, 2,55 au total.

**Une publicité de 30 secondes** (6 plans de 5 s, 6 images fixes, deux essais par plan), calculée de la même façon :
Veo 3.1 Lite ≈ 2,64 ; Kling 2.5 Turbo ≈ 3,36 ; Wan 2.6 « flash » ≈ 3,09 ; Seedance 2.0 Mini ≈ 5,64 ; Kling 3.0 ≈ 5,88 ;
Wan 3.0 ≈ 6,84 ; Seedance 2.0 ≈ 9,84 ; Seedance 2.5 ≈ 14,70. En mélange (2 plans animés, le reste en calque) : 1,59 avec
Wan 2.6 « flash », 5,46 avec Seedance 2.5.

**Ce que ça donne :**
- avec l'enveloppe de 2 € par vidéo prévue dans les forfaits, **seuls le mélange (chemin I) et les modèles à moins de
  0,04 $ la seconde tiennent** avec trois plans animés et deux essais : Veo 3.1 Lite, Kling 2.5 Turbo, Wan 2.6 « flash »,
  Wan 2.2 « kf2v » ;
- **Seedance 2.5, le meilleur du classement, tient en mélange** (un seul plan animé : 2,76, soit 8 % du budget du
  forfait à 99 €), pas en vidéo toute animée (7,38, 22 %) ;
- le forfait à 69 € n'a pas de vidéo comprise ; une vidéo faite dans l'atelier y coûterait 4 % (mélange) à 33 % (Veo 3.1
  ou Seedance 2.5 tout animé) de son budget du mois.

---

## 8. Pas vérifié

- Le prix des paquets d'unités de Kling (la page d'achat ne s'affiche pas sans navigateur) et leur durée de validité.
- La raison pour laquelle l'unité de Kling 4.0 vaut 0,157 $ et celle de Kling 3.0 0,14 $.
- Si l'unité de la page des prix de Vertex (« / 1 count ») est bien la seconde ; c'est l'usage de Google et ce que
  donnent Runware et fal, mais la page ne l'écrit pas.
- La contradiction de la page de Veo 3.1 Lite (image en entrée « Not supported », mais image de départ « Supported »).
- SynthID sur les vidéos Veo de Vertex (lu seulement dans la presse et chez Gemini).
- Un marquage C2PA chez Kling, BytePlus et Alibaba.
- La durée de conservation des vidéos chez BytePlus (seule la validité de l'identifiant, 7 jours, est écrite).
- Si l'accord de ByteDance couvre un passage par Runware.
- Le texte de l'autorisation de ByteDance et la place de la vérification d'identité des clients.
- Si un modèle vidéo d'Alibaba existe en portée « EU » (la table des prix n'en montre aucun).
- Le classement sans son d'Artificial Analysis, et les modèles absents (Kling 4.0, Seedance Mini, Wan 2.6).
- Les noms des quatre modèles de l'étude « Faithful Where You Look » (résumé seulement).
- Le coût d'une relecture vidéo par le juge.
- Le taux de change du jour.
- La lecture juridique des conditions de Kling (article 10.3) et d'ElevenLabs (« Model Resale ») pour l'atelier : à
  faire relire si le propriétaire veut ouvrir ces outils aux clients en direct.

---

## 9. Points qui touchent une règle du propriétaire (signalés, non recommandés)

- **Données en Europe** : aucun des quatre fabricants vidéo n'offre le calcul en Europe pour ses modèles vidéo : Veo
  aux États-Unis seulement, Kling à Singapour, Seedance en Asie, Wan à Francfort mais en portée « Global ». Seul le
  stockage d'Alibaba reste à Francfort.
- **Personnes** : Kling vend un présentateur créé par IA (« Video Commerce ») et Seedance des « preset digital
  characters » : contraires à la règle « aucune personne inventée » ; à ne jamais proposer.
- **Outils ouverts au client dans l'atelier** : Seedance l'interdit sans accord écrit (obtenu) ; Kling (article 10.3) et
  ElevenLabs Music (« Model Resale ») pourraient l'interdire sans accord : à vérifier avant d'ouvrir le choix libre.
- **Nouvelle dépense fixe** : l'abonnement ElevenLabs adapté à une société (Scale, 299 $ par mois) ; rien n'est engagé.

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Le plus petit essai comparatif, avec l'accord du propriétaire** : 3 vrais produits à étiquette, un plan de 5 à 6 s
   chacun, image de départ et de fin, sur 7 modèles (Veo 3.1 Lite, Kling 2.5 Turbo en 1080p, Kling 3.0, Seedance 2.0
   Mini, Seedance 2.5, Wan 2.6 « flash », Wan 3.0), environ **10 $** au prix officiel. *Le client ne voit rien ; le
   propriétaire voit les 21 plans côte à côte, avec ceux que le juge refuse.*
2. **Le plan sûr par défaut** (produit détouré en calque, décor OpenAI, mouvement de caméra au montage), déjà présent
   dans le moteur, mis au centre. *Le client voit une vidéo où son produit est exactement le sien, même sans animation.*
3. **Le mélange comme réglage de base** : un seul plan animé par IA, le modèle choisi après l'essai, le reste en plan
   sûr. *Le client voit une vidéo vivante pour environ 2 à 8 % de son budget du mois.*
4. **Les adaptateurs en direct** : Vertex (`predictLongRunning`, identifiants `-001`, `personGeneration: "disallow"`),
   Kling (`settings.duration` toujours envoyé, copie des fichiers avant 30 jours), BytePlus (`safety_identifier`, compte
   d'entreprise), Alibaba à Francfort ; Runware en secours avec `includeCost`. *Le client ne voit rien, sauf moins de
   pannes.*
5. **Le contrôle mécanique image par image** puis le juge qui cherche aussi les textes inventés dans toute l'image.
   *Le client ne reçoit jamais un plan où son étiquette a changé.*
6. **Le brouillon avant la version finale** quand le modèle le permet (Seedance 2.5 « Draft » en 480p). *Le client
   valide un aperçu avant que la version chère soit payée.*
7. **Les sous-titres mot à mot** à partir du minutage de la voix (ElevenLabs « with-timestamps », ou Scribe), 2 à 4 mots
   par page, hors du bas de l'image. *Le client voit des sous-titres qui suivent chaque mot, comme dans CapCut.*
8. **Les coupes calées sur la musique** dans le moteur existant (les temps forts du morceau du compositeur sont connus).
   *Le client voit un montage qui bat au rythme.*
9. **Les deux grilles** (publication de 9 à 15 s, publicité de 21 à 30 s) remplies par l'angle choisi, avec la carte de
   fin hors des 35 % du bas. *Le client reçoit une vidéo pour son fil et une pour sa publicité, prêtes à poster.*
10. **Le prix avant, en pourcentage du budget**, calculé avec les tarifs de la partie 7, et aucun essai raté facturé.
    *Le client lit « ≈ 4 % de ton budget » avant de dire oui.*
11. **Les obligations de Seedance pour l'atelier** : journal de chaque création, signalement et retrait, confirmation des
    droits sur la photo. *Le client coche « j'ai les droits sur cette photo » avant d'animer.*
12. **La décision sur la musique** : compositeur du Studio par défaut ; ElevenLabs Music seulement après l'accord du
    propriétaire sur l'abonnement Scale et une écoute comparée. *Le client entend une musique à l'ambiance de sa
    marque, sans aucun risque de droits.*
