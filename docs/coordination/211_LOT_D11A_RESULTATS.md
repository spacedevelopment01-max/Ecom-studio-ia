# #211 — D11a : brouillons et calendrier depuis SYNA

**Publié pour revue ; CI finale requise, aucune fusion ni activation.** Application/build/navigateur : `dfe46ee0c7dd605d1bb70d9d606b3459bf9e1d74`. Correctif ultérieur de tests uniquement : `ee4d3740acfd39900905426b73d456914aa26e2d` ; sources applicatives, worker, harnais et CI identiques à l’application compilée. Cette tranche ne termine ni D11 ni #211.

## Fait et vérifié

Même conversation → dernière demande exacte → cible produit/variante ou prestation native → devis local0% → confirmation → worker natif → sauvegarde dans Publications → lecture/édition/téléchargement et reprise. Médias acquis réemployés sans modification des pixels ; textes entiers, espaces et sauts de ligne conservés. `social.draft` prépare1–5brouillons ; `social.plan` utilise le planificateur existant, ses droits et ses fuseaux. Les dates préparées ne sont pas une programmation.

La route manuelle et SYNA partagent `social-v2/manual.ts`, la table posts, les empreintes et l’éditeur existants. `social-tool-*`, route `social-drafts`, worker et carte React complètent ce parcours. Drapeau `STUDIO_CONVERSATION_SOCIAL` fermé par défaut ; aucun deuxième assistant. Pas de budget ni appel IA pour appliquer cette préparation ; la réflexion conversationnelle reste séparée et soumise au devis. Aucun compte social lié, contenu approuvé, programmation ou diffusion.

## Causes corrigées

- Prix principal stocké en centimes comparé comme des euros par `publication-copy-policy` ; projection de l’ancien catalogue secondaire convertie prématurément en euros. Contrat commun rétabli :1990centimes confirme19,90€, jamais1990€. Aucun montant stocké, forfait ou plafond changé.
- Ancien visuel acquis accepté avant de relire ses affirmations : contrôle du texte enregistré contre l’offre exacte. Visuel incohérent conservé, non réaccepté et non racheté automatiquement.
- Cible native/variante/prix perdus dans les brouillons : projection commune de l’offre et `brief.nativeBinding`, relus par `checkPost`. Pas de substitution par l’offre principale.
- Horloge courante ajoutée au contexte : devis invalide à sa confirmation. **Reproduit dans le navigateur**, puis test rouge/vert avec une minute d’écart et passage par le worker. Date désormais ancrée au message conservé, sans désactiver la vérification du contexte.
- Fuseau ignoré à l’ouverture de l’éditeur : celui du brouillon prévaut,10h America/New_York reste10h.
- Tâche done sans brouillon ou fichier : reçu historique, livraison complète non prouvée, aucun retry/recréation. Correction manuelle et snapshot original conservés séparément.

## Vérifications réellement exécutées

| Contrôle | Résultat |
|---|---|
| `vitest run` ciblé initial,7fichiers |75réussis |
| Régressions prix/contexte/social ; horloge activée | Tests ciblés réussis ; défauts rouges conservés dans la preuve |
| `npm run build`, types | Réussis sur le candidat propre ci-dessus |
| `npm test`, réseau fournisseur interdit | **4075réussis,45ignorés,2tests échoués et1erreur de collecte**,470fichiers réussis ;996,78s. Ce lancement n’est PAS vert |
| Suites affectées après restauration des fixtures Git | OpenAI simulé +TRAVERSE :30réussis |
| Assertion de sécurité adaptée au helper natif, compte étranger réellement enregistré, sauvegarde/exécuteur |17réussis ; aucun contrôle d’isolement retiré |
| Studio compilé +Chromium, vrai worker/base/fichiers | Réussi :1440/360px, confirmation≥44px, texte/image/JSON exacts, édition native, réouverture, calendrier New York,404étranger/403CSRF, disparition d’une ligne fictive correctement signalée |

Les deux premières erreurs de la suite viennent de ma copie parcellaire : des fixtures suivies docs/reports manquaient, rétablies octet pour octet depuis le commit. La troisième était une assertion cherchant le contrôle SQL dans l’ancienne route ; elle suit maintenant la délégation au helper et garde la vérification du propriétaire. **Pas de seconde suite locale redondante : CI complète finale encore obligatoire.** Premier candidat3d9a3063 écarté pour le vrai défaut d’horloge ; son lancement partiel a été interrompu et reste consigné. Aucun résultat échoué effacé.

Les commandes, états et empreintes se trouvent dans [211_D11A_PREUVES.json](211_D11A_PREUVES.json). Transport cognitif HTTP **simulé**, médias synthétiques ; aucun fournisseur réel. Le film est un vrai enregistrement Chromium de16,92s, sans accélération, réduit à960px/12fps pour partage ; original1440px/25fps conservé localement. **0appel fournisseur réel /0€réel** ; les coûts du registre simulé ne sont pas une facture.

## Preuves utiles

[Devis ordinateur](preuves-211-D11a/01-devis-ordinateur.png) · [Devis mobile](preuves-211-D11a/02-devis-mobile.png) · [Brouillon mobile](preuves-211-D11a/03-brouillon-mobile.png) · [Résultat natif manquant signalé](preuves-211-D11a/04-version-native-manquante.png).

[Film du parcours](preuves-211-D11a/social-workflow.mp4) · [JSON téléchargé](preuves-211-D11a/social-preparation.json) · [Assertions navigateur](preuves-211-D11a/social-browser-proof.json) · [Version compilée/transport](preuves-211-D11a/compiled-summary.json). Quatre captures réellement ouvertes, huit fichiers de preuve sélectionnés.

## Limites / suite

Le brouillon de recette conserve un avertissement natif sur «artisanal», faute de preuve de fabrication : **sauvegardé pour relecture, pas approuvé ni prêt à publier**. La qualité d’une création IA, les comptes sociaux et les API/CMS réels ne sont pas qualifiés. Les suppressions simulées concernent seulement les lignes fictives de la recette. Aucun client, média réel ou configuration du Studio servi modifié.

Campagnes/publicités et nouveaux médias restent à raccorder dans D11b/suite ; D12/E/F, staged vidéo, autre profil vocal et rapprochement fournisseur restent partiels. Ne pas annoncer #211 terminée.

Dépendance #252 : base9a9b2b1c ; son correctif de délai120s du test double export Shopify0b23a265 est repris **par contenu** dans ce candidat. #252 attend encore sa nouvelle CI41050830261 ; #251a93398de est prête/verte. #250 est déjà conservée par contenu sans ascendance : ne pas l’appliquer deux fois. #247/#248 et les API services Claude #239/#245 restent des dépendances d’intégration futures. Aucun thème, composition, branche Claude/main, instance ou drapeau client touché.
