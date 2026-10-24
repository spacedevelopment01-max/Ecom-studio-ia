# ONDE — refaire à l’identique les sept planches ordinateur et mobile

## Demande de Thomas — 24 octobre 2026

> « Je veux le même thème donc dit à Claude de le refaire à l'identique. »

Thomas demande le même travail que pour SILLON : **toutes les maquettes, toutes les images HD dans des ZIP indépendants de moins de 30 Mo et reproduction à l’identique du thème**. Il fournit lui-même les ZIP des images à Claude. La référence est le jeu ONDE du 24 octobre, pas l’ancien ONDE, Pawish ou un autre thème. Ne pas simplifier, ne pas réinterpréter et ne pas remplacer les compositions par un gabarit commun.

Le critère visuel est l’identité du rendu, contrôlée aux dimensions des panneaux avec comparaisons, superpositions et différences. « Très proche » ne remplace pas la demande. Ne jamais affirmer « au pixel près » lorsque des écarts de police, photo, taille, placement ou contenu subsistent. Thomas valide le rendu final.

Lire `CLAUDE.md` en entier et les instructions applicables, puis vérifier les travaux en cours sur #167, #158, #172, #179, #180 et #182. Récupérer **uniquement `docs/theme-briefs/onde/`** dans une branche basée sur les travaux applicatifs récents. Ne pas remettre la branche applicative à l’ancien main de cette branche documentaire. Coordonner les modifications partagées : jamais deux conversations simultanées sur les mêmes fichiers.

## Sept planches originales — toutes obligatoires

| Référence originale intacte | Écrans |
| --- | --- |
| [01 — Ordinateur : accueil et produit](maquettes/01-ordinateur-accueil-produit.png) | 01 Accueil complet et 02 Le casque complet |
| [02 — Ordinateur : boutique, expérience, marque, journal](maquettes/02-ordinateur-boutique-experience-marque-journal.png) | 03 La boutique ; 04 L’expérience ; 05 La marque ; 06 Journal |
| [03 — Ordinateur : commerce et aide](maquettes/03-ordinateur-commerce-aide.png) | 07 Panier ; 08 Commande ; 09 FAQ ; 10 Contact ; 11 Livraison et retours ; 12 Suivi ; premiers écrans mobiles et menu |
| [04 — Mobile : boutique, expérience, marque, journal](maquettes/04-mobile-boutique-experience-marque-journal.png) | Versions mobiles complètes des pages 03 à 06 |
| [05 — Mobile : accueil et produit](maquettes/05-mobile-accueil-produit.png) | Accueil, fiche, contenus sous le premier écran, détails, usages, questions et barre d’achat |
| [06 — Mobile : commerce](maquettes/06-mobile-commerce.png) | Panier rempli/vide, informations, livraison, paiement illustratif, confirmation, menu ouvert et tiroir panier |
| [07 — Mobile : aide](maquettes/07-mobile-aide.png) | FAQ, contact, livraison/retours, suivi, avec pieds de page |

Les noms canoniques décrivent le contenu réel des panneaux. Les titres d’origine Library étaient parfois imprécis : `MAQUETTES_ORIGINALES.json` conserve les noms sources, dimensions et empreintes. **Ouvrir réellement les sept PNG**, pas seulement lire leurs titres. Les planches composites montrent douze pages et des états supplémentaires, pas sept pages. Les cadres de téléphone, légendes de planche et cartouches « Maquette / Prix illustratif » extérieurs au site ne deviennent pas des composants du site.

Aux endroits détaillés, les planches mobiles complètes 04 à 07 sont prioritaires sur les petites vignettes mobiles de la 03. Garder les éléments de design communs au desktop et résoudre une divergence en la documentant visuellement, sans ignorer une planche.

## Identité et périmètre

- Thème existant `onde`, **mono-produit de la famille E-commerce**, comme décidé dans #158. Ne pas le reclasser dans Produit spécifique / Boutique spécialisée. Remplacer le rendu de sa démonstration actuelle, sans créer un deuxième ONDE dans le catalogue et sans migrer les projets existants silencieusement.
- Un seul casque ONDE graphite/lime : coque et arceau graphite mats, coussinets noirs en tissu, détails et touches lime. Aucun autre produit, aucun coloris réel supplémentaire déduit d’une simple pastille graphique.
- **149 € est le prix illustratif de la nouvelle maquette** : le centraliser et l’identifier comme démonstration. Un casque = 149 € de sous-total ; deux = 298 €. Ce prix ne devient pas celui d’un projet client.
- Reprendre le logo, wordmark et signatures visibles dans les planches. Le fichier ancien `logo-proposition.png` est une proposition du kit, pas une validation nouvelle. S’il diffère des planches, expliquer et restituer la signature des planches sans inventer une nouvelle identité.
- Relever les teintes exactes, fonds clairs et graphite, accents lime, tailles de titres, graisses, espacements, rayons, contours et alignements dans les originaux. Ne pas appliquer automatiquement le header flottant, les titres condensés, la palette cuivre ou les routes de SILLON : ONDE possède sa composition propre.
- Respecter l’ordre et la densité de toutes les sections jusqu’au pied, les grandes mises en scène du casque, macros, cartes d’usage et blocs asymétriques tels qu’ils sont dessinés. Ne pas limiter la livraison au premier écran ou à un accueil générique.
- Textes, boutons, icônes et éléments graphiques restent éditables en HTML/CSS/SVG. Aucune capture de page entière à la place d’un site. Les photos livrées ne comportent pas de titres ou boutons web incrustés.

## Images : transmission séparée par Thomas

Tous les médias de production sont transmis dans des **ZIP indépendants de moins de 30 000 000 octets chacun**, à extraire au même endroit pour réunir `ONDE_DOSSIER/`. Les maquettes sont directement consultables sur GitHub ; leur lecture ne dépend pas de la réception d’un ZIP unique.

Le dossier contient les médias originaux du kit ONDE et des compléments HD recréés pour les scènes des nouvelles maquettes, dont deux détourages à alpha réel, les vues produit, macros, scènes de maison/train/studio et images du journal. `INVENTAIRE_IMAGES.csv`, `AFFECTATIONS.csv` et `CATALOGUE.html` donnent les fichiers, usages, dimensions natives et empreintes. Aucun agrandissement artificiel d’une capture n’est présenté comme photo HD. Les originaux et les compléments sont explicitement distingués.

**Les photos complémentaires sont des reconstitutions guidées par les maquettes, pas les photographies sources exactes de celles-ci.** Les sept maquettes intactes demeurent la référence visuelle. Pour les petites zones photo propres, extraire leurs pixels exacts si cela améliore la fidélité, en gardant leur résolution réelle ; pour les grands blocs, utiliser le complément fidèle et régler précisément le cadrage, sans cacher un écart derrière l’expression « identique ». Tout manque de source exacte se documente avec l’emplacement et une comparaison, sans abandonner les autres parties ni s’auto-déclarer validé.

Le détourage sert aux compositions de produit et miniatures ; ne pas l’imposer à toutes les scènes. Conserver ses pixels alpha sans rectangle de fond. Le produit reste entier dans une vue principale, une macro garde son rôle de matière. Pas de casque d’une autre forme, cuir à la place du tissu, accent cobalt à la place du lime, liseré recoloré ou commandes inventées.

Les photographies de production restent **dans le kit privé `public/demo/onde/` ou le mécanisme privé déjà prévu**, conformément aux règles ONDE du dépôt. Cette mission autorise la publication des sept maquettes et de la consigne sur GitHub, pas celle des photos de production. Ne pas copier automatiquement tout le ZIP dans le dépôt public. Les images ne sont pas affichées dans la conversation : Thomas les consulte dans les ZIP.

## Pages et interactions

### 01 — Accueil, planches 01 et 05

Reprendre header et navigation ONDE, recherche si montrée, panier, grande ouverture « Votre monde. Votre fréquence. » et sa mise en scène de produit ; prix et action tels que dessinés ; « Au plus près du son » ; « Le détail fait la différence » avec les détails La ligne / Le contact ; scènes du quotidien et expérience ; journal ; FAQ ; newsletter ; pied complet. Relever chaque section directement dans les planches pour ne rien omettre.

Conserver les placements et recadrages propres au mobile de la 05, notamment la place du casque, du titre, du prix et de l’action. Les boutons Voir/Découvrir/Ajouter ne sont pas interchangeables : un lien de découverte ouvre la fiche ou la section pertinente ; un ajout ajoute le bon identifiant.

### 02 — Le casque, planches 01 et 05

Galerie fidèle, miniatures réelles, vue principale et zoom utilisable, titre, prix, quantité et ajout. Onglets/ancres Vue d’ensemble / Design / Questions selon la maquette. Grands panneaux « Un design pensé pour l’essentiel », coussinets/arceau/commandes/finition, usages « À chacun son moment », informations et accordéons Utilisation / Entretien / Informations produit / Livraison et retours, questions fréquentes et pied. Barre d’achat mobile : bon produit et prix, bon ajout et quantité, clavier et zone de sécurité pris en compte, rien de masqué.

Un seul produit principal : ne pas inventer de recommandations ou une rangée de produits ONDE supplémentaires pour remplir le bas. Les compteurs de galerie reflètent les fichiers réels, pas une même image dupliquée plusieurs fois. Une pastille pour une variante non fournie reste explicitement indisponible en démo, pas vendable avec une image inventée.

### 03 — La boutique, planches 02 et 04

« Une seule ONDE. Tous vos moments. », carte unique du casque avec 149 € illustratifs et action, détails « Sous tous les angles » et « Des matières qui comptent », scènes maison et déplacement, pied propre à cette page. Ne pas convertir cette boutique mono-produit en grande grille vide ni supprimer les sections éditoriales sous la carte. Les actions et liens ouvrent le casque concerné.

### 04 — L’expérience, planches 02 et 04

« Entrez dans votre bulle », photo de produit, « Tout commence par le contact », détails de matières et finitions, usages et « Écouter, simplement », scènes de maison/train/studio, bandeau produit et action, pied. Mesurer les compositions distinctes du desktop et de la version mobile complète ; ne pas simplement réduire le desktop à l’échelle.

### 05 — La marque, planches 02 et 04

« Suivre sa propre fréquence », photo et contenu de marque, « Moins de bruit visuel. Plus de place à l’écoute », principes numérotés et « À votre rythme », action produit et pied. Le positionnement éditorial de démo reste possible, mais aucune histoire de fabrication, fondateur, certification ou résultat commercial inventé.

### 06 — Journal, planches 02 et 04

« Sur la même fréquence », article vedette et cartes pour Créer son moment d’écoute, Le casque au quotidien, Les détails qui changent la ligne, Prendre soin des coussinets et Un bureau, une parenthèse ; éventuels filtres et liens, newsletter et pied. Respecter la hiérarchie et les formats photo des cartes.

Chaque carte ouvre un article complet, propre à son sujet, avec hiérarchie, photos et liens associés. Les pages d’article non dessinées sont des déclinaisons cohérentes de la direction ONDE, pas des maquettes supplémentaires prétendument retrouvées. Ne pas servir le même contenu sous cinq titres différents.

### 07 — Panier, planches 03 et 06

Panier rempli, titre « La suite s’écoute ici » ou le titre mobile montré, miniature complète, nom et Graphite & lime, quantité +/- et suppression, sous-total recalculé, frais à calculer, action commande et retour découverte. Compteur et conservation au rechargement cohérents.

Reprendre aussi le **panier vide** « Votre panier attend sa première ONDE » et le **tiroir panier** complets de la planche 06 : ouverture/fermeture, focus, fond, retour, actions, modification et synchronisation avec la page panier. Un état vide ne montre pas une quantité fictive ni un total résiduel.

Livraison inconnue = « Calculée à l’étape suivante ». Ne pas présenter 149 € comme total final tout compris. Le sous-total et le total produits sont distincts du total après livraison/taxes applicables. Aucune promotion, livraison gratuite ou urgence inventée.

### 08 — Commande, planches 03 et 06

Reprendre les écrans **Informations → Livraison → Paiement → Confirmation** : progression, formulaire et récapitulatif, version mobile et commande repliable. Conserver les données lors des retours, valider les champs et afficher des erreurs utiles, garder les totaux exacts.

La planche montre des champs de carte et une confirmation avec promesse d’e-mail : **en démo, les remplacer par un parcours explicitement simulé**, sans débit, saisie de vraie carte, inscription, e-mail ni colis envoyé. L’étape Paiement est un exemple testable sans données bancaires. Confirmation « exemple de confirmation », pas de commande prétendument enregistrée ni d’e-mail prétendument envoyé. Le numéro et l’adresse d’exemple, s’ils sont affichés, sont clairement fictifs.

En réel, brancher les services existants de la plateforme, pas un formulaire local jouant au paiement. Préciser les limites de personnalisation du checkout Shopify, comptes clients et exports statiques. Aucune nouvelle API ou prestation payante dans cette mission. Newsletter facultative et décochée.

### 09 — FAQ, planches 03 et 07

« À l’écoute de vos questions », recherche, catégories Casque/Utilisation/Commande, accordéons et accès contact. Reprendre les états ouverts/fermés, séparateurs et icônes. Recherche et filtres combinés fonctionnent, état sans résultat utile, clavier et toucher accessibles.

La notice n’est pas fournie dans ce dossier : pas de faux téléchargement. Prévoir un champ éditable et un état « Notice à ajouter » dans la démo. Ne pas présenter une génération d’exemple comme notice fabricant.

### 10 — Contact, planches 03 et 07

« On vous écoute », texte et formulaire nom/e-mail/sujet/message, accord volontaire non précoché, bouton et autres accès Aide en ligne / Guide / Suivi tels que montrés. Coordonnées du projet réutilisées, jamais inventées. Validation et état d’envoi réels si intégration configurée ; sinon simulation clairement indiquée, aucun faux « message envoyé » après un simple toast.

### 11 — Livraison et retours, planches 03 et 07

« La bonne information », introduction, liens/onglets Livraison/Suivi/Retours, détails, contact et pied. Frais, zones, délais, retours et garanties sont configurables et restent à compléter lorsqu’inconnus. Conserver les mentions de conditions commerciales à compléter avant mise en ligne ; ne pas inventer un délai pour remplir la maquette.

### 12 — Suivi, planches 03 et 07

« Retrouvez votre commande », numéro de commande et e-mail utilisés lors de l’achat, action, aide/contact et pied. Démo avec résultat fictif clairement identifié ; réel via l’intégration existante et contrôle d’accès. Aucun accès public à des données de commande par un numéro prévisible, aucun statut transporteur inventé.

### Navigation, autres états et légal

Menu mobile complet de la 06, fermeture/focus/retour, compteur panier et tiroir synchronisés ; en-têtes, pieds et liens utilisables sur chaque page. Navigation, recherche si présente et ancres conduisent à une destination valide.

Liens mentions, CGV et confidentialité accessibles ; contenus à compléter selon les données légales du client. Cookies accepter/refuser/personnaliser, choix mémorisé et modifiable, pas de traceur facultatif avant accord. Prévoir les états d’erreur et page introuvable dans le même système, sans ajouter un espace compte ou une gamme de produits non demandés.

## Données et promesses de démonstration

Les maquettes emploient un vocabulaire promotionnel et « casque sans fil ». Elles ne prouvent pas la connectivité, autonomie, réduction de bruit, qualité acoustique, compatibilité, poids, résistance, garantie ni contenu de boîte d’un produit réel. Garder le positionnement illustratif en démo et marquer les caractéristiques inconnues « À confirmer », sans transformer une image en certification technique. Ne pas créer d’avis, notes, nombre de ventes ou bénéfice santé.

Les informations visuelles connues — graphite, noir tissu, détails lime et modèle unique — restent cohérentes. Les mots d’une maquette ne doivent pas remplacer les caractéristiques réelles d’un autre client lors de l’adaptation.

## Studio, adaptation client et exports

1. Démo ONDE complète visitable avant « Choisir ce thème », sans mutation du projet ni appel IA ; choix unique même en double clic. Ne pas casser les autres démonstrations.
2. Après choix, conserver la composition et remplacer logo, produit, images, textes, prix et informations par ceux du client. Aucun casque, mot ONDE, Graphite & lime ou prix 149 € parasite chez un client différent. Le thème E-commerce mono-produit n’impose pas le casque comme secteur commercial.
3. Tous les blocs, textes, images, couleurs et informations restent éditables, sauvegardés et conservés au rechargement. Prouver remplacement d’une photo, d’un titre et d’un prix, duplication/déplacement d’une section et export. Une page entière aplatie ne répond pas au besoin.
4. Conserver les familles, forfaits, droits, budgets et moteurs existants. Ne pas modifier globalement facturation, sécurité, stratégie marketing ni les autres projets. Hébergement natif/domaines reste hors périmètre V2.
5. Tester les exports supportés avec les médias locaux réellement présents ; préciser les fonctions exigeant un backend ou la plateforme. Ne pas promettre qu’un export statique traite paiement ou suivi réel.

## Recette : fidélité au pixel près et fonctions réellement vérifiées

1. Fournir une matrice exhaustive planche → panneau → route → sections → médias → actions → preuves → état. Inclure les sept planches, douze pages, quatre étapes de commande, états vide/tiroir/menu/erreur et versions mobiles.
2. Mesurer les limites des panneaux de site hors légendes et cadres de téléphone, leurs dimensions, couleurs, marges, alignements, polices, tailles, graisses, interlignages, retours de titres, rayons et cadrages. Ne pas choisir un gabarit proche par commodité.
3. Capturer le rendu aux **mêmes dimensions que les panneaux de référence** ; fournir côte à côte, superposition à 50 % et image des différences pour chaque page et état montré. Ne pas comparer deux échelles différentes. Ne pas masquer un titre, une photo, une section ou un pied qui ne correspond pas. Les légendes hors site et l’anticrénelage peuvent être isolés avec justification, pas utilisés pour excuser une différence de composition.
4. Corriger les écarts du premier au dernier bloc. Tester aussi 1440 px, 390 px, 360 et 430 px : pas de débordement horizontal ni bouton masqué, galerie/menu/formulaire utilisables, quantité et prix visibles, barre mobile ne recouvre rien. Les maquettes mobiles complètes priment pour les compositions représentées.
5. Vérifier tous les parcours : navigation et menu, galerie/zoom/ancres, bon produit/quantité, ajout depuis fiche/boutique/barre/tiroir, suppression/persistance/totaux, commande simulée et confirmation, journal/articles, FAQ/recherche/catégories, formulaires, livraison/suivi selon support, légal/cookies/404. Aucun paiement ni envoi réel de test.
6. Vérifier édition/sauvegarde/rechargement, adaptation à un projet fictif différent et exports, avec fichiers décodables et chemins valides. Exécuter les contrôles requis du dépôt et `verifier-theme` pour toute modification du thème. Une CI verte ne prouve pas l’identité visuelle.
7. Livrer PR/SHA, captures complètes, comparaisons/superpositions/différences, résultats réellement vérifiés, inventaire des médias utilisés/non utilisés et écarts résiduels précis. Aucune conformité parfaite annoncée si une police ou photo diffère. Distinguer branche livrée, fusion et version réellement servie dans le studio. Thomas valide le rendu.

Poursuivre jusqu’à un résultat complet et révisable ; signaler un manque précisément et avancer sur les parties indépendantes. Préserver SILLON, SOUPLE, Parenthèse, Maison & Horizon, NOCTIL, MUSEAU CLUB, TRAVERSE, Atelier Rive, HEUREN et les autres travaux. Aucun appel IA payant ni régénération de médias côté Claude, aucune nouvelle personne, banque d’images ou marque externe, suppression de données, fusion ou déploiement automatique.
