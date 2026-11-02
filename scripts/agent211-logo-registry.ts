/** Lecture de recette uniquement ; jamais une confirmation ou un appel fournisseur. */
import assert from 'node:assert/strict';
import type {APIRequestContext} from 'playwright';
export async function readLogoRegistry<T>(request:APIRequestContext,url:string):Promise<T>{
 // Playwright ne reprend que ECONNRESET, une fois, dans le délai global existant.
 // Aucun retry HTTP/JSON/métier et surtout aucun POST de confirmation rejoué.
 const response=await request.get(url,{maxRetries:1});
 assert.equal(response.status(),200);
 return await response.json() as T;
}
