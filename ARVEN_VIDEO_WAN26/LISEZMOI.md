# ARVEN — 2e film 15 s vertical, Wan 2.6 (nouveaux plans)

**Film :** `ARVEN_film2_wan26_15s_1080x1920.mp4` (1080 × 1920, 30 i/s, 15,0 s, ≈ −13 LUFS).
À comparer avec le 1er film fait en Wan 3.0 : `ARVEN_PUBLICITE_VIDEO/ARVEN_film_15s_1080x1920.mp4`.

## Plans (tous nouveaux)
| Plan | Image de départ (Qwen-Image 3.0 Pro, d'après la photo de la montre) | Mouvement (Wan 2.6 i2v flash, 1080P, sans son) |
|---|---|---|
| Cadran | gros plan sur le cadran, cuir brun, lumière ambrée | avancée lente, lumière qui balaie la lunette |
| Caractère | flanc, couronne, cuir, lumière ambrée | caméra qui monte le long du boîtier |
| Signature | montre posée sur un bloc de pierre, bracelet complet et bouclé | poussée lente, lumière qui monte sur le boîtier |

Montage : outil du studio (`node scripts/montage-film.cjs ARVEN_VIDEO_WAN26/projet/timeline.json`), même logo, slogan
et bouton que le 1er film ; musique composée par le studio (cinématique).

## Coût réel
| Poste | Coût |
|---|---|
| 3 images Qwen | ≈ 0,13 $ |
| 3 plans Wan 2.6 flash 1080P sans son (15 s × 0,0375 $) | 0,5625 $ |
| **Coût d'un film comme celui-ci** | **≈ 0,69 $** |
| Plans « eau » et « sable » refaits (jugés trop « IA ») : 2 images + 2 plans | ≈ 0,46 $ |
| Dernier plan refait (bracelet incomplet) : 2 images + 1 plan | ≈ 0,27 $ |
| **Total réellement dépensé** | **≈ 1,42 $** |
| 1er film (Wan 3.0 1080P, 15 s × 0,20 $ + images) | ≈ 3,13 $ |

## Contrôle qualité (image par image)
- Les plans « eau » (gouttes) et « sable » (sablier) faisaient trop « IA » : refaits en style réaliste (lumière qui glisse,
  caméra lente, aucun effet), gardés dans `ecartes-trop-ia/`.
- Cadran : montre fidèle, un rai de lumière apparaît en fond (lumière de studio).
- Caractère : en fin de plan, l'IA redessine un peu le cadran pendant le mouvement : plan coupé à 4,6 s.
- Signature : 1re version refusée (une partie du bracelet manquait), gardée dans `ecartes-bracelet/`. Nouvelle version :
  bracelet complet et bouclé du début à la fin. Défaut restant : l'IA place la couronne en haut du boîtier au lieu du
  côté droit (2 essais d'image, plafond de 0,30 $ respecté).
- Aucun personnage, aucune main ; textes ajoutés au montage.
