# Validation — mission #190 (25 octobre 2026)

Branche `ccr-4c6316f6-6dusrt`. Ce document dit, point par point, ce qui a été fait, ce qui a été **vérifié réellement**
(et comment), et ce qui n'a **pas** pu l'être. Rien n'est marqué validé sans test.

Légende des statuts du tableau :

- **vérifié sur une boutique de test** : thème exporté, installé et activé dans une vraie boutique WordPress/WooCommerce
  ou PrestaShop (locale, jetable), pages ouvertes dans un navigateur, achat ou réservation faits ;
- **vérifié localement** : aperçu ou démonstration complète du studio, contrôlés dans un navigateur, et tests automatiques ;
- **bloqué** : impossible à vérifier ici, avec l'accès précis qui manque.

## Ce qui a été fait (les 8 points de l'issue)

1. **Inventaire** (`docs/INVENTAIRE-THEMES-190.md`) : 15 thèmes refaits d'après maquette gardés ; ORBE et ALCÔVE (sans
   maquette trouvée) retirés du choix, **rien supprimé** (doute signalé) ; projets clients inchangés.
2. **Plus de familles** : le choix des thèmes, les quotas et les accès ne dépendent plus d'une famille. Droits réglables
   **par thème et par forfait** (Administration › Thèmes et forfaits). **Rien n'est décidé pour 49 € et 89 €** : tant
   que Thomas ne règle rien, tous les thèmes du catalogue restent ouverts à tous les forfaits.
3. **Contrôle des thèmes** : 15 démonstrations complètes parcourues à 1440 et 390 px (liens, images, débordements,
   erreurs, menu du téléphone, ajout au panier), puis les mêmes thèmes **installés** dans WordPress et PrestaShop.
   10 défauts réels trouvés et corrigés (liste plus bas). La comparaison pixel à pixel avec les planches a été faite à
   la livraison de chaque thème (PR des thèmes) ; **elle n'a pas été refaite** dans cette mission.
4. **Galerie de sections par thème**, sans famille : sections propres au thème (avec leurs dispositions) + bibliothèque
   commune ; ajouter, modifier, déplacer, dupliquer, supprimer, enregistrer, changer de disposition sans toucher à la
   disposition validée des autres sections (`tests/galerie-sections-190.test.ts`, 15 thèmes).
5. **Produits dans le Studio** (onglet **Catalogue**) : fiche complète (nom, description, photos, prix, prix barré,
   options et variantes avec référence, prix et stock, catégories, étiquettes, marque, type, code-barres, poids,
   référencement, mise en page de la fiche). Connexion **WooCommerce, PrestaShop, Shopify** ; correspondances conservées
   (aucun doublon), ventes de la boutique reprises dans le calcul du stock (limites WooCommerce/PrestaShop indiquées), import des produits existants (`docs/EXPORTS-PLATEFORMES-190.md`).
6. **Exports natifs** installés et contrôlés dans WordPress 6.5.5 / WooCommerce 8.9.3 et PrestaShop 8.1.7 ; ZIP Shopify
   contrôlés par Theme Check. Versions, dépendances et étapes manuelles : `docs/EXPORTS-PLATEFORMES-190.md`.
7. **Rubrique « Rendez-vous »** centralisée (prestations, durées, horaires, fermetures, intervenants, réservations,
   ajout, déplacement, annulation, aucune double réservation) ; **vérifiée après export** avec ATELIER NUANCE installé
   dans WordPress puis dans PrestaShop.
8. Ce tableau, le parcours complet et les blocages.

## Tableau de validation (thème × plateforme)

Exports du commit `c2d0dd2e` (les corrections suivantes ne touchent que l'aperçu du studio), installés le 25 octobre
(WordPress 6.5.5 + WooCommerce 8.9.3, PrestaShop 8.1.7) ; Theme Check sur les mêmes ZIP Shopify. Une ligne « Studio » par thème (aperçu et
démonstration complète), une ligne par plateforme.

| Thème | Plateforme | Maquette | Pages contrôlées | Sections / dispositions | Boutons testés | Export installé | Produits transférés | Rendez-vous | Problèmes restants | Statut |
|---|---|---|---|---|---|---|---|---|---|---|
| FRAISE | Studio (aperçu / démo complète) | 7 planches (24/10) | 24 pages × 1440 et 390 px | 81 sections (30 propres au thème, 35 dispositions ; 51 communes, 227 dispositions) | 261 boutons visibles, 6052 liens ; menu téléphone : s'ouvre ; ajout au panier : ✓ | — (aperçu du studio) | produits du Studio dans l'aperçu (test automatique) | — | aucun | vérifié localement |
| FRAISE | Shopify | 7 planches (24/10) | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | envoi API testé par requêtes simulées seulement | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| FRAISE | WordPress / WooCommerce | 7 planches (24/10) | 46 contrôles (pages × 1440/390 px) | 9 blocs de section dans le modèle d'accueil | 32 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé ; section modifiée et enregistrée (fg-hero.heading) : ✓ | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| FRAISE | PrestaShop | 7 planches (24/10) | 42 contrôles (pages × 1440/390 px) | sections rendues à l'export | 43 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | images du module PrestaShop « réassurance » (hors thème) non chargées; sections non modifiables dans PrestaShop (modification au studio puis réimport); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| ONDE | Studio (aperçu / démo complète) | 7 planches (24/10) | 24 pages × 1440 et 390 px | 55 sections (9 propres au thème, 25 dispositions ; 46 communes, 186 dispositions) | 89 boutons visibles, 1706 liens ; menu téléphone : s'ouvre ; ajout au panier : ✓ | — (aperçu du studio) | produits du Studio dans l'aperçu (test automatique) | — | kit privé ONDE absent du serveur : photos manquantes; 12 lien(s)/fichier(s) introuvable(s) dans la démo | vérifié localement |
| ONDE | Shopify | 7 planches (24/10) | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | envoi API testé par requêtes simulées seulement | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| ONDE | WordPress / WooCommerce | 7 planches (24/10) | 46 contrôles (pages × 1440/390 px) | 9 blocs de section dans le modèle d'accueil | 25 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé ; section modifiée et enregistrée (on-banner.heading) : ✓ | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | 141 image(s) non chargée(s) (kit absent); kit privé ONDE absent du serveur : photos manquantes; éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| ONDE | PrestaShop | 7 planches (24/10) | 42 contrôles (pages × 1440/390 px) | sections rendues à l'export | 28 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | 1 réponse(s) HTTP en erreur (panier, une fois à 390 px ; 5 nouveaux essais : 200); 150 image(s) non chargée(s) (kit absent); kit privé ONDE absent du serveur : photos manquantes; sections non modifiables dans PrestaShop (modification au studio puis réimport); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| Atelier Rive | Studio (aperçu / démo complète) | 3 maquettes (23/10) | 14 pages × 1440 et 390 px | 47 sections (0 propres au thème, 0 dispositions ; 47 communes, 180 dispositions) | 28 boutons visibles, 540 liens ; menu téléphone : s'ouvre | — (aperçu du studio) | — | — | aucun | vérifié localement |
| Atelier Rive | Shopify | 3 maquettes (23/10) | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | — | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| Atelier Rive | WordPress / WooCommerce | 3 maquettes (23/10) | 24 contrôles (pages × 1440/390 px) | 8 blocs de section dans le modèle d'accueil | 12 liens vérifiés | ✓ installé et activé ; section modifiée et enregistrée (ed-opening.heading) : ✓ | — | — | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles) | vérifié sur une boutique de test |
| Atelier Rive | PrestaShop | 3 maquettes (23/10) | 24 contrôles (pages × 1440/390 px) | sections rendues à l'export | 13 liens vérifiés | ✓ installé et activé | — | — | sections non modifiables dans PrestaShop (modification au studio puis réimport) | vérifié sur une boutique de test |
| SILLON | Studio (aperçu / démo complète) | V2 : 3 + 4 planches | 24 pages × 1440 et 390 px | 78 sections (27 propres au thème, 31 dispositions ; 51 communes, 227 dispositions) | 267 boutons visibles, 3428 liens ; menu téléphone : s'ouvre ; ajout au panier : ✓ | — (aperçu du studio) | produits du Studio dans l'aperçu (test automatique) | — | aucun | vérifié localement |
| SILLON | Shopify | V2 : 3 + 4 planches | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | envoi API testé par requêtes simulées seulement | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| SILLON | WordPress / WooCommerce | V2 : 3 + 4 planches | 46 contrôles (pages × 1440/390 px) | 8 blocs de section dans le modèle d'accueil | 27 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé ; section modifiée et enregistrée (sv-hero.heading) : ✓ | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| SILLON | PrestaShop | V2 : 3 + 4 planches | 42 contrôles (pages × 1440/390 px) | sections rendues à l'export | 43 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | images du module PrestaShop « réassurance » (hors thème) non chargées; sections non modifiables dans PrestaShop (modification au studio puis réimport); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| NOCTIL | Studio (aperçu / démo complète) | 7 maquettes (23/10) | 33 pages × 1440 et 390 px | 51 sections (0 propres au thème, 0 dispositions ; 51 communes, 227 dispositions) | 299 boutons visibles, 2468 liens ; menu téléphone : s'ouvre ; ajout au panier : ✓ | — (aperçu du studio) | produits du Studio dans l'aperçu (test automatique) | — | aucun | vérifié localement |
| NOCTIL | Shopify | 7 maquettes (23/10) | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | envoi API testé par requêtes simulées seulement | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| NOCTIL | WordPress / WooCommerce | 7 maquettes (23/10) | 64 contrôles (pages × 1440/390 px) | 8 blocs de section dans le modèle d'accueil | 37 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé ; section modifiée et enregistrée (cv-banner.heading) : ✓ | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| NOCTIL | PrestaShop | 7 maquettes (23/10) | 60 contrôles (pages × 1440/390 px) | sections rendues à l'export | 59 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | images du module PrestaShop « réassurance » (hors thème) non chargées; sections non modifiables dans PrestaShop (modification au studio puis réimport); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| TRAVERSE | Studio (aperçu / démo complète) | 4 maquettes (23/10) | 15 pages × 1440 et 390 px | 51 sections (0 propres au thème, 0 dispositions ; 51 communes, 227 dispositions) | 89 boutons visibles, 734 liens ; menu téléphone : s'ouvre ; ajout au panier : ✓ | — (aperçu du studio) | produits du Studio dans l'aperçu (test automatique) | — | aucun | vérifié localement |
| TRAVERSE | Shopify | 4 maquettes (23/10) | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | envoi API testé par requêtes simulées seulement | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| TRAVERSE | WordPress / WooCommerce | 4 maquettes (23/10) | 28 contrôles (pages × 1440/390 px) | 7 blocs de section dans le modèle d'accueil | 18 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé ; section modifiée et enregistrée (cv-banner.heading) : ✓ | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | 1 page(s) plus large(s) que l'écran (accueil au téléphone : bouton 3 px, non corrigé); éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| TRAVERSE | PrestaShop | 4 maquettes (23/10) | 24 contrôles (pages × 1440/390 px) | sections rendues à l'export | 14 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | 1 page(s) plus large(s) que l'écran (accueil au téléphone : bouton 3 px, non corrigé); images du module PrestaShop « réassurance » (hors thème) non chargées; sections non modifiables dans PrestaShop (modification au studio puis réimport); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| HEUREN | Studio (aperçu / démo complète) | références 22/10 | 10 pages × 1440 et 390 px | 50 sections (0 propres au thème, 0 dispositions ; 50 communes, 189 dispositions) | 54 boutons visibles, 454 liens ; menu téléphone : s'ouvre ; ajout au panier : ✓ | — (aperçu du studio) | produits du Studio dans l'aperçu (test automatique) | — | aucun | vérifié localement |
| HEUREN | Shopify | références 22/10 | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | envoi API testé par requêtes simulées seulement | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| HEUREN | WordPress / WooCommerce | références 22/10 | 18 contrôles (pages × 1440/390 px) | 9 blocs de section dans le modèle d'accueil | 14 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé ; section modifiée et enregistrée (ed-opening.heading) : ✓ | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| HEUREN | PrestaShop | références 22/10 | 14 contrôles (pages × 1440/390 px) | sections rendues à l'export | 11 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé | 1 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | images du module PrestaShop « réassurance » (hors thème) non chargées; sections non modifiables dans PrestaShop (modification au studio puis réimport); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| MUSEAU CLUB | Studio (aperçu / démo complète) | 8 maquettes (23/10) | 32 pages × 1440 et 390 px | 51 sections (0 propres au thème, 0 dispositions ; 51 communes, 227 dispositions) | 436 boutons visibles, 2818 liens ; menu téléphone : s'ouvre ; ajout au panier : ✓ | — (aperçu du studio) | produits du Studio dans l'aperçu (test automatique) | — | aucun | vérifié localement |
| MUSEAU CLUB | Shopify | 8 maquettes (23/10) | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | envoi API testé par requêtes simulées seulement | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| MUSEAU CLUB | WordPress / WooCommerce | 8 maquettes (23/10) | 62 contrôles (pages × 1440/390 px) | 9 blocs de section dans le modèle d'accueil | 51 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé ; section modifiée et enregistrée (cv-banner.heading) : ✓ | 4 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| MUSEAU CLUB | PrestaShop | 8 maquettes (23/10) | 58 contrôles (pages × 1440/390 px) | sections rendues à l'export | 59 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé | 4 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | images du module PrestaShop « réassurance » (hors thème) non chargées; sections non modifiables dans PrestaShop (modification au studio puis réimport); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| SOUPLE | Studio (aperçu / démo complète) | 6 maquettes (23/10) | 33 pages × 1440 et 390 px | 54 sections (0 propres au thème, 0 dispositions ; 54 communes, 253 dispositions) | 499 boutons visibles, 2750 liens ; menu téléphone : s'ouvre ; ajout au panier : ✓ | — (aperçu du studio) | produits du Studio dans l'aperçu (test automatique) | — | aucun | vérifié localement |
| SOUPLE | Shopify | 6 maquettes (23/10) | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | envoi API testé par requêtes simulées seulement | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| SOUPLE | WordPress / WooCommerce | 6 maquettes (23/10) | 64 contrôles (pages × 1440/390 px) | 9 blocs de section dans le modèle d'accueil | 56 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé ; section modifiée et enregistrée (cv-banner.heading) : ✓ | 4 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| SOUPLE | PrestaShop | 6 maquettes (23/10) | 60 contrôles (pages × 1440/390 px) | sections rendues à l'export | 60 liens vérifiés ; choix de variante + ajout au panier par le bouton du thème | ✓ installé et activé | 4 produit(s) importé(s) par l'export, publié(s) ; panier + commande ✓ | — | images du module PrestaShop « réassurance » (hors thème) non chargées; sections non modifiables dans PrestaShop (modification au studio puis réimport); une seule fiche produit (mise en page propre à un produit non reprise) | vérifié sur une boutique de test |
| TABLE SAISON | Studio (aperçu / démo complète) | 5 planches | 19 pages × 1440 et 390 px | 64 sections (21 propres au thème, 25 dispositions ; 43 communes, 155 dispositions) | 289 boutons visibles, 1128 liens ; menu téléphone : s'ouvre | — (aperçu du studio) | — | service réel du studio (tests automatiques) | aucun | vérifié localement |
| TABLE SAISON | Shopify | 5 planches | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | — | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| TABLE SAISON | WordPress / WooCommerce | 5 planches | 34 contrôles (pages × 1440/390 px) | 10 blocs de section dans le modèle d'accueil | 17 liens vérifiés | ✓ installé et activé ; section modifiée et enregistrée (ts-hero.heading) : ✓ | — | non vérifié après export (même service que ATELIER NUANCE) | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles) | vérifié sur une boutique de test |
| TABLE SAISON | PrestaShop | 5 planches | 34 contrôles (pages × 1440/390 px) | sections rendues à l'export | 18 liens vérifiés | ✓ installé et activé | — | non vérifié après export (même service que ATELIER NUANCE) | sections non modifiables dans PrestaShop (modification au studio puis réimport) | vérifié sur une boutique de test |
| ATELIER NUANCE | Studio (aperçu / démo complète) | 6 planches | 27 pages × 1440 et 390 px | 70 sections (27 propres au thème, 31 dispositions ; 43 communes, 155 dispositions) | 299 boutons visibles, 2492 liens ; menu téléphone : s'ouvre | — (aperçu du studio) | — | service réel du studio (tests automatiques) | aucun | vérifié localement |
| ATELIER NUANCE | Shopify | 6 planches | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | — | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| ATELIER NUANCE | WordPress / WooCommerce | 6 planches | 50 contrôles (pages × 1440/390 px) | 9 blocs de section dans le modèle d'accueil | 25 liens vérifiés | ✓ installé et activé ; section modifiée et enregistrée (an-hero.heading) : ✓ | — | ✓ réservation après export (ATELIER NUANCE) | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles) | vérifié sur une boutique de test |
| ATELIER NUANCE | PrestaShop | 6 planches | 50 contrôles (pages × 1440/390 px) | sections rendues à l'export | 25 liens vérifiés | ✓ installé et activé | — | ✓ réservation après export (ATELIER NUANCE) | sections non modifiables dans PrestaShop (modification au studio puis réimport) | vérifié sur une boutique de test |
| PARENTHÈSE | Studio (aperçu / démo complète) | 6 planches | 33 pages × 1440 et 390 px | 72 sections (29 propres au thème, 49 dispositions ; 43 communes, 155 dispositions) | 460 boutons visibles, 2940 liens ; menu téléphone : s'ouvre | — (aperçu du studio) | — | service réel du studio (tests automatiques) | 7 photos (05 à 11) remplacées par des photos du même kit (ZIP tronqué, connu) | vérifié localement |
| PARENTHÈSE | Shopify | 6 planches | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | — | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| PARENTHÈSE | WordPress / WooCommerce | 6 planches | 62 contrôles (pages × 1440/390 px) | 10 blocs de section dans le modèle d'accueil | 31 liens vérifiés | ✓ installé et activé ; section modifiée et enregistrée (pa-hero.heading) : ✓ | — | non vérifié après export (même service que ATELIER NUANCE) | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles) | vérifié sur une boutique de test |
| PARENTHÈSE | PrestaShop | 6 planches | 62 contrôles (pages × 1440/390 px) | sections rendues à l'export | 32 liens vérifiés | ✓ installé et activé | — | non vérifié après export (même service que ATELIER NUANCE) | sections non modifiables dans PrestaShop (modification au studio puis réimport) | vérifié sur une boutique de test |
| PHASE | Studio (aperçu / démo complète) | 10 planches | 36 pages × 1440 et 390 px | 65 sections (22 propres au thème, 46 dispositions ; 43 communes, 155 dispositions) | 220 boutons visibles, 2858 liens ; menu téléphone : s'ouvre | — (aperçu du studio) | — | — | aucun | vérifié localement |
| PHASE | Shopify | 10 planches | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | — | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| PHASE | WordPress / WooCommerce | 10 planches | 68 contrôles (pages × 1440/390 px) | 7 blocs de section dans le modèle d'accueil | 35 liens vérifiés | ✓ installé et activé ; section modifiée et enregistrée (ph-hero.heading) : ✓ | — | — | éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles) | vérifié sur une boutique de test |
| PHASE | PrestaShop | 10 planches | 68 contrôles (pages × 1440/390 px) | sections rendues à l'export | 65 liens vérifiés | ✓ installé et activé | — | — | sections non modifiables dans PrestaShop (modification au studio puis réimport) | vérifié sur une boutique de test |
| MAISON & HORIZON | Studio (aperçu / démo complète) | 7 maquettes (23/10) | 19 pages × 1440 et 390 px | 52 sections (5 propres au thème, 22 dispositions ; 47 communes, 196 dispositions) | 205 boutons visibles, 1582 liens ; menu téléphone : s'ouvre | — (aperçu du studio) | — | — | kit privé absent : photos remplacées par des emplacements | vérifié localement |
| MAISON & HORIZON | Shopify | 7 maquettes (23/10) | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | — | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| MAISON & HORIZON | WordPress / WooCommerce | 7 maquettes (23/10) | 34 contrôles (pages × 1440/390 px) | 10 blocs de section dans le modèle d'accueil | 26 liens vérifiés | ✓ installé et activé ; section modifiée et enregistrée (re-hero.heading) : ✓ | — | — | kit privé absent : photos remplacées par des emplacements; éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles) | vérifié sur une boutique de test |
| MAISON & HORIZON | PrestaShop | 7 maquettes (23/10) | 34 contrôles (pages × 1440/390 px) | sections rendues à l'export | 29 liens vérifiés | ✓ installé et activé | — | — | kit privé absent : photos remplacées par des emplacements; sections non modifiables dans PrestaShop (modification au studio puis réimport) | vérifié sur une boutique de test |
| APLAT | Studio (aperçu / démo complète) | 10 planches (25/10) | 20 pages × 1440 et 390 px | 55 sections (8 propres au thème, 35 dispositions ; 47 communes, 192 dispositions) | 117 boutons visibles, 1920 liens ; menu téléphone : s'ouvre | — (aperçu du studio) | — | — | kit privé absent : photos remplacées par des emplacements | vérifié localement |
| APLAT | Shopify | 10 planches (25/10) | — | toutes (ZIP OS 2.0) | — | ZIP contrôlé par Theme Check : 0 erreur, 35 avertissements ; **non installé** | — | — | aucune boutique Shopify de développement ni application (jeton) disponible | bloqué |
| APLAT | WordPress / WooCommerce | 10 planches (25/10) | 36 contrôles (pages × 1440/390 px) | 12 blocs de section dans le modèle d'accueil | 18 liens vérifiés | ✓ installé et activé ; section modifiée et enregistrée (ap-hero.heading) : ✓ | — | — | kit privé absent : photos remplacées par des emplacements; éditeur de site non ouvrable sur la boutique de test hors ligne (enregistrement vérifié par l'API des modèles) | vérifié sur une boutique de test |
| APLAT | PrestaShop | 10 planches (25/10) | 36 contrôles (pages × 1440/390 px) | sections rendues à l'export | 22 liens vérifiés | ✓ installé et activé | — | — | kit privé absent : photos remplacées par des emplacements; sections non modifiables dans PrestaShop (modification au studio puis réimport) | vérifié sur une boutique de test |

## Parcours complet (point 8) — vérifié sur les deux boutiques de test

`tests/produits-boutiques-e2e-190.test.ts` (lancé avec les accès des boutiques de test, jamais écrits dans le dépôt) :

| Étape | WooCommerce 8.9.3 | PrestaShop 8.1.7 |
|---|---|---|
| Produit créé dans le Studio (2 coloris, références, stock 10 / 5, photo, catégorie, prix barré) | ✓ | ✓ |
| Fiche personnalisée (description, photos, options) et transférée : produit créé dans la boutique | ✓ (fiche publique : nom, prix, coloris) | ✓ (fiche publique : nom) |
| Ajouté au panier de la boutique (coloris « Nuit ») | ✓ | ✓ |
| Modifié dans le Studio (nom, prix) puis renvoyé : **même produit, mêmes variantes, aucun doublon** | ✓ | ✓ |
| Vente dans la boutique (Sable 10 → 7) + réassort au Studio (10 → 15) : **12** des deux côtés, rien d'écrasé | ✓ | ✓ |
| Deuxième envoi sans changement : rien n'est renvoyé | ✓ | ✓ |
| Import des produits existants : produit relié non réimporté, second import sans doublon | ✓ | ✓ (19 produits de démonstration) |

Limite : la **mise en page propre à un produit** (modèle « product.<suffixe> ») n'existe que sur Shopify ; WooCommerce et
PrestaShop n'ont qu'une fiche produit pour tous (l'export le signale).

## Rendez-vous après export (point 7)

`scripts/rdv-export-190.ts` : ATELIER NUANCE exporté en mode « service réel », installé dans la boutique de test, service
du studio servi en HTTPS local.

| | WordPress | PrestaShop |
|---|---|---|
| Parcours de réservation sur le site exporté (prestation, intervenant, créneau, coordonnées, confirmation) | ✓ | ✓ |
| Réservation reçue par le service du studio et visible dans la rubrique Rendez-vous | ✓ | ✓ |
| Même créneau pour une autre cliente : plus proposé par le calendrier du site | ✓ | ✓ |

Non vérifié après export : PARENTHÈSE et TABLE SAISON (même service et même mécanisme, vérifiés dans le studio par
`tests/rendez-vous-190.test.ts` et leurs propres tests). En production, il faut une **adresse publique HTTPS** du studio.

## Blocages (accès qui manquent)

- **Shopify — installation réelle, envoi des produits, mise en page par produit** : aucune boutique de développement
  Shopify ni jeton d'application n'est disponible dans cet environnement. Il faut : une boutique de développement
  (compte Shopify Partner) **et** soit la boutique reliée dans « Connexions », soit un jeton d'application personnalisée
  avec `write_products`, `write_inventory`, `read_locations`, `write_themes`. Fait à la place : Theme Check officiel sur
  les 15 ZIP (0 erreur) et envoi des produits vérifié par requêtes simulées.
- **Éditeur de site de WordPress (interface)** : la boutique de test est hors ligne ; WordPress 6.5.5 y a été assemblé
  depuis npm et l'éditeur ne s'ouvre pas (script incomplet). La **modification d'une section** a été vérifiée par l'API
  des modèles — celle qu'utilise l'éditeur pour enregistrer — sur les 15 thèmes : texte changé, enregistré, visible sur
  le site. Il reste à l'ouvrir une fois dans un vrai WordPress à jour.
- **Kits de photos privés absents de ce serveur** : ONDE, MAISON & HORIZON, APLAT (et 7 photos de PARENTHÈSE remplacées,
  connu). Les pages s'affichent ; les photos manquantes ne peuvent pas être contrôlées ici.

## Défauts trouvés pendant les contrôles, et corrigés

| # | Où | Défaut | Correction (test) |
|---|---|---|---|
| 1 | WordPress et PrestaShop | SILLON, TABLE SAISON, ATELIER NUANCE, PARENTHÈSE, PHASE **sans leur feuille de style** une fois installés | feuille appelée par une section livrée et chargée (`controle-themes-190`) |
| 2 | WordPress | erreurs JavaScript (script appelé par une section introuvable) | fichier à l'adresse attendue |
| 3 | WordPress | polices vides dans le moteur PHP (PHASE : pied de page plus large que le téléphone) | réglages « police » en objets |
| 4 | WordPress | « & » affiché « &amp;amp; » (ex. « Coupe &amp;amp; brushing ») | filtrage sans double encodage |
| 5 | WordPress | langue de la page = langue de l'administration (réservation à moitié en anglais) | langue du site exporté |
| 6 | WooCommerce | grille de produits plus large que le téléphone (8 px) | `es-woo.css` |
| 7 | PrestaShop | MAISON & HORIZON « Créer une alerte » plus large que l'écran (444 px) | cases cachées posées dans leur libellé |
| 8 | Tous | HEUREN, panier au téléphone : « Supprimer » coupé, page plus large que l'écran | ligne d'article sur 3 colonnes |
| 9 | Tous | ONDE « Aide » : décor plus large que le téléphone (138 px) ; liens CGV de la commande hors de l'aperçu | décor coupé ; liens réécrits |
| 10 | Tous | APLAT : liens d'étapes (#observer…) sans cible | identifiant posé sur la carte |

## Restant, à signaler ou à décider (rien n'a été fait sans accord)

- **Droits 49 € / 89 €** : à décider par Thomas (Administration › Thèmes et forfaits).
- **ORBE et ALCÔVE** : retirés du choix faute de maquette trouvée ; si des maquettes existent hors GitHub, les remettre
  d'une ligne. Rien n'est supprimé.
- TRAVERSE, accueil au téléphone sur WordPress et PrestaShop : un bouton dépasse de 3 px (pas dans l'aperçu ni sur
  Shopify) ; non corrigé.
- PrestaShop : prix barré non envoyé par le connecteur (réduction à créer dans PrestaShop) ; stock à 0 après import
  sans quantité connue (bouton d'achat grisé tant que le marchand ne met pas de stock) ; sections modifiables seulement
  dans le studio puis réimport.
- La préparation amont du projet (`src/lib/preparation/`) classe encore par catégories et cite ORBE / ALCÔVE ; l'accueil
  du studio montre encore ORBE dans deux démonstrations. Non modifiés (autre domaine) : à proposer à Thomas.
- Une autre conversation travaillait sur `claude/themes-differenciation` : ses commits postérieurs au 25 octobre sont à
  réunir avant mise en ligne.
- Suite complète des tests : 3 125 réussis, 1 échec déjà constaté avant cette mission (`tests/social-autopilot-pilote.test.ts`,
  budget du pilote automatique ; ni ce test ni son code ne sont modifiés par la branche).

## Preuves (dans l'espace de travail de la session, hors dépôt)

Captures et résultats bruts des contrôles : exports et `resume.json` (commit exporté), `crawl-190.json` (démonstrations),
`install/wp-resultats.json` et `install/ps-resultats.json` (installations, une capture par page à 1440 px),
`theme-check-190.json`, `rdv-export/` (captures de la réservation). Outils pour les refaire : voir
`docs/EXPORTS-PLATEFORMES-190.md`.
