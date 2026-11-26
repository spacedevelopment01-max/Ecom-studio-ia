import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Bulle} from './dessins';
import {ease, T, txt, Fond} from './commun_moyenage';

const T0 = (t: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => T(t, -1, texte, taille, c, y);
const OR = '#e0a040', OR_F = '#b8782a', CRIN = '#8a4a1a';
const Puce = (t: number, a: number, s: string) => <Ecran><g transform="translate(540 230)" opacity={pop(t, a)}><rect x={-330} y={-48} width={660} height={96} rx={48} fill="#fff" stroke={INK} strokeWidth={6} /><text x={0} y={18} textAnchor="middle" fontFamily={FONT} fontSize={54} fill={INK}>{s}</text></g></Ecran>;

/* ---------- décor ---------- */
const Acacia: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}><path d="M -14 0 L -10 -220 Q -60 -260 -120 -270 M 10 -220 Q 60 -260 120 -270 M -10 -220 L 14 0" stroke="#6b4226" strokeWidth={22} fill="none" strokeLinecap="round" /><ellipse cx={0} cy={-290} rx={210} ry={50} fill="#7a9a3a" stroke={INK} strokeWidth={6} /></g>
);
const Savane: React.FC<{id: string; f: number; sol?: number}> = ({id, f, sol = 1450}) => (
	<>
		<Ciel id={id} haut="#f6b26b" bas="#fde4b8" /><Soleil x={860} y={320} f={f} r={120} c="#ffd84a" /><Nuage x={220} y={360} />
		<Acacia x={140} y={sol - 30} s={0.8} /><Acacia x={950} y={sol - 50} s={1.0} />
		<path d={`M -900 ${sol - 30} Q 0 ${sol - 80} 540 ${sol - 40} T 2000 ${sol - 30} L 2000 3000 L -900 3000 Z`} fill="#d8b860" stroke={INK} strokeWidth={6} />
		{Array.from({length: 26}).map((_, i) => <path key={i} d={`M ${-40 + i * 45} ${sol + 40 + (i % 3) * 60} l 8 -40 l 8 40`} stroke="#b89840" strokeWidth={5} fill="none" />)}
	</>
);

/* ---------- les animaux ---------- */
type HL = 'neutre' | 'fier' | 'coquin' | 'choc' | 'gene' | 'blase';
const Lion: React.FC<{x: number; y: number; s?: number; f: number; humeur?: HL; couronne?: number; femelle?: boolean; flip?: boolean; ph?: number; pilule?: boolean}> = ({x, y, s = 1, f, humeur = 'neutre', couronne = 0, femelle, flip, ph = 0, pilule}) => {
	const b = Math.sin(f * 0.09 + ph) * 4;
	return (
		<g transform={`translate(${x} ${y + b}) scale(${flip ? -s : s} ${s})`}>
			<path d={`M 120 -120 Q 220 -140 ${230 + Math.sin(f * 0.1 + ph) * 15} -220`} stroke={INK} strokeWidth={22} fill="none" strokeLinecap="round" /><path d={`M 120 -120 Q 220 -140 ${230 + Math.sin(f * 0.1 + ph) * 15} -220`} stroke={OR} strokeWidth={12} fill="none" strokeLinecap="round" />
			<circle cx={230 + Math.sin(f * 0.1 + ph) * 15} cy={-225} r={22} fill={CRIN} stroke={INK} strokeWidth={4} />
			{[-110, -50, 60, 120].map((k) => <rect key={k} x={k - 22} y={-110} width={44} height={110} rx={14} fill={OR_F} stroke={INK} strokeWidth={5} />)}
			<ellipse cx={0} cy={-150} rx={170} ry={90} fill={OR} stroke={INK} strokeWidth={7} />
			<g transform="translate(-150 -230)">
				{!femelle && Array.from({length: 14}).map((_, i) => <circle key={i} cx={Math.cos(i * 0.45) * 100} cy={Math.sin(i * 0.45) * 100} r={52} fill={CRIN} stroke={INK} strokeWidth={5} />)}
				<circle cx={-56} cy={-66} r={26} fill={OR} stroke={INK} strokeWidth={5} /><circle cx={56} cy={-66} r={26} fill={OR} stroke={INK} strokeWidth={5} />
				<circle r={86} fill={OR} stroke={INK} strokeWidth={6} />
				<ellipse cx={0} cy={34} rx={46} ry={34} fill="#f6dca8" />
				<path d="M -14 14 L 14 14 L 0 30 Z" fill="#5a2a1a" />
				{[-32, 32].map((k) => humeur === 'fier' || humeur === 'coquin' ? <path key={k} d={`M ${k - 14} -12 Q ${k} -26 ${k + 14} -12`} stroke={INK} strokeWidth={6} fill="none" /> : humeur === 'blase' ? <g key={k}><ellipse cx={k} cy={-12} rx={14} ry={8} fill="#fff" stroke={INK} strokeWidth={3} /><path d={`M ${k - 14} -14 L ${k + 14} -14`} stroke={INK} strokeWidth={5} /></g> : <g key={k}><ellipse cx={k} cy={-14} rx={humeur === 'choc' ? 16 : 12} ry={humeur === 'choc' ? 18 : 14} fill="#fff" stroke={INK} strokeWidth={4} /><circle cx={k} cy={-12} r={7} fill={INK} /></g>)}
				{humeur === 'coquin' && <path d="M -30 -40 L -6 -30 M 30 -40 L 6 -30" stroke={INK} strokeWidth={5} />}
				<path d={humeur === 'fier' || humeur === 'coquin' ? 'M -26 48 Q 0 68 26 48' : humeur === 'choc' ? 'M -16 46 Q 0 70 16 46 Z' : humeur === 'gene' ? 'M -22 54 Q 0 44 22 54' : 'M -18 52 L 18 52'} stroke={INK} strokeWidth={5} fill={humeur === 'choc' ? '#5a1a1a' : 'none'} />
				{humeur === 'gene' && <><ellipse cx={-50} cy={22} rx={16} ry={9} fill="#ff8a8a" opacity={0.7} /><ellipse cx={50} cy={22} rx={16} ry={9} fill="#ff8a8a" opacity={0.7} /></>}
				{pilule && <g transform="translate(30 70) rotate(-20)"><rect x={-34} y={-16} width={68} height={32} rx={16} fill="#3a7ae0" stroke={INK} strokeWidth={4} /></g>}
				{couronne > 0 && <g transform={`translate(${couronne < 1 ? (1 - couronne) * 120 : 0} ${-150 + (couronne < 1 ? (1 - couronne) * 400 : 0)}) rotate(${couronne < 1 ? (1 - couronne) * 60 : 0})`}><path d="M -70 30 L -60 -40 L -25 0 L 0 -55 L 25 0 L 60 -40 L 70 30 Z" fill="#ffd23f" stroke={INK} strokeWidth={6} />{[-35, 0, 35].map((k) => <circle key={k} cx={k} cy={12} r={9} fill="#e23b2b" />)}</g>}
			</g>
		</g>
	);
};
const Zebre: React.FC<{x: number; y: number; s?: number; f: number; ph?: number}> = ({x, y, s = 1, f, ph = 0}) => (
	<g transform={`translate(${x} ${y + Math.sin(f * 0.1 + ph) * 3}) scale(${s})`}>
		<g transform="translate(0 -60)"><ellipse rx={70} ry={80} fill="#fff" stroke={INK} strokeWidth={6} />{[-40, -10, 20, 50].map((k) => <path key={k} d={`M -70 ${k} Q 0 ${k - 20} 70 ${k}`} stroke={INK} strokeWidth={10} fill="none" />)}<circle cx={-24} cy={-30} r={10} fill={INK} /><circle cx={24} cy={-30} r={10} fill={INK} /><ellipse cx={0} cy={40} rx={34} ry={24} fill="#444" /><path d="M -40 -80 L -30 -120 L -14 -78 M 40 -80 L 30 -120 L 14 -78" fill="#fff" stroke={INK} strokeWidth={5} /></g>
	</g>
);
const Case: React.FC<{x: number; y: number; s?: number; ferme: number; f: number; ph?: number}> = ({x, y, s = 1, ferme, f, ph = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-170} y={-260} width={340} height={260} fill="#c89a5e" stroke={INK} strokeWidth={7} />
		<path d="M -210 -250 L 0 -400 L 210 -250 Z" fill="#a8823a" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
		<rect x={-100} y={-210} width={200} height={150} fill="#3a2a1a" stroke={INK} strokeWidth={6} />
		{ferme < 0.95 && <g transform="translate(0 -130)"><Zebre x={0} y={60} s={0.75} f={f} ph={ph} /></g>}
		<rect x={-100} y={-210} width={100 * ferme} height={150} fill="#7a4a2a" stroke={INK} strokeWidth={5} />
		<rect x={100 - 100 * ferme} y={-210} width={100 * ferme} height={150} fill="#7a4a2a" stroke={INK} strokeWidth={5} />
		{ferme > 0.95 && txt(0, -110, 'FERMÉ', 40, '#ffd23f')}
	</g>
);
const Gazelle: React.FC<{x: number; y: number; s?: number; f: number; ph?: number}> = ({x, y, s = 1, f, ph = 0}) => {
	const p = f * 0.7 + ph;
	return (
		<g transform={`translate(${x} ${y - Math.abs(Math.sin(p)) * 30}) scale(${-s} ${s})`}>
			{[-50, 50].map((k, i) => <path key={k} d={`M ${k} -90 L ${k + Math.sin(p + i * 2) * 40} -10`} stroke={INK} strokeWidth={12} strokeLinecap="round" />)}
			<ellipse cx={0} cy={-120} rx={90} ry={45} fill="#d8945a" stroke={INK} strokeWidth={5} />
			<path d="M -70 -150 L -110 -230" stroke={INK} strokeWidth={22} strokeLinecap="round" /><path d="M -70 -150 L -110 -230" stroke="#d8945a" strokeWidth={12} strokeLinecap="round" />
			<ellipse cx={-125} cy={-245} rx={40} ry={26} fill="#d8945a" stroke={INK} strokeWidth={5} />
			<path d="M -120 -265 Q -110 -330 -90 -340 M -134 -265 Q -140 -330 -120 -345" stroke={INK} strokeWidth={6} fill="none" />
			<circle cx={-140} cy={-250} r={8} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={-142} cy={-250} r={4} fill={INK} />
			{[0, 1].map((i) => <path key={i} d={`M ${110 + i * 30} ${-120 + i * 20} l 60 0`} stroke="#fff" strokeWidth={8} opacity={0.7} />)}
		</g>
	);
};
const Hyene: React.FC<{x: number; y: number; s?: number; f: number; rit?: boolean; ph?: number; flip?: boolean}> = ({x, y, s = 1, f, rit, ph = 0, flip}) => (
	<g transform={`translate(${x} ${y + (rit ? Math.sin(f * 0.8 + ph) * 8 : 0)}) scale(${flip ? -s : s} ${s})`}>
		{[-60, 60].map((k) => <rect key={k} x={k - 16} y={-100} width={32} height={100} rx={10} fill="#a09070" stroke={INK} strokeWidth={4} />)}
		<path d="M -110 -150 Q 0 -200 110 -110 L 100 -80 Q 0 -70 -100 -90 Z" fill="#b8a880" stroke={INK} strokeWidth={6} />
		{[-60, -20, 20, 60].map((k) => <circle key={k} cx={k} cy={-130} r={10} fill="#6a5a40" />)}
		<g transform="translate(-140 -170)"><circle cx={-20} cy={-50} r={20} fill="#a09070" stroke={INK} strokeWidth={4} /><circle cx={30} cy={-52} r={20} fill="#a09070" stroke={INK} strokeWidth={4} /><ellipse rx={60} ry={50} fill="#b8a880" stroke={INK} strokeWidth={5} /><ellipse cx={-40} cy={20} rx={34} ry={22} fill="#8a7a5a" stroke={INK} strokeWidth={4} />
			<circle cx={-10} cy={-12} r={8} fill={INK} /><circle cx={22} cy={-12} r={8} fill={INK} />
			<path d={rit ? 'M -60 30 Q -30 70 10 34 Z' : 'M -60 40 L 0 40'} stroke={INK} strokeWidth={5} fill={rit ? '#5a1a1a' : 'none'} />
			{!rit && [0, 1].map((i) => { const p = (f * 0.05 + i / 2) % 1; return <path key={i} d="M 0 0 q -8 14 0 20 q 8 -6 0 -20 Z" transform={`translate(${40 + i * 14} ${-60 + p * 60})`} fill="#bfe6fa" stroke={INK} strokeWidth={3} opacity={1 - p} />; })}
		</g>
	</g>
);
const Pilule: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}><path d="M 0 -120 L 110 0 L 0 120 L -110 0 Z" fill="#3a7ae0" stroke={INK} strokeWidth={8} strokeLinejoin="round" /><path d="M -60 -30 L 0 -90" stroke="#fff" strokeWidth={12} opacity={0.5} strokeLinecap="round" />{txt(0, 20, 'V', 70, '#fff')}</g>
);
const Chrono: React.FC<{x: number; y: number; s?: number; sec: number}> = ({x, y, s = 1, sec}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-30} y={-250} width={60} height={50} rx={10} fill="#888" stroke={INK} strokeWidth={6} />
		<circle r={210} fill="#fff" stroke={INK} strokeWidth={12} />
		{Array.from({length: 12}).map((_, i) => <path key={i} d="M 0 -185 L 0 -160" stroke={INK} strokeWidth={8} transform={`rotate(${i * 30})`} />)}
		<path d="M 0 0 L 0 -160" stroke="#e23b2b" strokeWidth={10} strokeLinecap="round" transform={`rotate(${sec * 6})`} />
		<circle r={16} fill={INK} />
		<text x={0} y={110} textAnchor="middle" fontFamily={FONT} fontSize={60} fill={INK}>0:{String(Math.floor(sec)).padStart(2, '0')}</text>
	</g>
);

/* ---------- les plans ---------- */
export const L01: React.FC = () => (
	<Plan debut={0} fin={2.16} sansEntree cam={(t) => ({z: lin(t, [0, 2.16], [1.0, 1.15], ease), y: -100})}>
		{(t, f) => (<>
			<Savane id="l1" f={f} />
			<Lion x={640} y={1760} s={1.4} f={f} humeur="coquin" pilule />
			<g transform={`translate(820 900) rotate(${f * 3})`}><Pilule x={0} y={0} s={0.9} /></g>
			{T0(t, 'LION + VIAGRA', 130)}
		</>)}
	</Plan>
);
export const L02: React.FC = () => (
	<Plan debut={2.16} fin={4.36} cam={(t) => ({z: lin(t, [2.16, 4.36], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => {
			const n = Math.min(6, Math.floor(lin(t, [2.3, 4.2], [1, 7])));
			return (<>
				<Savane id="l2" f={f} />
				{Array.from({length: n}).map((_, i) => <Lion key={i} x={150 + (i % 3) * 380} y={1550 + Math.floor(i / 3) * 260} s={0.55} f={f} femelle humeur="choc" ph={i} flip={i % 2 === 1} />)}
				{T(t, 2.2, 'COMBIEN DE LIONNES', 100)}
				{T(t, 3.3, 'POUR LE CALMER ?', 110, '#fff', 560)}
			</>);
		}}
	</Plan>
);
export const L03: React.FC = () => (
	<Plan debut={4.36} fin={8.0} cam={(t) => ({z: lin(t, [4.36, 6.5, 8.0], [1.0, 1.1, 1.35], ease), y: lin(t, [6.5, 8], [-150, -300], ease)})}>
		{(t, f) => (<>
			<Savane id="l3" f={f} />
			<Lion x={540} y={1720} s={1.5} f={f} humeur={t > 6.5 ? 'coquin' : 'fier'} couronne={1} pilule={t > 6.5 && t < 7.6} />
			{t > 6.5 && t < 7.2 && <g transform={`translate(${lin(t, [6.5, 7.2], [900, 380])} ${lin(t, [6.5, 7.2], [900, 1360])}) rotate(${t * 400})`}><Pilule x={0} y={0} s={0.5} /></g>}
			{T(t, 4.4, 'LE ROI DE LA SAVANE', 100)}
			{t > 6.5 && T(t, 6.5, 'UNE PILULE BLEUE', 110, '#7ab0ff', 560)}
		</>)}
	</Plan>
);
export const L04: React.FC = () => (
	<Plan debut={8.0} fin={10.4} cam={(t) => ({z: lin(t, [8, 10.4], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Savane id="l4" f={f} />
			{[0, 1, 2].map((i) => <Case key={i} x={190 + i * 350} y={1600 + (i % 2) * 50} s={0.85} f={f} ph={i} ferme={lin(t, [9.0 + i * 0.2, 9.4 + i * 0.2], [0, 1], Easing.out(Easing.back(1.5)))} />)}
			{Puce(t, 8.0, '10 MINUTES PLUS TARD')}
			{t > 9.0 && T(t, 9.0, 'LES ZÈBRES FERMENT', 100)}
		</>)}
	</Plan>
);
export const L05: React.FC = () => (
	<Plan debut={10.4} fin={11.86} cam={(t) => ({z: 1.05, x: lin(t, [10.4, 11.86], [100, -100]), y: -150})}>
		{(t, f) => (<>
			<Savane id="l5" f={f} />
			{[0, 1, 2, 3].map((i) => <Gazelle key={i} x={lin(t, [10.4, 11.86], [200, -900]) + i * 260} y={1600 + (i % 2) * 90} s={0.9} f={f} ph={i} />)}
			{T(t, 10.45, 'LES GAZELLES', 120)}
			{T(t, 10.9, 'SE BARRENT', 130, '#fff', 560)}
		</>)}
	</Plan>
);
export const L06: React.FC = () => (
	<Plan debut={11.86} fin={13.8} cam={(t) => ({z: lin(t, [11.86, 13.8], [1.0, 1.25], ease), y: -200})}>
		{(t, f) => (<>
			<Savane id="l6" f={f} />
			{[0, 1, 2].map((i) => <Hyene key={i} x={300 + i * 290} y={1560} s={1.15} f={f} rit={t < 12.6} ph={i} flip={i === 2} />)}
			{t < 12.6 && txt(540, 1050, 'HA HA HA', 100, '#fff')}
			{t > 12.6 && T(t, 12.6, 'MÊME LES HYÈNES', 100)}
			{t > 13.0 && T(t, 13.0, 'NE RIGOLENT PLUS', 100, '#fff', 560)}
		</>)}
	</Plan>
);
export const L07: React.FC = () => (
	<Plan debut={13.8} fin={19.07} cam={(t) => ({z: lin(t, [13.8, 16.3, 19.07], [1.0, 1.05, 1.2], ease), y: -150})}>
		{(t, f) => {
			const lignes = Math.floor(lin(t, [16.3, 18.5], [0, 5]));
			return (<>
				<Savane id="l7" f={f} />
				<g transform="translate(540 1050)"><rect x={-380} y={-300} width={760} height={560} rx={14} fill="#f6f6f0" stroke={INK} strokeWidth={10} /><rect x={-380} y={-300} width={760} height={90} fill="#c0392b" stroke={INK} strokeWidth={10} />{txt(0, -235, 'PLANNING', 60, '#fff')}
					{['8H', '9H', '10H', '11H', '12H'].slice(0, lignes).map((h, i) => <g key={h}><text x={-340} y={-140 + i * 85} fontFamily={FONT} fontSize={46} fill={INK}>{h}</text><text x={-180} y={-140 + i * 85} fontFamily={FONT} fontSize={46} fill="#5a3a1a">{['NALA', 'ZURI', 'KIARA', 'SARABI', '…AU SECOURS'][i]}</text></g>)}
				</g>
				{[0, 1, 2].map((i) => <Lion key={i} x={200 + i * 340} y={1800} s={0.6} f={f} femelle humeur={i === 1 ? 'blase' : 'neutre'} ph={i} flip={i === 2} />)}
				{T(t, 13.85, 'RÉUNION D\'URGENCE', 100)}
				{t > 17.4 && T(t, 17.4, 'TOURS DE GARDE', 110, '#fff', 560)}
			</>);
		}}
	</Plan>
);
export const L08: React.FC = () => (
	<Plan debut={19.07} fin={21.32} secousse={() => 10} cam={(t) => ({z: lin(t, [19.07, 21.32], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#2a2a3a" />
			{txt(540, 1150, '!', 400, '#ffd23f')}
			{T(t, 19.1, 'MAIS ATTENDS…', 130)}
			{t > 19.8 && T(t, 19.8, 'LA VÉRITÉ', 130, '#ff4b2b', 560)}
		</>)}
	</Plan>
);
export const L09: React.FC = () => (
	<Plan debut={21.32} fin={26.59} cam={(t) => ({z: lin(t, [21.32, 26.59], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => {
			const n = Math.round(lin(t, [22.4, 24.6], [0, 50], Easing.out(Easing.cubic)));
			const bouge = t > 22.4 ? Math.sin(f * 1.4) * 8 : 0;
			return (<>
				<Savane id="l9" f={f} />
				<g transform={`translate(540 ${1600}) rotate(${bouge * 0.3})`}>
					{Array.from({length: 9}).map((_, i) => <circle key={i} cx={Math.cos(i * 0.8) * 200} cy={-120 + Math.sin(i * 0.8) * 90 + bouge * (i % 2 ? 1 : -1)} r={110} fill={i % 2 ? '#7a9a3a' : '#6a8a2a'} stroke={INK} strokeWidth={6} />)}
				</g>
				{t > 22.4 && [0, 1, 2].map((i) => <path key={i} d="M 0 -30 C -40 -70 -80 -20 0 30 C 80 -20 40 -70 0 -30 Z" transform={`translate(${380 + i * 160} ${1300 - ((t - 22.4) * 160 + i * 70) % 300}) scale(0.7)`} fill="#ff6b81" stroke={INK} strokeWidth={4} />)}
				<g transform="translate(540 1000)"><rect x={-300} y={-110} width={600} height={220} rx={30} fill="#fff" stroke={INK} strokeWidth={10} /><text x={0} y={20} textAnchor="middle" fontFamily={FONT} fontSize={130} fill="#c0392b">{n} FOIS</text><text x={0} y={85} textAnchor="middle" fontFamily={FONT} fontSize={50} fill={INK}>PAR JOUR</text></g>
				{T(t, 21.35, 'SANS RIEN PRENDRE', 100)}
				{t > 24.9 && T(t, 24.9, 'PENDANT 3 OU 4 JOURS', 90, '#fff', 560)}
			</>);
		}}
	</Plan>
);
export const L10: React.FC = () => (
	<Plan debut={26.59} fin={29.8} cam={(t) => ({z: lin(t, [26.59, 29.8], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Fond c="#e8eef0" />
			<Chrono x={540} y={1050} s={1.0} sec={lin(t, [27.9, 29.4], [0, 29])} />
			<Lion x={850} y={1780} s={0.6} f={f} femelle humeur="blase" flip />
			{T(t, 26.6, 'ET CHAQUE FOIS…', 110)}
			{t > 27.9 && T(t, 27.9, '- DE 30 SECONDES', 110, '#ff4b2b', 560)}
		</>)}
	</Plan>
);
export const L11: React.FC = () => (
	<Plan debut={29.8} fin={34.0} cam={(t) => ({z: lin(t, [29.8, 34], [1.0, 1.2], ease), y: -200})}>
		{(t, f) => (<>
			<Savane id="l11" f={f} />
			<Lion x={540} y={1720} s={1.5} f={f} humeur={t > 31.9 ? 'gene' : 'fier'} couronne={t > 32.5 ? Math.max(0.01, lin(t, [32.5, 33.2], [1, 0.01])) : 1} />
			{T(t, 29.85, 'ROI DE LA SAVANE ✓', 96, '#7be07b')}
			{t > 31.9 && T(t, 31.9, "ROI DE L'ENDURANCE ✗", 86, '#ff4b2b', 560)}
		</>)}
	</Plan>
);
export const PLANS_LION: [number, number, React.FC][] = [
	[0, 2.16, L01], [2.16, 4.36, L02], [4.36, 8.0, L03], [8.0, 10.4, L04], [10.4, 11.86, L05], [11.86, 13.8, L06], [13.8, 19.07, L07],
	[19.07, 21.32, L08], [21.32, 26.59, L09], [26.59, 29.8, L10], [29.8, 34.0, L11],
];
