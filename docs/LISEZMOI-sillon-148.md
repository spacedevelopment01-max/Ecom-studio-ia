# SILLON — thème « boutique spécialisée » n° 3 (issue #148)

État de la branche `claude/theme-sillon-148`. **À valider par Thomas : rien n'est fusionné ni déployé.**

## Base de travail et dépendances

- Partie de la tête de la PR spacedevelopment01-max/Ecom-studio-ia#147 (issue #145, **non fusionnée**) : SILLON réutilise
  ses corrections de bibliothèque (exports WordPress / PrestaShop avec `family.js` et `conversion.js`, garde de famille
  côté serveur, section citation sans fausse note…). Cette PR contient donc aussi les commits de #147 tant que celle-ci
  n'est pas fusionnée ; une fois #147 fusionnée, il ne restera que les commits SILLON.
- Médias : commit `8bbbc3bd` de la branche `assets/sillon-theme-20261020`, dossier `public/theme-assets/sillon/`
  (repris tel quel, suivis dans le dépôt).
- Travail Codex #142 / #146 : non touché, non inclus.

## Ce qui change pour le studio

- **SILLON est le 5ᵉ thème actif**, dans la catégorie « boutique spécialisée » avec FRAISE et ONDE : galerie « Thèmes »,
  recommandation, contrat amont, IA et commandes, accès par forfait (inclus dans tout forfait payant, comme les quatre
  autres). Aucun ancien thème ni aucune section retirée n'est réintroduit.
- **Identité propre** (profil graphique « nomade », pas une palette de FRAISE ou ONDE) :
  - titres en serif fine (Libre Baskerville 400), texte en Jost ;
  - ivoire chaud, encre espresso, accent cuivré en dégradé ;
  - filets fins au lieu des cadres, filet « sillon » sous les titres, boutons en pilule avec un reflet au survol ;
  - ouverture sombre avec halo cuivré ;
  - en-tête « Bouton d'achat visible » (logo à gauche, menu à droite, bouton « Commander » permanent vers la fiche) ;
  - pied « Grand nom de marque ».
  Tous les effets sont décoratifs et coupés par « réduire les animations » ; aucun contenu n'en dépend.
- **Appliqué à un autre projet**, SILLON prend le nom, les couleurs, les textes et les images de ce projet : aucun mot
  ni visuel de la démonstration SILLON (vérifié par test et dans le studio réel avec « Atelier Verre »).

## Composition (bibliothèque « boutique spécialisée », 11 fonctions sur 20)

| Page | # | Fonction (bibliothèque) | Section · disposition | Visuels |
|---|---|---|---|---|
| Accueil | 1 | Présentation principale | `cv-hero` · visuel à gauche, format large, schéma sombre, H1 | 04 socle cuivré |
| | 2 | Histoire de la marque | `rich-text` · grande déclaration | — |
| | 3 | Bénéfices du produit | `cv-feature` · visuel à gauche, 3 points | 19 macro |
| | 4 | Détails du produit | `cv-hotspots` · repères, liste à côté (4 repères) | 06 trois-quarts |
| | 5 | Situations d'utilisation | `cv-gallery` · mosaïque (6 lieux) | 10, 18, 08, 12, 17, 14 |
| | 6 | Achat et offres | `featured-purchase` · achat compact (4 vues) | 02, 11, 15, 03 |
| | 7 | Questions fréquentes | `faq` · titre à côté (4 questions) | — |
| | 8 | Newsletter | `newsletter-media` · inscription avec visuel | 13 balcon alpin |
| Fiche produit | — | (corps de fiche) | `main-product` · galerie en grille, cadre carré, barre d'achat | 02, 11, 15, 03, 06 |
| | 1 | Détails du produit | `cv-hotspots` · repères, liste dessous | 01 vue de dessus |
| | 2 | Caractéristiques | `cv-specs` · titre à côté, accordéons | — |
| | 3 | Mode d'emploi | `cv-steps` · étapes sur une ligne | — |
| | 4 | Situations d'utilisation | `cv-alternating` · images à gauche | 05 bureau, 13 balcon |
| | 5 | Garanties et livraison | `fs-commitments` · liste détaillée | — |
| | 6 | Questions fréquentes | `faq` · accordéons en lignes (7 questions) | — |
| Usages | 1 | Situations d'utilisation | `cv-alternating` · alternance (6 lieux) | 05, 12, 08, 14, 13, 10 |
| | 2 | Situations d'utilisation | `cv-gallery` · grille 2 colonnes | 17, 18 |
| | 3 | Achat et offres | `cta-banner` · bandeau d'appel | — |
| Utilisation et caractéristiques | 1 | Mode d'emploi | `cv-steps` · étapes en cartes | 11 |
| | 2 | Caractéristiques | `cv-specs` · accordéons empilés | — |
| | 3 | Questions fréquentes | `faq` · numérotées | — |
| Contact | 1 | Contact | `contact-form` · formulaire et coordonnées | — |

- **Accueil sur téléphone** : le visuel d'ouverture passe au-dessus du titre, entier, sans texte superposé.
- **Projet neuf dans SILLON** : même composition. Toute section sans contenu réel reste masquée (repères, FAQ,
  mode d'emploi…) jusqu'à ce que le client la remplisse.
- **Médias** :
  - les 16 visuels réels sont tous utilisés, chacun une seule fois par page ;
  - **07 (bouton cuivré) et 16 (lumière ivoire) font 0 octet dans le commit `8bbbc3bd` lui-même** : ils ne sont ni
    importés ni remplacés. Leur emplacement prévu (gros plan du bouton dans « Détails », ouverture claire) reste à
    reprendre dès que les fichiers seront renvoyés ;
  - 09 (logo) est utilisé en en-tête et pour l'icône du site. Il est brun sur transparent, donc invisible sur fond
    sombre : le pied sombre affiche le nom en grandes lettres plutôt que le logo.

## Textes et SEO

- **Faits affirmés** (visibles sur les images) :
  - corps cylindrique brun mat ;
  - bague et bouton de teinte cuivrée, un seul bouton visible ;
  - marquage SILLON ;
  - l'espresso coule directement dans le verre placé dessous ;
  - les lieux représentés.
- **Champs « [À compléter] » visibles et modifiables** : pression, chauffe, alimentation, autonomie, recharge,
  compatibilité, contenance, dimensions, poids, matériaux, certifications, contenu du coffret, rôle exact du bouton et
  du dessus, entretien, livraison, retours, garantie, assistance.
- **Aucun** prix (« Prix à définir »), avis, note, compteur, urgence, réduction ni stock.
- **Démonstration signalée** par le bandeau « Démonstration : prix et caractéristiques à confirmer. ».
- **Copyright** : « © année SILLON ». Aucun document juridique inventé.

| Page | Title | Meta description | H1 |
|---|---|---|---|
| Accueil | Machine à espresso nomade SILLON \| Bureau, voyage, plein air | SILLON, machine à espresso nomade au corps brun mat et aux détails cuivrés : l'espresso coule directement dans le verre, du bureau au voyage. | La machine à espresso nomade |
| Fiche | SILLON, machine à espresso portable brun et cuivre | SILLON, machine à espresso portable : cylindre brun mat, bague et bouton cuivrés, espresso servi directement dans le verre. Vues, détails et caractéristiques. | Machine à espresso nomade SILLON |
| Usages | Machine à café portable : bureau, voyage, plein air \| SILLON | Bureau, cuisine, hôtel, train, balcon, pique-nique : six lieux où poser SILLON, machine à café portable, en photos. | Une machine à café portable, du bureau au plein air |
| Utilisation | Utilisation et caractéristiques de la machine espresso SILLON | Mode d'emploi en quatre gestes et caractéristiques de SILLON, machine à espresso nomade : ce qui est confirmé, ce qui reste à préciser. | Utilisation et caractéristiques de la machine à espresso nomade |
| Contact | Contact \| SILLON, machine à espresso nomade | Une question sur SILLON, la machine à espresso nomade ? Écrivez-nous par le formulaire de contact. | Contact |

- **Une intention par page**, sans bourrage de mots-clés ; titles et descriptions uniques et modifiables (SEO de la
  boutique, de la fiche et de chaque page).
- Adresses lisibles (`/pages/usages`, `/pages/utilisation-caracteristiques`) ; liens internes entre accueil, fiche et
  pages ; canonical sur chaque page.
- Textes alternatifs descriptifs. Les miniatures décoratives ont un alt vide, désormais écrit aussi par l'aperçu.
- **Données structurées (thème, pour tous les projets)** :
  - `Product` sans `Offer` tant qu'aucun prix n'est fixé ;
  - jamais d'`AggregateRating` ;
  - `BreadcrumbList` ajouté sur la fiche et les pages ;
  - FAQ sans données structurées tant que des réponses restent à compléter (aucun résultat enrichi n'est promis).
- **Aperçus privés jamais indexés** : en-tête `X-Robots-Tag: noindex, nofollow, noarchive` sur la route d'aperçu,
  balise `robots noindex` dans l'aperçu (le thème exporté n'en a pas). `robots.txt` et le plan du site excluaient déjà
  `/preview/`.
- **Images** : l'image d'ouverture est chargée tout de suite avec `fetchpriority="high"`, les autres en
  `loading="lazy"`. Les cadres réservent la place (rapport largeur / hauteur fixé par la section).

## Vérifications

[Résultats à reporter : tests, Theme Check, captures, parcours studio, exports, non-régression.]

## Limites connues

- Studio du Codespace de Thomas : non vérifié (hôte `*.app.github.dev` refusé par le réseau de cet environnement).
  Tout a été vérifié sur une copie isolée (studio Next.js de développement + worker, base temporaire, aucune IA).
- Exports WordPress / PrestaShop / Shopify : contenu des ZIP et rendu vérifiés, **pas d'installation dans une vraie
  boutique**.
- La page des tarifs dit encore « Les quatre thèmes de référence » : la tarification est hors de cette mission, je
  ne l'ai pas modifiée (à corriger sur ta décision).
- Médias 07 et 16 vides à la source (voir plus haut).
- Claude-Mem et VibeSec : non installés. Aucune référence vérifiée sous ces noms dans le catalogue de plugins
  disponible ; seuls des voisins existent (« Cowork Memory », inspiré de claude-mem ; « claude-security », Anthropic).
  Je n'ai rien installé et n'ai utilisé aucun dépôt homonyme non vérifié.
