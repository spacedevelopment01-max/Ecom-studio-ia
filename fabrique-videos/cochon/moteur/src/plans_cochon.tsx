import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Humain, Titre, Bulle, Tribunal, Marteau} from './dessins';

const ease = Easing.inOut(Easing.cubic);
const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => <Ecran><Titre x={540} y={y} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;
const ROSE = '#f4a6b8', ROSE_F = '#e07a94';
const txt = (x: number, y: number, s: string, taille = 70, c = '#fff', r = 0) => <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontSize={taille} fill={c} stroke={INK} strokeWidth={taille / 7} paintOrder="stroke" transform={r ? `rotate(${r} ${x} ${y})` : undefined}>{s}</text>;
const Fond: React.FC<{c?: string}> = ({c = '#fbe7c6'}) => (<><rect x={-1500} y={-1500} width={4080} height={5000} fill={c} />{Array.from({length: 16}).map((_, i) => <path key={i} d="M 540 960 L 515 -800 L 565 -800 Z" fill="#fff" opacity={0.25} transform={`rotate(${i * 22.5} 540 960)`} />)}</>);
const JUGE = {couleur: '#8a1e1e', chapeau: 'bonnet' as const, cheveux: '#9a9a9a', jambesC: '#2c2f36'};
const GARDE = {couleur: '#6a6f7a', chapeau: 'bonnet' as const, cheveux: '#3b2a1e', jambesC: '#4a3a2a'};
const GENS = [
	{couleur: '#8a6a3a', chapeau: 'aucun' as const, cheveux: '#3b2a1e', jambesC: '#4a3a2a'},
	{couleur: '#5a7a4a', chapeau: 'paille' as const, cheveux: '#a0522d', jambesC: '#4a3a2a'},
	{couleur: '#7a4a6a', chapeau: 'aucun' as const, cheveux: '#c9a060', jambesC: '#4a3a2a'},
	{couleur: '#4a5a8a', chapeau: 'bonnet' as const, cheveux: '#2b1a10', jambesC: '#4a3a2a'},
	{couleur: '#a0703a', chapeau: 'aucun' as const, cheveux: '#6a4426', jambesC: '#4a3a2a'},
];

/* ---------- décors ---------- */
const Maison: React.FC<{x: number; y: number; s?: number; c?: string}> = ({x, y, s = 1, c = '#f1e2c0'}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-140} y={-320} width={280} height={320} fill={c} stroke={INK} strokeWidth={7} />
		{[[-140, -320, 140, 0], [140, -320, -140, 0], [-140, -160, 140, -160]].map(([a, b, cc, d], i) => <line key={i} x1={a} y1={b} x2={cc} y2={d} stroke="#6b4226" strokeWidth={12} />)}
		<path d="M -170 -320 L 0 -470 L 170 -320 Z" fill="#6a3a2a" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
		<rect x={-40} y={-110} width={80} height={110} fill="#6b4226" stroke={INK} strokeWidth={6} />
		<rect x={-110} y={-280} width={60} height={60} fill="#bfe3f2" stroke={INK} strokeWidth={5} /><rect x={50} y={-280} width={60} height={60} fill="#bfe3f2" stroke={INK} strokeWidth={5} />
	</g>
);
const Ville: React.FC<{id: string; f: number; sol?: number}> = ({id, f, sol = 1450}) => (
	<>
		<Ciel id={id} /><Soleil x={880} y={300} f={f} /><Nuage x={220} y={330} />
		<Maison x={140} y={sol} s={0.9} /><Maison x={460} y={sol} s={1.05} c="#efd8b0" /><Maison x={800} y={sol} s={0.95} c="#f4e6cc" /><Maison x={1080} y={sol} s={0.9} />
		<rect x={-900} y={sol} width={2900} height={1500} fill="#b8a888" stroke={INK} strokeWidth={6} />
		{Array.from({length: 18}).map((_, i) => <rect key={i} x={-60 + (i % 9) * 140 + (Math.floor(i / 9) % 2) * 70} y={sol + 40 + Math.floor(i / 9) * 90} width={120} height={60} rx={10} fill="#a89878" stroke={INK} strokeWidth={3} />)}
	</>
);
const Gibet: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-260} y={-60} width={520} height={60} fill="#7a5532" stroke={INK} strokeWidth={6} />
		<rect x={-150} y={-560} width={36} height={500} fill="#6b4226" stroke={INK} strokeWidth={6} />
		<rect x={-150} y={-560} width={300} height={34} fill="#6b4226" stroke={INK} strokeWidth={6} />
		<path d="M -114 -470 L -40 -540" stroke="#6b4226" strokeWidth={22} /><path d="M 120 -526 L 120 -400" stroke="#c9a86a" strokeWidth={8} />
		<ellipse cx={120} cy={-380} rx={26} ry={30} fill="none" stroke="#c9a86a" strokeWidth={8} />
	</g>
);
const Parchemin: React.FC<{x: number; y: number; s?: number; r?: number; children?: React.ReactNode}> = ({x, y, s = 1, r = 0, children}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<rect x={-320} y={-380} width={640} height={760} rx={10} fill="#f2e3b8" stroke={INK} strokeWidth={8} />
		<rect x={-350} y={-400} width={700} height={50} rx={25} fill="#e0cc98" stroke={INK} strokeWidth={7} />
		<rect x={-350} y={350} width={700} height={50} rx={25} fill="#e0cc98" stroke={INK} strokeWidth={7} />
		{children}
	</g>
);
const Gants: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[-70, 70].map((k, i) => <g key={k} transform={`translate(${k} 0) rotate(${i ? 12 : -12})`}><path d="M -50 60 L -50 -20 Q -60 -60 -40 -70 L -36 -110 Q -24 -120 -14 -110 L -12 -130 Q 0 -140 12 -130 L 14 -110 Q 26 -120 36 -110 L 40 -60 Q 60 -40 50 0 L 50 60 Z" fill="#8a5a35" stroke={INK} strokeWidth={6} strokeLinejoin="round" /><rect x={-54} y={40} width={108} height={30} fill="#6b4226" stroke={INK} strokeWidth={5} /></g>)}
	</g>
);

/* ---------- la truie ---------- */
const Truie: React.FC<{x: number; y: number; s?: number; f: number; debout?: boolean; habit?: number; humeur?: 'neutre' | 'fier' | 'choc' | 'triste' | 'grogne'; flip?: boolean; court?: boolean}> = ({x, y, s = 1, f, debout, habit = 0, humeur = 'neutre', flip, court}) => {
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
const Taureau: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[-110, -50, 60, 120].map((k) => <rect key={k} x={k - 18} y={-90} width={36} height={90} rx={8} fill="#4a3226" stroke={INK} strokeWidth={5} />)}
		<ellipse cx={0} cy={-150} rx={190} ry={100} fill="#6b4a3a" stroke={INK} strokeWidth={7} />
		<g transform="translate(-190 -190)"><path d="M -60 -50 Q -110 -80 -100 -120 M 50 -50 Q 100 -80 90 -120" stroke="#f1ead8" strokeWidth={18} fill="none" strokeLinecap="round" /><ellipse rx={80} ry={74} fill="#6b4a3a" stroke={INK} strokeWidth={7} /><ellipse cx={0} cy={40} rx={50} ry={30} fill="#c98a7a" stroke={INK} strokeWidth={5} /><circle cx={-28} cy={-14} r={9} fill={INK} /><circle cx={28} cy={-14} r={9} fill={INK} /><path d="M -32 -36 L -10 -26 M 32 -36 L 10 -26" stroke={INK} strokeWidth={6} /></g>
	</g>
);
const Rat: React.FC<{x: number; y: number; s?: number; f: number; ph?: number}> = ({x, y, s = 1, f, ph = 0}) => (
	<g transform={`translate(${x} ${y + Math.sin(f * 0.2 + ph) * 4}) scale(${s})`}>
		<path d="M 60 -20 Q 120 -10 140 -50" stroke="#c98a7a" strokeWidth={8} fill="none" />
		<ellipse cx={0} cy={-30} rx={70} ry={40} fill="#8a8a90" stroke={INK} strokeWidth={5} />
		<circle cx={-70} cy={-50} r={32} fill="#8a8a90" stroke={INK} strokeWidth={5} /><circle cx={-60} cy={-84} r={16} fill="#c98a7a" stroke={INK} strokeWidth={4} />
		<circle cx={-80} cy={-56} r={6} fill={INK} /><circle cx={-102} cy={-46} r={6} fill="#c98a7a" />
	</g>
);
const Barreaux: React.FC<{k: number}> = ({k}) => k <= 0 ? null : (
	<g opacity={k}>
		<rect x={140} y={800} width={800} height={900} fill="none" stroke={INK} strokeWidth={14} />
		{Array.from({length: 7}).map((_, i) => <g key={i}><rect x={170 + i * 115} y={800} width={26} height={900} fill="#6a6a6a" stroke={INK} strokeWidth={5} /></g>)}
		<rect x={140} y={1000} width={800} height={26} fill="#6a6a6a" stroke={INK} strokeWidth={5} />
	</g>
);

/* ---------- les plans ---------- */
export const K01: React.FC = () => (
	<Plan debut={0} fin={7.37} sansEntree cam={(t) => ({z: lin(t, [0, 7.37], [1.0, 1.2], ease), y: -100})}>
		{(t, f) => (<>
			<Tribunal />
			<Humain x={300} y={1700} s={1.1} f={f} {...JUGE} pose="main" humeur="fache" />
			<Truie x={760} y={1700} s={0.95} f={f} debout humeur={t > 6.1 ? 'triste' : 'neutre'} />
			{t > 6.1 && <g transform={`translate(540 1150) rotate(-12) scale(${pop(t, 6.1)})`}><rect x={-290} y={-80} width={580} height={160} rx={18} fill="none" stroke="#c0392b" strokeWidth={14} /><text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#c0392b">COUPABLE</text></g>}
			{T(t, 0.1, '1386', 170)}
			{T(t, 2.4, 'UN COCHON AU TRIBUNAL', 88, '#fff', 560)}
		</>)}
	</Plan>
);

export const K02: React.FC = () => (
	<Plan debut={7.37} fin={13.41} cam={(t) => ({z: lin(t, [7.37, 13.41], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Ville id="k2" f={f} />
			<Truie x={lin(t, [8.7, 10.5], [-250, 560], ease)} y={1640} s={0.8} f={f} court={t < 10.5} humeur="neutre" />
			{t > 10.3 && GENS.slice(0, 3).map((g, i) => <Humain key={i} x={[140, 860, 1000][i]} y={1700} s={0.85} f={f * 1.3} {...g} pose="crie" humeur="choc" ph={i} flip={i > 0} />)}
			{T(t, 7.4, 'FALAISE, NORMANDIE', 100)}
			{t > 12.5 && T(t, 12.5, 'UN DRAME', 130, '#ff4b2b', 560)}
		</>)}
	</Plan>
);

export const K03: React.FC = () => (
	<Plan debut={13.41} fin={21.33} cam={(t) => ({z: lin(t, [13.41, 21.33], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			{t < 17.6 ? <Ville id="k3" f={f} /> : <Fond c="#d8d0c0" />}
			{t < 17.6 && <><Humain x={230} y={1720} s={1.0} f={f} {...GARDE} pose="baton" humeur="fache" /><Humain x={850} y={1720} s={1.0} f={f} {...GARDE} pose="baton" humeur="fache" flip /></>}
			<Truie x={540} y={1680} s={0.85} f={f} humeur={t > 17.6 ? 'triste' : 'choc'} />
			<Barreaux k={lin(t, [17.6, 18.0], [0, 1])} />
			{t > 19.0 && <Ecran><g transform={`translate(540 1250) scale(${pop(t, 19.0)})`}><rect x={-300} y={-70} width={600} height={140} rx={20} fill="#fff" stroke={INK} strokeWidth={8} /><text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={74} fill="#8a1e1e">CONVOCATION</text></g></Ecran>}
			{T(t, 14.4, 'ON NE L\'ABAT PAS…', 100)}
			{T(t, 16.9, 'ON L\'ARRÊTE', 120, '#ff4b2b', 560)}
			{t > 20.3 && T(t, 20.3, 'COMME UN HUMAIN', 110, '#fff', 720)}
		</>)}
	</Plan>
);

export const K04: React.FC = () => (
	<Plan debut={21.33} fin={28.02} cam={(t) => ({z: lin(t, [21.33, 26.6, 28.02], [1.0, 1.1, 1.35], ease), x: lin(t, [26.6, 28], [0, 150], ease), y: -150})}>
		{(t, f) => (<>
			<Tribunal />
			<Humain x={540} y={1380} s={0.9} f={f} {...JUGE} humeur="neutre" />
			{t > 22.3 && GENS.slice(0, 2).map((g, i) => <Humain key={i} x={150 + i * 140} y={1750} s={0.75} f={f} {...g} pose="main" humeur="perplexe" ph={i} />)}
			{t > 23.3 && <g transform={`translate(160 1150) scale(${pop(t, 23.3)})`}><rect x={-90} y={-110} width={180} height={220} rx={10} fill="#8a1e1e" stroke={INK} strokeWidth={7} />{txt(0, 20, 'LOI', 50, '#ffd23f')}</g>}
			<Truie x={830} y={1760} s={0.75} f={f} debout humeur={t > 26.7 ? 'grogne' : 'neutre'} />
			<Bulle x={760} y={1020} w={360} h={170} k={pop(t, 26.7)} queue={[60, 150]}><text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontSize={70} fill={INK}>GROIN.</text></Bulle>
			{T(t, 21.4, 'UN JUGE', 110)}
			{T(t, 22.4, 'DES TÉMOINS', 100, '#fff', 560)}
			{t > 24.1 && T(t, 24.1, "L'ACCUSÉE", 110, '#ff4b2b', 720)}
		</>)}
	</Plan>
);

export const K05: React.FC = () => (
	<Plan debut={28.02} fin={30.24} secousse={(t) => (t > 29.4 && t < 29.8 ? 30 : 0)} cam={(t) => ({z: lin(t, [28.02, 30.24], [1.1, 1.3], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#f1e3d0" />
			<rect x={140} y={1250} width={800} height={60} fill="#6b4226" stroke={INK} strokeWidth={8} />
			<Marteau x={540} y={1100} s={2.2} r={lin(t, [28.9, 29.4, 29.6], [-50, 25, 0])} />
			{t > 29.4 && <g transform={`translate(540 1600) rotate(-8) scale(${pop(t, 29.4)})`}><rect x={-300} y={-80} width={600} height={160} rx={18} fill="none" stroke="#c0392b" strokeWidth={14} /><text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#c0392b">COUPABLE</text></g>}
			{T(t, 28.1, 'LE VERDICT', 130)}
		</>)}
	</Plan>
);

export const K06: React.FC = () => (
	<Plan debut={30.24} fin={36.65} cam={(t) => ({z: lin(t, [30.24, 36.65], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Ciel id="k6" haut="#8a8fa8" bas="#d8d2c8" />
			<rect x={-900} y={1450} width={2900} height={1500} fill="#9a9080" stroke={INK} strokeWidth={6} />
			<Gibet x={540} y={1450} s={1.4} />
			{t > 35.3 && GENS.map((g, i) => <Humain key={i} x={80 + i * 230} y={1850} s={0.7} f={f} {...g} humeur="choc" ph={i} flip={i > 2} />)}
			{T(t, 30.3, 'LA PEINE', 130)}
			{t > 33.9 && T(t, 33.9, 'PENDUE', 130, '#ff4b2b', 560)}
			{t > 35.4 && T(t, 35.4, 'EN PLACE PUBLIQUE', 96, '#fff', 720)}
		</>)}
	</Plan>
);

export const K07: React.FC = () => (
	<Plan debut={36.65} fin={44.83} cam={(t) => ({z: lin(t, [36.65, 39.3, 44.83], [1.0, 1.15, 1.25], ease), y: -200})}>
		{(t, f) => {
			const habit = t > 42.3 ? 3 : t > 41.6 ? 2 : t > 40.8 ? 1 : 0;
			return (<>
				<Fond c="#e8dcf2" />
				<Truie x={540} y={1720} s={1.15} f={f} debout habit={habit} humeur={habit >= 3 ? 'fier' : 'choc'} />
				{t > 40.8 && txt(220, 1000, 'VESTE', 70, '#ffd23f', -8)}
				{t > 41.6 && txt(860, 1450, 'CULOTTE', 70, '#ffd23f', 8)}
				{t > 42.3 && txt(860, 1080, 'GANTS', 70, '#ffd23f', -6)}
				{T(t, 37.5, "D'APRÈS LES RÉCITS", 90)}
				{t > 39.3 && T(t, 39.3, 'HABILLÉE EN HOMME', 100, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const K08: React.FC = () => (
	<Plan debut={44.83} fin={49.3} cam={(t) => ({z: lin(t, [44.83, 49.3], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Ville id="k8" f={f} />
			{GENS.concat(GENS).map((g, i) => <Humain key={i} x={60 + (i % 5) * 240} y={1640 + Math.floor(i / 5) * 230} s={0.75} f={f} {...g} humeur="choc" ph={i} flip={i % 2 === 1} />)}
			<g>
				<Humain x={820} y={1520} s={1.05} f={f} couleur="#1a1a1a" chapeau="aucun" cheveux="#1a1a1a" jambesC="#1a1a1a" pose={t > 47.6 ? 'main' : 'debout'} humeur="neutre" />
				<path d={`M ${820 - 95} ${1520 - 330} Q 820 ${1520 - 480} ${820 + 95} ${1520 - 330} L ${820 + 85} ${1520 - 250} L ${820 - 85} ${1520 - 250} Z`} fill="#1a1a1a" stroke={INK} strokeWidth={6} />
				<ellipse cx={820 - 30} cy={1520 - 330} rx={14} ry={10} fill="#fff" /><ellipse cx={820 + 30} cy={1520 - 330} rx={14} ry={10} fill="#fff" />
			</g>
			{t > 47.6 && <g transform={`translate(980 1260) rotate(8) scale(${pop(t, 47.6)})`}><rect x={-90} y={-110} width={180} height={220} rx={8} fill="#f2e3b8" stroke={INK} strokeWidth={6} />{txt(0, -50, 'FACTURE', 30, '#8a1e1e')}{[-10, 20, 50].map((k) => <rect key={k} x={-60} y={k} width={120} height={10} rx={5} fill="#b8a070" />)}</g>}
			{T(t, 44.9, 'TOUTE LA VILLE REGARDE', 90)}
			{t > 47.6 && T(t, 47.6, 'LE BOURREAU ENVOIE SA FACTURE', 66, '#fff', 560)}
		</>)}
	</Plan>
);

export const K09: React.FC = () => (
	<Plan debut={49.3} fin={58.72} cam={(t) => ({z: lin(t, [49.3, 55.5, 58.72], [1.0, 1.05, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#f1e3d0" />
			<Parchemin x={540} y={1150} s={pop(t, 49.4) * 0.95} r={-2}>
				<text x={0} y={-270} textAnchor="middle" fontFamily={FONT} fontSize={54} fill="#5a3a1a">REÇU DU BOURREAU</text>
				<text x={0} y={-140} textAnchor="middle" fontFamily={FONT} fontSize={84} fill="#8a1e1e" opacity={t > 49.4 ? 1 : 0}>10 SOUS</text>
				<text x={0} y={-40} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#5a3a1a">ET</text>
				<text x={0} y={60} textAnchor="middle" fontFamily={FONT} fontSize={84} fill="#8a1e1e">10 DENIERS</text>
				<text x={0} y={190} textAnchor="middle" fontFamily={FONT} fontSize={50} fill="#5a3a1a" opacity={t > 52.1 ? 1 : 0}>LE 9 JANVIER 1386</text>
				{t > 52.1 && <g transform={`translate(200 290) scale(${pop(t, 52.3)})`}><circle r={60} fill="#c0392b" stroke={INK} strokeWidth={6} /><circle r={36} fill="none" stroke="#8a1e1e" strokeWidth={6} /></g>}
			</Parchemin>
			{t > 55.6 && <g transform={`translate(800 1600) scale(${pop(t, 55.6) * 1.1})`}><Gants x={0} y={0} /></g>}
			{T(t, 50.6, 'ON A ENCORE LE REÇU', 96)}
			{t > 55.6 && T(t, 55.7, '+ GANTS NEUFS', 110, '#7be07b', 560)}
		</>)}
	</Plan>
);

export const K10: React.FC = () => (
	<Plan debut={58.72} fin={64.83} cam={(t) => ({z: lin(t, [58.72, 60.1, 64.83], [1.0, 1.15, 1.2], ease), y: -150})}>
		{(t, f) => {
			const an = Math.round(lin(t, [62.7, 64.4], [1386, 1786]));
			return (<>
				<Fond c="#e8e1d0" />
				<rect x={-800} y={-800} width={2680} height={3600} fill="#d8ccb0" />
				{Array.from({length: 30}).map((_, i) => <rect key={i} x={-200 + (i % 6) * 260 + (Math.floor(i / 6) % 2) * 130} y={300 + Math.floor(i / 6) * 330} width={250} height={320} fill="none" stroke="#c0b090" strokeWidth={6} />)}
				<g transform={`translate(540 1150) scale(${pop(t, 60.1)})`}>
					<rect x={-380} y={-360} width={760} height={720} rx={10} fill="#e8d6a8" stroke="#7a5532" strokeWidth={22} />
					<g transform="translate(-60 300) scale(0.62)"><Truie x={0} y={0} s={1} f={0} debout habit={3} humeur="fier" /></g>
					<g transform="translate(200 260) scale(0.55)"><Gibet x={0} y={0} /></g>
				</g>
				<g transform="translate(540 1650)"><rect x={-230} y={-60} width={460} height={120} rx={20} fill="#fff" stroke={INK} strokeWidth={7} />{txt(0, 25, t > 62.7 ? String(an) : 'ÉGLISE DE FALAISE', t > 62.7 ? 80 : 46, INK)}</g>
				{T(t, 58.8, 'PEINTE DANS L\'ÉGLISE', 96)}
				{t > 62.7 && T(t, 62.7, '+ DE 400 ANS', 120, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const K11: React.FC = () => (
	<Plan debut={64.83} fin={73.78} cam={(t) => ({z: lin(t, [64.83, 73.78], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => {
			const n = Math.round(lin(t, [67.7, 70.6], [0, 60], Easing.out(Easing.cubic)));
			return (<>
				<Tribunal />
				{t < 71.1 && <g transform="translate(540 1150)"><rect x={-300} y={-110} width={600} height={220} rx={30} fill="#fff" stroke={INK} strokeWidth={10} /><text x={0} y={20} textAnchor="middle" fontFamily={FONT} fontSize={120} fill="#8a1e1e">{t > 67.7 ? n : '?'}</text><text x={0} y={85} textAnchor="middle" fontFamily={FONT} fontSize={44} fill={INK}>PROCÈS D'ANIMAUX</text></g>}
				{t > 71.1 && <g transform={`translate(260 1720) scale(${pop(t, 71.1) * 0.8})`}><Truie x={0} y={0} s={1} f={f} humeur="neutre" /></g>}
				{t > 71.8 && <g transform={`translate(780 1720) scale(${pop(t, 71.8) * 0.8})`}><Taureau x={0} y={0} /></g>}
				{t > 72.4 && [0, 1, 2, 3, 4].map((i) => <Rat key={i} x={300 + i * 130} y={1860} s={0.8} f={f} ph={i} />)}
				{T(t, 64.9, 'LE PLUS FOU ?', 120)}
				{t > 65.6 && T(t, 65.6, 'PAS UN CAS UNIQUE', 100, '#fff', 560)}
				{t > 72.4 && T(t, 72.4, 'MÊME DES RATS', 110, '#ff4b2b', 720)}
			</>);
		}}
	</Plan>
);

export const K12: React.FC = () => (
	<Plan debut={73.78} fin={81.0} cam={(t) => ({z: lin(t, [73.78, 77.8, 81], [1.0, 1.1, 1.25], ease), y: -150})}>
		{(t, f) => (<>
			<Fond />
			<g transform="translate(540 1150)"><rect x={-400} y={-520} width={800} height={1040} rx={16} fill="#f6ecd2" stroke="#c9a227" strokeWidth={26} /></g>
			<Truie x={540} y={1600} s={1.05} f={f} debout habit={3} humeur="fier" />
			{t > 77.8 && <g transform={`translate(540 1700) scale(${pop(t, 77.8)})`}><rect x={-250} y={-55} width={500} height={110} rx={20} fill="#c9a227" stroke={INK} strokeWidth={7} />{txt(0, 22, 'EN PANTALON', 64, '#fff')}</g>}
			{T(t, 73.9, 'LA PLUS CÉLÈBRE', 120)}
			{t > 80.0 && T(t, 80.0, 'FIN', 150, '#fff', 560)}
		</>)}
	</Plan>
);

export const PLANS_COCHON: [number, number, React.FC][] = [
	[0, 7.37, K01], [7.37, 13.41, K02], [13.41, 21.33, K03], [21.33, 28.02, K04], [28.02, 30.24, K05], [30.24, 36.65, K06],
	[36.65, 44.83, K07], [44.83, 49.3, K08], [49.3, 58.72, K09], [58.72, 64.83, K10], [64.83, 73.78, K11], [73.78, 81.0, K12],
];
