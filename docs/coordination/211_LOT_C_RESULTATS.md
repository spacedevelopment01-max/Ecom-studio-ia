# Mission 211 — lot C : rôles à la demande et autonomie bornée

**Lot C technique livré pour revue dans #213. Code réellement compilé et servi propre : `7fafba04f27c92ac6b060f4837203e9db5f6d94c`.** Les commits de preuves ne modifient pas ces sources. Branche `codex/211-lot-c-roles-bornes`, dépendance explicite #212 à `d5012ed62a1df08803455e1d9e9af9e3ba8dee9c`, puis #208/#210. Aucun merge, activation, déploiement, fournisseur réel ou données client.

## Ce qui est développé

Le principal et six spécialistes sont des rôles de la même conversation, pas une équipe de six processus. Une demande explicite peut consulter stratégie/marketing, identité, médias, Site/rédaction, communication/SEO ou qualité. Chaque avis passe par son devis et son accord ; aucune consultation permanente, critique facturante ou génération supplémentaire n’est lancée par la réponse. Le modèle peut proposer au plus deux rôles utiles, sans les exécuter.

Le même brief canonique et ses sources restent autoritaires. Pour un projet déjà créé, chaque rôle reçoit une vue ciblée du Brain natif et conserve son étape dans `task_plans`, via le Planner natif, ainsi que son lien plan/étape dans les traces IA. Avant création, la tâche native de fond suffit : aucun faux projet ni mémoire parallèle. Les réponses, propositions et validations restent séparées.

`STUDIO_CONVERSATION_SPECIALISTS=1` est nécessaire, en plus des drapeaux A/B. Il est fermé par défaut. Le registre, le rôle demandé, l’empreinte du contexte et la route retenue entrent dans le devis serveur. Un rôle inconnu, un devis périmé ou un modèle insuffisant sont refusés ; aucun repli cognitif local.

## Bornes et budget commun

Une intervention client ouvre une enveloppe persistante ; les Pourquoi/retours/synthèses ne remettent pas ses compteurs à zéro. Bornes initiales : **4 tâches/appels maximum**, profondeur **1**, **aucun retry HTTP automatique**, échéance de **15 minutes après la première confirmation**. Le plafond technique global est quatre fois le plafond initial d’un appel ; ce n’est ni un nouveau crédit ni une autorisation de dépenser sans devis. Chaque avis garde son consentement et son plafond individuel. Une nouvelle intervention peut ouvrir une nouvelle demande ; le budget mensuel natif et ses réservations restent communs à toutes.

La réservation native vérifie ces limites dans sa transaction atomique, en plus du budget du compte et du plafond du job. Les engagements en cours, usages réglés et résultats incertains de tous les jobs liés sont additionnés sans double compter les reçus rapprochés. Les appels de critique ou de correction n’ont aucun portefeuille séparé. Les marges natives de 40 % de l’abonnement HT et 50 % des recharges ne changent pas.

Chaque tentative HTTP texte est comptée ; une saturation ne donne pas droit à un autre envoi sous cette autorisation. Un résultat incertain interdit un nouvel avis de la même demande avant vérification. Un sous-appel ne peut changer d’enveloppe ni relever le plafond hérité : le plus petit plafond s’applique. Ce dernier renforcement protège aussi les portées natives existantes ; la suite complète reste verte.

L’échéance interdit un **nouvel envoi** après son expiration. Elle ne coupe pas à l’aveugle une requête fournisseur déjà partie : son résultat peut être conservé après l’échéance. Une interruption incertaine conserve les protections et reçus natifs. La récupération d’un résultat déjà payé reste sans nouvelle génération.

## Fichiers

- `conversation/specialists.ts`, `intelligence-contract.ts`, `intelligence.ts` : rôles, Brain ciblé, devis et étape du Planner.
- `ai/request-bounds.ts`, `ai/trace.ts`, `billing.ts`, `ai/llm.ts` : bornes partagées, tentative HTTP, réservation et plafond imbriqué.
- `db.ts`, `privacy.ts` : rattachements durables aux jobs natifs, export strictement propre au compte, coûts techniques masqués.
- `tests/conversation211-native-billing.test.ts`, `conversation211-request-bounds.test.ts` : SDK simulé, limites, propriété, reprise, coûts et traces.
- `scripts/verify-agent211-build.ts`, CI : recette HTTP du spécialiste depuis le Studio compilé, sans retirer les contrôles précédents.

## Vérifications

Suite complète finale sur les sources figées : **3 589 réussis, 45 ignorés**, 416 fichiers réussis / 1 ignoré, 1 049,03 s. Types, build propre et recette HTTP compilée réussis. Les 118 cas ciblés courants (lots A/B/C) incluent les contrôles ajoutés après la première suite verte : validité affichée du devis et attente du worker avec/sans bornes. Les commandes et périmètres exacts sont dans [verifications.json](preuves-211-C/verifications.json).

La comparaison principale seule / principale + spécialiste prouve un contre deux appels explicitement demandés, un seul budget et des coûts fictifs correctement cumulés. La fixture produit volontairement le même usage pour chaque appel ; elle ne prouve aucun gain d’intelligence, de créativité ou d’efficacité. La cinquième tâche est refusée ; échéance expirée, coût global engagé, profondeur forgée, compte étranger et tentative de relèvement du plafond sont bloqués avant envoi. Une vraie étape native avec portée Brain `qc` est vérifiée dans les tests SDK simulés.

## Limites explicites

Rôle disponible ne signifie pas outil créatif exécuté. Les spécialistes donnent ici des avis structurés ; les outils sont le lot D et la composition Site le lot E. Leur sélection est explicite ou proposée par le principal, jamais une délégation facturante silencieuse. Leur interface est développée séparément dans F.

Aucun fournisseur réel n’a été appelé ou qualifié. La qualité réelle et le choix d’un modèle moins cher équivalent restent non vérifiés ; le niveau cognitif requis est conservé en attendant. Les garde-fous HTTP détaillés de ce lot couvrent le chemin texte utilisé par ces rôles ; les futures actions multimédias devront être raccordées et vérifiées dans leurs incréments D, tout en conservant la réservation native commune. Les compositions de Claude, VANS et les données réelles restent intactes.


## Corrections vérifiées pendant la recette

Le maximum de validité affiché est maintenant le plus petit de la validité du devis et de l’échéance restante de la demande. Les tâches confirmées, y compris celles qui échouent avant envoi, ne sont pas affichées comme encore disponibles. Les compteurs ne sont jamais remis à zéro.

Un accord reçu juste avant l’expiration n’est plus invalidé à tort par l’attente du worker : seul le job serveur lié, créé pendant la validité du devis, dispose de quinze minutes après cet accord pour commencer. Le contexte, la route, les tarifs, les droits, le budget et l’échéance commune sont toujours recontrôlés. Deux cas avec/sans bornes reproduisent une attente de deux minutes après un devis accepté à sa quatorzième minute ; un devis jamais accepté reste périmé normalement.

Le premier harnais de rejet dépendait du dernier type d’activité : après un avis spécialisé sans type d’activité, son faux justificatif n’était pas utilisé. Il a été remplacé par une proposition explicitement rattachée à une source inexistante. Ce correctif de recette n’a pas supprimé de contrôle applicatif. La recette finale l’a réellement rejetée.

## Preuve du build et grille de livraison

[Preuve HTTP complète](preuves-211-C/api-proof.json) · [empreintes des sources](preuves-211-C/sources-testes.json). Le vrai Studio compilé et son worker ont traité les deux démarrages B, puis un avis qualité explicite sur le projet créé. Un seul appel supplémentaire, une vue Brain ciblée, une seule étape du Planner natif, résultat conservé et aucun autre spécialiste lancé. Le rejet final reste `failed` à 15 %, acquis conservés, aucun retry automatique. Quatre appels et 31 648 micro-euros **simulés** ; coût réel 0 €, zéro appel fournisseur réel.

| Point | État |
|---|---|
| Rôles, contexte ciblé, devis, worker et Planner | Terminé techniquement ; SDK/fournisseur simulés dans les tests |
| Bornes communes, réserve atomique, coût idempotent, horloge et propriété | Vérifiés par tests ciblés, suite complète et HTTP compilé |
| Comparaison principal / spécialiste | Nombre d’appels et comptabilité fictive vérifiés ; aucune supériorité créative démontrée |
| Interface des spécialistes | Incrément F complémentaire, pas inclus dans C |
| Modèle réel et optimisation coût/qualité | Non qualifiés, essais réels interdits |
| CI et intégration | CI à terminer, aucune fusion/activation du lot ou de ses parents |

Le studio client reste sur sa version antérieure. Une étape native marquée terminée ici signifie que la réponse structurée est acquise ; elle ne signifie jamais qu’un logo, un site ou une publication a été réalisé par ces rôles d’avis.


## Fidélité des réponses et concurrence — correctifs communs nécessaires à F1

Le parcours navigateur F a révélé qu’une réponse « Je ne sais pas encore » pouvait laisser l’ancienne clientèle active. `clearConversationAnswer` remet les champs et faits actifs à inconnu, sans supprimer les réponses historiques ni les interdits déjà confirmés. Les champs marque/offre et les objectifs de service sont également traités.

Pourquoi, synthèse et réouverture d’une carte n’invalident plus à tort une proposition inchangée. À l’inverse, sa version de fiche source est contrôlée : une modification manuelle concurrente ne peut être écrasée par une ancienne proposition. Le rattachement exact d’un brouillon au projet conserve la provenance de l’acquis, sans nouvelle réflexion facturante. Cinq nouveaux cas couvrent ces corrections. Sources : `answer-state.ts`, `index.ts`, `intelligence-commands.ts`, `intelligence-contract.ts`, `intelligence.ts`, `store.ts`, `conversation211-intelligence.test.ts`.
