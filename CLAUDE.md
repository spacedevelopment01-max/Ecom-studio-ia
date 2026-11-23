# E-COM STUDIO IA — consignes pour Claude

Studio où un client donne quelques informations et ses photos, et où SINA, l'assistante du Studio, crée sa marque,
son site, ses publications et ses publicités, puis s'en occupe avec lui. Next.js 15 (App Router), worker de tâches de
fond, SQLite. Voir `README.md`.

## À lire d'abord

1. **`docs/studio/LE-STUDIO-DE-A-A-Z.md`** : le Studio à construire, avec les mots du propriétaire, ses réponses et
   les prix validés. C'est la référence. Page en ligne : https://claude.ai/artifact/76xobBZYJxCMt6oxuSeNLn
2. **`docs/studio/INVENTAIRE-DU-CODE.md`** : le code rangé en trois piles (garder, reconstruire pour SINA, supprimer),
   les doublons, l'ordre des lots 0 à 9. Détail par domaine, avec les chemins : `docs/studio/inventaire/`. Page en
   ligne : https://claude.ai/artifact/WxwtnxCqQtPSYqkB2NSFRP
3. `docs/sina-savoir/` : les cahiers de métier de SINA (lus par le code), la carte de ses spécialistes, les références.

Les consignes d'avant le 15 novembre 2026 (journaux des essais, chantiers datés, détail des thèmes) sont dans
`docs/archives/CLAUDE-2026-11-15.md`. On n'y va que pour retrouver un fait précis. Elles ne servent jamais de modèle
pour SINA : les projets d'essai (infusions, thé, toiletteuse et les autres) sont mis de côté, et aucun exemple tiré
d'eux ne doit se retrouver dans une consigne envoyée à l'IA ni peser sur une décision.

## La méthode (acceptée le 14 novembre 2026 : « Oui, on repart comme ça »)

- On garde les fondations, on reconstruit SINA au propre, on supprime les anciennes façons. **Une seule façon de faire
  chaque chose, tout allumé.**
- Le travail se fait en lots, dans l'ordre de l'inventaire. Avant chaque lot : ce qui est construit, pourquoi, ce
  qu'il verra, le prix de l'essai. Il dit oui ou non.
- **Un lot est fini quand SINA le réussit seule, avec la vraie IA, sur plusieurs clients inventés.** Claude ne joue
  que le client (« c'est à sina d'y faire, pas à toi »). Les anciennes façons du lot sont retirées à ce moment-là.
- Une conversation par lot ; elle commence par la lecture des deux documents ci-dessus.
- Où on en est : lot 0 (ménage) fait le 15 novembre 2026. Lot 1 fait le même jour : SINA essayée pour de vrai, anciennes
  façons retirées (ancien assistant, Pilote, formulaire, écrans de préparation), écran réglé (SINA en grand pendant la
  création, tableau de bord à côté) ; compte rendu : `docs/studio/LOT-1-SINA-UNE-SEULE-PORTE.md`. Lot 2 (la marque) fait le
  16 novembre 2026 : SINA a créé seule la marque de trois clients inventés, anciennes façons retirées ; compte rendu
  et décisions de l'essai : `docs/studio/LOT-2-LA-MARQUE.md`. Lot 3 (les trois angles) fait le 16 novembre 2026 : SINA a créé
  seule les angles de deux clients repris du lot 2 (branche `essai-lot2-donnees`), le propriétaire les a validés
  (« Parfait »), anciennes façons retirées ; compte rendu : `docs/studio/LOT-3-LES-TROIS-ANGLES.md`. Lot 4 (le site) en cours depuis le 16 novembre 2026, en cinq temps acceptés (« Oui ») : les temps 1 à 3 sont construits et vérifiés sans IA (SINA crée le site en une fois avec `site.create`, un seul accord ; clic sur l'aperçu pour modifier), l'essai réel reste à faire ; état exact : `docs/studio/LOT-4-LE-SITE.md`. Suite : 4 le site, 5 les publications automatiques, 6 les forfaits, 7 SINA prend les devants, 8 les
  publicités, 9 les vidéos.

## Avec le propriétaire

- **Français simple, jamais un mot d'anglais**, y compris dans les messages d'avancement, les légendes et les comptes
  rendus. Il n'est pas développeur : dire ce qui change pour lui, pas le code. Réponses courtes ; une question au plus,
  à la fin ; ne jamais reposer une question déjà répondue.
- **Claude tranche.** Ses mots : « C'est pas a moi de choisir tu es bien plus intelligent que moi donc c'est a toi de
  me dire ce qui serait bien ou non ». Claude décide, explique pourquoi et dit ce qu'il fera ; il dit oui ou non. Ne
  lui demander que ce que lui seul peut savoir ou engager : son argent, son goût, sa responsabilité, ce qui ne se
  rattrape pas. Jamais « tu préfères A ou B ? » sur une question de métier.
- **Prendre les devants, mais expliquer avant de construire** et attendre son accord. Il veut que ça avance.
- **Pas d'initiative qui coûte** (16 novembre : « arrête de prendre des initiatives qui nous font perdre du temps et
  de l'argent ») : faire ce qu'il demande, avec ses mots ; une idée se dit en une phrase et attend son oui ; le plus
  petit essai avant toute dépense ; lui montrer les images tout de suite, y compris celles que SINA refuse.
- **Prendre ses paroles au sérieux** : ce qu'il a dit une fois vaut pour toujours et ne se redemande pas.
- **Honnêteté** : ne rien inventer (chiffres, avis, délais, résultats). Un manque s'écrit « [À compléter : …] ». Dire
  ce qui a été vérifié et ce qui ne l'a pas été. Une faute se dit.
- **Jamais de clé d'API dans la conversation** : elles se saisissent dans Administration › Fournisseurs IA.
- Ce qu'on lui montre, même pour expliquer, doit donner envie. Après une recherche, lui montrer en captures ce qui a
  été lu.
- Un retrait de contenu ou un changement visible important se propose ; il ne s'applique qu'après son accord.

## Son argent

- **Aucun appel payant à l'IA ni publication réelle sans son accord écrit.** Donner le prix avant, attendre son
  « oui ». Le budget d'un essai se décide avec lui juste avant de le lancer. Un appel au résultat incertain (erreur du
  fournisseur) n'est jamais relancé tout seul. Aucun fournisseur payant ajouté sans son accord.
- Si un modèle n'arrive pas à écrire un mot dans une image, changer la phrase plutôt que repayer des essais.
- Dépensé en essais réels avant le lot 2 : environ 19,14 € comptés par le Studio (dont 2,94 € pour l'essai du lot 1,
  sur 9 € accordés, et 1,07 € pour l'essai sur le nouvel écran, sur 1,50 €). Essai du lot 2, au 16 novembre 2026 :
  40,06 €, pour 25 € accordés au départ (le dépassement vient d'essais qu'il a demandés). Essais du lot 3 : 8,36 €.
- **Le client ne voit jamais d'euros pour l'IA** : tout coût est un pourcentage du budget d'IA de son mois.
- **Forfaits validés** (« Oui je valide comme ça ») : 69 €, 99 € et 169 € par mois, sans prix de création ni
  engagement ; budget d'IA à 50 % du prix hors taxes le premier mois, puis 40 % ; par forfait : 2, 3 et 4 identités
  proposées, 1, 2 et 3 publications en images par jour, 0, 3 et 6 vidéos par mois, 0, 1 et 2 campagnes préparées. Le
  code a encore 49, 89 et 129 € jusqu'au lot des forfaits.

## Ce que SINA doit être

- Le client n'entend qu'elle ; ses spécialistes restent en coulisses. Elle le tutoie.
- Son visage (pour le design, à faire plus tard) : la constellation du projet, jamais symétrique ; après la livraison,
  SINA va sur l'étoile de ce qu'elle fait ; détail dans la référence, partie 15. Son nom reste SINA pour l'instant.
- Ses mots : « une superintelligence qui prend son rôle à cœur » ; elle pose toutes les questions dont elle a besoin,
  au moment où elle en a besoin, pour réussir du premier coup ; elle prend les devants, conseille, et reste
  l'interlocutrice après la livraison (publications, publicités, améliorations).
- Elle réfléchit avec le modèle le plus fort, pour tous les forfaits. Celui qui fait n'est jamais celui qui juge ;
  rien n'est montré sans avoir été relu ; elle regarde ce qu'elle a fait et le corrige avant de le montrer.
- Chaque mois, le client doit voir ce que son abonnement lui apporte : dix-sept engagements (dont le point du mois,
  « ta journée est prête », la boîte des demandes, le carnet de clients, l'objectif du mois et le bras droit), détaillés
  dans la référence, partie 14. Condition du propriétaire : « ça doit vraiment faire ce que tu as dit
  c'est impératif » ; un engagement à moitié fait n'est pas fini.
- Elle propose, le client décide. Elle n'agit seule que là où il l'a autorisé par écrit, dans son plafond.
- Aucun réglage du Studio en ligne n'est changé sans la demande du propriétaire.

## Ses goûts, en règles générales

- **Clair d'abord, beau ensuite.** Un texte est compris à la première lecture par quelqu'un qui ne connaît ni la
  marque ni le métier : aucun mot d'initié, aucune phrase à double sens, aucune devinette. L'émotion ne passe jamais
  avant le sens.
- **L'émotion.** Tout texte fait ressentir (une scène, un moment, une sensation), jamais une simple description. Les
  boutons qui vendent portent le désir. Aucune accroche répétée, aucun ordre donné au lecteur.
- **Des images magnifiques**, du niveau d'une campagne haut de gamme : vraie scène, lumière travaillée, vrai produit
  du client, produit entier, rien de coupé. Le texte se pose sur la partie calme de la photo. Chaque image est
  vérifiée avant d'être montrée ; une image ratée est dite ratée.
- **Images créées par OpenAI** pour tout ce que fait SINA ; c'est obligatoire pour les publications.
- **Jamais de personne** dans une image sans photo fournie par le client ou accord écrit.
- **Noms de marque** : un mot simple et fort qui dit la matière ou le métier ; l'épreuve du fondateur (« tu
  appellerais ton site comme ça, toi ? ») ; aucun sous-entendu ; le juge ne garde qu'un nom qu'il noterait 8 sur 10 ;
  l'adresse sur Internet est contrôlée, et jamais promise.
- **Logo** : créé par OpenAI (modèle imposé le 18 octobre, sans secours) pour cette marque-là, jamais repris d'une autre ;
  aucun pictogramme dessiné en code. **La demande au dessinateur tient en deux choses : le métier en mots simples et le
  nom exact** (23 novembre 2026 : « je pense qu'il ne faut pas donner d'informations sauf fait moi un logo pour une
  marque de bougies tu donne le nom de la marque et rien de plus, pas de le client ne veux pas tel truc dans son logo.
  Ça doit être le plus libre possible pour la création du logo »). Exemple : « Fais-moi un logo pour une marque de
  bougies. Le nom de la marque : « Sillage ». » Rien d'autre : ni idée, ni ton, ni couleurs, ni typographie, ni fond,
  ni refus du client, ni planche d'exemples ; toutes les phrases en français. **La série** (précision du 23 novembre 2026 : « En même temps il fallait garder la
  règle de le premier logo est fait donc on le donne à open ia et on lui dit je veux un autre logo complètement
  différent de celui là et pour le 3eme pareil, ou lui donne les 2 première et on lui dit fait moi un autre logo
  complètement différent des 2 premier ») : le 1er logo part sans image ; le 2e reçoit le 1er avec « Je veux un autre
  logo complètement différent de celui-là. » ; le 3e reçoit les deux premiers avec « Fais-moi un autre logo
  complètement différent des deux premiers. » ; au-delà, tous les précédents. Ce sont les logos gardés des identités
  d'avant (sinon leur dernier dessin), jamais ceux d'une autre série ni d'un autre projet. Une reprise reçoit en plus
  ses propres essais refusés (« … de tous ceux-là »), jamais la raison du refus (essai réel de Pénombre : « trois fois
  le même dessin »). Un logo gardé n'est jamais redessiné. **On ne demande plus au client ce qu'il veut ou non dans
  son logo** (même jour : « Pour rappel on ne demande plus au client ce qu'il veux ou non dans son logo ») : ce qu'il
  en dit de lui-même va au relecteur, jamais au dessinateur. Le nom n'est épelé que s'il porte un accent ou un signe.
  Ces décisions remplacent les règles du 20 et du 21 novembre sur ce que reçoit le dessinateur (les épreuves qui les
  gardaient sont marquées remplacées, avec l'accord écrit du propriétaire du même jour). Les mots et les refus du client vont au relecteur, le modèle le plus fort au niveau élevé,
  qui relit chaque logo seul, avec la planche des 50 logos aimés (`docs/sina-savoir/logos-aimes/`) comme niveau, et ne
  garde que ce qu'il note 8 sur 10 ou plus (un mot non demandé dans le logo, comme un sous-titre, est un défaut ; le nom
  seul est attendu) ; un logo refusé est redessiné (avec ses essais refusés joints, comme dit plus haut), à la charge du Studio,
  dans la borne des reprises. Le trait près du nom avec parcimonie : un seul par série, tenu par le relecteur seulement
  (accord du 23 novembre 2026), jamais dit au dessinateur. Le Studio retire le fond après coup, creux des lettres
  compris, sans carré autour ; un fond qu'il ne sait pas retirer proprement fait redessiner le logo. Le favicon reprend
  le logo. Les photos reçoivent des consignes de base dites en positif (bord à bord, écran du site rempli, texte net sur
  une zone calme, aucun objet vierge sans rôle) ; le relecteur relit chaque image seule et ne garde que ce qu'il note
  8 sur 10 ou plus.
- **Identité** : montrée en planche de marque complète, jamais en simple fiche. Jamais une planche incomplète : une
  image refusée est refaite avant d'être montrée. Sur fond sombre, le logo est toujours clair.
- **Trois angles** : un angle, c'est « aller chercher une typologie de client différente, avec des envies et des
  besoins différents, mais qui recherche le même produit ; c'est juste qu'il n'est pas mis en avant et en valeur de la
  même façon sur le site et la communication » (ses mots du 16 novembre). Donc trois angles = trois types de clients
  différents, jamais deux pour le même ; un type de client est une situation, jamais un âge seul ni une crainte que
  tous partagent ; un produit ou une prestation vedette et un argument différents par angle (leçon :
  `docs/sina-savoir/angles-marketing.md`). Un sûr, un d'émotion, un audacieux, avec celui que SINA recommande. Le client en choisit un ;
  les autres restent en réserve pour ses publications et ses publicités, sans nombre d'angles par forfait.
- **Site** : SINA le conçoit pour cette marque, pas en copier-coller, et il doit être bon du premier coup. Des
  sections à la hauteur des meilleurs sites ; de la variété d'un client à l'autre (menus, boutons) ; un signe pris sur
  le produit ou le métier. Ouverture en grande photo pleine avec le titre dessus ; jamais deux parties de même
  disposition à la suite ; aucun vide ; jamais une photo en doublon ; accueil d'au moins 8 sections, fiche produit
  d'au moins 7 ; une seule section « Produit vedette » par page, remplie avec les vraies données. Jamais une
  coordonnée, un avis ou un prix d'exemple. Le client ne lit jamais le mot « maquette ». Pour Shopify, pas de page de
  commande dans le thème.
- **Un site ne ressemble pas à un autre** (17 novembre 2026, devant les deux premiers sites de SINA : « sur les 2 premiers
  thèmes faits par SINA il y a déjà la moitié des sections qui sont identiques. J'appelle pas ça de la variété moi » ; « 4
  fois la même section entre les deux alors qu'on a une centaine de sections, et surtout elles ont la même disposition
  alors qu'il y a 2 ou 3 possibilités de placement ») : avec chaque site déjà monté, quel que soit le métier, l'accueil a
  au plus 2 pièces en commun, le site entier au plus un quart, et une pièce reprise prend toujours une autre disposition
  (`variete-sites.ts`). Comparé aux 12 derniers sites et aux 30 derniers du même métier. **Aucune porte de sortie** (« elle
  doit y arriver, on ne laisse pas de porte de sortie sinon elle va la prendre ») : ce qu'elle laisse, le Studio le
  remplace lui-même ; une conception qui ne tient pas la règle n'est jamais enregistrée.
- **Le fond blanc est toujours permis** (17 novembre 2026 : « La couleur blanche en fond est autorisée si jamais ») : un
  fond blanc pur n'est jamais refusé pour ressemblance ; quand aucun fond doux ne s'écarte assez des marques récentes,
  le Studio prend le blanc (`variete-marques.ts`).
- **Jamais de photo dans une arche ni une demi-lune** (16 novembre 2026, devant une page d'arrivée : « L'arrière plan en lune
  c'est pas beau je veux plus ça ») : le cadre en arche n'est plus proposé, plus permis, plus affiché (`sansArche`).
- **Jamais un bouton coupé** (17 novembre 2026, devant le site d'essai sur son téléphone : « Les boutons sont coupés en bas,
  jamais au grand jamais ») : un bouton, son bord et son ombre se voient en entier, sur téléphone comme sur ordinateur
  (`tests/bouton-a-ombre-jamais-coupe.test.ts`).
- **Photos** : les photos produit du client restent sur les emplacements produit ; l'ouverture est une scène créée
  avec son vrai produit. SINA n'invente jamais l'équipe ni les biens à vendre. Les réalisations d'artisans sont créées
  quand le client n'en a pas assez (règle maintenue le 14 novembre, « on verra plus tard si on change »). Boutique
  sans photos de produits (17 novembre 2026, à la question « SINA ne crée pas le site tant qu'elle n'a pas une vraie
  photo de chaque produit ? ») : « Ou alors elle lui dit qu'elle peux monter le site mais qu'elle devra importer ses
  photos par la suite. » SINA ne bloque donc pas : elle le dit avant la carte de dépense, n'invente jamais le produit
  (« Ta photo ici » tient sa place), et le site ne part en boutique qu'une fois ses photos importées.
- **Maquette du site sur la planche** : créée par OpenAI, sur un téléphone et dans le téléphone, belle, différente
  d'un client à l'autre, à l'identité de la planche, avec le bon logo (clair sur fond sombre).
- **Publications** : chacune se comprend seule par quelqu'un qui ne connaît pas la marque, la première dit l'offre en
  clair, chacune porte le logo ; le niveau des meilleurs community managers avec Canva ; pour les vidéos, celui de CapCut.
  Toujours une vraie image. Les exemples montrés à un client sont très différents les uns des autres (couleur, sujet,
  cadrage, rôle). Une métaphore juste qui fait sourire lui plaît.
- **Publicités** : le Studio prépare et guide ; il n'engage aucune dépense de diffusion.
- **Vocabulaire du client** : ce qu'il corrige une fois vaut pour toujours ; ses textes sont repris mot pour mot.
- **Les vidéos se traitent en dernier.**

## Règles du produit

- « Découverte » n'est pas un forfait : un compte sans abonnement visite la démonstration et ne crée rien. Aucun appel
  à l'IA sans abonnement. Le compte administrateur suit son forfait comme un client.
- Interface et contenus en français et en anglais (`L("fr", "en")`, `src/lib/i18n-server.ts` ; dans le thème, chaque
  libellé a sa traduction).
- Les coordonnées saisies à la création d'un projet ne sont jamais redemandées ni effacées.
- **Aucune fonction qui oblige à attendre des semaines qu'une plateforme valide le Studio** (« Je veux aucune
  proposition qui doivent nous faire attendre des semaines pour que les plateformes valides de travailler avec nous »,
  15 novembre 2026). Ce qui en dépendrait se fait sans elle, ou ne se fait pas.
- **Les branchements aux plateformes (Meta, TikTok, Google, Pinterest) sont mis de côté** : « Je mettrai en place toute
  l'automatisation avec les autres plateformes mais pour l'instant c'est pas le cas donc on fait sans et on y met de
  côté » (15 novembre 2026). Tout se conçoit sans eux : SINA prépare, le client publie d'un geste.
- **Modifier en cliquant sur l'aperçu** : sur l'aperçu de son site, le client clique sur n'importe quel élément de
  n'importe quelle section (un titre, un texte, une photo, un bouton, un détail) et demande le changement à SINA.
  « ça c'est obligatoire et pour chaque détail des sections » (15 novembre 2026). L'ancien assistant savait désigner
  un élément. Depuis le lot 4, le clic désigne tout de suite dans l'onglet Boutique du site monté par SINA, et la
  demande part à SINA (`custom-theme-boutique.tsx`).
- **Pas de création gratuite** : l'idée « créer et voir gratuitement, payer pour publier » est refusée (« Pas envie
  de faire comme ça », 15 novembre 2026) ; la règle « aucun appel à l'IA sans abonnement » reste.
- **Le thème unique du Studio** (15 novembre 2026, « Oui écris le ») : SINA monte chaque site avec un seul thème très riche
  (8 en-têtes dont deux méga menus avec leur version téléphone, 6 pieds de page, 6 pages produit, 6 pages de services,
  pages simples en 2 ou 3 mises en page, environ 60 sections, 6 familles en coulisses jamais montrées au client) ; douze
  démonstrations, dont six à la sortie. Détail : référence, partie 15. À construire au lot 4.
- Les 15 thèmes proposés (jusqu'à ce que le thème unique ait fait ses preuves) : fraise, onde, rive, sillon, noctil, traverse, heuren, museau-club, souple, table-saison,
  atelier-nuance, parenthese, phase, maison-horizon, aplat. Leurs démonstrations sont des reproductions de maquettes
  validées : ne pas les recomposer ni les simplifier.

## Travailler dans le dépôt

- Dépôt GitHub : `spacedevelopment01-max/Ecom-studio-ia` (avec cette casse).
- Avant chaque envoi : `npx tsc --noEmit` puis `npx vitest run` (mettre `NODE_OPTIONS=--max-old-space-size=8192`).
  Un test pour tout comportement modifié. **Le banc d'épreuves** (`tests/epreuves/catalogue.ts`, `npm run epreuves`) :
  chaque raté vu avec le propriétaire, avec son verdict mot pour mot ; une épreuve qui échoue bloque l'envoi ; un
  verdict ou ce qui est attendu ne se réécrit jamais (sceaux), on en ajoute, on n'en retire pas. Thème (`theme-base/`, `src/lib/theme/`) : skill **verifier-theme**.
- Messages d'enregistrement en français. **Aucun identifiant de modèle d'IA, aucune signature de co-auteur** dans les
  enregistrements, les demandes de fusion ou les fichiers.
- **Fusion** : seulement un lot prouvé (SINA l'a réussi seule avec la vraie IA, contrôles verts), et seulement après
  avoir demandé « Je fusionne ? » et reçu son oui.
- Repères : `src/app` (pages, API), `src/components/studio` (écrans), `worker/` (tâches de fond),
  `src/lib/syna-agent` (SINA), `src/lib/theme` et `theme-base/` (moteur des sites), `src/lib/ai` (appels à l'IA,
  comptage), `src/lib/billing.ts` et `plans.ts` (forfaits), `src/lib/social` et `social-v2` (réseaux),
  `scripts/syna-recette/` (studio privé d'essai).
