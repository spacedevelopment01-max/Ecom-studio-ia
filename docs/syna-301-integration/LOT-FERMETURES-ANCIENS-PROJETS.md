# Fermetures datées dans une reprise A1

Parent #445 /0272c9eaf667a2d335a5653fb85bd1508b22eb64. Réutilise les mêmes propositions/moteurs d'ajout et retrait #428/#429, sans nouvelle mémoire ni Préparation.

Drapeau **STUDIO_CONVERSATION_EXISTING_BOOKING_CLOSURES**, fermé par défaut. Exige EXISTING_LOCAL +BOOKING_CLOSURES +LOT_A/AI/CONTEXT et projet services. Droit d'écriture précis **recovery.localEdits.ops:booking-closures**, confirmationRequired:true/coût-provider0/financialConsent:false. Aucun droit de lecture ou d'horaires ne suffit à l'ouvrir.

Même carte bookingClosures/bookingClosuresExecution, schéma syna-booking-closures-1 ;mêmes confirm-booking-closures avec confirmation:true littéral /cancel-booking-closures. **Claude :localEditAllowed(view,'booking-closures')**, helper partagé étendu,événement studio:booking-changed après reçu natif. nativeLocalEditAllowed restefalse pour les autres domaines A1. Dates inclusives/fuseau/diff et avertissement d'acquis conservés doivent rester visibles ;retrait de fermeture ne garantit pas la disponibilité ni l'ouverture hebdomadaire.

Phrases :`Ferme les réservations le 2026-11-20`, `Ajoute une fermeture des réservations du 2026-11-20 au 2026-11-21`, `Retire la fermeture des réservations le 2026-11-26`. Trois moteurs salon/cabinet/restaurant. L'aiguilleur date précède celui des horaires et utilise outsideQuotes acquis. Les deux exceptions peuvent être ouvertes ensemble sans partager ni consommer leurs propositions/accords.

Retrait de droit/drapeau vérifié avantcache pour ancienneproposition et reçu ;GET sans carte. Conflit de version/empreinte/TTL/kind/onglet/droits natifs inchangés. Une seule version,datescibléesuniquement,anciensréglagesetversionsconservés. Pas d'activation,d'annulation ou déplacement d'une réservation. Préparation absente/projectRevisionnull/IA générale et autres actesA1fermés.

## Preuves exécutées

**20nouveaux tests ;96cas distincts/5fichiers et types verts** :50cas/3fichiers,1nouveau cas de coexistence des droits,sans répéter les50,puis45régressions A1 disjointes. Les6parcours ajout/retrait des3moteurs étaient absents sur le parent exact (6rouges).

Aperçu sansécriture/accord/reçu/rejeuuneversion,thèmeentiercomparé (seul champclosureschange),anciennesversionsexactes,projet inchangé sauf pointeur/date natifs,toutesautrestableset tousoctets/profil/shop.chat/acquisidentiques. Fermeture du jour d'une réservation confirmée conservesarecorddansles3moteurs. BudgetIA0,pasdeconsommation. Annulation/TTL/conflit/drapeaux/retraitavantcache/forfait/compte/produits/autresdomaines/cognitionrefusés.

Échec d'écriture du reçu :rollbackversion+pointeur/état ;réessailégitime1version. Avec droitsdates ethoraires ouverts,unepropositiondatée abandonnée nepeutconsommer l'accord dujourhebdomadaire voisin. Aucunedatemodifiéeparcetteconfusion.

Handlers Request/Response authentifiés exercés **en processus**,Session/SQLite réelles etfixturesfictives,après17secondesréelles+GET projet/fil :propositionconservée,fauxaccordsrefusés,résultatGETnatif,rejeu1tour1version,Préparationabsente. Ce ne sont pas de nouvelles preuves navigateur :la recette Next/Chromium de la carte reste àfaire.

Logs : `/tmp/parity301-existing-booking-closures-{parent-red,final,combined-rights,acquired-regressions,types-final}.log`.

**Limites : carte/handle A1 et recette Studio compilée Claude puis CI finale commune nécessaires ;PARTIEL.** Autres paramètres restaurant/intervenants/textes A1,création/suppression et actes clients non ouverts. Aucun fournisseur réel,client réel,réservation réelle,activation,déploiement ou fusion main.
