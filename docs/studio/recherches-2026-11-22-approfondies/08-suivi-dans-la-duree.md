# Le suivi dans la durée, en profondeur : les dix-sept engagements faits pour de vrai

Recherche approfondie du 22 novembre 2026, après le rapport du matin (`docs/studio/recherches-2026-11-22/05-suivi-dans-la-duree.md`).
Je ne répète pas ce qu'il a déjà établi ; je repars de sa partie 8 (ce qui manquait) et je vais plus loin. Aucun appel
payant à une IA ni à un fournisseur.

**Niveaux de preuve** : **officiel** (texte de loi, page de l'autorité ou du fournisseur sur son propre produit),
**étude publiée**, **test indépendant**, **article d'éditeur**, **avis**.

**En bref.** Cinq découvertes changent le plan :
1. Le Studio ne lit aujourd'hui aucune vente Shopify (aucun droit de lecture des commandes) ; la voie sans attente est
   une application créée par le marchand lui-même (1.2).
2. Un compteur « sans cookie » ne dispense pas du bandeau à lui seul (comité européen, 2024) ; c'est l'exemption de la
   CNIL qui en dispense (1.1).
3. Les lignes directrices européennes du 5 novembre 2026 disent qu'une photo de produit retouchée par l'IA qui le montre
   plus beau qu'en vrai est un hypertrucage à signaler ; changer le décor ne l'est pas (4.1).
4. L'assistante du site doit se présenter comme une IA dès le premier message, et c'est au Studio de le faire (4.1).
5. Le ministère de la Justice écrit que « les plateformes en ligne ne sont donc pas autorisées à délivrer des
   consultations juridiques » : le bras droit informe, il ne conseille pas (8.1).

## 0. Ce qui existe déjà dans le code du Studio (vérifié le 22 novembre 2026)

- **Shopify** : l'autorisation du marchand demande `write_themes`, `write_products`, `write_content`, `write_files`,
  `write_online_store_navigation`, `write_discounts` (`src/lib/social/oauth.ts`, ligne 114). **Aucun droit de lecture des
  commandes** (`read_orders`) : l'engagement 10 ne peut donc pas lire une seule vente aujourd'hui.
- **WooCommerce** : cité dans l'écran (choix de la plateforme, catalogue), mais aucune lecture des commandes trouvée.
- **Mesure des visites** : rien. Aucune trace de Matomo, Plausible, Umami ni d'un compteur maison dans `src/`,
  `worker/` ou `theme-base/`.
- **Assistante du site** : rien dans le thème ni dans le Studio. Il existe en revanche un vrai service de rendez-vous
  (`src/lib/rendez-vous.ts`, adresses publiques `/api/public/salon|cabinet|restaurant/<projet>`), qui marche aussi sur un
  site exporté : c'est le bon modèle pour l'assistante et la boîte des demandes.
- **Devis d'artisan** : rien (les fichiers « quote » du Studio parlent du prix d'un travail d'IA, pas d'un devis).
- **Liens SMS ou WhatsApp préremplis** : rien.
- `src/lib/accounting.ts` est la comptabilité de l'administration du Studio, pas celle des clients.

---

## 1. Les vrais chiffres (engagements 1, 5, 6, 10 et 15)

### 1.1 Les visites du site, comptées par le Studio sans bandeau

**Une correction au rapport du matin.** Il pensait qu'un compteur « sans cookie » échappait à la règle des cookies. Le
comité européen de la protection des données (EDPB) dit l'inverse, dans ses lignes directrices 2/2023, version finale du
7 octobre 2024 (officiel) :
- paragraphe 43 : lire l'en-tête envoyé par le navigateur (« user agent ») pour une empreinte « can lead to the
  application of Article 5(3) » ;
- paragraphe 51 : un petit code qui fait renvoyer une information par le navigateur est un « gaining of access » ;
- paragraphes 54-55 : même le suivi par la seule adresse du visiteur peut y tomber ;
- paragraphe 56 : cela ne veut pas dire « consentement obligatoire » : il faut voir si une exemption s'applique.

https://edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf
(texte lu dans le document lui-même)

Donc **Plausible, Umami ou un compteur maison ne dispensent pas, à eux seuls, du bandeau**. Ce qui en dispense, c'est
l'**exemption de la CNIL pour la mesure d'audience**, quel que soit l'outil (officiel, page du 4 juillet 2025, relue) :
finalité « strictement limitée à la seule mesure de l'audience », « pour le compte exclusif de l'éditeur », « données
statistiques anonymes uniquement », pas de « recoupement des données avec d'autres traitements ». Pour un prestataire
qui sert plusieurs sites (c'est le cas du Studio) : données « collectées, traitées et stockées de manière indépendante
pour chaque éditeur », traceurs « totalement indépendants les uns des autres ». Il n'y a plus de label : le fournisseur
remplit une grille d'auto-évaluation et ne peut se dire ni « certifié » ni « validé par la CNIL ».
https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience

**Les trois outils libres, comparés sur leurs propres pages :**

| Outil | Ce qu'il dit faire | Ce qui reste à régler pour l'exemption | Preuve |
|---|---|---|---|
| **Matomo** | Page dédiée à la CNIL : adresse masquée sur 3 octets, traceur de 13 mois au plus, aucun identifiant d'utilisateur, données brutes gardées 25 mois au plus (lu par le rapport du matin). | Couper le suivi des achats, mettre la page de refus. C'est le seul des trois qui documente le réglage CNIL. | officiel (fournisseur) https://matomo.org/faq/how-do-i-configure-matomo-without-tracking-consent-for-french-visitors-cnil-exemption/ |
| **Plausible** | « Our script stores nothing on the visitor's device » ; visiteur reconnu par « hash(daily_salt + website_domain + ip_address + user_agent) », sel « rotated and deleted every 24 hours » ; adresses jamais gardées ; données en Europe. Il promet « you do not need cookie banners ». | La page ne parle ni de la CNIL ni de la directive « vie privée ». Sa promesse va plus loin que l'EDPB : à ne pas reprendre telle quelle. | article d'éditeur sur son produit https://plausible.io/data-policy |
| **Umami** | « Umami's web tracker does not use cookies » ; « GDPR compliance depends on how you configure and use it » ; installé chez soi, les données sont gardées « indefinitely unless you manually delete it » ; base PostgreSQL. | Il faut programmer soi-même l'effacement à 25 mois. | officiel (fournisseur) https://docs.umami.is/docs/faq |

**Ce que le Studio pourrait en faire** : un compteur dans le Studio lui-même (pas de fournisseur de plus), tenu dans les
conditions de l'exemption : rangement séparé par client, aucune adresse gardée (empreinte du jour avec un sel effacé
chaque nuit, comme Plausible), aucun lien avec le carnet de clients ni avec les demandes, effacement automatique à
25 mois, une ligne dans les mentions du site et un lien « ne pas être compté ». Le Studio remplit lui-même la grille
d'auto-évaluation de la CNIL et la garde. Dans le point du mois : « visites comptées sans suivre personne ». Si le
propriétaire préfère un outil déjà fait, Matomo est le seul qui documente le réglage CNIL.
- **Limite réelle** : le compteur ne voit que les sites que le Studio monte ou dans lesquels il pose son petit code. Sur
  une boutique Shopify, mieux vaut lire les chiffres de Shopify (1.2).

### 1.2 Les ventes et les visites d'une boutique Shopify

1. **Le Studio ne lit aucune vente aujourd'hui.** Son autorisation ne demande pas `read_orders` (voir partie 0).
2. **Commandes** (officiel) : « `read_orders` » et l'autre droit de commande « cover orders created within the last
   60 days ». Plus ancien : `read_all_orders`, qui demande l'accord de Shopify pour une application de partenaire, mais
   **pas** pour une application « created in the Dev Dashboard under a merchant organization ».
   https://shopify.dev/docs/api/usage/access-scopes
3. **Données des acheteurs** (officiel) : une commande est une donnée « protégée ». Niveau 1 : sans nom, adresse,
   téléphone ni e-mail ; niveau 2 : avec. Pour une application **publique** (celle du Studio, installée chez plusieurs
   marchands) : « Requires review », délai non donné. Pour une application **personnalisée** : « Always available ».
   Sans accord, « unapproved fields will be redacted ».
   https://shopify.dev/docs/apps/launch/protected-customer-data
4. **Les visites de la boutique** (officiel) : Shopify a un langage de requêtes (ShopifyQL) avec un tableau `sessions` :
   visites, visiteurs uniques, ajouts au panier, passages à la caisse, taux de conversion, par source. Exemple de la
   documentation : `FROM sessions SHOW sessions, online_store_visitors, conversion_rate WHERE human_or_bot_session =
   'human' GROUP BY referrer_source DURING last_month`. Droit : `read_reports`, **et** « Level 2 access to Customer
   data ».
   https://shopify.dev/docs/api/shopifyql/latest/schemas/sessions_and_behavior/sessions et
   https://shopify.dev/docs/api/admin-graphql/latest/queries/shopifyqlQuery
   - Un ancien fil du forum disait que l'API ne donnait pas les visites : il date d'avant ce tableau.
5. **La voie sans attente : l'application créée par le marchand lui-même** (officiel, plus un guide d'un éditeur pour les
   clics) :
   - dans son administration Shopify, menu de son compte en haut à droite, « Dev Dashboard » ;
   - « Create app », un nom sans le mot « Shopify », « Create » ;
   - onglet « Versions », partie « Access », coller la liste des droits, puis « Release » deux fois ;
   - « Home », « Install app », choisir sa boutique, « Install » (un avertissement « app non relue » est normal) ;
   - « Settings » : copier le « Client ID » et le « Secret » (icône en forme d'œil) et les coller dans le Studio.
   - Le Studio échange ces deux codes contre une clé valable 24 heures (« Always 86399 »), et la renouvelle seul.
     Condition : « only works when the app and the store belong to the same Shopify organization ».
   https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens et (clics, article d'éditeur)
   https://intercom.help/mylogiwa/en/articles/13192355-get-client-id-and-secret-from-shopify-dev-dashboard
   - **Ce que le Studio pourrait en faire** : pour lire ventes et visites, demander au marchand cette application à lui,
     avec les seuls droits `read_orders`, `read_all_orders`, `read_products` et `read_reports` (lecture seule), et le guide
     en six captures. Il évite ainsi la relecture de Shopify (application publique) et la limite des 60 jours.
   - **Limite réelle** : c'est un geste technique pour un commerçant (dix clics). **Pas vérifié** : que tout marchand
     ordinaire voie bien « Dev Dashboard » dans son menu (le guide lu est celui d'un éditeur) ; que les droits de
     niveau 2 soient bien ouverts dans ce cas (la page dit « Always available » pour les applications personnalisées,
     mais « Varies by plan » pour les anciennes créées dans l'administration).
   - **Point à signaler au propriétaire** : la voie actuelle du Studio (application publique) devrait passer une
     relecture de Shopify pour lire les commandes. C'est exactement l'attente que sa règle interdit.

### 1.3 Les ventes d'une boutique WooCommerce

- **En un clic, sans copier de clé** (officiel) : WooCommerce a une adresse d'autorisation, `/wc-auth/v1/authorize`, avec
  `app_name`, `scope` (`read`, `write` ou `read_write`), `user_id`, `return_url` et `callback_url`. Le marchand clique
  « Approuver » sur son site, et WooCommerce **envoie lui-même** la clé et le secret au Studio (`consumer_key`,
  `consumer_secret`, `key_permissions`). À la main : « WooCommerce > Réglages > Avancé > API REST », « Ajouter une clé »,
  lecture seule. L'adresse de retour doit être en HTTPS.
  https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication
- **Ce que le Studio pourrait en faire** : un bouton « relier ma boutique WooCommerce » qui ouvre cette page avec
  `scope=read`. Aucun secret à recopier, aucune validation d'une plateforme.
- **Limite réelle** : les visites ne sont pas dans WooCommerce ; elles viennent du compteur du Studio (1.1), posé dans le
  thème qu'il installe.

### 1.4 Les relevés que le client télécharge lui-même

| Où | Chemin exact | Ce qu'il contient | Limite | Preuve |
|---|---|---|---|---|
| **Fiche Google** | Sur ordinateur : business.google.com, cocher sa fiche, en haut à droite « Actions » puis « Insights », choisir la période, « Download Report », puis « DOWNLOAD ». Sur téléphone : Google Maps, « Business », « See more » près de « Performance ». | Vues sur la recherche et sur Maps, recherches utilisées, itinéraires, appels (si le numéro est sur la fiche), clics vers le site, conversations, réservations. | Téléchargement « in a spreadsheet » sur ordinateur seulement ; seulement pour une fiche validée ; la page ne dit ni le format exact, ni jusqu'où remonte l'historique. | officiel https://support.google.com/business/answer/9918094?hl=en |
| **Instagram** | Dans l'application : l'export par publication est réservé à l'offre payante « Meta One ». | Portée, vues, réactions. | Sans Meta One : capture d'écran du tableau de bord professionnel. | officiel https://www.meta.com/help/subscriptions/882345181477896/ |
| **Facebook et Instagram par Meta Business Suite** | « Insights » (menu de gauche), bouton « Export data » en haut à droite, choisir Facebook ou Instagram, la période, publications ou stories, puis le fichier. | Une ligne par publication : portée, réactions, commentaires. | Chemin lu seulement chez des éditeurs ; la page d'aide de Meta n'a pas pu être lue (contenu bloqué). Format CSV, et peut-être XLSX selon les guides. | article d'éditeur https://uada.edu/employees/communications/social-media/getting-started/meta-analytics.aspx |

**Ce que SINA pourrait en faire** : le dernier jour du mois, une carte « envoie-moi tes chiffres » : pour Google, le
tableur sur ordinateur ou trois captures sur le téléphone ; pour Instagram et Facebook, une capture du tableau de bord.
SINA lit et recopie le chiffre exact avec sa source (« relevé Google du 1er au 30 novembre »). Sans envoi : « non
disponible : relevé non envoyé ». Elle ne mélange jamais un chiffre lu et un chiffre mesuré par le Studio.

---

## 2. « Envoie une photo, SINA fait le reste » et le studio photo de poche (engagements 2 et 8)

### 2.1 Ce que font les outils comparables

| Outil | Ce qu'il fait | Ce qu'on sait de la fidélité au produit | Preuve |
|---|---|---|---|
| **Google Pomelli « Photoshoot »** (19 février 2026) | « Start with any picture, and don't worry about polish » ; choix d'un modèle « studio » ou « lifestyle » ; image « on brand » ; retouche ; gratuit dans Google Labs. Moteur : Nano Banana. | La page de Google **ne dit rien** de la façon de garder le produit intact, ni d'aucune limite. Les articles de presse disent l'outil ouvert aux États-Unis, au Canada, en Australie et en Nouvelle-Zélande (non vu sur la page de Google). | officiel https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-photoshoot/ |
| **Photoroom** | Détourage, fonds créés, ombres, rééclairage avec un mode « color-preserving » ; un contrôle « Visual QA » de la fidélité pour les grands comptes. | Promesse de l'éditeur : « preserving original product textures, colors, and other product details ». Aucun document technique ne dit que les pixels du produit ne sont pas touchés. Son outil « Beautifier » modifie l'objet. | article d'éditeur https://www.photoroom.com/api/relight |
| **Test de Seller Stacked** (3 produits, mêmes photos pour chaque outil, deux prises : boîte à lumière et téléphone sur un comptoir) | Photoroom : détourage le plus propre (« Even the transparent supplement cap was cleanly separated »), mais scènes « composited rather than naturally integrated ». Pebblely : « leather texture was softened ». Claid : « a slight blue tint in two outputs ». Flair : défauts au contact du produit et du fond. | Notes subjectives, aucun taux d'échec chiffré. | test indépendant (petit, notes d'un seul testeur) https://www.sellerstacked.co/blog/ai-product-photography-tools-tested |
| **Comparatifs d'éditeurs** | Tous disent que le texte des étiquettes est le point faible commun (« garble label copy, ingredient lists, and logos »). Des avis Trustpilot sur Pebblely disent que l'objet est parfois changé. | Lu seulement dans le résumé du moteur de recherche. | avis https://www.aitoolbox.hk/articles/best-ai-product-photography-tools-2026-pebblely-vs-flair-vs-claid-vs-photoroom/ |
| **OpenAI (images de SINA)** | Retouche avec photo jointe ; pour les modèles récents, « the model processes every image input at high fidelity automatically ». Masque « entirely prompt-based », que le modèle « may not follow its exact shape with complete precision ». Limites écrites : texte précis, constance des éléments de marque, placement exact. | Aucune promesse sur le produit. | officiel https://developers.openai.com/api/docs/guides/image-generation |

### 2.2 Ce qu'on en retient

1. **Deux façons de faire, avec un prix chacune** :
   - **coller le vrai produit détouré sur une scène créée** : le produit ne bouge pas d'un pixel, mais le résultat peut
     sentir le collage (Photoroom) ;
   - **refaire toute l'image avec la photo jointe** : la scène est plus naturelle, mais la matière, la couleur et
     l'étiquette peuvent changer (Pebblely, Claid, Flair).
2. **Aucun outil ne garantit le produit intact par écrit**, pas même Google ni OpenAI. La seule garantie est un
   contrôle après coup.
3. **Le texte de l'étiquette est le premier à casser.**

**Ce que SINA pourrait en faire** :
- Un produit avec étiquette, logo ou texte : le vrai produit détouré, posé sur une scène créée par OpenAI (le Studio sait
  déjà détourer et refuse un détourage raté, `src/lib/cutout-reasons.ts`), puis seulement l'ombre et la lumière autour.
- Un produit sans texte (bois, céramique, plat) : la retouche complète par OpenAI est permise, puis une comparaison
  automatique avec le détourage d'origine (forme, couleurs dominantes, proportions). Une image où le produit a changé est
  dite ratée et n'est pas montrée.
- La photo du téléphone est d'abord jugée : flou, produit coupé, lumière. Si elle ne suffit pas, SINA dit en une phrase
  comment la refaire (« près d'une fenêtre, sans flash, le produit entier ») plutôt que de payer des images.
- **Point à signaler** : coller le vrai produit sur une scène d'OpenAI respecte la règle « images créées par OpenAI »
  pour la scène, mais le produit, lui, reste la photo du client. C'est ce que veut la règle « jamais déformé » ; c'est au
  propriétaire de dire si cela lui va.
- **Pas vérifié** : le pays d'ouverture de Pomelli « Photoshoot » en France ; un test indépendant de grande taille sur la
  fidélité des produits (je n'en ai trouvé aucun).

---

## 3. La fiche Google tenue à la main (engagements 4, 12 et 14)

Rappel : le branchement de la fiche par programme demande l'accord de Google (rapport du matin) ; il est mis de côté.
Tout ce qui suit se fait **par le client, guidé par SINA**, sans aucun branchement.

### 3.1 Le guide pas à pas, geste par geste (pages officielles de Google)

| Geste | Chemin exact | Ce que SINA prépare | Source (officiel) |
|---|---|---|---|
| **Répondre à un avis** | Sa fiche, « Read reviews », « Reply » à côté de l'avis, coller, « Reply ». La réponse se modifie ou s'efface ensuite. | La réponse, propre à cet avis. | https://support.google.com/business/answer/3474050?hl=en |
| **Publier** | Sa fiche, « Posts », « Add post », choisir « Update », « Offer » ou « Event », remplir, « Post ». | Le texte, l'image et le bouton. | https://support.google.com/business/answer/7342169?hl=en |
| **Programmer un mois d'un coup** | Même chemin, puis « Schedule this post » (date et heure) ou « Repeats » (chaque semaine, chaque mois). | Le paquet du mois : 4 publications avec leur date. | même page |
| **Une offre** | « Offer » : titre et dates obligatoires ; bouton « View Offer » ajouté seul ; code, lien, conditions facultatifs. | Le titre, les dates, les conditions écrites par le client (jamais de réduction inventée). | même page |
| **Être prévenu de chaque avis** | Sa fiche, « More », « Notifications », allumer « Customer activity » (« Alerts when customers leave new reviews or add photos »), par e-mail, Search ou Maps. | La consigne « transfère-moi l'e-mail de Google ». | https://support.google.com/business/answer/7198436?hl=en |
| **Ses chiffres** | Voir 1.4. | La lecture du relevé. | https://support.google.com/business/answer/9918094?hl=en |
| **Le lien de demande d'avis** | « Read reviews », « Get more reviews », copier le lien ; le code à scanner seulement sur ordinateur (rapport du matin). | Le message de demande, le code imprimé. | https://support.google.com/business/answer/16816815?hl=en |

**Faits à connaître :**
- « The person who wrote the review is notified when you reply. » Google relit chaque réponse : « usually take up to
  10 minutes to review, but sometimes a review can take up to 30 days » (officiel, 3474050).
- Une publication de plus de 6 mois est archivée, sauf si elle a des dates. Les publications sont relues **après**
  parution (« Live », « Pending », « Not approved »). Règles : pas de faute, rien de « auto-generated or distracting » ;
  un numéro de téléphone que Google ne relie pas à l'entreprise peut faire refuser la publication (officiel, 7342169).
  - **Conséquence pour SINA** : chaque publication de fiche est relue comme un texte humain (aucune tournure toute
    faite), et ne porte pas de numéro de téléphone dans le texte.
- La page des notifications ne promet pas une alerte **pour chaque** avis (« Customer activity » prévient « when
  customers leave new reviews », sans plus). Le point « à vérifier » du matin reste donc à moitié ouvert : l'alerte existe,
  son exhaustivité n'est pas écrite.

### 3.2 Répondre aux avis : ce que dit Google, ce que veulent les clients

- **Les conseils de Google** (officiel) : « Keep your replies clear and helpful » ; « avoid using your response to offer
  deals or promotions » ; « A personal sign-off with your name or initials » ; pour un avis négatif : « Never share a
  reviewer's private information », « Acknowledge if any mistakes were made, but don't take responsibility for things
  outside your control », « Address the reviewer by name and acknowledge their specific feedback ». Plutôt qu'un même
  merci pour tous, répondre là où l'on peut donner une information utile.
  https://support.google.com/business/answer/3474122?hl=en
- **BrightLocal 2026** (étude publiée par un éditeur ; 1 002 adultes américains, panel SurveyMonkey, publiée le
  11 février 2026 ; page lue) :
  - 89 % attendent une réponse ; 19 % le jour même (6 % en 2025), 32 % le lendemain (18 %), 81 % dans la semaine ;
  - « Generic or templated replies put off 50% of consumers » ;
  - 80 % iraient plutôt chez qui répond à **tous** les avis ; 42 % éviteraient qui ne répond jamais ; seulement 47 % pour
    qui ne répond qu'aux négatifs et 45 % qu'aux positifs ;
  - 78 % ont été sollicités dans l'année ; 28 % écrivent « toujours » un avis quand on le demande (16 % en 2025) ; la page
    donne deux chiffres contradictoires pour ceux qui écrivent après une demande (65 % et 83 %) ;
  - aucune mesure de l'effet par canal (e-mail, SMS, en personne) ; aucun chiffre sur ce que pensent les gens des
    réponses écrites par une IA ;
  - 11 % se sont vu proposer une contrepartie, ce que Google interdit.
  https://www.brightlocal.com/research/local-consumer-review-survey/
- **Ce que SINA pourrait en faire** :
  - une réponse à **chaque** avis, bon ou mauvais, qui reprend un détail de l'avis et le prénom de l'auteur, signée du
    prénom du client, sans offre ni promotion ;
  - un avis négatif : reconnaître ce qui est vrai, ne rien promettre hors de la fiche vérifiée, proposer d'en parler par
    téléphone ou e-mail, jamais de détail privé ;
  - un relecteur refuse toute réponse trop proche d'une réponse déjà donnée (les réponses toutes faites rebutent la
    moitié des clients) ;
  - viser le lendemain : SINA prépare la réponse dès que le client transfère l'e-mail de Google ou colle l'avis.

### 3.3 Gemini relié à la fiche : un concurrent gratuit à connaître

Page officielle relue : Gemini peut changer horaires, coordonnées et liens, « Draft replies to reviews and create
posts », résumer les avis et lire les chiffres. Conditions : compte personnel, 18 ans ou plus, historique Gemini allumé,
propriétaire ou gestionnaire d'**une seule** fiche validée, sur gemini.google.com seulement, « wherever the Gemini web
app is supported ». La page ne parle pas d'exclusion de l'Europe (le doute du matin n'est pas levé).
https://support.google.com/gemini/answer/17142585
- **Ce que SINA pourrait en faire** : rien à copier, mais savoir que le client peut l'avoir gratuitement ; SINA doit donc
  faire mieux là où Gemini ne va pas (sa voix de marque, le lien avec son site, ses demandes et son carnet).

---

## 4. La boîte des demandes et l'assistante du site (engagement 7, et 2, 8 pour les images)

### 4.1 Le règlement européen sur l'IA : ce que disent les lignes directrices de la Commission

Document lu en entier dans son texte : lignes directrices sur l'article 50, **C(2026) 7702 final, Bruxelles, 5 novembre
2026** (version adoptée ; une première version datée du 20 juillet 2026 portait le numéro C(2026) 5054). Officiel, mais
non contraignant : c'est la lecture de la Commission.
https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems
(version anglaise : https://ec.europa.eu/newsroom/dae/redirection/document/131215)

1. **Qui doit dire « je suis une IA » : le Studio.** Le devoir de l'article 50(1) pèse sur le « fournisseur », celui qui
   met l'assistante en service sous son nom ; il doit l'informer « irrespective of who the deployers or other users of
   the system are » (point 11). Le Studio construit l'assistante pour le site du client : c'est à lui de la faire se
   présenter, pas au client de s'en souvenir.
2. **L'exception « c'est évident » ne vaut pas pour une assistante de site.** Exemple donné de ce qui **n'est pas**
   évident : « AI chatbots embedded in online platforms or assistance support tools (helpdesks) whereby users directly
   interact and receive AI outputs […] they may perceive as human-generated » (3.2.1).
3. **Comment le dire** (points 36 à 38) : « a chatbot that starts a conversation by mentioning that it is based on AI
   technology » ; un libellé clair, près du champ où l'on écrit, avec un badge visible pendant toute la conversation ;
   des mots simples. **Ne suffit pas** : une mention cachée dans les conditions, une adresse ou une documentation. Moment :
   « when launching a conversation with a chatbot ».
4. **Les photos de produit créées par l'IA : une règle qui touche le studio photo de poche.** Est un « hypertrucage » à
   signaler : « An AI-generated image of a product in advertisement or packaging that can affect the audience's
   perception and mislead as to the actual product appearance, characteristics or use (e.g. making the product appear
   not identical to the real product, more appealing or with improved quality than in real life) ». N'en est
   probablement pas un : « adjustments or replacements of backgrounds for clearly aesthetic purposes, compositions and
   arrangements of existing products, or re-scaling of images applied in product advertisements » (point 116).
   - **Ce que SINA pourrait en faire** : c'est une raison légale de plus pour la méthode du 2.2 : **le vrai produit
     intact, seul le décor créé**. Un produit retouché par l'IA qui paraît plus beau qu'en vrai devrait porter la mention
     « image créée par IA ». La règle du propriétaire (« jamais déformé ») suffit à l'éviter, si le contrôle de fidélité
     est strict.
   - **Point qui contredit une règle du propriétaire, signalé sans être recommandé** : la règle « les réalisations
     d'artisans sont créées quand le client n'en a pas assez » (CLAUDE.md) produit des images de chantiers qui n'ont pas
     eu lieu. Les lignes directrices citent parmi les « events » « the depiction of professional or consumer services ».
     Une réalisation inventée présentée comme vraie risque d'être un hypertrucage à signaler, et une pratique commerciale
     trompeuse. Au minimum, chacune devrait porter « image d'illustration créée par IA ». La décision revient au
     propriétaire.
5. **Les réponses prêtes que le client envoie lui-même** : les lignes directrices citent l'exemple d'un e-mail écrit par
   un agent d'IA et envoyé à une personne, qui porte une mention IA. Ici, le client relit et envoie le message de son
   téléphone, sous son nom : c'est son message. Aucune mention n'est exigée par ce texte, à mon sens (non tranché par le
   document).

### 4.2 Le risque Air Canada, et la parade

- La décision (Moffatt contre Air Canada, 2024 BCCRT 149, 14 février 2024) n'a pas pu être ouverte : CanLII et le
  tribunal refusent l'accès (erreur 403). Les faits repris par la presse et le rapport du matin restent : l'entreprise
  répond de ce que dit son assistante ; 812,02 dollars canadiens au total, dont 650,88 de dommages.
  https://www.law.com/2024/02/20/air-canada-argues-lying-ai-chatbot-was-a-separate-legal-entity-and-loses-292-176503/
  (presse, lue en résumé seulement)
- **Ce que SINA pourrait en faire** : l'assistante répond **seulement** à partir de la fiche vérifiée du client (prix,
  horaires, zone, délais, conditions). Pour tout le reste, elle transmet (« je pose la question à [prénom], il te répond
  demain matin »). Un relecteur vérifie, avant envoi au visiteur, qu'aucun chiffre, délai, prix ou promesse de la réponse
  ne manque dans la fiche ; sinon la réponse est remplacée par la transmission.

### 4.3 Envoyer la réponse d'un geste : SMS et WhatsApp, ce qui marche vraiment

| Lien | Comportement | Preuve |
|---|---|---|
| `https://wa.me/33612345678?text=…` | Ouvre la conversation avec le texte prêt ; rien ne part sans appui. Numéro au format international sans « + » ni 0 de tête. | officiel https://whatsapp.com/faq/en/general/26000030 (lu par le rapport du matin) |
| `sms:` sur Android | La norme dit `?body=`, et Android la suit. | article d'éditeur https://docs.sendblue.com/guides/imessage-link-button/ |
| `sms:` sur iPhone | iPhone a toujours pris `&body=`. La documentation d'Apple dit même que l'adresse « must not include a body » : le texte prérempli marche en pratique, « Stable in practice, not guaranteed ». Le mélange `?&body=` « reportedly works on both », sans aucune norme. | même source |
| Les deux | Le texte doit être encodé ; un texte trop long « can fail or be truncated ». Sur un ordinateur Windows ou Linux, le bouton SMS « does nothing ». | même source |

**Ce que SINA pourrait en faire** : le Studio reconnaît le téléphone du client et écrit le lien SMS à sa façon (`&body=`
pour un iPhone, `?body=` pour Android) ; sur ordinateur, il propose seulement « copier le texte » et WhatsApp ou e-mail.
Les réponses prêtes restent courtes (quelques lignes) pour passer dans le lien. **À faire avant de construire** : un
essai sur un vrai iPhone et un vrai Android de 2026, gratuit.

### 4.4 Le tri et le résumé

Je n'ai trouvé aucune étude publiée sur le tri des demandes d'un petit commerce ; seulement des éditeurs (voir rapport du
matin). Rien de plus solide à rapporter.
- **Ce que SINA pourrait en faire** : un tri sur quatre cases (devis, rendez-vous, question, urgence), chacune avec sa
  raison en une ligne, et un résumé à cinq champs (qui, quoi, où, quand, coordonnées), où un champ vide est écrit
  « non donné ». Une demande que SINA ne sait pas classer va dans « à regarder », jamais dans une case au hasard.

---

## 5. Les devis d'artisans (engagement 9)

### 5.1 Ce que le devis doit porter : la liste à contrôler avant de le montrer

| Bloc | Mention | Qui | Source |
|---|---|---|---|
| Toujours (travaux, dépannage) | Date ; nom et adresse de l'entreprise ; nom du client ; lieu des travaux ; nature exacte ; détail en quantité et en prix de chaque prestation et fourniture ; taux horaire TTC ; façon de compter le temps ; frais de déplacement ; totaux HT et TTC avec le taux de TVA ; durée de validité ; devis gratuit ou payant (et son prix) ; le client peut garder les pièces remplacées. | Bâtiment, dépannage, réparation | officiel, vérifié le 9 septembre 2022 https://entreprendre.service-public.gouv.fr/vosdroits/F31144 |
| **Déchets** | 1° estimation de la quantité totale de déchets du chantier ; 2° modalités de tri, nature des déchets collectés à part, broyage pour le jardinage ; 3° point(s) de collecte avec « raison sociale, adresse et type d'installation » ; 4° estimation du coût. Pas exigé quand un diagnostic déchets avant démolition est obligatoire. | Construction, rénovation, démolition, **jardinage** | texte de l'article D541-45-1 du code de l'environnement, recopié par l'OPPBTP (mise à jour du 13 juillet 2023) https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-d541-45-1-du-code-de-l-environnement.pdf |
| **Assurance** | Quand l'assurance professionnelle est obligatoire pour le métier (décennale dans le bâtiment) : l'assurance, les coordonnées de l'assureur ou du garant, la couverture géographique, **sur chaque devis et chaque facture**. | Entreprises artisanales et micro-entrepreneurs | article L132-1 du code de l'artisanat, lu seulement dans le résumé du moteur (Légifrance refuse l'accès) https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047362294 |
| Signature | Le client n'est engagé qu'une fois le devis signé, de préférence avec « bon pour travaux » ou « bon pour accord ». Un versement sans précision vaut « arrhes » : le client peut se retirer en les perdant. | Tous | officiel, même page F31144 |
| Hors de l'entreprise | Devis accepté après un démarchage : 14 jours pour se rétracter, sauf réparation urgente (fuite d'eau). | Tous | officiel, même page |

Sanction d'un devis obligatoire manquant : jusqu'à 3 000 € (entrepreneur individuel) et 15 000 € (société) (même page).

**Ce que SINA pourrait en faire** : chaque métier reçoit sa liste (bâtiment, jardinage, dépannage, services à la
personne). Avant de montrer un devis, un contrôle sans IA vérifie chaque case. Une case vide (assureur, point de
collecte des déchets, taux horaire) se **demande** au client une fois, puis se garde dans sa fiche. Un devis incomplet
n'est jamais présenté comme prêt.

### 5.2 La signature électronique « simple »

- **Droit européen** (officiel, règlement eIDAS, article 25.1) : une signature électronique « shall not be denied legal
  effect and admissibility as evidence in legal proceedings solely on the grounds that it is in an electronic form or
  that it does not meet the requirements for qualified electronic signatures ». Seule la signature « qualifiée » vaut
  d'office une signature à la main (article 25.2).
  https://eur-lex.europa.eu/eli/reg/2014/910/oj/eng (lu dans le résumé du moteur)
- **Droit français** (officiel, vérifié le 13 juin 2025) : « Un écrit électronique a la même valeur juridique qu'un écrit
  papier » « si la personne signataire est identifiée et si le document est établi et conservé de manière à en garantir
  l'intégrité » (articles 1366 et 1367 du code civil).
  https://www.service-public.gouv.fr/particuliers/vosdroits/F31215
- **Ce que le Studio pourrait en faire** : une page de signature propre au devis (lien unique), où le client de
  l'artisan coche « bon pour accord », tape son nom et valide. Le Studio garde la preuve : empreinte du document signé,
  date et heure, adresse e-mail ou téléphone par lequel le lien est arrivé. Il ne vend pas cela comme une signature
  « qualifiée ». Pour un gros chantier, SINA conseille à l'artisan une signature à la main ou un service qualifié.
- **Limite réelle** : en cas de litige, c'est au juge d'apprécier ; la preuve gardée doit tenir (identité, intégrité).

### 5.3 La facture électronique, 2026-2027

- Page officielle (publiée le 15 novembre 2024, modifiée le 16 janvier 2026) : toutes les entreprises **reçoivent** des
  factures électroniques depuis le 1er septembre 2026 ; les PME et micro-entreprises devront **émettre** et
  **transmettre les données de transaction et de paiement** à partir du 1er septembre 2027.
  https://www.impots.gouv.fr/professionnel/questions/partir-de-quand-suis-je-concerne
- **Ce que le Studio pourrait en faire** : rester sur le devis, et passer la main pour la facture : un bouton « envoyer
  ce devis signé vers mon logiciel de factures » (fichier ou texte à coller). Plusieurs logiciels gratuits savent déjà
  émettre la facture électronique (Henrri, Costructor, voir 5.4) : SINA peut le dire, sans en faire un service.

### 5.4 Ce que font les logiciels (pages des éditeurs relues aujourd'hui)

| Logiciel | Devis par IA | Prix (HT) | Signature, relances, facture électronique | Preuve |
|---|---|---|---|---|
| **Obat** | Devis dicté, chiffré « avec vos prix ou 30 000 ouvrages » (rapport du matin). | Dès 25 € par mois (rapport du matin). | Envoi en signature. | article d'éditeur |
| **Costructor** | Description écrite ou dictée ; l'IA pose des questions, découpe en postes, sépare main-d'œuvre et fournitures. Prix tirés de Batiprix, de plus de 100 catalogues de fournisseurs, ou des anciens devis de l'artisan. | Gratuit sans limite de temps ; « Pro » dès 12,50 € par mois. | Facture électronique dès le gratuit, plateforme agréée annoncée ; relances d'impayés. Signature : non dite. **Le testeur a « systématiquement retouché les prix unitaires »** : l'IA fait gagner du temps sur la structure, pas sur le chiffrage. | test (blog, relation commerciale possible) https://www.leblogdudirigeant.com/test-du-logiciel-costructor/ |
| **Batappli** | « Agent IA de création de devis », 8 devis par mois (offre Devis) ou 16 (offre Artisan) ; 16 de plus pour 6 €. | 39 € par mois ou 429 € par an ; 79 € par mois ou 869 € par an. | Signature et relances de devis : non dites ; facture électronique : badge et page à part. | article d'éditeur (page de prix) https://www.batappli.fr/tarifs |
| **Tolteck** | Pas d'IA citée. | 25 € par mois, ou 19 € par mois à l'année (228 €). | Non dit sur la page de prix. | article d'éditeur https://www.tolteck.com/fr/tarifs |
| **Henrri** | Pas d'IA citée. | Gratuit ; 19, 29 et 59 € par mois (17, 25 et 49 € à l'année). | Gratuit : devis illimités, « validation de devis en ligne », facture électronique, inscription à une plateforme agréée ; relances manuelles seulement (automatiques dans l'offre à 59 €). | article d'éditeur https://www.henrri.com/tarifs |
| **Axonaut** | — | Page de prix introuvable (erreur 404) ; prix contradictoires (rapport du matin). | Relances de devis jusqu'à la signature (rapport du matin). | — |

**Ce qu'on en retient** :
- le devis par IA est déjà courant et bon marché (gratuit chez Costructor) ;
- son point faible est le prix : même avec Batiprix, l'artisan retouche ;
- personne ne dit contrôler les mentions obligatoires selon le métier.

**Ce que SINA pourrait en faire** :
- ne jamais proposer un prix qui ne vient pas des tarifs enregistrés du client (règle déjà écrite dans l'engagement 9) ;
- contrôler la liste du 5.1 ;
- écrire la relance dans sa voix ;
- rendre la signature simple et prouvée.
C'est là qu'elle fait mieux que les autres, pas sur la vitesse.

---

## 6. Le carnet de clients et les relances (engagements 11 et 12)

### 6.1 Ce que dit la CNIL, au-delà du rapport du matin

Le rapport du matin a établi : consentement pour la prospection par e-mail ou SMS d'un particulier ; exception du vrai
client pour des produits semblables ; trois ans après la fin de la relation. Ce que j'ajoute, lu dans le référentiel
de la CNIL lui-même (officiel, document PDF lu en texte) :
https://www.cnil.fr/sites/cnil/files/atoms/files/referentiel_traitements-donnees-caractere-personnel_gestion-activites-commerciales.pdf

- Le référentiel range à part, comme finalités **distinctes de la prospection** : « suivi de la relation client pour
  la réalisation d'enquêtes de satisfaction », « gestion des avis des personnes sur des produits, services ou
  contenus ». La prospection est autre chose : « envoi de messages publicitaires, jeux concours, parrainage,
  promotion ».
- Base légale des enquêtes de satisfaction : « Intérêt légitime de l'organisme ou Consentement » ; durée : « le temps
  nécessaire pour la réalisation de l'objectif de l'enquête ou jusqu'à l'exercice du droit d'opposition ».
- **Conséquence pour la demande d'avis** (ma lecture, non écrite telle quelle par la CNIL) : un message qui demande
  seulement un avis, envoyé à quelqu'un qui a vraiment acheté ou fait faire un chantier, sans aucune offre dedans,
  relève de la relation client, pas de la prospection. Dès qu'il porte une offre ou une promotion, la règle du
  consentement revient. Le rapport du matin n'avait pas trouvé de réponse ; celle-ci reste une lecture, pas une
  position écrite de la CNIL.

**Ce que SINA pourrait en faire** : deux sortes de messages bien séparées dans le carnet :
- « relation » (demande d'avis, rappel de rendez-vous, suivi d'un devis) : à tout vrai client, avec un moyen simple de
  refuser ;
- « offre » (fête de l'an dernier, promotion, nouveauté) : seulement aux personnes qui ont dit oui par écrit, ou aux
  vrais clients pour des produits semblables.
Une demande d'avis ne contient **jamais** d'offre, ce qui tient à la fois la règle de Google (rien en échange) et celle
de la CNIL.

### 6.2 Les relances qui marchent : chiffres publiés

| Relance | Chiffre | Portée | Preuve |
|---|---|---|---|
| **Rappel de rendez-vous par SMS** | Plus de présence qu'aucun rappel : rapport de 1,14 (intervalle 1,03 à 1,26), 7 études, 5 841 personnes ; même effet qu'un appel (0,99) ; coût par rendez-vous honoré 55 à 65 % plus bas qu'un appel. Les auteurs jugent la preuve « moderate » et insuffisante pour trancher une politique. | Rendez-vous de santé, pas de commerce. À transposer avec prudence aux salons et cabinets. | étude publiée (revue Cochrane, 2013) https://pubmed.ncbi.nlm.nih.gov/24310741/ |
| **Panier abandonné (boutique)** | Revenu moyen par destinataire : 6,77 $ par e-mail, 4,48 $ par SMS ; les 10 % meilleurs 13,70 $ et 8,69 $ (plus de 110 000 clients de Klaviyo). | Boutiques américaines surtout ; chiffres de l'éditeur. | article d'éditeur, lu seulement dans le résumé du moteur https://www.klaviyo.com/blog/abandoned-cart-benchmarks |
| **Accueil d'un nouvel abonné** | 5,75 $ par destinataire ; rappel de produits regardés 2,08 $. | Idem. | idem |
| **Relance d'un ancien client** | 0,82 $ par destinataire (10 % meilleurs : 1,60 $). | Idem : la relance d'un client perdu rapporte huit fois moins qu'un panier abandonné. | idem |

**Ce que SINA pourrait en faire** :
- d'abord les relances qui valent le plus : rappel de rendez-vous la veille, puis panier abandonné et accueil (écrits par
  SINA, copiés dans la plateforme du client, comme le propriétaire l'a décidé le 14 novembre) ;
- la relance d'un ancien client vient après, et seulement s'il a dit oui ;
- dans le point du mois, SINA ne cite jamais ces chiffres comme une promesse : ce sont des moyennes d'autres
  entreprises.
- **Pas trouvé** : un chiffre publié et sérieux sur la relance d'un devis resté sans réponse (seulement des chiffres
  d'éditeurs de logiciels, non sourcés).

---

## 7. Ce qui garde un client abonné, et ce qui le fait partir (engagements 1, 6 et 15)

### 7.1 Les outils d'IA vendus entre 50 et 250 dollars par mois perdent beaucoup de clients

Étude de Kyle Poyar avec ChartMogul, publiée le 10 décembre 2025 (article d'éditeur, données de 3 500 logiciels, dont
environ 200 nés de l'IA ; les auteurs disent eux-mêmes leurs chiffres « directional rather than statistically
bulletproof ») :
- les logiciels nés de l'IA gardent **40 %** de leur chiffre d'affaires d'une année sur l'autre (sans compter les montées
  en gamme), contre 82 % de chiffre d'affaires gardé, montées comprises, pour les logiciels d'entreprise classiques ;
- **entre 50 et 249 dollars par mois** (la zone des forfaits du Studio, 69, 99 et 169 €) : 45 % gardés, 61 % avec les
  montées en gamme ; au-dessus de 250 dollars : 70 % et 85 % ; en dessous de 50 : 23 % et 32 % ;
- avec un abonnement à l'année, le chiffre gardé est « 10 to 20 percentage points higher » ;
- les raisons citées : « The downside of being easy to buy is being easy to cancel » ; les clients « see themselves as
  trial-ers » ; écart entre ce qui est livré et ce qui est vraiment utilisé.
https://chartmogul.com/reports/saas-retention-the-ai-churn-wave/

**Ce que SINA pourrait en faire** : le danger n'est pas le mécontentement, c'est le client qui « essaie » puis s'en va
une fois son site livré. Le suivi du mois doit donc être utilisé, pas seulement livré : un premier résultat visible
dans la première semaine après la mise en ligne (première demande reçue, premier avis demandé, première publication
parue), et un objectif du mois fixé dès le premier mois.
- **Point à signaler** : un abonnement à l'année garde mieux les clients, mais le propriétaire a validé des forfaits
  « sans engagement ». Je ne le recommande pas ; une formule à l'année facultative serait une idée à lui soumettre en une
  phrase, s'il le souhaite.

### 7.2 Montrer le travail : la limite que le rapport du matin n'a pas dite

- Buell et Norton (Management Science, 2011, cinq expériences) : montrer le travail fait monter la valeur perçue, même
  quand l'attente est plus longue (lu en résumé seulement ; le texte n'a pas pu être ouvert, erreur 403).
  https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376
- **La limite**, écrite par Buell, Kim et Tsay dans leur article de 2015 (texte lu) : « Revealing the process that
  delivered a dissatisfying result has been shown to reduce perceptions of service value (Buell and Norton 2011) » ; et
  montrer que le travail ne suit pas la demande « may be no more helpful than not being transparent at all ».
  https://dash.harvard.edu/server/api/core/bitstreams/7312037d-8844-6bd4-e053-0100007fdf3b/content
- **Ce que SINA pourrait en faire** : un mois réussi s'ouvre sur « ce que j'ai fait pour toi ». Un mois faible ne
  s'ouvre pas sur une longue liste de travail (elle ferait l'effet inverse) : il s'ouvre sur le chiffre honnête, la
  raison, puis le plan pour le mois suivant, et seulement ensuite le travail fait.

### 7.3 La fréquence des messages

Le rapport du matin a les chiffres (Localytics, Airship) ; la recherche du 21 novembre a ceux de l'étude de la
conférence CHI 2025 (53 % utiles, 12 % gênants, 35 % ignorés). Je n'ai rien trouvé de plus solide. La règle reste :
« ta journée est prête » dans le Studio, une alerte sur le téléphone au plus par jour (urgence, avis négatif), réglable
par le client.

---

## 8. Le bras droit au quotidien : droit, comptabilité, impôts (engagement 17)

### 8.1 La limite légale, écrite par le ministère de la Justice

Réponse du ministre à la question écrite n° 3177 (publiée au Journal officiel le 8 avril 2025 ; officiel, texte lu) :
- « Les plateformes en ligne ne sont donc pas autorisées à délivrer des consultations juridiques aux internautes. »
- L'article 54 de la loi du 31 décembre 1971 réserve la consultation juridique aux professions du droit (avocats,
  notaires, commissaires de justice) ; les experts-comptables seulement « dans les domaines relevant de leur activité
  principale » ; l'article 66-2 punit pénalement l'exercice non autorisé.
- La consultation n'a pas de définition dans la loi, mais une « définition stabilisée » par la Cour de cassation (arrêts
  du 15 novembre 2010, du 19 juin 2013 et du 25 janvier 2017). D'après un cabinet d'avocats (article d'éditeur), le
  critère retenu est **un avis personnalisé qui applique le droit aux faits rapportés**.
- Le ministère met en garde contre les « intitulés ambigus comme aide, information ou assistance juridique » : changer
  le nom ne suffit pas.
https://www.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE3177 et (critère, article d'éditeur)
https://kohenavocats.com/en/legal-tech-lawyer-paris/

**Comptabilité** (officiel, lu dans le résumé du moteur) : l'ordonnance du 19 septembre 1945, article 2, réserve à
l'expert-comptable de « tenir, centraliser, ouvrir, arrêter, surveiller, redresser et consolider » la comptabilité
d'entreprises qui ne l'emploient pas. https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000032364676

**Impôts** : un conseil fiscal personnalisé est une consultation juridique comme une autre (le droit fiscal est du
droit) ; c'est ma lecture de la réponse ministérielle, qui ne parle pas des impôts à part.

### 8.2 Les sources citées par l'IA ne suffisent pas à la rendre juste

Étude de Stanford, publiée dans le Journal of Empirical Legal Studies (2025) : même les outils de recherche juridique
des grands éditeurs (Lexis+ AI, Westlaw) « each hallucinate between 17% and 33% », en comptant aussi une source citée
qui ne dit pas ce qu'on lui fait dire (étude publiée, lue seulement dans le résumé du moteur).
https://law.stanford.edu/publications/hallucination-free-assessing-the-reliability-of-leading-ai-legal-research-tools

### 8.3 Ce que SINA pourrait en faire

1. **Informer, jamais consulter.** Pour une question de droit, de comptabilité ou d'impôts, SINA donne la règle générale
   et la page officielle qui la dit. Elle n'applique pas la règle à la situation précise du client pour lui dire quoi
   faire. Exemple : « La page de l'État dit qu'un devis est obligatoire pour les travaux. Pour savoir si ton contrat
   tient, c'est une question pour un avocat ou ta chambre des métiers. »
2. **Seulement des sources officielles, ouvertes et relues.** Une courte liste fixe : Légifrance, service-public
   (particuliers et professionnels), impots.gouv, le Bulletin officiel des finances publiques, URSSAF, CNIL, la
   Commission européenne. Chaque source citée a été **ouverte** par SINA ; un juge vérifie que la phrase citée est bien
   sur la page. Une source non ouverte n'est pas citée.
3. **Date de la page.** SINA donne la date de vérification que la page affiche (par exemple « vérifié le 9 septembre
   2022 ») : une règle peut avoir changé depuis.
4. **Quand dire « il faut un professionnel »** : un litige, un contrat à signer, un contrôle fiscal, une déclaration à
   remplir, une question sur ses comptes. SINA dit lequel (avocat, expert-comptable, chambre des métiers, centre des
   impôts) et prépare les questions à lui poser. C'est utile et c'est permis.
5. **Les calculs** (prix de revient, marge, prix de vente) : SINA les fait avec ses chiffres à lui, montre le calcul en
   entier, et ne touche ni à sa comptabilité ni à ses déclarations.

---

## 9. Les dix-sept engagements, un par un : comment les tenir sans aucune validation de plateforme

| N° | Engagement | La façon de le faire vraiment | Sa limite réelle, à écrire au client |
|---|---|---|---|
| 1 | Le point du mois | Chiffres mesurés par le Studio (visites, 1.1 ; demandes ; devis ; carnet), ventes et visites de la boutique (1.2, 1.3), relevés envoyés par le client (1.4). Trois lignes en tête, puis le travail si le mois est bon (7.2), trois actions acceptées d'un clic. | « Personnes touchées » sur les réseaux et chiffres de la fiche Google : seulement si le client envoie son relevé ; sinon « non disponible : relevé non envoyé ». |
| 2 | « Envoie une photo » | Photo jugée, produit détouré intact, scène créée par OpenAI, fiche du site mise à jour (prix demandé s'il manque), publication et story prêtes, partage d'un geste. | Sur Shopify, la fiche produit se crée par l'autorisation actuelle (`write_products`) ; sur WooCommerce, il faudrait une clé en écriture (1.3), donc l'accord du client pour l'écriture. |
| 3 | Grands moments de l'année | Calendrier tenu par SINA ; événements locaux avec la page source. Campagne prête trois semaines avant, avec l'offre écrite par le client et la publication de fiche Google programmée (3.1). | Un événement non vérifié n'est pas proposé. |
| 4 | Fiche Google et avis | Tenue à la main avec le guide geste par geste (3.1) ; alerte « Customer activity » allumée, e-mail transféré à SINA ; une réponse propre à chaque avis (3.2) ; un mois de publications programmées en une fois. | Pas de « fiche reliée » ni de lecture automatique des avis ; Google ne promet pas une alerte pour chaque avis ; la réponse est relue par Google (10 minutes, parfois 30 jours). Le texte de l'engagement doit être réécrit sans « reliée ». |
| 5 | Le site qui s'améliore | Relecture mensuelle du site monté et de ses visites (1.1), ou des visites de Shopify (1.2, tableau `sessions`). | Sur Shopify, les visites demandent l'application créée par le marchand (1.2). |
| 6 | « Ta journée est prête » | Publication du jour, demandes de la veille, idée du jour, tout dans le Studio ; une alerte au plus par jour. | Un jour sans demande le dit. |
| 7 | La boîte des demandes | Assistante construite par le Studio, sur le modèle du service de rendez-vous qui marche déjà sur un site exporté (partie 0) ; elle dit qu'elle est une IA dès le premier message, avec un badge (4.1) ; elle ne répond qu'avec la fiche vérifiée (4.2) ; tri en quatre cases ; réponse prête par SMS, WhatsApp ou e-mail (4.3). | Le lien SMS prérempli n'est pas garanti par Apple ; sur ordinateur, seulement « copier ». Plafond de son budget d'IA, puis formulaire. |
| 8 | Studio photo de poche | Vrai produit intact, décor créé (2.2), contrôle de fidélité avant de montrer ; c'est aussi ce que demandent les lignes directrices européennes (4.1, point 4). | Une image où le produit a changé est refusée, ou porterait « image créée par IA ». |
| 9 | Ses devis | Prix tirés de ses tarifs seulement ; liste des mentions par métier, avec déchets et assurance (5.1) ; signature simple prouvée (5.2) ; relance dans sa voix. | Pas de facture : renvoi vers son logiciel (5.3). Une signature simple se discute devant un juge. |
| 10 | Ses vrais chiffres de vente | Shopify : application créée par le marchand dans son « Dev Dashboard », lecture seule, sans relecture de Shopify ni limite de 60 jours (1.2). WooCommerce : bouton d'autorisation en lecture (1.3). | Dix clics pour un marchand Shopify ; le Studio aujourd'hui ne lit aucune commande. Le texte de l'engagement doit être réécrit (« sa propre clé, créée dans sa boutique » n'existe plus). |
| 11 | Carnet de clients | Chaque fiche porte son origine, son accord daté, sa fin des trois ans ; messages « relation » et « offre » séparés (6.1). | Les offres ne partent qu'aux personnes qui ont dit oui, ou aux vrais clients pour des produits semblables. |
| 12 | Avis qui arrivent tout seuls | Lien officiel collé une fois ; demande à **tous** les clients d'une vente ou d'un chantier fini, sans offre dedans, une seule fois (3.1, 6.1). | Le Studio ne voit pas qui a laissé un avis : il le sait seulement par l'e-mail de Google transféré, ou par le client. Donc « ne relance jamais deux fois » se tient, mais « suit qui a laissé un avis » est partiel. |
| 13 | Nouvelles façons de gagner de l'argent | Installé sur le site monté par le Studio ; sur Shopify et WooCommerce, ce que la plateforme permet. | Ce qui demande un module payant est dit avant. |
| 14 | Code à scanner et affiches | Code fait par le Studio ; avis Google par le lien collé. | — |
| 15 | Objectif du mois | Un but que le Studio mesure lui-même : demandes, devis signés, ventes reliées, rendez-vous du service du Studio. | « Appels reçus » ne se mesure pas (seulement les clics « appeler » du relevé Google envoyé). |
| 16 | Ce que ses clients demandent | Relecture des demandes, devis et avis collés ou transférés ; un sujet cité une fois n'est pas une tendance. | Seulement les avis que SINA a reçus. |
| 17 | Bras droit | Informer avec la page officielle ouverte et datée ; dire quand il faut un professionnel ; jamais un avis juridique personnalisé (8.3). | La loi interdit à une plateforme de donner des consultations juridiques. |

---

## 10. Pas vérifié

- Que tout marchand Shopify ordinaire voie « Dev Dashboard » dans son menu et puisse y créer une application (guide d'un
  éditeur seulement), et que les données de niveau 2 lui soient ouvertes dans ce cas.
- Les chemins exacts de l'export Meta Business Suite (la page d'aide de Meta n'a pas pu être lue).
- Le format exact et la durée d'historique du relevé de la fiche Google.
- Qu'une alerte Google parte pour **chaque** avis (la page dit seulement qu'elle existe).
- L'ouverture de Gemini relié à la fiche Google en France, et celle de Pomelli « Photoshoot ».
- La décision Air Canada elle-même (accès refusé) et le texte complet de Buell et Norton (accès refusé).
- Le texte exact de l'article L132-1 du code de l'artisanat (Légifrance refuse l'accès ; lu en résumé).
- Le formulaire de rétractation à joindre à un devis signé chez le client, et l'obligation d'un médiateur de la
  consommation pour les artisans : non recherchés faute de temps, à vérifier avant le lot des devis.
- Le comportement du lien SMS prérempli sur des téléphones de 2026 : un essai gratuit sur un iPhone et un Android.
- Les prix d'Axonaut (page introuvable) et d'Obat (comparatif écrit par Obat).
- Les chiffres de Klaviyo et de l'étude de Stanford : lus seulement dans le résumé du moteur.
- Qu'une demande d'avis sans offre ne soit pas de la prospection : c'est ma lecture du référentiel de la CNIL, pas une
  position écrite.

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Réécrire les engagements 4, 10 et 12 pour qu'ils disent vrai** (« fiche reliée », « clé créée dans sa boutique »,
   « suit qui a laissé un avis »). *Le client verra* : des promesses qu'il peut vérifier, avec leur limite écrite.
2. **La lecture des ventes et des visites de la boutique** : l'application Shopify créée par le marchand (lecture seule,
   guide en six captures) et le bouton d'autorisation WooCommerce. *Le client verra* : « relie ta boutique », puis ses
   vraies commandes et ses visites dans sa journée et son point du mois.
3. **Le compteur de visites du Studio, tenu dans l'exemption de la CNIL** (séparé par client, aucune adresse gardée,
   effacement à 25 mois, lien de refus, grille d'auto-évaluation remplie). *Le client verra* : ses visites, sans bandeau
   sur son site.
4. **L'assistante du site qui se présente comme une IA**, avec badge permanent, réponses tirées de la seule fiche
   vérifiée et transmission du reste. *Le client verra* : une assistante sur son site, et chaque demande triée et
   résumée dans le Studio.
5. **Les réponses prêtes envoyées d'un geste** (SMS écrit selon le téléphone, WhatsApp, e-mail, « copier » sur
   ordinateur), après un essai gratuit sur deux vrais téléphones. *Le client verra* : trois boutons sous chaque réponse.
6. **Le studio photo qui garde le vrai produit** : détourage intact, décor créé par OpenAI, contrôle de fidélité, refus
   dit. *Le client verra* : des images de campagne où son produit est exactement le sien.
7. **Le guide de la fiche Google, geste par geste**, avec le paquet du mois de publications programmées et une réponse
   propre à chaque avis transféré. *Le client verra* : « colle ici, clique là », et sa fiche tenue en dix minutes par
   mois.
8. **Le devis contrôlé** : prix de ses tarifs seulement, mentions par métier (déchets, assurance), page de signature
   simple avec preuve gardée, relance dans sa voix. *Le client verra* : un devis prêt, signé en ligne par son client.
9. **Le carnet qui sépare « relation » et « offre »** : origine, accord daté, fin des trois ans, demande d'avis sans
   offre à tous les vrais clients. *Le client verra* : qui il peut relancer, et pourquoi.
10. **Le point du mois honnête** : trois lignes, source de chaque chiffre, travail montré seulement quand le mois est
    bon, plan d'abord quand il est faible ; premier résultat visible dès la première semaine. *Le client verra* : ce que
    son abonnement lui a rapporté, sans enjoliver.
11. **Le bras droit qui informe sans consulter** : pages officielles ouvertes et datées, vérification de chaque phrase
    citée, renvoi vers le bon professionnel avec les questions prêtes. *Le client verra* : des réponses sûres, et le nom
    de qui appeler quand il le faut.
12. **Une décision du propriétaire, sans rien construire avant** : les « réalisations d'artisans » créées par l'IA,
    que les lignes directrices européennes risquent de classer parmi les hypertrucages à signaler (4.1, point 4).
    *Le client verra* : selon sa décision, une mention « image d'illustration créée par IA » ou plus d'image inventée.
