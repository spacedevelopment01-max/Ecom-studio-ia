# Logo natif : devis et autorisation économique

Branche issue de `main` `37fcfd2526705d274fd813b5da95be46058b7c9f`. Périmètre #294 uniquement : aucune modification des interfaces Claude, du panneau SYNA ou de l'intégration #292.

## API native

POST `/api/projects/:id/brand/logo-v2` :

1. `action:quote`, `operation:generate|redraw`, `style`, `renew`, `feedback`, `assetId` éventuel. Le serveur normalise puis persiste la demande et calcule le plafond avec `logoSeriesQuote` / `logoRedrawQuote`, les tarifs/routes natifs et le budget du projet. Aucun appel fournisseur ni tâche.
2. Après relecture et clic explicite : mêmes paramètres avec `action:generate|redraw`, `quoteId`, `maximumPct` exact renvoyé, `confirmation:true`, `requestId` stable. Le serveur refuse les paramètres/montants différents, l'expiration, les changements d'identité/acquis/série/routes/prix/budget/forfait, les comptes étrangers et les engagements fournisseur incertains.
3. Le résultat du POST est un identifiant de tâche et de devis. Il ne prouve pas une livraison. Une répétition du même consentement renvoie la même tâche ; un devis exécuté ne rachète jamais une seconde tâche. Aucun renouvellement automatique après erreur.

Le devis est dans `memory`, `kind:artifact`, préfixe `logo.native.consent.` : utilisateur/projet, demande normalisée, empreintes de portée, version de thème, séries/acquis et octets des logos, routes/tarifs/plafond, base et disponible budgétaires, expiration, confirmation et identifiant de tâche. Les API de mémoire manuelle ne permettent pas d'écrire ce type d'artefact. Aucun tarif ou secret fournisseur n'est envoyé à l'interface : uniquement des pourcentages, une validité et la portée de l'achat.

## Worker et budgets

Le worker vérifie l'autorisation persistée, le propriétaire, le type et l'identité de tâche avant d'exécuter. Un marqueur atomique d'exécution empêche le rachat en cas de reset manuel des tentatives ou des checkpoints. Les validations sont répétées avant chaque fonction fournisseur ; les routes texte/image sont épinglées et un changement de route est refusé. Les appels texte natifs sont bornés à un seul essai. Un relais non qualifié est refusé, jamais ajouté implicitement.

Le plafond du devis est transmis à `withTrace` et aux moteurs existants. `reserve` reste le contrôle atomique des dépenses ; coûts réglés, réservations et incertitudes comptent dans le plafond. Aucun budget supplémentaire n'est créé pour la première série : elle reste incluse dans les droits du forfait, mais sa consommation fournisseur utilise le budget natif. Les règles 40 % abonnement HT / 50 % recharge HT et les tarifs du compte administrateur ne sont pas modifiés.

Les anciennes requêtes natives sans preuve, anciens jobs `brand.logo` de génération et appels bruts non qualifiés sont fermés explicitement. Le chemin de première création en Préparation conserve son autorité existante : devis persistant, cap, révision/hash et tâche pending concordants. Les flux SYNA déjà munis de leurs propres devis restent sur leur contrôleur existant et ne sont pas redéveloppés ici.

## UI et opérations gratuites

Les deux boutons natifs passent par le même dialogue : estimation et maximum en % sur la base de la jauge IA, expiration, effet sur les droits, Confirmer / Annuler. L'arrondi du maximum est supérieur. Un double clic est verrouillé ; en cas de réponse perdue, le réessai garde le même corps et requestId. Aucun lancement automatique en secours.

Consulter, sélectionner une direction acquise et demander ses déclinaisons locales ne demandent pas ce devis payant. Créer une série ne remplace ni le logo choisi ni la marque active. Les résultats restent des propositions à examiner ; le reçu natif et les fichiers doivent être relus après exécution.

## Qualification et limites

Les tarifs de recette sont des paramètres synthétiques clairement isolés ; aucune clé réelle et aucun appel externe ne sont utilisés. La recette exécute les vrais routes, queue, moteurs, fichiers et réservations, avec dessins/relectures injectés ; sa consommation financière est simulée et n'est pas une dépense API réelle.

Si modèle, contrôle, prix, budget ou preuve ne sont pas disponibles, le parcours est bloqué. Des jobs historiques sans autorisation ne sont pas réactivés automatiquement. Les devis durent 15 minutes ; une tâche interrompue exige un diagnostic et, si un nouvel achat est souhaité, une nouvelle proposition valide. Aucun correctif de qualité/relais OpenAI, de publicité ou de SYNA n'est inclus.

Rollback : avant intégration, fermer la PR ; après intégration éventuelle autorisée séparément, retirer le raccordement en maintenant le refus des entrées non autorisées. Ne pas rétablir les anciens POST payants sans devis. Aucune migration de schéma, activation de production ni donnée client modifiée.
