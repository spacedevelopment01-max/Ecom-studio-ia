# E-COM STUDIO IA — Audit général et priorités

Date de l'audit : **17 octobre 2026** (Europe/Paris). Rapport destiné au propriétaire et à Claude.

## 1. Conclusion et décision proposée

L'audit confirme plusieurs défauts internes qui peuvent expliquer les symptômes signalés : **des consignes disparaissent, des contenus sont remplacés avant livraison et une tâche terminée ne garantit pas un résultat utilisable**. Le mauvais fonctionnement réel des fournisseurs reste à vérifier ; il ne peut pas être déduit de ces symptômes.

La première correction recommandée est une tranche bornée : **fiabiliser le parcours demande de texte → document SEO → thème → aperçu/export**, avec une cible stable, conservation des exigences et un résultat métier distinct de la fin du traitement. Ce parcours fournit un modèle réutilisable pour les médias sans reconstruire tous les moteurs.

**Aucune correction applicative n'a été effectuée. La publication de ce rapport ne vaut pas validation des corrections.** Le propriétaire doit valider leur démarrage séparément.

## 2. Version examinée et périmètre d'autorisation

| Élément | État constaté |
|---|---|
| Dépôt | `spacedevelopment01-max/Ecom-studio-ia` |
| Copie examinée | `/workspace/Ecom-studio-ia` |
| Branche locale pendant l'audit | `work` |
| Commit audité | `ad41c596e859781f33874730891b4bd8b85e259e` |
| Référence locale `origin/main` | Même commit au moment de l'audit ; aucune garantie sur les changements distants ultérieurs |
| Modifications locales | Aucune avant et après l'audit ; `git status --porcelain=v1` vide, `git diff --exit-code` réussi |
| Instructions | `CLAUDE.md` lu intégralement, `README.md`, configuration Vitest et CI ; aucun `AGENTS.md` trouvé |
| Environnement | Node.js `24.19.0`, npm `11.9.0`, dépendances déjà présentes, `ffmpeg` disponible |

Référence immuable : [commit audité](https://github.com/spacedevelopment01-max/Ecom-studio-ia/commit/ad41c596e859781f33874730891b4bd8b85e259e). **Toutes les références de code ci-dessous désignent ce commit**, et non une future version de `main`. Les numéros de ligne s'y rapportent.

Commandes disponibles dans `package.json` : `dev`, `studio`, `maj`, `build`, `start`, `worker`, `setup`, `test`, `typecheck`. Des vérifications de thème sont également prévues dans `scripts/verify-theme.sh` et la CI.

Pendant l'audit : aucun appel IA réel ou payant, aucune publication client, aucun déploiement, aucune fusion ni modification du code. Les tests utilisent des données isolées et des outils simulés lorsqu'un fournisseur serait nécessaire. Aucune clé ni donnée client réelle n'est incluse dans ce rapport. Les exemples de reproduction sont synthétiques.

Publication documentaire autorisée ensuite par le propriétaire : **ce seul fichier**, sur `coordination/audit-2026-10-17`, sans fusion dans `main`. La branche documentaire part du commit audité pour conserver un lien exact entre le rapport et le code examiné.

## 3. Qualification des preuves

- **CONFIRMÉ DANS LE CODE** : comportement établi par lecture du parcours effectivement branché.
- **REPRODUIT** : comportement exécuté avec des données isolées ; la simulation éventuelle est indiquée.
- **OBSERVÉ DANS LES JOURNAUX** : réservé à des événements d'exploitation effectivement consultés. **Aucun constat de production ne reçoit cette qualification** : aucun journal client réel n'a été examiné.
- **HYPOTHÈSE** : conséquence plausible restant à mesurer sur des demandes et créations réelles.

Les anciens rapports et les commentaires qui annoncent un comportement ne sont pas des preuves. Les conclusions ont été vérifiées dans cette version. Un test vert, un JSON valide ou une compilation correcte ne prouvent pas la qualité commerciale ou artistique d'une création.

## 4. Parcours réel d'une demande

### 4.1 Mécanismes communs

1. Le client saisit une description, une demande, des informations métier et éventuellement des fichiers.
2. La route API identifie le compte et le projet, valide l'entrée et, selon l'action, vérifie le forfait et le devis.
3. Une tâche persistante est enregistrée dans SQLite ; le worker la réserve avec un bail et des points de reprise.
4. Le moteur spécialisé charge le projet, ses faits, sa mémoire, ses décisions de marque et ses références.
5. Un brief et des consignes sont construits. Une réutilisation peut intervenir avant l'appel externe.
6. Le routage texte ou média choisit le fournisseur et le modèle, avec des réglages administratifs et des capacités déclarées.
7. L'appel passe par les contrôles de droits, tarifs, budget et réservation prévus dans l'adaptateur.
8. Des contrôles locaux et/ou IA évaluent le résultat.
9. Documents, fichiers, versions, contrôles et traces sont enregistrés.
10. Le worker termine la tâche ; l'interface recharge ses données et propose affichage, édition ou export.

Références communes : `src/lib/project-start.ts`, `src/lib/route-helpers.ts`, `src/lib/projects.ts`, `src/lib/brain/`, `src/lib/ai/context.ts`, `src/lib/jobs.ts`, `worker/index.ts:46-103`, `worker/handlers.ts`, `src/lib/ai/llm.ts`, `src/lib/ai/media-providers.ts`, `src/lib/library.ts`.

**CONFIRMÉ DANS LE CODE :** le contexte projet existe déjà. Les pertes constatées se produisent notamment lors de sa transformation en brief, en prompt, en clé de réutilisation ou en format de livraison.

### 4.2 Parcours par fonction

| Fonction | Parcours reconstitué |
|---|---|
| Thèmes et pages | Interface Boutique → `/theme/*` → worker → `buildShop` → moteur V2 par défaut, V1 si direction explicite ou réglage historique, ou parcours sur mesure → `ThemeSpec` → contrôle → version courante → rendu Liquid et export CMS. |
| Textes et SEO | Interface de contenu → `/content/v2` → `content.v2` → pages/faits/mots-clés/stratégie/brief → réutilisation → rédaction locale ou IA → contrôles → document versionné → sélection et reprise dans le kit de textes du thème. |
| Images | `CreateImage` → `/images/v2` → `image.v2` → contexte/brief → réutilisation ou recherche/génération selon la demande → adaptateur média → contrôle → candidats et bibliothèque → interface. |
| Logos | `LogoV2Panel` → `/brand/logo-v2` → devis et tâches de création/retouche/choix → découverte de marque → territoires → génération → contrôles et relais éventuel → propositions originales et verdicts → choix humain → déclinaisons, favicon, thème et identité. |
| Vidéo V2 | `/videos/v2` → intention → stratégie → script → storyboard → choix des procédés et estimation → médias → document éditable → audio et rendu → contrôle → reprise ciblée → bibliothèque. |
| Vidéo en scènes | Interface guidée → `video.scenes` → brief et storyboard → plan écrit ou local → image et animation pour le produit, ou plans de banque pour le service → montage/voix selon disponibilité → vérifications finales → fichier et versions. |
| Publicités | Deux interfaces coexistent. La voie `ai_create` produit un visuel via le moteur social. La voie `generate` lance `ads.v2`, construit angles et textes, puis utilise normalement `finalAd`, qui repasse par le moteur social et crée un fichier image. La galerie éditable historique attend des documents à calques. |

### 4.3 Accès, budget, tâches et exports

**CONFIRMÉ DANS LE CODE :** `projectFromCtx` vérifie le compte et l'appartenance du projet ; la lecture des fichiers utilise aussi `ownedProject`. Les mécanismes `aiActiveFor`, `assertAiAllowed`, les réservations et `accountKeyFor` séparent droits et budget, notamment par projet. Les routes n'ont pas toutes été auditées exhaustivement.

Les baux, checkpoints, pauses et protections contre la reprise de certains appels payants incertains existent. En revanche, le statut technique final est trop largement interprété comme succès métier ; voir F1.

L'export de thème utilise une version précise, une empreinte et `exportAndRecord`, qui refuse un export `REJECTED`. La lecture de ces mécanismes ne démontre pas une installation réussie dans un CMS réel.

## 5. Constats prioritaires

### F1 — P0 : succès technique sans preuve de livraison

**CONFIRMÉ DANS LE CODE + REPRODUIT.**

`completeJob()` termine toute tâche dont le handler retourne normalement. Il ne vérifie ni verdict, ni livrable, ni atteinte d'un plafond. Reproduction isolée sur la vraie fonction :

```json
{
  "resultatFourni": {
    "verdict": "REJECTED",
    "videoAssetId": null,
    "outcomes": [],
    "stoppedByCostCap": true
  },
  "etatEnregistre": { "status": "done", "message": "Terminé" }
}
```

Ce test vérifie le mécanisme de fin de tâche ; il ne prétend pas reproduire une génération vidéo réelle refusée.

Le pipeline global peut annoncer « Votre projet est prêt » après des erreurs ou étapes sautées. `pipelineAds` absorbe certaines erreurs et retourne `false`, `pipelinePageCopy` retourne `null`, tandis que `serviceContent` transforme une impossibilité en étape sautée. La disponibilité réelle de chaque livrable n'est pas une condition de la notification globale.

Plus grave : `buildShopV2()` calcule la décision qualité puis sauvegarde la version courante même si elle est refusée. Reproduction sur un service synthétique sans coordonnées/zone : section pratique vide, `REJECTED`, code `empty_section`, **version néanmoins activée**.

Références :

- `src/lib/jobs.ts:252-263` — `completeJob`.
- `worker/index.ts:74-86` — résultat du handler transmis à `completeJob`.
- `src/lib/engine/pipeline.ts:146-149`, `165-173`, `450-475`, `483-492` — `runPipeline`, `serviceContent`, `pipelineAds`, `pipelinePageCopy`.
- `src/lib/theme-v2/engine.ts:129-144` — `buildShopV2`.
- `src/lib/projects.ts:191-214` — sauvegarde et activation de version.
- `src/app/api/projects/[id]/theme/route.ts:37-49` — verdict non transmis dans l'objet courant de la même manière que les autres informations de présentation.

**Conséquence :** traitement achevé, résultat disponible, résultat validé et demande satisfaite sont confondus. Il faut conserver les brouillons refusés pour diagnostic sans les présenter comme résultat courant validé.

### F2 — P1 : demande exacte perdue dans la rédaction SEO et sa réutilisation

**CONFIRMÉ DANS LE CODE + REPRODUIT avec rédaction simulée.**

La route accepte une demande libre. `buildBrief()` la reçoit mais n'en conserve que l'intention générale. `writePrompt()` ne reçoit donc plus les contraintes exactes. La clé `memoKey` omet aussi la demande brute.

Reproduction :

1. Demander quatre phrases et une clôture exacte.
2. Demander ensuite deux phrases, le vouvoiement et une autre clôture.
3. Le premier prompt simulé ne contient ni la demande exacte ni sa clôture.
4. La deuxième exécution retourne le même document avec `skipped: true`.
5. Un seul appel de rédaction simulé a eu lieu.

Références : `src/app/api/projects/[id]/content/v2/route.ts:61-71`, `src/lib/seo-v2/brief.ts:59-90` (`buildBrief`), `src/lib/seo-v2/write.ts:353-371` (`writePrompt`), `src/lib/seo-v2/engine.ts:116`, `129-133`.

**Conséquence :** le modèle peut sembler désobéir sans avoir reçu la consigne. Une nouvelle demande peut être traitée comme une ancienne demande identique. Relancer le fournisseur ne résout pas la perte amont.

### F3 — P1 : des demandes visuelles incompatibles deviennent le même prompt

**CONFIRMÉ DANS LE CODE + REPRODUIT sans génération IA.**

Le sujet client est reçu par l'interface, conservé dans le job et ajouté au brief. Mais `generationPrompt()` retourne directement une scène préécrite lorsque `fr.scene` ou `fr.productScene` s'applique. Ces fonctions ne reçoivent pas le sujet client ajouté au brief. La composition, la lumière et la palette peuvent également être perdues sur ces branches.

Reproduction sur six combinaisons : cosmétique, casque audio et logiciel SaaS, chacun en ambiance et scène avec référence produit synthétique. Deux demandes contradictoires — socle rouge/fond noir et socle bleu/fond blanc — donnent :

```text
Sujets du brief différents : oui
Empreintes différentes : oui
Prompts finaux strictement identiques : oui, dans les six cas
Contraintes rouge/bleu présentes dans le prompt : non
Appels fournisseur réels : zéro
```

Le contrôle reçoit pourtant le sujet demandé : générateur et contrôleur ne travaillent plus sur la même commande.

Références : `src/components/studio/tab-images.tsx:387-398`, `src/app/api/projects/[id]/images/v2/route.ts:95-105`, `src/lib/image-v2/brief.ts:182-185`, `245-255`, `src/lib/image-v2/still-life.ts:330-367`, `src/lib/image-v2/deps.ts:47-54`.

**Conséquence démontrée :** les consignes n'atteignent pas le fournisseur sur ces branches. La contribution exacte à la répétitivité des créations réelles reste une **HYPOTHÈSE** à mesurer visuellement.

Les scènes préécrites imposent aussi des choix forts : produit centré et seul objet, lumière fixée, listes fermées d'accessoires ; certaines familles ont peu de variantes. Références : `still-life.ts:286-308`, `358-364`. Leur utilité pour la fidélité et les objets attendus doit être préservée, tout en permettant les demandes compatibles du client.

### F4 — P1 : corps commercial supprimé entre document SEO et thème V2

**CONFIRMÉ DANS LE CODE + REPRODUIT.**

`savedCopy` et `overlayV2Copy` récupèrent le corps du document SEO. `siteContent` reconstruit ensuite la description depuis le résumé du projet, sinon seulement le texte court ; une liste est ajoutée seulement dans le cas d'une caractéristique unique. `composeThemeV2` remplace la description du produit par ce résultat.

Reproduction : un paragraphe commercial synthétique édité comme texte client existe dans l'overlay, mais disparaît du thème V2, remplacé par une phrase de résumé.

Références : `src/lib/engine/shop.ts:55-60`, `src/lib/seo-v2/theme-copy.ts:54-70`, `src/lib/theme-v2/content.ts:227-231`, `src/lib/theme-v2/engine.ts:80`.

**Conséquence :** améliorer le rédacteur ne suffit pas si son contenu est perdu avant livraison. L'objectif d'écarter les affirmations non confirmées reste pertinent ; il ne justifie pas la suppression indifférenciée d'un texte contrôlé ou fourni par le client.

### F5 — P1 : texte du mauvais produit sélectionné pour le produit principal

**CONFIRMÉ DANS LE CODE + REPRODUIT.**

`referenceDoc(projectId, type, lang)` choisit le document produit récent de la langue voulue sans vérifier la clé de page. `overlayV2Copy()` l'applique au produit principal.

Reproduction : sauvegarder une fiche d'accessoire après celle du produit principal entraîne le remplacement du titre principal par celui de l'accessoire. La clé sélectionnée est celle de l'accessoire synthétique.

Références : `src/lib/seo-v2/theme-copy.ts:14-22`, `54-70`, `src/lib/seo-v2/store.ts:44-50`. Le ciblage catalogue existe pourtant dans `src/lib/seo-v2/engine.ts:114-115`.

**Conséquence :** mélange possible du titre, du corps commercial et des métadonnées SEO entre produits d'un catalogue.

### F6 — P1 : format publicitaire produit incompatible avec la galerie éditable

**CONFIRMÉ DANS LE CODE + REPRODUIT avec générateur simulé.**

Deux interfaces sont montées côte à côte : `AiAdCreator` et `AdCreatives`. Cette dernière lance `action: generate`, donc `ads.v2`, puis recharge `/ads/docs`, qui lit `ad_documents`.

Le branchement réel fournit toujours `finalAd`. Il retourne avant la composition historique et son `saveVersion`. Le moteur social enregistre une image publicitaire dans `assets`, sans document à calques.

Reproduction de cette branche avec générateur simulé : **un fichier image de test enregistré, zéro document publicitaire éditable, zéro relecture de la voie historique de composition** ; outcome `PROVISIONAL`, note absente. L'autre galerie ou la bibliothèque peut afficher le fichier : le défaut porte sur le résultat éditable promis dans ce parcours, pas sur une absence totale de tout fichier.

Le suivi de `AdCreatives` affiche « Publicités prêtes : cliquez sur Modifier » pour un cas autre que `failed`, sans vérifier les documents ni les résultats. Une annulation ou un job absent peut aussi conduire à cette annonce. Le handler omet certaines raisons détaillées des outcomes dans la réponse réduite.

Références : `src/components/studio/tab-publicites.tsx:92-95`, `src/components/studio/ad-editor/ad-creatives.tsx:39`, `59`, `64-72`, `src/app/api/projects/[id]/campaigns/v2/route.ts:48-57`, `101-103`, `src/app/api/projects/[id]/ads/docs/route.ts:13-20`, `src/lib/ads-v2/deps.ts:68-82`, `src/lib/ads-v2/engine.ts:311-316`, `411`, `src/lib/social-v2/ai-post.ts:206-207`, `worker/handlers.ts:80-83`.

**Conséquence :** moteur et interface peuvent fonctionner séparément tout en échouant à livrer ensemble le résultat attendu. Les tests de la branche historique ne suffisent pas à couvrir le branchement de production.

### F7 — P1 : CTA et ligne commerciale reconstruits après rédaction contrôlée

**CONFIRMÉ DANS LE CODE ; transformation aval REPRODUITE.**

`oneFormat` transmet le CTA à `finalAd`, mais l'adaptateur ne le copie pas dans le brief social. Il désactive la rédaction complémentaire en affirmant conserver les textes ; `aiPostTexts()` reconstruit alors CTA et sous-ligne. La sous-ligne commerciale initiale n'est pas transmise à `finalAd`.

Reproduction avec le même brief aval : CTA sélectionné « Découvrir » → CTA reconstruit « Commander ».

Références : `src/lib/ads-v2/engine.ts:313`, `src/lib/ads-v2/deps.ts:77-80`, `src/lib/social-v2/ai-post.ts:51-54`.

**Conséquence :** un contrôle d'orthographe peut valider un texte différent de celui demandé ou approuvé en amont.

### F8 — P1 : fournisseur déclaré disponible sans preuve de capacité à exécuter la tâche

**CONFIRMÉ DANS LE CODE + REPRODUIT localement, sans réseau.**

Plusieurs indicateurs de disponibilité vérifient surtout la présence d'une clé. D'autres conditions sont testées ensuite : activation, modèle compatible, tarifs confirmés, forfait et budget. Les contrôles ne sont pas équivalents.

Reproduction : une valeur de configuration fictive suffit à rendre `aiReady().llm` vrai, alors qu'une génération reste bloquée par les tarifs non confirmés. Aucune authentification réelle n'a été tentée.

Les tests administratifs ont une portée limitée : liste de modèles pour certains fournisseurs, comptage de jetons sur un modèle précis pour le texte, interrogation d'un statut de requête pour un autre. Ils ne démontrent pas une génération réussie du modèle utilisé avec les paramètres et références du client.

Références : `src/lib/ai/config.ts:259-279`, `src/lib/ai/llm.ts:127-146`, `719-721`, `src/lib/ai/text-models.ts:216-227`, `src/lib/ai/media-providers.ts:1136-1180`, `src/app/api/admin/test/route.ts:14`.

Les images présentent aussi une différence entre présence d'une clé et chemin compatible réellement disponible : `src/lib/image-v2/deps.ts:120-136`, `engine.ts:274-281`.

**HYPOTHÈSE seulement :** des accès, modèles, régions, quotas ou clés seraient actuellement défaillants sur l'installation utilisée par les clients. L'environnement d'audit ne dispose d'aucune liaison de secrets déclarée par son gestionnaire ; cela ne renseigne pas la configuration de production. Aucun diagnostic de connexion réel n'est établi ici.

### F9 — P2 : réutilisation insuffisamment sensible aux décisions client

**CONFIRMÉ DANS LE CODE + REPRODUIT pour l'empreinte.**

`briefHash()` omet notamment palette, audience et règles de vocabulaire. La réutilisation d'une image finale intervient avant la nouvelle application du vocabulaire.

Reproduction : changer palette et audience dans le projet synthétique conserve exactement la même empreinte. Aucun ancien rendu réel n'a été réaffiché pendant ce test.

Références : `src/lib/image-v2/brief.ts:232-235`, `src/lib/image-v2/assets.ts:98-100`, `src/lib/image-v2/engine.ts:171-177`, `290-291`.

**Conséquence :** possibilité de réutiliser un résultat conforme à un contexte précédent. Ce risque s'ajoute au défaut de clé SEO de F2.

### F10 — P2 : repli vidéo et réparation de format masquant certaines limites

**CONFIRMÉ DANS LE CODE + REPRODUIT avec outils simulés.**

- Vidéo en scènes : une erreur de rédaction du plan est absorbée et un plan local utilisé, sans conserver l'erreur dans les notes retournées. Le probe injecte une erreur définitive simulée ; le rendu simulé est retourné normalement. Référence : `src/lib/video-v2/three-scenes.ts:344-354`.
- Vidéo V2 : la rédaction peut revenir au script local après erreur ou refus ; ce parcours conserve des notes. Référence : `src/lib/video-v2/engine.ts:288-305`. Ce repli est plus explicite que le précédent.
- `salvage()` peut rendre valide une réponse en ajoutant chaînes/listes vides et en remplaçant une valeur inconnue par une valeur autorisée. Reproduction : titre et sections absents deviennent `""` et `[]`, style inconnu remplacé, réponse acceptée par le schéma. Références : `src/lib/ai/llm.ts:624-696`, notamment `658-675`.

**Conséquence :** exploitabilité technique et complétude de la commande restent distinctes. Ces réparations peuvent être utiles mais doivent laisser une trace métier et ne pas suffire à annoncer satisfaction.

### F11 — P2 : contrôles présents, mais invariants incomplets

**CONFIRMÉ DANS LE CODE + REPRODUIT avec revue simulée pour le cas publicitaire.**

`aiPostAccepted()` décide à partir de présence humaine, fidélité produit, textes, lisibilité et note. Un défaut de logo décrit dans `issues` n'est pas un invariant bloquant. Une revue simulée avec produit et textes corrects, note 8, mais issue « logo remplacé par un autre emblème » est acceptée. Cela ne prouve pas qu'un contrôleur réel donnera ces valeurs ; cela démontre l'absence de protection déterministe pour ce défaut.

Le contrôleur réel de cette voie ne reçoit pas la demande libre initiale ni toute la scène attendue. Une scène hors brief passant malgré tout reste une **HYPOTHÈSE**, non un résultat réel observé.

Références : `src/lib/social-v2/ai-post.ts:24-37`, `115-116`, `242-255`, `src/lib/ads-v2/engine.ts:311-316`.

Les contrôles finaux de la vidéo en scènes mesurent notamment format, contraste et structure, tout en laissant fidélité produit et orthographe non vérifiées sans preuve dédiée. Le résultat du contrôle est enregistré ; certaines erreurs sont capturées et le fichier sauvegardé. Références : `src/lib/video-v2/final-check.ts:57-149`, `three-scenes.ts:560-590`.

Il serait faux de qualifier tous les contrôles de purement techniques : les moteurs images, textes et vidéos disposent aussi de critères factuels, esthétiques et commerciaux. Le défaut commun est l'absence d'une vérification fidèle et complète de la commande à chaque livraison.

### F12 — P2 : retouche annoncée sans changement réel

**CONFIRMÉ DANS LE CODE + REPRODUIT.**

`applyOps()` ajoute une mention « mis à jour » après affectation sans comparer l'ancienne et la nouvelle valeur. Réappliquer le même titre produit une spécification strictement identique et un message de mise à jour. Le traitement aval prend la liste `applied` pour preuve de changement.

Références : `src/lib/theme/ops.ts:321-327`, `worker/handlers.ts:316-324`, `src/lib/engine/shop-chat.ts:19-39`.

La validation structurelle ne prouve pas le respect sémantique ou visuel de la retouche : `theme/ops.ts:580-605`.

### F13 — P2 : composition V2 locale et limites de densité

**CONFIRMÉ DANS LE CODE ; effet sur la qualité perçue : HYPOTHÈSE.**

`buildShop()` choisit V2 par défaut. La branche est locale et ne transmet pas `useAi`. Le moteur choisit cinq langages visuels par scores, des types de sites et des structures déterministes. Des sections disparaissent sous des seuils de contenu ou de médias.

Références : `src/lib/engine/shop.ts:272-279`, `src/lib/theme-v2/art-direction.ts:14`, `231-264`, `src/lib/theme-v2/intent.ts:31-49`, `src/lib/theme-v2/compose.ts:210`, `296`, `328`, `337`, `436-456`, `src/lib/theme/page-templates.ts`.

**Conséquence :** une IA connectée ne renouvelle pas à elle seule l'architecture de cette branche. Les pertes F2/F4 et les seuils peuvent réduire la matière livrée. Une évaluation visuelle comparative reste nécessaire ; il ne faut ni conclure que tous les thèmes sont identiques, ni remplir les pages avec des faits inventés.

### F14 — P2 : coexistence de promesses et de parcours historiques

**CONFIRMÉ DANS LE CODE.**

- L'interface publicitaire propose un moteur local gratuit quand l'IA est indisponible, alors que le branchement réel `finalAd` renvoie un blocage sans composition locale. Références : `src/components/studio/ai-ad-creator.tsx:76-77`, `ad-editor/ad-creatives.tsx:55-56`, `src/lib/ads-v2/deps.ts:72-73`.
- En thème V1, certaines erreurs de conception/relecture conduisent à conserver la direction ; des détails restent secondaires ou dans les journaux. Références : `src/lib/engine/shop.ts:318-321`, `350-353`.
- Le sur mesure explique ses substitutions de bibliothèque, comportement utile à conserver ; son libellé initial « prêt » et son encadré de succès ne prouvent pas la relecture. Références : `src/lib/engine/custom-theme.ts:512-521`, `src/components/studio/custom-theme.tsx:74`, `115-125`.
- Après choix du logo, certaines productions secondaires de charte/guide/planche sont capturées avec `console.error` et le choix peut poursuivre. Références : `src/lib/logo-v2/choose.ts:138`, `157-158`. Aucun journal réel ne confirme ici leur échec : le constat porte sur le traitement prévu par le code.

**Conséquence :** l'annonce de succès d'une étape ne prouve pas que tous les résultats secondaires promis existent. Ne pas réintroduire un gabarit silencieux pour contourner le blocage publicitaire : les règles actuelles exigent une explication claire.

## 6. Ce qui fonctionne déjà et doit être conservé

**CONFIRMÉ DANS LE CODE**, avec tests ciblés pour plusieurs mécanismes :

- Versions et restaurations, originaux conservés, nouvelles lignées pour préserver les modifications du client.
- Mémoire, vocabulaire client, verrous de marque et refus mémorisés.
- Contrôles de propriété des projets/fichiers sur les routes examinées.
- Réservations atomiques, plafonds, rattachement budgétaire par projet et absence de passe-droit administrateur.
- Checkpoints, baux renouvelés, pauses, reprise et traitement prudent de certains appels payants incertains.
- Distinction des résultats finaux, provisoires et refusés, historique des contrôles et diagnostic des appels.
- Exclusion des médias refusés dans les mécanismes de réutilisation examinés : `src/lib/quality/usable.ts`.
- Pour les images, contrôle requis avant certaines générations et absence de validation finale en cas de panne de contrôle ; règles de présence humaine et références produit.
- Pour les logos, originaux fournisseurs conservés, correction ciblée du nom, variantes et vectorisation seulement si la fidélité est suffisante.
- Les relais qualité et propositions de secours logo sont explicitement voulus dans `CLAUDE.md`. Leur existence n'est pas un défaut ; leur statut doit rester honnête. Références : `src/lib/logo-v2/engine.ts:229-254`, `416-453`.
- Garde-fous factuels, placeholders, contrôles de promesses et relectures éditoriales/visuelles dans plusieurs moteurs.
- Compilation commune de l'aperçu et de l'export, empreinte, versionnement des exports et refus d'un export CMS rejeté.
- Bilinguisme et distinction entre un envoi à une plateforme et une vérification de son rendu final.

La politique de thème V2 maintient justement certains résultats locaux au niveau provisoire ; `src/lib/theme-v2/quality.ts:114-119` indique des dimensions non mesurées. Le problème est notamment que ces informations ne gouvernent pas suffisamment l'activation et l'annonce de réussite.

## 7. Tests exécutés et reproductions

### 7.1 Résultats consolidés

**REPRODUIT : 210 tests ciblés réussis dans 15 fichiers.** Onze tests du fichier de rendu vidéo n'ont pas été sélectionnés. La suite complète, le build de production et la campagne Theme Check complète n'ont pas été exécutés pendant cet audit.

| Groupe | Commande depuis la racine du dépôt | Résultat |
|---|---|---|
| Types | `./node_modules/.bin/tsc --noEmit --incremental false` | Code de sortie 0 |
| Budget, tâches, diagnostic | `./node_modules/.bin/vitest run tests/budget-ia.test.ts tests/jobs-calendar.test.ts tests/diagnostic-ia.test.ts` | 41 tests réussis |
| Vidéo, routage, sécurité IA | `./node_modules/.bin/vitest run tests/video-v2.test.ts tests/video-scenes.test.ts tests/routage-multifournisseur.test.ts tests/securite-ia.test.ts` | 64 tests réussis |
| Thèmes, SEO | `./node_modules/.bin/vitest run tests/theme-v2.test.ts tests/seo-v2-engine.test.ts tests/site-texte-seo.test.ts tests/seo-utilise.test.ts` | 34 tests réussis |
| Images, publicités, logos | `./node_modules/.bin/vitest run tests/image-v2.test.ts tests/ads-v2.test.ts tests/logo-v2-artwork.test.ts` | 70 tests réussis ; sortie JSON également conservée pendant l'audit |
| Rendu vidéo ciblé | `./node_modules/.bin/vitest run tests/video-v2-engine.test.ts -t 'vidéo publicitaire complète'` | 1 test réussi, 11 non sélectionnés |

Vitest crée un `DATA_DIR` temporaire et utilise `STOCK_OFFLINE=1`. Les tests concernés emploient des fournisseurs, réponses et évaluations simulés. Le test vidéo ciblé produit réellement un fichier avec `ffmpeg`, à partir de médias et avis simulés : il valide de la plomberie technique, pas une création IA professionnelle. Un premier lancement a été empêché par le bac à sable (`spawnSync ffmpeg EPERM`) ; le même test a ensuite réussi avec l'autorisation d'exécution locale appropriée. Il ne s'agit pas d'un défaut applicatif constaté.

Les suites publicitaires utilisent notamment des dépendances sans `finalAd` et couvrent alors une autre branche que le branchement de production. Les assertions existantes sur `finalAd` ne remplacent pas une vérification de toute sa livraison vers l'interface.

### 7.2 Reproductions supplémentaires

Les scripts de diagnostic ont été créés hors du dépôt, dans un répertoire de travail, et ne sont pas publiés avec ce rapport. Ils n'ont modifié aucun fichier applicatif. Ils utilisent des bases temporaires/dédiées, des fixtures synthétiques et des appels externes refusés ou remplacés au niveau des dépendances. Les résultats pertinents sont retranscrits ci-dessous pour rendre le rapport autonome.

| Probe | Résultat constaté | Nature et limite |
|---|---|---|
| Deux demandes SEO incompatibles | Demande exacte absente du prompt ; deuxième exécution réutilisée, un seul appel simulé | Vrai moteur, rédacteur simulé ; aucune qualité réelle évaluée |
| Corps commercial client synthétique | Présent dans l'overlay, absent du corps produit V2 | Transformation de contenu réelle |
| Document catalogue secondaire | Sélectionné pour le produit principal | Stockage et sélection réels, données synthétiques |
| Thème de services incomplet | `REJECTED`, `empty_section`, enregistré comme courant | Composition, contrôle et sauvegarde réels |
| Opération au même titre | Spécification identique, message « mis à jour » | Vraie fonction d'opérations |
| Six paires de demandes visuelles | Sujets/empreintes différents, prompts identiques | Construction de prompts réelle, aucune image payante |
| Palette et audience changées | Empreinte image inchangée | Test de clé, pas de rendu obsolète observé |
| CTA commercial | « Découvrir » devient « Commander » | Reconstruction aval réelle |
| Branche publicitaire `finalAd` | Un fichier image de test, zéro document éditable | Générateur simulé, vrai moteur/stockage |
| Revue avec logo remplacé | Acceptée avec note et autres critères suffisants | Revue simulée ; prouve l'invariant manquant |
| Disponibilité texte | Configuration fictive annoncée prête, tarifs bloquants | Aucun appel d'authentification |
| Réparation JSON | Champs absents remplis de vide, valeur inconnue remplacée | Vraie fonction `salvage` |
| Fin de tâche refusée | `done` / « Terminé » malgré refus et absence de livrable | Vraie fonction `completeJob` |
| Erreur de rédaction du plan vidéo | Repli local, erreur absente des notes retournées | Fournisseur et rendu simulés |

**Aucun appel fournisseur IA réel n'a été effectué.** Les journaux de tests ne sont pas des journaux de production.

## 8. Limites et vérifications encore nécessaires

### Accès ou preuves manquants

- Aucun journal de tâche client ou d'appel fournisseur en exploitation n'a été examiné.
- Aucune configuration réelle de fournisseurs ou de facturation de production n'a été validée.
- Aucun exemple client réel complet demande → fichier → export n'a été comparé.
- Aucune nouvelle création payante n'a été générée ni jugée visuellement.
- Aucun parcours navigateur connecté complet ordinateur/mobile n'a été exécuté.
- Aucune installation d'export dans une boutique ou un CMS réel n'a été faite.
- Aucune publication sociale, publicitaire ou autre intégration externe réelle n'a été déclenchée.

### Zones non examinées exhaustivement

Chaque section Liquid, tout le CSS/JavaScript, chaque route et chaque formulaire ; tous les imports de sites/thèmes ; toutes les intégrations CMS ; toutes les transitions de paiement et de facturation ; le calendrier et le pilote automatique de bout en bout ; toutes les banques de médias ; toutes les retouches d'images ; toutes les déclinaisons logo et la charte en rendu visuel ; la conformité de publication aux plateformes.

Les mécanismes communs d'accès/budget/tâches/export et les parcours représentatifs ont été lus et certains testés. Cela ne constitue ni un audit de sécurité exhaustif, ni une certification des intégrations, ni une validation artistique.

### Prochaine collecte utile, sans exposer de secrets

Sur des exemples autorisés, réunir l'identifiant de tâche, la date, l'action, la demande expurgée, la cible, le fournisseur/modèle demandé et servi, les statuts, codes d'erreur, verdicts, substitutions, identifiants de livrables et leurs versions. Comparer ensuite au résultat effectivement affiché/exporté. Ne pas publier ces journaux ou données client dans ce dépôt public.

La fréquence et le coût réel des défauts, ainsi que la causalité esthétique/commerciale, restent à établir avec ces preuves.

## 9. Première correction recommandée

### Objectif et périmètre

**Demande de texte → document SEO → thème → aperçu/export, avec un contrat traçable entre demande et livrable.** Ce premier lot traite F2, F4, F5 et la protection de livraison/activation de F1 sur ce parcours. Il ne demande pas de refondre tous les moteurs ni de changer de fournisseur.

Sous-lots proposés :

1. Conserver demande exacte, cible stable de page/produit/service, langue, contraintes et version du contexte. Les transmettre au rédacteur et à sa clé de réutilisation. Une consigne différente doit invalider la réutilisation lorsqu'elle change le résultat attendu.
2. Sélectionner le texte de référence par cette même cible. Préserver le corps commercial contrôlé ou édité par le client jusqu'au `ThemeSpec` et à l'export. Toute exclusion doit avoir une raison visible ; aucune affirmation non vérifiée ne doit être ajoutée pour remplir.
3. Distinguer fin technique et résultat métier sur ce parcours : livré, partiel, refusé, à vérifier, avec identifiants et preuves disponibles. Un refus qualité ne doit pas activer le thème courant ; conserver le brouillon pour diagnostic. Une opération identique ne doit pas annoncer une modification.
4. Tester l'adaptateur effectivement utilisé, avec l'appel externe simulé au dernier niveau, et vérifier la livraison jusqu'au contenu affichable/exportable. Un nouveau schéma abstrait seul ne suffit pas.

Le plus petit sous-lot causal est la conservation de demande et l'invalidation de la réutilisation SEO. Mais la première livraison vérifiée de bout en bout doit aussi empêcher la perte du corps et le mélange des cibles ; autrement un bon texte resterait mal livré.

### Critères de réussite

- Deux demandes de même intention mais de contraintes différentes donnent des briefs/prompts et décisions de réutilisation distincts.
- La même demande, la même cible et le même contexte restent réutilisables sans dépense supplémentaire.
- Chaque contrainte est respectée, déclarée non prise en charge ou laissée explicitement non vérifiée. Une mesure technique seule ne vaut pas satisfaction.
- Deux produits ou prestations ne partagent jamais le mauvais document de référence.
- Le corps édité/validé traverse document → `ThemeSpec` → aperçu → export, à transformations de format justifiées près.
- Un résultat refusé est conservé sans remplacer le résultat courant exploitable.
- Un livrable absent, une génération partielle ou une opération sans effet ne produit pas de message de réussite trompeur.
- Versions, restaurations, originaux, budgets, verrous et travail client restent protégés.

### Suites prioritaires après ce lot

Appliquer le même contrat aux prompts images et à leurs clés de réutilisation (F3/F9), puis à l'intégration publicité → fichier/document → galerie/éditeur et aux textes exacts (F6/F7/F11). Harmoniser ensuite disponibilité réelle, replis et statuts des autres parcours. Ne pas supprimer les secours logo explicitement convenus ni réintroduire des substitutions silencieuses.

## 10. Validation sur des métiers variés et des cas inédits

Pendant le développement, utiliser par exemple : pièce automobile avec compatibilités, infusion avec allergènes, meuble sur mesure, restaurant, photographe et service de traduction. Les fiches sont synthétiques et les contraintes viennent des besoins du scénario, pas de son nom.

Après gel de la correction, faire préparer par une autre personne des cas non utilisés par les développeurs : fournitures de laboratoire, entretien de toiture et cours de musique à distance, par exemple. **Ces cas ne doivent pas être intégrés aux règles du moteur pour faire passer l'évaluation.**

Pour chaque cas :

- Français et anglais ; données riches, pauvres et contradictoires.
- Texte exact, longueur, ton, interdits, faits, CTA et cible.
- Plusieurs produits ou prestations dans un même projet.
- Modification d'une seule contrainte, d'un fait, du vocabulaire, de la palette ou de la cible.
- Fournisseur indisponible, contrôle indisponible, refus qualité, plafond atteint et résultat partiel, d'abord simulés.
- Contenu client déjà édité, versions et restauration.
- Cohérence de la livraison entre document, aperçu et export ; contrôle ordinateur/mobile.

Mesurer séparément : conservation des exigences, bon ciblage, complétude livrée, honnêteté du statut, réutilisation correcte, absence d'invention, lisibilité et qualité commerciale. Les critères factuels se testent automatiquement ; la qualité de rédaction et de composition demande aussi une relecture humaine, idéalement sans connaître le moteur utilisé.

Renommer ou dupliquer les projets doit laisser les règles et les résultats attendus identiques. **Aucune règle ne dépend du nom d'un projet de démonstration.** Les essais IA réels feront l'objet d'un devis, d'un budget et d'une autorisation séparés ; ils ne sont pas autorisés par la seule publication de cet audit.

## 11. Synthèse pour le propriétaire

Le studio possède déjà des bases utiles à préserver. Plusieurs défauts sont démontrés dans les raccordements internes : votre demande peut disparaître, un bon texte peut être raccourci avant d'apparaître et « Terminé » peut simplement signifier que le traitement s'est arrêté.

La première étape conseillée est de fiabiliser les textes jusqu'au site livré, puis d'appliquer cette méthode aux images et publicités. La connexion réelle aux fournisseurs et la qualité professionnelle des créations restent à vérifier avec des preuves adaptées.

**Ce rapport est documentaire. Aucune correction du studio n'est commencée ; validation du propriétaire requise avant leur démarrage.**
