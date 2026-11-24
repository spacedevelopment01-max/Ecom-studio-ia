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
		<rect x={-800} y={-800} width={2680} height={3600} fill={`url(#${id})`} />
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

export const Sol: React.FC<{y: number; c?: string; dx?: number}> = ({y, c = TERRE, dx = 0}) => (
	<>
		<rect x={-900} y={y} width={2900} height={2400} fill={c} stroke={INK} strokeWidth={6} />
		{Array.from({length: 26}).map((_, i) => {
			const px = ((rnd(i) * 2400 - dx) % 2400 + 2400) % 2400 - 700;
			return <ellipse key={i} cx={px} cy={y + 40 + rnd(i + 9) * 900} rx={10 + rnd(i + 3) * 18} ry={6 + rnd(i + 4) * 6} fill={TERRE_F} opacity={0.6} />;
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
type Humeur = 'content' | 'fache' | 'choc' | 'triste' | 'perplexe' | 'neutre' | 'crie';
type Pose = 'debout' | 'drapeau' | 'blanc' | 'vise' | 'crie' | 'salut' | 'marche' | 'accroupi' | 'ecrit';
type HP = {
	x: number; y: number; s?: number; f: number; pose?: Pose; humeur?: Humeur; chapeau?: 'brousse' | 'kepi' | 'paille';
	moustache?: boolean; medailles?: number; flip?: boolean; couleur?: string; regard?: number; ph?: number; drapeauC?: string; pas?: boolean;
};
export const Humain: React.FC<HP> = ({x, y, s = 1, f, pose = 'debout', humeur = 'neutre', chapeau = 'brousse', moustache, medailles = 0, flip, couleur = KHAKI, regard = 0, ph = 0, drapeauC = '#2f5fa8', pas}) => {
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
				<path d={`M ${hx} ${-120 + by} L ${kneeX} ${kneeY} L ${hx + sw} -8`} stroke={KHAKI_F} strokeWidth={24} fill="none" strokeLinecap="round" strokeLinejoin="round" />
				<ellipse cx={hx + sw + 10} cy={-6} rx={30} ry={14} fill="#3b2a1e" stroke={INK} strokeWidth={5} />
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
			{Array.from({length: medailles}).map((_, i) => (
				<g key={i}>
					<rect x={-46 + i * 22} y={-232 + by} width={14} height={16} fill={['#b5322c', '#2f5fa8', '#3c8a4a', '#b5322c'][i % 4]} />
					<circle cx={-39 + i * 22} cy={-206 + by} r={10} fill={BLE} stroke={INK} strokeWidth={3} />
				</g>
			))}
			<circle cx={-62} cy={hy + 4} r={14} fill={PEAU} stroke={INK} strokeWidth={5} />
			<circle cx={62} cy={hy + 4} r={14} fill={PEAU} stroke={INK} strokeWidth={5} />
			<circle cx={0} cy={hy} r={64} fill={PEAU} stroke={INK} strokeWidth={7} />
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
