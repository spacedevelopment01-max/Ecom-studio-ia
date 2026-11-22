# Les publicités préparées par SINA : recherche approfondie (22 novembre 2026, après-midi)

Suite du rapport du matin (`docs/studio/recherches-2026-11-22/04-publicites.md`). Je pars de ses trous (« Ce que je n'ai
pas pu vérifier ») et je ne répète pas ce qu'il a déjà établi, sauf pour le corriger.

Règle rappelée : le Studio prépare et guide, il n'engage aucune dépense de diffusion ; le client pose lui-même la campagne.

**Niveaux de preuve** : officiel (page de la plateforme ou texte de loi lu par moi) ; officiel lu par d'autres ; étude
publiée ; test indépendant ; article d'éditeur ; avis.

Ordre : 0. le code existant ; 1. le kit réseau par réseau ; 2. la petite entreprise locale ; 3. les créations ;
4. les trois angles et le jugement ; 5. les règles françaises ; 6. le pas à pas ; puis ce qui n'est pas vérifié et ce
qu'il faut construire.

---

## 0. Ce qui existe déjà dans le code du Studio (vérifié le 22 novembre 2026)

- **Le moteur des publicités existe déjà** (`src/lib/ads-v2/`, environ 1 900 lignes, « construit, jamais essayé » selon
  l'inventaire) : connaissance du client (`types.ts`, `insight.ts`), angles (dix types : démonstration, détail, usage,
  problème-solution, objection, preuve, savoir-faire, cadeau, confiance locale, offre), textes (`copy.ts`), contrôle des
  promesses avant toute image (`claims.ts` : superlatifs, santé, fausse urgence, promotion non saisie, faux avis,
  longueurs), mise en page par calques (`compose.ts`, `poster.ts`), barrière de qualité en dix critères avec un relecteur
  qui voit l'image (`quality.ts`), refus d'une personne visible sans accord (`personVisible`, mains comprises).
- **Les règles des régies** sont dans `src/lib/engine/ad-craft.ts` : `AD_LIMITS` (première ligne 125 caractères, titre 40,
  description 30, accroche 10 mots), capitales, ponctuation répétée, « cliquez ici », attributs personnels interdits par
  Meta, jamais d'enfants visés (`audienceIssues`).
- **Le budget d'essai** (`honestTestBudget`) conseille **10 à 20 € par jour et par ensemble, avec 2 ensembles, pendant 7
  jours** (140 à 280 € l'essai) et une règle d'arrêt « une à deux fois le prix de vente sans vente ». C'est plus haut
  que la fourchette visée de 5 à 20 € par jour au total, et deux ensembles divisent les résultats (voir partie 2).
- **Le brouillon de campagne** (`src/lib/campaigns/manual.ts`) n'engage « aucune génération, connexion de régie,
  programmation ou dépense de diffusion ». L'écran (`tab-publicites.tsx`, `ad-campaigns.tsx`) exporte un tableau CSV ;
  le tutoriel (`src/lib/tutorials/publicites.ts`) **vouvoie** le client, alors que SINA le tutoie.
- **Tailles dans `ads-v2/platforms.ts`** : Meta fil 4:5 en 1080 × 1350 et 1:1 ; stories 9:16 en 1080 × 1920 avec une
  marge du bas de 20 % ; Google 1:1 et 1,91:1 ; Pinterest 2:3 ; TikTok 9:16. Le fichier dit lui-même « à revérifier
  avant une campagne réelle ». Les écarts avec les pages officielles sont relevés plus bas.
- **Ce qui manque dans le code** : aucun guide de pose réseau par réseau, aucune liste « options de Meta à éteindre »,
  aucune règle par métier réglementé (alcool, santé, crédit), aucun kit Google (recherche, Performance Max), aucun
  marqueur de lien pour compter les visites venues d'une publicité.

---

## 1. Le kit de campagne, réseau par réseau

### Meta (Facebook, Instagram)

1. **Les longueurs officielles du fil.** Texte principal conseillé de 50 à 150 caractères ; titre conseillé de 27
   caractères ; image 4:5 en 1440 × 1800 pixels, au moins 600 × 750, JPG ou PNG jusqu'à 30 Mo.
   - Lien : https://www.facebook.com/business/ads-guide/update/image
   - Preuve : officiel (relu cet après-midi).
   - Écart avec le code : `AD_LIMITS.headline` vaut 40 et le fil est rendu en 1080 × 1350. Ce que SINA pourrait en
     faire : titre de 27 caractères au plus pour Meta, image rendue en 1440 × 1800.

2. **Les stories et les Reels : la marge du bas est de 35 %, pas de 20 %.** Image 9:16 en 1440 × 2560 conseillés (au
   moins 500 de large). Laisser libres de texte, de logo et d'élément important **environ 14 % en haut, 35 % en bas et
   6 % sur chaque côté**. Texte principal limité à 125 caractères.
   - Lien : https://www.facebook.com/business/ads-guide/update/image/instagram-story
   - Preuve : officiel.
   - Écart avec le code : `PLATFORM_SPECS.meta_story.safe.bottom` vaut 0,2. Ce que SINA pourrait en faire : passer la
     marge du bas à 35 % et rendre en 1440 × 2560, sinon le bouton de Meta recouvre le texte de la publicité.

3. **Les options automatiques de Meta, avec leurs noms exacts dans le Gestionnaire de publicités (liste officielle à
   jour).** La documentation des développeurs donne le nom de chaque option tel qu'il s'affiche dans l'outil, et dit
   lesquelles sont « generated with AI ». Les plus importantes pour SINA :
   - « Visual touch-ups » (recadre et agrandit l'image pour d'autres emplacements) ;
   - « Expand image » (agrandit l'image par IA) ;
   - « Add overlays » (ajoute par IA des bandeaux avec le texte fourni) ;
   - « Generate backgrounds » (nouveaux fonds par IA, seulement pour les publicités de catalogue) ;
   - « Text improvements » (place les textes fournis dans d'autres champs, ajoute une introduction tirée du titre, et
     peut utiliser des « phrases identifiées par IA ») ;
   - « Enhance CTA » (associe des phrases au bouton) ;
   - « Create sticker CTA » (autocollants créés par IA) ;
   - « Adjust brightness and contrast » ;
   - « Relevant comments » (affiche un commentaire sous la publicité) ;
   - « Reveal details over time » (montre des informations prises sur le site) ;
   - « Flexible media » ; « Translate text » ; « Translate image text » ; l'animation d'une image fixe en courte vidéo
     (créée par IA) ; la musique ajoutée.
   La même page précise que l'ancien paquet « standard enhancements » est en cours de retrait : chaque option se règle
   seule.
   - Lien : https://developers.facebook.com/documentation/ads-commerce/marketing-api/creative/advantage-creative/get-started.md
   - Preuve : officiel.
   - Ce que SINA pourrait en faire : une liste en deux colonnes dans le guide de pose. **À éteindre** : « Add overlays »,
     « Text improvements », « Enhance CTA », « Create sticker CTA », « Expand image », « Generate backgrounds »,
     l'animation de l'image, la musique, « Translate text », « Translate image text » et « Relevant comments » (un
     commentaire négatif peut s'afficher sous la publicité). Raison dite au client : ces options peuvent poser sur son
     image des mots ou des morceaux d'image qu'il n'a pas validés, et l'ARPP rappelle qu'une image qui embellit le
     produit demande une mention (partie 5). **Peut rester allumé** : « Visual touch-ups » et « Adjust brightness and
     contrast », qui ne créent rien. Comme SINA livre déjà le 4:5 et le 9:16, « Visual touch-ups » sert peu.

4. **Ce que Meta dit de ses textes créés par IA.** « Meta does not make any warranties regarding the completeness,
   reliability, and accuracy of the suggested text generations, generated backgrounds, or expanded images » ; l'annonceur
   est « responsible for previewing ad creative featuring AI-generated creatives before publishing ». Une image créée
   ou fortement modifiée par ces outils de Meta peut recevoir l'étiquette « AI info », parfois à côté de « Sponsorisé ».
   - Lien : https://developers.facebook.com/documentation/ads-commerce/marketing-api/creative/generative-ai-features.md
   - Preuve : officiel.
   - Ce que SINA pourrait en faire : une phrase dans le kit : « si tu laisses Meta réécrire, c'est toi qui réponds de ce
     qu'il écrit ; éteins ces options, tes textes ont déjà été relus ».

5. **Le budget du jour peut être dépassé.** La documentation des développeurs de Meta donne l'exemple : « if your daily
   budget is $10, up to $12.50 may be spent » (25 % de plus un jour donné).
   - Lien : https://developers.facebook.com/documentation/ads-commerce/marketing-api/bidding/overview/budgets.md
   - Preuve : officiel. Je n'ai pas pu lire la page d'aide en français qui en parle (« À propos des budgets »), ni vérifier
     si ce plafond a changé en 2026 dans l'outil.
   - Ce que SINA pourrait en faire : écrire au client « un jour, Meta peut dépenser un peu plus que ton budget du jour ;
     sur la semaine, il ne dépasse pas ce que tu as fixé » seulement après avoir vérifié la règle de la semaine (non
     vérifiée ici) ; en attendant, dire seulement « un jour donné, jusqu'à un quart de plus ».

6. **L'apprentissage (« 50 résultats en 7 jours ») et les minimums de budget en euros : toujours pas lus à la source.**
   Les pages d'aide de Meta ne s'affichent pas sans compte (j'ai téléchargé la page « About the learning phase » : elle
   ne contient que son titre, le texte se charge par un programme). La page des développeurs sur les budgets minimums
   ne donne aucun montant : le minimum se lit compte par compte. Les sources tierces répètent « environ 50 événements
   dans les 7 jours après la dernière modification importante » et « environ 1 $ par jour pour des affichages, 5 $ pour
   des conversions ».
   - Liens : https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-account/minimum_budgets.md ;
     https://www.jonloomer.com/learning-phase/
   - Preuve : officiel pour l'absence de montant fixe ; officiel lu par d'autres pour les 50 événements.
   - Ce que SINA pourrait en faire : ne jamais écrire de minimum en euros ; le kit dit « si Meta t'affiche que le budget
     est trop bas, monte-le au montant qu'il propose et écris-le-moi ».

### Google « Local Services » en France

7. **La liste officielle des métiers ouverts en France : 29 catégories, toutes de services à domicile.** Sur la page
   d'aide de Google, réglée sur la France (`co=GENIE.CountryCode=FR`) : réparation d'appareils électroménagers,
   menuisiers, nettoyage de moquettes et tapis, nettoyage, plans de travail et de toilette, électriciens, clôtures, pose
   de revêtements de sol, fondations, portes de garage, construction générale, petits travaux, expertise immobilière,
   chauffage et climatisation, collecte de déchets, aménagement paysager, entretien de pelouse, déménagements,
   extermination des nuisibles, plombiers, nettoyage de piscines, construction de piscines, couvreurs, parement,
   déneigement, élagage, restauration après un dégât des eaux, nettoyage de vitres, réparation de fenêtres.
   **Ni serruriers, ni coiffeurs, ni restaurants, ni santé, ni boutiques** en France. La même page dit : « Ne payez que
   lorsque vous recevez des leads en lien avec votre activité » et que les entreprises passent par « la procédure de
   sélection exclusive de Google ». Elle ne donne **aucun prix** ni **aucun délai**.
   - Lien : https://support.google.com/localservices/answer/6224841?hl=fr&co=GENIE.CountryCode%3DFR
   - Preuve : officiel. (Un article français, https://www.brioude-internet.fr/blog/referencement-payant/google-local-services-ads/,
     arrive au même compte de 29 et ajoute que Google vérifie l'entreprise, le dirigeant, les qualifications et
     l'assurance du métier, et « ne publie aucun tarif » : article d'éditeur, non vérifié à la source.)
   - Ce que SINA pourrait en faire : pour un client dont le métier est dans cette liste, une phrase seulement : « Google
     propose aussi des annonces où tu ne paies que quand un client t'appelle ou t'écrit ; il vérifie d'abord ton
     entreprise, ce qui peut prendre du temps. Je peux te préparer ta description et tes photos pour ce dossier. » Ce
     n'est pas une campagne que SINA pose ; et comme la vérification dépend de Google, cela ne doit jamais devenir une
     fonction du Studio (règle du propriétaire « rien qui fasse attendre une plateforme »).

8. **La garantie de remboursement de Google n'existe plus.** Google a remplacé ses badges (« Google Guaranteed »,
   « Google Screened », licence vérifiée) par un seul badge « Validé par Google » ; la page d'aide dit que la garantie de
   remboursement est retirée, et que seuls les services réservés « avant le 7 décembre 2025 » pouvaient encore être
   remboursés, dans les 30 jours. Le badge n'est pas proposé pour l'automobile, la beauté et la restauration.
   - Liens : https://support.google.com/localservices/answer/16498018?hl=fr ; annonce de Google :
     https://blog.google/products/ads-commerce/google-verified-august-2025/ (titre lu seulement)
   - Preuve : officiel.
   - Correction du rapport du matin : le « remboursement jusqu'à 1 500 € » qu'il citait (article de 2020) est périmé.
     SINA ne doit jamais parler de garantie de Google à un client.

### TikTok

9. **La longueur du texte des publicités TikTok, enfin trouvée à la source.** Page d'aide de TikTok sur les publicités
   du fil : « We suggest to keep the ad captions within 50 characters for CN/JP/KR or 100 characters in other languages
   to avoid being covered by See more » ; la zone libre de l'image rétrécit quand le texte s'allonge (« the longer the
   caption, the smaller the safe zone will be »). Une autre page : nom affiché de 20 caractères au plus ; vidéo verticale
   9:16 d'au moins 540 × 960 ; le texte des publicités ordinaires ne prend « no clickable links, symbols (@), or
   hashtags ».
   - Liens : https://ads.tiktok.com/help/article?aid=10002745 ; https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads?lang=en
   - Preuve : officiel.
   - Ce que SINA pourrait en faire : texte TikTok de 100 caractères au plus, sans dièse ni @ ; c'est déjà la valeur du
     code (`PLATFORM_SPECS.tiktok.text.primaryFirstLine` = 100, `AD_LIMITS.tiktokText` = 100). Ajouter le contrôle
     « aucun # ni @ ».

10. **TikTok exige la mention IA, plus largement que la loi.** Page d'aide de TikTok (mise à jour en septembre 2025) :
    « Avertissements obligatoires : les médias synthétiques, générés ou manipulés par IA » ; cela couvre « des images,
    des vidéos ou des sons intégralement générés par une IA » ou « des contenus d'origine authentiques ayant été
    significativement modifiés par une IA ». Dans l'outil, une case « This ad contains AI-generated content » ajoute une
    étiquette en bas de la vidéo pendant toute sa durée ; selon un article de Hootsuite (non vérifié à la source), TikTok
    peut aussi poser l'étiquette lui-même.
    - Lien : https://ads.tiktok.com/help/article/about-ad-disclaimers-in-tiktok-ads-manager?lang=fr
    - Preuve : officiel.
    - Ce que SINA pourrait en faire : pour TikTok, le kit dit toujours « coche la case : contenu généré par IA », parce
      que les images et vidéos de SINA sont créées par un modèle d'IA, même quand le produit est fidèle. C'est plus
      strict que le guide de l'ARPP (partie 5), et c'est la règle de TikTok qui s'applique sur TikTok.

### Google

11. **Google autorise désormais l'étiquette IA dans l'image, sans l'imposer aux publicités commerciales.** Mise à jour
    des règles de Google du 9 juillet 2026 : les annonceurs « can add these labels directly to their creatives or use
    the AI label setting », réglage déployé en juillet dans Google Ads, Merchant Center et Ads Editor ; ces étiquettes
    ne sont plus refusées au titre des règles sur le texte posé sur l'image ; la page rappelle que l'Union européenne
    impose une mention pour « certain AI-generated or edited assets », et que le réglage « doesn't guarantee compliance ».
    Seules les publicités électorales doivent cocher « contenu modifié ou synthétique ».
    - Lien : https://support.google.com/adspolicy/answer/17257106?hl=en
    - Preuve : officiel.
    - Ce que SINA pourrait en faire : pour Google, la mention suit la règle de l'ARPP (produit fidèle dans une scène
      créée : pas de mention ; sinon l'image ne part pas). Le kit indique où se trouve le réglage, au cas où le client
      veuille le cocher.

12. **Google Merchant Center demande une marque cachée dans les images créées par IA.** La règle de Merchant Center
    (lue seulement dans l'extrait du moteur) : « All images created using generative AI must contain metadata indicating
    that the image was AI-generated by using the IPTC DigitalSourceType TrainedAlgorithmicMedia metadata tag », et il ne
    faut pas retirer cette marque.
    - Lien : https://support.google.com/merchants/answer/14743464
    - Preuve : officiel lu dans un extrait (page non ouverte).
    - Ce que SINA pourrait en faire : quand une image de SINA part dans une fiche produit d'une boutique reliée à Google
      Shopping, le Studio garde (ou ajoute) cette marque dans le fichier. À vérifier dans le code au lot de la mise en
      ligne : je n'ai pas cherché si le Studio la retire en recompressant les images.

### Meta : l'objectif et le public local, d'après la documentation officielle

13. **Les publicités qui ouvrent une conversation (WhatsApp, Messenger, Instagram).** Elles « send people who click on
    your ads directly into conversations with your business » ; image, vidéo, carrousel ou diaporama ; on peut ajouter
    un bouton d'appel. Objectifs possibles pour WhatsApp : interactions, prospects, ventes ou trafic ; avec un bouton
    d'appel, l'objectif doit être **interactions**. Condition : **une page Facebook reliée à un numéro WhatsApp**.
    Variante « multidestination » : Meta choisit l'application où la personne répond le plus.
    - Liens : https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/messaging-ads.md ;
      https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/messaging-ads/click-to-whatsapp.md
    - Preuve : officiel.
    - Ce que SINA pourrait en faire : pour un artisan ou un commerce, l'objectif par défaut est « des messages » : SINA
      demande d'abord « as-tu WhatsApp Business relié à ta page Facebook ? » ; si non, le kit commence par cette étape
      (gratuite, aucune validation à attendre) ; si oui, objectif interactions ou prospects, destination WhatsApp.

14. **Les publicités qui font appeler.** Public de **18 ans et plus** obligatoire ; le numéro doit être du **même pays que
    le public** ; Meta conseille de remplir les **horaires d'ouverture** de la page ; l'ensemble vise des « appels de
    qualité » (`QUALITY_CALL`) avec le bouton « Appeler ».
    - Lien : https://developers.facebook.com/documentation/ads-commerce/marketing-api/call-ads.md
    - Preuve : officiel.
    - Ce que SINA pourrait en faire : pour un dépannage ou un métier d'urgence, le kit propose « Appeler » ; SINA vérifie
      avant que les horaires de la page Facebook sont remplis (elle les connaît déjà par le site).

15. **Le public local : un rayon de 1 à 80 km autour d'une adresse.** Rayon autour d'une adresse « from .63 to 50 miles,
    or 1 to 80 kilometers » ; autour d'une ville, 17 à 80 km ; Meta montre la publicité aux gens qui habitent la zone et à
    ceux qui s'y trouvent récemment (« home » et « recent », seul choix possible) ; Meta propose un rayon conseillé pour
    toucher assez de monde (exemple de sa documentation : 16 km). Les publicités « locales » de notoriété visent la
    portée avec un rayon autour du commerce.
    - Liens : https://developers.facebook.com/documentation/ads-commerce/marketing-api/audiences/reference/basic-targeting.md ;
      https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/event-ads.md
    - Preuve : officiel.
    - Ce que SINA pourrait en faire : le kit donne l'adresse exacte à taper et un rayon choisi par SINA (par exemple
      « 10 km » en ville, plus à la campagne), avec la phrase « si Meta te dit que le public est trop petit, prends le
      rayon qu'il propose ». Pas d'âge ni de centres d'intérêt, sauf obligation (alcool, appels, santé : 18 ans).

### Google et Pinterest : budget, mode simplifié, longueurs

16. **Google : la dépense d'un jour peut doubler, jamais le mois.** Page d'aide en français : la dépense d'un jour peut
    aller « jusqu'à deux fois votre budget quotidien moyen », mais « À la fin du mois, vos dépenses ne dépasseront pas
    30,4 fois votre budget quotidien moyen ». Aucun budget minimum conseillé.
    - Lien : https://support.google.com/google-ads/answer/2375423?hl=fr
    - Preuve : officiel.
    - Ce que SINA pourrait en faire : le kit Google traduit le budget du mois du client en budget du jour (budget du
      mois ÷ 30,4) et prévient : « certains jours, Google dépensera jusqu'au double ; sur le mois, jamais plus que ce que
      tu as fixé ».

17. **Google propose un mode simplifié pour les petites entreprises.** Page « Fonctionnement des campagnes
    intelligentes » : 3 à 15 titres, 2 à 4 descriptions, des « thèmes de mots clés » et un budget ; « Vous ne pouvez
    créer des campagnes intelligentes qu'en mode Intelligent ».
    - Lien : https://support.google.com/google-ads/answer/7652860?hl=fr
    - Preuve : officiel (je n'ai pas lu la page des objectifs de ce mode).
    - Ce que SINA pourrait en faire : pour un artisan débutant sur Google, le kit de recherche reste le même (15 titres,
      4 descriptions), et le guide de pose peut suivre ce mode simplifié plutôt que l'outil complet ; à vérifier en
      ouvrant un compte d'essai (gratuit) avant de l'écrire.

18. **Pinterest : description de 800 caractères, tranché.** Page officielle des formats : image 2:3 en 1000 × 1500 ;
    titre de 100 caractères dont « the first 40 characters may show » ; **description jusqu'à 800 caractères**, qui
    n'apparaît pas dans le fil mais sert à Pinterest pour choisir à qui montrer la publicité ; PNG ou JPEG.
    - Lien : https://help.pinterest.com/en/business/article/pinterest-product-specs
    - Preuve : officiel.
    - Écart avec le code : `PLATFORM_SPECS.pinterest.text` limite le titre à 40 et la description à 30. Ce que SINA
      pourrait en faire : titre utile dans les 40 premiers caractères (100 au plus), description riche en mots de
      recherche (jusqu'à 800).

19. **Pinterest : mention IA discrète pour les publicités.** Page d'aide : Pinterest ajoute une étiquette « AI modified »
    quand les données du fichier ou ses propres détecteurs montrent une image créée ou modifiée par IA ; pour une
    publicité, la mention n'apparaît que dans « Pourquoi cette publicité ? » (menu à trois points).
    - Lien : https://help.pinterest.com/en/article/gen-ai-labels (lu dans l'extrait du moteur)
    - Preuve : officiel lu dans un extrait.
    - Ce que SINA pourrait en faire : prévenir le client, sans plus.

---

## 2. Ce qui marche pour une petite entreprise locale à 5 à 20 € par jour

Constat après une recherche approfondie : **aucune étude indépendante ni page de plateforme ne compare les objectifs
(messages, appels, prospects, ventes) pour un petit budget**. Ce qui existe : la logique de l'apprentissage (partie 1),
des repères de coût publiés par un éditeur, et des cas d'agences.

1. **Des repères de coût par demande (États-Unis, éditeur).** LocaliQ et WordStream (page mise à jour le 23 septembre
   2026, méthode non décrite : ni nombre de campagnes, ni période, ni pays) : campagnes de prospects, tous métiers,
   **27,39 $ la demande** en moyenne, 1,80 $ le clic, 8,54 % de conversion ; maison et travaux 42,95 $ ; beauté et soins
   50,91 $ ; santé et forme 27,11 $.
   - Lien : https://localiq.com/blog/facebook-advertising-benchmarks/
   - Preuve : article d'éditeur (gros fournisseur de publicité locale, méthode non publiée, marché américain).
   - Ce que SINA pourrait en faire : faire le calcul honnête avec le client avant de lui proposer un budget : à 10 € par
     jour, avec des demandes à 25 à 50 €, il faut compter **une à trois demandes par semaine**, donc jamais les « 50
     résultats en 7 jours » de l'apprentissage. SINA le dit en clair et ne promet aucun chiffre. Ces montants sont
     américains : ne jamais les citer au client comme des prix français.

2. **Messages plutôt que formulaire : un seul cas, d'agence.** Un cabinet de soins aurait vu le coût d'un contact passer
   d'environ 23 $ à 7 $ en passant du formulaire à Messenger (cas rapporté par une agence, lu seulement dans le résumé du
   moteur). Meta, de son côté, annonce −24 % sur le coût d'un prospect quand on vise les prospects plutôt que les
   conversations sur WhatsApp (rapport du matin, chiffre de Meta).
   - Preuve : avis (cas d'agence) ; moyen pour le chiffre de Meta.
   - Ce que SINA pourrait en faire : objectif « messages » pour les artisans et commerces, avec un message d'accueil
     prérempli écrit par SINA (« Bonjour, je voudrais un devis pour… ») ; le formulaire seulement si le client ne veut
     pas répondre aux messages.

3. **Conséquence pour le code : une seule campagne, un seul ensemble.** `honestTestBudget` prévoit 2 ensembles à 10 à 20 €
   chacun. Avec 5 à 20 € par jour au total, deux ensembles divisent par deux le peu de résultats de chacun. La règle des
   plateformes (TikTok : 3 à 5 créations dans un même groupe ; Meta : la diversité des créations remplace le découpage
   des publics) va dans le même sens.
   - Preuve : déduction de ma part à partir de sources officielles (partie 1 et rapport du matin).
   - Ce que SINA pourrait en faire : kit « 1 campagne, 1 ensemble, 3 publicités (une par angle) », budget unique de 5 à
     20 € par jour choisi avec le client, 7 jours sans toucher, bilan à 14 jours.

4. **Les erreurs fréquentes** (synthèse des guides de praticiens, déjà dans le rapport du matin, confirmée par les guides
   2026 lus en résumé) : le bouton « Booster » au hasard, trop de petites campagnes, public trop étroit, changements
   chaque jour, pas de suivi, juger sur le coût du clic au lieu du coût d'un client.
   - Preuve : avis.
   - Ce que SINA pourrait en faire : le point de la deuxième semaine se fait sur « combien de demandes, combien sont
     devenues des clients », que le client lui donne ; jamais sur le coût du clic seul.

---

## 3. Les créations

1. **Le format « flexible » de Meta n'est ouvert qu'aux campagnes de ventes.** Documentation officielle : il regroupe
   plusieurs images, vidéos et textes dans une seule publicité, et Meta choisit quoi montrer, mais « currently only
   OUTCOME_SALES and OUTCOME_APP_PROMOTION campaign objectives support the flexible ad format », avec « no more than 5
   texts per text_type ». Donc pour un artisan en objectif « messages », il faut trois publicités séparées.
   - Lien : https://developers.facebook.com/documentation/ads-commerce/marketing-api/flexible-ad-format.md
   - Preuve : officiel.
   - Ce que SINA pourrait en faire : deux versions du guide de pose. Boutique en objectif ventes : une publicité
     « flexible » avec les trois images et cinq textes. Artisan en objectif messages : trois publicités, une par angle.

2. **Combien de créations par ensemble : toujours aucun nombre officiel de Meta pour un petit compte.** Les guides
   d'agences de 2026 se contredisent (3 à 6, 6, 10) ; un article affirme que Meta plafonne un ensemble à 50 publicités
   (non vérifié). Le seul nombre officiel pour un petit compte reste celui de TikTok : **3 à 5 créations par groupe**
   (rapport du matin).
   - Lien (exemple des contradictions) : https://www.sprites.ai/meta-andromeda/how-many-meta-ads-do-i-need (lu en résumé)
   - Preuve : avis.
   - Ce que SINA pourrait en faire : garder **trois publicités très différentes** (une par angle) et le dire comme un
     choix : « avec ton budget, chaque publicité doit avoir le temps de se montrer ; trois suffisent ».

3. **Les études sur l'image d'IA : la plus solide reste celle du matin.** Exner et collègues (Marketing Science, preuve
   forte) : une image d'IA qui ne « fait pas IA » fait mieux, celle qui « fait IA » (couleurs saturées, teintes chaudes,
   texte dessiné) fait moins bien. Ajouts de cet après-midi :
   - étude publiée dans *Psychology & Marketing* (2026, doi 10.1002/mar.70235), électroencéphalogramme et suivi du
     regard : les vidéos créées par IA « matches and even outperforms » les vidéos humaines pour l'émotion ; mais
     **20 étudiants seulement**, preuve faible ;
     https://unipub.lib.uni-corvinus.hu/13188/1/PsychologyandMarketing-2026-Shitova-MindsVersusCodesTriangulatingNeurophysiologicalandQualitativeResponses.pdf
   - System1 (institut de mesure des publicités) : 18 publicités vidéo faites par IA notées 3,4 étoiles en moyenne contre
     2,3 pour sa base de 123 000 vidéos ; l'auteur juge lui-même l'échantillon trop petit, et une partie venait d'agences
     liées à un outil d'IA. **Lu seulement dans le résumé du moteur** (Marketing Week et The Drum ont refusé la lecture).
   - Ce que SINA pourrait en faire : rien de nouveau à construire ; la règle du relecteur « est-ce que ça a l'air fait
     par une IA ? » reste la bonne, et le texte se pose par le Studio.

4. **Ce qui fait perdre des clics : le texte sur l'image et la mention.** Deux règles se croisent : TikTok impose
   l'étiquette IA (partie 1, point 10) et l'étude de NYU (rapport du matin, non lue en entier) trouve qu'annoncer l'IA
   baisse l'efficacité jusqu'à −31,5 %. Pour Meta et Google, la mention n'est due que si le produit est embelli ou
   différent (guide de l'ARPP), et dans ce cas l'image ne doit pas partir.
   - Ce que SINA pourrait en faire : sur TikTok, ne pas chercher à éviter la mention (c'est la règle) ; tout miser sur
     une image qui ne fait pas IA et un produit fidèle.

5. **Les formats qui réussissent** : rien de plus solide que Motion (rapport du matin : déballage, bannière qui met
   l'offre en premier, démonstration, témoignage). L'avant-après reste à éviter pour SINA : il demande soit des personnes
   (interdit sans accord), soit une preuve de résultat (cosmétiques : l'ARPP exige des visuels représentatifs de
   l'échantillon testé, partie 5). Pour un artisan, un avant-après de **son vrai chantier** (ses deux photos, prises par
   lui) est possible, sans personne dessus.

---

## 4. Les trois angles du client : une publicité par type de client, et le jugement avant la remise

1. **Écart important dans le code : les « angles » des publicités ne sont pas les angles du propriétaire.** Dans
   `src/lib/ads-v2/angles.ts`, un « angle » est un levier (démonstration, détail, preuve, objection, cadeau…), tiré de
   la fiche du client ; la connaissance du client ne porte qu'**un seul** angle marketing (`marketingStrategy`, commentaire :
   « One explicit project angle; ad concepts remain subordinate executions »). Or la décision du propriétaire du 16
   novembre est : un angle = un type de client, et les deux angles non choisis « restent en réserve pour ses publications
   et ses publicités ».
   - Preuve : code lu.
   - Ce que SINA pourrait en faire : chaque publicité de la campagne part d'**un type de client différent** (l'angle
     choisi, puis les deux en réserve) ; le levier (démonstration, offre, preuve) devient le second choix, différent lui
     aussi d'une publicité à l'autre. C'est exactement ce que Meta demande (diversité des idées, rapport du matin) et ce
     que dit le propriétaire.

2. **Pourquoi c'est la bonne façon, d'après les plateformes.** Meta : la diversité des créations est « the best lever to
   find the most relevant audiences » et des créations trop proches sont traitées comme une seule (rapport du matin).
   Trois publicités pour trois types de clients, sans découper le public, laissent Meta trouver lui-même qui réagit à
   quoi. Aucune étude ne mesure ce montage précis pour une petite entreprise.
   - Preuve : officiel pour le principe ; aucune mesure pour le cas d'une TPE.

3. **Le juge qui compare deux publicités : ce que dit la recherche.** Creative4U (arXiv 2508.12628, août 2025, révisé
   en mai 2026) entraîne un modèle qui voit les images à choisir, entre deux publicités, celle qui obtiendra le plus de
   clics, sur 8 000 paires annotées ; le résumé dit seulement que les essais « demonstrate the effectiveness » (une
   précision d'environ 0,79 est rapportée par un tiers, non vérifiée). Une autre étude (arXiv 2503.00046, février 2025)
   trouve que ces modèles jugent bien la créativité **par paires**, moins bien quand les humains sont eux-mêmes en
   désaccord. Le *Creativity Benchmark* (rapport du 21 novembre) avait montré que les juges d'IA ne remplacent pas les
   créatifs humains.
   - Liens : https://arxiv.org/abs/2508.12628 ; https://arxiv.org/html/2503.00046 (lu en résumé seulement)
   - Preuve : étude publiée en prépublication, lue en résumé.
   - Ce que SINA pourrait en faire : le relecteur ne donne pas une « chance de succès » ; il coche la grille du matin
     (compris par un inconnu, produit héros, pas « l'air IA », différent des deux autres, limites tenues, aucune promesse
     sans preuve, quatre questions ABCD) et compare les publicités **deux à deux** pour vérifier qu'aucune ne double une
     autre. Ajouts de cet après-midi à la grille :
     - le texte tient dans les zones libres officielles (stories : 14 % en haut, 35 % en bas) ;
     - le titre fait 27 caractères au plus pour Meta, 40 utiles pour Pinterest, le texte TikTok 100 au plus sans # ni @ ;
     - le métier est-il réglementé (alcool, cosmétiques, crédit, santé) ? si oui, la liste de son métier est passée ;
     - une réduction affichée a son prix des 30 derniers jours saisi par le client.

4. **Rappel d'une faute du rapport du matin, à ne pas reprendre.** Son point 10 propose, sans accord du client, « des
   mains et un geste ». La règle du propriétaire dit : « Les mains et les silhouettes comptent aussi. » Le code est déjà
   juste (`personVisible` refuse une main) : sans photo fournie ni accord écrit, **aucune main**.

---

## 5. Les règles françaises, lues dans les textes

Légifrance, la page de la DGCCRF (economie.gouv.fr) et EUR-Lex ont tous refusé la lecture (refus 403 ou page vide, même
par téléchargement direct). J'ai donc lu les textes là où ils sont reproduits par une administration ou par l'organisme
de régulation de la publicité (ARPP).

1. **Les prix barrés : le texte exact de l'article L112-1-1 du Code de la consommation.** Reproduit mot pour mot dans la
   fiche de la Direction départementale de la protection des populations des Hauts-de-Seine :
   « Toute annonce d'une réduction de prix indique le prix antérieur pratiqué par le professionnel avant l'application de
   la réduction de prix. Ce prix antérieur correspond au prix le plus bas pratiqué par le professionnel à l'égard de tous
   les consommateurs au cours des trente derniers jours précédant l'application de la réduction de prix. » Exceptions :
   réductions successives (on garde le prix d'avant la première), produits périssables menacés d'une altération rapide,
   et comparaison avec les prix d'autres vendeurs (le client doit alors savoir que c'est une comparaison, et avec quel
   prix : « prix conseillé fabricant, prix habituellement constaté »). La forme est libre (−10 €, −10 %, prix barré).
   Cela vaut en ligne comme en magasin. Sanction annoncée : « deux ans d'emprisonnement et 300 000 euros d'amende pour
   pratique commerciale trompeuse ».
   - Lien : https://www.hauts-de-seine.gouv.fr/contenu/telechargement/23866/169794/file/Annonces%20de%20r%C3%A9duction%20de%20prix.pdf
   - Preuve : officiel (service de l'État, texte de l'article cité en entier). Un article non lu à la source signale que
     la Cour de justice de l'Union européenne a jugé qu'une réduction annoncée doit être calculée sur ce prix le plus bas
     des 30 jours (affaire que je n'ai pas pu ouvrir sur EUR-Lex).
   - Ce que SINA pourrait en faire : une publicité qui annonce une réduction ne part que si le client a saisi **deux
     prix** : le prix réduit et le prix le plus bas des 30 derniers jours, avec la date. Le Studio calcule lui-même le
     pourcentage à partir de ce prix-là, jamais à partir du « prix habituel ». Le code refuse déjà une promotion non
     saisie (`claims.ts`, code `invented_offer`) ; il manque le champ « prix le plus bas des 30 jours ».

2. **L'alcool (loi Évin) : ce qu'une publicité peut montrer, selon la règle de l'ARPP.** La recommandation « Alcool »
   de l'ARPP interprète l'article L3323-4 du Code de la santé publique (texte non lu sur Légifrance) :
   - autorisé : le degré (sans argument tiré de la teneur en alcool), l'origine si le lien est fondé, la composition, le
     mode d'élaboration (« les opérations qui aboutissent à l'obtention d'un produit fini »), le mode de consommation et
     les accords de plats, des « références objectives relatives à la couleur et aux caractéristiques olfactives et
     gustatives du produit » ;
   - interdit : montrer des consommateurs (« Elle s'interdit la représentation de consommateurs ») ; une personne
     montrée doit avoir une « fonction professionnelle effective » (sommelier, maître de chai, chef) ; jamais de mineur ;
   - message obligatoire : « L'abus d'alcool est dangereux pour la santé, à consommer avec modération » (la première
     partie seule si la place manque), à l'horizontale, en gras, écarté des bords ;
   - en ligne : pas de diffusion là où le public n'est pas raisonnablement composé d'« au moins 70 % d'adultes » ; un
     site de marque demande l'âge et bloque les moins de 18 ans.
   - Lien : https://www.arpp.org/nous-consulter/regles/regles-de-deontologie/alcool/
   - Preuve : officiel (règle de l'organisme de régulation professionnelle ; première version 1998, date de la dernière
     version non affichée).
   - Ce que SINA pourrait en faire : pour une cave, une brasserie ou un domaine, un mode « alcool » dans les cahiers de
     SINA : image du produit, du lieu de fabrication, du geste du métier, d'un plat ; jamais une scène de dégustation ;
     le bandeau sanitaire posé par le Studio (texte net, gras, horizontal) ; âge minimum 18 ans dans le kit. Le rapport
     du matin disait « pas de campagne tant que la règle n'est pas écrite » : la voici, elle peut entrer dans les cahiers
     après relecture par le propriétaire.

3. **Les cosmétiques : la recommandation de l'ARPP (version 8, appliquée depuis le 1er juillet 2019, la plus récente
   que j'ai trouvée).**
   - chiffres : seulement des « résultats moyens, obtenus sur l'ensemble de la population testée (le nombre total de
     sujets doit être indiqué), et statistiquement valides » ;
   - avant-après : les visuels « doivent refléter de façon proportionnée et cohérente les performances du produit et
     être représentatifs de l'échantillon testé » ;
   - retouche : permise pour la beauté de l'image, mais « les techniques numériques ne doivent pas modifier les images
     des modèles de telle manière que leurs formes ou leurs caractéristiques deviennent trompeuses sur le résultat » ;
   - « sans » (sans parabène, sans parfum…) : jamais l'argument principal, seulement une information en plus ;
   - « naturel » : seulement si la part naturelle suit la norme ISO 16128 ou mieux ; interdits : traitement de l'acné,
     de la cellulite, de la carie ou de la gingivite.
   - Lien : https://www.arpp.org/wp-content/uploads/2018/11/Recommandation-Produits-cosm%C3%A9tiques-v8.pdf
   - Preuve : officiel (règle de l'ARPP, lue en entier dans le document).
   - Ce que SINA pourrait en faire : ajouter au contrôle des promesses (`claims.ts`) une liste « cosmétiques » : pas de
     chiffre d'efficacité sans le nombre de personnes testées fourni par le client, pas d'avant-après (SINA n'en crée
     jamais : il faudrait des personnes), « sans … » jamais en titre, « naturel » seulement si le client le confirme
     avec sa preuve, mots « acné », « cellulite », « anti-chute » refusés.

4. **Le crédit et le paiement en plusieurs fois : une nouvelle mention depuis le 20 novembre 2026.** Selon un article
   de JeChange (comparateur), la refonte du crédit à la consommation (ordonnance du 3 septembre 2025, directive
   européenne de 2023) remplace, à partir du 20 novembre 2026, « Un crédit vous engage et doit être remboursé » par
   « Attention ! Un crédit coûte de l'argent et doit être remboursé », et vise surtout le paiement en 3 ou 4 fois ;
   amende administrative jusqu'à 1 500 000 € pour une société.
   - Lien : https://www.jechange.fr/credit/news/attention-un-credit-coute-de-l-argent-mention-publicite-20-novembre
   - Preuve : article d'éditeur ; texte de l'ordonnance non lu (Légifrance refusé). **À vérifier avant toute règle.**
   - Ce que SINA pourrait en faire : une publicité qui parle de « paiement en 3 fois » ou « en 4 fois » n'est pas préparée
     tant que la mention exacte n'est pas vérifiée dans le texte officiel ; en attendant, SINA ne met jamais cet argument
     dans une publicité. Chez Meta, le crédit est une « catégorie spéciale » qui limite le ciblage (rapport du matin).

5. **L'influence commerciale (loi du 9 juin 2023).** Selon le cabinet CMS (article du 19 juin 2023) : la loi vise les
   « personnes physiques ou morales qui, à titre onéreux, mobilisent leur notoriété auprès de leur audience » ; mention
   « publicité » ou « collaboration commerciale » ; mention « images retouchées » ou « images virtuelles » « en cas de
   modification ou production d'images représentant un visage ou une silhouette » ; interdiction de promouvoir la
   chirurgie et la médecine esthétiques, les produits à la nicotine, certains produits financiers ; jusqu'à deux ans de
   prison et 300 000 € d'amende.
   - Lien : https://cms.law/en/fra/news-information/loi-sur-les-influenceurs
   - Preuve : avis d'un cabinet d'avocats ; texte de la loi non lu ; je n'ai pas vérifié les changements apportés depuis
     2023 (une mise en conformité avec le droit européen a été notifiée à la Commission européenne, page non lue).
   - Ce que SINA pourrait en faire : la loi vise surtout les influenceurs payés. Pour le client qui fait sa propre
     publicité, la règle utile est déjà celle de SINA (jamais de visage ni de silhouette créés) ; si un jour le client
     paie quelqu'un pour parler de lui, le kit rappelle la mention « collaboration commerciale ».

6. **Ce que le rapport du matin a déjà établi et qui reste valable** : guide de l'ARPP du 3 août 2026 sur la mention IA
   (produit fidèle dans une scène créée : pas de mention ; produit embelli : mention, et c'est trompeur quand même) ;
   mention « photographie retouchée » pour une silhouette de mannequin modifiée ; règles de Meta sur la santé et la
   minceur (aucun avant-après sur le corps, 18 ans et plus).

---

## 6. Le pas à pas pour un débutant, et les captures

1. **Aucune page officielle lisible sans compte ne montre le parcours pas à pas.** Les pages d'aide de Meta ne
   s'affichent pas sans session (vérifié : la page téléchargée ne contient que son titre). La documentation des
   développeurs suit le même ordre que l'outil : campagne (objectif) → ensemble (budget, lieu, public, emplacements) →
   publicité (image, textes, bouton, options automatiques) → aperçu → publication. Les captures d'écran n'ont pas pu être
   faites : il faut un compte publicitaire, que je n'ai pas et que je ne dois pas ouvrir au nom du Studio.
   - Ce que SINA pourrait en faire : le guide de pose suit cet ordre en 8 étapes numérotées, chacune avec « où cliquer »,
     « quoi coller » (bouton copier), et la capture. Proposition de méthode pour les captures, à faire accepter par le
     propriétaire : il ouvre un compte publicitaire d'essai à son nom (gratuit, aucune dépense tant qu'aucune campagne
     n'est publiée), on prend les captures une fois, en français, et on les refait quand Meta change d'écran.

2. **Ordre proposé du guide Meta (assemblé à partir des pages officielles citées plus haut).**
   1. Avant tout : page Facebook avec horaires et, si objectif messages, numéro WhatsApp relié.
   2. Créer une campagne ; objectif choisi par SINA (interactions ou prospects pour les messages ; ventes pour une
      boutique qui vend déjà).
   3. Ensemble : budget du jour unique, date de début, aucune date de fin pour l'essai de 14 jours.
   4. Lieu : l'adresse exacte et le rayon donnés par SINA ; âge 18 ans et plus seulement si alcool, appels ou santé.
   5. Emplacements : laisser Meta choisir (SINA livre le 4:5 et le 9:16).
   6. Publicité : une par angle ; coller les textes (3 à 5 textes principaux, titres de 27 caractères) ; bouton exact.
   7. Options automatiques : éteindre la liste de la partie 1, point 3.
   8. Aperçu sur téléphone et en stories, puis publier ; noter la date ; ne rien toucher pendant 7 jours.

---

## Pas vérifié

- La page d'aide de Meta sur l'apprentissage et ses chiffres exacts (téléchargée : texte absent sans compte).
- Les budgets minimums de Meta en euros : la documentation dit qu'ils se lisent compte par compte ; aucun montant public.
- Si Meta peut, en 2026, dépasser le budget du jour de plus de 25 % (l'exemple officiel des développeurs dit 25 %).
- Les textes sur Légifrance (L3323-4 sur l'alcool, L112-1-1 lu à travers une fiche de l'État, décret « photographie
  retouchée », ordonnance du 3 septembre 2025 sur le crédit) et l'arrêt de la Cour de justice sur les réductions de prix
  (EUR-Lex a renvoyé une page vide).
- La nouvelle mention du crédit (« Attention ! Un crédit coûte de l'argent… ») : lue seulement chez un comparateur.
- Les changements de la loi sur l'influence depuis 2023.
- La règle de Merchant Center sur la marque cachée des images d'IA (extrait du moteur seulement) et si le Studio la
  garde dans ses fichiers.
- Les études System1 et Marketing Week sur les publicités faites par IA (pages refusées).
- Le nombre de publicités maximal par ensemble chez Meta (« 50 » cité par un tiers).
- Les délais de vérification de Google pour les annonces « Local Services » en France, et leurs prix (Google n'en publie
  pas).
- Le parcours exact du « mode Intelligent » de Google Ads.
- Les captures d'écran des outils (aucun compte publicitaire).

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Une publicité par type de client.** Chaque campagne prend l'angle choisi et les deux angles en réserve ; le levier
   (offre en premier, démonstration, savoir-faire…) change aussi d'une publicité à l'autre. *Le client verra* : trois
   publicités qui parlent à trois clients différents, avec une phrase de SINA qui dit à qui chacune s'adresse.
2. **Les longueurs et les tailles officielles dans le code.** Titre Meta 27 caractères, image du fil en 1440 × 1800,
   stories en 1440 × 2560 avec 35 % libres en bas, Pinterest titre 100 (40 utiles) et description 800, TikTok 100 sans
   # ni @. *Le client verra* : des textes jamais coupés et un bouton de Meta qui ne recouvre jamais son message.
3. **Trois à cinq textes par publicité** (aujourd'hui un seul texte principal et un seul titre), tous relus. *Le client
   verra* : plusieurs phrases prêtes à coller, chacune avec son compteur et son bouton « copier ».
4. **Le choix de l'objectif selon le métier et le budget**, dit en une phrase : messages (WhatsApp relié d'abord) pour
   l'artisan et le commerce, appels pour l'urgence, ventes pour la boutique qui vend déjà. *Le client verra* : « je te
   conseille les messages : avec 10 € par jour, tu auras quelques demandes par semaine, pas assez de ventes pour que Meta
   apprenne ».
5. **Un seul ensemble et un budget unique de 5 à 20 € par jour** (remplacer les 2 ensembles de `honestTestBudget`), avec
   le calcul honnête du nombre de demandes à attendre, sans promesse. *Le client verra* : un budget du jour, une durée,
   et ce qu'il peut raisonnablement attendre, écrit « sans garantie ».
6. **La liste « options de Meta à éteindre »**, avec leurs noms exacts dans l'outil et la raison en une phrase. *Le
   client verra* : « éteins Add overlays, Text improvements… : sinon Meta peut écrire sur ton image des mots que tu n'as
   pas validés ».
7. **Les règles par métier réglementé dans les cahiers de SINA** : alcool (règle de l'ARPP, bandeau sanitaire posé par
   le Studio, aucune scène de consommation, 18 ans), cosmétiques (pas de chiffre sans test, « sans » jamais en titre,
   mots interdits), réductions (prix des 30 jours saisi), crédit (aucune publicité sur le paiement en plusieurs fois tant
   que la mention n'est pas vérifiée). *Le client verra* : une publicité conforme du premier coup, et une phrase claire
   quand SINA refuse une promesse.
8. **La mention IA réglée réseau par réseau** : TikTok, toujours cocher la case ; Meta et Google, pas de mention si le
   produit est fidèle (guide de l'ARPP), et une image qui embellit le produit ne part pas. *Le client verra* : « sur
   TikTok, coche Contenu généré par IA » dans son guide, et rien à faire ailleurs.
9. **Le guide de pose pas à pas en 8 étapes**, avec captures prises une fois sur un compte d'essai ouvert par le
   propriétaire (accord à demander). *Le client verra* : un écran « Ta campagne est prête » avec les publicités en aperçu
   et les étapes numérotées.
10. **Le marqueur dans le lien de chaque publicité** (absent du code aujourd'hui), pour compter les visites et demandes
    venues de chaque publicité sur son site, sans branchement à Meta. *Le client verra* : dans le point du mois, « la
    publicité pour les jeunes parents t'a apporté 4 demandes », chiffre lu sur son site.
11. **Le calendrier qui protège l'argent** : 7 jours sans toucher, bilan à 14 jours sur les demandes et les clients
    (jamais sur le coût du clic), Google : rien remplacé avant 2 à 3 semaines, budget du mois ÷ 30,4. *Le client verra* :
    deux rappels de SINA, au jour 7 et au jour 14.
12. **Une phrase sur les annonces « Local Services » de Google**, seulement pour les 29 métiers ouverts en France, sans
    jamais parler de garantie de remboursement (supprimée). *Le client verra* : un conseil en une phrase, et l'aide de
    SINA pour préparer sa description et ses photos s'il veut s'inscrire.
