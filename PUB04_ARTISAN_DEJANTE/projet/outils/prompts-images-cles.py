import json, sys
STYLE = "Photogramme vertical d'un long métrage d'animation. Même rendu hybride 2D/3D que les images fournies : volumes sculptés, peau, cheveux et tissus peints à la main avec grain de pinceau, fins traits d'encre, aucune surface plastique, aucun aspect jouet."
PERSO = "Le personnage est exactement le même homme que sur la première image fournie : même visage, cheveux châtains en bataille, sourcils épais, nez long légèrement busqué, barbe légère, veste prune foncé ouverte aux manches retroussées, t-shirt crème, jean bleu foncé taché de peinture, baskets blanches, ceinture à outils en toile beige avec un mètre ruban jaune, lunettes de protection relevées sur les cheveux. Ses mains ont cinq doigts bien formés. Son visage est net et bien dessiné."
CHANTIER = "Le décor est une pièce en rénovation lumineuse : murs fraîchement enduits blanc cassé, un échafaudage roulant en aluminium sur la gauche, une bâche de protection beige au sol, des pots de peinture fermés et un seau d'enduit, une grande fenêtre qui laisse entrer une lumière chaude de fin d'après-midi."
BLEU = "Le décor est un univers de création imaginaire, plongé dans un bleu nuit profond (#0A1024), traversé de longs rubans de lumière bleu clair et de traits de peinture ocre et blanc qui flottent dans l'air comme des coups de pinceau suspendus."
SANS = "Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane. Aucune autre personne. Aucun objet supplémentaire."
MARQUE = "La marque fictive de l'artisan s'appelle « Renov & Moi » : son logo est celui de l'image du logo fournie, une petite maison bleu ardoise au toit ocre et, dessous, les mots « Renov & Moi ». Couleurs de la marque : bleu ardoise, ocre, terracotta, blanc plâtre et graphite."
AVEC_LOGO = "Le seul texte visible est « Renov & Moi » du logo fourni, reproduit exactement. Aucun autre texte, aucune autre lettre, aucun chiffre, aucun autre logo, aucun filigrane. Aucune autre personne. Aucun objet supplémentaire."
def pointe(cible_h, expr):
    return (f"Format vertical 9:16, plan taille, caméra fixe à hauteur de poitrine. Il est dans la moitié gauche de l'image, visible de la tête aux hanches, le corps tourné de trois quarts vers la droite, la tête tournée vers l'objectif. "
            f"Il tient le rouleau à peindre dans sa main droite, à gauche de l'image, et tend le bras gauche vers la droite de l'image, l'index tendu, les autres doigts repliés : le bout de son index se trouve à 83 % de la largeur de l'image en partant de la gauche et à {cible_h} % de sa hauteur en partant du haut, et le doigt pointe vers le bord droit de l'image. "
            f"Toute la bande verticale à droite de son doigt reste dégagée. {expr}")
P = {
"K1": (["artisan"], f"""{STYLE}

Format vertical 9:16, plan rapproché au grand angle, caméra à hauteur des yeux, tout près de lui. Il se penche vers l'objectif et pointe l'index droit droit sur l'objectif : à cause de la perspective, sa main et son index sont grands au premier plan, en bas au centre, légèrement flous ; son visage est net juste derrière, au centre. Il tient le rouleau à peindre levé dans l'autre main.

{CHANTIER} Le décor est flou derrière lui.

{PERSO} Expression : enthousiasme énorme, sourcils très hauts, grand sourire, bouche ouverte comme s'il criait « toi ! ».

La scène contient exactement 1 personnage, 1 rouleau à peindre et le décor du chantier.

Le haut de l'image garde un peu d'air au-dessus de ses cheveux, qui sont entiers.

Lumière chaude de fin d'après-midi, contre-jour sur les mèches, faible profondeur de champ.

{SANS}"""),
"K2": (["artisan"], f"""{STYLE}

{pointe(52, "Expression : sourire malicieux, un sourcil levé, regard planté dans l'objectif, bouche entrouverte comme s'il parlait.")}

{CHANTIER} Le décor est légèrement flou.

{PERSO}

La scène contient exactement 1 personnage, 1 rouleau à peindre et le décor du chantier.

Ses mains, son index et ses cheveux sont entiers dans le cadre.

Lumière chaude de fin d'après-midi, contre-jour sur les mèches.

{SANS}"""),
"K3": (["artisan"], f"""{STYLE}

{pointe(58, "Expression faussement autoritaire : menton levé, sourcils froncés, regard sévère et amusé planté dans l'objectif, bouche entrouverte comme s'il parlait.")}

{CHANTIER} Le décor est légèrement flou.

{PERSO}

La scène contient exactement 1 personnage, 1 rouleau à peindre et le décor du chantier.

Ses mains, son index et ses cheveux sont entiers dans le cadre.

Lumière chaude de fin d'après-midi, contre-jour sur les mèches.

{SANS}"""),
"K4": (["artisan"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est au centre, visible de la tête aux genoux, de trois quarts, face à un mur à droite de l'image.

{CHANTIER} Sur le mur à droite, il applique de l'enduit blanc parfaitement lisse avec un large couteau à enduire tenu dans la main droite ; un seau d'enduit est posé au sol.

{PERSO} Il tourne la tête vers l'objectif, très fier de son travail : sourire satisfait, sourcils levés, bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage, 1 couteau à enduire, 1 seau d'enduit, 1 échafaudage, des pots de peinture et 1 fenêtre.

Ses mains et ses cheveux sont entiers ; un peu d'air au-dessus de sa tête.

Lumière chaude de fin d'après-midi, belles ombres douces, poussière de plâtre légère dans la lumière.

{SANS}"""),
"K5": (["artisan", "K4"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine, même cadrage et même pièce que sur la deuxième image fournie. Il est au centre, visible de la tête aux genoux, face à l'objectif.

Le chantier est devenu chaotique : trois grandes pages de site web vides (cadres blancs avec des blocs de couleur unis, sans aucune écriture) sont collées de travers sur les murs ; un immense smartphone à l'écran bleu uni est coincé dans l'échafaudage ; une grande affiche publicitaire vierge tombe du plafond au-dessus de lui ; un pot de peinture posé au sol s'est transformé en petit écran d'ordinateur bleu uni.

{PERSO} Il repousse l'affiche avec son rouleau à peindre levé, paniqué : yeux exorbités, sourcils relevés au centre, bouche ouverte comme s'il parlait vite.

La scène contient exactement 1 personnage, 1 rouleau, 3 pages de site collées aux murs, 1 smartphone géant, 1 affiche qui tombe, 1 pot-écran et l'échafaudage.

Ses mains et ses cheveux sont entiers ; l'affiche est entière dans le cadre.

Lumière chaude du chantier mêlée à la lueur bleue des écrans, ambiance de chaos comique.

{SANS}"""),
"K6": (["artisan", "K5"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine, même cadrage et même pièce chaotique que sur la deuxième image fournie. Il est au centre, visible de la tête aux genoux, face à l'objectif.

{PERSO} Par magie, il porte maintenant par-dessus ses vêtements un costume officiel ridicule : une longue redingote bleu marine brodée d'or, une écharpe dorée en travers du torse, trois énormes médailles, des épaulettes à franges dorées et un grand bicorne noir à plumes sur la tête. Il tient toujours son rouleau. Il regarde l'objectif, complètement incrédule : bouche ouverte de travers, un sourcil très haut, l'autre froncé.

La scène contient exactement 1 personnage en costume officiel, 1 rouleau et le décor chaotique.

Le bicorne, ses mains et ses pieds sont entiers dans le cadre.

Lumière chaude, petites étincelles dorées autour du costume, ambiance absurde.

{SANS}"""),
"K7": (["artisan"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe un peu basse. Il est au centre bas de l'image, visible de la tête aux genoux, face à l'objectif.

Le décor est une petite rue de quartier animée, comme une maquette illustrée : derrière lui, une jolie maison fraîchement rénovée aux murs blanc plâtre impeccables, volets bleu ardoise et toit ocre, qui brille ; de chaque côté, deux autres maisons plus anciennes ; un trottoir et un ciel bleu de fin d'après-midi avec quelques nuages.

{PERSO} Il se tient fièrement devant la maison et tient son smartphone dans la main droite, l'écran tourné vers lui, en regardant l'objectif d'un air sarcastique : un sourcil levé, bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage, 1 smartphone et 3 maisons.

La maison rénovée, ses mains et ses cheveux sont entiers.

Lumière chaude de fin d'après-midi, ombres douces.

{SANS}"""),
"K8": (["artisan", "K7"], f"""{STYLE}

Format vertical 9:16, plan rapproché poitrine, caméra fixe à hauteur des yeux, même rue et même maison rénovée que sur la deuxième image fournie, légèrement floues derrière lui. Il est au centre.

{PERSO} Il tient son smartphone à bout de bras devant lui, à hauteur d'épaule, et le secoue ; l'écran du téléphone est noir et vide. Il regarde l'objectif, pince-sans-rire, la bouche entrouverte comme s'il parlait, les sourcils légèrement froncés.

La scène contient exactement 1 personnage et 1 smartphone.

Le téléphone, ses mains et ses cheveux sont entiers dans le cadre.

Lumière chaude de fin d'après-midi.

{SANS}"""),
"K9": (["artisan", "K7"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine, même rue et même maison rénovée que sur la deuxième image fournie. Il est au centre, visible de la tête aux genoux, face à l'objectif.

{PERSO} Il lève les deux bras au ciel, la bouche grande ouverte de stupeur, les yeux ronds fixés sur l'objectif. À ses pieds, sur le trottoir à droite, son smartphone s'est transformé en petit manifestant de dessin animé : un téléphone noir avec deux petits bras et deux petites jambes, l'air boudeur, qui brandit une petite pancarte en carton blanc sur laquelle est écrit en grosses lettres noires « EN GRÈVE ».

La scène contient exactement 1 personnage, 1 téléphone manifestant avec sa pancarte et le décor de la rue.

Le téléphone manifestant, sa pancarte, les mains et les cheveux du personnage sont entiers.

Lumière chaude de fin d'après-midi, ambiance comique.

Le seul texte visible est « EN GRÈVE » sur la pancarte. Aucun autre texte, aucune autre lettre, aucun chiffre, aucun logo, aucun filigrane. Aucune autre personne. Aucun objet supplémentaire."""),
"K10": (["artisan", "K4"], f"""{STYLE}

Format vertical 9:16, gros plan, caméra fixe à hauteur des yeux, tout près de lui. Son visage est au centre, ses épaules en bas de l'image.

Le décor est le même chantier que sur la deuxième image fournie, flou derrière lui ; derrière son épaule, une vieille porte de chantier en bois brut entrouverte laisse filtrer un mince rai de lumière bleue.

{PERSO} Expression mystérieuse : il plisse les yeux, un sourire en coin, l'index levé près de sa bouche comme pour annoncer un secret, la bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage, 1 porte entrouverte et le décor flou.

Ses cheveux sont entiers ; un peu d'air au-dessus de sa tête.

Lumière chaude sur son visage, rai de lumière bleue mystérieux sur un côté.

{SANS}"""),
"K10b": (["artisan", "K4"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est à gauche, visible de la tête aux genoux, de trois quarts.

Le décor est le même chantier que sur la deuxième image fournie ; à droite de l'image, une vieille porte de chantier en bois brut, fermée, entière, sous laquelle filtre une lueur bleue.

{PERSO} Il pose la main sur la poignée de la porte et regarde l'objectif avec un air malicieux, prêt à l'ouvrir.

La scène contient exactement 1 personnage, 1 porte en bois et le décor du chantier.

La porte, ses mains et ses cheveux sont entiers.

Lumière chaude du chantier, lueur bleue sous la porte.

{SANS}"""),
"K11": (["artisan", "K10b"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine, même cadrage que sur la deuxième image fournie. Il est à gauche, visible de la tête aux genoux.

La vieille porte de chantier en bois, à droite, est grande ouverte : derrière elle, au lieu d'une pièce, s'ouvre un immense univers de création plongé dans un bleu nuit profond (#0A1024), traversé de longs rubans de lumière bleu clair et de traits de peinture ocre et blanc suspendus dans l'air. Une lumière bleue intense jaillit par la porte et éclaire le personnage ; quelques coups de pinceau lumineux sortent par la porte.

{PERSO} Émerveillé, bouche ouverte, il recule légèrement, la main encore sur la poignée.

La scène contient exactement 1 personnage, 1 porte ouverte, l'univers bleu derrière et le décor du chantier.

La porte, ses mains et ses cheveux sont entiers ; le haut de la porte laisse un espace bleu dégagé.

Lumière : contraste entre la lumière chaude du chantier et la lumière bleue magique, ambiance de découverte.

{SANS}"""),
"K12": (["artisan"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est au centre bas de l'image, visible de la tête aux cuisses.

{BLEU} Toute la partie haute de l'image, jusqu'au tiers de sa hauteur, est un ciel bleu nuit dégagé.

{PERSO} Devant lui, à hauteur de taille, flotte une longue barre de clavier faite de lumière bleu clair, sans aucune lettre. Il tape dessus des deux mains en regardant l'objectif d'un air complice et enthousiaste, la bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage, 1 clavier de lumière et l'univers bleu.

Le tiers haut reste dégagé ; ses mains et ses cheveux sont entiers.

Lumière magique : lueur bleue du clavier sur son visage, reflets ocre des coups de pinceau.

{SANS}"""),
"K13": (["artisan"], f"""{STYLE}

{pointe(67, "Expression curieuse et interrogative : sourcils levés, tête légèrement penchée, regard planté dans l'objectif, bouche entrouverte comme s'il posait une question.")}

{BLEU}

{PERSO}

La scène contient exactement 1 personnage, 1 rouleau à peindre et l'univers bleu.

Ses mains, son index et ses cheveux sont entiers dans le cadre.

Lumière bleue magique avec reflets ocre, visage bien éclairé.

{SANS}"""),
"K14": (["artisan"], f"""{STYLE}

Format vertical 9:16, plan rapproché, caméra fixe à hauteur des yeux, plus près de lui que d'habitude. Il est dans la moitié gauche de l'image, visible de la tête à la poitrine, dressé sur la pointe des pieds, le corps penché vers la droite. Il tend le bras gauche vers la droite de l'image, l'index tendu : le bout de son index se trouve à 83 % de la largeur de l'image en partant de la gauche et à 67 % de sa hauteur en partant du haut, et le doigt pointe vers le bord droit. Toute la bande verticale à droite de son doigt reste dégagée.

{BLEU} Derrière lui flottent quatre outils de métiers différents, lumineux et bien visibles : une clé à molette de plombier, une perceuse, un rouleau à peindre et une truelle de maçon.

{PERSO} Expression : sourire ridicule et immense, yeux pétillants, sourcils très hauts, regard planté dans l'objectif, bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage, 1 clé à molette, 1 perceuse, 1 rouleau à peindre flottant et 1 truelle.

Son index, ses cheveux et les quatre outils sont entiers dans le cadre.

Lumière bleue magique, reflets ocre sur les outils.

{SANS}"""),
"K15": (["artisan"], f"""{STYLE}

Format vertical 9:16, plan large, caméra fixe à hauteur de poitrine. Il est à gauche, visible de la tête aux pieds ; à droite, un utilitaire de chantier blanc entièrement vierge, vu de trois quarts, entier.

{BLEU} Le sol est un plan bleu nuit brillant qui reflète la lumière.

{PERSO} Il présente l'utilitaire d'un grand geste du bras, émerveillé.

La scène contient exactement 1 personnage et 1 utilitaire blanc vierge.

L'utilitaire, ses mains, ses pieds et ses cheveux sont entiers.

Lumière bleue magique, reflets sur la carrosserie.

{SANS}"""),
"K16": (["artisan", "K15", "logo"], f"""{STYLE}

Format vertical 9:16, plan large, caméra fixe à hauteur de poitrine, même cadrage que sur la deuxième image fournie : il est à gauche, visible de la tête aux pieds ; à droite, le même utilitaire de chantier vu de trois quarts, entier.

{BLEU} Le sol est un plan bleu nuit brillant qui reflète la lumière.

{MARQUE} L'utilitaire est maintenant habillé aux couleurs de la marque : carrosserie blanc plâtre, une grande bande bleu ardoise sur le bas, un trait ocre en forme de coup de rouleau, et sur le flanc le logo fourni en grand.

{PERSO} Il regarde l'utilitaire, émerveillé, les deux mains sur les joues.

La scène contient exactement 1 personnage et 1 utilitaire habillé du logo.

L'utilitaire, le logo, ses mains, ses pieds et ses cheveux sont entiers.

Lumière bleue magique, reflets sur la carrosserie.

{AVEC_LOGO}"""),
"K17": (["artisan", "logo"], f"""{STYLE}

Format vertical 9:16, plan large, caméra fixe un peu basse. Il est au centre bas, visible de la tête aux pieds, de dos de trois quarts, la tête levée.

{BLEU} Autour de lui se dresse un site vitrine devenu architecture, comme une façade de maison faite de grands panneaux : en haut, un immense panneau d'accueil avec la photo d'un salon rénové lumineux et le logo fourni ; au milieu, trois panneaux de prestations alignés, chacun avec une grande icône ocre au trait (une truelle, un rouleau, une maison) ; sur la droite, une galerie de photos de pièces rénovées qui se déploie en éventail ; à gauche, un escalier de grandes marches lumineuses qui monte vers une porte marquée d'une coche, comme un parcours de demande de devis.

{MARQUE}

La scène contient exactement 1 personnage, 1 panneau d'accueil avec le logo, 3 panneaux de prestations, 1 galerie de photos et 1 escalier avec une porte.

Tous les panneaux et le personnage sont entiers dans le cadre.

Lumière bleue magique, panneaux éclairés de l'intérieur, reflets ocre.

{AVEC_LOGO}"""),
"K18": (["artisan", "K16"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est au centre, visible de la tête aux cuisses, face à l'objectif ; derrière lui, légèrement floue, l'utilitaire habillé aux couleurs de la marque de la deuxième image fournie.

{BLEU}

{PERSO} Il regarde l'objectif, émerveillé puis soupçonneux : les yeux plissés, un sourcil levé, la bouche entrouverte comme s'il parlait, une main levée comme pour dire « attends ».

La scène contient exactement 1 personnage, l'utilitaire flou et l'univers bleu.

Ses mains et ses cheveux sont entiers.

Lumière bleue magique, visage bien éclairé.

{SANS}"""),
"K19": (["artisan", "K16"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe basse. Il est accroupi à gauche, visible entièrement, et regarde sous l'utilitaire habillé aux couleurs de la marque de la deuxième image fournie, dont on voit l'avant et une roue au premier plan à droite.

{BLEU} Le sol est un plan bleu nuit brillant.

{PERSO} Il penche la tête pour regarder sous le véhicule, les yeux plissés, très soupçonneux.

La scène contient exactement 1 personnage et 1 utilitaire.

La roue, l'avant du véhicule et le personnage sont entiers.

Lumière bleue magique, ombre sous le véhicule.

{SANS}"""),
"K20": (["artisan", "K4"], f"""{STYLE}

Format vertical 9:16, plan rapproché poitrine, caméra fixe à hauteur des yeux. Il est au centre.

Le décor est le même chantier que sur la deuxième image fournie, flou derrière lui.

{PERSO} Il tient devant lui, d'une main, une photographie instantanée à bord blanc montrant un salon rénové lumineux aux murs blanc plâtre et ocre doux. Il la regarde, puis hausse les épaules face à l'objectif, l'air peu impressionné, la bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage et 1 photographie.

La photographie, ses mains et ses cheveux sont entiers.

Lumière chaude de fin d'après-midi.

{SANS}"""),
"K21": (["artisan", "logo"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est au centre bas, visible de la tête aux cuisses, face à l'objectif.

{BLEU}

{MARQUE} Autour de lui flottent ses contenus de communication, tous dans les mêmes couleurs : à gauche, un grand visuel commercial montrant le salon rénové avec le logo fourni ; en haut à droite, une publication carrée pour les réseaux sociaux avec une photo de cuisine rénovée et le logo ; à droite, une publicité verticale sur un grand téléphone, montrant une chambre rénovée et le logo.

{PERSO} Il présente le tout d'un geste fier des deux mains, sourire satisfait, la bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage, 1 visuel commercial, 1 publication carrée et 1 publicité verticale sur un téléphone.

Les trois contenus, ses mains et ses cheveux sont entiers.

Lumière bleue magique, contenus éclairés de l'intérieur.

{AVEC_LOGO}"""),
"K23": (["artisan", "K21"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine, même décor et mêmes contenus flottants que sur la deuxième image fournie. Il est au centre bas, visible de la tête aux cuisses.

{PERSO} Sauf que sa veste a changé de couleur : elle est maintenant bleu ardoise avec des revers et des liserés ocre, assortie aux couleurs de la marque. Il prend une pose de mannequin extrêmement ridicule : une main derrière la tête, l'autre sur la hanche, hanche sortie, moue de top-modèle, regard intense vers l'objectif.

La scène contient exactement 1 personnage et les contenus flottants.

Ses mains et ses cheveux sont entiers.

Lumière bleue magique, petit éclat de projecteur sur lui.

Le seul texte visible est « Renov & Moi » du logo sur les contenus. Aucun autre texte, aucune autre lettre, aucun chiffre, aucun filigrane. Aucune autre personne. Aucun objet supplémentaire."""),
"K24": (["artisan", "K17"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est à gauche, visible de la tête aux cuisses, de trois quarts.

Derrière lui, le même site vitrine devenu architecture que sur la deuxième image fournie, dans une version simple et sage : panneaux clairs, les prestations en premier, les photos de rénovation petites en bas.

{PERSO} Il observe le site en se grattant le menton, les yeux plissés, l'air de réfléchir, la bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage et le site-architecture.

Ses mains et ses cheveux sont entiers.

Lumière bleue magique, panneaux éclairés.

Le seul texte visible est « Renov & Moi » du logo. Aucun autre texte, aucune autre lettre, aucun chiffre, aucun filigrane. Aucune autre personne. Aucun objet supplémentaire."""),
"K25": (["artisan", "K24", "logo"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine, même cadrage que sur la deuxième image fournie. Il est à gauche, visible de la tête aux cuisses.

{MARQUE} Le site-architecture derrière lui est devenu premium : panneaux bleu ardoise profond aux fins liserés ocre doré, éclairage feutré, et en tout premier, en très grand, les photos de rénovations intérieures (un salon et une salle de bain magnifiques) ; le logo fourni en haut ; les prestations sont passées plus bas.

{PERSO} Il vient d'être poussé sur le côté par un panneau et se redresse en remettant sa veste en place d'un geste digne, comme si de rien n'était, en regardant l'objectif avec fierté, la bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage et le site-architecture premium.

Ses mains et ses cheveux sont entiers.

Lumière premium feutrée, reflets dorés.

{AVEC_LOGO}"""),
"K27": (["artisan", "K4"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine, même pièce que sur la deuxième image fournie mais parfaitement terminée et rangée : murs lisses et peints, outils alignés proprement sur une desserte, bâche pliée. Il est au centre, visible de la tête aux cuisses, face à l'objectif.

{PERSO} Il croise les bras, l'air décidé et un peu sarcastique, la bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage, 1 desserte avec des outils rangés et la pièce terminée.

Ses mains et ses cheveux sont entiers.

Lumière chaude et calme.

{SANS}"""),
"K28": (["artisan", "K27"], f"""{STYLE}

Format vertical 9:16, plan rapproché, caméra fixe à hauteur des yeux. Il est au centre, visible de la tête à la poitrine, dans la même pièce terminée que sur la deuxième image fournie, floue derrière lui ; des reflets bleu nuit commencent à envahir le fond.

{PERSO} Il pointe l'index droit vers l'objectif, avec un grand sourire chaleureux et complice, la bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage et le décor flou.

Sa main et ses cheveux sont entiers ; un peu d'air au-dessus de sa tête.

Lumière chaude sur son visage, contre-jour bleu nuit sur les mèches.

{SANS}"""),
"K29": (["artisan"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est dans la moitié basse de l'image, à gauche du centre, visible de la tête aux genoux.

Le décor est une scène vide plongée dans un bleu nuit profond et uni (#0A1024), avec un léger dégradé plus clair au centre et un sol brillant. Toute la partie haute de l'image, jusqu'au tiers de sa hauteur, est un espace bleu nuit totalement vide. À droite de lui se dresse un grand panneau rectangulaire vertical, lisse, bleu nuit avec une arête lumineuse bleu clair.

{PERSO} Il s'appuie nonchalamment de l'épaule contre le panneau, les bras croisés, sourire sûr de lui vers l'objectif.

La scène contient exactement 1 personnage et 1 panneau.

Le panneau, ses mains et ses cheveux sont entiers ; le tiers haut reste vide.

Lumière douce bleu nuit, contre-jour bleu clair, reflets au sol.

{SANS}"""),
"K30": (["artisan", "K29"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine, même scène bleu nuit que sur la deuxième image fournie. Il est dans la moitié basse, au centre, visible de la tête aux genoux. Le panneau a glissé et se trouve maintenant loin à droite, au bord de l'image.

{PERSO} Il vient de se rattraper de justesse : debout bien droit, une main qui lisse sa veste, il regarde l'objectif comme si de rien n'était, sourcils levés, petit sourire innocent.

La scène contient exactement 1 personnage et 1 panneau.

Ses mains et ses cheveux sont entiers ; le tiers haut reste vide.

Lumière douce bleu nuit, contre-jour bleu clair.

{SANS}"""),
}
REF = {"artisan": "ref/artisan.png", "logo": "ref/logo-renov.png"}
def src(r): return "@fichier:" + (REF[r] if r in REF else f"cles/{r}/sortie-1.png")
keys = sys.argv[1:] or list(P)
for k in keys:
    refs, p = P[k]
    json.dump({"prompt": p, "image_urls": [src(r) for r in refs], "num_images": 1, "aspect_ratio": "9:16", "resolution": "1K", "output_format": "png", "seed": 404}, open(f"cles/req-{k}.json","w"), ensure_ascii=False)
print(len(keys), "requêtes")
