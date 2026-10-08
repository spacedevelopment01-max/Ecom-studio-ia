# PHASE 11A — CMS INTEGRATION ENGINE V2 — RAPPORT

Branche `claude/ecom-studio-ia-platform-8cwl79`. Phase **non fusionnée** (en attente de la validation du
propriétaire). Aucun appel d'IA payant, aucun envoi vers une vraie boutique, aucune commande réelle : **0 €**.
Ce rapport n'est pas une validation de production. La phase 11B reste nécessaire pour les installations réelles.

Légende des niveaux de preuve (provenance) : **statique** (fichiers), **test automatisé**, **navigateur local**,
**installation locale** (WordPress / PrestaShop exécutés en Docker sur la machine de travail), **plateforme
réelle**, **humain**. Aucune mesure de 11A n'a le niveau « plateforme réelle » ni « humain ».

## GIT STATE

- Base : `main` après la fusion de 10A (PR #62), synchronisée sur la branche de travail (commit `59fcaa6`).
- Commits de la phase : `fb1d445` (moteur, adaptateurs, registre, Quality Gate), `39bdcf1` (banc d'installation,
  écran d'export, corrections trouvées à l'installation), puis le commit final de ce rapport.
- Aucun force-push, aucune réécriture d'historique.

## PHASE 10A MERGE

10A validée techniquement par le propriétaire, sous réserve d'une CI entièrement verte : CI verte, PR #62 fusionnée
(squash `8f60da1`), branche resynchronisée, registre mis à jour (`59fcaa6`).

## EXISTING CMS AUDIT

Audit des exports existants avant 11A (code de `src/lib/theme/platforms.ts` à `59fcaa6`, plus installation réelle
locale de l'export 10A) :

| Plateforme | Avant 11A | Défaut constaté |
|---|---|---|
| Shopify | thème OS 2.0 complet, Theme Check 0 erreur | jamais installé sur une vraie boutique |
| WooCommerce | thème de blocs reconstruit avec les blocs génériques de WordPress (`fromV2` : les sections V2 ramenées à des équivalents simples) | **mise en page V2 perdue** : arche du héros, compositions, en-tête et pied de page du studio absents ; nom « ES test », menus par défaut de WordPress — capture : `reports/screenshots/cms-v2-audit/woocommerce-export-10A-installe.jpg` |
| PrestaShop | thème enfant de Classic avec sections converties en gabarits simples | même perte de mise en page ; jamais installé |
| Wix / Squarespace | kits de reconstruction | corrects (présentés comme kits) |

Conclusion : seul Shopify reproduisait le design ; les deux autres exports livraient le contenu sans la mise en page.

## CMS ENGINE V2 ARCHITECTURE

`src/lib/cms-v2/` — un seul chemin, aucun générateur artistique par plateforme :

PROJECT BRAIN → THEME ENGINE V2 (ThemeSpec) → couche design commune (`design.ts`, extraite du VRAI rendu du studio) →
pages et sections → médias (refusés exclus, `checks.ts`) → registre des capacités (`capabilities.ts`) → adaptation de
contenu par plateforme (`adapt.ts`) → adaptateur (`adapters/shopify|wordpress|prestashop.ts`, kits) → contrôles
(`checks.ts`) → Quality Gate (`quality.ts`) → export versionné (`export.ts`, route `/theme/export`).

Choix justifiés :
- **Source unique Liquid.** Les gabarits `theme-base/sections/*.liquid` sont rendus par Shopify, par LiquidJS (aperçu
  du studio) et, dans WordPress, par un moteur Liquid PHP livré dans le thème (`assets/cms/php/`, bibliothèque
  liquid/liquid 1.4.45 sous licence MIT + filtres et balises du studio). Résultat : le HTML des sections installées
  est **identique** à celui de l'aperçu (parité contrôlée par `scripts/lib/cms-parity.ts`, adaptations documentées :
  action des formulaires, icônes de paiement).
- **WordPress : thème de blocs**, chaque section = un bloc dynamique `es/section` dont la barre latérale est générée à
  partir du schéma de la section (`es-editor.js`, sans compilation). WooCommerce natif (fiche, boutique, panier,
  commande) **seulement pour une boutique** (`inc/es-woo.php`) ; un site de services ne contient aucune trace de
  WooCommerce.
- **PrestaShop 8.1 : thème enfant de Classic** + module compagnon `esstudio` (installé avec le thème) : sections
  pré-rendues par le studio et converties en Smarty (`toSmarty` : accolades protégées, compteur du panier et adresses
  dynamiques), routes `/pages/…`, `/policies/…`, `/products/…`, formulaires, sections propres à la fiche produit.
- Wix / Squarespace : kits, jamais présentés comme thèmes.

## CAPABILITY REGISTRY

`src/lib/cms-v2/capabilities.ts` : 13 capacités par plateforme (génération, export natif, installation, édition
native, connexion API, envoi direct, produits, panier, commande, SEO, animations, formulaires, multilingue), statut
SUPPORTED / PARTIAL / EXPORT / KIT / UNVERIFIED / UNSUPPORTED et **niveau de preuve réellement atteint**. Affiché
dans l'écran d'export (« Ce que permet l'export … »), testé (`tests/cms-v2.test.ts` : jamais « plateforme réelle »,
« non vérifié » jamais au niveau installation, Shopify installation = UNVERIFIED, kits non installables).
Mis à jour à la fin de 11A avec les résultats du banc (WooCommerce et PrestaShop : installation, panier, formulaires
au niveau « installation locale » ; PrestaShop : édition native PARTIAL).

## SHOPIFY

| | État |
|---|---|
| Développé | thème OS 2.0 complet (inchangé sur le fond depuis 10A), point d'entrée V2, contrôles, verdict |
| Testé statiquement | Theme Check (outil officiel) : **0 erreur, 0 avertissement** sur les 5 projets ; `scripts/verify-theme.sh` : 11 directions FR/EN, multi-produit, niche, services FR/EN, ZIP client — tout valide |
| Rendu local | **B** = fichiers du ZIP rendus par le moteur d'aperçu : identiques à A (écart de pixels 0,000 sur les pages comparées, sections 100 %) |
| Installé localement | impossible (Shopify n'est pas installable hors de Shopify) |
| Testé réellement | **NON** — aucune boutique Shopify accessible |
| Reste à vérifier (11B) | installation sur une boutique de développement, éditeur de thème réel, panier et paiement réels, SEO des fiches (métachamps) |

Verdict : **PROVISIONAL** sur les 5 projets (périmètre : validation statique). Message affiché : « Votre thème
Shopify est généré et a passé les vérifications disponibles (validation statique). Son installation sur une boutique
réelle reste à vérifier. »

Défaut corrigé pendant 11A : dans l'application compilée (`next build`), Theme Check plantait (« configs/
recommended.yml introuvable ») — l'export Shopify aurait renvoyé une erreur en production. Corrigé dans
`next.config.ts` (paquets Theme Check non empaquetés) ; le contrôle ne compte plus jamais un Theme Check indisponible
comme réussi. Trouvé par le test navigateur de l'écran d'export.

## SHOPIFY EDITOR SUPPORT

Sections, blocs et réglages exposés par schémas contrôlés par Theme Check ; jamais ouverts dans l'éditeur de thème
réel de Shopify (11B).

## SHOPIFY E-COMMERCE FUNCTIONS

Données produits issues du studio uniquement (aucun prix ni stock inventé ; CSV d'import). Tiroir et page panier
testés dans l'aperçu local, qui IMITE le panier Shopify : statut PARTIAL. Paiement : géré par Shopify, jamais exécuté.

## WOOCOMMERCE

| | État |
|---|---|
| Développé | thème de blocs WordPress 6.5+, moteur Liquid PHP, bloc `es/section` éditable, menus, pages et politiques créées à l'activation (aucune page publiée écrasée), formulaires (Outils › Messages du site), intégration WooCommerce native, CSV produits |
| Testé statiquement | structure, JSON, `php -l` sur tous les fichiers PHP, secrets, contenu inventé, médias refusés, parité HTML (**30/30 sections identiques** sur les 5 projets) |
| Installé localement | **oui, 5/5** sur WordPress 6.6 + WooCommerce 9.3.3 (base remise à zéro à chaque projet) |
| Testé réellement (local) | pages, styles, liens, formulaire (message enregistré en base), panier et page de commande natifs (cosmétique), import du CSV livré par l'importateur de WooCommerce, **modification dans l'éditeur de site enregistrée puis visible sur le site** (5/5) |
| Reste à vérifier | hébergement réel, paiement réel, interface WordPress en français, extensions tierces |

## WOOCOMMERCE INSTALLATION

Parcours reproductible : `sh scripts/cms-v2/env.sh up` puis `DATA_DIR=… npx tsx scripts/cms-v2-bench.ts --platforms
woocommerce`. Étapes : base vide → installation de WordPress → WooCommerce activé (boutiques seulement ; pages
natives, euro, virement de test hors ligne) → thème téléversé et activé → CSV livré importé par l'importateur de
WooCommerce, photos ajoutées depuis `assets/es`, produits publiés (étapes du mode d'emploi) → tests.

Défauts trouvés par l'installation et corrigés (reprises ciblées, gratuites) :
1. **CSV non reconnu** : l'importateur lisait la 1re colonne « "Type" » avec ses guillemets (marqueur UTF-8 en
   tête) → déclinaisons importées comme produits séparés. Cause : en-tête entre guillemets. Fichier :
   `src/lib/theme/catalog-export.ts`. Résultat : produit variable + 2 déclinaisons, prix du studio, achetable.
2. **Lien de politique en 404** : le brouillon « privacy-policy » de WordPress masquait la page du site. Cause : page
   existante non publiée considérée comme présente. Fichier : `assets/cms/wordpress/es-theme.php` (page du site créée
   à côté, adresses mémorisées ; aucune page publiée écrasée). Résultat : 0 lien en erreur.
3. **Produit introuvable depuis les liens du site** quand le nom diffère de l'adresse : recherche par SKU du CSV
   (`es-woo.php`).
4. **Galerie de la fiche produit à 512 px** (largeur imposée par WooCommerce) et loupe peu lisible : `es-woo.css`.
5. Mode d'emploi anglais : nom du fichier CSV erroné ; produits importés en brouillon désormais expliqués.

## PRESTASHOP

| | État |
|---|---|
| Développé | thème enfant de Classic (PrestaShop 8.1), en-tête et pied de page du studio, sections pré-rendues en Smarty, module compagnon (pages, politiques, liens produits / collections, formulaires, sections de la fiche produit), habillage des pages natives |
| Testé statiquement | `theme.yml` (propriétés obligatoires), fichiers requis, `php -l`, secrets, contenu inventé, médias |
| Installé localement | **oui, 5/5** sur PrestaShop 8.1.7 (gestionnaire de thèmes de PrestaShop ; module activé avec le thème) |
| Testé réellement (local) | pages du site par les routes du module, liens, formulaire (enregistré), fiche produit native, ajout au panier, panier et page de commande natifs (cosmétique), boutique bilingue (anglais + français) |
| Reste à vérifier | hébergement réel, import par l'écran « Thème et logo » (le banc utilise le même gestionnaire de thèmes, en ligne de commande), paiement réel, paquets de langue réels |

Limite assumée : **PrestaShop n'a pas d'éditeur visuel de thème**. Catalogue, prix, stocks, commandes et messages se
modifient dans l'administration ; textes et mise en page des sections, dans les fichiers du thème ou par une nouvelle
exportation. Critère « personnalisation native » noté 5/10 → **jamais FINAL** (au mieux PROVISOIRE). Aucun fichier
d'import des produits n'est livré pour PrestaShop (création dans le back-office).

## PRESTASHOP INSTALLATION

Parcours : `scripts/cms-v2/env.sh` (installation en ligne de commande) puis le banc (`--platforms prestashop`) :
Classic réactivé, thème et module précédents retirés, ZIP importé et activé par le gestionnaire de thèmes, produit
créé comme dans Catalogue › Produits (`scripts/cms-v2/ps-product.php` : adresse simplifiée = celle du studio, prix du
studio sans règle de taxe, déclinaisons) → tests.

Défauts trouvés par l'installation et corrigés :
1. **Erreur 500 sur toutes les pages du site** dès que la boutique a 2 langues : `$php_self` figé dans le contrôleur
   du module cassait les liens du sélecteur de langue. Fichier : `assets/cms/prestashop/esstudio/controllers/front/
   page.php`. Résultat : 0 lien en erreur sur 5 projets.
2. **Contrastes illisibles** sur la fiche produit native (étiquette « Nouveau », onglets ; textes « Quantité »,
   « Partager », réassurance sur un site sombre) : `es-ps.css`.
3. Défauts d'environnement (pas du thème), corrigés dans le banc et documentés : icônes de `blockreassurance`
   enregistrées en « //modules » par l'installation en ligne de commande ; fichier `themes/core.js` supprimé par une
   première version du banc (restauré) ; défilement doux de Classic qui faussait les captures.

Adaptations de l'environnement de test : paquets de langue remplacés par des paquets VIDES servis localement
(serveur de traductions inaccessible), module `ps_distributionapiclient` retiré (catalogue Addons inaccessible),
MariaDB sur l'hôte.

## WIX AND SQUARESPACE

Kits de reconstruction (pages, textes, médias, couleurs, typographies, guide), statut KIT dans le registre,
message dédié : « Kit de reconstruction Wix généré … Wix n'accepte pas l'import d'un thème : le site se reconstruit à
la main dans son éditeur ». Jamais présentés comme installables. Non testés dans Wix / Squarespace.

## VISUAL FIDELITY

Comparaisons A (aperçu du studio) / B (export rendu) / C (thème installé), même projet, même page, mêmes largeurs
(1440 px, 820 px pour l'accueil, 390 px), mêmes médias et polices. Mesures : écart de pixels, suite des sections,
textes conservés, typographies, couleurs de fond des sections, images chargées, animations d'apparition, défauts de
mise en page. Résultats détaillés et planches : `reports/cms-v2-quality-review.md`.

Synthèse : sur les pages comparables (accueil, page de contenu, mentions légales), **sections identiques et
textes conservés à 100 % sur les 10 installations**, mêmes typographies, aucun débordement ni erreur JavaScript.
**Écart documenté** : les fiches produit sont les pages NATIVES de WooCommerce / PrestaShop habillées au design du
site (composition différente de la fiche du studio ; sections propres au produit ajoutées dessous). Fidélité
visuelle : **PARTIELLE** (validée localement sur les pages du site, différente sur les fiches produit ; aucune
validation artistique humaine ; aucune plateforme réelle).

## NATIVE EDITING

- WordPress : test automatisé dans l'éditeur de site (connexion admin → modèle de l'accueil → bloc « Section
  E-COM STUDIO » → champ texte de la barre latérale → enregistrer → le site affiche le nouveau texte, sections
  inchangées) : **5/5 réussis**. Captures `C-editeur-wordpress.jpg`.
- PrestaShop : pas d'éditeur visuel (voir ci-dessus).
- Shopify : schémas seulement, éditeur réel non testé.

## EXPORT WORKFLOW

Onglet Boutique › « Exporter et installer » (`src/components/studio/export-platform.tsx`) : étapes Créer →
Personnaliser → Plateforme → Vérifier → Exporter → Installer ; plateforme et mode de livraison ; capacités réelles
et limites (registre) ; informations « [À compléter : …] » restantes ; bouton « Vérifier et télécharger » (contrôle
puis téléchargement ; un export REFUSÉ n'est pas livré et le motif s'affiche) ; verdict et périmètre du dernier
export ; exports précédents versionnés (`…-v{n}.zip`, jamais écrasés) ; instructions d'installation. API :
`GET /api/projects/[id]/theme/export/status`. Noms de fichiers sans accents (`serum-eclat-shopify-v1.zip`).
Testé dans le navigateur (`scripts/e2e-cms-export.ts`) : **11/11**, ordinateur et téléphone, captures
`reports/screenshots/cms-v2/studio/`.

## SEO

Contrôlé sur les sites installés : titre de page, un seul H1, attribut de langue, viewport, textes alternatifs
(notes 8,9 à 10). Référencement réel non mesuré. SEO Shopify (métachamps) toujours **NON VÉRIFIÉ**.

## ASSETS

Médias refusés, fatals ou supprimés jamais exportés (contrôle bloquant `rejected_media`, testé) ; aucune image
cassée sur les 10 sites installés ; médias d'un autre projet signalés (`foreign_project_data`, fatal).

## PERFORMANCE

Mesures locales (non représentatives d'un hébergement) : tailles des ZIP, poids CSS / JS / médias, temps de
chargement local, requêtes — tableau dans le rapport qualité. Aucun score Lighthouse.

## ACCESSIBILITY

Contrôles automatiques : contraste, navigation au clavier, textes alternatifs, mouvements réduits. Défauts de
contraste trouvés sur des pages natives et corrigés (PrestaShop, WooCommerce). Pas de lecteur d'écran réel.

## SECURITY

Aucun secret du studio dans les exports ni dans les pages servies (recherche des valeurs d'environnement sensibles et
de motifs de clés ; défaut fatal testé) ; scripts injectés dans les contenus refusés ; réglages des sections nettoyés
(`wp_kses_post`) ; formulaires avec jeton (PrestaShop) et nonce WordPress (admin-post) ; aucune connexion directe.

## CMS QUALITY GATE

Barrière EXISTANTE réutilisée (`decide()`, politique `cms_export_v2`, mêmes verdicts, table `quality_checks`) :
- 3 dimensions indépendantes : technique, fidélité visuelle, exploitabilité commerciale ;
- 22 critères, critères obligatoires (e-commerce pour une boutique, formulaires pour un site de services) ;
- seuil final 8/10, plancher 6/10 par critère, défauts bloquants et fatals (§26.2) ;
- **périmètre = maillon le plus faible** des preuves des critères obligatoires ; FINAL seulement avec installation
  et tous les critères obligatoires mesurés ; sans installation : au mieux PROVISOIRE ;
- reprise ciblée : RETRY une fois au plus, jamais en boucle ; limite propre à la plateforme (PrestaShop sans éditeur
  visuel) traitée comme non corrigeable par une reprise (PROVISOIRE, jamais FINAL) ;
- exécuté **sur le site installé** (pas seulement sur les fichiers) ; verdict enregistré à chaque export du studio
  et à chaque passage du banc.

## QUALITY VERDICTS

| CMS | Exports contrôlés (dernier passage) | FINAL | PROVISIONAL | REJECTED | Défauts bloquants restants | Reprises ciblées pendant 11A | Problèmes corrigés | Non résolus | Niveau de validation atteint |
|---|---|---|---|---|---|---|---|---|---|
| Shopify | 5 | 0 | 5 | 0 | 0 | 2 (export en production, nom de fichier) | 2 | installation réelle non faite ; avis vides sur la fiche SaaS (10A) | statique + rendu local des fichiers exportés |
| WordPress / WooCommerce | 5 | 3 | 2 | 0 | 0 | 5 (CSV, page masquée, produit par SKU, galerie, consignes) | 5 | commerce non testable sans prix (2 projets) ; loupe de galerie à vérifier | installation locale |
| PrestaShop | 5 | 0 | 5 | 0 | 0 | 4 (erreur 500 bilingue, typographie Classic, contrastes, consignes) | 4 | pas d'éditeur visuel (limite de la plateforme) ; commerce non testable sans prix (2 projets) | installation locale |

Les verdicts sont enregistrés dans `quality_checks` (base du banc, `candidate_id = <plateforme>:bench`) et, dans le
studio, à chaque export (`<plateforme>:v<n>`). Les passages intermédiaires (avant correction) y figurent aussi.

Matrice complète projet × plateforme : `reports/cms-v2-quality-review.md` et `reports/cms-v2-matrix.json`.

Aucune note n'a été modifiée pour atteindre un seuil ; les défauts trouvés ont été corrigés dans le moteur de
conversion, puis le banc a été relancé.

## INSTALLATION TESTS

10 installations locales réussies sur 10 tentées (5 WordPress / WooCommerce, 5 PrestaShop). Shopify : 0 tentée
(impossible hors de Shopify). Détail par projet : `reports/screenshots/cms-v2/<plateforme>/<projet>/resultat.json`
et `reports/cms-v2-matrix.json`.

## VISUAL COMPARISONS

Planches `comparaison-<page>-<appareil>.jpg` (A | C, ou A | B pour Shopify) dans
`reports/screenshots/cms-v2/<plateforme>/<projet>/` ; captures fonctionnelles `C-ajout-panier.jpg`, `C-panier.jpg`,
`C-commande.jpg`, `C-editeur-wordpress.jpg`. Audit d'avant 11A : `reports/screenshots/cms-v2-audit/`.

## BROWSER TESTS

- Banc CMS (`scripts/cms-v2-bench.ts`) : 15 combinaisons projet × plateforme, 8 captures comparées par combinaison
  (4 pages, 2 à 3 largeurs), contrôles visuels automatiques, liens, formulaires, panier, éditeur WordPress.
- Écran d'export du studio (`scripts/e2e-cms-export.ts`) : **11/11**.

## AUTOMATED TESTS

**941/941** (110 fichiers). Nouveau : `tests/cms-v2.test.ts` (22 tests : registre, Quality Gate — statique jamais
FINAL, FINAL installé avec périmètre, défauts bloquants, critère non mesuré, maillon faible, plancher, fatal, reprise
ciblée sans boucle ; kits ; Shopify Theme Check ; WooCommerce boutique et services ; échappement des blocs ;
PrestaShop (Classic, module, fichiers préfixés, pas de `$php_self`) ; Smarty ; CSV (en-tête, déclinaisons, aucun prix
inventé) ; médias refusés ; secrets ; contenu inventé ; parité PHP ; consignes adaptées ; état d'export ; versions ;
navigation et SEO de base ; exports reproductibles et noms sûrs ; aucune IA ni réseau). Tests existants adaptés aux
nouveaux adaptateurs sans changer leur intention.

## TYPESCRIPT

`npx tsc --noEmit` : OK.

## BUILD

`npm run build` : OK.

## THEME CHECK

`scripts/verify-theme.sh` complet : tout valide (0 erreur) ; ZIP Shopify V2 des 5 projets : 0 erreur, 0 avertissement.

## KNOWN LIMITATIONS

- Aucune installation sur une vraie boutique ni un vrai hébergement ; Shopify jamais installé.
- Aucun paiement ni aucune commande ; page de commande seulement affichée.
- Fiches produit WooCommerce / PrestaShop natives (composition différente du studio).
- PrestaShop : pas d'édition visuelle des sections ; pas de fichier d'import produits ; textes des sections dans une
  langue.
- WooCommerce : images du CSV vides sans adresse publique du studio ; produits importés en brouillon ; interface
  WordPress testée en anglais.
- Produits sans prix confirmé (high-tech, SaaS) : non vendables, panier non testable pour eux (aucun prix inventé).
- Shopify SaaS : section d'avis vide sur la fiche produit (signalée par le contrôle visuel, venue de 10A, non corrigée
  en 11A).
- Environnement de test : paquets de langue PrestaShop vides, `ps_distributionapiclient` retiré, correction en base
  des icônes de réassurance ; `scripts/cms-v2/env.sh` reconstitué depuis les commandes exécutées, pas rejoué sur une
  machine vierge.
- Chromium seulement ; tablette = largeur 820 px dans Chromium, pas un vrai appareil.
- Performances locales seulement ; pas de Lighthouse ; pas de lecteur d'écran.

## REMAINING WORK

Voir `reports/remaining-work.md` (11B ajoutée ; limites de 11A listées ; validations 4B à 10B conservées).

## READY FOR PHASE 11B

Prêt techniquement : thèmes installables localement, banc reproductible, verdicts tracés. 11B demandera, avec
l'autorisation du propriétaire : une boutique Shopify de développement, un hébergement WordPress + WooCommerce, un
hébergement PrestaShop 8.1, des moyens de paiement de test. **11B non commencée.**
