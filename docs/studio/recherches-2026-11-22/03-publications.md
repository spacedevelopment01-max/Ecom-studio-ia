# Les publications de SINA : recherche du 22 novembre 2026

Ce rapport complète le « Rapport 6 » du 21 novembre (régularité selon Buffer, carrousels selon Socialinsider, partage
à un ami, guide TikTok, test de l'inconnu, grille en oui ou non). Je ne répète pas ces points : je cherche ce qui est
nouveau, plus précis, ou **comment le faire**.

Niveaux de preuve :
- **fort** : recherche universitaire relue, ou documentation officielle d'une plateforme ;
- **moyen** : données d'une plateforme, d'un éditeur sur un gros échantillon, étude du métier ;
- **faible** : avis de praticiens, blogs, comparatifs écrits par un concurrent.

Aucun appel payant n'a été fait. Aucun autre fichier n'a été modifié.

Une remarque avant tout : aujourd'hui, le Studio fait créer **la publication entière, texte compris, par OpenAI**
(`src/lib/social-v2/visual-mode.ts` : « images finales 100 % IA », la mise en page du Studio a été retirée). Plusieurs
résultats ci-dessous (points 1.1, 1.2, 1.6) vont dans l'autre sens : la photo par OpenAI, les mots posés à part. Je le
signale clairement, car revenir à une mise en page faite par le Studio change une décision passée : c'est au
propriétaire de dire oui ou non.

---

## 1. Composer une publication « niveau Canva » automatiquement

### 1.1 Ce que disent les études : séparer l'image et les mots

- **COLE (Microsoft Research Asia, 2023-2024).** Le système découpe la création en petites tâches confiées chacune à un
  modèle spécialisé : plan et textes, fond qui laisse de la place, objet détouré, typographie (police, taille,
  espacement, position : une quinzaine de réglages par bloc de texte), puis relecture et correction. Le texte reste un
  calque à part, jamais peint dans l'image. Face à DALL·E 3, les personnes interrogées le préfèrent pour la justesse
  du texte (69,6 %) et la clarté du message (70,5 %). DALL·E 3 reste préféré pour la beauté pure, surtout par les
  graphistes. Preuve : **forte** (article de recherche). https://arxiv.org/html/2311.16974v2
  *Ce que SINA pourrait en faire* : OpenAI crée la scène avec une zone calme voulue, et les titres sont posés par le
  Studio dans les polices de la marque, donc toujours justes et nets.
- **PosterVerse (AAAI 2026).** Même idée : l'image par un modèle de dessin, la mise en page et le texte par un moteur
  en HTML piloté par un modèle de langage. Les auteurs disent que cela règle le texte petit ou dense. Aucun chiffre dans
  le résumé. Preuve : moyenne (résumé lu, pas l'article entier). https://arxiv.org/abs/2601.03993
- **DesignAsCode (février 2026).** Une création graphique est écrite comme une page HTML et CSS, en trois temps : plan,
  écriture, puis relecture **de l'image rendue** pour corriger les défauts. Avantage annoncé : on peut refaire la même
  création à une autre taille automatiquement. Preuve : moyenne (résumé, sans chiffres). https://arxiv.org/abs/2602.17690
  *Ce que SINA pourrait en faire* : une publication = un petit fichier de mise en page, rendu en 1080 × 1350, puis en
  1080 × 1920 pour la story, sans repayer d'image.
- **PosterAgent (Paper2Poster, NeurIPS 2025).** Trois leçons très concrètes :
  1. ne pas laisser le modèle donner des coordonnées en pixels (c'est instable) ; il choisit une structure (un
     découpage en cases), et le code calcule les positions ;
  2. un relecteur regarde **l'image rendue**, case par case en zoomant, et répond par des étiquettes courtes
     (« déborde », « trop vide », « bon ») ;
  3. on lui montre deux exemples, un raté et un réussi ; sans eux, des débordements et de grands vides passent.
  Sans le relecteur, **tous** les essais avaient de graves défauts (texte qui déborde, chevauchements). Preuve :
  **forte** pour le principe (article relu, essais montrés en images, pas en chiffres).
  https://arxiv.org/html/2505.21497v2
  *Ce que SINA pourrait en faire* : choisir un modèle de grille parmi une liste, jamais des pixels ; puis faire relire
  l'image rendue avec un exemple raté et un exemple réussi dans la consigne.
- **PlayGround (octobre 2026).** Place les éléments par groupes, en regardant à chaque étape le rendu en cours, avec un
  vérificateur visuel. Résumé seul, aucun chiffre. Preuve : faible à moyenne. https://arxiv.org/abs/2610.18865
- **Graphic-Design-Bench (avril 2026).** Les meilleurs modèles fermés comprennent bien le sens d'une création, mais
  restent faibles dès qu'il faut de la précision : mise en page complexe, perception fine de la typographie. « Largement
  non résolu », disent les auteurs. Preuve : moyenne (résumé). https://arxiv.org/abs/2604.04192
- **OpenAI le dit lui-même** dans son guide officiel : « le modèle peut encore avoir du mal avec le placement précis et
  la netteté du texte » et « du mal à placer des éléments précisément dans des compositions structurées ». Preuve :
  **forte** (documentation officielle). https://developers.openai.com/api/docs/guides/image-generation
  Le même guide confirme : fond transparent possible (`background: "transparent"`, en PNG ou WebP), tailles libres en
  multiples de 16 (proportions entre 1:3 et 3:1, jusqu'à 3840 pixels de côté), et le modèle `gpt-image-1` n'est plus
  servi depuis le 23 octobre 2026 (page japonaise du modèle). Le code du Studio cite encore `gpt-image-1` à quelques
  endroits : à vérifier. https://developers.openai.com/ja-JP/api/docs/models/gpt-image-1

### 1.2 Les moteurs qui posent texte, formes et logo sur une photo

| Moteur | Ce qu'il fait | Prix et conditions | Preuve |
|---|---|---|---|
| **Canva Connect API, remplissage automatique** | On publie un « modèle de marque » avec des champs (texte, image), puis on envoie les valeurs ; Canva crée le visuel | Le compte doit être Canva Pro, Teams ou Enterprise, avec double authentification ; les images doivent d'abord être téléversées ; « des limites d'usage seront introduites plus tard » ; un champ inconnu est ignoré sans erreur | forte (documentation officielle) https://www.canva.dev/docs/connect/autofill-guide/ |
| **Satori** (Vercel) | Transforme du HTML et CSS en image vectorielle, sans navigateur | Gratuit, libre. Grille et boîtes flexibles prises en charge, polices TTF, OTF, WOFF et WOFF2 ; seules les polices fournies sont utilisées ; `@font-face` ignoré | forte (dépôt officiel) https://github.com/vercel/satori |
| **Rendu par navigateur** (Playwright, déjà dans le Studio) | Rend une vraie page HTML en image : tout le CSS, toutes les polices | Gratuit ; plus lent et plus lourd | moyenne (connu, pas mesuré ici) |
| **Polotno** | Éditeur type Canva à intégrer, rendu côté serveur à partir d'un fichier JSON | Licence commerciale sur devis (« de quelques centaines à 20-30 000 » selon la page des prix) ; un comparatif tiers cite 249 $ par mois | moyenne https://polotno.com/pricing ; https://npmjs.com/package/polotno-node |
| **Bannerbear / Placid / Templated** | Modèles en ligne, texte qui s'ajuste à sa case, recadrage sur le sujet (Bannerbear) | Environ 0,03 à 0,06 $ l'image à l'entrée (Templated 29 $ pour 1 000, Bannerbear 49 $ pour 1 000, Placid 19 $ pour 500 selon Bannerbear) | faible (comparatifs écrits par les concurrents eux-mêmes) https://www.bannerbear.com/blog/bannerbear-vs-placid/ |

*Ce que SINA pourrait en faire* : utiliser ce que le Studio a déjà (Playwright, `@napi-rs/canvas`, `sharp`) pour
poser titre, formes et logo en HTML. Aucun fournisseur payant n'est nécessaire, et Canva demanderait un compte payant
par client, ce qui ne convient pas.

### 1.3 Trouver la zone calme et vérifier la lisibilité

- **Zone calme.** Salesforce a entraîné un détecteur de « zone où écrire » sur des images annotées par des experts
  (le meilleur : YOLOv5). Leçon honnête : il n'y a pas une seule bonne zone, et le placement exact du texte dans la zone
  reste un problème ouvert. Preuve : moyenne. https://arxiv.org/pdf/2012.08933
  Méthode plus simple, publiée pour fabriquer des images avec texte : calculer une carte de ce qui attire l'œil et ne
  garder que les régions sous la moyenne. Preuve : moyenne. https://arxiv.org/pdf/1807.03021
- **Contraste.** Je n'ai trouvé aucune étude qui contrôle automatiquement le contraste d'un texte posé sur une photo.
  Le plus solide reste de mesurer la luminosité des pixels **sous le bloc de texte** et d'appliquer le seuil des règles
  d'accessibilité du web (4,5 pour 1 pour un texte courant, 3 pour 1 pour un grand titre). C'est ma proposition, pas un
  résultat publié.
  *Ce que SINA pourrait en faire* : demander à OpenAI une zone calme à un endroit précis, la vérifier par le calcul
  (peu de détails, contraste suffisant), et sinon assombrir doucement cette zone ou changer la case de la grille.

### 1.4 Les zones à laisser libres (format vertical)

Les guides tiers s'accordent sur le haut (14 %, environ 270 pixels sur 1920) et les côtés (6 %, environ 65 pixels). Le
bas varie selon les sources : 20 % pour les stories, 35 % pour les Reels ; une source dit que Meta a unifié les deux en
mars 2026, sans confirmation. Je n'ai pas pu lire la page officielle de Meta. Preuve : faible.
https://blog.adnabu.com/meta-ads/meta-safe-zones/
*Ce que SINA pourrait en faire* : prendre la règle la plus prudente partout (haut 14 %, bas 35 %, côtés 6 %) et la
faire vérifier par le calcul.

### 1.5 Le juge : ce que valent les modèles qui notent une création

- **DesignSense (Adobe, février 2026).** Sur environ 10 000 paires de mises en page jugées par des humains, GPT-5,
  o3 et Gemini 2.5 Pro trouvent le bon gagnant dans 67 à 72 % des cas, mais s'effondrent quand il faut dire « les deux
  sont bonnes » ou « les deux sont ratées » (accord réel très faible). Les exemples dans la consigne n'aident qu'un
  peu. Même les humains ne sont d'accord entre eux qu'à 81 % sur le choix simple. Preuve : **forte**.
  https://arxiv.org/html/2602.23438
  *Ce que SINA pourrait en faire* : faire choisir le juge entre deux versions (dans les deux ordres) plutôt que lui
  demander « est-ce bon ? », et garder une vérification par le calcul pour ce qui se mesure.
- **Relecture en équipe (Adobe, août 2025, revu en mars 2026).** Un chef de relecture répartit la création entre
  plusieurs relecteurs spécialisés (alignement, chevauchements, espaces, lisibilité, trop de mots, trop de polices,
  couleurs, accord texte-image), chacun avec des exemples proches tirés d'une bibliothèque, puis il fait la synthèse.
  Résultat : de 63 à 75 % de jugements justes, contre 58 à 66 % pour un seul juge. Preuve : **forte**.
  https://arxiv.org/html/2508.10745v2
  *Ce que SINA pourrait en faire* : plusieurs relectures courtes et ciblées, nourries des publications que le
  propriétaire a validées ou refusées, plutôt qu'une note unique.
- **Plus ancien (2024).** Les modèles s'accordent bien avec les humains sur l'alignement, les chevauchements et les
  espaces vides, mieux que des règles calculées. Preuve : moyenne. https://arxiv.org/html/2410.08885

---

## 2. Les formats qui marchent en 2025-2026

### 2.1 Tailles exactes à retenir

| Réseau | Format | Taille | Source et preuve |
|---|---|---|---|
| Instagram, fil | portrait | 1080 × 1350 (4:5), le plus sûr ; 1080 × 1440 (3:4) colle à la nouvelle grille du profil | La grille du profil montre tout en 3:4 depuis janvier 2025 ; les sources divergent sur l'acceptation du 3:4 partout. Moyenne. https://buffer.com/resources/instagram-grid/ |
| Instagram, carrousel | jusqu'à 20 images | même taille pour toutes | Later. Faible à moyenne. https://later.com/blog/best-time-to-post-on-Instagram/ |
| Stories, Reels, TikTok | vertical | 1080 × 1920 (9:16) | Meta (partage vers les stories : minimum 720 × 1280, 9:16 conseillé). **Forte**. https://developers.facebook.com/docs/instagram-platform/sharing-to-stories |
| TikTok, mode photo | carrousel jusqu'à 35 images | 1080 × 1920 | Sources tierces concordantes sur 35 ; le minimum et le poids divergent. Faible. https://buffer.com/resources/tiktok-carousel/ |
| Pinterest | épingle | 1000 × 1500 (2:3) | Sources tierces citant la page de Pinterest ; non lue moi-même. Faible à moyenne. https://www.tailwindapp.com/blog/pinterest-image-size |
| Fiche Google de l'entreprise | « Nouveauté », « Offre », « Événement » | 1200 × 900 (4:3) conseillé par des tiers ; pas de taille officielle trouvée | Les publications de plus de 6 mois sont archivées. Faible. https://whitespark.ca/google-business-profile-guide/google-posts-updates/ |

*Ce que SINA pourrait en faire* : le code ne connaît que 1:1, 4:5, 9:16 et 16:9
(`post-aspect.ts`) ; ajouter 2:3 pour Pinterest et 4:3 pour la fiche Google, et préférer 4:5 au carré pour le fil.

### 2.2 Les chiffres nouveaux

- **Carrousels, par taille de compte (Socialinsider, 67,5 millions de publications, 579 000 comptes d'entreprise).**
  Taux d'interaction du carrousel : 0,55 % en 2025, 0,50 % au 3e trimestre 2026, toujours devant les Reels (0,48 %) et
  l'image seule (0,35 %). Pour un compte de 1 000 à 5 000 abonnés, un carrousel fait en moyenne **993 vues, 2
  commentaires et 1 enregistrement**. Ces chiffres modestes sont utiles pour ne rien promettre au client. Preuve :
  moyenne (attention : la page mélange des dates 2025 et 2026). https://www.socialinsider.io/blog/instagram-carousel-posts-study/
- **Nombre d'images dans un carrousel.** Une étude d'éditeur (PostEverywhere, décembre 2025 à octobre 2026) : 7 à 10
  images font 17 % de mieux que la moyenne du compte, 4 à 6 images 13 %, 2 à 3 images 5 %. Preuve : faible (données de
  l'éditeur, méthode non publiée). https://posteverywhere.ai/blog/instagram-carousel-best-practices
- **Rythme (Buffer, déjà lu).** Rien de neuf sur la fréquence ; Buffer précise que les stories ne sont presque pas
  montrées aux non-abonnés : elles servent à garder les clients, pas à en trouver. Preuve : moyenne.
  https://buffer.com/resources/how-often-to-post-on-instagram/
- **Heures (Buffer, 9,6 millions de publications, 2024-2025).** Meilleurs créneaux : jeudi 9 h, mercredi 12 h et 18 h.
  Les études se contredisent entre elles (Sprout : lundi et mardi après-midi). Preuve : faible à moyenne.
  https://buffer.com/best-time-to-post-on-instagram
  *Ce que SINA pourrait en faire* : ne pas promettre « la meilleure heure » ; proposer un créneau simple, puis apprendre
  des publications du client.

### 2.3 Ce que disent les plateformes officiellement

- **Instagram, 30 avril 2026 : l'originalité s'étend aux photos et carrousels.** Les comptes qui republient surtout le
  travail des autres ne sont plus recommandés. Ajouter un cadre, un filigrane ou une mention ne suffit pas. « 75 % des
  recommandations aux États-Unis viennent désormais de publications originales ». La page ne dit rien des images
  créées par IA. Preuve : **forte**. https://creators.instagram.com/blog/rewarding-original-creators-on-instagram
  *Ce que SINA pourrait en faire* : ne jamais republier une même image sans vraie transformation, et toujours partir du
  vrai produit du client.
- **TikTok.** Le « Creative Center » (gratuit, mis à jour en juillet 2026) montre les publicités qui marchent,
  filtrables par pays et par métier. Preuve : forte pour l'existence de l'outil. https://ads.tiktok.com/help/article/creative-tips
  *Ce que SINA pourrait en faire* : s'en servir comme source d'idées de format, jamais comme modèle à copier.

---

## 3. Légendes, accroches et mots-dièse

- **Cinq mots-dièse au plus, depuis le 18 décembre 2025.** Instagram : « Instagram va progressivement limiter à cinq
  le nombre de mots-dièse dans la légende d'un Reel ou d'une publication ». Adam Mosseri a dit en février 2025 qu'ils
  « ne marchent pas » pour gagner en portée, et en mai 2025 qu'ils servent à dire de quoi parle la publication. Preuve :
  **forte** (citation d'Instagram rapportée par un média spécialisé).
  https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/
  *Ce que SINA pourrait en faire* : 3 à 5 mots-dièse précis (métier + ville + produit), jamais une liste.
- **Les signaux qui comptent selon Mosseri** : le temps passé, les « j'aime » par personne touchée, et les envois en
  message privé par personne touchée. Preuve : moyenne (repris par Buffer, déclarations sans date précise).
  https://buffer.com/resources/instagram-algorithms/
- **Les publications publiques des comptes professionnels apparaissent sur Google depuis le 10 juillet 2025** (comptes
  publics, personnes majeures). Les légendes sont lues par Google. Preuve : moyenne (plusieurs sources concordantes,
  annonce d'Instagram non lue moi-même). https://metricool.com/instagram-indexing-on-google/
  *Ce que SINA pourrait en faire* : écrire dans la 1re phrase les mots qu'un client chercherait (« boulangerie à
  Nantes », « bougie au figuier ») ; c'est aussi ce qui rend la publication claire pour un inconnu.
- **Longueur de la légende** : les études se contredisent. Socialinsider (9 millions de publications) ne trouve presque
  pas d'écart sur Instagram ; ce qui compte, c'est que l'essentiel soit dit tout de suite. Mosseri : une longue légende
  n'aide ni ne nuit. Preuve : moyenne. https://www.socialinsider.io/blog/social-media-caption-length-best-practices/
  *Ce que SINA pourrait en faire* : 1re ligne = l'offre ou la scène en clair (c'est elle qu'on voit avant « plus ») ;
  ensuite 2 à 4 lignes ; une invitation qui donne envie, sans ordre.
- **Ce que veulent les gens (Sprout Social, 2 300 consommateurs, 2026)** : du contenu fait par des humains en priorité,
  que les marques arrêtent de publier des images d'IA sans le dire, la moitié veut un ton moins vendeur, moins de
  publicité et plus de coulisses. Preuve : moyenne (sondage, chiffres détaillés derrière inscription ; je n'ai lu que
  la page et des résumés). https://sproutsocial.com/insights/data/2026-social-media-content-strategy-report/
- **Hootsuite 2026 (6 500 professionnels)** : 79 % des gestionnaires de réseaux utilisent l'IA chaque jour ; plus de 30 %
  des consommateurs disent être moins enclins à choisir une marque dont les publicités se voient faites par IA. Preuve :
  moyenne (rapport payant, chiffres lus dans des résumés). https://blog.hootsuite.com/social-media-trends
- **Mosseri, mémo du 31 décembre 2025** : « l'image flatteuse est bon marché à produire et ennuyeuse à regarder » ;
  « l'aspect professionnel devient le signe » de l'IA ; la question devient « peux-tu faire quelque chose que toi seul
  peux créer ? ». Preuve : moyenne (citations rapportées par Om Malik).
  https://om.co/2026/01/01/what-is-instagrams-adam-mosseri-really-saying-in-his-year-end-memo/
  *Ce que SINA pourrait en faire* : c'est un vrai risque pour des images « campagne haut de gamme » 100 % IA. La parade
  la plus juste : partir toujours de la vraie photo du client, et glisser chaque semaine une publication de coulisses
  avec ses propres photos (atelier, mains, préparation), sans personne sans accord.

---

## 4. Le calendrier du mois

### 4.1 Temps forts français (à tenir à jour)

| Date | Temps fort | Vérifié ? |
|---|---|---|
| 6 janvier au 2 février 2027 | Soldes d'hiver (métropole) | Dates **calculées** d'après l'arrêté du 27 mai 2019, à confirmer à la parution (attendue mi-décembre) ; Moselle, Meuse, Vosges : à partir du 2 janvier. https://www.toutsurmesfinances.com/argent/a/soldes-d-hiver-et-d-ete-les-dates-dans-toute-la-france ; règle : https://www.entreprises.gouv.fr/fr/commerce-et-artisanat/ventes-reglementees/soldes |
| janvier | Galette (Épiphanie), 2 février Chandeleur | dates fixes |
| 14 février 2027 | Saint-Valentin | date fixe |
| 7 mars 2027 | Fête des grands-mères (1er dimanche de mars) | mon calcul |
| 30 mai 2027 | Fête des mères | plusieurs sources ; règle de 1950 (dernier dimanche de mai, ou 1er de juin si c'est la Pentecôte). https://icalendrier.fr/fetes/fete-des-meres/ |
| 20 juin 2027 | Fête des pères (3e dimanche de juin) | mon calcul |
| fin juin 2027 | Soldes d'été (quatre semaines) | règle de date non vérifiée dans cette recherche |
| septembre | Rentrée | |
| 31 octobre | Halloween | |
| 27 novembre 2026, puis 26 novembre 2027 | « Black Friday » (nom commercial) | mon calcul |
| décembre | Noël, cadeaux, fin d'année | |

*Ce que SINA pourrait en faire* : un tableau des temps forts dans le code, avec pour chacun le nombre de jours
d'annonce avant (une semaine pour une fête, trois jours pour des soldes), et seulement ceux qui vont avec le métier du
client.

### 4.2 Rythme et réemploi

- Les données de Buffer (rapport d'hier) justifient 3 à 5 publications par semaine dans le fil. Les forfaits (1 à 3
  images par jour) vont au-delà. **Mon avis, non vérifié** : 1 publication par jour dans le fil au plus, le reste en
  stories (pour garder les clients) et en épingles Pinterest ou publications Google (qui vivent longtemps).
- **Réemploi** : une même création, recomposée (et non étirée) en 4:5, 9:16, 2:3 et 4:3, fait 4 réseaux. Avec une mise en
  page en HTML (point 1.1), le Studio le fait sans repayer d'image. Attention à la règle d'originalité d'Instagram
  (point 2.3) : republier la même image sur Instagram n'est pas un réemploi, c'est une répétition.
- **Recyclage** : les publications d'une fiche Google sont archivées après 6 mois (source Whitespark ci-dessus). Une
  publication qui a bien marché peut revenir des mois plus tard, avec une autre image.

---

## 5. Publier « d'un geste » sans branchement aux plateformes

- **Partage natif depuis le navigateur (Web Share).** On peut partager des fichiers image depuis une page web, seulement
  en HTTPS, seulement après un geste de la personne (un appui), en testant d'abord `navigator.canShare({ files })`.
  Pris en charge par Chrome, Edge et Safari ; pas par Firefox. Preuve : **forte**.
  https://web.dev/articles/web-share
- **Piège sur iPhone** : si on envoie l'image **et** un texte dans le même partage, l'image peut être perdue (rapport
  d'anomalie de WebKit, 2023 ; témoignages pour Instagram et Facebook). Conseil de développeurs : partager le fichier
  seul, et préparer l'image avant l'appui (sinon le geste « expire »). Preuve : moyenne.
  https://lists.webkit.org/pipermail/webkit-unassigned/2023-February/1084883.html ;
  https://dev.to/shibowen336/sharing-a-canvas-generated-image-on-ios-with-the-web-share-api-2j0m
- **La légende ne passe pas.** La documentation officielle de Meta pour le partage vers le fil ne parle que de l'image :
  aucune légende pré-remplie. Preuve : **forte**. https://developers.facebook.com/docs/instagram-platform/sharing-to-feed
  *Ce que SINA pourrait en faire* : un seul bouton « Publier sur Instagram » qui copie la légende, puis ouvre le partage
  de l'image ; le client n'a plus qu'à coller.
- **Story avec fond et autocollant** : le lien spécial `instagram-stories://share` (iPhone) ou l'intention
  `ADD_TO_STORY` (Android) exige un identifiant d'application Facebook depuis janvier 2023, et n'existe que pour les
  applications installées, pas pour une page web. Vidéos de 20 secondes au plus. Preuve : **forte**.
  https://developers.facebook.com/docs/instagram-platform/sharing-to-stories
  *Ce que SINA pourrait en faire* : rien pour l'instant (cela demanderait une application et un enregistrement chez Meta,
  ce que le propriétaire a mis de côté) ; le partage natif suffit.
- **Non vérifié** : que l'application Instagram accepte bien une image venue d'une page web, sur iPhone comme sur
  Android, et propose fil, story et Reel. Aucune source sérieuse ne le confirme ; il faut l'essayer sur un vrai téléphone
  (essai gratuit). La solution de secours conseillée : télécharger l'image.

---

## 6. Juger une publication avant de la montrer, et ce que font les outils

- **Ce que les études ajoutent au rapport d'hier** : un relecteur qui voit l'image **rendue**, avec un exemple raté et un
  exemple réussi (PosterAgent) ; plusieurs relecteurs ciblés plutôt qu'un seul (Adobe, +10 points) ; un choix entre deux
  versions plutôt qu'une note (DesignSense). Voir 1.1 et 1.5.
- **Google Pomelli.** L'aide officielle prévient : « l'IA peut parfois modifier de fins détails de vos produits, comme les
  couleurs, les logos ou les textures » et conseille de revoir chaque image avant de publier. Pomelli ne publie pas : on
  télécharge. Il propose un filigrane « créé par IA ». Preuve : **forte**.
  https://support.google.com/labs/answer/16715058?hl=en
  *Ce que SINA pourrait en faire* : comparer le produit de chaque image à la photo d'origine, et surtout ne jamais
  laisser l'IA redessiner le logo : le poser par-dessus, tel quel.
- **Canva (Magic Design, kit de marque).** Testeurs : premier jet rapide, mais rendu « qui sent la formule » et couleurs
  de marque parfois mal appliquées dans les mises en page complexes. Preuve : faible (blogs de tests).
  https://eesel.ai/blog/canva-ai-reviews
- **Predis.ai.** Avis plutôt bons (4,7 sur 5), reproches : texte en double ou mots manquants dans les légendes, peu de
  modèles, crédits perdus quand on veut refaire. Preuve : faible (avis clients). https://www.g2.com/products/predis-ai/reviews
- **Meta.** Un assistant d'IA pour les pages Facebook (juin 2026) répond à « quand publier ? » ; Meta AI propose des
  idées de publication. Rien de vérifié sur une relecture de la qualité. Preuve : faible à moyenne.
  https://techcrunch.com/2026/06/04/meta-rolls-out-a-new-ai-creator-assistant-on-facebook/
- **Non trouvé** : aucun test sérieux d'Ocoya, Blaze, Lately, de l'assistant de Buffer ou d'Adobe Express sur la qualité
  des visuels pour réseaux. Je n'ai rien lu de solide à leur sujet : je ne dis donc rien.
- **Ce qu'aucun de ces outils ne fait, d'après ce que j'ai lu** : relire l'image finale avant de la montrer. Tous
  disent « relisez vous-même ». C'est exactement la place de SINA.

---

## 7. Autres choses utiles

- **L'étiquette « IA » sur Instagram.** Les images d'OpenAI portent des métadonnées de provenance (C2PA) et un filigrane
  invisible (SynthID). Selon l'IPTC, Instagram lit un autre champ (IPTC « DigitalSourceType ») et pas le C2PA, et la
  plupart des réseaux effacent les métadonnées à l'envoi. Je n'ai pas pu vérifier si une image d'OpenAI reçoit
  aujourd'hui l'étiquette « Info IA » sur Instagram. Preuve : moyenne.
  https://help.openai.com/en/articles/8912793-c2pa-and-synthid-in-openai-generated-images ;
  https://iptc.org/news/ai-disclosure-on-social-media-a-work-in-progress/
  *Ce que SINA pourrait en faire* : prévenir le client qu'une étiquette peut apparaître, sans jamais chercher à la
  cacher (Sprout montre que les gens reprochent l'IA cachée, pas l'IA dite).
- **Ne rien promettre en chiffres.** Pour un petit compte, un carrousel moyen fait environ 1 000 vues (point 2.2). Le
  point du mois doit parler de ce que le Studio mesure lui-même (visites du site, demandes) plutôt que de promesses.

---

## Ce que je n'ai pas pu vérifier

- La page officielle de Meta sur les zones libres des stories et Reels (seulement des guides tiers, qui se contredisent
  sur le bas).
- La page officielle de Pinterest sur la taille des épingles et le texte posé dessus.
- Une taille officielle d'image pour les publications de la fiche Google.
- Qu'Instagram reçoive correctement une image partagée depuis une page web, sur iPhone et sur Android.
- Les chiffres détaillés des rapports Sprout Social et Hootsuite 2026 (derrière inscription).
- Les dates des soldes 2027 (calculées, arrêté pas encore paru) et la règle exacte des soldes d'été.
- Les résultats chiffrés de PosterVerse, DesignAsCode et PlayGround (je n'ai lu que les résumés).
- Les outils Ocoya, Blaze, Lately, l'assistant de Buffer, Adobe Express : rien de solide trouvé.

---

## Les 10 changements qui auraient le plus d'effet pour SINA

1. **Séparer la photo et les mots** (à décider par le propriétaire, car cela revient sur « 100 % IA ») : OpenAI crée la
   scène avec le vrai produit et une zone calme voulue ; le Studio pose titre, offre, formes et logo dans les polices de
   la marque, en HTML rendu par Playwright, déjà présent. Le texte est toujours juste, le logo toujours exact (COLE,
   PosterVerse, guide d'OpenAI).
2. **Une liste de modèles de grille** (une quinzaine, très différents : bandeau, titre géant, cadre, carte d'offre,
   avant-après, citation…) parmi lesquels SINA choisit ; jamais de position en pixels (PosterAgent). Les trois
   publications d'une série prennent trois grilles différentes.
3. **Un contrôle par le calcul avant tout juge** : texte qui déborde, contraste sous le texte (4,5 pour 1), zones libres
   du format vertical (haut 14 %, bas 35 %, côtés 6 %), logo présent, taille minimale des lettres.
4. **Le juge regarde l'image rendue, avec un exemple raté et un réussi**, répond par des étiquettes courtes, et choisit
   entre deux versions dans les deux ordres plutôt que de noter seul (PosterAgent, DesignSense).
5. **Plusieurs relectures courtes et ciblées** (lisibilité, clarté pour un inconnu, produit fidèle à la photo, logo,
   variété avec les 10 dernières), nourries des images validées ou refusées par le propriétaire (Adobe : +10 points).
6. **Le bouton « Publier » d'un geste** : copie la légende, puis ouvre le partage natif avec l'image seule (piège de
   l'iPhone) ; secours : téléchargement. À essayer d'abord sur un vrai iPhone et un vrai Android (gratuit).
7. **Une création, quatre formats recomposés** : 4:5 pour le fil, 9:16 pour la story, 2:3 pour Pinterest, 4:3 pour la
   fiche Google, sans repayer d'image ; jamais la même image republiée sur Instagram (règle d'originalité d'avril 2026).
8. **Des légendes écrites pour être trouvées et comprises** : la 1re ligne dit l'offre ou la scène avec les mots qu'un
   client chercherait (Google lit les légendes depuis juillet 2025) ; 3 à 5 mots-dièse précis au plus (limite d'Instagram
   depuis décembre 2025).
9. **Le calendrier des temps forts français dans le code**, avec un délai d'annonce par fête et seulement ceux qui vont
   avec le métier ; au plus une publication par jour dans le fil, le reste en stories, épingles et fiche Google.
10. **Une publication « vraie » par semaine** faite des propres photos du client (coulisses, atelier, mains), pour
    répondre au mémo de Mosseri et au souhait des gens (Sprout) ; et ne jamais cacher l'usage de l'IA.
