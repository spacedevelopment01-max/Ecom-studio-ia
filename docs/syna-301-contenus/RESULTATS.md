# #301 C21 — modifier un bien, un plat ou une réalisation depuis SYNA (contrat #310)

Branche `claude/syna-301-contenus`, sur `codex/parity301-business-content` (#310, `baeafcbc`). **Interface seulement**,
plus la lecture du drapeau du raccordement dans `GET /api/projects/:id` (`conversationBusinessContent`, comme
`conversationCatalogue`). Moteur de Codex non modifié. **Coût IA : 0.** Ne pas fusionner sans accord du propriétaire.

## Ce qui change pour la personne
- Dans **Biens**, **Carte** et **Réalisations**, chaque fiche a un bouton **Désigner pour SYNA** (le même geste que le
  Catalogue). Il n'apparaît pas quand le raccordement est fermé.
- « Renomme ce bien / ce plat / cette réalisation en « … » » ou « Modifie le prix de ce plat à 18,50 € » : carte
  **Modification gratuite du contenu**. Elle montre l'avant / après, et annonce l'effet natif s'il y en a un (par exemple
  l'adresse de la page d'un bien). Elle affiche « Gratuit — 0 € », « Aucun appel de publication », puis **Confirmer
  gratuitement** / **Annuler**.
- Après confirmation : « Enregistré et relu · reçu … » ; l'espace se met à jour sans recharger, et la désignation suit
  la nouvelle version (une deuxième demande reste possible).
- La ligne de désignation affiche « modifié le jj/mm/aa hh:mm » au lieu d'un horodatage brut.
- Statut, publication, photos et autres champs : inchangés.

## Recette navigateur (`scripts/syna301-contenus-recette.ts`) — **4 parcours sur 4**

| Parcours | Résultat |
|---|---|
| Encre · ordinateur · **plat** : prix 16,00 € → 18,50 €, réponse perdue **après** l'enregistrement, vérification : une seule confirmation | ✓ |
| Encre · téléphone · **bien** : « Maison fictive » → « Maison des Tilleuls », adresse de page annoncée (`maison-fictive-v-0001` → `maison-des-tilleuls-v-0001`) | ✓ |
| Plein cadre · ordinateur · **réalisation** : demande ambiguë (aucun bouton), annulation (rien d'écrit), puis nouveau nom | ✓ |
| Plein cadre · téléphone · **plat** : prix 16,00 € → 21,00 € | ✓ |

Pour chaque parcours :
- le bouton « Désigner pour SYNA » donne « Contenu désigné » ;
- la carte affiche « Gratuit — 0 € », sans aucun bouton de devis et sans aucune écriture avant l'accord ;
- la valeur enregistrée est exacte et le statut reste inchangé ;
- l'espace est à jour sans recharger, et la désignation suit la nouvelle version ;
- au rechargement, la valeur et le reçu sont conservés ;
- `ai_calls` = 0, 0 erreur JavaScript, aucun débordement.

Preuves : `RESUME-CONTENUS-301.json`, `captures/`.

## Tests
- `tests/syna301-contenus-carte.test.ts` : **16 sur 16** contre le vrai moteur. Ils couvrent :
  - les trois types de contenu et le prix exact ;
  - la réponse perdue (corps identique) et la vérification sans renvoi ;
  - l'annulation A2 ;
  - une modification dans l'écran natif entre la proposition et l'accord : refus, sans faux succès ;
  - un reçu sans nouvelle version relue, refusé ;
  - les refus 4xx et le drapeau fermé ;
  - le raccordement et la date lisible.
- Tests de Codex `conversation301-business-content.test.ts` (29) et `integration276.test.ts` (tête #310 `f3c1dc15`) verts ;
  `npx tsc --noEmit` : aucune erreur.
- `npx vitest run` complet (sur `ba290bf1`, avant la fusion de `f3c1dc15`) : 4 729 réussis, 18 échecs, **aucun dû à cette
  branche**. 16 viennent de l'extraction partielle de ce conteneur, faute de place sur le disque (`docs/` et `reports/`
  absents) ; rejoués dans une extraction complète, ils passent. S'y ajoutent `theme211-render-evidence` (Chromium
  attendu à `/usr/bin/chromium`), un dépassement de délai `video-bounded-chain` (11 sur 11 rejoué seul) et
  `integration276`, qui échouait aussi sur la base #310 `baeafcbc` : Codex l'a corrigé dans `f3c1dc15`, fusionné ici,
  et il passe.

## Limites
- Prestations, horaires et intervenants (`services.update`), photos, création, suppression et statut ne sont pas
  raccordés (hors du contrat #310).
- Les anciens projets A1 restent en lecture seule.
- Chromium seulement, sans écran.
- La branche reprend, à l'identique, le correctif d'empilement au téléphone de #299 (`41931a5e`).
