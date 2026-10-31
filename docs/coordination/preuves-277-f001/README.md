# Preuves indépendantes #277 — candidat f0019338

**Application compilée : `f0019338a4b975f2daabc8ee912a339c2107b2b7`, production, arbre propre au build.** Nouveaux comptes, stockage et images synthétiques. Aucun client, fournisseur réel, déploiement ou publication externe.

Les quatre captures suivantes proviennent de **sites publiés dans l’instance locale, servis par leur Host avec bind `localhost`**, pas de la démonstration commerciale. Rectangles de couleur = illustrations techniques fictives ; ils ne qualifient pas une création IA ni l’esthétique des thèmes avec leurs vraies photos.

- [Agence, achat sur téléphone](01-agence-mobile.png)
- [Agence, location sur ordinateur](02-agence-ordinateur.png)
- [Réalisations, téléphone](03-service-mobile.png)
- [Réalisations, ordinateur](04-service-ordinateur.png)

[Recette HTTP/navigateur localhost](metiers-localhost-final.json) : dix rendus à 200, pas d’image cassée ou débordement ; publication locale V1/V2/restauration, demande de devis stockée sans e-mail réel, réservation de fixture 201, droits 401/404/403/428/409. Les captures ont été ouvertes et inspectées.

**Le cas bind `127.0.0.1` reste rouge et distinct** : [échec strict final](metiers-127-final.json), [variantes Host/proxy](host-127-variantes.json), [trace d’en-têtes](host-127-trace.txt), [témoin A/B localhost sur les mêmes publications](host-localhost-temoin.json). Aucun en-tête forgé n’est admis pour contourner la garde. Le site n’est pas déclaré opérationnel dans tous les modes de lancement.

Autres preuves : [conservation des sources](conservation.json) · [parcours communs SYNA produit/service](parcours-syna.json) · [trois applications logo / kits](logos.json) · [Theme Check réel et ses 35 avertissements par ZIP](shopify-avertissements.json) · [commandes, dates, SHA, échecs et empreintes des journaux](commandes.json).

Les tests métier natifs, les parcours SYNA sous faux fournisseur HTTP et les nouvelles sondes de contrats sont des recettes distinctes. Leur réunion ne prouve pas une création conversationnelle complète de zéro, un outil SYNA métier encore absent, un SMTP public, un agenda externe ou une installation CMS.
