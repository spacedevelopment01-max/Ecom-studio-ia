# Complément #142 — origine du refus, livraisons directes et résultats partiels

Le blocage existant vient du contrôle de rédaction **COPY_FACTS_REJECTED**, identifié par le diagnostic privé et recoupé avec les sources exactes de la version servie. La catégorie « budget » était une erreur de classification par mots-clés. Le contrôle des faits et les plafonds restent conservés.

Code final testé/construit : **33d9e40126dc524a0236c4d76a0a7d7c4e5f1feb** ; branche `codex/142-budgets-suivi-reprise`, [PR #146](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/146), non fusionnée. Version du studio indiquée par les diagnostics : **d97e0b9577128eeb39b403dae281da6bd835fc65**, sans intégration de cette PR. Aucun fournisseur réel, fusion, déploiement ou mise à jour du Codespace. Quatre thèmes et chantier Claude #145 préservés. Les passes cfceadb6 / fe9bf1b7 / 37f73b33 restent conservées.

| Défaut | Preuve et fichiers | Correction |
| --- | --- | --- |
| Jeu d’images hors handler : IA indisponible ou trois sorties vides rendues comme un succès | REPRODUIT : deux assertions de livraison échouent avant correction. `src/lib/image-v2/set.ts`, `tests/mission142-producteurs-directs.test.ts` | Contrôle dans le producteur appelé par création et workflow ; zéro fichier = erreur explicite, résultat partiel conservé sans annonce de lot complet. |
| Ancien alias `brand.logo` peut finir sans nouvelle proposition | REPRODUIT : `done` reçu au lieu de `failed`. `src/lib/engine/logo-job.ts` | Propositions réellement enregistrées et série complète exigées. Le logo fourni/validé reste en place, un choix encore requis ne devient pas une application automatique. |
| Étape vidéo directe et création initiale : référence nulle traitée comme terminée | REPRODUIT : les deux appels résolvaient sans fichier. `src/lib/orchestrator/execute.ts` (branche vidéo seulement), `src/lib/video-v2/creation-videos.ts` | Fichier, appartenance, conteneur/durée/piste/lecture vérifiés. Une première vidéo valide reste conservée si la seconde échoue ; les checkpoints empêchent de refaire la première. |
| Notification générique « image prête » malgré une livraison partielle/à vérifier ; fichier acquis après échec non rechargé par le suivi local | CONFIRMÉ DANS LE CODE puis REPRODUIT dans la recette UI native produit/service. `src/components/studio/tab-images.tsx` | Message de livraison partielle/à vérifier affiché comme information ; rechargement des fichiers après échec/arrêt/blocage. |
| Confirmation du lancement dit encore « 100 % utilisé » sous le seuil natif avec reliquat | CONFIRMÉ DANS LE CODE puis REPRODUIT dans la recette UI native produit/service. `src/components/studio/cost-confirm.tsx` | Titre « disponible insuffisant » et pourcentage restant, sans modifier le seuil minimum, le solde ou le refus d’appel. |

Le message d’échec de `generateAiPostImage` ne prétend plus que des images refusées existent avant même l’appel image : il dit que les étapes acquises sont conservées. Le diagnostic v1 pouvait classer « budget » un autre échec simplement parce que son message ajoutait le coût consommé ; aucune conclusion financière supplémentaire n’est déduite de ce champ.

Les anciens tests qui renvoyaient un faux identifiant vidéo ou les octets « mp4 » ont été remplacés par de petits fichiers réellement encodés avec FFmpeg. Cela vérifie la livraison technique, pas le rendu créatif. Aucun seuil de qualité ni timeout n’a été affaibli.

Code applicatif et recettes : **37f73b33cfd8397cbe1143ebabd7e4ae23168418**, arbre **d0218dbf9767b60aeb6e6d8a8a2912d90f68c08f**. Le commit local e264bed3 et le commit GitHub ont le même arbre, contrôlé avant compilation.

- `npx tsc --noEmit` : réussi.
- `npx vitest run` : **2 460 réussis, 13 ignorés, 318 fichiers**, 720,43 s ; 19 cas du diagnostic v3 inclus. Les skips restent 11 cas PHP non disponible et 2 cas déjà désactivés.
- `npx vitest run tests/mission142-diagnostic-livraison.test.ts` : **19 réussis** ; lecture seule, confidentialité, schéma ancien et codes fermés FR/EN, y compris erreurs non financières avec suffixe de coût.
- `npx vitest run tests/mission142-livraison-logo-video.test.ts tests/mission142-producteurs-directs.test.ts tests/videos-creation.test.ts` : **24 réussis**, dont fichier vidéo réel, résultat vide, proposition accessible sans remplacer un logo fourni et checkpoints partiels sans deuxième acquisition.

La version 3 du diagnostic reconnaît en plus le message natif « Budget insuffisant pour concevoir le visuel », le budget temporairement engagé et les erreurs non financières connues (`failureOriginCode`). Une cause inconnue reste explicitement inconnue ; ce contrôle ne dévoile aucun texte libre ni ancien solde inventé.

- Build de production de **37f73b33** sous garde réseau fournisseur et données isolées : réussi.
- `DATA_DIR=… DELIVERY_PHASE=bank node --import tsx scripts/mission142/bank-browser.ts` sur le serveur compilé **37f73b33** : deux nouveaux comptes/projets fictifs, doseur à épices et accord de pianos ; livraison partielle explicite, deux fichiers conservés après échec/reconnexion, solde restant 1 % avec pause native, zéro création envoyée depuis la confirmation sous seuil. **Six captures**, zéro erreur JavaScript et zéro domaine externe. La sortie du moteur image est injectée : cette recette ne prouve pas la création IA native ni sa qualité. Elle utilise les vrais écrans/routes, files de tâches, bibliothèque, fichiers et contrôles d’appartenance. Le parcours publicitaire natif complet reste couvert par les captures cfceadb6 déjà publiées.

L’inspection des six images sur **37f73b33** a révélé que la fenêtre proposait encore « Continuer sans IA » pour une action image qui exige un fournisseur. Cette seconde anomalie a été corrigée : seuls les choix compatibles restent proposés pour les actions `image`/`images`. Les actions qui possèdent un vrai moteur local le conservent. Les capacités de confirmation ont été extraites telles quelles dans `src/lib/ai/cost-confirm.ts`, avec réexport compatible depuis le composant ; seul le faux remplacement local de l’image change. Aucun fournisseur, droit de forfait ni montant n’est ajouté ou retiré.

Un premier chargement du nouveau test a révélé la configuration JSX préservée de Vitest (aucun cas exécuté) ; la règle pure a été isolée sans changer la configuration globale, puis les trois cas ciblés sont passés. La suite générale a été arrêtée après ce même défaut de chargement et relancée sur le code final ; ne pas compter ce passage interrompu comme réussi.

Résultat final sur **33d9e401** : le bouton local n’est plus proposé aux créations d’images, les actions disposant d’un moteur local le conservent. Les deux recettes banque passent : solde restant affiché, aucune requête de création envoyée sous le seuil, aucun usage ni réservation ajouté sur ces deux comptes fictifs.


## Retour du diagnostic existant et complément de source

Le JSON v3 transmis en privé confirme le même échec à 15 %, avec un seul appel texte réglé, sans appel image enregistré. Il montre un portefeuille rattaché au bon projet/propriétaire, un solde positif et aucune réservation ouverte **au moment de la lecture**. Le message reste `BUDGET_UNCLASSIFIED` / `UNCLASSIFIED` ; ces observations ne prouvent donc ni un dépassement du plafond ni le solde à l’heure de l’échec. Aucun montant, identifiant ou JSON client n’est publié.

Le diagnostic v4 est publié au commit **4d110b0413f93a8098c58164a0b93c710b9f1f11**, téléchargement brut vérifié par empreinte ; **25 tests réussis**, types réussis. Il reconnaît des refus postérieurs à la conception et repère les fragments constants du message dans les fichiers autorisés du moteur. Sa sortie ne contient que le chemin relatif, la ligne, l’empreinte du fichier et la longueur reconnue ; aucun texte libre ni donnée client. Le code local lu et le code compilé sont distincts : un candidat de source doit être recoupé, ce n’est pas une trace d’exécution inventée. Une commande unique a été transmise à Thomas, sans mise à jour du studio ni génération. Le retour v4 a ensuite permis le recoupement décrit ci-dessous.


## Cause de l’incident existant — identifiée

**OBSERVÉ DANS LE DIAGNOSTIC TRANSMIS**, puis **CONFIRMÉ DANS LE CODE** de la version réellement servie `d97e0b9577128eeb39b403dae281da6bd835fc65` : `failureOriginCode = COPY_FACTS_REJECTED`. Le message natif reconnu est celui du refus de rédaction dans `src/lib/social-v2/ai-post.ts`, ligne 630. L’empreinte du fichier reçu a été comparée avec `git show d97e0b95:src/lib/social-v2/ai-post.ts | sha256sum` : `2ac3431129fbb9d91449fed857a6f58d46603b7de010fce39789d51f2ed832f3`, identique. La deuxième correspondance est le suffixe du coût, ligne 213 de `src/lib/engine/ai-post-image.ts` : `29944051fe24d8420e1f77dab83daa9e429e7291a722df91441137f1524faec7`, identique également. Aucun texte privé ni JSON client n’est publié.

La proposition a donc atteint le contrôle local des textes après la rédaction, puis a été bloquée avant l’appel image enregistré. Ce contrôle compare le résultat nettoyé aux champs titre/sous-titre/CTA de la proposition et refuse leur modification lorsqu’une assertion commerciale n’est pas autorisée par les faits et la demande. Le message d’échec ajoute ensuite le pourcentage du budget consommé. Le premier diagnostic cherchait le mot « budget » n’importe où dans le message : c’est la cause de la **mauvaise classification budgétaire**, pas une preuve de plafond atteint.

La classification de ce refus connu est corrigée en **`quality`**, avec **`NOT_A_BUDGET_ERROR`** et **`COPY_FACTS_REJECTED`**, même en présence du suffixe de coût. Le contrôle des faits, le refus d’image et la comptabilisation de la rédaction déjà acquise sont conservés. Aucun solde augmenté, coût effacé, seuil abaissé ou essai payé relancé. L’interface corrigée doit montrer l’échec réel à 15 %, son motif de rédaction et l’absence de livraison, puis le conserver à la reconnexion.

**Limite** : le diagnostic ferme le point « quel garde a arrêté cette tâche », mais ne révèle pas le texte privé ou le champ exact refusé. La présence réelle d’une affirmation non confirmée, ou un faux positif de la règle sur un texte légitime, reste à vérifier sur les données privées ; aucun contenu privé n’a été relu dans ce diagnostic. Ne pas prétendre avoir relu cette création ni supprimé le contrôle pour la faire passer.

Code final construit et vérifié dans le navigateur : **33d9e40126dc524a0236c4d76a0a7d7c4e5f1feb**, arbre **ddbedb24bb8cace7fea126e3e3b94478eeb594e9**. La suite générale a réussi **2 469 cas, 13 skips préexistants, 319 fichiers** sur ce même code applicatif avant le dernier ajustement du script de classification ; le contrôle ciblé après cet ajustement inclut **37 tests réussis**, dont 26 du diagnostic, 3 de confirmation et 8 du moteur de publication. TypeScript final réussi. Ne pas présenter le total général comme incluant le nouveau 26e cas ajouté ensuite au diagnostic.


## Vérification finale et preuves à consulter

- `npm run build` sous garde réseau et base isolée : **réussi** sur **33d9e401**. La route locale `/api/version` a confirmé ce SHA compilé avant les recettes. [Build](../../reports/issue142/producteurs/build-final.txt).
- Suite générale : **2 469 réussis, 13 ignorés, 319 fichiers**, puis **37 tests ciblés réussis** après la correction de classification du diagnostic ; ce dernier passage inclut le cas de l’erreur qualité avec suffixe de coût. [Suite générale](../../reports/issue142/producteurs/suite-generale-2469.txt) · [Ciblés finaux](../../reports/issue142/producteurs/diagnostic-confirmation-publication-37.txt) · [Types](../../reports/issue142/producteurs/typescript-final.txt).
- `DATA_DIR=… DELIVERY_PHASE=after node --import tsx scripts/mission142/copy-failure-browser.ts` : **réussi sur 2 projets**, vraie route de devis/lancement, file de tâches et moteur `generateAiPostImage` / `designPostWithAi` ; seule la dépendance de rédaction est injectée avec une réduction fictive non autorisée. Le garde natif refuse l’image à 15 %, le motif persiste après rechargement, les fichiers source restent présents, aucune image n’est livrée ; un seul usage texte **synthétique** est réglé, aucune réservation ouverte. Aucune seconde génération n’est lancée. Ce cas reproduit le garde observé, pas les mots privés du client. [Résultats](../../reports/issue142/producteurs/refus-redaction/results.json) · [Log](../../reports/issue142/producteurs/navigateur-refus-redaction.txt).
- `DATA_DIR=… DELIVERY_PHASE=bank node --import tsx scripts/mission142/bank-browser.ts` : **réussi sur 2 autres comptes/projets** ; sortie moteur image injectée, suivi UI natif. Une livraison partielle reste partielle ; un fichier acquis avant échec reste visible puis après reconnexion ; le solde fictif de 1 % n’est pas déclaré épuisé et la confirmation sous seuil ne permet pas de création locale fictive. [Résultats](../../reports/issue142/producteurs/apres-correction-bouton/results.json) · [Log](../../reports/issue142/producteurs/navigateur-banque-final.txt).

Les données des recettes sont nouvelles et séparées : doseur à épices et accord/entretien de pianos, sur deux paires de comptes. Aucune règle applicative ne dépend de leur nom. Les requêtes externes sont interdites dans le serveur et les workers ; les navigateurs rapportent zéro domaine externe et zéro erreur JavaScript. **Nouveaux appels/coûts fournisseur réels : 0 / 0 €**. Les coûts présents dans les JSON de recette sont exclusivement synthétiques ; aucun coût client réel n’est publié.

### Captures originales

Six captures de 37f73b33 sont conservées [avant correction du faux bouton](../../reports/issue142/producteurs/avant-correction-bouton/). Douze captures finales de 33d9e401 sont jointes : [refus de rédaction, ordinateur/mobile/reconnexion](../../reports/issue142/producteurs/refus-redaction/) et [banque, échec avec fichier conservé, solde sous seuil](../../reports/issue142/producteurs/apres-correction-bouton/). Ce sont des originaux de navigateur avec mention visible de simulation, pas des créations IA professionnelles à valider. L’inspection visuelle a porté sur les six captures de la première passe, puis sur les écrans finaux de refus et de confirmation dans les deux activités.

| Capture finale | Produit | Service |
| --- | --- | --- |
| Refus texte sur ordinateur | [Ouvrir](../../reports/issue142/producteurs/refus-redaction/produit-doseur-01-refus-redaction-ordinateur.png) | [Ouvrir](../../reports/issue142/producteurs/refus-redaction/service-piano-01-refus-redaction-ordinateur.png) |
| Refus texte sur mobile | [Ouvrir](../../reports/issue142/producteurs/refus-redaction/produit-doseur-02-refus-redaction-mobile.png) | [Ouvrir](../../reports/issue142/producteurs/refus-redaction/service-piano-02-refus-redaction-mobile.png) |
| Après reconnexion mobile | [Ouvrir](../../reports/issue142/producteurs/refus-redaction/produit-doseur-03-refus-reconnexion-mobile.png) | [Ouvrir](../../reports/issue142/producteurs/refus-redaction/service-piano-03-refus-reconnexion-mobile.png) |
| Livraison banque partielle | [Ouvrir](../../reports/issue142/producteurs/apres-correction-bouton/produit-doseur-01-partiel-banque.png) | [Ouvrir](../../reports/issue142/producteurs/apres-correction-bouton/service-piano-01-partiel-banque.png) |
| Fichier conservé après échec | [Ouvrir](../../reports/issue142/producteurs/apres-correction-bouton/produit-doseur-02-echec-fichier-conserve-mobile.png) | [Ouvrir](../../reports/issue142/producteurs/apres-correction-bouton/service-piano-02-echec-fichier-conserve-mobile.png) |
| Solde insuffisant, aucun faux remplacement local | [Ouvrir](../../reports/issue142/producteurs/apres-correction-bouton/produit-doseur-03-solde-insuffisant-mobile.png) | [Ouvrir](../../reports/issue142/producteurs/apres-correction-bouton/service-piano-03-solde-insuffisant-mobile.png) |

### Limites et intégration

La pertinence du refus sur le texte privé, l’authentification et la qualité de vrais fournisseurs restent non vérifiées. Aucune réparation ni relance de la tâche client existante n’a été effectuée ; ses étapes et coûts restent conservés. Les contrôles de fichier ne remplacent pas la qualité créative. Les reprises HTTP directes, les limites CMS et les zones restant partielles sont détaillées dans la [matrice générale](ISSUE_142_CHAINE_IA.md). Le catalogue, le chat de thèmes, les sections, headers/footers et exports du chantier Claude n’ont pas été modifiés.

Les règles financières natives restent **40 % mensuel HT / 50 % HT recharge séparée**, avec le seuil minimum et les engagements/incertitudes. Aucun reset, nettoyage, modification de `.env.local`, média/donnée client ou partage de port public.

L’intégration reste réservée à Claude : reprendre les commits de #146 avec son travail #145, contrôler la CI du dernier commit, puis vérifier le SHA **réellement compilé et accessible** sur le studio. Cette PR et ces preuves ne constituent pas une mise à jour du Codespace. Le [manifeste](../../reports/issue142/producteurs/verification.json) distingue code construit, code servi remonté et instantanés de tests.
