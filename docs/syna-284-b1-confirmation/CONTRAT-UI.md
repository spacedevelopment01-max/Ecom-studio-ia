# Confirmation gratuite B1 — contrat de présentation

Périmètre autorisé : issue #284, commentaire 6547484221. PR empilée sur `codex/syna-284-b1` ; aucun changement des composants `src/components/syna/*`, des thèmes, de la navigation ni des branches de Claude. Aucun B2/B3, fournisseur réel ou déploiement.

## Contrôleur réutilisable

`createLocalSiteConfirmation` ne dépend ni de React ni du CSS. Il reçoit le transport HTTP, la vue courante, les callbacks de vue et de reçu natif, et un stockage de session facultatif. `useLocalSiteConfirmation` adapte ce contrat à React. `ConversationLocalSite` est un présentateur facultatif ; Encre et Plein cadre peuvent réutiliser le hook et fournir leur propre rendu.

La disponibilité vient exclusivement de `ConversationView.localSiteExecution.enabled`, émis par le serveur lorsque les drapeaux B1/A2 sont ouverts. Ce champ est absent pour A1. Les drapeaux restent fermés par défaut. Aucun contrôle de confirmation n'est présenté lorsque la fonctionnalité est fermée ou en lecture seule.

`localSite.scope` présente les données natives déjà validées : projet, version source, template, section, bloc/clé éventuels, chemins et libellés. `diff` conserve les valeurs exactes ; aucun HTML n'est interprété. Les ordres de sections utilisent leurs identifiants natifs et libellés pour rester non ambigus. Aucun nouveau choix métier n'est calculé par le client.

Le marqueur facultatif `localSite.command` provient de la grammaire B1 existante. Même drapeau fermé, une commande gratuite exacte ne propose pas de devis cognitif. Les demandes complexes hors grammaire conservent le parcours explicite historique ; aucune bascule ni requête payante automatique n'est introduite.

## Confirmation et reprise

Le clic explicite envoie uniquement la commande existante :

```json
{"action":"confirm-local","proposalId":"…","confirmation":true,"revision":12,"projectRevision":3,"requestId":"…"}
```

Aucun devis ni consentement financier. Un verrou synchrone bloque les clics concurrents. En cas de réponse perdue, le même corps et le même `requestId` sont conservés en mémoire et, si disponible, en `sessionStorage` propre à la conversation. Le stockage ne contient aucun titre ni contenu métier. Un nouvel essai est explicite ; il n'est jamais automatique. « Vérifier l'enregistrement » effectue uniquement un GET.

Le succès exige `state:applied`, `actionsExecuted:true` et la version native (id, numéro, parent, empreinte). Le callback recharge le projet par le mécanisme existant ; Boutique recharge alors son aperçu réel. Aucun faux résultat optimiste.

Annuler réutilise A2 `select` avec la même sélection valide : la proposition est invalidée côté serveur, la cible reste sélectionnée. Une proposition déjà périmée exige la reprise A2 ; aucune revalidation automatique. Retirer la désignation utilise A2 `clear` dans le parcours activé.

Un conflit expose la référence attendue et la référence actuelle proposées par A2. Le clic explicite `revalidate` transmet les **deux** références, la révision et un identifiant propre. Cette commande invalide la proposition précédente. La cible revalidée est reprise dans le panneau ; le client doit envoyer une nouvelle demande puis donner un nouvel accord. La confirmation ancienne n'est jamais réutilisée pour la nouvelle proposition.

Le résultat ouvre l'aperçu natif et le Studio dans un nouvel onglet, où le bouton Versions et la restauration manuelle existante restent disponibles. Aucun nouvel undo n'est ajouté. Le fil, le brouillon courant, les versions antérieures et `shop.chat` restent gérés par leurs mécanismes existants.

## Recette reproductible

```sh
NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs" npx vitest run tests/local-site-confirmation-client.test.ts tests/conversation284-b1-local.test.ts tests/conversation284-a2-context.test.ts
npm run typecheck
NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs" npm run build
SYNA_UI_PRODUCTION=1 NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs" npx tsx scripts/verify-syna284-b1-confirmation-ui.ts work/preuves-confirmation/ouverte
SYNA_UI_PRODUCTION=1 SYNA_UI_CLOSED=1 NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs" npx tsx scripts/verify-syna284-b1-confirmation-ui.ts work/preuves-confirmation/fermee
```

Chromium est fourni par Playwright ou `CHROMIUM`. Le script refuse le stockage préexistant, crée son DATA_DIR temporaire, ferme les clés fournisseurs, interdit les requêtes externes et supprime ses données après exécution. Les drapeaux ne sont ouverts que dans le processus isolé. Les captures ne contiennent que des projets synthétiques.

La CI ajoute une recette distincte obligatoire au verdict global ; les suites, recettes natives et délais existants sont conservés. Une réussite locale ne remplace pas une CI globale au SHA final.
