# ATELIER NUANCE — thème salon de coiffure, reproduction des maquettes

Consigne de Thomas, 23 octobre 2026. Dépôt `spacedevelopment01-max/Ecom-studio-ia`. Mission destinée à la **première conversation Claude, après avoir terminé et livré proprement son travail actuel**. Ce dossier est une nouvelle mission autonome, pas une modification des thèmes déjà en cours.

## Résultat attendu et organisation

Créer ATELIER NUANCE, thème de la famille Services, avec démonstration intégrale et contenu éditable dans le studio. Thomas veut retrouver à l'identique le design des maquettes, avec toutes leurs pages, variantes mobiles et fonctionnalités. Ne pas livrer une simple inspiration, une page unique ou une capture de site. Observer les six planches en image avant de coder et comparer les rendus à ces références jusqu'à corriger les écarts.

Finir et sécuriser la mission précédente (commit, PR, rapport de ce qui reste), puis repartir du main actuel dans un worktree/dossier isolé, branche `claude/theme-atelier-nuance`. Lire les instructions applicables du dépôt et sa coordination actuelle. Récupérer uniquement `docs/briefs/atelier-nuance/` sur `brief/atelier-nuance-20261023` pour les références. Ne pas écraser, fusionner ou réinitialiser les branches d'autres conversations. Préserver TABLE SAISON, Maison & Horizon et tous les autres thèmes et démonstrations.

Utiliser Opus avec effort élevé si disponible, sans prétendre changer un réglage inaccessible. Expliquer les seuls blocages réels et poursuivre le travail indépendant. Livrer une PR dédiée sans fusion ni déploiement automatique.

## Références et arbitrage des variantes

| Fichier | Contenu | Statut |
|---|---|---|
| `maquettes/01.png` | Prestations, fiche Coupe & brushing et deux vues mobiles | Première variante, conservée pour référence ; comporte photos de longueurs et coordonnées d'exemple |
| `maquettes/02.png` | Prise de rendez-vous : prestation, professionnel, créneau, coordonnées, confirmation et mobile | Référence du parcours complet |
| `maquettes/03.png` | Le salon, Inspirations, Journal/article, Contact | Référence des pages secondaires |
| `maquettes/04.png` | Accueil intégral ordinateur et téléphone | Référence de l'accueil et de l'identité principale |
| `maquettes/05.png` | Prestations et fiche corrigées, tarifs de démonstration, pictogrammes des longueurs et coordonnées à renseigner | **Version principale pour prestations/fiche**, prioritaire sur 01 |
| `maquettes/06.png` | Retrouver un RDV, espace client, déplacement/annulation, FAQ, informations légales, créneau indisponible/cookies | Référence de gestion et des états complémentaires |

Les six PNG originaux sont dans les ZIP. GitHub fournit six copies JPEG de même numérotation, qualité 95 sans redimensionnement, dans maquettes/01.jpg à 06.jpg. Ne pas traiter les variantes 01 et 05 comme deux pages distinctes. Reprendre la structure, les images communes et proportions de 05 ; les trois photos de longueurs de 01 sont aussi fournies comme variante disponible, mais ne doivent pas remplacer par défaut les pictogrammes de 05. L'identité ATELIER NUANCE et la palette sont communes à toutes les pages.

Certaines données diffèrent entre la planche de réservation 02 et les pages tarifaires 04/05. Créer une source unique de prestations ; garder les noms/prix/durées de 05 et les prestations phares cohérentes avec 04. Ne pas afficher 75 € pour une coloration annoncée à 85 €, ou 95 € pour un balayage annoncé à partir de 120 €. Les dates de novembre 2026 sont des exemples ; la date réellement sélectionnable doit dépendre du calendrier et du fuseau du salon. Les coquilles, doublons d'horaires, textes illisibles et ©2024 ne doivent pas devenir des erreurs fonctionnelles : corriger la langue, les valeurs incohérentes et utiliser l'année courante sans changer le design.

## Kit images et fidélité

Thomas fournit séparément les ZIP de moins de 29 Mo contenant **59 photographies HD recréées par IA d'après les scènes des maquettes**. Décompresser toutes les parties dans le même dossier. Lire `MEDIAS.json`, `MEDIAS.csv` et `REUTILISATIONS.md` : chaque fichier est associé à une planche, à un rectangle de repérage, à sa définition native et à son empreinte SHA-256. Vérifier la présence et l'intégrité de tous les fichiers avant de déclarer le kit intégré.

Ces images sont des recréations nettes, pas des originaux photographiques retrouvés ni de petits extraits agrandis. La photographie peut comporter des différences fines ; ne pas prétendre à une identité photographique parfaite. La composition de l'interface, les proportions et le cadrage doivent reproduire les références en utilisant ce kit. Ne pas substituer des photos génériques, des captures, des dégradés ou des images d'autres thèmes.

Les rectangles du manifeste servent à localiser la scène sur la planche, pas à extraire une vignette à afficher dans le site. Garder les sources HD et créer les variantes responsive utiles via le pipeline existant, avec `object-position` adapté par emplacement. Les textes, boutons, radios, calendriers, initiales de l'équipe, logo, icônes et pictogrammes de longueur se reconstruisent en composants texte/SVG/CSS nets et éditables. Ne pas les cuire dans les images. Le plan de contact doit correspondre à l'adresse configurée ou être explicitement illustratif dans la démo.

## Direction visuelle et comportement responsive

Salon premium chaleureux : ivoire, beige pierre et travertin, brun chocolat pour les aplats et pieds de page, pêche/terracotta pour les CTA, miroirs arrondis dorés et fauteuils cognac. Grandes fontes serif élégantes, texte courant sobre, espaces généreux et filets fins. Relever les couleurs, tailles, alignements et proportions sur les planches, sans imposer un style générique.

Préserver l'ordre des sections, leur densité, les grilles, les rapports photo/texte, la hiérarchie des CTA, les marges et les transitions de fond. Reproduire la navigation Le salon / Prestations & tarifs / Inspirations / Contact et Prendre rendez-vous. Donner accès au Journal, à la FAQ et aux pages légales depuis les emplacements appropriés. En mobile : menu fonctionnel, cartes/lists compactes comme dessinées, carrousel des détails, barre fixe Prendre rendez-vous avec espace réservé en bas. Aucun débordement, texte coupé ou bouton masqué par le clavier/barre fixe.

## Pages et fonctions obligatoires

### 1. Accueil — planche 04

Hero photo du salon avec « Une nouvelle coupe. Une nouvelle énergie. », sous-titre, CTA Réserver mon rendez-vous et Voir les prestations. Trois catégories Coupe & coiffage / Couleur & lumière / Soin & rituel avec leurs photographies et liens. Section Le salon « Un temps pour vous. » en split texte/photo. Trois prestations phares : Coupe & brushing 45 € / 45 min, Coloration & coiffage 85 € / 1 h 45, Brushing 30 € / 30 min. Prix et disponibilités explicitement de démonstration.

Bandeau chocolat « Votre rendez-vous, simplement. » avec trois explications du parcours et CTA ; galerie de cinq détails du lieu (carrousel mobile) ; équipe Camille/Alex/Sarah avec initiales, spécialités et contenu éditable ; quatre FAQ en accordéons ; carte « Besoin d'un conseil ? » ; bandeau pêche final ; pied de page complet avec navigation, horaires, contact, réseaux et légal. Ne pas inventer de vrais avis, résultats ou coordonnées.

### 2. Prestations et fiche — planche 05 prioritaire

Hero Prestations & tarifs, filtres Coupe / Couleur / Coiffage / Soins, lignes photographiques avec description, durée, prix et bouton Réserver. Réservation préremplie avec la prestation choisie. Dans la démo : Coupe & brushing 45 min / 45 €, Brushing 30 min / 30 €, Coloration & coiffage 1 h 45 / 85 €, Balayage & coiffage 2 h 30 / à partir de 120 €, Soin & coiffage 1 h / 50 €. La valeur « à partir de » reste explicite ; un tarif final dépendant d'options doit être calculé à partir de données définies, jamais inventé.

Fiche Coupe & brushing : split texte/photo, durée/prix/CTA, trois étapes Consultation/Coupe/Coiffage, choix de longueur courts/mi-longs/longs avec pictogrammes, bloc de tarif et durée qui suit le choix, contenu inclus, préparation de la visite, FAQ, bandeau photo « Un moment pour vous ». Les autres prestations ont une fiche cohérente utilisant le même modèle éditable, avec leurs contenus propres, pas le texte Coupe & brushing recopié. La démo peut conserver des variantes de longueur de même prix lorsque aucun supplément n'est défini, en le disant honnêtement.

### 3. Prise de rendez-vous — planche 02

Indicateur de progression complet : Prestations → Avec qui ? → Créneau → Coordonnées → Confirmation.

1. Choix de prestation avec description, prix et durée ; état sélectionné, retour, continuer et photo verticale du salon. Une prestation venant de sa fiche est déjà sélectionnée.
2. Professionnel : Sans préférence, Camille (coupe/couleur), Alex (balayage/blond), Sarah (soin/mise en forme). Cartes à initiales et récapitulatif. Définir les compétences réellement configurées pour filtrer les choix sans laisser une réservation incompatible.
3. Calendrier mensuel navigable et créneaux du jour, récapitulatif prestation/personne/prix/durée. Désactiver dates passées, fermetures, jours complets et créneaux impossibles selon la durée et les disponibilités du professionnel. Gérer Sans préférence par attribution réelle d'un professionnel disponible.
4. Prénom, nom, email et téléphone requis selon la maquette, note facultative, newsletter facultative indépendante, acceptation des conditions requise. Récapitulatif et modifier. Conserver les champs et choix lors des retours ; afficher chargement/erreur et empêcher les doubles soumissions.
5. Confirmation avec référence, date, heure, prestation, durée, professionnel, prix, ajout calendrier ICS, Gérer mon rendez-vous, adresse et visuel. Le contenu de confirmation doit refléter l'état réel du service.

La **démo** est entièrement testable avec fixtures et porte « Simulation — aucun rendez-vous réel ». Aucun email réel, aucune notification à un client pour les essais. La **production** exige disponibilité vérifiée atomiquement, persistance durable par salon/projet et contrôle des collisions sur toute la durée du rendez-vous (pas seulement heure de début), pauses/fermetures et personnel. Réutiliser le backend existant s'il convient ; documenter et réaliser les extensions nécessaires. Ne pas remplacer silencieusement le parcours par un lien externe. Ne jamais déclarer opérationnelle une réservation stockée seulement dans le navigateur.

### 4. Le salon — planche 03, colonne 1

Hero Bienvenue à l'Atelier Nuance, présentation « Plus qu'un salon, une expérience sur mesure », trois cartes Un cadre apaisant / Des détails qui comptent / Une approche personnalisée ; section sombre Notre équipe avec initiales et textes, bandeau photo de réservation, pied. Aucun faux portrait d'employé : les maquettes utilisent des initiales.

### 5. Inspirations — planche 03, colonne 2

Hero de mèches, filtres Toutes / Coupe / Couleur / Soin, trois catégories comportant chacune trois photos, liens Voir plus et CTA final. Filtrer réellement les images ; ouverture en lightbox avec titre/texte éditable, précédent/suivant, fermeture, Échap, clavier et focus. Les scènes de cheveux sont des inspirations de démonstration, pas un portfolio prétendument réalisé par un vrai salon. Aucune promesse avant/après inventée.

### 6. Journal et article — planche 03, colonne 3

Hero « Des idées, des conseils et des inspirations. », article vedette Préparer votre prochaine visite, quatre cartes Les outils du quotidien / Les nuances de la saison / Le rituel soin en salon / L'art des détails. Chaque lien Lire l'article mène à un vrai contenu éditable. Reproduire le modèle détaillé visible en bas de la planche avec photo de brosses, titre, introduction et conseils numérotés. Conserver cette présentation sur la page Journal si la composition le requiert et donner une URL propre à chaque article. Ne pas laisser des liens factices.

### 7. Contact — planche 03, colonne 4

Hero Venez nous rencontrer, coordonnées et horaires à renseigner, formulaire sujet/nom/email/message, états valides/invalides/chargement/succès/erreur, plan illustratif et accès transports/voiture/à pied/parking. Aucun message envoyé sans réception effective par un service ; la simulation le dit. Téléphone/email/adresse/liens sociaux doivent provenir de la configuration. Ne pas présenter l'adresse d'exemple de 01 comme une vraie adresse. Bandeau photo final et pied.

### 8. Retrouver et gérer un rendez-vous — planche 06

Retrouver par référence + email avec formulaire sur photo de salon, ainsi que liens Se connecter/Créer un compte. Implémenter des destinations réelles utilisant l'authentification du projet ; ne pas inventer un compte connecté. La production protège les rendez-vous par référence non devinable, vérification email ou jeton sécurisé et limitation des essais ; pas d'accès par email seul ni fuite d'informations sur d'autres clients.

Espace client : Mes rendez-vous, Mes informations, Mes préférences, Se déconnecter. Rendez-vous à venir avec photo/récapitulatif et boutons Déplacer/Annuler ; rendez-vous passés avec état vide. Informations et préférences modifiables, sauvegarde et rechargement, séparation par utilisateur. Un espace de démo utilise uniquement des données fictives clairement identifiées.

Déplacer : rendez-vous actuel, nouveau calendrier/créneau, confirmation du changement et récapitulatif actualisé ; ne libérer l'ancien créneau qu'après réservation atomique du nouveau. Annuler : panneau de confirmation selon maquette, retour sans effet, confirmation explicite, état annulé. Conditions configurables ; ne pas inventer de politique d'acompte ou pénalité.

Conflit « Ce créneau vient d'être réservé » : conserver la saisie, présenter de vrais créneaux alternatifs, lien autres créneaux et retour aux RDV. Pas de double réservation lors d'une course entre deux clients.

### 9. FAQ, légal et cookies — planche 06

FAQ avec hero photo et catégories Réservation / Prestations / Votre visite ; accordéons, contact secondaire. Questions visibles : comment réserver, modifier/annuler, retrouver, acompte, durée ; réponses éditables, sans engagement inexistant.

Informations légales : hero réception, onglets Mentions légales / Confidentialité / Conditions de réservation / Cookies, contenu à compléter avant publication. Aucune identité d'entreprise inventée. Bandeau cookies Accepter / Refuser / Paramétrer, choix persisté, traceurs facultatifs désactivés avant consentement. Prévoir aussi les états introuvable, lien expiré, erreur réseau et aucun créneau, dans le même style, sans les confondre avec les maquettes originales.

## Studio, exports et adaptation client

Enregistrer le thème dans la galerie Services et permettre de visiter toute sa démo avant de le choisir. Visiter la démo ne modifie pas le projet ; choisir le thème ne lance qu'une seule opération même en double clic. Utiliser le moteur existant, l'éditeur, la sauvegarde et les exports ; ne pas faire un site parallèle hors du studio.

Rendre éditables sections, ordre/visibilité, textes, couleurs, polices, photos, prestations/catégories/durées/prix/options, équipe/compétences, horaires/fermetures/planning, coordonnées, FAQ, journal, inspirations et paramètres de réservation. Tester duplication, déplacement, remplacement d'une photo, sauvegarde et rechargement selon les capacités existantes.

L'application à un autre salon reprend ses propres contenus. Les prix, images, noms d'équipe et textes d'ATELIER NUANCE sont la démonstration et ne doivent pas être injectés dans un vrai site à son insu. Expliquer les informations manquantes sans remplacer ni détruire ses données. Distinguer les fonctions autonomes du thème et celles qui requièrent un service serveur selon l'export (statique/Shopify/WooCommerce ou formats effectivement disponibles). Documenter le branchement nécessaire et les limites plutôt que promettre une fonction inexécutable dans un export statique.

## Recette et livraison obligatoire

Établir la matrice planche → page/état → route → capture → écart. Captures à 1440 et 390 px pour toutes les pages et les étapes, contrôles supplémentaires à 360 et 430 px. Comparer aux maquettes les couleurs, titres, espaces, tailles de photos, cadrages, ordres, pieds et adaptation mobile. Corriger les écarts avant livraison et lister ceux qui restent ; pas de déclaration « identique » sans preuve.

Tester navigation/menu, filtres/lightbox, FAQ, sélection de prestation et longueur, choix du professionnel, dates passées/fermetures/durée, retour entre étapes, erreurs de formulaire, double clic, concurrence sur créneau, confirmation/ICS, accès sécurisé, déplacement, annulation, lien expiré, consentement et persistance. Tester le studio et au moins un autre salon avec ses propres données ; contrôler les régressions des thèmes touchés par un composant partagé.

Exécuter les contrôles du dépôt : types, tests pertinents, build et contrôles d'export applicables. Livrer une PR dédiée avec SHA exact, captures comparées, matrice, résultats, limites démonstration/production/export, liste des fichiers communs modifiés et guide simple pour modifier une prestation, une photo, le planning et gérer les rendez-vous. Ne pas fusionner, déployer ou notifier de vrais clients. Ne pas lancer d'appels IA payants pour les essais.
