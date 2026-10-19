# Reprise des thèmes et exports — PR #136 en pause

Mission de pause et parcours amont : https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/136#issuecomment-6251627651 (18 octobre 2026).

La branche `codex/exports-catalogue-fiables` reste conservée, PR #136 ouverte et non fusionnée. Livraison distante : **5dedf9993ac77d5cb95dbb539215694d892c55de** ; code des ZIP réellement installés en vérification locale : **3ecdcef4e21d8f3912910a6a50c04c4cfbcde973**. Ne pas remplacer cette branche par celle du parcours amont.

Rapport de livraison archivé : [EXPORTS_CATALOGUE_RESULTATS.md](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/5dedf9993ac77d5cb95dbb539215694d892c55de/docs/coordination/EXPORTS_CATALOGUE_RESULTATS.md). Les preuves visuelles déjà remises restent dans la Page privée autorisée : https://chatgpt.com/space/page_cc9895b347d88191ae5ab6a308f047b9 . Aucun partage nouveau activé.

## Vérifications précédentes, à ne pas transformer en certification générale

- Catalogues natifs WooCommerce et PrestaShop importés/réimportés en installations locales isolées : quatre produits, sept variantes, trois axes, accents distincts, quantité et prix de panier contrôlés ; contacts de services lus en base native.
- 66 tests ciblés, types et build sur le code installé. La suite complète antérieure (2005 tests, 265 fichiers) ne portait **pas** sur le dernier code export livré : la réexécuter à la reprise, après intégration finale.
- Shopify : deux ZIP et Theme Check sans erreur ni avertissement, **aucune installation dans une vraie boutique**. Aucun paiement réel vérifié.

## Limites à reprendre explicitement

1. **Fidélité des mises en page exportées** : un import natif de catalogue ou une sauvegarde de configuration ne prouve pas que toutes les compositions, animations et comportements du studio sont reproduits dans chaque CMS. Refaire une comparaison page par page sur les créations validées par Thomas.
2. **Édition native de chaque section** : contrôler séparément contenu, ordre, médias et réglages dans l’éditeur de chaque plateforme. Le parcours complet de retouche historique n’a pas été recertifié après les derniers ajouts.
3. **Shopify réel** : installer les deux thèmes dans une boutique de développement autorisée, puis vérifier catalogue, variantes, navigation, formulaire et panier. Aucun nouvel accès ou connexion à créer sans mission correspondante.
4. **PrestaShop JavaScript** : erreur observée `productCommentMandatoryMessage is not defined` dans le module de commentaires produit. Diagnostiquer la configuration/module ; ne pas annoncer un parcours sans erreur avant correction et nouvelle inspection. H1 absent dans la page d’accueil synthétique testée.
5. **Suite complète sur le code final** : relancer tests, types et build sur un SHA figé, puis conserver la preuve de ce SHA. Distinguer les contrôles de code des installations natives réellement exécutées.
6. **Wix / Squarespace** : kits de transfert manuel ; installation automatique et parité des interactions non vérifiées. Ne pas les présenter comme des thèmes natifs entièrement installables.
7. Cadeaux, offres conditionnelles et remises serveur : adaptateurs natifs et paiement final à contrôler. Réservations externes et cartes distantes bloquées lors des vérifications locales. Modifications concurrentes côté client : pas de fusion automatique certifiée ; rollback complet non certifié.

## Coordination et point de reprise

Le parcours amont est développé séparément depuis `main` **ad41c596e859781f33874730891b4bd8b85e259e**, sans embarquer les PR #133, #134 ou #136 non fusionnées. Il n’en constitue pas une validation. Les thèmes, sections, démos et styles réservés à Claude (issue #137, FRAISE GUMMIES / ONDE AUDIO) ne sont pas modifiés.

Après validation du parcours amont, reprendre les thèmes/exports **au SHA 5dedf999…**, réconcilier volontairement les bases avec les travaux de Claude, puis examiner le contrat `project_ready_for_theme` décrit dans le rapport amont. Ne pas lancer un thème pour vérifier ce contrat : cette mission s’arrête aux données préparées. Toute reprise CMS ou génération de thème attend une instruction distincte. Aucun merge ni déploiement réalisé.
