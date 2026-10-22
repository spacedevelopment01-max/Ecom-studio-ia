# Réception #160 — preuves consultables

Code applicatif compilé : **`6b7fe5e2671e5567f8482fe2ef2c0f7f26527832`**. [Rapport complet](../../docs/coordination/ISSUE_160_RESULTATS.md). [PR #161](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/161).

Ces captures et enregistrements proviennent d’un **vrai navigateur Chromium**, sur le serveur de production local, avec deux comptes et projets fictifs. Les illustrations sont des images de test dérivées de SVG, pas des photographies de fournisseur. Les transports IA sont interdits. Aucun résultat client, appel payant, publication ou déploiement. Le studio du Codespace n’a pas été mis à jour.

## Quatre pages, ordinateur et mobile

Les liens « page complète » conservent la résolution originale ; télécharger l’image pour lire les longs défilements. Les premiers écrans offrent une vue immédiatement lisible.

| Page | Ordinateur | Mobile |
|---|---|---|
| Produit — accueil, angle expression | [Premier écran](produit-expression-premier-ecran.jpg) · [Page complète](produit-expression-theme-desktop.jpg) | [Premier écran](produit-expression-premier-ecran-mobile.jpg) · [Page complète](produit-expression-theme-mobile.jpg) |
| Produit — fiche | [Premier écran](produit-detail-premier-ecran-desktop.jpg) · [Page complète](produit-detail-desktop.jpg) | [Premier écran](produit-detail-premier-ecran-mobile.jpg) · [Page complète](produit-detail-mobile.jpg) |
| Services — accueil général | [Premier écran](service-expression-premier-ecran.jpg) · [Page complète](service-expression-theme-desktop.jpg) | [Premier écran](service-expression-premier-ecran-mobile.jpg) · [Page complète](service-expression-theme-mobile.jpg) |
| Services — prestations | [Premier écran](service-detail-premier-ecran-desktop.jpg) · [Page complète](service-detail-desktop.jpg) | [Premier écran](service-detail-premier-ecran-mobile.jpg) · [Page complète](service-detail-mobile.jpg) |

## Choix, coexistence et interactions

- Cinq propositions : [produit ordinateur](produit-5-angles-desktop.jpg), [produit mobile](produit-5-angles-mobile.jpg), [services ordinateur](service-5-angles-desktop.jpg), [services mobile](service-5-angles-mobile.jpg).
- Produit avant transition, angle usage : [ordinateur](produit-usage-theme-desktop.jpg), [mobile](produit-usage-theme-mobile.jpg). Comparer avec expression ci-dessus et les [textes structurés complets](exemples-avant-apres.json).
- Services : [sélecteur du calendrier A](service-selecteur-calendrier-A.jpg), [sélecteur B](service-selecteur-calendrier-B.jpg). Le [reçu navigateur](navigateur.json) atteste le même thème, version 1, sous A et B ; les publications gardent leur propre identifiant d’angle.
- [Zoom de fiche produit](produit-zoom.jpg), [panier local](produit-panier.jpg), [contact mobile](service-contact-mobile.jpg). Ces interactions ne prouvent ni un paiement CMS ni un rendez-vous envoyé.
- [Devis produit affiché sans confirmation payante](produit-expression-devis-sans-depense.jpg), [inventaire de transition](produit-expression-impact.jpg).
- Défaut observé et corrigé : [capture intermédiaire avant correction des descriptions de médias](avant-correction-description-media.jpg), issue du build `2460c1c4`. Après : pages finales ci-dessus. Les descriptions d’accessibilité ne remplacent plus les titres commerciaux acquis. [Ordre et types des sections conservés](composition-verifiee.json).

## Vidéos réelles

Lors des changements de largeur dans le studio, le cadre vidéo fixe peut montrer une zone grise hors du viewport mobile ; les captures mobiles conservent leur format portrait complet. Les MP4 sont des transcodages H.264 des WebM originaux du navigateur, sans remontage des interactions. Clic droit/enregistrer pour télécharger ; GitHub peut proposer le téléchargement plutôt qu’une lecture intégrée. [Durées et codecs vérifiés](videos-verifiees.json).

| Parcours | Téléchargement direct |
|---|---|
| Studio produit : choix, préparation, devis, activation et reprise | [MP4](produit-parcours.mp4) · [WebM original](produit-parcours.webm) |
| Studio services : site général et communications A/B | [MP4](service-parcours.mp4) · [WebM original](service-parcours.webm) |
| Produit usage : aperçu et défilement | [MP4](produit-usage-theme.mp4) · [WebM original](produit-usage-theme.webm) |
| Produit expression : aperçu, fiche, zoom et panier | [MP4](produit-expression-theme.mp4) · [WebM original](produit-expression-theme.webm) |
| Services sous A : aperçu général | [MP4](service-usage-theme.mp4) · [WebM original](service-usage-theme.webm) |
| Services sous B : site conservé et contact | [MP4](service-expression-theme.mp4) · [WebM original](service-expression-theme.webm) |

## Exports natifs téléchargés

| Plateforme | Produit | Services |
|---|---|---|
| Shopify | [ZIP](produit-shopify.zip) | [ZIP](service-shopify.zip) |
| WooCommerce | [ZIP](produit-woocommerce.zip) | [ZIP](service-woocommerce.zip) |
| PrestaShop | [ZIP](produit-prestashop.zip) | [ZIP](service-prestashop.zip) |

[Intégrité des six archives](exports-verifies.json) · [Inventaire des 34 templates Shopify exportés](sections-exportees.json). Validation de fichiers uniquement : aucune installation CMS, commande, paiement, remise/cadeau côté serveur ou formulaire envoyé. Les adaptateurs et avertissements des plateformes restent nécessaires ; une composition Shopify ne garantit pas un rendu identique dans chaque CMS.

## État réel et limites visuelles

Les résultats restent **partiels**, explicitement dans le reçu et l’interface : images illustrées de test, absence de certaines preuves commerciales authentiques, sections de témoignages masquées plutôt qu’inventées. L’inspection a aussi constaté une fiche produit longue avec de nombreuses images et quelques formulations répétées ; la conservation des textes exacts fournis n’est pas une certification de leur qualité rédactionnelle. Les finitions et quatre thèmes supplémentaires de Claude #159 ne sont pas intégrés à cette base de sept thèmes. Cette réception vérifie les raccords et la conservation des compositions, pas la validation visuelle finale des onze démonstrations.

La recette couvre les routes, files et handlers natifs, avec exécution déterministe des seules tâches fictives concernées. Le worker général et les envois extérieurs sont arrêtés. Le mode fournisseur réel, les factures et la qualité créative IA ne sont pas testés.

[Revue des huit vues et mouvement réduit](revue-visuelle.json) · [Publications unitaires A/B protégées](communications-unitaires.json) · [CI verte](ci-verifiee.json) · [Résumé et commandes](resume.json) · [Reçu du navigateur](navigateur.json) · [Exemples de stratégie/SEO/publications/thème](exemples-avant-apres.json) · [Contrôle de publication](controle-publication.json) · [Empreintes des fichiers](manifest-sha256.json).
