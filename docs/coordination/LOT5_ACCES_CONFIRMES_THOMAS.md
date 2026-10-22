# Lot 5 — accès confirmés par Thomas, complément du 22 octobre 2026

Ce document remplace l'attente de retour indiquée dans le rapport antérieur de la PR #165. Source : [consigne consolidée, commentaire 6343674056](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/165#issuecomment-6343674056). Il rapporte les observations transmises par la coordination après exécution par **Thomas**, pas une exécution par Codex. Aucun diagnostic d'authentification supplémentaire n'a été lancé.

## Version et portée de la preuve

- Script exécuté : `47bae5e7a1ce43605f4e88625bf236e1b8561615`.
- Code et configuration du Codespace : `d97e0b9577128eeb39b403dae281da6bd835fc65`, mode développement.
- Chargeurs Next et worker inspectés séparément. Six secrets chiffrés lisibles dans `settings`, authentifiés avec le secret maître courant par les deux chargeurs : Anthropic, OpenAI, Google, fal, Alibaba, Pixabay. Pexels absent.
- Cinq requêtes réelles de métadonnées authentifiées **par le worker**, aucune génération, aucune configuration changée. Ce résultat ne certifie pas l'authentification HTTP du processus Next en cours.
- `servedVersion: not_probed` : le SHA du checkout ne prouve pas la version réellement servie. La tête d'intégration Claude reste une autre version.

| Fournisseur | Observation transmise par Thomas | Modèles et limites |
| --- | --- | --- |
| Anthropic | HTTP 200, `accepted_metadata_endpoint` | Opus 5.5 et Sonnet 5.5 actifs ; Haiku 4.5 absent de la réponse complète |
| OpenAI | HTTP 200, `accepted_metadata_endpoint` | Deux modèles images configurés listés ; aucun droit TTS vérifié |
| Google | HTTP 200, `accepted_metadata_endpoint` | Modèle image Flash listé ; Veo 3.1 Preview listé à cet instant ; Veo 3.0 absent de la réponse complète |
| Alibaba | HTTP 200, `accepted_metadata_endpoint` | Catalogue **partiel** ; Qwen 3.0 Pro listé ; principal masqué des quatre usages non retrouvé, ce qui ne réfute pas son existence |
| fal | HTTP 200, `accepted_personalized_metadata` | Deux routes Kling v3 configurées listées actives ; authentification fondée sur métadonnée personnalisée, pas seulement catalogue public |
| Pixabay | Clé lisible localement | Aucun nouvel appel authentifié de cette phase |

**Aucun droit de génération et aucune qualité créative certifiés.** Une liste de modèles et HTTP 200 ne prouvent pas qu'une création sera acceptée, fidèle ou satisfaisante. Les prix n'ont pas été revalidés par ce diagnostic. Kokoro absent n'est plus un préalable du parcours cible, sur décision explicite de Thomas.

Le modèle Alibaba masqué n'appartient ni au catalogue source historique ni au catalogue d'intégration ; ces catalogues étaient identiques. Les comparaisons de trim/préfixe du diagnostic ne suffisent pas à expliquer l'écart. Ne pas remplacer cette incertitude par une conclusion d'invalidité ou révéler la valeur.

## État de Codex et de l'intégration

Codex n'a pas les clés du Codespace et ne dispose pas de terminal distant autorisé ; son environnement réseau courant ne donne pas accès aux API IA. Aucun transfert ni nouvelle clé demandé. Les tests de cette livraison restent isolés et simulés côté fournisseur.

PR Claude #162 : tête vérifiée `8266c171027762acbbf0cf03daefff4c6035fb32`, ouverte à la reprise, puis **fusionnée le 22 octobre à 15 h 31 UTC** en `0a6aa1dd6dfa5932a5e42e027cef2a3335e74679`. Le contenu de main à ce commit est identique à cette tête (diff vide vérifié). Branche applicative Codex distincte : `codex/lot5-raccord-voix-routage`, fondée sur 8266c171, proposée vers main après cette fusion. Codex ne fusionne rien. PR #165 conserve les scripts de diagnostic antérieurs séparément. Cette fusion n’atteste toujours pas la version servie.

La CI #165 `39793301196` a finalement échoué au **Theme Check** : le journal cite l'impossibilité de parser le schéma externe Shopify `targetted_block_entry.json`. Types, tests et job Docker y sont réussis ; build de production sauté après cet échec. Ce résultat n'est ni une CI entièrement verte, ni la preuve d'un défaut de composition. Aucun thème n'est modifié pour masquer ce problème ; Claude doit contrôler la disponibilité du schéma et relancer la vérification sans désactiver le contrôle.

Suite : [raccord voix, matrice et limites](LOT5_RACCORD_VOIX_ROUTAGE.md), [recette à valider avant l'étape 1](LOT5_RECETTE_UNIQUE_A_VALIDER.md).
