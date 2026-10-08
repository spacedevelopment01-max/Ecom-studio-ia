# PHASE 6A — ADVERTISING ENGINE V2 REPORT

Statut : **6A techniquement terminée. 6B (benchmark réel et validation visuelle) NON commencée.**
Aucun appel payant réel pendant cette phase : rédaction, relecture et images sont simulées dans les tests.
**La qualité réelle des publicités (niveau agence) n'est PAS prouvée** ; elle se jugera sur de vraies créations (6B).

## GIT STATE

- Phase 5A : PR #57 ouverte, CI entièrement verte (« Typecheck, tests, Theme Check, build » + « Image Docker »), état
  `clean`, **fusionnée** dans `main` → `a1fec8c`. Branche de travail resynchronisée sur `main` (avance rapide, aucun
  force-push, aucune opération destructive).
- Phases 4B, 5B : **EN ATTENTE** (voir `reports/remaining-work.md`).
- Phase 6A : commit poussé sur `claude/ecom-studio-ia-platform-8cwl79`. **Pas de PR, pas de fusion.**

## REGISTRE DES TRAVAUX RESTANTS

Créé : `reports/remaining-work.md`. Il liste les chemins d'images encore anciens (création complète, images de
services, publications, vidéos, UGC…) et les chemins publicitaires encore anciens, avec la règle des phases 6, 7, 9
et 10 : réutiliser en priorité l'Image Engine V2. Le studio n'utilise PAS encore V2 partout.

## AUDIT DU MOTEUR PUBLICITAIRE EXISTANT

| Constat | Où | Conséquence |
|---|---|---|
| Textes et plan de test seulement, aucune création visuelle liée aux annonces | `engine/ads.ts` (`draftAds`) | l'annonce et son visuel sont conçus séparément |
| Visuels « publicité » génériques : titre = slogan ou nom du produit, bouton fixe « Découvrir », gabarits tournants | `images.ts` (`generateImageSet`, rôle `ad`) | affiches automatiques interchangeables, sans angle |
| Publicités de services = cartes « booking » | `service-media.ts` (`serviceCardPlan`) | même gabarit pour tous les métiers |
| Aucune barrière propre aux publicités (seulement la relecture de texte `craftLoop`) | — | une création illisible ou générique n'est jamais refusée |
| Règle « attribut personnel » (Meta) inopérante sur les mots accentués : `\b` après « acné » ne coupe pas en JavaScript | `engine/ad-craft.ts` (`PERSONAL`) | « votre acné » passait le contrôle — **corrigé** (bénéficie aussi à l'ancien moteur) |

Réutilisé sans le réécrire : `adPolicyIssues` (règles des régies), `lintClaims` / `lintHollow` (affirmations
non confirmées, formules creuses), `localAdStrategy` et `honestTestBudget` (audiences, structure, budget de test
honnête), `drawProduct` / `fitText` / `drawButton` (composition), Image Engine V2 (images), barrière de la phase 1.

## ARCHITECTURE (nouveau module `src/lib/ads-v2/`)

```
PROJECT BRAIN → INSIGHT → ANGLES → TEXTES → CONTRÔLE DES AFFIRMATIONS → IMAGE (Image Engine V2) → COMPOSITION
→ BARRIÈRE PUBLICITAIRE → reprise ciblée → BIBLIOTHÈQUE → RÉUTILISATION
```

| Fichier | Rôle |
|---|---|
| `insight.ts` | analyse produit / audience depuis le Project Brain : faits confirmés, objections AVEC réponse, preuves disponibles, usages, prestations, zone, ton, premium, offre réelle, manques signalés |
| `angles.ts` | 10 types d'angles ; chaque angle a sa propre matière ; jamais deux fois le même type ni la même matière ; moins d'angles plutôt qu'inventer |
| `copy.ts` | rédaction locale honnête par type d'angle + rédaction IA (un appel pour la série, une reprise ciblée) ; accroche A/B |
| `claims.ts` | contrôle des affirmations (voir plus bas) |
| `platforms.ts` | Meta fil, Meta Stories/Reels, TikTok, Google Display, Pinterest, LinkedIn : formats, zones de sécurité, limites de texte, part de texte, ton ; boutons par type d'activité |
| `compose.ts` | composition publicitaire : 5 mises en page, typographie de la marque, hiérarchie marque → accroche → bouton, contraste garanti, produit réel aux pixels d'origine, mesures (taille de police, contraste, part de texte, zones de sécurité, chevauchement) |
| `quality.ts` | barrière publicitaire : contrôles locaux gratuits + relecture IA (10 critères) |
| `deps.ts` | outils réels (Router V2, Brain « advertising », Image Engine V2) ou simulés |
| `engine.ts` | moteur central, reprises ciblées, réutilisation, plafond |

## ANALYSE DU PRODUIT ET DE L'AUDIENCE

Tout vient du Brain, sans appel IA. Exemple vérifié (sérum) : faits confirmés oui (« 30 ml »), déduits non
(« gel fluide ») ; objection « Est-ce que ça pique ? » **exclue** (aucune réponse fournie) ; preuve « Résultats
visibles en 7 jours » **exclue** (manquante) ; « Fabriqué en France » retenue (disponible) ; marque premium
reconnue. Les manques sont signalés dans le résultat (« à compléter : … »). Produit pour enfants : on parle aux
parents. Aucune promotion sans offre réelle donnée par le client.

## ANGLES ET HOOKS

Démonstration, détail, situation d'usage, problème → solution, objection levée, preuve, savoir-faire / origine,
idée cadeau (produits), proximité (services), offre réelle. Vérifié sur les 5 scénarios : types et matières tous
différents ; un projet sans matière donne moins d'angles (écart signalé) ; aucun « cadeau » pour un service.
Accroche ≤ limite de la plateforme la plus stricte ; seconde accroche (A/B) par concept.

## TEXTES

Accroche → bénéfice concret → preuve → appel. Version locale : construite sur la matière de l'angle, sans rien
ajouter. Version IA (concepteur-rédacteur, niveau fort direct) : un seul appel pour toute la série ; si le contrôle
relève un défaut, UNE reprise avec les défauts exacts ; ce qui reste fautif repasse à la version locale (jamais une
affirmation non confirmée publiée). Bouton choisi dans la liste des régies, selon l'angle ou le mode de contact.

## CONTRÔLE DES AFFIRMATIONS COMMERCIALES

Avant tout visuel : affirmation non confirmée (chiffres, durées…), superlatif invérifiable (« le meilleur »,
« n°1 »), allégation de santé (fatale), fausse urgence (« stock limité »), promotion non configurée, faux avis ou
notes, allégations que le client veut éviter, attribut personnel (fatal), majuscules, ponctuation répétée,
longueurs par plateforme, accroches en double. Chaque défaut a un code et une consigne de correction.

## VISUELS ET COMPOSITION

- Images par l'**Image Engine V2** (réutilisation, recherche gratuite, génération routée, barrière image) : métier
  en reportage pour un service, univers du produit pour une boutique ; une image par orientation et par concept,
  partagée entre les formats.
- Produit : **jamais regénéré** ; le détourage réel est posé tel quel sur la création (pixels d'origine).
- Mise en page choisie selon l'angle (détail → produit au centre ; preuve / objection → typographique ; usage →
  plein cadre ; problème → partagé…). Sans image retenue : création typographique de marque, jamais une image inventée.
- Typographie et palette de la marque (piste de logo retenue), contraste visé 5:1 (4,5:1 garanti), voile sous le
  texte sur photo, zones de sécurité de chaque plateforme, logo discret hors zone d'interface.

## QUALITY GATE PUBLICITAIRE (`ad_v2`, POLICY_VERSION 2026-10-p6a)

FINAL ≥ 7,5 ; planchers : accroche 7, pertinence 7, lisibilité 7, bouton 6,5, marque 6,5 ; fatals : affirmation
interdite, produit transformé, mauvais produit ; bloquants : affirmation non confirmée, règles des régies,
illisible, zone de sécurité, produit recouvert, trop de texte, création générique, concept en double. Sans relecture
IA : PROVISOIRE (choix manuel), jamais FINAL ; relecture en panne : jamais validée.

## CORRECTIONS CIBLÉES

Mise en page (gratuite, aucune image) → accroche (seconde accroche déjà écrite, puis version locale) → visuel (autre
image V2). Au plus 2 reprises ; jamais deux fois la même création ; chaque essai est enregistré (refusé ou à vérifier).

## COÛTS

Un appel de rédaction pour la série (+ une reprise si nécessaire) ; une relecture IA par concept (format principal),
les autres formats contrôlés localement ; images partagées entre formats et réutilisées d'une campagne à l'autre ;
créations validées réutilisées sans rien repayer ; plafond réel par tâche (3 € par défaut), arrêt propre.

## INTÉGRATION

- Project Brain : scope « advertising » (rédaction et relecture), famille du produit et métier.
- Planner / orchestrateur : l'étape « publicités » des plans utilise le moteur V2 (textes + créations ; les annonces
  sont aussi enregistrées au format des brouillons existants) ; action `ads.v2` (intention CREATE_AD) ; livrable
  `ad_v2` suivi par l'étape.
- Router V2 : rédaction `ad_creative` et relecture `quality_control` avec le livrable `ad_v2` (niveau fort direct).
- API : `GET/POST /api/projects/[id]/campaigns/v2` (générer, refuser une création ; offre réelle optionnelle).
- Non fait : la fenêtre « Campagne » de l'onglet Publicités utilise encore `draftAds` (textes seuls) ; pas d'écran
  dédié aux créations V2 (bibliothèque et API).

## BENCHMARK RÉEL PRÉPARÉ (non exécuté)

`scripts/benchmark-ads-v2.ts` : `--check` (gratuit), `--fixture` (artisan, cosmetic, hightech, restaurant, saas),
`--project`, `--platforms`, `--count`, `--offer`, `--audience`, `--objective`, `--max-cost` (plafond réel). Moteur
publicitaire seul ; créations dans la bibliothèque du vrai studio ; diagnostic JSON ; limites d'estimation des coûts
documentées. Un scénario produit sans vraie photo détourée produit des créations sans produit posé (signalé).

## TESTS

- `tests/ads-v2.test.ts` : 17 tests — analyse, angles différents, textes locaux sans affirmation, contrôle des
  affirmations, reprise ciblée de la rédaction, composition (formats, contraste, zones de sécurité, produit non
  recouvert) sur 4 plateformes × 5 mises en page, barrière, scénario cosmétique complet, scénario artisan, réutilisation,
  reprises ciblées, forfait sans IA, absence d'image, plafond, 5 scénarios, intégrations, absence de secret.
- `tests/benchmark-ads-v2-check.test.ts` : `--check` sans clé ni e-mail affichés, rien créé.
- Résultat : voir le statut en fin de rapport.

## CE QUI A ÉTÉ VÉRIFIÉ / NON VÉRIFIÉ

Vérifié (outils simulés) : les décisions — angles, textes, affirmations refusées, mises en page mesurées,
verdicts, reprises, réutilisation, coûts bloqués. **Non vérifié** : la qualité réelle des textes IA et des
créations, la pertinence réelle des images, le calibrage des seuils, les coûts réels. Aucune capture fabriquée.

## LIMITES CONNUES

- Fenêtre « Campagne » encore sur l'ancien moteur ; visuels publicitaires de la création complète et cartes de
  services encore anciens (registre).
- Pas de vidéo publicitaire dans le moteur V2.
- Limites et zones de sécurité des régies à revérifier avant une campagne réelle.

## STATUT FINAL

Tests : 794/794 (95 fichiers) · TypeScript : OK · Build : OK.
