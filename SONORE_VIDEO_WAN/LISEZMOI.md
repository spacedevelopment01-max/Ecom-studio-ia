# SONORE — film 15 s vertical, entièrement par l'IA (Alibaba)

**Film :** `SONORE_film_15s_1080x1920.mp4` (1080 × 1920, 30 i/s, 15,0 s, −13,7 LUFS, crête −1,0 dB).

## Fabrication
1. **Images de départ** — Qwen-Image 3.0 Pro, **sans aucune photo existante** : le plan 1 est créé à partir du texte
   seul (`images-cles/spec-a.json`), les plans 2 et 3 reprennent le casque du plan 1 (`spec-b.json`) pour qu'il reste
   identique.
2. **Plans vidéo** — Wan 2.6 i2v flash, 1080P, **sans son** (`audio: false`, confirmé par la réponse d'Alibaba :
   `"audio": false, "SR": 1080`), 3 × 5 s (`clips/spec.json`).
3. **Montage** — outil du studio (`node scripts/montage-film.cjs SONORE_VIDEO_WAN/projet/timeline.json`) : étalonnage,
   fondus, titres, mot-symbole SONORE, slogan, bouton, musique composée par le studio, effets sonores.

## Coût réel (tarifs lus dans le compte Alibaba)
| Poste | Coût |
|---|---|
| 3 images Qwen (texte seul + 2 avec référence) | ≈ 0,13 $ |
| 3 plans Wan 2.6 flash 1080P sans son (15 s × 0,0375 $) | 0,5625 $ |
| **Total du film** | **≈ 0,69 $** |
| Écartées : 3 images faites d'après une photo Pixabay, avant la consigne « tout par l'IA » | ≈ 0,13 $ |

Comparaison : le film ARVEN en Wan 3.0 1080P coûtait 3,00 $ pour 15 s de vidéo (0,20 $/s), soit **5,3 fois plus cher**.

## Contrôle qualité (fait image par image)
- Plans 1 et 2 : casque stable, aucun défaut vu.
- Plan 3 : après 1 s, l'IA ajoute une fumée grossière derrière le casque → seules les 0,8 premières secondes servent,
  ralenties (images intermédiaires calculées). Refaire ce plan coûterait 0,19 $ (non fait, sans accord).
- Aucun personnage, aucune main. Textes ajoutés au montage (aucun texte écrit par l'IA dans l'image).
- Le nom SONORE est composé en texte : le logo de démonstration actuel contient une faute (« AURICUULAIRE »).
- Slogan « Le son, sans détour. » : proposition, à valider.
