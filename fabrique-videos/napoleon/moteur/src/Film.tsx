import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, delayRender, continueRender, interpolate, Easing} from 'remotion';
import {PLANS2 as PLANS} from './plans2';
import minutage from './minutage.json';

const FPS = 30;
export const DUREE = Math.round(71.3 * FPS);
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
	[0.26, 'tampon'], [2.57, 'boing', 0.5], [4.83, 'tampon'], [7.04, 'pop'], [8.92, 'pop'], [12.13, 'pop'], [14.21, 'pop'], [15.29, 'pop'], [16.34, 'pop'],
	[18.99, 'tampon'], [21.26, 'clic'], [21.42, 'clic'], [21.58, 'clic'], [22.87, 'clic', 0.6], [24.3, 'pop', 0.3], [25.98, 'pop'],
	[29.19, 'tampon'], [29.5, 'boing', 0.35], [29.9, 'boing', 0.35], [30.3, 'boing', 0.35], [31.0, 'boing', 0.35], [31.4, 'boing', 0.35], [33.2, 'pop'],
	[36.71, 'caisse'], [37.59, 'clic', 0.7], [38.35, 'rafale', 0.5], [41.6, 'tampon'], [43.02, 'boing', 0.5], [46.83, 'tampon'], [48.37, 'pop'],
	[50.2, 'boing', 0.4], [50.5, 'boing', 0.4], [50.8, 'boing', 0.4], [52.56, 'ampoule'], [56.11, 'tampon'], [57.69, 'ping', 0.35], [57.8, 'ping', 0.35], [57.9, 'ping', 0.35],
	[62.77, 'pop'], [67.78, 'pop'], [69.4, 'tampon'],
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
				<Sequence key={i} from={fr(a)} durationInFrames={fr(b) - fr(a)}>
					<P />
				</Sequence>
			))}
			<SousTitres />
			<Audio src={staticFile('voix_finale.wav')} />
			<Audio src={staticFile('sons/marche.wav')} volume={(f) => interpolate(f, [0, 15, DUREE - 60, DUREE], [0, 0.16, 0.16, 0], {extrapolateRight: 'clamp'})} />
			{SONS.map(([s, n, v], i) => (
				<Sequence key={'s' + i} from={fr(s)} durationInFrames={fr(1.5)}>
					<Audio src={staticFile(`sons/${n}.wav`)} volume={v ?? 0.45} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
