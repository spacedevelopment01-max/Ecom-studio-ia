# Versions acquises du site et annulation des reçus gratuits — backend partiel

Base #38104b37b021fc3cd88bc1954e86c51d56cc2316c96 (inclut#380 des deux tests CI). Aucun fichier graphique modifié.

## Contrat Claude

localThemeRestoreExecution.enabled et localThemeRestore,syna-local-theme-restore-1,états listed/ambiguous/proposed/applied. « Montre les versions du site » donne choices{id,number,summary,current,previewHref},50 au maximum. « Restaure la version 2 du site » (ou identifiant exact entre guillemets) donne deux vrais liens preview.beforeHref/afterHref,diff explicite,nouvelle confirmation gratuite. Jamais de choix arbitraire de l’avant-dernière version.

confirm-restore avec confirmation:true/révisions/requestId,cancel-restore ;transport createLocalThemeRestoreConfirmation,LOCAL_THEME_RESTORE_CHANGED_EVENT='studio:theme-changed',callback onApplied pour recharger Site. Reçu targetVersionId+version id/parentId/number/previewHref et receiptId,coût0/appels0/publication:false. Carte/verrou partagé et recette4modes/17s à Claude ;ne pas afficher une action pour listed ou un refus.

« Annule la dernière retouche du site » raccorde aussi les reçus gratuits courants ANIMATION,SEO,PAGES,CHOIX THÈME etRESTAURATION. Sélection uniquement par reçu serveur du même fil/projet,ID/version/parent/numéro exacts,receiptId identique au request_id de la ligne,schéma connu et coût0/appels0/financialConsent:false/publication:false/actionsExecuted:true/confirmationRequired:false. Un écho dans un autre tour n’est pas un nouveau reçu. Les animations vérifient en plus la vraie opération set_global depuis le parent et le résultat entier ;aucun reçu fictif ni metadata client ne prouve une annulation.

La phrase est routée vers ce contrat seulement si un tel reçu prouve la version ACTUELLE. Les anciennes retouches Site/image/FAQ continuent dans leur propre contrat localSite et leur validation existante,non remplacée. Nouveau réglage/SEO/page/choix après le reçu=>pas d’annulation de cette ancienne preuve par supposition. Tout undo exige son nouvel accord gratuit.

## Moteur et protection

Réutilise previewNativeThemeUndo natif acquis (mêmes versions,gates,valeur de vocabulaire,validité du thème et disponibilité des médias),sans devis IA ou worker. Restaure par saveThemeVersion avec parent attendu,puis relecture exacte ;historique/médias/marque conservés. Restauration d’une VERSION ACQUISE,donc pas une nouvelle sélection/licence de thème :forfait actif requis,acquis conservés même en Créer,comme le moteur natif. Aucun nouveau thème ni génération.

TTL+empreintes version courante/cible/gate,source de reçu et octets SHA256 de chaque média cible. Média supprimé/rejeté/étranger/manquant ou octets changés=>refus,aucun substitut. Si les règles de vocabulaire réécriraient la cible,l’aperçu acquis ne serait plus exact :refus avant accord. Thème importé exclu du parcours conversationnel,éditeur/restauration manuels natifs inchangés.

## Preuves exécutées

13 nouveaux métier :avant/après et zéro version avant accord,restauration native exacte/parent/history/dépenses ;liste/inconnus/no-op/chaînage ;cible étrangère ;conflits courant/cible/media ;octets manquants ;cancel/TTL/drapeau/forfait acquis/retry ;undo animation ;reçu falsifié ;undo SEO ;undo page et undo de restauration ;undo choix thème avec identité inchangée.13/13 passent.84 confirmations transport (77 acquises+7 restore),16 registre et12 image/undo acquis :112/112. Types/diff-check propres,garde réseau lot9,fetch jamais appelé. Garde withAiDisabled couvre aussi les phrases d’annulation communes. Aucun test supprimé.

Limites :carte/deux aperçus/reload et recette navigateur Encre/Plein ordinateur/téléphone après17s non encore fournis ;pas de publication,thème importé,undo arbitraire de mutation manuelle sans reçu. Un numéro de version acquis explicitement choisi reste restaurable. Ne pas certifier tous les sous-domaines theme.undo par association. CI du SHA livré à qualifier ;statut PARTIEL.
