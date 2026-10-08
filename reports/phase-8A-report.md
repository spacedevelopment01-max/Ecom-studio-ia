# Phase 8A — SEO, Copywriting & Blog Engine V2

Date : 8 octobre 2026 · Branche `claude/ecom-studio-ia-platform-8cwl79` · Fusion : **NON** · 8B : **NON COMMENCÉE**

> En bref pour le propriétaire : le studio sait maintenant bâtir une **stratégie SEO** propre à chaque projet,
> rédiger fiches produit, pages de prestation, pages locales, accueil, « À propos », FAQ, métadonnées et
> articles **à partir de vos seules informations**, et vous laisser **tout modifier vous-même** (sans IA) ou
> **en conversation**. Rien n'est inventé : ce qui manque est marqué « [À compléter : …] ».
> **Non vérifié** : la qualité réelle d'une rédaction par l'IA (tout a été testé avec une IA simulée, 0 €) et toute
> performance SEO réelle (positions, trafic). Les mots-clés sont des **hypothèses**, sans volume de recherche.

## 1. Git

- Étape 0 : PR #59 (phase 7A) fusionnée après CI verte (`3a79008`) ; branche synchronisée avec `main` (`ad5e712`).
- `reports/remaining-work.md` : finalisation de l'éditeur vidéo et voix off **reportées** par décision du
  propriétaire (commit `9dcbb50`), non développées.
- Phase 8A : un commit sur la branche, poussé ; **aucune fusion**.

## 2. Audit de l'existant (avant 8A)

| Constat | Conséquence |
|---|---|
| Blog V1 : minimum de 700 mots imposé | pousse au remplissage |
| Mots-clés du blog devinés par l'IA, non étiquetés | risque de présenter une hypothèse comme une donnée |
| Aucune stratégie, aucun regroupement, aucun contrôle de cannibalisation | pages qui se concurrencent |
| Textes de boutique : un seul objet, sans versions ni protection des modifications du client | modifications écrasables |
| Pas de carte des liens internes au-delà des pages de la boutique | liens possibles vers des pages inexistantes |
| SEO Shopify des fiches par métachamps : non vérifié | à ne pas présenter comme fiable |

## 3. Architecture

`src/lib/seo-v2/` (réutilise Project Brain, `adInsight`, `resolveTrade`, la barrière de qualité, Router V2,
`withTrace` / plafond, `lintClaims` / `lintHollow`, `storeLinks`, l'envoi Shopify existant — aucun doublon) :

```
PROJECT BRAIN → intent.ts → keywords.ts + pages.ts → strategy.ts → brief.ts → facts.ts
  → write.ts (local, puis IA via deps.ts) → quality.ts (contrôles locaux + relecture IA + barrière)
  → doc.ts (document en blocs, HTML / Markdown / JSON-LD) → store.ts (versions) → ops.ts / local-edit.ts (édition)
  → links.ts, tech.ts, cms.ts, blog.ts → engine.ts (orchestration, coûts, idempotence)
```

- Tables : `content_documents` (versions de chaque contenu), `content_runs` (mémoire des rédactions).
- API : `GET/POST /api/projects/[id]/content/v2`, `GET/PUT/POST /api/projects/[id]/content/v2/[docKey]`.
- Tâche de fond `content.v2` ; orchestrateur : action `content.v2` → étape `seo`, et l'étape `seo` d'une demande
  libre (« améliore mon SEO ») passe désormais par ce moteur.
- Politiques : `seo_product_v2`, `seo_service_v2`, `seo_category_v2`, `seo_home_v2`, `seo_article_v2`,
  `seo_metadata_v2`, `seo_strategy_v2`, `seo_tech_audit_v2` (version `2026-10-p8a`).
- Intentions de contenu : informer, comparer, expliquer, vendre, rassurer, convertir, présenter un service,
  répondre, trafic local, marque.

## 4. Stratégie SEO

Par projet : objectifs, public, thèmes, pages prioritaires (existantes / prévues), groupes de mots-clés, maillage,
référencement local, contenus à améliorer (articles existants), calendrier éditorial (une idée toutes les deux
semaines), recommandation hreflang, nature des données, points à compléter.
Vérifié par les tests : un plâtrier-peintre (accueil d'abord, une page par prestation, une page locale, objectifs
« être trouvé à Mâcon », « demandes de devis ») et une boutique cosmétique (fiche produit d'abord, objectifs
d'achat et d'information, pas de section locale) ont des stratégies **différentes**. Aucun code propre à un client.

## 5. Mots-clés

- Requêtes principales, variantes, questions, intention de recherche, regroupement par thème, cannibalisation,
  opportunités, langue et pays.
- **Toujours étiquetés « hypothèse sémantique »** : `metrics: null`, aucun volume, CPC, difficulté ni position.
  Interface `KeywordDataProvider` prête pour un vrai fournisseur ; seules ses données rempliraient les métriques.
- Spécialités d'un métier non déclarées par le client → « À confirmer : proposez-vous « bandes à joints » ? »,
  jamais affirmées.

## 6. Fiches produit et pages de collection

Titre, accroche, description, bénéfices (réponses aux objections fournies), **caractéristiques confirmées
seulement**, usage (à compléter s'il est inconnu), FAQ (réponses fournies), livraison / retours **seulement s'ils
sont confirmés**, prix confirmé (stocké en centimes, affiché « 34,90 € »), titre SEO, méta-description, liens.
Données structurées `Product` sans note, avis ni disponibilité. Collection : intro, gamme (liens vers les fiches
existantes uniquement), critères de choix (à compléter), sans copier les fiches.

## 7. Pages de prestation (référence Sébastien Blanc)

Chaque prestation déclarée a sa page ; les spécialités du métier n'apparaissent que si la prestation les contient :
« Plâtrerie et plaques de plâtre » → pose de plaques de plâtre ; « Enduits et lissage » → enduits, lissage des murs ;
« Peinture intérieure » → tarif « sur devis » (saisi). Le déroulé d'une intervention reste « à compléter ».
Vérifié : aucune mention RGE, certification, qualification, années d'expérience, devis gratuit ni délai.

## 8. Blog V2

Sujets tirés de la stratégie (jamais la requête d'une page existante), intention, mot-clé, plan, rédaction,
relecture, vérification des faits, contrôle SEO, liens internes, brouillon éditable — **sans minimum de mots**.
Sans IA, le brouillon est un plan détaillé à compléter (aucun remplissage, aucune étude ni statistique). Le
brouillon rejoint le blog existant (onglet Blog : couverture, publication Shopify, export WordPress). L'IA ne
rédige un article que si le forfait inclut le blog ; un article IA compte une fois dans le quota.

## 9. SEO local

Une seule page locale pour la zone réelle (pas de pages de villes en série), coordonnées saisies uniquement,
`LocalBusiness` sans adresse ni téléphone inventés (vérifié sur le restaurant sans coordonnées), `Service` par
prestation, `FAQPage` seulement pour des réponses réellement affichées.

## 10. Multilingue

Français, anglais, espagnol : chaque langue a ses tournures de questions, intitulés, appels à l'action et
marque des inconnues (« [To complete: …] », « [Por completar: …] ») — adaptation, pas traduction mot à mot.
Extensible en ajoutant un paquet de langue. hreflang : **recommandation**, jamais présentée comme installée.
Limite : l'interface du studio reste FR/EN.

## 11. Éditeur

Dans les onglets **Produit / Activité** et **Blog** (panneau « SEO & textes ») : stratégie, rédaction, liste des
contenus, édition directe (titres H1-H3, paragraphes, listes, questions, boutons ; gras, italique, liens sûrs ;
monter, descendre, ajouter, supprimer), titre SEO / méta-description / adresse avec compteurs 60 / 155, aperçu,
indicateurs SEO, liens suggérés, versions et restauration, export HTML / Markdown / JSON + JSON-LD, retouches en
conversation. Les modifications manuelles **n'appellent jamais l'IA** ; une nouvelle rédaction n'écrase jamais un
texte modifié par le client (nouvelle lignée).
Retouches : « Raccourcis », « Ajoute une FAQ », « Optimise ce titre SEO », mettre en gras, remplacer un mot,
supprimer = **locales et gratuites** ; « Rends plus premium », « Change le ton », « Réécris uniquement ce
paragraphe » = IA **limitée aux blocs ciblés**, refusée si elle ajoute une affirmation non confirmée.
**Test navigateur réel : 12/12** (`scripts/e2e-content-v2.ts`, ordinateur + téléphone, aucune erreur JavaScript),
captures dans `reports/screenshots/content-v2/`.

## 12. Barrière de qualité SEO V2

Contrôles locaux gratuits : affirmations non confirmées, sources / statistiques / citations inventées,
caractéristique fausse (ex. « 50 ml » quand 30 ml est confirmé), information commerciale non confirmée (livraison,
retours, prix, promotion, délai), affirmations à éviter, liens vers des pages inconnues, formules creuses,
sur-optimisation du mot-clé, doublons (avec les autres pages et dans la page), structure (un H1, H2 avant H3),
métadonnées. Puis relecture éditoriale IA sur 10 critères (pertinence, exactitude, utilité, naturel, originalité,
clarté, structure, marque, commercial, intention).
Règles : **jamais FINAL sans relecture** ; jamais FINAL avec une information à compléter ; relecture en panne →
jamais validé ; un texte IA qui invente encore après les reprises est **écarté** et remplacé par le texte local.

## 13. Plateformes (CMS)

| Plateforme | Mode | SEO |
|---|---|---|
| Shopify | connecté (si boutique reliée), sinon export | métachamps : **NON VÉRIFIÉ** ; `scripts/verify-shopify-seo.ts` prêt pour le vérifier sur une boutique de test |
| WooCommerce, PrestaShop | export installable (HTML + métadonnées + JSON-LD) | à reporter dans l'extension SEO / la fiche |
| Wix, Squarespace | kit de reprise | à recopier |

## 14. Coûts et routage

- Forfait Découverte / IA coupée : tout est local, **0 €** (vérifié : aucun appel enregistré).
- Router V2 : métadonnées et petites réécritures « simple » (niveau standard), pages et articles « complexe »
  (niveau fort), relecture « standard ».
- Estimation avant chaque appel, plafond réel par tâche (0,60 € par défaut) : un appel qui dépasserait n'est pas
  envoyé ; reprise **seulement** avec un défaut identifié (blocs et consigne) ; une bonne première version n'est
  jamais refaite ; même brief + mêmes faits = rien refait ni payé ; trace et coût mesuré par appel.

## 15. Tests

- Nouveaux : `tests/seo-v2.test.ts` (21), `tests/seo-v2-engine.test.ts` (13), `tests/benchmark-seo-v2-check.test.ts` (1).
  Couvrent intentions, mots-clés, stratégies, fiches, services, local, blog, métadonnées, maillage, faits,
  inconnues, affirmations, multilingue, barrière, routage, édition, sauvegarde, versions, CMS, absence de
  réécriture inutile, idempotence, coûts, benchmarks simulés A–E, compatibilité.
- Suite complète : **877 / 877** ; TypeScript : OK ; build : OK ; navigateur : 12 / 12.
- Benchmark : `scripts/benchmark-seo-v2.ts` (`--check` gratuit et sans création, `--fixture`, `--project`,
  `--type`, `--language`, `--max-cost`) ; scénarios A artisan, B cosmétique, C high-tech, D restaurant, E SaaS.

## 16. Limites (honnêtes)

- Qualité réelle d'une rédaction IA : **non jugée** (IA simulée). Performances SEO réelles : **non mesurées**.
- Mots-clés : hypothèses, aucune donnée de recherche.
- SEO Shopify des fiches : **non vérifié** ; fiches et pages V2 pas encore envoyées automatiquement à Shopify.
- Audit technique local seulement ; indexation, sitemap, robots.txt, redirections, vitesse non vérifiés.
- Ancien chemin Blog V1 (700 mots minimum) toujours présent à côté du V2.
- Rédacteur local volontairement sobre : sans IA, beaucoup de « [À compléter] » — c'est voulu (rien d'inventé).

## 17. Travaux restants

Voir `reports/remaining-work.md`, section « SEO, Copywriting & Blog Engine V2 (phase 8A) ».

## 18. Préparation 8B (non commencée)

1. `npx tsx scripts/benchmark-seo-v2.ts --check` puis `--fixture A … E --max-cost 1` avec vos clés.
2. Lire les textes produits (rapport JSON + onglets du studio) : c'est la seule façon de juger la rédaction.
3. Boutique Shopify de test : `scripts/verify-shopify-seo.ts` pour confirmer ou infirmer le mécanisme SEO.
4. Selon les résultats : remplacer le Blog V1, brancher l'envoi des fiches V2 vers Shopify, éventuellement un
   fournisseur de données de mots-clés.
