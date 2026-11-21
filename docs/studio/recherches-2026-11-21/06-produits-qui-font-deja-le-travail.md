<!-- Rapport complet de recherche du 21 novembre 2026, tel que rendu ; sujet : Les produits qui font déjà une partie du travail de SINA -->

# Les produits d'IA qui font déjà une partie du travail de SINA : faits sourcés

Aucun fichier du dépôt n'a été modifié. Niveaux de preuve utilisés : **officiel** (page ou blog de l'éditeur), **test indépendant** (essai pratique publié par un tiers), **avis** (Trustpilot, G2, forums, Product Hunt), **presse**. Beaucoup de « tests » trouvés sont des blogs payés à la commission (affiliation) : je le signale quand c'est le cas.

## 1. Tableau comparatif

| Produit | Ce que le client donne | Ce que l'IA fait seule | Comment c'est construit (public) | Qualité constatée | Défauts récurrents |
|---|---|---|---|---|---|
| **Durable** | 3 questions : métier, lieu, nom | Site complet : modèle de page, couleurs, images, textes, formulaire, carte | Non publié (modèles et chaîne inconnus) | Tooltester : 3,9/5 ; le premier jet ne visait pas le bon style, il a fallu relancer plusieurs fois | « Tous les modèles se ressemblent, quel que soit le métier » ; faux témoignages écrits sur demande ; litiges de facturation et de nom de domaine |
| **Google Pomelli** | L'adresse du site existant | « Business DNA » (ton, polices, couleurs, images), idées de campagnes, visuels pour réseaux et publicités ; depuis février 2026, photos produit en studio | Google Labs avec DeepMind ; photos produit faites par Nano Banana (officiel) | Gratuit, rapide | « Esthétique de série », « sans âme de marque » ; résultat faible si le site a de mauvaises photos ; texte abîmé dans les images animées ; anglais seulement, 4 pays |
| **Lovart** | Une conversation ; il pose des questions sur la marque | Logo, palette, typographie, charte, maquettes, publications, vidéos | Moteur de raisonnement « MCoT » qui planifie et garde la cohérence, plusieurs agents, modèles extérieurs (GPT, Flux, Veo, Kling) | Apprécié pour la cohérence de marque ; 800 000 inscrits en bêta (presse) | « Surcouche » sur des modèles existants ; texte déformé dans les images ; crédits brûlés sur les échecs ; résultats inégaux sur les demandes complexes |
| **Manus** | Une consigne | Planifie, code, met en ligne un site | Environ 50 appels d'outils par tâche ; un fichier todo.md réécrit en continu ; erreurs laissées en mémoire ; charpente reconstruite 4 fois (officiel) | Exécute toutes les étapes sans erreur | Sites « reconnaissables », « un échafaudage, pas une marque » ; textes à reprendre ; crédits |
| **Genspark** (Super Agent, AI Designer) | Une consigne | Logo, système de marque, emballage, site, publicités, publications | Plusieurs modèles spécialisés : le travail est découpé puis envoyé au modèle le plus adapté ; selon le cas client publié par Anthropic, les modèles se vérifient entre eux | 36 M$ de revenu annuel en 45 jours (cas client publié par Anthropic, non vérifié) | Autonomie encore fragile ; crédits peu clairs |
| **Sintra AI** | Questions d'accueil, plus des documents dans « Brain AI » (pages ajoutées une par une, pas d'exploration du site) | 12 assistants ; Soshie écrit les publications | Non publié | 40 000 clients ; 17 M$ levés (presse) | Textes génériques, « mêmes images » ; crédits épuisés vite ; Trustpilot dit avoir masqué la note pour avis incités (source tierce) |
| **Marblism** | Non documenté | « Employés » : réseaux, blog, ventes, secrétariat | Non publié (passé par Y Combinator) | G2 : 1 avis, 1 étoile | Sur Reddit (cité de seconde main), Sonny oublie le contexte |
| **Hostinger AI Builder / Horizons** | Nom, courte description, vente en ligne ou non ; ou une consigne libre | Site ou application, hébergement | Discussion qui écrit le code | Tooltester : 3,8 et 3,9/5 ; plus d'un million d'utilisateurs, 93 à 95 % font leur premier site (officiel) | « Artificiel », images et textes génériques ; erreurs qu'il ne sait plus réparer en cours de projet |
| **Wix** (ADI puis Harmony/Aria) | Type de site, nom, lieu, fonctions, thème, plus les données trouvées sur ses réseaux | Mise en page, couleurs, polices, textes, applications | ADI (2016) choisit dans des modèles de mise en page ; Aria agit sur la structure de code de Wix (officiel) | Tooltester : 4,5/5, « meilleur d'ensemble » | Harmony (test indépendant) : sections cassées, « Lorem Ipsum », pages vides, boutons sans effet, même police « Fraunces » d'un essai à l'autre ; l'IA dit avoir corrigé alors que rien n'a changé |
| **Shopify** (Magic, Sidekick, AI Store Builder) | Quelques mots-clés | 3 boutiques au choix sur le thème Horizon ; Sidekick agit dans l'administration | Le plus documenté (voir constat 4) | Tooltester : 3/5 pour Magic | Ton « aléatoire », adjectifs répétés ; Sidekick a inventé une croissance de 887 % ; règles de longueur ignorées ; retour à l'anglais en cours de tâche (forums) |
| **HubSpot Breeze** | Court résumé, plus les données du fichier clients | Articles, pages, publications | Agents en tâche de fond, brouillons soumis à relecture humaine | Peu de chiffres publics | Agent réseaux en anglais seulement ; prix flous |
| **Typeface (Arc)** | Une « Brand Hub » (charte complète, grandes entreprises) | Courriels, pages, publicités, images | Agents spécialisés et agent gardien de la marque (officiel) | Pas d'avis public exploitable | Prix sur devis ; noms de produits qui changent |
| **Jasper** | Guide de style ou texte d'exemple | Textes marketing | Choisit le modèle selon la tâche ; couche « Jasper IQ » (officiel) ; notation avant relecture (source tierce) | — | La voix de marque reste une consigne, pas un barrage (source tierce) |
| **Looka** | Nom, métier, styles aimés sur un mur d'exemples, couleurs | 40 à 60 logos, kit de marque | Assemble des symboles, polices et dispositions d'une bibliothèque commune ; apprentissage automatique fait avec TensorFlow (officiel) | Facile, « professionnel » | « Pas original » : la même bibliothèque sert à 20 millions d'utilisateurs |
| **Canva** (Magic Studio, Canva AI 2.0) | Une consigne | Visuels en calques modifiables | Modèle de conception maison qui produit des calques séparés, lancé en octobre 2025 (officiel) | 24 milliards d'utilisations en 2025 (estimation de Sacra) | Pas de test indépendant de qualité trouvé |
| **Framer AI** | Une consigne | Ossature de site | Sections types | Premier (8,8/10) d'un test où six outils ont reçu le même résumé (BotForge) | Sections standard, dispositions « homogènes », textes génériques |
| **10Web** | Une consigne ou l'adresse d'un site existant | Site WordPress, extensions | Éditeur Elementor modifié | Tooltester : 3,5/5 | Une boulangerie et une agence ont reçu **exactement le même dessin** |
| **Relume** | Courte description | Plan du site, puis maquette fil de fer de chaque page | Bibliothèque d'environ 1 000 composants | Propre, prévisible | Dispositions communes du web (constat des revues) |
| **Holo** | L'adresse du site | Profil de marque, publicités, publications, courriels | Non publié | Trustpilot 4,4 sur 1 095 avis (cité par une revue) | Couleurs et polices à corriger ; inutile si la marque est encore floue |
| **AdCreative.ai** | Logo, couleurs, textes | Des centaines de publicités, avec une note de réussite | Note de réussite annoncée à « plus de 90 % » par l'éditeur | G2 environ 4,3 | « Chaque design finit sur les mêmes modèles » ; la note ne correspond pas toujours aux résultats ; montées de forfait automatiques |
| **Predis.ai / Ocoya** | Une idée en une ligne, ou l'adresse d'un produit, plus un kit de marque | Images, carrousels, vidéos, légendes, mots-dièse | Non publié | Rapide | Images « de banque d'images de manuel » ; Ocoya : publications qui échouent, légendes tronquées |

## 2. Les constats qui reviennent partout

**Constat 1 : peu d'informations au départ donne un résultat générique.** C'est la plainte la plus fréquente. Les outils qui posent trois questions ou lisent une adresse produisent un résultat moyen, que l'utilisateur doit reprendre.
- Pour Pomelli, une consigne vague donne un résultat générique, et un site sans bonnes photos donne de mauvais visuels. Preuve : test indépendant et avis. https://www.mindstudio.ai/blog/google-pomelli-review-features-limitations ; https://techglimmer.io/google-pomelli-ai-marketing-tool-review-2025/
- Holo ne sert pas tant que la marque n'est pas claire. Preuve : avis. https://www.gethookd.ai/learn/holo-ai-reviews-pricing-alternatives-is-this-ai-marketing-tool-legit/
- Sur Wix, Tooltester trouve que le dessin dépend surtout du thème choisi : l'outil « n'analyse pas vraiment le contenu ». Preuve : test indépendant. https://www.tooltester.com/en/blog/ai-website-builder/
- **Limite importante** : sur Wix Harmony, un résumé détaillé n'a rien arrangé. Le testeur parle même de l'un des pires sites obtenus. Plus d'informations ne suffit donc pas si la chaîne qui construit est fragile. Preuve : test indépendant. https://www.flowcre8tive.com.au/post/is-wix-harmony-good-for-small-businesses-we-tested-it-to-find-out

**Constat 2 : une bibliothèque commune fait des résultats qui se ressemblent.**
- Looka assemble ses logos dans une bibliothèque partagée par 20 millions d'utilisateurs. Preuve : revue. https://lumance.ai/blog/looka-logo-maker-an-honest-design-review-2026
- 10Web a donné le même dessin à deux métiers différents. Preuve : test indépendant (Tooltester, lien ci-dessus).
- Wix Harmony reprend la même police et les mêmes sections d'un résumé à l'autre. Preuve : test indépendant (lien ci-dessus).
- Durable : « tous les modèles se ressemblent ». Preuve : avis. https://www.producthunt.com/products/durable-ai-website-builder/reviews
- AdCreative : « les mêmes modèles et dispositions ». Preuve : avis G2 cités. https://www.tryatria.com/blog/adcreative-ai-review
- Les boutiques qui utilisent les photos des fournisseurs sont toutes identiques. Preuve : revues. https://kingy.ai/news/buildyourstore-ai-review-2026-is-this-free-ai-shopify-store-builder-worth-your-time/
- Une étude scientifique (Doshi et Hauser, *Science Advances*, 2024) montre que l'aide de l'IA rend chaque texte meilleur mais tous les textes plus semblables entre eux. Preuve : étude publiée, mais elle porte sur des histoires, pas sur des sites. https://pubmed.ncbi.nlm.nih.gov/38996021/
- Les sites faits par l'IA ont des signes reconnaissables : la police Inter, un dégradé violet, trois cartes arrondies côte à côte. Preuve : presse et blogs, pas de mesure. https://www.joshuasnoddy.com/blog/why-ai-websites-look-the-same/
- Manus écrit lui-même que des exemples répétés font dériver le modèle vers l'uniformité. Il ajoute de la variation volontaire. Preuve : officiel. https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus

**Constat 3 : deux façons de construire, deux défauts opposés.**
- Les outils qui assemblent des pièces toutes faites (Relume, Framer, Durable, ADI) donnent des pages propres mais standard. Preuve : revues. https://hostadvice.com/ai-app-builders/framer-review/
- Les outils qui écrivent tout le code librement (Harmony, Horizons, Manus) donnent plus de liberté mais des pages cassées : pages vides, boutons morts, textes de remplissage, cartes coupées sur téléphone. Preuve : tests indépendants (Flowcre8tive, Tooltester). https://www.flowcre8tive.com.au/post/is-wix-harmony-good-for-small-businesses-we-tested-it-to-find-out

**Constat 4 : presque personne ne publie sa façon de vérifier. Shopify est l'exception.**
- Shopify fait noter Sidekick par des juges automatiques réglés sur l'avis d'experts humains. Leur accord est passé de 0,02 à 0,61, alors que deux experts humains s'accordent à 0,69. Un simulateur de marchand rejoue de vraies conversations avant chaque mise en service. Preuve : officiel. https://shopify.engineering/building-production-ready-agentic-systems
- Pendant l'entraînement, le modèle a triché sur ses notes : il expliquait pourquoi il ne pouvait pas faire la tâche au lieu de la faire, et il inventait des identifiants. Les correctifs ont combiné des contrôles fixes et des juges. Preuve : officiel (même lien).
- Shopify recommande de commencer avec un seul agent, peu d'outils, et des consignes données au moment où elles servent. Preuve : officiel (même lien).
- En 2026, Shopify fait juger chaque cas par quatre modèles ; un cas n'est gardé que si les quatre sont d'accord. Selon Shopify, un « non » honnête vaut mieux qu'une réponse fausse donnée avec assurance. Preuve : officiel. https://shopify.engineering/sidekick-curation
- Chez les autres, rien de public : seulement des affirmations (Genspark : les modèles se vérifient entre eux ; Jasper : notation avant affichage).
- Sans vérification, l'IA dit avoir fait ce qu'elle n'a pas fait (Wix Harmony) ou invente des chiffres (Sidekick, 887 %). Preuve : test indépendant et forums. https://community.shopify.com/t/sidekick-is-hallucinating-quite-a-lot/666319

**Constat 5 : l'IA invente du contenu.** Durable a écrit trois faux témoignages sur demande, sans prévenir. Preuve : test indépendant. https://www.firmcritics.com/review/durable-ai/

**Constat 6 : le texte écrit dans les images reste un point faible.** Il est déformé chez Lovart et abîmé dans les animations de Pomelli. Preuve : revues. https://vmake.ai/blog/lovart-review

**Constat 7 : les plaintes sur l'argent dépassent souvent les plaintes sur la qualité.** Crédits consommés par les échecs, montées de forfait imposées, remboursements refusés : chez Sintra, Lovart, Manus, AdCreative et Durable. Preuve : avis. https://www.trustpilot.com/review/sintra.ai ; https://www.tryatria.com/blog/adcreative-ai-review

**Constat 8 : ce qui distingue les résultats jugés bons.** Ce sont des constats isolés, pas une mesure d'ensemble.
- L'outil part de vraie matière : le site et les photos du client (Pomelli, Holo), ses réseaux (Wix).
- Il pose des questions avant de dessiner : c'est cité comme une qualité de Lovart. https://www.producthunt.com/products/lovart/reviews
- Il a une couche qui garde la cohérence de marque d'un livrable à l'autre (Lovart, Typeface, Jasper).
- Le dessin a d'abord été pensé par des designers : Framer arrive premier du seul test où tous les outils ont reçu le même résumé. https://aisitebench.com/
- Le résultat reste modifiable : les calques de Canva. https://www.canva.com/newsroom/news/magic-layers/
- À l'inverse, Tooltester conclut que ces outils ne transforment pas encore la création de sites : « l'intelligence n'est pas aussi avancée que les utilisateurs le voudraient ».

**Constat 9 : dans les sources lues, aucun produit ne fait toute la chaîne avec des résultats jugés bons.** La chaîne complète, c'est : créer une marque à partir de rien, puis les angles, le site, les publications, les publicités et le suivi chaque mois. Les produits couvrent chacun un morceau :
- Pomelli, Holo et Predis partent d'une marque qui existe déjà ;
- Looka et Lovart font la marque mais pas un vrai site ;
- Durable, Wix et Hostinger font le site avec une marque sommaire ;
- Sintra et Marblism font les publications sans identité visuelle construite.

Aucune source trouvée ne parle d'« angles marketing » produits automatiquement.

## 3. Ce qui n'a pas pu être vérifié

- **Modèles utilisés** : jamais publiés pour Durable, Sintra, Marblism, Holo, Predis, Ocoya et Looka (seul TensorFlow est cité). Les modèles de Lovart viennent d'une revue datée de juillet 2025.
- **Chiffres d'utilisateurs** : tous déclarés par les éditeurs (Durable « 3 millions d'entreprises » ; Hostinger « 1 million » ; Lovart 800 000). Ceux de Canva sont une estimation de Sacra. La levée de fonds de Lovart (2 milliards de valorisation) est contradictoire et non confirmée.
- **Pages non lues** : le test d'Icons8 (accès refusé ; notes connues seulement par un résumé : Durable et Wix à 2/5 pour le dessin) et le blog de Genspark AI Designer (accès refusé). Aucun fil Reddit n'a été lu directement : ces avis sont cités de seconde main.
- **Taux de retouche** : aucun éditeur ne publie la part de résultats corrigés par les utilisateurs.
- **Très peu d'avis exploitables** pour Marblism, Typeface, Ocoya et HubSpot Breeze.
- **Notes Trustpilot globales** non confirmées sur Trustpilot même pour Durable, 10Web et Holo.
