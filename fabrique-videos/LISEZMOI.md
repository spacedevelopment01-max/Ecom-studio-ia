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
