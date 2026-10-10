# Génération OpenAI en flux intégrée à E-COM STUDIO IA

Branche : `claude/openai-real-brand-test` (non fusionnée).

Aucun nouvel appel payant n'a été fait pour ce travail. Tous les tests utilisent :
- le vrai logo OpenAI déjà payé (`reports/openai-real-brand-test/direct-2026-10-10T12-39-18-157Z.png`) ;
- un faux serveur OpenAI local, qui parle exactement comme l'API.

## 1. L'essai réel qui a fonctionné (rappel)

| | |
|---|---|
| Modèle | `gpt-image-2` |
| Paramètres | 1024×1024, qualité haute, PNG, fond opaque, 1 image |
| Méthode | réponse **en flux** avec **2 aperçus** (`stream: true`, `partial_images: 2`) |
| Déroulé | aperçu 1 à 10,6 s, aperçu 2 à 50,6 s, image finale à 92,0 s |
| Jetons facturés | 209 en entrée (texte), 7 177 en sortie (image) |
| Coût réel calculé | 0,2164 $ ≈ **0,19 €** (tarifs publics : 5 $ / M en entrée, 30 $ / M en sortie) |
| Fichier reçu | 924 623 octets, conservé tel quel |

## 2. Diagnostic de l'ancien problème

1. **Connexion muette coupée (502).**
   - Le studio demandait l'image sans flux. La connexion restait silencieuse 1 à 2 minutes pendant que l'image se dessinait.
   - Un proxy ou un hébergeur coupe une connexion muette aussi longue. C'est ce qui a donné « 502 upstream request failed » lors du premier essai.
   - Avec le flux, des données arrivent pendant la génération (aperçus à 10 s et 50 s) : la connexion reste vivante.
2. **Un 502 était traité comme « non facturé ».**
   - Toute erreur avec un code HTTP rendait la réservation et autorisait le modèle de secours.
   - Or un 502 peut arriver après que l'image a été générée et facturée : cela pouvait payer deux fois.
3. **Proxy ignoré par Node.**
   - Sans `NODE_USE_ENV_PROXY=1`, Node ne passait pas par le proxy de l'environnement (Claude Cloud) : « ENOTFOUND api.openai.com ».
4. **Identité construite à côté du logo, pas autour.** Constaté en passant le vrai logo dans le studio (voir § 5) :
   - couleurs du site bleu et violet, alors que le logo est anthracite et sable ;
   - « symbole seul » remplacé par un « S » générique dans un carré ;
   - fichier reçu d'OpenAI non conservé tel quel (seule la version détourée l'était).

## 3. Ce qui a changé

### Génération (moteur multimédia existant, aucun second système)

- **Nouveau fichier `src/lib/ai/openai-images.ts`.** Il reprend exactement la méthode de l'essai réel :
  - flux avec 2 aperçus quand le modèle le permet (catalogue : `gpt-image-1`, `gpt-image-2`) ;
  - réponse classique sinon, ou si l'administration coupe le flux (réglage `ai.media.openaiStream`) ;
  - proxy de l'environnement respecté automatiquement (`HTTPS_PROXY` / `NO_PROXY`), même sans `NODE_USE_ENV_PROXY`. Sans proxy (Codespace, serveur de production) : connexion directe ;
  - aucune nouvelle tentative du client OpenAI (`maxRetries: 0`) ;
  - flux coupé ou terminé sans image : erreur « flux interrompu », traitée comme facturation incertaine.
- **`src/lib/ai/media-providers.ts`** (adaptateur existant, Router V2 inchangé) :
  - `generateImage` et `openaiScene` passent par ce nouvel appel ;
  - cela couvre les logos, les images produit, les décors et ambiances, les visuels publicitaires et sociaux, les images des boutiques et les retouches produit ;
  - **vidéo non modifiée** (y compris la personne des vidéos UGC).
- **Règle de facturation corrigée.**
  - Seul un refus net (codes 4xx, sauf 408) rend la réservation et autorise le secours.
  - Une erreur 5xx (dont le 502) ou une coupure du flux retient le coût maximal, sans seconde génération ni secours.
- **Coût maximal réservé avant l'envoi.** Il compte maintenant les 2 aperçus (≈ 100 jetons chacun) pour les modèles facturés au jeton.
- **Inchangé :**
  - plafonds de 40 % HT de l'abonnement et de 50 % HT des recharges ;
  - réservation atomique ;
  - devis et accord avant la série ;
  - traçabilité des appels.
- **`src/lib/ai/media-models.ts`** : nouvelle capacité `stream` dans le catalogue.

### Onglet Marque et suivi en direct

- **`src/lib/logo-v2/engine.ts`** :
  - la génération transmet son avancement direction par direction : demande envoyée, aperçus reçus, image reçue, image sauvegardée ;
  - le fichier reçu du fournisseur est conservé **à l'identique**, en plus de la version au fond retiré (rôle `logo-v2-original`).
- **`src/lib/logo-v2/live.ts`** : l'avancement est enregistré en base. Il reste affiché après un rechargement.
- **`src/components/studio/logo-v2-panel.tsx`** :
  - 5 étapes : **Brief et directions → Génération OpenAI → Réception et sauvegarde → Contrôle qualité → Résultat** ;
  - sous chaque direction : « demande envoyée à OpenAI, réponse en flux », « aperçu 2 reçu (50 s) », « image reçue et sauvegardée » ;
  - lien « Fichier original reçu » sur chaque proposition.
- **Reprise sans repayer.**
  - Une image reçue est un point de reprise de la tâche, déjà en place et vérifié ici.
  - Si le worker s'arrête puis reprend, l'image sauvegardée est réutilisée, sans nouvel appel.

### Identité de marque construite autour du logo choisi

- **Nouveau fichier `src/lib/logo-v2/identity.ts`** :
  - **couleurs du logo mesurées** (codes HEX exacts) qui deviennent la palette de la marque et du site. Une palette validée par le client n'est jamais remplacée ;
  - **symbole seul découpé dans le vrai logo** (au-dessus du nom, ou à sa gauche), carré 1024 px. Il sert de favicon, d'avatar et de tampon. Pour un logo sans symbole (nom seul), la version simplifiée du studio reste utilisée.
- **`src/lib/logo-v2/choose.ts`** : nouveaux exports **WebP** (logo, version fond sombre, symbole). Le SVG reste fourni seulement s'il est fidèle : il ne l'est pas pour ce logo texturé, et il n'est donc pas proposé.
- **`src/lib/logo-v2/brand-board.ts`** : la planche indique « Symbole seul, tiré du logo ».
- **`src/components/studio/tab-marque.tsx`** :
  - planche d'identité affichée ;
  - téléchargements : PNG, WebP, fond sombre, noir, blanc, symbole, favicon, planche.

## 4. Preuve que c'est le moteur existant qui travaille

- Le parcours complet du test `tests/openai-streaming.test.ts` (dernier test) utilise :
  - la vraie méthode du studio `realLogoV2Ai(...).drawArtwork` ;
  - `logoArtworkImage`, qui passe par `generateImage` (`media-providers.ts`), puis `openaiImage` (flux) ;
  - le vrai SDK OpenAI, connecté au faux serveur, qui renvoie le vrai logo.
- Seules la proposition des directions et la relecture qualité sont simulées : elles demandent un modèle de texte payant.

## 5. Vrai logo passé dans le studio : défauts trouvés et corrigés

Script gratuit : `scripts/identity-from-real-logo.ts`. Il utilise une base de démonstration séparée, sans IA.

| Étape | Avant | Après |
|---|---|---|
| Enregistrement | seule la version détourée (619 Ko) | **+ fichier reçu identique** (924 623 octets, vérifié octet par octet) |
| Affichage | image détourée, dessin intact | inchangé, + lien « Fichier original reçu » |
| Palette | `#446274` (bleu), `#747FB4` (violet) : sans rapport | **`#38393E` anthracite, `#CBA173` sable**, mesurées dans le logo |
| Symbole seul | « S » générique dans un carré | **monogramme SB avec toit et truelle**, découpé dans le logo |
| Favicon / avatar | « S » générique | symbole du logo |
| SVG | non proposé (63 % en 4 aplats : texture) | inchangé : PNG haute définition = livrable, WebP en plus |
| Planche | bleu et violet, « S » générique | cohérente avec le logo (voir ci-dessous) |

Planche créée à partir du vrai logo : `reports/openai-real-brand-test/identite/brand-board-planche-identite.png`.

Tous les fichiers produits sont dans `reports/openai-real-brand-test/identite/` :
- logo principal PNG et WebP ;
- fond sombre PNG et WebP ;
- noir, blanc ;
- symbole PNG et WebP ;
- favicon ;
- planche ;
- fichier original.

## 6. Tests

| Vérification | Résultat |
|---|---|
| TypeScript (`npx tsc --noEmit`) | OK |
| Tests automatiques (`npx vitest run`) | **128 fichiers, 1 101 tests réussis** |
| Compilation de production (`next build`) | OK |
| Navigateur, de bout en bout (`scripts/e2e-logo-progress.ts`) | **20/20 vérifications réussies** |

**Mise en place du test navigateur :**
- vrai site compilé, vrai worker, vraies tâches de fond ;
- faux OpenAI local (`scripts/fake-ai-server.mjs`) qui renvoie **le vrai logo OpenAI** en flux ;
- modèle des logos : GPT Image 2.

**Ce que vérifie le test navigateur :**
- le devis est affiché avant tout appel ;
- les aperçus du flux sont visibles en direct (« aperçu 2 reçu ») ;
- les 5 étapes sont cochées ;
- les demandes partent en flux avec 2 aperçus, 3 images, aucune relance ;
- tout reste affiché après un rechargement ;
- refus du fournisseur : chaque direction est en échec avec la vraie raison, rien n'est coché en vert ;
- tâche échouée : l'erreur est affichée ;
- **choix du vrai logo** : déclinaisons, planche, symbole seul et exports WebP visibles dans l'onglet Marque ;
- pas de débordement sur téléphone ;
- 0 erreur JavaScript.

**Nouveaux tests automatiques :**
- `tests/openai-streaming.test.ts`. Il utilise le vrai SDK OpenAI, un faux serveur HTTP et le vrai logo :
  - flux : 2 aperçus puis l'image finale, original identique, coût tracé ;
  - **502** : coût maximal retenu, **aucune seconde génération ni secours** ;
  - **flux coupé** après un aperçu, ou terminé sans image : même chose ;
  - flux désactivé dans l'administration : réponse classique ;
  - **budget insuffisant** : rien n'est envoyé ;
  - **proxy** : utilisé quand il existe (tunnel comme Claude Cloud), ignoré sinon ;
  - coût maximal : il inclut les aperçus ;
  - **parcours Logo V2 complet** :
    - génération en flux, puis sauvegarde ;
    - **reprise de la même tâche sans nouvel appel** (protection contre les doubles générations) ;
    - choix du logo, puis identité : palette anthracite et sable, symbole découpé, WebP, aucun SVG infidèle ;
    - aucune personne dans la demande.
- `tests/logo-identity.test.ts` :
  - palette et symbole mesurés sur le vrai logo ;
  - symbole au-dessus du nom ou à gauche ;
  - nom seul : aucun symbole inventé.
- **Tests existants mis à jour** pour le nouveau comportement voulu :
  - les faux OpenAI répondent en flux ;
  - « refus sans facturation » = 429 ;
  - 503 = incertain, sans secours ;
  - original = fichier reçu.

**Captures** (`reports/screenshots/logo-progress/`) :
- `1b-flux-en-cours.png` : réception en flux, « aperçu 2 reçu » ;
- `2-resultat.png` : vrai logo OpenAI proposé, 5 étapes cochées, lien « Fichier original reçu » ;
- `3-apres-rechargement.png`, `4-refus-fournisseur.png`, `5-tache-echouee.png` ;
- `6-identite-marque.png` : déclinaisons, planche et téléchargements PNG, WebP et favicon, après le choix.

## 7. Limites restantes (honnêtement)

- **Relecture qualité et orthographe non testées en réel.**
  - Elles demandent un modèle de texte payant. Ici, la relecture est simulée.
  - J'ai vérifié à l'œil : le vrai logo écrit « SÉBASTIEN BLANC » et « PLÂTRERIE • PEINTURE » sans faute.
  - Dans Claude Cloud, Anthropic n'est pas disponible. La relecture doit donc passer par un modèle de texte OpenAI à activer dans Administration › Modèles (prix à confirmer).
- **Correction du nom.** Si le client change de nom après le choix, le studio réécrit le nom avec une vraie police, dans **une seule couleur**. Sur ce logo, le mot « BLANC » perdrait sa couleur sable.
- **Flux vérifié en réel seulement pour `gpt-image-2`** (essai du 10/10). Pour `gpt-image-1`, le flux est documenté par OpenAI mais n'a pas été essayé ici. Les autres modèles restent en réponse classique.
- **Tarif de `gpt-image-2`.**
  - Il se saisit « par image » dans l'administration.
  - Le coût réel mesuré est de **0,216 $** en haute qualité 1024² (7 177 jetons de sortie, plus que les 4 160 de `gpt-image-1`).
  - Saisir au moins **0,22 $** par image. La réservation garde une marge de 25 %.
- **Facturation du premier essai en 502** : à vérifier dans le tableau de bord OpenAI, au plus ≈ 0,30 €.
- La palette tirée du logo remplace la palette **non validée** du projet. Une palette validée par le client n'est jamais touchée.

## 8. Faire un prochain essai réel depuis le studio

1. **Administration › Fournisseurs IA** : clé OpenAI active. Ne jamais la donner dans une conversation.
2. **Administration › Modèles Images & Vidéos** :
   - « Logos » = `gpt-image-2`, confirmé ;
   - tarif par image ≥ 0,22 $.
3. **Administration › Modèles** (texte) : un modèle de texte pour les directions et la relecture, avec son tarif.
4. **Onglet Marque › Créer les directions** :
   - le devis s'affiche (3 logos, coût maximal) ;
   - accepter seulement s'il convient.
5. Suivre les 5 étapes. Chaque direction affiche « aperçu reçu… », puis « image reçue et sauvegardée ».
6. **Choisir ce logo**. La planche, le symbole, les couleurs et les exports apparaissent dans l'onglet Marque.
7. Où lancer l'essai :
   - Codespace ou serveur : rien de plus à faire (pas de proxy) ;
   - Claude Cloud : le proxy est pris en charge automatiquement.
8. En cas d'erreur 502 ou de flux coupé, le studio **ne relance rien**. Il affiche l'erreur et retient le coût maximal par prudence : à vérifier dans le tableau de bord OpenAI.
