/** Contract integration: the real catalogue and rendered help must satisfy the browser recipe's exact selectors. No Chromium or supplier. */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import fs from 'node:fs';
import {account,project,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,conversationView} from '@/lib/orchestrator/conversation';
import {ConversationStudioHelp} from '@/components/studio/conversation-studio-help';
beforeEach(()=>{for(const key of ['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_KNOWLEDGE'])vi.stubEnv(key,'1');for(const key of ['STUDIO_CONVERSATION_ORIGINAL','STUDIO_CONVERSATION_VIDEO_GENERATION'])vi.stubEnv(key,'0');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No external HTTP in this contract test');}));});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function fixture(business:'products'|'services'){
 const u=await account(),pid=project(u,business),c=openProjectConversation(u,pid),help=conversationView(u,c.id).studioHelp!;expect(help).toBeTruthy();const before=emptySpend(),html=renderToStaticMarkup(createElement(ConversationStudioHelp,{help,onRefresh:async()=>{throw Error('Render does not refresh or activate');}}));expect(emptySpend()).toEqual(before);expect(fetch).not.toHaveBeenCalled();return{help,html,script:fs.readFileSync('scripts/verify-agent211-knowledge-ui.ts','utf8')};
}
function renderedRow(html:string,label:string){const rows=html.match(/<li\b[^>]*>[\s\S]*?<\/li>/g)??[];const matches=rows.filter(r=>r.includes(label));expect(matches).toHaveLength(1);return matches[0];}
it.each(['products','services'] as const)('original %s: exact browser status matches a real connected but disabled operation',async business=>{
 const f=await fixture(business),row=f.help.capabilities.rows.find(r=>r.id==='theme.original')!;expect(row).toMatchObject({implementation:'implemented',nativeAvailability:'native_checks_on_action',connectionEnabled:false,availability:'disabled_or_locked'});
 const selector=f.script.match(/originalRow\.getByText\('([^']+)',\{exact:true\}\)/)?.[1];expect(selector).toBeTruthy();expect(renderedRow(f.html,row.label[0])).toContain(selector!);expect(renderedRow(f.html,row.label[0])).not.toContain('Pas encore disponible');expect(row.connectionEnabled).toBe(false);
});
it.each(['products','services'] as const)('video %s: absence check targets the unconnected planner, not quoted generation',async business=>{
 const f=await fixture(business),absent=f.help.capabilities.rows.find(r=>r.id==='videos.plan')!,generation=f.help.capabilities.rows.find(r=>r.id==='videos.generate')!;expect(absent).toMatchObject({implementation:'absent_from_syna',availability:'not_connected_native_screen_only',connectionEnabled:false});expect(generation).toMatchObject({implementation:'implemented',connectionEnabled:false});
 const selector=f.script.match(/const videoRow=[^;]*page\.getByText\('([^']+)',\{exact:true\}\)/)?.[1];expect(selector).toBe(absent.label[0]);const actual=renderedRow(f.html,selector!);expect(actual).toContain('Pas encore raccordé à SYNA');expect(actual).toContain(absent.href);expect(absent.href).toMatch(/\/videos$/);expect(renderedRow(f.html,generation.label[0])).not.toContain('Pas encore raccordé');
});
