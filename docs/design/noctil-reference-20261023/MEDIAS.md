# Médias NOCTIL — correspondance et provenance

## Priorités

| Fichier dans medias/ | Usage |
|---|---|
| projecteur-detoure.png | Chevauchement du hero et de la section crème ; véritable alpha, à conserver |
| hero-chambre.webp | Fond du hero accueil ; chambre d'enfant, sans personne, texte en HTML par-dessus |
| tipi.webp | Carte histoires, moments de calme, illustrations journal |
| peluches.webp | Carte moment partagé, rituel du soir, panier vide et scènes de chambre |
| bibliotheque.webp | Bandeau grandes aventures, arrière-plan éditorial et sections univers |
| chambre-rose.webp | Galerie différentes chambres, contenu inspiration |
| chambre-fusee.webp | Galerie différentes chambres, jeux d'imagination |
| journal-livres.webp | Hero journal et illustration article, pas un produit à vendre |
| aide-planete.webp | Fonds FAQ/livraison-retours et décor spatial |
| projecteur-chambre.webp | Guide/univers/compte, projecteur en situation dans chambre d'enfant |
| logo.webp | Logo original, alpha préservé ; vérifier le contraste sur fond sombre |
| produit-01.webp à produit-05.webp | Galerie produit, profil, lentille, socle, miniature panier |
| ambiance-01.webp à ambiance-10.webp | Kit historique, usage seulement si cohérent avec la référence et les chambres d'enfant |

Les 16 fichiers historiques sont copiés sans modification de `public/theme-assets/noctil/` au commit 861876809191b3f84060e133d70cbc642fa9c714. Ils ne constituent pas 16 nouvelles créations.

Les 10 nouveaux médias ont été générés avec l'outil imagegen intégré, d'après les maquettes et la vue originale produit-01. Ils complètent les planches ; ils n'en sont pas des extractions exactes. Le détourage a un alpha transparent vérifié. Les photos sont fournies en WebP qualité 94 sans recadrage ; les planches en JPEG qualité 96, sans sous-échantillonnage et à leur taille d'origine.

## Limites à traiter explicitement

- Les photos nouvelles conservent l'univers et la composition générale, mais pas tous les objets/pixels des maquettes.
- `projecteur-chambre.webp` montre une orientation différente et un marquage de base peu visible ; ne pas l'utiliser comme preuve des détails physiques. Le détourage et les vues originales sont prioritaires pour le produit.
- Aucun fichier séparé de boîte/notice exact n'est livré. Les petites vignettes packaging de la planche aide restent des références, pas une preuve d'emballage réellement fourni. Signaler ce manque, conserver la composition et ne pas inventer de contenu de boîte ou de notice téléchargeable.
- Les illustrations planète de panier vide et étoile de 404 peuvent être réalisées en SVG/CSS éditables d'après les formes visibles ; aucune nouvelle photo humaine ni banque d'images.
- Les scènes où le projecteur doit être à gauche peuvent être composées avec le détourage et un fond fourni plutôt que retourner une image avec logo ou remplacer le produit.
- Ne pas répéter un même cadrage dans plusieurs cartes voisines ; associer les nouveaux décors aux blocs appropriés. Les recadrages ne constituent pas des scènes nouvelles.

## Prompts des créations complémentaires

1. Détourage : extraire exactement produit-01 sur fond alpha, conserver forme, lentille, NOCTIL et bouton violet, produit entier et marge transparente.
2. Hero : reproduire le fond du haut de la planche accueil, chambre vide bleu nuit, lit à droite, galaxie violette au plafond, lampes chaudes, gauche dégagée, sans texte ni projecteur.
3. Tipi : reprendre la carte histoires, tipi crème, ours en peluche, livre ouvert, lanternes, galaxie, sans personne ni interface.
4. Peluches : reprendre la carte moment partagé, lapin et ours sur coussins bleu nuit/lavande, lampe ambre, galaxie, sans personne.
5. Bibliothèque : reprendre le bandeau grandes aventures, étagère à droite, livres, fusée et astronaute jouets, lune lumineuse, mur nuit dégagé à gauche.
6. Chambre rose : reprendre la carte chambre rose de la fiche produit, baldaquin, lapin, galaxie violette, lampes chaudes.
7. Chambre fusée : reprendre la carte chambre bleue de la fiche produit, grande fusée crème, lit nuit et galaxie.
8. Journal livres : reprendre la nature morte du journal/article, livres sans titres, globe galaxie, étoile lumineuse, jouet astronaute, gauche sombre.
9. Aide planète : reprendre les bandeaux FAQ/livraison, étoiles bleu nuit, planète lavande à droite, orbites dorées, gauche dégagée.
10. Projecteur chambre : reprendre guide/univers avec produit original sur table à droite, chambre d'enfant vide, ours, lampes, galaxie, sans texte/UI/personne.
