# SYNA FULL PARITY — matrice de vérité progressive #301

Référence locale isolée : `5fd100d8129f352f5bf19c70da501be3e71b7b78` = #299 `7ca231aae2f08c1574f4d50bd4b1fb1a309e70ad` + seul diff #300 `c2fbeb9d98367dc7084a0e2f0ad8fbd48afeb8e6`. Aucun changement de branche Claude. Le SHA propre à chaque preuve est renseigné ; ne pas confondre des tests moteur c2 avec une recette combinée sur 5fd.

65 opérations du catalogue actuel, plus opérations hors catalogue pour couvrir les 25 capacités. Statuts historiques #285 NON repris. Un adaptateur déclaré ne prouve pas une exécution ; `PASSE_MOTEUR` ne signifie pas `SYNA_OK` navigateur. Fournisseurs toujours simulés, 0€ réel.

Les fichiers CSV/JSON portent une ligne par opération : source native, entrée SYNA, adaptateur, statuts natif/SYNA/exécution, priorité, coût/consentement, critère, preuve/SHA et PR. La couverture UI Encre/Plein cadre desktop/mobile est sous responsabilité Claude sur le SHA intégré, pas présumée ici.

| Capacité | Domaine | Opérations inventoriées | Preuves à ce relevé |
|---|---|---:|---|
| C01 | Conversation persistante | 2 | NON_TESTE:2 |
| C02 | Démarrage du projet | 1 | NON_TESTE:1 |
| C03 | Reprise d’un projet existant | 1 | NON_TESTE:1 |
| C04 | Contexte et modes Encre/Plein cadre | 2 | NON_TESTE:2 |
| C05 | Retouches gratuites et annulation du site | 2 | NON_TESTE:2 |
| C06 | Composition et choix du thème | 3 | NON_TESTE:3 |
| C07 | Pages, sections et thème sur mesure | 3 | NON_TESTE:3 |
| C08 | Rendu et exports | 2 | NON_TESTE:2 |
| C09 | Analyse, recherche et choix stratégiques | 7 | NON_TESTE:7 |
| C10 | Identité textuelle | 3 | NON_TESTE:3 |
| C11 | Logos et identité complète | 2 | NON_TESTE:2 |
| C12 | Catalogue produits, variantes, stocks | 6 | NON_TESTE:5, ECHEC:1 |
| C13 | Images, recherche, import et placement | 4 | NON_TESTE:4 |
| C14 | Montage, voix, clips et reprise vidéo | 7 | NON_TESTE:7 |
| C15 | Textes, SEO et blog | 6 | PASSE_MOTEUR:3, NON_TESTE:2, ECHEC:1 |
| C16 | Plan social et calendrier | 4 | PASSE_MOTEUR:2, NON_TESTE:2 |
| C17 | Production sociale et texte dans visuel | 1 | NON_TESTE:1 |
| C18 | Campagnes et visuels publicitaires | 3 | PASSE_MOTEUR:1, NON_TESTE:2 |
| C19 | Retouche publicitaire locale et nouvelle version | 2 | NON_TESTE:2 |
| C20 | Lot initial et automatisations | 1 | NON_TESTE:1 |
| C21 | Carte, biens, réalisations, prestations | 4 | NON_TESTE:4 |
| C22 | Rendez-vous et demandes reçues | 5 | NON_TESTE:5 |
| C23 | Publication, hébergement, domaines, connexions | 4 | NON_TESTE:4 |
| C24 | Fichiers et prompts | 3 | NON_TESTE:3 |
| C25 | Workflow ancien et propagation de marque | 2 | NON_TESTE:2 |

## Lacunes démontrées, pas simple inventaire

- P0 natif stock : mauvaise fiche/variante et version acceptées ; correction et non-régression en cours sur branche domaine.
- P1 livraison SEO : métadonnées validées ignorées sur page existante sans document de corps ; correction et vérification export en cours.
- P0 images natives : route authentifiée sans devis/confirmation atteint le vrai handler puis adapter fournisseur sentinelle simulé. Budget/forfait actifs mais consentement absent. /tmp/syna301-media-consent-red3.log (source c2). Aucun fournisseur réel ; correction en cours de bornage avant raccordement.

## Tableau de bord — première passe

Les compteurs sont par opération, pas par nombre de tests. Aucun taux global SYNA_OK annoncé. Les succès moteur partiels et cas rouges sont séparés de la recette complète. Les routes sensibles externes (publication, paiements, RDV réels, domaine/connexion) ne seront pas exécutées sans consentement explicite ; les tests se limitent aux simulateurs et refus.

Prochaine actualisation : résultats navigateur HTTP/worker sur référence commune, correctifs stock/SEO/devis image, noms des PR et limites exactes. Les longues CI de domaine ne bloquent pas les autres domaines.
