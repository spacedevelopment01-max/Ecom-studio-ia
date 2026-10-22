# SILLON — thème « boutique spécialisée » n° 3 (issue #148)

État de la branche `claude/theme-sillon-148`. **À valider par Thomas : rien n'est fusionné ni déployé.**

## Finitions du 20 octobre (revue de coordination, commentaire 6293259742 sur la PR #149)

1. **Médias 07 et 16 réparés** (commit `5a9267c0` de `assets/sillon-theme-20261020`, contrôlés : 07 = 412 024 octets,
   1 254 × 1 254 ; 16 = 180 844 octets, 1 536 × 1 024 ; empreintes `15c116e7…` et `24d7460c…` identiques) :
   - **16** (machine sur un socle de pierre claire, lumière ivoire) remplace 13 dans l'inscription aux nouvelles de
     l'accueil : 13 (balcon alpin) n'est plus répété entre l'accueil, la fiche et « Usages » ;
   - **07** (gros plan de la bague et du bouton cuivrés, fini brossé) ouvre une section « Le cuivre, sous la main » sur
     la page « Utilisation » (bibliothèque : histoire de la marque, image et texte). Le texte décrit seulement ce qui se
     voit ; le rôle du bouton n'est jamais supposé ;
   - les 18 visuels sont désormais utilisés, aucun n'est vide.
2. **Textes aboutis, sans « À compléter » visible** :
   - ouverture commerciale (« La machine à espresso nomade, pour emporter votre rituel ») et trois arguments tirés du
     concept et des photos : bureau, voyage et dehors ; silhouette sobre aux détails cuivrés ; service dans le verre ;
   - « Quatre gestes, à préciser » devient « Un espresso, en quatre temps » : choisir sa table, placer le verre, laisser
     couler, savourer. Aucun geste technique supposé (remplissage, rôle du bouton, entretien) ;
   - FAQ publique de cinq réponses vraies (où l'utiliser, comment l'espresso est servi, où voir la machine de près,
     comment être prévenu, « Peut-on commander aujourd'hui ? » → non, démonstration) ;
   - **les informations inconnues ne sont plus affichées mais restent dans l'éditeur** : accordéons « Caractéristiques
     techniques », « Dans la boîte » et « Livraison, retours et garantie » de la fiche, groupes de caractéristiques
     inconnues, six questions en attente et la section « Livraison, retours et garantie » sont **masqués**, avec leurs
     champs « [À compléter : …] » prêts à remplir. Rien n'a été retiré de la bibliothèque ;
   - un seul bandeau de démonstration, clair : « Boutique de démonstration : aucune vente réelle. » Aucun prix inventé ;
     le paiement reste désactivé (le panier refuse l'ajout avec « Prix à définir ») ;
   - modèles de page orphelins de la composition (FAQ, livraison), qui ne contenaient que des manques : retirés de la démo.
3. **SEO revu** : titles et descriptions d'intention (rituel, usages, utilisation), plus seulement couleur et forme,
   sans surpromesse (tableau plus bas).
4. **Démos intégrales avant le choix d'un thème** (demande de Thomas) — voir la section dédiée plus bas.
5. **Trois défauts de bibliothèque corrigés en passant** (utiles à tous les projets) :
   - `cv-specs` : le réglage « Ouvert par défaut » ne marchait jamais (espace manquant avant l'animation, HTML
     `opendata-reveal`) ;
   - produit sans prix (aperçu du studio) : plus de « Taxes incluses, frais de livraison… » ni « par article » à côté
     d'un prix absent (fiche et « Produit à la une ») ;
   - profil « nomade » : boutons secondaires sans capitales, assortis aux boutons principaux.

## Démos intégrales avant « Choisir ce thème »

- Dans la galerie « Thèmes », chaque carte montre **la démonstration du thème** (plus jamais le projet du client) et un
  bouton **« Voir la démo complète »**. Il ouvre en plein écran la boutique de démonstration entière : FRAISE, ONDE, ORBE,
  Atelier Rive ou SILLON, avec nos produits, visuels, logos et textes.
- Le client **défile toutes les sections**, **change de page** (sélecteur de pages, ou menus et liens de la démo
  elle-même ; le sélecteur suit), **bascule ordinateur / téléphone** (390 px). Panier simulé, paiement désactivé.
- **Rien n'est envoyé au projet pendant la visite** : pas de substitution, pas d'IA, pas de dépense, pas d'écriture.
  Le seul geste qui modifie le projet est **« Choisir ce thème »** (dans la démo ou sur la carte), qui passe par le
  parcours habituel : nouvelle version composée avec l'identité et les contenus du projet, l'ancienne reste restaurable.
- **Double application impossible** : garde immédiate dans la galerie (un double-clic n'envoie qu'une demande) et, côté
  serveur, une demande identique encore en cours renvoie la même tâche au lieu d'en créer une seconde.
- **Après le choix**, l'éditeur affiche un encadré « Thème appliqué avec vos contenus » qui liste les sections masquées
  faute d'informations du client, avec la marche à suivre ; rien n'est emprunté à la démo.
- Droits : le choix reste soumis à la catégorie du projet et au forfait (règles d'accès existantes, consommées telles
  quelles ; la grille de prix de Codex #150 n'est pas touchée). La démo complète, elle, se consulte librement ; quand
  le choix n'est pas possible, son motif s'affiche à la place du bouton.
- **Fonctionnement** : les démos sont les exports statiques complets déjà utilisés pour les aperçus validés
  (`scripts/reference-static-preview.ts`). Elles sont préparées hors du dépôt (`<dossier data>/theme-demos`, leurs
  visuels venant en partie du kit privé), par `npm run demos:themes` ou automatiquement en arrière-plan à la première
  ouverture de la galerie, puis à chaque nouvelle version du code (environ 2 minutes pour les cinq). La préparation
  tourne dans un processus séparé avec sa propre base temporaire : la base des projets n'est jamais ouverte. Pendant une
  mise à jour, l'ancienne démo reste servie.

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
| | 8 | Newsletter | `newsletter-media` · inscription avec visuel | 16 socle de pierre, lumière ivoire |
| Fiche produit | — | (corps de fiche) | `main-product` · galerie en grille, cadre carré, barre d'achat | 02, 11, 15, 03, 06 |
| | 1 | Détails du produit | `cv-hotspots` · repères, liste dessous | 01 vue de dessus |
| | 2 | Caractéristiques | `cv-specs` · titre à côté (« La machine, détail par détail ») ; groupes inconnus masqués | — |
| | 3 | Mode d'emploi | `cv-steps` · étapes sur une ligne (« Un espresso, en quatre temps ») | — |
| | 4 | Situations d'utilisation | `cv-alternating` · images à gauche | 05 bureau, 13 balcon |
| | 5 | Garanties et livraison | `fs-commitments` · liste détaillée — **masquée** (inconnus), prête dans l'éditeur | — |
| | 6 | Questions fréquentes | `faq` · accordéons en lignes (5 visibles, 6 en attente masquées) | — |
| Usages | 1 | Situations d'utilisation | `cv-alternating` · alternance (6 lieux) | 05, 12, 08, 14, 13, 10 |
| | 2 | Situations d'utilisation | `cv-gallery` · grille 2 colonnes | 17, 18 |
| | 3 | Achat et offres | `cta-banner` · bandeau d'appel | — |
| Utilisation et caractéristiques | 1 | Mode d'emploi | `cv-steps` · étapes en cartes | 11 |
| | 2 | Histoire de la marque | `image-with-text` · image à droite (« Le cuivre, sous la main ») | 07 gros plan cuivré |
| | 3 | Caractéristiques | `cv-specs` · empilés ; groupes inconnus masqués | — |
| | 4 | Questions fréquentes | `faq` · numérotées (5 visibles, 6 masquées) | — |
| Contact | 1 | Contact | `contact-form` · formulaire et coordonnées | — |

- **Accueil sur téléphone** : le visuel d'ouverture passe au-dessus du titre, entier, sans texte superposé.
- **Projet neuf dans SILLON** : même composition. Toute section sans contenu réel reste masquée (repères, FAQ,
  mode d'emploi…) jusqu'à ce que le client la remplisse.
- **Médias** :
  - les 18 visuels sont tous utilisés, chacun une seule fois par page (07 et 16 réparés au commit `5a9267c0`) ;
  - 09 (logo) est utilisé en en-tête et pour l'icône du site. Il est brun sur transparent, donc invisible sur fond
    sombre : le pied sombre affiche le nom en grandes lettres plutôt que le logo.

## Textes et SEO

- **Faits affirmés** (visibles sur les images) :
  - corps cylindrique brun mat ;
  - bague et bouton de teinte cuivrée, un seul bouton visible ;
  - marquage SILLON ;
  - l'espresso coule directement dans le verre placé dessous ;
  - les lieux représentés.
- **Jamais affirmés, jamais affichés** dans la démo publique ; champs « [À compléter : …] » masqués, prêts dans
  l'éditeur : pression, chauffe, alimentation, autonomie, recharge, compatibilité, contenance, dimensions, poids,
  matériaux, certifications, contenu du coffret, entretien, livraison, retours, garantie, assistance.
- **Aucun** prix inventé, avis, note, compteur, urgence, réduction ni stock. Le prix affiché reste « Prix à définir ».
- **Démonstration signalée** par un seul bandeau : « Boutique de démonstration : aucune vente réelle. ».
- **Copyright** : « © année SILLON ». Aucun document juridique inventé.

| Page | Title | Meta description | H1 |
|---|---|---|---|
| Accueil | SILLON \| Machine à espresso nomade, du bureau au voyage | SILLON emporte le rituel de l'espresso du bureau à la chambre d'hôtel, du train au pique-nique, servi directement dans le verre. | La machine à espresso nomade, pour emporter votre rituel |
| Fiche | Machine à espresso portable SILLON : vues, détails, rituel | Découvrez SILLON, machine à espresso portable : toutes ses vues, ses finitions cuivrées de près et le rituel du café, de la table au verre. | Machine à espresso nomade SILLON |
| Usages | Machine à café portable : bureau, voyage, plein air \| SILLON | Bureau, cuisine, hôtel, train, balcon, pique-nique : six lieux où poser SILLON, machine à café portable, en photos. | Une machine à café portable, du bureau au plein air |
| Utilisation | Utiliser SILLON : le rituel espresso et la machine en détail | Le rituel du café avec SILLON, machine à espresso nomade, en quatre temps, ses finitions cuivrées de près et les réponses aux questions fréquentes. | Utilisation et caractéristiques de la machine à espresso nomade |
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
  - FAQ sans données structurées dans la démo (aucun résultat enrichi n'est promis sur une boutique sans vente).
- **Aperçus privés jamais indexés** : en-tête `X-Robots-Tag: noindex, nofollow, noarchive` sur la route d'aperçu,
  balise `robots noindex` dans l'aperçu (le thème exporté n'en a pas). `robots.txt` et le plan du site excluaient déjà
  `/preview/`.
- **Images** : l'image d'ouverture est chargée tout de suite avec `fetchpriority="high"`, les autres en
  `loading="lazy"`. Les cadres réservent la place (rapport largeur / hauteur fixé par la section).

## Vérifications

| Vérification | Résultat | Nature |
|---|---|---|
| Tests ajoutés : `sillon-theme` (catalogue, profil, composition dans l'ordre du thème, médias, SEO, honnêteté, identité d'un autre projet), `sillon-exports` (Shopify, WooCommerce, PrestaShop) ; tests du catalogue passés de 4 à 5 thèmes | réussis | exécuté |
| Finitions : tests `sillon-theme` (aucun « à compléter / à confirmer / à préciser » visible, champs inconnus conservés masqués, 18 visuels, 07 et 16 placés), `theme-demos` (fichiers servis seulement depuis la démo, état prête / périmée, aucune préparation en test, une seule tâche par choix) | réussis | exécuté |
| Suite complète et typage (finitions) | 321 fichiers, 2 451 tests réussis (2 ignorés), `tsc` sans erreur | exécuté |
| Studio réel, démo complète puis choix, projet existant « Atelier Verre » : démos SILLON et FRAISE parcourues (pages, menu de la démo, téléphone), empreinte du projet identique et aucune écriture pendant la visite, double-clic + demande simultanée → 1 tâche et 1 version, guide après le choix, studio sur téléphone | réussi (11 étapes) | exécuté (`scripts/theme-demo-choice-check.ts`) |
| Préparation des cinq démos complètes | FRAISE 24 s, ONDE 22 s, ORBE 19 s, Atelier Rive 18 s, SILLON 21 s | exécuté (`npm run demos:themes`) |
| Theme Check de Shopify : SILLON, FRAISE, ONDE, ORBE, Atelier Rive (après finitions) | aucune erreur ; les 4 mêmes avertissements que sur `main` (variables inutilisées dans deux sections) | exécuté |
| Captures SILLON : accueil, fiche, Usages, Utilisation, Contact, panier à 360, 390, 768 et 1 440 px | aucun débordement ; ouverture : la machine entière, au-dessus du texte sur téléphone | exécuté |
| Contrôle statique SILLON (9 pages × 360 / 390 / 430 / 1 440 px) : un H1, aucun débordement, mention d'aperçu, menu, fiche, panier | réussi ; sans prix, le panier refuse l'ajout avec le message « Prix à définir » | exécuté |
| Studio réel, projet distinct « Atelier Verre » : galerie « Thèmes » → SILLON appliqué (tâche du worker) → disposition et titre modifiés depuis le panneau → rechargement → aperçu téléphone / ordinateur | réussi ; identité du projet, aucun texte ni visuel de la démo, `X-Robots-Tag: noindex` | exécuté (`scripts/sillon-studio-check.ts`) |
| Studio réel, démo SILLON : galerie des 20 fonctions, autre famille introuvable, ajout, changement de disposition, effets, déplacement, en-tête et pied (5 dispositions chacun, la disposition SILLON reconnue), rechargement, « réduire les animations » | réussi | exécuté (`scripts/family-studio-check.ts sillon`) |
| Exports WooCommerce / PrestaShop dans Chromium : profil « nomade », repères, visionneuse de la mosaïque | réussi, aucun débordement ni erreur ; FRAISE, ORBE et Atelier Rive toujours réussis | exécuté (sans installation réelle) |
| Quatre thèmes validés, avant (captures de #145) / après finitions | 233 captures identiques au pixel sur 236 ; les 3 écarts sont ceux déjà constatés en #145 (tiroir en ouverture, bord de galerie). Un 4ᵉ écart passager (miniatures de la fiche FRAISE chargées en différé, HTML identique) a disparu à la nouvelle capture | exécuté |
| Génération IA | aucune | — |

## Limites connues

- Studio du Codespace de Thomas : non vérifié (hôte `*.app.github.dev` refusé par le réseau de cet environnement).
  Tout a été vérifié sur une copie isolée (studio Next.js de développement + worker, base temporaire, aucune IA).
- Exports WordPress / PrestaShop / Shopify : contenu des ZIP et rendu vérifiés, **pas d'installation dans une vraie
  boutique**.
- La page des tarifs dit encore « Les quatre thèmes de référence » : la tarification est hors de cette mission, je
  ne l'ai pas modifiée (à corriger sur ta décision).
- Démos intégrales : en français seulement (contenus des démonstrations) ; dans la démo, la touche Échap ferme d'abord
  les menus de la boutique, puis la démo quand le curseur est sur la barre du haut. FRAISE, ONDE, ORBE et Atelier Rive
  ont besoin du kit privé de Thomas pour être préparées (comme leurs aperçus) ; sans lui, leur bouton indique
  « Démo complète indisponible ».
- Le choix d'une direction dans l'onglet « Marque » (vignettes avec le contenu du projet) n'a pas changé : le parcours
  de choix avec démo complète est celui de la galerie « Thèmes » de la boutique.
- Claude-Mem et VibeSec : non installés. Aucune référence vérifiée sous ces noms dans le catalogue de plugins
  disponible ; seuls des voisins existent (« Cowork Memory », inspiré de claude-mem ; « claude-security », Anthropic).
  Je n'ai rien installé et n'ai utilisé aucun dépôt homonyme non vérifié.
