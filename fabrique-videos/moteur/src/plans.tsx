import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {
	INK, BLE, KHAKI, FONT, rnd, lin, pop, sortie, Ciel, Soleil, Nuage, Collines, Sol, Ble, Buisson, Mare, Termitiere,
	Emu, Humain, Mitrailleuse, Camion, Titre, Bulle, Ampoule,
} from './dessins';

type Cam = {z: number; x?: number; y?: number; r?: number};
type PlanP = {debut: number; fin: number; cam?: (t: number) => Cam; fond?: string; children: (t: number, f: number) => React.ReactNode; secousse?: (t: number) => number; nuit?: boolean; sansEntree?: boolean};

export const CamCtx = React.createContext<{x: number; y: number; z: number}>({x: 0, y: 0, z: 1});
/* une couche du décor : d < 1 = loin (bouge moins), d > 1 = près (bouge plus) */
export const Couche: React.FC<{d: number; flou?: number; children: React.ReactNode}> = ({d, flou = 0, children}) => {
	const c = React.useContext(CamCtx);
	const k = Math.max(0.2, 1 + (c.z - 1) * (d - 1));
	const fx = 540 - c.x, fy = 960 - c.y;
	return (
		<g transform={`translate(${fx} ${fy}) scale(${k}) translate(${-fx + c.x * (d - 1)} ${-fy + c.y * (d - 1)})`} filter={flou ? `url(#flou${flou})` : undefined}>
			{children}
		</g>
	);
};

export const Ecran: React.FC<{children: React.ReactNode}> = ({children}) => {
	const c = React.useContext(CamCtx) as {x: number; y: number; z: number; r?: number};
	return <g transform={`translate(${540 - c.x} ${960 - c.y}) scale(${1 / c.z}) rotate(${-(c.r || 0)}) translate(-540 -960)`}>{children}</g>;
};

const ease = Easing.inOut(Easing.cubic);
const Plan: React.FC<PlanP> = ({debut, fin, cam, fond = '#000', children, secousse, nuit, sansEntree}) => {
	const f = useCurrentFrame();
	const t = debut + f / 30;
	const dir = Math.floor(debut * 7) % 2 ? 1 : -1;
	const base = cam ? cam(t) : {z: lin(t, [debut, fin], [1.18, 1.34], ease), x: dir * lin(t, [debut, fin], [-120, 120], ease), y: -190};
	// caméra tenue à la main : elle respire
	const c = {
		z: base.z,
		x: (base.x || 0) + Math.sin(t * 0.9 + debut) * 14 + Math.sin(t * 2.1 + debut * 3) * 4,
		y: (base.y || 0) + Math.cos(t * 0.7 + debut * 2) * 10,
		r: (base.r || 0) + Math.sin(t * 0.55 + debut) * 0.6,
	};
	const sk = secousse ? secousse(t) : 0;
	const sx = sk ? (rnd(f) - 0.5) * sk : 0;
	const sy = sk ? (rnd(f + 99) - 0.5) * sk : 0;
	// passage rapide et flou d'un plan à l'autre
	const nb = Math.round((fin - debut) * 30);
	const eIn = sansEntree ? 1 : lin(f, [0, 6], [0, 1], Easing.out(Easing.cubic));
	const eOut = lin(f, [nb - 4, nb], [0, 1], Easing.in(Easing.cubic));
	const glisse = (1 - eIn) * 900 * dir - eOut * 900 * dir;
	const flouMvt = Math.round((1 - eIn) * 45 + eOut * 45);
	return (
		<AbsoluteFill style={{background: fond}}>
			<svg viewBox="0 0 1080 1920" width={1080} height={1920}>
				<defs>
					{[2, 3, 5, 8].map((k) => (
						<filter key={k} id={`flou${k}`} filterUnits="userSpaceOnUse" x={-1500} y={-1500} width={4200} height={5000}><feGaussianBlur stdDeviation={k} /></filter>
					))}
					<filter id="mvt" filterUnits="userSpaceOnUse" x={-1500} y={-1500} width={4200} height={5000}><feGaussianBlur stdDeviation={`${flouMvt} ${flouMvt * 0.08}`} /></filter>
					<radialGradient id="vignette" cx="0.5" cy="0.48" r="0.75">
						<stop offset="0.55" stopColor="#000" stopOpacity={0} />
						<stop offset="1" stopColor={nuit ? '#050a1a' : '#2a1200'} stopOpacity={nuit ? 0.75 : 0.45} />
					</radialGradient>
					<radialGradient id="lumiere" cx="0.85" cy="0.12" r="0.7">
						<stop offset="0" stopColor={nuit ? '#ffd27a' : '#fff3c4'} stopOpacity={nuit ? 0.1 : 0.4} />
						<stop offset="1" stopColor="#fff3c4" stopOpacity={0} />
					</radialGradient>
				</defs>
				<g filter={flouMvt > 0 ? 'url(#mvt)' : undefined} transform={`translate(${glisse} 0)`}>
					<CamCtx.Provider value={{x: c.x, y: c.y, z: c.z, r: c.r} as any}>
						<g transform={`translate(${540 + sx} ${960 + sy}) rotate(${c.r}) scale(${c.z}) translate(${-540 + c.x} ${-960 + c.y})`}>{children(t, f)}</g>
					</CamCtx.Provider>
				</g>
				<rect x={0} y={0} width={1080} height={1920} fill="url(#lumiere)" />
				{Array.from({length: 22}).map((_, i) => {
					const vx = (rnd(i) - 0.5) * 0.8, vy = -0.3 - rnd(i + 1) * 0.5;
					const x = ((rnd(i + 2) * 1080 + (f + debut * 30) * vx) % 1080 + 1080) % 1080;
					const y = ((rnd(i + 3) * 1920 + (f + debut * 30) * vy) % 1920 + 1920) % 1920;
					return <circle key={i} cx={x} cy={y} r={2 + rnd(i + 4) * 4} fill={nuit ? '#ffe9b0' : '#fffbe8'} opacity={0.25 + 0.25 * Math.sin(f * 0.05 + i)} />;
				})}
				<rect x={0} y={0} width={1080} height={1920} fill="url(#vignette)" />
			</svg>
		</AbsoluteFill>
	);
};

const Exterieur: React.FC<{id: string; f: number; sol?: number; dx?: number; nuages?: boolean; soleil?: boolean}> = ({id, f, sol = 1250, dx = 0, nuages = true, soleil = true}) => (
	<>
		<Couche d={0.05}><Ciel id={id} /></Couche>
		<Couche d={0.15}>{soleil && <Soleil x={850} y={330} f={f} />}</Couche>
		<Couche d={0.3}>{nuages && (<><Nuage x={((200 - dx * 0.2 + f * 0.4) % 1500 + 1500) % 1500 - 200} y={260} s={1.1} /><Nuage x={((900 - dx * 0.2 + f * 0.25) % 1500 + 1500) % 1500 - 200} y={520} s={0.8} /></>)}</Couche>
		<Couche d={0.55} flou={2}><Collines y={sol - 120} dx={dx} /></Couche>
		<Sol y={sol} dx={dx} />
	</>
);

/* ----- carte de l'Australie ----- */
const CONTOUR = [[114.1,-21.8],[116.8,-20.6],[121,-19.5],[122.2,-18],[123.6,-16.3],[125.5,-14.5],[127.8,-14.2],[129.5,-14.9],[130.3,-12.4],[132.6,-11.5],[135.9,-12.2],[136.9,-12.3],[135.5,-14.9],[137.7,-16.3],[139.4,-17.5],[141.5,-15.5],[141.6,-12.6],[142.5,-10.7],[143.5,-14],[145.3,-15.5],[146,-18.9],[149,-21],[150.8,-23.5],[153.2,-25.5],[153.6,-28.2],[153,-31],[151.3,-33.8],[150.1,-36.5],[149.9,-37.5],[147,-38.5],[144.9,-37.9],[143.5,-38.8],[140.8,-38],[139.6,-37],[138.5,-35.6],[138.1,-34.2],[137.5,-33.2],[135.9,-34.8],[134.2,-32.9],[131.2,-31.5],[126,-32.3],[123.5,-33.9],[119.5,-34.4],[117.9,-35.1],[115.1,-34.3],[115.6,-33.3],[115.8,-31.9],[115,-29.5],[114,-26.5],[113.6,-24.5],[113.7,-22.5]];
const TAS = [[144.6,-40.7],[148.3,-40.9],[148,-43.2],[146.8,-43.6],[145.2,-42.2]];
const px = (lon: number) => (lon - 112) * 20 + 120;
const py = (lat: number) => (-lat - 10) * 21 + 640;
const chemin = (pts: number[][]) => 'M ' + pts.map(([a, b]) => `${px(a)} ${py(b)}`).join(' L ') + ' Z';

/* =============== les plans =============== */
export const P01: React.FC = () => (
	<Plan debut={0} fin={3.26} sansEntree cam={(t) => ({z: lin(t, [0, 3.26], [1.45, 1.22], ease), x: lin(t, [0, 3.26], [120, -40], ease), y: -230})}>
		{(t, f) => (
			<>
				<Exterieur id="c1" f={f} />
				<Humain x={lin(t, [0, 1.2], [80, 430], sortie)} y={1420} s={1.3} f={f} pose="drapeau" pas={t < 1.2} humeur={t > 3.0 ? 'perplexe' : 'content'} medailles={2} regard={t > 3.0 ? 1 : 0} />
				{t > 2.8 && <Emu x={lin(t, [2.8, 3.15], [1350, 830], sortie)} y={1440} s={1.05} f={f} flip regard={-1} court={t < 3.15} vitesse={0.9} />}
				<Ecran><Titre x={540} y={400} texte="1932" taille={240} k={pop(t, 0.19, 0.4)} rot={-4} /></Ecran>
			</>
		)}
	</Plan>
);

export const P02: React.FC = () => (
	<Plan debut={3.26} fin={4.57} cam={(t) => ({z: lin(t, [3.26, 4.57], [1.15, 1.38], ease), x: lin(t, [3.26, 4.57], [-80, -200], ease), y: lin(t, [3.26, 4.57], [-80, -160])})}>
		{(t, f) => (
			<>
				<Exterieur id="c2" f={f} />
				<Humain x={250} y={1440} s={1.3} f={f} pose="blanc" humeur="triste" />
				<g transform="translate(830 1440)">
					<rect x={-130} y={-110} width={260} height={110} rx={10} fill="#8a5a35" stroke={INK} strokeWidth={7} />
					<text x={0} y={-42} textAnchor="middle" fontFamily={FONT} fontSize={44} fill="#3b2414">BALLES</text>
				</g>
				<Emu x={lin(t, [3.26, 3.6], [1000, 830])} y={lin(t, [3.26, 3.6], [1440, 1330]) - Math.sin(lin(t, [3.26, 3.6], [0, Math.PI])) * 180} s={1.0} f={f} flip regard={-1} teteHaute={lin(t, [3.6, 3.8], [0, 1])} />
			</>
		)}
	</Plan>
);

export const P03: React.FC = () => (
	<Plan debut={4.57} fin={6.41} fond="#3f97cf" cam={(t) => ({z: lin(t, [5.33, 6.3], [1, 1.45], sortie), x: lin(t, [5.33, 6.3], [0, 230], sortie), y: lin(t, [5.33, 6.3], [0, -120], sortie)})}>
		{(t, f) => {
			const k = lin(t, [5.33, 5.8], [0, 1]);
			return (
				<>
					<rect x={-800} y={-800} width={2680} height={3600} fill="#3f97cf" />
					{Array.from({length: 14}).map((_, i) => (
						<path key={i} d={`M ${(i % 4) * 300 - 100 + Math.sin(f * 0.05 + i) * 20} ${250 + Math.floor(i / 4) * 420 + (i % 2) * 150} q 20 -14 40 0 q 20 14 40 0`} stroke="#8fd0f2" strokeWidth={6} fill="none" strokeLinecap="round" />
					))}
					<defs><clipPath id="carte"><path d={chemin(CONTOUR)} /></clipPath></defs>
					<path d={chemin(CONTOUR)} fill="#e9a25a" stroke={INK} strokeWidth={9} strokeLinejoin="round" transform="translate(10 14)" opacity={0.35} />
					<path d={chemin(CONTOUR)} fill="#e9a25a" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
					<rect clipPath="url(#carte)" x={0} y={0} width={px(129) } height={2000} fill={BLE} opacity={k} />
					<path d={`M ${px(129)} ${py(-14.9)} L ${px(129)} ${py(-31.7)}`} stroke={INK} strokeWidth={5} strokeDasharray="14 12" opacity={k} />
					<path d={chemin(TAS)} fill="#e9a25a" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
					<Ecran><Titre x={540} y={400} texte="AUSTRALIE" taille={120} k={pop(t, 4.62) * lin(t, [5.3, 5.5], [1, 0])} c="#fff" /></Ecran>
					{t > 5.9 && (
						<g transform={`translate(${px(118.5)} ${py(-30.6)}) scale(${pop(t, 5.9)})`}>
							<circle r={40 + (f % 30)} fill="none" stroke="#c0392b" strokeWidth={6} opacity={1 - (f % 30) / 30} />
							<path d="M 0 0 C -40 -50 -40 -95 0 -95 C 40 -95 40 -50 0 0 Z" fill="#c0392b" stroke={INK} strokeWidth={6} />
							<circle cx={0} cy={-62} r={14} fill="#fff" />
						</g>
					)}
				</>
			);
		}}
	</Plan>
);

const ENTREES = Array.from({length: 16}).map((_, i) => ({ti: 6.45 + i * 0.09, x: 120 + rnd(i * 3) * 860, y: 1160 + rnd(i * 7) * 380}));
export const P04: React.FC = () => (
	<Plan debut={6.41} fin={8.82} cam={(t) => ({z: lin(t, [6.41, 8.82], [1.35, 1.15], ease), x: lin(t, [6.41, 8.82], [-260, 120], ease), y: -230})}>
		{(t, f) => (
			<>
				<Ciel id="c4" />
				<Soleil x={180} y={300} f={f} />
				<Nuage x={760} y={330} />
				<Collines y={930} />
				<rect x={-800} y={1000} width={2680} height={1600} fill="#e8b552" stroke={INK} strokeWidth={6} />
				<Ble y0={1010} f={f} rangs={4} />
				{[...ENTREES].sort((a, b) => a.y - b.y).map((e, i) => {
					const x = lin(t, [e.ti, e.ti + 1.1], [1350 + rnd(i) * 200, e.x], sortie);
					const arrive = t > e.ti + 1.1;
					return <Emu key={i} x={x} y={e.y} s={0.45 + (e.y - 1160) / 380 * 0.35} f={f} ph={i} court={!arrive} flip={!arrive} mange={arrive ? 0.6 + 0.4 * Math.sin(f * 0.3 + i) : 0} />;
				})}
				<Couche d={1.25} flou={5}><Ble y0={1560} f={f} rangs={3} /></Couche>
				{t > 6.65 && (
					<Ecran><g transform={`translate(540 420) scale(${pop(t, 6.65)})`}>
						<rect x={-330} y={-120} width={660} height={270} rx={40} fill="#fff" stroke={INK} strokeWidth={8} />
						<text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={150} fill="#c0392b">{Math.round(lin(t, [6.65, 7.5], [0, 20000])).toLocaleString('fr-FR')}</text>
						<text x={0} y={118} textAnchor="middle" fontFamily={FONT} fontSize={52} fill={INK}>ÉMEUS</text>
					</g></Ecran>
				)}
			</>
		)}
	</Plan>
);

export const P05: React.FC = () => (
	<Plan debut={8.82} fin={13.5} cam={(t) => (t < 12.04 ? {z: lin(t, [8.82, 10.5, 12.04], [1.7, 1.5, 1.15], ease), x: lin(t, [8.82, 10.5, 12.04], [-60, 140, 0], ease), y: lin(t, [8.82, 10.5, 12.04], [-420, 230, -120], ease)} : {z: 1.2, x: Math.sin(t * 6) * 10, y: -150 + Math.abs(Math.sin(t * 11)) * 14, r: Math.sin(t * 5) * 1.5})}>
		{(t, f) => {
			const court = t >= 12.04;
			const dx = court ? (t - 12.04) * 2600 : 0;
			return (
				<>
					<Exterieur id="c5" f={f} dx={dx} sol={1300} />
					{court && Array.from({length: 7}).map((_, i) => (
						<rect key={i} x={((1400 - ((t - 12.04) * 3200 + i * 260) % 1700))} y={700 + i * 110} width={260} height={10} rx={5} fill="#fff" opacity={0.8} />
					))}
					{court && [0, 1, 2].map((i) => {
						const bx = ((1500 - ((t - 12.04) * 2600 + i * 700) % 1800));
						return <Buisson key={i} x={bx} y={1330} s={0.7} />;
					})}
					{!court && (
						<g transform={`translate(250 1500) scale(1, ${pop(t, 9.6, 0.5)})`}>
							<rect x={-26} y={-860} width={52} height={860} fill="#fff7e0" stroke={INK} strokeWidth={7} />
							{Array.from({length: 9}).map((_, i) => <line key={i} x1={-26} y1={-i * 100} x2={i % 2 ? 0 : 14} y2={-i * 100} stroke={INK} strokeWidth={6} />)}
							<rect x={-26} y={-860} width={52} height={30} fill="#c0392b" stroke={INK} strokeWidth={6} />
						</g>
					)}
					{!court && <Titre x={250} y={560} texte="2 m" taille={110} k={pop(t, 10.5)} />}
					<Emu x={court ? 520 : 620} y={1500} s={1.6} f={f} court={court} vitesse={0.75} regard={court ? 1 : -0.6} />
					{!court && t > 11.29 && t < 12.04 && <Titre x={820} y={690} texte="?" taille={170} k={pop(t, 11.29)} c="#fff" rot={12} />}
					{court && <Ecran><Titre x={540} y={400} texte="50 km/h" taille={150} k={pop(t, 12.77)} rot={-5} /></Ecran>}
					{court && [0, 1, 2, 3].map((i) => {
						const k = ((t - 12.04) * 3 + i * 0.25) % 1;
						return <circle key={i} cx={360 - k * 400} cy={1480 - k * 60} r={20 + k * 50} fill="#e9c79a" stroke={INK} strokeWidth={4} opacity={1 - k} />;
					})}
				</>
			);
		}}
	</Plan>
);

export const P06: React.FC = () => (
	<Plan debut={13.5} fin={14.65} cam={(t) => ({z: lin(t, [13.5, 14.65], [1.25, 1.55], ease), x: 80, y: lin(t, [13.5, 14.65], [-150, -300])})} secousse={(t) => (Math.sin((t - 13.5) * 9) > 0.9 ? 10 : 0)}>
		{(t, f) => {
			const mange = 0.55 + 0.45 * Math.abs(Math.sin((t - 13.5) * 9));
			const prog = lin(t, [13.7, 14.5], [0, 1]);
			return (
				<>
					<Exterieur id="c6" f={f} sol={1200} />
					<rect x={-800} y={1260} width={2680} height={1400} fill="#e8b552" stroke={INK} strokeWidth={6} />
					<Emu x={420} y={1560} s={1.7} f={f} mange={mange} />
					<Ble y0={1330} f={f} rangs={5} mange={(x) => x > 380 && x < 380 + prog * 900} xmin={380} />
					<Ble y0={1330} f={f} rangs={5} ras xmax={380 + prog * 900} xmin={380} />
					{Array.from({length: 8}).map((_, i) => {
						const k = ((t - 13.5) * 2.5 + i * 0.13) % 1;
						return <ellipse key={i} cx={760 + rnd(i) * 160 + k * 40} cy={1480 - k * 180 + k * k * 260} rx={7} ry={14} fill={BLE} stroke={INK} strokeWidth={3} opacity={1 - k} />;
					})}
					<Ecran><Titre x={540} y={400} texte="MIAM" taille={140} k={pop(t, 13.77)} rot={6} c="#fff" /></Ecran>
				</>
			);
		}}
	</Plan>
);

export const P07: React.FC = () => (
	<Plan debut={14.65} fin={16.38} cam={(t) => ({z: lin(t, [14.65, 15.5, 16.38], [1.7, 1.6, 1.2], ease), x: lin(t, [14.65, 15.5, 16.38], [320, -300, 0], ease), y: lin(t, [14.65, 16.38], [-330, -200], ease)})}>
		{(t, f) => (
			<>
				<Exterieur id="c7" f={f} sol={1180} />
				<rect x={-800} y={1220} width={2680} height={1400} fill="#d9a85a" stroke={INK} strokeWidth={6} />
				<Ble y0={1240} f={f} rangs={7} ras />
				<Humain x={230} y={1520} s={1.08} f={f} chapeau="paille" couleur="#5c7fa6" medailles={2} humeur="fache" ph={1} />
				<Humain x={540} y={1560} s={1.18} f={f} chapeau="paille" couleur="#8a6a4a" medailles={3} humeur="fache" />
				<Humain x={850} y={1520} s={1.08} f={f} chapeau="paille" couleur="#6f8c4e" medailles={2} humeur="fache" ph={2} flip />
				{t > 15.56 && [[190, 1295], [505, 1310], [815, 1295]].map(([sx, sy], i) => (
					<g key={i} transform={`translate(${sx} ${sy}) scale(${pop(t, 15.56 + i * 0.08) * (1 + 0.2 * Math.sin(f * 0.5))}) rotate(${f * 4})`}>
						<path d="M 0 -50 L 10 -10 L 50 0 L 10 10 L 0 50 L -10 10 L -50 0 L -10 -10 Z" fill="#fff6b0" stroke={INK} strokeWidth={4} />
					</g>
				))}
				<Ecran><Titre x={540} y={400} texte="ANCIENS SOLDATS" taille={92} k={pop(t, 15.56)} c="#fff" /></Ecran>
			</>
		)}
	</Plan>
);

export const P08: React.FC = () => (
	<Plan debut={16.38} fin={19.42} cam={(t) => ({z: lin(t, [16.38, 17.0, 18.15, 19.42], [1.5, 1.15, 1.1, 1.3], ease), x: lin(t, [16.38, 17.0, 18.15, 19.42], [200, 0, -60, -160], ease), y: lin(t, [16.38, 17.0, 19.42], [-500, -80, 120], ease)})}>
		{(t, f) => (
			<>
				<Exterieur id="c8" f={f} sol={1180} />
				<rect x={-800} y={1220} width={2680} height={1400} fill="#d9a85a" stroke={INK} strokeWidth={6} />
				<Ble y0={1240} f={f} rangs={5} ras />
				<Humain x={330} y={1700} s={1.75} f={f} chapeau="paille" couleur="#8a6a4a" medailles={3} humeur="crie" pose="crie" />
				<Bulle x={690} y={640} w={620} h={400} k={pop(t, 16.66, 0.4)} queue={[-200, 330]}>
					{t < 18.15 ? (
						<text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={170} fill="#c0392b">!!!</text>
					) : (
						<g transform={`scale(${pop(t, 18.15)})`}><Mitrailleuse x={-110} y={-10} s={0.95} f={f} /></g>
					)}
				</Bulle>
			</>
		)}
	</Plan>
);

export const P09: React.FC = () => (
	<Plan debut={19.42} fin={20.6} fond="#8a5a35" secousse={(t) => (t > 20.32 && t < 20.55 ? 30 : 0)} cam={(t) => ({z: lin(t, [19.42, 20.25, 20.6], [1.0, 1.25, 1.4], ease), y: lin(t, [19.42, 20.6], [0, -260], ease), r: lin(t, [19.42, 20.6], [-4, 2])})}>
		{(t, f) => {
			const descend = lin(t, [19.9, 20.32], [-700, 0], Easing.in(Easing.cubic));
			const remonte = lin(t, [20.4, 20.6], [0, -500]);
			return (
				<>
					<rect x={-800} y={-800} width={2680} height={3600} fill="#8a5a35" />
					{Array.from({length: 9}).map((_, i) => <path key={i} d={`M -100 ${i * 240 + 60} q 600 40 1300 0`} stroke="#734a2b" strokeWidth={8} fill="none" />)}
					<g transform="translate(540 1000) rotate(-3)">
						<rect x={-340} y={-470} width={680} height={900} rx={10} fill="#000" opacity={0.2} transform="translate(16 16)" />
						<rect x={-340} y={-470} width={680} height={900} rx={10} fill="#fbf6e6" stroke={INK} strokeWidth={7} />
						<text x={0} y={-370} textAnchor="middle" fontFamily={FONT} fontSize={60} fill={INK}>DEMANDE</text>
						<text x={0} y={-300} textAnchor="middle" fontFamily={FONT} fontSize={46} fill="#7a5532">des mitrailleuses</text>
						{Array.from({length: 7}).map((_, i) => <rect key={i} x={-260} y={-220 + i * 60} width={i % 3 === 2 ? 340 : 520} height={16} rx={8} fill="#cfc6ad" />)}
						{t > 20.32 && (
							<g transform={`translate(30 280) rotate(-12) scale(${lin(t, [20.32, 20.42], [1.4, 1])})`}>
								<rect x={-200} y={-90} width={400} height={180} rx={20} fill="none" stroke="#c0392b" strokeWidth={14} />
								<text x={0} y={52} textAnchor="middle" fontFamily={FONT} fontSize={150} fill="#c0392b">OUI</text>
							</g>
						)}
					</g>
					<g transform={`translate(570 ${1080 + descend + remonte})`}>
						<rect x={-130} y={-60} width={260} height={70} rx={14} fill="#c0392b" stroke={INK} strokeWidth={7} />
						<rect x={-34} y={-260} width={68} height={210} rx={14} fill="#6b4a2b" stroke={INK} strokeWidth={7} />
						<circle cx={0} cy={-290} r={60} fill="#7a5532" stroke={INK} strokeWidth={7} />
					</g>
				</>
			);
		}}
	</Plan>
);

const CAISSES = [22.77, 22.95, 23.13, 23.3, 23.46];
export const P10: React.FC = () => (
	<Plan debut={20.6} fin={24.33} cam={(t) => ({z: lin(t, [20.6, 21.6, 22.6, 23.6, 24.33], [1.2, 1.5, 1.4, 1.35, 1.2], ease), x: lin(t, [20.6, 21.6, 22.3, 23.3, 24.33], [100, 220, -20, -330, -100], ease), y: lin(t, [20.6, 21.6, 22.6, 24.33], [-200, -280, -360, -220], ease)})}>
		{(t, f) => (
			<>
				<Exterieur id="c10" f={f} />
				{t > 21.1 && <Humain x={lin(t, [21.1, 21.5], [-200, 270], sortie)} y={1560} s={1.3} f={f} chapeau="kepi" moustache medailles={4} pose={t > 21.6 ? 'salut' : 'marche'} humeur="content" />}
				{t > 21.87 && <Mitrailleuse x={560} y={1330} s={0.9 * pop(t, 21.87)} f={f} />}
				{t > 22.06 && <Mitrailleuse x={600} y={1520} s={1.0 * pop(t, 22.06)} f={f} />}
				{CAISSES.map((ct, i) => {
					if (t < ct) return null;
					const yy = lin(t, [ct, ct + 0.18], [-200, 1560 - Math.floor(i / 2) * 100 - (i === 4 ? 100 : 0)], Easing.in(Easing.quad));
					const xx = 870 + (i % 2) * 110 - (i === 4 ? 55 : 0) - 55;
					return (
						<g key={i} transform={`translate(${xx} ${yy})`}>
							<rect x={-55} y={-100} width={110} height={100} rx={8} fill="#8a5a35" stroke={INK} strokeWidth={6} />
							<line x1={-55} y1={-50} x2={55} y2={-50} stroke={INK} strokeWidth={4} opacity={0.5} />
						</g>
					);
				})}
				<Ecran><Titre x={540} y={400} texte={t < 22.77 ? (t > 21.87 ? 'MAJOR + 2' : 'MAJOR') : `${Math.round(lin(t, [22.77, 23.5], [0, 10000])).toLocaleString('fr-FR')} BALLES`} taille={110} k={pop(t, 21.24)} c="#fff" /></Ecran>
			</>
		)}
	</Plan>
);

export const P11: React.FC = () => (
	<Plan debut={24.33} fin={26.58} cam={(t) => ({z: 1.35, x: lin(t, [24.33, 26.58], [260, -120]), y: -300})}>
		{(t, f) => (
			<>
				<Exterieur id="c11" f={f} />
				{[0, 1, 2, 3].map((i) => (
					<Emu key={i} x={720 + i * 110} y={1330 + (i % 2) * 120} s={0.7} f={f} ph={i * 2} mange={0.55 + 0.45 * Math.sin(f * 0.25 + i)} />
				))}
				{[0, 1, 2].map((i) => (
					<Humain key={i} x={lin(t, [24.33, 26.58], [-60 + i * 170, 140 + i * 170])} y={1560 + (i % 2) * 40} s={0.95} f={f * 0.6} pose="accroupi" humeur="perplexe" ph={i} regard={1} />
				))}
				<Ecran><Titre x={540} y={400} texte="JOUR 1" taille={130} k={pop(t, 24.39)} /></Ecran>
			</>
		)}
	</Plan>
);

export const P12: React.FC = () => (
	<Plan debut={26.58} fin={29.28} secousse={(t) => (t > 26.95 && t < 27.4 ? 18 : 0)} cam={(t) => ({z: lin(t, [26.58, 26.95, 27.7], [1.6, 1.65, 1.05], Easing.out(Easing.cubic)), x: lin(t, [26.58, 27.7, 29.28], [-140, 0, 60]), y: lin(t, [26.58, 27.7], [-420, -150], Easing.out(Easing.cubic))})}>
		{(t, f) => (
			<>
				<Exterieur id="c12" f={f} />
				{Array.from({length: 9}).map((_, i) => {
					const a = (i / 9) * Math.PI * 2 + 0.3;
					const k = lin(t, [26.95, 28.6], [0, 1], Easing.in(Easing.quad));
					const x = 680 + Math.cos(a) * 900 * k + (i % 3) * 40;
					const y = 1350 + Math.sin(a) * 300 * k + (i % 2) * 60;
					return <Emu key={i} x={x} y={y} s={0.6} f={f} ph={i} court={t > 26.95} vitesse={0.8} flip={Math.cos(a) < 0} mange={t < 26.95 ? 0.7 : 0} />;
				})}
				{t > 26.95 && Array.from({length: 6}).map((_, i) => {
					const k = lin(t, [26.95 + i * 0.05, 27.9 + i * 0.05], [0, 1]);
					return <circle key={i} cx={680 + (rnd(i) - 0.5) * 300} cy={1380 - k * 80} r={30 + k * 90} fill="#e9c79a" stroke={INK} strokeWidth={4} opacity={1 - k} />;
				})}
				<Humain x={220} y={1620} s={1.2} f={f} pose="vise" humeur="choc" flip={Math.floor(t * 4) % 2 === 0 && t > 27.4} />
			</>
		)}
	</Plan>
);

export const P13: React.FC = () => (
	<Plan debut={29.28} fin={30.67} cam={() => ({z: 1})}>
		{(t, f) => {
			const cx = 540 + Math.sin(t * 7) * 140, cy = 980 + Math.cos(t * 5.3) * 90;
			return (
				<>
					<Exterieur id="c13" f={f} />
					{[0, 1, 2].map((i) => {
						const k = ((t - 29.28) * 1.4 + i * 0.37) % 1;
						const dir = i % 2 ? 1 : -1;
						return <Emu key={i} x={dir > 0 ? -300 + k * 1700 : 1400 - k * 1700} y={1150 + i * 120} s={0.85} f={f} court vitesse={0.9} flip={dir < 0} ph={i} />;
					})}
					<defs>
						<mask id="lunette">
							<rect x={-800} y={-800} width={2680} height={3600} fill="#fff" />
							<circle cx={cx} cy={cy} r={330} fill="#000" />
						</mask>
					</defs>
					<rect x={-800} y={-800} width={2680} height={3600} fill="#111" mask="url(#lunette)" />
					<circle cx={cx} cy={cy} r={330} fill="none" stroke={INK} strokeWidth={22} />
					<path d={`M ${cx - 330} ${cy} L ${cx + 330} ${cy} M ${cx} ${cy - 330} L ${cx} ${cy + 330}`} stroke="#c0392b" strokeWidth={5} />
					<Titre x={540} y={470} texte="???" taille={160} k={pop(t, 29.78)} c="#fff" />
				</>
			);
		}}
	</Plan>
);

export const P14: React.FC = () => (
	<Plan debut={30.67} fin={35.83} cam={(t) => ({z: lin(t, [30.67, 32.5, 34.0, 35.83], [1.9, 1.6, 1.15, 1.1], ease), x: lin(t, [30.67, 34.0], [-90, 0], ease), y: lin(t, [30.67, 32.5, 34.0], [330, 200, -170], ease)})}>
		{(t, f) => {
			const tourne = Math.floor((t - 30.67) / 0.9) % 2 === 1;
			return (
				<>
					<Exterieur id="c14" f={f} />
					<Termitiere x={560} y={1300} />
					<Emu x={560} y={1090} s={1.0} f={f} chef flip={tourne} teteHaute={1} regard={1} />
					{t > 33.4 && (
						<g opacity={0.35 + 0.15 * Math.sin(f * 0.4)}>
							<path d={`M ${tourne ? 440 : 680} 560 L ${tourne ? -200 : 1300} ${420 + Math.sin(f * 0.1) * 120} L ${tourne ? -200 : 1300} ${760 + Math.sin(f * 0.1) * 120} Z`} fill="#fff6b0" />
						</g>
					)}
					<Titre x={tourne ? 760 : 330} y={420} texte="LE CHEF" taille={100} k={pop(t, 31.8)} c="#fff" />
					{[0, 1, 2, 3].map((i) => (
						<Emu key={i} x={150 + i * 260} y={1520 + (i % 2) * 70} s={0.75} f={f} ph={i * 3} mange={t > 34.02 ? 0.5 + 0.5 * Math.abs(Math.sin(f * 0.25 + i)) : 0.15} flip={i % 2 === 1} />
					))}
				</>
			);
		}}
	</Plan>
);

export const P15: React.FC = () => (
	<Plan debut={35.83} fin={38.37} cam={(t) => ({z: lin(t, [35.83, 38.37], [1.55, 1.2], ease), x: lin(t, [35.83, 38.37], [230, -80], ease), y: lin(t, [35.83, 38.37], [-420, -230], ease)})}>
		{(t, f) => (
			<>
				<Exterieur id="c15" f={f} />
				<Mare x={620} y={1360} f={f} />
				<Titre x={620} y={1220} texte="POINT D'EAU" taille={70} k={pop(t, 37.6)} c="#fff" />
				<g>
					{[0, 1].map((i) => (
						<g key={i} transform={`translate(${130 + i * 150} ${1520 - Math.max(0, Math.sin(t * 2 + i)) * 20})`}>
							<ellipse cx={0} cy={-80} rx={90} ry={18} fill="#a08550" stroke={INK} strokeWidth={6} />
							<path d="M -48 -80 Q -44 -132 0 -136 Q 44 -132 48 -80 Z" fill={KHAKI} stroke={INK} strokeWidth={6} />
						</g>
					))}
					<Mitrailleuse x={260} y={1500} s={0.8} f={f} pied={false} />
					<Couche d={1.2} flou={3}><Buisson x={200} y={1690} s={1.5} bouge={Math.sin(f * 0.3) * 2} /></Couche>
				</g>
				<Ecran><Titre x={540} y={400} texte="LE PIÈGE" taille={130} k={pop(t, 36.6)} /></Ecran>
			</>
		)}
	</Plan>
);

export const P16: React.FC = () => (
	<Plan debut={38.37} fin={39.77} cam={(t) => ({z: lin(t, [38.37, 39.77], [1.15, 1.35], ease), x: lin(t, [38.37, 39.77], [-200, 60], ease), y: -230})}>
		{(t, f) => (
			<>
				<Exterieur id="c16" f={f} />
				<Mare x={620} y={1360} f={f} />
				{Array.from({length: 14}).map((_, i) => {
					const row = i % 3;
					const ti = 38.37 + (i / 14) * 0.9;
					const x = lin(t, [ti, ti + 0.8], [1350 + row * 80, 520 + (i * 67) % 520], sortie);
					const y = 1240 + row * 70 + (i % 2) * 20;
					const arrive = t > ti + 0.8;
					return <Emu key={i} x={x} y={y} s={0.48 + row * 0.08} f={f} ph={i} court={!arrive} flip={!arrive} mange={arrive ? 0.8 : 0} />;
				})}
				<Ecran><Titre x={540} y={400} texte="1 000 ÉMEUS" taille={120} k={pop(t, 38.37)} /></Ecran>
				<Couche d={1.2} flou={3}><Buisson x={200} y={1690} s={1.5} bouge={Math.sin(f * 0.6) * 3} /></Couche>
				<Mitrailleuse x={260} y={1500} s={0.8} f={f} pied={false} />
			</>
		)}
	</Plan>
);

export const P17: React.FC = () => (
	<Plan debut={39.77} fin={40.95} secousse={(t) => (t > 39.9 && t < 40.4 ? 26 : 0)} cam={(t) => ({z: lin(t, [39.77, 39.95, 40.95], [1.6, 1.08, 1.2], Easing.out(Easing.cubic)), y: lin(t, [39.77, 40.95], [-200, -60])})}>
		{(t, f) => (
			<>
				<Ciel id="c17" haut="#ff9e3d" bas="#ffe08a" />
				{Array.from({length: 16}).map((_, i) => (
					<rect key={i} x={-20} y={-1400} width={40} height={1400} fill="#fff" opacity={0.25} transform={`translate(540 900) rotate(${i * 22.5 + f})`} />
				))}
				<Humain x={540} y={1760} s={2.0} f={f} chapeau="kepi" moustache medailles={4} pose="crie" humeur="crie" />
				<Ecran><Titre x={540} y={400} texte="FEU !" taille={260} k={pop(t, 39.77, 0.3)} c="#ff4b2b" rot={-6} /></Ecran>
			</>
		)}
	</Plan>
);

export const P18: React.FC = () => (
	<Plan debut={40.95} fin={42.93} cam={(t) => ({z: lin(t, [40.95, 41.3, 41.8, 42.93], [1.2, 1.45, 1.75, 1.6], ease), x: lin(t, [40.95, 41.8, 42.93], [0, -40, -120], ease), y: lin(t, [40.95, 41.8, 42.93], [-250, -330, -300], ease)})}>
		{(t, f) => (
			<>
				<Exterieur id="c18" f={f} />
				{[0, 1, 2].map((i) => <Emu key={i} x={lin(t, [41.2, 42.9], [700 + i * 120, 1500 + i * 120])} y={1230 + i * 40} s={0.55} f={f} court vitesse={0.8} ph={i} />)}
				<Humain x={250} y={1760} s={1.6} f={f} humeur="choc" regard={1} />
				<Mitrailleuse x={430} y={1420} s={1.6} f={f} tir={t < 41.1} fumee={lin(t, [41.82, 42.9], [0, 1])} rot={lin(t, [41.82, 42.2], [0, 8])} />
				<Titre x={720} y={1150} texte="CLIC" taille={130} k={pop(t, 41.3)} c="#fff" rot={-8} />
				<Titre x={820} y={980} texte="CLIC" taille={100} k={pop(t, 41.75)} c="#fff" rot={10} />
			</>
		)}
	</Plan>
);

export const P19: React.FC = () => (
	<Plan debut={42.93} fin={46.11} cam={(t) => (t < 43.94 ? {z: lin(t, [42.93, 43.94], [1.3, 1.5], ease), y: lin(t, [42.93, 43.94], [-200, 0], ease)} : {z: lin(t, [43.94, 46.11], [1.15, 1.35], ease), x: 540 - Math.max(lin(t, [43.94, 45.0], [-500, 540], sortie), 380), y: -260})}>
		{(t, f) => (
			<>
				<Exterieur id="c19" f={f} />
				{t < 43.94 ? (
					<>
						<Humain x={540} y={1650} s={1.7} f={f} chapeau="kepi" moustache medailles={4} humeur="content" pose="debout" />
						<Ampoule x={540} y={880} k={pop(t, 43.02)} f={f} />
					</>
				) : (
					<>
						<Camion x={lin(t, [43.94, 45.0], [-500, 540], sortie)} y={1450} s={1.25} f={f} tireur humeurTireur="content" bosse={3} roule={t < 45 ? 1 : 0} />
						<Ecran><Titre x={540} y={400} texte="LE CAMION" taille={120} k={pop(t, 45.26)} /></Ecran>
					</>
				)}
			</>
		)}
	</Plan>
);

export const P20: React.FC = () => (
	<Plan debut={46.11} fin={49.42} cam={(t) => ({z: lin(t, [46.11, 49.42], [1.3, 1.5], ease), x: lin(t, [46.11, 49.42], [60, -40]), y: -230 + Math.abs(Math.sin(t * 9)) * 18, r: Math.sin(t * 9) * 1.6})}>
		{(t, f) => {
			const dx = (t - 46.11) * 900;
			let d = 'M -900 2600 L -900 1420 ';
			for (let x = -900; x <= 2000; x += 30) d += `L ${x} ${1420 - Math.abs(Math.sin((x + dx) / 90)) * 40} `;
			d += 'L 2000 2600 Z';
			return (
				<>
					<Ciel id="c20" />
					<Soleil x={850} y={330} f={f} />
					<Collines y={1150} dx={dx * 0.3} />
					<path d={d} fill="#d9773b" stroke={INK} strokeWidth={6} />
					<Camion x={540} y={1400} s={1.25} f={f} tireur bosse={46} humeurTireur="choc" />
					{Array.from({length: 5}).map((_, i) => {
						const k = ((t - 46.11) * 2 + i * 0.2) % 1;
						return <circle key={i} cx={260 - k * 500} cy={1440 - k * 120} r={25 + k * 70} fill="#e9c79a" stroke={INK} strokeWidth={4} opacity={1 - k} />;
					})}
					{t > 48.8 && (
						<Ecran><g transform={`translate(540 420) scale(${pop(t, 48.8)})`}>
							<rect x={-380} y={-100} width={760} height={200} rx={40} fill="#fff" stroke={INK} strokeWidth={8} />
							<text x={0} y={-25} textAnchor="middle" fontFamily={FONT} fontSize={60} fill={INK}>BALLES TIRÉES</text>
							<text x={0} y={75} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#c0392b">0</text>
						</g></Ecran>
					)}
				</>
			);
		}}
	</Plan>
);

export const P21: React.FC = () => (
	<Plan debut={49.42} fin={51.68} cam={(t) => ({z: lin(t, [49.42, 51.68], [1.25, 1.45], ease), x: lin(t, [49.42, 51.68], [160, -140]), y: -280, r: Math.sin(t * 8) * 0.8})}>
		{(t, f) => {
			const dx = (t - 49.42) * 700;
			return (
				<>
					<Exterieur id="c21" f={f} dx={dx} />
					<Camion x={420} y={1440} s={1.0} f={f} tireur bosse={20} humeurTireur="triste" />
					{[0, 1, 2, 3].map((i) => (
						<Emu key={i} x={lin(t, [49.42 + i * 0.2, 51.5 + i * 0.2], [-250, 1350])} y={1560 + (i % 2) * 70} s={0.85} f={f} court vitesse={0.95} ph={i} regard={i === 1 ? -1 : 1} cligne={i === 1 && t > 50.6} />
					))}
				</>
			);
		}}
	</Plan>
);

export const P22: React.FC = () => (
	<Plan debut={51.68} fin={54.88} cam={(t) => (t < 52.78 ? {z: lin(t, [51.68, 52.78], [1.1, 1.4], ease), x: lin(t, [51.68, 52.78], [-100, 40]), y: -220} : {z: lin(t, [52.78, 53.97, 54.88], [1.6, 1.3, 1.25], ease), x: lin(t, [53.97, 54.88], [0, -80]), y: lin(t, [52.78, 53.97], [60, -230], ease)})}>
		{(t, f) => (t < 52.78 ? (
			<>
				<rect x={-800} y={-800} width={2680} height={3600} fill="#1e2a4a" />
				<circle cx={860} cy={1050} r={260} fill="#ffd27a" opacity={0.12} />
				<Humain x={480} y={1500} s={1.6} f={f} chapeau="kepi" moustache medailles={4} pose="ecrit" humeur="perplexe" />
				<rect x={120} y={1290} width={860} height={60} rx={10} fill="#7a5532" stroke={INK} strokeWidth={7} />
				<rect x={600} y={1230} width={260} height={70} rx={6} fill="#fbf6e6" stroke={INK} strokeWidth={6} transform="rotate(-4 730 1265)" />
				<g transform="translate(860 1290)">
					<path d="M -20 0 L -10 -200 L 10 -200 L 20 0 Z" fill="#555" stroke={INK} strokeWidth={6} />
					<path d="M -90 -190 L 90 -190 L 50 -290 L -50 -290 Z" fill="#2f7a4a" stroke={INK} strokeWidth={6} />
				</g>
				<Ecran><Titre x={540} y={400} texte="RAPPORT" taille={130} k={pop(t, 51.76)} c="#fff" /></Ecran>
			</>
		) : (
			<>
				<Exterieur id="c22" f={f} />
				<Emu x={lin(t, [53.97, 54.88], [560, 640])} y={1450} s={1.25} f={f} casque chenilles={t > 53.97} regard={-1} />
				{Array.from({length: 5}).map((_, i) => {
					const t0 = 52.85 + i * 0.25;
					if (t < t0) return null;
					const k = lin(t, [t0, t0 + 0.4], [0, 1]);
					return (
						<g key={i}>
							<circle cx={350 + k * -400} cy={900 + i * 70 - k * 300 * (i % 2 ? 1 : -1)} r={10} fill="#e0b84a" stroke={INK} strokeWidth={4} />
							{k < 0.3 && <path d={`M 400 ${900 + i * 70} l 30 -30 m -30 30 l 40 0 m -40 0 l 30 30`} stroke="#ffd23f" strokeWidth={8} strokeLinecap="round" />}
						</g>
					);
				})}
				<Ecran><Titre x={540} y={400} texte="PING !" taille={130} k={pop(t, 52.9)} c="#fff" /></Ecran>
			</>
		))}
	</Plan>
);

export const P23: React.FC = () => (
	<Plan debut={54.88} fin={60.97} cam={(t) => (t < 57.68 ? {z: lin(t, [54.88, 57.68], [1.3, 1.15], ease), x: lin(t, [54.88, 57.68], [140, -40], ease), y: lin(t, [54.88, 57.68], [-380, -60], ease)} : {z: lin(t, [57.68, 60.97], [1.25, 1.05], ease), y: lin(t, [57.68, 60.97], [-500, 100], ease)})}>
		{(t, f) => (t < 57.68 ? (
			<>
				<rect x={-800} y={-800} width={2680} height={3600} fill="#1e2a4a" />
				<Humain x={300} y={1720} s={1.5} f={f} chapeau="kepi" moustache medailles={4} pose="crie" humeur="content" />
				<Bulle x={600} y={760} w={820} h={620} k={pop(t, 55.05, 0.45)} queue={[-260, 420]} pensee>
					<defs><clipPath id="bulle"><rect x={-400} y={-300} width={800} height={600} rx={260} /></clipPath></defs>
					<g clipPath="url(#bulle)">
						<rect x={-420} y={-320} width={840} height={640} fill="#bfe3f2" />
						<rect x={-420} y={80} width={840} height={260} fill="#e7a263" />
						{Array.from({length: 10}).map((_, i) => (
							<Emu key={i} x={-380 + ((i % 5) * 190 + (t - 55) * 120) % 950} y={130 + Math.floor(i / 5) * 120} s={0.3 + Math.floor(i / 5) * 0.06} f={f} casque court vitesse={0.4} ph={i} />
						))}
					</g>
				</Bulle>
			</>
		) : (
			<>
				<Ciel id="c23" haut="#5aa9e0" bas="#ffd9a0" />
				{t > 58.88 && (
					<g transform={`translate(540 560) scale(${pop(t, 58.88)}) rotate(${f * 0.6})`}>
						<circle r={170} fill="#4ea4d9" stroke={INK} strokeWidth={8} />
						<path d="M -110 -60 q 40 -50 90 -20 q 30 30 -10 60 q -50 30 -80 -40 M 30 40 q 50 -30 90 10 q -10 60 -60 70 q -40 -20 -30 -80" fill="#6f9e45" stroke={INK} strokeWidth={6} />
					</g>
				)}
				<Collines y={1000} />
				<Sol y={1100} />
				{Array.from({length: 4}).map((_, r) => Array.from({length: 4 + r}).map((__, i) => {
					const s = 0.38 + r * 0.16;
					const x = 540 + (i - (3 + r) / 2) * 260 * s * 1.6;
					const y = 1200 + r * r * 40 + r * 60 + ((t - 57.68) * 30 * (r + 1));
					return <Emu key={`${r}-${i}`} x={x} y={y} s={s} f={f} casque court vitesse={0.35} ph={i % 2 ? Math.PI : 0} regard={0} />;
				}))}
			</>
		))}
	</Plan>
);

export const P24: React.FC = () => (
	<Plan debut={60.97} fin={63.97} cam={(t) => ({z: lin(t, [60.97, 63.97], [1.4, 1.15], ease), x: lin(t, [60.97, 63.97], [-120, 120], ease), y: lin(t, [60.97, 63.97], [-330, 0], ease)})}>
		{(t, f) => (
			<>
				<Ciel id="c24" haut="#6b4fa0" bas="#ff9e5a" />
				<Soleil x={540} y={1060} r={190} f={f} c="#ffb347" />
				<Collines y={1150} c="#8a4a5a" c2="#6b3a4a" />
				<Sol y={1250} c="#9a5440" />
				<Camion x={lin(t, [60.97, 63.97], [700, -350])} y={1430} s={0.75} f={f} flip tireur humeurTireur="triste" bosse={6} />
				{Array.from({length: 5}).map((_, i) => {
					const k = ((t - 61) * 1.5 + i * 0.2) % 1;
					return <circle key={i} cx={lin(t, [60.97, 63.97], [700, -350]) + 260 + k * 200} cy={1440 - k * 100} r={20 + k * 60} fill="#d9a07a" opacity={(1 - k) * 0.8} />;
				})}
				{[0, 1, 2].map((i) => <Emu key={i} x={760 + i * 110} y={1250 - (i % 2) * 8} s={0.5} f={f} ph={i} flip regard={-1} />)}
				<Ecran><Titre x={540} y={400} texte="5 SEMAINES" taille={120} k={pop(t, 61.49)} c="#fff" /></Ecran>
			</>
		)}
	</Plan>
);

export const P25: React.FC = () => (
	<Plan debut={63.97} fin={69.15} fond="#1e2a4a" nuit cam={(t) => ({z: lin(t, [63.97, 66.8, 69.15], [1.15, 1.0, 1.08], ease), y: lin(t, [63.97, 66.8, 69.15], [150, 0, -60], ease)})}>
		{(t, f) => {
			const n = Math.round(lin(t, [64.63, 66.13], [0, 9860], Easing.out(Easing.quad)));
			return (
				<>
					<rect x={-800} y={-800} width={2680} height={3600} fill="#1e2a4a" />
					<Ecran><Titre x={540} y={400} texte="BILAN" taille={140} k={pop(t, 64.04)} /></Ecran>
					{t > 64.6 && (
						<g transform={`translate(540 720) scale(${pop(t, 64.6)})`}>
							<text x={0} y={60} textAnchor="middle" fontFamily={FONT} fontSize={210} fill="#fff">{n.toLocaleString('fr-FR')}</text>
							<text x={0} y={160} textAnchor="middle" fontFamily={FONT} fontSize={70} fill="#9fb3d9">balles tirées</text>
						</g>
					)}
					{Array.from({length: 40}).map((_, i) => {
						const t0 = 64.6 + rnd(i) * 1.6;
						if (t < t0) return null;
						const yy = Math.min(lin(t, [t0, t0 + 0.6], [900, 1650 - rnd(i + 5) * 60], Easing.in(Easing.quad)), 1700);
						return (
							<g key={i} transform={`translate(${260 + rnd(i + 2) * 560} ${yy}) rotate(${rnd(i + 3) * 180})`}>
								<rect x={-10} y={-26} width={20} height={44} rx={8} fill="#e0b84a" stroke={INK} strokeWidth={4} />
							</g>
						);
					})}
					{t > 66.8 && (
						<g transform={`translate(540 1080) scale(${pop(t, 66.8)})`}>
							<rect x={-420} y={-130} width={840} height={300} rx={50} fill="#ffd23f" stroke={INK} strokeWidth={9} />
							<text x={0} y={20} textAnchor="middle" fontFamily={FONT} fontSize={130} fill={INK}>10 balles</text>
							{t > 67.64 && <text x={0} y={125} textAnchor="middle" fontFamily={FONT} fontSize={80} fill="#7a2a20">par oiseau</text>}
						</g>
					)}
					{t > 67.64 && <Emu x={880} y={1020} s={0.55 * pop(t, 67.64)} f={f} cligne={t > 68.4 && t < 68.6} flip />}
				</>
			);
		}}
	</Plan>
);

export const P26: React.FC = () => (
	<Plan debut={69.15} fin={74.7} cam={(t) => ({z: lin(t, [69.15, 72.6], [1.1, 1.75], ease), x: lin(t, [69.15, 72.6], [120, -40], ease), y: lin(t, [69.15, 72.6], [-250, 60], ease)})}>
		{(t, f) => (
			<>
				<Ciel id="c26" />
				<Soleil x={850} y={330} f={f} />
				<Nuage x={260} y={300} />
				<Collines y={930} />
				<rect x={-800} y={1000} width={2680} height={1600} fill="#e8b552" stroke={INK} strokeWidth={6} />
				<Ble y0={1010} f={f} rangs={4} />
				{[0, 1, 2, 3, 4].map((i) => <Emu key={i} x={120 + i * 200} y={1180 + (i % 2) * 60} s={0.5} f={f} ph={i * 2} mange={0.5 + 0.5 * Math.abs(Math.sin(f * 0.2 + i))} flip={i % 2 === 0} />)}
				<Ble y0={1300} f={f} rangs={2} />
				<Emu x={560} y={1640} s={1.4} f={f} chapeau regard={t > 71.0 ? 0.6 : -0.5} cligne={t > 71.55 && t < 71.85} mange={t < 70.2 ? 0.6 + 0.4 * Math.sin(f * 0.3) : 0} />
				<Couche d={1.3} flou={5}><Ble y0={1700} f={f} rangs={2} /></Couche>
				<Ecran><Titre x={540} y={400} texte="FIN" taille={170} k={pop(t, 72.4)} /></Ecran>
			</>
		)}
	</Plan>
);

export const PLANS: [number, number, React.FC][] = [
	[0, 3.26, P01], [3.26, 4.57, P02], [4.57, 6.41, P03], [6.41, 8.82, P04], [8.82, 13.5, P05], [13.5, 14.65, P06],
	[14.65, 16.38, P07], [16.38, 19.42, P08], [19.42, 20.6, P09], [20.6, 24.33, P10], [24.33, 26.58, P11], [26.58, 29.28, P12],
	[29.28, 30.67, P13], [30.67, 35.83, P14], [35.83, 38.37, P15], [38.37, 39.77, P16], [39.77, 40.95, P17], [40.95, 42.93, P18],
	[42.93, 46.11, P19], [46.11, 49.42, P20], [49.42, 51.68, P21], [51.68, 54.88, P22], [54.88, 60.97, P23], [60.97, 63.97, P24],
	[63.97, 69.15, P25], [69.15, 74.7, P26],
];
