# Lot 1 : SINA, une seule porte d'entrée

Compte rendu du 15 novembre 2026. Accord du propriétaire : « Oui lance le lot 1 » ; essai réel : « oui pour l'essai »,
plafond 9 €.

## Ce qui est construit

- **SINA ouverte à tous** : `synaAgentEnabled()` et la coquille SINA sont ouvertes par défaut ; les variables
  `STUDIO_SYNA_AGENT=0` et `STUDIO_SYNA_SHELL=0` ne servent qu'à revenir en urgence aux anciens écrans.
- **Sa réflexion** : le modèle le plus fort à toutes les étapes et pour tous les forfaits (un seul endroit :
  `src/lib/syna-agent/models.ts`) ; elle réfléchit plus longtemps quand elle présente un résultat, explique un échec,
  répond à un client mécontent ou juge un site monté ; ses trois aides (`sina.conversation`) sont allumées par défaut.
- **Plus de réponse sans IA** : le moteur local de l'étape 0 (`local-step.ts`) et le réglage `syna.replies` sont retirés.
- **Faire connaissance** (`journey.ts`, `tools/start.ts`) : des sujets à apprendre (`TOPICS`) au lieu de quinze
  questions dans un ordre imposé ; SINA choisit sa question, creuse, lit seule le site donné ; d'autres sujets selon le
  métier (`extraTopics`), proposés jusqu'au résumé ; notes libres (`start.note`) ; rien n'est enregistré que le client
  n'ait dit (`unsaid`) ; le mot qu'il corrige est retenu (`client.wording`, branché sur `addWordingRule`).
- **Le parcours en neuf étapes** pour le client (`PHASES`, `phaseOf`, `phaseStatus`) ; les repères internes 0 à 13
  restent pour l'instant et seront fondus lot par lot.
- **Consignes** (`prompt.ts`) réécrites : qui est SINA, comment elle parle, comment elle travaille, le parcours ; sans
  notes d'essais ni exemple tiré d'un projet d'essai.

Hors de ce lot, donc encore à faire dans les lots suivants : les exemples d'essai dans les consignes de la marque, du
site et des publications ; les étapes 9 à 13, toujours fermées ; les consignes des étapes 6 à 13 (`STEP_GUIDES`).

## L'essai réel (SINA seule, Claude ne joue que les clients)

Trois clients inventés, trois Studios privés d'essai, compte fictif au forfait à 89 €. Page des trois conversations :
https://claude.ai/artifact/MhdrSDLbAxyWsWB7u2eDBy

| | La boutique (bougies) | Le prestataire (plombier) | Le projet flou (gâteaux et ateliers) |
|---|---|---|---|
| Messages du client | 16 | 20 | 23 |
| Appels à l'IA | 20 | 21 | 24 |
| Coût compté par le Studio | 0,87 € | 1,03 € | 1,04 € |
| Résumé validé par le client | oui | oui | oui |
| Réponse inventée (refus du garde) | aucune | aucune | aucune |
| Question posée deux fois | aucune | aucune | aucune |

Total : 2,94 € pour 65 appels, soit environ 0,05 € par réponse de SINA.

Ce qu'elle a bien fait : mot corrigé retenu et réemployé (« verrines ») ; questions de métier (déroulé d'un chantier,
assurances, horaires, délai de commande, allergies) ; une réponse vague creusée (« Creusons un peu ») ; conseil sans
imposer (pas de plateforme de vente à qui prend ses commandes par message) ; changement d'avis suivi (le nom gardé
finalement) ; arrêt quand la cliente veut finir.

Corrigé après la première cliente, et plus revu ensuite : nom d'entreprise demandé à tort (garder ses photos faisait
passer le projet en « refonte ») ; résumé trop tôt, avec un seul sujet en plus ; « je n'aime pas… » pris pour une
plainte, d'où une relecture inutile ; deux messages à la suite.

Reste à améliorer : un avis non demandé et non prouvé de temps en temps (« c'est exactement ce qui marche sur
Facebook ») ; une réponse vague acceptée sans creuser (« des mamans surtout ») ; la première conversation n'a pas été
rejouée après les corrections.

## Vérifié

- Compilation sans erreur ; 719 tests de SINA passés.
- Suite complète après le premier changement du lot : 6 829 tests passés, 1 échec (le test
  `theme211-render-evidence`, qui impose un navigateur absent de la machine de travail ; il appartient à l'ancien agent).
  Après l'ouverture à tous, les neuf étapes et les corrections de l'essai : compilation et tests de SINA relancés, pas
  toute la suite.
- Écran regardé en capture sur ordinateur et sur téléphone (parcours en neuf étapes, SINA à droite).

## Ce qui reste pour finir le lot (avec l'accord du propriétaire)

1. Retirer les anciennes façons de ce lot : la première conversation (`orchestrator/conversation/`,
   `api/studio-agent/`), le Pilote, le formulaire de création et les écrans de préparation, leurs tests, leurs scripts
   de recette et leurs étapes dans les contrôles automatiques.
2. L'écran : SINA en plus grand d'un côté, le tableau de bord du projet qui se remplit en direct de l'autre (sa
   demande : que le client voie l'évolution en même temps) ; les anciens noms du menu (« Pilote », « Stratégie »).
