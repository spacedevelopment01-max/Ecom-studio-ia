import React from 'react';
import {interpolate, Easing} from 'remotion';

export const INK = '#2a1a10';
export const KHAKI = '#b9a066';
export const KHAKI_F = '#8f7845';
export const PEAU = '#f5c9a0';
export const BLE = '#f2c14e';
export const BLE_F = '#d39a22';
export const TERRE = '#d9773b';
export const TERRE_F = '#b85c2a';
export const FONT = 'Lilita, sans-serif';

export const rnd = (i: number) => {
	const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
	return x - Math.floor(x);
};
export const lin = (t: number, a: number[], b: number[], ease?: (n: number) => number) =>
	interpolate(t, a, b, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
export const pop = (t: number, t0: number, d = 0.35) =>
	lin(t, [t0, t0 + d], [0, 1], Easing.out(Easing.back(2.2)));
export const sortie = Easing.out(Easing.cubic);

/* ---------- décors ---------- */
export const Ciel: React.FC<{id: string; haut?: string; bas?: string}> = ({id, haut = '#6cc0ee', bas = '#ffe6ad'}) => (
	<>
		<defs>
			<linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor={haut} />
				<stop offset="1" stopColor={bas} />
			</linearGradient>
		</defs>
		<rect x={-3000} y={-3000} width={7080} height={8000} fill={`url(#${id})`} />
	</>
);

export const Soleil: React.FC<{x: number; y: number; r?: number; f: number; c?: string}> = ({x, y, r = 90, f, c = '#ffd84a'}) => (
	<g transform={`translate(${x} ${y}) rotate(${f * 0.3})`}>
		{Array.from({length: 12}).map((_, i) => (
			<rect key={i} x={-8} y={-r - 55} width={16} height={34} rx={8} fill={c} opacity={0.8} transform={`rotate(${i * 30})`} />
		))}
		<circle r={r} fill={c} stroke={INK} strokeWidth={6} />
	</g>
);

export const Nuage: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.95}>
		<ellipse cx={0} cy={0} rx={110} ry={42} fill="#fff" />
		<circle cx={-40} cy={-22} r={45} fill="#fff" />
		<circle cx={30} cy={-34} r={55} fill="#fff" />
	</g>
);

export const Collines: React.FC<{y: number; c?: string; c2?: string; dx?: number}> = ({y, c = '#e7a263', c2 = '#c9824a', dx = 0}) => {
	const vague = (amp: number, per: number, off: number) => {
		let d = `M -900 ${y + 400} `;
		for (let x = -900; x <= 2000; x += 40) d += `L ${x} ${y - amp * Math.sin((x + dx * off) / per) - amp} `;
		return d + `L 2000 ${y + 400} Z`;
	};
	return (
		<>
			<path d={vague(50, 160, 0.3)} fill={c} stroke={INK} strokeWidth={5} />
			<path d={vague(28, 110, 0.6)} transform="translate(0 60)" fill={c2} stroke={INK} strokeWidth={5} />
		</>
	);
};

export const Sol: React.FC<{y: number; c?: string; dx?: number; cail?: string}> = ({y, c = TERRE, dx = 0, cail = TERRE_F}) => (
	<>
		<rect x={-900} y={y} width={2900} height={2400} fill={c} stroke={INK} strokeWidth={6} />
		{Array.from({length: 26}).map((_, i) => {
			const px = ((rnd(i) * 2400 - dx) % 2400 + 2400) % 2400 - 700;
			return <ellipse key={i} cx={px} cy={y + 40 + rnd(i + 9) * 900} rx={10 + rnd(i + 3) * 18} ry={6 + rnd(i + 4) * 6} fill={cail} opacity={0.6} />;
		})}
	</>
);

export const Ble: React.FC<{y0: number; rangs?: number; f: number; mange?: (x: number, y: number) => boolean; ras?: boolean; xmin?: number; xmax?: number}> = ({y0, rangs = 7, f, mange, ras, xmin = -300, xmax = 1380}) => {
	const tiges: React.ReactNode[] = [];
	for (let r = 0; r < rangs; r++) {
		const y = y0 + r * r * 9 + r * 38;
		const s = 0.7 + r * 0.12;
		for (let x = xmin + (r % 2) * 20; x < xmax; x += 34 * s) {
			if (mange && mange(x, y)) continue;
			const k = r * 1000 + x;
			const h = (ras ? 20 : 95 + rnd(k) * 30) * s;
			const sw = ras ? 0 : Math.sin(f * 0.06 + x * 0.01 + r) * 6 * s;
			tiges.push(
				<g key={k}>
					<path d={`M ${x} ${y} Q ${x + sw * 0.3} ${y - h * 0.5} ${x + sw} ${y - h}`} stroke={BLE_F} strokeWidth={5 * s} fill="none" strokeLinecap="round" />
					{!ras && <ellipse cx={x + sw} cy={y - h - 14 * s} rx={9 * s} ry={22 * s} fill={BLE} stroke={INK} strokeWidth={3} transform={`rotate(${sw * 2} ${x + sw} ${y - h - 14 * s})`} />}
				</g>,
			);
		}
	}
	return <g>{tiges}</g>;
};

export const Buisson: React.FC<{x: number; y: number; s?: number; bouge?: number}> = ({x, y, s = 1, bouge = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${bouge})`}>
		{[[-90, -50, 70], [-20, -95, 85], [70, -60, 72], [0, -30, 80], [-120, -10, 50], [120, -15, 55]].map(([cx, cy, r], i) => (
			<circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? '#6f9e45' : '#5d8c3a'} stroke={INK} strokeWidth={6} />
		))}
		{[[-60, -80], [40, -110], [90, -40], [-20, -20]].map(([cx, cy], i) => (
			<circle key={'b' + i} cx={cx} cy={cy} r={12} fill="#8cc160" />
		))}
	</g>
);

export const Mare: React.FC<{x: number; y: number; f: number}> = ({x, y, f}) => (
	<g transform={`translate(${x} ${y})`}>
		<ellipse rx={380} ry={95} fill="#4ea4d9" stroke={INK} strokeWidth={7} />
		<ellipse cx={-60} cy={-20} rx={180 + Math.sin(f * 0.1) * 10} ry={28} fill="#8fd0f2" opacity={0.7} />
		<ellipse cx={120} cy={25} rx={90} ry={14} fill="#bfe6fa" opacity={0.6} />
	</g>
);

export const Termitiere: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g transform={`translate(${x} ${y})`}>
		<path d="M -170 0 Q -150 -120 -90 -170 Q -40 -260 10 -230 Q 60 -280 100 -180 Q 160 -100 170 0 Z" fill="#c4683a" stroke={INK} strokeWidth={7} />
		<path d="M -60 -120 q 20 -20 40 0 M 30 -80 q 20 -15 40 5 M -110 -40 q 15 -15 35 0" stroke={INK} strokeWidth={5} fill="none" opacity={0.5} />
	</g>
);

/* ---------- l'émeu ---------- */
type EmuP = {
	x: number; y: number; s?: number; f: number; court?: boolean; vitesse?: number; mange?: number; flip?: boolean;
	regard?: number; casque?: boolean; chapeau?: boolean; chef?: boolean; cligne?: boolean; teteHaute?: number; chenilles?: boolean; ph?: number;
};
export const Emu: React.FC<EmuP> = ({x, y, s = 1, f, court, vitesse = 0.42, mange = 0, flip, regard = 0, casque, chapeau, chef, cligne, teteHaute = 0, chenilles, ph = 0}) => {
	const phase = f * vitesse + ph;
	const corps = chef ? '#3e3027' : '#5d4838';
	const plume = chef ? '#57463a' : '#7a6150';
	const cou = '#7d95ad';
	const by = court ? -Math.abs(Math.sin(phase)) * 16 : chenilles ? Math.sin(f * 0.9) * 2 : Math.sin(f * 0.08 + ph) * 3;
	const jambes: React.ReactNode[] = [];
	if (!chenilles) {
		for (let k = 0; k < 2; k++) {
			const p = phase + k * Math.PI;
			const hx = k ? 12 : -12, hy = -185 + by;
			let fx: number, fy: number;
			if (court) { fx = hx + Math.sin(p) * 75; fy = -Math.max(0, Math.cos(p)) * 50; }
			else { fx = hx + (k ? 22 : -22); fy = 0; }
			const kx = (hx + fx) / 2 - 36, ky = (hy + fy) / 2 + 5;
			jambes.push(
				<g key={k} opacity={k ? 1 : 0.85}>
					<path d={`M ${hx} ${hy} L ${kx} ${ky} L ${fx} ${fy}`} stroke={INK} strokeWidth={19} fill="none" strokeLinecap="round" strokeLinejoin="round" />
					<path d={`M ${hx} ${hy} L ${kx} ${ky} L ${fx} ${fy}`} stroke="#a3988e" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
					<path d={`M ${fx} ${fy} l 34 2 M ${fx} ${fy} l 26 -12 M ${fx} ${fy} l -16 4`} stroke={INK} strokeWidth={8} strokeLinecap="round" />
				</g>,
			);
		}
	}
	// corps hirsute
	const pts: string[] = [];
	const N = 30;
	for (let i = 0; i <= N; i++) {
		const a = (i / N) * Math.PI * 2;
		const bas = Math.sin(a) > 0.1;
		const j = bas ? (i % 2 ? 1.0 : 0.86) : 1;
		pts.push(`${-10 + Math.cos(a) * 140 * j},${-255 + by + Math.sin(a) * 92 * j}`);
	}
	const hh = lin(mange, [0, 1], [0, 1]);
	const baseX = 80, baseY = -300 + by;
	const tx = 120 + teteHaute * -10, ty = -525 - teteHaute * 40 + by;
	const ex = 190, ey = -45;
	const vif = court ? 0 : 1 - hh;
	const Hx = tx + (ex - tx) * hh + Math.sin(f * 0.09 + ph) * 10 * vif, Hy = ty + (ey - ty) * hh + Math.cos(f * 0.07 + ph * 2) * 7 * vif;
	const cligneAuto = ((f + ph * 37) % 83) < 3;
	const cx = baseX + 60 + hh * 60, cy = (baseY + Hy) / 2 - 20 * (1 - hh);
	const rot = hh * 80 + Math.sin(f * 0.05 + ph) * 8 * vif + (court ? Math.sin(phase) * 6 : 0);
	return (
		<g transform={`translate(${x} ${y}) scale(${(flip ? -1 : 1) * s} ${s})`}>
			<ellipse cx={0} cy={6} rx={130} ry={18} fill="#000" opacity={0.18} />
			{chenilles && (
				<g transform="translate(-10 -60)">
					<rect x={-190} y={-70} width={380} height={130} rx={65} fill="#4b4f45" stroke={INK} strokeWidth={8} />
					{[-130, -65, 0, 65, 130].map((wx) => (
						<g key={wx} transform={`translate(${wx} -5) rotate(${f * 12})`}>
							<circle r={42} fill="#6c7263" stroke={INK} strokeWidth={6} />
							<rect x={-6} y={-38} width={12} height={76} fill={INK} opacity={0.5} />
						</g>
					))}
					<rect x={-150} y={-120} width={300} height={60} rx={20} fill="#5d6b45" stroke={INK} strokeWidth={7} />
				</g>
			)}
			{jambes}
			<polygon points={pts.join(' ')} fill={corps} stroke={INK} strokeWidth={7} strokeLinejoin="round" transform={chenilles ? 'translate(0 -40)' : ''} />
			<g transform={chenilles ? 'translate(0 -40)' : ''}>
				{[[-80, -270], [-30, -230], [20, -280], [60, -240], [-110, -230]].map(([px, py], i) => (
					<path key={i} d={`M ${px} ${py + by} q 18 22 36 0`} stroke={plume} strokeWidth={7} fill="none" strokeLinecap="round" />
				))}
				<path d={`M 20 ${-250 + by + Math.sin(f * 0.5) * (court ? 10 : 2)} q 40 -10 60 20`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
				<path d={`M ${baseX} ${baseY} Q ${cx} ${cy} ${Hx} ${Hy}`} stroke={INK} strokeWidth={48} fill="none" strokeLinecap="round" />
				<path d={`M ${baseX} ${baseY} Q ${cx} ${cy} ${Hx} ${Hy}`} stroke={cou} strokeWidth={34} fill="none" strokeLinecap="round" />
				<g transform={`translate(${Hx} ${Hy}) rotate(${rot})`}>
					<path d="M -14 -26 l -8 -22 M -2 -30 l 0 -24 M 10 -28 l 8 -20" stroke={INK} strokeWidth={6} strokeLinecap="round" />
					<ellipse rx={38} ry={32} fill="#6b8299" stroke={INK} strokeWidth={7} />
					<path d="M 28 -6 Q 78 2 30 16 Z" fill="#4a4442" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
					{cligne || cligneAuto ? (
						<path d="M -4 -10 q 14 10 28 0" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
					) : (
						<>
							<circle cx={10} cy={-8} r={16} fill="#fff" stroke={INK} strokeWidth={5} />
							<circle cx={13 + regard * 5} cy={-8} r={7.5} fill={INK} />
						</>
					)}
					{chef && <path d="M -8 -30 L 26 -22" stroke={INK} strokeWidth={7} strokeLinecap="round" />}
					{casque && (
						<g>
							<path d="M -46 -12 A 46 40 0 0 1 46 -12 Z" fill="#5d6b45" stroke={INK} strokeWidth={6} transform="translate(-4 -18)" />
							<rect x={-60} y={-34} width={110} height={10} rx={5} fill="#4b5737" stroke={INK} strokeWidth={4} />
						</g>
					)}
					{chapeau && (
						<g transform="translate(-6 -30) rotate(-8)">
							<ellipse rx={78} ry={15} fill="#a08550" stroke={INK} strokeWidth={6} />
							<path d="M -42 0 Q -40 -56 0 -60 Q 40 -56 42 0 Z" fill={KHAKI} stroke={INK} strokeWidth={6} />
							<rect x={-42} y={-16} width={84} height={12} fill="#5a4325" />
							<path d="M -42 -2 L -80 -4 L -56 -50 Z" fill="#a08550" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
						</g>
					)}
				</g>
			</g>
		</g>
	);
};

/* ---------- les humains ---------- */
type Humeur = 'content' | 'fache' | 'choc' | 'triste' | 'perplexe' | 'neutre' | 'crie' | 'pouffe';
type Pose = 'debout' | 'drapeau' | 'blanc' | 'vise' | 'crie' | 'salut' | 'marche' | 'accroupi' | 'ecrit' | 'main' | 'baton' | 'fouet' | 'tirair';
type HP = {
	x: number; y: number; s?: number; f: number; pose?: Pose; humeur?: Humeur; chapeau?: 'brousse' | 'kepi' | 'paille' | 'bicorne' | 'plume' | 'haut' | 'aucun';
	moustache?: boolean; medailles?: number; flip?: boolean; couleur?: string; regard?: number; ph?: number; drapeauC?: string; pas?: boolean; jambesC?: string; meche?: boolean; peau?: string; cravate?: string; cheveux?: string;
};
export const Humain: React.FC<HP> = ({x, y, s = 1, f, pose = 'debout', humeur = 'neutre', chapeau = 'brousse', moustache, medailles = 0, flip, couleur = KHAKI, regard = 0, ph = 0, drapeauC = '#2f5fa8', pas, jambesC = KHAKI_F, meche, peau = PEAU, cravate, cheveux = '#6a4426'}) => {
	const marche = pas || pose === 'marche' || pose === 'accroupi';
	const ferme = ['neutre', 'fache', 'triste', 'perplexe', 'content'].includes(humeur) && ((f + ph * 29) % 97) < 3;
	const p = f * 0.35 + ph;
	const bas = pose === 'accroupi' ? 50 : 0;
	const by = (marche ? -Math.abs(Math.sin(p)) * 8 : Math.sin(f * 0.07 + ph) * 2) + bas;
	const jambes = [0, 1].map((k) => {
		const hx = k ? 24 : -24;
		const sw = marche ? Math.sin(p + k * Math.PI) * 30 : 0;
		const kneeX = pose === 'accroupi' ? hx + 40 : hx + sw / 2;
		const kneeY = pose === 'accroupi' ? -60 : -60;
		return (
			<g key={k}>
				<path d={`M ${hx} ${-120 + by} L ${kneeX} ${kneeY} L ${hx + sw} -8`} stroke={INK} strokeWidth={36} fill="none" strokeLinecap="round" strokeLinejoin="round" />
				<path d={`M ${hx} ${-120 + by} L ${kneeX} ${kneeY} L ${hx + sw} -8`} stroke={jambesC} strokeWidth={24} fill="none" strokeLinecap="round" strokeLinejoin="round" />
				<ellipse cx={hx + sw + 10} cy={-6} rx={30} ry={14} fill="#1e1612" stroke={INK} strokeWidth={5} />
			</g>
		);
	});
	const bras = (sx: number, ex: number, ey: number, k: string) => (
		<g key={k}>
			<path d={`M ${sx} ${-228 + by} Q ${(sx + ex) / 2 + (sx > 0 ? 18 : -18)} ${(-228 + by + ey) / 2} ${ex} ${ey}`} stroke={INK} strokeWidth={32} fill="none" strokeLinecap="round" />
			<path d={`M ${sx} ${-228 + by} Q ${(sx + ex) / 2 + (sx > 0 ? 18 : -18)} ${(-228 + by + ey) / 2} ${ex} ${ey}`} stroke={couleur} strokeWidth={21} fill="none" strokeLinecap="round" />
			<circle cx={ex} cy={ey} r={15} fill={PEAU} stroke={INK} strokeWidth={5} />
		</g>
	);
	const sw = Math.sin(p) * 25;
	let brasG: React.ReactNode, brasD: React.ReactNode, objet: React.ReactNode = null;
	const hy = -310 + by;
	if (pose === 'drapeau' || pose === 'blanc') {
		brasG = bras(-58, -80, -130 + by, 'g');
		brasD = bras(58, 105, -300 + by, 'd');
		const blanc = pose === 'blanc';
		const ond = (i: number) => Math.sin(f * 0.25 - i * 0.8) * (blanc ? 6 : 16);
		let d = `M 105 ${-560 + by}`;
		for (let i = 0; i <= 6; i++) d += ` L ${105 + i * 34} ${-560 + by + ond(i) + (blanc ? i * 14 : 0)}`;
		for (let i = 6; i >= 0; i--) d += ` L ${105 + i * 34} ${-440 + by + ond(i) + (blanc ? i * 22 : 0)}`;
		objet = (
			<g>
				<path d={`M 105 ${-90 + by} L 105 ${-580 + by}`} stroke={INK} strokeWidth={16} strokeLinecap="round" />
				<path d={`M 105 ${-90 + by} L 105 ${-580 + by}`} stroke="#8a5a35" strokeWidth={8} strokeLinecap="round" />
				<path d={d + ' Z'} fill={blanc ? '#fbfbf6' : drapeauC} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				{!blanc && <path d={`M 175 ${-500 + by + ond(2)} l 10 -22 l 10 22 l -24 -14 l 28 0 Z`} fill="#fff" />}
			</g>
		);
	} else if (pose === 'vise') {
		brasG = bras(-50, 60, -205 + by, 'g');
		brasD = bras(55, 140, -215 + by, 'd');
		objet = (
			<g>
				<path d={`M -10 ${-195 + by} L 250 ${-222 + by}`} stroke={INK} strokeWidth={22} strokeLinecap="round" />
				<path d={`M -10 ${-195 + by} L 250 ${-222 + by}`} stroke="#6b4a2b" strokeWidth={12} strokeLinecap="round" />
			</g>
		);
	} else if (pose === 'crie') {
		brasG = bras(-58, -90, -150 + by + Math.sin(f * 0.6) * 10, 'g');
		brasD = bras(58, 150, -400 + by + Math.sin(f * 0.8) * 25, 'd');
	} else if (pose === 'main') {
		brasG = bras(-58, -80, -128 + by, 'g');
		brasD = bras(58, 140, -180 + by + Math.sin(f * 0.9) * 10, 'd');
	} else if (pose === 'baton' || pose === 'fouet') {
		const a = Math.sin(f * 0.7) * 0.9;
		const hx = 90 + Math.cos(a) * 40, hy2 = -380 + by + Math.sin(a) * 30;
		brasG = bras(-58, -80, -128 + by, 'g');
		brasD = bras(58, hx, hy2, 'd');
		objet = pose === 'baton'
			? <path d={`M ${hx} ${hy2} L ${hx + Math.cos(a - 1.2) * 200} ${hy2 + Math.sin(a - 1.2) * 200}`} stroke="#6b4a2b" strokeWidth={16} strokeLinecap="round" />
			: <path d={`M ${hx} ${hy2} q ${80 + Math.sin(f * 1.4) * 60} -120 ${200} ${-40 + Math.sin(f * 1.1) * 80} q 60 30 90 ${Math.cos(f) * 60}`} stroke="#3b2414" strokeWidth={7} fill="none" strokeLinecap="round" />;
	} else if (pose === 'tirair') {
		brasG = bras(-50, 10, -330 + by, 'g');
		brasD = bras(55, 40, -400 + by, 'd');
		objet = <path d={`M 20 ${-250 + by} L 50 ${-620 + by}`} stroke="#6b4a2b" strokeWidth={14} strokeLinecap="round" />;
	} else if (pose === 'salut') {
		brasG = bras(-58, -78, -128 + by, 'g');
		brasD = bras(58, 52, -380 + by, 'd');
	} else if (pose === 'ecrit') {
		brasG = bras(-58, -40, -170 + by, 'g');
		brasD = bras(58, 90 + Math.sin(f * 1.3) * 18, -170 + by + Math.cos(f * 1.7) * 6, 'd');
	} else {
		brasG = bras(-58, -80 + (marche ? sw : 0), -128 + by, 'g');
		brasD = bras(58, 80 - (marche ? sw : 0), -128 + by, 'd');
	}
	const yeux = () => {
		const ex = 26, ey = hy - 8;
		const rg = regard * 5;
		if (humeur === 'pouffe') return <path d={`M ${-ex - 14} ${ey + 2} q 14 -12 28 0 M ${ex - 14} ${ey + 2} q 14 -12 28 0`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />;
		if (ferme) return <path d={`M ${-ex - 12} ${ey} l 24 0 M ${ex - 12} ${ey} l 24 0`} stroke={INK} strokeWidth={6} strokeLinecap="round" />;
		if (humeur === 'content') return <path d={`M ${-ex - 12} ${ey + 4} q 12 -14 24 0 M ${ex - 12} ${ey + 4} q 12 -14 24 0`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />;
		if (humeur === 'choc') return (<>
			<circle cx={-ex} cy={ey} r={16} fill="#fff" stroke={INK} strokeWidth={5} /><circle cx={ex} cy={ey} r={16} fill="#fff" stroke={INK} strokeWidth={5} />
			<circle cx={-ex + rg} cy={ey} r={5} fill={INK} /><circle cx={ex + rg} cy={ey} r={5} fill={INK} />
			<path d={`M ${-ex - 14} ${ey - 30} l 26 -6 M ${ex - 12} ${ey - 36} l 26 6`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
		</>);
		const sourcils =
			humeur === 'fache' || humeur === 'crie' ? `M ${-ex - 16} ${ey - 26} l 30 12 M ${ex + 16} ${ey - 26} l -30 12` :
			humeur === 'triste' ? `M ${-ex - 14} ${ey - 16} l 26 -10 M ${ex + 14} ${ey - 16} l -26 -10` :
			humeur === 'perplexe' ? `M ${-ex - 14} ${ey - 22} l 26 0 M ${ex - 12} ${ey - 30} q 14 -10 26 4` : '';
		return (<>
			<ellipse cx={-ex + rg} cy={ey} rx={7} ry={10} fill={INK} /><ellipse cx={ex + rg} cy={ey} rx={7} ry={10} fill={INK} />
			{sourcils && <path d={sourcils} stroke={INK} strokeWidth={7} strokeLinecap="round" fill="none" />}
		</>);
	};
	const bouche = () => {
		const my = hy + 32;
		if (humeur === 'pouffe') return (<><ellipse cx={-40} cy={my - 4} rx={20} ry={14} fill="#f19a8a" /><ellipse cx={40} cy={my - 4} rx={20} ry={14} fill="#f19a8a" /><path d={`M -18 ${my + 2} q 6 -6 12 0 q 6 6 12 0 q 6 -6 12 0`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" /></>);
		if (humeur === 'content') return <path d={`M -24 ${my} q 24 26 48 0`} stroke={INK} strokeWidth={6} fill="#7a2a20" strokeLinecap="round" />;
		if (humeur === 'choc') return <ellipse cx={0} cy={my + 6} rx={14} ry={18} fill="#7a2a20" stroke={INK} strokeWidth={5} />;
		if (humeur === 'crie') return <path d={`M -30 ${my - 6} Q 0 ${my + 50 + Math.sin(f * 0.9) * 8} 30 ${my - 6} Z`} fill="#7a2a20" stroke={INK} strokeWidth={6} strokeLinejoin="round" />;
		if (humeur === 'fache' || humeur === 'triste') return <path d={`M -22 ${my + 12} q 22 -18 44 0`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />;
		if (humeur === 'perplexe') return <path d={`M -22 ${my + 4} q 11 -8 22 0 q 11 8 22 0`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />;
		return <path d={`M -16 ${my + 4} l 32 0`} stroke={INK} strokeWidth={6} strokeLinecap="round" />;
	};
	const chap = () => {
		const cy = hy - 50;
		if (chapeau === 'kepi') return (
			<g>
				<path d={`M -58 ${cy + 8} L -50 ${cy - 52} Q 0 ${cy - 70} 50 ${cy - 52} L 58 ${cy + 8} Z`} fill="#8f7845" stroke={INK} strokeWidth={6} />
				<rect x={-58} y={cy - 12} width={116} height={20} fill="#b5322c" stroke={INK} strokeWidth={4} />
				<path d={`M -10 ${cy + 8} Q 50 ${cy + 4} 84 ${cy + 22} L -10 ${cy + 22} Z`} fill="#2a2420" stroke={INK} strokeWidth={5} />
				<circle cx={0} cy={cy - 30} r={10} fill={BLE} stroke={INK} strokeWidth={3} />
			</g>
		);
		if (chapeau === 'aucun') return <path d={`M -60 ${hy - 20} Q -50 ${hy - 75} 0 ${hy - 70} Q 50 ${hy - 75} 60 ${hy - 20} Q 30 ${hy - 50} 0 ${hy - 48} Q -30 ${hy - 50} -60 ${hy - 20} Z`} fill={cheveux} stroke={INK} strokeWidth={5} />;
		if (chapeau === 'bicorne' || chapeau === 'plume') return (
			<g>
				{chapeau === 'plume' && <path d={`M -90 ${cy - 6} Q -60 ${cy - 70} 0 ${cy - 78} Q 60 ${cy - 70} 90 ${cy - 6} Q 40 ${cy - 46} 0 ${cy - 48} Q -40 ${cy - 46} -90 ${cy - 6} Z`} fill="#fff" stroke={INK} strokeWidth={4} />}
				<path d={`M -125 ${cy + 14} Q -60 ${cy - 52} 0 ${cy - 60} Q 60 ${cy - 52} 125 ${cy + 14} Q 0 ${cy - 14} -125 ${cy + 14} Z`} fill="#1b1b1e" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<path d={`M -110 ${cy + 8} Q 0 ${cy - 22} 110 ${cy + 8}`} stroke="#c9a227" strokeWidth={5} fill="none" />
				<circle cx={48} cy={cy - 22} r={16} fill="#b5322c" stroke={INK} strokeWidth={3} />
				<circle cx={48} cy={cy - 22} r={10} fill="#fff" />
				<circle cx={48} cy={cy - 22} r={5} fill="#2f4f9a" />
			</g>
		);
		if (chapeau === 'haut') return (
			<g>
				<ellipse cx={0} cy={cy + 6} rx={82} ry={16} fill="#232326" stroke={INK} strokeWidth={6} />
				<rect x={-52} y={cy - 110} width={104} height={118} rx={8} fill="#2c2c30" stroke={INK} strokeWidth={6} />
				<rect x={-52} y={cy - 20} width={104} height={16} fill="#7a2a20" />
			</g>
		);
		if (chapeau === 'paille') return (
			<g>
				<ellipse cx={0} cy={cy + 4} rx={118} ry={22} fill="#e8c66a" stroke={INK} strokeWidth={6} />
				<path d={`M -56 ${cy + 4} Q -50 ${cy - 62} 0 ${cy - 66} Q 50 ${cy - 62} 56 ${cy + 4} Z`} fill="#f0d27c" stroke={INK} strokeWidth={6} />
				<rect x={-56} y={cy - 16} width={112} height={14} fill="#b5322c" />
			</g>
		);
		return (
			<g>
				<ellipse cx={0} cy={cy + 4} rx={104} ry={20} fill="#a08550" stroke={INK} strokeWidth={6} />
				<path d={`M -55 ${cy + 4} Q -50 ${cy - 60} 0 ${cy - 64} Q 50 ${cy - 60} 55 ${cy + 4} Z`} fill={KHAKI} stroke={INK} strokeWidth={6} />
				<rect x={-55} y={cy - 14} width={110} height={14} fill="#5a4325" />
				<path d={`M -55 ${cy + 2} L -104 ${cy} L -74 ${cy - 56} Z`} fill="#a08550" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			</g>
		);
	};
	return (
		<g transform={`translate(${x} ${y}) scale(${(flip ? -1 : 1) * s} ${s}) rotate(${Math.sin(f * 0.06 + ph) * 1.8 + (marche ? Math.sin(p) * 2 : 0)})`}>
			<ellipse cx={0} cy={4} rx={95} ry={16} fill="#000" opacity={0.18} />
			{jambes}
			{brasG}
			<rect x={-64} y={-255 + by} width={128} height={145} rx={42} fill={couleur} stroke={INK} strokeWidth={7} />
			<rect x={-62} y={-140 + by} width={124} height={16} fill="#6b4a2b" />
			<circle cx={0} cy={-200 + by} r={5} fill={INK} /><circle cx={0} cy={-170 + by} r={5} fill={INK} />
			{cravate && <path d={`M -10 ${-252 + by} L 10 ${-252 + by} L 16 ${-160 + by} L 0 ${-140 + by} L -16 ${-160 + by} Z`} fill={cravate} stroke={INK} strokeWidth={4} strokeLinejoin="round" />}
			{Array.from({length: medailles}).map((_, i) => (
				<g key={i}>
					<rect x={-46 + i * 22} y={-232 + by} width={14} height={16} fill={['#b5322c', '#2f5fa8', '#3c8a4a', '#b5322c'][i % 4]} />
					<circle cx={-39 + i * 22} cy={-206 + by} r={10} fill={BLE} stroke={INK} strokeWidth={3} />
				</g>
			))}
			<circle cx={-62} cy={hy + 4} r={14} fill={PEAU} stroke={INK} strokeWidth={5} />
			<circle cx={62} cy={hy + 4} r={14} fill={PEAU} stroke={INK} strokeWidth={5} />
			<circle cx={0} cy={hy} r={64} fill={peau} stroke={INK} strokeWidth={7} />
			{meche && <path d={`M -10 ${hy - 58} q -30 30 -8 52 q -4 -26 22 -40 Z`} fill="#2b1a10" stroke={INK} strokeWidth={3} />}
			<ellipse cx={-38} cy={hy + 24} rx={12} ry={7} fill="#f19a8a" opacity={0.7} />
			<ellipse cx={38} cy={hy + 24} rx={12} ry={7} fill="#f19a8a" opacity={0.7} />
			{yeux()}
			<ellipse cx={4} cy={hy + 12} rx={10} ry={8} fill="#e8a882" stroke={INK} strokeWidth={3} />
			{bouche()}
			{moustache && <path d={`M 0 ${hy + 24} q -30 -14 -54 8 q 22 -2 30 6 q 14 -10 24 -14 q 10 4 24 14 q 8 -8 30 -6 q -24 -22 -54 -8 Z`} fill="#6a4426" stroke={INK} strokeWidth={4} />}
			{chap()}
			{brasD}
			{objet}
		</g>
	);
};

/* ---------- armes et véhicules ---------- */
export const Mitrailleuse: React.FC<{x: number; y: number; s?: number; rot?: number; tir?: boolean; fumee?: number; f: number; pied?: boolean}> = ({x, y, s = 1, rot = 0, tir, fumee = 0, f, pied = true}) => (
	<g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
		{pied && <path d="M 170 18 L 140 120 M 180 18 L 225 120" stroke={INK} strokeWidth={10} strokeLinecap="round" />}
		<path d="M -40 -18 L -140 -6 L -150 34 L -40 18 Z" fill="#7a5532" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
		<rect x={-48} y={-24} width={100} height={44} rx={8} fill="#3c3f38" stroke={INK} strokeWidth={6} />
		<rect x={40} y={-28} width={175} height={52} rx={14} fill="#525a4b" stroke={INK} strokeWidth={6} />
		{[70, 100, 130, 160, 190].map((fx) => <line key={fx} x1={fx} y1={-24} x2={fx} y2={20} stroke={INK} strokeWidth={4} opacity={0.45} />)}
		<rect x={210} y={-10} width={50} height={18} rx={4} fill="#2d2f2a" stroke={INK} strokeWidth={5} />
		<ellipse cx={0} cy={-36} rx={62} ry={16} fill="#2d2f2a" stroke={INK} strokeWidth={5} />
		<ellipse cx={0} cy={-42} rx={40} ry={8} fill="#555" />
		<path d="M -10 20 L -20 56 L 6 56 L 12 20 Z" fill="#7a5532" stroke={INK} strokeWidth={5} />
		{tir && (
			<g transform={`translate(275 -1) rotate(${(f % 3) * 20}) scale(${0.8 + (f % 2) * 0.4})`}>
				<path d="M 0 -40 L 18 -12 L 60 0 L 18 12 L 0 40 L -8 14 L -40 0 L -8 -14 Z" fill="#ffd23f" stroke="#ff7a1a" strokeWidth={6} />
			</g>
		)}
		{fumee > 0 && [0, 1, 2, 3].map((i) => {
			const k = (fumee * 1.6 + i * 0.25) % 1;
			return <circle key={i} cx={250 + i * 12 + k * 30} cy={-20 - k * 160} r={18 + k * 40} fill="#cfcfcf" stroke={INK} strokeWidth={4} opacity={(1 - k) * Math.min(1, fumee * 3)} />;
		})}
	</g>
);

export const Camion: React.FC<{x: number; y: number; s?: number; f: number; bosse?: number; roule?: number; tireur?: boolean; flip?: boolean; humeurTireur?: Humeur}> = ({x, y, s = 1, f, bosse = 0, roule = 1, tireur, flip, humeurTireur = 'choc'}) => {
	const b = -Math.abs(Math.sin(f * 0.42)) * bosse;
	const r = Math.sin(f * 0.42) * bosse * 0.08;
	const b2 = -Math.abs(Math.sin(f * 0.42 + 1.2)) * bosse * 2.4;
	const roue = (wx: number) => (
		<g transform={`translate(${wx} 0) rotate(${f * 14 * roule})`}>
			<circle r={62} fill="#2d2a28" stroke={INK} strokeWidth={7} />
			<circle r={30} fill="#9a9a90" stroke={INK} strokeWidth={5} />
			{[0, 60, 120].map((a) => <rect key={a} x={-4} y={-30} width={8} height={60} fill={INK} transform={`rotate(${a})`} />)}
		</g>
	);
	return (
		<g transform={`translate(${x} ${y}) scale(${(flip ? -1 : 1) * s} ${s})`}>
			<ellipse cx={0} cy={60} rx={330} ry={22} fill="#000" opacity={0.2} />
			<g transform={`translate(0 ${b}) rotate(${r})`}>
				{tireur && (
					<g transform={`translate(-150 ${-120 + b2 - b})`}>
						<Humain x={0} y={0} s={0.72} f={f} humeur={humeurTireur} pose="debout" regard={Math.sin(f * 0.5)} />
						<Mitrailleuse x={20} y={-150} s={0.75} rot={Math.sin(f * 0.37) * 35 - 10} f={f} pied={false} />
					</g>
				)}
				<rect x={-290} y={-140} width={320} height={70} rx={8} fill="#6e7d4f" stroke={INK} strokeWidth={7} />
				{[-250, -190, -130, -70].map((px) => <line key={px} x1={px} y1={-140} x2={px} y2={-70} stroke={INK} strokeWidth={4} opacity={0.4} />)}
				<path d="M 30 -60 L 30 -250 Q 30 -270 50 -270 L 150 -270 Q 175 -270 180 -245 L 190 -160 L 310 -150 Q 330 -148 330 -128 L 330 -60 Z" fill="#7d8c5a" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
				<rect x={58} y={-245} width={100} height={78} rx={12} fill="#bfe3f2" stroke={INK} strokeWidth={6} />
				<path d="M 70 -235 l 30 0 l -30 30 Z" fill="#fff" opacity={0.7} />
				{[210, 235, 260, 285].map((gx) => <line key={gx} x1={gx} y1={-140} x2={gx} y2={-80} stroke={INK} strokeWidth={4} opacity={0.5} />)}
				<circle cx={318} cy={-118} r={14} fill="#ffe9a0" stroke={INK} strokeWidth={5} />
				<path d="M -230 -40 a 80 80 0 0 1 160 0 M 160 -40 a 80 80 0 0 1 160 0" fill="#5d6b45" stroke={INK} strokeWidth={7} />
				<rect x={-300} y={-70} width={640} height={30} rx={8} fill="#4b5737" stroke={INK} strokeWidth={6} />
			</g>
			{roue(-150)}
			{roue(240)}
		</g>
	);
};

/* ---------- textes ---------- */
export const Titre: React.FC<{x: number; y: number; texte: string; taille?: number; k?: number; c?: string; rot?: number; contour?: string}> = ({x, y, texte, taille = 160, k = 1, c = '#FFD23F', rot = 0, contour = INK}) =>
	k <= 0 ? null : (
		<g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k})`}>
			<text textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontSize={taille} fill={c} stroke={contour} strokeWidth={taille * 0.16} strokeLinejoin="round" paintOrder="stroke">
				{texte}
			</text>
		</g>
	);

export const Bulle: React.FC<{x: number; y: number; w: number; h: number; k: number; queue: [number, number]; children?: React.ReactNode; pensee?: boolean}> = ({x, y, w, h, k, queue, children, pensee}) =>
	k <= 0 ? null : (
		<g transform={`translate(${x} ${y}) scale(${k})`}>
			{pensee ? (
				<>
					<circle cx={queue[0] * 0.55} cy={queue[1] * 0.55} r={26} fill="#fff" stroke={INK} strokeWidth={6} />
					<circle cx={queue[0] * 0.85} cy={queue[1] * 0.85} r={16} fill="#fff" stroke={INK} strokeWidth={6} />
				</>
			) : (
				<path d={`M -40 ${h / 2 - 10} L ${queue[0]} ${queue[1]} L 40 ${h / 2 - 10} Z`} fill="#fff" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
			)}
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={pensee ? h / 2.2 : 50} fill="#fff" stroke={INK} strokeWidth={7} />
			{!pensee && <path d={`M -36 ${h / 2 - 6} L 36 ${h / 2 - 6}`} stroke="#fff" strokeWidth={12} />}
			{children}
		</g>
	);

export const Ampoule: React.FC<{x: number; y: number; k: number; f: number}> = ({x, y, k, f}) =>
	k <= 0 ? null : (
		<g transform={`translate(${x} ${y}) scale(${k})`}>
			{Array.from({length: 8}).map((_, i) => (
				<rect key={i} x={-6} y={-150} width={12} height={36 + Math.sin(f * 0.4 + i) * 8} rx={6} fill="#ffd23f" transform={`rotate(${i * 45 - 157})`} />
			))}
			<circle cx={0} cy={-40} r={62} fill="#ffe98a" stroke={INK} strokeWidth={7} />
			<rect x={-30} y={14} width={60} height={40} rx={8} fill="#9a9a90" stroke={INK} strokeWidth={6} />
			<path d="M -16 -20 q 16 -30 32 0" stroke="#e0a000" strokeWidth={6} fill="none" />
		</g>
	);

/* ---------- deuxième vidéo : Napoléon et les lapins ---------- */
export const Arbre: React.FC<{x: number; y: number; s?: number; f: number}> = ({x, y, s = 1, f}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${Math.sin(f * 0.03 + x) * 1.2})`}>
		<path d="M -22 0 L -16 -190 L 16 -190 L 22 0 Z" fill="#7a5532" stroke={INK} strokeWidth={6} />
		{[[-70, -230, 85], [60, -250, 90], [0, -320, 100], [-30, -200, 70], [50, -190, 66]].map(([cx, cy, rr], i) => (
			<circle key={i} cx={cx} cy={cy} r={rr} fill={i % 2 ? '#4f8a35' : '#5e9c3f'} stroke={INK} strokeWidth={6} />
		))}
		<circle cx={-20} cy={-330} r={26} fill="#7fbf58" />
	</g>
);

type LapinP = {x: number; y: number; s?: number; f: number; ph?: number; saute?: boolean; vitesse?: number; flip?: boolean; regard?: number; c?: number; grignote?: boolean; debout?: boolean; coeur?: boolean};
const POILS = ['#f4f1ea', '#b48a62', '#9c9a98', '#d9c3a5', '#6e5644'];
export const Lapin: React.FC<LapinP> = ({x, y, s = 1, f, ph = 0, saute, vitesse = 0.32, flip, regard = 0.6, c = 0, grignote, debout, coeur}) => {
	const col = POILS[c % POILS.length];
	const p = f * vitesse + ph;
	const air = saute ? Math.abs(Math.sin(p)) : 0;
	const by = -air * 70;
	const rot = saute ? -Math.cos(p) * 12 : 0;
	const oreille = Math.sin(f * 0.15 + ph) * 6 + (saute ? -Math.cos(p) * 14 : 0);
	const cligne = ((f + ph * 31) % 71) < 3;
	const m = grignote ? Math.abs(Math.sin(f * 0.9 + ph)) * 4 : 0;
	const hy = debout ? -150 : -105;
	return (
		<g transform={`translate(${x} ${y}) scale(${(flip ? -1 : 1) * s} ${s})`}>
			<ellipse cx={0} cy={4} rx={70 - air * 25} ry={12} fill="#000" opacity={0.18} />
			<g transform={`translate(0 ${by}) rotate(${rot})`}>
				<circle cx={-74} cy={debout ? -40 : -64} r={17} fill="#fff" stroke={INK} strokeWidth={5} />
				<ellipse cx={-30} cy={-6} rx={36} ry={11} fill={col} stroke={INK} strokeWidth={5} />
				<ellipse cx={-10} cy={debout ? -70 : -55} rx={debout ? 50 : 64} ry={debout ? 66 : 48} fill={col} stroke={INK} strokeWidth={6} />
				<ellipse cx={-40} cy={-34} rx={32} ry={28} fill={col} stroke={INK} strokeWidth={5} />
				<ellipse cx={debout ? 34 : 36} cy={debout ? -95 : -8} rx={14} ry={9} fill={col} stroke={INK} strokeWidth={4} />
				<g transform={`translate(42 ${hy})`}>
					<g transform={`rotate(${-14 + oreille} -10 -30)`}>
						<ellipse cx={-14} cy={-80} rx={15} ry={54} fill={col} stroke={INK} strokeWidth={5} />
						<ellipse cx={-14} cy={-78} rx={7} ry={38} fill="#f2a7b5" />
					</g>
					<g transform={`rotate(${12 + oreille * 0.7} 10 -30)`}>
						<ellipse cx={14} cy={-82} rx={15} ry={54} fill={col} stroke={INK} strokeWidth={5} />
						<ellipse cx={14} cy={-80} rx={7} ry={38} fill="#f2a7b5" />
					</g>
					<circle r={44} fill={col} stroke={INK} strokeWidth={6} />
					<ellipse cx={20} cy={14} rx={12} ry={7} fill="#f19a8a" opacity={0.7} />
					{cligne ? <path d="M 6 -8 q 12 8 24 0" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" /> : (<>
						<circle cx={18} cy={-8} r={14} fill="#fff" stroke={INK} strokeWidth={4} />
						<circle cx={20 + regard * 4} cy={-7} r={8} fill={INK} />
						<circle cx={16 + regard * 4} cy={-11} r={3} fill="#fff" />
					</>)}
					<ellipse cx={42} cy={4} rx={7} ry={5} fill="#e57a8a" stroke={INK} strokeWidth={3} />
					<path d={`M 42 9 q -3 ${8 + m} -10 ${8 + m} M 42 9 q 3 ${8 + m} 8 ${6 + m}`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
					<path d="M 48 2 l 34 -6 M 48 6 l 34 6" stroke={INK} strokeWidth={2.5} opacity={0.6} />
				</g>
				{coeur && <path d={`M 60 ${hy - 120 - (f % 30)} c -10 -16 -34 -8 -26 10 l 26 24 l 26 -24 c 8 -18 -16 -26 -26 -10 Z`} fill="#ff5a7a" stroke={INK} strokeWidth={4} opacity={1 - (f % 30) / 30} />}
			</g>
		</g>
	);
};

export const Cage: React.FC<{x: number; y: number; s?: number; ouvert?: number}> = ({x, y, s = 1, ouvert = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-80} y={-120} width={160} height={120} rx={8} fill="#8a5a35" stroke={INK} strokeWidth={6} />
		<rect x={-66} y={-106} width={132} height={92} fill="#3b2414" />
		<g transform={`translate(-66 -14) scale(1 ${1 - ouvert}) translate(66 14)`}>
			<rect x={-66} y={-106} width={132} height={92} fill="none" stroke={INK} strokeWidth={4} />
			{[-44, -22, 0, 22, 44].map((bx) => <line key={bx} x1={bx} y1={-106} x2={bx} y2={-14} stroke="#c9a46a" strokeWidth={7} />)}
		</g>
		{ouvert > 0.5 && <path d={`M -66 -14 L 66 -14 L 76 ${-14 + 60 * ouvert} L -76 ${-14 + 60 * ouvert} Z`} fill="none" stroke="#c9a46a" strokeWidth={6} />}
	</g>
);

export const PiqueNique: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-200} y={-120} width={18} height={120} fill="#6b4a2b" stroke={INK} strokeWidth={5} />
		<rect x={182} y={-120} width={18} height={120} fill="#6b4a2b" stroke={INK} strokeWidth={5} />
		<path d="M -230 -140 L 230 -140 L 250 -60 L -250 -60 Z" fill="#fff" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
		{[-200, -120, -40, 40, 120, 200].map((cx) => <path key={cx} d={`M ${cx - 40} -60 q 40 24 80 0`} fill="#fff" stroke={INK} strokeWidth={5} />)}
		<ellipse cx={-120} cy={-150} rx={70} ry={14} fill="#e8e2d0" stroke={INK} strokeWidth={4} />
		<path d="M -170 -158 Q -150 -215 -110 -210 Q -70 -205 -72 -160 Z" fill="#c8793a" stroke={INK} strokeWidth={5} />
		<path d="M -80 -190 l 26 -14 m -24 26 l 26 -6" stroke="#f4ead2" strokeWidth={9} strokeLinecap="round" />
		<rect x={20} y={-235} width={28} height={95} rx={8} fill="#3d6b3a" stroke={INK} strokeWidth={5} />
		<rect x={58} y={-215} width={26} height={75} rx={8} fill="#7a2a20" stroke={INK} strokeWidth={5} />
		<path d="M 120 -145 L 120 -190 Q 160 -215 200 -190 L 200 -145 Z" fill="#f3d6a6" stroke={INK} strokeWidth={5} />
		<path d="M 120 -190 Q 160 -170 200 -190" stroke="#e57a8a" strokeWidth={10} fill="none" />
		<circle cx={160} cy={-212} r={9} fill="#c0392b" />
	</g>
);

export const Caleche: React.FC<{x: number; y: number; s?: number; f: number; secoue?: number; porte?: number}> = ({x, y, s = 1, f, secoue = 0, porte = 0}) => {
	const b = Math.sin(f * 1.3) * secoue;
	const roue = (wx: number, wy: number, rr: number) => (
		<g transform={`translate(${wx} ${wy})`}>
			<circle r={rr} fill="none" stroke={INK} strokeWidth={16} />
			<circle r={rr} fill="none" stroke="#c9a227" strokeWidth={8} />
			{Array.from({length: 8}).map((_, i) => <line key={i} x1={0} y1={0} x2={Math.cos(i * 0.785) * rr} y2={Math.sin(i * 0.785) * rr} stroke="#c9a227" strokeWidth={6} />)}
			<circle r={14} fill="#c9a227" stroke={INK} strokeWidth={5} />
		</g>
	);
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			<ellipse cx={0} cy={8} rx={260} ry={20} fill="#000" opacity={0.2} />
			<g transform={`translate(0 ${b}) rotate(${b * 0.4})`}>
				<path d="M -190 -110 Q -200 -330 -150 -350 L 160 -350 Q 210 -330 200 -110 Z" fill="#244a34" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
				<path d="M -170 -360 L 180 -360 Q 190 -385 160 -395 L -150 -395 Q -180 -385 -170 -360 Z" fill="#1b3626" stroke={INK} strokeWidth={7} />
				<rect x={-150} y={-320} width={120} height={100} rx={12} fill="#cfe9f5" stroke={INK} strokeWidth={6} />
				<g transform={`translate(20 0) scale(${1 - porte * 0.85} 1)`}>
					<rect x={0} y={-330} width={140} height={210} rx={10} fill="#2f5d40" stroke="#c9a227" strokeWidth={7} />
					<rect x={22} y={-310} width={96} height={80} rx={10} fill="#cfe9f5" stroke={INK} strokeWidth={5} />
					<circle cx={118} cy={-200} r={8} fill="#c9a227" />
				</g>
				{porte > 0 && <rect x={20} y={-330} width={140} height={210} fill="#1a2a20" opacity={porte} />}
				<path d="M -170 -140 L 180 -140" stroke="#c9a227" strokeWidth={8} />
				<circle cx={190} cy={-300} r={16} fill="#ffe08a" stroke={INK} strokeWidth={5} />
			</g>
			{roue(-130, -60, 70)}
			{roue(150, -50, 58)}
		</g>
	);
};

export const Carotte: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<path d="M -16 0 L 16 0 L 2 110 Z" fill="#f28c28" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
		<path d="M 0 0 l -18 -40 M 0 0 l 4 -46 M 0 0 l 20 -36" stroke="#4f9a35" strokeWidth={10} strokeLinecap="round" />
	</g>
);

/* ---------- troisième vidéo : la location de films ---------- */
const VHS = ['#c0392b', '#2f5fa8', '#3c8a4a', '#e08a1e', '#7a3fa0', '#1f8a8a', '#d4b21a'];
export const Magasin: React.FC<{x: number; y: number; s?: number; nom?: string; ferme?: number; nuit?: boolean; couleur?: string}> = ({x, y, s = 1, nom = 'LOCATION DE FILMS', ferme = 0, nuit, couleur = '#2a4f9a'}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-360} y={-420} width={720} height={420} fill="#e9e1d0" stroke={INK} strokeWidth={8} />
		<rect x={-390} y={-500} width={780} height={110} rx={14} fill={couleur} stroke={INK} strokeWidth={8} />
		<text x={0} y={-428} textAnchor="middle" fontFamily={FONT} fontSize={nom.length > 14 ? 58 : 76} fill="#ffd23f" stroke={INK} strokeWidth={6} paintOrder="stroke">{nom}</text>
		{[-250, 250].map((wx) => (
			<g key={wx}>
				<rect x={wx - 100} y={-340} width={200} height={230} fill={nuit ? '#ffe9a6' : '#bfe3f2'} stroke={INK} strokeWidth={7} />
				{[0, 1, 2].map((i) => <rect key={i} x={wx - 80 + i * 56} y={-300} width={44} height={70} rx={4} fill={VHS[(i + wx / 50 + 10) % 7 | 0]} stroke={INK} strokeWidth={4} />)}
			</g>
		))}
		<rect x={-80} y={-300} width={160} height={300} fill={nuit ? '#ffe9a6' : '#9fd0e8'} stroke={INK} strokeWidth={7} />
		<line x1={0} y1={-300} x2={0} y2={0} stroke={INK} strokeWidth={5} />
		{ferme > 0 && (
			<g>
				<rect x={-360} y={-420} width={720} height={420 * ferme} fill="#8a8a86" stroke={INK} strokeWidth={6} />
				{Array.from({length: Math.floor(ferme * 12)}).map((_, i) => <line key={i} x1={-360} y1={-420 + i * 35} x2={360} y2={-420 + i * 35} stroke="#6a6a66" strokeWidth={5} />)}
			</g>
		)}
	</g>
);

export const Rayon: React.FC<{x: number; y: number; s?: number; graine?: number}> = ({x, y, s = 1, graine = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-260} y={-560} width={520} height={560} fill="#7a5532" stroke={INK} strokeWidth={8} />
		{[0, 1, 2, 3].map((r) => (
			<g key={r}>
				<rect x={-240} y={-540 + r * 135} width={480} height={118} fill="#3b2414" />
				{Array.from({length: 8}).map((_, i) => (
					<rect key={i} x={-232 + i * 59} y={-528 + r * 135} width={50} height={104} rx={4} fill={VHS[Math.floor(rnd(graine + r * 9 + i) * 7)]} stroke={INK} strokeWidth={4} />
				))}
			</g>
		))}
	</g>
);

export const Cassette: React.FC<{x: number; y: number; s?: number; r?: number; c?: string}> = ({x, y, s = 1, r = 0, c = '#c0392b'}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<rect x={-55} y={-90} width={110} height={180} rx={8} fill={c} stroke={INK} strokeWidth={6} />
		<rect x={-40} y={-70} width={80} height={60} rx={6} fill="#fff" opacity={0.85} />
		<circle cx={0} cy={-40} r={16} fill={c} />
	</g>
);

export const Enveloppe: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<rect x={-90} y={-55} width={180} height={110} rx={8} fill="#d6312c" stroke={INK} strokeWidth={6} />
		<path d="M -90 -55 L 0 15 L 90 -55" fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
		<circle cx={0} cy={22} r={22} fill="#e8e8e8" stroke={INK} strokeWidth={4} />
		<circle cx={0} cy={22} r={6} fill="#9a9a9a" />
	</g>
);

export const Avion: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<path d="M -60 -10 L -170 -150 L -110 -150 L 40 -10 Z" fill="#c8cfd8" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
		<path d="M -330 -60 Q -330 -100 -280 -100 L 260 -100 Q 360 -90 380 -40 Q 360 10 260 20 L -280 20 Q -330 20 -330 -20 Z" fill="#f4f6f9" stroke={INK} strokeWidth={8} />
		<path d="M -330 -60 L -380 -200 L -300 -200 L -240 -100" fill="#d6312c" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
		{Array.from({length: 7}).map((_, i) => <circle key={i} cx={-200 + i * 62} cy={-50} r={17} fill="#9fd0e8" stroke={INK} strokeWidth={5} />)}
		<path d="M 300 -82 Q 352 -70 362 -40 L 300 -40 Z" fill="#9fd0e8" stroke={INK} strokeWidth={5} />
		<path d="M -40 0 L -140 130 L -80 130 L 60 0 Z" fill="#b8c0ca" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
	</g>
);

export const Maison: React.FC<{x: number; y: number; s?: number; c?: string; allume?: number}> = ({x, y, s = 1, c = '#e8c07a', allume = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-130} y={-200} width={260} height={200} fill={c} stroke={INK} strokeWidth={7} />
		<path d="M -160 -195 L 0 -330 L 160 -195 Z" fill="#a8462e" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
		<rect x={-95} y={-160} width={80} height={70} fill={allume ? '#ffe28a' : '#bfe3f2'} stroke={INK} strokeWidth={5} />
		<rect x={25} y={-110} width={70} height={110} fill="#7a5532" stroke={INK} strokeWidth={5} />
		{allume > 0 && [1, 2, 3].map((i) => <path key={i} d={`M ${-30 * i} ${-360 - 26 * i} q ${30 * i} ${-22 * i} ${60 * i} 0`} stroke="#2f9be0" strokeWidth={10} fill="none" strokeLinecap="round" opacity={allume} transform={`translate(${15 * i} 0)`} />)}
	</g>
);

export const Salon: React.FC<{f: number; ecran?: 'cassette' | 'lecture' | 'eteint'}> = ({f, ecran = 'eteint'}) => (
	<g>
		<rect x={-800} y={-800} width={2680} height={3600} fill="#f1dcc0" />
		<rect x={-800} y={1500} width={2680} height={1200} fill="#b5835a" stroke={INK} strokeWidth={6} />
		<rect x={80} y={420} width={240} height={300} fill="#bfe3f2" stroke={INK} strokeWidth={8} />
		<line x1={200} y1={420} x2={200} y2={720} stroke={INK} strokeWidth={6} />
		<g transform="translate(700 1150)">
			<rect x={-30} y={150} width={60} height={200} fill="#5a3b26" stroke={INK} strokeWidth={6} />
			<rect x={-280} y={-180} width={560} height={340} rx={24} fill="#2a2a2e" stroke={INK} strokeWidth={8} />
			<rect x={-250} y={-150} width={500} height={280} rx={12} fill={ecran === 'eteint' ? '#3c4450' : ecran === 'lecture' ? '#141414' : '#2f5fa8'} />
			{ecran === 'lecture' && <path d="M -40 -60 L 60 -5 L -40 50 Z" fill="#d6312c" transform={`scale(${1 + Math.sin(f * 0.2) * 0.05})`} />}
			{ecran === 'cassette' && <text x={0} y={20} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#fff">LECTURE ▶</text>}
		</g>
	</g>
);

export const Canape: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-330} y={-260} width={660} height={200} rx={50} fill="#c0573a" stroke={INK} strokeWidth={8} />
		<rect x={-360} y={-120} width={720} height={130} rx={40} fill="#d86a4a" stroke={INK} strokeWidth={8} />
		<rect x={-400} y={-200} width={90} height={220} rx={40} fill="#c0573a" stroke={INK} strokeWidth={8} />
		<rect x={310} y={-200} width={90} height={220} rx={40} fill="#c0573a" stroke={INK} strokeWidth={8} />
	</g>
);

export const Billet: React.FC<{x: number; y: number; s?: number; r?: number; texte?: string}> = ({x, y, s = 1, r = 0, texte = '50 000 000 $'}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<rect x={-300} y={-150} width={600} height={300} rx={18} fill="#fbf6e6" stroke={INK} strokeWidth={8} />
		<text x={0} y={-70} textAnchor="middle" fontFamily={FONT} fontSize={44} fill="#7a5532">OFFRE DE VENTE</text>
		<text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={92} fill="#2f7a3a">{texte}</text>
		<path d="M 120 100 q 30 -30 60 0 q 30 30 60 -10" stroke="#2f4f9a" strokeWidth={6} fill="none" />
	</g>
);
