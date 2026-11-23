# Nadia, la marque : diagnostic (23 novembre 2026)

Demandé par le chef d'orchestre après la création des trois identités de Nadia. Fait sans aucun appel à l'IA : lu dans
la base du Studio d'essai (points de reprise de la tâche `oxe1kz2uk9bt54o1`, images enregistrées) et dans le code de la
version essayée (`5d0a7a3`). Les demandes ne sont pas enregistrées telles quelles par le Studio : elles sont
**reconstituées** en appelant les mêmes fonctions du code (`imagePrompt`, `fixLine`, `goutsDuClient`) sur les mêmes
données (identités, direction artistique gardée, fiche de Nadia, raisons des refus). Leur texte entier est en annexe.

Dépensé pour la marque, depuis le départ de l'essai : 4,67 €. Les 17 images ont coûté 0,82 € en tout (OpenAI,
`gpt-image-2.6-flare`) ; le reste est la réflexion, l'écriture et la relecture.

## 1. Les 9 logos

**Ce que le dessinateur a reçu (les 9 fois, même base) :** le nom et son épellation, le métier, une ligne « La marque : »,
les couleurs, la typographie, le fond blanc, la phrase de refus, et **une image jointe : la planche des 50 logos aimés**
(rôle `examples`, annoncée « seulement comme exemples »). Rien d'autre.

**Cause principale des maisons (6 logos sur 9) :** la ligne « La marque : » est écrite par la directrice artistique, et
elle parle de maison dans les trois identités :
- A « Sillage » : « le logo doit donner l'envie de s'approcher et de respirer, **comme une maison qui sent bon** » ;
- B « Halo » : « le logo doit faire ressentir **la chaleur d'une maison le soir** et la confiance qu'on a envers une voisine » ;
- C « Pénombre » : « elle doit faire ressentir **la maison chaude au retour** ».
C'est une idée de dessin qui passe au dessinateur sous la forme de « l'idée de la marque » ; le propriétaire a décidé
qu'aucune consigne de style ne lui parvient (21 novembre 2026). Pour A, la ligne dit aussi « la cliente refuse toute flamme
dessinée » : une reformulation de SINA, en plus de la phrase de Nadia.

**La phrase de refus de Nadia :** elle y était, mais pas seule ni exactement mot pour mot. Le dessinateur a reçu :
« Ce que le client refuse, avec ses mots : « Par contre pas de flamme dessinée dans le logo, toutes les marques de
bougies font ça. Il ne veut pas : pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. Il ne veut
pas : Mes mains je veux bien de temps en temps mais pas mon visage. » »
- la phrase est en double (une fois tirée de sa réponse de départ, une fois de sa fiche) ;
- « Il ne veut pas » est ajouté, au masculin ;
- **son refus sur les mains et le visage**, qui ne concerne pas le logo, arrive aussi au dessinateur du logo. Sa portée
  dans la fiche est « tout » : `goutsDuClient` prend les refus de portée « logo » et « images », et « tout » passe avec eux.

**Les logos déjà faits de la série : jamais reçus.** La règle : le 2e logo reçoit le 1er avec « je veux un logo
complètement différent », le 3e les deux premiers. Dans le code, un logo n'entre dans la série que s'il est **gardé**
(`brand-chain.ts`, `seriesLogos.push` seulement si `r.route.board.images?.logo` existe). Les 3 logos de A étant refusés,
B n'a rien reçu ; ceux de B refusés, C n'a rien reçu. Les trois identités sont donc parties chacune de zéro, avec chacune
une « maison » dans sa ligne « La marque » : d'où les mêmes dessins.

**Les 2e et 3e essais d'une même identité :** même demande, plus la correction de `fixLine` ajoutée à la fin :
- 2e essai : « CORRECTION : une première image a été refusée pour cette raison : « [raison du 1er refus] ». Refais
  l'image en corrigeant ce point. » ;
- 3e essai : « CORRECTION : les images précédentes ont été refusées pour ces raisons, à corriger TOUTES à la fois […] »
  avec les deux raisons, puis « Fais plus simple : retire de l'image tout élément qui porte une écriture non demandée
  (étiquette, emballage, enseigne, écran) ou laisse-le vierge. »
**Toutes les raisons des refus lui sont parvenues** (vérifié pour les 3 identités). Mais aucune ne dit « pas de maison »
au 2e essai de A : le relecteur parle de « maison, volutes, vague, bol » comme d'un trop-plein, pas comme d'une idée à
quitter, et la ligne « comme une maison qui sent bon » reste dans la demande. Le 3e essai reçoit en plus une phrase sur
les écritures (« étiquette, emballage, enseigne, écran ») qui n'a rien à voir avec un logo.

| Logo | Note | Raison du relecteur (début) |
|---|---|---|
| A1 Sillage | 5 | quatre motifs au trait fin (maison, volutes, vague, bol flottant) […] volutes qui rappellent une flamme |
| A2 Sillage | 5 | la volute orange évoque une flamme de bougie ; maison + volute + arc banal |
| A3 Sillage | 5 | toit, bol fumant, vague : une soupe maison plutôt qu'une bougie |
| B1 Halo | 6 | maison-fenêtre-cœur : pictogramme qui évoque l'immobilier |
| B2 Halo | 7 | cœur dans une maison avec rayons : cliché d'agence immobilière |
| B3 Halo | 6 | toit bleu et trait-sourire : pictogramme générique d'agence immobilière |
| C1 Pénombre | 5 | un arc en demi-cercle autour du pot : une arche interdite |
| C2 Pénombre | 7 | clipart générique qui évoque un pot de fleurs |
| C3 Pénombre | 6 | un ramequin de dessert plutôt qu'une bougie |

## 2. Les grandes scènes

**Les vraies photos de Nadia n'ont jamais été jointes.** Dans `runBoardImages`, la grande scène est demandée sans aucune
image : `make("hero", {}, imagePrompt("hero", …))` (`brand-images.ts`, ligne 685). Le pot est décrit avec
des mots par la directrice artistique (A : « un pot en verre épais rempli de cire de soja crème et mate, ouvert » ; C :
« le pot de la marque en verre épais, couvercle fermé, […] son étiquette tournée vers nous mais lisible seulement comme
une petite zone floue »). OpenAI invente donc le pot : il ne ressemble pas aux siens (un verre droit sans couvercle).
Le haut du site reçoit ensuite la grande scène en image jointe (rôle `scene`) : le pot inventé y est repris.

**Pourquoi « Pénombre » a donné trois pots de confiture :** la demande décrit un bocal fermé, avec une étiquette, posé à
côté d'une assiette de pain d'épices, sans mèche ni cire visibles. Rien ne dit « bougie » dans l'image : le dessinateur a
fait un bocal de confiture. Les corrections suivantes ont gardé la même description du pot fermé.

## 3. Le haut du site de « Pénombre », gardé à 5 sur 10

Relecture (`brand:imagecheck:1:C:logo+hero+site:site`) : note 5, `ok: false`, défaut « texte », raison : « un bandeau de
mois non demandé (JAN à DÉC, avec « JUI » en double) […] le pot de bougie de la photo est coupé par le bord droit ».
Ce que fait le code (`brand-images.ts`) :
1. ligne 588 : la note minimale (8 sur 10) n'est appliquée que si le relecteur a dit `ok: true` ;
   ici `ok` est faux, donc la note n'est pas regardée ;
2. ligne 592 : un refus de genre « texte » dont les textes attendus sont tous présents part en « doute » ; pour le haut
   du site, un texte en trop ne compte pas (`exact` vaut vrai si rien ne manque) ;
3. appel de seconde lecture (`brand:imagereread:1:C:logo+hero+site:site`) : il recopie les textes ;
4. ligne 620 : pour le haut du site, seuls les textes manquants font refuser ; rien ne manque, l'image est **gardée**.
La seconde raison du relecteur (le pot coupé) et sa note de 5 sont perdues en route. SINA a ensuite dit à Nadia que
« les hauts de site des trois sont soignés ».

## 4. Des planches sans logo montrées à Nadia

Le code le prévoit : `MAX_IMAGE_RETRIES` vaut 2 (le logo est dessiné 3 fois au plus), puis « Un logo encore refusé après
ses reprises est dit au client ; le haut du site porte alors le nom écrit seul, sans logo inventé » (`brand-images.ts`,
commentaire avant la ligne 700). La règle « jamais une planche incomplète » n'y est appliquée qu'au haut du site
(toujours dessiné), pas au logo. SINA l'a dit franchement à Nadia (« Les logos ne l'étaient pas non plus : à la place,
tu vois ton nom simplement écrit. Dès ton choix, je crée ton logo »). La grande scène de C, refusée 3 fois, manque aussi.
Le logo de la marque finie (après le choix) passe par le même dessinateur et la même ligne « La marque » : un nouvel échec
est probable sans réparation.

## 5. Le titre coupé « Bougies parfumées que je coule à la (provisoire) »

`provisionalName` (`src/lib/syna-agent/tools/start.ts`, ligne 64) prend la première phrase du client jusqu'à la première
virgule (« je fais des bougies parfumées que je coule à la main chez moi »), retire « je fais » et « des », coupe à 40
caractères, puis retire le dernier mot pour ne pas en couper un : « bougies parfumées que je coule à la main » fait
exactement 40 caractères, et le mot entier « main » est retiré quand même. Le nom provisoire n'a pas été remplacé ensuite.

## 6. Épreuves proposées pour « Évolution de SINA »

1. **Aucune idée de dessin dans la ligne « La marque » du logo** (« comme une maison qui sent bon » a donné 6 maisons sur
   9 logos).
2. **La série des logos compte aussi les logos refusés**, pour que chaque nouveau logo parte loin de ceux déjà faits.
3. **Au dessinateur du logo, seuls les refus qui concernent le logo**, une seule fois, tels qu'écrits (pas « Il ne veut
   pas », pas de doublon, pas le refus des mains et du visage).
4. **La note du relecteur s'applique toujours** : une image notée moins de 8 n'est jamais gardée, même quand son défaut
   est classé « texte ».
5. **Les vraies photos du client sont jointes aux images qui montrent son produit** (grande scène, haut du site), et le
   pot n'est jamais inventé quand le client a des photos.
6. **Le produit est reconnaissable** : une bougie montre sa cire et sa mèche (trois « pots de confiture » refusés).
7. **Le nom provisoire n'est pas coupé au milieu d'une idée** (« … que je coule à la »).

## Annexe : les demandes reconstituées, texte entier

```
GOUTS (o.gouts) = "Quelque chose de chaleureux, simple, pas trop chic. Par contre pas de flamme dessinée dans le logo, toutes les marques de bougies font ça.\nIl ne veut pas : pas de flamme dessinée dans le logo, toutes les marques de bougies font ça.\nIl ne veut pas : Mes mains je veux bien de temps en temps mais pas mon visage."
REFUS extrait = Ce que le client refuse, avec ses mots : « Par contre pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. Il ne veut pas : pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. Il ne veut pas : Mes mains je veux bien de temps en temps mais pas mon visage. »

===== A « Sillage » — logo — 1er essai =====
Crée le logo de la marque « Sillage ». Tu es totalement libre du dessin : l'idée, la forme, le dessin des lettres et le signe éventuel sont à toi.
Le nom s'écrit exactement « Sillage », lettre par lettre : S, i, l, l, a, g, e. Aucune lettre ajoutée, retirée ni changée, accents compris. Aucun autre mot.
Métier : Bougies parfumées coulées à la main près de Lyon.
La marque : Sillage croit qu'une bonne bougie se sent dès qu'on soulève le couvercle, et elle se bat contre la bougie qu'on achète pour son joli pot et qui sent à peine une fois chez soi : le logo doit donner l'envie de s'approcher et de respirer, comme une maison qui sent bon. Le ton est chaleureux, simple, proche, pas trop chic. Le métier : des bougies parfumées faites à la main chez elle, près de Lyon, et la cliente refuse toute flamme dessinée.
Couleurs de la marque : foncé #3A1F2B, couleur de marque #6E2A5E, surface #F5E6DC, accent #C77E4F, clair #FFFFFF.
Typographie de la marque : un caractère serif fine contrastée (dans l'esprit de Instrument Serif) ; tu peux le redessiner à ta façon.
Un seul logo, centré, à plat, net et lisible même en tout petit, sur un fond BLANC uni jusqu'aux bords, avec de l'air autour. Ni maquette, ni photo, ni cadre, ni ombre portée.
Ce que le client refuse, avec ses mots : « Par contre pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. Il ne veut pas : pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. Il ne veut pas : Mes mains je veux bien de temps en temps mais pas mon visage. »

----- A logo — essai 2 : ajouté à la fin de la même demande -----
CORRECTION : une première image a été refusée pour cette raison : « Le logo assemble quatre motifs au trait fin (maison, volutes, vague, bol flottant) : il devient illisible en petit, reste bien plus banal que la planche, et ses volutes orange rappellent une flamme, ce que le client refuse. ». Refais l'image en corrigeant ce point.

----- A logo — essai 3 : ajouté à la fin de la même demande -----
CORRECTION : les images précédentes ont été refusées pour ces raisons, à corriger TOUTES à la fois (corriger la dernière ne doit pas ramener une faute déjà corrigée) :
1. « Le logo assemble quatre motifs au trait fin (maison, volutes, vague, bol flottant) : il devient illisible en petit, reste bien plus banal que la planche, et ses volutes orange rappellent une flamme, ce que le client refuse. »
2. « La volute orange sous le toit, au-dessus du « ll », évoque une flamme de bougie, que le client refuse. L'ensemble maison + volute + arc en sourire est banal et bien plus sage que la planche de référence. »
Fais plus simple : retire de l'image tout élément qui porte une écriture non demandée (étiquette, emballage, enseigne, écran) ou laisse-le vierge.

===== A « Sillage » — hero — 1er essai =====
Direction artistique : Lumière de fin d'après-midi d'hiver, basse et douce, venue d'une fenêtre sur la gauche, avec des ombres longues et tendres. Les matières sont celles d'une maison : verre épais, cire de soja crème et mate, lin, bois clair, papier de soie. On regarde à hauteur de table ou en légère plongée, toujours au plus près du pot ouvert. Le crème #F5E6DC et le blanc dominent. Le violet figue #6E2A5E ponctue une seule touche par image, le cuivre #C77E4F réchauffe les reflets et le foncé #3A1F2B tient les ombres. Grain de pellicule fin et régulier.
Photographie paysage à hauteur de table, cadrage large avec de la profondeur, dans une cuisine de maison en fin d'après-midi d'hiver. Une table en bois clair couverte d'une nappe de lin crème occupe le premier plan, et au fond une fenêtre floue laisse voir un ciel pâle. Au centre gauche se trouve un pot en verre épais rempli de cire de soja crème et mate, ouvert, avec une mèche en coton éteinte. Son étiquette est tournée vers la fenêtre et reste hors de vue. Son couvercle, posé de biais contre le pot, montre sa face intérieure. À droite, trois figues mûres coupées en deux révèlent leur chair violette #6E2A5E. Derrière, un torchon de lin blanc plié est posé sur le bord de la table. La scène contient exactement 6 objets : la table, la nappe, le pot, le couvercle, les figues et le torchon. La moitié droite haute reste calme. La lumière rasante vient de gauche, des reflets cuivrés #C77E4F glissent dans le verre et les ombres sont prune foncé #3A1F2B. La mise au point est faite sur le bord du pot ouvert, le fond est doux, l'ambiance est chaude et intime.
Couleurs de la marque : foncé #3A1F2B, couleur de marque #6E2A5E, surface #F5E6DC, accent #C77E4F, clair #FFFFFF.
Image bord à bord : ni vignette, ni cadre arrondi, ni coins assombris.
Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane.
Aucune personne, aucun visage, aucune main. Aucun objet supplémentaire. Le sujet est entier dans le cadre : rien n'est coupé.
Aucune autre marque que celle-ci : un véhicule, un appareil ou un objet du quotidien ne porte aucun logo, aucun emblème ni aucun nom de constructeur ou de fabricant (calandre, jantes, hayon lisses).

===== A « Sillage » — site — 1er essai =====
Direction artistique : Lumière de fin d'après-midi d'hiver, basse et douce, venue d'une fenêtre sur la gauche, avec des ombres longues et tendres. Les matières sont celles d'une maison : verre épais, cire de soja crème et mate, lin, bois clair, papier de soie. On regarde à hauteur de table ou en légère plongée, toujours au plus près du pot ouvert. Le crème #F5E6DC et le blanc dominent. Le violet figue #6E2A5E ponctue une seule touche par image, le cuivre #C77E4F réchauffe les reflets et le foncé #3A1F2B tient les ombres. Grain de pellicule fin et régulier.
Maquette portrait d'un téléphone récent, entier, vu bien de face, posé sur un fond uni crème rosé très doux #F5E6DC, avec une ombre légère, sans aucun décor. En haut de l'écran, on voit l'heure et les signes du téléphone. Dessous, un en-tête discret est posé sur la photo : le menu replié à gauche, le logo fourni au centre, tel quel, et le panier à droite, en blanc. La photo de campagne remplit l'écran : un pot en verre épais, ouvert, rempli de cire de soja crème, vu en légère plongée, très grand et centré. Il déborde un peu sur les côtés. Son couvercle est soulevé et posé de biais contre lui, avec sa pastille ronde violette unie. Toute l'image baigne dans le violet figue #6E2A5E : la nappe, le fond et les ombres sont dans cette teinte, avec des reflets cuivrés #C77E4F dans le verre. Le bas de la photo s'assombrit en dégradé prune #3A1F2B. On y trouve le titre centré, très grand, sur deux lignes, dans une sérif élégante en blanc ; la seconde moitié du titre passe en italique cuivre #C77E4F. Dessous vient la ligne courte, en petit, en blanc, centrée. Ensuite, un bouton en pilule centré, cuivre clair #C77E4F, avec son texte foncé #3A1F2B et une petite flèche vers le haut à droite. Enfin, une rangée de cinq pastilles rondes crème porte chacune l'un des cinq noms de parfums de la ligne.
Couleurs de la marque : foncé #3A1F2B, couleur de marque #6E2A5E, surface #F5E6DC, accent #C77E4F, clair #FFFFFF.
Le logo fourni en image de référence est reproduit tel quel, à la place indiquée : il n'est ni redessiné, ni recoloré, et aucune de ses lettres ne change.
Maquette de présentation d'un site, au niveau des plus beaux sites primés de 2026 : UN téléphone récent, entier, vu bien de face, posé sur un fond uni très doux, avec une ombre légère ; son écran montre le haut de la page d'accueil décrit ci-dessus (l'heure et les signes du téléphone en haut, puis l'en-tête du site). Le titre est TRÈS grand et occupe une vraie place sur l'écran ; un seul bouton ; très peu de mots. Le logo de l'en-tête est GRAND et net (au moins un tiers de la largeur de l'écran), recopié tel quel depuis l'image de référence, chaque lettre du nom lisible. Mise en page nette et précise : typographie soignée, alignements exacts, de l'air. Rien autour du téléphone : ni main, ni table, ni décor.
Si la maquette montre des tuiles, des pastilles ou des entrées de menu, elles ne portent QUE ces mots, écrits tels quels : « Les parfums », « Offrir », « L'atelier », « Contact ». N'invente aucune prestation, aucune catégorie, aucune offre.
Image bord à bord : ni vignette, ni cadre arrondi, ni coins assombris.
Sous le titre et le bouton, la photo de campagne remplit l'écran du téléphone jusqu'en bas : aucune zone blanche vide.
Textes à écrire dans l'image, lettre pour lettre, accents et ponctuation compris : « Des bougies qui sentent fort. » ; « Trouver mon parfum ». Aucun autre texte, aucun mot inventé, aucun faux texte de remplissage.
Aucune personne, aucun visage, aucune main. Aucun objet supplémentaire. Le sujet est entier dans le cadre : rien n'est coupé.
Aucune autre marque que celle-ci : un véhicule, un appareil ou un objet du quotidien ne porte aucun logo, aucun emblème ni aucun nom de constructeur ou de fabricant (calandre, jantes, hayon lisses).

===== B « Halo » — logo — 1er essai =====
Crée le logo de la marque « Halo ». Tu es totalement libre du dessin : l'idée, la forme, le dessin des lettres et le signe éventuel sont à toi.
Le nom s'écrit exactement « Halo », lettre par lettre : H, a, l, o. Aucune lettre ajoutée, retirée ni changée, accents compris. Aucun autre mot.
Métier : Bougies parfumées coulées à la main près de Lyon.
La marque : Halo croit qu'une bougie devrait être faite près de chez soi, par quelqu'un qu'on peut croiser au marché, et se bat contre la bougie fabriquée loin, en grande série, sans personne derrière ; le logo doit faire ressentir la chaleur d'une maison le soir et la confiance qu'on a envers une voisine. Ton chaleureux, simple, proche, pas trop chic. Bougies parfumées coulées à la main dans une maison près de Lyon.
Couleurs de la marque : foncé #2A1A22, couleur de marque #2B4C8C, surface #FFF0DC, accent #B4450F, clair #FFF6EA.
Typographie de la marque : un caractère ronde épaisse (dans l'esprit de Nunito) ; tu peux le redessiner à ta façon.
Un seul logo, centré, à plat, net et lisible même en tout petit, sur un fond BLANC uni jusqu'aux bords, avec de l'air autour. Ni maquette, ni photo, ni cadre, ni ombre portée.
Ce que le client refuse, avec ses mots : « Par contre pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. Il ne veut pas : pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. Il ne veut pas : Mes mains je veux bien de temps en temps mais pas mon visage. »

----- B logo — essai 2 : ajouté à la fin de la même demande -----
CORRECTION : une première image a été refusée pour cette raison : « Le texte est juste et il n'y a pas de flamme, mais le symbole maison-fenêtre-cœur est un pictogramme banal qui évoque l'immobilier plutôt que la bougie. Il est nettement plus sage que la planche, et les petits traits pêche autour du cœur disparaissent en ». Refais l'image en corrigeant ce point.

----- B logo — essai 3 : ajouté à la fin de la même demande -----
CORRECTION : les images précédentes ont été refusées pour ces raisons, à corriger TOUTES à la fois (corriger la dernière ne doit pas ramener une faute déjà corrigée) :
1. « Le texte est juste et il n'y a pas de flamme, mais le symbole maison-fenêtre-cœur est un pictogramme banal qui évoque l'immobilier plutôt que la bougie. Il est nettement plus sage que la planche, et les petits traits pêche autour du cœur disparaissent en »
2. « Le symbole en haut (cœur dans une maison avec rayons) est un cliché d'agence immobilière ou d'aide à domicile, sans lien avec la bougie ; la maison crème pâle disparaît en petit et le trait bleu en bas semble rapporté. »
Fais plus simple : retire de l'image tout élément qui porte une écriture non demandée (étiquette, emballage, enseigne, écran) ou laisse-le vierge.

===== B « Halo » — hero — 1er essai =====
Direction artistique : Lumière du soir en intérieur, vers vingt heures : une seule source basse et chaude, la petite flamme d'une bougie, qui pose un cercle doux abricot vers pêche et laisse les bords de l'image dans un bleu du soir profond. Matières vraies et proches : verre épais, cire de soja crème, lin froissé, bois clair huilé, papier de soie. Point de vue à hauteur de table, cadrage serré, faible profondeur de champ. Dominent le dégradé #FFD27A vers #FFA98A et le bleu #2B4C8C ; l'orangé #B4450F ponctue, le #2A1A22 tient les ombres. Grain fin de pellicule, noirs veloutés.
Photographie de campagne en format paysage, à hauteur de table basse, cadrage large mais intime sur un coin de salon le soir. Le fond est un mur enduit plongé dans un bleu du soir #2B4C8C, avec une fenêtre floue à gauche où tombe la nuit. Au tiers droit, posé sur une table basse en bois clair huilé, un pot de bougie en verre épais et transparent, rempli de cire de soja crème, mèche en coton allumée, flamme petite et calme ; son étiquette est tournée vers le mur, invisible. Derrière le pot, sur le mur, la lumière dessine un grand disque doux abricot vers pêche. Devant le pot, un plaid en lin couleur #FFF0DC replié, posé en travers de la table. À gauche, une branche de figuier avec trois feuilles larges, dans un vase en grès brun, floue. La scène contient exactement 4 objets : le pot allumé, le plaid, le vase en grès, la branche de figuier. Aucune lettre, aucune étiquette visible, aucune personne. La moitié gauche reste calme et sombre. Lumière unique venant de la flamme, ombres longues et douces dans le #2A1A22, reflets dorés dans le verre, grain fin, mise au point sur le bord du pot, ambiance de soirée tranquille à la maison.
Couleurs de la marque : foncé #2A1A22, couleur de marque #2B4C8C, surface #FFF0DC, accent #B4450F, clair #FFF6EA.
Image bord à bord : ni vignette, ni cadre arrondi, ni coins assombris.
Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane.
Aucune personne, aucun visage, aucune main. Aucun objet supplémentaire. Le sujet est entier dans le cadre : rien n'est coupé.
Aucune autre marque que celle-ci : un véhicule, un appareil ou un objet du quotidien ne porte aucun logo, aucun emblème ni aucun nom de constructeur ou de fabricant (calandre, jantes, hayon lisses).

===== B « Halo » — site — 1er essai =====
Direction artistique : Lumière du soir en intérieur, vers vingt heures : une seule source basse et chaude, la petite flamme d'une bougie, qui pose un cercle doux abricot vers pêche et laisse les bords de l'image dans un bleu du soir profond. Matières vraies et proches : verre épais, cire de soja crème, lin froissé, bois clair huilé, papier de soie. Point de vue à hauteur de table, cadrage serré, faible profondeur de champ. Dominent le dégradé #FFD27A vers #FFA98A et le bleu #2B4C8C ; l'orangé #B4450F ponctue, le #2A1A22 tient les ombres. Grain fin de pellicule, noirs veloutés.
Maquette en format portrait : un téléphone récent, entier, vu bien de face, posé sur un fond uni très doux couleur #FFF0DC, ombre légère dessous, rien autour. En haut de l'écran, l'heure et les petits signes du téléphone en clair, puis l'en-tête posé sur la photo sans barre : menu replié à gauche, logo fourni tel quel au centre, panier à droite, en #FFF6EA. Ouverture image immersive : une photo de bougie allumée le soir remplit tout l'écran et déborde. Un pot en verre de cire crème, cadré de très près, coupé par le bas de l'écran, flamme petite au tiers haut, étiquette tournée et invisible ; autour, un grand halo abricot vers pêche qui baigne tout le haut, puis le fond qui glisse vers un bleu du soir #2B4C8C. Le bas se teinte en dégradé #2A1A22. Le titre est posé dans le halo, en bas, dans la famille de lettres de la planche, en capitales serrées et grasses, très grand sur trois lignes, couleur #FFF6EA, le dernier mot en italique pêche #FFA98A. Dessous, la ligne courte en petit, crème. En bas, un bouton large sur toute la largeur, coins doucement arrondis, abricot clair #FFD27A, texte #2A1A22, petite flèche vers le haut à droite. Rien d'autre. Lumière chaude, grain fin, verre brillant.
Couleurs de la marque : foncé #2A1A22, couleur de marque #2B4C8C, surface #FFF0DC, accent #B4450F, clair #FFF6EA.
Le logo fourni en image de référence est reproduit tel quel, à la place indiquée : il n'est ni redessiné, ni recoloré, et aucune de ses lettres ne change.
Maquette de présentation d'un site, au niveau des plus beaux sites primés de 2026 : UN téléphone récent, entier, vu bien de face, posé sur un fond uni très doux, avec une ombre légère ; son écran montre le haut de la page d'accueil décrit ci-dessus (l'heure et les signes du téléphone en haut, puis l'en-tête du site). Le titre est TRÈS grand et occupe une vraie place sur l'écran ; un seul bouton ; très peu de mots. Le logo de l'en-tête est GRAND et net (au moins un tiers de la largeur de l'écran), recopié tel quel depuis l'image de référence, chaque lettre du nom lisible. Mise en page nette et précise : typographie soignée, alignements exacts, de l'air. Rien autour du téléphone : ni main, ni table, ni décor.
Si la maquette montre des tuiles, des pastilles ou des entrées de menu, elles ne portent QUE ces mots, écrits tels quels : « Les parfums », « Offrir », « Les marchés », « Mon atelier ». N'invente aucune prestation, aucune catégorie, aucune offre.
Image bord à bord : ni vignette, ni cadre arrondi, ni coins assombris.
Sous le titre et le bouton, la photo de campagne remplit l'écran du téléphone jusqu'en bas : aucune zone blanche vide.
Textes à écrire dans l'image, lettre pour lettre, accents et ponctuation compris : « La lumière du soir, coulée à la main à Brignais. » ; « Parfumer mon salon ». Aucun autre texte, aucun mot inventé, aucun faux texte de remplissage.
Aucune personne, aucun visage, aucune main. Aucun objet supplémentaire. Le sujet est entier dans le cadre : rien n'est coupé.
Aucune autre marque que celle-ci : un véhicule, un appareil ou un objet du quotidien ne porte aucun logo, aucun emblème ni aucun nom de constructeur ou de fabricant (calandre, jantes, hayon lisses).

===== C « Pénombre » — logo — 1er essai =====
Crée le logo de la marque « Pénombre ». Tu es totalement libre du dessin : l'idée, la forme, le dessin des lettres et le signe éventuel sont à toi.
Le nom s'écrit exactement « Pénombre », lettre par lettre : P, é, n, o, m, b, r, e. Aucune lettre ajoutée, retirée ni changée, accents compris. Aucun autre mot.
Métier : Bougies parfumées en cire de soja, Brignais.
La marque : Cette marque croit qu'une bougie est faite pour être allumée les soirs d'hiver, quand la nuit tombe tôt, et elle se bat contre la bougie de déco qu'on pose sur une étagère sans jamais l'allumer ; elle doit faire ressentir la maison chaude au retour, l'odeur qui revient chaque octobre. Son ton : chaleureux, simple, proche, jamais chic. Le métier : des bougies parfumées coulées à la main à la maison, près de Lyon (la créatrice refuse toute flamme dessinée).
Couleurs de la marque : foncé #1F1714, couleur de marque #2F6A4E, surface #3A2B25, accent #E9A24F, clair #FBEFDD.
Typographie de la marque : un caractère slab très grasse (grands titres) (dans l'esprit de Alfa Slab One) ; tu peux le redessiner à ta façon.
Un seul logo, centré, à plat, net et lisible même en tout petit, sur un fond BLANC uni jusqu'aux bords, avec de l'air autour. Ni maquette, ni photo, ni cadre, ni ombre portée.
Ce que le client refuse, avec ses mots : « Par contre pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. Il ne veut pas : pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. Il ne veut pas : Mes mains je veux bien de temps en temps mais pas mon visage. »

----- C logo — essai 2 : ajouté à la fin de la même demande -----
CORRECTION : une première image a été refusée pour cette raison : « Un arc vert en demi-cercle entoure le pot de bougie au-dessus du nom, ce qui forme une arche interdite. L'ensemble reste aussi trop sage et banal face au niveau de la planche de référence. ». Refais l'image en corrigeant ce point.

----- C logo — essai 3 : ajouté à la fin de la même demande -----
CORRECTION : les images précédentes ont été refusées pour ces raisons, à corriger TOUTES à la fois (corriger la dernière ne doit pas ramener une faute déjà corrigée) :
1. « Un arc vert en demi-cercle entoure le pot de bougie au-dessus du nom, ce qui forme une arche interdite. L'ensemble reste aussi trop sage et banal face au niveau de la planche de référence. »
2. « Le symbole en haut (pot sombre entouré de feuilles, points orange, trait à losange) fait clipart générique et évoque un pot de fleurs ; il est nettement plus banal que la planche de référence. »
Fais plus simple : retire de l'image tout élément qui porte une écriture non demandée (étiquette, emballage, enseigne, écran) ou laisse-le vierge.

===== C « Pénombre » — hero — 1er essai =====
Direction artistique : Lumière de fin d'après-midi d'hiver, vers 17 h : une lampe basse et chaude hors champ, à gauche, qui découpe des ombres douces et longues, et un reste de bleu froid derrière la vitre. Matières de maison : bois brut, lin épais, laine, verre épais, papier de soie. Prise de vue à hauteur de table ou en trois quarts légèrement plongeant, avec de la profondeur et des arrière-plans flous. Le brun du soir #3A2B25 et le foncé #1F1714 dominent ; l'ambre #E9A24F brille par touches, le sapin #2F6A4E ponctue et le crème #FBEFDD éclaire. Grain argentique fin, noirs jamais bouchés.
Photographie de campagne en format paysage, à hauteur de table, cadrage large avec beaucoup de profondeur. Une table de cuisine en bois brun foncé devant une fenêtre à petits carreaux, où le ciel de 17 h vire au bleu nuit. Au premier tiers gauche, le pot de la marque en verre épais, couvercle fermé, entier, son étiquette tournée vers nous mais lisible seulement comme une petite zone floue, sans aucun texte net. À droite, un torchon en lin vert sapin plié. Au centre, en retrait, une assiette en grès avec trois tranches de pain d'épices. Derrière, sur le rebord de la fenêtre, un petit bouquet de branches de sapin dans une cruche crème. La scène contient exactement 4 objets : le pot, le torchon, l'assiette de pain d'épices, la cruche de sapin. Aucune personne, aucune main, aucune flamme visible. Le ciel de la fenêtre reste calme en haut à droite. Lumière ambrée d'une lampe hors champ à gauche, reflets dorés dans le verre, ombres longues et douces, buée légère sur la vitre, mise au point sur le pot, arrière-plan flou, ambiance de soir qui tombe tôt.
Couleurs de la marque : foncé #1F1714, couleur de marque #2F6A4E, surface #3A2B25, accent #E9A24F, clair #FBEFDD.
Image bord à bord : ni vignette, ni cadre arrondi, ni coins assombris.
Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane.
Aucune personne, aucun visage, aucune main. Aucun objet supplémentaire. Le sujet est entier dans le cadre : rien n'est coupé.
Aucune autre marque que celle-ci : un véhicule, un appareil ou un objet du quotidien ne porte aucun logo, aucun emblème ni aucun nom de constructeur ou de fabricant (calandre, jantes, hayon lisses).

----- C hero — essai 2 : ajouté à la fin de la même demande -----
CORRECTION : une première image a été refusée pour cette raison : « Le bocal au centre gauche est un pot de confiture avec une étiquette vierge, et non une bougie en cire de soja : le produit du métier est absent et l'étiquette est vide sans raison. ». Refais l'image en corrigeant ce point.

----- C hero — essai 3 : ajouté à la fin de la même demande -----
CORRECTION : les images précédentes ont été refusées pour ces raisons, à corriger TOUTES à la fois (corriger la dernière ne doit pas ramener une faute déjà corrigée) :
1. « Le bocal au centre gauche est un pot de confiture avec une étiquette vierge, et non une bougie en cire de soja : le produit du métier est absent et l'étiquette est vide sans raison. »
2. « L'étiquette du bocal, au centre gauche, est vierge : un grand cadre vide avec un seul brin de sapin, sans nom ni logo. Il faut y poser le logo « Pénombre » ou retirer ce cadre vide. »
Fais plus simple : retire de l'image tout élément qui porte une écriture non demandée (étiquette, emballage, enseigne, écran) ou laisse-le vierge.

===== C « Pénombre » — site — 1er essai =====
Direction artistique : Lumière de fin d'après-midi d'hiver, vers 17 h : une lampe basse et chaude hors champ, à gauche, qui découpe des ombres douces et longues, et un reste de bleu froid derrière la vitre. Matières de maison : bois brut, lin épais, laine, verre épais, papier de soie. Prise de vue à hauteur de table ou en trois quarts légèrement plongeant, avec de la profondeur et des arrière-plans flous. Le brun du soir #3A2B25 et le foncé #1F1714 dominent ; l'ambre #E9A24F brille par touches, le sapin #2F6A4E ponctue et le crème #FBEFDD éclaire. Grain argentique fin, noirs jamais bouchés.
Maquette d'un téléphone récent, entier, vu bien de face, posé sur un fond uni crème très doux #FBEFDD avec une ombre légère. L'écran montre le haut de l'accueil sur un fond brun du soir #3A2B25. En haut, l'heure et les signes du téléphone en crème, puis l'en-tête discret : menu replié à gauche, logo fourni posé tel quel au centre, panier à droite. Le titre occupe le haut, très grand, sur trois lignes, aligné à gauche, dans la sérif chaude de la planche, en graisse moyenne, crème ; le mot de l'hiver passe en italique et en ambre #E9A24F. Juste dessous, la ligne courte en petit, crème atténué. Puis le bouton large sur toute la largeur, ambre #E9A24F, coins doux, texte foncé #1F1714, petite flèche vers le haut à droite. Dessous, une photo dans un cadre aux coins arrondis : le pot de la marque en très gros plan, coupé par le bord droit, couvercle fermé, sur un rebord de fenêtre en bois, la vitre bleu nuit derrière, toute l'image baignée de brun et d'ambre, reflets dorés dans le verre. Sous la photo, la rangée des douze initiales des mois, en capitales espacées, crème, les quatre mois d'hiver plus grands et en ambre. Rien d'autre à l'écran, aucune main, aucune personne.
Couleurs de la marque : foncé #1F1714, couleur de marque #2F6A4E, surface #3A2B25, accent #E9A24F, clair #FBEFDD.
Le logo fourni en image de référence est reproduit tel quel, à la place indiquée : il n'est ni redessiné, ni recoloré, et aucune de ses lettres ne change.
Maquette de présentation d'un site, au niveau des plus beaux sites primés de 2026 : UN téléphone récent, entier, vu bien de face, posé sur un fond uni très doux, avec une ombre légère ; son écran montre le haut de la page d'accueil décrit ci-dessus (l'heure et les signes du téléphone en haut, puis l'en-tête du site). Le titre est TRÈS grand et occupe une vraie place sur l'écran ; un seul bouton ; très peu de mots. Le logo de l'en-tête est GRAND et net (au moins un tiers de la largeur de l'écran), recopié tel quel depuis l'image de référence, chaque lettre du nom lisible. Mise en page nette et précise : typographie soignée, alignements exacts, de l'air. Rien autour du téléphone : ni main, ni table, ni décor.
Si la maquette montre des tuiles, des pastilles ou des entrées de menu, elles ne portent QUE ces mots, écrits tels quels : « Les parfums », « L'hiver », « Pour offrir », « L'atelier ». N'invente aucune prestation, aucune catégorie, aucune offre.
Image bord à bord : ni vignette, ni cadre arrondi, ni coins assombris.
Sous le titre et le bouton, la photo de campagne remplit l'écran du téléphone jusqu'en bas : aucune zone blanche vide.
Textes à écrire dans l'image, lettre pour lettre, accents et ponctuation compris : « Les bougies des soirs d'hiver. » ; « Choisir ma bougie d'hiver ». Aucun autre texte, aucun mot inventé, aucun faux texte de remplissage.
Aucune personne, aucun visage, aucune main. Aucun objet supplémentaire. Le sujet est entier dans le cadre : rien n'est coupé.
Aucune autre marque que celle-ci : un véhicule, un appareil ou un objet du quotidien ne porte aucun logo, aucun emblème ni aucun nom de constructeur ou de fabricant (calandre, jantes, hayon lisses).
```
