# Report manuel sans ancien contrôle de composition — correctif ciblé

Base #3801091793754e016ee8bf98cd671368c1379afc0a6. Aucun fichier graphique modifié.

Défaut REPRODUIT sur projet fictif : première composition native serveur sans ancien qc.gate,puis titre manuel,choix Rive. Le moteur preservation(null,current) renvoie zéro retouche et carryOver.dropped reste vide. L’ancien garde#376 ne voyait donc pas cette perte ;la confirmation pouvait remplacer le site et faire disparaître le texte manuel. Preuve rouge :attente texte acquis=true,réel=false (/tmp/parity301-theme-baseline-loss-red.log).

Correction minimale : compositionBaseline natif partagé devient exporté,sans changer sa priorité pour les versions avec contrôle gate/clientCompositionBaseline. Si aucune n’existe,seule la version numéro1,author=system,parent=null,non importée peut servir de référence automatique historique. Aucune version manuelle,référence IA approximative,ou version courante arbitraire n’est inventée comme baseline.

Le moteur natif peut alors identifier les retouches et utiliser ses règles existantes de report :un réglage global d’animation est effectivement conservé lors du choix de Rive ;un heading sans équivalent est signalé dropped et la confirmation SYNA reste BLOQUÉE. Si aucune référence prouvable n’existe,le raccordement refuse la préparation/remplacement et conserve le site courant. Aucun assouplissement de droits,forfait,gates,coût,verrous ou activation.

3 nouveaux tests réels :ancienne absence de baseline avec perte rouge→refus vert,absence de provenance automatique→aucune référence inventée,réglage global manuel→report et accord natifs conservés. Avec10 choix de thème acquis :13/13. 14 régressions natives report/adaptation passent,types etdiff-check propres. CI complète du SHA livré à qualifier. Aucun test supprimé.

Claude :même contrat#376,aucune adaptation graphique nécessaire. Le message de clarification explique l’absence de référence ou les champs non reportables ;ne pas proposer de contourner le refus. Ce correctif ne prétend pas résoudre le mapping entre deux champs de thèmes différents. Inclure avec#380 avant qualification commune.
