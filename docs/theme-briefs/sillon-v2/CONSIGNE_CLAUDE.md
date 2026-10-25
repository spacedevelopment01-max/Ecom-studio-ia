# SILLON V2 — reproduction exacte des trois planches validées

## Demande expresse de Thomas — 24 octobre 2026

> « Je veux exactement la même chose au pixel près, il se demerde mais je veux ce thème la »

Cette exigence est le critère de réception. Thomas a validé **la V2 au header flottant**, puis demandé la transmission des maquettes, de la consigne et de toutes les images. Il n'autorise ni nouvelle direction artistique ni simplification. « Très proche », « inspiré de », une page d'accueil isolée ou une adaptation du gabarit d'un autre thème ne répondent pas à sa demande. Ne pas annoncer une conformité au pixel près sans preuves ; corriger les écarts et les signaler tant qu'ils subsistent. Thomas seul valide le rendu final.

Lire `CLAUDE.md` en entier, les instructions applicables et l'état actuel des missions #167, #148, #172, #179 et #180 avant de modifier le code. Cette livraison est documentaire : récupérer uniquement `docs/theme-briefs/sillon-v2/` dans une branche fondée sur les travaux applicatifs récents. Ne pas repartir de l'ancien main de cette branche de brief en écrasant les missions en cours. Coordonner les fichiers partagés avant intervention ; une seule conversation à la fois sur les mêmes fichiers.

## Références figées — seulement les trois planches V2 suivantes

| Planche originale | Dimensions natives | Pages et états |
| --- | --- | --- |
| [01 — Accueil et machine](maquettes/01-accueil-machine.png) | 1415 × 1112 | 01 Accueil complet ; 02 Fiche machine complète |
| [02 — Rituel, marque, carnet et article](maquettes/02-rituel-marque-carnet-article.png) | 1024 × 1536 | 03 Le rituel ; 04 SILLON ; 05 Carnet ; 06 Article |
| [03 — Achat, aide et mobile](maquettes/03-achat-aide-mobile.png) | 1024 × 1536 | 07 Panier ; 08 Commande ; 09 FAQ ; 10 Contact ; 11 Livraison et retours ; 12 Suivi ; mobile accueil, produit, menu ouvert et panier |

**Ouvrir réellement les trois PNG** avec un outil de lecture visuelle. Ce sont des images composites de douze pages et de plusieurs états, pas trois pages. Chaque section visible jusqu'au pied appartient au périmètre.

Les premières variantes du 24 octobre à 12 h 48 UTC et la « Maquette SILLON corrigée, boutons cuivre seuls » sont dépassées. Ne pas les mélanger à la V2 de 13 h 01 UTC. Les anciens aperçus SILLON du dépôt et les autres thèmes ne sont pas des références de composition.

Classement : conserver **Produit spécifique / Boutique spécialisée**, identifiant `sillon`, comme prévu par #148 et `CLAUDE.md`. La V2 remplace le rendu de SILLON, elle n'est pas un nouveau thème à côté. Un produit principal de démonstration : machine à espresso nomade brun espresso/cuivre avec bouton cuivre et verre transparent. **129 € est un prix illustratif de démonstration**, pas une donnée marchande confirmée.

## Ce qui doit être identique

- Header flottant en capsule ivoire, détaché du haut, contenu et proportions de navigation, petit bouton Découvrir sombre et panier cuivre séparé. Il survole la photo sur les pages à ouverture photo et garde sa place propre sur les pages claires. Respecter la réorganisation mobile : logo, menu et panier, sans miniaturiser toute la navigation.
- Grands titres très condensés, massifs, étroits, capitales et retours à la ligne exacts. Identifier et mesurer la police la plus fidèle autorisée ; si la police source ne peut pas être identifiée, le dire et montrer l'écart au lieu de prétendre l'avoir retrouvée. Les polices doivent être fournies/licenciées correctement, sans police de marque récupérée illégalement.
- Palette crème minérale, brun espresso presque noir, cuivre brûlé, vert grisé du Carnet ; contrastes, teintes, graisses, rayons et contours de chaque bloc. Échantillonner les planches, ne pas imposer un kit de couleurs générique.
- Ouverture immersive du van et de la route, produit qui dépasse entre les sections, cercles cuivre derrière la machine, blocs asymétriques et photos en collage ; densité de contenu et différences propres à chaque page.
- Courbes de niveau topographiques fines, chemins sinueux cuivre et points d'étape. Les recréer en SVG/CSS éditables, avec tracés, épaisseurs, positions et opacités mesurés ; ne pas les remplacer par une vague décorative quelconque.
- Très grands chiffres 01/02/03, compositions en escalier, onglets arrondis, flèches en cercle, contrastes pleins/contours, bandeaux cuivre et pieds de page tels qu'ils apparaissent. Les pieds des pages 03 à 06 sont clairs, ceux de l'accueil et de la fiche sont sombres : ne pas uniformiser ces différences.
- Wordmark SILLON simple du header et très grands lettrages des blocs/pieds de la V2. **Ne pas réintroduire le logo cursif ancien**, qui n'est pas celui de ces maquettes ; reconstruire le lettrage éditable de la V2 en respectant ses proportions. Pas de nouveau symbole.
- Reprendre les textes lisibles, la hiérarchie et les intitulés des boutons. Corriger une coquille manifeste d'image générée sans réécrire le discours ni changer la longueur des blocs. Ne pas afficher les titres externes « 01 — Accueil » ou le cartouche « Maquette • Prix illustratif » comme des sections du site ; conserver la mention de démonstration adaptée dans l'interface.
- Les seules adaptations nécessaires sont les états fonctionnels absents des planches, la lisibilité entre les largeurs et les corrections factuelles décrites plus bas. Elles prolongent la V2 ; elles n'autorisent pas à changer une composition déjà montrée.

## Médias livrés par Thomas

Les ZIP indépendants font **moins de 30 000 000 octets chacun**. Tous s'extraient dans le même dossier `SILLON_V2_DOSSIER/`. Ils contiennent les trois originaux, les photographies, un catalogue, les affectations, les dimensions et les empreintes SHA-256. Les maquettes sont déjà disponibles sur GitHub ; ne pas attendre un ZIP unique de plus de 30 Mo pour commencer leur analyse.

`INVENTAIRE_IMAGES.csv` distingue les photographies du kit SILLON conservées sans modification des photos complémentaires guidées par les scènes V2. Les compléments sont des **reconstitutions**, pas les photographies sources originales exactes des maquettes. Les dimensions natives sont indiquées ; ne pas inventer une résolution 4K. Les maquettes intactes restent la référence visuelle prioritaire, y compris lorsque le complément présente un écart.

Pour obtenir la fidélité exigée, établir une matrice de chaque emplacement photo. Quand la zone photo d'une planche est propre, sans interface, en extraire les pixels exacts pour les vignettes et les comparaisons, en gardant la résolution réelle. Pour une grande scène avec texte superposé, utiliser le média fourni le plus fidèle et régler précisément le cadrage, la composition et les couches éditables. Ne pas masquer un écart de photo par une mention « identique ». Si la photo source exacte reste nécessaire, le noter précisément avec une comparaison ; ne pas dégrader silencieusement toute la page ni conclure prématurément à sa validation.

Le détourage transparent est destiné au surplomb et aux compositions du produit, pas à remplacer toutes les photos de situation. Respecter l'alpha natif ; pas de rectangle crème autour du produit. Les anciennes scènes bureau/hôtel/terrasse sont des réserves, pas des remplaçantes obligatoires des scènes van/montagne de la V2. Un média inutile reste identifié comme non utilisé au lieu d'ajouter une section étrangère pour le caser.

Ne pas modifier la machine, ses proportions ni ses couleurs entre les pages. Les pastilles espresso/cuivre et sauge montrées sur la maquette ne prouvent pas l'existence d'une deuxième référence vendable : la seule variante fournie est espresso/cuivre. Montrer clairement une pastille alternative indisponible en démo plutôt que vendre un coloris inventé. Le coffret est illustratif : liste, connecteur, compatibilité et accessoires inclus restent à confirmer. Pas de nouvelle référence commerciale à partir de la pochette, de la tasse ou du sac du week-end.

## Pages à réaliser intégralement

### 01 — Accueil

Header flottant sur la photo du van, « PRENEZ LA TANGENTE. », cartouche sombre bas gauche et chemin cuivre. Ensuite « PETIT FORMAT. GRANDE ÉCHAPPÉE. » avec machine détourée chevauchant la jonction et cercle cuivre ; bloc sombre SILLON en contour avec deux photos superposées, route et points ; bandeau cuivre « LE DÉTOUR EN VAUT LA TASSE. » ; rituel en trois étapes reliées ; deux articles Dans le carnet ; pied sombre complet avec newsletter et liens. Tous les liens pointent vers une vraie destination. Ne supprimer aucun de ces blocs.

### 02 — La machine

Ouverture claire avec galerie et trois miniatures, titre à gauche, machine au centre, carte d'achat sombre à droite ; prix 129 €, pastilles, quantité et ajout cuivre ; liens livraison/aide/retours. Galerie avec vues réelles, sélection et zoom utilisable. Bandeau photo du van ; « 02 LE SENS DU DÉTAIL » et macros cuivre/bouton ; rituel sombre en trois photos ; contenu illustratif du coffret ; FAQ en catégories ; paysage final et barre d'achat flottante ; pied sombre complet.

L'achat flottant doit viser le bon produit, conserver quantité/variante et rester accessible sans masquer le pied, les cookies, le clavier ou les formulaires. Respecter les vues mobiles fournies et les zones de sécurité. Les cercles/chemins ne doivent pas bloquer les clics.

### 03 — Le rituel

Ouverture sombre « VOTRE PAUSE. VOTRE CADENCE. », machine et cercle cuivre, ligne de niveau ; limite ondulée claire ; trois étapes en escalier Préparez/Lancez/Savourez avec photos et route en pointillés ; entretien simple, lien notice et lien machine ; très grand pied clair SILLON.

La notice n'est pas fournie dans ce dossier. Le bouton ne doit pas ouvrir un faux PDF : état « Notice à ajouter » dans la démo et champ éditable pour un vrai document, ou notice de démonstration explicitement signalée. Ne pas inventer pression, batterie, temps de chauffe, température, étanchéité, garantie ou bénéfice santé.

### 04 — SILLON

Grande scène van/lac et « ON AIME LES DÉTOURS. », trois principes numérotés, macro verticale et deux petites photos de route/sentier, bandeau sombre « SUIVRE SON SILLON » avec trajet cuivre ; pied clair. Ne pas inventer histoire du fondateur, fabrication, certification ou preuve de durabilité. Le texte de positionnement de démonstration peut être conservé sans en faire une promesse technique vérifiée.

### 05 — Carnet

Ouverture vert grisé avec topographie et « CARNET D'ÉCHAPPÉES », filtres Tout/Sur la route/Le café/Entretien, grille asymétrique : article vedette van, lac/forêt, entretien, tasse, coucher de soleil ; numéros et flèches ; bandeau newsletter cuivre ; pied clair. Filtres réellement reliés aux catégories, états vides et navigation accessibles. Les articles visibles ont un contenu propre et complet, pas tous le même article sous un titre différent.

### 06 — Article

« LE CAFÉ EN VAN. », photo de couverture à droite, sommaire à ancres avec route verticale, paragraphes et citation cuivre, photo verticale de montagne, trois conseils numérotés en colonnes, bandeau machine avec prix de démo et action, deux autres articles ; pied clair. Reproduire cette composition pour l'article montré ; les autres articles sont des déclinaisons cohérentes, pas de nouvelles maquettes prétendument retrouvées.

### 07 — Panier

Titre « PRÊT POUR LE DÉPART ? », photo paysage et tracé cuivre, ligne produit avec miniature entière, nom, prix, quantité +/- et suppression ; carte sombre du récapitulatif, bouton cuivre, retour découverte. Panier vide, erreur et modification restent dans cette identité. Quantités et compteurs recalculés, conservation au rechargement, ajouts répétés cohérents.

**Correction factuelle obligatoire du prototype** : lorsque la livraison n'est pas connue, 129 € est le sous-total, pas un total final. Afficher Livraison « Calculée à l'étape suivante » et montant final à calculer ; ne pas garder un « Total 129 € » trompeur. Deux machines = 258 € de sous-total. Centraliser le prix illustratif.

### 08 — Commande

Progression 01 Informations / 02 Livraison / 03 Paiement, grand titre, paysage montagne et chemin cuivre, formulaire à gauche, récapitulatif sombre à droite ; retour panier. Les étapes suivantes et la confirmation non dessinées reprennent le même système, avec conservation des données, validation utile et retours possibles.

La démo reste testable sans débit, sans champ de carte réelle et sans e-mail envoyé. Utiliser une validation d'exemple explicitement simulée. En réel, se brancher aux fonctions de la plateforme ; décrire les limites du checkout Shopify et des exports statiques. Aucun nouveau prestataire payant ni faux succès d'achat.

### 09 — FAQ

« ON VOUS RÉPOND. », produit et cercle ?, recherche, filtres Machine/Utilisation/Commande, accordéons numérotés avec premier ouvert, bouton contact sombre, paysage et route. Recherche, filtrage et accordéons fonctionnent au clavier/toucher. Les réponses techniques non prouvées sont identifiées à confirmer.

### 10 — Contact

« ON GARDE LE CONTACT. », formulaire nom/e-mail/sujet/message, accord volontaire décoché, bouton cuivre ; photo verticale du van à droite, trois accès directs, paysage bas. Numéro de commande facultatif si contexte utile, erreurs par champ, vrai état d'envoi si intégration configurée ; sans service, indiquer une simulation, pas « message envoyé ». Réutiliser les informations du projet, sans coordonnées de société inventées.

### 11 — Livraison et retours

« LES INFOS DU VOYAGE. », trois sections numérotées avec icônes au trait Livraison/Suivi/Retours, grande découpe organique du paysage à droite, bloc contact sombre et liens légaux bas. Délais, frais, modalités et garanties restent configurables et à compléter, sans livraison gratuite ou politique de retour inventée.

### 12 — Suivi

« OÙ EN EST VOTRE SILLON ? », numéro de commande et e-mail, action cuivre, aide sombre, photo produit sur rocher dans paysage découpé et route cuivre. Démo : résultat d'exemple clairement signalé, pas de colis prétendument expédié. Réel : intégration existante et contrôle d'accès, aucun accès à une commande par simple numéro prévisible. Aucun envoi réel de test.

### Mobile et pages nécessaires non dessinées

Reprendre exactement les quatre références mobiles de la planche 03 : ouverture accueil, fiche avec barre d'achat, menu plein écran sombre avec paysage et route, panier. Adapter les autres pages dans la même logique. Les cadres physiques de téléphone et les légendes de planche ne sont pas des éléments du site.

Liens légaux, confidentialité et cookies accessibles ; contenu légal à compléter selon le projet, préférences accepter/refuser/personnaliser mémorisées et modifiables, pas de traceur facultatif avant accord. Prévoir page introuvable, états vides et erreurs cohérents, sans prétendre qu'ils étaient dessinés sur une quatrième maquette. Ne pas ajouter un compte client ou une collection de produits comme nouvelle exigence à la place des douze pages demandées.

## Intégration au studio

- Démo complète visitable avant le choix explicite de SILLON, sans changement du projet ni appel IA ; sélection unique même en double clic.
- Après choix, mêmes compositions et comportement, avec les vraies images, textes, produits, prix, logo et informations du client. Aucun mot SILLON, café, van ou prix 129 € résiduel dans un projet différent. Les décors et chemins doivent pouvoir être adaptés tout en conservant la qualité de composition.
- Toutes les sections, textes, photos, couleurs et informations restent éditables, enregistrés et conservés au rechargement. Vérifier remplacement d'une photo, modification d'un prix et d'un titre, duplication/déplacement d'une section et export.
- Le produit détouré du client doit pouvoir reprendre le surplomb du produit de démonstration. Gérer les marges transparentes et les couches de clic, sans aplatir une page complète en une image. Sans détourage disponible, signaler la limite, pas de produit déformé.
- Préserver les familles, forfaits, budgets, droits, moteurs et projets existants. Pas de modification globale de facturation, sécurité ou stratégie marketing dans cette mission. Hébergement natif/domaines reste hors périmètre V2.

## Recette visuelle au pixel près — obligatoire

1. Mesurer chaque panneau des trois originaux : limites du site hors légendes externes, taille des blocs, coordonnées, couleurs échantillonnées, rayons, typographies, retours à la ligne, images et cadrages. Fournir `MATRICE_SILLON_V2` : planche → panneau → route → section → média → action → preuve → état.
2. Reproduire les pages **à la largeur de référence du panneau**, puis à 1440 et 390 px ; contrôler aussi 360 et 430 px. Pour les panneaux mobile, comparer le contenu de l'écran hors cadre de téléphone. Ne pas comparer deux échelles différentes et conclure artificiellement à la fidélité.
3. Fournir pour chaque page une comparaison côte à côte, une **superposition à 50 %** et une image des différences. Masquer seulement les légendes hors site et données réellement variables ; ne pas masquer titres, photos, placements, pieds ou éléments qui ne correspondent pas. L'anticrénelage peut être mesuré séparément, pas utilisé pour excuser des différences de composition.
4. Corriger les écarts visibles, du premier au dernier bloc. Objectif : aucune différence de dessin/placement aux dimensions de référence. Aucun pourcentage arbitraire de ressemblance ne vaut validation. Une scène recréée ou police non identique reste un écart nommé avec preuve ; ne pas l'appeler « pixel parfait ».
5. Tester les fonctions réelles : navigation, menu, galerie/zoom, ajout/quantités/suppression/persistance, calculs, étapes simulées de commande, filtres/ancres/articles, FAQ, formulaires, suivi selon intégration, liens légaux et cookies, clavier et mobile. Aucun débordement horizontal, bouton masqué ou écran réduit pour tout faire rentrer.
6. Vérifier l'édition, sauvegarde/rechargement, adaptation à un autre client et exports supportés, avec les médias locaux décodables. Exécuter les contrôles utiles requis du dépôt et `verifier-theme` pour les changements de thème. Une CI verte ne prouve pas la fidélité visuelle.
7. Livrer PR/SHA, captures complètes, superpositions/différences, résultats réellement vérifiés et liste précise des écarts. Distinguer livraison de branche, fusion et version servie. Ne rien marquer validé à la place de Thomas.

Préserver Parenthèse, SOUPLE, Maison & Horizon, NOCTIL, MUSEAU CLUB, TRAVERSE, Atelier Rive, HEUREN et les autres travaux. Aucun appel IA payant ni régénération de médias dans cette mission Claude, aucune nouvelle personne, aucune banque d'images ou marque externe, aucune suppression de données, fusion ou déploiement automatique. Continuer les parties indépendantes jusqu'à une version complète révisable au lieu de livrer une ébauche ou d'abandonner au premier écart.
