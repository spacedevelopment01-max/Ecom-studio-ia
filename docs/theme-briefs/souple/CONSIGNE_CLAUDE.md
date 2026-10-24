# Claude — SOUPLE : reproduire les six maquettes complètes

## Mission demandée par Thomas — 24 octobre 2026

Reprendre le thème **SOUPLE**, boutique de yoga et Pilates à **quatre produits**, dans E-COM STUDIO IA. Thomas veut le rendu des six maquettes, avec toutes leurs pages et fonctions, ordinateur et téléphone. Il ne demande pas une nouvelle direction artistique ni un simple changement de couleurs.

**Classement ferme : famille E-commerce**, identifiant `souple`, catégorie et mécanismes existants de cette famille. Ne pas classer SOUPLE dans les services ni dans Boutique spécialisée. Les quatre produits de la démo sont le tapis rose poudré à sous-face prune, la brique de liège, la sangle prune à anneaux argentés et l’anneau Pilates prune à coussinets mauves. Cette collection de démo n’est pas une limite de quatre produits imposée aux boutiques clientes.

Lire `CLAUDE.md`, les instructions applicables et l’état actuel des travaux avant de modifier le code. Utiliser le modèle convenu avec Thomas, avec un effort élevé si disponible ; annoncer le réglage réel. Ouvrir réellement les six planches ci-dessous : ce sont des images composites représentant plusieurs pages et états, pas seulement six pages.

## Six maquettes originales publiées dans ce dossier

| Planche | Fichier | Écrans et usages |
| --- | --- | --- |
| 01 | [Accueil](maquettes/01-accueil.png) | Accueil riche complet, ordinateur et téléphone |
| 02 | [Tapis et brique](maquettes/02-fiches-tapis-brique.png) | Deux fiches détaillées, galeries, matières, usages, produits associés, mobile |
| 03 | [Sangle et anneau](maquettes/03-fiches-sangle-anneau.png) | Deux autres fiches détaillées et version mobile |
| 04 | [Boutique, panier et commande](maquettes/04-boutique-panier-commande.png) | Catalogue, panier rempli/vide, commande, confirmation, mobile |
| 05 | [Approche, journal, guide et aide](maquettes/05-approche-journal-guide-aide.png) | Marque, journal, article, guide comparatif, FAQ et contact |
| 06 | [Compte, livraison et légal](maquettes/06-compte-livraison-legales.png) | Connexion/inscription, compte, commande/suivi, mot de passe, livraison/retours, légal, cookies et 404 |

Les photos sont transmises par Thomas dans plusieurs **ZIP indépendants de moins de 30 000 000 octets chacun**. Extraire les ZIP dans un même répertoire pour réunir `SOUPLE_DOSSIER/` et son catalogue. Ne pas attendre un ZIP unique de plus de 30 Mo. Les maquettes sont aussi disponibles directement dans GitHub ; leur consultation ne dépend pas de la réception des ZIP.

Le dossier de production réunit **59 visuels : 31 médias existants, dont le logo et vingt vues produit, plus 28 photos complémentaires** recréées pour les scènes des nouvelles maquettes. Voir `INVENTAIRE_IMAGES.csv`, `AFFECTATIONS.csv`, `CATALOGUE.html` et les informations de provenance. Les vues existantes proviennent du kit antérieur conservé ; les compléments sont des reconstitutions guidées par les planches, pas les photographies sources exactes de celles-ci. Ne pas annoncer une reproduction photographique identique au pixel près ou une résolution 4K non constatée.

Les 31 médias déjà présents dans `public/theme-assets/souple/` peuvent servir de source existante, mais les nouveaux compléments et les six maquettes font partie intégrante de cette reprise. Le seul kit du 21 octobre ne couvre pas toutes les nouvelles scènes. Ne pas utiliser les anciens aperçus du site comme référence à la place des six planches du 23 octobre.

## Identité et fidélité visuelle

- Prune profond, ivoire chaud, rose poudré et liège ; grands titres serif fins, textes sobres, courbes légères et lumière naturelle. L’accueil 01 sert de référence principale pour le logo et la cohésion.
- Reprendre l’ordre, la densité et les proportions de chaque section : grande ouverture de collection, quatre cartes produit, panneaux photo/texte, matière en gros plan, produits associés, univers, journal, FAQ, newsletter et pieds de page. Conserver le contenu situé sous la première hauteur d’écran.
- Respecter le pied clair des fiches quand il est montré et le pied prune des autres pages ; partager les données de navigation sans imposer une composition identique partout. Conserver les particularités de chaque page.
- Recréer les composants, textes, boutons, courbes et pictogrammes en éléments éditables. Aucune capture de page entière en guise de site. Pas de texte ou bouton incrusté dans les photos livrées.
- Employer le logo existant, sans nouveau symbole ni nom. Les images dont les anciens noms mentionnent « ivoire » peuvent montrer des produits rose/prune : les pixels, l’inventaire et les modèles de référence priment sur les noms historiques.
- Ne jamais remplacer l’anneau prune/mauve par l’ancien anneau clair exclu, ni recolorer le tapis ou la sangle. Ne pas créer de cinquième produit à partir du coffret ou du sac photographié. Une photo de deux briques représente une mise en scène, pas automatiquement un lot commercial de deux.
- Utiliser volontairement chaque média et chaque cadrage. Les grands produits restent entiers dans les images principales ; une macro sert à montrer une matière. Pas d’étirement ni de répétition de la même photo dans tous les blocs. Les réemplois cohérents entre une fiche et ses cartes sont normaux et doivent rester identifiables.
- Corriger les coquilles/artefacts de génération en conservant le sens des textes, sans remplacer l’ensemble par un discours générique. Les informations techniques inconnues restent « À confirmer ».

## Pages et fonctions à réaliser

### Accueil — planche 01

En-tête et navigation, recherche, compte et panier ; grande photo des quatre produits et titre « Du mouvement. À votre rythme. » ; quatre essentiels ; espace pour revenir à soi ; mise en avant du tapis et ses trois détails ; collection ; trois univers ; bandeau de marque ; journal ; FAQ ; newsletter ; pied complet. Reprendre la réorganisation mobile et ses recadrages. Les liens vers une catégorie, un produit, un guide ou l’approche ont une destination pertinente et fonctionnelle.

### Boutique et navigation — planche 04

Catalogue des quatre références, filtres Tous (4), Tapis (1), Accessoires (3), tri et état sans résultat. Les compteurs découlent des données, pas d’une valeur figée incompatible avec une vraie boutique cliente. Recherche utilisable depuis les en-têtes, avec résultats et état vide ; menu mobile, liens et retour de navigation cohérents.

### Quatre fiches produit — planches 02 et 03

Quatre pages distinctes avec leur galerie et leurs photos propres, navigation par miniatures/flèches, zoom utilisable, titre, prix, quantité et ajout au panier. Présenter déroulé, scène de pratique, détails de matière, informations, FAQ et les trois vrais accessoires complémentaires. Les fiches tapis/brique et sangle/anneau gardent leurs compositions respectives, pas un gabarit appauvri commun.

Chaque ajout depuis la fiche, une carte ou la barre mobile ajoute le bon identifiant et la bonne quantité. Les produits associés pointent vers les bonnes fiches ou ajoutent effectivement le bon article selon le bouton. Ne pas mélanger la galerie d’une brique avec celle du tapis. Le compteur de galerie reflète les vrais médias ; ne pas multiplier artificiellement une même image pour simuler des vues supplémentaires.

### Panier, commande et confirmation — planche 04

Panier rempli et vide, compteur, quantités, suppression, sous-total recalculé, conservation au rechargement et recommandations pertinentes. Les prix de démo montrés sont **59 € tapis, 19 € brique, 15 € sangle et 29 € anneau** : 1 tapis + 1 brique = **78 € de sous-total**. Centraliser ces valeurs et les étiqueter comme prix de démonstration.

Livraison non renseignée = « Calculée à l’étape suivante ». Ne pas afficher 78 € comme montant final tout compris alors que les frais/taxes applicables ne sont pas déterminés. Ne pas inventer livraison gratuite, remise ou code promotionnel.

Reconstituer les étapes Contact → Adresse → Livraison → Paiement/validation selon la plateforme réellement prise en charge, avec retour sans perte de données, validation des champs et récapitulatif exact. La case newsletter est facultative et décochée, même si une maquette générée la montre cochée.

En démonstration, le parcours doit rester testable avec des données fictives et une mention de simulation : aucun débit, aucune collecte de carte réelle, aucun e-mail ou colis prétendument envoyé. La confirmation est une confirmation d’exemple. Pour une boutique réelle, utiliser le checkout et les comptes réellement fournis par la plateforme ; préciser les limites de personnalisation, notamment du checkout Shopify. Ne pas promettre qu’un export statique traite un paiement. Aucun nouveau prestataire payant n’est autorisé ici.

### Approche, journal et guide — planche 05

Approche de marque « Moins de pression. Plus de mouvement. », photo de collection, trois principes et liens cohérents. Ne pas inventer une histoire de fondateur, un lieu de fabrication ou une certification pour remplir la page.

Journal : catégories, article vedette, grille, navigation et filtres fonctionnels. Chaque article visible a une page propre avec contenu complet, photo, hiérarchie, conseils et liens associés. Reprendre le modèle « Créer un coin pour bouger chez soi » ; les autres sont des déclinaisons éditoriales, pas des maquettes supplémentaires prétendument retrouvées.

Guide : présentation des quatre produits, leurs rôles, comparatif et boutons vers les bonnes références. Ne pas convertir une intuition de démo en caractéristique technique ou bénéfice thérapeutique établi.

### FAQ, contact, livraison et retours — planches 05 et 06

FAQ par catégories et accordéons, clavier/toucher, liens vers l’aide pertinente. Contact avec nom, e-mail, sujet, numéro de commande facultatif, message et consentement ; validation et messages d’erreur utiles. Coordonnées, livraison, retours, garanties et délais sont configurables et restent à confirmer quand inconnus.

Newsletter/contact : utiliser les intégrations existantes lorsqu’elles sont configurées ; afficher un succès uniquement après confirmation du service. Démo sans envoi réel, explicitement simulée. Ne pas transformer un simple toast en fausse fonction d’envoi.

### Compte client et commande — planche 06

Connexion, inscription, oubli/réinitialisation de mot de passe, tableau de bord, commandes, détail, adresses, informations personnelles et déconnexion selon les possibilités existantes de la plateforme. Suivi et facture cohérents avec les données réelles. Un exemple de facture doit être explicitement fictif, pas un document fiscal prétendument émis.

En démonstration, employer un compte fictif contrôlé et des commandes d’exemple, sans vraie inscription ni e-mail. En réel, réutiliser l’authentification de la plateforme et isoler les données par client ; localStorage ne constitue pas une authentification. Ne jamais exposer une commande par simple numéro prévisible ni inventer un statut de transport.

### Informations légales, cookies et 404 — planche 06

Mentions, CGV, confidentialité et cookies accessibles via les onglets/liens montrés. Garder les champs à compléter avant publication, sans inventer d’identité légale. Accepter/refuser/personnaliser les cookies, mémoriser et rouvrir les préférences ; aucun traceur facultatif avant accord. 404 avec vraie photo, forme organique S construite en SVG/CSS et retour utile à l’accueil.

## Mobile, studio et adaptation client

- Reprendre les vues mobiles des maquettes, adapter les autres avec le même niveau de finition. Tester 360, 390 et 430 px : premier écran lisible, produit/titre/action accessibles, menus/zoom/formulaires utilisables, aucun débordement horizontal.
- Barre d’achat : bon produit et prix, apparition cohérente au défilement, prise en compte du clavier, menu, cookies et safe-area ; elle ne masque ni texte, ni formulaire, ni pied. Réutiliser les corrections existantes sans casser les autres thèmes.
- Démo intégrale visitable avant choix explicite, sans mutation du projet ni appel IA. Après choix, conserver la composition et remplacer les données par les vrais produits, images, textes, logo et informations du client. Aucun résidu SOUPLE chez un autre client.
- Édition et sauvegarde réelles des sections, textes, médias, couleurs, produits et informations ; modification d’une photo, d’un prix et d’une disposition, duplication/déplacement de section, rechargement et exports doivent fonctionner.
- Respecter les règles existantes de forfaits, familles et exports. Ne pas changer facturation, droits, moteur IA ou sécurité globale dans cette mission. Hébergement natif des sites clients/domaines = V2, hors périmètre.

## Coordination et limites

Mission Claude thèmes. Lire l’état courant de #167, #158 et des missions récentes avant intervention. Préserver NOCTIL, MUSEAU CLUB, TRAVERSE, Atelier Rive, Parenthèse, Maison & Horizon et l’accueil commercial du studio.

La branche du brief ne contient que des documents et six images de référence. Récupérer seulement `docs/theme-briefs/souple/` dans une branche de développement fondée sur les travaux récents ; ne pas remplacer la branche de travail par cet ancien main. Ne pas faire travailler deux conversations simultanément sur les mêmes fichiers partagés. Déclarer et coordonner les dépendances avec Codex et les autres missions.

Aucun appel IA payant ou régénération de médias, aucune nouvelle personne, aucune banque d’images ou marque externe, aucune suppression de données, aucun paiement/envoi réel de test, aucune fusion ni aucun déploiement automatique. Les médias sont fournis. Les images de colis et de sac illustrent la démo, sans prouver une prestation de préparation/expédition réelle.

## Recette et livraison

1. Matrice exhaustive planche → écran/route → sections → fichiers image → actions → preuves/statuts. Inclure mobiles, états vides, erreurs et dialogues, pas seulement l’accueil.
2. Captures complètes de toutes les pages à 1440 et 390 px, contrôles 360/430 ; comparer côte à côte aux six originaux et corriger typographies, tailles, densité, espacements, couleurs et cadrages. Une CI verte ne valide pas le rendu.
3. Tester navigation, recherche/filtres/tri, galeries/zoom, quatre identifiants produit, ajouts directs/recommandés/barre mobile, quantités, suppression, calculs, persistance, commande simulée et confirmation, journal/guide, FAQ, formulaires, compte selon support, cookies et 404.
4. Tester sélection/édition/sauvegarde/rechargement dans le studio et exports supportés, sur un projet fictif distinct de SOUPLE. Décrire précisément les fonctions dépendant d’un backend ou de la plateforme.
5. Vérifier les médias décodables et les chemins locaux dans les exports. Fournir la matrice des 59 visuels utilisés ou non et justifier les réemplois/écarts. Ne pas utiliser une miniature de maquette comme photo HD.
6. Exécuter les contrôles requis et tests utiles du dépôt, fournir PR/SHA, captures, résultats réels et limites. Distinguer livré sur branche, fusionné et version réellement servie dans le studio.
7. Expliquer simplement à Thomas comment modifier les produits et les contenus. Ne pas annoncer de fidélité parfaite si des différences subsistent. La validation visuelle lui revient.

Poursuivre jusqu’à un résultat complet et révisable ; signaler précisément les éléments manquants sans bloquer les parties indépendantes ni remplacer silencieusement les compositions.
