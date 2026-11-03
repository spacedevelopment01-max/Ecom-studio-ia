# SYNA #301 — vague financière et premier champ services

Source finale : **9636f000effa0eff94e1f4afd0a90557f4daf58d**, arbre **d19870f97ed30785d8916d9237c37fc6ec1335e0**. Compilé propre en production et testé sur stockage temporaire, comptes fictifs et réseau fournisseur interdit. **Aucun fournisseur réel, coût réel, projet client, merge, déploiement ou activation.** #348 reste inchangée ; aucune modification des branches Claude #352/#354. Ce rapport ne certifie pas FULL PARITY.

## Corrections indépendantes et ascendance

| PR brouillon | Tête source | Correctif vérifié |
|---|---|---|
| #349 | 2b1c8aed30829aed7258aa8304d0b39741525bf2 | Blog : accord HMAC borné au plafond SEO existant, preuve persistée POST/worker, idempotence et cible native de réécriture ; confirmation non masquée par le formulaire. |
| #350 | acfa1a93fa74bcc1392c6a6fd8e0fa75b48cc52e | Sections Dominer incluses : forfait/budget recontrôlés au worker, y compris ancien job natif sans marqueur. Aucun devis payant inventé pour une génération incluse. |
| #351 | 5a380543470067c0a4930b260d103370e1ee8cf0 | Nouvelle version publicitaire : campaign_quote existant, estimation/plafond serveur affichés, accord explicite, approvedEstimateMicro exact transmis. |
| #353 | 0426a4789e4af765cd2d1a1e095922c46f30446f | Profil : compteur SQLite réel, PATCH atomique/version obligatoire, clés/alias conservés. Prestations réservables : UUID thème distinct exigé au PUT. Migration additive. |
| #355 (fille #353) | 13d03abf64a0519d40621ccacb5a95712ad5cb28 | SYNA : horaires exacts du profil, avant/après, accord gratuit, CAS/empreinte/relecture/reçu. Bouton de devis payant exclu de cet acte gratuit après défaut UI reproduit. |
| #356 | 9636f000effa0eff94e1f4afd0a90557f4daf58d | Convergence de validation des feuilles ci-dessus, chaîne #348 conservée. Assemblage additif des deux modifications worker. |

Les feuilles #349/#350/#351/#353 partent de #348 e2d8c8ed et non d’un cherry-pick isolé sur main ; #355 requiert #353. Aucun développement stable #348 refait. Les adaptateurs/moteurs et la mémoire existants sont conservés.

## Tests et contrats économiques

- Blog : 3 échecs rouges initiaux reproduits sur #348 (absence/faux accord, worker sans preuve), puis 72 tests/6 suites PASS. La réécriture native exposait aussi une page cible introuvable : cible lue dans le vrai document. Manuel gratuit, première création incluse, quotas, reprise de réponse perdue et mode local sans achat après recharge préservés. Un worker commencé sans checkpoint complet refuse un nouvel achat : aucune reprise automatique du démon prétendue.
- Sections : défaut de recontrôle de forfait reproduit avant SDK ;16 tests/3 suites PASS. Le clic Générer natif est l’accord explicite de la génération incluse ; costUsage(theme).ask=false. Coûts fournisseur simulés enregistrés dans le budget existant, sans nouvel achat commercial ni quota Blog consommé. Retouche exacte locale :0 tentative SDK. Budget épuisé/admin et ancien job rétrocompatible refusés avant SDK.
- Publicité : ancien payload Nouvelle version reproduit409 avant job ;34 tests/3 suites PASS. Annulation0job ; montant serveur exact ; budget/forfait ou prix modifié avant accord refusés. L’original et ses médias acquis restent conservés. La recomposition/redraw de document #318 fermée sans devis compatible demeure distincte de ce parcours campagne.
- Services : trois échecs rouges initiaux (absence CAS, écrasement concurrent, clé perdue au renommage), puis155 tests/7 suites PASS. Migration d’un JSON acquis et huit ouvertures SQLite simultanées. Premier essai multiprocessus bloqué par IPC sandbox : relance locale avec garde réseau intact PASS ; aucune assertion supprimée. Réservation et profil utilisent leurs vraies versions distinctes.
- Horaires SYNA :65 tests/4 suites PASS, dont8 nouveaux cas, repris après correction du bouton de devis. Accord true obligatoire, droits/forfait/drapeau, annulation/expiration, changement concurrent/écran, reçu falsifié et réponse perdue après commit (même requestId rejoué, une seule nouvelle version).
- Convergence :197 tests/17 suites distinctes PASS avant le seul correctif d’affichage du devis ;65/4 PASS après, TypeScript/diff-check PASS, build final production propre PASS. Ces nombres ne sont pas additionnés entre domaines car des suites se recoupent. CI complète sur la tête finale ci-dessous, aucun test retiré ou nouvelle exclusion.

Plafonds40% abonnement HT/50% recharge HT et gardes existants inchangés. La preuve Blog est propre au Blog et à son plafond SEO existant ; aucun nouveau devis universel ni moteur de prix.

## Recettes réelles dans le Studio compilé

Les quatre combinaisons **Encre1440, Encre390, Plein cadre1440 et Plein cadre390** sont vérifiées par l’attribut réel du shell.16/16 parcours PASS au SHA final,56 PNG et16 traces Playwright conservés localement et hachés dans [artifacts.json](artifacts.json). Les images ne sont pas encore ajoutées à la branche GitHub : contrôle automatique de divulgation refusé, accord précis demandé dans [CAPTURES-A-PUBLIER.md](CAPTURES-A-PUBLIER.md). Les preuves JSON et scripts restent consultables.

| Domaine | Parcours observé | Attribution fournisseur et limites |
|---|---|---|
| [Blog](blog/proof.json) | Devis sans job, annulation, accord,8jobs natifs (création+réécriture par scène), article/document/aperçu relus, même article réécrit, quota1 puis0 supplémentaire observé, retouche manuelle conservée après recharge ; réponse de confirmation perdue dans une scène, un seul job.20PNG/4traces. |16 appels HTTP de messages SDK simulés, transport boucle locale. Vrai dispatcher revendiqué en exécution ponctuelle, pas cadence/reprise du démon ni qualité créative réelle. |
| [Sections](sections/proof.json) |4 générations incluses Dominer,4 jobs natifs,4 nouvelles versions ; coût simulé comptabilisé et valeurs budgétaires conservées, quota Blog identique ; aperçu natif réellement ouvert et cadré dans le navigateur.12PNG/4traces. |4 appels HTTP de messages SDK simulés, vrai worker/DB/rendu. Liquid fictif minimal et qualité PROVISIONAL, pas preuve de créativité fournisseur. |
| [Publicité](ads/proof.json) |Ancien payload409 ; annulation0job ; devis exact1166160micro et plafond5529009micro ; accord→1job par scène→3PNG natifs par scène, bibliothèque/GET fichiers/empreintes relus, documents originaux identiques.8PNG/4traces. |Moteur natif avec dépendances copy/image explicitement injectées,12 fabrications techniques de PNG,0SDK/HTTP fournisseur publicitaire. Images synthétiques vertes PROVISIONAL : aucune qualité créative réelle revendiquée. |
| [Services](services/proof.json) |Brouillon manuel intact après au moins17 secondes ; autre écriture native→sauvegarde périmée409 sans perte du brouillon ; proposition→annulation sans effet→accord gratuit→compteur+1/relecture/reçu conservé après recharge. Réponse perdue vérifiée sans second envoi dans une scène. Site/réservation/spend identiques,0job/appel.16PNG/4traces. |Aucun fournisseur, devis ou reconstruction. Débordement natif mobile404px pour390px présent avant la carte et identique après ; carte dans390px, aucun débordement supplémentaire. Signal transmis à Claude sans modifier ses styles. |

20 appels HTTP de messages SDK simulés au total (Blog16+sections4 ; précontrôles éventuels de comptage de jetons non inclus dans ce compteur),12 dépendances image publicitaires injectées, **0 appel fournisseur réel,0€ réel**. Aucun RDV, publication ou lancement externe exécuté.

## Reproduction

Dans un checkout isolé au SHA9636f000 avec ses dépendances et Chromium local, construire avant de copier les scripts de recette, DATA_DIR temporaire neuf et NODE_OPTIONS `--import=$PWD/scripts/lot9/network-guard.mjs`. Ne jamais utiliser un DATA_DIR/DATABASE_FILE/STORAGE_DIR préexistant. Les scripts le refusent et créent eux-mêmes leurs comptes/dossiers temporaires, puis nettoient leurs serveurs et données.

Copier les scripts de ce dossier dans `scripts/.tmp-wave3-blog-ui.ts`, `scripts/.tmp-wave3-services-ui.ts`, `scripts/.tmp-wave3-sections-ads-ui.ts` pour conserver leurs imports relatifs. Exécuter avec `STUDIO_PROOF_COMMIT=9636f000effa0eff94e1f4afd0a90557f4daf58d`, `STUDIO_PROOF_OUTPUT=/tmp/preuves-uniques` et le garde réseau. Le dernier script accepte `STUDIO_DOMAIN=sections` ou `ads`. Un seul navigateur/serveur/build local à la fois ; ports locaux uniquement. Ne pas faire tourner de worker de production. Les scripts activent les drapeaux uniquement dans leurs processus fictifs.

Les premiers essais de recette conservés localement incluent des erreurs de sélecteur/rôle et drapeau AI manquant, ainsi qu’une attente erronée de fenêtre de devis pour l’inclus. Ces erreurs de recette ont été corrigées, sans changement produit sur ces hypothèses. Le seul défaut applicatif supplémentaire démontré dans cette passe est le bouton de devis accompagnant à tort la carte horaires, corrigé dans #355/#356.

## CI — état intermédiaire, aucun vert global anticipé

Au03/11/2026 vers13:28 UTC :

| PR | Run | Suite complète | Docker / confirmation gratuite obligatoire | Recettes natives |
|---|---|---|---|---|
| #349 |41635499512|5323PASS,31 exclusions historiques|PASS/PASS|En cours,64/68 étapes terminées au dernier relevé|
| #350 |41635565293|5309PASS,31 exclusions historiques|PASS/PASS|En cours|
| #351 |41637434761|5309PASS,31 exclusions historiques|PASS/PASS|En cours|
| #353 |41639102317|5310PASS,31 exclusions historiques|PASS/PASS|En cours|
| #355 dernière tête13d03abf |41641320226|À lire sur cette tête|À lire sur cette tête|En cours|
| #356 dernière tête9636f000 |41641586420|En cours|PASS/PASS|En cours|

Le verdict global reste obligatoire et attend tous les contrôles, dont le **quatrième contrôle de confirmation gratuite** inchangé. Les runs antérieurs a7af/2df sont dépassés et ne qualifient pas la tête finale. Les liens des runs sont disponibles sous `https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/<id>`. Ce fichier sera complété par un relevé final attribué aux têtes exactes ; une CI lancée n’est pas une CI verte.

## Matrice et suite

Même matrice84 opérations. Une seule ligne SYNA promue ABSENT→PARTIEL : `services.update`, **horaires exacts uniquement**, sur preuve UI/HTTP/SQLite/reçu. Donc54PARTIEL/28ABSENT/2NON_TESTE. Les quatre autres lignes enrichies concernent les gardes/parcours natifs Blog, sections et Nouvelle version ; elles ne sont pas promues à une parité conversationnelle globale. `services.booking` demeure ABSENT. Prestations/prix/coordonnées non raccordés ; anciens projets A1 et fiche verrouillée exclus de la nouvelle exception horaires. Aucune autre fonctionnalité commencée dans cette vague.

Validation CI finale et autorisation précise de publication des captures encore attendues. Aucune fusion ou activation autorisée par cette livraison.
