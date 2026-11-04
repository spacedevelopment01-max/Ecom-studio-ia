# Stock natif depuis une phrase exacte — lot backend partiel

Base : #372 (73c8865a942b556035dd89258a05f6cdfdf2a4c1), elle-même sur Claude #369 ea6f0fd9. Aucun fichier graphique modifié.

## Contrat pour Claude

- `ConversationView.localStockExecution.enabled` et `localStock` (`syna-local-stock-1`). États `ambiguous`, `proposed`, `applied`. `target` identifie produit ET variante, avec leurs deux versions ; `diff` contient les quantités avant/après (`null` = suivi désactivé, différent de zéro).
- Désignation A2 existante Catalogue : `catalogue-product` (une seule variante obligatoire), ou `catalogue-variant` (deux versions obligatoires). Aucun nouveau schéma de désignation.
- Phrases : « Mets le stock de ce produit à 12 », « Mets le stock de cette variante à 12 », « Désactive le suivi du stock de ce produit ».
- POST conversation `confirm-stock` : proposition, `confirmation:true`, révision conversation/projet et requestId ; `cancel-stock` sans accord. Validation stricte native avant mutation. Reçu : target versions sources, result versions +1, receiptId, coût/appels/publication/synchronisation = zéro/false.
- Transport `createLocalStockConfirmation` : même accord durable après réponse perdue ; stockage isolé `syna-free-stock:<conversationId>` ; reçu relu, isolation projet/conversation, rappel unique. Événement natif `studio:catalogue-changed` via constante exportée ; UI à raccorder par Claude au verrou partagé.

Moteur natif réutilisé : `setVariantStock`, dans la transaction du tour conversationnel. Aucune synchronisation Shopify/Woo, commande ou publication. Une fiche active peut avoir son stock changé comme dans le formulaire natif ; aucune affirmation que la quantité visible sur un site déjà lié serait inchangée. Prix, SKU, politique deny/continue, autres variantes préservés. Aucun achat ou fournisseur.

## Vérifications exécutées

- 11 nouveaux tests conversationnels natifs : proposition sans écriture, accord séparé, reçu, produit/variante, refus du bulk implicite, null/0, limites natives, no-op, corrections manuelles concurrentes, annulation/expiration, retry identique, reçu falsifié, drapeau, abonnement, propriétaire et cible changée.
- 9 tests de sécurité PATCH stock existants : passent (première passe avec les 9 premiers nouveaux tests : 18/18).
- 56 tests de confirmation (49 existants conservés + 7 Stock), et 40 catalogue : 96/96.
- 20 tests registre/connaissance : passent.
- Types : `tsc --noEmit` sans erreur. Garde réseau lot9 imposée à tous les processus Node.

Limites : carte dédiée, verrou UI commun et recette compilée Catalogue Encre/Plein desktop/téléphone à fournir avec Claude ; ce lot n'est pas déclaré complet. Pas d'annulation automatique du stock, pas de bulk, pas de fournisseur ni activation client. La CI du SHA livré fait foi indépendamment des résultats locaux.
