# 02 — Inventaire des contrôles du Studio (mission #282, phase 1)

Lecture du code de `main` à `1c406f50` (31 octobre 2026), en lecture seule : aucun fichier modifié, aucun serveur ni
appel IA pour cet inventaire. Quatre relevés indépendants, un par groupe d'espaces, rassemblés ici sans réécriture.

**Ce qu'il faut savoir avant de lire « SYNA : oui »** : une opération « couverte » signifie qu'un adaptateur SYNA existe
dans `src/lib/orchestrator/conversation/studio-operations.ts`, **testé seulement avec un fournisseur simulé**, et derrière
des drapeaux serveur `STUDIO_CONVERSATION_*` **fermés par défaut**. Aucune parité n'est donc encore prouvée en conditions
réelles : le groupe 1 désigne des **candidats** au retrait, pas des retraits autorisés.

## Totaux

| Relevé | Lignes | Groupe 1 · doublon couvert | Groupe 2 · IA partielle / non couverte | Groupe 3 · manuel indispensable | Groupe 4 · obsolète prouvé |
|---|---:|---:|---:|---:|---:|
| A · Entrée, Pilote, Fiche, abonnement, admin | 94 | 3 | 15 | 76 | 0 |
| B · Site, pages, export, publication, SEO/Blog, Catalogue, métiers, connexions | 83 | 1 | 11 | 70 | 1 |
| C · Marque, logos, Stratégie, Images, Vidéos, Fichiers, Prompts | 78 | 3 | 24 | 51 | 0 |
| D · Publications, Calendrier, Publicités, panneau SYNA | 88 | 0 | 25 | 62 | 1 |
| **Total** | **343** | **7** | **75** | **259** | **2** |

Les deux éléments obsolètes prouvés (aucun import, vérifié par `git grep`) : `src/components/studio/palette-picker.tsx`
et le composant `PostEditor` de `src/components/studio/post-editor.tsx` (sa constante `NETWORKS` et la route
`/api/posts/[pid]` restent utilisées et testées : seul le composant peut partir).

---

## Inventaire A — Entrée, nouveau projet, Pilote, Produit/Activité, abonnement et coûts, compte, administration

Dépôt lu en lecture seule sur `main` 1c406f50 (31/10/2026). Aucun serveur lancé, aucun appel réseau, aucune IA.
Chemins relatifs à `/home/user/Ecom-studio-ia`. `prep.tsx` = `src/components/studio/tab-preparation.tsx`.

Rappel SYNA (lu dans le code, pas supposé) :
- Catalogue `src/lib/orchestrator/conversation/studio-operations.ts` ; toute opération avec adaptateur est « simulé » (`evidence:'isolated_simulated_provider'`), jamais testée avec un vrai fournisseur ni chez un client.
- Drapeaux fermés par défaut (`tool-flags.ts`) : `offer.analyse` = `STUDIO_CONVERSATION_LOT_A+AI+SPECIALISTS+TOOLS` ; `research.generate` = idem + `_RESEARCH` ; `brand.generate` = idem + `_BRAND` ; `brand.correct/confirm` = + `_BRAND_REVIEW` ; `logo.*` = + `_CONTEXT` + `_LOGOS` (+ `_LOGO_REVIEW`) ; `images.*` = + `_CONTEXT` + `_IMAGES` ; `copy.*` = + `_CONTEXT` + `_CONTENT`. Exception : `brief.update` n'a **pas** de drapeau dédié (actif dès que la fiche est modifiable, `studioOperationCatalogue(…, writableBrief)`).
- Le panneau lui-même n'apparaît que si `STUDIO_CONVERSATION_LOT_A=1`, `_AI=1` et `_UI=1` (`ui-enabled.ts`).

### Comment SYNA est monté dans l'interface (shell)

- `src/app/studio/[projectId]/layout.tsx:13-16` : `AgentUiProvider enabled={conversationUiEnabled()}` entoure `ProjectProvider` puis `StudioShell`. Le contexte (`agent-ui-context.tsx`) porte trois choses : activé oui/non, panneau ouvert/fermé, et un « focus » (projet, onglet, cible, libellé) que d'autres onglets renseignent (boutique, images, catalogue — hors périmètre).
- `shell.tsx:622` : `<ConversationDock projectId=…/>` en dernier enfant du shell. `conversation-panel.tsx:147-157` : si non activé → rien. Sinon bouton flottant **« SYNA »** en bas à droite (au-dessus de la barre mobile, `bottom-24`, `lg:bottom-5`) ; au clic, panneau `aside#central-agent-panel` à droite (400–440 px) titré « SYNA · Une mémoire pour tout le Studio », contenant `ConversationPanel compact` (clé = projet).
  - Ordinateur ≥ 1280 px : panneau non modal, l'espace de travail se décale (`xl:pr-[416px]`, `shell.tsx:530`).
  - Téléphone/tablette : panneau modal (voile, piège du focus, défilement de la page bloqué). Échap ou × ferme.
  - Monté au premier ouverture puis gardé caché ; refermé et remis à zéro au changement de projet.
- Hors projet : `src/app/studio/page.tsx` passe `agentEnabled` à `StudioHome` ; le chat de création n'apparaît que pour un **abonnement payé en attente** (`home.tsx:491-508`) — jamais pour un compte Découverte.
- Effets de SYNA activé sur le shell : le repère « Prochaine étape » se replie en `<details>` sur Boutique (`shell.tsx:444`) ; `StrategyStatus` et l'invitation tutoriel adaptent leur place (`strategy-status.tsx:9`, `tutorial.tsx:61`).
- Aucun réglage SYNA dans l'administration : l'activation passe uniquement par variables d'environnement.

### Tableau

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA (oui/partiel/non + preuve) | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Entrée | Liste « Mes projets », tuiles « Ouvrir le studio » — `home.tsx:534-561, 585-621` | `GET /api/projects` (toutes les 8 s) ; lien `/studio/:id/pilote` | non (navigation) | 3 | reste | — |
| Entrée | « Nouveau projet », « Créer un nouveau projet », « Créer ce projet » (abonnement payé en attente) — `home.tsx:540, 547, 554` | état local (`setCreating`, `setUseSub`) | non | 3 | reste ; ouvre le chat de création si SYNA actif | — |
| Entrée | Choix du forfait et paiement (`NewSubscription` → `PricingCards`) — `new-subscription.tsx:22-36`, `home.tsx:530` | `POST /api/billing/checkout {kind:'subscription'}` → Stripe | non (achat : hors SYNA) | 3 | reste | — |
| Entrée | Sélecteur « Abonnement à utiliser » — `home.tsx:501, 508` | local | non | 3 | reste (déjà au-dessus du chat) | — |
| Entrée | Formulaire manuel de départ `NewProject` (boutique/services, type de boutique, langue, nom, zone, adresse, horaires, téléphone, e-mail, prestations `ServicesEditor`, modes de contact, lien, « Tout ce que vous voulez obtenir », cible, nom produit/marque/prix) + « Préparer mon projet » — `home.tsx:25-333` | `POST /api/projects?subscription=` (multipart, `flow=preparation`) → création, dossiers, `prepareInitialCreatives`, `saveStartFiles`, `startPreparation` (`src/app/api/projects/route.ts:106-111`) | **partiel** : création par conversation hors catalogue (`ConversationPanel subscriptionKey`, `home.tsx:508` ; brouillon `/api/studio-agent/draft` puis même `POST /api/projects`, `conversation-panel.tsx:76-85`). Champs envoyés par SYNA (`creation.ts:14`) : texte seulement — **manquent** photos, logo, langue, type de boutique, plateforme, site existant. Drapeau `_UI` fermé | 2 | garder comme repli « Utiliser le formulaire manuel » (déjà présent) ; ajouter fichiers et langue au chat avant tout retrait | même projet créé (mêmes champs, mêmes fichiers rangés), abonnement consommé une seule fois, refus 409 en double création, coordonnées jamais redemandées |
| Entrée | « J'ai déjà mon site et mon logo » : adresse, case « ce site m'appartient », logo, langue — `home.tsx:186, 362-396` | même `POST /api/projects` avec `existingSite=1`, `siteUrl`, `siteOwnership` ; lecture du site par le moteur (`src/lib/engine/existing-site.ts`) | non (aucun champ site existant dans `creation.ts`) | 2 | à ajouter à SYNA ; garder le formulaire | même lecture (plateforme, logo, couleurs, pages), même décision garder/reproduire |
| Entrée | Dépôt de photos (8 max) et du logo à la création — `home.tsx:126-166, 346-356` | envoi multipart avec le `POST /api/projects` | non (`images.upload` = `adapter:'none'`) | 3 | reste ; SYNA devra accepter des pièces jointes | — |
| Entrée | « Rédiger ma description avec l'IA » / « Une autre version » / « Revenir à mes mots » — `ai-description.tsx:26-55` (utilisé `home.tsx:249, 292`) | `POST /api/describe` → `houseDescribe` (offert, hors budget IA, refusé sans abonnement payé : 402) | non : aucune opération du catalogue (le chat de création rédige sa propre fiche, qualité non comparée — à vérifier) | 2 | devient une suggestion SYNA dans le chat de création | même texte de qualité, gratuit, mêmes coordonnées reprises, refus Découverte identique |
| Entrée | Bascule « Utiliser le formulaire manuel » / « Revenir à SYNA » — `home.tsx:508` | local | — (c'est l'aiguillage) | 3 | reste tant que la parité n'est pas prouvée | — |
| Entrée | Bandeau Découverte « Ouvrir le studio de démonstration » — `home.tsx:512-520` | lien `/studio/decouverte` | non | 3 | reste ; **texte « les 30 thèmes » obsolète** (la page Découverte compte les thèmes refaits) | — |
| Entrée | « Reprendre avec mon abonnement » (anciens essais) — `home.tsx:446-454, 570` | `POST /api/projects/hidden/:id {subscription}` | non | 3 | reste | — |
| Entrée | « Gérer mon abonnement » → fenêtre abonnement (changer, reprendre, résilier, réactiver, « Recharger l'IA ») — `home.tsx:615` ; `project-subscription.tsx:36-140` | `GET/POST /api/projects/:id/subscription {change / resume / cancel}` ; `POST /api/billing/checkout {topup / reactivate}` | non (paiement/résiliation : sensibles) | 3 | reste | — |
| Entrée + shell | Suppression de projet (poubelle de la tuile, menu du sélecteur de projet) — `delete-project.tsx:13-47`, `home.tsx:618`, `shell.tsx:93` | `DELETE /api/projects/:id` (arrête tâches et publications prévues) | non (aucune opération ; `files.delete` concerne un fichier) | 3 | reste, avec sa confirmation | — |
| Entrée | En-tête : Administration, Rendez-vous, Thèmes, Mon compte, langue, clair/sombre, déconnexion — `home.tsx:461-467` | liens ; `POST /api/auth/logout` | non | 3 | reste | — |
| Compte | « Mes abonnements » (Gérer, Créer le projet, Choisir un forfait) — `src/components/account.tsx:99-164` | `GET /api/projects` ; fenêtre abonnement ci-dessus ; liens `/studio?nouveau=1` | non | 3 | reste | — |
| Compte | État des paiements, factures, vérification — `src/components/payment-status.tsx:8-10` | `GET /api/billing/…` (factures) ; `POST /api/billing/reconcile` | non | 3 | reste | — |
| Compte | « Historique des paiements » — `account.tsx:62-79` | `GET /api/billing` (`useBilling`) | non | 3 | reste | — |
| Compte | Mot de passe — `src/components/password-forms.tsx:154` | `POST /api/me/password` | non | 3 | reste | — |
| Compte | Demandes au support (créer, répondre) — `src/components/support-panel.tsx:11, 29` | `POST /api/support {create / reply}` (aucune IA) | non | 3 | reste (canal humain) | — |
| Compte | Confidentialité : demande d'effacement — `src/components/privacy-panel.tsx:7` | `POST /api/me/privacy {request_erasure}` | non | 3 | reste (sensible) | — |
| Rendez-vous d'accompagnement | Réserver un appel de 60 min, payer, reporter, annuler — `calls.tsx:25-185` (`/studio/rendez-vous`) | `POST /api/calls`, `POST /api/calls/:id {reschedule / cancel}`, paiement Stripe | non (`appointments.create` concerne les réservations du site du client, pas cet appel) | 3 | reste | — |
| Découverte | Studio de démonstration (thèmes, marques, publicités, calendrier d'exemple) — `src/app/studio/decouverte/page.tsx` | lecture seule, aucune écriture | non (SYNA absent, voulu : aucun appel IA sans abonnement) | 3 | reste sans SYNA | test : aucun appel IA ni création depuis Découverte |
| Shell | Barre latérale des espaces (groupes, « Outils avancés » repliés, pastilles), repli du menu, raccourcis Alt+1…9 et « [ » — `shell.tsx:530-591` | navigation ; préférences en `localStorage` | non | 3 | reste ; l'onglet actif sert de contexte à SYNA | — |
| Shell | Sélecteur de projet — `shell.tsx:64-98` | `GET /api/projects` | non | 3 | reste | — |
| Shell | Recherche rapide Ctrl+K — `shell.tsx:241-330` | navigation locale | non | 3 | reste (pas d'IA) | — |
| Shell | Tâches en cours : « Pause » / « Reprendre » — `shell.tsx:100-147` | `POST /api/projects/:id/pause {pause / resume}` | non | 3 | reste ; SYNA pourrait l'afficher | — |
| Shell | Notifications — `shell.tsx:149-184` | `GET /api/notifications` (30 s), `POST` (marquer lues) | non | 3 | reste | — |
| Shell | Jauge « Reste X % » du budget IA du projet, lien forfait, bandeau quota — `shell.tsx:460-462, 606-615` | `GET /api/billing` (15 s) + `aiBudget` de `GET /api/projects/:id` | non | 3 | reste ; même chiffre que les devis SYNA | la jauge doit bouger pareil après une action SYNA |
| Shell | Tutoriels (bouton d'en-tête, lien du menu, lecteur, « Première visite ? ») — `tutorial.tsx:14-187` | local (vidéos `public/tutorials/`) | non | 3 | reste | — |
| Shell | Menu téléphone (compte, tutoriels, admin, déconnexion), bascule FR/EN, barre basse 4 espaces + « Plus » — `shell.tsx:187-402` | navigation ; `POST /api/auth/logout` | non | 3 | reste ; vérifier que le bouton SYNA ne recouvre rien | — |
| Shell | Repère d'espace + « Prochaine étape » (masquable) — `shell.tsx:409-445` | local (`projectProgress`) | non | 3 | reste (déjà replié sur Boutique quand SYNA actif) | — |
| Shell | Chargement du projet (`ProjectProvider`) — `project-context.tsx:41-52` | `GET /api/projects/:id` (3,5 s en travail, sinon 15 s) | non | 3 | reste (source du contexte SYNA) | — |
| Shell | Bouton « SYNA » et panneau — `shell.tsx:622`, `conversation-panel.tsx:147-157` | `/api/projects/:id/conversation/*` | c'est SYNA | — (non compté) | — | — |
| Pilote (préparation) | Remarque : tout projet créé avec `flow=preparation` affiche **uniquement** `TabPreparation` (`tab-pilote.tsx:304`, `preparation` non nul dans `GET /api/projects/:id`, `src/app/api/projects/[id]/route.ts:55`) | — | — | — | — | — |
| Pilote (préparation) | Étapes 1 à 5 (Votre offre, Recherche et stratégie, Votre marque, Contenus et plan, Visuels) — `prep.tsx:355-385` | local | non | 3 | reste ; étape active = contexte SYNA | — |
| Pilote (préparation) | Bandeau d'erreur + « Récupérer les étapes acquises » — `prep.tsx:387-402` | `POST /api/projects/:id/preparation {action:'recover'}` (sans nouvelle génération payante) | non | 3 | reste | — |
| Pilote (préparation) | Suivi de la tâche, « en pause » — `prep.tsx:403-411` | lecture (`GET …/preparation` toutes les 3 s) | non | 3 | reste | — |
| Pilote (préparation) | Fiche « Ce que vous proposez » (activité, nom, description, lien, cible, consignes, prix, coordonnées ; prestations, « Ajouter une prestation », contact) + « Enregistrer mes informations » — `prep.tsx:428-750` | `POST …/preparation {action:'edit-brief', input}` | **partiel** : `brief.update` (adaptateur `brief`, sans drapeau) mais `assertBriefWritable` (`tools.ts:12-18`) refuse dès qu'une analyse existe, qu'une étape est validée ou qu'une tâche tourne | 3 | reste, rangé dans le volet de la fiche | modification identique après analyse : aujourd'hui impossible côté SYNA |
| Pilote (préparation) | « Analyser mes informations et mes photos par l'IA » / « Comprendre mon activité » + champ « Défaut précis à corriger » + compteur d'essais 2/2 — `analysis-retry.tsx:8-27`, `prep.tsx:477` | `POST …/preparation {action:'quote', step:'brief', runAction:'analyze'}` puis `{action:'generate', quoteId}` → `queuePreparation(brief, analyze)` | **oui** : `offer.analyse` (adaptateur `analysis`, `tool-execution.ts` → même `queuePreparation(…,'brief','analyze',…)`) — simulé, drapeau fermé | 1 | devient une suggestion SYNA ; retrait seulement après parité | même devis (estimation + maximum en %), même compteur d'essais et même refus au 3ᵉ, même empreinte d'analyse, même tâche, annulation sans débit |
| Pilote (préparation) | Fiche d'activité (services) : « C'est exact », « Corriger », « Compléter », « À préciser plus tard », questions (une phrase ou par prestation), « Corriger la présentation », « Modifier ou ajouter des prestations » — `brief-fiche.tsx:39-246` | `POST …/preparation {action:'fiche' / 'answer'}` | non (les questions de la conversation SYNA portent sur le brouillon avant analyse, `index.ts:96` ; après analyse `brief.update` est refusé) | 3 | reste ; SYNA pourra proposer les réponses | réponse identique enregistrée dans la même fiche, même révision |
| Pilote (préparation) | Questions bloquantes (produit) « Enregistrer ma réponse » — `prep.tsx:528` | `POST …/preparation {action:'answer'}` | non | 3 | reste | idem |
| Pilote (préparation) | « Actualiser mes photos de référence », lien « Ajouter des photos dans Produit » — `prep.tsx:684-709` | local (liste `photoIds`), enregistré par `edit-brief` | non | 3 | reste | — |
| Pilote (préparation) | « Confirmer ces informations » — `prep.tsx:751-761` | `POST …/preparation {action:'approve', step:'brief'}` | non (aucune opération de validation de l'offre) | 3 | reste (validation humaine) ; SYNA peut la proposer | — |
| Pilote (préparation) | « Références, un lien par ligne » + « Enregistrer ces références » — `prep.tsx:780-802` | `POST …/preparation {action:'references', urls}` | non (à vérifier : la recherche SYNA ne prend pas de liens dans son contrat) | 3 | reste | — |
| Pilote (préparation) | « Rechercher et préparer les approches » / « Préparer cinq angles » — `prep.tsx:811-819, 866` | devis puis `queuePreparation(research, generate)` | **oui** : `research.generate` (`research-tool-execution.ts`, même moteur) — simulé, drapeau `_RESEARCH` fermé | 1 | suggestion SYNA ; retrait après parité | mêmes sources (≤ 10), même nombre d'angles, même devis, correction transmise, aucun choix automatique |
| Pilote (préparation) | Choix d'un angle + « Choisir cette stratégie » — `prep.tsx:871-920` | `POST …/preparation {action:'approve', step:'research', choiceId}` | **partiel** : `strategy.compare` / `strategy.preference` (préférence dans la discussion) ; `research.approve` = `adapter:'none'` | 3 | reste (validation) | — |
| Pilote (préparation) | « Préparer une proposition de marque » — `prep.tsx:933-942` | devis puis `queuePreparation(brand, generate)` | **oui** : `brand.generate` (`brand-tool-execution.ts`, même moteur) — simulé, drapeau `_BRAND` fermé | 1 | suggestion SYNA ; retrait après parité | même proposition (nom, slogan, palette, polices, ton), même devis, consigne transmise |
| Pilote (préparation) | Nom, slogan, 5 couleurs, 2 polices + « Valider ce nom avant les trois directions » — `prep.tsx:945-1046` | `POST …/preparation {action:'identity', identity:{name,tagline,palette,fonts}}` | **partiel** : `brand.correct` / `brand.confirm` (contrat `brand-review-contract.ts`) ne portent que **nom et slogan** — palette et polices absentes | 3 | reste ; ajouter palette/polices à SYNA | même identité enregistrée, mêmes étapes suivantes remises « à reprendre » |
| Pilote (préparation) | Choix du logo + « Valider la marque et ce logo » / « Valider les retouches de l'identité active » — `prep.tsx:1065-1103` | `POST …/preparation {action:'approve', step:'brand', logoId}` | **partiel / à vérifier** : `logo.replace` (adaptateur `logo-review`, « choisir puis valider une identité acquise ») — vérifier qu'il valide la même étape | 3 | reste | même logo actif, même étape validée, même propagation |
| Pilote (préparation) | « Préparer les contenus et le plan » — `prep.tsx:1119-1128` | devis puis `queuePreparation(content, generate)` | **partiel** : `copy.generate` rédige **un** document natif pour une page ; ni le plan des pages ni l'ensemble des textes | 2 | préserver ; tâche Codex | même plan de pages, mêmes documents, même SEO, même devis |
| Pilote (préparation) | « Corriger seulement cette page » (avec défaut à corriger) — `prep.tsx:1164-1176` | devis puis `queuePreparation(content, generate, slot=page)` | **partiel / à vérifier** : `copy.edit` retouche un document natif ; pas prouvé que ce soit le même document que la préparation | 2 | préserver | seule la page visée change, les autres gardent leur version |
| Pilote (préparation) | « Reprendre les textes corrigés dans l'éditeur » — `prep.tsx:1201-1210` | `POST …/preparation {action:'refresh-content'}` | non | 3 | reste | — |
| Pilote (préparation) | « Valider ces contenus et le plan » — `prep.tsx:1211-1220` | `approve content` | non | 3 | reste | — |
| Pilote (préparation) | « Préparer les médias manquants (avec devis) » — `prep.tsx:1255` | devis puis `queuePreparation(media, collect)` (10 visuels + vidéo(s) d'ambiance) | **partiel** : `images.generate` crée 1 à 5 images en bibliothèque, « aucune insertion automatique » (`image-tool-execution.ts:1`) ; ne remplit pas les emplacements, pas de Pixabay, pas de vidéo | 2 | préserver | mêmes emplacements remplis, même contrôle texte-image, même devis |
| Pilote (préparation) | Emplacement : « Créer ce visuel par l'IA » / « Chercher et contrôler sur Pixabay » / « Contrôler et affecter la vidéo obtenue » — `prep.tsx:1502-1508` | devis puis `queuePreparation(media, image, slot)` | **partiel** : `images.generate` sans affectation ; `images.search` = `adapter:'none'` | 2 | préserver | image placée au même emplacement, même vérification |
| Pilote (préparation) | Emplacement : affectation page/section « Enregistrer l'affectation et revérifier », choix d'une image existante, accord « personnes » — `prep.tsx:1474-1570` | `POST …/preparation {action:'placement' / 'consent' / 'assign'}` | non | 3 | reste (l'accord personnes est une règle du propriétaire) | — |
| Pilote (préparation) | « Valider les visuels et vérifier le projet » — `prep.tsx:1281` | `approve media` | non | 3 | reste | — |
| Pilote (préparation) | Champ « Défaut précis à corriger pour un nouvel essai » (étapes 2 à 5) — `prep.tsx:1292-1314` | local, envoyé avec le devis (`correction`) | partiel : SYNA transmet `correction`/`instruction` pour recherche et marque | 2 | fusionner avec la saisie SYNA (zone concurrente) | même texte de correction repris dans le même devis |
| Pilote (préparation) | Carte « Avant de lancer » : estimation, maximum, « Confirmer cet essai » / « Annuler » — `prep.tsx:1315-1360` | `POST …/preparation {action:'generate', quoteId}` | SYNA a sa propre carte de devis (`confirmation:'separate_native_quote_and_confirmation'`) | 3 | reste (dépendance) | même `quoteId` réutilisable des deux côtés, aucun double débit |
| Pilote (préparation) | « Télécharger les données préparées » (JSON) — `prep.tsx:1375-1394` | local (fichier téléchargé) | non | 3 | reste | — |
| Pilote (préparation) | « Versions enregistrées » + « Reprendre pour vérification » — `prep.tsx:1403-1431` | `POST …/preparation {action:'restore', version}` | non (`videos.restore` concerne les vidéos) | 3 | reste | — |
| Pilote (préparation) | « Plus tard : vos créations pour les réseaux » — `InitialCreatives` : « Je confirme le brief… », « Devis global des créations manquantes », accepter le devis — `initial-creatives.tsx:30-56` (aussi dans Publications et Publicités) | `POST /api/projects/:id/social/initial {confirm-context / quote / generate}` | **partiel** : `social.plan` / `social.draft` / `social.generate` (brouillons, image manquante) ≠ lot initial 10 + 10 | 2 | préserver | même nombre de créations, mêmes formats, même devis global |
| Pilote (préparation) | `InitialAuthorization` : « Voir le devis de démarrage automatique », « J'accepte ce devis… », « Annuler cet accord avant le démarrage » — `initial-authorization.tsx:17-35` | `POST /api/projects/:id/social/initial {authorize-quote / authorize / cancel-authorization}` | non | 2 | préserver (accord de dépense) | — |
| Pilote (préparation) | « Le site adapté à votre offre » : choix Services / Boutique spécialisée / E-commerce, références de thème, lien « Consulter les thèmes et l'éditeur » — `preparation-handoff.tsx:15-32`, `prep.tsx:112-127` | `POST /api/projects/:id/preparation/handoff {action:'category-choice', contextHash}` | non (`theme.select` = `adapter:'none'`) | 3 | reste | — |
| Pilote (préparation) | Blocs intégrés hors périmètre : `MarketingStrategy` (`prep.tsx:323`), `LogoV2Panel` (`:1063`), `ContentPanel` (`:1225`), `GuidedVideo` (`:1257`) | voir inventaires Stratégie, Marque, Contenus, Vidéos | — | — (non compté) | — | — |
| Pilote (anciens projets) | « Où en est votre projet ? » + « Prochaine étape » — `tab-pilote.tsx:22-61` | lecture locale | non | 3 | reste | — |
| Pilote (anciens projets) | « Démarrer la création » / « Lancer la création automatique complète » (`NewProject` compact) — `start-creation.tsx:9-23`, `tab-pilote.tsx:345-358` | `POST /api/projects/:id/start` (form, `flow=preparation` → `startPreparation`) | non (SYNA crée un projet, ne démarre pas un projet existant) | 3 | reste | — |
| Pilote (anciens projets) | « Que voulez-vous obtenir ? » (demande libre), « Préparer le plan et le devis », « Utiliser l'exemple », devis par module, « Plafond (% du budget IA) », « Accepter et lancer », « Annuler », « Réessayer », raccourcis « Modifier à la main (gratuit) » — `workflow-panel.tsx:69-300` | `POST /api/projects/:id/workflow {text}` (`prepareWorkflow`) ; `POST …/workflow/:wid {start(approveMicro, capPct) / cancel / retry}` | non : aucune opération ; **zone de saisie IA concurrente** | 2 | fusionner dans SYNA (même plan, même devis) | même plan, même devis par module, même plafond, reprise sans refaire les étapes réussies |
| Pilote (anciens projets) | « Votre identité a changé » : cases, « Mettre aussi à jour mes créations modifiées à la main », « Mettre à jour la sélection · x % » — `workflow-panel.tsx:302-361` | `GET/POST /api/projects/:id/brand/impact {keys, includeEdited, approvedPaidMicro}` | non | 2 | préserver | mêmes créations mises à jour, ancienne version gardée, même coût |
| Pilote (anciens projets) | Avancement : « Mettre en pause », « Arrêter », « Reprendre », « Relancer », « Reprendre où c'était », « Relancer » par étape — `tab-pilote.tsx:312-430` | `POST /api/projects/:id/pause`, `POST /api/projects/:id/resume {from}`, `POST /api/jobs/:id {cancel / retry}` | non | 3 | reste ; **relance d'étape sans devis visible** (à vérifier côté serveur) | — |
| Pilote (anciens projets) | « Votre marque attend votre validation » : « Valider et continuer », « Ajuster la marque » — `tab-pilote.tsx:403-411` | `POST /api/projects/:id/resume {from:'copy'}` | non | 3 | reste | — |
| Pilote (anciens projets) | Carte aperçu (compteurs, « Ouvrir l'éditeur », « Changer de thème ») + carte du site actuel — `tab-pilote.tsx:433-468`, `existing-site.tsx:191-212` | navigation | non | 3 | reste | — |
| Pilote (anciens projets) | « Complétez votre activité » → onglet Activité — `tab-pilote.tsx:132-149` | navigation | non | 3 | reste | — |
| Pilote (anciens projets) | « Quelques questions indispensables » + « Enregistrer mes réponses » — `tab-pilote.tsx:89-129` | `PATCH /api/projects/:id/product {answers}` (complète boutique et publications) | non | 3 | reste | — |
| Pilote (anciens projets) | Réglages : langue des contenus, plateforme (`PlatformCards`) — `tab-pilote.tsx:206-282`, `platform-picker.tsx:77-110` ; plateforme aussi via `PlatformPill` (`platform-picker.tsx:112-160`, utilisé dans Boutique) | `PATCH /api/projects/:id {settings:{language}}` / `{platform}` | non | 3 | reste ; **invisible dans le Pilote d'un projet en préparation** (à vérifier ailleurs pour la langue) | — |
| Pilote (anciens projets) | « Mémoire du projet » : ajouter (type, sujet, ce qu'il faut retenir), « Oublier » — `tab-pilote.tsx:151-202` | `GET/POST/DELETE /api/projects/:id/memory` | non : aucune opération (SYNA écrit seulement via `remember()` pendant ses actions) | 3 | reste ; à rendre visible en préparation | — |
| Pilote / Produit | Bandeau « Version de base, sans IA » / « IA pas encore connectée » + « Passer à la version complète » — `common.tsx:194-224` | lecture | non | 3 | reste | — |
| Produit | « Fiche produit » : nom, prix, informations (ajouter/supprimer), « Enregistrer » — `tab-produit.tsx:25-100` | `PATCH /api/projects/:id/product {name, price, facts}` | non (`brief.update` vise la fiche de préparation ; `catalogue.update` vise les brouillons du Catalogue — à vérifier si c'est la même fiche) | 3 | reste | — |
| Produit | « Ce que montre la photo », « Allégations à éviter » — `tab-produit.tsx:104-125` | lecture | non | 3 | reste (contexte SYNA) | — |
| Produit | « Photos du produit » : « Ajouter » (envoi + détourage), « Détourer » / « Refaire le détourage », « Ne pas utiliser » — `tab-produit.tsx:152-262` | `POST /api/projects/:id/files` (form) ; `POST /api/projects/:id/cutouts {run / redo / setAside}` (moteur local) | non (`images.upload` = `adapter:'none'`) | 3 | reste | — |
| Produit + Activité | « Réanalyser tout le projet » — `tab-produit.tsx:259-270`, `tab-activite.tsx:168-186` | `POST /api/projects/:id/resume {from:'analysis'}` → tâche `pipeline.run` (marque, textes, images, site) ; **seulement un `confirm()` du navigateur, pas de devis à l'écran** | **partiel** : `offer.analyse` analyse sans avancer d'étape ; rien ne relance tout | 2 | préserver ; ajouter un devis | même relance, mêmes versions conservées, coût annoncé avant |
| Produit | « Variantes » + photo par valeur — `tab-produit.tsx:282-375` | `PATCH /api/projects/:id/product {variants}` ; `POST /api/projects/:id/product/variant-photo` | non (`catalogue.update` = brouillons du Catalogue) | 3 | reste | — |
| Produit | « Photos en situation » : « Ajouter » — `tab-produit.tsx:377-410` | `POST /api/projects/:id/files` | non | 3 | reste | — |
| Activité (services) | « Votre activité » (nom, catégorie, résumé, informations), « Prestations » (`ServicesEditor`), « Zone, horaires et contact » (`ContactModePicker`), « Enregistrer » — `tab-activite.tsx:17-146` | `PATCH /api/projects/:id {activity, services}` | non (`services.update` = `adapter:'none'`) | 3 | reste | — |
| Activité (services) | « Enregistrer et mettre à jour le site » — `tab-activite.tsx:63-75, 147` | `PATCH` puis `POST /api/projects/:id/theme/build` → tâche `shop.build` ; **sans `useCostConfirm`** alors que le même appel en a un dans `existing-site.tsx:65` | non (à vérifier : `theme.compose` compose avec les composants, ce n'est pas `shop.build`) | 2 | préserver ; aligner la confirmation de coût | même nouvelle version du site, précédente restaurable, même coût |
| Activité (services) | « Photos de l'activité » : « Ajouter » — `tab-activite.tsx:198-230` | `POST /api/projects/:id/files` | non | 3 | reste | — |
| Produit / Activité | Blocs intégrés hors périmètre : `CatalogPanel` (`tab-produit.tsx:132`), `ContentPanel` (`tab-produit.tsx:133`, `tab-activite.tsx:192`) | voir inventaires Catalogue et Contenus | — | — (non compté) | — | — |
| Site existant (Pilote/Boutique) | « Faire créer un nouveau site par le studio » → « Oui, créer un nouveau site » — `existing-site.tsx:64-80, 149-161` | `useCostConfirm('theme')` puis `PATCH /api/projects/:id {existingSite:{newSiteRequested}}` + `POST /api/projects/:id/theme/build` | non / à vérifier (`theme.original` crée un site sans thème de départ ; pas prouvé équivalent) | 2 | préserver | même site créé, site actuel intact |
| Site existant | « Importer mon thème » (Shopify) — `existing-site.tsx:148, 154` → `theme-import.tsx:24` | `POST /api/projects/:id/theme/import` | non | 3 | reste (fichier fourni par le client) | — |
| Site existant | « Ouvrir mon site », « Voir mon site d'origine », « Masquer le détail », lecture du site — `existing-site.tsx:21-52, 147, 168-189` | liens / lecture | non | 3 | reste | — |
| Coûts (transverse) | Confirmation « Cette création utilise le budget IA… » : « Continuer », « Continuer sans IA », « Recharger l'IA · 10 € », « Annuler » — `cost-confirm.tsx:22-126` (utilisée par Boutique, Images, Blog, éditeur de pub, site existant) | `GET /api/projects/:id/subscription` ; `POST /api/billing/checkout {kind:'topup'}` | non (SYNA utilise ses devis natifs ; pas de recharge) | 3 | reste (dépendance) ; à terme un seul système de devis | même refus quand le budget est épuisé, même recharge |
| Langue ponctuelle (transverse) | `ContentLangPicker` : langue d'une action précise — `content-lang.tsx:15-38` (Boutique, Marque, Blog, Prompts, campagnes) | local, envoyé avec l'action | non vérifié (à vérifier si SYNA accepte une langue par action) | 3 | reste | même langue produite |
| Administration (survol) | Fournisseurs IA : clés chiffrées, test, « Désactiver » / « Réactiver » — `src/components/admin.tsx:169-265` | `POST /api/admin/settings {set:[provider.<id>.disabled]}`, `POST /api/admin/test` | non | 3 | reste ; un fournisseur désactivé doit aussi couper SYNA | test : fournisseur désactivé → SYNA refuse comme l'écran |
| Administration (survol) | Modèles et tarifs (route par tâche, prix, revue des tarifs), routage texte et médias — `admin.tsx:266-…`, `admin-text-routing.tsx`, `admin-media-routing.tsx` | `POST /api/admin/settings` | non | 3 | reste (base des devis en %) | devis SYNA = devis écran pour la même route |
| Administration (survol) | Consommation (coût par appel) — `admin.tsx:681-…` | lecture `GET /api/admin/overview` | non | 3 | reste ; doit distinguer les appels faits par SYNA | — |
| Administration (survol) | Abonnements et clients (offrir, suivre) — `admin-plans.tsx:24-…`, `admin.tsx:450-…` | `POST /api/admin/billing/overview`, `POST /api/admin/users/:id` | non | 3 | reste | — |
| Administration (survol) | Thèmes et forfaits (droits par thème) — `admin-theme-rights.tsx:14-89` | `/api/admin/theme-rights` | non | 3 | reste (droits lus aussi par SYNA) | — |
| Administration (survol) | Rendez-vous d'accompagnement (créneaux, prix, fait) — `admin-plans.tsx:127-…` | `/api/admin/calls` | non | 3 | reste | — |

### (a) Chats et zones de saisie IA concurrentes de SYNA dans ce périmètre

1. « Que voulez-vous obtenir ? » + « Préparer le plan et le devis » (`workflow-panel.tsx:233-300`) : vraie demande libre en une phrase, avec plan et devis, parallèle à SYNA. Visible seulement dans le Pilote des anciens projets (et `Validations` est réutilisé dans Marque).
2. « Rédiger ma description avec l'IA » (`ai-description.tsx`) dans le formulaire de création : rédaction IA offerte, en dehors du chat de création SYNA.
3. Champ « Tout ce que vous voulez obtenir (facultatif) » (`home.tsx:298-300`, envoyé comme `request`) : consignes libres conservées pour la suite, doublon du chat de création.
4. Champs « Défaut précis à corriger pour un nouvel essai » (`analysis-retry.tsx:15-16`, `prep.tsx:1292-1314`) : consigne libre envoyée à l'IA avec le devis.
5. Formulaire de création manuel lui-même (`NewProject`), qui coexiste avec le chat de création (`home.tsx:508`, bascule « Utiliser le formulaire manuel »).

### (b) Capacités SYNA absentes ou partielles constatées

- **Création de projet** : ni photos, ni logo, ni « J'ai déjà mon site », ni langue, ni type de boutique, ni plateforme (`creation.ts:14`). Pas d'opération de catalogue pour la création (passe par `_UI` seulement).
- **Fiche de l'offre** : `brief.update` refusée dès qu'une analyse existe ou qu'une étape est validée (`tools.ts:18`) ; aucune réponse aux questions de la fiche d'activité ni correction de fait après analyse.
- **Validations de Préparation** : offre, recherche (`research.approve` = `none`), contenus, visuels → aucune. Marque : seulement via `logo.replace` (à vérifier).
- **Identité** : `brand.correct` ne couvre que nom et slogan, pas la palette ni les polices.
- **Contenus** : pas de génération du plan des pages ni de l'ensemble des textes de préparation ; « Corriger seulement cette page » non prouvé.
- **Médias de préparation** : aucune collecte des emplacements, aucune affectation page/section, aucun accord « personnes », pas de Pixabay (`images.search` = `none`), pas d'import (`images.upload` = `none`).
- **Reprise et versions** : « Récupérer les étapes acquises », « Reprendre pour vérification » (versions), « Reprendre les textes corrigés » → aucune.
- **Lot initial réseaux** (10 + 10 créations) et accord de démarrage automatique → absents.
- **Workflow V2** (demande libre → plan → devis → lancement) et **propagation de l'identité** → absents.
- **Réglages** : mémoire du projet (lire/ajouter/oublier), langue des contenus, plateforme, catégorie de site → absents.
- **Produit/Activité** : `services.update` = `none` ; fiche produit, variantes, photos, détourage, « Réanalyser tout le projet », « Enregistrer et mettre à jour le site » → absents.
- **Commandes sensibles (voulu)** : abonnement, paiement, recharge, résiliation, suppression de projet, support, effacement de données, rendez-vous d'accompagnement → hors SYNA.
- Toutes les opérations présentes ne sont prouvées qu'avec un fournisseur simulé, drapeaux fermés ; aucun réglage pour les activer dans l'administration.

### (c) Dépendances à ne pas casser

- **Droits forfait** : `requirePlan` / `requireCreationPlan` appelés par chaque exécution SYNA ; création refusée sans abonnement payé (`/api/describe` 402, `NoFreeSubscription` 409) ; Découverte sans IA (`aiActiveFor`) ; droits de thèmes (`admin-theme-rights.tsx`).
- **Quotas et budget IA** : jauge « Reste X % » du projet (`shell.tsx:462`, `aiBudget`), bandeau de quota, budget en pause → `useCostConfirm` propose « Continuer sans IA » ou recharge ; fournisseur « Désactiver » en administration.
- **Devis** : deux systèmes coexistent — (1) `useCostConfirm` (`cost-confirm.tsx`) = simple rappel du % restant, sans montant ; (2) devis de Préparation (`action:'quote'` → `quoteId`, estimation + maximum en %, compteur d'essais 2/2, correction incluse) que SYNA réutilise (`createQuote`/`quoteOf`). Le lot initial réseaux et le Workflow V2 ont chacun leur propre devis. Certaines relances payantes n'en montrent aucun à l'écran (« Réanalyser tout le projet », « Relancer » d'une étape, « Enregistrer et mettre à jour le site » → `theme/build` sans `useCostConfirm`) — à vérifier côté serveur.
- **Historique / versions** : `revision` obligatoire à chaque `POST …/preparation` (conflit sinon) ; versions restaurables ; étapes « stale » après un changement amont ; `analysisFingerprint` ; tâches reprises sans refaire les étapes réussies (`retry`, `recover`). SYNA vérifie `revision` et `projectRevision` de son côté (`index.ts:160`).
- **Mémoire du projet** (`/api/projects/:id/memory`) et vocabulaire du client : SYNA écrit par `remember()` ; l'écran manuel de mémoire n'est visible que dans le Pilote des anciens projets.
- **Règles produit** : coordonnées saisies à la création jamais redemandées ni effacées ; aucune personne générée sans accord (accord « personnes » des emplacements).

### (d) Nombre de lignes par groupe

| Groupe | Lignes |
|---|---|
| 1 — doublon IA couvert par SYNA (simulé, drapeau fermé) | 3 (`offer.analyse`, `research.generate`, `brand.generate`) |
| 2 — IA partiellement ou non couverte (préserver) | 15 |
| 3 — commande manuelle indispensable (conserver) | 76 |
| 4 — obsolète prouvé | 0 |
| Non comptées (SYNA lui-même, remarque, blocs intégrés hors périmètre) | 4 |

Note groupe 4 : rien de prouvé obsolète. Seuls des **imports** inutilisés ont été vus dans `home.tsx` (`useCostConfirm` ligne 10 et `PlatformCards` ligne 16 importés mais jamais appelés dans ce fichier) — ce ne sont pas des contrôles. La branche « anciens projets » du Pilote reste utilisée par les projets sans préparation (`tab-pilote.tsx:304`), donc pas obsolète.

---

## Inventaire B — Site, thèmes, sections, pages, export, publication, SEO/Blog, Catalogue, services/rendez-vous, biens, carte, réalisations, connexions

Mission #282, phase 1. Lecture seule de `main` 1c406f50 (31/10/2026). Aucun fichier du dépôt modifié, aucun serveur lancé.
Chemins des composants : `src/components/studio/` sauf mention contraire. Numéros de ligne relevés le 31/10/2026.

**Rappel SYNA (vérifié dans le code)** : `src/lib/orchestrator/conversation/studio-operations.ts`. Toute mention « simulé,
drapeau fermé » signifie : adaptateur implémenté, testé seulement avec un fournisseur simulé, et drapeau serveur
`STUDIO_CONVERSATION_*` fermé par défaut (`tool-flags.ts`). Portée réelle des adaptateurs de ce périmètre :

- `theme.exact-edit` / `theme.undo` (adaptateur `theme`, `theme-tool-contract.ts`) : **deux opérations seulement**,
  `set_setting` sur un champ **texte / textarea / richtext / image_picker** d'une section ou d'un bloc existant, et
  `use_media` (image de la bibliothèque du projet). Pas de déplacement, ajout, suppression, masquage, verrou, couleur,
  réglage global, liste déroulante, case à cocher, bloc, ni changement de direction. `theme.undo` n'annule **que les
  reçus SYNA** (pas une version quelconque). Thème importé : médias non modifiables (`writable:!cur.spec.imported`).
- `theme.compose` / `theme.original` (adaptateurs `compose`, `original`) : composition avec composants natifs et
  sources exactes ; qualité `not_measured`. Pas d'écriture de Liquid sur mesure.
- `theme.capture` (adaptateur `render`) et `theme.export` (adaptateur `export`, ZIP rangé **dans la bibliothèque**,
  plateformes shopify/woocommerce/prestashop/wix/squarespace ; pas le CSV produits, pas l'envoi Shopify).
- `copy.generate`, `copy.edit`, `seo.update` (adaptateur `content`) : documents « SEO & textes » v2
  (`src/lib/seo-v2/engine`, types `home_page … faq, metadata`), **jamais écrits dans le thème** (lien natif
  `/studio/<id>/produit?content=`). `blog.generate` (adaptateur `blog`) : article neuf seulement, sujet cité mot pour
  mot par le client (`validateBlogEvidence`), refuse un article existant (« aucune réécriture globale automatique »).
- `catalogue.read/create/update/stock` (adaptateur `catalogue`) : fiches de l'onglet Catalogue (`src/lib/products/catalog`),
  sans suppression ni archivage ; refusé pour un projet de services (`productsOnly`).
- `adapter:'none'` dans ce périmètre : `theme.select`, `theme.publish`, `blog.publish`, `catalogue.sync`,
  `services.update`, `services.booking`, `properties.update`, `menu.update`, `projects.update`, `appointments.settings`,
  `appointments.create`, `appointments.cancel`, `site.requests`, `site.host.publish`, `site.domain.connect`,
  `connections.configure`.

Légende Groupe : 1 = doublon IA couvert par SYNA ; 2 = IA partiellement / non couverte (préserver) ; 3 = commande
manuelle indispensable ; 4 = obsolète prouvé.

---

### 1. Site — onglet Boutique / Site (`tab-boutique.tsx`)

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA (oui/partiel/non + preuve) | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Site | **Discussion de retouche de la boutique** (zone « Votre demande » + Envoyer), `tab-boutique.tsx:557-571`, envoi `send()` :312-330 | `POST /api/projects/:id/theme/chat` (`src/app/api/projects/[id]/theme/chat/route.ts`) → message dans `chat_messages` (fil `shop`) + tâche worker **`shop.chat`** (`worker/handlers.ts:267-399`) : moteur local d'abord (`localFirst`), sinon IA `aiThemeChat` + passe de correction `aiRepairOps`, opérations `applyOps` (toutes les ops de `src/lib/theme/ops.ts` : couleurs, déplacement, ajout/suppression de section, `custom_section`, `set_global`…), changement de direction, retour arrière, préférences déduites `remember(...)`, nouvelle version du thème | **partiel** : `theme.exact-edit` (texte exact + image de la bibliothèque) et `theme.compose` (composition native) — simulé, drapeau fermé. **Manque** : toutes les autres ops (style, couleurs, ajout/suppression/déplacement, sections sur mesure, `set_global`), changement de direction, retour à la version précédente quelconque, moteur local gratuit, lecture d'une capture jointe, ciblage fin (texte, balise, chemin DOM) | 2 | **Chat concurrent de SYNA.** À garder tant que la parité n'est pas prouvée ; ensuite devenir « Demander à SYNA » avec la désignation passée en contexte. Ne pas retirer avant d'avoir un équivalent du moteur local | Même demande envoyée aux deux : mêmes ops appliquées, même version créée, même message honnête (`honestChatNote`), même gratuité pour les demandes simples (« ⚡ sans IA »), même refus forfait pour `custom_section` |
| Site | **Suggestions de demandes** (puces), `tab-boutique.tsx:480` (listes `SUGGESTIONS` :99 / `SUGGESTIONS_SERVICES` :112) | Local : remplit la zone de saisie (aucun appel) | non (SYNA a ses propres suggestions, pas celles-ci) | 2 | Devenir des suggestions SYNA dans le panneau contextuel « Site » | Chaque suggestion produit le même résultat dans SYNA (beaucoup demandent des ops que SYNA n'a pas : header, lots, animation) |
| Site | **Désigner un élément dans l'aperçu** (bouton viseur), `tab-boutique.tsx:534` et barre :667 ; script injecté `src/lib/theme/preview-tools.ts` ; réception `postMessage` :234-267 | Local : l'aperçu renvoie `{template, section, block, text, tag, kind, path, role, src}` ; avec l'interface SYNA active (`contextUi`) la désignation est poussée à SYNA (`setAgentFocus` `kind:'theme-section'`, :222-227) et ouvre le panneau SYNA | **partiel** : SYNA reçoit `template/section/block` (`active-context-contract.ts:9`) ; **ne reçoit pas** `text`, `tag`, `path`, `role`, `src` que `shop.chat` exploite (style d'un seul élément, image ciblée) | 3 | Garder : c'est l'outil de désignation commun. Étendre le contexte SYNA aux champs manquants | Désigner un bouton puis demander « en rouge » : SYNA doit viser le même élément (`path`) que `shop.chat` |
| Site | **Retirer la désignation** / « Toute la section », `tab-boutique.tsx:506, 520` | Local + `postMessage unpick` | sans objet (outil de contexte) | 3 | Reste, commun aux deux | — |
| Site | **Joindre une image** (bibliothèque / import), `tab-boutique.tsx:511-514, 535-555` | `MediaPicker` (local) ; import `POST /api/projects/:id/files` (`role=reference`) | partiel : `theme.exact-edit` `use_media` prend un média de la bibliothèque ; SYNA ne lit pas une capture d'exemple comme inspiration | 3 | Reste (pièce jointe) ; à brancher sur les pièces jointes SYNA | Image désignée + jointe → même remplacement (`use_media` même clé `*_asset`) |
| Site | **Langue des textes écrits** (`ContentLangPicker`), `tab-boutique.tsx:573` | Local : `lang` envoyé avec `theme/chat` | non trouvé côté SYNA (à vérifier) | 3 | Reste, à transmettre au contexte SYNA | Texte écrit dans la langue du thème, pas celle de l'interface |
| Site | **Mention « IA non connectée : commandes simples uniquement »**, `tab-boutique.tsx:574` | Information ; côté worker `localMediaReplace` / `localThemeCommand` sans IA (`handlers.ts:327-338`) | non : SYNA exige l'IA ; aucune voie gratuite sans IA | 2 | Garder la voie locale gratuite (voir moteur local plus bas) | Sans IA : « mets le bouton en rouge » doit marcher sans crédit |
| Site | **Structure** : liste des sections, glisser pour réordonner, `tab-boutique.tsx:604` | `POST /api/projects/:id/theme/ops` op `move_section` | non (`theme.edit` n'a pas `move_section`) | 3 | Reste (manuel, volet Structure) ; dans le contexte SYNA | — |
| Site | **Œil afficher/masquer une section**, `tab-boutique.tsx:619` | `theme/ops` op `toggle_section` | non | 3 | Reste | — |
| Site | **Menu « … » d'une section** : Modifier les réglages, Disposition, Valider et verrouiller, Dupliquer, Remplacer, Monter/Descendre, Supprimer, `tab-boutique.tsx:620-640` | `theme/ops` ops `move_section`, `lock`, `duplicate_section`, `remove_section` ; « Remplacer » ouvre la bibliothèque ; « Réglages » ouvre `SectionSettingsPanel` | non (aucune de ces ops dans `ThemeChangeSchema`) ; verrou volontairement hors SYNA (« aucun déverrouillage ») | 3 | Reste, rangé dans le menu de la section | — |
| Site | **« + » entre deux sections / « Ajouter une section » en bas / bouton « Section »**, `tab-boutique.tsx:648, 656, 676` | Ouvre `SectionLibrary` puis `POST /api/projects/:id/theme/sections` (`addSection` :401-416), sans IA | partiel : `theme.compose` peut composer des pages avec composants natifs, pas « ajouter cette section ici » | 3 | Reste (manuel) | — |
| Site | **Aperçu : choix de page, appareil (ordinateur/tablette/téléphone), plein écran, ouvrir dans un onglet**, `tab-boutique.tsx:698-727` | Local (iframe `/preview/:id/v/:version…`) | sans objet ; `theme.capture` capture le rendu réel mais ne remplace pas l'aperçu | 3 | Reste | — |
| Site | **Pages** (bouton), `tab-boutique.tsx:702` | Ouvre `PagesManager` | voir section 2 | 3 | Reste | — |
| Site | **Versions** (historique) : Voir / Restaurer, `tab-boutique.tsx:715, 774-791` ; bandeau « Restaurer cette version » :733 | `POST /api/projects/:id/theme/restore` `{versionId}` (nouvelle version) | partiel : `theme.undo` annule seulement une retouche faite par SYNA, avec son reçu ; pas une version quelconque | 3 | Reste (historique natif), cité par SYNA | Restaurer v3 depuis v7 : SYNA ne sait pas ; garder le bouton |
| Site | **Disposition** (en-tête / pied de page), `tab-boutique.tsx:672` + `layout-panel.tsx:41, 55` | `theme/ops` `set_setting` sur réglages de choix / booléens | non (`theme.edit` limité aux champs texte/image) | 3 | Reste | — |
| Site | **Animations** (activer, intensité, parallaxe, rejouer), `tab-boutique.tsx:668, 1045-1069` | `theme/ops` op `set_global` (`motion_*`) ; « Rejouer » = `postMessage replay` | non | 3 | Reste | — |
| Site | **Thèmes** (ouvre la galerie), `tab-boutique.tsx:677` ; écran vide « Choisir le thème » :430 | Ouvre `ThemeGallery` (section 2) | non : `theme.select` `adapter:'none'` | 3 | Reste | — |
| Site | **Thème entièrement sur mesure** (`CustomThemeButton`), `tab-boutique.tsx:678`, `custom-theme.tsx:37-141` | `POST /api/projects/:id/theme/custom` → tâche worker **`theme.custom`** (IA payante, forfait Dominer, limite mensuelle) ; pause/reprise `POST /api/jobs/:id` | non : aucune opération SYNA (`theme.original` compose avec composants natifs, n'écrit pas un thème sur mesure) | 2 | Reste dans « Outils du site » ; plus tard une suggestion SYNA qui ouvre ce même écran | Devis, droit forfait (`status.allowed`, `blocked: plan / limit`), pause/reprise identiques |
| Site | **Importer mon thème Shopify** + **analyse du thème importé**, `tab-boutique.tsx:679-680, 430` ; `theme-import.tsx:24` | `POST /api/projects/:id/theme/import` (formulaire ZIP), rapport `ImportReport` | non | 3 | Reste | — |
| Site | **Bandeau photos libres de droits** : « Voir et remplacer » / « Remplacer », `tab-boutique.tsx:842-857` (`StockStrip`) | `POST /api/projects/:id/theme/replace-photo` `{file, assetId}` (remplace partout, nouvelle version) | partiel : `use_media` remplace une image section par section, pas « partout sur le site » ; pas d'alerte Pixabay | 3 | Reste (obligation `stock-notice`, CLAUDE.md) | Une photo Pixabay présente sur 3 sections : SYNA doit faire les 3 et garder l'avertissement |
| Site | **Panneau V2 : langage visuel « Recomposer / Appliquer »**, `tab-boutique.tsx:591, 907` (`V2Panel`) | `POST /api/projects/:id/theme/build` `{engine:"v2", language}` → tâche `shop.build` (gratuit, sans IA) | partiel : `theme.compose` compose, mais ne change pas de « langage visuel » V2 | 3 | Reste | — |
| Site | **Panneau d'adaptation au client** (`ThemeAdaptationPanel`, fichier hors liste) : « Reprise locale », ouvrir une section, `tab-boutique.tsx:592` | `POST /api/projects/:id/theme/build` `{direction, useAi:false}` | non | 3 | Reste (à inventorier avec `theme-adaptation.tsx`) | — |
| Site | **Guide après choix du thème** (`ThemeChosenGuide`), `tab-boutique.tsx:593, 873` | Local (liste des sections masquées) | sans objet | 3 | Reste ; peut devenir un message SYNA | — |
| Site | **Plateforme du projet** (`PlatformPill`), `tab-boutique.tsx:716` | `platform-picker.tsx` (hors liste ; à vérifier) | non | 3 | Reste | — |
| Export | **Exporter et installer** (modale `ExportModal`), `tab-boutique.tsx:722, 944-1030` : « Vérifier et télécharger le thème », CSV produits, autres plateformes | `GET /api/projects/:id/theme/export?platform=…&version=…` (téléchargement direct via `ExportDownload`, `export-platform.tsx:54-90`) ; état `GET …/theme/export/status` (`export-platform.tsx:96`) | partiel : `theme.export` crée le ZIP **dans la bibliothèque** (simulé, drapeau fermé) ; **manque** : CSV produits (`shopify-csv`, `woocommerce-csv`), téléchargement direct, état des exports | 3 | Reste (manuel) ; SYNA peut proposer d'ouvrir cette modale | Même ZIP (empreinte `fingerprint` identique), même version |
| Export | **Installation directe dans Shopify** : « Envoyer : Produits / Pages / Thème », `tab-boutique.tsx:993` | `POST /api/projects/:id/shopify` `{parts}` → tâche `shopify.push` | non : `theme.publish` et `catalogue.sync` `adapter:'none'`, sensibles | 3 | Reste (action sensible, hors SYNA par choix) | — |
| Publication | **Publier votre site** (globe, sites de services), `tab-boutique.tsx:721` | Ouvre `SitePublication` (section 4) | non | 3 | Reste | — |

### 2. Thèmes, galerie, pages, sections

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Thèmes | **Galerie « Thèmes »** : « Choisir ce thème », `theme-gallery.tsx:80, 122-140` | `POST /api/projects/:id/theme/build` `{direction}` → tâche `shop.direction` (garde double-clic `picking`) | non : `theme.select` `adapter:'none'` | 3 | Reste | — |
| Thèmes | **Catégorie du projet** (corriger / déduire à nouveau), `theme-gallery.tsx:108-118` | `POST /api/projects/:id/theme/store-kind` `{storeKind}` | non | 3 | Reste | — |
| Thèmes | **Démo intégrale avant le choix** (`ThemeDemoViewer`), `theme-demo-viewer.tsx:22-81` : pages, appareil, « Choisir ce thème » | `GET /api/theme-demos/:theme/:page` (lecture) ; « Choisir » = même `theme/build` ; état `GET /api/theme-demos` (`theme-gallery.tsx:102`) | non | 3 | Reste (règle « démos intégrales », CLAUDE.md) | — |
| Thèmes | **Vignettes des thèmes** (`DirectionThumb`), `direction-thumb.tsx:25` (utilisé aussi par `tab-marque.tsx`) | `GET /api/projects/:id/theme/direction-thumb?d=…` | sans objet | 3 | Reste | — |
| Thèmes | **Page publique `/studio/themes`** (`src/app/studio/themes/page.tsx`), liée depuis `home.tsx:463` | `ThemeGrid` en lecture (`directionCards`, seulement les thèmes actifs) | sans objet | 3 | Reste ; **texte périmé à corriger** : titre « Les 30 thèmes » et « 10 avec Créer, 20 avec Développer, les 30 avec Dominer » (`page.tsx:32-37`) alors que `directionCards` ne liste que `ACTIVE_DIRECTIONS` (catalogue #190) | Constat hors SYNA, à signaler au domaine 1 |
| Pages | **Gestionnaire de pages** (`PagesManager`), `pages-manager.tsx` : Ouvrir, Réglages (titre, adresse, **SEO titre/description**, statut), Dupliquer, Changer de modèle, Supprimer (avec dépendances), Menu (afficher, réordonner), Activité, Calendrier de réservation, Ajouter une page (modèles + aperçu), Mises en page de fiche produit | Tout passe par `POST /api/projects/:id/theme/pages` (`act()` :49-67) avec `version` : actions `update_page`, `duplicate_page`, `change_model`, `remove_page` (+`confirm`), `set_nav`, `reorder_nav`, `set_activity`, `set_booking`, `add_page`, `add_product_layout`, `assign…` ; aperçu `/preview/:id/v/model-…` | non pour la structure ; **partiel pour le SEO** : `seo.update` rédige un document « metadata » v2, mais n'écrit pas le `seo` de la page du thème (à vérifier : reprise par `theme/composition/copy-sources.ts`) | 3 | Reste (manuel) ; SYNA peut proposer d'ouvrir la bonne page | Titre SEO de « À propos » : même valeur dans l'export après passage par SYNA |
| Sections | **Bibliothèque de sections** (`SectionLibrary`) : liste par famille, aperçu, dispositions, « Ajouter cette section », « Déjà présente · ouvrir ses réglages », `section-library.tsx:117-237` | Aperçu `GET /api/projects/:id/theme/section-preview` (:189) ; ajout via `onPick` → `POST …/theme/sections` | partiel : `theme.compose` (composition native), pas « ajoute cette section à cet endroit » | 3 | Reste | — |
| Sections | **« Générer la section avec l'IA »** (texte libre, forfait Dominer), `section-library.tsx:127, 275-285` ; `generateSection` `tab-boutique.tsx:352-366` avec `cost.confirm("theme")` | `POST /api/projects/:id/theme/chat` `{generate:{template,index}}` → `assertSectionGeneration` (forfait) + `shop.chat` qui écrit une `custom_section` (Liquid) | non : aucune opération SYNA n'écrit de section sur mesure (`theme.compose` = composants natifs seulement) | 2 | Reste (bouton IA spécialisé) ; plus tard suggestion SYNA qui garde le même devis | Même devis `cost-confirm`, même refus hors Dominer (`generateLocked`), section valide au Theme Check |
| Sections | **Réglages d'une section** (`SectionSettingsPanel`) : champs texte, liens, couleurs, choix, cases, médias, blocs (ajouter, monter, descendre, supprimer), afficher/masquer, dispositions, `section-settings.tsx:42-235` | Lecture `GET /api/projects/:id/theme/section?template&section` ; écriture `POST …/theme/ops` (`set_setting`, `use_media`, `move_block`, `remove_block`, `add_block`, `toggle_section`) ; dispositions `POST …/theme/disposition` (:75) | **partiel** : `theme.exact-edit` couvre seulement les champs texte/textarea/richtext et image de la bibliothèque (simulé, drapeau fermé) ; pas couleurs, choix, cases, blocs, dispositions | 3 | Reste (formulaire manuel, « mêmes opérations que l'IA ») ; la cible désignée alimente SYNA | Texte modifié via SYNA = même valeur dans `section.settings`, même version, annulable |
| Sections | **Panneau Disposition** (`LayoutPanel`), `layout-panel.tsx:41, 55` | Via `applyLayout` → `theme/ops` `set_setting` | non | 3 | Reste | — |

### 3. SEO & textes, Blog

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| SEO/Textes | **« Rédiger »** (avec IA) dans `ContentPanel` : type de contenu, page, demande particulière, `content-panel.tsx:112-127, 172` (panneau utilisé par `tab-produit`, `tab-blog`, `tab-preparation`, `tab-activite`) | `POST /api/projects/:id/content/v2` `{type, pageKey, lang, request}` → tâche du moteur SEO v2 ; suivi `GET /api/jobs/:id` | **oui pour les pages** : `copy.generate` (types home/product/category/service/brand/local/faq) et `seo.update` (metadata), même moteur `runContentEngineV2` — simulé, drapeau fermé. Pas de devis `cost-confirm` côté écran natif (plafond serveur `DEFAULT_SEO_CAP_EUR`, à vérifier) | 1 | Après parité : devient une suggestion SYNA « Rédiger la page … » dans le panneau contextuel ; garder le mode sans IA (ligne suivante) | Même document (même `docKey`, même verdict, mêmes « À compléter »), même coût en % du budget, langue fr/en/es |
| SEO/Textes | **« Rédiger (sans IA, gratuit) »**, `content-panel.tsx:172` (quand `data.ai` est faux) | Même route `content/v2`, moteur local | non : l'adaptateur SYNA exige l'IA (`assertAiAllowed`, `textProviderReady`) | 3 | Reste (voie gratuite) | Sans IA : un brouillon est toujours produit |
| SEO/Textes | **Éditeur du document** : blocs (titre, paragraphe, liste, FAQ, bouton), « Ajouter un paragraphe », Enregistrer, Aperçu, `content-panel.tsx:326, 375-376, 440-458` | `PUT /api/projects/:id/content/v2/:docKey` `{doc, expectedVersion}` | non (édition manuelle) | 3 | Reste | — |
| SEO/Textes | **« Demander une retouche »** (blocs ciblés), `content-panel.tsx:343, 461-468` | `POST …/content/v2/:docKey` `{action:"edit", request, selected}` ; gratuit sans IA pour les retouches simples, IA sinon | **partiel** : `copy.edit` retouche les blocs choisis (`edit_quote` avec `blockIds`) — simulé, drapeau fermé ; **manque** la voie locale gratuite (« Raccourcis ce paragraphe », « Ajoute une FAQ ») | 2 | **Chat concurrent de SYNA** (petit). Après parité : suggestion SYNA sur le document ouvert ; garder la voie locale | Même blocs modifiés, mêmes blocs non touchés, même version, retouche simple toujours gratuite |
| SEO/Textes | **Versions du document : Restaurer**, `content-panel.tsx:357, 490` | `POST …/content/v2/:docKey` `{action:"restore", version}` | non | 3 | Reste | — |
| SEO/Textes | **Export HTML / Markdown / JSON**, `content-panel.tsx:377-379` | `GET …/content/v2/:docKey?export=html`, `md` ou `json` | non | 3 | Reste | — |
| SEO/Textes | **« Stratégie SEO »** (afficher, choisir un sujet), `content-panel.tsx:142` | Local (données déjà chargées par `GET …/content/v2?lang=`) | non | 3 | Reste ; contexte utile pour SYNA | — |
| Blog | **« Écrire un article »** (modale : sujet proposé, sujet libre, consigne, « Laisser l'IA choisir »), `tab-blog.tsx:166, 265-352` avec `confirm("blog")` | `POST /api/projects/:id/blog` `{topic, brief, keyword, intent}` → tâche `content.v2` type `blog_article` | **partiel** : `blog.generate` (simulé, drapeau fermé) exige un sujet **cité mot pour mot** par le client ; **manque** « Laisser l'IA choisir », la reprise du mot-clé et de l'intention d'un sujet proposé | 2 | Garder la modale ; SYNA peut la préremplir | Même article (`blogIdFor`), même quota mensuel (`assertBlogWrite`), même devis « blog », même refus quand le quota est épuisé |
| Blog | **« Autres idées »** (sujets proposés), `tab-blog.tsx:280, 322` | `GET /api/projects/:id/blog/topics[?refresh=1]` → `suggestTopics` (IA si connectée, sinon sujets locaux ; ne consomme pas d'article) | non | 2 | Reste ; à proposer comme suggestion SYNA | Mêmes sujets, même limite d'un appel IA toutes les 30 s |
| Blog | **Réécrire l'article** (consigne), `tab-blog.tsx:459-470` avec `confirm("blog")` | `POST /api/projects/:id/blog/:aid/rewrite` → tâche `content.v2` (`force:true`) | non : `blog.generate` refuse un article existant (`blog-tool-support.ts`, « aucune réécriture globale automatique ») ; `copy.edit` sur un document blog : à vérifier | 2 | Reste | Même devis, même quota, ancienne version gardée |
| Blog | **Éditeur d'article** : titre, adresse, extrait, méta, tags, corps, liens, couverture, Enregistrer, « Marquer comme prêt », `tab-blog.tsx:401-591` | `PATCH /api/projects/:id/blog/:aid` | non | 3 | Reste | — |
| Blog | **Publier sur Shopify / Envoyer en brouillon / Retirer du blog**, `tab-blog.tsx:433, 599-603` | `POST /api/projects/:id/blog/:aid/publish` `{publish, unpublish}` | non : `blog.publish` `adapter:'none'`, sensible | 3 | Reste (sensible, hors SYNA par choix) | — |
| Blog | **Copier HTML / Fichier HTML / WordPress (WXR)**, `tab-blog.tsx:613-615` | `GET /api/projects/:id/blog/:aid/export?format=html` ou `wxr` ; copie locale | non | 3 | Reste | — |
| Blog | **Supprimer / Corbeille / Restaurer**, `tab-blog.tsx:205, 477, 626` | `DELETE /api/projects/:id/blog/:aid` ; `PATCH …` `{restore:true}` ; liste `GET …/blog?trash=1` | non | 3 | Reste | — |
| Blog | **Blog V2 : stratégie, sujets et brouillons** (2e `ContentPanel` `blog_article`), `tab-blog.tsx:215, 257` | Même `POST …/content/v2` `{type:"blog_article"}` | partiel : `blog.generate` (sujet exact obligatoire) | 2 | **Doublon interne** avec « Écrire un article » (deux entrées pour la même tâche `content.v2`) : à fusionner avant de raccorder SYNA | Un seul article créé pour un même sujet, même quota |

### 4. Publication, hébergement, domaine, demandes reçues (`site-publication.tsx`)

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Publication | **Adresse du site** (« Changer l'adresse »), `site-publication.tsx:109-113` | `POST /api/projects/:id/site-publication` `{action:"address", slug}` | non | 3 | Reste | — |
| Publication | **Vérifier avant de publier / Publier la version actuelle / Retirer le site**, `site-publication.tsx:117-119` | même route, actions `check`, `publish`, `unpublish` | non : `site.host.publish` `adapter:'none'`, sensible | 3 | Reste (sensible) | — |
| Publication | **Pages légales : « Rédiger » + Enregistrer** (texte saisi à la main), `site-publication.tsx:134-144` | action `policy` `{handle, title, text}` (pas d'IA) | non | 3 | Reste | — |
| Publication | **Historique des publications : remettre en ligne**, `site-publication.tsx:159` | action `restore` `{publicationId}` | non | 3 | Reste | — |
| Publication | **Vérifier le site en ligne**, `site-publication.tsx:171` | action `diagnose` | non | 3 | Reste | — |
| Demandes | **Adresses qui reçoivent les demandes** : ajouter, renvoyer le lien, retirer, `site-publication.tsx:189-199` | actions `recipient-add`, `recipient-resend`, `recipient-remove` (e-mails réels) | non | 3 | Reste | — |
| Demandes | **Demandes reçues** (devis, contact) : lire, marquer traitée, renvoyer l'e-mail, effacer, `site-publication.tsx:208-226` ; ouverture directe `?demande=` (`tab-boutique.tsx:198-200`) | actions `request-read`, `request-handled`, `request-retry`, `request-delete` | non : `site.requests` `adapter:'none'`, sensible | 3 | Reste | — |
| Domaine | **Domaines personnalisés** : ajouter, vérifier, réactiver/désactiver, retirer, `site-publication.tsx:242-272` | actions `domain-add`, `domain-verify`, `domain-enable`, `domain-remove` | non : `site.domain.connect` `adapter:'none'`, sensible | 3 | Reste | — |

### 5. Catalogue

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Catalogue | **Ajouter un produit / Modifier** (photos, prix, options, variantes, stock, SEO), `tab-catalogue.tsx:63, 79, 190-260` | `POST /api/projects/:id/products` ; `PATCH …/products` `{id, version, product}` | **oui** (manuel doublé) : `catalogue.create`, `catalogue.update`, `catalogue.stock` — simulé, drapeau fermé ; refusé pour un projet de services | 3 | Reste (saisie manuelle indispensable) ; SYNA en complément | Même fiche, même version, mêmes variantes ; aucune suppression via SYNA |
| Catalogue | **« Désigner pour SYNA »**, `tab-catalogue.tsx:77` (si `agentUi` et `conversationCatalogue`) | Local : `setFocus({kind:'catalogue-product', productId, version})` + ouverture du panneau SYNA | intégration SYNA existante | 3 | Reste (modèle à généraliser aux autres onglets) | — |
| Catalogue | **Monter / Descendre / Archiver**, `tab-catalogue.tsx:80-82` | `PATCH …/products` `{id, move}` / `{id, archive:true}` | non (SYNA ne supprime ni n'archive, par contrat) | 3 | Reste | — |
| Catalogue | **Voir la fiche** (aperçu), `tab-catalogue.tsx:78` | lien `/preview/:id/v/current/products/:handle` | sans objet | 3 | Reste | — |
| Catalogue | **Connecter une boutique** (WooCommerce, PrestaShop, Shopify), `tab-catalogue.tsx:107, 160-173` | `POST /api/projects/:id/products/stores` | non : `connections.configure` `adapter:'none'`, sensible | 3 | Reste | — |
| Catalogue | **Envoyer les produits / Importer ses produits / Dernier rapport / Déconnecter**, `tab-catalogue.tsx:115-118` | `POST /api/projects/:id/products/sync` `{store, action:"push"}` ou `"import"` ; `DELETE …/products/stores?id=` | non : `catalogue.sync` `adapter:'none'`, sensible | 3 | Reste | — |
| Catalogue (ancien) | **`CatalogPanel` dans l'onglet Produit** : type de boutique (mono, multi, niche), ajouter un produit avec photo, modifier, « Mettre à jour la boutique », `catalog-panel.tsx:32-152` | `GET/PATCH /api/projects/:id/catalog` ; `POST …/catalog` (formulaire photo, `saveAsset role=catalog-original`) ; « Mettre à jour » = `PATCH {rebuild:true}` → tâche `shop.build` `useAi:false` | non : les adaptateurs SYNA travaillent sur `src/lib/products/catalog` (onglet Catalogue), pas sur `p.catalog` (ancien catalogue du projet) | 3 | Reste ; **deux catalogues coexistent** (Produit et Catalogue) : à clarifier avant d'en raccorder un seul à SYNA | SYNA modifie-t-il le bon catalogue pour la boutique rendue ? À tester |

### 6. Services, rendez-vous, biens, carte, réalisations

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Services | **`ServicesEditor` / `ContactModePicker`** (prestations, modes de contact), `services-editor.tsx:8-56` ; utilisés par `home.tsx`, `tab-activite.tsx`, `tab-preparation.tsx` | Composant contrôlé, sans appel propre ; l'enregistrement se fait dans l'écran parent (hors périmètre, à vérifier) | non : `services.update` `adapter:'none'` | 3 | Reste | — |
| Rendez-vous | **Prestations, horaires, fermetures, intervenants** (`PrestationsEditor`), `prestations-editor.tsx:25-134` ; ouverture `tab-rendez-vous.tsx:86, 166-172` | `GET/PUT /api/projects/:id/prestations` | non : `services.booking` `adapter:'none'` | 3 | Reste | — |
| Rendez-vous | **Réglages avancés de la section** (adresse, délais, textes), `tab-rendez-vous.tsx:167-170` | `SectionSettingsPanel` → `theme/ops` | partiel : `theme.exact-edit` pour les seuls champs texte | 3 | Reste | — |
| Rendez-vous | **Activer les réservations réelles / Revenir en démonstration**, `tab-rendez-vous.tsx:82-84` | `POST /api/projects/:id/rendez-vous` `{action:"live", live}` | non : `appointments.settings` `adapter:'none'` | 3 | Reste (bascule sensible vers le réel) | — |
| Rendez-vous | **Ajouter une réservation / Déplacer / Annuler**, `tab-rendez-vous.tsx:87, 152-153, 176-216` | même route, actions `create`, `move`, `cancel` | non : `appointments.create` et `appointments.cancel` `adapter:'none'`, sensibles | 3 | Reste | — |
| Rendez-vous (studio) | **Page `/studio/rendez-vous`** (`src/app/studio/rendez-vous/page.tsx` → `calls.tsx`) : accompagnement téléphonique avec l'équipe (réserver, payer, reporter, annuler) | `GET/POST /api/calls`, `POST /api/calls/:id` `{action:"reschedule"}` ou `"cancel"`, paiement Stripe | non (aucune opération ; ce n'est pas la prise de rendez-vous du client final) | 3 | Reste ; nom identique à l'onglet « Rendez-vous » du projet : risque de confusion à signaler | — |
| Biens | **Biens immobiliers** : ajouter (brouillon), modifier (fiche, photos, plan, quartier), publier, retirer, vendu/loué, remettre, archiver, voir les archives, ordre, `tab-biens.tsx:51-277` | `GET/POST /api/projects/:id/biens`, `PATCH …/biens/:id` (`status`, `data`), `POST …/biens/ordre` ; fraîcheur du site `GET …/site-publication` | non : `properties.update` `adapter:'none'` | 3 | Reste | — |
| Carte | **Carte du restaurant** : catégories (ajouter, renommer, ordre, supprimer), plats (créer, modifier, photo, publier, indisponible, retirer, archiver, ordre), `tab-carte.tsx:28-129` | `GET/POST /api/projects/:id/carte` (actions `category-*`, `item-create`, `item-update`, `item-status`, `item-order`) | non : `menu.update` `adapter:'none'` | 3 | Reste | — |
| Réalisations | **Réalisations** : ajouter, modifier (photos, avant/après), publier, retirer, archiver, ordre, `tab-realisations.tsx:28-126` | `GET/POST /api/projects/:id/realisations` (actions `create`, `status`, …) | non : `projects.update` `adapter:'none'` | 3 | Reste | — |

### 7. Connexions

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Connexions | **Connecter / Ajouter un compte / Reconnecter** (OAuth officiel ; boutique Shopify par son adresse), `tab-connexions.tsx:50, 123-137` | redirection `GET /api/oauth/:provider/start?project=…` | non : `connections.configure` `adapter:'none'`, sensible | 3 | Reste (hors SYNA par choix) | — |
| Connexions | **« Utiliser pour cette boutique », tableau Pinterest, confidentialité YouTube**, `tab-connexions.tsx:103-115` | `PATCH /api/connections/:cid` `{projectId, linked}` / `{boardId}` / `{privacy}` | non | 3 | Reste | — |
| Connexions | **Déconnecter**, `tab-connexions.tsx:43-48` | `DELETE /api/connections/:cid` (les publications programmées repassent « à valider ») | non | 3 | Reste | — |

### 8. Fichiers du périmètre qui relèvent d'un autre domaine

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Images / Publicités | **Correction des textes d'un visuel** (`CopyCorrection`, `CopyFailureHistory`) : « Enregistrer gratuitement », reprise avec devis, `copy-correction.tsx:9-44` ; utilisé par `social-studio.tsx` et `tab-images.tsx`, **pas par le Site** | `GET/POST /api/projects/:id/images/copy-review` `{action, edits, approvedEstimateMicro}` ; devis `POST …/campaigns/v2` `{action:"ai_quote"}` ; suivi `GET …/jobs?type=image.ai_post` | partiel probable : `images.correct` (adaptateur `images`) — à confirmer par l'inventaire Images | 2 | À inventorier avec le domaine Images | Même texte corrigé, même devis approuvé |
| Publicités | **Bibliothèque de modèles** (`StyleGallery`) : mise en page, couleurs, traitement, `style-gallery.tsx:36-93` ; utilisé par `asset-viewer.tsx` et `ad-editor/ad-creatives.tsx` | `POST /api/projects/:id/ads/docs/:docKey` `{action:"restyle", …}` | non trouvé dans le catalogue SYNA (à vérifier par l'inventaire Publicités) | 3 | À inventorier avec le domaine Publicités | — |
| Marque | **Cartes de direction de logo** (`DirectionCards`) : « Choisir », planche complète, `direction-cards.tsx:7-35` ; utilisé par `logo-v2-panel.tsx` | `onChoose(logoId)` (appel réel dans le parent, hors périmètre) ; lecture `/api/files/:id` | partiel probable : `logo.replace` (adaptateur `logo-review`) — à confirmer par l'inventaire Marque | 3 | À inventorier avec le domaine Marque | — |
| (aucun) | **`PalettePicker`**, `palette-picker.tsx:18-66` | Aucun : composant jamais importé | non | 4 | Retirer après accord. **Preuve** : `git grep "palette-picker\|PalettePicker"` hors du fichier lui-même = aucun import dans `src/`, `tests/`, `scripts/` ; aucune route associée | Aucun écran ne l'affiche ; vérifier `npx tsc --noEmit` après retrait |

---

### Le sélecteur d'élément, la discussion `shop.chat` et le moteur local (point d'attention demandé)

1. **`preview-bridge.tsx` n'est pas le sélecteur.** C'est un relais réseau monté une seule fois dans
   `src/app/studio/layout.tsx:15` : il exécute pour l'aperçu cloisonné (origine `null`) ses requêtes panier/formulaires
   (`ecs-preview-request`) et ses navigations (`ecs-preview-navigate`), filtrées par `previewBridgeTarget`. Aucun lien
   avec l'IA ni avec SYNA. **Groupe 3** (infrastructure de l'aperçu, à garder).
2. **Le sélecteur** est le script injecté par `src/lib/theme/preview-tools.ts` (seulement dans l'aperçu, jamais à
   l'export) : survol, clic, message `selected` avec `template, section, block, text, tag, kind, path, role, src`. Le
   studio le reçoit dans `tab-boutique.tsx:234-267`.
   - Interface classique : la désignation part dans la discussion `shop.chat`.
   - Interface SYNA active (`contextUi` = `useAgentUi()` + `conversationContext`) : la désignation part vers SYNA
     (`setAgentFocus`, cible `theme-section` ou `theme-page`) et ouvre le panneau SYNA. **Mais** la cible SYNA ne garde
     que `template/section/block` : le texte, la balise, le chemin DOM, le rôle et l'image désignés sont perdus.
3. **`shop.chat` est bien un chat concurrent de SYNA**, et le plus puissant du périmètre. Même avec l'interface SYNA
   active, l'onglet « Discussion » reste dans la barre (`tab-boutique.tsx:762-766`) et la section Chat existe toujours
   (`:769`). Il écrit dans son propre fil (`chat_messages`, `thread='shop'`) séparé de la conversation SYNA, et crée
   des versions du thème hors des reçus SYNA (donc `theme.undo` de SYNA ne peut pas les annuler, et réciproquement le
   bouton « Reviens à la version précédente » du chat peut défaire une retouche SYNA sans reçu — à vérifier).
4. **Couverture SYNA de `shop.chat`** :
   - `theme.exact-edit` : remplace un texte exact ou une image de la bibliothèque sur un champ existant → couvre « texte
     entre guillemets sur l'élément désigné » et « remplace cette image par celle-ci ».
   - `theme.compose` / `theme.original` : composition native de pages → couvre une partie des demandes « refais la
     page / compose l'accueil », pas « refais cette section dans un style plus élégant ».
   - `theme.undo` : seulement les retouches SYNA.
   - `copy.generate`, `copy.edit`, `seo.update`, `blog.generate` : écrivent des **documents SEO v2**, pas le thème ;
     ils ne couvrent aucune demande de `shop.chat`.
   - `catalogue.*` : fiches produits, pas le thème (sauf rendu des produits).
   - **Non couvert** : couleurs et style d'un élément, réglages globaux, ajout/suppression/déplacement/masquage de
     section, sections sur mesure (`custom_section`), lots/livraison/prix dans le bouton (ops métier du thème),
     changement de direction, retour à une version, lecture d'une capture d'inspiration, mémoire des préférences
     déduites (`remember(... status:'inferred')`), passe d'auto-correction `aiRepairOps`.
5. **Moteur local sans IA** (`src/lib/engine/local-first.ts`, appelé seulement par `worker/handlers.ts:290`) : quand l'IA
   est active, une demande courte à une seule action (couleur, texte entre guillemets, image remplacée, masquer /
   déplacer / supprimer une section désignée, section nue, taille des boutons, retour arrière, commandes V2) est faite
   sans IA et sans crédit, après un essai à blanc de `applyOps`. Sans IA, `localMediaReplace` puis `localThemeCommand`
   prennent tout. **SYNA n'utilise pas ce moteur** (aucune référence dans `src/lib/orchestrator`). C'est une règle du
   produit (« Moteur local d'abord », CLAUDE.md) : retirer `shop.chat` sans le rebrancher dans SYNA casserait la
   gratuité des retouches simples.

---

### (a) Chats et zones de saisie IA concurrentes de SYNA dans ce périmètre

1. **Discussion de retouche de la boutique** (`tab-boutique.tsx:557-571`, `POST …/theme/chat`, tâche `shop.chat`,
   fil `chat_messages.thread='shop'`) — concurrent principal, reste visible même avec l'interface SYNA.
2. **« Générer la section avec l'IA »** (`section-library.tsx:275-285`) — passe aussi par `shop.chat`.
3. **« Demander une retouche »** d'un document SEO/texte (`content-panel.tsx:461-468`, `POST …/content/v2/:docKey`
   `action:"edit"`).
4. **« Demande particulière »** + « Rédiger » (`content-panel.tsx:166-172`).
5. **Modale « Écrire un article »** (sujet libre + consigne, `tab-blog.tsx:265-352`) et **consigne de réécriture**
   (`tab-blog.tsx:459-470`).
6. **Thème entièrement sur mesure** (`custom-theme.tsx`) — pas une zone de saisie, mais une action IA payante hors SYNA.

### (b) Capacités SYNA absentes ou partielles constatées

- Thème : toutes les ops autres que `set_setting` texte/image et `use_media` ; restauration d'une version quelconque ;
  changement de thème (`theme.select` `none`) ; sections sur mesure ; thème sur mesure ; remplacement d'une photo
  libre de droits partout ; réglages globaux et animations ; dispositions ; langage visuel V2.
- Désignation : `text/tag/path/role/src` non transmis à SYNA.
- Moteur local gratuit absent de SYNA (thème et textes) ; SYNA exige l'IA pour rédiger.
- Export : pas de CSV produits, pas de téléchargement direct, pas d'envoi Shopify (`theme.publish`, `catalogue.sync`
  `none`).
- Textes : SEO de page du thème non écrit (document v2 à part, à vérifier) ; pas de restauration ni d'export d'un
  document.
- Blog : sujet exact obligatoire (pas « Laisser l'IA choisir »), pas de sujets proposés, pas de réécriture d'un article
  existant, pas de publication (`blog.publish` `none`).
- Catalogue : pas d'archivage ni d'ordre ; projets de services exclus ; ancien `CatalogPanel` (`/api/…/catalog`) non
  couvert.
- Pages : aucune opération (ajout, modèle, menu, suppression, réservation de page).
- Publication / domaine / demandes reçues / rendez-vous / biens / carte / réalisations / connexions : tout en
  `adapter:'none'` (dont 9 sensibles volontairement hors SYNA).
- Rappel : même les opérations « oui » ne sont prouvées qu'avec un fournisseur simulé, drapeaux fermés par défaut.

### (c) Dépendances à ne pas casser

- **Droits forfait** : sections sur mesure (`assertSectionGeneration` exige un forfait `theme: "fully-custom"` ; le commentaire de la route dit « Vendre et Dominer », l'écran dit « Dominer »
  — incohérence à vérifier), thème sur mesure (`theme/custom`, `status.allowed`, limite mensuelle),
  modèles de pages (« Développer et Dominer », `pages-manager.tsx:71`), thèmes par forfait (`blockedFor`,
  `theme-gallery.tsx:144-149`), mode Découverte sans export ni publication (`tab-boutique.tsx:143`, filigrane), blog
  avec quota mensuel (`blogAccess`, `assertBlogWrite`), publication hébergée avec forfait actif.
- **Devis `cost-confirm`** : `cost.confirm("theme")` pour la section générée (`tab-boutique.tsx:354`),
  `confirm("blog")` pour écrire et réécrire (`tab-blog.tsx:298, 461`). **Aucun devis** avant un message `shop.chat`
  ni avant « Rédiger » / « Demander une retouche » du `ContentPanel` (plafonds côté serveur seulement, à vérifier).
  SYNA, lui, fait toujours devis + confirmation séparés : la parité devra trancher.
- **Versions / historique** : chaque retouche du thème crée une version restaurable (`saveThemeVersion`, auteur
  `ai`/`user`/`studio`) ; reçus SYNA (`agent.theme.tool.*` en mémoire) séparés de l'historique natif ; documents v2
  versionnés (`expectedVersion`) ; pages avec `version` de référence (conflit d'onglets) ; produits avec `version`.
- **Garde double-clic / idempotence** : choix de thème (`picking`, `idempotencyKey theme:…`), thème sur mesure (une
  tâche par version), SYNA (`requestId`).
- **Honnêteté** : `honestChatNote` (n'annonce comme fait que ce qui est appliqué), alerte Pixabay (`stock-notice`),
  « Démonstration — aucune réservation réelle ».
- **Mémoire du projet** : `shop.chat` enregistre des préférences déduites (`remember`, `status:'inferred'`) ; à
  conserver si SYNA reprend la retouche.
- **Langue** : `lang` du contenu (fr/en, es pour le SEO) transmis par `ContentLangPicker`.

### (d) Nombre de lignes par groupe

| Groupe | Lignes |
|---|---|
| 1 — doublon IA couvert par SYNA | 1 (« Rédiger » avec IA du `ContentPanel`) |
| 2 — IA partielle ou non couverte | 11 |
| 3 — commande manuelle indispensable | 70 |
| 4 — obsolète prouvé | 1 (`palette-picker.tsx`) |
| **Total** | **83** |

Ce qui a été vérifié : lecture du code des fichiers listés, des routes API appelées, du catalogue SYNA, des contrats
des adaptateurs `theme`, `content`, `blog`, `catalogue`, `export`, `render`, du gestionnaire `shop.chat` et du moteur
local ; recherches `git grep` pour les imports. Ce qui ne l'a pas été : aucun écran ouvert, aucun test lancé, aucun
appel réel à SYNA ; les points marqués « à vérifier » restent des hypothèses.

---

## Inventaire C — Marque, logos, Stratégie, Images, Vidéos, Fichiers, Prompts (mission #282, phase 1)

Lecture seule de `main` 1c406f50. Aucun serveur lancé, aucun appel réseau ni IA. Les routes et tâches citées ont été lues
dans le code ; ce qui n'a pas été lu jusqu'au bout est marqué « à vérifier ».

Rappel SYNA (catalogue `src/lib/orchestrator/conversation/studio-operations.ts`) : toute mention « oui » ou « partiel »
signifie **adaptateur écrit, testé seulement avec un fournisseur simulé, drapeau serveur fermé par défaut**
(`STUDIO_CONVERSATION_LOGOS`, `_LOGO_REVIEW`, `_BRAND`, `_BRAND_REVIEW`, `_RESEARCH`, `_IMAGES`, `_VIDEOS`,
`_VIDEO_GENERATION`, `_VIDEO_VOICE`, `_VIDEO_CLIP` dans `tool-flags.ts`). Rien n'est actif en production aujourd'hui.

Groupes : 1 = doublon IA couvert par SYNA (retrait seulement après parité) · 2 = IA partiellement / non couverte (préserver,
tâche Codex) · 3 = commande manuelle indispensable (conserver, intégrer au contexte) · 4 = obsolète prouvé.

### Tableau

| # | Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA (oui/partiel/non + preuve) | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|---|
| 1 | Marque | « Nouvelle proposition » → fenêtre « Orientation souhaitée (facultatif) » + langue + « Lancer » — `tab-marque.tsx:151`, `:332-351` | `POST /api/projects/[id]/brand` {guidance} → tâche `brand.build` (`buildBrand`, IA texte si configurée, `src/lib/engine/brand.ts:27`). **Aucun prix affiché avant.** | **partiel** : `brand.generate` (adaptateur `brand`, simulé, drapeau fermé) met en file une proposition **textuelle dans Préparation** (`agent.brand.propose` via `queuePreparation`, `brand-tool-execution.ts:62-68`), pas la tâche `brand.build` de l'onglet ; conservation des éléments « Validé » non prouvée côté SYNA. | 2 | Devient une suggestion SYNA dans le panneau Marque une fois les deux moteurs alignés ; ajouter le devis manquant. | Même résultat (champs remplis, éléments validés conservés, langue de contenu), devis affiché avant (absent aujourd'hui côté écran). |
| 2 | Marque | Fiche « Identité » : Nom (+ « Autres pistes »), Signature (+ « Autres signatures »), Positionnement, Cible, Voix, À faire / À éviter, Histoire + « Enregistrer » — `tab-marque.tsx:151-198` | `PATCH /api/projects/[id]/brand` {name, tagline, positioning, audience, story, tone, direction} ; peut recolorer la piste de logo (`runForUser`, route `brand/route.ts:89-95`). | **partiel** : `brand.correct` (adaptateur `brand-review`) corrige nom et signature d'une identité **candidate** avant choix ; ni l'identité active, ni positionnement/cible/ton/histoire. | 3 | Reste (formulaire de référence), rangé dans le volet Détails ; SYNA lit ces champs comme contexte. | Une correction par SYNA doit produire le même `PATCH` et la même version ; coordonnées jamais effacées. |
| 3 | Marque | Boutons « Valider / Validé » par élément (nom, signature, logo) — `tab-marque.tsx:129-134` | `PATCH /brand` {validate:[k]} / {unvalidate:[k]} | **non** | 3 | Reste ; état « verrouillé » exposé à SYNA. | SYNA ne doit jamais modifier un élément verrouillé. |
| 4 | Marque | Palette : « Revenir à vos couleurs » / « Appliquer les couleurs de la direction … » — `tab-marque.tsx:232-233` | `PATCH /brand` {paletteMode:"client" \| "direction"} (recoloration logo, site, kit, charte) | **non** | 3 | Reste dans le volet Détails. | Couleurs identiques partout après bascule, retour possible. |
| 5 | Marque | « Direction de la boutique » (liste de directions + aperçus) — `tab-marque.tsx:279-291` | État local puis `PATCH /brand` {direction} au clic « Enregistrer » | **non** (`theme.select`, adaptateur `none`) | 3 | Reste ; à rapprocher de la galerie Thèmes. | Seules les directions `ACTIVE_DIRECTIONS` proposées ; ancienne direction d'un projet conservée. |
| 6 | Marque › Logo | Panneau Logo V2 : liste « Style du logo » + « Créer les directions / Nouvelles directions / Reprendre la série incomplète » (fenêtre `window.confirm` avec devis, `window.prompt` de correction pour une reprise) — `logo-v2-panel.tsx:141-157`, `:226-233` | `POST /brand/logo-v2` {action:"quote"} puis {action:"generate", style, renew, feedback} → tâche `brand.logo.v2` (`runLogoEngineV2` : Qwen-Image dessine, relais OpenAI si contrôle insuffisant, `src/lib/logo-v2/engine.ts:254-280`). Le serveur n'exige **aucun jeton d'accord** : seul le `window.confirm` de l'écran protège la dépense. | **partiel** : `logo.generate` (adaptateur `logos`, simulé, drapeau fermé) crée la série avec devis/accord serveur et plafond. **Mais il bloque le relais OpenAI** : `beforeArtworkRequest` lève une erreur si `input.relay` (`logo-tool-execution.ts:60`) → la règle « Qwen puis relais OpenAI, toujours au moins un logo » n'est pas tenue par SYNA. Choix explicite du style non vu dans le contrat (`reuse_or_create\|renew\|repair`) — à vérifier. | 2 | Garder l'écran ; tâche Codex : autoriser le relais OpenAI dans le devis SYNA (montant de relais annoncé comme à l'écran). | Même devis (probable + relais + plafond), relais déclenché quand le contrôle juge < seuil, meilleur logo signalé s'il n'est pas validé, arrêt au plafond. |
| 7 | Marque › Logo | « Choisir cette direction complète » (cartes de série) puis « Valider cette identité complète » — `logo-v2-panel.tsx:238-242`, `direction-cards.tsx:35` | `POST /brand/logo-v2` {action:"select"} (`selectCompleteDirection`) puis {action:"choose"} → tâche `brand.logo.v2.choose` (déclinaisons, planche, charte) | **oui** : `logo.replace` (adaptateur `logo-review`, `logo-selection-execution.ts:41-60`, deux accords à 0 %, même tâche `brand.logo.v2.choose`), simulé, drapeau fermé. | 1 | Candidat à devenir une suggestion SYNA (« Valider cette identité ? ») après parité ; garder la carte tant que non validé. | Mêmes 9 fichiers (déclinaisons, planche, charte) et mêmes empreintes, identité active conservée jusqu'à validation, idempotence en double clic. |
| 8 | Marque › Logo | « Choisir ce logo » sur une proposition, sur le « Meilleur logo obtenu », sur une « Version du studio », ou « choisir quand même » un logo écarté — `logo-v2-panel.tsx:192`, `:212`, `:248-275` | `POST /brand/logo-v2` {action:"choose", assetId} → `brand.logo.v2.choose` | **partiel** : `logo.replace` passe par `assertSelectedDirection` (directions d'une série complète) ; logos hors série, provisoires du studio ou « non validés par le contrôle » non couverts — à vérifier. | 2 | Reste dans le panneau Logo. | Le client garde toujours au moins un logo choisissable, avec la mention « non validé » visible. |
| 9 | Marque › Logo | « Écarter » une direction — `logo-v2-panel.tsx:193` | `POST /brand/logo-v2` {action:"reject"} (`recordLogoRouteRejection`, mémorise le refus) | **non** | 3 | Reste ; le refus devient contexte SYNA. | Un type refusé n'est plus proposé, ni par l'écran ni par SYNA. |
| 10 | Marque › Logo | « Nouvelle version » d'un logo (prix dans un `window.prompt` + remarques) — `logo-v2-panel.tsx:158-166`, `:194`, `:213` | `POST /brand/logo-v2` {action:"quote", assetId} puis {action:"redraw", feedback} → tâche `brand.logo.v2.redraw` (1 image payée, relais possible) | **non** (contrat logos : `reuse_or_create`, `renew`, `repair` seulement) | 2 | Reste ; tâche Codex si on veut la confier à SYNA. | Une seule image payée, ancienne version conservée, pas de relance automatique. |
| 11 | Marque › Logo | « Arrêter » la série en cours — `logo-v2-panel.tsx:245`, `:367` | `POST /brand/logo-v2` {action:"stop"} → `cancelJob` des tâches logo | **non** | 3 | Reste visible pendant toute série (commande de sécurité). | Plus aucune dépense après l'arrêt, images reçues conservées. |
| 12 | Marque › Logo | « Logos complets déjà créés » → « Utiliser ce logo » — `full-logo-panel.tsx:55` (rendu `tab-marque.tsx:147`) | `POST /brand/full-logo` {action:"use"} (`useFullLogo`) ; la création est refusée (410) | **non** | 3 | Reste en lecture/compatibilité (anciens projets) dans le volet Détails. | Pas 4 : rendu dès qu'un ancien logo complet existe. |
| 13 | Marque › Logo | « Anciennes pistes de logo » : « Choisir cette piste », « Supprimer » (corbeille + `window.confirm`), agrandir la planche — `tab-marque.tsx:148`, `:372-440` | `POST /brand/logo` {proposalId} → tâche `brand.logo` (application) ; `DELETE /brand/logo?proposal=` | **non** | 3 | Reste en compatibilité, volet Détails. | Suppression = action sensible, jamais par SYNA. |
| 14 | Marque › Logo | Ancien bloc « Trois propositions » : « Choisir » et **« Recréer les propositions »** — `tab-marque.tsx:244-262` | `POST /brand/logo` {regenerate:true} → **met en file une série payante `brand.logo.v2` sans devis ni confirmation** (`brand/logo/route.ts:79-86`) ; « Choisir » → tâche `brand.logo`. | **partiel** (`logo.generate`, voir ligne 6) | 2 | Faire passer « Recréer » par le devis du panneau Logo (ou le retirer **après accord du propriétaire**). | Risque immédiat : dépense IA sans prix annoncé (contraire à la règle « devis avant dépense »). Test : aucun `brand.logo.v2` mis en file sans accord. |
| 15 | Marque | « Créer / Refaire la planche » + « Télécharger » (planche d'identité) — `tab-marque.tsx:584-621` | `POST /brand/board` (`saveIdentityBoard`, sans IA, offert) | **non** (le kit local est refait par `logo.replace`, pas isolément) | 3 | Reste. | Même planche (`BRAND_RULES`). |
| 16 | Marque | Téléchargements des déclinaisons (logo, SVG, WebP, clair, mono, symbole, favicon, planche) — `tab-marque.tsx:273-275` | Liens `GET` fichiers | **non** | 3 | Reste. | — |
| 17 | Marque | Charte : « Créer la charte / Mettre à jour » + langue + PDF + navigation des planches — `tab-marque.tsx:511-565` | `POST /brand/book` (`saveBrandBook`) | **non** | 3 | Reste. | — |
| 18 | Marque | Kit réseaux sociaux : « Créer le kit / Recréer », ZIP, téléchargements — `tab-marque.tsx:443-470` | `POST /brand/social` {voice:false} (`saveSocialKit`) | **non** | 3 | Reste. | — |
| 19 | Marque | « Refaire la ligne éditoriale » — `tab-marque.tsx:502` | `POST /brand/social` {voice:true} → `ensureSocialVoice` forcé, IA via `runForUser` ; **aucun prix affiché** | **non** | 2 | Reste ; tâche Codex : devis avant appel. | Piliers, « ce qu'on dit / ne dit pas », légendes identiques ; vocabulaire du client (`addWordingRule`) respecté. |
| 20 | Marque | Carte « Votre identité a changé » (cases, « mettre aussi à jour mes créations modifiées », bouton de mise à jour) — `workflow-panel.tsx:302-360`, rendu `tab-marque.tsx:144` | `POST /brand/impact` {keys, includeEdited, approvedPaidMicro} (gratuit sauf visuels IA, prix affiché) | **non** | 2 | Reste ; SYNA peut signaler qu'elle existe. | Nouvelle version, ancienne restaurable ; visuels IA jamais cochés d'office. |
| 21 | Marque | « Éléments de stratégie enregistrés » (messages, axes, piliers, plateforme, objections) — `tab-marque.tsx:297-331` | Lecture seule (`data.strategy`) | **non** | 3 | Rangé dans un volet Détails ; contexte SYNA. | — |
| 22 | Marque + Stratégie | Bloc « Angles marketing » complet affiché **aussi** en tête de Marque — `tab-marque.tsx:139` (`MarketingStrategy`) et `tab-strategie.tsx:4` | Mêmes appels que lignes 23-31 | voir 23-31 | 3 | Fusionner : un seul emplacement (Stratégie), lien depuis Marque. | Doublon d'écran (pas d'IA) : ne rien perdre en le retirant de Marque. |
| 23 | Stratégie | « Reprendre les informations de mon offre » — `marketing-strategy.tsx:37`, `:51` | `POST /marketing-strategy` {action:"resume_understanding"} → redirection | **non** | 3 | Reste. | — |
| 24 | Stratégie | « Reprendre les angles de la recherche acquise — sans nouvel appel » — `marketing-strategy.tsx:28`, `:51` | `POST /marketing-strategy` {action:"analyze"} → `proposeStrategies` (local) | **partiel** : `strategy.compare` compare les angles acquis, ne reconstruit pas les cartes | 3 | Reste (gratuit). | Mêmes cinq angles, aucun appel IA. |
| 25 | Stratégie | Champ « Quel défaut faut-il corriger ? » + « Voir le devis de recherche et d'analyse IA » + « Confirmer et lancer la recherche IA » / « Annuler sans appel » — `marketing-strategy.tsx:38-39`, `:52-56` | `POST /marketing-strategy` {quote_research} → `createQuote(research, generate)` ; {confirm_research, quoteId, correction} → `queuePreparation` (tâche `project.prepare`) | **oui** : `research.generate` (adaptateur `research`, `research-tool-execution.ts:35-48`, même `createQuote` + `queuePreparation`, correction comprise), simulé, drapeau fermé | 1 | Devient une suggestion SYNA « Lancer la recherche (devis) » après parité. | Même % maximal, même tâche, même limite d'essais, annulation sans appel, reprise d'un acquis sans nouvel appel. |
| 26 | Stratégie | Cartes d'angles : cases « Comparer » + tableau « La même offre, plusieurs façons d'en parler », « Justification et sources » — `marketing-angle-cards.tsx:41-64` | Local (état React) | **partiel** : `strategy.compare` / `strategy.preference` (adaptateur `choices`) comparent et retiennent un angle **dans la discussion** seulement | 3 | Reste comme vue de consultation (sources datées). | Les sources et dates doivent rester lisibles hors SYNA. |
| 27 | Stratégie | « Préparer ce choix / Vérifier ce choix », « Vérifier avant de réutiliser », « Reprendre ma préparation conservée » — `marketing-angle-cards.tsx:63`, `marketing-strategy.tsx:29`, `:60-61` | `POST /marketing-strategy` {action:"prepare", angleId} (`prepareStrategyChange` + `prepareStrategyTheme`) | **non** (`research.approve`, `proposal.choose` : adaptateur `none`) | 3 | Reste. | Consultation n'active rien, aucune place de quota prise. |
| 28 | Stratégie | « Préparer ensemble les textes SEO et le calendrier : 0 % IA » — `marketing-strategy.tsx:31`, `:67` | {action:"prepare_modules"} | **non** | 3 | Reste. | — |
| 29 | Stratégie | Revue par élément : « Vérifié : compatible, réutiliser » / « Conserver, signalé non aligné », lien « Ouvrir le contenu » — `marketing-strategy.tsx:30`, `:72-79` | {action:"review", decision, confirmed:true} | **non** | 3 | Reste. | — |
| 30 | Stratégie | « Réviser dans le devis groupé » + « Obtenir un devis pour toutes ces révisions » + « Confirmer ce devis » + « Confirmer une reprise » — `marketing-strategy.tsx:32-33`, `:73`, `:80-88` | {quote_revisions} / {confirm_revisions} / {retry_revisions} (IA payante groupée, plafond) | **non** | 2 | Reste ; tâche Codex éventuelle. | Un essai + une reprise au plus, même plafond. |
| 31 | Stratégie | Case « Conserver mes éléments protégés » + « Confirmer et activer cet angle » / « Annuler sans activer » — `marketing-strategy.tsx:34`, `:90-91` | {action:"activate", idempotencyKey, confirmed:true, retainUnaligned} (consomme une place du quota d'angles) | **non** (`strategy.preference` = discussion seulement) | 3 | Reste (décision du client). | Une seule place prise même en double clic. |
| 32 | Tous onglets sauf Stratégie | Bandeau « Angle actif … / Stratégie du site » — `strategy-status.tsx:6-18`, monté par `tabs.tsx:36` | `GET /marketing-strategy` (relu toutes les 10 s) | **non** | 3 | Intégrer au contexte SYNA (bandeau gardé). | — |
| 33 | Publications / Publicités / vidéo guidée | Liste « Angle de cette communication » — `communication-angle.tsx:9-17` | Local + `GET /marketing-strategy` | **non** | 3 | Reste ; SYNA doit recevoir l'angle choisi. | Seuls les angles autorisés proposés. |
| 34 | Images | « Importer » (photos, 30 max) — `tab-images.tsx:251-272`, `:284` | `POST /api/projects/[id]/files` (FormData, rôle `original`/`lifestyle`) | **non** (`images.upload`, adaptateur `none`) | 3 | Reste. | — |
| 35 | Images | Fenêtre « Chercher des photos libres » (sujet, type, format, nombre, recherche élargie, silhouettes, « Chercher ») — `tab-images.tsx:285`, `:340-392` | `POST /images/v2` {action:"generate", allowGenerate:false} → tâche `image.v2` (Pixabay, gratuit) | **non** (`images.search`, adaptateur `none`) | 3 | Reste. | — |
| 36 | Images | Fenêtre « Créer une image » (sujet, type, format, nombre 1-2, accord personnes, « Créer · prix ») ; ouverte aussi depuis le thème via `?themeSlot` — `tab-images.tsx:239`, `:286`, `:395-453` | `useCostConfirm("image")` puis `POST /images/v2` {generate, operationId, allowGenerate:true, noStock:true, themePlacement?} → tâche `image.v2` (Qwen-Image 3.0 Pro selon les consignes) | **partiel** : `images.generate` (adaptateur `images`, même moteur `image.v2`, devis/accord) ; mais le type par défaut de l'écran `usage_scene` n'existe pas dans le contrat SYNA (`product_image, packshot, lifestyle, ambiance, trade_photo, banner`) et `themePlacement` absent de l'adaptateur (grep : 0). | 2 | Garder l'écran ; tâche Codex : aligner types et emplacement de thème, puis suggestion SYNA. | Même prix probable en %, même reprise annoncée, produit entier, aucune personne sans accord, image remise à l'emplacement du thème. |
| 37 | Images | Interrupteur « Autoriser des personnes dans les visuels créés » (dans la fenêtre Créer) — `tab-images.tsx:150-176`, `:442` | `PATCH /api/projects/[id]` {settings:{peopleAllowed}} | **non** | 3 | Reste ; SYNA doit le lire, jamais le basculer seul. | Règle « jamais de personne sans autorisation ». |
| 38 | Images | Filtres de source (onglets) et de statut, « Supprimées » + « Restaurer » — `tab-images.tsx:23-75`, `:292-300` | `GET /files?…` ; `PATCH /api/files/[id]` {restore:true} | **non** | 3 | Reste. | — |
| 39 | Images | « Corriger le texte acquis » (titre, sous-ligne, appel) : « Enregistrer gratuitement » / « Reprendre » — `copy-correction.tsx:9-45`, rendu `tab-images.tsx:276` | `GET /jobs?type=image.ai_post` ; `POST /campaigns/v2` {ai_quote} ; `POST /images/copy-review` {save \| resume, approvedEstimateMicro} | **non** | 2 | Reste. | Reprise seulement au clic, plafond initial conservé. |
| 40 | Images / Vidéos / Fichiers / Publications | Visionneuse : « Valider / Écarter », « Télécharger », « Pack CapCut » — `asset-viewer.tsx:319-352` | `PATCH /api/files/[id]` {status} ; liens `GET` | **non** | 3 | Reste. | — |
| 41 | Visionneuse | « Réutiliser sans réimporter » : section de boutique + « Placer » — `asset-viewer.tsx:88-120`, `:355-387` | `POST /theme/ops` {op:"use_media"} (nouvelle version du site) | **partiel** : `theme.exact-edit` (adaptateur `theme`) « retoucher … un média acquis » | 3 | Reste ; SYNA peut proposer le placement. | Même version de thème créée, annulation possible. |
| 42 | Visionneuse | « Créer une publication avec ce média » — `asset-viewer.tsx:121-141`, `:389-396` | `POST /posts` {network:"instagram", media:[id]} | **partiel** : `social.draft` (adaptateur `social`) | 3 | Reste. | — |
| 43 | Visionneuse | Visuel fait par l'IA : choix du format, « Aperçu avec marges (gratuit) », champ « Modification souhaitée », « Nouvelle version par l'IA · prix » (pas de fenêtre de confirmation : prix sur le bouton) — `asset-viewer.tsx:398-431`, `ai-image-actions.tsx:53-177` | `POST /creative/image/[assetId]` {quote} / {reformat} / {redo, instruction, approvedEstimateMicro} → tâche `image.ai_post` | **partiel** : `images.correct` (adaptateur `images`) retouche UNE image source avec devis, pas la recomposition `image.ai_post` d'une publication / publicité ; l'aperçu gratuit n'est pas couvert. | 2 | Reste ; zone de saisie IA concurrente à fondre dans SYNA plus tard. | Même prix, originale gardée, reprise annoncée. |
| 44 | Visionneuse | Mise en page : « Modifier le texte, les couleurs et la mise en page » (`AdEditor`, périmètre Publicités) + « Changer de modèle » (`StyleGallery`) — `asset-viewer.tsx:432-466`, `style-gallery.tsx:57` | `AdEditor` (hors périmètre) ; `POST /ads/docs/[docKey]` {action:"restyle"} (gratuit) | **non** | 3 | Reste. | — |
| 45 | Visionneuse | « Créer la version animée (vidéo) » + style + musique — `animate-post.tsx:9-47` (rendu `asset-viewer.tsx:467`) | `POST /ads/docs/[docKey]` {action:"animate", style, music} (gratuit, sans IA) | **non** | 3 | Reste. | — |
| 46 | Visionneuse | Canva : « Envoyer vers Canva », « Ouvrir dans Canva », « Récupérer la version Canva » — `asset-viewer.tsx:142-169`, `:470-505` | `POST /api/files/[id]/canva` {action:"send" \| "import"} | **non** (connexion de compte = action sensible) | 3 | Reste. | — |
| 47 | Visionneuse | « Utilisé dans », « Versions et dérivés » — `asset-viewer.tsx:510-560` | Lecture (`GET /api/files/[id]?info=1`) | **non** | 3 | Reste ; contexte SYNA. | — |
| 48 | Création de projet (accueil) | « Rédiger ma description avec l'IA / Une autre version / Revenir à mes mots » — `ai-description.tsx:14-57`, utilisé par `home.tsx` | `POST /api/describe` (offert par la plateforme, abonnement payé requis, `describe/route.ts:24-30`) | **non** (`brief.update` corrige une fiche existante, ne rédige pas avant création) | 2 | Reste (avant tout projet, SYNA n'a pas encore de contexte). | — |
| 49 | Publications / Publicités / vidéo guidée | « Avec quel produit / service travailler ? » + « Décrivez le visuel / la vidéo voulu(e) » + « Idées de prompts » — `subject-picker.tsx:24-80` | Local ; `GET /prompt-ideas` (idées écrites à la création) | **partiel** : les outils SYNA images/vidéos prennent un sujet et une consigne, mais pas ces idées | 2 | Zone de saisie IA concurrente : à terme, SYNA pré-remplit la demande. | Même sujet, même photo de référence, même consigne transmise. |
| 50 | Vidéos | « Importer » (vidéos) — `tab-videos.tsx:48-65`, `:82` | `POST /files` (FormData) | **non** | 3 | Reste. | — |
| 51 | Vidéos | Fenêtre « Chercher des plans libres » — `tab-videos.tsx:83`, `:136-178` | `POST /videos/bank` {action:"stock"} → tâche `video.bank.stock` (gratuit) | **non** | 3 | Reste. | — |
| 52 | Vidéos | Fenêtre « Créer un plan avec l'IA » (image de départ, mouvement, format, « Créer le plan · prix ») ; ouverte aussi via `?themeSlot` ; verrou forfait Développer/Dominer — `tab-videos.tsx:35`, `:42`, `:84`, `:181-234` | `POST /videos/bank` {action:"ai", imageId, prompt, aspect, approvedEstimateMicro, themePlacement?} → tâche `video.bank.ai` (prix sur le bouton, pas de fenêtre séparée) | **non** : `videos.plan` adaptateur `none` ; `videos.generate` vise la vidéo guidée (`video.scenes`), pas le plan de banque | 2 | Reste ; tâche Codex si SYNA doit le faire. | Droit forfait vérifié, même prix, aucune personne ajoutée. |
| 53 | Vidéos | Galerie : « Ouvrir », « Télécharger » — `tab-videos.tsx:102-121` | Visionneuse ; lien `GET` | **non** | 3 | Reste. | — |
| 54 | Publications › vidéo sur mesure ; Publicités | `VideoV2Panel` : Type, Diffusion, « Votre demande », interrupteur « Autoriser des plans filmés par l'IA », « Préparer le plan et l'estimation » — `video-v2-panel.tsx:84-100` (monté par `video-gallery.tsx:40` et `tab-publicites.tsx`) | `POST /videos/v2` {action:"plan", ask} (estimation, rien de payé) | **non** (`videos.plan`, adaptateur `none`) | 2 | Reste. | — |
| 55 | Idem | « J'accepte (coût probable …) : produire » / « Produire (montage local, gratuit) » — `video-v2-panel.tsx:63-76`, `:108` | `POST /videos/v2` {action:"generate", approvalToken, approveGeneration} → tâche `video.v2` | **partiel** : `videos.generate` passe par `video.scenes` (moteur de la vidéo guidée), pas `video.v2` ; `videos.motion` couvre le montage local | 2 | Reste ; décider d'un seul moteur avant de confier à SYNA. | Même estimation, montage local gratuit sans accord. |
| 56 | Idem | « Approuver » une vidéo — `video-v2-panel.tsx:127` | `PATCH /api/files/[id]` {status:"approved"} | **non** | 3 | Reste. | — |
| 57 | Idem (fenêtre « Document vidéo ») | Musique avec/sans — `video-v2-panel.tsx:170-181`, `music-choice.tsx:7-23` | `POST /videos/v2/[docKey]` {action:"ops", ops:[{op:"music"}]} | **oui** : `videos.edit` (musique locale) | 3 | Reste (commande manuelle simple). | Nouvelle version, rendu à relancer. |
| 58 | Idem | « Retouche simple » (texte libre) + « Appliquer » — `video-v2-panel.tsx:182-186` | `POST /videos/v2/[docKey]` {action:"edit", instruction} → `localVideoEdit` (sans IA ; sinon « demande une nouvelle production ») | **oui** : `videos.edit` (durée, texte, transitions, musique ; adaptateur `videos`, `video-tool-execution.ts`), simulé, drapeau fermé | 1 | Mini-chat concurrent : candidat à retrait au profit de SYNA après parité. | Mêmes opérations appliquées, même version créée, refus identique pour une demande non locale. |
| 59 | Idem | « Rendre la vidéo », « Dupliquer », « Dupliquer dans un autre format » (9:16, 4:5, 1:1, 16:9) — `video-v2-panel.tsx:187-198` ; « Autre format… » de la vidéo guidée `guided-video.tsx:40-47`, `:223-228` | {render} / {duplicate} / {reformat, aspect} | **partiel** : `videos.edit` / `videos.motion` mettent en file `video.v2.render` ; duplication et changement de format non vus — à vérifier | 3 | Reste. | — |
| 60 | Idem | Exports « Sous-titres SRT / VTT », « Document (JSON) » ; galerie « MP4 / SRT / Pack CapCut » — `video-v2-panel.tsx:200-204`, `video-gallery.tsx:74-78` | Liens `GET …?export=` | **non** | 3 | Reste. | — |
| 61 | Idem | Versions + « Restaurer » — `video-v2-panel.tsx:205-215` | {action:"restore", version} | **oui** : `videos.restore` | 3 | Reste (commande manuelle). | Même version restaurée. |
| 62 | Publications / Publicités / Préparation | Vidéo guidée : « Comment créer les clips ? » (directs / référence / par étapes) + photo par scène — `guided-video.tsx:118`, `:132-133` | Local | **partiel** : le contrat `videos.generate` n'accepte que `direct` et `reference` (`video-generation-contract.ts`), pas « par étapes » | 2 | Reste. | Les trois modes doivent exister des deux côtés. |
| 63 | Idem | Sujet + demande (`SubjectPicker`), Format, Durée totale, Nombre de scènes, Musique ; devis recalculé à chaque réglage ; brouillon gardé dans le navigateur — `guided-video.tsx:64-91`, `:135-173` | `POST /creative/video` {action:"quote", …} à chaque changement ; `localStorage` | **partiel** (paramètres de `videos.generate`) | 2 | Reste. | Même devis pour les mêmes réglages. |
| 64 | Idem | « Voix du projet » (sans voix / voix OpenAI) — `guided-video.tsx:174-182` | `PATCH /videos/creative-memory` {voice, voiceId, voiceConsent:"synthetic"} | **partiel** : `videos.voice` corrige les phrases dites, ne choisit pas la voix | 3 | Reste (réglage + consentement). | — |
| 65 | Idem | « Préparer le scénario (· rédaction prix) » — `guided-video.tsx:103`, `:191-194` | `POST /creative/video` {action:"plan", approvedScriptMicro} → tâche `video.scenario` (rédaction IA payante si prix > 0) | **partiel** : `videos.generate` exige un scénario mais `videos.plan` est `none` | 2 | Reste. | Même prix de rédaction, scénario repris sans nouvelle rédaction. |
| 66 | Idem | Scénario : « Une correction simple ? » + « Appliquer au scénario (gratuit) » + édition par scène (ce que montre le plan, mouvement, titre, voix, photo) — `guided-video.tsx:185` | `POST /creative/video` {action:"refine", draftPlan, instruction} | **partiel** — à vérifier (pas d'opération SYNA dédiée) | 2 | Zone de saisie concurrente, à fondre dans SYNA plus tard. | — |
| 67 | Idem | « Valider et créer la vidéo · prix » (+ plafond affiché) — `guided-video.tsx:99-112`, `:186-194` | `POST /creative/video` {action:"create", approvalToken, approvedEstimateMicro} → tâche `video.scenes` | **partiel** : `videos.generate` (adaptateur `video-generation`, même tâche `video.scenes`) mais sans le mode « par étapes » (ligne 62) | 2 | Suggestion SYNA quand le mode « par étapes » sera couvert. | Même devis, même plafond, même reçu, aucune relance sans demande. |
| 68 | Idem | « Reprendre ce scénario sans nouvelle rédaction » — `guided-video.tsx:123-130` | Local (scénarios enregistrés relus par `GET /creative/video`) | **non** | 3 | Reste. | — |
| 69 | Idem | Vidéo incomplète : « Reprendre le montage conservé (gratuit) » + « Scène à reprendre » + « Reprendre cette scène uniquement · prix » (pas de fenêtre séparée) — `guided-video.tsx:122` | `POST /creative/video` {action:"repair", jobId, index, kind} → tâche `video.scenes` (plafond) | **partiel** : `videos.retake` remplace un seul clip avec devis mais via `video.v2.render` (`video-clip-execution.ts`), pas la même tâche | 2 | Reste. | Un seul clip payé, les autres non rachetés. |
| 70 | Fichiers | Arborescence, « Nouveau dossier / sous-dossier », « Renommer le dossier », « Supprimer le dossier vide », glisser-déposer vers un dossier — `tab-fichiers.tsx:55-115` | `POST /folders` ; `PATCH` / `DELETE /api/folders/[id]` ; `PATCH /api/files/[id]` {folderId} | **non** (`files.organize`, adaptateur `none`) | 3 | Reste. | — |
| 71 | Fichiers | « Ranger les fichiers non classés » — `tab-fichiers.tsx:99` | `POST /classify` → tâche `files.classify` (**IA `aiClassify` si un modèle texte est configuré**, `worker/handlers.ts:457-476`), aucun prix affiché | **non** (`files.organize` `none`) | 2 | Reste ; tâche Codex : annoncer le coût ou rester sans IA. | Aucun fichier supprimé, mêmes dossiers système. |
| 72 | Fichiers | Recherche, vignettes / liste, « Importer », dépôt de fichiers — `tab-fichiers.tsx:42-54`, `:83`, `:119-128` | `GET /files?q=` ; `POST /files` (form) | **non** | 3 | Reste. | — |
| 73 | Fichiers | Sélection : « Déplacer » (fenêtre), « Corbeille », « Restaurer » — `tab-fichiers.tsx:130-137`, `:182-204` | `PATCH /api/files/[id]` {folderId \| restore} ; `DELETE /api/files/[id]` | **non** (`files.delete` adaptateur `none`, sensible) | 3 | Reste. | Suppression jamais confiée à SYNA. |
| 74 | Prompts | Bibliothèque : recherche, secteur, type de tâche, filtres, favoris (cœur) — `tab-prompts.tsx:50-82`, `:147-207` | `GET /api/prompts` ; `PATCH /api/prompts/[id]` {favorite} | **non** (`prompts.edit` `none`) | 3 | Reste. | — |
| 75 | Prompts | Éditeur du prompt + « Compléter avec le projet » + langue — `tab-prompts.tsx:90-104`, `:209-221` | `POST /prompt-fill` (substitution locale, sans IA) | **non** | 3 | Reste. | — |
| 76 | Prompts | **« Lancer avec l'IA »** (cibles Marque, Produit, Publications, Publicités) + « Réponse de l'IA » (copier, ouvrir l'onglet) — `tab-prompts.tsx:105-121`, `:219`, `:240-256` | `POST /prompt-run` → `llmText` tâche `copywriting` (6000 jetons max), **débite le budget IA sans prix affiché**, limite horaire (`prompt-run/route.ts:25-62`) | **non** (aucune opération « exécuter un prompt libre ») | 2 | Chat IA concurrent : devient « Envoyer à SYNA » ; en attendant, ajouter le devis. | Devis avant appel (absent aujourd'hui), affirmations non confirmées signalées. |
| 77 | Prompts | « Insérer dans … » (Boutique, Images, Vidéos, Calendrier) — `tab-prompts.tsx:122-143`, `:217` | `POST /prompt-fill` puis `sessionStorage es-insert-<onglet>-<id>` et navigation | **non** | 3 | Remplacer par « Envoyer à SYNA ». | **Défaut constaté** : seule `tab-boutique.tsx:297` lit cette clé (grep `es-insert`) ; pour Images, Vidéos et Calendrier le message dit « Prompt inséré » mais rien ne le reprend. |
| 78 | Prompts | « Copier », « Enregistrer » (Mes prompts, `window.prompt` du nom), « Supprimer » — `tab-prompts.tsx:222-237` | Presse-papiers ; `POST /api/prompts` ; `PATCH` / `DELETE /api/prompts/[id]` | **non** | 3 | Reste. | — |

Composant `video-gallery.tsx` (`EditedVideos`) : monté dans Publications (`social-studio.tsx:26`) ; ses contrôles sont couverts
par les lignes 54-61. `music-choice.tsx` : simple bascule locale, couverte par les lignes 45, 57 et 63.

### (a) Chats et zones de saisie IA concurrentes de SYNA (dans ce périmètre)

1. Prompts › éditeur + « Lancer avec l'IA » (`tab-prompts.tsx:209`, `:219`) — vrai chat IA payant, sans devis.
2. Marque › « Orientation souhaitée » de la nouvelle proposition (`tab-marque.tsx:334`).
3. Logo V2 › remarques en `window.prompt` (reprise de série, nouvelle version) (`logo-v2-panel.tsx:154`, `:164`).
4. Stratégie › « Quel défaut faut-il corriger ? » avant une nouvelle recherche (`marketing-strategy.tsx:52`).
5. Visionneuse › « Modification souhaitée » + « Nouvelle version par l'IA » (`ai-image-actions.tsx:154-177`).
6. Création guidée › « Décrivez le visuel / la vidéo voulu(e) » + « Idées de prompts » (`subject-picker.tsx:52-55`).
7. Vidéo sur mesure › « Votre demande » (`video-v2-panel.tsx:91-93`) et « Retouche simple » (`:182-186`).
8. Vidéo guidée › « Une correction simple ? » du scénario (`guided-video.tsx:185`).
9. Images › « Sujet » de « Créer une image » (`tab-images.tsx:438`) ; Vidéos › « Mouvement souhaité » (`tab-videos.tsx:225`).
10. Accueil › « Rédiger ma description avec l'IA » (`ai-description.tsx:45`), avant que le projet existe.

### (b) Capacités SYNA absentes ou partielles constatées

- **Relais OpenAI des logos refusé dans SYNA** (`logo-tool-execution.ts:60`, `input.relay` → erreur) : la règle du propriétaire
  « Qwen-Image 3.0 Pro dessine, OpenAI reprend si le contrôle est insuffisant, toujours au moins un logo » n'est tenue que par
  l'écran natif.
- Logo : pas de nouvelle version unitaire (`redraw`), pas d'« Écarter », pas d'« Arrêter », pas de choix d'un logo hors série
  complète ; choix du style non vu dans le contrat (à vérifier).
- Marque : `brand.generate` produit une proposition **dans Préparation**, pas la tâche `brand.build` de l'onglet Marque ; aucune
  opération pour modifier l'identité active (positionnement, cible, ton, histoire), la palette, la direction, la planche, la charte,
  le kit réseaux sociaux ou la ligne éditoriale.
- Stratégie : `research.approve`, `proposal.compare`, `proposal.choose` sans adaptateur ; ni préparation, ni revue, ni devis groupé,
  ni activation d'un angle par SYNA (seulement une préférence de discussion).
- Images : type `usage_scene` (valeur par défaut de l'écran pour un produit) absent du contrat ; emplacement de thème
  (`themePlacement`) absent ; recherche de photos libres et import sans adaptateur ; recomposition `image.ai_post` non couverte.
- Vidéos : plan de banque filmé par l'IA (`video.bank.ai`) et vidéo sur mesure `video.v2` non couverts ; mode « par étapes » absent ;
  reprise d'une scène par un autre chemin (`video.v2.render` au lieu de `video.scenes`) ; choix de la voix non couvert.
- Fichiers : `files.organize`, `files.delete` sans adaptateur. Prompts : `prompts.edit` sans adaptateur, aucune exécution de prompt.

### (c) Dépendances à ne pas casser

- **Droits et forfaits** : `useCreationLocked` / `PlanRequired` (Images, Vidéos), verrou « Développer ou Dominer » des plans IA
  (`tab-videos.tsx:35`, `PLANS[…].videos`), droit de série de logos `seriesRights` (une série + renouvellement selon forfait),
  quota d'angles `usedAngleIds / limit`, abonnement requis pour `/api/describe` et `/prompt-run`, `aiActiveFor` / `runForUser`.
- **Devis** : `useCostConfirm` (`cost-confirm.tsx`, Images), devis logo `logoSeriesQuote` / `logoRedrawQuote` (prix probable, relais,
  plafond), `approvedEstimateMicro` (plans IA, retouches d'image, reprises), `approvalToken` (vidéo sur mesure, vidéo guidée),
  `createQuote` / `quoteOf` de Préparation (recherche), devis groupé de stratégie, `approvedPaidMicro` (propagation d'identité).
  Prix toujours en % du budget IA (`useBudgetPct`, `formatBudgetPct`), jamais en euros.
- **Historique et versions** : versions de documents vidéo (restaurer), versions d'images et dérivés, nouvelle version du thème
  pour `use_media`, refus de logos mémorisés, scénarios enregistrés, brouillon local de la vidéo guidée, `operationId` /
  `idempotencyKey` contre les doubles clics, corbeille restaurable.
- **Suivi des tâches** : `useActive([...])` sur `brand.*`, `image.v2`, `video.*`, `files.classify` ; événements
  `studio:images-changed` et `studio:videos-changed` émis aussi par SYNA (`tab-images.tsx:245`, `video-v2-panel.tsx:45`).
- **Consentements** : `peopleAllowed` (images, vidéos, publicités), `voiceConsent:"synthetic"`.

### (d) Nombre de lignes par groupe (78 lignes)

- Groupe 1 : **3** — lignes 7, 25, 58
- Groupe 2 : **24** — lignes 1, 6, 8, 10, 14, 19, 20, 30, 36, 39, 43, 48, 49, 52, 54, 55, 62, 63, 65, 66, 67, 69, 71, 76
- Groupe 3 : **51** — toutes les autres
- Groupe 4 : **0** — aucun contrôle prouvé mort (les anciens panneaux logo restent rendus pour les projets qui en ont)

---

## Inventaire D — Diffusion (Publications, Calendrier, Publicités) et panneau SYNA

Mission #282, phase 1. Lecture seule du dépôt sur `main` 1c406f50. Aucun fichier du dépôt modifié, aucun serveur lancé,
aucun appel réseau ni IA.

Rappels utilisés pour la colonne « Équivalent SYNA » (voir le brief) :
- Catalogue : `src/lib/orchestrator/conversation/studio-operations.ts` (`STUDIO_OPERATIONS`).
- Toute opération avec adaptateur est **simulée, drapeau fermé** : testée seulement avec un fournisseur simulé, derrière
  `STUDIO_CONVERSATION_*` (`tool-flags.ts`), fermés par défaut. Les adaptateurs sociaux et publicitaires dépendent de
  `conversationSocialEnabled()` = `LOT_A` + `AI` + `SPECIALISTS` + `TOOLS` + `CONTEXT` + `SOCIAL`.
- Opérations de ce périmètre : `social.plan`, `social.draft`, `campaign.draft` (adaptateur `social`,
  `social-tool-execution.ts`), `social.generate` (`social-production`), `ads.create` (`campaign-visual`) ;
  absentes (`adapter:'none'`, sensibles) : `social.publish`, `calendar.update`, `ads.launch`, `images.upload`.
- Limites lues dans `social-tool-contract.ts` : `social.draft` = 1 à 5 brouillons, formats image / carrousel / texte
  (pas de vidéo), réseaux sans LinkedIn ; `social.plan` = 31 jours au plus, 5 par jour, horaires, réseaux, rotation,
  objectif, niveau commercial (pas de jours de semaine, jours exclus, répartition des formats, thèmes prioritaires ni
  compte par réseau). `social.generate` et `ads.create` ne travaillent que sur un brouillon **issu d'une préparation
  SYNA** (champ `preparationId`, candidats filtrés dans `conversation-social-tools.tsx:34`).

Groupes : 1 = doublon IA couvert par SYNA ; 2 = IA partiellement ou non couverte (préserver, tâche Codex) ; 3 = commande
manuelle indispensable (conserver) ; 4 = obsolète prouvé. Pour la partie SYNA (tableau 2), 3 = socle SYNA à conserver,
2 = capacité SYNA partielle à compléter (tâche Codex).

---

### Tableau 1 — Diffusion

### Publications et Calendrier

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA (oui/partiel/non + preuve) | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Publications | Onglets « Publications » et « Calendrier » — `tab-publications.tsx:9`, `tab-calendrier.tsx:5` (le Calendrier n'est qu'un accès direct à la rubrique, `studio-nav.ts:32` `within:"publications"`) | Montent `SocialStudio` ; `GET /api/projects/[id]/social/v2?from&to` (`social-studio.tsx:126`) | non (navigation) | 3 | Reste ; l'onglet actif est transmis à SYNA comme contexte (`ActiveTabSchema` connaît déjà `publications` et `calendrier`) | Liens directs `#calendrier`, `#image`… et anciens alias `#creer`, `#comptes` (`social-studio.tsx:116`) |
| Publications | Sous-menu à 9 rubriques + pastilles de compteurs (À valider, Programmées, Échecs…) — `social-studio.tsx:132-176` | Local (état React, `history.replaceState`) | non | 3 | Reste comme colonne de navigation | Compteurs identiques avant/après |
| Publications › Vue d'ensemble | Compteurs réels, « Ouvrir le calendrier », « Ma communication automatique », « Générer mon calendrier » — `social-autopilot.tsx:281-305` | Lecture des données du GET social/v2 ; boutons = navigation locale | non (le relevé `studioHelp` de SYNA montre l'état du Studio, pas ces compteurs) | 3 | Reste ; peut nourrir le résumé de contexte de SYNA | Aucun chiffre inventé (« Données indisponibles ») |
| Publications › Stratégie | Stratégie 12 mois : feuille de route, parcours client, publics, piliers, temps forts, rythme, prochaines actions — `social-studio.tsx:210-332` | Lecture seule (`data.strategy`, `data.longTerm`) | non (`strategy.compare` / `strategy.preference` portent sur les angles marketing, pas sur ce plan) | 3 | Reste, rangé dans « Détails » ; SYNA peut le citer | « [À compléter] » conservé, aucun fait inventé |
| Publications › Ma communication automatique | Réglages en 5 étapes (objectif, réseaux + suspension, fréquence, horaires, jours d'avance, fuseau, ton, langue, niveau commercial, produits prioritaires, mode visuel + plafond hebdo en %, formats, mots à faire valider) + « Enregistrer et activer » / « Arrêter la préparation automatique » — `social-autopilot.tsx:75-252` | `POST /api/projects/[id]/social/v2/autopilot {action:"save", config}` ; aperçu `GET …/autopilot?preview=week` | non (aucune opération du catalogue) | 3 | Reste dans l'écran ; SYNA peut proposer un réglage, jamais l'enregistrer seul | Limites du forfait (`perDay`, `calendarDays`), plafond en % (jamais en euros) |
| Publications › Ma communication automatique | Pilote automatique : texte d'accord + case « J'ai lu et j'accepte » + « Activer » / « Désactiver tout de suite » — `social-autopilot.tsx:208-236` | `POST …/autopilot {action:"enable", consent}` / `{action:"disable"}` | non (action sensible : approbation et programmation automatiques) | 3 | Reste manuel, hors SYNA | Accord daté conservé ; bouton grisé sans `autopublish` du forfait |
| Publications › Ma communication automatique | « Tout mettre en pause » / « Tout reprendre » — `social-autopilot.tsx:112-114` | `POST …/autopilot {action:"pause_all"}` / `{action:"resume_all"}` | non | 3 | Reste ; à rendre accessible aussi depuis le panneau contextuel (coupe-circuit) | Revérification des publications à la reprise |
| Publications › Ma communication automatique | « Préparer maintenant (gratuit) » — `social-autopilot.tsx:115` | `POST …/autopilot {action:"run_now"}` (préparation locale ; si le pilote est actif, il peut aussi approuver et programmer) | non | 3 | Reste ; résultat du passage affiché dans SYNA plus tard | Même compte rendu (créées, produites, approuvées, programmées, en attente) |
| Publications › Ma communication automatique | Semaine type et historique — `social-autopilot.tsx:255-278` | Lecture | non | 3 | Reste (Détails) | — |
| Publications › Publication image | Formulaire « Créer une publication image » : avec ou sans IA, produit/service + idée libre, réseaux, jour, heure, thème, titre, rôle du contenu (conseil, FAQ, checklist, tutoriel, avis réel avec source et autorisation…), carrousel, prix en % puis « Créer la publication » — `social-create.tsx:76-206` | `POST /api/projects/[id]/social/v2 {action:"quote_one"}` puis `{action:"create_one", approvedEstimateMicro, editorial, subject…}` ; gratuit = production immédiate (`produceBatch`) ; payant = tâche worker `social.v2.produce` | partiel — `social.draft` (simulé, drapeau fermé) enregistre ≤5 brouillons avec médias acquis et texte rédigé par SYNA ; `social.generate` crée ensuite l'image manquante. Manque : avis réel sourcé, structure éditoriale, carrousel IA devisé par page, mode « publication entièrement IA », choix du sujet, LinkedIn | 2 | Le formulaire reste l'écran « Créer » ; SYNA l'ouvre pré-rempli au lieu de le remplacer | Même devis (`quote_one` = devis SYNA), même refus 409 sans prix accepté, même tâche, même statut « à valider », avis refusé sans source |
| Publications › Publication vidéo | Création guidée vidéo (`GuidedVideo as="post"`) — monté `social-studio.tsx:192` (composant `guided-video.tsx`, hors périmètre détaillé) | `/api/projects/[id]/creative/video`, `/videos/v2` (actions quote, create, plan, refine, repair) — à inventorier par le lot Vidéos | partiel — `videos.generate` / `videos.plan` existent côté Vidéos, mais aucune ne crée une publication | 2 | Reste ; à traiter avec l'inventaire Vidéos | Ne pas casser la règle publicité ≠ publication organique |
| Publications › Publication vidéo | Formulaire « Créer une publication vidéo » (montage gratuit / plans filmés par l'IA) — `social-create.tsx:34-73` (`VideoChoice`) et `:76` | `quote_one` puis `create_one` (kind vidéo, mode `ai_video`) → tâche `social.v2.produce` | non — `social.draft` exclut la vidéo (`social-tool-contract.ts:6`) | 2 | Reste | Même devis, même tâche, aucune personne inventée |
| Publications › Publication vidéo | Vidéos montées (`EditedVideos`) — `social-studio.tsx:195` | `GET /api/projects/[id]/files` (`video-gallery.tsx`) | non | 3 | Reste | — |
| Publications › Publication image / vidéo | « Publications planifiées sans visuel / sans vidéo » : gratuit « Préparer gratuitement (N) » ou payant « Voir le prix » + plafond en % + « J'accepte et je lance » — `social-create.tsx:209-305` | Gratuit : `POST social/v2 {action:"produce", allowPaid:false}` par lots de 3. Payant : `{action:"estimate"}` puis `{action:"produce", maxCostPct, approvedEstimateMicro}` → `social.v2.produce` | partiel — `social.generate` : une image à la fois, seulement pour un brouillon image issu d'une préparation SYNA ; pas de lot, pas de vidéo, pas de plafond global | 2 | Reste ; SYNA pourra proposer « produire les visuels manquants » en renvoyant ici | Devis du lot = somme des devis SYNA ? plafond jamais dépassé, aucune double facturation |
| Publications › Planifier plusieurs publications | Formulaire : début, fin, fuseau, publications par jour (bloquées au-delà du forfait), horaires, jours, jours exclus, réseaux + compte, « tous les réseaux », répartition des formats, thèmes prioritaires, angle, « Planifier N publications (gratuit) » — `social-studio.tsx:337-470` | `POST social/v2 {action:"plan", angleId, request}` (planificateur local gratuit, `assertCalendarDays`, `assertPerDayRequest`) | partiel — `social.plan` (simulé, drapeau fermé) : ≤31 jours, ≤5/jour, horaires, réseaux sans LinkedIn, rotation, objectif. Manque : jours de semaine, jours exclus, répartition des formats, thèmes prioritaires, compte par réseau, angle (à vérifier) | 2 | Reste l'écran de réglage fin ; SYNA pré-remplit | Mêmes créneaux (dates, heures, réseaux), mêmes refus du forfait, coût 0 % |
| Publications › Planifier plusieurs publications | **Zone de saisie** « Demander en une phrase » + « Préparer (gratuit) » — `social-studio.tsx:394-398` | `POST social/v2 {action:"ask", angleId, text}` (`planFromAsk`, local, gratuit) | partiel — `social.plan` passe par une réponse SYNA payante (devis + accord), alors qu'ici c'est gratuit | 2 | À fusionner plus tard avec la saisie SYNA, en gardant le moteur local gratuit (règle « moteur local d'abord ») | Même phrase → même plan, coût 0 %, mêmes limites du forfait |
| Publications › Planifier plusieurs publications | Résultat (« N publications planifiées », alertes, liens vers les visuels, « Voir le calendrier ») — `social-studio.tsx:456-466` | Local | non | 3 | Reste | — |
| Publications › Calendrier | Vues mois / semaine / jour / liste, filtre réseau, précédent / aujourd'hui / suivant, légende — `social-studio.tsx:536-690` | Local + `GET social/v2` (plage de dates) | non | 3 | Reste (vue principale de l'espace de travail) | — |
| Publications › Calendrier | Glisser-déposer une publication sur un autre jour — `social-studio.tsx:569-577`, `:658` | `PATCH /api/projects/[id]/social/v2/posts/[postId] {scheduledAt}` | non — `calendar.update` `adapter:'none'`, sensible | 3 | Reste | Fuseau horaire respecté |
| Publications › Calendrier | Actions rapides d'une carte : Modifier, Dupliquer, Supprimer (confirmation navigateur) — `social-studio.tsx:523-525`, `:604-612` | `POST …/posts/[postId] {action:"duplicate"}` ou `{action:"delete"}` | non (aucune suppression dans SYNA) | 3 | Reste | — |
| Publications › Calendrier | « Mettre en pause » / « Reprendre » le calendrier — `social-studio.tsx:632-633` | `POST social/v2 {action:"pause"}` ou `{action:"resume", planId}` | non | 3 | Reste | — |
| Publications › Calendrier | **Chat** « Modifier le calendrier en une phrase » + aperçu à confirmer (suppression, changement, coût IA en % du budget) + « Confirmer » / « Annuler » — `social-studio.tsx:578-603`, `:691-712` | `POST social/v2 {action:"edit", text, confirm, approvedPct}` (`applySocialEdit` : local d'abord, IA devisée sinon ; le serveur revérifie le coût) | non — `calendar.update` `adapter:'none'` (sensible) | 2 | Reste tant que SYNA n'a pas `calendar.update` ; ensuite devient une suggestion SYNA avec la même confirmation | Les exemples de l'écran (« Vide novembre », « Décale tout d'une semaine », « Annule ma dernière modification »…), même aperçu avant suppression, même % revérifié |
| Publications › À valider et suivre | Filtres + sélection + « Approuver la sélection » / « Approuver les 7 prochains jours » — `social-studio.tsx:715-759` | `POST social/v2 {action:"approve", ids}` | non (aucune opération ; `social.draft` n'approuve jamais) | 3 | Reste | Approbation liée à la version (`approvedHash`) |
| Publications › À valider et suivre | « Programmer la sélection » — `social-studio.tsx:760` | `POST social/v2 {action:"schedule", ids}` (`requirePlan`) | non (programmation réelle volontairement absente) | 3 | Reste | Refus détaillés par publication |
| Publications › À valider et suivre | Automatisations (préparer la semaine, programmer les approuvées, avertir des échecs, rappel) + Pause / Reprendre — `social-studio.tsx:782-795` | `POST social/v2 {action:"automation", kind}` / `{action:"automation_status"}` | non | 3 | Reste ; à clarifier avec « Ma communication automatique » (deux endroits pour des règles proches) | Aucune dépense IA ni publication sans approbation |
| Publications › Statistiques | Compteurs et métriques par réseau — `social-studio.tsx:802-826` | Lecture | non | 3 | Reste | Aucun chiffre estimé |
| Publications (éditeur) | Éditeur de publication (fenêtre) : titre, réseau, blocs du visuel, légende (compteur), hashtags, lien, date, heure, compte, médias (ajouter, ordonner, retirer) + « Enregistrer » — `social-studio.tsx:876-989` | `GET` puis `PATCH /api/projects/[id]/social/v2/posts/[postId]` (nouvelle approbation si la version change) | non directement — SYNA ouvre ce même éditeur (`SocialPostEditor`, `social-studio.tsx:871`, appelé par `conversation-social-tools.tsx:35`) | 3 | Reste l'éditeur unique, partagé avec SYNA | Ne pas casser l'export `SocialPostEditor` |
| Publications (éditeur) | « Approuver cette version », « Programmer », « Déprogrammer », « Publier maintenant », « Dupliquer », « Dupliquer dans un autre format », « Supprimer » — `social-studio.tsx:990-1018` | `POST …/posts/[postId] {action: approve, schedule, unschedule, publish_now, duplicate, duplicate_format, delete}` | non — `social.publish` `adapter:'none'` (sensible) | 3 | Reste. À noter : « Supprimer » dans l'éditeur n'a pas de confirmation (`:1018`), contrairement au calendrier (`:605`) | Publication réelle hors SYNA |
| Publications (éditeur) | « Elle est publiée » / « Elle n'est pas publiée » (état incertain) — `social-studio.tsx:935-940` | `POST …/posts/[postId] {action:"confirm_uncertain", published}` | non | 3 | Reste | — |
| Publications (éditeur) | « Créer / Refaire le visuel de cette publication » : gratuit, image IA ou publication IA, « Voir le prix », « J'accepte et je lance » — `social-studio.tsx:1050-1103` | Gratuit : `POST social/v2 {action:"produce", allowPaid:false, replace}`. Payant : `{action:"estimate"}` puis `{action:"produce", maxCostEur, approvedEstimateMicro}` → `social.v2.produce` | partiel — `social.generate` seulement pour un brouillon image sans média issu de SYNA ; pas de « refaire » sur une publication existante | 2 | Reste dans l'éditeur | Même coût probable, reprise annoncée, ancien visuel gardé en bibliothèque |
| Publications (éditeur) | Variantes par réseau, historique des envois, « Voir sur le réseau » — `social-studio.tsx:1022-1043` | Lecture | non | 3 | Reste (Détails) | — |
| Publications et Publicités | Bloc « Vos dix publications initiales » / « Vos dix publicités initiales » : « Je confirme le brief… », « Devis global des créations manquantes », « J'accepte le devis global et lance l'ensemble initial » — `initial-creatives.tsx:10-60`, monté `social-studio.tsx:180` et `tab-publicites.tsx:96` | `GET` (toutes les 3 s) puis `POST /api/projects/[id]/social/initial {action: confirm-context, quote, generate(quoteId)}` → tâche worker `social.initial` | non (aucune opération du catalogue) | 2 | Reste ; SYNA peut afficher l'avancement plus tard | Même devis global (probable + plafond avec corrections), verrou Dominer pour les publicités |
| Publications et Publicités | Historique des corrections de texte d'un visuel IA (`CopyFailureHistory`, `CopyCorrection`, composant `copy-correction.tsx`) — monté `social-studio.tsx:179` et `ad-editor/ai-ad-creator.tsx:152` | `GET /api/projects/[id]/jobs?type=image.ai_post` ; `GET/POST /api/projects/[id]/images/copy-review {action, edits, approvedEstimateMicro}` ; devis `POST campaigns/v2 {action:"ai_quote"}` | non | 2 | Reste | Reprise payante seulement après accord, texte du client mot pour mot |
| Publications et Publicités | Sélecteur d'angle de communication (`CommunicationAngleSelector`) — `social-studio.tsx:382`, `social-create.tsx:134`, `ad-campaigns.tsx:188`, `ad-editor/ai-ad-creator.tsx` | `GET /api/projects/[id]/marketing-strategy` ; l'angle part avec `plan`, `ask`, `create_one`, campagnes, `ai_create` | partiel — `strategy.preference` retient un angle dans la discussion ; sa transmission aux outils sociaux est à vérifier | 3 | Devient un élément du contexte partagé (même angle vu par SYNA et par les formulaires) | Même angle tamponné (`strategyStamp`) côté SYNA et côté écran |

### Publicités

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA (oui/partiel/non + preuve) | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Publicités | Sous-menu à 6 rubriques + message de verrou Dominer — `tab-publicites.tsx:24-118`, `:97` | Local ; `GET /api/projects/[id]/files?role=ad,video`, `GET /api/projects/[id]/campaigns` ; `planAllowsAds` | non | 3 | Reste | Verrou forfait identique |
| Publicités › Vue d'ensemble | Compteurs + « Par où commencer » — `tab-publicites.tsx:121-163` | Local (navigation) | non | 3 | Reste | — |
| Publicités › Stratégie publicitaire | Plans de test des campagnes (lecture) — `tab-publicites.tsx:165-194`, `StrategyPanel` `ad-campaigns.tsx:247` | Lecture | non | 3 | Reste (Détails) | — |
| Publicités › Publicité image | « Publicité conçue par l'IA » : angle, produit/service, idée libre, format, prix en %, « Créer la publicité » — `ad-editor/ai-ad-creator.tsx:45-240` | `POST /api/projects/[id]/campaigns/v2 {action:"ai_quote"}` puis `{action:"ai_create", operationId, subject, request, aspect, approvedEstimateMicro}` → tâche `image.ai_post` ; suivi `GET campaigns/v2` toutes les 3 s | partiel — `ads.create` (simulé, drapeau fermé) crée le visuel manquant d'UNE annonce d'un brouillon de campagne préparé par SYNA ; pas de création libre hors campagne, pas de choix de sujet | 2 | Reste ; SYNA pourra ouvrir ce formulaire pré-rempli | Même devis (`aiPostProbableMicro`), même refus 409 sans prix accepté, même idempotence (`operationId`), même galerie |
| Publicités › Publicité image | Galerie des publicités IA : « PNG » + « Modifier / autre format » (`AiImageActions`) — `ad-editor/ai-ad-creator.tsx:243-282`, `ai-image-actions.tsx:25-100` | `POST /api/projects/[id]/creative/image/[assetId] {action: quote, reformat, redo}` | partiel — `images.correct` corrige une image avec devis, mais pas de recomposition dans un autre format | 2 | Reste | Même devis, original conservé |
| Publicités › Publicité image | « Créer des publicités » : nombre, format, offre réelle, audience, devis, « Créer » — `ad-editor/ad-creatives.tsx:96-237`, `:302-600` | `POST campaigns/v2 {action:"campaign_quote"}` puis `{action:"generate", operationId, approvedEstimateMicro, count, platforms, aspects, offer, audience}` → tâche `ads.v2` ; suivi `GET /api/projects/[id]/jobs?type=ads.v2` toutes les 2 s | partiel — `campaign.draft` (textes) + `ads.create` (un visuel par annonce) ; pas de lot de N concepts devisés ensemble, pas de document à calques modifiable | 2 | Reste | Même devis par concept, une seule tâche à la fois (409 sinon) |
| Publicités › Publicité image | Liste des créations : « Modifier », « Exporter PNG » — `ad-editor/ad-creatives.tsx:340-400` | `GET /api/projects/[id]/ads/docs` ; `GET /ads/docs/[docKey]?export=png` | non | 3 | Reste | — |
| Publicités › Publicité image | « Autres formats » : aperçu puis « Valider ce format » / « Valider et modifier » — `ad-editor/ad-creatives.tsx:240-290`, `:405-490` | `POST /api/projects/[id]/ads/docs/[docKey] {action:"preview_reflow"}` puis `{action:"reflow"}` (sans IA, gratuit) | non | 3 | Reste | Rien créé avant validation |
| Publicités › Éditeur visuel | Canevas, calques, propriétés, couleurs, recadrage, animation, texte en place, annuler / rétablir, zoom, téléphone tactile — `ad-editor/ad-editor.tsx`, `canvas.tsx`, `panels.tsx` | Local (historique d'opérations) ; polices `GET /api/fonts` (`resources.ts`) | non | 3 | Reste (édition manuelle gratuite) | — |
| Publicités › Éditeur visuel | « Enregistrer » (version) + reprise des modifications non enregistrées (« Les reprendre » / « Ignorer ») — `ad-editor/ad-editor.tsx:191`, `:563-570` | `POST /ads/docs/[docKey] {action:"save"}` ; brouillon local en `localStorage` | non | 3 | Reste | Version incrémentée, brouillon local retrouvé |
| Publicités › Éditeur visuel | Importer une photo — `ad-editor/ad-editor.tsx:266-281` | `POST /api/projects/[id]/files` (formulaire, rôle `ad-source`) | non — `images.upload` `adapter:'none'` | 3 | Reste | — |
| Publicités › Éditeur visuel | **Zone de saisie** « Demander une retouche » + « Appliquer » — `ad-editor/ad-editor.tsx:341-382`, `:465-466` | D'abord local et gratuit (`localAdEdit`) ; sinon `POST /ads/docs/[docKey] {action:"ai_edit", instruction, doc}` après `cost.confirm("edit")` | non | 2 | Reste dans l'éditeur (retouche d'un objet précis) ; plus tard SYNA avec une cible « document publicitaire » | Mêmes retouches gratuites en local, même accord avant IA, « Annuler » possible |
| Publicités › Éditeur visuel | « Modifier la photo avec l'IA » — `ad-editor/ad-editor.tsx:316-335`, `:468`, `:670` | `cost.confirm("images")` puis `POST /api/projects/[id]/images/v2 {action:"edit", assetId, instruction}` → tâche `image.edit` ; résultat posé sur le calque | partiel — `images.correct` corrige une image mais ne la pose pas dans le document publicitaire | 2 | Reste | Même devis, résultat posé au même calque |
| Publicités › Éditeur visuel | « Créer une nouvelle image avec l'IA » (fond) — `ad-editor/ad-editor.tsx:284-312`, `:672` | `cost.confirm("images")` puis `POST /images/v2 {action:"generate", request:{kind:"ambiance", topic, aspect}}` → tâche `image.v2` ; posée sur le calque | partiel — `images.generate` sans pose dans le document | 2 | Reste | Même contrôle qualité, même format |
| Publicités › Éditeur visuel | Retouche qui demande « une nouvelle version créative » (confirmation navigateur) — `ad-editor/ad-editor.tsx:355-366` | `POST campaigns/v2 {action:"generate", count:1}` **sans** `approvedEstimateMicro` : la route refuse toujours (409, `src/app/api/projects/[id]/campaigns/v2/route.ts:121`). Chemin cassé (bug probable, à vérifier) | non | 2 | Réparer (passer par `campaign_quote`) avant toute migration ; pas « obsolète » car le code est atteignable | Appel réel → 409 attendu aujourd'hui |
| Publicités › Éditeur visuel | Versions enregistrées + « Restaurer » — `ad-editor/ad-editor.tsx:394-398`, `:487`, `:664` | `POST /ads/docs/[docKey] {action:"restore", version}` | non | 3 | Reste | — |
| Publicités › Éditeur visuel | Formats dans l'éditeur (aperçu, « Valider ce format ») — `ad-editor/ad-editor.tsx:405-420`, `:495-502` | `preview_reflow` puis `reflow` | non | 3 | Reste | — |
| Publicités › Éditeur visuel | « Dupliquer » — `ad-editor/ad-editor.tsx:428-432`, `:638` | `POST /ads/docs/[docKey] {action:"duplicate"}` | non | 3 | Reste | — |
| Publicités › Éditeur visuel | Exporter PNG / JPEG / document JSON — `ad-editor/ad-editor.tsx:384-389`, `:511-513` | Enregistre d'abord si besoin, puis `GET /ads/docs/[docKey]?export=png, jpeg ou json` | non | 3 | Reste | Ce qu'on voit = ce qu'on exporte |
| Publicités › Publicité vidéo | Création guidée (`GuidedVideo as="ad"`) + « Montage avancé » (`VideoV2Panel scope="ad"`) — `tab-publicites.tsx:105-111` (composants hors périmètre détaillé) | `/api/projects/[id]/creative/video`, `/videos/v2` — à inventorier par le lot Vidéos | partiel — opérations `videos.*` côté Vidéos | 2 | Reste ; traité avec l'inventaire Vidéos | Vidéos publicitaires jamais réutilisées en organique |
| Publicités › Campagnes | Liste, « Nouvelle campagne » (Dominer), « Ouvrir », « Supprimer » (confirmation), « Export pour le gestionnaire de publicités » (CSV) — `ad-campaigns.tsx:66-182` | `GET` / `DELETE /api/projects/[id]/campaigns` ; CSV fabriqué dans le navigateur | non (SYNA ne supprime rien ; `ads.launch` `adapter:'none'`) | 3 | Reste | Les publications liées sont gardées à la suppression |
| Publicités › Campagnes | Éditeur de campagne : nom, objectif, réseaux, audience, indicateurs, langue, annonces (angle, accroche, texte, titre, description, bouton, créations), « Ajouter / Retirer une annonce », « Enregistrer », « Exporter (CSV) » — `ad-campaigns.tsx:186-240` | `POST /api/projects/[id]/campaigns {angleId, id, name, objective, networks, brief, plan}` | partiel — `campaign.draft` enregistre un nouveau brouillon (simulé, drapeau fermé), mais ne modifie pas une campagne existante | 3 | Reste (édition manuelle) | — |
| Publicités › Campagnes | « Proposer les annonces dans cette langue » — `ad-campaigns.tsx:132-147`, `:205` | `POST /api/projects/[id]/campaigns/draft {angleId, campaignId, count, objective, audience, networks}` (IA si active, sinon version locale simplifiée) ; renvoie annonces + plan de test | partiel — `campaign.draft` (texte rédigé par la réponse SYNA, médias acquis) ; plan de test non prouvé côté SYNA (à vérifier) ; pas de version locale gratuite | 2 | Reste ; SYNA peut proposer, l'éditeur garde la relecture | Mêmes champs, même langue, même plan de test, faits confirmés seulement |
| Publicités › Visuels publicitaires | Bibliothèque filtrée (tous, images, vidéos), visionneuse, « Télécharger » — `tab-publicites.tsx:196-236` | `GET files?role=ad,video` ; `AssetViewer` | non | 3 | Reste | Séparation publicité / organique (`isAdVisual`) |

### Obsolète prouvé

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Équivalent SYNA (oui/partiel/non + preuve) | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Publications (ancien) | Ancien éditeur `PostEditor` (Enregistrer, Valider et programmer, Publier maintenant, Annuler, Supprimer, régénérer) — `post-editor.tsx:39-173` | `PATCH` / `POST` / `DELETE /api/posts/[pid]` (ancienne route qui refuse les publications V2 : `refuseV2`, 409) ; `GET /api/connections` | non | 4 | Retirer le **composant** seulement. Preuve : aucun import de `PostEditor` dans `src`, `tests`, `scripts` (seul `NETWORKS` est importé, par `ad-campaigns.tsx:10`) | Garder `NETWORKS` ; garder la route `/api/posts/[pid]` (encore testée : `tests/audit-backend.test.ts:455`, `tests/migration-v2.test.ts:131`) |

---

### Tableau 2 — Le panneau SYNA

Schéma commun de toutes les cartes d'outil (lu dans les 22 composants) : 1) **proposition** née d'une réponse SYNA (« Action
proposée… », « Proposition … à relire ») ; 2) **devis** (« Voir le devis… » : estimation et maximum en % du budget IA,
heure de validité, demande exacte, limites) ; 3) **accord** séparé (« Confirmer… », « J'accepte ce plafond… ») avec un
`requestId` unique ; 4) **reçu** avec états : en cours (file, en cours, en pause, bloqué, % d'avancement, suivi toutes
les 1,5 s), « enregistré, à relire », échec (cause enregistrée, « Résultat incertain chez … » sans relance), « non
prouvé », « interrompu », « historique conservé » quand le contexte a changé ; 5) **reprise** : « Actualiser sans
relancer », « Retrouver sans nouvel appel », réemploi à 0 %, lien vers l'écran natif, téléchargement. **Aucune route
`/api/studio-agent/**` n'accepte d'action d'annulation d'une tâche en cours** (recherche du mot « cancel » : aucun
résultat).

| Espace | Contrôle actuel + chemin code | Action métier/API réellement déclenchée | Ce que SYNA affiche déjà / ce qui manque (architecture cible) | Groupe | Action UX proposée | Risque / test de parité |
|---|---|---|---|---|---|---|
| Studio (tous onglets) | Montage : bouton flottant « SYNA » + panneau latéral 440 px — `shell.tsx:17`, `:448`, `:530` (décale le contenu de 416 px sur grand écran), `:622` ; `ConversationDock` `conversation-panel.tsx:146-157` ; activé par `AgentUiProvider enabled={conversationUiEnabled()}` (`src/app/studio/[projectId]/layout.tsx:14`, drapeaux `LOT_A` + `AI` + `UI`) | Aucun appel au montage ; panneau fermé à chaque changement de projet | Affiche : un tiroir, fermé par défaut ; sur téléphone, fenêtre plein écran qui cache l'espace de travail. Manque : espace de travail contextuel (le panneau ne sait pas montrer l'écran et la conversation côte à côte sur téléphone) | 3 | Garder le tiroir ; prévoir un mode « espace de travail » | Échap, focus piégé sur téléphone, contenu non masqué sur ordinateur |
| SYNA | Historique sauvegardé + « Échanges précédents » — `conversation-panel.tsx:66-108` | `GET /api/projects/[id]/conversation` ; `GET /api/studio-agent/conversations/[cid]?before=` | Une seule conversation persistante par projet (`agent_conversations.project_id UNIQUE`, `src/lib/db.ts:205`) : **déjà conforme** à la cible | 3 | Garder | Pagination sans doublon (filtre par révision) |
| SYNA | Zone de saisie « Enregistrer » — `conversation-panel.tsx:111-119` | `POST /api/studio-agent/conversations/[cid] {action:"message", text, context}` | Le message est seulement enregistré ; avis : « Demandez le devis pour une réponse de SYNA ». Manque : une réponse sans deux clics de plus à chaque tour | 2 | Proposer un accord de budget par session ou un plafond accepté une fois (à décider par le propriétaire) | Aucune réponse payante sans accord |
| SYNA | « Voir le devis de la réponse de SYNA » + confirmation — `conversation-panel.tsx:121-122` | `POST /api/studio-agent/conversations/[cid]/intelligence {action:"quote"}` puis `{action:"confirm", quoteId}` | Affiche : estimation et maximum en %, validité, « Un seul appel ; aucune création ni publication » ; en cours (suivi 1,5 s, « vous pouvez fermer ») ; échec | 3 | Garder | Même maximum retenu, aucun doublon (`requestId`) |
| SYNA | Questions guidées (choix, texte libre, « Je ne sais pas encore », « Pourquoi cette question ? », « Revoir / corriger ») — `conversation-panel.tsx:33-50` | `POST cid {action: answer-ai, explain, back-ai}` | Affiche la question, la réponse retenue et un retour arrière | 3 | Garder | — |
| SYNA | « Propositions à vérifier » + « Accepter ces modifications » — `conversation-panel.tsx` (bloc `proposalId`) | `POST cid {action:"accept-ai-changes", proposalId}` → opération `brief.update` | Affiche chaque champ, la valeur et la citation source | 3 | Garder | Seulement si la fiche est encore modifiable |
| SYNA | « Votre fiche commune et ses corrections » (activité, champs, inconnues, version) — `conversation-panel.tsx` (bloc `details`) | `POST cid {action:"answer"}` / `{action:"edit", field, value}` → `brief.update` | Affiche « Conversation vN · fiche vM · aucune approbation d'étape implicite » | 3 | Garder | Coordonnées jamais effacées |
| SYNA | Contexte actif : « Votre prochain message concerne cet écran », repère désigné, « Reprendre le repère sauvegardé » — `conversation-panel.tsx:64-66`, `:100-104` ; cibles dans `active-context-contract.ts:4-12` | Envoyé avec le message (`context:{tab, target}`) ; drapeau `STUDIO_CONVERSATION_CONTEXT` | Cibles possibles : produit, variante, page ou section du thème, média. **Aucune cible pour une publication, une campagne, un créneau du calendrier ou un document publicitaire** ; aucun écran de ce périmètre n'appelle `setFocus` | 2 | Ajouter ces cibles et un bouton « Demander à SYNA » sur chaque objet | La cible porte sa version ; refus si la version a changé |
| SYNA (avant projet) | Brouillon de démarrage, « Reprendre », « Créer le projet avec cette fiche » + consentement — `conversation-panel.tsx:63`, `:124-133` ; `home.tsx:508` | `GET/POST /api/studio-agent/draft` ; `POST /api/projects?subscription=` ; `POST /api/projects/[pid]/conversation {draftId, draftRevision}` | Affiche le rattachement définitif à l'abonnement ; retrouve le projet si la réponse a été perdue | 3 | Garder | Un seul projet par abonnement |
| SYNA | « Lien / photo » — `conversation-panel.tsx:119-120` | Aucun envoi : texte d'aide seulement | Manque : photo jointe (« leur analyse n'est pas raccordée à ce dialogue ») | 2 | À raccorder (lien avec la bibliothèque) | Aucune personne générée sans photo fournie |
| SYNA | « État du Studio et capacités de SYNA » — `conversation-studio-help.tsx` | Données `v.studioHelp` (lues avec la conversation) ; « Actualiser sans appel IA » | Affiche forfait, budget, dernières tâches et la liste partielle des opérations (raccordée, désactivée, pas encore raccordée). Manque : récapitulatif du coût réellement dépensé dans la conversation | 3 | Garder ; en faire le volet « Détails » | Ne présente jamais une opération non raccordée comme disponible |
| SYNA | Analyse de l'offre + correction + « Outils non raccordés à SYNA » — `conversation-tools.tsx` | `/api/studio-agent/conversations/[cid]/tools` (GET, POST quote/confirm) → `offer.analyse` | Cycle complet (proposition, devis, accord, reçu, échec incertain, correction limitée à deux analyses) | 3 | Garder | — |
| SYNA | Choix stratégiques (comparer, retenir / écarter, annuler, accepter) — `conversation-strategy-choices.tsx` | `POST cid {action: open-strategy-comparison, compare-strategy-options, decide-strategy-option, undo-strategy-preference, accept-strategy-preference}` → `strategy.compare`, `strategy.preference` | Gratuit, annulable, versions des comparaisons | 3 | Garder | — |
| SYNA | Recherche — `conversation-research-tools.tsx` | `/conversations/[cid]/research` → `research.generate` | Cycle complet, sources, « SOURCE FICTIVE DE TEST » en simulation | 3 | Garder | — |
| SYNA | Marque + choix de l'identité textuelle — `conversation-brand-tools.tsx`, `conversation-brand-choice.tsx` | `/conversations/[cid]/brand` (quote, confirm, recover) ; `/brand-review` (devis 0 %, confirm) → `brand.generate`, `brand.confirm`, `brand.correct` | Cycle complet, « Reprendre l'enregistrement acquis — 0 % » | 3 | Garder | — |
| SYNA | Logos + choix et validation — `conversation-logo-tools.tsx`, `conversation-logo-selection.tsx` | `/logos` ; `/logo-selection` → `logo.generate`, `logo.replace` | Essais non validés conservés et signalés | 3 | Garder | — |
| SYNA | Images (désigner, compositions, retouche) — `conversation-image-tools.tsx` | `/images` → `images.generate`, `images.correct` | Cycle complet, essais non livrables conservés | 3 | Garder | — |
| SYNA | Catalogue (brouillon, restauration) — `conversation-catalogue-tools.tsx` | `/catalogue` (quote, confirm, quote-undo) → `catalogue.read/create/update/stock` | Avant / après, restauration | 3 | Garder | — |
| SYNA | Montage vidéo + aperçu avant / après — `conversation-video-tools.tsx`, `conversation-video-preview.tsx` | `/videos` → `videos.motion`, `videos.edit`, `videos.restore` | Montage local 0 %, restauration | 3 | Garder | — |
| SYNA | Clips IA — `conversation-generated-videos.tsx` | `/generated-videos` → `videos.generate` | Scénario, plafond, reçu | 3 | Garder | — |
| SYNA | Correction vocale — `conversation-voice-tools.tsx` | `/video-voices` → `videos.voice` | Phrase par phrase, avant / après | 3 | Garder | — |
| SYNA | Reprise d'un plan — `conversation-clip-tools.tsx` | `/video-clips` → `videos.retake` | Une reprise payante par vidéo | 3 | Garder | — |
| SYNA › Diffusion | Brouillons sociaux, calendrier de brouillons, brouillon de campagne : « Voir les brouillons et la préparation », « Confirmer la préparation sans fournisseur », reçus, « Ouvrir ce brouillon dans Publications », « Télécharger la préparation JSON » — `conversation-social-tools.tsx:10-37` | `/conversations/[cid]/social-drafts` (GET, `?receipt=` en JSON ; POST quote, confirm) → `social.draft`, `social.plan`, `campaign.draft` ; envoie `studio:social-changed` / `studio:campaigns-changed` | Affiche : 0 % du budget, texte et médias de chaque brouillon, créneaux, « date préparée, non programmée », version native changée. Manque : approuver, programmer, modifier une publication existante, déplacer dans le calendrier, vidéo, LinkedIn, jours exclus | 2 | Garder ; compléter les manques listés en (b) | Même brouillon qu'avec le formulaire natif, rien d'approuvé ni de programmé |
| SYNA › Diffusion | Visuel d'un brouillon social : « Voir le devis de ce visuel », « Accepter ce plafond… », « Réemployer ce visuel sans IA » — `conversation-social-production.tsx` | `/conversations/[cid]/social-production` (quote, reuse-quote, confirm) → `social.generate` | Affiche plafond, demande exacte, limites, reçu, téléchargement. Manque : brouillons créés dans l'écran Publications, carrousel, vidéo, lot | 2 | Étendre aux brouillons natifs | Même devis que `estimate` du natif pour la même publication |
| SYNA › Diffusion | Visuel d'annonce : choix du format, « Voir le devis du visuel de cette annonce », réemploi — `conversation-campaign-visuals.tsx` | `/conversations/[cid]/campaign-visuals` (quote, reuse-quote, confirm) → `ads.create` | Affiche plafond, texte de l'annonce, reçu. Manque : campagnes créées dans l'écran Publicités, document à calques modifiable | 2 | Étendre aux campagnes natives | Même devis que `campaign_quote` pour une annonce |
| SYNA | Rédaction, retouche de passages, métadonnées, article de blog — `conversation-content-tools.tsx` | `/content` → `copy.generate`, `copy.edit`, `seo.update`, `blog.generate` | Cycle complet, « Modifier gratuitement dans l'éditeur, sans IA » | 3 | Garder | — |
| SYNA | Retouches et composition du Site + annulation — `conversation-theme-tools.tsx` | `/theme-tools` (quote, confirm, quote-undo) → `theme.exact-edit`, `theme.compose`, `theme.original`, `theme.undo` | Avant / après, annulation avec reçu | 3 | Garder | — |
| SYNA | Export du Site — `conversation-export-tools.tsx` | `/exports` → `theme.export` | Fichier prouvé ou « non livré » | 3 | Garder | — |
| SYNA | Captures du rendu — `conversation-render-tools.tsx` | `/renders` → `theme.capture` | Mesures locales, aucun jugement esthétique | 3 | Garder | — |

---

### (a) Chats et zones de saisie IA concurrentes de SYNA dans ce périmètre

1. « Demander en une phrase » — `social-studio.tsx:394-398` (`action:"ask"`, local, gratuit).
2. « Modifier le calendrier en une phrase » — `social-studio.tsx:691-712` (`action:"edit"`, local puis IA devisée, peut supprimer
   des publications après confirmation). C'est le vrai concurrent : il fait ce que SYNA ne sait pas faire (`calendar.update`
   absent).
3. « Demander une retouche » de l'éditeur publicitaire — `ad-editor/ad-editor.tsx:465` (local, sinon `ai_edit` ; le même
   champ sert à « Modifier la photo avec l'IA », `:468`).
4. Champs de consigne libre pour l'IA : idée du `SubjectPicker` dans « Publication image / vidéo » (`social-create.tsx:142-147`)
   et dans « Publicité conçue par l'IA » (`ad-editor/ai-ad-creator.tsx`) ; offre réelle et audience de « Créer des publicités »
   (`ad-editor/ad-creatives.tsx:553` et suivantes).
5. Bouton IA sans saisie libre : « Proposer les annonces dans cette langue » (`ad-campaigns.tsx:205`).
6. Hors périmètre détaillé mais monté ici : la création guidée vidéo (`GuidedVideo`, publications et publicités).

### (b) Capacités SYNA absentes ou partielles constatées

- **Aucune ligne du groupe 1** dans la diffusion : aucune opération SYNA ne couvre exactement une action d'écran.
- Approuver, programmer, déprogrammer, publier, supprimer une publication : absent (voulu ; `social.publish`
  et `calendar.update` en `adapter:'none'`).
- Modifier le calendrier (déplacer, vider une période, décaler) : absent, alors que l'écran a déjà son propre chat.
- `social.plan` : pas de jours de semaine, jours exclus, répartition des formats, thèmes prioritaires, compte par réseau,
  LinkedIn ; 31 jours au plus.
- `social.draft` : 5 brouillons au plus, pas de vidéo, pas de LinkedIn, pas d'avis réel sourcé ni de structure éditoriale
  (FAQ, checklist, tutoriel).
- `social.generate` et `ads.create` : seulement sur les brouillons nés dans SYNA, un visuel à la fois ; rien pour une
  publication ou une campagne créée dans les écrans ; pas de « refaire le visuel », pas de lot.
- Absents : pilote automatique, automatisations, ensemble initial (10 + 10), correction de texte d'un visuel IA, création
  libre de publicité (`ai_create`), lot de publicités (`ads.v2`), document publicitaire à calques (retouche, formats,
  versions), modification ou suppression d'une campagne, statistiques.
- Pas d'annulation d'une tâche en cours depuis SYNA.
- Chaque réponse de SYNA demande un devis et un clic de plus ; un message seul n'obtient pas de réponse.
- Cartes d'outil empilées dans un ordre fixe (`conversation-panel.tsx`, bloc des `…Execution?.enabled`), non filtrées selon
  l'onglet : pas encore d'espace de travail contextuel.
- Contexte actif sans cible publication, campagne, créneau ou document publicitaire.
- Pas de récapitulatif du coût réellement dépensé dans la conversation (chaque carte montre seulement son propre devis).
- Photos jointes non raccordées.
- Tout est derrière des drapeaux fermés et n'a été testé qu'avec un fournisseur simulé.

### (c) Dépendances à ne pas casser

- **Droits du forfait** : `planAllowsAds` (`tab-publicites.tsx:43`), `data.plan === "dominer"` (`ad-campaigns.tsx:149`,
  `:158`, `:205`), `access` de `campaigns/v2` (`ai-ad-creator.tsx`), `assertAdvertising` (route `campaigns/v2`,
  `campaign-visual-execution.ts`), `requirePlan` (programmer, automatisations, écriture SYNA), `assertCalendarDays` et
  `assertPerDayRequest` (plan, `create_one`, SYNA), `limits.perDay` (boutons grisés), `canPublish`, `autopublish` du
  pilote, verrou des dix publicités initiales.
- **IA active** : `aiActiveFor` (`create_one`, `estimate`, `ai_create`, `generate`) et `publicationReadiness`.
- **Devis et accord** : prix en % du budget (`useBudgetPct`), `approvedEstimateMicro` exigé par le serveur (`create_one`,
  `produce` payant, `ai_create`, `generate`), plafonds `maxCostPct` / `maxCostEur` / `capPct`, `approvedPct` du chat du
  calendrier ; l'éditeur publicitaire utilise un autre système, `useCostConfirm` (`cost-confirm.tsx`), à ne pas
  confondre ; devis SYNA avec `maximumPct` et heure d'expiration.
- **Idempotence** : `operationId` (`ai_create`, `generate`), `requestId` (SYNA).
- **Versions et historique** : approbation liée à la version (`approvedHash`, nouvelle approbation après modification),
  versions et restauration des documents publicitaires, brouillon local de l'éditeur, journal du pilote, historique des
  envois, reçus SYNA qui gardent la préparation d'origine (`isCurrent`), contrôles `revision` / `projectRevision`.
- **Événements qui relient SYNA et les écrans** : `studio:social-changed`, `studio:campaigns-changed`,
  `studio:videos-changed`, `studio:images-changed`, `ecs:ad-creations-ready`.
- **Tâches de fond** : `social.v2.produce`, `social.initial`, `image.ai_post`, `ads.v2`, `image.v2`, `image.edit`.
- **Règles du produit** : publicité ≠ publication organique (`isAdVisual`) ; moteur local d'abord (`ask`, `edit`,
  `localAdEdit`) ; éditeur `SocialPostEditor` partagé avec SYNA.

### (d) Nombre de lignes par groupe

| Partie | Groupe 1 | Groupe 2 | Groupe 3 | Groupe 4 | Total |
|---|---|---|---|---|---|
| Diffusion — Publications et Calendrier | 0 | 10 | 24 | 0 | 34 |
| Diffusion — Publicités | 0 | 9 | 15 | 0 | 24 |
| Diffusion — Obsolète | 0 | 0 | 0 | 1 | 1 |
| Panneau SYNA | 0 | 6 | 23 | 0 | 29 |
| **Total** | **0** | **25** | **62** | **1** | **88** |

Vérifié réellement : lecture du code et des routes citées, recherches par mots dans `src`, `tests`, `scripts`. Non vérifié :
aucun écran ouvert, aucun test lancé ; les points marqués « à vérifier » (transmission de l'angle à SYNA, plan de test de
`campaign.draft`, refus 409 du chemin « nouvelle version créative ») n'ont pas été exécutés.

---

