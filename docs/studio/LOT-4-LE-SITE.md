# Lot 4 : le site

**En cours (commencé le 16 novembre 2026).** Le lot n'est pas fini : il le sera quand SINA aura réussi seule, avec la
vraie IA, le site de plusieurs clients inventés. Ce document dit ce qui est construit, ce qui est vérifié, et ce qui ne
l'est pas.

## Le découpage accepté par le propriétaire (« Oui », 16 novembre 2026)

1. Le premier tronçon du thème unique, sur le moteur des thèmes.
2. SINA monte le site seule.
3. Cliquer sur l'aperçu pour modifier.
4. Le thème complet (8 en-têtes, 6 pieds de page, 6 pages produit, 6 pages de services, environ 60 sections, les six
   familles en coulisses) et les six démonstrations.
5. Les sorties (mise en ligne d'un site de services par SINA, transfert essayé sur de vraies boutiques d'essai), les
   engagements liés au site (boîte des demandes, devis, carnet de clients, vrais chiffres de vente) et le retrait des
   anciennes façons.

Prix : la construction des temps 1 à 3 ne coûte rien ; le premier site réel se fait sous un plafond de 10 € accordé par
le propriétaire, après le devis de SINA et son « oui ».

## Ce que la lecture du code a montré (et corrigé dans l'inventaire)

- Les pièces existaient déjà : 95 pièces qui prennent l'allure de la marque (`custom-theme/tenue*.ts`), avec en-tête,
  pieds de page, ouvertures, fiche produit, pièces de métier. La démonstration gratuite (`tests/sina-theme-demonstration`)
  monte un site d'électricien et une boutique de yoga : les deux ont été regardés en image le 16 novembre 2026, ils sont
  d'un bon niveau et ne se ressemblent pas. Le thème unique part donc de ces pièces, au lieu d'en réécrire.
- La chaîne existait aussi (conception, relecture, juge de l'originalité, textes, relecture des textes, photos,
  regards en image), mais éclatée en une dizaine d'outils, avec trois cartes d'accord, une question de famille, une
  question d'ambiance et deux concepts à choisir. Jamais essayée avec la vraie IA.
- Le pont vers le moteur des thèmes existait (`to-shopify.ts`, `install.ts`) : le site de SINA devient une version de
  thème que le moteur sait afficher, exporter et envoyer. Elle n'était jamais activée.
- « Modifier en cliquant » n'avait pas disparu pour les sites montés par SINA : la fonction était dans l'onglet
  Boutique, derrière un bouton « Désigner un élément », à réactiver à chaque clic.

## Ce qui est construit (temps 1 à 3)

- **Une seule façon, un seul accord** : l'outil `site.create` et la tâche de fond `syna.site`
  (`custom-theme/site-job.ts`). SINA conçoit tout le site, donne sa fiche à chaque produit, calcule le menu, écrit et
  relit les textes, pose les photos du client et crée celles qui manquent, regarde le résultat sur téléphone. La tâche
  se reprend après une coupure sans repayer la conception. Le plafond annoncé n'est jamais dépassé : si le site conçu
  coûte plus que ce qui reste, les photos sont créées d'abord pour l'accueil et la page qui vend, et le compte rendu le
  dit.
- **Le client ne choisit plus ni thème, ni famille, ni concept.** Les familles restent en coulisses (un projet sans
  choix prend le socle commun). Les anciennes façons ne sont plus proposées à SINA pendant le parcours (`registry.ts`,
  `OLD_SITE_WAYS`) : le choix « thème du Studio ou sur mesure », les 15 thèmes à monter, la famille, l'ambiance, les
  deux concepts, la conception à part, les retouches de l'ancien moteur. Elles seront retirées du code quand l'essai
  réel aura réussi (règle : rien n'est supprimé avant que ce qui le remplace soit prouvé).
- **La consigne de l'étape du site** est réécrite (`journey.ts`, `STEP_GUIDES[6]`) : ce qui manque se demande avant, une
  carte d'accord, un compte rendu honnête (une image ratée est dite ratée), les retouches en cliquant, la validation
  par le client. Aucun exemple tiré d'un projet d'essai. Le compte rendu entier de la création est gardé dans le
  parcours, parce que le fil coupe le résultat d'une tâche.
- **Le moteur des thèmes** : à la fin de la création, puis à la validation par le client (`custom.choose`), le site
  devient la version active du moteur, si rien d'inventé ni d'exemple n'y reste. Sinon la liste de ce qui manque est
  rendue à SINA, qui le demande au client.
- **Cliquer pour modifier** : le clic désigne tout de suite (plus de bouton à réactiver), sur chaque page, sur
  ordinateur et sur téléphone ; un bouton rend la navigation. Une photo posée en fond se désigne comme une photo, avant
  le lien qui la porte ; une cellule, une légende ou un champ se désignent aussi. La demande part à SINA avec la
  section, l'élément et son texte ; elle ne change que lui. Le site s'affiche dans la conversation à la fin de sa
  création, avec « Voir mon site et le retoucher » et « Je valide mon site ».
- **Les mots du client** : « ton site », jamais « thème sur mesure » ni « maquette », dans les cartes, les comptes
  rendus et les écrans touchés.

## Les six familles et les dispositions (demande du propriétaire, 16 novembre 2026)

Sa demande, avant l'essai payant : « construis les six familles en coulisses et le choix de la famille par SINA d'après
la planche, avec les sections en plusieurs dispositions : je veux que le premier vrai site soit fait avec son style ».

- **Les six familles** (`custom-theme/familles.ts`) : Maison chaleureuse, Épuré et éditorial, Naturel et sincère,
  Gourmand et joyeux, Confiance et savoir-faire, Spectaculaire. Chacune dit, d'après sa page « Six styles d'après les
  meilleurs sites » : à quoi on la reconnaît sur une planche, ce que font les meilleurs sites de cette allure, sa façon
  de photographier, son rythme, et ses choix permis (titres, boutons, cadres des photos, fond, petits textes, en-tête,
  pied de page, ouverture de l'accueil). Aucun nom de site ni de marque n'est donné à l'IA.
- **Le choix par SINA** : le concepteur reçoit les six familles et en choisit une en partant de la planche de marque
  (couleurs, polices, direction artistique, voix) ; le métier n'est qu'un indice. Il dit ce qui a décidé. Le directeur
  commercial, qui relit, vérifie ce choix contre la planche et le change s'il le faut : celui qui choisit n'est pas
  celui qui juge. Aucun appel de plus : le choix se fait dans la conception déjà prévue au devis.
- **Le contrôle du Studio, sans IA** : chaque écart aux choix de la famille est rendu au concepteur pour sa seule
  reprise ; ce qui en sort encore est ramené dans la famille (le réglage le plus typique), sans appel de plus. Le site
  est donc toujours fait dans son style.
- **Les photos** suivent la façon de photographier de la famille (avant : un même univers pour tous les sites).
- **En coulisses** : le client ne voit ni n'entend jamais le nom d'une famille ; SINA lui explique l'allure de son site
  en partant de sa planche.
- **L'ouverture** : règle du propriétaire, « grande photo pleine avec le titre dessus ». Chaque famille n'a que des
  ouvertures qui la respectent ; les ouvertures sans photo pleine (nom géant, collage, formes, lueurs) ne sont plus
  permises sur l'accueil.
- **Le thème unique, ses pièces seulement** : le concepteur ne reçoit plus les 208 anciennes sections (elles avaient
  leur allure à elles et ne partaient pas en boutique), seulement les pièces qui prennent l'allure de la marque.
- **Les dispositions** : 59 pièces sur 95 se bâtissent maintenant de plusieurs façons (49 avant). Vingt façons
  nouvelles sur onze pièces parmi les plus utilisées, dessinées en feuille de style seulement (même contenu, autre mise
  en page), relues en image sur téléphone et sur ordinateur dans trois allures (`docs/studio/lot-4/`) :
  - l'ouverture : sept façons, dont cinq en grande photo pleine avec le titre dessus (titre en haut, au centre, en bas
    à gauche, titre énorme en bas, bande pleine sur le bas de la photo) ; la photo créée sait où laisser la place du
    titre selon la façon choisie ;
  - les cartes produits (grille ; un produit vedette et les autres en petit ; liste, une ligne par produit) ;
  - les atouts (lignes ; grands numéros ; cartes), les questions (filets ; deux colonnes ; cartes) ;
  - l'appel final (bande sombre ; encadré ; phrase à gauche et bouton à droite), l'histoire (titre, photo, texte ;
    colonne étroite avec lettrine ; deux colonnes), le contact (formulaire puis carte ; coordonnées en grand ; deux
    colonnes) ;
  - la bande de photo, la grande photo et sa phrase, les tarifs (tableau ; cartes), le pied de page simple.
  Limites dites : 36 pièces n'ont encore qu'une façon (surtout des pièces propres à un genre de produit, le bloc
  d'achat, le panier, le compte, les pages légales) ; les rendus dans une boutique Shopify n'ont pas été regardés pour
  les nouvelles façons (le test automatique passe).
- **Exemples retirés des consignes** (règle : aucun exemple tiré d'un projet d'essai) : l'exemple des bougies et la
  règle « thé, infusions, café » dans la consigne du concepteur, « pour du thé » dans celles des photos.

## Le thème complet de la référence (demande du propriétaire, 16 novembre 2026)

Sa demande : « Construis tout ça avant l'essai payant, en reprenant les meilleures pièces existantes. Montre-moi les
en-têtes et les pieds de page en images dès qu'ils sont faits. » Construit en quatre chantiers menés en même temps,
sans IA ; planches montrées au propriétaire (`docs/studio/lot-4/`).

Le thème compte maintenant **124 pièces, dont 114 se bâtissent de deux façons ou plus**. Quatre modules de plus
(`tenue-coque`, `tenue-achat`, `tenue-metiers`, `tenue-pages`), chacun avec sa feuille.

| Décidé (référence, partie 15) | Construit | Où |
|---|---|---|
| 8 en-têtes, dont 2 méga menus avec leur version téléphone | Les 8 : classique, logo centré, transparent sur la photo, bande d'annonce, grand menu à colonnes avec images, grand menu avec produits mis en avant, services (téléphone et rendez-vous toujours visibles), menu plein écran. Les trois façons d'origine restent en plus. | `tenue-coque.ts` (`ENTETES`), `menu.ts` |
| 6 pieds de page | Les 6 : complet en colonnes, centré et minimal, lettre d'information, services, grand logo, réassurance et paiement | `tenue-coque.ts` (`PIEDS`) |
| 6 pages produit | Le bloc d'achat en 6 façons et 6 styles de page (simple, vente directe, haut de gamme, technique, alimentaire et soin, mode) ; 7 pièces nouvelles (tailles et couleurs, guide des tailles, offres par quantité, look complet, allergènes, avant et après, repères en pictos) | `tenue-achat.ts`, `styles-de-page.ts` |
| 6 pages de services | 6 styles (prestation simple, rendez-vous complet, devis d'artisan, fiche de bien, restaurant, atelier ou cours) ; 11 pièces nouvelles (biens, recherche de biens, fiche de bien en cinq pièces dont les étiquettes énergie, carte, réservation de table, rendez-vous en trois temps, inscription) | `tenue-metiers.ts`, `styles-de-page.ts` |
| Pages simples en 2 ou 3 mises en page | Contact, à propos, questions (liste et rubriques), 404, légales (volets, sommaire), blog, article, recherche, « bien reçu », boutique fermée, compte | `tenue-pages.ts` |
| Panier en 2 versions (tiroir et page) | Tiroir (étroit ; large avec livraison offerte et produits à ajouter) et page (empilée ; deux colonnes) | `tenue-pages.ts` |
| Chaque section en 2 à 4 dispositions | 114 pièces sur 124. Les 10 autres : cinq ouvertures sans photo pleine (non permises sur l'accueil, sauf la carte posée sur la photo), deux en-têtes et trois pieds de page qui sont eux-mêmes une des façons décidées | |
| 6 familles en coulisses | Faites ; les en-têtes et les pieds de page y sont reliés. Un site de services prend toujours l'en-tête de services ; les grands menus demandent au moins trois familles de produits | `familles.ts` |

**Les styles de page** fonctionnent comme les familles : le concepteur en choisit un d'après ce que le client vend, le
relecteur le vérifie, le Studio contrôle sans IA la façon du bloc d'achat et la pièce de métier, et ramène le bloc
d'achat dans le style en dernier recours. Pour un site de services, les pages du métier (biens, carte, ateliers,
visite, inscription) comptent comme pages obligatoires.

**Vraies données** : biens (rubrique Biens), carte du restaurant, prestations, horaires, téléphone, adresse, zone,
catalogue, offres par quantité, seuil de livraison offerte. Sans donnée, « à compléter » ; un bien, une équipe, un avis
ne s'inventent jamais.

**Ce qui n'est pas fait ou pas vérifié, dit clairement**
- Rien de nouveau n'a été regardé dans une vraie boutique Shopify, WooCommerce ou PrestaShop. Le contrôle automatique de
  la conversion passe ; l'en-tête transparent et l'en-tête collé y reposent sur des règles jamais vues en vrai.
- Dans Shopify, aucun script ne part : le tiroir de panier ne s'ouvre pas seul après un ajout, la recherche de biens
  devient une demande à l'agence, les offres par quantité ne partent pas (aucune donnée), la barre d'achat collée non
  plus.
- Une seule fiche de bien (le bien mis en avant), pas encore une page par bien.
- L'équipe, les ateliers, les fournées, les réalisations n'ont pas de rubrique dans le Studio : le rédacteur les écrit
  avec les faits du client.
- Les moyens de paiement n'ont aucune source : « à compléter » dans l'aperçu.
- Les couleurs des étiquettes énergie sont écrites de mémoire : à vérifier contre la norme.
- « Bien reçu » n'est relié à aucun formulaire.
- Les largeurs de 320 px sont mesurées (rien ne déborde) mais peu regardées à l'œil.
- Défaut connu : sur l'en-tête transparent, la barre reste sans fond au-dessus du sous-menu ouvert en haut de page.
- Défaut d'origine non corrigé : le bloc d'achat « simple » sur ordinateur, quand il a plus de huit éléments.
- Les textes et les photos d'exemple de la bibliothèque sont encore ceux d'une maison de thé (remplacés au montage) ;
  les pièces nouvelles ont des textes neutres. À neutraliser pour toute la bibliothèque.
- Le cahier `docs/sina-savoir/sections-a-tenue.md` ne décrit pas encore les quatre nouveaux modules.

## Le style de vente directe, l'achat réel et les remises (demandes du propriétaire, 16 novembre 2026)

Ses mots : « Si une section manque ou ne convient pas au style dropshipping, crée-la ou adapte-la » ; « tout doit
marcher pour de vrai dans Shopify, WooCommerce et PrestaShop, pas seulement s'afficher : les lots, le pack, la barre
d'achat qui reste visible » ; « le stock restant ne s'affiche qu'avec le vrai stock, jamais de fausse urgence » ;
« L'arrière plan en lune c'est pas beau je veux plus ça » ; « Oui ajoute le droit remises ».

- **La fiche de vente directe** (planche : `docs/studio/lot-4/fiche-vente-directe-complete.jpg`) : achat serré, offre
  du moment, packs où chaque article a sa couleur et sa taille avec cadeau et étiquette « le plus populaire », le
  dessous du bouton (guide des tailles, délai, moyens de paiement, garanties, questions), fenêtre d'offre qui recueille
  l'e-mail, barre d'achat qui reste visible, panier de côté qui s'ouvre après un ajout, rappel vers l'achat, coloris
  en scène. Sur ordinateur, dans l'aperçu : la photo reste à gauche, la colonne d'achat défile à droite.
- **Le site entier** d'après le modèle regardé : accueil, collection avec ajout rapide, page d'arrivée d'une publicité
  (clé « arrivee ») qui reçoit d'office son en-tête et son pied à elle à la place de ceux du site, page des avis.
- **L'urgence et la preuve existent, mais sur de vraies données** : promotion avec sa date de fin, stock suivi, prix
  de comparaison, avis réels, chiffre déclaré par le client. Le Studio ne les fabrique jamais ; sans la donnée, la
  pièce ne s'affiche pas.
- **L'achat réel** : un contrat commun (`window.tnBoutique`) et un adaptateur par plateforme. Essayé pour de vrai sur
  un WooCommerce et un PrestaShop installés ici (pack de trois en trois versions, cadeau, total juste). Shopify :
  écrit et contrôlé avec des réponses simulées, jamais sur une vraie boutique.
- **Les remises ne sont jamais calculées par le thème** : c'est la boutique qui les tient. Un prix de lot ou de pack
  ne s'affiche que si la boutique confirme la remise (outil `shop.discounts_check`, preuve de moins de 24 h). Le droit
  « remises » (`write_discounts`) est demandé à la connexion Shopify ; une boutique reliée avant doit être reliée à
  nouveau, sinon SINA donne le pas à pas. **L'application Shopify du Studio doit porter ce droit** (à faire par le
  propriétaire dans son tableau de bord Shopify).
- **Plus jamais de photo dans une arche** : le cadre n'est plus proposé, plus permis, plus affiché (`sansArche`).
- **Feuille du site** : trop longue pour la seule section d'en-tête de Shopify, elle est coupée entre deux règles et
  la suite part dans des sections « Feuille du site ».

Limites dites au propriétaire : dans Shopify, la fiche sur ordinateur garde l'ancienne mise en page (les deux colonnes
ne sont faites que dans l'aperçu ; WooCommerce et PrestaShop non vérifiés) ; le Studio n'a encore aucun endroit où le
client donne ses avis ni ses moyens de paiement (rien ne s'affiche donc) ; dans le panier de côté, « + », « − » et
« Retirer » ne changent pas encore le vrai panier ; le pack « côte à côte » déborde un peu sur téléphone avec ses
textes d'exemple ; la page d'arrivée sur WooCommerce et PrestaShop repose sur un repli jamais essayé ; aucun outil de
SINA ne crée encore les remises dans Shopify (elle vérifie et guide) ; rien n'a été vu dans une vraie boutique Shopify.

## Les modèles dans Shopify (demande du propriétaire, 16 novembre 2026)

Ses mots : « Shopify range les modèles par catégorie : une fiche n'est proposée pour un produit que si elle est dans la
catégorie Produits, et c'est pareil pour les pages et les collections. Au temps 5, sur la boutique d'essai, montre-moi en
captures l'éditeur de Shopify : chaque fiche dans Produits, chaque page dans Pages, et dans la page d'un produit, sa
fiche choisie dans "Modèle de thème". Ajoute un modèle par collection quand SINA dessine des pages de collection
différentes, relié à sa collection, et donne des noms clairs à tous les modèles. »

- **Fait dans la mise en boutique** (`to-shopify.ts`, `integrations/shopify.ts`) : chaque fiche est un modèle de la
  catégorie Produits (`product.fiche-<produit>`), notée sur son produit ; chaque page est un modèle de la catégorie Pages
  avec un nom en français simple (`page.a-propos`, `page.informations-legales`, `page.questions`…, qui sert aussi
  d'adresse) ; une page de collection dessinée pour une famille (clé « shop-<famille> ») devient le modèle
  `collection.<famille>`, noté sur sa collection à l'envoi ; les autres familles gardent le modèle commun. Le concepteur
  sait qu'il peut dessiner une page de collection propre à une famille, seulement quand cela sert le visiteur.
- **À prouver au temps 5, sur la boutique d'essai du propriétaire, en captures de l'éditeur de Shopify** : chaque fiche
  dans Produits, chaque page dans Pages, chaque modèle de collection dans Collections, et dans la page d'un produit, sa
  fiche choisie dans « Modèle de thème ». Rien de cela n'a encore été vu dans un vrai Shopify.

## Boutique sans photos du client (décision du propriétaire, 17 novembre 2026)

À la question « pour une boutique, SINA ne crée pas le site tant qu'elle n'a pas une vraie photo de chaque produit ? »,
sa réponse, mot pour mot : « Ou alors elle lui dit qu'elle peux monter le site mais qu'elle devra importer ses photos
par la suite. » SINA ne bloque donc pas. Construit et vérifié sans IA (`tests/sina-boutique-sans-photos.test.ts`,
planche avant et après regardée en image) ; **pas encore essayé avec la vraie IA**.

- **Le produit ne s'invente jamais.** À l'essai réel, des sacs « imaginés » remplissaient la galerie de la fiche et des
  scènes. Un produit sans photo du client ne se montre plus dans aucune photo créée : la règle est dite à ceux qui
  décrivent les photos et rappelée dans le dossier ; le Studio la tient sans IA (une description qui montre le produit
  est refaite une fois, sinon la photo n'est pas créée, et c'est dit). Les photos montrent la matière, l'outil,
  l'atelier, le lieu, le geste sans personne, l'usage sans le produit. Avec les photos du client, rien ne change, sauf
  un défaut corrigé : la vraie photo n'était jointe à une scène que si la description citait un emballage.
- **« Ta photo ici ».** Dans l'aperçu, la galerie du bloc d'achat et les cartes d'un produit sans photo montrent un
  emplacement propre, à la tenue de la marque, qui se désigne d'un clic. Plus rien n'est créé ni payé pour ces
  emplacements. En boutique (Shopify), un produit sans image part en carte sans image. Un site créé avant cette date
  garde la photo de sa fiche.
- **Dit avant.** `site.create` refuse de se lancer tant que SINA n'a pas prévenu le client et noté sa réponse (note de
  mémoire « photos des produits », comme pour les preuves) ; la carte de dépense le rappelle en une ligne. S'il envoie
  ses photos, l'outil `catalogue.photos` les pose sur les produits avant la création.
- **Importer ensuite.** La photo posée sur un produit (dans le fil, ou dans l'onglet Produits) paraît dans sa galerie
  et ses cartes sans refaire le site ; l'aperçu de l'onglet Boutique se recharge tout seul. Seule une photo envoyée par
  le client est acceptée, jamais une image créée.
- **Pas « prêt à partir » sans photos.** Tant qu'un produit n'a aucune photo, le site ne devient pas la version du
  moteur : « photos de tes produits à importer : … » dans le compte rendu et dans « à compléter ».
- **Le contrôle des photos créées** ne juge plus la fidélité sans vraie photo jointe, ne refuse plus un gros plan voulu
  pour « produit coupé », et ne prend plus une remarque de goût pour un défaut (7 photos refusées sur 25 à l'essai).
- **Le budget de photos.** Le devis comptait les photos de la fiche une fois, alors que chaque produit a sa fiche : le
  site conçu en demandait 48 pour 34 payées, et seuls l'accueil et la première fiche recevaient les leurs. Le
  concepteur reçoit maintenant ce nombre et la règle de répartition ; le Studio recompte après lui
  (`photo-budget.ts`). Le prix annoncé ne change pas.

Ce qui reste : l'essai réel ; dans Shopify, les petites vignettes (recherche, panier) d'un produit sans image gardent
un cadre vide ; le champ libre d'un produit (« ta date », une gravure) n'existe pas au catalogue : c'est une décision.

## Le devis (calculé le 16 novembre 2026 avec les tarifs vérifiés, pas encore mesuré)

| | Coût probable | Plafond jamais dépassé |
|---|---|---|
| Site de services | 5,70 € | 18,93 € |
| Boutique, un produit | 5,95 € | 19,63 € |
| Boutique, quatre produits | 7,24 € | 23,82 € |

Le plafond est haut parce qu'il est annoncé avant la conception : le nombre de pages et de photos n'est connu
qu'après. Ce sont des devis ; le coût réel sera relevé sur le premier site.

## Le tour des sections (17 novembre 2026)

**La demande du propriétaire** : « ouvre toutes les sections une par une mobile et ordi et tu corriges tous les
défauts, j'en veux plus un seul ».

**Le banc** (`scripts/tour-des-sections/`, mode d'emploi dans son `LISEZMOI.md`) : chaque pièce à tenue du thème
(165 pièces) et trois pages composées en situation (accueil d'une boutique, fiche produit, accueil d'un métier de
services) sont montées avec les fonctions du Studio, dans trois tenues (calme, gras, capitales), à 320, 390 et
1 280 px, avec quatre contenus (l'exemple, un vrai petit site, un contenu difficile, une liste d'un seul élément), et ce
qui se replie est ouvert. Des détecteurs mesurent chaque défaut (débordement, texte coupé ou caché, bouton coupé ou
collé, contraste lu sur les pixels, mot coupé, nombre coupé, pavé gras, ombre recouverte, vide, photo ou nom d'exemple,
arche…), chacun prouvé sur une page fautive et une page saine (`tests/tour-des-sections.test.ts`). Gratuit : aucune IA.

**Avant, après** (défauts distincts : le même défaut revu d'une tenue, d'une largeur ou d'un état à l'autre compte
une fois) :

| Tour | Défauts distincts | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| Premier tour (14 h 49) | 2 785 | 850 | 1 127 | 808 |
| Dernier tour (20 h 47) | 10 | 0 | 2, corrigés ensuite (pièce revérifiée) | 8 |

Les mineurs qui restent sont expliqués : un mot inventé de 24 lettres du contenu « difficile » qui ne peut se couper
qu'au milieu ; une petite ligne sur une photo floue au contraste de 2,76 par endroits ; des marques « À compléter » de
l'état « exemple », jamais montrées chez un client ; le bloc d'achat et ses pièces voisines de la fiche, voulus sans
séparation. `connus.json` est vide. Chaque pièce a aussi été regardée à l'œil, sur téléphone et sur ordinateur : ce
regard a trouvé des défauts qu'aucun détecteur ne voyait (une quantité écrite chiffre par chiffre, des coches jaunes
invisibles sur fond clair, des vignettes de trois tailles, un panneau sombre vide quand une photo manque), corrigés.

**Les règles communes retenues** :

- rien de coupé : un mot passe à la ligne entier ou avec son trait d'union, un nombre jamais ; un texte trop long pour
  sa place (macaron, étiquette d'offre posée sur une photo) n'est jamais tronqué : il ne se pose pas ;
- jamais un bouton coupé : un bouton, son bord et son ombre restent entiers ; une ombre qui finit sa section garde sa place ;
- aucun vide : une photo qui manque emporte son cadre, ou laisse un aplat doux qui garde la place ; une section qui
  n'était qu'une photo ne se rend pas ; un produit sans photo montre « Ta photo ici » (cartes, carte de vente, ajout rapide) ;
- aucun exemple chez un client : ni nom de produit d'exemple (titre du bloc d'achat, résultats de recherche), ni
  texte d'exemple propre à un métier (préparation, colis : textes neutres) ;
- la couleur de la marque, quand elle sert à écrire ou à dessiner sur le fond (étoiles, coches, barres), passe par sa
  version lisible (`--tn-accent-texte`) ;
- ce qui reste collé en défilant se colle sous l'en-tête collant, un menu ouvert s'arrête au bas de l'écran ;
- un titre sur une photo claire a son voile ;
- dans une tenue aux titres gras, un nom long dans une case étroite passe en texte courant gras plutôt que de se casser.

**Pas vérifié** : Safari sur iPhone (le banc n'a que Chromium) ; la mise en boutique Shopify des pièces corrigées (seul
l'aperçu du Studio est rendu) ; les boutons « droit » et « étiquette » et les autres petits textes de tenue (seulement
pilule et ombre) ; les survols, le focus, les étapes 2 et 3 d'un parcours, les animations.

## Vérifié, et non vérifié

- Vérifié sans IA : compilation ; tests du nouveau chemin (`tests/sina-site-en-une-fois.test.ts`) et tests mis à jour ;
  le clic sur l'aperçu essayé dans le Studio privé, sans clé d'IA, sur la boutique de démonstration (titre, carte
  produit, bouton).
- **Pas encore vérifié** : tout ce qui demande la vraie IA (aucun site n'a encore été créé par SINA pour de vrai) ; la
  retouche faite par SINA après un clic ; les photos posées en fond désignées une par une dans le Studio privé (écrit
  et testé, pas encore revu à l'écran).

## Ce qui reste à faire dans le lot

- L'essai réel : Bécane d'abord. Ses angles (lot 3) n'ont pas été gardés dans la copie des clients d'essai : il faut
  les recréer (environ 1 €), puis valider son activité, avant le site.
- L'aperçu vient encore du rendu propre à SINA ; le rendu du moteur des thèmes sert à la mise en ligne et aux boutiques.
  Les deux ont été comparés en image sur la démonstration (identiques à l'œil). Un seul rendu pour l'aperçu : au temps 5,
  avec la mise en ligne.
- Les temps 4 et 5, et le retrait des anciennes façons.

## La variété entre les sites (17 novembre 2026)

Devant les deux premiers sites de SINA (Bécane et Atelier Vasco), le propriétaire : « 4 fois la même section entre les
deux alors qu'on a une centaine de sections, et surtout elles ont la même disposition alors qu'il y a 2 ou 3 possibilités
de placement » ; « il y a déjà la moitié des sections qui sont identiques. J'appelle pas ça de la variété moi ».

- **Le constat, compté** : 17 pièces communes sur 30 et 35 ; 18 fois la même pièce avec la même disposition ; sur
  l'accueil, 4 pièces communes, dont les questions avec la même disposition.
- **Pourquoi les contrôles d'avant n'ont rien vu** : l'un ne réagissait qu'à 70 % de sections en commun sur l'accueil et
  la fiche ; l'autre ne comparait qu'avec les sites du même métier (Bécane répare des vélos, Vasco coud des sacs).
- **La règle** (`custom-theme/variete-sites.ts`), contre les 12 derniers sites montés pour d'autres marques, tous
  métiers, et les 30 derniers du même métier, même anciens (« oui » du propriétaire : deux concurrents ne se ressemblent
  jamais) : accueil au plus 2 pièces en commun ; site entier (hors pages pratiques) au plus un quart ; sur une même sorte
  de page (accueil contre accueil, fiche contre fiche), une pièce reprise prend toujours une autre disposition qu'un des
  4 derniers sites ou des 10 derniers du même métier. L'en-tête, le pied de page et l'ouverture suivent leur famille et ne
  sont pas comptés.
- **Aucune porte de sortie** (le propriétaire : « elle doit y arriver, on ne laisse pas de porte de sortie sinon elle va
  la prendre ») : le concepteur reçoit les 8 derniers sites (pièces et dispositions) et la règle ; le contrôle du Studio
  rend les écarts à sa seule reprise (aucun appel de plus) ; puis le Studio corrige lui-même, sans IA : une disposition
  prise devient une disposition libre, une pièce de trop est remplacée par une autre pièce du même moment de la page,
  qui passe les mêmes vérifications que celles du concepteur (elle va à ce genre de site, sa preuve est au dossier) et ne
  crée aucun autre défaut. Une conception qui ne tient toujours pas la règle est refusée : rien n'est enregistré.
- **Jamais d'impasse** : une pièce sans autre pièce libre pour son moment (le bloc d'achat d'une fiche, ou une pièce dont
  la seule autre est déjà posée ailleurs sur le site) n'est pas comptée ; les pages pratiques changent de disposition
  quand une est libre, sans refus ; les dispositions se comparent page par page et avec les sites les plus proches, sinon
  une pièce que les premiers sites ont posée dans toutes ses dispositions serait interdite pour toujours.
- **Vérifié sans IA** : sur les deux sites de l'essai, Vasco comparé à Bécane est refusé tel qu'il est sorti, puis le
  Studio le corrige seul jusqu'à tenir la règle (`tests/variete-entre-sites.test.ts`) ; dans les essais de conception
  de bout en bout (IA simulée), les remplacements sont justes (les questions deviennent les questions par rubriques, les
  garanties la livraison, les produits la grille de vente). **Pas encore vérifié avec la vraie IA** : il faudra un essai
  de création.
- **Reste à proposer** (dit au propriétaire, en attente de son oui) : une vraie signature visible pour chaque famille
  (fonds, cadres, rythme), et une police de titres différente d'une marque à l'autre (trois marques d'essai sur quatre
  ont reçu la même grosse police grasse).

## L'identité différente pour chaque marque (17 novembre 2026)

Devant Bécane et Atelier Vasco, le propriétaire : « les thèmes entre les deux marques sont très identiques ». Les deux
marques avaient reçu la même police de titres (Archivo Black), trois marques d'essai sur quatre une Archivo très grasse,
et deux fonds clairs presque pareils (#FFF6E0 et #FFFCF7). Le site reprend la police et la palette de la marque : deux
marques pareilles donnent deux sites pareils. Sa demande (« Fait les 5 », point 1) : une identité vraiment différente
pour chaque marque, sa police de titres, ses couleurs, son fond, jamais repris d'une marque récente ; et sa règle du
jour : « elle doit y arriver, on ne laisse pas de porte de sortie sinon elle va la prendre ».

- **Ce que SINA reçoit** : au moment d'écrire chaque planche (et à sa reprise), les polices de titres et les fonds clairs
  des 20 dernières marques du Studio (autres clients ; jamais leur nom), avec la règle : jamais la même police de
  titres, ni une autre graisse de la même police ; un fond clair nettement différent, sauf un fond « blanc ».
- **Le contrôle du Studio, sans IA, sans porte de sortie** (`src/lib/syna-agent/variete-marques.ts`), juste après chaque
  planche écrite puis sur la série finale, **avant toute image payante** (le logo et la planche montrent la police et
  les couleurs) :
  - une police de titres déjà prise par une marque récente, ou par une autre identité de la même proposition, est
    remplacée par une police du catalogue de la même allure (onze allures tirées des descriptions du catalogue : très
    grasse, demi-grasse, légère, condensée, d'affichage, ronde, empattements gras, fins ou de lecture, manuscrite,
    chasse fixe), libre, en accord avec la police de texte (quand titres et textes étaient de la même police, les
    textes suivent) ; le nom de la police écrit dans la planche suit. Archivo et Archivo Black comptent comme une seule
    police (de même Cormorant et Cormorant Garamond, Nunito et Nunito Sans) ;
  - un fond clair trop proche d'une marque récente est remplacé par un fond pâle pris dans les teintes de la marque
    elle-même (celle de son fond, de son accent, de son bouton, de sa surface), le plus proche possible de celui de
    SINA, sans aucun défaut de contraste de plus. Choix fait : cet ajustement sans IA plutôt qu'une reprise demandée à
    l'IA, parce qu'il est sûr, gratuit, et ne touche qu'une couleur de fond. La couleur du bouton, les couleurs données
    par le client et ses polices ou couleurs gardées ne changent jamais ; un fond « blanc » reste un blanc pur (règle du
    propriétaire : un blanc par série).
  - **Le seuil** : écart de couleur perçu (CIEDE2000) d'au moins 10. Les deux fonds de l'essai sont à 6,9 et le
    propriétaire les voit pareils ; un crème et un blanc pur (#FFF6E0 et #FFFFFF) sont à 9,4 et se confondent encore
    d'un site à l'autre ; à 10, un fond pâle a une couleur à lui (crème contre rose poudré : 11,1 ; contre lavande :
    16,6).
- **Vérifié sans IA** (`tests/variete-marques.test.ts`, et un essai de bout en bout dans `tests/sina-chaine-marque.test.ts`
  avec l'IA simulée) : une identité qui reprend l'Archivo Black d'une marque récente reçoit une autre police très grasse,
  libre, et la relecture voit déjà la série corrigée ; #FFF6E0 contre #FFFCF7 est jugé trop proche et remplacé ; avec
  treize marques récentes aux fonds pâles, un fond qui s'écarte de toutes est encore trouvé ; sans marque récente, rien
  ne change ; deux identités d'une même proposition n'ont jamais la même police de titres (avant, c'était seulement
  signalé à l'IA, sans garantie).
- **Pas encore vérifié** : avec la vraie IA (il faudra un essai de création de marque) ; à l'œil, la beauté des fonds
  de remplacement sur une vraie planche et un vrai site. Une marque en fond « blanc » garde son blanc : deux sites
  blancs restent possibles, la différence vient alors de la police et des couleurs.
