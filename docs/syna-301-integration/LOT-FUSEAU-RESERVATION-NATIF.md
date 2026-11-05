# Fuseau du calendrier réservable : contrat natif ciblé

## Contrat

`bookingTimezonePatch:{timezone:"America/Los_Angeles"}` exclusif et strict. Identifiant exact UTC ou IANA pris en charge par Intl du runtime, longueur≤80, aucune ville devinée, offset libre ou repli UTC silencieux. Aucun renommage/canonicalisation implicite d’un alias valide. Cible : un seul calendrier natif actif/non désactivé dans la source ; plusieurs =409 sans choisir le premier. Réglage timezone text unique selon sectionSchema/coerceSetting existants. GET prestations.bookingTimezone reflète rdvRules.timezone.

L’aperçu native previewPrestations ne crée aucune version ou écriture de réservation. Sauvegarde par moteur prestations/ifVersion existants, un seul setting modifié, horaires/services/intervenants/mode/profil/autres sources conservés.

**Impact obligatoire à expliquer avant accord** : changer le fuseau modifie l’interprétation temporelle du calendrier et des rendez-vous déjà enregistrés (délais clients, disponibilités, dates locales). Leurs dates et heures stockées restent identiques, sans conversion ni migration. Aucun message automatique, activation ou autre règle changée. Cette action n’est pas un déplacement des rendez-vous.

## Vérifications

17 nouveaux tests,55 cas distincts dans trois fichiers et types verts : trois cas parent rouges pour contrat absent, puis aperçus/PUT/GET propriétaires et source exacte dans les trois moteurs, réservations/notes/prix/identités/profil/finances inchangés. À un instant UTC fixe12h, créneau10h déjà passé en Europe/Paris puis encore disponible en America/Los_Angeles : effet réel du moteur vérifié sans modifier la réservation acquise du lendemain. Warnings explicites.

UTC/Europe/Paris/Asia/Tokyo/America/New_York/Etc/GMT+12, erreurs et refus d’un offset deviné, champs supplémentaires, mélange et source périmée, plusieurs calendriers refusés. 38 régressions délai client/fenêtre natives vertes. Le premier passage avait16/17 nouveaux cas verts : l’assertion restaurant utilisait slots au lieu de services.flatMap(slots) ; correction du test puis cas ciblé vert et types requalifiés. Aucun moteur affaibli pour réussir.

Logs /tmp/parity301-native-booking-timezone-{parent-red,final,restaurant-fixed,types-delivery}.log. Parent #474/ff8526de9a48658af1195a6df110102d70430259, CI du SHA livré à relever. Pas de nouveau raccordement naturel ou carte dans ce lot. Pas de certification indépendante des transitions DST, des clients réels ou de tous les fuseaux ; runtime Intl réutilisé, pas de bibliothèque de conversion inventée. Aucun fournisseur réel, dépense, client, activation, fusion ou déploiement.
