# Benchmark créatif à autoriser — aucune exécution payante

**Ce fichier est un plan, pas un accord d'appel.** Les tests réels complets amont restent suspendus. Réutiliser seulement les fournisseurs existants ; aucune nouvelle clé, route ou connexion. Ne pas envoyer les huit références privées aux fournisseurs sans accord sur cet usage. Elles ont désormais toutes été réellement ouvertes ; leur inspection locale a servi au diagnostic qualitatif et elles ne sont pas publiées ici. L'[analyse complémentaire](REFERENCES_COMPLEMENT.md) précise les points de comparaison visuelle, sans ajouter de génération payante au plan.

## Devis préparatoire

[Calcul expurgé, reproductible et hypothèses](benchmark-quote.json). En l'absence de configuration exploitable dans la copie runtime, il lit les **valeurs du dépôt**, pas les modèles servis au propriétaire : OpenAI `gpt-image-1` pour image/layout, Anthropic `claude-sonnet-5-5` pour conception/contrôle, conversion USD/EUR 0,86, majoration 1. Le layout n'est pas activé par défaut. Ces noms ne sont ni une nouvelle sélection ni la preuve de disponibilité ou de prix actuel. L'obligation du modèle de logo ne s'applique pas aux publications.

| Hypothèse indicative, sans facture | Une création | Deux cas |
| --- | ---: | ---: |
| Conception + image + contrôle, un essai | 0,36636 € | 0,73272 € |
| Conception + scène + mise en page + deux contrôles | 0,68456 € | 1,36912 € |
| Scénario borné trois images et trois contrôles, une étape | 1,00276 € | 2,00552 € |

Ces montants ne sont pas un devis utilisable pour déclencher des appels. Les hypothèses de tokens et taux sont dans le JSON ; références, taille, qualité, fournisseur et taux réels peuvent les modifier. Une correction n'est comptée que si elle est envoyée. Aucun paiement n'a eu lieu dans cette mission.

Avant tout lancement : lire dans l'environnement déjà configuré les routes, capacités, tarifs confirmés, taille/qualité, modèle demandé, budget IA restant et consommation du plafond commun de **10 $** ; présenter coût probable, réserve maximale et pourcentage du budget au propriétaire, puis recueillir son accord ciblé. Garder 40 % abonnement mensuel HT / 50 % recharge HT et protection des appels incertains. Si ces informations ne sont pas vérifiables, aucun envoi.

## Première série : deux cas, un format chacun

Créer deux nouveaux projets de test, séparés de tout client, avec actifs autorisés et identité complète. Utiliser le vrai moteur/UI et les vraies réservations, jamais une génération externe présentée comme studio. Garder le même plafond commun ; pas de matrice de modèles.

1. **Publicité commerciale produit** : cafetière manuelle ou outil de jardin, photo fournie sous plusieurs vues autorisées et logo exact, palette contrastée. Publicité 4:5 de démonstration ou détail demandé, sans inventer de caractéristiques ni face cachée. Une seule accroche et CTA utile, pas nécessairement bouton.
2. **Publication organique de service** : entretien de vélos ou acoustique de bureaux, sans photo de chantier, avec logo autorisé et charte propre. Conseil utile ou FAQ en 2:3 à partir de la procédure et des réponses confirmées du professionnel : montrer des outils, matériaux ou un schéma factuel si pertinent. Conserver les blocs explicatifs, sans achat/devis forcé, sans personne ni faux chantier client. La différence avec la publicité porte sur l’utilité et la composition, pas seulement sur la présence d’un bouton.

Au premier résultat : enregistrer natif, final, miniatures mobiles, prompts réellement transportés, références ordonnées/empreintes, modèle demandé/servi si connu, paramètres, fallback, étapes, coûts mesurés ou estimés explicitement, réservations et verdict. Inspecter ensemble les textes à taille native et à 360 px, logo/produit comparés aux références autorisées, lumière, matière, hiérarchie et pertinence métier. Un défaut critique empêche FINAL. Si seule la typo échoue, reprendre la mise en page en conservant la scène, dans la limite approuvée. Résultat incertain : arrêt, pas de relance automatique.

Comparer à la recette antérieure si une image antérieure autorisée existe déjà ; sinon garder l'ancienne consigne comme pièce de comparaison et ne pas payer un « avant » uniquement pour embellir le rapport. Les premières planches doivent dire précisément ce qui est réellement comparable. Validation humaine avant toute extension.

Après ces deux résultats et seulement sur accord ciblé supplémentaire : comparer pour une même marque/sujet publicité, conseil organique, FAQ/checklist, avis réel fourni et autorisé, puis carrousel de plusieurs pages réellement générées. Le devis du carrousel compte chaque page et son contrôle ; pas de matrice payante automatique. À défaut d’avis réel, demander la matière ou changer de type ; ne pas en fabriquer. Préparer des planches natives et mobiles des deux intentions.

## Généralisation ensuite, sans noms codés

Réserver des briefs non utilisés pendant le développement, idéalement rédigés par la coordination après gel du code : produit transparent/alimentaire et service de réparation ou d'enseignement sans humains autorisés, chacun avec contraintes différentes. Aucun de ces cas ne doit conduire à une règle portant son nom. Tester ensuite, seulement après accord, une campagne multi-format 1:1/4:5/9:16/16:9/2:3 : conserver message/identité, recomposer hiérarchie et cadrage selon destination plutôt que dupliquer une image. Élargir aux autres formats proposés si leur usage le justifie.

Critères de réussite : sujet et logo exacts ; identité entière respectée ; zéro texte/allégation non autorisé ; lecture mobile ; dimensions physiques conformes ; expressions réellement variées ; contrôle motivé et accord humain ; reprise sans double paiement ; original utilisable conservé ; facture et `ai_calls` rapprochés. Une note 9/10 seule ou une compilation ne suffit pas. Arrêter avant thèmes, CMS, exports et envois sociaux.
