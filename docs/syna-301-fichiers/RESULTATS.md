# #301 C24 — ranger un fichier depuis SYNA (carte Fichiers, contrat #305)

Branche `claude/syna-301-fichiers`, sur `codex/parity301-local-files` (#305, `a3efbfba`). **Interface seulement** : le
moteur de Codex n'est pas modifié. Aucun fournisseur appelé, **coût IA : 0**. Ne pas fusionner sans accord du propriétaire.

## Ce qui change pour la personne
- Dans **Fichiers**, cocher **un** fichier (ou l'ouvrir) le désigne à SYNA : « Média désigné · version 1 ». Plusieurs
  fichiers cochés ne désignent rien.
- « Renomme ce fichier en « … » » ou « Déplace ce fichier vers le dossier « … » » : SYNA montre une carte
  **Rangement gratuit du fichier** avec l'avant / après (nom ou dossier), « Gratuit — 0 € », **Confirmer gratuitement** /
  **Annuler**. Aucun bouton de devis.
- Après confirmation : « Enregistré et relu · reçu … » ; la liste **Fichiers** se met à jour sans recharger la page.
- Le contenu du fichier, sa version et son historique ne changent pas.

## Recette navigateur (`scripts/syna301-fichiers-recette.ts`) — **4 parcours sur 4**

Encre et Plein cadre, ordinateur 1440 px et téléphone 390 px, vrai Next.js, moteur réel de Codex, stockage isolé,
réseau hors boucle locale refusé (seules les polices Google de la coquille ont été bloquées, 4 requêtes).

| Étape | Encre ordi | Encre tél. | Plein ordi | Plein tél. |
|---|:-:|:-:|:-:|:-:|
| Mode du compte appliqué, aucun débordement | ✓ | ✓ | ✓ | ✓ |
| Un fichier coché → « Média désigné · version 1 » | ✓ | ✓ | ✓ | ✓ |
| Demande ambiguë : explication, aucun bouton, rien d'écrit | ✓ | — | ✓ | — |
| Annuler avant l'accord : rien d'écrit, cible conservée | ✓ | — | ✓ | — |
| Proposition : avant / après, Gratuit — 0 €, aucun devis, aucune écriture | ✓ | ✓ | ✓ | ✓ |
| Réponse perdue **après** l'enregistrement → « Vérifier l'enregistrement » : reçu retrouvé, **une seule** confirmation enregistrée | ✓ | — | ✓ | — |
| Confirmation, reçu relu, liste à jour sans recharger | ✓ | ✓ | ✓ | ✓ |
| Rechargement : nom et reçu conservés | ✓ | ✓ | ✓ | ✓ |
| Déplacement vers « Documents validés » : le fichier quitte la racine, il est dans le dossier | ✓ | — | ✓ | — |
| Octets, version et nombre de fichiers inchangés | ✓ | ✓ | ✓ | ✓ |

`ai_calls` = 0, `jobs` = 0, 0 erreur JavaScript. Preuves : `RESUME-FICHIERS-301.json`, `captures/`.

## Tests
- `tests/syna301-fichiers-carte.test.ts` : **14 sur 14** (contre le vrai moteur : double clic = une confirmation ; réponse
  perdue et remontage = même corps et même `requestId` ; vérification sans renvoi ; annulation A2 ; modification humaine
  entre proposition et accord = refus sans faux succès ; « applied » sans reçu refusé ; 401/402/403/404 bloqués ; drapeau
  fermé ; raccordement).
- `npx tsc --noEmit` : aucune erreur. `npx vitest run` complet : **4 742 réussis**, 31 ignorés, 1 échec d’environnement (`theme211-render-evidence` : Chromium attendu à `/usr/bin/chromium`, absent de ce conteneur ; échec identique sur la base #305 `a3efbfba`).

## Limites
- Les anciens projets A1 sans Préparation restent en lecture seule ici : leur ouverture aux retouches gratuites (#313,
  Codex) demande une adaptation de la carte, prévue à la vague suivante.
- Chromium seulement, sans écran ; clavier virtuel, Safari, Firefox et lecteur d'écran non testés.
- La branche reprend, à l'identique, le correctif d'empilement de la coquille au téléphone de #299 (`41931a5e`).
