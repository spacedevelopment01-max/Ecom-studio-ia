# #211 — D11d : une image sociale depuis SYNA

**Pour revue, #211 reste partielle.** Application, build et recette navigateur : `5ec638f2060ae3372ab4cb08ced7f7ee951feb15`, production/arbre propre vérifiés par `/api/version`. Derniers tests seuls : `0bda43f691e0a6330b982de68c46868663e86caf`. Aucun fournisseur réel, coût réel **0 €**, fusion, activation, déploiement, publication extérieure ou modification de client/thème Claude.

## Fonction réalisée

Dans la conversation SYNA existante : préparer un brouillon avec image explicitement en attente → devis distinct de son visuel → accord → vrai worker `agent.social.produce` → **producteur social natif** → bibliothèque et média du brouillon → aperçu/téléchargement → réouverture. Une image manquante par accord, une seule passe, aucune substitution locale, réapprobation, programmation ou diffusion. Les dates du calendrier restent des brouillons.

`pendingImage:true` distingue un brouillon incomplet annoncé d’une image livrée ; un brouillon image vide implicite reste refusé. Les titres/légendes natifs demeurent entiers (espaces et sauts de ligne conservés), la génération reçoit l’offre native précise et la demande complète. Le contrôle créatif natif reste actif ; sa réussite simulée ne prouve pas une qualité réelle.

Fichiers principaux : `social-production-execution.ts` (devis/accord/reçu/reprise), route `studio-agent/conversations/[cid]/social-production`, composants `conversation-social-production`/`conversation-social-tools`, `social-v2/bounded-production-quote.ts`, `production.ts`, `deps.ts`, `ai-post.ts`, `native-subject.ts`, `strategy-consumption.ts` et worker. Aucun moteur concurrent.

## Risques contrôlés et corrections vérifiées

- **REPRODUIT/corrigé :** le producteur comparait encore le plafond de trois essais à un devis d’une seule passe. Il compare désormais le plafond natif précisément consenti, **sans relever celui-ci**. La recette SDK a détecté ce blocage avant tout appel image.
- **CONFIRMÉ DANS LE CODE/testé :** références et logo épinglés au devis (versions/empreintes), routes et coûts calculés avec les fonctions de tarification natives. Changement de contexte, prix, route, source, financement ou angle : nouvel accord requis avant envoi. Aucun secours hors route consentie. Angles de communication service préservés dans le vrai gestionnaire enveloppé.
- **REPRODUIT/corrigé :** le tarif des modèles à prix par image utilisait le nombre de références comme nombre de sorties : zéro référence donnait zéro image, plusieurs références plusieurs sorties. `aiPostMaxMicro` compte **une sortie** ; test sur modèle tarifé du catalogue, sans ID inventé ni appel fournisseur.
- **TESTÉ :** réemploi compatible à coût nul malgré photo source retirée, budget épuisé ou ancienne échéance IA ; aucune remise à zéro des bornes. Résultat natif déjà acquis dans le checkpoint finalisé après coupure, sans nouvelle génération, même si route/devis expirés. Échec : acquis et coûts conservés, un seul essai, aucun remplacement. Nouvelle consigne sauvegardée → nouveau devis explicite pour le brouillon manquant, pas un redémarrage automatique.
- **TESTÉ :** changement manuel avant worker refusé ; modification après livraison signalée historique tout en conservant le téléchargement original. Forfait inactif : acquisition refusée, reçu acquis toujours consultable. Compte étranger404, absence de session401, CSRF403, plafond forgé400. Une image existante n’est pas remplacée par ce parcours.
- **OBSERVÉ à l’inspection/corrigé :** pourcentage interminable du plafond remplacé par une forme localisée arrondie vers le haut (ex.1,58 %), jamais inférieure au plafond autorisé ; coût/plafond interne inchangé.

## Preuves et commandes exécutées

- `npm test -- tests/conversation211-social-production.test.ts tests/social-production-maximum-display.test.ts` : **22 réussis**, dont cas réservés **pied à coulisse pour céramique** (mono/multi) et **restauration de joints de vitraux**, ajoutés après le développement fondé sur rabot de lutherie/reprise de coutures de voiles. Les noms restent uniquement dans les fixtures, jamais des règles applicatives.
- Régressions native/service/dépendance : **33 réussis/4 fichiers** (`conversation211-social-production`, `mission160-service-scopes`, `social-preserved-delivery`, `ci-native-production-placement`), avant les derniers ajouts de tests. Nombres recouvrants, ne pas les additionner.
- `npm run build` final sur **5ec638f2** : réussi, types inclus. Pas de nouvelle suite complète locale répétant les anciens parcours ; **CI finale complète obligatoire sur la tête publiée**, pas présumée verte.
- `node --import tsx scripts/verify-agent211-build.ts <sortie-isolée> --social-production-ui` : **réussi sur le même SHA propre compilé**, Chromium1440/360px et vrai worker. Accord, bouton≥44px, pixels servis/téléchargés identiques au fichier natif, conservation du texte, aucune approbation/connexion/diffusion. Photo désignée réellement jointe au SDK :10 494octets, SHA préparé `aaac834d…20a8ec`, identiques à la référence native. Un appel image pour la réussite, puis un503 simulé sur une seconde création : échec à95%, un seul envoi, premier résultat intact. Rechargements sans nouvel appel. [Preuve](preuves-211-D11d/social-production-proof.json).

Quatre captures finales réellement ouvertes : [ordinateur](preuves-211-D11d/01-devis-visuel-ordinateur.png), [devis mobile](preuves-211-D11d/02-devis-visuel-mobile.png), [résultat mobile](preuves-211-D11d/03-visuel-mobile.png), [échec et acquis conservé](preuves-211-D11d/04-echec-mobile.png). [Film réel18,2s](preuves-211-D11d/social-production-workflow.mp4), vitesse inchangée. **Le visuel est une mire synthétique**, pas une photographie ni une création professionnelle qualifiée. Son PNG natif3,29Mo est conservé dans l’artefact CI complet, avec le WebM original ; seuls captures, film et preuves ciblées sont versionnés ici. SHA du fichier téléchargé : `2855a737acbfa47f82ee5371c38fdfc881f60a9d4e3e4ee31cc9be6a0aa57ef8`.

Échecs intermédiaires conservés dans le suivi : fixtures image sans déclaration d’attente, test sélectionnant un modèle sans tarif, photo service non raccordée puis épinglée, angle service mal comparé, ancien plafond trois essais. Le faux handler SDK ignorait le nouveau drapeau et renvoyait500 ; sa fixture suivante renvoyait1440×960 pour4:5, correctement refusé avant QC par le garde de cadrage. Diagnostic minimal : refus de1440×960, acceptation de1080×1350, **aucune protection assouplie**. Dernière répétition justifiée par la correction du plafond affiché : build et parcours final entièrement réussis. Les compteurs/coûts HTTP/SDK sont simulés, pas des factures fournisseur.

[SHA, commandes, heures et fichiers](211_D11D_PREUVES.json).

## Dépendances et limites

Base #255 **2bfc6a29**, correction **9e5e171c reprise par contenu** (résultats approuvés préservés, fixture A/B renforcée). #2559e5e171c/CI41064584176 attend encore sa CI ; ne pas appliquer son correctif deux fois. #253603c3204 et #2520b23a265 sont prêtes/CI complète verte ; #254 reste à qualifier. Aucun changement aux branches Claude #239/#245/#247/#248.

| Opération | État réel |
|---|---|
| Préparation de brouillons/calendriers/campagnes | Moteurs natifs, livraisons D11a/b distinctes |
| Une nouvelle image sociale et téléchargement | Implémenté, vrai Studio/worker/SDK, HTTP fournisseur **simulé** |
| Réemploi, versions, reprises, budgets et droits | Recettes ciblées et scénario navigateur décrits ci-dessus |
| Publicités visuelles de campagne, carrousels/vidéos depuis ce nouvel outil | Raccordements SYNA encore à terminer ; aucun remplacement implicite |
| Programmation, comptes sociaux, diffusion, CMS | Non exécutés, aucune connexion ou dépense de diffusion |
| Authenticité fournisseur et qualité créative réelle | **Non qualifiées** ; drapeaux fermés, Studio client non mis à jour |

Suite : créations publicitaires natives et compléments D10, puis D12/E/F et intégration commune. Cette PR ne déclare ni D11 entier ni #211 terminés.
