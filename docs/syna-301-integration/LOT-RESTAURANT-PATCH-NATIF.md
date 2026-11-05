# Restaurant : fermeture réelle et retouche native ciblée

Base #424/1c0166f7, elle-même issue de main6354f327 (#422). Deux prérequis de sûreté avant les créneaux conversationnels :

- Fermeture de tous les jours : l’éditeur enregistre open_days vide, mais le serveur convertissait la valeur vide en0 (dimanche), et le script public utilisait alors tous les jours par défaut. Le test API/source native est rouge ; l’exécution réelle de rules() du script public dans une VM est aussi rouge. Correction : aucun nombre n’est créé à partir d’un segment vide ; le client distingue une valeur absente d’une fermeture explicitement vide. Les valeurs par défaut existantes des champs absents ne sont pas changées.
- Retouche d’un service : nouveau restaurantPatch strict, borné aux champs natifs openDays/lunchSlots/dinnerSlots, sans reconstruire les voisins depuis un DTO qui pourrait normaliser une capacité vide/inconnue. Les règles des champs sont celles du schéma natif existant. Cible non restaurant409 ; mélange avec remplacement complet400 ; champs non prévus/valeur invalide/patch vide400. Le moteur et l’aperçu existants restent uniques.

Neuf nouveaux cas, huit rouges avant le patch et un rouge public séparé, puis32tests sur4fichiers et types verts. Vrais GET/PUT authentifiés, fermeture de tous les jours, conservation exacte des champs inconnus et capacité acquise, refus atomiques, garde de version/types et contrôle public des jours fermés. Régressions TABLE SAISON, prestations et formats horaires conservées. Les jours, créneaux et champs voisins non ciblés ne sont pas réécrits. Aucun nouveau coût ou abonnement.

Journaux /tmp/parity301-restaurant-{native-red,native-green,public-red,native-delivery,native-types}.log ; NODE_OPTIONS charge scripts/lot9/network-guard.mjs. Aucun fournisseur, client, message réel ou activation. Le seul JavaScript du thème modifié est le parseur natif des jours, aucune modification graphique ni branche Claude.

Ce lot n’ajoute pas de carte SYNA et ne déclare pas toute la réservation raccordée. Contrat conversationnel midi/soir et recette du SHA commun à poursuivre avec Claude ; CI du commit livré à observer. Aucune fusion main, mise en production ou dépense réelle.
