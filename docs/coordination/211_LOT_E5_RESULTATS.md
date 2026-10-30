# #211 — E5 : réutiliser les textes rédactionnels acquis dans la composition

## Fait / cause corrigée

**REPRODUIT :** cinq tests rouges avant correction (un autre contrôle passait). La composition connaissait les textes déjà inscrits dans le thème et les images du projet, mais ignorait les documents acquis séparément dans SEO & Copywriting V2. Leur réemploi dans une nouvelle section échouait faute de source disponible ; les retaper ou les racheter n'était pas une solution.

`src/lib/theme/composition/copy-sources.ts` réutilise désormais la sélection éditoriale **native** `referenceContent` et l'association de pages `sitePages`. Le serveur expose titre et corps complet, avec cible, identifiant/version de document, origine, mode de rédaction et verdict natif. Aucun verdict n'est promu. La priorité aux corrections humaines, la visibilité stratégique et la conservation d'une version utilisable après un essai refusé restent celles du moteur existant.

`server.ts` raccorde ces sources aux seuls modèles réellement rendus et composables. Identifiants de sources liés à la version précise ; ancienne référence refusée après une nouvelle correction. Les textes longs restent des références vers le contenu entier, jamais un extrait présenté comme entièrement lu. Le corps HTML va dans un champ richtext ; `contract.ts`/`assemble.ts` empêchent de le déposer dans un titre et de perdre sa structure. Aucun changement des compositions, médias ou contenus des démonstrations.

Application/build : **`aa93ee05e56ec23f50a52f88ed783881749646f2`**. Harnais final seul : **`512c575fa8283d946fdd11fb65035c7a37cc4d18`** ; sources `src/` et `worker/` identiques au build. Parent #261 `639e026d238759e54c8ece620b0e6d374423f455`, chaîne précédente conservée. Pas de second moteur de rédaction, nouvelle génération ni coût d'application.

## Validé

**40 tests ciblés distincts / 4 fichiers**, en plusieurs passages pendant le code (les passages se recouvrent : ne pas additionner 37 + 38 + 9). Types et build propres réussis. Contrôles : produit, service, deux produits de même titre avec cibles/modèles distincts, modèle partagé ambigu, prestation à identité stable malgré un titre différent ; mauvaise page/langue/compte, correction humaine, essai rejeté, corps long exact, format inadéquat, droits/verrous/version/annulation existants.

**Chromium + Studio compilé + worker réels, interprétation IA HTTP locale simulée :** un parcours service de cartographie non utilisé pour écrire le correctif. Le document préenregistré est une fixture native ; son verdict FINAL est synthétique et explicitement déclaré, pas obtenu par un fournisseur réel. Sa répétition volontaire rend détectable la perte d'un passage ; ce n'est pas du copywriting proposé à un client.

- Proposition → devis gratuit → confirmation → version2 native → aperçu → export Shopify → rechargement sans appel → annulation en version3, original exactement restauré.
- **1 437 caractères de corps HTML acquis conservés exactement**, réglage natif et JSON du ZIP comparés ; paragraphe entier retrouvé dans le DOM de l'aperçu. Source longue non exposée comme lue dans le contexte IA.
- Rendu 1440/1024/390/360 : aucun débordement horizontal ni image cassée ; contenu de la section vérifié dans le cadre du Studio. Même image dans le rendu et le ZIP, octets comparés.
- Formulaire de devis présent, vide refusé, confirmation d'aperçu sans envoi/contact POST ; RDV préservé, non exercé. Source forgée : HTTP422 qualifié, aucune version ni relance supplémentaire. Aucun achat pour la composition ou l'annulation.
- Premier navigateur arrêté par une **erreur du harnais**, après rendu : `JSON.parse` ne lisait pas le commentaire d'en-tête légal d'un JSON Shopify. Correction avec `parseThemeJson`, parseur natif existant ; nouveau navigateur passé, application compilée réutilisée sans changement. Aucun contrôle ni erreur applicative masqué.

Commandes exécutées dans la copie isolée sans `.env`/`.env.local` :

```bash
npm test -- tests/composition211-acquired-copy.test.ts
npm test -- tests/composition211-acquired-copy.test.ts tests/composition211-server.test.ts tests/composition211-plan.test.ts tests/composition211-syna.test.ts
npm run typecheck
npm run build
node --import tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/E5-native-copy-final-proof --acquired-copy-ui
```

Garde réseau : `NODE_OPTIONS=--import=./scripts/lot9/network-guard.mjs`. Build sur `DATA_DIR=/tmp/ecs-e5-build`. Navigateur : `CHROMIUM=/usr/bin/chromium`, runtime Playwright isolé, aucun sélecteur de stockage transmis ; le harnais refuse ces sélecteurs et crée sa base temporaire. La recette CI de composition existante conserve tous ses scénarios, le cas service réservé exerce maintenant la copie acquise ; l'option locale évite de répéter les autres scénarios inchangés.

- [Preuve navigateur et empreinte du ZIP](preuves-211-E5/browser-proof.json), [statuts/commandes avant-après](preuves-211-E5/checks.json).
- [Aperçu du Studio sur ordinateur](preuves-211-E5/01-texte-acquis-apercu-ordinateur.png), [page mobile entière](preuves-211-E5/02-page-complete-mobile.png), [annulation mobile](preuves-211-E5/03-annulation-mobile.png).
- [Film de l'interaction](preuves-211-E5/textes-acquis.mp4).

Trois captures réellement ouvertes. Une seule vidéo d'interaction sélectionnée ; les autres artefacts intermédiaires restent locaux ou reproductibles dans la CI. **0 appel fournisseur réel, 0 € réel** ; coût du dialogue de recette simulé séparé dans le JSON.

## CI complète / limites / suite

La PR reste en brouillon jusqu'à CI finale complète sur sa tête exacte ; ne pas déduire une CI verte des contrôles locaux. L'export Shopify observé porte **PROVISIONAL / static**, pas une boutique installée. Pas de nouvelle recette WooCommerce/PrestaShop/Wix/Squarespace pour ce raccordement ; leurs preuves antérieures ne constituent pas une installation CMS de cette version.

Ce lot **réemploie des documents déjà enregistrés** ; il ne raccorde pas encore une nouvelle demande de rédaction libre à SYNA et ne démontre aucune qualité IA réelle. Un corps dépassant la limite native de 16 000 caractères d'un réglage est refusé explicitement, document intact : pas de troncature silencieuse. Les pages sans association certaine ou partageant un modèle ambigu ne reçoivent pas un contenu d'une autre cible. Pas de création de page métier ni de déverrouillage implicite.

**#211 reste partielle :** nouvelle rédaction/critique Site qualifiée, mode sans thème et autres raccordements D12/E/F/limites vidéo à terminer. #208 et #210 sont toujours ouvertes/non fusionnées aux têtes a0246c77/2a5e9671 ; Claude #245 reste ouverte a69fcf7e, intégration #247/#248 seulement préparée. `main` observé inchangé70204a7f. Aucun code de ses branches recopié, aucun merge/main/déploiement/activation, appel fournisseur, données clients, médias réels ou compositions Claude modifiés.
