# #301 — Nouvelle version publicitaire et devis natif

Base : #348 e2d8c8ed. Le vrai POST natif generate,count1 sans approvedEstimateMicro reproduit le refus409 avant toute tâche ou fournisseur. Le bouton de l'éditeur envoyait exactement ce corps après un accord générique, sans le montant exigé par le serveur.

Le parcours demande maintenant le campaign_quote existant pour count1, affiche estimation/plafond/concepts/images dans la confirmation native déjà utilisée, puis transmet exactement estimateMicro comme approvedEstimateMicro. Les pourcentages sont ajoutés côté serveur au devis existant ; aucun garde de dépense n'est abaissé. Absence de devis/IA/disponibilité ou annulation : aucune génération. Même identifiant conservé en cas d'erreur réseau et double clic bloqué. La campagne reste le moteur natif existant : pas un nouveau moteur ni une modification du document acquis.

34 tests PASS dans3 suites :7 tests ciblés du parcours, garde financier intégré et moteur publicitaire V2. L'ancien POST409, l'annulation, le budget révoqué, le tarif augmenté pendant la confirmation et les montants0/insuffisants sont éprouvés. Le positif HTTP lie le devis au job puis le vrai dispatcher/moteur, avec dépendances de copie/image injectées, enregistre de vrais PNG techniques et conserve intégralement les documents et médias acquis. Les images simulées restent PROVISIONAL ; aucune qualité créative fournisseur réel n'est qualifiée.

TypeScript et diff-check réussis. CI complète et recette navigateur du bouton au SHA final à qualifier séparément ; les tests de protocole client ne valent pas un test Playwright. Réseau fournisseur interdit,coût réel0€,aucun client/main/branche Claude/déploiement touché.
