# La mise en ligne des sites créés par SINA

Recherche du 22 novembre 2026. Pages officielles lues ce jour (Shopify, WordPress, WooCommerce, PrestaShop, Let's
Encrypt, Caddy, Cloudflare, Vercel, OVHcloud, IONOS, GoDaddy, Gandi, o2switch, Wix, Squarespace, Framer, Service
Public, CNIL, Google). Aucun appel payant, aucun essai sur une vraie boutique.

Niveaux de preuve : **officiel** (page de l'éditeur ou de l'État lue ce jour), **forum officiel** (réponse d'un employé
sur le forum de l'éditeur), **avis** (blog ou forum non officiel), **non vérifié** (connaissance d'avant, non relue
aujourd'hui : à ne pas présenter comme sûr).

Point de départ dans le Studio (référence, parties 5, 9, 11 questions 12 à 14, 14 engagement 10, et inventaire
`docs/studio/inventaire/3-site.md`) : la boutique part chez le client (Shopify, WooCommerce ou PrestaShop), le Studio
n'encaisse pas ; le site de services est hébergé par le Studio, sur un sous-domaine du Studio ou sur le domaine du client
acheté ailleurs ; aucune proposition qui fasse attendre la validation d'une plateforme ; le client peut créer lui-même une
clé dans sa boutique.

---

## En bref (ce qui compte le plus)

1. **Shopify a changé la règle le 1er janvier 2026** : un marchand ne peut plus créer d'« application personnalisée »
   dans son administration ; il la crée dans le « Dev Dashboard ». Surtout : **il n'y a plus de jeton à copier**. Le
   client donne deux identifiants (« Client ID » et « Client secret ») et le Studio les échange contre un jeton qui
   **expire au bout de 24 heures**. Le code du Studio attend encore un jeton copié-collé
   (`src/lib/products/connectors/shopify.ts`) : pour un client qui crée sa clé aujourd'hui, ce chemin ne marche plus tel
   quel.
2. Ce chemin reste **sans validation de Shopify** : une application créée par le marchand dans sa propre organisation
   n'est pas relue, et elle est exemptée de la nouvelle obligation de liste d'adresses autorisées (20 novembre 2026).
3. **Le thème peut toujours partir sans rien demander à Shopify** par trois portes : le client envoie le fichier .zip
   (quatre clics), ou il installe l'application gratuite « Theme Access » de Shopify et transmet un mot de passe au
   Studio, ou le Studio utilise le jeton de son application. L'écriture des fichiers de thème par programme demande une
   « exemption » de Shopify pour les applications de la boutique d'applications ; le texte officiel ne vise que
   celles-là, mais **personne chez Shopify ne l'a écrit noir sur blanc pour une application du marchand** : à essayer sur
   une vraie boutique avant d'y compter.
4. WordPress et PrestaShop ne savent pas recevoir un thème par leur interface de programmation : **le client envoie le
   .zip** (ou SINA lui fournit un petit module qui le fait). Les produits et les pages, eux, partent par clé.
5. Sites de services : le Studio a déjà la bonne base (Caddy avec certificat à la demande et question de contrôle,
   `src/app/api/site-domains/ask/route.ts`). Piège à éviter : Let's Encrypt limite à **50 certificats par semaine par
   domaine** ; les sous-domaines du Studio doivent donc partager **un seul certificat « joker »** (`*.domaine-du-studio`),
   obtenu par vérification DNS.
6. Loi française : la page officielle du 13 octobre 2026 liste les mentions ; deux nouveautés comptent pour SINA : la
   **fonction de rétractation en ligne** (« renoncer au contrat ici ») exigée pour la vente à distance (page officielle
   vérifiée le 19 juin 2026), et l'**accessibilité** des sites depuis le 28 juin 2025.

---

## 1. Shopify

### 1.1 Ce qui a changé en 2025-2026

| Fait | Source | Preuve |
|---|---|---|
| Depuis le 1er janvier 2026, plus de création d'application personnalisée dans l'administration Shopify ; on la crée dans le Dev Dashboard puis on l'installe. Les anciennes continuent de marcher. (Annonce du 30 octobre 2025.) | https://shopify.dev/changelog/posts/legacy-custom-apps-can-t-be-created-after-january-1-2026 | officiel |
| 17 novembre 2026 : les anciennes applications créées dans l'administration passent dans le Dev Dashboard ; jetons, droits et installations continuent de marcher ; nouvelles applications : Dev Dashboard ou Shopify CLI. | https://shopify.dev/changelog/posts/custom-apps-created-in-the-shopify-admin-are-moving-to-the-dev-dashboard | officiel |
| Pour une application du Dev Dashboard, on ne voit plus de jeton dans l'administration : « This process requires developer knowledge and can't be completed directly from your Shopify admin ». Le jeton s'obtient avec l'identifiant et le secret de l'application. | https://help.shopify.com/en/manual/apps/install-setup-apps | officiel |
| Échange : `POST https://{boutique}.myshopify.com/admin/oauth/access_token`, corps `grant_type=client_credentials`, `client_id`, `client_secret` ; jeton valable 86 399 secondes (24 h) ; **seulement si l'application et la boutique sont dans la même organisation** ; « Owning a store or having it installed doesn't automatically place it in your org ». | https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant | officiel |
| Les collaborateurs (agences) n'ont pas accès au Dev Dashboard d'un marchand. Rôle demandé pour créer : « App developer » (le propriétaire l'a). | https://help.shopify.com/en/manual/apps/app-types/custom-apps | officiel |
| 11 novembre 2026 : depuis le 20 novembre 2026, une application personnalisée installée **hors** de l'organisation qui la possède doit avoir une liste d'adresses autorisées (IP) ; au 1er janvier 2027 pour les installations existantes. **Exemptées : les applications créées par le marchand**, et celles installées dans leur propre organisation. | https://shopify.dev/changelog/posts/ip-allowlists-are-now-required-for-custom-apps-installed-outside-your-organization.md | officiel |
| L'interface REST est « legacy » depuis le 1er octobre 2024 ; toute nouvelle application publique doit être en GraphQL depuis le 1er avril 2025. | https://shopify.dev/docs/api/admin-rest/latest/resources/asset | officiel |
| Chaque version de l'interface est tenue au moins 12 mois ; une version périmée est servie par la plus ancienne encore tenue (pas d'erreur). | https://shopify.dev/docs/api/usage/versioning | officiel |

**Ce que SINA pourrait en faire** : remplacer « colle ton jeton » par « crée l'application dans ton Dev Dashboard et
donne-moi les deux identifiants », le Studio redemandant lui-même un jeton chaque jour.

Remarque sur le code : la version d'interface par défaut du Studio est `2025-07` ; d'après la règle des 12 mois elle
n'est sans doute plus tenue en novembre 2026 et Shopify répond avec une version plus récente sans prévenir (vérifiable
dans l'en-tête `X-Shopify-API-Version`). Non vérifié sur une vraie boutique.

### 1.2 Les façons d'installer le thème sans application validée

| Façon | Qui fait quoi | Droits | Limites | Preuve |
|---|---|---|---|---|
| **A. Le client envoie le .zip** | Administration › Boutique en ligne › Thèmes › « Import theme » › « Upload zip file » ; puis « Publier » | Propriétaire ou employé avec le droit Thèmes | .zip compressé ≤ 50 Mo ; 20 thèmes au plus (100 en Plus) ; **le forfait Starter n'accepte que le thème Spotlight** | officiel : https://help.shopify.com/en/manual/online-store/themes/adding-themes et https://shopify.dev/docs/storefronts/themes/architecture/limits |
| **B. Application « Theme Access » + Shopify CLI** | Le client installe l'application gratuite de Shopify, crée un mot de passe pour le Studio ; le Studio lance `shopify theme push --unpublished --store … --password …` | Mot de passe limité à l'écriture des thèmes ; installable par le propriétaire ou un employé ayant le droit Thèmes | Le lien envoyé par courriel expire après 7 jours ou une lecture ; mot de passe visible une seule fois ; ne touche ni produits ni pages | officiel : https://shopify.dev/docs/storefronts/themes/tools/theme-access et https://shopify.dev/docs/api/shopify-cli/theme/theme-push |
| **C. Application créée par le marchand (Dev Dashboard)** | Le client crée l'application, coche les droits, publie une version, l'installe, donne « Client ID » et « Client secret » ; le Studio échange contre un jeton de 24 h et envoie le thème (`themeFilesUpsert`, 50 fichiers par appel) puis produits, pages, menus | `write_themes`, `write_products`, `write_online_store_pages` ou `write_content`, `write_online_store_navigation`, etc. | **Écriture des fichiers de thème : « needs write_themes and an exemption from Shopify »** ; la page de l'ancienne interface ne vise que les applications de la boutique d'applications ; non tranché pour une application du marchand. Le jeton sert aussi à `shopify theme push --password` | officiel : https://shopify.dev/docs/api/admin-graphql/latest/mutations/themeFilesUpsert ; forum sans réponse claire : https://community.shopify.dev/t/add-liquid-file-to-the-live-shopify-theme/719 |
| **D. Application du Studio en « distribution personnalisée »** | Le Studio crée une application, choisit la distribution personnalisée, saisit l'adresse de la boutique et envoie un lien d'installation | Selon la version de l'application | Une boutique par application (ou plusieurs d'une même organisation Plus) ; choix irréversible ; **liste d'adresses IP obligatoire depuis le 20 novembre 2026** ; pas de relecture par Shopify (la relecture ne vise que la distribution publique) | officiel : https://shopify.dev/docs/apps/launch/distribution/select-distribution-method ; forum officiel (réponse d'un employé, 3 février 2026) : https://community.shopify.dev/t/collaborator-develop-apps-permission-is-useless-with-new-dev-dashboard-jan-2026-cant-install-custom-app-on-clients-store/29171 |
| **E. Boutique de transfert créée par le Studio** | Le Studio (compte partenaire) construit la boutique puis la transfère par courriel ; le client choisit son forfait | Compte partenaire Shopify | Pendant la construction : seules les applications gratuites et « partner-friendly », **pas d'application personnalisée** ; pas de vrais paiements ; page de mot de passe imposée ; **après le transfert, la boutique n'a plus droit aux essais gratuits ni aux promotions** ; invitation valable 7 jours | officiel : https://shopify.dev/docs/apps/build/dev-dashboard/stores/client-transfer-stores |
| **F. Accès collaborateur** | Le client accepte une demande d'accès du Studio | Droits choisis par le client | Ne permet plus de créer ni d'installer une application dans sa boutique (voir le fil du forum ci-dessus) | forum officiel |

**Ce que SINA pourrait en faire** : proposer d'abord la façon A (aucune clé, le client voit son thème arriver), avec un
guide en images de quatre écrans, et garder B ou C pour les mises à jour sans manipulation.

Pour un débutant, la façon A en clair : « Ouvre ton administration Shopify, va dans Boutique en ligne, puis Thèmes.
Clique sur Importer un thème, puis Envoyer un fichier .zip, choisis le fichier que SINA t'a préparé. Le thème arrive dans
tes thèmes en brouillon : clique sur Aperçu, puis sur Publier quand tu es prêt. » (Libellés français de l'administration
non relus un à un : à vérifier sur capture.)

Ce qui demanderait une validation longue : la façon D si l'on voulait une seule application pour tous les clients
(distribution publique = relecture par Shopify) ; une demande d'exemption pour écrire les thèmes (formulaire, délai
inconnu). À éviter.

### 1.3 Produits, collections, pages, menus

| Objet | Comment | Droits | Preuve |
|---|---|---|---|
| Produits avec variantes et photos | `productSet` (synchrone par défaut, asynchrone si gros ; 2 048 variantes par produit) | `write_products` | officiel : https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet |
| Produits sans clé | Le client importe un fichier CSV : Produits › Importer ; 15 Mo au plus ; en-têtes exactement ceux du modèle | aucun | officiel : https://help.shopify.com/en/manual/products/import-export/import-products |
| Pages (mentions, conditions, à propos) | `pageCreate` | `write_content` ou `write_online_store_pages` | officiel : https://shopify.dev/docs/api/admin-graphql/latest/mutations/pageCreate |
| Menus | `menuCreate` (titre, poignée unique, éléments jusqu'à trois niveaux) | `write_online_store_navigation` | officiel : https://shopify.dev/docs/api/admin-graphql/latest/mutations/menuCreate |
| Collections | `collectionCreate` | `write_products` | non vérifié aujourd'hui |
| Plan du site | Créé tout seul par Shopify (`sitemap.xml`) ; Google ne le lit pas tant que la boutique est en mode privé | — | officiel : https://help.shopify.com/en/manual/promoting-marketing/seo/find-site-map |

**Ce que SINA pourrait en faire** : avec une seule clé (façon C), monter en une fois thème, produits, collections, pages
obligatoires et menus, sans jamais activer le thème avant le « oui » du client. L'inventaire note que les menus manquent
aujourd'hui.

---

## 2. WooCommerce (WordPress)

| Fait | Source | Preuve |
|---|---|---|
| Thème (classique ou de blocs) : Apparence › Thèmes › Ajouter › « Téléverser un thème » (.zip), ou par le gestionnaire de fichiers de l'hébergeur, ou par FTP ; un thème de blocs s'installe comme les autres et s'aperçoit dans l'éditeur de site avant activation. | https://wordpress.org/documentation/article/work-with-themes/ | officiel |
| L'interface de WordPress ne sait que **lire** les thèmes (GET) : pas d'envoi ni d'activation par programme. | https://developer.wordpress.org/rest-api/reference/themes/ | officiel |
| Les extensions ne s'installent par programme que **depuis l'annuaire WordPress.org** (par leur nom court), pas depuis un .zip. | https://developer.wordpress.org/rest-api/reference/plugins/ | officiel |
| « Application Passwords » dans WordPress depuis 5.6 ; créés dans Utilisateurs › Modifier l'utilisateur ; utilisables sur des requêtes en https ; authentification de base. | https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/ | officiel |
| Pages par programme : `POST /wp/v2/pages` (titre, contenu, statut dont brouillon, modèle). | https://developer.wordpress.org/rest-api/reference/pages/ | officiel |
| Clés WooCommerce : WooCommerce › Réglages › Avancé › API REST ; droits Lecture, Écriture, Lecture/Écriture ; le secret n'est montré qu'une fois. | https://woocommerce.com/document/woocommerce-rest-api/ | officiel |
| En https, authentification de base ; si le serveur ne transmet pas l'en-tête d'autorisation, clé et secret peuvent passer dans l'adresse ; **les permaliens « simples » ne marchent pas**. | https://woocommerce.github.io/woocommerce-rest-api-docs/ | officiel |
| Import CSV des produits : Produits › Tous les produits › Importer ; les photos doivent être déjà en ligne et téléchargeables ; la taille maximale dépend de l'hébergeur ; variations par la colonne Parent (WooCommerce 11.1 et plus). | https://woocommerce.com/document/product-csv-importer-exporter/ | officiel |
| WordPress.com : l'envoi de thème est possible dès le forfait payant Personal selon la page d'aide (une autre page dit Business : contradiction). | https://wordpress.com/support/themes/uploading-setting-up-custom-themes/ | officiel, contradictoire |

**Ce que SINA pourrait en faire** : demander au client deux choses seulement, sa clé WooCommerce (produits) et un mot de
passe d'application WordPress (pages, menus), et lui faire envoyer le thème .zip lui-même avec un guide de trois écrans ;
avant tout, vérifier que ses permaliens ne sont pas « simples » et que son site est en https.

Limites selon l'hébergeur (non vérifié hébergeur par hébergeur) : taille maximale d'envoi de fichier, en-tête
d'autorisation parfois supprimé, pare-feu qui bloque l'interface ; l'inventaire signale aussi des versions testées
différentes entre deux fichiers du Studio (WordPress 6.5.5 et 6.6).

---

## 3. PrestaShop 8 et 9

| Fait | Source | Preuve |
|---|---|---|
| Thème : Apparence › Thème et logo › « Ajouter un thème » (.zip depuis l'ordinateur, une adresse web, ou dossier `/themes/` par FTP), puis « Utiliser ce thème » ; le .zip est la voie conseillée. | https://docs.prestashop-project.org/v.8-documentation/user-guide/improving-shop/customizing-store-design/theme-and-logo et https://devdocs.prestashop-project.org/9/themes/getting-started/quick-start/ | officiel |
| Webservice éteint par défaut ; on l'allume et on crée une clé dans Paramètres avancés › Webservice ; droits par ressource et par méthode ; ne donner que le nécessaire. | https://devdocs.prestashop-project.org/9/webservice/tutorials/creating-access/ | officiel |
| La clé sert de nom d'utilisateur sans mot de passe ; à envoyer dans l'en-tête d'autorisation (le serveur peut demander la directive `CGIPassAuth`). | https://devdocs.prestashop-project.org/9/webservice/tutorials/testing-access/ | officiel (résumé de recherche) |
| PrestaShop 9 a en plus une « Admin API » allumée par défaut, à clients et droits (`product_write`…), https obligatoire en production ; documentation encore annoncée « soon ». | https://devdocs.prestashop-project.org/9/admin-api/how-to-use/ | officiel |
| Import CSV : catégories d'abord, produits ensuite ; UTF-8, point-virgule conseillé ; photos par adresse absolue ; correspondance des colonnes à l'écran. | https://docs.prestashop-project.org/v.8-documentation/user-guide/configuring-shop/advanced-parameters/import | officiel |

**Ce que SINA pourrait en faire** : guider l'envoi du thème .zip par le client, puis pousser catégories et produits par
la clé Webservice (déjà construit dans `src/lib/products/connectors/prestashop.ts`) en vérifiant d'abord que la clé
répond.

Aucune de ces trois plateformes ne demande de validation par l'éditeur pour ces chemins.

---

## 4. Les sites de services hébergés par le Studio

### 4.1 Certificats et domaines

| Fait | Source | Preuve |
|---|---|---|
| Caddy obtient le certificat à la première visite (« On-Demand TLS ») ; il **doit** être restreint par une question de contrôle (« ask ») ; tester sur l'environnement d'essai pour ne pas se bloquer jusqu'à une semaine. Un certificat joker demande la vérification DNS. | https://caddyserver.com/docs/automatic-https | officiel |
| Let's Encrypt (page du 5 août 2026) : 50 certificats par domaine enregistré et par 7 jours ; 300 commandes par compte et par 3 heures ; 5 certificats identiques par 7 jours ; 5 échecs de validation par heure ; renouvellements exemptés. | https://letsencrypt.org/docs/rate-limits/ | officiel |
| Cloudflare for SaaS : 100 domaines de clients inclus même en gratuit, puis 0,10 $ par domaine, 50 000 au plus. | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/ | officiel |
| Vercel : domaine racine par enregistrement A, sous-domaine par CNAME, TXT `_vercel` si le domaine sert déjà ailleurs ; 50 domaines par projet en offre gratuite ; joker par délégation de `_acme-challenge`. | https://vercel.com/docs/domains/working-with-domains/add-a-domain | officiel |
| Un CNAME ne peut pas être posé sur la racine du domaine (OVHcloud, GoDaddy, IONOS le disent) ; il faut un A vers une adresse IP fixe. | voir 4.2 | officiel |

Ce que fait déjà le Studio (inventaire) : publication figée, sous-domaine éteint tant que `SITES_DOMAIN` n'est pas
défini, question de contrôle Caddy écrite ; prototype jamais mis sur un vrai domaine public.

**Ce que SINA pourrait en faire** : donner au client un sous-domaine du Studio en ligne en quelques secondes (certificat
joker unique), puis, s'il a un domaine, lui dicter exactement deux lignes à ajouter chez son hébergeur et vérifier
elle-même toutes les minutes jusqu'à ce que le cadenas soit là.

### 4.2 Guides par hébergeur de domaine

| Hébergeur | Où | Ce qu'il faut savoir | Source |
|---|---|---|---|
| OVHcloud | Web Cloud › Noms de domaine › le domaine › onglet Zone DNS › Ajouter une entrée | Pas de CNAME à la racine ; ne pas mettre CNAME et TXT sur le même sous-domaine ; jusqu'à 24 h de propagation | https://help.ovhcloud.com/csm/en-dns-edit-dns-zone?id=kb_article_view&sysparm_article=KB0051682 et https://help.ovhcloud.com/csm/en-dns-create-a-record?id=kb_article_view&sysparm_article=KB0067685 |
| IONOS | Domaines & SSL › engrenage du domaine › DNS › Ajouter un enregistrement | Un seul A actif pour la racine : modifier celui de la page de parking ; nom d'hôte vide pour la racine ; jusqu'à une heure | https://www.ionos.com/help/domains/configuring-cname-records-for-subdomains/configuring-a-cname-record-for-a-subdomain/ |
| GoDaddy | Domaine › DNS › Ajouter un enregistrement | Le nom d'un CNAME ne peut pas être @ ; le plus souvent moins d'une heure, jusqu'à 48 h | https://www.godaddy.com/help/add-an-a-record-19238 et https://www.godaddy.com/help/add-a-cname-record-19236 |
| Gandi | Domaine › le domaine › Enregistrements DNS › Ajouter | Racine : nom vide ou @ ; point final sur une cible externe ; un CNAME seul sur son sous-domaine | https://docs.gandi.net/fr/noms_domaine/operations_courantes/lier_services_externes.html |
| o2switch | cPanel › Domaines › Éditeur de zone DNS | Pas d'adresse IPv6 : supprimer les AAAA ; ne pas toucher aux MX, SPF, DKIM, DMARC ; sauvegarder la zone avant | https://faq.o2switch.fr/cpanel/domaines/editeur-zone-dns/ |

Règle commune utile pour SINA : ne jamais faire changer les « serveurs de noms » d'un débutant (on casserait ses
courriels) ; seulement ajouter ou remplacer deux lignes (un A pour la racine, un CNAME pour www), et dire de ne pas
toucher aux lignes MX.

### 4.3 Ce que font les autres

| Service | Façon de relier un domaine | Source | Preuve |
|---|---|---|---|
| Wix | « Pointage » : A `@` vers une adresse fixe + CNAME `www` ; ou connexion automatique en se connectant à son hébergeur dans une fenêtre (liste fournie par la société Entri) ; jusqu'à 48 h | https://support.wix.com/en/article/connecting-a-domain-to-wix-using-the-pointing-method | officiel |
| Squarespace | Un CNAME de vérification unique (sinon le domaine se détache après 15 jours), CNAME `www`, quatre A ; garder les MX ; 24 à 48 h | https://support.squarespace.com/hc/en-us/articles/205812378-Connecting-a-domain-to-your-site | officiel |
| Framer | Deux A + CNAME `www` ; sous-domaine Framer en ligne en quelques secondes | https://www.framer.com/help/articles/how-to-connect-a-custom-domain/ | officiel |
| Carrd, Durable | page de Carrd introuvable (404), Durable non lu | — | non vérifié |

Connexion « en un clic » (protocole Domain Connect, utilisé par IONOS et GoDaddy selon IONOS) : le fournisseur doit
publier un modèle puis **se faire accepter par chaque hébergeur de domaine**, parfois avec contrat
(https://www.domainconnect.org/getting-started/). **C'est une validation longue : à écarter.** Passer par Entri serait un
fournisseur payant (prix non vérifiés) : seulement avec l'accord du propriétaire.

---

## 5. Ce que la loi française demande

| Obligation | Détail | Source | Preuve |
|---|---|---|---|
| Mentions sur le site | Société : dénomination, forme, capital, siège, courriel, téléphone ; entrepreneur individuel : nom, « EI », adresse, courriel, téléphone ; RCS ou RNE ; numéro de TVA ; **hébergeur (nom, adresse, téléphone)** ; directeur de la publication ; autorité pour une activité réglementée ; règles d'une profession réglementée | https://entreprendre.service-public.gouv.fr/vosdroits/F37351 (vérifié le 13 octobre 2026) | officiel |
| Sanctions des mentions | 75 000 € (personne) / 375 000 € (société) ; défaut d'information sur les données : 1 500 € | même page | officiel |
| CGV pour les particuliers | obligatoires, en ligne : prix TTC, livraison, rétractation de 14 jours et son formulaire type, frais de retour, garanties légales, « possibilité de recourir à un médiateur de la consommation » ; services : forme juridique, assurances | https://entreprendre.service-public.gouv.fr/vosdroits/F33527 (vérifié le 1er juillet 2026) | officiel |
| Vente en ligne | bouton « Commande avec obligation de paiement » ; récapitulatif, modification, confirmation ; accusé de réception ; **fonction de rétractation en ligne gratuite (« renoncer au contrat ici ») avec confirmation** ; date de livraison précise, sinon 30 jours ; résiliation en ligne « résilier votre contrat » pour un abonnement | https://entreprendre.service-public.gouv.fr/vosdroits/F23455 (vérifié le 19 juin 2026) | officiel |
| Données personnelles | politique distincte des CGV, liée sur chaque page : responsable, finalités, base légale, destinataires, durées, droits, recours à la CNIL | https://entreprendre.service-public.gouv.fr/vosdroits/F37351 et https://entreprendre.service-public.gouv.fr/vosdroits/F24270 | officiel |
| Témoins (cookies) | consentement avant pose pour la publicité ; exemptés : nécessaires (panier, connexion, langue) et mesure d'audience anonyme strictement pour le site ; refuser aussi simple qu'accepter (« Tout refuser ») ; garder la preuve du consentement | https://entreprendre.service-public.gouv.fr/vosdroits/F31228 (vérifié le 13 octobre 2026) et https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience (4 juillet 2025 : traceurs de 13 mois au plus, données de 25 mois au plus) | officiel |
| Accessibilité | « Depuis le 28 juin 2025, un site internet réalisé par une PME doit être accessible aux personnes handicapées. » Une note France Num cite le seuil des micro-entreprises (moins de 10 salariés et moins de 2 M€) sans dire l'exemption exacte | F37351 et https://www.francenum.gouv.fr/guides-et-conseils/developpement-commercial/site-e-commerce/accessibilite-des-sites-de-e-commerce | officiel, incomplet |
| Médiateur de la consommation | obligation de proposer un médiateur gratuit et d'en donner les coordonnées (articles L612-1 et L616-1 du code de la consommation, amende jusqu'à 3 000 € ou 15 000 €) | pages economie.gouv.fr et Légifrance refusées (erreur 403) | **non vérifié** |

**Ce que SINA pourrait en faire** : préremplir les pages obligatoires avec les coordonnées déjà saisies, l'hébergeur juste
(Shopify, l'hébergeur WordPress du client, ou le Studio pour les services), et écrire « [À compléter : nom de ton
médiateur] » tant que le client n'en a pas choisi un, sans jamais ouvrir le site avec un trou.

Pour Shopify, WooCommerce et PrestaShop, le bouton de paiement et le tunnel de commande sont ceux de la plateforme ; la
**fonction de rétractation en ligne** n'a pas été vérifiée chez eux : à contrôler avant d'ouvrir une boutique, et sinon
à mettre dans le thème (une page avec formulaire et confirmation).

---

## 6. Erreurs fréquentes au lancement et liste de contrôle

Faits lus ce jour :

- Shopify : la boutique est en mode privé au départ ; il faut finir son forfait et son adresse d'entreprise avant de
  l'ouvrir ; en mode privé, ni visiteurs ni moteurs de recherche (https://help.shopify.com/en/manual/online-store/themes/password-page).
- Google Search Console : vérification par fichier HTML, balise dans la page, Google Analytics ou Tag Manager pour une
  adresse ; par DNS seulement pour un domaine entier ; quand l'hébergeur est dans la liste de Google, « verification
  should occur immediately », sinon jusqu'à deux ou trois jours (https://support.google.com/webmasters/answer/9008080).
  **Aucune validation longue** : le Studio peut poser la balise lui-même dans le site de services.
- Données structurées : « product snippet » pour une page sans achat, « merchant listing » pour une page où l'on achète
  (https://developers.google.com/search/docs/appearance/structured-data/product).

Liste de contrôle proposée pour SINA avant « on ouvre » (bon sens de métier, non tiré d'une page unique) :

1. Mentions, CGV, confidentialité, témoins : présentes, liées en bas de chaque page, sans « [À compléter] ».
2. Coordonnées identiques partout (pied de page, contact, mentions, fiche Google).
3. Domaine : racine et www répondent, l'un renvoie vers l'autre, cadenas valide.
4. Titre et description propres à chaque page ; une seule grande accroche par page ; texte de remplacement des photos.
5. Plan du site lisible, aucune page bloquée aux moteurs, mode privé retiré.
6. Données structurées : entreprise locale pour un service, produit avec prix et disponibilité pour une boutique ; jamais
   d'avis inventé.
7. Vitesse sur téléphone : photos compressées et dimensionnées, rien de bloquant en haut de page.
8. Formulaires et assistante : un vrai envoi d'essai arrive bien chez le client.
9. Pour une boutique : une commande d'essai jusqu'au paiement de test, frais de port, courriels de la plateforme en
   français.
10. Search Console vérifiée, plan du site envoyé.

---

## 7. Autres points utiles

- Le thème Shopify a ses propres plafonds : 25 sections par modèle, 50 blocs par section, `settings_data.json` de 1,5 Mo,
  1 000 modèles JSON (https://shopify.dev/docs/storefronts/themes/architecture/limits). Le thème unique du Studio (environ
  60 sections) doit rester dessous.
- Shopify CLI accepte comme mot de passe celui de Theme Access **ou** un jeton de l'interface d'administration : une
  seule méthode d'envoi du thème pour les façons B et C.
- `shopify theme push --unpublished` crée un thème non publié : idéal pour « il valide, puis il dit quand ouvrir ».

---

## Ce qui demanderait une validation longue d'une plateforme (à écarter)

- Une application Shopify publique unique pour tous les clients (relecture de la boutique d'applications).
- La demande d'exemption Shopify pour écrire les fichiers de thème, si elle s'avérait nécessaire pour une application du
  marchand.
- Le protocole Domain Connect (acceptation par chaque hébergeur de domaine).

Aucune validation pour : l'envoi du .zip, Theme Access, l'application créée par le marchand, la distribution
personnalisée (mais liste d'adresses IP obligatoire), les clés WooCommerce, WordPress et PrestaShop, Caddy,
Let's Encrypt, Search Console.

## Ce que je n'ai pas pu vérifier

- Si une application créée par le marchand peut écrire les fichiers de thème sans exemption (seul un essai sur une vraie
  boutique le dira).
- Si l'onglet « Connexions » du Studio (autorisation Shopify du Studio) repose sur une application publique ou
  personnalisée, et donc s'il tombe sous la règle des adresses IP du 20 novembre 2026.
- `collectionCreate`, les menus WordPress (blocs de navigation) par programme, l'envoi de module par l'Admin API de
  PrestaShop 9.
- Les textes du médiateur de la consommation (pages refusées), l'exemption exacte des micro-entreprises pour
  l'accessibilité, la fonction de rétractation dans Shopify, WooCommerce et PrestaShop.
- Carrd, Durable, les prix d'Entri ; les libellés français exacts des écrans Shopify.
- Le nombre de recherches autorisées a été atteint en fin de travail : ces points n'ont pas pu être cherchés davantage.

---

## Les 10 changements qui auraient le plus d'effet pour SINA

1. **Remplacer « colle ton jeton Shopify »** par le chemin 2026 : le client crée l'application dans son Dev Dashboard et
   donne « Client ID » et « Client secret » ; le Studio redemande un jeton de 24 h tout seul. Sans cela, aucun nouveau
   client Shopify ne peut relier sa boutique.
2. **Faire de l'envoi du .zip la porte par défaut sur les trois plateformes**, avec un guide en captures par plateforme :
   aucune clé, aucune exemption, le client voit son thème arriver en brouillon.
3. **Un seul envoi de thème Shopify par Shopify CLI** (`theme push --unpublished`), qui marche avec Theme Access ou avec
   le jeton de l'application du client ; essayer `themeFilesUpsert` sur une vraie boutique avant d'en dépendre.
4. **Monter les menus et les pages obligatoires** (`menuCreate`, `pageCreate`, `POST /wp/v2/pages`) : l'inventaire dit
   que les menus manquent.
5. **Un certificat joker unique pour les sous-domaines du Studio**, et le certificat à la demande seulement pour les
   domaines des clients : sinon le plafond de 50 certificats par semaine bloque l'ouverture des sites.
6. **SINA dicte deux lignes DNS selon l'hébergeur du client** (OVHcloud, IONOS, GoDaddy, Gandi, o2switch), vérifie
   elle-même jusqu'au cadenas et prévient le client ; jamais de changement de serveurs de noms.
7. **Pages obligatoires préremplies et contrôlées avant l'ouverture**, avec l'hébergeur juste et le médiateur en
   « [À compléter] » tant qu'il manque ; aucune ouverture avec un trou.
8. **La fonction de rétractation en ligne** (« renoncer au contrat ici ») vérifiée sur chaque plateforme, et ajoutée au
   thème quand elle manque.
9. **La liste de contrôle avant ouverture** (partie 6) passée par SINA elle-même, avec la balise Search Console posée par
   le Studio pour les sites de services.
10. **Mettre à jour la version d'interface Shopify** (`2025-07` dans le code) et la relire chaque trimestre, pour ne pas
    dépendre d'une version servie à notre insu.
