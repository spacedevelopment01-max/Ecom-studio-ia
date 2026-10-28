# #211 — D5 : repère actif entre l’éditeur et SYNA

**Incrément ciblé du complément 6476774872.** Branche `codex/211-lot-d5-contexte-actif`, base #221 `f04982b0362ab76aa1d8d520efc3fd2302344700`. E4 (#222) est indépendant : il devra être conservé dans une intégration ultérieure. Aucun merge ni activation.

## Résultat et périmètre réel

Le message peut conserver le bon onglet et une référence native exacte : page du Site, section/bloc ou média/version de la bibliothèque. Ce repère reste dans **la même conversation** ; il ne devient ni une caractéristique marketing ni une autorisation de génération. La réponse passe toujours par devis/accord et le routeur natif ; l’application reste une autre opération, confirmée et prouvée par ses versions/reçus.

Les nouvelles fonctions restent fermées par défaut : `STUDIO_CONVERSATION_CONTEXT=1` dépend des drapeaux Conversation et IA. Aucun changement de la configuration de l’instance client.

## Fichiers et causes traitées

- `active-context-contract.ts` : contrat strict des dix-sept onglets et trois familles de références. Aucun rôle, coût accepté, opération ou permission dans ce contrat.
- `active-context.ts` : résolution par les tables et fonctions existantes (`themeVersion`, `currentTheme`, `containerOf`, `routeFor`, `themeTargetPaths`, `assets`). Média du seul propriétaire/projet/version, non supprimé/refusé ; section/bloc existant, non masqué, ordonné et lié à un modèle réellement rendu. URL étrangère ou page inventée refusée. Le comportement des blocs sans ordre explicite suit le renderer : clés des blocs, sans les bloquer arbitrairement.
- `contract.ts`, `index.ts` : repère validé atomiquement avec le message, concurrence/idempotence et droits existants conservés ; pas de nouvelle base ni conversation. Le GET relit les références sauvegardées. Fiche validée, Site, choix et médias ne sont pas remplacés par une désignation.
- `intelligence-context.ts`, `intelligence.ts` : même contexte cognitif, référence et version ; une cible historique reste historique. Une proposition d’action Site ne peut pas substituer silencieusement une cible courante à une référence devenue ancienne/absente. La connaissance interne reçoit une source explicite pour ce périmètre et une empreinte de version ; cela ne constitue pas encore une connaissance exhaustive du Studio.
- `agent-ui-context.tsx`, `tab-boutique.tsx`, `tab-images.tsx`, `conversation-panel.tsx` : partage de la désignation manuelle, onglet courant au prochain message, retrait explicite, référence sauvegardée reprenable après rechargement. Une cible d’un autre onglet/projet n’est pas envoyée. La désignation native dans l’aperçu transmet section/bloc ; elle ne prétend pas identifier à elle seule un champ ou pixel exact. L’onglet Images transmet la version du fichier ouvert. Aucun nouveau moteur d’édition.
- `tests/conversation211-active-context.test.ts` : références réelles de recette, isolation, conservation, versions historiques, refus avant mutation, fermeture des drapeaux, absence d’effet/payement et garde native du worker.
- `scripts/verify-agent211-build.ts`, `verify-agent211-context-ui.ts` : parcours de recette du Studio compilé, SDK/worker natifs vers HTTP local simulé. Aucun envoi externe.

## Niveau de preuve par opération

| Opération | Niveau de preuve | Limite |
|---|---|---|
| Repère d’onglet | Implémenté, testé isolé | Navigation transmise avec le prochain message ; pas une connaissance de tous ses boutons |
| Désigner page/section/bloc du Site | Implémenté, testé isolé | Métadonnées exactes ; ni lecture intégrale ni analyse visuelle par ce repère |
| Désigner un média depuis Images | Implémenté, testé isolé | ID/version et métadonnées ; aucune vision, retouche IA ou évaluation esthétique |
| Sauvegarde et reprise du repère | Implémenté, testé isolé | Référence sauvegardée proposée explicitement après rechargement |
| Cible ancienne/absente, mauvais projet | Testé isolé | Pas de substitution à la version actuelle ; clarifier/redésigner |
| Retouche exacte et annulation | Testé dans le navigateur isolé, SDK/worker simulés | Consentement natif distinct, texte exact seulement |
| Comparer 2–5 logos/images/angles et retenir un choix versionné | Absent de D5 | Raccordement dédié encore à développer |
| Catalogue/variantes, RDV, campagnes, calendrier, autres objets actifs | Pas raccordés à ce repère | Leurs écrans manuels restent disponibles |
| Fournisseur réel, instance client, validation propriétaire | Non vérifié | Aucun accord supplémentaire présumé |

## Vérifications

Build final propre effectivement servi : **`03f376f041fb46d432f10498e593f14e684a7d88`**. Le code applicatif et les tests unitaires sont identiques au parent `927c15bd7e1f9a607f415267a50d1dd08310cd41` ; le dernier commit ajoute seulement les corrections du harnais. Dernière suite complète sur les corrections de mise en page : **3 706 réussis / 45 ignorés**, 429 fichiers réussis / un ignoré, 1 237,78 s. Types et build final réussis. Le harnais complet, corrigé pour les titres natifs et l’ancien aperçu réduit, passe : trois cas, deux contrôles de parcours manuel fermé et types. Recette finale réussie sur ce build propre. Les modifications de harnais ne changent ni l’application ni les tests unitaires.

### Défauts reproduits et corrections

- La désignation ouvrait initialement la Discussion manuelle en plus du panneau SYNA : le Site restait trop étroit. Avec le drapeau de contexte, elle garde désormais l’Aperçu et ouvre une seule conversation ; drapeau fermé, le parcours manuel conserve son comportement.
- L’URL native de l’aperçu contient `<version>~<signature>`. La nouvelle garde de chargement comparait à tort le segment entier à l’ID ; test rouge reproduit, parser corrigé pour retirer la signature sans la conserver dans le repère. Aucune permission ou protection d’aperçu affaiblie.
- Une désignation pouvait être conservée lors du changement de page/version : elle est retirée et les messages d’un aperçu en vol refusés jusqu’au chargement exact. Le bouton Retirer enlève aussi le surlignage natif.
- La barre supérieure débordait de 13 px à 1 024 px ; les contrôles peuvent désormais passer à la ligne, sans masquer de commande. L’en-tête de la banque vidéo dépend de sa largeur disponible, évitant le titre comprimé en colonne.
- Les échecs initiaux du harnais sont conservés comme échecs : dépendance vidéo locale absente, détails d’outils fermés, URL de requête relative, image de rôle `hero` volontairement hors banque, schémas différents de titre, attente prématurée avant chargement des onglets, coordonnées Playwright erronées dans l’ancien iframe CSS réduit. La trace a montré un clic réel dans le document parent ; le harnais utilise désormais un vrai clic aux coordonnées visibles de l’iframe. Aucun événement `selected` forgé. Une image neutre distincte de rôle `original` est ajoutée uniquement à la fixture ; aucun filtre de bibliothèque ni schéma natif assoupli. La retouche d’un titre complet respecte les deux champs natifs (lignes ou titre/accent), La section service utilise `heading` et `heading_accent` ; les références de blocs sont couvertes par les tests unitaires, sans les assimiler à cette désignation de section dans le navigateur.
- Une exécution complète interrompue volontairement n’est pas comptée comme réussie ; les recettes stoppées sur assertion ne constituent pas des livraisons validées.

La recette distingue produit mono, plusieurs produits et service ; les fixtures sont synthétiques, les illustrations sont des diagrammes techniques explicitement signalés ; la banque reçoit un aplat neutre de recette séparé, sans texte/personne. Les tests unitaires utilisent notamment une activité de restauration de meubles différente de l’entretien d’instruments de la fixture Site. La cartographie du parcours navigateur est une autre activité ; sa fixture existait déjà dans E2, elle n’est pas présentée comme une nouvelle qualification globale du Studio.

## Preuves finales et commandes

- [Galerie des captures originales et vidéos](preuves-211-D5/README.md) ; [vérifications et traces](preuves-211-D5/verifications.json) ; [empreintes des artefacts](preuves-211-D5/empreintes.json).
- `npx tsc --noEmit` ; `npx vitest run` ; `NEXT_TELEMETRY_DISABLED=1 npm run build` ; `npx tsx scripts/verify-agent211-build.ts <dossier-isolé> --context-ui` réellement exécutés. Chromium système, réseau externe refusé dans le navigateur et les processus du harnais ; seuls les appels HTTP loopback du faux fournisseur sont autorisés.
- **32 PNG originaux de recette + un PNG du débordement avant correction**, neuf planches de navigation réduites et trois MP4. Les planches ne remplacent pas les originaux. Conversion sans coupe/accélération, dimensions, durée et nombre d’images comparés aux WebM.
- Trois parcours : produit mono 1 440 px, plusieurs produits 1 024 px, service 390 px. Retouche V2 puis annulation V3, comparaison complète du ThemeSpec (aucun autre champ modifié), vrai titre rendu, repère de média retenu dans l’historique natif, reprise explicite et nouvelle navigation sans ancienne cible. Deux recettes manuelles avec drapeaux fermés. Aucun débordement horizontal ni erreur JavaScript dans les trois cas.
- Six générations HTTP **simulées**, six usages connus : **47 472 micro fictifs**. Trois appels concernent les cas D5, **7 912 chacun** ; trois autres appartiennent au contrôle de base produit/service/refus. Application et annulation natives gratuites, aucune génération lors de la désignation, du retrait, de la reprise ou du choix manuel. **0 fournisseur réel / coût réel nul.**
- La suite complète collecte `tests/**/*.test.ts`, pas les scripts autonomes du navigateur. Ceux-ci ont été affinés pendant cette exécution ; son indicateur brut `sourceUnchanged=false` est conservé dans la preuve. Aucun fichier applicatif ou test unitaire n’a changé : comparaison Git au parent 927c15bd sans écart dans `src/`, `tests/`, `.github/`. Le harnais final possède sa recette complète réussie et son contrôle de types séparés, puis le build propre final a été rejoué. Cela ne présente pas Vitest comme l’exécution de ce harnais.
- Tous les échecs intermédiaires et les exécutions interrompues restent distingués du résultat final. La qualité graphique/IA réelle n’est pas qualifiée par ces résultats.

## Ce que ce lot ne prouve pas

`contentRead=false` signifie que **ce repère** n’a pas lu le texte complet ni inspecté l’image. Le modèle peut disposer d’autres champs explicitement fournis par les outils natifs ; aucun accès visuel n’est déduit des métadonnées. Les réponses et choix du fournisseur sont simulés : pas de preuve de compréhension réelle de « cette section », ni de créativité, persuasion ou qualité graphique. Une référence exacte et un transport réussi ne suffisent pas à qualifier un compagnon expert.

La banque Images garde un en-tête comprimé avec SYNA sur certaines largeurs : finition F2 ouverte, visible dans les preuves. Les alertes de moteur image non configuré appartiennent à l’instance fictive isolée ; aucun diagnostic d’authentification du Studio client n’en est déduit.

La connaissance générale, les explications de chaque erreur/budget/forfait, la comparaison visuelle de propositions, les autres objets et la couverture exhaustive par contrôle restent à étendre. Un inventaire de sources seul n’est pas une capacité raccordée ; tous les boutons du Studio ne sont pas déclarés couverts par ces trois familles de repères.

Préservation : moteurs, mémoire, Brain/Planner/worker, forfaits, budget et versions natifs ; aucune composition de Claude, donnée client, VANS étape 1 ou Contretemps modifiée. Aucun fournisseur réel, nouveau service, coût réel, merge, déploiement, publication, activation ou redémarrage client.
