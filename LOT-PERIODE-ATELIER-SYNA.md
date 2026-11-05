# Période d’atelier depuis une demande naturelle

Parent #485 / b13f36a05de7c1bafa8914881daa189572321d85. Moteur et contrat conversationnels ; aucune carte, composant, branche ou style Claude modifié.

## Contrat pour intégration

Drapeau fermé par défaut `STUDIO_CONVERSATION_BOOKING_WORKSHOP_SCHEDULE=1` avec LOT_A/AI/CONTEXT. Registre `appointments.workshops.schedule`, sensible, gratuit, preuve `isolated_local_execution`, périmètre `native_exact_workshop_period_backend_partial_ui_pending`.

`workshopSchedule` / `workshopScheduleExecution`, schéma `syna-workshop-schedule-1`. Cible `workshop.id` et `untrustedMetadata.title/trust` ; `timezone`, `acquiredEnrolments`, diff avant/après `{date,time,durationMinutes}`. `confirmationRequired`, coût0, fournisseur0, financialConsent=false, publication=false. Accord `confirm-workshop-schedule` avec proposalId et true littéral ; `cancel-workshop-schedule` abandonne la proposition et conserve la période.

Demandes : reprogrammation complète datée/heures/minutes ou changement de la date, heure ou durée seule. Trois styles de guillemets, politesse et heures HH:MM/15h/15h30. Aucune date relative devinée pour une écriture, aucun lot ou ajout de commande implicite. Aiguilleur via `outsideQuotes(text)` ; un titre cité contenant suppression ou fermeture reste une donnée non fiable.

## Moteurs et protections

Réutilise exclusivement previewPrestations/savePrestations/workshopSchedulePatch du lot natif : identité et calendrier uniques, période exacte future et occupation réelle, aucun déplacement implicite d’inscrit confirmé. Prix, capacités, jetons, profils, préparation et voisins conservés. Source/version/empreinte complète, ligne atelier et inscriptions liés à l’aperçu, TTL15min, relecture sous verrou et relecture native du résultat. Un changement d’occupation par séance concurrente invalide aussi l’accord. Le reçu et la version sont atomiques ; la perte de réponse se reprend par le même requestId.

Contrôle drapeau/forfait avant cache, A1 fermé, refus des anciens et nouveaux devis cognitifs même après abandon/drapeau fermé, source sous consigne de vocabulaire non ciblée refusée, mode démo conservé. Le prix du forfait n’est pas consommé pour cette retouche ; aucune réservation ni e-mail créé par SYNA. Les inscriptions des tests positifs sont des appels natifs fictifs séparés prouvant la période réellement utilisée.

## Vérifications exécutées

**36 nouveaux tests ;124 cas distincts/cinq fichiers, tous verts**, dont88 régressions capacité/tarif/anti-devis/bilan. Types verts et `git diff --check`. Logs `/tmp/parity301-workshop-schedule-conversation-{final,types}.log`.

Huit parcours neuf/préparé, phrase/cible/aperçu/accord/résultat natif, homonymes/ID précis, injections citées, no-op, frontières/ambiguïtés, acquises et confidentialité, source/période/inscription/séance concurrentes, abandon/contexte/TTL, reçu en erreur et reprise, plan/drapeau avant cache, budget épuisé/A1/démo/droits. Inscription réellement commise avant verrou SYNA refusée sans écrasement. Handlers HTTP/session/SQLite réels : attente monotone **≥17 secondes**, GET projet+fil conservant proposition, true obligatoire, GET Prestations après accord et relecture, un reçu/une version malgré renvoi de réponse perdue.

Premier lancement interrompu sans verdict (log seulement RUN) non comptabilisé. Relance :35 verts/1 échec lors de la fixture séance concurrente, avant conflit ; diagnostic ciblé a confirmé le mercredi natif closed. Fixture ouvrant explicitement mercredi09–18, assertion native open conservée, suite et régressions intégralement rejouées ; aucun garde affaibli. Logs initial/resumed/fixture-diagnostic conservés.

## Restant

Carte/handles anti-devis et résultat lisible dans le Studio compilé, rafraîchissement17s et quatre formats Encre/Plein cadre : à intégrer et qualifier indépendamment avec Claude sur un SHA exact. Le test HTTP n’est pas une preuve navigateur. CI complète du commit livré à suivre séparément ; aucun verdict global anticipé. Le déplacement des personnes déjà inscrites demeure un périmètre distinct non livré. Aucune dépense réelle, donnée cliente, activation, fusion main ou déploiement.
