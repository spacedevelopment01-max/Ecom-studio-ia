import React from 'react';
import {Composition} from 'remotion';
import {Film, DUREE} from './Film';
export const Root: React.FC = () => <Composition id="Yoga" component={Film} durationInFrames={DUREE} fps={30} width={1080} height={1920} />;
