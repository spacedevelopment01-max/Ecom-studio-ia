# Annuler une réservation professionnelle exacte depuis SYNA

## Contrat Claude

BOOKING_CANCEL fermé par défaut sous LOT_A/AI/CONTEXT, propriétaire/forfait/projet services/onglet Rendez-vous, calendrier natif déjà actif et unique. Aucun droit A1 ni activation. `bookingCancel` / `bookingCancelExecution`, schéma `syna-booking-cancel-1` : kind, diff before/after du résumé natif, référence/date/heure/prestation/party, destructive true, reversible false, warnings, confirmationRequired, coût/providerCalls zéro, financialConsent false, sourceVersionId. Les métadonnées natives sont non fiables à échapper. Aucune coordonnée, note ou jeton dans la carte.

Phrases vérifiées avec les trois moteurs : `Annule la réservation « numéro exact » du 2026-11-10`, `Peux-tu annuler le RDV AN-2026-ABCDE ?`, `Je voudrais annuler le rendez-vous du cabinet P-2026-ABCDE du 2026-11-10`, `Annule la réservation du restaurant TS-0001`. Références natives sans guillemets ou anciennes références opaques citées, trois guillemets, date facultative mais cohérente, type de calendrier facultatif mais exact. Supprimer l’historique, annuler en masse ou « mon rendez-vous » de self-service : clarification, aucune annulation implicite. Aiguilleur outsideQuotes et priorité locale.

`confirm-booking-cancel` exige proposalId et confirmation littéralement true. **`cancel-booking-cancel` abandonne la proposition et conserve la réservation** ; libellé de bouton conseillé : « Conserver la réservation ». Accord professionnel gratuit distinct d’un devis. TTL15min, calendrier/version et ligne native exacts, relecture sous verrou, annulation et reçu atomiques. `nativeResult.status=canceled` vient de la relecture enregistrée, receiptId identifie la reprise. **Aucune nouvelle version du thème** ni annulation générique de retouche.

Afficher avant accord : historique conservé, allocation/places/couverts libérés, aucun remboursement, e-mail ou notification automatique, aucune garantie de nouvelle réservation. Résultat : référence et statut natifs relus, reçu, rafraîchissement de Rendez-vous. Carte et recette indépendante Encre/Plein cadre bureau/tactile à Claude sur le SHA intégré. Aucun composant/style/branche Claude modifié.

## Preuves exécutées

**32 nouveaux tests, 111 cas distincts dans cinq fichiers et types verts.** Trois moteurs ×projets neufs/préparés, atelier réellement libéré, aperçus sans mutation, cible unique, accord gratuit, état natif, voisins/historique/notes/jetons exacts, source/profil/préparation/finances/devis conservés. Date/note/statut/configuration/mode modifiés après aperçu : refus sans écraser les acquis. Annulation déjà acquise =no-op, abandon/contexte/expiration sans exécution, rollback du reçu et reprise légitime, un reçu/un changement de statut au rejeu.

Faux accords refusés, flag/forfait retirés avant reçus cachés, budget IA épuisé toujours gratuit, IA fermée, propriétaire étranger, mauvais onglet/projet produits et A1 fermés. Création et acceptation d’anciens devis cognitifs refusées même après abandon/fermeture du flag. Le premier test a démontré un registre annonçant devis/fournisseur simulé : corrigé en free/isolated_local_execution, accord gratuit toujours obligatoire. Aucun contrôle financier ou quatrième contrôle CI rendu optionnel.

Les 31 premiers cas passent ; le dernier échec venait du test créant deux projets sur un forfait limité à un projet. Le second projet de fixture utilise un compte distinct, sans relâcher le quota. Deux cas ciblés revérifiés, puis 79 régressions acquises (lecture réservations, absence de repli payant, A1, registre). Aucun test supprimé.

Handlers HTTP authentifiés, SQLite et réservations fictives isolées : attente monotone réelle ≥17 secondes, GET projet/fil, statut encore confirmé avant accord, refus false/absent/chaîne true, accord, **GET Rendez-vous affichant canceled** et réponse perdue rejouée : un reçu, aucune version de thème, finances inchangées. **Ceci ne constitue pas une recette navigateur compilée.** Fetch interdit et garde réseau ; aucune notification ou fournisseur réel.

Logs locaux : `/tmp/parity301-booking-cancel-{registry-red,first,final-cases,regressions,types-delivery}.log`. Parent #466/72ec8907ba4d208fcd8d54f963e441ad624a9203. CI du commit livré à relever séparément.

## Limites

Annulation réelle de projets clients **BLOQUÉE dans cette mission** : aucun client réel testé/modifié, flag non activé, aucun déploiement/fusion. Seule la couverture fictive du backend est acquise ; la carte, la recette compilée indépendante et toute validation avant activation réelle restent ouvertes. Pas de remboursement, notification, self-service client, création/déplacement/réservation en masse ou restauration d’une annulation. Aucun fournisseur, dépense ou mise en production.
