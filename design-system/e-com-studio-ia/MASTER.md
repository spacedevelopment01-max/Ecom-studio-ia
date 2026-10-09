# Design System Master File — E-COM STUDIO IA

> **LOGIC:** When building a specific page, first check `design-system/e-com-studio-ia/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file. If not, strictly follow the rules below.

**Projet :** E-COM STUDIO IA
**Généré par :** UI UX Pro Max (`search.py --design-system --persist`, 2026-10-09), puis **ajusté à la direction
artistique validée par le propriétaire**. Les ajustements sont listés en fin de fichier.
**Requête :** « AI SaaS platform ecommerce midnight indigo premium ».
**Réglages :** Variance 6/10 (équilibré, moderne), Mouvement 6/10 (standard), Densité 3/10 (aéré).

---

## Global Rules

### Couleurs (tokens sémantiques, deux thèmes conçus ensemble — `dark-mode-pairing`, `color-dark-mode`)

| Rôle | Clair | Sombre | Variable |
|---|---|---|---|
| Fond de page | `#FAF9F6` (blanc cassé) | `#060A18` (bleu nuit profond) | `--paper` |
| Fond de bande | `#F1F4FB` | `#0A1024` | `--paper-2` |
| Surface (cartes, fenêtres) | `#FFFFFF` | `#0E1431` | `--card` |
| Texte principal / titres | `#0B1533` (bleu nuit) | `#EEF1FF` | `--ink` |
| Texte secondaire | `#2A3557` | `#C4CAE6` | `--ink-2` |
| Texte discret | `#586281` | `#9098BC` | `--muted` |
| Bordures | `#E2E6F0` | `#1D2548` | `--line` |
| Accent (boutons, icônes) | `#2F4BD8` | `#5865F2` | `--signal` |
| Accent pour **texte** | `#2F4BD8` | `#9AA6FF` | `--signal-text` |
| Accent secondaire (dégradés) | `#5A63E8` | `#9AA6FF` | `--signal-2` |
| Violet discret (dégradé des titres) | `#6650D2` | `#A890FF` | `--violet` |
| Texte sur accent | `#FFFFFF` | `#FFFFFF` | `--signal-ink` |
| À valider (statut) | `#7A4500` sur `#FCEBD0` | idem | — |
| Approuvé (statut) | `#165C3A` sur `#DDF2E6` | idem | — |

Contrastes **mesurés** (WCAG, `color-accessible-pairs`) :
- texte principal ≥ 16:1 ;
- texte secondaire ≥ 10,9:1 ;
- texte discret ≥ 5,5:1 ;
- accent texte : clair 6,1 à 6,7:1, sombre 8:1 avec `--signal-text` ;
- boutons : 6,7:1 en clair et 4,6:1 en sombre.

Règle : en sombre, **jamais `--signal` pour du texte de petite taille** (3,9 à 4,3:1), toujours `--signal-text`.

### Typographie (polices du studio, auto-hébergées, `font-display: swap`)

- **Titres :** Bricolage Grotesque (variable), graisse 600, interlettrage −0,035em, `text-wrap: balance`.
- **Texte :** Inter, 16 px minimum en corps de texte (`readable-font-size`), interligne 1,6 à 1,65.
- **Accent éditorial :** Instrument Serif italique (le « ia » du logo).
- **Échelle :** 12 · 13 · 15 · 16/17 · 20 · 24 · 32 · `clamp(2,2rem, 5vw, 4,1rem)` (titres de section) · `clamp(2,55rem, 4,5vw, 4,15rem)` (h1).
- **Plancher :** aucune étiquette sous 12 px sur téléphone.

### Espacements (densité 3/10, rythme de 4/8 px)

| Token | Valeur | Usage |
|---|---|---|
| `--space-xs` | 4 px | écarts serrés |
| `--space-sm` | 8 px | icône / texte |
| `--space-md` | 24 px | marges internes standard |
| `--space-lg` | 32 px | marges internes de section |
| `--space-xl` | 48 px | grands écarts |
| `--space-2xl` | 64 px | entre blocs |
| `--space-3xl` | 96 à 128 px | sections (`py-24` / `sm:py-32`) |

Largeur de contenu : `max-w-7xl` (1280 px). Marges latérales : 16 px sur téléphone, 24 px au-delà.

### Élévation (`elevation-consistent`)

- `--hp-elev` (clair) : trois couches douces `0 1px 1px / 0 8px 24px -12px / 0 32px 64px -32px` en bleu nuit à 4 à 22 %.
- `--hp-elev` (sombre) : liseré intérieur à 4 % plus ombre portée profonde. **Pas de halos néon.**

### Mouvement (`motion-consistency`, `duration-timing`, `easing`)

| Token | Valeur | Usage |
|---|---|---|
| `--hp-ease-out` | `cubic-bezier(.16,1,.3,1)` | arrivées (décélération) |
| `--hp-ease-in` | `cubic-bezier(.7,0,.84,0)` | sorties (accélération) |
| `--hp-dur-fast` | 180 ms | survol, appui |
| `--hp-dur-exit` | 300 ms | sorties (environ 60 % de l'entrée, `exit-faster-than-enter`) |
| `--hp-dur-enter` | 500 ms | entrées de panneaux, apparitions |
| fondu de thème | 140 ms + 260 ms | clair ↔ sombre : un seul voile à la couleur de l'ancien fond (opacité 0 → 1 en 140 ms, thème changé dessous, puis 1 → 0 en 260 ms) |
| décalage entre éléments | 40 ms | `stagger-sequence` |

- Animer **uniquement `transform` et `opacity`** (`transform-performance`, `layout-shift-avoid`).
- Mouvement réduit : état final immédiat, aucune rotation automatique, aucune lecture automatique.

---

## Component Specs

- **Bouton principal** : `hp-btn hp-btn-primary`
  - pilule, hauteur 48 px (56 px dans le hero), texte 15 px demi-gras, fond `--signal` ;
  - au survol : décalage de −1 px et ombre renforcée en 180 ms.
- **Bouton secondaire** : `hp-btn hp-btn-ghost`, bordure `--line` et fond translucide.
- **Commandes tactiles** : **44 px minimum** (`touch-target-size`), 8 px d'écart (`touch-spacing`).
- **Fenêtre de démonstration** : `hp-window`
  - rayon de 24 px, bordure `--line`, `--hp-elev` ;
  - barre à trois points, avec le libellé « Démonstration » quand c'est pertinent.
- **Pastille** : `hp-chip`, hauteur 32 px pour l'information (non cliquable) et 44 px quand elle est cliquable.
- **Sur-titre** : `hp-eyebrow`, 12,5 px, majuscules, interlettrage 0,18em, couleur `--signal-text`.
- **Icônes** : Lucide uniquement, trait de 2 px, 16 ou 20 px, `aria-hidden` quand un texte les accompagne.

---

## Style Guidelines

- **Style retenu :** « Premium SaaS éditorial ». Grandes surfaces calmes, titres forts, démonstrations encadrées,
  profondeur par les ombres plutôt que par les lueurs, verre dépoli limité à l'en-tête collant (`blur-purpose`).
- **Motif de page** (proposé par le skill et conservé) : *Feature-Rich Showcase*.
  - Une seule idée par bloc.
  - Appel à l'action répété : hero, après les fonctionnalités, en bas de page.

## Anti-Patterns (Do NOT Use)

- ❌ Emojis comme icônes
- ❌ Accent `#5865F2` pour du petit texte en sombre
- ❌ Transitions sur des milliers d'éléments (fondu de thème)
- ❌ Animer `left` / `top` / `width` / `height` ou `grid-template-rows`
- ❌ Contenu masqué qui attend JavaScript pour apparaître au-dessus de la ligne de flottaison
- ❌ Animation automatique sans pause ni arrêt au focus (`auto-rotation-controls`)
- ❌ Étiquettes de moins de 12 px sur téléphone
- ❌ Halos néon, palettes « jeu vidéo »

## Pre-Delivery Checklist (web — `quick-reference.md` §1 à §9 et liste de `pro-rules.md` adaptée au web)

- [ ] Pas d'emoji comme icône ; une seule famille d'icônes
- [ ] `cursor-pointer` sur tout élément cliquable ; survol de 150 à 300 ms
- [ ] Contraste ≥ 4,5:1 pour le texte, mesuré **dans les deux thèmes**
- [ ] Focus visible, ordre de tabulation logique, lien d'évitement, focus non masqué par l'en-tête collant
- [ ] Commandes ≥ 44 px sur téléphone, 8 px d'écart
- [ ] `prefers-reduced-motion` respecté
- [ ] Contenu en mouvement : pause et arrêt au focus
- [ ] 375, 768, 1024 et 1440 px, plus le mode paysage du téléphone ; aucun défilement horizontal
- [ ] Images : dimensions réservées (`aspect-ratio`), chargement différé hors écran, formats modernes
- [ ] Aucun contenu au-dessus de la ligne de flottaison masqué en attendant JavaScript
- [ ] Hiérarchie des titres sans saut

---

## Ajustements apportés à la sortie brute du skill (décisions du projet)

| Proposition du skill | Remplacée par | Raison |
|---|---|---|
| Palette « Premium dark + gold » (`#1C1917`, `#A16207`, fond `#0F172A`) | Palette bleu nuit / indigo / violet ci-dessus | Direction artistique demandée puis validée par le propriétaire |
| Polices Cormorant + Montserrat (luxe, mode) | Bricolage + Inter + Instrument (polices du studio) | Cohérence avec le studio ; pas de police externe à charger |
| Style « Liquid Glass » (habillage des systèmes Apple) | « Premium SaaS éditorial » ; verre limité à l'en-tête | Le style proposé vise des applications natives Apple, pas un site vitrine |
| Mouvement « Stagger List » avec GSAP `back.out(1.4)` | Transitions CSS, ease-out, décalage de 40 ms | Pas de bibliothèque ajoutée ; un léger dépassement ne convient pas à une interface d'information |
| Boutons à rayon 8 px | Pilules | Identité déjà validée |
