# SYNA #301 — matrice de vérité actualisée

84 opérations,25domaines :68entrées de catalogue et16compléments natifs.53statuts SYNA PARTIEL,29ABSENT,2NON_TESTE. Aucun statut PARTIEL ne vaut parité complète. Les preuves restent attribuées à leur SHA propre; le replay et la CI de cette nouvelle convergence sont à lire dans la PR au commit exact.

La [matrice CSV](MATRICE-PARITE-301.csv) conserve pour chaque opération route/worker,demande,coût/accord,version,critère,scope,preuves,causes et limites. Le [compte rendu de livraison](LIVRAISON-CONVERGENCE-FINALE.md) décrit les correctifs339–347 et les décisions encore ouvertes.

| Domaine | Opération | Natif | SYNA | Priorité | Source de preuve abrégée |
|---|---|---|---|---|---|
| C02 | `brief.update` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C09 | `offer.analyse` | NON_TESTE | NON_TESTE | P2 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C09 | `research.generate` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C09 | `research.approve` | NON_TESTE | ABSENT | P2 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C09 | `proposal.compare` | NON_TESTE | ABSENT | P2 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C09 | `proposal.choose` | NON_TESTE | ABSENT | P2 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C09 | `strategy.compare` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C09 | `strategy.preference` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C10 | `brand.confirm` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C10 | `brand.generate` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C10 | `brand.correct` | NON_TESTE | NON_TESTE | P2 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C11 | `logo.generate` | PARTIEL | PARTIEL | P0 coût / P2 raccord | eda4de594027e48eb45fe9e654eb443907494c2a;5fd100d8129f352f5bf… |
| C11 | `logo.replace` | PARTIEL | PARTIEL | P0 coût / P2 raccord | eda4de594027e48eb45fe9e654eb443907494c2a |
| C13 | `images.upload` | NON_TESTE | ABSENT | P2 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C13 | `images.search` | NATIF_OK | ABSENT | P2 | 4b109255e37da300251cc7825b09cd48aa582a1c |
| C13 | `images.generate` | PARTIEL | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;29a21dc359b8da48945… |
| C13 | `images.correct` | PARTIEL | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;785d516ffab9fef457a… |
| C14 | `videos.motion` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.restore` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.plan` | NON_TESTE | ABSENT | P2 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C14 | `videos.retake` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.voice` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.generate` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C14 | `videos.edit` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C12 | `catalogue.read` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;b80b48ff391878abd55… |
| C12 | `catalogue.create` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;b80b48ff391878abd55… |
| C12 | `catalogue.update` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;b80b48ff391878abd55… |
| C12 | `catalogue.stock` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;b80b48ff391878abd55… |
| C12 | `catalogue.sync` | NATIF_OK | ABSENT | P2 | b80b48ff391878abd5544b95917b5e9f97297938;46ed3bb71a4536d671b… |
| C21 | `services.update` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C21 | `properties.update` | NATIF_OK | PARTIEL | P2 | baeafcbc7afbdf899f753f4c25fe7650a932b4ad;f3c1dc151a3916ca308… |
| C21 | `menu.update` | NATIF_OK | PARTIEL | P2 | baeafcbc7afbdf899f753f4c25fe7650a932b4ad;f3c1dc151a3916ca308… |
| C21 | `projects.update` | NATIF_OK | PARTIEL | P2 | baeafcbc7afbdf899f753f4c25fe7650a932b4ad;f3c1dc151a3916ca308… |
| C22 | `services.booking` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C22 | `site.requests` | NATIF_OK | PARTIEL | P2 | 81559e121ff6d61762ab864130c33879f1cbf800 |
| C23 | `site.host.publish` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P3 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C23 | `site.domain.connect` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P3 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C22 | `appointments.settings` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C22 | `appointments.create` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C22 | `appointments.cancel` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C06 | `theme.select` | NON_TESTE | ABSENT | P1 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C05 | `theme.exact-edit` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;c6b6fa811f5f1d8b615… |
| C06 | `theme.compose` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C06 | `theme.original` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C05 | `theme.undo` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;c6b6fa811f5f1d8b615… |
| C08 | `theme.capture` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C08 | `theme.export` | NATIF_OK | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C23 | `theme.publish` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P3 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C15 | `copy.generate` | PARTIEL | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;c966be77928c3d8d746… |
| C15 | `copy.edit` | PARTIEL | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;9e9a75e14cab9c05cce… |
| C15 | `seo.update` | NATIF_OK | PARTIEL | P2 | b6e2a1f5cd446397c914be8feabf59f4a6f4763e |
| C15 | `blog.generate` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C15 | `blog.edit` | NATIF_OK | PARTIEL | P2 | e23711db58510b4571c3a263b5b8ef638751e186 |
| C15 | `blog.publish` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C16 | `social.plan` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C16 | `social.draft` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C17 | `social.generate` | PARTIEL | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;07a285fc402d7586f7e… |
| C16 | `social.publish` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C16 | `calendar.update` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C18 | `campaign.draft` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C18 | `ads.create` | NATIF_OK | PARTIEL | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C18 | `ads.launch` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C24 | `prompts.edit` | NON_TESTE | ABSENT | P3 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C24 | `files.organize` | NATIF_OK | PARTIEL | P3 | a3efbfbaf86b0639f2a118818b303b42355d9f79;c6b6fa811f5f1d8b615… |
| C24 | `files.delete` | NON_TESTE | ABSENT | P3 | b515d5c7cf726f0d6a68244ab896bed46f2f1d92 |
| C23 | `connections.configure` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P3 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C01 | `conversation.persist` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C01 | `conversation.attachments` | PARTIEL | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C03 | `conversation.resume-existing` | NATIF_OK | PARTIEL | P0 | c6b6fa811f5f1d8b615c0110d2cd9cd053e3255d |
| C04 | `context.selection-revalidated` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;ad5bffe6d0cf5b477e3… |
| C04 | `context.mode-switch` | NATIF_OK | PARTIEL | P0 | 5fd100d8129f352f5bf19c70da501be3e71b7b78;ad5bffe6d0cf5b477e3… |
| C07 | `native.pages` | PARTIEL | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C07 | `native.sections` | PARTIEL | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C07 | `native.custom-theme` | PARTIEL | PARTIEL | P1 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C19 | `native.ad-document-edit` | PARTIEL | PARTIEL | P0 | 5287f2e3ea6e014189571b9a304e97bd3ba24bc1 |
| C19 | `native.ad-regenerate` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P0 bug / P2 raccord | b92311b6aedc2761a1db1e9eed50d9fdda3e853b |
| C20 | `native.initial-batch` | NATIF_OK | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C25 | `native.workflow` | PARTIEL | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C25 | `native.brand-propagation` | PARTIEL | ABSENT | P2 | 5fd100d8129f352f5bf19c70da501be3e71b7b78 |
| C12 | `native.stock.patch-target-version` | NATIF_OK | PARTIEL | P0 | b80b48ff391878abd5544b95917b5e9f97297938;46ed3bb71a4536d671b… |
| C15 | `native.seo.metadata-only-delivery` | NATIF_OK | PARTIEL | P1 | b6e2a1f5cd446397c914be8feabf59f4a6f4763e |
| C24 | `native.prompt-run` | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | P0 | tree:9268486f21ff650d3faa55e1051bb477f006220a;f4b74f53b450ed… |
| C24 | `native.files.classify` | PARTIEL | ABSENT | P0 | tree:9268486f21ff650d3faa55e1051bb477f006220a;7495a3a4389d6e… |
| C24 | `prompts.list` | NATIF_OK | PARTIEL | P1 | 57af974221c0c7e9354e629b76cf9c44240542dc |
