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
  et décisions de l'essai : `docs/studio/LOT-2-LA-MARQUE.md`. Lot 3 (les trois angles) construit le 16 novembre
  2026 et testé avec une IA simulée ; **reste l'essai réel, puis le retrait des anciennes façons** : voir
  `docs/studio/LOT-3-LES-TROIS-ANGLES.md`. Suite : 4 le site, 5 les publications automatiques, 6 les forfaits, 7 SINA prend les devants, 8 les
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
  40,06 €, pour 25 € accordés au départ (le dépassement vient d'essais qu'il a demandés).
- **Le client ne voit jamais d'euros pour l'IA** : tout coût est un pourcentage du budget d'IA de son mois.
- **Forfaits validés** (« Oui je valide comme ça ») : 69 €, 99 € et 169 € par mois, sans prix de création ni
  engagement ; budget d'IA à 50 % du prix hors taxes le premier mois, puis 40 % ; par forfait : 2, 3 et 4 identités
  proposées, 1, 2 et 3 publications en images par jour, 0, 3 et 6 vidéos par mois, 0, 1 et 2 campagnes préparées. Le
  code a encore 49, 89 et 129 € jusqu'au lot des forfaits.

## Ce que SINA doit être

- Le client n'entend qu'elle ; ses spécialistes restent en coulisses. Elle le tutoie.
- Ses mots : « une superintelligence qui prend son rôle à cœur » ; elle pose toutes les questions dont elle a besoin,
  au moment où elle en a besoin, pour réussir du premier coup ; elle prend les devants, conseille, et reste
  l'interlocutrice après la livraison (publications, publicités, améliorations).
- Elle réfléchit avec le modèle le plus fort, pour tous les forfaits. Celui qui fait n'est jamais celui qui juge ;
  rien n'est montré sans avoir été relu ; elle regarde ce qu'elle a fait et le corrige avant de le montrer.
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
- **Logo** : créé par OpenAI pour cette marque-là, jamais repris d'une autre ; aucun pictogramme dessiné en code ;
  fond retiré, pas de carré autour. OpenAI est libre du dessin : il reçoit le métier, les couleurs, la typographie et la
  direction artistique de la marque, jamais un style imposé. Dans une série, chaque logo reçoit ceux déjà faits avec
  « je veux un logo complètement différent ». Le favicon reprend le logo.
- **Identité** : montrée en planche de marque complète, jamais en simple fiche. Jamais une planche incomplète : une
  image refusée est refaite avant d'être montrée. Sur fond sombre, le logo est toujours clair.
- **Trois angles** : un angle, c'est « aller chercher une typologie de client différente, avec des envies et des
  besoins différents, mais qui recherche le même produit ; c'est juste qu'il n'est pas mis en avant et en valeur de la
  même façon sur le site et la communication » (ses mots du 16 novembre). Donc trois angles = trois types de clients
  différents, jamais deux pour le même. Un sûr, un d'émotion, un audacieux, avec celui que SINA recommande. Le client en choisit un ;
  les autres restent en réserve pour ses publications et ses publicités, sans nombre d'angles par forfait.
- **Site** : SINA le conçoit pour cette marque, pas en copier-coller, et il doit être bon du premier coup. Des
  sections à la hauteur des meilleurs sites ; de la variété d'un client à l'autre (menus, boutons) ; un signe pris sur
  le produit ou le métier. Ouverture en grande photo pleine avec le titre dessus ; jamais deux parties de même
  disposition à la suite ; aucun vide ; jamais une photo en doublon ; accueil d'au moins 8 sections, fiche produit
  d'au moins 7 ; une seule section « Produit vedette » par page, remplie avec les vraies données. Jamais une
  coordonnée, un avis ou un prix d'exemple. Le client ne lit jamais le mot « maquette ». Pour Shopify, pas de page de
  commande dans le thème.
- **Photos** : les photos produit du client restent sur les emplacements produit ; l'ouverture est une scène créée
  avec son vrai produit. SINA n'invente jamais l'équipe ni les biens à vendre. Les réalisations d'artisans sont créées
  quand le client n'en a pas assez (règle maintenue le 14 novembre, « on verra plus tard si on change »).
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
- Les 15 thèmes proposés : fraise, onde, rive, sillon, noctil, traverse, heuren, museau-club, souple, table-saison,
  atelier-nuance, parenthese, phase, maison-horizon, aplat. Leurs démonstrations sont des reproductions de maquettes
  validées : ne pas les recomposer ni les simplifier.

## Travailler dans le dépôt

- Dépôt GitHub : `spacedevelopment01-max/Ecom-studio-ia` (avec cette casse).
- Avant chaque envoi : `npx tsc --noEmit` puis `npx vitest run` (mettre `NODE_OPTIONS=--max-old-space-size=8192`).
  Un test pour tout comportement modifié. Thème (`theme-base/`, `src/lib/theme/`) : skill **verifier-theme**.
- Messages d'enregistrement en français. **Aucun identifiant de modèle d'IA, aucune signature de co-auteur** dans les
  enregistrements, les demandes de fusion ou les fichiers.
- **Fusion** : seulement un lot prouvé (SINA l'a réussi seule avec la vraie IA, contrôles verts), et seulement après
  avoir demandé « Je fusionne ? » et reçu son oui.
- Repères : `src/app` (pages, API), `src/components/studio` (écrans), `worker/` (tâches de fond),
  `src/lib/syna-agent` (SINA), `src/lib/theme` et `theme-base/` (moteur des sites), `src/lib/ai` (appels à l'IA,
  comptage), `src/lib/billing.ts` et `plans.ts` (forfaits), `src/lib/social` et `social-v2` (réseaux),
  `scripts/syna-recette/` (studio privé d'essai).
