# FRAISE GUMMIES — reproduction des sept maquettes corrigées, au pixel près

## Demande de Thomas — 24 octobre 2026

Thomas demande **le même thème que les maquettes, au pixel près**, ordinateur et mobile, avec toutes les pages, sections, états et fonctions. Il fournit lui-même les ZIP de toutes les images. Aucune nouvelle direction, simplification ou substitution par le gabarit d’un autre thème.

L’objectif est une reproduction exacte prouvée par comparaisons, superpositions et différences. Ne pas annoncer « identique » si des écarts de composition, police ou photo demeurent. Thomas valide le rendu final. Corriger les coquilles de génération et les chiffres contradictoires sans réécrire toute la page.

Lire `CLAUDE.md` en entier et les instructions applicables. Vérifier les travaux récents de #167 et les missions thèmes #179, #180, #182 et #183. Récupérer uniquement `docs/theme-briefs/fraise-gummies/` dans les travaux applicatifs récents ; ne pas remplacer la branche actuelle par le main ancien de cette branche documentaire. Une seule conversation à la fois sur les mêmes fichiers partagés, avec coordination des missions en cours.

FRAISE garde l’identifiant `fraise` et la **famille Produit spécifique / Boutique spécialisée**. Les trois formats sont trois offres du même produit de confiserie, pas trois parfums ni trois thèmes. La base riche actuelle reste à préserver et améliorer selon les nouvelles planches, sans retour à un accueil générique ou aux anciennes références Lumora utilisées seules.

## Les sept maquettes à ouvrir réellement

Les fichiers ci-dessous proviennent du **ZIP de sept maquettes mis à jour avec les corrections de packs**, conservés sans modification. Ne pas repartir des premières versions non corrigées ou des variantes intermédiaires portant un ancien prix.

| Référence | Pages et états |
| --- | --- |
| [01 — Ordinateur accueil et produit](maquettes/01_Ordinateur_Accueil_Produit.png) | 01 Accueil riche complet ; 02 Les gummies / fiche produit |
| [02 — Ordinateur boutique, recette, histoire et journal](maquettes/02_Ordinateur_Boutique_Marque_Journal.png) | 03 Boutique ; 04 La recette ; 05 Notre histoire ; 06 Journal |
| [03 — Ordinateur achat et assistance](maquettes/03_Ordinateur_Achat_Assistance.png) | 07 Panier ; 08 Commande ; 09 FAQ ; 10 Contact ; 11 Livraison/retours ; 12 Suivi |
| [04 — Mobile accueil et produit](maquettes/04_Mobile_Accueil_Produit.png) | Accueil 1/2 et 2/2, fiche 1/2 et 2/2 ; packs corrigés et contenus jusqu’au pied |
| [05 — Mobile boutique, recette, histoire et journal](maquettes/05_Mobile_Boutique_Marque_Journal.png) | Quatre pages mobiles complètes ; offre unitaire sans prix barré |
| [06 — Mobile assistance](maquettes/06_Mobile_Assistance.png) | FAQ, contact, livraison/retours et suivi |
| [07 — Mobile achat et navigation](maquettes/07_Mobile_Achat_Menu.png) | Panier rempli/vide, informations, livraison, paiement illustratif, confirmation, menu ouvert et tiroir panier |

Ce sont des planches composites, pas sept pages. Ouvrir les **sept PNG** avec un outil visuel et relever chaque panneau et section. Les cartouches externes, légendes et cadres de présentation ne sont pas des éléments du site. Les versions mobiles complètes 04 à 07 gouvernent les compositions mobiles, pas une réduction miniature du desktop.

## Offres fermes et mise en avant des prix en pack

La correction de Thomas prime sur tout chiffre mal lisible dans une planche, une ancienne fixture ou une étiquette générée. Les montants ci-dessous sont des prix de démonstration, à centraliser **en centimes entiers** :

| Offre | Flacons dans un pack | Prix TOTAL du pack, bien visible | Message demandé | Référence à l’unité |
| --- | ---: | ---: | --- | ---: |
| 1 flacon | 1 | **16,60 €** | Offre unitaire, **aucun prix barré** | 16,60 € |
| 2 flacons | 2 | **24,90 €** | **−50 % sur le deuxième** | 2 × 16,60 € = 33,20 € |
| 3 flacons | 3 | **33,20 €** | **2 achetés + 1 offert** | 3 × 16,60 € = 49,80 € |

- Le prix total du pack est le montant principal : fort contraste, grand corps et visible sur ordinateur ET mobile. 12,45 €/flacon et ≈11,07 €/flacon peuvent apparaître en secondaire, jamais remplacer 24,90 € et 33,20 € comme prix d’achat principal. Un prix unitaire arrondi ne recalcule pas le total du pack.
- Le pack de deux économise 8,30 € : 50 % sur le deuxième flacon, **25 % sur l’ensemble**, pas « −50 % sur le pack ». Le pack de trois économise 16,60 € par rapport à trois unités, soit le troisième offert.
- **Aucune réduction ni faux ancien prix sur le flacon seul.** Si 33,20 € ou 49,80 € est barré sur les lots, l’identifier comme comparaison avec l’achat de deux/trois unités, pas comme ancien prix de vente prétendument pratiqué. Pas de badge de popularité inventé.
- Les photos de cartes montrent exactement un, deux et trois flacons. Les badges et prix restent en texte éditable ; pas de prix incrusté dans l’image.
- Partout : accueil, fiche, boutique, barre mobile, tiroir, panier et commande, même offre, même quantité et même prix. L’ancienne base FRAISE à 24,90 € l’unité et les anciens compare-at ne sont plus la référence.
- Modéliser explicitement **quantité de packs** et **flacons par pack** : deux packs de trois = six flacons et 66,40 €, un pack de deux + un pack de trois = cinq flacons et 58,10 €. Ne pas multiplier 24,90 € par deux pour vendre un seul pack de deux et ne pas facturer le flacon offert. Pas de requalification silencieuse d’un panier mélangé en offre différente sans action du client.
- Les exemples de panier à un flacon montrent 16,60 € de sous-total. Livraison non renseignée = calculée à l’étape suivante ; ne pas afficher 16,60 € comme total final tout compris alors que les frais restent inconnus.

`OFFRES_VALIDEES.json` fournit ces données et exemples de calcul. Prévoir des contrôles utiles sur les calculs et la synchronisation des offres, pas seulement sur les libellés.

## Fidélité du dessin

- Palette fraise/corail, crème et teintes sombres, logo et illustrations du flacon identiques aux planches. Relever les couleurs, polices, tailles, graisses, rayons, bordures et espacements ; ne pas recopier automatiquement le système typographique d’ONDE, le header flottant de SILLON ou les couleurs de SOUPLE.
- Reprendre les dessins d’en-tête et pieds, navigation, recherche, panier, bandeaux, titres, lignes de texte, hiérarchie et photos aux bons emplacements. Les recettes/histoire/journal gardent leurs compositions particulières.
- Conserver toutes les sections riches de l’accueil et de la fiche, y compris celles sous plusieurs hauteurs d’écran. Aucun bloc retiré pour gagner du temps et aucune capture de site aplatie utilisée comme page.
- Réaliser les éléments de page, icônes et petites illustrations en code/SVG éditable lorsqu’approprié. Les photographies sont des fichiers indépendants sans boutons ni titres web incrustés. Utiliser le logo existant et la signature des planches, pas une nouvelle marque.
- Le flacon reste le même : même forme, bouchon, étiquette, couleur et gummies. Aucun parfum supplémentaire ni médicament/gélule. Les images de fraises illustrent le goût ; elles ne constituent pas la preuve d’une recette, d’une teneur en fruit ou d’une certification.
- Les mouvements non définis par une image fixe prolongent le dessin avec retenue, sans déplacer la mise en page ou masquer du contenu. Respecter la réduction des animations. Ne pas annoncer une animation source « identique » à partir d’une simple image.

## Images livrées séparément dans les ZIP

Thomas transmet les ZIP indépendants, tous inférieurs à 30 000 000 octets et volontairement plus petits que ce plafond. Les extraire ensemble dans `FRAISE_DOSSIER/`. Les médias originaux du kit et les compléments HD sont distingués dans `INVENTAIRE_IMAGES.csv`, avec dimensions natives, octets et SHA-256 ; `AFFECTATIONS.csv` et `CATALOGUE.html` donnent leurs usages.

Les compléments, détourages et photos de packs sont des **reconstitutions guidées par les maquettes, pas leurs sources photographiques exactes**. Les sept planches intactes demeurent la référence visuelle. Utiliser leurs pixels propres pour les petites vignettes si cela sert la fidélité, en gardant leur vraie résolution ; utiliser les compléments adaptés et caler le cadrage des grands blocs. Un écart de photo ou d’étiquette doit être montré et corrigé/documenté, pas caché sous « pixel parfait ». Aucun agrandissement artificiel d’une capture présenté comme photo HD.

Les détourages ont un alpha réel et servent aux offres un/deux/trois, aux compositions et miniatures. Préserver les bords et les transparences, sans rectangle crème autour du produit. Un détail macro ne remplace pas une vue principale entière. Pas de duplication artificielle d’une même photo pour inventer une galerie plus fournie. Les originaux antérieurs non nécessaires restent identifiés comme réserve, sans ajouter une section étrangère pour les caser.

Les photos de production restent dans **le kit privé FRAISE**, via le mécanisme existant (`public/demo/fraise/` et les chemins privés d’import déjà prévus). Seules les maquettes et la consigne sont publiées sur GitHub dans cette livraison. Ne pas copier automatiquement les ZIP de médias dans le dépôt public. Aucun aperçu d’image dans la conversation : Thomas les consulte dans les ZIP.

Les ZIP sont contrôlés après enregistrement puis téléchargement de retour : tailles, SHA-256, CRC et extraction complète. À réception, exécuter le script de vérification joint avant intégration. Si un fichier reçu ne correspond pas, indiquer le nom, les octets reçus et attendus ; ne pas continuer avec une archive tronquée ni déclarer un média absent sans vérifier.

## Douze pages et états à réaliser

### 01 — Accueil, références 01 et 04

Header, navigation et recherche/panier ; ouverture « Votre rituel », flacon et fraises ; goût et détails du produit ; sections de bénéfices visuels et format ; scènes du quotidien ; **trois offres avec prix totaux de pack bien mis en avant** ; recette et informations ; journal ; FAQ ; newsletter et pied. Relever l’ordre exact sur les planches et préserver les panneaux d’accueil 1/2 ET 2/2 du mobile.

Les boutons de découverte ouvrent la fiche ou la section pertinente. Les actions d’ajout des cartes ajoutent le bon pack au bon prix, pas systématiquement l’unité ni le pack précédemment sélectionné ailleurs.

### 02 — Les gummies / fiche produit, références 01 et 04

Galerie réelle et zoom utilisable, titre et présentation, sélection des trois formats, photos de la bonne quantité, messages d’offre et prix totaux, quantité de packs, ajout, réassurance sans promesse inventée. Reprendre les onglets/ancres, « Le goût fraise », « Des détails », recette, texture, format et étiquette, usages, informations ingrédients/nutrition/utilisation/conservation, FAQ, barre d’achat mobile et pied.

La sélection est visible, accessible au clavier et cohérente avec la barre mobile. Changer de lot met à jour l’offre et l’image pertinentes sans créer un quatrième format ou perdre la quantité. La barre d’achat ne masque ni texte, ni pied, ni cookies, ni clavier ou formulaire. Le zoom/menu ont un focus et une fermeture corrects.

### 03 — Boutique, références 02 et 05

« À chacun son format », introduction, cartes un/deux/trois avec actions et prix de pack, détails éditoriaux, format du quotidien et pied. Le même produit en trois offres, pas une collection de trois saveurs. Chaque carte correspond aux quantités physiques et règles d’offre validées ; les calculs ne sont pas du texte décoratif.

### 04 — La recette, références 02 et 05

« La fraise, sous toutes ses facettes », grandes photographies, détails de texture/goût/flacon, sections ingrédients, valeurs nutritionnelles, utilisation et conservation, scènes de quotidien et pied. Les informations non fournies restent à compléter depuis l’étiquette ; ne pas inventer une formule pour remplir les paragraphes.

FRAISE est une **confiserie alimentaire**, pas un complément alimentaire ni une vitamine. Aucune promesse de santé, dosage quotidien, bienfait thérapeutique, allégation nutritionnelle, origine, certification, allergène absent ou « sans sucre » inventé. La mention « 60 douceurs » montrée est une donnée illustrative de démo à confirmer pour un produit réel ; ne pas la transférer à un autre client. « Goût fraise » n’affirme pas une teneur en vraies fraises. Préserver la composition en rectifiant seulement les affirmations non établies.

### 05 — Notre histoire, références 02 et 05

« Un peu de fraise dans le quotidien », photographies, principes et détails, univers gourmand, « Voir la vie côté fraise », liens et pied. Le texte de marque illustratif peut être conservé, sans faux fondateur, atelier réel, date de création, fabrication ou preuve environnementale. « Réutilisable » reste à confirmer pour un produit réel et ne prouve pas une certification.

### 06 — Journal, références 02 et 05

« Les petites parenthèses FRAISE », catégories si présentes, article vedette « Les détails d’un petit rituel », cartes « Le goût fraise en images », « Une pause côté cuisine », « Le flacon sous tous les angles », « Lire une étiquette », newsletter et pied. Navigation et filtrage réels avec état sans résultat lorsque nécessaire.

Chaque carte ouvre un article propre, complet et illustré, pas le même contenu sous plusieurs titres. Les articles non dessinés sont des déclinaisons de cette direction, pas de nouvelles maquettes prétendument retrouvées. Ne pas produire des conseils de santé ou ingrédients non prouvés sous couvert d’article de démo.

### 07 — Panier, références 03 et 07

« Votre panier, côté fraise », bonne miniature et format choisi, quantité de packs, nombre de flacons, suppression, sous-total recalculé, livraison à calculer, commande et retour achats. Reprendre aussi panier vide et tiroir, ouverture/fermeture, compteur, synchronisation et persistance au rechargement.

Une ligne distingue 1 pack de 3 flacons de 3 packs unitaires : 33,20 € contre 49,80 €. Tester mélanges, ajouts répétés, modifications et suppression du dernier article. Aucune remise fictive supplémentaire, aucun faux stock, compte à rebours ou supplément/protection précoché. Ne pas réintroduire l’ancien prix unitaire de la fixture ni un faux total final hors livraison.

### 08 — Commande, références 03 et 07

Informations → Livraison → Paiement → Confirmation, progression, récapitulatif et validation des champs, retours sans perte de données, bonnes offres et totaux, version mobile complète. Le consentement newsletter est facultatif et décoché.

**Démo explicite sans débit ni envoi réel.** L’étape Paiement reste un exemple sans saisie de vraies données bancaires ; ne pas brancher un faux formulaire local sur une promesse de paiement. La confirmation est une simulation, pas une commande ou un e-mail prétendument enregistré/envoyé. Les données de commande sont fictives et signalées comme telles.

Pour un vrai client, réutiliser les intégrations de sa plateforme, expliquer les limites du checkout Shopify et des exports statiques. Aucun nouveau prestataire payant ou appel IA de test. Une boutique statique ne traite pas à elle seule paiement, commande ou livraison.

### 09 — FAQ, références 03 et 06

« On vous répond avec plaisir », recherche, catégories Produit/Utilisation/Commande, accordéons ouverts/fermés et contact. Recherche et filtrage combinés, état vide utile, clavier et toucher. Réponses composition/conservation/utilisation renvoient à l’étiquette et données confirmées, pas à une recette inventée.

### 10 — Contact, références 03 et 06

« Un petit mot ? », formulaire nom/e-mail/sujet/message, consentement volontaire décoché, action et liens FAQ/livraison/suivi, éléments graphiques et pied. Réutiliser les coordonnées du projet, sans fausse société ou adresse. Validation réelle et messages d’erreur. Succès seulement après envoi confirmé par une intégration configurée ; sinon simulation annoncée, pas un toast « envoyé » trompeur.

### 11 — Livraison et retours, références 03 et 06

« Les infos qui vont avec », sections/onglets Livraison/Suivi/Retours, pictogrammes, lien contact, informations et pied. Frais, zones, délais et conditions restent configurables et à compléter. Ne pas appliquer une politique de retour inventée ni l’ancienne livraison offerte d’exemple en la présentant comme confirmée.

### 12 — Suivi, références 03 et 06

« Où en est votre FRAISE ? », numéro et e-mail d’achat, action, aide et pied. En démo, résultat fictif identifié ; en réel, intégration existante et contrôle d’accès, aucun accès à une commande par numéro prévisible et aucun statut transporteur inventé.

### Navigation, légal et autres états

Reprendre le menu mobile ouvert, la recherche et ses destinations, le compteur et le tiroir de la 07, navigation et pieds de toutes les pages. Les liens légaux sont accessibles ; identité légale et textes à compléter selon le projet, année cohérente sans recopier mécaniquement 2024. Cookies accepter/refuser/personnaliser, choix mémorisé et rouvrable, aucun traceur facultatif avant accord. Prévoir erreurs et 404 cohérents sans les présenter comme des panneaux source supplémentaires.

Avis/notes seulement si la composition les comporte, clairement fictifs en démonstration et remplaçables par des données réelles ; pas de témoignages, chiffres de vente, garanties ou popularité réels inventés. Ne pas ajouter de faux avis pour « améliorer » la conversion.

## Studio, personnalisation et exports

- Démo FRAISE complète visitable avant choix explicite, sans mutation du projet ni appel IA. Choix unique même en double clic. Ne pas casser les autres démonstrations.
- Après choix, conserver la composition et remplacer produit, photos, logo, textes, prix, offres et informations par ceux du client. Aucun résidu FRAISE, goût fraise, 60 douceurs ou prix de démo dans un autre projet. Les offres de Thomas ne deviennent pas une promotion imposée à chaque client.
- Tout reste éditable, enregistré et conservé au rechargement : sections, textes, photos, couleurs, prix, formats et règles d’offre. Prouver remplacement de photo/prix/titre, duplication/déplacement de section, sauvegarde/rechargement et exports supportés.
- Conserver forfaits, familles, droits, budgets, moteurs, autres thèmes et projets. Ne pas refaire facturation, sécurité, stratégie ou hébergement natif/domaines dans cette mission.
- L’export contient les vrais médias et réglages ; distinguer les fonctions de thème de celles nécessitant la plateforme ou un backend. Les adaptations client ne doivent pas transformer la page riche en gabarit vide.

## Recette au pixel près et preuves de fonctionnement

1. Matrice exhaustive : planche → panneau → route → sections → fichiers → offre/action → preuve → statut. Inclure sept planches, douze pages, quatre étapes de commande, menu, panier rempli/vide/tiroir, erreurs et mobile.
2. Mesurer les panneaux hors légendes externes : blocs, alignements, couleurs, photos/cadrages, polices, corps, graisses, interlignages, retours à la ligne et rayons. Une cellule desktop réduite dans une planche n’est pas automatiquement un viewport mobile : déterminer l’échelle de présentation et documenter le viewport et le facteur utilisés pour comparer.
3. Fournir captures complètes, côte à côte, **superpositions à 50 % et images des différences**, à la même échelle que chaque panneau de référence. Ne pas masquer titres, photos, pieds ou sections divergents. Les corrections de prix et de données inconnues doivent être précisément expliquées, pas invoquées pour justifier une autre mise en page.
4. Corriger les écarts de dessin du premier au dernier bloc ; aucune conformité déclarée par simple pourcentage arbitraire. Une photo ou police différente reste un écart montré tant qu’elle diffère. Tester 1440 px, 390 px, 360 et 430 px, sans débordement horizontal, zoom cassé ou action cachée. Les références mobiles complètes priment sur une simple réduction du desktop.
5. Tester navigation/recherche/menu, galeries/zoom/ancres, packs 1/2/3 et prix 1660/2490/3320 centimes, quantité de packs/flacons, ajouts directs/barre/tiroir, mélanges, suppression et persistance, frais inconnus et calculs de commande simulée. Tester journal/articles, FAQ, formulaires, suivi selon support, légal et cookies. Aucun paiement ni envoi réel de test.
6. Tester édition/sauvegarde/rechargement, adaptation à un client distinct, exports et médias décodables. Exécuter les contrôles requis du dépôt et `verifier-theme` pour tout changement de thème ; une CI verte ne prouve pas la fidélité visuelle.
7. Livrer PR/SHA, captures, comparaisons/superpositions/différences, résultats réellement vérifiés, matrice des médias utilisés/non utilisés et écarts restants précis. Distinguer branche livrée, fusion et version servie. Thomas valide le rendu final.

Poursuivre jusqu’à une version complète et révisable. Préserver ONDE, SILLON, SOUPLE, Parenthèse, Maison & Horizon, NOCTIL, MUSEAU CLUB, TRAVERSE, Atelier Rive, HEUREN et les autres missions. Aucun appel IA payant ni génération de médias côté Claude, aucune nouvelle personne, banque d’images, marque externe, suppression de données, fusion ou déploiement automatique.
