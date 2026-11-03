# SYNA #301 — proposition de matrice phase2, sources separees

Document de revue hors candidat : aucune modification de code, branche Claude, candidat ou PR#326. La matrice passe de83 a84operations (67catalogue+17complementaires),25domaines : ajout distinct prompts.list. prompts.edit reste absent. Sources historiques/captures conservees ; aucun nouveau total global de parite.

| Domaine | Nouvelle preuve | Qualification bornee |
|---|---|---|
| C21 exact#334 |77a3614e6da9a633f77ccbdd4b79619f3aea92f9 ; C21-EXACT-FIELDS-SUMMARY.json |4cas UI/25captures/4traces : Bien.description Encre1440,Plat.description Encre390 publieLOCALfictif,Real.work Plein1440/390 ; accord gratuit,texte multiline exact,editeur natif et reload,0SDK. PARTIEL hors ces champs, pas CRUD ni A1. |
| C24 prompts.list#335 |3430ea7be52f502c162a4f136d70ef6d9ca74f7a ; rapport/proofs locaux |158/9backend+types,23nouveaux ;20metadonnees compte,aucun body/mutation/execution. PARTIEL sans carte ni recetteUI. prompts.edit absent. |
| C19 natif#333/#337 |ab44c496875afda859c3730c947c12a141159189 ; NATIVE-DRAFTS337-SUMMARY.json |4scenes natives Encre/Plein1440/390 : CAS/conflits,PNG,reload/reprise brouillon ; PAS adaptateur SYNA. Premiere desktop issue tentative4PASS conservee,3autres replay final ; historique echecs gestuelle conserve. |
| C19 namespace#336 |5b8d58e32030d58429401acf3a92145fa49493e9 ; namespace-proof.json |Tests backend namespace/migration distincts ; pas attribut au build UIab44 qui contient333+337. |

Le statut BLOQUE de native.ad-document-edit etait trop large : edition locale native maintenant PASSE_NATIF_NON_RACCORDE/PARTIEL, sans retirer le refus financier ai_edit. native.ad-regenerate reste BLOQUE_GARDE_FINANCIERE/ABSENT : aucune livraison IA nouvelle deduite. Operations C21 restent PARTIEL meme avec UI4cas. PASSE_SCOPE inclut maintenant46operations, pas46parites completes ; ancien45+1lecture backend seulement.

## Diagnostic priorise, sans implementation

1. P0 : conserver refus payants prompt-run/ai_edit/regeneration et audit financiertableau NON_TESTE ; aucun de ces scopes locaux ne ferme199autres chemins. Nouvelle pile commune333/334/335/336/337 doit etre assemblee et testee a son propre SHA.
2. P1 : carte readonly prompts.list conforme335 (compte,20metadonnees,troncature,texte non fiable,aucun body ou CTA payante implicite). Ne pas etendre prompts.edit ni contourner forfait/A1.
3. P1 : UI existante a raccorder aux backends acquis : A1 recovery.localEdits pour site/fichiers autorises, C22 demandes#319 list/statut avec accord local, C15 blog.edit#309 et SEO#303 sur leurs vrais parcours. Cette note n’en declare aucun teste.
4. P1 : futur adaptateur SYNA editeur publicitaire local : cible docKey/projet/versionCAS,lecture exacte,preview+accord gratuit,recu/retry,conflit409 et brouillon onglet. Aucun adaptateur ajoute par333/336/337 ; ne pas masquer cette absence par une preuve native.
5. P2 : commandes de bibliotheque natives copie/edition/favori/fill restent sans adaptateur SYNA ; recherchephotos312 et autres outils absents exigent leurs propres droits/cibles/devis. Verifier contrats existants avant tout nouveau moteur.
6. Actions sensibles publication/connecteurs/RDV/synchronisation : rester bloquees sans environnement et accord explicites ; absence de test reel ne prouve pas panne ni securite totale.

Compteurs stricts et changements par ligne dans verification.json. Aucun navigateur lance pour cette mise a jour documentaire ; les preuves citees sont lues, pas reexecutees. Aucun nouveau statut CI vert attribue : consulter le snapshotCI exact a la publication. Aucune depense fournisseur reelle,client,fusion ou deploiement.
