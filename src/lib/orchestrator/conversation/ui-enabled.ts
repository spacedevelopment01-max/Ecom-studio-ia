/** Activation serveur uniquement, jamais une modification commerciale ou une migration implicite. */
export function conversationUiEnabled(){return process.env.STUDIO_CONVERSATION_LOT_A==='1'&&process.env.STUDIO_CONVERSATION_AI==='1'&&process.env.STUDIO_CONVERSATION_UI==='1';}
