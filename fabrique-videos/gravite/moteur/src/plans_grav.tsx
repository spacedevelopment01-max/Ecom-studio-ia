import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Humain, Bulle} from './dessins';
import {ease, T, txt, Fond} from './commun_moyenage';

const T0 = (t: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => T(t, -1, texte, taille, c, y);
const MOI = {couleur: '#e05a3a', chapeau: 'aucun' as const, cheveux: '#3b2a1e', jambesC: '#2f4f8a'};
const Puce = (t: number, a: number, s: string, c = '#fff', tc = INK) => <Ecran><g transform={`translate(540 230) scale(${pop(t, a)})`}><rect x={-260} y={-56} width={520} height={112} rx={56} fill={c} stroke={INK} strokeWidth={7} /><text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontSize={66} fill={tc}>{s}</text></g></Ecran>;
const Rue: React.FC<{id: string; f: number}> = ({id, f}) => (<><Ciel id={id} /><Soleil x={880} y={300} f={f} /><Nuage x={220} y={330} /><rect x={-900} y={1500} width={2900} height={1500} fill="#9a9a96" stroke={INK} strokeWidth={6} />{[0, 1, 2, 3].map((i) => <rect key={i} x={-60 + i * 330} y={1640} width={180} height={20} fill="#fff" />)}{[0, 1].map((i) => <g key={i}><rect x={i ? 760 : -40} y={900} width={340} height={600} fill={i ? '#d8c8a8' : '#c8d8e8'} stroke={INK} strokeWidth={7} />{[0, 1, 2, 3].map((k) => <rect key={k} x={(i ? 790 : -10) + (k % 2) * 160} y={960 + Math.floor(k / 2) * 200} width={110} height={130} fill="#bfe3f2" stroke={INK} strokeWidth={5} />)}</g>)}</>);
const Ombre: React.FC<{x: number; y: number; w?: number; k?: number}> = ({x, y, w = 140, k = 1}) => <ellipse cx={x} cy={y} rx={w * k} ry={18 * k} fill="#000" opacity={0.25} />;
const Tasse: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}><path d="M -60 -100 L 60 -100 L 50 0 L -50 0 Z" fill="#fff" stroke={INK} strokeWidth={6} /><path d="M 58 -80 Q 100 -70 90 -40 Q 80 -20 54 -25" stroke={INK} strokeWidth={8} fill="none" /></g>
);
const Vache: React.FC<{x: number; y: number; s?: number; f: number; r?: number}> = ({x, y, s = 1, f, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		{[-90, -40, 50, 100].map((k) => <rect key={k} x={k - 14} y={-90} width={28} height={90} fill="#fff" stroke={INK} strokeWidth={4} />)}
		<ellipse cx={0} cy={-140} rx={150} ry={80} fill="#fff" stroke={INK} strokeWidth={6} />
		<path d="M -60 -190 q 30 20 10 60 q -40 10 -50 -30 Z M 50 -170 q 40 10 30 50 q -40 0 -30 -50 Z" fill={INK} />
		<g transform="translate(-160 -170)"><ellipse rx={56} ry={46} fill="#fff" stroke={INK} strokeWidth={5} /><ellipse cx={-14} cy={26} rx={40} ry={24} fill="#f4b6c0" stroke={INK} strokeWidth={4} /><circle cx={-10} cy={-12} r={9} fill={INK} /><circle cx={18} cy={-12} r={9} fill={INK} /><path d="M -40 -40 L -60 -70 M 30 -40 L 50 -70" stroke="#c9a86a" strokeWidth={10} strokeLinecap="round" /></g>
	</g>
);
const Chien: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		{[-50, -20, 30, 60].map((k) => <rect key={k} x={k - 10} y={-60} width={20} height={60} fill="#c98a4a" stroke={INK} strokeWidth={4} />)}
		<ellipse cx={0} cy={-90} rx={90} ry={46} fill="#c98a4a" stroke={INK} strokeWidth={5} />
		<path d="M 80 -100 Q 130 -150 120 -110" stroke={INK} strokeWidth={10} fill="none" />
		<g transform="translate(-90 -130)"><circle r={44} fill="#c98a4a" stroke={INK} strokeWidth={5} /><ellipse cx={-26} cy={-36} rx={16} ry={30} fill="#8a5a2a" stroke={INK} strokeWidth={4} /><circle cx={-12} cy={-8} r={8} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={-12} cy={-8} r={4} fill={INK} /><circle cx={-40} cy={10} r={9} fill={INK} /><ellipse cx={-20} cy={24} rx={12} ry={8} fill="#5a1a1a" /></g>
	</g>
);
const Voiture: React.FC<{x: number; y: number; s?: number; r?: number; c?: string}> = ({x, y, s = 1, r = 0, c = '#2f6fb0'}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}><path d="M -180 -40 L -180 -110 L -110 -110 L -70 -180 L 90 -180 L 140 -110 L 180 -100 L 180 -40 Z" fill={c} stroke={INK} strokeWidth={7} strokeLinejoin="round" /><path d="M -60 -165 L 80 -165 L 115 -115 L -90 -115 Z" fill="#bfe3f2" stroke={INK} strokeWidth={5} />{[-110, 110].map((k) => <circle key={k} cx={k} cy={-35} r={38} fill="#333" stroke={INK} strokeWidth={6} />)}</g>
);
const Terre: React.FC<{x: number; y: number; r?: number; f: number}> = ({x, y, r = 330, f}) => (
	<g transform={`translate(${x} ${y})`}>
		<circle r={r} fill="#2f7ac0" stroke={INK} strokeWidth={8} />
		<g transform={`rotate(${f * 0.8})`}><path d={`M ${-r * 0.6} ${-r * 0.5} q 120 -60 200 20 q 40 90 -60 140 q -110 20 -150 -60 Z`} fill="#4caa58" stroke={INK} strokeWidth={6} /><path d={`M ${r * 0.3} ${-r * 0.1} q 120 10 130 120 q -40 110 -130 60 q -50 -90 0 -180 Z`} fill="#4caa58" stroke={INK} strokeWidth={6} /></g>
	</g>
);

export const G01: React.FC = () => (
	<Plan debut={0} fin={2.89} sansEntree cam={(t) => ({z: lin(t, [0, 2.89], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Rue id="g1" f={f} />
			<Ombre x={540} y={1720} />
			<Humain x={540} y={1720 - Math.sin(f * 0.15) * 30 - 30} s={1.3} f={f} {...MOI} pose="salut" humeur="choc" />
			<g transform={`translate(860 ${1300 + Math.sin(f * 0.12) * 40}) rotate(${f * 2})`}><Tasse x={0} y={0} s={0.8} /></g>
			{T0(t, 'ET SI LA GRAVITÉ', 120)}
			{T0(t, 'DISPARAISSAIT ?', 120, '#fff', 560)}
		</>)}
	</Plan>
);
export const G02: React.FC = () => (
	<Plan debut={2.89} fin={6.95} cam={(t) => ({z: lin(t, [2.89, 6.95], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => {
			const h = lin(t, [5.36, 6.9], [0, 90], ease);
			return (<>
				<Rue id="g2" f={f} />
				<Ombre x={540} y={1720} k={1 - h / 300} />
				<Humain x={540} y={1720 - h} s={1.3} f={f} {...MOI} pose={h > 20 ? 'salut' : 'debout'} humeur={h > 20 ? 'choc' : 'neutre'} />
				{Puce(t, 2.9, 'SECONDE 1')}
				{T(t, 3.7, "PAS DANS L'ESPACE…", 100)}
				{t > 5.36 && T(t, 5.36, 'MAIS TU DÉCOLLES', 100, '#7be07b', 560)}
			</>);
		}}
	</Plan>
);
export const G03: React.FC = () => (
	<Plan debut={6.95} fin={10.89} cam={(t) => ({z: lin(t, [6.95, 10.89], [1.0, 1.1], ease), y: -60})}>
		{(t, f) => {
			const k = lin(t, [9.6, 10.8], [0, 1]);
			return (<>
				<rect x={-1500} y={-1500} width={4080} height={5000} fill="#0d1530" />
				{Array.from({length: 50}).map((_, i) => <circle key={i} cx={rnd(i) * 1600 - 260} cy={rnd(i + 50) * 2600 - 340} r={2 + rnd(i + 9) * 4} fill="#fff" />)}
				<Terre x={540} y={1250} r={380} f={f} />
				<path d="M 160 1000 A 450 450 0 0 1 920 1000" stroke="#ffd23f" strokeWidth={14} fill="none" markerEnd="" />
				<path d="M 900 970 l 30 40 l -50 0 Z" fill="#ffd23f" transform="rotate(30 905 990)" />
				<g transform={`translate(${540 + k * 260} ${870 - k * 30})`}><Humain x={0} y={0} s={0.35} f={f} {...MOI} pose="salut" humeur="choc" /></g>
				{t > 9.6 && <path d="M 540 860 L 900 830" stroke="#fff" strokeWidth={6} strokeDasharray="20 14" />}
				{T(t, 7.0, 'LA TERRE TOURNE', 110)}
				{t > 9.6 && T(t, 9.6, 'TOI : TOUT DROIT', 110, '#fff', 560)}
			</>);
		}}
	</Plan>
);
export const G04: React.FC = () => (
	<Plan debut={10.89} fin={16.27} cam={(t) => ({z: lin(t, [10.89, 13.6, 16.27], [1.0, 1.15, 1.35], ease), y: -250})}>
		{(t, f) => {
			const sort = lin(t, [11.9, 13.4], [0, 1], ease);
			const boule = lin(t, [14.6, 15.6], [0, 1], ease);
			return (<>
				<Fond c="#fbe7c6" />
				<rect x={-800} y={1550} width={2680} height={1300} fill="#a07a50" stroke={INK} strokeWidth={6} />
				<Tasse x={540} y={1550} s={1.6} />
				<g transform={`translate(540 ${1400 - sort * 380})`}>
					{boule < 1 ? <path d={`M ${-90 * (1 - boule) - 60 * boule} 0 Q ${-60} ${-60 - boule * 60} 0 ${-70 - boule * 50} Q 60 ${-60 - boule * 60} ${90 * (1 - boule) + 60 * boule} 0 Q 0 ${40 + boule * 40} ${-90 * (1 - boule) - 60 * boule} 0 Z`} fill="#6b3a1a" stroke={INK} strokeWidth={5} opacity={sort > 0 ? 1 : 0} /> : <circle r={90} fill="#6b3a1a" stroke={INK} strokeWidth={6} />}
					{boule > 0.9 && <ellipse cx={-30} cy={-34} rx={22} ry={12} fill="#fff" opacity={0.4} />}
				</g>
				{Puce(t, 10.9, 'SECONDE 2')}
				{T(t, 11.95, 'TON CAFÉ S\'ENVOLE', 100)}
				{t > 15.38 && T(t, 15.38, 'EN BOULE', 130, '#fff', 560)}
			</>);
		}}
	</Plan>
);
export const G05: React.FC = () => (
	<Plan debut={16.27} fin={22.64} cam={(t) => ({z: lin(t, [16.27, 22.64], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Rue id="g5" f={f} />
			{t > 17.2 && <><Ombre x={250} y={1760} w={180} /><g transform={`translate(0 ${-lin(t, [17.2, 19], [0, 160], ease)})`}><Voiture x={250} y={1760} s={1.0} r={Math.sin(f * 0.05) * 6} /></g></>}
			{t > 17.82 && <><Ombre x={840} y={1760} w={100} /><g transform={`translate(0 ${-lin(t, [17.82, 19.5], [0, 220], ease)})`}><Chien x={840} y={1760} s={1.0} r={Math.sin(f * 0.07) * 15} /></g></>}
			{t > 18.29 && <><Ombre x={560} y={1800} w={170} /><g transform={`translate(0 ${-lin(t, [18.29, 20], [0, 420], ease)})`}><Vache x={560} y={1800} s={1.0} f={f} r={Math.sin(f * 0.04) * 10} /></g></>}
			{t > 20.27 && <Bulle x={560} y={980} w={640} h={200} k={pop(t, 20.27)} queue={[0, 180]}><text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontSize={56} fill={INK}>C'EST QUOI CE DÉLIRE ?!</text></Bulle>}
			{Puce(t, 16.3, 'SECONDE 3')}
			{T(t, 17.2, 'TOUT FLOTTE', 120)}
		</>)}
	</Plan>
);
export const G06: React.FC = () => (
	<Plan debut={22.64} fin={27.04} cam={(t) => ({z: lin(t, [22.64, 27.04], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<defs><linearGradient id="atm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#7cc4ea" /><stop offset="0.5" stopColor="#2a4a8a" /><stop offset="1" stopColor="#0d1530" /></linearGradient></defs>
			<rect x={-1500} y={-1500} width={4080} height={5000} fill="url(#atm)" />
			<path d="M -900 1700 Q 540 1450 2000 1700 L 2000 3000 L -900 3000 Z" fill="#4caa58" stroke={INK} strokeWidth={6} />
			{t > 23.7 && Array.from({length: 40}).map((_, i) => { const y = 1300 - ((t - 23.7) * (180 + rnd(i) * 160) + rnd(i + 7) * 400) % 1300; return <circle key={i} cx={60 + rnd(i + 2) * 960} cy={y} r={10 + rnd(i + 4) * 8} fill="#cfefff" stroke={INK} strokeWidth={3} opacity={0.9} />; })}
			{t > 24.5 && [0, 1, 2].map((i) => <path key={i} d={`M ${270 + i * 270} 1000 L ${270 + i * 270} 700 m -40 50 l 40 -50 l 40 50`} stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" />)}
			{Puce(t, 22.7, 'SECONDE 4')}
			{t > 24.5 && T(t, 24.5, "L'AIR S'ÉCHAPPE", 120, '#fff')}
		</>)}
	</Plan>
);
export const G07: React.FC = () => (
	<Plan debut={27.04} fin={30.05} secousse={() => 12} cam={(t) => ({z: lin(t, [27.04, 30.05], [1.0, 1.2], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#2a2a3a" />
			<text x={540} y={1250} textAnchor="middle" fontFamily={FONT} fontSize={460} fill="#ff4b2b" stroke={INK} strokeWidth={30} paintOrder="stroke" opacity={pop(t, 28.3)}>5</text>
			{T(t, 27.1, 'MAIS ATTENDS…', 130)}
			{t > 28.3 && T(t, 28.3, 'LE PIRE', 130, '#ff4b2b', 560)}
		</>)}
	</Plan>
);
export const G08: React.FC = () => (
	<Plan debut={30.05} fin={34.69} secousse={(t) => (t > 31.5 && t < 32.3 ? 40 : 0)} cam={(t) => ({z: lin(t, [30.05, 34.69], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => {
			const chute = lin(t, [31.0, 31.5], [1, 0], Easing.in(Easing.quad));
			return (<>
				<Rue id="g8" f={f} />
				<Ombre x={250} y={1760} w={180} /><g transform={`translate(0 ${-160 * chute})`}><Voiture x={250} y={1760} s={1.0} /></g>
				<Ombre x={840} y={1760} w={100} /><g transform={`translate(0 ${-220 * chute})`}><Chien x={840} y={1760} s={1.0} /></g>
				<Ombre x={560} y={1800} w={170} /><g transform={`translate(0 ${-420 * chute})`}><Vache x={560} y={1800} s={1.0} f={f} /></g>
				{t > 32.6 && <g opacity={pop(t, 32.6)}><path d="M 980 1300 L 980 1500 M 950 1300 L 1010 1300 M 950 1500 L 1010 1500" stroke="#fff" strokeWidth={10} />{txt(980, 1420, '20 CM', 50, '#FFD23F', -90)}</g>}
				{T(t, 30.1, 'LA GRAVITÉ REVIENT', 110)}
				{t > 31.4 && T(t, 31.4, 'TOUT RETOMBE', 120, '#ff4b2b', 560)}
			</>);
		}}
	</Plan>
);
export const G09: React.FC = () => (
	<Plan debut={34.69} fin={40.0} cam={(t) => ({z: lin(t, [34.69, 40], [1.0, 1.2], ease), y: -200})}>
		{(t, f) => (<>
			<Rue id="g9" f={f} />
			{Array.from({length: Math.floor(lin(t, [34.8, 36.8], [0, 16]))}).map((_, i) => <g key={i} transform={`translate(${80 + rnd(i) * 920} ${700 + rnd(i + 5) * 800}) rotate(${(rnd(i + 9) - 0.5) * 30})`}>{txt(0, 0, 'AÏE !', 50 + rnd(i + 3) * 40, ['#ff4b2b', '#FFD23F', '#fff'][i % 3])}</g>)}
			<Humain x={540} y={1760} s={1.3} f={f} {...MOI} humeur={t > 37.04 ? 'triste' : 'crie'} pose="debout" />
			{t > 37.04 && <ellipse cx={540} cy={1760 - 130 * 1.3} rx={60} ry={40} fill="#6b3a1a" opacity={pop(t, 37.04) * 0.85} />}
			{t > 37.04 && <Tasse x={700} y={1770} s={0.6} />}
			{T(t, 34.75, '8 MILLIARDS DE « AÏE »', 90)}
			{t > 37.04 && T(t, 37.04, 'ET UN CAFÉ RENVERSÉ', 96, '#fff', 560)}
		</>)}
	</Plan>
);
export const PLANS_GRAV: [number, number, React.FC][] = [
	[0, 2.89, G01], [2.89, 6.95, G02], [6.95, 10.89, G03], [10.89, 16.27, G04], [16.27, 22.64, G05], [22.64, 27.04, G06], [27.04, 30.05, G07], [30.05, 34.69, G08], [34.69, 40.0, G09],
];
