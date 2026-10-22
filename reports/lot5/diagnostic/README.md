# Preuves du diagnostic préalable — lot 5

Ces preuves ne contiennent ni secret, fragment/empreinte de clé, texte client, image source ou résultat de génération. Elles concernent le **Codex courant**, pas la configuration du Codespace.

- [Diagnostic complet et cartographie UI → moteur → modèle](../../../docs/coordination/LOT5_DIAGNOSTIC_ACCES_ROUTAGE.md).
- [État réel des actions 17–20, tests, limites et protocole préparé](../../../docs/coordination/LOT5_RESULTATS.md).
- [runtime.json](runtime.json) : état déclaré par le gestionnaire d’environnement, politique réseau, absence d’identifiants injectés déclarés. `recordedAt` est l’heure de transcription de cette observation, pas l’heure d’un appel fournisseur.
- [network.json](network.json) : six HEAD sans authentification ni génération ; proxy CONNECT 403 avant contact fournisseur, y compris pour l’URL du Codespace. HTTP fournisseur `000` ne signifie pas refus d’une clé.
- `access-worker.json` et `access-next.json` : exécutions distinctes des chargeurs natifs, présence/lisibilité des réglages, routes de base et variantes simple/complexe ; modèle privé hors catalogue masqué. Leurs SHA distinguent code inspecteur/application et checkout dont la configuration est lue.
- `validation.json` : commandes effectivement exécutées, SHA testé, résultats des tests isolés/simulés et limites du contrôle global. Ne contient pas les journaux bruts de configuration.

**0 génération, aucune authentification fournisseur, aucune modification de configuration/base, aucun merge ou déploiement.** Les routes texte résolues ne sont pas des réponses IA reçues. Toutes les routes média utilisables sont nulles dans cette configuration. Les sorties créatives réelles du lot 5 restent à produire après levée des blocages, devis/plafond et intégration.

Le nouveau diagnostic est un CLI de lecture seule, exécuté sans démarrer le worker. Ses tests utilisent uniquement des identifiants/base fictifs ; la vérification de non-divulgation ne calcule qu’une empreinte d’un **identifiant fictif de test**, jamais d’une clé réelle. Les éventuelles empreintes git désignent du code et des preuves publiques.
