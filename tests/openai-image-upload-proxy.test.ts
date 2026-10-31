/** SDK réel et proxy HTTP locaux ; aucune API fournisseur ni clé réelle. */
import {afterEach,describe,expect,it,vi} from 'vitest';
import http from 'node:http';
import net from 'node:net';
import type {Duplex} from 'node:stream';
import {once} from 'node:events';
import {toFile} from 'openai';
import {openaiClient} from '../src/lib/ai/openai-images';
import {GATEWAY_KEY} from '../src/lib/ai/gateway';
import {MEDIA_MODELS} from '../src/lib/ai/media-models';
afterEach(()=>vi.unstubAllEnvs());
describe('téléversement natif OpenAI derrière le proxy',()=>{
 for(const mode of ['no-proxy','proxy','gateway','503']as const)it(`envoie vraiment le multipart local : ${mode}`,async()=>{
  const received:{url:string;type:string;body:string;authorization?:string}[]=[],sockets=new Set<Duplex>();let tunnels=0;
  const origin=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;received.push({url:req.url!,type:String(req.headers['content-type']),body,authorization:req.headers.authorization});res.setHeader('connection','close');res.setHeader('content-type','application/json');res.statusCode=mode==='503'?503:200;res.end(JSON.stringify(mode==='503'?{error:{message:'Panne locale simulée'}}:{data:[{b64_json:Buffer.from('fixture-technique').toString('base64')}]}));});
  origin.listen(0,'127.0.0.1');await once(origin,'listening');const port=(origin.address()as net.AddressInfo).port;
  const proxy=http.createServer((_req,res)=>{res.statusCode=500;res.end('Tunnel attendu');});
  proxy.on('connect',(req,client,head)=>{tunnels++;expect(req.url).toBe(`127.0.0.1:${port}`);const upstream=net.connect(port,'127.0.0.1',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);client.pipe(upstream);upstream.pipe(client);});sockets.add(upstream);sockets.add(client);upstream.on('error',()=>client.destroy());client.on('error',()=>upstream.destroy());});
  proxy.listen(0,'127.0.0.1');await once(proxy,'listening');const proxyUrl=`http://127.0.0.1:${(proxy.address()as net.AddressInfo).port}`;
  for(const key of ['HTTPS_PROXY','https_proxy','HTTP_PROXY','http_proxy'])vi.stubEnv(key,proxyUrl);
  for(const key of ['NO_PROXY','no_proxy'])vi.stubEnv(key,mode==='no-proxy'?'127.0.0.1':'');
  vi.stubEnv('NODE_USE_ENV_PROXY','0');vi.stubEnv('OPENAI_BASE_URL',`http://127.0.0.1:${port}/v1`);
  try{
   const client=openaiClient(mode==='gateway'?GATEWAY_KEY:'fake-local-upload-not-a-key'),model=MEDIA_MODELS.find(m=>m.provider==='openai'&&m.adapter==='openai_image')!.model;
   const call=async()=>client.images.edit({model,image:await toFile(Buffer.from('octets-source-de-reference'),'reference.png',{type:'image/png'}),prompt:'Conserver exactement la photo fournie ; lumière latérale.',n:1});
   if(mode==='503')await expect(call()).rejects.toMatchObject({status:503});else await expect(call()).resolves.toMatchObject({data:[{b64_json:Buffer.from('fixture-technique').toString('base64')}]});
   expect(received).toHaveLength(1);expect(received[0].url).toBe('/v1/images/edits');expect(received[0].type).toContain('multipart/form-data; boundary=');expect(received[0].body).toContain('octets-source-de-reference');expect(received[0].body).toContain('Conserver exactement la photo fournie ; lumière latérale.');expect(received[0].authorization).toBe(mode==='gateway'?undefined:'Bearer fake-local-upload-not-a-key');expect(tunnels).toBe(mode==='no-proxy'?0:1);
  }finally{for(const s of sockets)s.destroy();await Promise.all([new Promise<void>(r=>origin.close(()=>r())),new Promise<void>(r=>proxy.close(()=>r()))]);}
 });
});
