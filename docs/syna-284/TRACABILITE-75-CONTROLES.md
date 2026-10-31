# Traçabilité des 75 contrôles insuffisamment raccordés

Source figée : PR #283, `1f38ec565a7462e2da1a2b506586131e15ba72be`, `02-INVENTAIRE.md`. Chaque contrôle a un seul chantier principal. Les dépendances ne sont pas de nouvelles fonctions.

| Chantier | Contrôles source |
|---|---:|
| T01 — Entrée, pièces jointes, reprise et conversation | 6 |
| T02 — Contexte, modes et sélection | 1 |
| T03 — Retouches gratuites et site | 7 |
| T04 — Préparation, workflow et stratégie | 6 |
| T05 — Marque, logos et propagation | 8 |
| T06 — Images, slots et texte visuel | 9 |
| T07 — Vidéo, scénarios et reprises | 12 |
| T08 — Textes, SEO et blog | 5 |
| T09 — Publication, calendrier et production sociale | 8 |
| T10 — Publicité et document à calques | 8 |
| T11 — Lot initial et autorisation | 3 |
| T12 — Fichiers et prompts | 2 |

Total : **75 contrôles → 12 chantiers**. Les services et actions sensibles sont aussi à traiter : ils figurent souvent dans les 259 commandes manuelles et ne sont donc pas limités à ces 75 lignes.

Doublons explicites : description IA (59/533), impact marque (120/505), correction texte visuel (350/524/687), lot initial (113/686), parcours vidéo répété sur Publications/Publicités. Les doubles entrées ne doivent pas créer deux moteurs.

## T01 — Entrée, pièces jointes, reprise et conversation

- [Ligne 56](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L56) : Formulaire manuel de départ `NewProject` (boutique/services, type de boutique, langue, nom, zone, adresse, horaires, téléphone, e-mail, prestations `ServicesEditor`, modes de contact, lien, « Tout ce que vous voulez obtenir », cible, nom produit/marque/prix) + « Préparer mon projet » — `home.tsx:25-333`
- [Ligne 57](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L57) : « J'ai déjà mon site et mon logo » : adresse, case « ce site m'appartient », logo, langue — `home.tsx:186, 362-396`
- [Ligne 59](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L59) : « Rédiger ma description avec l'IA » / « Une autre version » / « Revenir à mes mots » — `ai-description.tsx:26-55` (utilisé `home.tsx:249, 292`)
- [Ligne 533](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L533) : « Rédiger ma description avec l'IA / Une autre version / Revenir à mes mots » — `ai-description.tsx:14-57`, utilisé par `home.tsx`
- [Ligne 743](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L743) : Zone de saisie « Enregistrer » — `conversation-panel.tsx:111-119`
- [Ligne 750](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L750) : « Lien / photo » — `conversation-panel.tsx:119-120`

## T02 — Contexte, modes et sélection

- [Ligne 748](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L748) : Contexte actif : « Votre prochain message concerne cet écran », repère désigné, « Reprendre le repère sauvegardé » — `conversation-panel.tsx:64-66`, `:100-104` ; cibles dans `active-context-contract.ts:4-12`

## T03 — Retouches gratuites et site

- [Ligne 136](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L136) : « Enregistrer et mettre à jour le site » — `tab-activite.tsx:63-75, 147`
- [Ligne 139](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L139) : « Faire créer un nouveau site par le studio » → « Oui, créer un nouveau site » — `existing-site.tsx:64-80, 149-161`
- [Ligne 236](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L236) : **Discussion de retouche de la boutique** (zone « Votre demande » + Envoyer), `tab-boutique.tsx:557-571`, envoi `send()` :312-330
- [Ligne 237](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L237) : **Suggestions de demandes** (puces), `tab-boutique.tsx:480` (listes `SUGGESTIONS` :99 / `SUGGESTIONS_SERVICES` :112)
- [Ligne 242](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L242) : **Mention « IA non connectée : commandes simples uniquement »**, `tab-boutique.tsx:574`
- [Ligne 253](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L253) : **Thème entièrement sur mesure** (`CustomThemeButton`), `tab-boutique.tsx:678`, `custom-theme.tsx:37-141`
- [Ligne 275](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L275) : **« Générer la section avec l'IA »** (texte libre, forfait Dominer), `section-library.tsx:127, 275-285` ; `generateSection` `tab-boutique.tsx:352-366` avec `cost.confirm("theme")`

## T04 — Préparation, workflow et stratégie

- [Ligne 101](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L101) : « Préparer les contenus et le plan » — `prep.tsx:1119-1128`
- [Ligne 102](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L102) : « Corriger seulement cette page » (avec défaut à corriger) — `prep.tsx:1164-1176`
- [Ligne 109](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L109) : Champ « Défaut précis à corriger pour un nouvel essai » (étapes 2 à 5) — `prep.tsx:1292-1314`
- [Ligne 119](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L119) : « Que voulez-vous obtenir ? » (demande libre), « Préparer le plan et le devis », « Utiliser l'exemple », devis par module, « Plafond (% du budget IA) », « Accepter et lancer », « Annuler », « Réessayer », raccourcis « Modifier à la main (gratuit) » — `workflow-panel.tsx:69-300`
- [Ligne 132](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L132) : « Réanalyser tout le projet » — `tab-produit.tsx:259-270`, `tab-activite.tsx:168-186`
- [Ligne 515](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L515) : « Réviser dans le devis groupé » + « Obtenir un devis pour toutes ces révisions » + « Confirmer ce devis » + « Confirmer une reprise » — `marketing-strategy.tsx:32-33`, `:73`, `:80-88`

## T05 — Marque, logos et propagation

- [Ligne 120](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L120) : « Votre identité a changé » : cases, « Mettre aussi à jour mes créations modifiées à la main », « Mettre à jour la sélection · x % » — `workflow-panel.tsx:302-361`
- [Ligne 486](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L486) : « Nouvelle proposition » → fenêtre « Orientation souhaitée (facultatif) » + langue + « Lancer » — `tab-marque.tsx:151`, `:332-351`
- [Ligne 491](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L491) : Panneau Logo V2 : liste « Style du logo » + « Créer les directions / Nouvelles directions / Reprendre la série incomplète » (fenêtre `window.confirm` avec devis, `window.prompt` de correction pour une reprise) — `logo-v2-panel.tsx:141-157`, `:226-233`
- [Ligne 493](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L493) : « Choisir ce logo » sur une proposition, sur le « Meilleur logo obtenu », sur une « Version du studio », ou « choisir quand même » un logo écarté — `logo-v2-panel.tsx:192`, `:212`, `:248-275`
- [Ligne 495](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L495) : « Nouvelle version » d'un logo (prix dans un `window.prompt` + remarques) — `logo-v2-panel.tsx:158-166`, `:194`, `:213`
- [Ligne 499](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L499) : Ancien bloc « Trois propositions » : « Choisir » et **« Recréer les propositions »** — `tab-marque.tsx:244-262`
- [Ligne 504](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L504) : « Refaire la ligne éditoriale » — `tab-marque.tsx:502`
- [Ligne 505](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L505) : Carte « Votre identité a changé » (cases, « mettre aussi à jour mes créations modifiées », bouton de mise à jour) — `workflow-panel.tsx:302-360`, rendu `tab-marque.tsx:144`

## T06 — Images, slots et texte visuel

- [Ligne 105](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L105) : « Préparer les médias manquants (avec devis) » — `prep.tsx:1255`
- [Ligne 106](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L106) : Emplacement : « Créer ce visuel par l'IA » / « Chercher et contrôler sur Pixabay » / « Contrôler et affecter la vidéo obtenue » — `prep.tsx:1502-1508`
- [Ligne 350](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L350) : **Correction des textes d'un visuel** (`CopyCorrection`, `CopyFailureHistory`) : « Enregistrer gratuitement », reprise avec devis, `copy-correction.tsx:9-44` ; utilisé par `social-studio.tsx` et `tab-images.tsx`, **pas par le Site**
- [Ligne 521](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L521) : Fenêtre « Créer une image » (sujet, type, format, nombre 1-2, accord personnes, « Créer · prix ») ; ouverte aussi depuis le thème via `?themeSlot` — `tab-images.tsx:239`, `:286`, `:395-453`
- [Ligne 524](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L524) : « Corriger le texte acquis » (titre, sous-ligne, appel) : « Enregistrer gratuitement » / « Reprendre » — `copy-correction.tsx:9-45`, rendu `tab-images.tsx:276`
- [Ligne 528](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L528) : Visuel fait par l'IA : choix du format, « Aperçu avec marges (gratuit) », champ « Modification souhaitée », « Nouvelle version par l'IA · prix » (pas de fenêtre de confirmation : prix sur le bouton) — `asset-viewer.tsx:398-431`, `ai-image-actions.tsx:53-177`
- [Ligne 534](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L534) : « Avec quel produit / service travailler ? » + « Décrivez le visuel / la vidéo voulu(e) » + « Idées de prompts » — `subject-picker.tsx:24-80`
- [Ligne 687](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L687) : Historique des corrections de texte d'un visuel IA (`CopyFailureHistory`, `CopyCorrection`, composant `copy-correction.tsx`) — monté `social-studio.tsx:179` et `ad-editor/ai-ad-creator.tsx:152`
- [Ligne 698](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L698) : Galerie des publicités IA : « PNG » + « Modifier / autre format » (`AiImageActions`) — `ad-editor/ai-ad-creator.tsx:243-282`, `ai-image-actions.tsx:25-100`

## T07 — Vidéo, scénarios et reprises

- [Ligne 537](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L537) : Fenêtre « Créer un plan avec l'IA » (image de départ, mouvement, format, « Créer le plan · prix ») ; ouverte aussi via `?themeSlot` ; verrou forfait Développer/Dominer — `tab-videos.tsx:35`, `:42`, `:84`, `:181-234`
- [Ligne 539](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L539) : `VideoV2Panel` : Type, Diffusion, « Votre demande », interrupteur « Autoriser des plans filmés par l'IA », « Préparer le plan et l'estimation » — `video-v2-panel.tsx:84-100` (monté par `video-gallery.tsx:40` et `tab-publicites.tsx`)
- [Ligne 540](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L540) : « J'accepte (coût probable …) : produire » / « Produire (montage local, gratuit) » — `video-v2-panel.tsx:63-76`, `:108`
- [Ligne 547](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L547) : Vidéo guidée : « Comment créer les clips ? » (directs / référence / par étapes) + photo par scène — `guided-video.tsx:118`, `:132-133`
- [Ligne 548](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L548) : Sujet + demande (`SubjectPicker`), Format, Durée totale, Nombre de scènes, Musique ; devis recalculé à chaque réglage ; brouillon gardé dans le navigateur — `guided-video.tsx:64-91`, `:135-173`
- [Ligne 550](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L550) : « Préparer le scénario (· rédaction prix) » — `guided-video.tsx:103`, `:191-194`
- [Ligne 551](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L551) : Scénario : « Une correction simple ? » + « Appliquer au scénario (gratuit) » + édition par scène (ce que montre le plan, mouvement, titre, voix, photo) — `guided-video.tsx:185`
- [Ligne 552](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L552) : « Valider et créer la vidéo · prix » (+ plafond affiché) — `guided-video.tsx:99-112`, `:186-194`
- [Ligne 554](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L554) : Vidéo incomplète : « Reprendre le montage conservé (gratuit) » + « Scène à reprendre » + « Reprendre cette scène uniquement · prix » (pas de fenêtre séparée) — `guided-video.tsx:122`
- [Ligne 665](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L665) : Création guidée vidéo (`GuidedVideo as="post"`) — monté `social-studio.tsx:192` (composant `guided-video.tsx`, hors périmètre détaillé)
- [Ligne 666](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L666) : Formulaire « Créer une publication vidéo » (montage gratuit / plans filmés par l'IA) — `social-create.tsx:34-73` (`VideoChoice`) et `:76`
- [Ligne 713](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L713) : Création guidée (`GuidedVideo as="ad"`) + « Montage avancé » (`VideoV2Panel scope="ad"`) — `tab-publicites.tsx:105-111` (composants hors périmètre détaillé)

## T08 — Textes, SEO et blog

- [Ligne 286](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L286) : **« Demander une retouche »** (blocs ciblés), `content-panel.tsx:343, 461-468`
- [Ligne 290](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L290) : **« Écrire un article »** (modale : sujet proposé, sujet libre, consigne, « Laisser l'IA choisir »), `tab-blog.tsx:166, 265-352` avec `confirm("blog")`
- [Ligne 291](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L291) : **« Autres idées »** (sujets proposés), `tab-blog.tsx:280, 322`
- [Ligne 292](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L292) : **Réécrire l'article** (consigne), `tab-blog.tsx:459-470` avec `confirm("blog")`
- [Ligne 297](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L297) : **Blog V2 : stratégie, sujets et brouillons** (2e `ContentPanel` `blog_article`), `tab-blog.tsx:215, 257`

## T09 — Publication, calendrier et production sociale

- [Ligne 664](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L664) : Formulaire « Créer une publication image » : avec ou sans IA, produit/service + idée libre, réseaux, jour, heure, thème, titre, rôle du contenu (conseil, FAQ, checklist, tutoriel, avis réel avec source et autorisation…), carrousel, prix en % puis « Créer la publication » — `social-create.tsx:76-206`
- [Ligne 668](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L668) : « Publications planifiées sans visuel / sans vidéo » : gratuit « Préparer gratuitement (N) » ou payant « Voir le prix » + plafond en % + « J'accepte et je lance » — `social-create.tsx:209-305`
- [Ligne 669](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L669) : Formulaire : début, fin, fuseau, publications par jour (bloquées au-delà du forfait), horaires, jours, jours exclus, réseaux + compte, « tous les réseaux », répartition des formats, thèmes prioritaires, angle, « Planifier N publications (gratuit) » — `social-studio.tsx:337-470`
- [Ligne 670](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L670) : **Zone de saisie** « Demander en une phrase » + « Préparer (gratuit) » — `social-studio.tsx:394-398`
- [Ligne 676](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L676) : **Chat** « Modifier le calendrier en une phrase » + aperçu à confirmer (suppression, changement, coût IA en % du budget) + « Confirmer » / « Annuler » — `social-studio.tsx:578-603`, `:691-712`
- [Ligne 684](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L684) : « Créer / Refaire le visuel de cette publication » : gratuit, image IA ou publication IA, « Voir le prix », « J'accepte et je lance » — `social-studio.tsx:1050-1103`
- [Ligne 763](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L763) : Brouillons sociaux, calendrier de brouillons, brouillon de campagne : « Voir les brouillons et la préparation », « Confirmer la préparation sans fournisseur », reçus, « Ouvrir ce brouillon dans Publications », « Télécharger la préparation JSON » — `conversation-social-tools.tsx:10-37`
- [Ligne 764](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L764) : Visuel d'un brouillon social : « Voir le devis de ce visuel », « Accepter ce plafond… », « Réemployer ce visuel sans IA » — `conversation-social-production.tsx`

## T10 — Publicité et document à calques

- [Ligne 697](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L697) : « Publicité conçue par l'IA » : angle, produit/service, idée libre, format, prix en %, « Créer la publicité » — `ad-editor/ai-ad-creator.tsx:45-240`
- [Ligne 699](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L699) : « Créer des publicités » : nombre, format, offre réelle, audience, devis, « Créer » — `ad-editor/ad-creatives.tsx:96-237`, `:302-600`
- [Ligne 705](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L705) : **Zone de saisie** « Demander une retouche » + « Appliquer » — `ad-editor/ad-editor.tsx:341-382`, `:465-466`
- [Ligne 706](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L706) : « Modifier la photo avec l'IA » — `ad-editor/ad-editor.tsx:316-335`, `:468`, `:670`
- [Ligne 707](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L707) : « Créer une nouvelle image avec l'IA » (fond) — `ad-editor/ad-editor.tsx:284-312`, `:672`
- [Ligne 708](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L708) : Retouche qui demande « une nouvelle version créative » (confirmation navigateur) — `ad-editor/ad-editor.tsx:355-366`
- [Ligne 716](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L716) : « Proposer les annonces dans cette langue » — `ad-campaigns.tsx:132-147`, `:205`
- [Ligne 765](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L765) : Visuel d'annonce : choix du format, « Voir le devis du visuel de cette annonce », réemploi — `conversation-campaign-visuals.tsx`

## T11 — Lot initial et autorisation

- [Ligne 113](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L113) : « Plus tard : vos créations pour les réseaux » — `InitialCreatives` : « Je confirme le brief… », « Devis global des créations manquantes », accepter le devis — `initial-creatives.tsx:30-56` (aussi dans Publications et Publicités)
- [Ligne 114](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L114) : `InitialAuthorization` : « Voir le devis de démarrage automatique », « J'accepte ce devis… », « Annuler cet accord avant le démarrage » — `initial-authorization.tsx:17-35`
- [Ligne 686](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L686) : Bloc « Vos dix publications initiales » / « Vos dix publicités initiales » : « Je confirme le brief… », « Devis global des créations manquantes », « J'accepte le devis global et lance l'ensemble initial » — `initial-creatives.tsx:10-60`, monté `social-studio.tsx:180` et `tab-publicites.tsx:96`

## T12 — Fichiers et prompts

- [Ligne 556](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L556) : « Ranger les fichiers non classés » — `tab-fichiers.tsx:99`
- [Ligne 561](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/1f38ec565a7462e2da1a2b506586131e15ba72be/docs/syna-2030/02-INVENTAIRE.md#L561) : **« Lancer avec l'IA »** (cibles Marque, Produit, Publications, Publicités) + « Réponse de l'IA » (copier, ouvrir l'onglet) — `tab-prompts.tsx:105-121`, `:219`, `:240-256`

