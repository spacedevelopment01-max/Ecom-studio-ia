/** Inspect the native editorial prompt, not llmJson's final format-instruction block. Test transport only. */
export function contentWire(messages:unknown,reviewing:boolean){
 const list=Array.isArray(messages)?messages:[],texts=list.filter(m=>m?.role==='user').flatMap(m=>typeof m.content==='string'?[m.content]:Array.isArray(m.content)?m.content.flatMap((b:{type?:string;text?:unknown})=>b.type==='text'&&typeof b.text==='string'?[b.text]:[]):[]);
 const prompt=texts.findLast((t:string)=>reviewing?t.includes('Faits vérifiés :')&&t.includes('Blocs :'):t.includes('FAITS VÉRIFIÉS (seule matière autorisée) :')&&/^DEMANDE EXACTE DU CLIENT/m.test(t));
 if(!prompt)throw Error('Native editorial prompt missing from fake SDK request');
 const match=reviewing?prompt.match(/Demande exacte \([^)]*\) : ("(?:\\.|[^"\\])*")/):prompt.match(/^DEMANDE EXACTE DU CLIENT.*?\) : (.+)$/m);
 if(!match)throw Error('Native client instruction missing from fake SDK request');
 const instruction:unknown=JSON.parse(match[1]);if(typeof instruction!=='string')throw Error('Native client instruction is not a JSON string');
 return{prompt:prompt as string,instruction,phase:reviewing?'review':prompt.includes('CORRECTION CIBLÉE :')?'rewrite':'write'};
}
/** Native targeted editor uses its own explicit JSON instruction and block selection. */
export function contentEditWire(messages:unknown){
 const list=Array.isArray(messages)?messages:[],texts=list.filter(m=>m?.role==='user').flatMap(m=>typeof m.content==='string'?[m.content]:Array.isArray(m.content)?m.content.flatMap((b:{type?:string;text?:unknown})=>b.type==='text'&&typeof b.text==='string'?[b.text]:[]):[]);
 const prompt=texts.findLast((t:string)=>/^DEMANDE EXACTE DE RETOUCHE \(/m.test(t)&&/^Blocs à modifier : /m.test(t));if(!prompt)throw Error('Native targeted edit prompt missing');
 const match=prompt.match(/^DEMANDE EXACTE DE RETOUCHE.*? : (.+)$/m),scope=prompt.match(/^Blocs à modifier : (.+)$/m);if(!match||!scope)throw Error('Native edit instruction or scope missing');
 const instruction:unknown=JSON.parse(match[1]),blocks:unknown=JSON.parse(scope[1]);if(typeof instruction!=='string'||!Array.isArray(blocks)||!blocks.length||blocks.some(b=>!b||typeof b.id!=='string'||typeof b.kind!=='string'))throw Error('Native edit contract malformed');
 return{prompt:prompt as string,instruction,phase:'rewrite' as const,blocks:blocks as {id:string;kind:string;text?:string;items?:string[];q?:string;a?:string}[]};
}
