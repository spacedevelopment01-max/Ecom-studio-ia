# ATELIER NUANCE (issue #177) — résultats des vérifications

Branche `claude/theme-atelier-nuance` (base `main` = `0a6aa1d`). Le commit exact livré est indiqué dans la PR.
Export vérifié : `scripts/reference-static-preview.ts <dossier> --only=atelier-nuance` → 29 pages, 105 fichiers
(`missing` : `reservation-confirmation.webp`, `salon-bandeau.webp`, remplacées par une photo du même kit).

## Vérifié réellement

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| `npx vitest run` (suite complète) | 358 fichiers, 2 909 tests réussis, 11 ignorés, 0 échec |
| Tests ATELIER NUANCE (`tests/atelier-nuance-booking.test.ts`, `tests/atelier-nuance-theme.test.ts`) | 15 + 15 réussis |
| `scripts/verify-theme.sh` (complet, comme la CI) et `--rapide` | « Thème : tout est valide » : 185 cas, 0 erreur |
| Theme Check ATELIER NUANCE services FR et EN | 0 erreur (7 avertissements : nombre de réglages de 3 sections, variables inutilisées de sections `fs-*` existantes) |
| Débordement horizontal, 29 pages × 4 largeurs (1440, 430, 390, 360) | 0 px partout |
| Erreurs JavaScript sur toutes les pages et tous les parcours | aucune |

## Parcours rejoués dans Chromium (ordinateur 1440 et téléphone 390)

Démonstration (`captures/parcours/`) :

1. « Continuer » sans prestation → message d'erreur.
2. Coupe & brushing : Alex et Sarah désactivés (« Ne réalise pas cette prestation »), Camille choisie.
3. Calendrier : 12 jours d'octobre désactivés (passés, fermés) ; le mardi 10 novembre 2026, Camille : 9 h 00, 10 h 30,
   14 h 00, 15 h 30 (planche 02).
4. Coordonnées : 5 erreurs affichées si vides ; sur téléphone, formulaire puis récapitulatif ; les champs sont conservés
   au retour en arrière.
5. Double clic sur « Confirmer » → une seule réservation (AN-0001) ; fichier `AN-0001.ics` téléchargé ; mention
   « Simulation — aucun rendez-vous réel ».
6. Depuis une fiche : la prestation est présélectionnée ; le créneau de 14 h 00 déjà pris n'est plus proposé.
7. Créneau pris au dernier moment (15 h 30) → écran « vient d'être réservé » avec 9 h 00 et 10 h 30 proposés.
8. Mon espace : AN-0001 à venir → déplacé à 9 h 00 → fenêtre d'annulation fermée par Échap → annulé, passe dans
   « précédents ».

Service réel simulé dans le navigateur (API interceptée, `captures/etats/`) :

- jeton refusé → « Ce lien a expiré » (pleine largeur, bouton « Retrouver mon rendez-vous ») ;
- service injoignable → erreur réseau dans l'espace client et dans la prise de rendez-vous (« Rien n'a été réservé et vos
  informations sont conservées ») ;
- jour sans créneau → « Aucun créneau disponible ce jour-là » ; jours « Fermé » et « Complet » dans le calendrier ;
- sans jeton → connexion par lien (aucun accès par e-mail seul) ;
- la mention « Tarifs et disponibilités de démonstration » n'apparaît pas en service réel.

Deux défauts trouvés par ce contrôle et corrigés : l'écran « lien expiré » / connexion était tassé dans une colonne
étroite, et la mention de démonstration restait visible en service réel.

## Service réel (tests automatiques, base de test isolée)

Refus tant que le salon n'a pas activé le service ; référence non devinable ; une seule réservation en cas de double
envoi ; course entre deux clients → le second reçoit « créneau pris » ; « Sans préférence » attribue une personne libre
et compétente ; jeton de rendez-vous limité à ce rendez-vous, jeton client pour tout l'espace, lien expiré refusé ;
déplacement atomique ; annulation dans le délai réglé ; recherche toujours neutre ; CORS ; données d'un autre salon
jamais lues.

## Non vérifié

- Envoi réel d'e-mails (aucun envoi pendant les tests) et service réel sur un vrai hébergement.
- Rendu dans une vraie boutique Shopify (contrôlé par Theme Check et le rendu Liquid du studio seulement).
- Les deux photos absentes de la partie 1 du ZIP.
- Lecteurs d'écran réels (structure vérifiée : un seul titre principal par page, focus, Échap, libellés).
