import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, sortie, Ciel, Soleil, Nuage, Humain, Titre, Bulle, Mer, Barque, PontBateaux, Trireme, Eclair, Chaine, Palais, Mouette} from './dessins';

const ease = Easing.inOut(Easing.cubic);
const XERX = {couleur: '#6a2a7a', chapeau: 'tiare' as const, barbe: '#2b1a10', jambesC: '#c9a227', medailles: 0};
const PERSE = {couleur: '#b5652c', chapeau: 'bonnet' as const, jambesC: '#6b4a2b'};
const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => <Ecran><Titre x={540} y={y} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;

const Cote: React.FC<{id: string; f: number; mer?: number; tempete?: number; nuit?: boolean; visage?: 'calme' | 'sourire' | 'aucun'; rives?: boolean}> = ({id, f, mer = 1150, tempete = 0, visage = 'aucun', rives = true}) => (
	<>
		<Ciel id={id} haut={tempete > 0.5 ? '#3a4458' : '#74c4f0'} bas={tempete > 0.5 ? '#6b7486' : '#fde7b8'} />
		{tempete < 0.5 && <><Soleil x={860} y={300} f={f} /><Nuage x={240} y={320} /><Nuage x={700} y={520} s={0.7} /></>}
		{tempete > 0.5 && Array.from({length: 5}).map((_, i) => <ellipse key={i} cx={((i * 300 + f * 2) % 1500) - 200} cy={260 + (i % 2) * 120} rx={260} ry={90} fill="#4a5468" stroke={INK} strokeWidth={5} />)}
		{rives && <path d={`M -200 ${mer - 60} Q 120 ${mer - 160} 300 ${mer - 40} L 300 ${mer + 40} L -200 ${mer + 40} Z`} fill="#c99a5a" stroke={INK} strokeWidth={6} />}
		{rives && <path d={`M 1280 ${mer - 50} Q 960 ${mer - 150} 820 ${mer - 30} L 820 ${mer + 40} L 1280 ${mer + 40} Z`} fill="#9cc06a" stroke={INK} strokeWidth={6} />}
		<Mer y={mer} f={f} tempete={tempete} visage={visage} />
	</>
);

export const X01: React.FC = () => (
	<Plan debut={0} fin={1.94} sansEntree cam={(t) => ({z: lin(t, [0, 1.94], [1.3, 1.1], ease), y: -100})}>
		{(t, f) => (<>
			<Cote id="x1" f={f} rives={false} mer={1200} />
			<path d="M -200 1300 L -200 980 Q 150 900 330 1060 L 420 1300 Z" fill="#b8925a" stroke={INK} strokeWidth={7} />
			<Humain x={200} y={1040} s={1.1} f={f} {...XERX} humeur="fache" regard={1} />
			{T(t, 0.3, 'IL Y A 2 500 ANS', 110, '#FFD23F', 250)}
		</>)}
	</Plan>
);

export const X02: React.FC = () => (
	<Plan debut={1.94} fin={4.74} cam={(t) => ({z: lin(t, [1.94, 4.74], [1.25, 1.5], ease), x: lin(t, [1.94, 4.74], [150, -60], ease), y: -200})}>
		{(t, f) => (<>
			<Cote id="x2" f={f} rives={false} mer={1250} visage={t > 3.9 ? 'calme' : 'aucun'} />
			<path d="M -200 1400 L -200 1060 Q 150 980 330 1140 L 420 1400 Z" fill="#b8925a" stroke={INK} strokeWidth={7} />
			<Humain x={210} y={1120} s={1.1} f={f} {...XERX} pose="crie" humeur="crie" />
			{T(t, 2.96, 'LA GUERRE…', 120, '#FFD23F', 250)}
			{T(t, 3.9, '… À LA MER !', 120, '#fff', 400)}
		</>)}
	</Plan>
);

export const X03: React.FC = () => (
	<Plan debut={4.74} fin={6.18} cam={(t) => ({z: lin(t, [4.74, 6.18], [1.5, 1.7], ease), y: -200})} secousse={(t) => (t > 5.26 && t < 5.5 ? 16 : 0)}>
		{(t, f) => (<>
			<Cote id="x3" f={f} rives={false} mer={1250} />
			<Barque x={420} y={1290} s={1.1} f={f}><Humain x={0} y={-50} s={0.85} f={f * 1.5} {...PERSE} pose="fouet" humeur="fache" /></Barque>
			{t > 5.26 && Array.from({length: 8}).map((_, i) => {
				const k = lin(t, [5.26, 6.0], [0, 1]);
				return <ellipse key={i} cx={720 + Math.cos(i) * 150 * k} cy={1230 - Math.sin(i * 0.7 + 1) * 200 * k + k * k * 160} rx={14} ry={20} fill="#bfe6fa" stroke={INK} strokeWidth={3} opacity={1 - k} />;
			})}
			{T(t, 5.26, 'CLAC !', 140, '#fff', 560)}
		</>)}
	</Plan>
);

export const X04: React.FC = () => (
	<Plan debut={6.18} fin={9.98} cam={(t) => ({z: lin(t, [6.18, 9.98], [1.45, 1.15], ease), y: lin(t, [6.18, 9.98], [-60, -160], ease)})}>
		{(t, f) => (<>
			<Palais />
			<Humain x={540} y={1440} s={1.3} f={f} {...XERX} humeur="content" pose="salut" />
			{[0, 1].map((i) => <Humain key={i} x={i ? 920 : 160} y={1560} s={0.95} f={f} {...PERSE} humeur="neutre" ph={i} flip={i === 1} />)}
			{T(t, 7.12, 'XERXÈS', 160)}
			{T(t, 9.08, "ROI DE L'EMPIRE PERSE", 80, '#fff', 560)}
		</>)}
	</Plan>
);

export const X05: React.FC = () => (
	<Plan debut={9.98} fin={11.7} cam={(t) => ({z: lin(t, [9.98, 11.7], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Palais />
			<Humain x={540} y={1300} s={1.2} f={f} {...XERX} humeur="content" pose="crie" />
			{Array.from({length: 12}).map((_, i) => (
				<g key={i} transform={`translate(${90 + (i % 6) * 180} ${1600 + Math.floor(i / 6) * 120}) rotate(${-25 * Math.abs(Math.sin(f * 0.15 + i))})`}>
					<Humain x={0} y={0} s={0.55} f={f} {...PERSE} humeur="content" ph={i} />
				</g>
			))}
			{T(t, 10.26, 'LE PLUS PUISSANT DU MONDE', 76)}
		</>)}
	</Plan>
);

export const X06: React.FC = () => (
	<Plan debut={11.7} fin={14.86} cam={(t) => ({z: lin(t, [11.7, 14.86], [1.4, 0.95], ease), y: lin(t, [11.7, 14.86], [-300, 0], ease)})}>
		{(t, f) => (<>
			<Ciel id="x6" haut="#74c4f0" bas="#fde7b8" />
			<Soleil x={860} y={300} f={f} />
			<rect x={-1200} y={1100} width={3500} height={2000} fill="#d9b070" stroke={INK} strokeWidth={6} />
			{Array.from({length: 5}).map((_, r) => Array.from({length: 9}).map((__, i) => {
				const s = 0.32 + r * 0.1;
				const x = -300 + i * 210 + ((t - 11.7) * 120 * (r + 1)) % 210 + (r % 2) * 100;
				return <Humain key={`${r}-${i}`} x={x} y={1180 + r * r * 30 + r * 90} s={s} f={f} {...PERSE} pas humeur="fache" ph={i + r} />;
			}))}
			{T(t, 12.64, 'DIRECTION LA GRÈCE', 92)}
			{T(t, 13.92, 'UNE ARMÉE IMMENSE', 92, '#fff', 560)}
		</>)}
	</Plan>
);

export const X07: React.FC = () => (
	<Plan debut={14.86} fin={18.64} cam={(t) => ({z: lin(t, [14.86, 18.64], [1.7, 1.3], ease), x: lin(t, [14.86, 18.64], [220, 0], ease), y: -120})}>
		{(t, f) => (<>
			<Cote id="x7" f={f} mer={1150} />
			{Array.from({length: 6}).map((_, i) => <Humain key={i} x={-80 + (i % 3) * 90} y={1100 + Math.floor(i / 3) * 40} s={0.4} f={f} {...PERSE} humeur="perplexe" ph={i} />)}
			<Humain x={250} y={1110} s={0.55} f={f} {...XERX} humeur="perplexe" regard={1} />
			{t > 16.34 && <text x={1030} y={1000} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#fff" stroke={INK} strokeWidth={10} paintOrder="stroke" opacity={pop(t, 16.34)}>GRÈCE</text>}
			{t > 17.44 && <path d={`M 340 1250 L ${340 + 460 * lin(t, [17.44, 18.0], [0, 1])} 1250`} stroke="#c0392b" strokeWidth={14} strokeDasharray="30 16" strokeLinecap="round" />}
			{T(t, 15.0, 'UN SEUL PROBLÈME', 100)}
			{T(t, 17.44, 'UN BRAS DE MER', 100, '#fff', 560)}
		</>)}
	</Plan>
);

export const X08: React.FC = () => (
	<Plan debut={18.64} fin={22.6} cam={(t) => (t < 19.6 ? {z: 1.6, x: 250, y: -20} : {z: lin(t, [19.6, 22.6], [1.15, 1.05], ease), y: -60})}>
		{(t, f) => (<>
			<Cote id="x8" f={f} mer={1150} />
			<Humain x={250} y={1110} s={0.55} f={f} {...XERX} humeur="content" pose={t < 19.6 ? 'salut' : 'crie'} />
			{Array.from({length: 10}).map((_, i) => {
				const a = 20.3 + i * 0.16;
				if (t < a) return null;
				const x = 330 + i * 52;
				return <Barque key={i} x={x} y={lin(t, [a, a + 0.3], [1000, 1150], Easing.out(Easing.bounce))} s={0.3} f={f + i * 5} />;
			})}
			{T(t, 18.64, 'PAS GRAVE.', 130)}
			{T(t, 20.72, 'DEUX PONTS', 110, '#fff', 560)}
		</>)}
	</Plan>
);

export const X09: React.FC = () => (
	<Plan debut={22.6} fin={25.2} cam={(t) => ({z: 1.4, x: lin(t, [22.6, 25.2], [300, -300], ease), y: -250})}>
		{(t, f) => (<>
			<Cote id="x9" f={f} mer={1250} rives={false} />
			<PontBateaux x1={-500} x2={1580} y={1300} n={10} f={f} s={0.65} />
			{[0, 1, 2].map((i) => <Humain key={i} x={150 + i * 380} y={1240} s={0.6} f={f} {...PERSE} pose="baton" humeur="content" ph={i} />)}
			{T(t, 23.26, 'DES BATEAUX ATTACHÉS', 88)}
		</>)}
	</Plan>
);

export const X10: React.FC = () => (
	<Plan debut={25.2} fin={29.64} cam={(t) => ({z: lin(t, [25.2, 29.64], [1.2, 1.05], ease), y: -100})} secousse={(t) => (t > 26.84 ? 10 + (t > 28.5 ? 14 : 0) : 0)}>
		{(t, f) => {
			const tp = lin(t, [26.6, 27.4], [0, 1]);
			const casse = lin(t, [28.5, 29.5], [0, 1], Easing.out(Easing.quad));
			return (<>
				<Cote id="x10" f={f} mer={1150} tempete={tp} />
				<PontBateaux x1={300} x2={820} y={1150} n={10} f={f} s={0.3} casse={casse} />
				<Eclair x={420} y={200} s={1.2} k={t > 27.1 && (f % 20) < 4 ? 1 : 0} />
				<Eclair x={800} y={150} k={t > 27.6 && (f % 27) < 3 ? 1 : 0} />
				{Array.from({length: 30}).map((_, i) => <line key={i} x1={(rnd(i) * 1300 + f * 25) % 1300 - 100} y1={(rnd(i + 3) * 1900 + f * 60) % 1900} x2={(rnd(i) * 1300 + f * 25) % 1300 - 120} y2={(rnd(i + 3) * 1900 + f * 60) % 1900 + 60} stroke="#cfe3f0" strokeWidth={4} opacity={tp * 0.7} />)}
				{T(t, 26.84, 'LA TEMPÊTE', 130, '#fff')}
			</>);
		}}
	</Plan>
);

export const X11: React.FC = () => (
	<Plan debut={29.64} fin={33.72} cam={(t) => ({z: lin(t, [29.64, 30.3, 33.72], [1.9, 1.5, 1.3], ease), y: lin(t, [29.64, 30.3], [-50, -180], ease)})} secousse={(t) => (t > 30.24 && t < 30.8 ? 12 : 0)}>
		{(t, f) => (<>
			<Palais />
			<rect x={-800} y={-800} width={2680} height={3600} fill="#c0392b" opacity={lin(t, [30.2, 30.6], [0, 0.18])} />
			<Humain x={540} y={1480} s={1.35} f={f * 1.4} {...XERX} pose="crie" humeur="crie" />
			{t > 31.6 && (
				<g transform={`translate(800 900) scale(${pop(t, 31.6)}) rotate(6)`}>
					<rect x={-150} y={-190} width={300} height={380} rx={14} fill="#fbf3dc" stroke={INK} strokeWidth={8} />
					<text x={0} y={-110} textAnchor="middle" fontFamily={FONT} fontSize={56} fill={INK}>ORDRE</text>
					{[0, 1, 2, 3].map((i) => <rect key={i} x={-110} y={-60 + i * 50} width={i === 3 ? 140 : 220} height={14} rx={7} fill="#cfc6ad" />)}
				</g>
			)}
			{T(t, 30.24, 'FURIEUX', 150, '#ff4b2b', 250)}
		</>)}
	</Plan>
);

export const X12: React.FC = () => (
	<Plan debut={33.72} fin={35.16} cam={(t) => ({z: lin(t, [33.72, 35.16], [1.1, 1.35], ease), y: -150})}>
		{(t, f) => (<>
			<Cote id="x12" f={f} mer={1200} rives={false} visage="calme" />
			{T(t, 33.72, 'PUNIR LA MER', 150, '#ff4b2b')}
		</>)}
	</Plan>
);

export const X13: React.FC = () => (
	<Plan debut={35.16} fin={38.24} cam={(t) => ({z: lin(t, [35.16, 37.28, 38.24], [1.15, 1.25, 1.45], ease), x: lin(t, [35.16, 37.28], [-150, 0], ease), y: -230})}>
		{(t, f) => (<>
			<Cote id="x13" f={f} mer={1250} rives={false} />
			{[0, 1, 2].map((i) => (
				<Barque key={i} x={lin(t, [35.16, 36.8], [-300 + i * 260, 200 + i * 340], sortie)} y={1290 + (i % 2) * 120} s={0.85} f={f} c={['#8a5a35', '#7a4a2a', '#9a6a40'][i]}>
					<Humain x={0} y={-50} s={0.75} f={f * 1.5} {...PERSE} pose={t > 37.28 ? 'fouet' : 'debout'} humeur="fache" ph={i} />
				</Barque>
			))}
			{t > 37.28 && Array.from({length: 12}).map((_, i) => {
				const k = ((t - 37.28) * 2 + i * 0.08) % 1;
				return <ellipse key={i} cx={260 + (i % 3) * 340 + Math.cos(i) * 80 * k} cy={1220 - Math.sin(k * Math.PI) * 180} rx={12} ry={18} fill="#bfe6fa" stroke={INK} strokeWidth={3} opacity={1 - k} />;
			})}
		</>)}
	</Plan>
);

export const X14: React.FC = () => (
	<Plan debut={38.24} fin={39.52} cam={() => ({z: 1.3, y: -230})} secousse={(t) => ((t * 6) % 1 < 0.2 ? 10 : 0)}>
		{(t, f) => (<>
			<Cote id="x14" f={f} mer={1250} rives={false} />
			<Barque x={540} y={1300} s={1.0} f={f}><Humain x={0} y={-50} s={0.85} f={f * 2} {...PERSE} pose="fouet" humeur="crie" /></Barque>
			<Ecran>
				<g transform={`translate(540 420) scale(${pop(t, 38.24)})`}>
					<text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={200} fill="#FFD23F" stroke={INK} strokeWidth={30} paintOrder="stroke">{Math.round(lin(t, [38.24, 39.0], [0, 300]))}</text>
					<text x={0} y={150} textAnchor="middle" fontFamily={FONT} fontSize={80} fill="#fff" stroke={INK} strokeWidth={14} paintOrder="stroke">COUPS DE FOUET</text>
				</g>
			</Ecran>
		</>)}
	</Plan>
);

export const X15: React.FC = () => (
	<Plan debut={39.52} fin={41.86} cam={(t) => ({z: lin(t, [39.52, 41.86], [1.2, 1.5], ease), x: lin(t, [39.52, 41.86], [100, -120], ease), y: -230})}>
		{(t, f) => (<>
			<Cote id="x15" f={f} mer={1250} rives={false} />
			<Barque x={300} y={1300} s={0.95} f={f}><Humain x={0} y={-50} s={0.8} f={f} {...PERSE} pose="crie" humeur="fache" /></Barque>
			{[0, 1].map((i) => {
				const k = lin(t, [39.96 + i * 0.4, 40.8 + i * 0.4], [0, 1]);
				if (k <= 0) return null;
				return <Chaine key={i} x={360 + k * 420} y={1100 - Math.sin(k * Math.PI) * 380 + k * 180} s={0.9} r={k * 200} />;
			})}
			{t > 40.8 && Array.from({length: 8}).map((_, i) => {
				const k = lin(t, [40.8, 41.6], [0, 1]);
				return <ellipse key={i} cx={800 + Math.cos(i) * 120 * k} cy={1260 - Math.sin(i + 1) * 160 * k + k * k * 120} rx={12} ry={18} fill="#bfe6fa" stroke={INK} strokeWidth={3} opacity={1 - k} />;
			})}
			{T(t, 40.12, 'DES CHAÎNES', 120)}
		</>)}
	</Plan>
);

export const X16: React.FC = () => (
	<Plan debut={41.86} fin={45.04} cam={(t) => ({z: lin(t, [41.86, 45.04], [1.3, 1.55], ease), x: 120, y: -250})}>
		{(t, f) => (<>
			<Cote id="x16" f={f} mer={1250} rives={false} />
			<Barque x={330} y={1320} s={1.0} f={f}><Humain x={0} y={-50} s={0.9} f={f} {...PERSE} pose="crie" humeur="crie" /></Barque>
			<Bulle x={660} y={820} w={620} h={380} k={pop(t, 42.4)} queue={[-240, 300]}>
				<text x={0} y={-70} textAnchor="middle" fontFamily={FONT} fontSize={64} fill={INK}>« EAU AMÈRE,</text>
				<text x={0} y={10} textAnchor="middle" fontFamily={FONT} fontSize={64} fill={INK}>TON MAÎTRE</text>
				<text x={0} y={90} textAnchor="middle" fontFamily={FONT} fontSize={64} fill="#c0392b">TE PUNIT ! »</text>
			</Bulle>
		</>)}
	</Plan>
);

export const X17: React.FC = () => (
	<Plan debut={45.04} fin={46.8} cam={(t) => ({z: lin(t, [45.04, 46.8], [1.0, 1.15], ease), y: -100})}>
		{(t, f) => (<>
			<Cote id="x17" f={f} mer={1150} rives={false} visage="calme" />
			<Mouette x={lin(t, [45.04, 46.8], [200, 700])} y={600} s={1} f={f} />
			{T(t, 45.96, '…', 200, '#fff')}
		</>)}
	</Plan>
);

export const X18: React.FC = () => (
	<Plan debut={46.8} fin={50.8} cam={(t) => ({z: lin(t, [46.8, 50.8], [1.5, 1.0], ease), y: lin(t, [46.8, 50.8], [-150, 0], ease)})}>
		{(t, f) => (<>
			<Cote id="x18" f={f} mer={1150} />
			{[0, 1].map((p) => <PontBateaux key={p} x1={300} x2={820} y={1130 + p * 90} n={Math.round(lin(t, [46.92, 49.82], [2, 13]))} f={f} s={0.25 + p * 0.03} />)}
			<Ecran>
				<g transform={`translate(540 420) scale(${pop(t, 49.5)})`}>
					<text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={150} fill="#FFD23F" stroke={INK} strokeWidth={24} paintOrder="stroke">{Math.round(lin(t, [49.5, 50.3], [0, 600]))} BATEAUX</text>
				</g>
			</Ecran>
			{T(t, 46.92, 'ON RECONSTRUIT', 100, '#fff', 600)}
		</>)}
	</Plan>
);

export const X19: React.FC = () => (
	<Plan debut={50.8} fin={53.48} cam={(t) => ({z: 1.45, x: lin(t, [50.8, 53.48], [200, -200]), y: -200})}>
		{(t, f) => {
			const nuit = (Math.sin((t - 50.8) * 9) + 1) / 2;
			return (<>
				<Cote id="x19" f={f} mer={1250} rives={false} />
				<rect x={-800} y={-800} width={2680} height={3600} fill="#0f1a3a" opacity={nuit * 0.55} />
				<PontBateaux x1={-600} x2={1700} y={1300} n={12} f={f} s={0.55} />
				{Array.from({length: 14}).map((_, i) => <Humain key={i} x={((i * 150 + (t - 50.8) * 260) % 2100) - 450} y={1250} s={0.45} f={f} {...PERSE} pas humeur="fache" ph={i} />)}
				<Ecran>
					<g transform={`translate(540 420) scale(${pop(t, 51.78)})`}>
						<text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={100} fill="#FFD23F" stroke={INK} strokeWidth={18} paintOrder="stroke">7 JOURS · 7 NUITS</text>
					</g>
				</Ecran>
			</>);
		}}
	</Plan>
);

export const X20: React.FC = () => (
	<Plan debut={53.48} fin={56.2} cam={(t) => ({z: lin(t, [53.48, 56.2], [1.25, 1.55], ease), y: -230})}>
		{(t, f) => (<>
			<Ciel id="x20" haut="#74c4f0" bas="#fde7b8" />
			<rect x={-800} y={1300} width={2680} height={1400} fill="#9cc06a" stroke={INK} strokeWidth={6} />
			{[160, 920].map((x, i) => <g key={i}><rect x={x - 40} y={700} width={80} height={600} fill="#f4f0e6" stroke={INK} strokeWidth={6} /><path d={`M ${x - 70} 700 L ${x + 70} 700 L ${x + 50} 670 L ${x - 50} 670 Z`} fill="#f4f0e6" stroke={INK} strokeWidth={5} /></g>)}
			<Humain x={540} y={1540} s={1.3} f={f} {...XERX} humeur="perplexe" regard={Math.sin(f * 0.1)} />
			{t > 54.6 && ['?', '?', '?'].map((q, i) => <text key={i} x={380 + i * 160} y={lin(t, [54.6 + i * 0.15, 55.0 + i * 0.15], [1100, 1020])} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#fff" stroke={INK} strokeWidth={14} paintOrder="stroke" opacity={pop(t, 54.6 + i * 0.15)}>{q}</text>)}
			{T(t, 53.78, 'EN GRÈCE', 120)}
		</>)}
	</Plan>
);

export const X21: React.FC = () => (
	<Plan debut={56.2} fin={58.04} cam={(t) => ({z: lin(t, [56.2, 58.04], [0.95, 1.1], ease), y: -120})} secousse={(t) => (t > 56.72 && t < 57.1 ? 18 : 0)}>
		{(t, f) => {
			const choc = lin(t, [56.3, 56.72], [0, 1], Easing.in(Easing.quad));
			const coule = lin(t, [56.8, 58.0], [0, 1]);
			return (<>
				<Cote id="x21" f={f} mer={1250} rives={false} />
				<Trireme x={780} y={1280} s={0.75} f={f} c="#7a4a2a" voile="#e8c07a" flip coule={coule} />
				<Trireme x={lin(choc, [0, 1], [-250, 400])} y={1320} s={0.8} f={f} c="#2f5d8a" voile="#f1ede2" />
				<Trireme x={lin(choc, [0, 1], [-500, 120])} y={1420} s={0.6} f={f} c="#2f5d8a" voile="#f1ede2" />
				{T(t, 57.2, 'SALAMINE', 140)}
			</>);
		}}
	</Plan>
);

export const X22: React.FC = () => (
	<Plan debut={58.04} fin={59.92} cam={(t) => ({z: 1.3, x: lin(t, [58.04, 59.92], [-100, 100]), y: -230})}>
		{(t, f) => (<>
			<Ciel id="x22" haut="#e8a36a" bas="#f6d9a8" />
			<rect x={-800} y={1300} width={2680} height={1400} fill="#c9a46a" stroke={INK} strokeWidth={6} />
			<Humain x={lin(t, [58.04, 59.92], [700, 300])} y={1540} s={1.2} f={f * 0.7} {...XERX} pas flip humeur="triste" />
			{[0, 1].map((i) => <Humain key={i} x={lin(t, [58.04, 59.92], [900 + i * 150, 520 + i * 150])} y={1560} s={0.8} f={f * 0.7} {...PERSE} pas flip humeur="triste" ph={i} />)}
			{T(t, 58.4, 'RETOUR À LA MAISON', 92)}
		</>)}
	</Plan>
);

export const X23: React.FC = () => (
	<Plan debut={59.92} fin={61.54} cam={(t) => ({z: lin(t, [59.92, 61.54], [1.4, 1.2], ease), y: -200})}>
		{(t, f) => (<>
			<Cote id="x23" f={f} mer={1300} rives={false} tempete={lin(t, [60.6, 61.4], [0, 0.9])} />
			<path d="M -200 1450 L -200 1180 Q 150 1100 330 1260 L 420 1450 Z" fill="#b8925a" stroke={INK} strokeWidth={7} />
			<Humain x={200} y={1230} s={0.95} f={f} {...XERX} humeur="perplexe" regard={1} />
		</>)}
	</Plan>
);

export const X24: React.FC = () => (
	<Plan debut={61.54} fin={64.18} cam={(t) => ({z: lin(t, [61.54, 64.18], [1.2, 1.4], ease), y: -150})} secousse={() => 6}>
		{(t, f) => (<>
			<Cote id="x24" f={f} mer={1200} tempete={1} />
			<PontBateaux x1={300} x2={820} y={1200} n={10} f={f} s={0.3} casse={lin(t, [61.6, 62.6], [0.4, 1])} />
			<Eclair x={500} y={180} s={1.2} k={(f % 18) < 3 ? 1 : 0} />
			<Humain x={250} y={1120} s={0.7} f={f} {...XERX} humeur="choc" pose="crie" />
			{T(t, 62.1, 'ENCORE !', 160, '#ff4b2b')}
		</>)}
	</Plan>
);

export const X25: React.FC = () => (
	<Plan debut={64.18} fin={68.0} cam={(t) => ({z: lin(t, [64.18, 66.5], [1.0, 1.2], ease), y: -60})}>
		{(t, f) => (<>
			<Cote id="x25" f={f} mer={1100} rives={false} visage="sourire" />
			<Mouette x={300} y={560} f={f} /><Mouette x={760} y={480} s={0.8} f={f + 9} />
			{t < 66.3 && T(t, 64.3, 'LA MER A GAGNÉ', 120)}
			{T(t, 66.3, 'FIN', 170)}
		</>)}
	</Plan>
);

export const PLANS4: [number, number, React.FC][] = [
	[0, 1.94, X01], [1.94, 4.74, X02], [4.74, 6.18, X03], [6.18, 9.98, X04], [9.98, 11.7, X05], [11.7, 14.86, X06], [14.86, 18.64, X07],
	[18.64, 22.6, X08], [22.6, 25.2, X09], [25.2, 29.64, X10], [29.64, 33.72, X11], [33.72, 35.16, X12], [35.16, 38.24, X13], [38.24, 39.52, X14],
	[39.52, 41.86, X15], [41.86, 45.04, X16], [45.04, 46.8, X17], [46.8, 50.8, X18], [50.8, 53.48, X19], [53.48, 56.2, X20], [56.2, 58.04, X21],
	[58.04, 59.92, X22], [59.92, 61.54, X23], [61.54, 64.18, X24], [64.18, 68.0, X25],
];
