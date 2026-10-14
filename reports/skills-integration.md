# Bibliothèque de compétences (skills) — installation et connexion au studio

Date : 14/10/2026. Branche `claude/ecom-studio-ia-platform-8cwl79`.

## Ce qui a été fait

1. **Audit** de l'existant :
   - 10 compétences étaient déjà installées dans `.claude/skills`.
   - Le studio en utilisait déjà 5 pour les publicités (`src/lib/ai/skills.ts`).
   - Aucun plugin de compétences propre au projet.
   - Doublons :
     - `image` et `ad-creative` sont identiques au dépôt ;
     - `ads`, `ai-seo`, `pricing` et `seo-audit` étaient en retard d'une version mineure et ont été mis à jour ;
     - `canvas-design` et `web-design-guidelines` sont identiques ;
     - `brand-guidelines` garde sa version adaptée au studio.
2. **Sécurité** : chaque dépôt a été téléchargé dans un dossier isolé et ses scripts examinés.
   - Non recopiés : les scripts qui appellent des fournisseurs payants non autorisés.
     - `ugc-skills` : ElevenLabs, WaveSpeed, xAI, synchronisation labiale.
     - `remotion-ads` : Suno via browser-use, synthèse vocale Gemini et ElevenLabs.
   - Jamais exécuté : le `install.sh` de `ugc-skills`. Il écrit dans `~/.claude`, `~/.openclaw` et `~/voiceswap`, donc hors du projet.
   - UI UX Pro Max, installé par sa procédure officielle (CLI `uipro init --ai claude`) :
     - le CLI a d'abord été lancé dans un dossier d'essai et son code relu (téléchargement et copie de fichiers seulement) ;
     - seul le dossier `ui-ux-pro-max` a été gardé ;
     - les 6 autres compétences que le CLI ajoute (`brand`, `design`, `slides`…) ont été écartées : elles feraient doublon avec `brand-guidelines`.
3. **Installation** dans le projet (pas en global) : 67 compétences, 17 Mo. Claude Code les reconnaît : elles apparaissent dans sa liste de compétences disponibles.
4. **Connexion au studio** (`src/lib/ai/skills.ts`).
   - Mode d'intégration : la « Skills API » d'Anthropic demande l'outil d'exécution de code et un conteneur, absents ici, et n'existe pas chez OpenAI ni chez Gemini. Le studio transmet donc les consignes utiles dans le bloc de référence stable de l'appel. C'est le même texte pour tous les fournisseurs, il est compté dans le coût maximal réservé et mis en cache.
   - Sélection contextuelle :
     - 16 demandes reconnues : publicités (6), vidéo publicitaire, script UGC, page SEO, article, métadonnées, SEO local, textes du site, design du site, publication sociale, stratégie de marque ;
     - seules les sections utiles de chaque compétence sont transmises, jamais le fichier entier ;
     - le bloc est plafonné à 16 000 caractères (environ 4 000 jetons) ;
     - règles du studio ajoutées en tête : faits du projet uniquement, aucune position Google ni volume de recherche inventé, aucune personne à l'image sans autorisation, marque du client.
   - Moteurs branchés :

     | Moteur | Demande |
     |---|---|
     | Plan vidéo (`aiVideoPlan`) | vidéo publicitaire |
     | Video Engine V2 (script) | vidéo publicitaire |
     | Script UGC (`aiUgcScript`) | script UGC |
     | Marque (`aiBrand`) | stratégie de marque |
     | Textes de la boutique (`aiShopCopy`) | textes du site |
     | Design de l'accueil (`aiDesignHome`) | design du site |
     | Plan social et réécriture d'une publication | publication sociale |
     | SEO V2 (pages, articles, métadonnées, réécritures) | selon le projet : artisan → SEO local, boutique → pages produits |
     | Publicités et visuels | déjà branchés, inchangés |

   - Trace : nouvelle colonne `ai_calls.skills`. Chaque appel enregistre les compétences réellement transmises.

## Tests

- **Simulés (aucun coût)**, dans `tests/skills-bibliotheque.test.ts` :
  - présence et licence de chaque compétence ;
  - aucun script payant recopié ;
  - chaque section utilisée existe encore ;
  - sélection pour : vidéo 30 s 9:16, UGC, images publicitaires, site (design), SEO artisan et e-commerce ;
  - chaque moteur transmet les bonnes compétences ;
  - trace écrite dans `ai_calls`.
- **Non-régression** : le test historique `tests/skills-publicite.test.ts` passe.
- **Réels, par OpenAI** (passerelle de l'hébergement, modèle servi `gpt-5.6-sol`), projet SONORE :

  | Essai | Compétences tracées | Coût réel |
  |---|---|---|
  | Script UGC sans visage (mains et produit) | ugc-ad-strategist, ugc-video-producer, ugc-minimax-mode, social | 0,076 € |
  | Plan de vidéo publicitaire 30 s 9:16 (2 appels, le 2ᵉ réutilise le cache : 6 786 jetons lus) | remotion-ads, cutting-rhythm, video, social, captions, video-transitions, brand-guidelines | 0,199 € |
  | **Total** | | **0,275 €** |

- **Pas un test de qualité** : ces essais prouvent que les compétences sont chargées, transmises et tracées. Ils ne prouvent pas que les créations sont meilleures. C'est la prochaine étape.
- **Pas de rendu vidéo Remotion** :
  - Remotion n'est pas installé dans le projet, et son intégration dans le SaaS demande une décision de licence (ci-dessous) ;
  - le rendu vidéo du studio reste son moteur actuel (ffmpeg), inchangé.

## Licence Remotion (à décider avant toute intégration dans le SaaS)

Texte officiel (`LICENSE.md` du dépôt remotion-dev/remotion) :
- **Gratuit pour** : un particulier, une entreprise à but lucratif de **3 salariés au plus**, une association, ou une évaluation.
- **Au-delà** : une « Company License » payante est exigée.
- **Interdit** : revendre Remotion lui-même ou un dérivé.
- **Non précisé** par ce texte : le cas d'un SaaS qui fait le rendu des vidéos de ses clients. Il faut le vérifier sur remotion.pro/license ou auprès de Remotion.
- **Les compétences Remotion** (texte) n'ont pas de fichier de licence dans le miroir `remotion-dev/skills`. Elles relèvent du dépôt d'origine `remotion-dev/remotion`.

## Tableau

Légende :
- **INSTALLÉ** : présente dans `.claude/skills` et reconnue par Claude Code.
- **CONNECTÉ** : transmise par un moteur du studio.
- **TESTÉ réel** : appel réel vérifié dans `ai_calls`.
- **TESTÉ simulé** : sélection et transmission vérifiées sans appel réel.
- **BLOQUÉ** : dépendance ou décision manquante.
- **NON COMPATIBLE** : ne s'applique pas au moteur actuel.
- « Claude Code seulement » : utile quand je développe, sans moteur correspondant dans le studio.

| Compétence | Dépôt | Version / commit | Licence | Claude Code | Studio | Module | Dépendances manquantes | Coût | Tests |
|---|---|---|---|---|---|---|---|---|---|
| remotion-best-practices | remotion-dev/skills | 4.0.535 · 7ba4dcf | Remotion (dépôt d'origine) | INSTALLÉ | BLOQUÉ (rendu Remotion absent) | Vidéo (futur) | paquet `remotion` + licence | 0 € (texte) | présence |
| remotion-create | remotion-dev/skills | 4.0.535 · 7ba4dcf | Remotion | INSTALLÉ | BLOQUÉ | Vidéo (futur) | `remotion` | 0 € | présence |
| remotion-markup | remotion-dev/skills | 4.0.535 · 7ba4dcf | Remotion | INSTALLÉ | BLOQUÉ | Vidéo (futur) | `remotion` | 0 € | présence |
| remotion-render | remotion-dev/skills | 4.0.535 · 7ba4dcf | Remotion | INSTALLÉ | BLOQUÉ | Vidéo (futur) | `remotion` | 0 € | présence |
| remotion-captions | remotion-dev/skills | 4.0.535 · 7ba4dcf | Remotion | INSTALLÉ | BLOQUÉ | Vidéo (futur) | `remotion`, transcription | 0 € | présence |
| remotion-saas | remotion-dev/skills | 4.0.535 · 7ba4dcf | Remotion | INSTALLÉ | BLOQUÉ | Vidéo (futur) | `remotion` + licence SaaS | 0 € | présence |
| remotion-studio | remotion-dev/skills | 4.0.535 · 7ba4dcf | Remotion | INSTALLÉ | Claude Code seulement | — | `remotion` | 0 € | présence |
| remotion-multimedia | remotion-dev/skills | 4.0.535 · 7ba4dcf | Remotion | INSTALLÉ | BLOQUÉ | Vidéo (futur) | Mediabunny | 0 € | présence |
| remotion-ads | Maartenlouis/remotion-ads | 8c77946 | MIT | INSTALLÉ (sans scripts) | CONNECTÉ · TESTÉ réel | Vidéo (script, zones sûres) | rendu Remotion, voix ElevenLabs non installés | ≈ 0,07–0,13 € par plan vidéo (texte) | réel OK |
| remotion-marketing-video | sub-level/marketing-videos | 696073f | MIT | INSTALLÉ | Claude Code seulement | — | `remotion` | 0 € | présence |
| motion-from-reference | sub-level/marketing-videos | 696073f | MIT | INSTALLÉ | Claude Code seulement | — | ffmpeg (présent) | 0 € | présence |
| video-audio-stack | sub-level/marketing-videos | 696073f | MIT | INSTALLÉ | Claude Code seulement | — | fournisseurs audio externes non installés | 0 € | présence |
| ai-cinematic-broll | sub-level/marketing-videos | 696073f | MIT | INSTALLÉ | NON COMPATIBLE (Higgsfield) | — | Higgsfield non configuré (non ajouté) | — | présence |
| device-3d-stage | sub-level/marketing-videos | 696073f | MIT | INSTALLÉ | Claude Code seulement | — | three.js + `remotion` | 0 € | présence |
| editor | agamm/video-agent | cc00d28 | MIT | INSTALLÉ | Claude Code seulement | — | `video_agent.py` (non installé) | 0 € | présence |
| edl-edit | agamm/video-agent | cc00d28 | MIT | INSTALLÉ | Claude Code seulement | — | `video_agent.py` | 0 € | présence |
| cutting-rhythm | agamm/video-agent | cc00d28 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ réel | Vidéo (rythme) | — | inclus ci-dessus | réel OK |
| captions | agamm/video-agent | cc00d28 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ réel | Vidéo (sous-titres) | — | inclus | réel OK |
| audio-edit | agamm/video-agent | cc00d28 | MIT | INSTALLÉ | Claude Code seulement | — | ffmpeg (présent) | 0 € | présence |
| color-grade | agamm/video-agent | cc00d28 | MIT | INSTALLÉ | Claude Code seulement | — | ffmpeg (présent) | 0 € | présence |
| video-overlay | agamm/video-agent | cc00d28 | MIT | INSTALLÉ | Claude Code seulement | — | ffmpeg | 0 € | présence |
| video-transitions | agamm/video-agent | cc00d28 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ réel | Vidéo (transitions) | — | inclus | réel OK |
| reframe-social | agamm/video-agent | cc00d28 | MIT | INSTALLÉ | Claude Code seulement | — | ffmpeg | 0 € | présence |
| ugc-video-producer | kofiowusuai-lab/ugc-skills | 19eed84 | MIT | INSTALLÉ (sans scripts) | CONNECTÉ · TESTÉ réel | UGC (plan de tournage) | fournisseurs payants non ajoutés | ≈ 0,08 € par script | réel OK |
| ugc-ad-strategist | kofiowusuai-lab/ugc-skills | 19eed84 | MIT | INSTALLÉ (sans scripts) | CONNECTÉ · TESTÉ réel | UGC (accroche, promesse) | scraping des bibliothèques d'annonces non installé | inclus | réel OK |
| ugc-device-screen | kofiowusuai-lab/ugc-skills | 19eed84 | MIT | INSTALLÉ (sans scripts) | Claude Code seulement | — | scripts PDF/ebook non installés | 0 € | présence |
| ugc-minimax-mode | kofiowusuai-lab/ugc-skills | 19eed84 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ réel | UGC (dialogue, plan) | Grok/xAI non ajouté | inclus | réel OK |
| image | coreyhaines31/marketingskills | 2.0.2 · c7d7dfb | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Publicités, visuels | — | inclus dans la pub | simulé OK |
| ad-creative | marketingskills | 2.11.0 · c7d7dfb | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Publicités | — | — | simulé OK |
| ads | marketingskills | 2.4.7 · c7d7dfb | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Publicités (services) | — | — | simulé OK |
| video | marketingskills | 2.2.1 · c7d7dfb | MIT | INSTALLÉ | CONNECTÉ · TESTÉ réel | Vidéo | — | inclus | réel OK |
| product-marketing | marketingskills | 2.1.0 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Marque | — | — | simulé OK |
| customer-research | marketingskills | 2.0.4 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Marque (personas) | — | — | simulé OK |
| competitor-profiling | marketingskills | 2.1.3 | MIT | INSTALLÉ | Claude Code seulement | — | Firecrawl / DataForSEO (non ajoutés : sans données, risque d'inventer) | — | présence |
| marketing-plan | marketingskills | 1.2.2 | MIT | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| marketing-psychology | marketingskills | 2.0.0 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Textes du site, social, marque | — | — | simulé OK |
| social | marketingskills | 2.3.4 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ réel | Social, vidéo, UGC | — | inclus | réel OK |
| copywriting | marketingskills | 2.2.0 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Textes du site, SEO, social | — | — | simulé OK |
| copy-editing | marketingskills | 2.1.1 | MIT | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| content-strategy | marketingskills | 2.1.3 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | SEO (articles) | — | — | simulé OK |
| cro | marketingskills | 2.0.3 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Textes du site | — | — | simulé OK |
| ab-testing | marketingskills | 2.0.2 | MIT | INSTALLÉ | Claude Code seulement | — | outil de test A/B | — | présence |
| analytics | marketingskills | 2.1.0 | MIT | INSTALLÉ | Claude Code seulement | — | GA4/GTM | — | présence |
| attribution | marketingskills | 1.1.5 | MIT | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| emails | marketingskills | 2.1.3 | MIT | INSTALLÉ | Claude Code seulement | — | outil d'emailing | — | présence |
| onboarding | marketingskills | 2.0.2 | MIT | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| signup | marketingskills | 2.0.1 | MIT | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| pricing | marketingskills | 2.1.4 | MIT | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| churn-prevention | marketingskills | 2.0.3 | MIT | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| launch | marketingskills | 2.2.0 | MIT | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| offers | marketingskills | 1.0.2 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Textes du site | — | — | simulé OK |
| marketing-loops | marketingskills | 1.4.0 | MIT | INSTALLÉ | Claude Code seulement | — | planificateur | — | présence |
| seo-audit | marketingskills | 2.2.1 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | SEO V2 (toutes demandes) | données de positions non disponibles (rien d'inventé) | — | simulé OK |
| ai-seo | marketingskills | 2.7.6 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | SEO V2 (pages, articles) | — | — | simulé OK |
| programmatic-seo | marketingskills | 2.1.0 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | SEO local (artisan) | — | — | simulé OK |
| schema | marketingskills | 2.0.2 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | SEO V2 (données structurées) | — | — | simulé OK |
| site-architecture | marketingskills | 2.1.0 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | SEO V2 (URL, maillage) | — | — | simulé OK |
| frontend-design | anthropics/skills | dbd4588 | Apache 2.0 | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Design de l'accueil | — | — | simulé OK |
| canvas-design | anthropics/skills | dbd4588 | Apache 2.0 (+ polices OFL) | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Publicités, visuels | — | — | simulé OK |
| brand-guidelines | anthropics/skills (adaptée) | dbd4588 | Apache 2.0 | INSTALLÉ | CONNECTÉ · TESTÉ réel | Toutes les créations | — | inclus | réel OK |
| theme-factory | anthropics/skills | dbd4588 | Apache 2.0 | INSTALLÉ | Claude Code seulement (volontaire) | — | — | — | présence — ses 10 thèmes prédéfinis iraient contre la direction propre à chaque client |
| webapp-testing | anthropics/skills | dbd4588 | Apache 2.0 | INSTALLÉ | Claude Code seulement | Tests navigateur | Playwright pour Python non installé (Playwright Node présent) | — | présence |
| skill-creator | anthropics/skills | dbd4588 | Apache 2.0 | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| mcp-builder | anthropics/skills | dbd4588 | Apache 2.0 | INSTALLÉ | Claude Code seulement | — | — | — | présence |
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill | CLI 2.15.0 · 7246805 | MIT | INSTALLÉ | CONNECTÉ · TESTÉ simulé | Design de l'accueil | — (recherche Python vérifiée) | — | simulé OK |
| react-best-practices | vercel-labs/agent-skills | 1.0.0 · 063bee9 | MIT | INSTALLÉ | Claude Code seulement | Développement du studio | — | — | présence |
| web-design-guidelines | vercel-labs/agent-skills | 1.0.0 · 063bee9 | MIT | INSTALLÉ | Claude Code seulement | Revue d'interface | lit ses règles en ligne | — | présence |
| vercel-optimize | vercel-labs/agent-skills | 1.2.0 | MIT | **non installé** | — | — | le studio n'est pas hébergé chez Vercel (Codespaces / Docker) | — | — |

## Coûts et limites

- Les compétences n'ajoutent que du texte d'entrée : au plus environ 4 000 jetons par appel, mis en cache pour les appels suivants.
- Elles passent par les plafonds existants :
  - fournisseurs : 40 % de l'abonnement HT ;
  - recharges : 50 % HT ;
  - réservation du coût maximal ;
  - `ai_calls` ;
  - clés d'usage contre les doubles débits.
- Aucune nouvelle API payante n'a été ajoutée. Les compétences qui en demandent une sont marquées BLOQUÉ ou NON COMPATIBLE.
