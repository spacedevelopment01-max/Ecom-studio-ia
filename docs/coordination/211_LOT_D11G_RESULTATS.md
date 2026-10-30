# #211 D11g — Réemployer une publication acquise après conflit

**Version finale code/build/Chromium : `7259e506d92cd680836ebef394b0a31cdfb94569`.** Base #258 `cdbbd92d`, première version locale `1a74dd27`. Copie isolée réutilisée après livraison D11f, sa branche et ses preuves conservées. Aucun main, merge, déploiement, activation ou client modifié.

**Reproduit puis corrigé :** un changement de date pendant la génération empêchait légitimement l’attache, mais le reçu perdait l’image complète déjà acquise. Test initial : 1 échec/28 réussites. Le producteur natif enregistre maintenant le fichier avant l’attache ; il reste consultable et téléchargeable après conflit.

Un accord séparé propose son réemploi **exact à 0 %**, sans fournisseur, nouvelle image, borne remise à zéro ou modification de la date humaine. Il reste possible quand le devis initial et sa borne sont expirés, le budget épuisé et la photo source retirée. La cible, la marque, les textes et leurs faits, le ratio, l’angle service, les droits, la version et les octets sont revérifiés. Un changement impose un refus, jamais un achat ou autre fichier substitué. L’acquis désigné ne dépend pas des soixante images récentes de la bibliothèque. Un simple statut `done` sans résultat final reste insuffisant pour annoncer une livraison.

Autre défaut reproduit : trois refus métier auraient produit une erreur HTTP générique 500. Ils renvoient maintenant **409 avec leur raison**, sans masquer les véritables pannes. Nouvelle recette compilée exécutée après cette correction serveur ; contrôle qualité et plafonds inchangés.

## Vérifié

- **74 tests ciblés / 3 fichiers réussis** (`conversation211-social-production`, `social-native-production-binding`, `publications-qualite`), puis **40 tests du premier fichier rejoués** après correction des refus HTTP ; nombres recouvrants. Produit, multi-produit et service, acquis hors des 60 récents, fichier physiquement absent/restauré, texte/marque/version/faits modifiés, budget/bornes, fausse réussite, photo source retirée. Les échecs initiaux ne sont pas comptés comme succès.
- `npm run typecheck`, `npm run build` et `node --import tsx scripts/verify-agent211-build.ts <dossier-vide> --social-reuse-ui` réussis. Build et navigateur finaux propres, même SHA, sources inchangées. Pas de répétition locale de l’ancienne suite complète ; CI complète finale requise sur la tête publiée, statut dans la PR.
- **Vrai Studio compilé + worker + SDK vers faux HTTP** : une image acquise, conflit d’attache à 95 %, reçu/fichier présent ; 409 sur un contenu corrigé, 400 sur un asset forgé, aucune consommation supplémentaire ; annulation de la correction de test puis accord à 0 %, même fichier attaché et téléchargé exact, date conservée, source retirée, budget épuisé, devis/borne expirés, table des bornes inchangée. Rechargement sans appel. Auth/isolement/CSRF restent vérifiés. Quatre captures ouvertes, trois sélectionnées, un film réel sans accélération.

[Commandes/SHA/empreintes](211_D11G_PREUVES.json) · [preuve native et transport](preuves-211-D11g/native-reuse-proof.json) · [ordinateur](preuves-211-D11g/01-devis-visuel-ordinateur.png) · [accord mobile à 0 %](preuves-211-D11g/03-reemploi-sans-ia-mobile.png) · [fichier réemployé](preuves-211-D11g/03-visuel-mobile.png) · [film 12,93 s](preuves-211-D11g/social-reuse-workflow.mp4).

## Limites / suite

**0 fournisseur réel / 0 € réel.** Mire et réponses qualité synthétiques ; aucune intelligence ou qualité créative réelle qualifiée. Pas de diffusion ou compte social réel, ni remplacement/correction payante, carrousel ou vidéo dans ce parcours.

Le réemploi concerne un résultat natif complet enregistré et désigné par son reçu ; il ne transforme pas un essai rejeté ou incertain en image validée. Les anciens reçus sans acquis enregistré ne sont pas reconstruits par supposition ; fichiers et reçus natifs restent conservés. L’interface liste les dix derniers reçus, sans prétendre exposer tout l’historique. Les droits et la relecture service restent obligatoires.

Registre des capacités et actualisation des onglets à intégrer ensuite, puis D12/E/F et limites vidéo restantes. **#211 reste partielle ; Studio client inchangé.** Données, compositions et branches Claude préservées.
