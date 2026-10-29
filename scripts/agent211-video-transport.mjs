/** UNIQUEMENT le transport de la recette explicite : aucune source applicative assouplie.
 * DNS/CDN/TLS/fournisseurs réels NON qualifiés. Les autres connexions gardent le garde réseau. */
import http from 'node:http';import https from 'node:https';import dns from 'node:dns/promises';import {syncBuiltinESMExports}from 'node:module';
const value=process.env.AGENT211_VIDEO_FIXTURE_ORIGIN;
if(value){
 const origin=new URL(value);if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!origin.port)throw Error('Explicit loopback video fixture required');
 const fetchNative=globalThis.fetch,lookup=dns.lookup,request=https.request;
 dns.lookup=async function(host,...args){if(host==='cdn.fixture.invalid')return args[0]?.all?[{address:'8.8.8.8',family:4}]:{address:'8.8.8.8',family:4};return lookup.call(this,host,...args);};
 https.request=function(...args){const u=typeof args[0]==='string'||args[0]instanceof URL?new URL(args[0]):null;if(u?.hostname==='cdn.fixture.invalid'&&u.pathname==='/neutral.mp4'){const opts=typeof args[1]==='object'?{...args[1]}:{};delete opts.lookup;const cb=typeof args[1]==='function'?args[1]:args[2];return http.request(new URL('/__video-file',origin),opts,cb);}return request.apply(this,args);};
 globalThis.fetch=async function(input,init){const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);let target=null;
  if(url.hostname.endsWith('.aliyuncs.com')&&url.pathname==='/api/v1/services/aigc/video-generation/video-synthesis')target='/__video-submit';
  if(url.hostname.endsWith('.aliyuncs.com')&&/^\/api\/v1\/tasks\/fixture-\d+$/.test(url.pathname))target='/__video-task/'+url.pathname.split('/').at(-1);
  if(url.hostname==='api.openai.com'&&url.pathname==='/v1/audio/speech')target='/__video-voice';
  if(target){if(input instanceof Request)throw Error('Unexpected Request transport shape');return fetchNative(new URL(target,origin),init);}return fetchNative(input,init);
 };
 syncBuiltinESMExports();
}
