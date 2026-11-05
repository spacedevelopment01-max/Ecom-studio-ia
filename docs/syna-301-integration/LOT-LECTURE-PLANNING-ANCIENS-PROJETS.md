# Planning natif dans une reprise A1

Parent #443 /9fc4cbdbe0b139963a2cee240e0024d5db40f3bd. Exception de lecture précise ; aucune permission d'écriture ou d'IA générale.

Drapeau supplémentaire **STUDIO_CONVERSATION_EXISTING_BOOKING_RECORDS_READ**, fermé par défaut. Il exige BOOKING_RECORDS/LOT_A/AI/CONTEXT et un projet de services. Le drapeau EXISTING_LOCAL d'écritures peut rester fermé. Le serveur expose `recovery.localReads` (schéma existing-local-read-1) avec op **booking-records**, readOnly:true, confirmationRequired:false, coût/provider0, financialConsent:false. Même carte `bookingRecords` et capacité `bookingRecordsRead.enabled` que #443.

**Claude : utiliser `localReadAllowed(view,'booking-records')`**, helper partagé étendu ; ne pas déduire ce droit d'un texte de reprise, de localEditsWritable ou d'un droit d'écriture. Les opérateurs inconnus sont refusés. Afficher le même relevé minimal ; aucun bouton de mutation/devis. `recovery.actionsEnabled/aiEnabled` restent false, localEdits absent si ses propres drapeaux ne l'ouvrent pas. Préparation absente/projectRevisionnull, ancien shop.chat, versions, médias/octets, profil et tables métier conservés.

Le contrôle de propriétaire/forfait et du drapeau précède le retour d'un ancien reçu. Après retrait du droit, GET ne renvoie plus la carte et le rejeu d'une réponse qui la contenait est refusé409. Un message nouveau sous drapeau fermé garde l'ancien comportement A1 de parole seule, sans lecture native. Changement du moteur ne substitue pas un autre planning. Chaque GET autorisé relit la source native, dans le verrou `withAiDisabled` commun au lecteur normal et A1.

## Preuves

**15nouveaux tests ;101 tests distincts/5fichiers et types verts** :56/3 pour lecteurs A1/prompts/natif,45/2 pour retouches et dossiers A1 acquis, ensembles disjoints. Comparaison au parent exact :les trois moteurs A1 étaient non raccordés (3rouges), sans échec de fixture.

- Trois moteurs salon/cabinet/restaurant historiques :droit exact, données acquises lisibles, aucune Préparation créée, empreintes de toutes les tables hors conversation et de tous les octets identiques.
- Drapeaux fermés/contexte retiré/produits/autre compte/forfait révoqué/cache :aucun accès indu. Budget IA épuisé n'empêche pas la lecture gratuite et ne change aucune ligne budgétaire.
- Faux droits client et op inconnue refusés par helper ;retouche d'intervenant/horaires, création/annulation/déplacement, outils et cognition toujours fermés dans A1.
- POST et GET natifs exécutés sous garde sans IA ;échec du lecteur =rollback du message/état, aucune fausse liste persistée.
- Vrais HTTPauth après17secondes +GET projet/conversation :scope conservé,résultat natif relu,rejeu du même reçu avec un seul tour,aucune mutation métier/Préparation/consommation/version ajoutée.

Logs : `/tmp/parity301-existing-booking-read-{parent-red,delivery,acquired-regressions,types-final}.log`.

**Limites : carte/anti-devis Claude et recette Studio compilée A1 indépendante restent à faire.** Le droit n'ouvre ni configuration de services A1,ni intervention sur les réservations,ni nouveau fournisseur ou compte. Statut PARTIEL. Les données des tests sont fictives,les moteurs et handlers HTTP sont réels.

Aucun client réel,activation,réservation réelle,fournisseur réel,déploiement ou fusion main.
