# PR140 — preuves Publicité / Publications

**Fournisseurs simulés — aucune qualité créative réelle validée — coût fournisseur 0 €.** Les écrans sont ceux du vrai studio local, avec ses API, sa file de tâches, SQLite et ses moteurs. Les images et verdicts injectés sont synthétiques et portent une mention explicite. Aucun envoi social. Deux projets fictifs : produit audio et prestation de finitions.

[Rapport technique](../../docs/coordination/PR_140_PUBLICITE_PUBLICATIONS.md) · [Validation](validation.json) · [Contrats/prompts effectifs et rangement](moteur-simulation.json) · [Dimensions et durées réellement lues](medias-verifies.json).

## Publicité — création guidée unitaire

Création depuis le formulaire sur ordinateur, sauvegarde ; réouverture dans une nouvelle session mobile du même projet, retouche 1:1 mobile / 2:3 ordinateur, conservation de l’original, téléchargement natif. Le passage mobile reprend les créations enregistrées ; il ne soumet pas une deuxième création initiale.

| Projet / écran | Capture lisible | Capture complète | Vidéo réelle |
| --- | --- | --- | --- |
| produit-ordinateur | [Voir](publicite-unitaire/produit-ordinateur-04-reprise-vue.png) | [Page complète](publicite-unitaire/produit-ordinateur-04-reprise.png) | [Télécharger](publicite-unitaire/produit-ordinateur.webm) |
| produit-mobile | [Voir](publicite-unitaire/produit-mobile-04-reprise-vue.png) | [Page complète](publicite-unitaire/produit-mobile-04-reprise.png) | [Télécharger](publicite-unitaire/produit-mobile.webm) |
| service-ordinateur | [Voir](publicite-unitaire/service-ordinateur-04-reprise-vue.png) | [Page complète](publicite-unitaire/service-ordinateur-04-reprise.png) | [Télécharger](publicite-unitaire/service-ordinateur.webm) |
| service-mobile | [Voir](publicite-unitaire/service-mobile-04-reprise-vue.png) | [Page complète](publicite-unitaire/service-mobile-04-reprise.png) | [Télécharger](publicite-unitaire/service-mobile.webm) |

[Résultats du harnais](publicite-unitaire/browser-proof.json). Les fichiers natifs ont des dimensions réelles 1080×1350, 1080×1620 ou 1080×1080.

## Publicité — formulaire de campagne existant

Sur les quatre profils : devis du formulaire Publicité, confirmation, moteur de campagne, deux créations par lot, réouverture et bon rangement. Le plan de campagne utilise son chemin local existant dans ce harnais ; copie finale, génération et contrôle sont simulés.

| Projet / écran | Direction et devis | Lot rouvert | Vidéo réelle |
| --- | --- | --- | --- |
| produit-ordinateur | [Voir](publicite-campagnes/produit-ordinateur-01-direction-devis-vue.png) | [Voir](publicite-campagnes/produit-ordinateur-02-lot-reouvert-vue.png) | [Télécharger](publicite-campagnes/produit-ordinateur.webm) |
| produit-mobile | [Voir](publicite-campagnes/produit-mobile-01-direction-devis-vue.png) | [Voir](publicite-campagnes/produit-mobile-02-lot-reouvert-vue.png) | [Télécharger](publicite-campagnes/produit-mobile.webm) |
| service-ordinateur | [Voir](publicite-campagnes/service-ordinateur-01-direction-devis-vue.png) | [Voir](publicite-campagnes/service-ordinateur-02-lot-reouvert-vue.png) | [Télécharger](publicite-campagnes/service-ordinateur.webm) |
| service-mobile | [Voir](publicite-campagnes/service-mobile-01-direction-devis-vue.png) | [Voir](publicite-campagnes/service-mobile-02-lot-reouvert-vue.png) | [Télécharger](publicite-campagnes/service-mobile.webm) |

[Résultats du harnais](publicite-campagnes/validation-browser.json). Aucun de ces médias publicitaires n’est attaché à une publication organique.

## Publications — unitaire, calendrier et lot

Conseil créé par le formulaire Publications sur les quatre profils. FAQ, checklist, avis fictif attesté et carrousel créés par les API natives, puis ouverts dans l’onglet. Carrousel : trois PNG distincts, navigation à la page 2, changement d’ordre dans l’interface, sauvegarde et réouverture. Deux autres publications par profil reçoivent leurs visuels via le formulaire de lot existant et sont revues au calendrier. Retouche d’un conseil via l’API native, original conservé ; avis sans autorisation refusé HTTP 400.

| Projet / écran | Conseil | Avis fictif | Carrousel page 2 | Lot / calendrier | Vidéo réelle |
| --- | --- | --- | --- | --- | --- |
| produit-ordinateur | [Voir](publications/produit-ordinateur-02-conseil-sauvegarde-vue.png) | [Voir](publications/produit-ordinateur-06-review-vue.png) | [Voir](publications/produit-ordinateur-05-carrousel-page2-vue.png) | [Voir](publications/produit-ordinateur-10-calendrier-lot-vue.png) | [Télécharger](publications/produit-ordinateur.webm) |
| produit-mobile | [Voir](publications/produit-mobile-02-conseil-sauvegarde-vue.png) | [Voir](publications/produit-mobile-06-review-vue.png) | [Voir](publications/produit-mobile-05-carrousel-page2-vue.png) | [Voir](publications/produit-mobile-10-calendrier-lot-vue.png) | [Télécharger](publications/produit-mobile.webm) |
| service-ordinateur | [Voir](publications/service-ordinateur-02-conseil-sauvegarde-vue.png) | [Voir](publications/service-ordinateur-06-review-vue.png) | [Voir](publications/service-ordinateur-05-carrousel-page2-vue.png) | [Voir](publications/service-ordinateur-10-calendrier-lot-vue.png) | [Télécharger](publications/service-ordinateur.webm) |
| service-mobile | [Voir](publications/service-mobile-02-conseil-sauvegarde-vue.png) | [Voir](publications/service-mobile-06-review-vue.png) | [Voir](publications/service-mobile-05-carrousel-page2-vue.png) | [Voir](publications/service-mobile-10-calendrier-lot-vue.png) | [Télécharger](publications/service-mobile.webm) |

[Résultats du harnais](publications/validation-browser.json). Les contrats conservent les textes fournis et les blocs ; les PNG de preuve ne simulent pas leur qualité de composition. Les verdicts 9,2 sont injectés, pas mesurés par un modèle réel.

## Inventaire complet

154 PNG : 132 captures UI (66 pages complètes et 66 vues écran) et 22 fichiers natifs téléchargés. 12 vidéos Chromium, durées et résolutions vérifiées par ffprobe. Le manifeste SHA-256 permet de contrôler chaque fichier. Aucun ZIP/JPEG privé, base SQLite, secret, session, clé ou donnée client n’est inclus.

Les captures finales ont été inspectées : formulaire organique mobile, avis autorisé sur ordinateur, carrousel service mobile, création publicitaire sur ordinateur et lot de campagne service mobile. Les tests de largeur ne détectent aucun débordement horizontal sur les profils parcourus.

Les captures très longues sont accompagnées d’une vue écran. Ouvrir/télécharger l’original pour les lire à pleine résolution. Les vidéos documentent des interactions, sans prétendre constituer une présentation artistique.

| Dossier | Fichier |
| --- | --- |
| publications | [produit-mobile-01-conseil-saisie-vue.png](publications/produit-mobile-01-conseil-saisie-vue.png) |
| publications | [produit-mobile-01-conseil-saisie.png](publications/produit-mobile-01-conseil-saisie.png) |
| publications | [produit-mobile-02-conseil-sauvegarde-vue.png](publications/produit-mobile-02-conseil-sauvegarde-vue.png) |
| publications | [produit-mobile-02-conseil-sauvegarde.png](publications/produit-mobile-02-conseil-sauvegarde.png) |
| publications | [produit-mobile-03-faq-vue.png](publications/produit-mobile-03-faq-vue.png) |
| publications | [produit-mobile-03-faq.png](publications/produit-mobile-03-faq.png) |
| publications | [produit-mobile-04-checklist-vue.png](publications/produit-mobile-04-checklist-vue.png) |
| publications | [produit-mobile-04-checklist.png](publications/produit-mobile-04-checklist.png) |
| publications | [produit-mobile-05-carrousel-page2-vue.png](publications/produit-mobile-05-carrousel-page2-vue.png) |
| publications | [produit-mobile-05-carrousel-page2.png](publications/produit-mobile-05-carrousel-page2.png) |
| publications | [produit-mobile-06-review-vue.png](publications/produit-mobile-06-review-vue.png) |
| publications | [produit-mobile-06-review.png](publications/produit-mobile-06-review.png) |
| publications | [produit-mobile-07-ordre-repris-vue.png](publications/produit-mobile-07-ordre-repris-vue.png) |
| publications | [produit-mobile-07-ordre-repris.png](publications/produit-mobile-07-ordre-repris.png) |
| publications | [produit-mobile-08-bibliotheque-vue.png](publications/produit-mobile-08-bibliotheque-vue.png) |
| publications | [produit-mobile-08-bibliotheque.png](publications/produit-mobile-08-bibliotheque.png) |
| publications | [produit-mobile-09-devis-lot-vue.png](publications/produit-mobile-09-devis-lot-vue.png) |
| publications | [produit-mobile-09-devis-lot.png](publications/produit-mobile-09-devis-lot.png) |
| publications | [produit-mobile-10-calendrier-lot-vue.png](publications/produit-mobile-10-calendrier-lot-vue.png) |
| publications | [produit-mobile-10-calendrier-lot.png](publications/produit-mobile-10-calendrier-lot.png) |
| publications | [produit-mobile-natif-1-SIMULATION.png](publications/produit-mobile-natif-1-SIMULATION.png) |
| publications | [produit-mobile-natif-2-SIMULATION.png](publications/produit-mobile-natif-2-SIMULATION.png) |
| publications | [produit-mobile-natif-3-SIMULATION.png](publications/produit-mobile-natif-3-SIMULATION.png) |
| publications | [produit-mobile-natif-4-SIMULATION.png](publications/produit-mobile-natif-4-SIMULATION.png) |
| publications | [produit-mobile.webm](publications/produit-mobile.webm) |
| publications | [produit-ordinateur-01-conseil-saisie-vue.png](publications/produit-ordinateur-01-conseil-saisie-vue.png) |
| publications | [produit-ordinateur-01-conseil-saisie.png](publications/produit-ordinateur-01-conseil-saisie.png) |
| publications | [produit-ordinateur-02-conseil-sauvegarde-vue.png](publications/produit-ordinateur-02-conseil-sauvegarde-vue.png) |
| publications | [produit-ordinateur-02-conseil-sauvegarde.png](publications/produit-ordinateur-02-conseil-sauvegarde.png) |
| publications | [produit-ordinateur-03-faq-vue.png](publications/produit-ordinateur-03-faq-vue.png) |
| publications | [produit-ordinateur-03-faq.png](publications/produit-ordinateur-03-faq.png) |
| publications | [produit-ordinateur-04-checklist-vue.png](publications/produit-ordinateur-04-checklist-vue.png) |
| publications | [produit-ordinateur-04-checklist.png](publications/produit-ordinateur-04-checklist.png) |
| publications | [produit-ordinateur-05-carrousel-page2-vue.png](publications/produit-ordinateur-05-carrousel-page2-vue.png) |
| publications | [produit-ordinateur-05-carrousel-page2.png](publications/produit-ordinateur-05-carrousel-page2.png) |
| publications | [produit-ordinateur-06-review-vue.png](publications/produit-ordinateur-06-review-vue.png) |
| publications | [produit-ordinateur-06-review.png](publications/produit-ordinateur-06-review.png) |
| publications | [produit-ordinateur-07-ordre-repris-vue.png](publications/produit-ordinateur-07-ordre-repris-vue.png) |
| publications | [produit-ordinateur-07-ordre-repris.png](publications/produit-ordinateur-07-ordre-repris.png) |
| publications | [produit-ordinateur-08-bibliotheque-vue.png](publications/produit-ordinateur-08-bibliotheque-vue.png) |
| publications | [produit-ordinateur-08-bibliotheque.png](publications/produit-ordinateur-08-bibliotheque.png) |
| publications | [produit-ordinateur-09-devis-lot-vue.png](publications/produit-ordinateur-09-devis-lot-vue.png) |
| publications | [produit-ordinateur-09-devis-lot.png](publications/produit-ordinateur-09-devis-lot.png) |
| publications | [produit-ordinateur-10-calendrier-lot-vue.png](publications/produit-ordinateur-10-calendrier-lot-vue.png) |
| publications | [produit-ordinateur-10-calendrier-lot.png](publications/produit-ordinateur-10-calendrier-lot.png) |
| publications | [produit-ordinateur-natif-1-SIMULATION.png](publications/produit-ordinateur-natif-1-SIMULATION.png) |
| publications | [produit-ordinateur-natif-2-SIMULATION.png](publications/produit-ordinateur-natif-2-SIMULATION.png) |
| publications | [produit-ordinateur-natif-3-SIMULATION.png](publications/produit-ordinateur-natif-3-SIMULATION.png) |
| publications | [produit-ordinateur-natif-4-SIMULATION.png](publications/produit-ordinateur-natif-4-SIMULATION.png) |
| publications | [produit-ordinateur.webm](publications/produit-ordinateur.webm) |
| publications | [service-mobile-01-conseil-saisie-vue.png](publications/service-mobile-01-conseil-saisie-vue.png) |
| publications | [service-mobile-01-conseil-saisie.png](publications/service-mobile-01-conseil-saisie.png) |
| publications | [service-mobile-02-conseil-sauvegarde-vue.png](publications/service-mobile-02-conseil-sauvegarde-vue.png) |
| publications | [service-mobile-02-conseil-sauvegarde.png](publications/service-mobile-02-conseil-sauvegarde.png) |
| publications | [service-mobile-03-faq-vue.png](publications/service-mobile-03-faq-vue.png) |
| publications | [service-mobile-03-faq.png](publications/service-mobile-03-faq.png) |
| publications | [service-mobile-04-checklist-vue.png](publications/service-mobile-04-checklist-vue.png) |
| publications | [service-mobile-04-checklist.png](publications/service-mobile-04-checklist.png) |
| publications | [service-mobile-05-carrousel-page2-vue.png](publications/service-mobile-05-carrousel-page2-vue.png) |
| publications | [service-mobile-05-carrousel-page2.png](publications/service-mobile-05-carrousel-page2.png) |
| publications | [service-mobile-06-review-vue.png](publications/service-mobile-06-review-vue.png) |
| publications | [service-mobile-06-review.png](publications/service-mobile-06-review.png) |
| publications | [service-mobile-07-ordre-repris-vue.png](publications/service-mobile-07-ordre-repris-vue.png) |
| publications | [service-mobile-07-ordre-repris.png](publications/service-mobile-07-ordre-repris.png) |
| publications | [service-mobile-08-bibliotheque-vue.png](publications/service-mobile-08-bibliotheque-vue.png) |
| publications | [service-mobile-08-bibliotheque.png](publications/service-mobile-08-bibliotheque.png) |
| publications | [service-mobile-09-devis-lot-vue.png](publications/service-mobile-09-devis-lot-vue.png) |
| publications | [service-mobile-09-devis-lot.png](publications/service-mobile-09-devis-lot.png) |
| publications | [service-mobile-10-calendrier-lot-vue.png](publications/service-mobile-10-calendrier-lot-vue.png) |
| publications | [service-mobile-10-calendrier-lot.png](publications/service-mobile-10-calendrier-lot.png) |
| publications | [service-mobile-natif-1-SIMULATION.png](publications/service-mobile-natif-1-SIMULATION.png) |
| publications | [service-mobile-natif-2-SIMULATION.png](publications/service-mobile-natif-2-SIMULATION.png) |
| publications | [service-mobile-natif-3-SIMULATION.png](publications/service-mobile-natif-3-SIMULATION.png) |
| publications | [service-mobile-natif-4-SIMULATION.png](publications/service-mobile-natif-4-SIMULATION.png) |
| publications | [service-mobile.webm](publications/service-mobile.webm) |
| publications | [service-ordinateur-01-conseil-saisie-vue.png](publications/service-ordinateur-01-conseil-saisie-vue.png) |
| publications | [service-ordinateur-01-conseil-saisie.png](publications/service-ordinateur-01-conseil-saisie.png) |
| publications | [service-ordinateur-02-conseil-sauvegarde-vue.png](publications/service-ordinateur-02-conseil-sauvegarde-vue.png) |
| publications | [service-ordinateur-02-conseil-sauvegarde.png](publications/service-ordinateur-02-conseil-sauvegarde.png) |
| publications | [service-ordinateur-03-faq-vue.png](publications/service-ordinateur-03-faq-vue.png) |
| publications | [service-ordinateur-03-faq.png](publications/service-ordinateur-03-faq.png) |
| publications | [service-ordinateur-04-checklist-vue.png](publications/service-ordinateur-04-checklist-vue.png) |
| publications | [service-ordinateur-04-checklist.png](publications/service-ordinateur-04-checklist.png) |
| publications | [service-ordinateur-05-carrousel-page2-vue.png](publications/service-ordinateur-05-carrousel-page2-vue.png) |
| publications | [service-ordinateur-05-carrousel-page2.png](publications/service-ordinateur-05-carrousel-page2.png) |
| publications | [service-ordinateur-06-review-vue.png](publications/service-ordinateur-06-review-vue.png) |
| publications | [service-ordinateur-06-review.png](publications/service-ordinateur-06-review.png) |
| publications | [service-ordinateur-07-ordre-repris-vue.png](publications/service-ordinateur-07-ordre-repris-vue.png) |
| publications | [service-ordinateur-07-ordre-repris.png](publications/service-ordinateur-07-ordre-repris.png) |
| publications | [service-ordinateur-08-bibliotheque-vue.png](publications/service-ordinateur-08-bibliotheque-vue.png) |
| publications | [service-ordinateur-08-bibliotheque.png](publications/service-ordinateur-08-bibliotheque.png) |
| publications | [service-ordinateur-09-devis-lot-vue.png](publications/service-ordinateur-09-devis-lot-vue.png) |
| publications | [service-ordinateur-09-devis-lot.png](publications/service-ordinateur-09-devis-lot.png) |
| publications | [service-ordinateur-10-calendrier-lot-vue.png](publications/service-ordinateur-10-calendrier-lot-vue.png) |
| publications | [service-ordinateur-10-calendrier-lot.png](publications/service-ordinateur-10-calendrier-lot.png) |
| publications | [service-ordinateur-natif-1-SIMULATION.png](publications/service-ordinateur-natif-1-SIMULATION.png) |
| publications | [service-ordinateur-natif-2-SIMULATION.png](publications/service-ordinateur-natif-2-SIMULATION.png) |
| publications | [service-ordinateur-natif-3-SIMULATION.png](publications/service-ordinateur-natif-3-SIMULATION.png) |
| publications | [service-ordinateur-natif-4-SIMULATION.png](publications/service-ordinateur-natif-4-SIMULATION.png) |
| publications | [service-ordinateur.webm](publications/service-ordinateur.webm) |
| publicite-campagnes | [produit-mobile-01-direction-devis-vue.png](publicite-campagnes/produit-mobile-01-direction-devis-vue.png) |
| publicite-campagnes | [produit-mobile-01-direction-devis.png](publicite-campagnes/produit-mobile-01-direction-devis.png) |
| publicite-campagnes | [produit-mobile-02-lot-reouvert-vue.png](publicite-campagnes/produit-mobile-02-lot-reouvert-vue.png) |
| publicite-campagnes | [produit-mobile-02-lot-reouvert.png](publicite-campagnes/produit-mobile-02-lot-reouvert.png) |
| publicite-campagnes | [produit-mobile.webm](publicite-campagnes/produit-mobile.webm) |
| publicite-campagnes | [produit-ordinateur-01-direction-devis-vue.png](publicite-campagnes/produit-ordinateur-01-direction-devis-vue.png) |
| publicite-campagnes | [produit-ordinateur-01-direction-devis.png](publicite-campagnes/produit-ordinateur-01-direction-devis.png) |
| publicite-campagnes | [produit-ordinateur-02-lot-reouvert-vue.png](publicite-campagnes/produit-ordinateur-02-lot-reouvert-vue.png) |
| publicite-campagnes | [produit-ordinateur-02-lot-reouvert.png](publicite-campagnes/produit-ordinateur-02-lot-reouvert.png) |
| publicite-campagnes | [produit-ordinateur.webm](publicite-campagnes/produit-ordinateur.webm) |
| publicite-campagnes | [service-mobile-01-direction-devis-vue.png](publicite-campagnes/service-mobile-01-direction-devis-vue.png) |
| publicite-campagnes | [service-mobile-01-direction-devis.png](publicite-campagnes/service-mobile-01-direction-devis.png) |
| publicite-campagnes | [service-mobile-02-lot-reouvert-vue.png](publicite-campagnes/service-mobile-02-lot-reouvert-vue.png) |
| publicite-campagnes | [service-mobile-02-lot-reouvert.png](publicite-campagnes/service-mobile-02-lot-reouvert.png) |
| publicite-campagnes | [service-mobile.webm](publicite-campagnes/service-mobile.webm) |
| publicite-campagnes | [service-ordinateur-01-direction-devis-vue.png](publicite-campagnes/service-ordinateur-01-direction-devis-vue.png) |
| publicite-campagnes | [service-ordinateur-01-direction-devis.png](publicite-campagnes/service-ordinateur-01-direction-devis.png) |
| publicite-campagnes | [service-ordinateur-02-lot-reouvert-vue.png](publicite-campagnes/service-ordinateur-02-lot-reouvert-vue.png) |
| publicite-campagnes | [service-ordinateur-02-lot-reouvert.png](publicite-campagnes/service-ordinateur-02-lot-reouvert.png) |
| publicite-campagnes | [service-ordinateur.webm](publicite-campagnes/service-ordinateur.webm) |
| publicite-unitaire | [produit-1x1-SIMULATION.png](publicite-unitaire/produit-1x1-SIMULATION.png) |
| publicite-unitaire | [produit-2x3-SIMULATION.png](publicite-unitaire/produit-2x3-SIMULATION.png) |
| publicite-unitaire | [produit-4x5-SIMULATION.png](publicite-unitaire/produit-4x5-SIMULATION.png) |
| publicite-unitaire | [produit-mobile-02-creation-enregistree-vue.png](publicite-unitaire/produit-mobile-02-creation-enregistree-vue.png) |
| publicite-unitaire | [produit-mobile-02-creation-enregistree.png](publicite-unitaire/produit-mobile-02-creation-enregistree.png) |
| publicite-unitaire | [produit-mobile-03-retouche-format-vue.png](publicite-unitaire/produit-mobile-03-retouche-format-vue.png) |
| publicite-unitaire | [produit-mobile-03-retouche-format.png](publicite-unitaire/produit-mobile-03-retouche-format.png) |
| publicite-unitaire | [produit-mobile-04-reprise-vue.png](publicite-unitaire/produit-mobile-04-reprise-vue.png) |
| publicite-unitaire | [produit-mobile-04-reprise.png](publicite-unitaire/produit-mobile-04-reprise.png) |
| publicite-unitaire | [produit-mobile-05-bibliotheque-vue.png](publicite-unitaire/produit-mobile-05-bibliotheque-vue.png) |
| publicite-unitaire | [produit-mobile-05-bibliotheque.png](publicite-unitaire/produit-mobile-05-bibliotheque.png) |
| publicite-unitaire | [produit-mobile.webm](publicite-unitaire/produit-mobile.webm) |
| publicite-unitaire | [produit-ordinateur-01-demande-vue.png](publicite-unitaire/produit-ordinateur-01-demande-vue.png) |
| publicite-unitaire | [produit-ordinateur-01-demande.png](publicite-unitaire/produit-ordinateur-01-demande.png) |
| publicite-unitaire | [produit-ordinateur-02-creation-enregistree-vue.png](publicite-unitaire/produit-ordinateur-02-creation-enregistree-vue.png) |
| publicite-unitaire | [produit-ordinateur-02-creation-enregistree.png](publicite-unitaire/produit-ordinateur-02-creation-enregistree.png) |
| publicite-unitaire | [produit-ordinateur-03-retouche-format-vue.png](publicite-unitaire/produit-ordinateur-03-retouche-format-vue.png) |
| publicite-unitaire | [produit-ordinateur-03-retouche-format.png](publicite-unitaire/produit-ordinateur-03-retouche-format.png) |
| publicite-unitaire | [produit-ordinateur-04-reprise-vue.png](publicite-unitaire/produit-ordinateur-04-reprise-vue.png) |
| publicite-unitaire | [produit-ordinateur-04-reprise.png](publicite-unitaire/produit-ordinateur-04-reprise.png) |
| publicite-unitaire | [produit-ordinateur-05-bibliotheque-vue.png](publicite-unitaire/produit-ordinateur-05-bibliotheque-vue.png) |
| publicite-unitaire | [produit-ordinateur-05-bibliotheque.png](publicite-unitaire/produit-ordinateur-05-bibliotheque.png) |
| publicite-unitaire | [produit-ordinateur.webm](publicite-unitaire/produit-ordinateur.webm) |
| publicite-unitaire | [service-1x1-SIMULATION.png](publicite-unitaire/service-1x1-SIMULATION.png) |
| publicite-unitaire | [service-2x3-SIMULATION.png](publicite-unitaire/service-2x3-SIMULATION.png) |
| publicite-unitaire | [service-4x5-SIMULATION.png](publicite-unitaire/service-4x5-SIMULATION.png) |
| publicite-unitaire | [service-mobile-02-creation-enregistree-vue.png](publicite-unitaire/service-mobile-02-creation-enregistree-vue.png) |
| publicite-unitaire | [service-mobile-02-creation-enregistree.png](publicite-unitaire/service-mobile-02-creation-enregistree.png) |
| publicite-unitaire | [service-mobile-03-retouche-format-vue.png](publicite-unitaire/service-mobile-03-retouche-format-vue.png) |
| publicite-unitaire | [service-mobile-03-retouche-format.png](publicite-unitaire/service-mobile-03-retouche-format.png) |
| publicite-unitaire | [service-mobile-04-reprise-vue.png](publicite-unitaire/service-mobile-04-reprise-vue.png) |
| publicite-unitaire | [service-mobile-04-reprise.png](publicite-unitaire/service-mobile-04-reprise.png) |
| publicite-unitaire | [service-mobile-05-bibliotheque-vue.png](publicite-unitaire/service-mobile-05-bibliotheque-vue.png) |
| publicite-unitaire | [service-mobile-05-bibliotheque.png](publicite-unitaire/service-mobile-05-bibliotheque.png) |
| publicite-unitaire | [service-mobile.webm](publicite-unitaire/service-mobile.webm) |
| publicite-unitaire | [service-ordinateur-01-demande-vue.png](publicite-unitaire/service-ordinateur-01-demande-vue.png) |
| publicite-unitaire | [service-ordinateur-01-demande.png](publicite-unitaire/service-ordinateur-01-demande.png) |
| publicite-unitaire | [service-ordinateur-02-creation-enregistree-vue.png](publicite-unitaire/service-ordinateur-02-creation-enregistree-vue.png) |
| publicite-unitaire | [service-ordinateur-02-creation-enregistree.png](publicite-unitaire/service-ordinateur-02-creation-enregistree.png) |
| publicite-unitaire | [service-ordinateur-03-retouche-format-vue.png](publicite-unitaire/service-ordinateur-03-retouche-format-vue.png) |
| publicite-unitaire | [service-ordinateur-03-retouche-format.png](publicite-unitaire/service-ordinateur-03-retouche-format.png) |
| publicite-unitaire | [service-ordinateur-04-reprise-vue.png](publicite-unitaire/service-ordinateur-04-reprise-vue.png) |
| publicite-unitaire | [service-ordinateur-04-reprise.png](publicite-unitaire/service-ordinateur-04-reprise.png) |
| publicite-unitaire | [service-ordinateur-05-bibliotheque-vue.png](publicite-unitaire/service-ordinateur-05-bibliotheque-vue.png) |
| publicite-unitaire | [service-ordinateur-05-bibliotheque.png](publicite-unitaire/service-ordinateur-05-bibliotheque.png) |
| publicite-unitaire | [service-ordinateur.webm](publicite-unitaire/service-ordinateur.webm) |
