import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Humain, Bulle, Tribunal, Marteau} from './dessins';
import {ease, T, txt, Fond, JUGE, GENS, Ville, Parchemin, Rat} from './commun_moyenage';

const T0 = (t: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => T(t, -1, texte, taille, c, y); // visible dès la première image
const AVOCAT = {couleur: '#1a1a22', chapeau: 'bonnet' as const, cheveux: '#3b2a1e', jambesC: '#1a1a22', cravate: '#ffffff'};
const Tampon = (t: number, a: number, s: string, c = '#c0392b', y = 1150, r = -10) => t > a ? <Ecran><g transform={`translate(540 ${y}) rotate(${r}) scale(${pop(t, a)})`}><rect x={-s.length * 34 - 40} y={-80} width={s.length * 68 + 80} height={160} rx={18} fill="none" stroke={c} strokeWidth={14} /><text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={110} fill={c}>{s}</text></g></Ecran> : null;

/* ---------- personnages de cette histoire ---------- */
const RatDebout: React.FC<{x: number; y: number; s?: number; f: number; humeur?: 'content' | 'peur' | 'neutre' | 'fier'; ph?: number; bras?: boolean}> = ({x, y, s = 1, f, humeur = 'neutre', ph = 0, bras}) => {
	const b = Math.sin(f * 0.12 + ph) * 5;
	const tr = humeur === 'peur' ? (rnd(f + ph) - 0.5) * 6 : 0;
	return (
		<g transform={`translate(${x + tr} ${y + b}) scale(${s})`}>
			<path d={`M 40 -40 Q 160 -20 170 ${-120 + Math.sin(f * 0.15 + ph) * 20}`} stroke="#c98a7a" strokeWidth={12} fill="none" strokeLinecap="round" />
			{[-30, 30].map((k) => <ellipse key={k} cx={k} cy={-8} rx={30} ry={12} fill="#c98a7a" stroke={INK} strokeWidth={4} />)}
			<ellipse cx={0} cy={-110} rx={70} ry={100} fill="#8a8a92" stroke={INK} strokeWidth={6} />
			<ellipse cx={0} cy={-90} rx={42} ry={64} fill="#c4c4cc" />
			{[-1, 1].map((k) => <path key={k} d={bras ? `M ${k * 55} -150 L ${k * 110} -260` : `M ${k * 55} -150 Q ${k * 80} -110 ${k * 40} -90`} stroke={INK} strokeWidth={22} strokeLinecap="round" fill="none" />)}
			{[-1, 1].map((k) => <path key={'b' + k} d={bras ? `M ${k * 55} -150 L ${k * 110} -260` : `M ${k * 55} -150 Q ${k * 80} -110 ${k * 40} -90`} stroke="#8a8a92" strokeWidth={12} strokeLinecap="round" fill="none" />)}
			<g transform="translate(0 -230)">
				{[-48, 48].map((k) => <g key={k}><circle cx={k} cy={-50} r={36} fill="#8a8a92" stroke={INK} strokeWidth={5} /><circle cx={k} cy={-50} r={20} fill="#e8a8a8" /></g>)}
				<ellipse cx={0} cy={0} rx={62} ry={56} fill="#8a8a92" stroke={INK} strokeWidth={6} />
				<path d="M -26 28 L 0 60 L 26 28 Z" fill="#8a8a92" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<circle cx={0} cy={58} r={9} fill="#e07a94" stroke={INK} strokeWidth={3} />
				{[-1, 1].map((k) => <path key={k} d={`M ${k * 14} 46 L ${k * 70} 38 M ${k * 14} 50 L ${k * 70} 58`} stroke={INK} strokeWidth={2} />)}
				{[-22, 22].map((k) => humeur === 'content' || humeur === 'fier' ? <path key={k} d={`M ${k - 10} -6 Q ${k} -18 ${k + 10} -6`} stroke={INK} strokeWidth={5} fill="none" /> : <g key={k}><circle cx={k} cy={-6} r={humeur === 'peur' ? 13 : 10} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={k} cy={-4} r={humeur === 'peur' ? 4 : 6} fill={INK} /></g>)}
			</g>
		</g>
	);
};
const Chat: React.FC<{x: number; y: number; s?: number; f: number; c?: string; ph?: number; menace?: boolean; flip?: boolean}> = ({x, y, s = 1, f, c = '#e8913a', ph = 0, menace, flip}) => (
	<g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
		<path d={`M 60 -20 Q 150 -40 ${130 + Math.sin(f * 0.1 + ph) * 20} -150`} stroke={INK} strokeWidth={30} fill="none" strokeLinecap="round" />
		<path d={`M 60 -20 Q 150 -40 ${130 + Math.sin(f * 0.1 + ph) * 20} -150`} stroke={c} strokeWidth={18} fill="none" strokeLinecap="round" />
		<ellipse cx={0} cy={-80} rx={80} ry={90} fill={c} stroke={INK} strokeWidth={6} />
		<g transform="translate(0 -200)">
			<path d="M -64 -20 L -56 -96 L -10 -50 Z M 64 -20 L 56 -96 L 10 -50 Z" fill={c} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
			<ellipse rx={74} ry={64} fill={c} stroke={INK} strokeWidth={6} />
			{[-28, 28].map((k) => <g key={k}><ellipse cx={k} cy={-8} rx={16} ry={18} fill="#d8f04a" stroke={INK} strokeWidth={4} /><ellipse cx={k} cy={-8} rx={menace ? 3 : 6} ry={15} fill={INK} /></g>)}
			{menace && <path d="M -46 -36 L -12 -24 M 46 -36 L 12 -24" stroke={INK} strokeWidth={6} />}
			<path d="M -8 16 L 8 16 L 0 26 Z" fill="#e07a94" />
			<path d={menace ? 'M -24 36 Q 0 28 24 36' : 'M -16 34 Q -8 40 0 32 Q 8 40 16 34'} stroke={INK} strokeWidth={4} fill="none" />
			{[-1, 1].map((k) => <path key={k} d={`M ${k * 20} 24 L ${k * 80} 16 M ${k * 20} 30 L ${k * 80} 36`} stroke={INK} strokeWidth={2} />)}
		</g>
	</g>
);
const Eglise: React.FC = () => (
	<>
		<rect x={-1500} y={-1500} width={4080} height={5000} fill="#cfc2a8" />
		{[0, 1, 2].map((i) => <g key={i}><path d={`M ${120 + i * 340} 1100 L ${120 + i * 340} 520 Q ${220 + i * 340} 360 ${320 + i * 340} 520 L ${320 + i * 340} 1100 Z`} fill="#9fd3f0" stroke={INK} strokeWidth={7} /><path d={`M ${220 + i * 340} 400 L ${220 + i * 340} 1100 M ${120 + i * 340} 760 L ${320 + i * 340} 760`} stroke="#6a5a3a" strokeWidth={8} /></g>)}
		<rect x={-800} y={1450} width={2680} height={1300} fill="#8a6a4a" stroke={INK} strokeWidth={6} />
	</>
);
const Chaire: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g transform={`translate(${x} ${y})`}><path d="M -150 0 L -120 -260 L 120 -260 L 150 0 Z" fill="#7a4a2a" stroke={INK} strokeWidth={7} /><rect x={-170} y={-290} width={340} height={40} rx={10} fill="#5a3820" stroke={INK} strokeWidth={6} /><path d="M 0 -220 L 0 -60 M -50 -170 L 50 -170" stroke="#ffd23f" strokeWidth={14} /></g>
);
const Orge: React.FC<{x: number; y: number; f: number; k?: number; s?: number}> = ({x, y, f, k = 1, s = 1}) => k <= 0 ? null : (
	<g transform={`translate(${x} ${y}) scale(${s} ${s * k})`}>
		<path d={`M 0 0 Q ${Math.sin(f * 0.05 + x) * 10} -100 ${Math.sin(f * 0.05 + x) * 18} -200`} stroke="#c9a227" strokeWidth={6} fill="none" />
		{Array.from({length: 6}).map((_, i) => <ellipse key={i} cx={Math.sin(f * 0.05 + x) * 18 + (i % 2 ? 9 : -9)} cy={-200 + i * 14} rx={8} ry={12} fill="#e8c24a" stroke={INK} strokeWidth={2} />)}
	</g>
);
const Juges = ({f, humeur = 'neutre', regard = 0, pose = 'debout'}: {f: number; humeur?: any; regard?: number; pose?: any}) => (
	<>{[0, 1, 2].map((i) => <Humain key={i} x={260 + i * 280} y={1380} s={0.85} f={f} {...JUGE} cheveux={['#9a9a9a', '#e0e0e0', '#6a4426'][i]} humeur={humeur} pose={pose} ph={i} flip={regard ? (i === 0 ? false : i === 2) : false} />)}</>
);
const Banc: React.FC<{vide?: boolean; f: number; t: number}> = ({vide, f}) => (
	<g><rect x={300} y={1600} width={480} height={180} rx={10} fill="#6b4226" stroke={INK} strokeWidth={8} />{txt(540, 1720, 'ACCUSÉS', 60, '#ffd23f')}</g>
);

/* ---------- les plans ---------- */
export const R01: React.FC = () => (
	<Plan debut={0} fin={4.52} sansEntree cam={(t) => ({z: lin(t, [0, 4.52], [1.15, 1.0], ease), y: -60})}>
		{(t, f) => (<>
			<Tribunal />
			{[0, 1, 2, 3, 4].map((i) => <RatDebout key={i} x={140 + i * 200} y={1830} s={1.0} f={f * 1.4} humeur="content" bras ph={i} />)}
			{Array.from({length: 14}).map((_, i) => <rect key={i} x={100 + rnd(i) * 880} y={500 + ((f * (4 + rnd(i + 3) * 4) + rnd(i + 6) * 900) % 1200)} width={24} height={14} fill={['#ffd23f', '#ff4b2b', '#7be07b', '#2f6fb0'][i % 4]} transform={`rotate(${f * 6 + i * 30} ${100 + rnd(i) * 880} 900)`} />)}
			{T0(t, 'DES RATS ONT GAGNÉ', 100)}
			{T(t, 1.6, 'UN PROCÈS', 140, '#fff', 560)}
		</>)}
	</Plan>
);

export const R02: React.FC = () => (
	<Plan debut={4.52} fin={7.02} cam={(t) => ({z: lin(t, [4.52, 7.02], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Tribunal />
			<Juges f={f} humeur="perplexe" pose="main" />
			{Tampon(t, 5.6, 'ACCEPTÉ', '#3c8a4a', 1650, -8)}
			{T(t, 4.6, 'LES JUGES ONT DIT OUI', 92)}
		</>)}
	</Plan>
);

export const R03: React.FC = () => (
	<Plan debut={7.02} fin={9.21} cam={(t) => ({z: lin(t, [7.02, 9.21], [1.0, 1.12], ease), y: -150})}>
		{(t, f) => (<>
			<Ville id="r3" f={f} />
			{T(t, 7.1, 'BOURGOGNE', 130)}
			{T(t, 8.0, 'VERS 1500', 110, '#fff', 560)}
		</>)}
	</Plan>
);

export const R04: React.FC = () => (
	<Plan debut={9.21} fin={11.46} cam={(t) => ({z: lin(t, [9.21, 11.46], [1.0, 1.25], ease), y: -200})}>
		{(t, f) => {
			const mange = lin(t, [9.5, 11.3], [0, 1]);
			return (<>
				<Ciel id="r4" /><Soleil x={880} y={300} f={f} />
				<rect x={-900} y={1350} width={2900} height={1500} fill="#a08a50" stroke={INK} strokeWidth={6} />
				{Array.from({length: 40}).map((_, i) => <Orge key={i} x={-40 + (i % 10) * 120 + (Math.floor(i / 10) % 2) * 60} y={1400 + Math.floor(i / 10) * 110} f={f} k={rnd(i) > mange ? 1 : 0} s={1.3} />)}
				{Array.from({length: 10}).map((_, i) => <Rat key={i} x={-100 + ((f * 8 + i * 160) % 1300)} y={1480 + (i % 4) * 110} s={0.8} f={f} ph={i} />)}
				{T(t, 9.3, "ILS MANGENT TOUTE L'ORGE", 92)}
			</>);
		}}
	</Plan>
);

export const R05: React.FC = () => (
	<Plan debut={11.46} fin={13.86} cam={(t) => ({z: lin(t, [11.46, 13.86], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Fond c="#f6dada" />
			{GENS.slice(0, 3).map((g, i) => <Humain key={i} x={220 + i * 320} y={1750} s={1.0} f={f * 1.3} {...g} pose={i === 1 ? 'crie' : 'main'} humeur="fache" ph={i} />)}
			<Parchemin x={540} y={950} s={pop(t, 11.8) * 0.55} r={-4}>
				<text x={0} y={-150} textAnchor="middle" fontFamily={FONT} fontSize={90} fill="#8a1e1e">PLAINTE</text>
				<text x={0} y={0} textAnchor="middle" fontFamily={FONT} fontSize={70} fill="#5a3a1a">CONTRE :</text>
				<text x={0} y={150} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#8a1e1e" opacity={t > 12.9 ? 1 : 0}>LES RATS</text>
			</Parchemin>
		</>)}
	</Plan>
);

export const R06: React.FC = () => (
	<Plan debut={13.86} fin={15.57} cam={(t) => ({z: lin(t, [13.86, 15.57], [1.3, 1.5], ease), y: -300})}>
		{(t, f) => (<>
			<Fond c="#e4dcf2" />
			<RatDebout x={540} y={1500} s={1.6} f={f} humeur="peur" />
			{txt(820, 900, '?!', 160, '#ff4b2b', 10)}
			{T(t, 13.9, 'OUI. LES RATS.', 120)}
		</>)}
	</Plan>
);

export const R07: React.FC = () => (
	<Plan debut={15.57} fin={20.34} secousse={(t) => (t > 19.5 && t < 20 ? 26 : 0)} cam={(t) => ({z: lin(t, [15.57, 20.34], [1.0, 1.25], ease), y: -150})}>
		{(t, f) => (<>
			<Eglise />
			<Chaire x={540} y={1400} />
			<Humain x={540} y={1180} s={0.9} f={f} couleur="#f1ead8" chapeau="tiare" cheveux="#e0e0e0" jambesC="#f1ead8" pose={t > 17 ? 'crie' : 'main'} humeur="fache" />
			{t > 17 && [0, 1, 2, 3].map((i) => <RatDebout key={i} x={150 + i * 260} y={1800} s={0.6} f={f} humeur="peur" ph={i} />)}
			{t > 19.5 && <rect x={-1500} y={-1500} width={4080} height={5000} fill="#fff" opacity={lin(t, [19.5, 19.8], [0.8, 0])} />}
			{T(t, 15.7, "C'EST SÉRIEUX", 120)}
			{t > 17.8 && T(t, 17.8, "MAUDITS PAR L'ÉGLISE", 92, '#ff4b2b', 560)}
		</>)}
	</Plan>
);

export const R08: React.FC = () => (
	<Plan debut={20.34} fin={24.98} cam={(t) => ({z: lin(t, [20.34, 22.0, 24.98], [1.0, 1.0, 1.3], ease), y: lin(t, [22, 24.98], [-150, -330], ease)})}>
		{(t, f) => (<>
			<Ville id="r8" f={f} />
			{Array.from({length: 6}).map((_, i) => t > 21.7 + i * 0.25 ? <g key={i} transform={`translate(${110 + i * 170} ${1290 + (i % 2) * 40}) scale(${pop(t, 21.7 + i * 0.25)})`}><Chat x={0} y={0} s={0.55} f={f} c={['#e8913a', '#6a6a6a', '#2a2a2a', '#f1ead8', '#b86a3a', '#8a8a8a'][i]} ph={i} flip={i % 2 === 1} /></g> : null)}
			{T(t, 20.4, 'RETIENS BIEN CE DÉTAIL', 92)}
			{T(t, 22.0, 'LES CHATS', 150, '#fff', 560)}
		</>)}
	</Plan>
);

export const R09: React.FC = () => (
	<Plan debut={24.98} fin={26.89} cam={(t) => ({z: lin(t, [24.98, 26.89], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#f1e3d0" />
			<Parchemin x={540} y={1150} s={pop(t, 25.0) * 0.8} r={2}>
				<text x={0} y={-200} textAnchor="middle" fontFamily={FONT} fontSize={90} fill="#8a1e1e">CONVOCATION</text>
				<text x={0} y={-40} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#5a3a1a">ACCUSÉS :</text>
				<text x={0} y={110} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#8a1e1e">LES RATS</text>
				<g transform="translate(200 260)"><circle r={60} fill="#c0392b" stroke={INK} strokeWidth={6} /></g>
			</Parchemin>
		</>)}
	</Plan>
);

export const R10: React.FC = () => (
	<Plan debut={26.89} fin={29.71} cam={(t) => ({z: lin(t, [26.89, 29.71], [1.0, 1.2], ease), y: -200})}>
		{(t, f) => (<>
			<Tribunal />
			<Juges f={f} humeur="perplexe" />
			<Banc vide f={f} t={t} />
			<g transform={`translate(${lin(t, [27.5, 29.6], [-150, 1200])} 1840) rotate(${t * 300})`}><circle r={60} fill="none" stroke="#a07a40" strokeWidth={8} /><path d="M -40 -20 Q 0 40 40 -20 M -30 20 Q 0 -30 30 20" stroke="#a07a40" strokeWidth={6} fill="none" /></g>
			{T(t, 27.0, 'JOUR DU PROCÈS', 110)}
			{t > 28.2 && T(t, 28.2, 'PERSONNE.', 140, '#fff', 560)}
		</>)}
	</Plan>
);

export const R11: React.FC = () => (
	<Plan debut={29.71} fin={32.64} secousse={(t) => 14} cam={(t) => ({z: lin(t, [29.71, 32.64], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#2a2a3a" />
			<text x={540} y={1150} textAnchor="middle" fontFamily={FONT} fontSize={420} fill="#ffd23f" stroke={INK} strokeWidth={30} paintOrder="stroke" opacity={pop(t, 30.0)}>?</text>
			{T(t, 29.8, 'LE PLUS FOU…', 130)}
			{T(t, 31.0, "C'EST LA FIN", 130, '#ff4b2b', 560)}
		</>)}
	</Plan>
);

export const R12: React.FC = () => (
	<Plan debut={32.64} fin={37.98} cam={(t) => ({z: lin(t, [32.64, 34.3, 37.98], [1.0, 1.15, 1.25], ease), y: -200})}>
		{(t, f) => (<>
			<Tribunal />
			<Humain x={540} y={1700} s={1.2} f={f} {...AVOCAT} pose={t > 34.3 ? 'salut' : 'debout'} humeur="content" />
			{t > 34.3 && [0, 1, 2, 3].map((i) => <RatDebout key={i} x={[140, 290, 790, 940][i]} y={1800} s={0.55} f={f} humeur="content" bras ph={i} />)}
			{t > 34.3 && [0, 1, 2].map((i) => <path key={i} d="M 0 -30 C -40 -70 -80 -20 0 30 C 80 -20 40 -70 0 -30 Z" transform={`translate(${200 + i * 340} ${1050 - ((t - 34.3) * 120 + i * 60) % 300}) scale(0.8)`} fill="#ff6b81" stroke={INK} strokeWidth={4} />)}
			{T(t, 32.7, 'UN AVOCAT', 130)}
			{t > 34.4 && T(t, 34.4, 'LE MEILLEUR DES RATS', 96, '#fff', 560)}
		</>)}
	</Plan>
);

export const R13: React.FC = () => (
	<Plan debut={37.98} fin={45.59} cam={(t) => ({z: lin(t, [37.98, 40.9, 45.59], [1.0, 1.05, 1.15], ease), y: -150})}>
		{(t, f) => {
			const n = Math.floor(lin(t, [40.9, 44.0], [3, 60]));
			return (<>
				<Fond c="#e8eef0" />
				<rect x={120} y={640} width={840} height={620} rx={20} fill="#f2e3b8" stroke={INK} strokeWidth={8} />
				{txt(540, 720, 'LA RÉGION', 50, '#5a3a1a')}
				{[[300, 900], [620, 820], [800, 1080], [380, 1150]].map(([x, y], i) => <g key={i}><rect x={x - 40} y={y - 40} width={80} height={60} fill="#e0cc98" stroke={INK} strokeWidth={4} /><path d={`M ${x - 50} ${y - 40} L ${x} ${y - 80} L ${x + 50} ${y - 40} Z`} fill="#8a4a2a" stroke={INK} strokeWidth={4} /></g>)}
				{Array.from({length: n}).map((_, i) => <circle key={i} cx={160 + rnd(i) * 760} cy={780 + rnd(i + 30) * 440} r={9} fill="#5a5a62" stroke={INK} strokeWidth={2} />)}
				<Humain x={170} y={1800} s={0.9} f={f} {...AVOCAT} pose="main" humeur="neutre" />
				<Ecran><g transform={`translate(540 230) scale(${pop(t, 38.0)})`}><rect x={-260} y={-55} width={520} height={110} rx={55} fill="#ffd23f" stroke={INK} strokeWidth={7} /><text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontSize={62} fill={INK}>ARGUMENT N°1</text></g></Ecran>
				{t > 40.9 && T(t, 40.9, 'TOUS LES RATS', 120, '#fff', 400)}
				{t > 43.1 && T(t, 43.1, 'DOIVENT ÊTRE PRÉVENUS', 84, '#FFD23F', 560)}
			</>);
		}}
	</Plan>
);

export const R14: React.FC = () => (
	<Plan debut={45.59} fin={47.04} cam={(t) => ({z: lin(t, [45.59, 47.04], [1.1, 1.25], ease), y: -150})}>
		{(t, f) => (<>
			<Tribunal />
			<Juges f={f} humeur="content" pose="salut" />
			{Tampon(t, 45.7, 'OUI', '#3c8a4a', 1650, -6)}
			{T(t, 45.6, 'TU SAIS QUOI ?', 110)}
		</>)}
	</Plan>
);

export const R15: React.FC = () => (
	<Plan debut={47.04} fin={52.95} cam={(t) => ({z: lin(t, [47.04, 49.5, 52.95], [1.0, 1.1, 1.25], ease), y: -200})}>
		{(t, f) => (<>
			<Eglise />
			<Chaire x={260} y={1400} />
			<Humain x={260} y={1180} s={0.85} f={f} couleur="#3a2a2a" chapeau="aucun" cheveux="#9a9a9a" jambesC="#3a2a2a" pose="main" humeur="neutre" />
			{[0, 1].map((r) => <rect key={r} x={480} y={1500 + r * 180} width={560} height={40} fill="#6b4226" stroke={INK} strokeWidth={5} />)}
			{GENS.slice(0, 3).map((g, i) => <Humain key={i} x={560 + i * 170} y={1520} s={0.7} f={f} {...g} humeur={t > 50.5 ? 'choc' : 'neutre'} ph={i} />)}
			{t > 50.8 && [0, 1, 2].map((i) => <g key={i} transform={`translate(${600 + i * 160} ${1720}) scale(${pop(t, 50.8 + i * 0.15)})`}><RatDebout x={0} y={0} s={0.4} f={f} humeur="content" ph={i} /></g>)}
			<Bulle x={660} y={1020} w={560} h={240} k={pop(t, 48.6)} queue={[-300, 60]}><text x={0} y={-10} textAnchor="middle" fontFamily={FONT} fontSize={54} fill={INK}>LES RATS SONT</text><text x={0} y={60} textAnchor="middle" fontFamily={FONT} fontSize={54} fill="#8a1e1e">CONVOQUÉS !</text></Bulle>
			{T(t, 47.1, 'EN PLEINE MESSE', 110)}
		</>)}
	</Plan>
);

export const R16: React.FC = () => (
	<Plan debut={52.95} fin={58.18} cam={(t) => ({z: lin(t, [52.95, 55.89, 58.18], [1.0, 1.05, 1.2], ease), y: -150})}>
		{(t, f) => t < 55.89 ? (<>
			<Fond c="#e4dcf2" />
			<Humain x={540} y={1700} s={1.2} f={f} {...AVOCAT} pose="main" humeur="content" />
			{T(t, 53.0, "ET ÇA…", 130)}
			{T(t, 53.6, "C'ÉTAIT LE PLUS NORMAL", 88, '#fff', 560)}
		</>) : (<>
			<Tribunal />
			<Juges f={f} humeur="fache" />
			<Banc vide f={f} t={t} />
			{T(t, 55.9, '2E AUDIENCE', 120)}
			{t > 57.0 && T(t, 57.0, 'TOUJOURS PERSONNE', 96, '#fff', 560)}
		</>)}
	</Plan>
);

export const R17: React.FC = () => (
	<Plan debut={58.18} fin={60.66} secousse={(t) => (t > 60.3 ? 18 : 0)} cam={(t) => ({z: lin(t, [58.18, 60.66], [1.0, 1.5], Easing.in(Easing.cubic)), y: -350})}>
		{(t, f) => (<>
			<Tribunal />
			<Humain x={540} y={1700} s={1.2} f={f} {...AVOCAT} pose="crie" humeur="crie" />
			<Ecran><g transform={`translate(540 230) scale(${pop(t, 58.3)})`}><rect x={-260} y={-55} width={520} height={110} rx={55} fill="#ff4b2b" stroke={INK} strokeWidth={7} /><text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontSize={62} fill="#fff">ARGUMENT N°2</text></g></Ecran>
			{t > 60.3 && T(t, 60.3, 'ACCROCHE-TOI', 120)}
		</>)}
	</Plan>
);

export const R18: React.FC = () => (
	<Plan debut={60.66} fin={68.43} cam={(t) => ({z: lin(t, [60.66, 66.6, 68.43], [1.0, 1.05, 1.45], ease), x: lin(t, [66.6, 68.43], [0, 180], ease), y: lin(t, [66.6, 68.43], [-150, -280], ease)})}>
		{(t, f) => {
			const avance = lin(t, [63.9, 66.4], [0, 1], ease);
			return (<>
				<Ville id="r18" f={f} />
				{[0, 1, 2, 3].map((i) => <RatDebout key={i} x={lin(avance, [0, 1], [-60, 260]) + i * 70 - 120} y={1700 + (i % 2) * 40} s={0.5} f={f} humeur={t > 67.2 ? 'peur' : 'content'} ph={i} />)}
				{t > 66.5 && [0, 1, 2].map((i) => <g key={i} transform={`translate(${640 + i * 170} ${1650 + (i % 2) * 60}) scale(${pop(t, 66.6 + i * 0.2)})`}><Chat x={0} y={0} s={0.65} f={f} menace c={['#2a2a2a', '#e8913a', '#6a6a6a'][i]} ph={i} flip /></g>)}
				{T(t, 60.8, '« MES CLIENTS VEULENT VENIR »', 70)}
				{t > 63.9 && T(t, 63.9, 'MAIS IL FAUT TRAVERSER…', 84, '#fff', 560)}
				{t > 67.7 && T(t, 67.7, 'LES CHATS', 150, '#ff4b2b', 720)}
			</>);
		}}
	</Plan>
);

export const R19: React.FC = () => (
	<Plan debut={68.43} fin={70.12} cam={(t) => ({z: lin(t, [68.43, 70.12], [1.2, 1.0], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#fff3b0" />
			{Array.from({length: 6}).map((_, i) => <Chat key={i} x={150 + (i % 3) * 390} y={1150 + Math.floor(i / 3) * 520} s={0.7} f={f} c={['#e8913a', '#6a6a6a', '#2a2a2a', '#f1ead8', '#b86a3a', '#8a8a8a'][i]} ph={i} menace flip={i % 2 === 1} />)}
			{T(t, 68.5, 'LE DÉTAIL !', 140)}
		</>)}
	</Plan>
);

export const R20: React.FC = () => (
	<Plan debut={70.12} fin={74.38} cam={(t) => ({z: lin(t, [70.12, 74.38], [1.0, 1.25], ease), y: -200})}>
		{(t, f) => (<>
			<Tribunal />
			<Humain x={330} y={1700} s={1.15} f={f} {...AVOCAT} pose="main" humeur="triste" />
			<g transform="translate(760 1640)"><Chat x={0} y={0} s={0.8} f={f} menace c="#2a2a2a" flip /><g transform="translate(-60 120)"><RatDebout x={0} y={0} s={0.45} f={f} humeur="peur" /></g></g>
			{T(t, 70.2, 'ON NE PEUT PAS LES OBLIGER', 80)}
			{t > 72.7 && T(t, 72.7, 'DANGER DE MORT', 120, '#ff4b2b', 560)}
		</>)}
	</Plan>
);

export const R21: React.FC = () => (
	<Plan debut={74.38} fin={79.0} cam={(t) => ({z: lin(t, [74.38, 77.7, 79.0], [1.0, 1.1, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Tribunal />
			<Juges f={f} humeur={t > 77.7 ? 'content' : 'perplexe'} regard={t < 76.1 ? 1 : 0} pose={t > 77.7 ? 'salut' : 'debout'} />
			{t > 76.1 && t < 77.7 && T(t, 76.1, "ILS FONT L'IMPENSABLE…", 84)}
			{Tampon(t, 77.75, 'ACCEPTÉ', '#3c8a4a', 1650, -8)}
			{t < 76.1 && T(t, 74.4, 'LES JUGES SE REGARDENT', 88)}
		</>)}
	</Plan>
);

export const R22: React.FC = () => (
	<Plan debut={79.0} fin={85.32} cam={(t) => ({z: lin(t, [79, 85.32], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => t < 83.2 ? (<>
			<rect x={-1500} y={-1500} width={4080} height={5000} fill="#5a4a3a" />
			{[0, 1, 2, 3].map((r) => <g key={r}><rect x={60} y={700 + r * 280} width={960} height={26} fill="#3a2a1a" stroke={INK} strokeWidth={5} />{Array.from({length: 9}).map((_, i) => (i + r) % 4 ? <rect key={i} x={90 + i * 100} y={700 + r * 280 - 150} width={70} height={150} rx={6} fill={['#c9a86a', '#a08050', '#e0cc98'][(i + r) % 3]} stroke={INK} strokeWidth={4} /> : null)}</g>)}
			<Parchemin x={540} y={1300} s={pop(t, 80.9) * 0.55} r={-3}><text x={0} y={-60} textAnchor="middle" fontFamily={FONT} fontSize={90} fill="#5a3a1a">JUGEMENT :</text><text x={0} y={120} textAnchor="middle" fontFamily={FONT} fontSize={180} fill="#8a1e1e">???</text></Parchemin>
			{T(t, 79.1, 'LA FIN PROMISE', 120)}
		</>) : (<>
			<Tribunal />
			{[0, 1, 2, 3, 4].map((i) => <RatDebout key={i} x={200 + i * 170} y={1700} s={0.7} f={f * 1.5} humeur="content" bras ph={i} />)}
			{T(t, 83.3, 'JAMAIS CONDAMNÉS', 110, '#7be07b')}
		</>)}
	</Plan>
);

export const R23: React.FC = () => (
	<Plan debut={85.32} fin={89.45} cam={(t) => ({z: lin(t, [85.32, 89.45], [1.0, 1.2], ease), y: -200})}>
		{(t, f) => (<>
			<Fond c="#f6ecd2" />
			<Humain x={540} y={1700} s={1.3} f={f} {...(t > 86.1 ? {...JUGE, cheveux: '#9a9a9a'} : AVOCAT)} pose={t > 86.1 ? 'salut' : 'debout'} humeur="content" />
			{t > 86.1 && <g transform={`translate(540 900) scale(${pop(t, 86.1)})`}><path d="M -110 40 L -90 -60 L -40 0 L 0 -80 L 40 0 L 90 -60 L 110 40 Z" fill="#ffd23f" stroke={INK} strokeWidth={7} /></g>}
			{T(t, 85.4, 'ET LUI ?', 130)}
			{t > 86.6 && T(t, 86.6, 'UN DES PLUS HAUTS JUGES', 88, '#fff', 560)}
		</>)}
	</Plan>
);

export const R24: React.FC = () => (
	<Plan debut={89.45} fin={92.6} cam={(t) => ({z: lin(t, [89.45, 92.6], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Tribunal />
			{[0, 1, 2, 3].map((i) => <RatDebout key={i} x={180 + i * 150} y={1700} s={0.65} f={f} humeur="content" bras ph={i} />)}
			<Chat x={900} y={1700} s={0.7} f={f} menace c="#2a2a2a" flip />
			{T(t, 89.5, 'DES RATS', 130)}
			{T(t, 90.4, 'CONTRE DES CHATS', 110, '#fff', 560)}
		</>)}
	</Plan>
);

export const PLANS_RATS: [number, number, React.FC][] = [
	[0, 4.52, R01], [4.52, 7.02, R02], [7.02, 9.21, R03], [9.21, 11.46, R04], [11.46, 13.86, R05], [13.86, 15.57, R06], [15.57, 20.34, R07],
	[20.34, 24.98, R08], [24.98, 26.89, R09], [26.89, 29.71, R10], [29.71, 32.64, R11], [32.64, 37.98, R12], [37.98, 45.59, R13], [45.59, 47.04, R14],
	[47.04, 52.95, R15], [52.95, 58.18, R16], [58.18, 60.66, R17], [60.66, 68.43, R18], [68.43, 70.12, R19], [70.12, 74.38, R20], [74.38, 79.0, R21],
	[79.0, 85.32, R22], [85.32, 89.45, R23], [89.45, 92.6, R24],
];
