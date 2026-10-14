# Social Media Autopilot V2 — « Ma communication automatique »

Date : 14-15 octobre 2026. Branche `claude/ecom-studio-ia-platform-8cwl79`.

Je n'ai pas créé de nouveau moteur. J'ai complété le Social V2 existant (planificateur, production, contrôle qualité, programmation, publication, automatisations du worker). Aucun appel IA payant et aucune publication réelle n'ont eu lieu pendant ce travail.

## 1. Ce qui change pour le client

| Point demandé | Ce qui a été fait | Fichiers |
|---|---|---|
| Assistant « Ma communication automatique » | Nouvelle section du studio Publications, en 5 étapes : objectif, réseaux, fréquence, préférences, validation. Elle comprend aussi la semaine type et l'historique. | `src/components/studio/social-autopilot.tsx`, `api/.../social/v2/autopilot` |
| 4 objectifs | Notoriété, ventes ou devis, communauté, équilibrée. Changer d'objectif ne supprime rien : les publications déjà prévues restent, les suivantes suivent le nouvel objectif. | `editorial.ts` (`rolesFor`), `autopilot.ts` |
| État réel des réseaux | 6 états : Connecté, À connecter, Autorisation expirée, Publication automatique disponible, Autorisation supplémentaire nécessaire, Fonction non disponible. Tant qu'aucun envoi n'a réellement abouti depuis un compte connecté par OAuth, l'écran affiche « Jamais encore vérifiée sur un vrai compte ». Les comptes simulés ne comptent jamais comme vérifiés. | `networks.ts` |
| Fréquence 1 / 3 / 5 par jour, horizon 7 / 30 / 90 jours | Les boutons au-delà du forfait sont grisés. La limite est revérifiée côté serveur partout (voir section 2). | `plan-gates.ts`, `scheduler.ts`, `planner.ts` |
| Un contenu et ses variantes | Un contenu éditorial adapté à Instagram, Facebook et Pinterest garde le même `group_id` et compte pour un seul contenu dans le forfait. L'envoi est suivi réseau par réseau. Les variantes s'affichent dans l'éditeur avant publication. | `plan-gates.ts` (`scheduledPostsOn`), route `posts/[postId]` |
| Préférences | Jours, heures, fuseau horaire, ton, langue, niveau commercial, produits prioritaires, formats, réseaux, plafond IA par semaine. Les heures sont présentées comme « courantes » et jamais comme « optimales » : aucune statistique réelle ne permet de le dire. | `autopilot.ts` |
| Semaine éditoriale | Lun présentation · Mar conseils · Mer bénéfices / démonstration · Jeu coulisses / savoir-faire · Ven FAQ / objections · Sam vente · Dim communauté. Chaque jour a 5 rôles différents, dont 1 principal. | `editorial.ts` |
| Logique 1 / 3 / 5 | 1 publication par jour : la principale. 3 : principale + information ou démonstration + engagement ou conversion. 5 : la journée complète. Aucun remplissage artificiel : sans matière vérifiée, le texte affiche « [À compléter : …] » et reste bloqué. | `editorial.ts`, `copy.ts` |
| Rotation et mémoire | Le studio retient les produits présentés, la matière et les accroches utilisées, et les publications supprimées ou annulées. Une accroche refusée ne revient plus, accents compris. Une accroche très proche (≥ 80 % de mots communs dans les 14 jours) est signalée. | `memory.ts`, `quality.ts` |
| Adaptation par réseau | Une publication TikTok ou YouTube sans vraie vidéo est bloquée avec le message « ne peut pas partir sans vraie vidéo ». Le studio ne transforme jamais une image en vidéo vide. | `quality.ts` |
| Calendrier | Vues jour, semaine, mois et liste, plus un nouveau filtre par réseau. Statuts affichés : Idée, Brouillon IA, À compléter, En attente de génération, En attente de validation, Approuvée, Programmée, En publication, Publiée, Échec, À vérifier, Annulée (et En pause). | `social-studio.tsx` |
| Pilote automatique | Il ne s'active qu'avec l'accord exact, daté et conservé (texte, compte, date). Il n'approuve que les publications sans défaut, des catégories choisies, sur les réseaux réellement disponibles et non suspendus. On peut ajouter des mots qui exigent toujours une validation. La désactivation est immédiate : ses approbations reviennent « à valider ». | `autopilot.ts` |
| Sécurité | « Tout mettre en pause » et « Tout reprendre ». Chaque publication est revérifiée à la reprise. Un réseau peut être suspendu. Un historique des actions est conservé. | `autopilot.ts`, `scheduler.ts` (`resumePosts`) |
| Remplissage automatique | Le worker passe toutes les 6 heures. Un passage ne peut être pris en charge que par un seul worker à la fois. Il complète les prochains jours sans jamais recréer une case supprimée. | `worker/index.ts`, `runDueAutopilots` |
| Production progressive | Les visuels sont gratuits par défaut et produits seulement pour les 3 prochains jours, 15 au plus par passage. Le studio ne produit jamais 90 jours de médias payants d'un coup. | `autopilot.ts` |
| Budget | Le payant n'est possible que si le client fixe un plafond par semaine, que l'IA est active et que l'estimation tient dans ce plafond. Il passe par la tâche de production existante (réservation atomique, `ai_calls`, plafonds). Quand le budget est épuisé : ce qui est prêt reste en place, les visuels continuent gratuitement et une notification propose la recharge de 10 €. | `autopilot.ts` |
| Project Brain | Un produit retiré du catalogue n'est plus promu : la publication est bloquée, et retenue au moment de l'envoi même si elle était déjà programmée. Un prix modifié depuis la rédaction remet la publication en relecture. | `brain-check.ts`, `quality.ts`, `scheduler.ts` |
| Statistiques | Elles n'affichent que des données réelles. Sans données : « Données indisponibles ». Aucun réseau n'envoie encore de statistiques au studio : le module existe, mais aucun fournisseur de statistiques n'est branché. | `social-autopilot.tsx` (`SocialOverview`) |
| Forfaits | Découverte : démonstration seulement (ni préparation automatique ni pilote). Le compte administrateur suit son forfait comme un client. | `autopilot.ts` |

## 2. Limites de forfait impossibles à contourner

Avant ce travail, plusieurs chemins contournaient les limites :
- la demande écrite n'avait pas de limite de jours ;
- le nombre de publications par jour n'était pas vérifié dans la route « plan » ;
- le glisser-déposer, « mets les vidéos le mardi » et la reprise après pause ne revérifiaient rien ;
- les publications étaient comptées par jour UTC.

Contrôles en place maintenant :
- **Comptage** : on compte les contenus distincts (`COALESCE(group_id, id)`) par jour, dans le fuseau horaire du projet.
- **Formulaire et demande écrite** : le nombre par jour et le nombre de jours sont limités au forfait. Une dernière limite est appliquée dans `createPlanV2`, quel que soit l'appelant.
- **Changement de date** : PATCH de date, glisser-déposer et « mets les vidéos le mardi » passent par `moveRefusal`, qui refuse une date passée, une date au-delà de l'horizon du forfait, ou un jour déjà plein.
- **Reprise après pause** : chaque publication est revérifiée. Celles qui ne passent plus restent « approuvées », avec la raison affichée.
- **Automatisations** : elles demandent un forfait actif, à la création comme à l'exécution, et le nombre par jour y est limité au forfait.

## 3. Vérifications

Niveaux distingués : **U** = test unitaire ou d'intégration avec outils simulés · **N** = navigateur réel sur une base de démonstration · **S** = envoi simulé (publieur factice) · **OAuth réel** = jamais testé · **Publication réelle** = jamais faite.

| Vérification | Niveau | Résultat |
|---|---|---|
| `npx tsc --noEmit` | — | aucune erreur |
| Série complète `npx vitest run` (avant les derniers ajouts d'interface) | U | 1580 / 1580 réussis |
| `tests/social-autopilot-limites.test.ts` : semaine 1/3/5, 21 et 35 publications (cosmétique 3/j, plâtrier 5/j), mémoire et accents, contenus distincts par jour et fuseau, glisser-déposer, « mets les vidéos le mardi », reprise, demande écrite / formulaire / automatisation, affichage des rôles | U | 8 / 8 |
| `tests/social-autopilot-pilote.test.ts` : 6 états des réseaux, réglages et forfaits, mode manuel (rien d'approuvé, visuels gratuits sur 3 jours, 0 € payé), consentement exact, désactivation immédiate, suspension, pause / reprise, budget (recharge 10 €, plafond hebdomadaire), variantes non vues comme doublons, TikTok sans vidéo, produit retiré / prix modifié, suppression mémorisée, worker sans double passage | U | 9 / 9 |
| Tests Social V2 existants (social-v2, social-v2-engine, permissions, sécurité, benchmark, choix du visuel) | U | tous réussis |
| Démo navigateur `scripts/e2e-autopilot-v2.ts` | N | 18 / 18 (détail ci-dessous) |
| Envoi simulé des 2 publications programmées, puis second passage | S | 1 envoi chacune, second passage ignoré (pas de doublon), tentative tracée |
| Connexion OAuth réelle à un réseau | — | **Non vérifiée** (aucune application réseau configurée) |
| Publication réelle | — | **Jamais faite** (interdit sans votre accord) |
| Génération IA payante | — | **Non lancée** (le chemin payant est testé avec des outils simulés uniquement) |

## 4. Démonstration navigateur (données de test clairement nommées)

La démo a tourné sur une base séparée créée par `scripts/seed-autopilot-demo.ts`. Le serveur était lancé avec `SOCIAL_PUBLISH_DISABLED=1` et sans worker, et les comptes Instagram, Facebook et Pinterest étaient simulés (sans jeton).

- **Projet A « [TEST] Cosmétique »** (forfait Développer, 3 publications par jour, 7 jours) :
  - 63 variantes, soit exactement 3 contenus par jour pendant 7 jours sur 3 réseaux ;
  - 15 visuels gratuits produits pour les 3 premiers jours ;
  - rien n'a été approuvé sans accord ;
  - dans l'éditeur, les variantes Facebook et Pinterest sont visibles ; le texte a été modifié, approuvé puis programmé ;
  - un envoi simulé a été tracé.
- **Projet B « [TEST] Plâtrier-peintre »** (forfait Dominer, 5 publications par jour, 7 jours) :
  - 105 variantes, soit exactement 5 contenus par jour ;
  - beaucoup de publications affichent « [À compléter] » : le projet de test n'a ni réalisations, ni avis, ni critères techniques vérifiés, et le studio ne les invente pas (accroches dans `screenshots/social-autopilot-v2/B-accroches.txt`) ;
  - dans la démo, une publication a été complétée à la main dans l'éditeur, puis approuvée, programmée et envoyée en simulation.
- **Sur téléphone** : aucun débordement horizontal, et aucune erreur JavaScript.

Captures dans `reports/screenshots/social-autopilot-v2/`. Résultats bruts : `results.json` et `envoi-simule.json`.

## 5. Ce qui reste ouvert, honnêtement

- **Comptes réels** : il faut configurer les applications des réseaux (Meta, TikTok, Google, Pinterest) dans l'administration, puis faire un test sur un vrai compte avec votre accord explicite. Tant que ce test n'est pas fait, l'écran l'indique.
- **Statistiques** : aucun fournisseur de statistiques réseau n'est branché. L'écran affiche « Données indisponibles ».
- **Renouvellement des autorisations** : il n'y a pas de renouvellement proactif des jetons OAuth. Un compte expiré passe en « Autorisation expirée » et rien n'est envoyé.
- **Qualité des textes** : elle dépend de la matière vérifiée du projet. Un projet pauvre en informations (comme le plâtrier de test) donne beaucoup de « [À compléter] ». C'est voulu, pour ne rien inventer, mais le client doit compléter ses informations (réalisations, questions fréquentes, critères).
- **Vidéo** : le studio ne produit aucune vidéo pour TikTok et YouTube sans moteur vidéo opérationnel, et ces publications restent bloquées avec « ne peut pas partir ».
