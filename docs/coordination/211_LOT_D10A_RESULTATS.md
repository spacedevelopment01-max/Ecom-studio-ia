# D10a — Montage et animation locale dans SYNA

29 octobre 2026, PR #238, branche `codex/211-lot-d10a-video-syna`. **Tranche locale de D10, pas le D10 complet.** Aucun merge, déploiement, activation ou appel fournisseur réel.

Code et build final : `7118b73ed013704062a8ee4adf568b04c75a56ba`. Documents : commit documentaire ultérieur. Base de travail D9c `a74b93759fef579a95b9cbcfc0fbe92ef6818413`, application D9c `378ac552c43b7602b4afe816aa2e31fd77ff026e`. La contre-recette D9c publiée séparément à `f82484255abef6a42f723648188c607773980d91` reste une dépendance de revue ; son fichier de harnais corrigé à `f163b7690068398d6e95ebcbab1089c7f9ef0df8` est repris à l'identique dans cette branche, sans fusion ni réécriture d'historique.

[Captures, films et fichiers natifs](preuves-211-D10a/README.md) · [Vérifications](preuves-211-D10a/verifications.json) · [Matrice exhaustive et limites](211_D10A_COUVERTURE.md).

## Ce qui est raccordé

Dans la même conversation et mémoire SYNA : demande exacte → réponse cognitive typée → sources, textes, durées et musique relus → devis local à **0 % de budget IA**, distinct du devis cognitif → accord → document/version et worker `video.v2.render` natifs → fichier MP4 provisoire, lecture/téléchargement → retouche ciblée ou restauration → reprise et récupération du résultat acquis.

- Animer des images réellement acquises avec caméra locale, titres, format et musique native. Aucune prise de vue ou voix IA n'est produite par cette opération.
- Modifier les opérations natives représentables : durée d'un plan, couche texte désignée, transition, musique et gain. Refus avant exécution si le moteur arrondirait, tronquerait, allongerait une source vidéo trop courte ou modifierait implicitement une autre piste. Le parcours « intro » testé est une réduction de durée, pas une réinvention créative.
- Restaurer une version conservée en créant une nouvelle version. Garder les anciens MP4 et leurs sources, couches, audio, stratégie et empreintes.
- Retrouver un résultat identique et encore courant sans nouveau job, version, rendu ou débit après l'accord de récupération. La réflexion cognitive préalable conserve son devis propre. Une sortie absente ou modifiée ne déclenche pas de remplacement automatique.
- Ouvrir l'éditeur vidéo existant, récupérer son document JSON et retrouver les MP4 dans la galerie native Publications. Les publicités restent soumises au droit publicitaire natif ; les services exigent un choix de communication déjà autorisé, distinct du site généraliste. Aucun choix d'angle ou d'identité n'est fait par SYNA.

Le drapeau `STUDIO_CONVERSATION_VIDEOS` est **fermé par défaut** et dépend des fondations conversationnelles existantes. Les quatre formats déclarés sont 9:16, 16:9, 1:1 et 4:5 ; cette recette compilée exerce 16:9, 9:16 et 4:5, pas un parcours SYNA 1:1 distinct. Les paramètres et médias restent liés au propriétaire, au projet et aux versions exactes. Aucun script, URL de média ou fournisseur arbitraire fourni par le modèle n'est accepté.

## Défauts trouvés et corrigés

1. **Rendu inutile après restauration.** Un test rouge figé a montré qu'un montage restauré n'était plus reconnu comme identique. La comparaison porte désormais sur le document de rendu, ses fichiers/SHA, stratégie, portée et version courante. La réutilisation ne se fonde ni sur le nom d'une démonstration ni sur un nom de fichier.
2. **Logo acquis refusé à l'animation.** Le garde réservé à la retouche photo IA empêchait aussi la réutilisation locale des pixels. Un résolveur distinct permet cette animation sans appel IA ; la retouche photo IA refuse toujours les logos et la génération conserve son garde sur les personnes. Les tests de personne portent sur les métadonnées et les octets réutilisés ; aucun portrait réel ou jugement de fidélité par vision n'est qualifié.
3. **Erreur technique dans la conversation.** L'inspection réelle du navigateur montrait la commande d'encodage et un chemin serveur. La conversation affiche désormais un échec clair et la référence de la tâche ; le diagnostic technique reste inchangé dans la tâche native. Une contre-recette sans worker ni fournisseur reproduit le défaut sur l'ancien build, puis vérifie sa correction et les trois MP4 antérieurs.
4. **Recette héritée D9b.** Le contrôle du vieux littéral SDK est remplacé par des assertions sémantiques et une comptabilité renforcée, identiques au correctif D9c f163b769. Aucune erreur de relecture n'est transformée en livraison. La panne fournisseur à coût incertain demeure distincte de la réponse complète invalide à usage connu.
5. **Harnais vidéo.** Les anciennes itérations sont conservées : texte natif encodé en JSON recherché à tort sous sa forme brute ; lecteur caché et lecteur de galerie trouvés ensemble ; captures prises avant décodage. Le contrôle actuel conserve toute la demande, cible la galerie visible et décode les lecteurs avant capture. Aucun défaut du harnais n'est présenté comme une validation précédente réussie.

## Vérifications et version exacte

- `npx tsc --noEmit` : réussi, sources inchangées.
- `npx vitest run` : **3 951 réussis, 45 ignorés**, 453 fichiers réussis et un ignoré ; aucune erreur. Les 70 contrôles ciblés dans six fichiers restent inclus dans cette suite.
- `npm run build` : nouveau build propre exact **7118b73ed013704062a8ee4adf568b04c75a56ba**, démarré sans `.next` ; premier artefact compilé conservé séparément.
- `npx tsx scripts/verify-agent211-build.ts … --videos-ui` : **quatre parcours complets réussis sur ce build exact**, plus contrôles de base du harnais. Aucune erreur JavaScript ni débordement horizontal observé.
- Reprise ciblée de l’échec sur une copie des fixtures : rouge sur l’ancien build, verte sur7118b73e, sans worker ; diagnostic natif conservé et trois anciens MP4 téléchargés avec SHA identiques.
- Reprise complémentaire des quatre galeries/SYNA, ordinateur et téléphone : **16 captures et huit téléchargements**, trames réellement peintes contrôlées, appels/réservations/usages/tâches/publications/campagnes et 25 versions inchangés. La zone du contrôle de pixels est mappée à l’image, pas aux bandes et contrôles du lecteur ; seuil identique, seulement pour les motifs synthétiques de recette.
- **90 captures finales PNG et deux diagnostics**, quatre films de navigateur MP4 avec leurs quatre WebM originaux, douze MP4 natifs, douze JSON de versions et huit sources PNG synthétiques. Les deux captures initiales noires restent en diagnostic ; leurs remplacements reprennent les mêmes fichiers, sans rendu.
- Les douze MP4 sont réellement décodés : mouvement central mesuré de **1,83 à4,21** niveaux RGB moyens sur255 entre les trames échantillonnées ; piste silence à−91dB, retouche musicale de−16,6à−16,1dB. Mesures techniques de présence, pas de qualité artistique. Trente-six trames natives sont fournies sur quatre planches.
- Quatre documents JSON initiaux sont effectivement téléchargés et comparés dans le navigateur ; les douze JSON joints sont extraits des versions natives. Un JSON avec IDs de médias n’est pas un projet portable autonome hors du Studio.
- **26 fichiers de code / 420 306 octets réellement retéléchargés depuis GitHub**, empreintes comparées. Publication documentaire et vérification distante distinctes.

Les sources ont été figées et comparées aux objets Git publiés, worker compris. Le premier commit `221b130e8d63fdd92c62d54b1da9790d8075b5df` avait déjà 3 951 tests réussis / 45 ignorés, 70 ciblés, types et build propre. Les quatre parcours sont ensuite passés sur ce build, avec les corrections de harnais indiquées. **Ces preuves intermédiaires ne sont pas prêtées au build final** : la présentation de l'échec a changé depuis, puis les contrôles ont été rejoués sur le code et le build final ci-dessus. Une suite devenue obsolète a été interrompue uniquement dans son groupe de processus isolé ; statut/source modifiée conservés et exclus de la preuve finale.

Quatre activités fictives, sans règle applicative dépendant de leurs noms : cadres papier mono-produit, outils de pliage multiproduits, réparation textile, révision de machines à écrire comme service inédit. Les marques sont des données de recette. Les choix de communication service sont explicitement préparés dans le moteur natif avant le parcours ; le test ne fait pas passer cette préparation pour un choix autonome de SYNA.

Chaque parcours réalise un montage de 6 secondes, une retouche à 5 secondes avec musique, une restauration à 6 secondes, puis une récupération sans rendu supplémentaire. Lecture réelle, dimensions/durée, téléchargement navigateur et SHA, document JSON identique, éditeur manuel, galerie, autres largeurs et réouverture sont contrôlés. Les mesures de mouvement et de son des MP4 sont dans les preuves. Le quatrième cas provoque **un échec d'encodeur simulé** et contrôle l'absence de fausse livraison et de retry ainsi que la conservation des fichiers précédents. Les tests couvrent aussi compte étranger, CSRF, coût forgé, sources ambiguës/étrangères, service erroné, version/contexte modifiés, déclassement de forfait et droits publicitaires.

## Coûts et portée des preuves

**20 appels d’inférence texte HTTP simulés, plus20 requêtes locales de comptage de tokens simulées**, dont trois du harnais de base et dix-sept liés aux quatre vidéos. Zéro appel HTTP image, clip ou voix. **20 usages connus**, total **158 240 micro-euros fictifs**, aucune réservation incertaine dans cette recette D10a. Les 22 lignes `ai_calls` comprennent aussi deux traces de préparation des fixtures service ; elles ne représentent pas22 appels HTTP. Le montage a12 rendus MP4 réussis et une tentative d’encodeur volontairement échouée, sans appel IA de média. **Coût fournisseur réel :0**, aucune facture réelle vérifiée.

Le montage local lui-même utilise **zéro nouvel appel IA**, avec enveloppe cognitive commune conservée et pas de remise à zéro de plafond. CPU, stockage et trafic du rendu local ne sont pas tarifés ou mesurés ici : « 0 % IA » ne signifie pas infrastructure gratuite. Aucun coût fictif ne prouve un prix de production ou une économie créative.

Le Studio, le SDK, le worker, FFmpeg, la bibliothèque, les versions, l'éditeur et les téléchargements sont réellement exécutés. **La cognition répond via un faux fournisseur HTTP local**, les sources sont des motifs synthétiques et la panne d'encodeur est injectée. Aucune authentification, facture, disponibilité, compréhension ou qualité créative d'un vrai fournisseur n'est qualifiée. Les films du navigateur ne capturent pas le son ; les MP4 natifs téléchargeables portent les pistes audio mesurées. Les rendus sont **PROVISIONAL**, pas une approbation esthétique, une création photographique professionnelle ou une validation client.

## Fichiers concernés et protections

Contrats/validation/exécution : `src/lib/orchestrator/conversation/video-tool-*.ts`, raccordements `contract.ts`, `intelligence*.ts`, `index.ts`, `studio-operations.ts`, `tool-flags.ts`. Adaptation déclarative native : `src/lib/video-v2/conversation-motion.ts`. Route propriétaire : `src/app/api/studio-agent/conversations/[cid]/videos/route.ts`. Worker natif : `worker/handlers.ts`.

Interface : `conversation-video-tools.tsx`, `conversation-panel.tsx`, événements de rafraîchissement dans `video-gallery.tsx`, `video-v2-panel.tsx`, `tab-publicites.tsx`. Réutilisation locale des images : `src/lib/image-v2/request-binding.ts`, `image-tool-sources.ts`. Tests : `tests/conversation211-video-contract.test.ts`, `tests/conversation211-video-motion.test.ts`, recette `scripts/verify-agent211-videos-ui.ts`, branchement du harnais et étapes CI ajoutées sans supprimer les contrôles précédents.

Thèmes et compositions de Claude, `theme-base/`, `src/lib/theme/`, médias des démonstrations, facturation, droits natifs, configurations de modèles et moteurs de rendu/export natifs sont conservés. Aucun accès à VANS, Contretemps, instance réelle, données/médias clients ou `.env`. Aucun reset, nettoyage client, port public, nouvelle connexion, publication, merge ou déploiement. Les retraits pour espace disque sont uniquement des exemplaires baseline Git vérifiés dans d'anciennes copies de revue propres, par exclusion sparse réversible ; les sources, fichiers uniques et preuves restent conservés.

## Ce qui reste à faire

- **Prévisualisation du devis encore partielle** : sources, titres, durées et musique sont visibles. Les libellés de caméra, le détail de certaines transitions/gains et les différences visuelles avant/après doivent être enrichis ; le contrat typé serveur ne suffit pas à les rendre tous lisibles à un débutant. Certains libellés de musique restent ceux du contrat. À finir avant activation client, sans qualifier ce devis de storyboard visuel complet.
- **D10b** : raccordement distinct des vrais workflows natifs de clips IA et voix, scénario/droits/devis/plafond exact, accord, acquisition, retouche ciblée, incertitude et reprise. Aucun fournisseur réel ou nouvelle voix dans D10a ; aucune animation locale substituée silencieusement à une demande de clip IA.
- **D11** : textes/visuels/publicités, calendrier et campagnes, en séparant préparer, valider, programmer et publier. Aucun de ces actes extérieurs n'est réalisé par cette tranche.
- **D12/E/F** : comparaisons au-delà des angles, composition créative/hybride, copywriting et contrôle visuel/éditabilité des sites restent partiels, à prouver séparément.
- Les exports nouveaux de ce lot sont les **MP4 natifs et le document JSON**. SRT/VTT, packs de montage et import dans des outils tiers ne sont pas nouvellement qualifiés. Aucun CMS installé, éditeur Shopify réellement vérifié, connexion ou plateforme de publication testée.
- Domaines/hébergement : dépendance future aux fonctions natives de Claude #232. Aucun second moteur DNS ou registrar, aucune disponibilité ou connexion réelle revendiquée.
- **CI du SHA documentaire final encore à contrôler au relevé** ; ne pas emprunter le résultat d'un autre commit. Les liens et le verdict CI seront publiés dans #238 et #211 lorsqu'ils seront effectivement obtenus.

Pour le propriétaire : le premier parcours de montage local est désormais relié à SYNA et recetté dans une instance isolée. Les clips et voix IA ainsi que la publication restent des chantiers séparés. Rien n'est activé dans votre Studio réel par cette PR.
