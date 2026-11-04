# 01 — Audit avant / après : SYNA et l'interface du Studio

Mission [#282](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/282), **phase 1 seulement** : audit,
directions artistiques, maquettes, prototype et plan de migration. **Aucun code du Studio n'a été modifié**, aucune
fusion, aucun déploiement, aucun service activé, aucun appel IA payant.

Version étudiée : `main` à `1c406f50` (31 octobre 2026, après la fusion #278 « intégration Claude + Codex / SYNA »).

## 1. Méthode, et ce qui a été vérifié

| Vérification | Comment | Résultat |
|---|---|---|
| Ce que SYNA sait faire | Lecture du catalogue `src/lib/orchestrator/conversation/studio-operations.ts` (65 opérations), des drapeaux `tool-flags.ts`, des rapports `211_CLOTURE_SYNA.md` et `276-INTEGRATION-CLAUDE-CODEX.md` | 37 opérations ont un adaptateur SYNA, 28 n'en ont pas (dont 13 actions sensibles volontairement hors de SYNA). Tous les adaptateurs sont **testés seulement avec un fournisseur simulé** et **fermés par défaut** |
| Chaque contrôle de l'interface | 4 relevés indépendants du code, fichier par fichier (`02-INVENTAIRE.md`) | 343 contrôles classés en 4 groupes |
| Le Studio réel | Studio lancé en local (Next.js, base temporaire, aucune IA, aucun réseau fournisseur), projets SILLON et TABLE SAISON, panneau SYNA affiché, 22 écrans × 2 tailles. Script : `scripts/syna282-captures-avant.ts` | 44 captures dans `captures/avant/`, **0 erreur JavaScript** |
| Constats graves | Relus moi-même dans le code avant de les écrire (§ 4) | 3 confirmés dans le code, d'autres marqués « à vérifier » |

Non vérifié : aucun message n'a été envoyé à SYNA (il aurait fallu un fournisseur, même simulé) ; aucun fournisseur
réel ; aucun lecteur d'écran ; aucune mesure de contraste outil en main.

## 2. Le constat principal : SYNA ne peut encore rien retirer

| Groupe | Contrôles | Sens |
|---|---:|---|
| 1 · doublon IA couvert par SYNA | **7** | candidats au retrait **après** preuve de parité |
| 2 · IA partiellement ou pas couverte | **75** | à conserver ; tâche de raccordement pour Codex |
| 3 · commande manuelle indispensable | **259** | à conserver, simplifier, intégrer au contexte |
| 4 · obsolète prouvé | **2** | `palette-picker.tsx`, composant `PostEditor` |

Les 7 doublons : analyser l'offre (`offer.analyse`), rechercher les approches (`research.generate`), préparer une
proposition de marque (`brand.generate`), valider une identité de logo (`logo.replace`), lancer la recherche de
stratégie avec devis, retoucher simplement une vidéo (`videos.edit`), « Rédiger » un texte SEO (`copy.generate`).
**Même eux ne sont pas retirables aujourd'hui** : leurs adaptateurs n'ont jamais été essayés avec un vrai fournisseur
ni sur une instance client.

Conclusion : la phase 2 ne peut pas commencer par « supprimer les boutons IA ». Elle doit commencer par **rendre la
conversation centrale sans rien retirer**, et ne retirer un contrôle qu'au rythme où Codex prouve la parité.

## 3. Les chats concurrents de SYNA (une seule conversation est exigée)

| Zone de saisie IA | Où | Ce qu'elle fait que SYNA ne fait pas |
|---|---|---|
| **Discussion de la boutique** (`shop.chat`) | `tab-boutique.tsx`, tâche `shop.chat` | Le plus puissant : couleurs, style, ajouter / retirer / déplacer / masquer des sections, sections sur mesure, réglages globaux, changement de thème, retour à une version, lecture d'une capture jointe, préférences retenues. **Seul utilisateur du moteur local gratuit** (`local-first.ts`). Reste visible même avec SYNA. |
| « Modifier le calendrier en une phrase » | `social-studio.tsx:691` | Déplace et supprime des publications ; `calendar.update` n'existe pas dans SYNA |
| « Que voulez-vous obtenir ? » + plan et devis | `workflow-panel.tsx` | Demande libre avec plan et devis, parallèle à SYNA (anciens projets) |
| « Demander une retouche » / « Demande particulière » | `content-panel.tsx` | Retouche des documents SEO / textes |
| « Écrire un article », consigne de réécriture | `tab-blog.tsx` | Sujet libre, « laisser l'IA choisir », réécriture d'un article existant |
| « Générer la section avec l'IA » | `section-library.tsx` | Passe par `shop.chat` |
| « Rédiger ma description avec l'IA » | `ai-description.tsx` | Rédaction à la création du projet |
| « Lancer avec l'IA » (Prompts) | `tab-prompts.tsx` | Lance un prompt libre |

Le panneau SYNA lui-même a la bonne base : **une seule conversation persistante par projet** (`project_id UNIQUE`),
devis séparé, accord, reçus, reprise après fermeture. Mais il ne « voit » pas encore une publication, une campagne, un
créneau du calendrier ni un document publicitaire ; la sélection dans l'aperçu ne lui transmet que la section et le
bloc (pas le texte, l'image ni le chemin, que `shop.chat` utilise) ; et aucune route ne permet d'annuler une tâche en
cours.

## 4. Défauts trouvés en lisant le code (hors périmètre de cette phase, signalés)

| Constat | Statut | Preuve |
|---|---|---|
| « Recréer les propositions » de logo lance une nouvelle série **sans devis ni accord côté serveur** (limitée seulement par le droit de série du forfait) | **Confirmé dans le code**, non exécuté | `tab-marque.tsx:261` → `brand/logo/route.ts:79-86` |
| L'éditeur publicitaire « nouvelle version créative » appelle `campaigns/v2` sans devis accepté : le serveur le refuse toujours (409) | **Confirmé dans le code**, non exécuté | `ad-editor.tsx:361`, `campaigns/v2/route.ts:121` |
| SYNA **refuse le relais OpenAI** pour les logos ; la règle du propriétaire (Qwen dessine, OpenAI reprend si le contrôle est insuffisant, toujours au moins un logo) n'est tenue que par l'écran Marque | **Confirmé dans le code** | `logo-tool-execution.ts:60` (`if(input.relay …)`) |
| Relances payantes sans devis à l'écran : « Réanalyser tout le projet », « Relancer » une étape, « Enregistrer et mettre à jour le site », message `shop.chat`, « Rédiger » / « Demander une retouche », « Lancer avec l'IA », « Nouvelle proposition » de marque, « Refaire la ligne éditoriale » | Relevé à l'écran ; plafonds serveur **à vérifier** | `02-INVENTAIRE.md` |
| Deux systèmes de confirmation coexistent : `useCostConfirm` (rappel du % restant, sans montant) et les devis de préparation (estimation + maximum), que SYNA réutilise | Confirmé | `cost-confirm.tsx`, devis de préparation |
| « Insérer dans Images / Vidéos / Calendrier » (Prompts) annonce « Prompt inséré » mais seul l'onglet Boutique reprend le texte | À vérifier en exécution | `02-INVENTAIRE.md`, relevé C |
| « Supprimer » une publication dans l'éditeur n'a pas de confirmation (le calendrier en a une) | Relevé dans le code | `social-studio.tsx:1018` |
| Textes dépassés : bandeau Découverte « les 30 thèmes » (`home.tsx:517`) ; `/studio/themes` « Les 30 thèmes… 10 avec Créer, 20 avec Développer » alors que la mission #190 propose 15 thèmes sans quotas par famille | Relevé dans le code | `home.tsx`, page `themes` |
| Le Pilote d'un projet récent n'affiche que la préparation : mémoire du projet, langue des contenus, plateforme et demande libre deviennent introuvables | Relevé dans le code | `tab-pilote.tsx:304` |

## 5. L'interface actuelle (captures « avant »)

Captures : `captures/avant/ordinateur-*.jpg` et `telephone-*.jpg` (SILLON : 15 écrans ; TABLE SAISON : 7 écrans).

- **Bruit répété** : le même bandeau (« Choisissez votre angle marketing… 24 élément(s) conservé(s) à contrôler… »)
  apparaît en tête de Pilote, Marque, Images, Vidéos et Publications. Dans Marque, une liste brute répète « Images ·
  retouche protégée · compatibilité à contrôler » sur toute la hauteur.
- **Barre du haut chargée** : recherche, Tutoriel, À démarrer, jauge, forfait, notifications, langue, thème — 9
  commandes avant le contenu ; au téléphone elle passe sur deux lignes.
- **SYNA est un bouton flottant** en bas à droite. Au téléphone il **recouvre du contenu** (case « Logo choisi »,
  textes des thèmes) et la barre d'onglets du bas.
- **Densité de commandes** : jusqu'à 90 boutons sur l'écran Images, 84 sur Fichiers, 68 sur le Calendrier (relevé
  automatique, `captures/avant/captures.json`).
- **Ce qui est bien et doit rester** : la promesse « rien ne part sans votre accord » est partout ; l'avertissement
  « Création d'images par l'IA indisponible… aucune image n'est fabriquée à la place » est exactement le ton honnête
  attendu ; les espaces métier (Carte, Rendez-vous) apparaissent bien selon le métier.
- Note : la pastille « N » en bas à gauche des captures est l'indicateur du mode développement de Next.js, pas une
  partie du produit.

## 6. Après : l'architecture proposée (détails dans 03, 04 et 05)

| Exigence de #282 | Avant | Après (maquettes « Encre ») |
|---|---|---|
| 1. Conversation centrale et persistante | Bouton flottant + 8 zones de saisie IA concurrentes | Colonne SYNA permanente (onglet « Syna » au téléphone) ; les chats concurrents disparaissent **un par un**, à parité prouvée |
| 2. Espace de travail dynamique | Onglets à formulaires et boutons IA | 6 lieux de travail + Projet ; aperçu, catalogue, logos, vidéo, calendrier, suivi ; sélection = contexte de SYNA ; travail manuel au même endroit |
| 3. Transparence d'exécution | États variables selon l'écran | 7 états nommés (proposition, brouillon, confirmé, en cours, vérifié, échec, non disponible) ; preuve = version + capture + avant / après + coût débité vs devis |
| 4. Coûts et consentement | Deux systèmes de confirmation, plusieurs relances sans devis | Un seul devis en % avant toute dépense, barre avant / après, plafond, alternatives moins chères ; plafonds 40 % / 50 % inchangés |
| 5. Navigation simplifiée | 15 à 19 entrées de menu + outils avancés | 6 lieux + Projet ; Prompts, Fichiers, Connexions rangés dans Projet ; au téléphone : Syna · Aperçu · Espaces · Suivi |
| 6. Projet neuf et existant | Création par chat limitée au texte ; projet existant non repris par SYNA | Accueil conversationnel (`e-01`) ; état de transition honnête pour l'existant (`e-12`), sans promettre la reprise |
| 7. Forfaits et accès | Droits vérifiés par chaque route | Inchangés ; bandeaux « hors forfait » et « budget épuisé » (`e-00`) ; hébergement « non configuré » sans laisser croire à une panne (`e-10`) |

## 7. Impacts pour les utilisateurs

- **Débutant** : moins de choix à l'écran, une seule entrée (« Demandez à Syna ») ; les explications « je ne sais pas
  encore » lui évitent de croire qu'une action a eu lieu.
- **Professionnel** : garde toutes les commandes manuelles (prix, variantes, ordre des sections, glisser-déposer,
  exports, restaurations) ; gagne la désignation d'un élément et un suivi des tâches.
- **Projets existants** : rien n'est retiré ni migré en silence ; l'ancienne discussion de la boutique reste
  consultable.
- **Risque principal** : retirer `shop.chat` trop tôt ferait perdre les retouches gratuites du moteur local et la
  majorité des retouches de thème. C'est le dernier contrôle à retirer, pas le premier (voir `05-PLAN-MIGRATION.md`).
