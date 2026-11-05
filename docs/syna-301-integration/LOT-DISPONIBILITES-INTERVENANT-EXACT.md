# Lire les disponibilités d’un intervenant exact

## Contrat

Extension de `bookingAvailability` / `bookingAvailabilityRead`, schéma `syna-booking-availability-read-1`, même BOOKING_AVAILABILITY et capacité A1 readonly EXISTING_BOOKING_AVAILABILITY_READ. Aucun nouveau droit d’écriture ni drapeau. Phrase : `Montre les créneaux disponibles pour le service réservable « Diagnostic fictif » avec l’intervenant « Camille » le 2026-11-10`. Nom exact ou identifiant canonique du moteur, variantes polies, intervenante et trois guillemets. Longueur explicite conservée si la prestation en comporte.

Le filtre conserve `staffId`, la présentation expose `staffScope: one_exact_native_staff` et `staff: {id, untrustedMetadata: {name, trust}}`. Sans préférence explicite, le contrat acquis any_compatible_native_staff reste inchangé. Métadonnées à échapper. Aucun contact, token, note privée ou action financière. Lecture seule sans accord, sans retenue ni garantie de créneau : ne pas afficher de bouton de devis ou de réservation exécutée.

Un nom ambigu, un identifiant canonique doublonné, une compétence incompatible ou le mot réservé moteur `any` ne sont jamais remplacés par une recherche sans préférence. Les identités acquises ne sont ni réécrites ni réparées automatiquement. Si le membre est renommé, GET relit son nom en gardant son identifiant. Retrait, ambiguïté ou compétence retirée rendent la lecture indisponible ; jours, horaires et occupation sont recalculés par salon.availability. Aucune règle parallèle de planning.

## Preuves

**19 nouveaux tests, 72 cas distincts dans trois fichiers et types verts.** Le parcours exact par nom est rouge sur le parent. Quatre variantes nom/identifiant/polie/intervenante, résultat identique au moteur partagé, absence de mélange avec le voisin, identités opaque/canonique, homonymes et collisions, membre retiré/renommé/incompatible, jours et horaires propres, mots d’action cités, A1 readonly exact sans Préparation, cabinet sans substitution, occupation et confidentialité. Les empreintes métier, source et préparation restent inchangées lors des lectures.

Handlers HTTP authentifiés sur SQLite fictive isolée : attente monotone réelle ≥17 secondes, nouveau rendez-vous natif fictif, GET projet/fil relisant l’occupation et observedAt tout en conservant le membre exact. Le même message perdu est rejoué avec le même requestId : un seul tour ; ce rejeu conserve son instantané original, GET fournit la fraîcheur. Aucune nouvelle version de site.

Le contrôle des types a révélé qu’une capture regex optionnelle était inférée toujours présente. Extraction facultative explicite avec find, aucun any ni erreur ignorée. Sept cas acquis revérifiés après cet ajustement (préférences, HTTP et cabinet), sans les recompter comme nouveaux tests. Logs : `/tmp/parity301-staff-availability-{parent-red,final,capture-final,types-final}.log`.

## Intégration et limites

Parent #459/e370e720211a4d4eed59d0998e503ea9902dced0. Claude : carte readonly affichant la préférence exacte, l’horodatage, les places/créneaux bornés et les messages d’indisponibilité ; relecture GET, capacité A1 exacte ; recette indépendante Encre/Plein cadre bureau/tactile sur le commit intégré. Aucun composant ou style modifié ici, **aucune nouvelle preuve navigateur compilée**. Domaine PARTIEL.

Le cas acquis staff ID `any` ne peut être distingué du sentinel « sans préférence » par le moteur ; lecture précise refusée sans mutation. L’allocation de nouvelles identités portant ce mot reste à examiner dans un lot séparé. Création/déplacement/annulation clients et notifications encore hors contrat. Aucun fournisseur, dépense, client réel, activation, fusion ou déploiement. CI du commit livré à relever séparément.
