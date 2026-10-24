# ONDE — résultats de la refonte d'après les sept planches (PR #183)

Consigne : `docs/theme-briefs/onde/CONSIGNE_CLAUDE.md` (dossier récupéré tel quel du commit b156a132 de
`brief/onde-20261024`). Thème **mono-produit de la famille E-commerce** (casque ONDE, Graphite & lime).

**À valider par Thomas** : une CI verte et des écarts mesurés ne valent pas validation visuelle. Les comparaisons
(côte à côte, superposition à 50 %, image des différences) montrent les photos du kit privé : elles sont envoyées dans la
conversation, jamais publiées dans le dépôt (même règle que MAISON & HORIZON).

## Ce qui a été fait

- **Profil de conversion « onde »** : `theme-base/assets/onde.css` (toutes les règles préfixées
  `body[data-conversion="onde"]`, aucun texte dans la feuille) et `onde.js` (aucun texte : tout vient des réglages),
  chargés seulement avec ce profil. Titres Montserrat 700 serrés, textes Inter ; graphite `#0B0D0C`, gris clair
  `#F1F2F1`, blanc, lime `#C2F94A` (relevés sur les planches).
- **Treize sections dédiées, toutes modifiables dans le studio** :
  `on-header` (logo encadré, menu en pastille, panier lime et compteur, menu mobile plein écran),
  `on-banner` (ouverture, grand mot en contour et produit débordant, bande lime, cercles, bandeau d'appel avec ajout réel
  au panier), `on-cards` (gros plans légendés, grille, scènes, matières, vignettes, points numérotés, carrousel mobile),
  `on-journal` (rangée, page avec filtres et article principal), `on-article`, `on-faq` (bande, colonnes, page avec
  recherche + onglets + état sans résultat), `on-newsletter`, `on-product` (galerie et miniatures, agrandissement, carte
  d'achat graphite, quantité, onglets, barre d'achat), `on-cart` (rempli et vide), tiroir panier ONDE
  (`snippets/on-drawer.liquid`), `on-checkout` (Informations → Livraison → Paiement d'exemple, confirmation d'exemple),
  `on-help` (contact, livraison & retours, suivi), `on-footer` (graphite au grand logo, lime à deux colonnes, compact ;
  liste à chevrons sur téléphone).
- **Studio** : sections rangées dans la galerie E-commerce (fonctions « Présentation principale », « Produit à la une »,
  « Usages », « Journal », « FAQ », « Newsletter », « Contact »…), refusées aux autres thèmes (`section-fit`), fiches
  FR/EN dans la bibliothèque, tous les libellés de l'éditeur traduits (`schema.en.json`), inventaire régénéré.
- **Adaptation à un autre client** : la composition du catalogue (`reference-themes.ts`) utilise les mêmes sections
  (en-tête et pied ONDE, fiche `on-product` ; la section Produit commune reste présente pour les outils du studio,
  masquée). Les valeurs par défaut des sections ne contiennent ni « ONDE », ni « casque », ni « Graphite & lime », ni
  149 € (test). Vérifié : un client fictif garde son nom, son produit et ses photos.
- **Démonstration** (`tests/onde-fixtures.ts`) : douze pages, cinq articles complets (chacun son sujet et sa photo),
  panier rempli/vide, tiroir, commande en trois étapes, confirmation d'exemple, pages légales et cookies à compléter,
  404. Prix illustratif centralisé `ONDE_PRICE` = 149 € (1 casque = 149 €, 2 = 298 € de sous-total), annoncé comme
  illustratif ; livraison « calculée à l'étape suivante ».

## Honnêteté

- Connectivité, autonomie, réduction de bruit, poids, contenu de la boîte : « à confirmer » (FAQ, onglet Informations
  produit). Aucun avis, aucune promotion, aucune « livraison gratuite », aucun délai inventé.
- « Livraison rapide » (carte d'achat de la planche 01) est remplacé par « Livraison & retours » : la rapidité n'est pas
  établie. « Coussins en tissu haute densité » (planche 02) devient « Coussins en tissu noir et doux » (densité non
  renseignée). « Arceau confortable et bien équilibré » devient « Arceau rembourré et coulisseau lime » (ce que montre la
  photo).
- Paiement : la planche 06 montre des champs de carte ; ils sont remplacés par un encadré « Paiement d'exemple » (aucun
  champ de carte, aucune donnée bancaire, aucun débit). La confirmation s'annonce « Exemple de confirmation » : aucune
  commande enregistrée, aucun e-mail envoyé ; numéro « ONDE-EXEMPLE (fictive) ».
- Notice : non fournie → état « Notice à ajouter » dans la FAQ, aucun faux téléchargement.
- Suivi : « Exemple de résultat » sans aucun statut transporteur ; aucune donnée de commande consultée.
- Contact : case d'accord non cochée ; dans l'aperçu, aucun faux « message envoyé ».
- Réseaux sociaux du pied : icônes masquées tant que le projet n'a pas d'adresse réelle (la planche en montre trois).

## Médias

- Utilisés (kit privé `public/demo/onde/`, lus sur place) : les 20 compléments c01–c20 sauf c13, et deux originaux du kit
  (`04-detail-coussinet`, `05-detail-arceau`) pour les gros plans **sombres** que les planches montrent (« Au plus près
  du son », détails de l'accueil, « La bonne information », cercle matière) : aucun complément n'existe sur fond sombre.
- Non utilisés : c13 (scène sur marbre ; la planche « Sous tous les angles » montre des vues produit, rendues avec c03,
  c02 et c01) ; originaux 01, 02, 03, 06, 07, 08, 09 (réserve : ancienne direction).
- Logo : celui des planches = `logo-proposition.png` (O ouvert et éclair, « AUDIO » espacé), vectorisé en versions claire,
  foncée, « ONDE » seul (grand pied graphite) et en contour (grand mot de l'accueil et de la marque).

## Matrice planche → panneau → route → sections → preuves

| Planche | Panneau | Route de la démo | Sections | Actions vérifiées |
|---|---|---|---|---|
| 01 / 05 | Accueil | `/` | on-banner ×4, on-cards ×2, on-journal, on-faq, on-newsletter | menu, panier, carrousel mobile |
| 01 / 05 | Le casque | `/products/casque-onde` | on-product (+ Produit commun masqué), on-banner ×3, on-cards ×2, on-faq | miniatures, agrandissement, quantité, ajout, onglets, barre d'achat |
| 02 / 04 | La boutique | `/collections/all` | on-banner, on-cards ×3 | liens vers le casque |
| 02 / 04 | L'expérience | `/pages/l-experience` | on-banner ×3, on-cards ×2 | carrousel mobile |
| 02 / 04 | La marque | `/pages/la-marque` | on-banner ×3, on-cards | — |
| 02 / 04 | Journal (+ 5 articles) | `/pages/journal`, `/pages/<article>` | on-journal, on-newsletter ; on-article | filtres par thème, état vide |
| 03 / 06 | Panier rempli / vide, tiroir | `/cart`, tiroir | on-cart, on-drawer | −/+, suppression, sous-total, persistance |
| 03 / 06 | Commande, confirmation | `/pages/commande`, `/pages/confirmation` | on-checkout | étapes vérifiées, retour sans perte, accord requis |
| 03 / 07 | FAQ | `/pages/faq` | on-faq (page), on-newsletter (téléphone) | recherche + onglets combinés, sans résultat |
| 03 / 07 | Contact | `/pages/contact` | on-help (contact) | champs vérifiés, accord non coché |
| 03 / 07 | Livraison & retours | `/pages/livraison-retours` | on-help (info) | raccourcis vers les rubriques |
| 03 / 07 | Suivi | `/pages/suivi-de-commande` | on-help (suivi) | champs vérifiés, résultat d'exemple |
| 06 | Menu mobile | toutes | on-header | ouverture, fermeture (Échap), focus |

## Comparaisons

Mesure : capture de la démo statique, ramenée à la largeur du panneau, côte à côte + superposition 50 % + différences
(outil `overlay.py`). Largeurs : 1440 px (planches 01, 02), **913 px** pour les cellules « ordinateur » de la planche 03
(calées sur le logo de 194 px et le menu : ces cellules sont dessinées pour un écran plus étroit), 390 px (planches 04 à
07). Écart de hauteur et différence moyenne (0 = identique, 255 = opposé) : voir le tableau en fin de rapport.

## Écarts restants connus

- Grand mot « ONDE » : tracé du logo en contour (fidèle), mais les proportions du casque débordant ne peuvent être
  exactement celles de la planche : le complément c01 n'est pas la même prise de vue que l'image de la maquette.
- Planche 03 (cellules réduites) et planches mobiles : certaines tailles de texte restent légèrement différentes ; la
  FAQ filtre réellement par thème (la planche montre sous « Casque » des questions de commande).
- Planche 06 : le récapitulatif montre « Votre commande » et la mention de démonstration en plus ; le titre « Encore un
  instant. » tient sur une ligne au lieu de deux sur certains téléphones.
- Barre d'achat : visible quand la carte d'achat sort de l'écran (la planche la montre en bas de page).
- Paiement, confirmation, suivi, réseaux sociaux : écarts volontaires (honnêteté, ci-dessus).
