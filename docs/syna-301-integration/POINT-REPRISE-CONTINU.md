# Reprise continue #301 — 4 novembre 2026, après les lots #372–#376

Mission INACHEVÉE. Poursuivre sans nouvelle validation sur les lacunes indépendantes. Zéro fournisseur réel/client/activation/envoi/fusion main/déploiement. Claude possède UI/cartes/désignation/verrou commun/recettes indépendantes ; Codex moteurs/contrats/intention/recovery. Ne pas refaire #348.

## Base et livraisons exactes

Reprise opérationnelle depuis Claude #369 ea6f0fd9e206833c16e4dd0798cc3ab2c850435e (tous acquis #364–#370 conservés). Ne PAS refusionner l’ancienne convergence #371/827795d : sa panne retry gratuit est déjà corrigée par Claude (même proposition incertaine conserve Vérifier/Réessayer). Cause #371 démontrée dans job126309082940/run41748993830 : bouton Réessayer gratuit désactivé ; Docker n’était pas la cause.

Pile courte de PR brouillon (chaque base = précédent, première base Claude) :

| PR | SHA livré | Contrat / preuve | CI sur le SHA |
|---|---|---|---|
| #372 image acquise |73c8865a942b556035dd89258a05f6cdfdf2a4c1|12 nouveaux+24 régressions ; build production et recette4/4,16 étapes,17s réelles,0IA/externe/JS,octets chargés/rendu natif,reload/undo exacts|41797066076 en cours ; Docker et contrôle gratuit obligatoires SUCCESS|
| #373 stock natif |97a8a15820fca4f350845b7b8473d9f41650cdac|11 nouveaux+9 PATCH ;56 confirmations+40 catalogue ;20 connaissance ;types|41799372210 en cours ; Docker et contrôle gratuit SUCCESS au dernier relevé|
| #374 prestation nom |d315af5ea0c82f646bc531b40f941a4fa777934d|7 nouveaux+9 horaires+56 confirmations=72 ;20 connaissance ;types|41800023935 en cours ; Docker SUCCESS|
| #375 calendrier local |0561c6cfc9aee5609fe71e00dd07544efe5e6258|16 nouveaux dont DST ;63 confirmations ;16 registre ;types|41800842314 en cours|
| #376 choix thème |cf159b91358934c3d83bb203a2c011eb1a49360d|10 nouveaux ;70 confirmations ;20 connaissance ;types|41801965980 en cours|

Relever le verdict FINAL de chaque run et ses résultats exacts ; ne pas transformer « en cours » en succès. Les quatre contrôles obligatoires restent présents. Ne pas relancer les mêmes tests locaux déjà verts sans changement ou échec nouveau. Aucun test supprimé.

## Contrats transmis à Claude

Commentaires #369 :6625882119 image ;6626227076 stock+preuveimage ;6626321489 prestation ;6626437806 calendrier ;6626597189 thème. Réutiliser les docs LOT-STOCK-NATIF / LOT-PRESTATION-NOM / LOT-CALENDRIER-DATE / LOT-CHOIX-THEME dans chaque PR. Les cinq fonctions manquantes de son tableau16 v4 ont maintenant un contrat backend ; cela ne prouve pas cinq cartes ou recettes UI complètes. Image possède sa recette indépendante sur la carte Site existante ; miniatures avant/après restent à Claude. Pas de modification de sa branche.

Image preuve durable (texte+harnais, captures locales seulement) : branche codex/parity301-existing-image-proof, commit1f6002edbaa9e6ba8ea28b6c9d2807512bc2c46f. App réellement construite sur73c8865…, BUILD_ID oD5zUyaIukXgRxc7bpF3w. `scripts/parity301-existing-image-proof.ts` / `PREUVE-IMAGE-COMPILEE.json`. Deux faux échecs initiaux du harnais corrigés : URL data URI sans filename, puis PNG réencodé par themeAssetBinary ; comparaison finale = octets compilés réellement chargés. Aucun correctif produit inventé.

## Limites moteur précises

- Stock : une variante exacte, deux versions+empreinte ; pas bulk/sync ;null≠0,policy/SKU/prix conservés. Carte/recette Catalogue à intégrer.
- Prestation : profil Activité et saveServices CAS/empreinte, clé/alias stables ;« cette prestation » demande précision puis nom/clé exacts. Services réservables distincts. Carte Horaires à adapter selon field.
- Calendrier : seules dates éditoriales planned/draft/review ;approved/scheduled/paused/sent/failed refusés pour éviter un envoi. Toute modification calendrier/paramètres invalide ;DST gap/fold clarifiés. Carte/fuseau/recette à intégrer.
- Thème : aperçu natif INACTIF avant accord, moteur buildShop(useAi:false,prepareOnly:true), galerie/droits/gate/empreintes ;marque/médias/historique conservés. Défaut natif reproduit : heading manuel hero_split_1 non reporté vers Rive (carryOver.dropped). NOUVELLE CONFIRMATION BLOQUÉE si dropped non vide, site manuel exact préservé. Ne pas contourner le refus ni copier arbitrairement vers un autre champ ;politique native de report à traiter séparément. Ni premier site/importé/publication. Carte/deux vrais aperçus/recette à intégrer.

## Matrice unique

162 unités conservées depuis f64a6b0 (CSV/MD seulement, ancienne pile source NON fusionnée).52 PARTIEL,80 ABSENT,4 NON_TESTE,26 BLOQUE ;aucune complète. Les77 décompositions sont un inventaire, pas77 bugs. Rapport/générateur valident unicité et champs de suivi. Réévaluer les acquis Claude à partir de ses recettes sans certifier des opérations voisines par association.

## Workspace et commandes

Exécution disponible. Nouveau worktree `/workspace/work/parity301-intents-v5`, dernier moteur propre cf159b9… ;branche documentation codex/parity301-continuous-matrix-v3. node_modules symlink partagé. `.next` correspond toujours à IMAGE73c8865…, PAS aux derniers moteurs. Harnais image local untracked préservé, publié séparément. Avant nouveau build, retirer seulement un cache webpack inactif si espace nécessaire (~450Mo libres ;.next/cache/webpack~795Mo), jamais sources/données. L’ancien `/workspace/work/parity301-next-domains` reste interrompu en merge (HEAD e1ba254,MERGE_HEAD30f67e…) : ne pas reset ni réutiliser.

Tous processus app/tests/build : `NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs"`. Vitest/tsx/Chromium nécessitent le droit IPC/serveur local (sandbox require_escalated déjà utilisé). Aucun secret fournisseur. Fakes en /tmp, stockage réel interdit dans les recettes. Chromium système `/usr/bin/chromium`.

Logs locaux : `/tmp/parity301-image-final2.log`, image-types-final, image-build, existing-image-proof-v3.log et dossier JSON/captures ;stock-final/regressions/knowledge/types-delivery ;service-name-tests/knowledge/types-final ;calendar-dst-final/types-delivery ;theme-guards-final/knowledge/types-final. Préserver les preuves, ne pas annoncer un build du nouveau SHA sur l’ancien .next.

## Prochaines tâches indépendantes

1. Terminer les CI sur SHA livrés, corriger seulement les échecs démontrés ;continuer pendant les CI.
2. Bibliothèque naturelle lecture/recherche/dossiers et pièces jointes : route native `/api/projects/[id]/files` importe déjà via checkedUpload (200Mo max,fichiers actifs refusés,propriétaire,dossier,rate limit). Conversation accepte photoIds existants mais upload avant projet et vision non raccordés ;ne pas inventer analyse ni fournisseur sans devis. Commencer lecture metadata native cloisonnée et contrat Claude, puis upload réutilisant sécurités natives/idempotence.
3. Étendre les intentions et moteurs manquants dans les162 lignes sans refaire acquis. Version restore/motion thème, créations/suppressions métier, réservations, autres champs prestation et fichiers restent à vérifier. Si blocage, le nommer et poursuivre les autres lignes.
4. Après cartes Claude, nouveau build commun et recettes naturelles compilées des nouveaux domaines4modes/tactile/17s ;pas de parité complète tant que ces preuves et CI manquent.
