# #301 vague 2 — requalification de l'interface sur la convergence #348 (`e2d8c8ed`)

Base : `codex/parity301-final-convergence` = `e2d8c8ed` (#348 avec toute sa lignée #326 → #338 → #348), aucun
cherry-pick. Toutes les recettes : stockage isolé, clés de fournisseurs vides, réseau hors boucle locale refusé,
comptes et projets fictifs, **0 appel fournisseur réel, 0 € dépensé**.

## 1. Recettes de Codex dans la coquille (Encre et Plein cadre)

Lanceur `scripts/syna-parite-shell.ts` (copie des recettes de Codex adaptée au panneau unique `#syna-panel`, Studio
compilé). Chaque mode couvre l'ordinateur (1440 / 1024 px) et le téléphone (390 / 360 px).

| Série | Encre | Plein cadre |
|---|---|---|
| 28 recettes de la CI de Codex | 28/28 | 28/28 |
| 7 recettes hors CI (contexte, choix, textes ciblés / acquis, mémoire, reprise `ui`) | 7/7 | 7/7 |
| Fichiers (#305), Contenus (#310), #292 (bascules Encre ↔ Plein pendant diff, erreur réseau, conflit) | ✓ | ✓ |

Premier passage : 5 échecs en Encre et 3 en Plein cadre, tous relancés une fois **au calme** et passés
(`preuves/relances.txt`, historique dans `resultats-historique.json`) :
- course de l'écran d'accueil « Passer » sous charge (voix, réutilisation / format des publications, marque — Encre) ;
- serveur interrompu pendant un `tsc` parallèle à court de mémoire (retouches — Plein) ;
- worker arrêté par erreur pendant une autre recette (thème — Plein) ;
- débordement horizontal mesuré juste après un changement de taille de fenêtre (marque — Plein) : **non reproduit**
  au calme avec le diagnostic `PARITE_DIAG=1` ;
- #292 : route de restauration compilée à la volée en mode développement > 30 s sous charge.
« knowledge-ui », périmée en vague 1, passe désormais dans les deux modes.

## 2. Nouveaux parcours rendus utilisables (PR d'interface, base #348)

| PR | Parcours | Recette | Corrections d'interface |
|---|---|---|---|
| #352 | Anciens projets (A1, lecture seule) : rangement / renommage gratuit d'un fichier (contrat #313) | 4/4 | les cartes étaient masquées sur tout projet en lecture seule |
| #354 | Demandes reçues : lister (contenu visiteur = donnée), désigner, marquer lue / traitée / non traitée (#308/#319) | 4/4 | carte complète ; message affiché une seule fois |
| #357 | Publicité : agrandir le titre (#347) + bibliothèque de prompts en lecture seule (#344) | 4/4 | « État du reçu : cancelled » → mots du client ; « x / w / font.size » et 212.16 → libellés et valeurs entières |

## 3. Phrases réelles : ce que SYNA fait vraiment

`tests/syna301-sondes-348.test.ts` (garde-fous permanents : aucune écriture sans accord, 0 appel IA) :
**1/16** phrases ouvrent une carte gratuite ; **14** finissent en « réflexion IA sur devis, aucun outil exécuté » ; la
phrase SEO est mal aiguillée. Le moteur local natif de Boutique fait **5** de ces phrases gratuitement (couleur du
titre, couleur de la section, ajout de section, annulation, changement de thème) : contraire à « moteur local
d'abord ». « Agrandis le titre » : refus sur **18/18** créations brutes du moteur V2. Liste priorisée et contrats
demandés : `DEMANDES-CODEX.md` (publiée dans #301).

## 4. Matrice commune (84 opérations)

`MATRICE-INTERFACE.md` : une ligne par opération de la matrice de Codex (`docs/syna-301/MATRICE-PARITE-301.csv`),
avec recette(s), Encre, Plein, statut et colonne « phrase réelle ».

| Statut interface | Opérations |
|---|---:|
| SYNA_OK (recette réussie dans les deux modes, dans le périmètre testé) | 52 |
| PARTIEL (publicité : marche seulement si le titre a de la place) | 1 |
| ABSENT (avec preuve) | 16 |
| BLOQUÉ connexion / consentement (publication réelle, campagne, domaine…) | 10 |
| NON_TESTÉ | 5 |

Lecture honnête : SYNA_OK veut dire « le parcours de la recette passe dans la coquille », pas « parité complète » —
la matrice de Codex garde ses statuts PARTIEL, et plusieurs SYNA_OK passent par un outil désigné et non par une phrase
libre (colonne « phrase réelle »). Trois lignes (demandes, anciens projets, publicité) sont prouvées sur les branches
des PR #352, #354 et #357, pas encore dans #348.

## 5. Non vérifié

Aucune publication réelle, aucun fournisseur réel, aucune vraie boutique ; NON_TESTÉ : `images.search`,
`blog.edit`, `native.seo.metadata-only-delivery`, `native.stock.patch-target-version`, `native.files.classify`.
