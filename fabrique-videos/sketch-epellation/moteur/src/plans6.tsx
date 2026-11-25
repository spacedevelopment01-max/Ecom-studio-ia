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
const HUMEUR_S = ['content', 'content', 'content', 'neutre', 'neutre', 'perplexe', 'perplexe', 'neutre', 'neutre', 'pouffe', 'pouffe', 'pouffe', 'pouffe', 'neutre', 'neutre', 'neutre', 'content', 'content', 'triste', 'triste', 'content', 'content', 'neutre', 'neutre', 'pouffe'];
const HUMEUR_C = ['', 'content', '', 'content', '', 'fache', '', 'choc', '', 'perplexe', '', 'crie', '', 'choc', '', 'content', '', 'perplexe', '', 'content', '', 'content', '', 'crie', ''];

const Bureau: React.FC<{t: number; f: number; i: number}> = ({t, f, i}) => {
	const vasy = i === 16;
	return (
		<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#e9dcc4" />
			<rect x={60} y={380} width={420} height={460} fill="#9fc2e0" stroke={INK} strokeWidth={10} />
			{Array.from({length: 4}).map((_, k) => <rect key={k} x={80 + k * 100} y={640 - rnd(k) * 200} width={80} height={200} fill="#6f8fb0" />)}
			<rect x={640} y={420} width={300} height={220} fill="#b98a55" stroke={INK} strokeWidth={8} />
			{[0, 1, 2, 3].map((k) => <rect key={k} x={660 + (k % 2) * 140} y={440 + Math.floor(k / 2) * 100} width={110} height={80} fill={['#fff27a', '#ffb3c0', '#bfe3f2', '#fff27a'][k]} transform={`rotate(${(k - 1.5) * 4} ${715 + (k % 2) * 140} ${480 + Math.floor(k / 2) * 100})`} />)}
			<rect x={760} y={760} width={220} height={520} fill="#8f98a3" stroke={INK} strokeWidth={8} />
			{[0, 1, 2].map((k) => <rect key={k} x={780} y={790 + k * 160} width={180} height={130} fill="#a9b2bc" stroke={INK} strokeWidth={5} />)}
			<Humain x={360} y={1440} s={1.4} f={f} {...CONS} humeur={HUMEUR_S[i] as never} pose={vasy ? 'crie' : 'ecrit'} regard={vasy ? 0 : 1} />
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

const Gag: React.FC<{i: number; t: number; f: number; a: number}> = ({i, t, f, a}) => {
	const k = pop(t, a + 0.25, 0.4);
	if (k <= 0) return null;
	let contenu: React.ReactNode = null;
	if (i === 1) contenu = <text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={170} fill="#2f6fb0">@</text>;
	if (i === 3) contenu = <Humain x={0} y={300} s={0.9} f={f} {...BERNARD} pose="crie" humeur="content" />;
	if (i === 5 || i === 11 || i === 23) contenu = (<g><Humain x={-80} y={300} s={0.85} f={f * 1.5} {...BERNARD} pas flip humeur="choc" /><Perceuse x={110} y={20} s={1.1} r={-10} /></g>);
	if (i === 7) contenu = <Pompe x={0} y={200} s={1.2} prix={`${(2 + lin(t, [a, a + 3], [0, 0.9])).toFixed(2).replace('.', ',')} €`} />;
	if (i === 9) contenu = (<g><Humain x={-120} y={300} s={0.8} f={f} {...MAMIE1} humeur="fache" /><Humain x={120} y={300} s={0.8} f={f} {...MAMIE2} humeur="fache" flip /></g>);
	if (i === 13) contenu = <Tunnel x={0} y={180} s={1.05} k={lin(t, [a + 0.3, a + 2.5], [0, 1])} />;
	if (i === 15) contenu = <Bac x={0} y={160} s={1.15} f={f} />;
	if (i === 17) contenu = <text x={0} y={60} textAnchor="middle" fontFamily={FONT} fontSize={200} fill={INK}>?</text>;
	if (i === 19) contenu = (<g><rect x={-130} y={-130} width={260} height={260} rx={24} fill="#fff" stroke={INK} strokeWidth={8} /><rect x={-130} y={-130} width={260} height={80} rx={24} fill="#c0392b" stroke={INK} strokeWidth={8} /><text x={0} y={60} textAnchor="middle" fontFamily={FONT} fontSize={52} fill={INK}>DIMANCHE</text></g>);
	if (!contenu) return null;
	return (
		<Ecran>
			<Bulle x={660} y={560} w={560} h={480} k={k} queue={[-200, 330]} pensee>
				<defs><clipPath id={`g${i}`}><rect x={-270} y={-230} width={540} height={460} rx={200} /></clipPath></defs>
				<g clipPath={`url(#g${i})`}>{contenu}</g>
			</Bulle>
		</Ecran>
	);
};

const Maison: React.FC<{t: number; f: number; i: number; a: number}> = ({t, f, i, a}) => (
	<>
		<rect x={-800} y={-800} width={2680} height={3600} fill="#f1dcc0" />
		<rect x={-800} y={1500} width={2680} height={1200} fill="#b5835a" stroke={INK} strokeWidth={6} />
		<rect x={600} y={420} width={300} height={360} fill="#bfe3f2" stroke={INK} strokeWidth={10} />
		<line x1={750} y1={420} x2={750} y2={780} stroke={INK} strokeWidth={6} />
		<rect x={90} y={520} width={220} height={160} fill="#e8c07a" stroke={INK} strokeWidth={8} />
		<path d="M 120 650 L 170 590 L 210 630 L 250 570 L 290 650 Z" fill="#6f9e45" />
		<g transform="translate(960 1500)"><rect x={-50} y={-120} width={100} height={120} fill="#c0573a" stroke={INK} strokeWidth={6} /><circle cx={0} cy={-170} r={70} fill="#5e9c3f" stroke={INK} strokeWidth={6} /></g>
		<Canape x={620} y={1640} s={1} />
		<Humain x={330} y={1640} s={1.4} f={f * (HUMEUR_C[i] === 'crie' ? 1.6 : 1)} {...CLIENT} pose="tel" humeur={(HUMEUR_C[i] || 'content') as never} regard={1} />
		<Gag i={i} t={t} f={f} a={a} />
	</>
);

export const PLANS6: [number, number, React.FC][] = LIGNES.map((l, i) => {
	const a = i === 0 ? 0 : l.s - 0.05;
	const b = i + 1 < LIGNES.length ? LIGNES[i + 1].s - 0.05 : FIN;
	const P: React.FC = () => (
		<Plan debut={a} fin={b} coupe cam={(t) => (l.qui === 'S'
			? {z: lin(t, [a, b], [1.2, 1.3], ease), x: 40, y: -80}
			: {z: lin(t, [a, b], [1.1, 1.2], ease), x: 60, y: -180})}
			secousse={(t) => (HUMEUR_C[i] === 'crie' && l.qui === 'C' && t < a + 0.6 ? 10 : 0)}>
			{(t, f) => (l.qui === 'S' ? <Bureau t={t} f={f} i={i} /> : <Maison t={t} f={f} i={i} a={a} />)}
		</Plan>
	);
	return [a, b, P];
});
