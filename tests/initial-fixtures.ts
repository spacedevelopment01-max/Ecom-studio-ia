import {chooseCommunicationForTest} from './communication-choice-fixture';
/** Synthetic provider fixtures; no network or real creative quality asserted. */
import sharp from 'sharp';
import { fixture, initializeSynthetic, simulatedDependencies } from './preparation-fixtures';
import { approve, stateOf, queuePreparation, runPreparation, confirmIdentity } from '@/lib/preparation/engine';
import { JobContext, completeJob, failJob, getJob } from '@/lib/jobs';
import { run, all } from '@/lib/db';
import { prepareInitialCreatives, quoteInitialCreatives, queueInitialCreatives, runInitialCreatives, type InitialDeps, type InitialPlan } from '@/lib/social-v2/initial';
import { designPostWithAi, type AiPostDeps } from '@/lib/social-v2/ai-post';
import { campaignConcept, campaignVerdict } from './publication-fixtures';
import { FORMATS } from '@/lib/image-v2/formats';
import { exactConceptConflicts } from '@/lib/social-v2/initial-diversity';
export async function readyInitial(index = 0) {
    const f = await fixture(index % 2 ? 'services' : 'products', index);
    initializeSynthetic(f.pid, f.input);
    prepareInitialCreatives(f.pid);
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
const IDEAS = [
    ['Observer les outils', 'Inventaire disposé en cercle avec légendes de préparation'], ['Une question pratique', 'Question en haut et réponse en pied sur photographie de matière'], ['Classer les éléments', 'Colonnes de familles de formes avec lecture verticale'], ['Suivre les étapes', 'Frise horizontale illustrant une succession de préparations'], ['Lire les détails', 'Schéma de détail annoté sur une grande zone claire'], ['Ranger le matériel', 'Étagère en perspective avec objets séparés et repères'], ['Explorer les usages', 'Diptyque de deux situations documentées sans chiffres'], ['Choisir son point de départ', 'Carte mentale à branches radiales autour du sujet'], ['Partager une observation', 'Grande question typographique avec petit objet au centre'], ['Vérifier la préparation', 'Checklist sur panneau latéral et détail de support'],
    ['Découvrir la matière', 'Macrophotographie pleine page et typographie verticale'], ['Présenter une situation réelle', 'Objet documenté dans un contexte de travail en vue large'], ['Expliquer le choix du support', 'Éclaté descriptif des parties connues sur fond sombre'], ['Mettre un usage en évidence', 'Composition diagonale montrant un outil et sa zone utile'], ['Éclairer une objection', 'Deux panneaux opposés pour une objection et la réponse fournie'], ['Montrer la silhouette documentée', 'Contrejour latéral et grand espace inférieur de lecture'], ['Composer un rythme de détails', 'Triptyque de gros plans distincts sur la même matière'], ['Révéler une finition', 'Cadrage rasant sur surface avec accroche dans le reflet'], ['Donner une idée de place', 'Vue en plongée dans un environnement à la marque'], ['Inviter à découvrir la gamme', 'Composition sculpturale sur socle et accroche en arche']
];
export function makeInitialPlan(): InitialPlan { return { posts: IDEAS.map(([idea, composition], i) => ({ purpose: i < 10 ? 'organic' : 'ad', title: idea, caption: `Contenu synthétique fourni : ${idea.toLowerCase()}. Observer les éléments documentés avant de choisir.`, pillar: i < 10 ? 'informer' : 'présenter', objective: i < 10 ? 'educate' : 'convert', request: `Idée indépendante : ${idea}. Composition : ${composition}. Aucun humain.`, concept: { idea: `${idea} pour comprendre le sujet documenté`, message: `${idea} avec les informations réellement fournies`, composition, scene: `Scène de test destinée à ${idea.toLowerCase()}`, framing: `Cadrage spécifique pour ${idea.toLowerCase()}` }, editorial: { structure: i < 10 ? 'advice' : 'editorial_photo', blocks: i < 10 ? [{ kind: 'tip', text: `${idea} : regarder les éléments fournis.` }] : [] }, ...(i < 10 ? {} : { advertising: { audience: 'Public décrit du projet', angle: idea, benefit: 'Caractéristique documentée seulement', proof: '', offer: '', cta: 'Découvrir' } }) })) }; }
export function injectedInitial() {
    const calls: {
        slot: string;
        aspect: string;
        purpose: string;
        network: string;
        advertisingNetwork?: string;
    }[] = [], paid: {
        key: string;
        cost: number;
    }[] = [], repairs: number[][] = [], visuals: {
        index: number;
        accepted: number[];
    }[] = [];
    let plans = 0, failAt = -1;
    const plan = makeInitialPlan();
    const ai: AiPostDeps = { copy: async (_p, _post, f, key) => { paid.push({ key, cost: 1 }); return { ...f, cta: '', scene: 'Composition synthétique du concept documenté pour le test', concept: { ...campaignConcept(), ctaStyle: 'none' } }; }, generate: async (_prompt, aspect, _r, key) => { paid.push({ key, cost: 1 }); const d = FORMATS[aspect]; return sharp({ create: { ...d, channels: 3, background: '#385b66' } }).png().toBuffer(); }, review: async (_i, _r, texts, key) => { paid.push({ key, cost: 1 }); return { ...campaignVerdict(), person: false, anatomyOk: true, productFaithful: true, textsExact: true, legible: true, score: 9.2, transcribed: texts, issues: [], fix: '' }; }, maxMicro: () => 1, conceptMaxMicro: () => 1, reviewMaxMicro: () => 1, spentMicro: prefix => paid.filter(x => x.key.startsWith(prefix)).length };
    const deps: InitialDeps = { guard: () => { }, costs: () => ({ planProbable: 5, planCap: 10, imageProbable: 3, imageCap: 20, visualProbable: 1, visualCap: 2, repairCap: 3 }), plan: async () => { plans++; return structuredClone(plan); }, reviewPlan: async (_p, p) => { const duplicates = exactConceptConflicts(p); return { accepted: !duplicates.length, duplicates, issues: [] }; }, repairPlan: async (_p, p, indices) => { repairs.push(indices); const next = structuredClone(p), fresh = makeInitialPlan(); for (const i of indices) {
            next.posts[i] = fresh.posts[i];
            next.posts[i].concept.idea += ' ; perspective analytique nouvelle';
            next.posts[i].concept.composition += repairs.length % 2 ? ' ; lecture en éventail et échelle alternative' : ' ; vue analytique en coupe et parcours vertical';
        } return next; }, reviewVisual: async (_p, _plan, index, _aid, accepted) => { visuals.push({ index, accepted: accepted.map(x => x.index) }); return { accepted: true, duplicateOf: null, reason: 'Évaluation de diversité SIMULÉE ; aucune qualité réelle démontrée.' }; }, render: async (p, post, aspect, _cap, _ctx, attemptLimit) => { calls.push({ slot: post.id, aspect, purpose: post.entryPoint === 'ads-campaign' ? 'ad' : 'organic', network: post.network, advertisingNetwork: (post.advertising as any)?.platform?.network }); if (calls.length === failAt)
            throw Error('Fournisseur indisponible de test'); return designPostWithAi(p, post, { as: post.entryPoint === 'ads-campaign' ? 'ad' : 'post', aspect, reference: p.business === 'products' ? all<{
                id: string;
            }>("SELECT id FROM assets WHERE project_id=? AND role='original' AND deleted_at IS NULL", p.id)[0]?.id ?? null : null, maxCostEur: 1, maxAttempts: attemptLimit }, ai); } };
    return { deps, ai, calls, paid, plan, repairs, visuals, get plans() { return plans; }, failNext(n: number) { failAt = n; } };
}
export async function executeInitial(pid: string, deps: InitialDeps, quoteId?: string) { const q = quoteId ?? quoteInitialCreatives(pid, deps).id, r = queueInitialCreatives(pid, q, deps), j = getJob(r.jobId!)!; run("UPDATE jobs SET status='running' WHERE id=?", j.id); try {
    const out = await runInitialCreatives(new JobContext(j), deps);
    completeJob(j.id, out);
    return out;
}
catch (e) {
    failJob(getJob(j.id)!, e, { permanent: true });
    throw e;
} }
