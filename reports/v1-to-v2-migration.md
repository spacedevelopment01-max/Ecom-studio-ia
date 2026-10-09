# Migration des parcours clients V1 → V2

Branche : `claude/v1-to-v2-migration`, partie de `main` après les fusions #64 (Phase 12A) et #65 (correctifs
post-audit). **Non fusionnée.** Aucun appel d'IA payant, aucune publication réelle, aucune donnée client supprimée.

Le scénario de tests complet A–J (point 15 de la demande) n'a **pas été exécuté**, comme vous l'avez demandé (« je
ferai un test moi-même »). Ce qui a été vérifié est listé en section 9.

**Verdict : migration PARTIELLE.** Les nouvelles créations des onglets et de la création complète passent par les
moteurs V2, sauf des parcours conservés volontairement (section 6). Ces parcours sont conservés parce qu'il n'existe
pas de remplaçant V2 équivalent, ou parce que les retirer ferait perdre une fonction utile.

## 1. Mission 1 — fusion

| Étape | Résultat |
|---|---|
| Phase 12A | PR #64, CI verte, fusionnée avec un commit de fusion (historique conservé, aucun commit dupliqué) |
| Correctifs post-audit | PR #65, CI verte, fusionnée ensuite, de la même façon |
| Contrôle après fusion | contenu de `main` identique à la branche testée ; TypeScript OK ; 70 tests rejoués (budget, facturation, sécurité, demande unique, reprise, calendrier) |
| Parcours navigateur de la demande unique (avant fusion, version finale) | **36/36**, 0 appel d'IA |

## 2. Moteurs migrés

### Brand & Logo Engine V2

- **Création complète (étape marque)** et **étape « logo » de la demande unique** : série Logo V2, construite puis
  contrôlée. La meilleure proposition FINALE est appliquée sans verrou, et le client peut en choisir une autre.
- **Sans IA (forfait Découverte)** : la meilleure « version du studio » devient le logo **provisoire**. Elle n'est
  jamais présentée comme finale et ne génère ni charte ni kit tant qu'elle n'est pas choisie.
  - Les versions du studio sont rangées à part et peuvent être choisies (rôle `logo-v2-studio`).
  - Le choix du client vaut contrôle humain : la proposition choisie devient son logo validé.
- **Onglet Marque** :
  - le nouveau moteur est en tête ;
  - « Nouvelles pistes » de l'ancien écran lance désormais Logo V2 ;
  - les anciennes pistes restent consultables et peuvent encore être choisies ;
  - l'ancien générateur de « logos complets » est fermé aux nouvelles créations (les logos déjà créés restent utilisables).
- **Nom ou palette modifiés** : le logo V2 appliqué est reconstruit avec le nouveau nom et les couleurs de la palette
  aux mêmes rôles, puis réappliqué partout (site, déclinaisons). Cette reconstruction se fait sans IA.
- **Transmission** : les déclinaisons (principal, clair, horizontal, marque réduite, favicon, SVG, noir, empilée,
  petite taille) alimentent le Theme Engine, les publicités et les visuels sociaux, comme avant.
- **Versions** : un logo validé ou fourni par le client n'est jamais remplacé automatiquement.

### Image Engine V2

- **Création complète et étape « visuels » de la demande unique** (`runImageSetV2`) :
  - **composants locaux réutilisés, sans IA** : packshots, détails recadrés de la photo d'origine, mises en scène et
    bannières sans texte, toujours à partir des pixels réels du produit ;
  - **photos libres de l'univers** : recherche V2 (licence, sujet contrôlé), sans aucune génération ;
  - **photos du produit en situation** : génération V2 (fidélité au produit, barrière, reprises ciblées), seulement si
    un fournisseur est disponible et dans le plafond ;
  - **entreprise de services** : photos réelles recadrées, photos libres, puis image V2 pour chaque emplacement vide du site.
- **Onglet Images** :
  - nouveau panneau « Moteur d'images » : type, format, sujet, nombre et génération autorisée ou non ; chaque image
    affiche son verdict, son origine, sa licence et un bouton de refus ;
  - l'ancien formulaire devient « Mise en page du studio » : rendus locaux gratuits (packshot, scène, bannière) ;
  - une image IA demandée par l'ancien formulaire part dans Image V2 ;
  - les visuels avec texte se créent dans Publicités ou Publications.
- La route Image V2 exige désormais un forfait, comme les autres créations d'images.
- La boutique reconnaît les photos « en situation » produites par Image V2.

### Advertising Engine V2

- **Création complète** : 2 publicités V2 (documents à calques, modifiables dans l'éditeur visuel).
- **Fenêtre « Campagne » (« Proposer les annonces »)** : Advertising V2 en mode « textes seulement » (angles, textes
  contrôlés, allégations vérifiées, plan de test).
- **« Transformer en publications »** : les publications créées sont des publications Social V2.
- Plus aucune publicité figée (non modifiable) de l'ancien moteur dans les nouveaux parcours.

### Video & UGC Engine V2

- **Création complète** : publicité 9:16 et vidéo 16:9 par le moteur V2. Ce sont des documents modifiables et
  versionnés. Les plans IA ne sont produits que si le client a choisi « avec plans IA » au lancement.
- **Onglet Vidéos** :
  - demande → plan et estimation (rien n'est payé) → accord → production ;
  - liste des documents vidéo ; ouverture (plans, durée, défauts) ;
  - retouche simple en français, rendu, duplication, versions et restauration ;
  - approbation ; exports MP4, sous-titres SRT/VTT et JSON ;
  - UGC par le type « UGC » du moteur V2 (personnage synthétique signalé).
- **Anciennes routes** : vidéo V1, UGC et script UGC sont fermés aux nouvelles productions. Les anciennes vidéos
  restent listées et téléchargeables.
- **Ce qui n'existe pas** : aucune timeline interactive (montage plan par plan à la souris), voir section 7.

### SEO & Copywriting Engine V2

- **Création complète et étape « textes »** : la page principale (fiche produit, ou accueil d'un service) est rédigée
  par SEO V2 (faits vérifiés, contrôles, document éditable).
- **Une seule version de référence** (`seo-v2/theme-copy.ts`) : la boutique, ses exports et les exports CMS lisent les
  documents V2 pour ce qu'ils couvrent :
  - titre, description, points clés et FAQ de la fiche produit ;
  - titre d'accueil ;
  - titre et description SEO.

  Une modification dans l'éditeur V2 est donc ce qui s'affiche. Le kit de textes de mise en page ne complète que le
  reste (accroches de sections, bandeau, pied de page).
- **Blog** :
  - nouveaux articles et réécritures d'articles V2 par SEO V2 ;
  - un article modifié par le client dans l'onglet Blog n'est **plus jamais écrasé** par une nouvelle rédaction V2
    (empreinte `v2_hash`) ;
  - mots-clés toujours marqués « hypothèse », jamais présentés comme des volumes de recherche vérifiés.

### Social Media & Automatisation V2

- **Calendrier de la création complète** : Social V2 (plan, textes sans invention, visuels gratuits, barrière,
  approbation par version).
  - **Une seule fois par projet** : « Suite de la création » ou une reprise ne crée plus jamais de second calendrier.
    Cela corrige le bug qui faisait passer de 7 à 14 publications.
  - Un ancien projet qui a déjà un calendrier n'en reçoit pas d'autre.
- **Publication créée à la main ou depuis une campagne** : publication V2 (« à relire », empreinte, approbation par version).
- **Ancien point d'accès des publications** (`/api/posts/[id]`) :
  - il refuse toute action sur une publication V2 (approuver, programmer, publier, modifier, supprimer) ; plus aucun
    contournement possible ;
  - « Dupliquer » crée une copie V2 ;
  - « Régénérer » par l'ancien moteur est fermé.
- **Ancien calendrier** : consultable pour les anciennes publications ; la création d'un nouveau calendrier par
  l'ancien moteur est fermée (route `plans`).

### Theme Engine V2 et CMS Engine V2

- **Theme Engine V2** : il était déjà le moteur par défaut (création complète, demande unique, bouton « Composer »).
  Il est vérifié inchangé.
- **CMS Engine V2** : l'**envoi direct vers Shopify** passe d'abord par l'export contrôlé du CMS V2. Un export refusé
  n'est jamais envoyé, et Shopify télécharge l'export Shopify V2 (médias refusés exclus).
  Aucun envoi réel n'a été fait.

### Studio Workflow V2

- Les étapes `logo`, `image_generate`, `copy` et `blog` exécutent maintenant réellement les moteurs V2.
- Les libellés du suivi disent la vérité :
  - « Marque + Logo V2 » : la stratégie de marque n'a pas de module V2 ;
  - « SEO & Copy V2 + kit de textes ».

## 3. Routes modifiées

| Route | Avant | Maintenant |
|---|---|---|
| `POST /brand/logo` (nouvelles pistes) | ancien générateur | tâche `brand.logo.v2` |
| `PATCH /brand` (nom, palette) | anciennes pistes refaites | logo V2 reconstruit ; anciennes pistes mises à jour seulement si le projet en a |
| `POST /brand/full-logo` (créer) | IA ancien moteur | 410 (choix d'un logo existant toujours possible) |
| `GET/POST /brand/logo-v2` | FINAL seulement | + versions du studio, logo appliqué |
| `POST /images` | scène IA, social, pub V1 | IA → `image.v2` ; social et pub → 410 ; rendus locaux inchangés |
| `POST /images/v2` | sans contrôle de forfait | forfait requis |
| `POST /videos`, `/ugc`, `/ugc/script` | moteurs V1 | 410 (forfait vérifié d'abord) |
| `GET/POST /videos/v2` | — | + dernier rendu, verdict, approbation ; forfait requis pour produire |
| `POST /campaigns/draft` | `draftAds` V1 | Advertising V2 (textes seulement) |
| `POST /projects/[id]/posts` | publication V1 | publication V2 |
| `POST/PATCH/DELETE /api/posts/[id]` | contournement V2 possible | V2 refusé, copie V2, régénération fermée |
| `POST /plans` | calendrier V1 | 410 |
| `POST /blog`, `/blog/[id]/rewrite` | `blog.write` V1 | `content.v2` (article) |
| `/api/public/theme/.../theme.zip` | ZIP V1 | export Shopify du CMS V2 |
| tâche `shopify.push` | sans contrôle | contrôle CMS V2 avant envoi |
| tâche `images.generate` | jeu V1 | `runImageSetV2` |

**Anciennes routes conservées (lecture et compatibilité)** :
- `GET /plans`, `GET /brand/full-logo` et « utiliser » un logo complet existant ;
- choix d'une ancienne piste de logo (`/brand/logo` avec `proposalId`) ;
- articles V1 (modification à la main, publication, corbeille) ;
- anciennes publications V1 (validation, programmation et annulation par date, comme avant) ;
- `GET /blog/topics` (sujets proposés).

## 4. Interfaces modifiées

- **Marque** : logo V2 en tête, avec ses versions du studio (badge « Provisoire ») et le badge « Appliqué ». Les
  anciennes pistes sont présentées comme telles, sans bouton de nouvelle génération ; le panneau « logos complets »
  est retiré.
- **Images** : panneau « Moteur d'images » ; formulaire local renommé « Mise en page du studio » ; plus de visuels
  avec texte.
- **Vidéos** : panneau V2 (plan, estimation, accord, documents, retouche, rendu, approbation, exports) ; « Tous les
  fichiers vidéo » garde les anciennes vidéos ; formulaires motion design V1 et UGC V1 retirés.
- **Calendrier / Publications** :
  - ancien parcours consultable, sans « Préparer des publications » ;
  - dans l'éditeur d'anciennes publications, la régénération est retirée (dupliquer donne une copie V2).

Captures : `reports/screenshots/v1-to-v2/` (Marque, Images, Vidéos, Publicités, Calendrier, Blog sur ordinateur ;
Marque, Images, Vidéos sur téléphone).

## 5. Problèmes corrigés

1. La création complète utilisait l'ancien générateur de logo et l'ancien jeu d'images.
2. Les étapes « V2 » de la demande unique exécutaient du V1 (logo, visuels, textes, blog).
3. Le calendrier était recréé à chaque « Suite de la création » (7 → 14 publications).
4. L'ancien écran pouvait approuver, programmer ou publier une publication V2 sans la barrière ni l'approbation par version.
5. Une publication créée à la main ou depuis une campagne était une publication V1.
6. Une rédaction V2 pouvait écraser un article de blog modifié par le client.
7. La boutique affichait les textes du kit V1 même quand un document SEO V2 avait été modifié par le client : deux
   versions contradictoires du même texte.
8. L'envoi vers Shopify ignorait les contrôles du CMS V2.
9. Les routes Image V2 et Vidéo V2 ne vérifiaient pas le forfait.

## 6. Anciens parcours V1 restants (inventaire)

| Moteur V1 | Emplacement | Qui l'appelle encore | Pourquoi conservé | Risque | Suppression possible quand |
|---|---|---|---|---|---|
| Stratégie de marque (nom, positionnement, palette, ton) | `engine/brand.ts` (`buildBrand`, `aiBrandChecked`) | création complète, « Nouvelle proposition », étape `brand_strategy` | aucun module V2 de stratégie de marque ; son logo passe par Logo V2 | faible | un « Brand Strategy V2 » existe |
| Application du logo et déclinaisons | `engine/identity.ts` (`applyLogo`) | Logo V2 (composant réutilisé) | rendu des déclinaisons, échange du logo dans le thème | aucun | — (composant) |
| Anciennes pistes de logo | `engine/identity.ts` (`generateLogos`, `recolorChosenRoute`) | changement de nom ou de palette d'un **ancien** projet qui a des pistes V1 | compatibilité des anciens projets | faible | les anciens projets ont choisi un logo V2 |
| Logos complets IA | `engine/full-logo.ts` | lecture et « utiliser » seulement ; tâche `brand.fulllogo` pour d'anciennes tâches en file | logos déjà créés | aucun | plus de logo complet utilisé |
| Rendus locaux d'images | `engine/images.ts` (`generateImageSet` en `localOnly`, `generateSingleImage` local) | jeu V2 et « Mise en page du studio » | gratuits, fidèles au produit ; aucun équivalent local dans Image V2 | aucun | Image V2 intègre ces rendus |
| Visuels typographiques des services | `engine/service-media.ts` (cartes) | onglet Images (services) | annonces de prestation, conseils, horaires : utiles, pas d'équivalent V2 | faible : visuels figés, sans calques | Social V2 produit ces formats |
| Plan de test publicitaire | `engine/ads.ts` (`localAdStrategy`) | Advertising V2 (composant) | réutilisé par V2 | aucun | — |
| Kit de textes de mise en page | `ai/tasks.ts` (`aiShopCopyChecked`), `engine/local-copy.ts` | étape textes | accroches de sections non couvertes par SEO V2 | faible : les champs couverts par V2 priment | SEO V2 rédige les sections |
| Vidéo motion design V1, UGC V1 | `engine/videos.ts`, `engine/ugc.ts` | tâches `video.render`, `video.ugc` déjà en file ; ancien calendrier V1 | anciennes tâches | aucun nouveau déclenchement | après vidange des anciennes tâches |
| Calendrier V1 | `engine/calendar.ts` (`createContentPlan`, `post.regenerate`) | anciennes tâches en file seulement | anciennes publications | aucun nouveau déclenchement | après vidange |
| Blog V1 | `engine/blog.ts` (`writeBlogArticle`, `suggestTopics`) | tâches `blog.write` en file ; sujets proposés | sujets proposés utiles ; anciens articles | faible | sujets V2 branchés dans l'onglet Blog |
| Directions de thème V1 (11 directions), « change de direction », galerie | `engine/shop.ts`, `theme/directions.ts` | galerie des thèmes, `shop.direction`, retouche « change de direction » | choix explicite du client ; Theme V2 a 5 langages, pas de correspondance une à une | moyen : deux façons de choisir un style | correspondance directions → langages V2 validée |
| Reproduction d'un site existant | `engine/site-reproduce.ts` | création complète (« reproduire mon site ») | pas d'équivalent V2 | moyen | Theme V2 sait reproduire |
| Thème entièrement sur mesure | `engine/custom-theme.ts` | bouton « thème sur mesure » | pas d'équivalent V2 | faible | — |
| Kit réseaux sociaux, maquettes de marque | `engine/social-kit.ts` et voisins | choix du logo | pas d'équivalent V2 | faible | — |

Aucune nouvelle génération V1 n'est présentée comme V2.

## 7. Fonctionnalités non migrables (ou non terminées)

- **Montage vidéo interactif** :
  - non construit : pas de timeline plan par plan, pas de glisser-déposer de plans ;
  - pas de synthèse vocale branchée dans l'interface ;
  - les retouches passent par une demande en français (locale et gratuite) ou par la régénération d'un plan avec accord.
- **11 directions de thème V1 vs 5 langages V2** : pas de correspondance fidèle ; la galerie reste V1, sur choix du client.
- **Réécriture d'un ancien article (V1)** : fermée. L'ancien article se modifie à la main, ou on écrit un nouvel
  article V2 ; il n'y a donc jamais deux articles concurrents.
- **Images IA des services hors emplacements du site** : remplacées par le panneau Image V2. Les cartes
  typographiques restent locales.

## 8. Compatibilité des projets existants

Rien n'est converti ni supprimé de façon irréversible :
- les logos, pistes, images, vidéos, publications, calendriers et articles V1 restent lisibles et téléchargeables ;
- les anciennes publications programmées gardent leur fonctionnement (approbation par date) ;
- un logo validé ou fourni par le client n'est jamais remplacé ;
- un texte, une vidéo ou un article modifié par le client n'est jamais écrasé ;
- les exports déjà faits restent dans « Exports de thèmes ».

Une seule nouvelle colonne est ajoutée (`blog_articles.v2_hash`), sans conséquence pour les données existantes.

## 9. Tests et vérifications

| Vérification | Résultat |
|---|---|
| TypeScript | OK |
| Suite complète | **997/997** (dont 6 nouveaux tests de migration `tests/migration-v2.test.ts`) |
| Compilation (build) | OK |
| Captures navigateur des onglets migrés (`scripts/screens-v1-to-v2.ts`) | **13/13** : contenus attendus, aucune erreur JavaScript, aucun débordement horizontal sur téléphone |
| Scénarios A–J sur ordinateur et téléphone | **non exécutés** (sur votre demande) |
| Parcours navigateur 12A, éditeur publicitaire, export CMS | **non rejoués** sur la branche de migration |

Le nouveau fichier `tests/migration-v2.test.ts` vérifie :
- logo V2 dans la création complète, provisoire sans IA, jamais une piste V1, logo validé jamais remplacé ;
- jeu d'images orchestré par V2 ;
- calendrier sans doublon (projet neuf, reprise, ancien projet) ;
- anciennes routes fermées ;
- ancien point d'accès des publications sans contournement ;
- texte SEO V2 de référence, la modification du client étant celle qui s'affiche ;
- article de blog du client protégé.

Tests existants adaptés au nouveau comportement voulu :
- `audit-ecrans` : vidéo V1 → 410, vidéo V2 → 200 ;
- `logo-v2` : versions du studio rangées à part ;
- `securite-post-audit` : la copie V2 est « à relire ».

Un test d'export CMS (« mêmes octets ») a échoué **une fois** sous la charge de la suite complète, puis est passé
3 fois sur 3 seul. Il n'est pas lié à la migration, mais il est à surveiller.

## 10. Risques résiduels

- **Coûts avec une vraie IA** : la création complète enchaîne désormais Logo V2 (relectures), Image V2 (photos en
  situation), 2 publicités V2, 2 vidéos V2 et une page SEO V2.
  - Chaque moteur a son plafond, et le budget du compte (40 % HT) reste la limite.
  - Le coût réel d'une création complète **n'a pas été mesuré** (aucun appel payant).
- **Qualité réelle avec IA** : Logo V2, Image V2, Ads V2 et Vidéo V2 n'ont été vérifiés qu'avec des fournisseurs
  simulés ou sans IA.
- **Kit de textes** : les accroches de mise en page viennent encore de l'ancien générateur ; un texte d'accroche peut
  donc différer du ton du document SEO V2.
- **Deux façons de choisir le style du site** (directions V1 et langages V2) coexistent dans l'onglet Boutique.
- **Envoi Shopify** : le contrôle CMS V2 est imposé, mais **aucun envoi réel** n'a été testé.
- **Tâches déjà en file** créées avant la migration (anciennes vidéos, calendriers, articles) : elles s'exécutent
  encore avec l'ancien moteur.

Fusion de la migration : **NON**. Validation du propriétaire : **EN ATTENTE**.
