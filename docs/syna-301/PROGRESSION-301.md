# SYNA #301 — progression vérifiable

Snapshot : matrice canonique **83 opérations**, **25 domaines**, **66 opérations catalogue +17 complémentaires**. Source de convergence `f5e17f1bf5314b85b98a02e91a297f65e707f3fe` ; code applicatif identique au build propre5b. Aucun nouveau test exécuté pour ce tableau.

**45 opérations ont un `PASSE_SCOPE` : cela ne signifie pas45parités complètes.** Les statuts natifs, SYNA et d’exécution ci-dessous sont indépendants. Aucun pourcentage de parité ni total global `SYNA_OK` n’est déduit.

## Exécution

| Statut | Opérations |
|---|---:|
| `BLOQUE_CONNEXION_OU_CONSENTEMENT` | 8 |
| `BLOQUE_GARDE_FINANCIERE` | 3 |
| `CORRIGE_CIBLE` | 3 |
| `CORRIGE_GARDE_SCOPE` | 1 |
| `CORRIGE_LOCAL_FALLBACK_BLOQUE` | 1 |
| `CORRIGE_LOCAL_REGLES_SEULES` | 1 |
| `CORRIGE_MEMO_LOCAL_PAYANT_GARDE` | 1 |
| `CORRIGE_NATIF_NON_RACCORDE` | 1 |
| `NON_RACCORDE` | 8 |
| `NON_TESTE` | 2 |
| `PASSE_NATIF_NON_RACCORDE` | 9 |
| `PASSE_SCOPE` | 45 |

## Fonction native

| Statut | Opérations |
|---|---:|
| `BLOQUE_CONNEXION_OU_CONSENTEMENT` | 11 |
| `NATIF_OK` | 48 |
| `NON_TESTE` | 10 |
| `PARTIEL` | 14 |

## Raccordement SYNA

| Statut | Opérations |
|---|---:|
| `ABSENT` | 30 |
| `NON_TESTE` | 2 |
| `PARTIEL` | 51 |

## Vue par domaine

| Domaine | Opérations | PASSE_SCOPE | Autres états d’exécution |
|---|---:|---:|---|
| C01 | 2 | 2 |  |
| C02 | 1 | 1 |  |
| C03 | 1 | 1 |  |
| C04 | 2 | 2 |  |
| C05 | 2 | 2 |  |
| C06 | 3 | 2 | NON_RACCORDE: 1 |
| C07 | 3 | 3 |  |
| C08 | 2 | 2 |  |
| C09 | 7 | 3 | NON_RACCORDE: 3; NON_TESTE: 1 |
| C10 | 3 | 2 | NON_TESTE: 1 |
| C11 | 2 | 2 |  |
| C12 | 6 | 4 | CORRIGE_CIBLE: 1; PASSE_NATIF_NON_RACCORDE: 1 |
| C13 | 4 | 2 | CORRIGE_NATIF_NON_RACCORDE: 1; NON_RACCORDE: 1 |
| C14 | 7 | 6 | NON_RACCORDE: 1 |
| C15 | 7 | 2 | BLOQUE_CONNEXION_OU_CONSENTEMENT: 1; CORRIGE_CIBLE: 2; CORRIGE_LOCAL_FALLBACK_BLOQUE: 1; CORRIGE_MEMO_LOCAL_PAYANT_GARDE: 1 |
| C16 | 4 | 2 | BLOQUE_CONNEXION_OU_CONSENTEMENT: 2 |
| C17 | 1 | 0 | CORRIGE_GARDE_SCOPE: 1 |
| C18 | 3 | 2 | BLOQUE_CONNEXION_OU_CONSENTEMENT: 1 |
| C19 | 2 | 0 | BLOQUE_GARDE_FINANCIERE: 2 |
| C20 | 1 | 0 | PASSE_NATIF_NON_RACCORDE: 1 |
| C21 | 4 | 3 | PASSE_NATIF_NON_RACCORDE: 1 |
| C22 | 5 | 1 | PASSE_NATIF_NON_RACCORDE: 4 |
| C23 | 4 | 0 | BLOQUE_CONNEXION_OU_CONSENTEMENT: 4 |
| C24 | 5 | 1 | BLOQUE_GARDE_FINANCIERE: 1; CORRIGE_LOCAL_REGLES_SEULES: 1; NON_RACCORDE: 2 |
| C25 | 2 | 0 | PASSE_NATIF_NON_RACCORDE: 2 |

## CI au snapshot

**20 controles complets de PR reussis,9en cours**, sur29tetes. Observation jusqu'au `2026-11-03T00:37:46.961Z` ; aucune CI en cours promue verte.

| Etat | PR |
|---|---|
| Reussie | #303, #304, #305, #306, #307, #308, #309, #310, #311, #312, #313, #314, #315, #316, #317, #318, #319, #321, #322, #323 |
| En cours | #320, #324, #325, #326, #327, #328, #329, #330, #331 |

SHA/runs/checkouts et nombres de tests conserves dans le JSON, sans addition.

## Priorités et limites conservées

- **P0 corrigés sur leur périmètre :** devis/accord logos, cible/version/transaction stock et versions monotones des contenus ; consentements image/photo et planchers de production sociale. Garder les preuves et limites propres à chaque PR.
- **P0 bloqués par sécurité en attendant un devis compatible :** prompt-run payant, nouvelle création native content.v2 payante, retouche publicitaire ai_edit et régénérations créatives concernées. Un refus financier testé sécurise le chemin ; il ne livre pas le parcours payant. Réemploi acquis/local gratuit conservé selon chaque garde.
- **P1 raccordement/UI :** anciens A1 (`recovery.localEdits`) restent PARTIEL ; C22 lecture des demandes dispose du backend sans carte qualifiée ; C15 blog.edit/SEO demandent leurs parcours exacts ; cartes C21/C24 qualifiees ensemble sur les scopes limites de6fd. C21 couvre nom/prix exacts, pas CRUD complet.
- **Qualification UI bornee source6fd/tree1d303 :** Fichiers4/4, Contenus4/4, B1 trois recettes4cas chacune dont17s et2captures supplementaires PASS.0fournisseur reel. Les quatre lignes canoniques restent PARTIEL ; pas CRUD global ni anciensA1.94captures et rapports bruts conserves dans FINAL-REPLAY-SUMMARY.json.
- **Finance :** ne pas transformer les199chemins NON_TESTE de l’inventaire financier en succès. L’audit ciblé9/9 de5b est une preuve distincte bornée ; aucun fournisseur réel ni aucune qualité créative réelle qualifiés.

Sources : matrice `docs/syna-301/MATRICE-PARITE-301.csv`, snapshot `parity301-ci-final-heads.json`, état de coordination `parity301-task-state.json`. Le JSON compagnon conserve leurs empreintes et les compteurs stricts. Aucun fichier du candidat n’a été modifié.

Mise a jour : les sources historiques5b/f5 restent distinctes du replay6fd. Finance9/Social ont leurs manifests propres ; les199autres chemins financiers ne sont pas qualifies par ce replay.
