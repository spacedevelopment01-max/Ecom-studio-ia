# Protéger les identités acquises et leurs rendez-vous

## Défauts réellement reproduits

Le thème peut conserver un identifiant opaque comme `Diagnostic__ID`. Le moteur natif partagé le normalise en `diagnostic-id` pour ses réservations. L’éditeur comptait seulement les rendez-vous sous le premier identifiant : **salon et cabinet autorisaient la suppression malgré une véritable réservation native confirmée à venir**. Le changement de durée omettait aussi son avertissement acquis.

L’allocation des nouvelles identités réservait uniquement les identifiants de source. Ajouter « Diagnostic ID » créait donc un deuxième `diagnostic-id` pour le moteur, aussi bien dans l’ajout ciblé que dans le formulaire natif complet. Même défaut pour un intervenant acquis `Alex__ID` et un nouvel « Alex ID ».

**Neuf nouveaux cas sont rouges sur le parent**, avec véritables PUT authentifiés, rendez-vous créés par les moteurs natifs et contrôle des lignes SQLite. Deux cas supplémentaires `toString` reproduisent ensuite une suppression complète autorisée à tort : une propriété héritée de JavaScript polluait le calcul numérique du compteur.

## Correctif minimal

- Le compteur prend en compte l’identifiant de source et son identifiant moteur, sans compter deux fois lorsqu’ils sont identiques. Seules les propriétés réellement présentes dans le résultat SQL sont lues ; `toString` ou `constructor` ne deviennent pas des nombres de rendez-vous.
- Les nouveaux identifiants réservent aussi les identités normalisées des services et intervenants acquis, puis utilisent le suffixe natif existant (`-2`, etc.).
- La normalisation vient des moteurs partagés, sans seconde implémentation de leurs règles.

**Aucun identifiant acquis réécrit**, aucun changement du normaliseur public, aucune migration des rendez-vous, clients ou jetons. Exemple : la source conserve `Diagnostic__ID`, le rendez-vous conserve `diagnostic-id`, et le voisin reçoit `diagnostic-id-2`. Les anciennes collisions éventuelles ne sont pas renommées automatiquement.

Les contrôles de jour local, statut confirmé, échec SQL, version et transaction sont conservés. Les retouches numériques restent possibles et les rendez-vous conservent leurs prix/durées enregistrés ; l’avertissement s’affiche désormais quand leur identité moteur correspond à la prestation.

## Validation et limites

**11 nouveaux tests ; 83 cas distincts dans 6 fichiers et types verts.** Source opaque/canonique, vraie réservation native future, refus de suppression sans version, avertissement de durée et rendez-vous exact, ajout ciblé ou complet sans collision, intervenant, identifiant de propriété héritée. Régressions des dates/fuseaux, ajout/retrait ciblés, intervenant ciblé, éditeur natif et identités bornées acquises.

Véritables helpers et handlers HTTP **en processus**, SQLite/Session isolées et données fictives ; aucun fournisseur, notification ou projet client. Logs locaux : `/tmp/parity301-native-booking-id-alias-parent-red.log`, `/tmp/parity301-native-booking-id-prototype-red.log`, `/tmp/parity301-native-booking-id-alias-final.log`, `...-identity-regressions.log`, `...-types-final.log`.

Parent #454. Préalable découvert avant le raccordement de l’ajout/retrait d’intervenants, qui reste une lacune à traiter ensuite. Aucun nouveau drapeau, DTO ou composant ; aucune nouvelle recette navigateur revendiquée. Pas de dépense, activation, fusion ou déploiement.
