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

**Mesuré ensuite** (coût compté par le Studio, tâche de création du site) : Bécane, services, 5,30 € ; une boutique,
premier essai, 7,25 € ; Atelier Vasco, trois sacs, 11,98 € (17 novembre : 8,40 € de réflexion et d'écriture, 2,80 € pour
25 photos, 0,78 € de contrôles). Le devis du 18 novembre pour refaire le site d'Atelier Vasco : 10,70 € probables, 34,19 €
au plus.

**Plafond resserré** (18 novembre 2026, le propriétaire : « L'écart de prix annoncés par sina est beaucoup trop large et
fait même peur le plus au haut », puis « Yes » à la proposition) : le plafond annoncé est le prix probable et sa moitié
(`MARGE_PLAFOND_SITE`, `site-job.ts`), soit environ 16 € au lieu de 34 € pour Atelier Vasco. La création le tient : le
montage reçoit tout le reste du plafond ; une relecture ou une reprise de texte ne se lance que s'il reste ensuite de
quoi créer toutes les photos encore à faire (`relectureTient`, `photosACreer`, `brand.ts`) ; le montage ne se limite à
l'accueil et à la page qui vend que si même son prix probable ne tient plus. Ce qui est laissé de côté est dit dans le
compte rendu. Testé sans IA (`tests/sina-site-plafond-resserre.test.ts`) ; pas encore essayé avec la vraie IA.

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
- **La suite** (« Fait les 5 », 17 novembre 2026) : une identité différente pour chaque marque (police de titres et fond,
  partie « L'identité différente pour chaque marque »), une signature visible pour chaque famille, des réglages à
  l'intérieur des sections, le signe de la marque plus visible, et un contrôle par l'image (parties suivantes).

## L'identité différente pour chaque marque (17 novembre 2026)

Devant Bécane et Atelier Vasco, le propriétaire : « les thèmes entre les deux marques sont très identiques ». Les deux
marques avaient reçu la même police de titres (Archivo Black), trois marques d'essai sur quatre une Archivo très grasse,
et deux fonds clairs presque pareils (#FFF6E0 et #FFFCF7). Le site reprend la police et la palette de la marque : deux
marques pareilles donnent deux sites pareils. Sa demande (« Fait les 5 », point 1) : une identité vraiment différente
pour chaque marque, sa police de titres, ses couleurs, son fond, jamais repris d'une marque récente ; et sa règle du
jour : « elle doit y arriver, on ne laisse pas de porte de sortie sinon elle va la prendre ».

- **Ce que SINA reçoit** : au moment d'écrire chaque planche (et à sa reprise), les polices de titres des 20 dernières
  marques du Studio et les fonds clairs des 6 dernières (autres clients ; jamais leur nom), avec la règle : jamais la
  même police de titres, ni une autre graisse de la même police ; un fond clair qui s'en écarte tout en restant doux ;
  un fond blanc pur est toujours permis.
- **Le contrôle du Studio, sans IA** (`src/lib/syna-agent/variete-marques.ts`), juste après chaque planche écrite puis
  sur la série finale, **avant toute image payante** (le logo et la planche montrent la police et les couleurs) :
  - **La police, sans porte de sortie** : une police de titres déjà prise par une des 20 dernières marques, ou par une
    autre identité de la même proposition, est remplacée par une police du catalogue de la même allure (onze allures
    tirées des descriptions du catalogue : très grasse, demi-grasse, légère, condensée, d'affichage, ronde, empattements
    gras, fins ou de lecture, manuscrite, chasse fixe), libre, en accord avec la police de texte (quand titres et textes
    étaient de la même police, les textes suivent) ; le nom de la police écrit dans la planche suit. Archivo et Archivo
    Black comptent comme une seule police (de même Cormorant et Cormorant Garamond, Nunito et Nunito Sans).
  - **Le fond clair, toujours doux** (reprise du 17 novembre au soir : les premiers fonds de remplacement étaient trop
    colorés, et comparer à 20 marques poussait client après client vers des fonds de plus en plus marqués) : comparé aux
    **6 dernières marques** seulement ; trop proche (écart de couleur perçu, CIEDE2000, sous 10), il est remplacé par un
    fond pâle pris dans les teintes de la marque (son fond, puis son bouton, sa surface, son accent), **toujours dans les
    bornes d'un fond doux : clarté 95 au moins, saturation 7 au plus** (mesures CIELAB), sans défaut de contraste de plus,
    le plus proche possible de celui de SINA. **Si aucun fond doux ne s'écarte assez, c'est le blanc pur** (règle du
    propriétaire du 17 novembre : « La couleur blanche en fond est autorisée si jamais ») : la différence se fait alors
    par la police (elle reste stricte), les couleurs de la marque, l'allure du site et le contrôle par l'image. Une
    teinte tirée de la marque passe avant le blanc seulement si elle s'écarte assez. Le blanc pur n'est jamais refusé
    pour ressemblance, et le fond blanc d'une marque récente n'est pas un obstacle (sinon, aucun fond doux ne pourrait
    jamais s'en écarter assez, et tout finirait en blanc). La couleur du bouton, les couleurs données par le client et
    ses polices ou couleurs gardées ne changent jamais ; un fond « blanc » reste un blanc pur (un blanc par série).
  - **Les bornes, choisies sur une planche de rendus** (douze marques inventées, titre et bouton posés sur leur fond de
    remplacement, contre six marques récentes aux fonds presque blancs, le cas le plus serré) : à clarté 94 et
    saturation 10, le fond le plus écarté devient un rose ou un vert d'eau qu'on remarque ; à clarté 95 et saturation 7,
    il reste un blanc teinté, calme, et la marque se lit d'abord par son bouton et son titre.
  - **Ce que la règle donne en pratique** (planche refaite avec le blanc pur) : la zone des fonds doux est petite (son
    plus grand écart est d'environ 12 à 16), donc elle ne contient que deux ou trois fonds doux qui s'écartent de 10
    entre eux. Contre six marques récentes dont deux fonds doux (un crème, un bleu très pâle), 2 marques sur 12
    reçoivent un vert très pâle tiré de leurs couleurs, les 10 autres le blanc pur ; dès que trois ou quatre fonds doux
    sont récents, presque tout passe au blanc. La variété des fonds vient donc surtout du blanc et des fonds colorés
    choisis par SINA quand ils sont déjà assez différents ; la police reste la vraie garantie.
  - **Le seuil de 10** : les deux fonds de l'essai sont à 6,9 et le propriétaire les voit pareils ; un crème et un blanc
    pur (#FFF6E0 et #FFFFFF) sont à 9,4.
- **Vérifié sans IA** (`tests/variete-marques.test.ts`, et un essai de bout en bout dans `tests/sina-chaine-marque.test.ts`
  avec l'IA simulée) : une identité qui reprend l'Archivo Black d'une marque récente reçoit une autre police très grasse,
  libre, et la relecture voit déjà la série corrigée ; #FFF6E0 contre #FFFCF7 est jugé trop proche et remplacé par un
  fond doux assez écarté ; quand aucun fond doux ne s'écarte assez, c'est le blanc pur ; le blanc n'est jamais refusé
  et un fond blanc récent ne gêne pas ; le fond ne se compare qu'aux 6 dernières marques, la police aux 20 ; sans marque récente, rien ne change ; deux identités
  d'une même proposition n'ont jamais la même police de titres.
- **Pas encore vérifié** : avec la vraie IA (il faudra un essai de création de marque) ; sur un vrai site et une vraie
  planche (la planche de contrôle pose seulement un titre et un bouton sur chaque fond). Deux marques en fond « blanc »
  gardent leur blanc : leur différence vient de la police et des couleurs.

## Le contrôle par l'image (17 novembre 2026)

**La demande**, validée par le propriétaire (« Fait les 5 ») : « Un dernier contrôle par l'image, sans IA et gratuit :
avant de livrer, le Studio prend une capture de l'accueil (téléphone et ordinateur) et la compare aux captures des
derniers sites : formes, masses de couleur, place des photos. Si deux accueils se ressemblent trop à l'œil, le site est
corrigé avant d'être montré. » Et sa règle du jour : « elle doit y arriver, on ne laisse pas de porte de sortie ».

**La méthode** (`custom-theme/ressemblance.ts`, capture dans `custom-theme/shots.ts`, `shootAccueil`) :

- L'accueil est capturé en entier sur téléphone (390 pixels de large) et sur ordinateur (1 280), photos chargées,
  animations coupées. Une deuxième capture est prise aussitôt, chaque photo peinte en gris, les textes posés dessus
  gardés : c'est l'image des **masses**. Le contrôle compare ainsi la place des photos, pas ce qu'elles montrent.
- L'**empreinte** d'un accueil : la page en bandes de 48 pixels (téléphone) ou 60 (ordinateur), chaque bande en 4 ou 8
  cases ; chaque case garde sa couleur moyenne (clarté et teinte, comme l'œil les perçoit) et son grain ; chaque
  section a sa vignette (8 lignes) ; les couleurs dominantes de la page, photos comprises ; l'épaisseur des traits
  d'encre (lettres fines ou très grasses, vues de loin).
- La **ressemblance** (0 à 100), dans chaque vue, puis la moyenne des deux : le haut de la page (les deux premiers
  écrans, la première impression, 10 %), le rythme de la page entière (bandes alignées avec souplesse, une section plus
  haute s'aligne sur la même section de l'autre, 10 %), les couleurs dominantes (5 %), l'allure des lettres (35 %) et
  les **sections jumelles à l'œil** (même disposition des masses, même ton, même hauteur, 40 %).
- Les poids ont été choisis par le calcul : parmi toutes les répartitions, celle qui sépare le mieux les cas jugés trop
  proches des cas différents. La mise en page seule ne suffisait pas : Bécane et Vasco n'ont presque rien de commun à la
  règle des pièces, et pourtant le propriétaire les voit pareils ; ce qu'ils ont en commun à l'œil, c'est la même
  allure de lettres (la même police très grasse) et deux sections jumelles (les questions, la phrase sur une photo
  pleine). C'est ce que mesurent les deux plus grosses parts.

**Le seuil : 48**, calibré sur de vraies captures, gratuites et sans IA, faites avec l'état du dépôt que le propriétaire
a vu (avant les signatures des familles) :

| Comparaison | Téléphone | Ordinateur | Moyenne | Attendu |
| --- | --- | --- | --- | --- |
| Un même site capturé deux fois | 100 | 100 | 100 | trop proche |
| Bécane contre Atelier Vasco | 51,0 | 46,5 | **48,8** | trop proche (jugé par le propriétaire) |
| Vasco contre ses quatre tenues (autre police, autre tenue) | 71,7 à 89,3 | 82,6 à 97,3 | 77,5 à 93,3 | trop proche (« le même site ») |
| Les tenues de Vasco entre elles | 61,1 à 82,8 | 77,8 à 94,4 | 69,5 à 87,2 | trop proche |
| Le site de Vasco sous une autre marque (police et palette de Braise, puis de Trempe) | 60,4 et 78,8 | 65,5 et 85,0 | 63,0 et 81,9 | trop proche |
| Un autre accueil pour Braise (autres pièces, autres dispositions, fonds sombres et de couleur) contre les neuf autres | 29,7 à 45,2 | 31,4 à 47,2 | 32,1 à **46,2** | différent |
| Un autre accueil pour Trempe (encore d'autres pièces et dispositions) contre Braise, les tenues, la démonstration | 40,3 à 42,4 | 39,0 à 49,8 | 39,7 à 46,1 | différent |

Le plus bas des cas trop proches fait 48,8, le plus haut des cas différents 46,2 : le seuil est entre les deux. La
marge est mince (1,3 et 2,6 points) : elle est dite ici et la correction vise sous le seuil, pas au ras. Non jugés,
pour information : Vasco contre la boutique de yoga de la démonstration, 42,9 ; Vasco avec toutes ses dispositions
changées mais ses photos, ses textes et sa marque, 53,0 ; Trempe (Archivo, même lignée que la police de Bécane et de
Vasco) contre Vasco, 50,6 : la même lignée de police est désormais refusée entre deux marques
(`variete-marques.ts`). Fichier des empreintes : `tests/fixtures/ressemblance/empreintes-essai.json.gz`.

**La correction, sans IA** (`custom-theme/controle-image.ts`, branchée dans `site-job.ts` après le montage, avant que le
site devienne la version active) : l'accueil est comparé aux sites de la règle de variété (les 12 derniers, tous
métiers, et les 30 derniers du même métier). Trop proche d'un site, le Studio retouche puis recapture, jusqu'à 12
essais et 20 captures : d'abord une autre disposition pour chaque section jumelle de ce site (la moins prise par les
sites récents), sinon un autre fond ou un autre alignement de titre permis par la signature de sa famille, puis une autre façon d'ouvrir l'accueil permise par la famille, puis un réglage de la tenue permis par
la famille, puis les autres sections, du haut vers le bas. Une retouche n'est gardée que si elle ne crée aucun défaut
(aucun défaut bloquant du thème en plus, la règle de variété entre sites et la rotation de l'ouverture tenues, l'allure
dans les choix de la famille, la signature de la famille, aucune photo d'exemple qui réapparaîtrait) et si elle rend l'accueil moins proche. Les
pièces ne changent jamais : leurs textes, écrits pour le client, restent justes. L'empreinte est gardée avec le site
(mémoire du projet, avec la version du site et de la bibliothèque) ; celle d'un site plus ancien est capturée la
première fois qu'il sert de comparaison.

**Sans porte de sortie** : si la correction ne suffit pas, le site **n'est pas présenté comme fini** : il ne devient pas
la version active, la première ligne du compte rendu (« ressemblance ») le dit à SINA, qui le dit au client en premier
et lui propose de reprendre la conception avec une autre direction (payant, accord écrit avant) ; l'étape reste « à
revoir », avec « pas encore fini ». J'ai choisi cela plutôt qu'un échec de la tâche : le montage déjà payé n'est pas
perdu, et rien n'est montré comme fini. Si le navigateur de captures manque, le contrôle n'est pas fait et c'est dit de
la même façon (première ligne et « à revoir ») ; le site n'est pas bloqué pour une panne du serveur, comme le regard en
image.

**Essai sans IA sur les vraies données de l'essai** (copie, rien d'enregistré dans les vraies) : Vasco contre Bécane fait
48,9 ; le Studio le corrige seul en deux retouches (la phrase sur photo passe de « voile » à « moitié », les questions
de « filets » à « deux colonnes ») et tombe à 42,1, en 22 secondes.

**Le navigateur en production** : l'image de production (`Dockerfile`) installe Chromium (`CHROMIUM=/usr/bin/chromium`)
dans le même conteneur que le site et le worker (`npm start` lance les deux) ; c'est le même navigateur que les regards
en image et les captures du Studio. Vérifié dans le fichier, **pas sur le serveur en ligne**.

**Vérifié sans IA** (`tests/controle-par-image.test.ts`) : les chiffres du tableau sur les empreintes de l'essai ; un
site jumeau d'un site déjà monté est corrigé et passe, ses pièces inchangées, son empreinte gardée ; quand rien ne
suffit, « trop-proche » avec la note ; sans navigateur, « non-fait » avec la raison ; dans la création du site, un site
trop proche ne devient pas la version active et le compte rendu commence par « ressemblance » ; avec un vrai
navigateur, un accueil capturé deux fois fait 100, et le même accueil monté pour une autre marque (autre police, autres
couleurs) fait 71,5 et passe à 40,8 en sept retouches sans IA (cinq dispositions, une deuxième pour une même section,
l'ouverture).

**Pas encore vérifié** : avec la vraie IA (il faudra un essai de création) ; sur l'allure nouvelle des familles (les
signatures, posées en même temps par une autre aide, changent les sites : le seuil a été calibré sur l'allure que le
propriétaire a vue, il faudra le revoir sur les prochains vrais sites ; pour information, rendus avec ces signatures
encore en cours, Bécane contre Vasco tombent à 34,0 : différents) ; le temps réel sur le serveur (environ 8
secondes par capture ici ; après un changement de l'allure de la bibliothèque, les empreintes des sites comparés sont
refaites à la création suivante : jusqu'à 42 sites, quelques minutes de plus) ; le jugement du propriétaire sur les cas « différents » fabriqués pour l'essai.

## Signatures des familles, réglages des sections, signe de la marque (17 novembre 2026)

**La demande du propriétaire**, devant les deux premiers sites de SINA (Bécane, famille gourmande ; Atelier Vasco,
famille épurée) : « les thèmes entre les deux marques sont très identiques ». Le même site rendu dans cinq allures se
reconnaissait toujours : même fond crème du haut en bas, mêmes cadres droits, même rythme ; presque toutes les familles
avaient le cadre « droit » et le fond « uni ». Il a validé trois chantiers (« Fait les 5 ») ; puis, pour la planche :
« je veux surtout voir un type de thème avec tous les réglages différents dans le type ».

**Ce qui est construit** (`custom-theme/signatures.ts`, feuille `public/sections/tenue-familles.css`) :

- **Les réglages d'une section** (point 3), en plus de sa disposition : son **fond** (clair, doux, sombre, couleur de la
  marque), son **alignement** (titre à gauche ou centré) et la **taille de son titre** (normal ou grand). Choisis par le
  concepteur (champ `reglages` de chaque section), rendus par attributs, contrôlés. Le fond redéfinit les couleurs de la
  tenue SUR la section, calculées lisibles par le Studio (contraste de 4,5 au moins entre le texte et son fond, quelle que
  soit la palette) : aucune des 165 pièces n'a été réécrite. 116 pièces prennent un fond, 79 un alignement et une taille
  de titre ; la coque, l'ouverture, le bloc d'achat, les pages pratiques et les dispositions déjà sombres gardent le leur.
  Une même pièce dans une même disposition a ainsi jusqu'à seize allures.
- **La signature de chaque famille** (point 2), d'après ses descriptions : un rythme de fonds propre à la famille et un
  dessin propre, posé par le Studio sur tout le site (`data-tn-famille`) :
  - Maison chaleureuse : des panneaux de couleur chaude aux grands coins ronds qui alternent avec le clair, photos
    arrondies, beaucoup d'air, titres centrés ;
  - Épuré et éditorial : fond presque blanc du haut en bas, filets fins entre les parties, petits textes en capitales
    espacées, jamais de fond de couleur ;
  - Naturel et sincère : fonds teintés de la couleur de la marque qui alternent, photos sur un passe-partout coloré,
    petits textes en étiquettes ;
  - Gourmand et joyeux : chaque partie est un bloc posé comme un objet (bord épais, coins ronds, ombre décalée), les fonds
    changent à chaque bloc, dont la couleur franche de la marque ; sur un très petit téléphone (moins de 360 px), le bloc
    devient une bande bordée pleine largeur, pour garder aux textes toute leur place ;
  - Confiance et savoir-faire : sections sombres qui alternent avec le clair, un trait épais de la couleur d'action
    au-dessus de chaque titre, un bouton fort ;
  - Spectaculaire : surtout sombre, titres immenses en capitales, bandes pleines de la couleur vive, fort contraste.
- **Le signe de la marque** (point 4). Avant, le signe n'était qu'une phrase dite au client : il n'apparaissait nulle
  part sur le site. Maintenant le concepteur choisit sa forme (étiquette ronde, tampon, ligne entre deux filets, couture,
  ruban) et son texte (28 signes au plus, tiré du produit ou du métier) ; le Studio le pose dans le grand titre de
  l'ouverture, d'un moment du milieu et de l'appel final de l'accueil, et à la fin de chaque page importante (jamais sur
  le panier, le compte, les mentions). Aucun dessin : une forme simple et du texte.

**Sans porte de sortie** : le concepteur reçoit les réglages, les six signatures et le signe ; le contrôle du Studio,
sans IA, rend les écarts à sa seule reprise (fond interdit dans la famille, deux fonds teintés pareils à la suite,
accueil sans le rythme de sa famille, signe incomplet) ; puis le Studio corrige seul, en dernier, après tout ce qui
déplace des pièces : il garde les choix qui tiennent dans la famille et pose le reste (un signe sans forme prend celle
de la famille, sans texte le nom de la marque). Ces écarts ne bloquent jamais une autre correction sans IA. Un site
déjà enregistré, sans réglages, prend quand même la signature de sa famille au rendu. Tout part aussi dans Shopify
(attributs, couleurs, feuille, signe).

**La variété entre les sites** : je n'ai pas compté les réglages comme une disposition différente. Le propriétaire
reprochait « la même disposition » d'une pièce entre deux sites ; une même mise en page dans une autre couleur resterait
la même disposition, et la compter à part aurait affaibli la règle. Les réglages s'ajoutent à la règle : avec elle, deux
sites n'ont déjà ni les mêmes pièces ni les mêmes dispositions ; les réglages changent en plus l'allure de chaque pièce.
Le contrôle par l'image de l'accueil (construit en même temps, enregistrement 1caa0157) mesure l'effet : avec les
signatures, Bécane contre Vasco tombe à 34 de ressemblance (le seuil est 48 ; 48,8 avant).

**Vérifié en image, sans IA** (banc du tour des sections, étendu : six tenues « famille-… » aux couleurs et polices
inventées, l'option `--fond`, et `scripts/tour-des-sections/familles.ts` pour les planches) :

| Tour | Rendus | Bloquants | Importants |
|---|---|---|---|
| Chaque pièce qui prend un fond, dans les fonds doux, sombre et de la marque (deux palettes, 390 et 1 280 px) | 3 216 | 12 au premier passage → 0 (pièces mesurées gardées dans leur fond) | 6 → 0 |
| Toutes les pièces dans les six familles (contenu difficile, 320 et 1 280 px ; puis vrai et difficile à 390 px ; puis gourmand, trois contenus, 320 px) | 4 512 + 5 400 + 1 300 | 3 + 10 → 0 | 136 + 4 → 0 (beaucoup dus à des polices plus larges ou plus hautes que celles du banc d'avant) |
| Les trois pages en situation dans les six familles et les trois tenues de base (vrai et difficile, 320, 390 et 1 280 px) | 162 | 0 | 0 |
| Le tour de base complet (trois tenues, quatre contenus, 320 et 1 280 px), pour vérifier que rien n'a reculé | 8 478 | 0 | 0 |
| Les pièces retouchées après ce tour de base, dans les neuf tenues, aux trois largeurs | environ 1 500 | 0 | 0 |

Mineurs qui restent (dits, jamais montrés comme bloquants) : un petit texte posé sur une photo dont le contraste descend
par endroits sous 3, deux sections voisines de même fond dans la page d'essai, un mot inventé de 24 lettres coupé.

Corrigé en chemin, pour tous les sites (pas seulement les familles) : le nom de l'en-tête rogné en hauteur avec une
police haute (Bodoni, Oswald) ; un grand chiffre ou une note qui touchait sa légende avec ces polices ; la couleur de la
marque écrite en texte, assombrie sans changer de teinte quand elle se lit mal (entre 3 et 4,5 de contraste) ; le voile
de la grande photo à phrase, qui descend avec une phrase sur quatre lignes ; le bouton « étiquette » sur trois ou quatre lignes sur téléphone (il n'était pas rendu
par le banc) ; un nom de carte de huit lettres coupé sans trait d'union sous 360 px ; un titre d'ouverture très long
sur six lignes ; les chiffres d'un bien qui se recouvraient ; le petit texte de l'ouverture « titre en bas » sur
ordinateur, plus lisible.

Planches montrées au propriétaire : une famille (gourmand et joyeux, celle qui a le plus de choix permis) dans six
combinaisons de réglages, même marque, même contenu, sur téléphone et sur ordinateur ; les six familles côte à côte.
Chacune regardée à l'œil.

**Pas vérifié** : la vraie IA (le concepteur n'a pas encore choisi lui-même ses réglages et son signe ; l'essai de
création le montrera) ; Safari sur iPhone (le banc n'a que Chromium) ; la mise en boutique Shopify en vrai (le thème
exporté porte les attributs, la feuille et le signe, essais automatiques seulement ; dans Shopify chaque section a son
propre cadre, donc le filet entre deux sections sombres du spectaculaire n'y est pas) ; les survols et les animations.
**Pas fait** : un réglage de la taille de la photo (il dépend trop du dessin de chaque pièce pour être général ; les
trois réglages faits valent pour toutes les pièces qui ont un fond clair et une tête).

## Chaque famille dans tous ses réglages (18 novembre 2026)

**La demande du propriétaire**, après la planche de la famille gourmande : « Tu as fait ça pour tous les styles et toutes
les sections ? », puis « Oui fais les ». Les cinq autres familles ont chacune leur planche : même marque, même contenu,
six combinaisons de réglages permis par la famille (titres, boutons, fonds, en-tête, ouverture, dispositions), sur
téléphone et sur ordinateur (`scripts/tour-des-sections/familles.ts --une-famille <famille>`, réglages dans
`familles-variantes.ts`). Chaque planche regardée à l'œil. Son avis : « Compliqué à dire juste en image et le thème pas
rempli en vrai donc on verra par la suite » : le jugement se fera sur un vrai site rempli par SINA.

Corrigé en chemin, pour tous les sites : ce qui reste collé en défilant se pose sous l'en-tête au nom centré (deux
rangées sur ordinateur) ; l'étiquette du titre massif ne passe plus sous l'en-tête posé sur la photo ; le voile de
l'ouverture « dans la photo » et celui de la citation sur photo suivent le texte jusqu'au bout ; le sceau de garantie et
le grand nom du pied de page avec les titres fins ; le titre de la carte « Essayer » centrée reste dans la carte ; le nom
d'un repère du quartier n'est plus coupé (« Commerce / s ») ; le petit mot sous une photo penchée du journal.

Le banc, rendu plus juste : un mot qui disparaît dans une photo (contraste sous 1,5) est important ; un texte de la page
caché sous l'en-tête est bloquant (le banc avait laissé passer l'étiquette du titre massif) ; les chevauchements se
mesurent sur la hauteur des lettres, plus sur la boîte de la police (fausses alertes avec Oswald et Bodoni).

| Tour | Rendus | Bloquants | Importants |
|---|---|---|---|
| Les sept planches (six familles, plus la comparaison), téléphone et ordinateur | 84 | 0 | 0 |
| Tour de base complet | 12 717 | 0 | 0 |
| Tour des six familles (390 et 1 280 px) | 16 956 | 0 | 0 |

Mineurs qui restent : des petits textes posés sur photo dont le contraste descend par endroits sous 3 (jamais sous 1,5),
des marques « À compléter » penchées (état d'exemple, fond jaune fixe), deux mots inventés de 24 lettres coupés.

## L'essai réel du 18 novembre 2026 : Atelier Vasco refait (21,35 €)

Accord du propriétaire : une boutique, environ 10,70 €, 16,18 € au plus (après le plafond resserré). Claude n'a joué
que la cliente (« refais-moi tout le site depuis le début, toujours sans mes photos »).

| Tentative | Dépensé | Ce qui s'est passé | Corrigé |
|---|---|---|---|
| 1 | 4,64 € | conception refusée : « La personne derrière la marque » posée sans le portrait de la cliente | pièce non proposée ni permise sans les images du client, remplacée par le Studio sinon ; SINA lui demande sa photo |
| 2 | 4,48 € | arrêtée en route : le budget du mois de la cliente d'essai était presque épuisé, la carte ne l'avait pas vu | le budget du mois doit couvrir le plafond avant la carte (« pas lancé, rien n'est payé ») |
| reprise | 0 € | une étape ratée était gardée comme faite ; puis la demande avait changé avec la correction 1 | un échec n'est plus gardé comme étape faite |
| 3 | 9,79 € | site créé, 12 pages, sous le prix probable | voir ci-dessous |

Réponses de SINA à la cliente : 2,44 €. SINA a dit honnêtement chaque échec, avec son coût réel.

**Ce que le propriétaire a vu** : « tout ça pour me refaire le même thème que le premier ??? En plus avec plusieurs fois
la même sections sur la page d'accueil et produit ». Compté : accueil, 7 pièces sur 10 identiques au premier site ;
fiche, 6 sur 10 ; deux fois des étapes numérotées et deux fois un texte et une photo en alternance sur l'accueil. Et un
sac imaginé sur la carte et la fiche du cabas.

**Les causes** (toutes dans le Studio, pas dans la réflexion de SINA, dont chaque choix était argumenté) :
- la règle de variété ne comparait que les sites des autres clients : le site actuel du même client n'était ni montré
  au concepteur ni contrôlé ;
- refaire gardait, pour chaque section de même nom, ses anciens textes et ses anciennes photos (`keepWork`) : le site
  « refait » était en partie une copie, et le sac imaginé du 17 novembre (avant la règle) est revenu ainsi ;
- une même allure n'était refusée que deux fois à la suite, pas plus loin dans la page.

**Corrigé, sans IA** (« Oui », 18 novembre) : le site actuel compte comme un site déjà fait, en tête, nommé « le site
actuel du client, qu'il fait refaire », et ses partitions sont à ne pas reprendre ; refaire repart d'une page blanche ;
avant de refaire, SINA demande ce qui ne plaisait pas et le note (« ce qui ne plaisait pas dans le site »), sa réponse
va au concepteur ; une même allure ne revient jamais sur une page (règle 6 bis, cahier « ordre et variété »), avec un
dernier recours sans IA (`fitFormes`). Tests : `tests/sina-refaire-site-different.test.ts`.

**Preuve gratuite** sur le site refait réel : le contrôle le refuse désormais (accueil : 6 pièces en commun avec le
site actuel, au plus 2 ; site entier : 21 sur 28) et relève 7 allures en double sur 5 pages (l'accueil : deux
étapes numérotées et deux textes et photos en alternance ; chaque fiche : la description en volets puis les questions en
volets ; l'aide). L'allure se juge sur la disposition posée (une même pièce peut se voir en volets, en texte posé ou en
file de photos). Peuvent revenir sur une page, parce que les déroulés de page les demandent à plusieurs moments sans
autre allure possible : la liste de lignes courte, la bande d'appel, la file de photos, la bande étroite. **Pas vérifié** : un
nouveau site conçu par la vraie IA avec ces règles (payant, à décider avec le propriétaire).

**Le Studio d'essai qui se coupait** (18 novembre 2026, le propriétaire : « ça ne doit pas se couper ») : c'est la copie
privée d'essai, dans la session de travail de Claude, que la machine d'essai arrête au bout de 2 heures ou à la fin d'une
autre tâche de fond ; le Studio en ligne n'est pas concerné. Le gardien `scripts/syna-recette/garder-allume.sh` le
relance seul s'il s'arrête, ou si son travailleur des tâches de fond s'arrête (vérifié : revenu en 8 secondes après une
coupure du Studio entier, et après une coupure du travailleur seul). Une création coupée reprend seule à sa dernière
étape faite, sans repayer ce qui est fait (`tests/taches-fond-robustesse.test.ts`) ; un appel payant coupé en plein
milieu n'est jamais relancé d'office (règle du propriétaire) : la création s'arrête avec son explication et se reprend
à la demande. Le gardien lui-même s'arrête avec la session de travail : il se relance au début de chaque essai.

## L'audit des appels payés (18 novembre 2026, sans IA)

Le propriétaire, après un troisième échec payé : « corrige tout ce genre de défauts avant de relancer ». Relevé de tous
les appels à l'IA des essais réels depuis le 16 novembre (21 sortes d'appels, plus de 600 appels) et de toutes les tâches
de fond.

| Ce qui a été relevé | Mesuré | Corrigé |
|---|---|---|
| Conception du site coupée avant la fin | 6 fois à 32 000 jetons ; réponses de 30 000 à 46 000 | sortie à 64 000 ; coût prévu 1 € (0,80 avant) |
| Plan des textes coupé avant la fin | 2 fois à 18 000 ; réponse la plus longue 24 107 | sortie à 36 000 ; plafond 0,90 € (0,25 avant), coût prévu 0,45 € (0,09 avant) |
| Relecture des photos : plafond presque atteint | jusqu'à 0,198 € pour 0,20 € ; sortie 5 836 pour 8 000 | plafond 0,30 €, sortie 12 000, coût prévu 0,18 € (0,06 avant) |
| Relecture des textes : coût prévu trop bas | 0,18 € en moyenne pour 0,09 € prévu | coût prévu 0,18 € |
| Écriture d'une section : plafond juste | jusqu'à 0,14 € pour 0,15 € | plafond 0,20 € |
| Toutes les autres réponses | la plus longue au tiers de sa place | rien à changer |
| Tâches de fond en échec | 3, toutes des créations de site | causes déjà corrigées (photo du client, budget du mois, réponse coupée) |

Devis d'une boutique de trois produits après l'audit : **11,56 € probables, 17,34 € au plus** (les coûts prévus suivent
désormais les mesures). Les créations mesurées : 5,30 €, 7,25 €, 11,98 € et 9,79 €.
