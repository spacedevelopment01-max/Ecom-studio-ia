# Accueil public — refonte premium (V2)

Branche : `claude/homepage-premium-v2` (partie de `main` après la PR #66). **Non fusionnée** : direction artistique,
deux thèmes et parcours des 7 modules validés par le propriétaire ; la passe de finition (§10) attend sa validation.

Périmètre respecté :
- seule la page d'accueil publique a changé (plus le pied de page partagé et une option du sélecteur de langue) ;
- aucun moteur d'IA, projet, compte, abonnement, prix, facturation ou base de données n'a été modifié ;
- aucun appel d'IA payant ; Phase 13 non commencée.

## 1. Ce qui a été vérifié (et comment)

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx vitest run` | **1003 / 1003** (116 fichiers), dont le nouveau `tests/accueil-premium.test.ts` (6 tests) |
| `npm run build` (production) | OK. Page d'accueil : 23 kB de code propre, 143 kB chargés au total |
| Vérifications dans Chromium sur la version de production (`scripts/screens-homepage-v2.ts`) | **53 / 53**, détail dans `reports/screenshots/homepage-premium-v2/verifications.txt` |

Contrôlé dans le navigateur :
- **vidéo d'entrée** :
  - même fichier et même image d'attente ;
  - lecture silencieuse quand elle est visible ;
  - pause / lecture ;
  - « Avec le son » ;
  - affichage de secours si le fichier ne charge pas ;
  - pas de lecture automatique si l'utilisateur demande moins de mouvement ;
- **thèmes** :
  - thème du système appliqué à la première visite (clair et sombre) ;
  - bascule soleil / lune dans les deux sens ;
  - choix mémorisé après rechargement, appliqué avant l'affichage (pas de flash) ;
  - bascule depuis le menu du téléphone ;
- **menu du téléphone** :
  - ouverture, avec les liens, la langue, le thème et la connexion ;
  - la touche Échap le ferme ;
  - un lien du menu le ferme et mène à la bonne section ;
- **navigation** :
  - toutes les ancres de l'en-tête, des boutons et du pied de page ont leur section ;
  - les 10 liens vers d'autres pages répondent (connexion, inscription et ses 3 variantes de forfait, contact, 4 pages légales) ;
  - « Commencer mon projet » mène à `/inscription`, « Connexion » à `/connexion` ;
- **parcours au défilement** : le module affiché suit le texte lu (Publicités, puis Réseaux sociaux) ; sur téléphone, le rail des modules reste fixé en haut ;
- **démonstrations interactives** :
  - choix d'une étape ;
  - choix d'une marque ;
  - bascule ordinateur / téléphone ;
  - titre modifié dans l'éditeur de publicité ;
  - texte SEO modifié, signalé « Modifié par vous » ;
  - approbation d'une publication ;
  - aperçu de personnalisation ;
- **débordement horizontal** : aucun à 360, 390, 768, 1024 et 1440 px ;
- **accessibilité** :
  - zones tactiles d'au moins 32 px sur téléphone (44 px pour les boutons principaux) ;
  - premier arrêt clavier « Aller au contenu » ;
  - avec mouvement réduit, tout le contenu reste visible ;
- **anglais** : accroche traduite et aucun débordement, sur ordinateur et téléphone ;
- **erreurs JavaScript** : aucune.

**Ce qui n'a pas été vérifié** :
- **lecture du film dans un vrai navigateur.** Le Chromium de test ne sait pas lire le format H.264 du film
  d'origine. Pour tester la lecture, une copie WebM du **même** film (faite avec ffmpeg, hors du dépôt) a été
  servie à ce seul navigateur de test, à la même adresse. Le fichier du site n'a pas changé. La lecture dans Safari
  ou Chrome sur vos appareils reste **à vérifier par vous** ;
- pas de mesure Lighthouse, pas de test sur un vrai iPhone ou Android ;
- **lecteurs d'écran** : rôles, libellés et ordre de lecture ont été soignés, mais aucun test réel n'a été fait.

## 2. UI UX Pro Max : utilisation concrète

Skill consulté (non réinstallé) avec son outil de recherche :

**1. Système de design** (`--design-system`, produit « AI SaaS ecommerce studio premium dark mode immersive »,
variance 7, mouvement 6, densité 3). Le skill a proposé :
- le motif « Feature-Rich Showcase » : appel à l'action dans le hero, après les fonctionnalités et en bas → **appliqué** ;
- sa liste de contrôle avant livraison → **appliquée**, voir ci-dessous.

Il a aussi proposé une palette or et brun avec les polices Cormorant et Montserrat (orientée luxe et mode).
**Non retenue** : elle contredit la palette demandée (bleu nuit, indigo, violet discret). J'ai gardé les polices du
studio (Bricolage, Inter, Instrument) pour rester cohérent avec le studio.

**2. Recherches ciblées et ce que j'en ai tiré** :

| Recherche | Ce qui a été appliqué |
|---|---|
| `scroll storytelling` (landing) | Récit compréhensible sans effet de défilement, indicateur de progression, animations simplifiées sur téléphone, ordre de lecture complet, pas de défilement bloqué |
| `hero video` (landing) | Bouton pause visible, image d'attente, pause hors écran, rien d'automatique en mouvement réduit |
| `reduced motion scroll` (ux) | Toutes les animations ont un état final lisible ; pas de parallaxe ni de défilement imposé |
| `dark mode contrast` (ux) | Textes à 4,5:1 minimum (gris secondaires choisis en conséquence dans les deux thèmes) |
| `sticky header` (ux) | En-tête collant qui ne masque pas les sections (décalages `scroll-mt`) |
| `scroll pin sticky` (gsap) | Pas plus d'une ou deux zones fixées ; aucune bibliothèque ajoutée (défilement natif + IntersectionObserver) |
| `AI SaaS indigo` (color) | Orientation indigo / violet confirmée pour les accents |

**3. Règles de `quick-reference.md` appliquées** :
- `color-dark-mode` : le mode sombre a ses propres teintes, ce n'est pas une inversion ;
- `dark-mode-pairing` : les deux thèmes ont été conçus ensemble ;
- `touch-target-size` : zones tactiles assez grandes ;
- `excessive-motion` : une ou deux animations par écran au plus ;
- `motion-meaning` : chaque animation montre une étape ou un changement d'état ;
- `breakpoint-consistency` : largeurs 375 / 768 / 1024 / 1440.

**4. Recherches sans résultat**, signalées honnêtement : `theme toggle flash` et `dark mode toggle preference`.
Pour la bascule de thème, j'ai suivi les règles générales, sans correspondance dans la base du skill.

## 3. Vidéo d'entrée d'origine conservée

- **Fichiers** : `public/explainers/film-court.mp4` et sa version `.en.mp4`, image `film-court.jpg`. **Aucun fichier
  de `public/` n'a changé** (vérifié par `git diff` et par empreinte SHA-256, figée dans un test).
- **Lecture** :
  - lue en silence quand elle est visible, mise en pause hors écran (même comportement qu'avant) ;
  - « Avec le son » la relance depuis le début avec les commandes (comme avant) ;
  - ajouts : un bouton pause / lecture, et un affichage de secours (image + lien « Ouvrir la vidéo ») si le fichier
    ne se charge pas, y compris si l'erreur survient avant que la page soit prête.
- **Composition** : la vidéo est dans une « fenêtre du studio », sous laquelle figurent les sept modules
  (Marque → Réseaux sociaux), qui mènent au parcours.
- **Écran d'intro animé** du site (`src/components/intro/`) : **inchangé**. Il s'affiche toujours une fois par visite ;
  les captures le passent.

## 4. Sections réalisées (dans l'ordre de la page)

1. **En-tête** :
   - logo, puis Fonctionnalités, Fonctionnement, Démonstrations, Tarifs ;
   - langue, bascule soleil / lune, Connexion, « Commencer mon projet » ;
   - sous 1280 px, un menu plein écran : liens numérotés, thème et langue, connexion, bouton principal ;
   - devient translucide quand on fait défiler la page.
2. **Hero** : nom E-COM STUDIO IA, accroche « Toute votre activité e-commerce. Un seul studio. », le sous-texte
   demandé, les boutons « Commencer mon projet » et « Découvrir les fonctionnalités », deux garanties exactes et la
   vidéo. Sous le hero, un bandeau « Livré pour Shopify · WordPress · WooCommerce · PrestaShop · Kit pour Wix et
   Squarespace ».
3. **Comment ça fonctionne** : les 4 étapes demandées. C'est une démonstration, pas quatre cartes : chaque étape
   montre un film explicatif réel du studio. Les étapes s'enchaînent seules quand la section est visible ; un clic
   arrête l'enchaînement. Un encadré dit ce que vous faites à chaque étape.
4. **Fonctionnalités : parcours au défilement**. Le même projet de démonstration (Somnéa) traverse les 7 modules :
   Marque → Boutique → Images → Publicités → Vidéos → SEO → Réseaux sociaux.
5. **Création de marque** : on choisit une des 5 marques de démonstration et on voit son logo SVG, sa photo de
   départ, ses typographies et sa palette (couleurs avec leur code).
6. **Création de boutique** :
   - types de site : monoproduit, multiproduits, niche, entreprise de services ;
   - bascule ordinateur / téléphone ;
   - bloc « Pas un modèle repeint » (ancre `#sur-mesure`) ;
   - galerie des 11 thèmes, conservée.
7. **Images et publicités** : comparaison avant / après (photo d'origine et création), puis un éditeur de publicité
   interactif. On y modifie le titre, le bouton, le fond, la position du logo et le format (1:1, 4:5, 9:16).
8. **Vidéo et UGC** :
   - stratégie → storyboard → votre accord → rendu et exports ;
   - la vidéo UGC (forfaits Vendre et Dominer), signalée comme contenu IA ;
   - mention explicite : **pas encore de timeline interactive plan par plan** ;
   - les 5 publicités vidéo 9:16 des démonstrations.
9. **SEO et rédaction** : un document modifiable (fiche produit, page d'accueil, article). Les manques sont
   surlignés « [À compléter] » et une modification affiche « Modifié par vous : une régénération ne l'écrasera pas ».
10. **Réseaux sociaux** : un calendrier de la semaine. On ouvre une publication et on l'approuve. Instagram,
    Facebook, TikTok, YouTube et Pinterest sont marqués « Bêta », LinkedIn « export ».
11. **Tout est connecté** : un schéma (projet au centre, 7 modules autour). Chaque lien explique ce qui est partagé.
12. **Personnalisation** (« L'IA crée. Vous gardez le contrôle. ») : un aperçu de boutique avec titre, couleur du
    bouton, coins et bandeau d'annonce. Chaque modification crée une version qu'on peut restaurer.
13. **Plateformes et exports** : un tableau qui distingue **export natif**, **connexion** et **kit de
    reconstruction**, plus les blocs « Vous avez déjà votre site ? » et « Entreprises de services ».
14. **Démonstrations** : les démonstrations complètes, conservées.
15. **Rangement automatique** (conservé), suivi des 4 engagements (« N'invente pas », « Ne publie pas sans vous »…).
16. **Tarifs** :
    - les composants existants, qui lisent `src/lib/plans.ts` : **aucun prix ni quota écrit à la main** ;
    - la découverte gratuite ;
    - les packs.
17. **FAQ** (14 questions), dont une nouvelle : « Les démonstrations sont-elles des résultats clients ? » → non.
18. **Appel final** et **pied de page** : liens produit (dont Fonctionnalités et Plateformes), studio et légal. Tous
    les liens existants sont conservés.

**Honnêteté des contenus** :
- toutes les démonstrations portent la mention « démonstration, pas un résultat client » ;
- les petites démos interactives tournent dans le navigateur : rien n'est enregistré ni publié ;
- deux points sont signalés « Bêta », d'après le code (`cms-v2/capabilities.ts`, `social-v2/platforms.ts`) : l'envoi
  direct à Shopify et la publication sur les réseaux sociaux sont développés mais **jamais essayés en réel**.

## 5. Animations

- Apparitions douces au défilement.
- Hero :
  - la vidéo apparaît au chargement, sans attendre le défilement, pour être visible tout de suite sur téléphone ;
  - elle s'incline légèrement pendant le défilement (corrigé en finition : l'inclinaison ne fonctionnait pas, §10).
- Parcours :
  - sur ordinateur, la fenêtre reste fixe et son contenu se fond d'un module à l'autre, avec une barre de progression ;
  - sur téléphone, un rail des modules reste collé en haut et suit la position.
- Comment ça fonctionne : barre de temps par étape et films en fondu.
- Schéma « Tout est connecté » : le lien actif est animé.
- Bascule de thème : fondu par un voile unique (0,14 s puis 0,26 s), voir §10.
- Aucune bibliothèque ajoutée : défilement natif, rien n'est bloqué.
- Mouvement réduit : tout est affiché tel quel ; la vidéo attend un clic.

## 6. Modes clair et sombre

- **Sombre** :
  - fond bleu nuit profond (#060A18), surfaces indigo (#0E1431) ;
  - accent indigo (#5865F2) et touches de violet (#A890FF) dans les titres ;
  - lueurs limitées au haut du hero et aux bandeaux sombres ; fin quadrillage atténué.
- **Clair** :
  - fond blanc cassé (#FAF9F6), bandes bleutées (#F1F4FB) ;
  - titres bleu nuit (#0B1533), accent bleu (#2F4BD8) ;
  - ombres douces en plusieurs couches.

  Ce n'est pas une inversion : chaque thème a ses propres teintes et ombres.
- **Bascule** :
  - le choix est mémorisé (`ecs-theme`, la même clé que le studio, qui reste donc cohérent) ;
  - le thème du système s'applique à la première visite ;
  - aucun flash : un script existant pose le thème dans `<head>` avant l'affichage.
- **Effet sur le reste du site** : les couleurs de l'accueil sont limitées à `.hp`. **Le studio et les pages légales
  ne changent pas.**

## 7. Fichiers

Nouveaux :
- `src/components/home/home-chrome.tsx` : en-tête, bascule soleil / lune, menu du téléphone ;
- `src/components/home/home-media.tsx` : vidéo d'entrée, « Comment ça fonctionne » ;
- `src/components/home/home-story.tsx` : parcours au défilement des 7 modules ;
- `src/components/home/home-demos.tsx` : marque, boutique, éditeur de publicité, SEO, calendrier, schéma, personnalisation ;
- `tests/accueil-premium.test.ts` ;
- `scripts/screens-homepage-v2.ts` : vérifications navigateur et captures ;
- `reports/homepage-premium-v2.md`, `reports/screenshots/homepage-premium-v2/`.

Modifiés :
- `src/app/page.tsx` : la page d'accueil, réécrite ;
- `src/app/globals.css` : couleurs et styles de l'accueil, limités à `.hp` ;
- `src/components/site-footer.tsx` : nouvelles ancres ajoutées, accroche mise à jour, tous les liens conservés ;
- `src/components/i18n.tsx` : option `large` du sélecteur de langue (boutons de 40 px). Elle n'est utilisée que sur
  l'accueil ; les autres pages ne changent pas.

Non modifiés : moteurs, API, base de données, forfaits et prix (`src/lib/plans.ts`), facturation, studio, médias
de `public/`.

## 8. Limitations et choix à valider

- **Lecture du film** : vérifiée seulement avec une copie WebM dans le Chromium de test (voir §1). Elle reste à
  vérifier par vous dans Safari ou Chrome.
- **Typographies dans la démo de marque** : les noms affichés sont ceux des directions réelles (Libre Baskerville,
  Inter…). L'échantillon « Aa » est dessiné avec les polices du site : c'est une approximation.
- **Contenus de l'ancienne page retirés ou regroupés** :

  | Élément de l'ancienne page | Ce qu'il devient |
  |---|---|
  | Bandeau défilant de mots-clés | Retiré |
  | Bandeau de chiffres (nombre de sections, nombre de prompts) | Retiré |
  | Grille de 10 cartes « Le studio » | Retirée. Son contenu est réparti dans le parcours, le schéma et la FAQ, sauf la mention « prompts sectoriels » et « mémoire de l'IA », qui n'apparaissent plus |
  | 5 « chapitres vidéo » | Remplacés par « Comment ça fonctionne », qui utilise 4 des 5 films (le film « formats » n'est plus montré) |

  À vous de dire s'il faut en remettre.
- **Connexions marquées « Bêta »** : honnête, mais moins vendeur qu'avant. Envoi direct à Shopify et publication sur
  les réseaux sociaux sont développés mais jamais essayés en réel.
- **Entre 1024 et 1279 px** (petits portables), la navigation passe dans le menu, faute de place.
- **Démonstrations** : marques créées par le moteur local, sans l'IA des forfaits. Ce ne sont pas des résultats clients.

## 9. Captures (`reports/screenshots/homepage-premium-v2/`)

Toutes ont été prises sur la **version de production**, dans Chromium.

- **Accueil, ordinateur** : `accueil-ordinateur-sombre`, `accueil-ordinateur-clair`.
- **Accueil, téléphone** : `accueil-telephone-sombre`, `accueil-telephone-clair`.
- **Autres tailles** : `accueil-tablette-sombre`, `accueil-portable-sombre`, `accueil-petit-telephone-sombre`.
- **Anglais** : `accueil-ordinateur-anglais-clair`, `accueil-telephone-anglais-clair`, `parcours-*-anglais-clair`.
- **Vidéo dans les deux thèmes** : `video-hero-sombre`, `video-hero-clair`, `video-hero-telephone-sombre`,
  `video-hero-telephone-clair`. Affichage de secours : `video-secours-clair`.
- **Menu du téléphone** : `menu-telephone-sombre`, `menu-telephone-clair`.
- **Sections** : `fonctionnement-*`, `parcours-*`, `marque-*`, `boutique-*`, `themes-ordinateur-clair`,
  `images-ordinateur-clair`, `video-ugc-ordinateur-sombre`, `seo-*`, `reseaux-*`, `tout-connecte-*`,
  `personnalisation-*`, `plateformes-*`, `demonstrations-ordinateur-clair`, `tarifs-*`, `faq-ordinateur-clair`,
  `pied-de-page-ordinateur-sombre`.
- **Démonstrations interactives après action** :
  - `editeur-publicite-ordinateur-sombre` : titre « Dormez mieux. », format 9:16, logo à droite ;
  - `seo-ordinateur-sombre` : texte modifié ;
  - `reseaux-ordinateur-sombre` : publication approuvée ;
  - `personnalisation-ordinateur-sombre` : titre et coins modifiés ;
  - `boutique-telephone-ordinateur-sombre`.
- **Avant la refonte** : dossier `avant/`.
- **Résultat des 53 vérifications** : `verifications.txt`.

Pour relancer :

```bash
npm run build
DATA_DIR=/tmp/hp STOCK_OFFLINE=1 SOCIAL_PUBLISH_DISABLED=1 npx next start -p 3091
```

Puis, dans un autre terminal (`TEST_WEBM`, facultatif, est une copie WebM du film pour un Chromium sans H.264) :

```bash
BASE=http://localhost:3091 TEST_WEBM=/chemin/film-court.webm npx tsx scripts/screens-homepage-v2.ts
```

## 10. Passe de finition (avant fusion)

Demandée après validation de la direction artistique. Rien n'a changé dans la vidéo d'entrée (même fichier, empreinte
vérifiée par un test), les textes, les démonstrations, les comptes, projets, abonnements ou moteurs d'IA.

### 10.1 UI UX Pro Max, utilisé pour de vrai

- Lus en entier : `SKILL.md`, `quick-reference.md` (sections 1 à 10) et `pro-rules.md`.
- Design system **persistant** créé par l'outil du skill (`search.py --design-system --persist --page accueil`) :
  - `design-system/e-com-studio-ia/MASTER.md` : couleurs des deux thèmes avec contrastes mesurés, typographie,
    espacements, ombres, **jetons de mouvement** (arrivée 500 ms, sortie 300 ms, survol 180 ms, décalage 40 ms),
    composants, interdits, liste de contrôle finale ;
  - `design-system/e-com-studio-ia/pages/accueil.md` : règles propres à l'accueil.
- La sortie brute du skill proposait une autre direction (or, Cormorant, « Liquid Glass »…). Elle **n'a pas été
  appliquée** : la direction validée est conservée et chaque écart est noté en fin de `MASTER.md`.

Liste de contrôle finale du skill, appliquée à l'accueil :

| Règle du skill | Résultat |
|---|---|
| Contraste des petits textes (`color-contrast`) | Corrigé : en sombre, l'accent des petits textes passe de #5865F2 (≈ 4:1) à #9AA6FF (≈ 8:1) |
| Commandes tactiles de 44 px (`touch-target-size`) | Corrigé : pastilles, onglets, boutons des démos, liens du pied de page sur téléphone, logo de l'en-tête. Vérifié automatiquement sur téléphone |
| Étiquettes lisibles (`readable-font-size`) | Corrigé : aucune étiquette sous 12 px ; agenda des réseaux en liste lisible sur téléphone |
| Pause des animations automatiques (`auto-rotation-controls`) | Ajouté : bouton pause sur « Comment ça fonctionne », « Tout est connecté », les vidéos 9:16 et le rangement des fichiers ; arrêt quand le clavier y entre |
| Clavier | Onglets au clavier (flèches, Début, Fin) ; le focus n'est plus caché sous l'en-tête collant |
| Animations légères (`transform-performance`, `layout-shift-avoid`) | Seuls `transform` et `opacity` sont animés ; plus d'animation de hauteur ni de proportions |
| Sortie plus rapide que l'entrée | Panneaux du parcours : entrée 500 ms, sortie 300 ms |
| Images (`image-optimization`) | Copies WebP : 148 images, 10,1 Mo → 5,6 Mo (−45 %). Les JPG restent en secours |
| Mouvement réduit | Inclinaison, rotations, lecture automatique et fondu de thème désactivés |
| Pas de contenu invisible au chargement | Le haut de page apparaît sans attendre le défilement ; sans JavaScript, tout est visible |

### 10.2 Animations corrigées

- **Inclinaison de la vidéo d'entrée** : elle ne bougeait pas (l'animation d'arrivée écrasait l'inclinaison). Elle est
  maintenant portée par un cadre séparé. Mesurée : l'angle varie au défilement sur ordinateur et téléphone.
- **Logo de la publicité** : il glisse d'un coin à l'autre en 0,5 s au lieu de sauter (positions mesurées image par
  image : 271 → 389 → 509 px).
- **Changement de format** de la publicité : fondu doux au lieu d'un saut de proportions.
- **Clair / sombre** : l'ancien fondu posait une transition sur des milliers d'éléments. Trois solutions ont été
  mesurées (changement direct, View Transitions, voile) ; retenue : **un seul voile** à la couleur de l'ancien fond,
  qui apparaît (0,14 s), laisse le thème changer dessous, puis s'efface (0,26 s). Mesure : images visibles toutes les
  33 ms en moyenne (38 ms au pire), le calcul lourd (≈ 98 ms) est caché sous le voile.
- **Sept modules** : ordre, fondu entre panneaux, fenêtre fixe sur ordinateur, rail qui suit sur téléphone, vérifiés.

### 10.3 Mesures (version de production, Chromium sans carte graphique)

- Vérifications navigateur : **53 / 53**.
- Mesures d'animation : **21 / 21** (défilement à 58,8 images/s, 95 % des images en moins de 16,8 ms, aucune tâche
  longue ; aucune erreur JavaScript).
- TypeScript : OK. Tests : **1003 / 1003** (116 fichiers). Build de production : OK.

### 10.4 Nouvelles vidéos (`reports/homepage-animation-audit/videos/`)

Quatre enregistrements réels d'environ 1 minute, faits par le navigateur de test sur la version de production :
`ordinateur-clair.mp4`, `ordinateur-sombre.mp4`, `telephone-clair.mp4`, `telephone-sombre.mp4`.

### 10.5 Limites (non vérifié)

- Pas de carte graphique ni de vrai téléphone : la fluidité réelle sur iPhone / Android et Safari reste à vérifier.
- Les vidéos du navigateur de test tournent à environ 25 images/s : elles paraissent un peu moins fluides que l'écran.
- Le film d'entrée est lu dans le test via une copie WebM (Chromium de test sans H.264) ; le fichier MP4 n'a pas changé.
