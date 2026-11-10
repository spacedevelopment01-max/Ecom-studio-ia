# Reprise SYNA (#492) : la logique de nos discussions

Ce document transmet à une nouvelle session les décisions prises avec l'utilisateur. **À lire en entier avant toute action.** Le dépôt est public : aucun secret, aucune donnée privée ici.

## 0. ÉTAT ACTUEL (10 novembre 2026) — à lire d'abord ; les sections 2 à 10 sont l'historique

Les sections suivantes racontent les décisions du 6 au 8 novembre ; **là où elles contredisent ce paragraphe, ce
paragraphe et `CLAUDE.md` l'emportent**. Les exigences du propriétaire, numérotées, sont dans
`docs/syna/EXIGENCES-PROPRIETAIRE.md` (référence des audits et des tests).

- **Parcours** : étapes 0 à 8 ouvertes (`READY_STEPS`), dans l'ordre ; 9 à 13 pas encore ouvertes. Un projet créé
  dans le Studio avant son fil est « hors parcours » (jamais remis aux questions de départ ni verrouillé).
- **Dépenses** : tout outil payant passe par la **carte d'accord** du fil (prix probable et plafond en % du budget IA,
  jamais en euros) ; rien n'est lancé sans le clic du client ; « Arrêter » annule aussi les tâches en attente.
- **Modèles** : réponses simples par le moteur local gratuit, puis Haiku ; **Sonnet aux étapes 6 et 7 (thème sur
  mesure)**, choix du propriétaire du 10 novembre ; identités par Claude ; **logos : OpenAI seul, 3 logos pour
  l'identité choisie** (10 novembre) ; images du site : voir `CLAUDE.md`.
- **Étape 6** : le client choisit « thème du Studio » ou « thème sur mesure ». Sur mesure : famille (Classique ou
  Moderne), ambiance, puis **le Studio conçoit tout le site** (`custom.design`) avec la bibliothèque de sections ;
  contrôle bloquant `checkCustomTheme` (pages obligatoires, 8 et 7 sections, Shopify sans commande, aucun faux compte à
  rebours ni offre d'exemple, sections « seulement pour » un genre, photos en double) ; montage à la marque
  (`custom.build`) ; **SINA voit l'accueil capturé** (ordinateur et téléphone, `custom-theme/shots.ts`) et les photos
  qu'elle vient de créer. **Bloc d'achat** rempli avec les vraies données du produit (`custom-theme/buy-block.ts`,
  `scripts/section_buy_fix.py`). Photos impossibles à inventer (réalisations, avant/après d'artisan, photos de
  clients, biens) : jamais créées, cadre « Photo à fournir ».
- **Étape 8** (thème du Studio) : textes réécrits avec les mêmes règles d'écriture que le sur mesure ; jamais de
  fausses réalisations ni de fausse carte.
- **Anciennes maquettes** (`mockup.*`) : seulement pour les projets déjà commencés avec elles ; leurs outils sont
  cachés aux nouveaux parcours, comme les anciens raccourcis (`brand.create`, `site.build`, `pilot.run`…).
- **Restent ouverts** (à décider avec le propriétaire) : modèle d'images des photos du thème sur mesure (aujourd'hui
  celui des anciennes maquettes, OpenAI ; CLAUDE.md dit Qwen pour les images) ; détourage des photos d'ouverture de la
  famille Moderne ; ambiance claire / sombre gardée dans le thème ; 11 sections pas encore inversables ; mise en
  boutique Shopify du thème sur mesure (étape 7).

## 1. Comment travailler avec l'utilisateur

- Réponds en français, de façon courte et claire. L'utilisateur est débutant : explique simplement chaque étape où il doit agir, une à la fois.
- **Va lentement.** Il l'a dit : « tu veux tellement faire les choses vite que rien ne se fait correctement ». Travaille une étape à la fois. Montre le résultat (capture d'écran) et attends sa validation avant de passer à la suite.
- Il veut **voir** les résultats, pas seulement les lire.
- Ne fais **aucune dépense sans son accord**. Avant chaque appel payant, annonce le coût estimé.
  - Plafond pour les essais Claude : 20 €. Il dispose de 200 € de crédit API Anthropic.
  - Les essais OpenAI ont déjà coûté 10,57 €.
- N'ajoute aucun nouvel abonnement ni service payant.
- Ne demande jamais une clé ou un mot de passe dans la conversation. N'affiche jamais une clé.
- Commits en français, sans identifiant de modèle d'IA. Pas de réécriture d'historique ni de suppression de branche sans accord. Ne touche pas à Contretemps.
- Utilise l'API REST de GitHub (`gh api`), pas GraphQL. Ne contourne jamais la CI.
- Aucun kit privé, média privé ou capture de session réelle dans le dépôt : il est public.

## 2. Ce que doit être SYNA

- SYNA doit se comporter **exactement comme une conversation « ChatGPT Work »**.
- Elle doit pouvoir **tout modifier dans les projets du Studio, sur demande**.
- Elle doit fonctionner **de A à Z, dans le bon ordre** :

1. Photo du produit (ou description du service)
2. Analyse
3. Recherche web (OpenAI `web_search` ou Claude `web_search`)
4. **5 angles marketing**
5. **Identité visuelle** : nom, logo, slogan, couleurs, polices, toute l'image de marque. Elle vient **avant** le thème.
6. **Maquettes** : une maquette est une **image créée par IA qui montre tout le site**, toutes les pages concernées, sur **1 grande planche par maquette** — précisé le 6 novembre : **plusieurs images par maquette si c'est mieux** (lisibilité d'abord). Outil `site.mockup_images`.
7. L'utilisateur **choisit** une maquette.
8. **Claude code la maquette choisie** en thème. Étape non construite. Piste : `src/lib/engine/custom-theme.ts` avec l'image en référence. À construire seulement après accord.
9. Plus tard : les vidéos (fal).

## 3. Les angles marketing

- **Un angle marketing est émotionnel** : un désir, une peur, une fierté, une appartenance. Ce n'est jamais une caractéristique technique, comme « la matière d'une fermeture éclair ».
- La règle vaut pour **toutes** les recherches d'angles, **prestations de services comprises**.
- Les angles ne viennent **jamais** d'AliExpress ni des autres places de marché : elles sont exclues des sources.
- Chaque angle s'appuie sur des sources réelles (liens renvoyés par l'outil de recherche), avec une `emotion` et des `proofsToConfirm`.
- Les angles doivent couvrir des territoires émotionnels distincts. Aucun prix de concurrent.
- Exemple validé par l'utilisateur (« C'est mieux ») : pour un sac de voyage, des angles comme la liberté de partir, la fierté d'être organisé ou la sérénité du voyage. Pas « tissu résistant ».

## 4. Répartition des fournisseurs d'IA

- **Toutes les images de SYNA : OpenAI.** Logos en **qualité moyenne** par défaut : une haute qualité coûtait 1,22 € par logo, ce que l'utilisateur a jugé trop cher.
- **Tout le reste (textes, réflexion, recherche) : Claude (Anthropic).**
- **Vidéos : fal**, plus tard.
- La clé Claude arrive dans le Studio de test par la variable d'environnement `STUDIO_ANTHROPIC_KEY`. C'est la « solution 1 » choisie par l'utilisateur, lue par `lancer-agent.mts`.

## 5. Règles de fraîcheur décidées

- **« Garder l'angle »** : quand un simple fait change (prix, détail), l'angle choisi n'est **pas** périmé (`updateOfferFacts`, empreinte v2 `coreOfferBase`).
- L'identité visuelle ne périme pas non plus l'angle.
- Seul un changement du **cœur de l'offre** (nom, catégorie, secteur, public) oblige à refaire la recherche.
- Ordre de travail choisi : « Test d'abord, règle ensuite ».

## 6. Où on en est

Fait, testé et poussé :
- recherche web OpenAI et Claude ;
- angles émotionnels sourcés ;
- re-préparation d'angle gratuite ;
- règles de fraîcheur ;
- outil de maquettes images ;
- logos en qualité moyenne ;
- robustesse des erreurs de SYNA ;
- prix stockés en centimes.

**Jamais vu en réel** :
- l'identité visuelle et le logo complets générés par SYNA ;
- les maquettes images IA ;
- l'étape « Claude code la maquette ».

L'ancien projet de test était incohérent : il faut repartir d'un **projet neuf**.

Tests : la série liée passe. Trois échecs existaient déjà avant ce travail :
- `fraise-theme` et `traverse` : photos absentes d'une copie partielle ;
- `isolation-forfait-familles`.

## 7. Prochaines étapes, dans l'ordre, avec validation à chaque fois

1. Vérifier **sans dépense** que la clé Claude est lue et que le Studio de test démarre : `scripts/syna-recette/lancer-agent.mts`.
2. Régler les textes sur Claude dans l'administration, après confirmation des tarifs. Le prix par recherche de `anthropic:web_search` n'est pas vérifié.
3. Sur un projet neuf : l'identité visuelle d'abord. Montrer le logo, le nom, le slogan et les couleurs en captures.
4. Puis 1 maquette image. Montrer la capture.
5. Puis, avec accord, construire l'étape « Claude code la maquette choisie ».

Outils de recette dans ce dossier :
- `lancer-agent.mts` : Studio privé ;
- `chat.cjs` / `fil.cjs` : parler à SYNA et lire le fil ;
- `banc-angles.mts` : banc d'essai des angles.

## 8. Décisions du 6 novembre 2026 (nouveau parcours de création d'un projet)

**Consigne n° 1 : la qualité.** Logos, textes (copywriting), référencement (SEO), images et thèmes doivent être au niveau
des meilleurs sites de 2026. Une finition « années 2000 » ne doit jamais être montrée au client. On **planifie avant de
construire**, pour ne pas refaire dix fois la même chose. L'utilisateur peut fournir autant d'exemples que nécessaire.

Parcours voulu, tout piloté par SYNA (elle pose ses questions au lieu d'inventer) :
0. SYNA s'ouvre à la création du projet et pose toutes les questions utiles ; elle peut en reposer en cours de route.
1. 3 identités de marque **vraiment différentes** (nom, slogan, couleurs, polices…) — Claude.
2. 3 logos, un par identité, **chacun différent** et adapté à son identité — images.
3. Après validation de l'identité par le client : image de marque complète (déclinaisons du logo, planche, charte).
4. 5 angles marketing émotionnels, choix du client — Claude.
5. Toute l'activité selon l'angle choisi (infos de l'entreprise, stratégie, prix…), questions si besoin — Claude.
6. Choix : un de nos thèmes ou création. Création = 3 maquettes images du site complet, mises en page vraiment
   différentes, identité respectée, textes émotionnels et SEO sur le produit ou service du projet.
7. Maquette choisie → thème codé à l'identique (Claude), images par l'IA, sections modifiables dans le Studio, Shopify et
   autres plateformes, toutes les pages (produits, CGV…), en-tête, pied, responsive, liens qui marchent, aucune image
   en double, produits créés dans l'onglet Produits et reliés au site. Le blog vient plus tard (étape 12).
8. Ou un de nos thèmes : images et textes adaptés (SEO, textes émotionnels), mêmes exigences qu'au 7.
9. 3 groupes de publications (chaque taille de réseau), groupes sans ressemblance, titre + texte + hashtags, réseau indiqué.
10. Pareil pour les publicités images.
11. Calendrier : nombre de posts par jour, sur 7, 15 ou 30 jours ; 1 post décliné par format ; sujets variés (produit,
    conseil, avis, service, erreurs à éviter…) ; heures vues avec le client ; emojis si le client le veut ; aucune image
    répétée, aucune image reprise du thème. **Pour l'instant sans publication automatique** (accords des plateformes à
    obtenir par l'utilisateur) : le client sait quel jour publier quelle image avec quel texte.
12. 2 articles de blog reliés au site (liens prévus dans le thème). Vidéos publicitaires : plus tard.
13. Tous les fichiers rangés dans le Studio.

Images : l'utilisateur avait choisi Qwen ; SYNA est passée sur OpenAI. **À comparer en réel (coût et qualité)** avant de
trancher. Prix relevés : Qwen-Image 3.0 Pro ≈ 0,081 $ l'image ; OpenAI GPT Image 2.5 ≈ 0,05 $ (moyenne) à 0,09 $ (haute).

Estimation donnée à l'utilisateur pour un projet complet (calendrier de 14 posts) : 28 à 56 € avec création de maquettes,
20 à 41 € avec un de nos thèmes. À confirmer par des essais réels.

À corriger après accord : plafond des images OpenAI à 0,10 $ (0,09 $ est un peu juste), plafond à part pour les grandes
planches de maquettes (jusqu'à 0,14 $ en haute qualité).

## 9. Décisions du 6 novembre 2026 (suite)

- **SYNA s'appelle désormais SINA** (nom affiché partout : interface, textes, documents). Les noms internes du code
  (dossiers `syna-agent`, tables, branches) restent inchangés pour ne rien casser.
- **Maquettes : aucune page oubliée**, liste adaptée au type de projet (voir `docs/syna/PARCOURS-CREATION.md`, étape 6).
  Une maquette peut compter plusieurs images si c'est plus lisible.
- **Boutiques (produits)** : pages jusqu'au **panier** compris. Le paiement se fait sur la plateforme (Shopify : page de
  paiement de Shopify, non modifiable par un thème ; WooCommerce et PrestaShop : la page de paiement prend le style du
  thème exporté, à vérifier pendant la construction).
- **Sites de services** : publiés par le Studio avec le **domaine du client** relié dans le Studio (`src/lib/sites/`,
  domaine déjà possédé par le client ; le Studio n'achète ni ne génère de nom de domaine — vérifié dans le code le
  6 novembre).
- **Exports Wix et Squarespace retirés** (ce n'étaient que des « kits de reprise ») : restent Shopify, WooCommerce,
  PrestaShop, et la publication par le Studio pour les services.
- Ordre de construction choisi : tout construire avant les essais réels, en commençant par l'étape 7 (la plus risquée),
  testée gratuitement puis sur une planche de Thomas (APLAT) comparée au vrai thème, avec accord sur le prix.

## 10. État au 7 novembre 2026 (nuit) — parcours EN PAUSE jusqu'à la consigne de l'utilisateur

- **Étape 0** terminée et vérifiée en réel (essais 0 à 8).
- **Étape 1 (3 identités)** construite et essayée en réel sur le client fictif « confitures de la Drôme »
  (Studio privé, données `agent492-e8`, compte `boutique492@example.com`) : 5 propositions, dernière avec les noms
  « Tour de Main », « Heure Dorée », « Pot Commun ». **Le client n'a pas encore choisi** : reprendre par le choix
  (ou un mélange) pour vérifier identity.choose en réel, puis l'étape 2.
  - Règles de l'utilisateur appliquées et contrôlées : trois fonds (blanc, dégradé de couleurs, sombre ; jamais
    beige ni crème), palettes à cinq rôles calées sur ses 50 palettes, boutons de teintes différentes, **méthode de
    nommage du 7 novembre** (un détail réel du métier + une deuxième lecture), seule référence des noms
    (`src/lib/syna-agent/brand-references.ts`). Option « nouveaux noms seulement » (couleurs et polices gardées).
  - Dépense Claude totale des essais : environ 5,8 € sur 20 €.
- **Étapes 6, 7 et 11 préparées dans le code, sans aucun appel payant** (tests simulés) : maquettes sur mesure
  (`src/lib/syna-agent/mockup-code/`), site codé d'après la maquette (tâche `syna.mockup.code`), calendrier manuel
  (`src/lib/syna-agent/calendar.ts`). Outils enregistrés ; consignes prêtes (`STEP_GUIDES`) ; ces étapes ne sont pas
  encore ouvertes (`READY_STEPS` = 0 et 1) : elles s'ouvriront dans l'ordre, après leurs essais réels.
- Questions ouvertes à poser à l'utilisateur : voir `docs/syna/PARCOURS-CREATION.md` (étapes 7 et 11).
