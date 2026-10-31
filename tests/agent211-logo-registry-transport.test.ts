import {describe,it,expect} from 'vitest';
import http from 'node:http';
import {request} from 'playwright';
import {readLogoRegistry} from '../scripts/agent211-logo-registry';

async function fixture(handler:(req:http.IncomingMessage,res:http.ServerResponse,n:number)=>void){
 let count=0;const methods:string[]=[];
 const server=http.createServer((req,res)=>{methods.push(req.method!);handler(req,res,++count);});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const client=await request.newContext(),url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/studio-agent/conversations/synthetic/logos`;
 return{server,client,url,methods,count:()=>count,close:async()=>{await client.dispose();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
const receipt={receipts:[{id:'same-confirmation',job:{id:'same-job',status:'done'},delivered:true,outputs:[1,2,3]}]};
describe('recette Logos — lecture HTTP du reçu sans rejouer la génération',()=>{
 it('reproduit le reset TCP du lecteur historique alors que le serveur reste disponible',async()=>{
  const f=await fixture((req,res,n)=>{if(n===1)req.socket.resetAndDestroy();else res.end(JSON.stringify(receipt));});
  try{await expect(f.client.get(f.url)).rejects.toThrow(/ECONNRESET/);expect(f.server.listening).toBe(true);expect(await(await f.client.get(f.url)).json()).toEqual(receipt);expect(f.methods).toEqual(['GET','GET']);}
  finally{await f.close();}
 });
 it('récupère le même reçu après un unique ECONNRESET, serveur toujours vivant',async()=>{
  const f=await fixture((req,res,n)=>{if(n===1)req.socket.resetAndDestroy();else res.end(JSON.stringify(receipt));});
  try{expect(await readLogoRegistry(f.client,f.url)).toEqual(receipt);expect(f.count()).toBe(2);expect(f.server.listening).toBe(true);expect(f.methods).toEqual(['GET','GET']);}
  finally{await f.close();}
 });
 it('refuse des resets persistants après au plus deux lectures',async()=>{
  const f=await fixture(req=>req.socket.resetAndDestroy());
  try{await expect(readLogoRegistry(f.client,f.url)).rejects.toThrow(/ECONNRESET/);expect(f.count()).toBe(2);expect(f.methods).toEqual(['GET','GET']);}
  finally{await f.close();}
 });
 it('refuse un serveur arrêté, sans le redémarrer',async()=>{
  const f=await fixture(()=>{});await new Promise<void>(resolve=>f.server.close(()=>resolve()));
  try{await expect(readLogoRegistry(f.client,f.url)).rejects.toThrow(/ECONNREFUSED/);expect(f.count()).toBe(0);expect(f.server.listening).toBe(false);}
  finally{await f.close();}
 });
 for(const status of [401,403,404,409,500])it('refuse HTTP '+status+' sans nouvelle lecture',async()=>{
  const f=await fixture((_req,res)=>{res.statusCode=status;res.end('explicit failure');});
  try{await expect(readLogoRegistry(f.client,f.url)).rejects.toThrow();expect(f.count()).toBe(1);expect(f.methods).toEqual(['GET']);}
  finally{await f.close();}
 });
 it('refuse un JSON invalide sans nouvelle lecture',async()=>{
  const f=await fixture((_req,res)=>res.end('not-json'));
  try{await expect(readLogoRegistry(f.client,f.url)).rejects.toThrow();expect(f.count()).toBe(1);}
  finally{await f.close();}
 });
 it('conserve les échecs métier du reçu pour les assertions du parcours',async()=>{
  const failed={receipts:[{id:'same-confirmation',job:{id:'same-job',status:'failed'},delivered:false,outputs:[]}]};
  const f=await fixture((_req,res)=>res.end(JSON.stringify(failed)));
  try{expect(await readLogoRegistry(f.client,f.url)).toEqual(failed);expect(f.count()).toBe(1);expect(f.methods).toEqual(['GET']);}
  finally{await f.close();}
 });
});
