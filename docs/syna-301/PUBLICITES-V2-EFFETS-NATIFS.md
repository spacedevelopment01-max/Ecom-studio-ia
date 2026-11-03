# #301 — agrandissement gratuit des titres V2

## Contrat pour l'intégration Claude
Phrase existante : « Agrandis le titre de la création sélectionnée ». Même sélection A2 ad-document-text, même route /ad-documents, operation title-larger, proposition puis confirmation gratuite explicite. Aucun devis fournisseur.

Le moteur natif localAdEdit reste la seule implémentation géométrique. Les V2 brutes déplacent parfois subline et cta ; l'ancien adaptateur rejetait ces opérations. nativeEffects conserve field/before/after et ajoute layerId, layerName, role, property et secondary. Un effet secondaire n'autorise que y sur un texte ou bouton visible, déverrouillé, de rôle subtitle/body/cta. La carte liste ces calques avant accord, avec les deux JPEG réellement rendus. Le titre peut changer x/y/w/h/font.size/autoFit.minSize. Images, textes, couleurs, marque, ordre des calques, format et autres propriétés restent identiques.

Les empreintes du document source, du résultat ET des effets annoncés sont revérifiées avant tâche et dans le commit natif. CAS, reçu lié au média et reprise sans double écriture inchangés. Un calque verrouillé ne peut être déplacé ni davantage recouvert par le titre. Un déplacement hors cadre est refusé avec une alternative gratuite explicite.

## Preuves
Reproduction sur le parent : 18/18 refus HTTP422. Après correctif : 18/18 propositions HTTP200, deux JPEG distincts, accord gratuit, tâche réelle locale, une version enregistrée et reçue, relecture exacte des calques du moteur natif ; deuxième confirmation identique sans nouvelle version ; images identiques et zéro ai_calls/usage_events. Fixtures V2 neuves, count=3 : 6 meta_feed, 3 meta_story, 9 combinées, données entièrement fictives et dépendances fournisseur simulées. Aucune fixture aménagée pour libérer le titre.

Tests : parity301-ad-v2-secondary-effects.test.ts (18 parcours), conversation301-ad-document-free.test.ts (HTTP, droits, concurrence, reçu, refus et effets falsifiés), local-ad-document-confirmation-client.test.ts (confirmation, annulation et réseau).

## Limites
Une seule opération de taille et un titre unique. Ce lot ne raccorde pas les autres retouches publicitaires. Un résultat natif impossible reste un refus explicite ; pas de relance IA. Les résultats de tests ne constituent pas une qualification créative ni une preuve d'absence de tout chevauchement visuel. Recette interface commune Encre/Plein cadre à requalifier avec Claude ; aucun fournisseur réel testé. Aucune fusion ni activation.
