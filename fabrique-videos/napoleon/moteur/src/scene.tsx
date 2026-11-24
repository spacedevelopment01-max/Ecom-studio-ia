import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {versNouveau, versAncien} from './temps';
import {
	Arbre,
	INK, BLE, KHAKI, FONT, rnd, lin, pop, sortie, Ciel, Soleil, Nuage, Collines, Sol, Ble, Buisson, Mare, Termitiere,
	Emu, Humain, Mitrailleuse, Camion, Titre, Bulle, Ampoule,
} from './dessins';

type Cam = {z: number; x?: number; y?: number; r?: number};
type PlanP = {debut: number; fin: number; cam?: (t: number) => Cam; fond?: string; children: (t: number, f: number) => React.ReactNode; secousse?: (t: number) => number; nuit?: boolean; sansEntree?: boolean};

export const CamCtx = React.createContext<{x: number; y: number; z: number}>({x: 0, y: 0, z: 1});
/* une couche du décor : d < 1 = loin (bouge moins), d > 1 = près (bouge plus) */
export const Couche: React.FC<{d: number; flou?: number; children: React.ReactNode}> = ({d, flou = 0, children}) => {
	const c = React.useContext(CamCtx);
	const k = Math.pow(c.z, d - 1);
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
export const Plan: React.FC<PlanP> = ({debut, fin, cam, fond = '#000', children, secousse, nuit, sansEntree}) => {
	const f = useCurrentFrame();
	const t = versAncien(versNouveau(debut) + f / 30);
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
	const nb = Math.round((versNouveau(fin) - versNouveau(debut)) * 30);
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

export const Exterieur0: React.FC<{id: string; f: number; sol?: number; dx?: number; nuages?: boolean; soleil?: boolean}> = ({id, f, sol = 1250, dx = 0, nuages = true, soleil = true}) => (
	<>
		<Couche d={0.05}><Ciel id={id} /></Couche>
		<Couche d={0.15}>{soleil && <Soleil x={850} y={330} f={f} />}</Couche>
		<Couche d={0.3}>{nuages && (<><Nuage x={((200 - dx * 0.2 + f * 0.4) % 1500 + 1500) % 1500 - 200} y={260} s={1.1} /><Nuage x={((900 - dx * 0.2 + f * 0.25) % 1500 + 1500) % 1500 - 200} y={520} s={0.8} /></>)}</Couche>
		<Couche d={0.55} flou={2}><Collines y={sol - 120} dx={dx} /></Couche>
		<Sol y={sol} dx={dx} />
	</>
);


export const Exterieur: React.FC<{id: string; f: number; sol?: number; dx?: number; nuages?: boolean; soleil?: boolean; arbres?: boolean}> = ({id, f, sol = 1250, dx = 0, nuages = true, soleil = true, arbres = true}) => (
	<>
		<Couche d={0.05}><Ciel id={id} haut="#74c4f0" bas="#e8f6d8" /></Couche>
		<Couche d={0.15}>{soleil && <Soleil x={850} y={330} f={f} />}</Couche>
		<Couche d={0.3}>{nuages && (<><Nuage x={((200 - dx * 0.2 + f * 0.4) % 1500 + 1500) % 1500 - 200} y={260} s={1.1} /><Nuage x={((900 - dx * 0.2 + f * 0.25) % 1500 + 1500) % 1500 - 200} y={520} s={0.8} /></>)}</Couche>
		<Couche d={0.5} flou={2}><Collines y={sol - 120} dx={dx} c="#9ccc6a" c2="#7fb24a" />{arbres && [-250, 80, 420, 760, 1100, 1400].map((x, i) => <Arbre key={i} x={((x - dx * 0.5) % 1800 + 1800) % 1800 - 300} y={sol - 70 - (i % 2) * 30} s={0.75 + (i % 3) * 0.12} f={f} />)}</Couche>
		<Sol y={sol} dx={dx} c="#7db24a" cail="#5f9437" />
	</>
);
