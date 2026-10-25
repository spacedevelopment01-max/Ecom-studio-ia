# Projet CLIENT — Le Coven des Charmes — reproduction à l’identique

Demande de Thomas du 25 octobre 2026. Ce dossier est destiné à **un client précis**. Ce site ne doit **pas être ajouté aux autres thèmes du studio**, au catalogue global, aux démonstrations, aux recommandations ni à la galerie des sections partagées. Ne jamais exposer ses médias, son identité ou ses contenus aux autres clients.

## Résultat attendu et périmètre client

Thomas veut le site des **6 dernières maquettes**, à l’identique, **au pixel près**, sur ordinateur et mobile. Reproduire chaque page, section, cadrage, décor, proportion, typographie, césure, couleur, espacement, bordure, bouton, icône, en-tête et pied de page. Ne pas proposer une nouvelle direction artistique et ne pas simplifier le cabinet de curiosités en une boutique générique.

Créer l’implémentation dans un dossier/espace de projet **client isolé**, avec une clé de configuration dédiée proposée `le-coven-des-charmes`. Rattacher uniquement au projet du client identifié dans les données réelles du studio ; ne pas inventer d’identifiant de compte ou de tenant. Si le projet client n’existe pas encore, préparer un aperçu de développement isolé et les étapes de rattachement, sans publier une démo globale ni créer un compte personnel arbitraire. Aucun autre projet ne doit changer.

Le nom exact est **Le Coven des Charmes**. La mention « cover des charmes » dans la demande désigne ce client ; ne pas utiliser ce mot comme nom de marque.

## Concept commercial à respecter absolument

**Le client commande un bracelet de charms surprise. Après sa commande, le créateur tire physiquement des symboles au scoop dans une coupelle. Ces symboles désignent les charms correspondants dans le cabinet. Le créateur assemble ensuite ces charms sur le bracelet, puis expédie le bracelet assemblé.**

Le produit vendu est le **bracelet assemblé**. Le scoop est l’outil de tirage physique de l’atelier. Ce n’est ni un scoop vendu séparément, ni une recharge de jetons, ni un paquet de breloques en vrac, ni un tirage numérique sur le site, ni un jeu avec gains, raretés payantes ou probabilités inventées. Ne pas générer les charms au clic d’achat : leur sélection intervient physiquement après la commande.

Parcours et vocabulaire : **commande du bracelet → tirage des symboles au scoop → réunion des charms désignés → assemblage du bracelet → expédition**. Le client choisit uniquement les options réellement prévues, dont taille et quantité ; il ne choisit pas ses charms à la carte et n’achète pas une catégorie de symboles. Les catégories sont explicatives, pas des garanties de contenu. Ne pas imposer un nombre de charms ou de scoops non fourni.

La formulation centrale validée : **« Bracelet de charms surprise — les charms sont tirés au sort au scoop, puis assemblés sur le bracelet après la commande. »** Les photos de bracelets sont des exemples. Ne jamais promettre au client les mêmes charms que sur une photo. Les illustrations mystiques relèvent de l’univers de marque ; ne pas leur attribuer de pouvoirs, bénéfices de santé ni résultats réels.

## Références finales et logo original

Ouvrir les six planches originales à leur taille native, puis chaque panneau séparément. Fichiers 01 à 03 : ordinateur ; 04 à 06 : mobile. Les 12 pages sont réparties sur les planches, avec une 404 complémentaire dans la planche ordinateur 03. Une planche composite n’est pas un seul viewport. Ne pas intégrer ses légendes ou bordures dans le site.

Le dossier contient les **dernières corrections du concept**. Les anciennes versions mentionnant seulement « Bracelet Scoop », un achat de scoops ou une mécanique ambiguë sont remplacées par ces six références. Leurs tailles, dimensions et SHA-256 sont dans `MAQUETTES_ORIGINALES.json`.

**Logo obligatoire : `images/LOGO_ORIGINAL_LE_COVEN_DES_CHARMES.jpg`**, copie exacte du fichier fourni par le client **`1000034256.jpg`** (original aussi conservé dans `images/originaux-client/`). Son identité et ses empreintes figurent dans `LOGO_ORIGINAL.json`. C’est l’emblème céleste circulaire avec le texte « Le Coven des Charmes », lune, étoiles et végétaux. Utiliser ce logo, sans réécrire son texte, sans refaire le dessin, sans remplacer sa typographie ni modifier ses proportions. Si la génération d’une maquette en a déformé le logo, **le logo original fourni par le client est prioritaire**. Préserver le fichier original ; toute variante technique nécessaire se fait dans un fichier distinct et doit conserver son dessin. Ne pas inventer une nouvelle identité.

## Médias et icônes du ZIP

Le client a fourni cinq fichiers : quatre photos et le logo. Ils sont conservés **octet pour octet** dans `images/originaux-client/`, avec leurs empreintes. Les trois fichiers portant l’extension `.heic` sont des images dont des versions PNG lisibles par le navigateur sont également fournies. Garder la version originale en archive ; utiliser la version web prévue dans le rendu.

`images/extraits-maquettes/` contient les extraits visuels aux pixels natifs des dernières références pour retrouver exactement les compositions dessinées. Leur rectangle et leur planche source sont dans `EXTRAITS_MAQUETTES.json`. Ces extraits peuvent inclure du décor et ne sont **pas des photographies sources HD** : ne pas les présenter comme telles, ne pas les étirer artificiellement pour prétendre à une meilleure définition et ne pas figer un texte ou un bouton dans une image. Pour les grandes photos, utiliser les originaux client et reproduire les recadrages des maquettes. Toute scène absente des sources est signalée explicitement ; ne pas la remplacer silencieusement par une photo inventée ou une autre marque.

`icones/` contient les fichiers SVG individuels, un sprite et les PNG transparents or/ivoire. Le jeu inclut les contrôles d’interface et les symboles du thème : bracelet, charms, scoop, coupelle, tirage, tiroirs, assemblage, expédition, familiers, divination, lune, rituel, cristal, arbre, astres, nature, protection, éléments et accessoires. Il s’agit de **reconstitutions natives éditables**, pas des fichiers sources exacts du dessin. Comparer chaque silhouette avec la référence et la corriger si elle diffère. Ne pas substituer des emojis ou une police de symboles. Préserver proportions, poids des lignes, couleurs et états. Les icônes décoratives ne sont pas lues par le lecteur d’écran ; les boutons portent un nom accessible.

Les cinq originaux client, leurs déclinaisons et les médias de production du ZIP restent **privés et propres au client**, hors du dépôt public. Vérifier le `.gitignore`, les chemins d’export et les autorisations. Les maquettes et cette consigne sont envoyées sur GitHub à la demande de Thomas ; cela n’autorise pas la diffusion du kit de photos originales ni l’ajout à une banque commune.

## Direction artistique

Reprendre l’univers **cabinet ésotérique / curiosités**, très sombre, crème et or, bois et tiroirs, symboles célestes, végétaux et accessoires du cabinet. Quelques accents violets seulement là où ils sont dessinés. Mesurer la palette sur les références. Ne pas éclaircir tout le fond, aplatir les matières ou supprimer les signes et cadres. Reproduire les titres élégants, les ornements, lignes, positions et respirations des panneaux.

Le logo conserve sa lisibilité et son encart de référence. Les motifs sont décoratifs ; les textes, informations, cartes, formulaires et actions restent natifs et éditables. Sur mobile, reprendre la composition spécifique, les dimensions du logo, l’ordre des sections, le menu et les éléments d’achat dessinés. Ne pas retirer une section pour raccourcir la page et éviter tout masquage par un élément fixe.

## Pages et fonctions à reproduire

| Page | Composition et comportement attendus |
|---|---|
| 01 Accueil | Héros « Des charms tirés au sort. Un bracelet assemblé pour vous. », présentation du fonctionnement, 4 étapes, univers des symboles, exemples de bracelets, immersion du cabinet et appels à acheter le bracelet. |
| 02 Bracelet de charms surprise | Galerie, explication claire du tirage après commande, taille, quantité, ajout panier, étapes, détails produit/matières/dimensions/entretien/livraison à renseigner, exemples et CTA. Aucune sélection des charms individuels. |
| 03 Le tirage des charms au scoop | Introduction, commande/tirage/correspondance/assemblage, catégories explicatives, tableau de correspondance et lien FAQ. Présenter le tirage réel de l’atelier, pas une simulation qui attribue un contenu à la commande. |
| 04 Le Coven | Cabinet de curiosités, symboles, tiroirs et familles, histoire du concept et détails de l’univers, CTA. Ne pas inventer une biographie, une équipe, des dates ou un savoir-faire certifié. |
| 05 Créations / Réalisations | Galerie d’exemples, légendes expliquant que les charms dépendent du tirage, filtres et agrandissement si présents. Ces exemples ne sont pas des variantes garanties à commander. |
| 06 FAQ | Questions/réponses et états d’accordéon : choix des charms, tirage, contenu reçu, photos d’exemples, taille, matières, préparation, livraison, retours et contact. Les réponses inconnues restent à compléter. |
| 07 Panier | Bracelet, taille, quantité, retrait, sous-total, livraison calculée plus tard si inconnue, total exact lorsque calculable, rappel du concept et passage à la commande ; panier vide et erreurs compris. |
| 08 Commande | Coordonnées, adresse, livraison, paiement, récapitulatif, retour/modification des étapes, validation et erreurs. Les options et tarifs doivent venir des données réelles, pas de la capture. Aucun paiement réel pour les tests. |
| 09 Confirmation | Récapitulatif des vraies saisies et états distincts commande enregistrée / tirage à réaliser / assemblage / expédition. Ne pas annoncer un tirage ou une expédition déjà fait juste parce que le client vient de commander. |
| 10 Compte | Connexion, inscription, récupération d’accès si nécessaire, commandes, suivi, adresses et informations ; sécurité et séparation des clients. Aucun faux compte connecté d’office. |
| 11 Contact | Sujet, nom, e-mail, message, consentement si prévu, coordonnées et réseaux à renseigner, lien FAQ et états d’envoi. |
| 12 Informations | Onglets ou routes reliées pour mentions, CGV, confidentialité, cookies et livraison/retours, textes réels à fournir, préférences applicables. Préserver la composition de la référence. |
| 404 complémentaire | « Vous vous êtes égaré dans le Coven. », composition et retour à la boutique ; déclinaison mobile cohérente si non dessinée séparément. |

Inclure les en-têtes, pieds, navigation ouverte, états actifs, accordéons, sélection de taille, quantités, galerie, panier plein/vide, erreurs de formulaire, chargement, commande refusée et confirmation de démonstration. Corriger les défauts typographiques des maquettes sans changer le concept ou la hiérarchie.

## Données réelles, prix et commandes

La maquette indique **tarif, tailles, matières, dimensions, délais et informations légales à renseigner**. Ne pas inventer un prix, une promotion, une composition, un stock, une garantie, un délai, un frais de livraison ni une politique de retour. Les calculs utilisent un prix et des règles centralisés quand le client les fournit, avec les montants en centimes. Sans tarif réel, ne pas accepter de paiement en production : proposer uniquement l’aperçu de développement clairement identifié.

Les tailles et quantités se conservent dans le panier, le paiement et la commande. Contrôler les valeurs côté serveur, éviter les doubles commandes et recalculer les montants. Aucun secret de paiement dans les fichiers publics. Ne pas envoyer de paiement ou d’e-mail réel lors des vérifications. Dans l’aperçu, simulation explicitement marquée ; pas de faux message de réception effective.

Le statut de tirage/assemblage/expédition est mis à jour par le créateur au moment réel de l’action. L’espace client ne montre que ses commandes. Utiliser les mécanismes d’authentification et de stockage existants avec vérification des permissions ; ne pas exposer les commandes d’un autre client par un identifiant d’URL. Les coordonnées, contenus et médias de ce client ne deviennent jamais des valeurs par défaut pour les autres projets.

Les textes légaux et de retour restent une structure à compléter et valider avec les informations du vendeur ; ne pas présenter un texte générique comme validé juridiquement. Préférences de cookies persistantes et appliquées aux intégrations réellement utilisées, éléments facultatifs désactivés avant accord. Aucun partenaire ou traceur inventé.

## Travail et vérification

Lire le `CLAUDE.md` actuel et les instructions de vérification applicables. Récupérer uniquement `docs/client-briefs/le-coven-des-charmes/` depuis cette branche de documentation ; **ne pas réinitialiser la branche applicative actuelle** sur la vieille base du brief. Coordonner les fichiers partagés avec les autres conversations, préserver tous les thèmes et travaux en cours.

Les réglages nécessaires au client doivent rester éditables dans son projet : textes, images, recadrages, sections, icônes, liens, taille, prix réel, informations et réglages légaux, sans publier ce thème dans la galerie globale. Les modifications se sauvegardent, survivent au rechargement et se retrouvent dans l’aperçu et l’export réellement supporté. Ne pas prétendre à une compatibilité de paiement ou d’export non testée.

Avant livraison :

1. Inventorier chaque panneau, route, section et état des 6 planches.
2. Mesurer chaque panneau à son échelle utile et capturer le navigateur aux mêmes dimensions ; ne pas étirer une capture pour masquer les différences. Contrôler aussi 360, 390, 430, 768 et 1440 px.
3. Produire **référence, capture, superposition à 50 % et image de différence**, pour toutes les pages ordinateur et mobile. Corriger les grilles, césures, proportions, motifs, icônes, cadrages et espaces. Ne pas déclarer « pixel près » sans ces preuves ; signaler les limites de source photographique ou typographique qui subsistent.
4. Tester réellement navigation, menu, pieds de page qui ouvrent en haut, taille/quantité, panier, étapes de commande, erreurs, compte, permissions, contacts, cookies, sauvegarde et absence de débordement. Aucun paiement ni envoi réel.
5. Exécuter les contrôles du dépôt adaptés aux fichiers modifiés, dont typage, tests applicables et vérification du thème quand nécessaire. Indiquer les résultats exacts et ce qui n’a pas été testé.
6. Livrer un aperçu de développement **client isolé**, identifiable par commit, une PR d’implémentation et un bilan des panneaux réalisés/écarts restants. La validation visuelle appartient à Thomas. Aucun appel IA payant, aucune fusion, aucun déploiement et aucune publication à la clientèle sans demande.
