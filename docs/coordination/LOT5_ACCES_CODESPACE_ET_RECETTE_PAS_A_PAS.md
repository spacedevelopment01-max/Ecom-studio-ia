# Lot 5 — accès Codespace et recette étape par étape

> **Complément actif du 22 octobre 2026 :** [authentification et modèles, sans génération](LOT5_AUTHENTIFICATION_MODELES.md), mission [#6341845652](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/165#issuecomment-6341845652). Thomas a transmis un bloc worker complet : six clés en settings lisibles, Pexels absent, réponses HTTP publiques reçues ; Next reçu partiellement. Authentification, droits modèles et version servie restent non vérifiés. La nouvelle commande remplace l’ancienne pour ce contrôle ; les constats et résultats antérieurs ci-dessous restent historiques. Aucune étape 1 ni génération.


## Consigne active et état réel

Complément de Thomas lu intégralement : [PR #165, commentaire #6340748281](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/165#issuecomment-6340748281), le 22 octobre 2026. Il remplace la campagne globale préparée dans #164 : **accès uniquement maintenant ; retour à Thomas avant toute étape fonctionnelle.** Aucune autorisation de génération payante n’est déduite de ce complément.

**Blocage immédiatement signalé : aucune session de terminal distante autorisée vers le Codespace n’est disponible dans Codex.** L’inventaire des outils disponibles n’expose pas d’exécution Codespace ; `gh codespace list --json name,state` échoue avec un refus 403, erreur brute supprimée. La vérification de la configuration d’environnement managé ne concerne que Codex. Aucun nouveau test du même accès Codex n’est présenté comme une inspection du studio. L’ancien refus CONNECT 403 sur l’URL privée est une observation antérieure, pas une preuve de l’état actuel du serveur.

La manipulation ci-dessous est donc nécessaire dans **le terminal du Codespace de Thomas**, à la racine du dépôt. Le diagnostic est préparé/testé, **pas encore exécuté dans ce Codespace**. Le résultat attendu est le JSON fermé ; jamais les clés, un extrait de clé ou une empreinte de clé. Le Codespace, son port, ses données, sa configuration et le studio ne sont pas modifiés par cette livraison.

## Tableau fournisseur à ce stade

Les modèles du tableau de routage antérieur de Codex ne sont pas transposés au Codespace. « Non vérifié » ne signifie pas « absent », « invalide » ou « disponible officiellement ».

| Fournisseur | Environnement demandé | Clé accessible | Réseau | Authentification | Modèle effectivement résolu | Fonctions concernées / blocage |
|---|---|---|---|---|---|---|
| Anthropic | Codespace, Next et worker | Non vérifié | Non vérifié | Non vérifiée | Non vérifié | Vision, recherche analysée, marque, textes, SEO/blog, direction créative et contrôles ; accès terminal manquant |
| OpenAI | Codespace, Next et worker | Non vérifié | Non vérifié | Non vérifiée | Non vérifié | Logo, autres usages selon configuration ; accès terminal manquant |
| Google | Codespace, Next et worker | Non vérifié | Non vérifié | Non vérifiée | Non vérifié | Images/vidéos selon configuration ; accès terminal manquant |
| Alibaba | Codespace, Next et worker | Non vérifié | Non vérifié | Non vérifiée | Non vérifié | Images, retouches, clips ; région/endpoint à lire dans la configuration réelle |
| fal.ai | Codespace, Next et worker | Non vérifié | Non vérifié | Non vérifiée | Non vérifié | Images/vidéos selon routes ; accès terminal manquant |
| Pexels | Codespace, Next et worker | Non vérifié | Non vérifié | Non vérifiée | Sans modèle de génération | Recherche de médias explicitement déclarés ; accès terminal manquant |
| Pixabay | Codespace, Next et worker | Non vérifié | Non vérifié | Non vérifiée | Sans modèle de génération | Recherche de médias explicitement déclarés ; accès terminal manquant |

Le moteur de voix locale reste à vérifier dans cet environnement : paramètres et disponibilité des assets Kokoro sont inclus ; aucune synthèse n’est lancée.

## Manipulation minimale, sans installer #165 dans le studio

Le commentaire de livraison de #165 et le message à Thomas fournissent **la commande exacte avec un SHA immuable**. Commande à copier depuis la racine du dépôt :

```bash
(ecom_diag=$(mktemp /tmp/ecom-acces-XXXXXX.mts) && curl -fsSL 'https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/c822969c6fa0edfbaa0f8c4928e3fddf8abff28a/scripts/diagnostic-acces-routage.ts' -o "$ecom_diag" && node --import tsx "$ecom_diag" --code-root "$PWD" --config-root "$PWD" --both-loaders --network)
```

Le téléchargement pointe sur le commit immuable du script et des tests, `c822969c6fa0edfbaa0f8c4928e3fddf8abff28a` ; ce commit n’est pas appliqué au checkout existant. Aucun `git checkout`, `pull`, fusion, redémarrage du studio, installation de dépendance, reset ou nettoyage. Le seul fichier créé est le script public dans `/tmp` ; aucune clé n’y est écrite.

Le téléchargement et son exécution sont séquentiels : une erreur de téléchargement empêche le lancement. `tsx`, les dépendances, les modules natifs et les deux chargeurs sont ceux du checkout existant du Codespace. Si un module natif manque, le JSON signale une inspection indisponible, sans installation automatique ni erreur privée. Si `tsx` lui-même manque, Node peut s’arrêter avant de produire le JSON : signaler cet arrêt, sans lancer d’installation. Le fichier temporaire porte l’extension `.mts`, nécessaire pour son exécution ESM hors du dépôt.

### Ce qui est réellement contrôlé par la commande

- Deux processus séparés exécutent les chargeurs Next et worker. Les caches et les variables chargées par Next ne contaminent pas le contrôle worker.
- Le code **du checkout existant** résout ses propres routes. Le SHA de ce code est distingué du SHA public du script téléchargé. Les changements locaux éventuels ne sont ni effacés ni mis à jour. Le SHA Git décrit le dernier commit, pas ces éventuelles modifications non commitées : le JSON ne certifie pas un arbre de travail propre.
- La base est ouverte en lecture seule (`query_only`), sans migration ; aucun worker ou serveur n’est démarré. La présence, le chiffrement, la lisibilité et la précédence native des clés sont exportés sous forme de statuts fermés. Désactivation et passerelle déclarée restent distinctes d’une clé accessible.
- Aucun secret, longueur de clé, début/fin, empreinte, contenu de fichier de secrets, texte client ni erreur libre n’est exporté. Les noms de modèles arbitraires hors du catalogue source sont masqués.
- Sept HEAD publics sans authentification, bornés à six secondes chacun, contrôlent la réponse des hôtes publics. Les corps sont jetés. `curl --disable` ignore les réglages `.curlrc`, conserve le proxy et TLS, ne suit aucune redirection et ne reçoit aucune clé. Aucun contournement du proxy.
- Le HEAD Alibaba porte seulement sur l’hôte international public. Un résultat positif ne vérifie ni une région US/CN ni un endpoint personnalisé : le JSON l’indique explicitement.
- Un 401/403 reçu du fournisseur prouve seulement une réponse HTTP. Un refus CONNECT 403 avec HTTP fournisseur nul est classé séparément. Aucun de ces contrôles ne prouve l’authentification, l’autorisation d’un modèle ou sa disponibilité officielle.

### Limites conservées, contrôles suivants conditionnels

**Cette première manipulation n’authentifie pas les fournisseurs.** Elle ne réutilise pas aveuglément les boutons de test de l’administration : le test Alibaba écrit `provider.alibaba.lastTest`, incompatible avec la lecture seule ; le test fal accepte tout statut autre que 401/403 et ne suffit donc pas à prouver un accès. Les appels payants ne sont pas utilisés comme tests de connexion.

Après réception du JSON, compléter le tableau avec les faits observés. Les contrôles documentés sans coût pourront être effectués seulement par un accès autorisé dans le bon environnement, sans génération : comptage Anthropic (`pingAnthropic`, gratuit dans le code), catalogue OpenAI/Google, catalogue Alibaba sans sa sauvegarde de statut. Toute vérification effective devra distinguer la réponse au catalogue et les droits du modèle exact, respecter la région, la désactivation et l’éventuelle passerelle. À défaut, conserver « non vérifié ». Ne pas affirmer qu’une route source équivaut à un modèle officiellement disponible ou accessible au compte.

Le processus diagnostique utilise le mode `NODE_ENV` de son terminal ; le JSON indique ce mode et les sélecteurs de stockage explicites. Il ne lit pas la mémoire ni l’environnement privé du processus serveur en cours. Vérifier la correspondance des sélecteurs/modes avec le studio avant d’attribuer les résultats à son instance servie. `servedVersion` reste `not_probed` : **aucune version du studio accessible n’est annoncée comme vérifiée**.

## Recette active : un même projet et validation à chaque étape

**Aucune étape 1 commencée.** Avant le premier essai : présenter à Thomas un seul produit ou service, son projet isolé, les sources et les médias de départ réellement inspectés. Conserver ce projet, ses résultats validés, ses sources et ses versions pendant tout le parcours. Les autres cas de généralisation attendent la fin de ce parcours.

L’ordre détaillé se précise avec les sorties applicables au cas retenu : brief et compréhension ; recherche ; marque ; logo ; contenus/copywriting ; images ; thème ; adaptation au client et vérification du copywriting dans ses pages ; sauvegarde/reprise ; exports et sorties finales. Chaque fonction reste une étape distincte, pas un groupe à lancer ensemble. Une étape fonctionnelle n’est pas un lot de planning. Les vidéos/voix applicables se font également séparément, après validation des étapes dont elles dépendent. **Pas de pipeline complet automatique.**

Chaque étape doit livrer :

1. Entrées et médias, but, résultat attendu.
2. Fournisseur et modèle réellement appelés, ou traitement local identifié.
3. Verdict simple : réussi, défauts, incertitudes, blocages.
4. Captures réelles du studio et fichiers produits : capture du texte pour un texte ; MP4 avec son et aperçu pour une vidéo.
5. Tentatives, coûts réels cumulés et délai, y compris contrôles et reprises ; coût inconnu signalé, jamais remplacé par zéro.
6. Corrections nécessaires et comparaison avant/après. Rester à cette étape pour corriger/retester dans l’enveloppe autorisée, préserver les résultats utilisables et l’historique.

**Attendre la validation explicite de Thomas avant toute étape suivante.** Une CI verte, un score automatique ou le silence ne valent pas validation. Aucun visuel fabriqué pour simuler une preuve ; aucune retouche hors pipeline dissimulée. Devis et autorisation restent requis avant toute dépense ; aucune campagne payante autorisée maintenant.

## Livraison et vérifications

Changements limités au diagnostic CLI, ses tests et cette documentation : aucun code applicatif, fournisseur, modèle, paramètre, plafond, thème ou composition de Claude modifié. PR #165 conservée ; aucune fusion ou mise à jour du studio.

Les tests ciblés utilisent uniquement des bases et identifiants fictifs. Ils vérifient notamment le téléchargement simulé dans un fichier temporaire, les deux chargeurs indépendants, les données inchangées, les erreurs fermées et la distinction refus proxy/réponse fournisseur. Le réseau est simulé dans ces tests : aucun appel API, aucune génération ni preuve créative. Les résultats exacts et le commit publié sont ajoutés au commentaire de livraison après exécution.

### Résultats du complément

Code et tests figés : **`c822969c6fa0edfbaa0f8c4928e3fddf8abff28a`**, sur la branche `codex/lot5-diagnostic-acces-routage`. Les fichiers applicatifs restent ceux de b7829553 ; aucun changement applicatif de Claude n’a été absorbé ou remplacé. Sa branche d’intégration observée à `8266c171027762acbbf0cf03daefff4c6035fb32` reste distincte, non fusionnée. Les résultats ci-dessous ne sont pas attribués à ce dernier SHA ni au studio servi.

| Commande réellement exécutée | Résultat |
|---|---|
| `npx vitest run tests/lot5-diagnostic-acces-routage.test.ts` | **18 tests réussis**, 22,74 s ; identifiants fictifs, réseau simulé |
| `npx tsc --noEmit` | **Réussi** après correction d’une annotation TypeScript dans le nouveau test ; aucune correction applicative |
| `npx vitest run` | **355 fichiers réussis ; 2 872 tests réussis, 22 sautés, 2 894 au total ; 896,64 s**, code de sortie 0 |
| `git diff --check` | **Réussi** |
| `gh codespace list --json name,state` | **Bloqué par 403**, aucune session Codespace accessible, erreur brute supprimée |
| Diagnostic dans le Codespace | **Non exécuté** ; retour du terminal de Thomas nécessaire |
| Authentification/droits modèle | **Non vérifiés** ; aucun appel authentifié ni génération |
| CI du nouveau complément | Lien et statut réellement observé ajoutés au commentaire de livraison après push ; la CI verte de fd7182c ne vaut pas CI de ce complément |

Le test temporaire reproduit l’exécution du fichier `.mts` téléchargé contre un code/configuration sélectionnés, avec Next et worker en processus séparés et une base fictive chiffrée. Les six cas réseau distinguent notamment CONNECT 403, 401/403 HTTP du fournisseur, réponse 200, délai dépassé et sortie inattendue. Le corps d’erreur fictif n’est jamais exporté. Aucun appel réseau réel dans les tests de ce complément ; le téléchargement du script public est contrôlé séparément après publication.

**Bilan : préparation livrée ; contrôle réel des accès Codespace en attente. Zéro génération, zéro dépense fournisseur pour ce complément, aucune étape 1 commencée, aucune fusion, aucun déploiement.**
