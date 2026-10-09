# Routage IA multifournisseur et maîtrise des coûts

Branche : `claude/ecom-studio-ia-platform-8cwl79`. **Non fusionnée.**

Ce qui n'a pas été fait :
- aucun appel d'IA payant ;
- aucun changement des abonnements, des prix commerciaux ni du routage utilisé aujourd'hui par les clients : le
  mode reste **manuel** tant que l'administration n'active pas le mode automatique.

## 1. Audit : l'état avant ce travail

- **Le texte ne passait que par Anthropic.**
  - Tous les appels de texte passent par `rawCall` (`src/lib/ai/llm.ts`), qui refusait tout autre fournisseur
    (« n'est pas un modèle de langage pris en charge »).
  - OpenAI et Gemini n'étaient branchés que pour les images et la vidéo (`media-providers.ts`).
  - Dans l'administration, on pouvait choisir `openai` ou `google` pour une tâche de texte, mais l'appel échouait
    ensuite : le choix existait à l'écran sans fonctionner.
- **Pourquoi Opus 5.5 revient si souvent.** La politique centrale (`src/lib/orchestrator/policy.ts`) place 10 des
  18 tâches de texte au niveau « fort », donc sur Opus 5.5 : analyse visuelle, stratégie, thème, retouches du
  thème, thème sur mesure, symbole de logo, planification éditoriale, réalisation vidéo, briefs photo, publicités.
  C'est un choix volontaire de la phase 3 (« qualité avant prix »), pas une erreur du routeur.
- **Le niveau léger utilisait Claude Haiku 4.5 (1 $ / 5 $).** Claude Haiku 5.5, plus récent, coûte 0,10 $ / 0,50 $,
  soit 10 fois moins cher.
- **L'effort ne tenait pas compte du modèle.** L'administration proposait les cinq valeurs d'Anthropic
  (low → max) pour Anthropic, sans vérifier ce que le modèle choisi accepte.
- **Le bouton « Voir les tarifs » semblait ne rien faire.** Il changeait d'onglet, mais la carte des tarifs se
  trouvait sous le long tableau de routage, hors de l'écran. Si l'onglet était déjà ouvert, rien ne bougeait.

## 2. Ce qui a été construit

### Catalogue des modèles de texte (`src/lib/ai/text-models.ts`)

Pour chaque modèle, le catalogue indique :
- son identifiant exact ;
- son niveau (léger, standard, fort) ;
- ses capacités (vision, sorties structurées) ;
- son paramètre de réflexion propre et les seules valeurs qu'il accepte ;
- ses limites ;
- sa latence relative ;
- son usage recommandé et la source officielle de ces informations.

Paramètres de réflexion par fournisseur :

| Fournisseur | Paramètre envoyé | Valeurs proposées |
|---|---|---|
| Anthropic (Opus, Sonnet, Haiku 5.5) | `output_config.effort` | low, medium, high, xhigh, max |
| Anthropic Haiku 4.5 | aucun | — |
| OpenAI (GPT-5.6) | `reasoning.effort` | low, medium, high (sous-ensemble prudent, voir §5) |
| Google Gemini | `generationConfig.thinkingConfig.thinkingLevel` | MINIMAL, LOW, MEDIUM, HIGH (document de découverte officiel) |
| Modèles d'image et de vidéo | aucun | l'administration n'affiche plus d'effort et le refuse à l'enregistrement |

L'effort de la politique (échelle low → max) est traduit vers la valeur acceptée la plus proche, **jamais plus
basse** quand une valeur égale ou supérieure existe.

### Adaptateurs OpenAI et Gemini (`src/lib/ai/text-providers.ts`)

- **OpenAI** : Responses API (`POST /v1/responses`).
  - `max_output_tokens` plafonne la sortie, raisonnement compris.
  - Sortie JSON imposée par `text.format` de type `json_schema`.
  - `store: false` : rien n'est conservé chez le fournisseur.
  - Comptage exact et gratuit des jetons d'entrée par `POST /v1/responses/input_tokens`.
- **Gemini** : `generateContent`.
  - `maxOutputTokens`, `thinkingLevel`.
  - Sortie JSON par `responseMimeType` et `responseJsonSchema`.
  - Comptage exact et gratuit par `countTokens`.
  - Les parties « thought » sont retirées de la réponse ; elles sont facturées comme sortie.

### Mêmes garde-fous que pour Anthropic, sans aucun contournement

Un appel OpenAI ou Gemini passe par exactement les mêmes étapes, dans le même ordre :
1. accès à l'IA vérifié par `assertAiAllowed` (forfait Découverte = 0 € d'IA, compte administrateur traité comme un
   client) ;
2. coût **maximal** calculé avant l'envoi :
   - entrée = comptage exact du fournisseur + schéma + marge, au tarif plein (aucune remise de cache supposée) ;
   - sortie = plafond envoyé ;
   - chez Gemini, la réflexion est comptée **en plus**, faute de confirmation qu'elle est incluse dans
     `maxOutputTokens` ;
3. plafond de la tâche (`assertUnderCostCap`), puis **réservation atomique** sur le budget du client (40 % du
   montant HT mensuel, 50 % des recharges) ;
4. erreur HTTP du fournisseur : la réservation est rendue. Coupure ou résultat incertain : le coût maximal est
   retenu, comme pour Anthropic ;
5. facturation au coût réel. La clé d'idempotence est la même, donc une reprise n'est jamais débitée deux fois ;
   la trace `ai_calls` enregistre le fournisseur, le modèle, l'effort, les jetons, la latence et le statut.

Un appel est bloqué **avant tout envoi** dans les cas suivants :
- modèle absent du catalogue ;
- modèle non confirmé dans l'administration ;
- tarif inconnu, ou tarifs non revérifiés depuis 90 jours ;
- comptage des jetons impossible ;
- demande au-delà des limites.

Aucun repli silencieux n'existe vers un modèle dont le tarif ne serait pas couvert.

### Routage intelligent (`src/lib/orchestrator/text-routing.ts`, branché dans le Router V2)

- **Manuel** (par défaut) : rien ne change pour les clients ; chaque tâche garde sa route actuelle.
- **Automatique** : pour chaque appel, le niveau vient de la politique, avec les mêmes escalades après un échec de
  qualité. Parmi les modèles confirmés **et** activés, le choix suit ces règles :
  1. jamais un modèle d'un niveau inférieur ; un niveau supérieur seulement si aucun modèle du niveau n'est
     disponible ;
  2. vision obligatoire si l'entrée contient des images ;
  3. historique sur 90 jours : un modèle est écarté s'il échoue souvent (au moins 5 appels et plus de 20 %
     d'échecs) ou si sa note de qualité est nettement plus basse ;
  4. au sein d'un même niveau, l'ordre de préférence est : coût théorique de la tâche, puis latence, puis le
     fournisseur déjà éprouvé ;
  5. budget restant faible (coût estimé supérieur au quart du reste) : un modèle **du même niveau** moins cher est
     préféré ;
  6. une demande **simple** de contrôle qualité ou de texte de publication peut descendre au niveau léger
     (`simpleTier`). Cela n'arrive jamais après un échec, ni en mode manuel.
- **Tâche maintenue en manuel** : la tâche garde sa route fixée, même en mode automatique.

### Administration › Modèles et tarifs

- Mode **Manuel / Automatique**.
- État des clés des trois fournisseurs.
- **Tableau des modèles** :
  - tarif, paramètre d'effort et valeurs acceptées, usage recommandé ;
  - état (utilisé, utilisable, verrouillé) et raison ;
  - boutons **Confirmer** (refusé tant que le tarif n'est pas saisi) et **Activer / Désactiver**.
- **Tableau par tâche** :
  - route manuelle actuelle et son coût théorique ;
  - modèle principal en automatique ;
  - **secours**, affiché seulement s'il est utilisable, c'est-à-dire si son tarif est connu et donc couvert par la
    réservation ;
  - coûts observés sur 90 jours (appels, coût moyen, latence, échecs, note).
- Le menu d'effort du tableau de routage n'affiche que les valeurs du modèle choisi, et rien pour l'image et la
  vidéo.
- **« Voir les tarifs »** ouvre l'onglet et amène la carte des tarifs à l'écran. Vérifié dans le navigateur : la
  carte arrive à l'écran au premier clic comme au second.
- Débordement horizontal corrigé sur téléphone dans la liste des tarifs (vérifié : 0 px).

## 3. Modèles comparés : identifiants, tarifs, capacités

| Modèle | Identifiant | Tarif USD / M jetons (entrée / sortie) | Statut |
|---|---|---|---|
| Claude Opus 5.5 | `claude-opus-5-5` | 4 / 20 | ✅ vérifié (page officielle des tarifs Anthropic) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | 2 / 10 | ✅ vérifié |
| Claude Haiku 5.5 | `claude-haiku-5-5` | 0,10 / 0,50 (jusqu'à 100 000 jetons d'entrée ; 0,50 / 2,50 au-delà, donc refusé au-delà par sécurité) | ✅ vérifié, tarif ajouté au studio |
| GPT-5.6 Terra | `gpt-5.6-terra` | [À compléter : tarif officiel] | ⚠️ identifiant présent dans la spécification officielle de l'API OpenAI ; tarif, limites et valeurs d'effort par modèle non vérifiés |
| GPT-5.6 Luna | `gpt-5.6-luna` | [À compléter : tarif officiel] | ⚠️ idem |
| Gemini 3.8 Flash | `gemini-3.8-flash` (identifiant à confirmer) | Vertex AI : 0,75 / 3,75 jusqu'au 31/12/2026 (prix de l'API Gemini à confirmer) | ⚠️ non vérifié |
| Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` (identifiant à confirmer) | Vertex AI : 0,30 / 2,50 (prix de l'API Gemini à confirmer) | ⚠️ non vérifié |

**Pourquoi ces limites ?** Depuis l'environnement de développement, les pages officielles d'OpenAI
(`openai.com`, `platform.openai.com`) et de l'API Gemini (`ai.google.dev`) sont **bloquées**.

Ce qui a pu être lu :
- la spécification OpenAPI officielle d'OpenAI : identifiants, `max_output_tokens` qui inclut le raisonnement,
  endpoint de comptage ;
- le document de découverte officiel de l'API Gemini : `thinkingLevel`, `countTokens` ;
- la page de tarifs **Vertex AI** de Google ;
- la page de tarifs d'Anthropic.

Les sources tierces se contredisent sur les prix OpenAI (Luna à 0,20 / 1,20 $ ou à 1 / 6 $) : elles n'ont pas été
retenues.

Conséquence : **OpenAI et Gemini sont branchés mais verrouillés**. Pour les utiliser, il faut :
1. vérifier l'identifiant, le tarif et les limites sur la page officielle ;
2. saisir le tarif (« Tarifs des fournisseurs ») ;
3. cliquer sur « Confirmer » ;
4. l'activer.

Aucun d'eux n'est activé automatiquement. La spécification OpenAI liste aussi des modèles plus récents
(`gpt-6-luna`, `gpt-6-sol`, `gpt-6-astra`…) : ils sont à étudier avant de retenir la 5.6.

## 4. Coût théorique par tâche et modèles recommandés

Le détail complet se trouve dans `reports/ai-routing-simulation.md`, produit par `scripts/simulate-text-routing.ts`,
sans aucun appel. Il s'agit d'un appel typique par tâche, au taux USD → EUR de 0,86 et sans le coefficient.

| Tâche | Niveau | Aujourd'hui (manuel) | Automatique, Anthropic seul | Automatique avec Gemini Flash* |
|---|---|---|---|---|
| Rédaction (fiches, pages) | standard | Sonnet 5.5 · 0,0456 € | Sonnet 5.5 · 0,0456 € | Gemini 3.8 Flash · 0,0171 € |
| Contrôle qualité | standard | Sonnet 5.5 · 0,0198 € | Sonnet 5.5 (Haiku 5.5 si simple : 0,0010 €) | Gemini 3.8 Flash · 0,0074 € |
| Textes des publications | standard | Sonnet 5.5 · 0,0189 € | Sonnet 5.5 (Haiku 5.5 si simple : 0,0009 €) | Gemini 3.8 Flash · 0,0071 € |
| Articles de blog | standard | Sonnet 5.5 · 0,0499 € | Sonnet 5.5 · 0,0499 € | Gemini 3.8 Flash · 0,0187 € |
| Tri des photos | léger | Haiku 4.5 · 0,0052 € | **Haiku 5.5 · 0,0005 €** | Haiku 5.5 · 0,0005 € |
| Classement des fichiers | léger | Haiku 4.5 · 0,0026 € | **Haiku 5.5 · 0,0003 €** | Haiku 5.5 · 0,0003 € |
| Stratégie de marque | fort | Opus 5.5 · 0,1376 € | Opus 5.5 · 0,1376 € | Opus 5.5 · 0,1376 € |
| Thème boutique | fort | Opus 5.5 · 0,4816 € | Opus 5.5 · 0,4816 € | Opus 5.5 · 0,4816 € |

\* Gemini 3.8 Flash : uniquement s'il est confirmé et activé, au tarif Vertex indicatif. Sa **qualité** n'a pas été
mesurée sur les tâches du studio.

Recommandations, par ordre de sûreté :
1. **Activer le mode automatique avec Anthropic seul.**
   - Effet immédiat : Haiku 5.5 remplace Haiku 4.5 sur les tâches légères (10 fois moins cher, même génération que
     Sonnet et Opus 5.5).
   - Les contrôles et textes de publications simples passent sur Haiku 5.5.
   - Les tâches standard restent sur Sonnet 5.5, les tâches fortes sur Opus 5.5.
   - Le gain est réel mais modeste, car l'essentiel de la dépense vient des tâches fortes (thème, stratégie).
2. **Pour réduire réellement la part d'Opus**, il ne faut pas tricher sur le niveau. Il faut décider, tâche par
   tâche, si le niveau « fort » est vraiment nécessaire. Candidats à tester (non changés) :
   - briefs photo (sortie courte) ;
   - planification éditoriale ;
   - réalisation vidéo ;
   - publicités.

   La méthode proposée : comparer Opus et Sonnet sur 5 à 10 projets réels avec la barrière de qualité. La politique
   ne serait modifiée qu'après votre validation.
3. **Gemini 3.8 Flash ou GPT-5.6 Terra** sur les tâches standard, seulement après :
   - confirmation du tarif officiel ;
   - un essai réel, avec votre accord pour cette dépense ;
   - une note de qualité au moins égale à celle de Sonnet 5.5.

   L'historique observé écarte ensuite automatiquement un modèle qui échoue ou note moins bien.

## 5. Tests réalisés (sans appel payant)

- `tests/routage-multifournisseur.test.ts` : **24 tests** (base de données isolée), réponses des fournisseurs simulées. Ils couvrent :
  - le catalogue et les valeurs d'effort ;
  - le format des requêtes OpenAI et Gemini et la lecture des réponses (texte, coupure, refus, jetons de
    réflexion) ;
  - le comptage ;
  - les garde-fous budgétaires : réservation avant l'envoi, forfait Découverte, budget épuisé, réservation rendue
    sur une erreur HTTP, coût maximal retenu sur une coupure, modèle non confirmé ou sans tarif bloqué avant
    l'envoi, réflexion Gemini réservée en plus ;
  - le routage : manuel inchangé, jamais sous le niveau, le moins cher du niveau, demande simple, budget restant,
    historique d'échecs, vision ;
  - l'administration : effort validé, aucun effort pour l'image ou la vidéo, confirmation sans tarif refusée,
    bouton des tarifs.
- Suite complète : **1027 tests sur 1027** (117 fichiers), TypeScript OK, construction de production OK.
- Les tests existants du routage, du budget, des traces et de la sécurité passent toujours.
- Vérification dans le navigateur (Chromium, ordinateur et téléphone) :
  - bouton « Voir les tarifs » ;
  - affichage du nouveau panneau ;
  - aucune erreur JavaScript ;
  - aucun débordement horizontal.
- Captures : `reports/screenshots/ai-routing/` (onglet Modèles et tarifs sur ordinateur et téléphone, carte des
  tarifs après le clic sur « Voir les tarifs »).

## 6. Limites restantes

- **Tarifs OpenAI et Gemini** : [À compléter : à relever sur openai.com/api/pricing et ai.google.dev/pricing].
  Sans eux, ces modèles restent inutilisables : c'est voulu.
- **Valeurs d'effort OpenAI par modèle** : seul le sous-ensemble low, medium, high est proposé. La spécification
  liste aussi none, minimal, xhigh et max, mais sans préciser quels modèles les acceptent.
- **Réflexion Gemini** : la spécification ne dit pas si elle est comprise dans `maxOutputTokens`. La réservation
  la compte donc en plus. Ce montant est prudent mais non prouvé ; un éventuel dépassement est inscrit à part et
  jamais débité au client.
- **Limites (fenêtre, sortie) d'OpenAI et Gemini** : des valeurs prudentes sont utilisées (128 000 jetons
  d'entrée, 16 000 à 32 000 en sortie). Une demande plus longue est refusée, jamais facturée.
- **Qualité réelle** d'OpenAI et Gemini sur les livrables du studio : non mesurée, faute d'appels payants.
- **Les essais de connexion** « Tester réellement » de l'administration ne couvrent toujours que la clé, pas un
  modèle de texte OpenAI ou Gemini précis.
