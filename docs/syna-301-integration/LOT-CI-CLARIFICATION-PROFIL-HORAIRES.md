# Préserver la clarification gratuite Activité sans ouvrir les horaires réservables

5nov2026,Europe/Paris,parent#430/fa20aaa4. Corrige la régression démontrée enCI#424/run42015562741/job127205115147 :1échec sur6197cas (6165réussis,31ignorés),parity301-natural-hours,« Modifie mes créneaux de réservation du mardi » dansActivité. Réproduit localement :1rouge/8verts avantcorrectif. Le nouvel aiguilleur#424 intercepte cettephraseincomplète alorsque BOOKING_HOURSestfermé ;404 au lieu de la clarification profil/créneaux acquise.

Correctionbornée :dansActivité,si SERVICE_PROFILE estdéjàautorisé etlaformulation decréneaux/horairesréservables ne contient pas de nouvelle valeur,conserver la clarificationprofil. DansRendez-vous,conserver l’aiguilleurHoraire etsondrapeauobligatoire. Une vraie plage,mêmecitée,danslemauvaisonglet reste refusée. Horsquotes pourtoutaiguillage ;pasdefallbackpayant outranspositiond’unevaleurduprofilverslemoteur. L’ancienneproposition deprofilestinvalidée commeavant.

66tests/5fichiersettypesverts :8nouveaux(frontièreonglet/drapeau/cible/valeurcitée/propositionpérimée),9natural-hours acquisconservés,30horairesnatifs,13gardecontredevispayant,6aiguilleursquotedvalues. Aucuntestsupprimé/ignoré,pasdemodificationCI,drapeauxfermésconservés. Logs/tmp/parity301-hours-profile-{red,green,types}.log. Fournisseurfetchinterdit/gardeNode,donnéesfictivesisolées.

Contrats/cartesdeslotsprécédents inchangés ;0composantClaude modifié. CIcomplète àobserver surleSHAcorrigé ;l’échec#424restetraçableetlesvertsd’autresbranchesnel’annulentpas. Aucunclient,dépense,activation,mainouproduction.
