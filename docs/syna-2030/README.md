# SYNA 2030 — phase 1 de la mission #282

Refonte premium de SYNA et simplification de l'interface du Studio : **audit, directions artistiques, maquettes,
prototype et plan de migration**. Cette phase ne modifie **aucun code du Studio** : pas de refonte, pas de fusion,
pas de déploiement, pas de service activé, aucun appel IA payant. **Arrêt ici en attendant l'accord du propriétaire.**

Version étudiée : `main` à `1c406f50` (31 octobre 2026).

## Les livrables

| # | Livrable demandé par #282 | Où |
|---|---|---|
| 1 | Audit avant / après, doublons IA, contrôles manuels, capacités SYNA absentes ou partielles, impacts | [`01-AUDIT.md`](01-AUDIT.md) et l'inventaire complet [`02-INVENTAIRE.md`](02-INVENTAIRE.md) (343 contrôles) |
| 2 | Trois directions artistiques et recommandation | [`03-DIRECTIONS.md`](03-DIRECTIONS.md), maquettes `maquettes/da-1-encre.html`, `da-2-cockpit.html`, `da-3-plein-cadre.html` |
| 3 | Maquettes haute fidélité (13 écrans, états complets) | [`04-MAQUETTES-ET-PROTOTYPE.md`](04-MAQUETTES-ET-PROTOTYPE.md), `maquettes/e-00…e-12` |
| 4 | Prototype de parcours (produits et services) | `maquettes/prototype.html` |
| 5 | Plan de migration par lots, parité, tests, retour arrière, répartition Claude / Codex / propriétaire | [`05-PLAN-MIGRATION.md`](05-PLAN-MIGRATION.md) |
| 6 | Captures ordinateur et téléphone | `captures/` (maquettes et prototype), `captures/avant/` (Studio actuel) |

Pour ouvrir les maquettes : télécharger le dossier `maquettes/` et ouvrir `maquettes/index.html` dans un navigateur
(fonctionne hors ligne : polices et images sont dans le dossier).

## Compte rendu critique

**Ce qui a été vérifié réellement**
- Le catalogue des 65 opérations de SYNA, ses drapeaux et ses rapports de clôture (#211, #276) : lus dans le code.
- 343 contrôles de l'interface relevés fichier par fichier, avec la route ou la tâche réellement appelée.
- Le Studio réel lancé en local avec deux projets de démonstration et le panneau SYNA affiché : 44 captures, 0 erreur
  JavaScript (`scripts/syna282-captures-avant.ts`).
- Trois défauts confirmés dans le code (logo sans devis côté serveur, éditeur publicitaire bloqué, relais OpenAI refusé
  par SYNA).
- Les 13 maquettes, les 3 directions et les 2 parcours du prototype affichés par un navigateur automatisé à 1440 et
  390 px : aucune page plus large que l'écran, aucune image manquante, polices chargées, aucune erreur JavaScript.

**Ce qui n'a pas été vérifié**
- Aucun message envoyé à SYNA, aucun fournisseur réel ou simulé appelé.
- Lecteur d'écran et contrastes mesurés : non faits (structure accessible prévue dans les maquettes).
- Mode sombre des maquettes : écrit, non capturé.
- Les points marqués « à vérifier » dans l'inventaire (surtout les plafonds de dépense côté serveur).
- Aucune comparaison pixel à pixel n'est revendiquée.

**Les limites qui comptent pour la décision**
- **SYNA ne couvre aujourd'hui que 7 contrôles sur 343**, et seulement en simulation, drapeaux fermés. La refonte doit
  donc commencer par l'interface **sans rien retirer**, puis retirer au rythme des preuves de Codex.
- La **discussion de la boutique** (`shop.chat`) fait beaucoup plus que SYNA et porte seule le moteur local gratuit :
  elle doit partir **en dernier**.
- Les métiers de services (carte, réalisations, biens, prestations, réservations) ne sont pas raccordés à SYNA : les
  maquettes montrent un état « non disponible » honnête, pas une promesse.

## Décisions attendues du propriétaire

1. La direction artistique (recommandée : **Encre**).
2. Les maquettes et le prototype (validation ou changements).
3. Le tableau de suppression (`02-INVENTAIRE.md`) et le plan par lots (`05-PLAN-MIGRATION.md`).
4. L'autorisation du lot 0 seul (fondations, aucun changement visible des parcours).
