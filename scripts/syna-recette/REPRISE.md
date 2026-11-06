# Reprise SYNA (#492) : la logique de nos discussions

Ce document transmet à une nouvelle session les décisions prises avec l'utilisateur. **À lire en entier avant toute action.** Le dépôt est public : aucun secret, aucune donnée privée ici.

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
6. **Maquettes** : une maquette est une **image créée par IA qui montre tout le site**, toutes les pages concernées, sur **1 grande planche par maquette**. Outil `site.mockup_images`.
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
