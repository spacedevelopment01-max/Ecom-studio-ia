# Claude — NOCTIL complet selon les sept maquettes du 23 octobre

Mission explicitement demandée par Thomas : récupérer les maquettes de l'autre discussion, transmettre la consigne ET les photos/images nécessaires, comme pour les thèmes précédents. Modèle souhaité : Opus ; effort élevé. Indiquer le modèle effectivement utilisé.

## Priorité absolue : le projecteur qui dépasse dans le hero

Thomas insiste : « sur le hero de la page d'accueil le vidéoprojecteur dépasse sur le haut dans le hero, je veux impérativement que ça soit gardé, tout le reste aussi ».

Ouvrir visuellement `maquettes/01-accueil.jpg`. Le grand projecteur de la section crème remonte dans le bas du hero photographique étoilé. C'est un seul produit au premier plan, à cheval sur les deux zones, et non une photo rectangulaire posée sous le hero. Sur la planche ordinateur, la séparation est vers y=289/1536 et le sommet visible du produit vers y=257/1536 ; sur téléphone, le dépassement est également visible. Ces repères sont ceux de la planche, pas des pixels CSS à copier aveuglément.

- Utiliser `medias/projecteur-detoure.png`, véritable fond transparent vérifié, comme élément image indépendant. Fond séparé : `medias/hero-chambre.webp`.
- Préserver le chevauchement, l'échelle et la position proportionnelles à la maquette sur ordinateur ET mobile. Ne pas cacher/réduire cet effet pour simplifier le responsive.
- Prévoir conteneur et empilement adaptés : position relative, remontée maîtrisée, z-index supérieur au fond, aucun overflow/clip-path ancêtre qui coupe la lentille ou le haut du produit. Le menu doit rester au-dessus si ouvert.
- Le produit garde son socle complet et ne recouvre ni titre, ni CTA, ni navigation. L'image est en contain, sans rectangle opaque. Orbites et petites étoiles sont des éléments décoratifs distincts, modifiables si prévu par le moteur.
- Conserver hauteur utile de la section après décalage et absence de débordement horizontal. Tester zoom, redimensionnement et chargement tardif de l'image.
- Ce chevauchement doit fonctionner dans la démo, la galerie, le studio, après sauvegarde/réouverture, après remplacement de l'image par un détourage client et dans les exports concernés.
- Fournir des captures rapprochées comparatives de cette jonction à 1440, 390, 360 et 430 px. Hero coupé, produit enfermé dans une carte ou effet absent sur mobile = NON CONFORME, même si tous les tests passent.

## Fidélité de toutes les pages

Les sept planches sont la référence de composition. Reproduire hiérarchie, proportions, espacements, fonds crème/bleu nuit, accents lavande et or, typographies arrondies, grands visuels, bordures, CTA, en-têtes et pieds propres aux pages. Ne pas appliquer un gabarit générique à toutes les pages. Pas de refonte libre ni d'appauvrissement des pages mobiles.

| Planche | Pages et états à réaliser |
|---|---|
| 01 accueil | Accueil complet ordinateur et téléphone |
| 02 produit | Fiche produit complète, galerie/zoom, quantité, achat, contenus et barre d'achat |
| 03 commerce | Boutique mono-produit, panier rempli/vide, commande de démonstration, confirmation, adaptations mobiles |
| 04 univers/journal | Notre univers, liste du journal avec filtres/pagination utiles, article détaillé et articles liés |
| 05 aide | Guide, FAQ avec recherche et accordéons, contact, livraison/retours et états mobiles |
| 06 compte | Connexion, inscription, mot de passe oublié, tableau de bord, commandes/détail, informations et adresses accessibles |
| 07 légal/états | Mentions légales, CGV, confidentialité, cookies, 404, préférences cookies |

Tous les liens visibles doivent mener à une page/état cohérent. Si une destination nécessite une liste intermédiaire non détaillée sur planche, la construire dans le même langage visuel. Aucun lien # inerte ni fausse confirmation d'envoi/paiement.

Accueil : conserver le hero étoilé et ses textes, projecteur débordant + argumentaire/prix/achat, trois cartes chambre/tipi/peluches, bandeau « Plus qu'un projecteur », trois étapes, bandeau « Les grandes aventures », journal, FAQ/CTA final et footer. Fiche : conserver galerie, argumentaire, bandeau chambre, bénéfices, détails lentille/socle, trois usages, différentes chambres, informations à confirmer, FAQ, journal et achat. Les aperçus mobiles raccourcis ne permettent pas de supprimer des sections.

## Images fournies et cohérence produit

Le dossier contient 7 JPG des maquettes originales récupérées, 16 médias du kit existant (logo, 5 vues produit, 10 ambiances) et 10 nouveaux médias complémentaires dont le détourage. Lire `MEDIAS.md` pour la correspondance et les limites. Les nouveaux médias sont des créations dérivées des références, pas des extractions pixel identiques. La fidélité parfaite des scènes ne doit pas être revendiquée.

Conserver un seul projecteur NOCTIL sphérique bleu nuit, monture en U, base cylindrique, bouton violet et lentille galaxie. Privilégier les vues produit originales pour les détails et le détourage pour le hero. Les anciens décors adultes/salons ne remplacent pas les chambres d'enfant. Aucune personne ; aucune marque externe. N'inventer ni variante produit ni accessoire vendu à partir d'un objet décoratif.

Installer les médias dans le projet avec des chemins durables et les embarquer dans les exports concernés. Aucune URL temporaire, aucune dépendance à un dossier privé absent. Ouvrir réellement les images localement ; une réponse WebFetch textuelle n'est pas une lecture visuelle. Ne pas utiliser une maquette entière comme image de page. Les textes et boutons restent des éléments HTML éditables. Établir une matrice section → photo de référence → fichier utilisé → écart. Les scènes non couvertes exactement doivent être signalées, sans substitution silencieuse. Pas de nouvel appel IA payant par Claude.

## Moteur du studio et galerie

NOCTIL reste dans Produit spécifique / Boutique spécialisée. Réaliser le thème dans le moteur existant, sans site parallèle. Chaque composition doit être accessible comme section ou disposition réutilisable dans la galerie de sa famille, avec un aperçu réel fidèle. Respecter droits et structure de bibliothèque, sans doublons fonctionnels. Les quantités 8/12/20 portent sur les sections disponibles, pas sur une nouvelle limite de blocs par page.

Rendre modifiables textes, médias, cadrages desktop/mobile, CTA/liens, couleurs et paramètres utiles, notamment taille et remontée du projecteur. Tester ajout depuis galerie, édition, déplacement, duplication autorisée, sauvegarde et réouverture. Préserver le bon rattachement du produit et du hero lorsqu'une section est déplacée : pas de chevauchement sauvage avec une section sans rapport.

Démo complète avant sélection ; adaptation seulement après choix explicite. Avec un autre produit client, conserver la composition et utiliser exclusivement identité, images, textes et prix client. Aucune fuite NOCTIL. Préserver les retouches et prouver le fonctionnement des exports concernés.

## Contenus et parcours réels

69 € est un prix de démonstration. Quantités et sous-total cohérents (2 unités = 138 €). Livraison non chiffrée = sous-total, pas total final garanti. Ne pas transformer en promesses les textes générés : aucun âge minimum, certificat, autonomie, alimentation, dimensions, garantie, délai, livraison offerte, bénéfice médical/sommeil ou avis inventé. Les champs techniques restent « À confirmer » si non documentés. Pages légales à compléter, sans données de société inventées.

Commande, confirmation et compte de démonstration doivent être clairement signalés comme tels ; ne pas réclamer de vraie carte bancaire. Raccorder les capacités natives existantes quand disponibles, documenter celles qui dépendent du CMS exporté. Aucun backend de paiement ou d'authentification factice présenté comme production. La facture démo ne doit pas être présentée comme facture réelle. Consentement cookies fonctionnel selon les capacités du moteur, catégories facultatives désactivées par défaut, refus aussi accessible que l'acceptation.

Tester menu, liens, retour en haut après navigation, galerie et zoom, quantités/suppression/totaux/panier vide, formulaires (erreurs, validation, échec), recherche FAQ et accordéons, filtres journal, navigation compte démo et préférences cookies. Barre d'achat mobile : ne masque ni footer, ni formulaire, ni menu. Navigation clavier, focus visible, contrastes lisibles et animations réduites si demandées par le système.

## Réception et coordination

Travailler page par page : accueil/hero, produit, boutique/panier, puis toutes les pages restantes. Comparer maquette/rendu à largeur équivalente ; tenir compte de la largeur réelle de chaque colonne de planche. Corriger les écarts avant livraison. Rapport `docs/coordination/NOCTIL_RESULTATS.md` : page / conforme / écarts / correction / preuve, matrice médias et limites.

Fournir captures complètes de chaque page/état à 1440 et 390 px, contrôles 360/430, gros plans du chevauchement, preuves d'édition galerie et de sauvegarde, adaptation à un autre produit, tests techniques appropriés, compilation, exports impactés, SHA et état CI effectivement vérifié. Distinguer développement local, version du studio de Thomas et installation CMS réelle. Une CI verte ne vaut pas validation du design ; Thomas valide le rendu final.

Périmètre : NOCTIL seulement. Préserver les livraisons HEUREN, Atelier Rive, TRAVERSE, MUSEAU CLUB et les autres thèmes, l'accueil public du studio et le lot 8 Codex (#169). Ne pas supprimer du travail en cours. Aucun paiement/envoi réel, fusion ou déploiement automatique. Après validation, aucun changement sans nouvelle consigne.
