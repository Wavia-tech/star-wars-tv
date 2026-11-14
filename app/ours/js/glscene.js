// What the two animated scenes share, built to hold up on a TV chip for hours:
//  - one full-screen WebGL1 pass, no antialiasing, no alpha, no kept buffer (unless ?capture, for recording frames);
//  - highp where the chip has it (the time terms are wrapped in JS anyway, so mediump chips never drift or stutter);
//  - pictures decoded off the main thread (createImageBitmap) so loading a scene never freezes the dock;
//  - a lost graphics context (the TV reclaiming memory) is rebuilt by itself.

const CAPTURE = /capture/.test(location.search);

export const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(p, 0.0, 1.0); }`;

export const PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

// A 256x256 tileable value-noise texture (four octaves, two channels), made once per seed pair.
const noiseCache = new Map();
export function noiseTexture(seedR, seedG) {
  const key = seedR + ',' + seedG;
  if (noiseCache.has(key)) return noiseCache.get(key);
  const N = 256, data = new Uint8Array(N * N * 4);
  const layer = (seed) => {
    const out = new Float32Array(N * N);
    for (let o = 0, amp = 0.5, cells = 4; o < 4; o++, amp *= 0.5, cells *= 2) {
      const g = new Float32Array(cells * cells);
      let s = seed * 9301 + o * 49297;
      for (let i = 0; i < g.length; i++) { s = (s * 9301 + 49297) % 233280; g[i] = s / 233280; }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const fx = (x / N) * cells, fy = (y / N) * cells;
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const at = (i, j) => g[((j % cells) * cells) + (i % cells)];
        out[y * N + x] += (at(x0, y0) * (1 - sx) * (1 - sy) + at(x0 + 1, y0) * sx * (1 - sy) + at(x0, y0 + 1) * (1 - sx) * sy + at(x0 + 1, y0 + 1) * sx * sy) * amp;
      }
    }
    return out;
  };
  const r = layer(seedR), g = layer(seedG);
  for (let i = 0; i < N * N; i++) { data[i * 4] = Math.min(255, r[i] / 0.9375 * 255); data[i * 4 + 1] = Math.min(255, g[i] / 0.9375 * 255); data[i * 4 + 3] = 255; }
  const nz = { N, data, r: (u, v) => data[(((v * N) | 0) % N * N + (((u % 1 + 1) % 1 * N) | 0)) * 4] / 255 };
  noiseCache.set(key, nz);
  return nz;
}

// the fractional part, for the time terms handed to the shader (texture coordinates repeat every 1)
export const fract = (x) => x - Math.floor(x);

async function decode(url) {
  const im = new Image(); im.decoding = 'async'; im.src = url;
  await im.decode();
  if (window.createImageBitmap) { try { return await createImageBitmap(im); } catch { /* fall back to the element */ } }
  return im;
}

export class GLScene {
  // frag: the fragment shader; uniforms: their names; textures: [{ url | data:{N,data}, unit, repeat, rgba }]
  constructor({ frag, uniforms, textures }) {
    this.frag = frag; this.names = uniforms; this.textures = textures;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'bg';
    this.canvas.width = 1920; this.canvas.height = 1080;
    this.ok = !!this.canvas.getContext('webgl', this.opts());
    this.ready = false;
    this.ready$ = new Promise((r) => { this._resolve = r; });
    if (!this.ok) { this._resolve(); return; }
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ready = false; }, false);
    this.canvas.addEventListener('webglcontextrestored', () => this.build(), false);
    this.build();
  }

  opts() { return { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: CAPTURE, powerPreference: 'low-power' }; }

  async build() {
    const gl = this.gl = this.canvas.getContext('webgl', this.opts());
    const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, PRECISION + this.frag));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of this.names) this.u[n] = gl.getUniformLocation(prog, n);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.DITHER);

    try {
      const got = await Promise.all(this.textures.map((t) => (t.url ? decode(t.url) : t.data)));
      if (gl.isContextLost()) return;
      got.forEach((src, i) => {
        const t = this.textures[i];
        gl.activeTexture(gl.TEXTURE0 + t.unit); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.uniform1i(this.u[t.name], t.unit);
        const fmt = t.rgba ? gl.RGBA : gl.RGB;
        if (src.data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, src.N, src.N, 0, gl.RGBA, gl.UNSIGNED_BYTE, src.data);
        else gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, src);
        const wrap = t.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (t.after) t.after(src, gl, this.u);
        if (src.close) src.close();   // the bitmap's memory goes back at once, the texture keeps the pixels
      });
      this.ready = true;
    } catch (e) {
      console.error('scene', e);   // the plain picture stays
    }
    this._resolve();
  }

  draw() { this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4); }
}
