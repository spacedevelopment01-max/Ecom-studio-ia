# Charte qualité 2026 de SYNA

**Statut : proposition à valider par le propriétaire (6 novembre 2026).**

Consigne n° 1 du propriétaire : tout ce que SYNA produit pour un client (logos, textes, référencement, images, maquettes,
thèmes, publications, publicités) doit être au niveau des meilleurs sites de 2026. Une finition « années 2000 » n'est
jamais montrée au client.

**Référence de niveau** : les 15 thèmes refaits d'après les maquettes de Thomas (FRAISE, ONDE, SILLON, SOUPLE, HEUREN,
NOCTIL, TRAVERSE, MUSEAU CLUB, RIVE, TABLE SAISON, ATELIER NUANCE, PARENTHÈSE, PHASE, MAISON & HORIZON, APLAT) pour les
textes, le référencement, les images et la mise en page. Les logos ont leur propre référence (section 2).

**Ce document sert de barème.** Chaque livrable est contrôlé selon ces critères avant d'être montré. En dessous du niveau,
il est refait ; s'il reste en dessous, il est montré comme raté, jamais présenté comme bon.

---

## 1. Règles communes à tout livrable

1. **Rien d'inventé** : ni avis, ni note, ni chiffre, ni délai, ni garantie, ni diplôme, ni certification, ni stock, ni
   compte à rebours, ni faux ancien prix. Un manque s'écrit « [À compléter : …] » et reste visible pour le client.
2. **Un exemple est annoncé** : prix d'exemple, projet illustratif, simulation (« Démonstration — demande non envoyée »).
3. **Le vocabulaire du client** est repris tel quel et retenu pour toujours (mémoire du projet).
4. **Une seule source** pour les prix, durées, horaires, produits et biens : jamais écrits en dur dans le thème.
5. **Aucune personne générée** sans photo fournie par le client ou autorisation écrite.
6. **Bilingue FR/EN** quand le projet l'est.

---

## 2. Identité de marque et logos

### 2.1 Trois identités vraiment différentes

Les 3 identités proposées diffèrent sur **au moins 4 des 6 axes**, dont toujours le premier :

| Axe | Exemple de vraie différence |
|---|---|
| 1. Territoire émotionnel | évasion / fierté artisanale / complicité joyeuse |
| 2. Style du nom | mot inventé court / mot français évocateur / nom composé ou initiales |
| 3. Famille de couleurs | sombre et un accent vif / tons chauds ton sur ton / clair et pastel |
| 4. Famille de polices | serif fine contrastée / sans serif condensée très grasse / ronde épaisse |
| 5. Ton du slogan | poétique / direct et impératif / complice et léger |
| 6. Style de logo | voir 2.3 |

**Règles du propriétaire des 6 et 7 novembre 2026 (essai réel, confitures)** — contrôlées par le Studio
(`src/lib/syna-agent/identities.ts`) :
- **Trois fonds de page** : une identité sur fond blanc, une sur fond en **dégradé de couleurs** (jamais beige ni
  crème), une sur fond sombre (texte clair).
- **Références du propriétaire du 7 novembre** (`src/lib/syna-agent/brand-references.ts`, exemples à ne jamais
  recopier) : « 50 noms et leurs slogans » et « 50 palettes de couleurs ».
  - Noms sobres et évocateurs : une image du métier ou de son geste (Braise Douce, Cabosse & Sel, Grain d'Altitude),
    « X & Y », « Maison / Atelier / Studio … », ou un mot inventé doux (Noctelle, Savelle) ; aucun jeu de mots appuyé.
  - Slogans courts et concrets (9 mots au plus), souvent au tutoiement : « Fais le noir, trouve le calme. »
  - Palettes à cinq rôles : fond, texte (foncé teinté, jamais noir pur), bouton (couleur de marque), surface,
    accent (détails) ; dégradé à 135° (départ, arrivée) ; titres dans la couleur du texte. Couleurs accordées et
    actuelles, franches ou fines selon l'univers. D'une identité à l'autre, boutons de teintes nettement différentes.
  - Le contrôle du Studio est calé sur ces exemples : les 49 palettes lisibles du document le passent (la n° 11, au
    texte illisible dans le document, est écartée).

Contrôle : Claude compare les trois identités axe par axe ; deux identités trop proches → la plus faible est refaite avant
d'être montrée.

Chaque identité contient : nom, slogan (6 mots au plus), promesse en une phrase, territoire émotionnel, palette de
5 couleurs au plus (ancrage sombre, couleur de marque, un accent, deux neutres) avec codes, deux polices (titres /
textes) disponibles sur Google Fonts, ton de voix (3 adjectifs + 3 interdits), et une phrase « pourquoi cette identité
convient à ce client ».

Vérification du nom : recherche web (domaine, réseaux, marque connue du même secteur). Le résultat est indicatif ; le
client vérifie lui-même à l'INPI. SYNA ne garantit jamais qu'un nom est libre.

### 2.2 Niveau visé : les exemples du propriétaire (6 novembre 2026)

Cinq planches de 50 logos (mode et beauté, maison, cuisine, services, tech et loisirs) fixent le niveau. Ce sont des
**références de niveau et de variété, jamais des modèles à recopier** (ni leurs noms, ni leurs dessins). Elles ne sont pas
versionnées (images du propriétaire).

Ce qu'elles montrent :
- **Une idée tirée du métier ou du nom**, simple et astucieuse : un éclair qui forme le V d'un électricien, une goutte
  qui contient une gourde, deux dés pour « Dé Deux », une spirale d'argile, une bobine de fil qui écrit le nom, un
  casque dont l'arceau forme une lettre.
- **Une grande variété de styles**, choisis selon l'univers du client : lettrage seul raffiné, symbole + nom,
  monogramme, emblème ou badge fermé, cachet ou tampon, mascotte illustrée sympathique, trait continu (line art),
  icône abstraite colorée, pixel, brutaliste à ombre décalée, isométrie 3D, tache d'aquarelle, art déco, pop art.
- **Une typographie forte et choisie pour l'émotion** : serif élégante pour le luxe, grasse et ronde pour l'enfance ou la
  gourmandise, condensée et penchée pour le sport, espacée et fine pour le bien-être.
- **Peu de couleurs** (1 à 3 le plus souvent, plus seulement quand le style l'exige : aquarelle, pop art), contrastées,
  accordées à l'univers.
- **Une exécution impeccable** : dessin vectoriel net, épaisseurs cohérentes, nom parfaitement lisible, composition
  équilibrée et centrée.

### 2.3 Trois logos, trois styles différents

Pour un même client, les 3 logos (un par identité) utilisent **trois styles différents** de la liste ci-dessus, choisis
parmi ceux qui conviennent à son métier et à chaque identité (ex. pour une boulangerie : badge rétro, lettrage serif
élégant, mascotte gourmande). Deux logos ne doivent jamais se ressembler (forme, style, couleurs, police).

### 2.4 Critères d'un logo 2026 (tous obligatoires)

1. Une seule idée forte, liée au métier, au produit ou au nom, compréhensible en une seconde.
2. Nom parfaitement lisible, orthographe exacte, aucun mot, lettre ou fausse lettre en trop.
3. Reconnaissable en petit (avatar, favicon 32 px : au moins le symbole ou l'initiale) et en très grand.
4. Exécution vectorielle nette : bords francs, épaisseurs régulières, espacement des lettres travaillé.
5. Le style choisi est assumé jusqu'au bout (une texture d'aquarelle ou une 3D isométrique est permise si c'est LE
   style du logo, propre et maîtrisée).
6. **Interdits** (finition « années 2000 » ou amateur) : effets « WordArt » (chrome, reflets brillants, biseaux, ombre
   portée floue), photo ou rendu réaliste dans le logo, clipart générique sans lien avec la marque (globe, poignée de
   main), plus de couleurs que le style n'en demande, police système banale (Arial, Comic Sans, Papyrus), texte
   illisible ou déformé, composition déséquilibrée.
7. Fond uni ou transparent, logo entier, centré, avec de l'air autour.
8. Cohérent avec la palette et les polices de son identité.
9. Ne ressemble pas à un logo de marque existante connue.

### 2.5 Image de marque complète (après validation du client)

- Le logo choisi est **vectorisé** (SVG) ; toutes les déclinaisons sont faites à partir de ce dessin, donc identiques :
  couleur, noir, blanc sur fond sombre, symbole seul, version horizontale, version empilée, favicon 32 et 512 px,
  avatar rond des réseaux.
- **Planche de marque** : logo et déclinaisons, palette avec codes, polices avec exemples, motif ou élément graphique
  propre à la marque, 2 ou 3 mises en situation (papeterie, emballage, publication), sans rien d'inventé.
- **Charte** (document PDF) : règles d'usage du logo (zone de protection, taille minimale, interdits), couleurs, polices,
  ton de voix, exemples de phrases justes et fausses.

---

## 3. Textes (copywriting émotionnel)

1. **Titre d'ouverture** : 2 à 8 mots, souvent en deux temps parallèles ou opposés, bénéfice émotionnel ou moment de vie,
   aucun jargon technique.
   Niveau visé : « Un petit monde. Un ciel immense. » · « Fermez l'ordi. Ouvrez le week-end. » · « Enfin chez vous. » ·
   « Le courant passe. La confiance aussi. »
2. **Titres de section** : 8 mots au plus, une idée par section, retours à la ligne choisis.
3. **Sous-titres** : une phrase concrète et sensorielle de 20 mots au plus.
4. **Boutons** : verbe d'action + objet, 2 à 4 mots (« Découvrir le casque », « Réserver mon rendez-vous ») ; jamais
   « Cliquez ici » ni « En savoir plus » seul.
5. **Vocabulaire de l'univers** repris jusque dans le panier vide et la page introuvable (« Cette page a perdu le
   signal. », « On a perdu le contact. »).
6. **Méthode** en 3 ou 4 étapes, un verbe par étape.
7. **Questions fréquentes** : 3 à 10 questions en langage client, réponses concrètes, limite légale rappelée quand le
   métier l'exige (santé, prix, diagnostics).
8. **Fiches produit** : bénéfice d'abord, puis détails vérifiables ; caractéristiques inconnues masquées ou « [À
   compléter] ».
9. **Pages légales** (CGV, mentions légales, confidentialité, livraison et retours, cookies) : structure complète,
   informations manquantes en « [À compléter : …] », jamais inventées.
10. **Interdits** : superlatifs vides (« le meilleur », « révolutionnaire »), promesses de résultat, urgence artificielle,
    tics d'écriture d'IA (« Ce n'est pas X, c'est Y », listes « pas de X, pas de Y, pas de Z »).

---

## 4. Référencement (SEO) — SYNA fait **mieux** que les références

Les thèmes de référence sont excellents sur les textes et la mise en page, mais incomplets sur le référencement technique
(analyse du 6 novembre). SYNA doit respecter **tous** ces points, sur chaque site :

1. **Titre unique par page** : « Accroche | Marque » à l'accueil, « Produit, attribut | Marque » sur une fiche,
   « Page | Marque, métier et ville » pour un service local. 60 caractères environ.
2. **Méta-description unique par page**, 120 à 160 caractères, avec bénéfice et appel à l'action.
3. **Un seul H1 par page**, ordinateur et téléphone (la variante téléphone n'est pas un titre) ; H2 pour les sections.
4. **Texte alternatif factuel sur chaque image de contenu** (objet, matière, couleur, lieu) ; vide seulement pour un
   ornement.
5. **Données structurées** (JSON-LD) : `Organization` ; `Product` (sans `offers` si pas de prix réel) et
   `BreadcrumbList` sur les fiches ; `FAQPage` quand les réponses sont réelles ; `LocalBusiness` (ou type précis :
   `Restaurant`, `HairSalon`, `Electrician`…) avec ville et zone pour les services ; `Article` pour le blog.
6. **Adresses lisibles** en français (et en anglais si bilingue) : `/products/sac-de-voyage`, `/pages/la-methode`.
7. **SEO local** pour les services : ville et zone d'intervention dans les titres, la page contact et les données
   structurées (si le client les a données).
8. **Performance** : image d'ouverture chargée en priorité, les autres en différé, formats WebP, tailles adaptées.
9. **Plan du site** et liens internes entre pages, produits et articles.

---

## 5. Images

1. **100 % de vraies images** ; aucun gabarit, aucun texte ni prix incrusté (sauf publications et publicités, voir 8).
2. **Produit entier** dans chaque vue principale ; une macro montre seulement une matière ou un détail.
3. **Fidèle au vrai produit** (forme, couleurs, logo, détails) sur toutes les images ; contrôle par comparaison à la
   photo d'origine.
4. **Une direction artistique par marque** : une lumière, un décor, 1 ou 2 familles de matières (ex. lumière chaude et
   douce, fond crème ; nuit et velours ; lumière dorée, pierre et lacs).
5. **Aucune image en double** sur le site ; aucune image du site reprise dans une publication.
6. **Aucune personne** générée (voir règle commune 5).
7. **Cadrage réglé séparément** pour ordinateur et téléphone.
8. Consignes d'image écrites selon `docs/guide-images-ia.md` (une photo décrite en phrases complètes, objets comptés,
   « Aucun texte… Aucun objet supplémentaire. »).
9. Chaque image est **vérifiée avant d'être montrée** : produit entier, fidélité, aucune lettre parasite, logo exact.

---

## 6. Mise en page des sites (maquettes et thèmes)

1. **Deux polices au plus** (+ une d'accent facultative) : un titre de caractère (serif fine contrastée, sans serif
   condensée très grasse, ou ronde épaisse) et un texte sobre de 15 à 17 px. Tailles fluides.
2. **Palette de 5 couleurs au plus**, une seule couleur d'action, contraste du texte ≥ 4,5:1.
3. **Rythme** : alternance bande pleine largeur / section aérée / bandeau ; grandes photos ; beaucoup d'air.
4. **Un motif graphique propre à la marque**, modifiable (SVG ou CSS) : vagues, nom géant en contour, topographie,
   circuits, filets.
5. **Accueil boutique** (8 à 11 sections) : ouverture (H1, photo, bouton) → produit ou offre → détails (3 ou 4 gros
   plans) → scènes d'usage → univers de marque → journal → FAQ → inscription → pied complet.
6. **Fiche produit riche** : galerie avec vignettes, prix et mention, quantité, gros plans légendés, usages, informations
   en accordéons, FAQ « Avant de choisir », produits complémentaires (sans le produit affiché), rappel d'achat final,
   barre d'achat qui suit sur téléphone sans rien cacher.
7. **Accueil services** : promesse + 2 boutons → besoins du client → prestations ou réalisations → méthode → FAQ → appel
   au contact ; bouton de contact ou de réservation dans l'en-tête.
8. **En-tête et pied de page dessinés pour la marque** ; le pied ne lie que des pages existantes ; aucune icône de
   réseau sans compte réel ; copyright à l'année en cours.
9. **Téléphone composé à part** (titres, coupes de lignes, cadrages) ; aucun débordement à 360, 390, 430, 768 et
   1440 px ; boutons d'au moins 44 px ; focus visible.
10. **Effets sobres** : survols d'environ 0,2 s, aucune animation obligatoire, réduction des animations respectée.
11. **Fonctionnement** : chaque lien et bouton mène à la bonne page ; formulaires avec erreurs près du champ, valeurs
    conservées, un seul envoi, statut honnête ; cookies « Tout accepter / Tout refuser / Personnaliser ».
12. **Modifiable partout** : chaque texte, image, lien et section modifiable dans le Studio, par SYNA et dans l'éditeur
    Shopify ; contrôle officiel de Shopify (Theme Check) sans erreur.

### Maquettes images (étape 6)

- 3 maquettes avec une **vraie différence de mise en page** (structure de l'accueil, grille, traitement des photos,
  typographie de titre), toutes fidèles à l'identité choisie (logo, slogan, couleurs, polices).
- Chaque maquette montre tout le site de façon **lisible** : **une ou plusieurs images** selon ce qui donne le meilleur
  résultat (décision du propriétaire du 6 novembre 2026), comme les planches de Thomas (ex. accueil ordinateur ;
  fiche produit ou prestation ; pages secondaires ; version téléphone). Toutes les images d'une même maquette gardent
  exactement le même style.
- Textes et images de la maquette parlent du **vrai produit ou service** du projet, avec des textes émotionnels.

---

## 7. Publications (réseaux sociaux)

1. 3 groupes **sans aucune ressemblance** : sujet, composition, cadrage, palette dominante, type de visuel.
2. Un même visuel décliné dans chaque format ; seul le cadrage change.
3. Chaque publication a : titre, texte, hashtags (5 à 15, pertinents, aucun générique vide), réseau indiqué.
4. Sujets variés : produit, conseil, coulisses, usage, erreurs à éviter, question à la communauté.
5. Texte dans l'image : court, exact, lisible sur téléphone ; logo réel du client.
6. Aucune image répétée hors déclinaisons de format ; aucune image reprise du site.

### Niveau visé (exemples fournis par le propriétaire le 6 novembre 2026)

Cinq planches d'exemples (mode et beauté, maison, cuisine, services, tech et loisirs ; 50 publications) montrent le
**niveau et le style** attendus. Ce sont des références, **jamais des modèles à recopier** : chaque client a ses propres
sujets, son identité, ses couleurs et ses photos. Elles ne sont pas versionnées (images du propriétaire).

Ce qui fait leur niveau, à reproduire avec l'identité de chaque client :
- **Un sujet utile par publication**, jamais une simple pub : « 5 erreurs à éviter », « comment choisir », « l'ordre
  d'application », « les coulisses », « checklist », « avant / après », « quiz », « comparer A ou B ».
- **Titre accrocheur en deux temps** : « Sujet : promesse » (« Bougie : 5 erreurs à éviter », « Électricien : quand
  appeler un pro ? »), très grand, avec un mot surligné ou sur un bandeau de couleur.
- **3 points au plus**, chacun avec une petite icône au trait (ou ✓ / ✗ / numéros), phrases courtes et concrètes.
- **Un appel à l'action en pastille** qui fait agir la communauté : « Enregistre ce mémo », « Essaie ce geste »,
  « Vote en commentaire », « Partage à un ami », « Fais défiler ».
- **Une vraie photo d'ambiance** du sujet (produit en situation, lieu, geste), lumière soignée, place laissée au texte.
- **Format natif de chaque réseau** : Story 9:16, carré 1:1, carrousel 4:5, portrait 3:4, Facebook et LinkedIn 1,91:1,
  Pinterest 2:3, TikTok 9:16, miniature YouTube 16:9 ; la composition est refaite pour chaque format, pas recadrée.
- **Variété dans un même lot** : sujets, mises en page, fonds et tons différents d'une publication à l'autre.
- Le texte de l'image est **exact et sans faute** ; les chiffres affichés sont vrais ou viennent du client
  (jamais inventés).

## 8. Publicités images

Mêmes règles que les publications, plus : une accroche par visuel (6 mots au plus), un bouton d'action, aucune promesse
interdite par les règles des régies (santé, avant/après trompeur, urgence artificielle).

---

## 9. Contrôle avant de montrer

| Livrable | Contrôle |
|---|---|
| Identités | différence sur ≥ 4 axes ; critères 2.1 |
| Logo | critères 2.4, vérifiés sur l'image en petit et en grand |
| Textes | critères 3 et règles communes |
| Images | critères 5, image par image |
| Site | captures à 5 largeurs, liens testés, images en double recherchées, Theme Check, SEO section 4 |
| Publications / publicités | critères 7 et 8, comparaison des groupes entre eux |

Seuil : un critère obligatoire manqué = refaire (une reprise au plus, annoncée et chiffrée) ; au-delà, le livrable est
montré comme raté avec la raison.
