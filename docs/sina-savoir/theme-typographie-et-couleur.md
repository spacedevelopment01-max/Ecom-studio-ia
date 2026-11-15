# Typographie et couleur pour un site : cahier de métier

Recherche du 13 novembre 2026. « (lu) » : lu sur la page citée ; « (résumé) » : lu seulement dans un résumé de recherche ; « (métier) » : savoir du métier, non vérifié sur une page. Les clés entre crochets renvoient aux sources, en fin de cahier. Les répertoires (couples de polices, schémas de couleurs, mises en page) sont des propositions de métier : seule l'existence de chaque police a été vérifiée, dans la liste officielle de Google Fonts du 13 novembre 2026.

## Typographie

### Choisir une police de titres et une police de texte

- Deux questions : que fait ressentir la police, et comment travaille-t-elle ? L'émotion fait le premier tri, la technique (graisses, langues) le valide aussitôt (lu) [S2].
- Liste de contrôle : la police sert le projet ; son dessin est complet (langues, graisses de base ; mieux : largeurs, tailles optiques) ; ses fichiers sont fiables (lu) [S3].
- Avant une seconde police, épuiser la première : graisses, tailles, capitales, interlettrage. La seconde ne se justifie que si elle fait ce que la première ne sait pas faire (lu) [S1].
- Le couple cherche « distinction et harmonie » ; « dans le doute, associez une sérif et une linéale » (lu) [S1]. Erik Kennedy : ce mariage convient « environ 95 % du temps » ; ne jamais unir deux polices qui se ressemblent (son exemple : Montserrat et Roboto) (lu) [S21].
- Méthode de Kennedy : écrire les adjectifs de la marque ; choisir d'abord la police de texte pour sa lisibilité (grande hauteur d'x, contre-formes ouvertes, traits solides) ; donner la personnalité aux titres ; fixer le rôle de chaque police (lu) [S21].
- Butterick : deux polices passent, trois rarement, quatre presque jamais ; chaque police garde un rôle constant ; jamais deux polices dans un même paragraphe ; raccourci sûr : deux polices du même dessinateur (lu) [S16]. Pour lui, un contraste faible peut mieux marcher qu'un fort : désaccord avec Kennedy, à trancher à l'œil.
- Le plus sûr : la superfamille (sérif, linéale, égyptienne, mono sur un même squelette) (lu) [S9]. Autre outil : la « matrice » d'Indra Kupferschmid, qui décrit une police en trois couches : squelette, chair, peau (lu, début de la leçon seulement) [S9].
- Si la police principale évoque une époque, la seconde poursuit ce thème, sauf contraste voulu (lu) [S4]. Ces associations changent selon les cultures et le temps (lu) [S2].
- Apple : peu de polices, et pas de graisses ultra-fines ou légères (lu) [S25].

### Les familles et leur effet

Définitions (lu) [S4, S5]. Effet produit : (métier).

- Sérif ancien ou humaniste (EB Garamond, Spectral) : né de la plume. Effet : livre, tradition, chaleur.
- Sérif de transition (Merriweather, PT Serif) : plus ordonné, axe droit. Effet : sérieux, institution, presse.
- Sérif moderne ou didone (Playfair Display, Bodoni Moda) : très fort contraste des traits. Effet : mode, luxe ; fragile en petit corps.
- Égyptienne (Roboto Slab, Josefin Slab) : empattements épais, squelette proche d'une linéale. Effet : solide, franc, atelier.
- Linéale géométrique (DM Sans, Poppins, Raleway) : cercles et droites ; ses formes répétées la rendent « moins idéale pour le texte courant » (lu) [S5]. Effet : moderne, net, aimable.
- Grotesque (Work Sans, Space Grotesk) : la première linéale, puis sa version raffinée. Effet : neutre, utilitaire, actuel.
- Linéale humaniste (Cabin, Merriweather Sans) : garde le geste de la main. Effet : proche, lisible.
- Mono (IBM Plex Mono, Space Mono) : chasse fixe, héritée de la machine à écrire. Effet : technique, brut, sincère.
- Manuscrite : effet personnel, festif ; quelques mots seulement.
- Titrage : dessinée pour les grands corps uniquement (lu) [S5].

### Régler

- Texte courant : 15 à 25 px, interligne 120 à 145 %, ligne de 45 à 90 signes (lu) [S15]. Google Fonts : interligne de 115 à 150 %, plus ouvert quand la ligne s'allonge (130 % sur téléphone, 150 % sur grand écran) ; 90 à 100 % pour un titre de 72 px (lu) [S6]. NN/g donne plus petit (texte 14-16 px, titres jusqu'à 32) et trois tailles au plus (lu) [S35, S36] ; 16 à 18 px est un compromis (métier).
- Longueur de ligne : 45 à 75 signes, 66 « idéal », 40 à 50 en colonnes ; écrire max-inline-size: 66ch (lu) [S7, S13].
- Capitales : moins d'une ligne, avec 5 à 12 % d'interlettrage en plus (lu) [S15]. Très grands titres : interlettrage légèrement négatif ; très petits textes : positif (lu) [S8].
- Gras et italique le moins possible, jamais ensemble ; texte centré avec parcimonie (lu) [S15].
- Accessibilité : la page ne doit rien perdre quand le lecteur impose un interligne de 1,5 et un interlettrage de 0,12 fois le corps (lu) [S20].
- Échelles : un corps de base et un rapport qu'on multiplie et divise ; le nombre d'or 1,618 en est un (lu) [S17]. L'échelle classique double tous les cinq crans ; sur le web, les titres font en moyenne deux fois le texte (lu) [S18]. Rapports courants : 1,2 ; 1,25 ; 1,333 ; 1,5 ; petit rapport pour un site dense, grand pour un site d'affiche (métier).
- Typographie fluide : clamp(1rem, 0.75rem + 1.5vw, 2rem) ; jamais vw seul, sinon le lecteur ne peut plus agrandir le texte (lu) [S13]. À réserver aux grands titres, en vérifiant le zoom à 200 % (lu) [S19].
- Polices variables : un fichier, des axes (graisse, largeur, inclinaison, italique, taille optique) (lu) [S14]. Régulier et gras : 27 ko en fichiers fixes, 17 ko en variable dans l'essai de Google (lu) [S10] ; pour un seul style, le variable peut peser plus (lu) [S14].
- Vitesse : format WOFF2 seul ; déclarations de polices dans l'en-tête ; préconnexion ; préchargement des seules polices capitales ; font-display: swap pour la marque, optional pour le texte ; sous-ensembles de caractères ; size-adjust contre les sauts de page (lu) [S12].

### Répertoire : 48 couples de polices libres

Les 84 polices citées ont été vérifiées une à une dans la liste officielle de Google Fonts téléchargée le 13 novembre 2026 ; 54 y existent en version variable (lu) [S11]. Ambiances et marques : (métier).

**Sérif en titres, linéale en texte**

1. Playfair Display + Source Sans 3 : magazine élégant ; mode, beauté.
2. Fraunces + Figtree : sérif tendre et rétro ; épicerie fine, marque artisanale.
3. Cormorant Garamond + Proza Libre : finesse, délicatesse ; bijoux, parfum, vin.
4. DM Serif Display + DM Sans : chic aimable, même fonderie ; cosmétique, art de vivre.
5. Libre Baskerville + Libre Franklin : classique américain ; cabinet, maison ancienne.
6. Bodoni Moda + Jost : haute couture ; luxe, coiffure haut de gamme.
7. Instrument Serif + Instrument Sans : édition contemporaine ; studio, marque haut de gamme.
8. Gloock + Albert Sans : contraste fort, affiche de presse ; salon, magazine.
9. Marcellus + Mulish : capitale romaine apaisée ; spa, hôtel.
10. Prata + Manrope : didone douce ; soin, institut.
11. Yeseva One + Josefin Sans : rondeur rétro féminine ; fleuriste, pâtisserie.
12. Young Serif + Nunito Sans : sérif rond et gourmand ; boulangerie, café.
13. Newsreader + Public Sans : journal sérieux ; conseil, média.
14. Spectral + Work Sans : lecture raffinée ; bien-être, édition.
15. Abril Fatface + Lato : titre gras de magazine ; restaurant, événement.
16. Calistoga + Karla : enseigne chaleureuse ; cave, cuisine de rue.

**Linéale en titres, sérif en texte**

17. Montserrat + Lora : ville moderne, texte littéraire ; accompagnement, journal de marque.
18. Oswald + Source Serif 4 : titres serrés de presse ; sport, actualité.
19. Raleway + Merriweather : géométrie fine et texte robuste ; architecte.
20. League Spartan + Libre Baskerville : géométrie ferme, fond classique ; école, institution.
21. Josefin Sans + Cardo : années 1920 et érudition ; antiquaire, galerie.
22. Hanken Grotesk + Crimson Pro : neutre et lettré ; cabinet, formation.
23. Bricolage Grotesque + Literata : grotesque expressive ; agence, marque alimentaire joyeuse.

**Superfamilles et fonderies**

24. IBM Plex Serif + IBM Plex Sans : ingénieur, rationnel ; électricien, industrie.
25. Merriweather + Merriweather Sans : robuste et lisible ; santé, services de proximité.
26. Alegreya + Alegreya Sans : calligraphique, littéraire ; librairie, thérapeute.
27. Roboto Slab + Roboto : mécanique aimable ; artisan, outillage.
28. PT Serif + PT Sans : sobre, administratif ; comptable, service public.
29. Noto Serif + Noto Sans : neutre, toutes langues ; site multilingue.
30. Libre Caslon Display + Libre Caslon Text : patrimoine ; notaire, domaine viticole.
31. Red Hat Display + Red Hat Text : technologie amicale ; logiciel, services.
32. Archivo Black + Archivo : affirmé, compact ; bâtiment, sport.
33. Barlow Condensed + Barlow : signalétique routière ; garage, plâtrier.
34. Josefin Slab + Josefin Sans : rétro géométrique ; boutique de créateurs, décoration.
35. Grenze Gotisch + Grenze : gothique assumé ; brasserie, tatoueur.

**Impact et affiche**

36. Bebas Neue + Karla : capitales d'affiche ; mode urbaine, salle de sport.
37. Anton + Roboto : cri d'affiche ; promotion, sport.
38. Unbounded + Hanken Grotesk : large et ronde ; néon, culture numérique.
39. Syne + DM Sans : étrangeté d'atelier d'art ; galerie, studio.
40. Big Shoulders + Public Sans : industriel ; atelier, chantier.
41. Alfa Slab One + Source Sans 3 : western, enseigne ; grill, barbier.
42. Poiret One + Didact Gothic : art déco léger ; hôtel, bar à cocktails.

**Rondeur et jeu**

43. Baloo 2 + Nunito : joueur, moelleux ; enfants, animaux, confiserie.
44. Fredoka + Nunito : bulle tendre ; jouets, gommes aux fruits.

**Technique**

45. Space Grotesk + Space Mono : technique décalée ; son, jeu vidéo.
46. JetBrains Mono + Inter : code ; logiciel.

**Main et lisibilité**

47. Amatic SC + Josefin Sans : capitales tracées à la main ; marché bio, café.
48. Lexend + Atkinson Hyperlegible : lisibilité maximale ; santé, seniors.

Mises en garde : les modèles convergent vers Inter et Space Grotesk ; à prendre par choix, jamais par défaut (lu) [S60]. Une police à graisse unique (Didact Gothic) ne donne pas de gras.

## Couleur

### Bâtir la palette

- Rôles : couleur principale, secondaire, tertiaire, erreur, chacune avec son « conteneur » ; neutres : fond, surface (plusieurs niveaux), contour ; chaque rôle a sa couleur de contenu (« sur… ») au contraste garanti (lu) [S34].
- Trois groupes : gris (8 à 10 nuances, du gris très sombre, pas le noir pur, au presque blanc), principale (5 à 10 nuances), accents rares. Nuances fixées d'avance, de 100 à 900 ; la base est la couleur d'un bouton, la plus sombre sert au texte, la plus claire aux fonds teintés ; pas de calcul « plus clair, plus sombre » à la volée (lu) [S29].
- Proportions : environ 60 % de dominante, 30 % de secondaire, 10 % d'accent ; dominante et secondaire plutôt neutres, l'accent pour l'action principale ; une couleur garde un seul sens partout (lu) [S30, S25].
- Dessiner d'abord en noir et blanc, colorer ensuite ; teinter les gris au lieu de gris plats (lu) [S22].
- Teintes dérivées : plus sombre = moins de luminosité, plus de saturation, teinte glissant vers rouge, vert ou bleu ; plus clair = l'inverse, vers jaune, cyan ou magenta (lu) [S23].
- Hiérarchie : c'est le contraste avec l'entourage qui hiérarchise, pas la couleur ; « si tout contraste, rien ne ressort » (lu) [S36].

### Contraste et daltonisme

- Texte : 4,5 pour 1 ; grand texte (24 px, ou 18,5 px gras) : 3 pour 1 ; contours de champs, pictogrammes utiles, états : 3 pour 1 ; pas d'arrondi ; logos et éléments inactifs exemptés (lu) [S26, S27]. Apple vise 7 pour 1 pour les petits textes (lu) [S25].
- La couleur n'est jamais le seul signal : un lien dans un texte porte un second indice (lu) [S28].
- Daltonisme : environ 1 homme sur 12 et 1 femme sur 200, surtout rouge-vert (lu) [S33]. Éviter le rouge sur noir (lu) [S26].
- Baisser le contraste pour « alléger » nuit à la lecture, à la découverte des éléments et à la confiance ; réduire plutôt la quantité de contenu (lu) [S62].

### Fonds clairs, fonds sombres, dégradés, texte sur image

- Vue normale : le fond clair donne le plus souvent de meilleures performances de lecture ; le sombre se propose en option, pas par défaut pour un public large (lu) [S31].
- Sombre : pas de blanc pur pour le texte ; ne pas inverser les photos, les adoucir ; la palette sombre n'est pas l'inverse de la claire (lu) [S32, S25].
- Dégradés : entre deux teintes éloignées, le milieu tourne au gris ; calculer dans un espace perceptuel (LCH, OKLCH) et contrôler en niveaux de gris l'absence de bandes (lu) [S24].
- Texte sur image, cinq méthodes : voile sombre sur toute l'image, texte dans une boîte, flou derrière le texte, fondu vers le bas, halo local (lu) [S22].

### Couleurs et secteurs : établi ou idée reçue ?

- Établi : des associations couleur-émotion largement partagées (4 598 personnes, 30 pays, similarité moyenne de 0,88), modulées par la langue et la géographie (résumé) [S64].
- Établi : teinte, saturation et clarté modifient la personnalité perçue d'une marque (rouge et excitation, bleu et compétence) (résumé) [S64]. Une couleur est jugée plus juste quand elle s'accorde à la nature du produit, utilitaire ou plaisir (résumé) [S64].
- Prudence : la revue de référence juge la recherche encore jeune, trop pour des recommandations fermes (résumé) [S64]. NN/g : aucun effet émotionnel universel démontré, le sens varie selon les cultures, il faut tester (lu) [S30].
- Idée reçue : « 62 à 90 % du jugement repose sur la couleur ». Le chiffre vient d'un article qui reconnaît lui-même des expériences non scientifiques, et il est souvent déformé en « décision d'achat » (résumé) [S64].
- Donc ni « le bleu rassure toujours » ni « le vert obligatoire pour le bio » : on choisit selon l'accord au produit, l'écart avec les concurrents et le contraste (métier).

### Répertoire : 33 schémas de couleurs

Propositions (métier). Chaque couple réel de couleurs doit passer le contrôle de contraste.

1. Crème et vert bouteille, accent orange brûlé : épicerie fine, thé, soin naturel.
2. Blanc cassé et noir d'encre, accent vermillon : mode, galerie, édition.
3. Sable et terre cuite, accent bleu canard : décoration, céramique.
4. Ivoire et bordeaux, accent or mat : vin, chocolat, maison de tradition.
5. Blanc et bleu nuit, accent jaune citron : conseil, électricien moderne.
6. Gris perle et anthracite, accent orange vif : outillage, bâtiment.
7. Rose poudré et prune, accent cuivre : beauté, coiffure.
8. Lin et olive, accent moutarde : bio, herboristerie, cuisine du marché.
9. Bleu ciel pâle et marine, accent corail : bord de mer, enfant.
10. Charbon et craie, accent vert acide : mode urbaine, sport, son.
11. Nuit profonde et violet électrique, accent rose néon : jeu, soirée (attention au cliché du dégradé violet).
12. Vert sauge et crème, accent brun cuir : sophrologie, yoga.
13. Jaune beurre et chocolat, accent rouge cerise : boulangerie, confiserie.
14. Blanc chaud et rouge tomate, accent vert basilic : restaurant, traiteur.
15. Bleu pétrole et sable, accent laiton : hôtel, immobilier haut de gamme.
16. Gris béton et noir, accent jaune de chantier : plâtrier, maçon, industrie.
17. Lavande pâle et indigo, accent menthe : sommeil, parfum d'intérieur.
18. Pêche et corail, accent turquoise : boissons fruitées, glaces.
19. Fraise et crème, accent vert feuille : fruits, gommes, confitures.
20. Noir profond et or pâle : joaillerie, horlogerie, spiritueux.
21. Blanc optique et gris froid, accent bleu électrique : électronique, logiciel.
22. Kraft et noir, accent rouge tampon : torréfacteur, brasserie artisanale.
23. Vert forêt et écru, accent rouille : plein air, bois, randonnée.
24. Bleu glacier et blanc, accent argent : eau, froid, dentaire.
25. Terre d'ombre et ocre, accent turquoise délavé : voyage, artisanat du monde.
26. Menthe et blanc, accent marine : pharmacie, propreté.
27. Brique et crème, accent noir : barbier, atelier, moto.
28. Bleu outremer et blanc, accent orange vif : studio créatif, mobilier.
29. Aubergine et rose thé, accent or : pâtisserie fine, fleuriste, mariage.
30. Gris tourterelle et blanc cassé, accent vert d'eau : architecte, peintre décorateur.
31. Caramel et crème, accent bleu marine : maroquinerie, café.
32. Noir mat et blanc, une seule couleur vive de marque : objet unique, produit vedette.
33. Émeraude et noir, accent crème : bar à cocktails, cosmétique de nuit.

## Ce que SINA doit en tirer

1. **Deux polices au plus :** une pour les titres, qui porte la personnalité, une pour le texte, choisie pour sa lisibilité. Chacune garde son rôle sur tout le site.
2. **Le couple se choisit d'après les adjectifs de la marque et sa planche,** jamais par habitude. Les polices vers lesquelles les machines reviennent toujours ne se prennent que par choix.
3. **Texte courant de 16 à 18 px,** interligne de 1,3 à 1,5, lignes de 45 à 75 signes ; des capitales sur moins d'une ligne.
4. **Une échelle de tailles fixée d'avance,** et trois tailles au plus dans un même écran.
5. **Une palette par rôles :** fond, surface, texte, accent, bordure ; environ 60 % de dominante, 30 % de secondaire, 10 % d'accent. L'accent va à l'action principale, et une couleur garde un seul sens.
6. **Des nuances fixées d'avance,** des gris teintés, ni noir pur ni blanc pur pour le texte.
7. **Un contraste de 4,5 pour 1 vérifié sur chaque couple réel,** et la couleur n'est jamais le seul signal.
8. **Aucune règle du genre « le bleu rassure » :** la couleur se choisit selon l'accord au produit, l'écart avec les concurrents et le contraste.
9. **Le couple de polices et le schéma de couleurs sont écrits dans la carte d'identité du thème,** pour ne jamais livrer deux fois le même.

## Sources

- S1 Google Fonts Knowledge (S1 à S10), « Pairing typefaces » : https://fonts.google.com/knowledge/choosing_type/pairing_typefaces
- S2 « Emotive considerations for choosing typefaces » : https://fonts.google.com/knowledge/choosing_type/emotive_considerations_for_choosing_typefaces
- S3 « A checklist for choosing type » : https://fonts.google.com/knowledge/choosing_type/a_checklist_for_choosing_type
- S4 « Making sense of typographic classifications » : https://fonts.google.com/knowledge/introducing_type/making_sense_of_typographic_classifications
- S5 Glossaire : https://fonts.google.com/knowledge/glossary
- S6 « Choosing a suitable line height » : https://fonts.google.com/knowledge/using_type/choosing_a_suitable_line_height
- S7 « Understanding measure (line length) » : https://fonts.google.com/knowledge/using_type/understanding_measure_line_length
- S8 « Track carefully or not at all » : https://fonts.google.com/knowledge/using_type/track_carefully_or_not_at_all
- S9 « Pairing typefaces within a family & superfamily » et « … using the font matrix » : https://fonts.google.com/knowledge/choosing_type
- S10 « Web font comparisons: variable vs static » : https://fonts.google.com/knowledge/using_variable_fonts_on_the_web
- S11 Google Fonts, liste officielle des familles (1 961) : https://fonts.google.com/metadata/fonts
- S12 web.dev, « Best practices for fonts » : https://web.dev/articles/font-best-practices
- S13 web.dev, « Typography » : https://web.dev/learn/design/typography
- S14 web.dev, « Introduction to variable fonts on the web » : https://web.dev/articles/variable-fonts
- S15 M. Butterick, « Summary of key rules » : https://practicaltypography.com/summary-of-key-rules.html
- S16 M. Butterick, « Mixing fonts » : https://practicaltypography.com/mixing-fonts.html
- S17 T. Brown, « More Meaningful Typography » : https://alistapart.com/article/more-meaningful-typography/
- S18 S. Mortensen, « The typographic scale » : https://spencermortensen.com/articles/typographic-scale/
- S19 Smashing Magazine, « Modern Fluid Typography Using CSS Clamp » : https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/
- S20 W3C, « Understanding 1.4.12 Text Spacing » : https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
- S21 E. Kennedy, guide des couples de polices : https://www.learnui.design/blog/guide-pairing-fonts.html
- S22 E. Kennedy, « 7 Rules for Creating Gorgeous UI » : https://www.learnui.design/blog/7-rules-for-creating-gorgeous-ui-part-1.html et https://www.learnui.design/blog/7-rules-for-creating-gorgeous-ui-part-2.html
- S23 E. Kennedy, « Color in UI Design: A (Practical) Framework » : https://www.learnui.design/blog/color-in-ui-design-a-practical-framework.html
- S24 E. Kennedy, outil de dégradés : https://www.learnui.design/tools/gradient-generator.html
- S25 Apple, Human Interface Guidelines (Typography, Color, Dark Mode, Layout, Motion) : https://developer.apple.com/design/human-interface-guidelines/
- S26 W3C, « Understanding 1.4.3 Contrast (Minimum) » : https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- S27 W3C, « Understanding 1.4.11 Non-text Contrast » : https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- S28 W3C, « Understanding 1.4.1 Use of Color » : https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- S29 Refactoring UI, « Building Your Color Palette » : https://www.refactoringui.com/previews/building-your-color-palette
- S30 NN/g, article sur la couleur : https://www.nngroup.com/articles/color-enhance-design/
- S31 NN/g, article sur le mode sombre : https://www.nngroup.com/articles/dark-mode/
- S32 web.dev, « prefers-color-scheme » : https://web.dev/articles/prefers-color-scheme
- S33 Colour Blind Awareness : https://www.colourblindawareness.org/colour-blindness/
- S34 Material Web, documentation des thèmes (dépôt public) : https://github.com/material-components/material-web/tree/main/docs/theming
- S35 NN/g, cinq principes du design visuel : https://www.nngroup.com/articles/principles-visual-design/
- S36 NN/g, hiérarchie visuelle : https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- S37 NN/g, grilles : https://www.nngroup.com/articles/using-grids-in-interface-designs/
- S38 Smashing Magazine, « Building Better UI Designs With Layout Grids » : https://www.smashingmagazine.com/2017/12/building-better-ui-designs-layout-grids/
- S39 NN/g, principe de proximité : https://www.nngroup.com/articles/gestalt-proximity/
- S40 NN/g, lecture en F : https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- S41 web.dev, « Macro layouts » : https://web.dev/learn/design/macro-layouts ; « Ten modern layouts in one line of CSS » : https://web.dev/articles/one-line-layouts
- S42 Every Layout : https://every-layout.dev/layouts/
- S43 Android Developers, classes de taille de fenêtre : https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes
- S44 Shopify, thème Dawn, dossier des sections : https://github.com/Shopify/dawn/tree/main/sections
- S45 Baymard Institute, carrousels de page d'accueil : https://baymard.com/blog/homepage-carousel
- S46 NN/g, carrousels automatiques : https://www.nngroup.com/articles/auto-forwarding/
- S47 NN/g, durée des animations : https://www.nngroup.com/articles/animation-duration/
- S48 NN/g, rôle de l'animation : https://www.nngroup.com/articles/animation-purpose-ux/
- S49 Material Components pour Android, « Motion » : https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md
- S50 web.dev, guide des animations performantes : https://web.dev/articles/animations-guide
- S51 web.dev, « prefers-reduced-motion » : https://web.dev/articles/prefers-reduced-motion
- S52 W3C, « Understanding 2.3.3 Animation from Interactions » : https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html ; « 2.2.2 Pause, Stop, Hide » : https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- S53 NN/g, « Scrolljacking 101 » : https://www.nngroup.com/articles/scrolljacking-101/
- S54 web.dev, « Cumulative Layout Shift » : https://web.dev/articles/cls
- S55 web.dev, « Interaction » : https://web.dev/learn/design/interaction
- S56 Chrome for Developers, transitions de vue : https://developer.chrome.com/docs/web-platform/view-transitions
- S57 NN/g, « Design Systems 101 » : https://www.nngroup.com/articles/design-systems-101/
- S58 Design Tokens Community Group, format : https://www.designtokens.org/tr/drafts/format/
- S59 B. Frost, « Atomic Design », chapitre 2 : https://atomicdesign.bradfrost.com/chapter-2/
- S60 Anthropic, « Improving frontend design through Skills » : https://claude.com/blog/improving-frontend-design-through-skills
- S61 925 Studios (blog d'agence) : https://www.925studios.co/blog/ai-slop-design-tells
- S62 NN/g, texte peu contrasté : https://www.nngroup.com/articles/low-contrast/
- S63 NN/g, pictogrammes : https://www.nngroup.com/articles/icon-usability/
- S64 Études, résumés seulement : Jonauskaite et al. 2020, https://infoscience.epfl.ch/record/280269 ; Elliot et Maier 2014, https://pubmed.ncbi.nlm.nih.gov/23808916/ ; Labrecque et Milne 2012, https://link.springer.com/article/10.1007/s11747-010-0245-y ; Bottomley et Doyle 2006, https://orca.cardiff.ac.uk/id/eprint/2579/ ; Singh 2006, https://emerald.com/insight/content/doi/10.1108/00251740610673332
- S65 Livres, résumés seulement : J. Müller-Brockmann, « Grid Systems in Graphic Design », https://neugraphic.com/muller-brockmann/muller-brockmann-text2.html ; R. Williams, « The Non-Designer's Design Book », https://www.pearson.com/en-us/subject-catalog/p/non-designer-s-design-book-the/P200000000691/9780133966343

**Limites.**

- Sites Material Design (m3.material.io, m2.material.io) : illisibles par l'outil. Remplacés par les dépôts publics de Material [S34, S49]. Non vérifiés : la surface sombre « #121212 », l'échelle typographique chiffrée, la grille de 8.
- fonts.google.com/knowledge : pages illisibles par l'outil ; textes lus dans le dépôt public de Google Fonts (dossier cc-by-sa/knowledge), source de ces pages.
- Refactoring UI, « 7 Practical Tips for Cheating at Design » : accès refusé (403). Aucune règle n'en est tirée.
- Ellen Lupton, thinkingwithtype.com : erreur 503. Les livres de Müller-Brockmann et de Robin Williams n'ont pas été ouverts.
- Études sur la couleur [S64] : résumés seulement (page PubMed et page Springer refusées).
- Apple : pages lues par leur fichier de données, pas par la page affichée.
- Répertoires : seule l'existence des polices est vérifiée ; ambiances, schémas et noms de mises en page sont des jugements de métier. Non contrôlés : le contraste réel de chaque schéma, les accents français de chaque police de titrage.
- Rapports d'échelle 1,2 à 1,5 : usage courant, non lu sur une page.
- Fichier de travail (liste Google Fonts du 13 novembre 2026, réutilisable pour contrôler d'autres polices) : /tmp/claude-0/-home-user-Ecom-studio-ia/a74cb0c8-9c9e-5ed3-90ff-d568f0a532b4/scratchpad/gf/metadata.json
