import { useEffect, useState } from 'react';
import AsciiClouds from './AsciiClouds';
import DitherClouds from './DitherClouds';
import SkyClouds from './SkyClouds';

type Mode = 'sky' | 'ascii' | 'dither';
const MODES: Mode[] = ['sky', 'ascii', 'dither'];

/**
 * Hero background. Cumulus clouds on a character grid by default;
 * `?clouds=ascii` for the noise-field ASCII version, `?clouds=dither` for the WebGL one.
 */
export default function CloudsBackground() {
  const [mode, setMode] = useState<Mode>('sky');

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('clouds') as Mode | null;
    if (requested && MODES.includes(requested)) setMode(requested);
  }, []);

  return (
    <div aria-hidden="true" className="clouds-mask pointer-events-none absolute inset-0 -z-10">
      {mode === 'sky' && <SkyClouds />}
      {mode === 'ascii' && <AsciiClouds />}
      {mode === 'dither' && <DitherClouds background />}
    </div>
  );
}
