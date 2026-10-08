# PHASE 5A — IMAGE & SEARCH ENGINE V2 REPORT

Statut : **5A techniquement terminée. 5B (benchmark réel et validation visuelle) NON commencée.**
Aucun appel payant réel, aucune recherche réelle dans les banques d'images, aucune image réelle générée pendant cette
phase : tous les tests utilisent des fournisseurs simulés. **La qualité visuelle réelle n'est PAS prouvée.**

## GIT STATE

- Phase 4A : PR #56 ouverte, CI entièrement verte (« Typecheck, tests, Theme Check, build » + « Image Docker »), état
  `clean` (aucun conflit), **fusionnée** dans `main` → `7800c44`. Branche de travail resynchronisée sur `main`
  (avance rapide, aucun force-push, aucune réécriture).
- Phase 4B : **EN ATTENTE**. Aucun benchmark réel de logos, aucun crédit dépensé ; le Logo Engine V2 reste disponible
  (action `brand.logo.v2`, `scripts/benchmark-logo-v2.ts`) et n'a pas remplacé l'ancien moteur dans la création
  complète.
- Phase 5A : commit poussé sur `claude/ecom-studio-ia-platform-8cwl79`. **Pas de PR, pas de fusion** (en attente de
  votre validation).

## AUDIT DES MOTEURS EXISTANTS (ciblé)

| Constat | Où | Conséquence |
|---|---|---|
| Trois chemins de photos libres dupliqués (même requête « déjà utilisées », recherche, tri, contrôle, enregistrement) | `service-media.ts` (`stockFill`, `postStockPhoto`), `stock-universe.ts` (`universePhotos`) | règles qui divergent d'un onglet à l'autre |
| Appel IA systématique pour écrire les requêtes, même quand le métier est parfaitement connu | `stockQueries`, `universeQueries`, `topicQueries` | coût inutile, résultats moins stables |
| Projets PRODUITS compris par le repli métier générique | `brain/snapshot.ts` → `resolveTrade` | requêtes d'univers vagues ; avertissement « GENERIC trade fallback » dans les plans |
| Tri sur la description de la banque par mots « interdits », sans comprendre la scène | `rankStock` | une surface seule (mur, texture) non reconnue comme hors sujet si aucun concept négatif exact |
| Photo de banque FINAL sur sa seule description (forfait sans IA) | politique `stock_photo` (`metadata` peut conclure FINAL) | score automatique confondu avec une preuve |
| Licence = simple texte (« Pexels »), jamais vérifiée ni accompagnée de ses restrictions | `stock/photos.ts` | « libre de droits » affirmé sans vérification |
| Candidat refusé re-téléchargé et re-contrôlé (payant) au passage suivant | `firstOnTopic` | contrôles repayés |
| Aucun brief structuré commun : chaque module écrit sa consigne | `images.ts`, `service-media.ts`, `photo-line.ts` | recherche, génération et contrôle ne parlent pas du même brief |
| Recadrage aveugle possible vers n'importe quel format | `photoCrop`, compositions | bannière tirée d'un carré |

## ARCHITECTURE (nouveau module `src/lib/image-v2/`)

```
PROJECT BRAIN → VISUAL INTENT → ART DIRECTION → SEARCH OR GENERATION → QUALITY GATE → SELECTION → ASSET LIBRARY → REUSE
   brief.ts       intent.ts      direction.ts     search.ts / deps.ts     quality.ts     engine.ts      assets.ts     assets.ts
```

| Fichier | Rôle |
|---|---|
| `types.ts` | intentions (14), supports, 11 directions artistiques, brief, licence, critères, codes de défauts |
| `categories.ts` | modèle des catégories PRODUITS (15 familles + repli secteur + repli générique) et identité réelle du produit |
| `intent.ts` | intention visuelle locale (sans IA) et étapes utiles par intention |
| `direction.ts` | direction artistique décidée par projet ; refus du client respectés |
| `formats.ts` | 8 formats (1:1, 4:5, 2:3, 3:2, 9:16, 16:9, 3:1, 4:1, + format libre ramené au plus proche), cadrage « attention », recadrage refusé quand il coupe trop |
| `brief.ts` | brief visuel structuré, construit localement ; empreinte ; consigne de génération |
| `sources.ts` | registre extensible des banques (Pexels, Pixabay, Openverse) : capacités, métadonnées, licence, attribution, restrictions, formats, limites |
| `search.ts` | requêtes multiples, tri par compréhension de scène, licence, doublons, liste courte à contrôler |
| `quality.ts` | contrôles locaux gratuits + relecture IA sur 10 critères + décision de la barrière |
| `deps.ts` | outils réels (Router V2) ou simulés : banques, téléchargement, relecture, génération fidèle |
| `assets.ts` | bibliothèque (provenance, licence, brief, verdict, versions, corrections), réutilisation, mémoire des candidats |
| `engine.ts` | moteur central (réutilisation → recherche → génération → reprises ciblées → enregistrement), plafond réel |

Une demande simple ne déclenche pas toute la chaîne : détourage = `cutout` seul, déclinaison = `frame` seul, retouche
= `edit` seul ; une image du produit réel ne passe jamais par une banque d'images.

## COMPRÉHENSION DU MÉTIER (services)

Registre métier existant (Project Brain) réutilisé, sans traitement spécial : métier exact, combinaisons
(« plâtrier peintre »), prestation par prestation (« Enduits et lissage » → plâtrier, jamais peintre), gestes, lieux,
concepts hors sujet. Pour Sébastien Blanc (vérifié par test) : requêtes
« plasterer applying skim coat to interior wall », « plasterer plastering interior », « painter painting interior wall
with roller » ; hors sujet : mur nu, mur de briques, mur en pierre, texture, façade, peinture sur toile.
Le mot « wall » n'est pas interdit : « plasterer smoothing plaster on an interior wall » est retenu (pertinence
8,5+/10), « white wall, empty room » et « brick wall texture » sont écartés **avant tout téléchargement**.

## COMPRÉHENSION DES PRODUITS (limitation des phases 2-3 levée)

`categories.ts` : cosmétique, accessoire beauté, high-tech, décoration, cuisine, alimentation, mode, accessoires,
sport, animaux, jouets, outillage, bien-être, papeterie/artisanat, produit numérique ; repli par secteur, puis repli
générique construit sur le libellé du client (une catégorie inconnue fonctionne toujours). Chaque famille déclare
lieux, usages, requêtes d'univers (sans le produit), hors sujet, directions conseillées et points de fidélité fragiles.
`productIdentity` : nom, forme, couleurs, matières, dimensions **confirmées**, caractéristiques **confirmées**, texte de
l'étiquette, logo, et la liste de ce qui ne s'invente jamais (inconnus et allégations à éviter compris).
Branché sur le Project Brain : `brainSnapshot().category` et l'élément « product.category » (scopes image, stock,
vidéo, publicité). L'orchestrateur ne signale plus « métier générique » pour un produit dont la famille est connue.

## VISUAL INTENT ET BRIEF

Brief structuré : sujet, geste, lieu, but, public, direction artistique, composition, lumière, cadrage, palette,
format (zone de texte), concepts positifs, mots qui prouvent le métier, requêtes, concepts négatifs, contraintes
factuelles, références, fidélité produit, note visée, variante de série, source de compréhension et confiance.
Construit **localement** (aucun appel LLM) ; son empreinte sert à la réutilisation et à la mémoire des candidats.

## RECHERCHE INTELLIGENTE ET MULTISOURCE

- Requêtes MÉTIER + ACTION + ENVIRONNEMENT + INTENTION, 2-3 formulations par image, anglais d'abord (métadonnées les
  plus riches), repli français si la source l'accepte.
- Les banques n'acceptent pas d'exclusions : les concepts négatifs s'appliquent au tri et au contrôle (déclaré dans le
  registre, `negativeTerms: false`).
- Tri gratuit sur la description : métier cité, concepts du brief, présence d'une personne ou d'un geste, surface
  seule, format compatible ; arrêt des requêtes dès qu'il y a assez de bons candidats ; doublons (même identifiant,
  même adresse, même auteur + même description) retirés.
- Au plus 4 candidats contrôlés par image (réglable) ; jamais des dizaines.
- Licence : Pexels et Pixabay = conditions de la plateforme (usage commercial, pas d'attribution obligatoire,
  restrictions conservées) ; Openverse = licence du résultat, CC0 / domaine public seulement ; toute autre licence
  est « NON vérifiée » et jamais retenue automatiquement. Rappel conservé : droit à l'image des personnes et marques
  visibles non couverts.
- Mémoire des candidats (`image_candidates`) : un candidat refusé pour un brief n'est ni retéléchargé ni recontrôlé.

## GÉNÉRATION ET ROUTER V2

Parcours choisi par le Router V2 selon le brief : retouche par masque (OpenAI, si un modèle d'édition est disponible)
ou décor généré + produit réel composé (Google) pour le PRODUIT ; génération d'ambiance pour le métier ou l'univers ;
« aucun » si rien n'est fiable. Aucun appel sans brief précis ; la génération n'est qu'un dernier recours pour les
photos du métier (après la recherche gratuite). La qualité prime : la relecture d'un produit réel est routée au niveau
fort directement.

## FIDÉLITÉ AU PRODUIT

- Sans détourage valide du produit : **aucune image du produit** (jamais un texte vers image qui le réinventerait).
- Avec référence : les pixels du produit sont remis exactement après la génération du décor (vérifié par test).
- Relecture avec la photo de référence : produit transformé = défaut **fatal** (`product_altered`, `wrong_product`) ;
  la transformation est abandonnée (aucune nouvelle tentative), l'image payée est gardée « refusée » pour le
  diagnostic, jamais réutilisée.

## DIRECTION ARTISTIQUE

11 directions (studio minimaliste, photographie premium, lifestyle naturel, éditoriale, architecturale, démonstration
produit, univers technologique, univers chaleureux, publicité haut de gamme, composition graphique, reportage métier),
choisies selon l'activité, la famille du produit, la personnalité de la marque (premium…), l'intention et le support.
Vérifié : au moins 3 directions différentes sur les 5 scénarios ; cosmétique premium → photographie premium ;
high-tech → univers technologique ; plâtrier → reportage métier. Un refus du client (« image:<direction> ») est respecté.

## COMPOSITION, FORMATS ET QUALITÉ VISUELLE

- Format fixé dès le brief (orientation de recherche, rapport de génération, zone de texte calme pour bannières,
  publicités et réseaux sociaux).
- Recadrage par zone d'attention ; refusé sous 50 % de l'image gardée (une photo 3:2 donne une bannière 3:1 ; un carré
  ne devient jamais une bannière) ou si la résolution utile est insuffisante.
- Contrôles locaux gratuits avant tout contrôle payant : image lisible, résolution, recadrage, image très floue ou
  vide, presque noire / blanche, quasi-doublon (empreinte perceptive). Seuils volontairement prudents, **non
  calibrés sur de vrais rendus** (objet de la 5B).

## IMAGE QUALITY GATE V2

Fondation de la phase 1 réutilisée (`decide`), deux nouvelles politiques (`POLICY_VERSION = 2026-10-p5a`) :
- `image_v2` : FINAL ≥ 7,5 ; planchers pertinence 7, fidélité 8, esthétique 6,5, composition 6, respect du brief 6,5 ;
  fatals : hors sujet, mauvais produit, produit transformé, corrompu, interdit ; bloquants : déformation, texte ajouté,
  artefacts, résolution, recadrage, esthétique faible, incohérence de marque ou de brief, doublon, licence non vérifiée.
- `stock_v2` : seul un contrôle visuel (IA) ou humain conclut FINAL ; la description seule (forfait sans IA) donne au
  mieux **PROVISIONAL** (utilisable, signalé « à améliorer »), jamais FINAL.
Relecture IA sur 10 critères (pertinence, fidélité, esthétique, composition, réalisme, marque, brief, support,
artefacts, exploitabilité). Hors sujet jamais FINAL même noté 9,6 ; image correcte mais banale (esthétique 6) jamais
FINAL ; panne du contrôle jamais validée. Verdicts explicites FINAL / RETRY / PROVISIONAL / REJECTED enregistrés.

## CORRECTIONS CIBLÉES

Lumière → corriger l'éclairage ; composition / recadrage → ajuster le cadre ; fond → remplacer le fond ; produit
transformé → abandon, retour à la source ; scène hors sujet → une nouvelle direction artistique choisie localement.
Au plus 2 reprises ; jamais deux fois la même consigne (empreinte) ; une panne du contrôle ne relance pas une image
payée ; chaque correction est conservée avec l'image.

## DIVERSITÉ

Une série varie l'angle, la lumière, le lieu et l'intention, avec la même direction artistique (identité cohérente).
Quasi-doublons refusés (empreinte perceptive, distance ≤ 6/64) contre la série et les images du projet.

## ASSET LIBRARY ET RÉUTILISATION

Chaque image retenue : origine, fournisseur, résumé du brief (jamais la consigne envoyée au fournisseur), rôle,
projet, note, verdict, licence (stock), crédit, version, lien avec le produit (`sourceAssetId`), corrections,
empreinte. Une image FINAL faite pour le même brief est réutilisée sans recherche ni génération ; une image refusée
(par la barrière ou par le client) ne revient jamais automatiquement (`isAutoUsable`).

## CONNEXION AVEC LE STUDIO

Fait :
- action `image.v2` (tâche de fond, intention GENERATE_IMAGE, étape `image_generate`), route
  `POST/GET /api/projects/[id]/images/v2` (demande en texte libre comprise localement, refus d'une image, refus d'une
  direction artistique) ;
- étape « photos libres » des plans (`stock.search`, `findStockPhotos`) passée au moteur V2 (métier pour un service,
  univers pour un produit) ; un résultat seulement PROVISOIRE n'est plus annoncé FINAL au plan ;
- chemins existants (`stockFill`, `postStockPhoto`, `universePhotos`, `firstOnTopic`, `rankStock`) alignés sur les
  règles V2 : compréhension de la scène, mémoire des candidats refusés, licence établie conservée, requêtes locales
  sans IA quand le métier ou la famille du produit est connue.

Pas encore fait (honnêtement) :
- la génération des scènes produit de la création complète (`generateImageSet`), les ambiances IA des services, les
  créations publicitaires et sociales composées, le blog et la vidéo utilisent encore leurs chemins actuels (avec la
  barrière de la phase 1), pas le moteur V2 ;
- pas d'écran dédié dans le studio : les images V2 sont dans la bibliothèque et via l'API.

## COÛTS ET PERFORMANCE

Plafond RÉEL par tâche d'images (2 € par défaut, réglable ; ce que la tâche a dépensé avant n'est pas compté contre
lui ; un plafond plus strict de l'appelant est conservé) vérifié avant chaque appel payant ; arrêt propre au plafond.
Économies : requêtes sans IA quand le métier ou la famille est connue ; tri gratuit avant tout téléchargement ;
4 contrôles au plus par image ; candidat refusé jamais repayé ; image FINAL réutilisée ; aucune relecture identique.
Coût tracé dans `ai_calls` (tâche, étape, candidat, tentative), verdicts dans `quality_checks`.

## BENCHMARKS

Cinq scénarios testables avec des fournisseurs simulés (`tests/image-v2-fixtures.ts`) : A artisan (Sébastien Blanc),
B cosmétique premium, C high-tech, D restaurant, E SaaS. Aucun traitement propre à un scénario dans le moteur
(vérifié : aucun nom de marque de fixture dans le code du moteur).

Script réel préparé : `scripts/benchmark-image-v2.ts`
- `--check` : version, phase 5A, compte (administrateur choisi automatiquement, e-mail masqué), accès IA,
  fournisseurs, banques et licences, Router V2, diagnostic, plafond (essai à blanc), absence de secret ; aucun projet,
  aucune recherche, aucun appel ;
- `--fixture`, `--max-cost` (plafond réel en euros), `--project` (projet existant), `--user` / `BENCH_USER` ;
- moteur Image V2 seul (aucune boutique, publicité, vidéo, blog ni publication) ; images dans la bibliothèque du
  vrai studio ; diagnostic coût / qualité en JSON dans `reports/` ;
- image du produit réel lancée seulement avec un vrai détourage du projet (sinon ignorée et signalée) ;
- limites documentées en tête du script : coûts parfois estimés, facturation du fournisseur parfois différée,
  dépassement maximal d'environ un appel.

## TESTS

- `tests/image-v2.test.ts` : 28 tests — métier compris, catégorie produit et repli, identité produit, intention locale,
  direction artistique et refus, classement (mur nu rejeté, geste retenu), multisource / doublons / licence, registre
  des banques, formats, barrière V2, produit transformé, reprises ciblées, scénario A complet, mémoire des refus,
  forfait sans IA → PROVISIONAL, repli (sans banque → génération ; sans génération → refus clair ; catégorie
  inconnue), fidélité (pixels du produit), produit transformé jamais réutilisé, reprise réelle, changement de
  direction, diversité et doublons, idempotence et réutilisation, coût tracé et plafond, les 5 scénarios, Project
  Brain, Router V2, Planner, absence de secret et de consigne stockée.
- `tests/benchmark-image-v2-check.test.ts` : le `--check` n'affiche ni clé ni e-mail, ne crée rien.
- Tests existants adaptés au changement VOULU (aucun désactivé) : `brain-moteurs-2c` (famille reconnue = plus d'appel
  IA pour les requêtes d'univers ; famille inconnue = appel avec le scope « stock »), `orchestrateur-3a` et
  `orchestrateur-3b` (limitation « métier générique » levée pour un produit connu).
- Résultat : **776/776 tests verts** (93 fichiers). TypeScript : OK.

## BUILD

`npm run build` : OK (sur le code final du commit).

## CE QUI A ÉTÉ VÉRIFIÉ / NON VÉRIFIÉ

Vérifié (par tests, fournisseurs simulés) : les décisions du moteur — ce qui est cherché, écarté, contrôlé, retenu,
refusé, réutilisé, payé ou bloqué.
**Non vérifié** : la qualité visuelle réelle des images, la pertinence réelle des résultats Pexels / Pixabay /
Openverse, le calibrage des seuils locaux (netteté, exposition) et des notes de la relecture IA sur de vrais rendus,
les coûts réels. Aucune capture d'écran n'a été fabriquée. Une image simulée n'est pas une preuve de qualité.

## KNOWN LIMITATIONS

- Branchement partiel (voir « Connexion avec le studio ») : la génération de la création complète et les créations
  composées n'utilisent pas encore le moteur V2.
- Le plafond par tâche s'appuie sur `ai_calls` de la tâche de fond ; hors tâche (appel direct), seule l'estimation
  de l'appel est comparée.
- Les seuils de pertinence du tri et des contrôles locaux sont des choix de départ, à ajuster avec la 5B.
- Les banques ne déclarent pas toujours une description riche (Pexels : texte alternatif parfois vide) : ces photos
  sont pénalisées au tri et dépendent davantage du contrôle visuel.
- Retouche (`edit`) et déclinaison (`frame`) sont des intentions reconnues ; seule la déclinaison par recadrage est
  outillée dans le moteur V2, la retouche passe encore par les outils existants du studio.

## PRÊT POUR 5B

Dans votre Codespace, plus tard : `npx tsx scripts/benchmark-image-v2.ts --check`, puis, avec votre accord,
`--fixture artisan --max-cost 2` (et les autres scénarios ; pour B/C, `--project <id>` d'un projet avec une vraie
photo détourée). La Phase 5 ne sera validée qu'après examen des vraies images.
