# Reprises au frais du client — chantier mis en attente

**État : en attente.** Le 26 novembre 2026, le propriétaire a dit « On fera ça plus tard ». Rien n'est construit. Ce
document garde l'inventaire et la phrase d'accord pour reprendre le chantier.

## La décision du propriétaire (26 novembre 2026, mot pour mot)

« A aucun moment j'ai demandé à ce que le studio le prenne en charge, sina doit réussir et c'est tout si erreur se fait
elle continue de faire au frais du client »

Elle renverse la règle de la référence (`LE-STUDIO-DE-A-A-Z.md`, lignes 303-304) : « 3) Pas de reprises comptées : une
erreur de SINA est toujours corrigée sans rien compter ; un changement de goût du client passe par son budget du mois. »
Ces deux lignes sont à mettre à jour quand le chantier reprend.

## La règle, telle que le chef d'orchestre l'a écrite

1. Aucune reprise n'est à la charge du Studio. Toute reprise est comptée sur le budget d'IA du client, comme le premier
   essai, en pourcentage, jamais en euros.
2. SINA continue jusqu'à réussir. Il n'y a pas de porte de sortie : plus de « je garde l'agrandissement », plus de
   promesse « à ma charge », plus de « refusée deux fois, elle n'est pas montrée ».
3. La seule limite est le budget d'IA du mois du client. Quand il est atteint, SINA le dit clairement et la tâche
   s'arrête. Avant une longue tâche, la carte de dépense annonce une fourchette, reprises comprises.
4. Le devis compte les reprises dans la part du client. La « borne du Studio » disparaît.

Les points de métier tranchés par le chef d'orchestre :

- Après deux refus pour la même raison, SINA change d'approche (autre phrase, autre esquisse, autre départ) au lieu de
  repayer le même essai.
- Un logo refusé est repris à partir du dernier refusé, avec toutes les raisons des refus.
- Si le budget du mois est atteint en route, SINA ne montre jamais un travail incomplet. La règle des 12 esquisses et
  celle des planches complètes restent. SINA dit ce qui est fait et ce qui reste, puis reprend dès que le budget le
  permet. Cette phrase est écrite par le code, en tutoyant, sans mot technique.
- Les réponses de SINA réécrites après relecture sont, elles aussi, comptées au client.
- La règle « un appel au résultat incertain (erreur du fournisseur) n'est jamais relancé tout seul » reste en vigueur.
  Une panne n'est pas un refus du relecteur.

## Inventaire (au commit 23fbc458)

**Le moteur.**
- Fonctions : `aLaChargeDuStudio` et `chargeDuStudio` (`src/lib/ai/trace.ts`), `borneDuStudio`
  (`src/lib/ai/borne-du-studio.ts`).
- Données : le champ `studio` des réservations (`src/lib/billing.ts`).
- La dispense du budget du mois (`src/lib/ai/access.ts`, `src/lib/ai/llm.ts`).
- Les bornes : `REPRISES_MAX = 2` (`reprises.ts`), `REMPLACEMENTS_MAX = 3` (`esquisses.ts`), et « refait une fois »
  écrit en dur dans chaque chaîne.

**Les étapes.**
- Esquisses (`esquisses.ts`, `logo-graphistes*.ts`) : au plus trois tours, au Studio.
- Métier : une réécriture au Studio.
- Logo fini et retouche de couleurs : `logo-finalisation.ts`, `logo-graphistes-tache.ts`.
- Planche de marque et ses valeurs : `planche-de-marque*.ts`.
- Planche en vrai, logos en haute définition, produits refaits avec ses photos : `planche-en-vrai*.ts`. Les clés de
  reprise `r1` sont figées et seront à numéroter par tour.
- Marque finie et anciennes planches : `brand-images.ts`, `brand-chain.ts`, `brand-finish.ts`.
- Site : `custom-theme/brand.ts`, `gallery.ts`.
- Publications : `social-v2`, `posts-plan.ts`, `quality/policies.ts`.
- Angles : `angles-chain.ts`.
- Fiche Google : `suivi/fiche-google.ts`.
- Réponses de SINA : `loop.ts`, avec une borne de 3 €.
- Vidéos (lot 9), à aligner plus tard.

**Les devis.**
- `devisDeLaRecherche`, `devisDuLogo`, `accordGraphistes`, `devisDesPistes` ;
- les devis des planches, de la planche en vrai, des logos en haute définition et des produits ;
- `deuxPlafonds` ;
- `prixJuste` (administration).

Ils ont tous une « part du client » et une « borne du Studio ». La carte devra annoncer une fourchette, et
`budgetInsuffisant` (`loop.ts`) devra être revu.

**Les phrases de SINA à retirer ou réécrire.** Il y en a une vingtaine, notamment :
- « À ma charge : 0 % de ton budget » ;
- « Je peux la refaire à ma charge » ;
- « Je les finis à ma charge, ça ne te coûte rien » ;
- « Je garde donc celles de ta planche, agrandies » ;
- « il garde son image d'ambiance » ;
- « Je te propose une autre esquisse » ;
- « je garde celui d'avant » ;
- le message du plafond qui dit « le budget d'IA du client n'est pas épuisé ».

Aujourd'hui, un budget du mois atteint en cours de tâche n'est pas dit clairement : le message vouvoie et parle d'un
« moteur local ».

**Les scripts d'essai** (`scripts/syna-recette/`) : la « borne du Studio » et le « plafond minimal, reprises
comprises » disparaissent. `PLAFOND_ESSAI_EUR` reste la seule limite.

**CLAUDE.md.** Les parties à mettre à jour :
- Logo : « au plus trois tours », « refait une fois, à la charge du Studio », « refusé deux fois, SINA propose une
  autre esquisse » ;
- Identité, planche de marque : « refaite une fois à la charge du Studio … SINA propose de la finir à sa charge » ;
- Identité, planche en vrai : « une reprise à la charge du Studio ; … SINA propose de la refaire à sa charge » ;
- Son argent : préciser qu'un refus n'est pas une panne.

**Les 15 épreuves scellées contredites :**
1. erreur-de-sina-jamais-comptee
2. reprise-du-studio-jamais-bloquee-par-la-carte
3. charge-du-studio-jamais-au-budget-du-client
4. planche-a-trou-jamais-montree
5. marque-finie-jamais-sans-logo
6. sina-propose-de-finir-les-planches
7. equipe-coupee-ne-fait-pas-tomber-la-marque
8. jamais-de-question-sur-le-logo
9. phrase-de-l-esquisse-au-choix-du-client
10. douze-esquisses-toujours-correctes
11. reprise-du-logo-a-partir-du-refuse
12. relecteur-du-logo-sans-arche
13. planche-signe-parasite-petite-finition
14. planche-en-vrai-identique-a-l-apercu
15. planche-en-vrai-palette-mesuree-et-logos-en-hd

Ces 15 épreuves seront à revérifier quand le chantier reprend : celles ajoutées entre-temps peuvent compter aussi.
Dans `tests/epreuves.test.ts`, il faudra ajouter les 15 identifiants à la liste des remplacées et le début « Oui,
marque erreur-de-sina-jamais-comptee » au motif accepté.

## La phrase d'accord préparée (à faire écrire mot pour mot au propriétaire quand le chantier reprend)

« Oui, marque erreur-de-sina-jamais-comptee, reprise-du-studio-jamais-bloquee-par-la-carte,
charge-du-studio-jamais-au-budget-du-client, planche-a-trou-jamais-montree, marque-finie-jamais-sans-logo,
sina-propose-de-finir-les-planches, equipe-coupee-ne-fait-pas-tomber-la-marque, jamais-de-question-sur-le-logo,
phrase-de-l-esquisse-au-choix-du-client, douze-esquisses-toujours-correctes, reprise-du-logo-a-partir-du-refuse,
relecteur-du-logo-sans-arche, planche-signe-parasite-petite-finition, planche-en-vrai-identique-a-l-apercu et
planche-en-vrai-palette-mesuree-et-logos-en-hd comme remplacées par ma décision du 26 novembre, ajoute et scelle
reprises-au-frais-du-client-jusqu-a-reussir (« A aucun moment j'ai demandé à ce que le studio le prenne en charge, sina
doit réussir et c'est tout si erreur se fait elle continue de faire au frais du client » : aucune reprise n'est à la
charge du Studio, toute reprise est comptée sur le budget d'IA du client comme le premier essai, en pourcentage, jamais
en euros ; SINA refait, relit et refait encore avec les raisons des refus jusqu'à réussir, sans porte de sortie ; après
deux refus pour la même raison, SINA change d'approche (autre phrase, autre esquisse, autre départ) au lieu de repayer
le même essai ; si le budget du mois est atteint en route, elle ne montre jamais un travail incomplet, dit ce qui est
fait et reprend dès que le budget le permet ; la seule limite est le budget d'IA de son mois : atteint, SINA le dit
clairement et la tâche s'arrête ; la carte annonce la fourchette, reprises comprises ; une panne du fournisseur n'est
toujours jamais relancée toute seule ; tout le reste de ces épreuves reste vrai), et mets à jour les parties Son argent,
Logo et Identité de CLAUDE.md. »

La date « 26 novembre » de la phrase est à revoir avec lui le jour où il l'écrit.
