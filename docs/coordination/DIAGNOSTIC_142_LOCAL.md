# Diagnostic local de livraison IA — lecture seule

L’accès distant de Codex au Codespace a reçu un refus du proxy `CONNECT 403`. Aucune trace de l’incident réel n’a été consultée. Ce diagnostic examine les exécutions existantes ; il ne lance ni fournisseur, génération, retry, paiement, migration, mise à jour du studio ou partage de port.

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
