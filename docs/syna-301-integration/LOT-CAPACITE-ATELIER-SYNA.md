# Régler la capacité d’un atelier exact depuis SYNA

## Contrat pour Claude

`STUDIO_CONVERSATION_BOOKING_WORKSHOP_CAPACITY=1`, sous LOT_A/AI/CONTEXT, fermé par défaut. Propriétaire/forfait/projet services/onglet Rendez-vous/calendrier cabinet natif unique, aucun droit A1 ajouté. `workshopCapacity` et capacité `workshopCapacityExecution`, schéma `syna-workshop-capacity-1` ; ambiguous/proposed/applied. Métadonnées atelier id/date/time/untrustedMetadata.title+trust, diff before/after `{capacity,confirmed,remaining}`, unit places ; avant capacity/remaining peuvent être null si réglage acquis absent/invalide. financialConsent false, coût/providerCalls0, confirmationRequired et warnings, sourceVersionId/resultVersionId/receiptId.

Phrases : `Fixe la capacité de l’atelier « Atelier acquis » à 4 places`, `Peux-tu changer le nombre de places de l’atelier “atelier-brume” à 2 places ?`, `Je voudrais modifier la capacité de l’atelier "Atelier acquis" du 2026-11-10 à 5 places`. Trois guillemets, titre ou ID unique, date facultative mais cohérente, entier1..500 ; homonyme exige l’ID canonique, masse/champs combinés/nombres invalides clarifient. Aiguilleur outsideQuotes, mots d’action cités inertes, aucune autre cible substituée.

`confirm-workshop-capacity` exige proposalId et confirmation littéralement true. `cancel-workshop-capacity` conserve la capacité actuelle. Aperçu natif sans version, identité/source/version/empreinte/TTL15min et **compte confirmé/places liés à l’aperçu**. Nouvelle inscription OU annulation confirmée =nouvel aperçu même si la capacité souhaitée reste suffisante. Relecture sous verrou, sauvegarde et reçu atomiques, résultat natif confirmé, réponse perdue reprise un reçu/une version.

Carte : même atelier/date/heure, capacité totale, nombre confirmé et places restantes avant/après ; aucune inscription touchée, aucun voisin/date/prix/token réécrit, aucune notification. Démonstration conservée explicitement. Si capacité avant null et calendrier déjà live, avertir qu’une capacité valide peut rendre cet atelier réservable selon ses autres règles natives ; aucune modification de mode. Afficher les warnings avant accord. Carte/handle anti-devis, refresh Rendez-vous et recette compilée indépendante Encre/Plein cadre bureau/tactile à Claude sur SHA intégré ; aucun composant/style/branche Claude modifié.

## Preuves et limites

**33 nouveaux tests,101 cas distincts dans quatre fichiers et types verts.**31 premiers verts puis2 contrôles additionnels : nouvelle inscription réellement commise avant verrou SYNA refuse l’ancien compte même quand capacité4 reste suffisante, et ancienne capacité vide réparée avec avertissement explicite.68 régressions socle atelier/lectures naturelles/anti-devis vertes. Aucun test ou garde supprimé.

Trois formulations ×neuf/préparé, aperçu et inscriptions/jetons/source/profil/préparation/finances exacts, résultat natif de places et reprise ; titre/ID/date/homonymes/champs/bornes/mass/quotes/registre, conflits source/capacité/nouvelle inscription/annulation, abandon/contexte/TTL, ancien devis refusé après abandon/flag fermé, reçu rollback puis reprise, flag/forfait avant cache, budget IA épuisé gratuit et IA fermée, owner/tab/autre moteur et A1 fermés, demo sans activation.

Handlers HTTP authentifiés et SQLite fictive isolée : attente monotone réelle≥17s, GET projet/fil, même aperçu et aucune version avant accord ; false/absent/chaîne true refusés ; accord, GET prestations relisant capacité4/confirmé1/restant3, replay un reçu/une version. **Preuve HTTP, pas nouvelle recette navigateur compilée.** Fetch/réseau fournisseur interdits. Aucun client réel modifié, fournisseur/dépense, activation, main ou déploiement.

Logs /tmp/parity301-workshop-capacity-{first,boundaries,regressions,types-delivery}.log. Parent #478/3233c72d65fc8e31da271ddee2cf981ae4546917 ;CI exacte du commit livré à suivre. Nouvelle sous-opération explicite appointments.workshops.capacity, couverture partielle seulement ; autres paramètres/création/inscription et cartes/recettes restent ouverts.
