# L'inventaire du code en trois piles

Étape 2 de la méthode acceptée le 14 novembre 2026 (`LE-STUDIO-DE-A-A-Z.md`, partie 12). **Version 1 du 15 novembre
2026, à valider par le propriétaire. Rien n'a été modifié dans le code.**

Comment il a été fait : cinq lectures séparées du dépôt, une par grande partie (SINA, anciennes façons de créer, site,
communication, fondations), en lecture seule : recherche de texte, lecture de fichiers, comptage. Aucun test lancé,
aucun écran ouvert, aucun appel payant. Les cinq rapports détaillés, avec les chemins des fichiers, sont dans
`docs/studio/inventaire/` (`1-sina.md` à `5-fondations.md`). Page en ligne pour le propriétaire :
https://claude.ai/artifact/WxwtnxCqQtPSYqkB2NSFRP.

Taille mesurée : environ 200 500 lignes dans `src/`, 706 fichiers de tests, 476 scripts, 3 594 documents (687 Mo) et
911 Mo de rapports.

## 1. Ce que l'inventaire montre

Les fondations sont saines. Le désordre vient d'ailleurs :

1. **Quatre portes d'entrée sur les mêmes moteurs** : les onglets, le Pilote, une première conversation (l'ancien
   agent) et SINA. SINA est fermée par défaut : sans un réglage du serveur, le client arrive sur les onglets et le
   Pilote.
2. **Plusieurs façons de faire chaque chose** (tableau de la partie 3).
3. **SINA n'est pas branchée sur les sorties.** Le pilote automatique des publications et l'envoi sur les réseaux
   tournent déjà en tâche de fond, mais SINA a son propre calendrier, manuel : les deux ne se rencontrent jamais. La
   mise en ligne d'un site de services existe, mais aucun outil de SINA ne l'appelle. Son thème sur mesure est un
   second moteur, à côté du moteur des thèmes, qui est le seul à atteindre Shopify, WooCommerce, PrestaShop et
   l'hébergement.
4. **Presque rien n'a été essayé pour de vrai**, à part la création de la marque.

## 2. Les trois piles

### Pile A : on garde tel quel

| Quoi | Où | Taille |
|---|---|---|
| Comptes, connexion, sessions | `src/lib/auth.ts`, `password.ts`, `registration.ts` | ≈ 620 lignes |
| Base de données | `src/lib/db.ts` | 1 434 lignes, 129 tables |
| File des tâches de fond (mise en file, reprise, jamais de relance seule d'un appel payant) | `worker/index.ts`, `src/lib/jobs.ts`, `job-recovery.ts` | ≈ 670 lignes |
| Réglages et clés chiffrées | `settings.ts`, `secrets.ts` | 156 lignes |
| Portes des appels à l'IA : réservation, comptage, plafond, trace | `src/lib/ai/` (cinq portes), `orchestrator/{router,policy,capabilities,history,text-routing}.ts` | ≈ 9 700 lignes |
| Moteur des thèmes : décrire, compiler, afficher, retoucher, désigner un élément | `src/lib/theme/` (cœur), `theme-base/` | 20 000 lignes, 354 sections |
| Les 15 thèmes du Studio, leurs démonstrations, le montage d'un thème à la marque par SINA | `theme-demos.ts`, `public/demo/`, `public/theme-assets/`, `syna-agent/studio-brand.ts` | 294 Mo d'images |
| Export vers Shopify, WooCommerce, PrestaShop | `src/lib/cms-v2/`, `integrations/shopify.ts` | ≈ 2 100 lignes |
| Hébergement des sites de services : publication, adresses, domaines, demandes | `src/lib/sites/` | 1 526 lignes |
| Catalogue, stock, connecteurs ; rendez-vous, réservations, biens | `src/lib/products`, `rendez-vous.ts`, `salon/`, `cabinet/`, `restaurant/`, `biens.ts` | ≈ 3 000 lignes |
| Connexion des comptes de réseaux et envoi par les accès officiels | `src/lib/social/` | 643 lignes |
| Programmation des publications : accord, verrou, journal | `social-v2/{scheduler,approval,networks,platforms,quality}.ts` | ≈ 1 100 lignes |
| Mise en page à calques modifiable (la seule brique proche de Canva) | `src/lib/ad-doc/`, `ad-editor/` | ≈ 4 000 lignes |
| Vidéo : rendu, voix, musique, sous-titres, contrôles ; banques libres de droits | `video-v2/` (rendu, audio, contrôles), `stock/`, `media/` | ≈ 12 000 lignes |
| Moteurs réutilisés par SINA : thème, moteur sans IA, images, lecture d'un site, angles, logos, charte | `engine/{shop,local,images,blog,site-import…}`, `marketing-strategy/`, `preparation/` (réduit), `logo-v2/` (sept fichiers), `quality/`, `contenus/`, `brain/` | ≈ 20 000 lignes |
| Le fil de SINA : message, choix des outils, carte d'accord avant dépense, coût réel | `syna-agent/{loop,store,thread,budget,registry,attachments,snapshot}.ts` | ≈ 1 300 lignes |
| La chaîne de la marque : étude, équipes de noms, juge, planches, images, domaines | `syna-agent/brand-*.ts`, `tools/identity.ts` | ≈ 3 100 lignes |
| Le savoir de SINA : cahiers de métier, 1 072 références de sites, 250 modèles de publications | `docs/sina-savoir/` (lu par le code) | — |
| Étapes sans IA de SINA : départ, charte, activité, catalogue, offres | `syna-agent/{brand-kit,activity}.ts`, `tools/start.ts` | ≈ 1 150 lignes |

### Pile B : on reconstruit ou on rebranche, une seule façon

| Quoi | Ce qui ne va pas aujourd'hui | Ce que ça devient |
|---|---|---|
| Le parcours et les consignes de SINA (`prompt.ts`, `journey.ts`) | 14 étapes, 15 questions fixes, consignes pleines de notes d'essais et d'exemples tirés des projets d'essai | Les 9 étapes du document de référence, toutes ouvertes, des questions libres, des consignes sans aucun exemple d'essai |
| La conversation de SINA (`conversation.ts`, `modelFor`) | Petit modèle aux étapes 0 à 5 et 8 ; trois aides construites mais éteintes ; la relectrice est plus faible que celle qu'elle relit ; l'étape 0 répond sans IA | Le modèle le plus fort partout où elle décide, conseille ou juge ; aides allumées ; relectrice au bon niveau |
| Le vocabulaire du client | Aucun outil de SINA ne l'enregistre | SINA l'enregistre dès qu'il est corrigé |
| Le logo (`logos.ts`, `tools/logo.ts`) | Cinq façons ; l'une dit encore « pars de ce dessin » (le défaut de la vague de Pulpe) | Une seule : le logo créé par OpenAI pour la marque, avec le nom dessiné en secours |
| Les angles (`angles.ts`, `preparation/`) | Posés sur le moteur du Pilote | Les trois angles, avec la méthode acceptée (stratèges séparées, juge à part) |
| Le thème sur mesure (`syna-agent/custom-theme/`, 6 843 lignes) | Second moteur : son modèle, son rendu, sa désignation et son annulation en double ; il ne peut pas être mis en ligne pour un site de services ; vers Shopify, un fichier à importer seulement | Reconstruit sur le moteur des thèmes : les 95 sections à tenue deviennent des sections du moteur ; spécialistes et cahiers gardés |
| Les publications (`posts-plan.ts`, `social-v2/production.ts`, `ai-post.ts`, `autopilot.ts`) | Le plan de SINA (stratège, juge) ne rejoint pas le pilote automatique ; le pilote écrit ses textes par gabarits et ne crée aucune image par défaut ; le texte est écrit dans l'image | Une seule chaîne : stratège et juge, image par OpenAI, mise en page par le Studio, calendrier, pilote automatique, envoi |
| Les publicités (`ads-v2/`, étape 10) | Construit, jamais essayé | Rebranché sur SINA, préparation et guidage |
| Les vidéos, côté création (`video-v2/engine.ts`, `three-scenes.ts`) | Deux façons de créer, fournisseurs « écrits, non vérifiés » | Une seule, en dernier lot |
| Les articles (`seo-v2/`, `engine/blog.ts`) | Deux moteurs | Un seul |
| Les images hors publications (`image-v2/`) | Troisième façon de créer une image (« banque d'abord ») | Une seule porte de création d'image |
| Les écrans du projet (onglets Marque, Stratégie, Boutique, Images, Vidéos, Publications, Calendrier, Publicités, Blog) | Chacun lance ses propres créations payantes ; ils vouvoient, SINA tutoie | Écrans pour voir, valider, régler et télécharger ; la création passe par SINA |
| L'enveloppe des tâches (`orchestrator/{execute,planner,intent…}.ts`) | Enveloppe 30 tâches ; SINA passe dedans sans le savoir | Simplifiée, gardée tant que les moteurs en dépendent |
| Forfaits et budget (`plans.ts`, `billing.ts`, `plan-gates.ts`, `quotas.ts`) | 49, 89, 129 € ; 40 % tout le temps ; 1, 3 et 5 publications par jour ; aucun nombre de vidéos par mois ; campagnes 0, 0, illimité | 69, 99, 169 € ; 50 % le premier mois ; 1, 2, 3 publications ; 0, 3, 6 vidéos ; 0, 1, 2 campagnes ; options |
| Appels à l'IA | Le choix des modèles est écrit à cinq endroits ; aucun travail en différé | Un seul endroit pour les modèles ; travail en différé à moitié prix pour le travail de fond |
| La mémoire du projet (`brain/`, `client-wording.ts`) | Deux mémoires voisines | Une seule |
| Les contrôles automatiques avant fusion (`.github/workflows/ci.yml`) | Une trentaine d'étapes vérifient l'ancien agent | Vérifient ce qui reste |

### Pile C : on supprime ou on archive

| Quoi | Où | Taille |
|---|---|---|
| La première conversation (l'ancien agent), ses 25 routes, ses 13 tâches **(retiré au lot 1)** | `orchestrator/conversation/`, `api/studio-agent/`, `conversation-*.tsx` | ≈ 7 900 lignes, 129 tests, 83 scripts |
| Le Pilote, la création en dix étapes, « dites en une phrase » **(retiré au lot 1)** | `engine/pipeline.ts`, `workflow/index.ts`, `tab-pilote.tsx`, `workflow-panel.tsx` | ≈ 2 200 lignes |
| Les écrans de préparation et le formulaire de création **(retiré au lot 1)** | `tab-preparation.tsx` et voisins, formulaire de `home.tsx` | ≈ 2 600 lignes |
| La bibliothèque de consignes avec appel direct à l'IA | `tab-prompts.tsx` | 264 lignes |
| L'ancienne création de marque en un appel et les anciens logos | `syna-agent/identities.ts`, `engine/{brand,identity,logo-job,full-logo…}.ts`, une partie de `logo-v2/` | ≈ 4 200 lignes |
| L'illustratrice en dessin (encore payée à chaque planche, plus montrée) | `brand-art.ts`, `brand-art-review.ts` | 255 lignes |
| Les maquettes en image et en code | `syna-agent/mockup-code/` | 4 316 lignes |
| L'autre « thème entièrement sur mesure » et le site générique sans thème | `engine/custom-theme.ts`, `theme-v2/` | ≈ 2 500 lignes |
| Les 30 anciens thèmes | `theme/directions.ts`, `theme-catalog.ts` | ≈ 2 300 lignes |
| Les 208 anciennes sections et leur atelier | `public/sections/library.*`, `scripts/sections-library.py`, `builder.ts`, `blank.ts`, `starters.ts` | 1,2 Mo et 15 Mo de photos |
| Le calendrier manuel de SINA | `syna-agent/calendar.ts`, `tools/calendar.ts` | 669 lignes |
| L'ancien calendrier, les anciennes vidéos, les « 20 créations » du départ (les « 20 créations » retirées au lot 1) | `engine/{calendar,videos,ugc}.ts`, `social-v2/initial*.ts` | ≈ 2 400 lignes |
| Les outils de SINA qui relancent les anciennes façons | `brand.create`, `site.mockups`, `site.mockup_images`, `site.build`, `pilot.run`, `strategy.choose`, `project.create` | — |
| Huit tâches de fond que plus rien ne déclenche, et le code jamais appelé | `plan.run`, `stock.search`, `image.single`, `ugc.script`, `video.ugc`, `brand.fulllogo`, `calendar.plan`, `post.regenerate` | — |
| Les tests des anciennes façons | `tests/` | environ 200 fichiers sur 706 |
| Archives : rapports, documents de missions, anciens scripts de recette | `reports/`, `docs/coordination/`, `docs/syna-*`, `scripts/verify-*`, `syna301-*`, `agent211-*`… | 911 Mo, 687 Mo, environ 400 scripts |
| Les vieilles notes de `CLAUDE.md` | remplacées par des consignes courtes | — |

Total de la pile C, en additionnant les comptes des lectures : environ 30 000 lignes de code sur 200 000, soit à peu
près un septième, plus les tests et les archives.

## 3. Combien de façons de faire la même chose

| Chose | Façons aujourd'hui | Celle qu'on garde |
|---|---|---|
| Entrer dans un projet | 4 (onglets, Pilote, première conversation, SINA) | SINA |
| Créer la marque | 4 | La chaîne de SINA |
| Faire un logo | 5 | Le logo créé par OpenAI pour la marque |
| Fabriquer un site | 9 | Le moteur des thèmes, avec deux points de départ : un thème du Studio, ou le sur mesure |
| Tenir un calendrier | 3 | Le programmateur relié au pilote automatique |
| Créer une image | 3 | Une seule porte, par OpenAI |
| Poser le texte sur une image | 3 | À trancher avec le propriétaire (partie 6) |
| Créer une vidéo | 3 | Une seule (dernier lot) |
| Écrire un article | 2 | Un seul moteur |
| Parler au client | 2 portes | SINA |

## 4. Ce qui n'a jamais été essayé pour de vrai

- L'envoi d'une publication sur un vrai compte de réseau (Instagram, Facebook, TikTok, YouTube et Pinterest sont
  écrits ; LinkedIn et la fiche Google n'existent pas).
- L'envoi d'un thème dans une vraie boutique Shopify ; WooCommerce et PrestaShop n'ont été installés qu'en local.
- La mise en ligne publique d'un site de services (le rapport parle d'un prototype essayé en local ; le sous-domaine du
  Studio est éteint).
- Les vidéos créées par IA, les publications et les publicités créées par le Studio, les étapes 9 à 13 de SINA.
- Le thème sur mesure à tenue, ses spécialistes, les trois angles avec leur juge.

## 5. Ce qui gêne, trouvé en lisant

1. Des exemples des projets d'essai sont envoyés à l'IA : les noms des infusions (Pulpe, Zeste, Tintamarre…) dans les
   consignes des noms, « Éclat de thé », le fourgon de toilettage et « Pelage » dans les consignes des images, une
   maison de thé d'exemple dans les textes des 95 sections. Une accroche d'exemple a déjà été gardée mot pour mot dans
   un essai : c'est le même défaut que la vague de Pulpe.
2. SINA garde un outil qui relance l'ancienne création de marque à « 3 pistes de logo ».
3. Dans l'interface classique, le bouton « SINA » ouvre l'ancien agent (lu dans le code, pas essayé).
4. « Réanalyser le produit » relance la marque, les textes et les images avec une simple confirmation, sans prix.
5. Des pages annoncent encore « Les 30 thèmes » et « cinq propositions ».
6. Les réglages s'appellent tantôt `sina.`, tantôt `syna.`.
7. 118 des 185 enregistrements de la branche portent une signature qui nomme un modèle d'IA, contre la règle (les
   derniers n'en ont plus). L'historique n'est pas réécrit sans accord ; une fusion regroupée les ferait disparaître de
   la version principale.

## 6. Les choix de Claude

Tranchés (métier) :

1. **Un seul moteur de site.** Le sur mesure est reconstruit sur le moteur des thèmes. Raison : c'est le seul chemin
   vers les quatre sorties, et il évite d'entretenir deux fois les retouches et « Désigner un élément ».
2. **Rien n'est supprimé avant que ce qui le remplace soit prouvé.** Chaque lot retire les anciennes façons de son
   domaine, à la fin, une fois l'essai réel réussi.
3. **Le ménage sans risque d'abord** : archives, code jamais appelé, tâches sans déclencheur, consignes courtes.
4. **Les projets d'essai sortent des consignes.** Les goûts du propriétaire restent, écrits en règles générales, sans
   nom de projet.

À faire valider par le propriétaire au moment du lot concerné (cela touche une de ses règles) :

- Publications : image créée par OpenAI sans texte, puis texte et logo posés par le Studio, lettres exactes et
  retouchables d'un mot (comme sur l'essai de Pulpe qu'il a validé). Aujourd'hui le texte est écrit dans l'image.
- Reproduire le site existant d'un client, et importer son thème Shopify : gardés ou retirés.

## 7. L'ordre des lots proposé

Chaque lot se termine par un essai réel où SINA travaille seule ; son budget se décide juste avant.

0. **Ménage sans risque.** Aucun changement visible, aucun coût d'IA.
1. **SINA, une seule porte.** Sa conversation, ses questions, son parcours en 9 étapes, ses consignes nettoyées.
2. **La marque.** Une seule façon, logo compris ; images complètes pour la seule identité choisie ; travail en différé.
3. **Les trois angles.**
4. **Le site.** Le thème unique (en-têtes, pieds de page, pages, sections, familles) et les six premières
   démonstrations (référence, partie 15) ; modifier en cliquant sur n'importe quel élément de l'aperçu, pour chaque détail des sections
   (obligatoire, référence partie 15) ; sur mesure sur le moteur des thèmes ; mise en ligne des sites de services par SINA ; transfert vers
   Shopify, WooCommerce et PrestaShop essayé sur de vraies boutiques d'essai.
5. **Les publications automatiques.** De la stratège à l'envoi sur les réseaux ; « Envoie une photo, SINA fait le reste » ;
   les grands moments de l'année ; la fiche Google et les avis (référence, partie 14).
6. **Les forfaits.** Les trois prix, 50 % le premier mois, les quotas, les options.
7. **SINA prend les devants.** Le point du mois avec de vrais chiffres, le site qui s'améliore, les grands moments
   préparés d'elle-même (référence, partie 14 : chaque engagement fait entièrement, condition du propriétaire).
8. **Les publicités.**
9. **Les vidéos.**

## 7 bis. Le lot 0 mesuré (15 novembre 2026, sans rien modifier)

Réponse du propriétaire à « y a-t-il de vrais clients ou de vrais projets dans le Studio en ligne ? » : « On s'en
fiche ». Donc aucune précaution de lecture n'est due aux anciens projets : une ancienne façon se retire en entier
quand son lot arrive.

Ce que le lot 0 contient, après mesure :

1. **Archives sorties du dépôt** (elles restent dans l'historique) : `reports/` (911 Mo, 3 382 fichiers),
   `docs/coordination/` (352 Mo, 1 769), `docs/preuves/` (38 Mo, 288), `docs/fusion/` (59 fichiers), les 18 dossiers
   `docs/syna-*` (54 Mo, 649), et à la racine `ARVEN_PUBLICITE_VIDEO`, `ARVEN_VIDEO_WAN26`, `SONORE_VIDEO_WAN`,
   `PAYSAGISTE_VIDEO`. Environ 1,36 Go et 6 150 fichiers. Neuf fichiers de tests lisent ces dossiers : à retirer ou à
   corriger dans le même lot.
2. **Code que plus rien n'appelle** : les huit tâches de fond sans déclencheur et les fichiers sans importeur relevés
   par les lectures, vérifiés par la compilation et la suite de tests.
3. **Consignes courtes** : `CLAUDE.md` réduit aux règles permanentes et au renvoi vers `docs/studio/` ; les notes
   datées déplacées dans `docs/archives/`.

Ce qui sort du lot 0, contrairement à la première idée : les anciens scripts de recette (170 fichiers `verify-*`,
`syna301-*`, `parity301-*`, `agent211-*`, `lot1*`, `lot2*`, `mission*`, `benchmark-*`). 37 fichiers de tests les
lisent et 49 des 53 étapes des contrôles automatiques les lancent : ils vérifient l'ancien agent, donc ils partent
avec lui, dans le lot 1.

## 7 ter. Le lot 0 fait (15 novembre 2026)

- **Archives sorties du dépôt** : 6 308 fichiers ; le dépôt (hors historique) passe de 2,2 Go à 764 Mo. Gardés parce
  que des tests les lisent : `tests/fixtures/logo-openai/`, `tests/fixtures/lot2a/`, et
  `docs/BIBLIOTHEQUE_SECTIONS_COUVERTURE.md`. `reports/` n'est plus versionné.
- **Consignes courtes** : `CLAUDE.md` passe de 815 à 132 lignes ; l'ancienne version est dans
  `docs/archives/CLAUDE-2026-11-15.md`.
- **Code que plus rien n'appelle** : deux fichiers retirés seulement (`src/components/studio/palette-picker.tsx`,
  `src/lib/syna-agent/mockup-code/index.ts`). La vérification fichier par fichier a corrigé l'inventaire : les huit
  tâches de fond « sans déclencheur » sont encore citées par l'enveloppe des tâches (`orchestrator/intent.ts`,
  `execute.ts`), par `jobs.ts` et par une dizaine de fichiers de tests ; les autres fichiers « orphelins » ont chacun un
  test, et certains (`image-v2/text-layer.ts`, `plates.ts`) peuvent resservir à la mise en page des publications.
  Tout cela part ou se décide avec le lot de son domaine, pas avant.
- **Vérifié** : compilation sans erreur ; suite complète après la sortie des archives : 703 fichiers de tests passés
  sur 706, 2 ignorés, 1 en échec (6 833 tests passés, 1 échec, 6 ignorés ; 29 minutes). L'échec
  (`tests/theme211-render-evidence.test.ts`) vient de la machine de travail : le test impose un navigateur à
  `/usr/bin/chromium`, absent ici ; il est resté après le lot 1, car il vérifie le rendu du thème, que SINA utilise. Les deux fichiers retirés ensuite
  n'ont ni importeur ni test : la compilation a été relancée, pas la suite.

## 7 quater. Le lot 1 fait (15 novembre 2026)

- **SINA, une seule porte d'entrée** : un projet ne se crée plus qu'en parlant à SINA. Compte rendu complet, essais
  réels et ce qui reste : `docs/studio/LOT-1-SINA-UNE-SEULE-PORTE.md`.
- **Retirés de la pile C** : l'ancien assistant (`orchestrator/conversation/`, `api/studio-agent/`, ses écrans, ses
  tâches `agent.*`), le Pilote et la demande en une phrase (`tab-pilote.tsx`, `workflow-panel.tsx`, `workflow/index.ts`),
  la création en dix étapes (`engine/pipeline.ts`, tâches `pipeline.run`, `workflow.run`, `plan.run`), le formulaire de
  création (`home.tsx`, création par `POST /api/projects`), les écrans de préparation (`tab-preparation.tsx` et
  voisins), les « 20 créations du départ » (`social-v2/initial*`), l'ancienne interface (`StudioShell`, `syna-dock.tsx`,
  `syna-ui/studio-shell.ts`). Environ 600 fichiers et 40 000 lignes en moins.
- **Gardés pour leur lot** : le moteur de préparation (SINA s'en sert pour les angles ; huit de ses fonctions n'ont
  plus d'appelant, à revoir au lot 3) ; `orchestrator/` réduit à l'enveloppe des tâches ; la reproduction d'un site
  existant (`site-reproduce.ts`) ; le prix « création complète » (lot 6) ; les outils `pilot.*` de SINA.
- **Tables sans usage, non supprimées** : `workflows`, `agent_conversation_photo_imports`, `agent_conversation_quotes`,
  `agent_conversation_turns`, `agent_request_bounds`, `agent_request_jobs`.
- Les chemins des fichiers retirés restent cités plus haut et dans `docs/studio/inventaire/` : c'est l'état d'avant
  les lots 0 et 1, gardé comme référence.

## 7 quinquies. Les lots 2 et 3 faits (16 novembre 2026)

- **Lot 2, la marque** : compte rendu et retraits dans `docs/studio/LOT-2-LA-MARQUE.md`.
- **Lot 3, les trois angles** : une seule façon (la chaîne de SINA : types de clients, trois stratèges séparées, juge à
  part, lecteur qui ne sait rien ; leçon `docs/sina-savoir/angles-marketing.md`). Retirés : les outils `pilot.*`,
  `strategy.read`, `research.read`, `strategy.choose`, l'ancien écran des cinq angles, la recherche et les révisions
  payantes de la route `/marketing-strategy`, l'ancien juge. Gardés pour leur lot : le moteur de préparation (lot du
  site), le rangement de l'angle actif `marketing-strategy/` et le sélecteur d'angle des publications. Détail :
  `docs/studio/LOT-3-LES-TROIS-ANGLES.md`.

## 7 sexies. Le lot 4 en cours (16 novembre 2026)

- **Correction de l'inventaire** : les pièces du thème unique existaient déjà (95 pièces qui prennent l'allure de la
  marque), ainsi que leur chaîne et leur pont vers le moteur des thèmes ; « modifier en cliquant » existait pour les
  sites montés par SINA, dans l'onglet Boutique. Le lot part donc de l'existant au lieu de réécrire.
- **Construit** : une seule façon de faire le site (`site.create`, tâche `syna.site`), un seul accord ; plus de question
  de thème, de famille ni de concept ; le site validé devient la version active du moteur des thèmes ; le clic sur
  l'aperçu désigne tout de suite. Les anciennes façons ne sont plus proposées à SINA ; elles restent dans le code
  jusqu'à l'essai réel. Détail : `docs/studio/LOT-4-LE-SITE.md`.

## 8. Non vérifié

- La suite de tests n'a pas été lancée ; « code jamais appelé » repose sur une recherche de texte.
- Le nombre de vrais projets ou de vrais clients dans le Studio en ligne : aucune base de données n'est lisible ici.
- Les réglages réels du serveur en ligne (seuls les réglages par défaut du code ont été lus).
- Si les applications auprès de Meta, TikTok, Google et Pinterest sont créées et validées.
- Le total de la pile C est une addition des comptes des cinq lectures, pas une mesure exacte.
