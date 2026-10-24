# SOUPLE refait d'après les six maquettes du 23 octobre : résultats à vérifier

Consigne : PR #180, `docs/theme-briefs/souple/CONSIGNE_CLAUDE.md` (dossier repris de la branche `brief/souple-20261024`).
Dossier : 6 maquettes et inventaire de 59 visuels (`docs/theme-briefs/souple/`). Travail limité à SOUPLE : NOCTIL, MUSEAU
CLUB, TRAVERSE, Atelier Rive, Parenthèse, Maison & Horizon et l'accueil commercial sont conservés (voir « Fichiers
partagés »).

**Rien n'est marqué « validé » : la validation visuelle et commerciale revient à Thomas.** Les tests prouvent que les
fonctions marchent ; ils ne prouvent pas que le rendu est bon. Aucune image n'a été générée, aucun appel d'IA payant,
aucune fusion, aucun déploiement.

Code vérifié : branche `claude/themes-differenciation`, démo, vignettes et comparaisons faites sur le commit
`07167014` (rapport et vignettes dans les commits suivants).
Preuves : [`docs/theme-briefs/souple/resultats/`](../theme-briefs/souple/resultats/) (comparaisons, parcours des
fonctions, preuve du studio, version client).

## En bref

- Famille **E-commerce** partout (catalogue, studio, galerie, tests) ; jamais Services ni Boutique spécialisée.
- Profil « souple » : ivoire chaud `#FDF8F1`, prune `#4A1530` / `#35041B`, rose poudré `#EFE1DD`, liège `#C98A55`
  (couleurs relevées sur les planches) ; titres **Playfair Display**, textes **Jost** (polices libres).
- **35 pages** de démonstration, toutes faites de sections modifiables dans le studio (aucune page n'est une image) :
  accueil, 4 fiches, boutique, recherche, panier rempli et vide, commande en 4 étapes, confirmation, notre approche,
  journal et 6 articles, guide, FAQ, contact, livraison et retours, 4 pages légales à onglets, 6 écrans de compte, 404.
- **Prix de démonstration** centralisés (`SOUPLE_PRICES`) : tapis 59 €, brique 19 €, sangle 15 €, anneau 29 €, toujours
  suivis de « Prix de démonstration ». Tapis + brique = **78 € en sous-total**, livraison « Calculée à l'étape
  suivante », jamais de « Total » final, aucune remise, aucune livraison offerte.
- **57 des 59 visuels** utilisés, tous à leur place prévue par `AFFECTATIONS.csv` ; **2 non reçus** (ZIP n°04 tronqué à
  23 220 027 octets) : `21-compte-collection-verticale.png` et `22-compte-bandeau.png`, remplacés par les variantes
  prévues par l'inventaire (`ambiance-08`, `ambiance-07`). **À renvoyer** pour les poser.
- **45/45 vérifications de fonctions** réussies sur la démo statique (panier, commande, filtres, tri, galerie, zoom,
  compte, cookies, 360 / 390 / 430 px sans débordement, aucune requête extérieure).

## Page par page : planche → page → sections → photos → actions → preuves

Comparaisons (maquette à gauche, rendu 1440 px puis 390 px à droite) : `resultats/comparaison-0X-*.jpg`.

| Planche | Page (démo statique) | Sections | Photos | Actions vérifiées | Écarts restants |
|---|---|---|---|---|---|
| 01 | Accueil (`accueil.html`) | grande scène au titre centré (cv-banner « scène »), « Nos essentiels » 4 cartes, panneau « Un espace pour revenir à soi », gros plan du tapis à acheter + 3 vignettes, panneau « Quatre essentiels », « Nos univers » 3 cartes, bandeau de marque prune, journal 3 articles, FAQ 4 questions, inscription | 01-accueil-collection, 02, 03, tapis-02/03/04/05, tapis-01, ambiance-03, anneau-04, logo, 3 photos du journal | bouton panier de chaque carte (ajout réel), « Ajouter au panier » du gros plan, FAQ dépliable | texte d'ouverture centré (légèrement à droite sur la maquette) ; une petite mention « Prix de démonstration » sous chaque carte (la maquette en a une seule sous la grille) |
| 02 | Fiches tapis et brique | galerie à vignettes à gauche + zoom, prix, quantité, ajout, réassurance « à confirmer », panneau « Votre espace commence ici », gros plans légendés + encadré de points, « À votre rythme » (photos à pastilles), infos / « Ils s'accordent parfaitement » / questions en 3 colonnes, barre d'achat finale | tapis-01→05, 10, 12, ambiance-02/06 ; brique-01→05, 13, 14, 15, 16, ambiance-03 | vignettes, flèches, zoom (Échap), quantité, ajout, ajout depuis les produits associés, barre d'achat fixe sur téléphone | valeurs Dimensions / Matériaux / Entretien « À confirmer » (inconnues) |
| 03 | Fiches sangle et anneau | galerie + accordéons dans la fiche, bandeau à courbe douce, 3 tuiles sur photo, « À associer avec » (liste avec +) | sangle-01→05, 04, 05, 06 ; anneau-01→05, 07, 08, 09, ambiance-04, ambiance-09 | idem fiches 02 | — |
| 04 | Boutique, panier, commande, confirmation | ouverture courbe, pastilles **Tous (4) / Tapis (1) / Accessoires (3)**, tri (nos choix, prix croissant / décroissant, nom), état vide ; panier : lignes, quantité, supprimer, sous-total, « Complétez votre pratique » sur photo ; panier vide : grande photo et 3 repères ; commande Contact → Adresse → Livraison → Paiement + récapitulatif ; confirmation d'exemple | 01, 05-sangle-sur-tapis, 27-panier-vide, packshots | filtres et compteurs, tri, recherche (résultat / aucun résultat), quantité +, suppression, persistance après rechargement, validation de chaque étape, retour sans perte de saisie, récapitulatif exact, confirmation avec les articles saisis | la recherche statique montre un résultat préparé (la vraie recherche est celle de Shopify) ; l'ordre « Nos choix » suit la collection |
| 05 | Notre approche, journal, article, guide, FAQ, contact | approche : ouverture, 3 principes, panneau « Quatre essentiels » (aucune histoire de fondatrice, aucune certification) ; journal : catégories filtrables, article à la une, grille ; 6 articles (modèle « Créer un coin pour bouger chez soi ») ; guide : 4 produits + comparatif ; FAQ : sommaire par thème + 15 questions + photo ; contact : nom, e-mail, sujet, n° de commande facultatif, message, accord, autres moyens d'assistance | 17→20, 28, ambiance-05/10, 14, 26 | filtres du journal, sommaire de la FAQ (ancres), accordéons, contact refusé vide (6 champs signalés) | titre d'ouverture de « Notre approche » plus petit que sur la planche ; corps d'article sur une colonne (deux sur la maquette) ; « Autres moyens d'assistance » sous le formulaire et non à sa droite |
| 06 | Compte, livraison, légal, cookies, 404 | connexion + inscription côte à côte, mot de passe oublié, mon compte (bandeau photo), commande SOUPLE-0001 (exemple de suivi, facture fictive), adresses, informations ; livraison et retours « à confirmer » ; 4 onglets Mentions / CGV / Confidentialité / Cookies « à compléter » ; bandeau de cookies ; 404 photo dans un S | ambiance-08 / ambiance-07 (variantes des 2 non reçus), 23-colis-ouvert, 24-livraison-sac-kraft, 25-404-piece | connexion refusée avec de faux identifiants, acceptée avec le compte fictif `demo@souple.example` / `demo` → Mon compte ; afficher le mot de passe ; cookies : refuser, personnaliser, accepter, rouvrir depuis « Gérer mes cookies » | photos prévues 21 et 22 non reçues |

Le prénom « Camille » de la planche 06 n'est pas repris (personne inventée) ; la facture est annoncée « aucun document
fiscal n'est émis dans cette démonstration ».

## Matrice des 59 visuels

Calculée sur les pages réellement produites (démo statique du commit indiqué plus bas).

| # | Fichier du dossier | Affectation prévue (AFFECTATIONS.csv) | Utilisé dans la démo |
|---|---|---|---|
| 1 | `ambiance-01.webp` | Approche · Collection alternative issue du kit conservé | Notre approche |
| 2 | `ambiance-02.webp` | Fiche tapis · Photo de pratique verticale | Tapis de yoga |
| 3 | `ambiance-03.webp` | Accueil · Univers accessoires<br>Fiche brique · Rituel avec sangle | Accueil, Brique de yoga, Sangle de yoga |
| 4 | `ambiance-04.webp` | Fiche anneau · Photo sur podium | Anneau Pilates |
| 5 | `ambiance-05.webp` | Collection · Variante vue du dessus disponible | Guide |
| 6 | `ambiance-06.webp` | Fiche tapis · Variante tapis roulé disponible | Tapis de yoga |
| 7 | `ambiance-07.webp` | Fiche brique · Variante au soleil disponible | Mon compte |
| 8 | `ambiance-08.webp` | Compte · Variante verticale disponible | Connexion |
| 9 | `ambiance-09.webp` | Fiche anneau · Variante sur brique disponible | Anneau Pilates |
| 10 | `ambiance-10.webp` | Journal · Article vedette collection | Accueil, Le journal, Les essentiels pour votre pratique |
| 11 | `anneau-01.webp` | Fiche anneau · Galerie, vue 1<br>Accueil · Carte produit anneau | Accueil, Anneau Pilates, Boutique, Brique de yoga, Guide, Les essentiels pour votre pratique (+2) |
| 12 | `anneau-02.webp` | Fiche anneau · Galerie, vue 2 | Anneau Pilates |
| 13 | `anneau-03.webp` | Fiche anneau · Galerie, vue 3 | Anneau Pilates |
| 14 | `anneau-04.webp` | Fiche anneau · Galerie, vue 4<br>Accueil · Univers Pilates | Accueil, Anneau Pilates |
| 15 | `anneau-05.webp` | Fiche anneau · Galerie, vue 5 | Anneau Pilates |
| 16 | `brique-01.webp` | Fiche brique · Galerie, vue 1<br>Accueil · Carte produit brique | Accueil, Anneau Pilates, Boutique, Brique de yoga, Commande SOUPLE-0001, Confirmation de commande (+6) |
| 17 | `brique-02.webp` | Fiche brique · Galerie, vue 2 | Brique de yoga |
| 18 | `brique-03.webp` | Fiche brique · Galerie, vue 3 | Brique de yoga |
| 19 | `brique-04.webp` | Fiche brique · Galerie, vue 4<br>Accueil · Journal matière | Brique de yoga |
| 20 | `brique-05.webp` | Fiche brique · Galerie, vue 5 | Brique de yoga |
| 21 | `logo.webp` | Toutes · En-tête et pieds de page | Accueil, Anneau Pilates, Boutique, Brique de yoga, Commande SOUPLE-0001, Comment choisir son tapis de yoga ? (+30) |
| 22 | `sangle-01.webp` | Fiche sangle · Galerie, vue 1<br>Accueil · Carte produit sangle | Accueil, Anneau Pilates, Boutique, Brique de yoga, Guide, Les essentiels pour votre pratique (+3) |
| 23 | `sangle-02.webp` | Fiche sangle · Galerie, vue 2 | Sangle de yoga |
| 24 | `sangle-03.webp` | Fiche sangle · Galerie, vue 3 | Sangle de yoga |
| 25 | `sangle-04.webp` | Fiche sangle · Galerie, vue 4 | Sangle de yoga |
| 26 | `sangle-05.webp` | Fiche sangle · Galerie, vue 5 | Sangle de yoga |
| 27 | `tapis-01.webp` | Fiche tapis · Galerie, vue 1<br>Accueil · Carte produit tapis | Accueil, Anneau Pilates, Boutique, Brique de yoga, Commande SOUPLE-0001, Comment choisir son tapis de yoga ? (+8) |
| 28 | `tapis-02.webp` | Fiche tapis · Galerie, vue 2<br>Accueil · Détail tapis roulé | Accueil, Comment choisir son tapis de yoga ?, Tapis de yoga |
| 29 | `tapis-03.webp` | Fiche tapis · Galerie, vue 3<br>Accueil · Matière et signature tapis | Accueil, Comment choisir son tapis de yoga ?, Créer un coin pour bouger chez soi, Le journal, Le mouvement au fil des saisons, Les essentiels pour votre pratique (+3) |
| 30 | `tapis-04.webp` | Fiche tapis · Galerie, vue 4<br>Accueil · Détail sous-face tapis | Accueil, Tapis de yoga |
| 31 | `tapis-05.webp` | Fiche tapis · Galerie, vue 5 | Accueil, Tapis de yoga |
| 32 | `01-accueil-collection.png` | Accueil · Grande ouverture collection<br>Boutique · Ouverture collection | Accueil, Boutique, Notre approche |
| 33 | `02-accueil-espace.png` | Accueil · Espace pour revenir à soi | Accueil, Le mouvement au fil des saisons |
| 34 | `03-collection-tapis-roule.png` | Accueil · Bandeau collection | Accueil |
| 35 | `04-sangle-principale.png` | Fiche sangle · Photo principale<br>Panier · Recommandation sangle | Boutique, Sangle de yoga |
| 36 | `05-sangle-sur-tapis.png` | Fiche sangle · Scène de pratique sur tapis | Panier rempli, Sangle de yoga |
| 37 | `06-sangle-texture.png` | Fiche sangle · Macro tissu | Sangle de yoga |
| 38 | `07-anneau-principal.png` | Fiche anneau · Photo principale | Anneau Pilates, Boutique |
| 39 | `08-anneau-mouvement.png` | Fiche anneau · Scène sur tapis | Anneau Pilates |
| 40 | `09-anneau-rainures.png` | Fiche anneau · Macro rainures | Anneau Pilates |
| 41 | `10-tapis-piece.png` | Fiche tapis · Photo principale dans la pièce | Boutique, Tapis de yoga |
| 42 | `11-tapis-pouf.png` | Fiche tapis · Récit et pratique avec pouf | Tapis de yoga |
| 43 | `12-tapis-roule-plaid.png` | Fiche tapis · Mise en scène tapis roulé et plaid | Le mouvement au fil des saisons, Tapis de yoga |
| 44 | `13-brique-principale.png` | Fiche brique · Photo principale | Boutique, Brique de yoga |
| 45 | `14-brique-tapis-tisse.png` | Fiche brique · Brique sur tapis tissé | Brique de yoga, FAQ |
| 46 | `15-brique-texture.png` | Fiche brique · Macro liège | Brique de yoga |
| 47 | `16-briques-empilees.png` | Fiche brique · Briques empilées — mise en scène, pas un lot commercial | Brique de yoga |
| 48 | `17-journal-coin-pouf.png` | Accueil · Journal rituel<br>Journal · Rituel du matin | Accueil, Comment choisir son tapis de yoga ?, Créer un coin pour bouger chez soi, Le journal, Le mouvement au fil des saisons, Les essentiels pour votre pratique (+2) |
| 49 | `18-journal-ombres.png` | Accueil · Journal ombres<br>Confirmation · Fond décoratif discret si montré | Accueil, Confirmation de commande, Le journal, Trouver l'équilibre dans un quotidien actif |
| 50 | `19-journal-tasse.png` | Journal · Pause et tasse | Rituel du matin : 5 minutes pour soi, Trouver l'équilibre dans un quotidien actif |
| 51 | `20-article-coin-pratique.png` | Article · Coin de pratique chez soi | Comment choisir son tapis de yoga ?, Créer un coin pour bouger chez soi, Le journal, Le mouvement au fil des saisons, Les essentiels pour votre pratique, Rituel du matin : 5 minutes pour soi (+1) |
| 52 | `21-compte-collection-verticale.png` | Compte · Ouverture verticale | **non reçu** (ZIP n°04 tronqué) → variante prévue utilisée |
| 53 | `22-compte-bandeau.png` | Compte · Bandeau du tableau de bord | **non reçu** (ZIP n°04 tronqué) → variante prévue utilisée |
| 54 | `23-colis-ouvert.png` | Commande et réinitialisation · Colis ouvert | Réinitialiser mon mot de passe |
| 55 | `24-livraison-sac-kraft.png` | Livraison et retours · Sac kraft et accessoires | Livraison & retours |
| 56 | `25-404-piece.png` | 404 · Photo à découper avec masque S en SVG ou CSS | Page introuvable |
| 57 | `26-contact-collection.png` | Contact · Bandeau inférieur accessoires | Nous contacter |
| 58 | `27-panier-vide.png` | Panier vide · Grande photo | Panier vide |
| 59 | `28-journal-feuillage.png` | Journal et contact · Feuillage | Comment choisir son tapis de yoga ?, Créer un coin pour bouger chez soi, Le journal, Le mouvement au fil des saisons, Nous contacter, Rituel du matin : 5 minutes pour soi |

## Arbitrages

- **Noms** : « Anneau Pilates » (consigne) plutôt que « Cercle Pilates » (planche 01) ; titres d'articles de la
  planche 05 préférés à ceux de la planche 01 (la planche 05 montre les articles complets).
- **Total** : « Sous-total (2 articles) 78 € » ; la livraison n'étant pas connue, aucun « Total » n'est affiché
  (panier, commande, compte).
- **Promesses** : confort, résistance, durabilité, bienfaits, délais, garanties, matières non vérifiées → reformulées
  sur ce que montrent les photos ou laissées « À confirmer ». Exemple : « Pour un esprit plus apaisé » (panier vide)
  devenu « Un moment rien qu'à vous ».
- **Compte** : compte fictif contrôlé (`demo@souple.example` / `demo`) ; rien n'est créé ni envoyé ; sur une vraie
  boutique, ce sont les comptes clients de la plateforme.
- **Commande** : aucun champ de carte ; l'étape Paiement explique que le paiement se fait sur la page sécurisée de la
  plateforme. Case « Recevoir nos actualités » décochée.

## Galerie, studio, adaptation à un autre projet

- Galerie **E-commerce** : les compositions des maquettes sont rangées dans les fonctions existantes (aucune nouvelle
  fonction, toujours 20) : Présentation principale (grande scène, panneau à courbe douce, photo à gauche, bandeau de
  marque, barre d'achat), Sélection de produits (infos, produits associés et questions), Produit à la une (gros plan à
  acheter, gros plans légendés, repères à icônes, photo et points pratiques), Usages (univers en colonnes, photos à
  pastilles, cartes sur photo, cartes en lignes). Ces sections ne sont proposées qu'aux thèmes qui savent les rendre
  (ORBE, ONDE, HEUREN, ALCÔVE ne les voient pas).
- **Studio** (`scripts/souple-studio-check.ts`, vrai studio Next.js, base temporaire) : **17/17 étapes** (`resultats/studio.json`) : la galerie
  E-commerce montre 9 compositions SOUPLE avec leur aperçu réel ; un panneau à courbe douce est ajouté, son titre, son
  bouton, sa photo (« Mes images ») et ses couleurs sont modifiés, il est dupliqué puis déplacé ; après rechargement
  complet, tout est conservé. Un projet client fictif à quatre produits (« Céramor », théière, tasse, sous-tasse,
  plateau) habillé en SOUPLE montre son logo, ses produits et ses textes, sans aucune photo, aucun texte ni aucun prix de
  la démonstration (`resultats/studio-09-client-accueil.jpg`). Ce projet ayant choisi un angle de communication, sa
  composition et ses polices sont celles de sa marque.
- **Version client sans angle de communication** : le projet MUSEAU CLUB (accessoires pour chien, ses photos, ses textes) composé dans SOUPLE
  (`resultats/client-*.png`) : aucun texte, prix ni photo de SOUPLE ; mêmes couleurs de structure tirées de SA marque.
  Pour une boutique cliente, « Nos univers » montre ses collections, la FAQ utilise la section « Questions, titre à
  côté » (masquée tant qu'il n'y a pas de vraies questions) et le bandeau de marque son propre logo (masqué sans logo).
  Écart connu : sans article de blog, le bloc « Le journal » affiche « Visuel à importer » (comportement commun aux
  thèmes).

## Écarts restants (à regarder en priorité)

1. Deux visuels non reçus (21, 22) : variantes en place, à remplacer dès réception.
2. « Notre approche » : titre d'ouverture plus petit que sur la planche 05.
3. Article : corps sur une colonne (deux colonnes sur la planche 05).
4. Contact : « Autres moyens d'assistance » sous le formulaire au lieu de la colonne de droite.
5. Accueil : une mention « Prix de démonstration » sous chaque carte au lieu d'une seule sous la grille.
6. Recherche de la démo statique : un résultat préparé ; sur Shopify, c'est la vraie recherche.
7. Version client : bloc « Le journal » avec « Visuel à importer » tant que le client n'a pas d'article.
8. Toutes les informations inconnues (dimensions, matières, entretien, délais, retours, mentions légales) restent
   « À confirmer » / « à compléter ».
Aucun rendu n'est « au pixel près » : les comparaisons montrent la composition, pas une copie exacte.

## Corrections faites pendant la recette

- Ajout au panier depuis une carte, le gros plan et la barre d'achat : le formulaire partait vers une page (correct
  sur Shopify mais cassé dans la démo) → ajout direct avec ouverture du panier latéral (`theme.js`, tous thèmes,
  seulement pour les formulaires produit hors fiche ; repli sur le formulaire classique sans panier latéral).
- Redirections de la commande et de la connexion d'exemple réécrites dans l'aperçu (`render.ts`).
- Lien « Gérer mes cookies » réellement présent sur la page Cookies (le texte l'annonçait sans lien).
- Titre du bandeau de marque prune sur prune → couleur du jeu de couleurs (lisible).
- Mention « Prix de démonstration » écrite dans la feuille de style (elle serait restée chez un client) → retirée ;
  un test interdit tout texte dans `souple.css`.
- « Total 78 € » de la page Commande du compte → « Sous-total ».
- Photos du kit placées selon `AFFECTATIONS.csv` (ambiance-04 à 10 n'étaient pas toutes utilisées).
- En-tête de la page légale aligné sur les onglets.

## Tests, types, Theme Check

- `npx tsc --noEmit` : aucune erreur.
- Suite complète `npx vitest run` : 2 945 tests réussis, 2 ignorés, 1 échec (test de la vignette qui lisait l'ancien
  fichier de démonstration de SOUPLE) corrigé puis relancé : 9/9. `tests/souple.test.ts` réécrit pour les six
  maquettes : 21 tests (famille, galerie, profil, ordre de l'accueil, compositions des fiches, prix, galerie propre à
  chaque fiche, ajouts au panier réels, 57 visuels, SEO, honnêteté, panier 78 €, commande, compte, cookies, boutique,
  pages, liens internes, version client, exports Shopify / WooCommerce / PrestaShop).
- Theme Check de Shopify : complet (11 directions, FR / EN, multi, niche, services, ZIP client) **tout est valide**,
  puis rapide après les dernières retouches : valide.
- Parcours des fonctions (`resultats/fonctions-interactions.json`) : 45/45. Preuve du studio : 17/17.
- Non-régression : démos MUSEAU CLUB, NOCTIL et TRAVERSE reconstruites et capturées : ouvertures identiques à leurs
  captures suivies.

## Fichiers partagés modifiés (coordination)

`theme.js` (ajout direct hors fiche), `render.ts` (réécriture de 2 attributs de destination), `section-families.ts`
(dispositions E-commerce), `section-library.ts` / `content-roles.ts` / inventaire, `section-fit.ts` (souple autorisé
pour les sections cv-), `conversion.css` (règles club/astral étendues à souple), `faq.liquid` (sommaire facultatif,
ancres seulement avec lui), `product-card.liquid`, `fs-products.liquid`, `main-collection.liquid`, `main-product.liquid`,
`main-cart.liquid`, `footer.liquid`, `main-404.liquid`, `cv-banner.liquid`, `cv-feature.liquid`, `demo-order.liquid`,
`demo-account.liquid` : nouveaux réglages facultatifs, valeurs par défaut inchangées pour les autres thèmes.
`scripts/reference-static-preview.ts` : un cas croisé « museau-en-souple ».

## Guide pour Thomas (simple)

1. Ouvrir la démo SOUPLE (galerie des thèmes → SOUPLE → aperçu).
2. Accueil : cliquer sur le petit panier d'une carte → le panier s'ouvre avec le produit.
3. Fiche du tapis : cliquer une vignette, puis la grande photo (zoom), changer la quantité, ajouter.
4. Panier : ajouter la brique → « Sous-total (2 articles) 78 € », « Livraison : Calculée à l'étape suivante ».
5. « Passer commande » : essayer de continuer sans e-mail (refusé), remplir, revenir en arrière (rien n'est perdu),
   valider → confirmation d'exemple « SOUPLE-0001 (exemple) ».
6. Boutique : pastilles « Tapis (1) », « Accessoires (3) », tri par prix.
7. Mon compte : `demo@souple.example` / `demo`.
8. Dans le studio : ajouter une section (galerie « E-commerce »), changer son titre et sa photo, recharger.

À décider ou à fournir : renvoyer les 2 visuels manquants (21 et 22) ; confirmer les dimensions, matières, entretien,
délais et conditions de retour pour remplacer les « À confirmer ».

## Environnement

Démo statique préparée avec `THEME_DEMOS_DIR=… npx tsx scripts/prepare-theme-demos.ts souple` ; captures et parcours avec
Chromium (Playwright) servis en HTTP local ; aucun réseau extérieur.
