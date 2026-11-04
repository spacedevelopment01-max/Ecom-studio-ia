# Préserver les identités natives avant le raccordement des réservations

Quatre reproductions rouges par la vraie API PUT prestations :
- un identifiant de prestation répété était accepté et le dernier bloc écrasait le premier ;
- même défaut pour un identifiant d’intervenant répété ;
- deux nouveaux intervenants homonymes perdaient une ligne lors de la construction des blocs ;
- deux noms longs de prestations généraient un identifiant de42caractères, supérieur au contrat natif40, empêchant le prochain enregistrement.

## Correctif minimal

Les tableaux services et staff rejettent séparément les identifiants fournis répétés, avant toute écriture. Les identifiants absents ou vides de nouveaux éléments restent autorisés. Les noms ne sont pas des identifiants.

Un allocateur natif partagé évite les identités existantes et celles déjà allouées pendant la requête, avec suffixe borné à40caractères. Il sert aux nouvelles prestations et aux nouveaux intervenants. Les identifiants acquis fournis restent inchangés ; aucun identifiant ou numéro de version commun avec le profil business_json. Pas de migration ou réparation silencieuse de données anciennes.

19lignes modifiées dans le moteur natif, aucun composant de Claude, contrat HTTP, forfait, devis ou confirmation modifié. Version UUID de réservation et gardes de propriété restent obligatoires. Le moteur ne réserve ni ne facture quoi que ce soit ; seuls les cas fictifs sont exécutés.

## Preuves exécutées

Quatre cas rouges avant correction, puis50tests uniques sur cinq fichiers ettypes passent : neuf nouveaux et41régressions (éditeur natif, lecteur SYNA, CAS du profil et API des contenus).

Vraies routes GET/PUT avec session/cookie, doublons refusés atomiquement (projet, thème et versions exacts), homonymes et noms longs réenregistrables, identités acquises préservées, éléments nouveaux distincts, propriétaire/version contrôlés, aucun fournisseur. L’édition manuelle native reste gratuite même sans abonnement actif ou solde IA ;les exigences propres àSYNA ne sont pas modifiées. La suite groupée passe49tests, puis les neuf nouveaux repassent après ajout du cas manuel hors abonnement. Les tests existants conservent un rendez-vous confirmé et ses prix/durée acquis, le refus de supprimer une prestation encore réservée, l’adresse, les horaires et les parcours cabinet/restaurant.

Ce lot sécurise un prérequis moteur. Il ne rend pas encore services.booking accessible depuis une phrase naturelle et ne constitue pas une recette de carte SYNA. L’aperçu natif sans écriture et le raccordement des intentions/accords restent à développer. Aucun test supprimé ou contourné. CI complète à observer sur le SHA livré.

Aucune dépense fournisseur réelle, modification client, activation, publication, fusion main ou mise en production.
