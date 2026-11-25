import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, delayRender, continueRender, interpolate, Easing} from 'remotion';
import {PLANS} from './plans';
import minutage from './minutage.json';
import {versNouveau} from './temps';

const FPS = 30;
export const DUREE = Math.round(versNouveau(74.7) * FPS);
const fr = (s: number) => Math.round(s * FPS);

type Mot = {w: string; s: number; e: number; seg: number};
const MOTS = (minutage as {mots: Mot[]}).mots.map((m) => ({...m, w: m.w.replace(/[«»]/g, '')}));
// groupes de 1 à 3 mots, coupés à la ponctuation
const GROUPES: Mot[][] = [];
let g: Mot[] = [];
MOTS.forEach((m, i) => {
	g.push(m);
	const fin = /[.,!?…:]$/.test(m.w) || g.length >= 3 || (MOTS[i + 1] && MOTS[i + 1].seg !== m.seg) || (MOTS[i + 1] && MOTS[i + 1].s - m.e > 0.35);
	if (fin) { GROUPES.push(g); g = []; }
});
if (g.length) GROUPES.push(g);

const SousTitres: React.FC = () => {
	const t = useCurrentFrame() / FPS;
	const idx = GROUPES.findIndex((gr, i) => t >= gr[0].s - 0.05 && t < (GROUPES[i + 1] ? Math.min(GROUPES[i + 1][0].s - 0.05, gr[gr.length - 1].e + 0.6) : gr[gr.length - 1].e + 0.6));
	if (idx < 0) return null;
	const gr = GROUPES[idx];
	const k = interpolate(t, [gr[0].s - 0.05, gr[0].s + 0.12], [0.75, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.5))});
	return (
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1395}}>
			<div style={{transform: `scale(${k})`, textAlign: 'center', maxWidth: 980, lineHeight: 1.05}}>
				{gr.map((m, i) => {
					const actif = t >= m.s - 0.03;
					return (
						<span key={i} style={{fontFamily: 'Lilita', fontSize: 104, color: actif ? '#FFD23F' : '#ffffff', WebkitTextStroke: '20px #1a0f08', paintOrder: 'stroke fill', margin: '0 12px', display: 'inline-block', textShadow: '0 10px 0 rgba(0,0,0,0.35)'}}>
							{m.w.replace(/[.,:]$/, '')}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

const SONS: [number, string, number?][] = [
	[0.19, 'tampon'], [2.87, 'boing', 0.6], [3.3, 'triste', 0.7], [5.9, 'pop'], [6.65, 'pop'],
	[10.5, 'pop'], [12.77, 'pop'], [13.77, 'pop', 0.5], [15.56, 'ping', 0.4], [16.66, 'pop'], [18.15, 'pop'],
	[20.32, 'tampon'], [21.87, 'pop'], [22.06, 'pop'], [22.95, 'caisse'], [23.13, 'caisse'], [23.3, 'caisse'], [23.46, 'caisse'], [23.64, 'caisse'],
	[24.39, 'pop'], [29.78, 'boing', 0.5], [31.8, 'pop'], [36.6, 'pop'], [39.77, 'tampon'], [39.9, 'rafale'],
	[41.3, 'clic'], [41.75, 'clic'], [43.02, 'ampoule'], [45.26, 'pop'],
	[46.3, 'boing', 0.6], [46.75, 'boing', 0.6], [47.2, 'boing', 0.6], [47.65, 'boing', 0.6], [48.1, 'boing', 0.6], [48.55, 'boing', 0.6], [48.8, 'pop'], 
	[51.76, 'pop'], [52.85, 'ping'], [53.1, 'ping'], [53.35, 'ping'], [53.6, 'ping'], [53.85, 'ping'], [53.97, 'caisse'],
	[55.3, 'pop'], [58.88, 'pop'], [61.49, 'pop'], [64.04, 'tampon'], [64.6, 'pop'], [66.8, 'pop'], [67.64, 'boing', 0.6], [72.4, 'tampon'],
];

export const Film: React.FC = () => {
	const [h] = useState(() => delayRender('police'));
	useEffect(() => {
		const ff = new FontFace('Lilita', `url(${staticFile('Lilita.woff2')})`);
		ff.load().then(() => { (document.fonts as any).add(ff); continueRender(h); });
	}, [h]);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{PLANS.map(([a, b, P], i) => (
				<Sequence key={i} from={fr(versNouveau(a))} durationInFrames={fr(versNouveau(b)) - fr(versNouveau(a))}>
					<P />
				</Sequence>
			))}
			<SousTitres />
			<Audio src={staticFile('voix_finale.wav')} />
			<Audio src={staticFile('sons/marche.wav')} volume={(f) => interpolate(f, [0, 15, DUREE - 60, DUREE], [0, 0.16, 0.16, 0], {extrapolateRight: 'clamp'})} />
			{SONS.map(([s, n, v], i) => (
				<Sequence key={'s' + i} from={fr(versNouveau(s))} durationInFrames={fr(1.5)}>
					<Audio src={staticFile(`sons/${n}.wav`)} volume={v ?? 0.45} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
