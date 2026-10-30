# #211 — E8 : retouches ciblées des textes depuis SYNA

**Terminé techniquement et vérifié en local ; CI finale à suivre dans la PR.** Fournisseurs simulés seulement, 0 appel réel et 0 € réel. Pas de qualité créative réelle qualifiée, de merge, de déploiement, d’activation ou de modification client. Les compositions et branches Claude sont préservées. #211 reste partielle.

Branche `codex/211-lot-e8-retouches-textes`, dépend de #264 `1faf4071de16d5d6496428dc6be6d1a30767db1c`. Code final **`8dce0191ba092f3c9e202252fd8800e04b46c77f`**, build et navigateur sur ce commit propre ; premier code/build `e778468da53a1c2dcb58cba941e05c7180f1cd4b`. Rapport et preuves ajoutés ensuite sans changement applicatif. Nouveau raccordement sous le drapeau rédaction E6, toujours fermé par défaut.

## Ce qui change et preuves

| Problème | Correction et validation |
|---|---|
| SYNA ne peut pas retoucher les passages d’un document existant. | Document/version/blocs choisis explicitement → consigne entière sauvegardée → devis montrant les passages → accord → `editContentV2` natif → reçu, texte entier, téléchargement et éditeur. Registre et contexte du principal raccordés. **REPRODUIT** par tests et deux parcours Chromium avec vrai worker/SDK vers HTTP local. |
| Le choix d’utiliser l’IA peut être remplacé par une heuristique ou une opération locale. | Contrat interne de réécriture IA explicite, sans substitution locale ; l’éditeur gratuit reste accessible. Un appel de réécriture, pas de rédaction globale/reprise automatique. **REPRODUIT** : consigne ne contenant pas un mot-clé de l’ancien interpréteur, IA absente, plafond insuffisant, sélection vide/forgée refusés. |
| Écraser un texte humain ou les passages non demandés. | Version et empreinte natives revérifiées avant appel et dans la transaction finale ; réponse limitée aux identifiants sélectionnés. Tentative payée stockée séparément en RETRY avant application ; anciennes versions conservées. **REPRODUIT** : correction concurrente, contexte changé, annulation, réponse incomplète et affirmation non confirmée conservent l’original. Réponse hors portée ignorée. |
| Un défaut déjà présent peut autoriser un nouveau défaut de même catégorie. | Comparaison des nouveaux constats locaux, pas seulement des noms de codes. **REPRODUIT** par test rouge : une nouvelle statistique non fournie reste refusée même si l’original avait déjà `invented_source`. Pas de baisse du contrôle qualité. |
| Plusieurs prestations peuvent mélanger leurs faits. | Réemploi de la projection native de prestation, par sa clé stable, avant Brain, brief et retouche ; aucune sélection par nom ou position. **REPRODUIT** par rouge puis vert : stores ciblés, autre offre de garage absente des faits. Scénario navigateur avec stores bannes et autre offre de portails. |
| Risque de réachat après interruption ou d’exécution par un ancien worker. | Type de job distinct `agent.content.edit`, bail/verrou natif, une tentative. Une version effectivement enregistrée est retrouvée par job/provenance et empreinte du corps ; perte de checkpoint ne la refait pas. **REPRODUIT** : reprise sans autre réécriture, même budget épuisé et délai fournisseur dépassé ; aucune nouvelle mutation de contenu. |
| Un texte explicitement rejeté peut finir en tâche « done ». | Après acquisition du document, une livraison native `blocked`/REJECTED/RETRY échoue désormais et conserve son résultat, sans remplacement local. **OBSERVÉ DANS LA RECETTE LOCALE** sur la première version : rejet anti-suroptimisation avant relecture, mais job done. Garde corrigée et test négatif réussi : tâche failed, progression <100 %, document rejeté conservé. |

Fichiers principaux : `seo-v2/engine.ts`, `seo-v2/subject.ts` ; `orchestrator/conversation/content-tool-{contract,execution}.ts`, `intelligence-context.ts`, `studio-operations.ts`, `tool-execution.ts` ; route `studio-agent/conversations/[cid]/content`, carte `conversation-content-tools.tsx`, `worker/handlers.ts`. Tests et harnais compilé étendus ; aucun second moteur ni nouvelle connexion.

Le plafond natif existant de retouche (0,20 € maximum interne) et les bornes de la demande restent communs aux appels ; le client voit seulement son pourcentage. Droits, forfait, financement, tarifs et disponibilité revérifiés avant achat ; finaliser une réponse déjà acquise ne demande pas de crédit frais. Contrôle final de contexte/version et de bail conservé. Résultat **PROVISIONAL**, à relire : pas de nouvelle qualification éditoriale automatique.

## Vérifications exécutées

```bash
npx vitest run tests/content211-edit.test.ts tests/conversation211-content.test.ts tests/seo-v2-engine.test.ts tests/conversation211-communication-registry.test.ts tests/content211-required-ai.test.ts tests/content211-wire.test.ts tests/conversation211-studio-knowledge.test.ts
npm run typecheck
npm run build
node --import tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/E8-targeted-final-proof --content-ui
```

**93 tests distincts / 7 fichiers**, types, build final propre et recette compilée réussis. Pas de double suite complète locale : CI complète unique à la publication du candidat final. Réseau fournisseur interdit via `NODE_OPTIONS=--import=./scripts/lot9/network-guard.mjs`, données et faux comptes isolés, aucune `.env`/configuration client. Le harnais refuse les sélecteurs de stockage existants.

Deux parcours : produit du Catalogue avec variante/homonyme (emporte-pièce, Brunie, 32,50 €) et prestation dans un projet à plusieurs offres. Pour chacun : **135 caractères exacts** décodés dans le SDK de retouche, un seul bloc transmis, autres blocs et métadonnées exacts, ancienne version intacte, téléchargement Markdown égal octet pour octet. Même demande après succès : acquis retrouvé sans appel. Seconde retouche : HTTP503, un essai, failed à 15 %, acquis précédent conservé ; rechargement sans achat. Bouton **Restaurer** du véritable éditeur : version4 retrouvant exactement les blocs/métadonnées de la version2, zéro appel supplémentaire. Les contrôles E6/E7 d’authentification, CSRF, acquisition et archivage restent dans cette même recette ; aucune version de thème créée.

Tests injectés supplémentaires : document humain, produit distinct lime d’établi, offres de services différentes ; entrée étrangère, devis périmé, sélection incomplète, ancien code de défaut, annulation, reprise, budget commun et tentatives acquises. Aucun nom de démonstration dans une règle applicative.

Échecs intermédiaires conservés : 8 rouges initiaux du contrat natif ; rouge du défaut de même code et rouge du mélange de prestations. Typage du harnais corrigé sans changer les contrôles. Premier navigateur : produit/retouche/restauration passés, puis fixture de service répétant trois fois son mot-clé dans un texte très court (51 %) correctement rejetée ; diagnostic minimal dans la base synthétique, aucun appel de relecture. La fixture SDK utilise maintenant la description fournie, sans supprimer le contrôle anti-suroptimisation. Le faux statut done, lui, est corrigé dans l’application. Les fixtures unitaires d’édition commencent par un document humain ; le test négatif utilise le mot-clé réellement ciblé. Nouveau build puis deux parcours passés. Les tests recouvrants ne sont pas additionnés.

## Résultat consultable

- [Devis et passage sélectionné sur mobile](preuves-211-E8/01-retouche-mobile.png)
- [Prestation retouchée dans l’éditeur ordinateur](preuves-211-E8/02-prestation-ordinateur.png)
- [Film réel des interactions](preuves-211-E8/retouche-native.mp4)
- [Assertions navigateur](preuves-211-E8/browser-proof.json), [vérifications et diagnostic initial](preuves-211-E8/checks.json), [inventaire](211_E8_PREUVES.json)

Deux captures finales réellement ouvertes et inspectées ; un film du parcours produit. Le texte « Reformulation simulée » vient du faux fournisseur et ne démontre aucune qualité rédactionnelle. Les 13 requêtes HTTP du total comprennent trois appels génériques préalables puis les deux parcours ; toutes sont locales, aucun fournisseur réel. Les jugements FINAL du scénario initial sont synthétiques ; les retouches sont provisoires.

## Limites et suite

Sélection explicite du document et des passages, pas de sélection sémantique autonome par l’agent ; 50 documents récents dans le sélecteur, 30 blocs maximum, consigne 8 000 caractères maximum. Types rédactionnels E6 seulement, pas de blog/publicité/contact autonome ajouté. Réemploi d’une tentative refusée = consultation gratuite et accès à l’éditeur, **pas de réapplication automatique** au document initial ; une reprise hors contexte ou après modification reste refusée, sans nouvel achat implicite. Une nouvelle correction payante exige un devis et un accord distincts.

Ce lot ne modifie ni thème ni composition, ne publie rien et n’installe aucun CMS. Le téléchargement Markdown est vérifié ; pas de nouvelle recette CMS ou qualité créative réelle. Mode sans thème de départ, autres raccordements D12/E/F/vidéo et intégration métier future Claude #245/#247/#248 restent ouverts. Le Studio client/main n’est pas mis à jour par la branche. Ne marquer la PR prête qu’après sa CI complète sur la tête distante exacte ; aucune fusion présumée.
