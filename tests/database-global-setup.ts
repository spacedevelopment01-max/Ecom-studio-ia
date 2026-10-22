/** Shared isolated database: initialize the native schema once before parallel workers open it.
 * Avoids the reproduced first-open WAL race without weakening application guards or timeouts.
 */
import path from 'node:path';
import os from 'node:os';
import type {TestProject} from 'vitest/node';
export default async function setup(project:TestProject){
 const directory=project.config.env.DATA_DIR;
 if(typeof directory!=='string'||path.dirname(path.resolve(directory))!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('ecs-test-'))throw new Error('Only an isolated test database may be initialized');
 process.env.DATA_DIR=directory;
 const {db}=await import('../src/lib/db');db().close();
}
