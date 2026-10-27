# Recette VANS (#204), étape 1 — fiche d'activité guidée : vérification sur instance ISOLÉE

- Version servie : `46f66bcb40fe12ff859bb730f33c32230cfc2ce4` (`/api/version` : build, production, arbre propre), port local, base temporaire neuve.
- Comptes et projets **fictifs** créés par l'écran normal « Créer ce projet » (aucune donnée du studio de Thomas).
- `d1` : brouillon antérieur à #206 (message figé « Indiquez au moins une prestation. » injecté) : le message n'apparaît plus dès la première ouverture.
- `d2` : devis de « Comprendre mon activité » recalculé sur la nouvelle demande (clé Anthropic **factice**, aucun appel possible ; devis annulé).
- `e1` à `e6` : **SIMULATION**. La compréhension n'a pas été exécutée. Le résultat relevé sur le studio réel dans #204 (résumé, deux prestations, deux questions obligatoires) est injecté dans l'ancien format, puis toutes les actions passent par l'interface : réponse par prestation, rubrique guidée, « À préciser plus tard », changement du bouton principal, réouverture.
- `fiche-*.json` : relevés de l'écran (points bloquants avant et après, bouton de validation, statuts techniques visibles ou non, rubriques après réouverture). `etat-final-*.json` : brief enregistré.
- Appels IA enregistrés dans la base isolée : 0 avant, 0 après.
- Ces preuves ne remplacent pas le nouveau test du projet réel `n68vxls7sba0b8sn`.
