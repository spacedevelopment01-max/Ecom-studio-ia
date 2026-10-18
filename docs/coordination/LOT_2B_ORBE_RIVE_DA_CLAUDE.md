# Lot 2B — ORBE et Atelier Rive, variante « direction artistique » (session Claude)

**État : corrections de la revue du 18 octobre livrées pour validation, en brouillon, sans fusion (PR #135).** Après comparaison des deux livraisons, Thomas a retenu la direction Atelier Rive, la section « Produit à la une » et les pieds de page de cette variante, et la composition immersive de Codex pour l'ouverture ORBE sur ordinateur. Cette passe applique ces choix et corrige les défauts signalés. Les captures, gros plans et vidéos contenant les 24 photographies du pack restent privés (ZIP remis dans la conversation, page privée) ; aucun média du pack n'est ajouté au dépôt public.

## Revue du 18 octobre (après-midi) : deux corrections et une livraison testable

Revue reçue sur la PR #135 ([6250435016](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/135#issuecomment-6250435016)) : direction conservée, aucune refonte visuelle.

| Demande | Réalisé | Vérifié |
|---|---|---|
| Images des variantes dans le panier (toutes les lignes montraient Dune) | Le rendu des lignes prend le média de la variante réellement choisie (`featured_media`), avec repli sur l'image du produit quand la variante n'a pas de média propre ; les données `cart.js` portent le même visuel (`image`, `featured_image`). Correction dans le moteur (`render.ts`, route d'aperçu), pas dans les données de démonstration. Calcul serveur, stocks, offres et cadeaux inchangés. | test avec trois variantes aux images distinctes (page, tiroir, quantité modifiée, repli) ; dans Chromium : page panier, tiroir, `cart.js`, rechargement, quantité modifiée, à 1440 et 390 px ; gros plans et vidéo « panier à trois finitions » |
| Prix principal « 79,00 € » sans précision sur la fiche | Réglage « Libellé du prix unitaire » (texte, traduit) sur la fiche produit, la section « Produit à la une » et le bloc d'offres ; partagé par la source commune. ORBE : « 79,00 € par lampe » ; le même mot sert aux offres (« 71,10 € par lampe × 2 ») et à la barre mobile (« 63,20 € par lampe »). Vide : « par article ». | test ; contrôle des libellés dans Chromium sur la fiche, la section et la barre pour les offres 1/2/3/4 et les changements de variante ; gros plans |
| Livraison réellement testable | Procédure [`LOT_2B_VERIFICATION_LOCALE.md`](LOT_2B_VERIFICATION_LOCALE.md) et script `scripts/lot2b-demo-local.ts` (installe les deux démonstrations avec les 24 images dans un studio local, affiche les adresses) ; descriptif de la PR mis à jour ; résultats des tests et de la CI distingués ci-dessous. | script exécuté sur une base temporaire : 12/12 médias par projet, adresses produites |

Complément du 18 octobre attribué à cette passe ([6249565658](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6249565658)) : sur mobile, le bouton « Ajouter au panier » de « Produit à la une » suit déjà les choix et le total (une seule commande principale, options transmises à la fiche) ; les pieds de page ORBE ont déjà un seul mot-symbole, sans marque secondaire (`show_wordmark`), colonnes et espacements vérifiés à 390 px. Captures jointes, rien à modifier.

Pas de validation générale annoncée : la suite complète `npm test` n'est exécutée que par la CI (voir le tableau des vérifications).

## Passe de finition du 18 octobre (soir)

| Demande | Réalisé | Vérifié |
|---|---|---|
| Ouverture ORBE : reprendre la composition immersive de Codex, retirer le rectangle clair | Photographie 16/9 pleine largeur, lampe entière, texte posé sur la zone calme sans panneau (`copy_surface` décoché ; les autres projets gardent un voile léger facultatif). Mobile : titre 50 px sur trois lignes, texte et bouton compacts, photo 4/5 cadrée sur la lampe. | captures 1440 / 1024 / 768 / 390, H1 88 px sur trois lignes à 1440 |
| Section « Produit à la une » remontée après les premiers bénéfices | Ordre de l'accueil : ouverture, repères, **produit à la une**, dîner/lecture, soir, finitions, duo, accessoires, questions, conclusion. | ordre contrôlé par test et rendu |
| Socle de la lampe Dune coupé | Cause : sur mobile, la vue gardait sa hauteur naturelle dans une scène carrée (image 437 px dans 350 px). La vue occupe désormais exactement la scène (`contain`), vignettes de packshot entières. | mesure dans Chromium pour les trois finitions à 1440 et 390 : image ≤ scène, `object-fit: contain` ; gros plans fournis |
| Répétitions accueil / fiche | Fiche produit : sections réécrites (« Une lampe, plusieurs moments », « Le soir, la lumière se fait discrète », « À deux, la même silhouette »), section finitions retirée (déjà dans le bloc d'achat), questions resserrées à trois. L'accueil garde la présentation complète. | rendu des deux pages |
| Barre d'achat mobile : le bouton doit ajouter | Le bouton fixe déclenche le vrai bouton d'ajout (même requête serveur, mêmes contrôles de stock, prix et cadeau) quand la sélection est prête ; sinon il affiche « Choisir mes options » et conduit aux options. État occupé reflété, un seul ajout à la fois. | ajout réel depuis la barre à 390 px → panier 142,20 €, une ligne |
| Prix unitaire et total sans ambiguïté | Résumé « Total · Le duo » avec « 71,10 € par article × 2 » dessous ; barre : « Le duo · Dune · 71,10 € par article » et « Total 142,20 € » ; synchronisés à chaque changement d'offre ou de finition. | contrôle des libellés dans la section et la barre |
| Atelier Rive : titre mobile et densité | Titre d'ouverture 44 px sur mobile et retours à la ligne naturels sous 990 px (les coupes forcées ne valent que sur grand écran) ; espacements 112 → 96 px et deux textes raccourcis ; pieds de page sans logo répété conservés. | « Repensons la pièce que vous vivez le plus. » sur trois lignes à 390 px |
| Coordination | Aucun fichier de `src/lib/cms-v2/`, `src/lib/theme/catalog-export.ts` ni `assets/cms/` touché. Branche dédiée conservée, pas de fusion des PR #134 / #135. | diff de la branche |

## Version, base et périmètre

- Branche `claude/orbe-rive-direction-artistique`, créée sur `077a2106227e7a7a00c89e783f1a37f6775d54ae` (tête de `codex/lot-2a-themes-reference` au démarrage, inchangée à ce moment). La branche Codex et la PR #134 ne sont pas modifiées. Depuis, Codex a poussé sept commits (`9f8b6c43` à la rédaction) qui touchent en partie les mêmes fichiers : les deux branches sont deux réalisations distinctes, à comparer, pas à fusionner telles quelles.
- Première livraison : `dbc52162` (application), `58a9b634` (rapport). Passe de finition : `24892334`. Revue du 18 octobre : `3f8abb78` (application) puis `[DOCS_COMMIT]` (script de preuves et documentation) ; preuves capturées sur `[TESTED_COMMIT]`, arbre propre (champ `testedCommit` de [`reports/lot2b-da/preuves.json`](../../reports/lot2b-da/preuves.json)). Base de comparaison visuelle : `dbc52162` pour cette variante, `563ab003` pour la composition Codex (reconstruite localement dans un second dossier de travail, voir les limites).
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

Revue du 18 octobre (commit `[TESTED_COMMIT]`) :

| Contrôle | État | Détail |
|---|---|---|
| `npx tsc --noEmit` | réussite | sortie 0 |
| `npx vitest run tests/lot2b-featured.test.ts tests/lot2b-editorial.test.ts tests/themes-catalogue.test.ts tests/theme-en.test.ts tests/theme.test.ts` | réussite | 40 tests, 5 fichiers (dont le nouveau test panier / libellé) |
| `scripts/verify-theme.sh --rapide` | réussite | 25 cas, zéro erreur Theme Check, ZIP client valide |
| `scripts/verify-theme.sh` complet (`JOBS=2`) | réussite : 137 cas, zéro erreur Theme Check, ZIP client valide | fichiers de thème identiques entre `3f8abb78` et `[TESTED_COMMIT]` |
| `scripts/lot2b-da-proof.ts` complet (4 largeurs, vidéos) | réussite | 16 visites sans erreur JavaScript ni débordement, 24 médias, visuels du panier contrôlés (page, tiroir, `cart.js`, rechargement, quantité), « par lampe » sur la fiche, la section et la barre, ajout depuis l'accueil, la fiche et la barre, 6 vidéos |
| `scripts/lot2b-demo-local.ts` sur une base temporaire | réussite | deux projets créés, 12/12 médias chacun |
| Suite complète `npm test` en local | non exécutée | durée ; exécutée par la CI (ci-dessous) |
| CI GitHub « Typecheck, tests, Theme Check, build » sur `be81697a` (tête précédente) | réussite | terminée à 13:37 UTC |
| CI GitHub « Image Docker » sur `be81697a` | réussite | terminée à 13:20 UTC |
| CI GitHub sur `[TESTED_COMMIT]` | [CI_NEW] | relevée au moment de la rédaction |
| Exports CMS installés sur un CMS réel | non exécuté | hors périmètre, remises et cadeaux désactivés à l'export |

Passe de finition (commit `24892334`) : tsc, 39 tests sur 5 fichiers, Theme Check complet valide (137 cas), passe de preuves complète réussie.

Première livraison (commit `dbc52162`) : mêmes commandes, résultats équivalents (24 tests sur 3 fichiers à l'époque, Theme Check complet valide, passe de preuves complète).

La suite générale `npx vitest run` n'a pas été relancée intégralement dans cette session (durée et dépassements de délai déjà documentés par Codex sur le test du calendrier, hors périmètre) : elle reste **non vérifiée** ici ; les tests du thème, du lot 2B, du catalogue et de la langue anglaise le sont.

### Interactions vérifiées dans Chromium (bureau et mobile)

- Accueil ORBE, section Produit à la une (3e position) : finition Charbon → grand visuel Charbon ; trio → pochette débloquée ; lien « Voir la fiche complète » porte `variant=1002&offer=offer_3` ; ajout au panier depuis l'accueil → sous-total 201,45 € ; scène isolée capturée pour Dune, Argile et Charbon à 1440 et 390 px, socle entier.
- Fiche ORBE : offres 1/2/3/4 → 79,00 / 142,20 / 201,45 / 252,80 € ; cadeau débloqué à partir de 3 ; finition par article ; galerie qui suit la finition ; zoom ouvert et fermé au clavier ; trio mixte → panier 201,45 € avec cadeau non modifiable ; trio → duo au panier → 142,20 € et cadeau retiré ; suppression du lot → panier vide ; stock de pochette à zéro → cadeau indisponible ; barre d'achat mobile visible quand le bouton est hors écran, avec finition, prix par article et total ; son bouton « Ajouter au panier » a réellement ajouté le duo (142,20 €, une ligne) par la requête serveur habituelle.
- Accueil Rive : chapitre 2 → image bibliothèque ; étude en deux vues ; FAQ ouverte. Prestation Rive : formulaire → « Demande de test enregistrée. Aucun e-mail envoyé. », fichier de reçu réellement écrit ; comparaison des trois accompagnements.
- Mouvement réduit : zéro animation active ; menu mobile ouvert, fermé par Échap, focus rendu au bouton.

### Vidéos

Quatre vidéos H.264 (MP4) issues du navigateur : ORBE ordinateur 36,5 s et mobile 36,1 s (défilement, finitions, offres, galerie, ajout au panier) ; Atelier Rive ordinateur 26,0 s et mobile 27,2 s (défilement, chapitres, FAQ, formulaire). Déposées dans le dossier privé. Revue du 18 octobre : deux vidéos supplémentaires « panier à trois finitions » (ordinateur 13,6 s, mobile 13,2 s) montrant la fiche avec son prix par lampe, le trio Dune / Argile / Charbon et le panier avec les bons visuels.

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

- Page privée ChatGPT de Codex inaccessible depuis cette session (nom de domaine non résolu) : la composition immersive de Codex a été reconstruite localement depuis le code de `563ab003` et les 24 images, puis comparée. Les rendus Codex eux-mêmes n'ont donc pas été vus.
- Contrôles non automatisés : la lecture des pages avec un lecteur d'écran et le test sur de vrais appareils (iPhone / Android, Safari) n'ont pas été faits ; les captures viennent de Chromium à quatre largeurs. Navigation clavier et mouvement réduit sont vérifiés par le harnais, pas à la main.
- Les autres thèmes du catalogue (28) passent le Theme Check complet mais leur rendu visuel après ces changements de `editorial.css` / `editorial.js` n'a pas été re-capturé ; les règles ajoutées sont ciblées (`ed-opening--immersive`, `fp`, `purchase-bar`, titres du profil « journal »).

- Les photographies sont des concepts de démonstration ; aucune donnée technique, avis, délai ou réalisation client n'est ajouté.
- Exports CMS : générés pour les deux projets (Shopify, WooCommerce, PrestaShop, Wix, Squarespace) dans le dossier privé, non installés ; remises et cadeaux restent désactivés à l'export (`purchase_rules_require_server`) comme dans le lot 2B. La section « Produit à la une » est transmise avec ses fichiers CSS/JS comme les autres sections éditoriales ; son rendu natif dans un CMS installé n'est pas vérifié.
- La suite générale de tests n'a pas été relancée intégralement (voir ci-dessus).
- Les deux branches (Codex et celle-ci) modifient en partie les mêmes fichiers ; aucune réconciliation n'a été tentée, Thomas choisit d'abord.
- Les 28 autres thèmes attendent la validation visuelle de Thomas.
