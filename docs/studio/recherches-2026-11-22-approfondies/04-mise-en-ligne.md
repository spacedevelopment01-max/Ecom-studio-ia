# La mise en ligne des sites créés par SINA — recherche approfondie

Recherche du 22 novembre 2026 (après-midi). Elle part du rapport du matin
(`docs/studio/recherches-2026-11-22/02-mise-en-ligne.md`) et va chercher ce qu'il n'avait pas pu vérifier. Aucun appel
payant, aucun essai sur une vraie boutique. Rapport écrit au fur et à mesure.

Niveaux de preuve : **officiel** (page de l'éditeur ou de l'État lue ce jour en entier ou dans la partie citée),
**forum officiel** (réponse d'un employé sur le forum de l'éditeur), **test indépendant**, **article d'éditeur**,
**avis**, **résumé seulement** (je n'ai lu que le résumé du moteur de recherche).


---

## En bref (ce que cette recherche change par rapport au matin)

1. **Le Studio envoie aujourd'hui le thème Shopify avec `themeCreate`, et cette commande demande elle aussi
   l'« exemption »** (page officielle : « The user needs write_themes and an exemption from Shopify to modify themes »).
   La page des droits précise que l'exemption vise **les applications en distribution publique** : celles qu'un marchand
   crée pour sa propre boutique ne sont pas visées par le texte. C'est la réponse la plus nette trouvée ; elle reste à
   confirmer par un premier envoi sur une vraie boutique.
2. **Le chemin « Client ID et Client secret » marche seulement si c'est le marchand qui crée l'application, depuis sa
   propre administration** (un employé de Shopify sur le forum officiel : « works for a merchant-owned app
   authenticating to that merchant's own store » ; une application créée par un partenaire « can't use it on merchant
   stores »). Le Studio ne peut donc pas créer l'application à la place du client.
3. **L'onglet « Connexions » du Studio (autorisation Shopify du Studio) est sans issue pour de nombreux clients** : une
   application du Studio en distribution personnalisée ne sert qu'une boutique (ou une organisation Plus) et doit, depuis
   le 20 novembre 2026, déclarer une liste d'adresses IP ; en distribution publique, il faudrait la relecture de la
   boutique d'applications **et** les jetons qui expirent (obligatoires pour toute application publique au
   1er janvier 2027). Les applications créées par les marchands sont **exclues** de ces deux règles.
4. **Version d'interface : 2025-07 n'est plus tenue** (page officielle : 2026-01 à 2026-10 tenues, 2025-04, 2025-07 et
   2025-10 « unsupported ») ; Shopify répond aujourd'hui en 2026-01, qui elle-même cesse le 16 janvier 2027.
5. **Les produits et collections créés par le Studio ne sont probablement pas visibles dans la boutique** : une
   collection créée est « unpublished by default » (page officielle) et les produits créés par l'interface ne sont pas
   publiés sur la boutique en ligne sans `publishablePublish` (forum officiel). Le code n'appelle jamais
   `publishablePublish`, ni `menuCreate`, ni `shopPolicyUpdate` (pages légales de Shopify).
6. **Forfait Starter** : un seul thème (Spotlight), aucune collection, aucun nouveau modèle de page, aucun employé
   (page officielle). Le site de SINA **ne peut pas** partir sur un Starter : SINA doit le dire avant la mise en ligne.
7. **Loi française, trois points tranchés par des textes officiels lus ce jour** : la fonction de rétractation en ligne
   (« renoncer au contrat ici » puis « confirmer la rétractation », accusé de réception daté sur support durable) s'applique
   depuis le **19 juin 2026** ; **Shopify n'a pas de bouton prêt à l'emploi** (sa page d'aide renvoie à ses règles de
   retour et dit que ses outils « don't automatically make your store compliant ») : c'est au thème de SINA de le porter ;
   le **médiateur** est obligatoire, payé par le professionnel, avec nom, adresse postale et site visibles sur le site
   (amende 3 000 € pour un entrepreneur individuel, 15 000 € pour une société) ; l'**accessibilité** ne s'impose pas à
   une entreprise de moins de 10 salariés **et** de moins de 2 millions d'euros de chiffre d'affaires ou de bilan.

---

## 1. Shopify, après les changements de 2026

### 1.1 Le parcours exact du marchand (Dev Dashboard), écran par écran

Source : https://help.shopify.com/en/manual/apps/install-setup-apps (officiel, lu ce jour). Libellés anglais de
l'administration ; les libellés français n'ont pas pu être relus (il faudrait une capture d'une vraie boutique en
français).

| Étape | Ce que le marchand fait (libellés exacts de la page anglaise) |
|---|---|
| 1 | Dans l'administration Shopify : **Settings › Apps** |
| 2 | Cliquer **Develop apps** |
| 3 | Si la page **App development** s'ouvre : cliquer **Build apps in Dev Dashboard** |
| 4 | Dans le Dev Dashboard : **Create app** |
| 5 | Section **Start from Dev Dashboard** : donner un nom (par exemple « Studio »), puis **Create** |
| 6 | Section **URLs** : comme l'application n'est pas dans l'administration, garder l'adresse par défaut `https://shopify.dev/apps/default-app-home` |
| 7 | **Webhooks API Version** : choisir une version (la plus récente tenue) |
| 8 | Section **Access** : saisir les droits (liste en 1.3) |
| 9 | **Release**, puis (facultatif) un nom de version, puis **Release** à nouveau |
| 10 | Retour dans **Settings › Apps › Develop apps › Build apps in Dev Dashboard** ; section **Apps** : cliquer l'application |
| 11 | Section **Installs** : **Install app**, choisir la boutique si plusieurs, **Install** |
| 12 | Copier **Client ID** et **Client secret** depuis les réglages de l'application (la page d'aide ne dit pas l'écran exact : « [À vérifier sur capture] ») et les donner au Studio |

Conditions officielles :
- rôle **App developer** pour créer (ou, en Plus, la permission « Build and manage apps ») ; les **collaborateurs n'ont pas
  accès** au Dev Dashboard du marchand (https://help.shopify.com/en/manual/apps/app-types/custom-apps, officiel) ;
- l'application ne s'installe que dans les boutiques de la **même organisation** (même page d'aide).

**Ce que SINA pourrait en faire** : un guide en douze écrans, en français, avec la liste des droits à copier d'un clic,
et un bouton « J'ai mes deux identifiants » qui teste aussitôt l'échange ; SINA dit au client « tu en as pour cinq
minutes, je reste avec toi ».

### 1.2 L'échange contre le jeton de 24 heures

Source : https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant et
https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens (officiel, lus ce jour).

- Requête : `POST https://{boutique}.myshopify.com/admin/oauth/access_token`, en-tête
  `Content-Type: application/x-www-form-urlencoded`, corps `grant_type=client_credentials`, `client_id`,
  `client_secret` ; **ne pas envoyer `scope`** (ignoré).
- Réponse : `access_token` (à mettre dans l'en-tête `X-Shopify-Access-Token`), `scope` (les droits réellement accordés,
  **peut être plus court que ce qui a été demandé**), `expires_in` toujours **86 399** secondes.
- **Aucun jeton de renouvellement** : on redemande simplement un jeton avec les deux identifiants ; l'exemple officiel
  garde le jeton en mémoire et le considère périmé 60 secondes avant la fin.
- Erreur à connaître : `shop_not_permitted` (« Client credentials cannot be performed on this shop ») = application et
  boutique pas dans la même organisation. Autre erreur : « Invalid API key or access token » = on a envoyé l'identifiant
  et le secret directement à l'interface au lieu du jeton.
- **Qui peut s'en servir** : réponse d'un employé de Shopify, 17 et 23 décembre 2025 (forum officiel,
  https://community.shopify.dev/t/custom-app-credentials/27460) : « works for a merchant-owned app authenticating to that
  merchant's own store » ; « Partner apps can't use it on merchant stores (even your own merchant store) ». Le même fil
  montre un développeur qui obtient `shop_not_permitted` sur une vraie boutique avec une application créée ailleurs.
- 27 octobre 2026 : « Custom apps, merchant-created apps and online access tokens are not affected » par l'obligation
  des jetons qui expirent (https://shopify.dev/changelog/app-security-updates-october-2026, officiel).

**Ce que SINA pourrait en faire** : garder le secret chiffré, redemander un jeton avant chaque envoi (jamais stocker le
jeton plus de 23 heures), comparer le champ `scope` reçu à la liste attendue et dire au client en clair le droit qui
manque (« coche “Pages” dans Access, puis Release »).

Dans le code (vérifié) : `src/lib/products/connectors/shopify.ts` attend `{ shop, token }` et
`src/lib/social/oauth.ts` fait l'autorisation du Studio par code (`/admin/oauth/authorize` puis échange du code). Aucun
endroit du code n'appelle `grant_type=client_credentials`.

### 1.3 Les droits nécessaires

Source : https://shopify.dev/docs/api/usage/access-scopes et les pages de chaque commande (officiel, lus ce jour).

| Ce que SINA monte | Commande | Droit |
|---|---|---|
| Thème (envoi du .zip ou des fichiers) | `themeCreate`, `themeFilesUpsert` | `write_themes` (+ exemption pour les applications publiques, voir 1.5) |
| Produits, variantes, photos | `productSet` | `write_products` (+ `read_locations`, `write_inventory` pour le stock, déjà dans le code) |
| Collections | `collectionCreate` | `write_products` |
| Rendre produits et collections visibles dans la boutique | `publishablePublish` | `write_publications` |
| Pages (à propos, contact, livraison) | `pageCreate` | `write_online_store_pages` (accepté à la place de `write_content`) |
| Menus | `menuCreate` | `write_online_store_navigation` |
| Pages légales de Shopify (remboursement, conditions, confidentialité, mentions) | `shopPolicyUpdate` | `write_legal_policies` |
| Fichiers (logo, images envoyées) | `stagedUploadsCreate`, `fileCreate` | `write_files` |
| Remises (accord du 16 novembre 2026) | `discountAutomaticBasicCreate`… | `write_discounts` |

`shopPolicyUpdate` : corps en HTML jusqu'à 512 Ko ; crée la politique si elle n'existe pas (officiel,
https://shopify.dev/docs/api/admin-graphql/latest/mutations/shopPolicyUpdate). Les valeurs exactes du type de politique
(mentions légales, conditions de vente) ne sont pas toutes listées sur la page : à lire dans la référence du type.

**Ce que SINA pourrait en faire** : une seule liste de droits, la même dans le guide du client, dans le contrôle du jeton
et dans l'écran « ce que je peux faire dans ta boutique ».

### 1.4 La version de l'interface

Source : https://shopify.dev/docs/api/usage/versioning (officiel, lu ce jour).

| Version | Accessible jusqu'au |
|---|---|
| 2026-01 | 16 janvier 2027 |
| 2026-04 | 16 avril 2027 |
| 2026-07 | 16 juillet 2027 |
| 2026-10 (la plus récente) | 16 octobre 2027 |

2025-04, 2025-07 et 2025-10 sont marquées « unsupported » ; 2027-01 est en essai. Une version périmée est servie par la
plus ancienne encore tenue ; l'en-tête `X-Shopify-API-Version` le montre. Le Studio demande `2025-07`
(`src/lib/integrations/shopify.ts` ligne 20, `src/lib/products/connectors/shopify.ts`) : il reçoit donc 2026-01
aujourd'hui, et basculera seul sur 2026-04 le 16 janvier 2027.

**Ce que SINA pourrait en faire** : passer à 2026-10, lire l'en-tête à chaque réponse et prévenir l'administrateur dès
qu'il diffère.

### 1.5 Le thème : l'« exemption », enfin plus claire

| Fait | Source | Preuve |
|---|---|---|
| `themeCreate` : « The user needs write_themes and an exemption from Shopify to modify themes » ; `source` = adresse extérieure ou adresse d'envoi préparé ; rôle UNPUBLISHED ou DEVELOPMENT seulement | https://shopify.dev/docs/api/admin-graphql/latest/mutations/themeCreate | officiel |
| `themeFilesUpsert` : même phrase ; 50 fichiers par appel au plus | https://shopify.dev/docs/api/admin-graphql/latest/mutations/themeFilesUpsert | officiel |
| Page des droits : « If your app uses public distribution and needs to modify a theme or theme files, then it needs an exemption » ; l'exemption couvre un usage précis et peut être retirée | https://shopify.dev/docs/api/usage/access-scopes | officiel |
| Ancienne interface : l'exemption vise une application « distributed through the Shopify App Store » | https://shopify.dev/docs/api/admin-rest/latest/resources/asset | officiel |
| Un développeur d'application personnalisée a reçu « This action requires merchant approval for write_themes scope » : le droit n'avait pas été accordé par la boutique (problème de droit, pas d'exemption) | https://community.shopify.com/t/editing-theme-via-api-this-action-requires-merchant-approval-for-write-themes-scope/363858 | avis (résumé seulement) |

Lecture : deux pages officielles limitent l'exemption aux applications **publiques** ; aucune ne vise une application
créée par le marchand. Le plus probable est donc que l'application du client peut envoyer le thème sans exemption.
Personne chez Shopify ne l'a écrit pour ce cas précis : **un premier essai gratuit sur une boutique de développement**
(créée depuis le Dev Dashboard, donc dans l'organisation) le tranchera.

Point important pour le code : le Studio utilise `themeCreate` avec une adresse publique signée d'une heure
(`pushTheme`, `src/lib/integrations/shopify.ts`). Cette commande est soumise à la même règle que `themeFilesUpsert` :
avec l'application **du Studio**, si elle est publique, l'envoi serait refusé sans exemption.

Envoi du .zip par le client (rappel et ajouts, officiel : https://help.shopify.com/en/manual/online-store/themes/adding-themes) :
- ordinateur : **Online Store**, section **Draft themes**, **Import theme › Upload zip file › Choose File › Upload** ;
  téléphone : application Shopify › **Sales channels › Online Store › Manage themes**, même suite ;
- 20 thèmes au plus sur Basic, Grow et Advanced (100 sur Plus) ; il faut en retirer un pour en ajouter ;
- le thème s'aperçoit et se règle avant d'être publié ; un seul thème publié à la fois ;
- erreurs fréquentes (forums, avis) : « Zip does not contain a valid theme: missing template "layout/theme.liquid" »
  quand les dossiers sont dans un dossier de plus au lieu d'être à la racine du .zip, ou quand on envoie l'archive qui
  contient le thème plutôt que le thème ; il faut au moins `layout/theme.liquid` et un modèle d'accueil
  (https://shopify.dev/docs/storefronts/themes/architecture, officiel, résumé seulement) ; taille ≤ 50 Mo
  (matin, officiel).

**Ce que SINA pourrait en faire** : un contrôle du .zip avant de le donner (dossiers à la racine, `layout/theme.liquid`,
`templates/index.json`, taille), et une phrase prête si Shopify refuse : « Tu as envoyé le bon fichier ? Il s'appelle
… .zip ; ne le décompresse pas. »

### 1.6 Produits, collections, pages, menus : ce qui manque dans le code

| Fait | Source | Preuve |
|---|---|---|
| `collectionCreate` : collection « unpublished by default » ; la rendre visible avec `publishablePublish` ; **interdit sur les forfaits Starter et Retail** ; l'argument `input` est remplacé par `collection` (l'ancien reste accepté) | https://shopify.dev/docs/api/admin-graphql/latest/mutations/collectionCreate | officiel |
| Produit créé par l'interface : pas publié tout seul sur la boutique en ligne ; « publishablePublish » est la seule façon en GraphQL (réponse d'un employé) ; vérifier avec `publishedOnPublication` | https://community.shopify.dev/t/product-publishing-to-sales-channel-and-productset/8648 et https://community.shopify.com/t/graphql-api-productcreate-does-not-publish-product-to-channel/116720 | forum officiel (résumé seulement) |
| `productSet` : pour les listes (collections, métachamps, variantes), **ce qui n'est pas envoyé est supprimé** ; 2 048 variantes par produit ; `synchronous: false` en cas de délai dépassé | https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet | officiel |
| `pageCreate`, `menuCreate` | voir le rapport du matin | officiel |

Dans le code (vérifié) : `pushCatalog` appelle `productSet` puis `collectionCreate(input:)` sans jamais appeler
`publishablePublish` ; `pushPages` crée les pages ; aucun `menuCreate`, aucun `shopPolicyUpdate`. Conséquence probable,
à confirmer sur une boutique d'essai : **produits et collections arrivent dans l'administration mais ne se voient pas
sur le site** ; les menus du thème restent ceux de Shopify par défaut.

Autre conséquence de la règle de `productSet` : renvoyer une fiche sans ses métachamps ou sans une de ses collections les
efface côté Shopify. Le Studio doit toujours envoyer la liste complète.

**Ce que SINA pourrait en faire** : après l'envoi, relire la boutique (produits publiés, collections visibles, menus
présents) et ne dire « c'est en place » qu'après cette relecture.

### 1.7 Le forfait Starter

Source : https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/plans-features/shopify-starter-plan
(officiel, lu ce jour) et https://help.shopify.com/en/manual/online-store/themes/adding-themes.

- « The Spotlight theme is ready to use with the Starter plan » ; « Other themes and customization options aren't
  available » ; « Stores on the Starter plan can only add the Spotlight theme ».
- Pas de collections, pas de nouveau modèle de page, pas d'employé, pas de transporteurs calculés.
- Le prix n'est pas sur la page lue.

**Ce que SINA pourrait en faire** : demander le forfait Shopify du client **avant** de monter le site, et dire en clair :
« Avec Starter, Shopify n'accepte pas d'autre thème que le sien : il faut au moins le forfait Basic pour ton site. »

### 1.8 L'application du Studio (onglet Connexions) : à abandonner pour les boutiques des clients

| Fait | Source | Preuve |
|---|---|---|
| Une boutique hors de l'organisation de l'application : il faut la distribution personnalisée (jeton par échange ou par code), le jeton du client ne marche pas | https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens | officiel |
| Distribution personnalisée : une boutique par application (ou une organisation Plus), choix irréversible | https://shopify.dev/docs/apps/launch/distribution/select-distribution-method (matin) | officiel |
| Liste d'adresses IP obligatoire depuis le 20 novembre 2026 pour une application installée hors de son organisation ; « we'll reject Admin API requests from any other IP » | https://shopify.dev/changelog/app-security-updates-october-2026 | officiel |
| Applications publiques : jetons qui expirent obligatoires ; 1er janvier 2027 retirées de la boutique d'applications et plus installables ; 1er avril 2027 réponses 403 avec un ancien jeton | même page | officiel |
| Jetons qui expirent : 60 minutes, avec un jeton de renouvellement ; depuis le 28 août 2026 l'ancien jeton de renouvellement reste valable jusqu'à l'usage du nouveau | https://shopify.dev/changelog (résumé du moteur, posts « offline access tokens now support expiry and refresh » et « more resilient refreshes ») | officiel (résumé seulement) |

Lecture : avec l'application du Studio, il faudrait soit **une application par client** (distribution personnalisée,
liste d'IP du serveur du Studio, création à la main dans le Dev Dashboard du Studio), soit la **relecture publique**
(validation longue, à écarter selon la règle du propriétaire). Le chemin « l'application du client » n'a aucune de ces
contraintes. L'onglet « Connexions » peut rester pour les boutiques déjà reliées.

### 1.9 Le transfert de boutique par un partenaire

Le rapport du matin l'a lu (https://shopify.dev/docs/apps/build/dev-dashboard/stores/client-transfer-stores, officiel).
Ajout : depuis le 27 octobre 2026, Shopify **vérifie l'identité** du partenaire avant d'installer des applications sur
une boutique de transfert (page de sécurité d'octobre, officiel). Ce chemin demande au Studio un compte partenaire et
fait perdre au client les essais gratuits : il reste à écarter.

---

## 2. Sites de services hébergés par le Studio

### 2.1 Ce que le code fait déjà (vérifié)

- `src/lib/sites/domains.ts` : domaine du client relié par **deux enregistrements** que le client ajoute lui-même :
  une preuve TXT `_ecs-verif.<domaine>` (jeton propre au site) et un pointage (CNAME vers l'adresse du site pour `www`,
  A ou AAAA vers `SITES_PUBLIC_IPS` pour le domaine nu) ; au plus 2 domaines par site ; revérification chaque jour,
  « perdu » après 3 échecs ; une demande non prouvée cède la place au bout de 7 jours.
- `src/app/api/site-domains/ask/route.ts` : la question de contrôle de Caddy (`on_demand_tls { ask … }`), qui ne dit oui
  que pour une adresse du Studio active ou un domaine prouvé, d'un site en ligne avec forfait actif ; jeton facultatif
  `SITES_ASK_TOKEN`.
- Aucun fichier de configuration Caddy dans le dépôt (seulement `docker-compose.yml` et une phrase du `README.md` :
  « derrière un proxy HTTPS (Caddy, Traefik, nginx) »). La configuration du serveur reste à écrire.
- Détail utile : la preuve TXT est posée sur `_ecs-verif.www.domaine`, pas sur `www.domaine` ; elle ne heurte donc pas la
  règle d'OVHcloud « pas de CNAME et de TXT sur le même sous-domaine ».

### 2.2 Caddy et Let's Encrypt : ce qui est sûr

| Fait | Source | Preuve |
|---|---|---|
| `on_demand_tls` « Required for use in production environments, to prevent abuse » ; la question `ask` doit répondre **en quelques millisecondes, sans requête DNS ni réseau** ; les anciens réglages `interval` et `burst` sont « NOT recommended » | https://caddyserver.com/docs/caddyfile/options | officiel |
| `acme_dns` (vérification DNS, nécessaire au joker) « Requires a custom build of Caddy with a plugin for your DNS provider » | même page | officiel |
| « Caddy will use the wildcard certificate for individual subdomains in the configuration » et ne prend pas de certificat par sous-domaine sauf demande | https://caddyserver.com/docs/automatic-https | officiel |
| En cas d'échec : un nouvel essai, puis ZeroSSL, puis attente croissante jusqu'à un jour, pendant 30 jours ; limite interne de 10 essais par compte et par 10 secondes ; plusieurs Caddy qui partagent le même stockage partagent les certificats | même page | officiel |
| Tester avec l'environnement d'essai de Let's Encrypt (`acme_ca`) | https://caddyserver.com/docs/caddyfile/options | officiel |
| Limites (page du 5 août 2026) : 50 certificats par **domaine enregistré** et par 7 jours, 300 commandes par compte et par 3 heures, 5 certificats identiques par 7 jours, 5 échecs par nom et par heure, 10 comptes par adresse IP et par 3 heures ; **les renouvellements coordonnés par ARI sont exemptés de toutes les limites** ; dérogation possible mais « takes a few weeks » | https://letsencrypt.org/docs/rate-limits/ | officiel |
| Durée des certificats : 64 jours le **10 février 2027**, 45 jours le **16 février 2028** ; plus de courriels d'expiration depuis le 4 juin 2025 ; plus d'OCSP depuis le 7 mai 2025 | https://letsencrypt.org/upcoming-features/ (mise à jour du 22 juillet 2026) | officiel |
| Enregistrement CAA : s'il existe sans `letsencrypt.org`, Let's Encrypt n'émet pas ; valeur à ajouter `0 issue "letsencrypt.org"` ; une réponse SERVFAIL vient le plus souvent d'un DNSSEC cassé | https://letsencrypt.org/docs/caa/ | officiel |

Ce qui en découle pour le Studio :
1. **Domaines des clients** : la limite de 50 par semaine compte **par domaine enregistré du client**, donc elle ne gêne
   pas ; la question `ask` du Studio interroge seulement sa base (aucune requête DNS) : conforme à la consigne de Caddy.
2. **Sous-domaines du Studio** (`marque.domaine-du-studio`) : tous comptent pour **un seul** domaine enregistré, donc
   50 nouveaux sites par semaine au plus avec un certificat chacun. Un certificat joker `*.domaine-du-studio`, obtenu
   par vérification DNS, supprime le problème. Il faut pour cela un Caddy construit avec le module de l'hébergeur DNS du
   Studio (organisation GitHub `caddy-dns`, 105 dépôts ; je n'ai pas pu vérifier un par un ceux d'OVHcloud, Gandi ou
   IONOS).
3. Comme Caddy se rabat sur ZeroSSL, un client qui a un enregistrement CAA doit autoriser les deux, ou SINA doit lui
   dicter la ligne `letsencrypt.org`.
4. Avec des certificats de 64 puis 45 jours, le renouvellement doit être automatique (Caddy le fait) ; rien à prévoir à
   la main.

Autre voie, écartée : faire inscrire le domaine des sites du Studio sur la « Public Suffix List » (chaque sous-domaine
compterait comme un domaine à part, comme pour `github.io`). C'est une acceptation par des bénévoles, avec délai : contraire
à la règle « aucune attente de validation ». Non vérifié en détail.

**Ce que SINA pourrait en faire** : mettre le site d'un client en ligne en quelques secondes sur le sous-domaine du
Studio (certificat joker déjà là), et, pour son domaine, vérifier elle-même toutes les minutes la preuve, le pointage,
puis le cadenas, en expliquant en clair une erreur CAA ou DNSSEC si elle arrive.

### 2.3 Relier un domaine : les cinq hébergeurs (ce qui s'ajoute au rapport du matin)

Le matin a lu les pages d'OVHcloud, IONOS, GoDaddy, Gandi et o2switch (chemins des écrans et pièges). Points ajoutés :

| Piège | Ce qu'il faut dire au client | Source |
|---|---|---|
| Un domaine nu ne peut pas recevoir de CNAME | « Pour `ton-site.fr` sans www, remplace l'adresse de la ligne A par celle-ci » ; le Studio doit donc publier une adresse IP fixe (`SITES_PUBLIC_IPS`) | OVHcloud, GoDaddy, IONOS (matin, officiel) |
| Une ancienne ligne AAAA (IPv6) reste : une partie des visiteurs arrive ailleurs | « Supprime la ligne AAAA du domaine si elle existe » ; le code vérifie déjà que **toutes** les adresses A et AAAA pointent vers le Studio | o2switch (matin, officiel) ; `domains.ts` (vérifié) |
| Ligne CAA d'un autre fournisseur | ajouter `0 issue "letsencrypt.org"` | Let's Encrypt (officiel) |
| DNSSEC mal configuré (SERVFAIL) | SINA le détecte et dit « ton hébergeur doit réparer la signature de ton domaine » | Let's Encrypt (officiel) |
| Courriel cassé | ne jamais changer les serveurs de noms ; ne toucher ni aux lignes MX, ni aux TXT SPF, DKIM, DMARC | matin (officiel o2switch) |
| Délais | jusqu'à 24 h (OVHcloud), une heure (IONOS), le plus souvent moins d'une heure et jusqu'à 48 h (GoDaddy) | matin (officiel) |

Pas relu cet après-midi, faute de recherches : les captures exactes de chaque écran, et les libellés précis de l'éditeur
de zone de Gandi et d'IONOS en français.

---

## 3. WooCommerce (WordPress)

### 3.1 Versions du jour et code du Studio

| Fait | Source | Preuve |
|---|---|---|
| WordPress le plus récent : **7.1.5** (PHP 7.4 au moins) | https://api.wordpress.org/core/version-check/1.7/ (lu ce jour) | officiel |
| WooCommerce **11.3.1** (19 novembre 2026), demande WordPress **7.0** au moins, essayé jusqu'à 7.1.5, PHP 7.4 | https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=woocommerce | officiel |
| Thème de blocs : un `single-product.html` ou `archive-product.html` du thème passe avant celui de WooCommerce ; les pages panier et commande doivent afficher le contenu de la page (ne pas y poser les blocs Panier et Commande directement) | https://developer.woocommerce.com/docs/theming/block-theme-development/theming-woo-blocks/ | officiel (résumé seulement) |
| Panier et commande en blocs par défaut pour les boutiques ouvertes après WooCommerce 8.3 (novembre 2023) | https://woocommerce.com/document/woocommerce-store-editing/customizing-cart-and-checkout/ | officiel (résumé seulement) |
| Thème classique : modèles PHP, pages boutique non modifiables dans l'éditeur de blocs ; thème de blocs : tout dans l'éditeur de site | https://woocommerce.com/document/woocommerce-store-editing/blocks/ | officiel (résumé seulement) |
| Menus d'un thème de blocs par programme : `POST /wp/v2/navigation` (titre, contenu, statut) | https://developer.wordpress.org/rest-api/reference/wp_navigations/ | officiel |

Dans le code (vérifié) : `src/lib/cms-v2/adapters/wordpress.ts` fabrique un **thème de blocs** (choix justifié en tête
du fichier : panier, fiche et commande = blocs natifs de WooCommerce habillés), avec `Requires at least: 6.5`,
`Tested up to: 6.6` et le schéma `theme.json` 6.6. Le choix des blocs est le bon pour 2026 ; les numéros de version, eux,
ont plus d'un an de retard sur WordPress 7.1. Ce que WordPress fait d'un thème « essayé jusqu'à 6.6 » envoyé à la main
n'a pas été vérifié (à ma connaissance seul « Requires at least » et « Requires PHP » bloquent l'activation : à
confirmer).

**Ce que SINA pourrait en faire** : créer les menus par `POST /wp/v2/navigation` avec le mot de passe d'application,
et faire passer chaque thème exporté par un contrôle de versions (WordPress et WooCommerce du jour).

### 3.2 Les hébergeurs français

| Hébergeur | Ce que j'ai pu lire | Preuve |
|---|---|---|
| Hostinger | plafonds de mémoire PHP et de taille d'envoi selon le forfait (ordre de grandeur donné par le résumé : 1 024 à 2 048 Mo sur l'hébergement web) ; réglage dans hPanel › Websites › Dashboard › PHP Configuration › PHP Options ; une valeur au-dessus du plafond est ramenée au plafond | https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/ — **résumé seulement** |
| o2switch | page de la FAQ non trouvée par la recherche ; cPanel : réglage dans « MultiPHP INI Editor » (règle de cPanel : `post_max_size` plus grand que `upload_max_filesize`, `memory_limit` plus grand que `post_max_size`) | https://docs.cpanel.net/cpanel/software/multiphp-ini-editor-for-cpanel/ — résumé seulement |
| OVHcloud, IONOS | non lus | pas vérifié |

Ce qui reste sûr (pages officielles WordPress et WooCommerce, lues le matin) : le site doit être en https, les
permaliens ne doivent pas être « simples », le serveur peut retirer l'en-tête d'autorisation (alors la clé passe dans
l'adresse).

**Ce que SINA pourrait en faire** : ne pas deviner l'hébergeur ; demander au client une capture de **Outils › Santé du
site › Infos › Serveur** (la taille d'envoi maximale y figure), ou lire la taille maximale affichée sur l'écran
d'envoi du thème, et alléger le .zip (photos hors du thème) s'il dépasse.

---

## 4. PrestaShop 8 et 9

| Fait | Source | Preuve |
|---|---|---|
| PrestaShop **9.1** sorti le 23 mars 2026 ; PHP 8.1 à 8.5 ; **Hummingbird 2.0 devient le thème par défaut** des nouvelles installations ; le thème Classic reste proposé au téléchargement (Classic 3.1.1) | https://build.prestashop-project.org/news/2026/prestashop-9-1-0-available/ | officiel |
| « Hummingbird is now the default theme for new PrestaShop 9.1 installations » ; une boutique mise à jour depuis 9.0 garde son thème ; Hummingbird a des ruptures de compatibilité avec Classic (crochets retirés, jQuery déprécié) | https://devdocs.prestashop-project.org/9/modules/core-updates/9.1/ | officiel |
| Classic « deprecated for new development starting from PrestaShop 9.1 », gardé pour compatibilité | https://devdocs.prestashop-project.org/9/themes/ | officiel (résumé seulement) |
| Un thème enfant exige que le thème parent soit dans `/themes` | https://docs.prestashop-project.org/v.9-documentation/user-guide/improving-shop/customizing-store-design/theme-and-logo | officiel (résumé seulement) |

Dans le code (vérifié) : `src/lib/cms-v2/adapters/prestashop.ts` fabrique un **thème enfant de Classic**
(`parent: classic`, compatible à partir de 8.0.0) avec un module compagnon. Sur une boutique neuve en 9.1, le parent
attendu n'est plus le thème actif, et rien ne dit qu'il est encore dans `/themes` : **à vérifier sur une installation
9.1 neuve** avant d'y envoyer un client.

**Ce que SINA pourrait en faire** : demander la version de PrestaShop dès le départ ; si c'est une 9.1 neuve, vérifier
par le Webservice que le thème Classic est présent avant de livrer le thème, sinon le dire clairement.

---

## 5. La loi française pour ouvrir le site

### 5.1 La fonction de rétractation en ligne (nouvelle depuis le 19 juin 2026)

| Fait | Source | Preuve |
|---|---|---|
| Directive (UE) 2023/2673, nouvel article 11 bis de la directive 2011/83 : fonction marquée « renoncer au contrat ici » (ou formule « dénuée d'ambiguïté »), **bien visible, facilement accessible, disponible pendant tout le délai** ; le consommateur donne ou confirme son nom, ce qui identifie le contrat, et le moyen de recevoir la confirmation ; deuxième bouton « confirmer la rétractation » ; **accusé de réception sur support durable, sans retard excessif, avec le contenu, la date et l'heure** ; transposition au 19 décembre 2025, application au **19 juin 2026** | https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023L2673 | officiel |
| Fiche de l'État (vérifiée le 19 juin 2026) : mêmes éléments ; textes : articles L221-21, D221-5 (mise en place) et R221-3 (exemple de mention) du code de la consommation | https://entreprendre.service-public.gouv.fr/vosdroits/F23455 | officiel |
| Transposition française par l'ordonnance n° 2026-2 et le décret n° 2026-3 du 5 janvier 2026 | articles de cabinets (https://cholez-pagotto.fr/blog/bouton-de-retractation-obligation-vente-en-ligne-19-juin-2026 et autres) | article d'éditeur (résumé seulement) |
| **Shopify** : page d'aide « EU right of withdrawal » ; Shopify renvoie à ses règles de retour et d'annulation (retour d'au moins 14 jours, annulation « Until item is fulfilled », règle propre au marché européen) et dit que ses outils ne rendent pas la boutique conforme d'eux-mêmes ; l'accusé de réception reste à la charge du marchand ; seuls les « Managed Markets » sont réglés d'office | https://help.shopify.com/en/manual/compliance/legal/eu-right-of-withdrawal | officiel |
| Sur le forum de Shopify (16 juin 2026), un employé confirme l'obligation sans annoncer de bouton intégré | https://community.shopify.dev/t/new-eu-withdrawal-button-required-by-june-19-2026/35121 | forum officiel |
| Des applications de la boutique Shopify vendent ce bouton | https://apps.shopify.com/eu-withdrawal-button-form | article d'éditeur |
| Prolongation du délai jusqu'à 12 mois et 14 jours en cas de manquement, citée par Shopify | page d'aide Shopify ci-dessus (résumé du moteur) | résumé seulement |

WooCommerce et PrestaShop : aucune fonction intégrée trouvée (non cherché en profondeur faute de réserve).

**Ce que SINA pourrait en faire** : mettre dans le thème unique, sur les trois plateformes et pour les sites de
services qui vendent à distance, une page « Renoncer au contrat ici » liée dans le pied de chaque page : formulaire
(nom, numéro de commande, courriel), bouton « Confirmer la rétractation », et envoi automatique d'un accusé daté. Pour un
site hébergé, le Studio a déjà un circuit de formulaires (`src/lib/sites/requests.ts`) qui peut porter l'accusé ; pour
Shopify, le formulaire de contact du thème peut porter la demande, mais l'accusé doit partir d'ailleurs (Shopify Flow
ou courriel du marchand) : **à concevoir et essayer**. Ce n'est pas une option : sans elle, SINA ne devrait pas ouvrir
une boutique qui vend à des particuliers.

### 5.2 Le médiateur de la consommation

Source : https://entreprendre.service-public.gouv.fr/vosdroits/F33338 (officiel, vérifiée le 16 octobre 2026).

- Tout professionnel qui vend à des consommateurs « doit désigner un médiateur de la consommation » ; pas pour une
  activité seulement entre professionnels.
- Un ou plusieurs médiateurs **référencés par la CECMC** et compétents pour le secteur ; le professionnel **adhère** au
  dispositif.
- Sur le site, « de manière visible et compréhensible », et dans les CGV et bons de commande : **nom, adresse postale et
  adresse du site** du médiateur ; à redonner après une réclamation restée sans suite.
- Gratuit pour le consommateur ; « C'est le professionnel qui en assume les coûts ».
- Amende administrative : **3 000 €** (entrepreneur individuel), **15 000 €** (société).

**Ce que SINA pourrait en faire** : demander au client le nom de son médiateur dès « l'activité » ; s'il n'en a pas, lui
expliquer en deux phrases ce que c'est, l'envoyer vers la liste officielle des médiateurs, et garder
« [À compléter : ton médiateur] » qui bloque l'ouverture tant qu'il manque.

### 5.3 L'accessibilité

| Fait | Source | Preuve |
|---|---|---|
| Exemption possible si « moins de 10 salariés avec un chiffre d'affaires annuel ou un total de bilan inférieur à 2 millions d'euros », ou modification fondamentale, ou charge excessive ; démarche en ligne pour déclarer une non-conformité ou invoquer une exemption (27 novembre 2025) ; le commerce électronique est concerné | https://entreprendre.service-public.gouv.fr/actualites/A18669 | officiel |
| Contrôles de la DGCCRF ; enquête ouverte en 2026 sur les sites et applications de commerce en ligne | https://www.economie.gouv.fr/dgccrf/actualites-dgccrf/accessibilite-un-apres-lentree-en-vigueur-de-la-directive-europeenne-bilan-de-laction-de-la-dgccrf | officiel (**résumé seulement**, page refusée à la lecture) |
| Texte : décret n° 2023-931 et arrêté du 9 octobre 2023 | fiche DGCCRF (résumé seulement) | résumé seulement |

Lecture : la plupart des clients du Studio (artisans, petites marques) sont **exemptés**. Le rapport du matin disait
« depuis le 28 juin 2025, un site réalisé par une PME doit être accessible » : c'est vrai pour une PME au-dessus du
seuil, pas pour une micro-entreprise. Le propriétaire veut pourtant des sites lisibles et des boutons jamais coupés : le
thème doit rester accessible pour tous, sans que SINA en fasse une obligation légale pour un petit client.

**Ce que SINA pourrait en faire** : demander l'effectif et le chiffre d'affaires (une question) ; au-dessus du seuil,
ajouter une page « Accessibilité » et une phrase dans les CGV ; en dessous, ne rien imposer et garder le thème
accessible quand même.

### 5.4 Le reste (rappel du matin, non relu)

Mentions légales (avec **l'hébergeur juste** : Shopify, l'hébergeur WordPress du client, ou **le Studio lui-même**
pour un site de services, avec nom, adresse et téléphone), CGV, politique de confidentialité, témoins : voir le
rapport du matin, partie 5 (pages officielles du 1er juillet et du 13 octobre 2026).

Pas vérifié : la plateforme européenne de règlement en ligne des litiges ; à ma connaissance elle a fermé en
juillet 2025 et son lien ne doit plus figurer dans les CGV, mais je ne l'ai pas relu aujourd'hui.

---

## 6. La liste de contrôle avant ouverture

### 6.1 Ce que disent les sources

| Point | Fait | Source | Preuve |
|---|---|---|---|
| Vitesse | Bons seuils : affichage du plus grand élément en moins de 2,5 s, réponse à un geste en moins de 200 ms, décalage de mise en page sous 0,1 ; mesure dans le rapport « Core Web Vitals » de Search Console ; « highly recommend » sans poids chiffré dans le classement | https://developers.google.com/search/docs/appearance/core-web-vitals | officiel |
| Une seule adresse par page | Plusieurs adresses pour un même site : **redirections permanentes côté serveur** (signal le plus fort), puis `rel="canonical"` (fort), puis plan du site (faible) ; ne jamais donner deux adresses canoniques différentes | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls | officiel |
| Entreprise locale | `LocalBusiness` : `name` et `address` (adresse physique) obligatoires ; conseillés : `telephone`, `openingHoursSpecification`, `geo` (5 décimales), `url`, `priceRange` ; prendre le sous-type le plus précis (`Plumber`, `Electrician`…, plusieurs possibles) ; avis et notes seulement pour un site qui recueille des avis **sur d'autres** entreprises | https://developers.google.com/search/docs/appearance/structured-data/local-business | officiel |
| Produit en vente | « merchant listing » : `name`, `image`, `offers` avec prix **supérieur à zéro** et devise obligatoires ; conseillés : disponibilité, état, livraison, retours, GTIN, marque ; livraison et retours peuvent être déclarés une seule fois au niveau de l'entreprise (`Organization`) | https://developers.google.com/search/docs/appearance/structured-data/merchant-listing | officiel |
| Assistants d'IA (Google) | « There are no additional requirements to appear in AI Overviews or AI Mode » ; « You don't need to create new machine readable files, AI text files, or markup » ; « no special schema.org structured data » ; il faut être indexé et pouvoir montrer un extrait | https://developers.google.com/search/docs/appearance/ai-features | officiel |
| Assistants d'IA (ChatGPT) | « OAI-SearchBot … is used to surface websites in search results in ChatGPT's search features » : l'autoriser dans `robots.txt` (effet en 24 h environ) ; `GPTBot` sert à l'entraînement, on peut le refuser sans perdre la recherche | https://developers.openai.com/api/docs/bots | officiel |
| llms.txt | Étude Ahrefs (15 juin 2026, 137 210 domaines, mai 2026) : 28 % publient un llms.txt, **97 % de ces fichiers n'ont reçu aucune requête** ; « largely decoration » pour ChatGPT, Perplexity ou Google | https://ahrefs.com/blog/llmstxt-study/ | étude publiée par un éditeur d'outils |
| Bing et les autres | IndexNow : un fichier clé `{clé}.txt` à la racine, jusqu'à 10 000 adresses par envoi ; réponses 200, 202, 403, 422, 429 ; la page ne dit pas si Google y participe | https://www.indexnow.org/documentation | officiel |
| Search Console | vérification par balise dans la page ou fichier, immédiate quand l'hébergeur est reconnu (matin) | https://support.google.com/webmasters/answer/9008080 | officiel (matin) |

**Ce qui est prouvé pour les assistants d'IA** : être bien indexé (Google, Bing), laisser passer `OAI-SearchBot`, des
textes clairs et des données structurées qui disent la même chose que la page. **Ce qui n'est pas prouvé** : llms.txt.
Il ne coûte presque rien, mais il ne faut ni le vendre au client ni le compter dans ses engagements.

### 6.2 Ce que le code fait déjà, et un trou trouvé (vérifié)

- Sites hébergés : `src/lib/sites/serve.ts` sert un `robots.txt` (`Allow: /` et le plan du site) et un `sitemap.xml`
  avec toutes les pages ; l'aperçu privé est en `noindex`. Les données `Product`, `LocalBusiness` et `Service` existent
  (`src/lib/seo-v2/doc.ts`, `theme-base/sections/main-product.liquid`).
- **Trou** : à la publication, l'adresse canonique de chaque page est **toujours le sous-domaine du Studio**
  (`publishSite` calcule `origin` avec `defaultStudioAddress`, puis `canonical_url` en dépend, `src/lib/theme/render.ts`
  ligne 906). Quand le client relie son propre domaine, le même site répond sur deux adresses, aucune redirection ne
  renvoie le sous-domaine vers son domaine, et la balise canonique désigne le sous-domaine. Selon la page de Google
  ci-dessus, c'est le sous-domaine du Studio qui risque d'être retenu dans les résultats, **pas le domaine du client**.
- Aucune balise de vérification Search Console ni Bing n'est prévue pour un site hébergé (aucune occurrence de
  `google-site-verification` ou `msvalidate` dans `src/`).
- Aucune page « Renoncer au contrat ici » dans `theme-base/` (seul un titre « [À compléter : Article 5 — Rétractation et
  retours] » dans `legal-page.liquid`).

### 6.3 La liste que SINA passe elle-même avant « on ouvre »

Chaque ligne est vérifiable par le Studio sans IA ; SINA ne dit « c'est prêt » que si tout est vert.

1. **Plateforme** : forfait Shopify autre que Starter ; WordPress 7 et WooCommerce 11 ; PrestaShop et présence du
   parent Classic.
2. **Boutique relue après l'envoi** : thème présent en brouillon, produits **publiés sur la boutique en ligne**,
   collections publiées, menus présents, pages présentes.
3. **Pages légales complètes** : mentions avec le bon hébergeur, CGV, confidentialité, témoins, **médiateur nommé**,
   **page « Renoncer au contrat ici » qui marche** (un essai réel reçoit son accusé daté) ; aucun « [À compléter] ».
4. **Adresse** : domaine et www répondent, l'un renvoie vers l'autre, le sous-domaine du Studio renvoie vers le domaine
   du client, cadenas valide, balise canonique sur le domaine du client.
5. **Moteurs** : `robots.txt` ouvert (et `OAI-SearchBot` permis), plan du site, titre et description propres à chaque
   page, données structurées sans avis ni prix inventés, Search Console vérifiée par balise posée par le Studio, plan du
   site envoyé ; IndexNow pour Bing.
6. **Vitesse sur téléphone** : photos dimensionnées, rien de bloquant en haut de page ; mesure dans le rapport de Search
   Console une fois les données disponibles.
7. **Formulaires** : un envoi d'essai arrive chez le client (contact, devis, rendez-vous, rétractation).
8. **Accessibilité** : seulement si l'entreprise dépasse 10 salariés ou 2 millions d'euros ; sinon rien d'imposé.

---

## 7. Autres points utiles

- **Changement de site** : quand le client avait déjà un site, ses anciennes adresses doivent renvoyer vers les
  nouvelles (redirection permanente, voir Google ci-dessus). Sur Shopify, les redirections relèvent du droit
  `write_online_store_navigation` (objet `UrlRedirect`, page des droits, officiel). Le Studio sait déjà lire un ancien
  site (`src/lib/engine/site-import.ts`) : il peut proposer la liste des redirections.
- **Fiche d'établissement Google** : utile pour un artisan, mais c'est le client qui la fait valider par Google ; ce
  n'est pas une validation du Studio. Non relu aujourd'hui.
- **Le Studio comme hébergeur** : pour un site de services, l'hébergeur à écrire dans les mentions est la société du
  Studio ; `src/lib/legal.ts` a encore « [À compléter : hébergeur du studio (nom, adresse, téléphone)] » et
  « [À compléter : raison sociale] » pour le Studio lui-même. Tant que ces lignes sont vides, les mentions des sites
  hébergés ne peuvent pas être complètes.

---

## Pas vérifié

- L'envoi du thème par l'application **du marchand** sans exemption (`themeCreate`, `themeFilesUpsert`) : très probable
  d'après deux pages officielles, jamais écrit pour ce cas ; un essai sur une boutique de développement le tranchera.
- L'écran exact où le Dev Dashboard montre « Client ID » et « Client secret », et tous les libellés français de
  l'administration Shopify.
- La publication des produits créés par `productSet` (forum seulement) ; les valeurs exactes du type de politique de
  `shopPolicyUpdate` (mentions légales, conditions de vente).
- Les plafonds exacts d'o2switch, OVHcloud et IONOS ; Hostinger lu en résumé seulement.
- Ce que fait WordPress 7.1 d'un thème « Tested up to: 6.6 » envoyé à la main.
- La présence du thème Classic dans `/themes` sur une installation neuve de PrestaShop 9.1.
- L'ordonnance n° 2026-2 et le décret n° 2026-3 (Légifrance non lu ; seulement des articles de cabinets).
- La fermeture de la plateforme européenne de règlement des litiges en ligne.
- Les modules Caddy des hébergeurs DNS (OVHcloud, Gandi, IONOS) un par un ; la vérification DNS persistante
  (« DNS-PERSIST-01 ») de Let's Encrypt, annoncée pour 2026, non trouvée sur la page des nouveautés.
- Les captures d'écran des cinq éditeurs de zone DNS.
- Une fonction de rétractation intégrée à WooCommerce ou PrestaShop.

## Ce qui contredirait une règle du propriétaire (signalé, non recommandé)

- Une application Shopify **publique** du Studio pour tous les clients : relecture par Shopify, jetons qui expirent,
  et probablement une exemption pour le thème : validation longue, à écarter.
- La « Public Suffix List » pour le domaine des sites du Studio : acceptation extérieure avec délai.
- Les applications payantes de bouton de rétractation pour Shopify : un fournisseur payant pour le client ; inutile si
  le thème de SINA porte la fonction.

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Relier Shopify par l'application du client** (Client ID et Client secret, jeton redemandé avant chaque envoi,
   droits reçus comparés aux droits attendus). *Le client voit* : un guide de douze écrans en français et, en un clic,
   « Ta boutique est reliée : je peux installer ton thème, tes produits, tes pages et tes menus ».
2. **Un essai gratuit sur une boutique de développement** pour trancher `themeCreate` et `themeFilesUpsert` avec cette
   application, avant tout client. *Le client voit* : rien ; le propriétaire voit le compte rendu et les captures.
3. **Passer l'interface Shopify en 2026-10** et prévenir quand l'en-tête de version diffère. *Le client voit* : aucun
   envoi qui casse sans prévenir.
4. **Publier ce qui est créé** (`publishablePublish` pour produits et collections) **et créer les menus**
   (`menuCreate`) **et les pages légales de Shopify** (`shopPolicyUpdate`), puis relire la boutique. *Le client voit* :
   « J'ai vérifié dans ta boutique : 6 produits visibles, 2 collections, le menu du haut et du bas, 5 pages ».
5. **Demander le forfait et la version de la plateforme avant de monter le site** (Starter refusé, WordPress 7,
   PrestaShop 9.1 et son thème parent). *Le client voit* : une phrase claire avant tout travail, jamais un échec à la fin.
6. **La page « Renoncer au contrat ici »** dans le thème unique, pour les trois plateformes et les sites hébergés, avec
   confirmation et accusé daté. *Le client voit* : sa boutique conforme depuis le premier jour, et la page dans son pied
   de page.
7. **Le médiateur et l'hébergeur justes dans les mentions**, bloquants tant qu'ils manquent (et remplir enfin
   l'identité du Studio dans `src/lib/legal.ts`). *Le client voit* : une question simple, un lien vers la liste
   officielle, et des mentions sans trou.
8. **Une seule adresse pour le site hébergé** : quand le client relie son domaine, canonique sur son domaine et
   redirection permanente du sous-domaine du Studio et de la variante www. *Le client voit* : Google qui affiche son nom
   de domaine, pas celui du Studio.
9. **Le certificat joker des sous-domaines du Studio** (Caddy construit avec le module DNS de l'hébergeur du Studio) et
   la configuration Caddy écrite dans le dépôt. *Le client voit* : son site en ligne en quelques secondes, avec le cadenas.
10. **SINA vérifie le domaine du client toute seule** (preuve, pointage, CAA, DNSSEC, cadenas) et explique chaque
    erreur avec les mots de son hébergeur. *Le client voit* : « Tes deux lignes sont bonnes, le cadenas est là ».
11. **Search Console, Bing et IndexNow posés par le Studio** sur les sites hébergés, `OAI-SearchBot` permis, et pas de
    promesse sur llms.txt. *Le client voit* : « Google et Bing connaissent ton site » et, plus tard, ses premières
    recherches dans le point du mois.
12. **La liste de contrôle avant ouverture (6.3) passée par SINA**, avec un essai réel de chaque formulaire. *Le client
    voit* : une liste verte, et le bouton « On ouvre » seulement quand tout est vert.
