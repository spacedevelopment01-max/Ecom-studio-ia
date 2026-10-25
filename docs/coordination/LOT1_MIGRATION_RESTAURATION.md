# Lot 1 — Migrations, sauvegarde et restauration des données (issue #163, action 03)

Rédigé le 23 octobre 2026 par la conversation Claude 2. **Toutes les preuves ci-dessous portent sur des données
SYNTHÉTIQUES** fabriquées dans des copies isolées. **La sauvegarde et la restauration des données réelles de Thomas ne
sont pas vérifiées** : cette conversation n'a aucun accès à son Codespace, à sa base ni à ses médias, et n'en prétend
aucun. La procédure réelle est décrite au § 5, prête à être exécutée par lui (ou avec lui).

Une branche Git (par exemple `claude/sauvegarde-main-avant-integration`) sauvegarde le **code**, jamais la base ni les
médias.

## 1. Inventaire (noms seulement, aucune valeur)

### Où vivent les données

| Élément | Emplacement | Sauvegardé | Remarque |
|---|---|---|---|
| Base SQLite (WAL) partagée site + worker | `DATA_DIR/studio.db` (ou `DATABASE_FILE`) + fichiers `-wal` / `-shm` | oui, instantané en ligne | 63 tables créées à l'ouverture par le code de `0a6aa1dd` (54 à `dcfc13b1`), plus une dizaine créées à la volée par leurs modules (`marketing_*`, `house_texts`…) : 73 dans la base synthétique de `0a6aa1dd` |
| Médias (originaux, générés, miniatures, exports) | `DATA_DIR/storage/` (ou `STORAGE_DIR`) | oui, avec empreinte SHA-256 par fichier | référencés par `assets.storage_key` et `assets.thumb_key` ; les fichiers en cours d'écriture (`*.<pid>.tmp`) sont ignorés |
| Reçus vidéo payés | `DATA_DIR/video-receipts/` | oui | |
| Essais de contact des aperçus | `DATA_DIR/preview-contact-tests/` | oui | |
| Caches (photos, polices du thème) | `DATA_DIR/cache/` | non | régénérables |
| Fichiers de travail | `DATA_DIR/tmp/` | non | temporaires |
| Démonstrations des thèmes | `DATA_DIR/theme-demos/` | non | `npm run demos:themes` |
| Sauvegardes automatiques (migration forfaits V2) | `DATA_DIR/backups/` | non | à garder à part si besoin |
| Secret de développement | `DATA_DIR/.app-secret` | **jamais** | c'est un secret : à garder dans un coffre |

### Secrets et configuration nécessaires

- Variables d'environnement : `APP_SECRET` (clé maître, **indispensable** pour relire les réglages chiffrés après
  restauration), `APP_URL`, `ADMIN_EMAIL`, `DATA_DIR`, `DATABASE_FILE`, `STORAGE_DIR`, `AI_GATEWAY_PROVIDERS`
  (passerelle de l'hébergeur), `SOCIAL_PUBLISH_DISABLED`, `WORKER_CONCURRENCY`. Le manifeste note seulement si chacune
  est définie (vrai/faux).
- Réglages chiffrés en base (table `settings`, `secret = 1`) — noms autorisés par
  `src/app/api/admin/settings/route.ts` : `provider.{anthropic,openai,google,fal,alibaba,pexels,pixabay}.apiKey`,
  `oauth.{meta,tiktok,youtube,pinterest,canva,shopify}.clientSecret`, `stripe.secretKey`, `stripe.webhookSecret`,
  `smtp.{host,user,password,from}`. Jetons des réseaux sociaux : table `connections` (`access_token`, `refresh_token`).
- Attention : `getSetting` lit aussi une variable d'environnement du même nom en majuscules (`STRIPE_SECRETKEY`…)
  quand le réglage est absent. Une copie d'essai doit donc partir d'un environnement **vide** (`env -i`).

### Migrations existantes (lues dans le code de `0a6aa1dd`)

| Moment | Code | Effet | Rejouable |
|---|---|---|---|
| Ouverture de la base | `SCHEMA` (`src/lib/db.ts`) | `CREATE TABLE IF NOT EXISTS` | oui |
| Ouverture | `ADDED_COLUMNS` + `migrate()` | ajout de colonnes seulement, jamais de suppression ; index | oui |
| Ouverture | `migrateBillingV2()` | sauvegarde automatique `VACUUM INTO data/backups/avant-forfaits-v2-*.db` si l'ancien schéma est présent (hors tests) ; reconstruction de `subscriptions`, `wallets`, `quota_usage`, `pack_balances`, `pack_purchases` sans clé étrangère vers `users` (toutes les lignes recopiées) ; rattachement de l'ancien abonnement payé au projet actif **le plus récent** du compte ; projets des comptes jamais abonnés masqués (`hidden = 1`), jamais supprimés ; rattachement abonnement → projet définitif (index unique + déclencheurs) ; repère `billing.v2.migrated` | oui (repère + conditions) |
| Première lecture d'un projet | `bindLegacy` (`src/lib/project-billing.ts`) | rattache un ancien abonnement encore libre au premier projet qui l'utilise | oui |
| Première lecture d'un budget | `conformWallet` (`src/lib/billing.ts`, règle 40 % / 50 %) | plafonne le budget du mois et les crédits hors forfait à ce que les paiements justifient ; chaque changement inscrit au relevé (`ledger`, type `adjustment`) | une fois (`rule_version`) |
| Démarrage du worker | `src/lib/secrets-migration.ts` | rechiffre avec `APP_SECRET` les valeurs chiffrées avec l'ancienne constante de développement | oui |
| Module concerné | `marketing-strategy`, `house-describe`, `strategy-transition`… | tables créées à la première utilisation | oui |

À la tête candidate `fddf1383` (#170 + #168 + #166), `db.ts` ajoute `billing_mutations`, `checkout_intents`,
`stripe_event_claims`, `support_messages`, `support_tickets` (ajouts seulement) et #168 ajoute
`marketing_strategy_set_history` à la volée.

## 2. Outils livrés (`scripts/lot1/`)

| Commande | Rôle | Garde-fous |
|---|---|---|
| `npx tsx scripts/lot1/sauvegarde.ts --dest <dossier>` | instantané SQLite par l'API de sauvegarde en ligne (le site et le worker continuent d'écrire), copie des médias, contrôle de chaque fichier référencé, manifeste (`manifeste.json` + `.sha256`) | dossier cible vide et hors des données ; aucune valeur secrète ; réseau coupé |
| `npx tsx scripts/lot1/sauvegarde.ts --verifier <dossier>` | revérifie empreintes, intégrité SQLite, clés étrangères, schéma, tables, médias | lecture seule |
| `npx tsx scripts/lot1/restauration.ts --depuis <sauvegarde> --vers <dossier neuf> [--recette]` | vérifie la sauvegarde **avant**, copie, revérifie **après** | refuse un dossier non vide, le dossier de données en service, une sauvegarde altérée ; `--recette` met les tâches et calendriers en pause et retire secrets et jetons de la copie |
| `npx tsx scripts/lot1/essai-complet.ts --source <données> --code <code> --travail <dossier>` | sauvegarde → restauration → migration par le code choisi (2 passages) → contrôles → restauration dans une **autre** copie → copie de recette neutralisée | source jamais modifiée (empreinte comparée) ; chaque processus sans réseau, sans site ni worker, environnement vide, `APP_SECRET` aléatoire, publication désactivée |
| `npx tsx scripts/lot1/base-historique.ts --code <ancienne version> --out <dossier>` | fabrique une base **synthétique** avec le schéma exact d'une ancienne version | adresses `.invalid`, aucun réseau |
| `scripts/lot1/essais-historiques.sh <travail> <rapports> [code…]` | rejoue tout : 3 époques × chaque code | historique Git complet requis |

## 3. Essais réalisés (données synthétiques)

Compte représentatif fabriqué avec le code de chaque époque : compte A (4 projets : produit unique, catalogue,
services, archivé), compte B (1 projet), ancien compte découverte C (1 projet), administrateur ; abonnements (par compte
avant V2 ; deux abonnements pour A et un pour B après V2), portefeuilles, recharge, ancien pack, 4 paiements,
18 médias + 18 miniatures (36 fichiers), 12 versions de thème, retouches, mémoire, 5 tâches (terminée, en file, en
cours avec bail, en pause, échouée), calendrier avec une publication **programmée**, une publiée, un brouillon,
connexion Instagram (jeton factice), article de blog, réglage secret factice ; à `0a6aa1dd`, angles marketing (deux
versions, stratégie active v2).

Commande exacte : `scripts/lot1/essais-historiques.sh <travail> reports/lot1/essais /home/user/Ecom-studio-ia /home/user/wt-integration`
(code de ce lot `fa10eff2`, combinaison candidate `fddf1383`). Rapports : `reports/lot1/essais/`.

| Base (époque) | Code testé | Contrôles | Schéma avant → après | Ajouts | Sauvegarde auto. |
|---|---|---|---|---|---|
| `dcfc13b1` (avant forfaits V2) | `fa10eff2` (main + lot 1) | 45/45 | `81469c74` → `c4dbf951` | 1 réglage (`billing.v2.migrated`), 9 tables | 1 |
| `dcfc13b1` | `fddf1383` (candidate) | 45/45 | `81469c74` → `189e8558` | 1 réglage, 14 tables | 1 |
| `d97e0b95` (Codespace connu de Thomas) | `fa10eff2` | 45/45 | `f527cadc` → `406dc9c8` | 1 table (`social_edit_undo`) | 0 |
| `d97e0b95` | `fddf1383` | 45/45 | `f527cadc` → `4a1c0d64` | 6 tables | 0 |
| `0a6aa1dd` (main actuel, angles) | `fa10eff2` | 46/46 | `60cf9551` → `60cf9551` | aucun | 0 |
| `0a6aa1dd` | `fddf1383` | 46/46 | `60cf9551` → `704e5ebc` | 5 tables | 0 |

Contrôles de chaque essai (liste complète dans chaque rapport) : manifeste intact, empreinte de la base, intégrité
SQLite, clés étrangères, schéma et tables identiques au manifeste, 36 médias identiques, aucune référence manquante ;
après migration : **chaque ligne d'origine retrouvée à l'identique** (sur ses colonnes d'origine), un compte par
abonnement, jamais deux abonnements pour un projet, chaque abonnement pointe un projet du même compte, aucun projet
supprimé ; second passage : schéma et **toutes** les tables identiques au premier (idempotence) ; médias inchangés ;
angles : stratégie active historique relue par le code testé ; crédits hors forfait : toute baisse inscrite au
relevé ; restauration dans une autre copie vérifiée (comptes et projets retrouvés avec leur propriétaire) ;
restauration refusée dans un dossier non vide ; copie de recette sans tâche prête à partir, sans secret ni jeton ;
source jamais modifiée.

Test automatique (`tests/lot1-sauvegarde-restauration.test.ts`, exécuté en CI) : instantané pris **pendant** qu'un
autre processus écrit en continu (deux tables écrites dans la même transaction : comptages égaux dans la copie,
écriture poursuivie après), médias manquants signalés, refus (dossier non vide, dossier en service, sauvegarde dans
les données, média altéré), neutralisation, et migration de la base `dcfc13b1` figée en SQL
(`tests/fixtures/lot1/base-avant-forfaits-v2-dcfc13b1.sql`).

### Constats à arbitrer (règles existantes, non modifiées)

1. **Ancien abonnement « plusieurs boutiques »** (avant V2, champ `stores = 3`) : la migration le rattache au seul
   projet actif le plus récent (`p-a-services` dans l'essai). Les deux autres projets restent visibles **sans forfait
   payant** (« régularisation par l'administration », commentaire du code). Compensation ou attribution d'autres
   abonnements : **décision de Thomas**, rien n'est inventé.
2. **Crédit hors forfait non justifié par un paiement** (3 € « ancien budget de création offert » dans l'essai) :
   ramené à 0 à la première lecture du budget (règle 50 % du HT payé), avec une ligne `adjustment` au relevé.
   Faut-il compenser ces anciens crédits ? **Décision de Thomas.**
3. Ancienne découverte (compte jamais abonné) : projet masqué, conservé, rendu visible à la souscription (code
   existant). Dans la base `d97e0b95`, le projet de découverte synthétique reste visible parce que le repère de
   migration existait déjà quand il a été créé : artefact de fabrication, pas un défaut constaté.

## 4. Retour arrière : code ≠ données

- **Retour du code seul** (ancienne version sur une base déjà migrée) : essayé avec le code `dcfc13b1` sur la copie
  migrée. La base s'ouvre et se lit, mais l'ancien code calcule les droits **par compte** (champ `stores`) alors que
  les abonnements sont désormais **par projet** ; une écriture au format ancien est refusée par les contraintes
  (« UNIQUE constraint failed: subscriptions.user_id »), et un abonnement rattaché ne peut plus être supprimé
  (déclencheur). Conclusion : le retour du code ne remet pas les données dans leur état d'avant.
- **Restauration des données** : seule la sauvegarde prise **avant** la mise à jour remet l'état d'avant. Elle a été
  restaurée dans une autre copie et vérifiée (empreintes, tables, médias, comptes/projets).
- Les écritures faites entre la sauvegarde et le retour arrière (nouveaux paiements, publications, créations) seraient
  perdues par une restauration : à décider au cas par cas, jamais automatiquement.

## 5. Procédure réelle (à exécuter par Thomas, non exécutée ici)

Sans arrêter le studio, dans son Codespace ou sur le serveur, depuis le dossier du dépôt :

1. `git rev-parse HEAD` (noter la version du code en service).
2. `npx tsx scripts/lot1/sauvegarde.ts --dest ../sauvegarde-$(date +%F-%H%M)` — hors du dossier `data/`.
3. `npx tsx scripts/lot1/sauvegarde.ts --verifier ../sauvegarde-…` : toutes les lignes « OK ». Une ligne « références
   médias » en échec signale des médias déjà absents : la sauvegarde reste utilisable, le manifeste liste les
   identifiants concernés (aucun contenu).
4. Garder `APP_SECRET` (ou `data/.app-secret` en développement) **à part**, dans un coffre ; ne jamais le copier
   dans la sauvegarde, le dépôt ou la conversation.
5. Copier le dossier de sauvegarde hors de la machine (le Codespace peut être supprimé).
6. Essai avant mise à jour : `npx tsx scripts/lot1/essai-complet.ts --source data --source-en-service-lecture-seule --code <code de la nouvelle version> --travail ../essai-…`
   — la source est lue par la sauvegarde en ligne, jamais modifiée (empreinte contrôlée) ; tout le reste se passe dans
   des copies.
7. Reprise réelle si nécessaire : `npx tsx scripts/lot1/restauration.ts --depuis ../sauvegarde-… --vers ../data-restauree`,
   puis démarrer le studio avec `DATA_DIR=../data-restauree` et le **même** `APP_SECRET`. Ne jamais employer `--recette`
   pour une vraie reprise.

Pendant un essai sur copie, ne lancer ni `npm run studio`, ni `npm start`, ni le worker sur la copie. Pour regarder une
copie dans un navigateur : `restauration.ts --recette`, puis environnement vide
(`env -i PATH=$PATH DATA_DIR=<copie> SOCIAL_PUBLISH_DISABLED=1 APP_SECRET=<autre valeur> npx next start -p <port libre>`),
**sans** worker.

## 6. Limites

- Données synthétiques seulement ; ni la base de Thomas, ni ses médias, ni son volume réel n'ont été testés.
- La durée d'une sauvegarde sur un gros volume de médias n'est pas mesurée (copie fichier par fichier).
- Les médias supprimés entre l'instantané et la copie sont signalés, pas récupérés.
- La version servie du studio de Thomas n'est pas vérifiée (aucun accès).
