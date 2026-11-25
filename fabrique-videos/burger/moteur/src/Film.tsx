import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, delayRender, continueRender, interpolate, Easing} from 'remotion';
import {PLANS7 as PLANS} from './plans7';
import minutage from './minutage.json';
import {versNouveau} from './temps';

const FPS = 30;
export const DUREE = Math.round(versNouveau(77.2) * FPS);
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
	[0.7, 'tampon'], [1.9, 'pop'], [3.6, 'pop', 0.3], [4.1, 'pop', 0.3], [5.1, 'pop', 0.3], [5.6, 'pop'], [7.5, 'tampon'], [7.9, 'caisse'], [9.4, 'pop'],
	[15.5, 'pop'], [17.1, 'pop'], [20.5, 'tampon'], [21.4, 'pop'], [22.2, 'pop'], [23.4, 'boing', 0.5], [24.2, 'ping', 0.4], [26.7, 'pop'], [27.4, 'ampoule'],
	[29.9, 'tampon'], [32.5, 'pop', 0.25], [34.2, 'boing', 0.4], [36.1, 'pop'], [38.8, 'ampoule'], [41.0, 'pop'], [42.7, 'pop'], [46.4, 'pop'], [48.4, 'tampon'],
	[53.0, 'pop'], [53.4, 'caisse', 0.5], [55.7, 'tampon'], [59.5, 'ampoule'], [60.4, 'pop'], [63.0, 'caisse'], [64.6, 'pop'], [66.6, 'pop'], [68.5, 'pop'],
	[71.0, 'tampon'], [72.6, 'ampoule'], [75.2, 'tampon'],
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
