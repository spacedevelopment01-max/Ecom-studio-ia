# PR140 — Vidéo guidée et intégration consultable du studio

Mission du 19 octobre 2026 : [6271701195](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6271701195), compléments [accès Codespaces](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6271865505) et [frontière Claude](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6271978834).

## Version et périmètre

Code final réceptionné localement : **abad7c08391d0411946119e0152400c2a629974b**, arbre **a5e89c8621c0a5151e0c6b35e54bbc449912f3f4**. `/api/version` renvoie ce SHA depuis la compilation, pas depuis le dépôt présent au moment de la requête. Les scripts supplémentaires et les preuves de cette livraison ne modifient pas `src/` ou `tests/`.

Intégration préparée vers main, sans réécrire les branches existantes :

- main de départ : `ad41c596e859781f33874730891b4bd8b85e259e` ;
- dépendance PR138 : `301e948407adc11712c0165dfadfa6f8fb949b66` ;
- livraison antérieure Claude incluse jusqu’à **b4557d6413097c6ba3791daaae41826e4890defe**, descendant de `d12013d03a927fb02946d95a128d0a89d9777bbf`, `b14fd493471947adf395e61c77f390d1f57e9f21` et `dfefd81d05fdc954734d3199c63ed668d0814601` ;
- merge borné local : `d23ae2b9f38fadd812a34827ad99cdddaf3891b7` ; conflits SEO réconciliés en conservant les cibles stables, le contexte exact, les verrous et les versions ;
- tête ultérieure Claude relevée `b2d724c79e44811c147d6d5553f107a49138cdfa` **exclue**. Sa reprise FRAISE/ONDE n’est ni intégrée ni remplacée. Les thèmes existants et la bibliothèque livrés auparavant restent présents. Pas de nouveau chantier artistique.

L’authentification CLI GitHub est devenue invalide après les premiers envois. Les derniers commits ont été effectivement publiés par l’API Git du connecteur, avec vérification de chaque blob, égalité de l’arbre complet et mise à jour de branche sous condition du SHA attendu, sans force. Le commit local `114baba61962edb82a977c1bd4a0b64a71a287e1` a exactement l’arbre du commit publié `abad7c08`. Les branches locales de conservation restent intactes.

## Corrections et preuves

**CONFIRMÉ DANS LE CODE et REPRODUIT** : l’ancien parcours imposait des images de départ ou du stock. Le nouveau parcours distingue clip IA direct, référence fournie facultative, et images intermédiaires explicitement choisies. Les deux premières routes ne passent pas par la création d’images ni Pixabay. Aucun remplacement silencieux après refus du fournisseur. Un adaptateur déclaré raccordé signifie « chemin écrit », jamais « fournisseur réellement testé ».

Fichiers : `src/lib/video-v2/scene-generation.ts`, `providers.ts`, `three-scenes.ts`, `engine.ts`, API `creative/video`, `src/components/studio/guided-video.tsx`. La route directe effectivement raccordée est Alibaba/Wan via l’adaptateur existant. Les entrées sans adaptateur direct, prix confirmé ou capacité compatible sont refusées ; aucun nouveau fournisseur ou abonnement ajouté.

**CONFIRMÉ DANS LE CODE et REPRODUIT** : proposition initiale locale gratuite, scénario lisible en français, durées et nombre de scènes modifiables, retouches gratuites et accord lié au scénario exact. Le projet, la marque et les prestations alimentent les consignes. Une correction ambiguë de prestation demande un choix ; aucune réalisation, promesse ou personne inventée. Les formulations avancées libres peuvent nécessiter une nouvelle rédaction annoncée. Le mode d’illustration pour le service reste explicite.

Fichiers : `scenario-refinement.ts`, `approval.ts`, `three-scenes.ts`, `guided-video.tsx`, `src/lib/preparation/plan.ts`, `native-deps.ts`, `engine.ts`, `media.ts`. Les vidéos initiales occupent les emplacements déjà prévus du site ; aucun quota de publications ou publicité ajouté. Les accords/scénarios réutilisables survivent à la fermeture et au rechargement. Une modification du scénario invalide son accord. Les clips acceptés sont conservés lors d’une interruption ; une reprise technique ne renvoie pas aveuglément une nouvelle génération.

**CONFIRMÉ DANS LE CODE et REPRODUIT** : devis probable distinct du plafond incluant la marge native de réservation et une reprise ciblée. Refus du budget natif avant la mise en file ; forfaits et enveloppes existants conservés. Un modèle annoncé ne suffit pas : clé active, route, capacité, durée facturable et tarif sont contrôlés. Pas de tentative supplémentaire cachée.

Fichiers : `scene-generation.ts`, `src/lib/video-v2/chain-quote.ts`, `src/lib/ai/media-providers.ts`, API `creative/video`. Tests `video-creation-rights.test.ts` : devis injecté, mais authentification, validation signée, plan et refus de réserve natifs. Aucun changement des plafonds de production.

**REPRODUIT puis corrigé** : le long bouton de référence mobile étendait un écran de 390 à 453 px et rendait la sélection réelle impossible. Bouton désormais repliable ; contrôle après correction : 390/390, clic sans force, fermeture du sélecteur. Aucun changement global du composant Modal conservé.

**REPRODUIT puis corrigé** dans l’intégration bornée : les nouveaux identifiants techniques de contenu pouvaient rendre obsolète une préparation approuvée. Les anciens textes `home`, `brand`, `service:n` n’étaient pas consommés par les nouveaux templates. Le corps complet de Contact pouvait être perdu. Le choix initial de thème n’avait pas de callback d’application, et l’adoption d’une direction pouvait recolorer une identité déjà approuvée.

Fichiers : `preparation/engine.ts`, `project-handoff/theme-contract.ts`, **`project-handoff/content-targets.ts`**, `seo-v2/theme-copy.ts`, `theme-delivery.ts`, `engine/shop.ts`, API `theme/build`, `tab-boutique.tsx`, `preparation-panel.tsx`. Le pont lit l’instantané approuvé et contrôle ordre/contenu des prestations et document exact ; il ne migre pas les données. Le corps long et la fin des textes arrivent dans le rendu. Contact conserve son formulaire et un seul H1. Un projet préparé doit choisir une direction active de la galerie : pas de nouveau gabarit générique implicite. La palette et les polices approuvées restent inchangées au choix du thème. Les anciens projets gardent leurs comportements historiques.

Tests : `preparation-theme-integration.test.ts`, `handoff-contrat.test.ts`, `palette-direction.test.ts`, `video-beginners-direct.test.ts`, `video-creation-rights.test.ts`. Aucun nom de projet de recette n’est une condition du code applicatif.

## Vérifications réellement exécutées

[Preuves et téléchargements](../../reports/pr140-video-debutants/README.md).

- `npx tsc --noEmit` : réussi sur le code final ; contrôle complémentaire des harnais livré séparément.
- `npx vitest run tests/video-v2.test.ts tests/preparation-theme-integration.test.ts tests/palette-direction.test.ts tests/handoff-contrat.test.ts tests/video-beginners-direct.test.ts tests/video-creation-rights.test.ts --maxWorkers=2` : **52 tests, 6 fichiers, réussis**, 16,39 s. L’ancienne assertion « aucune capacité texte-vers-vidéo raccordée » a été remplacée par la vérification de l’adaptateur direct Alibaba et du refus des routes Google seulement documentées.
- Régressions d’intégration précédentes : **74 tests / 6 fichiers réussis**, 16,93 s ; puis contrôles ciblés supplémentaires. Les nombres ne s’additionnent pas.
- `npm run build` : réussi sur `abad7c08`, serveur local démarré depuis ce build ; SHA compilé contrôlé.
- `JOBS=2 scripts/verify-theme.sh` : **152 cas Theme Check passés**, puis échec ZIP par saturation du stockage temporaire. Après nettoyage du seul cache webpack généré par cette recette, `npx tsx scripts/theme-check-zip.ts /tmp/ecs-video-beginners-theme-zip` : **4 cas ZIP, zéro erreur, code de sortie 0**. Aucun gate désactivé ; le précédent signalement lookbook/niche n’a pas été reproduit.
- CI `b3da6bf6`, run 39295753488 : 2 382 tests réussis, deux ignorés, **une ancienne assertion en échec**, corrigée ensuite ; Docker réussi. Ce n’est pas un succès global.
- CI du code final : [run 39297912423](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39297912423). Au gel de ce rapport, Docker et suite complète de tests réussis ; Theme Check et build distants encore en cours. **La fusion ne doit être exécutée qu’après succès du contrôle obligatoire sur la tête effectivement fusionnée.** Le commentaire de livraison donnera le résultat et le SHA de fusion réellement obtenus.

Une première suite locale complète a été interrompue pendant les travaux d’intégration : ce relevé mélangeait deux états de fichiers et n’est pas une preuve de réception. Un build a échoué par manque d’espace avant reprise réussie. Les erreurs de harnais (URL d’aperçu supposée, localStorage dans iframe sandboxé, répétition d’une opération déjà appliquée, quote sur une révision UI périmée) ont été corrigées dans le harnais, sans affaiblir les protections applicatives.

### Navigateur réel et persistance

Comptes, abonnements, recharges, clés et réponses entièrement fictifs dans deux `DATA_DIR` isolés ; **zéro projet prérempli**. Création de chaque projet par l’UI, choix et validation d’identité, puis proposition initiale et demande suivante. L’ancien essai mobile interrompu est conservé ; le cas mobile service final a été recréé dans une autre base, pas déclaré réussi sur une reprise partielle.

| Cas inédit | Vidéo initiale site | Demande suivante | Contrôles |
|---|---|---|---|
| Carnet de croquis en liège, ordinateur | IA directe simulée, 16:9, 10 s, deux plans | Publicité 9:16, voix FR autorisée | scénario librement retouché, accord après reload, lecture, version locale sans musique puis **nouvel encodage réel** sans nouveaux clips |
| Diagnostic d’espaces de travail, ordinateur | Idem, sans voix ni texte commercial | Publicité pour l’activité, voix FR | site/publicité rangés séparément, sous-titres et clips natifs |
| Tasses en grès, mobile 390 px | Idem | Publicité, voix FR | saisie, lecture, absence de débordement |
| Cours de piano, mobile 390 px | Idem ; seconde vidéo existante du plan réalisée lors de l’intégration | **Référence fournie réellement sélectionnée** dans MediaPicker, bytes transmis au mock | choix sans force, lecture, persistance, aucune image intermédiaire ni stock |

Les trois premiers parcours ont été créés sur `02c63a9a`. Le quatrième, refait après correction mobile, sur le build local `1b45acac` dont l’arbre est identique à `3186e028`. Les **quatre profils et les huit vidéos** ont ensuite été rouverts et lus sur **abad7c08**, sans nouvelle génération. Les huit MP4 téléchargés ont été analysés avec ffprobe et **entièrement décodés avec ffmpeg**, empreintes publiées. Les films de recette utilisent `testsrc2` animé et des titres de test : **ils ne représentent pas la qualité d’un fournisseur IA**.

Intégration native complémentaire : carnet → ORBE, cours de piano → Rive ; collecte des médias avec devis, vérification humaine de placement et handoff prêt ; choix initial réel dans la galerie, worker natif de thème, ancienne identité et vidéos conservées, bibliothèque respectivement 118 et 91 sections. Retouche de titre via **API native**, puis rechargement UI et vérification du texte dans l’iframe réelle ; ancienne version toujours restaurable. Ce n’est pas présenté comme un test du champ manuel de l’éditeur ou de sa conversation IA. Les captures du catalogue de sections réellement ouvert sur ordinateur et mobile complètent la preuve API (`theme-sections-browser.ts`) ; aucun clic forcé. La bulle de tutoriel a été fermée par son bouton avant cette interaction.

Les modèles de thème livrés par Claude peuvent encore contenir des photos de catalogue/Pixabay signalées dans l’UI : cette mission ne refait pas leur direction artistique. Les captures avec réponses synthétiques ne valident ni le rendu commercial final, ni les 28 autres thèmes, ni les nouveaux FRAISE/ONDE. Aucun export CMS installé ou connexion réelle n’a été testé ici.

### Coûts et sécurité de la recette

Dans chacune des deux bases isolées, `SELECT COUNT(*), COALESCE(SUM(cost),0) FROM ai_calls` retourne **0 appel, 0 micro-euro**. Les workers interdisent tout fetch externe ; le serveur interdit les fetch hors localhost ; le navigateur bloque les origines externes. Les réponses IA/vision sont injectées, la voix française Kokoro et les montages FFmpeg sont réellement locaux. Les reçus de mock listent les appels simulés ; ils ne sont pas des factures. Pas de nouvelle connexion, paiement, envoi social ou appel fournisseur. Aucun secret, cookie, base ou donnée client dans les preuves.

Le test de pause/reprise utilise la file native : clips acceptés conservés, réclamation du job puis reprise ; le second passage n’appelle pas deux fois le premier plan. Les tests couvrent également les refus sans accord, tarif/capacité indisponibles, référence absente, durée insuffisante, absence d’images vidéo et humains non autorisés. La qualité finale reste **provisoire, à vérifier**, même si le MP4 est techniquement valide.

## Accès au studio : limite précise et actualisation sûre

Cible donnée par Thomas : **https://organic-train-7vg7574wwxqj3xwq4-3000.app.github.dev/**.

**BLOQUÉ DANS CET ENVIRONNEMENT** : le proxy refuse la connexion à cette URL par HTTP 403 ; l’API Codespaces est également refusée et le connecteur GitHub ne propose pas d’exécution Codespaces. Cela ne prouve ni une panne du studio ni une absence de serveur. Aucun port rendu public. La branche et le SHA réellement servis à Thomas restent **inconnus**. La réponse locale `/api/version=abad7c08` ne prouve pas la mise à jour du Codespace.

Après fusion autorisée et vérifiée, dans le terminal du Codespace concerné, lire d’abord :

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
```

Ne pas transmettre une URL de remote contenant un jeton. Si des modifications locales existent : **ne pas les effacer, ne pas reset/stash automatiquement et ne pas changer de branche** ; les préserver et relever les noms de fichiers pour organiser l’actualisation. Si l’arbre est propre et main suit origin/main, lancer `npm run maj`. Cette commande arrête le serveur géré, effectue `git pull --ff-only` sur la branche courante, installe, reconstruit et redémarre web/worker sur le port existant, sans toucher les données.

Si l’arbre est propre mais sur une autre branche à préserver : arrêter le serveur du studio dans son terminal (Ctrl+C), `git fetch origin main`, puis créer une **nouvelle branche de consultation au nom libre** avec `git switch -c consultation/video-integration --track origin/main`, et lancer `npm run studio`. Si ce nom existe, en choisir un nouveau ; ne pas réinitialiser la branche. `npm run maj` sur une ancienne branche mettrait à jour cette ancienne branche, pas main. En cas de divergence ou de refus, s’arrêter et conserver l’état.

Ouvrir ensuite la même URL, puis `/api/version` : comparer son SHA compilé au commit effectivement intégré annoncé sur la PR. C’est cette vérification, avec une page studio ouverte, qui attestera la version accessible. **Aucune mise à jour du Codespace n’est prétendue dans ce rapport.**

## Reste à vérifier

1. Résultat final du contrôle obligatoire et fusion autorisée sur SHA exact (commentaire GitHub de livraison).
2. Actualisation et lecture de la version compilée dans le Codespace privé, accès actuellement refusé ici.
3. Fournisseurs réels : authentification, coûts facturés, fidélité du produit, qualité des mouvements et voix à l’écoute ; essais volontairement non lancés.
4. Qualité artistique des thèmes en cours chez Claude, réception des 28 autres thèmes, export/CMS réel et publication : hors recette de cette mission.
