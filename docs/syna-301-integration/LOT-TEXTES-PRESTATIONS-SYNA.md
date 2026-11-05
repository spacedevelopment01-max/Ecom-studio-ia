# Textes des prestations réservables depuis une demande naturelle

5 novembre 2026, Europe/Paris. Parent #433, `077883cf`. Nouveau contrat serveur, distinct de la carte numérique prix/durée existante de Claude. Aucune modification de ses composants ou de sa branche.

## Fonctions exécutées

Sur les moteurs natifs salon et cabinet : renommer une prestation, remplacer sa description courte et l’effacer explicitement. Cible unique par nom ou identifiant natif ; les homonymes demandent une précision, jamais le premier résultat. Profil d’activité, restaurant et prestations réservables restent des domaines distincts.

Exemples réellement testés :

- « Renomme le service réservable “Diagnostic fictif” en “Nouveau diagnostic” ».
- « Je voudrais renommer le service réservable “Diagnostic fictif” en “Diagnostic souhaité” ».
- « J’aimerais changer le nom du service réservable “Diagnostic fictif” par “Diagnostic souhaité” ».
- « Peux-tu renommer la prestation réservable “Diagnostic fictif” en “Diagnostic précis” ? ».
- « Modifie la description courte du service réservable “Diagnostic fictif” par “Texte exact” ».
- « Efface la description courte du service réservable “Diagnostic fictif” ».

Guillemets français, courbes et droits, citations imbriquées et description multiligne testés. Les espaces de délimitation sont retirés ; les sauts de ligne internes restent conservés. Une valeur déjà identique ne crée aucune version. Nom de 1 à 80 caractères, description de 0 à 160, selon les schémas natifs. Texte exact uniquement, aucun texte inventé.

L’aiguilleur utilise `outsideQuotes(text)` et un préfixe métier structurel. Une fois ce domaine reconnu, les autres aiguilleurs sont exclus pour ce tour : les mots prix, stock, SEO, horaires ou publicité contenus dans une valeur, même multiligne, ne déclenchent ni un autre moteur ni son drapeau. Les autres demandes gardent leur routage antérieur.

## Contrat pour Claude

Drapeau `STUDIO_CONVERSATION_BOOKING_SERVICE_TEXT`, fermé par défaut, sous LOT_A/AI/CONTEXT. Propriétaire, forfait actif, services, onglet Rendez-vous et moteur natif requis ; A1 reste en lecture seule.

Vue `bookingServiceTextExecution.enabled` et présentation `bookingServiceText` :

- `schema:'syna-booking-service-text-1'`, états `ambiguous/proposed/applied`.
- `projectId`, `nativeHref`, `kind:'salon'|'cabinet'`, `field:'name'|'short'`.
- `service.id`, nom natif dans `service.untrustedMetadata` marqué comme donnée non fiable.
- `diff.before/after` : chaînes exactes ; description vide = effacement explicitement demandé.
- `linkedLabelsChanged` : nombre exact des autres libellés liés renommés. Le nom principal est exclu de ce compte.
- `warnings`, `confirmationRequired`, `financialConsent:false`, `costEur:0`, `providerCalls:0`, `publication:false`.
- `proposalId/sourceVersionId`, puis `receiptId=requestId`, `resultVersionId`, `actionsExecuted:true`.

POST `confirm-booking-service-text` avec `confirmation:true` littéral, proposition/révisions/requestId ; `cancel-booking-service-text` distinct. Réutilise le patch natif de #433 et les moteurs de lecture/aperçu/sauvegarde existants. Aucun nouveau writer de thème, table métier ou moteur de tarification.

Carte à intégrer chez Claude : texte avant/après avec retours à la ligne, cible et type de champ, nombre de libellés liés, avertissements, accord gratuit et annulation ; contrôleur partagé de verrou/péremption/reprise, handle dans les gardes du panneau pour masquer le devis, puis `studio:booking-changed` après reçu. Ne pas réutiliser la carte numérique en lui faisant afficher ces chaînes comme des prix ou minutes. Ne pas ouvrir le drapeau avant cette intégration.

## Protections et preuves

UUID, empreinte du thème entier, aperçu et vocabulaire revalidés, TTL de 15 minutes, droits avant cache, sauvegarde et reçu atomiques. Un mot nouveau qui serait transformé par une consigne de vocabulaire ne produit pas un aperçu faussement exact. Reprise GET et rejeu de la même confirmation : une seule version. Conflit manuel, péremption ou contexte effacé refusés. Réservations confirmées, identifiants, prix, durées, champs voisins et profil restent conservés. Le devis cognitif payant est aussi refusé pour ce domaine.

**34 nouveaux tests verts**, dont les deux moteurs, noms/descriptions/effacement, préparé et neuf, citations multilignes, homonymes, accord obligatoire/annulation, conflit/TTL, révocation des droits et du drapeau, propriétaire/contexte, vocabulaire, allocation IA épuisée, rollback, rendez-vous acquis, A1, registre et fermeture par défaut. Vrais handlers HTTP POST/GET puis GET natif : attente réelle de 17 secondes, relecture du projet, confirmation, résultat enregistré et rejeu sans doublon.

**Vérification cumulée sur le code livré : 281 tests / 16 fichiers et types verts**, comprenant les 209 tests nouveaux des lots #423 à ce lot et 72 régressions existantes. Log `/tmp/parity301-booking-session-final-targets.log`. Logs du contrat `/tmp/parity301-booking-service-text-{first,final,http17-final,types-final}.log`. Les cinq premiers échecs de délimitation des espaces ont été corrigés avant livraison.

Aucun fournisseur réel : fetch interdit, garde réseau Node et données fictives isolées. Ce lot gratuit ne nécessite aucun test fournisseur payant. **Statut PARTIEL** : carte et recette compilée Claude encore nécessaires, puis CI finale sur le SHA commun. Le diagnostic navigateur antérieur `c9a6f830` ne qualifie pas ce nouveau contrat. Aucune activation client, fusion main, mise en production ou dépense.
