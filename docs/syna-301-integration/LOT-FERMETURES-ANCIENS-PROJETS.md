# Fermetures datées dans une reprise A1

Parent : #445, commit 0272c9eaf667a2d335a5653fb85bd1508b22eb64. Ce lot réutilise les moteurs et accords d’ajout et de retrait #428/#429, sans nouvelle mémoire ni Préparation.

## Contrat pour Claude

Le drapeau `STUDIO_CONVERSATION_EXISTING_BOOKING_CLOSURES` reste fermé par défaut. Il exige EXISTING_LOCAL, BOOKING_CLOSURES, LOT_A, AI, CONTEXT et un projet de services. Le serveur accorde uniquement `recovery.localEdits.ops: booking-closures`, avec confirmation obligatoire, coût et appels fournisseur nuls. Le droit de lecture ou celui des horaires ne suffit jamais.

La carte `bookingClosures`, sa capacité `bookingClosuresExecution` et le schéma `syna-booking-closures-1` restent identiques. Les actions sont `confirm-booking-closures` avec `confirmation:true` littéral et `cancel-booking-closures`. Utiliser **`localEditAllowed(view,'booking-closures')`**, puis émettre `studio:booking-changed` après le reçu natif. Le helper général `nativeLocalEditAllowed` reste faux dans A1.

Afficher les dates inclusives, le fuseau, l’avant/après et les avertissements. Retirer une fermeture ne garantit ni disponibilité ni ouverture hebdomadaire. Les phrases sont celles du moteur acquis :

- `Ferme les réservations le 2026-11-20` ;
- `Ajoute une fermeture des réservations du 2026-11-20 au 2026-11-21` ;
- `Retire la fermeture des réservations le 2026-11-26`.

Les trois moteurs sont pris en charge : salon, cabinet et restaurant. L’aiguilleur daté précède celui des horaires et conserve `outsideQuotes`. Les deux droits peuvent être ouverts ensemble ; leurs propositions et accords restent distincts.

## Gardes conservés

Le retrait du droit ou du drapeau est vérifié avant le cache, pour l’ancienne proposition comme pour le reçu. GET ne renvoie plus la carte après retrait. Les conflits de version et d’empreinte, la durée de validité, le type natif, l’onglet et les droits sont recontrôlés par le moteur existant.

Un accord crée une seule version et modifie seulement les dates ciblées. Les anciennes versions et les autres réglages sont conservés. Aucune réservation n’est activée, annulée ou déplacée. Préparation reste absente, projectRevision reste nul et les autres actions A1 ainsi que l’IA générale restent fermées.

## Preuves exécutées

**20 nouveaux tests ; 96 cas distincts dans 5 fichiers et types verts.** Cela comprend 50 cas dans 3 fichiers, un cas supplémentaire de coexistence des droits, puis 45 régressions A1 disjointes. Les 50 cas n’ont pas été rejoués pour ce seul ajout. Sur le parent exact, les six parcours ajout/retrait des trois moteurs échouaient faute de raccordement.

Les tests comparent le thème entier : seul `closures` change. Ils vérifient l’aperçu sans écriture, l’accord, le reçu et le rejeu avec une seule version. Les anciennes versions restent exactes. Le projet ne change que par son pointeur et sa date de version natifs ; les autres tables, octets, profils, ancien shop.chat et réservations acquises restent identiques. Fermer la date d’une réservation confirmée conserve son enregistrement dans les trois moteurs. Un budget IA épuisé permet cette opération gratuite sans consommation.

Annulation, expiration, conflit, drapeaux, retrait avant cache, forfait, compte, produit et autres domaines sont vérifiés. Une erreur lors de l’écriture du reçu annule aussi la version et le pointeur ; le réessai légitime crée ensuite une seule version. Avec les droits datés et hebdomadaires ouverts ensemble, une proposition datée abandonnée ne peut pas consommer l’accord hebdomadaire voisin.

Les handlers HTTP authentifiés sont exercés **en processus**, avec Session/SQLite réelles et données fictives. Après 17 secondes réelles et GET projet/fil, la proposition est conservée, les faux accords sont refusés, le résultat est relu par le GET natif et le reçu rejoué n’ajoute ni tour ni version. Ce ne sont pas de nouvelles preuves navigateur : la recette Next/Chromium de la carte reste à faire.

Logs locaux : `/tmp/parity301-existing-booking-closures-{parent-red,final,combined-rights,acquired-regressions,types-final}.log`.

La carte et son handle A1, la recette compilée indépendante de Claude et la CI finale du commit commun restent nécessaires. Statut PARTIEL. Ce droit n’ouvre pas les autres paramètres restaurant, intervenants, textes, créations, suppressions ou actions clients. Aucun fournisseur, client ou rendez-vous réel, activation, déploiement ou fusion main.
