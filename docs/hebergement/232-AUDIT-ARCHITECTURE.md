# Hébergement natif des sites de services : audit et architecture (#232)

**Niveau de ce document : `audit` (lecture du dépôt) puis `architecture` proposée.**
- Rien de ce qui est décrit ici n'est encore réalisé, déployé ou activé.
- Base lue : `main` = `70204a7ff83eb2382835a27a37a8465c0851a70a`.
- Les chemins sont relatifs à la racine du dépôt.

## 1. Constat principal

**Aucun hébergement de site client n'existe.**
- `README.md:101-103` classe explicitement « l'hébergement et la publication des sites des clients » en V2.
- « Publier » signifie aujourd'hui exporter un ZIP Shopify, WordPress ou PrestaShop, ou bien pousser le thème vers Shopify.
- Il n'existe aucune table de site publié, de nom d'hôte ni de domaine, aucun routage par `Host`, aucun code TLS, ACME ou DNS, et aucune configuration de proxy.

**Le moteur de rendu est réutilisable**, mais il n'est servi qu'à travers l'aperçu privé du studio.

## 2. Fabrication des pages

| Élément | Constat | Preuve |
|---|---|---|
| Source unique | `ThemeSpec` (gabarits OS 2.0, groupes, réglages, `files` → médias de la bibliothèque, `store` : pages, menus, politiques, `business`) | `src/lib/theme/spec.ts:102-152` |
| Compilation | `compileTheme(spec)` produit une `Map<chemin, texte>` (Liquid et JSON) : thème de base lu sur disque, plus la spec. Ce sont les mêmes fichiers que le ZIP exporté. | `src/lib/theme/compile.ts:37-45, 90-120, 176` |
| Rendu | `renderPage({spec, base, cart}, chemin, query)` → `{html, status, template}` : une page HTML complète, via LiquidJS | `src/lib/theme/render.ts:787-905` |
| Routes connues | `/`, `/pages/<handle>`, `/policies/<handle>`, `/search`, `/blogs`, `/products`, `/collections`, `/cart` | `render.ts:730-768` |
| Pages d'un site de services | prestations, à propos, contact, FAQ, mentions légales, plus menus et politiques | `src/lib/theme/services-site.ts:59-65, 299-340` |
| Liens internes | `rewriteLinks` préfixe tous les `href`, `action`, etc. par `base` ; avec `base = ""`, on obtient des liens depuis la racine | `render.ts:939-951` |
| Médias et polices | référencés en `${base}/assets/<nom>` (`?width=` possible) et `${base}/__fonts/<fichier>.ttf` | `render.ts:77, 129, 564` |

Le rendu n'est **pas** reproductible à l'identique à partir d'une version enregistrée :
- les médias sont relus en base au moment du rendu, donc un média supprimé disparaît (`src/lib/theme/loader.ts:9-12`) ;
- le thème de base est relu sur disque, donc un nouveau code change le rendu des anciennes versions (`compile.ts:37-45` ; empreinte `themeFingerprint`, `compile.ts:208`).

**Conséquence : une publication doit produire un artefact figé** (pages HTML et fichiers), et non un rendu à la volée de la version.

## 3. Versions

- Table `theme_versions(id, project_id, number, spec, summary, author, parent_id, qc, created_at)`, en insertion seule. `projects.current_theme_version_id` pointe la version active (`src/lib/db.ts:58, 173-184` ; `src/lib/projects.ts:189-237`).
- **Aucune notion de version « validée » ou « publiée ».** Les éléments les plus proches :
  - `spec.locks` (`spec.ts:118`) ;
  - le contrôle qualité enregistré dans `qc`, qui peut refuser d'activer une version (`projects.ts:216-218`).

## 4. Aperçu actuel : ce qui ne doit pas aller sur un site public

L'aperçu se trouve dans `src/app/preview/[id]/v/[vid]/[[...path]]/route.ts`.
- **Accès** : session du studio, ou clé signée valable 12 h, liée au projet et au propriétaire (`src/lib/theme/preview-access.ts:16-43`).
- **En-têtes** : `CSP sandbox`, `noindex`, `no-store`.

Ajouts propres au studio, à exclure d'une page publique :
- `<meta name="robots" content="noindex">` (`render.ts:893`) ;
- barre « Aperçu », sélecteur d'éléments et `postMessage` vers `*` (`src/lib/theme/preview-tools.ts`) ;
- transport de l'aperçu : médias en `data:` et pont `fetch` (`src/lib/theme/preview-transport.ts`) ;
- articles « Exemple » (`render.ts:851`, `preview-samples.ts`) ;
- `request.host: "apercu"` et `shop: "apercu"` (`render.ts:858, 865`). Les thèmes s'en servent pour afficher les mentions de démonstration, par exemple `theme-base/sections/contact-form.liquid:16, 49` ;
- panier de démonstration en mémoire, et `POST /contact` qui ne fait qu'enregistrer des tests de démo (`preview-contact.ts:15, 24-26`).

Les liens publics existants (`/api/public/media/…` et `/api/public/theme/…`) **expirent** (3 h et 1 h, `src/lib/public-url.ts:16-41`). Ils sont inutilisables pour un site permanent.

L'élément réutilisable le plus proche est `scripts/reference-static-preview.ts:64-170` :
- il rend toutes les pages par la vraie route avec `es_raw=1` ;
- il les aplatit en HTML statique, plus les fichiers ;
- il n'est servi qu'aux utilisateurs connectés, en `noindex` (`src/app/api/theme-demos/...`).

## 5. Formulaires et rendez-vous : réel ou démonstration

| Fonction | Réalité aujourd'hui | Preuve |
|---|---|---|
| Formulaire de contact ou de devis des sites de services (`{% form 'contact' %}`) | Publié chez Shopify, c'est le formulaire de Shopify qui reçoit les messages. **Le studio ne stocke aucune demande réelle.** L'aperçu n'enregistre que des « demandes de test » (fichier JSON, 50 lignes au plus, jamais relu) pour les démonstrations. | `render.ts:491` ; `preview-contact.ts:8-37` ; `theme-base/assets/editorial.js:52-65` |
| Calendrier « booking-calendar » générique | Pas de moteur : c'est une demande envoyée par le formulaire de contact, confirmée ensuite par e-mail | `src/lib/theme/booking-need.ts:75` ; `theme-base/sections/booking-calendar.liquid:4` |
| Rendez-vous salon, cabinet, restaurant | **Moteurs réels** : disponibilités, réservation transactionnelle, jetons, déplacement et annulation, e-mails, API publiques sans cookie avec CORS `*`, limites par IP. Ils ne fonctionnent qu'en `booking_mode: "live"`, activable seulement si `APP_URL` est en HTTPS public. | `src/lib/salon/booking.ts`, `src/lib/cabinet/booking.ts`, `src/lib/restaurant/booking.ts` ; `src/lib/rendez-vous.ts:75, 100-113` |
| Messages laissés via ces moteurs (`*_requests`) | Enregistrés et transférés à `notify_email`, mais **jamais relus dans le studio** | `salon/booking.ts:439-454` |
| Lien de réservation externe (Calendly, Planity…) | Intégré dans le site ou ouvert dans un nouvel onglet | `services-site.ts:69-72` ; `theme-base/sections/booking.liquid` |
| E-mail | SMTP via nodemailer. S'il n'est pas configuré, rien n'est envoyé et les moteurs le disent au visiteur. | `src/lib/mail.ts:57-88` |
| RGPD des visiteurs | Aucun export, aucune suppression, aucune durée de conservation pour les données des visiteurs | `src/lib/privacy.ts` (comptes du studio seulement) |

Ce qui manque aux moteurs de rendez-vous : captcha ou champ piège, contrôle d'origine, plafond global par projet (`src/app/api/public/*/route.ts`).

## 6. Sécurité, hôtes, données

- **Hôte** :
  - `src/middleware.ts` ne regarde jamais `Host` ;
  - avec `Host: x.sites.exemple.fr`, toute l'application répond aujourd'hui sous ce nom, y compris `/studio`, `/admin`, `/api` et `/preview` ;
  - `assertMutationOrigin` accepte l'origine de la requête elle-même (`src/lib/http.ts:52-65`).
- **Cookie de session** `ecs_session` : `httpOnly`, `SameSite=Lax`, sans attribut `domain`, donc limité à l'hôte (`src/lib/auth.ts:72-78`). Si les sites étaient des sous-domaines du domaine du studio, ils seraient « même site » : `SameSite` ne protégerait plus, et un site client pourrait poser des cookies sur `.domaine-du-studio` (fixation). **Les sites doivent donc être servis sur un domaine enregistrable distinct**, par exemple `*.sites-<marque>.fr`, et jamais sur l'origine du studio. C'est d'autant plus vrai que les sections personnalisées peuvent contenir du JavaScript écrit par l'IA (`spec.ts:115`).
- **Base de données** : better-sqlite3, schéma unique `CREATE TABLE IF NOT EXISTS`, colonnes ajoutées par `ADDED_COLUMNS`, aide `tx()` (`src/lib/db.ts:20-1246`).
- **Fichiers** : `DATA_DIR/storage`, écriture atomique, protection contre la traversée de répertoires (`src/lib/storage.ts`).
- **Isolation des projets** : `ownedProject` (`auth.ts:141-148`), portée d'actif et de projet (`src/lib/project-security.ts`).
- **Forfaits** : `creer` 49 €, `vendre` 89 €, `dominer` 129 € (`src/lib/plans.ts:80, 113, 147`). Aucune limite de stockage ni de trafic n'existe. Contrôle d'accès par forfait : `requirePlan` (`src/lib/plan-gates.ts:40-50`).
- **Limitation de débit** : en SQLite (`rate_events`), avec l'IP prise dans le dernier `X-Forwarded-For` (`src/lib/rate-limit.ts`).
- **Infrastructure** :
  - Dockerfile (port 3000, `/data`) ;
  - docker-compose sans proxy HTTPS ;
  - le studio réel tourne dans un Codespace (`scripts/studio.mjs`, `scripts/maj.mjs`) ;
  - sauvegarde manuelle (`scripts/lot1/sauvegarde.ts`), non planifiée ;
  - CI : `.github/workflows/ci.yml`.
- **Risques de publication à traiter** :
  - les textes `[À compléter : …]`, y compris la mention légale d'hébergement (`services-site.ts:37, 285-291, 334`), ne doivent jamais être publiés : la publication est bloquée tant qu'il en reste ;
  - l'identifiant du projet est visible dans `service_url` des moteurs de rendez-vous. Il est déjà public par construction : ces API sont publiques.

## 7. Architecture proposée (minimale et réaliste)

### 7.1 Principe
1. **Publier = figer.**
   - Au clic sur « Publier », le serveur rend toutes les pages accessibles depuis l'accueil avec le moteur actuel, en mode public et `base = ""`.
   - Il copie les fichiers référencés (CSS, JS, médias, polices).
   - Il écrit le tout dans un **artefact immuable** : `DATA_DIR/sites/<projet>/<publication>/`, avec un manifeste (SHA-256 de chaque fichier, version du thème, empreinte du thème, commit du code).
2. **Servir = lire l'artefact actif.** Aucun rendu Liquid à la demande, aucune lecture de la session : un site publié ne dépend plus des données vivantes du studio.
3. **Restaurer = repointer.**
   - L'adresse est repointée vers une publication précédente, dont l'artefact est intact.
   - La restauration est exacte et instantanée, sans nouveau rendu.

### 7.2 Données (nouvelles tables)
- `site_publications` : `id`, `project_id`, `user_id`, `number`, `theme_version_id`, `spec_hash`, `theme_fingerprint`, `code_commit`, `status` (`ready` ou `failed`), `pages`, `bytes`, `manifest_sha`, `error`, `created_at`.
- `site_live` : `project_id` (clé), `publication_id`, `updated_at`. C'est le pointeur actif, modifié dans une seule transaction.
- `site_live_history` : journal des publications, restaurations et mises hors ligne (`project_id`, `publication_id`, `action`, `user_id`, `at`).
- `site_addresses` : `hostname` (clé unique), `project_id`, `kind` (`studio` ou `custom`), `status` (`active`, `pending_dns`, `verified` ou `disabled`), `verify_token`, `verified_at`, `created_at`.
- `site_requests` : demandes réelles reçues par un site publié. Champs : `project_id`, `publication_id`, `hostname`, champs du formulaire (JSON borné), empreinte d'IP, `created_at`, `read_at` ; purge après 12 mois.

### 7.3 Résolution du nom d'hôte
- La fonction est **désactivée par défaut** : sans `SITES_DOMAIN`, aucun changement de comportement.
- `src/middleware.ts` :
  - il supprime tout en-tête interne fourni par le client ;
  - si `Host` se termine par `.${SITES_DOMAIN}`, il réécrit la requête vers une route interne de service des sites, en joignant le nom d'hôte ;
  - les domaines personnalisés suivent la même voie seulement avec `SITES_CUSTOM_DOMAINS=1`.
- La route interne retrouve `hostname → projet → publication active` en base.
- Un nom d'hôte inconnu, désactivé ou non vérifié reçoit 404. Le studio (`/studio`, `/admin`, `/api`, `/preview`) n'est **jamais** servi sous un nom de site.

### 7.4 Routes publiques d'un site
- `GET` lit un fichier de l'artefact actif ; la page `404` vient du thème.
- `robots.txt` et `sitemap.xml` sont propres à chaque site, construits depuis la liste des pages publiées.
- `POST /contact` reçoit une vraie demande :
  - contrôle d'origine ;
  - champ piège ;
  - corps limité ;
  - limites par IP et par site ;
  - validation ;
  - enregistrement en base ;
  - e-mail au professionnel **si le SMTP est configuré**.
- Le succès n'est affiché qu'après l'enregistrement effectif, avec le message prévu par le thème. Un repli sans JavaScript est prévu.

### 7.5 Cache et SEO
- HTML : `Cache-Control: public, max-age=60` et `ETag` lié à la publication.
- Fichiers : `public, max-age=300` (des URL versionnées et `immutable` sont une étape suivante).
- Pas de `noindex` ; URL canonique et sitemap sur l'adresse du site.
- `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.

### 7.6 Studio
- Encart « Publier votre site » :
  - adresse ;
  - points bloquants (textes « À compléter », contrôle qualité refusé, forfait) ;
  - publication ;
  - historique avec « Restaurer » ;
  - mise hors ligne ;
  - demandes reçues ;
  - domaine personnalisé.
- Réservé au propriétaire du projet. **Inclus dans les forfaits**, sans supplément ni nouveau droit commercial.

### 7.7 Domaines personnalisés (préparés, non activés)
1. Le client saisit `www.son-domaine.fr`.
2. Le studio lui donne :
   - un enregistrement `TXT _ecs-verif.www.son-domaine.fr = <jeton>` ;
   - un `CNAME` vers l'adresse du site.
3. La vérification interroge le DNS réel (`node:dns`). Une fois le domaine vérifié, il est servi seulement si `SITES_CUSTOM_DOMAINS=1`.
- Un domaine est unique : en cas de conflit, il est refusé.
- La déconnexion le désactive.
- Un changement de propriétaire, ou l'expiration de l'abonnement, désactive le domaine.
- **Le certificat HTTPS n'est pas géré par l'application.** Il revient au proxy frontal (Caddy « on-demand TLS », avec une route `ask` qui interroge `site_addresses`). Cela exige une infrastructure et un accord distincts.

### 7.8 Ce qui exige un service externe ou un accord
- **Un domaine enregistrable dédié aux sites**, avec un DNS joker `*.<domaine>` : achat et accès DNS.
- **Un hébergement public permanent** avec un proxy HTTPS : Caddy ou Traefik, Let's Encrypt.
  - Le Codespace actuel ne convient pas à des sites de clients : il est éphémère et son port est servi sous une adresse GitHub.
- **Un SMTP** pour notifier les professionnels. Sans SMTP, les demandes restent consultables dans le studio.
- **Des sauvegardes planifiées** de `DATA_DIR`, y compris `sites/`.
- Aucun achat, aucune clé, aucun DNS ni aucun déploiement ne sera fait sans accord.

## 8. Périmètre du prototype

- Branche `claude/232-hebergement-services`, issue de `main`.
- Thèmes et maquettes inchangés : le rendu public est une option du moteur, désactivée par défaut, et l'aperçu ne change pas.
- Démonstration locale, sur une URL de test isolée `http://<site>.sites.localhost:<port>` (`*.localhost` pointe vers la machine locale) :
  1. site fictif ;
  2. publication V1 ;
  3. navigation ;
  4. correction ;
  5. publication V2 ;
  6. restauration de V1 ;
  7. vraie demande de contact enregistrée ;
  8. hôte inconnu refusé ;
  9. studio inaccessible sous l'hôte du site ;
  10. compte étranger refusé.
- **Ce prototype n'est pas un hébergement prêt pour des clients** : pas de vrai domaine, pas de HTTPS, pas d'hébergement permanent.
