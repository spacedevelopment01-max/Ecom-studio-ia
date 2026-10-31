# #211 — D6 : connaissance du Studio et limites observées

État : **recette isolée terminée ; livraison pour revue dans #224**. Branche `codex/211-lot-d6-etat-capacites`, code applicatif qualifié `ba023565684767a079ded15f852cc2c8aefc5595`, dernier harnais `012c989fc32fc647dbb5f46bc50dbc4c600483cb`, parent D5 #223 livré `dc23f69dbbf9f7b0513fff5d78ebcbf8db2382b6`. Complément 6476774872 ; E4 #222 sœur à conserver. Aucun merge/activation ni appel fournisseur réel.

## Parcours et fonctionnement

Un relevé natif autorisé accompagne le message dans la même mémoire versionnée. Il reste daté **avant** sa réflexion : le budget peut évoluer ensuite. Le GET propose un état actualisé dans un guide repliable ; cette actualisation ne génère pas de réponse IA. Les états natifs ne deviennent pas des affirmations commerciales confirmées par le client.

Sources : propriétaire et projet, préparation et version courante, droits du forfait réellement rattaché, jauges `aiUsage` et `balance`, catalogue natif (archives incluses), médias et huit dernières tâches avec périmètre explicite. Une table de catalogue jamais initialisée reste inconnue. Configuration fournisseur ≠ authentification ni disponibilité vérifiée ; résultat JSON/job terminé ≠ livraison vérifiée.

Les codes fermés documentés expliquent les refus de rédaction, conflits de contexte, plafond de tâche et incompatibilité de références. Aucun classement par mot « budget », aucun texte d’erreur privé transmis. Une cause inconnue reste inconnue ; pas de nouvelle génération ou reprise automatique. Une tâche terminée ne conserve pas un ancien motif d’échec comme diagnostic courant.

Les enveloppes restent séparées : forfait non consommé, crédits non consommés, maximum temporairement réservé sur la base native du devis. Une réserve n’est pas une dépense ; un reste non consommé ne garantit pas la disponibilité d’un nouvel appel. Les pourcentages sont ceux de la jauge native (0–100), pas des fractions envoyées au formateur. Aucun montant monétaire client, changement de plafond ou nouveau calcul de facturation.

Le motif exact du verrou natif de fiche est fourni sans déduire une interdiction de toutes les opérations Site/médias. Les droits, devis et contrôles de chaque outil restent autoritaires.

## Couverture honnête

Le [tableau de couverture](211_D6_COUVERTURE.md) et le catalogue versionné énumèrent **48 opérations explicites**, pas tous les contrôles du Studio. Sept familles disposent d’adaptateurs hérités : fiche, analyse, recherche, retouche exacte/annulation, composition native, export et capture de rendu. Les autres restent explicitement absentes du chat, avec un lien vers leur espace. Ce lien ne prouve pas que l’opération y est disponible pour le projet ; cela reste à vérifier dans le parcours natif. Le mode Site original est explicitement non implémenté, y compris dans cet état de disponibilité. Les opérations sensibles ne sont pas raccordées. Un drapeau ouvert n’est ni un droit ni une preuve de fournisseur utilisable.

L’inventaire de 93 fichiers JSX / 1 283 contrôles / 315 appels API est une recherche syntaxique extérieure à l’application ; il ne prouve pas leur couverture sémantique. Le raccordement exhaustif reste à réaliser. Comparaisons et décisions entre 2–5 propositions, autres objets actifs, identité/logo/média/vidéo/catalogue/RDV/publications/campagnes et composition originale restent à compléter.

## Fichiers

- `studio-observation.ts`, `studio-operations.ts`, `studio-failure-knowledge.ts` : lecture autorisée et bornée, catalogue, causes documentées.
- `contract.ts`, `index.ts`, `intelligence-context.ts` : mémoire commune, état fixé au message, sources/version et règles de non-invention. Le catalogue complet n’est pas recopié dans chaque tour enregistré.
- `conversation-studio-help.tsx`, `conversation-panel.tsx` : guide accessible, jauges séparées, tâches, limites et liens conservant la même conversation.
- `conversation211-studio-knowledge.test.ts`, `verify-agent211-knowledge-ui.ts`, `verify-agent211-build.ts` : tests isolés et recette compilée, sans réseau fournisseur réel.

## Vérifications du gel final

**3 724 tests réussis / 45 ignorés**, 430 fichiers réussis / un ignoré, 760,00 s ; 57 ciblés natifs et deux régressions de signature réussis. Types et build propre final réussis. Le parent D5 livré a ensuite été repris en conservant les empreintes de tous les fichiers applicatifs et tests unitaires ; seul le harnais autonome a été combiné, puis retypé. Recette navigateur finale réussie sur le build propre **`012c989fc32fc647dbb5f46bc50dbc4c600483cb`** : produit multi 1 440 px et service 390 px, 15 PNG originaux et deux vidéos MP4. Les hypothèses et conseils du fournisseur restent simulés. Les contrôles intermédiaires sont distingués de la version finale dans les traces ci-dessous. Une sortie prédéfinie du faux fournisseur vérifie le transport, pas l’intelligence du modèle, la qualité de conseil ou la création professionnelle.

Zéro fournisseur réel / coût réel nul. Aucun projet client, VANS étape 1, Contretemps, composition de Claude, média réel, forfait ou budget modifié. Aucun déploiement, nouvelle connexion, envoi, paiement ou publication client.

## Échec de qualification reproduit : signature de clé dans un identifiant natif

La suite `D6-full-index-final` a échoué sur un contrôle de stockage vidéo ; cet échec n’est pas déclaré réussi. L’analyse du document fictif a trouvé le seul faux positif dans `audio.voice.2.assetId` : identifiant natif de 16 caractères entièrement minuscules, empreinte du fragment `9dfc1f9f2169732a`. Le préfixe Google est sensible à la casse ; le `/i` appliqué à toute l’alternative le confondait avec cet identifiant. La fabrique native `id()` utilise les chiffres et lettres minuscules. Aucun secret réel n’est utilisé dans cette recette.

Correction du test uniquement dans `tests/video-v2-engine.test.ts` : signatures canoniques sensibles à la casse, noms de champs secrets toujours détectés sans distinction de casse. Aucun moteur ni filtre applicatif assoupli. Deux tests déterministes : le faux positif échoue avant correction puis passe, et les signatures canoniques/champs secrets restent détectés. Le contrôle documentaire, les contrôles de prompts et tous les autres tests vidéo sont conservés. Le nouveau complet corrigé est réussi : 3 724 / 45 ignorés. La suite précédente en échec reste signalée et son diagnostic anonymisé et la reproduction rouge/verte sont joints aux preuves.

## Recette navigateur et périmètre de l’échec historique

Le premier produit a passé la recette ; la préparation du service a été refusée par le garde natif exigeant un angle autorisé avant une communication. Ce refus n’a pas été désactivé. La fixture destinée à lire un historique insère maintenant directement une tâche **déjà échouée**, dans la base temporaire : aucun état exécutable, soumission native de génération ou appel image. Cela ne qualifie pas un vrai parcours de génération d’image ni l’incident d’un client. Le détail de cette tâche et sa cause fermée sont ouverts dans le navigateur ; la disponibilité du mode Site original est également montrée.

Après intégration du parent D5 livré et corrections de fixture/lecture, les fichiers applicatifs et tests unitaires restent identiques au code ba023565 couvert par le complet réussi. Les scripts autonomes ont leurs types et leur recette propres ; le build propre final et sa recette complète sont réussis sur 012c989f. Ces modifications de harnais ne sont pas présentées comme exécutées par Vitest.

## Commandes, traces et coût complet

- `npx vitest run` : **3 724 réussis / 45 ignorés**, 430 fichiers réussis / un ignoré, 760,00 s, toutes les empreintes gelées inchangées à la fin du complet corrigé. L’ancien complet en échec ne compte pas comme succès.
- `npx vitest run tests/conversation211-studio-knowledge.test.ts tests/conversation211-active-context.test.ts tests/conversation211-intelligence.test.ts` : 57 réussis. Deux régressions de signature de clé séparées, une rouge avant correction puis deux vertes ; les douze autres tests vidéo ne sont pas exécutés dans ce ciblé mais sont tous conservés dans le complet.
- `npx tsc --noEmit`, `NEXT_TELEMETRY_DISABLED=1 npm run build`, `npx tsx scripts/verify-agent211-build.ts <dossier-isolé> --knowledge-ui` réellement exécutés. Chromium système, worker/Brain/routeur/SDK natifs vers faux HTTP loopback ; aucun fournisseur réel.
- Le navigateur vérifie le vrai plan, les deux lignes natives du catalogue produit, le code d’échec historique et sa cause, l’absence du mode Site original, le devis/accord distincts, les sources reçues dans le SDK, l’actualisation gratuite, le lien natif gardant la conversation, l’accès étranger 404, aucune erreur JavaScript et aucun débordement horizontal. La tâche image de la fixture n’est jamais exécutée ; aucune création Site/média automatique.
- **Cinq générations simulées**, cinq usages connus = **39 560 micro fictifs** : trois contrôles de base + deux réponses D6, **7 912 micro fictifs chacune**. Relevés, actualisation et navigation n’ajoutent aucun appel. **0 fournisseur réel / coût réel nul** ; pas de vérification de facture fournisseur.
- Les derniers commits changent uniquement les harnais, depuis le code applicatif qualifié ba023565. Les empreintes applicatives et tests unitaires sont conservées après reprise du parent D5 livré. Les harnais autonomes ne sont pas collectés par Vitest : types et recette compilée les vérifient séparément, puis le build propre final est rejoué.

[Galerie et vidéos](preuves-211-D6/README.md) · [Traces et mesures](preuves-211-D6/verifications.json) · [Empreintes](preuves-211-D6/empreintes.json) · [Faux positif vidéo reproduit](preuves-211-D6/diagnostic-test-video.json) · [Couverture par opération](211_D6_COUVERTURE.md). Les tailles/SHA distants et des retéléchargements doivent être contrôlés avant l’annonce de publication.

## Limites précises et suite

Les 48 opérations et leurs chemins natifs sont explicitement **partiels**, pas une couverture de 1 283 contrôles. La connaissance n’ingère pas encore toute la documentation. Métadonnées/comptages, huit tâches récentes avec total indiqué ; aucun texte intégral d’artefact, vision, authentification, contrôle d’un rendu ou livraison vérifiés par ce relevé. Les valeurs de configuration des modèles sont omises seulement des JSON publiés ; leur transport natif et l’absence de message privé sont contrôlés dans la recette.

Une observation mémorisée reste celle du message, avant son appel : l’actualisation du guide n’autorise pas à affirmer un solde historique ni à convertir un job terminé en résultat accepté. Les tables paresseuses inconnues restent inconnues, les archives du catalogue sont comprises dans son nombre. Les cas de reprisage/vitraux et les fixtures unitaires sont des cas nouveaux pour cette tranche, pas une qualification aveugle ni créative d’un modèle réel. Locale navigateur FR ; aucun CMS, fournisseur réel, instance client ou validation propriétaire testés.

D7 doit encore raccorder la comparaison et les préférences exactes/versionnées ; autres opérations natives, composition originale, copywriting/vision qualifiés et finitions F2 restent ouverts. L’en-tête Images comprimé avec SYNA reste signalé dans D5. Les contrôles lexicaux natifs refusant certaines consignes négatives, déjà signalés en D4, ne sont pas corrigés par ce relevé d’état. **#211 n’est pas terminé.** Aucun merge, activation ou déploiement n’est demandé/présumé par cette livraison.
