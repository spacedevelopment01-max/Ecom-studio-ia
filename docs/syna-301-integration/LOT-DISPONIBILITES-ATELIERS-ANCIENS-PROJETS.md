# Disponibilités et ateliers dans une reprise historique A1

## Droits séparés, fermés par défaut

Les moteurs et présentations de #452 et #453 sont réutilisés sans autre droit métier :

- **EXISTING_BOOKING_AVAILABILITY_READ** exige BOOKING_AVAILABILITY / LOT_A / AI / CONTEXT et un projet services.
- **EXISTING_BOOKING_WORKSHOPS_READ** exige BOOKING_WORKSHOPS / LOT_A / AI / CONTEXT et un projet services ; le moteur consulté doit réellement être un cabinet pour les ateliers.

Ces lectures ne demandent **pas EXISTING_LOCAL** et n’accordent aucune écriture. Le droit de consulter les créneaux n’autorise pas les ateliers, ni l’inverse. Les anciens droits de prompts, réservations, horaires et fermetures restent distincts.

## Contrat de carte A1 pour Claude

Même **bookingAvailability / bookingAvailabilityRead** et **bookingWorkshops / bookingWorkshopsRead** que les lecteurs natifs. Le serveur expose la capacité exacte dans `recovery.localReads`, schéma existing-local-read-1, opérations **booking-availability** et **booking-workshops**. Pour afficher la carte A1, employer respectivement **localReadAllowed(view,'booking-availability')** et **localReadAllowed(view,'booking-workshops')**.

Ne pas employer nativeLocalEditAllowed pour ces lectures : il reste faux en A1. Un autre droit de lecture, un budget ou la présence d’une fiche ne donne pas cette permission. Le helper refuse les opérations inconnues et les capacités qui ne sont pas explicitement de lecture, gratuites et sans consentement financier.

Les autres propriétés A1 restent inchangées : actionsEnabled:false, aiEnabled:false, projectRevision:null, Préparation absente, pas de champ de correction, pas d’outil ou de devis payant. Une nouvelle demande remplace l’état de lecture précédent sans modifier le planning. Propriétaire et forfait sont vérifiés avant tout cache ; retirer le droit ou son drapeau interdit aussi le retour d’un ancien reçu de lecture et masque la carte au GET.

La lecture reste sans accord commercial ni inscription. Le GET recalcule les disponibilités ou places et horodate le résultat ; le POST identique rejoué conserve son observation initiale datée. Reprendre ensuite par GET pour l’état actuel. Mode démo, cible/moteur modifiés, limites et capacités inconnues suivent exactement les refus natifs documentés dans les deux lots parents. Aucun moteur activé automatiquement.

## Vérification

**18 nouveaux tests ; 94 cas distincts dans 5 fichiers et types verts.** Quatre parcours salon/cabinet/restaurant/atelier étaient rouges sur le parent faute de droit A1 explicite. Sont vérifiés les droits indépendants, drapeaux natifs et CONTEXT retirés, absence de lecture native si le droit manque, produits/compte/forfait, révocation avant cache, droits forgés ou inconnus, refus des mutateurs et de la cognition payante.

Vraies données historiques fictives : toutes les tables métier, versions, fichiers/octets, anciens contenus et shop.chat conservent leurs empreintes. Aucun état de Préparation créé. Budget IA épuisé : lecture d’atelier puis lecture de créneaux cabinet, état précédent retiré, aucune dépense ni donnée cliente persistée dans les métadonnées. Les lecteurs POST et GET exécutent leurs appels natifs sous le garde no-AI. Une panne native annule le nouveau message et son état, sans faux succès.

Deux véritables parcours HTTP authentifiés **en processus**, restaurant et atelier, attendent chacun au moins 17 secondes réelles mesurées par horloge monotone. GET projet puis fil : occupation manuelle et nouvel observedAt relus ; réponse perdue rejouée sans deuxième tour, réservation ou inscription. Les sessions et SQLite sont réelles et isolées. **Ce n’est pas une nouvelle preuve navigateur.**

Les 76 régressions disjointes couvrent les lectures de réservations, horaires et fermetures A1 ainsi que la reprise historique générale. Les 18 nouveaux cas passent ; le cas budget zéro a ensuite été complété par la transition entre les deux lecteurs et revérifié séparément, sans recompter ce cas.

Logs locaux : `/tmp/parity301-existing-booking-availability-parent-red.log`, `...-first.log`, `...-cross-read.log`, `...-regressions.log`, `...-types-final.log`. Fournisseurs interdits par garde réseau et fetch refusé.

## Limites

Cartes A1 et recette compilée indépendante Encre/Plein dans les quatre formats restent à qualifier avec Claude. Aucun composant graphique modifié. Aucun autre acte A1 ouvert : ajout/retrait de prestation, intervenants, réservations clientes, cognition et activations restent sous leurs contrats ou refus actuels. Parent #453. Aucune dépense, activation client, fusion ou mise en production.
