# Le suivi dans la durée : comment SINA tient ses dix-sept engagements sans attendre aucune plateforme

Recherche faite le 22 novembre 2026, sur Internet, pages lues une à une. Aucun appel payant à une IA.

Point de départ : la partie 14 de `LE-STUDIO-DE-A-A-Z.md` (les dix-sept engagements, « ça doit vraiment faire ce que tu
as dit »), le rapport 6 partie 5 et le rapport 3 partie 4 du fichier `.deja-lu-21-novembre.md`. Je ne répète pas ce
qui y est déjà (le travail montré de Buell et Norton, les 53 % / 12 % / 35 % de l'étude de 2025 sur l'assistant qui
prend les devants, le retrait de « Pulse » d'OpenAI) ; je n'ajoute que du nouveau ou la façon de le faire.

**Niveaux de preuve** : **officiel** (texte de loi, page de l'autorité ou du fournisseur sur son propre produit),
**solide** (étude publiée, grand sondage décrit), **moyen** (sondage d'un éditeur, chiffres annoncés par l'entreprise
sur elle-même), **faible** (blog, comparatif, forum).

**Limite de cette recherche** : la recherche sur Internet s'est arrêtée en cours de route (plafond de recherches atteint).
Ce qui manque est listé à la fin, partie 8.

---

## 0. Trois nouvelles qui changent le plan

1. **Shopify : la « clé créée dans sa boutique » n'existe plus.** La page officielle dit : « You can no longer create new
   admin-created custom apps. » Il faut désormais passer par le « Dev Dashboard ». Le marchand y crée une application,
   copie deux codes (identifiant et secret), et le Studio les échange contre une clé d'accès **valable 24 heures**, à
   renouveler seul. Cela ne marche que pour une boutique de la même organisation que l'application. Un employé de
   Shopify écrit le 16 janvier 2026 : l'ancienne façon est « fully deprecated with no direct replacement that gives you
   an immediately-available permanent token », et la voie par autorisation demande « no app review required ».
   - Sources (officiel) : https://shopify.dev/docs/apps/build/authentication-authorization/legacy/admin-custom-apps et
     https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens
   - Source (faible, forum officiel de Shopify) :
     https://community.shopify.dev/t/is-it-still-possible-to-create-a-custom-app-for-a-single-store-admin-storefront-access-without-partner-dashboard-cli/28387
   - Le Studio sait déjà relier une boutique par autorisation du marchand (`src/lib/integrations/shopify.ts`).
     **Ce que SINA pourrait en faire** : garder cette voie pour lire les commandes, et réécrire l'engagement 10 sans
     les mots « sa propre clé créée dans sa boutique ».
2. **La fiche Google ne se branche pas sans attente.** Pour lire ou écrire une fiche par programme, il faut remplir un
   formulaire et attendre l'accord de Google. Conditions : une fiche « verified and active for 60+ days » et un site
   affiché sur la fiche. Le délai annoncé est « jusqu'à 2 semaines » selon le formulaire (je n'ai lu ce délai que dans
   un résumé). L'engagement 4 tombe donc sous la règle « aucune attente de plusieurs semaines ».
   - Source (officiel) : https://developers.google.com/my-business/content/prereqs
3. **Depuis le 2 août 2026, l'assistante du site doit dire qu'elle est une IA.** L'article 50 du règlement européen
   sur l'IA impose que le visiteur soit « informed that they are interacting with an AI system », « at the latest at the
   time of the first interaction ». Le report voté en 2026 (« omnibus ») n'a pas touché cette règle. Amende possible :
   jusqu'à 15 millions d'euros ou 3 % du chiffre d'affaires mondial.
   - Source (officiel, texte de l'article) : https://artificialintelligenceact.eu/article/50/
   - Source (moyen, cabinet d'avocats) :
     https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force

---

## 1. Chaque engagement : comment le faire vraiment, sans validation longue

| N° | Engagement | Comment le faire sans attendre personne | Limite réelle | Preuve |
|---|---|---|---|---|
| 1 | Le point du mois | Chiffres que le Studio **mesure lui-même** : visites du site, demandes reçues par l'assistante et le formulaire, devis, carnet de clients, ventes de la boutique reliée. Pour Google et les réseaux : le client **télécharge lui-même** son relevé (voir 1.2) et le donne à SINA en une photo d'écran ou un fichier. | Sans relevé envoyé, les chiffres Google et réseaux sont écrits « non disponible : relevé non envoyé ». | officiel |
| 2 | « Envoie une photo, SINA fait le reste » | Mise en ligne sur le site : par le Studio (site qu'il monte). Publication sur les réseaux : partage d'un geste depuis le téléphone (1.5). | Le partage d'une image depuis une page n'existe pas dans Firefox ; il faut alors un bouton « enregistrer l'image ». | officiel |
| 3 | Grands moments de l'année | Calendrier tenu par SINA, aucune plateforme. | Les événements locaux doivent être vérifiés (lien vers la source montré au client). | — |
| 4 | Fiche Google et avis | **Tenue à la main avec guide** : SINA prépare la réponse à chaque avis, les textes de la fiche et les publications ; le client colle d'un geste. SINA ne lit pas les avis seule : le client les colle, ou envoie une capture. | Pas d'alerte « avis négatif le jour même » sans branchement. Remplacement honnête : le client reçoit déjà un e-mail de Google à chaque avis ; il le transfère à SINA. **À vérifier** : que Google envoie bien cet e-mail à chaque avis (je ne l'ai pas lu sur une page officielle). | officiel pour le branchement |
| 5 | Le site qui s'améliore | Le Studio relit le site qu'il a monté et ses propres chiffres de visite. | Sur une boutique Shopify, les chiffres de Shopify lui-même : non vérifié (recherche arrêtée). | — |
| 6 | « Ta journée est prête » | Tout vient du Studio : publication du jour, demandes de la veille, idée du jour. | Un seul message par jour (voir partie 2). | moyen |
| 7 | La boîte des demandes | Assistante sur le site, construite par le Studio (partie 4). Réponse envoyée d'un geste par e-mail ou SMS depuis son téléphone (1.5). | Elle doit se présenter comme une IA (article 50). | officiel |
| 8 | Studio photo de poche | Aucune plateforme. | — | — |
| 9 | Ses devis | Fait par le Studio, avec les mentions obligatoires (partie 5). | Le devis n'est pas une facture : la facture électronique obligatoire ne le touche pas directement (partie 5). | officiel |
| 10 | Ses vrais chiffres de vente | Shopify : autorisation du marchand (voie déjà dans le Studio) ou codes du « Dev Dashboard ». WooCommerce : clé en **lecture seule** créée par le client dans WooCommerce > Réglages > Avancé > REST API. | Shopify : commandes de plus de 60 jours réservées à une autorisation spéciale accordée par Shopify (`read_all_orders`) ; donc « depuis 60 jours » seulement, ou demande à faire. WooCommerce : le secret n'est montré qu'une fois. | officiel |
| 11 | Carnet de clients | Tenu par le Studio. Règles de la CNIL (partie 6). | Ne relancer que ceux qui ont accepté, ou les vrais clients pour des produits semblables. | officiel |
| 12 | Les avis qui arrivent tout seuls | **Lien de demande d'avis Google** : le client le copie une fois depuis sa fiche (« Lire les avis » puis « Obtenir plus d'avis ») et le colle dans le Studio. | Le code à scanner ne se crée que sur ordinateur. Interdit : offrir quoi que ce soit, ou ne demander qu'aux clients contents (1.3). | officiel |
| 13 | Nouvelles façons de gagner de l'argent | Installé par le Studio sur le site qu'il monte. | Sur Shopify ou WooCommerce, ce que la plateforme permet seulement. | — |
| 14 | Code à scanner et affiches | Le Studio crée le code lui-même (aucun service). Pour l'avis Google, il reprend le lien collé par le client. | — | — |
| 15 | Objectif du mois | Chiffres mesurés par le Studio (demandes, ventes reliées). | Un objectif en « appels reçus » ne se mesure pas sans numéro suivi : à éviter, ou le client note lui-même. | — |
| 16 | Ce que ses clients demandent | Relecture des demandes, devis et avis collés. | Avis Google : seulement ceux que le client a collés. | — |
| 17 | Bras droit au quotidien | Pour le droit, citer les pages officielles lues (celles de ce rapport). | — | — |

### 1.1 Les visites du site, mesurées par le Studio, sans bandeau de cookies

- **Ce que dit la CNIL** (officiel) : un outil de mesure de visites peut se passer du consentement s'il sert « pour le
  compte exclusif de l'éditeur », ne produit que des statistiques anonymes, ne croise pas les données avec d'autres
  fichiers et ne suit pas une personne d'un site à l'autre. Elle recommande en plus : informer dans la politique de
  confidentialité, une durée de vie du traceur de 13 mois au plus, 25 mois de conservation au plus. Pour un prestataire
  qui sert plusieurs sites : données « collectées, traitées et stockées séparément pour chaque éditeur ». Depuis le
  4 juillet 2025, il n'y a plus de « solution validée par la CNIL » : chaque fournisseur s'évalue lui-même avec une grille
  de la CNIL et ne peut pas se dire « certifié ».
  https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience
- **Matomo, réglé pour la CNIL** (officiel, page du fournisseur) : adresse du visiteur masquée sur 3 octets,
  traceur limité à 13 mois, aucun identifiant d'utilisateur, conservation des données brutes de 744 jours (25 mois au
  plus). Deux points restent à régler à la main : le suivi des achats, à couper ou restreindre, et une page où le
  visiteur peut refuser d'être compté, obligatoire.
  https://matomo.org/faq/how-do-i-configure-matomo-without-tracking-consent-for-french-visitors-cnil-exemption/
- **Ce que SINA pourrait en faire** : le Studio compte lui-même les visites des sites qu'il monte. Le compte se fait
  soit avec un Matomo installé chez lui et réglé ainsi, soit par un compteur maison sans aucun traceur, avec un
  rangement séparé par client. Il ajoute la phrase d'information et le lien de refus dans les mentions du site, et il
  écrit « visites comptées sans suivre personne » dans le point du mois.
- **Mon avis (non vérifié auprès de la CNIL)** : un compteur côté serveur qui ne dépose rien sur le téléphone du
  visiteur n'entre pas dans la règle des cookies. Il reste soumis au RGPD (adresse du visiteur). Il faut donc la même
  prudence : adresse tronquée, statistiques seulement.

### 1.2 Les chiffres de Google et des réseaux, sans branchement : le relevé téléchargé par le client

- **Fiche Google** (officiel) : le propriétaire ou un gestionnaire peut télécharger ses chiffres en tableur (« Download
  Report »), pour une période choisie. https://support.google.com/business/answer/9918094?hl=en
- **Meta** (faible pour la marche à suivre ; aide officielle pour Instagram) : Meta Business Suite propose « Exporter
  les données » en tableur, par publication (portée, vues, réactions). L'aide officielle d'Instagram réserve l'export
  par publication depuis l'application à l'offre payante « Meta One ».
  https://www.meta.com/help/subscriptions/882345181477896/ et
  https://uada.edu/employees/communications/social-media/getting-started/meta-analytics.aspx
- **Ce que SINA pourrait en faire** : le dernier jour du mois, la carte « envoie-moi ton relevé Google et tes chiffres
  Instagram », avec deux captures d'écran du chemin. SINA lit le fichier ou la capture et cite le chiffre exact. Sans
  envoi, elle écrit « non disponible ».

### 1.3 Les avis : lien officiel, règles de Google, droit français

- **Le lien et le code à scanner** (officiel) : business.google.com, « Read Reviews », puis « Get more reviews ». Le
  lien se copie ; le code à scanner « can only be generated on a computer browser, not on mobile devices ». On peut
  aussi envoyer la demande par e-mail, WhatsApp ou publication.
  https://support.google.com/business/answer/16816815?hl=en
- **Interdits de Google** (officiel) : offrir « payment, discounts, free goods and/or services » contre un avis. Il est
  aussi interdit de « Discourage or prohibit negative reviews, or selectively solicit positive reviews from
  customers ». Donc aucun tri du type « content : Google ; pas content : formulaire privé ».
  https://support.google.com/contributionpolicy/answer/7400114
- **Ce que veulent les clients** (solide, sondage BrightLocal 2026, 1 002 adultes américains) : 97 % lisent les avis
  avant de choisir un commerce local ; 89 % attendent que le patron réponde ; 80 % préfèrent une entreprise qui répond
  à tous ; **50 % sont rebutés par une réponse toute faite** ; 19 % attendent une réponse le jour même et 81 % dans la
  semaine ; 74 % regardent les avis des trois derniers mois. Côté demande : 78 % ont été sollicités dans l'année et
  28 % disent écrire « toujours » un avis quand on le leur demande. L'usage des outils d'IA pour lire les avis passe de
  6 % à 45 %. https://www.brightlocal.com/research/local-consumer-review-survey/
- **Droit français** (officiel, mais lu dans des résumés) : quiconque affiche des avis de consommateurs doit dire
  comment ils sont contrôlés (article L111-7-2 du Code de la consommation). Les faux avis relèvent des pratiques
  commerciales trompeuses. Je n'ai pas pu ouvrir la page de la DGCCRF (accès refusé).
  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049571119
- **Ce que SINA pourrait en faire** :
  - demander l'avis à **tous** les clients d'une vente ou d'un chantier fini, jamais seulement aux contents ;
  - écrire une réponse **propre à chaque avis**, en reprenant un détail de l'avis lui-même ;
  - viser une réponse dans la semaine ;
  - si le site du client affiche des avis, ajouter la phrase obligatoire sur leur contrôle.

### 1.4 Une fiche Google tenue à la main, et ce que Google fait lui-même

- **Donner l'accès** (officiel) : le propriétaire invite une adresse e-mail comme « gestionnaire ». Un gestionnaire a
  presque tous les droits, sauf ajouter ou retirer des personnes. https://support.google.com/business/answer/3403100
  - Cela ne branche rien : c'est un accès pour une personne, pas pour un programme.
- **Gemini et la fiche Google** (officiel) : depuis juin 2026, le propriétaire peut relier sa fiche à l'application
  Gemini. Gemini peut alors rédiger des réponses aux avis, créer et programmer des publications, résumer les avis et lire
  les chiffres. Conditions : être propriétaire ou gestionnaire d'**une seule** fiche, compte personnel, 18 ans ou plus.
  Disponibilité en France : la page dit « wherever the Gemini web app is supported » ; un article affirme que l'Europe
  est exclue, et je n'ai pas pu trancher. https://support.google.com/gemini/answer/17142585
- **Ce que SINA pourrait en faire** : un guide en trois captures, « colle ici, clique là », pour chaque geste sur la
  fiche (horaires, photo, publication, réponse). Elle dit au client, honnêtement, qu'elle ne voit pas sa fiche
  elle-même tant que le branchement n'est pas mis en place.

### 1.5 Envoyer d'un geste depuis le téléphone du client

- **SMS** (officiel, norme RFC 5724) : un lien `sms:numéro?body=texte` ouvre l'application de messages avec le texte
  déjà écrit. Le comportement varie selon les versions de l'iPhone et d'Android, d'après des témoignages anciens : il
  faut l'essayer sur de vrais téléphones. https://www.rfc-editor.org/rfc/rfc5724
- **WhatsApp** (officiel) : `https://wa.me/<numéro>?text=<texte>` ouvre la conversation avec le texte prêt. Rien ne
  part sans que le client appuie. https://whatsapp.com/faq/en/general/26000030
- **Partage d'une image** (officiel) : le partage d'une page vers les applications du téléphone accepte des fichiers
  sur Safari depuis iOS 14 et sur Chrome. Il n'existe pas dans Firefox. Prévoir toujours « enregistrer l'image ».
  https://web.dev/articles/web-share et https://caniuse.com/mdn-api_navigator_share_data_files_parameter
- **Ce que SINA pourrait en faire** : chaque réponse prête porte trois boutons, « par SMS », « par WhatsApp » et « par
  e-mail », qui ouvrent l'application du client avec le texte déjà écrit. Le Studio n'envoie rien lui-même, donc il n'a
  besoin d'aucun fournisseur d'envoi payant.

---

## 2. Ce qui fait qu'un client de petite entreprise reste ou part

1. **Les petites entreprises partent beaucoup, et vite.** Les chiffres qui circulent pour les logiciels vendus aux
   petites entreprises tournent autour de 3 à 7 % de départs par mois, soit 30 à 58 % par an. Ces chiffres se recopient
   d'un blog à l'autre (faible). https://www.venasolutions.com/blog/saas-churn-rate
   - **Ce que SINA pourrait en faire** : prévoir un premier résultat visible dès la première semaine, pas seulement au
     premier point du mois.
2. **Une part des départs vient d'un paiement raté, pas d'un mécontentement.** Recurly estime que 20 à 40 % des départs
   sont des paiements échoués (moyen, éditeur). https://recurly.com/research/churn-rate-benchmarks
   - **Ce que SINA pourrait en faire** : avant le lot des forfaits, prévoir le message de carte expirée et une nouvelle
     tentative de paiement ; c'est le départ le plus facile à éviter.
3. **Le regret d'achat des petites entreprises vient du coût plus élevé que prévu et d'une mise en route ratée.**
   Sondage Capterra 2025, environ 3 500 acheteurs (moyen) : chez les petites entreprises, le coût total plus élevé que
   prévu est la première cause de regret. 89 % de ceux qui regrettent ont vécu une mise en route difficile.
   https://www.capterra.com/resources/tech-trends-smb-enterprise-software-purchase-tips/ et
   https://www.capterra.com/resources/software-buying-trends-2026/
   - **Ce que SINA pourrait en faire** : aucun coût surprise (ce qui demande un module payant est dit avant) ; mise en
     route menée par SINA, pas par le client.
4. **Montrer le travail, nouvelle preuve.** Buell, Kim et Tsay (Management Science, 2017, deux expériences sur le
   terrain et deux en laboratoire) mesurent l'effet de laisser voir le travail en cuisine : qualité ressentie en hausse
   de 17 à 22 % selon la version de l'étude (solide).
   https://ideas.repec.org/a/inm/ormnsc/v63y2017i6p1673-1695.html
   - **Ce que SINA pourrait en faire** : le point du mois s'ouvre sur « ce que j'ai fait pour toi ce mois-ci » (nombre
     d'images faites, refusées et refaites, demandes traitées la nuit), puis donne les résultats.
5. **Les clients d'agence partent quand ils ne comprennent plus ce qui se passe, pas seulement sur les résultats.** Des
   éditeurs d'outils de rapports (faible, avis intéressés) disent tous la même chose :
   - un rapport qui empile l'activité ne sert à rien ;
   - le client veut ses demandes et ses ventes ;
   - un résumé de trois lignes en tête ;
   - dire aussi les mauvaises nouvelles.
   https://agencyanalytics.com/blog/client-reporting et https://www.swydo.com/blog/under-reporting/
   - **Ce que SINA pourrait en faire** : trois lignes en tête du point du mois (demandes, ventes, ce qui a marché). Un
     mois faible est dit faible, avec sa raison.
6. **Trop de messages font couper les messages.** Localytics (2017, 1 000 utilisateurs, moyen) : 10 % coupent les
   alertes d'une application à une alerte par semaine ; 37 % de 2 à 5 par semaine. Airship (9 143 personnes, moyen) :
   51 % se sont déjà désabonnés d'une marque pour des messages trop fréquents, 40 % parce qu'ils n'étaient pas
   pertinents. https://www.marketingprofs.com/charts/2018/33486/how-many-mobile-push-notifications-are-too-many et
   https://www.braze.com/resources/articles/opt-out-of-push-notifications-why-users-do-it
   - **Ce que SINA pourrait en faire** : « ta journée est prête » se lit dans le Studio. Une alerte sur le téléphone, au
     plus une par jour, seulement pour une urgence ou un avis négatif. Le client règle lui-même la fréquence.

---

## 3. Les assistants qui prennent les devants : ce qu'ils font, ce qu'ils publient

| Produit | Ce qu'il propose de lui-même | Chiffres publiés | Preuve |
|---|---|---|---|
| **Shopify Sidekick Pulse** (hiver 2026) | Étudie la boutique et propose des actions sur la page d'accueil ; « will notify you when it sees something worthwhile ». S'appuie sur la boutique et sur des signaux de tout Shopify. | Aucun chiffre d'usage publié pour Pulse. | officiel https://www.shopify.com/news/winter-26-edition-renaissance |
| **Square AI** | Répond aux questions sur les ventes, clients, employés ; depuis octobre 2025, ajoute la météo, les événements et les avis du quartier ; graphiques épinglés. | « Tens of thousands » de vendeurs en deux mois ; 60 % des questions portent sur la marche de l'affaire, pas sur l'aide du logiciel ; près de 200 000 questions. Un cafetier a vérifié une idée (retirer des plats) avant d'agir et l'a abandonnée. | moyen (communiqués) https://squareup.com/us/en/press/square-ai-beta-insights et https://squareup.com/us/en/press/square-releases-ai |
| **Intuit Assist (QuickBooks)** | Prépare des relances de factures impayées et les range dans un fil que le patron relit et modifie avant envoi. | « 5 jours plus tôt » payé en moyenne ; jusqu'à 12 heures gagnées par mois. Chiffres de l'entreprise, non contrôlés. | moyen https://quickbooks.intuit.com/r/news/virtual-team-of-ai-agents/ |
| **HubSpot Breeze** (agent clients) | Répond aux clients et se fait payer au résultat : 0,50 dollar par conversation résolue. | 65 %, puis 70 %, puis 72 % de conversations résolues sans humain (annoncé par HubSpot). | moyen https://www.cxtoday.com/crm/hubspot-ai-agents-customer-agent-data-agent-cx-results/ |
| **Lightspeed AI** (janvier 2026) | Questions sur les ventes en boutique et en restaurant ; depuis juillet 2026, idées montrées à l'ouverture du logiciel ; depuis octobre 2026, un agent qui prépare des tâches et fait **approuver chaque changement**. | Aucun chiffre trouvé. | moyen https://www.lightspeedhq.com/news/lightspeed-ai-expands-from-insights-to-action-with-new-agentic-capabilities-for-retail/ |
| **Google (fiche + Gemini)** | Réponses aux avis, publications programmées, résumé des avis (1.4). | — | officiel |
| **Wix** | Assistante de site 24 h sur 24 ou aux heures choisies, formulaire hors ligne ; remplacée en mars 2026 par « Smart Chat ». Wix avertit qu'elle « may generate and present inaccurate or misleading information » et décline toute responsabilité. | — | officiel https://support.wix.com/en/article/the-wix-ai-chat-assistant |
| **Durable** | Site, petit carnet de clients, factures, demandes d'avis automatiques. | Avis jugés « basiques » ; prix vus seulement chez des tiers. | faible https://www.techradar.com/pro/software-services/durable |

**Ce qui revient partout** :

- les idées sont montrées quand le patron ouvre son outil (Shopify, Lightspeed), pas envoyées en rafale ;
- chaque changement est approuvé (Lightspeed, Intuit) ;
- l'outil sert surtout à **vérifier une idée avant d'agir** (Square) ;
- le paiement au résultat arrive (HubSpot).

**Ce que je n'ai trouvé nulle part** : un chiffre publié sur le taux d'acceptation des propositions faites de soi-même.

**Ce que SINA pourrait en faire** :

- ranger ses propositions dans « ta journée est prête », chacune avec sa raison et un bouton « accepter » ou « pas
  ça » ;
- ajouter un bouton « vérifie mon idée » : le client dit ce qu'il veut faire, SINA regarde ses vrais chiffres avant
  qu'il décide.

---

## 4. L'assistante du site, jour et nuit

1. **L'entreprise répond de ce que dit son assistante.** Affaire Moffatt contre Air Canada (tribunal de
   Colombie-Britannique, 14 février 2024). L'assistante avait promis un remboursement que le règlement refusait. Le
   tribunal a rejeté l'idée que l'assistante serait « une entité juridique séparée ». Air Canada est responsable de
   toute l'information de son site ; elle a dû payer 812 dollars canadiens (solide, décision ; lue dans des articles
   de presse, la décision elle-même n'a pas pu être ouverte).
   https://www.cbsnews.com/news/aircanada-chatbot-discount-customer
   - **Ce que SINA pourrait en faire** : l'assistante ne répond qu'avec la fiche vérifiée du client (prix, horaires,
     zone, délais). Sur un prix, un remboursement, une garantie ou un délai qui n'y figure pas, elle dit « je transmets
     ta question à [nom], il te répond » et ne promet rien.
2. **Elle doit se présenter comme une IA** dès le premier message (article 50, en vigueur depuis le 2 août 2026,
   officiel). Exemple de phrase : « Je suis l'assistante de [marque], une intelligence artificielle. Je transmets à
   [prénom] tout ce que je ne sais pas. »
3. **CNIL, conseils pour une assistante de site** (officiel, page du 19 février 2021) :
   - **Le cookie** : soit déposé seulement quand le visiteur ouvre l'assistante (alors sans consentement), soit déposé
     avant, et il faut alors le consentement.
   - **Les données sensibles** : afficher « une mise en garde invitant les personnes à s'abstenir de communiquer des
     données sensibles ».
   - **La conservation** : garder la conversation le temps nécessaire seulement.
   - **Les décisions** : aucune décision importante ne doit sortir de la seule conversation.
   https://cnil.fr/fr/chatbots-les-conseils-de-la-cnil-pour-respecter-les-droits-des-personnes
   - La CNIL rappelle aussi que ces assistantes « peuvent se tromper » et conseille une supervision humaine.
     https://cnil.fr/fr/intelligence-artificielle/lintelligence-artificielle-qui-parle-les-agents-conversationnels
   - **Ce que SINA pourrait en faire** : l'assistante ne s'ouvre qu'au clic, donc pas de bandeau. Elle affiche une ligne
     de mise en garde. Les conversations sans suite sont effacées après une durée courte, que le Studio fixe et écrit
     dans les mentions du site.
4. **Ce qui marche pour trier les demandes** (faible, éditeurs) :
   - répondre tout de suite ;
   - demander peu (nom, téléphone, lieu, type de demande, urgence) ;
   - préparer la réponse pour les heures d'ouverture plutôt que d'écrire au patron en pleine nuit.

   Les chiffres qui circulent (« 35 à 50 % des demandes hors des heures d'ouverture », « 7 fois plus de chances en
   répondant dans l'heure ») n'ont pas pu être remontés à leur source.
5. **Coût** : je n'ai trouvé aucun prix public comparable, à part HubSpot (0,50 dollar par conversation résolue).
   [À compléter : mesurer dans le Studio d'essai le coût d'une conversation type, sans appel payant non accordé.]

---

## 5. Les devis d'artisans

1. **Mentions obligatoires, travaux et dépannage** (officiel, page de l'État vérifiée le 9 septembre 2022) :
   - date ;
   - nom et adresse de l'entreprise ;
   - nom du client ;
   - lieu de l'opération ;
   - nature exacte des travaux ;
   - « décompte détaillé, en quantité et en prix, de chaque prestation et produits » ;
   - taux horaire de main-d'œuvre ;
   - manière de compter le temps ;
   - frais de déplacement ;
   - total hors taxes et toutes taxes, avec le taux de TVA ;
   - durée de validité ;
   - devis gratuit ou payant, et son coût s'il est payant.

   Le devis est obligatoire pour le bâtiment, le dépannage, le déménagement et d'autres métiers. Sanction en l'absence
   de devis : jusqu'à 3 000 € pour un entrepreneur individuel et 15 000 € pour une société.
   https://entreprendre.service-public.gouv.fr/vosdroits/F31144
2. **Mentions sur les déchets, bâtiment et jardinage** (officiel, décret n° 2020-1817, en vigueur depuis le
   1er juillet 2021, lu dans des résumés de la CAPEB et de la FFB) : estimation de la quantité de déchets, et lieu où ils
   seront déposés. https://aida.ineris.fr/reglementation/decret-ndeg-2020-1817-291220-portant-informations-devis-relatives-a-lenlevement
3. **Assurance décennale, numéro au Répertoire des métiers, « EI » pour un entrepreneur individuel** : cités par les
   éditeurs de logiciels de devis (faible pour la liste exacte).
   - Le code de l'artisanat est cité par la page de l'État : cela confirme que le métier ajoute des obligations, sans
     les détailler sur cette page.
   - Source éditeur : https://www.obat.fr/blog/mentions-obligatoires-devis
4. **Facture électronique** (officiel) : toutes les entreprises doivent pouvoir **recevoir** des factures électroniques
   depuis le 1er septembre 2026 ; les PME et micro-entreprises devront **en émettre** à partir du 1er septembre 2027.
   La page ne parle pas des devis.
   https://www.impots.gouv.fr/professionnel/questions/partir-de-quand-suis-je-concerne
   - **Ce que SINA pourrait en faire** : faire le devis, suivre la signature et préparer la relance, mais ne pas faire
     les factures. Elle dit au client que la facture passe par une plateforme agréée, et le transfert du devis vers son
     logiciel de facturation doit rester simple.
5. **Ce que font les logiciels** :

| Logiciel | Ce qu'il fait | Prix vu | Preuve |
|---|---|---|---|
| Obat | Devis dicté ou écrit, chiffré par l'IA « avec vos prix ou 30 000 ouvrages », modifiable avant envoi, puis envoyé en signature. | Dès 25 € HT par mois (comparatif écrit par Obat). | officiel (produit) https://www.obat.fr/devis-factures/devis-vocal-ia/ |
| Tolteck | Devis et factures par ouvrage, bibliothèques de prix (dont Batiprix), hors ligne. | 25 € HT par mois, ou 19 € HT à l'année. | faible https://www.blogdumoderateur.com/tools/tolteck/ |
| Batappli | Devis et factures du bâtiment, bibliothèque d'ouvrages, application de chantier. | Non trouvé de façon fiable. | faible https://www.lafabriquedunet.fr/logiciel/batappli |
| Henrri | Devis et factures sans limite dans l'offre gratuite ; relances. | Gratuit, puis offres payantes (prix contradictoires). | faible https://www.indy.fr/guide/facturation/logiciel/comparatif-logiciel-facturation/indy-vs-henrri/ |
| Axonaut | Envoi du devis par e-mail et relances programmées jusqu'à la signature ; relances d'impayés en trois niveaux. | De 25 à 70 € par mois selon l'engagement (sources contradictoires). | faible https://www.blogdumoderateur.com/axonaut-solution-crm-factures-depenses/ |

   - **Ce que SINA pourrait en faire** : ce qui est déjà courant, c'est la dictée, la bibliothèque de prix du client et
     les relances. Ce que SINA peut faire de plus :
     - refuser de deviner un prix (Obat propose une base de 30 000 ouvrages ; SINA demande) ;
     - contrôler les mentions obligatoires selon le métier avant de montrer le devis ;
     - écrire la relance dans la voix du client.

---

## 6. Le carnet de clients et les relances

1. **Particuliers : consentement d'abord** (officiel). Une prospection par e-mail ou SMS demande un consentement
   « libre, spécifique, éclairé et univoque » ; une case pré-cochée et l'acceptation des conditions générales ne
   suffisent pas. **Exception** : un vrai client, pour des « produits ou services similaires fournis par la même
   entreprise ». Elle ne vaut pas sans vente ou prestation réelle : un compte créé ne suffit pas. Chaque message dit qui
   l'envoie et permet de refuser « par un moyen simple ». Entre professionnels : droit de s'opposer, si l'offre touche
   au métier de la personne.
   https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel
2. **Durées** (officiel, référentiel de la CNIL, texte lu dans le document) :
   - un client peut être relancé pendant la relation, puis « pour une durée de trois ans à compter de la fin de la
     relation commerciale » (achat, fin de garantie, fin de contrat, dernier contact) ;
   - un prospect, trois ans après la collecte ou son dernier contact. La simple ouverture d'un e-mail ne compte pas.
     Après trois ans, on lui demande s'il veut continuer ; sans « oui » clair, on efface.
   https://Cnil.fr/sites/cnil/files/atoms/files/referentiel_traitements-donnees-caractere-personnel_gestion-activites-commerciales.pdf
3. **Une demande d'avis** est-elle de la prospection ? Je n'ai pas trouvé de réponse de la CNIL. Par prudence :
   l'envoyer seulement à un vrai client, une seule fois, avec la possibilité de refuser.
4. **Ce que SINA pourrait en faire** : chaque fiche du carnet porte trois choses : d'où vient la personne (achat, devis
   signé, simple question), son accord écrit avec la date, et la date de fin des trois ans. SINA ne propose de relance
   qu'aux vrais clients, pour des produits semblables, ou à ceux qui ont dit oui. Chaque message finit par « réponds
   STOP pour ne plus recevoir de message ». À trois ans, elle propose d'effacer ou de redemander.

---

## 7. Autres choses utiles

1. **Les clients lisent de plus en plus les avis par l'IA** : 45 % utilisent des outils comme ChatGPT pour lire les
   avis, contre 6 % un an plus tôt (BrightLocal 2026, solide). Une fiche Google complète et des réponses précises
   servent aussi à être bien décrit par ces outils.
2. **L'outil le plus apprécié chez Square sert à vérifier une idée avant d'agir.** C'est un usage simple à offrir dans
   le « bras droit ».
3. **Facture électronique** : le client artisan reçoit déjà des factures électroniques depuis le 1er septembre 2026.
   SINA peut le lui rappeler une fois, avec la page officielle, sans en faire un service.

---

## 8. Ce que je n'ai pas pu vérifier

- Le délai exact de Google pour l'accès à la fiche par programme : le « 14 jours » ou « 2 semaines » n'a été lu que dans
  des résumés. La page lue ne donne pas de délai.
- Que Google envoie un e-mail au propriétaire à chaque nouvel avis.
- La disponibilité de Gemini avec la fiche Google en France.
- Les chiffres de visite de Shopify (recherche arrêtée avant).
- Les données « protégées » des clients Shopify (noms, adresses) pour une application du « Dev Dashboard ».
- La page de la DGCCRF sur les avis (accès refusé) et le texte complet de l'article D541-45-1 sur les déchets.
- La décision Air Canada elle-même (lue dans la presse).
- Le comportement réel du lien SMS prérempli sur les téléphones de 2026 : à essayer.
- Les prix de Batappli, Henrri et Axonaut (sources contradictoires).
- Aucun chiffre publié sur le taux d'acceptation des propositions des assistants (Shopify, Wix, Lightspeed).

---

## Les 10 changements qui auraient le plus d'effet pour SINA

1. **Réécrire l'engagement 10** : plus de « clé créée dans sa boutique » sur Shopify (supprimée par Shopify). Pour
   Shopify, la voie d'autorisation du marchand, déjà dans le Studio ; pour WooCommerce, une clé en lecture seule. Le
   point du mois dit « commandes des 60 derniers jours » tant que Shopify n'a pas accordé l'accès plus ancien.
2. **Mesurer les visites dans le Studio, sans bandeau** : compteur réglé selon la CNIL (adresse tronquée, 13 mois,
   25 mois, données séparées par client, lien de refus). C'est la base honnête du point du mois.
3. **Le relevé du mois envoyé par le client** : une carte avec captures « télécharge ton relevé Google et Instagram »,
   lue par SINA, qui cite le chiffre exact ou écrit « non disponible ».
4. **Engagement 4 dit vrai** : fiche Google tenue à la main avec guide, réponses aux avis préparées et collées d'un
   geste. Le mot « reliée » est retiré tant que le branchement n'existe pas (il demande l'accord de Google).
5. **Demande d'avis à tous les clients, jamais triée** : lien officiel collé une fois, envoi d'un geste par SMS,
   WhatsApp ou e-mail, une seule fois, rien en échange. Une réponse propre à chaque avis, dans la semaine.
6. **L'assistante du site se présente comme une IA** dès le premier message, ne s'ouvre qu'au clic, affiche la mise en
   garde de la CNIL, ne promet jamais un prix, un remboursement ou un délai absent de la fiche vérifiée.
7. **Le carnet de clients porte la preuve de l'accord** : origine, date de l'accord, fin des trois ans. Relance
   seulement aux vrais clients pour des produits semblables, ou à ceux qui ont dit oui, avec « STOP » à chaque message.
8. **Devis contrôlé avant d'être montré** : la liste officielle des mentions, plus déchets et assurance pour le
   bâtiment, et aucun prix deviné. Pas de facture : renvoi vers une plateforme agréée.
9. **Un seul message par jour, réglable** : « ta journée est prête » dans le Studio ; une alerte sur le téléphone
   seulement pour une urgence ou un avis négatif. Chaque proposition porte sa raison et un bouton « pas ça », retenu
   pour la suite.
10. **Le point du mois en trois lignes, puis le travail montré** : demandes, ventes et ce qui a marché, puis « ce que
    j'ai fait pour toi ». Un mois faible est dit faible. Un bouton « vérifie mon idée » permet de tester une décision
    sur ses vrais chiffres.
