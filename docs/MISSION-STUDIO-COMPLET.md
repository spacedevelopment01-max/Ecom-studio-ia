# Mission : finir E-COM STUDIO IA, tel que le propriétaire le veut

Document écrit le 12 novembre 2026 à la demande du propriétaire, pour lancer une nouvelle conversation de travail.
C'est ton brief complet : **lis-le en entier, puis `CLAUDE.md` en entier, avant toute action.** Là où ce document et
`CLAUDE.md` se contredisent, la règle la plus récente l'emporte (les dates sont indiquées). En cas de doute, demande au
propriétaire.

---

## 1. Ce qu'on attend de toi, en une phrase

Reprendre E-COM STUDIO IA dans son ensemble, le revoir de fond en comble (tu peux tout recoder de A à Z si c'est mieux)
et livrer **un Studio fini, fonctionnel et beau**, où SINA mène un client de son idée à une marque, une boutique ou un
site, des publications, des publicités et un calendrier, **au niveau des meilleurs sites de 2026**. Le propriétaire
attend surtout une **très grosse amélioration du thème sur mesure** (partie 6).

Tu as toute latitude technique. En revanche, les règles du propriétaire (parties 2 et 3) ne se négocient pas.

---

## 2. Le propriétaire, et comment travailler avec lui

Il s'appelle Thomas. Il n'est pas développeur. Il construit ce Studio pour le vendre à des créateurs de marques et à
des entreprises de services.

**Parler avec lui**
- **Toujours en français simple, jamais un mot d'anglais**, même dans les petits messages d'avancement, les légendes
  de captures et les comptes rendus (demande du 10 novembre 2026). Pas de jargon : explique ce qui change pour lui,
  pas le code.
- Réponses **courtes et claires**. Ne repose jamais une question à laquelle il a déjà répondu.
- Il veut **voir**, pas lire : montre des captures (ordinateur et téléphone) ou une page en ligne qu'il peut ouvrir
  sur son téléphone. Une capture est vérifiée par toi avant d'être montrée.
- **Va lentement et juste.** Il l'a dit : « tu veux tellement faire les choses vite que rien ne se fait correctement ».
  Mieux vaut une étape parfaite qu'un ensemble à moitié fait.
- **Ne décide pas à sa place** : retirer un contenu, changer quelque chose de visible et d'important, choisir entre
  deux voies, tout cela se propose et attend son accord.
- Ce qu'il corrige une fois vaut pour toujours. S'il doit répéter une remarque, c'est un échec. Range chaque nouvelle
  règle dans `CLAUDE.md` (partie « Préférences du propriétaire ») ou dans la mémoire du projet concerné.

**Argent**
- **Aucun appel IA payant sans son accord écrit.** Avant chaque génération payante : le prix probable, puis tu
  attends son « oui ». Plafond des essais : 10 $ (exception écrite : 15 € pour l'essai final du thème sur mesure).
  Un appel au résultat incertain (erreur 5xx) n'est jamais relancé seul : tu le dis, puis tu demandes.
- Aucun nouveau fournisseur ni abonnement payant sans son accord.
- Côté client du Studio, jamais d'euros affichés pour l'IA : tout coût est un pourcentage du budget IA du mois.

**Sécurité et honnêteté**
- **Ne jamais demander ni accepter une clé d'API dans la conversation.** Les clés se saisissent dans Administration ›
  Fournisseurs IA (chiffrées) ou dans les secrets de l'hébergeur.
- **Ne rien inventer** : ni avis, ni chiffres, ni délais, ni certifications, ni résultats. Un manque s'écrit
  « [À compléter : …] ». Avant d'écrire qu'une information manque, cherche-la partout où le client a pu la donner :
  fiche de départ, carte « Ton activité » (`activity.company`), messages du fil. Le 11 novembre, des frais de
  livraison ont été pris à tort pour inventés : ils étaient dans le fil.
- Dis toujours clairement ce que tu as **vérifié réellement** (tests, captures, essai payant) et ce que tu n'as pas
  vérifié. Une image ou une page ratée est présentée comme ratée.
- **Jamais de personne générée** sans photo fournie par le client ou autorisation explicite.

**Git**
- Commits **en français**, sans aucun identifiant de modèle d'IA (ni dans les commits, ni dans les PR, ni dans les
  fichiers).
- **Fusion (PR + merge) seulement quand il le demande.** Après un travail terminé, demande « Je fusionne ? ».
- Le dépôt est **public** : aucun secret, aucune photo ou donnée privée d'un client.
- Avant chaque envoi : `npx tsc --noEmit` et `npx vitest run` (plus le skill **verifier-theme** pour `theme-base/` et
  `src/lib/theme/` ; la CI refuse la fusion au moindre échec de Theme Check). Un test dans `tests/` pour tout
  comportement modifié.

---

## 3. E-COM STUDIO IA : ce que c'est, à quoi ça sert

**Le produit.** Un Studio en ligne (Next.js 15, worker de tâches de fond, SQLite) qui transforme un produit (une
photo, un lien, quelques lignes) ou un service en :
- une **marque** : nom, slogan, couleurs, polices, logo, image de marque complète ;
- une **boutique Shopify** (ou WooCommerce, PrestaShop), ou un **site** pour une entreprise de services ;
- des **visuels**, des **vidéos**, des **publications**, des **publicités** et un **calendrier** de publication ;
- des **articles de blog** reliés au site.

**Pour qui.** Des créateurs de marques e-commerce (souvent un seul produit ou une petite gamme) et des entreprises de
services (artisans, restaurants, salons, cabinets, agences immobilières). Ce sont des débutants : le Studio doit faire
le travail d'une agence, sans qu'ils aient besoin de savoir le faire.

**Offres** (`src/lib/plans.ts`) : Créer 49 €, Développer 89 €, Dominer 129 € par mois ; un abonnement = un projet ;
chaque forfait a un budget IA (montré en %). « Découverte » n'est pas un forfait : on visite un Studio de
démonstration sans rien créer. Le compte administrateur suit son forfait comme un client.

**Principes du produit (à garder)**
- **Moteur local d'abord** : une retouche simple et sûre se fait sans IA (`src/lib/engine/local-first.ts`) ; l'IA
  garde ce qui est créatif, composé ou ambigu.
- **Bilingue français / anglais** (interface et contenus, `L("fr","en")`).
- Les coordonnées saisies ne sont jamais redemandées ni effacées.
- **Toute image finale est créée par un modèle d'images**, jamais un gabarit ni une photo de banque en silence
  (exception : photos Pixabay pour les sites de services, toujours signalées). Voir `docs/guide-images-ia.md`.

---

## 4. SINA, de A à Z

SINA est l'assistante du Studio. Elle doit se comporter comme une vraie conversation de travail (à la façon d'un
assistant de travail moderne) : elle **mène le client étape par étape**, pose ses questions au lieu d'inventer,
**voit** ce qu'elle commente (images, pages capturées), et peut **tout modifier dans le projet sur demande**. Elle
tutoie le client. Son nom affiché est SINA ; dans le code, c'est `syna-agent`.

Le parcours (`src/lib/syna-agent/journey.ts`, `JOURNEY_STEPS`) va de l'étape 0 à l'étape 13. Chaque étape est juste et
complète avant la suivante, et c'est le client qui valide. Les exigences numérotées sont dans
`docs/syna/EXIGENCES-PROPRIETAIRE.md` : c'est la référence des audits.

| Étape | Ce que SINA fait | État au 12 novembre |
|---|---|---|
| 0. Questions de départ | Toutes les questions utiles, une à la fois, jamais redemandées ; peut lire l'existant (site, réseaux) ; mode refonte | ouverte, essayée en réel |
| 1. 3 identités | Trois marques vraiment différentes : nom, slogan, palette, polices, fond (blanc, dégradé vif, sombre). Noms de produits du genre « Éclat de thé » ; services : trois genres, dont le mot fort (SOLSTICE) | ouverte, essayée |
| 2. 3 logos | Trois logos pour l'identité choisie, chacun dans une direction artistique différente, dessinés par OpenAI, carte blanche | ouverte, essayée |
| 3. Image de marque | Déclinaisons du logo, favicon, avatar, planche, charte PDF | ouverte, essayée |
| 4. 5 angles marketing | Cinq angles **émotionnels** (désir, peur, fierté, appartenance), sources réelles, jamais les places de marché ; le client peut en choisir plusieurs | ouverte, essayée |
| 5. L'activité complète | Infos de l'entreprise, stratégie de l'angle, prix, produits créés dans l'onglet Catalogue et reliés au site ; rien d'inventé | ouverte, essayée |
| 6. Thème du Studio ou sur mesure | Le client choisit. Studio : tous nos thèmes montrés tels quels, il choisit. Sur mesure : voir partie 6 | ouverte ; **sur mesure à refaire en grand** |
| 7. Mise en boutique du sur mesure | Le thème sur mesure devient une vraie boutique Shopify (et autres) modifiable | **pas branchée** |
| 8. Thème du Studio à la marque | Textes réécrits dans l'angle et son émotion, SEO, images créées | ouverte |
| 9. Publications | 3 groupes sans ressemblance, chaque format de réseau, titre + texte + hashtags, réseau indiqué | pas ouverte |
| 10. Publicités | Pareil pour les publicités images (guide `docs/guide-creatif-video.md` pour les vidéos) | pas ouverte |
| 11. Calendrier | 7, 15 ou 30 jours, posts par jour, heures vues avec le client, émojis si voulu, aucune image répétée ni reprise du thème ; sans publication automatique pour l'instant | préparé, pas ouvert |
| 12. Blog | Deux articles reliés au site | pas ouvert |
| 13. Rangement | Tous les fichiers rangés dans le Studio | pas ouvert |

**Modèles d'IA choisis par le propriétaire** (à respecter sauf demande de sa part) : réponses simples par le moteur
local gratuit, puis le plus petit modèle Claude ; un modèle Claude plus fort pour la conception du thème ; identités et
textes du site par Claude ; logos et photos des thèmes par OpenAI (GPT Image) ; autres images du Studio par
Qwen-Image 3.0 Pro ; vidéos par fal, plus tard. Tous les détails, avec leurs dates, sont dans `CLAUDE.md`.

**Ce que le propriétaire veut ressentir** : « l'émotion, l'émotion, l'émotion, et des images magnifiques » (9 novembre).
Tout texte fait **ressentir** l'angle choisi (une scène, un moment, une sensation), jamais une simple description.
Les boutons qui vendent portent le désir (« Retrouver l'été », pas « Choisir mon parfum »). Aucune accroche répétée,
aucun ordre au lecteur. Toute image est digne d'une campagne haut de gamme, avec le vrai produit du client. Le texte
se pose sur la partie calme de la photo.

---

## 5. Le niveau voulu

- **Qualité n° 1** : logos, textes, SEO, images et thèmes au niveau des meilleurs sites de 2026. Jamais une finition
  « années 2000 ». On **planifie avant de construire**, pour ne pas refaire dix fois la même chose.
- **Thèmes au niveau des meilleurs thèmes vendus** (ThemeForest, Shopify Theme Store) : voir
  `docs/etude-themes-themeforest.md`, l'étude de 65 thèmes du 11 novembre (ordre des sections page par page, rythme,
  ce qu'il ne faut jamais recopier).
- **Un Studio fini** : chaque bouton fait ce qu'il annonce, chaque page a un sens, rien ne casse sur téléphone, rien
  n'est « en démonstration » sans que ce soit dit, aucune donnée d'exemple ne fuit sur le site d'un client.
- **SINA fiable** : elle ne se trompe pas de produit (« on vend des confitures ou la marmite en cuivre ? »), ne
  dépense rien sans accord, ne refait jamais tout quand on lui demande un détail.

---

## 6. Priorité : le thème sur mesure

### 6.1 Ce que le propriétaire veut

1. Le client choisit la **famille** : Classique (calme, éditoriale) ou Moderne (titres énormes, mannequin détouré qui
   déborde de l'ouverture, couleurs franches). Il les voit **en image** avant de choisir. Jamais de mélange de familles.
2. Il choisit l'**ambiance** : claire ou sombre. Chaque section garde son fond d'origine (aucune inversion, décision
   du 10 novembre) ; SINA choisit des sections dont le fond convient.
3. SINA lui propose **2 thèmes montés**, avec une vraie **logique de conception** : chaque section a un rôle dans
   l'histoire de la page, choisi pour SON produit, SON angle et son émotion. Jamais une section « pour prendre une
   section ». Accueil : 8 sections au moins ; fiche produit : 7 au moins (plus si c'est mieux).
4. Il choisit, puis SINA écrit **tous les textes** (émotion de l'angle, SEO par page) et crée **toutes les photos** sur
   le thème choisi, prix annoncé avant.
5. Il le modifie ensuite **sur demande** : il désigne un élément (titre, texte, bouton, image, section), dit ce qu'il
   veut, et SINA ne change que lui. Il dispose aussi d'un **atelier** où il compose lui-même ses pages.
6. Le thème devient une **vraie boutique** Shopify (ou WooCommerce, PrestaShop), modifiable dans l'éditeur de la
   plateforme, ou un vrai site pour les services.

**Règles de montage** (toutes dans `CLAUDE.md`, partie « Thème sur mesure ») : une seule section « Produit vedette »
par page (en haut de la fiche, ou une fois sur l'accueil), dont les options (lots, offres, abonnement, couleurs,
livraison estimée, fidélité) suivent les **vraies données** du produit. Une seule section de cartes par page. Jamais
deux dispositions identiques à la suite. Aucun vide. Jamais une photo en double. Jamais de faux compte à rebours ni
d'offre d'exemple. Shopify : jamais de page de commande dans le thème, le panier mène au paiement de Shopify. Les photos
produit du client restent sur les emplacements produit ; toutes les autres images sont créées (une partie avec le vrai
produit en scène, les autres sur son univers, sans le recopier). Les photos impossibles à inventer (l'équipe, les biens
mis en vente) ne sont jamais créées : cadre « Photo à fournir » dans l'aperçu, jamais sur le site publié.

### 6.2 Ce qui existe aujourd'hui

- **Banque de sections** : `public/sections/` (`library.json`, `library.css`, `library.js`, photos d'exemple),
  208 sections (153 Classique, 55 Moderne ; certaines sont retirées ou réservées). Elle est préparée par `scripts/sections-library.py` depuis le catalogue,
  enrichie par `scripts/sections_neuves.py` (six sections ajoutées après l'étude des 65 thèmes) et corrigée par
  `scripts/sections_revue.py` (revue du propriétaire, section par section : `docs/revue-banque-sections.md`).
  Après une modification : `python3 scripts/sections_revue.py`, puis supprimer les fichiers
  `scripts/__pycache__/sections_neuves*` et `sections_revue*`. Ne jamais supprimer
  `scripts/__pycache__/section_buy_fix.cpython-313.pyc`, qui est suivi par Git. Familles :
  `src/lib/syna-agent/section-families.ts`.
- **Moteur** : `src/lib/syna-agent/custom-theme/` :
  - `theme.ts` : les données du thème et le contrôle bloquant `checkCustomTheme` ;
  - `design.ts` : la conception par SINA (`PAGE_PATTERNS` tirés de l'étude, `pageOrderGaps`, `varietyGaps` pour ne pas
    reprendre les mêmes sections d'un projet à l'autre) ;
  - `brand.ts` : l'écriture des textes ; `buy-block.ts` : le bloc d'achat ;
  - `render.ts` : l'aperçu vivant ; `builder.ts` : l'atelier ; `blank.ts` : les sections vierges ;
  - `shots.ts`, `gallery.ts`, `cutout-photo.ts` ;
  - `tools.ts` : les outils `custom.*` de SINA.
  Aperçu servi par `/api/projects/<id>/custom-theme` (paramètre `?builder=1` pour l'atelier). Règles écrites :
  `docs/montage-themes-sina.md`.
- **Essais réels** (Studio d'essai privé, données hors dépôt, non conservées) : « Éclat de thé » (thés et infusions)
  et « Heure Dorée » (confitures). Conception d'un thème par SINA : 1,06 € et 1,27 €.

### 6.3 Ce qui ne va pas (constaté par le propriétaire, du 9 au 11 novembre)

Le propriétaire a dû relever les défauts un par un, sur ses captures de téléphone. C'est exactement ce qu'il ne veut
plus vivre. Défauts trouvés :

- **Plans de pages illogiques** avant l'étude ThemeForest (« les plans qu'elle a sortis étaient dégueulasses »).
  C'est mieux depuis, mais il reste des défauts : deux sections de même rôle à la suite, toujours les mêmes sections
  d'un projet à l'autre (corrigé en partie).
- **Défauts visuels en série** : en-têtes affichés comme des sections entières, en-tête transparent qui ne flottait
  pas sur l'ouverture, vides à droite, sections collées, textes pas tous alignés, voile qui cachait le texte, menu
  burger cassé, écart avec le bloc d'achat, couleur du fond de l'en-tête, « 1 000 images » dans le bloc d'achat,
  flèches devenues « Bouton Bouton ». Chacun a été corrigé à la main, **sans contrôle visuel automatique** qui les
  aurait trouvés avant lui.
- **Données d'exemple dans les scripts des sections.** Jusqu'au 11 novembre, le diaporama d'ouverture remettait les
  textes de l'exemple sur le thé à chaque changement de photo, même sur un site écrit pour la marque. D'autres
  sections portent encore des données d'exemple dans leur script (photo à points, look complet, mannequins de
  l'ouverture Moderne, offres, panier d'exemple…) : à auditer toutes.
- **Écriture fragile.** Les textes du client sont posés par remplacement dans le HTML de la section. Quand une section
  de la banque est refaite, les textes déjà écrits restent sur l'ancienne version (cas des « garanties » d'Heure
  Dorée, parade ajoutée le 11 novembre : `staleMarkup`). Le modèle de données ne sépare pas le contenu (textes,
  photos, produits, réglages) de la présentation.
- **Pas d'export.** Le thème sur mesure ne peut pas encore devenir une boutique Shopify (étape 7). Sans ça, le
  produit ne se vend pas.
- **Atelier** utilisable mais encore fragile. Cinq en-têtes ne sont que des images de démonstration, pas de vrais
  en-têtes.

### 6.4 Ce qu'on attend de la nouvelle version (proposition à valider avec le propriétaire)

C'est une direction, pas un ordre : étudie, puis propose ton plan au propriétaire, en français simple, avant de
reconstruire.

- **Une section = un composant avec un vrai schéma**, comme une section Shopify 2.0 : réglages, blocs, emplacements
  d'images (avec leur rôle : produit, ambiance, photo à fournir), emplacements de produits, liens vers des pages. Le
  contenu du client vit dans des **données**, plus jamais dans du HTML retouché. Aucune donnée d'exemple dans le code
  d'une section : l'exemple est un jeu de données à part.
- **Une seule source pour tout** : l'aperçu du Studio, l'atelier, les sections vierges, l'export Shopify (sections
  Liquid + modèles JSON, Theme Check sans erreur), WooCommerce et PrestaShop, et le site publié pour les services sont
  produits à partir des mêmes composants et des mêmes données.
- **SINA conçoit** en choisissant des composants et en remplissant leurs données. Elle applique la logique des thèmes
  qui se vendent, explique ses choix au client en une phrase par section, et propose deux thèmes vraiment différents.
- **Contrôle visuel automatique, sans IA**, sur chaque page, en largeur ordinateur et téléphone, avant que le
  propriétaire ou le client ne voie quoi que ce soit : débordements, vides, éléments collés, texte illisible sur une
  photo, contrastes, alignements, images coupées ou en double, liens morts, boutons qui ne font rien, scripts en
  erreur. Plus un contrôle « à l'œil » par SINA sur les captures.
- **Banque à niveau** : chaque section revue, au niveau des meilleurs thèmes vendus, belle et vivante sur téléphone.
  Les sections importantes qui manquent sont ajoutées (voir l'étude des 65 thèmes). Les deux familles sont complètes,
  en-têtes et pieds de page compris.
- **Atelier fiable** : le client compose ses pages, déplace, ajoute ou retire des sections, choisit leur
  disposition, voit le résultat en vrai sur ordinateur et téléphone. Rien de cassé au clic.
- **Mise en boutique** : bouton pour envoyer le thème sur la boutique Shopify du client (thème non publié) ou
  télécharger le ZIP, avec produits, pages, menus et images.
- **Les projets déjà commencés** gardent leur thème : il est migré vers le nouveau modèle sans perte, ou reste lisible.

Questions encore ouvertes, à poser au propriétaire au bon moment (une à la fois) :
- garde-t-on la règle « une seule section de cartes par page » ?
- transforme-t-on les cinq en-têtes de démonstration en vrais en-têtes ?

---

## 7. Le reste du Studio à finir

- **Étapes 9 à 13 de SINA** : publications, publicités, calendrier, blog, rangement (partie 4). Les briques existent
  en partie (`src/lib/social-v2/`, `src/lib/ads-v2/`, `src/lib/image-v2/`, `src/lib/video-v2/`,
  `src/lib/syna-agent/calendar.ts`) : à relier au parcours, avec les mêmes exigences de qualité et d'accord avant
  dépense.
- **Thème du Studio** : 15 thèmes refaits d'après les maquettes de Thomas (`MAQUETTE_THEMES`,
  `src/lib/theme/theme-fit.ts`). Ils doivent rester parfaits. Démonstrations figées : ne jamais les recomposer sans
  consigne écrite (voir `CLAUDE.md`). Défaut connu à revoir : la démonstration ONDE.
- **Onglet Boutique** : aperçu en grand, « Désigner un élément », demande envoyée à SINA, carte du fil qui renvoie
  vers la Boutique.
- **Revue de tout le Studio** : chaque onglet, chaque bouton, chaque page, ordinateur et téléphone, en français et en
  anglais. Code mort et anciens parcours (anciennes maquettes `mockup.*`, anciens raccourcis) : retirés ou isolés,
  sans casser les projets existants.
- **Forfaits, budget IA, administration, sécurité** : à vérifier de bout en bout (`src/lib/billing*`,
  `src/lib/ai/access.ts`).

---

## 8. Ta liberté, et ses limites

**Tu peux** tout revoir et tout recoder, changer l'architecture, remplacer un module entier, réécrire la banque de
sections, si le résultat est meilleur et que tu sais l'expliquer simplement au propriétaire.

**Tu ne peux pas** :
- perdre les données des projets existants (marques, produits, thèmes, fichiers) : migration testée sur copie ;
- casser les 15 thèmes du Studio ni leurs démonstrations figées ;
- dépenser, publier pour de vrai ou ajouter un fournisseur payant sans accord écrit ;
- mettre un secret ou une donnée privée dans le dépôt ;
- fusionner sans qu'il le demande.

---

## 9. Méthode attendue

1. **Lire** : ce document, `CLAUDE.md`, `docs/syna/EXIGENCES-PROPRIETAIRE.md`, `docs/etude-themes-themeforest.md`,
   `docs/montage-themes-sina.md`, `docs/revue-banque-sections.md`, `scripts/syna-recette/REPRISE.md`,
   `docs/guide-images-ia.md`, `README.md`.
2. **Auditer** le Studio et le thème sur mesure tels qu'ils sont : lance le Studio
   (`scripts/syna-recette/lancer-agent.mts` pour un Studio d'essai privé, ou `npm run studio`), ouvre chaque page,
   capture, liste ce qui ne va pas. Aucun appel payant pendant l'audit.
3. **Proposer un plan** au propriétaire : court, en français simple, découpé en lots, chaque lot avec ce qu'il verra
   à la fin. Attendre son accord.
4. **Construire lot par lot**, une branche par lot. Pour chaque lot : tests, contrôle visuel automatique, captures
   ordinateur et téléphone vérifiées par toi, page en ligne qu'il peut ouvrir sur son téléphone, puis « Je
   fusionne ? ».
5. **Essais réels** (SINA sur un projet neuf, de l'étape 0 à la fin) seulement avec son accord et le prix annoncé.
   Un projet de produit ET un projet de service.

**Définition de « terminé »** : un client neuf crée son projet, SINA le mène de l'étape 0 à l'étape 13 sans erreur,
il obtient une marque, un thème sur mesure magnifique (deux propositions, puis le choix, les textes et les photos),
exporté sur Shopify sans erreur de Theme Check, ses publications, ses publicités et son calendrier. Tout est vérifié
en réel, sur ordinateur et sur téléphone, et le propriétaire l'a validé.

---

## 10. Où en est le dépôt (12 novembre 2026)

- Dépôt : `spacedevelopment01-max/Ecom-studio-ia`.
- Le travail du 9 au 12 novembre (atelier du thème, étude des 65 thèmes, six nouvelles sections, consignes de
  conception de SINA, variété, corrections du diaporama et des textes sur ancienne version) est sur la branche
  `claude/kind-euler-15ykgu`. Si elle n'est pas encore fusionnée dans `main`, pars d'elle.
- Le Studio d'essai privé et ses projets (Éclat de thé, Heure Dorée) ne sont pas dans le dépôt : il faut un projet
  neuf pour les essais réels (avec accord pour toute dépense).
