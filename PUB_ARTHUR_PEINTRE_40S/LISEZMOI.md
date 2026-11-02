# Publicité « Je suis peintre, pas informaticien ! » — Arthur, 40 s

Film vertical 1080 × 1920, 30 images/s, **exactement 40,000 s (1 200 images)**, H.264 + AAC, son à −15 LUFS,
sous-titres français intégrés et fichier SRT séparé.

Personnage : **Arthur, d'après son image officielle** (image en pied fournie : veste prune, t-shirt crème, jean, baskets
blanches, cheveux bruns décoiffés). Il n'a pas été redessiné : chaque image clé part de cette image maîtresse, sans les
lunettes de chantier ni les taches de peinture de la Pub 04. Voix : **Simon (ElevenLabs)**, la même que dans ses films
précédents. Histoire fictive : elle n'est pas présentée comme le témoignage d'un client réel.

## Livrables

| Demandé | Fichier |
| --- | --- |
| 1. Vidéo finale MP4 | `je-suis-peintre-pas-informaticien-1080x1920.mp4` (32 Mo) |
| 2. Prévisualisation légère | `previsualisation-legere-540x960.mp4` (3 Mo) |
| 3. Sous-titres SRT | `sous-titres.srt` (27 sous-titres, texte exact du script) |
| 4. Sources d'animation et de montage | `projet/` : `montage.py`, `mixer.py`, `sous_titres.py`, `figer_corps.py`, composition HyperFrames `film/`, plans animés `av/` et `act/`, requêtes envoyées `requetes/`, `construire.sh` |
| 5. Pistes audio séparées | `audio/piste-voix-seule.wav`, `audio/piste-musique-seule.wav`, `audio/piste-bruitages-seule.wav`, `audio/mixage-final.wav`, prises ElevenLabs `audio/voix-elevenlabs/` |
| 6. Ressources générées | `ressources/` (images clés, photos avant / après et réalisations, main d'Arthur détourée, écran du téléphone), `audio/musique/`, `audio/bruitages/` |
| 7. Coûts | ci-dessous et `projet/depenses-api.csv` |
| 8. Contrôles qualité | ci-dessous et `controle/` |
| 9. Captures | `captures/` (18 plans), `miniature-1080x1920.jpg`, `controle/planche-film-1-image-par-seconde.png` |
| Contrôle TikTok | `controle/previsualisation-tiktok-1080x1920.mp4` : le film avec les vrais boutons de votre capture superposés (absents du film final) |

## Déroulé (mesuré sur la voix réelle)

| Temps | Ce qu'on voit | Voix |
| --- | --- | --- |
| 0–3,3 s | Sur le chantier, rouleau sur l'épaule, il présente la pièce d'un geste et parle au spectateur comme à un ami. | « Je vais te montrer comment j'évite de passer mes soirées sur ma com'. » |
| 3,3–6,7 s | Il pointe le **bouton d'abonnement**, puis le **cœur**. | « Moi, c'est Arthur ! Abonne-toi là, mets un cœur ici… » |
| 6,7–9,9 s | « viens ! » : il passe un dernier coup de rouleau, puis danse, clés en main. | « viens ! Ça y est ! Chantier terminé. Je rentre ! » |
| 9,9–11,6 s | À la porte, une notification retentit. La musique s'arrête net, son sourire se fige. | « Oh non… » |
| 11,6–15,1 s | Gros plan du téléphone : deux rappels arrivent sur ses mots, « Terminer le site » et « Préparer la publication de demain ». | « Le site, les photos… et la publication de demain. » |
| 15,1–16,8 s | Gros plan sur sa main : un coup de rouleau parfait. | « Un mur nickel ? Facile. » |
| 16,8–20,1 s | Téléphone (brouillon de publication vide) dans une main, rouleau levé dans l'autre. Il regarde l'objectif. Arrêt net de la musique. | « Une publication nickel ? Je prends quel rouleau, moi ? » |
| 20,1–23,6 s | Il pointe la **bulle commentaire** pendant toute la question, puis sourit. | « Et toi, tu fais quoi comme métier ? Dis-moi juste là ! » |
| 23,6–30,6 s | Il ouvre son ordinateur. Écran fictif : son site d'artisan, avec un bouton « Demander un devis ». **Sa main** touche la photo avant / après du chantier, qui rejoint ses réalisations. La **publication assortie** (mêmes couleurs, même typographie) sort, il la programme pour demain. | « Bon, regarde. Avec E-COM STUDIO IA, je présente mes chantiers sur mon site et je prépare mes publications au même endroit. » |
| 30,6–33,3 s | **Conversation Syna** : sa demande s'écrit pendant qu'il parle, les avant-après remontent en tête de la galerie, Syna répond. | « Syna, mets les photos avant-après en premier. » |
| 33,3–34,8 s | Il découvre la nouvelle disposition, la réponse de Syna en haut de l'image. | « Ah, là, c'est mieux ! » |
| 34,8–38,1 s | Clic de l'ordinateur qui se ferme, clés en main devant la porte, puis il file par la porte avec un petit saut. | « Allez… cette fois, je rentre. Promis ! » |
| 38,1–40,0 s | Volet bleu nuit depuis la porte : **logo officiel E-COM STUDIO IA**, « Tout votre e-commerce. Au même endroit. » | — |

Les répliques sont exactement celles du brief, sans aucune coupe. La voix n'a jamais été accélérée. Seuls les silences
de plus de 0,22 s ont été raccourcis.

## Méthode et budget

Le budget de 3 € imposait de ne pas générer 40 s de vidéo payante. Seuls 26 s environ ont été générés par l'IA :

- **Plans parlants** (Kling AI Avatar v2 **Standard**, 0,0562 $/s) : uniquement les répliques face caméra. La bouche est
  fabriquée à partir de la voix.
- **Plans d'action** (Alibaba **Wan 2.6 i2v Flash**, 720p, sans son, 3 s) : dernier coup de rouleau, danse, sortie par la
  porte, gros plan du rouleau.
- **Fait sur place, sans coût** :
  - écran du téléphone, site, publication et conversation Syna ;
  - main d'Arthur détourée de son image ;
  - sous-titres, carton final, montage et mixage ;
  - musique du compositeur du studio ;
  - bruitages déjà payés pour la Pub 04 et banque HyperFrames (licence Pixabay).
- **Images clés** (nano-banana, 0,039 $ l'image) : toutes partent de l'image officielle d'Arthur. Les poses vers les
  boutons TikTok reprennent celles de la Pub 04, nettoyées (sans lunettes ni taches).

## Coûts

| Poste | Appels | Coût estimé |
| --- | --- | --- |
| Plans parlants (Kling AI Avatar v2 Standard, fal.ai) | 10 | 1,266 $ |
| Images clés et photos (nano-banana, fal.ai) | 20 | 0,780 $ |
| Plans d'action (Wan 2.6 Flash, Alibaba) | 4 | 0,300 $ |
| Mise en ligne des morceaux de voix (fal.ai) | 10 | 0,020 $ |
| **Total des services payés en dollars** | | **2,37 $** |
| ElevenLabs : voix (9 répliques), 3 bruitages, transcriptions | — | 214 crédits (compteur réel : 3 914 → 4 128) |

- **Conversion** : 2,37 $ font environ 2,0 à 2,2 € hors taxes. Si une TVA de 20 % s'applique, cela donne environ 2,4 à
  2,6 € TTC. S'y ajoutent les 214 crédits ElevenLabs, dont je ne connais pas le prix exact en euros (quelques centimes
  selon votre formule).
- **Le plafond de 3 € TTC est respecté. La cible de 2 € est dépassée** d'environ 0,4 à 0,6 €, à cause de trois corrections :
  - le plan de la chute du rouleau, refait ;
  - le plan du mur, remplacé car le modèle avait changé son t-shirt en chemise ;
  - cinq images clés reprises.
- **Ce sont des estimations** faites d'après les tarifs publics :
  - le tarif de Wan 2.6 Flash vient de sites tiers, Alibaba ne l'a pas confirmé, mais sa réponse confirme 3 s, 720p, sans son ;
  - je n'ai pas vu vos factures. Les identifiants de chaque appel sont dans `projet/depenses-api.csv`.
- Aucun appel n'a été relancé automatiquement. Une sonde gratuite chez Alibaba (requête incomplète, refusée) est notée à 0 $.

## Contrôle qualité

| Point du brief | Résultat vérifié |
| --- | --- |
| Arthur identique à son image officielle dans tous les plans | **Oui** dans les plans parlants et les écrans, vérifié sur planches : visage, cheveux, veste prune, t-shirt crème. **Écarts** : pendant la danse (≈ 8–10 s), une petite pochette à outils beige apparaît à sa ceinture. Dans le plan de dos du dernier coup de rouleau (≈ 7–8 s), un col clair apparaît brièvement. Le plan où son t-shirt devenait une chemise a été retiré. |
| Aucun nouvel Arthur conçu | **Oui** : toutes les images partent de l'image officielle. |
| Il incarne le peintre | **Oui** : rouleau, chantier, mur, bac et escabeau. |
| Dialogues à la première personne | **Oui**. |
| Récit compréhensible sans les images | **Oui** : vérifié par transcription de la piste finale (`controle/transcription-film-final.txt`). |
| Le gag du rouleau correspond à la situation | **Oui** : mur parfait d'un coup de rouleau, puis téléphone au brouillon vide face au rouleau levé, arrêt musical. **Limite** : il ne tourne presque pas le rouleau vers l'écran. |
| Aucun dialogue ne décrit une action déjà visible | **Oui**. |
| Mouvements et paroles concordent | **Oui** : bouche générée à partir de la voix (décalage nul). Voix off sur le plan de dos, la danse, le gros plan du téléphone, le gros plan du mur et les écrans. |
| Le Studio est une solution, pas une liste | **Oui** : deux bénéfices seulement, montrés par une action (photo avant / après qui rejoint le site, publication assortie). |
| Syna reste une interface conversationnelle | **Oui** : une fenêtre de chat, sans avatar ni visage. |
| Hook immédiatement compréhensible | **Oui** : chantier et rouleau dès la 1re seconde, adresse directe au spectateur. |
| Abonnement, cœur et commentaire pointent les vraies zones TikTok | **Oui**, vérifié image par image avec les vrais boutons superposés (`controle/pointage/`). **Correction** : sur la question, le modèle relevait le bras vers le cœur après 0,8 s. Le corps est donc figé sur la bulle et seule la tête continue de parler (`figer_corps.py`, sans nouvel appel payant). |
| Sous-titres synchronisés | **Oui** : calés mot à mot, mot prononcé surligné. Ils sont placés à gauche, hors de la colonne des boutons TikTok et au-dessus de la légende. |
| Exactement 40 s | **Oui** : 40,000 s, 1 200 images (vérifié sur le fichier). |
| Aucun visuel critique masqué ou coupé | **Oui** : textes, écrans et réponse de Syna placés hors du visage, vérifiés sur la planche à une image par seconde. |
| Budget maximal respecté | **Oui** (voir Coûts). |
| Logo officiel fidèle | **Oui** : composant Logo du Studio, sans modification, sur bleu nuit `#0A1024`. |
| Aucun faux bouton TikTok, aucun faux commentaire, aucun résultat inventé | **Oui** : pas de compteurs de mentions « J'aime », ni d'avis, ni de chiffres de ventes. |
| Voix compréhensible | Mesuré : la voix passe au moins 14 dB au-dessus de la musique et des bruitages sur chaque réplique (`controle/ecart-voix-fond.json`). |

**Limites restantes, signalées honnêtement** :
- Sur « viens ! », on passe directement à lui devant son mur : on ne le voit pas traverser le décor.
- Pendant la question en commentaire, seul le visage bouge : le corps reste figé, comme dans la Pub 04.
- L'ordinateur qui se ferme n'est entendu que par le bruit, pas montré.
- La transcription automatique entend « ICOM Studio » et « Sina », comme dans les films précédents avec cette voix.
- Je ne peux pas écouter : la clarté de la voix est mesurée, pas écoutée.

## Ce qui a été vérifié, et ce qui ne l'a pas été

Vérifié :
- fichier final : 1080 × 1920, 30 images/s, 1 200 images, 40,000 s ;
- son : −15 LUFS, crête −1,5 dB ;
- pointages sur les vrais boutons ;
- planche du film entier à une image par seconde ;
- transcription de la piste finale ;
- contrôle HyperFrames.

Non vérifié :
- l'écoute réelle ;
- vos factures fal.ai, Alibaba et ElevenLabs ;
- l'affichage réel une fois publié sur TikTok ;
- les droits d'usage commercial des contenus générés.

## Reconstruire le film

```bash
cd PUB_ARTHUR_PEINTRE_40S/projet && ./construire.sh
```

Le script reprend les plans déjà payés, ne fait aucun appel payant et produit le film, la prévisualisation légère, la
prévisualisation TikTok et le SRT dans `projet/build/`.
