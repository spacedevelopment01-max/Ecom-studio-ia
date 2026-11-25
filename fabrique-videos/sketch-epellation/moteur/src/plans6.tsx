import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Humain, Bulle, Salon, Canape, Perceuse, Pompe, Tunnel, Bac} from './dessins';
import minutage from './minutage.json';

type Ligne = {qui: 'S' | 'C'; s: number; e: number};
const LIGNES = (minutage as unknown as {lignes: Ligne[]; duree: number}).lignes;
export const FIN = (minutage as unknown as {duree: number}).duree + 0.6;
const ease = Easing.inOut(Easing.cubic);

const CONS = {couleur: '#2c3e66', chapeau: 'aucun' as const, cheveux: '#4a2e1a', jambesC: '#2c2f36', cravate: '#c0392b', casque: true};
const CLIENT = {couleur: '#d86a4a', chapeau: 'aucun' as const, cheveux: '#2b1a10', jambesC: '#2f3e5a'};
const BERNARD = {couleur: '#3c8a4a', chapeau: 'aucun' as const, cheveux: '#8f8f8f', jambesC: '#2f3e5a', moustache: true};
const MAMIE1 = {couleur: '#7a3fa0', chapeau: 'aucun' as const, cheveux: '#d0d0d0', jambesC: '#5a3f7a'};
const MAMIE2 = {couleur: '#c0573a', chapeau: 'aucun' as const, cheveux: '#e6e6e6', jambesC: '#7a2a20'};

const ECRAN = ['', '', '', '', 'B', 'B', 'BR', 'BR', 'BRO', 'BRO', 'BROC', 'BROC', 'BROCH', 'BROCH', 'BROCHA', 'BROCHA', 'BROCHAR', 'BROCHAR', 'BROCHAR', 'BROCHAR', 'BROCHARD', 'BROCHARD', 'BROCHARD', 'BROCHARD', 'BROCHARD'];
const HUMEUR_S = ['content', 'neutre', 'content', 'neutre', 'neutre', 'perplexe', 'perplexe', 'choc', 'neutre', 'pouffe', 'pouffe', 'choc', 'pouffe', 'perplexe', 'neutre', 'perplexe', 'content', 'triste', 'triste', 'neutre', 'content', 'content', 'neutre', 'choc', 'pouffe'];
const HUMEUR_C = ['', 'content', '', 'content', '', 'fache', '', 'choc', '', 'perplexe', '', 'crie', '', 'choc', '', 'content', '', 'perplexe', '', 'content', '', 'content', '', 'crie', ''];

const Bureau: React.FC<{t: number; f: number; i: number; parle: boolean}> = ({t, f, i, parle}) => {
	const vasy = i === 16;
	const ecoute = i >= 3 && i <= 19 && LIGNES[i].qui === 'C';
	return (
		<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#e9dcc4" />
			<rect x={60} y={380} width={420} height={460} fill="#9fc2e0" stroke={INK} strokeWidth={10} />
			{Array.from({length: 4}).map((_, k) => <rect key={k} x={80 + k * 100} y={640 - rnd(k) * 200} width={80} height={200} fill="#6f8fb0" />)}
			<rect x={640} y={420} width={300} height={220} fill="#b98a55" stroke={INK} strokeWidth={8} />
			{[0, 1, 2, 3].map((k) => <rect key={k} x={660 + (k % 2) * 140} y={440 + Math.floor(k / 2) * 100} width={110} height={80} fill={['#fff27a', '#ffb3c0', '#bfe3f2', '#fff27a'][k]} transform={`rotate(${(k - 1.5) * 4} ${715 + (k % 2) * 140} ${480 + Math.floor(k / 2) * 100})`} />)}
			<rect x={760} y={760} width={220} height={520} fill="#8f98a3" stroke={INK} strokeWidth={8} />
			{[0, 1, 2].map((k) => <rect key={k} x={780} y={790 + k * 160} width={180} height={130} fill="#a9b2bc" stroke={INK} strokeWidth={5} />)}
			<Humain x={360} y={1440} s={1.4} f={f} {...CONS} humeur={(parle && (f % 8) < 5 ? 'parle' : HUMEUR_S[i]) as never} pose={vasy ? 'crie' : ecoute ? 'ecrit' : 'debout'} regard={vasy || parle ? 0 : 1} />
			<rect x={-300} y={1300} width={1680} height={60} fill="#a8703f" stroke={INK} strokeWidth={8} />
			<rect x={-300} y={1360} width={1680} height={900} fill="#8a5a35" stroke={INK} strokeWidth={8} />
			<g transform="translate(800 1300) scale(0.85)">
				<rect x={-30} y={-90} width={60} height={90} fill="#5d6570" stroke={INK} strokeWidth={6} />
				<rect x={-240} y={-420} width={480} height={330} rx={18} fill="#3a3f4a" stroke={INK} strokeWidth={8} />
				<rect x={-210} y={-390} width={420} height={270} rx={8} fill="#f4f7fb" />
				<text x={-190} y={-340} fontFamily={FONT} fontSize={30} fill="#5d6570">NOM DU CLIENT</text>
				<rect x={-190} y={-320} width={380} height={80} rx={8} fill="#fff" stroke="#9fb3c8" strokeWidth={5} />
				<text x={-175} y={-262} fontFamily={FONT} fontSize={56} fill={INK}>{ECRAN[i]}{(f % 30) < 15 ? '|' : ''}</text>
			</g>
		</>
	);
};


const ligneA = (t: number) => { let i = 0; for (let k = 0; k < LIGNES.length; k++) if (LIGNES[k].s - 0.05 <= t) i = k; return i; };
const Unique: React.FC = () => (
	<Plan debut={0} fin={FIN} coupe cam={(t) => {
		const i = ligneA(t);
		const coup = (i === 11 || i === 23) && t - LIGNES[i].s < 0.9 ? 0.18 : 0;
		return {z: lin(t, [0, FIN], [1.45, 1.6], ease) + coup, x: -20, y: -110 + coup * 200};
	}} secousse={(t) => { const i = ligneA(t); return (i === 11 || i === 23) && t - LIGNES[i].s < 0.6 ? 8 : 0; }}>
		{(t, f) => { const i = ligneA(t); const l = LIGNES[i]; return <Bureau t={t} f={f} i={i} parle={l.qui === 'S' && t <= l.e} />; }}
	</Plan>
);
export const PLANS6: [number, number, React.FC][] = [[0, FIN, Unique]];
