# Lot 2A — deux références intégrées, à examiner visuellement

## Périmètre et décision applicable

Livraison de **Vitrine**, référence produit illustrée par ARVEN, et de **Jardin**, référence services illustrée par Racines & Pierres. Il s'agit de propositions à examiner ; aucune acceptation esthétique du propriétaire n'est présumée. Les 28 autres thèmes ne sont pas déclinés.

La mission est [conservée ici](LOT_2A_MISSION.md). La [décision du 18 octobre à 00:43 UTC](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133#issuecomment-6243851508) demande de terminer la version en cours avant de décider de sa conservation ou de son remplacement. Elle remplace la suspension précédente ; ORBE et Atelier Rive ne sont pas engagés. Les deux messages ont été lus et accusés réception sur #133.

Base examinée : `70b6874e83eecb39eae622d4c59422f43fffd677`, branche distante du lot 1. `main` était à `ad41c596e859781f33874730891b4bd8b85e259e`. Aucun changement local initial. Travail sur `codex/lot-2a-themes-reference` ; PR de suite vers `codex/lot-1-consignes-textes-themes` tant que #133 reste non fusionnée. Aucun code ni description de #133 remplacé.

**Versions, publication et résultats finaux : voir le relevé de consolidation ajouté en fin de rapport.** Les preuves indiquent séparément le commit réellement rendu. Les commits de preuves/documentation ne modifient pas rétrospectivement ces identifiants.

## Changements et preuves

| Changement | Fichiers et fonctions | Preuve / qualification |
|---|---|---|
| Deux compositions distinctes dans le moteur, sans condition sur les marques de démo | `referenceHomeRows`, `buildSpec`, `src/lib/theme/reference-composition.ts`, `directions.ts` | **CONFIRMÉ DANS LE CODE, REPRODUIT** : 9 sections visibles produit, 10 services ; moteur réel, rendu Liquid et ZIP |
| Ouverture, reportage visuel, offres éditoriales, notes factuelles réutilisables | `theme-base/sections/ref-*.liquid`, `theme-reference.css` | **REPRODUIT** : schémas, ajouts/suppressions, variantes, remplissage par le contexte du projet |
| Bibliothèque FR/EN et variantes d'en-tête/pied de page | `section-library.ts`, `section-copy-reference.ts`, `section-copy.ts`, `section-defaults.ts`, `layout-choices.ts`, schémas `header.liquid` / `footer.liquid`, `schema.en.json` | **CONFIRMÉ DANS LE CODE, REPRODUIT** : libellés, réglages et insertions ; aperçus par la route de bibliothèque existante |
| Galerie du studio reliée aux deux références | `theme-gallery.tsx`, `tab-boutique.tsx`, `public/theme-references/` | **CONFIRMÉ DANS LE CODE, REPRODUIT** : route de sélection → job `shop.direction` → worker → moteur local → version enregistrée ; pas une maquette indépendante |
| Retouches locales de l'ouverture et de l'en-tête | `v2ThemeCommand`, `src/lib/theme-v2/local-edit.ts` | **REPRODUIT** : API manuelle puis chat réel/worker ; titre client conservé, FAQ après la sélection, en-tête changé, autres fiches identiques, historique et restauration |
| Photos de prestation conservées après renommage ; association ambiguë refusée | `serviceSlots`, `src/lib/engine/shop.ts`, `referenceHomeRows` | **REPRODUIT** : identité explicite si présente ; ancien nom/alias seulement s'il désigne une offre unique ; les autres cartes n'empruntent pas sa photo |
| Liens de prestations par identité, détail illustré avec le texte complet | `bindReferenceOffers`, `reference-delivery.ts`, `composeShop`, métadonnée `meta.reference` dans `spec.ts` | **REPRODUIT** : titres homonymes et blocs réordonnés ne changent pas les liens ; aucun paragraphe résumé ; titre déplacé dans l'unique H1 pour un corps fraîchement livré, gabarit personnalisé laissé intact |
| Même média présent sous plusieurs alias non répété dans les nouveaux reportages | `referenceHomeRows` | **REPRODUIT** : déduplication par identifiant d'asset, pas seulement par nom de fichier |
| Logo importé et objet photographié préservés | sections, CSS de référence, fichiers existants | **REPRODUIT VISUELLEMENT** : objet entier dans l'ouverture et les nouveaux reportages ; logo fourni sur une surface lisible, sans recoloration ni remplacement |
| Formulaires du pied de page, focus et galerie utilisables | CSS de référence ; galerie produit native en carrousel | **REPRODUIT** : champ et bouton sur des lignes distinctes, focus visible de 3 px, retour du focus après Échap, miniature active, panier de démonstration |
| Réservation et réassurance existantes conservées lors du changement de composition | `buildSpec`, bloc de remplacement de l'accueil | **REPRODUIT** : calendrier actif ou masqué conservé ; horaires inconnus → demande avec date maintenue ; réassurance du marchand conservée avec son état masqué si non renseignée |
| Méthode sans étapes inventées ou espaces réservés visibles | `referenceHomeRows` | **REPRODUIT** : étapes non renseignées écartées ; section masquée s'il reste moins de deux étapes connues ; test du catalogue conservé |

Les plafonds des forfaits, contrôles d'accès, crédits, budgets, limites de tentative, protections de versions et association des produits du lot 1 restent utilisés. Aucun nouveau fournisseur, aucun tarif ni mécanisme de facturation ajouté. Les 30 identifiants et leur classement de forfait sont conservés. La page d'accueil publique du studio et ses médias de démonstration existants ne sont pas modifiés.

## Rendu et contenu

| | Vitrine / produit | Jardin / services |
|---|---|---|
| Composition | Ouverture asymétrique, collection native, matière, bénéfices illustrés, reportage en retrait, caractéristiques, galerie, FAQ, appel final | Titre paysage, grand visuel, introduction en retrait, prestations en lignes, panorama, principes, méthode, galerie, FAQ, informations pratiques, devis |
| Typographie par défaut | Cormorant / DM Sans | Archivo / Work Sans |
| Traitement | Fond clair, encre, photographies de l'objet, filets et pied typographique | Ivoire, forêt, accent rose de la marque, paysage et matières, pied typographique distinct |
| Parcours | Accueil → catalogue → fiche → panier de démonstration | Accueil → prestations / présentation → détail → formulaire de devis |
| Démonstration | Prix de 129 € fictif, annoncé comme tel ; aucun paiement réel | Entreprise fictive, zone/horaires issus des données de démo ; aucun professionnel réel contacté |

Les palettes et typographies explicitement transmises au constructeur restent ses entrées ; les retouches manuelles modifient les réglages existants. Les composants sont éditables dans le modèle de thème habituel : textes, images, couleurs, liens, composition, animation, ordre et suppression. Il n'existe pas une deuxième version HTML autonome réservée aux captures.

La sélection des exemples ne devient pas une règle de métier. Les noms ARVEN / Racines & Pierres se trouvent dans les données de test, les médias de démonstration et les preuves ; aucune condition de production ne dépend de ces noms. Le moteur choisit ces deux compositions par identifiant de thème et type produits/services.

Les textes s'appuient sur les informations des démonstrations. Aucun avis, volume de ventes, certification, délai de livraison ou performance non renseignée n'est ajouté. Dimensions, mouvement et étanchéité de la montre restent explicitement à confirmer. Il n'y a ni panier artificiel sur le site de services, ni réservation externe annoncée comme vérifiée.

## Références et médias

[Direction artistique et sources publiques consultées](LOT_2A_DIRECTION.md). Références examinées dans leurs sources actuelles : Vercel Commerce et AstroWind ; règles d'interface récentes de Vercel. Les commits et fichiers consultés sont indiqués. L'accès direct à Muuto a été refusé par le proxy HTTP 403 : aucune visite de sa version en production n'est revendiquée. Une comparaison visuelle indépendante avec les meilleurs sites de production reste donc partielle.

Les photographies et logos sont les ressources autorisées déjà présentes dans `public/demo/montre/` et `public/demo/paysagiste/`. Le dossier de preuves de chaque thème contient la correspondance des fichiers utilisés dans `provenance-medias.json`. L'origine historique déclarée est dans `public/demo/manifest.json` : photographie source de la montre et ressources de démonstration préparées antérieurement pour le projet. Aucun nouveau téléchargement de photo, aucune génération d'image, aucune personne ajoutée. Certaines vues de jardin sont des cadrages du même lieu ; elles ne sont pas présentées comme douze réalisations distinctes.

Le travail déjà réalisé est conservé : ni fichiers des anciennes démos remplacés, ni projets existants réinitialisés. Les nouvelles vignettes ne servent qu'aux vues internes du studio.

## Chaîne réellement vérifiée

`tests/lot2a-fixtures.ts` prépare des projets isolés, leurs profils, textes et médias en passant par les fonctions de stockage existantes. Les pages de prestations utilisent le moteur de contenu local puis une sauvegarde de texte utilisateur. `composeShop` et `buildSpec` composent les références ; la livraison du lot 1 et le rattachement par identité restent en place.

`tests/lot2a-reference.test.ts` vérifie également les routes authentifiées de sélection, modification manuelle, chat et restauration, la prise du vrai job puis son vrai handler, et les versions enregistrées. La session Next est adaptée au harnais et la disponibilité IA forcée à faux. **Aucune réponse de modèle n'est simulée dans ces tests : c'est le moteur local qui traite les demandes déterministes. Aucune conversation avec un fournisseur IA réel n'a été testée.**

`scripts/lot2a-proof.ts` sauvegarde de vraies versions puis sert les véritables routes `GET` / `POST` d'aperçu du dépôt dans un serveur HTTP local. Leur accès signé, leur chargement de ressources et leur panier sont utilisés ; aucun panier factice parallèle n'est écrit pour la preuve. Les captures concernent le rendu du thème, sans les outils de sélection superposés de l'éditeur (`es_raw=1`). Les jetons temporaires ne sont pas publiés.

Avant chaque capture : parcours jusqu'en bas de page, chargement et décodage de toutes les images, y compris les miniatures et recommandations, attente des polices, retour en haut. Aucun style destiné à masquer un défaut ou à remplacer le site par une maquette n'est injecté. Seule une aide de sérialisation `tsx` est fournie au harnais Playwright.

Chaque thème est contrôlé à **1440, 390, 768 et 1024 px** sur l'accueil et sa fiche produit/prestation. Le relevé vérifie un H1, zéro média manquant, zéro erreur JavaScript et un débordement horizontal inférieur ou égal à 1 px. Les pages catalogue / prestations / présentation / contact font aussi l'objet de navigations réelles sur mobile. FAQ, menu et Échap, retour du focus, validation native de l'e-mail, galerie produit, panier local et mouvement réduit sont contrôlés. Le formulaire est rempli sans envoi externe ; ni destinataire réel ni paiement vérifiés.

## Adaptation à d'autres offres

Les cas supplémentaires n'ont pas servi à dessiner les deux références : **lampe en céramique**, **plans de couture numériques**, **réparation de vélos cargo**, **traduction juridique**. Ils couvrent textes courts et longs, deux offres, informations absentes et absence de média. Le rendu et le modèle sont vérifiés sans faire apparaître les marques des démonstrations ni inventer une image. Ces essais de généralisation sont techniques ; ils ne constituent pas une validation esthétique de chacun de ces métiers.

Un catalogue montre / gourde / casque vérifie aussi des produits distincts avec leurs images propres, trois affectations de gabarit, fichiers ZIP présents et absence des caractéristiques de la montre sur les autres fiches. Les deux démonstrations visuelles utilisent des médias carrés, presque carrés, portraits et paysages ; leurs tailles mobiles et intermédiaires sont contrôlées. Les variantes restent celles du composant natif existant : la montre de démo n'en possède pas, et aucun nouveau test de sélection d'une variante réelle dans un CMS n'est revendiqué.

Pour la validation suivante, choisir des projets non utilisés pendant ce développement, par exemple un abonnement documentaire et un entretien de toitures, avec leurs propres données et médias autorisés. Vérifier titres/paragraphes complets, prix connus ou absents, image attachée à chaque offre, ordre et lien après renommage, H1 et URL, mobile, ajout de FAQ puis restauration, et les trois ZIP. Aucun nom d'exemple ne doit entrer dans le moteur. La qualité commerciale et la pertinence artistique restent à examiner sur ces nouveaux cas.

## Matrice des exports

Six ZIP sont produits par le véritable `cmsExport`, avec leurs inventaires de fichiers et avertissements dans les preuves. La présence d'un fichier n'est pas une installation réussie.

| Élément | Shopify | WordPress / WooCommerce | PrestaShop |
|---|---|---|---|
| Format | Thème Liquid / JSON natif | Thème blocs WordPress, runtime existant et CSV WooCommerce | Thème enfant Classic et module compagnon, gabarits Smarty |
| Nouveaux composants et CSS | Sources, schémas et CSS présents ; Theme Check officiel sur les ZIP réels | Sections utilisées, réglages et CSS conservés dans l'archive ; runtime PHP non exécuté ici | HTML rendu des sections, CSS et médias présents ; conversion Smarty examinée |
| Textes, médias, en-têtes et pieds | Préservés dans le modèle et l'archive | Sérialisés dans les blocs et ressources ; apparence après installation non vérifiée | Rendus et fichiers présents ; apparence après installation non vérifiée |
| Fiche par produit | Affectations distinctes conservées dans le manifeste | **Dégradé** : fiche native partagée, avertissement `product_layouts_shared` | **Dégradé** : fiche Classic partagée, même avertissement |
| Affectation après ZIP + CSV | **Manuelle toujours requise**, avertissement `product_template_assignment_required` conservé ; pages à créer et affecter selon `pages-a-creer.json` | Import et correspondance SKU à vérifier dans WooCommerce | Import et correspondance à vérifier dans PrestaShop |
| Edition native | Schémas Shopify présents, éditeur réel non ouvert | Blocs éditables prévus par l'adaptateur ; fonctionnement réel non vérifié | Pas d'équivalence avec l'éditeur JSON Shopify ; composants rendus selon l'adaptateur existant |
| Navigation, panier, formulaire | Comportements d'aperçu vérifiés ; boutique réelle, paiement et envoi non vérifiés | Dépend des blocs / routes / extensions de la plateforme ; non vérifié en installation | Dépend de Classic et du module ; non vérifié en installation |
| Installation réelle | **Non vérifiée** | **Non vérifiée** ; aucun interpréteur PHP disponible dans ce harnais | **Non vérifiée** |

Les services ne reçoivent pas de catalogue de produits. Les autres exports existants (Wix / Squarespace) ne sont pas revus dans ce lot. Aucune équivalence générale entre CMS n'est annoncée.

## Restitution visuelle et limites

L'[index des preuves](../../reports/lot2a/README.md) distingue chaque thème, page et largeur. Les **20 PNG originaux** comprennent les huit vues intégrales demandées et douze vues d'en-tête, section et pied de page. Les deux MP4 sont des enregistrements du navigateur réel : défilement, animations et interactions. Les aperçus compressés restent séparés ; les originaux ne sont pas remplacés par des JPEG.

**Blocage de pièces jointes locales constaté :** le dossier prévu par l'hôte `/codex/browser/projectless/0001-titre-de-cette-discussion-e-com-studio-ia-00-aud/output` n'existe pas sur la machine d'exécution. Sa création échoue (`Permission denied` sur `/codex`, puis absence de `sudo`) ; l'outil d'édition ne peut pas davantage créer les parents. Aucune restriction n'a été contournée. Les fichiers originaux sont donc remis par les **liens directs publics GitHub**, avec aperçus Markdown dans la conversation et index au commit de preuves. Le groupe « images vues » ne constitue pas cette remise. Aucun chemin local inexistant n'est présenté comme une pièce jointe et aucune réparation du lecteur de la conversation n'est revendiquée.

Limites maintenues :

- Acceptation visuelle et commerciale par Thomas **en attente**. Aucun score artificiel de qualité ni de performance de production.
- Parcours des routes d'édition et du worker réellement testé ; **pas une session navigateur intégrale de tous les panneaux React du studio**.
- Pas d'appel IA, pas de nouveau test de conformité créative d'un fournisseur réel ; les corrections du lot 1 sont conservées et testées dans leur périmètre.
- Contrôles clavier/focus, libellés et mouvement réduit ciblés ; pas d'audit WCAG exhaustif ni de lecteur d'écran réel.
- Mesures de performance locales sous charge de tests ; pas un score Lighthouse de production, ni une mesure réseau mobile réelle.
- Aucun CMS installé, aucun paiement, email commercial, réservation externe ou synchronisation Google exécuté.
- Les variantes du composant d'achat existant ne sont pas démontrées avec une montre sans variantes.
- Le script standard du dépôt utilise des fichiers de photos vides : ses captures servent à vérifier les débordements, **pas à prouver le rendu visuel**.

Aucune fusion, aucun déploiement, aucune publication client, aucune dépense IA. Première suite recommandée : examiner ces deux propositions avec les PNG/vidéos, puis décider de les conserver, retoucher ou remplacer avant toute déclinaison des 28 autres.

## Consolidation finale

**Commit du code testé et rendu : `4097eec6ae5a6d6361093219e11afc2fc0abdb0a`.** Le relevé de captures indique `sourceDirty: false`. Le commit de preuves est **`993ad5bad6847675eee687b4a710b878157b3e05`** : aucune modification de `src/`, `theme-base/`, `tests/` ou `scripts/` depuis le code testé ; seule la vignette interne Jardin est resynchronisée avec son rendu, en plus des preuves. Le présent rapport et les décisions de mission forment un commit documentaire ultérieur.

### Commandes et résultats réellement obtenus

Environnement : Node 24.19.0, Vitest 5.0.3, Chromium installé sous `/usr/bin/chromium`, ffmpeg/ffprobe locaux. Vitest utilise une base temporaire ; les nouveaux tests d'édition ont en plus un espace SQLite propre, vérifié par `PRAGMA database_list`. Aucun test ne s'exécute sur une base client.

| Commande | Résultat et preuve |
|---|---|
| `npx tsc --noEmit` | **Réussi**, code 0 ; [relevé](../../reports/lot2a/verifications/types.txt) |
| `npx vitest run` sur le code figé | **261 fichiers réussis, 1 953 tests réussis, 3 ignorés, aucun échec**, 647,60 s ; [sortie](../../reports/lot2a/verifications/tests-complets.txt) |
| `npx vitest run tests/themes-catalogue.test.ts tests/disposition-entete-pied.test.ts tests/reservation-activite.test.ts tests/services-theme.test.ts tests/lot2a-reference.test.ts` | **5 fichiers, 97 tests réussis** après les corrections ; [sortie](../../reports/lot2a/verifications/regressions-ciblees.txt) |
| `DATA_DIR=<dossier isolé> STOCK_OFFLINE=1 JOBS=2 scripts/verify-theme.sh` | **137 cas réussis**, aucune erreur ; passage complet de consolidation, [sortie](../../reports/lot2a/verifications/theme-check-complet.txt). Les ZIP définitifs sont revérifiés séparément ci-dessous |
| `CHROMIUM=/usr/bin/chromium npx tsx scripts/theme-screens.ts <sortie temporaire> vitrine mono fr` et équivalent `jardin services fr` | **Réussis**, zéro débordement ; [Vitrine](../../reports/lot2a/verifications/captures-standard-vitrine.txt), [Jardin](../../reports/lot2a/verifications/captures-standard-jardin.txt). Photos génériques vides, pas les preuves de qualité visuelle |
| `CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=<cache local> npx tsx scripts/lot2a-proof.ts reports/lot2a` | **Réussi** : 16 vues contrôlées, 20 PNG, 2 MP4 et leurs 2 WebM natifs, 6 ZIP ; aucun média absent, aucune erreur JavaScript ; [exécution](../../reports/lot2a/verifications/preuves-execution.txt), [mesures](../../reports/lot2a/preuves.json) |
| `node reports/lot2a/verifier-zip.mjs` | **Réussi**, contrôle officiel des ZIP finaux : 176 fichiers produit / 180 services, **0 erreur / 0 avertissement Theme Check** ; [empreintes et résultat](../../reports/lot2a/export-check.json). L'avertissement fonctionnel d'affectation manuelle des produits est maintenu |
| `DATA_DIR=<dossier isolé> STOCK_OFFLINE=1 NEXT_TELEMETRY_DISABLED=1 npm run build` | **Réussi**, code 0 ; [relevé](../../reports/lot2a/verifications/build.txt) |
| `git diff --check` | **Réussi** avant la publication |

Le cache Playwright local utilise le ffmpeg déjà installé, sans téléchargement de fournisseur. Pour reproduire ailleurs, disposer de Chromium et du binaire vidéo Playwright, ou configurer ce cache avec le ffmpeg système. Le script refuse explicitement un `DATA_DIR` ou `DATABASE_FILE` déjà configuré ; il crée et détruit son propre espace temporaire.

### Échecs conservés, pas transformés en validations

Le [relevé des échecs intermédiaires](../../reports/lot2a/verifications/echecs-intermediaires.txt) distingue les lancements abandonnés et la suite de consolidation complète : celle-ci avait **6 échecs, 1 947 réussites et 3 tests ignorés**. Les six échecs ont été traités :

1. Deux assertions anciennes ne reconnaissaient pas le nouveau bloc d'offres ou les deux nouveaux styles de pied de page : listes attendues étendues, autres vérifications conservées.
2. Le changement de composition avait perdu le calendrier masqué et la demande avec date quand les horaires manquaient : blocs fonctionnels conservés, test existant des 30 thèmes inchangé.
3. Le bloc de réassurance existant était retiré : il reste présent avec son état masqué tant que ses informations ne sont pas renseignées.
4. Des étapes de méthode non renseignées pouvaient devenir visibles : elles sont filtrées et le bloc reste masqué s'il manque une méthode suffisamment renseignée. Le test du catalogue n'a pas été assoupli.
5. Le nouveau test de chat pouvait prendre une autre tâche de la file globale de tests : espace SQLite désormais propre à ce fichier, avec vrai stockage et vraie prise de tâche. Ce correctif concerne le harnais, pas une défaillance d'accès client démontrée en production.

Le contrôle numérique a aussi relevé deux valeurs non alignées sur les pas du schéma Shopify ; largeur de page et rayon de bouton ont été corrigés, puis tous les réglages numériques des deux références vérifiés. Les premiers problèmes de traduction et de collection native ont été corrigés avant consolidation. Les dépassements de délai sous charge observés dans un premier lancement ne sont pas présentés comme des pannes d'un fournisseur IA.

### Mesures locales et accès aux preuves

Sur les 8 vues de chaque thème, pendant l'exécution sous charge de tests :

| Mesure | Produit | Services |
|---|---|---|
| LCP observé | 492 à 2 188 ms | 496 à 2 552 ms |
| CLS observé | 0 à 0,016169 | 0,000015 à 0,000557 |
| Durée de navigation locale | 563 à 2 328 ms | 470 à 2 503 ms |

Le volume transféré fourni par Resource Timing est indisponible dans l'origine opaque de l'aperçu (`null`), **pas égal à zéro**. Les [rapports de contraste](../../reports/lot2a/contrastes.json) concernent les couleurs sérialisées, sans certification de tous les états du site. Les vidéos durent environ 16 et 17 secondes ; images et métadonnées des fichiers ont été inspectées.

Liens durables au commit de preuves :

- [Index des vingt PNG et des vidéos](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/993ad5bad6847675eee687b4a710b878157b3e05/reports/lot2a/README.md).
- [Preuves structurées et largeurs contrôlées](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/993ad5bad6847675eee687b4a710b878157b3e05/reports/lot2a/preuves.json).
- [Dossier produit](https://github.com/spacedevelopment01-max/Ecom-studio-ia/tree/993ad5bad6847675eee687b4a710b878157b3e05/reports/lot2a/products) et [dossier services](https://github.com/spacedevelopment01-max/Ecom-studio-ia/tree/993ad5bad6847675eee687b4a710b878157b3e05/reports/lot2a/services).
- [Empreintes des fichiers publiés](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/993ad5bad6847675eee687b4a710b878157b3e05/reports/lot2a/SHA256SUMS).

La PR de suite, son dernier commit distant et le résultat des contrôles GitHub sont indiqués dans la restitution et liés depuis #133. Aucun résultat CI futur n'est anticipé dans les résultats locaux ci-dessus. Les 3 tests ignorés ne sont pas comptés comme réussis : absence de PHP pour la parité des sections (`cms-v2.test.ts`), la parité du calendrier et la conservation des données de réservation dans le message/e-mail (`calendrier-reservation.test.ts`). L'acceptation visuelle et les installations CMS restent à effectuer.
