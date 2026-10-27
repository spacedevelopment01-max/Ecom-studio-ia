# Preuves #204 — SIMULATIONS uniquement

Code compilé contrôlé : `ec974a0e11279443b2fbdddde3de39b4c7f809af` ; production, source `compiled-build`, arbre propre lors du build. Aucun appel fournisseur réel, aucun débit. Les deux analyses réelles mentionnées dans la mission restent acquises ; cette base ne contient que des fixtures.

18 PNG natifs : pages complètes et vues de l’action. Ordinateur 1440 × 960 ; mobile 390 × 844, contexte tactile distinct. Les captures attendent le rendu des polices et deux images navigateur ; les transitions sont figées pendant la prise de vue uniquement. Aucun recadrage ordinateur présenté comme mobile.

[Contrôles navigateur](browser-proof.json) · [Recalcul fictif du devis](cost-proof.json) · [Validation et limites](validation.json)

| Parcours fictif | Ordinateur | Mobile |
|---|---|---|
| Service, un essai acquis | [action](service-reprise-ordinateur-action.png) · [devis-sans-confirmation](service-reprise-ordinateur-devis-sans-confirmation.png) · [fiche](service-reprise-ordinateur-fiche.png) · [reouverture](service-reprise-ordinateur-reouverture.png) | [action](service-reprise-mobile-action.png) · [devis-sans-confirmation](service-reprise-mobile-devis-sans-confirmation.png) · [fiche](service-reprise-mobile-fiche.png) · [reouverture](service-reprise-mobile-reouverture.png) |
| Service, deux essais acquis | [action](service-limite-ordinateur-action.png) · [fiche](service-limite-ordinateur-fiche.png) · [reouverture](service-limite-ordinateur-reouverture.png) | [action](service-limite-mobile-action.png) · [fiche](service-limite-mobile-fiche.png) · [reouverture](service-limite-mobile-reouverture.png) |
| Produit | [action](produit-ordinateur-action.png) · [fiche](produit-ordinateur-fiche.png) | [action](produit-mobile-action.png) · [fiche](produit-mobile-fiche.png) |

Les vues « réouverture » sont prises après une vraie réponse locale à la question utile du devis. Les données sont donc réellement enrichies : le compteur indiqué concerne cette nouvelle fiche, sans effacer les anciennes tâches. Les vues « action » montrent le précontrôle avant cet enrichissement. Les deux confirmations de devis restent annulées ; aucun travail fournisseur n’est lancé.

La nouvelle consultation administrative est effectivement refusée (403) aux six comptes client des parcours ; ses chiffres précis sont testés séparément sur des traces SQLite synthétiques.
