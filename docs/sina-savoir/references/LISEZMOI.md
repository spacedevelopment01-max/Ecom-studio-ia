# La bibliothèque de références de SINA

Relevée le 13 novembre 2026, à la demande du propriétaire : « sina et ou son sous agent qui fait les thèmes doit
connaître enormenment de référence afin de ne jamais faire de doublon dans les conception sur mesure que ce soit pour du
service ou du produit ».

**Statut : pas encore lue par SINA.** Rien n'est branché dans le Studio. Ce dossier est la matière de la
« documentaliste » décrite dans `../methode-montage-de-theme.md`.

## Ce qu'il contient

`cartes.json` : une carte d'identité par site relevé (1 072 cartes).

| Source | Cartes | Ce que c'est |
|---|---|---|
| `themes` | 340 | Boutiques de démonstration des thèmes de la boutique de thèmes de Shopify (234 thèmes, tous couverts). |
| `marques` | 404 | Vraies boutiques de marques, prises dans une galerie publique, sur 18 secteurs. |
| `services` | 328 | Modèles de sites de services d'une place de marché de modèles, sur 31 métiers. |

Les chiffres tirés de ces cartes sont dans `../theme-atlas-des-references.md`.

## Ce que dit une carte

| Champ | Contenu |
|---|---|
| `cle`, `source`, `url` | L'identifiant, la source et l'adresse du site (sans texte ni image du site). |
| `groupe` | Le secteur (vraies boutiques), le métier (services) ou les secteurs annoncés (thèmes). `theme` : le nom du thème. |
| `plateforme` | L'outil qui fait tourner le site, reconnu à son code. |
| `ouverture` | La forme de l'ouverture sur téléphone et sur ordinateur, sa hauteur en écrans, le nombre de mots du titre, le nombre de boutons. |
| `polices` | La police des plus grands titres, celle du texte, la taille du plus grand texte, capitales, italique. |
| `couleurs` | Le fond de la page et les fonds de section les plus étendus (code et nom de couleur), fond sombre ou non, la couleur du bouton principal. |
| `formes` | La forme du bouton (pilule, arrondi, coins adoucis, angles vifs), bouton plein ou non, proportion et coins de la carte produit. |
| `entete` | La place du logo, le nombre de liens du menu, la présence d'une barre d'annonce. |
| `gestes` | Les gestes relevés par le programme : éléments penchés, formes découpées, titres géants, bande qui défile, points cliquables, avant et après, etc. |
| `sections`, `noms` | Le rôle de chaque section de l'accueil, dans l'ordre, et le nom que son créateur lui a donné dans le code. |
| `nb`, `ecrans`, `mots` | Le nombre de sections, la longueur de l'accueil en écrans de téléphone, le nombre de mots. |
| `fiche` | Pour les boutiques Shopify : l'ordre du bloc d'achat, la place du bouton, bouton collant ou non, la proportion de la première image, les sections sous le bloc d'achat. |

## Comment elle a été relevée

Un programme ouvre chaque site dans un navigateur, sur un téléphone simulé (écran visible de 390 × 664 points) puis sur
un ordinateur (premier écran seulement). Il fait défiler la page, relève les sections, les styles réellement affichés
et, sur les boutiques Shopify, la première fiche produit. Aucune IA, aucun coût. Aucun texte ni aucune image des sites
n'est gardé : seulement des faits de structure et de style. Les captures d'écran ont servi à la vérification et ne
sont pas dans le dépôt.

## Limites

- Le découpage des sections est sûr sur Shopify, moins sur les autres sites : 54 cartes sont marquées `incertain` (leur style est valable, pas leur structure).
- Sur 1 150 sites ouverts, 78 n'ont pas donné de carte : page protégée par un mot de passe, bloquée ou vide.
- Le rôle des sections est déduit de leur nom et de leur contenu : il y a des erreurs.
- Les sites sont presque tous en anglais ; les modèles de sites de services ne sont pas de vrais commerces.
- L'échantillon n'est pas tiré au sort (boutiques les plus récentes de la galerie, premiers modèles de chaque
  catégorie).
- Une référence sert à comparer et à s'écarter, jamais à copier : on retient des principes, pas une allure.
- Les sites changent : une carte dit ce qu'était le site le jour du relevé.
