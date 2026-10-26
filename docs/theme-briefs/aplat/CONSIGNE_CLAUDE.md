# APLAT — Plâtrerie & Peinture : reproduire les maquettes à l’identique

Consigne de Thomas, 25 octobre 2026. Ce dossier autorise l’intégration du thème APLAT dans E-COM STUDIO IA, famille **Prestations de services**, pour une activité de plâtrerie, préparation des supports et peinture intérieure. Identifiant proposé : `aplat`, à vérifier contre les identifiants actuels. Le nouveau nom est **APLAT** : ne reprendre aucun ancien nom ni ancien logo.

## Résultat attendu

Je veux ce thème précis, au pixel près sur ordinateur et mobile. Ne propose pas de nouvelle direction artistique, ne simplifie aucune page, ne remplace pas la composition par un thème générique. Reproduis toutes les sections, proportions, images, recadrages, espacements, titres, couleurs, tracés, transitions de matières, bandeaux et pieds de page des dix planches jointes. La démonstration doit être complète et navigable avant de choisir le thème. Le thème doit ensuite être réellement modifiable dans le studio.

Les dix PNG sont les références originales, sans redimensionnement ni recomposition. Leur inventaire avec dimensions et SHA-256 figure dans `MAQUETTES_ORIGINALES.json`. Les planches 01 à 05 sont ordinateur, 06 à 10 téléphone. Les numéros 01 à 18 inscrits dans les images désignent les pages, pas les noms de fichiers.

Tu dois ouvrir et examiner réellement les dix planches, puis chaque panneau à sa taille native. Ne te fie pas uniquement à cet inventaire. Une planche rassemble plusieurs pages : les colonnes ne sont pas un seul écran. Les pages mobiles 1/2 et 2/2 sont deux morceaux successifs de la même page, pas deux routes. Ne code pas les bordures de planche ni ses légendes dans le site.

## Références et conflits

Les maquettes APLAT de ce dossier remplacent les anciennes versions de plâtrier-peintre. Les maquettes gouvernent la forme ; les données réelles du client gouvernent ses coordonnées et ses informations. Toute donnée manquante reste « À renseigner » dans la démo. N’invente pas de nom, adresse, numéro de téléphone, zone, certification, assurance, délai, prix, équipe, années d’expérience, avis ni nombre de chantiers.

Les photos HD du ZIP sont des **reconstitutions IA** à partir des maquettes, pas les photographies originales exactes. Ce fait est consigné dans l’inventaire. Leur disponibilité ne t’autorise pas à modifier la composition : retrouve les cadrages et proportions de la référence avec `object-fit`, `object-position`, masques et dégradés. Les maquettes restent l’autorité visuelle. N’affirme jamais qu’une photographie reconstituée est l’originale ni qu’un rendu différent est une conformité parfaite.

La paire avant/après 02/03 représente une simulation sur la même géométrie et le même point de vue. Conserve l’étiquette « Simulation avant/après » et le caractère illustratif, jamais « chantier réalisé » sans preuve. Les autres réalisations sont également illustratives. Les images ne doivent pas contaminer les projets réels des utilisateurs quand ils choisissent ce thème.

## Direction visuelle à reproduire

- Blanc et blanc cassé texturé, bleu pétrole profond, bleu nuit pour les titres, gris bleuté discret, noir charbon pour certains pieds. Mesurer les couleurs sur les références, ne pas se contenter de valeurs approximatives de ce texte.
- Logo architectural APLAT fourni en transparence : conserver son dessin, ses proportions et sa typographie. Il ne s’agit pas d’un logo à réinventer.
- Titres sans empattement, fermes, avec les mêmes césures et la même hiérarchie ; textes fins, aérés, légendes et numérotation bleues. Identifier les polices locales les plus proches et expliquer tout écart restant.
- Héros photographiques de chantier, enduit blanc en transition vers la photo, grands aplats bleu pétrole portant le titre, photos de matière et raccords précis. Ne pas ajouter de personnes.
- Respecter les différences de pied de page et de composition présentes dans les planches. Ne pas tout homogénéiser arbitrairement.
- Mobile : vraie composition spécifique, grand logo, menu plein panneau, empilement et cadrages tels que dessinés, barre « Mon projet / Contact » là où elle apparaît. Éviter tout masquage du dernier contenu par les éléments fixes.
- Les icônes simples sont codées en SVG cohérents et accessibles ; titres, formulaires, états, boutons et textes restent du HTML éditable, jamais une image géante de la maquette.

## Pages et sections à livrer

| Page | Contenu obligatoire |
|---|---|
| 01 Accueil | Héros « Des murs justes. Des espaces qui changent. », 3 métiers, matière et outils, cartes prestations, bandeau détails et raccords, projets illustratifs, simulation avant/après, méthode en étapes, FAQ, appel à projet, pied complet. |
| 02 Prestations | Héros « Les bonnes bases. Les belles finitions. », 3 prestations détaillées avec photos et listes, approche préparer/protéger/raccords/finaliser, projets liés, FAQ et appel à devis. |
| 03 Plâtrerie | Héros « Dessiner les volumes. », cloisons/doublages/plafonds/joints, méthode, bloc supports, FAQ et chantier lié. |
| 04 Peinture | Héros « La couleur change la perception. », préparation du support, protection, teintes, finitions, 3 couleurs, simulation avant/après et FAQ. |
| 05 Réalisations | Héros, filtres Tout/Plâtrerie/Peinture/Préparation, 6 exemples illustratifs, accès aux détails et chargement supplémentaire sans fausse pagination. |
| 06 Détail chantier | Informations illustratives, support/préparation/finition en 3 étapes, galerie de détails, comparateur avant/après et projets similaires. |
| 07 Notre approche | « Le soin du support. Le sens de la finition. », méthode écouter/observer/préparer/finaliser avec visuels, appel à projet. |
| 08 FAQ | Recherche, catégories, accordéons, panneau d’aide et liens vers devis/contact. |
| 09 Contact | Héros, liens vers devis/FAQ/réalisations, formulaire complet nom/e-mail/téléphone facultatif/sujet/message, consentement et coordonnées à renseigner. |
| 10 Devis | Projet (plâtrerie/peinture/les deux), neuf/rénovation, pièces, surface facultative, commune/code postal, calendrier, description, photos facultatives, coordonnées/consentement ; sur téléphone conserver le parcours en 2 étapes de la planche 08. |
| 11 Enduits et préparation | Observer, reprendre les irrégularités, traiter les joints, préparer la mise en peinture ; photos, prestations complémentaires et FAQ. |
| 12 Conseils | Héros, catégories, article principal, cartes avec photos, liens et appels à projet. |
| 13 Article conseil | Fil d’Ariane, titre, sommaire à ancres, 3 sections photos (vue générale/détails/zones), liens et articles liés. |
| 14 Confirmation de devis | Récapitulatif des données saisies, statut honnête, suite et FAQ ; seulement après succès réel en production. |
| 15 Mentions légales | Structure et ancres de la maquette, informations inconnues « À renseigner », pas de faux identifiant d’entreprise. |
| 16 Confidentialité | Rubriques, ancres/accordéons mobiles, contenus à adapter au fonctionnement réel, pas de promesse de sécurité inventée. |
| 17 Cookies | Préférences, essentiels toujours actifs, mesure et contenus externes désactivés par défaut, tout refuser/enregistrer/tout accepter et réouverture des préférences. |
| 18 404 | Photo, grand 404, retour accueil et prestations, raccourcis complémentaires. |

Tous les en-têtes, pieds, menus, panneaux de préférences, champs invalides, envoi en cours, échecs d’envoi, ajout/suppression/échec des photos sont inclus. La planche 10 montre un état de validation condensé : ne remplace pas le formulaire complet de la planche 08 par cet écran d’exemple et ne crée pas un troisième parcours contradictoire.

## Fonctionnement réel

Créer les routes et liens correspondant aux panneaux, sans bouton mort ni lien `#` de remplacement. Navigation active, retour navigateur, clavier, focus visible, fermeture du menu au clic/Échap, accordéons et catégories, recherche FAQ et filtres de réalisations doivent fonctionner.

Le comparateur avant/après doit bouger au pointeur, au toucher et au clavier, avec les deux images alignées et des libellés accessibles. Ne pas déplacer un simple trait sur une photo unique.

Photos de devis : accepter JPG/PNG, limite de 10 Mo par fichier telle que montrée, valider type et taille aussi côté serveur lorsque le service existe, afficher miniature/nom/suppression/erreur. Les photos d’exemple ne sont pas des pièces jointes du client. Conserver les champs entre les étapes et en cas d’échec. Désactiver les doubles envois. Vérifier les champs nécessaires et afficher les erreurs près des champs avec un résumé accessible. Ne pas annoncer « demande reçue » avant une réception effective.

Dans la démonstration, simuler explicitement l’envoi, sans envoyer d’e-mail ni de données vers un vrai destinataire ; écrire « démonstration — demande non envoyée ». La confirmation peut être visitée comme état de démonstration, mais ne prétend pas à une réception réelle. En production, utiliser les mécanismes existants configurés du studio ; si aucun service n’existe, expliquer le blocage, ne pas fabriquer un succès. Aucun prix automatique : un devis exige l’étude du projet.

Consentement et préférences : enregistrer les choix et les appliquer réellement aux intégrations présentes. Aucun traceur optionnel chargé avant accord. Si aucune intégration n’est configurée, le dire et garder les options inactives, sans faux partenaires ni fausse bannière réglementaire. Adapter les informations légales aux données réelles ; ne pas inventer leur validation juridique.

## Intégration dans le studio

Lire intégralement le `CLAUDE.md` actuel et le skill de vérification du thème avant de coder. Utiliser la branche de travail actuelle à jour et coordonner les fichiers partagés avec les autres conversations. **Récupérer uniquement `docs/theme-briefs/aplat/` depuis cette branche de brief**, ou le commit ciblé de documentation, sans réinitialiser le code applicatif vers la vieille base de cette branche.

Ajouter APLAT aux services selon le registre actuel, sans migration silencieuse ni suppression d’autres thèmes. Créer sa démonstration intégrale. L’ouverture de la démo ne modifie pas le projet ; « Choisir ce thème » applique la structure avec les données du client, sans reprendre les projets, photos ou contacts de démonstration. Vérifier les garde-fous de forfait et les exports effectivement supportés pour les sites de services.

Tous les titres, textes, photos, recadrages, CTA, liens, couleurs, FAQ, étapes, prestations, réalisations, articles, coordonnées, rubriques légales et navigation doivent être modifiables et persistants dans le studio. Les modifications doivent survivre au rechargement et se retrouver dans l’aperçu et l’export. Utiliser les composants et stockages existants, sans valeurs métier cachées dans le CSS. FR/EN selon les conventions du projet.

Les médias HD envoyés par Thomas restent dans un kit privé `public/demo/aplat/` (ou le chemin privé équivalent validé) hors suivi Git ; vérifier le `.gitignore`. Les maquettes de référence et la consigne sont autorisées sur GitHub. Ne pas envoyer les photos de production du ZIP dans le dépôt par défaut. Faire correspondre les fichiers selon `INVENTAIRE_IMAGES.csv` et `AFFECTATIONS.csv` livrés dans les ZIP.

## Contrôle visuel et livraison attendue

1. Inventorier chaque panneau et chaque section avant de modifier le code. Donner une correspondance page/route/sections pour les 18 pages, menu et états.
2. Extraire les panneaux à leur échelle native et mesurer leur largeur de contenu. Capturer le rendu du navigateur aux mêmes dimensions utiles, sans mesurer la planche composite entière comme un viewport. Ne pas étirer une capture pour cacher un écart. Définir aussi les contrôles 360, 390, 430, 768 et 1440 px.
3. Pour chaque panneau, produire référence, capture, superposition à 50 % et image de différence. Comparer surtout grille, dimensions, césures, cadrage, couleur, distances et hauteur des sections. Corriger les différences visibles puis recommencer. Les photographies reconstituées sont signalées séparément dans le bilan ; ne pas se servir de leurs différences pour ignorer les écarts de mise en page.
4. Tester menu, navigation, filtres, FAQ, avant/après, formulaire multiétape, retours et erreurs, import/retrait/format/taille des photos, consentement, préférences, 404, persistance des modifications du studio et absence de débordement horizontal. Aucun envoi d’e-mail réel ni appel IA payant pour ces contrôles.
5. Exécuter les contrôles requis du dépôt pour les fichiers réellement modifiés (`tsc`, tests applicables, vérification du thème). Donner les commandes et les résultats exacts ; toute vérification non faite est indiquée.
6. Livrer une PR d’implémentation avec commit et aperçu vérifiable, tableau des panneaux réalisés/manquants, captures et différences, limites connues. Ne pas fusionner ni déployer sans demande de Thomas. La validation visuelle finale appartient à Thomas ; ne pas annoncer « identique au pixel près » sans preuves concordantes.

Ne touche pas aux autres travaux pour gagner du temps et ne lance aucune génération IA payante. Le propriétaire fournit le dossier de médias : ouvre d’abord les maquettes et prépare l’intégration ; attends ses ZIP pour brancher les photos de production.
