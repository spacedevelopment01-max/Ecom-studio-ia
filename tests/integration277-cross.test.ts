/** #277 : sonde indépendante des tables créées à la demande. Vrais moteurs/SQL, zéro réseau. Les autres sondes passaient par l'ancien assistant : elles sont parties avec lui. */
import {expect,it} from 'vitest';
import {account,project} from './conversation209-fixtures';
import {listRealisations} from '@/lib/contenus/realisations';
import {listCarte} from '@/lib/contenus/carte';
import {ensureSiteTables} from '@/lib/sites/store';
import {ensureNotifyTables} from '@/lib/sites/notify';
import {ensureMaintenanceTables} from '@/lib/sites/maintenance';
import {customDomains} from '@/lib/sites/domains';
import {all,tx} from '@/lib/db';

it('tables à la demande : création annulée puis nouvelle utilisation, sans état prêt périmé',async()=>{
 const u=await account(),pid=project(u,'services');
 const operations=[()=>listCarte(pid),()=>listRealisations(pid),()=>ensureSiteTables(),()=>ensureNotifyTables(),()=>ensureMaintenanceTables(),()=>customDomains(pid)];
 for(const operation of operations){expect(()=>tx(()=>{operation();throw Error('annulation volontaire 277');})).toThrow('annulation volontaire 277');expect(()=>operation()).not.toThrow();}
 expect(all('SELECT id FROM ai_calls WHERE project_id=?',pid)).toHaveLength(0);
});
