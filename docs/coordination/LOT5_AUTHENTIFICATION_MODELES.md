# Lot 5 — préalable : authentification et modèles, sans génération

## Mission et état réel

Consigne [Thomas #6341845652 sur #165](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/165#issuecomment-6341845652), lue intégralement le **22 octobre 2026**. Seuls les accès sont autorisés. **Aucune génération, aucune étape fonctionnelle 1, aucune fusion ou mise à jour du studio.**

**Livré :** commande temporaire, protections et tests isolés. **En attente :** exécution authentifiée depuis le terminal Codespace de Thomas. L’accès Codespace a été recontrôlé dans cette session : `gh codespace list --json name,state` est encore refusé par 403 (erreur brute supprimée). Aucun terminal distant vers ce Codespace ni nouvel accès n’a été utilisé. Le retour antérieur de Thomas ne prouve ni une authentification fournisseur ni la version servie.

## Observations transmises par Thomas — pas une exécution de Codex

Source : extrait retranscrit dans le commentaire de mission. Début incomplet : fin du premier chargeur et **bloc worker complet**, puis réseau complet ; **ne pas reconstruire ni déclarer reçu le bloc Next entier**.

Worker capturé le **22 octobre 2026 à 15 h 20 min 12 s, Europe/Paris** (`2026-10-22T13:20:12.282Z` dans la preuve) : checkout de code **et** configuration `d97e0b9577128eeb39b403dae281da6bd835fc65`, mode `development`, base présente. `servedVersion: not_probed` : il s’agit du checkout utilisé par le terminal, pas d’une version de serveur vérifiée. Clés chiffrées en `settings`, pas dans les variables d’environnement.

| Fournisseur / fonctions | Clé worker lisible et active, selon Thomas | HEAD public reçu | Authentification réelle / génération |
|---|---|---|---|
| Anthropic — vision, analyse/recherche, marque, copywriting/SEO, direction, contrôles | Oui | 405 | Non testée / aucune génération |
| OpenAI — logo, photos et retouches selon routes | Oui | 401 | Non testée / aucune génération |
| Google — images et vidéos selon routes | Oui | 404 | Non testée / aucune génération |
| Alibaba — images et vidéos selon routes | Oui | 401, région internationale | Non testée / aucune génération |
| fal.ai — clips selon routes | Oui | 404 | Non testée / aucune génération |
| Pixabay — recherche explicite de médias | Oui | 405 | Non testée ; hors contrôle authentifié des cinq fournisseurs IA |
| Pexels — recherche de médias | Absente | 404 | Non testée ; aucun ajout de clé |

Toutes ces réponses attestent une réponse HTTP, sans refus CONNECT signalé dans l’extrait. **Elles ne prouvent pas la validité des clés.** L’ancien constat Codex (clés absentes/proxy bloqué) est distinct et reste historique ; il n’invalide pas les observations du Codespace.

Routes **localement résolues dans le retour worker**, pas encore appelées :

| Fonction | Principal / secours / route résolue transmise |
|---|---|
| Texte selon tâche/difficulté | Anthropic `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-4-5` ; `authUsable` est un booléen local |
| Logo | OpenAI `gpt-image-2.5-sunburst`, aucun secours |
| Photo produit et scène | Principal masqué hors catalogue ; secours et résolu OpenAI `gpt-image-2.5-flare` |
| Retouche produit | OpenAI `gpt-image-2.5-flare` |
| Visuel publicitaire et publication | Principal masqué hors catalogue ; secours et résolu Google `gemini-3.1-flash-image` |
| Texte dans l’image | Alibaba `qwen-image-3.0-pro` |
| Vidéo produit | fal `fal-ai/kling-video/v3/standard/image-to-video` ; secours Google `veo-3.0-generate-001` |
| UGC vidéo | fal `fal-ai/kling-video/v3/pro/image-to-video` ; secours Google `veo-3.1-generate-preview` |
| Texte vers vidéo | Google `veo-3.0-generate-001` |

Alibaba : `intl`, pas d’endpoint personnalisé ou workspace dans le retour. Relais qualité logo nul. Kokoro non configuré, assets absents, aucune synthèse testée. Les prix sont marqués récents par l’application, **sans revalidation officielle** : pas un devis pour un essai.

## Documentation officielle vérifiée avant de coder

Pages consultées le 22 octobre 2026 ; lecture de métadonnées, sans exécuter les exemples de génération. Les cinq URLs HTTP sont figées dans le script. Aucun endpoint de création, inférence, soumission, achat ou recharge. Les lectures n’utilisent ni jeton généré ni GPU d’inférence ; les coûts d’une future génération ne sont pas déduits de ces lectures.

| Fournisseur | Méthode préparée / source officielle | Ce qu’une réponse filtrée peut prouver et ses limites |
|---|---|---|
| Anthropic | [Models list](https://platform.claude.com/docs/en/api/models/list), `GET https://api.anthropic.com/v1/models?limit=1000`, en-têtes `x-api-key` et version | Authentification acceptée pour les métadonnées si 200 **et** schéma de catalogue conforme ; liste et lifecycle des identifiants exacts ; aucun droit de génération déduit |
| OpenAI | [Models list](https://developers.openai.com/api/reference/resources/models/methods/list), `GET https://api.openai.com/v1/models`, Bearer | Authentification pour ce catalogue et identifiant listé seulement ; aucun test des permissions image, facturation, quota ou génération |
| Google | [Models](https://ai.google.dev/api/models), `GET https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000`, `x-goog-api-key` | Catalogue authentifié ; éventuelle pagination signalée ; présence d’un modèle distincte de ses droits/quota d’inférence |
| Alibaba | [List models](https://www.alibabacloud.com/help/en/model-studio/list-models), `GET https://dashscope-intl.aliyuncs.com/api/v1/models?page_no=1&page_size=100`, Bearer | Région internationale uniquement ; forme `output.models` et total vérifiés. Une page partielle ne permet pas de déclarer absent un modèle non vu |
| fal.ai | [Model search](https://fal.ai/docs/platform-apis/v1/models), [authentification](https://fal.ai/docs/api-reference/platform-apis/authentication), `GET https://api.fal.ai/v1/models?limit=100`, `Authorization: Key` | Catalogue **public**, donc 200 seul ne valide aucune clé. Seule une métadonnée personnalisée conforme à la doc (`is_favorited` booléen ; nul sans authentification) produit le statut distinct `accepted_personalized_metadata`. Sinon authentification non vérifiée, aucun appel de génération de remplacement |

La documentation fal contient une tension entre son schéma générique d’autorisation et la description publique de la recherche : le script suit la limite la plus prudente. Son rapport d’accès organisationnel est réservé aux comptes entreprise ; il n’est pas appelé ni activé. Aucun ancien test sur un faux identifiant de tâche n’est utilisé comme preuve. Si aucun contrôle gratuit adapté ne permet de conclure : **« non vérifiable sans essai de génération »**, sans réaliser cet essai. Pour les cinq fournisseurs : **droit de génération non vérifiable avec ce contrôle de métadonnées** ; si l’accès exact ne peut être prouvé gratuitement, conserver cette limite et s’arrêter.

### Identifiants documentés et alerte de cycle de vie

- Les identifiants OpenAI [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) et [Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) sont documentés ; cela ne prouve pas l’accès du compte ni la compatibilité de tous les paramètres du studio.
- [Claude models](https://platform.claude.com/docs/en/models/overview) documente les lignes actuelles ; le contrôle du compte devra comparer les identifiants exacts et le lifecycle, y compris Haiku 4.5 historique.
- [Google images](https://ai.google.dev/gemini-api/docs/image-generation) documente `gemini-3.1-flash-image`. **Alerte documentaire : [Google vidéo](https://ai.google.dev/gemini-api/docs/video) et [dépréciations](https://ai.google.dev/gemini-api/docs/deprecations) annoncent l’arrêt de Veo 3.1 Preview le 22 octobre 2026**, dont `veo-3.1-generate-preview` configuré en secours UGC dans le retour. La même table officielle indique le 30 juin 2026 comme date d’arrêt de `veo-3.0-generate-001` encore résolu pour texte-vers-vidéo et en secours produit. Disponibilité effective au compte non testée ; aucun remplacement automatique.
- Les pages fal [Kling Standard](https://fal.ai/models/fal-ai/kling-video/v3/standard/image-to-video/api) et [Kling Pro](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api) portent les identifiants configurés. Aucun clip n’est soumis.
- [Alibaba List models](https://www.alibabacloud.com/help/en/model-studio/list-models) montre un exemple Qwen 3.0 Pro ; [Qwen image API](https://www.alibabacloud.com/help/en/model-studio/qwen-image-api) contient aussi des versions 2.x. Ne pas conclure qu’un identifiant est erroné à partir d’une page partielle. [Wan](https://www.alibabacloud.com/help/en/model-studio/legacy-image-to-video-api-reference/) documente le modèle de scènes préparées. Le catalogue authentifié de la région et ses limites restent à observer.

## Deux problèmes du diagnostic examinés dans le code

**CONFIRMÉ DANS LE CODE — statut du secret maître figé.** Dans la version précédente, `masterSecret.validity` recevait sa valeur initiale et n’était jamais recalculé après lecture des enregistrements. Le nouveau script compte les enregistrements chiffrés lisibles et vérifie l’authenticité GCM du chiffré existant avec la clé dérivée par le module natif. Il exporte seulement des compteurs et un statut fermé. Pas de secret, longueur, empreinte, chiffré ou texte déchiffré exporté. Une lecture native par compatibilité historique ne prouve pas la correspondance du secret maître actuel : ces deux cas restent distincts. La preuve réelle dans le Codespace attend la nouvelle exécution.

**CONFIRMÉ DANS LES SOURCES — les deux catalogues sont identiques.** Comparaison Git des fichiers `src/lib/ai/media-models.ts` et `text-models.ts` entre **d97e0b9577128eeb39b403dae281da6bd835fc65** et **8266c171027762acbbf0cf03daefff4c6035fb32** : aucun diff ; empreintes de fichiers publics égales, aucun accès à une empreinte de secret. Les 42 couples publics fournisseur/modèle sont figés dans le diagnostic. Les quatre usages principaux masqués sont donc à examiner dans les réglages locaux, pas à déclarer faux parce que l’intégration est plus récente.

La commande compare sur place les valeurs exactes aux deux catalogues publics et au catalogue fournisseur reçu. Elle ne transmet **jamais une valeur arbitraire masquée dans une URL**, ne la révèle pas, même si une entrée distante correspond. Elle renvoie par fonction : présence dans chaque catalogue source, présence dans la réponse officielle, liste complète ou partielle, différences fermées de blancs/préfixe de fournisseur et provider non reconnu. Aucun réglage n’est corrigé. Une valeur masquée peut être parfaitement officielle mais absente du catalogue du studio ; un échec de correspondance n’est pas, seul, une preuve d’erreur.

## Commande unique depuis le terminal du Codespace

Script et tests figés au commit **47bae5e7a1ce43605f4e88625bf236e1b8561615**. Le dernier commentaire de livraison de #165 donne la même commande avec le SHA vérifié. Depuis la racine du dépôt existant :

```bash
(ecom_diag=$(mktemp /tmp/ecom-auth-XXXXXX.mts) && curl -fsSL 'https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/47bae5e7a1ce43605f4e88625bf236e1b8561615/scripts/diagnostic-acces-routage.ts' -o "$ecom_diag" && node --import tsx "$ecom_diag" --code-root "$PWD" --config-root "$PWD" --both-loaders --authenticate --auth-summary)
```

Le script public est le seul fichier créé, dans `/tmp`. Aucune copie des clés, pull, checkout, installation, migration, écriture de données, redémarrage ou ouverture de port. Les dépendances et le code sont ceux du checkout existant. Si `tsx` manque, le lancement s’arrête ; aucune installation automatique.

Les **deux chargeurs** sont inspectés en processus séparés. Les requêtes authentifiées utilisent **uniquement le worker** : cinq GET au maximum, pas dix ; le JSON le précise. Les résultats d’authentification ne sont pas attribués à Next ni au processus serveur. La version Next antérieure étant tronquée, son nouveau bloc de présence/lisibilité est inclus. Le résumé compact sur une ligne réduit le risque de couper le retour au collage ; transmettre le JSON entier, jamais les fichiers de secrets.

Protections : clés actives natives seulement ; fournisseur désactivé, passerelle déclarée sans clé, région Alibaba autre qu’internationale ou endpoint personnalisé = refus du contrôle, sans substitution d’hôte/région. Les secrets entrent uniquement dans le tube privé vers `curl --config -`, jamais ses arguments, son URL ou son environnement. Hôtes/chemins fixes ; GET seulement ; TLS et proxy conservés ; `.curlrc` ignoré ; pas de redirection ni retry ; délais et tailles bornés ; aucune sauvegarde de réponse brute ou de statut administratif. Le réseau des modules d’inférence reste bloqué ; l’unique exception est ce transport GET de métadonnées explicitement demandé.

Les schémas JSON sont vérifiés avant d’accepter le catalogue. 401, 403, 404, 429, erreur serveur, problème réseau, JSON invalide ou redirection restent distincts, sans corps d’erreur. Un 403 n’est pas automatiquement une clé invalide. Les listes partielles ne sont pas des preuves d’absence ; les pages supplémentaires ne sont pas parcourues automatiquement. Aucun prix de génération n’est confirmé ou modifié.

## Vérifications et prochaines actions

- Tests ciblés : **2 fichiers, 48 tests réussis**, 32,13 s ; faux identifiants, bases isolées, catalogue/transport simulés, aucun fournisseur réel. Couvrent les deux chargeurs, la commande temporaire normale et compacte, les cinq réponses, les clés actives/désactivées, passerelle, endpoints/région, injection d’en-têtes, redirections/erreurs, pagination, valeurs masquées, secret maître correct/incorrect et base inchangée.
- `npx tsc --noEmit` : **réussi** après correction de deux annotations du prototype ; code applicatif inchangé.
- Vérification avec le **vrai analyseur de configuration curl**, cinq en-têtes à identifiants fictifs via stdin, `curl --version` : **5 réussites / 0 réseau**, sans publier les tubes privés.
- `git diff --check` : réussi. **Suite complète `npx vitest run` : 356 fichiers réussis, 2 902 tests réussis, 22 sautés, 2 924 au total, 881,82 s, code de sortie 0.** CI du nouveau commit : lien et état réellement observé ajoutés au commentaire après push, pas de statut supposé à partir de l’ancienne CI.

Après retour du JSON : remplir le tableau avec les réponses fermées réellement reçues, traiter les quatre usages masqués sans publication de leur valeur, signaler les droits restant non vérifiables gratuitement et revenir à Thomas. Le manque de voix, les prix non revalidés et le décalage de checkout restent des constats, pas des corrections silencieuses. **Aucune génération et aucune étape 1 avant la suite explicitement validée.** La future recette garde un même projet et ses versions, une fonction à la fois, preuves réelles, coût cumulé et validation de Thomas entre étapes.


Livraison : branche `codex/lot5-diagnostic-acces-routage`, PR #165, code/tests figés à `47bae5e7a1ce43605f4e88625bf236e1b8561615`. Base applicative conservée : b7829553, distincte de la source d97e0b95 observée par Thomas et de l’intégration 8266c171. Aucun fichier de `src/`, `worker/`, thème ou configuration modifié. Les sept fichiers de ce complément seront comparés sur la branche distante avant annonce de publication. L’authentification réelle du Codespace reste en attente du JSON de la nouvelle commande.
