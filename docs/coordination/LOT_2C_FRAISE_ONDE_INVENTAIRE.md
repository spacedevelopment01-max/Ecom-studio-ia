# FRAISE GUMMIES et ONDE AUDIO — inventaire des références et correspondance (issue #137)

Inventaire relevé sur les captures officielles du kit (largeur native 365 px : des références **mobiles** ; les vues ordinateur et les interactions des démonstrations n'ont pas été observées) et sur les quatre captures de paniers fournies par Thomas. Chaque ligne indique la section du moteur qui la reproduit, et l'écart assumé quand il y en a un. Les textes, produits, photographies et marques des références ne sont jamais repris.

Légende : **=** composition reproduite ; **≈** reproduite avec un écart décrit ; **✗** volontairement non reproduite.

## Lumora → FRAISE GUMMIES (profil « pop » : fond crème, corail, boutons bordés noirs)

### Accueil

| # | Référence Lumora (mobile) | FRAISE | Section du moteur | Écart |
|---|---|---|---|---|
| 1 | Barre noire « SAVE UP TO 50 % OFF » | = bandeau noir | `announcement-bar` (scheme-2) | texte « exemple d'offre de démonstration » |
| 2 | Barre rouge « HOLIDAY SALE ENDS IN » + compte à rebours | ≈ bandeau corail statique | `announcement-bar` (scheme-3) | **pas de compte à rebours** dans l'en-tête (consigne : aucun faux compte à rebours) |
| 3 | En-tête : burger, logo centré, panier avec pastille | = | `header` layout `logo-center`, icônes, compteur synchronisé | — |
| 4 | Visuel produit, étoiles « Trusted by 13K+ », titre gras + accent manuscrit, 3 coches, grand bouton rouge bordé, garantie 30 jours | = | `cv-hero` | note « 4,8/5 · 6 avis de démonstration » **marquée fictive** ; garantie « exemple » ; accent en italique serif (pas de police manuscrite locale) |
| 5 | Bandeau défilant « Clinically proven » + fraise | ≈ bandeau défilant corail | `marquee` (scheme-3) | sans allégation ; détails visibles du produit |
| 6 | « THE TRANSFORMATION » + carrousel d'avis (étoiles, citation, portrait, « Verified customer ») | = | `cv-reviews` | initiales à la place des portraits ; **« Avis fictif » sur chaque carte**, aucun badge vérifié |
| 7 | « WHAT YOUR BODY'S BEEN CRAVING » image + grille 2×2 d'icônes | = | `cv-feature` (empilé) + `features-grid` (2 colonnes) | bénéfices = détails visibles (goût, texture, flacon, format) |
| 8 | Flacon versé + « THE TRUE CAUSE… » + 3 pastilles + bouton + garantie | = | `cv-feature` (visuel à gauche) | aucune cause ni promesse |
| 9 | « THE FORMULA MEN COUNT ON » 4 accordéons rouges bordés | = | `faq` style `cards` | « La recette en quatre questions », réponses de démonstration |
| 10 | « HOW BOOSTED OUTPERFORMS » tableau comparatif colonne rouge | ≈ | `comparison-table` | colonne « Autres » **vide, à compléter** : rien n'est affirmé sur d'autres marques |
| 11 | « THE PROOF IS IN THE NUMBERS » 2×2 pourcentages | ≈ | `stats` (grille) | chiffres de la démonstration elle-même (visuels, offres, avis fictifs), pas des résultats clients |
| 12 | Bouclier « TRY RISK-FREE FOR 30 DAYS » + bouton | = | `cv-guarantee` | « Exemple de politique — à remplacer » |
| 13 | FAQ 8 accordéons rouges | = | `faq` style `cards` | points à confirmer entre crochets |
| 14 | « Subscribe to our emails » | = | `newsletter` | mode démonstration indiqué dans l'aperçu |
| 15 | Bandeau défilant rouge « PREMIUM QUALITY · FAST SHIPPING… » | = | `marquee` (scheme-3) | — |
| 16 | Pied de page noir : logo, Products, Support, Explore, copyright, logos de paiement | ≈ | `footer` colonnes (scheme-2), logo SVG inverse | **aucun logo de paiement présumé** ; réseaux sociaux omis (aucun compte réel) |
| — | — | + stories en cartes (Lumora les place sur la fiche) | `cv-stories` | ajout demandé par Thomas |

### Fiche produit

| # | Référence Lumora (mobile) | FRAISE | Section / bloc | Écart |
|---|---|---|---|---|
| 1 | Galerie grande image + 4 vignettes | = | `main-product` galerie carrousel + vignettes + zoom | 9 images |
| 2 | Badge « #1 BESTSELLER OF 2025 », étoiles « Rated 4.8 · 360+ Reviews » | ≈ | bloc `eyebrow` | « Nouveauté de démonstration · 4,8/5 note fictive » |
| 3 | Titre, description, 4 pastilles rouges | = | `title`, `text`, bénéfices du bloc d'achat | détails visibles, aucune allégation |
| 4 | « 1. Choose Your Offer » : 3 cartes (image, BUY 1 / 2+1 / 3+2, prix, prix barré, badges) | = | offres `quantity_offer` avec visuel, prix de référence barré, badges | totaux fixes 24,90 / 49,80 / 74,70 € |
| 5 | « 2. Choose Your Plan » abonnement | ✗ | — | le moteur n'a pas d'abonnement : **aucune fausse option** |
| 6 | « Selling fast ! 44 people… » | ✗ | — | compteur inventé |
| 7 | « ADD TO CART – $12.50 ($22.50) » | = | bouton d'ajout, total serveur | — |
| 8 | Livraison / paiement + logos | ≈ | bloc `reassurance` | exemples identifiés, aucun logo présumé |
| 9 | Onglets Reviews / Comparison / Specifications | ≈ | `content-tabs` sous la fiche | onglets pleine largeur plutôt que dans la colonne |
| 10 | Accordéons Description / How to apply / Ingredients… | = | blocs `collapsible` | ingrédients « [À compléter] » |
| 11 | « Real Customer Success Stories » cartes vidéo portrait avec lecture | = | `cv-stories` | posters IA sans personne, **« Vidéo à venir »** sans faux bouton ; lecteur prouvé avec une mire de test |
| 12 | Image + icônes, avis, « true cause », chiffres | = | `cv-feature`, `features-grid`, `cv-reviews`, `stats` | idem accueil |
| 13 | « YOUR JOURNEY TO PEAK VITALITY » frise semaine 1/2/3 | ≈ | `timeline` « Comment ça se passe » | parcours de commande en exemple, pas de résultats |
| 14 | Image + GET STARTED, comparatif, garantie, FAQ, newsletter, bandeau, pied de page | = | sections correspondantes | — |
| — | Barre d'achat fixe (non visible sur la capture) | + | barre mobile du bloc d'achat | ajoute réellement la sélection |

### Panier (captures Thomas)

| État | Référence | FRAISE | Réglage |
|---|---|---|---|
| Vide | plein écran blanc cassé, croix, « Votre panier est vide », bouton rouge bordé | = | `cart_empty_title`, bouton `cart.continue` |
| Rempli | en-tête noir + quantité + croix ; ligne réservation ; bandeau corail livraison ; ligne produit (miniature, nom, prix barré / prix, économies, quantité − n +, suppression) ; protection des expéditions avec interrupteur ; Économies ; Total : 2 articles ; « Paiement sécurisé » avec cadenas ; garantie ; logos de paiement | ≈ | `cart_show_count`, `cart_promo_text`, `cart_show_savings`, `cart_total_count`, `cart_checkout_label` + `cart_checkout_lock`, `cart_protection` (**jamais précochée, aucun montant**), `cart_reassurance` (exemple) ; **réservation désactivée** (le studio ne réserve pas) ; **aucun logo de paiement** ; « Gummies à la fraise », jamais « phosphorescents » |

## Pawish → ONDE AUDIO (profil « contrast » : ouverture anthracite, vert, boutons arrondis)

### Accueil

| # | Référence Pawish (mobile) | ONDE | Section du moteur | Écart |
|---|---|---|---|---|
| 1 | Barre verte compte à rebours | ≈ bandeau vert statique | `announcement-bar` (scheme-3) | pas de compte à rebours |
| 2 | En-tête anthracite, logo centré, panier | = | `header` (scheme-2) | — |
| 3 | Visuel détouré sur anthracite, étoiles « 4.9/5 · 1,422+ reviews », titre blanc + accent vert manuscrit, 3 coches, bouton vert dégradé, garantie | = | `cv-hero` (scheme-2) | note fictive ; garantie exemple ; aucun « ANC » ni autonomie |
| 4 | Bandeau vert « PREMIUM QUALITY · FAST SHIPPING » | = | `marquee` (scheme-3) | — |
| 5 | « Grooming made easy » + 3 cartes (image à gauche, titre, texte) | = | `cv-cards` | détails visibles du casque |
| 6 | « 'Best I ever had' » + étoiles vertes + carrousel d'avis | = | `cv-reviews` | « Avis fictif » sur chaque carte |
| 7 | « Power of grooming » 3 pourcentages + encadré sombre « internal studies » | ≈ | `stats` (lignes) + encadré source | chiffres de la démonstration, encadré « aucune étude » |
| 8 | « Why choose our Pet Groomer » image + carte de 4 points iconés | = | `cv-feature` (empilé, points) | — |
| 9 | « Cheap vs. Premium » tableau colonne sombre | ≈ | `comparison-table` | colonne « Autres » à compléter |
| 10 | Bouclier vert « 30 day-return Guaranteed » + bouton + 3 coches | = | `cv-guarantee` | exemple de politique |
| 11 | Bandeau vert, pied de page anthracite (bloc marque, Products, Company, Support, Follow us, paiement) | ≈ | `marquee`, `footer` colonnes (scheme-2) | pas de réseaux ni de logos de paiement présumés |
| — | — | + stories en cartes | `cv-stories` | ajout demandé |

### Fiche produit

| # | Référence Pawish | ONDE | Section / bloc | Écart |
|---|---|---|---|---|
| 1 | Galerie + points | = | `main-product` carrousel + vignettes | — |
| 2 | Étoiles « Excellent 4.7 sur 5 », titre, sous-titre, prix barré + « SAVE 44 % », 4 pastilles sombres | = | `eyebrow` (note fictive), `title`, `text`, `price` (badge −21 %), `highlights` | — |
| 3 | Bouton vert « ADD TO CART », « Ships by tomorrow », logos | ≈ | achat simple avec quantité, `reassurance` | exemples identifiés, aucun délai ni logo présumé |
| 4 | Accordéons Description / How to use / Shipping | = | `collapsible` | — |
| 5 | Encadré vert garantie 30 jours | = | `callout` | exemple |
| 6 | Bandeau, cartes, bouton SHOP NOW + image + carte de points, comparatif, chiffres, avis, FAQ bordée, pied de page | = | sections correspondantes ; FAQ style `lines` | — |
| 7 | Bouton fixe « SHOP NOW » en bas | = | barre d'achat fixe du moteur | — |

### Panier (captures Thomas)

| État | Référence | ONDE | Réglage |
|---|---|---|---|
| Vide | anthracite, croix blanche, titre blanc, bouton vert, « Have an account? Log in to check out faster » | ≈ | `cart_show_login` activé mais affiché seulement si les comptes clients existent (jamais dans l'aperçu) |
| Rempli | en-tête + pastille quantité ; bandeau vert « réservé 9:53 » ; ligne produit ; champ code de réduction + Appliquer ; Économies ; Total : 1 article ; « Paiement sécurisé » ; garantie ; logos | ≈ | `cart_reservation` **marquée « Démonstration fictive »** ; `cart_discount_code` (code appliqué au paiement par la plateforme, note explicite dans l'aperçu) ; aucun logo présumé ; « Casque ONDE Audio » |

## Pages hors références

Listicle et advertorial Lumora : **reproduits pour FRAISE** avec la section `cv-article` (blocs réordonnables), contenu français original, mises en scène produit sans personne à la place des portraits de la référence.

| Référence Lumora | Section / page FRAISE | Correspondance |
|---|---|---|
| Listicle : bandeaux, en-tête, titre « 4 Reasons… », auteur avec portrait et date, 4 points numérotés illustrés, encadré bonus, bandeau risque de rupture, bouton noir, newsletter, bandeau défilant, pied de page | `/pages/listicle` : `cv-article` (style « liste de raisons », signature en initiales sans portrait, date, mention de démonstration, 4 points numérotés avec visuels 03/08/07/09, encadré « Bonus » accentué, encadré livraison/retour en exemple, bouton noir vers la fiche, lien vers le témoignage) → avis fictifs → newsletter (mode démonstration) → bandeau défilant → pied de page | « Sell-out risk : very high » remplacé par un encadré d'exemple ; portraits remplacés par le produit en situation ; emoji du titre retiré |
| Advertorial : bandeau « ADVERTORIAL », fil d'Ariane, titre en deux couleurs, chapeau, visuel, auteur avec badge vérifié, note et nombre d'avis, récit en intertitres, listes cochées, avis clients, bouton noir, répartition des notes, notes par critère | `/pages/advertorial` : `cv-article` (style « récit », bandeau « Publi-rédactionnel de démonstration », fil d'Ariane Accueil › Gummies à la fraise › Témoignage, titre avec fin en accent, chapeau, signature « Claire D. » en initiales, ligne de note marquée fictive, mention de démonstration, 5 intertitres, 3 visuels, 2 listes cochées, citation, bouton noir, bloc « notes fictives » avec barres et critères) → avis fictifs → garantie (exemple) → newsletter | Badge « vérifié » et « 12 000+ avis » remplacés par la mention fictive ; promesses santé de la référence non reprises ; récit original sur le flacon refermable |

Autres pages construites pour chaque thème : boutique (collection), à propos, contact, FAQ, livraison et retours, mentions légales, confidentialité, conditions générales, 404, recherche, panier page et tiroir.

## Non observé

Vues ordinateur des références, menus ouverts, pages secondaires et interactions en direct : non disponibles dans le kit (accès de démonstration non fournis dans cette session). Les compositions ordinateur de FRAISE et ONDE sont donc des propositions cohérentes avec le mobile, pas des reproductions vérifiées.
