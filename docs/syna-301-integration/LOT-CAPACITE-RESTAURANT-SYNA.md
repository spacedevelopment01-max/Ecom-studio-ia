# Capacité totale du restaurant par créneau

5nov2026,Europe/Paris,parent#431/9cfc7715,chaîneissue de main6354f327/#422. Réutilise lecontrat restaurantSettings/syna-restaurant-settings-1,drapeau RESTAURANT_SETTINGS fermé par défaut,mêmes confirm/cancel/TTL/UUID/empreintes/transaction/reprise. Champ supplémentaire field:capacity,diff chaînesnumériques,display« N couverts par créneau ». PasdecarteClaude modifiée.

Troisformulations exécutées :« Change la capacité du restaurant à 30 couverts par créneau »,« Peux-tu modifier la capacité de réservation du restaurant à 18 couverts par créneau ? »,« Mets la capacité du restaurant à 1 couvert par créneau ». outsideQuotes pourl’aiguilleur ;lesvaleurscitéesduSite ne déclenchentpasl’action. Mauvaisonglet/cible refuse ;0/501/fraction/unitépargroupe/mélangeavecpublier clarifientourefusent sansécriture.

Moteur natif read/preview/savePrestations avec restaurantCapacityPatch:{capacity:entier1..500},strict,exclusif desrestaurant/restaurantPatch. L’ancien restaurantPatch n’accepte TOUJOURS PAS capacity (testacquis conservé) ;pas d’élargissement implicite desespermissions. Seul st.capacity change,aucunremplacementtotal normalisantlesvoisins. Valeur relue via restaurantOf.config etAPIprestations.

Capacité=totalcouvertsparcréneau,pasminimum/maximumpargroupe. Lesréservationsconfirméesconserventleurscouverts,date/heure ;unenouvellelimite inférieureauxacquisneréduitrien etlemoteurborne lesnouvellesdemandes. Profil,horaires/jours,repas,limitesdegroupe,champsinconnus,modesconservés. Pasdedisponibilitétempsréelannoncée,d’activation oupublication.

19nouveauxtestsverts,73tests/5fichiers+typesverts :3phrases/accord/rejeu1version/spécexacte,5refusHTTPnumériques,PUT+GETnatifs avecvaleursvoisinesatypiques conservées,cible/exclusivité,4clarifications,nouveaucap4avec8couvertsconfirmésconservés/créneaude2refusé,allocationIAépuiséeetdeviscognitifrefusé,motscités,conflitmanuel,mauvaisonglet. Ancienstestsrestaurant24/patch9/gardefinancière13/CIclarification8 repassés. Logs/tmp/parity301-restaurant-capacity-{first,final,types-final}.log.Fournisseurinterdit,gardeNode,fixturesisolées.

Claude :étendrelacarte#426aufieldcapacity etafficherdiff/display/warningexacts,avecintitulé« Capacité totale par créneau » ;nepas confondre avectailledegroupe oucapacitédisponible. Mêmeshandles/verrou/reprise/refreshstudio:booking-changed etrecettecompilée4formats requis. Le buildLUJqaPqWtwx8QP2NZgH81 prouve l’absencedescartes àc9a6f830,NEqualifiePAScechampnouveau. PARTIELjusqu’àUI/CIcommune auSHAexact. Aucunclient/dépense/main/activation/production.
