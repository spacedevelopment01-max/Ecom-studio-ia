# Inventaire, lecture 3 : le site du client (rapport reçu le 15 novembre 2026, lecture seule)

Constat central : le sur-mesure de SINA est aujourd'hui un second moteur à côté du moteur de thème ; seul le moteur de thème sait aller vers Shopify, WooCommerce, PrestaShop et l'hébergement des services.

## Modules (A garder / B reconstruire pour SINA / C supprimer)
| Module | Ce qu'il fait | Taille | Pile | Note |
|---|---|---|---|---|
| src/lib/theme/ (cœur : spec.ts, compile.ts, render.ts, ops.ts, preview-tools.ts, pages.ts) | Décrit un site, le compile en thème, l'affiche, le retouche, permet de désigner un élément | 108 fichiers, 20 083 lignes, plus 2 fichiers de données (679 Ko) | A | Seul moteur relié à toutes les sorties ; 168 fichiers de tests |
| Dans ce dossier : 30 anciennes directions (directions.ts, 11 ; theme-catalog.ts, 19) | Thèmes plus proposés | ≈ 2 300 lignes | C | Lecture des anciens projets ; 20 fichiers de tests |
| theme-base/ | Sections, feuilles et scripts des thèmes | 477 fichiers, 7,3 Mo, 354 sections | A (les 15 thèmes) | Source unique des sections |
| src/lib/cms-v2/ | Export contrôlé vers Shopify, WordPress / WooCommerce, PrestaShop | 14 fichiers, 1 808 lignes | A | Un seul chemin d'export ; 33 fichiers de tests |
| src/lib/sites/ | Publication figée, adresses, domaines, demandes, e-mails | 11 fichiers, 1 526 lignes | A, branchement à SINA en B | Sain, mais SINA ne l'appelle pas |
| src/lib/integrations/shopify.ts | Envoi par API : thème non publié, pages, produits | 324 lignes | A, sauf pushCatalog en C | Doublon produits |
| src/lib/syna-agent/custom-theme/ | Thème sur mesure : son modèle en HTML, son rendu, sa désignation, son annulation | 29 fichiers, 6 843 lignes | B | Moteur parallèle ; 21 fichiers de tests |
| Dont anciennes sections : public/sections/library.json, library.css, library.js, templates.html, scripts/sections-library.py, builder.ts, blank.ts, starters.ts | 208 sections en HTML avec exemples | 1,2 Mo, plus 15 Mo de photos | C | Bloquées à la mise en boutique |
| Dont 95 sections à tenue : tenue.ts, tenue-produit.ts, tenue-services.ts, tenue-recit.ts, public/sections/tenue*.css | Sections qui prennent l'allure de la marque | ≈ 1 100 lignes, 300 Ko de feuilles | B | À réécrire en sections à schéma dans theme-base/ ; six écrans de référence au pixel |
| Dont to-shopify.ts, install.ts | Convertit le sur-mesure en version de thème | 527 lignes | C une fois le sur-mesure natif | Pont entre deux moteurs |
| src/lib/syna-agent/mockup-code/, plus site.mockup_images (tools/site.ts) | Maquettes en image et en code, site codé d'après la maquette | 14 fichiers, 4 316 lignes | C | Le sur-mesure en importe 8 aides à déplacer d'abord |
| src/lib/engine/custom-theme.ts | Autre « thème entièrement sur mesure » : l'IA écrit chaque section | 531 lignes | C | mockup-code/deps.ts s'en sert |
| src/lib/theme-v2/ | Site générique composé sans IA quand aucun thème n'est choisi | 10 fichiers, 1 866 lignes | C, sauf hours.ts | Refusé dès qu'un projet a une préparation ; 13 sections v2-* |
| src/lib/engine/site-import.ts, site-reproduce.ts, existing-site.ts | Lit un site existant et le reproduit | 2 905 lignes | Lecture en A, reproduction à trancher | start.import de SINA |
| src/lib/theme/import.ts, platforms.ts | Import d'un thème Shopify du client ; kits Wix et Squarespace | ≈ 500 lignes | C (avec doute) | Hors cible |
| src/lib/syna-agent/studio-brand.ts, tools/themes.ts | SINA monte un des 15 thèmes à la marque | 434 lignes | A | Déjà sur le moteur |
| theme-demos.ts, public/demo/, public/theme-assets/ | Démonstrations des thèmes | 182 Mo et 112 Mo (875 fichiers) | A | theme-assets/alcove (7,4 Mo) : thème plus proposé |

Poids autour : public/ 427 Mo, docs/ 687 Mo, historique git 2,3 Go.

## Neuf façons de fabriquer un site
| Façon | Atteignable | Produit | Shopify | WooCommerce / PrestaShop | Services en ligne |
|---|---|---|---|---|---|
| 1. Thème du catalogue | Oui (galerie, SINA) | Version de thème active | ZIP et API | ZIP | Oui |
| 2. Composition générique (theme-v2) | Anciens projets seulement | Idem | Idem | Idem | Oui |
| 3. « Entièrement sur mesure » de l'ancien Studio | Oui, onglet Boutique | Idem | Idem | Non vérifié | Non vérifié |
| 4. Import du thème Shopify du client | Oui | Idem | Oui | Non | Non |
| 5. Reproduction d'un site existant | Oui | Idem | Oui | Oui | Oui |
| 6. Maquettes en image | Projets qui en ont déjà | Images, puis site codé | Via 7 | Non vérifié | Non vérifié |
| 7. Maquettes en code | Projets qui en ont déjà | Version de thème | ZIP | Non vérifié | Non vérifié |
| 8. Sur-mesure SINA, anciennes sections | Oui (le concepteur les reçoit encore) | Aperçu seulement | Refusé | Non | Non |
| 9. Sur-mesure SINA, sections à tenue | Oui | Aperçu, puis version non activée | ZIP seulement | Jamais essayé | Non |

Recommandation du lecteur : une seule façon, tout site est une version de thème active du moteur (src/lib/theme et theme-base). Le sur-mesure de SINA se reconstruit dessus : les 95 sections à tenue deviennent des sections à schéma, le contenu rangé en données. Les 15 thèmes restent un second point de départ sur le même moteur. Les façons 2, 3, 6, 7 et 8 partent ; 4 et 5 à trancher.

## Transfert vers les plateformes
- Shopify, partiel : thème en ZIP fait ; envoi par API construit, jamais exécuté sur une vraie boutique (capabilities.ts) ; pushPages construit, non vérifié ; produits par API ou CSV, vérifiés par requêtes simulées ; menus absents ; sur-mesure SINA : ZIP seulement (shopify.push envoie la version active, donc jamais le sur-mesure).
- WooCommerce, partiel : thème de blocs en ZIP, installé sur un WordPress local ; produits par API ou import local ; fiche produit et panier natifs (mise en page de la fiche non reprise) ; pas d'envoi direct du thème.
- PrestaShop, partiel : thème enfant et module esstudio en ZIP, installés en local ; produits par webservice ; fiche et panier natifs.
- Manque pour un site monté par SINA : aucun test sur WooCommerce et PrestaShop (sections converties écrites pour Shopify) ; activer la version créée ; relier les menus ; un essai sur de vraies boutiques.

## Hébergement des sites de services
- Publication figée : faite en code, réservée aux projets de services avec forfait actif (publish.ts) ; docs/hebergement/232-RAPPORT-PROTOTYPE.md dit « prototype », recetté en local, sans domaine public ni certificat reconnu.
- Sous-domaine du Studio : fait en code, éteint (s'allume si SITES_DOMAIN est défini ; absent de docker-compose.yml et de README.md).
- Domaine connecté : partiel (preuve par DNS et revérification quotidienne, domains.ts) ; le HTTPS dépend d'un proxy frontal absent du dépôt.
- Achat de domaine : absent (conforme à la question 14).
- Formulaires : réels (requests.ts, notify.ts) ; l'e-mail ne part que si un SMTP est configuré.
- Réservations : réelles pour trois thèmes (salon, cabinet, restaurant) ; publication refusée tant que la réservation est en mode démonstration.
- SINA : absent. Aucun fichier de src/lib/syna-agent/ n'importe src/lib/sites/ ; publier reste un bouton d'onglet. Un sur-mesure de services n'est jamais publiable (version non activée ; l'étape 7 ne parle que de Shopify, journey.ts).

## Surprises
- Le sur-mesure n'importe du moteur que spec, render, snapshot et ops : retouches et « Désigner un élément » existent en double.
- design.ts dit seulement « préfère » les sections à tenue : un thème peut contenir d'anciennes sections que custom.install refusera.
- 47 directions définies (11 + 19 + 17 de référence), pas 40.
- Deux fichiers section-families.ts portent deux notions différentes (src/lib/theme/ et src/lib/syna-agent/).
- Versions testées différentes entre docs/EXPORTS-PLATEFORMES-190.md (WordPress 6.5.5, WooCommerce 8.9.3) et capabilities.ts (6.6 et 9.3.3).
- film-brindi.mp4 est appelé par la banque et absent du dépôt.
- Jamais importés par src/ ni worker/ : src/lib/theme/content-roles.ts (78), src/lib/theme-v2/diversity.ts (81), src/lib/syna-agent/custom-theme/starters.ts (73).

## Non vérifié
Nombre de vrais projets sur d'anciennes directions, des maquettes ou un sur-mesure (aucune base ici) ; quelles sections génériques de theme-base/ (89) et quels section-copy-*.ts ne servent qu'aux 30 anciennes directions ; si un projet neuf peut encore atteindre theme-v2 ; rendu des sections sur mesure dans WordPress et PrestaShop ; si l'hébergement a été déployé depuis le prototype ; outils de thème de la première conversation.
