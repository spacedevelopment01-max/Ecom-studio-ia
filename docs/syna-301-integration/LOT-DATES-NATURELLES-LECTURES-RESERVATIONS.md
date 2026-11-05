# Aujourd’hui, demain et après-demain pour les lectures natives

## Contrat pour Claude

Réutilise les flags/capacités gratuits BOOKING_AVAILABILITY et BOOKING_WORKSHOPS et leurs exceptions A1 readonly déjà acquises. Aucun droit d’écriture, mode, réservation, hold ou inscription ajouté ; lecture seule sans confirmation ni devis. Même schéma des DTO, ajout facultatif `dateResolution:{expression,date,timezone,resolvedAt,policy:'fixed_at_request_not_reinterpreted_on_refresh'}`. expression normalisée aujourd’hui/demain/après-demain ; date ISO exacte et fuseau natif de résolution à afficher avec l’heure d’observation courante.

Phrases vérifiées : `Montre les créneaux disponibles pour le service réservable « Diagnostic fictif » demain`, cabinet avec modalité en cabinet/visio exacte, restaurant pour un effectif explicite ; `Montre les ateliers disponibles après-demain` ; `Montre les places disponibles de l’atelier « Atelier demain » demain`. Intervenant/longueur/modalité/party/atelier restent désignés par les contrats acquis. Noms cités contenant les mots demain/après-demain ne changent jamais la date ; outsideQuotes des aiguilleurs conservé.

Résoudre une seule fois à la demande selon le jour civil du fuseau natif, pas selon le jour UTC ou +24h réelles. ISO absolu conservé. Aucun fuseau absent/invalide remplacé par celui du serveur ou UTC pour une date relative. Semaine prochaine/jour vague et demandes combinées restent des clarifications, aucun jour deviné.

**Rafraîchissement** : la date ciblée et dateResolution restent fixes, même après minuit ; observedAt et disponibilité/places se relisent réellement. Un changement ultérieur du fuseau exige une nouvelle lecture, état unavailable explicite ; aucune date relative réinterprétée silencieusement. La réponse d’un POST rejoué reste celle conservée pour ce requestId, un seul tour ; GET fournit l’observation fraîche. Aucun créneau/place garanti.

Adapter les cartes Claude pour afficher expression→date exacte, fuseau de résolution, instant d’observation, et message unavailable en cas de fuseau changé. Recette compilée indépendante quatre formats toujours à exécuter sur le SHA intégré ; aucun composant/style/branche Claude touché.

## Preuves

**34 nouveaux tests, 129 cas distincts dans cinq fichiers et types verts.** Deux intentions réellement rouges contre les adaptateurs parents (créneau salon demain, atelier exact demain), puis vertes après restauration du raccordement. Frontières de jour Tokyo/LosAngeles, mois/année/bissextile et deux instants du changement d’heure NewYork ; identifiant de fuseau absent/invalide refusé. Trois moteurs ×trois jours naturels, cibles exactes, source/profil/préparation/réservations/finances/devis sans changement. Ateliers réels et places SQLite fictives, titres cités, date fixe après minuit, observation fraîche et changement de fuseau refusé.

Handlers HTTP authentifiés et SQLite isolés : attente monotone réelle≥17s, GET projet/fil, date et résolution stables, observedAt actualisé ; POST perdu rejoué identique, un seul tour, aucune mutation. **Preuve HTTP, pas nouvelle recette navigateur.** Aucun fetch/fournisseur réel.

95 régressions acquises dans quatre fichiers vertes : lectures disponibilités, ateliers, intervenant exact et A1 readonly. Aucun test supprimé : trois usages de demain comme fixture ambiguë utilisent maintenant la semaine prochaine, qui reste ambiguë. Leurs assertions anti-écriture/anti-devis sont intactes ; demain a désormais ses parcours positifs.

Logs /tmp/parity301-booking-relative-date-{first,parent-red,final-cases,regressions,types-final}.log. Parent #476/a5a58bfcd62920d808d894435972d0b2e39a0143. CI exacte à suivre. Pas de réservation/inscription, date relative d’écriture ou période vague ; cartes et recette indépendante encore ouvertes. Aucun client réel, dépense, activation, main ou déploiement.
