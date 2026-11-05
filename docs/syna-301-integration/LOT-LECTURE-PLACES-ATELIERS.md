# Lire les places des ateliers collectifs du cabinet

## Contrat pour Claude

**STUDIO_CONVERSATION_BOOKING_WORKSHOPS**, fermé par défaut sous LOT_A / AI / CONTEXT. Projet services, propriétaire et forfait natifs, dans Rendez-vous, moteur cabinet uniquement. Ni salon, restaurant, catalogue produit ni reprise historique A1 substitués.

Capacité **bookingWorkshopsRead:{enabled:true}**, présentation **bookingWorkshops**, schéma **syna-booking-workshops-read-1**. Lecture seule, confirmationRequired:false, actionsExecuted:false, coût et fournisseur zéro. **Pas de devis, accord commercial, inscription, retenue de place ou activation.**

La carte montre la date, le fuseau, observedAt, la cible native et les colonnes titre, heure, capacité, places restantes et statut. Les titres sont des métadonnées non fiables, affichées comme données échappées. Utiliser **available** (statut natif open), et pas seulement remaining : une capacité/durée/heure manquante ou un atelier passé ne devient pas réservable parce qu’un nombre de places est positif. Capacité inconnue : **null**, affichage « À renseigner », jamais zéro ou valeur inventée.

`total`, `limit:20` et `hasMore` rendent la troncature explicite. Un ID exact peut consulter seul un atelier omis de l’extrait. Homonymes : demander un ID ; identifiant natif dupliqué, même à une autre date : refus, sans premier résultat implicite.

GET relit le moteur natif et horodate les places actuelles. Un POST rejoué renvoie son observation initiale datée ; faire ensuite le GET pour l’état actuel. Le mode démo renvoie unavailable et ne s’active jamais. Si un atelier nommé change de date, disparaît ou change d’identité, ou si le moteur change, ne pas conserver l’ancienne disponibilité. Les cartes et la recette compilée indépendante Encre/Plein dans les quatre formats restent à intégrer par Claude ; aucun composant modifié ici.

## Demandes vérifiées

- « Montre les places disponibles de l’atelier “Pause fictive” le 2026-11-10 ».
- « Montre les ateliers disponibles le 2026-11-10 ».
- « Liste les ateliers du cabinet le 2026-11-10 ».
- « Peux-tu me montrer les ateliers disponibles le 2026-11-10 ? ».
- « Je voudrais voir les ateliers disponibles le 2026-11-10 » ; « Montre-moi… ».
- Lecture exacte par ID, dont un atelier omis d’une liste de plus de vingt lignes.

Date ISO réelle obligatoire. Date relative/invalide, cible absente ou instruction enchaînée : clarification sans inscription. **outsideQuotes** et priorité locale empêchent les mots d’action contenus dans un titre cité de déclencher une autre opération.

## Moteur et preuves

Réutilise **cabinet.workshops**, takenFor, core.remaining et atelierStatus dans un snapshot cohérent, sous **withAiDisabled**. Les rendez-vous confirmés de type atelier consomment les places ; les annulations et séances individuelles ne les consomment pas. Les nombres de places prises de la démonstration sont ignorés par le moteur réel. Aucune coordonnée, note ou jeton client n’est exposé ou stocké dans l’état de lecture, qui contient uniquement la date et l’éventuel ID canonique.

**23 nouveaux tests ; 91 cas distincts dans 4 fichiers et types verts.** Projets neufs/préparés, comparaison au résultat natif, totalité des tables métier et fichiers inchangée, capacité inconnue, atelier complet puis annulation manuelle, homonymes/IDs dupliqués, date/moteur/mode changés, liste tronquée et cible omise, citations, droits/forfait/drapeau avant cache, A1 et devis/anciens devis refusés.

Véritables handlers HTTP authentifiés **en processus**, avec sessions et SQLite fictives : attente réelle monotone ≥17 secondes, GET projet/fil, occupation manuelle relue avec nouvel observedAt, réponse perdue rejouée sans inscription ni deuxième tour. Instant métier fixé pour comparer les résultats puis avancé après l’attente réelle. Ce n’est pas une nouvelle recette navigateur.

Deux lectures échouent fonctionnellement sur le parent, après correction de la fixture : le premier essai plaçait à tort un jeton dans cabinet_appointments ; la fixture utilise maintenant la véritable table séparée cabinet_tokens et renseigne la modalité native. Aucun défaut produit déduit de cette erreur de fixture. Preuve rouge vérifiée : `/tmp/parity301-cabinet-workshops-parent-red-verified.log`. Résultats : `...-final.log`, `...-types-final.log`.

## Limites

Pas d’inscription, annulation client, création/modification d’atelier, retenue de place, notification, date relative, mode réel ou droit A1 dans ce lot. L’opération native omise `appointments.workshops` est enregistrée **PARTIEL**, pas complète. Parent #452. Aucun fournisseur réel, client, activation, fusion ou déploiement.
