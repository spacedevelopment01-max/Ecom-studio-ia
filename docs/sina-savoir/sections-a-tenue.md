# Écrire une section « à tenue » du thème sur mesure

Cahier des règles du 13 novembre 2026. Il sert à toute personne (ou tout agent) qui ajoute ou reprend une section de la
bibliothèque à tenue. Retour du propriétaire à l'origine de ce travail : « juste changer les images et les textes ferais
déjà des thèmes trop basique car les sections sur le studio sont loin d'être à la hauteur de celle que tu as vu sur
internet », et « les clients ne vont pas avoir tous les même menu les même bouton ».

## 1. L'idée

Une section à tenue n'a pas d'allure à elle. Elle prend celle de la marque :

- **la tenue** du site : couleurs et polices du projet, plus cinq réglages posés sur tout le thème (titres fins, gras ou
  en capitales ; boutons en pilule, droits, en étiquette cousue ou à ombre dure ; photos en niche, droites ou penchées ;
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

Les outils communs (`sec`, `ph`, `VOLET`, le type `TenueSection`) sont dans `tenue-base.ts`. Un module ne touche ni aux
fichiers d'un autre module, ni à `tenue.ts`, ni à `tenue.css`. Un script n'est permis que s'il est indispensable
(partie 6) : il va dans `public/sections/tenue-<module>.js`, chargé tout seul s'il existe.

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
   - `tn-cadre` : à ajouter à une photo encadrée ; elle prend la forme de la tenue (niche, droite, penchée).
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
6. **Textes d'exemple** : ceux d'une maison de thé, « Brindi » (le Studio pose le nom de la marque), tutoiement,
   phrases courtes, de l'émotion plutôt qu'une description. Pour un métier de services, l'exemple est celui du métier
   (électricien, coiffure, restaurant) et le dit. **Rien d'inventé** : un prix, un délai, une mesure, un pourcentage,
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

Les autres attributs (`data-tn-agenda`, `data-tn-planning`, `data-tn-equipe`, `data-tn-realisations`, `data-tn-vendus`,
`data-tn-chiffres`, `data-tn-presse`, `data-tn-dates`…) marquent des listes que le rédacteur écrit avec les faits du
client : le Studio n'a pas encore de source pour elles.

## 5. La feuille

1. **Tout sélecteur commence par `.ctw .tn-<nom>`** (ou `.ctw[data-tn-…] .tn-<nom>`). Aucun sélecteur général, aucun
   `!important`, aucune couleur écrite en dur.
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
   (`niche`, `droit`, `penche`), `data-tn-fond` (`toile` : la trame court sous toute la page, la section est
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

## 7. Les contrôles

```bash
# règles d'écriture (gratuit, sans navigateur)
npx vitest run tests/tenue-planches.test.ts
# planches en image : chaque section, chaque construction, trois tenues, téléphone et ordinateur
TENUE_OUT=/chemin/vers/un/dossier TENUE_ONLY=produit TENUE_BUREAU=1 npx vitest run tests/tenue-planches.test.ts
python3 scripts/tenue-planche.py /chemin/vers/un/dossier      # une planche par section dans …/planches/
```

`TENUE_ONLY` prend un module (`socle`, `produit`, `services`, `recit`) ou des identifiants séparés par des virgules.
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
  section y entre toute seule.

## 9. La démonstration

`DEMO_OUT=/chemin npx vitest run tests/sina-theme-demonstration.test.ts` monte deux sites complets (un électricien,
une boutique de yoga) avec les sections à tenue et les données d'un client d'essai, capture chaque page sur téléphone
et sur ordinateur, puis rend le thème Shopify dans l'aperçu Liquid du Studio. À relancer et à regarder après tout
changement d'une section ou du socle.
