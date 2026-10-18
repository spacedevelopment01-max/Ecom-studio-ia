Source : https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6244332584

# Complément de mission — thèmes professionnels, pages produit et bloc d’achat avancé

**Décision de Thomas — 18 octobre 2026. Destinataire : la session Codex de développement déjà chargée du studio.**

Thomas a validé les nouvelles références de conception ci-dessous et demande aussi les fonctions du bloc d’achat visible dans la démo Shrine Pro / Luna Smoke. Il demande que ce brief soit publié sur GitHub pour être lu directement par la session de développement.

Ce commentaire complète la mission du lot 2A. La livraison actuelle reste à examiner visuellement : il ne constitue ni une acceptation esthétique de Vitrine/Jardin ni une autorisation de fusion ou de déploiement. La conversation de coordination publie les consignes ; le code est modifié dans la session Codex de développement.

## 1. Point de départ et périmètre de cette passe

- Reprendre la PR #134 et la branche `codex/lot-2a-themes-reference`. Dernier état distant constaté à la préparation de ce brief : `8bcba3006db2e144b2f6e20e83f47ae44c26650c`. Vérifier le dernier état et les modifications concurrentes avant de travailler.
- Lire les instructions du dépôt, `docs/coordination/LOT_2A_MISSION.md` et `docs/coordination/LOT_2A_THEMES_RESULTATS.md`, puis examiner les captures et vidéos déjà livrées.
- Conserver les correctifs du lot 1, les associations par identité stable, les données et retouches clients, les versions et les preuves de la livraison actuelle. Travailler par améliorations traçables, sans réinitialiser le studio.
- Ne pas relancer ORBE / Atelier Rive. Ne pas démarrer une deuxième exécution concurrente du même travail.
- Objectif immédiat : améliorer les deux références produit et services et leurs composants réutilisables, puis intégrer le bloc d’achat avancé au véritable moteur. Objectif du catalogue : 30 thèmes réellement distincts, avec des univers produits et services ; les 28 autres viennent après validation visuelle des deux références.
- Commencer par un relevé court des écarts entre la livraison actuelle et ce brief, puis réaliser les changements. Ne pas repartir dans un audit général ou s’arrêter à un plan.

## 2. Références à examiner réellement

Ces références servent à étudier les compositions, interactions et parcours. Elles ne constituent pas un classement mondial des ventes. Produire une conception propre au studio ; ne pas récupérer les fichiers de thèmes payants, les textes ou les médias de ces marques.

### Pages produit — dix références

| Référence | Exemple | Point d’étude |
|---|---|---|
| Impact | https://impact-theme-sound.myshopify.com/products/mg20-galactic-white | Galerie variée, variantes visuelles, présence du produit, hiérarchie et mise en scène technique |
| Concept | https://concept-theme-tech.myshopify.com/products/flow-harmony | Caractéristiques compréhensibles, pictogrammes, accessoires et options proches de l’achat |
| Be Yours | https://beyours-theme-beauty.myshopify.com/products/glow-drops | Démonstration, utilisation, progression du contenu, vidéos de routine, composition d’un ensemble |
| Shrine Pro | https://shrine-pro-demo.myshopify.com/products/luna-smoke | Offres par quantité, lots, économies, cadeaux et avantages selon l’offre |
| Motion | https://motion-theme-adventure.myshopify.com/products/trail-pack-bloom | Présentation d’usage ; examiner également les possibilités vidéo et animation du thème |
| Impulse | https://impulse-theme-fashion.myshopify.com/products/the-arden-co-ord | Cohérence de collection, photos portées, parcours d’une boutique à plusieurs références |
| Stiletto | https://stiletto-theme-stiletto.myshopify.com/products/margo-top-in-penny | Composition éditoriale, tailles, coupe, entretien, informations de livraison |
| Focal | https://focal-theme-carbon.myshopify.com/products/jump-wireless-powerbank | Contrastes, vues de détail et d’usage, lisibilité du bloc d’achat |
| Prestige | https://prestige-theme-allure.myshopify.com/products/le-nouveau-cartable-navy | Matières, grandes photos, typographie, variantes et présentation premium |
| Broadcast | https://themes.shopify.com/themes/broadcast/presets/broadcast?locale=fr | Ouvrir la démo : richesse des sections, produits complémentaires et parcours d’achat |

Priorités proposées par la coordination : Impact pour la mise en scène, Concept pour la compréhension, Be Yours pour le développement de la page, Shrine Pro pour les offres.

### Ambiances et parcours immersifs, notamment services

- Khufu’s : https://khufus.com/
- MERSI : https://www.mersi-architecture.com/
- Caeli : https://www.caeli-energie.com/
- Luminaire Authentik : https://luminaireauthentik.com/

Étudier la place des photographies, la composition, le rythme au défilement et les transitions. Ne pas attribuer à un site une interaction non observée. Si une référence n’est pas accessible, le dire et utiliser les autres.

## 3. Qualité visuelle et éditoriale attendue

- Un thème doit avoir une direction artistique reconnaissable : composition, typographie, proportions, traitement des images, header, footer, rythme et animation. Changer seulement les couleurs ne crée pas un nouveau thème.
- Développer une vraie page produit, au-delà du premier écran et d’une description courte : bénéfices spécifiques, démonstration, usages, détails utiles, caractéristiques, réponses aux objections, informations pratiques et action d’achat. Choisir les sections et leur ordre selon le produit et les données disponibles.
- Pour les services, construire un parcours présentation → prestations → méthode/réalisations → informations pratiques → devis ou réservation. Ne pas imposer une fiche produit ni un panier à une activité qui ne vend pas en ligne.
- Préparer un plan de contenu et de médias par page. Chaque visuel doit avoir un rôle : présentation, détail, contexte, échelle, démonstration ou réalisation. Ne pas remplir tout le thème avec la même photo ou présenter plusieurs recadrages comme des prises de vue différentes.
- Conserver la forme, les couleurs et le logo du produit de référence ; ne pas emprunter les images d’une autre offre. Préserver un logo importé par le client.
- Rédiger un français naturel, précis et propre au projet : titres utiles, bénéfices distincts, paragraphes complets lorsqu’ils sont nécessaires, appels à l’action adaptés. Aucun texte générique répété pour remplir une section.
- Utiliser uniquement les faits disponibles. Ne pas inventer avis, clients, prix de référence, récompenses, résultats, délais ou caractéristiques. Les contenus fictifs de démonstration doivent être identifiés comme tels dans les données et les preuves.
- Ajouter des animations pertinentes et réglables : transitions, révélations, changements de galerie, détails et interactions. Préserver la lisibilité, le tactile, la navigation clavier et le mode de réduction des animations. Éviter les animations qui bloquent la consultation.

## 4. Bloc d’achat avancé demandé explicitement

Le bloc choisi par Thomas contient des offres de 1/2/3/4 articles, une offre mise en avant, des cadeaux déverrouillés selon le lot, des avantages illustrés et deux actions d’achat. Construire un composant générique configurable ; le nombre d’offres et les paliers ne doivent pas être figés.

Fonctionnement attendu :
1. **Offres par quantité** : quantités, prix et libellés personnalisables ; offre sélectionnée clairement visible.
2. **Prix et économies** : prix total, prix unitaire et économie calculés depuis la configuration commerciale réelle. Les prix barrés ne sont jamais inventés par l’IA.
3. **Badges** : libellés personnalisables et visuellement intégrés au thème. Un badge factuel tel que « le plus vendu » doit s’appuyer sur des données ; un choix éditorial peut être nommé « offre recommandée ».
4. **Variantes** : choix des tailles/couleurs ou autres options nécessaires, y compris à l’intérieur d’un lot lorsque le produit le permet.
5. **Cadeaux et paliers** : cadeaux identifiés, quantités et seuils paramétrables ; état disponible/verrouillé ; gestion du stock ; retrait ou recalcul correct si l’offre est diminuée ou supprimée.
6. **Avantages inclus** : livraison offerte et autres avantages uniquement s’ils sont réellement configurés. Une protection d’expédition ne doit pas devenir un supplément payant précoché.
7. **Bénéfices avec pictogrammes** : trois ou quatre arguments distincts lorsqu’ils sont disponibles, éditables et propres au produit.
8. **Avis et confiance** : notes, témoignages et récompenses issus de données disponibles ; aucune photo générique présentée comme celle d’un vrai client.
9. **Achat** : « Ajouter au panier » transmet les bonnes références, variantes, quantités, remises et cadeaux. « Acheter maintenant » est proposé lorsqu’il est effectivement pris en charge.
10. **Paiements** : logos et moyens de paiement correspondant à la configuration réelle de la boutique.
11. **Mobile** : cartes lisibles, zones tactiles suffisantes, sélection accessible, résumé cohérent ; barre d’achat fixe optionnelle qui ne masque pas le contenu.

Les remises et cadeaux doivent être appliqués par le système commercial de la plateforme cible : un calcul visuel en JavaScript ne suffit pas à prouver leur fonctionnement au panier ou au paiement.

Pour les services, réutiliser la logique de comparaison sous forme de séances, forfaits ou prestations incluses quand cela a du sens, avec l’action devis/réservation adaptée. Ne pas introduire artificiellement livraison ou cadeaux physiques.

## 5. Galerie, édition et généralisation

- Ajouter les nouveaux composants et leurs variantes à la galerie de sections avec noms compréhensibles et aperçus fidèles. Inclure headers, footers, galeries, démonstrations, bénéfices, FAQ, offres et éléments de confiance.
- Le bloc d’achat doit pouvoir adopter plusieurs styles ; il n’impose pas la palette ni la typographie de Luna Smoke.
- Éditeur manuel et conversation IA doivent modifier la même source de données enregistrée, avec version et retour arrière. Une modification locale doit rester limitée à la page ou au produit ciblé.
- Exemple de demande à prendre en charge : « Crée trois offres : un article, un duo et un trio avec la pochette du catalogue offerte ; mets le duo en avant. » Utiliser les articles réellement présents ; si le cadeau ou une règle de prix manque, demander uniquement l’information nécessaire.
- Vérifier une modification, un rechargement, une restauration et un export. Distinguer le traitement déterministe local, les tests simulés et une véritable requête à un fournisseur IA ; ne pas les présenter comme équivalents.
- Aucune condition de production fondée sur ARVEN, Racines & Pierres ou le nom d’un exemple. S’appuyer sur les identités stables, les données du projet et les capacités des composants.
- Préserver les forfaits, contrôles d’accès, coûts, limites de tentative et retouches clients existants.

## 6. Exports et limites à traiter explicitement

La livraison du lot 2A indique déjà : affectation manuelle des modèles Shopify, fiches natives partagées sur WooCommerce/PrestaShop, absence d’installation réelle. Ces limites restent visibles tant qu’elles ne sont pas résolues et vérifiées.

- Implémenter les composants dans le moteur et les adaptateurs concernés, avec leurs réglages, médias et comportements ; ne pas livrer une maquette indépendante réservée à l’aperçu.
- Établir une matrice par fonctionnalité et par plateforme : Shopify, WordPress/WooCommerce, PrestaShop et statut des autres exports existants Wix/Squarespace.
- Distinguer : pris en charge et vérifié, nécessite configuration/extension, dégradé, non pris en charge, non vérifié. Examiner les documentations officielles actuelles pour les contraintes des plateformes.
- Ne jamais annoncer « compatible toutes plateformes » à partir de la seule présence de fichiers dans un ZIP. Un export ne doit pas afficher comme active une offre dont la remise ou le cadeau ne fonctionne pas.
- Vérifier ce qui est possible dans des environnements isolés autorisés. Documenter précisément ce qui nécessite ensuite un accès CMS ; ne pas connecter un compte ou acheter une extension.

## 7. Validation et restitution accessibles

- Examiner toi-même les rendus réels sur ordinateur et mobile. Vérifier également les tailles intermédiaires, textes longs, variantes, disponibilité, liens, prix, cadeaux, clavier et réduction des animations.
- Tester la généralisation sur au moins deux autres cas non utilisés pour dessiner les références, avec leurs propres données. Inclure renommage, réordonnancement et plusieurs offres afin de préserver les associations.
- Les tests doivent couvrir les risques du nouveau comportement : passage d’un lot supérieur à inférieur, retrait d’un cadeau, variante indisponible, cohérence entre offre et panier, édition persistante, export. Exécuter les contrôles requis du dépôt sans multiplier les suites sans raison.
- Fournir des captures réelles de l’accueil et d’une fiche produit/prestation, plus un gros plan du bloc d’achat dans plusieurs états. Faire une courte vidéo du vrai défilement et des interactions.
- Thomas ne voit pas toujours les vignettes « images vues ». Publier des PNG/JPG consultables, des liens directs vers les fichiers et un index GitHub durable ; fournir les vidéos téléchargeables. Vérifier les liens. Ne pas s’appuyer uniquement sur des chemins locaux ou des aperçus internes.
- Publier code, tests, preuves et compte rendu dans la PR de travail. Conserver le rapport actuel et ajouter un complément daté indiquant changements, résultats, commit réellement testé, matrice des exports et limites.
- Répondre ici avec les liens et signaler la livraison dans #133 pour que la coordination puisse la récupérer sans copier-coller de Thomas.
- Présenter les deux références améliorées à Thomas pour validation visuelle avant de décliner les 28 autres.

**Contraintes maintenues :** aucun merge, déploiement, publication client, connexion Google/CMS, appel IA payant ou nouveau service payant. Utiliser les ressources déjà autorisées pour avancer. Si un média ou accès manque, préciser le besoin et son impact sans inventer de contenu ni affirmer avoir testé ce qui ne l’a pas été. Ne pas modifier la page publique d’E-COM STUDIO IA dans cette mission.

**À la lecture par la session active :** accuser réception ici, indiquer la branche et les étapes prises en charge, puis poursuivre la réalisation. La publication de ce commentaire ne prouve pas à elle seule que Codex l’a lu ou qu’une nouvelle exécution a démarré.
