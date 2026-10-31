# 05 — Plan de migration par lots (à valider par le propriétaire)

Principe : **on ajoute avant de retirer**. La nouvelle interface arrive d'abord à côté de l'actuelle ; un ancien
contrôle n'est retiré qu'avec une **parité prouvée** par Codex sur le moteur et par un test d'interface. Aucun moteur,
aucune API, aucun prompt, aucune tâche, aucun quota, aucune base, aucun historique, aucun droit de forfait, aucune
sortie ZIP, aucun thème ni intégration n'est supprimé dans ce chantier.

Rôles : **Claude** = interface (phase 2, branche `claude/syna-studio-premium-ux`, distincte de #281 et des branches
Codex) ; **Codex** = raccordement des capacités à SYNA et tests de parité ; **propriétaire** = validation de chaque lot
sur captures avant toute fusion.

## Définition de la parité (pour chaque contrôle retiré)

Un contrôle ne quitte l'interface que si **les six preuves** existent, sur une instance de recette :
1. même action métier (même route ou même tâche, mêmes données écrites) ;
2. même devis (même estimation et même plafond, en %) et même accord explicite ;
3. même reçu et même version (restaurable, historique conservé) ;
4. mêmes droits (forfait, quotas, Découverte sans IA, administrateur sans passe-droit) ;
5. même comportement d'échec (pas de relance automatique d'un appel incertain, échec dit) ;
6. drapeau `STUDIO_CONVERSATION_*` concerné activé sur l'instance, et **un essai réel** (fournisseur réel, avec prix
   annoncé et accord écrit du propriétaire) pour les actions payantes.

## Les lots

| Lot | Contenu (interface) | Contrôles retirés | Parité exigée avant | Tests | Retour arrière |
|---|---|---|---|---|---|
| **0 · Fondations** | Jetons de la direction choisie dans `globals.css` (clair + sombre), polices auto-hébergées, composants d'état (7 états), carte d'action, devis unique, puce de sélection. Aucun changement visible des parcours. | Aucun | — | types, suite complète, captures 1440 / 1024 / 390 / 360, contrastes mesurés | revert du commit (jetons isolés) |
| **1 · Coquille** | Nouvelle barre du haut (allégée), colonne SYNA permanente à la place du bouton flottant, navigation 6 lieux + Projet, onglets mobiles Syna · Aperçu · Espaces · Suivi. **Tous les anciens écrans restent accessibles** (mêmes adresses). Bandeau répété remplacé par une seule pastille « à contrôler (24) ». | Aucun (seulement déplacés) | — | toutes les adresses `/studio/<id>/<espace>` répondent ; liens profonds ; `spaceVisible` inchangé ; navigation clavier ; lecteur d'écran (titres, régions) | option d'affichage « ancienne interface » par compte, puis revert |
| **2 · Désignation et suivi** | Sélection dans l'aperçu → contexte de SYNA ; espace « Suivi » des tâches ; preuves avant / après. | Aucun | **Codex** : transmettre à SYNA texte, balise, chemin et image désignés (aujourd'hui section + bloc seulement) ; route d'annulation d'une tâche en cours | parcours SILLON et Table Saison du prototype rejoués sur le vrai Studio, fournisseur simulé | revert |
| **3 · Doublons déjà couverts** | Les 7 contrôles du groupe 1 deviennent des suggestions dans SYNA ; l'ancien bouton reste dans un menu « … » pendant un cycle. | `offer.analyse`, `research.generate` (Pilote et Stratégie), `brand.generate`, `logo.replace`, `videos.edit`, « Rédiger » SEO | Les 6 preuves pour chacun ; pour la marque : **relais OpenAI des logos** autorisé dans SYNA (aujourd'hui refusé, `logo-tool-execution.ts:60`) | test de parité par contrôle (devis identique, même version, même reçu) | remettre le bouton (une ligne) |
| **4 · Médias** | Images, vidéos, publications et publicités pilotées depuis SYNA, l'espace de travail montrant comparaisons et plans. | Boutons « Créer avec l'IA » d'Images et Vidéos, « Créer une publication image », visuel d'annonce | **Codex** : type d'image par défaut (`usage_scene`), emplacement demandé par le thème, mode vidéo « par étapes », vidéo sur mesure, plan vidéo IA de la banque, vidéo et LinkedIn pour les publications, jours exclus et répartition des formats du calendrier, visuels pour des brouillons nés hors SYNA | 6 preuves ; un essai réel payant par type, avec accord écrit | remettre les boutons |
| **5 · Calendrier en une phrase** | Le chat du calendrier disparaît au profit de SYNA. | « Modifier le calendrier en une phrase » | **Codex** : `calendar.update` (déplacer, supprimer avec confirmation) ; SYNA doit voir une publication, une campagne, un créneau | 6 preuves | remettre le chat |
| **6 · Textes et blog** | Documents SEO et blog dans SYNA. | « Demander une retouche », « Demande particulière », modale « Écrire un article », réécriture | **Codex** : « laisser l'IA choisir » le sujet, sujets proposés, réécriture d'un article existant, restauration d'un document ; moteur local pour les retouches simples | 6 preuves | remettre |
| **7 · Discussion de la boutique** (dernier) | `shop.chat` remplacé par SYNA ; l'ancien fil reste lisible (« Ancienne discussion »), jamais effacé. | Discussion de la boutique, « Générer la section avec l'IA » | **Codex** : **moteur local d'abord dans SYNA** (retouches simples gratuites, `local-first.ts`) ; toutes les opérations de thème (couleurs, style, sections : ajouter / retirer / déplacer / masquer, sections sur mesure, réglages globaux, changement de thème, retour à une version, capture jointe, préférences retenues) | 6 preuves, **plus** comparaison sur un corpus de demandes réelles de `shop.chat` (mêmes résultats, même coût ou moins) | réactiver `shop.chat` (le code n'est pas supprimé pendant au moins un cycle complet) |
| **8 · Métiers et projets existants** | Carte, réalisations, biens, prestations, réservations et reprise d'un projet existant par SYNA. Jusque-là : état honnête « non disponible » + ouverture de l'écran natif au bon endroit (maquettes `e-03`, `e-12`). | Aucun avant parité | **Codex** : outils SYNA sur `/api/projects/[id]/contenus` (versions `ifVersion`, accord `confirm`, droits), reprise d'un projet existant (lecture de l'historique `shop.chat`, des contenus métier) | 6 preuves ; parcours services complet | — |
| **9 · Nettoyage** | Retrait des 2 éléments obsolètes prouvés. | `palette-picker.tsx`, composant `PostEditor` (pas la route `/api/posts/[pid]` ni `NETWORKS`) | `git grep` vide, suite complète verte | suite complète | revert |

Les **commandes manuelles** (groupe 3, 259 contrôles) ne sont retirées dans aucun lot : elles sont rangées dans
l'espace de travail du bon lieu (volet « Modifier à la main », menu « … », Projet).

Les **actions sensibles** (13 opérations : publication réseau, programmation réelle, activation de campagne, publication
CMS, synchronisation boutique, publication et domaine du site hébergé, demandes reçues, réservation et annulation
réelles, suppression de fichiers, connexions de comptes) **restent des écrans natifs validés par le client**. SYNA peut
les préparer et ouvrir le bon écran ; elle ne les déclenche pas.

## À corriger hors refonte (signalé, à décider)

Ces défauts existent déjà ; ils ne dépendent pas de la refonte et peuvent être confiés séparément :
1. « Recréer les propositions » de logo sans devis ni accord côté serveur (`brand/logo/route.ts`).
2. « Nouvelle version créative » de l'éditeur publicitaire qui ne peut jamais aboutir (409 sans devis accepté).
3. Relances payantes sans devis à l'écran (liste dans `01-AUDIT.md` § 4), à vérifier côté serveur.
4. Textes « 30 thèmes » dépassés (`home.tsx`, `/studio/themes`).
5. Suppression d'une publication sans confirmation dans l'éditeur.

## Ordre de validation proposé au propriétaire

1. Choisir la direction artistique (recommandée : « Encre »).
2. Valider les maquettes `e-00` à `e-12` et le prototype (ou demander des changements).
3. Valider ce tableau de lots, en particulier : **« on ajoute avant de retirer »** et **`shop.chat` en dernier**.
4. Autoriser le lot 0 seul ; chaque lot suivant se présente avec ses captures et s'arrête pour validation.
