import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Humain, Titre, Bulle} from './dessins';

const ease = Easing.inOut(Easing.cubic);
const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => <Ecran><Titre x={540} y={y} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;
const VERT = '#7cb342', VERT_F = '#5a8a2a', GAZ = '#b5d93a';
const txt = (x: number, y: number, s: string, taille = 70, c = '#fff', r = 0) => <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontSize={taille} fill={c} stroke={INK} strokeWidth={taille / 7} paintOrder="stroke" transform={r ? `rotate(${r} ${x} ${y})` : undefined}>{s}</text>;
const Fond: React.FC<{c?: string}> = ({c = '#fbe7c6'}) => (<><rect x={-1500} y={-1500} width={4080} height={5000} fill={c} />{Array.from({length: 16}).map((_, i) => <path key={i} d="M 540 960 L 515 -800 L 565 -800 Z" fill="#fff" opacity={0.25} transform={`rotate(${i * 22.5} 540 960)`} />)}</>);
const Puce = (t: number, a: number, s: string) => <Ecran><g transform="translate(540 230)" opacity={pop(t, a)}><rect x={-330} y={-48} width={660} height={96} rx={48} fill="#fff" stroke={INK} strokeWidth={6} /><text x={0} y={18} textAnchor="middle" fontFamily={FONT} fontSize={54} fill={INK}>{s}</text></g></Ecran>;

/* ---------- décor préhistorique ---------- */
const Fougere: React.FC<{x: number; y: number; s?: number; f: number; boude?: boolean; flip?: boolean}> = ({x, y, s = 1, f, boude, flip}) => (
	<g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
		{[-50, -20, 10, 40].map((a, i) => (
			<g key={i} transform={`rotate(${a + Math.sin(f * 0.05 + i) * 4})`}>
				<path d="M 0 0 Q 10 -120 0 -240" stroke={VERT_F} strokeWidth={10} fill="none" />
				{Array.from({length: 7}).map((_, k) => <ellipse key={k} cx={(k % 2 ? 22 : -22)} cy={-40 - k * 28} rx={26} ry={10} fill={VERT} stroke={INK} strokeWidth={3} transform={`rotate(${k % 2 ? -25 : 25} ${(k % 2 ? 22 : -22)} ${-40 - k * 28})`} />)}
			</g>
		))}
		{boude && <g transform="translate(0 -70)"><circle cx={-20} cy={0} r={8} fill={INK} /><circle cx={20} cy={0} r={8} fill={INK} /><path d="M -34 -22 L -8 -12 M 34 -22 L 8 -12" stroke={INK} strokeWidth={6} /><path d="M -20 30 Q 0 16 20 30" stroke={INK} strokeWidth={6} fill="none" /></g>}
	</g>
);
const Volcan: React.FC<{x: number; y: number; s?: number; f: number; regard?: number; humeur?: 'neutre' | 'blase'}> = ({x, y, s = 1, f, regard = 0, humeur = 'neutre'}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d="M -260 0 L -80 -360 L 80 -360 L 260 0 Z" fill="#8a5a3a" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
		<path d="M -80 -360 Q 0 -330 80 -360 L 60 -300 Q 30 -260 20 -300 Q 0 -250 -20 -300 Q -40 -270 -60 -300 Z" fill="#ff6a2a" stroke={INK} strokeWidth={5} />
		{[0, 1, 2].map((i) => <circle key={i} cx={Math.sin(i * 2 + f * 0.02) * 30} cy={-420 - ((f * 1.5 + i * 60) % 180)} r={30 + i * 8} fill="#9a9a9a" opacity={0.6} />)}
		<g transform="translate(0 -170)">
			{[-55, 55].map((k) => <g key={k}><ellipse cx={k} cy={0} rx={30} ry={humeur === 'blase' ? 18 : 30} fill="#fff" stroke={INK} strokeWidth={5} /><circle cx={k + regard * 12} cy={humeur === 'blase' ? 4 : 0} r={12} fill={INK} />{humeur === 'blase' && <path d={`M ${k - 32} -8 L ${k + 32} -8`} stroke="#8a5a3a" strokeWidth={14} />}</g>)}
			<path d={humeur === 'blase' ? 'M -40 70 Q 0 60 40 74' : 'M -30 70 L 30 70'} stroke={INK} strokeWidth={8} fill="none" strokeLinecap="round" />
		</g>
	</g>
);
const Prehistoire: React.FC<{id: string; f: number; sol?: number; volcans?: boolean}> = ({id, f, sol = 1450, volcans = true}) => (
	<>
		<Ciel id={id} haut="#f6b26b" bas="#fde4b8" /><Soleil x={860} y={300} f={f} c="#ffe08a" /><Nuage x={240} y={340} />
		{volcans && <><Volcan x={150} y={sol - 40} s={0.6} f={f} /><Volcan x={930} y={sol - 60} s={0.75} f={f + 40} /></>}
		<path d={`M -900 ${sol - 30} Q 0 ${sol - 90} 540 ${sol - 40} T 2000 ${sol - 30} L 2000 3000 L -900 3000 Z`} fill="#9ccc65" stroke={INK} strokeWidth={6} />
		<rect x={-900} y={sol} width={2900} height={1500} fill="#c5a26a" stroke={INK} strokeWidth={6} />
		<Fougere x={60} y={sol + 30} s={0.9} f={f} /><Fougere x={1020} y={sol + 40} s={1.1} f={f + 30} flip />
	</>
);
const Nuee: React.FC<{x: number; y: number; k: number; f: number; s?: number}> = ({x, y, k, f, s = 1}) => k <= 0 ? null : (
	<g transform={`translate(${x} ${y}) scale(${s * k})`} opacity={0.92}>
		{Array.from({length: 14}).map((_, i) => <circle key={i} cx={Math.cos(i * 2.3) * (100 + rnd(i) * 230)} cy={Math.sin(i * 2.3) * (80 + rnd(i + 4) * 150) + Math.sin(f * 0.1 + i) * 10} r={90 + rnd(i + 8) * 80} fill={i % 3 ? GAZ : '#8fbf2a'} stroke={INK} strokeWidth={5} />)}
		{[0, 1, 2].map((i) => <path key={i} d={`M ${-150 + i * 150} -40 q 20 -30 0 -60 q -20 -30 0 -60`} stroke="#5a7a1a" strokeWidth={10} fill="none" strokeLinecap="round" />)}
	</g>
);

/* ---------- les dinosaures ---------- */
type HD = 'neutre' | 'content' | 'choc' | 'fier' | 'gene' | 'mange';
const Diplo: React.FC<{x: number; y: number; s?: number; f: number; humeur?: HD; ventre?: number; cou?: number; flip?: boolean; tremble?: number}> = ({x, y, s = 1, f, humeur = 'neutre', ventre = 1, cou = 0, flip, tremble = 0}) => {
	const tx = tremble ? (rnd(f) - 0.5) * tremble : 0;
	const hx = 330 + cou * 120, hy = -560 + cou * 520 + Math.sin(f * 0.06) * 10;
	const ink = (d: string, w: number, c: string) => <><path d={d} stroke={INK} strokeWidth={w + 14} fill="none" strokeLinecap="round" /><path d={d} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" /></>;
	const ouvert = humeur === 'choc' || humeur === 'mange';
	return (
		<g transform={`translate(${x + tx} ${y}) scale(${flip ? -s : s} ${s})`}>
			{ink(`M -200 -170 Q -480 -150 -700 ${-60 + Math.sin(f * 0.08) * 30}`, 46, VERT)}
			{[[-150, 1], [-60, 0], [90, 1], [170, 0]].map(([k, d], i) => <g key={i}>{ink(`M ${k} -120 L ${k} -10`, 52, d ? VERT_F : VERT)}<ellipse cx={k} cy={-8} rx={38} ry={14} fill="#4a6a2a" stroke={INK} strokeWidth={5} /></g>)}
			<ellipse cx={0} cy={-190} rx={260 * (0.85 + ventre * 0.15)} ry={130 * ventre} fill={VERT} stroke={INK} strokeWidth={8} />
			<ellipse cx={20} cy={-150 + (ventre - 1) * 40} rx={170 * (0.8 + ventre * 0.2)} ry={70 * ventre} fill="#c5e1a5" />
			{Array.from({length: 5}).map((_, i) => <circle key={i} cx={-160 + i * 80} cy={-270 - (ventre - 1) * 80} r={14} fill={VERT_F} />)}
			{ink(`M 180 -230 Q ${280 + cou * 40} ${-380 + cou * 200} ${hx - 20} ${hy + 40}`, 56, VERT)}
			<g transform={`translate(${hx} ${hy}) rotate(${cou * 50})`}>
				<ellipse cx={20} cy={0} rx={80} ry={52} fill={VERT} stroke={INK} strokeWidth={7} />
				<path d={ouvert ? 'M 30 20 Q 80 60 100 14 Z' : 'M 40 26 Q 80 34 98 14'} stroke={INK} strokeWidth={6} fill={ouvert ? '#7a2a2a' : 'none'} />
				<ellipse cx={20} cy={-16} rx={ouvert ? 20 : 16} ry={ouvert ? 22 : 17} fill="#fff" stroke={INK} strokeWidth={4} />
				{humeur === 'fier' || humeur === 'content' ? <path d="M 8 -14 Q 20 -28 32 -14" stroke={INK} strokeWidth={6} fill="none" /> : <circle cx={26} cy={-14} r={8} fill={INK} />}
				{humeur === 'gene' && <path d="M 0 10 l 14 4 m 8 -2 l 14 4" stroke="#e05a5a" strokeWidth={5} />}
			</g>
		</g>
	);
};
const TRex: React.FC<{x: number; y: number; s?: number; f: number; humeur?: 'neutre' | 'choc' | 'fache'; flip?: boolean; ph?: number}> = ({x, y, s = 1, f, humeur = 'neutre', flip, ph = 0}) => {
	const b = Math.sin(f * 0.1 + ph) * 4;
	return (
		<g transform={`translate(${x} ${y + b}) scale(${flip ? -s : s} ${s})`}>
			<path d="M -60 -170 Q -260 -120 -330 -20 Q -200 -100 -40 -110 Z" fill="#c0573a" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
			{[-50, 40].map((k, i) => <g key={i}><path d={`M ${k} -150 L ${k + 10} -10`} stroke={INK} strokeWidth={56} strokeLinecap="round" /><path d={`M ${k} -150 L ${k + 10} -10`} stroke={i ? '#d8714f' : '#b04a30'} strokeWidth={42} strokeLinecap="round" /><ellipse cx={k + 24} cy={-6} rx={40} ry={14} fill="#7a3a24" stroke={INK} strokeWidth={5} /></g>)}
			<ellipse cx={0} cy={-230} rx={120} ry={150} fill="#d8714f" stroke={INK} strokeWidth={8} transform="rotate(20 0 -230)" />
			<path d="M 70 -260 l 50 20 m -50 10 l 40 26" stroke={INK} strokeWidth={10} strokeLinecap="round" />
			<g transform="translate(90 -400)">
				<path d="M -90 -60 Q 40 -100 150 -40 Q 160 20 120 30 L -60 40 Q -110 0 -90 -60 Z" fill="#d8714f" stroke={INK} strokeWidth={8} />
				<path d={humeur === 'choc' ? 'M -40 30 L 140 30 L 120 90 L -30 80 Z' : 'M -40 30 L 130 26 L 120 50 L -30 50 Z'} fill="#7a2a2a" stroke={INK} strokeWidth={6} />
				{Array.from({length: 6}).map((_, i) => <path key={i} d={`M ${-20 + i * 26} 30 l 10 16 l 10 -16`} fill="#fff" stroke={INK} strokeWidth={3} />)}
				<ellipse cx={0} cy={-40} rx={humeur === 'choc' ? 22 : 16} ry={humeur === 'choc' ? 24 : 16} fill="#fff" stroke={INK} strokeWidth={5} />
				<circle cx={humeur === 'choc' ? -4 : 4} cy={-38} r={8} fill={INK} />
				{humeur === 'fache' && <path d="M -26 -70 L 24 -56" stroke={INK} strokeWidth={8} />}
				{humeur === 'choc' && [0, 1].map((i) => { const p = (f * 0.05 + i / 2) % 1; return <path key={i} d="M 0 0 q -10 16 0 24 q 10 -8 0 -24 Z" transform={`translate(${-60 + i * 30} ${-90 + p * 80})`} fill="#bfe6fa" stroke={INK} strokeWidth={3} opacity={1 - p} />; })}
			</g>
		</g>
	);
};
const Ptero: React.FC<{x: number; y: number; s?: number; f: number; ko?: number}> = ({x, y, s = 1, f, ko = 0}) => {
	const a = ko > 0 ? 0 : Math.sin(f * 0.4) * 30;
	return (
		<g transform={`translate(${x} ${y}) scale(${s}) rotate(${ko * 160})`}>
			<path d={`M 0 0 L -160 ${-40 - a} L -60 20 Z M 0 0 L 160 ${-40 - a} L 60 20 Z`} fill="#a0645a" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
			<ellipse cx={0} cy={10} rx={40} ry={26} fill="#b8786a" stroke={INK} strokeWidth={6} />
			<path d="M 30 -10 L 110 0 L 30 12 Z M 20 -14 L -40 -40 L 10 -4 Z" fill="#b8786a" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			{ko > 0 ? <path d="M 22 -10 l 14 14 m 0 -14 l -14 14" stroke={INK} strokeWidth={5} /> : <circle cx={30} cy={-4} r={6} fill={INK} />}
		</g>
	);
};
const Haricot: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<path transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`} d="M -30 -10 Q -30 -30 -5 -24 Q 10 -18 20 -26 Q 40 -30 36 -6 Q 30 24 0 22 Q -34 20 -30 -10 Z" fill="#b3261e" stroke={INK} strokeWidth={4} />
);
const Terre: React.FC<{x: number; y: number; r?: number; chaud?: number}> = ({x, y, r = 330, chaud = 0}) => (
	<g transform={`translate(${x} ${y})`}>
		<circle r={r} fill="#2f7ac0" stroke={INK} strokeWidth={8} />
		<path d={`M ${-r * 0.6} ${-r * 0.5} q 120 -60 200 20 q 40 90 -60 140 q -110 20 -150 -60 Z`} fill="#4caa58" stroke={INK} strokeWidth={6} />
		<path d={`M ${r * 0.3} ${-r * 0.1} q 120 10 130 120 q -40 110 -130 60 q -50 -90 0 -180 Z`} fill="#4caa58" stroke={INK} strokeWidth={6} />
		{chaud > 0 && <circle r={r} fill="#ff4b2b" opacity={chaud * 0.35} />}
		{chaud > 0.3 && [0, 1, 2].map((i) => <path key={i} d={`M ${-120 + i * 120} ${-r - 30} q 20 -30 0 -60 q -20 -30 0 -60`} stroke="#ff7a3a" strokeWidth={12} fill="none" strokeLinecap="round" />)}
	</g>
);
const Thermo: React.FC<{x: number; y: number; k: number; s?: number}> = ({x, y, k, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-34} y={-400} width={68} height={400} rx={34} fill="#fff" stroke={INK} strokeWidth={7} />
		<rect x={-16} y={-30 - k * 340} width={32} height={30 + k * 340} rx={16} fill="#e23b2b" />
		<circle cx={0} cy={20} r={60} fill="#e23b2b" stroke={INK} strokeWidth={7} />
	</g>
);
const Chercheur: React.FC<{x: number; y: number; s?: number; f: number; ph?: number; humeur?: any; pose?: any; cheveux?: string}> = ({x, y, s = 1, f, ph = 0, humeur = 'neutre', pose = 'ecrit', cheveux = '#9a9a9a'}) => (
	<Humain x={x} y={y} s={s} f={f} ph={ph} couleur="#f4f4f4" chapeau="aucun" cheveux={cheveux} jambesC="#2c2f36" cravate="#2f6fb0" humeur={humeur} pose={pose} />
);

/* ---------- les plans ---------- */
export const D01: React.FC = () => (
	<Plan debut={0} fin={7.0} sansEntree cam={(t) => ({z: lin(t, [0, 7], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Prehistoire id="d1" f={f} />
			<Diplo x={480} y={1590} s={0.95} f={f} humeur={t > 2.8 ? 'gene' : 'mange'} ventre={lin(t, [1, 2.8], [1, 1.35])} cou={t < 2.8 ? 0.7 : 0} />
			{t < 2.8 && Array.from({length: 10}).map((_, i) => <Haricot key={i} x={760 + (i % 5) * 50} y={1470 - Math.floor(i / 5) * 40} s={1.2} r={i * 37} />)}
			{t > 4.6 && <Nuee x={160} y={1250} k={lin(t, [4.6, 5.4], [0, 0.5], Easing.out(Easing.back(1.5)))} f={f} />}
			{t > 4.6 && <Thermo x={930} y={1250} k={lin(t, [4.8, 6.6], [0.2, 0.95])} s={0.8} />}
			{T(t, 0.3, 'DIPLODOCUS + HARICOTS', 92)}
			{T(t, 4.6, '= RÉCHAUFFEMENT ?', 100, '#ff4b2b', 560)}
		</>)}
	</Plan>
);

export const D02: React.FC = () => (
	<Plan debut={7.0} fin={12.75} cam={(t) => ({z: lin(t, [7, 12.75], [1.0, 1.12], ease), y: -80})}>
		{(t, f) => (<>
			<Prehistoire id="d2" f={f} />
			<Diplo x={500} y={1600} s={1.0} f={f} humeur={t > 11.6 ? 'gene' : 'neutre'} />
			{t > 8.8 && <g opacity={pop(t, 8.8)}><path d="M 20 1560 L 1060 1560 M 20 1530 L 20 1590 M 1060 1530 L 1060 1590" stroke="#fff" strokeWidth={10} />{txt(540, 1650, '30 MÈTRES', 80)}</g>}
			{t > 10.4 && <g transform={`translate(560 1300) scale(${pop(t, 10.4)})`}><rect x={-160} y={-60} width={320} height={120} rx={20} fill="#fff" stroke={INK} strokeWidth={7} />{txt(0, 25, '20 TONNES', 64, INK)}</g>}
			{t > 11.6 && <g transform={`translate(700 760) scale(${pop(t, 11.6) * 1.3})`}><ellipse cx={0} cy={0} rx={60} ry={48} fill="#c8955a" stroke={INK} strokeWidth={8} /><path d="M 0 -48 Q -14 0 0 48 M -40 -20 q 20 10 0 30 M 40 -20 q -20 10 0 30" stroke="#8a5a2a" strokeWidth={6} fill="none" /></g>}
			{T(t, 7.1, 'LE DIPLODOCUS', 120)}
			{t > 11.6 && <Ecran>{txt(540, 1250, 'CERVEAU = UNE NOIX', 84, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);

export const D03: React.FC = () => (
	<Plan debut={12.75} fin={19.9} cam={(t) => ({z: lin(t, [12.75, 19.9], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => {
			const mange = lin(t, [15.3, 16.8], [0, 1]);
			return (<>
				<Prehistoire id="d3" f={f} volcans={false} />
				{Array.from({length: 24}).map((_, i) => i / 24 >= mange ? <g key={i}><path d={`M ${520 + (i % 6) * 90} ${1600 + Math.floor(i / 6) * 70} l 0 -60`} stroke={VERT_F} strokeWidth={8} /><Haricot x={520 + (i % 6) * 90} y={1540 + Math.floor(i / 6) * 70} s={1} r={i * 30} /></g> : null)}
				{t < 17.5 && [480, 620, 760, 900, 1040].map((k) => <rect key={k} x={k} y={1460} width={20} height={130} fill="#8a5a35" stroke={INK} strokeWidth={4} />)}
				{t < 17.5 && <rect x={470} y={1490} width={600} height={18} fill="#8a5a35" stroke={INK} strokeWidth={4} />}
				{t > 17.9 && t < 19.3 && <g transform={`translate(820 1330) scale(${pop(t, 17.9)}) rotate(-6)`}><rect x={-12} y={0} width={24} height={150} fill="#8a5a35" stroke={INK} strokeWidth={5} /><rect x={-220} y={-80} width={440} height={110} rx={10} fill="#fff" stroke={INK} strokeWidth={7} />{txt(0, -10, 'PROPRIÉTÉ PRIVÉE', 44, '#c0392b')}</g>}
				<Diplo x={240} y={1600} s={0.8} f={f} humeur={t > 15.3 ? 'mange' : 'content'} cou={t > 15.0 ? 0.8 : 0} />
				{T(t, 13.0, 'UN CHAMP DE HARICOTS', 96)}
				{T(t, 15.3, 'IL MANGE TOUT', 120, '#ff4b2b', 560)}
			</>);
		}}
	</Plan>
);

export const D04: React.FC = () => (
	<Plan debut={19.9} fin={23.5} cam={(t) => ({z: lin(t, [19.9, 23.5], [1.05, 1.25], ease), y: -100})}>
		{(t, f) => {
			const v = lin(t, [20.6, 22.6], [1, 2.1], Easing.out(Easing.back(1.4)));
			return (<>
				<Prehistoire id="d4" f={f} />
				<Diplo x={540} y={1600} s={0.9} f={f} humeur={t > 21.5 ? 'gene' : 'content'} ventre={v} tremble={t > 21.5 ? 6 : 0} />
				{t > 21.8 && <g transform={`translate(540 ${1600}) scale(${pop(t, 21.8)})`}><path d="M -90 0 L -60 90 L 60 90 L 90 0" stroke={INK} strokeWidth={6} fill="none" /><rect x={-70} y={90} width={140} height={70} rx={8} fill="#a0703a" stroke={INK} strokeWidth={6} /></g>}
				{Puce(t, 19.95, '1 HEURE PLUS TARD')}
				{T(t, 21.8, 'MONTGOLFIÈRE', 120)}
			</>);
		}}
	</Plan>
);

export const D05: React.FC = () => (
	<Plan debut={23.5} fin={29.5} cam={(t) => ({z: lin(t, [23.5, 25.4, 29.5], [1.0, 1.0, 1.3], ease), x: lin(t, [25.4, 27], [0, 200], ease), y: -150})}>
		{(t, f) => (<>
			<Prehistoire id="d5" f={f} />
			<Diplo x={260} y={1620} s={0.7} f={f} humeur="gene" ventre={2.1} />
			<TRex x={lin(t, [25.4, 27.4], [780, 980], ease)} y={1600} s={0.9} f={f} humeur={t > 25.4 ? 'choc' : 'neutre'} flip />
			{T(t, 23.6, 'LES AUTRES REGARDENT', 96)}
			{T(t, 25.4, 'LE T-REX RECULE', 110, '#ff4b2b', 560)}
			{t > 27.3 && <Ecran>{txt(540, 1250, "QUI N'A PEUR DE RIEN", 80, '#fff')}</Ecran>}
		</>)}
	</Plan>
);

export const D06: React.FC = () => (
	<Plan debut={29.5} fin={35.9} secousse={(t) => (t > 30.3 ? 34 * lin(t, [30.3, 32], [1, 0.3]) : 0)} cam={(t) => ({z: lin(t, [29.5, 30.3, 35.9], [1.3, 1.0, 1.1], ease), y: -100})}>
		{(t, f) => {
			const jours = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI'];
			const j = Math.min(3, Math.floor(lin(t, [31.7, 35.2], [0, 3.99])));
			return (<>
				<Prehistoire id="d6" f={f} />
				<Nuee x={-60} y={1200} k={lin(t, [30.3, 31.2], [0, 1.1], Easing.out(Easing.back(1.4)))} f={f} />
				<Diplo x={620} y={1620} s={0.8} f={f} humeur={t > 30.3 ? 'fier' : 'gene'} ventre={t > 30.3 ? lin(t, [30.3, 35], [2.1, 1.2]) : 2.1} tremble={t < 30.3 ? 8 : 0} />
				{t > 31.7 && <g transform={`translate(800 950) scale(${pop(t, 31.7)}) rotate(4)`}><rect x={-170} y={-150} width={340} height={300} rx={20} fill="#fff" stroke={INK} strokeWidth={8} /><rect x={-170} y={-150} width={340} height={80} rx={20} fill="#e23b2b" stroke={INK} strokeWidth={8} />{txt(0, 60, jours[j], j === 2 ? 60 : 76, INK)}</g>}
				{T(t, 29.5, 'ET LÀ…', 140)}
				{t > 30.3 && T(t, 30.3, 'PROUUUUT', 150, GAZ, 560)}
			</>);
		}}
	</Plan>
);

export const D07: React.FC = () => (
	<Plan debut={35.9} fin={40.0} cam={(t) => ({z: lin(t, [35.9, 40], [1.0, 1.15], ease), y: -120})}>
		{(t, f) => (<>
			<Prehistoire id="d7" f={f} />
			<Nuee x={540} y={800} k={1} f={f} s={1.2} />
			{[0, 1, 2, 3].map((i) => { const ko = lin(t, [37.3 + i * 0.25, 37.8 + i * 0.25], [0, 1]); return <Ptero key={i} x={200 + i * 230} y={500 + i * 60 + lin(t, [37.3 + i * 0.25, 39.8], [0, 1100], Easing.in(Easing.quad))} s={1.5} f={f} ko={ko} />; })}
			{T(t, 36.0, 'PTÉRODACTYLES', 110)}
			{T(t, 37.6, 'K.O.', 170, '#ff4b2b', 560)}
		</>)}
	</Plan>
);

export const D08: React.FC = () => (
	<Plan debut={40.0} fin={44.0} cam={(t) => ({z: lin(t, [40, 44], [1.05, 1.25], ease), y: -60})}>
		{(t, f) => (<>
			<Ciel id="d8" haut="#f6b26b" bas="#fde4b8" />
			<rect x={-900} y={1500} width={2900} height={1500} fill="#c5a26a" stroke={INK} strokeWidth={6} />
			<Nuee x={540} y={1450} k={0.6} f={f} />
			<Volcan x={270} y={1520} s={1.0} f={f} regard={1} humeur={t > 42.3 ? 'blase' : 'neutre'} />
			<Volcan x={820} y={1520} s={1.0} f={f + 30} regard={-1} humeur={t > 42.3 ? 'blase' : 'neutre'} />
			<Bulle x={540} y={720} w={700} h={240} k={pop(t, 42.3)} queue={[-180, 200]}><text x={0} y={-10} textAnchor="middle" fontFamily={FONT} fontSize={66} fill={INK}>AH OUAIS…</text><text x={0} y={70} textAnchor="middle" fontFamily={FONT} fontSize={66} fill={INK}>QUAND MÊME.</text></Bulle>
			{T(t, 40.1, 'MÊME LES VOLCANS', 110)}
		</>)}
	</Plan>
);

export const D09: React.FC = () => (
	<Plan debut={44.0} fin={46.4} cam={(t) => ({z: lin(t, [44, 46.4], [1.05, 1.2], ease), y: -60})}>
		{(t, f) => {
			const k = lin(t, [44.6, 46.2], [0, 1], ease);
			return (<>
				<Ciel id="d9" haut="#9fd3f0" bas="#eaf6fb" />
				<rect x={-900} y={1500} width={2900} height={1500} fill="#7fb7d8" stroke={INK} strokeWidth={6} />
				<g transform={`translate(540 1500) scale(1 ${1 - k * 0.75})`}><path d="M -380 0 L -280 -420 L -120 -520 L 60 -460 L 220 -560 L 380 0 Z" fill="#e8f6fd" stroke={INK} strokeWidth={8} strokeLinejoin="round" /><path d="M -200 -300 L -100 -360 M 100 -380 L 200 -440" stroke="#9fd3f0" strokeWidth={10} /></g>
				{k > 0.1 && Array.from({length: 8}).map((_, i) => <ellipse key={i} cx={200 + i * 90} cy={1520 + ((f * 4 + i * 30) % 120)} rx={12} ry={20} fill="#7fb7d8" stroke={INK} strokeWidth={3} />)}
				<Nuee x={-40} y={1100} k={0.7} f={f} />
				{T(t, 44.1, 'UN GLACIER', 120)}
				{T(t, 45.0, 'FONDU', 150, '#ff4b2b', 560)}
			</>);
		}}
	</Plan>
);

export const D10: React.FC = () => (
	<Plan debut={46.4} fin={50.4} cam={(t) => ({z: lin(t, [46.4, 50.4], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => t < 49.1 ? (<>
			<rect x={-1500} y={-1500} width={4080} height={5000} fill="#0d1530" />
			{Array.from({length: 50}).map((_, i) => <circle key={i} cx={rnd(i) * 1600 - 260} cy={rnd(i + 50) * 2600 - 340} r={2 + rnd(i + 9) * 4} fill="#fff" />)}
			<Terre x={480} y={1100} r={360} chaud={lin(t, [47.4, 48.8], [0, 1])} />
			<Thermo x={930} y={1300} k={lin(t, [47.4, 48.8], [0.3, 0.9])} />
			{T(t, 47.5, '+2 DEGRÉS', 140, '#ff4b2b')}
		</>) : (<>
			<Prehistoire id="d10" f={f} volcans={false} />
			{[0, 1, 2].map((i) => <Fougere key={i} x={240 + i * 300} y={1560} s={1.6} f={f} boude flip={i === 1} />)}
			{T(t, 49.2, 'LES FOUGÈRES BOUDENT', 96)}
		</>)}
	</Plan>
);

export const D11: React.FC = () => (
	<Plan debut={50.4} fin={55.7} cam={(t) => ({z: lin(t, [50.4, 55.7], [1.0, 1.2], ease), y: -100})}>
		{(t, f) => {
			const m = lin(t, [50.5, 52.3], [0, 1], Easing.in(Easing.quad));
			const air = lin(t, [54.0, 55.4], [0, 1]);
			return (<>
				<Prehistoire id="d11" f={f} />
				{air < 1 && <Nuee x={540} y={1100} k={1 - air} f={f} s={1.1} />}
				<g transform={`translate(${lin(m, [0, 1], [1150, 760])} ${lin(m, [0, 1], [-100, 620])})`}>
					<path d="M 60 -60 L 260 -260 L 120 -20 Z M 40 -80 L 160 -300 L 70 -40 Z" fill="#ffb43a" stroke={INK} strokeWidth={5} opacity={0.9} />
					<circle r={110} fill="#6a5a50" stroke={INK} strokeWidth={8} />
					<circle cx={-30} cy={20} r={22} fill="#544840" /><circle cx={40} cy={-30} r={16} fill="#544840" />
				</g>
				<Diplo x={300} y={1570} s={0.5} f={f} humeur={t > 52.4 ? 'content' : 'neutre'} />
				<TRex x={820} y={1620} s={0.6} f={f} humeur="neutre" flip />
				{t > 52.4 && <g transform={`translate(540 1280) scale(${pop(t, 52.4)}) rotate(-4)`}><rect x={-12} y={0} width={24} height={140} fill="#8a5a35" stroke={INK} strokeWidth={5} /><rect x={-200} y={-80} width={400} height={110} rx={12} fill="#fff" stroke={INK} strokeWidth={7} />{txt(0, -5, 'MERCI !', 70, '#3c8a4a')}</g>}
				{T(t, 50.5, 'LA MÉTÉORITE', 120)}
				{t > 54.0 && T(t, 54.0, 'ÇA AÈRE', 140, '#7be07b', 560)}
			</>);
		}}
	</Plan>
);

export const D12: React.FC = () => (
	<Plan debut={55.7} fin={58.2} cam={(t) => ({z: lin(t, [55.7, 58.2], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#e4dcf2" />
			<Diplo x={540} y={1640} s={0.8} f={f} humeur="neutre" />
			{txt(540, 900, 'VRAI OU FAUX ?', 120, '#7a5ac0')}
			{T(t, 55.8, 'LA VRAIE RÉPONSE', 110, '#fff')}
		</>)}
	</Plan>
);

export const D13: React.FC = () => (
	<Plan debut={58.2} fin={64.3} cam={(t) => ({z: lin(t, [58.2, 64.3], [0.95, 1.02], ease), y: 60})}>
		{(t, f) => (<>
			<Fond c="#eef0e6" />
			<rect x={140} y={680} width={800} height={460} rx={14} fill="#2f4a3a" stroke={INK} strokeWidth={10} />
			<text x={540} y={830} textAnchor="middle" fontFamily={FONT} fontSize={64} fill="#fff" >{t > 60.2 ? 'PET x 20 TONNES' : ''}</text>
			<text x={540} y={930} textAnchor="middle" fontFamily={FONT} fontSize={64} fill="#fff" >{t > 61.2 ? '= ???' : ''}</text>
			{t > 63.2 && <text x={540} y={1060} textAnchor="middle" fontFamily={FONT} fontSize={56} fill="#ffd23f">PROUT / PI = ?!</text>}
			<rect x={-800} y={1450} width={2680} height={1300} fill="#c9c2b0" stroke={INK} strokeWidth={6} />
			{[0, 1, 2].map((i) => <Chercheur key={i} x={230 + i * 310} y={1650} s={1.0} f={f} ph={i} humeur={t > 62.4 ? 'neutre' : 'perplexe'} pose={i === 1 ? 'main' : 'ecrit'} cheveux={['#9a9a9a', '#3b2a1e', '#c9a060'][i]} />)}
			{T(t, 58.8, '2012', 150)}
			{T(t, 60.1, 'DE VRAIS CHERCHEURS', 96, '#fff', 560)}
		</>)}
	</Plan>
);

export const D14: React.FC = () => (
	<Plan debut={64.3} fin={72.1} cam={(t) => ({z: lin(t, [64.3, 70.1, 72.1], [1.0, 1.1, 1.2], ease), y: -60})}>
		{(t, f) => {
			const n = Math.round(lin(t, [65.2, 68.6], [0, 500], Easing.out(Easing.cubic)));
			return (<>
				<Fond c="#eef6dc" />
				<Nuee x={540} y={1250} k={lin(t, [64.4, 66], [0.3, 0.9])} f={f} />
				<g transform="translate(540 1250)"><rect x={-400} y={-120} width={800} height={240} rx={30} fill="#fff" stroke={INK} strokeWidth={10} /><text x={0} y={10} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#5a7a1a">{n} MILLIONS</text><text x={0} y={90} textAnchor="middle" fontFamily={FONT} fontSize={50} fill={INK}>DE TONNES PAR AN</text></g>
				{t > 70.1 && <g transform={`translate(400 1720) scale(${pop(t, 70.1)})`}><Terre x={0} y={0} r={130} />{txt(230, 20, '= AUJOURD\'HUI', 54, '#FFD23F')}</g>}
				{T(t, 64.4, 'PETS + ROTS', 120, GAZ)}
				{T(t, 66.0, 'DE MÉTHANE', 100, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const D15: React.FC = () => (
	<Plan debut={72.1} fin={74.3} cam={(t) => ({z: lin(t, [72.1, 74.3], [1.05, 1.2], ease), y: -60})}>
		{(t, f) => (<>
			<rect x={-1500} y={-1500} width={4080} height={5000} fill="#0d1530" />
			{Array.from({length: 50}).map((_, i) => <circle key={i} cx={rnd(i) * 1600 - 260} cy={rnd(i + 50) * 2600 - 340} r={2 + rnd(i + 9) * 4} fill="#fff" />)}
			<Terre x={480} y={1100} r={340} chaud={lin(t, [72.3, 74], [0.2, 0.8])} />
			<Thermo x={930} y={1300} k={lin(t, [72.3, 74], [0.4, 0.8])} />
			{T(t, 72.2, 'PEUT-ÊTRE', 140)}
		</>)}
	</Plan>
);

export const D16: React.FC = () => (
	<Plan debut={74.3} fin={81.4} cam={(t) => ({z: lin(t, [74.3, 78.6, 81.4], [1.05, 1.15, 1.3], ease), y: -150})}>
		{(t, f) => t < 78.6 ? (<>
			<Fond c="#fdeede" />
			<rect x={-800} y={1450} width={2680} height={1300} fill="#c9c2b0" stroke={INK} strokeWidth={6} />
			<Chercheur x={400} y={1650} s={1.25} f={f} humeur={t > 75.5 ? 'pouffe' : 'neutre'} pose={t > 75.5 ? 'salut' : 'debout'} cheveux="#3b2a1e" />
			{t > 75.5 && <g transform={`translate(780 1150) scale(${pop(t, 75.5)}) rotate(-6)`}><rect x={-200} y={-100} width={400} height={200} rx={16} fill="#cfe8c0" stroke={INK} strokeWidth={8} /><circle r={60} fill="none" stroke="#3c8a4a" strokeWidth={8} />{txt(0, 22, '€', 70, '#3c8a4a')}</g>}
			{T(t, 74.4, 'DONC OUI…', 120)}
			{T(t, 75.6, 'PAYÉS POUR ÇA', 110, '#fff', 560)}
		</>) : (<>
			<Fond c="#e8eef0" />
			<g transform={`translate(540 1150) scale(${pop(t, 78.7)}) rotate(-3)`}>
				<rect x={-330} y={-420} width={660} height={840} rx={12} fill="#fff" stroke={INK} strokeWidth={9} />
				{txt(0, -320, 'CURRICULUM VITAE', 50, INK)}
				<circle cx={-200} cy={-180} r={70} fill="#e8d8c0" stroke={INK} strokeWidth={6} />
				{[-60, 0, 60].map((k) => <rect key={k} x={-100} y={-220 + k + 40} width={360} height={18} rx={9} fill="#ccc" />)}
				<rect x={-290} y={40} width={580} height={150} rx={14} fill="#fff3b0" stroke="#e0b21a" strokeWidth={6} opacity={t > 79.5 ? 1 : 0} />
				<text x={0} y={105} textAnchor="middle" fontFamily={FONT} fontSize={44} fill={INK} opacity={t > 79.5 ? 1 : 0}>EXPERT EN PETS</text>
				<text x={0} y={160} textAnchor="middle" fontFamily={FONT} fontSize={44} fill={INK} opacity={t > 79.5 ? 1 : 0}>DE DINOSAURES</text>
				{[260, 320].map((k) => <rect key={k} x={-250} y={k} width={500} height={18} rx={9} fill="#ccc" />)}
			</g>
			{T(t, 78.7, 'SUR SON CV', 120)}
		</>)}
	</Plan>
);

export const D17: React.FC = () => (
	<Plan debut={81.4} fin={86.4} cam={(t) => ({z: lin(t, [81.4, 85], [1.0, 1.2], ease), y: -120})}>
		{(t, f) => (<>
			<Prehistoire id="d17" f={f} />
			<Nuee x={540} y={950} k={lin(t, [83.3, 84.3], [0, 0.8], Easing.out(Easing.back(1.4)))} f={f} />
			<Diplo x={520} y={1620} s={0.9} f={f} humeur="fier" ventre={1.2} />
			{t > 83.4 && <Thermo x={940} y={1300} k={lin(t, [83.4, 85], [0.3, 0.95])} s={0.8} />}
			{T(t, 81.5, "CE N'EST PLUS UN PET", 92)}
			{T(t, 83.4, 'RÉCHAUFFEMENT CLIMATIQUE', 76, '#ff4b2b', 560)}
			{t > 85.2 && T(t, 85.2, 'FIN', 150, '#fff', 720)}
		</>)}
	</Plan>
);

export const PLANS_DINO: [number, number, React.FC][] = [
	[0, 7.0, D01], [7.0, 12.75, D02], [12.75, 19.9, D03], [19.9, 23.5, D04], [23.5, 29.5, D05], [29.5, 35.9, D06], [35.9, 40.0, D07],
	[40.0, 44.0, D08], [44.0, 46.4, D09], [46.4, 50.4, D10], [50.4, 55.7, D11], [55.7, 58.2, D12], [58.2, 64.3, D13], [64.3, 72.1, D14],
	[72.1, 74.3, D15], [74.3, 81.4, D16], [81.4, 86.4, D17],
];
