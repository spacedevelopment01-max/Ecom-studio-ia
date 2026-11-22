# Les vidéos courtes de SINA : ce qui est nouveau, plus précis, et comment le faire

Recherche du 22 novembre 2026, faite sur Internet (pages lues une par une). Aucun appel payant, aucun fichier du dépôt
modifié à part celui-ci.

Point de départ : le rapport 6, partie 4, du 21 novembre (« images fixes validées, puis courts plans animés, puis
montage de 9 à 15 secondes »). Ce rapport-ci le complète : ce qui a changé depuis, les prix officiels, et la façon
concrète de le construire.

**Niveaux de preuve utilisés :**
- **officiel** : page de l'éditeur, de la plateforme ou du texte de loi ;
- **test indépendant** : classement ou essai publié par un tiers qui ne vend pas l'outil ;
- **éditeur** : blog d'un vendeur, qui a intérêt à ce qu'il écrit ;
- **avis** : Trustpilot, forums, avis d'utilisateurs ;
- **mon avis** : proposition de ma part, non vérifiée.

Les prix sont en dollars, comme sur les pages officielles. Je n'ai pas vérifié le taux de change du jour ; pour
l'ordre de grandeur, 2 € font un peu plus de 2 $.

---

## Les trois nouvelles qui changent le plan

1. **OpenAI ne fait plus de vidéo.** Sa page officielle dit : « The Sora 2 models and Videos API were shut down on
   September 24, 2026 », sans remplaçant. Les images fixes restent faites par OpenAI ; l'animation doit passer par
   fal.ai ou Alibaba, déjà branchés. Preuve : **officiel**. https://developers.openai.com/api/docs/models/sora-2
2. **TikTok conseille plus long que ce qu'on croyait pour les publicités.** Son guide officiel des publicités vidéo
   dit que 21 à 34 secondes « performs best » pour les publicités du fil, avec le produit en action dans les 2
   premières secondes. Les 9 à 15 secondes du rapport précédent restent valables pour les publications ordinaires (et
   Meta dit que les Reels de moins de 15 secondes sont favorisés, selon des sources secondaires). Preuve :
   **officiel** pour TikTok (sans étude citée). https://ads.tiktok.com/business/en/guides/video-advertising-guide
3. **La mention « IA » est devenue une obligation, et elle coûte de l'intérêt.** L'article 50 de l'AI Act s'applique
   depuis le 2 août 2026 ; TikTok exige la mention sur les publicités faites par IA ; une étude de Copenhague mesure
   jusqu'à 46 points d'intérêt émotionnel en moins avec l'étiquette « générée par IA ». Détails partie 5.

---

## 1. Les modèles qui animent une image

### 1.1 Le classement indépendant (Artificial Analysis, animation d'une image, avec son)

Méthode : des personnes comparent à l'aveugle deux vidéos tirées de la même image et choisissent la meilleure ; le
score (Elo) en sort. Lu le 22 novembre 2026 ; la page ne donne pas la date exacte de mise à jour.

| Rang | Modèle | Score | Prix affiché par minute | Prix ramené à la seconde |
|---|---|---|---|---|
| 1 | Dreamina Seedance 2.5 (ByteDance) | 1162 | 34,12 $ | 0,57 $ |
| 2 | Utopai X | 1152 | pas d'accès par programme | — |
| 3 | Boreal-H3 | 1151 | 2,42 $ | 0,04 $ |
| 4 | Dreamina Seedance 2.0 | 1141 | 22,45 $ | 0,37 $ |
| 5 | MiniMax H3 (768p) | 1136 | 4,80 $ | 0,08 $ |
| 9 | MiniMax H3 Max | 1119 | 9,60 $ | 0,16 $ |
| 11 | Pika H3 Flex | 1116 | 2,10 $ | 0,035 $ |
| 12 | Wan 3.0 (Alibaba) | 1110 | 12,00 $ | 0,20 $ |
| 15 | Gemini Omni Flash 1.2 (Google) | 1086 | 6,26 $ | 0,10 $ |

- Écart entre le 1er et le 5e : 26 points, alors que la marge d'erreur de chacun est de ±14. Seedance 2.5 coûte environ
  7 fois plus que MiniMax H3 pour un gain faible.
- **Limite importante** : ce score mesure la préférence d'ensemble, pas la fidélité au produit. Un guide d'août 2026 le
  rappelle aussi.
- Preuve : **test indépendant**. https://artificialanalysis.ai/video/leaderboard/image-to-video ; méthode :
  https://artificialanalysis.ai/methodology/video

**Pour SINA :** choisir le modèle sur un essai à nous, fait sur des produits à étiquette, pas sur ce classement seul.

### 1.2 Les prix officiels chez les fournisseurs déjà branchés

**Chez fal.ai** (pages des modèles, lues le 22 novembre 2026) :

| Modèle | Prix par seconde | Durée | Ce qui compte pour nous |
|---|---|---|---|
| Veo 3.1 Lite (Google) | 0,03 $ en 720p sans son ; 0,05 $ avec son ; 0,05 $ en 1080p sans son ; 0,08 $ avec | courte | le moins cher de tous |
| Veo 3.1 | 0,20 $ sans son, 0,40 $ avec (720p ou 1080p) | courte | qualité haute |
| Wan 2.6 « flash » (Alibaba) | 0,05 $ en 720p ; 0,075 $ en 1080p | — | même prix que chez Alibaba |
| MiniMax H3 Max | 0,05 $ en 480p ; 0,08 $ en 768p ; 0,16 $ en 1080p (prix normal depuis le 16 novembre 2026) | — | image de début et de fin |
| MiniMax H3 | 0,26 $ en 2K | — | image de début et de fin |
| Kling 3.0 Turbo Standard | 0,112 $ en 720p, son compris | 5 s en exemple | image de début et de fin |
| Kling 3.0 Turbo Pro | 0,14 $ en 1080p | — | — |
| Kling 4.0 | 0,157 $ en 720p ; 0,235 $ en 1080p | 3 à 30 s | accès par programme « bientôt » au 4 novembre 2026 |
| Seedance 2.5 | 0,22 $ en 480p ; 0,47 $ en 720p ; 1,16 $ en 1080p | 4 à 30 s | l'image de départ n'est pas facturée |

Sources (**officiel**, pages de fal) :
- https://fal.ai/models/fal-ai/veo3.1/lite/image-to-video
- https://fal.ai/models/wan/v2.6/image-to-video/flash
- https://fal.ai/models/minimax/h3-max/image-to-video
- https://fal.ai/models/fal-ai/kling-video/v3/turbo/standard/image-to-video
- https://fal.ai/models/bytedance/seedance-2.5/image-to-video
- comparaison Kling 4.0 et Seedance 2.5, publiée par fal le 4 novembre 2026 : https://fal.ai/learn/devs/kling-4-0-vs-seedance-2-5

**Chez Alibaba (DashScope), région internationale de Singapour :**
- Wan 2.7, image vers vidéo : 0,10 $ la seconde en 720p, 0,15 $ en 1080p. Preuve : **officiel**.
  https://www.alibabacloud.com/help/en/model-studio/wan2-7-i2v
- Wan 2.6 « flash » : 0,05 $ en 720p, 0,075 $ en 1080p (même prix que fal). Preuve : **officiel**.
  https://www.alibabacloud.com/help/en/model-studio/wan2-6-i2v-flash
- MiniMax H3 est aussi chez Alibaba, mais la page ne donne que les prix de Pékin (0,80 yuan la seconde en 2K, 0,50 en
  768p) ; je n'ai pas trouvé de prix international. **Non vérifié** pour notre région.
  https://help.aliyun.com/en/model-studio/minimax-h3

**Hors fournisseurs branchés (pour comparer seulement, aucun ajout sans accord) :**
- Runway : Gen-4 Turbo à 5 crédits la seconde et Gen-4.5 à 12 crédits ; plusieurs sources mettent le crédit à 0,01 $,
  soit 0,05 $ et 0,12 $ la seconde. Preuve : **officiel** pour les crédits, valeur du crédit **non vérifiée** sur la
  page officielle. https://docs.dev.runwayml.com/guides/pricing/
- Luma Ray 3.2 : vendu à la vidéo de 5 secondes en crédits, avec une page officielle qui se contredit (100 ou 200
  crédits en 720p). Prix à la seconde **non vérifié**.
- Pika : pas de prix officiel trouvé hors du classement.
- Veo 3.1 directement chez Google : 0,40 $ la seconde (720p à 1080p), 0,10 $ en version rapide, 0,05 $ en version
  légère, selon un relevé d'août 2026 qui cite la page de Google. Preuve : moyenne (relevé d'un tiers).
  https://invideo.io/blog/ai-video-model-pricing

**Pour SINA :** les deux branchements existants suffisent. Elle peut essayer trois modèles bon marché (Veo 3.1 Lite,
Wan 2.6 « flash », MiniMax H3 Max) et un modèle haut de gamme (Kling 3.0) sans ajouter de fournisseur.

### 1.3 Les défauts connus et la fidélité au produit

- **Aucun essai indépendant sérieux** ne compare la déformation des étiquettes d'un modèle à l'autre. La recherche n'a
  trouvé que des blogs d'éditeurs. Preuve : absence constatée.
- **La recherche universitaire confirme le problème.** Un article de février 2026 (ConsID-Gen) décrit une dérive de
  l'aspect et des déformations de forme dans l'animation d'une image, parce que le modèle ne voit l'objet que sous un
  seul angle. Il propose de donner plusieurs vues du même objet. Je n'ai lu que le résumé. Preuve : **recherche**,
  résumé seulement. https://arxiv.org/abs/2602.10113
- **Les défauts reviennent dans les mêmes situations** :
  - la déformation arrive souvent en fin de plan, donc les plans courts aident ;
  - les rotations, les zooms rapides et les balayages font redessiner l'étiquette ;
  - les défauts de compression de l'image de départ se retrouvent dans la vidéo.
  Preuve : **éditeur** (DomoAI, août 2026 ; page fal de Seedance). https://domoai.app/blog/ai-product-videos-without-warping-the-product
- **Image de début et de fin.** Kling 3.0, MiniMax H3, Seedance 2.5 et Wan acceptent une image de fin. Si début et fin
  sont la vraie photo du produit, le plan revient forcément au produit exact. Preuve : **officiel** pour la fonction ;
  le gain sur la fidélité est **mon avis**.

**Pour SINA :** des plans de 3 à 5 secondes, une caméra lente, l'image de début et de fin quand c'est possible, et le
juge qui compare chaque plan à la photo d'origine.

---

## 2. Le montage automatique

### 2.1 Les outils de montage par programme

| Outil | Prix officiel | Pour une vidéo de 15 s | Remarques |
|---|---|---|---|
| **Remotion** (montage écrit en React, rendu chez nous) | gratuit pour une entreprise de 3 personnes au plus ; sinon « Automators » à 0,01 $ par rendu, 100 $ par mois au minimum | 0 $ si le Studio reste à 3 personnes au plus | sous-titres façon TikTok déjà prévus |
| **Shotstack** | de 0,20 $ la minute (paiement à l'usage) à 0,05 $ (gros volume) | 1 à 5 centimes | facturé à la seconde |
| **Creatomate** | 45 $ par mois pour 2 000 crédits | environ 3,5 crédits en 720p, soit environ 8 centimes | coût en 1080p non indiqué |
| **FFmpeg** | gratuit | 0 $ | tout à écrire soi-même |
| **Canva** | autofill des vidéos « en aperçu », peut changer sans prévenir ; export MP4 possible | — | selon une intégration tierce, l'autofill demande un compte Canva Enterprise (**non vérifié** chez Canva) |
| **CapCut** | aucun accès officiel par programme | — | voir ci-dessous |

- Remotion : « Free License » pour « individuals and companies of up to 3 people ». Preuve : **officiel**.
  https://www.remotion.dev/license
- Remotion, sous-titres : la fonction `createTikTokStyleCaptions()` découpe les mots en pages et règle l'animation mot
  par mot (réglage `combineTokensWithinMilliseconds`). Preuve : **officiel**.
  https://www.remotion.dev/docs/captions/create-tiktok-style-captions
- Shotstack : **officiel**. https://shotstack.io/pricing/
- Creatomate : **officiel**. https://creatomate.com/pricing
- Canva : **officiel**. https://canva.dev/docs/connect/api-reference/autofills/create-design-autofill-job
- **CapCut** : aucun portail pour les développeurs, et ses conditions (mises à jour le 15 avril 2026) interdisent les
  « automated scripts or other technologies to … interact with the Services ». Les projets libres (VectCutAPI,
  capcut-mate) fabriquent des brouillons à ouvrir à la main ; les nouvelles versions de l'application les refusent
  parfois. Preuve : **éditeur** concurrent (Wireflow, 15 octobre 2026), citation des conditions **non vérifiée** à la
  source. https://www.wireflow.ai/blog/capcut-api

**Pour SINA :** monter avec Remotion chez nous (gratuit à notre taille, tout est maîtrisé, rien ne part chez un tiers).
Le « niveau CapCut » se reproduit (coupes, sous-titres animés, texte, musique) ; l'outil CapCut lui-même ne peut pas
être piloté.

### 2.2 Les sous-titres animés

- **Transcription** : Scribe d'ElevenLabs (déjà branché) coûte 0,20 $ de l'heure, soit environ un dixième de centime
  pour 15 secondes. Preuve : **officiel**. https://elevenlabs.io/pricing/api
- **Effet des sous-titres** : le seul chiffre qui revient vient de Facebook (+12 % de temps de visionnage avec
  sous-titres, étude interne de l'époque de 2016). L'étude d'origine est introuvable. Preuve : faible.
  https://www.3playmedia.com/blog/studies-find-captions-improve-engagement
- **Les chiffres sur les sous-titres mot par mot** (+18 à +23 % de visionnage) n'ont aucune étude derrière. Preuve :
  aucune.
- **Une limite à respecter** : TikTok conseille 5 à 10 mots par seconde au plus à l'écran. Preuve : **officiel**.
  https://ads.tiktok.com/help/article/creative-best-practices
- **La place à l'écran** : un mémoire universitaire (Utrecht) trouve que les sous-titres en haut de l'écran sont bien
  moins regardés que ceux du milieu. Preuve : faible (mémoire d'étudiant).
  https://studenttheses.uu.nl/handle/20.500.12932/46814

**Pour SINA :** des sous-titres de 2 à 4 mots par page, placés au milieu bas mais hors des zones des boutons, mot
surligné aux couleurs de la marque, jamais plus de 10 mots par seconde.

### 2.3 La structure qui vend et le rythme

Ce que disent les plateformes (**officiel**, sans étude publiée) :
- **TikTok, règles de base** :
  - le message principal dans les 3 premières secondes, l'accroche au plus tard dans les 6 ;
  - format vertical, 720p au moins ;
  - 3 à 5 créations par groupe de publicités.
  https://ads.tiktok.com/help/article/creative-best-practices
- **TikTok, guide des publicités vidéo** :
  - le produit en action dans les 2 premières secondes ;
  - aucune longue ouverture ni animation de logo ;
  - des coupes rapides et des angles variés ;
  - chaque point d'une liste sous 4 secondes ;
  - l'offre ou le prix sur la dernière image ;
  - les images calées sur le rythme de la musique, en 1080 × 1920 ;
  - de nouvelles créations toutes les 2 à 4 semaines.
  https://ads.tiktok.com/business/en/guides/video-advertising-guide
- **Ce qui marche le mieux dans les 3 premières secondes** : selon le guide des publicités aux enchères de TikTok, cité
  de seconde main, plus de 63 % des vidéos aux meilleurs taux de clic montrent le message ou le produit dans les 3
  premières secondes. Preuve : moyenne (citation de seconde main).
  https://influencermarketinghub.com/viral-tiktok-hooks-examples/
- **Le rythme des coupes** : « un changement de plan toutes les 1 à 2 secondes » vient d'une praticienne connue
  (conférence Motion, 2024), sans étude montrée. Un éditeur annonce 0,6 coupe par seconde pour les meilleures
  publicités TikTok, sans source. Preuve : faible. https://benly.ai/learn/ad-creative/ad-pacing-cuts-per-second

Proposition de structure pour 15 secondes (**mon avis**, construit sur les règles ci-dessus) :

| Temps | Ce qu'on voit | Texte à l'écran |
|---|---|---|
| 0 à 2 s | le produit en action ou le résultat, en gros plan, avec du mouvement | l'accroche (situation de l'angle) |
| 2 à 5 s | deuxième plan, un autre angle | bénéfice 1 |
| 5 à 9 s | détail de matière, geste des mains | bénéfice 2 |
| 9 à 12 s | le produit dans son décor | bénéfice 3 ou preuve vraie |
| 12 à 15 s | le produit entier, net, avec le logo | l'offre et l'invitation |

Cela fait 5 à 7 plans, donc une coupe toutes les 2 à 3 secondes, et une coupe sur chaque temps fort de la musique.

**Pour SINA :** une grille fixe en 5 temps, remplie par l'angle choisi. La version de 15 secondes sert aux
publications ; une version de 21 à 30 secondes (mêmes plans, plus de preuves) sert aux publicités.

---

## 3. Garder le produit intact

Les sources convergent sur trois techniques. Elles viennent toutes d'éditeurs (Dreamina, qui appartient à CapCut ;
DomoAI ; Cutout.pro), donc preuve **éditeur**, mais la méthode est la même partout.

1. **Le vrai produit en calque fixe sur un décor animé.** On détoure la vraie photo, on anime seulement le décor
   (lumière, vapeur, reflets, feuilles), puis on pose le produit par-dessus au montage. « The product never moves, so
   there is nothing to warp. » Il faut ensuite refaire l'ombre et le reflet, sinon le produit « flotte ».
   https://domoai.app/blog/ai-product-videos-without-warping-the-product ;
   https://dreamina.capcut.com/ai-image/change-product-background-preserve-product
2. **Animer la caméra, pas l'objet.** Avancée lente vers le produit, léger effet de profondeur, caméra fixe. Rotation
   du produit limitée à environ 15 degrés ; déplacer la lumière plutôt que l'objet. Si un essai déforme, baisser le
   mouvement d'un cran. Même source DomoAI.
3. **Plusieurs essais, puis contrôle image par image.** Faire 4 à 6 essais par plan et jeter ceux qui dérivent. Les
   contrôles : étiquette lisible sur la première image, forme stable entre les images 5 et 10, logo identique sur la
   dernière. Même source.

Ce que j'ajoute (**mon avis**) :
- **Contrôle mécanique d'abord.** On extrait une image sur cinq et on la compare au calque du produit détouré (forme,
  couleur). Cela se fait par le code, sans IA payante.
- **Le juge visuel ensuite**, seulement sur les plans qui passent : il décrit ce qu'il voit avant de noter.
- **Le plan sans aucune animation IA** (le calque du vrai produit, un mouvement de caméra fait au montage, un décor
  fixe créé par OpenAI) ne peut pas déformer le produit et ne coûte rien en animation. C'est le filet de sécurité.

**Pour SINA :** chaque plan où le produit bouge passe le contrôle mécanique puis le juge. Tout plan refusé est remplacé
par la version « vrai produit en calque », pour qu'il n'y ait jamais de vidéo incomplète.

---

## 4. Musique et voix

### 4.1 Les bibliothèques des plateformes

- **TikTok (Commercial Music Library)** : des morceaux libres pour les comptes professionnels, utilisables en
  publication et en publicité, **seulement dans TikTok**. Une musique ajoutée hors de TikTok doit avoir une licence qui
  nomme TikTok ou les réseaux sociaux. Preuve : **officiel** pour l'existence de la bibliothèque, **éditeur**
  (Soundstripe) pour le détail. https://ads.tiktok.com/business/en-US/blog/audio-library-royalty-free-music ;
  https://www.soundstripe.com/blogs/tiktok-music-library-explained
- **Meta (Sound Collection)** : même logique, limitée aux applications de Meta. Preuve : **éditeur**.
- Conséquence : une musique de ces bibliothèques ne peut pas être gravée dans la vidéo par le Studio. Le client
  l'ajouterait lui-même dans l'application, au moment de publier.

### 4.2 Les bibliothèques libres

- **Pixabay** : usage gratuit, sans citation de l'auteur, modification permise, revente « telle quelle » interdite.
  La page ne parle ni de publicité ni de Content ID (risque de réclamation automatique sur un morceau). Preuve :
  **officiel**, mais incomplet pour notre usage. https://pixabay.com/service/license-summary/

### 4.3 La musique créée par IA

- **ElevenLabs Music** (déjà branché) : 0,15 $ la minute, soit environ 4 centimes pour 15 secondes. Usage commercial
  à partir de l'abonnement Starter. La table des droits, mise à jour le 9 octobre 2026, permet « All online and offline
  commercial use … except film, TV, radio, and Studio Games » ; l'abonnement Scale est réservé aux entreprises de moins
  de 10 salariés, Business à moins de 50. Elle ajoute : à nous de respecter les règles de chaque plateforme sur la
  mention IA. Preuve : **officiel**. https://elevenlabs.io/eleven-music-model-specific-terms ;
  https://elevenlabs.io/pricing/api
- **À vérifier avant usage** : quel abonnement ElevenLabs le Studio a réellement. Une version plus ancienne des
  conditions excluait la publicité payante sur l'abonnement Creator. [À compléter : abonnement ElevenLabs du Studio]
- **Suno** : pas d'accès officiel par programme. Usage commercial seulement sur abonnement payant ; nouvelles
  conditions en vigueur depuis le 3 septembre 2026, après l'accord avec Warner. Plafonds de téléchargement rapportés
  par des tiers, **non vérifiés**. Universal et Sony poursuivaient encore Suno à la date des articles lus. Preuve :
  **officiel** (conditions) et presse. https://suno.com/legal/terms ;
  https://billboard.com/pro/suno-warner-music-sign-ai-licensing-deal-settle-lawsuit/
- **Udio** : après ses accords avec Warner et Universal, il devient un espace fermé de remix. Il ne convient pas à
  notre usage. Preuve : presse.
  https://www.musicbusinessworldwide.com/warner-music-settles-udio-lawsuit-strikes-licensing-deal-with-ai-platform

### 4.4 La voix

- Voix ElevenLabs : 0,04 $ les 1 000 caractères (modèle rapide), 0,08 $ (modèles v2 et v3). Une voix de 15 secondes
  fait environ 250 caractères, soit 1 à 2 centimes. Preuve : **officiel**. https://elevenlabs.io/pricing/api
- TikTok conseille la musique avec une voix claire qui explique les bénéfices. Preuve : **officiel**, guide des
  publicités vidéo ci-dessus.

**Pour SINA :** la musique créée par ElevenLabs pour chaque vidéo, à l'ambiance de la marque, calée sur les coupes.
C'est la seule musique qu'on peut graver nous-mêmes sans risque de droits, sous réserve de l'abonnement. La voix reste
en option : la vidéo doit se comprendre sans le son, par le texte à l'écran.

---

## 5. Les règles

### 5.1 L'AI Act européen, article 50

- **Dates** :
  - l'article 50 s'applique depuis le **2 août 2026** ;
  - le paquet de simplification (règlement 2026/1744, en vigueur le 27 juillet 2026) n'a reporté que le marquage
    lisible par machine (article 50, paragraphe 2) au **2 décembre 2026** pour les systèmes déjà sur le marché ;
  - un code de bonne pratique a été finalisé le 10 juin 2026 et les lignes directrices adoptées le 20 juillet 2026.
  Preuve : **officiel** de seconde main (Future of Privacy Forum, juristes).
  https://fpf.org/blog/the-ai-act-implementation-timeline-what-changes-under-the-ai-omnibus/
- **Ce qui nous concerne** : celui qui diffuse une « hypertrucage » (une image, un son ou une vidéo qui ressemble à des
  personnes, objets, lieux ou événements existants et « would falsely appear authentic ») doit le dire clairement, au
  plus tard au premier visionnage. Une publicité réaliste montrant un vrai produit dans une scène inventée pourrait
  entrer dans cette définition. Le texte lu ne parle pas de publicité. Pour la vidéo, le projet de code prévoit une
  étiquette qui reste à l'écran, une icône « IA » en français. Preuve : **officiel** résumé par un site spécialisé.
  https://artificialintelligenceact.eu/transparency-rules-article-50/
- Amendes : jusqu'à 15 millions d'euros ou 3 % du chiffre d'affaires mondial. Preuve : secondaire.

### 5.2 La loi française sur l'influence commerciale

L'article 5 de la loi du 9 juin 2023 impose la mention « images virtuelles » sur les contenus produits par IA
représentant un visage ou une silhouette, dans l'influence commerciale. L'article a été réécrit par l'ordonnance du 6
novembre 2024 ; je n'ai pas lu le texte consolidé. Preuve : **officiel** (ministère de l'Économie), texte actuel **non
vérifié**. https://www.economie.gouv.fr/node/3222759

### 5.3 Les plateformes

- **TikTok** :
  - les contenus réalistes faits par IA doivent être signalés ;
  - TikTok lit les métadonnées C2PA (le « certificat d'origine » inscrit dans le fichier) ;
  - plus de 3 milliards de contenus étiquetés en juillet 2026 ;
  - pour les publicités, selon deux blogs, la mention est obligatoire depuis le 21 juillet 2026 (case dans le
    gestionnaire de publicités), sinon refus. Je n'ai pas pu lire la page officielle (elle ne s'affiche pas sans
    navigateur).
  Preuve : **officiel** pour la règle générale, **éditeur** pour les publicités.
  https://newsroom.tiktok.com/more-ways-to-spot-shape-and-understand-ai-content?lang=en ;
  https://commonthreadco.com/blogs/coachs-corner/tiktok-ai-ad-disclosure-rules-ecommerce-2026
- **Meta** :
  - étiquette « Infos IA » automatique sur les publicités faites avec ses propres outils ;
  - depuis juin 2026, aussi sur celles détectées par leurs métadonnées comme faites avec des outils extérieurs ;
  - déclaration par l'annonceur obligatoire seulement pour les sujets politiques et de société.
  Preuve : **officiel**. https://www.meta.com/help/artificial-intelligence/355108217670024/ ;
  https://about.fb.com/news/2025/02/gen-ai-transparency-metas-ads-products/
- **YouTube** :
  - depuis le 27 mai 2026, la mention s'affiche sur la vidéo même pour les Shorts ;
  - YouTube l'ajoute seul s'il détecte une IA réaliste ;
  - selon YouTube, la mention seule ne change ni la diffusion ni la monétisation.
  Preuve : **officiel**. https://blog.youtube/news-and-events/improving-ai-labels-viewers-creators/

### 5.4 Ce que coûte l'étiquette

Étude de la Copenhagen Business School, revue *Electronic Markets*, publiée en août 2026 : deux expériences, près de
700 personnes, même contenu avec des étiquettes différentes.

| Type de contenu | Étiquette « améliorée par IA » | Étiquette « générée par IA » |
|---|---|---|
| Contenu d'émotion | environ 24 points d'intérêt émotionnel en moins | environ 46 points en moins |
| Contenu informatif | environ 13 points en moins | environ 27 points en moins |

Preuve : **recherche** (petit échantillon, contenus d'essai). https://www.cbs.dk/en/articles/ai-labels-reduce-social-media-engagement

### 5.5 Le droit à l'image

Publier la photo d'une personne reconnaissable demande son accord ; pour un usage commercial, les juristes conseillent
un accord écrit, précis, pour chaque usage. Preuve : **officiel** pour le principe (page de 2022), conseil de l'écrit
de source privée. https://www.service-public.gouv.fr/particuliers/vosdroits/F32103

**Pour SINA :**
- garder la règle « jamais de personne sans photo ou accord écrit » ;
- préférer « améliorée par IA » à « générée par IA » : vraie photo du produit animée, plutôt que scène entièrement
  inventée, ce qui coûte moins d'intérêt ;
- dire au client, au moment de publier, de cocher la mention IA (TikTok, YouTube) ;
- garder les métadonnées d'origine dans le fichier plutôt que les effacer.

---

## 6. Ce que font les outils du marché et ce qu'on leur reproche

- **Google Pomelli, « Animate »** :
  - animation d'une image en court clip avec Veo 3.1, lancée en janvier 2026 selon des tiers ;
  - le bouton n'apparaît qu'en format vertical, et le texte animé est peu fiable (rapport d'un utilisateur) ;
  - aucune page officielle trouvée sur ses limites.
  Preuve : faible. https://www.mindstudio.ai/blog/google-pomelli-video-animation-9-16-format-requirement
- **Creatify** (publicités vidéo à partir d'un lien produit) : 3,7 sur 5 sur Trustpilot (845 avis au 11 novembre
  2026). Les reproches portent sur :
  - les prélèvements après résiliation et l'absence de remboursement ;
  - les crédits qui expirent ;
  - les rendus qui échouent ;
  - des publicités qui « font IA ».
  Preuve : **avis**. https://uk.trustpilot.com/review/creatify.ai ;
  https://www.sikayetvar.com/en/creatify-us/creatify-made-my-ads-look-ai-generated-how-can-i-improve-them-q-43243
- **InVideo AI** : crédits épuisés en une ou deux créations, coût difficile à prévoir, son absent ou décalé,
  personnages qui changent d'une création à l'autre, premier résultat inutilisable. Preuve : **avis**.
  https://uk.trustpilot.com/review/ai.invideo.io?page=4
- **Arcads et HeyGen** (faux clients ou présentateurs créés par IA) : Arcads imite la vidéo filmée au téléphone par un
  client, HeyGen montre un présentateur clairement de marque. Aucun test indépendant de résultats ni de confiance
  trouvé ; Arcads ne publie pas ses prix. Preuve : **éditeur**. https://www.omniconvert.com/nexus/compare/arcads-vs-heygen/
  Contraire aux règles de SINA (aucune personne inventée).
- **Canva et CapCut** :
  - CapCut l'emporte pour la vidéo courte : sous-titres, minutage précis, coupe automatique sur le rythme ;
  - le montage de Canva n'est pas précis à l'image près ;
  - sa coupe sur le rythme est payante.
  Preuve : **éditeur** (sources concurrentes entre elles). https://ramp.com/vendors/canva/alternatives/canva-vs-capcut
- **Opus Clip et Captions** : ils découpent une longue vidéo filmée en extraits. Ce n'est pas notre cas : nos clients
  n'ont pas de longue vidéo. Pas creusé.
- **Pictory** : pas de source utile trouvée dans le temps de la recherche. **Non vérifié.**

Ce qui revient partout : **un coût imprévisible**, **un rendu qui « fait IA »** et **des échecs de création**.
L'exigence « rien n'est montré sans relecture » et le pourcentage du budget d'IA montré au client répondent
exactement à ces trois reproches.

**Pour SINA :** ne jamais facturer au client un essai raté ; il ne voit qu'une vidéo finie et relue, et son coût en
pourcentage de son budget du mois.

---

## 7. Le prix réel d'une vidéo de 15 secondes

Calcul fait avec les tarifs officiels lus ci-dessus. Hypothèses de base :
- 15 secondes d'animation au total, soit 3 plans de 5 secondes ;
- le son des modèles coupé (la musique vient d'ElevenLabs) ;
- un essai par plan (colonne « ×1 ») ou deux essais par plan (colonne « ×2 ») pour pouvoir rejeter.

**Les postes communs à tous les chemins :**
- musique ElevenLabs : 0,04 $ ;
- voix (option) : 0,02 $ ;
- sous-titres : 0,001 $ ;
- montage Remotion : 0 $ à notre taille ;
- soit environ **0,06 $** en tout.

**Ce qui n'est pas compté**, faute de prix lu dans cette recherche : [À compléter : prix des images fixes OpenAI et des
relectures du juge]. Le Studio les compte déjà pour les publications.

| Chemin | Animation ×1 | Animation ×2 | Total ×2 avec les postes communs |
|---|---|---|---|
| A. Aucune animation IA : vrai produit en calque, décor OpenAI, mouvement de caméra au montage | 0 $ | 0 $ | **0,06 $** |
| B. Veo 3.1 Lite chez fal, 720p sans son (0,03 $/s) | 0,45 $ | 0,90 $ | **0,96 $** |
| C. Veo 3.1 Lite, 1080p sans son (0,05 $/s) | 0,75 $ | 1,50 $ | 1,56 $ |
| D. Wan 2.6 « flash », 720p, fal ou Alibaba (0,05 $/s) | 0,75 $ | 1,50 $ | 1,56 $ |
| E. MiniMax H3 Max chez fal, 768p (0,08 $/s) | 1,20 $ | 2,40 $ | 2,46 $ |
| F. Kling 3.0 Turbo Standard chez fal, 720p (0,112 $/s) | 1,68 $ | 3,36 $ | 3,42 $ |
| G. Veo 3.1 chez fal, sans son (0,20 $/s) | 3,00 $ | 6,00 $ | 6,06 $ |
| H. Seedance 2.5 chez fal, 720p (0,47 $/s) | 7,10 $ | 14,19 $ | 14,25 $ |
| I. **Mélange conseillé** : 1 plan animé de 5 s (Wan 2.6 « flash » ou Veo Lite) + 3 à 4 plans du chemin A | 0,15 à 0,25 $ | 0,30 à 0,50 $ | **0,36 à 0,56 $** |

Ce que ça donne avec un budget d'environ 2 € par vidéo (estimation non mesurée) :
- les chemins A, B, C, D et I tiennent dans le budget, même avec deux essais par plan ;
- E tient à peine ;
- F, G et H le dépassent.

Pour un forfait à 6 vidéos par mois, le chemin I coûte environ 2 à 3 $ d'animation par mois. Ces chiffres ne valent
que si les prix restent ceux du 22 novembre 2026.

**Pour SINA :** commencer par le chemin I, et garder les modèles chers pour les publicités où le client le demande,
dans son plafond.

---

## Ce que je n'ai pas pu vérifier

- La page officielle de TikTok sur la mention IA des publicités (elle ne s'affiche pas sans navigateur) : la date du
  21 juillet 2026 vient de blogs.
- Le prix international de MiniMax H3 chez Alibaba, et les prix officiels à la seconde de Luma et de Pika.
- La valeur d'un crédit Runway sur la page officielle.
- Le coût en 1080p chez Creatomate.
- L'obligation d'un compte Canva Enterprise pour l'autofill (lue seulement chez un intégrateur).
- Le texte actuel de l'article 5 de la loi sur l'influence (réécrit en 2024).
- L'étude d'origine de Facebook sur les sous-titres (+12 %).
- Toute étude sérieuse sur le rythme idéal des coupes : il n'y a que des avis de praticiens.
- **Aucun essai indépendant de fidélité au produit** d'un modèle à l'autre : il faudra le faire nous-mêmes.
- L'abonnement ElevenLabs du Studio, dont dépend le droit d'utiliser la musique en publicité.
- Pictory : rien de solide trouvé.

---

## Les 10 changements qui auraient le plus d'effet pour SINA

1. **Retirer OpenAI de l'animation, le garder pour les images fixes.** Son service vidéo est fermé depuis le 24
   septembre 2026. L'animation passe par fal.ai et Alibaba, déjà branchés, sans nouveau fournisseur.
2. **Le vrai produit en calque fixe comme base de chaque vidéo.** Le décor est animé, le produit est posé par-dessus au
   montage, avec son ombre refaite. C'est la seule façon sûre de ne jamais le déformer, et elle ne coûte presque rien.
3. **Le chemin « mélange » par défaut.** Un seul plan animé par IA de 5 secondes, le reste en vrai produit et mouvement
   de caméra au montage. Coût : environ 0,40 à 0,60 $ par vidéo, bien sous les 2 €.
4. **Un essai comparatif à nous, le plus petit possible, avant de choisir le modèle**, avec l'accord du propriétaire.
   Trois produits à étiquette, trois plans chacun, sur Veo 3.1 Lite, Wan 2.6 « flash », MiniMax H3 Max et Kling 3.0,
   soit environ 12 $ au prix officiel (45 secondes par modèle). Le classement public ne mesure pas la fidélité au produit.
5. **Le montage avec Remotion, chez nous.** Gratuit à notre taille, avec des sous-titres animés mot par mot déjà
   prévus. CapCut ne peut pas être piloté par programme, et ses conditions l'interdisent.
6. **Une grille de montage fixe en 5 temps**, remplie par l'angle choisi : produit en action dans les 2 premières
   secondes, trois bénéfices, offre et logo à la fin, une coupe toutes les 2 à 3 secondes, calée sur la musique. La
   version de 15 secondes sert aux publications, celle de 21 à 30 secondes aux publicités (guide officiel de TikTok).
7. **Le contrôle du produit en deux étages.** D'abord une comparaison par le code (une image sur cinq contre le calque
   du produit), puis le juge visuel qui décrit avant de noter. Un plan refusé est remplacé par la version en calque,
   jamais montré.
8. **La musique créée par ElevenLabs pour chaque vidéo**, sans musique de bibliothèque gravée dans le fichier, après
   vérification que l'abonnement du Studio couvre la publicité. Le client peut toujours ajouter un son de TikTok au
   moment de publier.
9. **La mention IA traitée par SINA.** Elle rappelle au client de cocher la case IA sur TikTok et YouTube, garde les
   métadonnées d'origine, et préfère les vidéos « améliorées par IA » (vrai produit) aux scènes entièrement inventées,
   qui perdent jusqu'à 46 points d'intérêt émotionnel avec l'étiquette.
10. **Une vidéo qui se comprend sans le son.** Texte à l'écran, 10 mots par seconde au plus, sous-titres hors des zones
    des boutons, en 1080 × 1920. La voix reste en option, à 1 ou 2 centimes.
