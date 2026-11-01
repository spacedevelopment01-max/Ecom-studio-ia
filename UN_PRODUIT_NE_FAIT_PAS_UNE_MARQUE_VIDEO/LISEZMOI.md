# Publicité 03 — « Un produit ne fait pas une marque »

Film publicitaire vertical natif (1080 × 1920, 52,5 s, 30 images/s) pour E-COM STUDIO IA, destiné aux personnes qui
veulent se lancer dans le dropshipping ou créer une boutique e-commerce qui se démarque.

Livrables dans ce dossier :
- `un-produit-ne-fait-pas-une-marque-1080x1920.mp4` : film final, H.264 et AAC, compatible TikTok, Instagram Reels
  et YouTube Shorts (moins de 60 s, format 9:16).
- `miniature-1080x1920.png` : miniature verticale.
- `scenes/` : 21 captures des scènes principales (nom = seconde du film).
- `controle-cadrage-*.png` : deux images par seconde, horodatées.
- `audio/` : voix brute, voix off resserrée, musique, mixage final et crédits des effets.
- `projet/` : projet source complet et reproductible.

## Voix off (texte du brief, mot pour mot)

> Tu as trouvé un produit à vendre. Parfait. Mais regarde : des centaines de boutiques proposent déjà exactement le
> même ! Même produit, mêmes photos, mêmes publicités. Et tu espères qu'un client te choisira, toi ? Il faut sortir du
> lot ! Avec E-COM STUDIO IA, arrête de jongler entre dix outils. Ouvre Syna, explique ton projet… et regarde ! Un logo,
> une identité, un univers visuel, puis une vraie boutique : accueil, fiches produits, arguments, panier, version
> mobile… Tout prend forme dans le même Studio ! Et ce n'est pas fini ! Visuels produits, publications, publicités,
> contenus SEO… Tout suit la même identité. Plus besoin de tout recommencer sur une autre plateforme ! Tu veux changer
> quelque chose ? Tu le demandes à Syna ! Ton site et tes contenus évoluent, et tu gardes la main sur ta marque ! Un
> produit ne suffit pas. Construis une marque qu'on reconnaît. E-COM STUDIO IA : tout ton e-commerce, au même endroit !

La voix est générée en une seule prise : voix cedar d'OpenAI, ton énergique, 63,3 s. Elle est ensuite resserrée
sans toucher au timbre :
- chaque silence de plus de 0,2 s est ramené à 0,2 s, avec un fondu de 15 ms (`tighten.py`) ;
- le tempo est accéléré de 5 %.

Résultat : 49,7 s, soit environ 186 mots par minute, sans aucune pause de plus de 0,25 s. La voix couvre 49,7 s sur
52,5 s ; les 2,5 s restantes portent la signature finale, avec la musique.

## Ce que montre le film (synchronisé sur les mots)

| Temps | Image | Voix |
| --- | --- | --- |
| 0–2,8 s | Impact : le carton s'ouvre, une gerbe d'étincelles, la lampe LED jaillit en tournant. La caméra fait le tour complet de la lampe (surface noire, anneau LED, cerclage métal). | « Tu as trouvé un produit à vendre. Parfait. » |
| 2,8–6,5 s | Recul rapide : la lampe se duplique en onde, des centaines de lampes identiques forment un mur 3D. | « Mais regarde : des centaines de boutiques proposent déjà exactement le même ! » |
| 6,5–9 s | Chaque lampe reçoit sa boutique en ligne, toutes identiques. Un éclair parcourt les mêmes photos, des publicités génériques surgissent, puis la caméra fait une orbite rapide. | « Même produit, mêmes photos, mêmes publicités. » |
| 9–12,2 s | La caméra plonge dans l'allée puis dans un tunnel de boutiques identiques. Sur « sortir du lot », la lampe s'allume, le tunnel s'éteint et la lampe file vers l'ordinateur. | « Et tu espères qu'un client te choisira, toi ? Il faut sortir du lot ! » |
| 12,2–17,4 s | Une onde bleue part de l'ordinateur et le vrai logo E-COM STUDIO ia apparaît. Sept outils séparés convergent dans l'écran. La vraie conversation SYNA (version mobile) sort de l'écran ; le message s'écrit puis est enregistré, avec la vraie réponse du studio. | « Avec E-COM STUDIO IA, arrête de jongler entre dix outils. Ouvre Syna, explique ton projet… et regarde ! » |
| 17,4–20,9 s | Traversée de l'écran vers un espace de création 3D. L'anneau du logo KELVO se trace, le mot-symbole apparaît, la palette tourne autour de la lampe, la typographie s'affiche. L'écrin se construit face par face autour de la lampe, avec une carte de visite. La lampe traverse ensuite un portail. | « Un logo, une identité, un univers visuel, puis une vraie boutique : » |
| 20,9–26,8 s | Construction de la boutique : <br>• l'accueil se monte section par section ; <br>• la fiche produit ; <br>• les bénéfices (« arguments ») ; <br>• le panier ; <br>• la version ordinateur, à côté des téléphones (version mobile). <br>Puis un travelling orbital autour de la boutique. | « accueil, fiches produits, arguments, panier, version mobile… Tout prend forme dans le même Studio ! » |
| 26,8–36,4 s | Chaque création est présentée en grand puis rejoint sa place autour de la lampe : <br>• la photo catalogue se retourne en visuel de marque ; <br>• trois publications ; <br>• une publicité animée sur un téléphone ; <br>• les blocs SEO. <br>Une onde ambre passe sur l'ensemble (« même identité »), puis le calendrier se remplit (« À valider »). | « Et ce n'est pas fini ! Visuels produits, publications, publicités, contenus SEO… Tout suit la même identité. Plus besoin de tout recommencer sur une autre plateforme ! » |
| 36,4–42,8 s | Rotation rapide autour de la lampe, puis plongée vers la vraie conversation SYNA, où le message s'écrit. La boutique se décompose en sections : les bénéfices remontent sous l'ouverture et la boutique passe en version premium sombre ; la publication liée change aussi. Réponse de SYNA et pastille v2. | « Tu veux changer quelque chose ? Tu le demandes à Syna ! Ton site et tes contenus évoluent, et tu gardes la main sur ta marque ! » |
| 42,8–52,5 s | Retour au mur de boutiques identiques. Une boutique se retourne et devient KELVO : elle s'illumine pendant que le reste s'éteint. Boutique, écrin, publications et publicité convergent dans l'ordinateur où s'affiche le vrai studio. Vrai logo E-COM STUDIO ia, puis « VOTRE MARQUE COMMENCE ICI. », « AVEC SYNA. » et le bouton « Créez votre marque ». | « Un produit ne suffit pas. Construis une marque qu'on reconnaît. E-COM STUDIO IA : tout ton e-commerce, au même endroit ! » |

## Format vertical 9:16

Tout est construit directement en 1080 × 1920, rien n'est recadré :
- **Disposition** : les objets sont disposés en hauteur et en profondeur. Les éléments sont présentés au premier plan
  puis rangés dans une composition verticale.
- **Interfaces** : le studio est montré dans sa vraie version mobile, et la boutique KELVO en téléphone.
- **Plans de présentation** : le produit, les téléphones, les ordinateurs, l'écrin, le calendrier, le logo et le
  bouton final sont entiers. Seules les transitions laissent volontairement passer des objets hors du cadre.
- **Zones de sécurité** : les sous-titres sont à 230 px du haut, ou à 400 px du bas quand le sujet occupe le haut. Le
  bouton final est à environ 430 px du bas, au-dessus des boutons des applications.

Défauts corrigés après les captures de contrôle :
- lampe coupée à côté de l'ordinateur ;
- logo du studio grisé dans le final ;
- lampe trop proche au début ;
- mur de lampes trop clairsemé ;
- couleurs et typographie coupées en bas ;
- téléphones de la boutique coupés sur les côtés ;
- publications, SEO et calendrier coupés ;
- image noire de la boutique v2 au premier affichage ;
- étiquette v2 au bord ;
- fond trop chargé derrière la signature ;
- éblouissement du sol.

## Fidélité au vrai produit

**Repris du studio réel (branche `main`)** :
- logo et mot-symbole d'E-COM STUDIO ia, couleurs, polices et icônes ;
- écran « Quel projet souhaitez-vous créer ? » ;
- SYNA présentée uniquement comme une conversation : « SYNA · Une mémoire pour tout le Studio », sans avatar ni robot ;
- réponse réelle au premier message : « Message exact conservé. Une réponse IA nécessite maintenant un devis et votre
  confirmation. » ;
- « Votre prochain message concerne cet écran : boutique » ;
- barre latérale d'un projet de produits (Pilote, Produit, Stratégie, Marque, Boutique, Catalogue, Images, Vidéos,
  Publications, Publicités, Blog) ;
- pastille de version v1/v2, chaque modification créant une version restaurable ;
- « Publication image · En attente de validation », « Publicité vidéo · Brouillon IA », « Visuel produit · Brouillon
  IA » ;
- calendrier « À valider » avec « Aucune ne dépense d'IA ni ne publie sans approbation. » ;
- libellés SEO réels : Titre SEO, Méta-description, Questions et réponses.

**Fictif (créé pour la publicité)** : la lampe, la marque KELVO, son logo, sa palette (nuit, ambre, corail, brume,
graphite), ses polices (Space Grotesk et Manrope), son écrin, sa boutique, ses publications et ses publicités. Les
boutiques génériques sont volontairement sans marque.

**Aucun chiffre inventé** : ni prix, ni ventes, ni avis, ni étoiles, ni pourcentages, ni durée d'autonomie. Les
bénéfices de la lampe fictive sont qualitatifs (recharge USB-C, lumière chaude réglable, format nomade, finition métal).

**Honnêteté** :
- Le film raccourcit le temps. Dans le studio réel, une demande comme « rends la boutique plus premium » passe par l'IA :
  SYNA présente un devis et attend ton accord avant d'agir. Le film montre ce principe au premier message.
- La réponse finale de SYNA est une formulation illustrative. Le résultat montré correspond à des opérations réelles
  du moteur de site : déplacement de section, couleurs et typographie, version v2 restaurable.
- « Dix outils » est une figure de style du texte du brief, pas un comptage.

## Technologies réellement employées

- **Three.js 0.184** pour toute la 3D : lampe, carton, écrin, murs instanciés de centaines de lampes et boutiques,
  tunnel, ordinateurs, téléphones, lumières, ombres et bloom.
- **GSAP** pour l'horloge, les transitions et les textes. Les deux bibliothèques sont copiées dans
  `projet/assets/vendor/`.
- **HyperFrames** pour la composition et le rendu MP4 (`npx hyperframes render -q delivery`).
- **Playwright / Chromium** pour photographier les écrans (planches HTML) et les photos produit 3D.
- **API OpenAI** uniquement pour la voix : `gpt-4o-mini-tts`, voix cedar, une prise, environ 0,016 $ (dans le plafond de 0,03 $ accordé). Aucune
  transcription payante : les mots sont calés sur les pauses mesurées de la voix (`align.py`, précision d'environ
  ±0,3 s à l'intérieur d'une phrase).
- **Musique** : compositeur du studio (`src/lib/media/song.ts`, style « pop »), banque GeneralUser GS libre pour un
  usage commercial.
- **Effets** : fournis avec HyperFrames, sous licence Pixabay (usage commercial autorisé, voir
  `audio/CREDITS-sfx.md`).
- **Son** : normalisé à −15 LUFS.
- **Blender** : non installé dans cet environnement, donc non utilisé. Toute la 3D est faite avec Three.js.
- **Cadence** : 30 images/s, choisie par le propriétaire parce que le rendu 3D se fait sans carte graphique.

## Rapport de contrôle qualité

Vérifications faites sur le film final, à partir des captures de contrôle (deux images par seconde, horodatées) et
des scènes principales (`scenes/`). La vidéo a été relue après chaque correction.

| # | Point du brief | Résultat |
| --- | --- | --- |
| 1 | Accroche dès la première seconde | Oui : impact, ouverture du carton, gerbe d'étincelles et lampe qui jaillit dès 0,1 s. Aucun écran titre. |
| 2 | Rythme suffisamment rapide | Oui : plans de 0,5 à 3 s, rarement 4 s quand plusieurs transformations s'y enchaînent. Voix à environ 186 mots/min. |
| 3 | Moments visuellement ennuyeux | Aucun repéré : chaque seconde porte une action (rotation, construction, déplacement de caméra, apparition). |
| 4 | Pauses de la voix | Aucune pause de plus de 0,25 s (vérifié en mesurant les silences de la voix finale). La voix couvre 49,7 s sur 52,5 s ; les 2,5 s finales portent la signature et le bouton. |
| 5 | Animations calées sur les paroles | Oui, mot par mot (`vo/mots.json`). Exemples : « logo » → l'anneau se trace, « boutique » → la boutique sort du portail, « publicités » → la publicité animée, « Syna » → la conversation est à l'écran, « au même endroit » → tout converge dans le studio. Précision d'environ ±0,3 s à l'intérieur d'une phrase. |
| 6 | Produits et ordinateurs entiers | Oui dans leurs plans de présentation. Corrections faites : lampe trop proche au début, lampe coupée à côté de l'ordinateur, téléphones coupés. |
| 7 | Interfaces et textes cadrés en 9:16 | Oui : studio en version mobile, sous-titres dans les zones de sécurité. Les seuls objets coupés le sont pendant les transitions (outils qui volent, éléments qui convergent). |
| 8 | Transformations réellement en 3D | Oui : tout est calculé en 3D. Carton articulé, lampe modélisée, murs de centaines d'objets, tunnel, écrin construit face par face, téléphones et ordinateurs en volume. Aucun zoom sur une image fixe. |
| 9 | Variété des plans | Orbite rapide, recul, plongée et tunnel, plan fixe sur l'ordinateur, traversée d'écran, travellings, contre-plongée, montée verticale. Chaque transition est différente : éclair, onde bleue, portail, onde ambre, retour au mur. |
| 10 | Identité KELVO cohérente | Même symbole, mêmes couleurs, mêmes polices et même ton sur le logo, l'écrin, la boutique, les publications, les publicités et la carte. |
| 11 | SYNA fidèle au vrai studio | Oui : panneau de conversation réel, version mobile, libellés et réponses du code actuel. Aucun avatar. |
| 12 | Logos et textes corrects | Vrai logo E-COM STUDIO ia, avec le carré encre corrigé dans la version finale (il paraissait gris sous la lumière). Sous-titres identiques au texte de la voix (vérifié par programme). Signature : « VOTRE MARQUE COMMENCE ICI. », « AVEC SYNA. », bouton « Créez votre marque ». |
| 13 | Voix expressive et intelligible | Prise unique énergique. Resserrée sans changer la hauteur : silences raccourcis, tempo +5 %. |
| 14 | Mixage | Musique baissée automatiquement sous la voix, effets dosés (impacts adoucis après écoute des niveaux). Son à −15 LUFS, crête à −1,9 dB. |
| 15 | Fonctionnalités compréhensibles | Logo, identité, écrin, boutique (accueil, fiche, bénéfices, panier, ordinateur et mobile), visuels, publications, publicités, SEO, calendrier, modification par SYNA et version restaurable. |
| 16 | Envie de découvrir le Studio | Final sur le vrai studio et le bouton « Créez votre marque ». |

**Non vérifié ici** : je n'ai écouté la musique et les bruitages qu'à travers des mesures de niveau, pas à l'oreille.
Je n'ai pas testé la publication réelle sur TikTok, Instagram et YouTube. Le fichier respecte leurs formats
(MP4 H.264 et AAC, 9:16, moins de 60 s).
