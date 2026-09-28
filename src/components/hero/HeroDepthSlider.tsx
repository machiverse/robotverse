import { useEffect, useRef, useState } from "react";
import { HERO_SLIDES } from "./HeroImageSlider";

/*
 * WebGL "2.5D" view of the hero photos. Each photo gets a small depth map when it
 * loads (blurred brightness blended with a floor gradient), and pixels shift by
 * that depth as the pointer moves, so the scene reads as 3D. Slides change with
 * a pixel-block dissolve and a scan edge, in the style of hubtown.co.in.
 * It sits on top of the plain <img> slider, which stays as the fallback and the
 * LCP image; the canvas only fades in once the first texture is ready.
 */

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform sampler2D uFromD;  // precomputed, blurred depth maps
uniform sampler2D uToD;
uniform vec2 uRes;
uniform vec2 uCover;   // uv scale for object-fit: cover
uniform float uFocusX; // horizontal focal point, like object-position
uniform vec2 uMouse;   // -1..1, eased
uniform float uProg;   // 0..1 transition progress
uniform float uTime;
uniform float uCell;   // pixel-block size in device px


vec2 coverUv(vec2 uv) {
  vec2 c = vec2(uFocusX, 0.5);
  return (uv - c) * uCover / 1.07 + c;   // 7% overscan so displaced edges never show
}

vec3 sampleDepth(sampler2D t, sampler2D dm, vec2 uv, float zoom) {
  vec2 base = coverUv((uv - 0.5) / zoom + 0.5);
  base.y = 1.0 - base.y;
  float d = texture2D(dm, base).r;
  vec2 shift = uMouse * (d - 0.45) * 0.038;
  shift.y = -shift.y;
  return texture2D(t, base + shift).rgb;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uCell);
  vec2 cols = uRes / uCell;
  // Blocks resolve left to right with some noise.
  float r = hash(cell) * 0.55 + (cell.x / cols.x) * 0.45;
  float p = uProg * 1.25 - 0.1;
  float show = step(r, p);

  float zoomTo = mix(1.05, 1.0, smoothstep(0.0, 1.0, uProg));
  vec3 a = sampleDepth(uFrom, uFromD, vUv, 1.0);
  vec3 b = sampleDepth(uTo, uToD, vUv, zoomTo);
  vec3 col = mix(a, b, show);

  // Scan edge: blocks just switching glow in the console ink colour.
  float edge = (1.0 - smoothstep(0.0, 0.06, abs(r - p))) * step(0.001, uProg) * step(uProg, 0.999);
  col = mix(col, vec3(0.78, 0.88, 1.0), edge * 0.55);

  // Faint blueprint grid and scanlines.
  vec2 g = fract(gl_FragCoord.xy / (uCell * 4.0));
  float line = 1.0 / (uCell * 4.0);
  float grid = max(step(g.x, line), step(g.y, line));
  col += vec3(0.55, 0.7, 1.0) * grid * 0.035;
  col *= 0.94 + 0.06 * sin(gl_FragCoord.y * 1.4 + uTime * 2.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

const TRANSITION_MS = 1300;
const IMG_W = 1920;
const IMG_H = 1080;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}

/**
 * Rough depth for a photo: brightness (lit metal and sparks tend to be the
 * subject) blended with a floor gradient (lower in the frame = closer), on a
 * small grid and heavily blurred so the shift is smooth with no tearing.
 */
const DW = 96;
const DH = 54;
function buildDepth(img: HTMLImageElement): Uint8Array {
  const c = document.createElement("canvas");
  c.width = DW;
  c.height = DH;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, DW, DH);
  const px = ctx.getImageData(0, 0, DW, DH).data;
  let a = new Float32Array(DW * DH);
  for (let i = 0; i < DW * DH; i++) {
    a[i] = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) / 255;
  }
  // Three box-blur passes of radius 3 approximate a gaussian.
  const blur = (src: Float32Array) => {
    const tmp = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const R = 3;
    for (let y = 0; y < DH; y++)
      for (let x = 0; x < DW; x++) {
        let sum = 0, n = 0;
        for (let k = -R; k <= R; k++) {
          const xx = x + k;
          if (xx >= 0 && xx < DW) { sum += src[y * DW + xx]; n++; }
        }
        tmp[y * DW + x] = sum / n;
      }
    for (let y = 0; y < DH; y++)
      for (let x = 0; x < DW; x++) {
        let sum = 0, n = 0;
        for (let k = -R; k <= R; k++) {
          const yy = y + k;
          if (yy >= 0 && yy < DH) { sum += tmp[yy * DW + x]; n++; }
        }
        out[y * DW + x] = sum / n;
      }
    return out;
  };
  a = blur(blur(blur(a)));
  let max = 0.001;
  for (let i = 0; i < a.length; i++) max = Math.max(max, a[i]);
  const d = new Uint8Array(DW * DH);
  for (let y = 0; y < DH; y++)
    for (let x = 0; x < DW; x++) {
      const v = (a[y * DW + x] / max) * 0.55 + (y / (DH - 1)) * 0.6;
      d[y * DW + x] = Math.round(Math.min(1, v) * 255);
    }
  return d;
}

function focusX(w: number) {
  if (w >= 1024) return 0.5;
  if (w >= 768) return 0.62;
  if (w >= 640) return 0.68;
  return 0.74;
}

interface Props {
  index: number;
}

const HeroDepthSlider = ({ index }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indexRef = useRef(index);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  indexRef.current = index;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      setFailed(true);
      return;
    }

    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      from: u("uFrom"), to: u("uTo"), res: u("uRes"), cover: u("uCover"), focus: u("uFocusX"),
      mouse: u("uMouse"), prog: u("uProg"), time: u("uTime"), cell: u("uCell"),
    };
    gl.uniform1i(U.from, 0);
    gl.uniform1i(U.to, 1);
    gl.uniform1i(u("uFromD"), 2);
    gl.uniform1i(u("uToD"), 3);

    // Textures, loaded lazily; the first one gates the fade-in.
    const textures: (WebGLTexture | null)[] = HERO_SLIDES.map(() => null);
    const depths: (WebGLTexture | null)[] = HERO_SLIDES.map(() => null);
    const makeTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    let disposed = false;
    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (disposed) return resolve();
          const dt = makeTex();
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, DW, DH, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, buildDepth(img));
          depths[i] = dt;
          const t = makeTex();
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          textures[i] = t;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = HERO_SLIDES[i].src;
      });

    const first = indexRef.current;
    load(first).then(() => {
      if (disposed || !textures[first]) return;
      setReady(true);
      HERO_SLIDES.forEach((_, i) => i !== first && load(i));
    });

    // Sizing
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      const ca = w / h, ia = IMG_W / IMG_H;
      gl.uniform2f(U.cover, ca > ia ? 1 : ca / ia, ca > ia ? ia / ca : 1);
      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.focus, focusX(canvas.clientWidth));
      gl.uniform1f(U.cell, Math.round((canvas.clientWidth < 640 ? 18 : 26) * dpr));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Pointer, eased; touch devices get a slow drift instead.
    const target = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };
    let lastPointer = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = canvas.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      lastPointer = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // Visibility: stop drawing when off screen or the tab is hidden.
    let visible = true;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);
    const onVis = () => !document.hidden && start();
    document.addEventListener("visibilitychange", onVis);

    let shown = first;   // slide fully on screen
    let from = first;
    let to = first;
    let tStart = 0;
    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number) => {
      raf = 0;
      if (disposed || !visible || document.hidden) return;

      const want = indexRef.current;
      if (want !== to && textures[want]) {
        from = tStart && now - tStart < TRANSITION_MS ? to : shown;
        to = want;
        tStart = now;
      }
      let p = 1;
      if (tStart) {
        p = Math.min(1, (now - tStart) / TRANSITION_MS);
        if (p >= 1) { shown = to; from = to; tStart = 0; }
      }

      if (now - lastPointer > 2500) {
        const s = (now - t0) / 1000;
        target.x = Math.sin(s * 0.35) * 0.55;
        target.y = Math.cos(s * 0.27) * 0.35;
      }
      mouse.x += (target.x - mouse.x) * 0.06;
      mouse.y += (target.y - mouse.y) * 0.06;
      canvas.style.transform = `perspective(1400px) rotateY(${(mouse.x * 2.2).toFixed(3)}deg) rotateX(${(-mouse.y * 1.6).toFixed(3)}deg) scale(1.06)`;

      const fi = textures[from] ? from : to;
      const ti = textures[to] ? to : fi;
      if (textures[fi] && textures[ti]) {
        const bind = (unit: number, t: WebGLTexture | null) => {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, t);
        };
        bind(0, textures[fi]);
        bind(1, textures[ti]);
        bind(2, depths[fi]);
        bind(3, depths[ti]);
        gl.uniform2f(U.mouse, mouse.x, mouse.y);
        gl.uniform1f(U.prog, tStart ? p : 1);
        gl.uniform1f(U.time, (now - t0) / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      raf = requestAnimationFrame(frame);
    };
    function start() {
      if (!raf && !disposed) raf = requestAnimationFrame(frame);
    }
    start();

    const onLost = (e: Event) => { e.preventDefault(); setFailed(true); };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      [...textures, ...depths].forEach((t) => t && gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 z-[1] h-full w-full will-change-transform"
      style={{ opacity: ready ? 1 : 0, transition: "opacity 300ms ease-out" }}
    />
  );
};

export default HeroDepthSlider;
