<!-- Rapport complet de recherche du 21 novembre 2026, tel que rendu ; sujet : Les briques techniques -->

# Les briques techniques d'un agent autonome en 2025-2026 : rapport de recherche

J'ai fait environ 35 recherches et lu une quinzaine de documentations officielles. Aucun fichier du dépôt n'a été modifié. Quand un fait ne vient que d'un blog tiers ou d'un vendeur qui parle de lui-même, je le signale. Trois faits récents comptent pour SINA :
- OpenAI ferme sa plateforme Evals le 30 novembre 2026 et conseille de passer à Promptfoo.
- AutoGen ne reçoit plus que des corrections.
- Les chiffres publiés sur la mémoire sont contestés.

## 1. Les cadres d'agents

| Outil | Ce qu'il fait | Langage | Limites documentées | Qui l'utilise |
|---|---|---|---|---|
| Claude Agent SDK | La boucle d'agent de Claude Code, utilisable dans un programme. Il apporte des outils intégrés, des points d'accroche, des sous-agents, MCP, les autorisations (exécution libre ou accord demandé), des sessions à reprendre ou à dédoubler, les compétences et un plafond de dépense par appel (`maxBudgetUsd`). | TypeScript, Python | Il fait tourner le programme Claude Code et ne sert que Claude. Le coût affiché est une estimation, pas une facture. Il n'existe pas de total par session : il faut additionner soi-même. Le plafond ne compte pas ce qui a été dépensé avant une reprise. Un sous-agent ne se reprend que dans la même session. La connexion par compte claude.ai est interdite pour un produit vendu à des tiers : il faut une clé d'API. | Pas de liste officielle de clients trouvée |
| OpenAI Agents SDK | Agents, passages de relais entre agents, garde-fous, sessions, traces, MCP. Pour l'accord humain, un outil marqué `needsApproval` met la course en pause. L'état s'enregistre (`state.toString()`) et se reprend plus tard (`RunState.fromString`). | TypeScript, Python | Le programme qui reprend doit reconstruire exactement les mêmes agents et les mêmes outils. Il n'y a pas de reprise après panne sans moteur extérieur, d'où l'intégration avec Temporal. | Environ 1,2 million de téléchargements npm par semaine en octobre 2026 (source tierce) |
| Google ADK | Agents, sessions, état, mémoire, documents. Un outil de longue durée (`LongRunningFunctionTool`) met l'agent en pause pour un accord. | Python, TypeScript, Java, Go | Pensé d'abord pour Gemini et Google Cloud. Les versions en mémoire vive ne servent qu'au développement. | Pas de liste trouvée |
| LangGraph | Un graphe d'étapes avec un état enregistré à chaque étape (« checkpointer »). `interrupt()` arrête le travail pour un accord humain. Version 1.0 le 22 octobre 2025. | Python, TypeScript | À la reprise, l'étape interrompue repart du début : ce qui précède `interrupt()` ne doit rien faire d'irréversible. En mode d'enregistrement asynchrone, une panne peut faire perdre un enregistrement. | Klarna, Uber, LinkedIn, Elastic (liste officielle). Environ 2,1 millions de téléchargements npm par semaine (source tierce) |
| Mastra | Agents, déroulés en étapes avec `suspend()` et `resume()`, mémoire (historique, mémoire de travail, rappel par le sens), évaluations. Version 1.0 en janvier 2026 (source tierce). | TypeScript | Il faut configurer un stockage. Les états mis en pause « survivent aux déploiements et aux redémarrages ». Un seul chemin en pause à la fois dans un déroulé imbriqué. | Environ 1,3 million de téléchargements npm par semaine. Un cas Replit (réussite passée de 80 % à 96 % avec Inngest) n'est pas vérifié. |
| Vercel AI SDK 6 | `ToolLoopAgent` fait la boucle d'outils, 20 étapes au plus par défaut. `needsApproval` demande l'accord avant un outil. MCP est stable. Sortie le 22 décembre 2025. | TypeScript | La boucle elle-même n'est pas durable : la durabilité vient d'un outil à part, le Workflow DevKit (`DurableAgent`). | Paquet `ai` : environ 18,4 millions de téléchargements par semaine (source tierce) |
| Pydantic AI | Agents typés. Les outils « différés » arrêtent la course pour un accord, puis une nouvelle course la reprend. Il se branche sur Temporal, DBOS ou Prefect. | Python | L'interface de durabilité a changé d'une version à l'autre. | Pas de liste trouvée |
| CrewAI | Équipes d'agents et déroulés. `@persist` enregistre l'état, `@human_feedback` met en pause (version 1.8 au moins, SQLite par défaut). | Python | Une course qui plante n'est pas relancée d'elle-même, et le raisonnement interne des agents n'est pas enregistré (analyse d'un concurrent). | Pas de liste officielle |
| AutoGen | Conversations entre agents | Python, .NET | Ne reçoit plus que des corrections depuis le 2 octobre 2025. Microsoft dirige les nouveaux projets vers Microsoft Agent Framework (version 1.0 en avril 2026). | En déclin |

Le conseil d'Anthropic : « commencer par appeler directement les interfaces des modèles », car les cadres « ajoutent des couches qui cachent les consignes et les réponses ». Il distingue les déroulés fixés par le code des agents qui décident eux-mêmes de leurs étapes.

## 2. L'exécution durable des longs travaux

| Outil | Ce qu'il fait | Langage | Limites | Qui l'utilise |
|---|---|---|---|---|
| Temporal | La logique de l'agent tourne dans un « déroulé » qui doit toujours se rejouer de la même façon. Chaque appel au modèle est une « activité » enregistrée, jamais refaite quand le déroulé se rejoue. L'accord humain passe par un signal ou une mise à jour. | TypeScript, Python, Go, Java | L'intégration OpenAI Agents en TypeScript est en « pré-version ». MCP n'est pas couvert par la durabilité. Un serveur Temporal ou Temporal Cloud est nécessaire. | OpenAI, Replit, Lovable (communiqué de février 2026). Plus de 4 300 clients payants selon une source secondaire. |
| Inngest | Chaque étape réussie est enregistrée. Après une panne, seule l'étape ratée est refaite : les appels au modèle déjà faits « ne sont ni refaits ni repayés ». `step.waitForEvent()` attend un accord sans occuper de machine. | TypeScript, Python, Go | 4 Mio par résultat d'étape, 32 Mio par course. Une action extérieure qui plante avant d'être enregistrée peut se répéter : il faut une clé d'unicité pour les paiements et les envois. | Pas de chiffre officiel |
| Trigger.dev v4 | Les « jetons d'attente » mettent une tâche en pause jusqu'à un accord, avec un délai possible. Une tâche qui attend ne consomme rien. Version 4 publique en août 2025. | TypeScript | Il faut leur service, ou l'héberger soi-même. | Pas de liste trouvée |
| Restate | Un journal des opérations terminées : à la reprise, ce qui est déjà fait est sauté. Des « promesses durables » servent à l'accord humain, et le délai d'attente survit aux redémarrages. Un module se branche sur Vercel AI SDK. | TypeScript, Java, Python, Go | Il faut un serveur Restate. La plupart des sources viennent du vendeur. | Pas de liste trouvée |
| DBOS Transact | Bibliothèque qui enregistre les étapes dans la base de données elle-même. SQLite par défaut dans le guide de démarrage, Postgres conseillé pour la production. Files d'attente, plafonds de débit, minuteries durables. Module pour Vercel AI SDK. | TypeScript, Python, Go, Java | SQLite est présenté comme réservé au développement et aux essais. | Pas de liste trouvée |
| Vercel Workflow DevKit | Le code se marque `"use workflow"` et `"use step"` ; chaque appel d'outil devient une étape qu'on peut refaire. | TypeScript | Le service géré n'existe que chez Vercel. Un outil sans `"use step"` n'est pas durable. | Mux |

## 3. La mémoire à long terme

| Outil | Ce qu'il fait | Résultats publiés | Limites |
|---|---|---|---|
| Letta (MemGPT) | Une mémoire « de base » toujours sous les yeux du modèle, plus des archives et un historique consultés par outil. Des agents de fond rangent la mémoire. Stockage en Postgres ou SQLite. | 74,0 % sur LoCoMo avec de simples fichiers (août 2025) | Ce sont ses propres mesures, et la conclusion est que « de simples outils de fichiers suffisent » |
| Mem0 | Extrait des faits des conversations ; une version en graphe existe. | Selon son article : +26 % face à la mémoire d'OpenAI, 91 % de délai en moins, plus de 90 % de jetons en moins. Il annonce aujourd'hui 92,5 sur LoCoMo. | Des essais tiers trouvent 61 % à 64 %, et plusieurs personnes disent ne pas retrouver ses chiffres |
| Zep / Graphiti | Un graphe de connaissances qui garde les dates de chaque fait | 94,8 % contre 93,4 % pour MemGPT sur DMR | Zep conteste les mesures de Mem0. La version libre de Zep est abandonnée depuis avril 2025 ; Graphiti reste libre. |
| Mémoire par fichiers (Anthropic) | Claude lit et écrit des fichiers dans un dossier `/memories` que le programme héberge lui-même | Avec le nettoyage du contexte, +39 % sur un essai interne | Le rangement dépend des consignes données au modèle |

Une étude publiée signale que 6,4 % des réponses attendues de LoCoMo sont fausses et que son juge accepte jusqu'à 63 % de réponses volontairement fausses. Aucun classement fondé sur LoCoMo n'est donc solide.

## 4. L'évaluation et l'observation

| Outil | Ce qu'il fait | Limites | Qui l'utilise |
|---|---|---|---|
| Braintrust | Jeux de cas, notes données par du code, un modèle juge ou un humain, comparaison avec une version de référence | Service hébergé et payant | Notion (cité par Braintrust) ; Stripe et Vercel selon des sources tierces |
| Langfuse | Traces, gestion des consignes, jeux de cas, évaluations. Code libre (licence MIT), hébergeable chez soi. | Racheté par ClickHouse en janvier 2026 ; l'assistance pour la version hébergée chez soi est maintenant liée à ClickHouse | Pas de chiffre |
| LangSmith | Traces, juges, comparaison de deux versions sur les mêmes cas, évaluations en continu sur la production | Hébergement chez soi réservé à l'offre entreprise. 5 000 traces gratuites par mois, puis paiement à l'usage. | Klarna |
| Arize Phoenix | Traces au format OpenTelemetry et bibliothèque d'évaluations. Code libre, hébergeable chez soi. | Le service géré (Arize AX) est à part | Pas de chiffre |
| Promptfoo | Essais en ligne de commande, comparaison de modèles, attaques simulées pour tester la sécurité. Licence MIT. | Racheté par OpenAI en mars 2026 ; la neutralité envers les autres modèles est mise en doute | Plus de 350 000 utilisateurs annoncés |
| OpenAI Evals | Jeux de cas, notes, notation des traces d'un agent | En lecture seule ; fermeture le 30 novembre 2026, remplacé par Promptfoo | Aucun |

Ce que recommandent les sources :
- Anthropic a commencé avec environ 20 cas réels. Son juge est un seul appel au modèle avec une grille : exactitude, sources, complétude, efficacité. Il rend une note de 0 à 1 et un verdict réussi ou raté.
- Lire les échanges complets de l'agent avant de croire les notes.
- Pour un service vendu à des clients, mesurer la réussite à tous les essais (pass^k) plutôt qu'à au moins un essai (pass@k).
- Selon l'enquête de LangChain (1 300 équipes), 89 % ont des traces mais seulement 52 % ont des évaluations. La qualité est le premier frein, pour 32 %.

## 5. La gestion des coûts

| Moyen | Ce qui est documenté |
|---|---|
| Cache des consignes chez Claude | Écriture : 1,25 fois le prix normal pour 5 minutes, 2 fois pour 1 heure. Relecture : 0,1 fois (0,05 fois pour Opus 5.5 et Sonnet 5.5). Au moins 512 jetons pour les modèles récents. Se cumule avec la remise du traitement différé. |
| Traitement différé chez Claude | 50 % moins cher. La plupart des lots finissent en moins d'une heure, 24 heures au plus. Résultats gardés 29 jours. 100 000 demandes par lot au plus. |
| Traitement différé chez OpenAI | 50 % moins cher, 24 heures. Il accepte les images (gpt-image-1, 1.5 et mini), jusqu'à 50 000 par lot. Une source dit que GPT Image 2.6 ne l'accepte pas à sa sortie (non vérifié). |
| Plafonds | `maxBudgetUsd` dans le Claude Agent SDK (le résultat le signale par `error_max_budget_usd`). LiteLLM pose des budgets par utilisateur, par équipe et par modèle, mais des réponses en flux continu peuvent y échapper et les modèles de secours peuvent multiplier le coût. |
| Ne rien refaire | Inngest, Temporal, Restate et DBOS ne relancent pas un appel déjà payé. |
| Charger moins d'outils | En écrivant du code qui appelle MCP au lieu de tout charger, Anthropic est passé de 150 000 à 2 000 jetons sur un exemple. |
| Plusieurs agents | Un agent consomme environ 4 fois les jetons d'une conversation, plusieurs agents environ 15 fois. Le système d'Anthropic à plusieurs agents fait 90,2 % de mieux qu'un agent seul. |

## 6. MCP et les compétences

- **MCP** est une manière commune de brancher un agent sur des outils et des données extérieures. La version du 25 novembre 2025 ajoute des « tâches » qui se lancent maintenant et se relèvent plus tard (à l'essai). Anthropic l'a confié le 9 décembre 2025 à l'Agentic AI Foundation, rattachée à la Linux Foundation, fondée avec OpenAI et Block. Vercel AI SDK, le Claude Agent SDK et OpenAI Agents le prennent en charge. Pour SINA, c'est utile pour brancher plus tard des services extérieurs sans réécrire l'agent.
- **Les compétences** sont des dossiers avec un fichier `SKILL.md` (un nom et une description), devenus une norme ouverte le 18 décembre 2025 (agentskills.io). Le modèle ne voit d'abord que le nom et la description, et charge le reste seulement quand il en a besoin. Codex et ChatGPT d'OpenAI les ont adoptées. Dans le Claude Agent SDK, elles se lisent depuis `.claude/skills/` ; le champ `allowed-tools` y est ignoré. Pour SINA, ce serait la forme naturelle de ses cahiers de métier : chargés seulement quand il le faut, donc moins de jetons.

## L'assemblage typique d'un agent autonome de production en 2026, d'après les sources

1. **Un déroulé surtout fixé par le code, avec des parties où l'agent décide**, et la complexité ajoutée seulement quand c'est nécessaire. https://www.anthropic.com/engineering/building-effective-agents
2. **Un modèle qui fait, un autre qui juge** (le schéma « générateur et évaluateur »). https://www.anthropic.com/engineering/building-effective-agents
3. **Un chef d'orchestre qui confie des sous-tâches à des sous-agents**, en sachant que cela coûte environ 15 fois les jetons d'une conversation. https://www.anthropic.com/engineering/multi-agent-research-system
4. **Chaque appel payant est une étape enregistrée**, pour reprendre « là où l'agent était » sans repayer. https://www.inngest.com/docs/learn/durable-agents ; https://docs.temporal.io/develop/typescript/integrations/openai-agents ; https://www.anthropic.com/engineering/multi-agent-research-system
5. **Une clé d'unicité pour toute action irréversible** (paiement, publication). https://www.inngest.com/docs/learn/durable-agents
6. **L'accord humain comme une pause durable** qui n'occupe aucune machine, avec un délai et trois issues : oui, non, pas de réponse. https://www.inngest.com/docs/durable-execution/durable-agents/human-in-the-loop ; https://trigger.dev/docs/wait-for-token ; https://docs.restate.dev/ai/patterns/human-in-the-loop ; https://openai.github.io/openai-agents-js/guides/human-in-the-loop/
7. **La durabilité dans la base de données qu'on a déjà**, SQLite pour commencer et Postgres conseillé pour la production. https://docs.dbos.dev/ai/ai-quickstart ; https://www.dbos.dev/dbos-transact
8. **Une mémoire simple : des fichiers et un état enregistré**, plutôt qu'un service de mémoire dont les chiffres sont contestés. https://www.letta.com/blog/benchmarking-ai-agent-memory/ ; https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
9. **Des savoirs chargés à la demande** (compétences) **et des outils branchés par MCP.** https://code.claude.com/docs/en/agent-sdk/skills ; https://www.anthropic.com/engineering/code-execution-with-mcp
10. **Pour un travail sur plusieurs sessions, un fichier d'avancement et une liste de ce qui reste à faire**, relus au début de chaque session. https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
11. **Des traces de chaque étape et des évaluations sur un petit jeu de cas réels**, notées par un juge et relues à la main, avec comparaison de chaque nouvelle version. https://www.anthropic.com/engineering/multi-agent-research-system ; https://www.langchain.com/state-of-agent-engineering ; https://docs.langchain.com/langsmith/evaluation
12. **Des coûts tenus par le cache, le traitement différé pour ce qui peut attendre (images comprises) et un plafond par travail.** https://platform.claude.com/docs/en/build-with-claude/prompt-caching ; https://platform.claude.com/docs/en/build-with-claude/batch-processing ; https://developers.openai.com/api/docs/guides/batch ; https://code.claude.com/docs/en/agent-sdk/cost-tracking
13. **Des mises en ligne sans couper les travaux en cours** : l'ancienne et la nouvelle version tournent ensemble le temps de la bascule. https://www.anthropic.com/engineering/multi-agent-research-system

**Autres sources :**
- Claude Agent SDK : https://code.claude.com/docs/en/agent-sdk/overview
- Vercel AI SDK 6 : https://vercel.com/blog/ai-sdk-6
- Mastra : https://mastra.ai/docs/workflows/suspend-and-resume
- LangGraph : https://docs.langchain.com/oss/python/langgraph/interrupts
- Fermeture d'OpenAI Evals : https://developers.openai.com/api/docs/deprecations
- Article de Mem0 : https://arxiv.org/abs/2504.19413
- Zep : https://huggingface.co/papers/2501.13956
- Fin d'AutoGen : https://capitalpathai.com/blog/autogen-maintenance-mode-migration
- MCP 2025-11-25 : https://workos.com/blog/mcp-2025-11-25-spec-update
- Rachat de Langfuse : https://www.orrick.com/en/News/2026/01/Open-source-LLM-Observability-Langfuse-Acquired-by-ClickHouse-Inc
- Levée de fonds de Temporal : https://www.businesswire.com/news/home/20260217453156/en/Temporal-Raises-$300M-Series-D-to-Make-Agentic-AI-Real-for-Companies
- Téléchargements npm : https://www.pkgpulse.com/guides/mastra-vs-langgraph-vs-genkit-2026 (source tierce)

**Ce qui n'a pas été vérifié :**
- La date de sortie de Mastra 1.0 et le cas Replit.
- Les chiffres de téléchargements npm.
- Le prix du rachat de Promptfoo.
- La prise en charge du traitement différé par GPT Image 2.6.
- La date de fin de gpt-image-1 donnée par un site tiers (23 octobre 2026).

Le dernier point est à contrôler avant de choisir le modèle d'images.
