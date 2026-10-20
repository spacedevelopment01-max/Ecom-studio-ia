# Vérification des bibliothèques de sections après la fusion #144 — rapport (issue #145)

Branche `claude/verification-sections-145`, partie de `main` fusionné **d97e0b95** (fusion #144). Code testé : voir
« Version testée » en bas de page. Pull request en brouillon : aucune fusion ni mise en ligne (non autorisées par la
mission). **À valider par Thomas.**

## Studio réel de Thomas ou copie isolée ?

- **Studio du Codespace (version servie d97e0b95, constatée par Thomas) : non vérifié par moi.** L'adresse
  `organic-train-7vg7574wwxqj3xwq4-3000.app.github.dev` est refusée par le réseau de mon environnement, et l'accès aux
  Codespaces par l'API GitHub aussi. Je n'ai pas rendu le port public.
- **Tout ce qui suit a été fait sur une copie isolée** du `main` fusionné puis de cette branche : vrai studio Next.js
  en développement, base de données temporaire, aucune donnée de Thomas, aucun appel d'IA réel ni payant, aucun
  réseau. Les données, médias, réglages et fichiers locaux de Thomas (dont `reports/logo-debug-sebastien-blanc/`)
  n'ont pas été touchés : aucun reset, nettoyage ni réinitialisation.

Mot à mot : **exécuté** = lancé ici pour de vrai ; **simulé** = l'IA est remplacée par une réponse préparée ;
**non vérifié** = pas fait.

## Résultat de chaque contrôle demandé

| # | Contrôle | Résultat | Nature |
|---|---|---|---|
| 1 | 20 fonctions par famille, dispositions comprises dans la fonction, pertinence | réussi (tableau ci-dessous) | exécuté (tests du registre) |
| 2 | Galeries et ajouts séparés par famille, serveur et chat IA compris | **défauts corrigés** (A, B, C, D, E ci-dessous) | exécuté + IA simulée |
| 3 | 5 en-têtes + 5 pieds de page par famille, hors des 20 : choix, modification, sauvegarde, rechargement | réussi (FRAISE, ORBE, Atelier Rive) | exécuté (studio isolé) |
| 4 | Identité automatique à l'insertion, sans contenu de démonstration ni fait inventé, deux marques par famille | **défauts corrigés** (F, G) | exécuté (6 projets neufs, 392 insertions) |
| 5 | Parcours réels de l'éditeur, animations, dégradés, effets, « réduire les animations » | réussi | exécuté (studio isolé) |
| 6 | Rendu téléphone / ordinateur : débordement, chevauchement, image répétée, produit masqué, lisibilité, cadrage | **défauts corrigés** (H, I, J, K) ; limites listées | exécuté (720 mesures + revue des captures) |
| 7 | 30 anciens thèmes et anciennes sections retirés des interfaces, projets enregistrés toujours lisibles | réussi ; deux restes corrigés (D, E) | exécuté |
| 8 | Section entièrement écrite par l'IA réservée à Dominer (129 €), serveur compris | **défauts corrigés** (A, B) | IA simulée |
| 9 | Exports WooCommerce et PrestaShop : carrousels, repères, avant / après | **défauts corrigés** (L, M, N) | exécuté (thème exporté, sans installation réelle) |
| — | Quatre thèmes validés FRAISE, ONDE, ORBE, Atelier Rive inchangés | voir « Quatre thèmes validés » | exécuté |

## Défauts constatés, cause, correction, test

| | Défaut constaté | Cause | Correction | Test |
|---|---|---|---|---|
| A | En forfait Créer, le chat pouvait ajouter une section écrite par l'IA | la passe de correction automatique de l'IA n'était pas filtrée (seule la première réponse l'était) ; le message citait encore Développer | même filtre sur la correction ; message « forfait Dominer » | `isolation-forfait-familles` |
| B | La composition IA de l'accueil (moteur V1) ajoutait une section sur mesure hors Dominer et des sections d'une autre famille (ex. prestations dans ORBE) | ni forfait ni famille vérifiés dans cette voie ; grille `featured-collection` imposée hors bibliothèque | forfait vérifié ; famille appliquée à chaque section ; grille de la bibliothèque | idem |
| C | « Recomposer », le catalogue ou « nouveau site » remplaçaient ORBE et FRAISE par des sections V2 hors bibliothèque | moteur V2 choisi par défaut hors parcours de préparation | un projet dans l'un des quatre thèmes se recompose dans son thème ; « langage visuel V2 » refusé | idem |
| D | Commandes simples (« Ajoute une FAQ », « frise des étapes », « infos pratiques », « section avis ») échouaient sans essayer l'IA | le moteur local proposait `v2-faq`, `v2-steps`, `v2-facts`, `product-reviews` (hors bibliothèque) et ses essais à blanc ignoraient la famille | essais à blanc avec la famille ; proposition hors bibliothèque écartée | idem |
| E | Aperçu de n'importe quelle section par l'adresse ; ancien menu « Choisir la disposition » en double (en-tête et pied : toutes les valeurs brutes) | contrôles absents | aperçu limité à la bibliothèque ; ancien menu masqué là où la famille a ses dispositions | idem |
| F | Trois dispositions « services » montrées dans la galerie mais refusées à l'ajout (« Méthode de travail » ×2, « Contact » en bandeau) | sections `how-to` et `cta-banner` déclarées réservées aux boutiques | déclarées aussi pour les services | `identite-projets-neufs-familles` |
| G | Citation : 5 étoiles et « Avis fictif » sur un site réel sans avis ; avant / après des services fait de deux photos quelconques du projet | valeurs par défaut de la section ; photos posées d'office | ni note ni étiquette sans avis réel ; cadres « Photo avant / après les travaux » à remplir | `rendu-bibliotheques-familles` |
| H | Icônes des sections de bibliothèque affichées en formes noires pleines (100 occurrences) | aucun style pour ces icônes | icônes au trait, couleur du texte | idem + audit |
| I | FAQ numérotée : numéros invisibles sur les questions fermées ; citation en bandeau : sur-titre invisible, disque vide | couleur d'accent sur fond d'accent ; disque rendu sans auteur | couleurs lisibles ; disque seulement s'il y a un auteur | idem |
| J | Avant / après en curseur : les deux légendes superposées | les deux légendes au même endroit | légendes côte à côte sous l'image | idem |
| K | « ? » seul en début de ligne (bandeau de contact) | espace normale avant « ? » | espace insécable | — |
| L | Exports WordPress / PrestaShop : carrousels, repères, avant / après, carrousels d'avis inertes | liste fixe de 4 scripts, sans `family.js` ni `conversion.js` (encore vrai après #136) | scripts lus dans la mise en page réelle, même ordre | `exports-interactions-familles` + contrôle Chromium |
| M | Export WordPress : toute section avec un script propre (tableau comparatif, onglets…) tombait en erreur, donc vide pour les visiteurs — **FRAISE compris** (tableau comparatif de l'accueil) | balise `{% javascript %}` inconnue du moteur PHP | balise retirée des gabarits, script ajouté au script du thème (WordPress et PrestaShop) | idem |
| N | WooCommerce : « Sélection de produits » sans aucun produit | le moteur PHP n'a pas les fiches produits de Shopify | grille de produits native de WooCommerce, mêmes produits | idem |

Chaque test a été lancé sans la correction (il échoue) puis avec (il passe), sauf K (texte).

## Preuves (privées, hors dépôt)

Galeries et captures dans la page privée et le ZIP privé (voir le commentaire de l'issue) :

- **Deux marques de contrôle neuves par famille** (Miellerie Sorel / Thé Kōri ; Maison Ardoise / Velours & Fil ;
  Plomberie Navarre / Paysages Aubier) : les 20 fonctions, toutes leurs dispositions, 5 en-têtes, 5 pieds de page,
  contenus de production (manques signalés « À compléter »).
- **Les quatre démonstrations** (FRAISE / ONDE, ORBE / marque B, Atelier Rive / marque B) : même galerie, contenus
  d'exemple marqués.
- Audit visuel à 390 et 1 440 px de chaque page ; captures du studio isolé ; exports WooCommerce et PrestaShop
  (interactions avant / après correction) ; quatre thèmes validés avant / après.

## Limites et points non vérifiés

- **Studio réel de Thomas** : non vérifié (voir plus haut).
- **Exports** : thème exporté rendu par son moteur PHP et ses vrais fichiers dans Chromium, pas installé dans un
  WordPress ou un PrestaShop réel (pas de Docker ici). « Sélection de produits » dans WooCommerce : grille native, donc
  sans la disposition carrousel.
- **ONDE** : les petits numéros vert vif (frise, FAQ numérotée) sont peu contrastés sur fond clair (environ 2:1). C'est
  la couleur d'accent du thème ONDE validé : non modifiée, à décider par Thomas.
- **Bandeau d'appel sur téléphone** : la photo de fond est recadrée (décor derrière le texte). Le point focal se règle
  dans le panneau.
- Fausses alertes de l'audit vérifiées sur capture et écartées : onglets en pastilles, prix du comparatif, bandeau de
  contact (texte clair sur fond foncé lisible), vignette de la galerie produit (l'image principale reprise en vignette).
- Restes mineurs relevés, non corrigés : la duplication d'une ancienne section déjà présente dans un projet enregistré
  reste possible (compatibilité de lecture) ; les sections de repli du « thème entièrement sur mesure » (Dominer) ne
  passent pas par la règle de famille — fichier possiblement touché par le chantier Codex #142, non modifié.
- Premier passage du contrôle du studio pour Atelier Rive : délai dépassé à la dernière étape (vue téléphone, aperçu
  en cours de compilation) ; relancé, il a réussi entièrement.
- Téléphone réel de Thomas : non vérifié.

## Tableau des bibliothèques (tiré du code)

Chaque fonction est **une** section : ses dispositions sont des choix dans la galerie et dans le panneau « Réglages », pas des sections en plus. Liste complète des correspondances : [`correspondance-sections-familles.md`](correspondance-sections-familles.md).

#### Boutique spécialisée — 20 fonctions, 75 dispositions

| N° | Fonction | Dispositions (section du thème) |
|---|---|---|
| 1 | Présentation principale | Visuel à droite (cv-hero) · Visuel à gauche (cv-hero) · Visuel au-dessus (cv-hero) · Visuel en fond (cv-banner) · Bannière visuel et prix (cv-banner) |
| 2 | Bénéfices du produit | Grille (features-grid) · Deux colonnes (features-grid) · Liste verticale (features-grid) · Carrousel (features-grid) · Autour d'un visuel (cv-feature) · Visuel à gauche (cv-feature) · Bandeau défilant (marquee) |
| 3 | Détails du produit | Gros plans en lignes (cv-cards) · Gros plans en colonnes (cv-cards) · Repères interactifs (cv-hotspots) · Repères, liste dessous (cv-hotspots) |
| 4 | Composition et matériaux | Visuel et liste (cv-ingredients) · Cartes (cv-ingredients) · Liste compacte (cv-ingredients) |
| 5 | Caractéristiques | Titre à côté, accordéons (cv-specs) · Accordéons empilés (cv-specs) · Onglets (content-tabs) · Onglets en pastilles (content-tabs) |
| 6 | Mode d'emploi | Étapes en cartes (cv-steps) · Étapes sur une ligne (cv-steps) · Frise (timeline) |
| 7 | Situations d'utilisation | Alternance image / texte (cv-alternating) · Images à gauche (cv-alternating) · Mosaïque (cv-gallery) · Galerie en grille (cv-gallery) · Galerie en carrousel (cv-gallery) |
| 8 | Démonstration vidéo | Grand lecteur (fs-video) · Vidéo et points clés (fs-video) · Vidéo verticale (fs-video) · Stories en cartes (cv-stories) |
| 9 | Comparatif | Tableau (comparison-table) · Cartes par colonne (comparison-table) |
| 10 | Résultats et preuves | Chiffres en grille (stats) · Chiffres en lignes (stats) · Mesures et sources (fs-results) · Avant / après (fs-results) |
| 11 | Avis et témoignages | Carrousel d'avis (cv-reviews) · Citation en carte (cv-quote) · Citation et visuel (cv-quote) · Citation en bandeau (cv-quote) |
| 12 | Presse et distinctions | Citations de presse (fs-press) · Bandeau de logos (fs-press) · Une citation à la une (fs-press) · Distinctions (fs-press) |
| 13 | Histoire de la marque | Récit et valeurs (about) · Grande déclaration (rich-text) · Image et texte (image-with-text) · Image et texte superposés (image-with-text) |
| 14 | Fabrication et savoir-faire | Étapes illustrées (fs-making) · Image fixe pendant le récit (fs-making) · Frise qui progresse (fs-making) · Cartes (fs-making) |
| 15 | Achat et offres | Produit et offres (featured-purchase) · Achat compact (featured-purchase) · Offres sur la fiche produit (purchase-offers) · Bandeau d'appel à l'achat (cta-banner) |
| 16 | Produits complémentaires | Recommandations automatiques (product-recommendations) · Sélection manuelle en grille (fs-products) · Sélection en carrousel (fs-products) |
| 17 | Garanties et livraison | Garantie mise en avant (cv-guarantee) · Engagements en grille (fs-commitments) · Liste détaillée (fs-commitments) |
| 18 | Questions fréquentes | Accordéons en cartes (faq) · Accordéons en lignes (faq) · Titre à côté (faq) · Numérotées (faq) |
| 19 | Newsletter | Inscription simple (newsletter) · Inscription avec visuel (newsletter-media) |
| 20 | Contact | Formulaire et coordonnées (contact-form) · Moyens de contact (fs-stores) |

En-têtes (5, hors des 20) : 1. Logo centré, recherche et panier · 2. Produit en avant dans le menu · 3. Bouton d'achat visible · 4. Barre flottante arrondie · 5. Deux rangées avec offre

Pieds de page (5, hors des 20) : 1. Colonnes d'aide et d'informations · 2. Centré avec lettre d'information · 3. Carte d'assistance · 4. Grand nom de marque · 5. Sobre

#### E-commerce — 20 fonctions, 64 dispositions

| N° | Fonction | Dispositions (section du thème) |
|---|---|---|
| 1 | Présentation principale | Promesse dans la scène (ed-opening) · Titre puis paysage (ed-opening) |
| 2 | Collections et catégories | Grille (fs-collections) · Une grande et des petites (fs-collections) · Carrousel (fs-collections) · Index avec aperçu (fs-collections) |
| 3 | Sélection de produits | Grille (fs-products) · Carrousel (fs-products) · Liste éditoriale (fs-products) · Recommandations (fiche produit) (product-recommendations) |
| 4 | Produit à la une | Galerie et achat (featured-purchase) · Achat compact (featured-purchase) · Offres sur la fiche produit (purchase-offers) |
| 5 | Ambiance et lookbook | Scène et repères produits (fs-lookbook) · Scène et liste des produits (fs-lookbook) · Scène et texte (ed-scene) · Panorama (ed-scene) |
| 6 | Matières et finitions | Bande des finitions (ed-finishes) · Finitions en situation (ed-finishes) |
| 7 | Dimensions et proportions | Dessin coté (fs-dimensions) · Photo et cotes (fs-dimensions) · Tableau des formats (fs-dimensions) |
| 8 | Usages et installation | Deux usages côte à côte (ed-diptych) · Diptyque décalé (ed-diptych) · Index d'usages (ed-diptych) |
| 9 | Entretien et durabilité | Conseils en liste (fs-care) · À faire / à éviter (fs-care) · Cartes (fs-care) · Accordéons (fs-care) |
| 10 | Comparatif de références | Tableau (comparison-table) · Cartes par modèle (comparison-table) |
| 11 | Campagne commerciale | Visuel et conditions (fs-campaign) · Plein cadre (fs-campaign) · Carte (fs-campaign) · Bandeau d'appel (cta-banner) |
| 12 | Histoire de la maison | Phrase et repères (ed-statement) · Grande déclaration (rich-text) · Image et texte (image-with-text) |
| 13 | Fabrication et ateliers | Image fixe pendant le récit (fs-making) · Étapes illustrées (fs-making) · Frise qui progresse (fs-making) |
| 14 | Engagements de la marque | Grille (fs-commitments) · Liste numérotée (fs-commitments) · Image et engagements (fs-commitments) · Grille d'atouts (features-grid) |
| 15 | Avis clients | Mur d'avis (fs-reviews) · Carrousel (fs-reviews) · Un avis à la une (fs-reviews) |
| 16 | Presse et distinctions | Citations de presse (fs-press) · Bandeau de logos (fs-press) · Une citation à la une (fs-press) · Distinctions (fs-press) |
| 17 | Journal et inspirations | Un article à la une et une liste (fs-journal) · Grille (fs-journal) · Liste (fs-journal) |
| 18 | Informations d'achat et FAQ | Titre à côté (v2-faq) · Centré (v2-faq) · Accordéons en cartes (faq) · Accordéons en lignes (faq) |
| 19 | Newsletter | Inscription simple (newsletter) · Inscription avec visuel (newsletter-media) |
| 20 | Contact et points de vente | Formulaire et image (ed-contact) · Formulaire et coordonnées (contact-form) · Points de vente (fs-stores) |

En-têtes (5, hors des 20) : 1. Logo à gauche, catalogue en tiroir · 2. Méga menu en colonnes · 3. Collections en cartes · 4. Logo centré, menu à gauche · 5. Boutique éditoriale

Pieds de page (5, hors des 20) : 1. Sobre avec plan du catalogue · 2. Plan du catalogue en colonnes · 3. Boutique éditoriale · 4. Encadré · 5. Empilé

#### Prestations de services — 20 fonctions, 57 dispositions

| N° | Fonction | Dispositions (section du thème) |
|---|---|---|
| 1 | Présentation de l'activité | Titre puis paysage (ed-opening) · Promesse dans la scène (ed-opening) |
| 2 | Prestations proposées | Liste (services-list) · Cartes (services-list) |
| 3 | Détail d'une prestation | Résumé fixe et détail (fs-service) · Détail empilé (fs-service) · Inclus / livrables en colonnes (fs-service) |
| 4 | Besoins accompagnés | Cartes (fs-needs) · Liste (fs-needs) · Accordéons (fs-needs) · Scène et texte (ed-scene) |
| 5 | Réalisations | Éditorial (portfolio) · Grille (portfolio) |
| 6 | Étude de cas | Image fixe pendant le récit (fs-case) · Quatre colonnes (fs-case) · Récit empilé (fs-case) |
| 7 | Avant / après | Curseur (ed-study) · Vues juxtaposées (ed-study) |
| 8 | Méthode de travail | Frise (timeline) · Étapes horizontales (how-to) · Étapes verticales (how-to) · Chapitres illustrés (ref-narrative) |
| 9 | Engagements de service | Grille (fs-commitments) · Liste numérotée (fs-commitments) · Image et engagements (fs-commitments) |
| 10 | Équipe et expertises | Cartes (team) · Portraits (team) · Liste sobre (team) |
| 11 | Histoire de l'entreprise | Récit et valeurs (about) · Phrase et repères (ed-statement) · Grande déclaration (rich-text) |
| 12 | Qualifications et assurances | Liste détaillée (fs-credentials) · Cartes (fs-credentials) · Tableau (fs-credentials) |
| 13 | Moyens et équipements | Grille (fs-equipment) · Liste (fs-equipment) · Image et liste (fs-equipment) |
| 14 | Témoignages clients | Avis en cartes (testimonials) · Carrousel (fs-reviews) · Un témoignage à la une (fs-reviews) |
| 15 | Références professionnelles | Logos par rôle (fs-references) · Liste avec rôles (fs-references) · Bandeau défilant (fs-references) |
| 16 | Tarifs et formules | Formules en cartes (pricing) |
| 17 | Zone d'intervention et accès | Informations pratiques (practical-info) · Avec carte (practical-info) |
| 18 | Questions fréquentes | Accordéons en lignes (faq) · Accordéons en cartes (faq) · Titre à côté (faq) |
| 19 | Conseils et actualités | Un article à la une et une liste (fs-journal) · Grille (fs-journal) · Liste (fs-journal) |
| 20 | Contact et prise de rendez-vous | Formulaire et coordonnées (contact-form) · Demande de rendez-vous (booking) · Calendrier de réservation (booking-calendar) · Formulaire et image (ed-contact) · Bandeau d'appel (cta-banner) |

En-têtes (5, hors des 20) : 1. Logo à gauche et bouton de contact · 2. Téléphone en évidence · 3. Prise de rendez-vous · 4. Menu des prestations · 5. Studio flottant

Pieds de page (5, hors des 20) : 1. Marque et coordonnées · 2. Coordonnées en avant · 3. Studio · 4. Centré · 5. Carte de contact

## Version testée

VERSION
