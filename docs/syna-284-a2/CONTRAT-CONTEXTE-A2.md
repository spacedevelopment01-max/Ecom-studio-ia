# Contrat A2 pour Encre et Plein cadre

Même conversation et mêmes commandes dans les deux modes. Aucun état de préférence d'interface n'est enregistré par A2. Aucun composant ou fichier graphique n'est modifié.

## Routes et origine des données

`GET /api/studio-agent/conversations/:cid/context` lit le contexte sans l'appliquer. `?directory=1` ajoute le répertoire natif actuel `themeToolContext` : versions, modèles, sections, blocs et clés de champs. Ce répertoire ne constitue pas une autorisation d'opération.

`POST` sur la même route accepte exclusivement le schéma exporté `ContextCommandSchema`. Session, origine, projet propriétaire, abonnement et drapeaux existants sont revérifiés. Les données du navigateur sont des adresses à résoudre ; le serveur lit toujours la source native. Aucun texte DOM, sélecteur CSS, src ou URL externe ne devient une preuve. L'adaptateur pur `contextFromNativePreview` prend une adresse connue du Studio/preview, sans déduction d'après un libellé. Il n'est pas encore branché dans les composants de Claude.

Toutes les commandes demandent `revision` (révision du fil) et `requestId` (8–80 caractères alphanumériques, tiret ou souligné).

| action | Paramètres spécifiques | Effet |
| --- | --- | --- |
| `select-preview` | `native: {projectId, versionId, pagePath, template, section, block?, key?}` | Champ précis avec clé ; sinon section/bloc natif. |
| `select` | `context: {projectId?, tab, target}` | Cible du contrat `ActiveContextSchema` : page, section/bloc, champ, média, produit/variante déjà raccordés. `projectId` reste optionnel pour les anciens clients, mais s'il est présent doit correspondre au projet propriétaire. |
| `navigate` | `tab` | Conserve la sélection, change seulement l'onglet actif. |
| `clear` | aucun | Retire explicitement la sélection. |
| `revalidate` | `expectedReference`, `currentReference`, `confirmation: true` | Adopte la version actuelle de la même identité, seulement après confirmation et sans substitution automatique. |

Exemple d'adresse native de sélection (remplacer les références par celles du répertoire du projet authentifié) :

```json
{
  "action": "select-preview",
  "revision": 4,
  "requestId": "selection_0005",
  "native": {
    "projectId": "project-native-id",
    "versionId": "theme-native-version-id",
    "pagePath": "/",
    "template": "index",
    "section": "native-section-id",
    "key": "heading"
  }
}
```

## Présentation stable

Le résultat `studio-context-presentation-2` est également exposé dans `ConversationView.activeContext.presentation` :

- `projectId`, `conversationId`, `revision`, `activeTab`, `selection` et `reference` identifient le contexte ; ils ne donnent aucune permission.
- `state`: `empty`, `valid`, `conflict` ou `unavailable` ; `needsRevalidation` indique la reprise nécessaire.
- `target` est la résolution observée : identité native, type, page/modèle, section/bloc/champ, version, texte exact autorisé ou référence média/rôle. `canonical` contient `studio-native-target-2`, empreinte de source et provenance `server_native_read`, avec `authorizationGranted: false`.
- Texte natif de 8 000 caractères maximum : valeur entière, sans résumé ni analyse IA. Au-delà : `text: null`, `contentRead: false`, longueur et SHA256 intégral. Jamais un faux « texte exact » tronqué. Un média reste une référence ; aucun jugement visuel n'est inventé.
- `recovery`: action `revalidate` ou `reselect`, `confirmationRequired: true`, `automatic: false`, ancien repère attendu et contexte actuel proposé, dont le nouveau repère `current.reference` doit être renvoyé comme `currentReference` si la même identité est prouvée. Le champ `current.target` permet de présenter le contenu actualisé avant accord.
- `effects` rappelle `businessWrites: false`, `providerCalls: 0`, `toolsAuthorized: false`, et le statut A1 en lecture seule.

Les commandes rendent aussi un `receipt` immuable (`requestId`, `revision`, `action`, `reference`) et `replayed`. Un réessai identique restitue le même reçu, accompagné de la projection **actuelle** de la cible ; il n'augmente pas la révision. Une charge différente avec le même requestId est refusée.

## Conflit et intégration UX

Afficher la cible et son état dans les deux modes. Ne pas transformer un GET ou un changement d'onglet en accord. Une cible périmée reste explicitement signalée ; si elle est supprimée ou son identité/type devient incompatible, demander une nouvelle désignation native. Aucun rapprochement par nom. Si la proposition actuelle change encore après son affichage, son repère ne correspond plus : nouvel affichage et nouvel accord exigés.

L'API contexte retourne `409 conversation_target_conflict` avec `context` pour une sélection historique. Une révision concurrente ou un repère de reprise remplacé est également refusé. Les objets/champs absents, ambigus, cachés ou non raccordés échouent explicitement. Les contenus remplacés au rendu par les onglets métier ne sont pas présentés comme le texte natif du thème ; A2 refuse leur désignation fine tant que leur adaptateur métier n'est pas raccordé.

L'outil exact de thème existant vérifie le repère au devis, à l'accord et dans le worker. Un conflit rend `context` et `actionRecovery: {required: "new-native-quote", reusePreviousConsent: false}`. Une proposition visant un autre champ/page/section est refusée. Une composition globale avec une cible précise est refusée ; sa portée doit être rechoisie explicitement. L'annulation native conserve aussi son repère de contexte. Un reçu déjà acquis reste historique et ne réapplique pas sa version.

## Limites explicites

A2 fournit une API et un adaptateur natifs, pas un nouveau geste de sélection dans le frontend. Les paramètres fins doivent être fournis par l'intégration future de Claude. Les composants actuels gardent leurs sélecteurs historiques et bénéficient de la conservation du contexte lors de la navigation. Aucun changement Encre/Plein cadre, aucune préférence, aucune retouche B1, aucun nouvel outil ni contrôle fournisseur n'est ajouté.

Le contrôle de conflit démontré porte sur l'outil exact de thème déjà existant. Les autres adaptateurs conservent leurs vérifications natives ; A2 ne revendique pas une nouvelle parité de toutes les opérations du Studio. La lecture d'une sélection A1 n'autorise toujours ni préparation initialisée, ni devis métier, ni cognition facturable.
