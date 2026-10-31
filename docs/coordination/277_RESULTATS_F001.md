# #277 — contrôle indépendant de #278, candidat f0019338

**SHA contrôlé : `f0019338a4b975f2daabc8ee912a339c2107b2b7`. Verdict : NO-GO provisoire pour valider tous les parcours annoncés**, à cause du routage des sites publiés lors d’un lancement avec `-H 127.0.0.1`. Le même build fonctionne avec `-H localhost` ; le défaut est conditionnel, pas une indisponibilité universelle. Claude doit le corriger ou qualifier explicitement les conditions supportées, puis fournir le SHA à recontrôler. Aucune modification concurrente de son moteur n’a été faite.

Mission #276/#277. [Préparation publiée](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/277#issuecomment-6540313133). Copie indépendante, branche `codex/277-sondes-croisees`, créée au SHA candidat. Seuls tests, harnais et preuves ajoutés. **Aucun merge, main, déploiement, activation réelle ou donnée client modifié ; 0 appel fournisseur / 0 € réel.** Les flags et publications de recette sont confinés aux nouveaux processus et bases fictives.

## Conservation et version réellement exécutée

**CONFIRMÉ PAR GIT** : sommets Claude `a69fcf7e0938f31c08b0a55320588d4c6060c45f` et Codex `42ef034c00c7f6d92fc0ef14ce2818c520506931` ascendants du candidat ; aucun de leurs fichiers livrés absent. Les douze fichiers modifiés par rapport à chaque sommet correspondent aux cinq fichiers communs et aux correctifs d’intégration relus. Les cinq fichiers communs sont identiques octet pour octet au résultat de la simulation textuelle indépendante. `theme-base/` est identique à main ; aucune composition Claude retouchée.

Diff entre `731277d51ca8e16b8158fcf316c4b00659fa5ea8` et le candidat : documentation/preuves seulement. Cela permet d’expliquer la CI antérieure, pas de l’attribuer à tort au nouveau SHA. Le build a été refait une fois sur le candidat propre ; `/api/version` des recettes renvoie **f0019338 / production / clean / compiled-build**. Les ajouts de tests sont postérieurs à ce build et ne modifient aucun fichier applicatif. [Preuve de conservation](preuves-277-f001/conservation.json).

## Défaut à traiter : H1, routage du site selon le bind

**P1 — REPRODUIT, OBSERVÉ DANS LES TRACES ET CONFIRMÉ DANS LE CODE.**

1. Démarrer ce build avec `next start -H 127.0.0.1 -p PORT`, `SITES_DOMAIN=sites.recette.test`, nouveau stockage de recette.
2. Publier par les API natives un site fictif : adresse active, `site_live`, manifeste et fichiers sont présents.
3. Une vraie requête HTTP avec Host de cette adresse retourne **404 `Not Found`**, y compris à l’accueil. Avec le port dans Host ou `x-forwarded-host`, même échec. `x-forwarded-proto: https` produit 500 dans ce montage HTTP.
4. Sans changer ni le code ni les publications, redémarrer avec **`-H localhost`** : accueil et listes de biens à **200**, chemins Studio sur cet hôte à **404**.

Trace instrumentée des seules entêtes (aucun bundle/source modifié) :

```text
/                     Host = site-fictif.sites.recette.test
/api/site-host        Host = localhost:PORT ; x-ecs-site-host = site-fictif.sites.recette.test
lecture dans la route x-ecs-site-host = null → 404
```

Le rewrite est traité comme un nouveau transport vers localhost ; le middleware repasse et retire son marqueur interne. Fichiers : `src/middleware.ts:13–20`, puis garde `src/app/api/site-host/[[...path]]/route.ts:16–18`. Ce code middleware est hérité de Claude, inchangé par les merges ; on ne prétend pas avoir reproduit toute l’ancienne branche ni tout hébergement réel. **Garder la double vérification et le refus d’un en-tête forgé.** Ne pas « réparer » en acceptant librement un marqueur entrant.

[Variantes sans instrumentation](preuves-277-f001/host-127-variantes.json) · [trace ciblée](preuves-277-f001/host-127-trace.txt) · [témoin localhost sur les mêmes publications](preuves-277-f001/host-localhost-temoin.json) · [recette stricte finale en échec](preuves-277-f001/metiers-127-final.json). Signalé dans [#278](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/278#issuecomment-6541536619), précisé par [A/B](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/278#issuecomment-6541592587) et transmis dans #276. **Ce rouge reste rouge** ; les résultats localhost/aperçu ne l’effacent pas.

Correction conseillée à Claude : distinguer la normalisation d’URL de Next et le Host public lors du rewrite, ou documenter/tester une condition de lancement effectivement supportée ; aucune confiance supplémentaire dans les en-têtes client. Critère de non-régression : pages du site servies, routes Studio inaccessibles, marqueur forgé refusé et propriétaire isolé, dans les configurations retenues. Aucune correction moteur proposée à l’aveugle par Codex.

## Contrats croisés vérifiés indépendamment

| Point | Résultat et portée de la preuve |
|---|---|
| C1 — source métier commune | **REPRODUIT** : carte publiée, devis/accord d’export, retrait du plat sans nouvelle version de thème ; empreinte changée et export refusé dans le worker avant création du ZIP. Pas de débit ni d’appel. La source projetée inclut carte/réalisations dans les tests d’intégration existants. |
| P1 — retouche recouverte au rendu | **REPRODUIT** : devis/accord d’une retouche de galerie, réalisation publiée avant le worker ; 409 `agent_theme_business_content`, aucune version ni livraison mensongère. Les gardes de conservation de section/liaison de texte sont aussi vérifiés dans les tests existants. |
| **P5 — prestations/réservations** | **REPRODUIT**, pas seulement lecture de l’en-tête : vraie réservation en base fictive → composition native → annulation exacte → réouverture. Prestations, en-tête, prix/durée et réservation conservés ; doublon du créneau refusé, autre créneau accepté. Une correction humaine des prestations pendant la file reste intacte et invalide l’ancienne composition. Aucun correctif P5 supplémentaire justifié dans ce périmètre. |
| Tables après transaction annulée | **REPRODUIT** : lectures/initialisations carte, réalisations, sites, notifications, maintenance et domaines dans une transaction annulée, puis nouvelle utilisation sans état `ready` périmé. Pas de migration de vraie base. |
| P2 — vérité du raccord | **CONFIRMÉ DANS LE CODE ET TESTÉ** : six opérations métier indiquées sans adaptateur SYNA ; observation des contenus et de l’état hébergé en lecture seule. Une API native disponible n’est pas présentée comme une exécution depuis la conversation. |
| R4 — effacement | Test d’intégration existant réexécuté : répertoire du compte de recette A supprimé, B conservé. La suppression automatique de production reste désactivée. Aucun compte client effacé. |

Les cinq nouvelles sondes sont dans [integration277-cross.test.ts](../../tests/integration277-cross.test.ts). Cognition structurée simulée explicitement, vrais moteurs natifs, SQLite et versions ; aucune authentification fournisseur ou qualité IA réelle déduite.

## Parcours réellement rejoués

**Studio compilé f0019338, serveur/worker/SDK/bibliothèque natifs et fournisseur HTTP loopback simulé** :

- Deux parcours communs produit/service, du dialogue de tâche à la rédaction entière, composition, aperçu, retouche, annulation, réouverture et export. Multi-produit : changement de variante, vrai panier d’aperçu à deux articles / 25 800 centimes. Service : contact en aperçu, devis/RDV non raccordés dans SYNA dits comme tels. Préparation/charte/images de fixture déjà acquises : ce n’est pas une création créative unique de zéro à publication. [Résultats](preuves-277-f001/parcours-syna.json).
- Trois parcours logo dans le même processus : produit, service et cas instruments à vent ; deux accords, application native, neuf téléchargements/empreintes par kit, reprise sans nouvel achat. [Résultats](preuves-277-f001/logos.json).

**Recette métier indépendante, sans aucun fournisseur, sur le même build lancé avec `-H localhost`** :

- Agence fictive : bien à vendre et bien à louer, médias techniques distincts ; artisan de services : réalisation publiée ; salon : prestations et réservation. API natives avec 401/404/403/428/409, publication locale V1, correction humaine, V2 et restauration V1.
- **Hôtes des sites réellement servis par HTTP** : dix rendus (accueil, achat/location, réalisations) à 1440/390, 200, aucun débordement ni image cassée. Les captures ont été ouvertes et inspectées. Ce sont des illustrations synthétiques et du contenu de recette, pas des photos client ni une qualification esthétique.
- Demande de devis enregistrée par le POST `/contact` du site local : une ligne métier. **Pas de vrai e-mail envoyé**, état de notification conservé. Réservation via l’API publique native : 201 et une ligne en base fictive ; ni agenda externe ni rendez-vous client réel.
- Site en ligne inchangé après correction métier tant qu’une nouvelle publication locale n’a pas eu lieu ; V2 visible, restauration V1 effective par HTTP. Aucun déploiement ni domaine public.

[Preuve HTTP/navigateur complète localhost](preuves-277-f001/metiers-localhost-final.json) · [aperçus et fichiers matérialisés contrôlés séparément pendant le blocage](preuves-277-f001/README.md). Le mode complémentaire `--preview-only` garde explicitement **`PARTIAL_PUBLIC_HOST_BLOCKED` et code de sortie 2** : il ne transforme pas une page d’aperçu en preuve d’un site publié.

## Commandes et statuts

[Journal des commandes exécutées, SHA et empreintes, échecs compris](preuves-277-f001/commandes.json).

- **109 tests existants** ciblés réussis / 11 fichiers, puis **149** / 13 autres fichiers : accès, droits, coûts, contenus, sauvegarde/restauration, migrations, hébergement, notifications et domaines.
- **5 sondes croisées** réussies ; horloge de fixture fixée pour les réservations. Types de la livraison réussis. Build propre f0019338 réussi, une seule compilation applicative locale.
- Deux ZIP acquis de la recette commune : Theme Check officiel réellement relancé sur leurs octets, sans nouvel export/job : **0 erreur / 35 avertissements chacun**. [Messages/fichiers/lignes](preuves-277-f001/shopify-avertissements.json). Ni installation Shopify ni achat validé. Les avertissements ne sont pas supprimés.
- CI exacte f0019338 : [41185167523](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41185167523). Suite/types : **4 467 réussis / 31 ignorés**, 511 fichiers réussis / 1 ignoré ; Docker réussi. Recettes natives encore en cours au relevé de rédaction : consulter le verdict daté publié dans #277/#278 pour le dernier état, sans attribuer l’ancien vert à cette tête.

Les échecs de mise au point du harnais restent visibles : mauvais réglage de composant de fixture, type readonly du harnais, `fetch` ignorant Host (contrôle écho), hypothèse sur l’URL de galerie. Ils ont été corrigés uniquement dans les tests/recettes, pas en retirant des contrôles applicatifs. Le cas Host final 127, lui, est reproduit avec HTTP natif et reste un défaut conditionnel signalé.

```bash
# Build propre de la candidate d’abord, stockage neuf et garde réseau héritée.
export STOCK_OFFLINE=1
export NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs"
node node_modules/vitest/vitest.mjs run tests/integration277-cross.test.ts

# Le harnais refuse les sélecteurs de données hérités et tout répertoire de preuve déjà rempli.
node --import tsx scripts/verify277-business-build.ts /tmp/277-NEUF-localhost \
  --bind-localhost --expected-commit=f0019338a4b975f2daabc8ee912a339c2107b2b7
node --import tsx scripts/verify277-business-build.ts /tmp/277-NEUF-127 \
  --expected-commit=f0019338a4b975f2daabc8ee912a339c2107b2b7
```

## Ce qui reste partiel ou bloqué

H1 et sa condition de lancement sont transmis à Claude ; **pas de GO final tant que ce point n’est pas traité/qualifié et le SHA final revérifié**. La CI complète de cette tête reste à lire jusqu’au terme. Aucun assouplissement de délai, suppression de garde ou contrôle retiré.

Les actions SYNA sur contenus métier/devis/RDV restent **non raccordées**, honnêtement annoncées ; les API/écrans natifs fonctionnent dans les limites ci-dessus. La composition détaillée de toutes les prestations et la réconciliation générale des anciens contenus restent partielles. Les neuf propositions #211 ne sont pas développées. Aucun nouveau moteur concurrent.

Non vérifiés ici : fournisseur/cognition/qualité commerciale réels, tous les pixels des quinze maquettes avec leurs kits privés, SMTP/DNS publics, CMS installés, paiement, synchronisation externe et Studio réellement servi au propriétaire. Contretemps et VANS n’ont pas été ouverts ni modifiés ; protection des données par fixtures, VANS étape 1 seulement. Main reste `70204a7ff83eb2382835a27a37a8465c0851a70a` ; toute fusion, activation et mise en service demeurent interdites dans cette livraison.
