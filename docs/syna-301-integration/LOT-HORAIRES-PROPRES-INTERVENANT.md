# Horaires propres d’un intervenant, moteur et conversation

## Lacune native et correctif

Le thème an-salon expose déjà « Horaires propres (facultatif) » : vide reprend les horaires du salon. Le moteur partagé sait les utiliser, mais staffPatch les refusait. Quatre parcours natifs échouent sur le parent avant correction. Le contrat ciblé réutilise hoursSchema (minutes réelles, fin après début, 24:00 uniquement en fin), enregistre seulement les horaires de l’intervenant exact et expose le champ acquis dans GET Prestations s’il existe. Aucun défaut moteur ou graphique inventé ; identités, voisins et rendez-vous conservés.

Le moteur limite effectivement ces créneaux aux horaires globaux et jours travaillés. Vider ne ferme pas une personne : l’aperçu avertit explicitement de l’héritage. Les rendez-vous déjà pris conservent leurs horaires et leur occupation, même si une nouvelle plage les exclut.

## Contrat Claude

Extension du contrat existant `bookingStaff` / `bookingStaffExecution`, schéma `syna-booking-staff-1`, field **hours**, même BOOKING_STAFF fermé par défaut et mêmes actions confirm/cancel-booking-staff. Pas de nouveau droit A1. Phrase : `Change les horaires propres de l’intervenant « Camille » par « 20:00-22:00 »`. Variante : `Peux-tu modifier les horaires propres de l’intervenant “Camille” à “10:00 - 12:00,14:00-16:00” ?`. Héritage : `Efface les horaires propres de l’intervenant « Camille »` ou valeur explicitement vide. `Fermé` et `aucun` restent des clarifications, jamais des plages globales par défaut.

Diff texte exact canonique avant/après, display d’héritage, warnings natifs, accord gratuit littéral, reçu/version et résultat relu. Métadonnées acquises échappées. Carte/handle doivent accepter field hours ; rafraîchir le lecteur natif et qualifier les quatre formats dans le Studio compilé. Aucun composant/style/branche Claude modifié.

Un test a démontré que l’effacement du contexte laissait une proposition d’intervenant en place. Elle est maintenant supprimée avec les autres propositions lors de clear/select/select-preview/revalidate. Pas de modification du suivi périodique des cibles.

## Preuves et résultats

**34 nouveaux tests (14 natifs +20 conversationnels), 156 cas distincts dans sept fichiers, types verts.** Les vingt conversationnels sont dix-neuf dans la suite finale plus un contrôle additionnel du retrait de forfait avant reçu caché, exécuté séparément. Ce dernier passe déjà sans correctif : aucun défaut de forfait annoncé.

Native : véritables routes PUT/GET, aperçu sans écriture, horaires scindés/soir/24:00/héritage, créneaux partagés effectivement calculés, minutes invalides, inversion, texte, mauvaises cibles et versions, conservation des sources exactes et rendez-vous acquis. Le cas de rejet acquis combinant nom et horaires a été conservé avec des minutes véritablement invalides (09:60) au lieu d’une plage désormais supportée. Aucun test supprimé.

Conversation : phrases polies, valeurs vides/incomplètes, noms citant fermeture/fichier/SEO, no-op, conflits manuels, rendez-vous arrivé après aperçu inchangé, devis et anciens devis cognitifs refusés même après annulation/drapeau fermé, A1 fermé, rollback du reçu et reprise, contexte invalidé. L’échec initial de reprise provenait du test retirant aussi son horloge figée : restauration limitée au spy du reçu, expiration conservée. L’erreur initiale de type était une traduction sans seconde langue ; corrigée.

Parcours handlers HTTP authentifiés : attente monotone réelle ≥17 secondes, GET projet/fil, proposition inchangée, refus des accords false/absent/chaîne true, accord, résultat GET natif, même requête rejouée : une version/un reçu. SQLite et données fictives isolées, finances/profils/préparation acquis conservés, fetch interdit et garde réseau. **Ce n’est pas une recette navigateur compilée** ; elle reste à Claude.

Logs locaux : `/tmp/parity301-native-staff-hours-{parent-red,final}.log`, `/tmp/parity301-booking-staff-hours-{first,final}.log`, `/tmp/parity301-staff-hours-{regressions,plan-replay-verified,types-delivery}.log`. Parent #458/ea90b114108bc722e14ac1e5c1a046ac977116d3. CI du SHA livré à relever séparément.

## Limites

Domaine toujours PARTIEL. Lecteur de disponibilité avec intervenant préféré, réservations clientes et notifications à raccorder/qualifier séparément. Aucune dépense fournisseur, projet client, activation, fusion ou déploiement.
