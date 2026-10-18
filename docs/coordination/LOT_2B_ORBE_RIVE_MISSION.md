Source : https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6247457951
Version du commentaire : 2026-10-18T10:48:03Z — complément 6248929074 (10:48:30Z)

# Consignes de reprise pour Codex — ORBE et Atelier Rive

**Dernière précision — 18/10/2026, 12 h 46 (Paris) : l'accueil ORBE doit comporter une section « Produit à la une » complète. Les packs sont intégrés à la présentation et à l'achat du produit ; voir la précision dans la partie Accueil ORBE ci-dessous.**

**Demande de Thomas du 18 octobre 2026 : publier uniquement les consignes pour que la session Codex de développement les récupère.** Ce commentaire contient la mission complète ; il n'est pas nécessaire d'attendre un autre fichier de consignes.

## 0. Mise à jour du 18 octobre 2026 — références directes et exigence de rendu professionnel

**Thomas confirme qu'il veut le meilleur rendu professionnel possible pour les deux démonstrations. Les 14 URL sont désormais écrites directement dans cette mission, avec leur rôle, pour éviter de dépendre d'un renvoi à un autre commentaire.** Cette exigence s'ajoute aux compositions détaillées ORBE / Atelier Rive ci-dessous. Elle ne relance pas les 28 autres thèmes et ne vaut pas acceptation de la précédente livraison.

### Les 14 références à examiner

| Référence | Lien direct | Ce qu'il faut en tirer |
|---|---|---|
| Impact | [https://impact-theme-sound.myshopify.com/products/mg20-galactic-white](https://impact-theme-sound.myshopify.com/products/mg20-galactic-white) | Présence du produit, galerie et vignettes, hiérarchie du premier écran ; base principale pour la fiche ORBE. |
| Concept | [https://concept-theme-tech.myshopify.com/products/flow-harmony](https://concept-theme-tech.myshopify.com/products/flow-harmony) | Compréhension du produit, variantes illustrées, accessoires près de l'achat, compositions éditoriales et informations détaillées. |
| Be Yours | [https://beyours-theme-beauty.myshopify.com/products/glow-drops](https://beyours-theme-beauty.myshopify.com/products/glow-drops) | Progression après l'achat : usages, démonstrations, détails, ensemble et FAQ ; développer une vraie page longue. |
| Shrine Pro | [https://shrine-pro-demo.myshopify.com/products/luna-smoke](https://shrine-pro-demo.myshopify.com/products/luna-smoke) | Bloc demandé par Thomas : offres 1/2/3/4, offre mise en avant, avantages et cadeaux selon le lot, deux actions si prises en charge. |
| Motion | [https://motion-theme-adventure.myshopify.com/products/trail-pack-bloom](https://motion-theme-adventure.myshopify.com/products/trail-pack-bloom) | Étudier la mise en situation et les possibilités de vidéo/mouvement ; choisir un traitement utile au produit et aux médias réellement disponibles. |
| Impulse | [https://impulse-theme-fashion.myshopify.com/products/the-arden-co-ord](https://impulse-theme-fashion.myshopify.com/products/the-arden-co-ord) | Étudier la cohérence entre fiche, collection, navigation et boutique à plusieurs références. |
| Stiletto | [https://stiletto-theme-stiletto.myshopify.com/products/margo-top-in-penny](https://stiletto-theme-stiletto.myshopify.com/products/margo-top-in-penny) | Étudier la présentation éditoriale et les informations pratiques qui lèvent les objections. |
| Focal | [https://focal-theme-carbon.myshopify.com/products/jump-wireless-powerbank](https://focal-theme-carbon.myshopify.com/products/jump-wireless-powerbank) | Étudier contrastes, détails, images d'usage et visibilité de l'action d'achat. |
| Prestige | [https://prestige-theme-allure.myshopify.com/products/le-nouveau-cartable-navy](https://prestige-theme-allure.myshopify.com/products/le-nouveau-cartable-navy) | Étudier matières, grandes photographies, typographie, finitions et sobriété de la présentation. |
| Broadcast | [https://themes.shopify.com/themes/broadcast/presets/broadcast?locale=fr](https://themes.shopify.com/themes/broadcast/presets/broadcast?locale=fr) | Ouvrir la démo si possible ; étudier diversité des sections, compléments utiles et continuité du parcours. |
| Khufu’s | [https://khufus.com/](https://khufus.com/) | Atmosphère immersive, photographie ample, hiérarchie courte et présence du titre ; adapter au contenu du projet. |
| MERSI Architecture | [https://www.mersi-architecture.com/](https://www.mersi-architecture.com/) | Référence principale pour Atelier Rive : architecture en grand format, détails, projets et approche éditoriale. |
| Caeli Énergie | [https://www.caeli-energie.com/](https://www.caeli-energie.com/) | Étudier la façon d'expliquer une offre et de conduire vers une prise de contact, sans transposer les faits d'une autre activité. |
| Luminaire Authentik | [https://luminaireauthentik.com/](https://luminaireauthentik.com/) | Étudier la présentation du luminaire dans un intérieur, les ambiances, finitions et choix de produits. |

Ce tableau définit des **axes d'étude**, pas une affirmation que chaque fonction de chaque site a été observée ou testée. Ces références ne sont pas un classement mondial des ventes. Examiner les sites accessibles ; signaler précisément ceux qui ne le sont pas. Les durées et dimensions prescrites plus bas sont des choix pour nos démos, pas des mesures prétendument extraites de ces sites.

### Méthode de travail attendue

- Reprendre l'exécution de développement existante après vérification de la tête distante et du travail concurrent. Ne pas ouvrir une seconde implémentation concurrente.
- Lire cette mission dans sa totalité et conserver les corrections du lot 1 / lot 2A. La décision actuelle est bien de réaliser **ORBE et Atelier Rive** ; elle remplace leur ancienne mise en pause.
- Avant de coder une section, déterminer son rôle, sa composition, son texte, son image et son interaction. Reporter ces choix brièvement dans le document de travail, puis réaliser. Ce relevé ne doit pas devenir une nouvelle phase d'audit qui remplace la production.
- Pour chaque référence accessible, relever les éléments réellement utiles puis les traduire dans l'identité du projet. Utiliser en priorité Impact + Concept + Be Yours + Shrine pour ORBE, et MERSI + Khufu’s pour Atelier Rive ; les autres enrichissent les décisions.
- Si un site ne s'ouvre pas, utiliser le lien direct reçu dans la conversation si c'est un accès disponible, puis les descriptions complètes de cette mission et les pièces jointes effectivement accessibles. Ne pas bloquer toute la réalisation, réduire le niveau d'ambition ou prétendre avoir vu une page inaccessible.
- Construire les composants manquants ou corriger ceux qui plafonnent le rendu dans le véritable moteur, sa galerie, son éditeur et ses exports. Adapter le système au résultat demandé ; ne pas réduire toutes les sections à ce que permet déjà un unique gabarit générique.

### Direction artistique à respecter

1. **Deux univers immédiatement distincts.** ORBE doit évoquer une boutique d'objet design chaleureuse ; Atelier Rive, une revue d'architecture et un accompagnement sur mesure. Composition, typographies, cadrages, navigation, rythme et pied de page doivent matérialiser cette différence.
2. **Des premiers écrans composés.** Le produit ou l'intérieur doit être réellement présent, avec un titre bien proportionné et une action lisible. Corriger les marges excessives, images minuscules, produits coupés sans intention, gros blocs vides et titres mal équilibrés. Les grands titres d'accueil ne sont pas des tailles à appliquer aveuglément aux fiches d'achat.
3. **Une diversité de sections cohérente.** Alterner grandes images, diptyques, texte éditorial, informations compactes et blocs interactifs selon le contenu. Éviter une suite de cartes interchangeables. Chaque section doit apporter une information ou une expérience différente.
4. **Des médias affectés avec intention.** Employer les images ORBE / Rive disponibles dans leurs rôles prévus. Réserver les dimensions, régler le point focal, conserver la forme et les finitions du produit. Un recadrage de la même photo ne devient pas une nouvelle scène. N'utiliser ni les photos, ni les logos, ni les avis des références comme contenus clients.
5. **Une page complète et convaincante.** Fiche produit ORBE : comprendre, se projeter, choisir, acheter. Prestation Atelier Rive : comprendre l'approche, le périmètre, la méthode et le prochain échange. Développer les accueils, les pages maîtresses et leurs parcours associés. Écrire un français précis et propre à chaque projet.
6. **Des interactions visuellement soignées et réellement utiles.** Pour ORBE : galerie, finitions, lots, variantes de chaque article et cadeaux. Pour Atelier Rive : découverte des intentions, prestations, méthode et contact. Les styles de ces composants doivent appartenir à leur thème.
7. **Une mise en mouvement perceptible et maîtrisée.** Prévoir une mise en scène d'ouverture, des entrées de sections adaptées à leur composition et des transitions sur les interactions. ORBE peut rythmer scènes claires et ambiance sombre ; Atelier Rive peut faire progresser le récit d'une intention et de sa méthode. Appliquer les timings et limites détaillés plus bas, avec une lecture fluide, des actions immédiatement disponibles et le mode de réduction des animations. Ne pas remplacer toute la direction du mouvement par un effet identique sur chaque bloc.
8. **Une version mobile conçue à part entière.** Recomposer l'ordre et les proportions, garder des offres comparables et des images généreuses, prévoir de vrais usages tactiles. Vérifier 390 / 768 / 1024 / 1440 px, les textes longs, le menu et les éléments fixes.
9. **Une cohérence jusqu'aux détails.** Aligner les espacements, épaisseurs, icônes, états de sélection, boutons, formulaires, légendes et pieds de page. Adapter les composants au thème sans changer leurs données métier.

### Exigence de revue avant remise à Thomas

La réussite des tests techniques ne valide pas l'esthétique. Avant de présenter la livraison :

- Ouvrir les quatre pages complètes dans le navigateur : fiche ORBE, accueil ORBE, prestation Atelier Rive, accueil Atelier Rive.
- Examiner les premiers écrans **et** la continuité de toute la page sur ordinateur et mobile. Corriger les défauts observés ; ne pas remettre un rendu manifestement inachevé parce que le build passe.
- Comparer les choix aux références réellement accessibles et aux compositions écrites : présence des images, typographie, rythme, richesse éditoriale, achat/contact et mouvement. Fournir une correspondance concise « référence ou consigne → choix réalisé → page/section » avec les écarts restants.
- Vérifier les fonctions, l'édition, la persistance et les exports selon la recette ci-dessous. Distinguer clairement ce qui fonctionne en aperçu et ce qui a été vérifié dans le CMS.
- Fournir les huit captures complètes bureau/mobile, les gros plans utiles et les vidéos du vrai navigateur prévues dans la recette. Les preuves doivent correspondre au commit livré.
- Présenter les limites réelles. Ne pas attribuer une note esthétique arbitraire, annoncer un « niveau agence validé » sans revue, ou valider à la place de Thomas.
- Attendre la validation visuelle de Thomas pour les 28 autres thèmes. Conserver les contraintes existantes : pas de merge, déploiement, nouveau service ou appel IA payant dans cette mission.

**Ce commentaire donne les consignes. Sa mise à jour ne prouve pas que la session de développement les a déjà lues ni qu'un nouveau rendu est terminé.**

---

## 1. Reprendre le bon travail

- Reprendre la PR #134, branche `codex/lot-2a-themes-reference`. Dernière tête vérifiée à cette publication : `1968c7b42113d81555931205a1d9dd4296daa31f`. Récupérer l'état distant et préserver toute évolution concurrente.
- Lire les instructions applicables et les rapports du lot 1 / lot 2A. Conserver leurs corrections, les données clients, les identités stables, les retouches et les versions.
- Thomas souhaite désormais deux nouveaux projets de démonstration isolés : **ORBE — lampe nomade** et **Atelier Rive — aménagement intérieur**. Cela remplace la précédente mise en pause de ces deux projets. Ne pas effacer les démonstrations existantes.
- Construire dans le véritable moteur de thèmes, sa galerie, son éditeur et ses exports. Une maquette HTML indépendante n'est pas la livraison demandée. Aucun fonctionnement du moteur ne doit dépendre du nom de la démo.
- Commencer par une fiche produit ORBE complète et une page de prestation Atelier Rive complète, puis les accueils et parcours associés. Corriger le rendu après inspection dans le navigateur. Ne pas s'arrêter à un audit ou à un plan.
- Les **28 autres thèmes attendent la validation visuelle de Thomas**. Ne pas modifier la page publique d'E-COM STUDIO IA. Conserver les forfaits et droits existants, notamment ceux des gabarits multiples et pages personnalisées.

## 2. Statut exact des images

**Ce commentaire publie des consignes textuelles, pas les fichiers images.** Un pack distinct nommé `ORBE_Atelier_Rive_Dossier_Codex.zip` a été préparé dans la conversation de coordination. Sa présence dans le dépôt ou dans ta session de développement n'est pas confirmée. Les identifiants d'image ci-dessous décrivent les affectations prévues ; ce ne sont pas des URL disponibles.

Vérifier les assets réellement accessibles. Si le pack est joint à ta session, importer ses fichiers et examiner les 24 visuels. Sinon, signaler précisément cette dépendance une fois, puis avancer sur les composants, textes, compositions, interactions et associations de médias. Ne pas prétendre avoir consulté des images absentes ni déclarer le rendu final validé sans elles. Ne pas remplir les sections avec une même photo répétée ou avec une autre lampe.

Plan du pack : ORBE = packshot Dune, chambre, dîner, lecture, bureau, duo, trio de finitions, ambiance sombre, packshot Charbon, packshot Argile, coffret, pochette. Atelier Rive = salon, cuisine, chambre, entrée, salle d'eau, bibliothèque, matières, plans, volume vide simulé, détail de menuiserie, salle à manger, escalier. Les visuels sont fictifs : aucun chantier réel ni caractéristique technique n'en découle.

## 3. Exigences communes

Les deux thèmes doivent différer par la composition, la typographie, le rythme, la navigation et les interactions, au-delà d'une simple couleur différente. Affecter chaque média à son rôle ; éviter les grandes images répétées, les cartes génériques et les textes de remplissage.

L'éditeur manuel et la voie conversationnelle doivent modifier la même source enregistrée, avec historique et restauration. Conserver l'édition des textes, médias, couleurs, typographies, ordre, CTA et animations. Préserver les accès et les budgets existants.

Les 14 références sont regroupées avec leurs liens directs et leur rôle dans la section 0 ci-dessus. Elles restent des inspirations ; si elles sont inaccessibles, appliquer les compositions détaillées et le signaler honnêtement. Ne pas copier les médias ou fichiers de thèmes payants.

Le rapport du lot 2A indique que remises/cadeaux fonctionnent dans le panier d'aperçu, mais que leur application au paiement CMS reste non implémentée. Conserver cette demande, traiter les possibilités réelles et documenter les limites. Ne pas annoncer une prise en charge au paiement sur la seule base d'un calcul d'aperçu, ni supprimer silencieusement les fonctions demandées.

Aucun merge, déploiement, publication client, nouveau compte connecté ou appel IA payant dans cette mission. Les nouveaux projets restent des démonstrations isolées. Les nombres de test ci-dessous ne doivent jamais devenir des prix de vrais clients.

## 4. Spécifications détaillées

# ORBE — lumière nomade, thème produit

Projet fictif de démonstration. Nom de marque : **ORBE**. Produit : **Lampe nomade ORBE**. Trois finitions visuelles : Dune, Argile et Charbon. La lampe complète de `orbe-01-dune` est la référence de forme. Ne pas la remplacer par une autre lampe. Le coffret et la pochette sont des accessoires distincts.

## Direction visuelle

Une boutique d'objet design chaleureuse, tactile, avec une présence photographique dominante. Palette : ivoire `#F4F0E8`, encre brune `#29251F`, argile `#9B4F36`, sable `#D8CCB9`, blanc `#FFFFFF`. Utiliser l'argile pour les actions et les repères ; pas un dégradé sur chaque section. Contrôler les contrastes réels.

Titres Cormorant Garamond et texte DM Sans, ou équivalents déjà embarqués/licenciés si les fichiers ne sont pas disponibles. Deux familles au maximum. H1 de 88–112 px à 1440 px, 46–54 px à 390 px ; interligne 0,98–1,08, corps 17–18 px avec interligne 1,5–1,6. La fiche produit utilise un H1 plus compact, 48–60 px sur bureau. Pas de titres artificiellement coupés au milieu d'un mot.

Largeur utile 1320 px, marges bureau 48–64 px, mobile 20 px. Espacements de sections 96–120 px sur bureau et 56–72 px sur mobile, à ajuster à la densité réelle. Bordures fines, rayon des boutons 6 px, pas une grille de cartes toutes arrondies. Images de produit en `contain` ; photographies d'ambiance avec cadrage enregistré et contrôlé au mobile. Garder le dôme et le socle visibles.

En-tête : logo typographique ORBE, liens « La lampe », « Les ambiances », « Les finitions », « Questions », panier à droite. Fond ivoire, 76 px environ ; 64 px mobile. Menu tactile avec focus et fermeture accessibles. Pied de page typographique ample avec navigation utile et seules informations réellement disponibles.

## Accueil — progression à réaliser

| Ordre | Composition | Texte prêt à employer | Image principale |
|---|---|---|---|
| 1 | Image panoramique dans un cadre large ; texte dans l'espace calme à gauche, hauteur maîtrisée | Surtitre « ORBE — LUMIÈRE NOMADE » ; titre « La lumière change de place. L'atmosphère aussi. » ; texte « Du chevet à la table, une même silhouette accompagne les moments de la maison. » ; CTA « Découvrir ORBE » | `orbe-02-chambre` |
| 2 | Phrase éditoriale sur 7 colonnes et trois repères typographiques sur 5, sans cartes | « Une présence discrète. Une ambiance qui reste. » ; « Silhouette arrondie », « Trois finitions », « À poser au fil de vos envies » | Aucun remplissage photographique |
| 3 | Grand diptyque asymétrique 7/5, photos de ratios différents | « Le temps d'un dîner. Le calme d'une lecture. » ; deux liens d'usage qui ouvrent la galerie correspondante | `orbe-03-diner`, `orbe-04-lecture` |
| 4 | Section sombre, image verticale à gauche et phrase ample à droite | « Quand la pièce ralentit. » ; « Une lumière d'ambiance et des lignes simples pour composer un coin plus intime. » | `orbe-08-lumiere` |
| 5 | Composition horizontale, produit et sélecteur de finitions accessibles | « Dune. Argile. Charbon. » ; « Trois tonalités pour trouver votre place dans la pièce. » ; CTA « Choisir ma finition » | `orbe-07-trio`, puis packshot de la finition choisie |
| 6 | Photo bord à bord avec légende discrète hors de l'image | « Deux points de lumière, un même équilibre. » ; CTA « Voir les offres » | `orbe-06-duo` |
| 7 | Section « Produit à la une » complète : présentation de la lampe, galerie, informations produit et achat réunis | « Lampe nomade ORBE » ; courte présentation, bénéfices, prix, finitions, offres rattachées au produit, CTA « Ajouter au panier » et lien vers la fiche complète | Packshot de la finition sélectionnée, galerie produit adaptée |
| 8 | Deux images d'accessoires en fond clair avec rôle expliqué | « À offrir. À emporter. » ; coffret et pochette nommés séparément ; conditions du cadeau issues du palier configuré | `orbe-11-boite`, `orbe-12-pochette` |
| 9 | FAQ en lignes généreuses avec ouverture animée courte | Questions de finition, contenu de l'offre et calcul du lot ; détails techniques uniquement si fournis | Aucune photo répétée |
| 10 | Conclusion éditoriale courte, photo horizontale et action | « Faites une place à la lumière. » ; CTA « Composer mon ORBE » | `orbe-05-bureau` |

### Précision de Thomas du 18 octobre 2026 à 12 h 46 — section produit sur l'accueil

Thomas valide une **section produit complète sur l'accueil ORBE**. La combinaison de prix et les packs appartiennent au produit : leur présentation doit rester intégrée à cette section. Cette précision remplace l'interprétation « simple bloc de packs / tableau d'offres autonome » de l'ancien teaser d'achat.

- **Présentation du produit :** nom « Lampe nomade ORBE », visuel principal suffisamment grand, petite galerie adaptée, description courte et deux ou trois bénéfices réellement étayés par le brief. La lampe est le sujet principal de la section.
- **Choix et achat :** prix unitaire identifié, finitions Dune / Argile / Charbon avec photo correspondante, choix d'une lampe ou des lots 2/3/4, couleurs par article du lot, total de la sélection et cadeau conditionnel selon les règles existantes. Les offres sont un sous-ensemble du bloc produit. Le prix unitaire ne doit pas être confondu avec le total du lot.
- **Actions :** bouton « Ajouter au panier » opérationnel dans le mode de démonstration existant et lien « Voir la fiche complète » vers la vraie fiche, en conservant la sélection lorsque le parcours le permet. Une seule commande d'achat clairement identifiée pour la sélection active.
- **Composition :** sur ordinateur, une composition produit en deux colonnes, visuels et informations/achat ; sur mobile, nom, image, informations et choix dans un ordre compact et lisible. Corriger les espacements et la longueur du bloc pour rendre l'achat rapidement accessible. La section conserve l'identité ORBE et n'intègre pas toute la longue fiche à l'accueil.
- **Données et réutilisation :** rattacher la section au même produit, aux mêmes variantes et à la même source de prix/offres que la fiche. Conserver les recalculs serveur, stocks, cadeaux, édition et historique. La proposer comme section réutilisable « Produit à la une » dans la galerie du studio, configurable pour d'autres produits ; les lots et cadeaux ne s'affichent que s'ils sont configurés pour ce produit. Aucun comportement moteur codé spécifiquement pour ORBE.
- **Critère de réception :** une vue de la section seule permet d'identifier la lampe, de la voir, de comprendre les choix et d'acheter. Une grille de prix/packs sans présentation visuelle et éditoriale du produit ne répond pas à la demande. Fournir un gros plan ordinateur et mobile de cette section après correction.

La fiche produit complète reste présente et conserve ses offres. Cette correction porte sur la section de l'accueil et s'ajoute à l'intégration des 24 images en cours ; elle ne demande aucune nouvelle génération d'images ni nouvelle direction artistique.

Ces textes décrivent l'univers fictif. Ne pas ajouter autonomie, puissance, température chiffrée, recharge USB, dimensions, matériau certifié, étanchéité, avis ou livraison garantie : ces données ne sont pas disponibles.

## Fiche produit — page maîtresse obligatoire

Premier écran bureau : galerie 58 % / bloc achat 42 %, espace réel entre les deux. Galerie comprenant le packshot sélectionné, le dîner, la lecture, le bureau, le duo et la vue nocturne, en vignettes lisibles et zoom accessible. Les variantes Dune/Argile/Charbon activent leur propre image. Ne pas donner un prix ou un stock différent à une variante par accident. Le bloc peut être sticky tant que le contenu reste visible, avec arrêt avant le pied de page.

Bloc d'achat, dans cet ordre :

1. Surtitre « ORBE », titre « La lumière, là où vous vivez. », sous-titre « Lampe nomade — choisissez votre finition et composez votre ensemble. »
2. Prix calculé, puis trois bénéfices lisibles : silhouette arrondie, trois finitions, offres à composer. Pas d'étoiles ou de compteur d'achats inventés.
3. Pastilles couleur avec nom et état sélectionné. La couleur ne doit pas être le seul indicateur.
4. Offres de 1/2/3/4 lampes dans de vraies cartes de sélection accessibles, avec quantité, total, prix unitaire et économie calculée. Quatre choix configurables, pas quatre champs de formulaire. Le duo porte « Notre sélection », jamais « Meilleure vente » sans données.
5. Les choix de couleur de chaque lampe du lot s'ouvrent sous l'offre sélectionnée. Ne pas empiler 10 menus déroulants pour les offres inactives.
6. Zone cadeaux : photo de la pochette, condition de palier, état verrouillé/disponible. Le coffret garde son propre identifiant et son propre rôle ; il n'est pas un cadeau automatique inventé.
7. CTA plein largeur « Ajouter au panier », résumé lisible, puis action « Acheter maintenant » uniquement si opérationnelle.
8. Informations d'achat disponibles. Afficher les moyens de paiement uniquement s'ils sont configurés.

Mobile : titre et courte introduction, galerie tactile, bloc achat ; pas de colonne latérale ni titre recouvrant la photo. Les offres doivent rester comparables et tactiles. Barre d'achat fixe optionnelle après la sortie du vrai CTA du champ visible, avec le prix et la variante actuels ; réserver son espace, la masquer quand le panier/dialogue est ouvert.

Sous le premier écran : diptyque dîner/lecture → scène sombre lumière → sélection des finitions → duo → accessoires → FAQ → retour à l'achat. Développer les textes utiles, varier les compositions, éviter la photo héro répétée à chaque section. La répétition du packshot dans une vignette de panier est fonctionnelle, pas un nouveau visuel éditorial.

## Jeu commercial de démonstration

Les nombres ci-dessous sont **des paramètres fictifs de test choisis pour exercer le composant**, pas des prix d'un marchand ni une promotion réelle. Les marquer `isDemo: true` avec provenance dans le jeu de données. Ne jamais les injecter dans un projet client. Calculer en centimes.

| Offre | Quantité | Total TTC de test | Prix unitaire | Économie par rapport aux unités du même jeu |
|---|---:|---:|---:|---:|
| Solo | 1 | 79,00 € | 79,00 € | 0,00 € |
| Duo | 2 | 142,20 € | 71,10 € | 15,80 € |
| Trio | 3 | 201,45 € | 67,15 € | 35,55 € |
| Ensemble | 4 | 252,80 € | 63,20 € | 63,20 € |

Une pochette offerte pour une ligne de lot contenant au moins trois lampes, une seule pochette par lot, selon stock de test. Si la quantité passe de 3 à 2, retirer le cadeau et recalculer l'offre ; si le lot est supprimé, retirer son cadeau. Ne pas qualifier l'économie de réduction réglementaire sur un prix antérieur : il s'agit de la comparaison avec les unités vendues séparément dans cette configuration fictive. Aucun prix barré promotionnel requis.

La boîte a son visuel pour le contenu/accessoire, mais aucun prix ni inclusion automatique n'est présumé. Les informations manquantes doivent être complétées avant d'en faire une offre réelle. Le mode de démonstration est identifiable et ne permet pas une commande réelle.

## Mouvement attendu

- Apparition initiale du titre en 2–3 lignes, translation verticale de 16 px et opacité, durée 500–650 ms, décalage 70 ms. Jamais attendre la fin pour rendre le CTA utilisable.
- Image d'ouverture : passage discret d'échelle 1,03 à 1 en 800 ms, conteneur stable ; pas de zoom permanent ni lampe coupée.
- Diptyques : révélation à l'entrée en vue, 450–600 ms, une seule fois ; contenu accessible même sans JavaScript.
- Couleur : fondu croisé 160–220 ms, dimensions réservées, pas de déplacement de l'interface.
- Offre : bordure/teinte et résumé mis à jour en 160–200 ms, focus conservé ; pas d'animation tapageuse de faux cadeau.
- Survol bureau : mouvement maximum 3–4 px sur une commande. Au tactile, fournir le même contenu sans survol.
- `prefers-reduced-motion` : affichage direct, défilement normal, aucune séquence imposée. Réglages désactivables dans l'éditeur.

Ne pas faire flotter la lampe sans fin, ne pas bloquer le défilement, ne pas utiliser de carrousel automatique pour les informations d'achat.


---

# Atelier Rive — aménagement intérieur, thème service

Projet fictif de démonstration. Nom exact : **Atelier Rive**. Activité : aménagement intérieur et décoration. Toutes les images sont des concepts ; aucune adresse, réalisation client, équipe, qualification professionnelle, année d'expérience ou distinction n'est attestée. Ne pas inventer ces données.

Le parcours est « découvrir une approche → explorer des intentions → comprendre une prestation → demander un premier échange ». Aucun panier, quantité, prix de produit ou cadeau physique.

## Direction visuelle distincte

Une mise en page de revue d'architecture, avec de grands titres alignés à gauche, des plans photographiques généreux, des légendes sobres, une numérotation de chapitres et des décalages de grille maîtrisés. Palette : fond papier `#EEEAE2`, encre vert profond `#243B32`, sauge `#B7C2AE`, cuivre `#A16743`, blanc `#FFFFFF`. Le cuivre sert aux petits repères, pas au texte courant sans contrôle de contraste.

Titres Archivo, textes Work Sans ou équivalents licenciés déjà disponibles. H1 88–116 px à 1440 px, 44–52 px sur mobile, interligne 1,0–1,08. Corps 17–18 px, largeur de lecture 58–66 caractères. Pas le même couple typographique ni la même mise en page que le thème ORBE.

Grille 12 colonnes, largeur utile 1344 px, marges bureau 48 px et mobile 20 px. Les photographies gardent des bords droits et des ratios variés. La structure est éditoriale, pas une grille de cartes de SaaS. Choisir les points focaux pour chaque image, sans étirer les pièces ou couper les éléments d'architecture importants.

En-tête papier : mot-symbole Atelier Rive à gauche, liens « Notre approche », « Inspirations », « Accompagnements », bouton contour « Parlons de votre intérieur ». Menu mobile compact. Aucun faux téléphone ou adresse. Pied de page vert profond, grand mot-symbole, liens de navigation et CTA.

## Accueil — progression à réaliser

| Ordre | Composition | Texte prêt à employer | Image |
|---|---|---|---|
| 1 | Grand titre sur fond papier avant une photo panoramique ; pas de texte posé sur le canapé | Surtitre « AMÉNAGEMENT INTÉRIEUR » ; titre « Des espaces qui vous ressemblent. » ; texte « Des volumes plus lisibles, des matières qui se répondent et une place pensée pour chaque usage. » ; CTA « Parlons de votre intérieur » | `rive-01-salon` |
| 2 | Introduction asymétrique : petit repère « 01 / L'approche » à gauche, grand texte sur 7 colonnes | « Partir de votre quotidien. Dessiner ce qui lui manque. » ; « Un projet commence par la façon dont vous habitez : les passages, les gestes, la lumière et les objets que vous voulez garder. » | `rive-10-menuiserie` en petite photo verticale, décalée |
| 3 | Index d'inspirations, une grande photo 8 colonnes puis deux verticales décalées, légendes hors image | « Une cuisine qui ouvre la pièce. » ; « Une chambre pour ralentir. » ; « Une entrée qui trouve sa place. » ; mention claire « Projets d'intention — images de démonstration » | `rive-02-cuisine`, `rive-03-chambre`, `rive-04-entree` |
| 4 | Bande vert profond, texte et photo de matériaux en alternance | « Le caractère d'un lieu se joue aussi dans la matière. » ; « Bois, pierre et textiles composent une palette cohérente, pensée à l'échelle de votre intérieur. » | `rive-07-matieres` |
| 5 | Trois prestations en grandes lignes numérotées, ouverture d'un résumé au clic et image associée | « Conseil & direction », « Aménagement d'une pièce », « Projet d'ensemble » ; CTA « Découvrir les accompagnements » | `rive-08-plans`, `rive-06-bibliotheque`, `rive-11-repas` selon la prestation |
| 6 | Grand reportage horizontal et légende concise | « Donner une fonction aux espaces oubliés. » ; présentation d'une intention d'aménagement | `rive-06-bibliotheque` si non utilisée comme image principale de la section précédente, sinon `rive-12-escalier` |
| 7 | Méthode en quatre étapes sur une composition ouverte, photo de plans à côté | « Échanger. Clarifier. Concevoir. Vous accompagner. » ; explication de 2–3 phrases par étape | `rive-08-plans` si non utilisée au-dessus, sinon aucune image répétée |
| 8 | Étude interactive explicitement fictive, ou deux vues côte à côte accessibles | « D'un volume à une intention. » ; labels « Volume de départ — simulation » et « Proposition d'aménagement — simulation » | `rive-09-volume` et `rive-01-salon`, seule répétition autorisée ici pour comprendre le même espace |
| 9 | FAQ éditoriale, 4–5 questions utiles | « Faut-il repenser tout le logement ? », « Peut-on garder le mobilier existant ? », « Comment choisir l'accompagnement ? », « Que préparer pour le premier échange ? » | Sans photo de remplissage |
| 10 | Appel final typographique, petite image verticale et formulaire d'entrée | « Et si l'on commençait par votre pièce ? » ; CTA « Présenter mon projet » | `rive-12-escalier` ou `rive-05-salle-eau`, selon l'affectation finale |

Chaque image éditoriale a une affectation principale ; arrêter la sélection finale avant le rendu pour éviter les doublons entre les alternatives de ce tableau. Les douze assets servent à l'ensemble du site et de ses pages, pas à forcer douze images sur chaque page.

## Page maîtresse — « Aménagement d'une pièce »

Construire une page de prestation complète, différente de la fiche ORBE :

1. Titre sur fond papier : « Repensons la pièce que vous vivez le plus. » Sous-titre : « Une proposition d'aménagement pour faire dialoguer vos usages, la lumière et les matières. » CTA « Parler de ma pièce ».
2. Grand visuel de bibliothèque (`rive-06-bibliotheque`) et deux légendes décrivant l'intention, jamais un résultat client.
3. « Pour quel projet ? » : salon à réorganiser, coin repas à définir, entrée à rendre plus lisible. Présentation en texte éditorial et trois repères, pas un catalogue de produits.
4. « Ce que nous préparons ensemble » : cadrage des besoins, direction d'ambiance, proposition d'implantation, sélection de matières et pistes de mobilier. Contenu de prestation fictive de démo, éditable avant emploi commercial.
5. « Une méthode, quatre étapes » : premier échange → définition du périmètre → propositions et échanges → synthèse du projet. Aucun délai ou nombre de retouches inventé.
6. Deux images complémentaires : plans (`rive-08-plans`) et matériaux (`rive-07-matieres`), grandes et lisibles, avec explications spécifiques.
7. « Choisir le bon niveau d'accompagnement » : comparaison de Conseil / Une pièce / Ensemble en tableau ou lignes éditoriales. Afficher les différences de périmètre ; aucun prix fictif présenté comme un tarif validé.
8. Étude « volume / intention » facultative si le composant est réellement utile à cette prestation. Mention visible du caractère simulé. Ne pas appeler ce bloc « Nos réalisations avant/après ».
9. FAQ avec réponses précises et limites : budget, périmètre et planning à définir au premier échange ; aucun engagement inventé.
10. Formulaire court « Votre intérieur, votre projet » : nom, e-mail, type de pièce, projet en quelques mots. Coordonnées déjà connues préremplies, sans nouvelle collecte inutile. Bouton « Demander un premier échange ».

Le formulaire de démo utilise la voie de test existante et confirme seulement l'enregistrement réel. Ne pas simuler un e-mail envoyé. Si un calendrier réel est configuré, le CTA peut y renvoyer ; sinon, le parcours présente la demande d'échange sans fausse grille de disponibilités. Pas de nouvelle connexion ni d'envoi réel à un tiers.

Prévoir accueil, liste des accompagnements, détail de cette prestation, galerie d'intentions et contact. Chaque lien mène à la bonne page ou ancre. Les photos peuvent revenir dans les vignettes de navigation d'un même projet, mais pas remplir plusieurs grands blocs sans raison.

## Mouvement attendu

- Le H1 se révèle par lignes, 650 ms, déplacement de 20 px maximum, avec le CTA accessible immédiatement.
- La photo d'ouverture peut s'élargir très légèrement de 96 % à 100 % sur les premiers 25 % de son passage, sans déplacement du contenu voisin. Mobile : cadrage statique.
- Les numéros de chapitres apparaissent avec le titre, pas avec une animation distincte sur chaque lettre.
- Les prestations changent d'image au clic, focus ou activation clavier ; fondu 220–300 ms, conteneur de dimensions constantes. Le survol ne doit jamais être le seul moyen d'accès.
- Le reportage peut utiliser un déplacement vertical de 16–24 px maximum, désactivable ; pas de verrouillage du scroll ni effet vestibulaire marqué.
- La méthode peut conserver une image sticky sur bureau pendant le défilement de ses étapes ; mobile en lecture naturelle, pas de pinning plein écran.
- Le comparateur d'étude utilise un vrai contrôle clavier/tactile et des labels. Si l'alignement des images ne permet pas une comparaison précise, afficher deux images côte à côte, sans promettre un alignement parfait.
- Mouvement réduit : aucun parallaxe ni sticky narratif, contenu immédiatement visible. Pas de curseur personnalisé qui gêne les liens.

## Différences à préserver avec ORBE

Atelier Rive commence par un titre sur papier puis une photo paysage ; ORBE place la promesse dans une composition orientée produit. Atelier Rive utilise de grandes lignes de prestations, une méthode et un projet à raconter ; ORBE utilise galerie, couleurs, offres et panier. Les espacements, la typographie, la navigation et le pied de page doivent aussi refléter ces parcours.


---

# Recette et preuves à remettre

## Critères visuels

- Deux directions reconnaissables, pas un même gabarit recoloré.
- Fiche ORBE et prestation Atelier Rive complètes, puis accueils et parcours associés.
- Titres lisibles, contrastes vérifiés, lignes équilibrées, images chargées, aucun débordement aux largeurs 390 / 768 / 1024 / 1440 px.
- Aucun grand bloc vide, texte générique dupliqué, photo d'une autre marque ou produit coupé sans motif.
- Tableau d'affectation des médias par page : même PNG ou recadrage utilisé pour deux grands blocs signalé et justifié ; aucune substitution silencieuse si une image manque.
- Les variantes de couleur ont leur vraie image de démonstration. Les cadeaux ont leur visuel propre.
- Les illustrations d'Atelier Rive sont identifiées comme projets d'intention ; aucun faux chantier, avis, client, certification, résultat ou chiffre de vente.
- Mobile recomposé : pas seulement les deux colonnes bureau empilées avec un H1 géant et une hauteur fixe.

## Interactions

Vérifier menu, navigation, galerie et zoom, choix couleur, offres de 1/2/3/4 articles, couleur de chaque article du lot, cadeau déverrouillé/verrouillé/épuisé, réduction de quantité, suppression du lot et recalcul serveur. Vérifier que le bloc fixe ne couvre aucun CTA, formulaire ou message.

Pour Atelier Rive : accès aux prestations et inspirations, comparaison des accompagnements, progression de la méthode, FAQ, étude fictive accessible, formulaire et résultat effectivement enregistré en mode test. Ne pas envoyer un message réel pour fabriquer une preuve.

Vérifier clavier, focus visible, lecteur de contenu sans animation, tactile et `prefers-reduced-motion`. Une animation doit être visible dans la vidéo du navigateur ; une image fixe ne la prouve pas.

## Moteur, édition et exports

Modifier depuis l'éditeur puis par la voie conversationnelle existante : image d'une section, titre, ordre, couleur d'une offre et activation d'une animation. Recharger, restaurer une version puis exporter. Vérifier la persistance et l'absence de changements sur un autre produit ou projet. Distinguer une réponse IA simulée d'un appel réel.

Les composants sont disponibles dans la galerie avec noms compréhensibles et aperçus fidèles. Les démos n'introduisent pas de conditions métier basées sur leur nom. Vérifier une adaptation à un autre produit et un autre service déjà disponibles, sans nouvel appel payant ni modification des données de vrais clients.

Respecter les contrôles requis par le dépôt pour le code effectivement modifié. Ne pas multiplier les tests décoratifs : choisir les régressions qui couvrent les défauts d'association, de commande, de persistance et d'export, puis les contrôles prescrits. Ce dossier de coordination seul n'est pas une modification de comportement de l'application.

Pour chaque CMS, renseigner séparément : composition, médias, modèle de page, animation, variantes, panier, remise, cadeau et paiement. États permis : vérifié réellement / testé par simulation / à configurer / non pris en charge / non vérifié. Un ZIP construit n'est pas une boutique installée ; le panier d'aperçu n'est pas le checkout de Shopify ou WooCommerce.

## Preuves minimales

1. Quatre pages clés × bureau et mobile : accueils ORBE/Rive, fiche ORBE, prestation Rive, soit huit captures complètes.
2. Vues rapprochées des premiers écrans, de l'achat ORBE solo/duo/trio avec cadeau, des prestations Rive et des deux pieds de page.
3. Une vidéo par thème montrant le défilement réel, les animations et au moins deux interactions, avec lecture mobile lisible. Fournir MP4 ou WebM selon les codecs réellement disponibles ; ne pas annoncer un format non produit.
4. Lien consultable vers le rendu réel si disponible dans l'environnement existant ; ne pas déployer publiquement pour créer ce lien sans autorisation.
5. Rapport `docs/coordination/LOT_2B_ORBE_RIVE_RESULTATS.md` : changements, décisions, commandes et résultats, SHA du code testé/capturé, assets utilisés, matrice CMS, limites.
6. Index de preuves dans le dépôt, liens au commit livré, PNG originaux et vidéos téléchargeables. Afficher aussi des aperçus explicites dans la réponse ; le groupe « images vues » seul ne suffit pas.

Avant remise : ouvrir les huit captures, parcourir toute la page pour charger les médias, revoir les gros plans, lire les vidéos et corriger les défauts visibles. Dire exactement ce qui n'a pas pu être vérifié. Aucun score esthétique inventé, aucune validation anticipée au nom de Thomas.

Conserver les preuves précédentes de #134. Faire une nouvelle livraison datée, puis attendre la validation visuelle de Thomas avant les 28 autres thèmes. Aucune fusion ni mise en ligne dans cette mission.


## Action attendue de la session de développement

Accuser réception de ce commentaire, citer la branche et les consignes effectivement lues, indiquer l'état d'accès au pack visuel, puis réaliser le travail autorisé. Présenter les vrais rendus bureau/mobile et une vidéo des animations à Thomas avant toute déclinaison des 28 autres thèmes. La publication de ce commentaire ne prouve pas qu'une exécution Codex a démarré.

