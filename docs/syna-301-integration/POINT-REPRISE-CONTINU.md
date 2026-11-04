# #301 — reprise continue (4 novembre 2026)

Mission **non terminée** : consignes #301/6618265320 et #301/6618279690. Continuer immédiatement les lacunes indépendantes ; ne pas attendre une nouvelle consigne ni confondre un lot local vert avec la parité complète.

Base commune Claude #363 : `f25a729036cc03975d6ac7b95eef945a5214177a`. Branche de travail Codex : `codex/parity301-native-section-actions`, tête `8e836499742aa452fd4dd00944f93c0b4e15058f`. Ascendance cumulative, aucune branche de Claude modifiée. Aucun main, déploiement, activation client ou fournisseur réel.

| Lot | PR brouillon | Commit livré | Preuves locales | CI connue |
|---|---|---|---|---|
| Confirmations périmées et changement de projet, cinq transports | #364 | `958a4ddea960f48751b8bd5a567c39f96c7fb674` | 35 nouveaux cas (29 échouaient avant),81 existants, types | run41741979583 ; Docker et confirmation gratuite compilée réussis ; suite complète/thèmes en cours |
| Contraste hérité fond/accent/secondaire/boutons | #365 | `4df1e1ec9c0f90d5882ae580a100a3443c2bb0f1` | 6 nouveaux dont conversation/SQLite,18 couleurs,36 Site/B1, types | run41742511723 en cours |
| Horaires naturels et clarification profil/créneaux | #366 | `413170ac084e92b94bb5b9ed277fcc518a4d0656` | 9 nouveaux (7 échouaient avant),8 sécurité existants, types | run41742901271 en cours |
| Métadonnées SEO exactes gratuites | #367 | `7418d2228ca51a00e82e94c86d9f073962a45af0` | 14 natifs/HTML,42 confirmations,13 Site,16 catalogue, types | run41743805258 en cours |
| Masquer/supprimer et libellés de bouton | #368 | `8e836499742aa452fd4dd00944f93c0b4e15058f` (moteur `bffb67a70602539ac2231fd3015fea223c4eb7c2`) | 15 natifs,49 régressions, types et build ; recette compilée4/4,0 appel IA,0 erreur JS | run41745217253 en cours sur cette tête exacte ; première tête remplacée uniquement par le choix/traçage du navigateur local |

Ne pas additionner ces suites comme des cas tous distincts : plusieurs régressions sont communes. Aucun test supprimé, aucun garde-fou financier affaibli. Les quatre contrôles obligatoires restent requis ; #368 renforce le contrôle existant de confirmation gratuite avec sa recette supplémentaire, sans autoriser les échecs.

## Interfaces et contrats pour Claude

Messages transmis dans #363 : 6618450673 (#364),6618516476 (#365),6618563308 (#366),6618681788 (#367),6618868528 (#368). Claude garde cartes/désignation/aperçus/intégration et recettes **indépendantes** Encre/Plein 1440/390. Aucun composant modifié par ces lots.

- #364/#365/#366 : contrats existants inchangés ; nouvelles formulations horaires, aucune modification des créneaux réservables.
- #367 : `view.localSeo`, schema `syna-local-seo-1`, `localSeoExecution.enabled`, `diff.before/after`, `target` = `/` ou `/pages/handle`, `label`, `field`, `proposalId`. Commandes `confirm-seo` (confirmation:true) et `cancel-seo` avec révisions/requestId. Transport `createLocalSeoConfirmation`, callback `{projectId,versionId,version,receiptId}`. Carte dédiée/verrou partagé à intégrer par Claude ; six cartes existantes à préserver. Thèmes importés, reprise A1 et SEO produits/collections/documents acquis hors contrat actuel.
- #368 : `localSite.command` étendu avec `hide/remove/button`, même carte/transport gratuit. Section entière requise pour masquer/supprimer ; champ de bouton natif unique pour son texte ; destination conservée. Annulation via reçu courant ; forfait basique reste bloqué pour la structure.

## Reprise exacte dans l’environnement

Workspace `/workspace/work/parity301-next-domains`, dépendances partagées avec `/workspace/Ecom-studio-ia/node_modules`. État durable hors Git : `/workspace/work/parity301-continuous-state.json`.

Tous les tests/builds de l’application avec `NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs"`. Aucun secret configuré, aucune donnée client ; Vitest utilise ses bases isolées, recette un répertoire temporaire séparé. Build de production local réussi, journal `/tmp/parity301-sections-build-final.log` ; il correspond au moteur livré #368 (seule la recette/navigateur a ensuite changé).

Recette terminée4/4 : `/tmp/parity301-native-sections-proof.log`, sortie `/tmp/parity301-native-sections-proof/RESUME-SECTIONS-NATIVES-301.json`. Attendre la fin réelle : une ancienne sortie d’échec navigateur peut subsister pendant le nouveau run. Premier essai bloqué par le navigateur Playwright manquant ; Chromium système `/usr/bin/chromium` utilisé ensuite, version et exécutable consignés. Aucun faux succès revendiqué. Captures **locales uniquement**, rapport textuel seul ajouté à la CI. Sur téléphone, désignation reprise depuis une fixture A2 native (limite explicite) ; sur ordinateur, désignation depuis l’aperçu réel. La recette exige : phrase naturelle, diff, pas d’écriture avant accord,17 secondes réelles, une version, disparition dans l’aperçu/base, rechargement sans double écriture, annulation naturelle et restauration exacte.

Résultat : quatre parcours réussis, huit confirmations après17 secondes réelles,0 appel IA/erreur JS/requête hors boucle locale. Rapport versionné `preuves/sections-natives-368.json`. Consigner résultat et limites dans #368/#363 ; suivre les CI des SHA livrés sans relances aveugles. Si un contrôle échoue, lire sa cause réelle et conserver tous les garde-fous.

## Travail restant immédiat

La matrice cumulative est `MATRICE-CONVERGENCE-84.csv` (nom historique conservé ;85 lignes avec l’édition SEO exacte distincte), rendu via `python3 scripts/parity301-render-matrix.py`. Chaque ligne garde manque/responsable/dépendance/critère/preuve. Aucune complète.

Prochaine lacune diagnostiquée : pages natives, source `src/app/api/projects/[id]/theme/pages/route.ts`, moteurs `theme/pages.ts` et `theme/page-templates.ts`. Conserver `assertPageModels` pour ajout/modèles/duplication et les versions/CAS ; choisir un modèle explicite avant création, ne pas inventer des garanties ou publier. Phrase « Ajoute une page « Nos garanties » » encore non raccordée. Aucun code Pages commencé.

Puis images/boutons détaillés/thèmes, services et réservations structurés, stock/variantes, calendrier/brouillons, fichiers/pièces jointes et le reste des lignes. Connexions/consentements : raccorder le parcours explicite sûr, laisser les accès réels interdits documentés et poursuivre les modules indépendants. Ne jamais réétiqueter une ligne en complète sur la seule base d’un test moteur ou d’une CI verte.
