import {afterEach,expect,it,vi} from 'vitest';
import {conversationUiEnabled} from '@/lib/orchestrator/conversation/ui-enabled';
afterEach(()=>vi.unstubAllEnvs());
it('le parcours IA ne remplace jamais le manuel sans les trois drapeaux serveur explicites',()=>{
  for(const [a,b,f,result]of [['0','0','0',false],['1','1','0',false],['0','1','1',false],['1','0','1',false],['1','1','1',true]]as const){vi.stubEnv('STUDIO_CONVERSATION_LOT_A',a);vi.stubEnv('STUDIO_CONVERSATION_AI',b);vi.stubEnv('STUDIO_CONVERSATION_UI',f);expect(conversationUiEnabled()).toBe(result);}
});
