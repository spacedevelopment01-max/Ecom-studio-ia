# TRAVERSE — ouvrir les images dans Claude

Les 4 maquettes et 9 photographies sont de vrais fichiers Git. Lire d’abord CONSIGNE_VALIDEE.md.

## Accès local recommandé

Depuis le dépôt, récupérer la branche :

```sh
git fetch origin claude/themes-differenciation
```

Pour consulter les images sans écraser le travail local, extraire le dossier dans un répertoire temporaire :

```sh
lecture_dir=$(mktemp -d)
git archive origin/claude/themes-differenciation docs/design/traverse-reference-20261023 | tar -x -C "$lecture_dir"
printf '%s\n' "$lecture_dir/docs/design/traverse-reference-20261023/lecture-jpg"
```

Ouvrir ensuite chaque JPG avec l’outil de lecture VISUELLE de fichiers de Claude (Read avec un chemin local absolu, si disponible). Un fetch textuel d’une page GitHub, un inventaire ou une chaîne base64 ne permet pas de voir une image. Ne pas demander à Thomas de renvoyer les fichiers avant d’avoir essayé l’extraction Git et la lecture visuelle locale. En cas d’échec, donner le chemin et l’erreur exacte.

Les JPG conservent dimensions et cadrage ; ce sont des copies de compatibilité avec compression, sans nouvelle génération. Les WebP restent les sources pour intégrer le thème. Ne pas utiliser les planches comme pages-image.

## Réparation vérifiée le 23 octobre 2026

L’ancien medias/detail-poche.webp était tronqué : 786445 octets présents contre 868608 annoncés dans son en-tête RIFF. Son décodage échouait. Remplacement depuis le PNG original « Poche zippée olive, étiquette TRAVERSE.png », encodé sans perte. L’empreinte du manifeste principal est actualisée. Aucun changement de composition du site.

Contrôle : décodage complet des 13 WebP et 13 JPEG ; dimensions et SHA-256 consignés dans manifest-lecture.json. Ce contrôle ne constitue pas une confirmation de lecture dans la session distante de Claude.

## Galerie des fichiers

### 01-accueil-composition

![01-accueil-composition](lecture-jpg/maquettes/01-accueil-composition.jpg)

### 02-commerce-composition

![02-commerce-composition](lecture-jpg/maquettes/02-commerce-composition.jpg)

### 03-pages-complementaires

![03-pages-complementaires](lecture-jpg/maquettes/03-pages-complementaires.jpg)

### 04-article-et-legal

![04-article-et-legal](lecture-jpg/maquettes/04-article-et-legal.jpg)

### detail-boucle

![detail-boucle](lecture-jpg/medias/detail-boucle.jpg)

### detail-poche

![detail-poche](lecture-jpg/medias/detail-poche.jpg)

### detail-poignee

![detail-poignee](lecture-jpg/medias/detail-poignee.jpg)

### hero-gare

![hero-gare](lecture-jpg/medias/hero-gare.jpg)

### lac

![lac](lecture-jpg/medias/lac.jpg)

### montagne

![montagne](lecture-jpg/medias/montagne.jpg)

### paysage

![paysage](lecture-jpg/medias/paysage.jpg)

### produit-reference

![produit-reference](lecture-jpg/medias/produit-reference.jpg)

### train

![train](lecture-jpg/medias/train.jpg)
