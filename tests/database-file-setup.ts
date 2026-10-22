/** Each test file owns settings, accounts and media. Tests spawning concurrent
 * workers still share their own file's DB; independent suites cannot reroute it. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {afterAll} from 'vitest';

const root=process.env.DATA_DIR;
if(!root||path.dirname(path.resolve(root))!==path.resolve(os.tmpdir())||!path.basename(root).startsWith('ecs-test-'))throw new Error('Only an isolated test root may be used');
const dir=fs.mkdtempSync(path.join(root,'case-'));
fs.copyFileSync(path.join(root,'studio.db'),path.join(dir,'studio.db'));
process.env.DATA_DIR=dir;
// Never inherit selectors pointing at a live database/storage or a sibling fixture.
delete process.env.DATABASE_FILE;
delete process.env.STORAGE_DIR;
// HTTP responses may expose a lazy file stream after their headers were tested.
// Keep their files until the worker exits, after pending filesystem callbacks.
// The root is also removed by vitest.config.ts when the complete run exits.
process.once('exit',()=>fs.rmSync(dir,{recursive:true,force:true}));
afterAll(()=>{
 const globals=globalThis as typeof globalThis&{__ecomDb?:{close:()=>void}};
 try{globals.__ecomDb?.close();}catch{/* A test may already have closed its own connection. */}
 delete globals.__ecomDb;
 process.env.DATA_DIR=root;
});
