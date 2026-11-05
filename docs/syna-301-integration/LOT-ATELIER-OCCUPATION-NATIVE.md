# Ateliers : occupation professionnelle et intervalle natif valide

## Défauts réellement reproduits

Une séance confirmée est acquise, puis un atelier est ajouté manuellement à sa période. L’atelier peut encore accepter une inscription : le validateur ne consulte pas les séances occupées et la lecture indique open dès qu’il reste des places. Le moteur sait pourtant déjà que les ateliers occupent la praticienne pour calculer les séances. Trois cas rouges établissent le défaut dans le validateur partagé, l’enregistrement réel et la lecture native.

Un quatrième cas rouge crée une inscription dont l’atelier finit après minuit : end_min dépasse1440, alors que les contrats natifs représentent une journée et ne peuvent relire ce rendez-vous correctement. Aucune migration ou prise en charge implicite de plusieurs jours n’est ajoutée.

## Correction limitée

parenthese-core.atelierStatus accepte un argument busy facultatif, réutilise overlaps sur toute la durée et renvoie unavailable quand la praticienne est occupée ; validate remonte slot_taken. Les statuts invalid/past/full restent distincts, les anciennes signatures à quatre arguments restent compatibles. Une fin supérieure à24:00 est invalide ; la fin exactement24:00 reste permise et testée.

createAppointment relit les intervalles réels de séances dans sa transaction existante, pour la date du workshop natif et non une date libre fournie dans la requête. Refus409 unavailable, kind atelier, reason professional_busy, vraies places restantes ; aucune insertion, jeton ou demande d’e-mail. La lecture workshops est un snapshot cohérent, avec statut unavailable et raison générique sans données d’un autre client.

Le DTO readonly SYNA bookingWorkshops ajoute la raison facultative professional_busy : remaining indique toujours les vraies places, available=false quand le professionnel est occupé. **Ne pas présenter ce cas comme complet** : les places restent libres, c’est la période qui est indisponible. La sélection du formulaire natif accepte déjà uniquement les statuts open. Cartes/libellés et recette indépendante compilée à Claude ; aucun composant, style ou interface Encre/Plein cadre modifié, seulement logique du moteur partagé, API et contrat.

## Preuves

**16 nouveaux tests,59 cas distincts dans trois fichiers et types verts.** Trois reproductions rouges puis verts ; cas de fin après minuit rouge puis refus correct. Chevauchement gauche/droite/entier, séance au cabinet et visio, bornes adjacentes permises, fin exacte24h, vraie annulation libérant la période et inscription permise ensuite. Source, inscriptions, prix, notes, jetons et finances acquis conservés.

API publique GET et POST : statut indisponible cohérent, date de requête falsifiée incapable de contourner la date native, réponse409 sans données privées, aucun appel à sendConfirmation (stub empêchant tout envoi). Demande naturelle SYNA du workshop exact : lecture disponible financièrement gratuite mais ligne available=false avec raison ; après annulation manuelle, la même lecture se rafraîchit en open, sans action ni devis. Reprise idem après modification manuelle de la définition : même inscription acquise, token null, aucune nouvelle écriture.

Publication réelle de source et séance native commises juste avant le verrou d’inscription : le nouvel intervalle occupé est autoritaire, refus sans écraser ces acquis. Ordonnancement intercepté seulement ; source, transactions, validations, SQL et jetons réels, pas un test multiprocessus.

43 régressions natives/lectures conservées. Deux attentes anciennes avaient précisément une séance confirmée sur l’heure de l’atelier tout en attendant available=true : elles exigent maintenant unavailable/professional_busy/available=false, même nombre de places et mêmes assertions de confidentialité/source/absence d’écriture. Aucun test supprimé ou fixture déplacée pour masquer la collision.

Logs /tmp/parity301-native-workshop-overlap-{parent-red,midnight-red,first,final,boundaries-final,types-final}.log. Parent #482/fbdfa18deb6056c5377e4d33de7f4d6db1519cba. Pas de nouvelle recette navigateur revendiquée pour ces statuts ; preuve core/SQLite/handlers HTTP et conversation naturelle. Aucun fournisseur réel, dépense, e-mail réel, client réel, activation, main ou déploiement. Les changements de date/heure/durée d’atelier restent le lot suivant, avec garde des inscriptions acquises.
