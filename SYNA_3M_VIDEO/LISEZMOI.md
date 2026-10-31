# Film de démonstration « 3M Plâtrerie Peinture × Syna » (63,5 s, 1920 x 1080)

Vidéo de présentation d'E-COM STUDIO IA en 3D isométrique : un plâtrier-peintre (3M Plâtrerie Peinture) que trop peu
de futurs clients connaissent jongle entre plusieurs outils sans résultat cohérent, découvre E-COM STUDIO IA et son
agent Syna, qui crée au même endroit son logo, son identité, ses visuels de publication et de publicité et son site,
tous dans la même ligne de marque, puis modifie le site sur simple demande.

- Film final : `syna-3m-platrerie-peinture.mp4` (H.264 + AAC, son normalisé à -15 LUFS).
- Projet modifiable : `projet/` (HyperFrames : HTML + GSAP, rendu image par image).
  Rendu : `cd SYNA_3M_VIDEO/projet && npx hyperframes render -q delivery -o film.mp4`.
- Plan du film : `projet/SPEC.md` ; relecture et limites connues : `projet/REVIEW.md`.

## Ce qui a coûté et ce qui est gratuit
- Voix off : OpenAI `gpt-4o-mini-tts`, voix « cedar » (accord écrit du propriétaire, budget annoncé < 0,05 $),
  vérifiée par transcription OpenAI `whisper-1`. Dépense totale estimée : environ 0,02 $.
  Les fichiers `projet/assets/audio/vo-*.wav` sont gardés : refaire le rendu ne coûte rien.
- Musique : composée par le studio (`src/lib/media/song.ts`, style « inspirant », instruments GeneralUser GS, libre
  d'usage) ; étouffée pendant le problème, ouverte à la découverte du studio. Gratuite.
- Effets sonores : fournis avec HyperFrames (Pixabay, licence libre). Gratuits.
- Images : aucune image IA ; tout est dessiné en HTML/CSS 3D.

## Honnêteté
Aucun chiffre, avis, prix ni promesse inventés ; aucune personne représentée. La fenêtre de discussion de Syna est une
illustration dans l'esprit du studio, pas une capture de l'écran réel. Le logo « 3M » et les textes du site sont des
exemples créés pour le film.
