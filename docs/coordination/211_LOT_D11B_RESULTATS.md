# #211 — D11b : brouillons de campagnes et médias acquis

**Revue seulement ; CI complète finale requise. Aucun merge ni activation.** Application compilée `06688a0a4a3beefe5ffdab371025f5b228abed11` ; tests/harnais supplémentaires `3893860d0580e11fde84052e5432371778bf59eb`. Les sources applicatives/worker/CI sont identiques entre ces deux versions. Dépend de #253, applicationdfe46ee0 ; ses correctifs de tests sont conservés par contenu.

## Fait

SYNA → offre et dernière demande exactes → proposition de plusieurs angles/textes/médias → devis local0% → confirmation → worker → **vraie campagne native draft** → édition manuelle, CSV et reprise. La route de l’éditeur et SYNA partagent `campaigns/manual.ts` et la table campaigns. Pas de nouveau moteur publicitaire. Les médias acquis restent inchangés ; pas de nouvelle image, faux rendu IA, compte connecté, budget publicitaire ou diffusion.

`campaign.draft` complète le même contrat social strict et le même drapeau fermé par défaut. Droits Dominer, quota de campagnes/annonces, cible/version/variante/prestation, auteur des fichiers, vocabulaire, faits/prix demandés et règles publicitaires sont contrôlés. Aucune troncature pour rentrer dans un quota. Une clé stable empêche le doublon ; une correction manuelle n’est jamais écrasée. Snapshot original et version native actuelle restent distincts ; une ligne ou un fichier manquant invalide la livraison complète sans recréation.

Fichiers : `campaigns/manual.ts`, route campaigns, `social-tool-{contract,validation,execution}`, contrat/contexte cognitifs et registre, carte sociale React, lien vers `CampaignsPanel` natif, harnais `verify-agent211-campaign-ui.ts` et CI. Les contrôles antérieurs restent présents.

## Preuves exécutées

- **39tests ciblés/7fichiers réussis**, types et build propre réussis. Mono/multiproduits/services ; cas nouveaux **pince de sertissage pour cuir** et **réglage de portes acoustiques**, sans règles de nom dans le code. Offre et autres fiches conservées ; droits après devis, contexte/média modifié, faux prix/promotion, propriétaire étranger, reprise et sauvegarde manuelle.
- Un prix connu mais non demandé reste refusé : le test a été corrigé, pas la protection. Prix correct explicitement demandé accepté ; faux montant et remise non configurée refusés. Première série29réussis/1échec de fixture conservée.
- **Chromium/Studio compilé** :1440/360px, confirmation≥44px,2angles natifs, image téléchargée/SHA identique, CSV avec texte entier, éditeur existant, correction manuelle et réouverture sans nouveau coût/appel. Trois captures réellement ouvertes et film réel7,32s, sans accélération ; original1440px conservé, partage960px/12fps.
- Le premier tampon de build indiquait modified à cause d’un lien local public : fichiers suivis rétablis et build propre vérifié. Une fixture navigateur a ensuite été refusée par la protection de migration ; seul l’ordre de préparation du harnais a changé. Aucune protection réduite ni nouvelle compilation applicative pour cette correction du harnais.

**Pas de suite locale complète répétant tous les anciens parcours : la CI finale complète doit encore réussir avant de sortir la PR du brouillon.** Détails et commandes exactes : [211_D11B_PREUVES.json](211_D11B_PREUVES.json).

[Devis ordinateur](preuves-211-D11b/01-campagne-ordinateur.png) · [Confirmation mobile](preuves-211-D11b/02-campagne-mobile.png) · [Éditeur natif](preuves-211-D11b/03-editeur-natif.png) · [Film](preuves-211-D11b/campaign-workflow.mp4) · [CSV natif](preuves-211-D11b/campaign-native.csv) · [Préparation JSON](preuves-211-D11b/campaign-preparation.json) · [Assertions](preuves-211-D11b/campaign-browser-proof.json) · [Version/transport](preuves-211-D11b/compiled-summary.json).

## Limites et suite

Cognition SDK/HTTP **simulée**, photos/motifs de recette synthétiques ; **0fournisseur réel/0€réel**. Ces preuves ne qualifient ni intelligence stratégique ni qualité créative IA. Cette tranche prépare les textes et les pièces jointes ; elle ne produit pas d’image publicitaire et n’approuve/publie aucune campagne. Production de nouveaux médias sociaux/publicitaires, D12/E/F et compléments vidéo restent partiels ; #211 reste ouverte.

Base de développementdfe46ee0 (#253), puis tests de sécurité communs et harnais propres : ne pas réappliquer ces tests deux fois lors de l’intégration. #2520b23a265 et #253603c3204 attendent leur CI finale ; #251 est prête/verte. #250 est déjà conservée par contenu sans ascendance. #247/#248 et API services Claude #239/#245 sont des dépendances futures ; aucune branche, composition, main, instance, configuration ou donnée client modifiée. Le Studio client n’a pas été mis à jour.

## Correctif de placement CI

La première CI41054579925 sur1190e0ce a échoué : la nouvelle recette campagnes avait été placée dans le job Docker, dont l’hôte ne dispose ni des dépendances Node ni du build. `npx` tentait d’installer tsx ; le garde réseau l’a correctement refusé (`LOT9_EXTERNAL_NETWORK_BLOCKED`). Construction, démarrage et contrôles du conteneur avaient réussi, mais le job global n’est PAS vert. Recette déplacée dans verifications, après npm ci/build/Chromium. Tous les noms/contrôles conservés ; test de placement YAML réussi. Application06688a0a et preuves précédentes inchangées, aucun nouveau build/capture local. Nouvelle CI finale exigée.
