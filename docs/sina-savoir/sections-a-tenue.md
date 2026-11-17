# Écrire une section « à tenue » du thème sur mesure

Cahier des règles du 13 novembre 2026, mis à jour le 16 novembre 2026 (thème unique du lot 4 : cinq modules de plus, le
registre des façons, le contrat du panier, la coque propre à une page) et le 17 novembre 2026 (module « partitions » :
les pièces des moments du cahier « ordre et variété », la règle « jamais une pièce sans sa vraie donnée »). Il sert à toute personne (ou tout agent) qui ajoute ou reprend une section de la
bibliothèque à tenue. Retour du propriétaire à l'origine de ce travail : « juste changer les images et les textes ferais
déjà des thèmes trop basique car les sections sur le studio sont loin d'être à la hauteur de celle que tu as vu sur
internet », et « les clients ne vont pas avoir tous les même menu les même bouton ».

## 1. L'idée

Une section à tenue n'a pas d'allure à elle. Elle prend celle de la marque :

- **la tenue** du site : couleurs et polices du projet, plus cinq réglages posés sur tout le thème (titres fins, gras ou
  en capitales ; boutons en pilule, droits, en étiquette cousue ou à ombre dure ; photos droites ou penchées (**jamais dans une
  arche ni une demi-lune** : goût du propriétaire du 16 novembre 2026 ; l'ancien cadre « niche » devient droit, `sansArche`) ;
  fond uni ou en toile ; petits textes normaux ou à la machine) ;
- **sa construction** : la même section se bâtit de plusieurs façons (attribut `data-tn-c` sur sa racine). SINA choisit
  la section, sa construction et la tenue ; le Studio fabrique. SINA n'écrit jamais de code.

Deux marques qui prennent les mêmes sections n'ont donc pas le même site. La mesure de la réussite : la section tient
dans trois tenues très différentes (calme, brute, vive), sur téléphone et sur ordinateur, et **donne envie** dans les
trois.

## 2. Où cela s'écrit

| Module | Sections | Définitions | Feuille |
|---|---|---|---|
| Socle | en-tête, ouverture, bloc d'achat, pages simples, pied de page… | `src/lib/syna-agent/custom-theme/tenue.ts` | `public/sections/tenue.css` |
| Produit, achat, catalogue | fiche technique, dans le colis, catalogue… | `tenue-produit.ts` | `tenue-produit.css` |
| Métiers de services | prestations, tarifs, rendez-vous, réalisations… | `tenue-services.ts` | `tenue-services.css` |
| Récit, marque, navigation, fenêtres | texte et photo, journal, cookies, bandeau… | `tenue-recit.ts` | `tenue-recit.css` |
| Coque (lot 4) | les huit en-têtes (dans trois pièces : liens, annonce, services) et les pieds de page (lettre, services, réassurance) | `tenue-coque.ts` (`COQUE_SECTIONS`, `ENTETES`, `PIEDS`) | `tenue-coque.css`, `tenue-coque.js` |
| Achat (lot 4) | les façons du bloc d'achat, et les pièces qui se posent sous lui (tailles et couleurs, guide des tailles, offres par quantité, packs, dessous du bouton, offre du moment, fenêtre d'offre…) | `tenue-achat.ts` (`ACHAT_SECTIONS`) | `tenue-achat.css`, `tenue-achat.js` |
| Métiers (lot 4) | biens et fiche d'un bien, carte du restaurant et réservation de table, rendez-vous en trois temps, inscription | `tenue-metiers.ts` (`METIERS_SECTIONS`) | `tenue-metiers.css`, `tenue-metiers.js` |
| Pages (lot 4) | tiroir de panier, recherche, questions par rubriques, « bien reçu », boutique fermée | `tenue-pages.ts` (`PAGES_SECTIONS`) | `tenue-pages.css`, `tenue-pages.js` |
| Vente (lot 4) | le site de vente directe : bandeau à messages, ouverture au macaron, cartes de vente, « la différence », guide de choix, page d'arrivée de publicité (en-tête et pied minimaux, ouverture d'article, raisons, équation, témoignages, barre du produit), page des avis | `tenue-vente.ts` (`VENTE_SECTIONS`) | `tenue-vente.css`, `tenue-vente.js` |
| Partitions (17 novembre) | les pièces des moments du cahier « ordre et variété » qui n'en avaient pas : offre de première visite, délais, annulation et conditions, privatisation, réalisations filtrées par type, réseaux ; la page contact moment par moment (délai de réponse, horaires, adresse et carte, accès et stationnement) ; la fiche d'un bien moment par moment (description, surfaces, équipements, frais) ; la présentation d'une page ; l'ouverture d'un service en grande photo pleine | `tenue-partitions.ts` (`PARTITIONS_SECTIONS`, `PARTITIONS_FACONS`, `OUVERTURES_SERVICES`) | `tenue-partitions.css` (aucun script) |

Les outils communs (`sec`, `ph`, `VOLET`, le type `TenueSection`) sont dans `tenue-base.ts`. Un module ne touche ni aux
fichiers d'un autre module, ni à `tenue.ts`, ni à `tenue.css`. Un script n'est permis que s'il est indispensable
(partie 6) : il va dans `public/sections/tenue-<module>.js`, chargé tout seul s'il existe. L'ordre de chargement des
feuilles et des scripts est celui de `TENUE_FILES` (`tenue.ts`) : à force égale, la règle d'une feuille chargée plus
tard l'emporte.

### Le registre des façons (`*_FACONS`)

Un module du lot 4 peut ajouter des façons de bâtir à une pièce d'un AUTRE module, sans toucher à son fichier : il les
écrit dans son registre (`COQUE_FACONS`, `ACHAT_FACONS`, `METIERS_FACONS`, `PAGES_FACONS`, `VENTE_FACONS`, `PARTITIONS_FACONS` :
identifiant de la pièce → ses constructions) et les dessine dans SA feuille.

- Le registre **remplace** la liste `constructions` de la pièce : il faut donc y réécrire toutes ses façons, et **la
  première clé reste le rendu d'origine** (celui sans règle `data-tn-c` particulière).
- Plusieurs modules sur une même pièce **s'additionnent** (`mergeFacons` dans `tenue.ts`) : les listes se suivent dans
  l'ordre coque, achat, métiers, pages, vente, partitions, sans doublon de clé ; la liste du premier module qui parle de la pièce
  vient d'abord. Un module qui arrive après ne répète pas la façon d'origine : il ajoute les siennes.
- Une clé de pièce inconnue dans un registre arrête le Studio tout de suite (erreur d'écriture, dite à l'import).
- Une façon ajoutée ne redessine jamais une façon existante : aucune règle de la feuille du module ne cible une façon
  d'origine.

## 3. La définition d'une section

```ts
sec({
  id: "tn-colis",                         // « tn- » puis des minuscules et des tirets ; unique
  title: "Dans le colis",                 // unique, court, en français simple (le client peut le lire)
  kind: "Contenu · fiche produit",        // genre et place habituelle
  role: "produit",                        // voir la liste des rôles plus bas
  does: "Tout ce qui est livré, pièce par pièce, …",   // ce que fait la section, pour le concepteur : à quoi elle
                                          // répond, quand la prendre, quelles vraies données elle demande
  constructions: [                        // la première est celle par défaut ; label clair, 13 caractères au moins
    { key: "liste", label: "une liste illustrée, une ligne par pièce" },
    { key: "grille", label: "des vignettes en grille, le nom dessous" },
  ],
  trait: { fond: "clair", densite: "moyenne", photos: 3, hauteur: 420 },  // hauteur sur téléphone, en pixels
  html: `<section class="tn tn-colis">…</section>`,
  // facultatifs
  pour: "services",                       // seulement pour un site de services (ou "produits")
  only: "aliments pour animaux",          // réservée à un genre de produit ou à un métier
  authentic: "ton équipe",                // photos impossibles à inventer : jamais posée sans les vraies photos du client
  cards: true,                            // section de cartes de familles ou de collections (une seule par page)
  data: "les prestations de la rubrique Prestations et Rendez-vous",   // vraies données lues
  group: "metiers",                       // famille de la banque, si le rôle ne suffit pas
  anim: "Les volets s'ouvrent au toucher.",
})
```

**Rôles** (ils rangent la section dans la banque) : `en-tête`, `pied de page`, `recherche`, `ouverture`, `produits`,
`rayons`, `produit vedette`, `produit` (fiche produit), `mise en avant`, `marque`, `à propos`, `confiance`, `contenu`,
`conversion`, `comparatif`, `aide`, `inscription`, `panier`, `compte`, `contact`, `légal`, `404`, `journal`, `services`,
`restaurant`, `immobilier`, `beauté`, `bien-être`. Un bandeau, une fenêtre ou une section de catégorie donnent en plus
`group: "bandeau"`, `"partout"` ou `"categorie"`.

`trait.fond` : `clair`, `sombre`, `couleur` ou `photo`. `trait.densite` : `aérée`, `moyenne`, `dense`.

## 4. Le balisage

1. **Une seule racine** : `<section class="tn tn-<nom>">` (ou `<footer>`, `<aside>`), refermée. Une section sombre
   ajoute la classe `tn-sombre`.
2. **Classes en `tn-`.** Les pièces communes :
   - `tn-bt` : le bouton, qui prend la forme de la tenue. Un seul bouton plein par section ; un second choix est un
     lien souligné.
   - `tn-ph` : une photo en fond, `<div class="tn-ph" style="background-image:url(photos/fichier.jpg)"></div>`.
   - `tn-cadre` : à ajouter à une photo encadrée ; elle prend la forme de la tenue (droite ou penchée).
   - `<small>` : le petit texte de la tenue (italique des titres, ou machine).
   - `<h1>` : le grand titre d'une page (ouverture, page simple) ; `<h2>` : le titre d'une section ; jamais de `<h1>`
     dans une section qui se pose au milieu d'une page.
   - `<details><summary>` (ou `VOLET(question, réponse)`) : un volet qui s'ouvre, sans script.
3. **Aucun script, aucune adresse extérieure.** Seuls gestes en ligne permis : `onclick="return false"` sur un lien ou
   un bouton, `onsubmit="return false"` sur un formulaire. Seuls styles en ligne permis : une photo de fond, ou une
   variable (`style="--part:60%"`).
4. **Liens** : `<a href="#" onclick="return false" data-go="shop">`. Clés de page : `home`, `shop`, `product`, `cart`,
   `compte`, `about`, `contact`, `aide`, `legal`, `prestations`, `reservation`, `devis`, `journal`. Le bouton d'achat
   porte `data-pogo`.
5. **Photos** : seulement des fichiers de `public/sections/photos/` (maison de thé : `hero.jpg`, `sachet.jpg`,
   `seches.jpg`, `jasmin.jpg`, `infuseur.jpg`, `fenetre.jpg`, `bureau.jpg`, `bol.jpg`, `tasse.jpg`, `nl-tasse.jpg`,
   `trio-tasses.jpg`… ; services : `sv-*.jpg`, `be-*.jpg`, `rs-*.jpg`, `im-*.jpg`, `ap-*.jpg`, `carte-*.jpg`). Une
   photo de produit seul reste la vraie photo du produit (cartes, bloc d'achat, panier) ; une photo d'ambiance est une
   scène. Jamais deux fois la même photo dans une section. Aucune personne reconnaissable.
6. **Textes d'exemple** : « Brindi » pour le nom (le Studio pose celui de la marque), tutoiement, phrases courtes.
   **Les textes d'exemple d'une pièce nouvelle sont neutres, jamais tirés d'un projet** : aucun métier, aucun produit
   reconnaissable, aucun prénom, aucune date (« Nom du produit », « Une ligne qui donne envie de celui-ci. »). Les
   pièces d'avant le lot 4 portent encore ceux d'une maison de thé ou d'un métier (électricien, coiffure, restaurant) :
   ils sont remplacés au montage et restent à neutraliser, ils ne servent pas de modèle. **Rien d'inventé** : un prix, un délai, une mesure, un pourcentage,
   une note, un nombre d'avis, un label, une garantie s'écrivent `[À compléter : ce qui manque]`. Le Studio l'affiche
   en jaune. L'essai refuse un chiffre d'exemple.
7. **Vraies données.** Quand une section montre des données du client (catalogue, prestations, horaires, avis), elle
   garde des lignes d'exemple dans son HTML, porte un attribut `data-tn-<donnée>` sur la racine ou sur la liste, et dit
   dans `data` ce qu'elle lit. Le Studio remplace les lignes par les vraies données ; sans donnée, la ligne reste
   « [À compléter] ». Avis, photos de clients, équipe, biens : `authentic`, jamais inventés.
8. **Jamais une coordonnée d'exemple.** Un téléphone, une adresse, des horaires, une ville, même « pour voir » :
   « [À compléter : téléphone] ». Un faux numéro dans un exemple peut finir sur le site d'un client qui n'a pas donné
   le sien. L'essai `tests/sina-theme-donnees.test.ts` refuse un numéro, un code postal ou une heure dans un exemple.
   Pour juger une section avec de vraies valeurs, l'essai des planches remplit un profil de test : rien à écrire.
9. **Le plan d'une adresse n'est jamais une image** (un plan dessiné passerait pour la vraie carte) : une photo du
   lieu, et un bouton d'itinéraire (`data-tn-itineraire`) qui ouvre la vraie carte.

### Les données que le Studio pose (`custom-theme/tenue-data.ts`)

| Attribut | Ce que le Studio y met | Source |
|---|---|---|
| `data-tn-tel` (sur un lien) | le numéro, et l'appel d'un toucher | profil des services, sinon fiche de l'entreprise |
| `data-tn-adresse` | l'adresse en une ligne | idem |
| `data-tn-horaires="ligne"` / `"jours"` | les horaires sur une ligne, ou une ligne de tableau par période | profil des services |
| `data-tn-zone="ligne"` / `"villes"` | la zone en une ligne, ou une ville par ligne | profil des services |
| `data-tn-itineraire` (sur un lien) | l'itinéraire vers l'adresse | adresse |
| `data-tn-prestations` (liste `tn-liste-p`), `data-tn-prestations-choix` (`<select>`) | les prestations | profil des services |
| `data-tn-produits` (cartes `tn-carte-p`) | les produits, leur prix, « Épuisé » ; sur la page boutique, les familles en filtres | catalogue |
| `data-tn-rayons` | les familles (deux au moins), la photo d'un de leurs produits | catalogue |
| `data-tn-comparatif` | les noms et les prix des produits comparés | catalogue |
| `data-tn-garanties` (`data-tn-cle="livraison"`, `"retours"`) | la livraison et les retours | fiche de l'entreprise |
| `data-tn-avis` | rien : une ligne d'exemple est retirée, seul un vrai avis écrit reste | aucune source pour l'instant |
| `data-tn-articles`, `data-tn-article` | les articles prêts ou publiés | rubrique Articles |

Attributs ajoutés au lot 4 (les lignes d'exemple gardent exactement la forme écrite dans la pièce) :

| Attribut | Ce que le Studio y met | Source |
|---|---|---|
| `data-tn-biens` (valeur `filtres` : avec `data-tn-biens-types`, `data-tn-biens-villes`), `data-tn-bien="galerie\|caracteristiques\|energie\|quartier\|visite"`, `data-tn-biens-choix` | les biens visibles, la fiche du bien mis en avant, les biens que l'on peut visiter | rubrique Biens |
| `data-tn-carte` | les rubriques et les plats publiés | rubrique Carte |
| `data-tn-prestations-options`, `data-tn-equipe-options` | les choix du rendez-vous en trois temps | profil des services, équipe donnée par le client |
| `data-tn-panier` (page), `data-tn-panier-cote` (tiroir) : `data-tn-lignes`, `data-tn-seuil`, `data-tn-suggestions` | un panier d'essai fait des vrais produits, le seuil de livraison offerte, d'autres produits à ajouter | catalogue, fiche de l'entreprise |
| `data-tn-recherche`, `data-tn-mots` | les produits et les familles de la recherche | catalogue |
| `data-tn-versions`, `data-tn-guide-tailles`, `data-tn-lots`, `data-tn-looks`, `data-tn-coloris` | les options du produit, ses tailles, l'offre par quantité, d'autres produits, ses couleurs | catalogue, offres du client (`shop.offers`) |
| `data-tn-packs`, `data-tn-sous-bouton`, `data-tn-offre-moment`, `data-tn-fenetre-offre`, `data-tn-stock`, `data-tn-jauge` | les packs, le dessous du bouton, l'offre datée, la fenêtre d'offre, « plus que N », la jauge | offres du client, vrai stock suivi |
| `data-tn-messages`, `data-tn-macaron`, `data-tn-cartes-vente`, `data-tn-guide` | les messages du bandeau, le chiffre du macaron, les cartes de vente, le guide de choix | fiche de l'entreprise, catalogue (`tenueVitrine` : genre, prix de comparaison, « dès », nombre de versions) |
| `data-tn-arrivee`, `data-tn-barre-produit` (avec `data-tn-produit-nom`) | le nom, la photo et la fiche du premier produit en stock | catalogue |
| `data-tn-avis-pose`, `data-tn-temoignages`, `data-tn-avis-page` | seulement les avis d'une vraie source ; sans avis, rien n'est montré | aucune source d'avis dans le Studio pour l'instant |

### Jamais une pièce sans sa vraie donnée (module « partitions »)

Une pièce qui ne vaut que par un fait du client (une offre, des délais, des conditions, des horaires, une adresse, des
comptes sur les réseaux, les mesures d'un bien) ne se montre pas sans lui :

- dans son HTML, chaque élément qui porte un tel fait est marqué **`data-tn-fait`** et l'écrit « [À compléter : …] » ;
- au rendu (`withTenueFaits`, `tenue-data.ts`), un élément marqué encore à compléter est **retiré** ; quand il n'en reste
  aucun, **la pièce entière ne rend rien** (aperçu), et elle n'est pas envoyée en boutique (« section non envoyée ») ;
- à la conception, sa ligne de `tenue-ordre.ts` dit le fait qu'elle demande (`offre-visite`, `delais`, `annulation`,
  `privatisation`, `reseaux`, `horaires`, `adresse`, `acces`) : le contrôle de l'ordre la refuse quand le dossier ne
  l'a pas (`preuves.ts` : `FAITS`, lus dans les notes du client ; horaires, adresse et réseaux constatés dans le Studio).

| Attribut | Ce que le Studio y met | Source |
|---|---|---|
| `data-tn-fait` (sur une ligne, un titre, un bloc) | rien : la ligne s'en va tant que son fait manque | le rédacteur, avec les mots du client |
| `data-tn-reseaux` (liste `tn-pt-comptes`) | les vrais comptes, chacun avec son lien ; sans compte, la pièce ne rend rien | `tenueReseaux` : le site existant lu au départ, les notes du client (jamais une note sur un concurrent) |
| `data-tn-t` (sur un filtre et sur chaque réalisation de `tn-realisations-types`) | rien : un filtre sans nom ou sans réalisation est retiré ; moins de deux types, plus de filtres | le rédacteur |
| `data-tn-bien="description\|surfaces\|equipements\|frais"` | la fiche du bien mis en avant, partie par partie | rubrique Biens |

Les filtres des réalisations marchent **sans script** : des boutons radio d'un même groupe et une règle
`:has(input[value="a"]:checked) figure:not([data-tn-t="a"]){display:none}` (types `a` à `d`). Ils partent tels quels
en boutique. Une seule pièce de ce genre par page.

Deux pièces qui montrent la même chose ne se posent jamais sur une même page (`MEME_CONTENU`, `tenue-ordre.ts`) :
« Horaires et accès » avec les horaires, l'adresse ou l'accès seuls ; les deux listes de réalisations ; les
caractéristiques d'un bien avec sa description, ses surfaces, ses équipements ou ses frais.

L'ouverture d'un site de services est `tn-ouverture-metier` dans une de ses trois façons en grande photo pleine
(`OUVERTURES_SERVICES`, permises dans les six familles) : le Studio y pose le téléphone cliquable, la zone et les
horaires du profil, et retire le repère que le profil ne connaît pas (`withOuverturePleine`) : jamais un trou dans le
premier écran.

Les lectures de la base se font à un seul endroit par sujet : `tenueMetiers` (biens, carte) et `tenueVitrine`
(catalogue de vente) dans `tenue-data.ts`, posées dans les données du site par `tenueSite` (`render.ts`, aperçu) et par
`customThemeExport` (`install.ts`, mise en boutique). Tout le reste de `tenue-data.ts` est pur.

Les autres attributs (`data-tn-agenda`, `data-tn-planning`, `data-tn-equipe`, `data-tn-realisations`, `data-tn-vendus`,
`data-tn-chiffres`, `data-tn-presse`, `data-tn-dates`…) marquent des listes que le rédacteur écrit avec les faits du
client : le Studio n'a pas encore de source pour elles.

## 5. La feuille

1. **Tout sélecteur commence par `.ctw .tn-<nom>`** (ou `.ctw[data-tn-…] .tn-<nom>`). Aucun sélecteur général, aucun
   `!important`, aucune couleur écrite en dur. **Une règle ne nomme qu'une seule pièce** : la mise en boutique découpe
   la feuille par pièce (une règle qui nomme deux racines part avec le socle, dans tous les sites).
   **Avant de créer une classe, vérifier que son nom n'existe dans aucune autre feuille** (`grep -n "tn-monnom"
   public/sections/tenue*.css`) : toutes les feuilles sont chargées ensemble, et trois conflits de noms entre pièces
   ont déjà eu lieu au lot 4. Le plus sûr : un préfixe propre au module pour ses classes intérieures (le module vente
   écrit `tn-v-…`, la coque `tn-e-…` pour les en-têtes).
2. **Variables** : `--tn-fond` (fond de page), `--tn-encre` (texte et traits), `--tn-accent` (couleur de marque),
   `--tn-doux` (fond de carte), `--tn-texte` (texte courant), `--tn-sourd` (texte discret), `--tn-bouton`,
   `--tn-sur-bouton` (texte sur fond sombre), `--tn-arrondi` (arrondi des cadres droits), `--tn-k` (échelle des grands
   titres). Polices : `var(--f-title)`, `var(--f-ui)`. Mélanges : `color-mix(in srgb,var(--tn-encre) 22%,transparent)`.
3. **Titres** : toute taille de `h1` ou de `h2` s'écrit `font-size:calc(40px*var(--tn-k))`. Les capitales et les
   polices larges prennent plus de place : rien ne doit dépasser de l'écran.
4. **Constructions** : `.ctw .tn-<nom>[data-tn-c="clé"]`. La première construction est celle sans règle particulière.
   Deux constructions sont deux mises en page vraiment différentes (une liste et une grille, la photo à gauche et la
   photo pleine), jamais un simple changement de couleur.
5. **Tenue** : la section réagit aux attributs posés sur `.ctw` : `data-tn-titres`, `data-tn-bouton`, `data-tn-cadre`
   (`droit`, `penche` ; `niche` n'est plus jamais posé), `data-tn-fond` (`toile` : la trame court sous toute la page, la section est
   transparente ; une section qui a son propre fond écrit `background-color`), `data-tn-petits`. Le bouton et les
   cadres `tn-cadre` s'habillent tout seuls.
6. **Téléphone d'abord** (390 px), marges de 20 px, haut de section à 44 px ; la section suivante apporte son propre
   haut. Écran large dans `@media (min-width:760px)` : le texte se tient dans
   `padding-left:max(40px,calc(50% - 380px))` (et pareil à droite), une section large dans `calc(50% - 540px)`.
7. **Règles du propriétaire** : aucun vide (pas de colonne vide, une grille remplit sa largeur, un seul élément prend
   toute la place) ; le produit entier (un cadre de produit n'est jamais plus large que haut) ; le texte sur la partie
   calme d'une photo, jamais sur le sujet ; une photo en hauteur ne remplit jamais une bande large (deux colonnes sur
   grand écran) ; jamais de faux compte à rebours ni d'offre d'exemple ; une zone à toucher fait 44 px au moins.

## 6. Les scripts

À éviter : un volet est un `<details>`, des onglets sont des boutons radio cachés et leurs étiquettes. Quand un geste
ne peut pas s'en passer (un filtre, un minuteur), le script va dans `public/sections/tenue-<module>.js` : sans
dépendance, il n'agit que sur des éléments `tn-…`, il peut être chargé deux fois sans dommage, et la section reste
lisible sans lui.

### Le panier : le contrat `window.tnBoutique`

Les pièces d'achat (bloc d'achat, lots, packs, barre d'achat, offre datée, fenêtre d'offre) ont un seul script commun,
`public/sections/tenue-achat.js`. Il ne parle jamais à une plateforme : il lit le balisage (les attributs `data-tn-…`
décrits en tête du fichier, qui fait foi) et appelle le contrat, qui ne change plus :

- `tnBoutique.ajouter(lignes, options)` → le panier ; `lignes` : `[{ id (identifiant de VERSION de la plateforme),
  quantite, cadeau? }]` ; un refus (stock, version inconnue) est une erreur dont le message se montre au client ;
- `tnBoutique.panier()` → `{ nombre, total (centimes, remises de la plateforme comprises), lignes }` ;
- `tnBoutique.argent(centimes)` → le prix écrit dans la devise de la boutique ; `tnBoutique.allerAuPanier()`.

Un adaptateur par endroit, chargé avant le script commun : `boutique-apercu.js` (panier d'essai de l'aperçu, rien n'est
vendu), `boutique-shopify.js`, `boutique-woocommerce.js`, `boutique-prestashop.js`. Une pièce n'écrit jamais d'appel à
une plateforme : elle pose ses attributs, le script commun fait le reste. La table des versions du produit de la page
est un `<script type="application/json" data-tn-versions>`. Après un ajout, l'événement `tn:panier` part sur le
document (un panier de côté qui s'ouvre lui-même l'annule ; sinon le script mène au panier).

**Le thème ne calcule aucune remise.** Un prix de lot ou de pack affiché vient de l'offre du client ; le prix payé est
celui que la plateforme rend. Il ne s'affiche que si la boutique tient la remise : l'outil `shop.discounts_check`
interroge la boutique reliée et garde sa réponse ; à la mise en boutique, cette preuve l'emporte sur la déclaration du
client (`remises.ts` : `indicateurRemises`).

## 7. Les contrôles

```bash
# règles d'écriture (gratuit, sans navigateur)
npx vitest run tests/tenue-planches.test.ts
# planches en image : chaque section, chaque construction, trois tenues, téléphone et ordinateur
TENUE_OUT=/chemin/vers/un/dossier TENUE_ONLY=produit TENUE_BUREAU=1 npx vitest run tests/tenue-planches.test.ts
python3 scripts/tenue-planche.py /chemin/vers/un/dossier      # une planche par section dans …/planches/
```

`TENUE_ONLY` prend un module (`socle`, `produit`, `services`, `recit`) ou des identifiants séparés par des virgules.
Chaque module du lot 4 a son essai, `tests/theme-unique-<module>.test.ts` (coque, achat, metiers, pages, vente), et ses
planches à la demande : `COQUE_OUT`, `ACHAT_OUT`, `METIERS_OUT`, `PAGES_OUT`, `VENTE_OUT=<dossier>` (avec
`<MODULE>_ONLY` pour limiter aux pièces citées). Le module « partitions » (`tests/theme-unique-partitions.test.ts`,
`PARTITIONS_OUT=<dossier>`) rend chaque construction dans deux palettes (une calme, une difficile à la couleur de marque
jaune vif) et contrôle dans le navigateur qu'aucun texte n'a un contraste inférieur à 3 avec son fond, que rien ne
dépasse à 320 px et que les filtres des réalisations filtrent ; il assemble une planche par pièce et
« pieces-nouvelles.jpg ». Ce qui relie les modules est dans
`tests/theme-unique-integration.test.ts`.
Sur une machine partagée, un seul rendu à la fois (`flock <fichier> env … npx vitest run …`).
L'essai échoue si une page dépasse de l'écran en largeur. Chaque planche se **regarde** : la section est terminée
quand, dans les trois tenues, elle est lisible, équilibrée, sans vide ni débordement, et qu'elle donne envie.

## 8. La mise en boutique

Chaque section à tenue doit pouvoir partir dans Shopify (`custom-theme/to-shopify.ts`) : son HTML devient du Liquid,
ses données d'exemple deviennent de vraies fonctions de la boutique (produits, panier, filtres, formulaires), et aucun
script ne part. Conséquences pour qui écrit une section :

- un formulaire est un vrai `<form onsubmit="return false">` avec de vrais champs dans leur `<label>` : chaque champ
  part avec le texte de son étiquette pour nom ;
- ce qui demande un script dans l'aperçu (filtre immédiat, minuteur, nom géant ajusté) garde une forme lisible sans lui ;
- une règle sous condition s'écrit dans un `@media` ou un `@supports` simple (ils sont gardés) ;
- l'essai `tests/sina-theme-donnees.test.ts` convertit CHAQUE section et la passe au contrôle du Studio : une nouvelle
  section y entre toute seule ;
- exception à « aucun script » : les pièces d'achat partent avec le script commun et l'adaptateur de la plateforme
  (fichiers du thème), et la table des versions du produit ; rien d'autre ;
- la feuille du site part avec l'en-tête ; quand elle est trop longue pour une seule section (site complet), sa suite
  part dans des sections « Feuille du site » du groupe d'en-tête, dans le même ordre (`themeCssParts`). Une feuille
  de pièce courte reste la meilleure façon de ne pas y arriver.

### La coque propre à une page

Le site a un en-tête et un pied pour toutes ses pages. **Une page peut porter sa propre coque** : c'est le cas de la
page d'arrivée d'une publicité (clé `arrivee`, ou `arrivee-<nom>` s'il y en a plusieurs ; modèle Shopify
`page.arrivee…`), avec « tn-entete-arrivee » et « tn-pied-arrivee ».

- Elle se pose par l'opération de structure `{ op: "page_shell", page: "arrivee", slot: "header" | "footer", section,
  construction? }` (`section: null` la retire). Seule une pièce de rôle `en-tête` va dans `header`, de rôle
  `pied de page` dans `footer` ; le contrôle refuse toute autre pièce, et refuse toujours un en-tête ou un pied parmi
  les sections d'une page.
- Sur cette page, **rien du site ne se pose** : ni son en-tête, ni son pied, ni le bandeau, ni la recherche, ni le
  panier de côté, ni une fenêtre. Une pièce écrite pour une coque de page ne compte donc sur aucun d'eux (la barre du
  produit collée en bas est une section de la page, pas une fenêtre du site).
- Dans l'aperçu, la coque est rendue dans la page (`render.ts`). Dans Shopify (un seul groupe d'en-tête et un seul
  groupe de pied par thème), les sections des deux groupes ne rendent rien sur le modèle de cette page, et la coque
  de la page est la première et la dernière section du modèle (`to-shopify.ts`).
- Les pièces de la coque d'une page s'écrivent, se lisent et se retouchent comme les autres (place « coque de <clé> »).

## 9. La démonstration

`DEMO_OUT=/chemin npx vitest run tests/sina-theme-demonstration.test.ts` monte deux sites complets (un électricien,
une boutique de yoga) avec les sections à tenue et les données d'un client d'essai, capture chaque page sur téléphone
et sur ordinateur, puis rend le thème Shopify dans l'aperçu Liquid du Studio. À relancer et à regarder après tout
changement d'une section ou du socle.
