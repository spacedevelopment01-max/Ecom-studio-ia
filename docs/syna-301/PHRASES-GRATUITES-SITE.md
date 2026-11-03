# Contrat borné : couleurs, FAQ et annulation natives

Parent requis :759a2e34 (correctif CI #356). Même fil SYNA, même localFirst, applyOps, versions natives et reçus. Aucun moteur IA, devis payant ou stockage parallèle.

## Phrases prouvées

- Mets le titre de cette section en rouge : proposition color. Le moteur expose explicitement une alternative : la couleur principale des textes de la section, pas le titre seul. Certains boutons utilisent aussi cette couleur principale. Les valeurs d’accent, de texte secondaire et de texte sur accent sont conservées ; cela ne promet pas que tous les boutons restent visuellement identiques. Le message et le diff détaillent les couleurs effectives avant/après. Aucun autre schéma partagé/section ne doit changer ; sinon clarification gratuite.
- Mets le fond de cette section en bleu : proposition color ; contraste corrigé par le moteur natif inclus dans les valeurs avant/après.
- Change la couleur principale du site en #1e3a8a : clarification gratuite, aucune opération de section présentée comme globale.
- Ajoute une section FAQ après cette section : proposition faq ; bibliothèque compatible native, ID/ordre/blocs natifs déterministes, contenu de départ à compléter affiché. Aucun contenu inventé.
- Annule la dernière retouche du site : proposition undo liée au dernier reçu encore courant. Reçus B1 de la conversation et reçus D2 livrés du moteur theme.edit restent deux stores/identités distincts. La prévisualisation et les gardes de restauration D2 sont réutilisées : versions, médias, qualité, empreinte et version courante relus. Une modification manuelle plus récente, un reçu absent ou une version altérée ferme l’action.

## Transport pour Claude

La réponse reste localSite (schema syna-local-site-1), command title/move/color/faq/undo. state proposed/ambiguous/error/applied ; scope natif, diff.before/after, proposalId, confirmationRequired. Les valeurs couleur/FAQ sont des chaînes lisibles JSON, pas des objets affichés [object Object]. Aucun changement avant accord.

Confirmation inchangée : action confirm-local, proposalId, confirmation:true, revision, projectRevision, requestId. Résultat natif relu : version.id/number/parentId/fingerprint, receiptId, previewHref. Une réponse perdue rejoue exactement la même confirmation et son requestId.

Annulation de proposition : action cancel-local, proposalId, revision, projectRevision, requestId. Elle conserve la sélection A2 et ne touche aucune version. Cette annulation ne restaure pas un résultat déjà enregistré ; la phrase undo prépare une autre proposition à confirmer.

Pour undo, sourceReceiptId désigne le vrai reçu source ; la navigation A2 antérieure à notre propre retouche peut naturellement être périmée. Le garde d’annulation vérifie le reçu/les versions, et la carte n’exige pas une redésignation artificielle. Un changement explicite de cible annule toujours la proposition via A2. Les autres opérations conservent leur sélection/version A2 obligatoire.

## Vérification et limites

Cinq sondes rouges sur le parent, corrigées.97 tests/6 suites PASS :12 nouveaux cas, B1, contrôleur gratuit, anciens projets, verrou global et D2/annulation acquis. Fournisseur et réseau interdits ; aucun achat/job IA. Tests du budget0, schéma privé partagé, titre contenant un mot de couleur, conflit, annulation, altération, reçu D2 réel et réponses perdues FAQ/undo inclus. TypeScript/diff-check rapportés au commit publié.

Recette navigateur et CI finale de convergence à qualifier séparément, pas anticipées par ces tests. Fiche couleur globale, mise en forme d’un titre seul sans adresse DOM fiable, suppression/masquage, thème, pages, SEO, RDV, catalogue et autres P1/P2 restent au backlog. Composition globale et annulation d’une annulation ne sont pas prises pour une simple retouche D2. Aucun appel fournisseur réel, merge main, déploiement ou activation.
