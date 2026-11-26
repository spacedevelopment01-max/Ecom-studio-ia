import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Humain, Bulle} from './dessins';
import {ease, T, txt, Fond} from './commun_moyenage';

const T0 = (t: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => T(t, -1, texte, taille, c, y);
const ROI = {couleur: '#2a4f9a', chapeau: 'aucun' as const, cheveux: '#f1f1f1', jambesC: '#f1ead8', cravate: '#ffd23f'};

const Couronne: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}><path d="M -70 30 L -60 -40 L -25 0 L 0 -55 L 25 0 L 60 -40 L 70 30 Z" fill="#ffd23f" stroke={INK} strokeWidth={6} />{[-35, 0, 35].map((k) => <circle key={k} cx={k} cy={12} r={9} fill="#2a4f9a" />)}</g>
);
const Roi: React.FC<{x: number; y: number; s?: number; f: number; humeur?: any; pose?: any; ventre?: number}> = ({x, y, s = 1, f, humeur = 'content', pose = 'debout', ventre = 0}) => (
	<g>
		<Humain x={x} y={y} s={s} f={f} {...ROI} humeur={humeur} pose={pose} />
		{ventre > 0 && <ellipse cx={x} cy={y - 190 * s} rx={(70 + ventre * 70) * s} ry={(60 + ventre * 40) * s} fill="#2a4f9a" stroke={INK} strokeWidth={6} />}
		{ventre > 0 && [0, 1, 2].map((i) => <circle key={i} cx={x} cy={y - (230 - i * 40) * s} r={7 * s} fill="#ffd23f" stroke={INK} strokeWidth={2} />)}
		<Couronne x={x} y={y - 410 * s} s={s * 0.9} />
	</g>
);
const Salle: React.FC<{f: number}> = ({f}) => (
	<>
		<rect x={-1500} y={-1500} width={4080} height={5000} fill="#7a2a3a" />
		{Array.from({length: 12}).map((_, i) => <rect key={i} x={-300 + i * 160} y={-800} width={14} height={3000} fill="#8a3a4a" />)}
		{[200, 880].map((x, i) => <g key={x}><rect x={x - 110} y={420} width={220} height={280} fill="#c9a227" stroke={INK} strokeWidth={8} /><rect x={x - 90} y={440} width={180} height={240} fill={i ? '#5a7aa0' : '#7a8a5a'} /><circle cx={x} cy={520} r={40} fill="#f5c9a0" /></g>)}
		<g transform={`translate(540 300) rotate(${Math.sin(f * 0.05) * 2})`}><path d="M 0 -300 L 0 0" stroke={INK} strokeWidth={6} /><ellipse cx={0} cy={20} rx={160} ry={40} fill="#c9a227" stroke={INK} strokeWidth={6} />{[-120, -60, 0, 60, 120].map((k) => <g key={k}><rect x={k - 8} y={-30} width={16} height={40} fill="#fff" /><path d={`M ${k} -50 q -10 12 0 20 q 10 -8 0 -20 Z`} fill="#ffb43a" /></g>)}</g>
		<rect x={-800} y={1500} width={2680} height={1300} fill="#5a3a2a" stroke={INK} strokeWidth={6} />
	</>
);
const Table: React.FC = () => (<><rect x={-200} y={1380} width={1480} height={60} fill="#f6efd8" stroke={INK} strokeWidth={8} /><rect x={-200} y={1440} width={1480} height={80} fill="#e8dcc0" stroke={INK} strokeWidth={6} /></>);
const Assiette: React.FC<{x: number; y: number; s?: number; children?: React.ReactNode}> = ({x, y, s = 1, children}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}><ellipse cx={0} cy={0} rx={130} ry={36} fill="#fff" stroke={INK} strokeWidth={6} />{children}</g>
);
const Homard = () => (<g transform="translate(0 -40)"><ellipse rx={90} ry={34} fill="#e04a2a" stroke={INK} strokeWidth={5} />{[-60, -30, 0, 30].map((k) => <path key={k} d={`M ${k} -20 L ${k} 20`} stroke="#a03018" strokeWidth={4} />)}<path d="M 80 -10 Q 140 -60 130 -10 Q 110 0 80 0 Z M 80 10 Q 140 50 130 10 Z" fill="#e04a2a" stroke={INK} strokeWidth={5} /><circle cx={70} cy={-18} r={5} fill={INK} /></g>);
const Caviar = () => (<g transform="translate(0 -30)"><ellipse rx={80} ry={30} fill="#c9c9c9" stroke={INK} strokeWidth={5} /><ellipse rx={66} ry={22} fill="#1a1a1a" />{Array.from({length: 14}).map((_, i) => <circle key={i} cx={-50 + (i % 7) * 16} cy={-8 + Math.floor(i / 7) * 14} r={4} fill="#555" />)}</g>);
const Choucroute = () => (<g transform="translate(0 -40)">{Array.from({length: 18}).map((_, i) => <path key={i} d={`M ${-80 + i * 9} 20 Q ${-60 + i * 9} -40 ${-70 + i * 9} -60`} stroke="#f2e08a" strokeWidth={6} fill="none" />)}<rect x={-70} y={-30} width={140} height={30} rx={15} fill="#c0573a" stroke={INK} strokeWidth={5} transform="rotate(-10)" /></g>);
const Canard = () => (<g transform="translate(0 -50)"><ellipse rx={95} ry={55} fill="#b8682a" stroke={INK} strokeWidth={5} /><path d="M 60 -20 L 120 -60 L 130 -40 L 80 0 Z" fill="#b8682a" stroke={INK} strokeWidth={5} /><ellipse cx={-30} cy={-20} rx={30} ry={14} fill="#d88a4a" /></g>);
const Champagne: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}><path d="M -40 0 L -40 -200 Q -40 -240 -14 -260 L -14 -330 L 14 -330 L 14 -260 Q 40 -240 40 -200 L 40 0 Z" fill="#2a5a2a" stroke={INK} strokeWidth={6} /><rect x={-16} y={-350} width={32} height={30} fill="#ffd23f" stroke={INK} strokeWidth={4} /><rect x={-40} y={-150} width={80} height={60} fill="#f6efd8" stroke={INK} strokeWidth={4} /></g>
);
const Brioche: React.FC<{x: number; y: number; s?: number; bol?: boolean}> = ({x, y, s = 1, bol = true}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{bol && <><path d="M -150 -40 Q -150 80 0 90 Q 150 80 150 -40 Z" fill="#7ab0e0" stroke={INK} strokeWidth={7} /><ellipse cx={0} cy={-40} rx={150} ry={34} fill="#fbf6ea" stroke={INK} strokeWidth={6} /></>}
		<path d="M -100 -40 Q -110 -100 -60 -120 L 60 -120 Q 110 -100 100 -40 Z" fill="#d8954a" stroke={INK} strokeWidth={6} />
		{Array.from({length: 7}).map((_, i) => <circle key={i} cx={-70 + i * 23} cy={-135 - (i % 2) * 12} r={26} fill="#fff" stroke={INK} strokeWidth={4} />)}
		<path d="M -90 -150 Q -80 -200 -20 -205 L 60 -200 Q 100 -190 90 -150 Q 0 -165 -90 -150 Z" fill="#e0a560" stroke={INK} strokeWidth={6} />
		{Array.from({length: 12}).map((_, i) => <circle key={'s' + i} cx={-70 + rnd(i) * 150} cy={-195 + rnd(i + 3) * 30} r={3} fill="#fff" />)}
	</g>
);

export const S01: React.FC = () => (
	<Plan debut={0} fin={3.2} sansEntree cam={(t) => ({z: lin(t, [0, 3.2], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Salle f={f} />
			<Roi x={540} y={1460} s={1.3} f={f} humeur="content" ventre={0.8} />
			<Table />
			{Array.from({length: 4}).map((_, i) => <Brioche key={i} x={150 + i * 260} y={1370} s={0.6} />)}
			{T0(t, 'MORT PAR LE DESSERT', 96)}
		</>)}
	</Plan>
);
export const S02: React.FC = () => (
	<Plan debut={3.2} fin={6.25} cam={(t) => ({z: lin(t, [3.2, 6.25], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#f6ecd2" />
			<g transform={`translate(540 1100) scale(${pop(t, 3.3)}) rotate(-3)`}><rect x={-320} y={-420} width={640} height={840} rx={20} fill="#fffaf0" stroke={INK} strokeWidth={10} />{txt(0, -320, 'MENU', 90, '#8a1e1e')}{['HOMARD', 'CAVIAR', 'CHOUCROUTE', 'CANARD', 'CHAMPAGNE', 'DESSERT…'].map((m, i) => <text key={m} x={0} y={-200 + i * 100} textAnchor="middle" fontFamily={FONT} fontSize={58} fill={i === 5 ? '#c0392b' : '#5a3a1a'} opacity={t > 3.6 + i * 0.3 ? 1 : 0}>{m}</text>)}</g>
			{T(t, 3.25, 'UN MENU COMPLÈTEMENT FOU', 76)}
		</>)}
	</Plan>
);
export const S03: React.FC = () => (
	<Plan debut={6.25} fin={8.64} secousse={(t) => (t > 7.6 && t < 8 ? 18 : 0)} cam={(t) => ({z: lin(t, [6.25, 8.64], [1.0, 1.2], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#2a2a3a" />
			{t > 7.58 && <text x={540} y={1250} textAnchor="middle" fontFamily={FONT} fontSize={520} fill="#ffd23f" stroke={INK} strokeWidth={30} paintOrder="stroke" opacity={pop(t, 7.58)}>14</text>}
			{T(t, 6.3, 'RETIENS BIEN CE CHIFFRE', 90)}
		</>)}
	</Plan>
);
export const S04: React.FC = () => (
	<Plan debut={8.64} fin={14.38} cam={(t) => ({z: lin(t, [8.64, 14.38], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Salle f={f} />
			<Roi x={540} y={1460} s={1.3} f={f} humeur="content" ventre={0.3} pose={t > 10.4 ? 'main' : 'debout'} />
			<Table />
			<g transform="translate(160 900)"><rect x={-90} y={-60} width={180} height={120} fill="#2a5aa8" stroke={INK} strokeWidth={6} /><rect x={-40} y={-60} width={30} height={120} fill="#ffd23f" /><rect x={-90} y={-15} width={180} height={30} fill="#ffd23f" /></g>
			{T(t, 8.7, 'SUÈDE, 1771', 130)}
			{t > 10.4 && T(t, 10.4, 'LE ROI ADOLPHE-FRÉDÉRIC', 76, '#fff', 560)}
			{t > 12.24 && <Ecran>{txt(540, 1250, 'VEILLE DU CARÊME', 80, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);
export const S05: React.FC = () => (
	<Plan debut={14.38} fin={20.75} cam={(t) => ({z: lin(t, [14.38, 20.75], [1.0, 1.25], ease), y: -250})}>
		{(t, f) => {
			const P: [number, React.ReactNode, string][] = [[16.33, <Homard />, 'HOMARD'], [17.09, <Caviar />, 'CAVIAR'], [17.87, <Choucroute />, 'CHOUCROUTE'], [18.67, <Canard />, 'CANARD']];
			return (<>
				<Salle f={f} />
				<Roi x={540} y={1460} s={1.2} f={f} humeur={t > 19.3 ? 'pouffe' : 'content'} ventre={lin(t, [16.3, 20.5], [0.3, 1.0])} />
				<Table />
				{P.map(([a, c, n], i) => t > a ? <g key={i} transform={`translate(${130 + i * 270} 1360) scale(${pop(t, a) * 0.95})`}><Assiette x={0} y={0}>{c}</Assiette></g> : null)}
				{t > 19.27 && <g transform={`scale(${pop(t, 19.27)})`} style={{transformOrigin: '900px 1380px'}}><Champagne x={960} y={1380} s={0.8} /></g>}
				{T(t, 14.4, 'REGARDE CE QU\'IL COMMANDE', 66)}
				{(() => { const cur = [...P].reverse().find(([a]) => t > a); return t > 19.27 ? T(t, 19.27, 'CHAMPAGNE !', 120, '#fff', 560) : cur ? <Ecran>{txt(540, 560, cur[2], 110, '#fff')}</Ecran> : null; })()}
			</>);
		}}
	</Plan>
);
export const S06: React.FC = () => (
	<Plan debut={20.75} fin={23.82} cam={(t) => ({z: lin(t, [20.75, 22.4, 23.82], [1.0, 1.0, 1.3], ease), y: -200})}>
		{(t, f) => (<>
			<Salle f={f} />
			<Roi x={540} y={1460} s={1.2} f={f} humeur={t > 22.4 ? 'content' : 'choc'} ventre={1.0} />
			<Table />
			{t > 22.4 && <g transform={`translate(540 1370) scale(${pop(t, 22.4)})`}><path d="M -220 0 L 220 0 L 200 -40 L -200 -40 Z" fill="#c9a227" stroke={INK} strokeWidth={6} /><path d="M -200 -40 Q 0 -300 200 -40 Z" fill="#e8e8f0" stroke={INK} strokeWidth={6} opacity={lin(t, [22.4, 23.2], [1, 0])} /></g>}
			{T(t, 20.8, "TU CROIS QUE C'EST FINI ?", 84)}
			{t > 21.76 && T(t, 21.76, 'NON.', 160, '#ff4b2b', 560)}
		</>)}
	</Plan>
);
export const S07: React.FC = () => (
	<Plan debut={23.82} fin={28.89} cam={(t) => ({z: lin(t, [23.82, 26.7, 28.89], [1.2, 1.0, 1.05], ease), y: -100})}>
		{(t, f) => {
			const n = t < 26.71 ? 1 : t < 27.86 ? 2 : 3;
			return (<>
				<Fond c="#fbe7c6" />
				{Array.from({length: n}).map((_, i) => <g key={i} transform={`translate(${n === 1 ? 540 : 250 + i * 290} ${1250}) scale(${pop(t, i === 0 ? 23.85 : i === 1 ? 26.71 : 27.86) * (n === 1 ? 1.6 : 0.9)})`}><Brioche x={0} y={0} /></g>)}
				{T(t, 23.85, 'BRIOCHE À LA CRÈME', 96)}
				{t > 25.05 && T(t, 25.05, 'DANS DU LAIT CHAUD', 96, '#fff', 560)}
				{t > 26.71 && <Ecran>{txt(540, 1650, n === 2 ? 'UNE 2E…' : 'UNE 3E…', 110, '#FFD23F')}</Ecran>}
			</>);
		}}
	</Plan>
);
export const S08: React.FC = () => (
	<Plan debut={28.89} fin={32.73} cam={(t) => ({z: lin(t, [28.89, 32.73], [1.0, 1.15], ease), y: -100})}>
		{(t, f) => {
			const n = Math.min(14, Math.max(3, Math.floor(lin(t, [29.5, 31.9], [3, 14.99]))));
			return (<>
				<Salle f={f} />
				<Roi x={540} y={1460} s={1.2} f={f} humeur="pouffe" ventre={lin(t, [29.5, 31.9], [1.0, 1.9])} />
				<Table />
				{Array.from({length: n}).map((_, i) => <g key={i} transform={`translate(${80 + (i % 7) * 155} ${1370 - Math.floor(i / 7) * 120}) scale(0.4)`}><Brioche x={0} y={0} bol={false} /></g>)}
				<Ecran><g transform="translate(540 1220)"><circle r={130} fill="#c0392b" stroke={INK} strokeWidth={10} /><text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={130} fill="#fff">{n}</text></g></Ecran>
				{T(t, 28.9, 'TU TE SOUVIENS DU CHIFFRE ?', 70)}
				{t > 30.1 && T(t, 30.1, "D'APRÈS LA LÉGENDE", 90, '#fff', 560)}
			</>);
		}}
	</Plan>
);
export const S09: React.FC = () => (
	<Plan debut={32.73} fin={36.26} secousse={(t) => (t > 34.1 && t < 34.5 ? 24 : 0)} cam={(t) => ({z: lin(t, [32.73, 36.26], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => {
			const chute = lin(t, [34.1, 34.6], [0, 1], Easing.in(Easing.quad));
			return (<>
				<rect x={-1500} y={-1500} width={4080} height={5000} fill="#2a2a3a" />
				<rect x={-800} y={1600} width={2680} height={1300} fill="#3a2a2a" stroke={INK} strokeWidth={6} />
				<g transform={`rotate(${chute * 80} 380 1700)`}><Roi x={380} y={1700} s={1.2} f={f} humeur={t > 34.1 ? 'choc' : 'triste'} ventre={1.9} /></g>
				{T(t, 32.8, 'QUELQUES HEURES PLUS TARD…', 72)}
				{t > 35.05 && T(t, 35.05, 'MORT DANS LA NUIT', 100, '#ff4b2b', 560)}
			</>);
		}}
	</Plan>
);
export const S10: React.FC = () => (
	<Plan debut={36.26} fin={39.76} cam={(t) => ({z: lin(t, [36.26, 39.76], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#e8eef0" />
			<g transform="translate(540 1100)"><rect x={-300} y={-400} width={600} height={800} rx={10} fill="#c9a227" stroke={INK} strokeWidth={10} /><rect x={-260} y={-360} width={520} height={720} fill="#f6ecd2" /><g transform="translate(0 330)"><Roi x={0} y={0} s={1.0} f={f} humeur="content" ventre={1.6} /></g></g>
			<Ecran><g transform="translate(540 1640)"><rect x={-430} y={-60} width={860} height={120} rx={20} fill="#2a4f9a" stroke={INK} strokeWidth={7} />{txt(0, 22, "LE ROI QUI S'EST MANGÉ À MORT", 50, '#ffd23f')}</g></Ecran>
			{T(t, 36.3, 'EN SUÈDE, ON LE SURNOMME…', 76)}
		</>)}
	</Plan>
);
export const S11: React.FC = () => (
	<Plan debut={39.76} fin={45.2} cam={(t) => ({z: lin(t, [39.76, 45.2], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Fond c="#fbe7c6" />
			<g transform="translate(540 1150)"><rect x={-420} y={-300} width={840} height={600} fill="#bfe3f2" stroke={INK} strokeWidth={10} /><rect x={-460} y={-380} width={920} height={100} fill="#c0392b" stroke={INK} strokeWidth={8} />{txt(0, -310, 'BOULANGERIE', 60, '#fff')}<rect x={-420} y={150} width={840} height={30} fill="#8a6a4a" />{Array.from({length: 8}).map((_, i) => <g key={i} transform={`translate(${-330 + (i % 4) * 220} ${i < 4 ? 20 : 150}) scale(0.55)`}><Brioche x={0} y={0} bol={false} /></g>)}</g>
			{T(t, 39.8, 'ET LA BRIOCHE ?', 120)}
			{t > 40.67 && T(t, 40.67, 'TOUJOURS VENDUE', 110, '#fff', 560)}
			{t > 42.38 && <Ecran>{txt(540, 1600, 'CHAQUE ANNÉE. LE MÊME JOUR.', 66, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);
export const PLANS_SEMLA: [number, number, React.FC][] = [
	[0, 3.2, S01], [3.2, 6.25, S02], [6.25, 8.64, S03], [8.64, 14.38, S04], [14.38, 20.75, S05], [20.75, 23.82, S06], [23.82, 28.89, S07],
	[28.89, 32.73, S08], [32.73, 36.26, S09], [36.26, 39.76, S10], [39.76, 45.2, S11],
];
