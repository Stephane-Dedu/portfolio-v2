import { useEffect, useRef } from 'react';
import { prefersReducedMotion, usePalette, type RGB } from '../../lib/palette';

// Size of one dither cell in CSS pixels. The canvas renders one pixel per cell
// and is upscaled with `image-rendering: pixelated`, so the shader stays cheap.
const CELL = 3;

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uForce;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform float uDark;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// Ordered (Bayer 8x8) dithering threshold
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 uv = (cell + 0.5) / uRes.y;
  vec2 d = uv - uMouse / uRes.y;
  float influence = exp(-dot(d, d) * 14.0) * uForce;

  // Wind: sample closer to the cursor so the clouds look pushed outward
  vec2 q = uv - d * influence * 1.1;
  float t = uTime * 0.03;
  vec2 drift = vec2(t, 0.0);

  // Stretched horizontally: clouds are wider than tall
  vec2 p = q * vec2(1.0, 1.7);
  vec2 warp = vec2(fbm(p * 1.2 + drift), fbm(p * 1.2 + vec2(4.1, 1.7) - drift * 0.5));
  vec2 s = p * 2.0 + warp * 0.9 + drift * 1.4;
  float n = fbm(s);
  float above = fbm(s + vec2(0.0, 0.06));

  // More cover toward the top of the panel
  float cover = mix(0.54, 0.42, uv.y);
  float body = smoothstep(cover, cover + 0.22, n);

  // Lit from above: light tops, denser bellies (flipped in dark mode, where ink is light)
  float shade = smoothstep(-0.03, 0.05, above - n);
  shade = mix(shade, 1.0 - shade, uDark);
  float density = body * mix(0.16, 0.7, shade) * (1.0 - influence * 0.85);

  float ink = step(bayer8(cell) + 0.001, density);
  gl_FragColor = vec4(mix(uPaper, uInk, ink), 1.0);
}
`;

function createProgram(gl: WebGLRenderingContext) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** `background`: paints on the page background with faint ink, for use behind content. */
export default function DitherClouds({ background = false }: { background?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const palette = usePalette();
  const paletteRef = useRef(palette);
  const redrawRef = useRef(() => {});

  useEffect(() => {
    paletteRef.current = palette;
    redrawRef.current();
  }, [palette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false });
    if (!canvas || !gl) return;
    const program = createProgram(gl);
    if (!program) return;
    gl.useProgram(program);

    // One oversized triangle covers the viewport
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      res: uniform('uRes'),
      time: uniform('uTime'),
      mouse: uniform('uMouse'),
      force: uniform('uForce'),
      ink: uniform('uInk'),
      paper: uniform('uPaper'),
      dark: uniform('uDark'),
    };

    const reduceMotion = prefersReducedMotion();
    const mouse = { x: -999, y: -999, tx: -999, ty: -999, force: 0, target: 0 };
    const timeOffset = Math.random() * 60;
    const start = performance.now();
    let width = 1;
    let height = 1;
    let time = timeOffset;
    let visible = true;
    let raf = 0;

    const draw = () => {
      const colors = paletteRef.current;
      if (!colors) return;
      gl.uniform2f(u.res, width, height);
      gl.uniform1f(u.time, time);
      gl.uniform2f(u.mouse, mouse.x, mouse.y);
      gl.uniform1f(u.force, mouse.force);
      const paper = background ? colors.bg : colors.paper;
      gl.uniform3fv(u.ink, background ? mix(paper, colors.ink, 0.22) : colors.ink);
      gl.uniform3fv(u.paper, paper);
      gl.uniform1f(u.dark, colors.dark ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    redrawRef.current = draw;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width / CELL));
      height = Math.max(1, Math.round(rect.height / CELL));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      draw();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      mouse.tx = (event.clientX - rect.left) / CELL;
      mouse.ty = (rect.bottom - event.clientY) / CELL;
      mouse.target = inside ? 1 : 0;
      if (inside && mouse.force < 0.02) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
      }
      if (reduceMotion) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
        mouse.force = mouse.target;
        draw();
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      mouse.force += (mouse.target - mouse.force) * 0.05;
      time = timeOffset + (now - start) / 1000;
      draw();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibilityObserver.observe(canvas);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    if (!reduceMotion) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 size-full [image-rendering:pixelated]"
    />
  );
}
