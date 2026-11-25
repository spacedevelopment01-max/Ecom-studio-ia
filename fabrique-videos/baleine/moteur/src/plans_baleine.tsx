import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Humain, Titre, Bulle, Mer, Barque, Mouette} from './dessins';

const ease = Easing.inOut(Easing.cubic);
const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => <Ecran><Titre x={540} y={y} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;
const ORANGE = '#e8742a', CACA = '#c9661f';
const txt = (x: number, y: number, s: string, taille = 70, c = '#fff', r = 0) => <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontSize={taille} fill={c} stroke={INK} strokeWidth={taille / 7} paintOrder="stroke" transform={r ? `rotate(${r} ${x} ${y})` : undefined}>{s}</text>;

/* ---------- décors ---------- */
const Fond: React.FC<{c?: string}> = ({c = '#fbe7c6'}) => (<><rect x={-1500} y={-1500} width={4080} height={5000} fill={c} />{Array.from({length: 16}).map((_, i) => <path key={i} d="M 540 960 L 515 -800 L 565 -800 Z" fill="#fff" opacity={0.25} transform={`rotate(${i * 22.5} 540 960)`} />)}</>);
const SousLeau: React.FC<{id: string; f: number; teinte?: number}> = ({id, f, teinte = 0}) => (
	<>
		<defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4fb3e0" /><stop offset="1" stopColor="#0f3d6b" /></linearGradient></defs>
		<rect x={-1500} y={-1500} width={4080} height={5000} fill={`url(#${id})`} />
		{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M ${i * 260 - 100} -400 L ${i * 260 + 20} -400 L ${i * 260 + 260 + Math.sin(f * 0.02 + i) * 60} 2400 L ${i * 260 + 60 + Math.sin(f * 0.02 + i) * 60} 2400 Z`} fill="#fff" opacity={0.07} />)}
		{Array.from({length: 14}).map((_, i) => <circle key={i} cx={(rnd(i) * 1300 - 100)} cy={2200 - ((f * (2 + rnd(i + 5) * 3) + rnd(i + 9) * 2400) % 2600)} r={6 + rnd(i + 2) * 14} fill="none" stroke="#cfefff" strokeWidth={4} opacity={0.6} />)}
		<path d="M -900 1880 Q -300 1800 200 1860 T 1300 1840 L 2000 1860 L 2000 3000 L -900 3000 Z" fill="#c9a86a" stroke={INK} strokeWidth={6} />
		{teinte > 0 && <rect x={-1500} y={-1500} width={4080} height={5000} fill={CACA} opacity={teinte * 0.75} />}
	</>
);

/* ---------- personnages et objets ---------- */
type HB = 'calme' | 'choc' | 'panique' | 'soulage' | 'fier';
const Baleine: React.FC<{x: number; y: number; s?: number; f: number; humeur?: HB; flip?: boolean; bouche?: number; tremble?: number; casquette?: boolean}> = ({x, y, s = 1, f, humeur = 'calme', flip, bouche = 0, tremble = 0, casquette}) => {
	const q = Math.sin(f * 0.12) * 14;
	const tx = tremble ? (rnd(f) - 0.5) * tremble : 0, ty = tremble ? (rnd(f + 7) - 0.5) * tremble : 0;
	const ouvert = humeur === 'choc' || humeur === 'panique';
	return (
		<g transform={`translate(${x + tx} ${y + ty + Math.sin(f * 0.06) * 10}) scale(${flip ? -s : s} ${s})`}>
			<g transform={`rotate(${q} 380 -40)`}>
				<path d="M 360 -60 Q 440 -60 470 -90 Q 520 -180 600 -200 Q 560 -110 520 -60 Q 560 -10 600 80 Q 520 60 470 -20 Q 440 -40 360 -30 Z" fill="#3f6fa8" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
			</g>
			<path d="M -480 -10 Q -480 -170 -260 -190 Q 60 -200 380 -70 Q 410 -50 380 -30 Q 100 90 -200 110 Q -470 120 -480 -10 Z" fill="#4d7fb8" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
			<path d="M -470 20 Q -300 50 -80 40 Q 150 20 360 -40 Q 100 90 -200 110 Q -460 115 -470 20 Z" fill="#a9c8e6" stroke={INK} strokeWidth={6} />
			{[-380, -300, -220, -140, -60, 20, 100].map((k, i) => <path key={i} d={`M ${k} ${42 - i * 1} L ${k + 90} ${40 - i * 4}`} stroke="#7fa3c8" strokeWidth={5} />)}
			{Array.from({length: 9}).map((_, i) => <circle key={i} cx={-200 + rnd(i) * 480} cy={-140 + rnd(i + 3) * 110} r={8 + rnd(i + 6) * 10} fill="#6d97c8" />)}
			<path d={`M -40 70 Q 20 ${150 + Math.sin(f * 0.1) * 15} 110 140 Q 60 90 30 60 Z`} fill="#3f6fa8" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
			<path d={`M -478 ${0 + bouche * 10} Q -400 ${15 + bouche * 60} -300 ${20 + bouche * 20}`} stroke={INK} strokeWidth={7} fill={bouche > 0 ? '#5a1e2a' : 'none'} />
			<g transform="translate(-330 -55)">
				<ellipse cx={0} cy={0} rx={ouvert ? 36 : 26} ry={ouvert ? 40 : 28} fill="#fff" stroke={INK} strokeWidth={6} />
				{humeur === 'soulage' || humeur === 'fier' ? <path d="M -20 4 Q 0 -16 20 4" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" /> : <circle cx={-6} cy={ouvert ? 4 : 2} r={ouvert ? 9 : 12} fill={INK} />}
				{humeur === 'panique' && <path d="M -40 -60 L 20 -45" stroke={INK} strokeWidth={8} strokeLinecap="round" />}
				{humeur === 'calme' && <path d="M -28 -34 Q 0 -44 28 -34" stroke={INK} strokeWidth={6} fill="none" />}
			</g>
			{humeur === 'panique' && [0, 1, 2].map((i) => { const p = ((f * 0.04 + i / 3) % 1); return <path key={i} d="M 0 0 q -12 20 0 30 q 12 -10 0 -30 Z" transform={`translate(${-250 + i * 50} ${-200 + p * 120})`} fill="#bfe6fa" stroke={INK} strokeWidth={4} opacity={1 - p} />; })}
			{humeur === 'soulage' && <path d="M -470 0 Q -440 30 -400 25" stroke={INK} strokeWidth={6} fill="none" />}
			{casquette && <g transform="translate(-230 -185) rotate(-8)"><path d="M -110 0 Q -100 -90 0 -95 Q 100 -90 110 0 Z" fill="#1f3f7a" stroke={INK} strokeWidth={7} /><path d="M -110 0 L -200 10 Q -150 30 -100 18 Z" fill="#14305e" stroke={INK} strokeWidth={6} /><circle cx={0} cy={-50} r={24} fill="#ffd23f" stroke={INK} strokeWidth={5} /></g>}
		</g>
	);
};
const Dauphin: React.FC<{x: number; y: number; s?: number; f: number; flip?: boolean; choc?: boolean; ph?: number}> = ({x, y, s = 1, f, flip, choc, ph = 0}) => (
	<g transform={`translate(${x} ${y + Math.sin(f * 0.15 + ph) * 12}) scale(${flip ? -s : s} ${s})`}>
		<path d="M 110 -10 L 170 -50 L 160 0 L 170 40 Z" fill="#8a9aa8" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
		<path d="M -150 0 Q -120 -70 0 -70 Q 100 -60 130 -5 Q 80 40 -40 35 Q -110 30 -130 10 L -190 12 Q -175 -5 -150 0 Z" fill="#9fb0bf" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
		<path d="M -10 -68 L 30 -120 L 50 -62" fill="#8a9aa8" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
		<path d="M -120 18 Q -40 40 60 20" fill="#dfe7ee" stroke="none" />
		<ellipse cx={-90} cy={-22} rx={choc ? 14 : 9} ry={choc ? 16 : 10} fill={INK} />
		{choc && <ellipse cx={-90} cy={-22} rx={5} ry={6} fill="#fff" />}
	</g>
);
const Laxatif: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<rect x={-230} y={-90} width={460} height={180} rx={90} fill="#fff" stroke={INK} strokeWidth={8} />
		<path d="M 0 -90 L 140 -90 A 90 90 0 0 1 140 90 L 0 90 Z" fill="#e23b5a" stroke={INK} strokeWidth={8} />
		<rect x={-170} y={-60} width={70} height={50} rx={8} fill="#bfe3f2" stroke={INK} strokeWidth={5} />
		<rect x={30} y={-60} width={70} height={50} rx={8} fill="#bfe3f2" stroke={INK} strokeWidth={5} />
		{[-130, 130].map((k) => <circle key={k} cx={k} cy={95} r={32} fill="#333" stroke={INK} strokeWidth={6} />)}
		{txt(-60, 55, 'LAXATIF', 46, '#e23b5a')}
	</g>
);
const SousMarin: React.FC<{x: number; y: number; s?: number; flip?: boolean}> = ({x, y, s = 1, flip}) => (
	<g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
		<rect x={-160} y={-55} width={320} height={110} rx={55} fill="#7a8a5a" stroke={INK} strokeWidth={7} />
		<rect x={-40} y={-110} width={90} height={60} rx={12} fill="#6a7a4a" stroke={INK} strokeWidth={6} />
		<path d="M 20 -110 L 20 -150 L 60 -150" stroke={INK} strokeWidth={8} fill="none" />
		{[-90, -20, 50].map((k) => <circle key={k} cx={k} cy={0} r={18} fill="#ffe9a6" stroke={INK} strokeWidth={5} />)}
		<path d="M 160 0 L 200 -40 L 200 40 Z" fill="#5a6a3a" stroke={INK} strokeWidth={6} />
	</g>
);
const Chiottes: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={10} y={-260} width={110} height={150} rx={14} fill="#fff" stroke={INK} strokeWidth={7} />
		<path d="M -110 -110 L 120 -110 Q 110 -20 30 0 L 40 60 L -40 60 L -30 0 Q -110 -20 -110 -110 Z" fill="#fff" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
		<ellipse cx={0} cy={-110} rx={115} ry={22} fill="#e6eef4" stroke={INK} strokeWidth={6} />
	</g>
);
const NuageCaca: React.FC<{x: number; y: number; k: number; f: number; s?: number}> = ({x, y, k, f, s = 1}) => k <= 0 ? null : (
	<g transform={`translate(${x} ${y}) scale(${s * k})`}>
		{Array.from({length: 16}).map((_, i) => <circle key={i} cx={Math.cos(i * 2.4) * (120 + rnd(i) * 260)} cy={Math.sin(i * 2.4) * (90 + rnd(i + 4) * 170) + Math.sin(f * 0.08 + i) * 10} r={110 + rnd(i + 8) * 90} fill={i % 3 ? ORANGE : CACA} stroke={INK} strokeWidth={6} />)}
		{Array.from({length: 10}).map((_, i) => <circle key={'c' + i} cx={Math.cos(i * 1.7) * 200} cy={Math.sin(i * 1.7) * 150} r={40 + rnd(i + 2) * 40} fill="#f29a4a" />)}
	</g>
);
const Krill: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<path d="M -40 0 Q -20 -30 20 -24 Q 46 -16 40 10 Q 20 4 0 10 Q -20 14 -40 0 Z" fill="#f07a3a" stroke={INK} strokeWidth={4} />
		<path d="M 38 -10 L 70 -30 M 38 -6 L 72 -10" stroke={INK} strokeWidth={3} />
		<circle cx={28} cy={-10} r={4} fill={INK} />
	</g>
);
const Elephant: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[-40, -10, 25, 50].map((k) => <rect key={k} x={k - 12} y={0} width={24} height={50} fill="#9a9aa6" stroke={INK} strokeWidth={4} />)}
		<ellipse cx={0} cy={0} rx={75} ry={50} fill="#a8a8b4" stroke={INK} strokeWidth={5} />
		<circle cx={-70} cy={-20} r={38} fill="#a8a8b4" stroke={INK} strokeWidth={5} />
		<path d="M -100 -10 Q -120 40 -100 60" stroke={INK} strokeWidth={14} fill="none" strokeLinecap="round" /><path d="M -100 -10 Q -120 40 -100 60" stroke="#a8a8b4" strokeWidth={8} fill="none" strokeLinecap="round" />
		<ellipse cx={-50} cy={-20} rx={22} ry={30} fill="#9494a0" stroke={INK} strokeWidth={4} />
		<circle cx={-80} cy={-30} r={5} fill={INK} />
	</g>
);
const Bus: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-260} y={-200} width={520} height={180} rx={24} fill="#f2c230" stroke={INK} strokeWidth={8} />
		{[-210, -120, -30, 60, 150].map((k) => <rect key={k} x={k} y={-170} width={70} height={60} rx={8} fill="#bfe3f2" stroke={INK} strokeWidth={5} />)}
		{[-160, 160].map((k) => <circle key={k} cx={k} cy={-20} r={40} fill="#333" stroke={INK} strokeWidth={7} />)}
		{txt(0, -45, 'BUS', 40, '#fff')}
	</g>
);
const Terre: React.FC<{x: number; y: number; r?: number; tache?: number}> = ({x, y, r = 330, tache = 0}) => (
	<g transform={`translate(${x} ${y})`}>
		<circle r={r} fill="#2f7ac0" stroke={INK} strokeWidth={8} />
		<path d={`M ${-r * 0.6} ${-r * 0.5} q 120 -60 200 20 q 40 90 -60 140 q -110 20 -150 -60 Z`} fill="#4caa58" stroke={INK} strokeWidth={6} />
		<path d={`M ${r * 0.3} ${-r * 0.1} q 120 10 130 120 q -40 110 -130 60 q -50 -90 0 -180 Z`} fill="#4caa58" stroke={INK} strokeWidth={6} />
		{tache > 0 && <circle cx={-r * 0.25} cy={r * 0.45} r={60 * tache} fill={ORANGE} stroke={INK} strokeWidth={5} />}
	</g>
);
const Satellite: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<rect x={-180} y={-35} width={120} height={70} fill="#2a4f9a" stroke={INK} strokeWidth={5} />
		<rect x={60} y={-35} width={120} height={70} fill="#2a4f9a" stroke={INK} strokeWidth={5} />
		<rect x={-60} y={-50} width={120} height={100} rx={10} fill="#d8d8d8" stroke={INK} strokeWidth={6} />
		{txt(0, 15, 'NASA', 34, '#fff')}
	</g>
);
const Etoiles: React.FC = () => (<><rect x={-1500} y={-1500} width={4080} height={5000} fill="#0d1530" />{Array.from({length: 60}).map((_, i) => <circle key={i} cx={rnd(i) * 1600 - 260} cy={rnd(i + 50) * 2600 - 340} r={2 + rnd(i + 9) * 4} fill="#fff" />)}</>);

/* ---------- les plans ---------- */
export const W01: React.FC = () => (
	<Plan debut={0} fin={3.85} sansEntree cam={(t) => ({z: lin(t, [0, 3.85], [1.0, 1.2], ease), y: -60})}>
		{(t, f) => (<>
			<SousLeau id="w1" f={f} />
			<Baleine x={560} y={1150} s={0.95} f={f} humeur={t > 1.8 ? 'choc' : 'calme'} />
			<g transform={`translate(300 ${780 + Math.sin(f * 0.1) * 15}) scale(${pop(t, 0.9) * 0.7}) rotate(-10)`}><Laxatif x={0} y={0} /></g>
			{T(t, 0.3, 'BALEINE + LAXATIF', 110)}
			{T(t, 1.9, '= ?', 160, '#fff', 560)}
		</>)}
	</Plan>
);

export const W02: React.FC = () => (
	<Plan debut={3.85} fin={8.3} cam={(t) => ({z: lin(t, [3.85, 6.5, 8.3], [1.25, 1.0, 1.05], ease), x: lin(t, [3.85, 6.5], [-200, 0], ease), y: -40})}>
		{(t, f) => (<>
			<SousLeau id="w2" f={f} />
			<Baleine x={560} y={1000} s={0.95} f={f} humeur="calme" />
			{t > 5.3 && <g opacity={pop(t, 5.3)}><path d="M 100 1220 L 1060 1220 M 100 1190 L 100 1250 M 1060 1190 L 1060 1250" stroke="#fff" strokeWidth={10} />{txt(580, 1300, '30 MÈTRES', 80)}</g>}
			{t > 6.6 && Array.from({length: Math.min(20, Math.floor(lin(t, [6.6, 7.9], [1, 21])))}).map((_, i) => <Elephant key={i} x={110 + (i % 10) * 98} y={1600 + Math.floor(i / 10) * 110} s={0.45} />)}
			{T(t, 4.0, 'LA BALEINE BLEUE', 110)}
			{t > 6.6 && T(t, 6.6, '+ DE 20 ÉLÉPHANTS', 96, '#fff', 560)}
		</>)}
	</Plan>
);

export const W03: React.FC = () => (
	<Plan debut={8.3} fin={11.27} cam={(t) => ({z: lin(t, [8.3, 11.27], [1.1, 1.3], ease), y: -60})}>
		{(t, f) => {
			const k = lin(t, [8.6, 10.2], [0, 1], Easing.in(Easing.quad));
			return (<>
				<SousLeau id="w3" f={f} />
				<Baleine x={640} y={1100} s={0.8} f={f} humeur={t > 10.2 ? 'choc' : 'calme'} bouche={t < 10.2 ? lin(t, [8.4, 9.0], [0, 1]) : 0} />
				{k < 1 && <g transform={`translate(${lin(k, [0, 1], [-200, 300])} ${1080}) scale(${0.75 - k * 0.3}) rotate(${k * 30})`}><Laxatif x={0} y={0} /></g>}
				{T(t, 8.5, 'PAR ERREUR', 120)}
				{T(t, 9.8, 'TAILLE CAMPING-CAR', 96, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const W04: React.FC = () => (
	<Plan debut={11.27} fin={15.43} secousse={(t) => (t > 12.3 ? 22 : 0)} cam={(t) => ({z: lin(t, [11.27, 15.43], [1.0, 1.25], ease), y: -60})}>
		{(t, f) => (<>
			<SousLeau id="w4" f={f} />
			<Baleine x={600} y={1050} s={0.95} f={f} humeur={t > 12.3 ? 'choc' : 'calme'} tremble={t > 12.3 ? 14 : 0} />
			{t > 12.3 && txt(560, 800 + Math.sin(f * 0.8) * 10, 'GROOOUUUUU', 110, '#a6e07b', -6)}
			{t > 13.3 && <g transform={`translate(${lin(t, [13.3, 15.4], [1250, 700])} 1500)`}><g transform={`rotate(${lin(t, [14.2, 14.9], [0, 180])})`}><SousMarin x={0} y={0} s={0.8} flip /></g></g>}
			{t > 14.3 && txt(760, 1700, 'DEMI-TOUR !', 70, '#ff4b2b')}
			<Ecran><g transform="translate(540 230)"><rect x={-330} y={-48} width={660} height={96} rx={48} fill="#fff" stroke={INK} strokeWidth={6} opacity={pop(t, 11.3)} /><text x={0} y={18} textAnchor="middle" fontFamily={FONT} fontSize={54} fill={INK} opacity={pop(t, 11.3)}>10 MINUTES PLUS TARD</text></g></Ecran>
		</>)}
	</Plan>
);

export const W05: React.FC = () => (
	<Plan debut={15.43} fin={19.89} cam={(t) => ({z: lin(t, [15.43, 17.5, 19.89], [1.3, 1.15, 1.1], ease), y: -100})}>
		{(t, f) => {
			const fuite = lin(t, [17.5, 18.4], [0, 1], Easing.in(Easing.quad));
			return (<>
				<SousLeau id="w5" f={f} />
				<Baleine x={1100} y={1300} s={0.8} f={f} humeur="choc" tremble={10} />
				{[0, 1, 2].map((i) => <Dauphin key={i} x={300 + i * 150 - fuite * 1600} y={900 + i * 160} s={0.9} f={f} choc ph={i} flip={fuite > 0 ? false : true} />)}
				{fuite > 0.1 && [0, 1, 2].map((i) => <path key={i} d={`M ${500 + i * 150 - fuite * 1600} ${900 + i * 160} l 300 0`} stroke="#cfefff" strokeWidth={10} strokeLinecap="round" opacity={0.7} />)}
				{T(t, 15.6, 'LES DAUPHINS ONT COMPRIS', 84)}
				{T(t, 18.7, 'SANS DIRE AU REVOIR', 90, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const W06: React.FC = () => (
	<Plan debut={19.89} fin={22.99} cam={(t) => ({z: lin(t, [19.89, 22.99], [1.15, 1.4], ease), y: -40})}>
		{(t, f) => (<>
			<SousLeau id="w6" f={f} />
			<Baleine x={640} y={1200} s={0.95} f={f * 1.6} humeur="panique" tremble={8} />
			<Bulle x={420} y={720} w={420} h={340} k={pop(t, 21.6)} queue={[-40, 260]} pensee>
				<Chiottes x={0} y={80} s={0.9} />
				<text x={130} y={-60} fontFamily={FONT} fontSize={90} fill="#c0392b">?</text>
			</Bulle>
			{T(t, 20.8, 'PANIQUE', 140, '#ff4b2b')}
		</>)}
	</Plan>
);

export const W07: React.FC = () => (
	<Plan debut={22.99} fin={28.25} cam={(t) => ({z: lin(t, [22.99, 28.25], [1.0, 1.15], ease), y: -40})}>
		{(t, f) => {
			const k = lin(t, [25.8, 27.6], [0, 1], ease);
			return (<>
				<rect x={-1500} y={-1500} width={4080} height={5000} fill="#3f93c9" />
				{Array.from({length: 40}).map((_, i) => <path key={i} d={`M ${(i * 137) % 1300 - 100} ${(i * 251) % 2000} q 20 -12 40 0`} stroke="#bfe6fa" strokeWidth={6} fill="none" />)}
				<g transform="translate(220 1350)"><circle r={60} fill="#fff" opacity={0.3} /><Baleine x={0} y={0} s={0.14} f={f} humeur="panique" /></g>
				<path d="M -300 600 Q 200 520 700 560 L 1500 500 L 1500 -800 L -300 -800 Z" fill="#4caa58" stroke={INK} strokeWidth={6} opacity={0} />
				{t > 25.8 && <path d={`M 220 1300 Q 500 ${1000} ${lin(k, [0, 1], [220, 860])} ${lin(k, [0, 1], [1300, 800])}`} stroke="#fff" strokeWidth={10} strokeDasharray="30 24" fill="none" />}
				{t > 26.6 && <g transform={`translate(860 760) scale(${pop(t, 26.6) * 0.6})`}><Chiottes x={0} y={0} /></g>}
				{t > 26.6 && txt(640, 1050, '4000 KM', 90, '#FFD23F')}
				{T(t, 23.4, 'OCÉAN PACIFIQUE', 110)}
				{t > 24.3 && txt(220, 1470, 'ELLE', 60)}
			</>);
		}}
	</Plan>
);

export const W08: React.FC = () => (
	<Plan debut={28.25} fin={31.3} cam={(t) => ({z: lin(t, [28.25, 29.9, 30.5, 31.3], [1.0, 1.15, 1.35, 1.45], ease), y: -60})}>
		{(t, f) => (<>
			<SousLeau id="w8" f={f} />
			<Baleine x={720} y={1150} s={0.9} f={f} humeur={t > 29.9 ? 'choc' : 'panique'} tremble={t > 29.9 ? 20 : 6} />
			{T(t, 28.4, 'ELLE LÂCHE TOUT', 110)}
			{T(t, 29.9, 'LÀ.', 170, '#fff', 560)}
			{T(t, 30.5, 'MAINTENANT.', 130, '#ff4b2b', 720)}
		</>)}
	</Plan>
);

export const W09: React.FC = () => (
	<Plan debut={31.3} fin={34.04} secousse={(t) => 30 * lin(t, [31.3, 32.5], [1, 0])} cam={(t) => ({z: lin(t, [31.3, 34.04], [1.3, 0.95], ease), y: -40})}>
		{(t, f) => {
			const k = lin(t, [31.3, 32.4], [0, 1], Easing.out(Easing.back(1.4)));
			return (<>
				<SousLeau id="w9" f={f} teinte={k * 0.4} />
				<NuageCaca x={750} y={1050} k={k} f={f} s={1.3} />
				<Baleine x={380} y={1150} s={0.8} f={f} humeur="soulage" />
				{t > 32.6 && <g opacity={pop(t, 32.6)}><rect x={140} y={620} width={800} height={520} fill="none" stroke="#fff" strokeWidth={10} strokeDasharray="40 20" /><line x1={540} y1={620} x2={540} y2={1140} stroke="#fff" strokeWidth={8} /><circle cx={540} cy={880} r={80} fill="none" stroke="#fff" strokeWidth={8} /></g>}
				{T(t, 31.4, 'SPLAAAASH', 150, ORANGE)}
				{T(t, 32.6, 'UN TERRAIN DE FOOT', 96, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const W10: React.FC = () => (
	<Plan debut={34.04} fin={41.3} cam={(t) => ({z: lin(t, [34.04, 38.8, 41.3], [1.0, 1.05, 1.4], ease), y: lin(t, [38.8, 41.3], [-150, -330], ease)})}>
		{(t, f) => {
			const bx = lin(t, [34.1, 38.6], [-20, 640], ease);
			const fluo = t > 36.3;
			return (<>
				<Ciel id="w10" /><Soleil x={880} y={300} f={f} /><Nuage x={220} y={330} /><Mouette x={700} y={520} f={f} />
				<Mer y={1150} f={f} />
				<ellipse cx={600} cy={1230} rx={330} ry={70} fill={ORANGE} opacity={0.85} stroke={INK} strokeWidth={5} />
				<Barque x={bx} y={1180} s={1.2} f={f} c={fluo ? '#ff8a1e' : '#8a5a35'}>
					<Humain x={-60} y={-40} s={0.5} f={f} couleur={fluo ? '#ff8a1e' : '#e0b21a'} chapeau="bonnet" jambesC="#2f3e5a" peau={fluo ? '#ffa040' : undefined} humeur={t > 38.8 ? 'choc' : 'content'} />
					<Humain x={70} y={-40} s={0.5} f={f} couleur={fluo ? '#ff8a1e' : '#2f6fb0'} chapeau="bonnet" jambesC="#2f3e5a" peau={fluo ? '#ffa040' : undefined} moustache humeur={t > 38.8 ? 'choc' : 'content'} ph={2} />
					<path d="M 120 -60 L 220 -260" stroke={INK} strokeWidth={8} /><path d="M 220 -260 L 230 -100" stroke={INK} strokeWidth={3} />
				</Barque>
				{T(t, 34.3, 'BATEAU DE PÊCHE', 110)}
				{fluo && T(t, 36.5, 'ORANGE FLUO', 120, ORANGE, 560)}
				{t > 38.9 && <Ecran>{txt(540, 1250, 'PLUS JAMAIS.', 110, '#fff')}</Ecran>}
			</>);
		}}
	</Plan>
);

export const W11: React.FC = () => (
	<Plan debut={41.3} fin={46.4} cam={(t) => ({z: lin(t, [41.3, 43.9], [1.0, 1.3], ease), y: -60})}>
		{(t, f) => t < 43.95 ? (<>
			<Etoiles />
			<Terre x={540} y={1150} r={380} tache={lin(t, [41.5, 42.5], [0, 1.2])} />
			<Satellite x={800} y={650} s={1.1} r={-15 + Math.sin(f * 0.05) * 5} />
			{t > 42.3 && <path d="M 760 700 L 470 1300" stroke="#ffd23f" strokeWidth={6} strokeDasharray="20 14" />}
			{t > 42.6 && <circle cx={445} cy={1321} r={110} fill="none" stroke="#ff4b2b" strokeWidth={12} opacity={pop(t, 42.6)} />}
			{T(t, 41.5, 'TACHE SUSPECTE', 110, ORANGE)}
		</>) : (<>
			<Fond c="#e8e1d0" />
			<rect x={-800} y={1450} width={2680} height={1300} fill="#7a5a44" stroke={INK} strokeWidth={6} />
			{[0, 1, 2].map((i) => <Humain key={i} x={230 + i * 310} y={1420} s={1.0} f={f * 1.3} couleur={['#2c3442', '#5a3020', '#2f4f3a'][i]} chapeau="aucun" cheveux={['#9a9a9a', '#3b2a1e', '#c9a060'][i]} jambesC="#2c2f36" cravate={['#c0392b', '#2f6fb0', '#e0b21a'][i]} pose={i === 1 ? 'crie' : 'main'} humeur={i === 1 ? 'crie' : 'choc'} ph={i} flip={i === 2} />)}
			<rect x={60} y={1380} width={960} height={70} rx={14} fill="#5a3820" stroke={INK} strokeWidth={8} />
			<g transform="translate(540 1000)"><rect x={-90} y={-60} width={180} height={120} rx={10} fill="#fff" stroke={INK} strokeWidth={6} /><circle r={36} fill={ORANGE} stroke={INK} strokeWidth={5} /></g>
			{T(t, 44.0, "RÉUNION D'URGENCE", 100, '#ff4b2b')}
		</>)}
	</Plan>
);

export const W12: React.FC = () => (
	<Plan debut={46.4} fin={48.88} cam={(t) => ({z: lin(t, [46.4, 48.88], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#e4dcf2" />
			<Baleine x={560} y={1350} s={0.8} f={f} humeur="calme" />
			{txt(540, 900, '? TONNES', 170, '#7a5ac0')}
			{T(t, 46.5, 'LA VRAIE RÉPONSE', 110, '#fff')}
		</>)}
	</Plan>
);

export const W13: React.FC = () => (
	<Plan debut={48.88} fin={54.44} cam={(t) => ({z: lin(t, [48.88, 52.2, 54.44], [1.05, 1.15, 1.25], ease), y: -100})}>
		{(t, f) => {
			const n = Math.floor(lin(t, [49.2, 51.8], [0, 60]));
			const p = lin(t, [53.2, 53.7], [0, 1], Easing.out(Easing.back(2)));
			return (<>
				<Fond c="#fdeede" />
				<rect x={-800} y={1500} width={2680} height={1200} fill="#c9b48a" stroke={INK} strokeWidth={6} />
				<g transform={`translate(540 1500) rotate(${-p * 0})`}>
					<path d="M -40 0 L 0 -260 L 40 0 Z" fill="#7a5532" stroke={INK} strokeWidth={6} />
					<g transform={`rotate(${0})`}>
						<rect x={-460} y={-280} width={920} height={24} rx={10} fill="#8a6a4a" stroke={INK} strokeWidth={6} />
						{Array.from({length: n}).map((_, i) => <Krill key={i} x={-400 + (i % 10) * 34} y={-300 - Math.floor(i / 10) * 26} s={0.55} r={rnd(i) * 40 - 20} />)}
						{p > 0 && <g transform={`scale(${p})`}><Bus x={260} y={-280} s={0.75} /></g>}
					</g>
				</g>
				{txt(260, 1080, 'CREVETTES', 54, ORANGE)}
				{T(t, 49.1, '16 TONNES PAR JOUR', 100)}
				{T(t, 53.2, '= UN BUS', 130, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const W14: React.FC = () => (
	<Plan debut={54.44} fin={58.98} cam={(t) => ({z: lin(t, [54.44, 58.98], [1.1, 1.25], ease), y: -60})}>
		{(t, f) => {
			const k = lin(t, [56.2, 57.2], [0, 0.8], Easing.out(Easing.back(1.4)));
			return (<>
				<SousLeau id="w14" f={f} />
				{t < 56.2 && Array.from({length: 40}).map((_, i) => <Krill key={i} x={(rnd(i) * 1100 + f * 3 * (rnd(i + 2) + 0.5)) % 1200 - 60} y={700 + rnd(i + 7) * 700} s={1.1} r={rnd(i + 1) * 40 - 20} />)}
				<NuageCaca x={820} y={1000} k={k} f={f} s={1} />
				<Baleine x={420} y={1250} s={0.75} f={f} humeur={t > 56.2 ? 'soulage' : 'calme'} bouche={t < 56.2 ? 0.6 : 0} />
				{T(t, 54.6, 'CREVETTES ORANGE', 110, ORANGE)}
				{T(t, 56.4, '= CACA ORANGE', 110, '#fff', 560)}
				{t > 58.15 && <Ecran><g transform={`translate(760 1560) rotate(-12) scale(${pop(t, 58.15) * 1})`}><rect x={-230} y={-70} width={460} height={140} rx={16} fill="none" stroke="#c0392b" strokeWidth={12} /><text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={80} fill="#c0392b">VRAI DE VRAI</text></g></Ecran>}
			</>);
		}}
	</Plan>
);

export const W15: React.FC = () => (
	<Plan debut={58.98} fin={64.84} cam={(t) => ({z: lin(t, [58.98, 64.84], [1.05, 1.2], ease), y: lin(t, [58.98, 64.84], [0, -300], ease)})}>
		{(t, f) => {
			const pl = Math.floor(lin(t, [61.2, 62.4], [0, 40]));
			return (<>
				<SousLeau id="w15" f={f} />
				<NuageCaca x={540} y={1450} k={1} f={f} s={0.5} />
				{Array.from({length: pl}).map((_, i) => <g key={i} transform={`translate(${rnd(i) * 1000 + 40} ${700 + rnd(i + 3) * 600 + Math.sin(f * 0.05 + i) * 12})`}><circle r={14} fill="#7be07b" stroke={INK} strokeWidth={4} /><circle r={5} fill="#3c8a4a" /></g>)}
				{t > 62.4 && Array.from({length: 10}).map((_, i) => { const y = 1100 - ((t - 62.4) * 300 + i * 90) % 900; return <g key={'o' + i} transform={`translate(${100 + i * 95} ${y})`}><circle r={40} fill="#e8f8ff" stroke={INK} strokeWidth={5} opacity={0.9} /><text x={0} y={14} textAnchor="middle" fontFamily={FONT} fontSize={34} fill="#2f7ac0">O₂</text></g>; })}
				{T(t, 59.7, 'ENGRAIS', 140, ORANGE)}
				{t > 61.3 && T(t, 61.3, 'PLANCTON', 120, '#7be07b', 560)}
				{t > 62.9 && T(t, 62.9, 'OXYGÈNE', 120, '#bfe6fa', 720)}
			</>);
		}}
	</Plan>
);

export const W16: React.FC = () => (
	<Plan debut={64.84} fin={72.13} cam={(t) => ({z: lin(t, [64.84, 68.4, 72.13], [1.0, 1.2, 1.35], ease), y: -200})}>
		{(t, f) => {
			const souffle = t > 68.4 && t < 71.0 ? Math.sin((t - 68.4) * 2.4) : 0;
			return (<>
				<Ciel id="w16" /><Soleil x={880} y={300} f={f} />
				<Mer y={1100} f={f} />
				<rect x={-800} y={1450} width={2680} height={1300} fill="#f2d79a" stroke={INK} strokeWidth={6} />
				<g transform={`translate(860 ${1080 + Math.sin(f * 0.08) * 6})`}><path d="M -140 0 Q 0 -90 140 0 Z" fill="#4d7fb8" stroke={INK} strokeWidth={6} />{t > 70 && <path d={`M -60 -50 Q -70 -200 -120 -240 M -60 -50 Q -40 -210 0 -250`} stroke="#cfefff" strokeWidth={14} fill="none" strokeLinecap="round" />}</g>
				<g transform={`translate(380 1700) scale(${1 + souffle * 0.06} ${1 + souffle * 0.03})`}><Humain x={0} y={0} s={1.2} f={f} couleur="#e05a7a" chapeau="paille" jambesC="#2f6fb0" humeur={t > 71.2 ? 'content' : (t > 66 ? 'perplexe' : 'neutre')} pose={t > 71.2 ? 'salut' : 'debout'} /></g>
				{t > 65.9 && <Bulle x={620} y={760} w={480} h={260} k={pop(t, 65.9)} queue={[-180, 220]} pensee><text x={0} y={24} textAnchor="middle" fontFamily={FONT} fontSize={66} fill={INK}>… BERK ?</text></Bulle>}
				{T(t, 65.0, 'TECHNIQUEMENT…', 110)}
				{t > 71.2 && T(t, 71.2, 'MERCI LA BALEINE', 100, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const W17: React.FC = () => (
	<Plan debut={72.13} fin={76.4} cam={(t) => ({z: lin(t, [72.13, 75], [1.0, 1.25], ease), y: -60})}>
		{(t, f) => (<>
			<SousLeau id="w17" f={f} />
			<Baleine x={600} y={1150} s={0.95} f={f} humeur="fier" casquette={t > 74.1} />
			{t > 74.1 && <g transform={`translate(560 1640) scale(${pop(t, 74.1)})`}><rect x={-250} y={-55} width={500} height={110} rx={20} fill="#1f3f7a" stroke={INK} strokeWidth={7} />{txt(0, 22, 'SERVICE PUBLIC', 60, '#ffd23f')}</g>}
			{T(t, 72.3, "CE N'EST PLUS DU CACA", 92)}
			{t > 75.4 && T(t, 75.4, 'FIN', 150, '#fff', 560)}
		</>)}
	</Plan>
);

export const PLANS_BALEINE: [number, number, React.FC][] = [
	[0, 3.85, W01], [3.85, 8.3, W02], [8.3, 11.27, W03], [11.27, 15.43, W04], [15.43, 19.89, W05], [19.89, 22.99, W06], [22.99, 28.25, W07],
	[28.25, 31.3, W08], [31.3, 34.04, W09], [34.04, 41.3, W10], [41.3, 46.4, W11], [46.4, 48.88, W12], [48.88, 54.44, W13], [54.44, 58.98, W14],
	[58.98, 64.84, W15], [64.84, 72.13, W16], [72.13, 76.4, W17],
];
