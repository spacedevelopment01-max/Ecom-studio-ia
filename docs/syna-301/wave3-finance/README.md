# SYNA #301 — dépenses annexes des opérations gratuites

Audit initial sur `fcc2a8818395ce9e97a4a1f3af0cbbc3e8aa1948` : 9 endpoints, 10 opérations, 22 exécutions. SDK sentinelles sans transport ; aucun fournisseur réel ni dépense. Les résultats initiaux ne sont pas des résultats des correctifs.

| PR | Source exacte | Portée | Tests ciblés |
|---|---|---|---|
| #339 | `5516022a63a90aa9aa75aed3d17223453a2c3768` | Précondition kit avant tentative IA | 45 tests / 3 suites |
| #340 | `7857d94448b52f9d8aaa8225848285705a3ae813` | Suggestions Blog gratuites, cache ou local | 39 tests / 4 suites |
| #341 | `e221851f924c4c85090942b2948d92d810b5c6bf` | Stock vidéo sans analyse payante implicite | 23 tests / 4 suites |
| #342 | `0b32a32a7aa474c5d62e60a88af92e95e9c4f72c` | Kit/voix natifs locaux, reprise gratuite conservée | 51 tests / 3 suites puis 21 / 1 suite source finale |
| #343 | `45eea99c1ec4040c40d1d30f37970c997c8e9513` | Détourage interactif sans tri/QC IA payant | 37 tests / 4 suites |

Les tests partagent des suites : aucune somme de tests uniques déduite. Les cinq sources sont distinctes ; le candidat local de combinaison n’est ni publié ni qualifié par un build commun. Les quatre contrôles CI obligatoires, dont la confirmation gratuite, sont conservés.

- Suites de régression partagées : ne pas additionner ces nombres comme tests uniques.
- Preuves de sources distinctes, pas qualification d’une pile intégrée.
- Stock vidéo review/RETRY/checked=false conservé ; aucune qualité fournisseur réelle.
- Détourage local indisponible simulé : original conservé sans cutout validé inventé.
- Contrats de consentement serveur exact création/réécriture Blog non qualifiés malgré popup client et quotas.
- Moteurs initiaux partagés inchangés ; preuves directes ne valent pas recette de tout pipeline.
- CI complète de chaque tête à consulter séparément.

Données fictives uniquement ; aucune modification client, branche Claude, fusion main, activation ou mise en production.
