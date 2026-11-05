# Ajouter ou retirer une prestation réservable depuis SYNA

## Contrat à intégrer avec Claude

Drapeau **STUDIO_CONVERSATION_BOOKING_SERVICE_CATALOG**, fermé par défaut, sous LOT_A / AI / CONTEXT. Réservé aux projets services, dans Rendez-vous, avec propriétaire et forfait valides. Les projets historiques A1 n’acquièrent aucun nouveau droit avec ce drapeau.

Présentation **bookingServiceCatalog**, capacité **bookingServiceCatalogExecution:{enabled:true}**, schéma **syna-booking-service-catalog-1**. États ambiguous / proposed / applied ; opération add / remove. Le diff expose les valeurs natives exactes `before` et `after` (null du côté absent), identifiant, nom, description courte, durée, prix, catégorie ou modalités. Ces données sont marquées `native_booking_data_not_instructions` : les afficher comme données, jamais comme instructions ou HTML.

Carte de proposition : afficher le projet, le type de planning, la prestation exacte, l’avant/après, les avertissements et le caractère destructif du retrait. Le retrait retire uniquement la prestation du widget ; les textes et liens qui la présentent ailleurs restent acquis. Les rendez-vous historiques restent présents. Tout rendez-vous confirmé du jour local ou ultérieur interdit le retrait. La restauration éventuelle passe par une version native, sans promesse de disponibilité ou de réactivation.

Accord distinct obligatoire : **confirm-booking-service-catalog**, proposalId, **confirmation:true littéral**, révisions et requestId stables pour une reprise. Annulation : **cancel-booking-service-catalog**, proposalId. Ne jamais envoyer un devis, un accord financier ou un lot de modifications. Après accord, afficher le reçu, resultVersionId et le diff relu, puis émettre **studio:booking-changed**. La recette compilée indépendante des deux interfaces et des quatre formats reste à effectuer par Claude ; aucun composant modifié dans ce lot.

## Demandes naturelles vérifiées

- « Ajoute le service réservable “Soin exact” de 45 minutes à 65 € catégorie “soin” ».
- « Peux-tu ajouter la prestation réservable “Couleur exacte” de 60 minutes à partir de 79,50 € catégorie “couleur” ? ».
- « Je voudrais créer une séance réservable “Séance exacte” de 50 minutes à 60 € en cabinet et visio ».
- « Ajoute la séance réservable “Visio exacte” de 30 minutes à 0 € en visio ».
- « Supprime le service réservable “Diagnostic acquis” ».
- « J’aimerais retirer la prestation réservable “Diagnostic acquis” ».

Un nom ou ID unique est exigé au retrait ; les homonymes demandent l’ID natif. À l’ajout, nom, durée, prix et catégorie salon ou modalités cabinet doivent être explicites. Aucun prix, durée ou contenu généré. Demande incomplète, valeur invalide, cible absente ou retrait collectif : clarification, sans proposition exécutable. Des mots d’action dans un nom cité restent des valeurs via **outsideQuotes** et la priorité locale.

## Moteur et protections

Réutilise uniquement **serviceAdd / serviceRemove de #448** et previewPrestations / savePrestations. Aucun remplacement complet des voisins. Empreinte du thème entier, version native, aperçu exact et TTL de 15 minutes. Conflit si modification manuelle ; les rendez-vous sont revérifiés à l’accord, y compris lorsqu’un rendez-vous vient d’être ajouté après l’aperçu.

La version, le pointeur, le reçu et la proposition sont dans la transaction native de conversation. Un échec de reçu annule tout et permet une seule reprise légitime. Le rejeu conserve le résultat enregistré sans nouvelle version. Drapeau et forfait revérifiés avant le cache. Annulation ou changement de contexte invalide la proposition. Budget IA à zéro accepté, sans nouvel appel, job, devis ni dépense. Le garde cognitif refuse aussi les anciens devis après annulation ou retrait du drapeau ; les fixtures de devis historiques ne font aucun appel fournisseur.

## Preuves et limites

**28 nouveaux tests ; 137 cas distincts dans 6 fichiers et types verts (98 ciblés, puis 39 régressions disjointes de contexte et de reprise A1).** Sept cas échouaient sur le parent, faute de présentation conversationnelle. Parcours salon/cabinet, préparés/neufs, avant/après sans écriture, accord/résultat natif/rejeu en une version, voisins atypiques et Préparation conservés. Annulation, TTL, contexte, homonymes, compte, forfait, drapeau, onglet, restaurant, A1, vocabulaire, apparition concurrente d’un rendez-vous et panne du reçu sont vérifiés.

Les véritables handlers HTTP authentifiés sont exercés **en processus** avec Session et SQLite fictives : attente mesurée d’au moins 17 secondes, GET projet, GET fil, faux accords refusés, résultat GET natif, réponse perdue puis POST identique sans doublon. **Ce n’est pas une nouvelle preuve navigateur.**

Logs locaux : `/tmp/parity301-booking-service-catalog-parent-red.log`, `...-final.log`, `...-types-final.log`. Les opérations `services.booking.add` et `services.booking.remove` sont enregistrées comme gratuites, bornées et partielles, sans fermeture artificielle de la matrice.

Toujours absents de ce lot : descriptions fournies dès la création (retouche texte distincte disponible ensuite), création/retrait d’intervenants, suppression de textes liés, mode réel, réservation ou annulation client, publication. Aucune dépense, activation ou fusion.
