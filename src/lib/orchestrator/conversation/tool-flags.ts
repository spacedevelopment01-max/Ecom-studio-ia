/** Drapeaux serveur fermés par défaut ; aucune activation client ou permission issue du modèle. */
export const conversationToolsEnabled=()=>['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_SPECIALISTS','STUDIO_CONVERSATION_TOOLS'].every(key=>process.env[key]==='1');
