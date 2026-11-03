# SYNA #301 — matrice de vérité après qualification finale

84 opérations /25 domaines :68 catalogue+16 compléments.53 PARTIEL,29 ABSENT,2 NON_TESTE. Aucun PARTIEL ne vaut parité complète.

Code e2d8c8ed91fbb0d20cad93e3db1470e1045f5654, arbre 05d7662011c215adef50f948cd10c51a944e6892, [CI41613393869](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41613393869) entièrement verte :5302 tests réussis,31 ignorés préexistants;573 fichiers réussis,1 ignoré préexistant;types,Docker,confirmation gratuite obligatoire et69 étapes natives réussis. Cette régression globale ne remplace pas la preuve individuelle de chaque variante.

Recette commune exacte :16 cas(14 interactifs+2 historiques lecture seule),75 captures,4 PNG natifs,12 traces,91 empreintes vérifiées. Les six opérations détaillées ci-dessous ont un replay ciblé sur la convergence;les autres preuves gardent leur source historique. Aucun statut métier ni limite restante promu automatiquement par la CI.

La [matrice CSV](MATRICE-PARITE-301.csv) est la référence détaillée;[CI](final-proof/CI-e2d8c8ed.json),[recettes et captures](final-proof/README.md),[livraison](LIVRAISON-CONVERGENCE-FINALE.md).

- `native.ad-document-edit` : 4 cas Encre/Plein1440/390 : sélection enregistrée+A2,17s+GET projet,avant/après,annulation persistante,reload,réponse perdue après enqueue,1 job gratuit/version/média,PNG et reçu rechargé;uniquement title-larger.
- `prompts.list` : 4 cas Encre/Plein1440/390 : métadonnées20/446,favori/reload,clarification,titre hostile littéral,aucun corps/run/édition,aucune notice ou CTA payante.
- `properties.update` : Description exacte immobilier,Encre1440,aperçu/accord gratuit,reçu,éditeur natif et reload;pas tous les champs.
- `menu.update` : Description exacte restaurant,Encre390,projet fictif publié,aperçu/accord gratuit,reçu,éditeur natif et reload;pas tous les champs.
- `projects.update` : Réalisation work exacte,Plein1440/390,ambiguïté sans mutation,aperçu/accord gratuit,reçu,éditeur natif et reload;pas tous les champs.
- `context.selection-revalidated` : B1 script inchangé : produit+service,17s réels après revalidation et vrai refresh,restauration/réseau/droits/interprojet;2 cas A1 historiques lecture seule distincts.

| Domaine | Opération | Natif | SYNA | Priorité | Preuve individuelle |
|---|---|---|---|---|---|
| C02 | `brief.update` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C09 | `offer.analyse` | NON_TESTE | NON_TESTE | P2 | non individualisée |
| C09 | `research.generate` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C09 | `research.approve` | NON_TESTE | ABSENT | P2 | non individualisée |
| C09 | `proposal.compare` | NON_TESTE | ABSENT | P2 | non individualisée |
| C09 | `proposal.choose` | NON_TESTE | ABSENT | P2 | non individualisée |
| C09 | `strategy.compare` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C09 | `strategy.preference` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C10 | `brand.confirm` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C10 | `brand.generate` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C10 | `brand.correct` | NON_TESTE | NON_TESTE | P2 | non individualisée |
| C11 | `logo.generate` | PARTIEL | PARTIEL | P0 coût / P2 raccord | eda4de594027…5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C11 | `logo.replace` | PARTIEL | PARTIEL | P0 coût / P2 raccord | eda4de594027e48eb45fe9e654eb443907494c2a |
| C13 | `images.upload` | NON_TESTE | ABSENT | P2 | non individualisée |
| C13 | `images.search` | NATIF_OK | ABSENT | P2 | 4b109255e37da300251cc7825b09cd48aa582a1c |
| C13 | `images.generate` | PARTIEL | PARTIEL | P2 | 5fd100d8129f…645851e280a9b797858afc20c713429d7248ffb6 |
| C13 | `images.correct` | PARTIEL | PARTIEL | P2 | 5fd100d8129f…785d516ffab9fef457a8f8311ef9855ba397520d |
| C14 | `videos.motion` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.restore` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.plan` | NON_TESTE | ABSENT | P2 | non individualisée |
| C14 | `videos.retake` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.voice` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.generate` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.edit` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C12 | `catalogue.read` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f…46ed3bb71a4536d671b1ff048d6716084d977e2f |
| C12 | `catalogue.create` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f…46ed3bb71a4536d671b1ff048d6716084d977e2f |
| C12 | `catalogue.update` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f…46ed3bb71a4536d671b1ff048d6716084d977e2f |
| C12 | `catalogue.stock` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f…46ed3bb71a4536d671b1ff048d6716084d977e2f |
| C12 | `catalogue.sync` | NATIF_OK | ABSENT | P2 | b80b48ff3918…46ed3bb71a4536d671b1ff048d6716084d977e2f |
| C21 | `services.update` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C21 | `properties.update` | NATIF_OK | PARTIEL | P2 | baeafcbc7afb…e2d8c8ed91fbb0d20cad93e3db1470e1045f5654 |
| C21 | `menu.update` | NATIF_OK | PARTIEL | P2 | baeafcbc7afb…e2d8c8ed91fbb0d20cad93e3db1470e1045f5654 |
| C21 | `projects.update` | NATIF_OK | PARTIEL | P2 | baeafcbc7afb…e2d8c8ed91fbb0d20cad93e3db1470e1045f5654 |
| C22 | `services.booking` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C22 | `site.requests` | NATIF_OK | PARTIEL | P2 | 81559e121ff6d61762ab864130c33879f1cbf800 |
| C23 | `site.host.publish` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P3 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C23 | `site.domain.connect` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P3 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C22 | `appointments.settings` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C22 | `appointments.create` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C22 | `appointments.cancel` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C06 | `theme.select` | NON_TESTE | ABSENT | P1 | non individualisée |
| C05 | `theme.exact-edit` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f…c6b6fa811f5f1d8b615c0110d2cd9cd053e3255d |
| C06 | `theme.compose` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C06 | `theme.original` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C05 | `theme.undo` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f…c6b6fa811f5f1d8b615c0110d2cd9cd053e3255d |
| C08 | `theme.capture` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C08 | `theme.export` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C23 | `theme.publish` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P3 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C15 | `copy.generate` | PARTIEL | PARTIEL | P0 | 5fd100d8129f…52a02981663d02940ab81439a39c023144f8395b |
| C15 | `copy.edit` | PARTIEL | PARTIEL | P0 | 5fd100d8129f…9e9a75e14cab9c05cce538d7bab62c283039f748 |
| C15 | `seo.update` | NATIF_OK | PARTIEL | P2 | b6e2a1f5cd446397c914be8feabf59f4a6f4763e |
| C15 | `blog.generate` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C15 | `blog.edit` | NATIF_OK | PARTIEL | P2 | e23711db58510b4571c3a263b5b8ef638751e186 |
| C15 | `blog.publish` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C16 | `social.plan` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C16 | `social.draft` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C17 | `social.generate` | PARTIEL | PARTIEL | P0 | 5fd100d8129f…07a285fc402d7586f7e4ffb9de2a5a4d9b4ded26 |
| C16 | `social.publish` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C16 | `calendar.update` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C18 | `campaign.draft` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C18 | `ads.create` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C18 | `ads.launch` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C24 | `prompts.edit` | NON_TESTE | ABSENT | P3 | non individualisée |
| C24 | `files.organize` | NATIF_OK | PARTIEL | P3 | a3efbfbaf86b…6fd996637611c929ba9dfe258a320435dfe62f2f |
| C24 | `files.delete` | NON_TESTE | ABSENT | P3 | non individualisée |
| C23 | `connections.configure` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P3 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C01 | `conversation.persist` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C01 | `conversation.attachments` | PARTIEL | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C03 | `conversation.resume-existing` | NATIF_OK | PARTIEL | P0 | c6b6fa811f5f1d8b615c0110d2cd9cd053e3255d |
| C04 | `context.selection-revalidated` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f…e2d8c8ed91fbb0d20cad93e3db1470e1045f5654 |
| C04 | `context.mode-switch` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f…ad5bffe6d0cf5b477e3a6a927b0f0567bd3db013 |
| C07 | `native.pages` | PARTIEL | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C07 | `native.sections` | PARTIEL | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C07 | `native.custom-theme` | PARTIEL | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C19 | `native.ad-document-edit` | PARTIEL | PARTIEL | P0 | 5287f2e3ea6e…e2d8c8ed91fbb0d20cad93e3db1470e1045f5654 |
| C19 | `native.ad-regenerate` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P0 bug / P2 raccord | b92311b6aedc2761a1db1e9eed50d9fdda3e853b |
| C20 | `native.initial-batch` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C25 | `native.workflow` | PARTIEL | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C25 | `native.brand-propagation` | PARTIEL | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C12 | `native.stock.patch-target-version` | NATIF_OK | PARTIEL | P0 | b80b48ff3918…46ed3bb71a4536d671b1ff048d6716084d977e2f |
| C15 | `native.seo.metadata-only-delivery` | NATIF_OK | PARTIEL | P1 | b6e2a1f5cd446397c914be8feabf59f4a6f4763e |
| C24 | `native.prompt-run` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P0 | tree:9268486…f4b74f53b450edf750768ccba5996f820da2ac67 |
| C24 | `native.files.classify` | PARTIEL | ABSENT | P0 | tree:9268486…7495a3a4389d6e6783172b5a81b28227cf383e85 |
| C24 | `prompts.list` | NATIF_OK | PARTIEL | P1 | 57af974221c0…e2d8c8ed91fbb0d20cad93e3db1470e1045f5654 |
