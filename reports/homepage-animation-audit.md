# Audit de la page d'accueil premium : UI UX Pro Max et animations

Branche contrôlée : `claude/homepage-premium-v2` (commit `db12117`), version de production (`next build` puis
`next start`).

Ce que cet audit a fait, et seulement cela :
- il a observé la page ; **aucun fichier de l'application n'a été modifié** ;
- aucune fusion, aucun appel d'IA payant.

Preuves dans `reports/homepage-animation-audit/` :
- `audit.ts` : le script de mesure ;
- `mesures.json` : les valeurs mesurées ;
- `videos/` : les enregistrements du navigateur.

---

## Verdict en bref

1. **UI UX Pro Max a réellement été utilisé, mais de façon superficielle.**
   - Ce qui a servi : son outil de recherche (1 système de design et 11 recherches), sur environ 17 secondes
     d'exécution au début du travail.
   - Ce qui n'a pas été lu avant la livraison : ses deux fichiers de règles (`quick-reference.md`, simplement
     parcouru par un filtre de mots-clés, et `pro-rules.md`, jamais ouvert).
   - La mise en page, les composants et les animations ont été conçus **principalement sans lui**.
   - Le rapport précédent (`homepage-premium-v2.md`) présentait cette utilisation de façon trop flatteuse. Le §1
     ci-dessous la corrige.
2. **Les animations demandées existent et fonctionnent pour l'essentiel**, mesures et vidéos à l'appui. Trois défauts
   réels ont été trouvés :
   - l'inclinaison de la vidéo d'entrée au défilement est **inopérante** ;
   - dans l'éditeur de publicité, le logo **saute** au lieu de glisser ;
   - le fondu clair ↔ sombre **saccade** : environ 0,4 s pour la première image, puis plusieurs images entre 100 et
     200 ms.
3. **Recommandation** : corriger ces trois défauts, puis faire une vraie passe UI UX Pro Max (liste au §1.6), avant
   de valider la page. Je n'ai rien corrigé, comme demandé.

---

## 1. UI UX Pro Max : installé ≠ utilisé

### 1.1 Où il est installé

Une seule installation trouvée sur toute la machine (`find /` sur « ui-ux-pro-max ») :

```
/root/.claude/skills/synced/a59d4646-…_8518645e-…/ui-ux-pro-max/
├── SKILL.md                  (instructions du skill)
├── references/quick-reference.md  (toutes les règles web, 10 catégories)
├── references/pro-rules.md        (règles « applications natives » + liste de contrôle finale)
├── scripts/search.py, core.py, design_system.py …  (outil de recherche)
└── data/*.csv                (ux-guidelines 119 règles, colors, typography, landing, motion, styles…)
```

- C'est une installation « synchronisée » depuis votre compte Claude (skill `anthropic-skills:ui-ux-pro-max`).
- Elle **n'est pas dans le dépôt** : `.claude/skills/` du projet ne contient que `verifier-theme`,
  `web-design-guidelines`, `seo-audit`, `ai-seo` et `pricing`.
- Je n'ai pas pu vérifier depuis quel dépôt GitHub elle a été synchronisée : aucune adresse d'origine dans ses fichiers.

### 1.2 Ce que j'ai réellement consulté (historique horodaté de la session, 9 octobre)

| Heure (UTC) | Action | Fichier ou ressource |
|---|---|---|
| 11:09:03 | Chargement du skill | `SKILL.md` (lu en entier) |
| 11:09:07 | `--design-system` « AI SaaS ecommerce studio premium dark mode immersive », variance 7, mouvement 6, densité 3 | `design_system.py` + `data/products, styles, colors, typography, landing, motion, ui-reasoning` |
| 11:09:14 | 8 recherches ciblées : color « AI SaaS indigo dark », landing « scroll storytelling product », landing « hero video background », ux « reduced motion scroll », ux « dark mode contrast », ux « sticky header mobile menu », ux « theme toggle flash » (0 résultat), gsap « scroll pin sticky sections » | `data/*.csv` via `search.py` |
| 11:09:19 | ux « dark mode toggle preference » (0 résultat) ; stack nextjs « landing page » (0 résultat) ; `grep` de mots-clés dans `quick-reference.md` | `quick-reference.md` (**seulement les lignes contenant dark, motion, duration, easing, touch-target, 44**) |

Le dossier `scripts/__pycache__` est daté du 9 octobre à 11:09 : c'est la trace matérielle de l'exécution.

**Non consulté pendant la conception** :
- `references/pro-rules.md`, qui contient la liste de contrôle « avant livraison » que le skill demande de passer ;
- `quick-reference.md` en entier ;
- le mode `--persist`, qui crée la fiche `design-system/…/MASTER.md` réutilisable ;
- les règles propres à Next.js : la seule recherche a donné 0 résultat et n'a pas été reformulée.

Ces deux fichiers de règles ont été lus en entier **seulement pour cet audit**.

### 1.3 Recommandations du skill réellement appliquées

| Recommandation (source) | Application dans la page |
|---|---|
| Motif « Feature-Rich Showcase », appel à l'action dans le hero, après les fonctionnalités et en bas (`--design-system`) | Bouton principal dans le hero, après le parcours (découverte gratuite) et dans l'appel final |
| Storytelling : « compréhensible sans effets, indicateur de progression, animations simplifiées sur mobile, ordre de lecture complet » (landing) | `StoryScroll` : défilement natif, barre de progression, rail des modules sur téléphone, contenu entier dans le DOM |
| Hero vidéo : « bouton pause visible, image d'attente, pause hors écran, rien d'automatique en mouvement réduit » (landing) | `HeroFilm` : bouton pause / lecture, image d'attente, IntersectionObserver, contrôles en mouvement réduit |
| `reduced-motion` / motion sensitivity (ux) | Tout le contenu visible tout de suite, transitions coupées, pas d'enchaînement automatique (mesuré, §2) |
| Pinning : « pas plus d'une ou deux zones fixées » (gsap) | Deux zones fixées seulement : la fenêtre du parcours et la galerie des thèmes (celle-ci existait déjà) |
| Liste de contrôle du design system : pas d'emoji (icônes Lucide), `cursor-pointer`, mouvement réduit, largeurs 375 / 768 / 1024 / 1440 | Appliquée ; les tailles d'écran ont été testées à 360, 390, 768, 1024 et 1440 px |
| `dark-mode-pairing`, `color-dark-mode` (repérés dans `quick-reference.md`) | Deux palettes distinctes, ce n'est pas une inversion |

### 1.4 Propositions du skill écartées

Le système de design proposait :
- la palette or et brun « Premium dark + gold accent » ;
- les polices Cormorant et Montserrat (luxe et mode) ;
- le style « Liquid Glass », prévu pour l'interface des appareils Apple.

Tout a été écarté : cela contredit votre cahier des charges (bleu nuit, indigo, violet discret) et l'identité du
studio.

### 1.5 Ce qui a été conçu sans le skill

- **Toute la structure de la page** : ordre des sections, composition du hero, choix de faire traverser les 7 modules
  par un même projet (Somnéa).
- **Les composants** :
  - `HomeHeader` (en-tête), `ThemeSwitch` (bascule soleil / lune), `HeroFilm` (vidéo d'entrée) ;
  - `HowItWorks` (comment ça fonctionne), `StoryScroll` (parcours) ;
  - les démonstrations `BrandLab`, `StoreDevices`, `AdEditorDemo`, `SeoDocDemo`, `SocialCalendarDemo`,
    `ConnectedHub` et `ControlDemo`.
- **Les palettes clair et sombre**, choisies à partir de votre brief.
- **Le réglage des animations** : courbes, durées, fondus, technique sans bibliothèque.
- **Le contrôle des contrastes.** L'ancien rapport l'annonçait conforme **sans l'avoir mesuré**. Mesure faite pour
  cet audit :
  - conforme : textes principaux et secondaires ≥ 5,5:1 dans les deux thèmes, boutons 6,7:1 (clair) et 4,6:1 (sombre) ;
  - **exception** : en thème sombre, la couleur d'accent `#5865F2` employée pour quelques **petits textes** (numéros
    des modules, lien « Écrivez-nous ») est à **3,9 à 4,3:1**, sous le seuil de 4,5:1.
- Le skill `web-design-guidelines`, déjà présent dans le dépôt, n'a pas été utilisé non plus.

### 1.6 Comment améliorer la refonte avec UI UX Pro Max (proposition, rien n'est modifié)

Chaque point renvoie à une règle de `quick-reference.md`, lue pour cet audit.

| Règle du skill | Constat sur la page | Amélioration proposée |
|---|---|---|
| `transform-performance`, `layout-shift-avoid` | Le logo de l'éditeur bascule entre `left` et `right` : pas d'animation ; la description des étapes s'ouvre en animant `grid-template-rows` | Déplacer avec `transform` ; ouvrir avec opacité et translation |
| `state-transition` + performance | Le fondu de thème anime la couleur de tous les éléments (2 732) : images de 100 à 571 ms (§2) | Fondu global par l'API View Transitions (une seule image figée) ou transition limitée aux surfaces principales |
| `parallax-subtle` / `motion-meaning` | Inclinaison de la vidéo d'entrée inopérante (§2) | La réparer, ou la retirer si elle n'apporte rien |
| `auto-rotation-controls` | « Comment ça fonctionne » et « Tout est connecté » tournent seuls. Ils s'arrêtent au clic et en mouvement réduit, mais **pas au focus clavier**, et n'ont pas de bouton pause visible | Ajouter un bouton pause et l'arrêt au focus |
| `stagger-sequence` (30 à 50 ms) | Décalage actuel de 90 ms par élément | Ramener à 40 ms |
| `exit-faster-than-enter` | Les panneaux du parcours entrent et sortent à la même vitesse | Sortie à environ 60 % de la durée d'entrée |
| `touch-target-size` (44 px) | Les boutons principaux font 44 px, mais plusieurs commandes des démos font 36 à 40 px | Toutes à 44 px sur téléphone |
| `readable-font-size` / « pas de textes trop petits » (votre brief) | Étiquettes de 9 à 11 px dans les maquettes (calendrier, storyboard, palette) | 12 px au minimum, ou simplifier ces maquettes sur téléphone |
| `color-contrast` | Accent sombre de 3,9 à 4,3:1 sur les petits textes | Utiliser l'accent clair `#9AA6FF` pour les textes (8:1) |
| `image-optimization` | Images de démonstration en JPG sans `srcset` | WebP / AVIF et tailles adaptées |
| `heading-hierarchy` | Un `h4` sous un `h2` dans la démo SEO | Passer en `h3` |
| Processus du skill | Pas de fiche de design ; pas de passe finale sur `quick-reference.md` §1 à §3 ; pas de test du mode paysage ni du texte agrandi | Lancer `--design-system --persist` pour créer `design-system/e-com-studio-ia/MASTER.md`, faire la passe finale, tester le paysage et le zoom à 200 % |

---

## 2. Vérification des animations

### 2.1 Technologies

- **Aucune bibliothèque d'animation** (pas de GSAP ni de Framer Motion).
- **Transitions et animations CSS** : `globals.css` et classes Tailwind.
  - Exemples : `.reveal`, `.hp-panel`, `.sfx-tilt`, `@keyframes hp-rise`, `hp-fill`, `hp-dash`.
- **IntersectionObserver** : apparitions, module actif du parcours, lecture des vidéos.
- **Défilement natif**, avec `position: sticky` pour la fenêtre du parcours et le rail téléphone.
- **`requestAnimationFrame`** : effet `--p` lié au défilement (`ScrollFX`) et galerie des thèmes.
- **État React** pour les démonstrations : transitions CSS déclenchées par les changements d'état.
- **Mouvement réduit** : règle globale `prefers-reduced-motion` plus vérifications dans les composants.

### 2.2 Résultats mesurés dans le navigateur

Mesures faites en lisant les styles calculés de Chromium pendant l'animation (valeurs dans `mesures.json`).
**16 vérifications réussies sur 21.**

| Animation | Composant | Mesure réelle | Résultat |
|---|---|---|---|
| Apparition des sections | `.reveal` (94 éléments), `RevealObserver` | Titre de « Création de marque » : opacité 0 → 0,31 → 0,64 → 0,81 → 0,90 → 0,98 → 1 et décalage 28 → 19 → 10 → 5 → 3 → 0 px en environ 0,6 s | ✅ |
| Parcours Marque → … → Réseaux sociaux (ordinateur) | `StoryScroll` | Ordre affiché exact : Marque > Boutique > Images > Publicités > Vidéos > SEO > Réseaux sociaux | ✅ |
| Fondu entre modules | `.hp-panel` | Passage Marque → Boutique : opacités (1 ; 0) → (0,82 ; 0,18) → (0,35 ; 0,65) → (0,15 ; 0,85) → (0,05 ; 0,95) en environ 0,35 s | ✅ |
| Fenêtre fixe pendant la lecture | `StoryScroll` | `position: sticky` vérifiée | ✅ |
| Parcours (téléphone) | rail des modules | La pastille active suit les 7 modules, et le rail défile tout seul (0 → 85 → 187 → 290 → 368 px) | ✅ |
| Changement progressif au défilement : inclinaison de la vidéo d'entrée | `.sfx-tilt` + `ScrollFX` | La valeur `--p` évolue (0,53 → 0,88), mais la vidéo reste **à plat** sur ordinateur et sur téléphone | ❌ **défaut** |
| Comment ça fonctionne | `HowItWorks` | Étapes enchaînées seules : 1 → 2 → 3 en 14 s ; barre de temps animée (`hp-fill`) | ✅ |
| Éditeur de publicité : format | `AdEditorDemo` | Rapport hauteur / largeur 1,25 → 1,31 → 1,42 → 1,55 → 1,70 → 1,78 (4:5 → 9:16) | ✅ |
| Éditeur de publicité : position du logo | `AdEditorDemo` | Position 517 px fixe, puis saut : aucune position intermédiaire | ❌ **défaut** |
| Tout est connecté | `ConnectedHub` | Rotation automatique Marque → Boutique → Images ; lien actif animé (`hp-dash`, 1,2 s) | ✅ |
| Personnalisation | `ControlDemo` | Arrondi 16 → 15,1 → 12,9 → 9,0 → 7,6 → 6,5 → 6 px | ✅ |
| Bascule clair / sombre | `ThemeSwitch` + `html.hp-theme-anim *` | Fondu prévu de 0,45 s. Mesure image par image : **571 ms** pour la première image, puis 209, 27, 88, 114, 108 ms… La couleur finale apparaît d'un coup après le gel ; **aucune couleur intermédiaire observée** | ❌ **défaut** (×2) |
| Défilement jamais bloqué (molette) | toute la page | 0 → 12 000 px ; aucun `overflow` caché ni aimantage | ✅ |
| Défilement au doigt | toute la page (téléphone) | 8 186 → 18 881 px avec de vrais événements tactiles | ✅ |
| Menu du téléphone | `HomeHeader` | Fige volontairement la page dessous à l'ouverture, puis le défilement revient à la fermeture | ✅ |
| Fluidité du défilement (page de 29 055 px parcourue en 12 s) | toute la page | **59 images/s**, 95e centile 16,8 ms, maximum 33 ms, aucune tâche longue | ✅ |
| Mouvement réduit | toute la page | Contenu visible (opacité 1), durées de transition 0,00001 s, pas d'enchaînement automatique, vidéo à plat | ✅ |
| Erreurs JavaScript | — | Aucune | ✅ |

### 2.3 Les trois défauts : causes, trouvées dans le code (non corrigées)

1. **Inclinaison de la vidéo d'entrée inopérante.**
   - Dans `page.tsx`, l'élément `data-sfx` porte à la fois `.sfx-tilt` et l'animation d'arrivée
     `hp-rise … both`.
   - Le mode `both` maintient la position finale de l'animation (`transform: none`) **par-dessus** l'inclinaison.
   - J'ai introduit ce défaut lors de la dernière retouche, celle qui rendait la vidéo visible dès le chargement sur
     téléphone.
   - De plus, sur ordinateur, la formule de `.sfx-tilt` arrive à plat dès que `--p` dépasse 0,45. Or la vidéo y est
     déjà à 0,53 au chargement : même réparée, l'inclinaison n'y serait pas visible.
2. **Le logo de l'éditeur saute.**
   - `home-demos.tsx` change de classe entre `left-[7%]` et `right-[7%]`.
   - Le navigateur ne sait pas animer un passage de `left` à `right` : la transition ne se produit pas.
3. **Le fondu de thème saccade.**
   - `html.hp-theme-anim *` met une transition sur les **2 732 éléments** de la page.
   - Sans cette classe, le même changement de thème prend 82 ms ; avec elle, 441 ms pour la première image, puis des
     images de 100 à 500 ms.
   - Sur un ordinateur récent avec carte graphique, ce sera plus rapide, mais c'est une mauvaise pratique connue.

### 2.4 Enregistrements du navigateur (preuve en mouvement)

Dossier `reports/homepage-animation-audit/videos/`. Ce sont des enregistrements réels de Chromium, convertis en MP4 pour pouvoir les lire partout,
y compris sur iPhone et Mac.

| Fichier | Durée | Ce qu'on y voit |
|---|---|---|
| `ordinateur-sombre.mp4` | 62 s | Vidéo d'entrée qui joue, enchaînement automatique d'une étape, **parcours des 7 modules au défilement à la molette** (fondus et fenêtre fixe), changement de marque, bascule boutique ordinateur / téléphone, galerie des thèmes fixée, éditeur de publicité (titre, logo, formats 9:16 / 1:1 / 4:5), onglets SEO, approbation d'une publication, rotation de « Tout est connecté », personnalisation, puis bascule sombre → clair → sombre |
| `ordinateur-clair.mp4` | 62 s | Même parcours en thème clair |
| `telephone-clair.mp4` | 56 s | Menu (ouverture, bascule de thème depuis le menu, fermeture), défilement **au doigt**, rail des modules qui suit le parcours, aperçus sous chaque module, démonstrations marque et boutique |
| `telephone-sombre.mp4` | 56 s | Même parcours en thème sombre |

Les défauts du §2.3 sont visibles dans ces vidéos : la vidéo d'entrée ne s'incline pas, le logo saute, et le changement de thème marque un temps d'arrêt avant de basculer.

### 2.5 Limites de cette vérification

- **Vidéo d'entrée** : le Chromium de test ne lit pas le format H.264 du film. Dans les mesures et les vidéos, il lit
  une copie WebM du **même film**, servie seulement à ce navigateur. Le fichier du site n'est pas modifié.
- **Pas de carte graphique** dans cet environnement :
  - les images par seconde mesurées et la fluidité des vidéos ne représentent pas exactement un vrai ordinateur ou
    téléphone ;
  - à l'inverse, le gel du fondu de thème pourrait être moins marqué sur une machine récente.
- **Enregistrements à environ 25 images/s** (fréquence de Playwright) : les fondus y paraissent moins fluides qu'en vrai.
- **Défilement au doigt** : le geste simulé de Chromium (`Input.synthesizeScrollGesture`) ne fait rien, **même sur
  une page vide de contrôle**. Les vrais événements tactiles, eux, fonctionnent ; c'est ce qui a été utilisé.
- **Pas de test sur un vrai iPhone ou Android**, ni dans Safari ou Firefox.
- **Mesure du fondu de thème** : faite sur un seul passage et sur un seul élément (`.hp`).

---

## 3. Conclusion

- **UI UX Pro Max** : utilisé, mais peu. Il a servi au démarrage pour une orientation générale (structure de page
  vendeuse, règles sur la vidéo du hero, le récit au défilement, le mouvement réduit et le contraste). Il n'a pas
  servi de référence tout au long de la conception, ni pour la vérification finale qu'il prévoit.
- **Animations** : présentes et réelles. Apparitions, parcours des 7 modules avec fondu, fenêtre fixe, rail
  téléphone, enchaînements automatiques et démonstrations animées sont tous mesurés et filmés. Le défilement n'est
  jamais bloqué et reste fluide.
- **Trois défauts réels** sont à corriger avant validation :
  - l'inclinaison de la vidéo d'entrée (morte) ;
  - le logo de l'éditeur de publicité (il saute) ;
  - le fondu clair / sombre (il saccade).
- **Contraste** : un défaut mineur, l'accent sombre sur de petits textes.

Je propose de corriger ces quatre points et d'appliquer les améliorations du §1.6 seulement après votre accord.
