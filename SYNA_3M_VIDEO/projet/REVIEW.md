# REVIEW — « 3M Plâtrerie Peinture × Syna » (63,5 s, 1920 x 1080, 30 i/s)

## Choix créatifs
- Récit fourni par le propriétaire, suivi tel quel : artisan invisible → outils éparpillés → découverte d'E-COM STUDIO IA
  et de Syna → logo, identité, visuels, publicité, site → même ligne de marque, même endroit → modification sur demande.
- Monde en 3D isométrique (CSS 3D, `assets/iso.js`) : chantier et ville (sable chaud), outils aux couleurs criardes,
  studio clair (papier #F5F7FC, bleu #2F5BEA), fin bleu nuit #0A1024 (ancrage de la marque du studio).
- Syna = sphère lumineuse (choix du propriétaire) ; elle devient le point bleu du logo E à la fin.
- Marque 3M créée pour le film (nom donné par le propriétaire) : vert enduit #1E6B5E, ocre #E3A53C, chaux, sable,
  anthracite ; Outfit + Lato. Une seule source (`assets/brand3m.js`) pour logo, publication, publicité et site.
- Aucun chiffre, avis, prix ni promesse inventés ; aucune personne représentée.
- Interface produit (discussion de Syna) montrée à plat, jamais inclinée ; libellés : « Discussion », « Version 2 ·
  restaurable » (les versions restaurables existent dans le studio). La fenêtre de discussion est une illustration
  fidèle à l'esprit du studio, pas une capture de l'écran réel.

## Mesuré / regardé
- `hyperframes check` : ok (lint, exécution, mise en page, mouvement, contraste, audio). Les mondes 3D sont marqués
  `data-layout-ignore` : l'audit 2D ne sait pas lire les panneaux inclinés (faux « texte masqué »).
- Planches regardées : battements, coupes (22,4 s, 45 s, 53,4 s), vue téléphone, et ~30 images intermédiaires.
- Voix : transcrite par OpenAI (whisper-1) pour vérifier la prononciation (« 3M Plâtrerie Peinture » corrigé par une
  nouvelle prise). Le son n'a pas été écouté, seulement mesuré.

## Avertissements gardés exprès
- `line_unread` à 45 s : textes du site pendant la plongée (transition, pas à lire).
- `text_below_floor` : petits textes du site (barre de navigation) ; les messages à lire font 28 px et plus.
- `dead_stretch` : tenue finale du logo (2,3 s voulues après la voix).

## Plan le plus faible / avec plus de temps
- 22,4-22,7 s : l'ouverture en cercle vers le studio laisse ~6 images presque vides.
- La ville est décorative (blocs) ; avec plus de temps : toits, arbres, rues animées.
- Musique : morceau « inspirant » du compositeur du studio, non écouté ; à remplacer par une piste choisie si besoin.
