# Horizon et délai minimal de réservation natifs

## Contrat moteur

`bookingWindowPatch` contient exactement `horizonDays` ou `leadMinutes`, sans mélange avec un autre réglage. Les bornes et pas viennent du schéma de la section native et de coerceSetting, le même mécanisme que l’éditeur ; si ce mécanisme arrondit ou borne la valeur demandée, la commande ciblée est refusée au lieu de modifier silencieusement la demande. Aucun mode, délai d’annulation, créneau acquis ou autre champ changé.

L’horizon natif est de 7 à 180 jours. Le délai minimal suit chaque site : salon 0–1440 par 30 minutes, cabinet 0–2880 par 60, restaurant 0–240 par 15. Le GET Prestations expose `bookingWindow` via rdvRules : valeurs effectives du moteur natif, sans inventer une valeur source par défaut. Les rendez-vous confirmés acquis restent inchangés ; seules les disponibilités futures sont recalculées.

## Preuves

**21 nouveaux tests, 47 cas distincts dans trois fichiers, types verts.** Six parcours exacts sont rouges sur le parent : la commande était ignorée et son réglage restait inchangé. Avec correction, trois moteurs ×horizon/délai, aperçu sans écriture, route PUT/GET réelle, résultat identique dans rdvRules, source exacte avec une seule clé modifiée, voisin/champ inconnu/profil/finances conservés, une version. Un véritable rendez-vous fictif confirmé est créé avant chaque modification et ses lignes SQLite restent exactes.

L’horizon de sept jours produit réellement le statut beyond sur une date ultérieure ; le délai de 120 minutes ferme réellement le créneau du jour à 09:30 dans les trois moteurs. Quinze cas invalides, granulations différentes, fractions/chaînes, mélange et version périmée sont refusés sans version. Régressions acquises des horaires du soir et des effectifs restaurant vertes. Aucune règle parallèle de disponibilité ni arrondi manuel.

Logs locaux : `/tmp/parity301-native-booking-window-{parent-red,final,types}.log`. Tests isolés avec sessions/données/rendez-vous fictifs, horloge fixe, fetch interdit et garde réseau. Aucune notification, fournisseur ou dépense. **Ce lot est natif uniquement : pas de nouveau parcours conversationnel ou navigateur revendiqué.**

## Suite

Parent #461/a715c912fff9b56e635b3d208c60f380cdb1671c. Le lot suivant doit raccorder une phrase naturelle exacte, cible de réservation distincte du profil, aperçu natif, accord gratuit explicite, version/reçu atomiques et reprise/conflits. La carte et recette compilée indépendante restent à Claude. Domaine PARTIEL. Aucun nouveau droit A1, composant graphique, projet client, activation, fusion ou déploiement ; CI du SHA livré à suivre séparément.
