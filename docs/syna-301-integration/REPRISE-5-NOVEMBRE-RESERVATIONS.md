## Reprise active — 5 novembre 2026, 17 h 48 UTC

**SYNA reste incomplète.** Livré **#459 /e370e720211a4d4eed59d0998e503ea9902dced0**, parent #458/ea90b114 puis #457/e31c3171, #456/35bb6fc3. Horaires propres natifs +conversation, field hours dans bookingStaff existant/même BOOKING_STAFF/actions, aucun droit A1. 34 nouveaux tests (14 natifs,20 conversationnels),156 distincts/sept fichiers/types. Les vingt nouveaux conversationnels sont19 dans la suite finale +1 contrôle additionnel du retrait de forfait avant rejeu, déjà correct sans correction. Quatre parcours natifs rouges sur parent ; défaut de proposition d’intervenant encore visible après clear démontré puis corrigé. Vide signifie héritage du salon et non fermeture ;rendez-vous acquis inchangés. Rapport LOT-HORAIRES-PROPRES-INTERVENANT.md. Contrats transmis à Claude commentaire6665063783 ;cartes et recette compilée toujours ouvertes.

Cumul **735 nouveaux tests distincts #423–#459**. Matrice178 opérations,80 PARTIEL/68 ABSENT/4 NON_TESTE/26 BLOQUE, aucune complète. Main distante revérifiée identique #422/6354f327888d70c64ce4d86604b7b8fdc768947c.

**En cours** `/workspace/work/parity301-file-trash-syna`, branche `codex/parity301-staff-availability-read` issue de e370e720 : lecteur bookingAvailability avec préférence d’un intervenant exact, via moteur salon.availability. Modifications non encore testées/livrées. Ajouter cas identité ambiguë/incompatible/retirée, pas de repli any, relecture GET après occupation/renommage, A1 readonly exact,17s et finances/tables inchangées. Le mot réservé moteur any ne doit jamais élargir une préférence explicite. Aucun composant Claude.

CI : #458 run42076618873 en cours ;#459 à relever. #456 suite/types/Docker/confirmation verts,recettes longues en cours ;#455 même situation. #457 Docker vert,autres en cours au dernier relevé. #452 relance acceptée après annulation ~100min. #450/#453/#454 entièrement vertes ;aucun report entre SHA. Point précédent garde tous les détails des lots. Aucun fournisseur,client,activation,fusion ou déploiement.

## Reprise active — 5 novembre 2026, 17 h 43 UTC

**La mission reste incomplète.** Livraison **#458 /ea90b114108bc722e14ac1e5c1a046ac977116d3**, parent #457/e31c3171 puis #456/35bb6fc3. 31 nouveaux tests, 153 cas ciblés distincts /six fichiers et types verts. Catalogue naturel d’intervenants avec DTO bookingStaffCatalog/Execution, schéma syna-booking-staff-catalog-1, BOOKING_STAFF_CATALOG fermé par défaut, confirm/cancel-booking-staff-catalog, confirmation littéralement true. Aucun droit A1, carte ou preuve navigateur acquis par ce lot. Contrats précis dans LOT-INTERVENANTS-AJOUT-RETRAIT-SYNA.md, transmis à Claude #301 commentaire6664898663. Cumul **701 nouveaux tests distincts #423–#458**.

Matrice **178 opérations uniques :80 PARTIEL /68 ABSENT /4 NON_TESTE /26 BLOQUE**, aucune complète. Deux sous-actions natives réelles ajout/retrait d’intervenant détaillées, domaine parent toujours partiel. Ne pas compter les régressions répétées comme nouveaux tests.

**Lot suivant en cours** : `/workspace/work/parity301-file-trash-syna`, branche `codex/parity301-native-staff-hours`, parent ea90b114. Horaires propres natifs déjà présents dans an-salon.liquid, moteur worksAt ; contrat staffPatch ne les expose pas. Nouveau test tests/parity301-native-staff-hours.test.ts en cours de preuve rouge, aucun code corrigé à ce point. Réutiliser hoursSchema, pas de transformation des rendez-vous acquis. Vide signifie héritage des horaires du salon, jamais fermeture individuelle. Ne pas modifier les composants Claude.

CI #454/0262f6fc entièrement verte (run42063364492, cinq contrôles). #452/fb38 annulée après environ100minutes pendant recette sociale, log « The operation was canceled » ; relance des échecs acceptée. Aucun défaut produit démontré. #455 tête2a51 suite/types, Docker et confirmation verts, recettes longues en cours. #456 run42070019372 et #457 run42075423988 en cours. #458 à relever. Aucun contrôle gratuit rendu optionnel, aucune CI héritée d’un autre SHA. Pas de dépense, activation client, publication ou fusion.

## Reprise active — 5 novembre 2026, 17 h 40 UTC

**SYNA complète n’est pas terminée.** Dernier lot livré : **#457 / e31c3171d65e7b7ce06aea578ca44fbdeddc3213**, moteur natif staffAdd/staffRemove, parent **#456 /35bb6fc3df09c832b75fb01b1d91f28d5550871e**, après #455 tête **2a51db4300769980243186c1719426b3ec314af6** (code 0a538370 + horloge fixe). Main de référence reste #422 /6354f327888d70c64ce4d86604b7b8fdc768947c ; aucun merge/deploy/activation.

#456 : 11 nouveaux tests rouges avant déplacement de neuf lectures de configuration sous le verrou de réservation ; 55 cas distincts et types verts. Trois moteurs, création/déplacements client et professionnel, capacités restaurant/atelier. Ordonnancement déterministe d’une véritable publication concurrente, pas preuve multiprocessus.

#457 : 25 nouveaux tests, 92 cas distincts dans cinq fichiers et types verts ; dernier avertissement recontrôlé séparément. Ajout ciblé, conservation des voisins et des identités opaques/canoniques, retrait bloqué par rendez-vous confirmé du jour local ou à venir et erreur SQL. Deux cas rouges supplémentaires ont révélé le contournement par libellé acquis vide, corrigé sans modifier ce libellé ni les rendez-vous. Rapport LOT-INTERVENANTS-AJOUT-RETRAIT-NATIFS.md. Politique de remplacement manuel complet inchangée. Pas encore de carte ou de recette conversationnelle pour ce contrat.

**En cours** dans `/workspace/work/parity301-file-trash-syna`, branche `codex/parity301-booking-staff-catalog-conversation` issue de #457 : raccordement naturel BOOKING_STAFF_CATALOG, aperçu/accord gratuit/reçu/rejeu, réutilisation du parseur natif de jours et catégories. Modifications non encore livrées, ne pas les annoncer validées. Reprendre les logs `/tmp/parity301-booking-staff-catalog-first.log` et les types. Carte, handle et recette Studio compilée indépendante à Claude ; ne pas modifier ses composants. Aucun droit A1 nouveau.

CI relevée : **#450 /5eb35dc0 entièrement verte** (run42056767665, cinq contrôles, après relance installation ONNX HTTP504), **#453 /c2f9798a entièrement verte** (run42061429264, cinq contrôles). #452 et #454 : suite/types, Docker, confirmation gratuite verts ; recettes longues encore en cours. #455 tête2a51 : Docker/confirmation verts, autres en cours. #456/#457 à relever. Ne pas reporter la CI d’un descendant sur un autre commit.

Cumul **670 nouveaux tests distincts #423–#457**, sans additionner les régressions répétées. Matrice encore **176 opérations uniques, 78 PARTIEL /68 ABSENT /4 NON_TESTE /26 BLOQUE**, aucune complète ; le moteur staffAdd/remove ne ferme pas les parcours conversationnels. Coordination Claude #301 commentaire6664747532. Fournisseurs interdits et fetch refusé, SQLite isolée et projets fictifs. Les anciennes preuves navigateur ne qualifient pas ces nouveaux contrats.

## Reprise active — 5 novembre 2026, 16 h 36 UTC / 17 h 36 Paris

**La mission SYNA complète n’est pas terminée.** Dernière tête fonctionnelle : **#455 / 0a538370b7b61198b9a3d9e10029d8403001b04c**, branche `codex/parity301-native-booking-id-alias-guards`, checkout `/workspace/work/parity301-file-trash-syna`, propre. Parent **#454 / 0262f6fcaddeac7d2d253a525ba717203e4b1239**, puis #453/c2f9798a, #452/fb38d8c5, #451/545c9643, #450/5eb35dc0. Main locale et distante ont été comparées : **6354f327888d70c64ce4d86604b7b8fdc768947c**, toujours #422.

#454 ouvre uniquement les deux lectures en reprise historique sous droits **EXISTING_BOOKING_AVAILABILITY_READ** et **EXISTING_BOOKING_WORKSHOPS_READ**, fermés et indépendants. Chacun exige son lecteur natif/LOT_A/AI/CONTEXT/projet services. Aucun EXISTING_LOCAL requis ou accordé. Helpers cartes A1 : `localReadAllowed(view,'booking-availability')` et `localReadAllowed(view,'booking-workshops')`. `nativeLocalEditAllowed` reste faux ; actionsEnabled/aiEnabled faux, projectRevision null, Préparation absente. **18 nouveaux /94 cas distincts dans5fichiers/types verts** ; quatre rouges parent, deux vrais HTTP17s avec occupation concurrente/GET/nouvelobservedAt/rejeu1tour. Sources, versions, shop.chat, fichiers/octets et finances exacts ;IA0 et transition entre lecteurs,révocation avantcache,produits/compte/forfait/forgeries/mutateurs/cognition refusés. Rapport LOT-DISPONIBILITES-ATELIERS-ANCIENS-PROJETS.md ;coordination#301 commentaire6663136629. Carte et recette navigateur A1 restent ouvertes.

#455 est un préalable natif découvert avant l’ajout/retrait d’intervenants. **Diagnostic__ID** est conservé dans la source mais réservé par les moteurs sous **diagnostic-id** ;les compteurs ignoraient ces rendez-vous et autorisaient la suppression. Les ajouts pouvaient créer deux identités moteur identiques,également pour les intervenants. Les propriétés héritées `toString` contournaient le garde du formulaire complet. Correction :comptage des deux formes sans double compte et uniquement propriétés propres,réservation des identités moteur lors des nouvelles allocations via les normaliseurs natifs. **Aucun identifiant acquis, rendez-vous, client, jeton ou normaliseur public réécrit.**

**11 nouveaux /83 cas distincts dans6fichiers/types verts** ;9 rouges parent puis2 rouges `toString` avant correction des propriétés héritées. Vrais rendez-vous natifs futurs +PUT authentifiés,refus sans version,avertissements durée rétablis,ajout ciblé/formulaire complet et intervenant sans collision,dates/fuseaux/erreur SQL/identités bornées acquis conservés. Logs /tmp/parity301-native-booking-id-alias-{parent-red,final,identity-regressions,types-final}.log et /tmp/parity301-native-booking-id-prototype-red.log. Rapport LOT-IDENTITES-RESERVATIONS-ACQUISES.md ;coordination#301 commentaire6663472387. Pas de nouveau drapeau,DTO,carte ou preuve navigateur. Pour reprendre ce commit isolément,préalables natifs #447/#448 nécessaires.

**634 nouveaux tests distincts #423–#455. Matrice176 opérations :78 PARTIEL /68 ABSENT /4 NON_TESTE /26 BLOQUE**,aucune complète. Les deux lectures A1 enrichissent leurs opérations existantes,sans créer d’unité artificielle. Les totaux de régressions se chevauchent,ne pas les additionner.

**CI :#437 tentative2 et #446/1ffe53c6 entièrement vertes** ;#446 run42050769407 :6585tests/31skip,677fichiers/1skip. **#447/f99e481a run42052877760 et #449/fc47fd31 run42055496675 entièrement vertes**,5contrôles dont confirmation gratuite obligatoire et verdict. #438–#445 aussi entièrement vertes sur leurs SHA vérifiés. #448 run42053895964 :suite/Docker/A4 verts,natif encore en cours au dernier contrôle. #450–#455 déclenchements/CI àsuivre ;ne pas inférer de vert par héritage. Aucun code CI affaibli,relances seulement pour défauts d’infrastructure démontrés ou jobs échoués. Le push documentaire rejeté ponctuellement avec commit_refs_rules a réussi à la relance,ce blocage est résolu.

**Prochaine lacune :ajout/retrait ciblés d’intervenants natifs du salon**, puis phrases/accords gratuits. Audit en lecture fait : `src/components/studio/prestations-editor.tsx:85` retire un intervenant et ligne97 en ajoute un ;le moteur actuel n’accepte que remplacement complet staff ou staffPatch. Source déjà validée et correctif d’alias #455 àréutiliser. Aucun code de ce nouveau lot commencé.

Prévoir staffAdd sansID fourni et staffRemove:{id},stricts/exclusifs,uniquement salon,limite20,préserver tout voisin/champ inconnu/valeur vide/ordre implicite. Allouer via newNativeId en réservant aussi engineStaffId,ne jamais modifier un ID acquis. Retrait ciblé prudent :si rendez-vous confirmé du jour local ou futur attribué à cet intervenant (IDsource ou moteur),clarifier/refuser sans annuler ou réaffecter. Compteurs sous no-AI et erreursSQL failclosed,timezone native ;distinguer cette restriction ciblée du remplacement manuel acquis,ne pas modifier son périmètre sans défaut démontré. Afficher clairement avant accord si dernier intervenant :aucun créneau ne sera proposé. Sourceversion/empreinte/TTL/reçu atomique/rejeu/droits comme les autres lots. Jours vides=tous et compétences vides=toutes ;ne jamais interpréter «aucun» comme aucunjour/service. Les phrases devront exiger ou afficher explicitement ce choix avant accord. Tester moteurs réels SQLite et champs/rdv acquis,aucun fournisseur/client/mail/activation.

Environnement fonctionne. Tous Node/tests/build sous network-guard ;GitHub via connecteur,gitpush helper CLI par commande. PRcréation utilise les alias head_branch/base_branch si erreur interne ;rechercher le head avant toute répétition pour éviter doublon. Documentation cumulative sur `codex/parity301-booking-resume`,distincte de la tête fonctionnelle. Aucun travail graphique Claude,main,fournisseur réel ou déploiement modifié. Poursuivre sans attendre les CI ou une nouvelle consigne ;anciennes reprises ci-dessous historiques.

## Reprise active — 5 novembre 2026, 16 h 09 UTC / 17 h 09 Paris

**Mission globale toujours incomplète.** Dernière tête fonctionnelle **#453 / c2f9798aa902469176b68cda7edc3e5c40c4b51d**, branche codex/parity301-cabinet-workshop-availability, checkout /workspace/work/parity301-file-trash-syna, propre. Parent #452/fb38d8c5, précédé de #451/545c9643 et #450/5eb35dc0. Aucun composant Claude modifié.

#453 raccorde les **places des ateliers collectifs cabinet**, en lecture seule :cabinet.workshops/takenFor/atelierStatus,confirmés typeatelier seulement ;annulés/séances/nombres démo ignorés. **23 nouveaux /91 cas distincts dans4fichiers/types**. Deux rouges fonctionnels vérifiés sur parent après correction de fixture(tokens danscabinet_tokens,modalité renseignée) ;aucun faux défaut produit déduit de cette erreur. Empreintes de toutes tables métier et fichiers conservées,aucun contact/note/jeton exposé. Plein puis annulation relus,null/invalid conservés,homonymes/IDsdupliqués même autre date refusés,liste>20 signalée et cible omise lisibleparID. HTTPauth enprocessus≥17s+GET projet/fil :nouvelobservedAt/places actuelles,POSTperdu rejoué1tour sans inscription. Mode démo unavailable,A1 fermé. Carte/recette navigateur Claude restent ouvertes.

Contrat **BOOKING_WORKSHOPS fermé sousLOT_A/AI/CONTEXT**,bookingWorkshops/bookingWorkshopsRead,schéma syna-booking-workshops-read-1. Aucune confirmation commerciale ni devis. Titre/date/heure/fuseau/observedAt/capacity/remaining/status/available ;null=Àrenseigner,remainingpositif+invalid/past ne signifie pas réservable. total/limit20/hasMore clairs. POSTrejoué conserve observationdatée ;GET ensuite pouractuel. Rapport LOT-LECTURE-PLACES-ATELIERS.md ;coordination#301 commentaire6662837796. CréationPR a rencontré2erreurs internes du connecteur ;recherchehead confirmait absence,puis aliashead_branch/base_branch a créé#453 sans doublon ;titre/description français mis àjour. Ce blocage est résolu.

**605 nouveaux tests distincts #423–#453. Matrice176 opérations :78 PARTIEL /68 ABSENT /4 NON_TESTE /26 BLOQUE**,aucune complète. appointments.workshops est une omission native ajoutée sans retirer les175acquises. Totaux de régressions des lots se chevauchent,nepasadditionner.

**#445/0272c9ea run42047371418 entièrement verte**,5contrôles dont A4obligatoire/verdict,6565tests/31skip,676fichiers/1skip. #438–#444 également entièrement vertes sur leurs SHA vérifiés ;#444 tentative2 Docker a résolu le504 téléchargement ONNX sans codeCI changé. #437 tentative2 natif encoreencours au derniercontrôle(Docker/A4/suiteverts) ;#446–#453CI àsuivre,natives encoreencours ou déclenchementsrécents,aucun vertinféréparhéritage.

**Prochaine lacune :lectures de disponibilités et places dans une reprise A1.** Analyse faite,aucun code commencé. Réutiliser les deux lecteurs #452/#453 sous droits readonly distincts **EXISTING_BOOKING_AVAILABILITY_READ** et **EXISTING_BOOKING_WORKSHOPS_READ**,chacun fermé et conditionné àsonflag BOOKING natif/LOT_A/AI/CONTEXT/projetservices. Aucun EXISTING_LOCAL ni droit d’écriture requis ou accordé. Étendre ExistingLocalReadCapabilities.ops et localReadAllowed avec opérations exactes booking-availability/booking-workshops ;unknownop toujoursfalse,nativeLocalEditAllowed toujoursfalse A1.

Dans existing-project :exposer uniquement les cartes dont le droit exact existe ;classifier ces lectures avant les autres actions,supprimer leur état sur nouvelle demande,revérifier retrait avantcache(si le reçu exposait la lecture retirée). GET doit appeler les lecteurs natifs et recontrôlerowner/forfait. ownedConversation(user,cid,true) vérifie déjàrequirePlan avantcache ;pas de contournement. Tests A1 trois moteurs+atelier,Préparation absente/projectRevisionnull/versions/shop.chat/octets/tables/finances exacts,flags séparés et retraitcached,produits/compte/plan/unknownops/aucunmutateur,cognitionfermée/AI0,HTTP≥17s avecoccupationconcurrente etGETnatif,rejeu1tour. Les cartes A1 devront utiliser localReadAllowed(view,op) exact,aucune permission générique.

Continuer ensuite les autres lacunes, sansattendreCI ou nouvelleconsigne. Environnement fonctionne,gitpushhelper CLIparcommande,APIGitHubconnecteur,Nodeguardobligatoire. Aucun fournisseur/client/activation/fusion/déploiement. Documentation cumulative surcodex/parity301-booking-resume,distincte de la tête fonctionnelle ;anciennes reprises ci-dessous historiques.

## Reprise active — 5 novembre 2026, 15 h 56 UTC / 16 h 56 Paris

**La mission globale n’est pas terminée.** Dernière tête fonctionnelle : **#452 / fb38d8c58191da9fa4f562b8d11d91b88e1de0b9**, branche `codex/parity301-native-availability-read`, checkout `/workspace/work/parity301-file-trash-syna`, propre. Dépendances depuis #449 : **#450 / 5eb35dc039297eeea4e49808fcab7af1ee529d87**, puis **#451 / 545c9643b3043f0f0d0390f1c5a7200a476a8512**, puis #452. Le stash temporaire du reader a été appliqué puis supprimé par son OID exact après livraison ; aucun WIP de ce lot restant. Les anciens WIP d’autres worktrees sont conservés.

#450 corrige des défauts natifs démontrés : SQLite enregistrait 4,5 personnes sur capacité 4 après parseInt ; groupes invalides recevaient des créneaux et chaînes numériques concaténaient les couverts. Normalisation entière finie commune, min/max, aucun acquis arrondi. **14 nouveaux tous rouges parent puis64 cas/types.** #451 : deux parseHours partagés lisaient les fins20–24comme2h ;deux lignes de priorité corrigées. **12 rouges parent puis54 cas distincts/types**, dont deux PUT authentifiés et créneaux jusqu’àminuit. Pas cabinet60 dans une fixture attendait àtort23h30 ;fixture rendue explicitement30,pas de paramètre de production modifié.

#452 raccorde la **lecture native horodatée des disponibilités** : salon/service/longueur, cabinet/séance/modalité, restaurant/effectif ;dateISO réelle,cible unique. **35 nouveaux /87 cas distincts dans4 fichiers/types.** Six premières lectures rouges parent ;comparaison exacte aux trois moteurs,neuf/préparé,empreintes de toutes tables métier et fichiers conservées,aucun contact/note/jeton exposé. GET relit les nouvelles occupations ;changement de moteur/cible/mode/modalité/longueur/limites retire les anciens résultats. HTTPauth en processus après attente réelle monotone≥17s+GET projet/fil ;occupation concurrente et nouvel observedAt,POST initial rejoué1tour comme reçu daté initial,aucune réservation. Mode démo unavailable sans activation ;A1 non ouvert. Carte et recette navigateur Claude restent ouvertes.

**Contrat Claude :** BOOKING_AVAILABILITY fermé sous LOT_A/AI/CONTEXT ;bookingAvailability/bookingAvailabilityRead,schéma syna-booking-availability-read-1. Lecture seule,confirmationRequired:false,aucun devis/accord/réservation. Afficher moteur/cible/date/fuseau/longueur/modalité/effectif et observedAt. status concerne laDATE,rows[].available chaque créneau ;total compte libres+occupés,limit100/hasMore,pas de conclusion de complétude sur extrait. POST rejoué conserve son observationdatée ;GET ensuite pour courant. Rapport LOT-LECTURE-DISPONIBILITES-NATIVES.md ;coordination #301 commentaire6662583122. Ne pas réutiliser les anciennes preuves navigateur #438 pour ces nouvelles cartes.

**582 nouveaux tests distincts #423–#452. Matrice175 opérations :77 PARTIEL /68 ABSENT /4 NON_TESTE /26 BLOQUE**,aucune complète. Nouvelle opération native omise appointments.availability ajoutée sans retirer les174 précédentes. Totaux des régressions se chevauchent ;ne pas les additionner.

**CI :#442/39f6341f run42041304283 et#443/9fc4cbdb run42043352250 entièrement vertes**,6509 et6534tests/31skip ;673 et674fichiers/1skip. **#444/df592995 run42045307930 tentative2 entièrement verte** après un504 GitHub pendant téléchargement GPU ONNX ànpmci Docker ;cause démontrée dans logs127306535756,relance acceptée,sans modification Docker/CI/gardes. #438–#441 sont également entièrement vertes. #437 tentative2 :Docker/A4/suite verts,natif encore en cours au dernier contrôle ;première tentative annulée àenviron100min,limite100min. #445–#452 CI en cours/à suivre sur leurs SHA exacts ;ne pas les déclarer vertes par héritage. Quatrième contrôle gratuit toujours obligatoire.

**Prochaine lacune indépendante :places disponibles des ateliers collectifs du cabinet.** Le reader #452 ne les prend pas en charge. Native `cabinet.workshops(projectId,at)` existe et renvoie id/date/time/capacity/remaining/status,avec takenFor et atelierStatus partagés ;refuse le mode démo via liveCabinet. Àauditer avant tout raccordement :identité unique exacte et dateISO,pas de coordonnées ni réservation,ne jamais inférer le premier atelier ou activer le service,GET relit les places restantes,conflits/occupation/annulations manuelles et capacités inconnues. Prévoir contrat readonly distinct/extension documentée et garde anti-devis,outsideQuotes ;tests avec vraie SQLite,aucun mail/fournisseur. **Aucun nouveau code ateliers commencé à cet instant.** Poursuivre ensuite intervenants/horaires individuels et autres lacunes, sans attendre les CI.

Environnement opérationnel ;git push avec helper CLI par commande,API GitHub via connecteur. Node/tests/build sous network-guard,aucun fournisseur réel ni client. Documentation cumulative sur codex/parity301-booking-resume ;sa tête est distincte de la tête fonctionnelle. Aucune fusion ou mise en production. Reprises ci-dessous historiques.

## Reprise active — 5 novembre 2026, 15 h 32 UTC / 16 h 32 Paris

**La mission globale n’est pas terminée.** Dernière tête fonctionnelle : **#449 / fc47fd3129d8fc520560066bc29def7c2467609c**, branche `codex/parity301-booking-service-catalog-conversation`, checkout `/workspace/work/parity301-file-trash-syna`, propre. Dépendances ciblées depuis#446 : **#447 / f99e481acbb40f7c519d97ce524015f8c117b319**, puis **#448 / 6051058776d11dc25b007cc65c5cab833c4fcf11**, puis#449. Aucun composant Claude modifié.

#447 corrige le jour UTC du compteur : nowIn natif et fuseau du widget, règle conservatrice du jour entier ;14 nouveaux /34 cas/types,4 erreurs HTTP parent réelles. #448 fournit serviceAdd/serviceRemove stricts et exclusifs sans reconstruire les voisins ;23 nouveaux /76 cas/types. Une vraie panne SQLite de comptage autorisait le retrait :409 booking_records_unavailable désormais, seule une table non initialisée signifie zéro. #449 raccorde les phrases salon/cabinet à l’aperçu/accord/résultat/rejeu natifs ;**28 nouveaux /137 cas distincts dans6fichiers/types**. HTTP authentifié en processus après17s+GET projet/fil/natif ;pas une recette navigateur. Rendez-vous ajouté après aperçu bloque le retrait, rollback reçu/version puisretry1version ;droits/TTL/contexte/homonymes/IA0/citations/anciens devis protégés.

Contrat Claude : BOOKING_SERVICE_CATALOG fermé sous LOT_A/AI/CONTEXT ;bookingServiceCatalog/bookingServiceCatalogExecution,schéma syna-booking-service-catalog-1,add/remove,diff.before/after avec trust de données,confirm/cancel-booking-service-catalog,littéraltrue/requestId stable,puisstudio:booking-changed. Carte complète prix/durée/catégorie/modalités et avertissements ;textes/liens hors widget acquis au retrait. **A1 non ouvert** pour cet ajout/retrait. Rapport LOT-PRESTATIONS-AJOUT-RETRAIT-SYNA.md ;coordination#301 commentaire6661970061. Cartes et recette indépendante4formats restent ouvertes.

**521 nouveaux tests distincts #423–#449.** Matrice **174 opérations :76 PARTIEL /68 ABSENT /4 NON_TESTE /26 BLOQUE**,aucune complète. Les deux opérations natives ajout/retrait ont été ajoutées sans effacer les172 précédentes. Totaux de régressions des PR se chevauchent :ne pas les additionner.

**CI mises à jour :#439/6149e4a3 run42037394386,#440/f1cf44ae run42038764153 et#441/f1bbe410 run42039970165 sont entièrement vertes**,5contrôles dont confirmation gratuite obligatoire et verdict. #441 :6478tests/31skip,672fichiers/1skip. #438 reste entièrement verte (6408tests/31skip). #437 tentative2 :Docker/A4/suite verts,natif encore en cours ;première tentative annulée àenviron100min,limite configurée100min. Aucun code CI changé àl’aveugle. #442,#443 :suite/Docker/A4 verts,natif en cours au dernier contrôle ;#444–#449 CI en cours/à suivre sur SHA exacts.

**Prochaine lacune :lecture des disponibilités natives depuis une phrase.** Audit commencé seulement. Les trois moteurs ont availability ;liveSalon/liveCabinet/liveRestaurant refusent le mode démo. Ne jamais les activer automatiquement. Une fixture isolée peut simuler un thème déjà live sans compte client ni endpoint externe ;ne pas appeler setRdvLive sur un projet client. Reader futur :dateISO réelle/cible exacte,mode/longueur/nombredepersonnes explicites,retour natif horodaté,aucune garantie/réservation/confirmation commerciale. GET doit relire le planning courant et ne pas substituer un autre moteur ;withAiDisabled et garde anti-devis.

**Défaut potentiel à reproduire AVANT raccordement :** `theme-base/assets/table-saison-core.js:slotsFor` ignore minParty/maxParty ;des groupes non autorisés peuvent recevoir des créneaux disponibles. `validate` utilise parseInt et peut accepter une fraction tronquée alors que le service sauvegarde le nombre d’origine. Vérifier avec vraies fixtures SQLite/API sans mail/fournisseur,puis correctif ciblé partagé si démontré. Aucun nouveau code d’audit/disponibilités commencé à cet instant.

Environnement opérationnel. Git push utilise par commande `GIT_TERMINAL_PROMPT=0 git -c credential.helper='!gh auth git-credential' push ...` (aucun secret/config persisté). API GitHub via connecteur,api.github.com shell interdit. Builds/tests/Node avec network-guard ;disque environ659MiB libres. Documentation cumulative sur branche séparée codex/parity301-booking-resume ;ne pas confondre sa tête avec le code fonctionnel. Anciennes reprises ci-dessous historiques.

## Reprise active — 5 novembre 2026, 15 h 03 UTC / 16 h 03 Paris

**La mission globale n’est pas terminée.** Tête fonctionnelle et documentaire de la PR **#446 :1ffe53c65a4580cbc2647c9fa97c89aa7eb633c6**. Le code est dans **79f19b3729202a91e05ef765fae5bfd28e5e02b0**, puis le rapport a été clarifié dans1ffe53c6 :ne pas reprendre seulement le dernier commit documentaire. Branche `codex/parity301-existing-booking-closures`, checkout `/workspace/work/parity301-file-trash-syna`, propre.

Le lot ouvre seulement les fermetures datées A1 sous **EXISTING_LOCAL +EXISTING_BOOKING_CLOSURES +BOOKING_CLOSURES/LOT_A/AI/CONTEXT**, fermés par défaut. Droit exact `recovery.localEdits.ops:booking-closures`, helper `localEditAllowed(view,'booking-closures')`, mêmes accords natifs add/remove et événement studio:booking-changed. Ni lecture ni horaires ne suffisent à donner ce droit. Aucun autre acte A1, Préparation ou IA générale ouvert.

**20 nouveaux tests ;96 cas distincts dans5fichiers et types verts** :50/3,un cas supplémentaire de coexistence des droits,puis45régressions disjointes. Parent6rouges sur ajout/retrait des3moteurs. Aperçu sansécriture,accord/reçu/rejeu1version,acquis conservés ;réservations existantes non annulées sur le jour fermé. Retrait avant cache,conflits/TTL/produits/forfait/compte/budget0,rollback version+pointeur si reçu échoue. Handlers HTTP exercés en processus avec vraies Session/SQLite,après17s+GET projet/fil/natif ;ce n’est pas une nouvelle preuve navigateur. Carte/handle/recette compilée de Claude restent ouverts. Contrat lisible LOT-FERMETURES-ANCIENS-PROJETS.md ;coordination#301 commentaire6661296525.

**456 tests nouveaux distincts sur#423–#446.** Matrice172 inchangée :74PARTIEL/68ABSENT/4NON_TESTE/26BLOQUE,aucune ligne complète. La preuve navigateur5a89a93f couvre uniquement source69b1756f/#438,buildRZOlN5nxSKyT1Rk4Zdc7H :16parcours/64étapes+4compléments,130PNG locales,finances/acquis exacts et0provider/extérieur/JS. Elle ne qualifie pas les nouvelles cartes.

### CI et environnement

**#438 est maintenant entièrement verte**,5contrôles dont verdict,run42034971509/SHA69b1756f ;6408passés/31skip,669fichiers/1skip. Elle rejoint#423/#431/#434/#436. #440 suite6459/31skip,Docker/confirmation verts,natif long encore en cours au dernier relevé.

#437 tentative1 a fini rouge :Docker échoué (logs BlobNotFound404 même après fin),natif annulé après environ100min,limite configurée100min ;suite6393/31skip etconfirmation gratuites vertes. **Relance des jobs échoués acceptée**,tentative2 en cours :Docker127322755406,natif127322755942 ;types127322848950 etconfirmation127322759576 affichés verts. Ne pas affirmer un nouveau verdict global ni modifier le code sans défaut démontré. Les contrôles gratuits restent obligatoires. Nouveaux runs :#44442045307930,#44542047371418 ;relever#446 au SHA1ffe53c6.

L’environnement fonctionne. Le push documentaire6449340e a d’abord échoué faute de credential helper Git,puis a été publié avec la CLI déjà authentifiée. Pour les prochaines publications utiliser ponctuellement `GIT_TERMINAL_PROMPT=0 git -c credential.helper='!gh auth git-credential' push origin HEAD:refs/heads/codex/...`. Aucun secret affiché/stocké,aucune configuration globale changée. Les appels API GitHub passent par le connecteur ;api.github.com est hors de la politique shell. Référence runtime reconnectée/running,réseau enforced,aucun secret/identity déclaré par la configuration ;le CLI Git a été vérifié par un push réussi.

### Prochaine lacune à vérifier

**Suppression de prestation réservable :audit de la protection des rendez-vous acquis au fuseau du moteur.** Aucun code/branche de ce nouveau lot commencé. `src/lib/contenus/prestations.ts:futureBookings` calcule aujourd’hui avec `new Date().toISOString().slice(0,10)` (UTC),alors que les dates des rendez-vous sont locales au widget. Reproduire avant toute correction :à2026-11-06T01Z,America/Los_Angeles est encore le5novembre ;une réservation du5novembre peut être future mais ne plus compter dans le garde de suppression. Tester salon/cabinet et,àl’inverse,un jour déjà passé dans un fuseau oriental. Réutiliser les `core.nowIn(timezone,now()).date` natifs (at explicite :VM Date peut être figée avant fakeTimers),timezone du widget et non du profil. Garder les suppressions historiques/annulées et les autres gardes natifs. Corriger seulement si démontré,puis préparer le raccordement ciblé des créations/suppressions de prestations sans reconstruire les champs voisins. Aucun fournisseur ni opération client réelle.

Checkouts :source indiqué ci-dessus,preuve `parity301-intents-v5` propre5a89a93f avec build figé69b1756f,docs `parity301-booking-docs`. Aucun serveur de recette de ces lots actif ;espace libre~660MiB ;préserver les3WIP historiques de parity301-ci-guards. Main6354f327 dernier relevé,aucune fusion/activation/déploiement/donnée client/dépense réelle. Continuer les lacunes indépendantes pendant lesCI ;les états ci-dessous sont historiques.

---

## Reprise active — 5 novembre 2026,14 h 42 UTC /15 h 42 Paris

Tête propre **0272c9eaf667a2d335a5653fb85bd1508b22eb64 /#445**,branche codex/parity301-existing-booking-hours,checkout parity301-file-trash-syna. Horaires A1 livrés sans nouveau moteur :EXISTING_LOCAL +EXISTING_BOOKING_HOURS +BOOKING_HOURS/LOT_A/AI/CONTEXT,fermés par défaut,projet services. Droit exact recovery.localEdits.ops booking-hours,localEditAllowed(view,booking-hours),mêmebookingHours/confirm-cancel/accord littéral/event studio:booking-changed. Les autres domaines,A1IAgénérale etPréparation restentfermés.

**16nouveaux tests ;106distincts/5fichiers/types** (61/3 +45/2 disjoints),parent2rouges. Deuxmoteurs,preview/cancel/TTL/conflit/budget0/droits/flagscacherefusés,uneversion/unjourseulement ;rollbackversion+pointeuretproposition si écriture du reçu échoue,puisretrylégitimeuneversion. Rendez-vous acquis du mardi conservés après fermeture. HTTPauth17s/GET projet/fil,fauxaccordsrefusés,natif/rejeu1tour1version,aucunePréparation. Anciennesversions/profil/tables/octets/shop.chat/réservations exacts,projet nechange que pointeurversion/date natifs. Contrat LOT-HORAIRES-ANCIENS-PROJETS.md,coordination#301 commentaire6660797967. Carte/handle/recette compilée Claude ouverts.

**436 tests nouveaux distincts #423–#445.** Matrice172inchangée :74PARTIEL/68ABSENT/4NON_TESTE/26BLOQUE,aucunecomplète. Preuve5a89a93f seulement application69b1756f (#438),pas nouvellescartes. Touslesétatsci-dessoushistoriques.

Prochaine lacune indépendante analysée,**aucun code commencé** :fermetures datées A1. Réutiliser local-booking-closures.ts (add/remove,moteurs3kinds,guarddates/range400/versions/FP/receipts) sous nouvelle exception booking-closures dans ExistingLocalOperation/localEditAllowed,EXISTING_LOCAL+EXISTING_BOOKING_CLOSURES séparé/fermé +BOOKING_CLOSURES/LOT_A/AI/CONTEXT etservices. Existing-project :capacité/vues/handlers/annulation/cleanup,retraitavantcache,aucunePréparation ouactivation. Classifier closure avant hours ;hours exclutdéjàclosures/restaurants. Tests3kindssansmutationsdesacquis,versions+jourcibléuniquement,HTTP17s/rejeu,droits/conflits/TTL/flags/actesautresfermés ;cartesClaudeavec localEditAllowed(view,booking-closures). Ne pas réécrirele moteurou retesterinutilement touteslesvalidationsnativesdéjàqualifiées.

CI#423/#431/#434/#436 entièrementvertes. #440 suitecomplète6459/31skip,671fichiers/1skip ;Docker/confirmationgratuite verts,natiflongencours. #439 recettesnatives/Docker/confirmationvertes,suitecomplète encoreencours au dernierrelevé. #437Dockerrouge/logs404/relance403 car runactif,suite6393/31skipverte ;aucun diagnosticcode démontré. #438suite6408/31skip +Docker/confirmationverts,natiflongencours. #441/#442/#443 longsencours. Relever#444/#445 aprèsdéclenchement. Le contrôle gratuit resteobligatoire.

Source/pointdepreuve/docscheckouts inchangés,aucun serveur de recette deceslotsactif,disque~660MiB,préserver3WIPhistoriques. Environnementfonctionne,main6354f327 dernierrelevé. Aucune fusion/dépense/client/activation/réservationréelle/déploiement. Missionglobaleencours ;continuer sansattendrelesCI,coordinationClaude en#301.

---

## Reprise active — 5 novembre 2026,14 h 29 UTC /15 h 29 Paris

Tête fonctionnelle propre **df592995a8ed0a2a02bf911bf363ddd55caf14b6 /#444**,branche codex/parity301-existing-booking-read,checkout parity301-file-trash-syna. Exception A1 de lecture planning livrée :EXISTING_BOOKING_RECORDS_READ fermé,sous BOOKING_RECORDS/LOT_A/AI/CONTEXT,services seulement ;recovery.localReads op booking-records,localReadAllowed(view,booking-records). **Aucun droit d’écriture ou IA générale ouvert.**

15nouveaux tests,101distincts/5fichiers/types (56/3 +45/2 disjoints). Parent3rouges sursalon/cabinet/restaurant ;troismoteurs historiques,A1tables/octets/Préparation/version/shop.chat intacts,droits/drapeaux/produits/rejeu avantcache/budget0/actes toujoursfermés/rollback. HTTPauth17s+GET projet/fil/relecture/reçu1message ;withAiDisabled surGETetPOSTnatifs. Aucun composant graphique modifié,carte A1 etrecette compilée Claude toujours àintégrer. Contrat LOT-LECTURE-PLANNING-ANCIENS-PROJETS.md ;coordination#301 commentaire6660503664.

**420 tests nouveaux distincts #423–#444.** Matrice172opérations inchangées :74PARTIEL/68ABSENT/4NON_TESTE/26BLOQUE ;aucune complète. Les limites/cartes/CI précédentes restent applicables,les états inférieurs sont historiques. Preuve5a89a93f uniquement source69b1756f,#438 ;ne qualifie aucune nouvelle carte.

Prochaine lacune analysée,**pas encore codée** :horaires hebdomadaires salon/cabinet en reprise A1. Réutiliser local-booking-hours.ts et ses gardes sans toucher au moteur. ExistingLocalOperation/localEditAllowed peuvent ajouter booking-hours sous EXISTING_LOCAL +EXISTING_BOOKING_HOURS séparé/fermé +BOOKING_HOURS/LOT_A/AI/CONTEXT etprojet services. Dans existing-project :classification exacte outsideQuotes déjànative,capacité/vuesmétadonnées,sélection contexte,confirmation/cancel,rollback etretrait avantcache ;aucune Préparation/IA globale. Tests comparer toutes tables sauf changements natifs attendusprojects/theme_versions,anciennesversions/actifs/octets/shop.chat/profil/réservations intacts ;preview/cancel/conflits/17s/accord/rejeu1version,droits/drapeaux/budget0. Informer Claude d’utiliser localEditAllowed(view,booking-hours),jamais le droit de lecture pour écrire. Autres nouveaux domaines A1 restentfermés.

CI#423/#431/#434/#436 entièrementvertes ;#437 Docker toujoursrouge,logs404/relance403 car run actif,suite6393/31skip etconfirmation vertes ;#438 suite6408/31skip,Docker/confirmation verts,natif long encours ;#439/#440 longsencours ;#441run42039970165,#44242041304283,#44342043352250 ;relever#444 aprèsdéclenchement. Aucun garde/contrôle gratuit affaibli. Aucun serveur de recette deceslotsencoreactif,disque~660MiB. Préserver3WIPhistoriquesparity301-ci-guards. Environnement fonctionne,main6354f327 inchangé au dernierrelevé. Aucun fournisseur/client/activation/déploiement/fusion main.

Mission globale en cours ;continuer leslacunes indépendantes etcoordonner lescartesClaude sansattendre lesCIlongues. Siun testpayant devientindispensable,préparer devis/plafondpouraccord,nepaslancer.

---

## Reprise active — 5 novembre 2026,14 h 18 UTC /15 h 18 Paris

Tête fonctionnelle propre **9fc4cbdbe0b139963a2cee240e0024d5db40f3bd /#443** (branche codex/parity301-booking-records-read).25nouveaux tests,89distincts/4fichiers/types verts ;HTTPauth17s+GET projet/GET natif/relecture d’ajout manuel/rejeu1message sans écriture métier. Contrat `bookingRecords`/`bookingRecordsRead`,BOOKING_RECORDS fermé,lecture datée93jours maximum/numéro précis/50métadonnées,GET relit les moteurs natifs salon/cabinet/restaurant. Contacts/notes/jetons/hashes/liens de gestion exclus ;sourcekind changée=unavailable,aucune substitution. Numéro cité vide reproduit rouge puis clarifié. Aucune réservation réelle ni disponibilité/activation annoncée. Rapport LOT-LECTURE-RESERVATIONS-NATIVES.md ;coordination#301 commentaire6660232073. Carte/anti-devis/recette compilée Claude restent ouverts.

**405 tests nouveaux distincts #423–#443.** Matrice **172 opérations :74PARTIEL/68ABSENT/4NON_TESTE/26BLOQUE**,aucune complète. Ajout de la lecture native omise appointments.list ;appointments.settings passe documentairement àPARTIEL car ses sous-actions sont prouvées,mais sa commande générale du registre reste adapter:none. Aucun succès de plus ni fonction supplémentaire déduit de cette réconciliation. Tous les anciens états ci-dessous sont historiques.

Prochaine lacune indépendante :**lecture planning dans une reprise A1**. Analyse faite seulement :existing-local-policy dispose d’une capacité de lecture prompts isolée ;prévoir une opération booking-records sous drapeau EXISTING_BOOKING_RECORDS_READ séparé/fermé,condition projet services et mêmes gardes natifs,aucune permission d’écriture ou IA. existing-project doit contrôler retrait de droits/drapeau AVANT retour du cache et ne créer aucune Préparation ;localReadAllowed doit reconnaître la nouvelle capacité précise. Ajouter un verrou withAiDisabled sur la lecture native GET (actuellement pure sans fournisseur) comme les autres lecteurs. Tests historiques/versions/shop.chat/octets/finances conservés,flagoff/compte/plan/cachedreply et mutateurs toujours refusés,puis HTTP17s. **Aucun code ou branche A1 nouveau commencé à cet instant.**

CI :#423/#431/#434/#436 entièrement vertes ;#437 suite6393/31skip etconfirmation gratuites vertes,Docker rouge/logs404/relance403 car run encore actif,natif long en cours. #438 suite6408/31skip,Docker/confirmation verts,natif long en cours. #439/#440 Docker/confirmation verts,autres jobs en cours. #441 run42039970165 ;#442 run42041304283 ;relever#443 après déclenchement. Aucun garde ni contrôle gratuit affaibli. Environnement fonctionne ;pas de blocage “create environment”. Les cartes nouvelles Claude et recettes communes restent les blocages UI documentés,aucune réponse Claude observée au dernier relevé.

La preuve5a89a93f reste uniquement l’application69b1756f/buildRZOlN5nxSKyT1Rk4Zdc7H :16parcours/64étapes +4compléments,130PNG locales,0provider/extérieur/JS/finances modifiées après baseline initialisée. Elle ne qualifie pas les nouveaux contrats#439–#443. Source principale parity301-file-trash-syna propre#443 ;preuve checkout parity301-intents-v5 propre5a89a93f ;docs checkout parity301-booking-docs. Espace libre~660MiB ;aucun serveur de recette de ces lots actif ;3WIP historiques à préserver.

Aucune fusion,activation,déploiement,client ou fournisseur réel. Continuer les lacunes indépendantes sans attendre les CI ;préparer devis et accord seulement si un test fournisseur réel payant devient indispensable. Mission globale non terminée.

---

## Reprise active — 5 novembre 2026,14 h 04 UTC /15 h 04 Paris

Ce point remplace les états historiques plus bas. **Mission complète toujours en cours ; environnement fonctionnel.**

Tête fonctionnelle **39f6341f7844a828229ffeee5da44ee32118a5e5 /#442**. Après#440 :

- **#441 f1bbe41031a56edfa34276b5e05f2b16a9eda34c** :staffPatch natif strict id/name/title/skills/days ;19nouveaux,41distincts/3fichiers/types. Nom adapte l'initiale, champs omis jamais réinitialisés. IDs/order/horaires/voisins/rendez-vous/occupation acquis exacts.
- **#442 39f6341f** :intentions nom/spécialité/jours/catégories d'un intervenant salon exact ;31nouveaux,109distincts/6fichiers/types (63/3 +46/3 disjoints). HTTPauth préparé≥17s,GET projet/conversation,accord littéral/GET natif/reçu1version/préparation intacte. Moteur partagé du site vérifie futurs jours/compétences ;rendez-vous et occupation acquis inchangés. outsideQuotes+priorité,droits/TTL/kinds/onglet/homonymes/conflits/devis+acceptation cognitifs refusés ;réordre d'ensemble=no-op. BOOKING_STAFF fermé,carte bookingStaff/bookingStaffExecution ;confirm/cancel-booking-staff. **Carte/handle/rafraîchissement studio:booking-changed Claude et recette compilée restent ouverts.** Voir LOT-INTERVENANT-SYNA.md ;coordination#301 commentaire6659949164.

**380 tests nouveaux distincts sur#423–#442.** Aucun composant Claude modifié,aucune fusion,dépense réelle,activation,projet client ou déploiement. Main revérifié à13h48UTC :toujours6354f327888d70c64ce4d86604b7b8fdc768947c. Les fixtures vides/session étrangère/client_id manquant du premier essai natif ont été corrigées avant conclusion ;comparaison parent/correctif avec bonnes fixtures conservée. Aucun échec de fixture annoncé comme défaut produit.

Matrice canonique **171 opérations uniques :72PARTIEL/69ABSENT/4NON_TESTE/26BLOQUE**,aucune complète. Une omission native existante est détaillée en services.booking.staff,le parent reste PARTIEL. Création/suppression services/intervenants,horaires individuels,réservations clientes,notifications et A1 restent à qualifier/raccorder séparément. Les preuves bibliothèque5a89a93f portent seulement sur l'application69b1756f (#438),jamais sur#439–#442.

CI mise àjour : **#436 désormais entièrement verte**,5contrôles/run42029332860,6380tests/31skip,667fichiers/1skip. #437 suite complète6393/31skip,668fichiers/1skip etconfirmation gratuite vertes ;Docker rouge,logs404,relance refusée403 car run actif,aucun correctif aveugle. #438 suite6408/31skip,669fichiers/1skip +Docker/confirmationgratuite verts ;natif long encore en cours. #439 et#440 :Docker/confirmationgratuite verts,autres jobs en cours au dernier relevé. #440 run42038764153. Relever runs#441/#442 auSHAexact. Contrôle gratuit toujours obligatoire.

Checkouts :parity301-file-trash-syna sur#442 propre ;parity301-intents-v5 surpreuve5a89a93f,build figé69b1756f ;parity301-booking-docs surdocs cumulative. Aucun harnais de ce lot encore actif. Espace libre environ660MiB ;préserver les3WIP historiques parity301-ci-guards. Aucun nouveau lot commencé àcet instant.

**Prochaine analyse indépendante : lecture des réservations clientes datées depuis les moteurs natifs** (salon/cabinet/restaurant),droits/PII minimales/secrets de gestion jamais exposés,aucune annulation/déplacement/notification. Vérifier source et matrice avant d'écrire. Poursuivre aussi la coordination Claude pourqualifier sescartes quandunSHAsera disponible ;pas de réponse Claude observée au dernier relevé. Ne pas attendre lesCIlonguespourcontinuer lesdomaines indépendants. Tests fournisseurs réels payants non lancés ;devis/plafonds et accord requis siindispensables.

---

## Point de reprise actif — 5 novembre 2026, 13 h 47 UTC /14 h 47 Paris

Ce point remplace les états historiques ci-dessous. **Mission complète non terminée ; environnement fonctionnel.** Main demeure la base6354f327/#422 ; aucune fusion ni activation/dépense/client/déploiement.

Tête fonctionnelle : **f1cf44ae0584a377d06a6371634417d806e156f3 /#440**. Chaîne linéaire #423→#440, chaque PR brouillon cible la précédente. Depuis l'ancien point :

| PR | Commit | Sous-parcours borné | Nouveaux tests |
|---|---|---|---:|
|437|a0f5ccdf6c4ec426ca581800e6791f29f6689eea|Corbeille native atomique commune au DELETE manuel, protections statut/original et date de rejeu|13|
|438|69b1756f7e6d7c7f10c7d9b8d5540a264315dc55|Lecture des fichiers directs du dossier exact, outsideQuotes, variantes naturelles, refus de devis cognitif gratuit|15|
|439|6149e4a3a23b47e5416ab4f7ede64d71d93d82f7|Intention naturelle/aperçu/accord/reçu/reprise de corbeille, restauration native conservée|29|
|440|f1cf44ae0584a377d06a6371634417d806e156f3|Couple min/max des nouveaux groupes restaurant, capacité et réservations acquises intactes|22|

**330 tests nouveaux distincts sur #423–#440.** Dernières régressions :#438107/6 ;#439129/6 ;#44087/5,types verts. Ensembles qui se recoupent : ne pas les additionner. #439/#440 ont de vrais HTTP17s+GET projet/conversation/accord/résultat natif/rejeu. Les cartes corbeille et restaurant restent à intégrer par Claude ; aucun composant graphique de Claude modifié. Contrats LOT-CORBEILLE-FICHIER-SYNA.md et LOT-TAILLE-GROUPES-RESTAURANT.md. FILE_TRASH et RESTAURANT_SETTINGS fermés par défaut. Coordination#301 commentaires6659395428 et6659591425.

### Preuves réellement compilées

Branche `codex/syna-library-folder-proof-69b1756f`, commit **5a89a93f85a893c85963c49656c8fe4c07142fc9**. Source de l'application **69b1756f**, build **RZOlN5nxSKyT1Rk4Zdc7H**, production propre, vrais sessions/Next/Chromium et fixtures isolées. Rapport `preuves-library-folder-69b1756f/RAPPORT.md`.

16 parcours/64 étapes (neufs/préparés ×Produits/Services ×Encre/Plein ×ordinateur/tactile),lecture ciblée puis renommage acquis,annulation/16attentes≥17s/accord/reçu/reload/relecture.16écritures natives,8réponses perdues rejouées au même corps/requestId ;octets/versions/thème/arbre voisin intacts. Comparaison de TOUTES les lignes6tables financières identique,8recherches simulées acquises conservées,0nouvelleIA/job/usage/devis/extérieur/JS. Quatre compléments visuels/16étapes montrent le fichier dans le cadre et le dossier natif panneau replié.130PNG restent locales dans /workspace/work/preuves-syna301-library-folder-69b1756f-{prepares-final,neufs-final,visibilite}.

Premiers JSON financiers refusés conservés :initialisation native de quotas à la première lecture. Le harnais initialise maintenant ces quotas pendant le seed AVANT baseline,puis compare tout sans filtrer les écarts ;les16parcours ont été requalifiés. Aucun code financier modifié. Cette preuve **ne qualifie pas#439/#440 ou les cartes de réservation absentes**. Coordination6659555889.

### CI observées

- #423/bb0f7b49 :5contrôles entièrement verts,run42013974148 ;6136passés/31ignorés.
- #431/9cfc7715 :5contrôles entièrement verts,run42021961326 ;6272passés/31ignorés,662fichiers/1ignoré.
- #434/22889658 :**5contrôles entièrement verts**,run42025619574 ;6338passés/31ignorés,665fichiers/1ignoré.
- #436/9b02c829 :suite6380/31skip verte,667fichiers/1skip ;Docker/confirmationgratuite verts,natif long encore en cours au dernier relevé.
- #437/a0f5ccdf :Docker rouge,job127262583705 ;logs GitHub BlobNotFound404 à deux lectures. Relance de ce seul job refusée403 « workflow run containing this job is already running ». Cause code non démontrée,pas de changement aveugle du workflow. Autres jobs en cours,confirmation gratuite verte. Reprendre le diagnostic quand le run42032614535 finit.
- #438/69b1756f :run42034971509 en cours,Docker vert ;ne pas anticiper le verdict.
- #439/6149e4a3 :run42037394386 en cours. #440 à relever après déclenchement.

Aucun contrôle supprimé ou rendu facultatif ; le contrôle de confirmation gratuite reste obligatoire. Les anciens rouges avant#431 ne sont pas effacés.

### Couverture et suite immédiate

Matrice canonique **170 opérations uniques :71PARTIEL/69ABSENT/4NON_TESTE/26BLOQUE ;aucune complète**. files.delete passe ABSENT→PARTIEL,les autres sous-parcours ne sont pas artificiellement comptés comme complets. Cartes Claude manquantes :horaires/restaurant/fermetures/textes/prestations/suppression dossier/corbeille ;attendre leur commit exact pour une vraie recette commune. Continuer les autres lacunes indépendantes pendant les CI.

Checkouts :`/workspace/work/parity301-file-trash-syna` tête fonctionnelle#440 propre ;`/workspace/work/parity301-intents-v5` branche de preuves5a89a93f,build figé69b1756f ;`/workspace/work/parity301-booking-docs` branche documentaire cumulative. Le checkouthistorique parity301-ci-guards contient toujours ses3WIP documentaires,à préserver. Aucun processus de recette de ce lot encore actif. Espace libre environ690MiB ;ne pas mélanger un nouveau code au build69b1756f.

Prochaine lacune à vérifier :**équipe/intervenants des réservations salon**,en commençant par le renommage natif exact sans changer les IDs,jours,prestations ni rendez-vous acquis. Analyse seulement à cet instant,aucun nouveau code ou branche commencé. Vérifier le moteur existant avant nouveau patch. Les réservations clientes/création/suppression/notifications et fournisseurs réels restent non qualifiés. Aucun test réel payant lancé :préparer devis/plafonds et demander accord seulement si indispensable.

---

## Mise à jour active — 5 novembre 2026, 13 h 44 Paris

Tête fonctionnelle : **9b02c829a537b1e80f9551a0866d4cff2d411da8 /#436**. Après #434 : **#435 b24179b6e2a9184bf43235c554c7a4fe67968f1f**, moteur natif de suppression atomique de dossier vide (11 nouveaux tests,71/4 fichiers/types,2courses SQLite reproduites) ; puis **#436**, contrat naturel strict de suppression de dossier sans sous-dossier ni référence de fichier, même dans la corbeille (31 nouveaux,225tests distincts/10fichiers/types,HTTP17s et reprise sans supprimer un nouvel homonyme).

**251 tests nouveaux distincts sur #423–#436.** Les ensembles225 et281 se recoupent : ne pas les additionner. La carte dossier reste PARTIELLE ;drapeau FOLDER_DELETE fermé,Claude doit intégrer aperçu irréversible,handle anti-devis/verrou/reprise etrafraîchissement Fichiers avec sélection du parent. Contrat LOT-SUPPRESSION-DOSSIER-SYNA.md ;transmis dans#301 commentaire6658264344. Aucun composant Claude modifié.

Matrice : **170 opérations,70PARTIEL/70ABSENT/4NON_TESTE/26BLOQUE**. La ligne native.files.empty-folder-delete existait déjà :mise àjour,aucune nouvelle unité artificielle.

CI#431 :suite complète verte **6272passés/31ignorés,662fichiers passés/1ignoré** (job127226656964). Docker etconfirmationgratuite verts ;recettesnatives longues encoreencours. #434 :Docker etconfirmationgratuite verts,suitecomplète etnatifencours au dernier relevé. #423 seule CI entièrementverte confirmée àcepoint. Vérifier lesruns desnouveaux#435/#436 auSHAexact.

**Prochaine lacune indépendante :mise àla corbeille d’un fichier**,analyse native seulement àcepoint. La route DELETE de src/app/api/files/[fid]/route.ts protège actuellement les originaux meta.protected etlesusages post scheduled/publishing/published,mais lit lescontrôles hors transaction. Réutiliser library-local-change.ts,protéger lesconcurrences etlesoctets/versions acquis ;vérifier avanttoutecorrection avecdeuxconnexionsSQLite comme#435. Puis contrat naturel,cibleexacte/aperçu/accord/résultat/reprise,restore natif etgarde anti-repli payant. Aucun code nouveau de corbeille encoreécrit. Aucunmain/client/activation/fournisseur/déploiement.

---

# Reprise SYNA #301 — 5 novembre 2026, 13 h 17 Paris

**La mission complète reste en cours.** L’environnement fonctionne. Les contrats serveur ci-dessous sont livrés et testés, mais leurs nouvelles cartes et la recette commune de Claude restent à intégrer. Aucune fonctionnalité nouvelle n’est déclarée complète par les seuls tests backend.

## Références de travail

- Main vérifié à nouveau : `6354f327888d70c64ce4d86604b7b8fdc768947c` (#422), toujours identique à la base de cette reprise.
- Tête fonctionnelle livrée : **`228896588237dc2ebba6bc5a0ebb4d79b1db200c`**, PR brouillon #434.
- Chaîne linéaire à reprendre dans l’ordre : **#423 → #424 → #425 → #426 → #427 → #428 → #429 → #430 → #431 → #432 → #433 → #434**. Chaque PR cible sa précédente ; #423 cible main. Ne pas fusionner ces PR vers main dans cette mission.
- Branche documentaire cumulative : `codex/parity301-booking-resume` ; elle contient l’ascendance fonctionnelle et les preuves, sans modifier les branches de Claude.
- Checkout local : `/workspace/work/parity301-intents-v5`, actuellement sur la branche documentaire. Aucun changement fonctionnel non publié à ce point de reprise.

## Lots livrés

| PR | Commit | Résultat borné | Nouveaux tests |
|---|---|---|---:|
| #423 | `bb0f7b490aa8321ba6fc59f5f23e30c005a7cf56` | Refus des horloges impossibles ; 24:00 seulement en fin de plage | 7 |
| #424 | `1c0166f77cdd7b36ce6feb87120ff46f254425a5` | Plages hebdomadaires salon/cabinet depuis une demande naturelle | 30 |
| #425 | `bb3b7025bce9e99685a7119a8ca6babe2f35e4d4` | Restaurant : patch ciblé et semaine explicitement fermée respectée serveur/public | 9 |
| #426 | `8cb35ff024a1f9be78f0300554acd1d83bd918ab` | Jours ouverts et créneaux déjeuner/dîner du restaurant | 24 |
| #427 | `b5cbbd14a7bb2d08955661139f2db8b60d18b82e` | Dates natives réelles et périodes ordonnées | 8 |
| #428 | `1d97dfb7bdb077d4b68cbe548596e62cea0785d1` | Ajout de fermeture exceptionnelle sans effacer les acquis | 26 |
| #429 | `c9a6f830641e8a7ca6c09f59c739e553b282d524` | Retrait des seules dates ciblées, avec scission sûre des périodes | 18 |
| #430 | `fa20aaa4b2091f9c4f683e6722d94baf25304403` | Refus API des devis/confirmations cognitifs pour ces demandes gratuites | 13 |
| #431 | `9cfc77150615162c02236db2aad71dcd70e8d3b0` | Régression CI #424 : clarification Activité conservée sans ouvrir le drapeau Horaire | 8 |
| #432 | `60e2c2e5076d413d7f7bd93f3d2a4c946962d2a7` | Capacité totale du restaurant par créneau, couverts confirmés conservés | 19 |
| #433 | `077883cf8e14b533fd1541ab88299791c7edc600` | Patch natif des noms et descriptions sans remplacer les voisins | 13 |
| #434 | `228896588237dc2ebba6bc5a0ebb4d79b1db200c` | Renommage, description courte et effacement explicite salon/cabinet depuis SYNA | 34 |

**209 tests nouveaux distincts. Vérification cumulée finale : 281/281 tests, 16/16 fichiers et types verts sur le code de #434.** Les totaux propres à chaque PR contiennent des régressions communes : ne pas les additionner. Log local : `/tmp/parity301-booking-session-final-targets.log`.

Tous les parcours nouveaux gardent un aperçu sans écriture, un accord littéral obligatoire, la cible/version native, les conflits, la relecture du résultat et la reprise sans double écriture. Vrais handlers HTTP et SQLite ; attentes réelles de 17 secondes pour fermetures et textes. Aucune dépense fournisseur. Les simulations de recherche sont des fixtures préacquises, pas des appels réels.

## Ce que le navigateur a réellement montré

Diagnostic indépendant publié dans **`eb6afdb6e4453d81d890808ad56b4c9ba73cecee`**, branche `codex/syna-booking-visibility-c9a6f830`.

- Source compilée **c9a6f830**, BUILD_ID **LUJqaPqWtwx8QP2NZgH81**, `next start` en production et Chromium système ; stockage fictif isolé, aucun accès extérieur.
- 16 demandes réellement saisies : Horaires / Restaurant / Ajout de fermeture / Retrait de fermeture × Encre/Plein × ordinateur/tactile. Quatre attentes de 17 secondes.
- 16 réponses HTTP200 avec proposition native gratuite ; **16 blocages UI : aucun bouton de confirmation, un bouton de devis générique par cas**. Aucune confirmation par API pour contourner cette absence.
- Aucune écriture métier, erreur JavaScript ou requête extérieure ; tables IA/jobs/usage/ledger/devis inchangées, y compris les 16 recherches simulées préacquises.
- JSON et harnais : `preuves-booking-c9a6f830/RESUME.json`, `scripts/parity301-booking-contract-visibility.ts`.
- Les 16 PNG restent **locales uniquement** : `/workspace/work/preuves-syna301-booking-c9a6f830-visibility`. Aucun téléversement ni projet client.

Ce build ne qualifie **pas** #430–#434, ni la capacité ou la nouvelle carte texte. Ne pas réutiliser son identifiant pour ces commits. #430 ferme le repli API payant, mais ne rend pas une carte visible.

Autre défaut visible transmis à Claude : `tab-rendez-vous.tsx:109` affiche « ouvert » pour `ranges.length=0`, alors que les moteurs salon/cabinet interprètent `[]` comme fermé. Ce composant n’a pas été modifié par Codex.

## Contrats à intégrer par Claude

Les quatre drapeaux restent fermés par défaut, sous LOT_A/AI/CONTEXT :

| Drapeau | Présentation | Schéma | Actions |
|---|---|---|---|
| BOOKING_HOURS | bookingHours | syna-booking-hours-1 | confirm/cancel-booking-hours |
| RESTAURANT_SETTINGS | restaurantSettings | syna-restaurant-settings-1 | confirm/cancel-restaurant-settings |
| BOOKING_CLOSURES | bookingClosures | syna-booking-closures-1 | confirm/cancel-booking-closures |
| BOOKING_SERVICE_TEXT | bookingServiceText | syna-booking-service-text-1 | confirm/cancel-booking-service-text |

Ajouter les cartes **et les handles dans toutes les gardes du panneau**, pas seulement le rendu : pas de devis générique pour une demande gratuite. Contrôleur partagé de verrou/péremption/reprise, avant/après exacts, annulation, reçu et `studio:booking-changed`. Carte restaurant : nouveau champ `capacity`. Carte fermeture : `operation:add/remove`. Carte texte : chaînes et `linkedLabelsChanged`, sans détourner la carte numérique prix/durée.

Puis recette indépendante sur un **même SHA compilé** : préparé/neuf, Encre/Plein ordinateur/tactile, accord après ≥17s, résultat réellement visible dans Rendez-vous, annulation, conflit, réponse perdue/rechargement/rejeu sans doublon. Les PDF/PNG anciens et les seuls tests backend ne ferment pas ces lignes de matrice.

Contrats et SHA transmis dans #301, notamment commentaires **6657154353**, **6657224873**, **6657343921** et **6657747550**. Aucune nouvelle réponse ou carte Claude observée au dernier relevé. Continuer les domaines indépendants pendant cette attente.

## CI : résultats exacts et limites

- **#423 entièrement verte**, SHA bb0f7b49, run **42013974148** : suite complète **6136 passés /31 ignorés**, fichiers **654 passés /1 ignoré** ; Docker, confirmation gratuite obligatoire, recettes compilées et verdict global tous `success`.
- **#424 rouge historique** : run **42015562741**, job **127205115147**, un échec parmi6197cas (6165 passés,31 ignorés). Phrase incomplète dans Activité capturée à tort par le nouvel aiguilleur. Reproduit localement et corrigé dans #431 ; les neuf tests acquis sont conservés. Ne pas appeler ce vieux SHA vert ni le relancer aveuglément.
- #431, run **42021961326** : Docker et confirmation gratuite verts ; suite complète et recettes natives encore en cours au dernier relevé. Aucun verdict global présumé.
- Dernière tête #434, run **42025619574**, en cours. C’est sa CI, puis celle de l’intégration commune Claude, qui doivent qualifier la suite.
- Autres runs : #42542016531277 ; #42642017997568 ; #42742018470932 ; #42842019225565 ; #42942019907308 ; #43042021654962 ; #43242022753949 ; #43342023598543. Les consulter avec leur SHA, sans attribuer les verts d’une autre branche.

Les workflows et le quatrième contrôle de confirmation gratuite n’ont pas été modifiés. Aucun test supprimé ou garde financier affaibli.

## Couverture restante et prochaine action

Matrice canonique : **170 opérations, 69 PARTIEL /71 ABSENT /4 NON_TESTE /26 BLOQUE ; aucune complète**. Quatre sous-opérations de réservation détaillées ; le parent `services.booking` reste PARTIEL.

Restent notamment équipe, création/suppression de prestations, prix à partir de/effacement du prix, limites de groupes et réservations clientes. Hors réservation, poursuivre les lignes absentes ou non testées sans refaire #348 ni les moteurs déjà validés.

**Prochaine lacune indépendante retenue : supprimer un dossier réellement vide.** Analyse native commencée dans `src/app/api/folders/[fid]/route.ts` et `src/lib/folder-metadata.ts` ; aucun code de suppression nouveau écrit à ce point. Réutiliser le moteur natif, extraire une opération atomique commune si les tests en montrent le besoin ; refus dossiers système/non vides, cible exacte, aperçu, accord, relecture, conflit et reçu sans doublon. Ne jamais supprimer implicitement un fichier, déplacer un contenu ou perdre un rattachement de corbeille. Garder A1 fermé pour cette capacité nouvelle sauf contrat explicite. Prévoir la garde contre le repli payant et transmettre le contrat à Claude.

## Exécution et sécurité

Tous les Node/tests/builds/navigateurs utilisent `NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs`. Fixtures dans un DATA_DIR neuf, fournisseurs vides ou strictement simulés ; aucun transport fournisseur. Le cache webpack fermé de ce seul build a été retiré après compilation et vérification des descripteurs pour conserver de l’espace ; aucun artefact client ou travail d’un autre agent supprimé.

**Aucun appel fournisseur payant, modification de projet client, activation client, fusion main ou déploiement.** Les capacités payantes encore non qualifiées doivent être préparées et chiffrées pour accord ; les lots de cette reprise sont gratuits et n’en nécessitent pas.
