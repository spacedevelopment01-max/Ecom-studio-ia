# #301 « SYNA complète » — point de reprise (Claude)

Consignes : #301 commentaires 6618265320 et 6618279690. **SYNA n'est pas complète** ; aucune fusion `main`, mise en
ligne, activation, action externe réelle ni dépense fournisseur.

## Branche et base

- Branche Claude : `claude/syna-301-complet` (PR brouillon #369), partie de #363 `f25a7290`.
- Intègre par fusion, sans les modifier : #364 (`958a4dde`) puis la chaîne #365 → #366 → #367 → #368 → #370 de Codex
  (`e1ba2542`), l'image `73c8865a`, puis #373 → #374 (`d315af5e`), #375 → #376 (`cf159b91`), #377 (`2da4884f`), la pile #378 → #387 (`9c9efda6`, convergence Codex #383 incluse), le correctif CI #385 (`df4fce02`), #388 → #392 (`9f40fb52`) le correctif des projets préparés + corbeille #393 (`a593e6ea`), #395 (`cb383590`), #396 (`506735a7`), #397 → #399 (`f7b26159`) la convergence #401 (`e7452632`, #400 inclus) #402 (`5950fc2c`, dossiers des anciens projets) et #403 → #407 (`f3ca45bb` : prompts A1, phrases du profil et du Stock, photos sur projet préparé), puis #408 → #413 (`3b54dfbe` : services réservables en lecture, corbeille de la Banque Images, correctif du test des prompts #411 qui rendait la CI rouge sur `bdba24fe`).

## Fait et vérifié

| Lot | Contenu | Preuve |
|---|---|---|
| 1 — confirmation périmée | transports des 5 cartes (#364 Codex) ; crochet d'interface `use-stale-confirmation.ts` sur les 8 cartes : relecture seule **uniquement** si l'accord en mémoire vise une autre proposition (une réponse perdue pour la proposition affichée garde « Vérifier » / « Réessayer », exigés par le contrôle obligatoire) | 18 tests indépendants + test d'interface ; recettes navigateur Fichiers 4/4, Contenus 4/4 (plats, biens, réalisations), Demandes reçues 4/4 et Publicité 4/4 (titre redésigné dans l’éditeur) ; contrôle obligatoire vert en CI sur `04d881ee` |
| 2 — contraste | moteur #365 (Codex) + règles CSS des cartes « verre » et textes atténués (Claude) ; ma surcouche `theme.liquid` retirée (mesure identique, respect des couleurs demandées) | mesure navigateur 199 → 6 sous 4,5:1 ; Theme Check rapide valide |
| 2 — SEO | carte « Retouche SEO gratuite » (contrat #367) | recette `scripts/syna301-seo-pages-recette.ts` 4/4 : titre relu dans l'onglet de la page, annulation sans écriture |
| 3 — Pages | carte « Pages du site » (contrat #370) : modèles natifs avec aperçu, « Choisir » remplit la phrase du client | même recette 4/4 : page relue dans la version enregistrée |
| 2 — Horaires naturels | carte Horaires existante sur le contrat #366 : « Change les horaires du mardi… » → clarification profil / créneaux sans devis ; « Les horaires du profil sont : … » → avant / après, accord, reçu | recette `scripts/syna301-horaires-recette.ts` 4/4 : champ Horaires de l'écran Activité relu sans recharger, puis après rechargement |
| 3 — Masquer une section | carte du site (#368) ; après le reçu, message « Section masquée : elle n'est plus désignée » au lieu de l'alerte « cible changée » | même recette 4/4 : seule la section visée change |

| 3 — Pages et sections | créer avec modèle, renommer, refus honnête du menu pour un brouillon (sans liste de modèles hors sujet), retirer une page publiée du menu, dupliquer, supprimer une page ; supprimer une section | recette `scripts/syna301-pages-sections-recette.ts` 4/4 : titre et menu relus dans la version, page supprimée absente, seule la section visée supprimée, carte sans alerte trompeuse |

| 3 — Texte de bouton | bouton désigné dans l'aperçu (ordinateur) ou par repère repris (téléphone) ; libellé « Élément désigné : Bouton · … » au lieu de « Page désignée : undefined » | recette `scripts/syna301-bouton-recette.ts` 4/4 : libellé relu en base et dans le bouton rendu, lien et autres sections inchangés |

| 1 — Site / changement de projet | garde « conversation + projet courants » sur le transport Site (comme #364 sur les cinq autres) | `tests/syna301-site-changement-projet.test.ts` rouge puis vert |
| Relecture automatique | second bouton natif `button2_label` reconnu (section à deux boutons = demande laquelle) | `tests/syna301-bouton-second.test.ts` rouge puis vert |

État de Codex (04/11, ~00 h 52 UTC) : environnement d'exécution indisponible, point de reprise publié sur
`codex/parity301-continuous-matrix-v2` (`docs/syna-301-integration/POINT-REPRISE-CONTINU.md`), matrice cumulative portée à
162 unités avec les omissions. Sa convergence `827795d0` (ancienne tête Claude `30f67e6c`) ne doit pas être fusionnée.

| 3 — Image d'une section | contrat Codex `73c8865a` (image existante du projet) ; miniatures avant / après dans la carte Site | recette `scripts/syna301-image-recette.ts` 4/4 : champ pointant sur l'image choisie, pixels de l'aperçu enregistré identiques, aucune autre section ni fichier modifié |

| 3 — Stock | carte « Stock — gratuit » (contrat #373) ; correctif : le moteur lit la désignation envoyée avec la phrase (« Désigner pour SYNA » du Catalogue) | `tests/syna301-stock-designation-message.test.ts` rouge puis vert ; recette `scripts/syna301-stock-recette.ts` 4/4 : stock relu, prix / référence / politique inchangés, Catalogue à jour |
| 3 — Prestation | carte Horaires adaptée au champ `service-name` (#374) : liste des prestations, « Renommer » remplit la phrase | recette `scripts/syna301-prestation-recette.ts` 4/4 : nom relu, autres champs et prestation voisine inchangés |
| 3 — Calendrier, Thème | cartes « Calendrier — gratuit » (dates avec fuseau) et « Thème du site — gratuit » (deux vrais aperçus, aucun accord si le moteur refuse) ; verrou commun 11 cartes | tests `syna301-calendrier-theme-cartes`, `syna301-phrases-ecrans-naturels` (16/16 phrases gratuites) ; recettes `syna301-calendrier-recette.ts` et `syna301-theme-recette.ts` : voir l'état ci-dessous |

| A1 — Prompts des anciens projets (#403) | `handlesLocalPrompts` sur `localReadAllowed(view,'prompts')` ; réglage `EXISTING_PROMPTS_READ` fermé par défaut | même recette A1 : « Affiche ma bibliothèque de prompts » → lecture seule sans bouton, 4/4 |
| A1 — Dossiers des anciens projets (#402) | cartes Renommer / Déplacer un dossier sur `localEditAllowed(view,'folder-rename'|'folder-move')` ; réglages serveur `EXISTING_FOLDER_RENAME` / `EXISTING_FOLDER_MOVE` **fermés par défaut** (ouverts seulement dans la recette) | `RECETTE_A1_DOSSIERS=1 scripts/syna301-anciens-projets-recette.ts` 4/4 : nom puis parent relus, projet toujours en lecture seule, aucune Préparation |
| 7 — Renommer / déplacer un dossier, phrases Fichiers naturelles, prompts sur projet préparé | cartes « Renommer un dossier » (#398) et « Déplacer un dossier » (#400), distinctes de « Nouveau dossier », `handlesLocalPrompts` sur `nativeLocalEditAllowed` (#396), phrases sans guillemets (#397, aucune carte à changer) | recette `scripts/syna301-lot7-recette.ts` **4/4 sur projets préparés** : nom du dossier relu (même identifiant, même parent), dossier déplacé dans « Archives » (parent relu, nom conservé), fichier renommé par une phrase polie (octets inchangés), prompts en lecture seule sans bouton |
| 6 — Prix, durée, description des prestations ; dialogue dossier ; corbeille | carte du profil élargie (#390 → #392), dialogue dossier (#389, question sans accord), carte Corbeille (#393) | recette `scripts/syna301-lot6-recette.ts` 4/4 (projet neuf) ; corbeille : recette `scripts/syna301-corbeille-recette.ts` 4/4 sur projets préparés + 1 neuf |
| 5 — Animations, versions, dossier, photo, coordonnées | cartes #379 / #382 / #387, carte du profil élargie (#384 : téléphone, e-mail, zone), import de photo dans le composeur (#378, « importée, non analysée », jointe explicitement au message suivant) ; verrou commun 14 cartes | recette `scripts/syna301-lot5-recette.ts` **4/4** (5 étapes chacun : réglage relu, restauration relue, dossier relu à la racine, photo jointe au message suivant via `photoIds`, téléphone relu) ; lancer un cas à la fois (`RECETTE_CAS=encre-telephone`) : à quatre cas d'affilée, le conteneur tue le serveur de développement par manque de mémoire |
| 8 — Services réservables (lecture), corbeille depuis Images | carte « Services réservables — lecture seule » (#408 : liste bornée à 20, durée, prix, « à partir de », mode démonstration ou en ligne, lien vers Rendez-vous, aucun bouton) ; carte Corbeille adaptée à Images (#409 / #413 : phrase « Restaure l’image… », lien « Voir dans Images », lien inconnu jamais affiché) ; réglage `STUDIO_CONVERSATION_BOOKING_READ` fermé par défaut | tests `syna301-services-reservables-carte` (5) et `syna301-corbeille-images-carte` (2) ; recette `scripts/syna301-lot8-recette.ts` **4/4 sur projets préparés + 2 neufs** (Encre / Plein × ordinateur / téléphone) : mêmes services que la réservation native, aucun bouton, aucune écriture ; seule l'image listée depuis Images, accord, mêmes octets, image revenue dans la Banque après rechargement ; 0 appel IA. Défaut trouvé et corrigé : sur téléphone, le tableau des réservations (640 px) élargissait toute la page Rendez-vous et rendait le bouton « Syna » inaccessible (3/3 en échec avant, 3/3 réussis après ; `tests/syna301-rendez-vous-mobile.test.ts`). Retour de Codex corrigé : badge de format de la Banque Images (640 × 480 annoncé « 16:9 », désormais « 4:3 », `src/lib/aspect-label.ts`) |

## Reste à vérifier ou à faire (ordre proposé)

0. **Projets préparés — résolu côté contrat (Codex `a593e6ea`) et cartes alignées (`2497fea3`)** : `readOnlyReason` reste
   réservé à la fiche ; `localEditsWritable` ouvre les retouches gratuites ; les cartes testent `nativeLocalEditAllowed`
   (Site / Fichiers : `localEditAllowed`, exception A1 inchangée). Test `tests/syna301-projet-prepare-cartes.test.ts`.
   Recettes rejouées sur projets préparés (`RECETTE_PREPARE=1`, pilotes `scratchpad/run-prepared.sh` et
   `run-reprises.sh`, un cas par serveur) : Stock 4/4, Calendrier 4/4, Prestation 4/4, lot 5 4/4, lot 6 4/4, Thème 4/4
   (produits compris), SEO / Pages 4/4, Corbeille 4/4 (+ 1 cas neuf). Lot 6 rejoué avec le nom de la prestation (#395) et
   une description réellement sur deux lignes. Import de photo : levé par #405 ; recette du lot 5 rejouée **4/4 sur projets
   préparés** (photo visible dans le fil, `conversationPhotos`) et 2 cas neufs (photo visible dans la fiche, nouveau bloc
   « Photos de votre fiche »).
1. Fait : recettes Calendrier 4/4, Thème services 2/2 (produits bloqués, voir 0), Bibliothèque (#377) 4/4
   (`scripts/syna301-bibliotheque-recette.ts` : liste depuis le Pilote, dossiers, photos, recherche exacte, « Désigner »
   puis renommage relu). Reste pour la bibliothèque : pièces jointes envoyées depuis la conversation et lecture d'image
   (non raccordées par Codex, à ne pas annoncer).
2. Manque signalé à Codex : aucune phrase ne publie une page brouillon ; champ explicite « choix du modèle » souhaité
   dans la présentation Pages ; choix du thème bloqué dès qu'une retouche manuelle ne se reporte pas (moteur natif).
3. Lot 3 restant : pièces jointes / bibliothèque ; réservation (au-delà du nom de prestation) ; variantes multiples
   dans la recette Stock.
4. Omissions de la matrice (`OMISSIONS-MATRICE.md`) à faire entrer dans la matrice commune de Codex.

## Relancer les preuves

```bash
NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit && npx vitest run
npx tsx scripts/syna301-seo-pages-recette.ts <sortie>             # navigateur, ~10 min
npx tsx scripts/syna301-{stock,prestation,calendrier,theme}-recette.ts <sortie>   # une à la fois (mémoire)
npx tsx scripts/syna301-confirmation-perimee-recette.ts <sortie>
DIRECTION=atelier BUSINESS=services npx tsx scripts/syna301-contraste-section.ts <sortie.json>
scripts/verify-theme.sh --rapide
# contrôle obligatoire : build à la tête puis scripts/verify-syna284-b1-confirmation-ui.ts (3 variantes) et
# STUDIO_PROOF_COMMIT=$(git rev-parse HEAD) scripts/verify-parity301-wave4-ui.ts (arbre propre)
```
