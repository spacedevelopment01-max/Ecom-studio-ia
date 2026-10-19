# Preuves du parcours complet — fournisseurs simulés

Ces scripts ne sont jamais chargés par le serveur de production. Ils refusent tout `DATA_DIR` dont le nom ne commence pas par `ecs-parcours-test-`.

Le seed crée **quatre comptes, abonnements et sessions fictifs, des paramètres fournisseurs factices et des fichiers de test ; zéro projet**. Chaque projet naît ensuite d’un véritable envoi du formulaire dans le navigateur, avec sa photo. Le worker appelle les orchestrateurs, contrôles de droits, budgets, sauvegardes et gestionnaires natifs ; seules les réponses fournisseurs et les verdicts créatifs sont injectés. Son `fetch` refuse toute communication externe, Pixabay compris. Le navigateur refuse également les requêtes externes.

```bash
DATA_DIR=/tmp/ecs-parcours-test-20261019 npx tsx scripts/parcours-complet/harness.ts seed
DATA_DIR=/tmp/ecs-parcours-test-20261019 STOCK_OFFLINE=1 npx tsx scripts/parcours-complet/harness.ts worker
# Dans un autre processus : serveur Next local compilé, même DATA_DIR et APP_SECRET de test,
# sur 127.0.0.1:18140 ; aucune exposition publique.
PLAYWRIGHT_BROWSERS_PATH=/workspace/work/publications-browser-cache npx tsx scripts/parcours-complet/browser.ts /tmp/ecs-parcours-test-20261019
DATA_DIR=/tmp/ecs-parcours-test-20261019 npx tsx scripts/parcours-complet/harness.ts evidence
```

Le navigateur vérifie produit et service sur ordinateur **et** mobile, avec quatre projets différents : description/photo, analyse, validations, recherche, refus de budget, consentement plafonné, nom unique, trois directions complètes, sélection persistée après fermeture puis validation, démarrage automatique, reprise de trois résultats acceptés vers vingt, listes et compteurs sans rechargement, quatre types de pages, SEO, médias propres au site, vidéo réellement lue et contrat remis au thème. L’achat de recharge utilisé pour les données de test est entièrement fictif : `fund` appelle le crédit natif dans cette seule base et conserve le plafond de 50 % HT. Aucun paiement ni appel IA réel n’a lieu.

L’inférence locale du type de site est enregistrée avant le choix explicite du client, qui est effectué ensuite dans l’interface. La recommandation injectée se limite aux quatre références actives compatibles ; leurs identifiants installables restent absents et leur raccordement est signalé en attente. Le harnais ne présente jamais cette décision manuelle ni cette injection comme une compréhension par une IA réelle. `PARCOURS_DIAGNOSTIC_RESUME=1` est réservé aux précontrôles interrompus, exige un seul `PARCOURS_CASE` et marque sa sortie comme diagnostic, jamais comme réception finale depuis une création neuve.

Le parcours produit sur ordinateur conserve d’abord un contrat prêt, puis vérifie le renouvellement et le changement d’identité : les anciennes données restent enregistrées, deviennent obsolètes, et l’accord déjà consommé ne déclenche aucun nouveau lot. Ce projet termine donc volontairement en attente de revalidation. Les trois autres restent prêts pour la remise des données ; la consommation par les thèmes de Claude demeure explicitement non vérifiée.

Les captures et les quatre vidéos concaténées portent une bannière « fournisseurs et verdicts simulés ». Les PNG des médias et les logos contiennent également une mention de simulation. Ils prouvent les transitions et la persistance, **aucune qualité artistique réelle**.

Ne jamais publier `private.json`, `.app-secret`, la base SQLite, ses sauvegardes ou les sessions. Seules les preuves expurgées de `browser/`, `seed-public.json` et `persistence-evidence.json` peuvent être retenues après vérification.
