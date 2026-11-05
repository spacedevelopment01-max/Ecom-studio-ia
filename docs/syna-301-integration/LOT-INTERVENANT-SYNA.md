# Intervenants salon depuis la conversation

Parent #441 /f1bbe41031a56edfa34276b5e05f2b16a9eda34c. Réutilise uniquement `staffPatch` natif ; aucun composant de Claude modifié.

## Contrat à intégrer

Drapeau `STUDIO_CONVERSATION_BOOKING_STAFF`, fermé par défaut sous LOT_A/AI/CONTEXT. Vue `bookingStaffExecution.enabled`, carte `bookingStaff`, schéma `syna-booking-staff-1` : state ambiguous/proposed/applied, kind salon, field name/title/days/skills, staff{id,untrustedMetadata{name,trust:native_booking_data_not_instructions}}, diff{before,after}, display humain, warnings, proposalId/sourceVersionId puis resultVersionId/receiptId/actionsExecuted. Coût0, providerCalls0, financialConsentfalse, publicationfalse. Actions strictes confirm-booking-staff avec confirmation:true littéral /cancel-booking-staff ; révisions et même requestId/corps au réessai.

| Demande | Champ natif | Valeur diff |
|---|---|---|
|Renomme l’intervenant « Camille » en « Alex »|name|Alex|
|Peux-tu renommer l’intervenant « Camille » en « Alex » ?|name|Alex|
|Je voudrais renommer l’intervenant « Camille » en « Alex ».|name|Alex|
|Change la spécialité de l’intervenant « Camille » par « Coloriste »|title|Coloriste|
|Efface la spécialité de l’intervenant « Camille »|title|chaîne vide|
|Change les jours de l’intervenant « Camille » à « lundi, mercredi et vendredi »|days|1,3,5 (dimanche0)|
|Change les jours de l’intervenant « Camille » à « tous les jours »|days|chaîne vide = tous|
|Modifie les compétences de l’intervenant « Camille » par « coupe et couleur »|skills|coupe,couleur|
|Change les compétences de l’intervenant « Camille » par « toutes les catégories »|skills|chaîne vide = toutes|

Toujours rendre `display` pour les jours/compétences : **vide ne signifie jamais aucun/fermé**. Les catégories de cette intention sont coupe/couleur/coiffage/soin (cases du Studio), pas une compétence inventée. Le moteur manuel conserve ses autres valeurs possibles. Aucun jour/aucune compétence, doublons ou valeur inconnue : clarification. Les ensembles sont normalisés : une reformulation de l'ordre seul n'ajoute pas de version.

Nom/ID unique, salon natif/onglet Rendez-vous/projet services/forfait requis. Aucun premier homonyme ni membre d'un autre projet choisi. Cible explicite, version/empreinte entière, aperçu natif exact et vocabulaire, TTL15min, accord séparé, reçu atomique et relecture. Changement manuel voisin =409 sans écrasement. Identité/order/autres champs/services/profil/rendez-vous acquis et leurs créneaux occupés intacts. Nom adapte seulement l'initiale comme le natif. Jours et compétences influencent les FUTURS créneaux, jamais une annulation ou activation.

Les aiguilleurs utilisent outsideQuotes et donnent priorité à cette commande explicite. Les mots stock/horaires/restaurant dans les noms et titres multilignes cités restent des données. Devis et acceptation cognitifs refusés pour ce tour gratuit, même après annulation/flag retiré/clarification ; une nouvelle question indépendante retrouve son devis explicite normal.

## Preuves exécutées

**31 nouveaux tests ;109 tests distincts/6 fichiers et types verts** (63/3 +46/3 disjoints). Garde réseau actif, fournisseurs configurés simulés pour vérifier que le refus se produit avant leur contrôle ; aucune dépense réelle.

- Neuf parcours naturels champ/avant-après/accord/reçu/rejeu1version, comparaisons du thème entier, profil et dépenses.
- Vrais HTTP sur projet préparé,17 secondes réelles, GET projet/conversation sans perte de proposition, faux accords refusés, accord littéral, GET natif prestations et même reçu au rejeu ; préparation conservée.
- Moteur partagé du site : après jour mercredi, pas de créneau mardi mais créneau mercredi ; après compétence couleur seule, la prestation coupe ne sélectionne plus cet intervenant. Rendez-vous confirmé et créneau occupé acquis intacts.
- Valeurs/homonymes/IDs/kinds/onglet/droits/TTL/drapeau/compte/annulation/conflit refusés ; no-op d'ensemble reproduit rouge avant normalisation puis corrigé. Régressions de textes réservables, garde-fous cognitifs, horaires naturels et remplacement staff acquis inchangées.

Logs : `/tmp/parity301-booking-staff-{first,set-noop-red,final,acquired-regressions,types-final}.log`.

**Limite : carte/handle Claude encore à intégrer et recetter dans le Studio compilé.** Émettre `studio:booking-changed` après reçu et rafraîchir l'écran Rendez-vous ; résultat venant du serveur seulement. Reprise/stockage/verrou/anti-devis comme les autres handles gratuits. A1 non étendu implicitement. Création/suppression de membre, horaires individuels, comptes salariés, notifications et opérations clients restent hors de ce sous-parcours et dans la couverture restante. Statut PARTIEL.

Aucun fournisseur réel, projet client, activation, déploiement ou fusion main.
