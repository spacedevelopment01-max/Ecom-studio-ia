# Lire les disponibilités natives depuis la conversation

## Contrat pour Claude

**STUDIO_CONVERSATION_BOOKING_AVAILABILITY**, fermé par défaut sous LOT_A / AI / CONTEXT. Projets services uniquement, propriétaire et forfait natifs, dans Rendez-vous. Aucune ouverture A1 induite.

**bookingAvailabilityRead:{enabled:true}**, présentation **bookingAvailability**, schéma **syna-booking-availability-read-1**. Lecture seule : confirmationRequired:false, actionsExecuted:false, coût et fournisseur zéro. **Aucun bouton de devis, accord commercial, réservation ou activation.** L’affichage des créneaux constitue le résultat de la lecture ; aucun créneau n’est retenu ou garanti.

La carte doit montrer le projet, le moteur, le service natif exact ou l’effectif du groupe, la date, le fuseau, la modalité/longueur éventuelle et l’horodatage **observedAt**. Le salon lit tous les intervenants natifs compatibles (`staffScope:any_compatible_native_staff`) ; aucune préférence professionnelle inventée. Les noms et libellés sont des métadonnées non fiables, à afficher comme données échappées.

`status` est le statut natif de la **date**, pas une promesse qu’un créneau est libre. Utiliser **rows[].available** pour chaque heure. `total` compte toutes les lignes natives (libres ou occupées), `limit:100`, `hasMore` signale les lignes omises : ne pas annoncer « aucun créneau disponible » à partir d’un extrait tronqué. Lien nativeHref vers le planning natif. Les limites de groupe sont recontrôlées et les coordonnées, notes et jetons clients ne sont jamais repris.

GET de conversation **relit** les moteurs natifs et horodate la nouvelle observation. En cas de réponse perdue, le POST identique renvoie son reçu d’origine, daté ; faire ensuite le GET pour les disponibilités actuelles. Une désactivation, suppression de cible, changement de moteur, modalité/longueur ou limites de groupe ne doit jamais laisser afficher d’anciens créneaux comme actuels.

**Mode démo : unavailable**, aucune disponibilité réelle ni activation automatique. Un projet historique A1 n’acquiert pas cette lecture avec le nouveau drapeau. Carte et recette compilée indépendante Encre/Plein dans les quatre formats restent à intégrer par Claude ; aucun composant modifié ici.

## Demandes réellement vérifiées

- « Montre les créneaux disponibles pour le service réservable “Diagnostic fictif” le 2026-11-10 ».
- « Montre les créneaux disponibles pour le service réservable “Diagnostic fictif” longueur “long” le 2026-11-10 ».
- « Montre les créneaux disponibles pour le service réservable “Diagnostic fictif” en cabinet le 2026-11-10 ».
- « Montre les créneaux disponibles du restaurant pour 4 personnes le 2026-11-10 ».
- Politesse « Peux-tu me montrer… », « Montre-moi… » et « Affiche… ».

Date ISO réelle obligatoire. Homonymes : ID natif unique. Modalité cabinet/visio explicite, longueur salon explicite si des variantes natives existent, effectif restaurant entier autorisé. Une cible manquante, date relative/invalide ou phrase enchaînée est clarifiée sans inventer de disponibilité. Les mots cités ne déclenchent aucun autre aiguillage grâce à **outsideQuotes** et la priorité locale.

## Moteurs, tests et preuves

Appelle directement les trois fonctions natives availability, sous **withAiDisabled** et snapshot cohérent, sans lire les coordonnées clientes. Stockage conversationnel limité aux filtres et identités canoniques ; GET recalcule le résultat. Droits et drapeau contrôlés avant le cache ; garde cognitif interdit un nouveau devis ou l’acceptation d’un ancien devis pour cette lecture gratuite, y compris si le drapeau a été retiré.

**35 nouveaux tests ; 87 cas distincts dans 4 fichiers et types verts.** Six parcours salon/cabinet/restaurant × neuf/préparé, comparaison exacte aux trois moteurs, empreintes de toutes les tables métier et fichiers conservées, aucune donnée client privée exposée. Tests des modes démo, horaires/occupation actualisés, cible supprimée, moteur changé, limites retirées, longueurs, homonymes, calendrier supérieur à 100 lignes, compte/onglet/forfait/drapeau/A1, citations et devis.

Véritables handlers HTTP authentifiés **en processus**, sessions et SQLite fictives : attente réelle monotone ≥17 secondes, GET projet/fil, occupation manuelle relue et observation horodatée, POST perdu rejoué sans deuxième tour ni réservation. L’instant métier est fixé pour comparer les disponibilités, puis avancé après l’attente réelle. Ce n’est pas une nouvelle recette navigateur.

Les six premières lectures étaient rouges sur le parent. Le test dense a ensuite découvert le vrai défaut des heures du soir, isolé et corrigé dans **#451/545c9643** ; le raccordement inclut ce préalable. Le correctif des effectifs restaurant **#450/5eb35dc0** est également requis. Aucun test supprimé ni erreur contournée. Une mauvaise insertion de la longueur dans la phrase de fixture a été corrigée sans changement produit.

Logs locaux : `/tmp/parity301-native-availability-read-parent-red.log`, `...-first.log`, `...-final.log`, `...-delivery-final.log`, `...-types-delivery.log`. Fournisseurs interdits par garde réseau et fetch refusé.

## Couverture restante

Pas de réservation, retenue, notification, mode réel, simulation démo, atelier collectif, préférence d’intervenant, date relative ou plage de plusieurs jours dans ce lot. L’opération native auparavant omise `appointments.availability` est ajoutée comme **PARTIEL**, sans déclarer la matrice complète. Aucun client, dépense, activation, fusion ou déploiement.
