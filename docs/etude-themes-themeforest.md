# Étude de 65 thèmes Shopify vendus sur ThemeForest (11 novembre 2026)

Demande du propriétaire : « prends exemple des thèmes Shopify qu'il y a sur ThemeForest, tu ouvres les démos et tu
regardes comment ils sont construits pour lui donner la logique à monter des thèmes ». Cette étude sert aux consignes de
conception de SINA (`src/lib/syna-agent/custom-theme/design.ts`, `PAGE_PATTERNS`, l'exemple `EXAMPLE` et le contrôle
`pageOrderGaps`).

## Méthode et limites

- **65 thèmes différents** ouverts sur leurs boutiques de démonstration, en trois lots :
  - polyvalents (18) : Ella, Minimog, Wokiee, Shella, Avone, Molla, Porto, Hongo, Basel, Belle, Zeexo, Handy,
    Chromium, Athora, Elessi, Lezada, Mixtas, Electro ;
  - mode et beauté (22) : Elessi, Corano, Mirora, Jemily, Lartique, Charmee, Binim, Arome, Basel, Mogo, Lamode, Pose,
    Vetro, Gario, Sandral, Veloza, Feellio, Havi, Theno, Purevea, Jewelly, Venedor ;
  - alimentaire, thé, maison, mono-produit (27) : Moocha, Montea, Greenplant, Tea & Coffee, Kofi, Cocafe, Acoffee,
    Milatino, Vegist, Safira, Orgafe, Oganova, Tartine, Chokolade, Vitazen, Esteva, Ceratin, Alamp, Furnitica, Hinate,
    Minimart, Decora, Furnit, SP Sofasy, Elomus, Mixture, Sinp.
- Pour chacun : accueil, fiche produit, collection, panier, et « à propos » et contact quand ils existent ; l'ordre des
  sections relevé dans la page, chaque section rangée par rôle.
- themeforest.net n'a jamais été ouvert (vérification anti-robots, jamais contournée). Les boutiques protégées par mot de
  passe ont été laissées de côté (Kalles, Gecko 6, Glozin, Umino, Ecomus, Harmony, Wookie, Arustino, Amada, BeautyXtore,
  Unsen, Furniforma, Brew, Roastra, FreshGo, Organist, Intrend, Wickery…). La vente sur ThemeForest n'a pas été
  vérifiée thème par thème.
- Paniers vus vides (aucun ajout, aucun formulaire envoyé) ; largeur ordinateur seulement ; démos souvent en faux texte.
- Données brutes et synthèses par lot : hors dépôt (dossier de travail de la session).

## Ce que font les thèmes qui se vendent

### Accueil (médiane 9 à 10 sections ; 6 = pauvre, plus de 13 = répétitif)
1. **Ouverture** toujours en premier (65 sur 65) : diaporama dans la grande majorité, photo seule ou partagée sinon ;
   pleine largeur, un seul bouton par image ; jamais une vidéo seule.
2. **Orienter** en 2e ou 3e position : bannières de gamme, réassurance courte, familles ou bandeau défilant.
3. **Produits tôt** : dans les 4 premières sections (15/18 polyvalents, 15/21 mode, 22/27 alimentaire) ; deux blocs
   de produits en médiane (les onglets remplacent plusieurs grilles).
4. **Milieu alterné** « produits / image » : image et texte, grande photo pleine largeur de respiration, look achetable,
   bande sombre ou sur photo pour le moment fort ; jamais deux sections de même rôle à la suite dans les thèmes récents.
5. **Preuves après les produits** (avis, presse, chiffres, logos), dans le dernier tiers ; jamais avant.
6. **Fin** : articles, Instagram, inscription ou garanties ; la page ne finit jamais sur des produits.

### Fiche produit (médiane 4, fiches récentes 7 à 12)
Bloc d'achat toujours en premier → description en onglets juste après → ce qui raconte et rassure (préparation,
ingrédients, avis, questions, grande photo) → produits liés en dernier. Barre d'achat qui reste en bas : 15 sur 18.

### Collection, panier, pages d'information
- Collection : 2 à 4 sections ; bannière de titre, filtres et grille ; jamais de long texte au-dessus de la grille.
- Panier : 1 à 3 sections ; le panier et des suggestions ; jamais d'avis ni de promotion.
- À propos : histoire, image et texte en alternance, valeurs, équipe, chiffres ; contact : formulaire et coordonnées.

### Rythme
Fonds blancs pour les produits, une ou deux bandes pâles, une bande sombre ou sur photo au milieu ; ouverture et grandes
photos en pleine largeur, produits cadrés.

### À ne jamais recopier des démos
Minuteurs et « offre du jour » sur une marque soignée, fenêtre d'inscription à l'arrivée, compteurs de visiteurs ou de
ventes fictifs, sections « espace » vides, deux blocs de produits liés à la suite, chiffres et promesses de santé
inventés.

### Propre au thé et aux infusions
Préparation en pictogrammes sous le bloc d'achat (quantité, température, temps) ; familles de thé expliquées une par
une ; rituel ou culture sur fond sombre ; accessoires et coffrets ; jamais de minuteur.

## Ce qui a changé dans le Studio
- Consignes de conception de SINA : l'ordre des pages ci-dessus (`PAGE_PATTERNS`), donné au concepteur et au relecteur.
- Nouvel exemple fait uniquement de sections actuelles de la banque (l'ancien citait des sections retirées).
- Contrôle sans IA de l'ordre des pages (`pageOrderGaps`) : ce qui est refusé revient une fois au concepteur.
- Six sections ajoutées à la banque Classique, présentes dans presque tous les thèmes vendus et absentes jusque-là :
  image et texte, bannières de gamme, grande photo de respiration, produits en onglets, vous aimerez aussi, vidéo en
  bande.

## Variété des conceptions (11 novembre 2026)
Retour du propriétaire : « elle doit savoir mélanger et pas mettre tout le temps les mêmes sections ». Le premier essai
sur Éclat de thé reprenait plusieurs sections de l'exemple. Désormais :
- l'exemple ne nomme aucune section : il montre la logique moment par moment, et SINA compare toutes les sections qui
  peuvent servir chaque moment ;
- la bibliothèque lui est donnée dans un ordre propre à chaque projet (et à chaque concept) ;
- les sections des derniers thèmes des autres projets lui sont signalées, et un accueil et une fiche à 70 % identiques à
  un thème déjà monté sont refusés (`varietyGaps`), puis corrigés une fois.
