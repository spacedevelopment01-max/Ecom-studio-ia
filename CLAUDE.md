# E-COM STUDIO IA — consignes pour Claude

Studio qui crée la marque, la boutique Shopify (ou le site d'une entreprise de services), les visuels, vidéos,
publications et publicités d'un projet. Next.js 15 (App Router) + worker de tâches de fond + SQLite. Voir `README.md`.

## Avec le propriétaire

- **Répondre en français simple** : il n'est pas développeur. Expliquer ce qui change pour lui, pas le code.
- **Ne jamais demander ni accepter de clé d'API dans la conversation.** Les clés se saisissent dans
  Administration › Fournisseurs IA (chiffrées) ou dans les secrets Codespaces / de l'hébergeur.
- **Honnêteté** : ne rien inventer (avis, chiffres, délais, certifications, résultats). Un manque se signale par
  « [À compléter : …] ». Dire clairement ce qui a été vérifié et ce qui ne l'a pas été.
- **Fusion (PR + merge) uniquement quand il le demande** (« fusionne », « oui » à « Je fusionne ? »).
  Après une modification terminée, demander « Je fusionne ? ».
- Dépôt GitHub : `spacedevelopment01-max/Ecom-studio-ia` (avec cette casse exacte pour les appels d'API GitHub).

### Préférences du propriétaire (à retenir, il ne veut pas les répéter)

- **Dépenses** : aucune API ou fournisseur payant ajouté sans son accord ; aucun appel IA payant ni publication réelle
  sans son autorisation. Toujours donner le prix avant une génération payante et attendre son accord écrit. Un appel
  au résultat incertain (erreur 5xx) n'est jamais relancé tout seul : le dire, puis demander. Plafond d'essais : 10 $.
- **Prix** : jamais d'euros montrés au client pour l'IA ; tout coût est un % du budget IA du mois de son compte ;
  devis = coût probable (un essai), une reprise n'est débitée que si elle a lieu et elle est annoncée.
- **Ne jamais générer de personne** sans photo fournie par le client ou autorisation explicite.
- **Vocabulaire du client** : ce qu'il corrige une fois vaut pour toujours (ex. ARVEN : « montre », jamais
  « chronographe »). L'enregistrer aussitôt dans la mémoire du projet (`addWordingRule`, `src/lib/client-wording.ts`).
- **Textes des visuels** : ceux qu'il donne sont repris mot pour mot (ex. ARVEN : « Acier et cuir véritable. »).
  Si le modèle n'arrive pas à écrire un mot, **changer la phrase** au lieu de s'acharner à payer de nouveaux essais.
- **Vérifier soi-même chaque image avant de la montrer** : produit entier (rien de coupé, ex. bracelet complet avec
  la boucle), fidèle à la photo d'origine, orthographe exacte, aucun mot ni fausse lettre en trop, logo exact.
  Une image ratée est signalée comme ratée, jamais présentée comme bonne.
- **Logos : jamais aucune direction.** Qwen-Image 3.0 Pro dessine ; si le contrôle juge le rendu insuffisant, OpenAI
  (ChatGPT) prend le relais ; le client finit toujours avec au moins un logo (le meilleur, signalé s'il n'est pas validé).
- **Images 100 % IA, avec Qwen-Image 3.0 Pro** (pas ChatGPT, jugé trop cher ; pas de texte posé en local à la place).
  Consignes à Qwen **en français**, concrètes (scène, objets, lumière), seuls les textes voulus entre guillemets.
- **Écrire une consigne d'image comme le propriétaire** (modèle réussi du 16/10, `docs/guide-images-ia.md`) : décrire
  UNE photo, en phrases complètes et logiques, dans cet ordre : 1) type de photo, format, point de vue, cadrage ;
  2) surface et fond ; 3) chaque objet dans son paragraphe : place exacte dans l'image, forme, matière, couleur, état,
  et ce qu'il ne contient pas (« l'écrin est vide : aucune montre, aucun cadran… ») ; 4) « La scène contient exactement
  N objets : … » ; 5) ce qui est coupé par le cadre ou laissé dégagé ; 6) lumière, ombres, textures, mise au point,
  ambiance ; 7) « Aucun texte, aucune lettre, aucun chiffre, aucune gravure, aucun logo, aucun filigrane, aucune
  personne. Aucun objet supplémentaire. » Jamais de contradiction (ne pas citer le produit ni ses matières s'il ne doit
  pas apparaître), jamais d'objet vague (« quelques accessoires »).
- **Réponses courtes et claires**, sans jargon ; ne pas reposer une question à laquelle il a déjà répondu.
- **Ne pas décider à sa place** : un retrait de contenu ou un changement visible important se propose, il ne s'applique
  qu'après son accord. Retirer un visuel raté sans rien mettre à la place n'est pas une correction.
- **Catalogue de thèmes actif** (consigne du 19 octobre 2026, issue #137, commentaire 6264783184) : seuls **fraise**, **onde**,
  **orbe** et **rive** sont proposés (galerie, IA, commandes, recommandation, tarifs). Les 30 anciens thèmes ne sont ni
  sélectionnables ni recommandés ; un projet qui en utilise un le garde (compatibilité de lecture), jamais de migration
  silencieuse, jamais de repli vers l'ancien catalogue. Ne pas les moderniser ni créer leurs remplaçants sans consigne.
- **Démonstrations** (priorité du 19 octobre 2026, issue #137) : les seules sont **FRAISE** (gummies, boutique spécialisée),
  **ONDE** (casque audio, boutique spécialisée), **ORBE** (lampe, e-commerce) et **Atelier Rive** (prestations de services).
  Les anciennes démos (ARVEN, Cime, Les Tribunes, Sonore, Racines & Pierres, Atelier Pivoine, Ostral) sont abandonnées :
  ne pas les adapter ni les maintenir. Leurs visuels viennent du kit privé de Thomas (`public/demo/<id>/`, hors dépôt).
  **Page d'accueil** : chaque section montre de vrais visuels (sinon rien, jamais un gabarit) et les sections tournent
  entre ces quatre démos, en alternant produits et services.

## Travail en plusieurs conversations (choix du propriétaire)

- **Une conversation « chef de projet »** (« E-COM STUDIO IA — suite ») reçoit les demandes du propriétaire, les
  découpe en tâches précises, crée une conversation spécialisée par domaine (`create_session` + `send_message`),
  suit leur travail (`list_events`), relit leurs PR et fait le compte rendu au propriétaire.
- **Un domaine par conversation, jamais deux conversations sur les mêmes fichiers en même temps.** Domaines :
  1. Boutique et thème Shopify : `theme-base/`, `src/lib/theme/`, sites de services (skill **verifier-theme**).
  2. Images et publicités : `src/lib/image-v2/`, `src/lib/ads-v2/`, `src/lib/ad-doc/`, `src/lib/social-v2/ai-post.ts`,
     routage des médias (`src/lib/ai/media-*.ts`).
  3. Vidéos : `src/lib/video-v2/`, vidéos du worker, tutoriels (`src/lib/tutorials/`).
  4. Marque et identité : logo, planche (`src/lib/media/identity-board.ts`), charte, vocabulaire du client.
  5. Publications et calendrier : `src/lib/social-v2/` (sauf `ai-post.ts`), pilote automatique.
  6. Forfaits, budget IA, sécurité, administration : `src/lib/billing*`, `src/lib/ai/access.ts`, `ai_calls`.
- **2 ou 3 spécialistes à la fois au plus.** Chacun part de `main` à jour, travaille sur **sa propre branche** et ouvre
  **sa propre PR** ; le chef vérifie la CI puis demande « Je fusionne ? » au propriétaire pour chacune.
- **Dépenses centralisées** : aucun spécialiste ne fait d'appel IA payant ; il prépare l'essai et le chef donne le prix
  au propriétaire et attend son accord écrit (plafond commun d'essais : 10 $).
- Tout spécialiste lit ce fichier en entier avant de commencer et rend compte de ce qu'il a **vérifié réellement**
  (tests, captures) et de ce qui ne l'a pas été.

## Règles du produit (ne pas casser)

- **Découverte n'est pas un forfait** : c'est un compte inscrit par e-mail, sans abonnement, qui visite le studio de démonstration (`src/app/studio/decouverte`) sans rien pouvoir créer ni modifier (création de projet refusée sans abonnement payé). Aucun appel à l'IA sans abonnement (`aiActiveFor`).
- **Le compte administrateur suit son forfait comme un client** (pas de passe-droit) : le propriétaire teste en
  gratuit puis en payant. Accès à l'IA : `aiActiveFor(userId)` (`src/lib/ai/access.ts`) ; le bouton « Désactiver »
  d'un fournisseur coupe vraiment ses appels.
- **Moteur local d'abord** : une retouche simple et sûre est faite sans IA même quand l'IA est active
  (`src/lib/engine/local-first.ts`) ; l'IA garde les demandes composées, créatives ou ambiguës.
- **Bilingue FR/EN** : interface et contenus. Les textes FR/EN passent par `L("fr", "en")` / `C(...)`
  (`src/lib/i18n-server.ts`) ; dans le thème, tout libellé de schéma a sa traduction dans
  `theme-base/i18n/schema.en.json` et toute clé `| t` existe dans `locales/fr.default.json` **et** `en.default.json`.
- Les coordonnées saisies à la création d'un projet ne doivent jamais être redemandées ni effacées.

## Avant chaque envoi (commit + push)

```bash
npx tsc --noEmit
npx vitest run
```

- Modification du thème (`theme-base/`, `src/lib/theme/`) : utiliser le skill **verifier-theme**
  (`scripts/verify-theme.sh`, `scripts/theme-screens.ts`) — la CI refuse la fusion au moindre échec de Theme Check.
- Ajouter un test dans `tests/` pour tout comportement modifié.
- Messages de commit en français. Ne mettre aucun identifiant de modèle d'IA dans les commits, PR ou fichiers.

## Repères dans le code

- `src/app` — pages, studio (`src/app/studio/[projectId]`), API (`src/app/api`) ; `src/components/studio/tab-*.tsx` — onglets.
- `worker/handlers.ts` — tâches de fond (création, retouches de la boutique `shop.chat`, publications…).
- `src/lib/theme` — moteur de thème : `directions.ts` (34 directions définies, dont seules les 4 de référence sont proposées — `ACTIVE_DIRECTIONS` ; les 30 anciennes restent lisibles pour les projets existants), `compile.ts`, `render.ts` (aperçu Liquid),
  `ops.ts` (opérations de retouche validées), `preview-tools.ts` (sélection d'un élément dans l'aperçu).
- `theme-base/` — sections, snippets, `assets/theme.css`, `assets/theme.js` du thème Shopify.
- `src/lib/engine` — pipeline et moteur local ; `src/lib/ai` — fournisseurs, prompts, tâches IA.
- Tutoriels vidéo : textes dans `src/lib/tutorials/`, vidéos dans `public/tutorials/`, voix off par
  `scripts/narrate-tutorials.ts` (voix Kokoro, voir l'en-tête du script ; le tutoriel « publicites » a pour fichier
  `campagnes`).

## Publicités vidéo (guide créatif)

Règles du propriétaire branchées sur le moteur « vidéo en scènes » : `docs/guide-creatif-video.md` (où elles vivent,
comment elles agissent). Valeurs : `src/lib/video-v2/creative-guide.ts` (modifiables sans code : réglage
`video.creative_guide`). Services = Pixabay par étape ; produits = vrai produit seulement ; seule la marque du projet.

## Images finales 100 % IA

Toute image finale est créée par un modèle d'images ; jamais de gabarit ni de photo de banque à la place, jamais de
bascule silencieuse (blocage signalé). Règles et branchements : `docs/guide-images-ia.md` ; valeurs
`src/lib/image-v2/image-guide.ts` (réglage `image.creative_guide`), direction artistique par client
`src/lib/image-v2/art-direction.ts` (mémoire `image.art_direction`, versionnée).
Modèle d'images de tout le studio : **Qwen-Image 3.0 Pro**, une seule étape (choix du propriétaire) ; produit
entier exigé (aucune partie coupée).
Exception choisie par le propriétaire — sites de services : les photos Pixabay restent permises comme images du site,
mais jamais en silence : le studio les signale au client (onglet Boutique et aperçu du studio, jamais sur le site
publié) et permet de les remplacer par sa photo ou une image IA (`src/lib/theme/stock-notice.ts`).

## Ligne directrice de marque (cohésion)

Toute création suit le même système que la planche d'identité (`src/lib/media/identity-board.ts`, `BRAND_RULES`) :
ancrage sombre + couleur de marque + accent + deux neutres (5 couleurs au plus), deux polices (titres / textes),
le symbole comme signature (sceau, motif, avatar, papeterie), icônes d'un seul style au trait, de l'air et des
ombres douces, rien d'inventé sur les maquettes. Planche refaite avec la charte (`saveIdentityBoard`).
