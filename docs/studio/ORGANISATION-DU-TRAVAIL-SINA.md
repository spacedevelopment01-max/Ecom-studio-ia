# Organisation du travail sur SINA (décidée le 21 novembre 2026)

Document du chef d'orchestre. Il garde l'organisation, l'état de chaque chantier, les décisions du propriétaire et les
erreurs à ne jamais refaire. Il est relu au début de chaque séance et tenu à jour.

## 1. Ce que le propriétaire a demandé (ses mots)

« Réorganise correctement le travail, je veux une conversation par étape de SINA et je veux une conversation où SINA
évolue de son côté. Je veux aussi une conversation où SINA fait les tests complets. » Puis : « je veux que tu fasses le
nécessaire pour qu'une nouvelle conversation chef d'orchestre existe car cette conversation est longue et tu vas tout
oublier ».

## 2. Les conversations

1. **Le chef d'orchestre** (une conversation). Il ne modifie pas SINA. Il écrit les consignes de chaque conversation
   (les décisions du propriétaire et la partie des recherches qui la concerne), les crée, suit leur travail, vérifie que
   rien ne contredit ses décisions avant que ça lui arrive, et tient ce document à jour. Il n'ajoute rien que le
   propriétaire n'a pas demandé.
2. **« SINA évolue »** : la conversation « Évolution de SINA » qui existe déjà (identifiant `session_01HSEvRxGgpCiaV16N8SC8b3`,
   branche `claude/evolution-sina`). Elle fait ce qui sert à toutes les étapes : le socle (fiche du client, étapes
   verrouillées, épreuves), SINA simplifiée, les juges, les coûts, les règles communes des textes et des images. C'est
   elle qui rassemble le travail des autres dans la version commune (`claude/evolution-sina`).
3. **Une conversation par étape du parcours** (référence, partie 5) : faire connaissance ; la marque ; les angles ;
   l'activité et le site (avec la méthode « dessiner puis coder » gardée telle quelle) ; la mise en ligne ; les
   publications ; les publicités ; le suivi du mois ; les vidéos (en dernier).
4. **« Les essais complets »** : elle ne modifie jamais SINA. Elle invente des clients, joue seulement le client (règle :
   « c'est à SINA d'y faire, pas à toi »), fait tourner SINA avec la vraie IA dans le budget fixé avec le propriétaire
   juste avant, et lui montre tout, images comprises, même refusées. Chaque raté trouvé devient une épreuve, transmise à
   « SINA évolue ».

## 3. Les trois règles d'organisation (acceptées avec la demande du chef d'orchestre)

- **Par vagues de deux, pas toutes en même temps** (elles touchent en partie les mêmes fichiers de SINA ; ensemble, elles
  effaceraient le travail les unes des autres et prendraient des décisions contradictoires) :
  1. « SINA évolue » finit le socle ; « Les essais complets » se prépare ;
  2. faire connaissance et la marque ;
  3. les angles et le site ;
  4. les publications et les publicités ;
  5. le suivi du mois et la mise en ligne ;
  6. les vidéos.
  Une vague démarre quand la précédente est rassemblée dans `claude/evolution-sina` et que ses épreuves passent.
- **Chaque conversation ne touche que son étape.** Ce qui toucherait une autre étape ou le cœur de SINA passe par
  « SINA évolue ». Chaque conversation d'étape part de la dernière version de `claude/evolution-sina`, travaille sur sa
  propre branche, et son travail est rassemblé par « SINA évolue » après essais verts.
- **Le chef d'orchestre ne fait rien sans le propriétaire** : avant de créer une conversation, il lui dit en quelques
  lignes concrètes ce qu'elle va faire et ce qu'il verra, et attend son oui. Chaque conversation consomme l'abonnement
  Claude du propriétaire : on n'en ouvre pas plus que la vague en cours.

## 4. Où en est chaque chose (21 novembre 2026, soir)

- **« SINA évolue » est ARRÊTÉE** par ordre du propriétaire (« Stop arrête tout ») : elle ne doit plus rien faire tant
  que le propriétaire (ou le chef d'orchestre avec son accord) ne lui redonne pas d'instruction.
  - Envoyé sur `claude/evolution-sina` : photos demandées en fond plein et contrôle gratuit de la transparence ; logo relu
    avant les images qui le portent ; les onze rapports de recherche. 5 709 essais automatiques passaient.
  - Construit mais **pas encore envoyé** au moment de l'arrêt : le socle (fiche « Ce que SINA sait de toi » avec
    portée, étapes verrouillées, 17 épreuves dont 15 rejouées gratuitement). À reprendre là quand le propriétaire le dira.
  - L'essai payant du grand modèle d'images (`gpt-image-2.6-sunburst` contre `flare`, 3 photos chacun, 1 € au plus)
    n'est PAS lancé ; il faudra un nouveau oui du propriétaire (son accord « fais tout » a été annulé par « Stop »).
- **La branche `claude/lot-4-site-b5qjsw`** (conversation du lot 4) contient tout le travail du 21 novembre sur les
  logos, le relecteur, la présentation des identités, et tous les documents de recherche ; rien n'est fusionné.
- **Projet d'essai du plombier** (client inventé) : 20,06 € dépensés ; ses données étaient dans un dossier temporaire et
  ne sont plus disponibles. Un nouvel essai part d'un nouveau client inventé.

### Reprise du 21 novembre 2026, nuit (nouveau chef d'orchestre : `session_01HSEvRzKV3NKmjQAmJC3ohd`)

- Accord du propriétaire pour relancer « SINA évolue » : « Tout doit être fait correctement avec un debrief simple à
  comprendre pour moi ». Consigne envoyée :
  1. vérifier (série complète) et envoyer le socle déjà construit ;
  2. reprendre une création coupée sans repayer (gratuit) ;
  3. une seule règle à un seul endroit (gratuit) ;
  4. puis s'arrêter et proposer, point par point (SINA simplifiée, juges, coûts), ce qu'elle construirait, ce qu'il verra
     et le prix, avant de rien écrire.
  Après chaque point, un compte rendu simple pour lui, avec un exemple réel, ce qui est vérifié ou non, l'argent dépensé.
- Annulé : la liste de tâches erronée qu'elle avait reçue (« A. SINA en général », « B à J : parties du parcours »).
- Interdit : tout appel payant (l'essai d'images à 1 € attend son oui), toucher à « dessiner puis coder » ou au code du
  thème, retirer du contenu sans son accord, une chaîne d'assistants, un juge sans mesure qu'il sert.
- Rappel tiré des recherches, demandé par le propriétaire (« s'il y a trop de juges ça bogue ? ») : ce sont les assistants
  à la chaîne qui font perdre 39 à 70 % (Google, 180 configurations) ; un juge ne sert que sur ce qui se mesure, une IA
  juge la beauté presque au hasard (0,55 contre 0,50). Donc : SINA seule, le code juge ce qui se mesure, un seul relecteur
  des défauts visibles, le goût au client.
- À préparer ensuite : la conversation « Les essais complets » (consignes à lui montrer avant de l'ouvrir).

### Fin du premier passage de « SINA évolue » (21 novembre 2026, soir)

- Points 1 à 3 faits et envoyés sur `claude/evolution-sina` (5 739 essais verts, 0 €, pas d'essai avec la vraie IA) :
  socle (fiche, étapes verrouillées, 18 épreuves), reprise d'une création de marque coupée sans repayer, rangement des
  doublons. Relevé des 16 règles contradictoires : `docs/studio/REGLES-EN-DOUBLE-2026-11-21.md`.
- Deux recommandations trahissaient ses décisions et ont été refusées par le chef d'orchestre : grouper les questions
  (sa décision : une à la fois) ; marquer les réalisations « illustrations » (proposition écartée le 14 novembre).
- Son accord (« Oui envoie lui ») : appliquer seulement ses règles déjà décidées, points 1, 2, 3, 4, 6, 7, 8, 11, 13 du
  relevé. Les points 5, 9, 10, 12, 14, 15, 16 attendent la conversation de leur étape ou le lot des forfaits.
- En attente de sa décision, un par un avec leur prix : SINA simplifiée, juges (carnet de ses verdicts, mesure
  d'accord ~0,90 €), coûts (tableau du coût par travail accepté, différé).

### Les questions groupées (21 novembre 2026, nuit)

- Faute du chef d'orchestre : il avait donné « une question à la fois » partout d'après la décision du 14 novembre, sans
  voir la décision plus récente du 19 novembre (essai Braise : questions simples groupées, six au plus ; choix et accord
  seuls ; « faire connaissance » une à la fois). Toujours chercher la décision la plus récente avant de trancher.
- Le propriétaire craignait que SINA « perde la boule » ; réponse : six questions simples au plus, la fiche note chaque
  réponse, SINA ne redemande que ce qui manque. Son accord (« Ok ») : on garde la règle du 19 novembre, avec une épreuve,
  rejouée aussi avec la vraie IA dans « Les essais complets » ; si SINA perd une réponse, retour à une question à la fois.

### Vague 1, « SINA évolue » : terminée (21 novembre 2026, nuit)

- Envoyé sur `claude/evolution-sina` (dernier enregistrement `3216b85`) : socle, reprise sans repayer, rangement des
  doublons, règles alignées sur ses décisions (personnes, réalisations, planche sans produit inventé, pas de cadre
  arrondi, clair d'abord, pas de « maquette », pas d'euros, questions du 19 novembre), 21 épreuves.
- Vérifié par le chef d'orchestre sur une copie propre : contrôle des types sans erreur, 5 750 essais passés (81 mis de
  côté, 603 fichiers). 0 € dépensé. Rien essayé avec la vraie IA. Rien fusionné.
- Reste de la vague 1 : préparer « Les essais complets » (consignes montrées au propriétaire avant de l'ouvrir).
- En attente de sa décision, avec leur prix : SINA simplifiée, juges, coûts ; essai d'images à 1 €.

### « Les essais complets » ouverte (21 novembre 2026, nuit)

- Accord du propriétaire : « Oui ouvre la ». Conversation `session_01HSEvRxTiq736ZZf4yYDL2d`, partie de
  `claude/evolution-sina`, branche `claude/essais-complets`. Consignes : `docs/studio/CONSIGNES-LES-ESSAIS-COMPLETS.md`.
- Premier travail gratuit : préparer le Studio d'essai, montrer les trois photos libres de droits de Nadia, jouer Nadia
  jusqu'à la première carte de dépense, puis demander au propriétaire son oui et le plafond (estimation : 8 à 12 € pour
  ses étapes 1 à 3). Son accord doit être écrit dans cette conversation-là.

### « Tout mettre en place » (22 novembre 2026)

- Le propriétaire : « Je t'ai demandé de mettre en place tout ce que l'autre conversation avait trouvé pourquoi tu ne
  l'a pas fait ? ». Faute du chef d'orchestre : il avait fait proposer au lieu de faire construire. **Règle : ce que le
  propriétaire a demandé de mettre en place se construit ; seuls une dépense ou un retrait visible pour le client
  attendent son oui.**
- Envoyé à « SINA évolue » :
  - les économies sans baisse de qualité (mise en mémoire chez le fournisseur, outils de l'étape seulement, différé,
    carte juste, tableau du coût par travail accepté) ;
  - les juges (carnet de ses verdicts, mesure d'accord, plusieurs versions au choix) ;
  - deux reprises au plus ;
  - les ratés de Nadia (questions groupées pendant « faire connaissance », « C'est parti » avant l'accord,
    vouvoiement de la carte, marché pas proposé) ;
  - l'essai du grand modèle d'images (1 € au plus, après son oui dans cette conversation).
- Images aujourd'hui : photos par le petit modèle de la dernière version (`gpt-image-2.6-flare`), logos par le grand de la
  version d'avant (`gpt-image-2.5-sunburst`). Le meilleur (`gpt-image-2.6-sunburst`) n'est utilisé nulle part. Même
  tarif officiel ; la consommation n'est pas mesurée.
- Nadia est en pause avant sa carte de marque (8 € probables, 16,69 € au plus), en attendant les économies.

### Tout passe par « SINA évolue » (22 novembre 2026)

- Ordre du propriétaire : « Je veux que tu envoies à la conversation tout ce qui n'a pas été modifié pour faire évoluer
  SINA ». Il remplace les vagues de conversations d'étape : « SINA évolue » construit seule tout ce que les recherches
  proposent et qui n'est pas fait (référence : `TOUTES-LES-RECHERCHES-SINA.md`, branche `claude/lot-4-site-b5qjsw`).
- Ordre envoyé :
  1. finir les économies, les juges, les deux reprises, les ratés de Nadia et l'essai à 1 € ;
  2. puis, dans l'ordre : images, fiabilité, conversation, enrichissement, marque et textes, angles, site, publications
     et publicités, suivi du mois, briques, vidéos en dernier.
  Un compte rendu simple après chaque partie.
- Attendent son oui :
  - toute dépense, tout nouveau fournisseur, tout retrait visible ;
  - le texte posé par le Studio sur les photos des publications.
- Inchangé :
  - « dessiner puis coder » et le code du thème ;
  - ses règles du logo et des angles ;
  - la règle des questions du 19 novembre.
- « Les essais complets » reste en pause (Nadia avant sa carte de marque), jusqu'à ce que les économies soient faites.

### L'atelier d'images et de vidéos (demande du propriétaire, rappelée le 22 novembre 2026)

- Ses mots : « J'avais aussi demandé à ce qu'on construise dans le studio une plateforme comme Higgsfield pour la
  création d'image et vidéo pour aider dans le développement de SINA et apporter aux clients un truc en plus dans le
  studio, à voir pour s'en servir dans les étapes de SINA ».
- Cette demande n'était écrite dans aucun document du chef d'orchestre ; elle l'est maintenant. Seule trace dans le code :
  des adaptateurs vidéo écrits mais jamais vérifiés (`docs/studio/inventaire/4-communication.md`).
- Recherche lancée (`docs/studio/recherches-2026-11-22/08-atelier-images-et-videos.md`). Ensuite : ce que l'atelier
  contiendra, son coût, et son usage dans chaque étape de SINA, puis la construction.

### Recherches du 22 novembre 2026

Huit recherches lancées à sa demande (« tu dois vraiment faire des recherches »), dans
`docs/studio/recherches-2026-11-22/` :
1. thèmes sur mesure ;
2. mise en ligne ;
3. publications ;
4. publicités ;
5. suivi dans la durée ;
6. vidéos ;
7. calendrier de publication (oublié au départ, ajouté à sa demande) ;
8. atelier d'images et de vidéos.

### Les fournisseurs d'IA et l'atelier (22 novembre 2026)

- Faute du chef d'orchestre : la référence à jour (`LE-STUDIO-DE-A-A-Z.md`, partie 16, décisions du 18 et du 21 novembre
  sur les fournisseurs) est sur la branche `ccr-c18fe524-w1pb7o`, pas sur celle que lisaient le chef d'orchestre et ses
  recherches. Les rapports 06 et 08 du 22 novembre recommandent fal et parlent de Higgsfield. Or sa décision est la
  suivante :
  - Higgsfield est à quitter ;
  - Runware est le seul intermédiaire de secours ;
  - fal seulement pendant la transition ;
  - Kling, Vertex, Black Forest Labs et Seedance sont accordés.
  **Toujours relire la référence sur la branche la plus récente** (`ccr-c18fe524-w1pb7o`, conversation « E-COM STUDIO IA
  completion », `session_01HSEvS21X7DENKPs367UykR`). « SINA évolue » a été prévenue.
- L'atelier de création est écrit par cette conversation : `docs/studio/L-ATELIER-DE-CREATION.md` (pas encore envoyé ;
  ses conditions et sa place dans les lots sont « non encore validées » par le propriétaire).

### Recherches approfondies (22 novembre 2026, midi)

- Sa demande : « refais les recherches sur toute la partie thème et tout ce qui se passe après pour chaque étape, ainsi que
  la plateforme que je veux mettre en place, et prends tout ce dont on a besoin pour continuer l'évolution de SINA ».
- Onze recherches lancées, plus étroites et plus profondes que celles du matin. Elles partent des trous et des points non
  vérifiés du matin et ont la liste à jour des fournisseurs accordés (`.lecture/CONSIGNES-COMMUNES.md`). Rapports dans
  `docs/studio/recherches-2026-11-22-approfondies/` :
  1. dessiner puis coder ;
  2. qualité des thèmes ;
  3. contrôle et retouche du site ;
  4. mise en ligne ;
  5. composer les publications ;
  6. calendrier et légendes ;
  7. publicités ;
  8. suivi dans la durée ;
  9. vidéos avec nos fournisseurs ;
  10. atelier de création ;
  11. faire évoluer SINA.
- Ensuite : tout ce qui en sort part à « SINA évolue », en respectant ses décisions. L'atelier y entre aussi, avec la
  correction du « Déballage » (pas de mains sans accord écrit).

### Recherches approfondies finies et confiées (22 novembre 2026, après-midi)

- Les onze rapports sont enregistrés. Leur partie « Ce qu'il faut construire » est envoyée à « SINA évolue », dans cet
  ordre :
  1. légal et cassé ;
  2. SINA elle-même ;
  3. site ;
  4. mise en ligne ;
  5. publications et calendrier ;
  6. publicités ;
  7. suivi ;
  8. vidéos ;
  9. atelier.
- Précision donnée : on peut AMÉLIORER le code du thème, jamais le retirer ni le remplacer (ses mots : « j'ai jamais
  demandé que tu enlèves le code du thème »).
- Envoyé en urgence en cours de route :
  - le cache de la conversation ;
  - la fiche relue à chaque pas ;
  - les mots corrigés dans la réflexion de SINA ;
  - la signature C2PA qu'efface le Studio.
- **Décisions qui l'attendent** :
  - A : le dessin de l'accueil monté avec les pièces du thème au lieu du code libre (rapport 01) ;
  - B : le texte posé par le Studio sur les photos des publications (après un essai gratuit côte à côte) ;
  - C : les réalisations créées par l'IA (risque d'hypertrucage selon les lignes directrices européennes du 5 novembre
    2026) ;
  - D : réécrire ses engagements 4, 10 et 12 pour qu'ils disent vrai ;
  - E : les essais payants (images 1 €, vidéos environ 10 $) et ElevenLabs (299 $ par mois) ;
  - F : les comptes à ouvrir par lui (boutique de développement Shopify, compte publicitaire d'essai, BytePlus) et
    l'identité légale du Studio ;
  - le petit modèle pour les tâches mécaniques (non transmis, contraire à « le plus fort pour tous »).

### Le coût d'un projet (22 novembre 2026) : à résoudre pour de bon

- Ses mots : « ça coûte beaucoup trop cher à faire un projet et tu dois aller voir sur internet comment régler ce
  problème, tu ne t'arrêtes pas tant que tu n'as pas réellement trouvé ».
- Lancé :
  1. relevé réel des coûts de Nadia, demandé à « Les essais complets » (`docs/studio/essais-complets/COUTS-NADIA.md`) ;
  2. audit de chaque appel payant d'un projet dans le code ;
  3. recherche sur les coûts des modèles de texte ;
  4. recherche sur les coûts des images ;
  5. recherche sur comment font les concurrents.
  Rapports dans `docs/studio/couts/`.
- Règle tenue : « le modèle le plus fort pour tous » là où SINA décide, conseille ou juge. Les recherches montrent où un
  modèle moins cher servirait sans décider, et le propriétaire tranche.
- On ne s'arrête qu'avec un coût de projet mesuré avant et après, en vrai.

### Le coût d'un projet : résultats (22 novembre 2026, après-midi)

- Relevé réel de Nadia (21 réponses, 1,154 €) : 58 % du coût venait de la conversation repayée sans cache. La mise en
  cache du fil a été corrigée depuis (`920e7482`).
- Audit du code (`docs/studio/couts/01`) : un projet complet est compté environ 22 €, dont :
  - la conversation, environ 6,50 € ;
  - les images, environ 46 images pour 5,50 à 6 € ;
  - le site, environ 7 €, dont 5 € de textes.
- Corrections envoyées à « SINA évolue », sans changer de modèle là où SINA décide :
  - effort constant dans le fil ;
  - mémoire d'une heure ;
  - une image par format ;
  - consigne de l'étape mise en cache ;
  - résumé du client en cache ;
  - Haiku 5.5 au lieu de 4.5 pour le niveau léger ;
  - images comptées au jeton (0,12 $ n'était qu'une borne) ;
  - pas d'aperçus inutiles ;
  - formats dessinés directement.
- Estimation (calculs, à mesurer) : environ 22 € → environ 13 € par projet.
- En attente de lui :
  - laisser le différé du site attendre plus longtemps : REFUSÉ « pas pour le moment » (22 novembre) ; ne pas le reproposer avant qu’il en reparle ;
  - l'essai d'un centime pour le différé des images ;
  - relancer Nadia pour mesurer en vrai.

### Coûts : décision d'effort et audit « jusqu'au bout du bout » (22 novembre 2026, fin d'après-midi)

- Fonction en essai d'Anthropic (effort constant dans le fil, jugement élevé par message) : le propriétaire a laissé
  trancher (« je te laisse faire »). Le chef d'orchestre a dit oui, avec retour automatique à l'ancienne façon en cas de
  refus et un réglage pour l'éteindre (environ −1,80 € par projet).
- Ses mots : « on peut encore gagner quelques euros, il faut des recherches jusqu'au bout du bout, le moindre petit bout de
  code doit être recherché, sans toucher, voire en améliorant l'expérience avec SINA ».
- Six audits lancés sur la dernière version (`9b67a29a`), rapports dans `docs/studio/couts/approfondi/` :
  1. conversation ;
  2. marque ;
  3. site ;
  4. angles, publications et tâches de fond ;
  5. moteur des appels ;
  6. techniques publiées.

### Coûts : les six audits finis et confiés (22 novembre 2026, soir)

- Gains trouvés par projet (estimations, qui se recouvrent en partie) :
  - conversation : environ 3,50 € ;
  - site : environ 2 € ;
  - marque : environ 0,90 € ;
  - moteur commun : environ 0,70 € ;
  - angles, publications et publicités : environ 0,30 à 0,80 € ;
  - techniques publiées : 0,20 à 2,60 €.
  Par mois courant, sur les publications : −1,48, −3,44 et −5,41 € selon le forfait.
- Trois écarts à ses règles trouvés et corrigés, même quand ça coûte :
  - photos du site relues par Haiku ;
  - images des publications et des publicités relues par Sonnet ;
  - ratés du Studio débités au client, contraire à « une erreur de SINA est corrigée sans rien compter ».
- Un risque de panne : modifier le début du fil peut faire échouer une demande sur Opus 5.5. Correction demandée, avec
  une épreuve.
- Estimation globale : un projet d'environ 22 € tombe à environ 9 à 11 €. À MESURER en relançant Nadia.
- Attendent sa décision : réutiliser les images de la planche sur le site ; l'aperçu des noms avant les planches ;
  les crédits d'API liés à un abonnement (conditions à confirmer).

### Toutes les parties construites (22 novembre 2026, nuit)

« SINA évolue » a fini et envoyé, au total 5 989 essais verts et 30 épreuves sur 30, 0 € dépensé, rien essayé avec la vraie IA :
- les économies ;
- la conversation ;
- le moteur ;
- la marque ;
- le site ;
- les publications et les publicités ;
- le suivi (5 fonctions allumées ; devis et carnet éteints) ;
- les vidéos (Kling, Vertex, Seedance et Runware branchés, éteints sans clé) ;
- l'atelier (« Atelier » dans « Créer »).

Dernière commande :
- les limites de l'atelier : SINA qui en parle, toutes les photos vérifiées, et les liens de « Mes créations » qui posent
  l'image ;
- le retrait de Higgsfield ;
- les sorties strictes, l'amorce des publications et les notices courtes ;
- un compte rendu final avec les coûts.

**Ce qui attend le propriétaire** :
- l'essai réel de Nadia (budget) ;
- la méthode « dessiner puis coder » montée avec les pièces ;
- le texte posé sur les publications (essai gratuit côte à côte) ;
- les réalisations IA ;
- réécrire les engagements 4, 10 et 12 ;
- les essais payants : images 1 €, vidéos environ 10 $, différé des images 1 centime, vignettes de l'atelier ;
- ElevenLabs ;
- la signature C2PA par le Studio (certificat et juriste) ;
- « vrais pixels reposés » ;
- les comptes à ouvrir : Shopify d'essai, Kling, Vertex, BytePlus, Runware, Black Forest Labs ;
- relire le devis ;
- la grille de la CNIL ;
- l'essai sur ses téléphones ;
- l'identité légale du Studio ;
- le taux du dollar ;
- les images de la planche sur le site ;
- l'aperçu des noms.

### Bilan final vérifié (23 novembre 2026, nuit)

- « SINA évolue » a fini, et s'arrête pour préparer l'essai réel. La version `79607341` a été vérifiée par le chef
  d'orchestre sur une copie propre : contrôle des types sans erreur, 5 970 essais passés (81 mis de côté). 0 € dépensé.
- Coûts estimés d'après le code :
  - un projet : environ 22 € → 10 à 13 € ;
  - un mois courant : 6,10 → environ 4 € (69 €), 12,15 → 8,10 à 9,35 € (99 €), 18,20 → 12,35 à 14,40 € (169 €).
- Faute avouée : deux demandes de comptage parties chez Anthropic avec une fausse clé pendant un essai, refusées, rien de
  facturé, essai corrigé.
- Proposé au propriétaire : reprendre Nadia (marque et angles) sur la nouvelle version, plafond 10 €, arrêt à 8 €.
  « Les essais complets » devra d'abord passer sur la dernière version de `claude/evolution-sina`.

### La vidéo moins chère, et les captures de l'atelier (23 novembre 2026, matin)

- Le propriétaire a demandé des captures de la création d'images et de vidéos : huit captures envoyées
  (`docs/studio/captures-atelier/` sur `claude/evolution-sina`), puis quatre corrigées (01, 04, 05, 07).
- Les captures ont montré un écart : une vidéo de 8 s coûtait environ 10,5 % du budget (3,13 €), car Veo 3.0 facturait
  un son inutile. Cinq décisions appliquées par « SINA évolue » : Veo 3.1 Lite par Vertex par défaut, sans son ; Veo 3.0
  et toutes les vidéos de l'API Gemini écartés ; sans clé Vertex, le plan sûr (vraie photo détourée, mouvement de
  caméra) ; durées réelles comptées ; prix probable montré, sa borne seulement dans « au plus » ; vidéo relue par le
  modèle le plus fort, au niveau élevé, une image à la fois. 5 991 essais verts, 30 épreuves sur 30, 0 € dépensé.
- Nouveaux prix au forfait du milieu (encore à 89 € dans le code) : 8 s environ 1,75 % (0,52 €), au plus 5,84 % ;
  6 s environ 1,58 % (0,47 €) ; plan sûr 0,19 %.
- Conséquence à dire au propriétaire : plus de vidéo avec une personne qui parle et du son (seul Veo par l'API Gemini
  avait le son). Le son viendra d'ElevenLabs si le propriétaire le décide.
- **Attend son autorisation écrite dans « Évolution de SINA »** (le système de sécurité refuse de toucher au code de SINA
  sur un message du chef d'orchestre) : quatre changements dans `src/lib/syna-agent/tools/atelier.ts` pour que SINA
  annonce le même prix que l'atelier (`atelier.etat` lignes 43 et 52, `atelier.video` ligne 131, carte d'accord
  d'`atelier.creer` lignes 101 à 106 avec `probableMicro`). Phrase à écrire : « Oui, je t'autorise à mettre le même prix
  dans le code de SINA (atelier.ts) que dans l'atelier. »
- Fait (8bde92e8), avec l'accord écrit du propriétaire dans « Évolution de SINA » : SINA donne le même prix que l'atelier.
  Vérifié par le chef d'orchestre sur une copie propre : types sans erreur, 5 993 essais passés (81 mis de côté).
- Le propriétaire demande un atelier « plus joli, qui fasse plus création d'image et vidéo ». Image d'exemple faite
  sans IA (page dessinée puis photographiée, avec les vraies créations de Galet) et envoyée : grande scène sombre avec
  les créations, une seule barre « Que veux-tu créer ? » (Image ou Vidéo), modèles de vidéo avec aperçu animé et prix
  en étiquette, retouches en un geste, mur de créations, image qui apparaît pendant la création. Coût en IA : 0. Attend
  son oui avant d'être confié à « Évolution de SINA ».
- Accord du propriétaire le 23 novembre 2026 (« Yes ») : construction confiée à « Évolution de SINA ». Image d'exemple et
  page dessinée : `docs/studio/maquette-atelier-embelli/`.
- Atelier embelli construit (27882a51 sur `claude/evolution-sina`), présentation seule, 6 004 essais verts, 0 €. Captures
  dans `docs/studio/captures-atelier-embelli/`, envoyées au propriétaire. Relu par le chef d'orchestre ; retouches
  demandées : « story » remplacé par « format vertical » (décision du chef d'orchestre, règle « jamais un mot
  d'anglais ») ; durées de 5 s affichées alors que 6 s sont faites et comptées ; ancienne carte d'accord de SINA
  (« au plus » seul) dans les données d'exemple ; titres trop serrés.

## 5. À lire avant chaque décision

1. `docs/studio/LE-STUDIO-DE-A-A-Z.md` : la référence du propriétaire et ses décisions (elles priment toujours).
2. `CLAUDE.md` : ses règles et ses goûts.
3. `docs/studio/COMPTE-RENDU-2026-11-21-SINA.md` : ce qui a été modifié le 21 novembre et les problèmes pas réglés.
4. `docs/studio/COMPTE-RENDU-RECHERCHES-SINA-2026-11-21.md` : les recherches et ce qui a été proposé (des PROPOSITIONS :
   rien ne s'applique sans son accord).
5. `docs/studio/recherches-2026-11-21/` : les onze rapports complets avec leurs sources (le rapport de chaque domaine se
   donne à la conversation de l'étape correspondante).

## 6. Décisions du propriétaire à ne jamais trahir (21 novembre 2026)

- **La méthode « dessiner l'accueil en image puis le coder » reste** : « C'est sûrement le meilleur de SINA ». Ne jamais
  la retirer, la remettre en cause ni lui reposer la question ; ne jamais retirer le code du thème (« j'ai jamais demandé
  ça à ce que tu enlèves le code du thème »). Les contrôles sur captures s'ajoutent autour d'elle (par exemple comparer le
  site codé à l'image dessinée pour corriger), sans la remplacer.
- **Le client arrive avec presque rien** : quelques réponses, ses photos s'il en a, un lien s'il en a un.
- **SINA pose ses questions quand elle en a besoin**, à n'importe quelle étape, une à la fois (décision du 14 novembre),
  pas toutes au début.
- **Logo** : aucune consigne de style au dessinateur, seulement la marque (nom, métier, idée et ton, couleurs,
  typographie, fond blanc), la phrase de refus du client mot pour mot, et ses 50 logos aimés « seulement comme exemples ».
- **Une recherche ne prime jamais sur sa décision** : les rapports rapportent des faits ; ce qui en sort est une
  proposition qu'on lui explique et qu'il accepte ou non.
- **Ne rien ajouter qu'il n'a pas demandé** : chaque proposition se dit en une phrase et attend son oui.

## 7. Comment parler au propriétaire (rappel)

- Français simple, sans un mot d'anglais ; il n'est pas développeur.
- **Être explicite et concret** (« soit plus explicite ») : dire exactement ce qui est fait, avec des exemples réels
  (le logo d'Aplomb, la publication de l'escalier), jamais des mots vagues comme « socle » ou « chaînes » sans les
  expliquer.
- Réponses courtes, une question au plus, à la fin ; ne jamais reposer une question déjà répondue.
- Argent : le prix avant, son oui écrit, aucune relance d'un appel douteux ; lui montrer les images tout de suite.
- Une faute se dit franchement.

## 8. Ce que contient chaque étape (propositions tirées des recherches, à présenter, pas à imposer)

- **SINA évolue** : fiche du client relue en entier avant chaque création ; étapes validées verrouillées ; épreuves tirées
  des vrais ratés rejouées avant chaque changement ; une seule SINA qui parle au client, moins de 20 outils, consignes
  courtes, créations par étapes fixes (plan, morceaux, contrôle sur le vrai rendu, juge séparé) ; juges par sorte de
  défaut, comparaisons dans les deux ordres, juge appris sur ses verdicts avec accord mesuré, le client choisit parmi
  plusieurs versions ; deux reprises au plus puis SINA montre ; cache et traitement différé ; coût par travail accepté.
- **Faire connaissance** : SINA étudie seule le marché, les concurrents et les avis de leurs acheteurs ; elle recommande
  avec une raison ; elle ose dire non ; boutons et écriture libre ; elle prend les devants en fin d'étape.
- **La marque** : positionnement avant le nom (ce qu'il ferait sans la marque, ce qu'elle a d'unique, « la seule
  qui… », ce qui pousse et ce qui retient) ; 150 à 300 pistes de noms par équipes séparées, tri sévère (facile à dire,
  écrit juste après l'avoir entendu, test du concurrent, noms proches à l'INPI ; jamais « nom libre ») ; logo par la grande
  version d'OpenAI si l'essai le confirme, plusieurs versions au choix, fichier vectoriel ; texte des planches posé par le
  Studio ; retouche de la seule zone ratée ; produit comparé à la photo du client.
- **Les textes (partout)** : chasse aux sept défauts de l'écriture d'IA et aux tics, mots concrets, vrais mots des
  acheteurs, test à trous.
- **Les angles** : vraies situations d'achat (pourquoi, quand, où, avec qui…), trois vraiment différentes ; contrôle par
  devinette (un juge retrouve quel client va avec quel texte).
- **L'activité et le site** : méthode « dessiner puis coder » gardée ; rôle de chaque section écrit d'abord ; contrôles sur
  captures téléphone et ordinateur (dont la comparaison avec l'image dessinée) ; contrôles du code (débordements, boutons
  entiers et assez grands, doublons, vides) ; vitesse et accessibilité ; premier écran clair ; pas de diaporama
  automatique ; vrais avis seulement (loi) ; livraison offerte près du prix ; clic sur l'aperçu avec repère fixe et textes
  changés sans IA ; variété comparée aux 12 derniers sites.
- **La mise en ligne** : non étudiée par les recherches ; rien à inventer.
- **Les publications** : mois sur 2 à 4 temps forts et 3 à 5 thèmes, fiche de ton, jamais une semaine vide, carrousels,
  structure qui vend, idée jugée avant de payer le dessin, photo d'OpenAI sans texte et publication composée par le Studio
  (son accord d'abord : sa règle « images créées par OpenAI, obligatoire pour les publications »), test de l'inconnu et
  liste en oui ou non avant de montrer.
- **Les publicités** : trois idées (une par angle) × deux formats, en pièces séparées, même vérification ; personnes
  seulement avec photos ou accord écrit.
- **Le suivi du mois** : montrer le travail fait puis ce qu'il a donné ; objectif écrit ; cinq chiffres (appels,
  messages, demandes, visites, ventes) ; un seul « ta journée est prête » par jour ; propositions en fin d'étape ; refus
  retenus ; le client règle la fréquence.
- **Les vidéos** (en dernier) : image fixe validée avant l'animation ; 5 à 8 plans courts, 9 à 15 secondes, son et
  sous-titres ; produit vérifié image par image ; aucun fournisseur payant ajouté sans son accord.
- **Non étudié** (ne rien inventer) : transfert vers Shopify, WooCommerce, PrestaShop ; nom de domaine ; fiche Google ;
  e-mails ; être trouvé par Google et les assistants IA ; réponses aux commentaires ; supports imprimés.
