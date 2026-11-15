import {chooseCommunicationForTest} from './communication-choice-fixture';
/** Projet d'essai prêt (fiche, angle et marque validés) : fournisseurs simulés, aucun réseau, aucune qualité créative prouvée. */
import { fixture, initializeSynthetic, simulatedDependencies } from './preparation-fixtures';
import { JobContext, completeJob } from '@/lib/jobs';
import { run } from '@/lib/db';
import { approve, stateOf, queuePreparation, runPreparation, confirmIdentity } from '@/lib/preparation/engine';
export async function readyInitial(index = 0) {
    const f = await fixture(index % 2 ? 'services' : 'products', index);
    initializeSynthetic(f.pid, f.input);
    approve(f.pid, stateOf(f.pid)!.revision, 'brief');
    async function step(k: 'research' | 'brand', a: 'generate' | 'logo' = 'generate') { const q = queuePreparation(f.pid, stateOf(f.pid)!.revision, k, a, { paid: false, capMicro: 0 }); if (q.job) {
        run("UPDATE jobs SET status='running',attempts=1 WHERE id=?", q.job.id);
        const out = await runPreparation(new JobContext(q.job), simulatedDependencies);
        completeJob(q.job.id, out);
    } }
    await step('research');
    approve(f.pid, stateOf(f.pid)!.revision, 'research', { choiceId: 'transparence' });
    await step('brand');
    const b = stateOf(f.pid)!.stages.brand!.data.proposal;
    confirmIdentity(f.pid, stateOf(f.pid)!.revision, { name: b.name, tagline: b.tagline, palette: b.palette, fonts: b.fonts });
    await step('brand', 'logo');
    approve(f.pid, stateOf(f.pid)!.revision, 'brand', { logoId: stateOf(f.pid)!.stages.brand!.data.logoCandidates[0] });
    chooseCommunicationForTest(f.pid);
    return f;
}
