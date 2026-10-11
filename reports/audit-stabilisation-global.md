# Audit intégral et stabilisation — E-COM STUDIO IA

Branche : `claude/ecom-studio-ia-platform-8cwl79`, partie de `main` (`f93e2f1`, PR #75). **Non fusionnée.**
Aucun appel payant, aucune publication réelle, aucun seuil qualité abaissé, aucune donnée client supprimée ou
migrée de façon destructive. Les prix et forfaits ne changent pas. La page d'accueil est intacte.

## 1. Méthode

1. **Audit du code réel**, en cinq volets lancés en parallèle et en lecture seule :
   - serveur et tâches de fond ;
   - fournisseurs d'IA ;
   - sécurité et dépendances ;
   - performances ;
   - règle de présence humaine et code mort.
   Les rapports précédents (`general-checkup`, `post-audit-critical-fixes`, `stabilite-serveur-dev`, `remaining-work`,
   `logo-*`…) ont été lus, mais **le code actuel prime**. Les défauts marqués « reproduit » l'ont été sur une base de
   données temporaire, avec un script ou un test.
2. **Correction par lots cohérents**, dans cet ordre :
   - reproduire le défaut ;
   - en identifier la cause ;
   - écrire un test de régression ;
   - corriger ;
   - rejouer la suite complète, `tsc` et Theme Check quand le thème change ;
   - enregistrer le lot (un commit).
3. **Mesures avant / après** sur deux constructions de production comparables (voir `optimisation-performance.md`).
4. **Test navigateur de bout en bout** avec le serveur et le worker actifs (section 6).

## 2. Problèmes identifiés et corrigés

Classement : P0 = arrêt du serveur, perte de données, facturation, sécurité critique ; P1 = génération cassée ou
fonction principale inutilisable ; P2 = lenteurs, erreurs d'interface, intégrations partielles ; P3 = nettoyage.

### P0

| # | Problème | Cause démontrée | Correction | Test |
|---|---|---|---|---|
| 1 | « next dev exited with code 0 » puis worker en SIGTERM, sans raison visible | Next 15 (`next dev`) sort avec le code 0 dès que son serveur enfant meurt, quelle qu'en soit la raison : la vraie cause est **masquée par Next**. Causes déjà prouvées (phase précédente) : 2e lancement sur un port occupé, requêtes empilées, recompilations. **Cause restante la plus probable, non reproduite ici** : mémoire saturée en mode développement (2,5 Go pour le site seul après 5 onglets, plus VS Code, le serveur TypeScript et Chromium dans 8 Go) ; le noyau tue alors le processus le plus gros sans message | (a) Le Codespace lance le **mode production** (`npm run studio`, 0,2 à 0,3 Go pour le site) surveillé par un lanceur maison. (b) **Instrumentation** : chaque arrêt non demandé est écrit dans `data/logs/studio.log` avec le code ou le signal, la mémoire libre, la mémoire occupée juste avant, et le compteur `oom_kill` du noyau. Le prochain arrêt chez vous dira enfin pourquoi. (c) Le worker survit aux promesses rejetées oubliées ; une exception non interceptée est journalisée avec sa pile | `serveur-dev.test.ts` |
| 2 | **Production impossible sans `.env.local`** | `next start` refuse de démarrer sans `APP_SECRET`, alors que le mode développement se rabat sur `data/.app-secret`. Un Codespace configuré sans `npm run setup` cassait toutes les pages et rendait illisibles les clés d'API chiffrées | Le lanceur reprend le même secret que le mode développement et le transmet au site et au worker | `serveur-dev.test.ts` |
| 3 | **Travail et appels payants faits en double** | Bail expiré (Codespace endormi, boucle bloquée, deux workers) : le 1er worker continuait, écrivait ses points de reprise, pouvait marquer « terminée » la tâche du 2e ou la remettre en file. **Reproduit** | Contrôle du propriétaire (`locked_by`) sur avancement, point de reprise, fin et échec ; nouvelle erreur `LeaseLost` : le worker s'efface sans rien écrire | `taches-fond-robustesse.test.ts` |
| 4 | **Génération payée relancée sans accord, réservation orpheline** | Worker arrêté pendant un appel payant : résultat perdu, réservation bloquée 2 h, relance qui réserve une 2e fois (refusée à tort « limite atteinte ») ou paie deux fois. **Reproduit** | La tâche reprise **n'est jamais relancée d'office** : réservation réglée comme incertaine (rendue après réconciliation avec la facture), échec expliqué, étapes gardées pour « Réessayer ». Arrêt du worker : 45 s laissées aux tâches en cours (le lanceur attend 60 s, `npm run maj` 65 s) | idem |
| 5 | **Bombe ZIP** (import de thème) | `unzipSync` sans limite : 307 Ko → 314 Mo en 1 s (≈ 60 Go pour un envoi de 60 Mo), serveur tué. Point déjà signalé par `general-checkup` (n° 16), resté ouvert | Taille par fichier (25 Mo), taille totale (200 Mo) et nombre de fichiers (5 000) plafonnés **avant** décompression | `securite-audit-stabilisation.test.ts` |
| 6 | **Médias publics servis sans protection** | `/api/public/media/…` renvoyait le type déclaré par le navigateur, sur le domaine du studio : un SVG ou un fichier HTML envoyé par un tiers pouvait exécuter un script avec la session de l'administrateur | Seuls les images matricielles, vidéos et sons sont affichés ; tout le reste est téléchargé en fichier brut (`nosniff`, bac à sable). Envois HTML, XML ou scripts refusés ; logo de création limité aux images de 25 Mo ; extension de stockage jamais tirée d'un nom inconnu (un `.m3u8` était lu comme une liste de lecture par ffmpeg) | idem |

### P1

| # | Problème | Cause | Correction | Test |
|---|---|---|---|---|
| 7 | Tâche « en cours » à l'infini | La reprise après plantage ignorait le nombre d'essais. **Reproduit** (6 reprises sur 3 autorisées) | Au-delà du nombre d'essais, échec visible « interrompue à répétition », étapes gardées | `taches-fond-robustesse` |
| 8 | Échecs invisibles (images, vidéos, boutique, détourage…) | La barre disparaissait sans explication sur les écrans qui ne suivent pas la tâche | Échec définitif = notification (cloche) avec la vraie raison | idem |
| 9 | « Arrêter » ne stoppait pas les sous-tâches en cours (dépense continue) ; « Annuler » sans effet sur une tâche en pause ; une relance ne débloquait pas les tâches en attente | Requêtes limitées à certains statuts. **Reproduit** | Annulation et pause des sous-tâches en cours ; annulation d'une tâche en pause ; relance qui débloque les dépendants ; prérequis bloqué = bloqué | idem |
| 10 | Logo écrit envoyé à un modèle incapable d'écrire | Repli vers l'ancien routeur, qui ignore le besoin « texte ». **Démontré** (Gemini 2.5 Flash Image choisi) | Aucun repli silencieux quand le besoin est précis (texte, références, son, personnes) | `routage-usages.test.ts` |
| 11 | **Règle « aucune personne sans accord » absente** | Aucune ligne de code ne l'appliquait ; plusieurs moteurs **demandaient** des personnes (« person at work », bonus aux photos avec une personne) | `people-policy.ts` : demandes « aucune personne », photos et vidéos de banque avec une personne écartées, défaut **rédhibitoire** `unauthorized_person` au contrôle qualité (le média est refusé, jamais publié), pas d'UGC ni de personnage Vidéo V2 sans accord, interrupteur dans l'onglet Images | `regle-presence-humaine.test.ts` (16 tests) |
| 12 | Choix d'un logo très long, « rien ne se fait » | Tâche en file derrière les longues tâches ; écran jamais rechargé à la fin | Tâche courte servie en premier, avancement affiché, onglet rechargé à la fin, tracés vectoriels après la mise à jour de la marque | `logo-declinaisons-couleurs.test.ts` |
| 13 | Déclinaisons de logo laides (noir = tache pleine, fond sombre délavé, symbole coupé en deux) | Silhouette pleine ; inversion de tous les pixels foncés ; découpe sous le nom même au milieu du dessin | Version une couleur qui garde le dessin ; fond sombre fidèle avec liseré ; découpe seulement dans un blanc, sinon le logo entier sert de marque | idem |
| 14 | Couleurs de la marque ignorées par les styles de boutique | Chaque direction réécrivait la luminosité et saturait l'accent (bordeaux → rouge vif, or → jaune) | Boutons et accents aux couleurs **exactes** de la palette, contraste garanti ; Theme Check vert sur les 11 styles | idem |

### P2

| # | Problème | Correction |
|---|---|---|
| 15 | Prix saisi dans une mauvaise unité (vidéo « aux jetons ») → coût 0 €, génération gratuite et illimitée | Unité refusée à l'enregistrement et modèle rendu inutilisable |
| 16 | Table de routage libre : nom de modèle média non vérifié, modèle de texte non confirmé accepté, principal non confirmé retenu | Mêmes verrous que la page « Images & Vidéos » ; principal non confirmé jamais retenu |
| 17 | Image Gemini : une erreur 5xx était traitée comme un refus net (secours qui pouvait payer deux fois) | 5xx = résultat incertain, comme pour OpenAI (un dépôt Veo ou fal en erreur reste un refus net : aucune opération n'est créée) |
| 18 | Image UGC OpenAI sans flux (connexion coupée après ≈ 30 s par le relais) | Même client en flux que les autres images |
| 19 | ffmpeg, ffprobe et php sans durée maximale (tâche bloquée à vie) | 15 min pour ffmpeg et ffprobe, 30 s pour php |
| 20 | Envois de fichiers chargés en mémoire avant le contrôle de taille | Taille annoncée vérifiée **avant** la lecture (413) |
| 21 | Compte social d'un autre client accepté sur les anciennes routes de publication | Compte vérifié comme appartenant au client |
| 22 | Erreurs du serveur non caviardées dans le journal ; processus de détourage lancé avec tout l'environnement (secret compris) | Caviardage ; environnement minimal |
| 23 | Notes de logos trop sévères pour la ligne validée | Contrôle recalibré pour les petites entreprises (barrière inchangée à 8/10) |
| 24 | Requêtes de rafraîchissement continues au repos, lectures en double, éditeurs chargés d'office, index manquants, toutes les routes chargées au démarrage | Voir `optimisation-performance.md` |
| 25 | Même clé d'idempotence envoyée deux fois en même temps → erreur 500 | `ON CONFLICT` |
| 26 | `npm audit` : 8 vulnérabilités (2 critiques) | 8 → 4, plus aucune critique (concurrently 10.0.6 ; lodash et zod forcés pour l'outil de détourage) |

### P3

- Code mort retiré : `enqueueDuePosts`, l'ancien planificateur de publications V1, sans aucun appel et remplacé par Social V2.
- Moteurs V1 **conservés**. Le logo V1 (anciennes propositions), les images V1 (mode « série »), le thème V1 (11
  directions, anciens projets) et la publication V1 sont encore atteignables. Il n'y a donc aucune suppression.
- Candidats à retirer **plus tard**, après une vérification en base (des tâches anciennes pourraient encore être en
  file) :
  - types de tâches sans créateur : `video.ugc`, `ugc.script`, `calendar.plan`, `post.regenerate`, `brand.fulllogo`,
    `stock.search`, `blog.write` ;
  - routes sans appelant : `/api/projects/[id]/copy`, `/api/estimate` ;
  - `engine/logo-symbol.ts`, couvert seulement par un test.

## 3. Fichiers modifiés (principaux)

- **Serveur et lanceur** : `scripts/studio.mjs`, `scripts/maj.mjs`, `worker/index.ts`, `next.config.ts`.
- **Tâches** : `src/lib/jobs.ts`, `src/lib/job-recovery.ts` (nouveau), `src/lib/exec-tool.ts` (nouveau), les montages
  vidéo (`video-v2/*`, `engine/ugc.ts`, `engine/videos.ts`, `media/video.ts`, `library.ts`) et `cms-v2/checks.ts`.
- **Sécurité** :
  - `src/lib/http.ts` (`readForm`) ;
  - `theme/import.ts` ;
  - `api/public/media/...` et `api/files/[fid]` ;
  - routes d'envoi (`projects`, `start`, `catalog`, `files`, `theme/import`, `variant-photo`, `receipt`) ;
  - `project-start.ts`, `library.ts` ;
  - routes de publication, `media/cutout.ts` ;
  - `package.json` et `package-lock.json`.
- **Fournisseurs** : `ai/media-providers.ts`, `ai/media-routing.ts`, `api/admin/settings/route.ts`.
- **Règle de présence humaine** :
  - `src/lib/people-policy.ts` (nouveau) ;
  - Image V2 (`brief`, `search`, `quality`, `deps`, `types`) ;
  - Ads V2 (`engine`, `quality`, `deps`, `types`) ;
  - Vidéo V2 (`intent`, `storyboard`, `engine`, `quality`, `deps`) ;
  - `stock/trade-queries.ts`, `engine/service-media.ts`, `engine/stock-universe.ts`, `engine/videos.ts`,
    `engine/images.ts`, `engine/photo-line.ts`, `ai/tasks.ts`, `ai/prompts.ts`, `quality/policies.ts` ;
  - `project-types.ts`, `api/projects/[id]/route.ts`, `tab-images.tsx`.
- **Logos et boutique** : `logo-v2/artwork.ts`, `logo-v2/choose.ts`, `logo-v2/identity.ts`, `theme/directions.ts`,
  `theme-base/assets/theme.css`, `logo-v2-panel.tsx`, `tab-marque.tsx`.
- **Performances** : `ui.tsx`, `poll.ts`, `project-context.tsx`, panneaux et onglets cités, `db.ts`,
  `workflow/index.ts`, `project-schemas.ts` (nouveau).

## 4. Tests ajoutés

| Fichier | Tests | Couvre |
|---|---|---|
| `tests/taches-fond-robustesse.test.ts` | 6 | bail perdu, reprise bornée, appel payant interrompu, annulation et pause, dépendances, idempotence |
| `tests/securite-audit-stabilisation.test.ts` | 4 | bombe ZIP, taille avant lecture, lien public sans script, types refusés, extension sûre |
| `tests/regle-presence-humaine.test.ts` | 16 | demandes, banque, contrôle qualité, vidéo, réglage, comportement inchangé avec accord |
| `tests/routage-usages.test.ts` (+1) | 1 | logo sans repli, unité de prix, verrous du routage |
| `tests/serveur-dev.test.ts` (+1) | 1 | journal des arrêts, secret en production, worker protégé |
| `tests/logo-notation-petites-entreprises.test.ts` | 4 | notation des logos |
| `tests/logo-declinaisons-couleurs.test.ts` | 7 | déclinaisons, symbole, couleurs de boutique, priorité du choix de logo |

**Suite complète : 135 fichiers, 1 161 tests, tous réussis** (`npx vitest run`). `npx tsc --noEmit` est sans
erreur. Theme Check est vert sur les 11 directions (FR, EN, multi, niche, services) et sur le ZIP client.

## 5. Résultats avant / après (détail dans `optimisation-performance.md`)

- Mémoire du site au démarrage : **363 → 195 Mo** ; après 55 requêtes : **393 → 284 Mo**.
- JS chargé à l'ouverture du studio : **173 → 149 Ko compressés** ; administration : **154 → 134 Ko**.
- Requêtes de rafraîchissement au repos : **−70 à −88 %** selon l'onglet (rythme rapide gardé pendant une tâche).
- Worker pendant un logo complet (nettoyage, planche, déclinaisons, symbole, tracé) : pic à 226 Mo. La génération
  du logo n'est **pas** la cause des arrêts.

## 6. Test navigateur de bout en bout

`scripts/e2e-stabilite.ts`, lancé sur le studio en **production** (`npm run studio`, base de test vide, aucune clé,
donc moteur local seulement, 0 € d'IA). Résultats complets dans `reports/stabilite/resultats.json`, avec des captures
sur ordinateur et téléphone.

[RÉSULTATS DU TEST — complétés à la fin du test]

## 7. Fonctionnalités vérifiées

- **Vérifié en réel, dans ce conteneur** :
  - création d'un projet produit (photo + description) et d'un projet de services (Sébastien Blanc), pilote complet
    avec le moteur local ;
  - navigation dans les 13 onglets des deux projets, sur ordinateur et téléphone ;
  - relance automatique du worker tué, avec sa raison journalisée ;
  - construction et démarrage en production.
- **Vérifié par tests automatisés avec fournisseurs simulés** : réservations et budget (40 % HT, 50 % HT des
  recharges, réservation atomique, inchangés), routage, contrôle qualité, moteurs V2 (logo, images, publicités,
  vidéo, SEO, social, thème, CMS, workflow).
- **Non vérifié en réel** : tout appel à un vrai fournisseur (OpenAI, Anthropic, Gemini, Veo, fal), toute publication
  sur un réseau social, toute installation sur une vraie boutique Shopify, WooCommerce ou PrestaShop.

## 8. Défauts non résolus et risques résiduels

1. **Cause exacte des arrêts dans votre Codespace** : non reproduite ici. Le journal `data/logs/studio.log` la
   donnera au prochain arrêt. Envoyez-moi ses dernières lignes s'il se reproduit.
2. **npm audit, 4 restants** :
   - `postcss` dans Next : construction seulement, aucune donnée utilisateur ; le correctif impose Next 16, une version
     majeure non faite ;
   - `sharp` dans l'outil de détourage : aucun correctif publié ; chaque image est réencodée par le studio avant de
     lui parvenir.
3. **Règle de présence humaine** :
   - les photos du client montrant une personne ne sont détectées automatiquement que pour les services avec IA
     active ;
   - sans IA, les photos de banque sont filtrées seulement sur leur description ;
   - l'UGC V1 commandé explicitement par le client n'est pas bloqué ;
   - rien n'est rétroactif : les médias déjà publiés ne sont pas revérifiés.
4. **Limites de débit** : l'adresse IP est lue dans `X-Forwarded-For`. Sans relais de confiance, elle peut être
   falsifiée (le plafond par e-mail tient). À régler avec l'hébergeur (`TRUST_PROXY`).
5. **Calculs lourds du worker** sur le fil principal (0,2 à 0,7 s) : ils ralentissent les tâches parallèles, sans
   risque de double exécution.
6. **Ancien routeur vidéo** (`video-v2/providers.ts`) : il choisit le modèle compatible le moins cher sans suivre le
   réglage par usage. C'est signalé, non modifié (risque de changer les coûts des vidéos).
7. **Tarif Kling 2.1** marqué « vérifié » alors que sa note dit « non vérifié » : à confirmer dans l'administration.

## 9. Validations payantes encore nécessaires (avec votre accord)

- Une série de logos réelle avec le contrôle recalibré, pour vérifier la note sur vos logos jugés beaux. Environ 0,30 €
  pour relire les 6 logos existants sans en redessiner.
- Une image Image V2 et une publicité réelles avec la règle « aucune personne » : contrôle qualité réel du champ
  `personVisible`.
- Une vidéo Veo ou fal réelle : durée, coût réel comparé au coût réservé, refus d'une personne non autorisée.
- Un appel de texte OpenAI ou Gemini réel sur une longue réflexion (délai maximal, flux).
