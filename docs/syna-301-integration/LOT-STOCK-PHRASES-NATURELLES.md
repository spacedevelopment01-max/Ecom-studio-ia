# Stock : formulations interrogatives sur la cible native

Les commandes « Peux-tu mettre le stock de cette variante à 12 ? », « Pourrais-tu fixer le stock de cette variante à 0, s’il te plaît ? » et « Peux-tu désactiver le suivi du stock de cette variante ? » ne rejoignaient pas le moteur gratuit natif. Huit cas rouges avant correction.

La normalisation bornée accepte les seuls verbes déjà gérés par le stock, retire l’enveloppe interrogative et la formule de politesse terminale. Elle ne change ni quantité, ni cible, ni suffixe métier. Les commandes mixtes restent des clarifications ; décimales, limites natives et demande de produit lorsque seule une variante est désignée restent refusées.

Mêmes DTO/action/client/carte : localStock schema syna-local-stock-1, confirm-stock avec confirmation:true. Même pin canonique, propriétaire/forfait/drapeau, empreinte, versions produit et variante, TTL, reprise et annulation. Zéro reste un stock suivi nul ; désactivation produit null. La politique de vente, SKU, options, prix et variante voisine restent exacts. Aucun service réservable, synchronisation, achat ou fournisseur.

29 tests / 4 fichiers passent :8nouveaux et21régressions natives de stock, Catalogue et désignation par message. Chaque nouveau parcours valide proposition sans mutation, accord obligatoire, reçu natif et relecture exacte, versions+1, variante voisine et dépenses inchangées. Concurrence manuelle après demande interrogative :409, stock manuel conservé. Types passent.

Aucun composant Claude modifié. Pas de recette navigateur de ces nouvelles formulations anticipée ; les preuves Stock antérieures gardent leur SHA et leurs phrases. CI complète à observer sur le commit livré. Aucun client, appel fournisseur réel, activation, publication, main ou déploiement.
