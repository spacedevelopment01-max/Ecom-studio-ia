# Lot 4 : le site

**En cours (commencé le 16 novembre 2026).** Le lot n'est pas fini : il le sera quand SINA aura réussi seule, avec la
vraie IA, le site de plusieurs clients inventés. Ce document dit ce qui est construit, ce qui est vérifié, et ce qui ne
l'est pas.

## Le découpage accepté par le propriétaire (« Oui », 16 novembre 2026)

1. Le premier tronçon du thème unique, sur le moteur des thèmes.
2. SINA monte le site seule.
3. Cliquer sur l'aperçu pour modifier.
4. Le thème complet (8 en-têtes, 6 pieds de page, 6 pages produit, 6 pages de services, environ 60 sections, les six
   familles en coulisses) et les six démonstrations.
5. Les sorties (mise en ligne d'un site de services par SINA, transfert essayé sur de vraies boutiques d'essai), les
   engagements liés au site (boîte des demandes, devis, carnet de clients, vrais chiffres de vente) et le retrait des
   anciennes façons.

Prix : la construction des temps 1 à 3 ne coûte rien ; le premier site réel se fait sous un plafond de 10 € accordé par
le propriétaire, après le devis de SINA et son « oui ».

## Ce que la lecture du code a montré (et corrigé dans l'inventaire)

- Les pièces existaient déjà : 95 pièces qui prennent l'allure de la marque (`custom-theme/tenue*.ts`), avec en-tête,
  pieds de page, ouvertures, fiche produit, pièces de métier. La démonstration gratuite (`tests/sina-theme-demonstration`)
  monte un site d'électricien et une boutique de yoga : les deux ont été regardés en image le 16 novembre 2026, ils sont
  d'un bon niveau et ne se ressemblent pas. Le thème unique part donc de ces pièces, au lieu d'en réécrire.
- La chaîne existait aussi (conception, relecture, juge de l'originalité, textes, relecture des textes, photos,
  regards en image), mais éclatée en une dizaine d'outils, avec trois cartes d'accord, une question de famille, une
  question d'ambiance et deux concepts à choisir. Jamais essayée avec la vraie IA.
- Le pont vers le moteur des thèmes existait (`to-shopify.ts`, `install.ts`) : le site de SINA devient une version de
  thème que le moteur sait afficher, exporter et envoyer. Elle n'était jamais activée.
- « Modifier en cliquant » n'avait pas disparu pour les sites montés par SINA : la fonction était dans l'onglet
  Boutique, derrière un bouton « Désigner un élément », à réactiver à chaque clic.

## Ce qui est construit (temps 1 à 3)

- **Une seule façon, un seul accord** : l'outil `site.create` et la tâche de fond `syna.site`
  (`custom-theme/site-job.ts`). SINA conçoit tout le site, donne sa fiche à chaque produit, calcule le menu, écrit et
  relit les textes, pose les photos du client et crée celles qui manquent, regarde le résultat sur téléphone. La tâche
  se reprend après une coupure sans repayer la conception. Le plafond annoncé n'est jamais dépassé : si le site conçu
  coûte plus que ce qui reste, les photos sont créées d'abord pour l'accueil et la page qui vend, et le compte rendu le
  dit.
- **Le client ne choisit plus ni thème, ni famille, ni concept.** Les familles restent en coulisses (un projet sans
  choix prend le socle commun). Les anciennes façons ne sont plus proposées à SINA pendant le parcours (`registry.ts`,
  `OLD_SITE_WAYS`) : le choix « thème du Studio ou sur mesure », les 15 thèmes à monter, la famille, l'ambiance, les
  deux concepts, la conception à part, les retouches de l'ancien moteur. Elles seront retirées du code quand l'essai
  réel aura réussi (règle : rien n'est supprimé avant que ce qui le remplace soit prouvé).
- **La consigne de l'étape du site** est réécrite (`journey.ts`, `STEP_GUIDES[6]`) : ce qui manque se demande avant, une
  carte d'accord, un compte rendu honnête (une image ratée est dite ratée), les retouches en cliquant, la validation
  par le client. Aucun exemple tiré d'un projet d'essai. Le compte rendu entier de la création est gardé dans le
  parcours, parce que le fil coupe le résultat d'une tâche.
- **Le moteur des thèmes** : à la fin de la création, puis à la validation par le client (`custom.choose`), le site
  devient la version active du moteur, si rien d'inventé ni d'exemple n'y reste. Sinon la liste de ce qui manque est
  rendue à SINA, qui le demande au client.
- **Cliquer pour modifier** : le clic désigne tout de suite (plus de bouton à réactiver), sur chaque page, sur
  ordinateur et sur téléphone ; un bouton rend la navigation. Une photo posée en fond se désigne comme une photo, avant
  le lien qui la porte ; une cellule, une légende ou un champ se désignent aussi. La demande part à SINA avec la
  section, l'élément et son texte ; elle ne change que lui. Le site s'affiche dans la conversation à la fin de sa
  création, avec « Voir mon site et le retoucher » et « Je valide mon site ».
- **Les mots du client** : « ton site », jamais « thème sur mesure » ni « maquette », dans les cartes, les comptes
  rendus et les écrans touchés.

## Le devis (calculé le 16 novembre 2026 avec les tarifs vérifiés, pas encore mesuré)

| | Coût probable | Plafond jamais dépassé |
|---|---|---|
| Site de services | 5,70 € | 18,93 € |
| Boutique, un produit | 5,95 € | 19,63 € |
| Boutique, quatre produits | 7,24 € | 23,82 € |

Le plafond est haut parce qu'il est annoncé avant la conception : le nombre de pages et de photos n'est connu
qu'après. Ce sont des devis ; le coût réel sera relevé sur le premier site.

## Vérifié, et non vérifié

- Vérifié sans IA : compilation ; tests du nouveau chemin (`tests/sina-site-en-une-fois.test.ts`) et tests mis à jour ;
  le clic sur l'aperçu essayé dans le Studio privé, sans clé d'IA, sur la boutique de démonstration (titre, carte
  produit, bouton).
- **Pas encore vérifié** : tout ce qui demande la vraie IA (aucun site n'a encore été créé par SINA pour de vrai) ; la
  retouche faite par SINA après un clic ; les photos posées en fond désignées une par une dans le Studio privé (écrit
  et testé, pas encore revu à l'écran).

## Ce qui reste à faire dans le lot

- L'essai réel : Bécane d'abord. Ses angles (lot 3) n'ont pas été gardés dans la copie des clients d'essai : il faut
  les recréer (environ 1 €), puis valider son activité, avant le site.
- L'aperçu vient encore du rendu propre à SINA ; le rendu du moteur des thèmes sert à la mise en ligne et aux boutiques.
  Les deux ont été comparés en image sur la démonstration (identiques à l'œil). Un seul rendu pour l'aperçu : au temps 5,
  avec la mise en ligne.
- Les temps 4 et 5, et le retrait des anciennes façons.
