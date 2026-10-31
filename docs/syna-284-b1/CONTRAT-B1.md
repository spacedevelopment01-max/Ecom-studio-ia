# B1 — contrat unique des retouches gratuites

Ce contrat complète A2 sans modifier les composants Encre/Plein cadre. Même session, même projet, même fil et mêmes révisions dans les deux modes. Aucun coût associé à l'affichage, à la suggestion ou au mode.

## Disponibilité réelle

Les deux commandes sont raccordées à la **route conversationnelle SYNA réelle**, pas à un démonstrateur parallèle. Le frontend actuel peut envoyer un message, mais **aucun bouton de confirmation gratuite n'est branché dans ses composants**. La recette envoie donc proposition/confirmation par HTTP et ouvre le véritable aperçu natif. Les captures prouvent cet aperçu, pas une nouvelle UI SYNA. L'intégration graphique reste à Claude.

Les drapeaux existants A2 sont conservés. Le nouveau drapeau serveur `STUDIO_CONVERSATION_LOCAL_SITE=1` est **fermé par défaut**. Il n'est ouvert que dans les processus de recette fictifs ; aucune activation de production n'est effectuée. Une demande locale candidate avec drapeau fermé reçoit une erreur gratuite, sans bascule IA.

## Messages reconnus

`POST /api/studio-agent/conversations/:cid` avec la commande `message` existante et ses `revision`, `projectRevision`, `requestId`. La cible vient de la sélection A2 (déjà persistée ou `context` résolu avec le message).

- `Remplace le titre de cette section par “Découvrez notre collection”` ; formes bornées avec `modifie`/`change`, et `Remplace le titre par “…”`.
- `Place cette section au-dessus des avis clients` ; formes `avant`, `après`, `en dessous de`, avec `place`/`déplace`. La destination doit correspondre exactement à un ID natif ou à un libellé/titre unique de la même page. Pas de recherche approximative ni de première section choisie au hasard.

Les paraphrases reconnues comme intention de titre/déplacement mais hors grammaire exacte demandent une précision gratuitement. Elles ne partent ni vers le classificateur ni vers une génération. Les citations multiples, commandes composées ou destinations ambiguës ne sont pas exécutées.

Titre : sélection d'un champ natif `heading`, `title` ou `heading_line1`, de type `text`/`inline_richtext`, texte actuel intégralement lisible par A2 et nouveau texte de 500 caractères maximum. Pour une sélection de section/bloc, un seul champ de titre admissible doit exister. Aucun texte tronqué. Le **champ** est remplacé exactement ; un accent/sous-titre distinct d'un titre composite est un autre champ et reste conservé dans le diff.

Déplacement : section entière d'un gabarit de page, destination unique sur ce gabarit. Groupes globaux partagés, interpages, source/destination verrouillée, masquée, absente ou remplacée par un contenu métier sont refusés. Les droits de structure du forfait restent ceux des opérations conversationnelles natives : gratuit ne signifie pas suppression des restrictions d'abonnement.

## Présentation et confirmation

`ConversationView.localSite`, également conservé dans le reçu du tour et exposé par GET :

```ts
{
  schema: 'syna-local-site-1',
  state: 'ambiguous' | 'proposed' | 'applied' | 'error',
  message: string,
  financialConsent: false,
  costEur: 0,
  providerCalls: 0,
  confirmationRequired: boolean,
  actionsExecuted: boolean,
  proposalId?: string,
  diff?: {before: unknown, after: unknown},
  version?: {id: string, number: number, parentId: string, fingerprint: string},
  previewHref?: string,
  restore?: {endpoint: string, versionId: string, manual: true}
}
```

`proposed` signifie compris + diff prêt + confirmation **gratuite** requise. Aucune version n'est créée à cette étape. `ambiguous` demande une précision. `error` décrit une indisponibilité ou un refus. L'exécution est synchrone : l'interface peut afficher un état en cours pendant sa requête, mais aucun job ou statut fictif de livraison n'est créé.

Confirmation sur la même route :

```json
{
  "action": "confirm-local",
  "proposalId": "identifiant-rendu-par-le-serveur",
  "confirmation": true,
  "revision": 7,
  "projectRevision": 2,
  "requestId": "confirmation_0008"
}
```

Aucun montant, devis ou consentement financier n'est accepté. Le serveur revérifie droits, forfait, sélection A2, version native, empreinte, portée, protections et diff ; proposition valable 15 minutes. Une nouvelle sélection/revalidation A2 invalide la proposition locale. Un titre/déplacement déjà identique ne crée pas une version inutile.

`applied` n'est émis qu'après écriture native et relecture confirmée du résultat et de la version courante. Le `previewHref` est celui de la version acquise. Les anciennes versions restent intactes. La sélection A2 est conservée, **périmée après sa propre modification** : la revalidation explicite A2 est nécessaire avant une nouvelle retouche, ou une nouvelle sélection native.

## Conflits, reçus, restauration

`409 conversation_target_conflict` expose `context` A2 actualisé, avec `financialConsent: false` et `providerCalls: 0`. Revalider le contexte actuel puis demander une **nouvelle proposition gratuite** ; ne jamais réutiliser un ancien accord. Les conflits de révision ou proposition périmée sont également refusés. Une erreur n'annonce aucune écriture réussie.

Même `requestId` et même charge : même reçu historique, pas de seconde version. Deux confirmations distinctes préparées sur la même révision : une seule application. L'accès et le forfait sont contrôlés avant même restitution du reçu. Le numéro/ID d'un reçu désigne une version acquise ; il ne prouve pas qu'elle est toujours la version courante après une édition ultérieure.

`restore` référence le mécanisme **manuel natif existant** `POST /api/projects/:id/theme/restore` avec `{versionId}`. Il crée une nouvelle version et conserve l'historique. B1 n'ajoute ni undo automatique ni nouvel undo élargi ; ne pas exécuter cette restauration silencieusement. La recette vérifie cette route sur les seules fixtures fictives.

Les fils historiques A1 restent en lecture seule. Leur ouverture/sélection n'initialise pas une Préparation et ne les rend pas éligibles à B1. Les messages peuvent être enregistrés, mais `confirm-local` reste refusé. Leur raccordement en écriture demanderait une autorisation et un lot distincts.
