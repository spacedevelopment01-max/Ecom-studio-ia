# Trois réglages d’animation natifs — backend partiel

Base #378 0d37f5fc74490b378c81d997150172613e56b439. Aucun fichier graphique/CSS modifié.

## Contrat Claude

`localSiteMotionExecution.enabled`, `localSiteMotion` schéma syna-local-site-motion-1, états ambiguous/proposed/applied ;key motion_enabled/motion_intensity/motion_parallax,diff booléen ou valeur native,receiptId/version id/parentId/number/previewHref. `confirm-motion` avec confirmation:true/révisions/requestId ;cancel-motion. Transport createLocalSiteMotionConfirmation et LOCAL_SITE_MOTION_CHANGED_EVENT='studio:theme-changed' ;callback onApplied pour recharger Site,verrou commun et recette4modes/17s à Claude.

Phrases exactes : Désactive/Active les animations du site ;Désactive/Active la parallaxe ;Mets l’intensité des animations à discrète/normale/expressive. Les valeurs natives sont subtle/normal/expressive. Une demande vague ou chaînée est une clarification gratuite, jamais un devis automatique. Animations désactivées :activer par un accord distinct avant intensité/parallaxe,comme le menu natif.

Réutilise Op set_global,assertThemeOperations(...,conversation:true),applyOps,validateSpec,saveThemeVersion et parent attendu. Aucun style inventé,aucun contournement de lock settings. Version/empreinte avant+résultat prévues,TTL,propriétaire/forfait/onglet/drapeau recontrôlés ;relecture exacte,native retry une seule fois. Seule la valeur demandée change,version précédente gardée. Reduced motion visiteur reste natif ;aucune promesse de mouvement effectivement joué quand cette préférence est active.

## Droits préservés

Le contrôle natif conversationnel du forfait Créer refuse les types checkbox/select au-delà des textes/images/couleurs :ce lot garde ce402 et ne le contourne pas. Les boutons manuels du Studio restent inchangés et gratuits selon leurs propres droits. Cette distinction de forfait reste une limite de parité à documenter,aucun assouplissement financier implicite. Thème importé et replay d’animation non raccordés ici.

## Preuves exécutées

9 nouveaux tests métier :4 phrases comparées aux vraies opérations et aux valeurs JSON de l’export natif ;désactivation puis activation séparée ;no-op/ambiguïté/chaînage ;lock+forfait ;concurrence manuelle/cancel/expiration ;retry et reçu falsifié.77 confirmations transport (70 acquises +7 motion) et16 registre :102/102. Types propres,diff-check propre,garde lot9. Assertion d’export initiale corrigée pour utiliser parseThemeJson natif (le fichier JSON exporté comporte un commentaire d’en-tête). Aucun test supprimé ni moteur altéré pour l’assertion. Actions gratuites dans withAiDisabled explicitement. Coût/jobs inchangés,fetch sentinelle jamais appelé.

Limites :carte/verrou/relecture et recette compilée Encre/Plein ordinateur/téléphone après17s restent à intégrer. Annulation globale automatique de ces reçus pas encore raccordée ;historique natif restaurable conservé. CI du SHA livré à qualifier. Statut PARTIEL des trois unités,ni génération ni publication.
