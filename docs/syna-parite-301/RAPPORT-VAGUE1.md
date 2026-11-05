# SYNA FULL PARITY (#301) — vague 1, côté interface (Claude)

Référence : PR #299 (`integration/syna-claude-codex-recette`), qui réunit main `37fcfd25`, la pile Codex jusqu'à #297, la
pile Claude jusqu'à #293 et le correctif #300. Deux branches de domaine s'appuient sur les PR de Codex :
- C24 Fichiers : `claude/syna-301-fichiers`, sur #305 ;
- C21 Contenus métier : `claude/syna-301-contenus`, sur #310.

**Aucune fusion, aucun déploiement, aucun fournisseur réel : coût IA 0.** Fournisseurs simulés en boucle locale (harnais
de Codex), comptes et projets fictifs.

## 1. Méthode
- `scripts/syna-parite-shell.ts` rejoue les **recettes navigateur de Codex** (`verify-agent211-*-ui.ts`) **dans la
  coquille**, en Encre puis en Plein cadre.
  - Recettes rejouées : les 29 de la CI, plus 7 hors CI (contexte, choix, mémoire, textes ciblés et acquis).
  - Seules adaptations : l'accès à SYNA (onglet de la coquille) et la fenêtre SYNA visible (`#syna-panel:visible`).
  - Toutes les assertions de Codex sont conservées, et aucun de ses fichiers n'est modifié (copies temporaires à nom
    unique).
- Chaque échec est classé en trois catégories :
  - défaut d'interface de la coquille : corrigé ici, avec un test ;
  - environnement : rejoué ;
  - recette ou moteur de Codex : signalé à Codex.
- Deux recettes propres à Claude, pour les cartes nouvelles :
  - `syna301-fichiers-recette.ts` ;
  - `syna301-contenus-recette.ts`.

## 2. Résultats (dernier passage de chaque recette, historique dans `resultats-historique.json`)

| | Encre | Plein cadre |
|---|:-:|:-:|
| Recettes de la CI de Codex (28 avec drapeaux) | **28 / 28** | **28 / 28** |
| Recettes hors CI (ui, context, context-manual, choices, targeted-copy, acquired-copy) | **6 / 6** | **6 / 6** |
| `knowledge-ui` (hors CI) | ✗ recette périmée | ✗ recette périmée |
| Carte Fichiers C24 (4 parcours, deux modes × ordinateur / téléphone) | ✓ | ✓ |
| Carte Contenus métier C21 (4 parcours) | ✓ | ✓ |
| Recette #292 (modifications gratuites, 17 s, bascules) | ✓ | ✓ |

Matrice par opération : `MATRICE-INTERFACE.md`, avec les 80 opérations de la matrice #302 de Codex :
- **50 SYNA_OK** dans les deux modes ;
- **0 partielle, 0 échec** ;
- **15 ABSENT** (aucun outil SYNA) ;
- **10 BLOQUE_CONNEXION_OU_CONSENTEMENT** (actes réels : publier, réserver, domaine, connexion, synchronisation) ;
- **5 NON_TESTE** : pièces jointes, `images.search`, `seo.update`, et deux contrôles moteur de Codex.

« SYNA_OK » prouve l'**interface** : le parcours SYNA aboutit dans la coquille, avec le fournisseur simulé, en Encre et
en Plein cadre. Il ne remplace pas la qualification moteur de Codex (devis, droits, P0 images encore ouverts côté Codex),
ni la qualité d'un fournisseur réel.

Captures :
- `captures/planche-encre.jpg` et `captures/planche-plein.jpg` : une vignette par recette ;
- `captures/<mode>-<recette>.jpg` : catalogue, images, logos, vidéos générées, publications, clôture.

## 3. Défauts d'interface trouvés et corrigés (avec test)

| # | Défaut | Où | Preuve avant | Correctif |
|---|---|---|---|---|
| 1 | Au téléphone, la barre de la coquille (z 95) recouvrait les fenêtres natives (z 90) : boutons « Confirmer » inaccessibles | Catalogue, Campagnes, Encre 390 px | `catalogue-ui` et `campaign-ui` en échec | `syna-shell.css` : barre 47, feuilles 46 (`41931a5e`) ; ensuite 28 / 28 |
| 2 | En Plein cadre à 1440 px, ouvrir ou replier SYNA **recréait l'aperçu du site** : page blanche, rechargement, défilement perdu. L'onglet Boutique rendait l'iframe dans deux branches selon l'agrandissement | Boutique | `composition-ui` 2 / 2, `context-ui` et `context-manual-ui` en échec (« Frame was detached ») | Une seule enveloppe stable (`e6dc89fd`) ; ensuite 3 / 3 en Plein cadre, Encre sans régression |
| 3 | Désignation d'un contenu métier affichée « version 1793660684564 » | Biens / Carte / Réalisations | capture de la recette C21 | « modifié le jj/mm/aa hh:mm » (branche C21) |
| 4 | Écran Fichiers : le fichier regardé n'était jamais transmis à SYNA ; la carte #305 était donc inutilisable | Fichiers | lecture du code | Désignation (fichier ouvert ou unique coché) + carte + relecture de la liste (branche C24) |
| 5 | Biens / Carte / Réalisations : aucun moyen de désigner un contenu, donc le moteur #310 était inutilisable | 3 espaces | lecture du code | « Désigner pour SYNA » + carte + relecture (branche C21) |

Restent ouverts (P2, non corrigés) :
- **En-tête Plein cadre au téléphone.** Au moment précis où l'écran passe de 1024 px à 390 px, la rangée d'outils de
  l'en-tête déborde pendant une image (506 px pour 390). C'est dû à la mise en page pilotée en JS (`useMedia`). Le
  défaut a été vu 1 fois sur 2 dans `brand-ui`, et aucun débordement n'apparaît à l'état stable (diagnostic
  `PARITE_DIAG=1`). Piste : passer ces bascules en CSS.
- **Messages en double.** Le message de SYNA s'affiche à la fois dans la carte et dans la bande d'information
  (comportement identique à la retouche gratuite de Codex).

## 4. Échecs d'environnement (rejoués, réussis)
- **Disque plein** pendant la série Plein cadre : `catalogue-ui` (`ERR_INSUFFICIENT_RESOURCES`). Place libérée, rejoué : ✓.
- **Navigateur de capture du serveur tombé** une fois (« Target crashed ») : `render-ui`. Rejoué : ✓.
- **Lanceur.** La fenêtre SYNA repliée reste présente, mais masquée : seule la fenêtre visible est désormais comptée.
  Par ailleurs, deux lanceurs en parallèle partageaient leurs copies : un préfixe unique a été ajouté.

## 5. À l'attention de Codex (moteur, recettes)
1. **`knowledge-ui` est périmée** : elle attend « Pas encore disponible » pour `theme.original`, alors que l'opération a
   maintenant un raccordement fermé. Le Studio affiche à juste titre « Raccordement désactivé ou verrouillé ». Échec
   identique en Encre et en Plein cadre, sans rapport avec la coquille.
2. **#305** : les commandes Fichiers ne passent pas par `withAiDisabled`, contrairement à la retouche gratuite du site.
   0 appel IA mesuré dans toutes nos recettes ; il s'agit d'une protection supplémentaire à envisager, pas d'un défaut
   constaté.
3. **#313** : la carte Fichiers et la retouche gratuite ignorent encore `recovery.localEdits`. L'adaptation est prévue
   côté Claude à la vague 2, sur votre contrat.
4. **#309** : la recette utilisateur Blog en Encre et en Plein cadre est prévue à la vague 2. La carte générique
   existante sera réutilisée, aucune nouvelle carte.

## 6. Tests exacts de cette vague
- **Branche #299** :
  - `tests/syna-integration-292.test.ts` : 4 sur 4 (dont l'empilement et l'aperçu stable) ;
  - typecheck propre ;
  - build de production réussi.
- **Branche C24** : `tests/syna301-fichiers-carte.test.ts`, 14 sur 14.
- **Branche C21** : `tests/syna301-contenus-carte.test.ts`, 16 sur 16, et les tests #310 de Codex, 29 sur 29.
- La suite complète `vitest` des deux branches et la CI des trois têtes sont publiées dans les PR. Aucune n'est
  présumée verte.

## 7. Prochaine vague (proposée)
- **C03 anciens projets** (#313) : cartes gratuites ouvertes selon `recovery.localEdits`, la lecture seule restant
  inchangée pour tout le reste.
- **C15 Blog** (#309) : recette utilisateur dans les deux modes. **C15 SEO** (#303) : vérifier si un parcours SYNA
  existe ; sinon, le marquer ABSENT.
- **C13 recherche de photos** (#312) : recette après le correctif de Codex.
- **C01 pièces jointes** : recette du lien ou de la photo dans la conversation.
- **P2** : bascules de l'en-tête en CSS ; message unique (carte ou bande d'information).
