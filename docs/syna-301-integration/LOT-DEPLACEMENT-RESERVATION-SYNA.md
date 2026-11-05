# Déplacer une réservation professionnelle exacte depuis SYNA

## Contrat pour Claude

`STUDIO_CONVERSATION_BOOKING_MOVE=1`, sous LOT_A/AI/CONTEXT, fermé par défaut. Propriétaire, forfait, projet services, onglet Rendez-vous, un calendrier natif actif et unique ; aucun droit A1 ajouté.

DTO `bookingMove` et capacité `bookingMoveExecution`, schéma `syna-booking-move-1`. États ambiguous/proposed/applied ; référence, kind, timezone, diff before/after de BookingMoveSummary, staffDisplay facultatif, warnings, confirmationRequired, coût et providerCalls zéro, financialConsent false, reversible false. Métadonnées natives marquées non fiables, à échapper. Aucun contact, note ou jeton exposé.

Phrases exécutées : `Déplace la réservation « référence exacte » du 2026-11-10 au 2026-11-11 à 10:00`, `Peux-tu déplacer le RDV AN-2026-ABCDE au 2026-11-11 à 10h ?`, `Je voudrais reprogrammer le rendez-vous du cabinet “P-2026-ABCDE” au 2026-11-11 à 10:00`, `Décale la réservation du restaurant "TS-0001" au 2026-11-11 à 10h00`. Référence opaque citée ou numéro natif nu, trois guillemets, date source facultative mais cohérente, date et heure cibles explicites, aucun jour deviné. Salon : `avec l’intervenant « Sam ou identifiant natif »` ou explicitement `sans préférence`. Restaurant : `pour 4 personnes`. Homonyme/inconnu/ancien any sans préférence explicite, self-service, masse et atelier : clarification, aucune substitution. Aiguilleur outsideQuotes et priorité locale.

`confirm-booking-move` exige proposalId et confirmation littéralement true. `cancel-booking-move` abandonne uniquement l’aperçu et conserve la réservation à son créneau actuel. TTL 15 minutes. Aperçu natif #470 sans UPDATE ; confirmation sous verrou avec même ligne, source et cible, même affectation. Une autre occupation/affectation nécessite un nouvel aperçu, même si un autre intervenant est libre. Mutation et reçu atomiques, réponse perdue rejouée sans doublon. Aucun nouveau thème/version. `nativeResult` est relu après écriture, receiptId identifie le résultat conservé.

Carte avant/après : date, heure de début/fin et fuseau, même référence, intervenant réel avant/après pour salon, couverts pour restaurant. Conserver l’intervalle acquis, pas la durée courante d’une nouvelle prestation. Résultat appliqué puis rafraîchir Rendez-vous. Pas d’e-mail, notification, remboursement, activation ou commande implicite. Carte/handle/contrôleur et recette compilée Encre/Plein cadre bureau/tactile à Claude sur le SHA intégré. Aucun composant, style ou branche Claude modifié.

## Preuves exécutées

**41 nouveaux tests, 113 cas distincts dans quatre fichiers et types verts.** Les 72 régressions acquises couvrent annulation (32), aperçu natif (27) et interdiction de repli payant (13).

41 nouveaux cas distincts : trois moteurs × neuf/préparé, demandes naturelles, aperçu sans écriture, accord séparé et résultat natif, absence de devis/dépense, source/profil/préparation/notes/prix/jetons/voisins conservés. Intervenant exact, sans préférence avec vraie affectation, couverts natifs ; références/type/date/heure/champs hors domaine, masse/self-service et atelier refusés. Conflits date/note/statut/thème/mode/nouvelle occupation ; refus d’une nouvelle affectation pourtant disponible. Abandon, contexte, expiration, rollback du reçu puis reprise unique. Retrait flag/forfait contrôlé avant cache, budget IA épuisé toujours gratuit, IA fermée, propriétaire étranger/produits/A1 fermés. Devis cognitifs créés/acceptés refusés même après abandon ou fermeture du flag.

Le premier passage : 37/38 verts ; un test SQL utilisait staff_id, alors que la colonne acquise est staff. Correction de cette seule assertion puis cas ciblé vert. Trois cas supplémentaires homonymes/changement d’affectation/identité any acquise verts. Aucun moteur modifié pour ces tests, aucun test supprimé ou garde affaibli.

Handlers HTTP authentifiés, SQLite et données fictives isolées : attente monotone réelle ≥17 secondes, relecture projet et fil, aperçu et créneau source conservés avant accord ; false/absent/chaîne true refusés ; accord, GET Rendez-vous relisant la nouvelle date, puis réponse perdue rejouée avec un seul reçu. **Preuve HTTP, pas recette navigateur compilée.** Fetch interdit et garde réseau, aucun fournisseur réel.

Logs : /tmp/parity301-booking-move-{first,assignment-fixed,boundaries,regressions,types-delivery}.log. Types finaux verts. CI à vérifier sur le SHA livré, jamais héritée.

## Couverture et limites

L’opération de registre `appointments.move` correspond à la ligne existante `native.appointments.reschedule` de la matrice. Ne pas ajouter une deuxième ligne : la précédente reprise avait correctement identifié l’absence dans le registre, mais avait omis cette ligne détaillée de l’inventaire. Qualification backend fictive PARTIEL ; statut réel BLOQUE conservé. Aucun client réel modifié, flag non activé, fusion/déploiement interdits. Cartes, recette compilée indépendante et validation avant toute activation restent ouvertes. Pas de création, notification, remboursement, inscription/annulation automatique d’atelier ou modification en masse.
