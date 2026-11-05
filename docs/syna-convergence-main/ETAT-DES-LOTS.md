# Convergence SYNA → `main` — état des lots (4 novembre 2026)

Branche `claude/syna-convergence-main`, partie de `main` à jour (`37fcfd25`, entièrement contenu) et de la tête
d'intégration vérifiée `claude/syna-301-complet` (`9f8507c7`, PR #369, CI verte). La PR #369 visait la branche
d'intégration `claude/syna-301-integration-356` (#363), elle-même déjà contenue. Cette branche remplace donc toute la
chaîne de PR empilées par **une seule PR vers `main`**.

Méthode de vérification, pour chaque branche livrée :
1. ancêtre de la tête ? (`git merge-base --is-ancestor`) ;
2. sinon, fusion d'essai sans écriture (`git merge-tree --write-tree`) : apporte-t-elle encore quelque chose ?
3. sinon, ses fichiers de code et de tests sont-ils présents dans la tête (repris par une convergence de Codex) ?

## Inclus — ancêtres directs de la tête

| Lots | Contenu |
|---|---|
| #293 (lot 1 bis), #296, #297, #299 | modes Encre / Plein cadre, coquille SYNA, quatre contrôles obligatoires |
| #326, #338, #348, #356, #361 | convergences de Codex (parcours gratuits, protections financières, phrases gratuites) |
| #349 → #355, #357 → #360 | Blog, sections, publicité, anciens projets, demandes, horaires, effets secondaires V2 |
| #363, #364 → #370 | intégration v3, confirmation périmée, contraste, horaires naturels, SEO, sections, pages |
| #369 et ses lots 1 à 9 (Claude) | cartes de la conversation SYNA et leurs recettes (voir `docs/syna-301-complet/REPRISE.md`) |
| #377 → #379, #390 → #419 | bibliothèque, photos, animations, profil services, corbeille, dossiers, prompts, stock, réservations (lecture, prix, durée) |
| `codex/parity301-continuous-proofs-v12` | dernier point de reprise et matrice de Codex (documentation), fusionné ici |

## Inclus sous une forme ultérieure — repris par les convergences de Codex

PR #298 → #347 (branches `codex/parity301-*` du 2 et du 3 novembre : consentements, documents publicitaires,
contenus métier, fichiers, demandes, SEO, Blog, images, logos, historique), ainsi que #328 et #330 (Claude). Leurs
commits ne sont pas ancêtres, car Codex les a réintégrés avec conflits résolus dans #326, #338 et #348. **Tous leurs
fichiers de code et de tests existent dans la tête**, en général dans une version plus récente, et leurs tests passent
dans la suite complète. Leurs fusions d'essai n'apportent rien d'autre que des conflits sur des versions dépassées.

## Non intégrés (volontairement)

| Branche | Raison |
|---|---|
| `codex/parity301-convergence-369` (#371, `827795d0`) | **bloqué** : réintroduit la surcouche `theme.liquid` du contraste, retirée et remplacée par le moteur #365 (consigne de la mission) |
| `codex/logo-294-consent`, `codex/logo-295-ci-authorization` (#295, #298) | code déjà présent ; il ne reste que le rapport et les captures `docs/logo-294/` (documentation, hors SYNA) |
| `codex/syna-284-audit-parite` | documentation d'audit #284 seulement (aucun code) |
| `codex/parity301-continuous-matrix-v2` | documentation remplacée par la v12 |
| `claude/liste-attente-420` (#421) | chantier distinct (liste d'attente), fusionné dans `main` par sa propre PR (`91650e33`) ; `main` a ensuite été réintégré ici, sans conflit |

## Correctif ajouté dans cette convergence

**Message technique de cible / version** (constaté pendant la capture HEUREN) : après une retouche confirmée, la carte
Site affichait « La cible ou sa version a changé » et deux identifiants internes. Désormais :
- après **sa propre** retouche, la carte affiche « Retouche enregistrée : la section désignée a maintenant une nouvelle
  version. Pour une autre demande sur cette section, revalidez-la d'abord. » ;
- après une modification **faite ailleurs**, elle garde l'alerte, en mots : « La section a changé depuis votre
  désignation (modification faite ailleurs). Rien n'a été écrit… » ;
- le bouton « Revalider la cible actuelle » et son comportement ne changent pas (accord explicite, aucune écriture) ;
- la cible se lit en mots. Les identifiants internes sont repliés dans « Détail technique ».

Test : `tests/syna301-site-revalidation-message.test.ts`, qui couvre les deux cas.

**Texte de bouton contenant un mot du profil** (constaté par la recette navigateur « bouton » sur téléphone) : la phrase
« Remplace le texte du bouton de cette section par « Recevoir mon devis encre telephone » » partait vers le profil
d'activité, parce que le mot « téléphone » était lu dans la valeur citée. Elle répondait alors « Modification du profil
indisponible » au lieu de la carte gratuite. Le même refus touchait « Appelez-nous par téléphone », « Voir nos horaires »
ou « Voir le prix des prestations ». Le défaut est apparu avec la reconnaissance des coordonnées du profil, après le
passage de cette recette en 4/4. Les mots-clés du profil (téléphone, e-mail, adresse, prix, durée, description, horaires)
se lisent désormais **hors des valeurs citées**. Les vraies demandes du profil sont reconnues comme avant.

La revue de Codex a relevé le même défaut pour le **stock** (« Change le titre de cette section par « Stock
disponible » »). Un relevé de tous les aiguilleurs placés avant celui du site l'a aussi trouvé pour le **calendrier**
(« Voir le calendrier »), le **choix du thème** (« Changer de thème ») et les **animations** (« Animation garantie »).
Ces quatre aiguilleurs lisent eux aussi leurs mots-clés hors des valeurs citées, avec une fonction commune
(`outside-quotes.ts`). Après correction, le relevé ne trouve plus aucun cas.

Test : `tests/syna301-bouton-mot-profil.test.ts` (6 tests). Il couvre les cinq domaines, trois formes de guillemets, des
phrases de contrôle qui doivent rester reconnues, et des retouches réelles (bouton sur un projet de services, titre sur
un projet de produits, domaines fermés ou ouverts). Il échoue sans les correctifs et passe avec.

## Activation

Toutes les fonctions SYNA restent **fermées par défaut** : elles s'activent par les réglages serveur
`STUDIO_CONVERSATION_*`. Fusionner dans `main` n'ouvre rien pour les clients tant que ces réglages ne sont pas posés
sur l'instance. Aucune clé de fournisseur n'est nécessaire aux retouches gratuites.

## Aperçu privé pour filmer

`scripts/syna-apercu-heuren.ts` crée une base de démonstration : compte fictif, projet HEUREN préparé, quatre
publications à valider. Il lance ensuite le Studio compilé avec les fonctions gratuites de SYNA ouvertes, sans clé
de fournisseur et avec le réseau extérieur coupé.
