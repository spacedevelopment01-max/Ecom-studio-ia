/** Téléchargements non authentifiés : mêmes contrôles DNS/redirections/taille que les imports de sites. */
import { safeFetch } from "./engine/import-link";
import { assertStaticSvg } from "./upload-security";
export async function publicDownload(url:string,options:{maxBytes?:number;accept?:string;timeoutMs?:number}={}):Promise<Response>{
  const r=await safeFetch(url,{maxBytes:options.maxBytes??80_000_000,accept:options.accept??"*/*",timeoutMs:options.timeoutMs??90000});
  if(r.status>=200&&r.status<300&&/^[\uFEFF\s]*</.test(r.body.subarray(0,1024).toString("utf8")))assertStaticSvg(r.body);
  return new Response(new Uint8Array(r.body),{status:r.status,headers:{"content-type":r.type}});
}
