import { useEffect, useState } from 'react';
import AsciiClouds from './AsciiClouds';
import DitherClouds from './DitherClouds';

/** Hero background. ASCII by default, `?clouds=dither` for the WebGL dithered version. */
export default function CloudsBackground() {
  const [mode, setMode] = useState<'ascii' | 'dither'>('ascii');

  useEffect(() => {
    if (new URLSearchParams(location.search).get('clouds') === 'dither') setMode('dither');
  }, []);

  return (
    <div
      aria-hidden="true"
      className="clouds-mask pointer-events-none absolute inset-0 -z-10"
    >
      {mode === 'ascii' ? <AsciiClouds /> : <DitherClouds background />}
    </div>
  );
}
