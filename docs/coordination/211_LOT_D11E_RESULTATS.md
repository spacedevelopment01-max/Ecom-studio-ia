# #211 D11e — Visuels des annonces natives dans SYNA

## Fait et périmètre

Une campagne préparée par SYNA peut recevoir le visuel manquant d’une annonce, dans le même brouillon natif. Le client choisit carré 1:1, portrait 4:5, story 9:16 ou paysage 16:9, voit ses textes complets, sa référence et le plafond en % du budget, puis confirme séparément. Le moteur existant `realAdDeps.finalAd` / `designPostWithAi` exécute une seule passe. Aucun second moteur, campagne recréée, média existant remplacé, compte connecté, approbation, programmation ou diffusion.

Le produit, sa variante ou la prestation désignés, la marque, la photo et l’angle de communication natifs restent la source. Les routes et tarifs sont figés, les droits et versions revérifiés avant accord, avant chaque appel et avant attache. Une correction humaine empêche l’attache sans perdre l’image acquise. Un bouton propose son réemploi exact après un nouvel accord à 0 %, sans nouvelle IA ni remise à zéro des bornes, même si le portefeuille est épuisé. Un changement de contenu interdit ce réemploi ; il ne devient jamais un achat silencieux. Les anciens reçus restent consultables sans forfait actif ; un fichier absent n’est pas annoncé livré. Checkpoint et idempotence évitent un second achat après interruption.

Code applicatif et build : **`3795837437129313168c0752cdeb887e05dc7c8e`**. Harnais et derniers tests seuls : **`6c7340d55bfc0585cbb10b50699530cc36287797`**, aucune différence dans `src/` ou `worker/`. Base #256 `0d1543b755d80457738edd2f1ca0834f05f09f00` ; correctifs #255 déjà repris par contenu dans cette base, ne pas les réappliquer deux fois. Dépendances #254/#253/#252/#251 conservées. Aucun main, client, thème validé ou travail Claude modifié. Drapeaux inactifs par défaut, Studio client non mis à jour.

## Vérifications réellement exécutées

- **79 tests ciblés distincts réussis** : 45 dans trois fichiers (`conversation211-campaign-visual`, `conversation211-social-production`, `ci-native-production-placement`) et 34 dans `publications-qualite` / `social-native-production-binding`. La première commande contenait aussi deux filtres de noms inexistants : ils n’ont exécuté aucun test et ne sont pas comptés. Les 22 tests publicitaires ont ensuite été rejoués avec des textes de fixture cohérents pour les cas réservés ; ils passent et ne s’ajoutent pas au total.
- `npm run typecheck` et `npm run build` réussis. Build propre exact `37958374`, réutilisé après les corrections du seul harnais. Types vérifiés également sur les fichiers finaux du harnais/tests. Pas de répétition de l’ancienne suite locale complète ; **CI complète finale requise sur la tête publiée**, état indiqué dans la PR.
- `node --import tsx scripts/verify-agent211-build.ts <dossier-vide> --campaign-visual-ui`, garde réseau loopback, **Studio Next compilé + vrai worker + vrais SDK vers faux HTTP** : préparation de deux annonces, devis et accord par clic, une image carrée native, référence effectivement transmise (10 494 octets, SHA vérifié), fichier servi/téléchargé aux octets identiques, texte natif intact, éditeur existant accessible. Deuxième annonce : 503 simulé, un seul essai, échec à moins de 100 %, premier acquis intact, rechargement sans appel, aucune attache à l’annonce échouée. 401 sans session, 404 autre compte, 403 CSRF, 400 plafond forgé.
- Mono-produit, catalogue multi-produits et service ; cas réservés **tendeur de cordage pour cerf-volant** / **réparation de soufflets d’accordéon**. Aucune règle fondée sur ces noms. Les quatre ratios sont vérifiés jusqu’au moteur injecté et au reçu ; le parcours SDK/navigateur complet couvre le carré seulement.

Deux défauts du harnais sont conservés dans l’historique local : sélection trop stricte du libellé du menu, puis transcription publicitaire fictive contenant du texte non rendu. Reproduction minimale : transcription supplémentaire refusée, transcription exacte acceptée. Fixture corrigée, **contrôle qualité natif inchangé** ; aucune répétition aveugle ni plafond relevé. Les refus intermédiaires ne sont pas des succès.

## Preuves consultables

[Commandes, SHA et empreintes](211_D11E_PREUVES.json) · [résultat natif, transport et échec](preuves-211-D11e/native-campaign-proof.json) · [devis ordinateur](preuves-211-D11e/01-devis-annonce-ordinateur.png) · [devis mobile](preuves-211-D11e/02-devis-annonce-mobile.png) · [visuel dans SYNA](preuves-211-D11e/03-visuel-annonce-mobile.png) · [éditeur natif](preuves-211-D11e/04-editeur-campagne-ordinateur.png) · [film réel 13,27 s](preuves-211-D11e/campaign-visual-workflow.mp4).

Quatre captures réellement ouvertes et inspectées. Un film, sans accélération ; les marges grises correspondent au passage du navigateur enregistré de 1440 à 360 px. La mire colorée et la photo simplifiée sont synthétiques et ne représentent aucune création client. PNG natif original et WebM complet conservés dans le dossier de recette/artefact CI, sans duplication dans cette petite sélection Git.

## Partiel / non vérifié

**0 fournisseur réel, 0 € réel.** Les coûts du faux HTTP sont fictifs ; ni facturation fournisseur, intelligence ou qualité créative réelles, ni diffusion en régie ne sont qualifiées. Une réponse JSON de qualité simulée ne valide pas l’esthétique d’une vraie annonce.

Ce parcours crée un visuel par annonce native vide, pas plusieurs déclinaisons dans la même annonce, ni carrousel, vidéo publicitaire, remplacement ou correction payante d’un média existant. Les résultats natifs refusés restent dans la bibliothèque ; seuls les acquis complets sont proposés au réemploi explicite. La relecture de l’angle service reste obligatoire selon les règles natives après modification du contenu. Les anciennes campagnes hors préparation SYNA ne sont pas reprises implicitement.

**#211 n’est pas terminée** : formats et réemploi des publications à compléter, intégration D12/E/F et limites vidéo restantes à traiter séparément ; indicateurs des onglets et nouveaux contenus professionnels/domaines Claude relèvent de l’intégration suivante. Aucune fusion, activation ou mise en service demandée par ce rapport.
