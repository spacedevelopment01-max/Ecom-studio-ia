# Lot 1 : SINA, une seule porte d'entrée

Compte rendu du 15 novembre 2026. Accord du propriétaire : « Oui lance le lot 1 » ; essai réel : « oui pour l'essai »,
plafond 9 €.

## Ce qui est construit

- **SINA ouverte à tous** : `synaAgentEnabled()` est vrai par défaut ; `STUDIO_SYNA_AGENT=0` ne sert qu'à l'arrêter en
  urgence (l'accueil dit alors « SINA revient dans un instant » ; aucune autre façon de créer un projet n'existe).
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
- Après le retrait des anciennes façons et le réglage de l'écran : compilation sans erreur ; suite complète, 4 981
  tests passés, 1 échec (le même `theme211-render-evidence`, lié à la machine).
- Écran regardé en capture sur ordinateur (grand et moyen), en sombre et sur téléphone : SINA en grand, tableau de bord
  à côté, brouillon gardé en changeant d'espace, rien qui déborde. Aucun message n'a été envoyé à SINA pendant ces
  captures (cela aurait été un appel payant).

## Les anciennes façons retirées (accord du propriétaire : « Oui »)

- **L'ancien assistant** (la première conversation) : `orchestrator/conversation/`, `api/studio-agent/`, ses 44
  écrans, ses tâches `agent.*`, ses tests et ses scripts ; 445 fichiers, environ 26 500 lignes.
- **Le Pilote, le formulaire de création, la création en dix étapes et la demande en une phrase** : `tab-pilote.tsx`,
  `workflow-panel.tsx`, `engine/pipeline.ts`, `workflow/`, le formulaire de `home.tsx`, la création par
  `POST /api/projects`, les tâches `pipeline.run`, `workflow.run`, `plan.run`.
- **Les écrans de préparation** et les « 20 créations du départ » (`social-v2/initial*`, tâche `social.initial`), que
  plus rien ne pouvait lancer ; le moteur de préparation reste (SINA s'en sert).
- **L'ancienne interface** (`StudioShell`, sa pastille, la bascule « Interface actuelle »), le tutoriel vidéo du Pilote.
- Ensemble : environ 600 fichiers et 40 000 lignes en moins. Un projet ne se crée plus qu'en parlant à SINA.

Gardé dans le doute, à revoir avec le lot concerné : les fonctions du moteur de préparation sans appelant (lot 3), la
reproduction d'un site existant (`site-reproduce.ts`), le prix « création complète » (lot 6), les outils `pilot.*` de
SINA. Tables devenues sans usage, non supprimées : `workflows`, `agent_conversation_photo_imports`,
`agent_conversation_quotes`, `agent_conversation_turns`, `agent_request_bounds`, `agent_request_jobs`.

## L'écran (sa demande : que le client voie l'évolution en même temps)

- La page d'accueil d'un projet est son **tableau de bord** (`syna-agent/dashboard.ts`, `project-dashboard.tsx`) : ses
  neuf étapes, et sous chacune ce qui existe vraiment (ce qu'il a dit à SINA, sa marque, son angle) ; rien d'inventé.
- **Pendant la création, SINA est en grand au centre** et le tableau de bord se remplit à droite (`syna-focus.css`) ; au
  téléphone, la conversation s'ouvre d'elle-même et le bouton « Projet » montre le tableau de bord.
- Le menu dit « Tableau de bord » et « Angles » ; plus de « Pilote » ni de « Stratégie ».
- Le fil dit ce que SINA note en une ligne discrète, sans vocabulaire interne (« Ta fiche est validée »).

## Dernier essai réel, sur le nouvel écran (accord du propriétaire : « Oui », 1,50 € au plus)

Une cliente inventée, fleuriste en bouquets séchés (marchés et Instagram, sans site), a fait connaissance avec SINA
jusqu'à valider sa fiche : 18 messages, 1,07 € comptés par le Studio.

- Le tableau de bord s'est rempli en direct, avec ses mots (capturé en cours de conversation et à la fin).
- SINA a creusé une réponse vague (« parce qu'ils sont jolis ? ») en partant de sa façon de travailler, retenu « étal »
  au lieu de « stand » et l'a réemployé, conseillé Shopify quand elle a demandé, et annoncé la fin quand elle était
  pressée. Aucune réponse inventée, aucune question posée deux fois.
- **Défaut trouvé et corrigé** : le premier résumé, mis dans la question (limitée à 1 200 caractères), était coupé au
  milieu d'une phrase. Le résumé va maintenant dans le message, la question de validation reste courte, et la limite de
  la question est élargie ; un test le garde. Après correction, la cliente a signalé la coupure : SINA s'est excusée et
  a redonné le résumé complet et juste, que la cliente a validé.
- Arrêtée à la proposition de lancer la marque : rien n'a été créé ni payé au-delà de la conversation.

## Ce qui reste

- Les autres espaces (Marque, Site, Publications…) gardent leurs anciens écrans, avec le vouvoiement : chacun est
  refait avec son lot.
- Les cartes de l'accueil affichent encore « À démarrer » pour un projet créé par SINA (l'état du projet n'était avancé
  que par l'ancienne création) : à régler avec le lot 2.
- La fusion, seulement après « Je fusionne ? » et son oui.
