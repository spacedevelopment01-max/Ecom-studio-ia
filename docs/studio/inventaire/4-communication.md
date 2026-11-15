# Inventaire, lecture 4 : la communication (rapport reçu le 15 novembre 2026, lecture seule)

## Piles (A garder / B reconstruire ou rebrancher pour SINA / C supprimer)
| Module | Ce qu'il fait | Lignes | Pile | Note |
|---|---|---|---|---|
| src/lib/social/ (publish.ts, oauth.ts) | Connexion des comptes et envoi par les accès officiels | 643 | A | Seule façon d'envoyer ; Shopify et Canva se connectent aussi par là |
| social-v2 : scheduler.ts, approval.ts, networks.ts, platforms.ts, quality.ts | Programmation, accord par version, verrou, journal, état « incertain » | ≈ 1 100 | A | Fondation solide |
| social-v2/autopilot.ts, automations.ts | Pilote automatique (boucle du worker toutes les 6 h) | 449 | B | Bon socle, SINA ne le pilote pas |
| social-v2 : planner.ts, editorial.ts, copy.ts, strategy*.ts, memory.ts, local-edit.ts, engine.ts, single.ts | Dates, créneaux et textes par gabarits, sans IA | ≈ 2 700 | B | Dates à garder ; textes par gabarits = ancienne façon |
| social-v2/production.ts, deps.ts, ai-post.ts | Image d'une publication : rédacteur, image, relecture en image, 3 essais au plus | ≈ 2 300 | B | Cœur réel, mais le texte est écrit DANS l'image |
| social-v2/initial*.ts | « 20 créations » du départ | 653 | C (à confirmer) | Ancien parcours ; onglet Publicités à corriger |
| syna-agent/posts-plan.ts, posts-knowledge.ts, tools/posts.ts | Plan des 3 groupes : stratège, contrôles, juge | 622 | B | Bonne méthode, limitée à 3 groupes, sans calendrier |
| syna-agent/calendar.ts, tools/calendar.ts | Calendrier MANUEL (le client publie lui-même) | 669 | C | Contredit la cible, doublon du programmateur ; étape 11 à rebrancher |
| syna-agent/tools/steps-late.ts | Étapes 10 à 13 | 186 | B | Fermées, jamais essayées |
| ads-v2 (moteur) | Angles, textes, contrôle des promesses, image finale par format | ≈ 1 900 | B | Complet, jamais essayé |
| ads-v2/compose.ts, poster.ts, library/ + ad-doc/ + ad-editor/ | Mise en page à calques modifiable (dizaines de modèles) | ≈ 8 900 | A (ad-doc), B (modèles) | Seule brique « façon Canva » ; sert au rendu des vidéos |
| campaigns/ | Brouillon de campagne | 50 | A | |
| image-v2/ | Moteur d'images général (banque d'abord, puis IA) | 4 049 | B | Seconde façon de créer une image |
| ai/media-*.ts, social-image-policy.ts | Porte unique des images et vidéos, réglages, tarifs | 2 674 | A | |
| video-v2/ | Document vidéo, montage, voix, musique, contrôles | 7 333 | A (rendu, audio, contrôles), B (création) | Deux façons de créer (engine.ts, three-scenes.ts) |
| stock/, media/song.ts, music-library.ts | Banques libres de droits, compositeur maison | ≈ 1 400 | A | |
| seo-v2/ et engine/blog.ts | Deux moteurs d'articles (onglet Blog → content.v2 ; SINA → blog.write) | 3 506 + 596 | B | En garder un seul |
| engine/calendar.ts, engine/videos.ts, engine/ugc.ts | Anciens calendrier, vidéo, vidéo « créateur » | 1 791 | C | Morts |
| social-studio.tsx, social-create.tsx, post-editor.tsx, tab-videos.tsx, tab-publicites.tsx | Écrans | ≈ 2 600 | B | |
| tutorials/, integrations/canva.ts, capcut.ts | Tutoriels ; envoi vers Canva ; dossier pour CapCut | 626 | A | |

## Chaîne d'une publication aujourd'hui
1. Plan : SINA (posts-plan.ts, étape 9 fermée) ou gabarits (planner.ts). Seul essai réel (Pulpe) joué à la main.
2. Image : ai-post.ts, OpenAI imposé. Jamais essayée pour de vrai dans le Studio.
3. Relecture : modèle qui voit, 3 essais au plus, sinon la publication attend.
4. Mise en page : texte et logo écrits DANS l'image par le modèle ; le Studio ne pose rien ; seconde étape « texte et logo » par une autre IA, éteinte.
5. Calendrier : onglets = accord puis programmation (schedulePosts) ; SINA = calendrier manuel.
6. Envoi : boucle du worker → post.publish → publishOne → social/publish.ts. Automatique, jamais vérifié sur un vrai compte.

## Réseaux
Instagram : connexion et envoi écrits (image, carrousel 10, vidéo courte, story). Facebook Page : écrits (texte, lien, image, plusieurs images, vidéo). TikTok : écrits, vidéo seulement, « moi uniquement » tant que TikTok n'a pas validé. YouTube : écrits, vidéo courte, privée tant que Google n'a pas validé. Pinterest : écrits (épingle image ou vidéo). LinkedIn : absent (copie à la main). Fiche Google, X, Threads : absents. Statistiques des réseaux : absentes (analytics.ts sans fournisseur).

## Écarts avec la cible
Publications automatiques : le pilote sait jours, heures, réseaux, nombre par jour, accord écrit horodaté, plafond par semaine (% du budget), pause, réseaux suspendus, mots exclus. En mode « gratuit » (défaut) il ne crée aucune image. Ses textes viennent des gabarits, pas de la stratège ni du juge. SINA n'a aucun outil pour le régler (étape 11 : AUTO_PUBLISH_AVAILABLE = false). Quotas 1/3/5 au lieu de 1/2/3 ; pas de compteur de vidéos ni de campagnes. À l'étape 9, SINA paie une image par groupe ET par réseau ; une adaptation gratuite existe (post-format.ts). Pas de composition « façon Canva » ni de retouche d'un mot : image à plat.
Vidéos : existent plans créés par IA (adaptateurs Google, Alibaba, fal, Higgsfield, « écrits, non vérifiés »), plans de banque, photos animées, titres et carte de fin, transitions, formats, voix, musique, sous-titres, mention IA, contrôle du fichier. Manque : sous-titres animés mot à mot, coupes au rythme, effets ; 3 scènes de 15 s par défaut ; aucun essai réel. Sans vidéo, rien sur TikTok ni YouTube.
Publicités : préparé (angles, audiences, budget d'essai engine/ads.ts, textes, créations par format, export en tableau ad-campaigns.tsx). Lancement et suivi absents ; aucune régie.

## Doublons
Trois calendriers (engine/calendar.ts mort ; social-v2 ; syna-agent/calendar.ts manuel). Trois façons de poser le texte (dans l'image par l'IA, seule vivante ; seconde IA éteinte ; calques du Studio ads-v2/poster.ts et image-v2/text-layer.ts débranchés). Trois façons de créer une image (ai-post.ts ; image-v2 ; brand-images.ts). Deux moteurs vidéo vivants (video-v2/engine.ts, three-scenes.ts) et un ancien (engine/videos.ts, media/video.ts dont synthMusic sert encore). Deux moteurs d'articles. Deux routes de publication (api/posts/[pid] ancienne, encore appelée par post-editor.tsx ; social/v2/posts/[postId]). Quatre portes d'entrée sur les mêmes moteurs : onglets, Pilote (engine/pipeline.ts), première conversation (orchestrator/conversation), SINA.

## Où brancher le différé
ai/media-providers.ts (generateImageImpl, aiPostImage) ; social-v2/production.ts (produceBatch) ; autopilot.ts étape 2 ; ai-post.ts et publication-recipe.ts (reçus durables) ; syna-agent/posts-plan.ts et ai/llm.ts ; worker/index.ts (tick).

## Code mort (recherche de texte)
Tâches sans mise en file : calendar.plan, post.regenerate, image.single, ugc.script, video.ugc, stock.search ; video.render seulement par engine/calendar.ts (mort). Donc engine/calendar.ts, engine/videos.ts, produceUgc / writeUgcScript. social-v2/deps.ts : localRender, posterForPost, outils image/ad/local (tests seulement). engine/images.ts : generateImageSet, generateSingleImage, photoSetPlan. Sans importeur : image-v2/text-layer.ts, image-v2/plates.ts, ads-v2/feature-icons.ts, ad-doc/ai-edit.ts. Route api/projects/[id]/ugc : ne fait que refuser.

## Surprises
Pilote automatique et envoi tournent dans le worker, mais SINA a son calendrier manuel : ils ne se rencontrent jamais. La seule brique proche de Canva (calques, modèles, éditeur) a été débranchée des publications par la règle « images 100 % IA » ; « texte dans l'image ou posé par le Studio » pas tranché. Les images finales des publicités passent par aiPostImage, donc OpenAI, alors que CLAUDE.md dit que les publicités gardent leur réglage (à confirmer). CapCut n'a pas d'accès public : le Studio prépare un dossier à importer.

## Non vérifié
Aucun test, écran ni vidéo. Applications auprès de Meta, TikTok, Google, Pinterest créées ou validées ? Code mort par recherche de texte seulement. Image partagée entre réseaux d'un même créneau par le pilote ? Première conversation et src/lib/workflow non inventoriés.
