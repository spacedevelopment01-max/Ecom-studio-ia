# Lot 2A — intention et limites de départ

Base : `70b6874e83eecb39eae622d4c59422f43fffd677`. Branche : `codex/lot-2a-themes-reference`, PR de suite à créer vers `codex/lot-1-consignes-textes-themes` tant que #133 n'est pas fusionnée.

Deux références sont intégrées aux emplacements existants **Vitrine** (produit) et **Jardin** (services). Le catalogue reste à 30 entrées et les plafonds de forfait ne changent pas. Les autres compositions ne sont pas refaites. Un changement de thème reste une action explicite et versionnée ; les projets existants ne sont pas remplacés par les données de démonstration.

## Références effectivement consultées

- [Vercel Commerce](https://github.com/vercel/commerce), tête consultée `3761e52e60df9c6a316e067dbfd7032e494d3634` : grille asymétrique 2/3 + 1/3, image prioritaire, informations d'achat rattachées au produit, variantes tactiles dont l'état reste dans l'URL. Sources lues : `components/grid/three-items.tsx`, `components/product/variant-selector.tsx`. Inspiration de hiérarchie et d'interaction ; aucune copie des composants, images ou marque.
- [AstroWind](https://github.com/arthelokyo/astrowind), tête consultée `14e1a691f80548dcc36370847b1a02c0d0b12821` : parcours promesse → offre → méthode → questions → contact ; appel principal explicite, variantes mobiles et formulaire dont la dépendance au backend est déclarée. Sources lues : `src/pages/index.astro`, `src/pages/landing/lead-generation.astro`. Aucun témoignage, score ou chiffre du site de référence repris.
- [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md), version distante consultée : focus visible, libellés, dimensions des médias, mouvement réduit, état des variantes, débordements et éléments fixes.

**Limite d'accès :** la consultation directe de sites externes tels que Muuto échoue avec un refus HTTP 403 du proxy de l'environnement. Ces pages ne sont pas présentées comme visitées. Les références ci-dessus ont été examinées dans leurs sources publiques actuelles accessibles ; elles ne remplacent pas une comparaison visuelle indépendante avec les meilleurs sites en production.

## Vitrine : objet, matière et achat

Démo autorisée : ARVEN, avec les photos et le logo existants. Composition : navigation fine, ouverture asymétrique avec produit entier, présentation courte, collection, matière, détail, usages, fiche des informations connues, FAQ et appel à découvrir l'objet. La fiche d'achat conserve ses propres médias, variantes et textes complets.

Palette : porcelaine `#F1F1ED`, blanc `#FFFFFF`, gris argent `#D9DFE0`, encre `#1E2225`, accent de la marque `#A86932`. Titres Cormorant, textes DM Sans ; les typographies explicitement validées du client priment. Grille à douze colonnes, titre ample et image dominante ; moins d'effets, davantage de contraste photographique. Sur mobile, titre puis photo entière et action, sans dépendance au survol.

## Jardin : lieu, projet et échange

Démo autorisée : Racines & Pierres, avec ses ressources existantes sans personnes. Composition différente : titre paysage, grande photo horizontale, introduction, prestations éditoriales, reportage visuel, méthode séquentielle, galerie, questions, informations pratiques et demande de devis. Présentation, détail de prestation et contact accessibles ; aucun panier ajouté aux services.

Palette : vert forêt `#233D31`, vert sombre `#1D2E22`, sauge `#DCE6D2`, ivoire de la marque `#F7F8F1`, accent rose `#E89BA7`. Titres Archivo, textes Work Sans ; respect des choix validés. Grille plus ample, images et textes en décalage, lecture des prestations en lignes plutôt qu'en cartes répétées. Mobile recomposé en une colonne, contacts tactiles et menu accessible.

## Choix communs à vérifier

Quatre composants réutilisables et éditables : ouverture, reportage image/texte, offres, notes factuelles. Variantes d'en-tête et de pied de page sélectionnables. Couleurs et typographies du modèle existant, pas de deuxième source de contenu. Apparition initiale courte et transitions sur action, sans mouvement continu ; contenu visible sans script et avec mouvement réduit. Aucune fausse preuve sociale. Les manques restent honnêtes et ne servent pas à remplir dix sections artificiellement.

Les captures finales devront montrer le vrai thème généré par le studio, après chargement de toute la page. Les originaux PNG et la vidéo seront conservés dans les preuves GitHub ; des copies téléchargeables et des aperçus séparés seront remis dans la conversation. Le problème de lecteur de la conversation n'est pas attribué au chargement différé du site testé.
