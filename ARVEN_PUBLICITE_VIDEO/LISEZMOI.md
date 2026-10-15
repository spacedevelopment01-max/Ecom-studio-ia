# ARVEN — film publicitaire 15 s (vertical)

**Film final** : `ARVEN_film_15s_1080x1920.mp4` — 1080 × 1920, 30 images/s constantes, 15,0 s, H.264 + AAC,
−13,2 LUFS intégrés, crête −3,1 dBFS (prêt pour Reels, TikTok, Stories).

## Contenu
| Dossier | Contenu |
|---|---|
| `images-cles/` | 3 images de départ (Qwen-Image 3.0 Pro, montre de la photo en référence) + consignes (`spec.json`) |
| `clips/` | 3 clips vidéo générés par l'IA (Wan 3.0, image → vidéo, 1080P, 5 s) + identifiants des tâches et réponses |
| `titres/` | calques des titres, du logo et du bouton + `fabriquer-titres.cjs` (modifier un texte ici) |
| `musique/` | musique du film (15 s) + essai |
| `son/` | effets sonores (tic, tac, pulsation, souffle, tintement, signature) |
| `projet/` | `timeline.json` (plans, coupes, transitions, titres, sons) + `rendre.cjs` (rendu FFmpeg) |
| `references/` | photo de la montre, logo, références de style |

Refaire le film après une modification : `node ARVEN_PUBLICITE_VIDEO/titres/fabriquer-titres.cjs` (si un texte change)
puis `node ARVEN_PUBLICITE_VIDEO/projet/rendre.cjs`. Remplacer un plan : nouveau clip dans `clips/`, chemin dans
`timeline.json`.

## Modèles et coûts réels (liste officielle Alibaba, région Singapour)
| Étape | Modèle | Détail | Coût |
|---|---|---|---|
| Images de départ | qwen-image-3.0-pro | 3 images « 1K » + 1 image d'entrée chacune | 3 × 0,043 $ = 0,13 $ |
| Clips vidéo | wan3.0-video, 1080P | 3 × 5 s (facturé : durée 5 s, SR 1080 chacun) | 15 s × 0,20 $ = 3,00 $ |
| Musique, effets, titres, montage | studio (local) | — | 0 $ |
| **Total** | | | **≈ 3,13 $** |
Devise des tarifs supposée USD (région internationale) — à recouper avec la facture Alibaba.

## Musique et licences
Musique composée par le studio (compositeur intégré, style « cinématique ») avec de vrais instruments enregistrés :
banque GeneralUser GS (libre pour toute création, commerciale comprise), moteur SpessaSynth (Apache-2.0). Effets
sonores synthétisés par le studio (FFmpeg). Aucune musique commerciale. Photo du produit : Pixabay n° 3090387 (licence
Pixabay). Polices : Jost et Cormorant (licence SIL OFL).

## Contrôle qualité réalisé
- Mouvement réel mesuré sur chaque clip (différence moyenne entre images : 3,4 / 4,5 / 3,7 ; 149 images analysées
  par clip) : aucun plan n'est une image fixe animée.
- Fidélité de la montre vérifiée en gros plan : plans 1 et 2 fidèles jusqu'au bout ; plan 3 fidèle jusqu'à 4,2 s,
  ensuite l'IA tourne la montre de face et redessine le cadran → coupé à 4,2 s.
- Textes ajoutés au montage (aucun texte dessiné par l'IA dans les clips), logo réel.
- Non fait : aucune voix off (version courte choisie sans voix).
