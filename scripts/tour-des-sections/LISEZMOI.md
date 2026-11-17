# Le tour des sections

Le banc qui ouvre **toutes** les pièces à tenue du thème du Studio, une par une, sur téléphone et sur ordinateur, et
mesure leurs défauts de rendu. Demande du propriétaire (17 novembre 2026) : « Je veux que tu ouvres toutes les sections
une par une, mobile et ordi, et tu corriges tous les défauts, j'en veux plus un seul. »

Gratuit : aucun appel à l'IA, aucun réseau, aucun Studio à lancer. La base d'essai est jetable et hors du dépôt.

## Ce que fait un tour

Pour chaque pièce (`TENUE_SECTIONS`) et chacune de ses constructions, la page est montée **avec les fonctions du
Studio** (même page, mêmes feuilles et scripts de `public/sections`, mêmes poses de vraies données) :

| Quoi | Valeurs |
|---|---|
| États de contenu | `exemple` (le HTML d'origine), `vrai` (un petit site réaliste : 3 produits dont un sans photo, 4 prestations avec prix, horaires, zone, téléphone, adresse, aucun avis), `difficile` (titres de 10 mots avec un mot de 24 lettres, bouton de 6 mots, prix « 12 450 € », 3 options, marques « À compléter » longues, listes à 7 éléments, une photo qui manque, le premier produit sans photo), `seul` (un seul élément dans chaque liste ; seulement pour les pièces qui ont une liste) |
| Tenues | `calme` (fond clair, titres fins, bouton pilule, cadre droit), `gras` et `capitales` (jaune vif #FFD23F, bleu nuit, bouton à ombre, cadre penché, Archivo Black ; `capitales` ajoute le fond en toile et les petits textes à la machine) |
| Largeurs | 320, 390 et 1280 px (768 à la demande : `--largeur 320,390,768,1280`) |
| En plus | ce qui est replié est ouvert et regardé une seconde fois (volets, tiroir de panier, recherche, fenêtre d'offre, menu du téléphone) : ligne « ouvert » |
| En situation | trois pages composées (accueil d'une boutique, fiche produit, accueil d'un métier de services) avec en-tête collant et pied : ce qui ne se voit qu'entre deux sections |

Les clients d'essai sont inventés pour le banc (`donnees.ts`) : ils ne viennent d'aucun projet d'essai et ne partent
vers aucune IA.

## Les commandes

```bash
# tout le tour (toutes les pièces, les pages en situation, les planches) : environ une heure
npx tsx scripts/tour-des-sections/tour.ts

# un module : socle, produit, services, recit, coque, achat, metiers, pages, vente, partitions, situation
npx tsx scripts/tour-des-sections/tour.ts --module achat

# une pièce (ou plusieurs, séparées par des virgules) ; une page en situation se nomme par sa clé
npx tsx scripts/tour-des-sections/tour.ts --piece tn-rdv
npx tsx scripts/tour-des-sections/tour.ts --piece boutique-accueil

# rejouer seulement les détecteurs (ni capture gardée, ni planche) : plus rapide
npx tsx scripts/tour-des-sections/tour.ts --module achat --sans-planches

# seulement les pages en situation ; ou tout sauf elles
npx tsx scripts/tour-des-sections/tour.ts --situations
npx tsx scripts/tour-des-sections/tour.ts --sans-situations

# restreindre : --etat exemple,vrai,difficile,seul   --tenue calme,gras,capitales   --largeur 320,390,1280
npx tsx scripts/tour-des-sections/tour.ts --piece tn-rdv --etat difficile --tenue gras --largeur 320

# le recensement seul (écrit recensement.json ici et dans le dossier de sortie)
npx tsx scripts/tour-des-sections/tour.ts --recensement

# mode « test » : sort en erreur s'il y a un défaut bloquant absent de connus.json
npx tsx scripts/tour-des-sections/tour.ts --module achat --sans-planches --test

# après avoir corrigé une pièce : retirer ses défauts de connus.json (tour complet de la pièce)
npx tsx scripts/tour-des-sections/tour.ts --piece tn-rdv --ecrire-connus
```

Autres réglages : `--sortie <dossier>` (ou `TOUR_SORTIE`), `--parallele 4` (onglets en même temps).
Sur une machine partagée, un seul tour à la fois.

L'essai de la suite : `CHROMIUM=/usr/bin/chromium npx vitest run tests/tour-des-sections.test.ts`
(sans `CHROMIUM` : seulement le recensement et le contenu d'essai). Il prouve chaque détecteur sur une page fabriquée
fautive et une page saine, puis fait le tour (détecteurs seuls) et échoue s'il reste un défaut bloquant hors de
`connus.json`. `TOUR_MODULE=achat` ou `TOUR_PIECE=tn-rdv` limitent ce tour ; `TOUR=non` le saute.

## Les sorties (hors du dépôt)

Dossier par défaut : `/tmp/claude-0/-home-user-Ecom-studio-ia/cdd8e871-2fa8-5553-9230-2342b2efce3a/scratchpad/tour/`
(sinon `tour-des-sections` dans le dossier temporaire de la machine).

- `planches/<module>/<pièce>--<état>--tel.jpg` et `--ordi.jpg` (puis `-2`, `-3` quand la planche est coupée) : une ligne
  par construction, une colonne par tenue et par largeur ; téléphone à taille réelle. Chaque défaut est encadré en
  rouge (pointillé orange : mineur) et numéroté ; la légende sous la ligne le redit en clair.
- `defauts.json` : un enregistrement par défaut mesuré (pièce, module, construction, état, tenue, largeur, variante
  « base » ou « ouvert », type, gravité, sélecteur, texte, détail, cadre en pixels, numéro sur la planche, capture).
- `resume.md` et `resume.json` : par module, par type, les dix pires pièces, les pièces que le Studio ne rend pas.
- `defauts/<pièce>.json` : la fiche de chaque pièce (un tour partiel ne réécrit que ses pièces ; l'ensemble est refait
  à chaque tour). `captures/` : les captures brutes. `recensement.json`.

## Les détecteurs

Dans `detecteurs-page.js` (exécuté dans la page ; les seuils sont en tête du fichier) et `banc.ts` (contraste).

| Type | Gravité | Ce qui est mesuré |
|---|---|---|
| `debordement-page`, `hors-ecran`, `plus-large-que-ecran` | bloquant | la page, un texte ou un élément dépasse de l'écran |
| `hors-section` | important | un texte sort de sa section en largeur |
| `texte-coupe` | important | texte rogné par son cadre, points de suspension, lignes limitées, choix d'une liste déroulante rogné |
| `texte-sort-de-sa-boite` | bloquant | le texte dépasse de son bouton, de sa pastille, de sa carte, de son étiquette |
| `pastille-deformee` | bloquant | une pastille ronde qui n'est plus ronde, ou plus haute que ses voisines |
| `bouton-trop-de-lignes` | important | un bouton sur plus de 2 lignes |
| `lettres-seules`, `mot-coupe` | important, mineur | un mot coupé au milieu sans trait d'union (un bout d'une ou deux lettres : important). Le trait d'union de la césure automatique est reconnu (la première lettre de la ligne suivante porte son cadre) ; une lettrine n'est pas un mot coupé |
| `colonne-etroite` | important | une colonne de moins de 40 px qui porte du texte |
| `chevauchement` | bloquant | deux textes, ou un bouton et un texte, l'un sur l'autre |
| `contraste`, `contraste-partiel` | bloquant sous 1,8, important sous 3, mineur par endroits | les pixels sous chaque ligne de texte sont lus sur une capture sans texte |
| `texte-petit` | mineur | texte de moins de 12 px |
| `titre-trop-long` | important | sur téléphone, un titre d'au moins 40 px sur plus de 5 lignes |
| `pave-gras` | bloquant au-delà de 5 lignes, sinon important | plus de 3 lignes en gras dans la police des titres, hors grand titre (un titre de carte : plus de 5). Jugé sur la police de chaque texte : une marque « À compléter » en texte courant ne compte pas |
| `ombre-coupee`, `bord-recouvert` | bloquant, important | l'ombre décalée ou le bord sort de la section (la suivante le recouvre), de l'écran, ou est rogné. Une section posée au-dessus de la page (un en-tête, rang positif) n'est pas recouverte : son menu déroulé ne compte pas |
| `zone-a-toucher`, `boutons-colles` | important, mineur | sur téléphone : moins de 40 px de haut ; deux boutons à moins de 8 px |
| `section-vide`, `section-nulle`, `trou`, `cadre-vide` | bloquant, important | section sans rien, de hauteur nulle, vide de plus de 120 px, cadre de photo vide |
| `crochets-bruts`, `photo-exemple`, `texte-exemple` | bloquant, important | dans un site monté : crochets « [À compléter » tels quels, photo ou nom d'exemple de la bibliothèque |
| `arche` | bloquant | une photo dans une arche ou une demi-lune |
| `sections-collees` | mineur | deux sections voisines de même fond, sans rien pour les séparer |
| `collant-sous-entete` | important | un élément collant qui passe sous l'en-tête collant |
| `rendu-impossible` | bloquant | le banc n'a pas pu charger la page |

Un détecteur nouveau ou modifié a son cas dans `tests/tour-des-sections.test.ts` (une page fautive, une page saine).

## Ce que le banc ne sait pas voir (à regarder sur les planches)

- si c'est **beau** et si ça donne envie : équilibre, rythme, hiérarchie, photo mal cadrée, sujet de la photo sous le texte ;
- le sens : une phrase d'exemple laissée dans un texte libre, un texte qui ne va pas avec la pièce ;
- les états que seul un geste montre, hors de ceux que le banc ouvre : survol, focus, erreur d'un formulaire, étape 2 et
  3 d'un parcours, onglet non choisi, menu déroulant du grand écran, compte à rebours fini, panier plein ou vide ;
- les animations (elles sont arrêtées) et ce qui dépend du défilement (un en-tête qui change en défilant) ;
- la tenue : les boutons « droit » et « étiquette » et les petits textes des autres réglages ne sont pas rendus
  (seulement pilule et ombre) ; les six familles et les styles de page non plus ;
- la mise en boutique (Shopify, WooCommerce, PrestaShop) : seul l'aperçu du Studio est rendu ;
- les navigateurs autres que Chromium (Safari sur iPhone surtout).

## Les fichiers

| Fichier | Rôle |
|---|---|
| `tour.ts` | la commande |
| `tour-lib.ts` | le tour : travaux, fiches, résumé, défauts connus |
| `recensement.ts` | toutes les pièces, leur module, leur feuille, leurs constructions |
| `donnees.ts` | les tenues, les clients d'essai inventés, le contenu difficile |
| `rendu.ts` | la page montée avec les fonctions du Studio ; `memeQueLeStudio` vérifie à chaque tour que le banc rend, au caractère près, ce que `renderCustomTheme` rend (si `render.ts` change, le tour s'arrête et le dit) |
| `banc.ts` | le navigateur, le contraste, la capture |
| `detecteurs-page.js` | les détecteurs et leurs seuils |
| `planches.ts` | les planches |
| `connus.json` | les défauts bloquants déjà mesurés : à vider pièce par pièce |
| `recensement.json` | le dernier recensement écrit |
