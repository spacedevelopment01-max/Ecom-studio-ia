# Tenon avec ou sans références visuelles : préparation (24 novembre 2026)

- **A** (sans référence) : déjà fait, dossier `../tenon-nu/`.
- **B** (avec trois références choisies par le propriétaire) : préparé, **pas lancé**. `lancer-b.py` reprend la configuration de A
  telle quelle (`../tenon-nu/requete.json`) et y ajoute seulement :
  1. les trois images déposées dans `references/` ;
  2. une phrase après la demande, qui dit à quoi elles servent :
     « Voici trois logos que j'aime, seulement pour le niveau de qualité que j'attends. Ne reprends ni leurs symboles,
     ni leurs compositions, ni leurs noms. »
  3. `action: "generate"` dans l'outil de dessin. Dans A, ce réglage était laissé à OpenAI, qui avait choisi « generate »
     (voir `../tenon-nu/bilan.json`). Avec des images dans la demande, OpenAI pourrait choisir de retoucher une
     référence au lieu de créer : on fixe donc ce qu'il avait choisi seul.
- Vérification à blanc faite avec trois images factices (`--verifier`) : la requête se construit, rien n'est envoyé.
- Coût estimé : 0,12 € à 0,20 € (A a coûté environ 0,10 € ; les trois images lues en plus coûtent quelques centimes).
