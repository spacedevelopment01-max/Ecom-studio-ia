/** Drapeaux serveur fermés par défaut ; aucune activation client ou permission issue du modèle. */
export const conversationToolsEnabled=()=>['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_SPECIALISTS','STUDIO_CONVERSATION_TOOLS'].every(key=>process.env[key]==='1');
export const conversationThemeToolsEnabled=()=>conversationToolsEnabled()&&process.env.STUDIO_CONVERSATION_THEME_TOOLS==='1';

export const conversationCompositionEnabled=()=>conversationThemeToolsEnabled()&&process.env.STUDIO_CONVERSATION_COMPOSITION==='1';

export const conversationExportsEnabled=()=>conversationThemeToolsEnabled()&&process.env.STUDIO_CONVERSATION_EXPORTS==='1';

export const conversationRenderEnabled=()=>conversationThemeToolsEnabled()&&process.env.STUDIO_CONVERSATION_RENDER==='1';

export const conversationResearchEnabled=()=>conversationToolsEnabled()&&process.env.STUDIO_CONVERSATION_RESEARCH==='1';
export const conversationContextEnabled=()=>['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_CONTEXT'].every(key=>process.env[key]==='1');
export const conversationCatalogueEnabled=()=>conversationToolsEnabled()&&conversationContextEnabled()&&process.env.STUDIO_CONVERSATION_CATALOGUE==='1';
export const conversationImagesEnabled=()=>conversationToolsEnabled()&&conversationContextEnabled()&&process.env.STUDIO_CONVERSATION_IMAGES==='1';
export const conversationLogosEnabled=()=>conversationToolsEnabled()&&conversationContextEnabled()&&process.env.STUDIO_CONVERSATION_LOGOS==='1';

export const conversationVideosEnabled=()=>conversationToolsEnabled()&&conversationContextEnabled()&&process.env.STUDIO_CONVERSATION_VIDEOS==='1';

export const conversationVideoGenerationEnabled=()=>conversationVideosEnabled()&&process.env.STUDIO_CONVERSATION_VIDEO_GENERATION==='1';

export const conversationVideoVoiceEnabled=()=>conversationVideosEnabled()&&process.env.STUDIO_CONVERSATION_VIDEO_VOICE==='1';

export const conversationVideoClipEnabled=()=>conversationVideosEnabled()&&process.env.STUDIO_CONVERSATION_VIDEO_CLIP==='1';
export const conversationSocialEnabled=()=>conversationToolsEnabled()&&conversationContextEnabled()&&process.env.STUDIO_CONVERSATION_SOCIAL==='1';
