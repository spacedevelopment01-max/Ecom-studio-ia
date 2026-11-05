# Horizon et délai de réservation depuis une phrase naturelle

## Contrat pour Claude

`BOOKING_WINDOW` fermé par défaut sous LOT_A/AI/CONTEXT ouvre `bookingWindow` / `bookingWindowExecution`, schéma `syna-booking-window-1`. Un seul champ horizonDays ou leadMinutes, différence scalaire native avant/après et unité days/minutes, kind, warnings, version source, proposalId ; coût zéro, providerCalls zéro, financialConsent false. Aucun droit A1 nouveau.

Phrases vérifiées : `Fixe l’horizon de réservation à 30 jours`, `Peux-tu fixer l’horizon de réservation à 60 jours ?`, `Je voudrais limiter les réservations aux 45 prochains jours`, `Change le délai minimal avant réservation à 120 minutes`, `Les clients doivent réserver au moins 2 heures à l’avance`. La conversion explicite heures/minutes reste entière, puis le moteur natif vérifie ses bornes/pas ; aucun arrondi. Une demande partielle, combinée, hors bornes ou identique à l’acquis est clarifiée sans version ni devis.

Actions `confirm-booking-window` (proposalId, confirmation littéralement true) / `cancel-booking-window`. Aperçu, accord gratuit séparé, empreinte entière/version/TTL15min, re-preview natif, reçu et version atomiques, résultat effectif relu, reprise du même requestId sans doublon. Changement manuel, annulation, effacement du contexte, expiration, retrait du drapeau/forfait avant rejeu : aucun accord périmé réutilisé. L’ancien devis cognitif est refusé même après annulation ou fermeture du drapeau. Aiguilleur outsideQuotes, priorité locale ; aucune confusion avec un horaire de profil ou une activation.

Claude : carte affichant la règle, l’unité et warnings avant accord gratuit, puis version/reçu/résultat relu, capacité exacte, rafraîchissement natif selon ton contrat existant. Aucun bouton de devis générique. Recette indépendante Encre/Plein cadre bureau/tactile sur le commit intégré. Aucun composant/style/branche Claude modifié.

## Résultats exécutés

**29 nouveaux tests, 111 cas distincts dans cinq fichiers, types verts.** Les 27 premiers nouveaux cas passent directement ; deux contrôles additionnels IA globale fermée et projet produits sans droit réservable passent séparément. Quatre fichiers acquis totalisent 82 régressions (catalogue prestations, absence de repli payant, A1 et registre). Pas de tests supprimés, pas de CI ou garde-fou rendu optionnel.

Trois moteurs salon/cabinet/restaurant ×horizon/délai : demande naturelle, cible, aperçu sans écriture, accord, source exacte avec une seule clé modifiée et résultat natif. Projets neufs/préparés, profils/préparation/finances/devis acquis préservés. Budget IA épuisé toujours gratuit. Consigne de vocabulaire qui changerait des textes acquis refusée, rollback du reçu et reprise vérifiés, propriétaire étranger et A1 fermés. Les tests natifs du parent #462 démontrent les effets réels sur les disponibilités et la conservation des rendez-vous ; ils ne sont pas recomptés ici.

Handlers HTTP authentifiés et SQLite fictive isolée : attente monotone réelle ≥17 secondes, GET projet/fil, proposition exacte conservée, refus des faux accords false/absent/chaîne true, accord, GET Prestations montrant le résultat, même corps/requestId rejoué : une version et un reçu. **Ce n’est pas une preuve navigateur compilée**. Fetch interdit et garde réseau ; aucune dépense, notification ou activation.

Logs : `/tmp/parity301-booking-window-{first,boundaries,regressions,types-delivery}.log`. Parent #462/5f5bd50cc6954a51a5a4441434d96ae3b25dd191. CI du commit livré à suivre séparément ; aucun report de verdict entre SHA.

## Limites

Domaine PARTIEL : cartes et recette Studio compilée encore ouvertes. Pas des créneaux, délai d’annulation, fuseau, ateliers et réservations clientes restent des parcours distincts à qualifier. Aucun client réel, fournisseur, publication, activation, fusion ou déploiement.
