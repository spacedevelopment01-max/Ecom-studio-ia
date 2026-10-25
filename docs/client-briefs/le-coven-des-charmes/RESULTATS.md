# Le Coven des Charmes — résultats (projet client dédié)

Consigne : `CONSIGNE_CLAUDE.md` (PR #189), six planches finales du 25 octobre 2026 (`maquettes/`). Site **propre au
projet du client**, hors catalogue : aucun ajout au thème de base du studio (`theme-base/`), aux directions, aux
démonstrations, aux recommandations ni à la bibliothèque de sections.

## Où est le site

| Élément | Emplacement |
|---|---|
| Sections du site (14, types `es-custom-coven-*`) | `clients/le-coven-des-charmes/theme/sections/` |
| Feuille et script (classes `cvn-…`, insérés dans l'en-tête et le pied) | `clients/le-coven-des-charmes/theme/assets/coven.css`, `coven.js` |
| Pages, menus, fiche du bracelet, textes des planches | `clients/le-coven-des-charmes/coven-pages.ts` |
| Pose dans le thème d'un projet (`applyCoven`), médias attendus | `clients/le-coven-des-charmes/coven-spec.ts` |
| Icônes redessinées d'après les planches | `clients/le-coven-des-charmes/icones-ajustees.ts` |
| Police des titres et textes : EB Garamond (licence OFL) | `clients/le-coven-des-charmes/theme/fonts/` |
| Aperçu de développement isolé | `clients/le-coven-des-charmes/scripts/apercu.ts` |
| Rattachement au vrai projet du client | `clients/le-coven-des-charmes/scripts/rattacher.ts` |
| Contrôle des interactions | `clients/le-coven-des-charmes/scripts/interactions.cjs` |
| Panneaux des planches et visuels de contrôle | `clients/le-coven-des-charmes/planches.json`, `scripts/visuels-maquette.py` |
| Tests | `tests/coven-client.test.ts` |

**Isolement.** Le site est posé dans le thème DU projet : sections du projet (`spec.customSections`), médias de la
bibliothèque du projet (`spec.files`), pages et menus du projet. Un autre projet compilé ne contient ni section, ni
média, ni texte du Coven (test). Aucun média du client n'est dans le dépôt (`.gitignore` : `clients/*/prive/`,
`clients/*/apercu/` et toute image sous `clients/`), ni sous `public/`.

**Projet du client.** Aucun projet « Coven » n'existe dans les données de ce studio (base vide dans cet
environnement) : aucun identifiant n'a été inventé. Étapes de rattachement, une fois le projet créé par le compte du
client :

1. dans le studio, créer le projet du client et composer une première boutique (n'importe quel thème) ;
2. `npx tsx clients/le-coven-des-charmes/scripts/rattacher.ts --projet <identifiant> --kit <…>/COVEN_CLIENT` :
   vérification seule (nom du projet, médias, version actuelle du thème) ;
3. relancer avec `--confirmer` : médias rangés dans la bibliothèque du projet, nouvelle version du thème enregistrée
   (l'ancienne reste restaurable). Aucun compte créé, aucun autre projet touché, rien de publié.

Ensuite tout se modifie dans le studio (réglages des sections : textes, photos, cadrages, zoom, luminosité, icônes,
liens, tailles du bracelet, prix confirmé ou non, informations légales, cookies) et chaque modification est une
version du thème du projet, conservée au rechargement et reprise par l'export ZIP.

## Concept respecté

- Le client commande **un bracelet** (taille et quantité) ; aucun choix de charms, aucun scoop vendu, aucun tirage
  numérique, aucune probabilité. Phrase centrale reprise : « Bracelet de charms surprise — les charms sont tirés au
  sort au scoop, puis assemblés sur le bracelet après la commande. »
- Les photos sont présentées comme des exemples (« Exemple de bracelet — les charms dépendent du tirage »).
- Confirmation : « Commande enregistrée » est la seule étape actuelle ; tirage, assemblage et expédition « à venir ».
- Prix : « — € Tarif à renseigner » partout ; tailles « À préciser » (liste à saisir dans le studio) ; matières,
  dimensions, entretien, délais, livraison, retours et mentions légales « À renseigner ». Sans tarif confirmé, la
  commande reste fermée sur la boutique ; l'aperçu reste une simulation marquée.

## Pages (ordinateur et téléphone)

| Planche | Page | Adresse |
|---|---|---|
| 01 / 04 | Accueil | `/` |
| 01 / 04 | Bracelet de charms surprise | `/products/bracelet-de-charms-surprise` |
| 02 / 05 | Le tirage au scoop | `/pages/le-tirage` |
| 02 / 05 | Le Coven | `/pages/le-coven` |
| 02 / 05 | Les créations (agrandissement au clic) | `/pages/creations` |
| 02 / 05 | Questions (rubriques, accordéons) | `/pages/faq` |
| 03 / 06 | Panier (plein, vide, erreurs) | `/cart` |
| 03 / 06 | Commande (simulation : erreurs, refus, chargement, pas de double envoi) | `/pages/commande` |
| 03 / 06 | Confirmation (quatre états distincts) | `/pages/confirmation` |
| 03 / 06 | Compte (connexion, inscription, mot de passe oublié, accès protégés) | `/pages/compte` |
| 03 / 06 | Contact (erreurs, accord, envoi simulé) | `/pages/contact` |
| 03 / 06 | Informations (onglets #mentions, #cgv, #confidentialite, #cookies, #livraison ; préférences de cookies) | `/pages/informations` |
| 03 | Page introuvable « Vous vous êtes égaré dans le Coven. » | toute adresse inconnue |

Pied de page : le même sur tout le site (ordinateur : colonnes autour du logo ; téléphone : logo entre deux lunes,
liens centrés). Une autre composition des planches peut être choisie page par page dans les réglages du pied.

En-tête : liens, logo original du client dans son médaillon, compte, panier, « Commander » ; version courte avec étoile
pour les pages des planches 02-03 ; téléphone : menu à gauche, logo au centre, panier à droite, menu plein écran
(Échap, focus gardé). Sur téléphone, le logo et la barre de la page d'accueil (78 px, barre de 52 px) valent pour
tout le site (réglables, et page par page si besoin). Pied : colonnes autour du logo (planches 01, 03), logo et liens en ligne (planche 02),
téléphone : colonnes (accueil, produit), logo entre deux lunes (planche 05), grande lune (planche 06).

## Vérifications

- Aperçu intégré dans un cadre isolé (stockage du navigateur interdit) : le panier, la commande simulée et les choix
  de cookies suivent la visite d'une page à l'autre (mémoire de l'onglet) ; chaque page s'ouvre en haut.
- Interactions (`interactions.cjs`, aperçu exporté) : **60/60** (cookies sans accord par défaut, menu, galerie,
  quantité plafonnée, panier, commande et refus simulés, confirmation, compte, contact, FAQ, informations, 404, aucun
  défilement horizontal à 360, 390, 430, 768, 1024 et 1440 px, aucune erreur JavaScript).
- Theme Check (outil officiel Shopify) sur le thème compilé du projet : **0 erreur** (remarques « ValidScopedCSSClass »
  attendues : la feuille du site est chargée par la section d'en-tête).
- `tests/coven-client.test.ts` : 9/9.
- `npx tsc --noEmit` : sans erreur. `npx vitest run` : voir la PR.

## Comparaisons

Méthode : chaque panneau des planches est découpé (`planches.json`), mis à 1440 px (ordinateur) ou 390 px
(téléphone) ; la page est capturée à la même largeur ; superposition à 50 %, image de différence et côte à côte, pour
les 13 pages ordinateur et les 12 pages téléphone. Deux aperçus :

- **contrôle** : décors découpés dans les planches (textes de la maquette effacés, cartes dessinées remplacées par un
  fond sombre) pour mesurer la composition au pixel ;
- **client** : photos et logo du client là où elles conviennent, visuels de maquette pour les scènes absentes.

Écart moyen par pixel (0-255, aperçu de contrôle) : de 23 (Le Coven, ordinateur) à 60 (Informations) ; les écarts
restants sont listés ci-dessous. Les images (qui contiennent les médias privés) sont livrées à part, hors dépôt.

## Écarts restants (connus)

1. **Images du site : les images HD du client** (5 archives « LE_COVEN_DES_CHARMES_IMAGES_0x_SUR_05 », 58 images et
   le logo, identique à l'original). Ce sont les scènes d'origine des planches : chaque emplacement reçoit la sienne
   (`CROP_HD` dans `coven-spec.ts`, association vérifiée à l'œil et par comparaison de points caractéristiques),
   converties en JPEG pour le web (2000 px au plus), sans retouche, rangées dans la bibliothèque du projet. Plus aucun
   visuel découpé dans les planches ni photo de téléphone dans l'aperçu client (test). Seul manque : la carte
   « Le Coven des Charmes » de l'étape 1 du tirage (page Le tirage), remplacée par la photo du bracelet.
   Dossier privé passé par `--images` à `apercu.ts` et `rattacher.ts`, jamais dans le dépôt. Sans ce dossier, le site
   retombe sur les quatre photos du client et des emplacements « Photo à fournir ».
2. **Police** : EB Garamond (libre) au lieu de la police des planches (non identifiée, plus étroite) ; les titres sont
   alignés en taille, les largeurs diffèrent de quelques pour cent.
3. **Échelles différentes entre planches** : chaque planche dessine les pages à une échelle propre (ex. téléphone :
   accueil à 0,78, tirage à 1,18, achat à 1,62 par rapport à 390 px). Les tailles sont réglées page par page (logo,
   titres, textes) ; certaines pages restent plus longues ou plus courtes que leur panneau (texte natif au lieu de
   texte dessiné, champs à taille réelle).
4. **Icônes** : les 48 icônes du kit sont utilisées ; neuf ont été redessinées d'après les planches (lune étoilée,
   chat, chapeau, botte, crâne, os, rameau, étoile à huit branches, colis). Les autres gardent le dessin du kit ;
   les symboles des tiroirs (page Le Coven) font partie de la photo.
5. **Logo** : fichier original du client, inchangé ; il est cadré dans un médaillon rond (zoom réglable 100-140 %),
   sans redessin ni changement de proportions.
6. **Textes des planches corrigés** (consigne : corriger les défauts typographiques sans changer le concept) :
   « choisis au hasard » devient « tirés au sort » (panier), « des accessoires » sous « Éléments de la nature » devient
   « des éléments de la nature », mot illisible « chumurm » devient « charm », « Personnaliser » enregistre les choix.
7. **Commande et compte** : simulation dans l'aperçu (bandeau, aucun paiement, aucun e-mail, aucune commande
   enregistrée) ; sur la boutique, le panier Shopify réel s'active par le réglage « Panier et commande », la commande
   passant par la page de paiement de Shopify, non testée ici (aucun paiement réel).
8. **Tablette (768 à 1023 px)** : composition téléphone ; de 1024 à 1439 px, la composition ordinateur est réduite à
   l'échelle (pas de planche pour ces largeurs).

Limites : aucun appel IA payant, aucun paiement ni envoi réel, aucune fusion, aucun déploiement.
