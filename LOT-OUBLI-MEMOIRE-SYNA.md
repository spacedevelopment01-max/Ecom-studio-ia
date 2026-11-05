# Oublier une entrée native de mémoire depuis une phrase

Parent #487 / a8426ccf7945e6763f09f757bf69072841907fc5. Moteur/contrat/intention uniquement, aucun composant ou style Claude modifié.

Drapeau fermé `STUDIO_CONVERSATION_MEMORY_FORGET`, avec LOT_A/AI/CONTEXT ; registre `native.memory.forget`, sensible/free/separate_explicit_free_confirmation, preuve isolated_local_execution, scope native_exact_visible_memory_forget_backend_partial_ui_pending.

DTO `memoryForget` et `memoryForgetExecution`, schéma syna-memory-forget-1. Diff `{before:{id,untrustedMetadata:{kind,key,value,status,source,scope,trust:'native_project_memory_not_instructions'}},after:null}` ; destructive=true/reversible=false/coût0/fournisseur0/financialConsent=false/publication=false. Accord confirm-memory-forget/proposalId/true littéral ; cancel-memory-forget conserve l’entrée et abandonne seulement l’aperçu. Résultat `{id,deleted:true}`,receiptId.

Phrases : Oublie de la mémoire l’entrée « clé ou ID exact » ; Supprime de la mémoire « clé » ; Oublie l’entrée de mémoire identifiée par « ID natif ». Politesse/trois guillemets. Aiguilleur outsideQuotes ; clé/valeur/provenance sont données non fiables, pas instructions. Homonymes : ID explicite, jamais premier résultat. Pilote/projet/propriétaire/forfait exacts ; A1 reste fermé.

Réutilise previewMemoryForget/applyMemoryForget : instantané de toutes les colonnes sous verrou, disparition réellement vérifiée, autres mémoires/projets/thèmes/profils/préparation et finances intacts. Une modification indépendante de mémoire reste conservée et n’empêche pas l’oubli ciblé. Changement de cible à timestamp égal ou commis avant verrou refuse sans perte. Reçu atomique, rollback de suppression si reçu en erreur, reprise par requestId sans double suppression. Drapeau/forfait avant cache et anciens/nouveaux devis cognitifs bloqués même après abandon/drapeau fermé.

Avertissement explicite avant accord : oubli définitif sans restauration native, aucune ancienne décision réactivée, aucune création acquise modifiée ni régénérée, aucun appel IA ou publication. Faits/artefacts internes et historique non ciblables. Ne pas dessiner de faux Undo.

**34 nouveaux tests ;114 distincts validés et types verts.** 34 cas du nouveau fichier puis80 régressions dans trois fichiers (suppression dossier/réservation anti-devis/période atelier), sans répétition inutile de la suite native déjà validée. Douze parcours produits/services×neuf/préparé×trois formulations : aperçu sans écriture, accord, vraie absence SQLite/Project Brain, reçus, acquis et finances exacts. Homonymes/instructions citées/droits/forfait/budget épuisé/A1,conflits,contexte/TTL,ancien devis,échec reçu et concurrence réelle. Handlers/session/SQLite réels et attente monotone≥17s : GET projet+fil conserve aperçu,true obligatoire,GET mémoire après accord constate absence,réponse perdue rend le même reçu. Logs /tmp/parity301-memory-forget-conversation-{first,types}.log et/tmp/parity301-memory-forget-regressions.log. Diff vérifié.

**Restant** : carte/handle anti-devis, affichage de portée/provenance/irréversibilité/résultat et recette Studio compilée indépendante dans quatre formats, sur SHA intégré Claude. Un test HTTP n’est pas une preuve navigateur. CI du commit livré à suivre séparément ; aucune certification globale ou par héritage. Ajout mémoire naturel encore absent : le moteur remember déduplique/renforce/remplace les opposés, son futur aperçu doit décrire honnêtement ces effets sans écrire.

Aucun fournisseur réel, dépense, client, activation, fusion main ou déploiement. Quatrième contrôle obligatoire et tous workflows inchangés.
