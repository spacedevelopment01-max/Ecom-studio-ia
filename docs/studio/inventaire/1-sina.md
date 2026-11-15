# Inventaire, lecture 1 : SINA (rapport reçu le 15 novembre 2026, lecture seule)

Périmètre : src/lib/syna-agent/ (22 300 lignes : racine 8 172, custom-theme/ 6 843, mockup-code/ 4 316, tools/ 2 839), src/lib/syna-ui/, routes, composants du fil, worker/handlers.ts, scripts/syna-recette/.

## Deux portes de conversation
- /api/syna/* (7 routes, 97 lignes) → syna-agent/loop.ts, affichée par src/components/studio/syna-thread.tsx. C'est SINA. Fermée par défaut (variable serveur STUDIO_SYNA_AGENT).
- /api/studio-agent/* (25 routes) → src/lib/orchestrator/conversation/ (98 fichiers, 5 841 lignes), affichée par conversation-panel.tsx et 44 composants conversation-*.tsx (1 794 lignes), tâches agent.*. Première conversation, fermée par STUDIO_CONVERSATION_LOT_A et d'autres drapeaux. SINA ne l'importe qu'une fois (tools/project.ts).

## Modules (A garder / B reconstruire ou rebrancher / C supprimer)
| Module | Ce qu'il fait | Lignes | Pile | Note |
|---|---|---|---|---|
| loop.ts, store.ts, thread.ts, budget.ts, registry.ts, attachments.ts, snapshot.ts | Le fil : message, choix des outils, carte d'accord, reprise après une tâche | ~1 300 | A, sauf modelFor en B | Socle sain (accord avant dépense, coût réel) |
| prompt.ts, journey.ts | Consigne générale, 14 étapes, 15 questions fixes, consignes d'étape | 450 | B | Cible : 9 étapes, questions libres ; consignes pleines de notes d'essais ; état des fils dans state_json.parcours |
| conversation.ts, tools/open.ts, local-step.ts | Aiguillage, moments forts, relectrice ; réponses sans IA de l'étape 0 | 298 | B | Construit mais éteint ; l'étape 0 sans IA contredit « modèle fort partout » |
| brand-chain.ts, brand-prompts.ts, brand-routes.ts, brand-board.ts, brand-wordmark.ts, brand-images.ts, brand-domains.ts, brand-knowledge.ts, tools/identity.ts | Chaîne de la marque : étude, noms, juge, planches, images | ~3 100 | A, consignes en B | Seule partie essayée plusieurs fois pour de vrai |
| brand-references.ts | Goûts du propriétaire : noms refusés, notes, palettes | 206 | B | Contient les noms des essais |
| identities.ts et la branche « simple » de tools/identity.ts | Ancienne création en un appel (3 identités) | ~600 | C | Types Identity importés partout : à déplacer d'abord |
| brand-art.ts, brand-art-review.ts | Illustratrice en dessin et sa relecture | 255 | C | Encore payée à chaque planche ; secours quand une image est refusée |
| logos.ts, tools/logo.ts | Reprise du logo de planche, logo unique, 3 logos libres, nom dessiné de secours | 525 | B | Trois façons dans un fichier |
| brand-kit.ts, activity.ts, tools/start.ts, activity, catalogue, offers, brand-kit, product-features.ts | Étapes 0, 3 et 5, sans IA | ~1 150 | A | |
| angles.ts, angle-roles.ts, tools/angles.ts | Étape 4, par-dessus le moteur du Pilote | 337 | B | Dépend de src/lib/preparation |
| custom-theme/ à tenue (tenue*.ts, design.ts, brand.ts, tools.ts, theme.ts, render.ts, to-shopify.ts, install.ts, references.ts, originality.ts, identity-card.ts, looks.ts, knowledge.ts, menu.ts, gallery.ts) | Thème sur mesure, spécialistes, mise en boutique | ~6 000 | A/B | La plus récente, jamais essayée en vrai |
| custom-theme/library.ts (188 sections d'avant), starters.ts, blank.ts, builder.ts, section-groups.ts, section-families.ts, tools/families.ts | Ancienne banque, familles Classique et Moderne, atelier manuel | ~900 | C après décision | Thèmes des essais ; direction artistique « Moderne » (image-v2/art-direction.ts) |
| mockup-code/ | Anciennes maquettes (image ou code) et site codé | 4 316 | C | loop.ts, custom-theme/ et tools/themes.ts y prennent encore la route d'images, deux modèles, deux lectures : à déplacer avant |
| studio-brand.ts, themes.ts, tools/themes.ts | Thème du Studio monté à la marque | 511 | A | Voie gardée dans la cible |
| posts-plan.ts, posts-knowledge.ts, tools/posts.ts, tools/steps-late.ts, calendar.ts, tools/calendar.ts | Étapes 9 à 13 | ~1 580 | B | Construit, fermé, jamais exécuté |
| tools/commerce.ts, tools/site.ts, tools/project.ts, tools/media.ts | Outils hors parcours | ~810 | C pour brand.create, site.mockups, site.mockup_images, site.build, pilot.run, strategy.choose, project.create ; A pour les lectures | |
| syna-thread.tsx, brand-boards.tsx, custom-theme*.tsx, syna-shell.tsx, syna-ui/, components/syna/ | Fil, planches, coquille | ~3 900 | A/B | |
| orchestrator/conversation/, /api/studio-agent/*, conversation-*.tsx | Première conversation | ~7 900 | C | Seconde porte ; tâches agent.* |
| scripts/syna-recette/ | Studio privé d'essai, banc des angles | 376 | B | |

## Doublons
1. Créer la marque, 4 façons : chaîne (la plus récente) ; « simple » (identities.ts) ; brand.create (tâche brand.build) ; pilot.run.
2. Logo, 5 façons : logo de planche (brand-images.ts, la plus récente) ; logo unique (logos.ts runSingleLogo) ; 3 logos libres (runSinaLogosJob) ; 3 pistes de brand.create ; nom dessiné en code (secours).
3. Images de planche : dessins (défaut) contre OpenAI (sina.brand_images).
4. Site, 6 façons : site.mockups ; site.mockup_images ; mockup.* en image ou en code (syna.mockup.mode) ; theme.* ; custom.* ; atelier manuel (builder.ts).
5. Dans le sur mesure : custom.concepts puis custom.concept (récent), custom.design, custom.compose ; 188 anciennes sections contre 95 à tenue dans la même bibliothèque.
6. Angles : angles.propose (trois montrés) contre pilot.run et strategy.choose (cinq).
7. Publications : posts.plan et posts.create contre posts.draft et images.generate.
8. Publicités : ads.create contre ads.list et ads.edit (à calques).
9. Étape 0 : moteur sans IA contre réponse rédigée (syna.replies).
10. Conversation : petit modèle contre moments forts ; deux portes.

## Réglages (défauts du code)
STUDIO_SYNA_AGENT, STUDIO_SYNA_SHELL : fermés (voulus allumés). sina.conversation : tout éteint (voulu allumé). sina.brand_images : « dessins » (voulu openai). sina.etapes_ouvertes : vide (voulu ouvert). sina.brand_method : « chaine ». sina.brand_chain : 4 équipes, modèles fort et métier. syna.mockup.image_route : modèle d'images d'OpenAI (planches, thème, galeries, publications). syna.mockup.mode : « code ». syna.replies : « personnalisees ». syna.step7.base_direction : vide. site.copy_model : vide (fort). ai.routes : appels sans modèle imposé.

## Niveau de modèle
Conversation : petit aux étapes 0 à 5 et 8 ; métier à l'étape 6 et à la mise en boutique ; métier aux moments forts s'ils sont allumés ; relectrice des réponses : petit. Marque : fort pour idées, composition, juge, planches, directeur de création, consignes d'images ; métier pour étude, équipes de noms, vérification, illustratrice, relecture des images. Angles : juge et reprise au fort. Thème sur mesure : fort pour conception, textes, relectures, photos ; petit pour les regards en image et le contrôle des galeries. Publications : fort attendu par le routeur central.

## Exemples d'essai dans les consignes
- Envoyé à l'IA : brand-references.ts (lignes 148 à 168 : Tintamarre, Morceaux Choisis, Gorgée, Fruit Nu, Pulpe, Zeste, Haut les Pêches…, « infusions de fruits ») injecté par brand-prompts.ts (30 à 34, 46, 181 à 189) ; brand-prompts.ts 243 (« Infusions de fruits à boire bien fraîches »), 334 et 374 (fourgon de toilettage), 370 (« Pelage ») ; « Éclat de thé » dans brand-references.ts 189 et 193, identities.ts 156, 332, 377 ; journey.ts 293 (« marque de thé ») ; custom-theme/brand.ts 107 et 262 ; custom-theme/gallery.ts 154 et 215 (« Thé vert bio »).
- Textes d'exemple des 95 sections à tenue (tenue.ts, tenue-produit.ts, tenue-recit.ts) : une maison de thé « Brindi ».
- Commentaires seulement : Heure Dorée, Éclat de thé, Pelage, Coussinet, Pulpe dans loop.ts, brand-images.ts, brand-chain.ts, custom-theme/*.
- Rien trouvé : prompt.ts (mais 4 « essai réel » envoyés à l'IA), posts-plan.ts, src/lib/preparation, cahiers docs/sina-savoir. ARVEN : nulle part dans SINA. Tests : 27 fichiers citent ces projets.

## Parcours aujourd'hui
0 start.* (aucune tâche, ouverte, vraie IA oui) ; 1 identity.propose/.images/.choose (syna.brand, ouverte, plusieurs essais réels) ; 2 logo.propose/.choose (syna.logos, ouverte, 3 logos libres oui, reprise du logo de planche simulée) ; 3 brand.kit (sans IA) ; 4 angles.propose/.choose, pilot.answer (project.prepare, recherche oui, juge et trois angles simulés) ; 5 activity.*, catalogue.create, services.profile (sans IA) ; 6 site.mode, theme.*, custom.* (17 outils), gallery.* (shop.direction, syna.custom.brand, syna.product.gallery ; ancienne version oui, tenue et spécialistes simulés) ; 7 custom.install, site.code_from_mockup, site.images (syna.mockup.code ; site codé oui, mise en boutique jamais dans une vraie boutique) ; 8 theme.images, theme.brand, theme.validate (syna.studio.brand ; non établi) ; 9 posts.* (fermée, simulée) ; 10 ads.* (fermée, simulée) ; 11 calendar.* (fermée, sans IA) ; 12 blog.* (fermée, simulée) ; 13 files.* (fermée, sans IA).

## Moteurs hors domaine à garder
src/lib/preparation et marketing-strategy (angles), logo-v2, media/ et engine/brand (logo, charte), theme/ et engine/shop (thèmes du Studio, rendu, contrôle), image-v2 et ai/media-providers, social-v2, ads-v2, ad-doc, engine/blog, products/catalog, client-wording, people-policy, plan-gates, jobs, ai/llm, ai/trace, ai/web-search, orchestrator/router.ts et policy.ts. Dans l'autre sens : image-v2/art-direction.ts lit syna-agent/section-families.ts ; route-helpers.ts lit construction.ts.

## Code mort
custom-theme/starters.ts (deux tests seulement) ; mockup-code/index.ts (aucun import). Le reste non vérifié.

## Surprises
1. SINA fermée par défaut : sans la variable serveur, le client arrive sur les onglets et le Pilote.
2. La relectrice des réponses tourne sur le petit modèle.
3. Étapes 9 à 13 : aucun modèle imposé, le routeur prendrait le plus fort, coût jamais mesuré.
4. logos.ts (singleLogoPrompt) dit encore « Pars de ce dessin » : la correction du 14 novembre n'est que dans brand-images.ts.
5. prompt.ts dit l'étape 7 « pas encore disponible » alors que journey.ts demande custom.install.
6. Aucun outil de SINA n'enregistre le vocabulaire du client (addWordingRule).
7. L'accroche d'exemple « Pose ton écran » des sections à tenue a déjà été gardée mot pour mot dans un essai (custom-theme/brand.ts 574) : même risque que la vague de Pulpe.
8. images.generate (« photos libres de droits d'abord ») et les outils du calendrier restent proposés à SINA, même étape fermée.
9. Réglages nommés tantôt sina., tantôt syna.

## Non vérifié
Valeurs réelles des réglages en base ; niveau des appels sans modèle imposé, moteur de logos, aiShopCopyChecked ; essai réel de l'étape 8 et du logo unique ; contenu des 73 fichiers de test de SINA ; syna-thread.tsx et brand-boards.tsx lus en partie ; docs/syna/PARCOURS-CREATION.md et EXIGENCES-PROPRIETAIRE.md non lus.
