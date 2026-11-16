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

## Le devis (calculé le 16 novembre 2026 avec les tarifs vérifiés, pas encore mesuré)

| | Coût probable | Plafond jamais dépassé |
|---|---|---|
| Site de services | 5,70 € | 18,93 € |
| Boutique, un produit | 5,95 € | 19,63 € |
| Boutique, quatre produits | 7,24 € | 23,82 € |

Le plafond est haut parce qu'il est annoncé avant la conception : le nombre de pages et de photos n'est connu
qu'après. Ce sont des devis ; le coût réel sera relevé sur le premier site.

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
