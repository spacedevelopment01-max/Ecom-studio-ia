# Délai client d’annulation et de déplacement : contrat natif ciblé

## Contrat

Extension exclusive et stricte de prestationsInput : `bookingWindowPatch:{cancelHours: entier}`. Bornes natives salon/cabinet 0..72 heures, pas1, réutilisant sectionSchema et coerceSetting de l’éditeur ; aucun arrondi/clamp, aucun mélange d’un autre champ. Le restaurant n’a pas ce réglage :409, sans version enregistrée ni règle inventée. GET prestations.bookingWindow.cancelHours reflète rdvRules, null pour restaurant. La prévisualisation native ne crée ni version ni écriture de réservation ; sauvegarde native avec ifVersion existant.

**Effet à afficher impérativement avant accord** : ce délai régit les futures demandes d’annulation et de déplacement en ligne des clients, y compris leurs rendez-vous déjà enregistrés. Les enregistrements/date/heure/prix/notes/identités restent inchangés. Les actions professionnelles conservent leurs droits natifs ; aucun message automatique. Le réglage ne constitue pas une annulation ou un déplacement. 0 signifie une demande permise jusqu’à l’heure du rendez-vous selon le moteur natif, pas une fermeture du libre-service. Mode/activation inchangés.

## Preuves

17 nouveaux tests,50 cas distincts dans trois fichiers et types verts. Deux reproductions parent rouges : commande ciblée absente, refus Zod. Puis vrais aperçus/PUT/GET propriétaires, source/version attendue exacte, aucune réservation/finance modifiée. Bornes0/72 acceptées, négatif/73/fraction/chaîne/null refusés, mélange/stale source refusés, restaurant non substitué.

Sur vrais rendez-vous et jetons fictifs salon/cabinet : règle48h bloque réellement annulation ET déplacement clients à25h de l’échéance ; professionnel déplace encore selon ses droits. Retour explicite à0 permet réellement les quatre chemins clients annulation/déplacement. Warnings explicitent les rendez-vous déjà enregistrés. 33 régressions horizon/délai minimal/pas des créneaux vertes. Fetch et réseau fournisseur interdits.

Logs /tmp/parity301-native-client-cancel-window-{parent-red,final,zero,types}.log. Parent #472/57746a17ae6fa8894bdfa83771ec191f22c92681 ; CI exacte du commit livré à suivre. Le raccordement naturel/carte n’est pas encore réalisé dans ce lot. Aucun client réel, activation, fournisseur/dépense, fusion ou déploiement.
