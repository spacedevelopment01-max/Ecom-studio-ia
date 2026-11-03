# Matrice canonique SYNA #301 — 84 opérations

Vague3 :54 PARTIEL,28 ABSENT,2 NON_TESTE. Aucun statut global FULL PARITY. Une seule promotion de ligne : services.update, horaires du profil uniquement. Les autres champs et les prestations réservables restent absents. Les preuves historiques conservent leurs SHA propres ; les nouvelles recettes isolées sont attribuées au9636f000. La CI finale reste en cours au dernier relevé.

[Rapport et limites de vague3](wave3/README.md) · [CSV complet : sources, scopes, finances, preuves et limites](MATRICE-PARITE-301.csv). Les captures demeurent locales en attente d’accord direct exigé par le contrôle automatique.

| Capacité | Opération | Natif | SYNA | Exécution | Priorité | Correctifs |
|---|---|---|---|---|---|---|
| C02 | brief.update | NATIF_OK | PARTIEL | PASSE_SCOPE | P1 |  |
| C09 | offer.analyse | NON_TESTE | NON_TESTE | NON_TESTE | P2 |  |
| C09 | research.generate | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C09 | research.approve | NON_TESTE | ABSENT | NON_RACCORDE | P2 |  |
| C09 | proposal.compare | NON_TESTE | ABSENT | NON_RACCORDE | P2 |  |
| C09 | proposal.choose | NON_TESTE | ABSENT | NON_RACCORDE | P2 |  |
| C09 | strategy.compare | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C09 | strategy.preference | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C10 | brand.confirm | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C10 | brand.generate | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C10 | brand.correct | NON_TESTE | NON_TESTE | NON_TESTE | P2 |  |
| C11 | logo.generate | PARTIEL | PARTIEL | PASSE_SCOPE | P0 coût / P2 raccord | #315 |
| C11 | logo.replace | PARTIEL | PARTIEL | PASSE_SCOPE | P0 coût / P2 raccord | #315 |
| C13 | images.upload | NON_TESTE | ABSENT | NON_RACCORDE | P2 |  |
| C13 | images.search | NATIF_OK | ABSENT | CORRIGE_NATIF_NON_RACCORDE | P2 | #312 |
| C13 | images.generate | PARTIEL | PARTIEL | PASSE_SCOPE | P2 | #307;#314;#316 |
| C13 | images.correct | PARTIEL | PARTIEL | PASSE_SCOPE | P2 | #317;#318 |
| C14 | videos.motion | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C14 | videos.restore | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C14 | videos.plan | NON_TESTE | ABSENT | NON_RACCORDE | P2 |  |
| C14 | videos.retake | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C14 | videos.voice | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C14 | videos.generate | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C14 | videos.edit | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C12 | catalogue.read | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #304 |
| C12 | catalogue.create | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #304 |
| C12 | catalogue.update | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #304 |
| C12 | catalogue.stock | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #304 |
| C12 | catalogue.sync | NATIF_OK | ABSENT | PASSE_NATIF_NON_RACCORDE | P2 | #304 |
| C21 | services.update | NATIF_OK | PARTIEL | PASSE_SCOPE | P1 | #353 #355 #356 |
| C21 | properties.update | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #306;#310;#334 |
| C21 | menu.update | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #306;#310;#334 |
| C21 | projects.update | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #306;#310;#334 |
| C22 | services.booking | NATIF_OK | ABSENT | PASSE_NATIF_NON_RACCORDE | P2 |  |
| C22 | site.requests | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #308;#319 |
| C23 | site.host.publish | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_CONNEXION_OU_CONSENTEMENT | P3 |  |
| C23 | site.domain.connect | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_CONNEXION_OU_CONSENTEMENT | P3 |  |
| C22 | appointments.settings | NATIF_OK | ABSENT | PASSE_NATIF_NON_RACCORDE | P2 |  |
| C22 | appointments.create | NATIF_OK | ABSENT | PASSE_NATIF_NON_RACCORDE | P2 |  |
| C22 | appointments.cancel | NATIF_OK | ABSENT | PASSE_NATIF_NON_RACCORDE | P2 |  |
| C06 | theme.select | NON_TESTE | ABSENT | NON_RACCORDE | P1 |  |
| C05 | theme.exact-edit | NATIF_OK | PARTIEL | PASSE_SCOPE | P0 | #313 |
| C06 | theme.compose | NATIF_OK | PARTIEL | PASSE_SCOPE | P1 |  |
| C06 | theme.original | NATIF_OK | PARTIEL | PASSE_SCOPE | P1 |  |
| C05 | theme.undo | NATIF_OK | PARTIEL | PASSE_SCOPE | P0 | #313 |
| C08 | theme.capture | NATIF_OK | PARTIEL | PASSE_SCOPE | P1 |  |
| C08 | theme.export | NATIF_OK | PARTIEL | PASSE_SCOPE | P1 |  |
| C23 | theme.publish | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_CONNEXION_OU_CONSENTEMENT | P3 |  |
| C15 | copy.generate | PARTIEL | PARTIEL | CORRIGE_MEMO_LOCAL_PAYANT_GARDE | P0 | #325 |
| C15 | copy.edit | PARTIEL | PARTIEL | CORRIGE_LOCAL_FALLBACK_BLOQUE | P0 | #321 |
| C15 | seo.update | NATIF_OK | PARTIEL | CORRIGE_CIBLE | P2 | #303 |
| C15 | blog.generate | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #349 #356 |
| C15 | blog.edit | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 | #309 ; #349 #356 |
| C15 | blog.publish | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_CONNEXION_OU_CONSENTEMENT | P2 |  |
| C16 | social.plan | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C16 | social.draft | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C17 | social.generate | PARTIEL | PARTIEL | CORRIGE_GARDE_SCOPE | P0 | #320 |
| C16 | social.publish | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_CONNEXION_OU_CONSENTEMENT | P2 |  |
| C16 | calendar.update | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_CONNEXION_OU_CONSENTEMENT | P2 |  |
| C18 | campaign.draft | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C18 | ads.create | NATIF_OK | PARTIEL | PASSE_SCOPE | P2 |  |
| C18 | ads.launch | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_CONNEXION_OU_CONSENTEMENT | P2 |  |
| C24 | prompts.edit | NON_TESTE | ABSENT | NON_RACCORDE | P3 |  |
| C24 | files.organize | NATIF_OK | PARTIEL | PASSE_SCOPE | P3 | #305;#313 |
| C24 | files.delete | NON_TESTE | ABSENT | NON_RACCORDE | P3 |  |
| C23 | connections.configure | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_CONNEXION_OU_CONSENTEMENT | P3 |  |
| C01 | conversation.persist | NATIF_OK | PARTIEL | PASSE_SCOPE | P0 |  |
| C01 | conversation.attachments | PARTIEL | PARTIEL | PASSE_SCOPE | P0 |  |
| C03 | conversation.resume-existing | NATIF_OK | PARTIEL | PASSE_SCOPE | P0 | #305;#313 |
| C04 | context.selection-revalidated | NATIF_OK | PARTIEL | PASSE_SCOPE | P0 |  |
| C04 | context.mode-switch | NATIF_OK | PARTIEL | PASSE_SCOPE | P0 |  |
| C07 | native.pages | PARTIEL | PARTIEL | PASSE_SCOPE | P1 |  |
| C07 | native.sections | PARTIEL | PARTIEL | PASSE_SCOPE | P1 | #350 #356 |
| C07 | native.custom-theme | PARTIEL | PARTIEL | PASSE_SCOPE | P1 |  |
| C19 | native.ad-document-edit | PARTIEL | PARTIEL | PASSE_SCOPE | P0 | #323;#333;#336;#337;#345;#347 |
| C19 | native.ad-regenerate | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_GARDE_FINANCIERE | P0 bug / P2 raccord | #318 ; #351 #356 |
| C20 | native.initial-batch | NATIF_OK | ABSENT | PASSE_NATIF_NON_RACCORDE | P2 |  |
| C25 | native.workflow | PARTIEL | ABSENT | PASSE_NATIF_NON_RACCORDE | P2 |  |
| C25 | native.brand-propagation | PARTIEL | ABSENT | PASSE_NATIF_NON_RACCORDE | P2 |  |
| C12 | native.stock.patch-target-version | NATIF_OK | PARTIEL | CORRIGE_CIBLE | P0 | #304 |
| C15 | native.seo.metadata-only-delivery | NATIF_OK | PARTIEL | CORRIGE_CIBLE | P1 | #303 |
| C24 | native.prompt-run | BLOQUE_CONNEXION_OU_CONSENTEMENT | ABSENT | BLOQUE_GARDE_FINANCIERE | P0 | #324 |
| C24 | native.files.classify | PARTIEL | ABSENT | CORRIGE_LOCAL_REGLES_SEULES | P0 | #322 |
| C24 | prompts.list | NATIF_OK | PARTIEL | PASSE_SCOPE | P1 | #335;#344 |
