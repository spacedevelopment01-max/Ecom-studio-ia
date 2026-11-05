# Horaires hebdomadaires natifs en reprise A1

Parent #444 /df592995a8ed0a2a02bf911bf363ddd55caf14b6. Même moteur/proposition/accord d'horaires #424/#431, sans nouvelle mémoire ni Préparation.

Drapeau supplémentaire **STUDIO_CONVERSATION_EXISTING_BOOKING_HOURS**, fermé par défaut. Exige **EXISTING_LOCAL +BOOKING_HOURS +LOT_A/AI/CONTEXT**, et projet services. Droit d'écriture précis **recovery.localEdits.ops:booking-hours**, schéma existing-local-free-1, confirmationRequired:true, coût/provider0, financialConsent:false. La seule lecture planning de #444 ne suffit jamais à écrire.

Même carte `bookingHours`/`bookingHoursExecution`, schéma syna-booking-hours-1, mêmes confirm-booking-hours avec confirmation:true littéral /cancel-booking-hours. **Claude : `localEditAllowed(view,'booking-hours')`**, helper partagé étendu ; `nativeLocalEditAllowed` reste false dans A1 pour fermer les domaines sans exception. Après reçu :studio:booking-changed et relecture native, aucune valeur optimiste. Conserver les contrôles de sourceVersionId/résultat/conflit/reprise du handle.

Phrases acquises :`Change les horaires réservables du mardi de 9h à 12h et de 14h à 18h`, variante interrogative, `Ferme les réservations le mardi`. Cible salon/cabinet/onglet Rendez-vous, un jour hebdomadaire, aucune date exceptionnelle/restaurant/profil substitué. L'aiguilleur exclut explicitement les intentions de fermeture datée et de restaurant ;outsideQuotes est conservé. Aucun mode réel activé.

Droit/drapeau retiré :confirmation/cancel et rejeu d'ancienne proposition/reçu refusés AVANT cache ;GET n'expose plus la carte. Source manuelle changée :409 sans écrasement. Les autres actions A1 restent fermées. Le reçu historique peut être relu/rejoué au même corps/requestId sans réappliquer le changement ;il garde sa version exacte,ne pas annoncer qu'il écrase une modification ultérieure.

## Preuves

**16nouveaux tests ;106 tests distincts/5fichiers et types verts** (61/3 +45/2 disjoints). Deux parcours positifs absents sur le parent (2rouges), puis vérifiés salon/cabinet :avant/après sans écriture, accord gratuit, un seul jour et une seule version. Anciennes versions exactes,projet inchangé sauf pointeur de version/date native,toutes autres tables/octets/profil/shop.chat/réservations inchangés,Préparation toujours absente/projectRevisionnull.

Annulation/TTL/retrait drapeaux/forfait/compte/produits/empreinte/conflit/identifiant de reprise et autres domaines refusés. BudgetIA0 ne bloque pas ce parcours gratuit. Échec d'écriture du reçu :rollback de la version et du pointeur/état,reprise légitime du même corps ne crée qu'une version. Fermer le mardi ne change ni n'annule un rendez-vous acquis ce mardi, dans les deux moteurs.

Vrais HTTPauth après17secondes +GET projet/conversation :proposition conservée,faux accords refusés,accord littéral,résultat GET natif,reçu rejoué avec un seul tour et une seule version. Aucune consommation ou activation. Régressions des lecteurs A1 et des anciennes retouches/dossiers A1 intactes.

Logs : `/tmp/parity301-existing-booking-hours-{parent-red,final,acquired-regressions,types-final}.log`.

**Limite : carte et handle Claude à adapter à ce droit précis, puis recette Studio compilée A1 indépendante et CI commune au SHA exact.** Restaurant/fermetures datées/intervenants/textes et autres nouveaux mutateurs A1 ne sont pas ouverts par ce drapeau. Aucune parité globale annoncée.

Aucun fournisseur réel,client réel,réservation réelle,activation,déploiement ou fusion main.
