/** Assistance interne persistante. Aucun e-mail, paiement, essai IA ou geste commercial automatique. */
import {all,id,now,one,run,tx} from './db';
import {HttpError,type User} from './auth';
import {L} from './i18n-server';
import {redact} from './redact';
import {subscriptionOfProject} from './project-billing';
type Ticket={id:string;user_id:string;project_id:string|null;subject:string;category:string;job_id:string|null;status:string;created_at:number;updated_at:number};
function owned(user:User,key:string){const t=one<Ticket>('SELECT * FROM support_tickets WHERE id=?',key);if(!t||(t.user_id!==user.id&&user.role!=='admin'))throw new HttpError(404,L('Demande introuvable.','Request not found.'));return t;}
function diagnostic(t:Ticket){
 if(!t.job_id)return null;
 const job=one<{id:string;type:string;status:string;progress:number;result:string|null}>('SELECT id,type,status,progress,result FROM jobs WHERE id=? AND user_id=?',t.job_id,t.user_id);if(!job)return null;
 const usage=one<{amount:number;n:number}>('SELECT COALESCE(SUM(billed),0) amount,COUNT(*) n FROM usage_events WHERE job_id=?',job.id)!;
 const key=t.project_id?subscriptionOfProject(t.project_id)?.user_id:null;
 const wallet=key?one<{monthly_allowance:number}>('SELECT monthly_allowance FROM wallets WHERE user_id=?',key):null;
 return {id:job.id,type:job.type,status:job.status,progress:job.progress,resultPresent:!!job.result,usageEntries:usage.n,budgetPct:wallet?.monthly_allowance?Math.round(usage.amount/wallet.monthly_allowance*10000)/100:null,basis:'current_allowance_not_historical'};
}
function view(t:Ticket){return {id:t.id,subject:t.subject,category:t.category,status:t.status,projectId:t.project_id,createdAt:t.created_at,updatedAt:t.updated_at,diagnostic:diagnostic(t),messages:all<{id:string;staff:number;body:string;created_at:number}>('SELECT id,staff,body,created_at FROM support_messages WHERE ticket_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100',t.id).reverse().map(m=>({id:m.id,staff:!!m.staff,text:redact(m.body),createdAt:m.created_at}))};}
export function supportRequests(user:User,queue=false){if(queue&&user.role!=='admin')throw new HttpError(403,L('Accès réservé à l’administration.','Administrator access only.'));return all<Ticket>(`SELECT * FROM support_tickets ${queue?'':'WHERE user_id=?'} ORDER BY updated_at DESC LIMIT 50`,...(queue?[]:[user.id])).map(view);}
export function createSupportRequest(user:User,b:{subject:string;category:string;text:string;requestKey:string;projectId?:string;jobId?:string}){
 if(b.projectId&&!one('SELECT 1 FROM projects WHERE id=? AND user_id=?',b.projectId,user.id))throw new HttpError(404,L('Projet introuvable.','Project not found.'));
 const job=b.jobId?one<{project_id:string|null}>('SELECT project_id FROM jobs WHERE id=? AND user_id=?',b.jobId,user.id):null;
 if(b.jobId&&(!job||(b.projectId&&job.project_id!==b.projectId)))throw new HttpError(404,L('Tâche introuvable.','Task not found.'));
 const text=redact(b.text),subject=redact(b.subject);
 return tx(()=>{
  const prior=one<Ticket>('SELECT * FROM support_tickets WHERE user_id=? AND request_key=?',user.id,b.requestKey);
  if(prior){const first=one<{body:string}>('SELECT body FROM support_messages WHERE ticket_id=? ORDER BY created_at,rowid LIMIT 1',prior.id);if(prior.subject!==subject||first?.body!==text||prior.category!==b.category||prior.project_id!==(b.projectId??job?.project_id??null)||prior.job_id!==(b.jobId??null))throw new HttpError(409,L('Cette demande a changé : actualisez avant de la renvoyer.','This request changed: refresh before resending.'));return view(prior);}
  const key=id();run('INSERT INTO support_tickets(id,user_id,project_id,subject,category,job_id,request_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',key,user.id,b.projectId??job?.project_id??null,subject,b.category,b.jobId??null,b.requestKey,now(),now());
  run('INSERT INTO support_messages(id,ticket_id,user_id,staff,body,request_key,created_at) VALUES(?,?,?,?,?,?,?)',id(),key,user.id,0,text,b.requestKey,now());
  return view(owned(user,key));
 });
}
export function replySupport(user:User,b:{id:string;text?:string;requestKey:string;status?:'open'|'in_progress'|'closed'}){
 return tx(()=>{const t=owned(user,b.id);if(b.status==='in_progress'&&user.role!=='admin')throw new HttpError(403,L('Statut réservé à l’équipe.','Team status only.'));
  if(b.text){const text=redact(b.text);const prior=one<{body:string}>('SELECT body FROM support_messages WHERE ticket_id=? AND user_id=? AND request_key=?',t.id,user.id,b.requestKey);if(prior&&prior.body!==text)throw new HttpError(409,L('Ce message a changé : actualisez avant de le renvoyer.','This message changed: refresh before resending.'));run('INSERT OR IGNORE INTO support_messages(id,ticket_id,user_id,staff,body,request_key,created_at) VALUES(?,?,?,?,?,?,?)',id(),t.id,user.id,user.role==='admin'?1:0,text,b.requestKey,now());}
  run('UPDATE support_tickets SET status=?,updated_at=? WHERE id=?',b.status??(b.text?'open':t.status),now(),t.id);return view(owned(user,t.id));
 });
}
