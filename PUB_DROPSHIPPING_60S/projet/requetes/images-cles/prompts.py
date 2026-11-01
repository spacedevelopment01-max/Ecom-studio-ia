# Consignes des images clés (format du guide : type, cadrage ; fond ; objets ; décompte ; cadre ; lumière ; interdits).
import json
STYLE = "Photogramme vertical d'un long métrage d'animation. Même rendu hybride 2D/3D que les images fournies : volumes sculptés, peau, cheveux et tissus peints à la main avec grain de pinceau, fins traits d'encre, aucune surface plastique, aucun aspect jouet."
PERSO = "Le personnage est exactement le même homme que sur la première image fournie : cheveux châtains en bataille en mèches épaisses, sourcils épais et mobiles, yeux noisette, nez long légèrement busqué, barbe légère, veste prune foncé ouverte sur un t-shirt crème, jean bleu foncé, baskets blanches usées. Ses mains ont cinq doigts bien formés."
CHAMBRE = "Le décor est la même chambre que sur la deuxième image fournie : petit appartement transformé en bureau, le soir, mur vert sapin sombre, bureau en bois, lampe de bureau allumée, cartons bruns unis empilés sans aucune étiquette, plante verte, parquet."
LAMPE = "la petite lampe LED portable : un galet noir mat de la taille d'une main, dont la face porte un anneau lumineux doré, exactement comme sur l'image de la lampe fournie"
SANS = "Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane. Aucune autre personne. Aucun objet supplémentaire."
AVEC_LOGO = "Le seul texte visible est le mot « luciole » du logo fourni, reproduit exactement avec la même forme de lettres, en minuscules. Aucun autre texte, aucune autre lettre, aucun chiffre, aucun autre logo, aucun filigrane. Aucune autre personne. Aucun objet supplémentaire."
MARQUE = "La marque fictive de la lampe s'appelle « luciole » : son logo est l'emblème d'une luciole lumineuse vert lueur avec deux ailes crème au-dessus du mot « luciole » en lettres arrondies crème, exactement comme sur l'image du logo fournie. Couleurs de la marque : prune nuit, vert lueur, ambre doux, crème et graphite."
R = {"perso": "@fichier:ref/perso.png", "chambre": "@fichier:ref/chambre.png", "lampe": "@fichier:ref/lampe.png", "logo": "@fichier:ref/logo-luciole.png", "fin": "@fichier:ref/fin-film-p5.png"}
P = {}
P["A_fin"] = (["perso", "fin"], f"""Reprends exactement le décor, la lumière, le cadrage et le style de la deuxième image fournie (la même chambre, même plan large vertical), avec le même personnage. {STYLE}

Format vertical 9:16, plan large, caméra fixe à hauteur de poitrine, identique à la deuxième image. Il est au centre, visible de la tête aux genoux.

{CHAMBRE} La fusée a disparu : il ne reste qu'une fine traînée de fumée blanche qui sort par le bord droit de l'image, à hauteur de plafond. Quelques feuilles blanches vierges retombent dans l'air.

{PERSO} Son bras droit est encore tendu vers le bord droit du cadre, paume ouverte, comme s'il venait de pousser quelque chose hors de l'image. Il regarde l'objectif avec une grimace sarcastique : un sourcil très haut, la bouche tordue sur le côté. Ses cheveux sont encore ébouriffés par le souffle.

La scène contient exactement 1 personnage, 1 bureau, 1 lampe de bureau, des cartons, 1 plante, quelques feuilles blanches et 1 traînée de fumée.

Lumière chaude de la lampe de bureau, reflets orangés qui s'éteignent, faible profondeur de champ.

{SANS}""")
P["B"] = (["perso", "chambre"], f"""{STYLE}

Format vertical 9:16, plan rapproché poitrine, caméra à hauteur des yeux, tout près de lui. Il se penche vers l'objectif, au centre de l'image.

{CHAMBRE} Le décor est flou derrière lui.

{PERSO} Il a l'air de partager un secret : sourire en coin, un sourcil levé, regard complice planté dans l'objectif. Sa main droite est levée à côté de son visage, le pouce et le majeur prêts à claquer des doigts.

La scène contient exactement 1 personnage et le décor de la chambre.

Le haut de l'image garde un peu d'air au-dessus de ses cheveux, qui sont entiers.

Lumière de cinéma : lampe de bureau chaude sur un côté du visage, reflet bleuté de l'écran de l'autre, contre-jour sur les mèches.

{SANS}""")
P["C_debut"] = (["perso", "chambre"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est au centre, visible de la tête aux cuisses.

{CHAMBRE}

{PERSO} Il vient de claquer des doigts : sa main droite est levée au-dessus de son épaule, doigts encore claqués, et il regarde autour de lui avec un sourire émerveillé. De petites étincelles bleues jaillissent de ses doigts.

La scène contient exactement 1 personnage, le décor de la chambre et quelques étincelles bleues.

Ses mains et ses cheveux sont entiers dans le cadre.

Lumière chaude de la lampe de bureau, premiers reflets bleu nuit qui envahissent les murs.

{SANS}""")
P["C_fin"] = (["perso", "chambre"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est au centre bas de l'image, visible de la tête aux genoux.

Le décor est devenu un théâtre de papier : les murs de la chambre se sont repliés en grands panneaux de papier découpé, superposés en plusieurs couches, comme des décors de théâtre, dans des tons bleu nuit profond (#0A1024), bleu encre et bleu plus clair. Des pages de papier vierges volent autour de lui. Une immense vague de lumière bleu nuit lumineuse traverse le décor de gauche à droite derrière lui. Le haut de l'image est une grande zone de ciel bleu nuit dégagée.

{PERSO} Il se baisse brusquement, les bras croisés au-dessus de la tête, les yeux ronds, parce que deux grandes formes de papier lumineuses (un disque et un carré aux coins arrondis, unis, sans motif) passent en sifflant juste au-dessus de lui.

La scène contient exactement 1 personnage, des panneaux de papier découpé, des pages vierges volantes, 1 disque lumineux, 1 carré lumineux et 1 vague de lumière.

Le haut de l'image reste dégagé ; ses mains, ses pieds et ses cheveux sont entiers.

Lumière bleu nuit profonde avec des reflets lumineux bleu clair sur le papier, ombres douces entre les couches de papier, grain de papier visible.

{SANS}""")
P["D"] = (["perso", "lampe"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est au centre bas de l'image, visible de la tête aux cuisses.

Le décor est un atelier de création imaginaire suspendu dans un ciel de nuit bleu nuit profond (#0A1024) : de grandes feuilles de papier vierges flottent comme des voiles, des pots d'encre et des pinceaux flottent, des carreaux de verre colorés (prune, vert lueur, ambre doux, crème) planent autour de lui, des fils de lumière dorée relient les éléments. Le haut de l'image est un grand ciel bleu nuit dégagé.

{PERSO} Devant lui, à hauteur de taille, flotte une longue barre de clavier faite de lumière bleu clair, sans aucune lettre sur les touches. Il tape dessus des deux mains, avec énergie, tout en jetant un regard complice vers l'objectif. Sur un petit socle à côté de lui est posée {LAMPE}.

La scène contient exactement 1 personnage, 1 clavier de lumière, 1 lampe LED sur son socle, des feuilles vierges, des pots d'encre, des pinceaux et des carreaux de verre colorés.

Le haut de l'image reste dégagé ; ses mains et ses cheveux sont entiers.

Lumière magique : lueur bleue du clavier sur son visage, reflets colorés des carreaux de verre, ciel profond, poussières lumineuses.

{SANS}""")
P["F_debut"] = (["perso", "logo", "lampe"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est à gauche du centre, visible de la tête aux cuisses ; à droite, une boîte d'emballage sur un socle.

Le décor est le même atelier de création imaginaire suspendu dans un ciel de nuit bleu nuit profond : feuilles de papier vierges flottantes, carreaux de verre colorés, fils de lumière dorée.

{PERSO} Il tient entre ses deux mains, devant sa poitrine, l'emblème lumineux de la luciole (la forme de l'emblème du logo fourni : corps en goutte vert lueur qui brille, deux ailes crème, petite tête crème), devenu un objet en relief qui flotte et brille. Il le regarde avec des yeux émerveillés et gourmands.

À droite, sur un socle, une boîte d'emballage pour la lampe : une boîte rectangulaire verticale crème avec un large bandeau prune nuit, face avant entièrement vierge.

La scène contient exactement 1 personnage, 1 emblème lumineux, 1 boîte d'emballage vierge, 1 socle et le décor de l'atelier.

La boîte, l'emblème, ses mains et ses cheveux sont entiers dans le cadre.

Lumière : l'emblème éclaire son visage en vert lueur, ciel bleu nuit profond, reflets dorés.

{SANS}""")
P["F_fin"] = (["perso", "logo", "lampe"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine, même cadrage que précédemment : il est à gauche du centre, la boîte d'emballage sur son socle à droite.

Le décor est le même atelier de création imaginaire suspendu dans un ciel de nuit bleu nuit profond : feuilles de papier vierges flottantes, carreaux de verre colorés, fils de lumière dorée.

{MARQUE} La boîte d'emballage crème à large bandeau prune nuit porte maintenant sur sa face avant le logo fourni : l'emblème de la luciole qui brille et, dessous, le mot « luciole ».

{PERSO} Il prend une pose de triomphe ridicule : un poing levé vers le ciel, le torse bombé, le menton haut, les yeux mi-clos de fierté, un grand sourire satisfait, l'autre main posée sur le haut de la boîte.

La scène contient exactement 1 personnage, 1 boîte d'emballage avec le logo, 1 socle et le décor de l'atelier.

La boîte, le logo, ses mains et ses cheveux sont entiers dans le cadre.

Lumière : lueur verte du logo, ciel bleu nuit, reflets dorés, ambiance de victoire comique.

{AVEC_LOGO}""")
P["G_debut"] = (["perso", "lampe"], f"""{STYLE}

Format vertical 9:16, plan large, caméra fixe un peu basse. Il est au centre, accroupi, entier de la tête aux pieds.

Le décor est une immense esplanade vide et lisse couleur crème, sous un ciel de crépuscule prune et ambre doux, avec un horizon très bas. Rien d'autre.

{PERSO} Accroupi, il pose délicatement devant lui sur le sol {LAMPE}, comme un objet précieux, en regardant l'objectif avec un sourire malicieux.

La scène contient exactement 1 personnage, 1 lampe LED posée au sol, le sol et le ciel.

Ses pieds, ses mains et la lampe sont entiers ; le haut de l'image est un ciel dégagé.

Lumière de crépuscule chaude, longues ombres douces, grande sensation d'espace.

{SANS}""")
P["G_fin"] = (["perso", "logo", "lampe"], f"""{STYLE}

Format vertical 9:16, plan large, caméra fixe un peu basse, même esplanade et même ciel de crépuscule prune et ambre doux. Il est au centre bas, debout, entier de la tête aux pieds, la lampe LED posée au sol devant lui.

{MARQUE} Autour de lui s'est dressée une boutique en ligne devenue architecture : derrière lui, un immense mur-affiche (la page d'accueil) montre une photo géante de la lampe qui brille et le logo fourni ; de chaque côté, des portes hautes en forme de cartes de produit, encadrées de crème et de prune, chacune montrant une photo de la lampe ; à droite, un caddie de supermarché géant de couleur vert lueur. Des morceaux de sol et de murs finissent de s'emboîter avec des petits nuages de poussière.

{PERSO} Il regarde autour de lui, bouche bée d'émerveillement, les bras légèrement écartés.

La scène contient exactement 1 personnage, 1 lampe LED au sol, 1 grand mur-affiche avec le logo, 4 portes en forme de cartes de produit, 1 caddie géant et l'esplanade.

Le haut du mur-affiche, les portes et le caddie sont entiers dans le cadre.

Lumière de crépuscule chaude, reflets ambre sur les surfaces, ombres douces.

{AVEC_LOGO}""")
P["H"] = (["perso", "lampe"], f"""{STYLE}

Format vertical 9:16, plan moyen dynamique, caméra basse qui recule devant lui. Il est au centre, entier de la tête aux genoux, en pleine course vers l'objectif.

Le décor est une longue allée bordée de portes hautes en forme de cartes de produit, encadrées de crème et de prune nuit, chacune montrant une photo de la lampe LED (galet noir à anneau doré) sur un fond de couleur différente (vert lueur, ambre doux, crème, prune). Le sol est crème, le ciel de crépuscule prune et ambre.

{PERSO} Il court en poussant devant lui un caddie de supermarché géant vert lueur, les cheveux au vent, la veste qui vole, un sourire euphorique, les yeux grands ouverts.

La scène contient exactement 1 personnage, 1 caddie géant et 6 portes en forme de cartes de produit.

Le caddie, ses mains et ses cheveux sont entiers dans le cadre.

Lumière de crépuscule chaude, flou de mouvement léger sur les portes, énergie de course.

{SANS}""")
P["I"] = (["perso"], f"""{STYLE}

Format vertical 9:16, plan rapproché poitrine, caméra fixe à hauteur des yeux. Il est au centre.

Le décor, flou derrière lui, est sa boutique devenue architecture : portes en forme de cartes de produit encadrées de crème et de prune, ciel de crépuscule ambre.

{PERSO} Il tient dans sa main droite, à hauteur de poitrine, une grande tasse à café blanche unie, sans aucun motif, et la regarde avec un sourire satisfait, prêt à boire.

La scène contient exactement 1 personnage et 1 tasse blanche.

La tasse, sa main et ses cheveux sont entiers dans le cadre.

Lumière de crépuscule chaude sur son visage, faible profondeur de champ.

{SANS}""")
P["J_debut"] = (["perso", "lampe"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est au centre, visible de la tête aux cuisses.

Le décor, légèrement flou, est sa boutique devenue architecture sous un ciel de crépuscule prune et ambre.

{PERSO} Il tient devant lui, à deux mains, une photographie instantanée carrée à bord blanc : la photo montre {LAMPE}, posée sur un fond prune nuit, qui brille. Il la regarde avec fierté, un sourcil levé.

La scène contient exactement 1 personnage et 1 photographie.

La photographie, ses mains et ses cheveux sont entiers dans le cadre ; le haut de l'image est un ciel dégagé.

Lumière de crépuscule chaude.

{SANS}""")
P["J_fin"] = (["perso", "logo", "lampe"], f"""{STYLE}

Format vertical 9:16, plan large en contre-plongée. Il est en bas de l'image, de dos de trois quarts, entier de la tête aux genoux, la tête levée vers le ciel, bouche bée.

{MARQUE} Au-dessus de lui, occupant toute la moitié haute de l'image, flotte une immense affiche publicitaire qui vient de se déplier, encore marquée de plis de papier : sur un fond prune nuit, la lampe LED géante brille de son anneau doré, entourée de rayons vert lueur, et le logo fourni est placé en bas de l'affiche.

La scène contient exactement 1 personnage, 1 affiche géante avec la lampe et le logo, et le ciel de crépuscule.

L'affiche est entière dans le cadre, sous le bord supérieur.

Lumière : l'affiche rayonne sur lui, ciel de crépuscule prune et ambre.

{AVEC_LOGO}""")
P["K"] = (["perso", "logo", "lampe"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe. Il est à droite, visible de la tête aux genoux.

{MARQUE} Le décor est l'intérieur d'une publicité animée pour la lampe : un studio graphique vert lueur et prune nuit, avec de grands rayons de lumière, la lampe LED géante qui flotte et brille au centre haut, des formes rondes ambre et crème en apesanteur. À gauche, un grand écran publicitaire vertical sur pied montre une autre version de lui-même (le même personnage, en plan rapproché) qui fait coucou de la main en souriant.

{PERSO} Il regarde l'écran, stupéfait et ravi, et lui répond en faisant coucou de la main droite.

La scène contient exactement 1 personnage, 1 écran publicitaire montrant son double, 1 lampe LED géante et des formes rondes.

L'écran, la lampe géante, ses mains et ses cheveux sont entiers dans le cadre.

Lumière de studio publicitaire vive et colorée, reflets vert lueur et ambre.

{SANS}""")
P["L"] = (["perso", "lampe"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe de face. Il est au centre, entier de la tête aux pieds, en train de courir sur place.

Le décor est un immense tapis roulant dont la surface est un calendrier géant : une grille de grandes cases carrées crème séparées par des lignes prune, toutes vierges, qui défile vers l'avant. Au-dessus, sur des rails, défilent des publications carrées pour les réseaux sociaux : chacune montre la lampe LED (galet noir à anneau doré) sur un fond de couleur de la marque (vert lueur, ambre doux, prune nuit, crème). Fond de hangar lumineux crème et prune.

{PERSO} Il court à toute vitesse sur le tapis roulant, les bras qui moulinent, les cheveux au vent, l'air à la fois paniqué et amusé.

La scène contient exactement 1 personnage, 1 tapis roulant calendrier et 5 publications carrées sur des rails.

Ses pieds, ses mains et ses cheveux sont entiers ; les publications sont entières.

Lumière vive et chaude, légères traînées de mouvement.

{SANS}""")
P["M"] = (["perso", "logo", "lampe"], f"""{STYLE}

Format vertical 9:16, plan large, caméra fixe à hauteur de poitrine. Il est au centre bas, entier de la tête aux genoux, de trois quarts.

{MARQUE} Derrière lui se dresse sa boutique devenue architecture, version simple et claire : un mur-affiche crème avec une photo de la lampe et le logo fourni, des portes en forme de cartes de produit crème et vert lueur, des blocs ronds et colorés, le tout un peu plat et sage, sous un ciel de crépuscule ambre.

{PERSO} Il observe sa boutique, une main sous le menton, les yeux plissés, l'air de réfléchir sérieusement.

La scène contient exactement 1 personnage, 1 mur-affiche avec le logo, 4 portes en forme de cartes de produit et quelques blocs colorés.

Le mur-affiche, les portes, ses mains et ses cheveux sont entiers.

Lumière de crépuscule douce et claire.

{AVEC_LOGO}""")
P["N"] = (["perso", "logo", "lampe"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est au centre bas, visible de la tête aux cuisses.

Le décor, légèrement flou, est sa boutique devenue architecture, version simple et claire (mur-affiche crème, portes en forme de cartes de produit crème et vert lueur) sous un ciel de crépuscule ambre. Le haut de l'image est un ciel dégagé.

{PERSO} Devant lui, à hauteur de taille, flotte une longue barre de clavier faite de lumière bleu clair, sans aucune lettre. Il tape dessus d'une main, l'autre levée en l'air, en regardant l'objectif avec un sourire malicieux.

La scène contient exactement 1 personnage, 1 clavier de lumière et le décor de la boutique.

Le haut de l'image reste dégagé ; ses mains et ses cheveux sont entiers.

Lumière de crépuscule, lueur bleue du clavier sur son visage.

{SANS}""")
P["O_fin"] = (["perso", "logo", "lampe"], f"""{STYLE}

Format vertical 9:16, plan large, caméra fixe à hauteur de poitrine, même cadrage que la boutique simple : il est au centre bas, entier de la tête aux genoux.

{MARQUE} Sa boutique devenue architecture s'est transformée en version premium : murs prune nuit profond presque noirs, fines lignes dorées, matières veloutées et laiton, éclairage feutré ; le mur-affiche montre maintenant une photo spectaculaire de la lampe qui brille dans la pénombre, avec le logo fourni ; juste en dessous, trois grands panneaux élégants mis en avant, chacun avec une icône dorée au trait (une goutte de lumière, une batterie, un sac de voyage).

{PERSO} Il vient de reprendre l'équilibre, les bras encore un peu écartés, et regarde l'objectif, très fier de lui. Juste devant lui flotte un grand bouton lumineux en forme de pilule vert lueur, sans aucune inscription.

La scène contient exactement 1 personnage, 1 mur-affiche avec la lampe et le logo, 3 panneaux à icônes dorées et 1 bouton lumineux.

Le mur-affiche, les panneaux, le bouton, ses mains et ses cheveux sont entiers.

Lumière premium : pénombre chaude, reflets dorés, halo vert du bouton.

{AVEC_LOGO}""")
P["P"] = (["perso", "chambre"], f"""{STYLE}

Format vertical 9:16, plan moyen large, caméra fixe à hauteur de poitrine. Il est au centre, visible de la tête aux genoux.

{CHAMBRE} La chambre est envahie d'outils empilés partout, du sol presque au plafond : boîtes de logiciels unies de couleurs différentes sans aucune inscription, classeurs, trois écrans d'ordinateur supplémentaires, calculatrices, caisses à outils, câbles emmêlés, piles de papiers vierges, une imprimante, des carnets. Son ordinateur portable est ouvert sur le bureau, à droite.

{PERSO} Il est debout au milieu de ce désordre, les épaules tombantes, et regarde les piles d'outils avec un air incrédule, un sourcil levé.

La scène contient exactement 1 personnage, 1 ordinateur portable et des dizaines d'outils empilés.

Ses mains et ses cheveux sont entiers dans le cadre.

Lumière chaude de la lampe de bureau, ombres des piles d'outils, ambiance de fouillis comique.

{SANS}""")
P["Q_fin"] = (["perso", "chambre"], f"""{STYLE}

Format vertical 9:16, plan moyen large, caméra fixe à hauteur de poitrine, même cadrage que la chambre encombrée : il est au centre, visible de la tête aux genoux.

{CHAMBRE} La chambre est maintenant parfaitement rangée et dégagée : il ne reste que le bureau avec l'ordinateur portable ouvert, la lampe de bureau, les cartons et la plante. Un dernier petit nuage de fumée se dissipe au sol à côté de son pied.

{PERSO} Il hausse les épaules, les deux paumes vers le ciel, avec un sourire nonchalant et satisfait vers l'objectif.

La scène contient exactement 1 personnage, 1 bureau, 1 ordinateur portable, 1 lampe de bureau, des cartons, 1 plante et 1 petit nuage de fumée.

Ses mains et ses cheveux sont entiers dans le cadre.

Lumière chaude de la lampe de bureau, ambiance calme et soulagée.

{SANS}""")
P["R"] = (["perso", "chambre"], f"""{STYLE}

Format vertical 9:16, gros plan, caméra fixe à hauteur des yeux, très près de lui. Son visage est au centre, ses épaules en bas de l'image.

Le décor est la même chambre rangée, floue derrière lui ; des reflets bleu nuit commencent à envahir le fond.

{PERSO} Il sourit chaleureusement à l'objectif, l'air complice, prêt à faire un clin d'œil.

La scène contient exactement 1 personnage et le décor flou.

Ses cheveux sont entiers ; un peu d'air au-dessus de sa tête.

Lumière chaude sur son visage, contre-jour bleu nuit sur les mèches.

{SANS}""")
P["S"] = (["perso"], f"""{STYLE}

Format vertical 9:16, plan large, caméra fixe à hauteur de poitrine. Il est en bas à gauche, entier de la tête aux genoux.

Le décor est une scène vide plongée dans un bleu nuit profond et uni (#0A1024), avec un léger dégradé plus clair au centre et un sol brillant qui reflète la lumière. À droite de lui, un socle rectangulaire lisse à hauteur de coude, de couleur bleu nuit avec une arête lumineuse bleu clair. Toute la moitié haute de l'image est un espace bleu nuit totalement vide.

{PERSO} Il fait un grand geste d'invitation vers l'objectif avec la main gauche, sourire enthousiaste, et s'apprête à poser son coude droit sur le socle.

La scène contient exactement 1 personnage et 1 socle.

Le socle, ses mains, ses pieds et ses cheveux sont entiers ; la moitié haute reste vide.

Lumière douce bleu nuit, contre-jour bleu clair sur sa silhouette, reflets sur le sol.

{SANS}""")
for k, (refs, p) in P.items():
    json.dump({"prompt": p, "image_urls": [R[r] for r in refs], "num_images": 1, "aspect_ratio": "9:16", "resolution": "2K", "output_format": "jpeg", "seed": 61}, open(f"cles/req-{k}.json", "w"), ensure_ascii=False)
print(len(P), "requêtes")
