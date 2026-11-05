# Régler le fuseau natif du calendrier depuis SYNA

## Contrat pour Claude

`STUDIO_CONVERSATION_BOOKING_TIMEZONE=1` sous LOT_A/AI/CONTEXT, fermé par défaut. Propriétaire, forfait, projet services, onglet Rendez-vous ; un calendrier natif unique. Aucun droit A1 ajouté, aucun basculement de mode. `bookingTimezone` et capacité `bookingTimezoneExecution`, schéma `syna-booking-timezone-1`, états ambiguous/proposed/applied. Diff textuel before/after (pas d’unité numérique), kind, warnings natifs, nativeHref, coût/providerCalls zéro, financialConsent false, confirmationRequired, sourceVersionId/resultVersionId/receiptId.

Phrases exécutées : `Change le fuseau du calendrier par « America/Los_Angeles »`, `Peux-tu modifier le fuseau horaire du calendrier à “Asia/Tokyo” ?`, `Je voudrais fixer le fuseau de réservation par "UTC"`. Trois guillemets, cible UTC/IANA exacte et citée, aucune ville devinée ou conversion de rendez-vous. Aiguilleur outsideQuotes et priorité locale : les mots d’action cités restent des valeurs inertes. Les phrases incomplètes/invalides/combinées et plusieurs calendriers sont clarifiés sans mutation ni devis cognitif.

`confirm-booking-timezone` exige proposalId et confirmation true littéral. `cancel-booking-timezone` conserve le fuseau actuel. Aperçu natif sans version, source/empreinte/version/TTL15min, conflit plutôt qu’écrasement, même aperçu à l’accord, sauvegarde et reçu atomiques, relecture exacte, réponse perdue reprise avec un seul reçu/une version.

**Avertissement à afficher avant accord** : nouveau fuseau = nouvelle interprétation temporelle des disponibilités, dates locales et délais, y compris pour les rendez-vous déjà acquis. Leurs dates/heures stockées ne sont ni converties ni migrées. Aucune notification/activation automatique. La confirmation change seulement le setting du calendrier ; elle ne déplace/annule aucune réservation. Métadonnées natives non fiables, à échapper.

Carte/handle anti-devis, résultat et rafraîchissement Rendez-vous, recette compilée indépendante Encre/Plein cadre bureau/tactile à Claude sur le SHA intégré. Aucun composant/style/branche Claude modifié. Registre appointments.settings décrit seulement set-one-exact-native-calendar-timezone, scope partial ; cela ne qualifie pas toutes les règles de réservation.

## Preuves et limites

**28 nouveaux tests, 105 cas distincts dans quatre fichiers et types verts.** 77 régressions déplacement/délai client/anti-devis également vertes. Trois moteurs ×neuf/préparé, demandes naturelles et guillemets, cible/diff/impact, aperçu inerte/accord/résultat natif, profil/préparation/finances exacts. Trois moteurs avec véritables réservations fictives : lignes entières inchangées à l’accord. Strict/no-op/registre free/flag fermé, faux devis refusés après abandon/flag fermé, conflit manuel, rollback du reçu/reprise, capability/forfait avant cache, contexte/expiration/A1 fermés, calendriers multiples refusés.

Handlers HTTP authentifiés, SQLite fictive isolée, attente monotone réelle ≥17 secondes et GET projet/fil, même aperçu avant accord ; false/absent/chaîne true refusés ; accord et GET prestations relisant le fuseau, relecture/rejeu un reçu/une version. **Preuve HTTP seulement, aucune nouvelle recette navigateur compilée.** Fetch et réseau fournisseur interdits. Initialement erreur de déclaration duplicate moveBookingAction dans le raccordement : aucun test exécuté, variable timezone dédiée corrigée avant qualification ; 26 cas puis2 protections supplémentaires verts.

Logs /tmp/parity301-booking-timezone-{first,final,boundaries,regressions,types-final}.log. Parent #475/08efbe12c756b52986d422fc8446d6ff61bb4c42. CI exacte du commit livré à suivre. Pas de certification universelle des fuseaux/DST, cartes et recette indépendante encore ouvertes. Aucun client réel, dépense/fournisseur, activation, main ou déploiement.
