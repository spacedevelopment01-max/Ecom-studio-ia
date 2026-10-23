# Réutilisations et variantes

Les 59 photographies sont recréées en haute définition à partir des scènes des six planches. Elles ne sont pas les fichiers photographiques sources : des détails peuvent différer. Les petites extractions utilisées comme références ne sont pas livrées.

- Les planches 01 et 05 partagent les scènes prestations et fiche. La 05 corrigée fait autorité pour la mise en page et les données.
- Les trois fichiers longueur-courte, longueur-mi-longue, longueur-longue reproduisent la variante photographique de la planche 01. La version principale 05 conserve ses trois illustrations de cheveux à redessiner en SVG.
- Les versions mobiles réemploient les photos de leurs sections desktop avec cadrages adaptés. Ne pas inventer une seconde photographie pour chaque écran mobile.
- Les récapitulatifs de réservation réemploient reservation-recapitulatif et reservation-miniature selon la scène représentée. Conserver les photos distinctes des pages retrouver, mon rendez-vous et déplacer.
- Les surfaces de pierre du journal et des inspirations peuvent utiliser texture-travertin.
- Le logo, les initiales des professionnels, icônes, étoiles, lignes, flèches et illustrations sont à reconstruire en texte/SVG/CSS. Aucun de ces éléments ne doit être gravé dans les photos.
- Le plan de contact est illustratif : conserver un rendu vectoriel sans inventer une adresse réelle.

MEDIAS.csv et MEDIAS.json associent chaque photo à sa planche et son rectangle de référence [gauche, haut, droite, bas] en pixels de la planche originale. Ces coordonnées servent à retrouver la scène, pas à recadrer le JPEG livré.
