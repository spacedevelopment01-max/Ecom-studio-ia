# Inventaire, lecture 5 : les fondations (rapport reçu le 15 novembre 2026, lecture seule)

## Tableau
| Module | Ce qu'il fait | Taille | État | Pile | Risque |
|---|---|---|---|---|---|
| Comptes : src/lib/auth.ts, password.ts, registration.ts, src/app/api/auth | Inscription, connexion, sessions | ≈ 620 lignes, 7 routes | Sain | A | Faible |
| Base : src/lib/db.ts | Schéma et accès | 1 434 lignes ; 86 tables au centre, 43 créées par leurs modules | Sain, aucune table orpheline | A | Pas de migrations numérotées |
| Tâches de fond : worker/index.ts, worker/handlers.ts, src/lib/jobs.ts, job-recovery.ts | File, reprise, pause | 213 + 602 + 453 lignes ; 66 types | File saine ; handlers.ts mélange trois générations | B (garder la file, retirer les types morts) | Importe l'ancien moteur |
| Forfaits et budget : plans.ts, billing.ts, quotas.ts, plan-gates.ts, project-billing.ts | Droits, budget d'IA par projet | ≈ 1 600 lignes | Cœur sain ; restes : anciens packs, report, champs jamais lus (artDirections, adVariants) | B (nouvelle grille) | Tests chiffrés sur les prix actuels |
| Paiement : payments.ts, payments-v2.ts | Abonnement par projet, recharge | ≈ 940 lignes | Doublon : ancien paiement par compte (planCheckout, packCheckout) | B | Abonnés existants |
| IA : src/lib/ai/ | Fournisseurs, routage, tarifs, trace | 36 fichiers, 9 162 lignes | Portes saines ; choix des modèles éparpillé | B | Élevé : dépend de l'orchestrateur |
| Réglages : settings.ts, secrets.ts | Réglages, clés chiffrées | 156 lignes | Sain | A | Faible |
| Administration : src/app/api/admin, src/components/admin*.tsx | Clients, forfaits, fournisseurs, comptabilité | 27 fichiers d'API, ≈ 3 350 lignes d'écrans | Sain | B (écran des forfaits à suivre) | Faible |
| Catalogue : src/lib/products | Fiches, variantes, stock, trois connecteurs | 1 454 lignes | Sain ; doublon d'envoi Shopify avec src/lib/integrations/shopify.ts (pushCatalog) | A | Moyen |
| Rendez-vous et biens : rendez-vous.ts, salon/, cabinet/, restaurant/booking.ts, biens.ts | Réservations des sites de services, biens | ≈ 1 590 lignes | Sain | A | Faible |
| Fichiers, notifications, assistance, liste d'attente, langues : library.ts, support.ts, waitlist.ts, i18n*.ts | | ≈ 1 100 lignes | Sain | A | Faible |
| Mémoire : src/lib/brain, client-wording.ts | Faits du projet, vocabulaire | 1 692 + 223 lignes | brain sert surtout l'ancien agent (42 fichiers), SINA l'importe une fois | B (une seule mémoire) | Moyen |

## Forfaits et budget : endroits à toucher pour la nouvelle grille
- Prix : src/lib/plans.ts seulement (PLANS). En dur : « 129 € par mois » dans src/lib/job-entitlements.ts et src/components/studio/ad-campaigns.tsx.
- Abonnés actuels : repriceLegacySubscriptions (payments-v2.ts, route src/app/api/admin/billing/reprice-legacy).
- 40 % : SUBSCRIPTION_AI_SHARE et monthlyAllowanceMicro (billing.ts), appelés par ensureWallet, renewIfDue (remise à zéro), alignPeriod (début d'abonnement), syncAllowance, conformWallet. Pour 50 % le premier mois : rien n'indique « première période » ; alignPeriod est le bon endroit. Textes « 40 % » : adminAdjust, src/components/admin.tsx.
- Plafond : reserve et settle (billing.ts), seuil dans ai/access.ts.
- Pourcentage : aiPctBaseMicro, aiUsage, src/lib/budget-pct.ts, ai/budget-pct.ts ; rien à changer.
- Quotas existants : identités 2/3/4 (ROUTES_BY_PLAN, syna-agent/brand-routes.ts) ; publications par jour 1/3/5 (postsPerDay, plan-gates.ts) ; vidéos oui/non sans nombre par mois ; campagnes 0/0/illimité (campaigns, assertCampaignSlot, planAllowsAds) ; thèmes : droits par thème (theme/theme-rights.ts), deux sur mesure par mois ; blog 0/5/10 ; angles 1/2/5 (marketingAngles).
- Compteur mensuel réutilisable : quota_usage, consumeQuota, reserveBlogDraft (quotas.ts). Images et vidéos : branché mais éteint (quotaFor, ai/media-providers.ts).
- Options : mécanique des packs (PACKS, creditPack, packCheckout), plus en vente.
- Écrans : src/components/pricing.tsx, admin-plans.tsx, account.tsx, studio/project-subscription.tsx, src/app/conditions/page.tsx.

## Appels à l'IA
- Cinq portes, toutes par reserve / recordUsage / recordCall : texte (rawCall et otherCall dans ai/llm.ts, derrière llmText et llmJson, 38 fichiers appelants), recherche web (ai/web-search.ts), images et vidéos (gate dans ai/media-providers.ts), voix (video-v2/openai-voice.ts).
- Modèles par rôle, éparpillés : orchestrator/policy.ts, orchestrator/router.ts, ai/config.ts (routeFor, réglage ai.routes), ai/media-routing.ts, plus des choix écrits chez l'appelant (syna-agent/loop.ts, brand-chain.ts, tools/identity.ts, mockup-code/).
- Coût avant : maxCostMicro (llm.ts), ai/estimate.ts, assertUnderCostCap (ai/trace.ts). Après : recordUsage (billing.ts) et ai_calls.
- Cache des consignes : déjà utilisé pour le texte (promptHead, llm.ts).
- Différé : rien n'existe. À brancher dans rawCall et gate, sur le modèle « dépôt puis relève » (saveProviderReceipt, claimOperationRecovery). À adapter : RESERVATION_TTL_MS (2 heures), stopInterruptedPaidJob ; tarifs dans ai/config.ts. Candidats : syna.brand, syna.custom.brand, syna.posts.plan, social.v2.produce.

## Tâches de fond sans déclencheur
Sans mise en file trouvée : plan.run, stock.search, image.single, ugc.script, video.ugc, brand.fulllogo, calendar.plan, post.regenerate ; par ricochet video.render. Treize types agent.* et workflow.run, pipeline.run, project.prepare appartiennent aux anciennes façons.

## Tests (706 fichiers de test, 81 d'accompagnement)
SINA 45 (dont 9 maquettes) ; ancien agent 126 ; Pilote, préparation, stratégie 70 ; thème 114 ; publications 42 ; publicités 30 ; vidéos 36 ; images et logos 58 ; forfaits et paiement 37 ; autres 148. Tomberaient avec les anciennes façons : les 126 et les 70, plus une partie des 147 qui importent src/lib/engine. 36 fichiers citent les projets d'essai, 19 les démonstrations abandonnées. 53 tests lisent scripts/, 14 docs/.

## Scripts et documents
- Scripts (476 fichiers) : servent encore dev.mjs, studio.mjs, maj.mjs, setup.ts, prepare-theme-demos.ts, verify-theme.sh, theme-screens.ts, lot9/network-guard.mjs, sections-library.py, section_buy_fix.py, narrate-tutorials.ts. À archiver : verify-* (54), syna301-* (27), parity301-* (15), agent211-*, lot1 à lot2c, mission*, benchmark-*.
- CI (.github/workflows/ci.yml, 510 lignes) : une trentaine d'étapes lancent scripts/verify-agent211-build.ts et les recettes de l'ancien agent.
- Documents (3 594 fichiers, 687 Mo) : garder docs/studio/, docs/sina-savoir/, docs/theme-briefs/, docs/design/, les deux guides, les LISEZMOI des thèmes. Archiver docs/coordination/ (1 769 fichiers), les vingt dossiers docs/syna-*, docs/preuves, docs/fusion, reports/ (3 382 fichiers, 911 Mo), et à la racine ARVEN_PUBLICITE_VIDEO, ARVEN_VIDEO_WAN26, SONORE_VIDEO_WAN, PAYSAGISTE_VIDEO.

## CLAUDE.md
Restent : français simple, jamais d'anglais ; jamais de clé dans la conversation ; rien d'inventé ; prix avant, accord écrit, jamais de relance seule ; coûts en pourcentage ; jamais de personne sans photo ou accord ; mots du client gardés ; Claude tranche, il dit oui ou non ; fusion sur demande ; contrôles avant envoi ; renvoi vers docs/studio/LE-STUDIO-DE-A-A-Z.md. En archive : journaux des essais, détail des thèmes et démonstrations, chantiers datés, missions numérotées, noms des fonctions.

## Surprises
- src/lib/stock = banque de photos, musiques et plans libres de droits (pas le stock des produits, qui est dans src/lib/products/sync.ts).
- La couche d'IA importe src/lib/orchestrator (router.ts, policy.ts, capabilities.ts, history.ts, text-routing.ts) : à extraire avant de supprimer l'orchestrateur.
- docs/sina-savoir/ est lu par le code pendant le travail de SINA : ne pas l'archiver.
- Aucun outil de SINA n'appelle addWordingRule (seule la route src/app/api/projects/[id]/wording/route.ts).
- Deux portes de conversation : src/app/api/studio-agent (25 routes) et src/app/api/syna (7).
- 132 des 200 dernières livraisons porteraient une signature de co-auteur (à vérifier).

## Non vérifié
Suite de tests non lancée ; colonnes inutilisées ; taux réel de lecture du cache et place des cahiers dans la partie mise en cache ; remise du différé chez les fournisseurs ; drapeaux STUDIO_* en production ; options mensuelles ou achat unique.
