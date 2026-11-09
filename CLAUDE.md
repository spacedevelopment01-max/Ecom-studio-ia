# E-COM STUDIO IA — consignes pour Claude

Studio qui crée la marque, la boutique Shopify (ou le site d'une entreprise de services), les visuels, vidéos,
publications et publicités d'un projet. Next.js 15 (App Router) + worker de tâches de fond + SQLite. Voir `README.md`.

## Avec le propriétaire

- **Répondre en français simple** : il n'est pas développeur. Expliquer ce qui change pour lui, pas le code.
- **Ne jamais demander ni accepter de clé d'API dans la conversation.** Les clés se saisissent dans
  Administration › Fournisseurs IA (chiffrées) ou dans les secrets Codespaces / de l'hébergeur.
- **Honnêteté** : ne rien inventer (avis, chiffres, délais, certifications, résultats). Un manque se signale par
  « [À compléter : …] ». Dire clairement ce qui a été vérifié et ce qui ne l'a pas été.
- **Fusion (PR + merge) uniquement quand il le demande** (« fusionne », « oui » à « Je fusionne ? »).
  Après une modification terminée, demander « Je fusionne ? ».
- Dépôt GitHub : `spacedevelopment01-max/Ecom-studio-ia` (avec cette casse exacte pour les appels d'API GitHub).

### Préférences du propriétaire (à retenir, il ne veut pas les répéter)

- **Dépenses** : aucune API ou fournisseur payant ajouté sans son accord ; aucun appel IA payant ni publication réelle
  sans son autorisation. Toujours donner le prix avant une génération payante et attendre son accord écrit. Un appel
  au résultat incertain (erreur 5xx) n'est jamais relancé tout seul : le dire, puis demander. Plafond d'essais : 10 $.
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
- **Logos : jamais aucune direction.** Qwen-Image 3.0 Pro dessine ; si le contrôle juge le rendu insuffisant, OpenAI
  (ChatGPT) prend le relais ; le client finit toujours avec au moins un logo (le meilleur, signalé s'il n'est pas validé).
- **Images 100 % IA, avec Qwen-Image 3.0 Pro** (pas ChatGPT, jugé trop cher ; pas de texte posé en local à la place).
  **Exception : maquettes de site de SINA** (étape 6) avec **OpenAI GPT Image 2.5 Flare** (décision du 8 novembre 2026, après
  comparaison réelle : Qwen abîmait les textes de la page, OpenAI les écrivait juste). Les textes du site sont écrits
  AVANT la maquette (`mockup.copy`, sur l'angle choisi et son émotion) et posés lettre pour lettre sur l'image.
  Seules les pages principales ont une maquette (accueil, pages clés, menu, panier) ; les pages simples sont codées à
  l'étape 7 dans le style de la maquette, sans image à elles. **Photos du site codé** (étape 7, `site.images`) : toutes
  recréées en haute définition par le même modèle OpenAI, à l'identique de la maquette (décision du 8 novembre 2026).
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
  structure (`custom.structure`), photo créée (`custom.photo`, seul outil payant), annulation (`custom.undo`), choix
  (`custom.choose`). Le thème vivant s'affiche dans le fil (`/api/projects/<id>/custom-theme`, pages, téléphone) avec
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
  une section masquée faute de photo réapparaît quand ses photos sont posées. **Photos que SINA ne peut pas inventer** (décision du 9 novembre 2026, `authenticKind`) : l'équipe elle-même et les biens mis en vente ou en location (espace Biens) ; réalisations et avant/après des artisans (PHASE, APLAT), à fournir par le client (sa réponse du 9 novembre) ; le lieu, les villes et les ambiances, SINA les crée : SINA ne les crée jamais et les compte à part ; les images du client y vont en premier ; tant qu'elles manquent, l'aperçu du Studio montre à leur place un cadre « Photo à fournir — SINA ne peut pas inventer… » (`withAuthenticPlaceholders`), jamais sur le site publié ni dans l'export. Les photos posées vont dans le champ « fichier du thème » (`x_asset`) que la page affiche.
- **Sections « Produit vedette »** (décision du 8 novembre 2026) : elles ne vont qu'**en haut de la fiche produit**, ou au plus
  **une seule fois sur l'accueil** ; **jamais deux sections « Produit vedette » dans une même page**. Leurs réglages (couleurs,
  formats, lots, offres, abonnement) s'affichent ou se masquent **selon les données réelles du produit** (variantes, offres
  saisies par le client) : rien d'affiché pour une option que le produit n'a pas. **Livraison estimée, points de fidélité, offres (lots,
  N achetés M offerts, cadeaux) et choix entre plusieurs produits de la gamme sont des fonctions de ce bloc d'achat,
  jamais des sections à part** (retour du propriétaire du 8 novembre 2026).
- **Montage d'un thème avec la bibliothèque de sections** (retour du propriétaire du 8 novembre 2026, option B de Brindi) :
  **accueil : au moins 8 sections, fiche produit : au moins 7** (contrôle bloquant `MIN_SECTIONS` du thème sur mesure,
  rappel du 9 novembre 2026) ; **le fond clair ou sombre suit l'ambiance voulue par le client** (SINA la lui demande ;
  une section « inversable » passe en clair ou en sombre aux couleurs de la marque : règles `.ct-inv` / `.ct-dark` /
  `.ct-light` de `scripts/section-invert.cjs`, lisibilité mesurée par `scripts/section-invert-check.cjs`, drapeau
  `inversable` de `section-traits.json`) ; **une seule section de cartes (produits ou familles) par page** ; une section qui montre plusieurs styles au choix dans la
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
- **Noms de marque** (décision du 9 novembre 2026) : genre préféré = le **mot fort** comme SOLSTICE ou RUPTURE (un seul
  mot qui existe, 2 ou 3 syllabes, qui évoque l'univers ou l'attitude) ; marques de produits : deux mots forts + un mot
  inventé (`nameKindRule`, `src/lib/syna-agent/identities.ts`).
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
