# Période ciblée d’un atelier natif

Parent #484 / 3db6ca7e11fa97c454c1fd86f294301da45e18f4. Moteur/API uniquement ; aucun composant ou style Claude modifié.

## Contrat

`prestationsInput.workshopSchedulePatch: {id, date?, time?, durationMinutes?}` : identifiant canonique unique, au moins un champ et aucun autre réglage. Date civile ISO réelle, heure HH:MM 00:00–23:59, durée entière native 5–600 minutes sans arrondi. Une seule section de calendrier active et un cabinet sont nécessaires. `GET prestations.workshops[].durationMinutes` complète date/time déjà disponibles.

L’aperçu et l’enregistrement réutilisent `buildPrestations`, la définition native des réglages, `coerceSetting` et le moteur partagé du cabinet. Seuls les champs fournis du bloc ciblé changent ; aucune seconde configuration. La période résultante doit être complète, future selon le fuseau natif, se terminer au plus tard à minuit et ne chevaucher ni séance confirmée ni atelier configuré. Les périodes adjacentes sont autorisées. Les règles générales heures/horizon des séances ne sont pas inventées pour les ateliers.

## Acquis et concurrence

Toute inscription confirmée de cet atelier, y compris historique ou portant un alias brut acquis, interdit de changer sa période (`workshop_schedule_has_confirmed`/409). Aucune migration implicite, annulation, notification ou réécriture de prix/contact/jeton. Les inscriptions annulées restent intactes et ne bloquent pas une nouvelle période. La reprogrammation des personnes déjà inscrites reste un autre périmètre, non implémenté ici.

L’API existante vérifie `ifVersion` et relit compte et occupation sous sa transaction d’écriture. Un inscrit ou une séance réellement commis avant ce verrou est pris en compte. L’aperçu ne crée pas de table de réservation ; seule l’absence exacte d’une table native paresseuse signifie aucun enregistrement. Toute autre erreur de lecture échoue fermée. Mode démo/live, autres blocs, profil, tarifs, capacités et finances inchangés.

## Exécutions

- Parent : sept rouges attendus (quatre cas de réglage absent et trois gardes attendues),21 cas non sélectionnés : `/tmp/parity301-native-workshop-schedule-parent-red.log`.
- Premier passage :71 verts/1 échec de fixture : appel `proCreate` sans argument kind. Fixture corrigée avec `cabinet` et contacts fictifs, garde produit inchangé ; log conservé `/tmp/parity301-native-workshop-schedule-first.log`.
- Passage final : **77 tests distincts validés, tous verts**, dont **33 nouveaux** : `/tmp/parity301-native-workshop-schedule-final.log`. Régressions capacité/prix/identités natives conservées. Après 76 cas sur quatre fichiers, ajout du garde sans repli UTC et rejeu final des 33 cas du lot : `/tmp/parity301-native-workshop-schedule-timezone-final.log`.
- Le premier contrôle de types signalait deux appels de fixture incomplets (modality/date/time requis par CreateInput). Champs fictifs ajoutés, cinq cas concernés rejoués ; aucun code produit changé. Types et diff vérifiés séparément : `/tmp/parity301-native-workshop-schedule-types-final.log` et `git diff --check`.

Aucun fournisseur, e-mail, paiement, client réel, activation, fusion main ou déploiement. Tests vrais moteurs/handlers/SQLite isolée, sans recette navigateur nouvelle. Le raccordement naturel, l’aperçu conversationnel et sa carte sont le lot suivant ; CI complète du commit livré à suivre, aucune certification globale anticipée.
