# TABLE SAISON — réalisation fidèle du thème restaurant

Consigne de Thomas, 23 octobre 2026. Dépôt : spacedevelopment01-max/Ecom-studio-ia. Mission distincte de Maison & Horizon et des autres thèmes en cours.

## Résultat attendu

Créer le thème restaurant TABLE SAISON dans la famille Services du studio, avec sa démonstration complète, toutes les pages et les interactions des cinq planches. Reproduire leur composition à l'identique aussi fidèlement que le permet une interface responsive : ce ne sont pas de simples inspirations. Ne pas livrer seulement une page d'accueil ou une image statique de site.

Ouvrir et examiner visuellement les cinq fichiers de `maquettes/`, ainsi que les photographies HD remises par Thomas dans les ZIP. Le texte de ce brief complète les maquettes ; il ne les remplace pas. Les cinq planches contiennent plusieurs écrans, dont des versions mobiles et des états de réservation.

Si disponible dans l'environnement, utiliser Claude Opus avec effort élevé ; indiquer le modèle réellement utilisé sans prétendre avoir changé un réglage inaccessible.

## Travail isolé

Lire les instructions du dépôt et les consignes de coordination actuelles. Partir du main actuel dans un dossier/worktree isolé, branche dédiée `claude/theme-table-saison`. La branche `brief/table-saison-20261023` contient les références, pas une implémentation à déployer. Récupérer son dossier `docs/briefs/table-saison/` sans écraser les travaux des autres conversations.

Préserver Maison & Horizon, Atelier Rive et tous les autres thèmes. Ne pas modifier leur apparence, leurs démonstrations, leurs données ni les pages commerciales du studio. Limiter les changements communs à l'enregistrement nécessaire du nouveau thème et aux extensions réellement indispensables ; documenter ces fichiers pour la coordination. Ne pas fusionner ni déployer automatiquement.

## Sources et médias

Les cinq PNG sont les planches originales aux dimensions d'origine. Les images photographiques sont fournies séparément par Thomas : 61 fichiers JPEG propres, recréés par IA à partir des scènes des maquettes, sans interface incrustée. Ce ne sont pas des originaux photographiques retrouvés ni des agrandissements de minuscules extraits. Les petites différences photographiques doivent être reconnues ; l'objectif d'identité concerne la composition et le rendu de l'interface avec ces médias de référence.

Décompresser tous les ZIP dans un même dossier. Lire `MEDIAS.csv` et `MEDIAS.json` : noms exacts, planche source, rectangle de référence, dimensions réelles et empreinte SHA-256. Vérifier que les 61 fichiers sont présents avant de déclarer le kit intégré. Les rectangles servent à repérer la scène sur une planche ; ils ne sont pas des fichiers à découper pour le site. Les reprises d'une même scène sur mobile et sur plusieurs pages réutilisent le média correspondant (voir `REUTILISATIONS.md`).

Ne pas remplacer ces images par des photos génériques, des captures de maquette, des dégradés ou des espaces vides. Si un fichier manque, le nommer précisément et poursuivre les tâches indépendantes. Ne pas générer de nouveaux médias payants. Intégrer les images dans le système de médias existant, conserver leur rapport naturel et régler chaque cadrage CSS selon la maquette. Préparer des variantes responsive WebP/AVIF si le pipeline le permet, sans dégrader les sources. Le logo typographique, les branches botaniques et les icônes sont des éléments texte/SVG/CSS éditables, pas des captures floues. Le plan de contact doit être un vrai plan relié à l'adresse configurée ou une illustration explicitement de démonstration.

## Direction visuelle

Ambiance bistrot français chaleureux : fond ivoire, boutons et pied de page bordeaux, sections secondaires olive, typographie serif élégante pour les grands titres, sans-serif discrète pour le courant, photos ambrées, nappes en lin, bois foncé et banquettes bordeaux. Relever les couleurs et proportions dans les planches, ne pas appliquer le style d'un autre thème.

Respecter l'ordre, les hauteurs relatives, espaces, alignements, grilles, largeur des textes, tailles des titres, bordures, rayons et cadrages. Harmoniser la marque en TABLE SAISON ; corriger uniquement les coquilles ou textes illisibles de génération, sans changer le sens ni inventer des informations réelles. Ne pas intégrer les cadres de navigateur/téléphone des planches dans le site.

En-tête : La carte, Le lieu, Galerie, Contact et Réserver une table. Menu mobile opérationnel et barre de réservation mobile fixe selon la référence, avec place réservée pour ne pas masquer le contenu. Tous les liens du pied doivent aboutir. Les pages sans variante mobile dessinée doivent garder la même identité dans une adaptation cohérente, sans débordement horizontal.

## Inventaire des écrans et interactions

| Planche | Écrans et contenu obligatoires |
|---|---|
| [01](maquettes/01.png) | Accueil intégral ordinateur + téléphone |
| [02](maquettes/02.png) | La carte, Au fil des saisons, Vos grandes tablées, carte mobile |
| [03](maquettes/03.png) | Réservation étapes 1/2/3, confirmation, créneau indisponible, deux vues mobiles |
| [04](maquettes/04.png) | Le lieu, Galerie, Contact, Questions fréquentes |
| [05](maquettes/05.png) | Retrouver une réservation, détail, modification/annulation, confirmation groupe, pages légales/cookies, 404 |

### Accueil

Grande ouverture photographique et accroche « Le goût des bonnes choses. Le plaisir d'être ensemble. », deux CTA réserver/découvrir la carte. Section philosophie « Une cuisine de saison, une table qui rassemble. ». Trois plats : risotto aux champignons, poisson rôti et légumes, tarte aux pommes. Section olive « Une carte qui évolue au fil des saisons » avec Entrées/Plats/Desserts. Présentation du lieu, quatre ingrédients (artichauts, carottes, girolles, herbes), déjeuner/dîner, bandeau grandes tablées, FAQ accordéon, dernier appel à réserver et pied bordeaux complet. Sur mobile, respecter notamment la photo puis le bloc sombre de l'ouverture et les cartes empilées.

### Carte, saisons, groupes

Carte avec photo de velouté, onglets/ancres Entrées, Plats, Desserts, Boissons et listes lisibles. Données de démonstration cohérentes avec la maquette : velouté 9 €, betteraves/chèvre 11 €, risotto 22 €, poisson 26 €, volaille/grenailles 24 €, tarte 9 €, mousse chocolat 8 €, eau pétillante 4 €, espresso 3 €. Descriptions, indication végétarienne et note allergènes configurables. Ces prix sont des exemples, jamais des faits imposés à un autre restaurant.

Page saisons : salle en ouverture, sélection saisonnière de trois plats, citation éditoriale, deux CTA et photo de salle. Page groupes : grande table en ouverture, cartes Repas de groupe/Événement privé, formulaire date, nombre de personnes, email et message, état d'envoi et confirmation. Ne pas afficher une demande envoyée si aucun service n'a effectivement reçu la demande ; la démo indique clairement la simulation.

### Réservation complète

1. Personnes (1 à 8 dans la démo), calendrier, date et récapitulatif avec photo ; validation et bouton continuer.
2. Créneaux déjeuner 12:00/12:30/13:00 et dîner 19:00/19:30/20:00/20:30 dans les fixtures ; sélection, retour et modification des choix précédents sans perdre les données.
3. Prénom, nom et email requis ; téléphone et remarque facultatifs ; consentement newsletter séparé et facultatif ; conditions de réservation requises. Récapitulatif et confirmation protégée contre les doubles clics.
4. Confirmation avec numéro, date, heure, personnes, état réel de l'email, ajout au calendrier ICS, gérer ma réservation et plan.
5. Indisponibilité : expliquer le conflit, proposer des horaires disponibles, conserver les informations et permettre de revenir ou changer de créneau.

Les dates imprimées dans les maquettes sont illustratives. Calculer les dates possibles, interdire les dates passées et respecter le fuseau horaire du restaurant, fermetures, services et capacité configurée.

La démo doit être entièrement navigable avec des fixtures déterministes et afficher « Démonstration : aucune réservation réelle ». Aucun message prétendant qu'un email réel a été envoyé dans ce mode. Pour la production, auditer le backend existant puis brancher une persistance durable et isolée par établissement, une vérification atomique de disponibilité, la gestion des doublons, modifications et annulations. Ne pas remplacer silencieusement le parcours par un lien externe. Si l'architecture d'export ne peut pas exécuter le service, livrer l'interface complète et documenter exactement le raccordement nécessaire ; ne pas déclarer opérationnelle une réservation purement locale.

### Lieu, galerie, contact, FAQ

Le lieu : grande photo, « Une table où l'on aime rester », présentation de cuisine, photos table/cuisine, panneau bordeaux d'hospitalité, triptyque figues/fleurs/banquette. Galerie : grille asymétrique, filtres Tout/Le lieu/Dans l'assiette/Les détails, lightbox avec précédent/suivant, clavier, Échap, fermeture tactile et gestion du focus.

Contact : « Nous rendre visite », terrasse/façade, adresse, horaires, téléphone, email, carte et accès voiture/transports/vélo, formulaire nom/email/sujet/message. Les coordonnées des planches sont des valeurs de démonstration à rendre éditables. Aucune coordonnée fictive ne doit être présentée comme celle d'un établissement réel.

FAQ : catégories Réservations/La carte/Votre visite, toutes les questions visibles dans la planche, accordéons accessibles, CTA contact et photo finale.

### Gestion, pages légales et erreurs

Retrouver une réservation par email : conserver l'apparence prévue mais protéger l'accès réel par un lien sécurisé ou jeton de réservation. Ne jamais exposer les réservations d'autrui avec leur seul email. Réponse publique neutre. Dans la démo, utiliser une réservation fictive identifiée comme telle.

Détail : email masqué, statut, date/heure/personnes, préférences éventuelles, adresse, modifier et annuler. Modification : personnes/date/créneau et récapitulatif, vérifier de nouveau la disponibilité. Annulation : dialogue de confirmation, retour sans changement ou annulation effective, état final clair. Une réservation annulée ne doit plus apparaître active.

Confirmation de demande groupe distincte d'une réservation confirmée. Pages Mentions légales, Confidentialité, Conditions de réservation et Cookies avec champs configurables ; pas de société, numéro d'immatriculation ou promesse juridique inventés. Bandeau cookies accepter/refuser/personnaliser, choix persisté et traceurs facultatifs désactivés avant consentement. Page 404 avec assiette vide et « Cette page n'est pas à la carte », liens accueil/carte.

## Intégration au studio et adaptation client

Utiliser le moteur de thème, l'édition, la sauvegarde et les exports du dépôt. Ajouter une démo complète consultable avant de choisir le thème ; la consulter ne modifie jamais un projet. Le choix ne crée qu'une seule opération même en double clic.

Rendre éditables les sections, textes, couleurs, typographies, photographies, catégories/plats/prix/descriptions, drapeaux végétariens, carte saisonnière, galerie, FAQ, coordonnées, horaires/fermetures, capacité et paramètres de réservation. Préserver les possibilités existantes de déplacement, duplication, masquage et restauration des sections. Tester l'enregistrement puis le rechargement.

L'application du thème à un autre restaurant reprend les contenus du client et la composition du thème. Ne pas copier les plats, prix, photos, coordonnées ou mentions de TABLE SAISON dans le site réel à son insu. Expliquer les informations à compléter sans détruire les données existantes. Les images fournies servent à la démonstration de référence et aux usages explicitement choisis par Thomas.

## Vérification et livraison

Faire une matrice exhaustive planche/écran/état → route → implémentation → capture → éventuel écart. Comparer réellement les captures aux références, au minimum ordinateur 1440 px et téléphone 390 px ; contrôler également 360 et 430 px. Photographier tous les états de réservation, pas seulement l'accueil. Vérifier les cadrages, l'ordre des sections, les titres, le pied, les menus, la barre fixe et l'absence de visuels manquants.

Tester navigation, filtres, lightbox, accordéons, erreurs et validations de formulaires, calendrier, retours entre étapes, créneau devenu indisponible, confirmation, double soumission, modification, annulation, récupération sécurisée, consentement et absence de débordement. Tester les composants communs modifiés pour prévenir les régressions d'autres thèmes. Exécuter les contrôles imposés par le dépôt (types, tests ciblés, build et contrôles d'export pertinents). Les résultats CI ne remplacent pas la comparaison visuelle.

Livrer une PR dédiée avec commit exact, captures et comparaisons, matrice complète, résultats des contrôles et limites factuelles. Fournir un petit mode d'emploi pour changer un plat, une photo, les horaires et gérer une réservation. Distinguer ce qui fonctionne en démo, en site réel et selon chaque export. Ne pas dire « identique » ou « terminé » s'il reste des écarts non listés. Aucun déploiement, fusion, notification à de vrais clients ou appel IA payant pour les essais.
