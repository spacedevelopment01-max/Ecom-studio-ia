"""Images clés de la publicité Arthur (40 s). Image 1 = image officielle d'Arthur (référence maîtresse, jamais redessinée).
Image 2 = image de mise en place (décor ou pose) quand elle existe. Modèle : fal-ai/nano-banana/edit (0,039 $ l'image).
Usage : python3 prompts.py  -> écrit cles/req-<clé>.json"""
import json, os
R = os.path.dirname(os.path.abspath(__file__))
OFF = "@fichier:ref/arthur-officiel.png"
P04 = "@fichier:../pub04/cles/"
STYLE = ("Photogramme vertical d'un long métrage d'animation. Même rendu hybride 2D/3D que les images fournies : volumes sculptés, "
         "peau, cheveux et tissus peints à la main avec grain de pinceau, fins traits d'encre, aucune surface plastique, aucun aspect jouet.")
PERSO = ("Le personnage est exactement l'homme de la première image, sans rien redessiner : même visage, mêmes proportions, cheveux châtain foncé "
         "très en bataille, sourcils épais, nez long, barbe courte de quelques jours, veste prune foncé ouverte aux manches légèrement retroussées, "
         "t-shirt crème, jean bleu foncé, baskets blanches. Ses vêtements sont propres : aucune tache de peinture. Il ne porte ni lunettes, ni casque, "
         "ni casquette : ses cheveux sont entièrement visibles. Seul accessoire de métier porté : une ceinture à outils en toile beige à la taille.")
CHANTIER = ("Le décor est la pièce de la deuxième image : une pièce en rénovation lumineuse aux murs fraîchement peints blanc chaud, un échafaudage "
            "roulant en aluminium, une bâche de protection beige au sol, des pots de peinture fermés, une grande fenêtre qui laisse entrer une lumière "
            "chaude de fin d'après-midi.")
SANS = "Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane. Aucune autre personne. Aucun objet supplémentaire."
LUM = "Lumière chaude de fin d'après-midi venant de la fenêtre, ombres douces, légère profondeur de champ, ambiance joyeuse."
RETOUCHE = ("Reprends exactement la deuxième image : même cadrage, même pose, même position du bras, de la main et du bout de l'index, même rouleau, "
            "même décor, même lumière, même taille du personnage dans l'image. Modifie seulement trois choses : retire les lunettes de protection posées "
            "sur sa tête, pour que ses cheveux en bataille soient entièrement visibles comme sur la première image ; retire toutes les taches de peinture "
            "de sa veste prune, de son t-shirt et de son jean, qui deviennent propres comme sur la première image ; donne-lui exactement le visage de la "
            "première image. Ne déplace rien d'autre.")

P = {
"KA1": ([OFF, P04 + "K27/sortie-1.png"], f"""{STYLE}

Format vertical 9:16, plan rapproché de la tête à la ceinture, caméra à hauteur de poitrine, assez près de lui. Il est au centre de l'image, le corps tourné de trois quarts vers la gauche, la tête tournée vers l'objectif. Il tient un rouleau à peindre dans sa main droite, le manche posé sur son épaule. Sa main gauche est ouverte, paume vers le haut, tendue sur le côté vers la pièce derrière lui, comme pour la présenter. Son visage est entier et net, dans le tiers supérieur de l'image, avec un peu d'air au-dessus des cheveux.

{CHANTIER} Le décor est légèrement flou derrière lui.

{PERSO} Expression : complice et sûr de lui, sourire en coin, un sourcil levé, regard droit dans l'objectif, bouche entrouverte comme s'il confiait un secret.

La scène contient exactement 1 personnage, 1 rouleau à peindre et le décor du chantier.

{LUM}

{SANS}"""),
"KA2": ([OFF, P04 + "recadre/K2-final.png"], f"""{STYLE}

{RETOUCHE}

{PERSO}

{SANS}"""),
"KA3": ([OFF, P04 + "recadre/K3c-final.png"], f"""{STYLE}

{RETOUCHE}

{PERSO}

{SANS}"""),
"KA5": ([OFF, P04 + "K27/sortie-1.png"], f"""{STYLE}

Format vertical 9:16, plan moyen, caméra fixe à hauteur de poitrine. Il est vu de trois quarts dos, dans la moitié gauche de l'image, face au mur de droite. Son bras droit est levé et passe un dernier coup de rouleau à peindre en haut du mur blanc fraîchement peint. On voit son profil perdu : oreille, joue, barbe, cheveux en bataille ; il sourit. Un bac à peinture est posé au sol à ses pieds.

{CHANTIER}

{PERSO}

La scène contient exactement 1 personnage, 1 rouleau à peindre, 1 bac à peinture et le décor du chantier.

{LUM}

{SANS}"""),
"KA6": ([OFF, P04 + "K10b/sortie-1.png"], f"""{STYLE}

Format vertical 9:16, plan en pied, caméra fixe à hauteur de taille. Il est au centre de l'image, en pleine petite danse joyeuse : un genou levé, le bras droit en l'air qui fait tinter un trousseau de clés, le bras gauche ouvert, les épaules en mouvement. Il se dirige vers la porte en bois du chantier, à gauche de l'image. Son rouleau à peindre est posé dans un bac au sol, derrière lui à droite. Son visage est tourné de trois quarts vers l'objectif, entier et net.

{CHANTIER} La porte en bois est celle de la deuxième image.

{PERSO} Expression : joie pure et soulagement, grand sourire, yeux plissés de plaisir.

La scène contient exactement 1 personnage, 1 trousseau de clés, 1 rouleau dans 1 bac au sol, la porte et le décor du chantier.

Ses pieds, ses mains et ses cheveux sont entiers dans le cadre.

{LUM}

{SANS}"""),
"KA7": ([OFF, P04 + "K10b/sortie-1.png"], f"""{STYLE}

Format vertical 9:16, plan taille, caméra fixe à hauteur de poitrine. Il est devant la porte en bois du chantier, à gauche de l'image : sa main gauche tient la poignée de la porte. Dans sa main droite, il tient un smartphone devant sa poitrine, l'écran tourné vers lui : on ne voit que le dos noir du téléphone. Il a la tête un peu baissée vers le téléphone mais son visage est tourné de trois quarts vers l'objectif, entier, net et bien éclairé.

{CHANTIER} La porte est celle de la deuxième image.

{PERSO} Expression : son sourire se fige et tourne à la grimace déçue, sourcils qui remontent au milieu, coins de la bouche qui tombent.

La scène contient exactement 1 personnage, 1 smartphone, la porte et le décor du chantier.

{LUM}

{SANS}"""),
"KA9": ([OFF, P04 + "K27/sortie-1.png"], f"""{STYLE}

Format vertical 9:16, plan taille face caméra, caméra fixe à hauteur de poitrine. Il est au centre de l'image. Dans sa main gauche, à gauche de l'image, il tient un smartphone à hauteur d'épaule, l'écran tourné vers la caméra : l'écran est allumé, uni, gris très clair, sans aucun contenu. Dans sa main droite, il lève son rouleau à peindre juste à côté du téléphone, le rouleau tourné vers l'écran, comme s'il envisageait de peindre le téléphone. Il regarde l'objectif.

{CHANTIER} Le décor est légèrement flou derrière lui.

{PERSO} Expression : perplexité comique, un sourcil haut et l'autre bas, moue dubitative, bouche entrouverte.

La scène contient exactement 1 personnage, 1 smartphone à l'écran vide, 1 rouleau à peindre et le décor du chantier.

Ses mains, le téléphone entier, le rouleau entier et ses cheveux sont dans le cadre.

{LUM}

{SANS}"""),
"KA10": ([OFF, P04 + "K27/sortie-1.png"], f"""{STYLE}

Format vertical 9:16, plan taille, caméra fixe à hauteur de poitrine. Il est assis sur un seau de peinture retourné, dans la moitié gauche de l'image. Devant lui, dans la moitié droite, un ordinateur portable ouvert est posé sur la marche haute d'un escabeau : l'écran est tourné de trois quarts vers la caméra, bien visible, allumé, uni, gris très clair, sans aucun contenu. Il se tourne vers l'objectif et montre l'écran de sa main droite ouverte, l'autre main posée sur son genou. Son visage est entier, net, dans le tiers supérieur de l'image.

{CHANTIER}

{PERSO} Expression : enthousiasme retrouvé, grand sourire, sourcils levés, regard dans l'objectif, bouche entrouverte comme s'il parlait.

La scène contient exactement 1 personnage, 1 seau retourné, 1 escabeau, 1 ordinateur portable à l'écran vide et le décor du chantier.

{LUM}

{SANS}"""),
"KA13": ([OFF, P04 + "K10b/sortie-1.png"], f"""{STYLE}

Format vertical 9:16, plan taille, caméra fixe à hauteur de poitrine. Il est debout devant la porte en bois entrouverte du chantier, à gauche de l'image, prêt à partir. Dans sa main droite, il tient un trousseau de clés levé à hauteur d'épaule. Son visage est tourné vers l'objectif, entier, net et bien éclairé.

{CHANTIER} La porte est celle de la deuxième image.

{PERSO} Expression : malicieuse et soulagée, demi-sourire, un sourcil levé, regard dans l'objectif.

La scène contient exactement 1 personnage, 1 trousseau de clés, la porte et le décor du chantier.

{LUM}

{SANS}"""),
"AVANT": ([P04 + "K27/sortie-1.png"], f"""Photographie de chantier au format vertical 9:16, dans le même rendu peint que l'image fournie.

Reprends exactement la pièce de l'image fournie, même cadrage, même fenêtre, même lumière, mais AVANT les travaux et sans aucune personne : les murs sont abîmés, enduit fissuré, vieux papier peint jauni déchiré par plaques, traces d'humidité grises dans un angle, plinthe usée. Une bâche beige est posée au sol, l'échafaudage roulant est contre le mur de gauche.

La scène contient exactement la pièce abîmée, 1 bâche et 1 échafaudage.

Lumière naturelle un peu terne.

{SANS}"""),
"APRES": ([P04 + "K27/sortie-1.png"], f"""Photographie de chantier au format vertical 9:16, dans le même rendu peint que l'image fournie.

Reprends exactement la pièce de l'image fournie, même cadrage, même fenêtre, même lumière, mais une fois les travaux terminés et sans aucune personne : murs lisses peints d'un blanc chaud impeccable, plafond net, plinthes blanches neuves, parquet clair propre et brillant. La pièce est vide : plus de bâche, plus d'échafaudage, plus de pots de peinture.

La scène contient exactement la pièce rénovée et vide.

Lumière chaude et lumineuse de fin d'après-midi, rendu soigné de photo de réalisation.

{SANS}"""),
}

if __name__ == "__main__":
    for k, (imgs, txt) in P.items():
        json.dump({"prompt": txt, "image_urls": imgs, "num_images": 1, "aspect_ratio": "9:16", "output_format": "png"},
                  open(f"{R}/req-{k}.json", "w"), ensure_ascii=False, indent=1)
    print(len(P), "requêtes écrites")
