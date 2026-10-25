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
- Accueil : la planche 01 montre « 01 / Écouter autrement » sous l'ouverture ; il n'y a ni 02 ni 03, le numéro est
  retiré à la demande de Thomas (25 octobre) : « Écouter autrement ».
- Paiement : la planche 06 montre des champs de carte ; ils sont remplacés par un encadré « Paiement d'exemple » (aucun
  champ de carte, aucune donnée bancaire, aucun débit). La confirmation s'annonce « Exemple de confirmation » : aucune
  commande enregistrée, aucun e-mail envoyé ; numéro « ONDE-EXEMPLE (fictive) ».
- Notice : non fournie → état « Notice à ajouter » dans la FAQ, aucun faux téléchargement.
- Suivi : « Exemple de résultat » sans aucun statut transporteur ; aucune donnée de commande consultée.
- Contact : case d'accord non cochée ; dans l'aperçu, aucun faux « message envoyé ».
- Réseaux sociaux du pied : icônes masquées tant que le projet n'a pas d'adresse réelle (la planche en montre trois).

## Médias

- Utilisés (kit privé `public/demo/onde/`, lus sur place) : les 20 compléments c01–c20 sauf c17, et deux originaux du kit
  (`04-detail-coussinet`, `05-detail-arceau`) pour les gros plans **sombres** que les planches montrent (« Au plus près
  du son », détails de l'accueil, « La bonne information », cercle matière) : aucun complément n'existe sur fond sombre.
- Non utilisé : **c17** (« moment d'écoute ») : casque déformé (un seul écouteur, arceau replié en bloc), signalé par
  Thomas le 25 octobre ; remplacé par c13 (casque debout aux deux écouteurs) dans l'article « Créer son moment
  d'écoute », sa carte du journal (accueil, page Journal) et le bandeau mobile « À votre rythme » de la marque.
- Originaux non utilisés : 01, 02, 03, 06, 07, 08, 09 (réserve : ancienne direction).
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

La différence moyenne reste élevée partout où la planche montre une photo que le kit ne fournit pas telle quelle (les
compléments recréés ne sont pas les mêmes prises de vue) : elle mesure l'écart d'image, pas seulement la mise en page.
L'écart de hauteur, lui, mesure les proportions.

## Écarts restants connus

- Grand mot « ONDE » : tracé du logo en contour (fidèle), mais les proportions du casque débordant ne peuvent être
  exactement celles de la planche : le complément c01 n'est pas la même prise de vue que l'image de la maquette.
- Planche 03 (cellules réduites) et planches mobiles : certaines tailles de texte restent légèrement différentes ; la
  FAQ filtre réellement par thème (la planche montre sous « Casque » des questions de commande).
- Planche 06 : le récapitulatif montre « Votre commande » et la mention de démonstration en plus ; le titre « Encore un
  instant. » tient sur une ligne au lieu de deux sur certains téléphones.
- Barre d'achat : visible quand la carte d'achat sort de l'écran (la planche la montre en bas de page).
- Paiement, confirmation, suivi, réseaux sociaux : écarts volontaires (honnêteté, ci-dessus).

## Mesures (rendu de la démo statique ramené à la largeur du panneau)

Écart de hauteur (positif : rendu plus haut que la planche) / différence moyenne (0 à 255).

| Page | Panneau ordinateur | Ordinateur | Panneau mobile | Téléphone (390 px) |
|---|---|---|---|---|
| Accueil | 01 (1440) | +1,7 % / 49,8 | 05 | +3,8 % / 63,7 |
| Le casque | 01 (1440) | +1,8 % / 50,1 | 05 | −1,3 % / 87,7 |
| La boutique | 02 (1440) | +0,2 % / 52,0 | 04 | +18,4 % / 87,4 |
| L'expérience | 02 (1440) | −3,1 % / 48,9 | 04 | +12,0 % / 70,3 |
| La marque | 02 (1440) | +3,9 % / 60,6 | 04 | +14,9 % / 96,4 |
| Journal | 02 (1440) | −6,0 % / 57,5 | 04 | +10,6 % / 74,5 |
| Panier rempli | 03 (913) | −0,2 % / 42,6 | 06 | −6,8 % / 76,4 |
| Panier vide | — | — | 06 | −5,5 % / 43,9 |
| Commande (Informations) | 03 (913) | −1,7 % / 37,9 | 06 | +13,7 % / 46,3 |
| Confirmation | — | — | 06 | +22,9 % / 67,9 |
| FAQ | 03 (913) | −30,1 % / 59,5 | 07 | −31,7 % / 131,4 |
| Contact | 03 (913) | −16,2 % / 56,1 | 07 | −3,7 % / 47,1 |
| Livraison & retours | 03 (913) | −1,2 % / 38,7 | 07 | −4,5 % / 39,1 |
| Suivi de commande | 03 (913) | +1,7 % / 50,8 | 07 | −7,9 % / 63,5 |

Lecture des plus grands écarts :
- **FAQ (−30 %)** : la planche montre sous l'onglet « Casque » des questions de commande et de livraison ; la démo filtre
  réellement par thème, la page est donc plus courte. Recherche, onglets et état « sans résultat » fonctionnent.
- **Confirmation mobile (+23 %)** : la mention « Exemple de confirmation » (aucune commande enregistrée, aucun e-mail) et
  le récapitulatif ajoutent de la hauteur.
- **Boutique, expérience, marque, journal sur téléphone (+11 à +18 %)** : textes et photos un peu plus hauts que sur la
  planche ; les photos du kit ne sont pas les vues dessinées sur les planches mobiles.
- **Contact ordinateur (−16 %)** : formulaire plus compact que sur la planche (mêmes champs).

## Vérifications

- Interactions (navigateur réel, `interactions.mjs`) : **42/42** — menu mobile (ouverture, Échap, focus), tiroir panier,
  quantité, suppression, sous-total, panier vide, carrousels, miniatures et agrandissement de la fiche, barre d'achat,
  FAQ (recherche + onglets + sans résultat), commande en trois étapes (champs vérifiés, retour sans perte, accord requis),
  confirmation, contact et suivi (champs vérifiés), aucune erreur de page.
- Débordement : **130 rendus** (toutes les pages à 360, 390, 430, 913 et 1440 px) : aucun débordement horizontal, aucun
  bouton coupé.
- Studio réel (`scripts/onde-studio-check.ts`, Next.js, base temporaire) : galerie E-commerce avec aperçu de neuf
  compositions ONDE ; bandeau ajouté, titre, bouton, photo et couleurs modifiés, dupliqué, déplacé, conservé après
  rechargement complet ; client fictif « Céramor » (théière) habillé en ONDE : son logo (éclairci sur le cadre graphite),
  son produit, ses textes, aucune photo, aucun texte ni prix de la démonstration.
- Adaptation client : la forme de référence ONDE (`reference-shapes.json`) a été réextraite de la nouvelle démonstration,
  seule (les dix autres thèmes sont inchangés) ; journal et articles, commande, confirmation, suivi et cookies restent dans
  la démonstration. La fiche ONDE montre la description du client ; un gabarit de produit secondaire n'est jamais vide.
- Tests : `tsc` sans erreur ; suite complète vitest ; Theme Check (ONDE FR, EN, services) sans erreur.

## Captures et comparaisons

Envoyées dans la conversation (photos du kit privé, jamais publiées) : côte à côte, superposition à 50 % et image des
différences pour chaque ligne du tableau, ordinateur et téléphone.
