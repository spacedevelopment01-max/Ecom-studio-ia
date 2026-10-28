# Mission 211 — lot B : dialogue IA, devis et mémoire commune

## État de la livraison

Recette en cours sur branche isolée `codex/211-lot-b-agent-ia`. Ce rapport sera complété avec le SHA du code compilé et les preuves HTTP avant le verdict de livraison. Aucun merge, déploiement, activation ou essai fournisseur réel.

## Dépendances et périmètre

Base observée : main `70204a7ff83eb2382835a27a37a8465c0851a70a` ; #208 ouverte à `a0246c7753bca30e365d57b4cd8202ce95c3f812` ; #210 ouverte à `2a5e96718a8836d288673f520ef10e89c5a55379`. Leur combinaison est limitée à la branche de recette `codex/211-integration-dependances`, arbre `fdcf59ac3e53d08e8a433858c047a234c02a4ffb`. Elle ne constitue pas leur intégration dans main. Les deux PR sources restent intactes.

Graphe : #208 + #210 → B (dialogue) → C (rôles et bornes) → D (outils) → E (composition et QA). F (interface) pourra être livré progressivement depuis B/C, puis raccordé à D/E. Chaque livrable conserve sa PR et ses limites ; aucune autorisation supplémentaire n'est nécessaire pour développer ces branches, aucune fusion n'est autorisée.

Le lot B branche un véritable appel structuré au routeur et aux SDK existants. Le développement ne crée ni modèle, ni clé, ni fournisseur, ni portefeuille, ni worker concurrent. Il ne réalise encore aucun livrable métier. Les spécialistes, outils créatifs, compositions et nouvelle interface appartiennent aux autres lots.

## Changements

- `conversation/intelligence-contract.ts` : contrat de sortie strict, question contextuelle à 2–5 choix dont Autre, citations des faits et des sources internes, propositions séparées des validations. Les outils proposés ne sont pas exécutables par le texte du modèle.
- `intelligence-context.ts` : brief natif, consignes exactes, faits confirmés, paroles libres conservées et fiches internes du Studio. Les anciennes consignes restent dans `Brief.clientStatements` ; sur un projet protégé, elles sont relues dans les tours client immuables sans toucher au brief. Au-delà de la limite de contexte, refus explicite ; aucun tronquage silencieux des acquis.
- `intelligence.ts` et route `/api/studio-agent/conversations/[cid]/intelligence` : devis en % du budget, accord explicite, péremption et révision, route/tarif figés, tâche native `agent.reason`, un seul appel structuré strict, reçu et reprise. Aucun lancement implicite lors de la saisie.
- `intelligence-commands.ts` : choix libres/multiples/inconnus, Pourquoi, retour, correction et acceptation explicite des propositions. Les contraintes antérieures sont conservées. Les réponses exactes du client restent prioritaires.
- `project-billing.ts` et `billing-scope.ts` : avant création du projet, le dialogue peut utiliser un abonnement payé en attente, appartenant au même compte. Choix explicite si plusieurs ; après rattachement, budget natif du projet. Aucun abonnement ni crédit supplémentaire.
- `ai/llm.ts` : devis texte incluant le format structuré réellement envoyé ; contrôle de route avant l'envoi et reprise du reçu sans nouvel appel. `db.ts`, `privacy.ts`, contrat et worker : stockage additif, export limité au propriétaire et coûts techniques masqués au client.
- `preparation/analysis-context.ts` : les consignes supplémentaires du dialogue entrent dans le contexte natif d'analyse. Le compteur historique des essais n'est pas remis à zéro par une question sur le Studio.

Les drapeaux `STUDIO_CONVERSATION_LOT_A` et `STUDIO_CONVERSATION_AI` doivent être activés ensemble dans une recette isolée. Le nouveau drapeau IA est fermé par défaut. Aucun fichier d'environnement du studio réel n'a été lu ou modifié.

## Défaut révélé par les tests, puis corrigé

Le premier double de `llmJson` validait le parcours mais ne traversait pas la réservation native. Le test suivant, qui remplace seulement le SDK, a reproduit trois échecs avant l'envoi : le devis conversationnel omettait le schéma structuré inclus dans la réservation. La correction calcule maintenant l'entrée à partir de la même enveloppe de messages et du même format, avec une borne UTF-8 conservatrice. Les plafonds du compte et du forfait n'ont pas été relevés. Les tests natifs de règlement, reprise et panne incertaine passent ensuite.

## Vérifications et limites

Types exécutés avec `npx tsc --noEmit`. Première régression ciblée : 138 tests réussis ; recette élargie et suite complète en cours. Harnais compilé : `scripts/verify-agent211-build.ts`, ajouté à la CI en conservant tous les contrôles précédents.

Les doubles vérifient plusieurs activités, ambiguïtés, correction du type d'activité, contraintes, isolation, devis périmé, changement de route, budget devenu insuffisant, état avancé protégé, JSON invalide, résultat incertain et récupération sans double paiement. Les appels SDK simulés produisent un usage fictif positif dans une base temporaire : ce montant n'est ni une dépense réelle ni une facture fournisseur.

La validation des citations vérifie des correspondances exactes et le contrat, pas la véracité sémantique générale de toute réponse libre. Le garde-fou contre certaines formulations d'action terminée n'est pas un détecteur universel. La compréhension, la pertinence de la meilleure question et la qualité rédactionnelle d'un modèle réel restent non qualifiées tant qu'un essai distinct n'a pas été autorisé. Les fixtures prédéfinissent les réponses ; elles ne prouvent aucun gain créatif.

Le lot B ne lit pas les URLs ou documents distants et n'analyse pas les photos ; les références sont conservées et ce manque est annoncé. L'ajout de photos avant création n'est pas raccordé. Les anciens projets avancés peuvent recevoir de l'aide sans remplacement de leur préparation validée. Les démos et compositions de Claude, VANS étape 1, Contretemps, médias et budgets réels n'ont pas été touchés.
