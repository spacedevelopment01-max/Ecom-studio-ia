# MUSEAU CLUB refait d'après les maquettes enrichies du 23 octobre : résultats à valider

Consigne : PR #167, commentaire 6359277162 (copie : `docs/design/museau-club-reference-20261023/CONSIGNE_VALIDEE.md`).
Dossier : `docs/design/museau-club-reference-20261023/` (commit `0a870161`) — 8 planches, 31 médias, identiques octet
pour octet à `public/theme-assets/museau-club/` (31/31 empreintes vérifiées).
Travail limité à MUSEAU CLUB. HEUREN, Atelier Rive, TRAVERSE, les autres thèmes et l'accueil du studio sont conservés.

**Rien n'est marqué « validé » : la validation visuelle et commerciale revient à Thomas.**
Les tests automatiques prouvent que les choses marchent. Ils ne prouvent pas que le rendu est bon.

Code vérifié : commit `93386ba0` (branche `claude/themes-differenciation`) : démonstration exportée, captures,
comparaisons, parcours d'interactions et vignette faits sur ce commit (`demo.json` → `93386ba00af2…`). Le rapport et
les preuves sont dans le commit suivant. Preuves : [`docs/design/museau-club-reference-20261023/resultats/`](../design/museau-club-reference-20261023/resultats/).

## En bref

- Famille **Produit spécifique / Boutique spécialisée**, profil « club », titres **Nunito 900** (police libre, licence
  OFL livrée : `assets/fonts/licenses/Nunito-OFL.txt`), textes DM Sans, palette cobalt `#0A30CC`, jaune doux `#FAEA72`,
  crème, bleu poudré, bleu nuit. Logo existant conservé (fichier inchangé).
- **33 pages** dans la démonstration, toutes faites de sections du thème modifiables dans le studio (aucune page n'est
  une image) : accueil en 11 blocs, 4 fiches enrichies, boutique, panier rempli et vide, exemple de commande et de
  confirmation, club, journal, 5 articles, guide des tailles, FAQ, contact, livraison et retours, 7 écrans de compte,
  3 pages légales, bandeau de cookies.
- **Prix de démonstration** : harnais 49 €, laisse 29 €, collier 25 €, pochette 15 €, toujours annoncés « Prix de
  démonstration ». **Tailles XS, S, M, L seulement sur le harnais et le collier.** Harnais M + laisse = **78 € en
  sous-total**, livraison « Calculée à l'étape suivante », aucun libellé « Total ».
- **Aucun paiement, aucun envoi** : « Passer commande » mène (dans l'aperçu seulement) à un exemple de commande sans
  aucun champ de carte ; les champs des écrans de compte et de commande sont désactivés.

## Page par page : référence, conformité, écarts, corrections

Comparaisons à largeur identique (maquette à gauche, rendu à droite) dans `resultats/comparaison-*.jpg`.

| Page | Référence | Conformité | Écarts restants | Corrections faites pendant la recette |
|---|---|---|---|---|
| Accueil ordinateur | planche 01 | 11 blocs dans l'ordre : ouverture voile clair, 4 cartes produit, panneau « Il attend ce moment… », harnais et 3 gros plans numérotés, « Quatre essentiels. Une même allure. », photos à pastilles, guide des tailles illustré, « Un club pour les amoureux des balades. », articles, FAQ avec photo, newsletter sur photo | photos de chiens de la planche absentes du kit (voir matrice) ; pastilles renommées d'après les photos réelles (« Au parc », « Dans l'herbe », « Avant de partir ») | taille des boutons, logo à marges transparentes compensé, voile, FAQ à gauche |
| Accueil téléphone | planche 01 (colonne droite) | même ordre, 2 × 2 cartes, texte de l'ouverture sous la tête du chien | les panneaux s'empilent (photo puis texte) au lieu de rester côte à côte : choix de lisibilité à 390 px | ouverture alignée en bas, débordements supprimés |
| Harnais | planche 02 gauche | fil d'Ariane, galerie + vignettes, 4 médaillons, couleur, tailles XS–L, guide, quantité, bandeau, détails, « En situation », guide des tailles, accordéons, « Complétez la balade. », FAQ, appel final avec prix | barre d'achat fixe montrée seulement sur téléphone (sur ordinateur elle recouvrait le contenu) | appel final en panneau (photo en hauteur), titres plus grands |
| Laisse | planche 02 droite | trio « Les essentiels, réunis avant de partir. » posé sur photo, accordéons dans un cadre, FAQ, appel final « Toujours plus loin, ensemble. » 29 € | photo de la maquette (chien au bord de mer) absente : photo de collier et laisse sur banc | sections restantes de la composition de base retirées, trio réécrit, légendes non coupées |
| Collier | planche 03 gauche | « Son petit signe distinctif. », 3 détails, « En images. », guide des tailles avec bulle, « Complétez le look », « Questions fréquentes. », appel final | photo finale (chien) absente : coffret ambiance-10 | voile clair à droite ajouté, panneau pour la photo du beagle |
| Pochette | planche 03 droite | pochette accrochée à la laisse (ambiance-03), détails, « À sa place, avant chaque départ. », FAQ, appel final | photos de berger australien absentes | — |
| Boutique | planche 04 (colonne centrale) | « La collection promenade. », pastilles Tous / Harnais / Laisses / Colliers / Pochettes (filtrage réel), 2 × 2 grandes cartes, guide des tailles, « Complétez la promenade. » relié par des « + » | « confort » retiré du sous-titre (non vérifié) | 1 px de débordement à 360 px corrigé |
| Panier rempli | planche 05.1 | bandeau photo « Votre panier », lignes avec couleur et taille, quantité, « Supprimer », code de réduction, livraison, sous-total 78 €, « Passer commande », « Continuer mes achats », « Complétez la balade ? » sans les articles déjà au panier | la taille se change sur la fiche, pas dans le panier (limite de Shopify : une ligne = une variante) ; « Ajouter au panier » des suggestions devient « Voir le produit » (le collier demande une taille) ; « Total » remplacé par « Sous-total » | — |
| Panier vide | planche 05.2 | « La prochaine balade commence ici. », « Découvrir la collection », « Nos essentiels » | logo-chien décoratif de la maquette non repris | — |
| Exemple de commande | planche 05.3 | contact, adresse, livraison « À calculer », paiement, récapitulatif 78 € | **aucun champ de carte** (consigne) : l'étape paiement dit que le paiement se fait sur la page sécurisée de Shopify ; bouton « Voir l'exemple de confirmation » au lieu de « Payer 78 € » | — |
| Confirmation | planche 05.4 | « Exemple de confirmation », « Merci, la balade peut commencer. », photo, récapitulatif | texte « Votre commande a bien été enregistrée » remplacé : aucune commande n'est passée | — |
| Panier téléphone | planche 05.5 | une colonne, récapitulatif sous les lignes, suggestions en cartes horizontales | — | — |
| Le club | planche 06.1 | ouverture, « Un chien. Quatre essentiels. Mille sorties. », « Le quotidien, en bonne compagnie. », 4 détails | « Des matières agréables » neutralisé en « Une doublure en maille crème » | — |
| Journal | planche 06.2 | ouverture, pastilles Tous / Balades / Conseils / Le club (filtrage réel), cartes avec catégorie sur la photo | 5 articles au lieu de 4 ; photos sans chien | — |
| Article (ordinateur, téléphone) | planche 06.3 et 06.4 | fil d'Ariane, titre, chapeau, photo, intertitres, encart « Toujours prêts pour la prochaine aventure. », articles similaires | photos de chiens de la planche absentes | une seule H1 par article |
| Guide des tailles | planche 07.1 | « Bien choisir, avant de partir. », « Comment mesurer ? » illustré, tableau XS–L « À renseigner », fiches harnais et collier, « Un doute ? » | **« privilégiez la taille au-dessus » supprimé** (consigne) : « comparez vos deux mesures, écrivez-nous » | — |
| FAQ (ordinateur, téléphone) | planche 07.2 et 07.5 | recherche, thèmes Produits / Commande / Livraison, 12 questions, « Vous ne trouvez pas la réponse ? » | réponses non vérifiables laissées « à renseigner » | — |
| Contact | planche 07.3 | formulaire nom, e-mail, message avec états vérifiés (vide, e-mail incomplet, envoi, succès, échec simulé), photo, « Une belle communauté, même à distance. » | pas de champ « Sujet » ni d'ajout de photo (le formulaire de Shopify ne transmet pas de fichier) | — |
| Livraison et retours | planche 07.4 | « Tout savoir avant de commander. », cartes Livraison / Suivi / Retours avec pictogrammes, toutes les valeurs « À renseigner », « Une autre question ? » | — | — |
| Connexion, compte, commande n°1001 | planche 08 (haut) | écrans reliés : connexion → mot de passe oublié / créer un compte → mon compte → commande, adresses, informations, déconnexion | date « 12 avril 2024 » non reprise (inventée) ; adresse et paiement « À renseigner » | — |
| Mentions légales, confidentialité, CGV | planche 08 (bas) | ouverture, « Modèle de démonstration : contenu à compléter et à valider », sommaire automatique, une rubrique par titre de la maquette | encadrés en un seul bloc jaune au lieu d'un par rubrique | titre en double retiré (une H1) |
| Bandeau de cookies | planche 08 (confidentialité) | « Vos préférences de cookies » : Tout refuser, Personnaliser (mesure d'audience, publicité), Tout accepter ; lien « Cookies » du pied pour rouvrir | désactivé par défaut pour tous les autres thèmes et pour les clients (choix du marchand) | — |

## Matrice des médias (section → photo de la planche → fichier utilisé → fidélité / écart)

Seuls les **31 originaux du kit** sont utilisés (test : chaque fichier est montré, aucun autre). Aucune image générée,
aucun extrait de planche agrandi, aucune personne ni main ajoutée. Le kit ne contient que **trois photos de chiens**
(`ambiance-02` golden en harnais dans l'herbe, `ambiance-04` beagle au collier, `ambiance-09` golden en harnais devant
une porte bleue) ; les planches en montrent une vingtaine. Chaque remplacement est indiqué ci-dessous, aucun n'est caché.

| Section | Photo de la planche | Fichier utilisé | Fidélité / écart |
|---|---|---|---|
| Accueil : ouverture | golden en harnais devant des arches blanches | `ambiance-02` | même chien et même harnais ; décor différent (herbe) |
| Accueil : 4 cartes, boutique, suggestions | packshots | `harnais-01`, `laisse-01`, `collier-01`, `pochette-01` | fidèle |
| Accueil : « Il attend ce moment… » | golden au bord de mer | `ambiance-09` | chien présent, mer absente |
| Accueil : gros plans numérotés | maille, boucle, anneau | `harnais-01` (agrandi dans le thème), `harnais-03`, `harnais-04` | fidèle ; l'agrandissement est un recadrage par le thème, pas un fichier modifié |
| Accueil : « Quatre essentiels » | golden au bord de mer | `ambiance-01` (collection sur socles) | **écart** : pas de chien |
| Accueil : pastilles « Au parc / En bord de mer / En forêt » | trois chiens en extérieur | `ambiance-07`, `ambiance-05`, `ambiance-03` | **écart** : objets sans chien ; pastilles renommées « Au parc / Dans l'herbe / Avant de partir » pour dire ce que montre la photo |
| Accueil : « Un club… » | golden dans les fleurs | `ambiance-04` (beagle) | chien présent, autre race |
| Accueil : FAQ | golden allongé, montagnes | `ambiance-08` (harnais et pochette sur damier) | **écart** : pas de chien |
| Accueil : newsletter | golden au coucher du soleil | `ambiance-10` (coffret) | **écart** : pas de chien |
| Harnais : bandeau | golden au bord de mer | `ambiance-02` | chien en harnais ; décor différent |
| Harnais : détails, situations | maille, golden | `harnais-03`, `ambiance-05`, `harnais-04`, `ambiance-09` | proche |
| Harnais : appel final | golden | `ambiance-09` | fidèle |
| Laisse : bandeau | golden au bord de mer | `ambiance-07` (collier et laisse sur banc) | **écart** : pas de chien |
| Laisse : trio sur photo | trio sur rochers fleuris | `ambiance-01` (trio sur socles bleu poudré) | même idée, autre décor |
| Laisse : appel final | golden au bord de mer | `ambiance-02` | chien présent |
| Collier : bandeau | épagneul au collier | `ambiance-04` (beagle au collier) | chien au collier, autre race |
| Collier : appel final | épagneul | `ambiance-10` (coffret) | **écart** : pas de chien |
| Pochette : bandeau | berger australien, pochette | `ambiance-03` (pochette accrochée à la laisse) | **écart** : pas de chien ; la pochette est accrochée à la laisse, jamais au cou (consigne) |
| Pochette : « À sa place » | harnais et pochette sur rocher | `ambiance-10` | proche |
| Pochette : appel final | berger australien | `ambiance-05` | **écart** : pas de chien |
| Panier rempli / vide | golden / golden allongé | `ambiance-02` / `ambiance-04` | chiens présents, autres poses |
| Confirmation, connexion | golden | `ambiance-09` | fidèle |
| Club, journal, articles | chiens en extérieur | `ambiance-02`, `-07`, `-01`, `-09`, `-05`, `-03`, `-06`, `-10`, `harnais-02`, `-04`, `-05` | **écart** : la plupart des photos n'ont pas de chien |
| Guide des tailles, FAQ, contact, livraison | chiens | `ambiance-09`, `-04`, `-02`, `-03`, `-10` | chiens sur 3 pages sur 4 |
| Pages légales | chiens | `ambiance-04`, `ambiance-06`, `harnais-02` | mentions : chien ; les deux autres : produits |
| Fiches : galeries | 5 vues par produit | les 20 vues `harnais-0x`, `laisse-0x`, `collier-0x`, `pochette-0x` | fidèle |
| Logo | logo | `logo.webp` | fichier inchangé ; ses marges transparentes sont compensées par le thème |

**Ce qui manque pour coller aux planches** (à fournir par Thomas si souhaité, jamais généré sans accord) : photos de
chiens au bord de mer, en forêt, au parc, dans les fleurs, au coucher du soleil, un épagneul et un berger australien
portant les accessoires, un chien allongé (panier vide), des chiens pour le journal et l'aide.

## Textes : accroches gardées, promesses neutralisées

- Accroches des planches gardées (« Le bonheur est au bout de la laisse. », « On sort ? », « Il attend ce moment toute
  la journée. », etc.).
- Retirés ou neutralisés car non vérifiés : confort, résistance, « convient à tous les chiens » (questions reprises,
  réponses « cela dépend de ses mesures »), délais, mesures, garanties, matières. Les valeurs inconnues sont « À
  renseigner », visibles comme telles.
- Aucun avis ni note ; aucun réseau social (le pied n'en affiche aucun : pas d'adresse réelle) ; © 2026 MUSEAU CLUB.
- Guide des tailles : jamais « prenez la taille au-dessus ».
- Pages légales en modèles « Modèle de démonstration : contenu à compléter et à valider ».

## Galerie, édition dans le studio, adaptation à un autre projet

Script : `scripts/museau-studio-check.ts` (studio Next.js réel, base temporaire, aucune IA, aucun réseau). Résultat :
`resultats/studio.json`, captures `resultats/studio-*.jpg`.

Dispositions ajoutées à la galerie « Boutique spécialisée » (une seule fois chacune, aperçu réel avec les photos du
projet) :

| Fonction de la galerie | Disposition |
|---|---|
| Présentation principale | Ouverture lumineuse, voile clair ; Panneau arrondi à gauche ; Panneau arrondi à droite ; Guide des tailles illustré ; Appel final avec le produit et son prix |
| Bénéfices du produit | Produit et gros plans numérotés |
| Détails du produit | Photos à pastilles ; Photos numérotées |
| Caractéristiques | Tableau (guide des tailles) ; Cartes ouvertes à pictogramme |
| Histoire de la marque | Articles du journal en rangée ; Journal à pastilles |
| Produits complémentaires | Photo et produits ; Produits posés sur une photo ; Ensemble assorti (+) |
| Questions fréquentes | Recherche et thèmes ; Photo et questions |
| Newsletter | Inscription sur photo |

Parcours vérifié dans le studio : galerie (13 dispositions, chacune avec son aperçu) → ajout d'un panneau arrondi →
titre, bouton, photo remplacée par une autre image du projet, couleurs → duplication → déplacement → rechargement
complet : tout est conservé.

Écrans d'exemple (commande, espace client) : modifiables dans le studio mais **jamais proposés dans la galerie** :
sur une vraie boutique, la commande et le compte sont des pages de Shopify.

**Adaptation à un autre projet à quatre produits** (Céramor : théière, tasse, sous-tasse, plateau) : son logo, ses
produits, ses textes et ses photos ; aucun texte, aucune photo, aucun prix de la démonstration (49 / 29 / 25 / 15 €).
Corrigé pendant la recette :
- les pages propres à la démonstration (journal, articles, exemple de commande, écrans de compte) ne sont plus
  recopiées chez un client (avant : 23 pages et un menu « Notre histoire » répété) ; il reçoit club, guide, FAQ,
  contact, livraison et pages légales ;
- le dessin de chien du guide des tailles ne passe pas chez un client ;
- le bandeau de cookies reste un choix du marchand (non recopié).
Limites constatées : chez un client, les 3 produits ajoutés au catalogue ont une fiche simple (caractéristiques) ; la
fiche enrichie est celle du produit principal, comme pour les autres thèmes à plusieurs produits. Dans le projet de
test, ces 3 produits n'ont pas de photo (aucune fournie) : leurs cartes montrent l'emplacement vide du thème, et
quelques titres se répètent faute de textes fournis par le client.

## Tests, build, types, Theme Check

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| `tests/museau-club.test.ts` (réécrit pour les nouvelles maquettes, 19 tests) | réussi |
| Tests ciblés (traductions anglaises, bibliothèque, catalogue, adaptation client, thèmes, studio, exports) | réussis |
| `npx vitest run` complet | 2920 réussis, 2 ignorés, 1 échec : la vignette de la galerie (refaite ensuite sur la démo `93386ba0`, test relancé : réussi) |
| `npm run build` | réussi |
| Theme Check (`scripts/verify-theme.sh --rapide` + MUSEAU CLUB FR et EN) | 0 erreur, 4 avertissements connus (variables inutilisées des sections fs-*) |
| Parcours d'interactions de la démo exportée (`resultats/interactions.json`) | 181/181 |
| Contrôle studio (`scripts/museau-studio-check.ts`) | réussi (galerie 13 dispositions, édition, duplication, déplacement, rechargement, client à 4 produits) |
| Non-régression : TRAVERSE (accueil, fiche, boutique, panier), HEUREN (accueil, fiche), Atelier Rive (accueil, prestations, contact), 1440 et 390 | rendus reconstruits au commit d'avant MUSEAU (`8f4d7b91`) et maintenant : **identiques au pixel près** (une zone de 94 × 94 px de la fiche TRAVERSE diffère d'un écart d'anticrénelage invisible) |

Parcours d'interactions (ordinateur 1440, téléphone 390, puis 360 et 430 sans débordement sur les 30 pages) : menu et
navigation, focus clavier visible, mouvement réduit (aucun contenu laissé invisible), contrastes ≥ 4,5:1 mesurés,
vignettes, zoom ouvert et fermé par Échap, taille M, barre d'achat du téléphone (Harnais, 49 €, taille M ; taille
changée dans la barre = formulaire ; barre masquée au pied de page), tiroir 98 €, panier « + » 147 € « − » 98 €,
« Supprimer », harnais M + laisse = 78 € sans « Total », « Passer commande » vers l'exemple sans paiement, filtres de la
boutique et du journal, FAQ par thème et recherche, formulaire de contact (erreurs, e-mail incomplet, succès simulé),
bandeau de cookies (personnaliser, enregistrer, refuser, rouvrir).

## Exports et limites selon la plateforme

- **Shopify** : thème, 4 produits et leurs variantes, médias, sections, profil, police désignée « nunito_n9 »
  (**disponibilité de Nunito 900 dans la bibliothèque de polices Shopify non vérifiée** ; repli prévu sur une police
  sans empattement). Les écrans de compte du thème servent aux **comptes clients classiques** ; avec les nouveaux
  comptes clients de Shopify, connexion, compte et commandes sont des pages de Shopify, hors thème. La commande et sa
  confirmation sont toujours celles de Shopify.
- **WooCommerce, PrestaShop** : médias, feuilles et classes du profil exportées (test réussi) ; panier, commande et
  compte sont ceux de la plateforme ; les pastilles de filtre et le bandeau de cookies du thème ne remplacent pas les
  modules de la plateforme.
- **Aperçu statique** : panier pré-calculé pour les 10 variantes (2 lignes et 3 articles au plus, 301 états) ; au-delà,
  un message l'indique.
- Non vérifié : installation réelle sur une boutique Shopify, envoi réel d'e-mail ou de formulaire, paiement.

## Environnement

- Studio de Thomas : **non déclaré à jour** (aucune preuve de la version servie).
- Rien n'est fusionné ni déployé. Aucun appel IA, aucun paiement, aucun envoi.

## Preuves

Dossier : [`docs/design/museau-club-reference-20261023/resultats/`](../design/museau-club-reference-20261023/resultats/)

- Comparaisons maquette | rendu : [`comparaison-01-accueil-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-01-accueil-ordinateur.jpg),
  [`comparaison-01-accueil-telephone.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-01-accueil-telephone.jpg),
  [`comparaison-02-harnais-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-02-harnais-ordinateur.jpg),
  [`comparaison-02-laisse-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-02-laisse-ordinateur.jpg),
  [`comparaison-03-collier-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-03-collier-ordinateur.jpg),
  [`comparaison-03-pochette-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-03-pochette-ordinateur.jpg),
  [`comparaison-04-boutique-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-04-boutique-ordinateur.jpg),
  [`comparaison-05-panier-plein-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-05-panier-plein-ordinateur.jpg),
  [`comparaison-05-panier-vide-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-05-panier-vide-ordinateur.jpg),
  [`comparaison-05-commande-exemple-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-05-commande-exemple-ordinateur.jpg),
  [`comparaison-05-confirmation-exemple-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-05-confirmation-exemple-ordinateur.jpg),
  [`comparaison-05-panier-telephone.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-05-panier-telephone.jpg),
  [`comparaison-06-club-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-06-club-ordinateur.jpg),
  [`comparaison-06-journal-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-06-journal-ordinateur.jpg),
  [`comparaison-06-article-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-06-article-ordinateur.jpg),
  [`comparaison-06-article-telephone.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-06-article-telephone.jpg),
  [`comparaison-07-tailles-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-07-tailles-ordinateur.jpg),
  [`comparaison-07-faq-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-07-faq-ordinateur.jpg),
  [`comparaison-07-faq-telephone.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-07-faq-telephone.jpg),
  [`comparaison-07-contact-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-07-contact-ordinateur.jpg),
  [`comparaison-07-livraison-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-07-livraison-ordinateur.jpg),
  [`comparaison-08-connexion-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-08-connexion-ordinateur.jpg),
  [`comparaison-08-compte-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-08-compte-ordinateur.jpg),
  [`comparaison-08-commande-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-08-commande-ordinateur.jpg),
  [`comparaison-08-mentions-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-08-mentions-ordinateur.jpg),
  [`comparaison-08-confidentialite-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-08-confidentialite-ordinateur.jpg),
  [`comparaison-08-cgv-ordinateur.jpg`](../design/museau-club-reference-20261023/resultats/comparaison-08-cgv-ordinateur.jpg)
- Interactions : [`interactions.json`](../design/museau-club-reference-20261023/resultats/interactions.json),
  [`interactions-captures.jpg`](../design/museau-club-reference-20261023/resultats/interactions-captures.jpg)
- Studio : [`studio.json`](../design/museau-club-reference-20261023/resultats/studio.json),
  [`studio-galerie.jpg`](../design/museau-club-reference-20261023/resultats/studio-galerie.jpg),
  [`studio-edition.jpg`](../design/museau-club-reference-20261023/resultats/studio-edition.jpg),
  [`adaptation-client.jpg`](../design/museau-club-reference-20261023/resultats/adaptation-client.jpg)
- Vignette de la galerie des thèmes : `public/theme-assets/museau-club/apercu-theme.jpg` (démo `93386ba0`).
