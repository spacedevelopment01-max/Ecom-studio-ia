# #211 — F2 : aperçu Site mobile et blocage de CI

**Livraison pour revue dans #227.** Branche `codex/211-f2-apercu-mobile`, code et build propre réellement servi `e4f3f3b9d7c7c25c72373a4f2845f8348e185c49`. Parent D5 #223 `dc23f69dbbf9f7b0513fff5d78ebcbf8db2382b6`. Aucun merge, activation, déploiement ou fournisseur réel.

## Défaut reproduit et correction

La CI [40775253509](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40775253509), job123123167457, échoue dans la recette `--ui` sur le service390×844 : `Preview must be visible above half the screen`. Le SHA de combinaison GitHub effectivement compilé est `587dc7dff6538fad7c688e7df3d9406b03797cee`, distinct du head D5dc23f69d. Types, tests, Theme Checks, build et Docker ont passé ; les étapes suivantes ignorées ne sont pas des succès.

L’artefact GitHub a été téléchargé et sa capture ouverte. La même erreur a été reproduite localement sur le build propre D5 `03f376f041fb46d432f10498e593f14e684a7d88`. Le cas390×900 précédemment livré ne couvrait pas cette hauteur844. La barre d’outils à plusieurs rangées place l’aperçu trop bas.

La correction dans [tab-boutique.tsx](../../src/components/studio/tab-boutique.tsx) réduit uniquement les espaces verticaux de cette barre sur téléphone. Les boutons, leurs dimensions, les fonctions, le filtrage des droits et les espacements ordinateur restent conservés. Aucun fichier de thème, composition, moteur ou démonstration de Claude n’est modifié.

Le [harnais existant](../../scripts/verify-agent211-ui.ts) conserve exactement son assertion de visibilité. Il enregistre en plus la géométrie réelle et les contrôles visibles. **Après : y409px <844/2=422px**, largeur390px. Aucun contrôle retiré ou seuil abaissé pour obtenir le succès.

## Vérifications

| Commande | Résultat |
| --- | --- |
| `npx tsc --noEmit` | Réussi |
| `npx vitest run` | **3 706 réussis /45 ignorés**,429 fichiers réussis/un ignoré,1 320,45s ; sources gelées inchangées |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | Réussi sur e4f3f3b9 propre |
| `npx tsx scripts/verify-agent211-build.ts <dossier-isolé> --ui` avant correction | Échec attendu/reproduit, conservé dans les preuves |
| Même commande après correction | Réussie sur le commit propre exact |

Le complet précède le commit ; les deux fichiers gelés ont été comparés au code publié. Le harnais navigateur autonome n’est pas collecté par Vitest : types, build et exécution séparée le qualifient.

Recette compilée produit1440×960 et service390×844, plus reprise d’une création dont la réponse réseau a été perdue. Entrée libre, devis/accord distincts, réponses multiples/libres, Pourquoi, inconnu/correction/reprise, mémoire entre onglets, aperçu ouvert/replié, outils manuels, format téléphone, retouche de version puis restauration et clavier Échap/focus sont vérifiés. Largeur ordinateur :1 136px replié/720px avec SYNA, sans chevauchement. Contrôle de débordement à360px sur le questionnaire ; ce n’est pas une recette Site complète à360px.

**33 PNG originaux et trois vidéos réelles**. Images/durées des MP4 comparées aux WebM, sans coupe/accélération ; échantillons RGB comparés aux sources. Les PNG restent la référence pour les couleurs. Les captures avant CI et locales sont conservées séparément.

**Six appels HTTP simulés et six usages connus =47 472 micro fictifs** dans le harnais complet : trois contrôles de base et trois réponses des cas d’interface/reprise. La reprise après perte réseau n’ajoute pas un nouvel appel au résultat déjà acquis. **Zéro fournisseur réel / coût réel nul** ; aucun devis fournisseur réel ou facture vérifiés.

## Portée et limites

Il s’agit de sites techniques fictifs et de réponses imposées par un faux fournisseur local, avec serveur/worker/SDK natifs et réseau fournisseur bloqué. Ces contrôles ne qualifient pas le conseil d’une IA réelle, les images, la création professionnelle, tous les mobiles/bannières, une installation CMS ou l’instance client. Aucun résultat professionnel ou paiement/RDV réel n’est déduit de cette correction d’interface.

Les Theme Checks antérieurs de CI sont conservés ; aucun fichier de workflow ni contrôle de thème n’est supprimé. La nouvelle CI de cette branche reste à examiner, **pas déclarée verte par ce rapport local**.

D6 #224, D7 #225, Images #226 et textes intégraux E4 #222 restent des branches sœurs à conserver lors d’une intégration explicitement autorisée. Cette branche descend de D5 et ne les intègre pas automatiquement. Aucun projet client/VANS étape1/Contretemps, média, budget, forfait ou thème validé n’est modifié. L’instance client n’est pas mise à jour.

[Galerie et vidéos](preuves-211-F2-apercu/README.md) · [mesures/commandes/empreintes des sources](preuves-211-F2-apercu/verifications.json) · [géométrie service](preuves-211-F2-apercu/service-preview-geometry.json) · [échec CI d’origine](preuves-211-F2-apercu/avant/ci.json). Les fichiers distants et des retéléchargements restent à vérifier avant l’annonce de publication. **F2 et #211 restent partiels : autres outils, composition originale et qualification réelle restent ouverts.**
