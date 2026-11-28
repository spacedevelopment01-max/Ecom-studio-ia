import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Humain, Titre, Bulle, Tribunal, Marteau} from './dessins';

export const ease = Easing.inOut(Easing.cubic);
export const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => <Ecran><Titre x={540} y={y} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;
const ROSE = '#f4a6b8', ROSE_F = '#e07a94';
export const txt = (x: number, y: number, s: string, taille = 70, c = '#fff', r = 0) => <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontSize={taille} fill={c} stroke={INK} strokeWidth={taille / 7} paintOrder="stroke" transform={r ? `rotate(${r} ${x} ${y})` : undefined}>{s}</text>;
export const Fond: React.FC<{c?: string}> = ({c = '#fbe7c6'}) => (<><rect x={-1500} y={-1500} width={4080} height={5000} fill={c} />{Array.from({length: 16}).map((_, i) => <path key={i} d="M 540 960 L 515 -800 L 565 -800 Z" fill="#fff" opacity={0.25} transform={`rotate(${i * 22.5} 540 960)`} />)}</>);
export const JUGE = {couleur: '#8a1e1e', chapeau: 'bonnet' as const, cheveux: '#9a9a9a', jambesC: '#2c2f36'};
export const GARDE = {couleur: '#6a6f7a', chapeau: 'bonnet' as const, cheveux: '#3b2a1e', jambesC: '#4a3a2a'};
export const GENS = [
	{couleur: '#8a6a3a', chapeau: 'aucun' as const, cheveux: '#3b2a1e', jambesC: '#4a3a2a'},
	{couleur: '#5a7a4a', chapeau: 'paille' as const, cheveux: '#a0522d', jambesC: '#4a3a2a'},
	{couleur: '#7a4a6a', chapeau: 'aucun' as const, cheveux: '#c9a060', jambesC: '#4a3a2a'},
	{couleur: '#4a5a8a', chapeau: 'bonnet' as const, cheveux: '#2b1a10', jambesC: '#4a3a2a'},
	{couleur: '#a0703a', chapeau: 'aucun' as const, cheveux: '#6a4426', jambesC: '#4a3a2a'},
];

/* ---------- décors ---------- */
export const Maison: React.FC<{x: number; y: number; s?: number; c?: string}> = ({x, y, s = 1, c = '#f1e2c0'}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-140} y={-320} width={280} height={320} fill={c} stroke={INK} strokeWidth={7} />
		{[[-140, -320, 140, 0], [140, -320, -140, 0], [-140, -160, 140, -160]].map(([a, b, cc, d], i) => <line key={i} x1={a} y1={b} x2={cc} y2={d} stroke="#6b4226" strokeWidth={12} />)}
		<path d="M -170 -320 L 0 -470 L 170 -320 Z" fill="#6a3a2a" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
		<rect x={-40} y={-110} width={80} height={110} fill="#6b4226" stroke={INK} strokeWidth={6} />
		<rect x={-110} y={-280} width={60} height={60} fill="#bfe3f2" stroke={INK} strokeWidth={5} /><rect x={50} y={-280} width={60} height={60} fill="#bfe3f2" stroke={INK} strokeWidth={5} />
	</g>
);
export const Ville: React.FC<{id: string; f: number; sol?: number}> = ({id, f, sol = 1450}) => (
	<>
		<Ciel id={id} /><Soleil x={880} y={300} f={f} /><Nuage x={220} y={330} />
		<Maison x={140} y={sol} s={0.9} /><Maison x={460} y={sol} s={1.05} c="#efd8b0" /><Maison x={800} y={sol} s={0.95} c="#f4e6cc" /><Maison x={1080} y={sol} s={0.9} />
		<rect x={-900} y={sol} width={2900} height={1500} fill="#b8a888" stroke={INK} strokeWidth={6} />
		{Array.from({length: 18}).map((_, i) => <rect key={i} x={-60 + (i % 9) * 140 + (Math.floor(i / 9) % 2) * 70} y={sol + 40 + Math.floor(i / 9) * 90} width={120} height={60} rx={10} fill="#a89878" stroke={INK} strokeWidth={3} />)}
	</>
);
export const Gibet: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-260} y={-60} width={520} height={60} fill="#7a5532" stroke={INK} strokeWidth={6} />
		<rect x={-150} y={-560} width={36} height={500} fill="#6b4226" stroke={INK} strokeWidth={6} />
		<rect x={-150} y={-560} width={300} height={34} fill="#6b4226" stroke={INK} strokeWidth={6} />
		<path d="M -114 -470 L -40 -540" stroke="#6b4226" strokeWidth={22} /><path d="M 120 -526 L 120 -400" stroke="#c9a86a" strokeWidth={8} />
		<ellipse cx={120} cy={-380} rx={26} ry={30} fill="none" stroke="#c9a86a" strokeWidth={8} />
	</g>
);
export const Parchemin: React.FC<{x: number; y: number; s?: number; r?: number; children?: React.ReactNode}> = ({x, y, s = 1, r = 0, children}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<rect x={-320} y={-380} width={640} height={760} rx={10} fill="#f2e3b8" stroke={INK} strokeWidth={8} />
		<rect x={-350} y={-400} width={700} height={50} rx={25} fill="#e0cc98" stroke={INK} strokeWidth={7} />
		<rect x={-350} y={350} width={700} height={50} rx={25} fill="#e0cc98" stroke={INK} strokeWidth={7} />
		{children}
	</g>
);
export const Gants: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[-70, 70].map((k, i) => <g key={k} transform={`translate(${k} 0) rotate(${i ? 12 : -12})`}><path d="M -50 60 L -50 -20 Q -60 -60 -40 -70 L -36 -110 Q -24 -120 -14 -110 L -12 -130 Q 0 -140 12 -130 L 14 -110 Q 26 -120 36 -110 L 40 -60 Q 60 -40 50 0 L 50 60 Z" fill="#8a5a35" stroke={INK} strokeWidth={6} strokeLinejoin="round" /><rect x={-54} y={40} width={108} height={30} fill="#6b4226" stroke={INK} strokeWidth={5} /></g>)}
	</g>
);

/* ---------- la truie ---------- */
export const Truie: React.FC<{x: number; y: number; s?: number; f: number; debout?: boolean; habit?: number; humeur?: 'neutre' | 'fier' | 'choc' | 'triste' | 'grogne'; flip?: boolean; court?: boolean}> = ({x, y, s = 1, f, debout, habit = 0, humeur = 'neutre', flip, court}) => {
	const p = court ? f * 0.6 : 0;
	const tete = (tx: number, ty: number) => (
		<g transform={`translate(${tx} ${ty})`}>
			<path d="M -70 -60 L -90 -120 L -30 -80 Z M 70 -60 L 90 -120 L 30 -80 Z" fill={ROSE_F} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
			<circle r={92} fill={ROSE} stroke={INK} strokeWidth={7} />
			<ellipse cx={0} cy={30} rx={44} ry={32} fill={ROSE_F} stroke={INK} strokeWidth={6} />
			<ellipse cx={-14} cy={30} rx={7} ry={11} fill={INK} /><ellipse cx={14} cy={30} rx={7} ry={11} fill={INK} />
			{[-38, 38].map((k) => <g key={k}><ellipse cx={k} cy={-28} rx={humeur === 'choc' ? 15 : 11} ry={humeur === 'choc' ? 17 : 13} fill="#fff" stroke={INK} strokeWidth={4} /><circle cx={k} cy={humeur === 'triste' ? -22 : -26} r={6} fill={INK} /></g>)}
			{humeur === 'fier' && <path d="M -56 -52 L -20 -46 M 56 -52 L 20 -46" stroke={INK} strokeWidth={6} />}
			{humeur === 'triste' && <path d="M -52 -50 L -24 -58 M 52 -50 L 24 -58" stroke={INK} strokeWidth={6} />}
			<path d={humeur === 'grogne' ? 'M -30 74 Q 0 60 30 74' : humeur === 'fier' ? 'M -26 70 Q 0 86 26 70' : 'M -20 74 L 20 74'} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
		</g>
	);
	if (!debout) return (
		<g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
			<path d={`M -200 -150 q -40 -20 -30 -50 q 10 -20 30 0`} stroke={ROSE_F} strokeWidth={10} fill="none" />
			{[-130, -60, 70, 140].map((k, i) => <rect key={k} x={k - 18} y={-80 + (court ? Math.sin(p + i * 1.6) * 10 : 0)} width={36} height={80} rx={10} fill={ROSE_F} stroke={INK} strokeWidth={5} />)}
			<ellipse cx={0} cy={-150} rx={210} ry={110} fill={ROSE} stroke={INK} strokeWidth={8} />
			{tete(200, -190)}
		</g>
	);
	const by = Math.sin(f * 0.08) * 4;
	return (
		<g transform={`translate(${x} ${y + by}) scale(${flip ? -s : s} ${s})`}>
			{[-50, 50].map((k) => <g key={k}><rect x={k - 24} y={-150} width={48} height={150} rx={14} fill={habit >= 2 ? '#3a4a6a' : ROSE_F} stroke={INK} strokeWidth={6} /><ellipse cx={k} cy={-4} rx={34} ry={14} fill="#3a2a22" stroke={INK} strokeWidth={4} /></g>)}
			<ellipse cx={0} cy={-260} rx={130} ry={160} fill={habit >= 1 ? '#7a2a3a' : ROSE} stroke={INK} strokeWidth={8} />
			{habit >= 1 && <><path d="M 0 -400 L 0 -110" stroke="#5a1a2a" strokeWidth={8} />{[-340, -280, -220, -160].map((k) => <circle key={k} cx={0} cy={k} r={9} fill="#ffd23f" stroke={INK} strokeWidth={3} />)}<path d="M -60 -410 L 0 -360 L 60 -410" fill="none" stroke="#fff" strokeWidth={14} /></>}
			{habit >= 2 && <rect x={-125} y={-170} width={250} height={70} rx={20} fill="#3a4a6a" stroke={INK} strokeWidth={6} />}
			{[-1, 1].map((k) => <g key={k}><path d={`M ${k * 110} -340 Q ${k * 170} -260 ${k * 150} -190`} stroke={INK} strokeWidth={46} fill="none" strokeLinecap="round" /><path d={`M ${k * 110} -340 Q ${k * 170} -260 ${k * 150} -190`} stroke={habit >= 1 ? '#7a2a3a' : ROSE} strokeWidth={32} fill="none" strokeLinecap="round" /><circle cx={k * 150} cy={-185} r={26} fill={habit >= 3 ? '#8a5a35' : ROSE_F} stroke={INK} strokeWidth={5} /></g>)}
			{tete(0, -470)}
		</g>
	);
};
export const Taureau: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[-110, -50, 60, 120].map((k) => <rect key={k} x={k - 18} y={-90} width={36} height={90} rx={8} fill="#4a3226" stroke={INK} strokeWidth={5} />)}
		<ellipse cx={0} cy={-150} rx={190} ry={100} fill="#6b4a3a" stroke={INK} strokeWidth={7} />
		<g transform="translate(-190 -190)"><path d="M -60 -50 Q -110 -80 -100 -120 M 50 -50 Q 100 -80 90 -120" stroke="#f1ead8" strokeWidth={18} fill="none" strokeLinecap="round" /><ellipse rx={80} ry={74} fill="#6b4a3a" stroke={INK} strokeWidth={7} /><ellipse cx={0} cy={40} rx={50} ry={30} fill="#c98a7a" stroke={INK} strokeWidth={5} /><circle cx={-28} cy={-14} r={9} fill={INK} /><circle cx={28} cy={-14} r={9} fill={INK} /><path d="M -32 -36 L -10 -26 M 32 -36 L 10 -26" stroke={INK} strokeWidth={6} /></g>
	</g>
);
export const Rat: React.FC<{x: number; y: number; s?: number; f: number; ph?: number}> = ({x, y, s = 1, f, ph = 0}) => (
	<g transform={`translate(${x} ${y + Math.sin(f * 0.2 + ph) * 4}) scale(${s})`}>
		<path d="M 60 -20 Q 120 -10 140 -50" stroke="#c98a7a" strokeWidth={8} fill="none" />
		<ellipse cx={0} cy={-30} rx={70} ry={40} fill="#8a8a90" stroke={INK} strokeWidth={5} />
		<circle cx={-70} cy={-50} r={32} fill="#8a8a90" stroke={INK} strokeWidth={5} /><circle cx={-60} cy={-84} r={16} fill="#c98a7a" stroke={INK} strokeWidth={4} />
		<circle cx={-80} cy={-56} r={6} fill={INK} /><circle cx={-102} cy={-46} r={6} fill="#c98a7a" />
	</g>
);
export const Barreaux: React.FC<{k: number}> = ({k}) => k <= 0 ? null : (
	<g opacity={k}>
		<rect x={140} y={800} width={800} height={900} fill="none" stroke={INK} strokeWidth={14} />
		{Array.from({length: 7}).map((_, i) => <g key={i}><rect x={170 + i * 115} y={800} width={26} height={900} fill="#6a6a6a" stroke={INK} strokeWidth={5} /></g>)}
		<rect x={140} y={1000} width={800} height={26} fill="#6a6a6a" stroke={INK} strokeWidth={5} />
	</g>
);

