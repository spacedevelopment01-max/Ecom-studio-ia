/** Carte et contrat : texte intégral, acte séparé, modes fermés sans coût de schéma nouveau. */
import {it,expect}from 'vitest';
import {createElement}from 'react';import {renderToStaticMarkup}from 'react-dom/server';
import {createHash}from 'node:crypto';import {zodOutputFormat}from '@anthropic-ai/sdk/helpers/zod';
import {ClipReplacementQuote}from '@/components/studio/conversation-clip-tools';
import {cognitiveResponseSchema}from '@/lib/orchestrator/conversation/intelligence-contract';
import {VideoClipPlanSchema}from '@/lib/orchestrator/conversation/video-clip-contract';
it('montre source, photo, scène et demande entières, plafond et recadrage, sans agir',()=>{
 const quote:Parameters<typeof ClipReplacementQuote>[0]['quote']={id:'quote',tool:'videos.retake',instruction:'Ma demande exacte\nDeux  espaces.',clip:{id:'clip',label:'Plan conservé',durationS:5,beforeHref:'/api/assets/source'},scene:{still:'Le sujet entier près d’une fenêtre, sans personne.',motion:'La caméra avance lentement.\nDeux  espaces.'},generation:'reference',reference:{assetId:'photo',version:1,sha256:'a'.repeat(64),href:'/api/assets/photo'},aspect:'4:5',routeAspect:'9:16',estimatePct:.2,maximumPct:.3,maximumCalls:2,newClip:true,acquired:false,voicesKept:true,otherClipsKept:true,oldVersionsKept:true,expiresAt:Date.now()+10000,confirmationRequired:true,actionsExecuted:false,reused:false,limitations:'Mouvement et qualité créative à vérifier.'};
 const before=JSON.stringify(quote),html=renderToStaticMarkup(createElement(ClipReplacementQuote,{quote,busy:false,onConfirm:()=>{throw Error('Render is not consent');},onCancel:()=>{}}));for(const t of [quote.instruction,quote.scene.still,quote.scene.motion,'/api/assets/source','/api/assets/photo','0.30','recadré','Une seule reprise payante','Confirmer ce plan et son plafond'])expect(html).toContain(t);expect(JSON.stringify(quote)).toBe(before);
});
it('les quatre schémas vocaux antérieurs restent identiques lorsque la reprise est fermée',()=>{
 const baselines=[{logos:false,generation:false,bytes:24752,sha:'070389c0e1a2dae8bc796b9c107fc15ef2bd7da078a03a613c7534268842fe10'},{logos:false,generation:true,bytes:28244,sha:'70b51b26c2bd9612ed2ce387f40e9d5d370d79930e2fa5f64fee12496504c339'},{logos:true,generation:false,bytes:30174,sha:'4a9dced60e709a3c6d35269adfbc3bab3ec40c91a5fe070e3d1d4223f9ed904e'},{logos:true,generation:true,bytes:33666,sha:'2e0a23e1af39b8c62a0f9d54849f3ec118bdebbb32df026783a9fb25419cd44d'}];
 for(const b of baselines){const text=JSON.stringify(zodOutputFormat(cognitiveResponseSchema(b.logos,true,b.generation,true,false)));expect(Buffer.byteLength(text)).toBe(b.bytes);expect(createHash('sha256').update(text).digest('hex')).toBe(b.sha);}
 for(const logos of [false,true])for(const generation of [false,true])for(const voice of [false,true]){const text=JSON.stringify(zodOutputFormat(cognitiveResponseSchema(logos,true,generation,voice,true)));expect(text).toContain('videos.retake');expect(text).toContain('clipPlan');expect(text.includes('voicePlan')).toBe(voice);expect(text.includes('generationPlan')).toBe(generation);expect(text.includes('logoPlan')).toBe(logos);}
 expect(JSON.stringify(zodOutputFormat(cognitiveResponseSchema(true,false,true,true,true)))).not.toContain('clipPlan');
});
it('aucune route, coût, commande ou référence incohérente ne se glisse dans la proposition',()=>{
 const p={tool:'videos.retake',docKey:'vid:test',expectedVersion:1,expectedVersionId:'v',clipId:'c',generation:'direct',reference:null,scene:{still:'Objet entier dans un atelier.',motion:'La caméra avance lentement.'},sourceId:'request',quote:'Demande exacte'};expect(VideoClipPlanSchema.safeParse(p).success).toBe(true);
 for(const extra of [{provider:'forged'},{costCapMicro:0},{maxCalls:200},{script:'run'},{generation:'staged'},{reference:{assetId:'a',version:1,sha256:'a'.repeat(64)}}])expect(VideoClipPlanSchema.safeParse({...p,...extra}).success).toBe(false);
});
