# Montage des thèmes par SINA : la logique

Consigne du propriétaire (8 novembre 2026) : SINA ne prend jamais une section « pour prendre une section ». Un thème
monté avec la bibliothèque de sections doit être **harmonieux, beau et fidèle à la marque ou au service**. Cette page
fixe la méthode ; le montage est gratuit (aucune IA), seuls les textes et les photos nouvelles sont payants et annoncés.

## 1. Chaque page raconte une histoire, dans un ordre

Une section a toujours un **rôle** dans le parcours du visiteur. SINA remplit les rôles dans l'ordre, et ne met une
section que si elle sert son rôle.

**Accueil**

1. **Accrocher** : l'ouverture (grande photo ou vidéo, titre de l'angle choisi à l'étape 4).
2. **Faire comprendre** : ce que fait la marque, en une idée (histoire qui s'allume, bento, chiffres réels).
3. **Donner envie** : les produits ou les prestations (une seule section de cartes).
4. **Faire ressentir** : un moment d'émotion (avant / après, citation, photo pleine, texte au défilement).
5. **Rassurer** : preuves réelles (engagements, garanties, avis, presse) — seulement si elles existent.
6. **Faire agir** : l'offre réelle ou l'appel final, puis le pied de page.

**Fiche produit**

1. **Acheter** : une seule section « Produit vedette », tout en haut, bloc d'achat adapté au produit. La livraison
   estimée, les points de fidélité, les offres (lots, « 2 achetés, 1 offert », cadeaux par paliers) et le choix entre
   plusieurs produits de la gamme sont des **fonctions de ce bloc**, jamais des sections à part.
2. **Comprendre** : la description racontée.
3. **Ressentir** : le moment, l'usage, l'émotion.
4. **Se convaincre** : points forts, composition, comparatif.
5. **Lever les doutes** : questions, préparation (la date de livraison est déjà dans le bloc d'achat).
6. **Rassurer** : engagements réels.
7. **Compléter** : lot, produits qui vont avec — seulement si le client en a.

**Site de services** : accrocher (avec la prise de rendez-vous si elle existe) → les prestations → la méthode ou le
déroulé → les preuves (réalisations, chantiers, avis réels) → la zone ou les infos pratiques → l'appel final (devis,
réservation, rappel).

## 2. D'abord la famille, choisie par le client

La bibliothèque est rangée en **familles qui ne se mélangent jamais** (`src/lib/syna-agent/section-families.ts`) :
**Classique** (calme, éditoriale, beaucoup d'air) et **Moderne** (titres énormes en capitales serrées, nom de la marque
en lettres immenses derrière le mannequin détouré qui déborde de l'ouverture, couleurs franches, animations vives ;
styles d'exemple « Sport chic » et « Streetwear néon »). SINA montre les familles **en image** (`theme.families`),
recommande d'après la marque sans choisir à sa place, enregistre le choix du client (`theme.family`) ; ensuite toutes
les sections viennent de cette famille, réglées aux couleurs et polices de la marque.

## 2 bis. Les sections choisies selon la marque

Chaque section porte des repères. **Mesurés aujourd'hui** (`public/sections/section-traits.json`) : **rôle**, **fond**
(clair, sombre, couleur ou photo), **densité** (aérée, moyenne, dense), nombre de photos, hauteur, et si la section peut
changer de fond (`inversable`). **Pas encore mesurés** (SINA les juge à la lecture de la section, `does`) : le **ton**
(calme, chaleureux, vif, luxueux, ludique, technique), la **disposition** (photo pleine, écran partagé, grille,
carrousel, texte seul, bande) et le **contenu réel requis** (avis, vidéo, photos de clients, offres…).

SINA compare ces repères à ce qu'elle sait déjà du projet :

- **la personnalité de la marque** (étape 1) et **l'angle choisi avec son émotion** (étape 4) : une marque calme et
  sensorielle (ex. Brindi) prend des sections lentes et aérées (texte qui s'allume, citation, photos qui avancent
  doucement) et **jamais** de jeu (carte à gratter) ni de compte à rebours agressif ; une marque vive peut en prendre ;
- **le métier** : sections produits pour une boutique, sections services pour une entreprise de services ;
- **le contenu réel** : une section qui demande des avis, une vidéo, des photos de clients ou une offre n'est prise
  que si ce contenu existe. Jamais de section remplie d'emplacements vides à la place.

## 3. Le rythme et l'harmonie de la page

- **Jamais deux dispositions pareilles à la suite**, **une seule section de cartes par page**.
- Les **fonds alternent** (clair, puis sombre ou couleur de marque) ; jamais deux bandes de même couleur collées.
- **Densité alternée** : une section dense est suivie d'une section qui respire.
- **Un seul moment fort d'animation** toutes les deux ou trois sections (vidéo, défilement, révélation) ; les autres
  restent sobres. Au plus **un élément ludique** par site, et seulement si la marque est ludique.
- **Jamais une photo en double**, ni dans une page, ni d'une page à l'autre (seule exception : la photo d'un produit sur
  sa carte ou sa fiche).
- Accueil : au moins 8 sections ; fiche produit : au moins 7.

## 4. Une seule identité visuelle d'un bout à l'autre

Tout le thème suit la planche d'identité (`BRAND_RULES`) : 5 couleurs au plus, deux polices, **un seul arrondi**,
**un seul style de bouton**, **un seul style d'icônes**, **une seule famille d'animations**. Une section de la
bibliothèque est réglée sur ces repères avant d'être posée ; elle ne garde jamais son style d'origine.

## 5. Deux options vraiment différentes

Quand SINA propose deux thèmes, ils diffèrent par l'ambiance (clair / sombre, photo / vidéo), par les sections et par
l'en-tête et le pied de page — jamais la même page repeinte. Les deux suivent les règles ci-dessus.

## 6. Contrôle avant de montrer, et explication au client

Avant de montrer un thème, le Studio vérifie (gratuit, `checkCustomTheme`) : pages obligatoires, 8 et 7 sections, ordre
des rôles, photos sans doublon, aucune section de commande sur Shopify, aucun faux compte à rebours ni offre d'exemple,
aucune section réservée à un autre genre de produit ; SINA voit l'accueil capturé sur ordinateur et sur téléphone
(`custom-theme/shots.ts`) avant d'en parler. Elle explique en une
phrase **pourquoi chaque section est là** (« la citation de Camille rassure sur le fait main »). Un écart est corrigé
avant d'être montré, jamais caché.

## 7. Dans le Studio : le thème sur mesure (9 novembre 2026)

Ces règles sont appliquées par les outils `custom.*` de SINA (`src/lib/syna-agent/custom-theme/`) :

- **Bibliothèque** : `public/sections/library.json` (préparée par `scripts/sections-library.py` depuis le catalogue),
  chaque section avec sa famille, son rôle, ce qu'elle fait et son HTML ; feuille, scripts et photos communs à côté. Les
  démonstrations en fausse fenêtre du catalogue ne sont jamais posées dans un thème.
- **Conception** (`custom.design`, payante, carte d'accord) : **aucun thème de départ** (décision du 9 novembre 2026 ; les
  compositions SOLSTICE, RUPTURE et Brindi ne servent qu'aux démonstrations et aux tests) ; le Studio conçoit toutes les
  pages pour le produit ou le service du client ; `custom.compose` ne sert qu'à une composition dictée par le client.
  Contrôle sans IA (`checkCustomTheme`), **bloquant** : famille unique, en-tête et pied de page, pages obligatoires,
  minimums de sections, une seule section de cartes par page, « Produit vedette » en haut de la fiche ou une fois sur
  l'accueil, jamais la même section deux fois de suite ni sur deux pages, offres en section à part et faux comptes à
  rebours refusés, Shopify sans section de commande, sections « seulement pour » un genre jamais ailleurs, **vraie photo en
  double refusée** (une photo d'exemple en double est à revoir : chaque emplacement reçoit la sienne au montage).
  À revoir seulement : deux sections du même rôle à la suite, accueil qui ne commence pas par une ouverture.
- **Marque du client** au rendu : nom (y compris un mot géant écrit lettre par lettre), couleurs, polices, logo, bloc
  d'achat réglé sur les vraies données du produit. Les textes et photos d'exemple sont annoncés comme tels tant que SINA ne
  les a pas remplacés.
- **Modifications sur demande** : le client désigne un élément dans le thème vivant ; SINA lit la section, change ce seul
  élément (texte, mise en forme limitée à la section, élément masqué, photo) ; tout se défait avec `custom.undo`.
