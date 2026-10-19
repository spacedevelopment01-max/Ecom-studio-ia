# Lot 2B — ORBE et Atelier Rive

**État : développement fonctionnel livré pour revue ; rendu photographique incomplet, non soumis comme validation esthétique finale.** Le pack `ORBE_Atelier_Rive_Dossier_Codex.zip` et ses 24 photographies ne sont accessibles ni dans le dépôt ni dans les fichiers de la session. Les cadres « Visuel à importer » montrent cette dépendance. Aucun visuel d’une autre lampe, d’une autre activité ou des références ne les remplace. Les 28 autres thèmes restent suspendus à la validation visuelle de Thomas.

## Version, consignes et périmètre

- Dépôt `spacedevelopment01-max/Ecom-studio-ia`, branche `codex/lot-2a-themes-reference`, PR #134, base de PR #133 conservée ; aucune fusion.
- Base distante récupérée : `1968c7b42113d81555931205a1d9dd4296daa31f`, état local propre avant cette passe.
- Mission principale [6247457951](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6247457951), version du 18 octobre 2026, 08:28:10 UTC, lue intégralement ; [copie versionnée](LOT_2B_ORBE_RIVE_MISSION.md). Commentaires récents #133/#134 relus, sans nouvelle consigne contradictoire accessible. Réception signalée dans [6247689397](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6247689397).
- `CLAUDE.md`, mission lot 1 et audit antérieurs, guides locaux de design et de vérification de thème pris en compte. Les règles ORBE/Rive de Thomas priment sur les anciennes restrictions concernant les seules anciennes démonstrations.
- Application corrigée : `7caef5bffc1b34b49c7d7472e472e795e811d533`. Outils de contrôle reproductibles : `d95d9f64fa663971846af19298b5a18c7dd197c0` ; ce descendant ne change pas l’application. Couverture du catalogue étendue aux deux compositions réelles dans `112ebd1`. Le champ `testedCommit` de [preuves.json](../../reports/lot2b/preuves.json) identifie la version réellement capturée.
- Aucun changement de page publique du studio, aucun compte/CMS connecté, déploiement, appel IA payant ni données clients utilisées. Toutes les créations, mutations et soumissions de test utilisent des bases temporaires supprimées par les harnais. Les ZIP sont des fichiers de travail, pas des sites publiés.

## Ce qui a changé et preuves

### Deux compositions et quatre pages du vrai moteur

**CONFIRMÉ DANS LE CODE et REPRODUIT** — [tests/lot2b-fixtures.ts](../../tests/lot2b-fixtures.ts) construit les projets isolés avec `composeShop`, puis leurs `ThemeSpec` enregistrés par `saveThemeVersion`. Les pages sont servies par les vraies routes `/preview/[id]/v/[vid]/...`, interprétées par LiquidJS à partir des fichiers compilés. Ce ne sont pas quatre maquettes HTML indépendantes.

ORBE : Cormorant / DM Sans embarquées, ivoire / encre / argile, ouverture typographique dans la scène, phrase et repères, diptyque dîner/lecture, portrait sombre, finitions interactives, duo, achat partagé, accessoires distincts, FAQ et conclusion. Accueil de dix sections et fiche produit développée ; galerie à gauche, achat à droite sur ordinateur ; titre puis galerie puis achat sur mobile. Les liens d’usage portent une sélection de média, sans inventer son existence.

Atelier Rive : Archivo / Work Sans embarquées, papier / vert / sauge, titre avant paysage, introduction décalée, index d’intentions asymétrique, matières, prestations à chapitres accessibles, reportage, méthode en quatre étapes, étude fictive en deux vues, FAQ et contact. Accueil de dix sections et prestation développée, plus pages accompagnements, autres prestations, inspirations et contact. Aucun prix de prestation, délai, adresse, qualification, avis ou réalisation client inventé.

**Limite :** le schéma des médias et leur affectation sont définis, mais zéro photo des projets est chargée. L’identité de forme de la lampe, les vrais cadrages, les couleurs photographiées, les détails et le zoom ORBE ne peuvent donc pas être validés. Les structures ont été relues dans le navigateur et dans les huit captures ; cela ne prouve pas un rendu professionnel final avec les photos.

### Composants réutilisables, galerie et édition

**CONFIRMÉ DANS LE CODE et REPRODUIT** — sept sections génériques, sans condition sur un nom de démo :

- `ed-opening` : titre dans une scène ou titre avant paysage, niveau H1/H2 et point de cadrage.
- `ed-statement` : phrase, texte et repères, photographie marginale facultative.
- `ed-diptych` : diptyque ou index d’inspirations, ratios et liens par bloc.
- `ed-scene` : portrait, panorama ou conclusion illustrée.
- `ed-finishes` : scène de finitions et vue de la variante sélectionnée.
- `ed-study` : deux vues légendées ; comparateur seulement si l’éditeur confirme l’alignement. La démonstration ne présume pas cet alignement.
- `ed-contact` : nom, e-mail, pièce et message, avec reçu de test dans les démonstrations explicitement activées.

Fichiers : [sections Liquid](../../theme-base/sections), [editorial.css](../../theme-base/assets/editorial.css), [editorial.js](../../theme-base/assets/editorial.js), [section-library.ts](../../src/lib/theme/section-library.ts), [section-copy-editorial.ts](../../src/lib/theme/section-copy-editorial.ts), `section-defaults.ts`, `compile.ts`, `render.ts`, traductions FR/EN et réglage `editorial_profile` optionnel. Les composants sont disponibles dans la galerie et leurs schémas dans l’éditeur. Les textes et médias ajoutés sont limités au contexte ciblé ; un rôle de visuel explicite ne reçoit pas arbitrairement une autre photo.

Les régressions exécutent les routes manuelles et conversationnelles réelles, le worker local, le rechargement et la restauration. Texte, média, CTA, couleur, police, ordre et animation sont contrôlés ; un média d’un autre projet est refusé. La session Next est simulée dans Vitest, et la configuration IA forcée à indisponible ; aucune réponse d’un fournisseur n’est simulée comme création réussie. La conversation vérifiée est une retouche locale bornée de titre. La compréhension de demandes créatives complexes par un fournisseur reste non vérifiée.

### Achat cohérent et source commerciale commune

**CONFIRMÉ DANS LE CODE et REPRODUIT** — `purchase-offers.ts`, `purchase-offers.liquid`, `purchase-offers.js`, `main-product.liquid` :

| Quantité | Total fictif | Économie face aux unités séparées | Pochette |
|---|---:|---:|---|
| 1 | 79,00 € | 0 € | non |
| 2 | 142,20 € | 15,80 € | non |
| 3 | 201,45 € | 35,55 € | une si stock |
| 4 | 252,80 € | 63,20 € | une si stock |

Dune, Argile et Charbon valent toutes 79 € dans ces données synthétiques. Les finitions sont choisies par article du lot ; seul le lot sélectionné expose ses contrôles. « Notre sélection » désigne le duo, sans prétendre qu’il est le plus vendu. Le prix est relu et calculé au serveur, pas accepté depuis le navigateur. Les identités produit/SKU, protections de stock et de recalcul existantes sont conservées.

Le nouvel attribut générique `purchase_source` permet à l’accueil de lire les mêmes blocs que la fiche. Une modification du bloc de référence est reprise à la compilation et au rendu de l’accueil. Une source absente est fermée ; des règles commerciales concurrentes restent refusées. L’édition des offres se fait sur leur source indiquée dans le réglage, pas sur une seconde copie indépendante. À l’export, il s’agit d’un instantané ; une synchronisation entre deux pages modifiées ensuite dans un éditeur CMS n’est pas certifiée.

Correction commune : un cadeau disponible peut avoir un stock connu sans prix de vente renseigné. Son prix commercial n’est plus une condition d’éligibilité au cadeau ; un article acheté dont le prix est inconnu reste refusé. Aucun prix de pochette ni inclusion automatique du coffret n’est inventé.

Les contrôles reproduisent quatre totaux, choix mixtes, ajout serveur, passage trio → duo, retrait du cadeau et suppression du lot. Le stock cadeau à zéro est testé au serveur et dans Chromium. La barre d’achat native héritée est supprimée quand les offres avancées sont actives : l’inspection avait montré qu’elle recouvrait le bloc et affichait un prix unitaire incohérent. Aucun achat immédiat ou paiement réel n’est présenté comme disponible dans l’aperçu.

### Contact de test réellement enregistré

**CONFIRMÉ DANS LE CODE et REPRODUIT** — [preview-contact.ts](../../src/lib/theme/preview-contact.ts), route d’aperçu et `preview-tools.ts` : `meta.demo.isDemo=true`, provenance et `contactTest=true` sont obligatoires. Le mode de contact de test ne s’active pas sur les projets ordinaires. L’accès signé/session existant reste requis.

Une demande valide écrit un reçu local sous `DATA_DIR/preview-contact-tests`, avant de confirmer « Demande de test enregistrée. Aucun e-mail envoyé. » Validation des champs, taille maximale, idempotence, limite de cinquante demandes et verrou d’écriture empêchent les doublons ou écrasements concurrents. Le stockage de test est distinct des fiches clients. Les contrôles couvrent erreur, mode désactivé, conflit et limite ; le navigateur soumet réellement le formulaire et constate l’écriture. Aucun e-mail ni réservation externe ne part. Aucun contact propriétaire du projet n’est prérempli comme donnée d’un visiteur.

### Mouvement et affichage

**CONFIRMÉ DANS LE CODE et REPRODUIT partiellement** — entrées de titres bornées, apparition unique des chapitres et diptyques, transition de finition et d’offre ; aucune capture du défilement ni carrousel d’achat automatique. Réglage sans animation et `prefers-reduced-motion` conservés ; les nouvelles animations sont annulées si la préférence change. CTA disponibles immédiatement. Le contrôle Chromium en mouvement réduit constate zéro animation active ; menu mobile, Échap et retour du focus sont exercés.

Les mouvements de véritables photographies et la pertinence de leurs points de cadrage restent non vérifiés faute de pack. Les vidéos montrent les mouvements et interactions effectivement présents, avec les cadres diagnostics.

## Références : accès réel, pas une banque d’images

**OBSERVÉ À LA CONSULTATION WEB** — HTML exploitable pour Concept, Shrine, Motion, MERSI (accueil et process), Khufu’s, Caeli et Luminaire Authentik ; fiche officielle Broadcast accessible, démo interactive non obtenue. Les URL exactes Impact, Be Yours, Impulse, Stiletto, Focal et Prestige n’ont pas été accessibles à l’outil web. Les quatorze URL et leur rôle restent dans la mission versionnée.

Étudiés dans les documents accessibles : développement après le premier écran, hiérarchie des options, accessoires et FAQ de Concept ; offres et conditions de palier de Shrine ; chapitres immersifs et prise de contact de Khufu’s ; index d’architecture et processus de MERSI ; explication progressive de Caeli ; ambiances et finitions de Luminaire Authentik. Aucune animation ni proportion exacte n’est prétendue mesurée depuis du HTML. Les timings et dimensions de cette passe viennent du brief explicite. Aucun média, marque, avis ou promesse commerciale de ces sites n’est repris.

## Vérifications réellement exécutées

Les journaux conservés dans [reports/lot2b/verification](../../reports/lot2b/verification) ne contiennent ni clé ni données clients. Les tests généraux utilisent leurs fournisseurs simulés habituels ; les contrôles spécifiques de cette passe interdisent les requêtes externes. Aucun appel IA réel/payant.

| Commande | Résultat |
|---|---|
| `npx tsc --noEmit` | réussi, sortie 0 ; contrôle final incluant les scripts de preuve |
| `npx vitest run tests/lot2b-editorial.test.ts tests/lot2a-purchase.test.ts` | 26 tests réussis, 2 fichiers |
| `PATH=/workspace/work/lot2a/php-native/bin:$PATH npx vitest run` | sortie 1 : 1 987 tests réussis, 4 échecs sur 1 991 / 264 fichiers ; un contrôle de couverture corrigé depuis, deux workflows réussis en reprise isolée, un dépassement de délai de calendrier reproduit sur la base distante |
| `scripts/verify-theme.sh` | 137 cas réussis, zéro erreur Theme Check ; ZIP client contrôlé |
| `DATA_DIR=/workspace/work/lot2b/build-data STOCK_OFFLINE=1 npm run build` | réussi, sortie 0, 49 pages statiques ; aucun déploiement |
| `PLAYWRIGHT_BROWSERS_PATH=/workspace/work/lot2a/browsers npx tsx scripts/lot2b-proof.ts reports/lot2b` | 16 visites des quatre pages à 390/768/1024/1440 px, captures et vidéos réelles ; détail dans `preuves.json` |
| `npx tsx scripts/lot2b-widget-proof.ts reports/lot2b` | réussi : finition Charbon → premier article → fiche, offres au clavier et navigation Rive ; [preuve ciblée](../../reports/lot2b/widget-checks.json) |
| `PATH=/workspace/work/lot2a/php-native/bin:$PATH npx tsx scripts/lot2b-php-proof.ts reports/lot2b` | 17 sections exécutées avec le PHP et les Liquid extraits des vrais ZIP WordPress ; titres conservés, aucune erreur d’exécution ; catalogue Woo natif absent du harnais |

Les premiers essais sans permission d’exécution locale ont échoué sur les sockets `tsx`/processus multimédia ; ils ne sont pas comptés comme contrôles réussis. Ils ont été rejoués avec les processus locaux autorisés. Le premier enregistrement vidéo cherchait le FFmpeg du cache Playwright : le binaire système déjà disponible a ensuite été utilisé via le chemin de navigateur de la session, sans installation payante. Un contrôle Theme Check intermédiaire a détecté une clé de traduction absente ; celle-ci a été remplacée par la clé bilingue existante avant le contrôle complet réussi.

La compilation initialement lancée sans `DATA_DIR` explicite a été arrêtée durant la compilation, avant la collecte des pages, puis relancée avec le dossier temporaire ci-dessus. Aucune mutation de projet client n’a été exécutée.

### Échecs de la suite complète et reprises

La suite complète a été exécutée jusqu’au bout : **261 fichiers réussis, 3 en échec ; 1 987 tests réussis, 4 en échec**. Ne pas lire les contrôles ciblés ou Theme Check comme une suite générale verte.

- `tests/themes-catalogue.test.ts` exigeait que tout composant de la bibliothèque soit utilisé dans les trente anciens thèmes. Les sept nouveaux composants sont utilisés dans les deux compositions de référence que Thomas demande de valider avant toute déclinaison. Le contrôle couvre désormais ces deux compositions réellement construites, en plus des cas existants, sans liste d’exemption de composants. Reprise : **37 tests réussis** dans catalogue + lot 2B + achat lot 2A.
- Deux tests `workflow-v2.test.ts` (campagne/calendrier/export et site de plâtrier-peintre) ont dépassé 240 s pendant la suite générale. Reprise isolée sur le code actuel : **les deux réussissent**, 138,55 s pour le fichier filtré. Le cas services réussit aussi sur la base `1968c7b`, 104,61 s. Une contention pendant les vérifications simultanées reste une **HYPOTHÈSE**, pas une cause démontrée.
- `migration-v2.test.ts`, « calendrier de la création », dépasse 120 s en reprise isolée sur **le code actuel et sur la base distante `1968c7b`**, dans deux bases temporaires distinctes. **REPRODUIT avant et après cette passe.** La cause précise n’est pas établie ; aucun correctif du moteur social/calendrier hors lot n’a été appliqué. Les journaux des deux versions sont fournis. Ce point empêche de déclarer toute la suite verte dans cet environnement.

Commandes de reprise réellement exécutées :

```bash
npx vitest run tests/themes-catalogue.test.ts tests/lot2b-editorial.test.ts tests/lot2a-purchase.test.ts
npx vitest run tests/migration-v2.test.ts -t "calendrier de la création" --maxWorkers=1
npx vitest run tests/workflow-v2.test.ts -t "parcours complet sur un projet existant|site de plâtrier-peintre" --maxWorkers=1
```

La comparaison de base utilise un worktree détaché de `1968c7b` sous `work/lot2b/baseline`, le même runtime et ses propres données Vitest. La suite générale n’a pas été relancée intégralement après l’adaptation de ce test de couverture ; les reprises ci-dessus sont distinguées du résultat général original.

### Généralisation et conservation

**REPRODUIT** — les nouveaux composants et opérations ont été exercés avec un kit de gravure sur bois et une prestation de diagnostic acoustique, données distinctes des deux démonstrations. Les régressions lot 2A couvrent aussi instruments à vent, patrons de reliure, gourde et catalogue multi-produit. Pour les nouveaux cas, le contrôle porte sur association de contexte, conservation des blocs et des médias ciblés, insertion et édition ; il ne constitue pas une validation esthétique de sites complets pour ces métiers.

Aucun nom ORBE/Rive ne sert de condition dans le moteur de production : les marques, textes, prix et rôles de fichiers sont des données de démonstration. Les versions, verrouillages, forfaits, autorisations, budgets et protections commerciales existants ne sont pas contournés. Les anciennes démonstrations, rapports et corrections de parité PHP sont conservés.

## Exports : limites séparées par plateforme

Les dix ZIP sont dans [l’index des preuves](../../reports/lot2b/README.md). `cmsExport` signale désormais chaque rôle d’image requis absent comme `editorial_media_missing`, gravité bloquante. Le fichier peut être produit pour travail sans être déclaré prêt à publier. Les composants et leur CSS/JS sont transmis ; les scripts WordPress et PrestaShop incluent `editorial.js`.

| Plateforme | Composition et modèle de page | Médias | Animation |
|---|---|---|---|
| Shopify | testé par simulation locale du vrai thème OS 2.0 et Theme Check ; aucune installation CMS vérifiée | à configurer : pack absent, import et associations des médias/variantes à vérifier sur boutique | testé par simulation dans Chromium avec les mêmes fichiers ; non vérifié sur boutique |
| WooCommerce | rendu PHP réel des sections éditoriales testé ; fiche produit native Woo et gabarit partagé, composition ORBE complète non reprise automatiquement | à configurer ; le contexte catalogue Liquid du sélecteur de finitions n’est pas un adaptateur Woo | fichiers transmis ; non vérifié dans WordPress installé |
| PrestaShop | HTML/Smarty et module compagnon produits ; fiche, panier et paiement natifs ; gabarit produit éditorial intégral non certifié | à configurer : import, identités de déclinaison et routes natives ; pack absent | fichiers transmis ; non vérifié sur PrestaShop installé |
| Wix | non pris en charge comme thème importable : kit de reprise, composition à reconstruire | à configurer après réception du pack | à configurer dans Wix |
| Squarespace | non pris en charge comme thème importable : kit de reprise, composition à reconstruire | à configurer après réception du pack | à configurer dans Squarespace |

| Plateforme | Variantes | Panier | Remise de lot | Cadeau | Paiement |
|---|---|---|---|---|---|
| Aperçu studio | vérifié réellement, choix par article et total serveur | vérifié réellement, trio → duo → suppression | vérifié réellement avec données fictives | vérifié réellement, seuil, retrait et stock nul | non pris en charge : aucun paiement réel |
| Shopify | à configurer/importer et vérifier dans la boutique ; sélection locale testée | non vérifié dans CMS | non pris en charge par cette livraison sans adaptateur serveur vérifié | même limite ; avantages désactivés à l’export | non vérifié |
| WooCommerce | à configurer dans le catalogue natif ; sélecteur Liquid non certifié | non vérifié dans CMS, parcours natif | non pris en charge par cette livraison | non pris en charge par cette livraison | non vérifié |
| PrestaShop | à configurer dans le catalogue natif | non vérifié dans CMS, parcours natif | non pris en charge par cette livraison | non pris en charge par cette livraison | non vérifié |
| Wix / Squarespace | à configurer nativement | à configurer nativement | à configurer nativement | à configurer nativement | non vérifié |

`guardPurchaseExport` continue de désactiver les avantages qui demandent un serveur commercial. `es-purchase-offers.json`/`offres-a-configurer.json` conservent leurs conditions ; ces fichiers ne créent pas de remise ou de cadeau dans un checkout. Aucun connecteur ni compte supplémentaire ouvert pour contourner ces limites. Le formulaire de test du studio n’est pas une preuve de traitement du formulaire dans les CMS ; leurs destinations, protections et réception restent à configurer et tester sur une installation autorisée.

## Accès aux captures et vidéos

[Ouvrir l’index avec aperçus, huit PNG individuels, gros plans, MP4/WebM et ZIP](../../reports/lot2b/README.md). Les PNG sont les captures natives du navigateur ; les aperçus WebP servent uniquement à consulter les grandes pages. Les vidéos ne sont pas des diaporamas. Les quatre MP4 H.264 ont été décodés intégralement avec FFmpeg, ouverts et lus dans Chromium, puis inspectés à 15 %, 50 % et 90 % ; [mesures de lecture](../../reports/lot2b/video-checks.json). Les durées réelles sont de 20,8 à 24,12 s. Les passages de défilement sont rapides : les PNG intégraux servent à lire les contenus. Aucune URL locale ou signature d’accès au studio n’est publiée comme lien de consultation.

Le dossier de pièces jointes propre à cette conversation n’est pas inscriptible dans l’environnement de la session. Les mêmes images sont donc affichées par liens GitHub directs dans la conversation et les PNG originaux sont téléchargeables individuellement ; ce repli est annoncé, sans prétendre avoir joint des fichiers locaux non accessibles.

## Suite indispensable avant validation visuelle

1. Rendre le pack de 24 photographies accessible à la session ou au dépôt. Le harnais accepte en troisième argument le dossier extrait : les rôles sont importés seulement dans les nouveaux projets de test et l’ambiguïté de nom ou une image illisible est refusée.
2. Inspecter chaque photographie : forme entière d’ORBE, finitions, coffret/pochette distincts, ambiances et intentions Rive. Les extensions et dimensions seules ne prouvent pas leur conformité.
3. Rejouer les quatre pages et ajuster les points de cadrage depuis les composants ; vérifier galerie, zoom et chaque finition avec leurs vrais médias, puis les entrées d’images, contrastes et cadrages à toutes les largeurs. Refaire les huit captures et vidéos, sans modifier une donnée client.
4. Soumettre ces rendus photographiques à Thomas. Aucun accord esthétique n’est déduit des tests, de la compilation ou de cette livraison partielle ; ne pas démarrer les 28 thèmes avant son retour.
