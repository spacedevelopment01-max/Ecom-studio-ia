# #211 — D10c1 : retrouver les vidéos déjà acquises

Code testé : `c6ad7f81018f7e76763f2a4dc12a7a555e6b53ed`, parent #246 `a9fbc2119540e4cea23dae761b0c4797035c70cb`. Branche `codex/211-lot-d10c-reprises-video`. **Revue technique en attente de la CI finale ; aucun merge ni activation.**

## Fait

Après100autres reçus, une vidéo acquise pouvait disparaître de la recherche et conduire à un nouveau devis payant, ou à un refus « budget/fournisseur » malgré son existence. Le registre d’affichage était utilisé pour chercher les acquis.

La recherche exacte par conversation/proposition/identité porte maintenant sur les artefacts persistés pertinents ; la limite d’affichage reste distincte. Contrôles de propriétaire, fichier, empreinte et version conservés. Aucun crédit ou plafond modifié. Un ancien fichier manquant bloque toujours son rachat implicite.

Fichiers : `src/lib/orchestrator/conversation/video-generation-execution.ts` et `tests/conversation211-video-generation.test.ts`. Pas de migration ni d’interface nouvelle.

## Vérifié

- **44tests ciblés /5fichiers et types réussis.** Quatre nouvelles régressions :105devis intermédiaires, ancien acquis malgré budget épuisé/fournisseurs fermés, version manuelle conservée, idempotence d’une proposition confirmée, refus si fichier absent, artefacts invalides/conversation étrangère. Le test utilise SQLite/stockage/FFmpeg natifs avec médias/injections fictifs, aucun HTTP fournisseur.
- **Une seule suite complète locale exécutée :4 001réussis/45ignorés, un fichier non chargé car sa fixture historique était absente du checkout allégé.** La fixture est restaurée depuis le commit existant ; les14tests concernés passent ensuite sur les mêmes sources. La commande complète locale garde son code1 : elle n’est pas annoncée verte. Aucun test supprimé ni échec masqué. Des avertissements Fontconfig non bloquants restent dans le journal.
- Les SHA des deux sources testées correspondent au commit applicatif ci-dessus. [Commandes, dates, empreintes et résultats](211_D10C1_PREUVES.json). La CI complète doit encore confirmer le SHA documentaire final ; son lien/résultat est publié dans la PR.

## Limites et suite

Aucune nouvelle capture : la modification est une recherche SQL interne, les preuves UI de #246 sont réutilisées. Aucun fournisseur réel, facture, voix naturelle ou qualité créative qualifiés. Recherche exacte dans la conversation propriétaire, pas une nouvelle recherche inter-comptes. Pas de performance sur un historique de millions d’entrées revendiquée.

D10c continue avec reprise d’encodage, voix et clips ciblés, staged et reçus interrompus ; puisD11/D12/E/F. La PR sœur de reprise d’encodage part du même #246 et modifie des fonctions distinctes ; une recette commune sera nécessaire après intégration autorisée. Claude#239/#245, thèmes et données clients préservés. **0appel fournisseur IA réel,0coût IA réel ; aucun merge,main,déploiement,activation ou publication extérieure.**
