# Lot 9 — données, flux et procédures de contrôle

État vérifié le 23 octobre 2026 sur une copie isolée. Base : 46738852498ea24092be9dae639930438bcdba6d (#170), pas la production. Aucun accès aux réglages, contrats, journaux ou sauvegardes du studio de Thomas. Ce document décrit des mécanismes et des décisions ouvertes ; il ne certifie aucune conformité juridique.

## Inventaire vérifiable dans le code

| Données / finalité | Stockage et accès | Flux / état observé | Conservation existante et décision manquante |
|---|---|---|---|
| Identité, e-mail, nom, fuseau, mot de passe haché ; compte | SQLite `users`, bcrypt ; routes authentifiées et administration explicite | Inscription confirmée par e-mail avant création/session ; test SMTP **loopback**, aucun destinataire réel | Pas de purge générale ; finalité et durée à décider |
| Sessions, reset, confirmation, récupération de l’administration | SQLite ; jetons hachés/HMAC, cookie HttpOnly/Lax, Secure en production HTTPS | Cookie au navigateur ; messages via SMTP configuré ; fournisseurs réels inconnus | Session 30 jours ; reset et inscription 1 heure ; validité ne signifie pas suppression immédiate des lignes. Reset utilisé conservé, anciens liens nettoyés à la création suivante ; inscription expirée nettoyée à une nouvelle demande |
| Projets, consignes exactes, sources, recherche, catalogue, marque, textes/SEO, stratégies, thèmes/versions | SQLite `projects` et tables liées ; contrôle compte + projet à la route et au worker | Une requête IA peut transmettre le contexte et des images du projet au fournisseur choisi ; aucun envoi réel dans ce lot | Versions et acquis préservés ; pas de durée globale approuvée |
| Photos, logos, documents, sons, vidéos, miniatures, dérivés | Répertoire local `storage`, clés compte/projet ; fichiers servis par session ou capacité signée bornée | Import URL/stock/Canva, téléchargements fournisseurs ; code de transport vérifié, fournisseurs **simulés**, DNS/HTTP locaux contrôlés | Suppression logique existante distincte d’effacement ; nouveaux caches indexés, anciens caches non indexés à examiner |
| Consentements/déclarations de personnes, licences et preuves de contenu | Métadonnées `assets.meta` ; nouveau résumé de provenance déclarative | Aucun accord inféré d’une photo, d’un lien ou d’une génération IA | Périmètre, preuve, retrait et durée à décider |
| Tâches, checkpoint, résultat, reçus et historique IA | SQLite jobs/ai_calls/réservations/usage ; root et dépendances liées au compte/projet | Worker ; SDK IA sélectionné, modèle/dépense contrôlés serveur ; pas d’outil privilégié accordé par le texte généré | Acquis conservés ; durée et accès d’assistance à arrêter |
| Abonnement, factures/références Stripe, droits, crédits et comptabilité interne | SQLite ; comptes, propriétaires d’abonnements, contrôles administratifs | Stripe/API/webhooks en code, tests hérités lot 8 ; **aucun paiement réel**, aucun contrat/région confirmé | Conservation financière à valider séparément de l’effacement des créations ; comptabilité interne exclue de l’export automatique, examen manuel requis |
| Assistance et messages | SQLite support_tickets/support_messages ; compte du ticket ou administration explicite | Demande d’effacement liée au ticket ; notification réelle non testée | Durée, pièces et obligations à décider ; conservés dans la politique fictive de test |
| Réglages globaux, clés et OAuth | Réglages chiffrés, connexions et états serveur ; clé maître de l’installation | Hébergeur et secrets du studio réel **inconnus**. Environnement de recette : aucune identité/clé fournisseur configurée | Rotation/révocation réelle hors mission ; aucun secret exporté |
| Logs et limitation d’abus | error_log, rate_events, logs applicatifs/opérateur | Caviardage natif testé ; destinations/collecteur externes inconnus | Événements de limitation nettoyés de manière opportuniste ; pas de politique globale de logs validée |
| Sauvegardes et restaurations | Hors export automatique ; nouvelle mission Claude #163 indépendante | Sauvegarde effective, chiffrement, opérateur, hébergeur et région **non vérifiés** | Décision attendue : calendrier, accès, expiration, propagation de l’effacement après restauration |
| Traceurs, navigateur et liens privés | Session, préférences/thème/langue et état d’interface ; stockage local du navigateur ; capacités temporaires | Aperçu opaque, ressources embarquées, pont restreint au projet ; requêtes externes bloquées dans la recette | Inventaire des traceurs d’une installation réelle et besoin de consentement à examiner ; révocation serveur des liens disponible |

`personalDataInventory()` produit les catégories de tables et leur portée à partir du schéma effectif. `exportAccountData()` distingue les tables exportées, exclues et non attribuables automatiquement. Une correspondance de schéma n’est pas une qualification juridique des données.

### Prestataires : ne pas confondre code et utilisation

Les modules `src/lib/ai/config.ts`, `llm.ts`, `media-providers.ts`, les intégrations, `mail.ts`, Stripe et `social/publish.ts` décrivent les routes possibles (notamment Anthropic/OpenAI/Google/Alibaba/FAL, moteurs image/vidéo via ces routes, stock, Canva, OAuth/CMS et réseaux). **Leur présence dans le code ne prouve ni activation, ni appel, ni contrat.** Dans cette recette : doubles IA/stock, HTTP/DNS et SMTP locaux uniquement ; Next et SQLite réels ; zéro appel fournisseur, paiement et publication. Le réseau de travail est restreint, sans secret/identité fournisseur exposé. Pour le studio réel, Thomas doit fournir au responsable désigné un relevé expurgé des fournisseurs effectivement activés et des appels enregistrés. Ne pas envoyer de clés ni de documents clients dans GitHub.

Pour chaque fournisseur utilisé : relever entité contractante, fonction, catégories envoyées, pays/région documentée, sous-traitants, DPA/conditions applicables, rétention/entraînement, suppression, transferts et garanties éventuelles. **Tous ces champs contractuels/régionaux restent inconnus ici**. L’absence d’une preuve ne vaut pas absence de transfert.

## Procédure d’accès et d’export

1. Connecter le compte fictif A et B séparément. Dans **Mon compte → Mes données**, télécharger le JSON et manifeste. Le lien accepte seulement la session courante, sans identifiant de compte choisi par le navigateur.
2. Vérifier les créations, versions et fichiers A ; essayer les téléchargements sous B puis sans session : refus sans nom/chemin privé. Les médias des projets archivés restent accessibles à leur propriétaire par `/api/me/data-file/…`, sans réactiver le projet.
3. Le manifeste ne contient pas les octets : télécharger les médias avec la même session. Le JSON exclut les secrets, sessions, clés/chemins et la comptabilité interne. Des tables indirectes/non attribuables, sauvegardes, journaux et données chez les prestataires **requièrent un examen manuel**. Ne pas annoncer « demande d’accès complète » avec le seul ZIP/JSON.
4. L’opérateur vérifie identité et périmètre par canal approprié, rassemble les classes manquantes, filtre les données de tiers, documente éventuelles restrictions et remet les éléments via un canal privé. Ne jamais déposer l’export client dans le dépôt public. Enregistrer demande, échéance, responsable et réponse.

Preuves automatisées : suites mission171-registration-privacy et mission171-routes-lifecycle ; recette navigateur native, SQLite et SMTP local distinct des doubles unitaires.

## Effacement : demande opérationnelle, suppression réelle désactivée

L’interface enregistre une demande `pending_policy`, déduplique et crée un ticket propre au compte. Elle dit explicitement qu’aucune suppression n’a eu lieu. **Il n’existe aucune route HTTP de suppression automatique complète du compte.** Le banc `eraseIsolatedAccountFixture()` refuse NODE_ENV autre que test et tout chemin hors base/storage temporaires isolés ; ce n’est pas un outil à lancer dans le studio de Thomas.

Banc fictif testé : annulation/réduction des tâches A, révocation des sessions/connexions/liens, suppression des médias/dérivés et caches indexés A, retrait du contenu des projets, identité pseudonymisée ; compte B intact. Politique **fictive explicite** : traces financières et assistance conservées ; sauvegardes, prestataires et caches historiques non indexés en attente. Le résultat n’est pas une preuve d’effacement physique de la production ni d’exécution chez un prestataire.

Avant une intervention réelle, Thomas doit désigner un responsable et arrêter : conservation financière, assistance, backups, fournisseurs, anciens caches, contrôle des obligations et droits des tiers. Préparer une copie isolée cohérente, y appliquer la politique approuvée, comparer inventaires avant/après (base + fichiers + liens + dérivés + tâches), tester restauration et vérifier B. Journaliser les éléments conservés et motifs. Obtenir validation de la procédure spécifique **avant** toute suppression réelle. Prévoir reprise après interruption et propagation aux sauvegardes/restaurations. Ces deux derniers parcours ne sont pas certifiés dans ce lot.

## Incident : procédure à exercer et responsabilités à désigner

1. Ouvrir un dossier privé horodaté UTC ; désigner pilote, contact technique, responsable de traitement et conseil/DPO le cas échéant. Ne pas publier une faille exploitable ni un export client dans GitHub.
2. Geler les preuves utiles avant modification : SHA/version réellement servie, catégories d’événements, périodes, périmètre et empreintes des artefacts, sans token/clé ni texte client. Conserver les logs source dans un espace restreint ; ne pas écraser les sauvegardes.
3. Confirmer sur copie isolée les comptes/ressources concernés et la possibilité de fuite ; documenter faits, incertitudes, conséquences et mesures de confinement autorisées. Ne pas réessayer une génération ou sonder un tiers pour « confirmer ».
4. Révoquer les accès/capacités concernés et corriger uniquement dans le cadre d’une autorisation opérationnelle distincte ; préserver les preuves et acquis. Rotation réelle, communication aux personnes et notification ne sont **pas exécutées** ici.
5. Le responsable évalue les risques et obligations, tient le registre d’incident, décide des notifications et consigne ses motifs/délais. Préparer un relevé initial évolutif, ne pas attendre tous les détails si une notification est requise.
6. Vérifier le correctif sur comptes fictifs A/B, déploiement contrôlé par la coordination, contrôle de la version servie, suivi et retour d’expérience. Aucun exercice d’incident réel n’a été simulé avec des clients dans cette mission.

## Documents et décisions à faire valider

Confidentialité et information aux personnes ; conditions commerciales/abonnements/remboursements du lot 8 ; répartition responsable/sous-traitant selon les usages clients ; contrats/DPA et transferts prestataires ; registre des traitements ; traceurs et consentements ; conservation et effacement ; sauvegarde/restauration ; licences et autorisations de contenus ; sous-traitance et accès assistance ; procédure de violation. Les modèles de pages légales des démos ne valent pas validation professionnelle.

Sources officielles consultées le **23 octobre 2026** :

- [CNIL — chapitre III du RGPD](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3), notamment articles 12, 15, 17 et 20 : périmètre des droits, délai de réponse et exceptions doivent être qualifiés selon la demande ; la présence d’un export technique ne clôt pas automatiquement le droit.
- [CNIL — violations de données : règles à suivre](https://www.cnil.fr/fr/violations-de-donnees-personnelles-les-regles-suivre) : registre, évaluation du risque, notification à l’autorité sous 72 h si requise et information des personnes si risque élevé ; décision sous responsabilité de l’organisme.
- [CNIL — durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees), publication du 2 avril 2026 : durées liées aux finalités, distinction base active/archivage ; aucune durée universelle inventée ici.
- [EDPB — lignes directrices 07/2020 responsable/sous-traitant, version finale 2.1](https://www.edpb.europa.eu/system/files_en?file=2023-10%2FEDPB_guidelines_202007_controllerprocessor_final_en.pdf) : qualification selon les fonctions réelles, à établir contractuellement et opérationnellement.

Ces références fondent les points à examiner ; aucune certification, consultation juridique personnalisée ni validation automatique de conformité n’est annoncée.
