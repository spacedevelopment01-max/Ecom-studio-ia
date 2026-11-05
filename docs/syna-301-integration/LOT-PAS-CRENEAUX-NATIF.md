# Pas natif des créneaux, sans déplacer les rendez-vous acquis

`bookingWindowPatch.slotStepMinutes` étend le contrat exclusif des règles natives : une seule règle à la fois. GET Prestations expose ce pas effectif via rdvRules ; null au restaurant, qui fonctionne avec des horaires de services explicites. Le schéma et coerceSetting imposent les pas exacts de l’éditeur : salon 10–60 par 5 minutes, cabinet 15–120 par 15. Tout arrondi implicite est refusé. Aucun délai, durée de prestation, mode, intervenant ou rendez-vous modifié en même temps.

**12 nouveaux tests, 33 cas distincts dans deux fichiers et types verts.** Les deux parcours exacts sont rouges sur le parent. Avec correction, véritable rendez-vous fictif à 09:30, aperçu sans écriture, PUT/GET natifs et grille des deux moteurs après passage à 60 minutes : 09:00, 10:00, 11:00. Le rendez-vous acquis à 09:30 et son identité restent exacts. Une nouvelle demande à 09:30 hors grille est refusée sans écriture. Source modifiée sur une seule clé, une version, finances conservées. Bornes/pas/fractions/chaînes/mélanges/version périmée refusés ; restaurant sans substitution. Les 21 régressions horizon/délai restent vertes après extension du sélecteur de champ.

Sessions, données et rendez-vous fictifs dans SQLite isolée, horloge fixe, fetch interdit et garde réseau, aucune notification. Logs locaux : `/tmp/parity301-native-slot-step-{parent-red,final,types}.log`. Parent #463/10acd660ea77fe891f286a59b6fc794a642023b3.

Lot moteur uniquement ; aucune nouvelle phrase, carte ou preuve navigateur revendiquée. Raccordement conversationnel suivant séparé, sans nouveau droit A1. Domaine PARTIEL, CI du SHA livré à relever séparément. Aucun composant Claude, fournisseur, client réel, activation, fusion ou déploiement.
