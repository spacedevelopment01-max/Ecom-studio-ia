# Mission 211 — lot C : rôles à la demande et autonomie bornée

Recette compilée en cours avant verdict final. Branche `codex/211-lot-c-roles-bornes`, dépendance explicite #212 à `d5012ed62a1df08803455e1d9e9af9e3ba8dee9c`, puis #208/#210. Aucun merge, activation, déploiement, fournisseur réel ou données client.

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

**38 tests ciblés réussis**. Suite complète : **3 581 réussis, 45 ignorés**, 416 fichiers réussis / 1 ignoré, 683,49 s. Types exécutés. Recette compilée encore en cours à cette rédaction.

La comparaison principale seule / principale + spécialiste prouve un contre deux appels explicitement demandés, un seul budget et des coûts fictifs correctement cumulés. La fixture produit volontairement le même usage pour chaque appel ; elle ne prouve aucun gain d’intelligence, de créativité ou d’efficacité. La cinquième tâche est refusée ; échéance expirée, coût global engagé, profondeur forgée, compte étranger et tentative de relèvement du plafond sont bloqués avant envoi. Une vraie étape native avec portée Brain `qc` est vérifiée dans les tests SDK simulés.

## Limites explicites

Rôle disponible ne signifie pas outil créatif exécuté. Les spécialistes donnent ici des avis structurés ; les outils sont le lot D et la composition Site le lot E. Leur sélection est explicite ou proposée par le principal, jamais une délégation facturante silencieuse. Leur interface est développée séparément dans F.

Aucun fournisseur réel n’a été appelé ou qualifié. La qualité réelle et le choix d’un modèle moins cher équivalent restent non vérifiés ; le niveau cognitif requis est conservé en attendant. Les garde-fous HTTP détaillés de ce lot couvrent le chemin texte utilisé par ces rôles ; les futures actions multimédias devront être raccordées et vérifiées dans leurs incréments D, tout en conservant la réservation native commune. Les compositions de Claude, VANS et les données réelles restent intactes.
