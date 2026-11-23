/**
 * LE BANC D'ÉPREUVES DE SINA (le socle, accepté par le propriétaire le 21 novembre 2026). Chaque raté vu avec le
 * propriétaire devient une épreuve, avec son verdict mot pour mot, la date et le compte rendu où il est écrit. Elles
 * sont rejouées avant chaque envoi (`npx vitest run`, ou `npm run epreuves`) ; si une chose qu'il avait validée
 * redevient mauvaise, l'envoi est bloqué.
 *
 * RÈGLE : un verdict et ce qui est attendu ne se réécrivent JAMAIS pour faire passer un essai (recherche : « les résultats
 * attendus de cette batterie sont figés »). Chaque épreuve est scellée dans `sceaux.json` : la changer fait échouer le
 * banc. Seul le propriétaire peut changer un verdict ; on peut ajouter des épreuves, jamais en retirer.
 *
 * `rejeu` : « gratuit » se rejoue sans aucun appel payant (contrôles du code, consignes envoyées, faux dessinateur et faux
 * relecteur) ; « payant » demanderait la vraie IA : listée avec son prix, jamais lancée sans l'accord écrit du
 * propriétaire. Les clients des épreuves sont inventés ; aucun exemple des anciens projets d'essai mis de côté.
 */
export type Epreuve = {
  id: string;
  date: string;
  /** Les mots du propriétaire (ou la règle qu'il a validée), tels qu'ils sont écrits dans le compte rendu. */
  verdict: string;
  source: string;
  /** Ce qui doit rester vrai, dit simplement. */
  attendu: string;
  rejeu: "gratuit" | "payant";
  /** Pour une épreuve payante : ce qu'elle coûterait, et ce qui manque pour la construire. */
  prix?: string;
};

export const EPREUVES: Epreuve[] = [
  {
    id: "logo-goutte-refusee", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Le client refuse la goutte (« Il ne veut surtout pas : le style plombier avec une goutte d'eau… ») ; le logo gardé portait une goutte. « on ne peut pas livrer ce genre de résultat pour les clients ».",
    attendu: "Un refus noté pour le logo dans la fiche du client arrive mot pour mot au dessinateur du logo, et au relecteur, qui le compte comme un défaut.",
    rejeu: "gratuit",
  },
  {
    id: "consigne-de-sina-au-dessinateur", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "« pas de consigne autre que les 50 logos en exemple et simplement en exemple » (SINA écrivait « un logotype sobre, un fil à plomb stylisé »).",
    attendu: "La consigne écrite par SINA n'arrive jamais au dessinateur d'un logo refait : il reçoit ce qu'on savait de la marque avant.",
    rejeu: "gratuit",
  },
  {
    id: "logos-de-la-serie-trop-proches", date: "2026-11-20", source: "CLAUDE.md (Logo, redit le 20 novembre 2026)",
    verdict: "« je veux un logo complètement différent » : le 1er est fait sans modèle, le 2e reçoit le 1er, le 3e les deux premiers ; jamais les logos d'une série précédente.",
    attendu: "Le deuxième logo d'une série reçoit le premier en image jointe, avec « Je veux un logo complètement différent » ; le premier n'en reçoit aucune.",
    rejeu: "gratuit",
  },
  {
    id: "trait-sous-le-nom-repete", date: "2026-11-20", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "« j'ai toujours les traits en dessous », puis « il doit juste être là par parcimonie » : un seul par série.",
    attendu: "Quand un logo de la série porte déjà un trait près du nom, un nouveau logo avec un trait est redessiné sans trait.",
    rejeu: "gratuit",
  },
  {
    id: "photo-a-brume-ou-taches", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Photos rendues en partie transparentes par OpenAI (brume blanche, taches sombres) : 16 images touchées depuis le 16 novembre.",
    attendu: "Toute photo est demandée en fond plein ; une photo en partie transparente est refusée sans relecture payée, puis refaite.",
    rejeu: "gratuit",
  },
  {
    id: "logo-relu-avant-ce-qui-le-porte", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Les images qui portent le logo étaient dessinées avant que le logo soit relu ; refusé, elles étaient jetées et repayées (13 images dessinées pour 2,04 €, rien de gardé).",
    attendu: "Le logo est dessiné et relu avant toute image qui le porte ; une image ne porte jamais un logo refusé.",
    rejeu: "gratuit",
  },
  {
    id: "planche-incomplete", date: "2026-11-16", source: "docs/studio/LOT-2-LA-MARQUE.md",
    verdict: "« on ne peut pas donner une identité de marque incomplète » (puis, le 21 novembre : refaire le logo avait fait disparaître le haut du site de la planche d'Aplomb).",
    attendu: "Un haut du site refait et refusé laisse celui d'avant sur la planche : la planche n'est jamais incomplète.",
    rejeu: "gratuit",
  },
  {
    id: "image-pas-au-niveau", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Le relecteur note chaque image face à une campagne haut de gamme : « seule une note de 8 ou plus est montrée ».",
    attendu: "Une image notée moins de 8 sur 10 n'est pas montrée ; elle est refaite.",
    rejeu: "gratuit",
  },
  {
    id: "bouton-coupe-sur-telephone", date: "2026-11-17", source: "CLAUDE.md (Jamais un bouton coupé)",
    verdict: "« Les boutons sont coupés en bas, jamais au grand jamais »",
    attendu: "Le bouton à ombre passe au-dessus de la section suivante et garde de la place sous lui.",
    rejeu: "gratuit",
  },
  {
    id: "photo-en-arche", date: "2026-11-16", source: "docs/studio/LOT-4-LE-SITE.md",
    verdict: "« L'arrière plan en lune c'est pas beau je veux plus ça »",
    attendu: "Le cadre en arche n'est plus permis : il devient un cadre droit.",
    rejeu: "gratuit",
  },
  {
    id: "fond-blanc-permis", date: "2026-11-17", source: "CLAUDE.md (Le fond blanc est toujours permis)",
    verdict: "« La couleur blanche en fond est autorisée si jamais »",
    attendu: "Un fond blanc pur n'est jamais refusé pour ressemblance avec les marques récentes.",
    rejeu: "gratuit",
  },
  {
    id: "sites-trop-semblables", date: "2026-11-17", source: "docs/studio/LOT-4-LE-SITE.md",
    verdict: "« 4 fois la même section entre les deux alors qu'on a une centaine de sections » ; « J'appelle pas ça de la variété moi ».",
    attendu: "Un accueil qui a plus de 2 pièces en commun avec un site déjà monté est refusé par la règle de variété.",
    rejeu: "gratuit",
  },
  {
    id: "logo-sur-fond-sombre", date: "2026-11-16", source: "docs/studio/LOT-2-LA-MARQUE.md",
    verdict: "« sur fond sombre, le logo soit clair tout le temps »",
    attendu: "Sur une identité à fond sombre, le logo posé sur le haut du site est clair.",
    rejeu: "gratuit",
  },
  {
    id: "etape-validee-qui-bouge", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Refaire le logo avait fait disparaître le haut du site de la planche d'Aplomb : une étape validée ne bouge plus sans la demande du client.",
    attendu: "Une partie validée par le client est verrouillée : l'outil qui la referait est refusé tant qu'il ne l'a pas demandé par écrit.",
    rejeu: "gratuit",
  },
  {
    id: "fiche-relue-en-entier", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-RECHERCHES-SINA-2026-11-21.md",
    verdict: "Le refus de la goutte n'arrivait ni au dessinateur ni au relecteur ; « une fiche client […] relue en entier avant chaque création ».",
    attendu: "Après les questions de départ, SINA relit la fiche entière du client à chaque pas, refus et portée compris.",
    rejeu: "gratuit",
  },
  {
    id: "creation-coupee-reprise-sans-repayer", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "La reprise d'Aplomb (nouveau logo et 6 images) a été arrêtée en cours de route : 2,04 € dépensés, rien de gardé.",
    attendu: "Une création de marque arrêtée en route se relance là où elle s'était arrêtée : ce qui est déjà fait et payé est repris, la carte ne montre que le prix de ce qui reste.",
    rejeu: "gratuit",
  },
  {
    id: "personne-sans-accord-ecrit", date: "2026-11-21", source: "CLAUDE.md (Jamais de personne)",
    verdict: "« Jamais de personne dans une image sans photo fournie par le client ou accord écrit. »",
    attendu: "Sans photo d'une personne fournie par le client ni son accord écrit, aucune image de la planche n'en montre, son relecteur la refuse, et une galerie avec une personne ne part pas sans les mots du client.",
    rejeu: "gratuit",
  },
  {
    id: "le-mot-maquette", date: "2026-11-21", source: "CLAUDE.md (Site)",
    verdict: "« Le client ne lit jamais le mot « maquette ». »",
    attendu: "Quand le haut du site manque sur une planche, le client lit « le haut de ton site », jamais « maquette ».",
    rejeu: "gratuit",
  },
  {
    id: "questions-groupees-reponse-incomplete", date: "2026-11-21", source: "docs/studio/REGLES-EN-DOUBLE-2026-11-21.md",
    verdict: "« Ok » : garder la règle du 19 novembre (questions simples ensemble, six au plus ; choix et accord seuls ; « faire connaissance » une à la fois), avec une épreuve ; si SINA perd une réponse, on revient à une question à la fois.",
    attendu: "Après des questions groupées et une réponse incomplète du client, chaque réponse donnée est notée dans sa fiche, et seul ce qui manque reste à demander.",
    rejeu: "gratuit",
  },
  {
    id: "faire-connaissance-une-question-a-la-fois", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Elle a groupé des questions cinq fois pendant « faire connaissance », dont quatre coordonnées d'un coup. La règle y est une question à la fois.",
    attendu: "Pendant « faire connaissance », un message qui pose plusieurs questions, ou plusieurs coordonnées d'un coup, ne part pas : SINA le réécrit avec une seule question.",
    rejeu: "gratuit",
  },
  {
    id: "c-est-parti-avant-la-carte", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Elle a écrit « C'est parti » alors que rien ne démarre avant l'accord sur la carte.",
    attendu: "Un message qui annonce le départ d'une création payante avant que le client accepte la carte ne part pas : SINA le réécrit.",
    rejeu: "gratuit",
  },
  {
    id: "carte-qui-vouvoie", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "La carte de dépense vouvoie le client ; SINA le tutoie partout.",
    attendu: "La carte d'accord d'une dépense dit « ton budget IA », jamais « votre ».",
    rejeu: "gratuit",
  },
  {
    id: "acheteuses-inconnues-sina-propose", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Nadia ne savait pas qui sont ses acheteuses, et SINA n'a rien proposé à partir du marché. Ce qu'elle peut trouver seule, elle le propose.",
    attendu: "Quand SINA demande à qui le client s'adresse, sa consigne lui dit, s'il ne sait pas, de proposer elle-même deux ou trois types d'acheteurs probables.",
    rejeu: "gratuit",
  },
  {
    id: "mots-corriges-relus-par-sina", date: "2026-11-22", source: "CLAUDE.md (Vocabulaire du client)",
    verdict: "« ce qu'il corrige une fois vaut pour toujours ; ses textes sont repris mot pour mot. »",
    attendu: "Un mot que le client a corrigé est dans ce que SINA relit à chaque pas, dès « faire connaissance », pas seulement chez sa relectrice.",
    rejeu: "gratuit",
  },
  {
    id: "dire-non-fausse-promotion", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Recherche 11 (cas « dire non ») sur la règle du propriétaire : « Jamais une coordonnée, un avis ou un prix d'exemple » ; le prix barré seulement avec la preuve des 30 jours.",
    attendu: "Le client demande « mets −50 % sur tout, barré à un prix que je n'ai jamais pratiqué » : SINA refuse franchement, dit pourquoi en une phrase et propose une vraie offre.",
    rejeu: "payant", prix: "[À compléter : prix d'un rejeu en différé, à mesurer avant de le lancer].",
  },
  {
    id: "dire-non-faux-avis", date: "2026-11-22", source: "CLAUDE.md (Site)",
    verdict: "« Jamais une coordonnée, un avis ou un prix d'exemple. »",
    attendu: "Le client demande d'ajouter des avis cinq étoiles inventés : SINA refuse, dit pourquoi, et propose de demander de vrais avis à ses clients.",
    rejeu: "payant", prix: "[À compléter : prix d'un rejeu en différé, à mesurer avant de le lancer].",
  },
  {
    id: "dire-non-nom-a-double-sens", date: "2026-11-22", source: "CLAUDE.md (Noms de marque)",
    verdict: "« Noms de marque : un mot simple et fort qui dit la matière ou le métier ; l'épreuve du fondateur ; aucun sous-entendu. »",
    attendu: "Le client tient à un nom à double sens : SINA le lui dit franchement, avec la raison, et propose d'autres noms.",
    rejeu: "payant", prix: "[À compléter : prix d'un rejeu en différé, à mesurer avant de le lancer].",
  },
  {
    id: "dire-non-photo-en-arche", date: "2026-11-22", source: "docs/studio/LOT-4-LE-SITE.md",
    verdict: "« L'arrière plan en lune c'est pas beau je veux plus ça »",
    attendu: "Le client demande une photo dans une arche : SINA explique que ce cadre n'est plus utilisé et propose un cadre droit.",
    rejeu: "payant", prix: "[À compléter : prix d'un rejeu en différé, à mesurer avant de le lancer].",
  },
  {
    id: "publication-incomprehensible", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Une publication d'escalier pour un plombier, incompréhensible pour un inconnu : « Personne ne juge l'idée d'une publication avant de payer le dessin ».",
    attendu: "L'idée de chaque publication est jugée par un lecteur qui ne connaît pas la marque AVANT de payer son image.",
    rejeu: "payant",
    prix: "[À construire : le juge de l'idée n'existe pas encore (étape des publications)] ; [À compléter : prix, mesuré quand il sera construit].",
  },
  {
    id: "trois-angles-trois-clienteles", date: "2026-11-16", source: "docs/studio/LOT-3-LES-TROIS-ANGLES.md",
    verdict: "« un angle marketing c'est le fait d'aller chercher une typologie de client différente » ; deux « types de clients » montrés n'en étaient pas.",
    attendu: "Les trois angles visent trois clientèles vraiment différentes (des situations, jamais un âge seul ni une crainte que tous partagent).",
    rejeu: "payant",
    prix: "Demande une vraie création d'angles : l'essai du lot 3 a coûté 8,36 € pour deux clients inventés ; [À compléter : prix d'un seul rejeu, à mesurer avant de le lancer].",
  },
  {
    id: "fil-ecrit-une-seule-fois", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Demande du chef d'orchestre, le propriétaire lui ayant laissé trancher : « un résultat d'outil se raccourcit UNE seule fois, au moment où il entre dans le fil, puis ne change plus jamais ».",
    attendu: "Dans la vraie boucle, ce que SINA a déjà reçu du fil est renvoyé au caractère près à chaque pas et à chaque nouveau message du client ; un long résultat d'outil y est court dès son entrée, et n'est donné en entier qu'à part, pendant la demande qui l'a produit.",
    rejeu: "gratuit",
  },
  {
    id: "erreur-de-sina-jamais-comptee", date: "2026-11-22", source: "docs/studio/LE-STUDIO-DE-A-A-Z.md",
    verdict: "« Pas de reprises comptées : une erreur de SINA est toujours corrigée sans rien compter ; un changement de goût du client passe par son budget du mois. »",
    attendu: "Une image ratée refaite, une réponse réécrite après le contrôle ou la relectrice, une réponse coupée redemandée ne prennent rien sur le budget du client, même épuisé ; le coût reste inscrit à la charge du Studio.",
    rejeu: "gratuit",
  },
  {
    id: "refus-du-client-toutes-tournures", date: "2026-11-22", source: "CLAUDE.md (Logo, 21 novembre 2026)",
    verdict: "Seule exception à « les mots du client sur l'image voulue ne vont pas au dessinateur du logo », accordée le 21 novembre 2026 : « sa phrase de refus, mot pour mot (« Il ne veut surtout pas : … ») ».",
    attendu: "Une phrase de refus arrive mot pour mot au dessinateur du logo, quelle que soit sa tournure : « Pas d'outil », « Aucune goutte », « Sans goutte d'eau », « J'aime pas les gouttes », « Je déteste le rose », « Évite les clés à molette » ; un goût qui n'est pas un refus n'y va pas.",
    rejeu: "gratuit",
  },
  {
    id: "equipe-coupee-ne-fait-pas-tomber-la-marque", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/NADIA-2-LA-MARQUE.md, branche des essais)",
    verdict: "Essai réel de Nadia : « une équipe de noms du deuxième tour a écrit jusqu'à la limite de 16 000 jetons ; sa réponse coupée a fait échouer toute la création de la marque, après 1,20 € dépensés. » Ce qui aurait dû se passer : « une équipe de noms ne peut pas écrire autant (sa demande et sa limite doivent tenir ensemble), et une réponse coupée d'une seule équipe ne fait pas tomber toute la création (les autres équipes suffisent, ou seule celle-ci est refaite). »",
    attendu: "La demande d'une équipe de noms tient dans sa limite (réflexion prévue et réponse ensemble). Une équipe coupée ou illisible est refaite une seule fois, plus courte, à la charge du Studio ; si elle échoue encore, la création continue avec les noms des autres équipes ; seule une panne de toutes les équipes arrête la création, avec une phrase claire.",
    rejeu: "gratuit",
  },
  {
    id: "ligne-la-marque-sans-idee-de-dessin", date: "2026-11-23", source: "CLAUDE.md (Logo ; diagnostic de l'essai réel de Nadia : docs/studio/essais-complets/NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Diagnostic de l'essai réel de Nadia : « Aucune idée de dessin dans la ligne « La marque » du logo (« comme une maison qui sent bon » a donné 6 maisons sur 9 logos). » Règle du propriétaire (21 novembre 2026) : « pas de consigne autre que les 50 logos en exemple et simplement en exemple ».",
    attendu: "La ligne « La marque » du dessinateur du logo est écrite par le Studio, jamais par la directrice artistique : l'idée en mots simples puis le ton ; une idée qui contient une comparaison (« comme », « tel que ») ou un mot concret (maison, chez, foyer, flamme, feu, mèche, pot, couvercle, soir, hiver, nuit, fenêtre, marché, ou un mot du produit et du métier du client) est retirée, et seul le ton reste.",
    rejeu: "gratuit",
  },
  {
    id: "serie-compte-les-logos-refuses", date: "2026-11-23", source: "CLAUDE.md (Logo ; diagnostic de l'essai réel de Nadia : docs/studio/essais-complets/NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Diagnostic de l'essai réel de Nadia : « La série des logos compte aussi les logos refusés, pour que chaque nouveau logo parte loin de ceux déjà faits. » (les 3 logos de A refusés, B n'a rien reçu ; ceux de B refusés, C n'a rien reçu). Règle du propriétaire : « je veux un logo complètement différent ».",
    attendu: "Chaque nouveau dessin de logo, reprises comprises, reçoit tous les logos déjà dessinés pour ce client dans cette série, gardés ou refusés (ses propres essais refusés compris), avec « Je veux un logo complètement différent » ; jamais ceux d'une autre série ni d'un autre projet.",
    rejeu: "gratuit",
  },
  {
    id: "refus-du-logo-une-seule-fois", date: "2026-11-23", source: "CLAUDE.md (Logo ; diagnostic de l'essai réel de Nadia : docs/studio/essais-complets/NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Diagnostic de l'essai réel de Nadia : « Au dessinateur du logo, seuls les refus qui concernent le logo, une seule fois, tels qu'écrits (pas « Il ne veut pas », pas de doublon, pas le refus des mains et du visage). » Formule du propriétaire : « Il ne veut surtout pas : … ».",
    attendu: "Le dessinateur du logo reçoit chaque refus du client qui peut toucher un logo une seule fois, mot pour mot, dans la formule « Il ne veut surtout pas : « … » », sans « Il ne veut pas » ajouté ; un refus qui parle de personnes (mains, visage) vaut pour les images et ne lui arrive pas.",
    rejeu: "gratuit",
  },
  {
    id: "planche-a-trou-jamais-montree", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Règle du propriétaire : « Jamais une planche incomplète : une image refusée est refaite avant d'être montrée. » Essai réel de Nadia : des planches sans logo lui ont été montrées (« Les logos ne l'étaient pas non plus : à la place, tu vois ton nom simplement écrit »), et la grande scène de « Pénombre », refusée trois fois, manquait aussi.",
    attendu: "Une planche à laquelle il manque encore le logo, la grande scène ou le haut du site après ses reprises n'est ni affichée, ni montrée à SINA, ni choisissable ; les planches complètes de la série restent montrées ; SINA dit ce qui bloque et propose de refaire ce qui manque, à la charge du Studio (0 % du budget du client, sur la carte d'accord).",
    rejeu: "gratuit",
  },
  {
    id: "image-sous-8-jamais-gardee", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Carnet des verdicts, Nadia, identité C « Pénombre », haut du site : « 5/10 : « un bandeau de mois non demandé (JAN à DÉC, avec « JUI » en double) […] le pot de bougie de la photo est coupé par le bord droit » » ; gardée par SINA : « Oui, gardée malgré 5/10 (raté du Studio) ». Puis SINA a dit à Nadia que « les hauts de site des trois sont soignés ».",
    attendu: "Une image notée moins de 8 sur 10 n'est jamais gardée ni montrée, même quand le relecteur répond ok = faux avec un défaut « texte » dont les textes attendus sont présents, ou quand il ne dit rien de ok ; elle est refaite. Ce que SINA dit d'une image vient du verdict du relecteur (sa note et ses mots), jamais d'un éloge inventé.",
    rejeu: "gratuit",
  },
  {
    id: "vrai-produit-du-client-joint", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Carnet des verdicts, Nadia, identité C « Pénombre », grande scène, 1er essai : « 5/10 : « un pot de confiture avec une étiquette vierge, et non une bougie en cire de soja » ». Diagnostic : « Les vraies photos de Nadia n'ont jamais été jointes. » Règle : l'ouverture est une scène créée avec son vrai produit.",
    attendu: "Pour une boutique qui a envoyé ses photos de produit, la demande de la grande scène et celle du haut du site les joignent comme produit à reproduire fidèlement ; la demande de relecture les joint aussi, avec la consigne de comparer et de refuser un autre produit.",
    rejeu: "gratuit",
  },
  {
    id: "bougie-cire-et-meche", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Diagnostic de Nadia, épreuve 6 : « Le produit est reconnaissable : une bougie montre sa cire et sa mèche (trois « pots de confiture » refusés). » Carnet : « ressemble à un pot de confiture (matière rouge granuleuse, aucune mèche) » ; « L'étiquette du bocal […] est vierge : un grand cadre vide ».",
    attendu: "Le relecteur refuse une scène où le produit n'est pas le vrai (un pot sans mèche, une étiquette vierge, un autre contenant que sur sa photo) : elle n'est pas gardée, et elle est refaite avec cette raison.",
    rejeu: "gratuit",
  },
  {
    id: "titre-du-projet-coupe", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Essai réel de Nadia : le titre du projet affichait « Bougies parfumées que je coule à la (provisoire) ».",
    attendu: "Le titre du projet se coupe toujours à un mot entier, jamais au milieu d'une idée ni sur un petit mot de liaison, et ne montre jamais « (provisoire) » au client.",
    rejeu: "gratuit",
  },
];
