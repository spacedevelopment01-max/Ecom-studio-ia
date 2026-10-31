# #211 — E1 : plan sûr et assemblage natif de pages

Code publié et build propre effectivement servi **`54daf754e313f4335a3b2fdc8df4d1a2ec1051b8`**, PR **#217**, base D2 #216 `efbf7cbfe4db9c3af5fffac35a316151e0a679dd`. Rapport/preuves ajoutés ensuite, sans changement applicatif. Aucune fusion ni activation.

E1 assemble réellement des pages dans `ThemeSpec`, les rend avec `renderPage` et exerce l’export natif en tests. Cet incrément est le noyau sûr ; **le parcours de composition dans SYNA, le contrôle visuel et les interactions complètes appartiennent à E2**, développé séparément. Aucune qualité professionnelle ou intelligence réelle déduite de ces tests déterministes.

[Preuves et commandes](preuves-211-E1/verifications.json) · [version compilée effectivement interrogée](preuves-211-E1/compiled-smoke.json) · [empreintes des sources gelées](preuves-211-E1/sources-testes.json) · [20 tests ciblés](preuves-211-E1/tests-cibles.log).

## Ce qui est implémenté

- `src/lib/theme/composition/contract.ts` : plan déclaratif strict/versionné, pages, sections, ordre, blocs, liaisons aux textes/médias/liens et réglages de disposition. Les champs, cibles ou blocs en double et les clés de prototype sont refusés. Jusqu’à 8 pages et 25 sections par page ; aucune chaîne de code, CSS/JavaScript/Liquid proposée par le modèle.
- `assemble.ts` : assemblage sur une copie par `applyOps`, schémas et compatibilités natifs, sans moteur parallèle. Ajouts de composants fiables du catalogue, réordonnancement et réutilisation des sections ; le mode adaptation conserve toutes les sections. Le mode hybride peut remplacer des sections éditoriales non verrouillées, sous droits natifs. Groupes d’en-tête/pied et fonctions métier ne sont pas recomposés par ce noyau. Les sections fonctionnelles, leur ordre relatif et les positions verrouillées sont conservés ; aucun override.
- Les textes entiers viennent de références de source, jamais de mots inventés par l’assembleur. Le scope doit correspondre à la page. Les champs longs sont signalés comme références non lues dans le contexte : aucun extrait présenté comme texte complet. La valeur entière est appliquée ; le schéma natif peut l’entourer de paragraphes HTML. Des textes, images ou produits d’exemple des nouveaux composants ne sont pas emportés silencieusement : les champs de contenu sont vidés puis explicitement reliés aux acquis. Les réglages de disposition restent ceux autorisés par les schémas.
- Les images sont résolues une nouvelle fois depuis la bibliothèque du propriétaire. Une image Shopify prioritaire n’est pas remplacée en silence par un asset. Liens actifs, externes, sans protocole ou avec antislash refusés dans ce premier périmètre.
- `server.ts` : propriétaire/forfait natifs, version courante, sources de la seule version du projet et médias vivants. Bibliothèque exposée limitée explicitement aux 40 images sélectionnées, sans suppression. Les modèles partagés par plusieurs produits ne servent pas à plaquer une rédaction propre à l’un sur les autres. Les démonstrations marquées comme telles sont protégées. La prévisualisation n’enregistre pas de version, ne lance pas de job et ne dépense rien.
- `spec.ts` : référence typée au plan/source/parent dans les métadonnées de la future version. Qualité `not_measured`, installation `not_tested` ; pas de « site terminé » sur un assemblage ou un ZIP.

Les modes sur-mesure sans thème et composition de thème importé sont **explicitement non raccordés dans E1**. Aucun repli silencieux vers un thème plus simple. E1 ne génère pas de nouvelle rédaction : elle doit être acquise avant cette application ; son raccordement IA/qualification reste à réaliser.

## Vérifications exécutées

Depuis `/workspace/reviews/ecom-211-lot-e1-composition`, données temporaires uniquement :

```bash
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs XDG_CACHE_HOME=/tmp/ecom209-font-cache npx vitest run
npx vitest run tests/composition211-plan.test.ts tests/composition211-server.test.ts
npx tsc --noEmit
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs XDG_CACHE_HOME=/tmp/ecom209-font-cache bash scripts/verify-theme.sh --rapide
NEXT_TELEMETRY_DISABLED=1 XDG_CACHE_HOME=/tmp/ecom209-font-cache npm run build
node /tmp/ecom211-E1-smoke.mjs
```

**3 648 réussis / 45 ignorés**, 422 fichiers réussis / 1 ignoré, 810,25 s ; les six sources applicatives/tests ont les mêmes empreintes avant et après cette suite. **20 nouveaux tests ciblés** passent. Types, build propre et 24 cas Theme Check + ZIP réussis, zéro erreur et 35 avertissements par cas conservés. Le smoke démarre seulement le serveur compilé isolé, contrôle `/api/version` et `/connexion`, sans worker ni génération : version exacte `54daf754`, arbre clean.

Trois fixtures mono-produit, catalogue et service passent réellement par les fonctions de rendu et d’export. Les assertions conservent les fiches produit, le catalogue/stock/variantes, les groupes, le panier et les textes complets. Propriétaire étranger, révocation de forfait, source d’une autre page, clés forgées, code actif, lien malveillant, média absent, disposition invalide, verrou et version périmée sont refusés. Ces tests n’affirment pas qu’un panier ou un formulaire a été cliqué : cette recette navigateur est distincte, dans E2.

Les premiers échecs ont corrigé la fixture : `hero-split` n’appartient pas à la bibliothèque proposable, remplacé par le composant réellement disponible `image-with-text` ; un test de mauvais réglage doublait sa cible et déclenchait le refus structurel avant le refus de type ; un texte brut vers un champ riche est normalement enveloppé de paragraphes par le moteur. Les assertions vérifient le texte complet formaté, sans autoriser une troncature. Les références d’en-tête/pied du test ont aussi été corrigées pour comparer les vrais `groups`, et non deux propriétés absentes.

## Limites et suite indispensable

Aucun appel fournisseur réel, coût réel 0 €. Pas d’évaluation d’interprétation, de copywriting ou de création IA réelle ; pas de site professionnel validé. Les ZIP unitaires de ce noyau utilisent un loader nul : leur structure et leurs textes sont contrôlés, **leurs octets d’image ne sont pas qualifiés par ces tests**. E2 vérifie séparément les vrais médias et l’export servi par le Studio compilé.

Shopify : un ZIP contrôlé n’est pas une installation ni une affectation de modèles vérifiée. WooCommerce/PrestaShop : compatibilité et gabarit produit partagé à tester séparément. Wix/Squarespace : kits de reprise, jamais annoncés comme thèmes installés. Aucun CMS distant connecté/testé.

E2/F2 : proposition dans le même SYNA → plan lisible → accord → vrai job/version → aperçu/annulation ; captures de page entière, critiques/corrections/recaptures et parcours fonctionnels. Les autres domaines D, la nouvelle rédaction qualifiée et les modes encore absents restent à compléter. **#211 reste ouverte**. VANS, Contretemps, médias, forfaits, budgets, analyses acquises et compositions validées inchangés ; aucun merge, déploiement ou redémarrage réel.
