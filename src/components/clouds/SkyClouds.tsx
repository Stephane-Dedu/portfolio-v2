import { useEffect, useRef } from 'react';
import { SkyEngine } from './sky/engine';

/** Cumulus clouds drawn as ASCII on a character grid. The canvas takes its glyphs from its font-family. */
export default function SkyClouds() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new SkyEngine(canvas);
    return () => engine.destroy();
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 size-full font-mono" />;
}
