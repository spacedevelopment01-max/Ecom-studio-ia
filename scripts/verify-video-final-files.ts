/** Inspect only the downloaded test exports; no provider call. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import{execFileSync}from'node:child_process';
const dir=process.env.DATA_DIR??'';if(!path.basename(dir).startsWith('ecs-test-video-mission-'))throw Error('Dossier isolé requis');const out=path.join(dir,'public');
const {measureAudio}=await import('../src/lib/video-v2/audio');
const names=['produit-publicitaire','service-publicitaire','produit-organique','service-organique'];const results=[];
for(const slug of names){const file=path.join(out,`${slug}-final.mp4`);assert(fs.existsSync(file),`${slug}: export absent`);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]).toString());const v=probe.streams.find((s:any)=>s.codec_type==='video'),a=probe.streams.find((s:any)=>s.codec_type==='audio');
 assert.equal(v.codec_name,'h264');assert.equal(a.codec_name,'aac');assert.equal(v.width,1080);assert.equal(v.height,1920);assert(Math.abs(Number(probe.format.duration)-20)<.15);
 execFileSync('ffmpeg',['-v','error','-i',file,'-f','null','-']);
 const measured=await measureAudio(file);assert(!measured.silent);assert(measured.lufs!==null&&measured.lufs>-18&&measured.lufs<-10);assert(measured.truePeakDb!==null&&measured.truePeakDb<-.5);
 assert(fs.readFileSync(path.join(out,`${slug}-final.vtt`),'utf8').startsWith('WEBVTT'));
 const srt=fs.readFileSync(path.join(out,`${slug}-final.srt`),'utf8');for(const text of ['Un détail à observer.','Une surface à préparer.','Des finitions à préserver.','Un ensemble à vérifier.'])assert(srt.includes(text),`${slug}: phrase absente de l’export`);
 for(const [k,at]of[1,8,13.5,19].entries())execFileSync('ffmpeg',['-y','-v','error','-ss',String(at),'-i',file,'-frames:v','1',path.join(out,`${slug}-controle-${k+1}.jpg`)]);
 results.push({slug,simulation:true,video:{codec:v.codec_name,width:v.width,height:v.height,fps:v.r_frame_rate,durationS:Number(probe.format.duration)},audio:{codec:a.codec_name,sampleRate:a.sample_rate,...measured},allFourPhrasesExported:true,decodeErrors:0,bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
}
fs.writeFileSync(path.join(out,'final-media-checks.json'),JSON.stringify({providerCalls:0,actualApiCostEur:0,cpuStorageCostMeasured:false,results},null,2));console.log('Quatre téléchargements réels inspectés et décodés ; 4 × 20 s, H.264/AAC, sous-titres intégraux.');
