# Réutilisation des scènes et éléments non photographiques

`MEDIAS.csv` repère chacune des 61 scènes principales par son rectangle dans la planche originale (coordonnées en pixels : gauche, haut, droite, bas). Les photos HD portent exactement le nom indiqué dans ce fichier. Les rectangles ne définissent pas les dimensions des photos livrées.

| Occurrence supplémentaire | Média à réutiliser |
|---|---|
| Accueil téléphone | Les médias `accueil-*`, les trois plats, les quatre ingrédients et les catégories correspondantes de l'accueil ordinateur |
| Carte : poisson, risotto | `poisson-roti.jpg`, `risotto-champignons.jpg` |
| Carte téléphone | Les mêmes médias que la carte ordinateur, avec cadrage adapté |
| Sélection Au fil des saisons | `carte-veloute.jpg`, `risotto-champignons.jpg`, `volaille-grenailles.jpg` |
| Réservation téléphone : choix date | `reservation-etape-1.jpg` |
| Réservation téléphone : coordonnées/récapitulatif | `reservation-etape-3.jpg` et `reservation-detail-3.jpg` selon l'emplacement |
| Adaptations mobiles des pages de la planche 04/05 | Les mêmes médias que la page ordinateur correspondante |

Les autres scènes, même proches, ont leur propre fichier quand le cadrage ou les éléments du décor diffèrent. Les noms des plats servent au repérage éditorial ; les scènes reproduisent ce qui est visible sur les planches, qui comportent parfois des incohérences entre photo et libellé. Ne pas inventer un ingrédient garanti à partir d'une image.

Les titres, prix, boutons, onglets, cœurs/icônes, calendriers, formulaire, logo TABLE SAISON et ornements botaniques doivent être rendus en texte, composants ou SVG nets et éditables. Ils ne sont pas inclus comme captures photographiques. Le plan de contact doit venir de l'adresse configurée (ou être explicitement illustratif en démo).

Les photos ont été recréées par IA à partir des maquettes, sans texte d'interface. Leur définition native figure dans le manifeste ; aucun redimensionnement artificiel vers une prétendue 4K. Le ratio des bandeaux panoramiques peut produire une hauteur inférieure à 1024 px tout en conservant une largeur supérieure à 1900 px.
