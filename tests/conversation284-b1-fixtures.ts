import {account,project,sender} from './conversation209-fixtures';
import {seedAgentUiSite} from '../scripts/agent211-ui-fixtures';
import {openProjectConversation,conversationView} from '@/lib/orchestrator/conversation';
import {submitContext,contextView} from '@/lib/orchestrator/conversation/context-session';
import {themeToolContext} from '@/lib/orchestrator/conversation/theme-tool-context';
import {currentTheme} from '@/lib/projects';
import {id} from '@/lib/db';
export async function localSiteFixture(business:'products'|'services'='products'){
 const u=await account(),pid=project(u,business),c=openProjectConversation(u,pid);await sender(u,c.id)({action:'message',text:'Projet fictif pour retouches locales'});await seedAgentUiSite(pid,business);
 const cur=currentTheme(pid)!,native=themeToolContext(pid),text=native.targets!.find(t=>t.template==='index'&&t.fields.some(d=>d.key==='heading'&&d.type==='text'))!;
 const section=text.section,template='index',anchor=cur.spec.templates.index.order.findLast(s=>s!==section&&!cur.spec.locks.includes(`${template}:${s}`))!;
 function select(field=true){const v=contextView(u,c.id);return submitContext(u,c.id,{action:'select',revision:v.revision,requestId:id(),context:{projectId:pid,tab:'boutique',target:field?{kind:'theme-field',versionId:currentTheme(pid)!.version.id,template,section,key:'heading',pagePath:'/'}:{kind:'theme-section',versionId:currentTheme(pid)!.version.id,template,section,pagePath:'/'}}});}
 const message=(text:string)=>{const v=conversationView(u,c.id);return{action:'message',revision:v.revision,projectRevision:v.projectRevision,requestId:id(),text};};
 return{u,pid,c,cur,text,section,template,anchor,select,message};
}
