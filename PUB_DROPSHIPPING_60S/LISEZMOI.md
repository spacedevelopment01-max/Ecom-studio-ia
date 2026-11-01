# Publicité « Le dropshipper déjanté » — film complet (version corrigée, 74 s)

Film vertical 1080 × 1920, 24 images/s, 73,8 s, son à −15 LUFS.

- **0 à 14 s** : la scène validée (`TEST_CINEMA_01_DROPSHIPPER_DEJANTE/`), reprise **sans aucune modification**.
- **14 à 73,8 s** : la suite, **refaite** après vos retours sur la première version.

## Ce qui a été corrigé par rapport à la première version (60 s)

| Problème signalé | Cause trouvée | Correction |
| --- | --- | --- |
| Visage qui se déforme | Mouvements rapides et 7 plans que j'avais accélérés (×1,15 à ×1,8). | Plus aucune accélération. Chaque réplique est jouée dans un plan où il parle, au visage stable. Les gags ne gardent que les images où le visage reste propre. |
| Lèvres qui ne suivent pas le texte | Synchronisation posée après coup (sync-lipsync), peu efficace sur ce dessin ; voix posée sur des plans où il ne pouvait pas parler (il boit, il court) ; bascules entre images synchronisées ou non. | Chaque réplique est générée par **Kling AI Avatar v2 Pro**, qui fabrique la bouche directement à partir de la voix Simon. Vous avez validé la méthode sur un essai. La voix n'est jamais posée sur un plan où il fait autre chose. |
| Voix absente à la fin | Les répliques de la fin manquaient. | Ajout de « Allez, ouste ! Dehors ! … Toi aussi ! » pendant la disparition des outils, puis de la signature dite en entier : « E-COM STUDIO IA. Tout ton e-commerce, au même endroit, avec Syna ! Allez, viens créer ta marque ! ». |
| Fin bâclée : meuble qui tombe, visage défiguré, vidéo coupée en pleine action | Prise ratée, gardée telle quelle. | Le socle tombe toujours (à votre demande), mais dans une nouvelle prise. Il manque de tomber, puis finit **assis sur le socle couché, pouce levé et clin d'œil**. Les deux passages flous de la chute (0,3 s et 0,2 s) sont retirés, chaque raccord masqué par un « boum », un nuage de poussière et un flash. Puis vient une **vraie image de fin**, tenue 2 s, avec le logo, le slogan et le bouton, une lente avancée de caméra, une fanfare et un fondu final. |

Le film passe de 60 à 74 s, parce que chaque phrase est maintenant dite à l'écran par le personnage.

**Correction après votre retour sur la version de 75 s** : vers 62 s, il criait, poing levé, sans qu'on l'entende. Toute la réplique « Allez, ouste ! Dehors ! … Toi aussi ! » est maintenant posée sur ce plan, calée sur sa bouche ouverte : « Toi aussi ! » tombe sur le coup de pied. Le petit gros plan qui la disait juste avant, et faisait doublon, est retiré.

## Livrables

| Demandé | Fichier |
| --- | --- |
| MP4 final | `le-dropshipper-dejante-1080x1920.mp4` (H.264 + AAC, 57 Mo) |
| Miniature verticale | `miniature-1080x1920.jpg` (l'image de fin) |
| Captures des scènes principales | `captures/` (25 images) |
| Décors et éléments graphiques | `decors-images-cles/` (images clés, dont les 3 nouvelles `v2-*`), `marque-luciole/` |
| Animations utilisées | `animations/plans-parlants/` (11 plans où il parle), `animations/kling/` (13 plans de gags, dont la chute finale) |
| Fichiers audio ElevenLabs | `audio/voix/` (prises, morceaux par plan, alignements), `audio/bruitages/`, `audio/musique/`, `audio/mixage-final.wav` |
| Ressources du personnage | `personnage/` |
| Projet source modifiable | `projet/` (montage, mixage, composition HyperFrames, requêtes envoyées, `construire.sh`) |
| Contrôle | `controle/` : zones de sécurité, chute image par image, planches des plans parlants, diagnostic de l'ancienne version |

## Déroulé (temps du film complet)

| Temps | Ce qu'on voit | Voix |
| --- | --- | --- |
| 0–14 s | **Scène validée**, inchangée. | « TOI ! … une boutique ou une fusée ?! » |
| 14,0–17,0 s | La fusée plane sous le plafond. Il la pousse hors du cadre (pouet absurde). | — |
| 17,0–22,6 s | Gros plan, il parle face caméra. « LA NASA ?! » claque à l'écran. | « Bon ! J'allais pas construire la NASA pour vendre une lampe ! Et là… j'ai découvert un truc. Regarde ! » |
| 22,6–24,4 s | La chambre se replie en décor de papier bleu nuit. Le **logo officiel** apparaît dans un halo et il se baisse sous des formes lumineuses. | — |
| 24,4–28,0 s | Atelier céleste, il tape sur un clavier de lumière. La **conversation Syna** s'écrit et répond par une palette, une typographie et un emblème. | « J'ai expliqué mon idée à Syna… et elle m'aide à créer toute ma marque ! » |
| 28,0–30,4 s | L'emblème lui glisse des mains, il le plaque sur l'emballage (tampon), puis triomphe. | — |
| 30,4–33,2 s | La boutique sort de terre (plan large), puis il court avec le caddie géant. « MON SITE », « MES PRODUITS ». | (voix off, plan large) « Mon site, mes produits, » |
| 33,2–35,5 s | Il parle, tasse à la main. « MON PANIER ». | « mon panier… tout se construit ! » |
| 35,5–39,1 s | Il boit : la tasse est vide. Désespoir face caméra. | « Moi, j'avais même pas fini mon café ! » |
| 39,1–42,7 s | Il présente sa photo, puis la lance : elle se déplie en affiche géante, on le voit de dos. | « Mes photos, mes publications, » puis (de dos) « mes pubs, mon référencement… » |
| 42,7–44,4 s | Son double le salue depuis un écran, deux publications apparaissent, puis le tapis roulant-calendrier. | — |
| 44,4–46,8 s | Il présente fièrement le tout. « TOUT AU MÊME ENDROIT ! » | « Tout au même endroit ! C'est pas beau, ça ?! » |
| 46,8–51,6 s | Il réfléchit, malicieux, puis tape sa demande à Syna. | « Attends… et si je veux changer quelque chose ? Bah, je le demande à Syna ! » |
| 51,6–55,6 s | Syna : « C'est noté ! Voici le devis. Tu valides ? » et il clique sur « Valider ». **AVANT → APRÈS** : la boutique devient premium. Le bloc des bénéfices lui frôle la tête et un bouton le bouscule. | — |
| 55,6–59,8 s | Chambre envahie d'outils. « 15 OUTILS… » puis « 1 STUDIO ?! ». | « Donc… j'avais quinze outils… alors qu'il me fallait juste un Studio ?! » |
| 59,8–62,6 s | Poing levé, il chasse les outils en criant : claquement de doigts, « pouf » en série. Le dernier carton résiste, il le regarde, puis coup de pied. | « Allez, ouste ! Dehors ! … Toi aussi ! » |
| 62,6–64,6 s | Gros plan, sourire, clin d'œil. | « E-COM STUDIO IA. » |
| 64,6–68,9 s | Volet **bleu nuit**, **logo officiel**. « TOUT VOTRE E-COMMERCE. AU MÊME ENDROIT. AVEC SYNA. » apparaît sur ses mots, puis le bouton « Créez votre marque ». Il est accoudé au socle. | « Tout ton e-commerce, au même endroit, avec Syna ! Allez, viens créer ta marque ! » |
| 68,9–71,8 s | Le socle bascule, il manque de tomber, puis s'assoit dessus, jambes croisées. | — |
| 71,8–73,8 s | **Image de fin** : assis sur le socle, pouce levé, clin d'œil, avec le logo, le slogan et le bouton. Fanfare, puis fondu au bleu nuit. | — |

Les répliques sont exactement celles du brief, plus les deux répliques ajoutées à votre demande. La voix n'a jamais été accélérée.

## API et outils réellement utilisés

- **fal.ai `kling-video/ai-avatar/v2/pro`** — 12 plans générés (1 essai validé par vous + 11), dont 11 utilisés : celui de « Allez, ouste ! Dehors ! » a été retiré après votre retour (payé, non utilisé). Chaque plan part d'une image du personnage et de la réplique exacte de la voix Simon. La voix tombe au même instant dans la vidéo et dans le film : décalage mesuré nul, plan par plan.
- **fal.ai `kling-video/v3/pro/image-to-video`** — les gags sans parole de la première version, gardés à vitesse normale et recoupés, plus la nouvelle chute finale. Celle-ci est forcée à se terminer exactement sur l'image de fin.
- **fal.ai `nano-banana-2/edit`** — 3 nouvelles images clés : il présente le tapis-calendrier, il s'accoude au socle, l'image de fin. Deux plans parlants partent d'un recadrage d'images existantes, sans coût.
- **fal.ai `ffmpeg-api/loudnorm`** — sert seulement à héberger les morceaux de voix, que les modèles exigent sous forme d'adresse web.
- **ElevenLabs** :
  - voix « Simon », `eleven_v3`, mêmes réglages : 2 prises par nouvelle réplique, celle qui prononce correctement « Syna » retenue ;
  - alignement forcé ;
  - bruitages.
- **HyperFrames** : la composition (conversations Syna, logo, titres, avant / après, signature, image de fin), calée automatiquement sur le découpage et sur les mots, et le rendu.
- **Python + ffmpeg** : montage, étalonnage identique aux 14 s, mixage avec voix au premier plan.
- **Musique** : compositeur du studio, « pop » puis « cinématique ».
- **Bruitages** : ElevenLabs et banque HyperFrames (licence Pixabay).
- **N'est plus utilisé dans le film final** : sync-lipsync (synchro posée après coup), remplacé par les plans parlants.

## Coûts

| Étape | Coût estimé |
| --- | --- |
| Première version de la suite (60 s) | ≈ 17,8 $ |
| Réparation : 12 plans parlants générés (Kling AI Avatar v2 Pro), 11 utilisés | ≈ 3,9 $ |
| Réparation : 3 images clés + nouvelle chute (Kling Pro) | ≈ 1,2 $ |
| Hébergements de voix | ≈ 0,02 $ |
| **Total de la suite (fal.ai)** | **≈ 22,9 $, soit environ 19,5 à 20 €** |
| ElevenLabs (toute la suite) | ≈ 635 crédits (compteur réel lu par l'API) |

- La réparation a coûté environ **5,1 $**, dans la fourchette annoncée (5 à 6,5 $).
- Ce sont des **estimations hautes** d'après les tarifs publics. Le montant exact se trouve dans fal.ai › Billing, avec les identifiants de `projet/depenses-fal.csv`.
- Le total de la suite arrive **au niveau du budget de 20 €**, selon le taux de change. Je ne l'ai pas vérifié sur votre facture.

## Contrôle qualité (version corrigée)

| # | Question | Réponse vérifiée |
| --- | --- | --- |
| 1 | Les 14 premières secondes sont-elles conservées ? | **Oui**, contenu identique (écart invisible, PSNR 45,2 dB après réencodage). Raccord à 14 s inchangé. |
| 2–3 | Le personnage et son visage restent-ils identiques ? | **Oui**, visage stable dans les 12 plans parlants : regardé sur des planches à 3 images par seconde. Dans les gags, les images floues de la chute ont été retirées. |
| 4 | La voix est-elle la même ? | **Oui** : voix Simon, même modèle, mêmes réglages. |
| 5 | Le jeu reste-t-il drôle et expressif ? | Gags : fusée poussée, emblème-savonnette, tasse vide, double à l'écran, tapis roulant, bouton qui le bouscule, coup de pied au carton, chute sur le socle. **À juger au visionnage.** |
| 6 | L'histoire s'enchaîne-t-elle ? | **Oui**, dans l'ordre du scénario. |
| 9 | Les fonctionnalités sont-elles compréhensibles ? | **Oui**, chacune montrée par une action. Le référencement est seulement cité dans la voix. |
| 10 | Syna apparaît-elle uniquement en conversation ? | **Oui.** |
| 12 | Le cadrage 9:16 est-il correct ? | **Oui**. Textes, conversations, logo et bouton sont dans les zones de sécurité, vérifiés une image par seconde. |
| 13 | Voix et lèvres sont-elles synchronisées ? | **Oui** pour toutes les répliques des plans parlants : la bouche est générée à partir de la voix et le calage est vérifié. Deux passages sont en voix off sur des plans où son visage est minuscule ou de dos. **Limite** : « Allez, ouste ! Dehors ! … Toi aussi ! » est posé sur un plan d'action où il crie, bouche ouverte : les mots tombent sur ses gestes, mais sans synchronisation syllabe par syllabe. |
| 14 | Les textes sont-ils corrects ? | **Oui** à l'écran. Le mot « luciole » se déforme brièvement pendant que la banderole se déplie (≈ 41 s). |
| 15–16 | Logo et bleu nuit sont-ils les officiels ? | **Oui** : logo reconstruit depuis le composant du Studio, bleu nuit #0A1024. |
| 17–18 | Le reste est-il créé pour le film ? | **Oui** : aucune ressource du Studio hormis le logo et le bleu nuit. |
| 19 | Les affirmations sont-elles fidèles au service ? | **Oui** : Syna présente un devis à valider avant de modifier, comme le Studio. |
| — | La voix est-elle complète jusqu'à la fin ? | **Oui**, vérifié par transcription : toutes les répliques sont présentes, y compris « Allez, ouste, dehors ! Toi aussi » (59,9–62,5 s) et jusqu'à « Allez, viens créer ta marque ». Les seuls moments sans voix sont des gags où il ne parle pas : décor qui se replie, emblème, caddie, café, transformation, chute, image de fin. |

**Défauts restants** :
- Le film dure 74 s au lieu des 60 s visés.
- Les deux coupures de la chute sont rapides et masquées par un flash, mais un œil attentif peut les remarquer.
- Les plans parlants articulent sobrement. La bouche bouge avec la voix, sans grandes grimaces.
- La suite est plus nette que les 14 s, car elle est en 1080p natif.

## Inventaire des ressources

Inchangé par rapport à la première version :
- **Repris du Studio** : seulement le logo officiel (et ses deux polices) et le bleu nuit `#0A1024`.
- **Repris des 14 s validées** : le personnage, la chambre, la lampe, la voix Simon et deux bruitages.
- **Tout le reste est créé pour le film** : la marque fictive « luciole », les images clés, les plans animés, les conversations Syna, les titres, la signature, les sons et la musique (compositeur du studio).

## Ce qui a été vérifié, et ce qui ne l'a pas été

Vérifié :
- calage de la voix dans chaque plan parlant (décalage 0) ;
- visages sur planches ;
- chute image par image ;
- zones de sécurité ;
- transcription de la fin ;
- contrôle HyperFrames ;
- caractéristiques du fichier : 1080 × 1920, 24 i/s, 1771 images, 73,8 s ;
- son à −15 LUFS, crête −1,6 dB, voix au-dessus du fond (7,5 à 27 dB d'écart) ;
- reconstruction par `projet/construire.sh`, sans appel payant.

Non vérifié :
- l'écoute réelle (je ne peux pas écouter) ;
- le coût exact chez fal.ai ;
- les droits d'usage commercial des contenus générés.

## Reconstruire le film

```bash
cd PUB_DROPSHIPPING_60S/projet && ./construire.sh
```

Le script reprend les plans déjà payés (livrés recompressés, sans différence visible), ne fait aucun appel payant et produit `projet/build/le-dropshipper-dejante-1080x1920.mp4`.
