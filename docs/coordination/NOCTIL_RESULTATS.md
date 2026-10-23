# NOCTIL refait d'après les maquettes du 23 octobre : résultats à valider

Consigne : PR #167, commentaire 6363066224 (« mission NOCTIL autorisée par Thomas » ; copie :
`docs/design/noctil-reference-20261023/CONSIGNE_VALIDEE.md`).
Dossier : `docs/design/noctil-reference-20261023/` (branche `assets/noctil-reference-20261023`, commit `39508f4d`) —
7 planches, 26 médias ; empreintes du manifeste vérifiées (36 entrées, 0 erreur). Importé sans réinitialiser la branche.
Travail limité à NOCTIL. HEUREN, Atelier Rive, TRAVERSE, MUSEAU CLUB, les autres thèmes et l'accueil du studio sont
conservés (vérification pixel à pixel plus bas).

**Rien n'est marqué « validé » : la validation visuelle et commerciale revient à Thomas.**
Les tests automatiques prouvent que les choses marchent. Ils ne prouvent pas que le rendu est bon.

Preuves : [`docs/design/noctil-reference-20261023/resultats/`](../design/noctil-reference-20261023/resultats/).
Code vérifié et état de la CI : voir « État vérifié » en fin de rapport.

## En bref

- Famille **Produit spécifique / Boutique spécialisée**, profil « astral » réécrit : fonds crème, bandeaux et pied bleu
  nuit, boutons en pastille lavande au texte bleu nuit, étoiles dorées, titres **Nunito 800**, textes Nunito 400 (police
  libre, licence OFL livrée : `assets/fonts/licenses/Nunito-OFL.txt`).
- **Le projecteur détouré remonte sur le bas de la photo d'ouverture**, sur ordinateur et sur téléphone : nouvelle section
  « Produit en surplomb » (`cv-rise`). Le produit est devant la photo, socle entier, sans cadre opaque, rien de rogné.
  Mesures (haut visible du produit au-dessus du bas de la photo) : **63 px à 1440** (planche ≈ 60 px), **76 px à 390**,
  **70 px à 360**, **85 px à 430**. Bouton « Découvrir NOCTIL » cliquable à chaque largeur ; menu du téléphone au-dessus du
  produit ; aucun défilement horizontal. Gros plans : `resultats/jonction-*.jpg`, mesures : `resultats/jonction-mesures.json`.
- Le débordement **ne se produit que derrière une grande photo pleine largeur** (bannière « visuel en fond » ou grande
  ouverture). Déplacée ailleurs, la section reste dans sa bande (vérifié dans le studio). Taille du produit et hauteur du
  débordement se règlent séparément sur ordinateur et sur téléphone.
- **33 pages** dans la démonstration, toutes faites de sections modifiables (aucune page n'est une image de planche) :
  accueil, fiche, boutique, panier rempli et vide, exemple de commande et de confirmation, notre univers, journal
  (filtres et pages), 9 articles, bien démarrer, FAQ, contact, livraison et retours, 6 écrans de compte, 4 pages
  légales, page introuvable, préférences de cookies.
- **Prix de démonstration 69 €**, toujours annoncé comme tel ; **2 projecteurs = 138 € en sous-total**, livraison
  « Calculée à l'étape suivante », aucun libellé « Total ».
- **Aucun paiement, aucun envoi** : « Passer commande » mène (dans l'aperçu seulement) à un exemple de commande sans aucun
  champ de carte ; champs des écrans de compte et de commande désactivés ; facture jamais présentée comme réelle.
- **Rien d'inventé** : âge, alimentation, dimensions, bruit, garantie, délais, pays de livraison restent « À confirmer » ;
  aucun avis, aucune note, aucun bienfait sur le sommeil ; pages légales « à compléter » sans donnée de société.
- **Cookies** : catégories facultatives décochées par défaut, « Tout refuser » au même niveau que « Tout accepter »,
  « Gérer les cookies » dans le pied rouvre la fenêtre.

## Page par page : référence, conformité, écarts, corrections

Comparaisons à largeur identique (maquette à gauche, rendu à droite) : `resultats/comparaison-*.jpg`. Captures complètes
de chaque page à 1440 et 390 px : `resultats/captures/<page>.jpg`. Contrôles 360 et 430 px : parcours d'interactions
(aucun débordement, un seul H1 sur chaque page).

| Page | Conforme | Écarts restants | Corrections faites pendant la recette | Preuve |
|---|---|---|---|---|
| Accueil (ordinateur) | oui : ouverture de nuit, projecteur en surplomb avec 69 € et « Ajouter au panier », 3 cartes chambre / tipi / peluches, « Plus qu'un projecteur », 3 étapes, « Les grandes aventures », journal, FAQ et appel final, pied | pied bleu nuit en colonnes (la planche 01 a un pied clair) ; icônes de réseaux sociaux absentes (aucune adresse fournie) ; texte du bandeau « Plus qu'un projecteur » à gauche, photo avec le produit à droite | titre de l'ouverture sur deux lignes sans coupure ; flou de l'ouverture supprimé | `comparaison-01-accueil-ordinateur.jpg`, `jonction-1440.jpg` |
| Accueil (téléphone) | oui : même ordre, surplomb du projecteur avec bord arrondi crème, cartes et étapes en rangées compactes | titre « Vos questions, nos réponses » absent au-dessus de la FAQ | débordement porté à 38 % après les premiers gros plans ; étapes : petite photo à gauche (une règle plus tardive les remettait en grand) ; photos des cartes moins hautes | `comparaison-01-accueil-telephone.jpg`, `jonction-390.jpg`, `-360`, `-430` |
| Fiche produit (ordinateur, téléphone) | oui : vignettes à gauche, titre, accroche lavande, 69 € « Prix de démonstration », quantité, ajout, liens guide et livraison, bandeau chambre, 3 atouts, détails lentille / socle, 3 instants, chambres, « Avant de choisir » + « Vos questions », journal, barre d'achat | les deux cartes de détails restent présentes sur téléphone (la planche téléphone les raccourcit) ; « Avant de choisir » : réponses « À confirmer » | cartes de détails moins hautes sur téléphone ; zoom fermé par Échap | `comparaison-02-produit-*.jpg`, `interactions-captures.jpg` |
| Boutique | oui : « Invitez l'univers dans leur chambre », 69 €, ajout, photo du produit en chambre, 3 atouts | titre moins grand que sur la planche | — | `comparaison-03-boutique-ordinateur.jpg` |
| Panier rempli | oui : ligne produit, quantité, « Supprimer », sous-total 138 € pour 2, livraison calculée ensuite, « Passer commande », « Continuer mes achats », « Vous aimerez aussi » | code de réduction présent (fonction de la boutique) ; une seule suggestion (le journal) | carte « Vous aimerez aussi » limitée à 560 px | `comparaison-03-panier-plein-ordinateur.jpg`, `comparaison-03-panier-telephone.jpg` |
| Panier vide | oui : planète dessinée, « L'univers vous attend… », bouton, photo | — | — | `comparaison-03-panier-vide-ordinateur.jpg` |
| Exemple de commande | oui : contact, adresse, livraison « À calculer », paiement, récapitulatif | **aucun champ de carte** (consigne) ; bouton « Voir l'exemple de confirmation » au lieu de « Payer maintenant » ; champs désactivés | — | `comparaison-03-commande-*.jpg` |
| Exemple de confirmation | en partie : « Exemple de confirmation », « Merci pour votre commande ! », récapitulatif, photo | la planche a une ouverture sombre avec numéro de commande ; ici bloc clair + photo, sans numéro ni « enregistrée » (aucune commande n'est passée) | — | `comparaison-03-confirmation-exemple-ordinateur.jpg` |
| Notre univers | oui : ouverture avec le produit, « Un compagnon d'imagination », « Éveiller la curiosité », « Chaque chambre devient un univers », appel final avec le projecteur détouré | photos complémentaires (bibliothèque, planète, tipi) au lieu des scènes exactes de la planche | **appel final** : le projecteur prenait la grande colonne (890 px) au lieu de la petite ; corrigé dans la section (produit à droite) ; grand titre d'ouverture | `comparaison-04-univers-ordinateur.jpg` |
| Journal | oui : ouverture, pastilles Tous / La chambre / Inspiration / Histoires (filtrage réel), 6 articles par page, pages 1 et 2 | 9 articles (la planche suggère 5 pages) | deux colonnes et catégorie au-dessus du titre, comme la planche ; grand titre d'ouverture | `comparaison-04-journal-ordinateur.jpg` |
| Article (9) | oui : fil d'Ariane, grande photo, catégorie, titre, chapeau, intertitres, citation, photo, articles liés, appel final | encadré « Article de démonstration » ajouté | — | `comparaison-04-article-ordinateur.jpg` |
| Bien démarrer | oui : ouverture, « Votre aventure céleste commence ici », 3 étapes, « Une question ? » | **visuel boîte / notice absent** (non fourni) : pas de bouton « Consulter la notice », ni de notice inventée ; consignes détaillées « à confirmer par la marque » | — | `comparaison-05-guide-ordinateur.jpg` |
| FAQ (ordinateur, téléphone) | oui : recherche, 4 thèmes en intertitres, accordéons, « Vous ne trouvez pas la réponse ? » | réponses non vérifiables « À confirmer » | — | `comparaison-05-faq-*.jpg` |
| Contact | oui : ouverture, « Nous sommes là pour vous répondre », nom, e-mail, n° de commande facultatif, sujet, message, accord, « Besoin d'aide rapide ? » | envoi simulé dans l'aperçu (aucun message envoyé) | — | `comparaison-05-contact-ordinateur.jpg` |
| Livraison et retours | oui : ouverture, cartes Livraison / Suivi / Retours, valeurs « À confirmer », « Une question ? » | — | — | `comparaison-05-livraison-ordinateur.jpg` |
| Connexion, inscription, mot de passe | oui : écrans reliés, signalés comme exemples | champs désactivés | — | `comparaison-06-connexion-*`, `-inscription-`, `-mot-de-passe-` |
| Tableau de bord, commande, informations et adresses | oui : menu du compte, carte promo, commande d'exemple NOCTIL-0001, adresse « aucune adresse enregistrée » | « Bonjour ! » au lieu de « Bonjour Camille » (aucun prénom inventé) ; date de commande non reprise ; dernière commande et adresse l'une sous l'autre (côte à côte sur la planche) | carte promo en bleu nuit | `comparaison-06-*.jpg` |
| Mentions, CGV, confidentialité, cookies | oui : ouverture, menu des pages légales, « à compléter », aucune donnée de société | — | — | `comparaison-07-*.jpg` |
| Page introuvable | oui : étoile dessinée, « Cette étoile semble introuvable », retour à l'accueil, photo de chambre | décor (planètes, orbites) plus simple que la planche | voile éclairci pour voir la chambre ; texte blanc lisible | `comparaison-07-page-introuvable-ordinateur.jpg` |
| Préférences de cookies | oui : bandeau, « Personnaliser » (mesure d'audience, personnalisation, nécessaires toujours actifs), refuser / enregistrer / accepter | bandeau en bas de page plutôt que fenêtre centrée | **le texte s'écrasait en colonne étroite avec les 4 boutons** : boutons passés sous le texte | `comparaison-07-preferences-cookies-ordinateur.jpg` |

Toutes les pages : liens vérifiés (aucun lien « # » inerte ; chaque lien mène à une page existante de la démonstration).
Le logo fourni est sombre : sur l'ouverture de nuit, il est éclairci par le thème (réglage « logo clair sur fond sombre »).

## Matrice des médias (section → photo de la planche → fichier utilisé → écart)

Médias suivis dans le dépôt : `public/theme-assets/noctil/` (16 fichiers utilisés ; les 10 ambiances d'adulte du kit
historique sont exclues). Les 10 créations complémentaires du dossier sont des **créations dérivées des planches, pas des
extractions** : ni les objets ni les cadrages ne sont identiques au pixel.

| Section | Photo de la planche | Fichier utilisé | Fidélité / écart |
|---|---|---|---|
| Ouverture de l'accueil | chambre de nuit, galaxie au plafond | `hero-chambre.webp` | même univers ; objets non identiques |
| Produit en surplomb (accueil, appels finaux, compte) | projecteur détouré | `projecteur-detoure.png` (fond transparent vérifié) | fidèle (vue d'origine produit-01) |
| Cartes « chambre / histoires / moment » | chambre, tipi, peluches | `chambre-fusee.webp`, `tipi.webp`, `peluches.webp` | scènes dérivées |
| « Plus qu'un projecteur » | projecteur en chambre | `projecteur-chambre.webp` | orientation différente du produit, marquage du socle peu visible : jamais utilisé pour montrer un détail |
| 3 étapes | produit, socle, chambre | `produit-02.webp`, `produit-05.webp`, `chambre-rose.webp` | vues d'origine |
| « Les grandes aventures », univers | bibliothèque, fusée, astronaute | `bibliotheque.webp` | dérivée |
| Journal, articles | nature morte livres, chambres | `journal-livres.webp` + scènes ci-dessus | dérivées ; plusieurs articles partagent une photo |
| FAQ, livraison, univers « curiosité » | planète et étoiles | `aide-planete.webp` | dérivée |
| Fiche : galerie, détails, atouts | 5 vues produit | `produit-01` à `produit-05.webp` | vues d'origine |
| Panier, commande, confirmation, compte | vignette produit | `produit-01.webp` | vue d'origine |
| Panier vide (planète), page introuvable (étoile) | illustrations | dessins SVG du thème (`planet-illustration`, `star-illustration`) | dessinés, modifiables (autorisé par la consigne) |
| Guide « Une question ? » : boîte et notice | boîte NOCTIL et notice | **absent** : photo du produit à la place, aucun bouton « notice » | **manque signalé**, rien d'inventé |
| Logo | logo NOCTIL | `logo.webp` | fichier d'origine ; éclairci par le thème sur fond sombre |

Aucune planche entière n'est utilisée comme image de page. Aucune personne, aucune marque externe.

## Galerie, édition dans le studio, adaptation à un autre projet

Script : `scripts/noctil-studio-check.ts` (studio Next.js réel, base temporaire, aucune IA, aucun réseau). Résultat :
`resultats/studio.json` (21 étapes réussies), captures `resultats/studio-*.jpg`.

Dispositions NOCTIL dans la galerie « Boutique spécialisée » (une seule fois chacune, aperçu réel avec les photos du
projet) :

| Fonction de la galerie | Disposition |
|---|---|
| Présentation principale | Ouverture de nuit, texte clair ; Bandeau sombre, texte à droite |
| Achat et offres | Produit en surplomb, prix et panier ; Appel final avec le produit détouré |
| Bénéfices du produit | Rangée d'atouts à pictogramme |
| Détails du produit | Cartes, carrousel sur téléphone |
| Situations d'utilisation | Grille, carrousel sur téléphone |
| Histoire de la marque | Journal à filtres et pages ; Deux articles en cartes larges |
| Questions fréquentes | Deux FAQ côte à côte ; Recherche et thèmes en intertitres |
| Contact | Formulaire avec sujet et accord |

Parcours vérifié dans le studio :
1. l'aperçu du studio montre le projecteur qui déborde sur l'ouverture (ordinateur et téléphone) ;
2. galerie : les 12 dispositions, chacune avec son aperçu ;
3. ajout d'un « Produit en surplomb » en bas de page, après la FAQ : **aucun débordement** (il reste dans sa bande) ;
4. réglages du surplomb de l'accueil : débordement 20 → 30 %, taille 44 → 40 % ; l'aperçu suit ;
5. duplication, déplacement, rechargement complet : réglages, ajout, copie et ordre conservés ;
6. projet client (Céramor, théière Anse) habillé en NOCTIL : **son propre détourage** remonte sur **sa** photo d'ouverture
   (haut visible du produit **65 px** au-dessus du bas de la photo à 1440, **67 px** à 390), aucun texte, aucune photo,
   aucun prix de la démonstration.

Corrigé pendant la recette :
- un produit sans fond transparent (photo à fond plein) ne remonte jamais sur la photo du dessus chez un client ;
- le détourage d'essai du client a une grande marge transparente au-dessus du produit (24 % de sa hauteur, contre 8,85 %
  pour la démonstration) : le cadre remontait, mais le dessin restait sous la photo à 1440. La marge est maintenant
  mesurée à l'inventaire des photos du client et ajoutée à la remontée (ici 20 → 36 % sur ordinateur, 38 → 50 % sur
  téléphone, plafond du réglage) ; le contrôle mesure le haut **visible** du produit (test ajouté) ;
- chez un client, les bandeaux des pages répétaient tous le nom du produit et son résumé (y compris en ouverture des
  pages légales) : le premier bandeau d'une page porte maintenant **le titre de la page**, les suivants un argument
  différent du client, l'encart des pages d'aide « Une question ? » renvoie au contact ; faute d'argument, le bandeau reste
  masqué (test ajouté) ;
- l'aperçu de la galerie masque le bandeau de cookies de la boutique, qui cachait la section montrée (tous thèmes) ;
- les écrans d'exemple (commande, compte) et les pages propres à la démonstration (journal, articles) ne sont pas
  recopiés chez un client ; ils ne sont pas proposés dans la galerie (sur une vraie boutique, ce sont des pages de la
  plateforme).

Limite constatée (studio commun, non modifiée) : sur un curseur de réglage, **au clavier** (flèches), seul le premier cran
est enregistré quand on enchaîne les appuis ; à la souris, la valeur choisie est bien enregistrée. Le contrôle du studio
règle donc le curseur comme à la souris.

## Tests, build, types, Theme Check

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| `tests/noctil.test.ts` (nouveau, 24 tests) | réussi |
| `npx vitest run` complet | voir « État vérifié » |
| Theme Check NOCTIL (FR, EN, services FR) | 0 erreur, 4 avertissements connus (variables inutilisées des sections fs-*) |
| Parcours d'interactions de la démo exportée (`resultats/interactions.json`) | **207/207** |
| Contrôle studio (`scripts/noctil-studio-check.ts`) | réussi (21 étapes) |
| Exports WooCommerce et PrestaShop (`scripts/family-export-check.ts`) | profil « astral » appliqué, **projecteur en surplomb actif** dans les deux thèmes exportés, aucun débordement horizontal, aucune erreur |
| Non-régression des 10 autres thèmes (toutes leurs pages, 1440 et 390, avant NOCTIL `86187680` / maintenant) | identiques au pixel près, sauf des écarts d'anticrénelage invisibles ; trois pages ont d'abord montré un écart plus grand (photo pas encore chargée sur l'accueil d'Atelier Rive, ombre de bouton HEUREN, fiche « sangle » de SOUPLE) : refaites, Atelier Rive et HEUREN sont identiques, l'écart SOUPLE change d'une capture à l'autre (1 239 puis 5 031 px) et ne se voit pas à l'œil |

Parcours d'interactions (ordinateur 1440, téléphone 390, puis 360 et 430 sur les 33 pages) : menu et navigation, focus
clavier visible, mouvement réduit (aucun contenu laissé invisible), contrastes mesurés (bouton lavande 8,7:1, texte 16,5:1,
cartes, pied, FAQ sombre 15,4:1), retour en haut, vignettes, zoom fermé par Échap, barre d'achat du téléphone (projecteur, 69 € ;
masquée au pied de page), tiroir à 138 €, panier « + » 207 € « − » 138 €, « Supprimer » vers le panier vide
illustré, « Passer commande » vers l'exemple sans paiement, journal (6 articles par page, page 2, filtre « Histoires »),
FAQ (thèmes, recherche « livraison », recherche sans résultat annoncée, accordéons), contact (erreurs, e-mail incomplet,
succès et échec simulés), compte (connexion → aperçu → commande → informations → déconnexion), cookies (bandeau,
personnaliser, enregistrer, refuser, rouvrir), aucune erreur de script.

Tests modifiés hors NOCTIL, à signaler :
- `tests/mission160-editorial-delivery.test.ts` vérifiait la séquence de rangées alternées de l'ancienne page « Univers »
  de NOCTIL. La nouvelle page suit la planche 04 avec des bandeaux photo et texte ; le test les compte comme les rangées de
  la séquence. Essai avec SILLON : ses rangées répètent deux titres chez un client (6 titres, 4 différents) ; c'était déjà
  le cas avant NOCTIL (vérifié sur `86187680`). Non corrigé (hors mission), signalé ici.
- `tests/mission154-adaptation.test.ts` : réglages du débordement non comparés à la référence ; sans détourage, aucun
  débordement.

## Exports et limites selon la plateforme

- **Shopify** : thème, produit, médias (le détourage en PNG), sections, profil, polices désignées « nunito_n8 » et
  « nunito_n4 » (**disponibilité exacte dans la bibliothèque de polices Shopify non vérifiée** ; repli prévu sur une police
  sans empattement). Les écrans de compte du thème servent aux comptes clients classiques ; avec les nouveaux comptes
  clients de Shopify, connexion, compte et commandes sont des pages de Shopify. La commande et sa confirmation sont
  toujours celles de Shopify.
- **WooCommerce, PrestaShop** : médias, feuilles, classes du profil et produit en surplomb exportés (vérifiés) ; panier,
  commande et compte sont ceux de la plateforme ; le bandeau de cookies du thème ne remplace pas un module de
  consentement de la plateforme.
- **Aperçu statique** : panier pré-calculé ; formulaires simulés (aucun envoi).
- Non vérifié : installation réelle sur une boutique Shopify, WordPress ou PrestaShop ; envoi réel de formulaire ;
  paiement.

## Environnement

- **Développement local** (ce rapport) : tout ce qui est décrit ici a été vérifié dans ce conteneur, sur la branche
  `claude/themes-differenciation`.
- **Studio de Thomas** : **non déclaré à jour** (aucune preuve de la version servie).
- **Installation réelle dans un CMS** : non faite.
- Rien n'est fusionné ni déployé. Aucun appel IA, aucun paiement, aucun envoi.

## Preuves

Dossier : [`docs/design/noctil-reference-20261023/resultats/`](../design/noctil-reference-20261023/resultats/)

- Jonction ouverture / produit : `jonction-1440.jpg`, `jonction-390.jpg`, `jonction-360.jpg`, `jonction-430.jpg`,
  menu ouvert `jonction-menu-390.jpg` (et 360, 430), mesures `jonction-mesures.json`.
- Comparaisons maquette | rendu : `comparaison-01-…` à `comparaison-07-…` (31 fichiers).
- Captures complètes de chaque page, 1440 et 390 : `captures/` (33 fichiers).
- Interactions : `interactions.json`, `interactions-captures.jpg`.
- Studio : `studio.json`, `studio-01-studio.jpg`, `studio-02-galerie-*.jpg` (12), `studio-03-ajout-sans-debordement.jpg`,
  `studio-04-reglages-debordement.jpg`, `studio-05-apres-rechargement.jpg`, `studio-06-telephone.jpg`,
  `studio-07-client-jonction-1440.jpg`, `studio-07-client-jonction-390.jpg`.
- Vignettes de la galerie des thèmes : `public/theme-assets/noctil/apercu-theme.jpg`, `boutique-bureau.jpg`,
  `boutique-mobile.jpg`, `fiche-produit.jpg` (refaites sans le bandeau de cookies).

## État vérifié

- **Code vérifié : commit `f8b7025a`** (branche `claude/themes-differenciation`, PR #167). Le commit suivant ne change que ce
  rapport.
- En local sur ce commit : `npx tsc --noEmit` sans erreur ; `npx vitest run` **2 930 réussis, 2 ignorés, 0 échec** ;
  Theme Check rapide (5 thèmes FR, EN, multi, niche, services, ZIP) et NOCTIL (FR, EN, services) : 0 erreur ; contrôle du
  studio, parcours d'interactions et non-régression comme décrits plus haut.
- **CI GitHub sur `f8b7025a` : réussie** (exécution 39965915734, deuxième essai) : image Docker construite et démarrée ;
  types, tests, Theme Check des 30 thèmes et build de production réussis. Le premier essai avait été arrêté par la
  limite de 45 minutes : l'installation de ffmpeg sur la machine de GitHub avait pris 37 minutes, avant les tests (même
  cause probable pour les trois exécutions annulées plus tôt dans la journée sur cette branche).
- Démonstration exportée et captures faites sur ce code (aperçu statique local, hors studio de Thomas).
- Modèle utilisé pour cette mission : Opus, effort élevé.
