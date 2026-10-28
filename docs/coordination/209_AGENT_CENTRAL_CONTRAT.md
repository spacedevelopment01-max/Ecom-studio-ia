# #209 — Contrat de conversation pour l’interface, version 1

Lot A technique, **sans refonte visuelle ni remplacement du démarrage servi**. Proposition d’interface pour Claude après validation du propriétaire ; aucun lancement automatique de Claude. Référence : [issue #209](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/209).

## Architecture et activation

`src/lib/orchestrator/conversation/` est un adaptateur de conversation de l’orchestrateur existant, pas un second orchestrateur. Il appelle `understand` (Intent Engine), la fiche de préparation, ses versions et son devis natif. Il ne possède ni planner d’exécution, routeur de modèles, worker, facturation ou moteur de création parallèle.

**Fermé par défaut**, côté serveur : `STUDIO_CONVERSATION_LOT_A=1` ouvre seulement ses nouvelles routes sur une instance de recette. Variable absente = 404 ; rien n’est ajouté à l’accueil, au formulaire, au Pilote ou à un autre onglet. Ne pas activer sur le studio réel avant revue et accord de mise en service. L’API n’a aucune commande `execute`, `approve`, `publish`, `delete` ou d’achat.

Deux tables nouvelles : `agent_conversations` (propriétaire, projet facultatif unique, révision, métadonnées), `agent_conversation_turns` (requête et reçu immuables, identifiant idempotent unique). Un seul brouillon avant projet par compte. Aucun projet/abonnement créé par ces tables. Export de données du compte étendu aux échanges, avec filtrage propriétaire et caviardage natif ; aucun effacement automatique activé.

**Source unique des données** : avant rattachement, le brouillon contient un `Brief` natif ; après, ce champ est retiré et les vues lisent `preparation.current`. Chaque changement passe par `commitState` et conserve `preparation.version.N` dans la mémoire existante. Réponses, corrections, inconnues et prestations portent leur provenance client. L’historique de conversation mémorise le tour et la révision native, sans recopier une décision courante dans le Brain : une restauration/modification manuelle reste donc autoritaire. L’approbation native, plus tard et séparément, publie l’offre et les consignes dans le Brain des moteurs. **Le chat ne valide jamais l’étape 1.**

## Routes

Toutes les routes utilisent les sessions du Studio (`requireUser`), `handle`, le contrôle d’origine et les réponses privées `no-store`. Le rôle et le compte ne viennent jamais du JSON. Compte administrateur : mêmes droits, aucun accès aux projets d’autrui.

| Route | Méthode et effet |
|---|---|
| `/api/studio-agent/draft` | GET : brouillon courant ou null, sans écriture. POST `{}` : reprend/crée l’unique brouillon du compte. Abonnement payé en attente de projet requis, aucun droit créé pour Découverte. |
| `/api/studio-agent/conversations/{cid}` | GET : vue actuelle, résumé et 40 tours ; `?before=N` lit les précédents, sans modification. POST : commande validée ci-dessous. |
| `/api/projects/{id}/conversation` | GET : conversation du projet ou null. POST `{}` : ouvre la conversation d’un projet nouveau vide ou reprend sa préparation existante. POST `{draftId,draftRevision}` : rattache le brouillon au projet du même propriétaire, déjà créé via l’API native. |

Projet historique sans préparation mais déjà doté d’un produit, média, tâche ou thème : migration non raccordée, refus explicite sans création d’une préparation concurrente. Préparation analysée, validée, aval engagé ou tâche en cours : données consultables, **outils de modification signalés indisponibles**, corrections dirigées vers le parcours existant. Ceci préserve notamment la recette #204/#208 et ses analyses acquises.

## Commandes de tour

Enveloppe obligatoire pour chaque POST de conversation :

```json
{
  "revision": 2,
  "projectRevision": null,
  "requestId": "operation-client-unique-0001",
  "action": "answer",
  "question": "goals",
  "choices": ["quote", "booking", "other"],
  "text": "Présenter mes réalisations avant le contact",
  "unknown": false
}
```

`projectRevision` vaut null pour un brouillon, sinon la révision lue dans la vue. Les champs inconnus sont refusés ; le client ne fournit ni rôle, propriétaire, budget, autorisation, plan à exécuter ou nom d’exécuteur.

| `action` | Champs spécifiques et effet |
|---|---|
| `message` | `text` (1–8 000 caractères), éventuellement `referenceUrls` / `photoIds`. Première description conservée mot pour mot. Intent Engine sans fournisseur réel ; les actions reconnues ne sont pas exécutées. Une réponse libre peut compléter la question actuelle. |
| `answer` | `question`: `business`, `goals`, `target` ; `choices` (identifiants de la carte), `text` libre ; ou `unknown:true` seul. Choix simple ou multiple selon carte ; « other » exige une précision. Aucune invention si type incertain. |
| `edit` | `field`: description, target, offerName, brandName, constraints, customization, process, quote ; `value`. Correction ciblée de la fiche, limites natives, rien de tronqué. |
| `edit-services` | `items:[{name,description}]`, au plus 20 prestations. Seuls les textes du client sont repris ; pas de prix/durée ajoutés. |
| `back` | `question` facultative : réouvre une question précédente avec sa réponse ; ne l’efface pas avant la nouvelle réponse. |
| `explain` | Explique l’utilité de la question, sans la considérer comme répondue. |
| `summary` | Relit le résumé depuis les données actuelles. |
| `prepare-action` | `tool:"understand-offer"`, `correction` facultative. Demande le devis natif seulement ; pas d’analyse, tâche, réservation ou débit. Préconditions natives conservées. |

Même `requestId` + même commande = reçu initial, pas de nouvel effet ni nouveau classement. Même identifiant pour un autre contenu = 409. Révisions périmées = 409 ; recharger les données, ne pas réémettre automatiquement une correction sur une fiche plus récente. Après un rattachement, un ancien reçu peut décrire son ancien état : GET fait foi pour l’état actuel.

## Vue et cartes

Schéma `studio-conversation-1`, `mode:local` (ou `simulation` pour les injections de test serveur), `revision`, `projectRevision`, `progress` (`describe`, `clarify`, `collect`, `review`), `message`, `summary`, `question`, `correctionFields`, `readOnlyReason`, `tools`, `action`, `creation`, `history`, `historyBefore`.

- Carte question : clé, titre, explication `why`, 2–5 choix avec identifiants, `multiple`, `allowFreeText:true`, `allowUnknown:true`, réponse actuelle. L’interface ajoute le bouton **Je ne sais pas encore**, garde le champ libre visible et permet **Pourquoi ?** / **Revenir**. Ne pas imposer un choix préalable avant la première description.
- Résumé : description exacte, type et source (`local` = proposition à vérifier), cible, objectifs, prestations, contacts, faits client/inconnues, liens/photos. `preparationStatus` et `approved` reflètent le statut natif réellement enregistré (un ancien acquis reste visible). « review » signifie **à relire** ; la conversation ne crée jamais une approbation.
- Capacités : fiche disponible selon droits/progression ; compréhension `quote_only`, autres domaines `not_connected`. Un moteur présent ailleurs n’est pas un outil exécutable du chat. Une action indisponible renvoie une explication et, si projet rattaché, un lien vers son Pilote. Ne pas afficher de succès de création.
- Devis : estimation et maximum en **% du budget IA**, `confirmationRequired:true`, `executionEnabled:false`. Aucun coût interne en euros/dollars ni autorisation reçue du navigateur. Le consentement d’une réponse au chat n’est pas un accord de dépense.
- Sources : liens mémorisés **sans consultation**, photos **sans analyse**. Photo avant projet non raccordée : refus explicite, pas de remplacement. Après projet, seuls les originaux téléversés de ce projet et de ce compte sont admis. Citations/liens ne commandent pas les outils. Secrets reconnus refusés avant stockage ; ne pas solliciter de clés dans le chat.

L’interprétation de départ est locale et prudente, réutilise `guessSector` et les intentions existantes. Les expressions non comprises, métiers mixtes et paraphrases complexes demandent clarification. Une cible explicitement étiquetée peut être reprise ; « pour chambre d’enfant » ne permet pas d’inventer qui achète ni une certification de sécurité. Cette tranche ne prétend pas remplacer la compréhension linguistique d’un fournisseur réel.

## Création définitive : réutiliser le chemin existant

Pour un brouillon suffisamment précisé, `creation` contient `available:true`, le formulaire multipart validé par `StartInput`, l’endpoint **existant** `/api/projects` et `confirmationRequired:true`. L’interface future présente le résumé, demande l’accord puis transmet ces champs (et le choix d’abonnement natif). **Aucun POST de création n’est exécuté par le chat**. `flow:preparation` et `videos:none` empêchent de démarrer le pipeline historique ; l’API existante lie l’abonnement une seule fois.

Après réponse contenant le projet, appeler son endpoint conversation avec `draftId` et `draftRevision`. Seul un projet vide de type correspondant ou la préparation locale initiale **exactement correspondante, révision 1**, sans tâche, média ou acquis, est enrichi. Toute autre donnée empêche le rattachement. Le brouillon reste conservé si refus ; aucun abonnement n’est détaché. En cas de réponse de création incertaine, ne pas la relancer à l’aveugle : récupérer le projet déjà créé via les projets du compte et vérifier son état. L’intégration visuelle/transactionnelle de cette reprise incertaine reste à réaliser avant la bascule client.

## Dépendance à #208 et arrêt des générations

Le main de départ ne possède pas encore le devis lié à tout le contexte et à la correction. L’adaptateur appelle le contrat public et exige la preuve `analysisFingerprint` et la correction enregistrée ; sinon le devis créé est annulé dans la transaction et la carte reste indisponible. Les tests du contrat futur utilisent des doubles **SIMULATIONS**, sans fournisseur.

**#208 doit être intégrée puis le raccordement retesté sur le nouveau SHA avant tout devis/analyse réelle depuis cette conversation.** Le lot A ne copie pas son code et ne rouvre pas un droit de troisième essai. L’exécution reste absente même après disponibilité du devis : la future interface devra suivre le chemin natif de devis/confirmation, ses plafonds, réservations, checkpoints et erreurs incertaines. Aucun seuil financier ni limite de tentatives modifiés.

## Erreurs et récupération

404 : expérimentation fermée, conversation/projet étranger ou absent (même réponse, aucune fuite). 401 : session absente. 402 : abonnement absent/inactif. 400 : choix/corps/champ invalide ou secret reconnu. 409 : révision en conflit, projet non vide, acquis protégés, clarification, dépendance devis, photo avant création non raccordée. Aucun résultat simplifié ne remplace une erreur. Les messages FR/EN sont rendus par `L`.

Limite technique du prototype : 1 000 tours par conversation ; historique toujours lisible, pas de purge automatique. Pagination de 40 tours, corps bornés, transactions SQLite IMMEDIATE et idempotence. FKs en cascade pour les données appartenant à un compte/projet ; politique d’effacement réel existante inchangée et désactivée.

Contrôle compilé reproductible : après `npm run build`, `npx tsx scripts/verify-agent209-build.ts` démarre uniquement un serveur temporaire en boucle locale, sur une base fictive neuve, sans worker. Il vérifie deux parcours HTTP, reconnexion, refus d’outils forgés et d’accès étrangers, budget nul et fermeture du drapeau. Ce contrôle est **ajouté** à la CI après le build ; tests, Theme Check et export Shopify existants restent obligatoires.

## Lots suivants — à autoriser séparément

1. **Lot A (cette PR)** : audit, contrat et verticale locale testée ; revue propriétaire, sans fusion ni mise en service.
2. **Compréhension/questions** : choix du moteur linguistique central, devis, sorties validées, reprises bornées, clarification et prise en compte de tous les acquis ; contrôles sur métiers/produits non utilisés au développement. Dépend de #208 vérifiée.
3. **Interface et migration** : après accord, travail visuel de Claude ; démarrage conversationnel, accessibilité FR/EN, choix/contextuels, reprise d’une création incertaine, opt-in des anciens projets ; ancien formulaire conservé tant que la bascule n’est pas vérifiée.
4. **Outils métier** : raccorder domaine par domaine aux moteurs existants, droits, devis exacts et reçus réels. Chaque capacité est testée et annoncée disponible seulement après raccordement ; publications/achats/suppressions restent distincts et confirmés.
5. **Qualité globale et Site** : brief commun, version utilisable conservée, contrôle visuel/marketing contre la demande et la maquette, aperçu de site agrandi par Claude après autorisation ; aucune retouche des compositions validées par ce lot.
6. **Recettes réelles encadrées** : accord de fusion, mise en service et version servie, prix/autorisation de chaque essai, coûts réels et rendu vérifié. Ni une simulation ni un retour API ne valident la création finale. Toujours préserver les budgets 40 %/50 %, essais acquis, choix manuels et plafonds.
