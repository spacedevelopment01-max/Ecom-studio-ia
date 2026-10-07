# PHASE 2C — FINAL PROJECT BRAIN REPORT

Date : 2026-10-07 · Branche : `claude/ecom-studio-ia-platform-8cwl79` · Version du Brain : **2.3.0** (2.2.0 avant).
Aucun appel payant à l'IA pendant cette phase (aucune capture d'écran, aucun benchmark). Mesures faites dans une base
temporaire, sur les fixtures, sans IA (`npx tsx scripts/brain-measure.ts --dups`).

## GIT STATE

- `main` = `39c4bf578f61e196e8c6397cd814026094362fa2` (fusion de la PR #52, phase 2B).
- La branche de travail a été avancée sur `main` (fast-forward, aucune réécriture d'historique), puis la 2C a été
  écrite par-dessus, en un seul commit (ce rapport en fait partie).
- Arbre propre après le commit. Aucun push forcé, aucune opération destructive.
- Phase 2C : **pas de PR, pas de fusion** (en attente de validation).

## 2B MERGE

- PR #52 « Phase 2B — Project Brain : mémoire, rejets, métiers, faits, cohérence de marque ».
- CI sur la tête `8c9afb9` : **2/2 vertes** — « Typecheck, tests, Theme Check, build » ✅ et « Image Docker
  (construction et démarrage) » ✅. Fusion après CI entièrement verte (merge commit `39c4bf5`).
- Branche synchronisée avec `main` après la fusion ; arbre vérifié.

## MODULE MIGRATION

Nouvelle API (`src/lib/brain/facade.ts`, réexportée par `src/lib/ai/context.ts`) :

- `brainView(p, scope)` : vue EXPLICITE d'un scope (budget du scope, empreinte, portée tracée). **Refuse « all »**.
- `brainContext(p, scope)` : son contexte stable (le volatil passe après le point de cache, via le registre 2.1).
- `brainTraceOf(view)` : trace Brain d'une génération média écrite depuis un contexte du Brain.
- `ContextView.kept` : identifiants des éléments réellement transmis (sert à ne pas les répéter dans un brief local).
- `ENGINE_SCOPES` (`src/lib/brain/measure.ts`) : table de migration, source de vérité des tests et des mesures.

| Moteur | Scope | Avant (2.1) | Appels migrés |
|---|---|---|---|
| Logo | `logo` | legacy:brand | aiCreativeRoutes, aiCreativeRedraw, briefs du logo complet (full-logo) |
| Image | `image` | legacy:images | aiImageBrief |
| Stock | `stock` | aucun contexte | stockQueries, topicQueries (service-media), universeQueries (stock-universe) |
| Thème | `theme` | legacy:shop | aiDesignHome, aiThemeChat, aiRepairOps, aiReviewHome, custom-theme (×2) |
| Textes boutique | `shop_copy` | legacy:shop | aiShopCopy |
| SEO | `seo` | legacy:shop | aucun moteur SEO dédié (voir SEO CONTEXT) |
| Blog | `blog` | all | sujets d'articles, rédaction d'article |
| Social | `social` | legacy:social / legacy:images | aiSocialPlan, aiSocialRepair, aiRewritePost, aiSocialVoice, aiServiceTips (était « images ») |
| Publicité | `advertising` | legacy:social | draftAds |
| Vidéo / UGC | `video` | legacy:video | aiVideoPlan, aiUgcScript |
| Contrôle qualité | `qc` | all / shop / social / video | aiQcText, aiCopyReview, aiSocialReview, aiCraftReview |
| Marque | `brand` | legacy:brand | aiBrand (inchangé de fait : même scope, sans les ajouts legacy) |

Seule exception conservée : **l'essai d'un prompt libre du client** (`/api/projects/[id]/prompt-run`) garde la vue
complète « all » — c'est une demande ouverte du client, pas un moteur. Un test empêche tout autre `projectContext()`
dans `src/` et `worker/`.

Ajustements des vues (mesurés, voir CONTEXT SIZE) :

- Budgets souples : `seo` 1 800 → 2 800 (la zone d'intervention était écartée), `social` 3 000 → 4 000 (messages
  clés écartés), `video` 3 000 → 4 500 (positionnement et cible écartés). Plafonds inchangés sauf `seo` 6 000 → 7 000.
- `services.area` (zone d'intervention) devient critique (jamais retirée par le budget).
- Nouvel élément `services.cta` (social, publicité, vidéo) : le MODE de contact (devis, rendez-vous…), sans aucune
  coordonnée — la règle validée en 2.0 « coordonnées seulement dans les vues du site » est respectée.
- Coordonnées : ajoutées au scope `qc` (la relecture des textes du site vérifie qu'aucune coordonnée n'est inventée
  ou déformée).
- Prix (`product.price`, y compris « inconnu, ne jamais en inventer ») : ajouté à `social`, `video`, `blog`.
- `qc` reçoit aussi le ton, la cible, les objections, la ligne éditoriale et les préférences « boutique » et
  « réseaux » du client (une relecture juge la voix et les objections).
- Mémoire de portée `shop` et `social` : visible aussi en `qc`.

## LOGO CONTEXT

Contenu (Sébastien Blanc) : refus du client « badge / emblème », correction de zone, type d'activité, activité et
métier, marque, palette, signature, typographies, direction, positionnement, cible, préférence de couleurs, résumé,
métier compris et gestes, objets du métier pour un symbole (truelle, règle, rouleau… ; à éviter : mur, briques).
Absent : faits du site, prestations détaillées, règles de rédaction, messages clés, ligne éditoriale, coordonnées.
Le brief des pistes ne répète plus nom, signature, personnalité, cible, positionnement ni description de l'activité
(déjà dans le contexte) ; il garde le lien obligatoire avec l'activité, les rôles de la palette, les familles de
caractères, les mots interdits et la liste des prestations (absente du scope logo).

## IMAGE CONTEXT

Contenu : refus d'image (« mur vide sans chantier »), correction, activité, marque, allégations interdites,
prestations, palette, direction, préférence de couleurs, métier et gestes, scènes utiles et hors sujet (brick wall,
bare wall, empty room…). Produit : variantes, texte lisible du flacon, aspect du produit, observation prudente.
Absent : règles de rédaction des services, cible, messages clés, stratégie SEO, prix, coordonnées.

## STOCK CONTEXT

Nouveauté : les trois rédacteurs de recherches de photos libres recevaient seulement « Business: <métier> ». Ils
reçoivent maintenant le scope `stock` : profession, gestes, recherches types (action + métier + lieu), scènes hors
sujet, prestations, zone, refus d'image du client, correction. Absent : palette, histoire de marque, ton, logo.
Le budget souple (1 200) est dépassé uniquement par des éléments critiques chez Sébastien Blanc (2 047 car.) : rien
n'est retiré, c'est signalé.

## THEME CONTEXT

Le scope `theme` garde tout ce qui sert au site (faits, inconnues, prestations, coordonnées, règles, marque, ton,
stratégie, preuves, objections). Seuls les angles éditoriaux (rang 7) et l'aspect du produit sortent. Réduction faible
(6,6 % / 9,3 %), attendue : le site a besoin de presque tout.

## SHOP COPY CONTEXT

Comme le thème, sans les éléments purement visuels (palette, typographies, direction, préférence de couleurs, aspect
du produit). Garde histoire, coordonnées, faits, objections, preuves. Réduction 13,1 % / 18 %.

## SEO CONTEXT

Il n'existe **pas de moteur SEO dédié** dans le studio : `seo.title` / `seo.description` sont écrits par le moteur des
textes de la boutique (`shop_copy`) et les méta des articles par le blog (`blog`). Le scope `seo` est mesuré et
testé (prêt pour un futur moteur) : activité, prestations, zone, faits confirmés, inconnues, allégations interdites,
règles, métier compris ; sans palette, typographies, logo ni direction. Avec le nouveau budget, la zone d'intervention
n'est plus écartée.

## BLOG CONTEXT

Avant : la vue complète « all ». Après : `blog` — sans refus de logo / d'image, sans palette, typographies, direction,
scènes et recherches de photos. Garde faits, inconnues, prix, règles, ton, histoire, stratégie. −38 %.

## SOCIAL CONTEXT

Garde marque, ton, ligne éditoriale, faits, prix (protection), stratégie, mode de contact (sans coordonnées).
Retire la direction artistique et les coordonnées. Les conseils d'expert (aiServiceTips) passent de « images » à
`social` (texte de publication).

## ADVERTISING CONTEXT

Garde faits, prix, preuves, arguments sans preuve, objections, plateforme, ton, ligne éditoriale, palette, logo,
mode de contact. Retire la direction artistique et les coordonnées. La piste créative ajoutée au contexte ne répète
plus palette, voix, ligne éditoriale, nom ni signature (565 → 86 car. / 423 → 95 car.).

## VIDEO CONTEXT

Garde marque, palette, typographies, logo, ton, faits, prix, stratégie, métier et scènes, mode de contact. Avec le
budget 4 500, positionnement et cible ne sont plus écartés. La piste créative est allégée de la même façon.

## QC CONTEXT

Avant : la vue complète (aiQcText) ou la vue du module relu. Après : `qc` — faits, inconnues, prix, variantes,
texte lisible, allégations, preuves et arguments sans preuve, règles, ton, cible, objections, ligne éditoriale,
coordonnées, préférences du client sur les textes. Sans refus de logo / d'image, métier, scènes, palette,
typographies, direction. −47 % / −54 %. La relecture créative des publicités et vidéos (aiCraftReview) passe en
`qc` + piste créative (qui complète ce que `qc` n'a pas : palette, piste de logo).

## DUPLICATIONS REMOVED

Règle appliquée : un brief local ne répète pas ce que la vue a **réellement transmis** (`view.kept`) ; si un élément
a été écarté par le budget, il reste dans le brief. Les consignes créatives propres à la tâche ne sont jamais retirées.

| Brief local | Retiré (confirmé dans le contexte) | Gardé | Sébastien Blanc | Sérum Éclat |
|---|---|---|---|---|
| Pistes de logo (`routesBrief`) | nom, signature, personnalité, cible, positionnement, activité / aspect du produit | lien avec l'activité, rôles de la palette, familles, mots interdits, prestations | 1 606 → 1 219 | 1 400 → 1 118 |
| Logo complet (full-logo) | palette, direction | nom exact attendu, consignes de composition | — | — |
| Piste créative pub | nom, signature, palette, voix, ligne éditoriale, concept du logo (≤ 200 car.) | piste retenue (graisse, rôles des couleurs), règle « produit pour enfants » | 565 → 86 | 423 → 95 |
| Piste créative vidéo / UGC | idem (ligne éditoriale gardée si absente du scope vidéo) | idem | 565 → 86 | 423 → 95 |
| Piste créative relecture (qc) | nom, signature, voix, ligne éditoriale | palette, piste, règle enfants | 565 → 273 | 423 → 267 |
| Recherches de photos (stock) | « Business: <métier> » (dans le contexte) | résumé, emplacements, consignes de recherche | — | — |

Non touché (consignes de tâche, pas des doublons) : ligne photographique des images, plans vidéo, brief de
présentation UGC des services, consignes SEO des textes, règles des régies publicitaires.

## BRAIN TRACE

- Tout appel texte qui passe un contexte du Brain enregistre `brain_scope`, `brain_hash`, `brain_version` dans
  `ai_calls` (registre 2.1 ; le scope est maintenant le scope explicite : `logo`, `image`, `stock`, `qc`…).
- **Générations d'images** : quand la consigne a été écrite par l'IA à partir du scope `image` (aiImageBrief), la
  génération (OpenAI ou Gemini) est tracée avec le même scope, la même empreinte et la même version, en réussite
  comme en échec. Une consigne du studio (sans IA de rédaction) n'a pas de trace Brain.
- Non rattachées (pas de contexte Brain dans leur consigne) : images des entreprises de services (consignes du
  registre des métiers), plans vidéo générés (Veo / fal), images UGC. Aucune consigne, image ni secret n'est
  enregistré.

## CONTEXT SIZE BEFORE / AFTER

Caractères du contexte stable. Avant = vue legacy que le moteur recevait en 2.1. Budget souple dépassé = par des
éléments critiques uniquement (rien de critique n'est jamais retiré).

### Sébastien Blanc — plâtrier peintre

| Moteur | Avant | Après | Réduction | Sections incluses | Sections exclues | Souple dépassé | Plafond |
|---|---|---|---|---|---|---|---|
| logo | 3 912 (legacy:brand) | 1 687 | 56,9 % | rejections, memory, identity, brand, trade | facts, offer, rules, strategy | non | non |
| image | 4 581 (legacy:images) | 2 001 | 56,3 % | rejections, memory, identity, brand, offer, facts, trade | rules, strategy | non | non |
| stock | 0 (aucun) | 2 047 | n/a | rejections, memory, identity, offer, trade | — | OUI (1 200, critique) | non |
| theme | 3 849 (legacy:shop) | 3 596 | 6,6 % | memory, identity, brand, facts, offer, rules, strategy | — | non | non |
| shop_copy | 3 849 (legacy:shop) | 3 343 | 13,1 % | memory, identity, brand, facts, offer, rules, strategy | — | non | non |
| seo | 3 849 (legacy:shop) | 2 716 | 29,4 % | memory, identity, brand, facts, offer, rules, trade | strategy | non | non |
| blog | 5 408 (all) | 3 341 | 38,2 % | memory, identity, brand, facts, offer, rules, trade, strategy | rejections | non | non |
| social | 3 918 (legacy:social) | 3 654 | 6,7 % | memory, identity, brand, facts, offer, rules, strategy | — | non | non |
| advertising | 3 918 (legacy:social) | 3 659 | 6,6 % | memory, identity, brand, facts, offer, rules, strategy | — | non | non |
| video | 4 532 (legacy:video) | 4 278 | 5,6 % | memory, identity, brand, facts, offer, rules, trade, strategy | — | non | non |
| qc | 5 408 (all) | 2 842 | 47,4 % | memory, identity, brand, facts, offer, rules | rejections, trade, strategy | non | non |
| brand | 3 912 (legacy:brand) | 2 438 | 37,7 % | memory, identity, brand, facts, offer, trade, strategy | rules | non | non |

### Sérum Éclat — produit riche

| Moteur | Avant | Après | Réduction | Sections incluses | Sections exclues | Souple dépassé | Plafond |
|---|---|---|---|---|---|---|---|
| logo | 2 199 (legacy:brand) | 1 293 | 41,2 % | rejections, identity, brand, trade, offer | facts, rules, strategy | non | non |
| image | 2 272 (legacy:images) | 1 379 | 39,3 % | identity, brand, offer, facts, trade | rules, strategy | non | non |
| stock | 0 (aucun) | 990 | n/a | identity, trade | — | non | non |
| theme | 2 266 (legacy:shop) | 2 056 | 9,3 % | identity, brand, facts, offer, rules, strategy, memory | — | non | non |
| shop_copy | 2 266 (legacy:shop) | 1 857 | 18,0 % | identity, brand, facts, offer, rules, strategy, memory | — | non | non |
| seo | 2 266 (legacy:shop) | 1 225 | 45,9 % | identity, brand, facts, offer, rules, trade, memory | strategy | non | non |
| blog | 3 000 (all) | 1 851 | 38,3 % | identity, brand, facts, offer, rules, trade, strategy, memory | rejections | non | non |
| social | 2 220 (legacy:social) | 1 641 | 26,1 % | identity, brand, facts, offer, rules, strategy | — | non | non |
| advertising | 2 220 (legacy:social) | 2 185 | 1,6 % | identity, brand, facts, offer, rules, strategy | — | non | non |
| video | 2 271 (legacy:video) | 2 144 | 5,6 % | identity, brand, facts, offer, rules, trade, strategy | — | non | non |
| qc | 3 000 (all) | 1 390 | 53,7 % | identity, brand, facts, offer, rules, strategy, memory | rejections, trade | non | non |
| brand | 2 199 (legacy:brand) | 1 761 | 19,9 % | identity, brand, facts, trade, offer, strategy | rules | non | non |

Éléments retirés par moteur (Sébastien Blanc ; liste complète des deux fixtures : `scripts/brain-measure.ts --dups`) :

- logo : faits, inconnues, prestations, allégations, zone, règles, ton, messages, angles (ajoutés : refus de logo, objets du métier).
- image : faits, inconnues, zone, règles, signature, typographies, ton, positionnement, cible, résumé, messages, angles.
- seo : coordonnées, palette, signature, typographies, direction, ton, positionnement, préférence de couleurs, messages, angles (ajouté : métier compris).
- blog : refus logo / image, coordonnées, mode de contact, palette, signature, typographies, direction, scènes, recherches, objets, préférence de couleurs, angles.
- social / advertising : coordonnées, direction artistique.
- qc : refus, mode de contact, palette, signature, typographies, direction, métier, scènes, recherches, objets, positionnement, préférence de couleurs, résumé, messages, angles.

Lecture : la réduction n'est pas l'objectif. Les plus fortes baisses (logo, image, qc, blog, seo) retirent du bruit
pour la tâche ; site, textes, publicité et vidéo restent presque complets parce qu'ils ont besoin de presque tout.
Le stock passe de 0 à ~1 000–2 000 caractères : c'est un ajout volontaire (négatifs, refus, prestations, zone).
**Aucun élément critique retiré, aucun plafond atteint**, sur les deux fixtures et les 12 moteurs (testé).

## SEBASTIEN BLANC RESULTS

| Exigence | Résultat |
|---|---|
| LOGO : Sébastien Blanc, plâtrier peintre, gestes, positionnement, palette / typos, refus logo, pas de social | ✅ testé |
| IMAGE : métier, gestes, environnements, positifs / négatifs, palette / direction, pas de SEO | ✅ testé |
| STOCK : profession, gestes, environnements, négatifs, prestations, pas d'histoire de marque | ✅ testé |
| SEO : activité, prestations, zone, faits confirmés, allégations à éviter, pas de palette / logo | ✅ testé |
| Coordonnées hors site jamais transmises (logo, image, stock, seo, blog, social, pub, vidéo, marque) | ✅ testé |
| « Mâcon » ne déclenche plus « maçon » (2B) ; métier compris = combo plâtrier peintre | ✅ |

## PRODUCT FIXTURE RESULTS

- Faits confirmés, inconnue « Livraison », prix confirmé 34,90 €, allégation « anti-âge prouvé », argument sans preuve,
  « Fabriqué en France » : présents dans `shop_copy`, `theme`, `advertising`, `qc` (testé).
- Prix aussi dans `social`, `video`, `blog`, `seo` (protection contre un prix inventé).
- Image : texte lisible du flacon, aspect du produit, allégations interdites ; sans prix, objections ni plateforme.
- Logo : refus « symbole dessiné » transmis.

**LIMITATION TOUJOURS PRÉSENTE — catégories produit : repli GÉNÉRIQUE du registre des métiers.** « Sérum visage » n'a
pas d'entrée dans le registre (`[generic]`) : le métier compris répète le nom et la catégorie, et la ligne « Scènes
pertinentes » de l'image et du stock contient une scène générique inadaptée (« … professional at work »), avec les
seuls négatifs globaux. C'est une indication (jamais une contrainte), mais c'est du bruit pour un produit. Un test le
rend visible. Non corrigé en 2C (refonte des moteurs hors périmètre).

## TESTS

**703 / 703** (87 fichiers, 0 ignoré). Nouveaux :

- `tests/brain-moteurs-2c.test.ts` (6) : 18 appels réels de moteurs (IA simulée qui enregistre l'appel) → chaque
  moteur reçoit exactement son scope, jamais « all » ni « legacy » ; `brainView("all")` refusé ; garde-fou sur le
  code (aucun `projectContext()` hors prompt libre ; recherches de photos et logo complet sur leur scope) ; doublons du
  brief de logo et de la piste créative ; **aucun doublon retiré à tort** (élément écarté par le budget → gardé).
- `tests/brain-contextes-2c.test.ts` (11) : contenus logo / image / stock / seo de Sébastien Blanc (présent / absent),
  coordonnées, fixture produit, repli générique visible, aucun critique retiré ni plafond atteint, trace d'un appel
  texte (scope, empreinte, version 2.3.0), trace d'une génération d'image (réussite, échec, sans Brain), stable /
  volatil par scope.
- `tests/brain-fixtures.ts` : fixtures partagées avec `scripts/brain-measure.ts`.

Tests existants modifiés (simulation seulement, aucune assertion affaiblie) : 6 fichiers simulaient
`@/lib/ai/context` avec la seule ancienne fonction ; la simulation fournit aussi `brainContext` / `brainView`
(contexte vide, `kept` vide → les briefs locaux restent complets, comme avant).

## TYPESCRIPT

`npx tsc --noEmit` : **OK**.

## BUILD

`npm run build` : **OK**. Thème non modifié (`theme-base/`, `src/lib/theme/` intacts) : Theme Check non concerné.

## BEHAVIOR CHANGES

- Chaque moteur reçoit un contexte plus court et ciblé (voir tableaux) ; empreintes nouvelles (version 2.3.0) → le
  cache de contexte des fournisseurs repart une fois.
- Recherches de photos libres : plus informées (négatifs, refus, prestations, zone), un peu plus de jetons d'entrée
  (≈ 300 à 650 jetons par appel de classification).
- Publications, publicités, vidéos : reçoivent le mode de contact, jamais les coordonnées (les publicités recevaient
  avant téléphone et adresse via la vue legacy « social »).
- Relectures (qc) : voient les coordonnées du site et les préférences du client sur les textes.
- Conseils d'expert des services : contexte `social` au lieu d'« images ».
- Trace : `ai_calls.brain_scope` vaut le scope explicite ; générations d'images écrites depuis le Brain tracées.
- Aucun changement visible dans l'interface. Forfait Découverte : inchangé (moteur local, aucun appel).

## KNOWN LIMITATIONS

1. **Catégories produit : repli générique du registre des métiers** (voir PRODUCT FIXTURE RESULTS) — toujours présent.
2. Pas de moteur SEO dédié : le scope `seo` est prêt et mesuré, mais le SEO est écrit par `shop_copy` et `blog`.
3. Budgets souples : hypothèses ajustées sur deux fixtures seulement ; à revoir avec des projets réels.
4. Mesures en caractères (≈ 3,2 car. / jeton), pas en jetons facturés ; aucun benchmark réel (pas de dépense IA).
5. Traces média : seules les images dont la consigne vient d'aiImageBrief sont rattachées ; images des services,
   clips vidéo et images UGC ne le sont pas (leur consigne ne vient pas d'un contexte du Brain).
6. L'essai d'un prompt libre garde la vue « all » (choix volontaire, documenté et testé).
7. Échec intermittent de `theme-custom` vu une fois en 2.1 : cause toujours inconnue (non reproduit ici).

## PHASE 2 FINAL STATUS

- 2A (2.0 + 2.1) : fusionnée. 2B : fusionnée (PR #52, CI verte). 2C : terminée, **non fusionnée** (en attente de
  validation).
- Après validation et fusion de 2C : **PHASE 2 = TERMINÉE**. Aucune sous-phase 2D / 2E.

## READY FOR PHASE 3

Oui, sous réserve de la validation et de la fusion de 2C : chaque moteur lit son scope explicite, tracé, sans
doublon confirmé ; mémoire, refus, verrous de marque et registre des métiers sont branchés. Points à reprendre dans les
phases moteurs : repli générique des catégories produit, moteur SEO dédié, budgets à valider sur des projets réels.
Phase 3 : **non commencée**.
