# Mission Claude — PARENTHÈSE
Date : 24 octobre 2026. Dépôt : spacedevelopment01-max/Ecom-studio-ia.
Modèle conseillé par Thomas : Opus ; effort élevé pour intégration visuelle, parcours et contrôle final.
## Objectif et périmètre
Créer le thème de services « Parenthèse — Sophrologie & bien-être » dans E-COM STUDIO IA, fidèle aux SIX planches jointes. Ce dossier est une consigne de réalisation, pas un thème déjà développé ou validé.
Reproduire les compositions, pages, couleurs, rythme, typographies, cadrages et comportements. Pas de simple landing page ni de capture géante servant de site. Tout texte, bouton, formulaire, icône et décor doit être du vrai code éditable et accessible.
Lire les éventuels AGENTS.md/CLAUDE.md et examiner l'architecture existante avant modification.
Travailler sur une branche de développement dédiée à Parenthèse à partir du main à jour, et ouvrir une PR dédiée. Ne pas fusionner sans validation de Thomas. Ne pas modifier les autres thèmes ni les travaux des autres conversations. La branche brief/parenthese-20261024 contient seulement ce dossier. La PR de brief ne vaut pas validation du futur thème.
## Sources visuelles obligatoires
Ouvrir réellement chaque PNG de maquettes/, au besoin les découper TEMPORAIREMENT pour l'inspection, jamais pour fabriquer les médias du site.
- 01.png : accueil complet desktop et mobile.
- 02.png : liste des séances, première séance détaillée, visioconférence, mobile fiche séance.
- 03.png : ateliers collectifs, détail atelier, structures/entreprises, mobile atelier.
- 04.png : réservation 4 étapes, confirmation cabinet et visio, mobiles calendrier et récapitulatif.
- 05.png : approche, journal, article, cabinet.
- 06.png : contact, FAQ, retrouver rendez-vous, détail/modification/annulation rendez-vous, informations légales, 404 et cookies.
Les six PNG sont les maquettes originales retrouvées, copiées sans modification. Les 22 photos du ZIP sont des RECRÉATIONS IA produites pour cette mission : ce ne sont pas les originaux extraits des maquettes. Des différences de mobilier, végétation et cadrage existent. Ne pas annoncer une identité pixel parfaite des photographies.
## Direction visuelle et arbitrages explicites
Référence d'identité principale : accueil 01. Fond ivoire chaud, vert forêt profond pour CTA/texte, sauge pour panneaux, pêche/abricot pour CTA secondaires et traits. Valeurs initiales APPROXIMATIVES à ajuster visuellement : ivoire #F7F4EC, forêt #20483B, sauge #869684, pêche #EDB18A, encre #192B24. Ne pas les présenter comme des couleurs source exactes.
Grands titres serif fins, élégants, contrastés ; corps sans-serif lisible comme l'accueil. Identifier les polices disponibles et choisir la plus proche visuellement, puis comparer les retours à la ligne. Aucune police source exacte n'a été fournie.
Grandes photos chaleureuses, contours organiques/arches dans la réservation, traits courbes fins, feuilles dessinées, cartes discrètes, espaces généreux. Recréer courbes, feuilles, pictogrammes et marque en SVG/CSS, pas en photos pixellisées. Le logo varie entre planches : prendre les deux traits de parenthèse + mot-symbole de 01 comme référence principale, conserver le nom accentué. Ne pas inventer un nouveau logo.
Les pieds de page clairs et verts varient selon les planches : reproduire le fond et la disposition de la page concernée, partager les données de navigation sans imposer un même rendu partout.
Les textes lisibles sont à retranscrire. Corriger les artefacts typographiques IA, sans changer le sens ou remplacer par un texte marketing générique. Adresse, téléphone, parcours/formation et références légales non fournis restent clairement « À renseigner », pas de faux praticien ou de diplôme inventé.
Le hero d'accueil est une vraie photo occupant la largeur du thème avec texte superposé ; respecter sa hauteur et sa composition dans 01. En mobile choisir un object-position adapté, garder le sujet et les titres visibles. Pas d'étirement.
## Inventaire de pages et sections
### Accueil
Header logo/menu/CTA ; hero « Un temps pour souffler. Une place pour vous. » et ses deux CTA ; trois besoins (faire une pause, apprivoiser le stress, préparer un moment important) ; sophrologie simplement et panneau vase/livres ; cartes séance individuelle et atelier ; bandeau cabinet + panneau vert ; trois étapes du premier rendez-vous ; approche avec photo et quatre principes ; trois conseils ; FAQ ; CTA final ; footer. Reproduire la réorganisation mobile et la barre fixe Prendre rendez-vous.
Chaque carte besoin doit ouvrir une destination pertinente (section détaillée ou contenu dédié dans la même identité), pas un lien vide.
### Séances
Liste avec hero, choix cabinet/visio, première séance et suivi, présentation de la sophrologie, trois bénéfices et CTA.
Fiche première séance : hero photo/texte, 60 €, 60 minutes, cabinet ou visio, galerie 3 vues, déroulement en 3 étapes, chacun à son rythme, infos pratiques, encart non-substitution médicale, FAQ.
Créer une fiche de suivi cohérente pour la carte de suivi en réutilisant cette structure, avec contenu distinct : c'est une déclinaison fonctionnelle, pas une maquette additionnelle retrouvée.
Visio : hero ordinateur, avantages, préparation en 3 étapes, encart confort, matériel, confidentialité, CTA. Les CTA préselectionnent la bonne modalité.
### Ateliers
Liste avec hero, filtres par date et thème, cartes (Une pause dans la semaine ; Découvrir la relaxation ; Un moment pour ralentir).
Détail avec tags, date, durée 75 minutes, 20 €, programme, informations pratiques, places restantes sur capacité, réservation, FAQ et ateliers similaires. Les autres cartes ont leurs détails cohérents.
Entreprises/structures : hero salle, bénéfices, formats, liste des usages, encart responsable, formulaire organisation/email/date souhaitée/participants/message.
### Réservation
Quatre étapes : prestation > date et heure > coordonnées > confirmation.
Choix première séance/suivi/atelier, cabinet/visio selon prestation ; prix et durée synchronisés. Calendrier navigable au clavier et souris, créneaux sélectionnables, dates/slots indisponibles désactivés. Conserver les données lors du retour à l'étape précédente et lors du rafraîchissement de la démo, sans mélanger des projets.
Coordonnées : prénom, nom, email requis, téléphone et note optionnels, acceptation conditions obligatoire, newsletter séparée décochée. Afficher les erreurs près des champs et déplacer le focus utilement. Conserver l'indication d'éviter les données médicales dans la note.
Récapitulatif toujours cohérent ; éviter double soumission et double réservation d'un même créneau. Atelier : capacité jamais négative ; annulation restitue la place. Afficher clairement état complet/aucun créneau.
Confirmation cabinet et visio distinctes : référence, date, horaire, durée, modalité, montant, adresse ou indication de lien privé, préparation visio. Boutons gérer et ajouter à l'agenda réellement fonctionnels (fichier .ics correct, fuseau Europe/Paris, pas seulement alerte).
Maquettes : les dates de novembre 2026 et référence P-0001 sont des données de démonstration. Les rendre configurables ; ne pas casser la démo quand ces dates sont passées. Pas de paiement en ligne ajouté : aucun écran de paiement n'est montré.
### Retrouver et gérer un rendez-vous
Écran référence + email, validation, message discret sans divulguer si une réservation existe. Démo : accès explicitement simulé au rendez-vous local de démonstration, aucune promesse d'email envoyé.
Détail avec date/type/prix/durée/modalité, modification par modal, annulation avec confirmation, ajout agenda et note personnelle. Modal accessible, échappement, focus piégé puis restitué. Après modification/annulation, toutes les vues reflètent l'état persistant. Référence unique en démo, pas P-0001 identique pour chaque réservation.
En mode réel : réutiliser le système serveur existant, accès par jeton sûr/expirant, contrôle côté serveur du projet et du rendez-vous, disponibilité atomique. Ne pas exposer des rendez-vous par référence prévisible.
### Approche, cabinet, journal
Approche : hero, pratique, approche personnelle, parcours & formation, CTA. Cabinet : hero, galerie, adresse/horaires/accès/accessibilité, environnement et carte. Coordonnées à configurer ; carte de démo schématique en SVG, pas fausse localisation réelle, sans ajout de fournisseur payant.
Journal : hero, catégories Tous/Quotidien/La pratique/Le cabinet, article vedette et grille 6 cartes, newsletter. Filtres fonctionnels ; articles ouvrables avec leur propre contenu. Article modèle : hero, catégorie/date/temps, trois points illustrés, citation et 3 articles liés.
### Contact, FAQ, informations légales et 404
Contact : formulaire nom/email/sujet/message, coordonnées et horaires. FAQ : catégories sophrologie/séances/réservation/visio et accordéons (navigation clavier). Tarifs/conditions depuis le footer ouvrent le contenu pertinent.
Informations légales en onglets : mentions, confidentialité, réservation, cookies ; conserver l'état « à compléter avant publication ». Footer : tous les liens internes fonctionnent et amènent en haut de la destination.
404 : photographie de jardin et actions accueil/RDV. Cookies : accepter, refuser, personnaliser ; choix mémorisé et réouvrable, aucun traceur optionnel avant consentement. Préférences essentielles distinctes.
## Démo honnête et fonctionnalités réelles
Les maquettes indiquent « cabinet de démonstration » et « simulation – aucun rendez-vous réel ». Le thème de galerie doit fonctionner de bout en bout en mode démo persistant, sans envoyer de mail ni réserver un vrai créneau.
Pour contact/newsletter/entreprise : valider et enregistrer la simulation avec un message explicite. Pour un projet réel, utiliser les intégrations existantes configurées, traiter succès/erreur ; ne jamais afficher « envoyé » sans réponse positive du service. Si un connecteur manque, afficher configuration nécessaire et le documenter. Ne pas utiliser un simple toast de succès pour masquer une fonctionnalité absente.
La sophrologie est ici présentée comme relaxation/bien-être, sans promesse de traitement ni remplacement d'un suivi médical, conformément aux encarts visibles.
## Médias et intégration Studio
Thomas fournit 22 PNG dans les ZIP, accompagnés de MEDIAS.csv et PROVENANCE.json. Suivre les correspondances de EMPLACEMENTS.md, placer dans un dossier propre au thème. Pas de banque d'images, pas de remplacement par visuels d'autres thèmes, pas d'humains ajoutés.
Les réutilisations indiquées sont volontaires pour les mêmes scènes, pas l'autorisation d'utiliser une photo unique partout. Produire les formats web adaptés depuis ces sources sans les agrandir artificiellement ; garder les PNG maîtres. Cadrage responsive propre, alt descriptifs, chargement différé hors hero, dimensions explicites.
Intégrer Parenthèse dans la famille Prestations de services / catégorie médecine douce-sophrologie selon les conventions existantes. Prévisualisation complète avec toutes les données démo AVANT choix, puis personnalisation après sélection. Textes, médias, logo, palette, prestations, prix, ateliers, FAQ, articles, coordonnées et réglages RDV éditables et sauvegardés.
Respecter les mécanismes existants de forfaits, sections et export ; ne pas modifier les règles globales ni des familles e-commerce. Si l'export existant exclut des fonctions serveur, le signaler clairement et préserver le parcours disponible, sans prétendre livrer un backend avec un ZIP statique.
## Contrôles et livraison attendus
1. Inventaire page/route/fonction/image avant codage, en cochant chaque écran des 6 planches.
2. Comparaison visuelle réelle desktop 1440 px et mobile 390 px, plus contrôle 360/768 px. Pas de débordement horizontal, textes coupés, barre fixe masquant CTA/footer, image absente, focus invisible.
3. Captures de chaque page complète et états réservation/erreur/modal/cookies. Comparer côte à côte aux planches et corriger proportions, espaces, typos, couleurs et cadrages.
4. Tester cabinet, visio et atelier de bout en bout ; retours d'étapes, refresh, formulaire invalide, consentements, complet, modifier, annuler, agenda, filtres, articles, FAQ, 404, navigation et sauvegarde Studio. Tests utiles selon conventions du dépôt.
5. Exécuter build/lint/tests appropriés. Vérifier absence de régression dans les autres thèmes. Ne pas annoncer des tests non exécutés.
6. PR dédiée : pages livrées, captures, tests réellement exécutés, connecteurs configurés/manquants, écarts visuels restants. Attendre validation avant fusion.
Aucun travail sur l'accueil général du Studio, aucun redesign d'autre thème, aucun nettoyage global.
