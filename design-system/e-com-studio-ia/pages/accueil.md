# Accueil — règles propres à la page (priment sur MASTER.md)

> **PROJECT:** E-COM STUDIO IA — page publique `/` (`src/app/page.tsx`, `src/components/home/*`).
> Créé par UI UX Pro Max (`--persist --page accueil`), puis complété à partir des recherches `landing`, `ux` et `gsap`
> du skill (voir le rapport `reports/homepage-premium-v2.md`).

## Mise en page

- **Largeur :** `max-w-7xl`, plusieurs colonnes. La proposition générique du skill (« 800 px, une seule colonne »)
  n'est pas adaptée à une page de présentation riche en démonstrations.
- **Ordre des sections** (motif *Feature-Rich Showcase*, plus *Scroll-Triggered Storytelling* pour le parcours) :
  1. Hero (vidéo d'entrée d'origine) ;
  2. Comment ça fonctionne ;
  3. Parcours des 7 modules ;
  4. Création de marque ;
  5. Création de boutique, puis les 11 directions ;
  6. Images et publicités ;
  7. Vidéo et UGC ;
  8. SEO ;
  9. Réseaux sociaux ;
  10. Tout est connecté ;
  11. Personnalisation ;
  12. Plateformes ;
  13. Démonstrations ;
  14. Rangement et engagements ;
  15. Tarifs ;
  16. FAQ ;
  17. Appel final.
- Alternance de fonds `--paper` et `--paper-2` pour séparer les sections. Une seule bande sombre fixe (Vidéo et UGC),
  identique dans les deux thèmes.

## Hero (`video-first-hero`)

- La vidéo d'entrée d'origine (`/explainers/film-court.mp4`) n'est **jamais remplacée**.
- Lecture silencieuse quand elle est visible, pause hors écran, bouton pause visible, « Avec le son ».
- Image et lien de secours si elle ne charge pas.
- Le texte et la vidéo apparaissent **par animation CSS au chargement**, sans attendre JavaScript.
- Inclinaison au défilement :
  - légère (environ 12° au maximum, −8° en sortie) ;
  - uniquement sur un **conteneur distinct** de celui qui porte l'animation d'arrivée ;
  - désactivée si l'utilisateur demande moins de mouvement.

## Parcours des 7 modules (`scroll-triggered-storytelling`)

- Défilement natif, jamais bloqué. Ordinateur : fenêtre fixe (`sticky`). Téléphone : rail collé, aperçu sous chaque
  texte, pastilles de 44 px.
- Changement de panneau : entrée de 500 ms (ease-out), sortie de 300 ms (ease-in), `transform` et `opacity` seulement.
- Barre de progression, compréhensible sans aucun effet. Mouvement réduit : tout est affiché tel quel.

## Démonstrations

- Elles portent toutes la mention « démonstration », ne sont enregistrées nulle part et n'utilisent aucune IA.
- Animations automatiques (« Comment ça fonctionne », « Tout est connecté », vidéos 9:16) :
  - **bouton pause** visible ;
  - **arrêt au focus clavier** (le survol ne bloque plus la rotation, pour ne pas la figer sous le pointeur) ;
  - arrêt en mouvement réduit.
- Onglets accessibles : flèches gauche / droite, Début / Fin, `aria-selected`.
- Déplacements (logo de l'éditeur de publicité) par `transform` uniquement.

## Thème clair / sombre

- Bascule soleil / lune dans l'en-tête et le menu du téléphone, choix mémorisé (`ecs-theme`), thème du système par défaut.
- Aucun flash : le thème est posé dans `<head>` avant l'affichage.
- Fondu : **un seul voile** (`div` fixe à la couleur de l'ancien fond) qui apparaît en 140 ms, le thème change dessous,
  puis le voile s'efface en 260 ms. Seule l'opacité de ce voile est animée ; aucune transition CSS n'est posée sur les
  éléments de la page. Choisi après mesure (les View Transitions étaient plus lentes sans carte graphique).
  En mouvement réduit, le changement est immédiat.

## Interdits propres à la page

- Effets décoratifs sans rapport avec ce qu'ils démontrent (`motion-meaning`).
- Promesses non tenues : les connexions jamais essayées en réel restent marquées « Bêta ».
