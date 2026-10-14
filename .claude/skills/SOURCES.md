# Compétences (skills) installées

Installées dans le projet (`.claude/skills/<nom>/`), jamais en global. Copie du texte et des références des
dépôts d'origine ; **les scripts de tiers qui appellent des fournisseurs payants ne sont pas recopiés** (ElevenLabs,
WaveSpeed, xAI, Suno via browser-use, synchronisation labiale) et **aucun `install.sh` n'a été exécuté**.
Rapport complet : `reports/skills-integration.md`.

| Dépôt | Commit | Licence | Compétences |
|---|---|---|---|
| github.com/remotion-dev/skills | 7ba4dcf (v4.0.535) | Licence Remotion du dépôt d'origine (pas de fichier dans le miroir) — voir le rapport | remotion-best-practices, remotion-create, remotion-markup, remotion-render, remotion-captions, remotion-saas, remotion-studio, remotion-multimedia |
| github.com/Maartenlouis/remotion-ads | 8c77946 | MIT (`LICENSE`) | remotion-ads (sans `scripts/` ni `package.json`) |
| github.com/sub-level/marketing-videos | 696073f | MIT | remotion-marketing-video, motion-from-reference, video-audio-stack, ai-cinematic-broll, device-3d-stage |
| github.com/agamm/video-agent | cc00d28 | MIT | editor, edl-edit, cutting-rhythm, captions, audio-edit, color-grade, video-overlay, video-transitions, reframe-social |
| github.com/kofiowusuai-lab/ugc-skills | 19eed84 | MIT | ugc-video-producer, ugc-ad-strategist, ugc-device-screen, ugc-minimax-mode (sans `scripts/`) |
| github.com/coreyhaines31/marketingskills | c7d7dfb | MIT | image, ad-creative, ads, video, product-marketing, customer-research, competitor-profiling, marketing-plan, marketing-psychology, social, copywriting, copy-editing, content-strategy, cro, ab-testing, analytics, attribution, emails, onboarding, signup, pricing, churn-prevention, launch, offers, marketing-loops, seo-audit, ai-seo, programmatic-seo, schema, site-architecture |
| github.com/anthropics/skills | dbd4588 | Apache 2.0 (`LICENSE.txt` de chaque compétence) | frontend-design, canvas-design, theme-factory, webapp-testing, skill-creator, mcp-builder ; `brand-guidelines` : version **adaptée** au studio (`NOTICE.md`) |
| github.com/nextlevelbuilder/ui-ux-pro-max-skill | 7246805 — CLI officiel `ui-ux-pro-max-cli` 2.15.0 (`uipro init --ai claude`) | MIT | ui-ux-pro-max (seul dossier demandé gardé) |
| github.com/vercel-labs/agent-skills | 063bee9 | MIT (README du dépôt) | react-best-practices, web-design-guidelines |

Projet : `verifier-theme` (propre au studio).

## Deux usages

1. **Claude Code** charge ces dossiers comme compétences du projet.
2. **Le studio** (backend) lit les mêmes fichiers : `src/lib/ai/skills.ts` choisit les compétences utiles à chaque
   demande (publicité, vidéo, UGC, SEO, textes et design du site, réseaux sociaux, stratégie de marque), n'en transmet
   que les sections utiles (bloc plafonné à 16 000 caractères) et la trace `ai_calls.skills` dit lesquelles ont servi.

Mise à jour : recopier le dossier depuis son dépôt (sans les scripts de fournisseurs payants), puis lancer
`npx vitest run tests/skills-bibliotheque.test.ts tests/skills-publicite.test.ts` (échec si une section utilisée a
disparu ou a été renommée).
