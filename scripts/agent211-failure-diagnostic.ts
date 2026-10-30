/** Enrichit uniquement les échecs de la recette ISOLÉE. Aucun header, clé ou texte client exporté. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {all,json} from '../src/lib/db';
import {redact} from '../src/lib/redact';
export function saveAgentFailureDiagnostic(out:string,logs:string){
 const root=process.env.DATA_DIR;if(!root||path.dirname(root)!==os.tmpdir()||!path.basename(root).startsWith('ecs-agent-211-'))throw Error('Failure diagnostics require the isolated browser fixture');
 const jobs=all<{id:string;project_id:string|null;type:string;status:string;progress:number;error:string|null}>('SELECT id,project_id,type,status,progress,error FROM jobs ORDER BY created_at DESC,rowid DESC LIMIT 20').map(j=>({...j,error:j.error?redact(j.error):null}));
 const turns=all<{conversation_id:string;revision:number;request_json:string}>('SELECT conversation_id,revision,request_json FROM agent_conversation_turns ORDER BY created_at DESC,rowid DESC LIMIT 20').map(({request_json,...row})=>{const r=json<{action?:string;text?:string}>(request_json,{});return{...row,action:r.action??null,requestSha256:createHash('sha256').update(request_json).digest('hex'),textCharacters:r.text?.length??0};});
 const conversations=all<{id:string;revision:number;state_json:string}>('SELECT id,revision,state_json FROM agent_conversations ORDER BY updated_at DESC LIMIT 10').map(({state_json,...row})=>{const r=json<{intelligence?:{pendingJobId?:string;sourceRevision?:number;sourceProjectRevision?:number;lastReply?:{proposedTools?:string[]}}}>(state_json,{});return{...row,intelligence:r.intelligence?{pendingJobId:r.intelligence.pendingJobId??null,sourceRevision:r.intelligence.sourceRevision??null,sourceProjectRevision:r.intelligence.sourceProjectRevision??null,proposedTools:r.intelligence.lastReply?.proposedTools??[]}:null};});
 fs.writeFileSync(path.join(out,'failure-native-diagnostic.json'),JSON.stringify({schema:'agent211-isolated-failure-1',data:'synthetic_fixture_only',realProviderCalls:0,readOnlyDatabase:true,jobs,turns,conversations,serverLogTail:redact(logs).slice(-16000)},null,2));
}
