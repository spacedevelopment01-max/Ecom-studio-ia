# B1 — confirmation gratuite utilisable dans le Studio

## Verdict et provenance

Raccordement livré sur une branche indépendante empilée sur B1, sans fusion, déploiement ni activation chez les clients. Les interfaces Encre/Plein cadre de Claude ne sont pas modifiées et n'utilisent pas encore ce raccordement. Arrêt avant tout nouveau lot.

Source applicative et recette qualifiées : **`a80b4454fb041759dfd2feeff29281bc7532f9f6`**. Le commit de preuves ultérieur ajoute uniquement le rapport, les JSON de résultats et les captures. La provenance `/api/version` doit être `compiled-build`, `production`, `tree: clean` et ce SHA exact ; les JSON de recette la conservent.

## Étape 1 — dépendances globalement vertes

| PR | SHA exact | Types / suite complète | Build / Theme Check / recettes natives | Docker | Verdict global |
|---|---|---|---|---|---|
| A1 #286 | `2f6b5c6f67d08ffb3871aa7e9759a3694ee54571` | success | success | success | [success · 41215615077](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41215615077) |
| A2 #287 | `12a197ee915e555b4bbbea2e5ba8856a5666231b` | success | success | success, après relance ciblée | [success · 41224662441](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41224662441) |
| B1 #289 | `5e3d42a1dd3f6110cd2ea6a6ed345299de10e6fc` | success | success | success | [success · 41224730639](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41224730639) |

A2 : première tentative Docker échouée par manque d'espace disque du runner. Après achèvement du workflow, seul le job Docker a été relancé (`124606206924` → `124624944705`) ; il a réussi, puis le verdict obligatoire `124626204691` a réussi. Aucun correctif source/CI, test supprimé ou timeout modifié pour obtenir ce résultat. Les têtes A1/A2/B1 sont inchangées ; aucune nouvelle requalification de dépendance n'était nécessaire.

Les descriptions des anciennes PR restent des comptes rendus historiques ; le présent tableau indique les verdicts désormais constatés.

## Étape 2 — comportement livré

Dans Boutique/Site, l'utilisateur désigne réellement la section dans l'iframe native, saisit une demande française prise en charge et voit son diff, sa portée et **Gratuit — 0 €**. Le bouton **Confirmer la modification gratuite** envoie `confirm-local` à la route conversationnelle existante avec l'identifiant de proposition, les révisions, `confirmation:true` et un identifiant de requête stable.

Le résultat est annoncé seulement avec preuve native relue ; le projet et son iframe existante sont rechargés. Le titre et l'ordre sont vérifiés dans le rendu réel, puis après rechargement de page. Les versions précédentes demeurent intactes ; le lien de restauration conduit aux versions manuelles natives, dont le bouton Restaurer est testé.

Annuler invalide la proposition côté serveur via la sélection A2 existante sans perdre la cible. Un double clic crée une seule version. Une réponse perdue après commit se reprend avec le corps et le `requestId` identiques, sans double écriture. Une édition manuelle concurrente produit un conflit ; les deux références A2 sont relues et consenties explicitement, puis une nouvelle demande, une nouvelle proposition et une nouvelle confirmation sont nécessaires.

Le drapeau fermé ne présente aucun bouton inopérant ni devis de secours pour ces commandes gratuites. A1 demeure en lecture seule. Les demandes complexes hors grammaire conservent leur parcours payant historique explicitement demandé, sans requête automatique.

## Tests et preuves

- **131 tests ciblés / 8 fichiers réussis** au commit source qualifié ; 13 cas propres au contrôleur, avec fonctions natives et stockage isolé, plus les suites B1/A2/A1/contexte/retouches/local-first existantes.
- Typage sans erreur et build de production réussis. `git diff --check` réussi. Aucune modification de `src/components/syna/*`, des préférences, de la navigation, des thèmes ni des branches Claude.
- Deux recettes Chromium sur le vrai Studio compilé : ouverture B1 produits/services + A1 produits/services, puis drapeau fermé produits/services + A1 produits/services. Résultats détaillés : [ouverte](RESUME-UI-OUVERTE.json), [fermée](RESUME-UI-FERMEE.json).
- Produits/services : ambiguïté sans écriture ; annulation ; vrai bouton et diff ; double clic ; titre visible et persistant ; ordre visible dans l'iframe ; réponse réseau perdue après commit puis retry exact ; conflit manuel et revalidation explicite ; nouvelle proposition/nouvel accord ; restauration manuelle existante ; révocation du forfait entre proposition et clic, sans écriture.
- Toutes les anciennes lignes de versions sont relues à l'identique ; les autres projets et les champs du projet hors pointeur de version/horodatage sont inchangés. Les empreintes des autres tables et fichiers, notamment `shop.chat`, droits et portefeuilles, sont identiques avant/après les seules opérations attendues. Le test de révocation modifie volontairement son abonnement fictif après ces comparaisons.
- Vrais ZIP Shopify comparés : seul `templates/index.json` change après le titre et le déplacement. Aucune section ni fichier source du thème n'est modifié hors action demandée.
- **0 tentative de classificateur/devis/réservation financière** dans les tests natifs instrumentés ; **0 requête HTTP de devis/cognition/outils payants** dans le parcours navigateur, tables IA/jobs/usage vides et empreintes financières inchangées. Le garde réseau et les clés fermées interdisent les fournisseurs réels : **0 appel réel, 0 € IA**.

La première recette de développement a révélé un repère client périmé après revalidation ; le raccordement reprend maintenant la sélection A2 explicitement revalidée. Le premier essai compilé s'est arrêté sur le bouton d'introduction déjà en disparition ; la recette attend désormais la fin native de l'introduction, sans changer l'interface ni les assertions métier. Le cadrage mobile est vérifié dans le mode Téléphone existant, sans retouche d'image.

## Captures synthétiques

Toutes les captures représentent des fixtures isolées, sans données ou médias clients, et sont inspectées avant publication.

| Parcours | Bouton et avant/après | Résultat natif |
|---|---|---|
| Produits desktop | [confirmation](captures/products-desktop-confirmation.png) | [résultat](captures/products-desktop-resultat.png) · [reçu](captures/products-desktop-recu.png) |
| Produits mobile | [confirmation](captures/products-mobile-confirmation.png) | [résultat](captures/products-mobile-resultat.png) |
| Services desktop | [confirmation](captures/services-desktop-confirmation.png) | [résultat](captures/services-desktop-resultat.png) · [reçu](captures/services-desktop-recu.png) |
| Services mobile | [confirmation](captures/services-mobile-confirmation.png) | [résultat](captures/services-mobile-resultat.png) |

## Intégration, limites et rollback

Le [contrat frontend](CONTRAT-UI.md) expose un contrôleur sans React/CSS et un hook réutilisables. Claude pourra les reprendre séparément pour les deux modes ; ce travail ne fusionne pas B1 dans son lot 1 bis et ne modifie aucune de ses interfaces. La liaison actuelle reste dans le ConversationPanel historique.

Le backend n'est pas réimplémenté : seuls la disponibilité et les champs de présentation de portée/commande sont ajoutés à ses DTO existants. Aucun changement du moteur local, des règles d'opérations, des contrôles financiers ni de la restauration native.

La grammaire française reste bornée : titre court exact admissible (500 caractères maximum), ou déplacement dans la même page vers une destination unique. Pas de champs multiples, couleurs, médias ni undo étendu. Les sections protégées ou issues de contenus métier restent exclues. A1 n'est pas migré en écriture. Une ancienne proposition dépourvue de portée demande une nouvelle proposition gratuite.

La nouvelle recette compilée est ajoutée dans un job CI distinct et obligatoire au verdict global, avec artefacts synthétiques ; les suites et délais existants sont conservés. **Sa CI globale au dernier commit de PR doit être contrôlée séparément des succès locaux et des CI A2/B1. La PR reste en brouillon ; aucune disponibilité ou intégration production n'est annoncée.**

Rollback : laisser le drapeau fermé (valeur par défaut) et fermer cette PR, ou retirer son raccordement avant intégration. Aucune migration de données ni activation à annuler. Les retouches fictives du test utilisent la restauration manuelle native ; les données temporaires de recette sont supprimées ensuite.

**STOP : pas de B2/B3, nouveau module, merge, déploiement, fournisseur réel ni dépense.**
