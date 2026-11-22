# Le coût des images de SINA : ce que dit OpenAI, ce qui est mesuré, et comment le diviser (22 novembre 2026)

Recherche faite sur Internet (pages officielles lues en entier, souvent dans leur version texte brute), et dans le code
du Studio. **Aucun appel payant** à OpenAI ni à un autre fournisseur. Aucun autre fichier du dépôt modifié.

**Niveaux de preuve** : **officiel** (page d'OpenAI ou d'Anthropic, ou code du calculateur officiel) ; **mesure**
(chiffre mesuré par quelqu'un sur de vraies factures ou de vrais compteurs) ; **test** (test indépendant publié, souvent
petit) ; **éditeur** (un vendeur qui parle de lui-même) ; **code** (lu dans le dépôt du Studio) ; **calcul** (mon calcul à
partir des chiffres officiels) ; **mon avis** (proposition non vérifiée). Prix en dollars comme chez OpenAI ; conversion
au taux du Studio (1 € = 1,0990 $, Banque centrale européenne, 20 novembre 2026).

---

## 0. Ce qu'il faut retenir en cinq phrases

1. **Le chiffre de 0,12 $ par image n'est pas un prix : c'est une borne de prudence écrite dans le Studio**, et le
   Studio s'en sert aussi pour **compter** ce qu'il dépense. Chaque image est donc comptée 0,12 $, même quand OpenAI en
   facture environ 60 % (partie 1.8, **code**).
2. **Le vrai prix d'une image de planche, d'après la formule officielle d'OpenAI, est de 0,05 à 0,09 $** tout compris
   (image produite, images jointes, texte de la demande, aperçus en cours de route) (partie 1, **officiel** et **calcul**).
3. **Baisser la qualité de « high » à « medium » ne fait gagner que 17 à 18 % sur la 2.6** (le modèle 2.6 consomme plus
   que le 2.5 en « low » et « medium ») : ce n'est pas le bon levier (partie 1.2, **officiel**).
4. **Les vrais leviers sont ailleurs** : compter juste, refaire moins (ordre de travail, contrôles gratuits avant de payer),
   choisir des formats qui consomment moins, garder en mémoire la partie fixe du relecteur, et produire en différé ce qui
   n'est pas urgent (parties 3 et 5).
5. **Avec le meilleur réglage trouvé, les images d'une marque à trois identités passent de 2,89 € comptés (1,97 €
   réellement payés) à environ 1,56 €, relectures comprises, à qualité égale ; les publications du mois, de 4,59 € à
   1,17 € pour 30** (parties 5 et 5.1, **calcul** à vérifier sur la première facture).

---

## 1. Le prix officiel d'une image gpt-image-2.6 (Flare et Sunburst)

### 1.1 Les tarifs au million de jetons

Page des prix d'OpenAI, partie « Images » (lue le 22 novembre 2026) : https://developers.openai.com/api/docs/pricing
— **officiel**.

| Modèle | Image jointe | Image jointe déjà lue (cache) | Image produite | Texte de la demande | Texte déjà lu |
|---|---|---|---|---|---|
| gpt-image-2.6-flare et gpt-image-2.6-sunburst, normal | 8 $ | 2 $ | 30 $ | 5 $ | 1,25 $ |
| les mêmes, colonne « Batch » (différé) | 4 $ | 1 $ | 15 $ | 2,50 $ | 0,625 $ |
| gpt-image-2.5 (Flare et Sunburst), normal | 8 $ | 2 $ | 30 $ | 5 $ | 1,25 $ |

- **Flare et Sunburst coûtent exactement la même chose au jeton.** Les pages des deux modèles sont identiques sauf le nom
  et la phrase de présentation (« fast iteration » pour Flare, « detailed visual work » pour Sunburst) :
  https://developers.openai.com/api/docs/models/gpt-image-2.6-flare et
  https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst — **officiel**.
- **OpenAI ne publie plus de prix par image** pour la 2.6 : « Image output costs $30 per million billable tokens. Use the
  calculator to estimate the output cost for one image. »
  https://developers.openai.com/api/docs/guides/image-generation#gpt-image-26-costs — **officiel**.
- **« Equal token rates don't mean equal cost per image: token consumption can differ by model and quality setting. »**
  (même page) — **officiel**.

### 1.2 Le calcul officiel des jetons d'une image produite

Le guide d'OpenAI contient un calculateur. Son programme est public (fichier
`https://developers.openai.com/_astro/GptImageTokenCalculator.react.ona8FVVe.js`, lu le 22 novembre 2026) : j'en ai
recopié la formule et je l'ai fait tourner sur ma machine, sans rien appeler chez OpenAI — **officiel** (formule) et
**calcul** (chiffres).

La formule, en mots simples :
1. chaque qualité a un nombre de base : low 16, medium 24, high 48, xhigh 64, max 96 (pour la 2.5 et la 2.6) ;
2. le grand côté de l'image reçoit ce nombre, le petit côté le même nombre divisé par le rapport des côtés ;
3. on multiplie les deux, puis par (2 millions + nombre de points de l'image) ÷ 4 millions ;
4. **pour la 2.6 seulement**, on multiplie encore par 4,2 en « low », 3,3 en « medium », et 1 en « high », « xhigh »
   et « max ».

**Le calculateur dit vrai** : il donne 823 jetons pour une image carrée « low » ; un développeur a mesuré 824 sur ses
factures (https://dev.to/bgprogramming79/measuring-the-per-image-cost-of-gpt-image-26-does-higher-quality-improve-the-image-4jba,
**mesure**, 13 novembre 2026) ; Treza a mesuré 824, 1 449, 1 756, 3 122 et 7 024 jetons de « low » à « max », identiques
sur Flare et Sunburst à deux jetons près (https://www.trezalabs.com/blog/gpt-image-2-6-api-pricing-through-a-pipeline,
**mesure**, 5 novembre 2026) ; et le Studio lui-même a noté 1 372 jetons pour une image « high » en portrait sur le 2.5
(commentaire de `src/lib/ai/config.ts`, **code**), exactement le chiffre de la formule.

**Jetons et prix de l'image produite (2.6, Flare ou Sunburst), au tarif normal de 30 $ le million**

| Taille (largeur × hauteur) | low | medium | high | xhigh | max |
|---|---|---|---|---|---|
| 1024 × 1024 (carré) | 823 = 0,025 $ | 1 449 = 0,043 $ | 1 756 = 0,053 $ | 3 122 = 0,094 $ | 7 024 = 0,211 $ |
| 1024 × 1536 (portrait 2:3) | 664 = 0,020 $ | 1 132 = 0,034 $ | 1 372 = 0,041 $ | 2 459 = 0,074 $ | 5 488 = 0,165 $ |
| 1536 × 1024 (paysage 3:2) | 664 = 0,020 $ | 1 132 = 0,034 $ | 1 372 = 0,041 $ | 2 459 = 0,074 $ | 5 488 = 0,165 $ |
| 1824 × 1024 (paysage 16:9) | 588 = 0,018 $ | 997 = 0,030 $ | 1 254 = 0,038 $ | — | — |
| 1088 × 1360 (portrait 4:5) | 760 = 0,023 $ | 1 310 = 0,039 $ | 1 587 = 0,048 $ | — | — |
| 1152 × 2048 (portrait 9:16, « 2K ») | 659 = 0,020 $ | 1 211 = 0,036 $ | 1 413 = 0,042 $ | 2 511 = 0,075 $ | 5 650 = 0,170 $ |
| 1440 × 2560 (portrait 9:16, « 2,5K ») | 861 = 0,026 $ | 1 577 = 0,047 $ | 1 843 = 0,055 $ | 3 276 = 0,098 $ | 7 370 = 0,221 $ |
| 2048 × 2048 (carré 2K) | 1 667 = 0,050 $ | 2 944 = 0,088 $ | 3 568 = 0,107 $ | 6 343 = 0,190 $ | 14 272 = 0,428 $ |
| 2160 × 3840 (portrait 4K) | 1 558 = 0,047 $ | 2 855 = 0,086 $ | 3 336 = 0,100 $ | 5 930 = 0,178 $ | 13 342 = 0,400 $ |

Ce que ce tableau change (**calcul**) :
- **De « high » à « medium », on ne gagne que 17 à 18 %** sur la 2.6 (0,041 $ → 0,034 $ en portrait). Sur la 2.5, le
  même pas faisait gagner 75 % : c'est pour cela que l'ancienne idée « passer en medium » ne vaut plus grand-chose.
- **Le carré est le format le plus cher** à qualité égale : un carré « high » (0,053 $) coûte 28 % de plus qu'un portrait
  2:3 « high » (0,041 $). Plus l'image est allongée, moins elle consomme.
- **Une grande image en portrait allongé ne coûte presque rien de plus** : 1152 × 2048 « high » coûte 3 % de plus que
  1024 × 1536, pour 50 % de points en plus. Faire l'écran de téléphone du site directement en 1152 × 2048 vaut mieux
  que l'agrandir ensuite.
- **« xhigh » et « max » coûtent 1,8 et 4 fois « high »**. Le Studio ne s'en sert pas ; il ne faut pas s'en servir.
- **La « complexité » (réflexion avant le dessin) ne coûte rien** : « Adjusting complexity has no separate fee. » Elle
  ne figure pas dans la formule. https://developers.openai.com/api/docs/guides/image-generation#set-image-complexity —
  **officiel**. Elle allonge seulement l'attente, et OpenAI conseille « low » pour les retouches simples (page
  d'annonce : https://openai.com/index/introducing-images-2-6/, **officiel**).
- **Le contenu de la demande ne change pas le nombre de jetons produits** : à qualité et taille égales, les trois demandes
  très différentes du test de DEV Community ont donné le même compte (**mesure**, petit).

### 1.3 Ce que coûtent les images jointes et le texte de la demande

- **Images jointes** : 8 $ le million de jetons. OpenAI ne publie pas comment il compte une image jointe pour la 2.6 ;
  la page sur la vision dit que ses règles « cover vision-model inputs, not GPT Image generation or editing »
  (https://developers.openai.com/api/docs/guides/images-vision#gpt-image-model-inputs, **officiel**). Pour le modèle
  `gpt-image-2`, OpenAI prévient que les images jointes sont toujours lues « at high fidelity », donc plus chères
  (guide des images, **officiel**). **Une mesure** : une image jointe a été facturée **1 523 jetons**, soit **0,012 $**
  (Treza, **mesure**, une seule, taille non dite). Le Studio réserve 1 500 jetons par image jointe (`OPENAI_IMAGE_IN_TOKENS`
  dans `src/lib/ai/media-providers.ts`, **code**) : c'est cohérent.
- **Texte de la demande** : 5 $ le million de jetons. Une demande de logo du Studio fait au plus 3 800 octets (environ
  1 000 à 1 300 jetons, soit 0,005 à 0,007 $) ; une demande de publication peut aller jusqu'à 24 000 octets (jusqu'à
  0,03 $, ce qui dépasse le prix de l'image elle-même) (`LOGO_PROMPT_MAX_BYTES`, `PUBLICATION_PROMPT_MAX_BYTES`, **code**).
- **Les aperçus en cours de route** : « each partial image will incur an additional 100 image output tokens »
  (guide, partie « Partial images cost », **officiel**). Le Studio en demande deux à chaque image
  (`OPENAI_PARTIAL_IMAGES = 2` dans `src/lib/ai/openai-images.ts`, **code**) : **+200 jetons, soit +0,006 $ par image**,
  c'est-à-dire **+15 % sur un portrait « high »**, pour des aperçus que le client ne voit pas pendant la création d'une
  planche.

**Exemples chiffrés complets (calcul, tarif normal)**

Hypothèses du calcul : 1 523 jetons par image jointe (mesure de Treza), environ 1 200 jetons de texte par demande de
planche, deux aperçus de 100 jetons. Toutes les images de planche, **logo compris**, sont demandées en « high » par
`aiSiteImageHd` (`strictQuality: true`) ; le réglage « medium » du logo (`logoQuality`) ne sert pas à la planche (**code**).

| Image de la planche | Taille rendue | Image produite | Aperçus | Images jointes | Texte | **Total** |
|---|---|---|---|---|---|---|
| Logo, 1er de la série (jointe : planche des 50 logos aimés) | 1024 × 1024 | 0,053 $ | 0,006 $ | 1 = 0,012 $ | 0,006 $ | **0,077 $** |
| Logo suivant (jointes : planche des 50 + planche des logos déjà faits) | 1024 × 1024 | 0,053 $ | 0,006 $ | 2 = 0,024 $ | 0,006 $ | **0,089 $** |
| Grande scène (16:9 demandé, rendu en 3:2) | 1536 × 1024 | 0,041 $ | 0,006 $ | 0 | 0,006 $ | **0,053 $** |
| Écran du site sur téléphone (9:16 demandé ; jointes : logo, grande scène) | 1024 × 1536 | 0,041 $ | 0,006 $ | 2 = 0,024 $ | 0,006 $ | **0,078 $** |
| Objet ou signes avec le logo (jointe : logo) | 1024 × 1024 | 0,053 $ | 0,006 $ | 1 = 0,012 $ | 0,006 $ | **0,077 $** |
| Publication de la planche (4:5 demandé ; jointe : logo) | 1024 × 1536 | 0,041 $ | 0,006 $ | 1 = 0,012 $ | 0,006 $ | **0,065 $** |

Formats et images jointes : `SLOT_ASPECT`, `SLOT_REFERENCES` et la fonction `make` dans
`src/lib/syna-agent/brand-images.ts` ; choix de la taille dans `generateImageImpl` (`src/lib/ai/media-providers.ts`) —
**code**. Le Studio ne connaît que trois tailles (1024 × 1024, 1024 × 1536, 1536 × 1024) ; le 16:9, le 9:16 et le 4:5
sont donc rendus en 3:2 ou 2:3 puis recadrés.

**Donc le vrai prix moyen d'une image de planche est d'environ 0,07 $ (0,066 €)**, et non 0,12 $ ; l'ancienne mesure de
0,05 $ était celle de l'image produite seule (1 372 à 1 909 jetons, sur le 2.5), sans les images jointes ni le texte.

### 1.4 Le nombre de versions en une demande (`n`)

- `n` va de 1 à 10 (« The number of edited images to generate », `minimum: 1`, `maximum: 10`) :
  https://developers.openai.com/api/reference/resources/images/methods/edit — **officiel**.
- OpenAI ne dit pas noir sur blanc comment `n` est facturé. Ce qui est sûr : chaque image produite paie ses jetons de
  sortie (formule ci-dessus). **Ce qui est probable, non écrit** : le texte et les images jointes, envoyés une fois, sont
  comptés une fois (**mon avis**, à vérifier sur le compteur `usage` d'une seule demande à `n: 2`).
- Si c'est confirmé, trois logos en une demande avec trois images jointes coûteraient environ 0,13 $ + 0,05 $ = 0,18 $
  au lieu de 3 × 0,09 $ = 0,28 $ (**calcul**). **Mais** la règle du propriétaire veut que chaque logo d'une série reçoive
  les précédents (« je veux un logo complètement différent ») : `n` ne s'applique donc pas à la série de logos, seulement
  à des versions d'une même image (partie 3.2).

### 1.5 Le différé (« Batch ») : les pages officielles se contredisent

| Page officielle (lue le 22 novembre 2026) | Ce qu'elle dit pour gpt-image-2.6 |
|---|---|
| Page des prix : https://developers.openai.com/api/docs/pricing | une colonne « Batch » à moitié prix (4 $ / 15 $ / 1 $) pour Flare et Sunburst |
| Page du modèle Flare (et Sunburst) : https://developers.openai.com/api/docs/models/gpt-image-2.6-flare | « Batch `v1/batch` **Not supported** » |
| Page du traitement différé : https://developers.openai.com/api/docs/guides/batch | « GPT-Image-2.5 supports batch image generation and editing with `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst` » ; rien sur la 2.6 |
| Page du modèle 2.5 Flare : https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | « Batch `v1/batch` **Supported** » et « $15 with Batch processing » |

- **Ce qui a changé** : le 5 novembre, la page des prix ne donnait pas de prix différé pour la 2.6 (Apidog et
  DataStudios, qui l'ont lue ce jour-là : https://apidog.com/blog/gpt-image-2-6-flare-vs-sunburst/ et
  https://www.datastudios.org/post/openai-gpt-image-2-6-sunburst-flare-api-pricing-no-batch-gifs-svg, **test** de
  lecture). Elle en donne un aujourd'hui. La page des prix a donc été mise à jour après les autres, ou par erreur.
- **Conclusion** : le différé de la 2.6 est **possible mais non confirmé** ; le différé du **2.5** est confirmé par trois
  pages. **Le seul moyen de trancher sans risque** : un lot de **une seule image** « low » en différé (environ 0,01 $ si
  accepté), avec l'accord du propriétaire. Un refus d'OpenAI ne coûte rien (« a failed generation charges nothing »,
  Treza, **mesure**).
- Le différé rend les résultats dans les 24 heures (« For now, the completion window can only be set to `24h` »), donc
  seulement pour ce que le client n'attend pas : les publications du mois préparées d'avance, jamais la planche qu'il
  regarde se faire.

### 1.6 Le prix réduit des images jointes déjà lues (cache)

- Les tableaux disent 2 $ au lieu de 8 $ pour une image jointe déjà lue. **Mais** la note sous le tableau ne vise que
  « GPT Image 2 and GPT-Image-2.5 », et seulement par la Responses API : « For GPT-Image-2 and GPT-Image-2.5, cached input
  pricing applies only to the image generation tool in the Responses API. It doesn't apply to direct Images API requests,
  including `/v1/images/edits`. » (guide des images, partie « Cached input pricing », **officiel**).
- **Or la 2.6 n'est pas disponible par la Responses API** : sa page dit « Responses `v1/responses` Not supported », et le
  guide dit que ses fonctions passent « through the Image API » (**officiel**).
- **Conclusion** : aujourd'hui, **le prix réduit des images déjà lues ne s'applique pas aux images de SINA** (2.6 par
  l'interface « Image »). Le rapport 11 du 22 novembre le proposait : **cette piste est fermée pour la 2.6**.
- Remarque utile : l'interface « Image » accepte une image déjà déposée par son identifiant (`file_id`) (référence de la
  retouche, **officiel**) : cela évite de renvoyer les octets, mais pas de les payer.

### 1.7 La retouche d'une seule zone

- **Elle ne coûte pas moins cher qu'une image entière** : le modèle redessine toute l'image ; « Masking with GPT Image
  is entirely prompt-based. The model uses the mask as guidance, but may not follow its exact shape with complete
  precision. » ; et « Markup-guided edits use the same token rates as other edits, with no extra fee. » (guide,
  **officiel**). On paie donc l'image produite entière **plus** l'image de départ comme image jointe (environ 0,012 $).
- **Son intérêt n'est pas le prix d'un appel, c'est le taux de réussite** : on garde ce qui était bon, on ne rejoue pas
  le hasard sur toute l'image. Avec la complexité « low » conseillée par OpenAI pour les retouches ciblées, le risque de
  changements non voulus baisse (page d'annonce, **officiel**).
- Le Studio a déjà une retouche par masque (`mockupMaskEditImpl`, **code**), en « high ».

### 1.8 Ce que fait le Studio aujourd'hui pour compter (constat dans le code)

- `src/lib/ai/config.ts` : gpt-image-2.6 Flare et Sunburst sont réglés en `{ unit: "image", perImage: 0.12 }`, avec ce
  commentaire : « borne PAR IMAGE, la table des jetons de sortie du 2.6 n'étant pas publiée [...] borne 0,12 $ par prudence,
  à ajuster après les premiers appels réels » (**code**).
- `src/lib/ai/media-providers.ts`, fonction `cost` : pour un tarif « par image », le coût compté est **0,12 $ + le texte**,
  quel que soit ce qu'OpenAI renvoie dans `usage`. Le Studio **reçoit pourtant les vrais jetons** (`usage.output_tokens`,
  `input_tokens_details`) et les **enregistre** dans `ai_calls` (`recordMedia` → `recordCall`, colonnes
  `input_tokens` et `output_tokens`) (**code**).
- **Conséquence** : le compteur du Studio surestime chaque image d'environ 70 % (0,12 $ comptés contre environ 0,07 $
  réels) ; les devis et le budget du client aussi. **La table officielle existe désormais** (la formule du calculateur) :
  la raison écrite dans le commentaire ne tient plus.
- **Ce qu'on peut faire gratuitement tout de suite** : relire dans la base du Studio en ligne les jetons enregistrés
  pour chaque image passée et recalculer le vrai coût (aucun appel payant) ; puis comparer à la facture d'OpenAI du mois.


---

## 2. Ce qui est mesuré sur la qualité selon le réglage

Aucune page d'OpenAI ne publie de mesure de qualité par réglage. OpenAI dit seulement : « Use `quality: "low"` for quick
drafts. For final assets, compare higher quality settings to find the right balance of detail, latency, and cost. »
(guide, partie « Size and quality options », **officiel**) ; et, pour passer d'un réglage à l'autre, de mesurer « cost
per accepted image » sur une base de cas difficiles (guide de rédaction des demandes, rapport du 21 novembre, **officiel**).
Les tests indépendants ci-dessous sont **tous petits** ; aucun n'a été fait par des humains à grande échelle.

### 2.1 « medium » contre « high »

| Test | Ce qui a été fait | Résultat | Preuve |
|---|---|---|---|
| DEV Community, BG Kim, 13 novembre 2026 — https://dev.to/bgprogramming79/measuring-the-per-image-cost-of-gpt-image-26-does-higher-quality-improve-the-image-4jba | 2.6 Flare et Sunburst, 3 demandes (affiche avec texte, photo d'un produit avec étiquette, scène de rue), 5 qualités, 1 image chacune, 1024² | « The composition stayed almost the same as I raised the quality level » ; petites différences de matière (tricot, vapeur, bois) visibles en zoom, à peine en vignette ; entre « medium » et « high », différence « not clear » ; le texte était juste dès « low » | **test** (petit) |
| VibeDex, 50 demandes, juge automatique à l'aveugle, 3 passages — https://vibedex.ai/blog/gpt-image-2-quality-tier-comparison-2026 | modèle **gpt-image-2** (pas la 2.6) | note sur 5 : high 4,155, medium 4,108, low 3,946 ; « high » bat « medium » sur 22 demandes, perd sur 19, 9 égalités ; « high » utile pour les produits de luxe en gros plan (montre : low 3,36, medium 3,81, high 4,48), les petits textes denses, les matières difficiles ; sur une étiquette de sachet de café, « medium » 4,82 contre « high » 4,40 | **test** (juge automatique, ancien modèle) |
| Wilow, 16 septembre 2026 — https://trywilow.com/blog/gpt-image-2-5-quality-settings | 2.5 Sunburst, une vraie montre de marque, 5 qualités × 2 essais, images de 2432 × 3344 | en gros plan, « Low and medium looked soft and slightly blotchy », « from high upward they turn into fine, crisp strokes » (netteté 71,5 contre 86,2) ; **sur la publicité entière, aucune différence visible** (90,6 contre 89,5, moins que l'écart entre deux essais) | **test** (un seul produit) |
| S Anand, 26 septembre 2026 — https://www.s-anand.net/blog/quality-levels-of-gpt-image-2.5-flare/ | 2.5 Flare, 4 demandes, juge automatique à l'aveugle | « ChatGPT couldn't tell the difference between `high`, `xhigh` and `max` » ; différences seulement en zoom fort sur un portrait très détaillé | **test** (petit, juge automatique) |

**Ce que j'en tire** (**mon avis**) : pour une image vue en entier (planche, publication, écran de téléphone), « medium »
et « high » se valent presque toujours ; « high » compte pour un produit vu de près, une matière fine, un petit texte. Et
comme « medium » ne fait gagner que 17 % sur la 2.6, **garder « high » pour tout ce que voit le client est le bon choix** :
le gain ne vaut pas le risque. Ne jamais monter à « xhigh » ou « max » (1,8 et 4 fois le prix, aucun gain visible mesuré).

### 2.2 Flare contre Sunburst

| Source | Résultat | Preuve |
|---|---|---|
| Classement Arena (votes du public, qualité « medium », 5 novembre 2026), lu par Apidog — https://apidog.com/blog/gpt-image-2-6-flare-vs-sunburst/ | création à partir d'un texte : Sunburst 1 409 (2e), Flare 1 384 (4e), écart 25 points ; retouche : Sunburst 1 476 (3e), Flare 1 462 (5e), écart 14 points | **test** (votes, lus de seconde main) |
| OpenAI, page d'annonce du 4 novembre 2026 — https://openai.com/index/introducing-images-2-6/ | Sunburst « brings higher-quality image generation and even greater image consistency across edits when quality is set to medium or high » ; Flare « improves layout quality for posters, product imagery, and other professional visuals » | **officiel** (sans chiffre) |
| Koosu, 23 images, 5 novembre 2026 — https://www.koosu.io/blog/gpt-image-2-6-flare-vs-sunburst | texte juste sur les deux (« Every word is correct in both ») ; Sunburst ajoute des éléments non demandés à une affiche, mais suit mieux les détails d'une infographie ; même prix au jeton près | **test** (petit) |
| DEV Community (ci-dessus) | Sunburst 2 à 5 fois plus lent (« high » : 10 s contre 54 s) ; « That does not mean Flare is a lower-quality model » | **test** (petit) |

**Ce que j'en tire** : le prix est le même ; seul le temps d'attente change. Sunburst est un peu mieux noté par le public
et garde mieux une image d'une retouche à l'autre. **Changer de modèle ne fait rien gagner en argent** ; c'est un choix
de qualité et d'attente (le Studio est aujourd'hui sur Flare : `syna.mockup.image_route`). Le seul effet sur le coût
serait indirect : si Sunburst est refusé moins souvent à la relecture, il coûte moins par image gardée. Cela se mesure
sur un essai, en comptant les refus.

### 2.3 Petite image agrandie, ou grande image tout de suite

- **Aucun test publié** ne compare, sur des photos de produit, une image 1024 agrandie par un logiciel et la même image
  créée directement en 2048 (recherche faite ; les pages trouvées sont des vendeurs d'agrandisseurs, sans mesure).
- **Avec la 2.6, la question change** (partie 1.2, **officiel** et **calcul**) : une grande image en portrait allongé
  coûte presque comme une petite (1152 × 2048 « high » : 0,042 $ contre 0,041 $ pour 1024 × 1536). Une grande image de
  site en 16:9 coûte un tiers de plus (2560 × 1440 « high » : 0,055 $ contre 0,041 $ pour 1536 × 1024), pour 2,3 fois plus
  de points. Seul le carré double vraiment (2048² : 0,107 $).
- **Une remarque utile du test Wilow** (**test**, non contrôlé) : une **plus grande photo du produit donnée en
  référence** a changé le résultat davantage que la qualité (« get a bigger product photo, because that changed the
  result more than the setting did »). Le Studio réduit les images jointes à 768 ou 1024 points (`refMax`, **code**).
  Ce que coûte une image jointe plus grande sur la 2.6 n'est pas publié : à mesurer sur un essai.

---

## 3. Payer moins d'images sans perdre de qualité : chaque technique, avec ses chiffres

Prix de référence : un portrait « high » sans image jointe coûte 0,047 $ avec aperçus, 0,041 $ sans ; une relecture
coûte environ 0,03 € (mesure du Studio du 21 novembre).

### 3.1 Brouillon bon marché, puis version finale seulement pour ce qui est choisi

- **Ce qu'OpenAI dit** : « Use `quality: "low"` for quick drafts » (**officiel**). Treza conseille un brouillon Flare
  « low » puis une seule version finale (**éditeur**).
- **Pourquoi cela rapporte peu avec la 2.6** (**calcul**) : un brouillon « low » coûte **la moitié** d'une finale
  (portrait 0,020 $ contre 0,041 $), pas le dixième comme avec le 2.5. Et il n'y a **pas de graine** dans l'interface : la
  version finale est un autre tirage, avec une autre composition (« composition could differ on regeneration », DEV
  Community). Pour garder le brouillon choisi, il faut le retoucher (image jointe + image produite entière).
- **Le calcul pour un logo** : brouillon « low » avec deux images jointes 0,055 $, finale en retouche 0,095 $, contre 0,083 $
  pour un logo fait directement en « high » sans aperçus. Le brouillon ne rapporte que si **plus de 70 % des logos sont
  refusés** à la relecture. Sur le logo du plombier (20 refusés), oui ; sur une marque ordinaire, non.
- **Ma décision** : pas de brouillon en règle générale. On le garde en réserve pour le logo **seulement si** les refus
  dépassent 70 % sur les essais (le Studio garde les refus : `rejections.ts`).

### 3.2 Plusieurs versions en une demande (`n`)

- `n` de 1 à 10 (**officiel**). Le texte et les images jointes seraient payés une fois (**mon avis**, à vérifier sur
  `usage`). Gain probable : 0,02 à 0,03 $ par version en plus quand la demande porte deux images jointes.
- **Limites** : les versions d'une même demande se ressemblent ; or le propriétaire veut des exemples « très
  différents les uns des autres » et des logos « complètement différents » faits l'un après l'autre. Et la relecture
  reste payée pour chaque version.
- **Ma décision** : à n'utiliser que pour **refaire une image refusée** quand la raison du refus est le hasard (une
  tache, un texte mal écrit), et jamais pour une série qui doit varier.

### 3.3 Retoucher la zone ratée au lieu de tout refaire

- Même prix qu'une image entière, plus l'image de départ jointe (0,012 $) (partie 1.7, **officiel**).
- **L'intérêt est la réussite** : une seule chose change, le reste est gardé ; OpenAI conseille la complexité « low »
  pour ce genre de retouche (**officiel**). Le cadre d'annotation (`markup`) existe pour la 2.6 par l'interface « Image »
  (**officiel**).
- **Ma décision** : pour un défaut local dit par le relecteur (un mot mal écrit sur l'objet, une tache), retouche
  ciblée en complexité « low » plutôt que nouvelle image. Elle ne coûte pas moins à l'appel, mais elle évite la deuxième
  et la troisième reprise. Pour un défaut d'idée (une goutte, une personne), on redessine.

### 3.4 Un contrôle gratuit avant de payer la relecture, et surtout avant de payer une reprise

- **Le défaut le plus fréquent relevé le 21 novembre était technique, pas de dessin** : 16 images de planche sur 96 avaient
  des zones transparentes, toutes faites avec des images jointes ; le Studio n'envoie aucun réglage de fond en mode
  retouche (rapport 1 du 21 novembre). **C'est toujours le cas dans le code** : aucun `background: "opaque"` n'est envoyé
  (`generateImageImpl`, **code**). OpenAI propose pourtant « `opaque` and `transparent` backgrounds » sur la retouche
  (référence de la retouche, **officiel**, écrit pour le 2.5 ; la 2.6 est à confirmer par un essai).
- **Chiffre** (**calcul**) : 16 images sur 96, c'est une image sur six. Chacune refusée coûte l'image (≈ 0,07 $), sa
  relecture (0,03 €) et une reprise. Sur une planche de 20 images, c'est jusqu'à **3 reprises évitées, environ 0,30 €**.
- **Les contrôles sans IA qui existent déjà** : fond blanc du logo (`logoOnWhite`), trait près du nom (`traitHorizontal`),
  comparaison des textes lus avec ceux attendus. **À ajouter** (gratuits, sur la machine) : part de points transparents,
  image vide ou presque, mauvaise taille, logo posé qui n'est pas celui de la planche (comparaison d'image simple).
- **Ce que cela économise** : une relecture (0,03 €) pour chaque image refusée sans IA ; le prix de l'image, lui, est déjà
  payé.

### 3.5 Une relecture moins chère sans relire moins bien

Composition d'une relecture (**calcul** d'après les tarifs officiels d'Anthropic,
https://platform.claude.com/docs/en/about-claude/pricing et https://platform.claude.com/docs/en/build-with-claude/vision) :
Opus 5.5 lit 4 $ le million de jetons et écrit 20 $ ; une image coûte ⌈largeur/28⌉ × ⌈hauteur/28⌉ jetons (1024 × 1536 :
2 035 jetons, 0,008 $ ; la planche des 50 logos en 1200 × 1200 : 1 849 jetons, 0,007 $). Avec les consignes et la
réflexion, on retrouve bien environ 3 centimes.

| Idée | Gain possible | Risque | Décision |
|---|---|---|---|
| Montrer au relecteur une image plus petite (512 × 768) | environ 0,006 $ par relecture (≈ 18 %) | il ne voit plus les petites lettres ni les blocs de points, qui sont justement ce qu'il doit refuser | **non** |
| Un modèle moyen (Sonnet 5.5, moitié prix) qui écarte d'abord les défauts évidents | ne rapporte que si plus de la moitié des images sont refusées (on paie les deux sur chaque image gardée) ; le 21 novembre, un modèle moyen jugeant six images d'un coup gardait tout | il laisse passer, ou il refuse à tort et fait payer une reprise | **non** ; la règle du propriétaire (« le modèle le plus fort ») reste |
| **Garder en mémoire chez Anthropic la partie fixe** (consignes du relecteur, planche des 50 logos) : lecture à 0,05 fois le prix sur Opus 5.5 | sur environ 3 000 à 4 000 jetons fixes, 0,011 à 0,015 $ par relecture, soit jusqu'à 30 à 45 % (moins la première écriture, payée 1,25 fois) ; **je compte 20 % par prudence** | aucun sur la qualité ; il faut mettre la partie fixe en tête et la planche des 50 avant ce qui change | **oui** (les consignes sont déjà gardées, `llm.ts` ; la planche des 50 ne l'est pas) |
| Relire en différé | −50 % | la planche est regardée en direct par le client | **non** pour la planche ; **oui** pour les publications préparées d'avance |

### 3.6 Une image pour plusieurs formats

- **Pour la planche** : déjà fait en partie (la grande scène est donnée à l'écran du site).
- **Pour les publications** (lot 5) (**mon avis** et **calcul**) : une image maîtresse 1152 × 2048 « high » (0,042 $) se
  recadre en story 9:16, en 4:5 (1152 × 1440) et en carré (1152 × 1152), si la scène est pensée avec une partie calme et
  le texte posé par le Studio (`compose.ts`, comme aujourd'hui). Trois formats pour le prix d'une image au lieu de trois
  (0,042 $ contre 0,13 $). Agrandir le cadre par OpenAI coûterait une image entière : à éviter.

### 3.7 Les photos du client et le détourage gratuits

- **Le détourage se fait déjà sur la machine du Studio**, sans fournisseur (`src/lib/media/cutout.ts`, paquet
  `@imgly/background-removal-node`) : 0 €. À titre de comparaison, Photoroom vend le détourage 0,02 $ l'image par son API
  (https://www.photoroom.com/api/pricing, **officiel**).
- **Le vrai produit vient de la photo du client** et n'est jamais redessiné ; seule la scène est payée. Chaque photo du
  client utilisée telle quelle sur un emplacement produit du site est une image qui ne coûte rien.

### 3.8 Les autres réglages qui coûtent sans rien apporter

| Réglage | Aujourd'hui | Coût | Proposition |
|---|---|---|---|
| Aperçus en cours de route | 2 par image | +0,006 $ par image (≈ +12 à 15 %) | **0** pour les images de planche et de publication : ils ne sont jamais montrés au client (seul leur nombre est suivi dans `openai-images.ts`). À vérifier : que le flux reste ouvert sans aperçu (« When set to 0, the response will be a single image sent in one streaming event », **officiel**) |
| Format 16:9 | rendu en 1536 × 1024 puis recadré | 1 372 jetons | **1824 × 1024 natif** : 1 254 jetons (−9 %), aucun recadrage, plus net |
| Format 9:16 (écran du site) | rendu en 1024 × 1536 puis recadré | 1 372 jetons | **1152 × 2048 natif** : 1 413 jetons (+3 %), 50 % de points en plus, aucun recadrage |
| Texte d'une demande de publication | jusqu'à 24 000 octets | jusqu'à 0,03 $, autant que l'image | demandes plus courtes : le texte posé par le Studio n'a pas besoin d'être décrit au dessinateur |
| Complexité | non envoyée (« high » par défaut) | 0 | « low » pour les retouches ciblées (conseil d'OpenAI) ; gain de temps, pas d'argent |

---

## 4. Ce que paient les concurrents et comment ils tiennent leurs coûts

Le détail des produits est dans `docs/studio/couts/04-comment-font-les-autres.md`. Ici, seulement ce qui touche au prix
d'une image.

| Produit | Prix par image ou par geste publié | Comment il tient son coût | Preuve |
|---|---|---|---|
| **Canva** | Pro : jusqu'à 200 usages « premium » ou 20 « ultra » par mois ; les outils « standard », dont « Create an image with Canva AI », ne sont pas décomptés sur les forfaits payants (« fair use ») | **ses propres modèles** (rachat de Leonardo.Ai en 2024) : Canva dit ses services d'IA « seven times quicker and thirty times less costly » que des modèles de pointe comparables, et avoir baissé son coût de service d'environ 90 % ; il a aussi ralenti ses sorties plutôt que de lancer « AI features at unsustainable unit economics » et baissé sa prévision de croissance 2026 de 30 % à 20 % | https://www.canva.com/help/ai-access/ (lue en résumé, **officiel**) ; https://fortune.com/2026/04/16/canva-ai-agentic-design-suite-coo-cliff-obrecht/ (**presse**, chiffres de Canva) ; https://cryptobriefing.com/canva-cuts-revenue-forecast-ai-costs/ (**presse**) |
| **Pomelli** (Google Labs) | gratuit | Google paie ; fait avec Nano Banana | https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-photoshoot/ (**officiel**) |
| **Photoroom** | API : détourage 0,02 $ l'image ; retouche avec fond créé par IA 0,10 $ l'image | **son propre modèle de photo produit** (« Photoroom Instant Diffusion », annoncé en février 2024) et ses propres machines ; plus de 2 milliards d'images par an | https://www.photoroom.com/api/pricing (**officiel**) ; https://www.photoroom.com/inside-photoroom/photoroom-foundation-diffusion-model (**éditeur**, lu en résumé) |
| **Looka** | créer est gratuit, télécharger se paie : 35 $ et 72 $ une fois (hausse de septembre 2026), kit de marque 96 $ par an | **pas de modèle d'images payé à chaque logo** : des assemblages par « proprietary algorithms » à partir d'une bibliothèque de pictogrammes commune | https://pricingsaas.com/companies/looka (**presse** de prix) ; page officielle refusée à la lecture |
| **Durable** | 300 crédits gratuits, 1 000 par mois à 25 $, 4 000 à 49 $ ; prix d'un geste non publié | crédits plafonnés, sans dire ce que coûte une image | https://durable.com/pricing (**officiel**) |
| **Higgsfield** | photo produit 2K : 1,5 crédit, soit 0,075 $ | — | rapport 10 du 22 novembre (**éditeur**) |

**Ce que j'en tire** : ceux qui tiennent un prix bas ont **leur propre modèle** (Canva, Photoroom) ou **ne créent pas
d'image** (Looka). Le Studio, lui, doit passer par OpenAI (règle du propriétaire) : son seul levier est donc de **créer
moins d'images ratées et de ne pas payer ce qui ne sert à rien**, pas de changer de fabricant. Le prix réel d'une image
de SINA (≈ 0,07 $) est du même ordre que celui de Higgsfield (0,075 $) et inférieur à la retouche de Photoroom (0,10 $).


---

## 5. Le coût réel d'une planche de marque complète : réglage actuel contre meilleur réglage

**Hypothèses** (**calcul**, programme de la partie 1.2 ; à vérifier sur la première facture) : trois identités ; pour
chacune, logo, grande scène et écran du site (9 images) ; pour l'identité choisie, objet, signes et trois publications
(5 images) : 14 images au premier passage (`PROPOSAL_SLOTS` et `FINISH_SLOTS`, **code**). Avec les reprises observées,
« près de 20 images » : ici 4 logos refaits et 2 écrans de site refaits parce que leur logo a changé. Relecture : 0,03 €
l'image. Le texte de la marque (direction artistique, noms, angles) n'est pas compté ici : il est dans
`02-couts-des-modeles-de-texte.md`.

| | Images | Ce que paie OpenAI | Relectures | **Total** | Ce que compte le Studio |
|---|---|---|---|---|---|
| **Réglage actuel** (« high », 2 aperçus, tailles 3:2 et 2:3, logo relu après les images qui le portent, aucun fond « opaque ») | 20 | 1,51 $ = **1,37 €** | 0,60 € | **1,97 €** | **2,89 €** (20 × 0,12 $ + texte, + relectures) |
| **Meilleur réglage** (toujours « high » ; sans aperçus ; 16:9 en 1824 × 1024 et 9:16 en 1152 × 2048 natifs ; logo relu et gardé avant tout ce qui le porte ; fond « opaque » demandé ; partie fixe du relecteur gardée en mémoire) | 18 | 1,24 $ = **1,13 €** | 0,43 € | **1,56 €** | **1,56 €** (compté au jeton) |
| Écart | −2 images | −18 % | −28 % | **−21 % réel** | **−46 % sur ce qui est compté** |

Ce que le tableau dit honnêtement :
- **La moitié de « l'image trop chère » vient du compteur, pas d'OpenAI.** Le Studio compte 2,89 € une planche qui
  coûte réellement environ 1,97 €. Compter au jeton, avec la formule officielle, divise le chiffre compté par 1,85 sans
  rien changer aux images.
- **Sur le vrai prix, le meilleur réglage gagne environ un cinquième** à qualité égale (et même meilleure : images
  natives sans recadrage, écran du site plus grand). Plus, il faudrait baisser la qualité ou le nombre d'images, ce
  qui n'est pas demandé.
- **Le cas qui fait vraiment exploser une planche, ce sont les logos refusés en série** : 20 logos refusés (le plombier
  du 21 novembre) coûtent à eux seuls environ 1,63 € d'images et 0,60 € de relectures. Le levier est en amont : la phrase
  de refus du client donnée mot pour mot (la goutte a disparu au premier essai suivant, rapport du 21 novembre) et
  l'ordre de travail (logo d'abord).

**Ce que verra le client** : la même planche, au même niveau ; son budget du mois baisse de moitié moins vite pour la
marque (par exemple au forfait 69 €, premier mois, budget de 28,75 € : la part des images passe d'environ 10 % comptés à
environ 5 %).

### 5.1 Les publications du mois (lot 5), là où le différé change tout

Une publication : image 4:5 rendue en 1024 × 1536 « high », le logo joint, une relecture (**calcul**).

| Publications par mois (forfaits 69 €, 99 €, 169 €) | Compté aujourd'hui | Payé aujourd'hui | Meilleur réglage en direct | **Meilleur réglage en différé** (si le différé de la 2.6 est confirmé) |
|---|---|---|---|---|
| 30 (1 par jour) | 4,59 € (20 % du budget de 23 €) | 2,93 € | 2,34 € | **1,17 € (5 %)** |
| 60 (2 par jour) | 9,17 € (28 % de 33 €) | 5,86 € | 4,68 € | **2,34 € (7 %)** |
| 90 (3 par jour) | 13,76 € (24 % de 56,33 €) | 8,79 € | 7,02 € | **3,51 € (6 %)** |

Relectures comprises (0,03 € en direct ; en différé, moitié prix et partie fixe gardée en mémoire). C'est ici que le
coût des images **se divise vraiment par 2,5 à 4**, sans toucher à la qualité : les publications sont préparées d'avance
et le client ne les attend pas devant l'écran. Si OpenAI refuse le différé pour la 2.6, il reste le meilleur réglage en
direct ; passer au 2.5 (différé confirmé) serait un changement de modèle, à proposer au propriétaire avec un essai à
l'aveugle, jamais décidé seul.

---

## 6. Pas vérifié, et comment le vérifier sans dépenser (ou presque)

| Point | Pourquoi ce n'est pas sûr | Comment trancher | Coût |
|---|---|---|---|
| Vrai coût des images passées du Studio | le Studio a compté 0,12 $ ; les vrais jetons sont enregistrés dans `ai_calls` | relire la base du Studio en ligne et recalculer ; comparer à la facture OpenAI du mois | 0 € |
| Jetons d'une image jointe sur la 2.6 | non publié ; une seule mesure (1 523) | lire `usage.input_tokens_details` d'images déjà faites (même base) | 0 € |
| Différé de la 2.6 | trois pages officielles disent non ou rien, la page des prix dit oui | un lot d'une seule image « low » carrée | ≈ 0,01 € si accepté, 0 si refusé |
| `n` : texte et images jointes payés une fois ? | pas écrit par OpenAI | une demande à `n: 2` lors d'un essai déjà accordé, lire `usage` | compris dans l'essai |
| Fond « opaque » accepté par la 2.6 en retouche | écrit pour le 2.5 | une image de l'essai suivant | compris dans l'essai |
| Flux sans aperçu (`partial_images: 0`) qui reste ouvert assez longtemps | dépend du réseau du Studio | une image de l'essai suivant | compris dans l'essai |
| Gain de la mémoire chez Anthropic pour le relecteur | dépend de la taille réelle de la partie fixe | lire `cache_read_tokens` dans `ai_calls` | 0 € |
| Qualité : Sunburst refusé moins souvent que Flare ? | aucun test sur nos images | compter les refus sur un essai, à l'aveugle | à décider avec le propriétaire |
| Prix de Canva, Looka (pages officielles bloquées) | lus en résumé ou chez des tiers | — | — |

Aucun appel payant n'a été fait pour ce rapport.

---

## Le plan pour diviser le coût des images, chiffré, en gardant la qualité

Ordre décidé (le moins cher et le plus sûr d'abord). Chaque étape garde « high », OpenAI, la relecture par le modèle le
plus fort, image par image, et la règle « une image ratée est refaite ».

| # | Ce qui change | Ce qu'il gagne (planche à 3 identités) | Ce qu'il gagne (30 publications par mois) | Coût pour l'essayer | Ce que verra le propriétaire |
|---|---|---|---|---|---|
| 1 | **Compter au jeton** avec la formule officielle d'OpenAI (`config.ts` : la 2.6 passe en tarif au jeton ; la réserve avant l'appel garde la formule et 1 523 jetons par image jointe) | chiffre compté **2,89 € → 1,97 €** | **4,59 € → 2,93 €** | 0 € | des devis et une jauge justes, environ deux fois plus bas ; vérifiés contre la facture d'OpenAI |
| 2 | **Recalculer les dépenses passées** à partir des jetons déjà enregistrés | — | — | 0 € | le vrai prix moyen d'une image de SINA, mesuré, à la place de 0,12 $ ou 0,05 $ |
| 3 | **Plus d'aperçus** sur les images que le client ne regarde pas se dessiner | −0,11 € | −0,16 € | 0 € (vérifié à l'essai suivant) | rien de visible |
| 4 | **Tailles natives** : 16:9 en 1824 × 1024, 9:16 en 1152 × 2048 | −0,01 € et un écran de site 50 % plus net | — | 0 € | des images sans recadrage, plus nettes |
| 5 | **Fond « opaque »** demandé à chaque image faite avec des images jointes | jusqu'à 3 reprises évitées sur 20 (≈ −0,30 €) | jusqu'à 1 publication sur 6 refaite en moins | 0 € | moins de « bords abîmés », « brume », « vignettes » refusés |
| 6 | **Logo relu et gardé avant** de dessiner l'écran du site, l'objet, les signes et les publications | −2 images et −2 relectures (≈ −0,20 €) | — | 0 € | rien ; la planche arrive avec le bon logo partout |
| 7 | **Contrôles gratuits** avant la relecture (part de transparence, image vide, mauvaise taille, logo posé différent) | une relecture évitée par image ratée (0,03 € chacune) | idem | 0 € | rien |
| 8 | **Partie fixe du relecteur gardée en mémoire** (consignes et planche des 50 logos en tête) | relecture −20 % comptés par prudence (≈ −0,11 €) | ≈ −0,18 € | 0 € | rien |
| 9 | **Publications du mois en différé** (lot 5), après un lot d'essai d'une image | — | **2,34 € → 1,17 €** (images et relectures à moitié prix) | ≈ 0,01 € pour l'essai, avec l'accord du propriétaire | les publications prêtes la veille, au même niveau, pour le quart du coût compté aujourd'hui |
| 10 | **Une image maîtresse 9:16 recadrée** en 4:5 et en carré quand une publication sort en plusieurs formats | — | jusqu'à 2 images sur 3 en moins par publication à trois formats | 0 € | les mêmes formats, la même scène |
| 11 | **Retouche ciblée** (zone entourée, complexité « low ») pour un défaut local au lieu d'une nouvelle image | moins de 2e et 3e reprises (non chiffrable avant essai) | idem | compris dans l'essai | une image corrigée qui garde ce qui était bon |

**Résultat chiffré** (**calcul**, à confirmer sur facture ; les étapes 5, 7, 10 et 11 n'y sont pas comptées, elles ne
feraient que baisser encore) :
- **Planche de marque à 3 identités** : **2,89 € comptés aujourd'hui → 1,56 €**, soit le chiffre **divisé par 1,85** ;
  en vrai argent payé : 1,97 € → 1,56 € (−21 %).
- **Publications du mois** : **4,59 € comptés aujourd'hui pour 30 publications → 1,17 €**, soit **divisé par 3,9** ; en
  vrai argent payé : 2,93 € → 1,17 € (÷ 2,5), si le différé de la 2.6 est confirmé ; sinon 2,34 € (÷ 2 sur le compté).

**Ce que je ne propose pas, parce que cela baisserait la qualité ou toucherait une règle du propriétaire** : passer en
« medium » (−17 % seulement), montrer au relecteur une image réduite, remplacer le relecteur par un modèle moyen, quitter
OpenAI, faire moins d'images sur la planche, passer au 2.5 sans essai à l'aveugle, faire un brouillon de chaque image.

**Une seule question au propriétaire, quand il le voudra** : il accorde le lot d'essai d'une seule image en différé
(environ 1 centime) pour savoir si les publications du mois peuvent coûter moitié moins ?
