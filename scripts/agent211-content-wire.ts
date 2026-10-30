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
