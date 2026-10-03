# E-COM STUDIO IA

Plateforme qui transforme un produit — une photo, un lien de fiche produit ou quelques lignes — en marque, boutique Shopify, images, vidéos, publications et calendrier, avec un studio où l'on garde la main à chaque étape.

## Démarrer

Prérequis : Node.js 22+, `ffmpeg`/`ffprobe` dans le PATH.

```bash
npm install
npm run setup      # crée .env.local (APP_SECRET aléatoire) et la base SQLite dans ./data
npm run dev        # site (http://localhost:3000) + worker de tâches de fond
```

Production : `npm run build` puis `npm start` (lance le site **et** le worker). Le worker doit tourner en continu : c'est lui qui exécute les créations longues et les publications programmées, navigateur fermé.

L'administration (`/admin`) est réservée au propriétaire : définissez `ADMIN_EMAIL` avec votre adresse, seul ce compte sera administrateur. Sans `ADMIN_EMAIL`, seul le tout premier compte créé l'est. Le rôle ne peut pas être transmis depuis le studio.

Autres commandes : `npm test` (tests vitest), `npm run typecheck`, `npx tsx scripts/theme-check.ts` (Shopify Theme Check sur une direction ; boucle sur les 11 en CI), `npx tsx scripts/e2e-pipeline.ts <photo>` (pipeline complet sans navigateur), `CHROMIUM=… PHOTO=… npx tsx scripts/e2e-browser.ts` (parcours navigateur bureau + mobile), `npx tsx scripts/build-demos.ts` (régénère les démonstrations de la page d'accueil), `npx tsx scripts/build-explainers.ts` (régénère les cinq vidéos explicatives de l'accueil à partir des démonstrations).

### Essayer sans rien installer (GitHub Codespaces, gratuit)

Sur la page du dépôt : **Code › Codespaces › Create codespace on main**. L'installation se fait seule (5 minutes environ la première fois), puis le studio s'ouvre dans un onglet. Le quota gratuit de GitHub couvre environ 60 heures par mois ; arrêtez le codespace quand vous avez fini.

## Ce qui fonctionne sans aucune clé externe

Le **moteur intégré** tourne entièrement sur le serveur :

- détourage local du produit (modèle ONNX embarqué), couleurs mesurées, gros plans tirés de la photo d'origine ;
- analyse prudente : rien n'est inventé, l'inconnu reste « [À compléter : …] » et seules les questions indispensables sont posées (prix, nom, livraison, retours) ; les réponses remplacent les marques à compléter partout (boutique, publications, textes) ;
- marque : nom proposé (ou le vôtre), palette tirée du produit avec contrastes WCAG, typographies, logo vectoriel (SVG/PNG, version claire, monogramme, favicon), charte ;
- **thème Shopify Online Store 2.0 réel** : 11 directions (dont Flux, Joaillerie, Gourmand), plus de 40 sections (héros immersifs, cartes néon, chiffres animés, avant/après, cercles façon stories, frise, cartes empilées, texte en courbe, vidéos verticales, vagues), accueil, fiche produit (variantes, prix, panier latéral AJAX, achat collant), collection, recherche, panier, pages Notre histoire / FAQ / Contact / Livraison et retours, politiques à compléter, 404, mot de passe, comptes clients, carte cadeau ; animations compatibles « réduire les animations » ; 0 erreur Shopify Theme Check ;
- projet créable sans photo ni lien (l'entrée produit s'ajoute plus tard) ; pause et reprise des créations en cours, sans refaire les étapes terminées ;
- galerie des 11 thèmes (bouton « Thèmes » de l'éditeur, page `/studio/themes`) ;
- éditeur de boutique : discussion + aperçu côte à côte (pages, ordinateur/tablette/téléphone, désignation d'un élément), structure, verrous, versions et restauration. **L'aperçu, la version enregistrée et le ZIP exporté proviennent des mêmes fichiers** (empreinte affichée). Sans IA, l'éditeur comprend des commandes simples (couleur des boutons, texte entre guillemets, ajouter une FAQ, monter, supprimer, revenir en arrière, changer de direction) ;
- exports WooCommerce (thème bloc installable), PrestaShop (thème enfant), Wix et Squarespace (kits : ces plateformes n'acceptent pas de thème importé — c'est indiqué) ;
- images réelles : packshots, détails, scènes (studio, podium, arche, fenêtre, projecteur, aplats), bannières, visuels sociaux et publicités 1:1, 4:5, 9:16, 16:9, avec textes composés typographiquement et zones de sécurité ;
- vidéos MP4 H.264 réelles (9:16, 1:1, 4:5, 16:9) en motion design image par image (révélation, gros plans, légendes, transitions, musique originale synthétisée, sous-titres SRT), pack CapCut ;
- bibliothèque de fichiers (dossiers, sous-dossiers, import, déplacement, recherche, versions, usages, corbeille ; le rangement automatique ne supprime jamais) ;
- 200 prompts français (10 secteurs × 20), recherche, filtres, favoris, insertion avec le contexte du projet ;
- publications et calendrier (jour/semaine/mois, glisser-déposer, statuts, validation groupée, règles d'automatisation), file de tâches persistante avec reprise, nouvelles tentatives et anti-doublon ;
- comptes, plusieurs boutiques, jauge d'enveloppe IA, administration.

## Ce qui demande une configuration (implémenté, non testé faute d'accès)

Tout se règle dans `/admin` ; les secrets sont chiffrés (AES-256-GCM, clé `APP_SECRET`) et ne repartent jamais vers le navigateur.

| Fonction | Ce qu'il faut fournir | État |
|---|---|---|
| IA de texte et de vision (analyse de la photo, stratégie, rédaction, conception des sections, chat de boutique, contrôle qualité) | Clé API Anthropic | Code complet, **non exécuté ici** (pas de clé). Bouton « Tester réellement ». |
| Décors générés autour du produit réel | Clé OpenAI (images) ou Gemini | Idem |
| Plans vidéo générés | Clé Gemini (Veo) ou fal.ai | Idem |
| Publication Facebook / Instagram | Application Meta validée (client id/secret) + adresse publique HTTPS | Idem |
| TikTok, YouTube, Pinterest | Applications développeur respectives + adresse publique | Idem (limites d'API affichées dans le studio) |
| Canva | Intégration Canva Connect | Idem |
| Installation Shopify (thème non publié, produit, pages) | Application Shopify + adresse publique | Idem ; sinon import manuel du ZIP |
| Paiements (abonnement 49,90 €/mois, +40 €/boutique, recharges par 10 €) | Clés Stripe + secret webhook | Code complet ; annoncé « actif » seulement après réception d'un événement signé. En attendant, l'administration active les abonnements manuellement. |

Instagram, TikTok, Pinterest et Shopify récupèrent les médias par URL : la publication automatique exige que le studio soit déployé sur une **adresse publique HTTPS** (réglage « Adresse publique » dans l'administration).

## Mise en ligne

Le studio a besoin d'un processus qui tourne en continu (site + worker), d'un disque persistant (base SQLite et fichiers générés dans `/data`) et de ffmpeg : un hébergement « serverless » ne convient pas. L'image Docker fournie contient tout ; la CI la construit et vérifie qu'elle démarre.

- **Serveur (VPS)** : `APP_SECRET=… APP_URL=https://votre-domaine ADMIN_EMAIL=vous@exemple.fr docker compose up -d --build`, derrière un proxy HTTPS (Caddy, Traefik, nginx).
- **Plateforme avec volume** (Railway, Fly.io, Render…) : déployez le `Dockerfile`, montez un volume sur `/data`, définissez `APP_SECRET` (32 caractères aléatoires ou plus) et `APP_URL` (l'adresse publique HTTPS). Prévoyez au moins 2 Go de mémoire (détourage local).

Ensuite : créez votre compte (le premier devient administrateur), puis renseignez dans `/admin` l'adresse publique, les clés IA, les applications OAuth et Stripe.

## Architecture

- `src/app` — Next.js 15 (App Router) : page d'accueil, studio, administration, API REST (`src/app/api`).
- `worker/` — processus de tâches de fond (baux, reprise par étapes, nouvelles tentatives, idempotence, planificateur des publications).
- `src/lib` — base SQLite (better-sqlite3, WAL) partagée site/worker, facturation en micro-euros, chiffrement, OAuth et publication, intégrations.
- `src/lib/theme` + `theme-base/` — moteur de thème Shopify (spécification JSON OS 2.0 → fichiers ; rendu Liquid pour l'aperçu ; opérations ciblées validées).
- `src/lib/media` — détourage, compositions (Skia), logos SVG, vidéo (ffmpeg).
- `src/lib/engine` — pipeline et moteur intégré ; `src/lib/ai` — routage multi-fournisseurs, contexte et mémoire du projet, prompts spécialisés, contrôle qualité.
- `public/demo` — démonstrations de la page d'accueil : **produits réels** de fournisseurs (marque blanche, photos retouchées dans `scripts/demo-products/inputs`), marques et boutiques créées par le studio (`scripts/build-demos.ts`).
