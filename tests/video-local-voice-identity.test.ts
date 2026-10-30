/** Exécutable Kokoro et outils audio injectés ; vérifie les arguments, aucune synthèse réelle. */
import {it,expect,vi}from 'vitest';
import {EventEmitter}from 'node:events';import {Writable}from 'node:stream';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const fake=vi.hoisted(()=>({args:[]as string[],text:''}));
vi.mock('node:child_process',()=>({spawn:(_bin:string,args:string[])=>{fake.args=args;const child=new EventEmitter()as any;child.stderr=new EventEmitter();child.stdin=new Writable({write(chunk,_encoding,done){fake.text+=chunk.toString();done();}});child.stdin.once('finish',()=>{fs.writeFileSync(args[args.indexOf('--out')+1],Buffer.from('audio fictif'));queueMicrotask(()=>child.emit('close',0));});return child;}}));
vi.mock('@/lib/exec-tool',()=>({execTool:async(_bin:string,args:string[])=>{if(args[0]==='-y')fs.writeFileSync(args.at(-1)!,Buffer.from('audio fictif'));return{stdout:'1.0',stderr:''};}}));
import {synthLine}from '@/lib/video-v2/voice';
it('l’anglais ne remplace pas silencieusement le timbre choisi par un autre',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-voice-identity-'));try{await synthLine('Keep my selected voice.',path.join(dir,'line.wav'),{voice:'ff_siwis',speed:.94,lang:'en'});expect(fake.args[fake.args.indexOf('--voice')+1]).toBe('ff_siwis');expect(fake.args[fake.args.indexOf('--speed')+1]).toBe('.94'.replace(/^\./,'0.'));expect(fake.text).toBe('Keep my selected voice.');}finally{fs.rmSync(dir,{recursive:true,force:true});}});
