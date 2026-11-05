# Régler le tarif futur d’un atelier depuis SYNA

## Contrat pour Claude

`STUDIO_CONVERSATION_BOOKING_WORKSHOP_PRICE=1`, sous LOT_A/AI/CONTEXT, fermé par défaut. Propriétaire/forfait/services/Rendez-vous/cabinet unique, aucun droit A1 ajouté. `workshopPrice` et `workshopPriceExecution`, schéma `syna-workshop-price-1`. Atelier id/date/time/untrustedMetadata.title+trust ; acquiredEnrolments pour situer les acquis ; diff `{before:number|null,after:number,currency:'EUR',basis:'per_person_new_enrolments_only'}`. Coût et providerCalls0, financialConsent false : il s’agit d’un réglage métier gratuit, pas d’une dépense IA.

Phrases vérifiées : `Fixe le tarif de l’atelier « Atelier acquis » à 29,90 € par personne`, `Peux-tu changer le prix de l’atelier “atelier-brume” à 0 euro ?`, `Je voudrais modifier le tarif de l’atelier "Atelier acquis" du 2026-11-10 à 0.29 € par personne`. Titre/ID exact, trois guillemets, date facultative cohérente ; montant explicite en euros, virgule/point et centimes exacts. 0 = futures inscriptions gratuites. Pas de conversion de devise, arrondi, masse, valeur sous-centime ou autre action substituée. OutsideQuotes pour les aiguilleurs.

`confirm-workshop-price` exige proposalId et confirmation true littéral ; `cancel-workshop-price` conserve le tarif. Même source/version/empreinte/TTL15min, identité et instantané public des inscriptions liés à l’aperçu ; nouvel inscrit/annulation exige une nouvelle lecture. Relecture sous verrou, sauvegarde/reçu atomiques, resultVersionId/receiptId, réponse perdue rejouée sans nouvelle version.

**Avertissement obligatoire avant accord** : tarif par personne pour les nouvelles inscriptions seulement ; prix et toutes données des acquis conservés, aucune rétrofacturation, paiement ou notification automatique. Capacité/date/mode inchangés ; démonstration conservée. La carte distingue le tarif futur du nombre d’inscriptions acquises, même si l’ancien tarif de configuration est null. Registre appointments.workshops.price sensible, free et accord gratuit séparé. Carte/handle anti-devis/refresh et recette compilée indépendante quatre formats à Claude sur son SHA intégré ; aucun composant/style/branche Claude modifié.

## Preuves

**34 nouveaux tests,93 cas distincts dans quatre fichiers et types verts.** Trois formulations ×neuf/préparé, aperçus inertes, prix futur exact et nouvelles inscriptions seules au nouveau prix (29.90/0/0.29), anciennes lignes/prix25/jetons/source/profil/préparation/finances conservés. Rejeu après nouvel inscrit rend le reçu historique sans doubler l’écriture.

Bornes/centimes/devise/cible/date/masse/commandes combinées clarifiées ; registre sensible/free/defaultflag, no-op, citations/homonymes, conflits source/tarif/inscription/annulation dont véritable inscrit commis avant verrou SYNA, abandon/contexte/TTL, anciens devis refusés après abandon/flag fermé, reçu rollback/reprise, flag/forfait avant cache, budget IA épuisé gratuit, IA fermée, owner/tab/autre moteur et A1 fermés, demo sans activation, ancien tarif vide sans rétroaction sur prix acquis.

Handlers HTTP authentifiés et SQLite fictive : attente monotone réelle≥17s, GET projet/fil, aperçu stable et aucune version avant accord ; false/absent/chaîne true refusés ; accord, GET prestations relisant prix29.90/capacité3/confirmé1/restant2, anciennes inscriptions intactes et replay un reçu/une version. **Preuve HTTP seulement, pas de nouvelle recette navigateur.** 59 régressions tarif natif/capacité/anti-devis vertes. Aucun test ou garde supprimé. Fetch et réseau fournisseur interdits.

Logs /tmp/parity301-workshop-price-{first,registry,regressions,types-tests}.log. Le contrôle registry ciblé passe seul (les autres cas filtrés ne sont pas comptés comme exécutés) ; les59 régressions ont ensuite été lancées séparément sans filtre et passent. Parent #480/688ef38a501a437d59cd537d1f816f11a19a9de5 ; CI exacte du SHA livré à suivre. Aucun fournisseur/dépense, client réel, paiement, activation, main ou déploiement. Autres paramètres/inscriptions et cartes/recette restent ouverts.
