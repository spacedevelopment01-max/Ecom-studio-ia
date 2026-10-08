# PHASE 4A — BRAND & LOGO ENGINE V2 REPORT

Date : 2026-10-08 · Branche : `claude/ecom-studio-ia-platform-8cwl79` · Base : `main` = `4c44db6` (fusion de la PR #55,
phase 3B, CI 2/2 verte → **PHASE 3 TERMINÉE**). Aucune vraie API appelée : tous les tests utilisent des fournisseurs
simulés. **4A = TECHNICALLY PASS au mieux : la Phase 4 ne sera validée qu'après le benchmark visuel réel (4B).**

## OLD ENGINE

- Trois pistes FIXES (`produit`, `concept`, `typo`) : les familles de logo étaient codées, pas inventées pour la marque.
- Le symbole était dessiné directement en SVG par le modèle de texte (souvent faible), sans territoire décrit avant.
- Planches de mise en situation faites pour chaque piste validée, AVANT le choix du client.
- Logo complet par l'IA d'images (raster, texte dessiné par l'IA) en parallèle : texte vérifié a posteriori.
- Atouts gardés : rendu local avec vraies polices et texte converti en tracés (SVG exact), nettoyage strict des SVG,
  test de lisibilité 16 / 32 px, monogrammes construits, vectorisation d'images, déclinaisons, charte, barrière Phase 1.

## NEW ENGINE ARCHITECTURE

`src/lib/logo-v2/` :

```
discovery.ts   Project Brain → BrandBrief (aucun appel)
territories.ts territoires : schéma, diversité, refus, clichés ; version du studio sans IA
ai.ts          IA réelle injectable : territoires (1 appel), symbole, exploration image, relecture
construct.ts   construction hybride : vraie police, texte exact, symbole contrôlé, planche de contrôle
quality.ts     Logo Quality Gate V2 (contrôles déterministes + relecture → barrière Phase 1, livrable « logo_v2 »)
engine.ts      DÉCOUVERTE → TERRITOIRES → CONSTRUCTION → BARRIÈRE → REPRISE CIBLÉE / ABANDON → PROPOSITIONS
choose.ts      choix du client → décision Brain → déclinaisons → système de marque
```

Branchements : tâches `brand.logo.v2` et `brand.logo.v2.choose` (orchestrées : intention CREATE_LOGO, plan d'une étape,
Router V2), route `GET/POST /api/projects/[id]/brand/logo-v2` (générer, choisir, écarter), panneau « Directions de
logo (nouveau moteur) » dans l'onglet Marque. L'ancien moteur reste en place (création complète) jusqu'à la 4B.

## BRAND DISCOVERY

`brandDiscovery(p)` lit le Project Brain, sans appel : nom EXACT (accents compris), activité, métier compris (gestes,
objets), positionnement, cible, personnalité, différence et codes concurrents (plateforme de marque), valeurs
**uniquement confirmées**, palette et typographies verrouillées, décisions du client, refus de logo (mémoire 2B →
types de logo exclus), clichés du métier, contexte du scope `logo`. Rien d'inventé : pas de baseline, pas de ligne
métier ajoutée d'office (`descriptor` = null tant que le client ne l'a pas donnée).

## CREATIVE TERRITORIES

- UN appel (directeur artistique, niveau fort) propose n+2 territoires inventés pour CETTE marque. Chaque territoire est
  décrit structurellement avant toute image : concept, pourquoi il convient, type de marque, composition, direction
  typographique (style, graisse, casse, interlettrage, justification), rôle des couleurs, sobriété, construction, idée
  du symbole, ce qui le rend distinctif, ce qu'il faut éviter.
- Types : wordmark, lettermark, monogram, symbol_wordmark, abstract_mark, emblem — choisis selon la marque.
- Aucune direction codée en dur ; la version du studio (sans IA) part d'archétypes généraux et choisit la typographie
  d'après personnalité et positionnement (provisoire, jamais présentée comme finale).

## DIVERSITY

Distance sur 5 axes (type de marque, composition, style typographique, construction, sobriété) : un territoire n'est
gardé que s'il diffère d'au moins **3 axes** de chacun des territoires déjà retenus. Écartés aussi : types refusés par
le client, idée de symbole qui n'est qu'un objet du métier dessiné littéralement (rouleau, truelle, maison…), sauf
traitement abstrait, combiné ou construit. Testé : quasi-doublon et cliché « un trowel dessiné » écartés ; un objet
« stylisé en négatif dans une ligne d'enduit » reste permis.

## LOGO CONSTRUCTION

Hybride, piloté par le code :
- texte : vraie police du studio, rendu converti en tracés (SVG) → nom exact, aucune lettre inventée ;
- symbole (types à symbole seulement) : SVG de l'IA nettoyé par liste blanche, recadré, testé à 16 / 32 px ; pour une
  construction « illustrative », exploration par l'IA d'images puis **vectorisation** (l'image n'est jamais livrée) ;
  monogramme / lettre : construits localement à partir des glyphes ;
- composition, proportions, couleurs (encre lisible en impression), fond transparent, SVG + PNG : code.
- Planche de contrôle (avant tout mockup) : couleur sur fond neutre, noir seul, blanc sur fond sombre, 64 px et 24 px.

## TYPOGRAPHY

Styles disponibles : geometric_sans (Jost, Montserrat), humanist_sans (Work Sans, Karla, DM Sans), grotesque
(Archivo, Space Grotesk, Chivo, Bricolage Grotesque, Inter), high_contrast_serif (Playfair Display), classic_serif
(Libre Baskerville, Cormorant, Lora), contemporary_serif (Instrument Serif, Lora). Une police qui n'a pas un caractère du
nom (« é ») est écartée (opentype). Typographie verrouillée par le client : respectée. Pas de script (aucune police
script fiable disponible : pas de faux manuscrit).

## EXACT TEXT

- Déterministe : le nom de la proposition = nom de la marque, à l'identique ; glyphes présents ; aucune signature.
- Relecture : le texte lu lettre par lettre doit correspondre exactement (accents compris) → sinon `text_unreadable`.
- « Sebastien Blanc » au lieu de « Sébastien Blanc » : **jamais FINAL** (testé, déterministe et relecture).

## QUALITY GATE V2

Nouveau livrable `logo_v2` dans la barrière Phase 1 (POLICY_VERSION `2026-10-p4a`) : FINAL ≥ 8 ; plancher de reprise
5,5 ; 2 reprises au plus ; planchers relevance 7, legibility 7, typography 7, smallSize 6,5, autres 6. Fatal :
ressemblance à une marque connue. Bloquants (jamais FINAL) : `name_mismatch`, `text_unreadable`, `extra_text`,
`cliche`, `amateur`, `small_sizes`, `weak_monochrome`, `claim`. Critères notés par la relecture : relevance,
originality, legibility, typography, composition, balance, memorability, smallSize, monochrome, versatility. Sans IA :
PROVISOIRE au mieux. Contrôles déterministes gratuits avant la relecture (texte, glyphes, petite taille, noir seul,
cliché).

## TARGETED RETRIES

La relecture désigne CE qu'il faut retravailler (`fix.target`) ; seul ce point change :
- typographie → police suivante du même style (ou graisse), symbole gardé ;
- symbole → redessin du symbole avec la consigne précise (historique transmis au Router V2) ;
- composition → horizontal ↔ empilé ; espacement → interlettrage ; couleur → accent ramené à l'encre.
- Rien de pertinent à changer → arrêt (aucune relecture répétée sur une proposition identique, empreinte de la
  proposition). Direction sous 5,5 ou défaut fatal → **abandon** sans nouvelle génération (testé : 3/10 = une seule
  relecture, aucun redessin).

## VARIANTS

Seulement après le choix du client : principal (SVG + PNG), clair (blanc, fond sombre), horizontal, marque réduite,
favicon (déclinaisons existantes), + noir seul (SVG + PNG), empilé si le logo a une marque et n'est pas déjà empilé,
petite taille. Aucune variante décorative. Testé : aucune variante ni planche avant le choix.

## BRAND SYSTEM

Après le choix : typographie du logo → titres de la marque (sauf typographies verrouillées), puis charte (guide et
PDF avec planches de mise en situation) et kit réseaux sociaux via le circuit existant, logo validé (verrou). Les
mockups montrent le logo choisi ; ils n'interviennent jamais dans le jugement (planche neutre, noir et blanc, petite
taille).

## USER CHOICE

- Galerie : seulement les propositions FINALES (territoire, concept, pourquoi, proposition, note, typographie, essais,
  changement ciblé). Essais écartés : diagnostic seulement (nombre et raisons).
- « Choisir ce logo » → décision `marque.logo` dans le Project Brain, logo validé ; une proposition non FINALE ne
  peut pas devenir le logo (testé).
- « Écarter » → refus mémorisé du type de logo (2B) : il ne sera plus proposé.

## ROUTER

Tout passe par le Router V2 : territoires et symbole = tâche `logo_symbol` (niveau fort) ; relecture = contrôle avec
difficulté « complexe » → modèle fort d'emblée (c'est elle qui décide FINAL) ; exploration image = `routeMedia`
(fournisseur capable). Contexte = scope `logo` du Brain. Testé avec une vraie chaîne d'appels (fournisseur simulé) :
`claude-opus-5-5` pour territoires et relectures, raison tracée, `brain_scope = logo`.

## COST CONTROL

- Chaque appel a une raison : 1 appel de territoires ; symbole seulement pour les types à symbole ; exploration image
  seulement pour une construction illustrative ; une relecture par proposition construite ; reprises ciblées bornées ;
  aucun mockup ni variante avant le choix.
- **Plafond réel** (`costCapMicro` de la trace) : avant chaque appel payant (texte ou média), coût déjà enregistré de
  la tâche + estimation de l'appel comparés au plafond ; au-delà, `CostCapReached` : l'appel ne part pas, la série
  s'arrête proprement et garde ce qui est fait (testé : aucune dépense au-delà du plafond).
- Coûts tracés par appel dans `ai_calls` (tâche, modèle, raison, intention, plan, étape, scope Brain).

## BENCHMARK FIXTURES

`tests/logo-v2-fixtures.ts` : artisan (Sébastien Blanc, plâtrier peintre), cosmetic (Sérum Éclat, premium), saas
(Nuvia), restaurant (Chez Lison), product (Atlas Gourde). Testé : les cinq produisent au moins 3 propositions avec au
moins 2 polices différentes (IA simulée), et la version du studio choisit des styles typographiques différents selon
les marques (≥ 3 styles distincts) → pas d'esthétique unique. Aucun cas particulier codé : un test vérifie que le
moteur ne contient ni « Sébastien », ni « plâtrier », ni « Mâcon », ni le nom « Blanc ».

## REAL BENCHMARK SCRIPT

`scripts/benchmark-logo-v2.ts` — à lancer dans votre Codespace :

```
npx tsx scripts/benchmark-logo-v2.ts --user <votre e-mail du studio> --check            # vérifications, 0 €
npx tsx scripts/benchmark-logo-v2.ts --user <votre e-mail du studio> --max-cost 3       # Sébastien Blanc
npx tsx scripts/benchmark-logo-v2.ts --user <…> --fixture cosmetic --max-cost 2         # autres catégories
npx tsx scripts/benchmark-logo-v2.ts --user <…> --project <id> --max-cost 3             # un projet existant
```

Il vérifie les fournisseurs configurés (oui / non, jamais la clé) et l'accès IA du compte ; crée la fixture sous un nom
clairement identifié « [BENCH LOGO V2] … » ; lance **uniquement** le moteur Logo V2 (aucun thème, vidéo, blog,
publicité, publication) avec les vraies barrières ; applique le plafond `--max-cost` (euros, réel) ; affiche et
enregistre le diagnostic coût / qualité (`reports/benchmark-logo-v2-<fixture>-<date>.json`, sans prompt, image ni clé) ;
les propositions s'affichent dans le studio (onglet Marque › Directions de logo) pour les captures de la 4B. Vérifié
ici uniquement le chemin sans clé (arrêt propre) : aucun appel réel possible dans cet environnement.

## TESTS

**746 / 746** (90 fichiers, 0 ignoré). Nouveau `tests/logo-v2.test.ts` (14 tests) + `tests/logo-v2-mock.ts`,
`tests/logo-v2-fixtures.ts` :

| Exigence | Résultat |
|---|---|
| territoires réellement distincts | ≥ 3 axes sur 5 ; quasi-doublon écarté |
| pas de génération avant concept | territoires = 1er appel ; pas de symbole pour logotype / monogramme |
| texte exact obligatoire / nom incorrect rejeté | « Sebastien » refusé (déterministe et relecture) ; glyphes vérifiés |
| cliché bloquant | cliché littéral écarté avant construction ; cliché relevé → jamais FINAL |
| direction faible abandonnée | 3/10 : une relecture, aucun redessin |
| retry ciblé | typographie → police seule ; espacement → interlettrage ; symbole gardé |
| aucune génération répétée inutile | rien à changer → arrêt, pas de nouvelle relecture |
| FINAL uniquement au bon niveau | 8,6 FINAL ; 7,9 non ; typographie 6,5 non ; amateur / cliché non ; ressemblance = abandon |
| variantes et mockups après validation | aucun avant le choix ; tous après |
| choix utilisateur enregistré | décision `marque.logo`, logo validé ; proposition écartée non choisissable |
| refus du Brain respectés | badge refusé → pas d'emblème ; monogramme refusé → pas de monogramme |
| Router V2 utilisé / coût traçable / plafond | modèle fort, raisons, coûts > 0, plafond respecté |
| idempotence | relance de la tâche : aucun appel rejoué |
| 5 catégories / aucun hardcode | ✅ |

## TYPESCRIPT

`npx tsc --noEmit` : **OK**.

## BUILD

`npm run build` : **OK**. Thème non modifié (Theme Check non concerné).

## BEHAVIOR CHANGES

- Nouveau panneau « Directions de logo (nouveau moteur) » dans l'onglet Marque (créer, choisir, écarter ; diagnostic
  replié). Nouvelles tâches `brand.logo.v2` / `brand.logo.v2.choose`, nouvelle route d'API.
- Barrière de qualité : nouveau livrable `logo_v2` (version de politique `2026-10-p4a`) ; politiques existantes
  inchangées.
- Plafond de dépense par tâche disponible pour tout appel (utilisé par le benchmark) ; sans plafond, rien ne change.
- `applyLogo` accepte `noTagline` (le logo V2 n'ajoute aucune signature) ; ancien moteur inchangé.

## KNOWN LIMITATIONS

1. **Qualité visuelle NON prouvée** : seuls des fournisseurs simulés ont tourné. Le verdict viendra de la 4B (vrais
   appels, captures) ; « VISUAL FAIL » reste possible.
2. La création complète (pipeline) utilise encore l'ancien moteur de logo ; le V2 est lancé depuis l'onglet Marque ou
   le script. Bascule prévue après validation visuelle.
3. Palette : le V2 utilise la palette de la marque (rôles par territoire) ; pas de palette propre par territoire.
4. Pas de police script / manuscrite disponible ; pas de dessin de lettres sur mesure (ligatures) au-delà des
   monogrammes.
5. Le contrôle « petite taille » déterministe porte sur le symbole ; le logotype seul est jugé par la relecture.
6. Catégories produit : repli générique du registre des métiers toujours présent (moins de matière métier pour le
   brief d'un produit).

## READY FOR 4B

Oui, techniquement : lancer `scripts/benchmark-logo-v2.ts` dans le Codespace (d'abord `--check`, puis Sébastien
Blanc avec `--max-cost`), regarder les propositions dans le studio, faire les captures (galerie, finalistes, noir et
blanc, petite taille, variantes après choix). Phase 4 validée seulement si le résultat visuel est au niveau.
4B : **non commencée**.
