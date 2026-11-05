/**
 * Texte d'une demande sans ses valeurs citées (« … », “ … ”, " … ").
 * Les aiguilleurs des domaines (stock, calendrier, thème, animations, profil) cherchent leurs mots-clés ici :
 * « Change le titre de cette section par « Voir le stock » » reste une retouche du site, jamais une demande de stock.
 */
export const outsideQuotes=(text:string)=>text.replace(/«[^»\r\n]*»|“[^”\r\n]*”|"[^"\r\n]*"/gu,' ');
