# #277 — contre-vérification indépendante de l’intégration #276

## Phase 1 — relevé préparatoire du 31 octobre 2026

**GO pour préparer la revue ; NO-GO pour déclarer une intégration validée : aucune PR ni aucun SHA intégré n’ont été fournis au dernier relevé.** Claude est seul opérateur des merges et corrections de #276. Codex travaille dans la copie distincte `codex/277-controle-integration`, issue de #275 ; aucun moteur, thème, donnée ou flag réel n’est modifié. Les nouveaux tests croisés seront faits sur la candidate exacte, pas sur un assemblage présenté abusivement comme sa livraison.

Missions #276/#277 lues intégralement, ainsi que #194/#195, `CLAUDE.md`, le rapport et l’inventaire de #211/#275, le plan #248 et les derniers commentaires #247. Aucun `AGENTS.md` applicable trouvé dans les racines de cette copie et de ses parents. Le skill de vérification des thèmes est lu ; aucune modification de thème dans cette préparation. Les neuf propositions de #211 restent inchangées et ne sont pas développées ici.

### Références relues sur GitHub, puis récupérées

| Source | SHA exact | État distinct de la combinaison |
|---|---|---|
| main | `70204a7ff83eb2382835a27a37a8465c0851a70a` | Inchangée ; pas une intégration SYNA/métier |
| Codex #275 | `42ef034c00c7f6d92fc0ef14ce2818c520506931` | [CI 41169039547 verte](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41169039547), 4 384 tests réussis / 31 ignorés, quatre jobs ; verdict déjà limité à son périmètre |
| Claude #245 | `a69fcf7e0938f31c08b0a55320588d4c6060c45f` | [CI 40968182178 verte](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40968182178), PR brouillon non fusionnée |
| Plan documentaire #248 | `aff3c6a90eef00d4f68a92eed24e7c79752d22f9` | Documentation seule, comparaison initiale devenue historique |
| Candidate #276 | Non communiquée | Aucun contrôle après intégration revendiqué |

### Compatibilité Git et conservation

**VÉRIFIÉ PAR COMMANDES GIT LOCALES** : ancêtre commun des deux sommets = main ci-dessus, ascendante des deux. Depuis main : **373 fichiers modifiés côté Claude, 2 098 côté Codex**. Les cinq fichiers communs sont :

- `src/app/api/projects/[id]/route.ts` : conserver le contexte SYNA et la synchronisation de l’adresse des réservations ;
- `src/app/preview/[id]/v/[vid]/[[...path]]/route.ts` : conserver projection métier, autorisation et panier privé `catalogue-*` ;
- `src/components/studio/shell.tsx` : conserver SYNA, espaces Carte/Réalisations et leurs règles de visibilité ;
- `src/components/studio/tab-boutique.tsx` : conserver l’aperçu agrandi et les contrôles de publication natifs ;
- `worker/index.ts` : conserver tous les handlers et les tâches de maintenance, avec portée par propriétaire.

Simulation textuelle **des cinq fichiers seulement**, avec `git merge-file -p` sur des copies temporaires : **zéro conflit textuel**, références Git inchangées. Aucun merge de branche, index ou fichier applicatif changé. Ce résultat ne prouve ni types ni intégration fonctionnelle.

`package.json`, verrou de dépendances et **`theme-base/` sont inchangés dans les deux sources par rapport à main**. Les renderers, projections et interfaces changent cependant : ce constat ne remplace pas les contrôles navigateur. Onze tables nouvelles relevées côté Claude (`site_*`, `carte_*`, `realisations`), cinq `agent_*` côté Codex ; **pas de nom commun**. Relevé statique, pas une migration exécutée. Les tables métier sont initialisées dans leurs modules : tester leur création effective et l’inventaire de données après leur utilisation, pas seulement le démarrage de la base.

[Relevé machine reproductible](preuves-277/compatibilite-sources.json). Les reprises par contenu documentées dans l’inventaire des 54 PR restent des reprises par contenu : ne pas rejouer #250/#252–254/#265 ni les anciennes branches rouges pour les « rendre vertes ». L’ascendance ne suffit pas à détecter un écrasement `ours/theirs` : le lecteur Git compare également les fichiers conservés/modifiés/absents quand on lui donne une candidate. Les compositions, briefs privés et le client Coven hors catalogue restent protégés.

## Risques actionnables pour Claude

| Priorité / statut | Preuve source et conséquence | Correction ou contrôle attendu |
|---|---|---|
| **C1 — P1, CONFIRMÉ DANS LE CODE** | Codex `export-tool-execution.ts:30` : `currentSiteSource` utilise `withBiens`. Claude `contenus/index.ts:11`, preview et `sites/publish.ts:241/266` utilisent `withContenus`. Captures SYNA lisent aussi `currentSiteSource`. Carte/réalisations peuvent manquer à l’export/capture et à leur empreinte de contexte. | Employer la projection native commune, conserver `withStudioProducts`, comparer aperçu/capture/ZIP avec de vrais contenus de fixture ; modifier un contenu après devis et exiger 409 sans nouvel export. Tester aussi la source de l’aperçu privé catalogue, sans mélanger ses paniers. |
| **P1 — P1, RISQUE FONCTIONNEL ÉTAYÉ, pas encore reproduit sur combinaison** | `theme-tool-execution.ts:40–68` retouche les blocs enregistrés ; Claude `contenus/realisations.ts:165+` et `carte.ts:148+` remplacent au rendu portfolio, ap/ph-cards projects/gallery, ts-menu/ts-dishes. Des pages de réalisation n’existent qu’à la projection. | Refuser clairement une retouche sans effet visible, ou utiliser le vrai moteur métier sous version/accord ; pas de second moteur. Vérifier les textes dans le rendu après reçu et rechargement, pas seulement dans le JSON enregistré. |
| **P5 — P1, RISQUE DE CONSERVATION À REPRODUIRE** | `contenus/prestations.ts:78/197` lit les prestations dans le thème et sauvegarde une version ; la recomposition/annulation SYNA peut changer les sections qui portent horaires, intervenants et adresse. | Avant/après : `readPrestations`, réservations acquises, capacité du créneau et nouvelle réservation ; corriger une perte, ne pas simplement supprimer le contrôle. Annulation = version exacte et données métier conservées. |
| **P2 — P1, ÉCART DE CONTEXTE CONFIRMÉ** | `studio-observation.ts` / `intelligence-context.ts` du sommet Codex ne lisent pas le manifeste métier ni `siteFreshness`. Le registre d’outils actuel ne devient pas connecté du seul fait que l’API Claude existe. | État réellement lu dans la candidate : contenus, versions, brouillon/publication, site à republier. Ne pas annoncer un devis/RDV créé, envoyé ou un site à jour sur une simple présence de route. Les adaptateurs manquants restent à lister comme travail métier. |
| **Versions/consentement — P0, contrat confirmé, intégration à tester** | Claude `contenus/api.ts:108–126` garde `confirm:true` (428) et vérifie `ifVersion` si fourni (409). Le contrôle de version est facultatif dans cette API native. | Tout nouvel adaptateur SYNA doit transmettre la version réellement lue et vérifier contexte/droits au moment de l’action. Scénario : modification humaine pendant la tâche, ancien accord refusé, pas d’écrasement ni de deuxième appel. |
| **R4 — P0 avant activation, limite de source confirmée / pas de reproduction combinée** | `privacy.ts:83–105` ne nettoie que médias et caches indexés dans l’effacement de fixture, pas `DATA_DIR/sites`. Ce chemin est volontairement interdit en production. `sites/maintenance.ts` purge d’anciennes publications, ce qui n’est pas l’effacement d’un compte. | Fixture A/B avec publications locales ; après politique d’effacement autorisée, ancien hôte A non servi et fichiers traités, B conservé. Pas d’activation de l’hébergement ni d’automatisation de suppression réelle pour « tester ». Ne pas déduire une fuite réelle de cette limite statique. |
| **P4 / hôtes / worker — P0/P1, à vérifier** | Fusion automatique dans shell/tab-boutique/worker et middleware modifié seulement par Claude. | Publication et SYNA visibles/accessibles sans débordement desktop/mobile ; hôte de site ne sert aucune route Studio ; jobs restent dans le bon compte. Refaire A → B → A sur le navigateur partagé et l’erreur média, sans enlever le correctif `7ff87470`. |

Ces lignes séparent les faits source, les risques et les défauts effectivement reproduits. Aucun défaut d’une candidate encore absente n’est présenté comme observé. Les corrections de #276 appartiennent à Claude ; Codex ne pousse pas sur sa branche.

## Matrice exécutable et ordre des contrôles

[Matrice JSON : 11 groupes de commandes existantes et 7 scénarios croisés](277_MATRICE.json). Les chemins de chaque test/recette ont été vérifiés dans les deux arbres sources. **Ces commandes ne sont pas déclarées exécutées sur une intégration absente.** Les tests unitaires existants des deux côtés ne couvrent pas automatiquement C1/P1/P5.

1. Geler PR/SHA et relever l’ascendance + les fichiers modifiés/absents. Réutiliser le script de lecture Git ci-dessous. Conserver le patch de chaque correction d’intégration.
2. Exécuter les groupes P0 accès/coûts/données, puis les moteurs métier/versions et les sondes croisées C1/P1/P5/R4. Ajouter uniquement les tests croisés réellement manquants dans la copie Codex ; pas de réécriture de moteur.
3. Parcours **boutique multi-produit** : produits/variantes distincts, consignes exactes, texte entier et visuel acquis, devis/accord, composition, vrai panier d’aperçu, panne simulée, modification humaine concurrente, annulation et reprise ; export avec limites dites.
4. Parcours **société de réparation de vélos** : faits/zone/prestations, devis et créneau par moteur natif s’ils sont effectivement raccordés, modifications humaines, reprise/annulation. SMTP local uniquement ; absence de connecteur ou d’outil dite clairement.
5. Parcours **agence immobilière fictive** : un bien à vendre et un à louer, médias techniques distincts, réalisation, filtres/détail et carte si disponible, aperçu/capture/ZIP cohérents, versions et compte étranger. Aucune vraie donnée immobilière.
6. Largeurs 1440/390/360, 1024 si le panneau l’exige ; SYNA ouvert/fermé, navigation, boutons, kit et retouches/reprise. Captures nouvelles **sur la candidate**, sans recopier les captures des branches comme preuve d’intégration. Préserver les 15 thèmes : références/compositions/CSS inchangées, contrôles de rendu ciblés puis couverture CI ; signaler les médias privés manquants plutôt que les remplacer.
7. Sur la tête figée finale : types, build, Theme Check, suite et Docker/CI requis. Ne pas reconstruire à chaque groupe ni relancer d’anciens rouges ; les corrections réelles invalident seulement les zones affectées, puis la combinaison finale est contrôlée. Tous contrôles/gardes restent requis. Examiner les avertissements Shopify, pas les masquer.

```bash
# Depuis le checkout indépendant de la candidate, script pris dans la branche Codex d’audit.
python3 /CHEMIN_AUDIT/scripts/audit277-compatibilite.py \
  --main 70204a7ff83eb2382835a27a37a8465c0851a70a \
  --claude a69fcf7e0938f31c08b0a55320588d4c6060c45f \
  --codex 42ef034c00c7f6d92fc0ef14ce2818c520506931 \
  --candidate "$SHA_CANDIDAT_40_CARACTERES" --out /tmp/277-compatibilite-candidat.json

# Exemple de premier groupe, avec la garde existante et les fixtures isolées du dépôt.
STOCK_OFFLINE=1 NODE_OPTIONS=--import=./scripts/lot9/network-guard.mjs \
  node node_modules/vitest/vitest.mjs run \
  tests/mission171-boundaries.test.ts tests/mission171-routes-lifecycle.test.ts \
  tests/mission171-scope-inputs.test.ts tests/contenus-api.test.ts

# Deux recettes existantes du véritable Studio compilé ; compléter les preuves métier.
# Garde absolue héritée aussi par les processus enfants.
export STOCK_OFFLINE=1
export NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs"
node --import tsx scripts/verify-agent211-build.ts /tmp/277-preuves-NEUVES/commun --closure-ui
node --import tsx scripts/verify-agent211-build.ts /tmp/277-preuves-NEUVES/logo --logo-selection-ui
```

Les variables `$SHA_CANDIDAT_40_CARACTERES` et chemins de recette doivent désigner le SHA figé et un répertoire de test neuf. Les deux recettes natives utilisent serveur/worker/SQLite/SDK réels avec **HTTP fournisseur loopback simulé**, pas une API réelle. La recette service existante prouve notamment l’absence honnête des outils non raccordés : cette assertion ne devra pas être effacée pour présenter un raccord non testé ; lorsqu’un adaptateur est livré, tester son effet natif et son reçu.

## Contrôles réellement faits dans cette préparation

- Lecture GitHub des missions, têtes et CI séparées ; fetch ciblé sans changement des sources.
- Script `audit277-compatibilite.py` exécuté : ascendance, recouvrement, simulation textuelle et définitions SQL ; zéro conflit textuel, références inchangées. Pas de migration réelle ni de fusion de branche.
- Validation des 11 groupes de commandes : tous les chemins de tests/recettes existent dans les sources. Contrôle négatif du lecteur sur le seul sommet Codex : il détecte que Claude n’est pas ascendant et que ses fichiers ne sont pas intégrés ; ce n’est pas un verdict sur la future candidate.
- Aucun appel fournisseur, serveur client, installation CMS, envoi de message, connexion nouvelle ou publication réelle. **0 appel / 0 € réel.** Pas de nouveau build ni de capture des démos avant candidat.

## Limites et critère du verdict suivant

**En attente externe : PR + SHA intégré et premier contrôle de Claude.** L’ancienne autorisation #194 ne vaut pas permission de fusionner main dans #276/#277. Aucun main fusionné ou Studio réellement mis à jour n’est annoncé.

**GO pour examen propriétaire** seulement sur SHA figé avec sources préservées, P0 résolus, C1/P1/P5 et raccords métier vérifiés, contrôles requis verts et limites explicitement acceptables. **NO-GO** si accès croisé, perte de contenu/version, coût/accord contourné, fausse livraison ou contrôle rouge ; défaut = reproduction, fichier, correction conseillée et retest du nouveau SHA. Une absence honnête de capacité est un travail restant, pas sa réussite.

Restent soumis à accord distinct : cognition/qualité créative par fournisseur réel, vraies photos client, vraie installation Shopify/Woo/Presta, vrais paiements, DNS/SMTP publics, rendez-vous externe et hébergement activé. Les ZIP sources avaient **0 erreur / 35 avertissements** ; conserver les messages au contrôle suivant. Les essais synthétiques ne qualifient pas le rendu commercial ni la compréhension IA. Contretemps et VANS **étape 1 seulement** ne sont jamais ouverts ; seules leurs protections sont vérifiées par fixtures et sources.
