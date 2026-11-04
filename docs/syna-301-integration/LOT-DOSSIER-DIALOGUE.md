# Dossier : formulations naturelles et clarification suivie

Complète #387 sans modifier le protocole d'accord ni l'interface. Phrases sans guillemets acceptées : « Crée un dossier Photos à la racine », « Crée-moi un dossier nommé Photos à la racine », « Ajoute le dossier appelé Photos à la racine », « Créer un dossier Photos à la racine ». Le nom complet reste exact ; pas de troncature, de commande chaînée ni de destination devinée.

Demande incomplète « Crée un dossier Photos atelier » : question gratuite persistée dans la conversation. Après rechargement, « à la racine » ou « dans le dossier Photos » résout le parent exact et prépare seulement la proposition ; l'accord confirm-folder reste séparé et obligatoire. « Oui » ou « ici » ne choisit aucun parent. Une question expire après15min ; une nouvelle demande remplace le nom en attente et un autre domaine invalide cette clarification. Réponses candidates exécutées sous interdiction IA, y compris après expiration : jamais un devis pour préciser une action gratuite.

Contrat client inchangé : localFolders, états ambiguous/proposed/applied, diff.before=null/after{name,parentId}, result natif relu. Aucun bouton ne doit traiter la réponse de destination comme un accord. Le nom en attente est interne au serveur ; la question persistée est le message présenté.

Preuves :8 nouveaux tests de formulations et dialogue,14 métier existants et91 transports =113 réussis ; types propres. Reload de la question, précision du parent, absence d'écriture avant accord, TTL, oui/ici, remplacement du nom, chaîne refusée et zéro fournisseur sont vérifiés sur conversation/SQLite fictifs. Cartes et vraie recette indépendante des nouvelles intentions restent à Claude. Aucune affirmation de couverture linguistique exhaustive.
