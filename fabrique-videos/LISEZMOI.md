# La Fabrique de vidéos (mis de côté le 24 novembre 2026)

Projet à part du Studio : des petits dessins animés verticaux de plus d'une minute (TikTok, Shorts, Reels),
racontant une histoire vraie et drôle. Rien ici n'est branché au Studio.

Décision du propriétaire (24 novembre 2026) : « oui on le fera par la suite ». La prochaine étape est la
**Fabrique** : une page de commande, étape par étape, sur le modèle du logiciel vu dans sa vidéo de référence.

## Ce qui est fait

- **Première vidéo** : « La guerre des émeus » (Australie, 1932), 1 min 14 s. Version 2 retenue : la caméra bouge en
  permanence, les plans s'enchaînent en glissant avec un flou de vitesse, il y a de la profondeur et de la lumière.
  Remarque du propriétaire sur la version 1 : « il y a de la vie ce n'est pas du plan fixe ».
- **Faits vérifiés** : Wikipédia (Emu War), Britannica, National Geographic, Mental Floss.
- **Voix** : ElevenLabs, voix « Julien - Deep Warm & Entertaining » (30MA7zYVNHAmlXqFhk8P), modèle
  eleven_multilingual_v2. Le texte faisait 51 s : trois phrases ont été enregistrées à part puis insérées au
  montage (`emeus/ajout.txt`). Leçon : écrire environ 250 mots pour dépasser la minute du premier coup.
- **Coût** : uniquement la voix (environ 1 300 lettres). Tout le reste est fabriqué par le code, gratuitement.
- **Histoire suivante proposée, pas encore validée** : « Napoléon contre les lapins » (1807). Le texte est dans la
  conversation du 24 novembre. Elle vient d'un seul témoignage (mémoires du général Thiébault) : le dire.

## Ce que fait le logiciel de la vidéo de référence (`reference/le-logiciel.jpg`)

« La Fabrique à Shorts – Toon 3D » : un dossier donné à Claude, qui ouvre une page sur l'ordinateur.

1. Mise en route en 5 étapes : le kit ; la chaîne (« tu en as une ? ») ; 5 noms proposés avec leur raison et les
   présentations YouTube, TikTok et Instagram ; la voix (6 voix proposées depuis la bibliothèque ElevenLabs) ;
   3 idées pour la première vidéo.
2. Chaque vidéo en 5 étapes, avec « je garde » à chacune : l'histoire en 3 tons (drôle, sérieux, mystérieux) ; le
   texte avec ce qu'on verra pour chaque phrase ; la voix vérifiée mot par mot ; la vidéo (décors, personnages,
   plans et bruitages, relecture complète) ; la publication (couverture, titre, description, commentaire
   épinglé, texte TikTok et Instagram, boutons Copier).
3. Un menu (Ma chaîne, Idées, Vidéos, Plan 30 jours, Scripts prêts), une jauge de crédits de voix, une conversation
   pour demander des changements, et la mémoire des goûts du client.

Différence qui reste avec sa vidéo : ses décors sont en vraie 3D (caméra qui tourne autour, ombres, rayons de
lumière). Les nôtres sont des dessins plats avec un effet de profondeur.

## Rangement

- `moteur/` : le film (Remotion). `src/dessins.tsx` : personnages, émeus, décors, véhicules. `src/plans.tsx` :
  la caméra, les 26 plans et leurs mouvements. `src/Film.tsx` : sous-titres mot par mot, voix, sons, musique.
- `outils/` : `sons.py` (bruitages et musique, faits par le code), `assemble.py` (montage de la voix et minutage
  de chaque mot), `phrases.py`, `ecoute.py` (transcription gratuite d'une vidéo).
- `emeus/` : textes, voix d'origine d'ElevenLabs et minutage de chaque lettre.
- `reference/` : les écrans du logiciel de référence, une planche du film, et le mouvement à 4 images par seconde.

## Refaire la vidéo

```
cd fabrique-videos/moteur
npm i
python3 ../outils/sons.py public/sons        # recrée les bruitages et la musique
npx remotion render src/index.ts Emeus out/emeus.mp4 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
ffmpeg -i out/emeus.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/emeus-final.mp4
```

## Deuxième vidéo : « Napoléon contre les lapins » (24 novembre 2026)

- 1 min 11, 30 plans, même voix. Dossier `napoleon/` : texte, voix, minutage, moteur (`moteur/src/plans2.tsx`).
- **Consignes du propriétaire** : aucun bruit de transition (« style vent », il y en avait trop) ; la musique de la
  première vidéo est remplacée par une marche comique en cordes pincées (`outils/musique_marche.py`, à lancer avec
  `public/sons/marche.wav 73` pour la recréer).
- Chaîne choisie : « Les Ratés de l'Histoire » (`chaine/`).

## Voix de la chaîne (choix du propriétaire, 24 novembre 2026)

« Max le narrateur » : ElevenLabs « Max Doré - Charismatic Narrator », identifiant Xy5q4w05TJGcKXPWeWoz
(voix d'homme chaude et naturelle). Elle remplace « Julien » pour les vidéos suivantes.
- Napoléon refait avec la voix de Max (1 min 17). Les images ont été recalées sans les réécrire :
  `napoleon/moteur/src/temps.ts` fait correspondre le temps de l'ancienne voix à celui de la nouvelle.
- Remarque du propriétaire sur Max : « il fait voix triste ». Essai de deux accroches joyeuses avec Max, puis version
  avec **Paul** (MBIQRZjHPU6xEjGuB3b8, réglages plus joueurs : stability 0.35, style 0.6), 1 min 25, silences
  de plus de 0,6 s raccourcis. Les versions Max et Paul sont gardées (`napoleon/max/`, `napoleon/paul/`).
- « Augmente un peu la cadence » : voix de Paul accélérée de 12 % sans changer sa hauteur (ffmpeg atempo=1.12,
  gratuit), vidéo de 1 min 16. C'est la version actuelle du moteur.

## Troisième vidéo : « Le jour où Blockbuster a refusé Netflix » (25 novembre 2026)

- Demande du propriétaire : une histoire « qui captiverait vraiment les gens ». 1 min 13, 21 plans, voix de Paul
  (même réglage enjoué, silences raccourcis, accélérée de 12 %), sans bruit de transition, marche en cordes pincées.
- Sources : Fortune, Business Insider, Newsweek, Yahoo. Le rire du patron vient du récit d'un fondateur de Netflix
  (« d'après eux »). Magasins et enveloppes dessinés sans les vrais logos.
- Idées suivantes proposées : Kodak et l'appareil photo numérique (1975), la sonde de la NASA perdue à cause des
  unités de mesure.

## Plus de rythme sur chaque vidéo (25 novembre 2026)

Demande du propriétaire : « Mets plus de rythme stp sur chaque video ». Voix accélérées sans changer leur hauteur
(ffmpeg atempo, gratuit), images recalées par `temps.ts` : émeus ×1,15 (1 min 05), Napoléon et Netflix ×1,25 au
lieu de ×1,12 (1 min 08 et 1 min 06). Les émeus suivent aussi les consignes de Napoléon : aucun bruit de transition,
marche en cordes pincées. **Règle pour les prochaines vidéos** : voix de Paul accélérée de 25 %, et écrire environ
230 mots pour rester au-dessus d'une minute.

## Quatrième vidéo : « Le roi qui a fouetté la mer » (Xerxès, 480 av. J.-C.)

- Le propriétaire a fait **la voix lui-même** à partir du texte et de la consigne fournis (blocs à copier).
  Méthode pour une voix fournie : transcription gratuite mot par mot (`outils/mots.py`, faster-whisper), puis
  calage du texte exact sur ces temps (orthographe juste dans les sous-titres). 1 min 08, 25 plans.
- Source : Hérodote (fouet, chaînes, phrase à la mer, ponts emportés au retour), de mémoire, à vérifier.
- Voix gratuites testées et refusées par le propriétaire (Piper : Siwis, Tom, Pierre, Gilles, MLS).

## Cinquième vidéo : « L'avion de chasse à points Pepsi » (1996)

- Voix fournie par le propriétaire, calée gratuitement. 1 min 15, 19 plans. Nom « Pepsi » écrit, sans le vrai logo.
- Sources : Wikipédia (Leonard v. PepsiCo), Netflix Tudum, CBS News, Mental Floss, The Hustle, Snopes.
- Texte suivant prêt : Kodak et l'appareil photo numérique (dans la conversation du 25 novembre).

## Sketch « Quand tu dois épeler ton nom au téléphone » (25 novembre 2026)

- Nouveau format demandé par le propriétaire, inspiré d'une vidéo Facebook (même principe : chaque lettre devient une
  phrase de la vie du client, l'autre répond sans broncher, la phrase la plus folle revient à la fin), avec nos
  propres répliques. Voix enregistrées par le propriétaire (deux voix d'homme).
- Son retravaillé gratuitement : silence du début coupé, blancs resserrés, volume égalisé, souffle retiré, effet
  téléphone sur le client. Vidéo : alternance conseiller (bureau, casque, nom qui s'écrit à l'écran) et client
  (salon, téléphone), bulles qui illustrent chaque phrase, un mot à la fois en couleurs, bandeau permanent en haut.
- Essais ElevenLabs avant l'enregistrement du propriétaire (dialogue Hugo et Martin, puis Hugo et Julien) :
  environ 1 € au total ; le propriétaire a préféré sa propre voix.
- Version 2, après la remarque du propriétaire : **un seul plan sur le conseiller**, le client n'existe que par sa
  voix au téléphone (comme dans la vidéo de référence). Effet téléphone réglé d'après la mesure de la référence :
  graves coupés sous ~450 Hz, présence renforcée vers 2 500 Hz, aigus gardés jusqu'à ~5 500 Hz (« net, mais pas
  vraiment »). Bouche du conseiller qui bouge quand il parle, nom tapé à l'écran, petit coup de zoom sur « Hé Bernard ».
- Version 3 : **les intonations du propriétaire gardées, timbres changés** avec la transformation de voix d'ElevenLabs
  (speech-to-speech, modèle eleven_multilingual_sts_v2) : client → Hugo (3Tp5mYhT9wrfnry9pzvV), conseiller → Julien
  (papd083UqIoSWdSkh3fG). Chaque voix est transformée à part (répliques séparées par 0,7 s), puis redécoupée : la durée
  est conservée à l'identique. Blancs retirés (0,17 s entre répliques, 0,5 s avant les deux chutes), vidéo de 1 min 02,
  juste au-dessus de la minute exigée par TikTok.

## Sketch « Bernard et la perceuse » (version qui part en vrille)

- Demandes du propriétaire : « que ça parte encore plus en couille », lettres plus longues (vraies tirades), puis
  « fais-la comme ça et mets du rythme ». Dialogue ElevenLabs (eleven_v3, text-to-dialogue) : client Hugo, conseiller
  Julien, émotions indiquées réplique par réplique ; cri « Hé, Bernard ! La perceuse ! » du conseiller fait à part et
  superposé. Montage : blancs à 0,1 s sauf avant les chutes, effet téléphone sur le client, voix accélérée de 12 %.
  1 min 36. Chute : le conseiller s'appelle Bernard ; la perceuse apparaît sur son bureau.
- Version 2 de « Bernard », après « ça fait trop voix IA… ça doit faire réel, comme une vraie conversation » :
  texte réécrit en langage parlé (euh, ben, nan mais, genre, répétitions, rires), indications de jeu À L'INTÉRIEUR
  des répliques, réglage le plus expressif (stability 0), **aucune accélération** ; le rythme vient du montage
  (réponses courtes qui chevauchent la fin de la phrase précédente, `v2/monte.py`). 1 min 55. Environ 0,90 €.
  Leçon : accélérer une voix la fait sonner « lue » ; pour du réel, chevaucher et couper plutôt qu'accélérer.
- Version 3 (« il y a des coupures dans les voix… accélère un peu ») : `v2/monte2.py` coupe chaque réplique au milieu
  du blanc qui l'entoure (jamais dans la voix), ne raccourcit que les silences internes de plus de 0,7 s avec un fondu
  de 30 ms, puis accélère l'ensemble de 8 %. 1 min 48. Leçon : ne jamais retailler l'intérieur d'une réplique par
  tranches courtes, ça hache les syllabes douces et les respirations.
- Version 4 (« de 1 min à la fin, plusieurs voix en même temps, tout est mélangé ») : la transcription automatique
  n'avait pas entendu trois répliques (le chuchotement du coiffeur, « Bisous », la tirade chez Stéphane) ; leurs
  limites avaient été devinées de travers et tout s'est décalé. Limites corrigées à la main d'après le volume du son
  (`v2/brut_aligne.json`), fin vérifiée en la retranscrivant : tout est dans l'ordre. 2 min 00.
  **Règle** : après chaque montage, retranscrire le résultat pour vérifier l'ordre ; se méfier des répliques
  chuchotées ou très courtes, que la transcription rate.

## Vidéo histoire « Le burger raté à cause des maths » (A&W, années 80)

- Voix du propriétaire, gardée telle quelle (aucune accélération, aucune coupe). 1 min 17, 18 plans.
  Sources : Wikipédia (Third-pound burger), A&W, Mental Floss, CBC, Tasting Table, Snopes.
- Texte suivant prêt : Kodak.

## Sketch « Schwartz » (quand tu demandes au conseiller d'épeler un mot)

- Après relecture de la vidéo de référence : c'est **le conseiller (à l'écran) qui épelle** ; les vannes mélangent
  lettres normales, exemple trop long, message vocal qui ne commence même pas par la bonne lettre, **moquerie du
  client en l'imitant**, plan de soirée qui embarque le client ; la vérification fait revenir le message le plus fou.
- Voix ElevenLabs (dialogue eleven_v3, stability 0) : conseiller Julien (imitations), client Hugo (téléphone).
  Limites des 28 répliques imposées d'après le volume du son (la transcription se trompe), montage vérifié par
  retranscription. 1 min 20. Environ 2 160 caractères, autour de 60 centimes.

## Sketch « Quand ton père t'appelle pour un problème de téléphone »

- Voix ElevenLabs (dialogue eleven_v3, stability 0) : fils Julien (papd083UqIoSWdSkh3fG), père Olivier
  (GFj5Qf6cNQ3Lgp8VKBwc, vieux monsieur de dessin animé), effet téléphone sur le père, bip et sonnerie fabriqués
  par le code. 1 min 02 (sans accélération, pour rester au-dessus de la minute). Environ 1 500 caractères, ~45 c.
- Leçons du sketch « Schwartz » appliquées : **bouche calée sur le volume réel de la voix** (`bouche.json`, une valeur
  par image) au lieu d'un battement automatique ; pas de bras levé ; visage qui réagit seulement. Bulle « selfie » du
  père à lunettes quand on parle du « monsieur ».
- Version 2 (« c'est trop lent ») : voix accélérée de 12 %, blancs serrés, mais pour rester au-dessus d'une minute,
  trois échanges ajoutés (la langue tirée, le message « Fiston a essayé de vous joindre », la mère qui a tout filmé),
  joués à part (~10 c) et insérés au montage (`monte_mix.py`). 1 min 10. **Règle** : pour plus de rythme sans passer
  sous la minute, ajouter des répliques plutôt que de ralentir.

## Leçon (baleine, 25 novembre 2026) : ne jamais couper la voix d'après la transcription
Les temps de whisper sont imprécis : couper les blancs d'après eux mange des syllabes (« tu as coupé la voix un peu partout »).
On coupe uniquement dans le vrai silence mesuré au son (`outils/silences.py` : tranches de 20 ms, silence de plus de 0,5 s ramené à 0,36 s),
puis on accélère au plus de 1,12. Après chaque montage, retranscrire et comparer mot à mot au texte.
Voix jouée : modèle eleven_v3, stabilité 0, indications en anglais entre crochets ([shouting], [whispers], [laughs]…),
majuscules seulement sur des mots courts (Paul écorche « LAXATIF », « CAMPING-CAR »). Voix retenue par le propriétaire : Paul.

## Décision (25 novembre 2026) : on passe à Eleven v4
Le propriétaire a comparé v4 et v3 (même texte, mêmes voix) sur une histoire et sur le sketch de l'épellation : « La v4 est bien mieux ».
Désormais : model_id `eleven_v4` pour tout (histoires avec Paul, sketchs avec /v1/text-to-dialogue), stabilité 0, indications entre crochets.
La v4 rit vraiment quand on écrit [laughs], enchaîne plus vite (sketch : 43 s contre 58 s en v3), même prix que la v3.
Toujours vérifier la liste des modèles (GET /v1/models) avant de choisir : une version plus récente peut être sortie.

## Leçon (25 novembre 2026) : la v4 déraille sur un long dialogue
35 répliques d'un coup en v4 : phrases répétées, désordre, une réplique perdue (50 c perdus).
Règle : dialogue en morceaux de 7 répliques au plus, chaque morceau contrôlé (`outils/controle.py`) avant le montage.
Montage du sketch papa en v4 : `sketch-papa/v4/bornes.py` (bornes dans les vrais silences) puis `monte.py`.
