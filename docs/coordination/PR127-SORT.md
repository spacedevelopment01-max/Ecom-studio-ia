# Sort de la PR #127 (« Planifier avec visuels » et « Calendrier en une phrase »)

PR #127, branche `claude/planifier-avec-visuels` (3 commits du 16 octobre 2026, environ 150 commits de retard sur
main). Reprise **à la main** sur `claude/integration-127`, partie de `claude/integration-globale` : aucune fusion de
l'ancienne branche, aucun choix global « ours/theirs ». La PR #127 elle-même n'est pas fusionnée ; une fois cette
branche acceptée, elle peut être fermée comme « reprise ailleurs ».

Consigne du propriétaire : reprendre les fonctions utiles encore manquantes de planification et d'édition du
calendrier, sans réintroduire les anciens médias non IA contraires aux dernières consignes, et documenter le sort de
la PR et toute incompatibilité restante.

## 1. Repris (fonction → fichiers)

| Fonction | Fichiers |
|---|---|
| Dates écrites en clair, FR/EN, avec ou sans année (« à partir du 19 octobre 2026 », « du 5 au 7 mars », « jusqu'au 3/11 », « from March 19 to 25 », « between Mar 5th and April 2nd ») | `src/lib/social-v2/edit-dates.ts` (nouveau, repris tel quel) |
| Analyse de la phrase : « tout », périodes relatives (cette semaine, la semaine prochaine, novembre…), « le dimanche », « pas le week-end », « seulement lundi et jeudi », heure (« de 18h30 »), réseau, format, statut, « les N prochaines » ; fautes et accents tolérés | `src/lib/social-v2/local-edit.ts` |
| Actions locales et gratuites : supprimer, déplacer au jour de la semaine (avec heure), à une date, décaler de N jours/semaines, changer l'heure, réduire par jour ou par semaine, changer de réseau ou en ajouter un, dupliquer, valider, pause, reprise | `local-edit.ts`, `src/lib/social-v2/engine.ts` (`applyLocalEdit`) |
| **Aperçu obligatoire avant d'agir**, **confirmation toujours demandée pour une suppression** (bouton « Confirmer la suppression »), bouton Annuler | `local-edit.ts` (`confirm`, `destructive`), `engine.ts` (`needsConfirm`, `confirmKind`), `src/components/studio/social-studio.tsx` (`data-edit-confirm`) |
| **« Annule ma dernière modification »** | `engine.ts` (`snapshotForUndo`, `finishUndo`, `undoLastEdit`), table `social_edit_undo` dans `src/lib/db.ts` |
| Exemples de phrases comprises quand la demande ne l'est pas ; réponse toujours affichée sous la demande (jamais de silence) | `local-edit.ts` (`EDIT_EXAMPLES`), `social-studio.tsx` (`data-edit-answer`) |
| Coût IA en % du budget IA du mois ; l'API ne renvoie plus de montant (`estimateMicro` retiré de la réponse, `pct` à la place) ; l'accord du client (`approvedPct`) est revérifié par le serveur | `engine.ts`, `src/app/api/projects/[id]/social/v2/route.ts`, `social-studio.tsx` |
| Plafond d'une réécriture IA calé sur l'estimation (reprises comprises) au lieu d'un 1 € fixe | `engine.ts` |
| Textes FR/EN par `L()` dans le moteur | `engine.ts`, `local-edit.ts` |
| Tâche de production : suivi « Visuel 3 sur 12 » ; arrêt immédiat si le client annule ou met en pause la tâche (l'import existait mais l'erreur était avalée, la boucle continuait) | `src/lib/social-v2/production.ts` (`progress`, relance de `JobCancelled`/`JobPaused`), `worker/handlers.ts` |

### Réconciliations avec les règles actuelles

- **« Remplace les images des 3 prochaines publications »** : images finales 100 % IA. La nouvelle image est créée par
  l'IA (moteur de publication habituel, `ai_post`), après un devis au coût probable en % du budget IA, puis l'accord du
  client (`confirm` + `approvedPct`, revérifié : « Le coût a changé… » s'il a monté). Une seule tâche de fond
  (`social.v2.produce`, clé d'idempotence calculée sur les publications et leurs médias actuels : un double clic donne
  la même tâche). L'image actuelle reste tant que la nouvelle n'est pas validée (`replace`). Une reprise de la tâche ne
  refait ni ne repaye une publication déjà refaite (`replaceFrom`, `production.ts`). Si la même demande s'est déjà
  terminée sans changer les images (échec, annulation), elle n'est pas relancée toute seule et c'est dit. Sans IA :
  « les images actuelles restent ». 30 publications au plus par phrase (taille d'un lot : le devis couvre exactement le lot).
  Avant cette reprise, la phrase retirait l'image puis lançait une production gratuite qui, sous les règles
  actuelles, laissait la publication sans visuel : ce retrait sans rien à la place est supprimé.
- **Changement de format** (« transforme les textes en images ») : seules les publications encore **sans visuel**
  changent de format ; l'aperçu dit que le visuel se crée ensuite par l'IA (coût montré avant). Un visuel déjà posé
  n'est jamais retiré ; aucune photo de banque n'est posée. Le changement passe par `editPostV2` (nouveau champ
  `format` de `ManualPatch`) : nouvelle empreinte, nouvelle approbation si besoin, provenance de stratégie gérée comme
  une modification manuelle.
- **Changement de réseau** : par `editPostV2` (mêmes contrôles et même provenance que la modification manuelle).
- **Déplacements** : chacun passe par `moveRefusal` (date future, horizon et nombre par jour du forfait), comme le
  glisser-déposer.
- **Validation par phrase** : même fonction que le bouton (`approvePosts` + barrière, revue des angles de services).
- **Stratégie (A/B de #161)** : la phrase ne vise que les publications visibles de la stratégie en cours
  (`strategyVisibilitySql`) ; une version préparée non activée ou archivée n'est jamais touchée. Les copies gardent
  la provenance de leur original (`duplicatePostV2`).
- **Annulation prudente** (ajouts par rapport à #127) : jamais une publication envoyée entre-temps, ni une publication
  modifiée depuis la retouche (elle garde la modification la plus récente), ni une date d'origine passée, ni un visuel
  supprimé depuis. Une publication qui était programmée revient « approuvée » puis repasse par `schedulePosts`
  (compte connecté, horizon et nombre par jour du forfait) ; calendrier en pause : elle reste en pause. Ce qui n'a
  pas pu être remis est dit dans la réponse.

## 2. Déjà présent dans main (avant cette reprise)

| Fonction de #127 | Déjà fourni par |
|---|---|
| Visuels IA des publications planifiées : devis en % du budget IA, plafond, accord, tâche de fond | `BatchVisuals` dans `src/components/studio/social-create.tsx` (onglets « Publication image » / « Publication vidéo »), actions `estimate`/`produce` de `src/app/api/projects/[id]/social/v2/route.ts`, `estimateProduction`/`produceBatch` (`src/lib/social-v2/production.ts`) |
| Visuel d'une publication (gratuit = reprise d'une image IA déjà validée, ou IA payante après prix accepté) | `PostVisualMaker` (`social-studio.tsx`), `src/lib/social-v2/visual-mode.ts` |
| Créations initiales avec autorisation et reçus | `src/lib/social-v2/initial.ts`, `initial-authorization.ts`, `initial-diversity.ts` |
| Coût d'une retouche IA en % (texte du résumé) | `budgetPctText` (`src/lib/ai/budget-pct.ts`), déjà utilisé par `applySocialEdit` |
| « Pas de double débit » d'une publication déjà produite | `produceBatch` ne produit que les publications sans média (`media = '[]'`) hors remplacement |

Le choix « Visuels créés par l'IA » **dans** le formulaire « Planifier » n'a donc pas été ajouté : il doublerait
`BatchVisuals`. À la place, le résultat de « Planifier » renvoie vers « Publication image » et « Publication vidéo »
(« Visuels de ces publications, créés par l'IA (coût montré avant, en % de votre budget IA) »), `data-plan-visuals-next`.

## 3. Volontairement non réintroduit, et pourquoi

Règle « Images finales 100 % IA » (CLAUDE.md, `docs/guide-images-ia.md`) : toute image finale est créée par un modèle
d'images ; jamais de gabarit ni de photo de banque à la place, jamais de bascule silencieuse.

- **Mode « Visuels gratuits » du planificateur** (`src/lib/social-v2/plan-visuals.ts` de #127 : `freeImagePool`,
  `attachFreeVisuals`) : posait des photos envoyées par le client, et des photos libres de droits (Pixabay) pour les
  services, comme visuel final de publication. Contraire à la règle : non repris. L'exception Pixabay des sites de
  services ne concerne que les **images du site** (signalées, `src/lib/theme/stock-notice.ts`), pas les publications.
- **Vidéos « montées sans IA »** lancées en lot (`deps.ts` de #127 : `realVideoDeps(ctx, pp, false)` ; actions
  `replace_video` et vidéos du changement de format) : faisaient partie du mode gratuit ; non repris. « Refais les
  vidéos » répond désormais où refaire une vidéo, une par une, coût montré avant.
- **Devis du planificateur `quoteVisuals`/`probableUnitMicro`** (marges recalculées à la main dans `plan-visuals.ts`) :
  non repris, le devis passe par `estimateProduction` et `probableOf`, seule source des coûts.
- **Note d'attente par publication (`visualNote`, `view.ts`, badge « Photo libre »)** : liée aux codes du mode gratuit
  (« banque vide »…) ; non reprise.
- **Captures d'écran** de `reports/screenshots/planifier-visuels/` : elles montrent le mode gratuit ; non reprises.

## 4. Incompatibilités ou limites restantes

- La réécriture IA des textes (existante) garde sa clé d'appel horodatée : deux clics « Confirmer » très rapprochés
  peuvent lancer deux réécritures (le remplacement d'images, lui, est protégé). À traiter dans le domaine 6
  (budget, `ai_calls`) si le propriétaire le souhaite.
- L'annulation remet les colonnes de la publication, pas la mémoire éditoriale : une accroche supprimée par phrase
  reste notée « refusée » (`rememberRefused`), et la ligne de provenance de stratégie d'un changement de format ou de
  réseau garde l'état « modifiée par le client ».
- La limite « par jour » du forfait : l'envoi compte les publications **programmées** (règle #150) ; un
  **déplacement** compte aussi les publications approuvées du jour (`moveRefusal`, correction de l'intégration
  `b7829553`). Le test `tests/social-autopilot-limites.test.ts`, qui échouait selon le jour de la semaine sur la base
  `5dd5f630`, garde donc ses publications approuvées et ne dépend plus du jour.
- Remplacement d'images : une publication **programmée** n'est pas refaite (statut non productible) ; la réponse le
  dit et propose de la déprogrammer d'abord. Les vidéos ne sont jamais refaites par une phrase.
- Changement de format vers la vidéo : la publication attend sa vidéo (onglet « Publication vidéo »).
- Interface non vérifiée en navigateur dans cette reprise (pas de captures) : seuls les tests et la compilation ont
  été exécutés. Aucun appel IA réel, aucune dépense.

## 5. Tests ajoutés ou adaptés

- `tests/calendrier-une-phrase.test.ts` (repris de #127, adapté, 10 cas) : dates FR/EN ; « tout à partir du … » avec
  confirmation et publications envoyées intactes ; « du … au … », « le dimanche », « tout » en FR/EN ; version
  préparée d'une stratégie jamais visée ; vidéos au vendredi après l'aperçu ; par jour ; **remplacement d'images par
  l'IA** (sans IA rien n'est retiré ; devis en %, aucun lancement sans accord, coût changé, une seule tâche même en
  double clic, demande terminée en échec jamais relancée toute seule, image actuelle conservée, reprise de la tâche
  jamais repayée) ; vidéos jamais refaites en lot ;
  phrase non comprise ; route `edit` : `pct` sans montant.
  Le cas « remplacer par d'autres photos de la banque » de #127 est **supprimé** (mode gratuit non repris).
- `tests/calendrier-phrases-variees.test.ts` (repris de #127, adapté) : 40 phrases FR et 14 EN ; « refais les
  vidéos » attendu « non comprise » avec explication ; « textes en images » ne pose aucune photo ; annulation prudente
  (modifiée depuis : gardée ; programmée : revient approuvée ; copies retirées).
  Les deux fichiers fixent l'horloge au 25 février 2027 (`vi.setSystemTime`, l'heure avance ensuite) : le calendrier
  de mars 2027 reste dans l'horizon de 90 jours du forfait quel que soit le jour d'exécution.
- `tests/planifier-visuels.test.ts` de #127 : **non repris** (il testait le mode « Visuels gratuits » et son devis
  propre).
- `tests/social-v2-engine.test.ts` : suppression confirmée avant d'agir ; « remplace les images » = devis IA, rien de
  lancé ni de retiré.
- `tests/social-autopilot-limites.test.ts` : aperçu puis confirmation ; publications approuvées (voir § 4).
