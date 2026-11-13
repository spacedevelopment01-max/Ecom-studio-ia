# E-COM STUDIO IA — consignes pour Claude

Studio qui crée la marque, la boutique Shopify (ou le site d'une entreprise de services), les visuels, vidéos,
publications et publicités d'un projet. Next.js 15 (App Router) + worker de tâches de fond + SQLite. Voir `README.md`.

## Avec le propriétaire

- **Répondre en français simple** : il n'est pas développeur. Expliquer ce qui change pour lui, pas le code.
  **Jamais un mot d'anglais avec lui** (demande du 10 novembre 2026), y compris les petits messages d'avancement
  pendant le travail, les légendes de captures et les comptes rendus.
- **Ne jamais demander ni accepter de clé d'API dans la conversation.** Les clés se saisissent dans
  Administration › Fournisseurs IA (chiffrées) ou dans les secrets Codespaces / de l'hébergeur.
- **Honnêteté** : ne rien inventer (avis, chiffres, délais, certifications, résultats). Un manque se signale par
  « [À compléter : …] ». Dire clairement ce qui a été vérifié et ce qui ne l'a pas été.
- **Fusion (PR + merge) uniquement quand il le demande** (« fusionne », « oui » à « Je fusionne ? »).
  Après une modification terminée, demander « Je fusionne ? ».
- Dépôt GitHub : `spacedevelopment01-max/Ecom-studio-ia` (avec cette casse exacte pour les appels d'API GitHub).

### Préférences du propriétaire (à retenir, il ne veut pas les répéter)

- **À quoi sert le Studio, après la livraison** (ses mots du 13 novembre 2026, à ne jamais lui faire répéter) : « Après
  la livraison, c'est sina toujours, elle doit même être intelligente et prendre les devant. Source de proposition,
  ensuite le client est là pour générer grace au calendrier et l'automatisation les publications total du projet et
  gérer aussi les publicités sur les réseaux. Et il y aura la partie vidéo mais on reviendra la dessus à la fin. »
  Donc : la livraison du site n'est pas la fin du travail de SINA ; elle reste l'interlocutrice, propose la suite
  d'elle-même (publications, publicités, améliorations), et le client fait tourner sa communication avec le calendrier
  et l'automatisation ; la vidéo se traite en dernier. État relu dans le code ce jour-là : « Ma communication
  automatique » existe (`src/lib/social-v2/autopilot.ts` : validation par le client, ou pilote automatique avec accord
  écrit et plafond par semaine ; publication par les accès officiels des réseaux, `src/lib/social/publish.ts`) ; SINA
  ne la pilote pas encore (étapes 9 à 13 fermées) ; **SINA qui prend les devants n'existe pas** (elle ne parle que
  quand le client lui parle, son parcours s'arrête à l'étape 13) : à construire, avec la règle du pilote automatique
  (elle propose, le client décide ; elle n'agit seule que là où il l'a autorisée, dans son plafond) ; pour les
  publicités, le Studio PRÉPARE les campagnes (angles, audiences, textes, créations aux bons formats) et les exporte
  pour le gestionnaire de publicités du réseau : il ne se connecte à aucune régie, ne programme rien et ne dépense
  rien en diffusion (`src/lib/campaigns/manual.ts`, onglet Publicités) ; lancer et suivre une campagne depuis le
  Studio reste à construire.

- **Dépenses** : aucune API ou fournisseur payant ajouté sans son accord ; aucun appel IA payant ni publication réelle
  sans son autorisation. Toujours donner le prix avant une génération payante et attendre son accord écrit. Un appel
  au résultat incertain (erreur 5xx) n'est jamais relancé tout seul : le dire, puis demander. Plafond d'essais : 10 $. Plafond
  relevé à 15 € pour l'essai final du thème sur mesure Éclat de thé (accord écrit du 10 novembre 2026).
- **Prix** : jamais d'euros montrés au client pour l'IA ; tout coût est un % du budget IA du mois de son compte ;
  devis = coût probable (un essai), une reprise n'est débitée que si elle a lieu et elle est annoncée.
- **Ne jamais générer de personne** sans photo fournie par le client ou autorisation explicite.
- **Vocabulaire du client** : ce qu'il corrige une fois vaut pour toujours (ex. ARVEN : « montre », jamais
  « chronographe »). L'enregistrer aussitôt dans la mémoire du projet (`addWordingRule`, `src/lib/client-wording.ts`).
- **Textes des visuels** : ceux qu'il donne sont repris mot pour mot (ex. ARVEN : « Acier et cuir véritable. »).
  Si le modèle n'arrive pas à écrire un mot, **changer la phrase** au lieu de s'acharner à payer de nouveaux essais.
- **Vérifier soi-même chaque image avant de la montrer** : produit entier (rien de coupé, ex. bracelet complet avec
  la boucle), fidèle à la photo d'origine, orthographe exacte, aucun mot ni fausse lettre en trop, logo exact.
  Une image ratée est signalée comme ratée, jamais présentée comme bonne.
- **Logos : carte blanche au dessinateur** (jamais d'aquarelle, de cachet ni de monogramme imposés) : **OpenAI (GPT Image)
  dessine les 3 logos** de l'identité choisie, chacun dans une direction artistique différente (décision du propriétaire du
  10 novembre 2026, après les essais du 7 novembre : « je préfère les logos d'OpenAI ») ; le client finit toujours avec au
  moins un logo (la version du Studio prend la place d'un dessin refusé, signalée s'il n'est pas validé) ; fond clair
  retiré depuis les bords, jamais de carré autour du logo.
- **Images 100 % IA, avec Qwen-Image 3.0 Pro** (pas ChatGPT, jugé trop cher ; pas de texte posé en local à la place).
  **Exception : maquettes de site de SINA** (étape 6) avec **OpenAI GPT Image 2.6 Flare** (2.5 Flare jusqu'au 10 novembre 2026 ; décision du 8 novembre 2026, après
  comparaison réelle : Qwen abîmait les textes de la page, OpenAI les écrivait juste). Les textes du site sont écrits
  AVANT la maquette (`mockup.copy`, sur l'angle choisi et son émotion) et posés lettre pour lettre sur l'image.
  Seules les pages principales ont une maquette (accueil, pages clés, menu, panier) ; les pages simples sont codées à
  l'étape 7 dans le style de la maquette, sans image à elles. **Photos du site codé** (étape 7, `site.images`) : toutes
  recréées en haute définition par le même modèle OpenAI, à l'identique de la maquette (décision du 8 novembre 2026).
  **Photos du thème sur mesure** (`custom.build`, `custom.photo`) : même modèle OpenAI (choix du propriétaire du 10 novembre
  2026). Une photo d'exemple détourée (mannequin ou produit qui déborde de l'ouverture Moderne, `CUTOUT_PHOTOS`) est
  remplacée par une photo créée sur fond uni puis **détourée par le Studio** (gratuit, `custom-theme/cutout-photo.ts`) ;
  si le détourage échoue, la photo pleine est posée et c'est dit.
  Corriger un détail d'une maquette = retouche localisée (`mockup.edit`), jamais une image refaite en entier.
  **Maquettes en code** (décision du 8 novembre 2026, remplacée le 9 novembre par le thème sur mesure ci-dessous ; gardée pour les projets déjà commencés, `src/lib/syna-agent/mockup-code/code-*.ts`) :
  Claude construit chaque page en HTML/CSS, photos créées une fois et partagées, contrôle automatique gratuit. Règles
  du propriétaire : ouverture de l'accueil = **grande photo pleine** avec le titre dessus ; **jamais deux parties de même
  disposition à la suite** ; **aucun vide** (pas de grandes marges, pas de colonne vide) ; **un thème vivant** ;
  **jamais une photo en doublon** (ni deux fois dans une page, ni d'une page à l'autre ; seule la photo d'un produit
  revient sur la carte ou la fiche de ce même produit) ; photos ratées (texte ou logo dedans, bandes blanches) écartées.
  Consignes à Qwen **en français**, concrètes (scène, objets, lumière), seuls les textes voulus entre guillemets.
- **Thème sur mesure** (décision du propriétaire du 9 novembre 2026 : « on ne va plus appeler ça maquette mais thème sur
  mesure » ; le client ne lit plus jamais le mot « maquette ») : à l'étape 6, SINA **monte** le thème avec la
  bibliothèque de sections (`public/sections/`, 191 sections préparées par `scripts/sections-library.py` depuis le
  catalogue ; familles Classique et Moderne, jamais mélangées ; Moderne avec ses pages de parcours : commande sans champ de carte, commande confirmée, compte, aide et suivi, informations légales « [À compléter] », article ; chaque lien mène à sa page et chaque « Ajouter » met à jour le compteur du panier, demande du 9 novembre 2026), aux couleurs, polices, nom et logo du client, et le
  **modifie sur demande** : outils `custom.*` (`src/lib/syna-agent/custom-theme/`) : bibliothèque, montage
  (`custom.compose` : **aucun thème de départ**, décision du 9 novembre 2026 : le client choisit seulement Classique ou
  Moderne, SINA prend les meilleures sections pour SON produit ou SON service et monte TOUTES les pages, contrôlées par
  `requiredPages` ; **Shopify : jamais de page commande ni de commande confirmée dans le thème** (le bouton du panier mène au
  paiement de Shopify, remarque du propriétaire du 9 novembre 2026) ; les thèmes construits ne servent qu'à la voie « thème du Studio » ; sections « seulement pour » un genre
  de produit, ex. tailles et tenues, jamais ailleurs), lecture et modification d'une section
  (`custom.section`, `custom.edit` : textes, mise en forme limitée à la section, élément masqué, photo du client),
  structure (`custom.structure`), photo créée (`custom.photo` ; payants avec carte d'accord : `custom.design`, `custom.build`, `custom.photo`), annulation (`custom.undo`), choix
  (`custom.choose`). **Photos des produits** (règle du propriétaire du 10 novembre 2026) : elles restent sur les emplacements produit (cartes, bloc d'achat, vignettes de lot, panier, recherche), jamais posées en photo d'ambiance ; elles servent de modèle à OpenAI pour une partie des scènes, les autres photos d'ambiance montrent l'univers sans le produit (pour du thé : théière, feuilles, fruits, plantes), en accord avec le texte d'en face ; montage possible en deux fois (`newPhotos:false` : textes et vraies photos d'abord). **Bloc d'achat** rempli avec les vraies données du produit (`custom-theme/buy-block.ts`, script corrigé par
  `scripts/section_buy_fix.py`) ; jamais de faux compte à rebours ni d'offre d'exemple en section à part (`FAKE_OFFER_SECTIONS`) ;
  photos impossibles à inventer (photos de ses clients, biens : `authenticSection`) jamais créées ni posées sans ses vraies
  photos ; réalisations, chantiers et avant / après créés par SINA s'il n'en a pas assez (10 novembre 2026) ; deux concepts
  (`custom.concepts`, `custom.concept`), ambiance enregistrée (`theme.ambiance`), SEO par page dans le plan des textes,
  galerie produit (`gallery.plan`, `gallery.create`, `custom-theme/gallery.ts`) ; `custom.choose` refusé tant qu'une photo
  d'exemple reste ; l'ouverture Moderne « mot géant » ne montre que la photo du client (jamais les mannequins d'exemple de son script), cadre « Photo à fournir » ; SINA voit l'accueil capturé (`custom-theme/shots.ts`). Le thème vivant s'affiche dans le fil (`/api/projects/<id>/custom-theme`, pages, téléphone) avec
  **« Désigner un élément »** : le client pointe un titre, un texte, un bouton, une image ou une section, dit ce qu'il
  veut, et SINA ne change que lui. Règles de montage contrôlées sans IA (`checkCustomTheme`) ; aucun script dans une
  section retouchée. Les anciennes maquettes (`mockup.*`) ne servent plus qu'aux projets déjà commencés avec elles. La mise
  en boutique Shopify d'un thème sur mesure (étape 7) reste à brancher.
  **Ordre de l'étape 6 et montage à la marque** (décisions du propriétaire du 9 novembre 2026) : SINA demande d'abord
  « thème du Studio » ou « thème sur mesure ». Studio : TOUS nos thèmes montrés, le client choisit (`theme.choose`), puis
  étape 8 : `theme.images` et `theme.brand` (textes de toute la boutique réécrits dans l'angle choisi et son émotion par le
  rédacteur du Studio, images créées par le moteur d'images du Studio ; tâche `syna.studio.brand`). Sur mesure : la famille
  d'abord, puis le montage de A à Z (`custom.sections`, `custom.compose`), `custom.images` et `custom.build` (textes et photos ;
  tâche `syna.custom.brand`). Dans les deux cas, SINA demande **« tes images ou je les crée ? »**, donne le **nombre exact**
  d'images, propose de créer celles qui manquent ou toutes, et donne le prix avant. Le site est ensuite en place dans
  l'**onglet Boutique** (aperçu en grand, « Désigner un élément », demande envoyée à SINA). Les 11 thèmes à plan d'emplacements
  (`reference-shapes.json`) et les 6 thèmes de services (TABLE SAISON, ATELIER NUANCE, PARENTHÈSE, PHASE, MAISON & HORIZON,
  APLAT : liste de photos tirée de leur démonstration, `src/lib/theme/service-media-plans.json`, préparée par
  `BUILD_SERVICE_PLANS=1 npx vitest run tests/build-service-media-plans.test.ts`) : SINA compte, pose et crée les images ;
  une section masquée faute de photo réapparaît quand ses photos sont posées. **Photos que SINA ne peut pas inventer** (`authenticKind`) : l'équipe elle-même et les biens mis en vente ou en location (espace Biens) ; depuis le 10 novembre 2026, les réalisations et avant/après des artisans (PHASE, APLAT) sont créés par SINA quand le client n'en a pas assez (sans personne reconnaissable) ; le lieu, les villes et les ambiances, SINA les crée aussi : les photos impossibles à inventer, SINA ne les crée jamais et les compte à part ; les images du client y vont en premier ; tant qu'elles manquent, l'aperçu du Studio montre à leur place un cadre « Photo à fournir — SINA ne peut pas inventer… » (`withAuthenticPlaceholders`), jamais sur le site publié ni dans l'export. Les photos posées vont dans le champ « fichier du thème » (`x_asset`) que la page affiche.
- **Images d'un thème, Studio ou sur mesure** (décision du propriétaire du 10 novembre 2026, la plus récente, elle prime sur
  les règles d'images plus anciennes de ce fichier) : les photos produit du client vont dans le « Produit vedette » et les
  sections qui mettent les produits en avant (cartes, collections, catalogue, lots, panier) ; **toutes les autres images
  sont créées par OpenAI** : une partie met en scène le vrai produit du client (sa photo en modèle), les autres sont en
  rapport avec le produit sans lui (pour du thé : théière, feuilles, fruits, plantes), sans jamais recopier ses photos
  produit ; **aucune image ne reste vide ni avec la photo de démonstration du thème**. **Services** : les photos de
  chantier du client d'abord ; s'il n'en a pas ou pas assez, SINA les crée avec OpenAI (même si ce ne sont pas de vrais
  chantiers), sans personne reconnaissable sauf photo ou accord du client. **Sur mesure** : le client choisit Moderne
  ou Classique, puis sombre ou clair ; SINA lui propose **2 thèmes montés** avec nos sections (accueil 8 sections au moins,
  fiche produit 7 au moins, plus si c'est mieux), textes professionnels dans l'émotion de l'angle et SEO ; textes, SEO et
  photos complets sur le thème choisi.
- **Sections « Produit vedette »** (décision du 8 novembre 2026) : elles ne vont qu'**en haut de la fiche produit**, ou au plus
  **une seule fois sur l'accueil** ; **jamais deux sections « Produit vedette » dans une même page**. Leurs réglages (couleurs,
  formats, lots, offres, abonnement) s'affichent ou se masquent **selon les données réelles du produit** (variantes, offres
  saisies par le client) : rien d'affiché pour une option que le produit n'a pas. **Livraison estimée, points de fidélité, offres (lots,
  N achetés M offerts, cadeaux) et choix entre plusieurs produits de la gamme sont des fonctions de ce bloc d'achat,
  jamais des sections à part** (retour du propriétaire du 8 novembre 2026).
- **Montage d'un thème avec la bibliothèque de sections** (retour du propriétaire du 8 novembre 2026, option B de Brindi) :
  **accueil : au moins 8 sections, fiche produit : au moins 7** (contrôle bloquant `MIN_SECTIONS` du thème sur mesure,
  rappel du 9 novembre 2026) ; **le fond clair ou sombre suit l'ambiance voulue par le client** (SINA la lui demande et
  choisit des sections dont le fond d'origine convient ; **aucune section n'est inversée** : l'inversion clair ↔ sombre a
  été retirée à la demande du propriétaire le 10 novembre 2026, chaque section garde son fond d'origine ; une section
  posée sur une photo va avec les deux ambiances ; toutes les sections prennent les couleurs de la marque, palettes
  d'exemple `tA` / `tB` / `tN` comprises, retour du propriétaire du 9 novembre 2026) ; **une seule section de cartes (produits ou familles) par page** ; une section qui montre plusieurs styles au choix dans la
  bibliothèque (ex. « Livraison estimée » en 3 styles) n'en garde **qu'un seul** sur une vraie page. **Jamais une section
  « pour prendre une section »** : chaque section a un rôle dans l'histoire de la page, est choisie selon la personnalité
  de la marque, l'angle et son émotion, le métier et le contenu réel, et le tout reste harmonieux (méthode complète :
  `docs/montage-themes-sina.md`).
- **Familles de sections** (décision du propriétaire du 9 novembre 2026, `src/lib/syna-agent/section-families.ts`) :
  « Classique » (calme, éditoriale) et « Moderne » (d'après ses modèles Instagram : titres énormes, mannequin détouré
  qui déborde de l'ouverture, couleurs franches ; styles d'exemple Sport chic et Streetwear néon, plusieurs sections au
  choix par rôle). **Jamais de mélange de familles dans un thème.** SINA montre les familles au client **en image**
  (`theme.families`) et enregistre **son** choix (`theme.family`) avant tout thème ou maquette. Les textes des sections
  ne reprennent jamais ceux des modèles montrés (même traduits).
  **Images de la famille Moderne** : quand le client la choisit, TOUTES ses images (site, publications, publicités)
  suivent sa charte (`familyArtUniverse`, direction artistique du projet) : photo de mode éditoriale, mannequins inventés
  seulement si les personnes sont autorisées (sinon produits seuls dans le même style), sujet entier, rien de coupé.
- **Noms de marque** (décision du 10 novembre 2026, la plus récente : « c'est ce genre de nom de marque que je veux que
  SINA trouve » devant **« Éclat de thé »**) : marques de produits = **trois noms du genre « Éclat de thé »** (un mot qui
  fait ressentir une sensation ou un moment, puis « de », puis ce que la marque vend ou sa matière ; trois idées
  différentes, contrôle `EXPRESSION_NAME`) ; entreprises de services : trois genres différents, dont le **mot fort** comme
  SOLSTICE ou RUPTURE (décision du 9 novembre) (`nameKindRule`, `src/lib/syna-agent/identities.ts`).
- **Écrire une consigne d'image comme le propriétaire** (modèle réussi du 16/10, `docs/guide-images-ia.md`) : décrire
  UNE photo, en phrases complètes et logiques, dans cet ordre : 1) type de photo, format, point de vue, cadrage ;
  2) surface et fond ; 3) chaque objet dans son paragraphe : place exacte dans l'image, forme, matière, couleur, état,
  et ce qu'il ne contient pas (« l'écrin est vide : aucune montre, aucun cadran… ») ; 4) « La scène contient exactement
  N objets : … » ; 5) ce qui est coupé par le cadre ou laissé dégagé ; 6) lumière, ombres, textures, mise au point,
  ambiance ; 7) « Aucun texte, aucune lettre, aucun chiffre, aucune gravure, aucun logo, aucun filigrane, aucune
  personne. Aucun objet supplémentaire. » Jamais de contradiction (ne pas citer le produit ni ses matières s'il ne doit
  pas apparaître), jamais d'objet vague (« quelques accessoires »).
- **L'émotion, l'émotion, l'émotion, et des images magnifiques** (retour du 9 novembre 2026, à ne plus jamais lui faire
  répéter) : tout texte de site, de publication ou de publicité fait RESSENTIR l'émotion de l'angle (scène, moment,
  sensation), jamais une simple description ; les boutons qui vendent portent le désir (« Retrouver l'été », pas
  « Choisir mon parfum ») ; aucune accroche répétée, aucun ordre au lecteur (« Lis l'étiquette »). Toute image est
  magnifique, digne d'une campagne haut de gamme : vraie scène de vie, lumière travaillée, profondeur, vrai produit
  du client (jamais de pot ou d'emballage générique aux étiquettes vides), jamais un packshot plat sur fond uni pour
  une ouverture ou une ambiance. **Le texte se pose sur la partie calme de la photo, le sujet de l'autre côté**
  (jamais le titre sur le produit et le vide à côté). Règles branchées : `COPY_CRAFT` et plan des textes
  (`src/lib/syna-agent/custom-theme/brand.ts`), `siteArtUniverse` (famille Classique comprise), `textPlacementLine`,
  niveau visé dans `codePhotoPrompt`.
- **Textes du site écrits par Claude** (décision du 9 novembre 2026, après comparaison réelle sur Heure Dorée avec
  GPT-5.6 Sol : meilleur accueil chez OpenAI mais fiche produit plate, une garantie perdue et 1,45 € contre 0,92 €).
  Le réglage `site.copy_model` reste vide (Claude) ; ne pas le changer sans sa demande.
- **Marque créée par SINA : décisions du 12 novembre 2026** (les plus récentes ; **construit le 12 novembre 2026** ; un
  seul essai réel ce jour-là, sur l'exemple des infusions de fruits au forfait à 89 € : 3 identités en 14 minutes pour
  2,88 € (plafond 7,83 €), deux cohérentes (« Tranche », « Froid Devant ») et une ratée (nom et textes en désaccord) ;
  ses leçons sont corrigées dans le code mais **pas encore revérifiées par un second essai** ; méthode et cahiers de
  métier : `docs/sina-savoir/`, retours détaillés : `docs/etat-des-lieux-2026-11-12.md`, partie 6) :
  - le client n'entend que SINA : ses spécialistes restent en coulisses (« j'ai étudié ton marché », jamais « ma stratège ») ;
  - **nombre d'identités selon le forfait** : 2 au forfait à 49 €, 3 à 89 €, 4 à 129 € ;
  - une identité se montre en **planche de marque** (l'idée, le nom, les signes, le sachet ou l'objet, le site sur
    téléphone, des publications, la voix, ce qui reste à prouver), jamais en simple fiche « nom, couleurs, polices » ;
  - **un seul logo**, dessiné par OpenAI pour l'identité que le client a choisie, à partir de l'idée de la marque et du
    nom dessiné de sa planche (remplace « 3 logos ») ; SINA le vérifie avant de le montrer ; le nom dessiné en code de la
    planche sert de secours, donc le client finit toujours avec un logo ; s'il n'aime pas le logo, SINA en redessine un
    autre, compté dans son budget et annoncé avant ;
  - le ton se choisit selon le produit (l'ironie lui a plu « pour ce genre de produit », des infusions aux fruits) ;
  - les six premières propositions d'essai (noms fabriqués sur la formule « un mot + de + fruits ») : « Je trouve ça nul ».
  - Noms du second essai réel refusés (12 novembre 2026) : « Tintamarre » (« c'est nul comme nom ») et « Morceaux
    Choisis » (« ça représente rien et c'est moche, tu appellerais ton site comme ça toi ? »). Sa question est devenue
    l'épreuve du fondateur. **Juge des noms** (`nameJudgeSystem`, étape `brand:judge` de la chaîne) : celle qui compose
    les routes jugeait aussi ses noms, avec indulgence ; un juge séparé dit oui ou non à chaque finaliste (le fondateur,
    le nom lu seul, la beauté ; noms refusés et leurs mots dans `NAME_REFUSALS`, jamais reproposés). Aucune planche n'est
    faite sur un nom refusé tant qu'un nom gardé existe ; si trop peu tiennent, les équipes repartent chercher UNE fois
    en sachant ce qui a été refusé ; un nom montré faute de mieux l'est avec le doute dit au client. Charge utile
    `namesPreview` : les noms seuls, sans planche, pour les juger à peu de frais. **Essai réel du 12 novembre** (noms
    seuls, accord écrit, 0,65 € pour un plafond de 2,18 €) : le juge passait alors APRÈS la composition et ne voyait que
    7 noms par tour sur 178 trouvés ; il en a refusé 13, avec des raisons proches de celles du propriétaire, et gardé un
    seul (« Pulpe ») ; de meilleurs noms de la réserve (« Haut les Pêches », « Tout Feu Tout Fruit », « Cerise sur le
    Verre ») n'arrivaient jamais devant lui. **Corrigé** : le juge lit TOUS les noms des équipes AVANT la composition,
    et les routes ne se composent qu'avec les noms qu'il garde (ou, faute de mieux, ses « presque », avec le doute dit).
    Cette correction est testée avec une IA simulée, pas encore réessayée pour de vrai. **Notes du propriétaire**
    (12 novembre, même marque d'infusions) : « Pulpe » 9/10, « Haut les Pêches » 6/10, « Tout Feu Tout Fruit » 6/10,
    « Cerise sur le Verre » 4/10 (`NAME_RATINGS`) : le juge ne garde qu'un nom qu'il noterait 8 sur 10 ou plus
    (`NAME_KEEP_SCORE`). Lecture de Claude, pas ses mots : un mot simple qui dit la matière du produit bat un jeu de
    mots sur une expression. Charge utile `names` : une proposition se fait sur un nom CHOISI par le client, lettre pour
    lettre, sans recherche ni juge (devis `chainQuote({ imposed: true })`).
  - **Où c'est dans le code** : chaîne en tâche de fond `syna.brand` (`src/lib/syna-agent/brand-chain.ts` : étude du
    marché sur le web, paroles de clients gardées seulement si elles se retrouvent mot pour mot dans la page citée,
    idées, équipes de noms séparées, routes, vérification des noms sur le web, planches, directeur de création qui relit
    aussi la reprise ; consignes des spécialistes `brand-prompts.ts`, cahiers lus par `brand-knowledge.ts`) ; routes et
    contrôles gratuits `brand-routes.ts` (plus de formule de nom : ses 50 noms servent de mesure au jugement ; un chiffre
    ou une garantie absents de la fiche du client sont refusés, ou annoncés dans « ce qui reste à prouver ») ; contenu
    d'une planche `brand-board.ts` (textes courts et tracés nettoyés : jamais de HTML ni de script du modèle à l'écran) ;
    nom dessiné en code `brand-wordmark.ts` ; planche à l'écran `src/components/studio/brand-boards.tsx` ; logo unique et
    secours de la planche dans `logos.ts` (`runSingleLogo`).
  - **Réglages** : `sina.brand_method` (« chaine » par défaut ; « simple » = l'ancienne création en un appel, 3 identités
    puis 3 logos, gardée par sécurité tant que la chaîne n'est pas validée sur un essai réel) ; `sina.brand_chain`
    (nombre d'équipes de noms, modèles). Les identités créées avant (sans planche) restent lisibles et choisissables,
    avec leurs 3 logos : aucune migration.
  - **Leçons de l'essai réel du 12 novembre** (toutes dans le code et testées) : une parole de client n'est gardée que si
    le Studio la relit sur la page elle-même (`quotesReadOnPages` ; la recherche ne rend que des extraits écrits par un
    modèle) ; la recherche web de la marque passe par le modèle « métier », moins coûteux ; le nom et le fond d'une route
    ne changent jamais pendant une reprise (une reprise qui les change est écartée) ; un nom refusé par le directeur de
    création est remplacé par un nom de réserve déjà vérifié, avec une planche neuve ; un second tour d'idées quand trop
    peu passent les deux épreuves ; tutoiement du client ; ce qui reste à régler est décrit, jamais promis.
  - **Planche illustrée** (retour du propriétaire du 12 novembre 2026 après l'essai réel : « ce que tu as fait toi était
    mieux […] les cartes ne sont pas toutes droites […] la base des logos […] beaucoup plus d'icône/image ») : la planche
    reprend la forme des planches faites à la main : scène dessinée en tête, objets penchés, publications décalées, colis,
    autocollant, mots écrits à la main, tuiles translucides, fonds à lueurs (`brand-boards.tsx`, feuille de style fixe).
    Une **illustratrice** (appel `art`, modèle « métier », après la relecture, consigne `artSystem`) dessine en SVG ;
    chaque dessin passe par la liste blanche de `brand-art.ts` (ni texte, ni lien, ni style, ni script ; refusé en entier
    au moindre écart : la planche garde alors sa forme, avec une scène de secours). **Gestes de lettrage** du nom
    (`WordmarkSchema` : taille et inclinaison par ligne, mots en couleur d'accent, ligne qui coupe le nom, lettre remplacée
    par un dessin, mots à la main, trait), composés par le Studio lettres exactes (`brand-wordmark.ts`, `safeWordmark`).
    Vérifié en image sur les planches d'exemple (`tests/sina-routes-fixtures.ts`, `tests/sina-dessins-fixtures.ts`).
    **Second essai réel du 12 novembre 2026** (accord écrit du propriétaire ; les trois planches du même exemple refaites,
    étude et noms du premier essai repris sans être repayés) : 1,92 € (plafond 5,62 €), 15 appels, 11 minutes ;
    « Morceaux Choisis », « Tintamarre », « Plein les Yeux » ; l'illustratrice a rendu la scène, le devant de l'objet et
    l'image du site des trois planches, 3 signes sur 5 et 8 publications sur 9 ; aucun dessin refusé par le filtre.
    Leçons, corrigées et testées : seul un **O sans accent** se remplace par un dessin (un rond à la place d'un A ou d'un
    i donnait « Tintomarre » et « Pleon ») ; petits mots en minuscules dans un nom à capitales (« Plein les Yeux ») ;
    publication = dessin en haut, texte en dessous, 60 caractères au plus ; dos de l'objet en 3 lignes courtes ; réponse
    mal formée de l'illustratrice réparée détail par détail (`prepareArt`). **Relecture des dessins en image**
    (13 novembre, `brand-art-review.ts`, étape `brand:artcheck`) : chaque dessin est rendu en image et regardé par un
    modèle qui voit ; un dessin raté est retiré, la planche garde sa forme. Ces dernières corrections n'ont pas été
    revues par un troisième essai.
  - **Images de planche par OpenAI** (demande du propriétaire du 12 novembre 2026, après le second essai : « faire
    intervenir OpenAI pour générer les images qui viendront finir réellement les planches […] chaque logo des planches par
    OpenAI […] une vraie direction artistique complète » ; en dessin, les publications et le site sur téléphone peuvent
    faire croire que « le studio n'est pas à la hauteur ») : pour chaque planche, une directrice artistique écrit UNE
    direction globale et les consignes (`imagerySystem`), puis le modèle d'images de SINA (réglage
    `syna.mockup.image_route`) crée sept images : le **logo** (à partir du nom composé par le Studio ET de la direction
    artistique globale), la grande scène, l'objet avec **le logo posé dessus**, le haut du site sur téléphone, les trois
    publications. Les petits signes restent dessinés par SINA. Les textes d'une image viennent de la planche, lettre pour
    lettre ; chaque image est relue par un modèle qui voit ; une image refusée laisse le dessin de SINA, c'est dit au
    client, et elle est marquée refusée dans sa bibliothèque ; une image en échec n'est jamais relancée seule ; un mélange
    d'identités retire les images qui ne sont plus vraies. Code : `src/lib/syna-agent/brand-images.ts` (`runBoardImages`),
    devis `boardImagesQuote` ; réglage `sina.brand_images` (« dessins » par défaut tant que le propriétaire n'a pas validé
    un essai réel, « openai ») ; charge utile `images` et `imagesOnly` de la tâche `syna.brand`. Devis du 12 novembre
    (tarif officiel revu ce jour-là) : 1 planche, 1,21 € probable et 1,67 € au plus ; 3 planches, 3,64 € et 5,02 €.
    **Construit et testé avec un faux modèle d'images : aucun essai réel à ce jour.** Le logo de planche est créé sur
    fond blanc ; quand le client choisit cette planche, il est **repris à l'étape 2 sans rien repayer** (fond retiré,
    proposé à côté du nom dessiné ; `boardLogoReady`, `saveBoardLogo`, `logo.propose` gratuit dans ce cas) ; un autre logo
    n'est dessiné, et payé, que s'il le demande. Avec ces images, « un logo par planche » remplace « un seul logo après
    le choix ».
  - **Troisième essai réel, 13 novembre 2026 : planche complète « Pulpe »** (accord écrit du propriétaire ; nom choisi
    par lui, à la place de la planche B ; étude et idées reprises sans être repayées) : 2,13 € (plafond annoncé 3,50 €),
    18 appels, 8 minutes et demie. Sept images OpenAI créées : le logo (nom à moitié plongé, exact), la grande scène, le
    site sur téléphone (tous ses textes exacts) et les trois publications sont bons ; le sachet a été refusé à raison
    (mention « 250 g » que personne n'avait demandée). **Défaut trouvé : le relecteur d'images a refusé à tort deux
    publications parfaitement écrites** (« dedans mal écrit », alors qu'il avait lui-même recopié le texte sans faute).
    **Corrigé et testé** (`brand-images.ts`) : le Studio compare lui-même la lecture du relecteur au texte attendu
    (`textCheck`) ; quand son jugement contredit sa propre lecture, l'image est relue une seconde fois, seulement
    recopiée (`brand:imagereread`, `imageRereadSystem`), et c'est la comparaison du Studio qui tranche ; un refus sans
    nature précisée reste un refus ; le message au client dit « mon dessin » seulement s'il reste un dessin à cette
    place. Correctif pas encore revu par un essai réel. Remarque notée, à voir avec le propriétaire : le nom en tête de
    planche prend l'accent le plus lisible sur le fond (ici vert), le logo sur blanc prend la couleur de marque (rose).
    **Essai réel des noms, 13 novembre 2026** (accord écrit du propriétaire : « je veux aussi 2 autres noms pour voir
    si c'est compris pour SINA » ; 0,54 € pour un plafond de 1,32 €, 6 appels, 4 minutes) : première mise à l'épreuve
    du juge placé AVANT la composition, avec ses notes comme mesure. Il a lu 326 noms (la réserve déjà payée, puis un
    second tour des quatre équipes) et en a gardé 4 : « Zeste », « Gorgée », « Fruit Nu » et « Pulpe Vive » ; 12 « presque »,
    écartés avec des raisons proches des siennes (« Haut en Couleur » : « une expression toute faite, au niveau de Tout
    Feu Tout Fruit, un 6 sur 10 tout au plus »). Leçon corrigée et testée : « Pulpe Vive » n'est pas un autre nom ; un
    nom bâti sur un nom déjà montré n'est jamais reproposé (`builtOnShown`, dans la réserve et avant le juge). **Notes
    du propriétaire sur ces noms (13 novembre)** : « Zeste » 8/10 ; « Gorgée » : « ça fait très porno » ; « Fruit Nu » :
    « pareil » (`NAME_RATINGS`, `NAME_REFUSALS`). D'où une épreuve de plus pour le juge et les équipes, **le
    sous-entendu** : un nom qui peut s'entendre de travers (sexuel, grivois, vulgaire, moqueur) est écarté au moindre
    doute ; un mot sensuel n'est pas un mot équivoque.
  - **Nom de domaine** (demandes du propriétaire du 13 novembre 2026 : « le nom de domaine doit aussi être disponible
    avec le nom de la marque », puis « il faut trouver une alternative disponible comme pulpefrance.fr ou .com, tout en
    gardant le nom ») : SINA contrôle le domaine de chaque nom, gratuitement et sans IA (`brand-domains.ts` : annuaire
    public des registres, AFNIC pour .fr et Verisign pour .com). L'exact d'abord (`nom.fr`, `nom.com`) ; s'il est pris,
    des adresses qui GARDENT le nom entier (`nomfrance`, le nom et le mot du métier, `maisonnom`, `nom-officiel`,
    `nomboutique`), jusqu'à deux libres. La planche l'affiche (« Son adresse sur Internet »), SINA le lit dans son
    contexte, l'aperçu des noms aussi. « Libre » veut dire « pas enregistré à l'instant du contrôle » : seule la
    réservation le garantit, c'est toujours dit, et SINA ne promet ni n'invente jamais une adresse. Un nom retouché ou
    pris à une autre planche perd son contrôle. Vérifié pour de vrai le 13 novembre : pulpe.fr, pulpe.com, zeste.fr et
    zeste.com sont pris ; pulpefrance.fr, pulpefrance.com, zestefrance.fr et zestefrance.com étaient libres ce jour-là.
  - **Le haut du site sur téléphone** (retour du propriétaire du 13 novembre 2026 sur l'image créée par l'IA : « 3/10,
    ça doit être mieux fait et plus représentatif de ce que ça devrait devenir ») : ce n'est plus une image. Le Studio
    rend une vraie page sur la planche (`brand-boards.tsx`, `PhoneSite` ; `brand-site-preview.ts`) : bandeau, menu et
    panier, la grande image de la marque en ouverture (ou le dessin de SINA), titre, texte et bouton de la planche
    lettre pour lettre, points forts vrais tirés du dos de l'objet, début de la boutique avec le premier produit connu
    (jamais un faux produit). Le modèle d'images ne crée donc plus que **six images** par planche (`CREATED_SLOTS` :
    logo, grande scène, objet, trois publications), une image payée de moins. Vérifié en image sur la planche
    « Pulpe » (avec photo) et sur une planche dessinée ; pas encore noté par le propriétaire.
    **Dépensé en essais réels au 13 novembre : 8,13 €** (2,88 + 1,92 + 0,65 + 2,13 + 0,54 ; plafond d'essais 10 $, soit 9 €).
  - **Carte des spécialistes de SINA** (demande du propriétaire du 13 novembre 2026 : « tous les sous agents nécessaires
    pour le fonctionnement parfait de sina […] fais comme tu considères le mieux ») : `docs/sina-savoir/specialistes.md`
    dit, étape par étape, qui fait le travail, ce qui manque et l'ordre des lots. Principes : celui qui fait n'est jamais
    celui qui juge ; le juge voit tout ; rien n'est montré sans avoir été relu ; devis avant, plafond pendant. Lot 1
    (finir la marque) fait le 13 novembre. **Lot 2 fait le 13 novembre** (thème sur mesure, `custom-theme/brand.ts`,
    testé avec une IA simulée, aucun essai réel) : un directeur de création relit TOUS les textes du site monté et fait
    reprendre les sections refusées (`COPY_REVIEW_SYSTEM`, 6 au plus) ; une directrice artistique relit TOUTES les
    photos prévues avant qu'une seule soit payée (`PHOTO_REVIEW_SYSTEM`, 5 sections redécrites au plus, jamais la source
    ni le format) ; la direction artistique de la planche choisie est reprise par les photos du site (`boardLook`) ; le
    devis de `custom.build` compte ces relectures ; le compte rendu les donne (`relecture`, `relecturePhotos`) et SINA
    les dit au client. **Lot 3 construit le 13 novembre, ÉTEINT par défaut** (la conversation, `conversation.ts`,
    réglage `sina.conversation` = `{aiguillage, momentsForts, relecture}`, à allumer seulement sur décision du
    propriétaire) : l'aiguilleuse (sans IA) n'envoie que la notice des outils de l'étape, les autres en une ligne, et
    SINA demande une notice avec `tools.open` ; aux moments qui comptent (résultat, échec, client mécontent) un modèle
    plus fort répond ; une relectrice lit la réponse avant qu'elle parte, une réécriture au plus, ses remarques ne sont
    jamais montrées. **Lot 4 fait le 13 novembre** (les cinq angles, `preparation/angles-judge.ts`) : un juge séparé
    juge les angles de la stratège, les refusés sont réécrits une fois et repassent les contrôles du Studio, un angle
    refusé qui reste est montré avec le doute de SINA (`doubt`, carte du fil). Tout cela testé avec une IA simulée,
    aucun essai réel. **Lot 5 construit le 13 novembre, étape 9 FERMÉE par défaut** (`sina.etapes_ouvertes` = `[9]`
    pour l'ouvrir ; son parcours veut chaque étape essayée en réel et validée avant la suivante) : le plan des 3
    groupes de publications est écrit par une stratège des contenus (charte § 7), contrôlé sans IA, jugé par un juge
    séparé, repris une fois au plus, montré dans le fil AVANT toute image (`posts-plan.ts`, `posts.plan`) ; les images
    passent par le moteur de publications du Studio (`posts.create` → `social.v2.produce`) ; `posts.validate`. Gardien
    des faits sans IA aussi sur les textes du thème sur mesure (`unconfirmedClaims`). **Lots 6 et 7 construits le
    13 novembre, étapes 10 à 13 FERMÉES par défaut** (`tools/steps-late.ts`) : publicités (`ads.create` → moteur
    `ads.v2`, forfait sans publicité dit simplement, `ads.validate` avec `skip`), calendrier (`calendar.validate`),
    articles (`blog.topics` gratuit, `blog.write` → moteur `blog.write`, brouillons, le client publie lui-même),
    rangement (`files.tidy` → `files.classify` sans IA, `files.validate` clôt le parcours). Ces étapes réutilisent les
    moteurs du Studio et leurs contrôles ; aucune n'a été essayée pour de vrai. **Ouvrir une étape** : réglage
    `sina.etapes_ouvertes` (ex. `[9]`), une à une, chacune après un essai réel validé par le propriétaire ; ne jamais
    en ouvrir une sans sa demande.
  - **Savoir du thème et bibliothèque de références** (demandes du propriétaire du 13 novembre 2026 : « Oubli ce qui
    déjà fait pour les thèmes sur mesure dans le studio et dit comment tu ferais toi » ; « je veux que toi et sina vous
    sachiez monter un thème complet de A a Z telle les plus grand créateur de thème au monde » ; puis « je veux tu aille
    beaucoup mais beaucoup plus loin dans la recherche de thème […] sina et ou son sous agent qui fait les thèmes doit
    connaître enormenment de référence afin de ne jamais faire de doublon dans les conception sur mesure que ce soit
    pour du service ou du produit, je veux aussi que tu me dises comment tu compte demander à sina et son équipe de
    monter le thème ») : seize cahiers de métier `docs/sina-savoir/theme-*.md` (construction des pages, images, textes,
    conception des sections, pièces d'une boutique, typographie et couleur, mise en page et mouvement, originalité,
    répertoire de 96 gestes et de 30 ouvertures, sections propres à 18 secteurs, sites de services par métier, atlas),
    tirés de neuf recherches sur le web ; une bibliothèque de 1 072 cartes d'identité de sites
    (`docs/sina-savoir/references/cartes.json` : 340 démonstrations de thèmes Shopify, 404 vraies boutiques de marques,
    328 modèles de sites de services), relevée par un programme sans IA et sans coût ; la méthode proposée
    `docs/sina-savoir/methode-montage-de-theme.md` : dix temps (dossier, références, histoire des pages, deux concepts
    jugés sur l'originalité, le client voit tôt, textes, montage, photos, trois regards, livraison et registre), une
    carte d'identité de dix lignes par thème, et une règle contre les doublons comparée sans IA à un registre des thèmes
    livrés. « Copyright » a été compris comme l'écriture des textes, plus ce qu'on a le droit de reprendre.
    **Rien n'est lu par SINA** (rien n'est branché dans le code), **rien n'est validé par le propriétaire, rien n'a été
    essayé.** Autre demande du même jour, à faire après : faire créer par OpenAI l'image du site sur téléphone des
    planches de marque, avec une consigne nourrie de ce savoir (« pour avoir un vrai rendu site internet ») : une image
    payée de plus par planche, prix à annoncer avant. Suite proposée : un modèle fait à la main (accueil de « Pulpe » sur
    téléphone), noté par lui, avant d'apprendre à SINA à faire pareil. Points à trancher avec lui : fin de
    `theme-construction-des-pages.md` et de la méthode.
    **Sections qui manquent** (sa question du 13 novembre : « les sections qui n'existe pas on fait comment ? », puis
    « Oui tu peux faire ») : inventaire `docs/sina-savoir/inventaire-sections-manquantes.md` : 338 idées des cahiers
    comparées aux 208 sections de la bibliothèque ; 114 existent, 146 sont proches, 78 manquent, soit 48 sections ou
    fonctions à construire (20 en priorité 1, dont la fiche technique, le bandeau de cookies, la rupture de stock, « dans
    le colis »). Rien n'est construit. Son retour du même jour, à ne pas lui faire répéter : « juste changer les images
    et les textes ferais déjà des thèmes trop basique car les sections sur le studio sont loin d'être à la hauteur de
    celle que tu as vu sur internet » ; il veut aussi de la variété dans les pièces de base (« les clients ne vont pas
    avoir tous les même menu les même bouton »). Réponse proposée, pas encore validée : chaque section a plusieurs
    constructions et sa tenue (titres, formes, fond, décor) vient de la planche de marque.
    Retour du même jour sur l'image qui montrait la même section en trois styles : « fiche 2 et 3 ça donne pas envie du
    tout le visuel du thème » (un style calme et un style brut essayés sur la photo de Pulpe, avec des textes vides).
    À retenir : tout écran qu'on lui montre, même pour expliquer, doit donner envie ; un style ne s'essaie jamais sur la
    photo ni sur les mots d'une autre marque ; chaque thème porte un signe pris sur son produit (la niche du mur pour
    un fauteuil, l'étiquette cousue pour un sac). Les deux fiches ont été refaites à la main avec les photos d'ALCÔVE et
    de TRAVERSE ; il ne les a pas encore notées.
    **Spécialistes du thème, lot 8, fait le 13 novembre 2026** (son rappel : « Mais je t'avais demander de faire tout
    les sous agents pour sina hier » : son mandat du 13 novembre couvre aussi les spécialistes qui apparaissent après ;
    ne plus lui demander s'il veut qu'on les construise) : la documentaliste, sans IA (`custom-theme/references.ts` :
    secteur reconnu, références proches et lointaines sans nom de site, sections propres au secteur, données au
    concepteur) ; la comparaison contre les doublons, sans IA (`custom-theme/identity-card.ts`, carte en neuf lignes,
    entre les deux concepts et avec les thèmes des autres marques) ; le juge de l'originalité
    (`custom-theme/originality.ts` : ses refus rejoignent la seule reprise du concepteur, il relit la reprise, un doute
    est dit au client, compté au devis) ; les regards en image (`custom-theme/looks.ts` : sur le montage qui pose les
    photos, l'accueil et la page qui vend capturés sur téléphone puis regardés, « est-ce que ça donne envie ? »,
    compte rendu `regards`, rien corrigé tout seul). Testés avec une IA simulée ; seule la capture des pages a été
    vérifiée pour de vrai ; aucun essai réel payant.
    **Tenue et constructions, fait le 13 novembre 2026** (sa demande : « Je laisse faire toutes la partie thèmes sur
    mesure avec sina et tu t'arrête pas tant que le résultat n'est pas le même que tu m'a envoyé exactement le meme ») :
    vingt sections « à tenue » (`custom-theme/tenue.ts`, `public/sections/tenue.css` et `tenue.js`, écrits à la main,
    hors `scripts/sections-library.py` ; elles vont avec les deux familles) ; plusieurs constructions par section
    (`data-tn-c` : en-tête centre, gauche ou sangle ; ouverture dans la photo, titre puis cadre ou titre géant ; « de
    près » ; mesures en quatre dessins) ; la tenue de la marque (`TenueSchema` : titres, bouton, cadre, fond, petits
    textes, signe pris sur le produit) choisie par le concepteur avec les sections (`design.ts`, `TENUE_RULES`) et
    changée sans rien repayer par SINA (`custom.structure` : `construction`, `tenue`) ; ce qui manque au dossier
    s'affiche en jaune « À compléter » ; bloc d'achat, cartes et panier remplis avec le vrai catalogue ; la carte
    d'identité contre les doublons compte la construction et la tenue (neuf lignes). **Vérifié en image, au pixel,
    sur téléphone**, contre les six écrans faits à la main qu'il a reçus (`tests/sina-tenue-fauteuil.test.ts`, IA
    simulée, captures avec `TENUE_OUT=<dossier>`) : accueil du fauteuil 0,00 % de pixels différents, proposition B
    0,03 %, ouverture du sac 0,09 %, page introuvable 0,00 %, contact 0,00 %, fiche produit 1,05 % (le nom de
    l'en-tête à moins d'un pixel ; la barre d'achat, montrée sur la capture du bas ; le Studio ajoute le pied de page
    que l'écran fait à la main n'avait pas). Sur ordinateur, les ouvertures passent en deux colonnes pour garder le
    produit entier : regardé en image, sans modèle à comparer. **Aucun essai réel payant** : on ne sait pas si la vraie
    IA choisit et écrit à ce niveau. Restent : la tenue des 188 autres sections, les 48 qui manquent, la liaison.
    **Ce qui est vrai du thème sur mesure, relu dans le code le 13 novembre** (ses questions : « comment tu va jouer la
    liaison ? Et les méga menu […] ? ») : une seule fiche produit, remplie avec le premier produit ; le panneau des
    grands menus reste un exemple vide ; les pages de prestations ne lisent pas la rubrique Prestations et
    Rendez-vous ; aucun envoi vers Shopify. Le moteur des thèmes du Studio (`src/lib/theme`) fait déjà tout cela.
    **Décision de construction annoncée, pas encore validée par lui** : monter le thème sur mesure sur ce moteur (des
    modèles de page, jamais les produits dans le thème ; le propre de chaque produit rangé avec le produit ; le menu
    calculé depuis le catalogue, grand menu par familles quand il y a beaucoup de produits, proposé par SINA, corrigé
    par le client). Ordre annoncé : 1) spécialistes (fait), 2) liaison (une page par produit, collections, menus, mise
    en boutique) avec d'abord un modèle à lui faire noter, 3) sections (constructions, tenue, les 48 qui manquent).
    **Chiffres qu'il a demandés** (1 072 sites, accueil et une fiche produit seulement) : accueil 14 sections pour les
    démonstrations de thèmes, 9 pour les vraies marques, 10 pour les services ; fiche produit 6 et 5. **Pages simples**
    (contact, page introuvable, aide, légal) : courtes, montées toutes seules dans la tenue, sans image payée ; montré
    en image, pas de réponse. **Image d'ouverture** : jamais la photo produit du client telle quelle, toujours une
    scène créée par OpenAI avec son vrai produit (sa confirmation demandée le 13 novembre ; la règle est dans le code).
  - **À confirmer par le propriétaire** : le quatrième fond d'une série de quatre identités (aujourd'hui un fond clair
    coloré, « uni ») ; la règle « un fond sombre par série » quand le client demande du joyeux et du coloré (le directeur
    de création l'a contestée pendant l'essai) ; le réglage des modèles.
- **Réponses courtes et claires**, sans jargon ; ne pas reposer une question à laquelle il a déjà répondu.
- **Ne pas décider à sa place** : un retrait de contenu ou un changement visible important se propose, il ne s'applique
  qu'après son accord. Retirer un visuel raté sans rien mettre à la place n'est pas une correction.
- **Catalogue de thèmes proposé** (mission #190 du 25 octobre 2026, inventaire `docs/INVENTAIRE-THEMES-190.md`) : seuls les
  thèmes **refaits d'après les maquettes de Thomas** sont proposés (galerie, IA, commandes, recommandation, tarifs) :
  **fraise**, **onde**, **rive**, **sillon**, **noctil**, **traverse**, **heuren**, **museau-club**, **souple**,
  **table-saison**, **atelier-nuance**, **parenthese**, **phase**, **maison-horizon** et **aplat** (`MAQUETTE_THEMES`,
  `src/lib/theme/theme-fit.ts`). ORBE et ALCÔVE (créés avant les maquettes, aucune maquette retrouvée) et les 30 thèmes de
  l'ancien catalogue ne sont ni sélectionnables ni recommandés ; un projet qui en utilise un le garde (compatibilité de
  lecture), jamais de migration silencieuse ni de suppression. **Plus de familles** pour le choix, les quotas et les
  droits : tout thème proposé sert à tout projet ; l'usage prévu (`themeKinds`) ne sert qu'à recommander. **Droits par
  thème et par forfait** (`src/lib/theme/theme-rights.ts`, Administration › Thèmes et forfaits) : Thomas choisira les
  thèmes des forfaits à 49 € et 89 € ; tant qu'un forfait est « à choisir », tous les thèmes proposés lui restent ouverts.
- **Démonstrations** (priorité du 19 octobre 2026, issue #137) : les seules sont **FRAISE** (gummies, boutique spécialisée ; reprise des sept planches corrigées du 24 octobre, sections `fg-*`, voir `docs/LISEZMOI-fraise.md`),
  **ONDE** (casque audio : thème **mono-produit de la famille E-commerce**, refait d'après les sept planches du
  24 octobre, PR #183, `docs/theme-briefs/onde/` : profil de conversion « onde » (`assets/onde.css`, `onde.js`, règles
  préfixées `body[data-conversion="onde"]`, aucun texte dans la feuille), sections `on-*` (en-tête, pied, fiche, panier,
  tiroir, commande d'exemple, aide) réservées à ce thème, titres Montserrat 700, textes Inter, prix illustratif centralisé
  `ONDE_PRICE` (149 €), démonstration `tests/onde-fixtures.ts`, visuels du kit `public/demo/onde/`, versionnés
  (décision du 6 novembre) ; cellules « ordinateur » de la planche 03 comparées à 913 px ; rapport
  `docs/coordination/ONDE_RESULTATS.md`), **ORBE** (lampe, e-commerce), **Atelier Rive** (prestations de services),
  **SILLON** (machine à espresso nomade, boutique spécialisée, issue #148 ; **V2** refaite d'après les trois planches
  validées et les quatre planches téléphone, PR #182 : sections `sv-*`, `theme-base/assets/sillon.css`, 129 € illustratif,
  commande simulée sans champ de carte ; médias suivis dans `public/theme-assets/sillon/`, démonstration
  `tests/sillon-fixtures.ts`, voir `docs/LISEZMOI-sillon-v2.md`), **NOCTIL** (projecteur de galaxies) et **TRAVERSE** (sac de voyage modulable),
  boutiques spécialisées de l'issue #152 (médias dans `public/theme-assets/noctil/` et `traverse/`, TRAVERSE ambiance-04
  volontairement hors rendu ; NOCTIL refait d'après les maquettes du 23 octobre, PR #167 : démonstration
  `tests/noctil-fixtures.ts`, aides communes dans `tests/noctil-traverse-fixtures.ts`), **HEUREN** (montre bleu nuit) et
  **ALCÔVE** (fauteuil terracotta) : thèmes **mono-produit de la famille E-commerce** (consigne expresse de Thomas, issue
  #155 ; jamais « boutique spécialisée »), médias dans `public/theme-assets/heuren/` et `alcove/`, démonstrations
  `tests/heuren-alcove-fixtures.ts` ; **MUSEAU CLUB** (harnais, laisse, collier et pochette à sacs pour chiens) : thème de la
  **famille Produit spécifique / Boutique spécialisée, à quatre produits** (décision de Thomas du 21 octobre, 12 h 58, issue
  #158, qui remplace le premier classement E-commerce ; profil « club » de la famille), chaque produit avec sa propre fiche,
  médias dans `public/theme-assets/museau-club/`, démonstration `tests/museau-souple-fixtures.ts` ; **SOUPLE** (tapis de yoga,
  brique, sangle et anneau Pilates) : thème de la **famille E-commerce, à quatre produits**, refait d'après les six
  maquettes du 23 octobre (PR #180, `docs/theme-briefs/souple/`) : profil de conversion « souple » (`assets/souple.css`,
  règles toutes préfixées `body[data-conversion="souple"]`, aucun texte dans la feuille), titres Playfair Display, textes
  Jost, sections cv- rangées dans la galerie E-commerce (refusées aux thèmes qui ne savent pas les rendre), prix de
  démonstration centralisés (`SOUPLE_PRICES`, tapis + brique = 78 € de sous-total), commande d'exemple en 4 étapes et
  compte fictif `demo@souple.example` / `demo` ; médias dans `public/theme-assets/souple/` (59 visuels ; 21 et 22
  reçus par correctif, 21 recréé), démonstration `tests/souple-fixtures.ts`, rapport `docs/coordination/SOUPLE_RESULTATS.md`.
  **TABLE SAISON** (restaurant, famille **Services**, issue #175) : démonstration complète d'après les cinq planches de
  Thomas (`tests/table-saison-fixtures.ts`, médias WebP dans `public/theme-assets/table-saison/`), réservation simulée en
  démonstration et service réel du studio (`src/lib/restaurant/booking.ts`) ; voir `docs/LISEZMOI-table-saison-175.md`.
  **ATELIER NUANCE** (salon de coiffure, famille **Services**, issue #177) : reproduction des six planches de Thomas (la 05
  prime sur la 01 pour les prestations et la fiche ; prix et durées d'une seule source, la section « Réglages du salon »),
  démonstration `tests/atelier-nuance-fixtures.ts`, médias WebP dans `public/theme-assets/atelier-nuance/`, rendez-vous
  simulés en démonstration (« Simulation — aucun rendez-vous réel ») et service réel du studio (`src/lib/salon/booking.ts`) ;
  voir `docs/LISEZMOI-atelier-nuance-177.md`.
  **PARENTHÈSE** (cabinet de sophrologie, famille **Services**, mission du 24 octobre, PR #179) : reproduction des six
  planches (`docs/theme-briefs/parenthese/`), séances, ateliers à places, réservation en quatre étapes (cabinet / visio),
  gestion du rendez-vous ; séances, ateliers, tarifs et horaires d'une seule source (section « Réglages du cabinet »),
  valeurs d'exemple annoncées ; démonstration `tests/parenthese-fixtures.ts`, médias WebP dans
  `public/theme-assets/parenthese/`, service réel du studio (`src/lib/cabinet/booking.ts`) ; voir `docs/LISEZMOI-parenthese.md`.
  **PHASE** (électricien, famille **Services**, mission du 25 octobre, planches de la PR #188) : reproduction des dix planches
  (`docs/theme-briefs/phase/`), 18 pages ordinateur et téléphone (sections `ph-*`, `theme-base/assets/phase.css` /
  `phase.js`), formulaires de contact et de devis sans envoi réel en démonstration (récapitulatif lu dans le navigateur),
  filtres, questions, cookies ; démonstration `tests/phase-fixtures.ts`, photos du kit `public/demo/phase/images/`
  (versionnées, décision du 6 novembre) ; voir `docs/LISEZMOI-phase.md`.
  **MAISON & HORIZON** (agence immobilière, achat et location, issue #172) : thème de la **famille Prestations de services**
  (ouvert à partir du forfait Vendre, à confirmer), profil éditorial « horizon » (`assets/horizon.css`, `horizon.js`,
  sections `re-*`) ; les **biens** se saisissent dans l'espace **Biens** du studio (`src/lib/biens.ts`, table `biens`) et
  sont injectés au rendu (`withBiens`), jamais écrits dans le thème ; pages de recherche et fiche ajoutées à tout projet
  qui choisit le thème (`src/lib/theme/real-estate-site.ts`, chargé aussi dans le navigateur via `directions.ts` : imports de
  types seulement, sinon le studio ne compile plus) ; démonstration `tests/maison-horizon-fixtures.ts` (27 biens,
  une série de photos par bien, aucune photo partagée), 90 images en grand format dans le kit
  `public/demo/maison-horizon/` (versionnées, décision du 6 novembre) ; rapport
  `docs/coordination/MAISON_HORIZON_RESULTATS.md`.
  **APLAT — Plâtrerie & Peinture** (artisan, PR #187, dix planches du 25 octobre, `docs/theme-briefs/aplat/`) : thème de la
  **famille Prestations de services** (forfait Vendre, à confirmer), profil éditorial « aplat » (`assets/aplat.css`,
  `aplat.js`, sections `ap-*` réservées à ce thème), titres et textes Lato ; 18 pages (accueil, prestations, métiers,
  réalisations filtrables, détail avant/après, approche, FAQ, contact, devis en deux étapes avec photos, enduits, conseils,
  article, confirmation, pages légales, cookies réels, 404) ; démonstration `tests/aplat-fixtures.ts`, photos dans le kit
  `public/demo/aplat/` (versionnées, décision du 6 novembre) ; « Choisir ce thème » pose la structure avec les données du client
  (`src/lib/theme/aplat-site.ts`, chargé aussi dans le navigateur : imports de types seulement), sans photo ni coordonnée
  de démonstration ; formulaires en démonstration : envoi simulé « Démonstration — demande non envoyée » ; contrôle des
  interactions `scripts/aplat-interactions.ts` ; rapport `docs/coordination/APLAT_RESULTATS.md`.
  Les anciennes démos (ARVEN, Cime, Les Tribunes, Sonore, Racines & Pierres, Atelier Pivoine, Ostral) sont abandonnées :
  ne pas les adapter ni les maintenir. Leurs visuels viennent du kit privé de Thomas (`public/demo/<id>/`, hors dépôt).
  **Démos intégrales avant le choix** (revue PR #149) : la galerie « Thèmes » ouvre la boutique de démonstration
  complète de chaque thème (`src/lib/theme/theme-demos.ts`, exports statiques préparés hors dépôt par
  `npm run demos:themes`, ou automatiquement en arrière-plan) ; aucune donnée du projet n'y est substituée et le projet
  ne change qu'à « Choisir ce thème » (une seule tâche même en double-clic).
  **Page d'accueil** : chaque section montre de vrais visuels (sinon rien, jamais un gabarit) et les sections tournent
  entre ces quatre démos, en alternant produits et services.
- **Projets clients dédiés** (`clients/<clé>/`, ex. Le Coven des Charmes, PR #189) : site posé dans le thème DU projet
  du client (sections `es-custom-<clé>-*` du projet, médias de sa bibliothèque, pages et menus du projet) ; jamais dans
  `theme-base/`, le catalogue, les démos ni la bibliothèque de sections ; aucun média du client dans le dépôt
  (`.gitignore`). **Le Coven des Charmes n'est pas dans `main`** (décision de Thomas du 25 octobre, fusion globale
  #194) : son site, ses scripts et son rapport restent sur la branche `claude/le-coven-des-charmes` (PR #191) ; seul
  son dossier de consigne (`docs/client-briefs/le-coven-des-charmes/`, PR #189) est versionné. Son raccordement et la
  vérification de ses scripts se feront dans une intervention dédiée avec Codex, sans modifier les protections
  générales du studio (lot 9 : aucun script dans les sections d'un projet).

## Travail en plusieurs conversations (choix du propriétaire)

- **Une conversation « chef de projet »** (« E-COM STUDIO IA — suite ») reçoit les demandes du propriétaire, les
  découpe en tâches précises, crée une conversation spécialisée par domaine (`create_session` + `send_message`),
  suit leur travail (`list_events`), relit leurs PR et fait le compte rendu au propriétaire.
- **Un domaine par conversation, jamais deux conversations sur les mêmes fichiers en même temps.** Domaines :
  1. Boutique et thème Shopify : `theme-base/`, `src/lib/theme/`, sites de services (skill **verifier-theme**).
  2. Images et publicités : `src/lib/image-v2/`, `src/lib/ads-v2/`, `src/lib/ad-doc/`, `src/lib/social-v2/ai-post.ts`,
     routage des médias (`src/lib/ai/media-*.ts`).
  3. Vidéos : `src/lib/video-v2/`, vidéos du worker, tutoriels (`src/lib/tutorials/`).
  4. Marque et identité : logo, planche (`src/lib/media/identity-board.ts`), charte, vocabulaire du client.
  5. Publications et calendrier : `src/lib/social-v2/` (sauf `ai-post.ts`), pilote automatique.
  6. Forfaits, budget IA, sécurité, administration : `src/lib/billing*`, `src/lib/ai/access.ts`, `ai_calls`.
- **2 ou 3 spécialistes à la fois au plus.** Chacun part de `main` à jour, travaille sur **sa propre branche** et ouvre
  **sa propre PR** ; le chef vérifie la CI puis demande « Je fusionne ? » au propriétaire pour chacune.
- **Dépenses centralisées** : aucun spécialiste ne fait d'appel IA payant ; il prépare l'essai et le chef donne le prix
  au propriétaire et attend son accord écrit (plafond commun d'essais : 10 $).
- Tout spécialiste lit ce fichier en entier avant de commencer et rend compte de ce qu'il a **vérifié réellement**
  (tests, captures) et de ce qui ne l'a pas été.

## Règles du produit (ne pas casser)

- **Découverte n'est pas un forfait** : c'est un compte inscrit par e-mail, sans abonnement, qui visite le studio de démonstration (`src/app/studio/decouverte`) sans rien pouvoir créer ni modifier (création de projet refusée sans abonnement payé). Aucun appel à l'IA sans abonnement (`aiActiveFor`).
- **Le compte administrateur suit son forfait comme un client** (pas de passe-droit) : le propriétaire teste en
  gratuit puis en payant. Accès à l'IA : `aiActiveFor(userId)` (`src/lib/ai/access.ts`) ; le bouton « Désactiver »
  d'un fournisseur coupe vraiment ses appels.
- **Moteur local d'abord** : une retouche simple et sûre est faite sans IA même quand l'IA est active
  (`src/lib/engine/local-first.ts`) ; l'IA garde les demandes composées, créatives ou ambiguës.
- **Bilingue FR/EN** : interface et contenus. Les textes FR/EN passent par `L("fr", "en")` / `C(...)`
  (`src/lib/i18n-server.ts`) ; dans le thème, tout libellé de schéma a sa traduction dans
  `theme-base/i18n/schema.en.json` et toute clé `| t` existe dans `locales/fr.default.json` **et** `en.default.json`.
- Les coordonnées saisies à la création d'un projet ne doivent jamais être redemandées ni effacées.

## Démonstrations de référence (règle du 19 octobre, retour de Thomas 15 h 07)

- **Photos des 15 thèmes dans le dépôt** (décision du propriétaire du 6 novembre 2026) : les kits FRAISE, ONDE, PHASE,
  APLAT et MAISON & HORIZON (`public/demo/<id>/`) sont versionnés et publics, comme `public/theme-assets/`, pour que le
  Studio (Codespace compris) ait tous les thèmes complets. Les icônes du kit PHASE (non utilisées) restent hors dépôt.

- La démonstration FRAISE GUMMIES est la reprise complète des **sept planches corrigées** (consigne écrite de Thomas du 24 octobre, PR #185 pour les maquettes, `docs/theme-briefs/fraise-gummies/`) : sections `fg-*`, `theme-base/assets/fraise.css` / `fraise.js` (chargés par la mise en page, réglage `theme_kit`), offres 1 / 2 / 3 flacons à 16,60 / 24,90 / 33,20 € (`OFFRES_VALIDEES.json`, messages calculés par le snippet `fg-offer`), prix total du pack en premier, commande simulée sans champ de carte ; démonstration `tests/fraise-fixtures.ts`, photos du kit `public/demo/fraise/v2/` (versionnées, décision du 6 novembre) ; voir `docs/LISEZMOI-fraise.md`. Ne jamais la recomposer par le parcours « thème du catalogue » ni la simplifier sans consigne écrite de Thomas. L'ancienne composition Lumora reste constructible par `conversionProject(…, "fraise")` pour les anciens contrôles (lot 2C, bibliothèques par famille).
- ONDE AUDIO n'est plus la référence Pawish : refonte E-commerce (issue #158), puis reprise à l'identique des sept planches du 24 octobre (PR #183) ; sa composition (`tests/onde-fixtures.ts`, sections `on-*`, section Produit commune présente mais masquée) est figée de la même façon. Garde-fou commun : `tests/demos-fraise-onde-composition.test.ts` (liste ordonnée des sections, aucune masquée). L'ancienne composition Pawish reste constructible par `conversionProject(…, "onde")` pour les anciens contrôles du lot 2C.
- Toute livraison d'aperçu indique le commit exporté (`resume.json`) et la version d'artefact ; vérifier l'inventaire des sections de l'export avant de publier, et comparer à la version précédente (une section de moins = à expliquer dans la PR, jamais silencieux).

## Avant chaque envoi (commit + push)

```bash
npx tsc --noEmit
npx vitest run
```

- Modification du thème (`theme-base/`, `src/lib/theme/`) : utiliser le skill **verifier-theme**
  (`scripts/verify-theme.sh`, `scripts/theme-screens.ts`) — la CI refuse la fusion au moindre échec de Theme Check.
- Ajouter un test dans `tests/` pour tout comportement modifié.
- Messages de commit en français. Ne mettre aucun identifiant de modèle d'IA dans les commits, PR ou fichiers.

## Repères dans le code

- `src/app` — pages, studio (`src/app/studio/[projectId]`), API (`src/app/api`) ; `src/components/studio/tab-*.tsx` — onglets.
- `worker/handlers.ts` — tâches de fond (création, retouches de la boutique `shop.chat`, publications…).
- `src/lib/theme` — moteur de thème : `directions.ts` (40 directions définies, dont seules les 10 de référence sont proposées — `ACTIVE_DIRECTIONS` ; les 30 anciennes restent lisibles pour les projets existants), `compile.ts`, `render.ts` (aperçu Liquid),
  `ops.ts` (opérations de retouche validées), `preview-tools.ts` (sélection d'un élément dans l'aperçu).
- `theme-base/` — sections, snippets, `assets/theme.css`, `assets/theme.js` du thème Shopify.
- `src/lib/engine` — pipeline et moteur local ; `src/lib/ai` — fournisseurs, prompts, tâches IA.
- `src/lib/products` — onglet « Catalogue » (fiches produits du studio, variantes, stock) et connecteurs WooCommerce,
  PrestaShop, Shopify (correspondances, stock à trois points, import) ; `src/lib/rendez-vous.ts` — rubrique « Rendez-vous ».
  Exports et boutiques de test : `docs/EXPORTS-PLATEFORMES-190.md`, `docs/VALIDATION-190.md` (mission #190).
- Tutoriels vidéo : textes dans `src/lib/tutorials/`, vidéos dans `public/tutorials/`, voix off par
  `scripts/narrate-tutorials.ts` (voix Kokoro, voir l'en-tête du script ; le tutoriel « publicites » a pour fichier
  `campagnes`).

## Publicités vidéo (guide créatif)

Règles du propriétaire branchées sur le moteur « vidéo en scènes » : `docs/guide-creatif-video.md` (où elles vivent,
comment elles agissent). Valeurs : `src/lib/video-v2/creative-guide.ts` (modifiables sans code : réglage
`video.creative_guide`). Services = Pixabay par étape ; produits = vrai produit seulement ; seule la marque du projet.

## Images finales 100 % IA

Toute image finale est créée par un modèle d'images ; jamais de gabarit ni de photo de banque à la place, jamais de
bascule silencieuse (blocage signalé). Règles et branchements : `docs/guide-images-ia.md` ; valeurs
`src/lib/image-v2/image-guide.ts` (réglage `image.creative_guide`), direction artistique par client
`src/lib/image-v2/art-direction.ts` (mémoire `image.art_direction`, versionnée).
Modèle d'images de tout le studio : **Qwen-Image 3.0 Pro**, une seule étape (choix du propriétaire) ; produit
entier exigé (aucune partie coupée).
Exception choisie par le propriétaire — sites de services : les photos Pixabay restent permises comme images du site,
mais jamais en silence : le studio les signale au client (onglet Boutique et aperçu du studio, jamais sur le site
publié) et permet de les remplacer par sa photo ou une image IA (`src/lib/theme/stock-notice.ts`).

## Ligne directrice de marque (cohésion)

Toute création suit le même système que la planche d'identité (`src/lib/media/identity-board.ts`, `BRAND_RULES`) :
ancrage sombre + couleur de marque + accent + deux neutres (5 couleurs au plus), deux polices (titres / textes),
le symbole comme signature (sceau, motif, avatar, papeterie), icônes d'un seul style au trait, de l'air et des
ombres douces, rien d'inventé sur les maquettes. Planche refaite avec la charte (`saveIdentityBoard`).
