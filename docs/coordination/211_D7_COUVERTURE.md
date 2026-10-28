# #211 — delta D7 de couverture

Version de code `a1fab8a1c90083c4dfa8c2ca61b901fae133a295`. Le catalogue compte 50 opérations explicites, pas les 1 283 contrôles syntaxiquement repérés. Les [48 lignes historiques D6](211_D6_COUVERTURE.md) conservent leur périmètre ; deux lignes précises sont ajoutées.

| Opération | Implémentation et preuves | Limites |
| --- | --- | --- |
| `strategy.compare` | Reprise native des angles acquis, 2–5 références intégrales/versionnées ; 14 ciblés D7 et trois parcours navigateur isolés | Pas de nouvelle recherche ni alternative inventée ; données de recherche simulées, aucun conseil réel qualifié |
| `strategy.preference` | Préférence/rejet avec raison, historique et annulation ; réponse libre sur devis avec proposition puis accord distinct | Préférence de discussion seulement, pas d’activation/quota/génération ; annulation vérifiée par bouton, pas toutes les formulations libres |
| `proposal.compare` / `proposal.choose` génériques | **Absentes de SYNA** | D7 ne raccorde pas logos/images/thèmes ni mélange de propositions |
| Activation d’une stratégie | Parcours natif existant, **pas raccordé par D7** | Confirmations et conséquences natives restent obligatoires |

Drapeau STUDIO_CONVERSATION_CHOICES fermé par défaut, dépendant LOT_A/AI ; aucun droit nouveau. Les tests simulés ne prouvent ni compréhension réelle, cohérence de marque, vision, performance marketing, disponibilité fournisseur, fonctionnement CMS, usage sur l’instance client ni validation du propriétaire. Les opérations sensibles restent absentes du chat. Autres modules et F2 restent partiels ; #211 n’est pas terminé.
