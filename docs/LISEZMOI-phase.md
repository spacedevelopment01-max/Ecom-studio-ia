# PHASE — Électricité (thème de la famille Services)

Reproduction des dix planches de Thomas (`docs/theme-briefs/phase/`, PR #188) : 18 pages à l'ordinateur (planches 01 à
05) et au téléphone (planches 06 à 10), avec le menu mobile, les formulaires et leurs états, les filtres, les questions
et les préférences de cookies.

## Où sont les choses

| Élément | Fichier |
| --- | --- |
| Thème du catalogue (pages, en-tête, pied, pages d'un client) | `src/lib/theme/phase.ts` |
| Sections | `theme-base/sections/ph-*.liquid` (22 sections, toutes dans la bibliothèque « Services » du studio) |
| Pictogrammes, logo, titres, traits de circuit | `theme-base/snippets/ph-icon.liquid`, `ph-logo.liquid`, `ph-title.liquid`, `ph-art.liquid` |
| Styles | `theme-base/assets/phase.css` (règles communes, puis ordinateur ≥ 1080 px, puis téléphone < 1080 px) |
| Polices | `theme-base/assets/phase-fonts.css` (Inter 800 et Montserrat 800, licence OFL : `assets/fonts/licenses/`) |
| Comportements | `theme-base/assets/phase.js` (menu, filtres, pagination, questions, formulaires, cookies, indicateur d'étapes) |
| Démonstration | `tests/phase-fixtures.ts` (photos du kit privé `public/demo/phase/images/`, hors dépôt) |
| Tests | `tests/phase-theme.test.ts` |

## Ce qui est modifiable dans le studio

Chaque texte, photo, cadrage, taille de titre, marge (ordinateur et téléphone), disposition (ordinateur et téléphone),
affichage « ordinateur seulement / téléphone seulement » des sections, cartes, étapes, questions et repères. Les textes
propres au téléphone (titres, textes, sur-titres, libellés de formulaire) sont des réglages distincts, facultatifs.
La disposition du pied de page au téléphone et l'échelle des mesures se règlent par page (section « Réglages de la page
PHASE »). Les catégories de filtre s'écrivent séparées par des virgules (une carte peut en avoir plusieurs).

## Fonctions

- **Formulaires** (contact, demande de devis) : erreurs près des champs et résumé avec liens, valeurs conservées,
  bouton occupé pendant l'envoi, un seul envoi à la fois, photos JPG / PNG / PDF (nombre et poids limités, nom, poids,
  retrait, fichier refusé signalé). En démonstration **rien n'est envoyé** : la page de confirmation reprend la saisie
  du visiteur gardée dans son navigateur, avec le statut « Démonstration — demande non envoyée ». Sur une vraie
  boutique, formulaire de contact de la plateforme (qui ne transmet pas de fichier : l'envoi est alors bloqué avec un
  message clair).
- **Téléphone** : indicateur « 1 Votre projet → 2 Vos coordonnées » qui suit la saisie ; tuiles « Type de projet » à
  pictogrammes ; questionnaire de dépannage (commune et symptômes repris dans la demande de devis, rien n'est envoyé
  depuis ce questionnaire).
- **Filtres** : réalisations (avec « Voir plus »), questions fréquentes, conseils (pagination réelle, 4 par page au
  téléphone), état vide, `?filtre=` dans l'adresse.
- **Questions** : accordéons natifs, la première question visible ouverte selon l'écran.
- **Cookies** : désactivés par défaut, bandeau, préférences enregistrées dans le navigateur et rouvrables.
- **Menu mobile** : panneau accessible (piège du focus, Échap, sous-menus).

## Vérifié

- `npx tsc --noEmit`, `npx vitest run`, Theme Check complet (`scripts/verify-theme.sh`) : voir le compte rendu de la PR.
- Aucun débordement horizontal à 360, 390, 430, 768 et 1440 px sur les 36 pages comparées.
- Comparaison de chaque page à sa planche, à la même largeur (1440 ou 390 px) : référence, rendu, superposition à 50 %
  et différence ×3 (images de travail, hors dépôt).

## Écarts connus (à reprendre si Thomas le demande)

- **Photos** : les maquettes ont été dessinées avec des photos qui ne sont pas toutes dans le kit ; les photos du kit
  les plus proches sont utilisées (cadrage ajusté), d'où des différences visibles dans les images de différence.
- **Ordinateur** : Contact, Demande de devis et Conseils sont plus courts que leur planche (environ 10 à 20 % de
  hauteur) ; les autres pages sont à quelques pour cent près.
- **Téléphone** : les planches 08 et 10 sont dessinées à une échelle un peu différente des autres ; les pages
  Réalisations, Projet et L'entreprise restent de 7 à 9 % plus hautes que leur planche.
- **Textes volontairement différents de la maquette** (honnêteté) : « Nous avons bien reçu votre demande » et « Un
  récapitulatif vous a été envoyé par e-mail » (faux en démonstration) sont remplacés par des textes exacts ; « Une
  solution rapide » (promesse de délai) devient « Une solution adaptée à chaque situation » ; « Notre réroulement »
  (faute de la maquette) est écrit « Notre déroulement » ; les délais et le suivi après travaux restent
  « [À compléter : …] ».
- **Non reproduit** : la mention « Aperçu du formulaire » sous le bouton de la planche 09 (annotation de maquette).
- Le pied de page affiche les cinq liens du menu sur toutes les pages (certaines planches téléphone n'en montrent que
  quatre).
