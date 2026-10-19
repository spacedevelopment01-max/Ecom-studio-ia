Mission suivante autorisée par Thomas — **Lot 2A : deux thèmes de référence, produit et service, intégrés au studio**.

Thomas confirme la refonte et demande de viser le niveau des meilleurs sites professionnels, avec une véritable direction artistique. Il insiste à nouveau : les images présentées dans la conversation doivent être consultables. Cette mission est destinée à sa conversation Codex de développement ; la conversation de coordination prépare les directives et contrôle la livraison.

La [revue du lot 1](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133#issuecomment-6243516238) accepte la correction technique dans le périmètre examiné. Dernière tête vérifiée : `70b6874e83eecb39eae622d4c59422f43fffd677`. Elle ne valide ni l'esthétique ni l'installation réelle dans un CMS.

1. **Préparation et périmètre**
- Relire `CLAUDE.md`, les instructions applicables, le rapport du lot 1 et les directives de thèmes existantes. Vérifier l'état distant et les travaux concurrents.
- Créer une branche dédiée à ce lot à partir de la correction vérifiée, sans modifier ni fusionner la PR #133. Si elle est toujours non fusionnée, ouvrir une PR de suite ciblant sa branche et documenter cette dépendance. Préserver toutes les modifications existantes.
- Livrer deux thèmes fonctionnels dans le studio : un thème de vente de produits et un thème de prestations avec devis ou rendez-vous. Ils doivent être visuellement et structurellement distincts. Le but ultérieur reste 30 thèmes, 15 produits et 15 services ; cette déclinaison viendra après validation visuelle de ces deux références par Thomas.
- Réaliser le travail jusqu'à une livraison consultable et vérifiée. Une intention artistique ou une maquette indépendante ne remplace pas l'intégration.

2. **Direction artistique et contenu**
- Consulter quelques références publiques actuelles de très haut niveau dans les deux catégories, relever précisément composition, typographie, médias, rythme, interactions et parcours mobile. Consigner les liens et ce qui inspire la conception. Produire une création originale.
- Définir pour chaque thème une personnalité, une hiérarchie typographique, une grille, une palette, des espacements et un traitement des images cohérents. La différence doit se voir aussi dans la composition et le parcours.
- Construire des pages riches et utiles : viser environ 8 à 12 sections pertinentes sur chaque accueil de démonstration lorsque le contenu le justifie, avec des compositions variées et un vrai rythme. Éviter remplissage, répétition de cartes, grands vides involontaires et succession de blocs interchangeables.
- Prévoir les pages clés du parcours : accueil, catalogue et fiche produit pour la vente ; accueil, présentation et détail d'une prestation, contact/devis ou prise de rendez-vous pour les services. Les fonctions doivent correspondre à ce que le studio sait réellement fournir. Un service sans vente ne reçoit pas artificiellement panier et fiche produit.
- Rédiger un copywriting français précis : promesse, usages, bénéfices fondés sur les informations disponibles, réponses aux objections et appels à l'action adaptés. Aucun faux avis, chiffre de vente, certification ou résultat. Identifier les contenus de démonstration.
- Utiliser plusieurs vrais visuels pertinents et soignés : plans larges, détails, contextes et cadrages adaptés à chaque section. Réutiliser les ressources autorisées disponibles ou des médias dont la licence est vérifiable ; conserver leur provenance. Les aplats de test et photos sans rapport ne constituent pas une livraison visuelle acceptable. Respecter l'identité du produit et les logos fournis. Ne pas introduire de personnes sans autorisation ou photo fournie.
- Les exemples servent à montrer le système. Aucun nom de marque, métier ou projet de démonstration ne doit devenir une condition cachée du moteur.

3. **Animation, mobile et utilisabilité**
- Prévoir des animations intentionnelles : apparition des contenus, transitions, interactions des galeries, navigation et boutons. Elles doivent mettre en valeur le contenu sans ralentir la lecture ou l'achat. Fournir une version à mouvement réduit.
- Soigner séparément la composition mobile : ordre des contenus, taille des titres, cadrage des images, commandes tactiles, menus, galeries et éventuel bouton fixe. Vérifier qu'aucun élément fixe ne recouvre les informations ou les actions.
- Assurer contrastes, focus clavier, libellés, textes alternatifs et interactions utilisables au tactile. Le contenu doit rester accessible même si les animations sont désactivées.
- Optimiser les médias, réserver leurs dimensions et charger les ressources au bon moment. Mesurer les performances sur l'environnement réellement testé, sans annoncer de score de production non mesuré.
- Vérifier les fonctions visibles : navigation, liens, accordéons, galeries, variantes/panier selon le parcours et formulaires. Lorsqu'une intégration externe manque, l'indiquer clairement dans le rapport et ne pas présenter son fonctionnement comme prouvé.

4. **Galerie de sections, en-têtes, pieds de page et édition**
- Refaire les composants nécessaires aux deux thèmes pour qu'ils soient réutilisables dans la galerie du studio, avec noms compréhensibles et aperçus. Inclure leurs en-têtes et pieds de page comme variantes sélectionnables.
- Permettre ajout, suppression, ordre, textes, images, couleurs, typographies, liens et réglages d'animation dans le modèle de thème existant. Adapter chaque section aux produits/services et aux données disponibles.
- L'édition manuelle et le chat doivent modifier la même source de vérité, avec historique, annulation et protection des modifications du client. Vérifier des demandes telles que changer le style du premier écran, ajouter une FAQ après une section ou changer l'en-tête, sans modifier d'autres fiches.
- Préserver les identités stables, URL et contenus déjà liés, les images propres à chaque offre, les logos importés et les protections du lot 1. Ne pas remplacer les projets existants par les démonstrations.
- Distinguer les vérifications de la chaîne d'édition réelle de celles utilisant une réponse de modèle simulée. Ne pas annoncer une conversation IA réelle testée si aucun fournisseur n'a été appelé.

5. **Exports et généralisation**
- Développer dans le véritable moteur de thèmes et son modèle de données, avec les adaptations nécessaires aux formats exportés. Éviter une présentation qui ne fonctionnerait que dans l'aperçu.
- Vérifier les ZIP Shopify réels : fichiers, sections et réglages, rattachement des modèles aux produits, médias et comportements. Conserver l'information sur l'affectation manuelle après ZIP + CSV tant qu'elle reste nécessaire.
- Examiner les autres exports existants, notamment WordPress/WooCommerce et PrestaShop, et préciser dans une matrice ce qui est conservé, dégradé, non pris en charge ou non vérifié pour ces nouveaux composants. Chaque plateforme doit recevoir le format qu'elle accepte ; aucune équivalence générale sans preuve.
- Tester l'adaptation à plusieurs autres produits et activités, dont des exemples non utilisés pour concevoir les deux thèmes. Vérifier notamment textes longs/courts, images de proportions différentes, plusieurs offres et données absentes. La qualité et le fonctionnement doivent dépasser les deux démonstrations.

6. **Restitution visuelle obligatoire dans ta conversation**
Thomas ne voit pas les vignettes sous « images vues » : elles restent en chargement. Tu dois fournir les résultats explicitement dans ta réponse, sans compter sur ce groupe de vignettes.
- Pour chaque thème, afficher des captures réelles de l'accueil et d'une page produit/prestation, sur ordinateur et mobile. Ajouter des vues rapprochées lisibles des sections, en-tête et pied de page.
- Présenter un aperçu de taille raisonnable directement dans la réponse ET un lien de téléchargement vers chaque PNG original. Utiliser les pièces jointes/liens de fichiers pris en charge par ta conversation avec leurs chemins absolus, jamais une simple mention d'un fichier.
- Publier les preuves dans le dépôt avec des liens GitHub au commit livré, et un index simple indiquant thème, page et taille d'écran. Ces liens durables servent de solution de secours aux aperçus de la conversation.
- Fournir une courte capture vidéo du rendu réel pour montrer animations, défilement et interactions, avec lien téléchargeable. Une image fixe ne démontre pas une animation.
- Avant les captures, parcourir toute la page et vérifier le chargement des médias, y compris les recommandations et éléments chargés au défilement. Inspecter toi-même les images finales et les fichiers liés. Garder les sources originales ; compresser uniquement les aperçus si nécessaire.
- Si le lecteur de la conversation reste inaccessible, fournir immédiatement les fichiers et liens GitHub disponibles. Ne pas affirmer avoir réparé son interface ni supposer que le chargement différé du site explique le problème des vignettes.
- Les captures doivent provenir du thème effectivement généré par le studio, avec son commit et ses données de démonstration identifiés. Aucune image de maquette ne doit être présentée comme une capture du produit livré.

7. **Recette et livraison**
- Effectuer une revue visuelle des deux thèmes à 1440 px et 390 px, ainsi qu'un contrôle des tailles intermédiaires. Vérifier contenu, images, interactions, animation, lisibilité, absence de débordement et éléments fixes.
- Exécuter les contrôles prescrits pour les thèmes modifiés, les régressions pertinentes, la compilation et les vérifications requises par le dépôt. Les tests techniques ne suffisent pas à conclure à la qualité visuelle.
- Corriger les défauts visibles avant livraison. Expliquer les arbitrages et limites sans attribuer une note de qualité artificielle.
- Publier code, tests et preuves dans la PR dédiée. Ajouter `docs/coordination/LOT_2A_THEMES_RESULTATS.md` avec changements, commandes, résultats, SHA testé, liens des captures et vidéo, matrice CMS et éléments restant à valider. Lier cette nouvelle PR et le rapport depuis #133 afin que la conversation de coordination puisse les récupérer sans copier-coller de Thomas.
- Présenter ensuite les deux thèmes à Thomas pour validation visuelle avant d'entamer les 28 autres.

Contraintes maintenues : aucun merge, déploiement, publication client, connexion Google/CMS, appel IA payant ou nouveau service payant dans ce lot. Préserver budgets, accès, forfaits, versions et données clients. Utiliser les ressources disponibles pour avancer ; si un média payant devient réellement nécessaire, documenter le besoin précis et son coût avant toute dépense. Ne pas modifier la page publique d'E-COM STUDIO IA dans cette mission.

Accuser réception dans la conversation de développement et indiquer la branche/PR de travail. Ce commentaire publie la mission ; il ne prouve pas à lui seul qu'une nouvelle exécution Codex a commencé.

## Décisions ultérieures reçues sur #133

Source initiale : https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133#issuecomment-6243584467.

- Le commentaire [6243823904](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133#issuecomment-6243823904), du 18 octobre à 00:40 UTC, demandait de suspendre les anciennes démonstrations en attendant ORBE / Atelier Rive. Cette suspension a été accusée réception et appliquée à sa lecture.
- **Décision actuellement applicable :** le commentaire [6243851508](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133#issuecomment-6243851508), du 18 octobre à 00:43 UTC, remplace cette suspension : « Terminer la version actuellement en cours du lot 2A et livrer ses rendus réels, ses captures consultables/téléchargeables et son rapport pour examen. Ne pas engager une nouvelle reprise autour d'ORBE et Atelier Rive à ce stade : la préparation de ce dossier est mise en pause. »

La livraison présente donc les deux références en cours pour examen ; elle ne présume pas leur acceptation visuelle et ne lance pas les 28 autres thèmes.
