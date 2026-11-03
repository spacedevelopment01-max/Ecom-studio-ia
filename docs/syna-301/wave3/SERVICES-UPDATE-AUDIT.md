# C21 services.update — audit natif, arrêt avant raccordement

Source exacte `fcc2a8818395ce9e97a4a1f3af0cbbc3e8aa1948` (#338), branche indépendante `codex/parity301-services-audit`, worktree `/workspace/work/parity301-services-audit`. Aucun fichier applicatif modifié, aucune publication/build/recette navigateur. Un fichier de test d’audit temporaire non commité seulement.

**8/8 tests sur2fichiers PASS,8.85s**, dont2cas d’audit et6régressions contenus-api. Log `/workspace/work/parity301-services-audit.log`. Commande : `NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs" ./node_modules/.bin/vitest run tests/parity301-services-audit.test.ts tests/contenus-api.test.ts --maxWorkers=1 --reporter=verbose`. Vrais handlers Next HTTP authentifiés, Request/Response et SQLite fictif ; aucun serveur écoutant ni navigateur. Fournisseur interdit.

## Deux moteurs différents, à ne pas confondre

| Opération | Source native | Version / cible |
|---|---|---|
| services.update, offre et coordonnées | PATCH `/api/projects/:id`, `saveServices`, `projects.business_json` | Profil global, pas de version CAS exposée/exigée, services avec clés et alias ; pas un content-item C21. |
| services.booking / prestations réservables | GET/PUT `/api/projects/:id/prestations`, ou PATCH `/contenus/prestations/prestations` | Source section du thème, version UUID de theme_versions ; modifications synchronisent aussi adresse du profil et certains textes affichés. |
| C21 acquis biens/plats/réalisations | updateContent et adaptateurs dédiés | Item exact/type/id/version timestamp monotone, empreinte complète et pin A2 ; pas prestations/profil. |

Preuve profil exécutée : wallet IA disponible0 ; PATCH200 téléphone fictif puis GET200/relecture persistante. Un second PATCH construit depuis l’ancien profil avec `ifVersion:'stale-not-current'` est également accepté200 et remplace la valeur courante. Aucun job/call/usage/réservation ajouté. Ce champ ifVersion est hors contrat de cette route : sa présence ne crée aucune garde. `saveServices` met simplement à jour business_json/updated_at ; updated_at n’est ni jeton attendu vérifié, ni version monotone de profil garantie.

Preuve réservation exécutée : lecture item `prestations` donne exactement l’ID de version courante du thème ; changement d’adresse200 produit une nouvelle version, puis même ancien ifVersion refuse409 et conserve l’adresse. Ce CAS est réel mais couvre le thème entier, pas une prestation indépendante. Le PUT spécifique `/prestations` appelle savePrestations directement sans ifVersion ; ne pas lui attribuer le CAS de l’API contenus.

Références : `src/app/api/projects/[id]/route.ts` schéma services et branche b.services ; `src/lib/projects.ts:68` saveServices ; `src/lib/contenus/api.ts` adaptateur prestations ; `src/lib/contenus/prestations.ts` readPrestations/savePrestations ; `src/app/api/projects/[id]/prestations/route.ts` PUT. Le target A2 actuel `content-item` autorise seulement biens/plats/realisations (`active-context-contract.ts:6`). Le catalogue services.update reste absent_from_syna ; aucun adaptateur inventé.

## Décision : STOP code conformément au bornage root

Le vrai service n’a pas le même CAS que C21. Réutiliser directement le wrapper description/nom reviendrait à inventer un item/version ou à contourner la source native. Aucun correctif ou adaptateur n’est commencé.

Prérequis à soumettre avant un futur lot : choisir explicitement **profil d’offre** ou **prestation de réservation**, conserver leurs identités distinctes ; définir une version CAS fiable du profil ou un contrat thème/version complet, puis cible A2 et effets natifs transparents. Pour un premier profil borné, un seul champ scalaire exact de coordonnées serait plus petit que renommage d’une liste (route native reconstruit les services sans réémettre leurs clés explicites). Même ce scalaire nécessite un contrat de version et préservation des autres champs, accord gratuit, empreinte complète, transaction/reçu/retry, droits/flag/A1 et tests concurrents avant raccordement.

La preuve téléphone0budget ne vaut pas validation de tous les champs, de toutes les réservations ou du parcours SYNA. Aucun achat fournisseur, client réel, modification Claude/#338, fusion ou déploiement.
