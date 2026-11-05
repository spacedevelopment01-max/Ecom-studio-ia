# Choisir un thème natif depuis une phrase — backend partiel

Base #375 0561c6cfc9aee5609fe71e00dd07544efe5e6258 ; aucun fichier graphique modifié.

## Contrat pour Claude

Depuis Site : « Choisis le thème Rive pour mon site ». `localThemeChoiceExecution.enabled`, `localThemeChoice` schéma syna-local-theme-choice-1, états ambiguous/proposed/applied ; choices id/name (galerie native), direction, diff noms, preview.beforeHref/afterHref, retainedInactive:true. Le texte explique explicitement qu’un aperçu NATIF INACTIF est conservé dans les versions avant l’accord ; il ne remplace pas le site courant. Confirmation gratuite séparée du remplacement du site de travail, jamais une mise en ligne.

`confirm-theme-choice` avec confirmation:true/révisions/requestId ; cancel-theme-choice. Transport createLocalThemeChoiceConfirmation, stockage syna-free-theme-choice:<conversationId>, événement studio:theme-changed à raccorder au rechargement Site par Claude. Reçu relu avec version.id/parentId/number, receiptId, previewHref. Montrer les deux aperçus, rapports natifs/incomplétudes et verrou partagé ; ne pas utiliser une capture d’exemple à la place du vrai aperçu projet.

Moteur existant buildShop(null,{direction,useAi:false,prepareOnly:true}) et règles natives de report/contenus acquis. Droits forfait+galerie contrôlés avant préparation et à la confirmation. Choix limité aux thèmes actifs de référence éligibles ; ceux-ci ne déclenchent pas la préparation de médias. Marque/identité préservées (pas de switchDirection qui pourrait les modifier). Aucun fournisseur, aucune nouvelle image, aucun logo ni reconstruction IA. Un aperçu annulé reste inactif dans l’historique, sans dépense. Au moment de confirmer : empreinte entière projet/site/actifs/mémoire/documents + empreinte du preview natif, TTL, propriétaire, drapeaux et onglet ; saveThemeVersion avec parent attendu puis relecture exacte. Gate REJECTED/RETRY = refus.

## Défaut natif démontré, protection ajoutée

Une retouche de heading d’une ancienne composition hero-split ne se reporte pas dans Rive ; le moteur produit `carryOver.dropped=[{template:'index',id:'hero_split_1',key:'heading'}]`. Le raccordement refuse alors toute confirmation de remplacement, conserve le site/retouche exacts et l’aperçu inactif pour diagnostic. Ne pas annoncer « tout reporté ». Ce refus est testé ; adapter la conservation inter-thèmes demande une politique explicite par champ, pas une copie vers un titre arbitraire. Ce point reste une lacune du moteur natif, pas une parité certifiée.

## Preuves exécutées

10 nouveaux tests : choix Rive, aperçu inactif sans changement courant/marque, accord et résultat relu, dépenses/jobs inchangés ; inconnus/commande chaînée sans préparation ; annulation/expiration ; conflits site/profil/aperçu ; retry identique/propriétaire/no-op ; droits avant/après aperçu+drapeau ; marque absente clarifiée ; pertes manuelles natives empêchant la confirmation.

70 confirmations transport (63 conservées +7 thème) ont passé dans la passe initiale80 contrôles (2 fixtures ensuite corrigées : marque vide JSON au lieu de NULL SQL et attente de refus quand le natif signale une perte). Dernière passe métier10/10. 20 registre/connaissance passent. Types propres et diff-check propre. Réseau lot9 bloqué, fetch jamais appelé. Aucun test supprimé ni protection financière affaiblie.

Limites : site natif existant et marque définie, ni thème importé ni premier site ni publication ; toute perte manuelle détectée bloque. Carte et recette compilée Encre/Plein ordinateur/téléphone après17s à intégrer avec Claude. Statut PARTIEL ; CI du SHA livré à qualifier.
