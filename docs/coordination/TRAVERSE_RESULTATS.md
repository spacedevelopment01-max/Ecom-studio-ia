# TRAVERSE refait d'après les maquettes du 23 octobre : résultats à valider

Consigne : PR #167, commentaire 6356942323 (copie : `docs/design/traverse-reference-20261023/CONSIGNE_VALIDEE.md`).
Photo réparée par Thomas : commit `3acabd53` (`detail-poche.webp`), lecture des 4 maquettes et 9 photos confirmée
(commentaire 6357222562).
Travail limité à TRAVERSE. HEUREN, Atelier Rive, les autres thèmes et l'accueil du studio sont conservés.

**Rien n'est marqué « validé » : la validation visuelle et commerciale revient à Thomas.**
Les tests automatiques prouvent que les choses marchent. Ils ne prouvent pas que le rendu est bon.

Code vérifié : commit `78cb8e20` (branche `claude/themes-differenciation`). Le rapport et les preuves sont dans le commit
suivant. Preuves : `docs/design/traverse-reference-20261023/resultats/`.

## Ce qui est fait

### Photos, police, couleurs
- **Les 9 photos séparées du dossier**, et elles seules, sont dans le dépôt (`public/theme-assets/traverse/`). Leur
  empreinte est vérifiée octet pour octet contre `manifest.json` par un test.
- **Un seul sac partout** : `produit-reference.webp` est la photo du produit (fiche, boutique, panier, carte d'achat).
  Les anciens sacs (`produit-0*`, `ambiance-*`) et l'ancien logo à montagne ne sont plus utilisés par le thème ; un test
  le vérifie sur l'accueil, la fiche, la boutique et le panier. Le logo est le mot « TRAVERSE » écrit avec la police.
- Titres en **Anton** (police libre, licence OFL livrée : `assets/fonts/licenses/Anton-OFL.txt`), textes en **Inter**.
- Couleurs : blanc, texte presque noir, boutons orange `#F2591A`, pied vert sapin, encadrés crème `#F9F4EC`.

### Pages, ordinateur et téléphone
Toutes sont faites de vraies sections du thème, réglables dans le studio. Aucune page n'est une image.

| Page | Contenu |
|---|---|
| Accueil | grande photo « FERMEZ L'ORDI. OUVREZ LE WEEK-END. » → 3 cartes sur photo (On ferme. / On file. / On respire.) → « Vos essentiels. À portée de départ. » (sac, 5 icônes, 3 gros plans) → bandeau « CHANGEZ DE DÉCOR. » bouton en contour → carte d'achat (129 €, prix de démonstration, liste cochée) → questions → bandeau « LA SUITE EST DEHORS. » → pied |
| Fiche produit | vignettes à gauche, « PRÊT POUR VENDREDI. », 129 € « Prix de démonstration », quantité, « Ajouter au panier », 3 gros plans légendés → bandeau « LES PROCHAINS DÉPARTS COMMENCENT ICI. » → mosaïque de 6 photos → questions |
| Boutique | bandeau « UN SAC. VOS PROCHAINS DÉPARTS. », « 1 produit », tri, carte avec « Voir le produit » |
| Panier rempli | bandeau « VOTRE PANIER. », tableau Produit / Quantité / Prix, − 2 +, 258 €, « Supprimer », sous-total, « Procéder au paiement », « Continuer vos achats », bandeau « MÊMES HORIZONS. AUTREMENT. » |
| Panier vide | bandeau « VOTRE PANIER EST VIDE. », icône sac, « Découvrir la boutique » ; le bandeau final est masqué |
| Carnet « En route » | bandeau, 3 cartes d'articles avec « Lire l'article » vers les étapes de l'article |
| Article « Deux jours. Un autre décor. » | bandeau « JOURNAL », introduction, 3 étapes numérotées (01, 02, 03) avec photo, bandeau « Envie de plus d'inspirations ? » |
| Notre approche | bandeau « NOTRE APPROCHE. », « Voyager autrement, tout simplement. » avec photo et bouton |
| FAQ | bandeau « Avant de partir. », 6 thèmes en accordéon, réponses « Informations à compléter » |
| Contact | bandeau « On prépare le départ ensemble. », formulaire nom / e-mail / message avec photo |
| Livraison et retours | bandeau, deux colonnes Livraison / Retours et échanges, encadrés « À compléter » |
| Mentions légales, Confidentialité, CGV | bandeau photo, une rubrique par titre de la maquette, encadré « À compléter · Informations à ajouter ici. » |

Un seul titre principal (H1) par page, vérifié sur les 13 pages.

### Réserves de la consigne, respectées
- Prix **129 €, annoncé « Prix de démonstration »** ; 2 sacs = **258 €** (vérifié dans le tiroir et sur la page panier).
- Rien de publié sur : livraison offerte, retours sous 30 jours, garantie 2 ans, cabine, ordinateur 15 pouces,
  déperlant, étanche, résistance, confort certifié. Un test cherche ces mots sur toutes les pages.
- Noms des détails neutres : « Poche frontale », « Boucles latérales », « Poignée ».
- Aucun avis, aucune note, aucune personne, aucune marque extérieure, aucun réseau social inventé.
- Pages légales et livraison laissées « À compléter ».

### Galerie « Boutique spécialisée » (studio réel, base temporaire)
Script : `scripts/traverse-studio-check.ts`. Preuves : `resultats/galerie-dispositions.jpg`, `resultats/studio-edition.jpg`,
`resultats/studio.json`, et la vidéo remise à part.

Les 7 compositions des maquettes sont dans « Ajouter une section », une seule fois chacune, avec un aperçu réel fait des
photos du projet :

| Fonction de la galerie | Disposition |
|---|---|
| Présentation principale | Grande photo, titre et bouton |
| Présentation principale | Bandeau photo et bouton en contour |
| Présentation principale | Carte produit, prix et liste cochée |
| Bénéfices du produit | Essentiels : produit, icônes et gros plans |
| Détails du produit | Cartes sur photo |
| Garanties et livraison | Notes à compléter |
| Contact | Formulaire et photo |

Parcours testé dans le studio, puis vérifié après rechargement complet :
1. ajout du bandeau photo depuis la galerie ;
2. dans « Réglages » : **titre**, **texte du bouton**, bouton en contour, **photo remplacée** par une autre image du
   projet (« Mes images »), couleurs ;
3. duplication, puis déplacement ;
4. rechargement : tout est conservé (titre, bouton, photo, couleurs, copie, ordre).

### Remplacement du produit et du logo (projet client)
Dans le même studio, un projet client fictif (marque « Céramor », produit « Théière Anse », son logo, ses photos, ses
textes) est habillé en TRAVERSE par l'adaptation du studio, sans IA :
- la composition est celle de TRAVERSE ; les couleurs et les polices restent celles **de sa marque** (règle de
  l'adaptation : on reprend la mise en page, pas l'identité) ;
- l'en-tête montre **son logo** ; l'accueil et la fiche montrent **son produit** et sa marque ;
- « Essentiels » : une icône par caractéristique confirmée du produit (Matière, Contenance…), ses propres gros plans ;
- pages légales : un encadré « Informations à fournir » tant que le client n'a rien donné, jamais les rubriques d'une
  autre page ;
- aucune photo ni aucun texte de la démonstration TRAVERSE ;
- le titre principal de chaque page intérieure est gardé.
Preuve : `resultats/adaptation-client.jpg`.

### Parcours de la démo exportée (navigateur réel)
Script de recette, 99 contrôles réussis sur 99, à 1440, 390, 360 et 430 px (`resultats/interactions.json`) :
- navigation de l'en-tête (Le sac / En route / Notre approche / Aide) et menu du téléphone (ouverture, fermeture par Échap) ;
- tous les liens de l'accueil mènent à une page existante ;
- fiche : vignettes, agrandissement de la photo (et fermeture), quantité 2, ajout au panier ;
- tiroir : 2 sacs, sous-total **258 €** ; page panier : **+** → 387 €, **−** → 258 €, **Supprimer** → panier vide ;
- questions : ouverture à l'accueil et sur la page FAQ ;
- cartes du carnet : chacune descend à la bonne étape de l'article ;
- contact : envoi vide (3 erreurs, retour au premier champ), e-mail incomplet signalé, « Envoi en cours… », succès
  seulement après la réponse avec la mention « Démonstration : aucun message n'est réellement envoyé », échec simulé
  (message d'alerte, formulaire conservé) ;
- 13 pages × 4 largeurs : aucun débordement horizontal, aucune image cassée, un seul H1, aucun bouton ni titre coupé ;
- aucune erreur de script.

### HEUREN et Atelier Rive conservés
Démos reconstruites et parcours rejoués : HEUREN 70/70, Atelier Rive 87/87.

## Comparaison maquette / rendu, page par page

Planches (maquette ordinateur | rendu 1440 | maquette téléphone | rendu 390) : `resultats/comparaison-*.jpg`.

| Page | Conforme | Écarts | Correction faite |
|---|---|---|---|
| Accueil | ordre des 7 blocs, titres, boutons orange, cartes sur photo, essentiels, carte d'achat, questions, pied vert | photo d'ouverture : le sac paraît plus grand ; cartes recadrées dans des photos où le sac est hors cadre (légèrement agrandies) ; « paysage » sert deux fois (cadrages différents) | photos agrandies autour d'un point choisi, gros plans sans légende coupée, flèche de l'inscription visible |
| Fiche produit | vignettes à gauche, titre, prix, quantité, bouton, 3 gros plans, bandeau, questions | 3 gros plans au lieu de 4 ; pas de vignette vidéo ; mosaïque de 6 photos au lieu de 4 + 3 ; questions neutres au lieu de cabine / avion | bouton en majuscules, gros plans légendés, prix « 129 € » |
| Boutique | bandeau, compte, tri, carte et bouton | tri « En vedette » au lieu de « Pertinence » | un seul H1, fiche-carte avec marque et bouton |
| Panier rempli | bandeau, tableau, quantités, 258 €, boutons, bandeau final | photo du train recadrée (agrandie) | 258 € au lieu de 258,00 € (page et tiroir), pastille vide masquée |
| Panier vide | bandeau, icône sac, phrase, bouton | photo de forêt de la maquette absente du dossier : paysage du lac à la place | bandeau final masqué quand le panier est vide |
| Carnet | bandeau, 3 cartes, « Lire l'article » | les photos des cartes montrent le sac (le dossier n'a qu'un paysage sans sac) ; titres reformulés d'après les étapes de l'article | liens vers les étapes de l'article |
| Article | bandeau « JOURNAL », introduction, 01/02/03, bandeau final, bouton | liens « Lire la suite » retirés (pas d'autres articles) ; photos avec le sac | bandeau final sur le paysage (plus de bout de sac coupé au bord) |
| Notre approche | bandeau, texte, photo, bouton | « Notre manifeste » remplacé par « Lire le carnet » (pas de page manifeste) | — |
| FAQ | bandeau, 6 thèmes en accordéon | — | — |
| Contact | bandeau, formulaire, photo | photo du train avec le sac au lieu du paysage ferroviaire | messages d'erreur, d'envoi, de succès et d'échec |
| Livraison et retours | bandeau, 2 colonnes, encadrés « À compléter » | — | titres, icônes et encadrés agrandis, séparation verticale |
| Mentions, Confidentialité, CGV | bandeau, rubriques de la maquette, encadrés | — | titres et encadrés agrandis |

Écarts communs à toutes les pages :
- **Proportions** : les maquettes « ordinateur » sont dessinées plus étroites qu'un écran de 1440 px ; à 1440 px, le
  texte paraît donc plus petit sur les planches. Les tailles réelles ont été réglées pour un écran de 1440 px.
- **En-tête et pied** : les maquettes « commerce » (fiche, boutique, panier) ont un autre menu (Boutique / Univers /
  Journal + recherche) et un autre pied. Un seul en-tête et un seul pied sont utilisés partout (ceux des autres
  maquettes), pour que le client n'ait qu'un menu à régler.
- **Réseaux sociaux** : icônes retirées (aucun compte réel donné).
- **Pied sur téléphone** : liens en ligne au lieu d'accordéons « + ».
- **Bandeau d'aperçu** « Aperçu de démonstration · paiement désactivé » en haut de chaque page de la démo exportée.

## Corrections faites pendant la recette
- Adaptation à un client : la page « En route » n'avait plus de titre principal (le bandeau perdait son H1). Le bandeau
  qui porte le titre garde maintenant son H1 quand le titre de page est éteint (`src/lib/theme/client-adaptation.ts`).
- Adaptation à un client : ses pages légales recevaient les rubriques « Livraison / Retours » et un titre hors sujet ;
  elles montrent maintenant son texte, ou « Informations à fournir ». La section « Essentiels » était masquée faute de
  photos de détail (les cartes de paysage les prenaient) : les cartes prennent des photos de situation, les gros plans
  gardent les photos de détail.
- Galerie : trois aperçus corrigés. « Essentiels » gardait deux pastilles orange au lieu des icônes et gros plans ;
  « Cartes sur photo » montrait des cartes noires sans photo ; « Notes à compléter » s'intitulait « Ce que … garantit »
  (une promesse) : titre neutre « Livraison et retours ».
- Contact : après un envoi réussi, le formulaire restait affiché sous le message de succès (le style écrasait
  l'attribut « masqué ») ; il disparaît maintenant.
- Tiroir du panier : « 258,00 € » → « 258 € », comme la page panier.
- Article : bandeau final recadré sur le paysage.
- Livraison et pages légales : rubriques agrandies.

## Tests de garde ajustés (à connaître)
- `tests/mission160-editorial-delivery.test.ts` vérifiait une suite de rangées alternées sur l'accueil de TRAVERSE ; la
  nouvelle maquette n'en a pas. Le test porte maintenant sur NOCTIL (page « Univers », 3 rangées).
- `tests/theme-thumbnails.test.ts` lit les textes de TRAVERSE dans son nouveau fichier de démonstration.
- `tests/noctil-traverse.test.ts` ne garde que NOCTIL ; TRAVERSE a son test : `tests/traverse.test.ts`.

## Points à décider par Thomas
- **Accueil du studio** : les captures TRAVERSE de la galerie (vignette, bureau, téléphone, fiche) sont refaites depuis la
  nouvelle démo. Les autres images TRAVERSE de l'accueil du studio (`public/demo/manifest.json` : ambiance-05/09/10,
  produit-01/03/05, logo) sont encore les anciennes ; elles sont gardées dans le dépôt pour ne pas casser l'accueil.
  Je les remplace par les nouvelles photos sur ton accord.
- **Police Anton** : présente dans le thème avec sa licence ; sa présence dans la bibliothèque de polices de Shopify
  n'est pas vérifiée (le thème exporté embarque le fichier).
- **Aperçu « Contact › Formulaire et photo » de la galerie** : il affiche les coordonnées d'exemple communes à tous les
  thèmes (adresse, horaires, « Réponse sous 24 h ouvrées »), chacune marquée « Exemple ». Elles ne sont pas sur la
  démo TRAVERSE. Je peux les retirer de cette disposition si tu préfères.
- **SILLON (constaté, non corrigé)** : adapté à un client qui n'a que 4 textes d'usage, la page « Usages » (6 rangées)
  répète des titres. Hors de cette mission.

## Non vérifié
- Rendu dans une vraie boutique Shopify (aucune mise en ligne).
- Envoi réel du formulaire, paiement réel (désactivés, comme demandé).
- Recette dans le studio de Thomas : les preuves viennent d'un studio de développement sur une base temporaire.

## Vérifications techniques
Sur le commit `78cb8e20` :

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| `npx vitest run` (suite complète) | 2918 réussis, 2 ignorés ; 2 tests ont dépassé leur délai pendant qu'un studio tournait en parallèle (`migration-v2`, `workflow-v2`), relancés seuls : 17/17 réussis |
| `tests/traverse.test.ts` | 16/16 |
| Adaptation client des 11 thèmes (`tests/mission154-adaptation.test.ts`) | 12/12 |
| Theme Check (TRAVERSE FR et EN, HEUREN, ALCÔVE, SOUPLE, ORBE, NOCTIL, Atelier Rive services) | 0 erreur, 4 avertissements connus |
| `npm run build` | réussi |
| Parcours de la démo exportée TRAVERSE (1440, 390, 360, 430 px) | 99/99 |
| Parcours HEUREN / Atelier Rive (conservés) | 70/70 et 87/87 |
| Studio réel, base temporaire (`scripts/traverse-studio-check.ts`) | réussi : 7 compositions, édition, photo remplacée, duplication, déplacement, rechargement, projet client |

Outils de recette (hors dépôt, dans la session) : parcours de la démo, captures, planches de comparaison.
