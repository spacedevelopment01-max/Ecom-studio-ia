// Test-only startup guard; never loaded by the application in production.
const original=globalThis.fetch;
globalThis.fetch=(input,init)=>{const raw=typeof input==='string'?input:input?.url??input.toString();const url=new URL(raw);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new Error('Réseau fournisseur interdit pendant la réception isolée');return original(input,init);};
