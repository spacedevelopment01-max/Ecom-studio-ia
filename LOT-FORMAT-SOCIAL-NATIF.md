# P1 — duplication sociale dans un autre format : source et copie cohérentes

Branche indépendante directement sur main #422, `6354f327888d70c64ce4d86604b7b8fdc768947c`. Ce lot corrige un moteur existant, sans nouvel aiguilleur, carte, composant ou changement de branche Claude. Contribution #301 pendant la coordination de l’audit #492.

## Défauts exécutés

Sur main : contrôle de conversion locale réussi ; deux rouges dans `/tmp/parity301-social-format-main-red.log` :
- une vraie retouche native commise pendant le calcul local est reprise dans le texte de la copie, alors que ses médias ont été calculés depuis l’état précédent ;
- l’échec d’attachement du second média converti laisse une copie partielle et ses premières références en base.

Autre rouge démontré : une liste de médias JSON invalide est interprétée comme une liste vide ; la fonction annonce une copie réussie sans les médias acquis. Log `/tmp/parity301-social-format-malformed-red.log` :1rouge/1vert, huit autres cas filtrés non exécutés dans ce passage. Aucune concurrence multiprocessus revendiquée : écritures SQLite natives réellement commises pendant l’async ou juste avant le verrou.

## Correctif minimal

`duplicatePostInFormat` valide la liste acquise, fige l’empreinte de toute la publication et des lignes de ses médias, puis calcule les adaptations avec le moteur local existant. Avant la création, transaction et relecture exacte sous verrou ; un changement de cible ou de média refuse la copie et conserve la modification intermédiaire. Une modification d’une autre publication ne bloque pas la cible.

Duplication, remplacement de la liste de médias et références de la copie sont transactionnels. Les références provisoires héritées de la duplication sont remplacées par celles des médias effectivement présents. C’est notamment nécessaire après le correctif natif #491, qui crée désormais les références des médias sources. Le moteur de conversion, les fourchettes de formats, les tarifs et l’API manuelle ne sont pas remplacés.

## Vérifications et limites

10 nouveaux tests ;27/27 avec les17 régressions social-v2-engine, types verts. Photos JPEG fictives réellement traitées par Sharp, pas de simulation de la conversion. Échecs source/attachement, listes invalides, source commise juste avant verrou, renommage média acquis, voisin indépendant, conservation source/octets, références exactes de copie. Vrai handler HTTP/session/SQLite : succès POST puis attente réelle monotone≥17s, deux GET natifs sans nouveau post ou média, format PNG16:9 relu ; conflit HTTP409 sans copie partielle. Zéro fournisseur/fetch/dépense/jobs IA.

**Portée atomique bornée** : les adaptations locales enregistrées pendant le calcul asynchrone peuvent rester dans la bibliothèque si la création du post est ensuite refusée. Ce lot ne les supprime pas aveuglément et ne promet pas de rollback des fichiers, documents ou provenance créés avant la transaction finale. Aucun original ni modification acquise supprimé. Les branches affiche à calques/visuel IA du moteur existant ne sont pas nouvellement qualifiées par ces tests photos.

Pas de nouveau contrat conversationnel de format : aperçu/accord/carte/reçu SYNA restent absents ; le POST manuel existant n’a pas d’idempotence requestId, donc pas de promesse de reprise d’une confirmation perdue dans ce lot. La relecture GET est seule répétée, pas le POST. Aucun navigateur compilé ou fournisseur réel qualifié. CI finale du SHA publié et combinaison avec #491/#493/#494 à suivre séparément.

Logs : `/tmp/parity301-social-format-{main-red,malformed-red,first,final,types-final}.log`. Aucun client réel, programmation/publication, activation, fusion main ou déploiement.
