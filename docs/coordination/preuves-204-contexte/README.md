# Preuves #204 — SIMULATIONS uniquement

Code compilé contrôlé : `5d86a5f3997576bce1a4678f5dab20bcd9a67017` ; production, source `compiled-build`, arbre propre lors du build. **Ces preuves remplacent celles de 0529aed4 / ec974a0e.** Aucun appel fournisseur réel, aucun débit. Les deux analyses réelles mentionnées dans la mission restent acquises ; cette base contient uniquement des fixtures.

24 PNG natifs : pages complètes et vues de l’action. Ordinateur 1440 × 960 ; mobile 390 × 844, contexte tactile distinct. Polices et deux images navigateur attendues avant la capture ; transitions figées pendant la prise de vue uniquement. Aucun recadrage ordinateur présenté comme mobile.

[Contrôles navigateur](browser-proof.json) · [Recalcul fictif du coût](cost-proof.json) · [Validation et limites](validation.json) · [Défaut du compteur reproduit puis corrigé](migration-reproduction.json)

| Parcours fictif | Ordinateur | Mobile |
|---|---|---|
| Service, un essai acquis | [action](service-reprise-ordinateur-action.png) · [devis-sans-confirmation](service-reprise-ordinateur-devis-sans-confirmation.png) · [fiche](service-reprise-ordinateur-fiche.png) · [reouverture](service-reprise-ordinateur-reouverture.png) | [action](service-reprise-mobile-action.png) · [devis-sans-confirmation](service-reprise-mobile-devis-sans-confirmation.png) · [fiche](service-reprise-mobile-fiche.png) · [reouverture](service-reprise-mobile-reouverture.png) |
| Service, deux essais acquis | [action](service-limite-ordinateur-action.png) · [fiche](service-limite-ordinateur-fiche.png) · [reouverture](service-limite-ordinateur-reouverture.png) | [action](service-limite-mobile-action.png) · [fiche](service-limite-mobile-fiche.png) · [reouverture](service-limite-mobile-reouverture.png) |
| Service, deux essais et preuve historique manquante | [action](service-historique-ordinateur-action.png) · [fiche](service-historique-ordinateur-fiche.png) · [reouverture](service-historique-ordinateur-reouverture.png) | [action](service-historique-mobile-action.png) · [fiche](service-historique-mobile-fiche.png) · [reouverture](service-historique-mobile-reouverture.png) |
| Produit | [action](produit-ordinateur-action.png) · [fiche](produit-ordinateur-fiche.png) | [action](produit-mobile-action.png) · [fiche](produit-mobile-fiche.png) |

Les vues « action » précèdent l’enrichissement de la fiche. Les vues « réouverture » suivent une vraie réponse locale à la question utile du devis. Avec des preuves historiques complètes, cette nouvelle information forme un nouveau contexte sans effacer les demandes précédentes. Si une preuve historique manque, le compteur reste conservateur : le blocage et son explication persistent après réouverture, au lieu d’inviter le client à modifier artificiellement ses données.

Les deux devis affichés (ordinateur/mobile) ont été annulés ; aucune confirmation ni génération. Le recalcul du coût est théorique et ne vaut pas autorisation d’essai.

La consultation administrative est refusée (403) aux huit comptes client ; ses coûts individuels sont testés séparément sur des traces SQLite synthétiques. Les entrées/résultats/checkpoints successifs des anciens ET nouveaux essais sont également vérifiés sans appel réel.
