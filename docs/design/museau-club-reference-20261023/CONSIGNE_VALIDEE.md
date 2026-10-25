# Claude — reproduire MUSEAU CLUB d’après les maquettes de Thomas

## Demande et résultat attendu

Thomas demande de reproduire à l’identique le thème multiproduit pour chiens présenté dans cette conversation, puis enrichi à sa demande. Il demande explicitement de transmettre cette consigne sur GitHub avec les références, comme pour HEUREN, Atelier Rive et TRAVERSE. Cette autorisation porte sur la réalisation ; elle ne constitue pas une validation du futur rendu.

Refaire uniquement MUSEAU CLUB dans le moteur existant du studio. Il s’agit de la boutique niche à quatre produits de la famille **Produit spécifique / Boutique spécialisée**, et non de la famille E-commerce. Préserver ce classement et les droits associés.

Ne pas proposer une interprétation du style : reprendre composition, ordre des sections, proportions, grandes photographies, typographies, couleurs, boutons, courbes, espacements, cartes, en-têtes et pieds de page des références. Ne pas revenir au thème antérieur ni simplement lui appliquer du bleu. La copie doit rester une vraie boutique éditable, jamais une page entière affichée comme image.

## 1. Références prioritaires — ouvrir les images avant de coder

Les huit JPG du dossier `maquettes/` sont les références visuelles. Ils conservent les dimensions des images montrées à Thomas ; aucune réduction de taille. Voir README.md pour leur ouverture locale, leur périmètre et la galerie.

| Fichier | Autorité |
| --- | --- |
| 01-accueil-enrichi.jpg | Dernier accueil enrichi, ordinateur et téléphone : remplace l’accueil de la première planche. |
| 02-harnais-laisse-enrichis.jpg | Dernières fiches harnais et laisse : remplacent les fiches initiales. |
| 03-collier-pochette-enrichis.jpg | Dernières fiches collier et pochette : remplacent les fiches initiales. |
| 04-boutique-reference.jpg | UNIQUEMENT la colonne centrale Boutique / Collection ; les accueils latéraux sont obsolètes, ne pas les recopier. |
| 05-panier-commande.jpg | Panier rempli, panier vide, commande, confirmation, panier mobile. |
| 06-club-journal-article.jpg | Le club, journal, article complet et son adaptation mobile. |
| 07-tailles-aide-contact.jpg | Guide des tailles, FAQ, contact, livraison et retours, FAQ mobile. |
| 08-compte-pages-legales.jpg | Connexion, compte client, détail de commande, mentions légales, confidentialité, CGV et préférences de cookies. |

Les premières fiches produit simplifiées sont volontairement exclues. Les numéros ou légendes intégrés aux planches sont des repères de présentation, pas du contenu à afficher dans le site.

## 2. Identité et médias

- Conserver le logo MUSEAU CLUB existant avec son symbole museau et sa typographie ronde. Ne pas recréer un logo approximatif depuis les lettres déformées d’une photo générée.
- Palette : bleu cobalt dominant, ivoire/crème, bleu poudré et accents jaune doux ; titres arrondis épais, corps lisible. Mesurer les couleurs et les proportions dans les références, pas choisir arbitrairement une variante.
- Quatre produits seulement : harnais, laisse, collier, pochette à sacs. Tissu cobalt, doublure crème lorsqu’elle existe, boucles noires et pièces métalliques argentées. Garder la forme et les détails propres à chaque produit.
- Le dossier `medias/` réunit **31 originaux déjà présents dans le projet** : logo, cinq vues de chacun des quatre produits et dix ambiances. Copies Git identiques aux sources `public/theme-assets/museau-club/`, pas de nouvelle génération. Leur inventaire distingue clairement ces sources des photographies visibles seulement dans les maquettes.
- Les scènes de chiens des nouvelles planches ne sont pas toutes disponibles en photos originales séparées. Ne pas annoncer le contraire. Établir une matrice section → photo de la maquette → fichier réellement utilisé → fidélité / écart. Une zone photographique de la planche peut être extraite sans texte ni interface si sa qualité suffit à la taille d’affichage ; ne pas agrandir artificiellement une vignette en la déclarant haute définition. Si la scène exacte manque et ne peut pas être extraite proprement, poursuivre les autres sections et consigner précisément le média manquant. Aucun remplacement silencieux par une autre scène.
- Aucune personne ni main ajoutée, aucune marque externe, aucune banque d’images, aucune génération payante ou régénération non demandée. Les chiens sont prévus par les maquettes.
- Textes, boutons, icônes et composants restent HTML/CSS/SVG natifs et modifiables. Aucun texte commercial collé dans une photographie.
- Installer les médias durablement, avec chemins qui fonctionnent après nouvelle installation et dans les exports. Aucun lien temporaire ChatGPT, dossier privé absent ou URL signée comme dépendance.

## 3. Accueil enrichi — conserver toute la richesse

Reprendre l’ordre et le rythme de 01-accueil-enrichi.jpg :

1. En-tête et grande ouverture avec le chien : « LE BONHEUR EST AU BOUT DE LA LAISSE. », sous-titre et bouton « On sort ? ».
2. Les quatre cartes produit avec images, noms, prix et liens vers leurs propres fiches.
3. Grande scène « Il attend ce moment toute la journée. ».
4. Harnais en gros plan, « De près, tout se joue dans les détails. », détails physiques et repères visuels.
5. « Quatre essentiels. Une même allure. » : photo et produits assortis.
6. « Le petit tour devient une aventure. » : trois scènes distinctes, parc, bord de mer, forêt.
7. Guide des tailles avec illustration et lien fonctionnel.
8. « Un club pour les amoureux des balades. » : présentation de la marque.
9. Derniers articles avec vraies pages liées.
10. FAQ avec ouverture/fermeture fonctionnelle.
11. Bandeau final « Sa laisse est prête. Et vous ? », inscription et pied de page complet.

Ne pas supprimer de section sur téléphone. Adapter les dispositions sans transformer la version mobile en résumé appauvri. Les liens de scènes doivent mener à un contenu pertinent existant, sans fausse catégorie de produits.

## 4. Quatre fiches produit enrichies, chacune complète

Chaque produit possède sa route, ses médias et son contenu propres. Reprendre les deux planches enrichies :

- Galerie principale avec vues secondaires, navigation et zoom ; panneau d’achat lisible avec nom, prix de démo, couleur, quantité et ajout au panier.
- Choix de taille et guide sur harnais/collier seulement ; pas de tailles fictives sur laisse/pochette. Les tailles de démonstration ne deviennent pas des données validées d’un client réel.
- Détails en gros plan, repères sur les pièces visibles, grandes scènes d’usage, textes courts et composition alternée.
- Trois vues de mise en situation / détails, sans images répétées artificiellement.
- Harnais : « Le signal de sa prochaine aventure. », détails de doublure et boucles, guide des tailles.
- Laisse : « Le lien de vos plus belles sorties. », poignée, sangle et mousqueton ; composition « Les essentiels, réunis avant de partir. ».
- Collier : « Son petit signe distinctif. », boucle, anneau et doublure ; guide de mesure du cou.
- Pochette : « Le petit essentiel qu’on n’oublie plus. », fermeture, attache, sortie des sacs ; « À sa place, avant chaque départ. ». Montrer son attache à la laisse, pas comme un objet suspendu directement au cou du chien. Corriger cette ambiguïté présente dans certaines images de la maquette.
- Accordéons Détails / Entretien / Livraison et retours, questions fréquentes adaptées au produit, sélection complémentaire excluant le produit déjà consulté, appel à l’achat final, newsletter et footer.
- Barre d’achat mobile : bon produit, bon prix, sélection de taille si utile, quantité et ajout ; ne masque ni le contenu, ni les cookies, ni les contrôles du panier.

## 5. Toutes les autres pages et tous les états

Construire la boutique avec quatre références, filtres pertinents et cartes menant à la bonne fiche ; Le club ; journal ; gabarit d’article complet ; guide des tailles ; FAQ ; contact ; livraison et retours ; panier rempli ET vide ; commande ET confirmation ; connexion ; compte client ; détail de commande ; mentions légales ; confidentialité ; CGV ; préférences de cookies.

Les liens Créer un compte, Mot de passe oublié, Adresses et Informations personnelles doivent avoir un parcours cohérent dans la même charte, même si leur écran détaillé n’est pas dessiné sur une planche. Ne pas ajouter des fonctionnalités backend parallèles ni fabriquer de données personnelles. S’appuyer sur les capacités natives réellement disponibles ; signaler leurs limites par plateforme.

Panier : ajout depuis les quatre fiches et les cartes, combinaison produit/variante, quantités, suppression, sous-totaux, état vide et sauvegarde/réouverture. Ne pas transformer les recommandations en articles déjà facturés. Un seul exemplaire du harnais à 49 € et de la laisse à 29 € donne 78 € de sous-total.

Pour Shopify et les autres plateformes, le paiement/compte natif peut ne pas accepter le même habillage : reproduire les vues dans la démonstration et documenter exactement ce qui est exportable/personnalisable. Aucune fausse confirmation réelle, aucun faux suivi, aucune collecte de carte dans un formulaire de démo. Les écrans de commande/confirmation de démonstration sont clairement identifiés et restent sans transaction.

## 6. Textes et corrections obligatoires des artefacts de génération

Conserver les accroches, le ton et la hiérarchie des maquettes. Corriger les fautes et déformations typographiques sans réécrire arbitrairement les textes.

Prix fictifs de démonstration : harnais 49 €, laisse 29 €, collier 25 €, pochette 15 €. Ne jamais injecter ces prix dans un projet client réel. Les frais de livraison inconnus sont « calculés à l’étape suivante » ; 78 € est un sous-total, pas un total définitif taxes/frais compris lorsque des frais restent à calculer. Corriger les libellés trompeurs des planches.

Les assertions automatiques dans les images ne constituent pas des caractéristiques validées : « convient à tous les chiens », résistance, durabilité, confort universel, sécurité, garantie, délais, mesures ou compatibilités ne doivent pas être inventés. Conserver la place et la présentation du texte, avec formulation neutre fondée sur les détails visibles. Aucun faux avis ou score. Les conseils de taille doivent renvoyer aux mesures validées du produit, pas prescrire systématiquement la taille supérieure. Gabarits légaux clairement à compléter et valider ; pas de société/adresse/numéro inventé. Copyright 2026, pas 2024 malgré certaines images.

Les mentions « à renseigner » sont acceptées dans les gabarits de démo concernés, mais doivent être traitées proprement sur un vrai site client. Les boutons de réseaux sociaux nécessitent de vraies destinations configurées ; pas de liens vides. Une différence nécessaire avec la maquette doit être listée dans le rapport, jamais cachée.

## 7. Studio, galerie, adaptation et exports

- Implémenter dans les sections et composants existants, pas un site isolé hors moteur.
- Chaque composition doit être disponible et reconnaissable dans la galerie de la famille de MUSEAU CLUB, avec un aperçu fidèle, en section ou variante réutilisable. Respecter les fonctions uniques de la bibliothèque et les droits centralisés ; ne pas gonfler artificiellement le nombre de sections.
- Champs éditables : textes, images et cadrages desktop/mobile, CTA, liens, couleurs et réglages utiles. Tester insertion, déplacement, duplication autorisée, sauvegarde et réouverture.
- Avant sélection du thème : démo complète avec ses pages et ses données, sans modification du projet. Après sélection explicite : adaptation au client, conservation de la composition et de ses données ; aucune fuite du nom, logo, chien, prix, texte ou article de MUSEAU CLUB.
- Tester un projet différent à quatre produits. Vérifier les correspondances produit → images → prix → fiche → panier, y compris variantes, remplacement d’une image et données absentes. Ne pas mélanger les quatre produits.
- Vérifier médias, navigation, styles et interactions dans les exports pris en charge. Déclarer les fonctions testées localement et les limites natives ; ne pas prétendre à un paiement ou une installation réelle non effectués.

## 8. Contrôle page par page et réception visuelle

Ouvrir les références via un outil visuel local et confirmer leur lecture avant de réaliser. Une liste de fichiers ou une requête textuelle GitHub n’est pas une consultation visuelle.

Procéder dans cet ordre : accueil enrichi, harnais, laisse, collier, pochette, boutique, panier, autres pages. Pour chaque page : produire le rendu, comparer à la référence à largeur identique, relever les différences, corriger puis recapturer. Ne pas attendre la fin pour découvrir un décalage général.

Captures intégrales ordinateur 1440 px et téléphone 390 px, contrôles de débordement 360/430 px. Vérifier produit entier, titres lisibles, absence de chevauchement, menus, galerie/zoom, FAQ, filtres, formulaires et leurs états, panier, liens footer, navigation retour en haut de page, clavier, reduced-motion et contraste. Animations sobres compatibles avec la composition ; pas d’ajout qui change la direction validée.

Livrer dans `docs/coordination/MUSEAU_CLUB_RESULTATS.md` : SHA réellement testé ; tableau page / référence / conformité / écarts / correction ; matrice des médias et manquants ; galerie/édition/adaptation ; résultats des tests, build, types et contrôles de thèmes applicables ; limites des exports et de l’environnement. Fournir les captures complètes et comparaisons côte à côte dans un dossier de preuves accessible, avec liens Markdown valides. Une CI verte ne remplace pas la comparaison visuelle ni la validation finale par Thomas.

## 9. Périmètre à préserver

Préserver HEUREN, Atelier Rive, TRAVERSE, les autres thèmes et l’accueil commercial du studio. Ne pas reprendre le lot IA ni modifier tarifs, moteurs ou projets clients en dehors des adaptations strictement indispensables à MUSEAU CLUB. Toute correction partagée exige un contrôle de non-régression des thèmes existants.

Continuer sur la base actuelle de la PR #167 en préservant le travail déjà livré, sans reset ni écrasement. Aucun appel IA réel, paiement/envoi réel, fusion ou mise en ligne demandé. Après validation du rendu, pas de changement sans nouvelle consigne. Ne pas déclarer le studio de Thomas à jour sans preuve de la version servie.
