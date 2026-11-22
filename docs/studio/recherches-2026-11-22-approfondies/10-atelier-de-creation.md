# L'atelier de création : recherche approfondie (22 novembre 2026)

Recherche faite sur Internet, pages lues une par une, et dans le code du Studio. Aucun appel payant à une IA ni à un
fournisseur. Aucun autre fichier du dépôt modifié.

## 0. Ce que ce rapport corrige dans celui du matin

Le rapport du matin (`docs/studio/recherches-2026-11-22/08-atelier-images-et-videos.md`) ignorait la liste des
fournisseurs accordés (référence, partie 16). Corrections :

- **fal.ai n'est pas « le catalogue »** : fal ne sert que pendant la transition. Le seul intermédiaire de secours est
  **Runware**. Tout ce que le matin faisait passer par fal doit passer en direct chez le fabricant accordé, ou par
  Runware en secours.
- **Bria (Product Shot, détourage RMBG) n'est pas un fournisseur accordé** : il ne passait que par fal. Le proposer
  demanderait l'accord du propriétaire. Le même geste se fait avec ce qui est accordé (partie 3).
- **MiniMax (H3 Max, Turbo), Seedream, Recraft Crisp, SeedVR2, Crystal Upscaler, Ideogram Object Removal** : pas dans
  la liste accordée (Ideogram est même écarté). Retirés des propositions.
- **Higgsfield** : à quitter (il peut entraîner ses modèles sur les photos envoyées). Le matin le gardait comme
  possibilité « plus tard » : ce n'est plus une possibilité.
- **Seedance** était absent du matin ; il est accordé depuis le 21 novembre 2026, aux conditions écrites de ByteDance
  (texte encore à compléter).
- **Veo** : seulement par Vertex (plus dans l'API Gemini), versions 3.1 Fast et Lite.
- **Le matin n'avait pas vu dans le code** : le Studio détoure déjà le produit sur sa propre machine (modèle embarqué,
  `src/lib/media/cutout.ts`, paquet `@imgly/background-removal-node`), sans fournisseur ; et il ré-encode les images avec
  `sharp` sans garder les métadonnées (aucun `keepMetadata` dans `src/` ni `worker/`), ce qui efface la signature C2PA
  d'OpenAI (partie 5).

**Niveaux de preuve** : **officiel** (page de l'éditeur, du fabricant ou texte de loi) ; **étude** (étude publiée) ;
**test** (test indépendant) ; **éditeur** (article d'un vendeur, souvent sur lui-même) ; **avis** (avis d'utilisateurs) ;
**mon avis** (proposition, non vérifiée). Prix en dollars comme sur les pages officielles ; conversion au taux du
matin : 1 € = 1,0990 $ (Banque centrale européenne, 20 novembre 2026).

---

## 1. Les meilleurs ateliers en novembre 2026 : ce qu'ils font, ce qui est simple, ce qui perd

### Higgsfield : le « modèle d'abord », plus de demande à écrire

- **Marketing Studio est passé de « la demande d'abord » à « le modèle d'abord »** : « The whole flow changed from a
  prompt-first tool to a template-first one » ; le client choisit un modèle, ajoute son produit, reçoit le résultat ;
  plus de 1 500 modèles en six familles (photos produit « studio », « mise en situation », « avec mannequin » ;
  publicités aux formats Meta et Google ; images pour places de marché ; affiches ; vidéos « filmées par un client »
  sans visage, face caméra ou muettes, jusqu'à 15 s ; vidéos d'animation du produit jusqu'à 15 s). Les modèles sont
  montrés **avec leur vidéo ou leur image d'exemple** ; « in one click ». Prix annoncés : vidéo de 8 s en 720p,
  47,62 crédits (2,38 $) ; 15 s, 89,2 crédits (4,46 $) ; photo produit 2K, 1,5 crédit (0,075 $). Publié le 18 août 2026.
  https://higgsfield.ai/blog/new-marketing-studio-higgsfield — **éditeur** (sur lui-même).
- **Le geste, pas à pas** (centre d'aide, mis à jour le 26 octobre 2026) : 1) choisir un modèle ; 2) déposer la photo
  du produit, « which replaces the product in the template » ; si le modèle montre une personne, changer l'avatar,
  l'accroche ou le décor ; 3) « Recreate ». « The credit cost is shown on the Recreate button before you confirm. »
  Trois autres entrées : un lien de fiche produit, une publicité de référence « you're allowed to use », ou une demande
  écrite. Limites dites par Higgsfield : la voix et le rythme des vidéos « filmées par un client » varient, « review
  before publishing » ; une vidéo ne se retouche pas, elle se refait. Par son API, seule une petite partie des modèles.
  https://higgsfield.ai/creator-hub/help-center/tools-and-workflows/how-do-i-use-marketing-studio-to-create-video-ads
  — **officiel**.
- **Les mouvements de caméra** : Higgsfield dit lui-même « 30+ presets » dans Cinema Studio (POV, bras robotisé,
  panoramique, hélicoptère) ; d'autres sites comptent 66 ou plus de 100 : les sources ne s'accordent pas. Sa page
  montre **une vidéo d'exemple par mouvement**, avec un bouton « Recreate » qui ouvre l'outil avec la phrase du
  mouvement déjà écrite, aux trous à remplir entre crochets (hauteur, angle). Pour un produit, il conseille le **tour
  autour du produit** (« the go-to move for product reveals and hero shots »). Publié le 9 octobre 2026.
  https://higgsfield.ai/blog/ai-video-camera-control — **éditeur**.
- **Ce qui perd et fâche** (rapport du matin, toujours valable) : crédits perdus au renouvellement, « illimité »
  trompeur, remboursements refusés, licence sur les créations des clients ajoutée puis retirée en juillet 2026.
- **Ce que le Studio pourrait en faire :** reprendre exactement ce geste (une vignette animée par modèle, un clic
  remplit la demande, le prix sur le bouton), sans l'avatar inventé (règle du propriétaire) et sans les 1 500 modèles :
  huit modèles bien faits valent mieux pour un commerçant.

### Pomelli Photoshoot (Google Labs) : le plus proche de ce que SINA sait déjà faire

- Une photo du produit, « don't worry about polish » ; deux familles de scènes, « studio » ou « lifestyle », ou une
  scène conseillée par Pomelli ; l'identité de la marque (« Business DNA ») appliquée d'office ; puis retouches. Fait
  avec Nano Banana. Gratuit. Annoncé le 19 février 2026. **Aucune promesse de fidélité du produit dans la page.**
  https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-photoshoot/ — **officiel**.
- **Ouvert en France**, interface en anglais seulement. https://support.google.com/labs/answer/16945066?hl=en —
  **officiel**. Selon des sites tiers (non lus à la source) : « Animate » (vidéo par Veo 3.1) en janvier 2026, un
  agent, des chartes de marque et des sites annoncés à Google I/O le 19 mai 2026.
- **Ce que le Studio pourrait en faire :** c'est un concurrent gratuit et en France : l'atelier doit faire mieux sur ce
  que Pomelli ne promet pas (le produit identique, vérifié, la marque déjà connue, la suite en un clic vers le
  calendrier et le site, le français).

### Canva, Magnific (ex-Freepik), Krea, Photoroom : chiffres d'usage et façons de vendre

| Outil | Ce qui est publié | Preuve | Ce que le Studio pourrait en faire |
|---|---|---|---|
| **Canva** | Plus de 265 millions d'utilisateurs par mois et plus de 31 millions de payants en 2025 ; son outil de mini-applications et de sites dépasse 10 millions d'utilisateurs par mois. Aucun classement des fonctions d'IA les plus utilisées. https://techcrunch.com/2026/02/18/canva-gets-to-4b-in-revenue-as-llm-referral-traffic-rises/ | presse (chiffres de Canva) | Le client connaît déjà Canva : l'atelier doit sembler aussi simple, pas plus « technique ». |
| **Canva, limites d'IA** | Selon le résumé du moteur de recherche (page d'aide bloquée à la lecture) : Pro = jusqu'à 2 000 usages des outils « standard », **ou** 200 « premium », **ou** 20 « ultra » (la vidéo est en « ultra ») ; la jauge repart à la date anniversaire ; Canva prévient que l'usage réel est « on the lower end » avec les outils avancés. https://www.canva.com/help/ai-access/ | officiel, **lu en résumé seulement** | Exemple de prix flou à ne pas copier : trois plafonds en « ou », sans dire combien coûte un geste. |
| **Magnific (Freepik)** | Freepik redirige désormais vers magnific.com. Premium 20 $/mois, Plus 45 $, Pro 110 $ ; crédits « valid for 1 year, no monthly resets » ; coûts affichés par geste : Kling 3.0 Pro 1080p, 450 crédits les 5 s ; Veo 3.1 4K avec son, 2 080 crédits les 4 s ; Nano Banana 2 en 2K, 75 crédits l'image ; recharge « anytime », mais pour plus de crédits, « contact ». https://www.magnific.com/pricing | officiel | Bonne idée à reprendre : le coût affiché par geste et des crédits qui ne disparaissent pas chaque mois. |
| **Krea** | Gratuit : 100 unités par jour ; Basic, Pro, Max : unités mensuelles qui « do not roll over » ; une autre réponse de sa propre FAQ dit « unused units expire at the end of each billing cycle » et une troisième parle de report pour les comptes Entreprise ; recharges qui « expire after 90 days » ; trois grilles de prix différentes sur la même page. https://www.krea.ai/pricing | officiel | Exemple de ce qui fâche : règles contradictoires sur la même page. |
| **Photoroom** | Enquête d'avril 2026 auprès de 1 356 vendeurs abonnés : temps de retouche par image passé de 15 min à moins de 5 (médiane) ; 41 % utilisent le traitement par lots ; environ un tiers le « mannequin virtuel » ; 20 % des abonnés Max citent la vidéo comme raison de passer à la formule supérieure ; 59 % disent avoir perdu des ventes à cause de mauvaises photos ; seuls 180 ont mesuré un effet sur leurs ventes (médiane +30 %, « directional, not causal »). https://www.photoroom.com/industry-trends/product-photography-cost-for-smbs | éditeur (enquête sur ses propres clients) | Le geste le plus utilisé est le **lot** : « toutes mes photos d'un coup ». L'atelier doit savoir traiter tout le catalogue en une fois. |


### Leonardo, OpenArt, Photoroom : les « vidéos pour vendre » déjà rangées en modèles

- **Leonardo « Blueprints »** : des chaînes toutes prêtes, « The Blueprint will guide you through each simple step » ;
  exemple « Product Photography » : 1) déposer la photo du produit, 2) dire où il apparaît, 3) au choix, décrire le
  style. « Each Blueprint has its own token cost, which you can see before generating. » Aucune demande à écrire :
  « so you can focus on your creativity, not the prompt ». https://intercom.help/leonardo-ai/en/articles/12760267-blueprints-by-leonardo-ai
  — **officiel**. Selon une page de Leonardo lue en résumé seulement, un modèle « Product Spin » fait tourner le produit.
- **OpenArt, vidéo produit** : photo du produit, scène décrite, format, durée (jusqu'à 15 s sur la plupart des
  modèles), image de début et de fin au choix ; gestes donnés en exemple : la bouteille qui tourne, la boîte qui
  s'ouvre, la boisson versée, le produit dans des mains, un lent tour autour, un rapprochement. Promesse : « The
  product stays the same while the world around it changes », sans preuve. Visages « verrouillés » d'un mannequin
  inventé ; aucune règle écrite sur les vraies personnes ; aucun prix par vidéo affiché.
  https://openart.ai/features/ai-product-video-generator/ — **éditeur**.
- **Photoroom, « Product Animator »** : plus de 300 modèles rangés par familles (fêtes, beauté, cuisine, publicité,
  mouvement, Black Friday, Noël, déballage, vêtements, meubles…) ; « Each template shows you exactly what the camera
  movement and model action will look like » ; jusqu'à 4 photos du même produit sous plusieurs angles ; « sales-ready
  video in under 2 minutes » ; réservé aux formules Max et Ultra ; et Photoroom lui-même conseille de « review the
  completed video before publishing ». https://www.photoroom.com/tools/video-generator/templates — **éditeur**.
- **Ce que le Studio pourrait en faire :** les meilleurs ont tous la même forme : une famille, une vignette qui bouge,
  un bouton qui remplit tout, le prix avant. L'atelier fait pareil, mais SINA trie les modèles selon le moment de
  l'année et le produit du client (elle ne montre pas 300 modèles, elle en conseille trois).

### Ce qu'on sait de ce que les commerçants utilisent vraiment

- **Amazon** : seulement la moitié des images et vidéos créées par ses outils d'IA servent vraiment, « only half of
  the generative creative assets have actually been used, either in ad campaigns or store listings » (Amazon,
  17 septembre 2025) ; Amazon annonce +12 % de ventes en moyenne pour ceux qui s'en servent (chiffre d'Amazon).
  https://www.adexchanger.com/ai/amazon-ads-introduces-agentic-functions-to-its-generative-ai-creative-studio/ — presse
  (chiffres de l'éditeur). Selon des résumés non lus à la source : en Australie, plus de 12 % des annonceurs ont fait
  leur première vidéo de marque avec le générateur ; 74 % des petites entreprises utilisent ou essaient l'IA pour leur
  publicité (enquête d'Amazon).
- **Photoroom** (ci-dessus) : le lot et le gain de temps passent avant la beauté ; la vidéo fait monter en gamme une
  minorité (20 % des abonnés Max).
- **Ce que le Studio pourrait en faire :** une création qui reste dans un dossier est de l'argent perdu pour le client.
  Chaque création de l'atelier doit sortir avec sa destination proposée (« pour ta publication de dimanche ? ») et
  « Mes créations » doit montrer ce qui n'a encore servi nulle part.

### Ce qui perd un débutant (synthèse des pages lues)

1. **Le choix de cinquante modèles** sans dire lequel prendre (Higgsfield, OpenArt affichent deux listes de modèles
   différentes sur la même page).
2. **Des prix en crédits dont la valeur change** selon le modèle, la durée, la qualité, avec des règles d'expiration
   contradictoires (Krea, Canva) : impossible de savoir ce qu'il reste.
3. **La demande à écrire** : Higgsfield et Leonardo l'ont compris et sont passés aux modèles prêts.
4. **Le résultat qui change le produit** et qu'il faut « revoir avant de publier » (Higgsfield, Photoroom le disent
   eux-mêmes) : le débutant ne sait pas voir qu'une étiquette a changé.
5. **Une vidéo qui ne se retouche pas** et se paie à nouveau à chaque essai (Higgsfield).

---

## 2. Les modèles prêts de l'atelier (« vidéos pour vendre ») et les gestes de caméra

**Comment les présenter** (repris des meilleurs, **mon avis** pour l'adaptation) : une grille de vignettes qui bougent
toutes seules (comme Photoroom et Higgsfield), le nom en clair, la durée, le prix en pourcentage du budget sur le
bouton ; un clic remplit la demande (que le client voit et peut changer, mode « Ensemble ») ; SINA en épingle trois
selon la saison et le produit. Les vignettes d'exemple sont faites **par l'atelier lui-même**, sur des produits inventés
très différents, avec le nom de l'outil dessous (document du propriétaire, partie 4), jamais sur un projet d'essai
passé (règle de `CLAUDE.md`).

| Modèle (nom montré) | Ce qui se passe | Geste de caméra | Durée | Outil conseillé d'abord, puis secours | Garde-fous |
|---|---|---|---|---|---|
| Le produit qui tourne | Le produit seul, sur un socle, fait un tour lent | tour complet autour du produit | 5 s | Kling 3.0 en direct (image de début) ; Wan 3.0 à Francfort | le dos du produit n'existe pas sur la photo : demander une 2e photo, sinon un demi-tour seulement (**mon avis**) |
| Le moment cadeau | Le produit emballé, ruban, carte écrite par la marque | lent rapprochement | 5 à 8 s | Veo 3.1 Fast (son d'ambiance) ; Kling | aucune main sans accord ; le texte de la carte est posé par le Studio, pas dessiné par l'IA |
| Le déballage | La boîte s'ouvre, le produit apparaît | plongée puis rapprochement | 8 s | Kling (image de début et de fin) | **des mains seulement avec photo fournie ou accord écrit** (règle du propriétaire : les mains comptent) ; sinon la boîte s'ouvre seule |
| Le produit dans la vraie vie | Le produit à sa place (cuisine, salle de bains, atelier) | travelling latéral lent | 5 à 8 s | Veo 3.1 Lite (moins cher) ; Wan | décor créé, produit = la vraie photo détourée en image de départ |
| Les détails | Matière, couture, étiquette nette | macro, rapprochement très lent | 5 s | Kling | l'étiquette se dégrade en vidéo (rapport du 21 novembre) : relire image par image |
| L'avant et l'après | Une pièce, un chantier, un objet avant puis après | volet qui glisse, ou deux plans montés | 6 à 10 s | aucun modèle vidéo : montage des deux vraies photos par le Studio (ffmpeg) | **jamais d'« après » inventé** : seulement deux vraies photos du client (règle « rien d'inventé ») |
| L'offre du moment | Le produit, le prix ou la remise écrite en grand, la date de fin | rapprochement puis arrêt sur image | 6 à 8 s | plan animé (Kling ou Wan) + texte posé par le Studio | seulement une offre que le client a saisie ; aucune urgence inventée |
| La publicité de 15 secondes | 3 plans + texte à l'écran + musique + logo à la fin | coupes sur le rythme | 15 s | 3 plans Kling ou Wan, montage du Studio, musique ElevenLabs | relecture de chaque plan, sous-titres, zones libres pour l'interface des réseaux |

**Les gestes de caméra** à nommer en français (douze suffisent, **mon avis**, à partir des listes de Higgsfield et
d'OpenArt) : tour autour du produit, demi-tour, rapprochement lent, éloignement qui révèle le décor, travelling
latéral, plongée, contre-plongée, rapprochement très lent sur un détail, panoramique, plan fixe qui respire, arrêt sur
image, caméra à la main légère. Chez Kling, le mouvement de caméra imposé, l'image de fin et les masques ne se
combinent pas dans une même demande (« image_tail, dynamic_masks/static_mask, and camera_control are mutually
exclusive ») ; sans réglage, le modèle choisit seul le mouvement d'après la phrase. Source : copie non officielle de la
documentation de Kling, lue en résumé — **à vérifier sur la documentation officielle**. Le Studio écrit donc le geste
dans la demande (comme les « Recreate » de Higgsfield), et n'utilise le réglage de caméra que là où il est documenté.

**Ce que le Studio a déjà** : `src/lib/engine/videos.ts` sait monter une vidéo (plans, texte, sous-titres, musique) avec
`src/lib/media/video.ts`, appeler un plan animé (`aiClip`) et le contrôler image par image (`aiQcImage`, `aiQcScene`) ;
`src/lib/media/music.ts` et `song.ts` composent une musique sur place, sans fournisseur. Les modèles de vidéo inscrits
dans `src/lib/ai/media-models.ts` sont encore Veo 3.0/3.1 par l'API Gemini (qui ne l'offre plus) et Kling par fal :
aucun Kling en direct, aucun Seedance, aucun Wan vidéo, aucun Veo par Vertex.

---

## 3. Le construire avec les fournisseurs accordés, et ce que coûte chaque geste

### Les capacités utiles, fournisseur par fournisseur

| Fournisseur accordé | Ce qui sert à l'atelier | Preuve |
|---|---|---|
| **OpenAI, GPT-Image 2.6** (Flare et Sunburst) | Images de référence multiples (rôle de chaque image à dire), plusieurs versions (`n`), retouche par zone (masque « entirely prompt-based », peut déborder ; ou `markup`, une zone entourée sur la 1re image), fond transparent (PNG ou WebP), sortie SVG « through the Image API », réglage `complexity` (bas, moyen, haut, sans surcoût), modération `auto` ou `low`. Limites dites par OpenAI : placement précis du texte, mise en page stricte, cohérence d'un élément d'une image à l'autre. | officiel : https://developers.openai.com/api/docs/guides/image-generation |
| **Google, API Gemini** (Nano Banana) | Nano Banana 2.1 (nouveau, le moins cher), 2, Pro : retouche avec images de référence. Gemini Omni 1.2 Flash : vidéo de 3 à 15 s, avec son. | officiel : https://aistudio.google.com/docs/pricing |
| **Google, Vertex** | Veo 3.1 Fast et Lite (accordés) : vidéo avec ou sans son, image de début, image de début et de fin, références, prolongement. Sur le même compte, mais **pas encore accordés pour cet usage** : « Imagen Product Recontext » (1 à 3 photos du même produit, une phrase pour la scène, 0,12 $), agrandissement Imagen 4 (0,06 $), essayage virtuel (0,06 $). | officiel : https://cloud.google.com/vertex-ai/generative-ai/pricing |
| **Black Forest Labs** (Flux) | FLUX.2 (pro, max, flex, klein) avec images de référence ; FLUX.1 Kontext (retouche guidée) ; FLUX.1 Fill (retouche par zone, retrait d'un objet, agrandir le cadre) ; FLUX Outpainting (faire la version story d'une image carrée). Pas de détourage ni d'agrandissement d'image dans la grille. | officiel : https://bfl.ai/pricing |
| **Alibaba** (Qwen, Wan) | Qwen-Image 3.0 et 2.1 à Francfort ; Qwen-Image-Edit (prix lu le matin à Singapour : 0,045 $, absent de la grille de Francfort lue aujourd'hui) ; Wan 3.0 vidéo à Francfort ; Wan 2.7 « videoedit » (Singapour). | officiel : https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| **Kling** (en direct) | Vidéo à partir d'une image, image de fin, éléments multiples (1 à 4 images), essayage virtuel ; Kling 4.0 existe désormais (vu chez Runware et Magnific), non relevé en direct. | page des prix en direct illisible aujourd'hui (application) ; prix du 18 novembre (référence, partie 16) |
| **Seedance** (ByteDance) | Vidéo avec son ; accord du 21 novembre 2026, texte à compléter. | prix du 18 novembre (BytePlus) |
| **Runware** (seul secours) | Un seul accès à 425 modèles payants ; détourage (BiRefNet, Bria RMBG 2.0, RemBG), agrandissement (Topaz Wonder 4 à 0,0428 $ l'image), retrait d'objet (FLUX Erase, Object Eraser), retouche par zone (FLUX Fill), vectorisation ; Kling 4.0 vidéo à 0,157 $ la seconde en 720p ; données « EU & US » ; « content you upload remain private and are not shared or used for training ». Attention : plusieurs de ces outils sont d'Ideogram (écarté) ou de Bria (non accordé). | officiel : https://runware.ai/pricing · https://runware.ai/docs/tools/remove-background |
| **ElevenLabs** | Voix v3 0,08 $ les 1 000 caractères (Flash 0,04 $), musique 0,15 $ la minute, bruitages 0,12 $ la minute ; musique « Commercial use licensing on Starter+ plans ». | officiel : https://elevenlabs.io/pricing/api |

**Le détourage n'a besoin d'aucun fournisseur** : le Studio détoure déjà sur sa machine (`src/lib/media/cutout.ts`,
modèle embarqué), trie les photos, contrôle chaque détourage et garde la raison d'un refus (`src/lib/engine/cutouts.ts`).
Le matin proposait Bria par fal : inutile.

### Prix de chaque geste en part du budget d'IA du mois

Budget d'un mois courant (40 % du prix hors taxes) : **23,00 €** (69 €), **33,00 €** (99 €), **56,33 €** (169 €) ;
premier mois (50 %) : 28,75 €, 41,25 €, 70,42 €. Prix officiels lus aujourd'hui, sauf Kling et Seedance (18 novembre).

| Geste | Fournisseur | Prix officiel | En euros | 69 € | 99 € | 169 € |
|---|---|---|---|---|---|---|
| Image créée (scène, publication) | OpenAI GPT-Image 2.6, mesure du Studio | — | 0,050 € | 0,22 % | 0,15 % | 0,09 % |
| Même chose, borne prudente du Studio | OpenAI (`config.ts`) | 0,12 $ | 0,109 € | 0,47 % | 0,33 % | 0,19 % |
| Retouche avec la photo du produit | Nano Banana 2.1, 1K | 0,0336 $ | 0,031 € | 0,13 % | 0,09 % | 0,05 % |
| Même chose en 2K | Nano Banana 2.1 | 0,0504 $ | 0,046 € | 0,20 % | 0,14 % | 0,08 % |
| Retouche fine | Nano Banana Pro, 1K ou 2K | 0,134 $ | 0,122 € | 0,53 % | 0,37 % | 0,22 % |
| Image avec une référence | FLUX.2 pro (1 Mpx + 1 référence) | 0,045 $ | 0,041 € | 0,18 % | 0,12 % | 0,07 % |
| Retouche guidée | FLUX.1 Kontext pro | 0,04 $ | 0,036 € | 0,16 % | 0,11 % | 0,06 % |
| Retirer un objet, retoucher une zone | FLUX.1 Fill pro | 0,05 $ | 0,045 € | 0,20 % | 0,14 % | 0,08 % |
| Faire la version story (agrandir le cadre) | FLUX Outpainting fast, 1 Mpx | 0,045 $ | 0,041 € | 0,18 % | 0,12 % | 0,07 % |
| Retouche | Qwen-Image-Edit (Singapour, lu le matin) | 0,045 $ | 0,041 € | 0,18 % | 0,12 % | 0,07 % |
| Détourer le produit | machine du Studio | 0 | 0 | 0 % | 0 % | 0 % |
| Relecture d'une image par le juge | modèle le plus fort (mesure du 21 novembre) | — | 0,03 € | 0,13 % | 0,09 % | 0,05 % |
| Vidéo 8 s, 720p, avec son | Veo 3.1 Lite (Vertex) | 0,40 $ | 0,364 € | 1,58 % | 1,10 % | 0,65 % |
| Vidéo 8 s, 1080p, avec son | Veo 3.1 Lite | 0,64 $ | 0,582 € | 2,53 % | 1,76 % | 1,03 % |
| Vidéo 8 s, 1080p, avec son | Veo 3.1 Fast | 0,96 $ | 0,874 € | 3,80 % | 2,65 % | 1,55 % |
| Vidéo 8 s, 720p, avec son | Gemini Omni 1.2 Flash | ≈ 0,56 $ | 0,510 € | 2,22 % | 1,54 % | 0,90 % |
| Vidéo 5 s, 720p, avec son | Kling 3.0 en direct | 0,63 $ | 0,573 € | 2,49 % | 1,74 % | 1,02 % |
| Vidéo 10 s, 720p, avec son | Kling 3.0 en direct | 1,26 $ | 1,146 € | 4,98 % | 3,47 % | 2,04 % |
| Vidéo 5 s, 720p, avec son | Seedance 2.0 | 0,76 $ | 0,692 € | 3,01 % | 2,10 % | 1,23 % |
| Vidéo 5 s, 720p | Wan 3.0 à Francfort | 0,41 $ | 0,375 € | 1,63 % | 1,14 % | 0,67 % |
| Musique de 30 s | ElevenLabs | 0,075 $ | 0,068 € | 0,30 % | 0,21 % | 0,12 % |
| Voix de 150 caractères | ElevenLabs v3 | 0,012 $ | 0,011 € | 0,05 % | 0,03 % | 0,02 % |

Remarques :
- Prix de Wan 3.0 à Francfort : la page d'Alibaba les marque comme remisés de 30 % « for a limited time » ; à revoir.
- Gemini Omni 1.1 passe automatiquement au prix de la 1.2 à partir du 3 décembre 2026 (page officielle).
- Un essai sur deux est souvent refusé à la relecture en vidéo (praticiens, rapport du 21 novembre, preuve faible) :
  **le pourcentage annoncé au client doit compter la relecture et une reprise probable** (proposition du matin,
  maintenue, **mon avis**). Exemple : une vidéo de 8 s Veo 3.1 Lite en 720p au forfait 69 € = 1,58 % + relecture de
  quelques images + une reprise sur deux ≈ « environ 3 % de ton budget ».
- Ordre de grandeur : au forfait 69 €, le budget d'un mois courant paie environ 460 images créées (mesure de 0,05 €)
  ou environ 63 vidéos de 8 s Veo 3.1 Lite en 720p, avant relecture et reprises. La vidéo est donc ce qui épuise le
  budget ; les images, presque jamais.

---

## 4. Le respect du produit, et le contrôle avant de montrer

### Ce que montrent les tests publiés

- **Une retouche qui redessine le produit change son étiquette.** Test du 6 octobre 2026, même photo d'un flacon de
  savon à petite étiquette, même consigne (« Change the background to a terrazzo counter. »), un essai par modèle :
  FLUX.2 [pro] a changé les contenances (« 300 ml · 10.1 fl oz » devenu « 200 ml · 100 fl oz ») et un mot
  (« EFFECTIVE » → « SFFECTIVE ») ; Nano Banana 2.1 a gardé les contenances mais changé « GENTLE » en « GONTLE » ;
  avec une consigne longue « garde chaque mot », Nano Banana 2.1 a tout gardé, et Flux a refusé la demande (règle de
  contenu). L'auteur le dit lui-même : quelques essais, une tendance, pas une mesure.
  https://fuser.studio/articles/flux-2-vs-nano-banana — **test** (petit, par un vendeur d'outil qui ne vend ni l'un ni
  l'autre).
- **Le test du matin** (sept générateurs, six vrais produits : « Zero tools produced output usable as a final
  e-commerce listing image ») reste le plus large lu. https://creatsy.com/blog/1752128853-we-tested-every-ai-mockup-generator-in-2026-heres-what-actually-works-and-what-doesnt — **test**.
- **Les éditeurs eux-mêmes ne promettent rien** : Photoroom (« designed to keep the original product recognisable »,
  et « review the completed video before publishing ») ; Higgsfield (« review before publishing ») ; Pomelli ne parle
  pas de fidélité ; OpenArt l'affirme sans preuve.
- **La recherche** : EdiVal-Agent (ICLR 2026) mesure la constance des objets non modifiés au fil de plusieurs
  retouches sur 16 modèles, https://arxiv.org/abs/2509.13399 — **étude**, lue en résumé seulement ; selon le résumé
  du moteur de recherche, GPT-Image-1 (ancien modèle, arrêté) y était parmi les moins constants.

### La méthode à suivre (le Studio l'a déjà en partie)

Le code le dit déjà : « Les pixels du produit ne sont jamais régénérés : toutes les compositions réutilisent ce
détourage » (`src/lib/media/cutout.ts`) ; « Le produit est toujours dessiné à partir de ses pixels d'origine ; les
textes sont composés typographiquement » (`src/lib/media/compose.ts`). L'atelier doit garder cette seule façon de faire
pour tout ce qui touche au produit (**mon avis** pour l'enchaînement) :

1. **Détourer** la vraie photo (machine du Studio, déjà fait) ; refuser une photo où le produit est coupé (déjà fait :
   `incompleteProductPhotos`).
2. **Créer la scène** avec le produit donné en référence (OpenAI, pour placer l'ombre, la lumière et la taille).
3. **Reposer les vrais pixels** du détourage à l'endroit où le modèle a placé le produit, puis fondre l'ombre et la
   lumière autour (retouche par zone limitée au bord). Ainsi l'étiquette est celle de la photo, au pixel près.
4. **Contrôler avant de montrer** : a) mesure locale (le produit de l'image finale comparé au détourage, forme, couleur,
   texte) ; b) le juge (modèle le plus fort, une image à la fois, note de 8 sur 10 au moins, liste de défauts) lit
   l'étiquette mot à mot contre la photo d'origine ; c) une image refusée est dite refusée et montrée comme telle au
   client (règle du propriétaire).
5. **En vidéo**, la vraie photo est l'image de départ ; le juge regarde plusieurs images de la vidéo (le Studio a
   déjà `aiQcImage` et `aiQcScene`) ; un plan où l'étiquette se déforme est refusé ; quand une scène l'exige (le
   produit qui tourne), SINA demande d'abord une photo du dos plutôt que de laisser l'IA l'inventer.

Ce qu'il faut savoir : quand le client choisit lui-même un outil et écrit « redessine mon produit » (mode « Je fais
moi-même »), le contrôle obligatoire du produit s'applique quand même (document du propriétaire, partie 3) : la
création peut être faite, mais elle est marquée « produit modifié » et ne part pas vers la boutique.

---

## 5. Les garde-fous d'un outil ouvert aux clients

### Modération des demandes et des images

- **OpenAI** : `omni-moderation-latest` lit le texte et les images ; **gratuit** (« The moderation endpoint is free to
  use ») ; images jusqu'à 20 Mo. Mais sur les images, seules six familles sont lues (automutilation sous trois formes,
  sexuel, violence, violence choquante) ; « harassment, hate, illicit, sexual/minors » sont « Text only ». OpenAI
  conseille d'en faire un signal, pas un blocage automatique. https://developers.openai.com/api/docs/guides/moderation
  — **officiel**. Elle ne dit rien des **vraies personnes**, des **marques d'autrui** ni des **mineurs sur une image** :
  le Studio doit les contrôler lui-même.
- **Ce que le Studio a déjà** : `src/lib/people-policy.ts` (repère les mots qui désignent une personne, phrase
  « No people… no hands, no body parts, no silhouettes » ajoutée aux demandes ; personnes permises seulement si le
  réglage du projet l'autorise ou si le client a fourni une photo marquée « avec une personne » ; une personne ajoutée
  sans autorisation fait refuser l'image) ; la modération d'OpenAI laissée au niveau par défaut. Limite pour un outil
  ouvert : une seule photo avec une personne ouvre les personnes pour tout le projet, sans accord de la personne
  montrée.
- **Ce que le Studio pourrait en faire :** passer chaque demande libre et chaque image envoyée par le client par la
  modération gratuite d'OpenAI, puis par le contrôle des personnes déjà écrit, puis par le juge pour l'image finale
  (personne, marque d'autrui, texte illisible) ; jamais le niveau de modération « low ».

### Personnes réelles et droit à l'image

- **Code pénal, article 226-8** (modifié par la loi du 21 mai 2024, dite SREN) : la diffusion d'un contenu créé par
  traitement algorithmique représentant l'image ou la voix d'une personne sans son consentement est punie ; la CNIL
  écrit : « un an emprisonnement et de 15 000 € d'amende », peines « plus lourdes » en ligne ou à caractère sexuel.
  https://cnil.fr/fr/hypertrucage-deepfake — **officiel** (CNIL) ; texte exact de l'article non lu (Légifrance refuse
  les robots).
- **Ce que le Studio pourrait en faire :** la règle du propriétaire va plus loin que la loi et suffit : aucune
  personne, main ou silhouette sans photo fournie et accord écrit ; dans l'atelier, une case d'accord écrite par la
  personne montrée, gardée avec la photo (`peopleConsent` existe déjà dans `src/lib/media/provenance.ts`, sans preuve
  d'accord aujourd'hui) ; jamais l'avatar ou le « mannequin virtuel » de Higgsfield, OpenArt ou Photoroom.

### La loi française « Images retouchées » et « Images virtuelles »

- **Texte officiel** (ordonnance n° 2024-978 du 6 novembre 2024, Journal officiel du 7 novembre 2024, lue en entier
  sur le texte notifié à la Commission) : « Les contenus communiqués par les personnes mentionnées à l'article 1er […]
  comprenant des images ayant fait l'objet : 1° D'une modification par tout procédé de traitement d'image visant à
  affiner ou à épaissir la silhouette ou à modifier l'apparence du visage sont accompagnés de la mention : "Images
  retouchées" ; 2° D'une production par tout procédé d'intelligence artificielle visant à représenter un visage ou une
  silhouette sont accompagnés de la mention : "Images virtuelles". » Peine : un an de prison et 4 500 € d'amende. Les
  personnes visées (article 1er) : celles qui, « à titre onéreux, mobilisent leur notoriété auprès de leur audience »
  pour promouvoir des biens ou des services. https://technical-regulation-information-system.ec.europa.eu/en/notification/26042/text/F/FR
  — **officiel**. (Le matin écrivait « image virtuelle » au singulier : le texte en vigueur dit « Images virtuelles ».)
- **Le décret du 4 mai 2017** (« Photographie retouchée » sur les photos commerciales de mannequins dont la silhouette
  est modifiée) : lu seulement par l'article du matin.
- **Ce que le Studio pourrait en faire :** un commerçant qui vend ses propres produits n'est pas clairement « une
  personne qui mobilise sa notoriété à titre onéreux » : à faire confirmer par un juriste. Mais dès qu'une image de
  l'atelier montre un visage ou une silhouette créés par l'IA (seulement avec accord), SINA pose « Images virtuelles »,
  et « Images retouchées » si une silhouette ou un visage fourni a été modifié : c'est sans risque et simple.

### Le marquage « fait par l'IA » : AI Act article 50 et signature C2PA

- **Commission européenne** : « providers must ensure that AI-generated or manipulated content are marked in a
  machine-readable format » ; pour les systèmes mis sur le marché avant le 2 août 2026, « only as from 2 December
  2026 » ; le marquage ne vaut pas pour « an assistive function for standard editing » ; ceux qui utilisent l'outil
  (« deployers ») doivent dire qu'un hypertrucage en est un et « cannot simply rely on the machine-readable marking
  embedded in the content by the provider ». https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act
  — **officiel**. Selon des sites de juristes lus en résumé : code de bonne conduite final le 10 juin 2026, avec deux
  couches (métadonnées signées et filigrane invisible).
- **Le Studio est probablement « fournisseur »** d'un système d'IA à son nom (il assemble des modèles d'autres sous
  la marque du Studio) : la page de la Commission ne tranche pas ce cas ; **à faire confirmer par un juriste**. Si oui,
  le délai est le **2 décembre 2026**, dans dix jours, ou dès l'ouverture si l'atelier ouvre après le 2 août 2026
  (selon un site de juristes lu en résumé).
- **OpenAI** : ses images portent une signature C2PA et un filigrane SynthID, mais « Editing, converting, or sharing a
  file can remove its metadata » ; vérification gratuite par `POST /v1/content_provenance_checks`.
  https://developers.openai.com/api/docs/guides/content-provenance — **officiel**.
- **Constat dans le code (vérifié)** : `sharp` efface par défaut toutes les métadonnées (« By default all metadata will
  be removed », https://sharp.pixelplumbing.com/api-output, **officiel**) et le Studio n'appelle jamais
  `keepMetadata` ni `withMetadata` ; ses compositions passent aussi par `@napi-rs/canvas`, qui repart d'une image vide.
  Donc **toute image retouchée, recadrée ou composée par le Studio perd la signature d'OpenAI**. Les signatures C2PA
  ne survivent de toute façon pas à une composition : il faut que le Studio **signe lui-même** l'image finale.
- **Outil libre pour signer** : `@contentauth/c2pa-node` (Content Authenticity Initiative, licence MIT, lit, vérifie et
  ajoute un manifeste signé). https://opensource.contentauthenticity.org/docs/c2pa-node — **officiel** (lu en résumé).
  Il faut un certificat de signature : [À compléter : fournisseur et prix d'un certificat ; décision du propriétaire].
- **Les réseaux** (rapport du matin) : Meta et TikTok lisent C2PA et étiquettent seuls.

### Les conditions de revente de chaque fournisseur accordé

| Fournisseur | Ouvrir à nos clients dans le Studio | Ce qu'il impose | Preuve |
|---|---|---|---|
| OpenAI | Oui ; les créations appartiennent au client ; revendre l'accès seul est interdit | modération ; ne pas retirer les filigranes par des essais répétés | relevé du 18 novembre (partie 16) ; page de provenance ci-dessus |
| Google (API Gemini, Vertex) | Oui ; **dans l'Union européenne, seulement dans un service payant** (le Studio l'est) | filigrane SynthID | relevé du 18 novembre |
| Black Forest Labs | Oui, contrat européen ; aucune mention de marque | **des conditions à faire accepter par nos clients** | relevé du 18 novembre ; https://bfl.ai/legal/eu-developer-terms-of-service |
| Kling | Oui dans une application ; revendre l'accès seul interdit ; texte « un peu ambigu » | — | relevé du 18 novembre |
| Alibaba | Oui ; revendre l'accès seul interdit | — | relevé du 18 novembre |
| Seedance | Oui depuis l'accord écrit du 21 novembre 2026 | [À compléter : texte de l'autorisation, vérification des clients, modération, mention IA] | référence, partie 16 |
| Runware | Oui ; droits commerciaux obtenus auprès des fabricants ; aucun entraînement sur nos fichiers | — | https://runware.ai/pricing |
| **ElevenLabs** | **Seulement avec ses conditions « OEM »**, qui interdisent l'intégration aux comptes Free, Starter, Creator et Pro : « you are expressly prohibited from Making Available the Services or any Bundled Service » ; chaque client doit accepter des conditions au moins aussi strictes que celles d'ElevenLabs ; aucune vente du service seul. Ses conditions générales donnent aussi à ElevenLabs une licence « perpetual, irrevocable » pour utiliser les contenus afin d'« improve the Services ». | à vérifier : l'offre du compte du Studio, et une option sans entraînement | officiel : https://elevenlabs.io/oem-terms · https://elevenlabs.io/terms-of-use |

**Ce que le Studio pourrait en faire :** une seule page de conditions de l'atelier, acceptée une fois par le client,
qui reprend les obligations de chaque fournisseur (BFL, ElevenLabs, Seedance) ; tant que la formule ElevenLabs du
Studio n'est pas vérifiée, la musique de l'atelier reste celle que le Studio compose lui-même (`song.ts`).

---

## 6. L'économie : comment vendre la création sans fâcher

### Ce que font les autres, et ce qu'on leur reproche

| | Unité vendue | Ce qui reste d'un mois sur l'autre | Ce qui fâche |
|---|---|---|---|
| Higgsfield | crédits ; prix sur le bouton | rien, crédits perdus au renouvellement | « illimité » limité et lent, crédits perdus, remboursements refusés (avis, rapport du matin) |
| Magnific (Freepik) | crédits, coût affiché par modèle | « valid for 1 year, no monthly resets » | recharge sans prix publié (« contact ») |
| Krea | unités de calcul | rien, recharges valables 90 jours | trois règles contradictoires et trois grilles de prix sur la même page |
| Canva | « usages » en trois niveaux, en « ou » | rien, remise à zéro à la date anniversaire | on ne sait pas ce que coûte un geste ; l'usage réel est « on the lower end » (lu en résumé) |
| Leonardo | jetons, coût affiché avant | non lu | non lu |

### Ce que le Studio devrait faire pour être clair (**mon avis**)

1. **Une seule jauge** : le budget d'IA du mois, en pourcentage, déjà dans le code (`src/lib/ai/budget-pct.ts`,
   « ≈ 3 % de votre budget IA ») ; pas de deuxième monnaie (« crédits ») pour l'atelier.
2. **Le prix sur le bouton**, avant de lancer, chaîne entière comptée (création, relecture, une reprise probable) ;
   puis le vrai coût décompté (déjà le principe de `retryNotice` : « Une 2e image a été nécessaire… »).
3. **Une image refusée par le contrôle ne coûte rien au client** quand c'est l'outil qui a raté (le Studio paie la
   reprise sur sa marge) ; une version refusée par goût est comptée, et c'est dit avant. [Décision du propriétaire :
   c'est son argent.]
4. **Un plafond de vidéo par forfait**, dit en clair : les forfaits validés prévoient 0, 3 et 6 vidéos par mois ;
   l'atelier ne doit pas permettre de dépenser tout le budget du mois en vidéos le premier jour (au forfait 69 €,
   63 vidéos de 8 s suffiraient à le vider). Proposition : la vidéo libre de l'atelier puise dans le même compte que
   les vidéos du forfait ; au-delà, une recharge.
5. **Une recharge simple** si le propriétaire la veut : un montant fixe, valable jusqu'à son épuisement (jamais perdu
   à la fin du mois, l'inverse de Higgsfield et Krea), montrée aussi en pourcentage. [Décision du propriétaire au lot des
   forfaits.]
6. **Jamais « illimité »**, jamais de prix flou, jamais d'euros d'IA montrés au client.

---

## 7. SINA dans l'atelier, à chaque étape

| Étape | Ce que SINA fait avec l'atelier (les mêmes gestes que le client, une seule façon de faire) |
|---|---|
| **La marque** | Les scènes de la planche de marque : vraie photo détourée posée dans des décors créés par OpenAI à la direction artistique choisie ; le logo reste fait par OpenAI selon les règles déjà écrites (aucune autre voie). |
| **Le site** | La grande photo d'ouverture avec le vrai produit, en version large et haute du même décor ; « Ta photo ici » tant que le produit n'a pas de vraie photo (règle du 17 novembre) ; le clic sur l'aperçu (« change cette photo ») ouvre l'atelier sur cette photo-là. |
| **Les publications** | Le modèle prêt qui va avec le jour du calendrier (fête, saison, nouveauté), les trois versions très différentes, le carré et la story, le logo posé ; l'engagement 2 (« Envoie une photo, SINA fait le reste ») et 8 (« Le studio photo de poche ») passent par l'atelier. |
| **Les publicités** | Une version par angle gardé en réserve, aux formats carré, portrait et story, avec « Images virtuelles » ou la mention IA quand il le faut ; aucune dépense de diffusion. |
| **Le suivi du mois** | Dans le point du mois : ce qui a été créé, ce qui a servi et ce qui dort dans « Mes créations » (leçon d'Amazon : la moitié ne sert jamais), avec une proposition d'usage pour chacune. |
| **Les grands moments** | Trois semaines avant (engagement 3), SINA prépare la vidéo « moment cadeau » ou « offre du moment » avec l'offre que le client a saisie. |
| **Les vidéos (en dernier)** | Image fixe validée d'abord, puis animation (Veo 3.1 Lite ou Wan pour l'essai, Kling ou Veo 3.1 Fast quand la qualité le demande, en le disant avant), montage par le Studio, musique, relecture image par image. |
| **En direct, mode « Ensemble »** | Elle dit quel modèle prêt et quel outil, et pourquoi, en une phrase ; elle prend le moins cher qui suffit ; « Améliorer ma demande avec SINA » montre ses ajouts à part ; elle prévient avant un risque (« ton étiquette risque de changer avec cet outil : je repose ta vraie photo par-dessus »). |

---

## 8. Points qui contrediraient une règle du propriétaire (signalés, non recommandés)

- **Avatars, « mannequins virtuels », vidéos « face caméra »** de Higgsfield, OpenArt et Photoroom : contraires à
  « jamais de personne sans photo fournie ou accord écrit ». Non repris.
- **Essayage virtuel** (Kling, Vertex à 0,06 $) : seulement avec la photo d'une vraie personne fournie et son accord
  écrit.
- **Outils d'Ideogram et de Bria proposés par Runware** (détourage, retrait d'objet) : Ideogram est écarté, Bria n'est
  pas accordé ; même par Runware, ce serait un nouveau fabricant. Non repris (le Studio détoure déjà seul).
- **Images de SINA faites par un autre qu'OpenAI** : la règle dit OpenAI pour toutes les images de SINA. Nano Banana
  garde parfois mieux une étiquette (test Fuser), mais avec la méthode « vrais pixels reposés », OpenAI suffit ; les
  autres outils restent au choix du client dans l'atelier. Toute exception serait à demander au propriétaire.
- **Imagen Product Recontext et l'agrandissement Imagen sur Vertex** : même compte que Veo, mais l'accord du
  18 novembre vise Veo 3.1 Fast et Lite ; à demander avant usage.
- **Modération « low » d'OpenAI** : jamais pour un outil ouvert aux clients.
- **Avant-après « créé »** : un « après » inventé serait une promesse inventée ; seulement deux vraies photos.

## 9. Pas vérifié

- Les prix de Kling et de Seedance en direct aujourd'hui (pages en application, illisibles par mes outils) : chiffres du
  18 novembre ; le prix de Kling 4.0 en direct.
- Le texte de l'autorisation de ByteDance pour Seedance. [À compléter]
- Le prix de Qwen-Image-Edit à Francfort ; la fin de la remise de 30 % sur Wan 3.0.
- Le texte consolidé de l'article 226-8 du code pénal et du décret « Photographie retouchée » (Légifrance bloque la
  lecture automatique) ; savoir si un commerçant qui vend ses produits est visé par l'article 1er de la loi de 2023.
- Si le Studio est « fournisseur » au sens de l'article 50 de l'AI Act, et donc tenu au marquage au 2 décembre 2026 :
  question pour un juriste.
- La formule ElevenLabs du compte du Studio, et si elle permet l'intégration (conditions OEM) sans entraînement.
- Les conditions européennes de Black Forest Labs à faire accepter par nos clients (lues le 18 novembre seulement).
- Les limites d'IA de Canva (page bloquée, lue en résumé) ; les prix de Claid, Pebblely, Flair, Recraft, Adobe Express
  (pages en application ou non trouvées) ; aucun chiffre d'usage publié pour eux.
- Les capacités exactes de Kling 3.0 et 4.0 (mouvement de caméra, image de fin, éléments) : lues sur une copie non
  officielle.
- Que la méthode « vrais pixels reposés » donne une image naturelle (ombre, reflets) avec GPT-Image 2.6 : à prouver
  par un petit essai payant, avec l'accord du propriétaire.
- Aucun appel réel n'a été fait à aucun fournisseur.

## 10. Les pages les plus utiles lues

1. https://higgsfield.ai/creator-hub/help-center/tools-and-workflows/how-do-i-use-marketing-studio-to-create-video-ads
2. https://aistudio.google.com/docs/pricing (Nano Banana 2.1, Gemini Omni 1.2)
3. https://cloud.google.com/vertex-ai/generative-ai/pricing (Veo 3.1 Fast et Lite, Product Recontext)
4. https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act
5. https://elevenlabs.io/oem-terms
6. https://fuser.studio/articles/flux-2-vs-nano-banana
7. https://technical-regulation-information-system.ec.europa.eu/en/notification/26042/text/F/FR (ordonnance de 2024)

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Le compteur de l'atelier dans la jauge du mois** : chaque geste affiche son prix en pourcentage, chaîne entière
   comptée, avant de lancer ; un plafond de vidéos par forfait. *Le client voit :* « Vidéo de 8 secondes : environ
   3 % de ton budget du mois » sur le bouton, et sa jauge qui baisse après.
2. **Les garde-fous d'entrée** : modération gratuite d'OpenAI sur chaque demande libre et chaque image déposée,
   contrôle des personnes, accord écrit de la personne montrée gardé avec sa photo, page de conditions de l'atelier
   acceptée une fois. *Le client voit :* une phrase claire quand une demande est refusée, et pourquoi.
3. **« Mets mon produit dans une scène »** avec la méthode « vrais pixels reposés » et le juge qui lit l'étiquette.
   *Le client voit :* son vrai produit, étiquette nette, dans une scène à sa marque ; une image ratée est dite ratée.
4. **La signature C2PA posée par le Studio** sur chaque image finale (et ne plus effacer celle d'OpenAI quand rien n'est
   composé), avant le 2 décembre 2026 si un juriste confirme. *Le client voit :* rien de plus ; les réseaux
   reconnaissent seuls une image faite par l'IA.
5. **Les gestes simples sur une image** : changer le fond, version story ou carrée (agrandir le cadre par Flux),
   retirer un objet, et le lot « toutes mes photos d'un coup ». *Le client voit :* trois boutons sous chaque image et
   un bouton « tout mon catalogue ».
6. **« Mes créations »** rangées par projet, avec l'outil, la date, le coût en pourcentage, et ce qui n'a encore servi
   nulle part ; un clic vers une publication, une publicité ou le site. *Le client voit :* « 3 créations n'ont pas
   encore servi : je les mets dans ton calendrier ? ».
7. **SINA en direct sur ces gestes** (les trois façons : SINA seule, ensemble, moi-même) : conseil d'outil en une
   phrase, « Améliorer ma demande avec SINA » avec ses ajouts à part, avertissement avant un risque. *Le client voit :*
   SINA qui commente son choix et propose la suite.
8. **Le choix de l'outil par le client** parmi les fournisseurs accordés, chacun avec une ligne « ce qu'il fait de
   mieux » et son prix ; branchements en direct (Kling, Vertex, Black Forest Labs), Runware en secours, fal retiré.
   *Le client voit :* quatre ou cinq outils, pas cinquante, avec celui que SINA conseille marqué.
9. **Les modèles prêts en images** (publications de fête, offre du moment, nouveauté) avec vignette d'exemple et un
   clic qui remplit la demande. *Le client voit :* une grille de modèles, trois épinglés par SINA pour la saison.
10. **Les vidéos pour vendre** (au lot des vidéos) : les huit modèles de la partie 2, image fixe validée d'abord,
    douze gestes de caméra nommés en français, relecture image par image. *Le client voit :* une vignette qui bouge
    par modèle, la durée, le prix, et sa vidéo prête avec son logo à la fin.
11. **La musique et la voix** : musique composée par le Studio d'abord ; ElevenLabs seulement quand sa formule permet
    l'intégration. *Le client voit :* une musique à l'ambiance de sa marque, sans droits à payer.
12. **Les mentions obligatoires posées seules** : « Images virtuelles », « Images retouchées », mention IA des
    publicités quand une personne créée apparaît (seulement avec accord). *Le client voit :* la mention déjà en place,
    sans y penser.
