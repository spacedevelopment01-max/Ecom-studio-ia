# Lot 2B — ORBE et Atelier Rive — reprise avec les 24 images

**Livraison du 18 octobre 2026 pour revue visuelle de Thomas.** Les quatre pages utilisent les images du pack, dans le moteur existant. La fiche ORBE propose un achat accessible dès le premier écran mobile. Le pied de page Rive ne répète plus son logo. Le complément du commentaire 6248929074 est intégré : l’accueil ORBE présente un vrai produit à la une, avec galerie, informations et achat dans une seule section.

Cette livraison ne vaut pas validation esthétique par Thomas. Les 28 autres thèmes restent en attente. Aucun merge, déploiement, appel IA payant, nouvelle connexion ou changement de l’accueil public du studio.

## Version et consignes

- Branche : `codex/lot-2a-themes-reference`, PR #134, base #133 conservée.
- Reprise de la tête distante `077a2106227e7a7a00c89e783f1a37f6775d54ae`, sans modification locale préexistante. Sa CI était réussie, vérifiée dans les résultats GitHub ; elle ne constituait pas une validation des anciens rendus sans photos.
- Code du moteur et composant produit : `db98a105f42bda4dd24af133e243c8cf8c94c969` ; jeu de démonstration générique corrigé dans `6dd31fae4875e4f19a8e82d4026277f3b16aad8a`.
- **Commit de référence des captures et vérifications finales : `563ab003ca1d4ca836738767f898027be24acc59`.** Les éventuels descendants de documentation ne modifient pas le rendu. Le harnais fixe désormais le SHA au démarrage et refuse de valider ses preuves si HEAD change pendant la capture.
- `CLAUDE.md`, guides locaux de conception, revue d’interface et vérification de thème lus. Mission principale [6247457951](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6247457951), mise à jour du 18/10 à 10:48:03 UTC, et complément [6248929074](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6248929074) lus. Copie actuelle : [LOT_2B_ORBE_RIVE_MISSION.md](LOT_2B_ORBE_RIVE_MISSION.md).
- ZIP reçu et extrait dans un dossier de travail privé. README, MESSAGE_CODEX, ORBE, ATELIER_RIVE, RECETTE, ASSETS, MISSION_GITHUB et manifeste lus. Les commentaires récents #133/#134 ont été consultés et la réception des deux consignes signalée sur #134.

## Médias et confidentialité

**REPRODUIT** — les 24 WebP ont été ouverts individuellement, pas seulement comptés : 12 ORBE et 12 Atelier Rive. Les 24 empreintes sont distinctes ; `sha256sum -c SHA256SUMS` réussit pour tous les fichiers du pack. Le manifeste est vérifié à l’import : identifiant unique, chemin, dimensions et SHA256. Un désaccord ou une affectation ambiguë est refusé.

Les images sont enregistrées comme médias approuvés de nouveaux projets isolés, avec rôle, description française, provenance de démonstration et identifiant durable dans `ThemeSpec.files`. Les originaux restent inchangés dans la bibliothèque. L’aperçu et les exports utilisent la conversion WebP normale du moteur : leurs octets sont contrôlés contre cette conversion, et non prétendus identiques aux originaux. Les requêtes aux médias après rechargement sont comparées aux empreintes des fichiers compilés.

**Contrainte du pack : aucun ajout public des images.** Le dépôt est public, vérifié par l’API GitHub. Ni ZIP source, ni photos, ni captures/vidéos les montrant, ni nouveaux exports contenant ces photos ne sont ajoutés au dépôt. Les preuves visuelles sont disponibles dans la Page privée du propriétaire, avec huit captures complètes téléchargeables, leurs aperçus, deux gros plans et quatre vidéos MP4. Leur insertion a été explicitement autorisée dans la conversation ; la relecture de la Page confirme les 22 références de fichiers et dix images intégrées. Le dépôt reçoit le code, les tests, le présent rapport, les mesures, l’index des empreintes et les journaux techniques vérifiés. Les anciennes preuves publiques sans photos restent conservées dans `reports/lot2b/`.

Le dossier local de livraison prévu par l’interface est inaccessible dans cette session (`/codex` en lecture seule / permission refusée). Le transfert et l’insertion dans la Page privée ont réussi après accord explicite du propriétaire, sans ouverture de droits publics. La mise en page de cette Page ne dispose pas d’un outil de prévisualisation dans cette session ; son contenu enregistré et les fichiers sources ont été vérifiés. Aucun lien signé d’aperçu, clé, identifiant d’accès ou donnée client n’est publié. Une Page privée ne donne pas à un lecteur anonyme de GitHub accès aux fichiers.

## Corrections et fichiers

### Cadrages et composition

**CONFIRMÉ DANS LE CODE et REPRODUIT** — `ed-opening`, `ed-scene`, `ed-diptych`, `ed-finishes`, `ed-media.liquid`, `editorial.css`, `editorial.js`, `tests/lot2b-fixtures.ts` :

- Ratios ordinateur/mobile et choix « remplir / conserver le visuel entier » configurables dans les schémas et l’éditeur. Les points focaux existants sont conservés. Traductions FR/EN ajoutées.
- ORBE : retrait du fond opaque uniquement par réglage explicite de l’ouverture ; la lampe n’est plus masquée par le cartouche. Titre mobile recomposé ; le cadre suit le ratio de la photographie, sans réserver un ancien espace portrait sous une vue paysage. Panorama du duo maintenu en 16:9 sur mobile pour montrer les deux lampes ; trio conservé entier ; accessoires carrés ; bureau en paysage.
- Atelier Rive : titre avant paysage, vues d’ouverture mobiles en 3:2, index d’inspirations asymétrique, chambre/entrée verticales, matières carrées, reportage escalier vertical. Les vues « volume / intention » restent côte à côte, avec leur statut simulé ; aucun alignement parfait n’est promis.
- Les finitions activent leurs vraies images et une transition courte ; le mouvement réduit reste respecté. Les photos de concepts ne sont pas présentées comme réalisations ou produits vendus.

### Achat mobile et pied de page

**CONFIRMÉ DANS LE CODE et REPRODUIT** — `main-product.liquid`, `purchase-offers.liquid/js/css`, `footer.liquid` :

- Offres disposées sur deux colonnes mobiles, choix de couleurs par article plus compacts, titre et galerie rapprochés. La galerie garde la silhouette entière et ses commandes visibles.
- Barre mobile optionnelle de la fiche : même sélection, même total et même fonction d’ajout que le bouton principal, avec verrou pendant l’envoi. Aucun prix de commande transmis comme autorité au serveur. Le lien Modifier cible les vrais choix.
- Barre masquée pendant menu, zoom, interaction avec les champs/la galerie, affichage du bouton principal, erreur visible ou arrivée au pied de page. Réservation d’espace et marges de défilement pour le focus.
- Total de sélection affiché dans le bloc ; le prix unitaire natif n’est plus confondu avec celui du lot. Le gabarit sans offres conserve son prix natif.
- Réglage `show_secondary_brand` par défaut actif pour préserver les pieds de page existants ; désactivé pour Rive, avec composition adaptée. Une seule grande signature, sans second petit logo.

### Produit à la une et source commune

**CONFIRMÉ DANS LE CODE et REPRODUIT** — `featured-product.liquid`, `purchase-offers.ts`, `compile.ts`, `render.ts`, `section-library.ts`, scripts et tests du lot :

- Réutilisation du composant existant `featured-product`, proposé comme **Produit à la une** dans la galerie. Galerie, zoom, titre réel, description, bénéfices, prix unitaire, total et achat sont réunis. Deux colonnes bureau ; mobile avec nom, photo/galerie, informations et bouton avant les choix détaillés. Aucun panneau fixe ne recouvre ses options.
- Les packs et cadeaux sont facultatifs. Sans configuration d’offres, le composant conserve l’achat natif existant. Finitions et prix unitaires proviennent du produit sélectionné.
- L’accueil lit `product.editorial:main` par `purchase_source`. Les offres ne sont pas recopiées dans les données du projet. La compilation et l’aperçu résolvent la source ; seuls ses blocs commerciaux sont transmis, pour respecter le schéma du composant. Les points forts propres au composant sont conservés ; une collision d’identifiants ferme la configuration au lieu d’écraser le contenu.
- Un produit cible absent n’est pas remplacé par le premier produit disponible. Le gabarit par défaut de la démo ne reprend pas le titre ni l’identité commerciale réservés à la lampe : l’accessoire garde son propre nom.
- Le lien vers la fiche transmet l’offre et les identifiants des finitions. La fiche n’accepte cet état qu’après validation dans son propre catalogue et ses propres offres. Les prix sont recalculés. Les déplacements de vignettes restent dans leur conteneur et ne provoquent plus de saut de page.

Le panier conserve les règles antérieures : 1/2/3/4 lampes à 79,00 / 142,20 / 201,45 / 252,80 € de test ; une pochette par lot à partir de trois, selon stock ; retrait du cadeau lors du passage à deux ou suppression. La boîte n’est pas transformée en cadeau. Aucun faux avis, performance, délai ou moyen de paiement ajouté.

## Affectation principale des 24 médias

| Groupe | Fichiers et usage |
|---|---|
| ORBE — objet et finitions | `01-dune`, `09-charbon`, `10-argile` : variantes de galerie, sélecteur de finitions, produit à la une et vignettes fonctionnelles de panier |
| ORBE — ouverture | `02-chambre` : grand visuel de l’accueil, texte à gauche ; non répété comme ouverture de la fiche |
| ORBE — usages | `03-diner`, `04-lecture` : diptyque ; `08-lumiere` : scène sombre ; ces vues existent aussi dans la galerie fonctionnelle du produit |
| ORBE — ensembles | `06-duo` : panorama conservant les deux lampes ; `07-trio` : présentation des trois finitions |
| ORBE — fin de parcours | `05-bureau` : conclusion de l’accueil et vue de galerie ; `11-boite`, `12-pochette` : accessoires distincts ; la pochette illustre aussi son propre cadeau |
| Rive — ouverture / étude | `01-salon` : accueil, répété seulement pour l’étude d’intention avec `09-volume` ; étude explicitement simulée |
| Rive — inspirations | `02-cuisine`, `03-chambre`, `04-entree` : index et galerie d’intentions |
| Rive — approche / matières | `10-menuiserie` : détail de l’approche ; `07-matieres` : bande matières et explication de prestation |
| Rive — prestations | `08-plans`, `06-bibliotheque`, `11-repas` : vues des trois accompagnements ; bibliothèque en ouverture de la prestation, plans/matières pour l’explication détaillée |
| Rive — reportage / contact | `12-escalier` : reportage vertical ; `05-salle-eau` : image complémentaire du contact |

Les photographies réutilisées dans des galeries de choix, fiches liées, panier ou étude du même lieu ont un rôle fonctionnel explicite. Elles ne constituent pas de nouveaux grands blocs de remplissage sur une même page. Les fichiers ne dépendent pas des noms des projets dans le moteur de production ; ces noms et ces prix figurent uniquement dans les données de démonstration.

## Vérifications réellement exécutées

| Commande réellement exécutée | Résultat |
|---|---|
| `sha256sum -c SHA256SUMS` dans le pack extrait | tous les fichiers conformes, 24 WebP distincts ouverts individuellement |
| `npx tsc --noEmit` sur `563ab00` | réussi, sortie 0 |
| `npx vitest run tests/lot2b-editorial.test.ts tests/lot2a-purchase.test.ts tests/themes-catalogue.test.ts tests/theme-en.test.ts` sur `563ab00` | 44 tests réussis, 4 fichiers, sortie 0 |
| `PATH=/workspace/work/lot2a/php-native/bin:$PATH npx vitest run --maxWorkers=4` | 1 990 réussites, 4 dépassements de délai, 264 fichiers ; sortie 1, 1 044,63 s |
| `npx vitest run tests/migration-v2.test.ts tests/workflow-v2.test.ts -t 'calendrier de la création\|parcours complet sur un projet existant\|site de plâtrier-peintre\|calendrier sauté' --maxWorkers=1` | les 4 cas concernés réussissent ; 13 autres cas non sélectionnés, 213,64 s ; sortie 0 |
| `scripts/verify-theme.sh` | 137 cas réussis, zéro erreur ; sortie 0 |
| `DATA_DIR=/workspace/work/lot2b-pack/build-final-data STOCK_OFFLINE=1 npm run build` | compilation réussie, 49 pages statiques, sortie 0 ; aucun déploiement |
| `PLAYWRIGHT_BROWSERS_PATH=/workspace/work/lot2a/browsers npx tsx scripts/lot2b-proof.ts /workspace/work/lot2b-pack/final-pr134-cadrage /workspace/work/lot2b-pack/ORBE_RIVE_2026-10-18` | réussi sur `563ab00`, arbre propre : 16 visites, 12 médias par projet, aucun manque ni appel IA ; huit PNG complets, gros plans, 4 MP4/4 WebM et dix exports privés |
| `npx tsx scripts/lot2b-widget-proof.ts /workspace/work/lot2b-pack/final-pr134-cadrage /workspace/work/lot2b-pack/ORBE_RIVE_2026-10-18` | réussi : finitions → fiche, clavier, navigation Rive et vrai geste tactile Chromium |
| `PATH=/workspace/work/lot2a/php-native/bin:$PATH npx tsx scripts/lot2b-php-proof.ts /workspace/work/lot2b-pack/final-pr134-cadrage` | 17 sections PHP des ZIP exécutées, titres préservés, aucune erreur ; contexte catalogue Woo natif non alimenté |
| Contrôle `check()` de `@shopify/theme-check-node` sur les deux vrais `shopify.zip` extraits | 0 erreur, 0 avertissement pour ORBE et Rive |
| FFmpeg + FFprobe + lecture Chromium des quatre MP4 | décodage intégral et lecture réussis ; H.264, 1440×900 / 390×844, 29,64 à 40,76 s ; vues inspectées à 15 %, 50 %, 90 % et zoom ORBE relu plus finement |

**Suite générale : ne pas la déclarer verte.** Le calendrier de création (`migration-v2`, 120 s) et trois cas de `workflow-v2` (campagne/calendrier/export, services, calendrier sauté ; 240/240/120 s) dépassent leur délai. Une première reprise intermédiaire du calendrier échoue encore ; le même cas sur la base distante `077a210` réussit en 82,90 s. Après les compilations et captures, les quatre cas réussissent avec un seul worker sur le code final. Une contention est une **HYPOTHÈSE** ; aucune cause précise ni régression du calendrier n’est démontrée. Aucun code du calendrier n’a été modifié.

La suite générale et le contrôle complet des thèmes ont été lancés après l’intégration du produit à la une, avant la dernière retouche du ratio CSS et des métadonnées du jeu de démonstration. Types, 44 tests ciblés, quatre reprises, huit captures, interactions et dix exports ont ensuite été contrôlés sur le commit final. Les deux vrais ZIP finaux passent aussi Theme Check. Une première suite générale avait été interrompue pour intégrer la nouvelle mission ; elle n’est pas comptée comme suite terminée. Les premières captures de travail ont été remplacées par une capture finale figée après inspection, sans modifier les anciennes preuves publiques.

**Mesure mobile :** à 390 px, la barre d’achat de la fiche est dans le premier écran et présente le duo Dune + Dune à 142,20 €. Le bouton du bloc complet se trouve vers 1 616 px ; il n’est pas prétendu lui-même au premier écran. Le produit à la une mobile utilise son unique bouton dans le contenu, avant les choix détaillés. Le navigateur vérifie aussi le passage accueil → fiche en trio Charbon + Argile + Dune à 201,45 €, puis le panier calculé par le serveur.

Les [journaux et mesures](../../reports/lot2b/2026-10-18-pack/README.md) permettent de distinguer chaque exécution et ses limites. Les contrôles d’accès et le refus des médias d’un autre projet sont conservés. Aucun appel fournisseur réel n’est annoncé comme réussi.


Les preuves spécifiques utilisent les routes réelles d’aperçu, une base temporaire, un utilisateur de test et Chromium local. Le réseau fournisseur est interdit dans les harnais. Les tests manuels/conversationnels passent par les vraies routes et le worker local, avec session Next simulée et IA désactivée ; il ne s’agit pas d’un appel fournisseur réussi.

Édition et restauration : texte, média, cadrage, ordre, couleurs, police et animation ; refus d’un média d’un autre projet ; persistance des associations et conservation des autres sections. Une image de test synthétique sert à la régression du manifeste ; le navigateur utilise les vraies 24 images du pack.

Généralisation : composants exercés sur kit de gravure sur bois et diagnostic acoustique, indépendants des deux démos. Les régressions antérieures de lots couvrent d’autres catalogues/variantes. Cela vérifie le contexte et les opérations, sans prétendre avoir validé esthétiquement autant de sites complets.

## Exports et CMS

Les dix ZIP restent privés car ils contiennent les photos. Chaque export est inspecté : les douze médias de son projet doivent correspondre aux mêmes octets compilés que l’aperçu. Le simple fait de produire le ZIP ne prouve pas l’installation dans un CMS.

| Plateforme | Composition / modèle | Médias | Animations | Variantes / panier | Remises / cadeaux | Paiement |
|---|---|---|---|---|---|---|
| Aperçu studio | vérifié réellement dans le moteur à quatre largeurs | vérifiés réellement, import, rechargement, galerie et zoom | vérifiées dans Chromium, mouvement réduit testé | choix par article et panier serveur vérifiés | seuil, stock zéro, recalcul et retrait vérifiés avec données fictives | non pris en charge dans la démo |
| Shopify | thème OS 2.0 compilé, Theme Check local ; installation non vérifiée | présents dans le ZIP et contrôlés ; import au catalogue et affectation native à configurer | mêmes fichiers transmis, non vérifiées dans une boutique | catalogue/import et panier CMS non vérifiés | avantages désactivés à l’export ; adaptateur commercial vérifié nécessaire | non vérifié |
| WooCommerce | sections éditoriales exécutées en PHP local ; produit à la une remplacé par produit natif Woo ; reproduction intégrale de la fiche ORBE non certifiée | fichiers fournis ; médias et variantes natifs à affecter | fichiers transmis, installation WordPress non vérifiée | parcours Woo natif à configurer et vérifier | non pris en charge par cette livraison | non vérifié |
| PrestaShop | export HTML/Smarty/module ; produit à la une adapté en présentation avec lien, commande sur fiche native | fichiers fournis ; affectation et déclinaisons natives à configurer | fichiers transmis, installation non vérifiée | panier natif non vérifié | non pris en charge par cette livraison | non vérifié |
| Wix | kit de reprise, pas de thème importable complet | fichiers fournis, intégration native à configurer | à configurer | à configurer nativement | à configurer nativement | non vérifié |
| Squarespace | kit de reprise, pas de thème importable complet | fichiers fournis, intégration native à configurer | à configurer | à configurer nativement | à configurer nativement | non vérifié |

`guardPurchaseExport` et les manifestes de conditions sont conservés. Aucun fichier de configuration n’est présenté comme une remise installée au checkout. Le formulaire Rive est vérifié dans la voie de test du studio : reçu local réellement écrit, aucun e-mail envoyé. Réception, protections et destinations CMS restent à configurer et à vérifier sur une installation autorisée.

## Preuves, reprise et limites

- Huit PNG complets : quatre pages × bureau/mobile, plus premiers écrans, pieds de page, gros plans du produit à la une, achats, panier, zoom et contact. Vidéos réelles du navigateur en MP4/WebM, pas des diaporamas.
- Les médias sont ouverts et inspectés avant remise ; lecture et décodage vidéo sont consignés dans les mesures privées. Aucun score esthétique inventé. Un lien vers un serveur temporaire arrêté n’est pas présenté comme une prévisualisation consultable.
- [Index public des mesures et empreintes](../../reports/lot2b/2026-10-18-pack/README.md). Les liens privés sont remis dans la conversation du propriétaire, sans modifier leur audience ni publier ses images.
- Les anciennes références consultées et leurs limites d’accès restent décrites dans le [rapport précédent au commit 077a210](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/077a2106227e7a7a00c89e783f1a37f6775d54ae/docs/coordination/LOT_2B_ORBE_RIVE_RESULTATS.md). Cette passe utilise les médias fournis, sans reprendre une photographie, marque, avis ou promesse de ces références. Leur consultation antérieure n’est pas présentée comme une nouvelle mesure visuelle.
- Les créations complexes par fournisseur IA, les paiements, une installation complète Shopify/WordPress/PrestaShop et la mise en service des formulaires externes ne sont pas vérifiés. Aucun contournement par nouveau compte ou déploiement.

Reproduction, depuis le dépôt, avec le pack conservé dans un dossier privé **hors suivi Git** :

```bash
PLAYWRIGHT_BROWSERS_PATH=/chemin/du/cache-local npx tsx scripts/lot2b-proof.ts ../work/pr134-prive /chemin/prive/ORBE_RIVE_2026-10-18
npx tsx scripts/lot2b-widget-proof.ts ../work/pr134-prive /chemin/prive/ORBE_RIVE_2026-10-18
PATH=/chemin/du/php-local:$PATH npx tsx scripts/lot2b-php-proof.ts ../work/pr134-prive
```

Les harnais refusent une base préconfigurée ; ils créent et suppriment leur propre base de test. Ne pas ajouter le dossier privé au dépôt public. Avant toute reprise, récupérer la branche distante et conserver les autres modifications.

**Prochaine étape : Thomas examine les quatre pages, leurs versions mobiles et les interactions, puis valide ou demande des retouches. Les 28 autres thèmes ne sont pas commencés.**
