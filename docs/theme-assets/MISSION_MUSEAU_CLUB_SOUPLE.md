# Claude — MUSEAU CLUB et SOUPLE, famille E-commerce, quatre produits par boutique

Thomas demande ces deux nouveaux thèmes en complément des quatre finitions autorisées sur la PR #157 (commentaire 6307006303). Aucun thème n'est encore validé par Thomas. Ne pas fusionner ni déployer automatiquement.

## Classement et catalogue

Les deux thèmes appartiennent à la **famille E-commerce**, celle d'ORBE, HEUREN et ALCÔVE : `catalog` pour la famille de sections et le catalogue, `ecommerce` pour la recommandation selon les conventions existantes. Le fait de viser une niche ne doit pas les classer dans « Produit spécifique » ou « Boutique spécialisée ». Les démos présentent exactement quatre produits distincts chacune ; les différentes vues ne sont pas des produits supplémentaires.

| Marque | Produits |
| --- | --- |
| MUSEAU CLUB | Harnais, laisse, collier, pochette à sacs pour chiens |
| SOUPLE | Tapis, brique, sangle de yoga, anneau de Pilates |

## Médias originaux à intégrer

Le lot contient 62 fichiers WebP : un logo et 30 images par thème. Chaque produit a cinq vues dédiées, chaque boutique dix ambiances. Les sources ont été récupérées des créations existantes, sans régénération. Le manifeste `docs/theme-assets/museau-club-souple-manifest.json` contient tous les chemins, rôles, produits, dimensions, poids, SHA-256 des sources et des WebP, descriptions et exclusions.

- `public/theme-assets/museau-club/` : `logo.webp`, `harnais-01.webp` à `harnais-05.webp`, idem pour `laisse`, `collier`, `pochette`, et `ambiance-01.webp` à `ambiance-10.webp`.
- `public/theme-assets/souple/` : `logo.webp`, `tapis-01.webp` à `tapis-05.webp`, idem pour `brique`, `sangle`, `anneau`, et `ambiance-01.webp` à `ambiance-10.webp`.
- MUSEAU CLUB `ambiance-03.webp` est la scène corrigée de la console. SOUPLE conserve les anneaux prune avec coussinets mauves ; les anciennes ambiances avec anneau clair sont exclues. La brique utilise la vue latérale corrigée. Ne pas remettre les fichiers exclus.
- Plusieurs titres de fichiers d'origine décrivent mal les couleurs : les pixels et le champ `scene` du manifeste priment. Ne pas inventer un tapis ivoire, une sangle ivoire ou un anneau ivoire à partir du nom d'origine.
- Ne pas mélanger les galeries : le mousqueton de pochette ne devient pas celui de la laisse. Une ambiance peut montrer plusieurs produits, mais le lien d'achat doit pointer vers le bon produit ou la collection réelle. Le coffret photographié ne crée pas un cinquième produit ni une offre commerciale non définie.
- Les chiens déjà présents dans les images MUSEAU CLUB sont utilisables. Aucun ajout de personne, main, silhouette, marque externe ou média de banque d'images.

## Deux compositions réellement distinctes

MUSEAU CLUB : identité cobalt/crème, ton chaleureux et direct, rythme dynamique et convivial ; mettre en valeur la collection coordonnée et les scènes de promenade. SOUPLE : rose poudré/prune/liège, rythme calme, respirations et composition éditoriale adaptée au yoga/Pilates. Les deux restent des boutiques de produits physiques, pas des sites de prestations ou de prise de rendez-vous.

S'appuyer sur les vraies sections et dispositions de la bibliothèque E-commerce. Créer deux démonstrations complètes, pas des pages statiques séparées du moteur. Ne pas recolorer simplement un ancien thème. Varier les en-têtes, pieds de page, compositions, galeries, sections et animations avec cohérence. Préserver les compositions des autres thèmes.

Prévoir accueil, catalogue des quatre produits, quatre fiches produit accessibles, présentation/usages, FAQ et contact, recherche et panier. L'accueil doit montrer rapidement la marque, sa catégorie et les quatre références, avec sélection de produits, scènes d'usage, détails et liens pertinents. Les collections et filtres ne doivent pas créer de catégories vides ou artificielles. Les suggestions de produits complémentaires pointent vers les autres vraies références de la boutique.

Chaque fiche produit utilise ses cinq vues et un texte propre, sans copier les caractéristiques d'un autre produit. Éviter les images répétées dans des sections successives. Préparer une matrice image → produit/page/section et des cadrages adaptés au bureau et au téléphone. Les images principales montrent les produits entiers ; les macros restent des détails assumés. Sur mobile, rendre rapidement visibles produit, titre et action, sans grande ouverture vide ni produit essentiel coupé.

## Texte et comportement commercial

Rédiger un français naturel, utile et vendeur, lié aux visuels. Ne pas présenter comme établies des performances, certifications, dimensions, résistances, compositions techniques, bénéfices médicaux, garanties, stocks, prix, avis ou délais non fournis. Pour SOUPLE, aucune promesse thérapeutique. Pour MUSEAU CLUB, aucune sécurité ou résistance certifiée inventée.

Un avertissement de démonstration compact suffit ; les protections de démo restent actives. En l'absence de prix, l'état d'achat est explicite et non achetable, y compris la barre mobile. Ne pas laisser un bouton sembler achetable puis refuser silencieusement. Vérifier aussi l'achat avec des prix de test renseignés dans un scénario isolé : quatre identifiants distincts, bon article, quantités, suppression et total exact ; ne pas publier ces prix comme des données réelles de marque.

## Studio, adaptation client et forfaits

La démo complète doit se visiter avant choix explicite, sans modifier le projet. Le choix applique la composition avec les vrais produits, images, logo et textes du client, sans résidus de MUSEAU CLUB ou SOUPLE ni mélange des identités. Les quatre produits constituent la démo et ne doivent pas devenir une limite rigide imposée aux boutiques clientes. Vérifier édition, changement de disposition, ajout/déplacement de section, sauvegarde et rechargement.

Coordonner avec Codex #154 / forfaits #151 : transmettre les identifiants `museau-club` et `souple` et leur famille, sans modifier en parallèle sa grille ou contourner les droits. Vérifier les conventions d'identifiants existantes avant implantation. Préserver les corrections HEUREN/ALCÔVE et la barre mobile.

## Preuves et livraison

Contrôler les 62 médias contre le manifeste, puis les inspecter dans les pages réelles. Fournir captures pleine page à 360, 390, 430 et 1440 px pour les deux accueils, catalogues et les huit fiches. Contrôler aussi les premiers écrans à 360×640 et 390×844 : lisibilité, produit, titre, action, débordement, menus et barre d'achat.

Tester galeries, zoom, liens entre produits, recherche, panier, FAQ, formulaires et états de démo. Fournir preuves studio : visite avant choix, sélection explicite, application à un projet différent, absence des identités de démo, sauvegarde/rechargement. Contrôler les exports pris en charge et distinguer vérification des fichiers/rendu de véritable installation sur un CMS. Identifier les limites, le commit testé et les dépendances des PR.

Livrer les corrections de #157 et les nouveaux thèmes dans des commits clairement séparés, avec un rapport et une PR pour validation visuelle de Thomas. Ne pas déclarer les compositions validées et ne pas lancer de fusion ou mise en ligne automatique.
