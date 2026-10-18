# Lot 2B — ORBE et Atelier Rive, variante « direction artistique » (session Claude)

**État : version consultable livrée pour comparaison, en brouillon, sans fusion.** Les quatre pages sont construites dans le vrai moteur du studio avec les 24 photographies du pack `ORBE_Atelier_Rive_Dossier_Codex.zip`, remis dans la conversation Claude le 18 octobre 2026. Les captures, gros plans et vidéos contenant ces photographies sont déposés dans un **dossier Google Drive privé du propriétaire** ; aucun média du pack, aucun export qui l'embarque et aucune capture photographique n'est ajouté au dépôt public.

Cette variante répond à la demande de Thomas du 18 octobre (comparer deux réalisations). Le commentaire de coordination [6249203547](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6249203547) annulait la version concurrente ; le message direct de Thomas à cette session, postérieur, la demande explicitement et précise qu'il l'emporte. Cette contradiction a été signalée au démarrage.

## Version, base et périmètre

- Branche `claude/orbe-rive-direction-artistique`, créée sur `077a2106227e7a7a00c89e783f1a37f6775d54ae` (tête de `codex/lot-2a-themes-reference` au démarrage, inchangée à ce moment). La branche Codex et la PR #134 ne sont pas modifiées. Depuis, Codex a poussé sept commits (`9f8b6c43` à la rédaction) qui touchent en partie les mêmes fichiers : les deux branches sont deux réalisations distinctes, à comparer, pas à fusionner telles quelles.
- Code de l'application et des démonstrations : `dbc52162`. Preuves : voir le champ `testedCommit` de [`reports/lot2b-da/preuves.json`](../../reports/lot2b-da/preuves.json), qui identifie la version réellement capturée.
- Consignes lues intégralement : mission [6247457951](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6247457951) (version 08:28:10 UTC), précision « Produit à la une » [6248929074](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6248929074), coordination [6249203547](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6249203547), `CLAUDE.md`, briefs du ZIP (`README.md`, `MESSAGE_CODEX.txt`, `ORBE.md`, `ATELIER_RIVE.md`, `RECETTE.md`, `ASSETS.md`, `manifest.json`), rapport et plan du lot 2B de Codex.
- Aucun merge, déploiement, publication, changement de l'accueil public du studio, nouvelle connexion ni appel IA payant (`ai_calls` vide pour les deux projets de test, vérifié par le harnais).

## Où voir les rendus

Page privée de preuves : https://claude.ai/artifact/9svdkBiprPc6Ji4ZNnpjUt (huit pages entières à 1440 et 390 px, pages entières 1024 et 768 px, premiers écrans et pieds de page à chaque largeur, gros plans, quatre vidéos, mesures). Elle n'est visible que par le propriétaire du compte tant qu'il ne la partage pas. Index sans photo dans le dépôt : [`reports/lot2b-da/README.md`](../../reports/lot2b-da/README.md).

## Les 24 images : vérifiées puis affectées

| Contrôle | Résultat |
|---|---|
| ZIP reçu | `074367c6-ORBE_Atelier_Rive_Dossier_Codex.zip`, 6,2 Mo, SHA-256 `f2b3c433…f18386` |
| `SHA256SUMS` | 33 fichiers conformes (24 WebP + 9 documents) |
| Dimensions | identiques à `ASSETS.md` et `manifest.json` (1122×1402, 1536×1024, 1672×941, 1254×1254) |
| Revue visuelle | 24 fichiers ouverts (planches-contact légendées puis vues individuelles). Lampe cohérente sur les 12 vues ORBE : dôme, tige, socle, bouton supérieur ; Dune / Argile / Charbon distincts ; coffret et pochette distincts. 12 scènes Rive distinctes, volume vide et salon cohérents pour l'étude. |

Affectation finale (une seule image par grand bloc, répétitions justifiées) :

| Page | Section | Image | Cadrage bureau → mobile |
|---|---|---|---|
| Accueil ORBE | Ouverture | `orbe-02-chambre` | photo décalée à droite, lampe visible à côté du texte ; mobile 4/5, point focal 64 % |
| Accueil ORBE | Diptyque | `orbe-03-diner`, `orbe-04-lecture` | 4/3 et 4/5 |
| Accueil ORBE | Scène sombre | `orbe-08-lumiere` | portrait 4/5 |
| Accueil ORBE | Finitions | `orbe-07-trio` + packshot de la finition choisie (`orbe-01`, `orbe-10`, `orbe-09`) | — |
| Accueil ORBE | Duo | `orbe-06-duo` | panorama 16/8 ; mobile 16/9 pour garder les deux lampes |
| Accueil ORBE | **Produit à la une** | galerie : `orbe-01-dune`, `orbe-09-charbon`, `orbe-10-argile`, `orbe-03-diner`, `orbe-04-lecture`, `orbe-05-bureau` ; `orbe-12-pochette` pour le cadeau | packshots en `contain` ; répétition fonctionnelle de la galerie, pas un nouveau visuel éditorial |
| Accueil ORBE | Accessoires | `orbe-11-boite`, `orbe-12-pochette` | 4/3 et 4/5 |
| Accueil ORBE | Conclusion | `orbe-05-bureau` | panorama |
| Fiche ORBE | Galerie | les 8 images produit (3 packshots + dîner, lecture, bureau, duo, nuit) ; variantes → packshot | carrousel + vignettes + zoom |
| Fiche ORBE | Suite | diptyque, nuit, finitions, duo, accessoires, FAQ, retour à l'achat | mêmes rôles que l'accueil |
| Accueil Rive | Ouverture | `rive-01-salon` | titre sur papier puis paysage ; mobile 4/5, point focal 42 % |
| Accueil Rive | Approche | `rive-10-menuiserie` | petite verticale décalée |
| Accueil Rive | Inspirations | `rive-02-cuisine`, `rive-03-chambre`, `rive-04-entree` | index 8 colonnes puis deux verticales |
| Accueil Rive | Matières | `rive-07-matieres` | bande vert profond |
| Accueil Rive | Prestations | `rive-08-plans`, `rive-06-bibliotheque`, `rive-11-repas` | image qui change au clic / clavier |
| Accueil Rive | Reportage | `rive-06-bibliotheque` | panorama, déplacement léger ; répétition avec la prestation « Aménagement d'une pièce » (image non affichée par défaut dans la section précédente) |
| Accueil Rive | Étude | `rive-09-volume`, `rive-01-salon` | deux vues côte à côte, seule répétition autorisée |
| Accueil Rive | Contact | `rive-12-escalier` | petite verticale |
| Prestation Rive | Ouverture | `rive-06-bibliotheque` | titre puis paysage, légende d'intention |
| Prestation Rive | Du plan aux matières | `rive-08-plans`, `rive-07-matieres` | 4/3 et 4/5 |
| Pages secondaires Rive | Inspirations, contact | `rive-05-salle-eau` | panorama / conclusion |

## Ce qui a été construit

### Section réutilisable « Produit à la une » (`featured-purchase`)

Réponse à la précision de Thomas : une vraie section produit, pas une grille de packs.

- Composition : sur ordinateur, visuels à gauche (grand visuel 4/5, vignettes, zoom) et nom, prix unitaire, présentation, bénéfices, finitions, offres 1/2/3/4, variantes par article, cadeau, total, « Ajouter au panier » et « Voir la fiche complète » à droite ; le bloc visuel suit le défilement. Sur mobile : nom et prix, image, vignettes, présentation puis choix et action.
- Le choix de la finition change le grand visuel (fondu 200 ms, dimensions réservées) ; le lien vers la fiche conserve la variante et l'offre choisies (`?variant=…&offer=…`), la fiche les reprend.
- Données : réglage `purchase_source` identique à la section « Offres et cadeaux ». La section lit les blocs d'offres de la fiche à la compilation et au rendu ; une source absente ferme l'achat ; elle n'est jamais une source d'offres concurrente (`productOfferSection`, `purchaseExportManifest`). Calcul serveur, stocks et cadeau inchangés : l'ajout depuis l'accueil passe par la même route d'aperçu que la fiche.
- Réutilisable : galerie du studio (catégorie Produit, FR/EN), schéma traduit, réglages de produit / identité stable / nombre d'images / cadrage / zoom / libellé du lien ; lots et cadeaux affichés uniquement s'ils sont configurés. Aucune condition sur le nom d'une démonstration.

### ORBE

- Ouverture : photographie décalée vers la droite sur 9 colonnes, texte sur la partie calme avec un voile ivoire léger, titre Cormorant 88 px à 1440 px sur trois lignes, 50 px à 390 px ; CTA actif immédiatement, image 1,03 → 1 en 800 ms.
- En-tête 76 px (64 px mobile), pied de page typographique avec signature ample sans logo répété.
- Progression des dix sections conservée, textes développés (dîner, lecture, soir, finitions, duo, accessoires, FAQ avec calcul des lots), espacements 104–112 px bureau / ≤ 72 px mobile.
- Fiche : galerie 58 / 42, H1 compact 57,6 px, bloc d'achat qui suit le défilement sur ordinateur ; sur mobile, offres en deux colonnes comparables, bénéfices et finitions compacts, barre d'achat fixe (total et finition de la sélection, retour au vrai bouton, masquée quand un dialogue ou le panier est ouvert, espace réservé en bas de page). Le bouton principal passe de ≈ 1 900 px à 1 657 px de haut de page à 390 px, et l'action reste accessible en permanence par la barre.

### Atelier Rive

- Titre Archivo 96 px à 1440 px (48 px mobile) sur trois lignes maîtrisées, puis paysage avec légende « projet d'intention ».
- Chapitres numérotés (01, 02, 03) dans les prestations et la méthode, image des prestations qui suit le défilement sur ordinateur et change au clic ou au clavier, reportage à déplacement léger (≤ 20 px, coupé en mouvement réduit), index d'inspirations décalé, bande matières vert profond, étude en deux vues explicitement simulées, FAQ en grandes lignes, formulaire court avec reçu de test réel.
- Pied de page vert profond : grande signature, colonnes « L'atelier » et « Explorer », aucune répétition du logo (correction demandée dans `MESSAGE_CODEX.txt`).

### Moteur et édition

- `ed-media` : point focal mobile distinct (`mobile_focus_x/y`) sur l'ouverture, les scènes et les cadres de diptyque, réglable dans l'éditeur.
- Pied de page : la colonne de marque disparaît quand la signature tient lieu de marque et qu'il n'y a pas de slogan ; les réseaux sociaux restent dans la grille.
- `purchase-offers.js` : lecture de `?offer=` et événement `es:offer-total` ; `editorial.js` : galerie du produit à la une, barre d'achat mobile, déplacement léger, boucle de mutation évitée.
- Toutes les opérations existantes (textes, médias, couleurs, ordre, CTA, animation, restauration) restent celles du studio ; le test dédié exerce `set_setting`, `move_section` et le refus d'un produit inconnu sur la nouvelle section.

## Vérifications réellement exécutées

| Commande | Résultat |
|---|---|
| `npx tsc --noEmit` | réussi, sortie 0 |
| `npx vitest run tests/lot2b-featured.test.ts tests/lot2b-editorial.test.ts tests/theme.test.ts` | 24 tests réussis, 3 fichiers |
| `npx vitest run tests/lot2b-editorial.test.ts tests/themes-catalogue.test.ts tests/theme-en.test.ts` | réussi après adaptation d'un identifiant de section dans le test existant (`purchase` → `featured`) |
| `scripts/verify-theme.sh --rapide` | 25 cas, zéro erreur Theme Check, ZIP client valide |
| `scripts/verify-theme.sh` (complet, `JOBS=2`) | 137 cas réussis, zéro erreur Theme Check, ZIP client valide : « Thème : tout est valide. » |
| `CHROMIUM=… npx tsx scripts/lot2b-da-proof.ts <dossier privé> <pack>/images` | 16 visites (4 pages × 1440 / 1024 / 768 / 390), 24 médias chargés, aucun cadre « Visuel à importer », aucun débordement, un seul H1 par page, aucune erreur JavaScript, aucune image cassée ; interactions et vidéos ci-dessous |

La suite générale `npx vitest run` n'a pas été relancée intégralement dans cette session (durée et dépassements de délai déjà documentés par Codex sur le test du calendrier, hors périmètre) : elle reste **non vérifiée** ici ; les tests du thème, du lot 2B, du catalogue et de la langue anglaise le sont.

### Interactions vérifiées dans Chromium (bureau et mobile)

- Accueil ORBE, section Produit à la une : finition Charbon → grand visuel Charbon ; trio → pochette débloquée ; lien « Voir la fiche complète » porte `variant=1002&offer=offer_3` ; ajout au panier depuis l'accueil → sous-total 201,45 €.
- Fiche ORBE : offres 1/2/3/4 → 79,00 / 142,20 / 201,45 / 252,80 € ; cadeau débloqué à partir de 3 ; finition par article ; galerie qui suit la finition ; zoom ouvert et fermé au clavier ; trio mixte → panier 201,45 € avec cadeau non modifiable ; trio → duo au panier → 142,20 € et cadeau retiré ; suppression du lot → panier vide ; stock de pochette à zéro → cadeau indisponible ; barre d'achat mobile visible quand le bouton est hors écran, avec le total courant.
- Accueil Rive : chapitre 2 → image bibliothèque ; étude en deux vues ; FAQ ouverte. Prestation Rive : formulaire → « Demande de test enregistrée. Aucun e-mail envoyé. », fichier de reçu réellement écrit ; comparaison des trois accompagnements.
- Mouvement réduit : zéro animation active ; menu mobile ouvert, fermé par Échap, focus rendu au bouton.

### Vidéos

Quatre vidéos H.264 (MP4) issues du navigateur : ORBE ordinateur 36,5 s et mobile 36,1 s (défilement, finitions, offres, galerie, ajout au panier) ; Atelier Rive ordinateur 26,0 s et mobile 27,2 s (défilement, chapitres, FAQ, formulaire). Déposées dans le dossier privé.

## Correspondance consignes et références → choix réalisés

| Consigne ou référence | Choix | Où |
|---|---|---|
| Précision « Produit à la une » | section complète, offres intégrées au produit, gros plans bureau/mobile fournis | accueil ORBE, section 7 |
| Impact / Concept (galerie, vignettes, variantes illustrées, premier écran) | galerie 58 / 42, vignettes, zoom, finition → image, H1 compact | fiche ORBE |
| Shrine Pro (offres 1/2/3/4, offre mise en avant, cadeau par palier) | cartes d'offres accessibles, « Notre sélection » sur le duo, pochette dès 3 | fiche et accueil ORBE |
| Be Yours (page longue qui progresse) | diptyque → nuit → finitions → duo → accessoires → FAQ → retour à l'achat | fiche ORBE |
| Prestige / Luminaire Authentik (grandes photographies, sobriété, luminaire dans l'intérieur) | ouverture décalée, scène sombre, duo bord à bord, typographie Cormorant | accueil ORBE |
| MERSI / Khufu's (revue d'architecture, chapitres, immersion) | titre sur papier puis paysage, numérotation, index décalé, bande matières, reportage | accueil Rive |
| Caeli (expliquer une offre et conduire au contact) | prestations en lignes, méthode en quatre étapes, comparaison, formulaire court | prestation Rive |
| Mobile conçu à part | ordre recomposé, offres en deux colonnes, barre d'achat, cadrages mobiles distincts | toutes les pages |

Les sites de référence n'ont pas été rouverts dans cette session : les choix s'appuient sur les axes d'étude écrits dans la mission et sur les compositions détaillées. Aucun média, texte ou marque des références n'est repris.

## Écarts restants et limites

- Les photographies sont des concepts de démonstration ; aucune donnée technique, avis, délai ou réalisation client n'est ajouté.
- Exports CMS : générés pour les deux projets (Shopify, WooCommerce, PrestaShop, Wix, Squarespace) dans le dossier privé, non installés ; remises et cadeaux restent désactivés à l'export (`purchase_rules_require_server`) comme dans le lot 2B. La section « Produit à la une » est transmise avec ses fichiers CSS/JS comme les autres sections éditoriales ; son rendu natif dans un CMS installé n'est pas vérifié.
- La suite générale de tests n'a pas été relancée intégralement (voir ci-dessus).
- Les deux branches (Codex et celle-ci) modifient en partie les mêmes fichiers ; aucune réconciliation n'a été tentée, Thomas choisit d'abord.
- Les 28 autres thèmes attendent la validation visuelle de Thomas.
