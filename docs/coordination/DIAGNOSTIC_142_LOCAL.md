# Diagnostic local de livraison IA — lecture seule

L’accès distant de Codex au Codespace a reçu un refus du proxy `CONNECT 403`. Un premier diagnostic anonymisé a ensuite été transmis en privé et examiné ; le message budgétaire exact reste masqué dans ce premier format. Ce diagnostic examine les exécutions existantes ; il ne lance ni fournisseur, génération, retry, paiement, migration, mise à jour du studio ou partage de port.

Le diagnostic analytique existant `scripts/diagnostic-ia.ts` reste conservé. Ce nouvel outil est limité à l’incident : il ouvre directement SQLite **en lecture seule**, sans importer la couche applicative qui initialise/migre la base. Il contrôle aussi les fichiers, leur décodage et leur association à la galerie publicitaire.

Depuis la racine du dépôt dans le terminal du Codespace :

```bash
git fetch origin codex/142-budgets-suivi-reprise
git show FETCH_HEAD:scripts/diagnostic-livraison-ia.mjs > /tmp/diagnostic-livraison-ia.mjs
node /tmp/diagnostic-livraison-ia.mjs --project-id ID_DANS_URL_DU_PROJET --limit 20 > /tmp/diagnostic-livraison-ia.json
cat /tmp/diagnostic-livraison-ia.json
```

Remplacer `ID_DANS_URL_DU_PROJET` par l’identifiant entre `/studio/` et l’onglet dans l’adresse du navigateur. Autre possibilité : `--project-name "Nom exact du projet"` ; si le nom ne désigne pas exactement un projet, utiliser l’identifiant. `--job-id ID` permet de limiter à une tâche connue. `--since DATE_ISO` réduit la période.

Les sélecteurs de données sont chargés comme le worker, à partir de `.env.local`/`.env` et de l’environnement, sans afficher leurs valeurs. Si le studio utilise des chemins particuliers, `--database CHEMIN` et `--storage-dir CHEMIN` les précisent. Vérifier que ce sont les données du processus actif. Le seul appel HTTP possible est un GET vers la route locale `/api/version` ; `--offline` le désactive.

La sortie ne contient ni noms de projet/client, briefs, textes libres, clés, sessions, URL de médias, chemins ou identifiants clients bruts. Les identifiants sont pseudonymisés par une clé éphémère non exportée. Les coûts sont ceux **enregistrés**, avec leur caractère estimé et les réservations incertaines ; ce n’est pas une validation de facture fournisseur.

Les flags décrivent des observations à examiner, pas une cause automatique. Une référence absente doit notamment être recoupée avec les médias réellement enregistrés et l’affichage. Une correspondance à la requête de galerie ne prouve pas le rendu navigateur ni la qualité créative de l’image.

Ne publier sur GitHub ni la base, `.env.local`, images client ou journaux bruts. Le JSON anonymisé peut être transmis dans la conversation de travail pour poursuivre l’analyse. Les données d’origine ne sont ni modifiées ni supprimées.

Vérifications : trois cas isolés réellement exécutés (base inchangée, confidentialité de la sortie, média valide, sortie vide, média corrompu/étranger, refus de réseau externe). Aucun essai fournisseur réel.
## Complément budgétaire (version 2)

Le premier format masque volontairement le message libre : `errorCategory: budget` ne permet pas de distinguer un seuil de fonctionnement, une réservation refusée ou le plafond d'une tâche. Le format 2 ajoute un `budgetFailureCode` fermé, le plafond numérique enregistré dans la tâche et un état du portefeuille **au moment du diagnostic**, jamais présenté comme le solde historique de l'échec.

Pour cibler la dernière tâche d'un type, ajouter `--job-type image.ai_post --limit 1 --budget-only`. Ce mode ne décode pas les médias, ne relance rien et n'exporte ni nom, identifiant brut, message libre, modèle, clé ou configuration. Le rapprochement du portefeuille suit le rattachement existant de l'abonnement ; il ne crée ni ne rattache un abonnement et ne recalcule aucun budget. Une absence de portefeuille ou d'ancien champ reste explicitement inconnue.

Codes : `AI_MINIMUM_AVAILABLE_GATE` (seuil minimum, conservé), `WALLET_RESERVATION_OR_PRECHECK_REFUSED` (réservation ou précontrôle du maximum), `WALLET_COMMITTED` (budget engagé), `TASK_COST_CAP` et `CREATIVE_CAP_BEFORE_IMAGE` (plafond de tâche), `UNKNOWN_MAXIMUM_COST`, `BUDGET_UNCLASSIFIED`. Le code reconnaît la branche des anciens messages « 100 % » ; il ne certifie pas que l'enveloppe était réellement épuisée. Aucun changement du studio n'est nécessaire pour utiliser ce complément.

Vérification du complément : onze cas isolés (messages FR/EN et codes, ancien schéma, portefeuille correctement rattaché, état actuel distinct de l'historique, lecture seule et confidentialité, aucune requête fournisseur). Le mode court évite de refaire l'inspection des médias.

## Complément de précision (version 3)

La sortie ajoute `failureOriginCode`, en plus du code budgétaire et de l’ancienne catégorie heuristique. Un message d’échec d’image contient parfois le simple pourcentage du budget déjà consommé : cela ne signifie pas que le budget a causé l’arrêt. Le code d’origine distingue les messages natifs connus : absence de modèle compatible avec les références essentielles, tarif non configuré, moteur de conception indisponible, concept absent ou référence source manquante. Il reconnaît aussi les messages exacts du plafond avant conception et du budget temporairement engagé.

Il s’agit de correspondances fermées dans le message natif, pas d’un calcul de l’ancien solde ni d’une déduction depuis le seul mot « budget ». Une origine inconnue reste `UNCLASSIFIED` : le texte libre n’est jamais exporté pour la deviner. Le format reste en lecture seule et le mode `--budget-only` conserve ces codes sans décoder les médias. Les tests supplémentaires vérifient notamment les causes non financières suivies d’un suffixe de consommation ; aucun modèle, nom, secret ou texte client n’est ajouté à la sortie.
