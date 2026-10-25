# E-COM STUDIO IA

Plateforme qui transforme un produit — une photo, un lien de fiche produit ou quelques lignes — en marque, boutique Shopify, images, vidéos, publications et calendrier, avec un studio où l'on garde la main à chaque étape.

## Démarrer

Prérequis : Node.js 22+, `ffmpeg`/`ffprobe` dans le PATH.

```bash
npm install
npm run setup      # crée .env.local (APP_SECRET aléatoire) et la base SQLite dans ./data
npm run dev        # site (http://localhost:3000) + worker de tâches de fond
```

Utiliser le studio (Codespace compris) : `npm run studio` — mode production, environ 3 fois moins de mémoire que
`npm run dev` ; construit le site seulement quand le code a changé ; relance seule la partie qui plante. Le Codespace
le lance tout seul à chaque connexion.

Mise à jour (même si le studio tourne déjà) : `npm run maj` — arrête le studio en cours, récupère la dernière version,
installe, vide le cache de compilation et relance (`npm run maj -- --dev` pour le mode développement). Les données ne
sont pas touchées.

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
- **thème Shopify Online Store 2.0 réel** : 11 thèmes actifs en trois familles — Produit spécifique (FRAISE, SILLON, NOCTIL, TRAVERSE, MUSEAU CLUB), E-commerce (ORBE, ONDE, HEUREN, ALCÔVE, SOUPLE), Prestations de services (Atelier Rive) ; les 30 anciennes directions ne sont plus proposées mais restent lisibles pour les projets qui les utilisent. Sections de bibliothèque par famille (héros immersifs, cartes néon, chiffres animés, avant/après, cercles façon stories, frise, cartes empilées, texte en courbe, vidéos verticales, vagues), accueil, fiche produit (variantes, prix, panier latéral AJAX, achat collant), collection, recherche, panier, pages Notre histoire / FAQ / Contact / Livraison et retours, politiques à compléter, 404, mot de passe, comptes clients, carte cadeau ; animations compatibles « réduire les animations » ; 0 erreur Shopify Theme Check ;
- projet créable sans photo ni lien (l'entrée produit s'ajoute plus tard) ; pause et reprise des créations en cours, sans refaire les étapes terminées ;
- galerie des 11 thèmes (bouton « Thèmes » de l'éditeur, page `/studio/themes`), chacun ouvert dans sa démonstration complète avant le choix ; accès selon le forfait (1, 3 ou tous les thèmes de la famille) ;
- éditeur de boutique : discussion + aperçu côte à côte (pages, ordinateur/tablette/téléphone, désignation d'un élément), structure, verrous, versions et restauration. **L'aperçu, la version enregistrée et le ZIP exporté proviennent des mêmes fichiers** (empreinte affichée). Sans IA, l'éditeur comprend des commandes simples (couleur des boutons, texte entre guillemets, ajouter une FAQ, monter, supprimer, revenir en arrière, changer de direction) ;
- exports WooCommerce (thème bloc installable), PrestaShop (thème enfant), Wix et Squarespace (kits : ces plateformes n'acceptent pas de thème importé — c'est indiqué) ;
- formats d'images (1:1, 4:5, 9:16, 16:9) et zones de sécurité prêts ; les **images finales** (produit, scènes, publicités, publications) sont créées par un modèle d'images — Qwen-Image 3.0 Pro — et demandent donc une clé fournisseur et un forfait (voir plus bas et `docs/guide-images-ia.md`) ;
- vidéos MP4 H.264 réelles (9:16, 1:1, 4:5, 16:9) en motion design image par image (révélation, gros plans, légendes, transitions, musique originale synthétisée, sous-titres SRT), pack CapCut ;
- bibliothèque de fichiers (dossiers, sous-dossiers, import, déplacement, recherche, versions, usages, corbeille ; le rangement automatique ne supprime jamais) ;
- 200 prompts français (10 secteurs × 20), recherche, filtres, favoris, insertion avec le contexte du projet ;
- publications et calendrier (jour/semaine/mois, glisser-déposer, statuts, validation groupée, règles d'automatisation), file de tâches persistante avec reprise, nouvelles tentatives et anti-doublon ;
- comptes : **un abonnement = un projet** (un compte peut avoir plusieurs abonnements, donc plusieurs projets ; les anciens projets ne sont jamais supprimés), jauge du budget IA en %, administration.

## Ce qui demande une configuration (implémenté, non testé faute d'accès)

Tout se règle dans `/admin` ; les secrets sont chiffrés (AES-256-GCM, clé `APP_SECRET`) et ne repartent jamais vers le navigateur.

| Fonction | Ce qu'il faut fournir | État |
|---|---|---|
| IA de texte et de vision (analyse de la photo, stratégie, rédaction, conception des sections, chat de boutique, contrôle qualité) | Clé API Anthropic | Code complet, **non exécuté ici** (pas de clé). Bouton « Tester réellement ». |
| Images finales (produit, scènes, publicités, publications) | Clé Alibaba DashScope (Qwen-Image 3.0 Pro, modèle d'images du studio) ; OpenAI prend le relais pour un logo jugé insuffisant | Idem |
| Plans vidéo générés, voix | Clé fal.ai ou Gemini (Veo) ; voix française OpenAI en cours d'intégration (PR #166) | Idem |
| Publication Facebook / Instagram | Application Meta validée (client id/secret) + adresse publique HTTPS | Idem |
| TikTok, YouTube, Pinterest | Applications développeur respectives + adresse publique | Idem (limites d'API affichées dans le studio) |
| Canva | Intégration Canva Connect | Idem |
| Installation Shopify (thème non publié, produit, pages) | Application Shopify + adresse publique | Idem ; sinon import manuel du ZIP |
| Paiements (forfaits Créer 49 €, Développer 89 €, Dominer 129 € TTC par mois — un projet par abonnement ; recharge IA de 10 € par projet ; appel de départ unique 60 € / 30 € / inclus) | Clés Stripe + secret webhook | Code complet, testé en simulation seulement ; annoncé « actif » seulement après réception d'un événement signé. En attendant, l'administration active les abonnements manuellement. |

Instagram, TikTok, Pinterest et Shopify récupèrent les médias par URL : la publication automatique exige que le studio soit déployé sur une **adresse publique HTTPS** (réglage « Adresse publique » dans l'administration).

## Offres

La grille vient d'un seul fichier, `src/lib/plans.ts` (prix TTC ; le budget IA interne, jamais affiché en euros, en découle) :

| | Créer | Développer | Dominer |
|---|---|---|---|
| Prix TTC par mois (à l'année : 10 mois) | 49 € | 89 € | 129 € |
| Projets par abonnement | 1 | 1 | 1 |
| Thèmes par famille | 1 | 3 | tous |
| Sections de la bibliothèque de la famille (pas une limite de blocs par page) | 8 | 12 | 20 |
| Angles marketing (sur la durée du projet) | 1 | 2 | 5 |
| Publications automatiques par jour, au plus | 1 | 3 | 5 |
| Programmation | 7 jours | 30 jours | 90 jours |
| Articles de blog par mois | 0 | 5 | 10 |
| Vidéos IA | non | oui | oui |
| Pages supplémentaires, duplication, modèles de pages | non | oui | oui |
| Publicité, aide aux campagnes, sections entièrement créées par l'IA | non | non | oui |
| Appel de départ d'une heure (une seule fois, jamais mensuel) | 60 € | 30 € | inclus |

Découverte n'est pas un forfait : un compte gratuit visite le studio de démonstration sans rien créer. Un accès à une
fonction ne promet jamais de générations illimitées : chaque création reste soumise au budget IA du projet.
Périmètre V1 / V2 et décisions encore ouvertes : `docs/coordination/LOT1_PERIMETRE_V1.md`.

## Mise en ligne

Le studio a besoin d'un processus qui tourne en continu (site + worker), d'un disque persistant (base SQLite et fichiers générés dans `/data`) et de ffmpeg : un hébergement « serverless » ne convient pas. L'image Docker fournie contient tout ; la CI la construit et vérifie qu'elle démarre.

- **Serveur (VPS)** : `APP_SECRET=… APP_URL=https://votre-domaine ADMIN_EMAIL=vous@exemple.fr docker compose up -d --build`, derrière un proxy HTTPS (Caddy, Traefik, nginx).
- **Plateforme avec volume** (Railway, Fly.io, Render…) : déployez le `Dockerfile`, montez un volume sur `/data`, définissez `APP_SECRET` (32 caractères aléatoires ou plus) et `APP_URL` (l'adresse publique HTTPS). Prévoyez au moins 2 Go de mémoire (détourage local).

Ensuite : créez votre compte (le premier devient administrateur), puis renseignez dans `/admin` l'adresse publique, les clés IA, les applications OAuth et Stripe.

Hébergement et publication des **sites des clients** par le studio, avec gestion de leurs noms de domaine : prévus en
**V2 uniquement**. En V1, le client exporte sa boutique ou son site (ZIP Shopify, WooCommerce, PrestaShop, kits Wix et
Squarespace) ; seul le studio lui-même est mis en ligne (domaine et HTTPS).

### Sauvegarde et restauration des données

Une branche Git ne sauvegarde ni la base ni les médias. Sauvegarde cohérente sans arrêter le studio, restauration dans
un nouveau dossier, essais de migration sur copie : `docs/coordination/LOT1_MIGRATION_RESTAURATION.md`
(`scripts/lot1/sauvegarde.ts`, `scripts/lot1/restauration.ts`, `scripts/lot1/essai-complet.ts`). La clé `APP_SECRET`
se garde à part : sans elle, les clés enregistrées dans l'administration sont illisibles après restauration.

## Architecture

- `src/app` — Next.js 15 (App Router) : page d'accueil, studio, administration, API REST (`src/app/api`).
- `worker/` — processus de tâches de fond (baux, reprise par étapes, nouvelles tentatives, idempotence, planificateur des publications).
- `src/lib` — base SQLite (better-sqlite3, WAL) partagée site/worker, facturation en micro-euros, chiffrement, OAuth et publication, intégrations.
- `src/lib/theme` + `theme-base/` — moteur de thème Shopify (spécification JSON OS 2.0 → fichiers ; rendu Liquid pour l'aperçu ; opérations ciblées validées).
- `src/lib/media` — détourage, compositions (Skia), logos SVG, vidéo (ffmpeg).
- `src/lib/engine` — pipeline et moteur intégré ; `src/lib/ai` — routage multi-fournisseurs, contexte et mémoire du projet, prompts spécialisés, contrôle qualité.
- `public/demo` — démonstrations de la page d'accueil : **produits réels** de fournisseurs (marque blanche, photos retouchées dans `scripts/demo-products/inputs`), marques et boutiques créées par le studio (`scripts/build-demos.ts`).
