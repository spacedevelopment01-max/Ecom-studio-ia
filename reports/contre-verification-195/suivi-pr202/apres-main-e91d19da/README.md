# Après #202 — main intermédiaire e91d19da

**Source exacte : `e91d19da4323c1f049191161e8f2a0a73b41c4b0`.** Nouvelle copie isolée, nouveau build ; arbre `6595cd464bb129dc28df11195d1c1e68c6fd9569`, identique au candidat approuvé 51275. [Identité et préservation](identite.json).

**Publication intermédiaire** : Claude prépare ensuite #203, documentation centrale uniquement. Le présent dossier ne sera pas renommé ni présenté comme une exécution du futur SHA final. **Tous les contrôles locaux sont terminés et réussis** ; la CI push est encore en cours à cette publication. Aucun verdict final global n'est annoncé. [Résultats locaux structurés](verdict-local.json).

## Vérifié sur le nouveau build e91

- `npm run typecheck` puis `npm run build`, garde réseau active et secret fictif : **sorties 0**, 58 pages. [Types](types.log), [build](build.log). Fichiers applicatifs suivis intacts ; instructions identiques à celles intégralement lues sur le candidat.
- Nouveau test officiel `scripts/export-shopify-build-check.ts` : **réussi**, `/api/version` = e91/compiled-build, export HTTP 200, **Theme Check réellement mesuré : 0 erreur / 35 avertissements**, aucune indisponibilité. [Résultat](smoke-officiel/resultat.json), [journal](smoke-officiel.log).
- Harnais indépendant, compte **client** et abonnement fictifs, **produit `products` et service Rive `services`** : Studio ouvert par les gestes normaux à 1440/390, quatre captures réellement inspectées ; aucun JavaScriptError. Vraie route locale d'export Shopify, sauvegarde et téléchargement identique du ZIP, ThemeSpec et versions inchangés. **0 appel IA enregistré**. [Résultat](production/parcours-production.json), [version servie](production/version-compilee.json), [captures](production).
- CLI native sur e91 : sortie 0, **les 35 lignes d'avertissement sont strictement identiques** à 51275, y compris fichiers/lignes/messages. [Comparaison](avertissements-identiques.json), [journal natif](theme-check.log). [Analyse détaillée déjà publiée](../51275d06/AVERTISSEMENTS.md).

Les données sont fictives, bases/médias temporaires isolés. Les captures montrent l'éditeur technique, pas une validation créative. Export **PROVISIONAL/static**, pas une installation réelle Shopify. Aucune API fournisseur réelle, aucun déploiement, aucune fusion Codex. Le cache Webpack de cette seule copie a été libéré après les contrôles ; le serveur compilé est conservé, aucune source ni donnée touchée.

## Témoin négatif sur le même build compilé

Une copie privée des documents du SDK est créée ; seul son `preset.json` est remplacé par du texte illisible simulé. Le SDK partagé reste intact (JSON et empreinte contrôlés). Le script officiel est relancé avec `ES_SHOPIFY_DOCS_DIR` pointant vers cette copie et la garde réseau native, sans double de transport.

**Sortie 1 attendue** : version réellement servie e91/compiled-build, HTTP 200 avec export provisoire, compteur d'erreurs non mesuré et message **« Theme Check arrêté : Document Shopify de Theme Check illisible (preset.json)… »**. Jamais un faux 0 ni « outil indisponible ». Le test de build refuse donc aussi une défaillance documentaire, pas seulement le défaut de résolution antérieur. [Synthèse](smoke-doc-illisible-synthese.json), [résultat](smoke-doc-illisible/resultat.json), [journal](smoke-doc-illisible.log).

Le texte simulé contient « 429 », mais aucune réponse HTTP 429 réelle n'est observée par cet essai. Cette sortie 1 est un contrôle négatif réussi, pas un échec de la suite native en cours.

## En cours

**Suite native complète sur e91 terminée : 3 409 réussis, 0 échec, 31 ignorés, sortie 0**, 400 fichiers réussis / 1 ignoré. [JSON brut](suite-complete.json), [journal](suite-complete.log), [code de sortie](suite-complete.exit). Garde réseau native, 2 workers, aucune double de transport. L'exécution a continué pendant la reconnexion de l'environnement et son shell a bien enregistré la sortie ; aucun test n'a été relancé. Les 31 ignorés correspondent exactement au candidat : [liste et raisons](tests-ignores.json).

CI push propre à ce main : [40370220372](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40370220372), encore en cours. Aucun vert CI n'est anticipé. Le futur main après #203 aura sa propre CI.

Après fusion par Claude de #203, relever le nouveau SHA final et le contrôler séparément, avec sa propre CI push et un build affichant ce SHA. Le studio utilisateur et son commit effectivement servi ne sont pas modifiés ni validés ici.
