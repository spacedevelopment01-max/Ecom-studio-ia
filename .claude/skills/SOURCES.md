# Compétences (skills) installées

| Compétence | Source | Version / commit | Licence |
|---|---|---|---|
| `image` | github.com/coreyhaines31/marketingskills — `skills/image` | 2.0.2 — dbd4588 | MIT (`LICENSE`) |
| `ad-creative` | github.com/coreyhaines31/marketingskills — `skills/ad-creative` | 2.11.0 — dbd4588 | MIT (`LICENSE`) |
| `ads` | github.com/coreyhaines31/marketingskills — `skills/ads` | 2.4.6 — dbd4588 | MIT (`LICENSE`) |
| `canvas-design` | github.com/anthropics/skills — `skills/canvas-design` | 0f8d899 | Apache 2.0 (`LICENSE.txt`) ; polices OFL (`canvas-fonts/*-OFL.txt`) |
| `brand-guidelines` | github.com/anthropics/skills — `skills/brand-guidelines` | 0f8d899, **modifiée** (`NOTICE.md`) | Apache 2.0 (`LICENSE.txt`) |

Déjà présentes avant : `ai-seo`, `pricing`, `seo-audit` (marketingskills), `verifier-theme`, `web-design-guidelines`.

## Deux usages

1. **Claude Code** charge ces dossiers (`.claude/skills/<nom>/SKILL.md`) comme compétences du projet.
2. **Le studio** (backend) lit les mêmes fichiers : `src/lib/ai/skills.ts` choisit les compétences utiles à
   chaque demande publicitaire et n'en transmet que les sections pertinentes aux modèles déjà connectés.

Mise à jour : recopier le dossier de la compétence depuis son dépôt, puis lancer `npx vitest run tests/skills-publicite.test.ts`
(le test échoue si une section utilisée par le studio a disparu ou a été renommée).
