# Preuves du suivi #194 (corrections après la fusion globale)

Branche de preuves, **non destinée à être fusionnée**. Captures faites sur les démos statiques du studio (données de
démonstration fictives) ; les pages capturées ne contiennent aucune photo du kit privé.

## 1. FRAISE — article du journal et pages légales au téléphone (PR claude/fraise-mobile-articles-legal)

- `fraise/avant/`, `fraise/apres/` : captures pleine page, à 1440, 768, 430, 390 et 360 px, de l'article « Lire une
  étiquette simplement » et des mentions légales ; avant = `main` `333bccc8`, après = la branche de correction.
- `fraise/fr-cote-article.jpg`, `fraise/fr-cote-legal.jpg` : avant (à gauche) / après (à droite) à 390 px.
- `fraise/mesures-avant.json`, `fraise/mesures-apres-10-pages.json` : largeur utile du texte, taille du titre et du
  corps, largeur de défilement, éléments hors cadre (10 pages : 6 articles, 4 pages légales, aux 5 largeurs).
- `fraise/comparaison-pixels-avant-apres-52-captures.txt` : écart moyen par pixel, toutes les pages de la démo FRAISE à
  1440 et 390 px. Seules les 10 pages visées changent, et seulement à 390 px ; écart total 0 à 1440 px.

## 2. Onglet Site — menu « … » d'une section masquée (PR claude/section-masquee-menu)

Studio réel (`next dev`, base temporaire, démonstration Atelier Rive dont les médias sont déjà dans le dépôt, aucune IA,
aucun réseau), section « Réalisations » de l'accueil masquée. Script : `scripts/section-masquee-studio-check.ts` (clic
normal jamais forcé, élément sous le pointeur contrôlé, ordre relu en base).

- `menu-section-masquee/avant/` (`main` `333bccc8`) : à l'ordinateur, sous le pointeur « Ajouter une section après
  « Prestations » » puis « Prestations » ; au téléphone, la barre « Espaces du projet » ; aucun clic n'aboutit, puis le
  menu ne se rouvre plus (`telephone-monter-menu-non-ouvert.png`). **ÉCHEC.**
- `menu-section-masquee/apres/` : « Descendre » puis « Monter » déplacent la section (position 2 → 3 → 2) à l'ordinateur
  et au téléphone ; témoin d'une section visible : 7/7 entrées accessibles aux deux largeurs ; aucune erreur
  JavaScript. **RÉUSSI.**
- `resultat.json` de chaque dossier : le détail par largeur et par action.

## 3. Onglet Catalogue — texte du stock (PR claude/stock-libelle-fidele)

- `stock-catalogue/avant/` : l'ancienne promesse « Un stock modifié par une vente ou dans la boutique n'est jamais
  écrasé ».
- `stock-catalogue/apres/` : phrase exacte et bloc « Garanties et limites du stock » (fermé puis ouvert) à 1440 et
  390 px ; aucun débordement horizontal, aucune erreur JavaScript (`resultat.json`, texte relevé compris).
