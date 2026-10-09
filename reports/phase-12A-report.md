# Phase 12A — Studio Integration & AI Workflow V2

Statut : **terminée techniquement, non fusionnée** (en attente de la validation du propriétaire). 12B et Phase 13 non
commencées. Tout a été testé avec les **moteurs locaux et des fournisseurs simulés** : aucun appel d'IA payant, aucune
clé utilisée.

## Ce que le client peut faire maintenant

Une seule demande, écrite soit dans le formulaire de création (champ « Tout ce que vous voulez obtenir »), soit dans
le Pilote (« Que voulez-vous obtenir ? »), par exemple :

> Crée ma marque, mon logo, mes visuels, ma boutique Shopify, mes publicités et prépare mes publications Instagram
> pour les 30 prochains jours.

Le studio :
1. **comprend** la demande (Intent existant + lecture des paramètres : jours, réseaux, plateforme CMS) ;
2. **planifie** avec l'orchestrateur existant (Planner / Router V2, `task_plans`) — aucun second orchestrateur ;
3. **chiffre** chaque module (devis par ligne : local gratuit, IA payante, déjà fait, non inclus dans le forfait) ;
4. **attend l'accord** si le devis dépasse 0 € (case à cocher + plafond en euros ; refus si plafond < devis) ;
5. **exécute** par les moteurs V2 existants : création complète (pipeline) puis Brand/Logo, Image, Ads V2, Social V2
   (calendrier + production des visuels), SEO, Theme, CMS V2 (export contrôlé), Quality Gate ;
6. **suit** chaque étape (statut, verdict, note, nombre d'essais, coût réel par étape, plafond) avec un lien
   « Ouvrir » vers l'éditeur concerné, et un bouton « Réessayer » qui ne refait pas les étapes réussies ;
7. **liste ce qui attend le client** (questions, logo, publications à approuver, publicités à relire, thème à
   installer) — rien n'est validé à sa place, rien n'est publié ;
8. **regroupe les éditeurs** (marque, boutique, publicités, vidéos, textes, publications, fichiers) : les
   modifications à la main restent gratuites.

Changement d'identité (nom, palette, typographies, logo) : une carte « Votre identité a changé » (onglets Marque et
Pilote) liste les créations faites avec l'ancienne identité ; le client coche ce qu'il veut mettre à jour (local,
gratuit, nouvelle version, l'ancienne reste). Les créations modifiées à la main ne sont touchées que sur demande
expresse ; les publications déjà approuvées repassent en approbation ; vidéos et textes sont signalés (à reprendre
dans l'éditeur).

## Ce qui a été intégré (code)

| Élément | Fichier |
|---|---|
| Demande unique : préparation, devis, autorisation, plafond, lancement, annulation, suivi, validations | `src/lib/workflow/index.ts` |
| Propagation contrôlée de la marque (impact, recoloration des pubs/thème/visuels, contrastes) | `src/lib/workflow/propagation.ts` |
| Historique des identités (pour savoir avec quelle marque chaque création a été faite) | `src/lib/brand-versions.ts`, table `brand_versions` |
| Tâche de fond `workflow.run` (attend la création complète via `dependsOn`) | `worker/handlers.ts` |
| Intention `EXPORT_CMS`, étape `cms_export` du plan | `src/lib/orchestrator/{intent,planner,execute}.ts` |
| Étape « publications » du plan sur Social V2 (calendrier idempotent + production) | `src/lib/orchestrator/execute.ts` |
| Export CMS partagé (écran « Exporter » et plan) | `src/lib/cms-v2/record.ts` |
| Création complète : calendrier de 7 jours sauté quand la demande en prévoit un | `src/lib/engine/pipeline.ts`, `src/lib/project-start.ts` |
| API | `/api/projects/[id]/workflow`, `/workflow/[wid]`, `/brand/impact` |
| Interface | `src/components/studio/workflow-panel.tsx` (Pilote + Marque), champ de demande dans `home.tsx` |

Garde-fous :
- **Découverte = 0 € d'IA** : export, visuels, publicités, vidéos et calendrier ne sont pas faits (raison affichée).
- Le compte administrateur suit son forfait (même règle que les clients).
- Aucune action payante sans devis accepté ; plafond vérifié avant chaque étape payante ; coût réel par étape lu
  dans `ai_calls`.
- **Pas de doublon** : tâche unique par demande (`wf:<id>:run`), calendrier identifié par la demande (clés
  `v2:<plan>:…`), étapes déjà faites par la création complète marquées « faites » et non refaites ; la **même demande
  renvoyée dans les 24 h** reprend la demande existante au lieu de tout refaire.
- Coordonnées saisies à la création : jamais redemandées ni effacées (non touchées par 12A).

## Tests

- `npx tsc --noEmit` : OK.
- `npx vitest run` : **111 fichiers, 952 tests, tous réussis** (dont `tests/workflow-v2.test.ts`, 11 tests).
- `npm run build` : OK.
- **Parcours navigateur réels** (`scripts/e2e-workflow-v2.ts`, Chromium, serveur `next start` + vrai worker, base de
  démonstration, forfait Vendre attribué à la main, aucune clé d'IA) : **36/36 vérifications réussies**, **0 appel
  d'IA**, aucune erreur JavaScript.

| Parcours | Résultat vérifié |
|---|---|
| 1. Boutique cosmétique à partir d'une photo (+ demande type) | Création + demande liées ; worker **coupé brutalement à 38 %** puis relancé → la demande va au bout ; 30 publications Instagram (aucune publiée), 9 publicités V2, export Shopify contrôlé, marque et logo ; 1 seule création et 1 seule exécution ; pas de second calendrier ; même demande renvoyée → rien refait |
| 2. Plâtrier-peintre à partir d'une description | Site + 14 jours de publications Facebook, export WordPress contrôlé, aucune mention de vente en ligne |
| 3. Marque high-tech (drone) | Marque, palette, typographies, boutique, export Shopify ; pas de publicités ni publications non demandées |
| 4. Campagne publicitaire + calendrier (depuis le Pilote) | Devis 0 € affiché par module, rien lancé avant « Lancer », 14 publications Instagram/Facebook, nouvelle campagne, les 30 publications du parcours 1 intactes |
| 5. Changement d'identité | Nouvelle palette → 24 créations listées, mise à jour contrôlée locale (nouvelles versions des pubs, visuels refaits à réapprouver, export refait) |
| 6. Téléphone (390 px) | Pilote, Marque et formulaire lisibles, sans débordement horizontal |

Captures : `reports/screenshots/workflow-v2/` (01 à 14) et `resultats.json`.

Défauts trouvés par ces parcours et **corrigés** :
- les publications demandées n'étaient pas faites après une création complète (étape marquée « sautée ») ;
- « … et ma boutique Shopify » placé loin du verbe n'était pas compris (boutique et export oubliés) ;
- débordement horizontal du Pilote sur téléphone (mémoire du projet : résumé de propagation illisible, désormais une
  phrase « Nouvelle identité appliquée : 9 publicité(s), … ») ;
- compte de démonstration resté en Découverte (le studio refusait correctement : règle respectée).

## Ce qui n'est PAS vérifié / limites

- **Aucun fournisseur d'IA réel** : devis IA, accord, plafond et arrêt au plafond testés en code (tests unitaires)
  avec des fournisseurs simulés, pas avec de vraies dépenses. Qualité des contenus = moteurs locaux.
- Photo cosmétique **synthétique** (flacon dessiné) ; photo drone = photo de démonstration du dépôt.
- Recherche de photos libres **hors ligne** pendant les parcours (`STOCK_OFFLINE=1`).
- Reprise testée sur la création complète (worker coupé à 38 %) ; coupure pendant l'étape « demande » couverte
  seulement par les tests unitaires (relance de la même tâche, sans doublon).
- Palette changée par le même appel que l'éditeur de palette de l'onglet Marque (pas en cliquant dans le sélecteur).
  Cet éditeur **réapplique déjà la palette à la boutique** (comportement existant) : la propagation n'a donc pas créé
  de nouvelle version de boutique dans ce parcours (testée dans les tests unitaires).
- « 14 jours Instagram et Facebook » = une publication par jour, réseaux alternés (7 + 7), pas 14 par réseau.
- Liste de propagation longue (une ligne par création, pas de regroupement par type).
- Vidéos et textes : seulement signalés lors d'un changement d'identité, pas refaits automatiquement.
- Dossiers / sous-dossiers : rangement existant réutilisé (aucun nouveau dossier par demande).
- Automatisations : la reprise d'une demande identique couvre 24 h ; pas encore de demande récurrente programmée.
- Chromium seulement ; ni Safari, ni Firefox, ni vraie tablette.
