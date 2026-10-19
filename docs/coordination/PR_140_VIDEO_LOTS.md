# PR #140 — mission vidéo, trois lots

Mission : commentaire [6266974136](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6266974136), lu intégralement. Base examinée : `6477ef1b7e832d92040f8744eaf00adab951207a`. Branche : `codex/publications-ia-qualite`. Travail de Claude sur les thèmes conservé, sans fusion de sa branche.

**Bilan final local : 2 211 tests réussis, 3 ignorés (PHP absent), 292 fichiers ; typage réussi. Quatre parcours ordinateur et quatre lectures mobiles terminés, preuves publiées. Fournisseurs/vision simulés, voix et encodages locaux réels ; coût API 0 €. Code applicatif/tests : `8122545d36cff5451861bed394596181735392a2`. La CI GitHub finale reste en attente, elle n’est pas annoncée verte.**

## Lot 1 — contrat et médias

- Le moteur V2 reçoit le contrat organique existant au complet : demande, texte, blocs, sources, objectifs, produit/service choisi. Les formats carré et paysage ne deviennent plus systématiquement verticaux. Le document versionné conserve le contexte et l'identité ; les mots originaux de ce contexte ne sont pas des textes affichés.
- La rédaction locale des contrats conserve les blocs entiers. Un texte trop long produit un défaut à corriger avant les médias. Le conseil organique n'impose plus un achat, devis ou rendez-vous. Le parcours guidé accepte également ce contrat et conserve la demande intégrale ; limite d'entrée explicite portée à 12 000 caractères.
- Image de départ puis clip contrôlés avec la relecture visuelle existante. Aucun contrôle disponible : image conservée à vérifier, aucun clip lancé. Résultat refusé : historique conservé, aucune substitution simplifiée ni nouvelle génération automatique. Le contrôle de clips échantillonne trois images : il ne prouve pas la fluidité continue ni une identité parfaite entre toutes les images.
- Les rendus guidés portent explicitement un état provisoire à usage manuel. Les plans de banque sélectionnés sans vision ne deviennent pas automatiquement réutilisables comme des plans acceptés.
- Les services incomplets et les créations initiales ayant échoué ne sont plus remplacés par une vidéo locale pour afficher un succès. Les étapes et textes ne sont pas effacés lorsque la vision manque ; l'aperçu demande leur vérification.

Fichiers : `src/lib/video-v2/{editorial,intent,strategy,script,engine,three-scenes,store,types,creation-videos}.ts`, `src/lib/social-v2/deps.ts`, `src/lib/stock/stock-clip.ts`, les deux routes vidéo, tests vidéo concernés.

Vérifications réellement exécutées : `npx tsc --noEmit` (succès), puis `npx vitest run tests/video-editorial-contract.test.ts tests/video-mission-reliability.test.ts tests/video-scenes.test.ts tests/video-vocabulaire-client.test.ts tests/videos-creation.test.ts tests/video-creative-guide.test.ts tests/video-v2.test.ts tests/video-creation-rights.test.ts` : **49 tests réussis, 8 fichiers**. Fournisseurs et contrôles de vision simulés ; le test du contrôle final encode et analyse un vrai fichier local. Aucun appel IA réel. La suite complète sera exécutée après les trois lots, conformément à la mission.

## Référence ONDE

L'affiche casque noir/bleu est écartée. Recherche effectuée dans les pièces jointes accessibles, les ressources locales et l'arbre distant de la branche `claude/fraise-onde-themes-reference` (consultée en lecture uniquement). Le script `scripts/lot2c-demo-local.ts` de cette branche exige un pack privé `Pack_Claude_Fraise_Onde/ONDE_AUDIO/` ; les neuf images et logos ne sont pas embarqués dans Git. Le dossier correspondant n'est pas présent dans cet environnement. Les pièces jointes disponibles contiennent l'ancien poster bleu et le ZIP ORBE/Rive, pas ce pack. **Référence noir/vert et logo non ouverts ici : contrôle visuel impossible pour le moment.** Aucun substitut ONDE créé ou publié. Les essais suivants utilisent des projets fictifs explicitement identifiés ; ils ne valident pas ONDE.

Fichiers précisément attendus d'après `tests/lot2c-fixtures.ts` et `reports/lot2c/ressources-licences.json`, commit Claude `84251d659ede` (lecture seule), tous absents ici :

- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/images/01-hero.webp`
- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/images/02-fond-clair.webp`
- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/images/03-autre-angle.webp`
- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/images/04-detail-coussinet.webp`
- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/images/05-detail-arceau.webp`
- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/images/06-banniere.webp`
- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/images/07-scene-salon.webp`
- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/images/08-scene-train.webp`
- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/images/09-scene-studio.webp`
- `Pack_Claude_Fraise_Onde/ONDE_AUDIO/logos/logo-proposition.png`

Les descriptions textuelles et l'inventaire ne remplacent pas l'ouverture des images. Aucun fichier privé de ce pack republié.


## Lot 2 — voix, sous-titres et montage

- Quatre scènes de cinq secondes occupent désormais les vingt secondes : pas de cinquième carte obligatoire. La conclusion et le vrai fichier du logo sont des calques du dernier clip, éditables dans le document existant. CTA commercial facultatif pour les contenus organiques.
- Voix locale française raccordée aux deux parcours existants. Choix et accord pour une voix synthétique persistés dans la mémoire du projet ; aucune voix ONDE préexistante ou clonée supposée. Le menu guidé expose le choix disponible ; l'absence des fichiers vocaux requis est indiquée. Un échec d'une voix choisie bloque le résultat attendu.
- Phrases entières conservées, même trop longues : erreur explicite et demande d'adaptation. Suppression de la réduction automatique des phrases du script local V2. Durée réelle du WAV mesurée ; nettoyage des silences avant mesure ; mixage conservant cette durée ; musique atténuée sous la voix. Sous-titres par phrase mesurée, groupes répartis proportionnellement : **pas d'alignement mot à mot**.
- Réparation des sous-titres V2 fondée sur les durées audio enregistrées, et non sur la seule durée des plans.

Vérifications : TypeScript sans erreur ; **52 tests ciblés réussis / 9 fichiers** (`lot2-tests.txt`). `scripts/verify-video-lots.ts` : quatre vrais encodages locaux H.264/AAC, 20 s, 30 images/s, avec synthèse française, musique, SRT/VTT ; produit/service × publicité/organique, interruptions/reprises et version client conservée. Fournisseurs images/clips et relectures visuelles **simulés** ; mires explicitement fictives. Zéro ligne `ai_calls`, coût API réel **0 €** ; coût CPU/stockage non mesuré.

La voix a réellement été installée et exécutée dans un dossier temporaire isolé : modèle libre du dépôt officiel sherpa-onnx, interpréteur Python avec dépendances temporaires, sans changement de configuration client. Échantillon : `reports/pr140-video-lots/voix-francaise-test.wav`. Cela prouve une synthèse exécutée et un fichier lisible, pas la qualité naturelle validée par une écoute humaine indépendante.

Inspection des images extraites : chevauchement du titre par le médaillon initial détecté et corrigé. `scripts/verify-video-ending.ts` a rendu les quatre fins corrigées à 19 s, dans le moteur natif ; captures `*-fin-corrigee.png`, mesures `lot2-ending-checks.json`. Les quatre premiers MP4 sont un **précontrôle d'encodage antérieur à ce dernier ajustement de calques**, pas les vidéos finales de livraison. Le lot 3 doit refaire les parcours UI et leurs rendus finaux avec cet ajustement.

Fichiers supplémentaires : `creative-memory.ts`, `voice.ts`, `audio.ts`, `deps.ts`, `final-check.ts`, route `videos/creative-memory`, `guided-video.tsx`, tests `video-voice-timing.test.ts`, scripts de preuve vidéo. Ni modèle vocal ni pack client privés ajoutés au dépôt.

## État du lot suivant

État au commit du lot 2 : lot 3 (devis/reprises/parcours UI) à réaliser ensuite. Voir sa réception ci-dessous. Les essais payants restent reportés ; aucun thème, déploiement, publication sociale ou merge.

## Lot 3 — accords, devis, reprise et réception

Le premier commit du lot 3 a été livré avec une réception encore partielle. La **réception complémentaire finale** ci-dessous distingue les parcours effectivement terminés, les preuves téléchargées et les limites ; les précontrôles du lot 2 ne sont pas présentés comme la livraison ONDE.


### Changements

- Le scénario guidé est une tâche native `video.scenario`, séparée des médias. Son coût texte est montré avant le clic ; scénario relu/modifiable, puis accord couvrant la demande, le contexte, les références, la voix, les routes, le devis et une expiration. Un contrat éditorial fourni ou une correction du scénario ne redéclenche pas la rédaction IA. Les scénarios enregistrés et encore compatibles peuvent être repris depuis l’interface après rechargement. Le coût de la rédaction déjà consommé est retiré de l'enveloppe restante. Choisir une photo conserve le scénario à corriger et ne commande pas une nouvelle rédaction.
- Devis par étapes réellement raccordées : scénario, images nécessaires (réemploi des photos possible), contrôles images, durée totale de clips générés, contrôles de passages, calcul local. Politique guidée propre : zéro régénération créative automatique, une reprise explicite d'une scène au plus, un éventuel ajustement local de contraste. Le plafond couvre premier passage + cette reprise ; réservations et budget disponible natifs s'appliquent toujours. Aucun droit de forfait changé : Créer n'obtient pas de clips IA.
- Reçus privés avant envoi, fichier reçu enregistré avant décodage/asset. Une reprise réutilise le fichier reçu et les scènes déjà acceptées. Une réponse perdue, un traitement concurrent ou un reçu incertain bloque un nouvel envoi. Fenêtre non garantie : arrêt entre réception réseau et écriture durable ; rapprochement fournisseur manuel nécessaire, pas de promesse de transaction atomique entre deux systèmes.
- Le guidé reprend la scène refusée et termine les scènes encore absentes ; il ne repaie pas les scènes acceptées. Une erreur incertaine n'ouvre pas une régénération aveugle. Les versions refusées restent non réutilisables comme finales.
- Rendus V2 et guidé : une édition concurrente conserve la version du client et range le rendu obtenu dans une lignée isolée. La reprise ne recharge pas le plafond initial. Le remplacement explicite d'un clip V2 est limité à une reprise ; l'ancienne version reste consultable.
- Services V2 : même si le planificateur proposait une génération, recherche de plans de métier avant montage ; manque explicite, pas de substitution. Une section facultative omise dans un scénario n'enlève plus sa durée du total. Texte entier en sous-titres même sans voix ; timing par durée de scène alors signalé sans alignement audio.
- La relecture finale V2 de quelques images ne prétend plus prouver le mouvement continu ou la naturalité audio : résultat manuel provisoire lorsque ces contrôles restent inconnus.

Fichiers principaux : `approval.ts`, `receipts.ts`, `chain-quote.ts`, `three-scenes.ts`, `engine.ts`, `script.ts`, `quality.ts`, `store.ts`, `types.ts`, `deps.ts`, `strategy.ts`, `intent.ts` dans `src/lib/video-v2/` ; routes `creative/video` et `videos/v2`, `guided-video.tsx`, `video-v2-panel.tsx`, `subject-picker.tsx`, handler natif `worker/handlers.ts`. Tests nouveaux : reçus/accords, conflit d'encodage réel, préservation des phrases, photos réemployées, reprise d'une seule scène ; tests existants mis à jour pour les nouvelles exigences (quatre clips entiers, absence de substitut après refus).

### Protocole et preuves

Harnais isolé : `scripts/verify-video-lots.ts` (`SEED_ONLY=1` pour préparer les quatre comptes/projets fictifs), `verify-video-network-guard.mjs` (serveur local seulement), `verify-video-ui-runtime.ts` (tâches natives avec fournisseurs simulés), `verify-video-ui-browser.ts` (Chromium réel) et `verify-video-chain-quote.ts` (calcul natif sans requête fournisseur). Les faux identifiants fournisseurs résident uniquement dans la base temporaire ; aucun export de cette base, des sessions, reçus privés ou journaux HTTP.

Le script historique du lot 2 reste un précontrôle. Sa simulation d'interruption a été adaptée : arrêt avant envoi, et non erreur fournisseur incertaine que la nouvelle protection interdit de relancer. Les nouvelles preuves finales proviennent des parcours UI du lot 3, pas des anciens MP4.

**Incident de reprise du 19/10** : les 76 tests ciblés annoncés avant la coupure avaient réussi. Le premier contrôle navigateur ne s'était pas terminé : mauvais sélecteur de carte après le premier rendu. La première suite complète donnait 2 187 réussites, 11 échecs, 3 ignorés / 290 fichiers. Les attentes obsolètes (carte de fin séparée et substitut local), fixtures vocales et stock ont été révisées ; problèmes réels de sélection service et durée de scénario corrigés. Le serveur local a aussi été arrêté pendant une surcharge mémoire de l'environnement : données et MP4 conservés, relance des vérifications avec concurrence réduite, sans régénération fournisseur. Les bilans finaux figurent plus bas.

### Matrice de réception

| Élément | Branché | Test local | Simulation / limite réelle |
|---|---|---|---|
| Contrat complet, publicité/organique, produit/prestation sélectionnés | Deux moteurs existants | Contrats, API et documents versionnés | Rédaction fournisseur non appelée ; qualité créative réelle non attestée |
| Recherche de plans service, étapes, provenance et non-répétition | Recherche native stock | Orchestration et sélection contrôlées par tests | Fichiers de mire remplacent Pixabay dans le navigateur ; pertinence sur vraies vidéos à vérifier |
| Photos → images → vrais clips produit | Adaptateurs existants, contrôles avant montage | Images, reçus, refus et reprise ciblée | Images/clips/vision simulés ; fidélité ONDE non testée |
| Voix française et choix persistant | Synthèse locale installable, deux parcours | Vrais WAV, mesure, mixage et MP4 | Naturalité non validée par écoute humaine indépendante |
| Sous-titres complets | Documents + SRT/VTT | Durées de phrases mesurées, export et absence de coupe | Répartition proportionnelle dans les phrases, pas d'alignement mot à mot |
| Musique et conclusion sur le dernier plan | Calques et audio existants | Vrais encodages et images extraites | Aucun achat de piste ; vérifier la licence du morceau choisi en exploitation |
| Accord, coût, plafonds, reçus, interruption, versions concurrentes | API/worker/budget natifs | Tests ciblés, annulation/concurrence, reprise UI | Rapprochement d'une tâche distante incertaine non automatisé |
| Lancement → suivi → lecture → modification/rendu → téléchargement | Vraie interface du studio | Parcours et captures du lot 3 | Base de test exclusivement ; aucun environnement client/de production validé |
| UGC, thèmes, publication sociale, déploiement | Hors de cette réception | Aucun | Attendent validation/autorisation ; aucune modification des thèmes Claude |

### Validation réelle future — préparée, NON exécutée

1. Fournir dans le projet isolé autorisé les **neuf images ONDE noir/vert et le logo séparé** du pack privé, vérifier visuellement identité, droits et angles montrables. Aucun usage de l'ancien poster noir/bleu ; pas d'invention d'une face invisible. Choisir une voix synthétique et enregistrer son accord.
2. Relever les routes, tarifs, devise/région, solde et droits effectifs ; recalculer le devis natif et le coût facturable des références. Faire approuver scénario exact 4 × 5 s et enveloppe globale avant médias. Une nouvelle autorisation écrite reste nécessaire : les essais payants sont reportés.
3. Produit : quatre vrais clips distincts, produit entier et identique, logo/couleurs/matières cohérents, pas de personne ni de caractéristiques inventées, mouvement continu regardé sur chaque clip. Dernier clip avec logo/CTA, pas de cinquième carte. Écouter intégralement la voix et la musique, contrôler toutes les phrases, sous-titres et durée.
4. Service : choisir une prestation vérifiable (par exemple préparation et peinture d'une pièce), chercher des passages précisément associés aux étapes, garder source/licence et mention d'illustration dans le studio. Aucun plan stock présenté comme réalisation du client ; personnes selon autorisation. Contrôler pertinence et distinction de chaque scène, puis contenu organique sans CTA commercial imposé.
5. Généralisation hors cas utilisés ici : réparation de vélos, entretien de pompes à chaleur, conseil comptable ; produit alimentaire emballé et accessoire à plusieurs variantes. Critères identiques, faits et photos propres à chacun ; aucune condition sur le nom d'une démo. Réserver des cas inconnus jusqu'à la réception, sans développer de nouvelles règles pour leurs noms.
6. Déclencher un refus sur une seule scène et vérifier conservation des autres ; une reprise explicite au maximum et coût de celle-ci seulement si exécutée. Simuler interruption/annulation ; si statut distant incertain, rapprocher reçus et facturation avant tout envoi supplémentaire. Modifier pendant un encodage et vérifier préservation de la version client.
7. Réception ordinateur/téléphone : lecture réelle, historique après modification et nouveau rendu, MP4/SRT/VTT téléchargés et rouverts, durée/résolution/codecs mesurés, visionnage intégral/écoute. Noter dépenses **observées** séparément des réservations. Un succès technique n'est pas une validation professionnelle.

### Limites qui subsistent

Pack ONDE noir/vert privé absent : aucune vérification visuelle du véritable casque ou du logo. Le lien de prévisualisation Claude fourni précédemment n'était pas accessible ici. Les fournisseurs réels, l'index Pixabay courant, les droits d'une piste externe, la facturation réelle et l'environnement de production n'ont pas été testés. Aucun coût CPU/stockage/contrôle humain mesuré. Aucun rendu synthétique présenté comme publicité ONDE finale. Les reçus bloquent les doublons évitables, sans résoudre automatiquement les tâches distantes incertaines. Un changement de demande/contexte peut ouvrir une nouvelle lignée et nécessite un nouveau devis ; la réutilisation ne garantit pas un cache global de toutes les demandes voisines.

La création initiale automatique partage le moteur et le refus des substitutions, mais son storyboard préalable et son accord global de création n’ont pas reçu ici une recette UI séparée équivalente aux deux écrans vidéo. Ce point demeure à vérifier avant d’étendre les conclusions à tous les chemins de création.

Périmètre des reçus : scénario/images/clips/contrôles du guidé et clips générés V2. Les sous-moteurs V2 existants (rédaction, images, stock) gardent aussi leurs propres barrières natives ; leur réception à chaque fenêtre de panne n’est pas attestée comme un protocole transactionnel unique. V2 conserve ses politiques historiques de contrôle/reprise, lues dans son devis ; la limite guidée d’une seule reprise n’est pas attribuée à tous les anciens sous-chemins V2.

Le passage complet sous charge a localisé trois dépassements de délai dans des mixages FFmpeg (processus actifs, sortie WAV vide). Relancer exactement l'un de ces filtres seul a terminé ; une variante de filtre a aussi dépassé huit secondes. **La cause exacte demeure une hypothèse de concurrence/ordonnancement, pas un défaut déterministe démontré.** Le graphe audio complexe est désormais limité à un thread ; un test exécute trois mixages réels avec voix courtes retardées et fond musical plus long, avec durée, signal et crêtes mesurés. Les trois processus orphelins appartenant précisément au dossier de cette suite ont été arrêtés ; aucun autre processus n'a été touché. Les résultats après correction sont consignés dans le bilan final.

Le contrôle global suivant a terminé : **2 199 réussites, 3 dépassements de délai, 3 ignorés, 290 fichiers** (24 min 28 s). Les trois délais concernent des mixages audio dans les deux fichiers V2. Le simple bornage des threads n'a pas suffi : une autre passe ciblée a encore rencontré un délai. La boucle musicale `aloop` à tampon très large a donc été remplacée par une répétition du fichier fini à l'entrée FFmpeg ; le passage musical choisi est préparé avant répétition lorsque son départ n'est pas zéro, puis nettoyé. Les phrases et durées des voix restent intactes. Trois répétitions du cas audio isolé ont terminé en environ 1,7 s chacune ; ce relevé et le test réel sont conservés, sans prétendre démontrer l'absence de toute panne future.

Commandes supplémentaires exécutées : `SEED_ONLY=1 DATA_DIR=/tmp/ecs-test-video-mission-reproduction-20261019 npx tsx scripts/verify-video-lots.ts` (quatre projets fictifs, aucun média généré) ; `npx vitest run tests/video-audio-termination.test.ts tests/video-creation-rights.test.ts tests/audit-ecrans.test.ts --maxWorkers=1` (20 réussites) ; `npx vitest run tests/video-editorial-contract.test.ts tests/video-audio-termination.test.ts --maxWorkers=1` (5 réussites) ; `npx vitest run tests/video-creation-rights.test.ts tests/video-editorial-contract.test.ts --maxWorkers=1` (6 réussites). TypeScript revérifié après les modifications. Les comptes de tests se recouvrent : ne pas les additionner comme des tests distincts.

Le scénario IA organique V2 n'est plus rejeté faute de CTA commercial (le contrôle est cohérent avec l'intention). Un bloc explicitement marqué CTA conserve son rôle. Les photos de scènes proposées dans le guidé sont réservées au produit : une photo ne peut pas être acceptée puis ignorée dans le montage vidéo illustratif d'un service. Le choix manuel de vidéos client dans ce guidé reste à réceptionner ; l'inventaire vidéo du moteur V2 existant est conservé. Captures UI en français seulement, version anglaise non réceptionnée ici.

Après remplacement de la boucle musicale : `npx vitest run tests/video-audio-termination.test.ts tests/video-v2-engine.test.ts tests/video-v2-bench.test.ts --maxWorkers=1` : **19 réussites, 3 fichiers, 158,26 s**. Cela inclut les cinq activités du benchmark et les deux fichiers qui dépassaient les délais. Les autres résultats du passage global restent distingués de cette nouvelle passe ciblée ; aucun ancien échec masqué. Aucun fournisseur IA réel utilisé.

### Réception complémentaire — encodage interrompu et lecture des passages

Le parcours organique produit a volontairement refusé sa deuxième image, puis repris cette seule scène : **5 images simulées au total, 4 clips simulés, aucun autre clip refait**. L'encodage Full HD a ensuite été interrompu dans cet environnement (FFmpeg tué, compteur système OOM augmenté). Les fichiers sources, reçus et le document à quatre scènes sont restés présents. La reprise suivante est un rendu local du document existant, pas une nouvelle génération.

Correctifs complémentaires : décodage/encodage limités à deux threads et filtres simples à un thread, avancement pendant le rendu, arrêt de l'encodeur si le montage est annulé ou illisible ; document conservé après premier échec V2 également ; accès au document conservé depuis la carte guidée, métadonnées de rangement retrouvées même avant un premier MP4 réussi, carte d'erreur retirée après un rendu ultérieur et doublons de cartes filtrés. Numéro de version du dialogue corrigé (l'API renvoie un objet versionné, pas un entier).

Le refus de rendre un clip absent en écran noir a aussi révélé une lecture hors passage dans l'habillage V2 : les reprises graphiques cherchaient parfois après la fin du clip. Les passages de l'habillage et du calage musical restent maintenant dans leurs limites ; faute de passage assez long, la composition déjà prévue est conservée, sans inventer un morceau de vidéo. Durées réelles des clips mesurées/enregistrées et réutilisées ; plus de durée arbitraire de quatre secondes pour un clip de bibliothèque inconnu. Les mires de tests fournissent désormais toute la durée simulée demandée. Un clip reçu trop court est signalé avant validation ; pas d'arrêt sur image ajouté pour le faire passer.

L'accord V2 est vérifié sur le projet racine comme dans l'API, tout en donnant au scénario la prestation sélectionnée ; cela évite d'invalider à tort l'accord lorsqu'on cible la deuxième prestation. La conservation en cas d'échec respecte aussi une modification concurrente.

Vérifications après ces ajustements : **33 tests réussis / 6 fichiers** (moteur V2, cinq scénarios, habillage, absence de clip, reprise de rendu, droits), puis **16 réussites / 4 fichiers** pour les protections et nouveaux cas d'interruption/sélection ; TypeScript sans erreur. Ces deux listes se recouvrent. La recette navigateur finale et les mesures des téléchargements suivent séparément.

### CI distante observée

Commit `c91812edb628470f296a245c83a8b06f9ac3b506` : **2 207 tests réussis, 291 fichiers**, en 636,35 s ; TypeScript et construction/démarrage de l'image Docker réussis. [CI et preuves extraites](../../reports/pr140-video-lots/ci-code-c918.txt). Le job global échoue ensuite pendant Theme Check sur **lookbook / niche**, avec `TypeError: Cannot read properties of undefined (reading '$schema')` ; origine exacte non déterminée. Le build de production est alors ignoré. Aucun fichier de thème n'est modifié par ces lots ; ce contrôle n'est pas annoncé réussi. Le complément de reprise est le commit `4c056ac22539bb4c77c2953b38348a98ac4fbda6` ; sa CI et ses preuves navigateur sont suivies séparément.

## Réception finale après la coupure — 19 octobre 2026

**Code final : `8122545d36cff5451861bed394596181735392a2`**. Les deux MP4 publicitaires ont été conservés depuis le moteur `c91812ed` ; les deux MP4 organiques ont été rendus avec `4c056ac2`. Les quatre documents et téléchargements ont ensuite été relus dans le code final `8122545d` ; ce dernier complément ne change que le formulaire mobile, son harnais et le test de calage musical. Aucune image ni aucun clip déjà reçu n'a été régénéré pendant la reprise d'encodage. Le harnais de recapture consulte les résultats, recalcule gratuitement le devis et ouvre l'éditeur sans modification du document.

Les **quatre parcours ordinateur et les quatre lectures mobiles sont terminés**, sans erreur JavaScript collectée : publicité produit, publicité service, publication organique produit, publication organique service. Passage par les onglets existants, scénario relu/modifié avant lancement, suivi de tâche, lecture du résultat, musique retirée puis rétablie en versions distinctes, nouveau rendu local de la version modifiée, téléchargement natif MP4/SRT/VTT. Les premiers parcours déjà terminés ont été réutilisés après la coupure. Le refus d'image et sa correction ciblée précèdent la reprise gratuite du document dont le premier encodage avait été interrompu ; preuves et reçus conservés.

Le navigateur a révélé un **débordement réel du formulaire mobile après chargement du devis** : le bouton héritait d'un texte sans retour à la ligne et imposait sa largeur minimale à la grille. `guided-video.tsx` borne la grille et le bouton, permet de répartir les éléments et fait revenir son libellé à la ligne. Le contrôle est repris avec le devis chargé, et non pendant « Calcul du prix… ». Les huit captures finales ont été refaites après décodage de vraies images dans les lecteurs ; le tutoriel de première visite est fermé avec son bouton natif. Les images longues des sections peuvent inclure les barres fixes du studio ; les vues `*-lecteur-*` montrent aussi le cadrage normal de l'écran.

Résultats mesurés sur les **fichiers réellement téléchargés après modification/rendu** :

| Parcours | Durée / image | Audio mesuré | Sous-titres / stockage |
|---|---|---|---|
| Produit publicité | 20 s · 1080 × 1920 · 30 i/s · H.264 | AAC · −16,4 LUFS · crête −4,7 dB | Quatre phrases, SRT/VTT ; empreinte identique à l'asset de la dernière version |
| Service publicité | idem | AAC · −16,2 LUFS · crête −4,1 dB | idem |
| Produit organique | idem | AAC · −16,4 LUFS · crête −4,5 dB | idem |
| Service organique | idem | AAC · −16,4 LUFS · crête −4,0 dB | idem |

Décodage intégral des quatre MP4 sans erreur. Seize images extraites ouvertes (1, 8, 13,5 et 19 s), vues ordinateur/mobile et dialogues d'édition inspectés. Les scènes restent des **mires synthétiques** ; ces mesures ne prouvent ni la pertinence d'un fournisseur réel, ni la qualité professionnelle d'ONDE, ni une écoute humaine complète et indépendante. Les montages organiques ne comportent pas de bouton commercial imposé. Chaque historique contient toujours la version sans musique ; le document courant garde quatre plans et quatre phrases vocales. Relecture de la base isolée : **zéro ligne `ai_calls`, coût API réel 0 €**. Coût CPU/stockage non mesuré.

**Preuves consultables :** [index des captures, enregistrements et MP4](../../reports/pr140-video-lots/README.md), [contrôles navigateur](../../reports/pr140-video-lots/ui-final-checks.json), [recaptures après chargement](../../reports/pr140-video-lots/captures-final-checks.json), [mesures/SHA-256](../../reports/pr140-video-lots/final-media-checks.json), [versions et concordance des fichiers](../../reports/pr140-video-lots/persistence-final-checks.json), [commandes/tests](../../reports/pr140-video-lots/tests-final.txt).

Le devis natif conditionnel pour la chaîne 20 s / quatre plans est **1,272156 € au premier passage**, **0,304279 € pour refaire une scène**, **1,576435 € au plafond**. Ce sont des estimations de configuration isolée, avec hypothèses de tokens, conversion configurée et plafonds de réservation des images ; pas une facture ni un prix garanti en production. [Détail des routes, postes et limites](../../reports/pr140-video-lots/DEVIS_CHAINE.md). L'interface client conserve les pourcentages du budget, aucun nouveau paiement ni fournisseur ajouté.

### Derniers contrôles et reste à réceptionner

La CI de `4c056ac2` a donné **2 212 tests réussis, un échec / 292 fichiers** ; typage et Docker réussis, Theme Check/build ignorés après l'échec. Le test `song-composer.test.ts` exigeait un calage rythmique tout en utilisant tous les passages vidéo jusqu'à leur fin : ces contraintes ne permettent pas de rallonger un plan sans sortir de sa fenêtre. Le test vérifie maintenant le calage sur un montage composé où les plans filmés peuvent être raccourcis, et un cas séparé garantit la conservation de toutes les coupes lorsque le rythme dépasserait les passages approuvés. **14 tests / 2 fichiers réussis** après cet ajustement ; `npx tsc --noEmit` réussi. Aucun relâchement de la barrière de durée source. Le résultat du dernier passage complet figure ci-dessous ; la CI distante est distinguée de ce résultat local.

Restent hors validation : vrais fournisseurs et Pixabay en ligne, neuf photos/leur logo ONDE noir/vert privés absents (liste plus haut), naturalité vocale et contrôle continu humain de vraies scènes, facturation fournisseur/production, chemin initial automatique et UI anglaise avec une recette équivalente. Le défaut Theme Check `lookbook / niche` observé sur `c91812ed` reste à diagnostiquer dans son périmètre ; aucun thème modifié. UGC, publication sociale, nouveaux thèmes, merge et déploiement non engagés.

### Gates finales exécutées

`npx vitest run --maxWorkers=2` : **2 211 réussites, 3 ignorés, 292 fichiers réussis / 292, 906,25 s**, code applicatif/tests `8122545d`. Les trois tests ignorés dépendent de PHP, absent ici : deux dans `calendrier-reservation.test.ts`, un dans `cms-v2.test.ts`. Ce ne sont pas trois essais fournisseurs. Aucun nouveau dépassement de délai, aucun nouveau processus tué pour manque de mémoire dans cette passe. `npx tsc --noEmit` : succès, revérifié après les scripts de capture. `git diff --check` : succès.

Les arbres `src/` et `tests/` sont identiques entre le commit applicatif et celui des captures `b65c231dbc205f8492994ee3afbf20638f7e6ebf` : [empreinte et résultats](../../reports/pr140-video-lots/code-tested.json). Les fichiers finaux de bilan ne changent pas le code testé.

**CI distante finale non achevée** : les jobs du [passage des preuves](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39280066718) sont encore `queued` lors du relevé ; aucun runner/démarrage de job n’est observable. Le commit documentaire final déclenche sa propre CI. Aucun succès global distant ni build de production final prétendu. Les échecs historiques détaillés plus haut restent visibles ; le défaut Theme Check observé n’est pas considéré corrigé par la suite Vitest.

Livraison : branche `codex/publications-ia-qualite`, même PR #140 ouverte sans fusion. Captures, quatre MP4, SRT/VTT, huit enregistrements d’interactions, séquence d’interruption préservée, mesures, devis et ZIP consultable dans l’index. Aucun secret, base, session ou pack privé publié. Les fichiers de travail et la base isolée restent conservés localement ; aucun projet client utilisé.
