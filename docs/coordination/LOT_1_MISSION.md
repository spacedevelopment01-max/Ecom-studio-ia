# Lot 1 — Consignes, textes et thèmes fiables jusqu’à l’export

## Mission et autorisation

Le propriétaire a validé le lancement du premier lot et sa transmission à Codex le 17 octobre 2026. Implémenter les corrections ci-dessous, les tester et publier les changements sur cette branche pour revue. Il s’agit d’une mission de correction, pas d’un nouvel audit général.

Titre de travail : « E-COM STUDIO IA — Lot 1 : consignes et textes jusqu’au thème ».

Le périmètre autorisé est le développement et la vérification de ce lot dans un environnement isolé. Aucun merge dans main, déploiement, publication client, appel IA payant ou nouveau fournisseur payant n’est autorisé par cette mission. Une autorisation de développement ne vaut pas autorisation de consommation d’API. Ne pas demander de clé dans la conversation.

Lire CLAUDE.md et les instructions applicables du dépôt. Préserver le travail existant et les branches des autres intervenants. Un seul exécutant modifie les fichiers de ce lot ; une éventuelle intervention de Claude servira à une revue indépendante après livraison.

## Sources et base

- Audit : docs/coordination/AUDIT_STUDIO.md.
- Rapport publié au commit ce18c419a320e3f434ba79891dabda87e6c595df.
- Code audité et main à la préparation de cette mission : ad41c596e859781f33874730891b4bd8b85e259e.
- Défauts visés : F2 (consignes et réutilisation SEO), F4 (perte de texte), F5 (mauvaise cible), et F1 pour ce parcours (résultat réel, sauvegarde et activation).
- Lire la section 9 du rapport, puis confirmer les points dans la version effectivement utilisée. Les résultats de tests du rapport ne remplacent pas les tests des nouveaux changements.

Avant modification : relever branche, commit et état du répertoire de travail. Cette branche part du commit documentaire de l’audit, qui ajoute uniquement le rapport au code audité. Vérifier les changements éventuels de main et les PR susceptibles de toucher les mêmes fichiers. Ne jamais écraser un travail non enregistré, réinitialiser une branche d’un autre intervenant ou intégrer une PR sans rapport. Si le checkout diffère, expliquer la différence et adapter prudemment. Des modifications non publiées dans un autre Codespace ne peuvent pas être supposées présentes ici.

## Objectif client

Un client doit retrouver ses consignes et les informations de son activité dans le texte, le thème affiché et le fichier exporté, sans mélange de produits ou de prestations et sans perte de ses corrections.

L’objectif de qualité du studio reste professionnel : cohérence de marque, pertinence commerciale, clarté, fidélité et utilité. Ce lot répare la chaîne de transmission ; il ne constitue pas à lui seul une preuve de qualité artistique ou de performance commerciale.

Le propriétaire ne veut pas qu’une création insuffisante soit abandonnée immédiatement. Un essai insuffisant doit conduire à une correction ciblée lorsque cela est faisable dans les limites autorisées. Conserver les verdicts internes utiles au contrôle. Ne pas transformer un résultat mauvais en résultat validé pour supprimer le mot « refusé ». Une génération, un job terminé et un livrable utilisable sont trois faits différents.

## Corrections à réaliser

### 1. Demande complète et cible stable

Conserver et transmettre jusqu’au rédacteur :
- la demande exacte, les formulations imposées et les interdictions ;
- la cible stable du produit, de la prestation ou de la page ;
- la langue, les faits disponibles, les corrections mémorisées et les informations de marque pertinentes ;
- une empreinte ou version du contexte réellement utilisé.

La demande ne doit pas être réduite à une intention générique. Les consignes client restent des données métier : elles ne doivent pas annuler les protections, autorisations, règles factuelles ou instructions de sécurité.

Définir les données minimales dans les types et mécanismes existants. Éviter un nouveau moteur abstrait inutilisé. Relier l’interface, la route, le job, le brief et le vrai adaptateur de rédaction. Les champs doivent atteindre effectivement le prompt envoyé, pas seulement un objet intermédiaire ou un journal.

### 2. Réutilisation correcte et sans coût inutile

La clé de réutilisation doit distinguer toute modification qui change le résultat attendu : demande exacte, cible, langue, contexte pertinent, faits et contraintes applicables. Une demande identique avec les mêmes données doit rester réutilisable.

Un ancien résultat ne devient pas correct parce qu’une nouvelle demande a la même intention. Prévoir la compatibilité avec les documents déjà enregistrés ; invalider les anciennes clés insuffisantes sans effacer les contenus. Ne pas déclencher de nouvelles générations au simple chargement d’un projet.

La sélection du document de référence doit être déterministe et fondée sur la cible stable. Le dernier document d’un type ou d’une langue ne suffit pas. Vérifier les produits, les accessoires, les pages et les prestations ; ne pas utiliser uniquement un titre susceptible de changer comme identité.

### 3. Conserver le contenu jusqu’au thème et à l’export

Préserver le texte commercial contrôlé ou modifié par le client à travers document → copie du thème → ThemeSpec → rendu d’aperçu → export réel.

Une reconstruction à partir du seul résumé ne doit pas remplacer le corps du texte. Les transformations de format nécessaires doivent conserver le sens, les formulations imposées et le contenu utile. Préserver les protections HTML et les contrôles factuels existants ; ne pas combler une section avec des avis, garanties, performances ou caractéristiques inventés.

Les informations manquantes doivent être traitées explicitement. Les modifications du client et les versions antérieures restent récupérables. Ne pas supprimer du contenu silencieusement pour faire passer un contrôle.

### 4. Contrôle, correction ciblée et activation sûre

Pour ce parcours :
- Distinguer le statut technique du traitement et l’état du livrable : en préparation/correction, prêt, partiel, à vérifier ou bloqué avec une cause compréhensible.
- Un refus qualité interne doit enregistrer les raisons et permettre une correction ciblée ; réutiliser d’abord les mécanismes de réécriture existants.
- Borner le nombre de tentatives et la dépense avec les autorisations et protections existantes. Ne pas relancer tout le projet pour une correction de texte.
- Ne pas relancer automatiquement un appel fournisseur à résultat financier incertain. Respecter les règles actuelles de dépenses et les annulations/pauses.
- Une nouvelle version refusée reste un brouillon consultable ; elle ne remplace pas la version courante exploitable. S’il n’existe pas encore de version utilisable, ne pas afficher le projet comme prêt.
- Une sortie locale, provisoire, partielle ou non vérifiée ne reçoit pas un statut de qualité finale par simple absence d’exception.
- Un traitement sans livrable ou sans effet ne doit pas annoncer une création ou modification réussie.

Si une protection est placée dans une fonction partagée, vérifier ses autres appels pour éviter une régression. Ne pas refondre les statuts de tous les moteurs dans ce lot.

### 5. Traçabilité utile

Pouvoir relier une demande à sa cible, au contexte utilisé, au document produit, à la version du thème et aux contrôles effectués. Utiliser l’observabilité existante ; pas de journal public contenant des données réelles de clients, des clés ou des secrets.

Les contraintes vérifiables doivent être effectivement contrôlées. Une contrainte non prise en charge ou non vérifiée reste identifiable. Un score donné par une IA ne constitue pas, à lui seul, une preuve de respect du brief ou de rendu professionnel.

## Tests et preuves attendus

Écrire les tests de non-régression avec des données synthétiques. Utiliser les vrais assemblages, adaptateurs et chemins de livraison ; simuler seulement la frontière fournisseur lorsqu’il faudrait payer ou utiliser un service extérieur. Ne pas remplacer le parcours testé par une reproduction artificielle du comportement souhaité.

Matrice minimale :
1. Même intention, mais deux demandes avec une longueur, un ton ou une phrase finale différents : la consigne exacte parvient au rédacteur et la seconde demande ne réutilise pas abusivement la première.
2. Demande, cible et contexte identiques : réutilisation sans nouvel appel de rédaction.
3. Changement pertinent de vocabulaire, de marque, de faits ou de langue : le contexte nouveau est pris en compte sans réutilisation obsolète.
4. Deux produits, dont un principal et un accessoire, créés dans les deux ordres : aucun mélange des textes et métadonnées.
5. Plusieurs prestations/pages et un changement de titre : la bonne cible reste identifiable.
6. Un texte long modifié par le client : contenu, formulations et paragraphes présents dans le document, le thème, l’aperçu compilé et le fichier d’export. Conserver aussi les protections contre du HTML dangereux.
7. Une version valide existe puis la nouvelle tentative est refusée : l’ancienne reste courante et la tentative reste récupérable. Vérifier aussi le premier projet sans version valide.
8. Défaut corrigeable : reprise ciblée puis résultat contrôlé. Limite atteinte, fournisseur indisponible, budget insuffisant ou annulation : arrêt maîtrisé, travail conservé, message fidèle, aucun faux succès.
9. Requêtes identiques/concurrentes et modification du client pendant un traitement : versions, protections de concurrence et règles de facturation conservées.
10. Cas où une action ne change rien : message cohérent avec l’absence de modification.

Couvrir au moins deux produits et deux activités de services aux besoins différents, dont vente, devis et rendez-vous. Ajouter un jeu de validation nouveau après la correction. Les noms, identifiants ou marques des exemples ne doivent déclencher aucune règle spéciale dans le code de production. Renommer les projets de test doit laisser leur comportement inchangé. Les données de test ne doivent pas modifier les démonstrations publiques du studio.

Exécuter les vérifications prescrites dans le dépôt : contrôle des types et suite de tests. Pour les thèmes, appliquer les vérifications prévues par le skill verifier-theme et les scripts pertinents, notamment aperçu/export et Theme Check selon les fichiers touchés. Inspecter une preuve visible sur ordinateur et mobile pour le parcours modifié lorsque l’environnement le permet. Utiliser exclusivement un environnement de test isolé, sans appel IA payant.

Rendre visibles les commandes, résultats et preuves. Si un contrôle échoue ou ne peut pas être lancé, donner la cause exacte et l’impact ; ne pas le déclarer validé. Distinguer tests simulés, rendu réellement ouvert et validation sur fournisseur réel. Une installation sur CMS ou un essai fournisseur non effectué doit rester déclaré non effectué.

## Livrables

1. Corrections fonctionnelles et tests de non-régression sur la branche de cette PR.
2. Un rapport docs/coordination/LOT_1_RESULTATS.md contenant :
   - commit de base et commit testé ;
   - problème → correction → preuve, pour chaque critère ;
   - commandes réellement exécutées et résultats ;
   - exemples et chemins des captures/exports vérifiés, sans données client ;
   - état de chaque critère : validé, partiel ou non vérifié ;
   - limites restantes et éventuels blocages ;
   - confirmation des appels payants exécutés ou non exécutés, sans inventer un coût ;
   - proposition de test réel chiffré uniquement si nécessaire pour une validation ultérieure.
3. Un résumé dans cette PR avec les liens vers les preuves et le rapport.

Poursuivre les réparations des défauts de ce lot révélés par les tests jusqu’à obtenir un résultat cohérent. Ne pas s’arrêter après une modification de schéma ou un seul test vert. Ne pas commencer les lots suivants et ne pas fusionner.

## Suite du programme — pour contexte, hors exécution de cette mission

Après validation de ce lot : qualité des marques, textes et thèmes ; logos, images et publicités ; vidéos et publications ; parcours client complet. Les défauts de prompts images, cache image, liaison des publicités à leur éditeur et contrôles visuels relevés dans l’audit auront leurs tâches dédiées.

Les références de qualité, la comparaison de vrais rendus et le coût total par création validée accompagneront ces lots. Ne pas promettre une qualité professionnelle sur la seule base de tests techniques.
