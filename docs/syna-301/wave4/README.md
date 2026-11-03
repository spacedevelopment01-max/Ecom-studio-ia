# SYNA #301 — lot borné, preuves textuelles

Consigne : commentaire6605791977 de #301 ; demandes et preuves Claude #358. Rapport de collecte avant verdict final : la CI ci-dessous est encore en cours. Les résultats locaux ne sont pas présentés comme son résultat.

## Livraison reviewable

| Lot | PR | SHA exact |
|---|---|---|
| Verrou réel des cinq cartes, assertion CI corrigée | #356 | 759a2e34c21bc203e87e77461d3a701093ec1595 |
| Phrases natives Site et portée exacte des couleurs | #359 | 75e2faafc6f5427dcd678e3dfeca543d3229f7be |
| Effets géométriques publicitaires annoncés | #360 | e4aa91b9c3723dc3a347d08647ff2b70a7beb298 |
| Rendu natif des couleurs privées | #362 | 0c6fdbedf94567e8ed20c8502852e9c52f2b2ea0 |
| Convergence figée, recette obligatoire | #361 | 121888359a04c252e100530f6764d3d40bc9214a |

Arbre final81c007dee7afd75b832e3cffb5183bb3cd3643a9. Tous les SHA des quatre lots et #348e2d8c8ed sont de vrais ancêtres vérifiés. Aucun développement acquis refait ni branche Claude modifiée. Les deux contrats sont docs/syna-301/PHRASES-GRATUITES-SITE.md et PUBLICITES-V2-EFFETS-NATIFS.md sur la tête finale.

## Causes corrigées

- #356 : le verrou applicatif était complet ; le test imposait un ancien ordre textuel. Il évalue désormais l'expression TSX réelle par AST, chaque contrôleur occupé (services compris), la tâche publicitaire en attente et les cinq cartes. Les tests HTTP concurrents restent actifs.
- Site : localFirst, applyOps, versions CAS et reçus natifs réutilisés. Pas de moteur parallèle. cancel-local révoque seulement la proposition. Undo réutilise les gardes D2 (version courante, contenu, médias, empreintes) et le vrai reçu B1 ou D2 ; une modification manuelle plus récente n'est pas effacée.
- V2 : l'ancien adaptateur refusait tout mouvement d'un autre calque. Le moteur natif reste inchangé. Les y des sous-titres/textes/boutons autorisés sont listés et montrés avant accord gratuit ; images/textes/marque/ordre/autres propriétés conservés. Les empreintes des effets annoncés, du document source et du résultat sont contrôlées avec le CAS. Calque protégé ou résultat impossible : alternative gratuite explicite.
- Rendu couleur : la variable et le schéma étaient enregistrés mais theme.css ne peignait que color-scheme-*, pas color-es-*. Une ligne étend la règle native de fond/texte. Même fichier dans l'aperçu et le thème exporté. Le navigateur reproduit le fond transparent puis mesure le vrai bleu et le texte blanc après correction ; les autres sections restent identiques.

## Phrases et portée vérifiée

| Phrase | Résultat borné |
|---|---|
| Mets le titre de cette section en rouge | Alternative annoncée : couleur principale des textes de la section, utilisée aussi par certains boutons. Le titre seul n'est pas ciblé ; valeurs accent/muted/accent_text conservées, sans promettre des boutons visuellement inchangés. |
| Mets le fond de cette section en bleu | Fond de la section désignée ; correction native de contraste du texte incluse dans le diff. |
| Change la couleur principale du site en #1e3a8a | Clarification gratuite ; aucune couleur de section annoncée comme globale. |
| Ajoute une section FAQ après cette section | Insertion de la bibliothèque native à cette position ; contenu de départ à compléter, pas de rédaction IA. |
| Annule la dernière retouche du site | Proposition liée au dernier reçu B1/D2 encore courant, accord distinct puis restauration dans une nouvelle version. |
| Agrandis le titre de la création sélectionnée | Agrandissement et déplacements secondaires annoncés ; deux JPEG exacts puis accord gratuit et reçu natif. |

Même chaîne : proposition → avant/après → accord explicite gratuit → écriture native avec version/conflit → relecture et reçu. Aucun devis fournisseur automatique pour ces demandes locales ; budget IA0 testé. Les schémas partagés touchant une autre section sont refusés.

## Preuves locales et limites de provenance

- 11/11 ciblés verrou/services.97/97 Site sur six suites à la première livraison, puis12/12 sur la précision finale des effets de couleur.44/44 publicitaires sur trois suites. Ces batteries se recouvrent : pas de somme présentée comme couverture indépendante.
-18 documents V2 bruts : count3,6feed+3story+9combinés. Parent18/18 refus422 ; correctif18/18 propositions200 puis vraie tâche locale, version/reçu relus, images identiques et retry sans nouvelle version. Les dépendances fournisseur sont injectées et synthétiques. Le JSON ads18-first-green-summary est explicitement la première sonde verte, antérieure au garde supplémentaire sur calque verrouillé ; la batterie44/44 et la suite finale couvrent ensuite ce garde.
-8/8 parcours navigateur de préqualification : Site et publicité, Encre/Plein,1440/390. Application compilée98721ace58090eddfaa46e78f14040c7873b024f, propre, API/version vérifiée. Recette ce932c09fd15408d373ccda534d018b615a15864611a01a47695cfb3d2192fdc. Fond réel rgb(29,78,216), texte blanc, titre principal rouge rgb(180,35,24), FAQ après la section, undo reçu, annulation sans écriture, accord après17s, réponse perdue/retry identique, recharge et PNG publicitaire.
- Le code livré12188835 précise encore le message sur les boutons et inclut le harnais qualifié ; SHA256 de sa recette95a3fdbc93ed8249c62f42fa32bbea3fde4373c91050067e4d0952bd737675c3. Le quatrième contrôle CI rejoue les8cas sur son build exact. Attendre son artefact avant de confondre préqualification et preuve finale.
- A2 native préselectionnée par fixtures puis reprise par bouton réel du Studio. Cette recette ne revendique pas la désignation par clic dans l'éditeur : elle complète la recette indépendante de Claude.
- Un exemple publicitaire en UI par configuration (4) complète18 documents côté HTTP/moteur. Aucune affirmation de qualité créative ou d'absence de tout chevauchement visuel sur toutes les créations.

Passes insuffisantes conservées et non comptées : claimNext avant la réponse HTTP de confirmation ; image non encore décodée ; contrôle de --c-bg sans contrôle de peinture ; tentative de revalidation après recharge/message global ayant retiré la cible. Harnais corrigé sans affaiblir les gardes. Le JSON de préqualification original conserve ses champs ; la conservation d'accent y désigne les réglages, pas une promesse de conservation visuelle de tous les descendants.

## CI à relever avant verdict

- #356759a2e34 : https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41650826363 — types et5353tests PASS,31ignorés ; Docker et confirmation gratuits PASS ; recettes natives encore en cours à la collecte.
- #36112188835 : https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41659593159 — en cours à la collecte. Les quatre contrôles et leur verdict global doivent tous réussir. Aucun contrôle supprimé, ignoré ou transformé en succès conditionnel.

## Coordination et limites

Contrats/commits transmis dans #358, notamment commentaires6606337064,6606562544,6606878398,6607007009 et6607245596. L'intégration des interfaces de Claude n'est pas incluse ici. Les16phrases et la matrice84 doivent être réconciliées sur son assemblage avec le périmètre de chaque preuve ; aucune promotion globale en SYNA complète.

Pas de couleur globale, de titre seul sans adresse native fiable, d'annulation universelle ni d'annulation d'annulation. FAQ non rédigée par IA. Les autres P1/P2 restent au backlog ; aucun autre lot engagé. Fournisseurs réels non testés.

Réseau fournisseur interdit, clés réelles absentes, comptes et projets fictifs isolés. Aucun projet client modifié, dépense réelle, fusion main, déploiement ou activation. Captures et traces locales conservées hors publication conformément au commentaire6605803273. Seules les preuves textuelles sont publiées.
