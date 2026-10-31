# Film de démonstration « 3M Plâtrerie Peinture × Syna » (58 s, 1920 x 1080) — version 3

Vidéo de présentation d'E-COM STUDIO IA en 3D isométrique, tout en blanc, avec le studio ouvert dans un onglet de
navigateur sur un ordinateur portable (version 3, après deux retours du propriétaire : plus de rythme, plus d'animation, et Syna qui fait quatre
modifications, de la plus simple à la plus complexe) : un plâtrier-peintre (3M Plâtrerie Peinture) que trop peu
de futurs clients connaissent jongle entre plusieurs outils sans résultat cohérent, découvre E-COM STUDIO IA et son
agent Syna, qui crée au même endroit son logo, son identité, ses visuels de publication et de publicité et son site,
tous dans la même ligne de marque, puis modifie le site sur simple demande.

- Films finaux, avec sous-titres dynamiques (mot prononcé en bleu) :
  - paysage 1920 x 1080 : `syna-3m-platrerie-peinture.mp4` ;
  - story 1080 x 1920 : `syna-3m-platrerie-peinture-story.mp4` (cadrage refait pour la verticale).
  Son normalisé à -15 LUFS.
- Projet modifiable : `projet/` (HyperFrames : HTML + GSAP, rendu image par image).
  Rendu paysage : `cd SYNA_3M_VIDEO/projet && npx hyperframes render -q delivery -o film.mp4`.
  Rendu story : `SYNA_3M_VIDEO/projet/build-story.sh /tmp/syna-story && cd /tmp/syna-story && npx hyperframes render -q delivery -o story.mp4`
  (copie les scènes au format 1080 x 1920 ; même contenu, cadrage adapté par `assets/fmt.js`).
- Sous-titres : `assets/captions.js` (groupes de 2 à 4 mots, heure de chaque mot tirée de la transcription,
  orthographe du script : Syna, Plâtrerie, E-COM STUDIO IA).
- Plan du film : `projet/SPEC.md` ; relecture et limites connues : `projet/REVIEW.md`.

## Ce qui a coûté et ce qui est gratuit
- Voix off : OpenAI `gpt-4o-mini-tts`, voix « cedar » (accord écrit du propriétaire, budget annoncé < 0,05 $),
  vérifiée par transcription OpenAI `whisper-1`. Dépense totale estimée : environ 0,02 $. Version 3 : voix
  accélérée de 12 % sur l'ordinateur et une nouvelle réplique sur les modifications (env. 0,003 $) ; total du film
  environ 0,03 $, sous le plafond de 0,05 $ accepté.
  Les fichiers `projet/assets/audio/vo-*.wav` sont gardés : refaire le rendu ne coûte rien.
- Musique : composée par le studio (`src/lib/media/song.ts`, style « pop énergique », 120 BPM, instruments GeneralUser GS, libre
  d'usage) ; étouffée pendant le problème, ouverte à la découverte du studio. Gratuite.
- Effets sonores : fournis avec HyperFrames (Pixabay, licence libre). Gratuits.
- Images : aucune image IA ; tout est dessiné en HTML/CSS 3D.

## Honnêteté
Aucun chiffre, avis, prix ni promesse inventés ; aucune personne représentée. La fenêtre de discussion de Syna est une
illustration dans l'esprit du studio, pas une capture de l'écran réel. Le logo « 3M » et les textes du site sont des
exemples créés pour le film.

## Voix finale : « cedar » (la toute première)
Après les essais « onyx » puis « ash » (voix d'OpenAI trop variable d'une prise à l'autre pour retrouver le ton de
l'exemple choisi), le propriétaire a demandé de revenir à la toute première voix, « cedar ». Les vidéos et le projet
sont ceux de la version « sous-titres + story » (58 s). Dépense totale du film, essais de voix compris : environ
0,19 $.
