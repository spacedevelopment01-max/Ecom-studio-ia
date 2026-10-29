# D9c — Contre-recette de la retouche photo héritée

29 octobre 2026. PR #233, toujours sans fusion ni activation.

Le correctif du harnais est publié à **`f163b7690068398d6e95ebcbab1089c7f9ef0df8`**. Un seul fichier de code change : `scripts/verify-agent211-retouch-ui.ts`. **Aucun code applicatif ne change depuis `378ac552c43b7602b4afe816aa2e31fd77ff026e`** : c'est ce build propre qui a réellement servi les deux contre-recettes locales. Le nouveau SHA du harnais ne doit pas être présenté comme un nouveau build applicatif local.

[Preuves et liens directs](preuves-211-D9c-regression/README.md) · [Vérifications](preuves-211-D9c-regression/verifications.json) · [Échec reproduit](preuves-211-D9c-regression/traces/avant-correction.json).

## Cause et correction

La [CI du commit documentaire a74b9375](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40934284485) a échoué dans la recette D9b héritée. Le contrôle attendait encore le littéral SDK « parse structured output ». Le correctif D9c du client SDK reçoit désormais le texte et l'usage avant le rejet strict du schéma : ici deux indicateurs obligatoires de relecture manquent. L'image reste correctement refusée ; ce n'est ni un dépassement budgétaire ni une réponse à coût inconnu.

Le harnais conserve tous les contrôles précédents : tâche échouée avant 100 %, aucune sortie livrable, un essai non réutilisable, état `review_incomplete`, aperçu/téléchargement de l'essai, compte étranger refusé, confirmation répétée sans nouvel appel, anciens acquis conservés. Il vérifie maintenant les deux champs manquants et leur type obligatoire, **deux appels avec usages connus, deux réservations réglées et deux événements de coût identiques**, puis leur stabilité à la reprise. Un seul appel de relecture est enregistré. Aucun contrôle qualité n'est assoupli, aucune erreur n'est convertie en succès.

## Vérifications réellement exécutées

- `npx tsc --noEmit` : réussi.
- `npx vitest run` : **3 926 réussis, 45 ignorés**, 451 fichiers réussis et un ignoré. Sources inchangées pendant l'exécution.
- `npx tsx scripts/verify-agent211-build.ts … --retouches-ui` : d'abord échec reproduit sur le même build, puis **cinq parcours réussis** avec le harnais corrigé : mono-produit, multiproduits, activité inédite et deux services. Studio compilé, SDK, worker, bibliothèque, versions et exports natifs ; seul le fournisseur HTTP est simulé.
- 127 captures locales et cinq films enregistrés. Le complément publié sélectionne **six PNG et le film complet du cas de relecture refusée**, avec WebM original et MP4 sans coupe ni accélération ; le reste demeure dans la copie de recette. Les captures de refus ordinateur/mobile ont été réellement ouvertes.
- Cinq insertions de l'acquis dans le Site, aperçu contenant ses octets, ZIP Shopify contenant ces mêmes octets, puis annulation exacte sans nouvel appel. Les **cinq ZIP publiés** portent chacun **0 erreur / 35 avertissements Theme Check** dans leurs résultats natifs. Versions et autres contenus conservés.

Le téléchargement du fichier de code publié a été refait et son SHA comparé. Les preuves documentaires font l'objet de leur propre commit et vérification de téléchargement.

## Coûts et limites

**59 appels HTTP fictifs** : 39 texte et 20 image. **58 usages connus**, total **4 420 121 micro-euros fictifs**. La réponse complète mais invalide de relecture compte pour un usage connu de 7 912 micro-euros fictifs, pas pour une nouvelle tentative ou une économie démontrée. La panne 503 indépendante conserve **une réservation incertaine de 306 981 micro-euros**, séparée de ce total ; elle n'est ni libérée ni relancée.

**Aucun appel fournisseur réel, aucune dépense réelle, aucun nouveau compte ou fournisseur, aucune donnée client, aucun thème Claude modifié.** Motifs et contrôles visuels fictifs : aucune compréhension ou qualité photographique réelle qualifiée. ZIP et Theme Check ne prouvent pas une installation, une édition dans Shopify ou un rendu dans un CMS réel. Les exports restent provisoires selon leur garde natif.

La CI précédente reste rouge dans l'historique. La nouvelle CI doit terminer sur le nouveau SHA distant avant tout avis global favorable ; elle n'est pas déclarée verte par ce rapport. #233 reste en brouillon pendant cette vérification. D10a reprend explicitement le même correctif de harnais dans #238, sans remplacer son moteur ni les preuves antérieures.
