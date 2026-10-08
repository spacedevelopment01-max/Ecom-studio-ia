# Phase 7A — Video & UGC Engine V2 — rapport

Date : 8 octobre 2026 · Branche : `claude/ecom-studio-ia-platform-8cwl79` · **Non fusionné**. La 7B n'est pas
commencée. Aucun benchmark payant n'a été lancé.

> **Important : tout a été vérifié avec des fournisseurs SIMULÉS.** Les plans « générés » des tests sont des mires
> vidéo, et les relectures de qualité sont simulées. Le montage, l'audio, les sous-titres, les fichiers MP4, les
> versions et les coûts ont, eux, été réellement produits et mesurés. En revanche, la qualité réelle d'une vidéo
> faite par Veo ou Kling n'a pas été vue. Elle sera prouvée en 7B, avec vos clés et votre accord.

## 1. État Git

| Étape | Résultat |
|---|---|
| PR #58 (Phase 6A + éditeur publicitaire) | ouverte, **CI entièrement verte** (Docker ✓, types/tests/thème/build ✓), fusionnée → `4e33fe2` |
| Synchronisation | `main` fusionné dans la branche (`b0de689`), sans écart, sans force-push |
| Phase 7A | développée sur la branche, commit à la fin (voir le message de fin) |

## 2. Audit des anciens moteurs

| Constat | Effet sur la qualité ou le coût | Ce que fait le V2 |
|---|---|---|
| Deux moteurs séparés : `engine/videos.ts` (montage) et `engine/ugc.ts` (UGC), avec chacun son script, son montage et ses sous-titres | Rien de commun, double maintenance | Un seul moteur V2 ; l'UGC est une intention parmi d'autres |
| Un seul plan IA par vidéo ; 8 s payées pour 4 s utilisées | Gaspillage | Durée tournée = la plus courte acceptée qui couvre le plan ; un plan accepté est mémorisé et réutilisé |
| Plan IA converti en ~120 JPEG, puis redessiné | Perte de qualité | Décodage image par image (ffmpeg → RGBA), sans JPEG intermédiaire |
| Scènes figées (13 gabarits) | Montages génériques | Storyboard par projet : sujet, action, cadrage, mouvement, lumière, objectif |
| Pas de voix off ; musique synthétique seulement | — | Pistes voix / musique / effets, atténuation sous la voix, normalisation (la voix synthétique reste à brancher, voir §15) |
| Limite de 60 s, 6 s par plan au plus | Pas de vidéo longue | Multiséquence jusqu'à la limite de la plateforme (ex. 600 s pour YouTube) |
| Contrôle du plan IA seulement, pas de la vidéo entière | Une vidéo médiocre passait | Barrière vidéo à 13 critères ; jamais FINAL sans relecture |
| Aucune vidéo modifiable : changer un texte = tout refaire | Coût et lenteur | Document vidéo éditable, opérations gratuites, versions |
| UGC : un plan raté arrêtait toute la vidéo | Coût | Plan refusé → reprise ciblée, sinon plan local à la place |

Les anciens moteurs restent en place pour l'onglet Vidéos (compatibilité). L'étape « vidéo » des plans passe par le V2.

## 3. Architecture (`src/lib/video-v2/`, ~3 300 lignes)

PROJECT BRAIN (`adInsight`, réutilisé de la 6A) → **intention** (`intent.ts`) → **stratégie** (`strategy.ts`) →
**script** (`script.ts`) → **storyboard** (`storyboard.ts`) → **plans** (`shots.ts`) → **médias** : bibliothèque,
**Image Engine V2** et génération via le **Router V2** (`providers.ts`, `deps.ts`) → **document éditable**
(`doc.ts`, `ops.ts`) → **audio** (`audio.ts`) → **rendu** (`render.ts`) → **barrière vidéo** (`quality.ts`) →
**reprises ciblées** et **bibliothèque** (`engine.ts`, `store.ts`).

- Aucun moteur reconstruit :
  - Project Brain, analyse publicitaire, CTA et Router V2 (modèles déclarés) sont réutilisés ;
  - les images passent par l'Image Engine V2, les verdicts par la barrière commune (`decide`, `gateSave`) ;
  - les plafonds et quotas sont ceux de `media-providers` ;
  - les calques sont ceux de l'éditeur publicitaire (`ad-doc`).
- Reprise sans tout recommencer : un plan accepté est mémorisé (table `video_shots`, empreinte du plan, verdict,
  coût) et réutilisé sans coût. La vidéo est versionnée (table `video_documents`).
- Intégration : tâches `video.v2`, `video.v2.render` et `video.v2.clip` ; API `/api/projects/[id]/videos/v2` et
  `/videos/v2/[docKey]` ; intention `CREATE_VIDEO` ; étape « vidéo » des plans de l'orchestrateur.

## 4. Fonctionnalités développées (testées avec des simulations)

- **Intention.** Le moteur reconnaît 12 types : publicité, démonstration, présentation d'entreprise, vidéo de
  métier, film de marque, UGC, vidéo explicative, lancement, contenu social, présentation d'une prestation,
  tutoriel produit, lifestyle.
  - Il en déduit aussi la plateforme, le format et la durée, bornée par la plateforme (« reel de 5 minutes » → 90 s,
    et c'est dit).
  - Une demande « simple » ou « rapide » reste un montage local, sans génération.
  - Un UGC sans génération autorisée devient un contenu social, et c'est dit.
- **Stratégie.**
  - Contenu : objectif, audience, angle, message, accroche, émotion, rythme, style, durée, CTA, format, preuves.
  - Langage visuel choisi selon la catégorie ou le métier (7 langages). Le plâtrier-peintre reçoit un
    « documentaire de chantier » : épaule, lumière naturelle, gestes. Le cosmétique reçoit « premium doux » :
    macro, lumière diffuse, lenteur.
  - Accroches construites uniquement avec la matière du projet.
  - Preuves : uniquement des faits confirmés. Ce qui manque est signalé.
- **Script.**
  - Structure : accroche → développement → démonstration → preuve (seulement si une preuve existe) → conclusion → CTA.
  - Débit naturel (2,4 mots/s) : la voix ne déborde jamais de son plan.
  - Version locale toujours écrite d'abord. Version IA contrôlée, avec une reprise au plus. Sont refusés :
    formules creuses, chiffres, avis, certifications, garanties ou classements non confirmés, affirmations à éviter.
  - Correction issue des essais : les mots-clés de recherche d'images (en anglais, ex. « hands applying cream »)
    ne sont plus jamais dits ni affichés.
- **Storyboard** : 14 champs par plan, dans l'ordre du récit, à la durée visée. La voix d'une section est répartie
  sur ses plans, coupée aux pauses naturelles.
- **Plans.** Le procédé le plus sobre est choisi, dans cet ordre :
  1. vidéo réelle de la bibliothèque ;
  2. packshot du produit réel ;
  3. photo réelle animée ;
  4. typographie, ou animation d'interface (logiciel) ;
  5. génération IA, seulement si elle apporte un geste, un mouvement réel ou un personnage, et si la demande n'est
     pas simple, si elle est autorisée, si un contrôle de vision existe et si le budget le permet ;
  6. Image Engine V2 pour un plan sans visuel.
- **UGC.**
  - Le personnage est synthétique et toujours signalé (« Vidéo générée par IA », mention impossible à retirer).
  - Une fiche personnage stable par projet (visage, tenue, lieu, voix) est répétée à chaque plan, avec la même
    image de départ.
  - Les faux témoignages (« je l'utilise depuis 6 mois », « cliente depuis », « mon avis honnête ») sont repérés
    et réécrits.
- **Montage.**
  - Mouvements de caméra sur les photos (poussée, panoramique, orbite, épaule légère) et transitions (coupe,
    fondu, glissé, zoom, volet).
  - Textes animés (calques), cartes de fin modifiables, mention IA.
  - Un montage répétitif (la même transition presque partout) est détecté.
- **Fidélité produit.**
  - Le produit réel est posé aux pixels d'origine (packshots).
  - Dans un plan généré, un produit transformé est **fatal** : le plan est refusé, jamais monté, jamais réutilisé,
    et un plan local le remplace.

## 5. Document vidéo modifiable (édition gratuite)

- Timeline : plans (image, vidéo, composition en calques, couleur), calques posés par-dessus, transitions, sous-titres
  attachés à leur plan, pistes voix / musique / effets, mention IA.
- Opérations (aucune IA) :
  - modifier un texte, remplacer une image ou une vidéo, couper une séquence, ajuster une durée ;
  - réordonner, ajouter, dupliquer ou supprimer un plan ;
  - changer une transition ;
  - modifier le texte et le style des sous-titres (taille, position, déplacement) ;
  - changer la musique (une musique de bibliothèque sans licence est refusée), changer la voix, régler les volumes ;
  - éditer tout calque avec les opérations de l'éditeur publicitaire.
- Historique (annuler / rétablir, réglages continus fusionnés), versions, restauration, duplication, export JSON / SRT / VTT,
  nouveau rendu local.
- **Pas d'interface de montage dans le studio en 7A** (modèle, opérations et API seulement, comme demandé) : à faire.

## 6. Édition par conversation

| Demande | Résultat |
|---|---|
| « Raccourcis l'introduction. » | local : le plan d'accroche seul, −30 % |
| « Change la musique. » / « coupe la musique » / « plus calme » | local : autre humeur composée par le studio / retirée |
| « Agrandis les sous-titres. » / « en haut » / « remonte-les » | local |
| « Fais une version plus dynamique. » | local : plans −20 %, coupes franches, musique rythmée |
| « Supprime le troisième plan. » | local |
| « Remplace le deuxième plan. » | choix proposé : bibliothèque (gratuit) ou nouveau plan généré (coût affiché, accord) — ce plan seul |
| « Fais une nouvelle version avec l'IA. » | annoncée, jamais lancée sans accord |

## 7. Audio

- Voix : silences de début et de fin retirés, placée sur son plan. Musique : composée par le studio (droits du
  studio) ou piste de la bibliothèque avec licence enregistrée (jamais inventée).
- Atténuation de la musique sous la voix (sidechain). Normalisation à −14 LUFS. Crête vraie contrôlée.
- Mesuré dans les tests : −14 ± 2,5 LUFS, crête < −0,5 dBFS. Une piste muette alors qu'un son est prévu bloque.

## 8. Sous-titres

- Cartons coupés aux mots, de 28 caractères en vertical à 42 en horizontal. Temps de lecture minimum : environ
  15 caractères par seconde, 0,8 s au moins.
- Attachés au plan : couper ou déplacer un plan les garde synchronisés.
- Style modifiable : police, taille, couleur, fond, position, décalage. Zone de sécurité de la plateforme respectée.
- Incrustés dans la vidéo, et exportés en SRT et en VTT dans la bibliothèque.
- Pas de doublon : une composition qui affiche déjà la phrase en grand ne reçoit pas de sous-titre.

## 9. Barrière vidéo V2 (politiques `video_v2`, `video_shot_v2`, version `2026-10-p7a`)

- **Contrôles locaux gratuits.**
  - Durée : visée et fichier rendu.
  - Plans trop courts.
  - Sous-titres : taille, débit, zone de sécurité.
  - Synchronisation voix / sous-titres.
  - Audio : muet, intensité, saturation.
  - Mention IA ; montage répétitif ; affirmations du script.
- **Relecture IA** sur 6 images clés, 13 critères : pertinence, narration, visuel, continuité, fidélité produit,
  marque, réalisme, mouvement, montage, audio, synchronisation, sous-titres, exploitabilité commerciale.
- **Défauts fatals** : produit transformé, mauvais produit, affirmation inventée, fichier corrompu.
- **Défauts bloquants** : personnage incohérent, hors sujet, artefacts majeurs, audio inutilisable, texte
  illisible, désynchronisation, durée, zone de sécurité, mention IA manquante, montage répétitif.
- **Règles de verdict.**
  - Sans relecture : au mieux **PROVISOIRE**. Relecture en panne : jamais validée.
  - Note médiocre (ex. 6,4) : jamais FINAL. Le rendu d'une version modifiée par le client reste PROVISOIRE
    (le client valide).

## 10. Reprises ciblées

- **Sous-titres, audio, montage** : correction gratuite (agrandir et redécouper, baisser la musique, simplifier
  les transitions).
- **Un plan désigné** : ce plan seul est refait, avec le diagnostic dans la consigne. Les autres plans, déjà
  acceptés et payés, sont gardés. Vérifié : une seule génération de plus, pas toute la vidéo.
- Au plus une reprise par plan généré et deux par vidéo. Aucune boucle sans diagnostic.

## 11. Router V2 et fournisseurs

| Modèle | Image → vidéo | Texte → vidéo | Personnages | Son natif | Durées | Tarif (administration) |
|---|---|---|---|---|---|---|
| google veo-3.0-generate-001 | vérifié | **annoncé, non utilisé** | vérifié | vérifié | 8 s | 0,344 €/s |
| google veo-3.0-fast-generate-001 | vérifié | **annoncé, non utilisé** | vérifié | vérifié | 8 s | 0,129 €/s |
| fal kling v2.1 pro (image → vidéo) | vérifié | non | vérifié | non | 5 / 10 s | 0,077 €/s |

- « Vérifié » = capacité réellement appelée par le code du studio. Une capacité seulement annoncée n'est jamais
  utilisée.
- Choix du fournisseur : modèle déclaré au Router V2, clé active, capacités compatibles, tarif connu. La route de
  l'administration passe d'abord, sinon le moins cher.
- Un fournisseur indisponible est remplacé par un autre réellement compatible. Un modèle sans tarif est écarté
  (jamais compté 0 €).

## 12. Coûts

- Estimation de chaque plan payant **avant** exécution, affichée au client : action « plan », 0 €, aucun appel d'IA.
- **Aucune génération sans accord** (`approveGeneration`) ; sans accord, la vidéo est montée localement.
- Plafond réel par tâche (6 € par défaut) : un plan dont l'estimation dépasserait le budget n'est **pas envoyé** et
  un plan local le remplace. Les barrières existantes (forfait, budget IA, plafond de trace) restent actives.
- Aucune génération sans contrôle de vision disponible : un plan non contrôlable n'est jamais payé.
- Réutilisation : un plan FINAL déjà payé n'est jamais repayé (vérifié : une deuxième exécution ne lance aucune
  génération).
- Limites : les coûts vidéo sont **estimés** (tarif à la seconde). La facture du fournisseur, parfois différée,
  fait foi. Un appel parti est payé (dépassement maximal d'environ un plan).

## 13. Benchmarks

- **Simulés (tests)**, 5 scénarios ; vidéos rendues, verdict FINAL avec relecture simulée, durées respectées :

  | Scénario | Intention | Langage visuel | Format | Durée |
  |---|---|---|---|---|
  | A — Sébastien Blanc, plâtrier-peintre | présentation / métier | documentaire de chantier | 16:9 | 30 s |
  | B — cosmétique premium | publicité | premium doux | 9:16 | 15 s |
  | C — high-tech | démonstration | technique précis | 1:1 | 30 s |
  | D — restaurant | contenu court | chaleur culinaire | 9:16 | 15 s |
  | E — SaaS | vidéo explicative | explicatif numérique, animation d'interface, **aucune génération** | 16:9 | 45 s |

  - Diversité vérifiée : accroches et langages tous différents.
  - Aucun traitement propre à un scénario dans le moteur.
- **Réel (7B, préparé)** : `scripts/benchmark-video-v2.ts`.
  - Options : `--check` (gratuit, ne crée rien), `--fixture A–E`, `--project`, `--duration`, `--format`, `--max-cost`,
    `--text`, `--plan-only`.
  - Diagnostic produit : modèles utilisés, plans acceptés et refusés, reprises, coûts par étape, verdict, vidéo.
  - `--check` vérifié dans le conteneur : il affiche les capacités vérifiées et les tarifs, et signale l'absence
    de voix synthétique.

## 14. Tests, TypeScript, build

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | **OK** |
| `npx vitest run` | **842 / 842** (102 fichiers ; 810 avant la 7A, tous conservés) |
| `npm run build` | **OK** |

Nouveaux tests :
- `video-v2.test.ts` (12) : intention, stratégie, script, storyboard, plans, Router V2, édition, conversation,
  sous-titres, barrière, UGC, formats.
- `video-v2-engine.test.ts` (12, avec un vrai rendu ffmpeg) :
  - vidéo complète, accord avant génération, plafond avant envoi, aucune génération sans contrôle ;
  - fidélité produit, continuité UGC, reprise ciblée d'un plan, réutilisation et idempotence, lignée du client
    protégée ;
  - édition gratuite puis nouveau rendu, remplacement d'un seul plan, vidéo longue en 16:9 ;
  - audio mesuré, absence de secret et de consigne stockés.
- `video-v2-bench.test.ts` (6) : les 5 scénarios et la diversité.
- `benchmark-video-v2-check.test.ts` (1).
- `db-migration-race.test.ts` (1). Défaut réel trouvé : deux processus qui ouvrent la même base neuve en même temps
  (site et worker au démarrage, ou tests en parallèle) pouvaient échouer sur « duplicate column name ». Corrigé dans
  `db.ts`. Le test échoue sans la correction et passe avec.

## 15. Limitations (honnêtement)

- **Qualité réelle non prouvée** : aucune vidéo Veo ou Kling n'a été générée ni regardée en 7A.
- **Voix off synthétique absente** : aucun fournisseur de synthèse vocale n'est branché dans le studio (la voix
  Kokoro ne sert qu'aux tutoriels, hors ligne). Le moteur prépare le texte, le timing et la piste ; le message passe
  par les sous-titres. À brancher en 7B.
- **Pas de bibliothèque musicale sous licence** : le modèle exige une licence, mais seule la musique composée par le
  studio est utilisée aujourd'hui.
- **Interface de montage absente** (timeline visuelle dans le studio) : modèle, opérations et API faits.
- **Cohérence des personnages** : uniquement par la même image de départ et la même fiche (aucun fournisseur
  vérifié n'a de « mémoire » de personnage). La rupture n'est détectée que par la relecture IA, et elle n'a pas
  été testée avec de vraies vidéos.
- **Son natif (Veo)** : la voix du personnage UGC dépend du fournisseur. Kling n'a pas de son : la voix passe alors
  par la piste voix et les sous-titres.
- **Texte vers vidéo** : non utilisé (non vérifié). Toute génération part d'une image réelle ou de l'Image Engine V2.
- **Onglet Vidéos** : il utilise encore les anciens moteurs (compatibilité). Seule l'étape « vidéo » des plans est en V2.
- **API vidéo** non testée par un navigateur (aucune interface).
- **Rendu** : dessiné image par image côté serveur (lent pour de longues vidéos en 1080p). Les tests rendent en taille
  réduite.

## 16. Travaux restants et préparation de la 7B

1. **7B, avec vos clés et votre accord** :
   - `--check`, puis `--plan-only` pour voir les estimations, puis les 5 scénarios réels avec un plafond ;
   - regarder les vidéos ;
   - mesurer coûts réels, refus et reprises ;
   - vérifier la continuité réelle des personnages UGC et le son natif de Veo.
2. Brancher une voix off (fournisseur de synthèse vocale ou voix locale), avec un test d'écoute.
3. Interface de montage dans le studio (timeline, plans, textes, sous-titres, musique), sur le modèle de l'éditeur
   publicitaire, puis bascule de l'onglet Vidéos sur le V2.
4. Bibliothèque musicale avec licences réelles (facultatif).
5. Fusion de la 7A : seulement après votre validation et une CI verte.
