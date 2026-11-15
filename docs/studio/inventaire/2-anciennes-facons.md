# Inventaire, lecture 2 : ce qui crée ou pilote un projet hors de SINA (rapport reçu le 15 novembre 2026, lecture seule)

## Modules (A garder / B rebrancher ou refaire / C supprimer)
| Module | Ce qu'il fait | Lignes | Pile | Note |
|---|---|---|---|---|
| src/lib/orchestrator/{router,policy,capabilities,history,text-routing}.ts | Choisit le fournisseur d'IA | ~580 | A | Fondation de la couche d'IA |
| orchestrator/{execute,planner,intent,index,request,references,title-edit}.ts | Enveloppe 30 tâches de fond d'un petit plan tracé (orchestrated, ACTION_STEPS) | ~1 300 | B | SINA passe dedans sans le savoir (image.v2, ads.v2, blog.write…) ; seul runRequestPlan est mort ; 143 tests citent l'orchestrateur |
| orchestrator/conversation/ : l'ancien agent | Première conversation, ses outils et confirmations | 98 fichiers, 5 841 | C | 25 routes api/studio-agent, api/projects/[id]/conversation, 13 tâches agent.*, 7 crochets agent…Quote dans image.v2, video.scenes, video.v2.render, brand.logo.v2(.choose) ; 44 conversation-*.tsx, 19 use-*.ts, 22 src/lib/*-confirmation-client.ts ; fermé par STUDIO_CONVERSATION_LOT_A/AI/UI ; 129 tests, 83 scripts ; importé par theme/composition/*, app/preview/…/route.ts, video-v2/conversation-motion.ts, api/projects/[id]/route.ts, agent-ui-context.tsx, SINA (emptyInput) ; table agent_conversations partagée avec SINA |
| engine/pipeline.ts, launchPipeline (src/lib/project-start.ts), routes /start (flux « legacy ») et /resume | Création complète en dix étapes | 687 | C | Refait tout le parcours, sans devis ; projets sans préparation (nombre inconnu) |
| workflow/index.ts, workflow-panel.tsx, routes workflow | « Dites en une phrase tout ce que vous voulez » | 609 + 370 | C | Seconde porte d'entrée ; requestReplacesCalendar lu par project-start.ts |
| workflow/propagation.ts | Reporte un changement de marque partout | 442 | A | Réutilisé par SINA |
| preparation/ | Fiche, recherche, devis, validation ; juge des angles | 30 fichiers, 3 823 | A, à réduire | SINA s'en sert (fiche, recherche, angles) ; ses étapes marque, contenus, médias font doublon ; 76 tests |
| marketing-strategy/ | Stocke les angles, l'angle actif, les révisions | 10 fichiers, 1 732 | A | Chaque création vérifie l'angle actif |
| engine/{brand,identity,creative-direction,brand-check,logo-job,full-logo,client-logo,social-kit}.ts | Ancienne marque en un appel, anciens logos | ~2 100 | C, sauf saveBrandBook, saveIdentityBoard | Double syna.brand ; logo-v2/choose.ts en dépend |
| logo-v2/ | Moteur de logos | 21 fichiers, 3 979 | A pour engine, ai, artwork, choose, quote, territories, types ; C pour native-consent, live, identity, discovery, selection, commands, creation-quote, accepted-directions, brand-board | direction-series.ts lu par 11 modules ; 42 tests |
| media/ | Compositions, vidéo, détourage, polices, planche d'identité, charte | 26 fichiers, 8 306 | A | Moteurs |
| engine/{shop,local,local-copy,local-first,images,cutouts,service-media,photo-line,services-text,blog,site-import,site-reproduce,import-link,catalog,ai-post-image,ad-craft,ads}.ts | Thème, moteur sans IA, images, blog, lecture d'un site | ~10 000 | A | Moteurs ; 68 tests sur local.ts, 59 sur shop.ts |
| engine/custom-theme.ts, custom-theme.tsx, route theme/custom | Ancien sur mesure : sections écrites par l'IA | 531 + 149 | C | Double custom.* ; syna-agent/mockup-code/deps.ts en reprend les contrôles |
| engine/{calendar,videos,ugc}.ts | Ancien calendrier, anciennes vidéos | 1 791 | C | Aucune mise en file ; video-v2/ugc.ts importe engine/ugc |
| brain/ | Mémoire du projet, empreintes, métiers | 14 fichiers, 1 692 | A, sauf views.ts (421, orchestrateur seul) | Sert la couche d'IA et les moteurs (hash.ts par 80 fichiers) |
| quality/, contenus/ | Barrière de qualité ; carte, réalisations, prestations | 564 ; 961 | A | |
| project-handoff/ | Contrat entre la préparation et le thème | 303 | B | Suit l'écran de préparation |
| shop.chat (worker/handlers.ts) | Retouche du thème par discussion | ~140 | B | Double « Désigner un élément » ; opérations validées à garder |

## Écrans vus sans le fil de SINA
Sans STUDIO_SYNA_AGENT=1 ni STUDIO_SYNA_SHELL=1, le client n'a que ces écrans (src/components/studio/shell.tsx, 19 onglets). Tout projet s'ouvre sur /pilote.
| Écran | Ce qu'il permet | Lignes | Cible |
|---|---|---|---|
| home.tsx | Formulaire de création (POST /api/projects, flux « preparation ») | 622 | C (SINA ouvre le projet) ; garder la liste des projets |
| tab-pilote.tsx | Préparation, ou ancien suivi, start-creation.tsx, workflow-panel.tsx, /resume | 497 | C ; chantier-view.tsx le remplace déjà |
| tab-preparation.tsx, brief-fiche.tsx, preparation-handoff.tsx, initial-*.tsx, analysis-retry.tsx | Fiche, recherche payante, marque, contenus, médias | 1 575 + ~470 | C |
| tab-strategie.tsx, marketing-strategy.tsx, strategy-status.tsx | Cinq angles, révisions payantes | ~150 | B (consultation des trois angles) |
| tab-marque.tsx, logo-v2-panel.tsx, full-logo-panel.tsx | Marque et logo | 625 + 440 | B (voir, télécharger, régler) |
| tab-produit.tsx, tab-activite.tsx, tab-catalogue.tsx | Fiches, détourage, envoi aux boutiques | 939 | A ; retirer « Réanalyser » |
| tab-boutique.tsx et panneaux | Aperçu, sections, export, shop.build, shop.direction, shop.chat, theme.custom, shopify.push | 1 095 | B (aperçu, réglages, export ; discussion vers SINA) |
| tab-biens, tab-carte, tab-realisations, tab-rendez-vous | Saisie des contenus de services | 790 | A |
| tab-images, tab-videos | Banques, création payante | 691 | B |
| tab-publications, tab-calendrier (social-studio.tsx), tab-publicites, ad-editor/ | Publications, pilote automatique, publicités | ~4 900 | B (validation, calendrier, retouche simple) |
| tab-blog.tsx | Articles (content.v2) | 637 | B |
| tab-prompts.tsx | Bibliothèque de consignes, appel d'IA direct | 264 | C |
| tab-fichiers, tab-connexions | Fichiers, comptes reliés | 375 | A |

## Doubles emplois avec SINA
Ancien agent (SINA en entier) ; pipeline.run et workflow.run (tout le parcours) ; préparation du Pilote (connaissance, marque, contenus, médias) ; onglet Stratégie à cinq angles ; brand.build, brand.logo, panneau Logo V2, agent.brand.propose ; theme.custom ; shop.chat ; engine/calendar.ts.

## Ce que SINA réutilise (à garder)
preparation/{engine,store,quote,inspect,understanding}, marketing-strategy/{index,visibility}, logo-v2/{engine,ai,artwork,choose,quote,territories,types}, media/{identity-board,fonts,cutout,logo,logo-symbol}, engine/{shop,local,brand,identity-board,blog,site-import,site-reproduce,import-link,custom-theme}, workflow/propagation, contenus/prestations, brain/hash, orchestrator/conversation/store (emptyInput seulement).
Tâches mises en file par SINA : project.prepare, brand.build, shop.direction, image.v2, video.v2.render, social.v2.produce, ads.v2, blog.write, files.classify.

## Code mort
Tâches sans mise en file : plan.run, stock.search, calendar.plan, post.regenerate, ugc.script, video.ugc, image.single, brand.fulllogo ; video.render seulement depuis createContentPlan (orphelin). Routes ugc et brand/full-logo : 410. src/lib/engine/logo-symbol.ts (91) et src/components/studio/palette-picker.tsx (66) : aucun import. brain/measure.ts : un script seulement. Réserve : tâches déjà en file dans une base existante.

## Surprises
1. src/lib/brain : 14 fichiers (pas 42), sert surtout la couche d'IA et les moteurs.
2. Dans l'interface classique, le bouton « SINA » (ConversationDock, conversation-panel.tsx) ouvre l'ancien agent, même SINA allumée (lu, pas essayé).
3. SINA garde l'outil brand.create (tools/commerce.ts) qui lance l'ancienne brand.build, « 3 pistes de logo ».
4. « Réanalyser le produit » (tab-produit.tsx, tab-activite.tsx) relance marque, textes, images et la suite par /resume, avec une simple confirmation et sans prix.
5. L'orchestrateur enveloppe presque toutes les tâches de fond : il ne se supprime pas d'un bloc.
6. /studio/themes et l'accueil Découverte annoncent « Les 30 thèmes » ; l'onglet Stratégie parle de « cinq propositions ».
7. Les onglets vouvoient, SINA tutoie.

## Non vérifié
Aucun test ni écran lancé ; nombre de projets existants sans préparation ou avec des tâches anciennes en attente ; contrôles de forfait de pipeline.run ; fichiers morts dans orchestrator/conversation/ ; ad-editor/ et détail des onglets Images, Vidéos, Publicités, Blog ; tests qui casseraient réellement (comptés par grep).
