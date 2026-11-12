# État des lieux du Studio (12 novembre 2026)

Demandé par le propriétaire dans `docs/MISSION-STUDIO-COMPLET.md` : état des lieux sans dépense, puis avis, vision et
plan **avant** de construire. Ce document résume ce qui a été vérifié et ce qui a été proposé.

**Statut : propositions en attente de la validation du propriétaire. Rien n'est construit.** Ses premiers retours sont en partie 6. La présentation complète
(captures, croquis, boutons de décision) lui a été remise sur une page privée. Les constats de sécurité détaillés n'y
figurent que là : le dépôt est public.

## 1. Ce qui a été fait, et ce qui ne l'a pas été

Fait, sans aucun appel payant :
- lecture du brief, de `CLAUDE.md` et des documents qu'ils citent ;
- Studio ouvert sur une copie d'essai **sans aucune clé d'IA** : 50 écrans capturés sur ordinateur et sur téléphone ;
- contrôle visuel automatique (prototype) passé sur les trois thèmes sur mesure d'exemple et sur la banque de sections ;
- prototype de sections « composants » (trois sections, trois marques fictives, thème Shopify vérifié) ;
- cinq audits de lecture du code : code ancien, moteur de thème, SINA étapes 0 à 5, étapes 9 à 13, forfaits et sécurité ;
- suite de tests complète : 6 475 cas, 6 460 réussis, 5 ignorés, 10 en échec (45 minutes sur la
  machine d'audit). Cinq échecs viennent du poste (trois fichiers lancent `/usr/bin/google-chrome`, absent). Cinq viennent
  d'une date écrite en dur, `TUE = "2026-11-10"`, désormais passée : `tests/rendez-vous-190.test.ts` et
  `tests/prestations-editeur.test.ts`. **À corriger en premier : la CI refusera toute fusion tant qu'ils échouent.**
  Le contrôle des types passe (vérifié par `next build`).

Pas fait : SINA n'a pas été essayée en réel (son premier message passe par l'IA payante) ; aucune installation sur une
vraie boutique Shopify ; l'anglais non vérifié écran par écran ; onglets vus sur un projet neuf.

Outils et prototypes : `scripts/etat-des-lieux/` (voir son `LISEZMOI.md`).

## 2. Constats vérifiés

### Le Studio
- L'écran d'un projet superpose trois générations : l'ancien menu à onglets, l'ancien formulaire de création
  (« Pilote ») et le fil de SINA. Le centre vouvoie, SINA tutoie.
- SINA est fermée par défaut (`STUDIO_SYNA_AGENT`, absent du déploiement fourni) ; la nouvelle coquille aussi
  (`STUDIO_SYNA_SHELL`). Sans ces réglages, un client arrive sur l'ancien parcours.
- Un client neuf arrive sur une zone de saisie vide : SINA n'ouvre pas la conversation.
- Sur téléphone, l'onglet Boutique affiche le site en version ordinateur réduite.
- Sain : site public, connexion (limitation des tentatives), Découverte, administration, aucune page qui déborde.

### SINA (lecture du code)
- Étape 0 : 15 questions fixes, 3 obligatoires ; le moteur local accepte toute réponse sans relance. Des photos, seules
  les dimensions sont gardées ; du site lu, un résumé.
- Étapes 1 à 3 : la marque est créée **avant** toute étude du marché (la recherche n'arrive qu'à l'étape 4) et sans les
  photos du produit ; rien n'est réaccordé après le choix de l'angle. Les trois identités sortent d'un seul appel, sans
  relecture indépendante. Chaque nouvelle proposition écrase la précédente.
- Logos : trois directions fixes pour toutes les marques ; le dessinateur ne reçoit ni l'idée du nom, ni le territoire,
  ni les polices ; un essai par direction.
- Charte : histoire et valeurs vides, ton générique, jamais refaite après la stratégie.
- Vocabulaire du client : aucun outil de SINA n'appelle `addWordingRule` (seule une route de l'ancienne interface).
- Conversation : plus petit modèle, effort bas, 84 outils visibles, consigne de 12 000 signes, corrections des réponses
  par expressions régulières.
- Mémoire en plusieurs endroits (état du fil, table `memory`, fiche du Pilote, réglages du projet) ; le prix existe en
  trois exemplaires.
- Sain : carte d'accord avant toute dépense, coût réel annoncé, contrôles chiffrés des identités, angles appuyés sur
  des citations exactes.

### Le thème sur mesure
- Banque : 208 sections en HTML avec leur contenu d'exemple, une feuille de style (447 Ko) et un script (192 Ko) communs ;
  environ 63 sections reliées à un script qui porte des textes d'exemple ; 346 espacements, 64 tailles de texte,
  33 arrondis et 147 couleurs différents : pas de règles de dessin communes.
- Le contenu du client est écrit dans le HTML des sections par remplacement (`SectionWrite.edits`, `staleMarkup`,
  `replaceInCustomTheme`, `withBrandName`). Aucun chemin d'export : `loadCustomTheme` n'est lu que par son aperçu.
- Sections dessinées autour de leur exemple : l'ouverture Moderne « mot géant » casse avec un nom de plus de huit lettres.
- Contrôle automatique (prototype, ordre de grandeur) : banque avec exemples remplis, 166 sections affichées, 115 avec
  au moins un défaut franc, environ 270 défauts (155 textes peu lisibles, 55 textes trop petits sur téléphone, 32 boutons
  trop petits, 18 images en double). Thèmes d'exemple : Classique 12 défauts, Moderne « sport chic » 120, « néon » 82.
- Trouvé en passant : `film-brindi.mp4` est appelé par trois sections, absent du dépôt, et son nom est réécrit par le
  remplacement du nom de marque ; les deux fichiers de la police Instrument sont intervertis.
- Le moteur des 15 thèmes du Studio (`ThemeSpec`, `compileTheme`, `renderPage`, opérations, désignation, export, Theme
  Check, WordPress, PrestaShop) est piloté par les schémas : toute section Liquid à schéma posée dans `theme-base/` est
  prise en charge. L'envoi vers Shopify existe mais n'a jamais été essayé sur une vraie boutique, et les menus ne sont
  pas envoyés.

### Le code
- Trois portes d'entrée sur les mêmes moteurs : onglets et Pilote (seule active par défaut), une première conversation
  (`orchestrator/conversation`, 221 fichiers, fermée par drapeaux), SINA (fermée par drapeau). Environ 21 % de `src/`
  ne tourne pas sur une installation par défaut ; 15 à 20 % est du code d'anciens parcours.
- Cinq façons de fabriquer un site, quatre de dessiner un logo, toutes branchées.
- Pas d'outil de mise en forme ni de contrôle de style ; lignes très longues ; le code sert de journal de bord.
- Le dépôt pèse 2,3 Go, dont 2 % de code ; 1,6 à 1,7 Go de captures et d'essais peuvent en sortir.
- Sain : comptage et plafonds des dépenses d'IA, Stripe, isolation par compte et par projet, 6 475 cas de test.
- À noter : les livraisons récentes portent un nom de modèle d'IA dans leur signature (`Co-Authored-By`), contre la
  règle du propriétaire.

### Forfaits et étapes 9 à 13
- Budget IA mensuel : 16,33 € (forfait à 49 €), 29,67 € (89 €), 43 € (129 €). Le seul thème sur mesure d'un essai avait
  un plafond de 15 € : le premier mois ne couvre pas une création avec reprises.
- Le thème sur mesure de SINA n'est pas réservé à un forfait, contrairement à l'ancien Studio (décision à prendre).
- L'ancien parcours « Pilote » lance des créations payantes sans devis ni accord.
- Étapes 9 à 13 : les moteurs existent, pas leur branchement à SINA. L'émotion de l'angle n'arrive pas aux moteurs de
  publications, de publicités et de blog ; les « trois groupes sans ressemblance » n'existent pas ; les publicités créées
  par l'IA ne sont pas visibles par `ads.list` ni par le calendrier ; les fichiers de SINA sont enregistrés sans dossier.

## 3. Avis sur le code

Ne pas tout recommencer. Recommandation : **une base neuve à l'intérieur du Studio**. On garde comptes, forfaits, budget
IA, administration, tâches de fond, fichiers, catalogue, moteur des 15 thèmes, moteurs d'images, de publications et de
vidéos. On refait au propre SINA, le thème sur mesure et l'écran du projet. On retire lot après lot la première
conversation, l'ancien parcours, les anciennes maquettes, l'ancien moteur du sur mesure et les doublons.

## 4. Propositions (à valider une par une)

| Code | Proposition |
|---|---|
| S1 | Un seul écran : SINA et le projet |
| S2 | Cinq espaces au lieu de dix-neuf onglets |
| S3 | Tutoiement partout dans le Studio |
| S4 | Budget de création et forfaits d'accord avec le parcours, après mesure des coûts réels |
| S5 | Le rendez-vous du mois (idée hors cadre) |
| S6 | Remise en ordre : retraits, dépôt allégé, règles de propreté, corrections des audits |
| N1 | Comprendre avant de créer : étude d'abord, fiche de compréhension, peu de questions |
| N2 | Trois routes de marque montrées en situation (change l'ordre des étapes décidé le 6 novembre) |
| N3 | Vérifier un nom avant de le montrer |
| N4 | Une plateforme de marque que tout le Studio relit |
| N5 | Des logos conçus pour la marque : directions choisies, deux essais, tenue en petit |
| N6 | Une seule mémoire : le dossier du projet |
| N7 | Se relire avant de montrer, à chaque étape |
| N8 | Une conversation qui accueille, six chapitres, le bon modèle au bon moment |
| N9 | Contenus et lancement : ouvrir les étapes 9 à 13 |
| N10 | L'offre : une recommandation sourcée (gamme, lots, prix, livraison, objections), plus un simple réaffichage |
| T1 | Sections « composants » : le contenu dans des données, branchées sur le moteur des thèmes du Studio |
| T2 | Règles de dessin communes par famille |
| T3 | Contrôle automatique sur chaque page avant de montrer |
| T4 | SINA conçoit, écrit et illustre en remplissant des fiches ; deux thèmes dont la différence est mesurée |
| T5 | Atelier qui enregistre ; « Désigner un élément » change un réglage |
| T6 | Mise en boutique : Shopify d'abord, essayée pour de vrai |
| T7 | Une quarantaine de composants excellents par famille plutôt que 208 sections |

Questions ouvertes posées : « une seule section de cartes par page » (avis : deux au plus sur l'accueil, jamais à la
suite) ; les cinq en-têtes de démonstration (avis : cinq variantes du composant « en-tête »).

## 5. Plan proposé

0. Garde-fous et ménage sans risque (contrôle automatique réglé, règles de propreté, ancien gelé).
1. Socle des composants, accueil et fiche produit Classique ; premier envoi réel d'un thème du Studio sur Shopify.
2. Famille Classique complète et atelier.
3. Famille Moderne.
4. SINA conçoit, écrit et illustre sur les composants ; premier essai réel (produit), prix annoncé avant.
5. Mise en boutique : Shopify, puis WooCommerce, PrestaShop, sites de services.
6. Nouvelle SINA : comprendre, la marque, l'offre ; deuxième essai réel (service).
7. Écran unique, pensé d'abord pour le téléphone.
8. Contenus et lancement (étapes 9 à 13).
9. Forfaits, budget de création, administration, sécurité.
10. Recette finale : un projet de produit et un projet de service, de bout en bout.

Un lot = une branche, ses tests, son contrôle automatique, ses captures vérifiées, puis « Je fusionne ? ».

## 6. Retours et décisions du propriétaire (12 novembre, dans la conversation)

Ses mots sont entre guillemets. Ce qui est une lecture de ma part est marqué « lecture ».

- **L'équipe de SINA reste en coulisses.** « Seulement SINA, l'équipe reste en coulisses » : le client n'entend qu'une
  voix. Décision.
- **Budget IA des forfaits.** Il propose 50 % du prix hors taxes au forfait à 89 € et 60 % à 129 €, au lieu de 40 %.
  Sa priorité : « satisfaire les clients et que SINA ait assez de crédit IA pour faire les projets correctement et en
  entier ». Noté, pas encore appliqué. Restent à trancher : le forfait à 49 € (pistes proposées : premier mois doublé,
  ou 50 %) et le paiement à l'année.
- **Premier essai de marque : refusé.** « Je trouve ça nul », pour les six propositions, « du début à la fin ».
- **La cause, selon lui.** « Tant que la réflexion n'est pas bien meilleure et que tu ne feras pas le nécessaire pour
  prendre des informations de partout pour peaufiner l'intelligence de SINA, ça fonctionnera pas. »
- **Deuxième essai** (avec les cahiers de métier) : « C'est mieux, tu peux faire encore mieux ».
- **Troisième essai** (voir `docs/sina-savoir/`) : « J'adore la présentation globale ». L'ironie des textes lui convient
  « pour ce genre de produit ». Lecture : le ton se choisit selon le produit, il ne se généralise pas. Il ajoute : « tu
  peux encore aller beaucoup plus loin ».
- **La présentation en planche de marque** (idée, nom, signes, sachet, site, publications, voix, ce qui reste à
  prouver) doit devenir celle de SINA, « même en mieux ».
- **Les logos.** Les noms dessinés des planches « donnent une idée de comment SINA devra faire le logo de l'image de
  marque que le client choisira ». Lecture : le logo part de l'idée de la marque et de son détail propre. La règle du
  10 novembre reste : trois logos dessinés par le modèle d'images choisi, chacun dans une direction différente.

- **Nombre d'identités selon le forfait.** « À 49 € SINA propose que 2 identités, à 89 € 3 identités et 129 € 4
  identités. » Décision. À régler : le quatrième fond (la règle actuelle en prévoit trois : blanc, dégradé, sombre).
  L'économie est faible (le gros du travail est commun aux identités) : estimation, environ 10 % par identité.
- **Un seul logo.** « Si la direction artistique est aussi bien faite […], OpenAI peut créer qu'un seul logo, celui de
  la direction que le client aura choisie. » Décision, qui remplace « trois logos ». Garde-fous convenus : SINA vérifie
  le logo avant de le montrer ; le nom dessiné en code de la planche sert de secours ; si le client n'aime pas le logo,
  SINA en redessine un autre, compté dans son budget et annoncé avant (« Oui »).

Constat technique fait pendant ces essais : le contrôle des noms de produits (`EXPRESSION_NAME`,
`src/lib/syna-agent/identities.ts`) impose la forme « un mot + de + le produit ». Sur les 27 noms de référence du
propriétaire pour des produits (`brand-references.ts`), il en refuse 21 et accepte « Bidule de machin ». Question
posée au propriétaire, sans réponse à ce jour : voulait-il cette forme, ou ce niveau-là ?

Coût : la chaîne de réflexion du troisième essai est estimée entre 20 et 30 € par projet au modèle le plus fort, entre
6 et 10 € avec un réglage économe. Estimation, non mesurée.
