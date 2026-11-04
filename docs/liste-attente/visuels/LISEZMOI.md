# Visuels de la page « Liste d'attente » (#420)

Quatre visuels qui remplacent les anciennes images de la galerie (thèmes, chat, photo, formats). Ce sont de **vraies
captures du Studio**, recadrées et mises en page. Seul un fond neutre est ajouté, sans aucun texte. Format 2000 × 1250 px
(16:10), en WebP et en JPG.

| Fichier | Ce qu'il montre |
|---|---|
| `1-boutique-ordinateur-mobile` | Espace Boutique du Studio avec l'aperçu ordinateur de la boutique, et la même boutique sur téléphone (390 px) |
| `2-syna-demande-et-resultat` | Demande faite à SYNA, « Change le titre par « Offrez ce moment. » », sur la section désignée dans l'aperçu ; carte « Gratuit — 0 € » avec l'avant / après ; résultat visible dans l'aperçu (version 2) |
| `3-identite-logo-palette-visuels` | Espace Marque (logo et déclinaisons, palette de cinq couleurs) et Banque d'images du projet |
| `4-creations-marketing-calendrier` | Calendrier des publications avec visuels et liste « À valider » (Instagram et Facebook) |

## Version et environnement des captures

- **Studio : commit `9f8507c7`**, branche `claude/syna-301-complet` (PR #369, CI verte le 4 novembre 2026). C'est la
  version la plus récente, mais **pas encore fusionnée dans `main`**.
- Studio lancé en local (`next dev`) le 4 novembre 2026, base temporaire, aucune clé, réseau extérieur coupé, aucun
  appel IA.
- Projet de démonstration **HEUREN** (montre bleu nuit), avec des données fictives et les médias déjà suivis dans
  `public/theme-assets/heuren/` : aucune nouvelle image générée.
- Compte fictif. Aucun identifiant, secret ni donnée client n'apparaît à l'écran.

## Fonctions encore en test (à signaler si la page les présente)

- **SYNA (visuel 2)** : retouche gratuite d'un titre par une phrase. Elle fonctionne sur la version capturée, mais elle
  n'est pas encore en production : PR #369 non fusionnée, réglages de SYNA fermés par défaut.
- **Publications (visuel 4)** : les quatre publications sont des brouillons « En attente de validation ». Rien n'est
  publié sur les réseaux.
- Le reste (boutique, marque, banque d'images) existe déjà dans `main`.

Formulaire, lien de la page et remises affichées (−20 % chaque mois pendant 12 mois en mensuel, −30 % en annuel) : à
conserver tels quels lors de l'intégration.
