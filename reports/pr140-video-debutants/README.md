# Vidéo guidée — preuves isolées

**Fournisseurs et vision simulés, voix et montages locaux réels, coût fournisseur 0 €. Les mires animées ne sont pas des créations commerciales.**

Version finale ouverte : `abad7c08391d0411946119e0152400c2a629974b`. [Rapport complet](../../docs/coordination/PR_140_VIDEO_DEBUTANTS.md).

| Profil | Site | Publicité | Interaction de création | Relecture finale |
|---|---|---|---|---|
| produit-ordinateur | [Capture](produit-ordinateur-initial-vue.png) · [entière](produit-ordinateur-initial.png) · [MP4](produit-ordinateur-ambiance.mp4) | [Capture](produit-ordinateur-publicite-vue.png) · [entière](produit-ordinateur-publicite.png) · [MP4](produit-ordinateur-publicite.mp4) | [Vidéo](produit-ordinateur-parcours.mp4) | [WebM](produit-ordinateur-verification.webm) |
| service-ordinateur | [Capture](service-ordinateur-initial-vue.png) · [entière](service-ordinateur-initial.png) · [MP4](service-ordinateur-ambiance.mp4) | [Capture](service-ordinateur-publicite-vue.png) · [entière](service-ordinateur-publicite.png) · [MP4](service-ordinateur-publicite.mp4) | [Vidéo](service-ordinateur-parcours.mp4) | [WebM](service-ordinateur-verification.webm) |
| produit-mobile | [Capture](produit-mobile-initial-vue.png) · [entière](produit-mobile-initial.png) · [MP4](produit-mobile-ambiance.mp4) | [Capture](produit-mobile-publicite-vue.png) · [entière](produit-mobile-publicite.png) · [MP4](produit-mobile-publicite.mp4) | [Vidéo](produit-mobile-parcours.mp4) | [WebM](produit-mobile-verification.webm) |
| service-mobile | [Capture](service-mobile-initial-vue.png) · [entière](service-mobile-initial.png) · [MP4](service-mobile-ambiance.mp4) | [Capture](service-mobile-publicite-vue.png) · [entière](service-mobile-publicite.png) · [MP4](service-mobile-publicite.mp4) | [Vidéo](service-mobile-parcours.mp4) | [WebM](service-mobile-verification.webm) |

Les enregistrements de création sont des captures réelles du navigateur, réencodées à 8 images/s pour le téléchargement ; timeline conservée. Les MP4 de résultat sont les octets téléchargés depuis le studio. La relecture finale est effectuée après correction sur le build cité.

## Intégration thème existant, sans nouvel appel

- produit-ordinateur : [preuve JSON](produit-ordinateur-integration.json), [aperçu](produit-ordinateur-apercu-visible.png), [bibliothèque](produit-ordinateur-bibliotheque-visible.png), [retouche](produit-ordinateur-retouche-locale-conservee.png).
- service-mobile : [preuve JSON](service-mobile-integration.json), [aperçu](service-mobile-apercu-visible.png), [bibliothèque](service-mobile-bibliotheque-visible.png), [retouche](service-mobile-retouche-locale-conservee.png).

[Créations UI neuves](validation-creation.json) · [Relecture finale](validation-final-ui.json) · [Coûts réels](couts-reels.json) · [Mesures, empreintes et décodage](mesures-mp4.json).

[52 tests ciblés](video-final-engine-regressions.txt) · [Types](video-engine-gate-types-2.txt) · [Build](video-final-engine-build.txt) · [Theme Check 152 cas puis manque d’espace](video-bounded-theme-check.txt) · [ZIP repassé](video-bounded-theme-zip.txt).

Scripts : `scripts/parcours-complet/video-beginners-browser.ts`, `scripts/video-beginners/ui-case.ts`, `worker.ts`, `scripts/parcours-complet/video-theme-integration-browser.ts`, `video-results-browser.ts`. Environnement isolé requis (nom DATA_DIR `ecs-parcours-test-*`, `VIDEO_BEGINNER_PROOF=1`), réseau fournisseur interdit par le harnais. Aucun compte/session/base/clé à publier.

## Téléchargements directs

- produit-ordinateur : [ambiance MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/produit-ordinateur-ambiance.mp4), [publicité MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/produit-ordinateur-publicite.mp4), [interaction MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/produit-ordinateur-parcours.mp4).
- service-ordinateur : [ambiance MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/service-ordinateur-ambiance.mp4), [publicité MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/service-ordinateur-publicite.mp4), [interaction MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/service-ordinateur-parcours.mp4).
- produit-mobile : [ambiance MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/produit-mobile-ambiance.mp4), [publicité MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/produit-mobile-publicite.mp4), [interaction MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/produit-mobile-parcours.mp4).
- service-mobile : [ambiance MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/service-mobile-ambiance.mp4), [publicité MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/service-mobile-publicite.mp4), [interaction MP4](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/publications-ia-qualite/reports/pr140-video-debutants/service-mobile-parcours.mp4).
