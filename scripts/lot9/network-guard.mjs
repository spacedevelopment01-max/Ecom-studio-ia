/** Harnais uniquement : transporte les faux fetch des suites, refuse tout vrai HTTP/TCP hors loopback. */
import http from 'node:http';import https from 'node:https';import net from 'node:net';
const allowed=new Set(['127.0.0.1','localhost','::1','controlled.example.test']);
function check(host){host=String(host||'localhost').replace(/^\[|\]$/g,'');if(!allowed.has(host))throw new Error('LOT9_EXTERNAL_NETWORK_BLOCKED');}
for(const m of [http,https])for(const name of ['request','get']){const native=m[name];m[name]=function(...args){const v=args[0];check(typeof v==='string'||v instanceof URL?new URL(v).hostname:v.hostname||v.host);return native.apply(this,args);};}
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){let v=args[0];if(Array.isArray(v))v=v[0];if(typeof v==='object'){if(!v.path)check(v.hostname||v.host);}else if(typeof v==='number')check(typeof args[1]==='string'?args[1]:'localhost');return connect.apply(this,args);};
