# #211 — E7 : rédiger pour la bonne fiche et la bonne variante du Catalogue

**Fait et vérifié localement, à relire sur branche isolée.** Aucun fournisseur réel, coût réel 0 €, aucun merge, déploiement, activation ou client modifié. La qualité créative réelle n’est pas qualifiée. Les compositions et branches Claude sont intactes. #211 reste partielle.

Branche `codex/211-lot-e7-cibles-catalogue`, parent #263 `4807c5acf8acecf5769d802bb5cb1d13a06fee98`. Code final compilé et parcouru : **`1b5161fb3178063f866cc915377dac277ee466f6`**, arbre propre ; premier incrément `2229b66b07bb3a4056d39fb915ed62e91e86ce81`. Les fichiers de preuve sont ajoutés ensuite, sans changement applicatif. Une CI complète finale sera déclenchée à la création de la PR ; son statut réel figure dans cette PR, sans vert présumé.

## Corrections et preuves

| Constat | Correction | Preuve |
|---|---|---|
| Le sélecteur E6 ignore le nouveau Catalogue et ses variantes. | Cibles choisies par identifiants natifs, versions et SKU/finition ; produits homonymes distincts, archives exclues, aucune URL publiée inventée. | **REPRODUIT** : cinq tests rouges liés aux cibles ; mêmes cas verts ensuite. |
| Une rédaction ne doit pas emprunter les faits/prix du produit principal. | Réemploi de `resolveContentSubjectBinding`, avant Brain, brief, rédaction et contrôles natifs. Métadonnée `nativeBinding` conservée jusqu’au document et à l’éditeur. | **REPRODUIT** par tests injectés puis **SDK/HTTP local + worker + Chromium** : variante Brunie, prix 32,50 €, autre fiche homonyme exclue ; consigne entière 852 caractères en rédaction et relecture. |
| Un changement de fiche peut périmer un devis ou masquer un ancien acquis. | Versions revérifiées avant les appels et la finalisation ; tentative intermédiaire conservée, pas de faux succès. L’historique reste lisible/téléchargeable et modifiable manuellement. | **REPRODUIT** : modification avant dispatch refusée sans job ; modification pendant rédaction conserve RETRY ; après archivage GET/PUT/téléchargement 200 dans le Studio compilé. |
| Le stock seul ne justifie pas un rachat de texte inchangé. | Recherche de l’acquis par contenu sémantique inchangé avant disponibilité/budget ; reçu historique explicitement non actuel. Mémo natif capable de réactualiser le pin gratuitement, sans changer le corps. | **REPRODUIT, moteur injecté** : un seul rédacteur appelé, aucun job supplémentaire, même budget épuisé. Le texte humain et les versions précédentes restent conservés. |
| Une catégorie de repli peut apparaître parmi les faits confirmés. | Pour une fiche native liée, seule sa catégorie renseignée est un fait ; sinon catégorie vide et inconnue signalée. Hypothèses de mots-clés séparées. | **OBSERVÉ DANS L’APERÇU LOCAL**, puis **REPRODUIT** par test rouge et corrigé : pas de catégorie de repli dans les faits. Nouveau build et nouvelle recette passés ; capture finale avec catégorie client Outillage. |
| Fiche historique périmée : les vérifications factuelles ne doivent pas utiliser l’offre principale. | Avertissement explicite ; contrôles factuels non effectués, mais structure, métadonnées, liens et autres contrôles locaux conservés. Lecture et édition gratuite autorisées ; nouvelle retouche IA sur pin périmé refusée. | **REPRODUIT** : `CONTENT_SUBJECT_CHANGED` coexiste avec `bad_structure`, `missing_meta`, `invented_link`. Une métadonnée forgée en édition ne change pas l’offre propriétaire du document. |

Fichiers : `seo-v2/subject.ts` (résolution native), `subject-contract.ts` (schéma pur sans cycle), `engine.ts`, `facts.ts`, `quality.ts`, `doc.ts`, `types.ts` ; `orchestrator/conversation/content-tool-execution.ts` ; route native `content/v2/[docKey]` et carte `conversation-content-tools.tsx` ; tests et recette compilée existante étendue. Aucun second moteur rédactionnel ni nouveau fournisseur. Le drapeau rédaction E6 reste fermé par défaut. Les commandes publiques strictes n’acceptent ni binding choisi par le client ni plafond forgé.

## Vérifications réellement exécutées

```bash
npx vitest run tests/conversation211-content.test.ts tests/content211-required-ai.test.ts tests/content211-wire.test.ts tests/seo-v2-engine.test.ts tests/seo-v2.test.ts
npm run typecheck
npm run build
node --import tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/E7-catalogue-final-proof --catalogue-copy-ui
```

**67 tests distincts / 5 fichiers**, types, build final propre et Chromium réussis. Réseau fournisseur interdit par `NODE_OPTIONS=--import=./scripts/lot9/network-guard.mjs` ; caches/configuration, base et médias temporaires isolés. Le harnais refuse les sélecteurs de stockage existants. L’option locale cible seulement le nouveau parcours Catalogue ; la recette CI existante `--content-ui` couvre maintenant cette variante et conserve le scénario service E6, sans étape redondante.

Après le texte acquis : seconde demande → 503 simulée, **un essai**, tâche failed à 20 %, aucun remplacement local ni relance ; version précédente intacte. Rechargement sans appel ; éditeur natif et saisie non enregistrée conservés. Authentification 401, autre compte 404, CSRF 403, plafond forgé 400. Aucune version de thème créée. Stock seul, archives et produits homonymes : tests séparés, dont une fiche de pince de précision différente du cas navigateur réservé emporte-pièce de maroquinerie. Aucune condition applicative ne dépend de ces noms.

Échecs intermédiaires conservés dans `preuves-211-E7/checks.json` : premier import circulaire du schéma corrigé par contrat pur ; assertion de test visant un champ `brief.facts` inexistant corrigée pour examiner le vrai prompt ; typage de la cible explicité. Premier navigateur réussi, mais découverte de la catégorie de repli : test minimal rouge, correction, second build et navigateur réussis. Les passages recouvrants ne sont pas additionnés. Pas de nouvelle suite complète locale ; une CI finale sur le candidat stable.

## Consulter le résultat

- [Devis de la variante sur mobile](preuves-211-E7/01-devis-variante-mobile.png)
- [Document natif sur ordinateur](preuves-211-E7/02-document-natif-ordinateur.png)
- [Film du vrai parcours navigateur — 7,4 s](preuves-211-E7/catalogue-redaction.mp4)
- [Assertions du parcours](preuves-211-E7/browser-proof.json), [commandes/états et empreintes des vérifications](preuves-211-E7/checks.json), [inventaire](211_E7_PREUVES.json)

Deux captures finales réellement ouvertes et inspectées. L’instruction répétitive sert à vérifier sa conservation ; rédaction, jugement FINAL et coûts du transport sont **synthétiques**. Ces images ne démontrent pas la qualité d’un copywriter réel. Les 6 appels HTTP du total comprennent 3 appels génériques préalables du harnais, puis rédaction/relecture et échec ; aucun ne sort vers un fournisseur.

## Reste à faire / limites

Ce lot raccorde la rédaction aux fiches/variantes et aux documents natifs, **pas leur application automatique au Site ni une publication par variante**. Les cibles restent prévues avec URL nulle ; aucun modèle de thème partagé n’est réaffecté. Les exports Markdown/HTML/JSON de contenu sont disponibles ; cette recette vérifie les octets Markdown, pas l’installation dans un CMS. L’intégration métier de Claude #245 et le futur travail #247/#248 restent distincts et non fusionnés.

Retouches précises depuis SYNA des textes existants, mode sans thème initial, autres raccordements D12/E/F et limites vidéo restent ouverts selon #211. Mémoire consultée : 100 devis récents, 10 reçus affichés ; pas de récupération supposée d’un historique absent. Un autre changement de contexte peut nécessiter une nouvelle sélection/validation ; aucun rachat automatique. Aucune vérification de fournisseur réel, de compréhension réelle, de facture fournisseur, de qualité créative ou de CMS installé. Le Studio client/main n’est pas mis à jour par cette livraison.
