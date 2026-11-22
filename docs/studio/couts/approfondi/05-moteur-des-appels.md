# Le moteur commun des appels à l'IA : ce qui reste à gagner

22 novembre 2026. Lu sur la dernière version de la branche `claude/evolution-sina` (enregistrement `9b67a29a`), dans un
dossier de travail à part. **Aucun fichier du Studio modifié, aucun appel payant.**

Périmètre : tout `src/lib/ai/` (dont `llm.ts`, `config.ts`, `text-models.ts`, `text-providers.ts`, `media-providers.ts`,
`openai-images.ts`, `web-search.ts`, `trace.ts`, `memoire.ts`, `request-bounds.ts`, `access.ts`, `estimate.ts`,
`budget-pct.ts`, `context.ts`, `skills.ts`, `diagnostic.ts`, le routage des médias, Higgsfield et Alibaba), le routage
des modèles (`src/lib/orchestrator/policy.ts`, `router.ts`, `history.ts`, `text-routing.ts`), le compteur
(`src/lib/billing.ts` : réservation, règlement, résultat incertain) et la façon dont le travailleur de fond lance les
tâches (`worker/index.ts`, `worker/handlers.ts`, `src/lib/jobs.ts`, `src/lib/job-recovery.ts`).

Prix utilisés (consignes) : Opus 5.5 à 4 $ / 20 $ le million de jetons, lecture en mémoire 0,20 $, écriture en mémoire
d'une heure deux fois le prix d'entrée (5 minutes : 1,25 fois) ; Sonnet 5.5 à 2 $ / 10 $, lecture 0,10 $ ; Haiku 5.5 à
0,10 $ / 0,50 $ ; différé −50 % ; image OpenAI : sortie 30 $, image jointe 8 $, texte 5 $ le million ; 1 $ = 0,90 €.

Ce qui est déjà trouvé ou corrigé (rapports 01 à 04, relevé de Nadia, corrections de la branche) n'est pas redit, sauf
quand je vérifie qu'une correction est bien branchée partout.

---

## 1. Les chemins du moteur, appel par appel

Le moteur n'a pas d'appel « à lui » : chaque étape de SINA passe par l'un de ces chemins. Voici ce que chacun envoie, ce
qu'il garde en mémoire, ce qu'il attend en sortie et ce qui fait repayer.

| Chemin | Où | Modèle et effort | Ce qui part | Mémoire chez le fournisseur | Sortie | Ce qui fait repayer |
|---|---|---|---|---|---|---|
| Texte chez Anthropic, en direct | `llm.ts` `rawCall`, l. 489-647 | celui de la politique (`policy.ts` l. 46-74) ou celui demandé par l'appelant (`routeLlm`, l. 141-174) ; réflexion adaptative toujours allumée hors Haiku 4.5 (l. 543-545) | consigne générale, référence, contexte, fil, images, demande (`buildContent`, l. 289-316) ; images redimensionnées à 1 568 px au plus, JPEG 88 (l. 248-256) | un point sur la consigne générale, un sur la référence, un sur le contexte ou le fil, un sur les images fixes ou déjà livrées (au plus 4) ; une heure si `memoireLongue`, sinon 5 minutes (l. 277) | `max_tokens` = celui de l'appel, jamais sous 8 000 (l. 532) | réponse coupée : redemandée avec deux fois plus de place (l. 935 et 976) ; format refusé : une réparation qui renvoie la réponse (l. 978-981) |
| Texte en différé (moitié prix) | `llm.ts` `deferredMessage`, l. 456-485 | le même | le même, déposé seul dans un lot | une heure d'office (`avecMemoire`, l. 907) | la même | patience épuisée (10 minutes par appel, 30 par tâche, l. 435) : l'appel part en direct, au plein tarif |
| Texte chez OpenAI ou Gemini | `llm.ts` `otherCall`, l. 702-807 ; `text-providers.ts` | non utilisés par défaut (modèles non confirmés, `text-models.ts` l. 115-216) | — | — | — | — |
| Recherche sur Internet | `web-search.ts` `webResearch`, l. 149-233 | Sonnet 5.5 (`prefer: s.craft`), effort faible, réflexion adaptative | consigne de 600 jetons environ, la question, l'outil de recherche (8 recherches au plus) | **aucune** | 12 000 jetons au plus | jamais relancée ; une réponse inexploitable est payée et perdue |
| Images OpenAI | `media-providers.ts` `generateImageImpl`, l. 944-1010 ; `openai-images.ts` | GPT Image 2.6 Flare, qualité « high » | consigne, images jointes redimensionnées à 768, 1 024 ou 1 536 px | sans objet | une image | jamais relancée seule ; un secours seulement si rien n'a été facturé |
| Vidéos, Alibaba, fal, Gemini images | `media-providers.ts` | hors du parcours de SINA aujourd'hui (vidéos en dernier) | — | — | — | — |

Combien de fois par projet : tous les appels du projet passent par ces chemins (environ 63 réponses de SINA, la chaîne de
la marque, les angles, 45 à 70 sections du site, environ 46 images, 4 recherches sur Internet ; détail dans le rapport 01).

Relances qui repayent, vérifiées une à une :
- **Saturation (429)** : relancée deux fois dans la même réservation (`llm.ts` l. 381-382, 583-593) ; rien n'a été produit
  ni facturé. Sans coût.
- **Panne, délai, coupure** : jamais relancées (règle du propriétaire), coût maximal retenu (l. 596-611). Le kit
  d'Anthropic ne relance rien (`maxRetries: 0`, l. 221), ni celui d'OpenAI (`openai-images.ts` l. 56).
- **Reprise d'une tâche par la file** (`jobs.ts` l. 286-336) : chaque appel a une clé ; une réponse déjà payée est
  rendue sans repayer (`existingOperation`, `billing.ts` l. 390-414). J'ai vérifié tous les appels du parcours de SINA :
  ils ont tous leur clé. Seuls deux anciens moteurs n'en ont pas (`engine/blog.ts` l. 259, `engine/full-logo.ts` l. 54),
  hors du parcours.
- **Deux tâches en même temps** : la réservation vérifie la clé sous verrou (`billing.ts` l. 446-477) ; deux appels de même
  clé ne partent jamais tous les deux. Les tâches du site et de la marque ont une clé par tour. Rien à gagner.
- **Modèles de secours plus chers** : le routeur ne monte d'un cran qu'après un échec de qualité, et seulement pour des
  tâches que SINA n'emploie pas sous ce nom (rédaction, publications de l'ancien moteur) ; les appels de SINA donnent
  leur modèle (`prefer`) et ne montent jamais. Images : la route est imposée (OpenAI), aucun secours. Rien à gagner.

---

## 2. Les économies de la branche sont-elles branchées partout ?

| Économie | Où elle s'applique | Où elle manque |
|---|---|---|
| Mémoire d'une heure | la conversation de SINA (`loop.ts` l. 593) ; **tous** les appels en différé (`llm.ts` l. 907) : chaîne de la marque, angles, site, plan des publications | la recherche sur Internet n'a **aucun** point de mémoire (voir 3.1) ; les appels directs hors conversation gardent 5 minutes, ce qui leur suffit (appels proches les uns des autres) |
| Images comptées au jeton | toutes les voies OpenAI : création, retouche, maquettes, retouche par masque, image de départ des vidéos (`media-providers.ts` l. 600, 627, 1007, 1138) | rien |
| Sans aperçus payés | partout (une seule constante, `openai-images.ts` l. 23) | voir 3.8 : à surveiller |
| 16:9 et 9:16 dessinés directement | toutes les images passant par `openaiSize` (l. 373-378) | l'image de départ des vidéos reste en 2:3 et 3:2 (l. 1121) et l'ancienne retouche par masque aussi : hors du parcours de SINA aujourd'hui |
| Haiku 5.5 au niveau léger | la politique (`policy.ts` l. 39) | à vérifier dans l'administration : le réglage « ai.routes » en ligne ne doit pas garder Haiku 4.5 pour une tâche (il passerait avant la politique, `config.ts` l. 193-196) |

Conclusion : la mémoire d'une heure et le comptage au jeton sont bien branchés au-delà de la conversation. Un trou :
la recherche sur Internet.

---

## 3. Ce qui reste, constat par constat

### 3.1 La recherche sur Internet relit tout à chaque tour, sans mémoire

- **Où** : `web-search.ts` l. 158-162 (la demande n'a aucun point de mémoire) et l. 140-142 (ce qui serait lu en mémoire
  est compté au client au plein tarif).
- **Ce qui se passe** : une recherche fait plusieurs tours chez Anthropic (le modèle cherche, lit les pages, cherche
  encore, jusqu'à 8 recherches). D'après la documentation du fournisseur, les pages trouvées sont comptées en entrée à
  chaque tour où elles sont relues, et le fournisseur met lui-même en mémoire ce qui suit chaque résultat **seulement si
  la demande emploie déjà la mise en mémoire**. Aujourd'hui elle ne l'emploie pas : chaque tour repaie tout ce qui a été
  lu avant.
- **Les chiffres** : une recherche est comptée environ 0,30 € (rapport 01 : 1,20 € pour 4), soit environ 0,35 $ :
  8 recherches à 0,01 $ (0,08 $), une réponse d'environ 5 000 jetons à 10 $ (0,05 $), donc environ **0,21 $ d'entrée**,
  près de 105 000 jetons, pour une consigne de 600 jetons et une question courte. C'est le signe que les pages sont
  relues tour après tour.
- **Correction** : un point de mémoire sur la consigne de la recherche (ou la mise en mémoire automatique de la demande),
  pour que le fournisseur garde chaque résultat ; puis compter la part lue et la part écrite à leur vrai prix, comme
  `account()` le fait déjà (`llm.ts` l. 406-407).
- **Gain** (estimé, à vérifier) : si environ 60 % de l'entrée devient une lecture en mémoire, l'entrée passe de 0,21 $ à
  0,4 × 0,21 × 1,25 + 0,6 × 0,21 × 0,05 ≈ 0,11 $, soit **0,10 $ (0,09 €) par recherche, environ 0,35 € par projet** pour
  4 recherches. Vérification gratuite avant de toucher : dans le journal des appels (`ai_calls`, clé
  `preparation.research.web`), comparer les jetons d'entrée d'une recherche à la somme des pages gardées ; s'ils la
  dépassent de beaucoup, chaque tour relit tout. Si ce n'est pas le cas, le gain tombe à zéro (et la correction coûterait
  un quart de plus sur l'écriture : à ne pas faire).
- **Effet pour le client** : égal (mêmes pages, même modèle).

### 3.2 La recherche sur Internet peut s'arrêter en route, payée et jetée

- **Où** : `web-search.ts` l. 193 et 215-220.
- **Ce qui se passe** : chez Anthropic, une demande avec outil de recherche s'arrête après 10 tours avec la raison
  `pause_turn` ; il faut alors la renvoyer pour qu'elle continue. Le Studio ne connaît pas ce cas : il lit la réponse
  inachevée, n'y trouve pas l'objet attendu, garde zéro page, et la recherche est payée pour rien. La chaîne de la marque
  continue alors avec « recherche sans résultat » (`brand-chain.ts` l. 612) : moins bonne marque. Avec 8 recherches et le
  filtrage des pages par le fournisseur, 10 tours peuvent être atteints.
- **Correction** : sur `pause_turn`, renvoyer la demande avec ce qui a déjà été produit (le fournisseur reprend là où il
  s'est arrêté, sans refaire les recherches faites).
- **Gain** : à vérifier dans le journal (`stop_reason` des appels `preparation.research.web`). Chaque cas évité, c'est une
  recherche de 0,30 € qui sert au lieu d'être perdue, et une marque mieux nourrie. Non compté dans le total.
- **Effet** : meilleur (la marque s'appuie sur ce qui a été trouvé).

### 3.3 Le différé : l'attente des appels lancés ensemble est comptée plusieurs fois

- **Où** : `llm.ts` l. 457 et 476.
- **Ce qui se passe** : chaque tâche a 30 minutes de patience pour le différé. Chaque appel ajoute **son** temps d'attente
  au compteur de la tâche, même quand plusieurs attendent en même temps. Les 4 équipes de noms (`brand-chain.ts` l. 648,
  et l. 688 au second tour) et les 3 stratèges des angles (`angles-chain.ts` l. 345 et 382) attendent ensemble : 4 appels
  qui attendent 5 minutes consomment 20 minutes de patience en 5 minutes réelles. La suite de la chaîne (juge, planches,
  reprises, direction artistique, relecture des images, toutes sur Opus) part alors en direct, au plein tarif.
- **Indice réel** : à l'essai du lot 2, la marque en différé n'a coûté qu'environ 25 % de moins (2,53 € contre 3,36 €) et
  a duré exactement 30 minutes, la patience entière (`LOT-2-LA-MARQUE.md` l. 112).
- **Correction** : compter le temps réel pendant lequel au moins un appel de la tâche attend (un seul chronomètre par
  tâche), pas la somme des attentes.
- **Gain** (estimé) : textes de la marque et des angles comptés aujourd'hui environ 2,10 € (rapport 01 : 1,50 € et
  0,60 €). Si la moitié seulement passe au demi-tarif, le plein tarif est 2,10 / (1 − 0,5 × 0,5) = 2,80 € ; avec 70 %
  servis en différé : 2,80 × (1 − 0,5 × 0,7) = 1,82 €. **Environ 0,30 € par projet** (entre 0 et 0,50 €). À vérifier
  gratuitement : le compte rendu d'essai peut lire `deferredWaitedMs` et le nombre d'appels « différé » de la tâche dans
  l'administration (`memoire.ts`).
- **Effet** : égal. L'attente totale reste bornée à 30 minutes réelles ; ce n'est pas la patience allongée que le
  propriétaire a refusée pour le site, c'est la même patience comptée juste.

### 3.4 Le différé : les contrôles à 0,0005 € attendent leur tour comme les gros appels

- **Où** : `llm.ts` l. 525 et 580.
- **Ce qui se passe** : le moteur ne garde hors du différé que Haiku **4.5**. Depuis le passage à Haiku 5.5, les contrôles
  légers du site (contrôle de chaque photo, `gallery.ts` l. 182 et 243 ; regard sur les pages, `brand.ts` l. 1480 ; tous
  avec `CHECK_MODEL` = Haiku 5.5) partent en différé dans la tâche du site. Chacun attend un lot (au moins 15 secondes,
  souvent plus) pour gagner un dixième de centime, et mange la patience de la tâche avant la relecture des photos et ses
  reprises, sur Opus.
- **Correction** : ne jamais déposer en différé un appel Haiku 5.5 (ou tout appel dont le coût maximal est sous un
  centime).
- **Gain** : environ 0 € (le demi-tarif perdu sur 30 contrôles : 30 × 0,0002 $ ≈ 0,01 €) ; la patience sert aux appels qui
  valent la peine.
- **Effet** : meilleur. Le site arrive plus vite : 15 à 30 contrôles qui n'attendent plus leur lot, soit plusieurs minutes
  de moins quand la patience n'est pas déjà épuisée.

### 3.5 Le différé : un lot coupé ou un redémarrage fait repayer un appel déjà fait

- **Où** : `llm.ts` l. 460-485, `job-recovery.ts` l. 14-30, `llm.ts` l. 506-509.
- **Ce qui se passe** :
  - le numéro du lot déposé n'est gardé nulle part. Si le travailleur redémarre pendant l'attente (une mise en ligne
    pendant un site de plus d'une heure), la tâche s'arrête, le coût maximal est retenu, et « Réessayer » renvoie l'appel :
    or le lot a continué chez Anthropic et a été facturé. Payé deux fois. Même chose quand le lot annulé reste « en
    cours » plus de 5 minutes (l. 472) ;
  - un résultat de lot « en erreur » (l. 482) est traité comme incertain : coût maximal retenu, étape arrêtée. D'après la
    page des lots d'Anthropic, une demande en erreur n'est pas facturée (à vérifier sur la page officielle) ;
  - un refus net dans un lot (demande invalide) remonte comme une erreur ordinaire : la file de tâches relance la tâche
    deux fois pour rien (pas d'argent, du temps).
- **Correction** : garder le numéro du lot comme reçu du fournisseur (`saveProviderReceipt`, déjà employé pour les
  vidéos et les images), et à la reprise aller chercher la réponse déjà faite (lecture gratuite, réponses gardées 29
  jours) au lieu de renvoyer l'appel ; libérer la réservation sur un résultat « en erreur » ; arrêter net sur un refus.
- **Gain** : par incident, le prix de l'appel déjà payé (0,05 à 0,30 € pour un appel d'Opus) et le coût maximal qui n'est
  plus retenu sur le budget du client. La fréquence n'est pas connue : non compté dans le total.
- **Effet** : meilleur (une reprise sans nouvelle carte de prix).

### 3.6 La mémoire d'une heure payée sur des appels qui ne reviennent jamais

- **Où** : `llm.ts` l. 277, 533 et 907.
- **Ce qui se passe** : tout appel en différé écrit sa consigne en mémoire pour une heure (2 fois le prix d'entrée au lieu
  d'une fois sans mémoire). C'est juste pour les consignes qui reviennent (les 43 à 70 sections du site, les 3 planches,
  les reprises, la relecture des images). C'est perdu pour celles qui ne servent qu'une fois par projet : idées de marque
  (17 251 caractères, environ 5 750 jetons), juge des noms (3 150), composition des routes (3 470), directeur de création
  (3 570), relecture de la reprise (2 565), juge des angles, juge du plan des publications (40 822 caractères, environ
  13 600 jetons), et les appels uniques de la conception du site.
- **Correction** : l'appelant dit si sa tête revient ; sinon, aucun point de mémoire sur elle (une consigne qui ne revient
  pas se paie une fois, sans supplément).
- **Gain** : environ 40 000 jetons d'Opus par projet × 4 $ × (2 − 1) × 0,5 (différé) ≈ **0,08 $, soit environ 0,07 €**.
  Vérifiable dans le journal : les appels qui écrivent en mémoire et dont la consigne (`prompt_hash`) n'est jamais relue
  dans l'heure.
- **Effet** : égal.

### 3.7 Les réponses coupées et les réponses mal formées sont repayées en entier

- **Où** : `llm.ts` l. 824-829, 931-935, 952-983.
- **Ce qui se passe** : une réponse coupée faute de place est redemandée avec deux fois plus de place, et la première est
  payée pour rien (jusqu'à 12 000 jetons de sortie d'Opus : 0,24 $). La conversation de SINA est en format libre
  (`loop.ts` l. 612) : une réponse mal formée que le Studio ne sait pas réparer coûte une seconde réponse.
- **Correction** : seulement quand le journal montre que ça arrive (`stop_reason = 'max_tokens'` et `call_try > 0` par
  clé de consigne) : partir directement de la place maximale pour cette consigne (seuls les jetons produits sont
  facturés ; la place réservée est plus grande pendant l'appel), ou passer la conversation en sortie au format imposé.
- **Gain** : à mesurer. Non compté.
- **Effet** : égal ou meilleur (moins d'attente).

### 3.8 Les images sans aperçus : connexion muette, à surveiller

- **Où** : `openai-images.ts` l. 4-6 et 23.
- **Ce qui se passe** : les deux aperçus ont été retirés aujourd'hui (0,006 $ par image). Or ils avaient été mis pour
  qu'une connexion ne reste pas muette une à deux minutes : un relais coupe une connexion muette (« 502 upstream request
  failed », essai réel). Sans aperçu, l'image arrive en un seul envoi à la fin. Une image coupée est perdue, son coût
  maximal retenu, et le client doit la refaire.
- **Correction** : rien à changer tout de suite ; surveiller dans le journal les erreurs « Flux OpenAI interrompu » ou
  « terminé sans image finale » ; si une seule apparaît, remettre un aperçu (0,003 $ par image).
- **Gain** : protection. Une image perdue coûte plus (environ 0,11 € et une reprise) que ce que les aperçus coûtaient sur
  tout un projet (environ 0,25 €).
- **Effet** : égal, tant qu'aucune coupure n'apparaît.

### 3.9 Petits réglages sans enjeu

- **Niveau léger sans effort** (`policy.ts` l. 88) : Haiku 5.5 réfléchit à l'effort moyen pour le tri et le classement.
  « Faible » suffirait ; gain inférieur au centime.
- **Appels lancés ensemble** (équipes de noms, stratèges des angles) : ils ont chacun leur consigne, puis le même dossier ;
  la consigne passant toujours en premier, rien n'est partagé en mémoire. Pour partager, il faudrait lancer le premier,
  attendre, puis les autres : en différé, cela ajoute un tour d'attente, pour environ 0,07 € par projet. **Je ne le
  recommande pas** (l'attente du client s'allongerait).
- **Taille des images relues** : 1 568 px au plus (`llm.ts` l. 252), sous le maximum d'Opus 5.5 (2 576 px) ; une image de
  1 024 × 1 536 fait environ 2 100 jetons. La réduire baisserait la lecture du texte dessiné. À garder.
- **Plafonds de sortie hauts** : chez Anthropic seuls les jetons produits sont facturés ; un plafond haut ne coûte rien,
  il ne pèse que sur la réservation (voir 4). Rien à gagner.
- **Délais** : le flux d'Anthropic n'est pas coupé par le délai de 10 minutes du kit (il ne court que jusqu'au début de
  la réponse) ; les images OpenAI ont 5 minutes entre deux morceaux de réponse ; le différé a 10 minutes par appel. Aucun
  délai trop court trouvé.

---

## 4. Le compteur : ce qui est compté au client contre ce qui est payé

Ces points ne changent pas la facture du fournisseur ; ils changent le pourcentage du budget d'IA que voit le client.

| Constat | Où | Effet sur le client | Correction |
|---|---|---|---|
| Un résultat incertain retient le **coût maximal** (réponse au plafond, entrée au tarif d'écriture), rendu seulement après rapprochement à la main avec la facture | `billing.ts` l. 545-559 ; `llm.ts` l. 600 | jusqu'à 0,70 € retenus pour un appel d'Opus qui a peut-être coûté 0,05 € | retenir ce que le flux a déjà montré (jetons d'entrée au début de la réponse, jetons de sortie reçus) plus une marge, au lieu du plafond entier ; garder le reste comme aujourd'hui |
| Une surcharge d'Anthropic (529, renvoyée avant toute réponse) est comptée comme incertaine | `llm.ts` l. 596-600 | coût maximal retenu pour un appel que le fournisseur n'a pas traité | libérer la réservation ; garder l'arrêt sans relance (règle du propriétaire) |
| Un lot « en erreur » est compté incertain | `llm.ts` l. 482 | idem | voir 3.5 |
| La recherche sur Internet compte la part lue en mémoire au plein tarif | `web-search.ts` l. 140-142 | trop compté, faiblement aujourd'hui | compter au vrai prix (voir 3.1) |
| Les échecs du Studio sont débités au client : image refusée et refaite, réponse réécrite après la relectrice, réponse coupée redemandée, réparation de format | `media-providers.ts` l. 319 (« le coût réel reste comptabilisé ») ; `llm.ts` l. 931-983 | le client paie, en pourcentage de son mois, les reprises que le Studio s'impose pour la qualité | décision du propriétaire : les compter au Studio rendrait le mois du client plus long, sans changer la facture du fournisseur |
| Taux du dollar : 0,86 par défaut (`config.ts` l. 264), contre 0,90 dans les consignes | réglage `billing.usdToEur` | si le vrai taux est 0,90, le Studio compte au client 4 % de moins que ce qu'il paie | vérifier le réglage en ligne ; rien à changer dans le code |

---

## 5. Les journaux : ce qui manque pour mesurer

Le journal des appels (`ai_calls`, `trace.ts` l. 139-195) garde déjà, par appel : modèle demandé et servi, jetons d'entrée,
lus et écrits en mémoire, sortie, raison d'arrêt, effort, essai, étape, durée, coût. Il manque :

1. **La part écrite pour une heure** : le fournisseur la donne (`cache_creation.ephemeral_1h_input_tokens`), le Studio
   la compte bien (`llm.ts` l. 406), mais ne la garde pas. Conséquence : l'administration calcule « ce que la mémoire a
   fait gagner » avec 1,25 pour toutes les écritures (`memoire.ts` l. 245), alors que la conversation et tout le différé
   écrivent à 2. Le gain affiché est trop beau (de 0,75 × les jetons écrits × le prix d'entrée).
2. **Le différé raté** : un appel qui devait partir en différé et part en direct (patience épuisée, lot annulé, dépôt
   refusé) n'est marqué nulle part ; seul le différé réussi l'est, dans un texte (`routing_reason`). Impossible de compter
   ce qui retombe au plein tarif (3.3, 3.4). L'attente de chaque appel en différé n'est gardée qu'en mémoire du processus.
3. **Les images** : ni la taille, ni la qualité, ni le nombre d'images jointes, ni la part des jetons d'entrée qui vient
   des images jointes (8 $) contre le texte (5 $). Le reçu de la demande existe (`ImageRequestReceipt`, l. 752) mais
   n'est pas enregistré. Impossible de mesurer ce que coûtent les images jointes (logo, planche des 50 logos aimés).
4. **Une empreinte de chaque partie gardée en mémoire** (référence, contexte, images fixes), pas seulement de la consigne
   générale (`promptHash`, `llm.ts` l. 567) : c'est ce qui dirait pourquoi une mémoire a été manquée.
5. **La place demandée** (`max_tokens`) : pour savoir quelles consignes frôlent leur plafond (3.7).

Aucun de ces ajouts ne coûte un appel.

---

## 6. Pas vérifié

- Que la recherche sur Internet relit bien toutes les pages à chaque tour (3.1) : à lire dans les reçus d'une recherche
  déjà faite.
- Combien de recherches s'arrêtent sur `pause_turn` (3.2).
- La part réelle des appels de la marque et des angles servis en différé (3.3).
- Qu'un lot « en erreur » n'est jamais facturé, et qu'une surcharge 529 ne l'est pas (4) : pages officielles à relire.
- La part lue en mémoire des 43 à 70 sections du site servies en lots (déjà signalé au rapport 01).
- Aucune facture d'Anthropic ni d'OpenAI lue.

---

## Gains restants, du plus gros au plus petit

| Correction | Euros par projet | Effet sur l'expérience |
|---|---|---|
| Recherche sur Internet : un point de mémoire pour que les pages ne soient pas repayées à chaque tour, et la part lue comptée à son prix (3.1) | ≈ 0,35 € (à vérifier dans les reçus d'abord) | égale |
| Différé : compter le temps réel d'attente de la tâche, pas la somme des appels lancés ensemble (3.3) | ≈ 0,30 € (entre 0 et 0,50 €) | égale (toujours 30 minutes au plus) |
| Pas de mémoire d'une heure sur les consignes qui ne servent qu'une fois (3.6) | ≈ 0,07 € | égale |
| Contrôles Haiku 5.5 hors du différé (3.4) | ≈ 0 € | meilleure (site plus rapide) |
| Recherche arrêtée sur `pause_turn` : la reprendre au lieu de la jeter (3.2) | à vérifier (0,30 € par recherche sauvée) | meilleure (marque mieux nourrie) |
| Numéro du lot gardé, réponse reprise après coupure ou redémarrage ; lot « en erreur » libéré (3.5) | 0 € probable, 0,05 à 0,30 € par incident | meilleure |
| Réponses coupées ou mal formées : partir de la place maximale là où le journal le montre (3.7) | à mesurer | égale ou meilleure |
| Compteur : retenir moins que le plafond sur un résultat incertain, libérer la surcharge 529 (4) | 0 € réel ; budget du client mieux tenu | meilleure |
| Journaux : écriture d'une heure, différé raté, détail des images (5) | 0 € (sert à mesurer) | égale |
| Aperçus d'images : surveiller les coupures (3.8) | protection | égale |
| **Total chiffré** | **≈ 0,70 € par projet** | jamais pire |
