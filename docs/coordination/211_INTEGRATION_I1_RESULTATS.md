# #211 — Recette intégrée D7 / E4 / F2

**Livraison pour revue dans #228, sans fusion ni activation.** Branche `codex/211-integration-d7-e4-f2`, code testé et build propre réellement servi **`412f60dd5d3ed079ac46bae61e4b65055f97879e`**. Recettes isolées du 28–29 octobre 2026 UTC. Le complément SYNA [6476774872](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/211#issuecomment-6476774872) reste la consigne appliquée. **#211 n’est pas terminé.**

## Ce qui est regroupé et conservé

Cette branche vérifie la coexistence de corrections déjà livrées séparément ; elle ne crée pas un second moteur. Les neuf fichiers repris sont identiques octet par octet à leurs branches sources.

| Dépendance | Référence exacte | Effet vérifié |
| --- | --- | --- |
| D7 #225, parent direct | `cc2c3144e2e771f8d8ddbb9167ccc3a5dce90e7a` | Comparaisons d’angles acquis, choix/rejets/raisons/annulation et historique |
| E4 #222 | `dd5dea5f2bcddefb01c32f3a46c4335e94188313` | Textes complets dans les reprises et relectures, gardes natifs inchangés |
| Images #226 | Application `35c2688fa0d5f15db18bbd8a772476c719051c1c`, harnais `510e54ad6c6020e1011167e47e6847decf8b92b1` | En-tête selon la largeur du conteneur, actions accessibles aux quatre largeurs |
| Aperçu Site #227 | `e4f3f3b9d7c7c25c72373a4f2845f8348e185c49` | Espaces mobiles réduits, aperçu au-dessus du milieu, tous les outils conservés |

Fichiers applicatifs : [tasks.ts](../../src/lib/ai/tasks.ts), [tab-images.tsx](../../src/components/studio/tab-images.tsx), [tab-boutique.tsx](../../src/components/studio/tab-boutique.tsx). Tests/reproducteurs : `conversation211-copy-input.test.ts`, `conversation211-copy-sdk.test.ts`, `copy211-fixtures.ts`, `image-bank-header-browser.ts`, `verify-image-bank-header.ts`, `verify-agent211-ui.ts`. Aucun changement de `theme-base/`, `src/lib/theme/`, forfait, budget ou configuration client. Les compositions de Claude restent intactes.

#208 et #210 ont été revérifiées ouvertes/non fusionnées, aux SHA `a0246c7753bca30e365d57b4cd8202ce95c3f812` et `2a5e96718a8836d288673f520ef10e89c5a55379`. `main` observé : `70204a7ff83eb2382835a27a37a8465c0851a70a`. La chaîne de dépendances antérieure reste nécessaire ; aucune PR n’est fusionnée pour débloquer cette recette. Les PR sources conservent leurs preuves et leur revue ; cette intégration technique ne constitue pas leur approbation.

## Vérifications réellement exécutées

**3 751 tests réussis /45 ignorés**,433 fichiers réussis/un ignoré,704,40s ; neuf fichiers intégrés gelés pendant la suite, empreintes comparées au commit de code. `npx tsc --noEmit` et `NEXT_TELEMETRY_DISABLED=1 npm run build` réussis. Exécution locale Node24.19 ; la CI utilise sa version/configuration propre et reste distincte. Seuls les retours chariot et espaces de fin du journal de build sont normalisés pour sa publication ; son empreinte originale est conservée. Tous les messages restent présents. Les journaux complets conservent les avertissements non fatals de cache Fontconfig des tests ; la recette navigateur utilise un cache local accessible.

Les commandes exactes, dates, sorties, sources et empreintes sont dans [verifications.json](preuves-211-I1/verifications.json). Les recettes démarrent le vrai Next compilé et le worker natif sur des bases/comptes fictifs, avec réseau fournisseur interdit et faux serveur SDK exclusivement loopback.

| Reproducteur exécuté sur le même build propre | Résultat et portée |
| --- | --- |
| `verify-agent211-build.ts --ui --context-ui --choices-ui --knowledge-ui` | Réussi : dialogue, correction/mémoire/reprise réseau, sélection exacte → proposition → accord distinct → retouche native → restauration, référence média/version/historique, comparaison 2–5 et préférence sans activation ; état/forfait/budget/tâches et outil absent honnêtes |
| `verify-image-bank-header.ts … 412f60dd5d3ed079ac46bae61e4b65055f97879e` | Réussi :1440/1024/390/360, SYNA ouvert/fermé, vraie accessibilité des trois actions en mode manuel, sans débordement ni erreur JS ; dialogues ouverts/fermés, aucun envoi |
| `verify-agent211-build.ts --specialists --tools --tools-ui --theme-ui --composition-ui` | Réussi jusqu’aux contrôles finaux : rôle borné, analyse acquise/réutilisée, échec sans perte, texte/image exacts, annulation/reprise, composition mono/multi/service et cas inconnu, variantes/panier techniques, pages/formulaires de démonstration |
| `verify-agent211-build.ts --render-ui --research-ui` | Réussi : captures natives, correction puis recapture/version, résultat acquis retrouvé, capture manquante annoncée ; recherche avec sources fictives préacquises, hypothèses conservées, reprise bornée après échec et refus d’une tentative sans accord |
| `verify-agent211-build.ts --exports-ui` | Réussi : cinq plateformes, téléchargement et empreinte du ZIP, réutilisation/reprise ; fichier manquant explicitement non livré sans remplacement automatique |
| `export-shopify-build-check.ts` | Réussi par la vraie route du Studio compilé : HTTP200, ZIP8 498 068 octets, Theme Check réellement mesuré,0 erreur/35 avertissements |
| Inspection en lecture seule du ZIP exact produit par le Studio | Recontrôle officiel natif : mêmes0 erreur/35 avertissements, empreinte du ZIP et correspondance au reçu vérifiées, aucun appel/tâche/usage IA |

La géométrie mobile du service390×844 est conservée : aperçu à **y409px <422px**, largeur390. Les assertions antérieures restent en place. Les drapeaux fermés et le parcours manuel sont vérifiés par les reproducteurs ; aucun drapeau n’est activé sur le vrai Studio. Les suites finales répartissent les scénarios dans des instances isolées : il ne s’agit pas d’un unique utilisateur enchaînant tous ces parcours dans une seule session.

## Échec initial expliqué, pas masqué

Une première commande regroupant tous les outils s’est arrêtée à la connexion avant le parcours de capture : **HTTP429**. Le code de `src/app/api/auth/login/route.ts` et `src/lib/rate-limit.ts` limite les connexions par IP à **30 sur10 minutes**, même avec des comptes fictifs différents. Ce n’était ni un refus budgétaire ni une erreur fournisseur. Les étapes antérieures enregistrées dans cette tentative ne sont pas comptées comme une recette globalement réussie.

Un premier redécoupage conservait encore trop de connexions : il a été **interrompu volontairement** avant un nouveau dépassement. La commande d’arrêt possédait d’abord une assertion de sélection incorrecte et n’a rien arrêté ; elle a été corrigée puis appliquée uniquement aux descendants de ce processus de test identifié. Aucun processus du vrai Studio n’est visé. Cette tentative ne compte pas comme succès non plus.

Les recettes finales ci-dessus utilisent de nouvelles bases fictives séparées et se terminent normalement. **Aucun compteur n’est effacé manuellement pour passer la recette, aucune IP forgée, aucune limite ou assertion affaiblie.** [Chronologie et journaux d’échec/interruption](preuves-211-I1/chronologie-echecs.json) conservés ; tous les contrôles de thèmes et la CI existante restent inchangés. Une suite fictive surchargée ne justifie pas de relever une protection en production.

## Les 35 avertissements Shopify

La vraie route compilée enregistre les compteurs ; l’inspection supplémentaire rouvre en lecture seule sa base fictive, vérifie l’empreinte des octets de l’archive et relance l’outil officiel natif sur ces mêmes octets. La [liste intégrale](preuves-211-I1/avertissements.json) conserve fichier, ligne, contrôle et message de chaque avertissement.

| Contrôle | Nombre | Examen et limite |
| --- | ---: | --- |
| ExcessiveSettingsCount |25| Sections à41–85 réglages : complexité de configuration à revoir ; acceptation/ergonomie dans le vrai éditeur Shopify non testées |
| UnusedAssign |6| Affectations non utilisées dans sv-steps, ph-footer et quatre sections fs-* ; dette existante, aucune suppression dans ce lot |
| RemoteAsset |1| fg-product ligne123 : image du zoom avec `src` vide initialisé ensuite ; avertissement conservé, aucun chargement externe effectué pour le vérifier ici |
| UnclosedHTMLElement |2| ap-form lignes72–73 : bascule conditionnelle entre deux colonnes dans la boucle de groupes ; ouverture/fermeture réparties entre conditions. Source examinée, ce seul examen n’est pas une qualification exhaustive du DOM/CMS |
| LiquidComplexity |1| main-product :121 pour seuil120 ; complexité à revoir, sans réécrire la composition dans cette intégration |

Ces avertissements concernent aussi des sections embarquées non affichées dans le site Rive fictif exporté. **0 erreur ne veut pas dire zéro avertissement, installation Shopify validée ou création professionnelle.** Aucun avertissement masqué ni contrôle désactivé, aucun fichier de thème modifié pour obtenir ce résultat.

## Preuves visibles et coûts

[Galerie/téléchargements](preuves-211-I1/README.md) : **31 PNG originaux sélectionnés et4 MP4 réels**, six planches. Les262 PNG produits par les recettes finales réussies sont inventoriés par empreinte ; les autres restent locaux, pas annoncés tous publiés. Les planches des117 états conversation/Images et les six planches sélectionnées ont été ouvertes, ainsi que des originaux téléphone. Les vidéos ont été examinées sur leurs images de début/milieu/fin : mêmes dimensions/nombres d’images et durée que les WebM, trois comparaisons RGB par vidéo, sans coupe, accélération ni filtre couleur. PNG de référence pour les couleurs ; les méthodes de capture ne sont pas étalonnées. Aucun message privé/client ni clé réelle.

Les quatre recettes navigateur réussies cumulent **52 appels génératifs SDK simulés,48 usages connus,379 776 micro fictifs**. Trois reçus de recherche synthétiques insérés sans invocation expliquent55 lignes `ai_calls` ; quatre appels simulés en échec n’ajoutent pas d’usage facturé. Les appels locaux de tokenisation ne sont pas inclus dans le compteur d’appels génératifs. Le détail par exécution est conservé. Ces nombres incluent les contrôles de base répétés ; ils ne mesurent aucun gain cognitif/créatif. Ils excluent la suite unitaire et les deux tentatives non terminées normalement ; leur coût fictif global n’est pas prétendu complet.

**Aucun fournisseur réel, aucun débit réel, coût réel nul pour cette mission.** L’état historique d’échec image dans D6 est inséré déjà fermé comme fixture : aucune génération image réellement testée. Les recherches et conseils marketing D7 viennent de fixtures génériques, parfois inadaptées au métier fictif : transport/persistance vérifiés, pas conseil commercial cohérent qualifié ni généralisation sémantique à l’aveugle.

## Ce qui reste partiel ou non vérifié

Les tests de devis/RDV/formulaires/paiement du site sont des interactions de démonstration ou des contrôles locaux, jamais un rendez-vous, envoi, paiement ou déploiement réel. ZIP Shopify/WooCommerce/PrestaShop et kits Wix/Squarespace téléchargés ne signifient pas CMS installé/testé. UI navigateur FR seulement. Images neutres/diagrammes et textes fictifs ne qualifient ni photographie, copywriting professionnel, identité de marque, compréhension IA réelle, vision ni qualité du site client.

Le [catalogue partiel D7](211_D7_COUVERTURE.md) reste de50 opérations explicites, **pas une couverture exhaustive des contrôles du Studio**. Comparaisons génériques logos/images/thèmes, mélange, création/édition du catalogue depuis SYNA, médias, publications/calendrier/campagnes, outils sensibles et mode sans thème restent absents ou partiels. La CI conserve ses suites antérieures ; les reproducteurs spécifiques D5/D6/D7 et Images sont ici exécutés explicitement, pas annoncés tous raccordés à la CI. CI GitHub encore en cours lors de la préparation, aucun feu vert global annoncé.

Le prochain raccordement Catalogue est étudié, **pas développé** : brouillon explicite (création native active par défaut), reprise contrôlée de l’ancien catalogue, variantes bornées, données et médias exacts, droits/versions/empreintes/idempotence et archivage réversible. Modifier des options peut retirer des combinaisons ; cela nécessite un périmètre et un accord explicites, pas une mise à jour générique silencieuse. Les prestations restent dans leurs parcours natifs.

L’instance client, VANS étape1, Contretemps, les autres données/médias/versions, `.env.local`, droits et budgets restent préservés. Aucune nouvelle clé, connexion, fusion, activation, publication ou relance du vrai Studio. Cette livraison doit être revue avant toute intégration autorisée et ne clôt pas #211.
