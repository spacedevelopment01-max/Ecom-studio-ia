# SILLON V2 — machine à espresso nomade, Produit spécifique / Boutique spécialisée

Branche `claude/theme-sillon-v2`, construite sur la branche de PARENTHÈSE (`claude/theme-parenthese`, PR #181, pas
encore fusionnée) pour ne pas écraser ce travail récent. Seul le dossier documentaire `docs/theme-briefs/sillon-v2/`
(PR #182) a été repris ; les quatre planches téléphone envoyées ensuite par Thomas y ont été ajoutées
(`maquettes/04` à `07`). **Rien n'est fusionné ni déployé**, aucun appel IA payant, aucun paiement, aucun envoi.

Consigne suivie : `docs/theme-briefs/sillon-v2/CONSIGNE_CLAUDE.md`, les trois planches ordinateur (01 accueil et
machine ; 02 rituel, SILLON, carnet, article ; 03 panier, commande, FAQ, contact, livraison, suivi) et les quatre planches
téléphone (04 accueil et machine ; 05 rituel, SILLON, carnet, article ; 06 FAQ, contact, livraison, suivi ; 07 panier,
commande en quatre écrans, menu, tiroir du panier, panier vide).

## Pour Thomas, en bref

- **Ce que vous voyez** : la boutique SILLON complète (12 pages des planches + 6 autres articles du carnet, pages
  légales, page introuvable, recherche), sur ordinateur et sur téléphone, avec le même dessin que les planches : en-tête
  flottant en capsule, très grands titres condensés, produit détouré en surplomb devant le cercle cuivre, courbes de
  niveau et chemins cuivre (dessinés en SVG, modifiables), pieds de page sombre, clair, d'aide ou d'achat selon la page.
- **Sur téléphone**, chaque page a été recalée sur vos planches mobiles, élément par élément (positions, tailles,
  retours à la ligne, cadrages des photos) : voir les superpositions dans `reports/sillon-v2/comparaisons/telephone/`.
- **On peut tout essayer** : galerie et zoom, ajout au panier (tiroir), quantités, suppression, panier, commande en trois
  étapes, filtres et recherche de la FAQ, sommaire de l'article, filtres du carnet, formulaire de contact, suivi,
  cookies (accepter / refuser / personnaliser). **La commande, le contact et le suivi sont simulés et le disent à
  l'écran** : aucun paiement, aucun envoi, aucun champ de carte bancaire.
- **129 € est un prix d'exemple** annoncé comme tel ; deux machines font bien 258 €. La livraison reste « calculée à
  l'étape suivante » : aucun total trompeur.
- **Rien d'inventé** : pression, batterie, chauffe, garantie, délais et frais de livraison ne sont jamais affirmés
  (« [À compléter : …] » dans l'éditeur). La notice d'entretien affiche « (notice à ajouter) » tant qu'aucun PDF n'est
  déposé.
- **Tout se modifie dans le studio** (Boutique → éditeur) : textes, photos, cadrages (ordinateur et téléphone séparément),
  ordre des sections ; 27 sections « SILLON » dans la bibliothèque, en français et en anglais.
- **Chez un autre client**, le thème reprend SES textes, SES photos, SON produit et SON prix : aucun mot SILLON, café,
  van ni 129 € ne reste (vérifié par test).
- **Les écarts qui restent** sont listés plus bas, sans les cacher. Branche livrée ≠ fusion ≠ studio : le thème
  n'apparaîtra dans votre studio qu'après fusion puis déploiement. La validation du rendu vous revient.

## Ce qui est livré

| Domaine | Contenu |
|---|---|
| Pages | Accueil, fiche « SILLON V2 », Le rituel, SILLON (marque), Carnet d'échappées (filtres) + 6 articles, Panier (plein et vide), Commande (3 étapes + exemple de confirmation), FAQ, Contact, Livraison et retours, Suivi de commande, 4 pages légales, page introuvable, recherche. |
| Ordinateur | Pages reproduites à la largeur du panneau de chaque planche (1440 pour la planche 01, 970 pour la 02, 822 pour la 03) puis contrôlées à 1440. |
| Téléphone | Accueil, fiche (carrousel, points, zoom, barre d'achat qui apparaît après la carte), rituel, SILLON, carnet, article (sommaire repliable), FAQ (7 questions, 4 filtres, comme la planche mobile ; 5 et 3 sur ordinateur, comme la planche ordinateur), contact, livraison (onglets), suivi, panier, commande (4 écrans), menu plein écran (paysage, route cuivre, contact, panier, mentions), tiroir du panier, panier vide. Contrôlé à 360, 390 et 430 px : aucun débordement. |
| Achat | Une seule variante vendable (espresso & cuivre) ; la pastille sauge est annoncée indisponible. Coffret « contenu illustratif ». Panier : sous-total réel, livraison « calculée à l'étape suivante », « Total produits ». |
| Commande | Simulée et annoncée (« Commande d'exemple : aucun paiement, aucun envoi, aucun e-mail »). Étape 3 : cadres de carte **décoratifs** (aucune zone de saisie), bouton « Valider le paiement » inactif. L'exemple de confirmation (adresse `#confirmation-exemple`) dit « Exemple de confirmation : aucune commande n'a été enregistrée ». Boutique réelle : le bouton du panier mène au paiement Shopify. |
| Cookies | Bandeau « Tout accepter / Tout refuser / Personnaliser », choix mémorisé et modifiable depuis la page Cookies. |
| Studio | 27 sections `sv-*` dans la bibliothèque (FR/EN), 410 libellés d'éditeur traduits en anglais, réglages téléphone distincts (titres, coupes de lignes, cadrage et agrandissement des photos, affichage ordinateur / téléphone d'un bandeau ou d'une question). |

## MATRICE_SILLON_V2 — planche → panneau → route → section → média → action → preuve → état

Comparaisons (côte à côte, superposition à 50 %, différences) : `reports/sillon-v2/comparaisons/ordinateur/` et
`reports/sillon-v2/comparaisons/telephone/` ; captures pleine page : `reports/sillon-v2/captures/` (1440, 390, 360, 430 ;
`debordements.txt` donne le débordement horizontal mesuré, 0 partout). « Testé » = vérifié par
`tests/sillon-theme.test.ts` et rejoué dans Chromium ; « réalisé » = présent, rendu et comparé visuellement.

| Planche | Panneau | Route | Sections | Médias (v2-…) | Actions | Preuve | État |
|---|---|---|---|---|---|---|---|
| 01 / 04 | Accueil | `/` | sv-hero, sv-format, sv-collage, sv-band, sv-ritual, sv-posts, sv-band (téléphone), sv-footer sombre | 01, 02, 04, 05, 09, 10, 14, 20, 21 | menu, liens, inscription e-mail | `01-accueil-*`, `04a-accueil-*` | testé |
| 01 / 04 | Machine | `/products/sillon-v2` | sv-product, sv-banner, sv-details, sv-ritual sombre, sv-box, sv-faqlinks, sv-buybar | 02, 03, 06, 07, 08, 09, 10, 11, 12, 21 | galerie, zoom, carrousel, quantité, ajout → tiroir, barre d'achat | `02-machine-*`, `04b-machine-*` | testé |
| 02 / 05 | Le rituel | `/pages/le-rituel` | sv-hero sombre, sv-steps, sv-care | 02, 09, 13, 14, 24 | notice « à ajouter » | `03-rituel-*`, `05a-rituel-*` | testé |
| 02 / 05 | SILLON | `/pages/sillon` | sv-hero, sv-principles, sv-band sombre | 06, 15, 16, 23 | — | `04-sillon-*`, `05b-sillon-*` | réalisé |
| 02 / 05 | Carnet | `/pages/carnet` | sv-journal, sv-band newsletter | 17–22 | filtres Tout / Sur la route / Le café / Entretien | `05-carnet-*`, `05c-carnet-*` | testé |
| 02 / 05 | Article | `/pages/carnet-le-cafe-en-van` (+5 articles) | sv-article, sv-posts | 21, 22, 02 | sommaire (ancres, repli au téléphone) | `06-article-*`, `05d-article-*` | réalisé |
| 03 / 07 | Panier | `/cart` | sv-cart | 02, 12, 15 | quantité, suppression, panier vide | `07-panier-*`, `07a-panier-*`, `07h-panier-vide-*` | testé |
| 03 / 07 | Commande | `/pages/commande` (`#etape-2`, `#etape-3`, `#confirmation-exemple`) | sv-checkout | 02, 12 | 3 étapes, retour, champs requis, paiement inactif | `08-commande-*`, `07b`…`07e` | testé |
| 03 / 06 | FAQ | `/pages/faq` | sv-faq | 02, 12, 16, 24 | recherche, filtres, accordéons, thème mis en avant | `09-faq-*`, `06a-faq-*` | testé |
| 03 / 06 | Contact | `/pages/contact` | sv-contact | 12, 23 | champs requis, consentement, envoi simulé annoncé | `10-contact-*`, `06b-contact-*` | testé |
| 03 / 06 | Livraison et retours | `/pages/livraison-et-retours` | sv-info | 15 | onglets (téléphone), ancre `#retours` | `11-livraison-*`, `06c-livraison-*` | réalisé |
| 03 / 06 | Suivi | `/pages/suivi-de-commande` | sv-track | 02, 12, 24 | résultat d'exemple annoncé | `12-suivi-*`, `06d-suivi-*` | testé |
| 07 | Menu ouvert | toutes les pages (téléphone) | sv-header | 17 | ouvrir, fermer, Échap, focus | `07f-menu-*` | testé |
| 07 | Tiroir du panier | après un ajout | sv-header | 02 | quantités, suppression, passer commande | `07g-tiroir-*` | testé |
| — | Pages légales, cookies, 404, recherche | `/pages/mentions-legales`… | sv-legal, sv-hero | — | gérer mes cookies | `captures/*` | réalisé |

## Écarts qui restent (nommés, avec preuve)

1. **Photos complémentaires** : ce sont des scènes recréées d'après les planches ; leur contenu et leur cadrage ne
   sont pas identiques (ex. paysage du bas du panier vide, collage de l'accueil, photos du carnet, image du contact).
   Visibles dans toutes les images `*-diff.jpg`. Les originaux des planches priment : remplacer une photo dans
   l'éditeur suffit, sans code.
2. **Polices** : Anton, Oswald, Space Mono et DM Sans (libres, bibliothèque Shopify) approchent les lettres des planches,
   qui sont un peu plus hautes et plus étroites. Les lignes ont été calées en largeur et en position ; quelques titres
   gardent ±3 % d'écart de largeur (ex. « LA ROUTE / VOUS ATTEND. » du panier vide : 235 px contre 245 px, 353 contre
   343). Quelques titres sont légèrement étirés ou resserrés (menu téléphone, titre de la fiche) ou ont un espacement
   de mots réduit (titre de la fiche sur ordinateur) pour coller aux planches.
3. **En-tête** : la planche 07 dessine l'en-tête à des échelles différentes d'un écran à l'autre ; le site garde un seul
   en-tête de taille constante (calé sur les planches 04 à 06). Sur la planche 07 le panier affiche « 0 » à côté de
   l'icône quand il est vide ; le site n'affiche le nombre que s'il y a des articles.
4. **Textes rendus honnêtes** (exigés par la consigne) : l'exemple de confirmation ne dit pas « Votre commande a bien
   été enregistrée » ; la première réponse de la FAQ ordinateur ne décrit pas un réservoir ni un mode d'emploi inventé ;
   « Total produits » remplace « Total » (la livraison n'est pas comprise). Ces phrases sont plus courtes ou différentes
   et décalent légèrement ce qui suit.
5. **FAQ** : la pastille « Machine » est mise en avant parce que la question ouverte est de ce thème (comme sur les
   planches) ; elle ne filtre la liste que si on clique dessus.
6. **Hauteurs de page** : les planches s'arrêtent parfois avant le pied de page (fiche téléphone, pages de la planche
   03) ; le site, lui, a son pied complet. Les comparaisons s'arrêtent à la hauteur de la planche.
7. **Fichier 02 du ZIP tronqué** : seule la réserve « produit-04-angle » manque ; elle n'est pas utilisée par les pages.

## Vérifié réellement / pas vérifié

- **Vérifié** : `npx tsc --noEmit` ; `npx vitest run` (voir la PR pour le résultat exact) dont `tests/sillon-theme.test.ts`
  (pages, H1, médias, honnêteté, panier 258 €, commande sans champ de carte, menu, FAQ par appareil, édition et
  sauvegarde, autre client sans résidu) ; Theme Check (`scripts/verify-theme.sh`) ; captures Chromium 1440, 390, 360 et
  430 sans débordement ; parcours rejoués dans Chromium (menu, tiroir, quantités, commande étapes 1 à 3, exemple de
  confirmation, filtres FAQ, cookies).
- **Pas vérifié** : installation dans une vraie boutique Shopify, paiement réel, envoi réel du formulaire de contact,
  suivi réel d'une commande (aucun essai réel n'a été fait, volontairement), lecteurs d'écran réels (seuls les
  attributs d'accessibilité ont été contrôlés), Safari et Firefox (seul Chromium a été utilisé).

## Revoir la démonstration

```bash
npx tsx scripts/reference-static-preview.ts <dossier> --only=sillon   # export statique (panier précalculé)
```
