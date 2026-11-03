# #301 — autorisation économique du Blog natif

Base exclusive : #348 e2d8c8ed91fbb0d20cad93e3db1470e1045f5654. Les trois reproductions initiales échouent sur cette base : POST sans accord, accord faux et tâche sans preuve pouvant atteindre le transport IA simulé. Log local conservé : /tmp/parity301-blog-economic-parent-red.log.

Le Blog natif réutilise le plafond existant du moteur SEO (0,60 EUR maximum, pas une nouvelle formule de prix). Son autorisation bornée est signée par le serveur, lie compte/projet/opération/requête/source/plafond/expiration, puis est persistée dans la tâche. Ce contrat est propre au Blog : aucun devis universel, moteur de rédaction, table de facturation ou second chat ajouté. La confirmation exacte précède la mise en file ; le worker vérifie sa preuve, les droits et le budget. Une opération locale confirmée à zéro reste sans IA même après recharge du budget.

Les articles inclus conservent le quota natif et le budget fournisseur de leur abonnement ; aucune facturation supplémentaire ni crédit créé. Le maximum de quota annoncé est un article ; une réécriture du même document moteur n'en décompte pas un nouveau, conformément au comportement natif vérifié. Une lignée déjà éditée garde les règles natives de protection. Les PATCH manuels restent gratuits, sans nouvelle autorisation IA. Plafonds financiers 40 %/50 % inchangés.

Le garde des tâches attendues couvre désormais les tâches réelles content.v2/blog_article et agent.blog.write. Même confirmation et perte de réponse : même job, sans second achat. Après démarrage interrompu sans reçu complet, refus fermé avant tout nouvel appel ; les documents et coûts acquis restent consultables. Ce refus n'est pas une qualification de récupération automatique du démon. Un résultat checkpointé est relisible sans budget neuf.

La reproduction de réécriture a également révélé une cible native absente de la liste des pages. Le POST utilise maintenant la page du document Blog déjà enregistré, sans inventer de cible. Le résultat du worker expose l'identifiant natif de l'article pour le suivi existant du Studio.

Validation locale : 72 tests PASS dans 6 suites distinctes (autorisations HTTP/SQLite/worker, protocole client, sujets gratuits, retouches Blog, Blog SYNA et Blog historique) ; TypeScript PASS, diff-check PASS. Contrôles : faux accord/signature/requête/opération/source/expiration, intercompte/CSRF, quota épuisé, droits révoqués, admin sans exemption, doublon, interruption et budget rechargé après accord local. Transport IA et cognition simulés ; réseau fournisseur interdit. Aucun coût fournisseur réel, donnée client, fusion ou déploiement.

La CI complète et la recette navigateur de cette nouvelle tête ne sont pas encore qualifiées à l'écriture de ce rapport. Résultats exacts à compléter dans la conversation de la PR ; ne pas attribuer les preuves UI de #348 à ce correctif.
