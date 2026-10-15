# Racines & Pierres — film 15 s vertical (paysagiste)

**Film :** `RACINES-PIERRES_film_15s_1080x1920.mp4` (1080 × 1920, 30 i/s, 15,0 s).

## Plans (vidéos Pixabay de chantier, gratuites, usage commercial autorisé)
| Plan | Vidéo | Ce qu'on voit |
|---|---|---|
| On crée. | Pixabay 6580 | la bêche entre dans la pelouse (pied seul) |
| On aménage. | Pixabay 67463 | pose de pavés au maillet (mains seules) |
| On entretient. | Pixabay 11167 | débroussailleuse (bottes seules) |

Aucun visage. Sources, auteurs et adresses : `pixabay/sources.jsonl` (vidéos brutes non gardées dans le dépôt,
re-téléchargeables). Des vidéos de simples paysages avaient d'abord été choisies puis écartées : il fallait montrer le
**travail** du paysagiste.

## Montage
Fait par l'outil du studio (`node scripts/montage-film.cjs PAYSAGISTE_VIDEO/projet/timeline.json`) : recadrage
vertical, étalonnage, transitions glissées, titres animés, logo réel du projet, slogan, bouton « Demander un devis »,
musique composée par le studio (style inspirant), effets sonores. **Coût : 0 €.**

**Wan 2.6 ne sait pas faire ce montage** : chez Alibaba, la version 2.6 crée des plans à partir d'une image ou d'un
texte, mais ne monte pas des vidéos existantes, n'ajoute ni logo, ni musique, ni texte fiable. La retouche de vidéos
existantes n'existe qu'en Wan 2.7 (« videoedit », 0,10 $/s en 720P, 0,15 $/s en 1080P) et en Wan 3.0.

Slogan « Votre jardin, pensé pour durer. » : proposition, à valider.
