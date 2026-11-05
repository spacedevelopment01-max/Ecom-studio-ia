# SYNA : ajouter une fermeture exceptionnelle datée

5novembre2026,Europe/Paris. Parent #427/b5cbbd14,chaîne #423→#424→#425→#426→#427 depuis main6354f327/#422. PARTIEL backend,carte/recette Claude requises ;aucune activation.

## Moteurs et périmètre

Ajout natif à closures par read/preview/savePrestations ;source salonOf/cabinetOf/restaurantOf. Les fermetures acquises,horaires/prestations/équipe/capacité/mode etréservations confirmées restent conservés. Une date ou une période ISO explicite,inclusive,400jours maximum (borne desmoteurs salon/cabinet),sans déduction de demain ou de disponibilité réelle. Pas de retrait d’une fermeture dans ce contrat. Une date déjà couverte n’écrit aucune version. Les fermetures historiques invalides ne sont jamais normalisées pour faire passer un ajout.

Phrases exécutées : « Ferme les réservations le 2026-12-25 », « Ajoute une fermeture des réservations le 2028-02-29 », « Peux-tu ajouter une fermeture exceptionnelle des réservations du 2026-12-24 au 2026-12-26 ? ». Aiguilleur outsideQuotes prioritaire sur les horaires hebdomadaires ;les drapeaux Horaires/Restaurant peuvent rester fermés. Valeurs citées duSite/profil ne sont pas capturées.

## Contrat pour Claude

STUDIO_CONVERSATION_BOOKING_CLOSURES=1 sous LOT_A/AI/CONTEXT,fermé par défaut. Propriétaire/forfait actif/projetservices/ongletrendez-vous/thème natif requis ;A1 fermé.

bookingClosuresExecution.enabled ;bookingClosures schema syna-booking-closures-1 :
- state ambiguous/proposed/applied ;projectId/nativeHref/message.
- kind salon/cabinet/restaurant ;timezone ;dates.start/end/inclusive:true.
- diff.before/after : liste native exacte,ancien contenu conservé puis date/plage ajoutée.
- confirmationRequired ;financialConsent:false,costEur:0,providerCalls:0,publication:false.
- proposalId/sourceVersionId puis resultVersionId/receiptId=requestId/actionsExecuted:true,warnings.

POST confirm-booking-closures exige confirmation:true littéral,proposition/révisions/requestId ;cancel-booking-closures distinct. UUID/empreinte entière/aperçu/vocabulaire/TTL15min,relecture native exacte ettransactionreçu+version. Droits avantcache,repriseGET/retry exact1version,conflit/péremption/contexteeffacé refusés.

Claude : carte datesinclusives/fuseau/avant-après sans effacer letexteacquis,verrou/péremption/reprise communs,ajouterhandle à toutes les gardes pour masquer devis,refresh studio:booking-changed après reçu. Recette Encre/Plein ordinateur/tactile,préparé/neuf≥17s,résultat réellement visible dans Rendez-vous,annulation/conflit/réponseperdue. Drapeau à garder fermé avant intégration.

## Preuves exécutées

26nouveaux tests : trois moteurs +7jours relus dans leurs configurations,datesISO/bissextile,6clarifications,aucun doublon si déjàfermé,borne400/401,motscités,accordobligatoire/annulation,conflit/TTL,retraitdroits avantcache,cible/propriétaire,allocationépuisée etvraisHTTP POST/GET+GETprestations/reprise1version,rollback,contexte,A1,registre,sauvegardeaprès17secondes réelles +GETprojet,résa restaurant confirmée inchangée,vocabulaire voisin.

103tests/6fichiers verts (26nouveaux +restaurant24 +horaires30 +dates8 +patchrestaurant9 +aiguilleurs6),types verts. Les suites se recoupent avec les lots antérieurs : ne pas additionner tous les totaux. Logs /tmp/parity301-closures-conversation-{final,types-final}.log. Fournisseurfetch interdit,garde réseau active,donnéesfictivesisolées. CI complète à suivre sur le SHA livré ;aucune capture UI nouvelle revendiquée.
