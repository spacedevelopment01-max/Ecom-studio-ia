# PR202 — candidat gelé51275d06 : exports compilés vérifiés

**Source exacte : `51275d063b6ee93301ea20438a9ee6100515e3f5`**, dans une nouvelle copie détachée, base de données et médias de test séparés. Main au début de la passe : d2fb63ee. [Identité et préservation des fichiers](identite.json). Aucun code applicatif suivi modifié par cette contre-vérification.

**Statut de cette publication : parcours compilés réussis ; accord global encore en attente de la suite locale complète et de la fin de la CI.** Aucun verdict après fusion ne peut être déduit de ce candidat.

## Le défaut de bundling est réellement corrigé

La recherche des documents dans `node_modules` remplace le `createRequire` détruit par Webpack. Les trois seules différences depuis5a sont ce résolveur, le script de test d'export compilé et son ajout après build dans la CI. Les contrôles et compositions restent inchangés.

- Build local réussi,58 pages ; le message `module.createRequire failed parsing argument` a disparu. [Journal](build.log), [sortie](build.exit).
- **Nouveau script officiel** exécuté sur ce build : version servie51275d06/compiled-build, exportShopifyHTTP200, **ThemeCheckErrors=0,35avertissements,aucune indisponibilité**. [Résultat](smoke-officiel/resultat.json), [journal](smoke-officiel.log).
- **Même script exécuté sur l'ancien build5a : échec attendu**, HTTP200 mais mesure absente et erreur `undefined.resolve`. [Comparaison positive/négative](smoke-comparaison.json), [ancien résultat](regression-sur-5a/resultat.json). Le test détecte donc le défaut précédemment manqué par la CI.

## Vérification indépendante sur un produit et un service

Vrai serveur `next start` de51275d06, compte **client** fictif, abonnement de test ; navigateur local1440/390 après fermeture de l'introduction par clic normal. Sur mobile, ouverture normale de l'ongletAperçu. Deux activités : produit cosmétique de test et site de servicesAtelierRive. Le type `products/services` est explicitement vérifié dans le harnais.

Pour **chaque projet** :

1. Ouverture du Studio compilé et captures réellement inspectées ; aucunJavaScriptError.
2. Appel de la **route locale réelle** d'exportShopify : HTTP200, compteur **ThemeCheckErrors=0**,35avertissements, compatibilité mesurée (absente des critères non mesurés), métadonnées liées à la version demandée.
3. Téléchargement du ZIP rangé en bibliothèque via la route de fichiers : HTTP200 et **SHA256 identique** à l'export reçu.
4. **ThemeSpec complet et liste des versions strictement inchangés**,0appelIA enregistré.

[Résultat complet produit/services](production/parcours-production.json), [version réellement servie](production/version-compilee.json), [captures](production), [trace du chargeur](production-finale-trace.jsonl), [harnais récupérable](contre-verification-202-parcours.mts.txt).

Le verdict d'export reste **PROVISIONAL / static** : aucune boutiqueShopify réelle n'a été installée ou testée. Les requêtes ci-dessus sont celles du Studio local sur données fictives, jamais un fournisseur ni un CMS distant. Aucune nouvelle connexion ni génération payante.

## Examen des35 avertissements

**[Analyse complète et suites recommandées](AVERTISSEMENTS.md)**. Inventaire :25ExcessiveSettingsCount,6UnusedAssign,2UnclosedHTMLElement,1RemoteAsset,1LiquidComplexity. Les35 lignes sont identiques au témoin d2fb avec les mêmes documents locaux et le même SDK.

- Les25 nombres de réglages ont été recalculés dans les schémas :41 à85, pour un seuil d'avertissement recommandé40. Ce n'est pas une limite d'installationShopify démontrée ici. Le suivi principal est l'ergonomie des gros blocs, sans supprimer de champs.
- Les2 signauxHTML portent sur une fermeture/ouverture de colonnes entre conditionsLiquid dans `ap-form`. Quatre rendus natifs contact/devis, vides/remplis : balises signalées équilibrées et colonnes sœurs, **sans réparation par un navigateur**. Cela ne certifie pas tout leHTML ni une installationCMS.
- Les6 variables inutilisées sont des affectations non consommées ; l'image signalée est l'image cachée de zoomFRAISE initialement vide puis renseignée parJavaScript ; la complexité121/120 est un indice statique, pas une mesure de latence.

Tous ces avertissements restent visibles. Aucun seuil, règle, composant ou fichier vérifié supprimé pour verdir la sortie. Les bibliothèques sont présentes dans les ZIP même quand toutes leurs sections ne sont pas affichées sur la page courante ;35avertissements ne signifie pas35pannes visibles. L'absence d'erreur ne prouve ni la qualité créative ni la compatibilité réelle du CMS.

## Préparations conservées, pas confondues avec des réussites

- Premier passage mobile : le harnais cherchait l'export alors que le panneauDiscussion était actif ; attente expirée. Le vrai gesteAperçu est ajouté, délai et assertion de contrôle conservés. [Journal](preparation-mobile.log).
- Le jeuSaaS est classé `products` dans le modèle du studio : ses deux parcours réussis sont conservés comme **produits supplémentaires**, pas comptés comme service. Le passage final utilise le vrai type `services` deRive et l'affirme explicitement.
- Le titre du service est `Site`, pas `Boutique` : un garde visuel trop spécifique a arrêté la préparation, sans défaut applicatif. Le garde vérifie désormais le libellé propre au type d'activité ; l'assertion de validation ThemeCheck reste0. [Journal](preparation-libelle-service.log).

Les données et médias fictifs restent isolés ; bases, sessions et ZIP non publiés. Les captures sont techniques, pas de nouvelles créations client. Aucun média client, aucune clé ni configuration d'exploitation copiée.

## À terminer avant l'accord puis après fusion

Suite locale complète sous garde réseau en cours à cette publication. CI de cette tête : [40362506971](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40362506971), nouvelle étape d'export compilé comprise ; son résultat final sera relu avant accord.

Après fusion par **Claude seul**, relever le vrai SHA main, repartir d'une autre copie, contrôler son identité, ses vérifications et ses exports compilés, puis publier le verdictAPRÈS dans194/195. Les résultats5a ou512 ne seront pas rebaptisés comme résultats de ce futur main. Le studio utilisateur n'est pas déployé ni redémarré par cette mission.
