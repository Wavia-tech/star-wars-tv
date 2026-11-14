// The throne room: the picture as painted (with one fix, see tools/throne_fix.py) and a thick mist lying on the
// floor: three bands of the seamless mist picture from Poudlard TV, drifting at different speeds. Nothing else moves; the
// emperor's lightning is drawn on top by home.js.

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImg, uNoise, uMist;
uniform float uT;
uniform vec2 uCover;

float layer(vec2 uv, float scale, float speed, float stretch) {
  // soft, wispy noise, stretched sideways like mist lying on a floor
  vec2 q = vec2(uv.x * scale + uT * speed, uv.y * scale * stretch);
  float a = texture2D(uNoise, q).r;
  float b = texture2D(uNoise, q * 2.03 + vec2(0.37, 0.11) - vec2(uT * speed * 0.6, 0.0)).g;
  return a * 0.75 + b * 0.25;
}

void main() {
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  vec3 col = texture2D(uImg, uv).rgb;

  // the mist: three bands of the seamless mist picture (the one Poudlard TV's lake uses), lying on the floor,
  // drifting at different speeds; the nearer the band, the bigger, the faster and the thicker
  vec3 tint = vec3(0.60, 0.66, 0.78);
  float floorY = 0.815;
  // a faint even haze along the floor holds the bands together
  float haze = smoothstep(floorY - 0.06, floorY + 0.05, uv.y) * (1.0 - 0.3 * smoothstep(floorY + 0.08, 1.0, uv.y));
  col = mix(col, tint * 0.75, haze * 0.18);
  // band: centre y, height, width on screen (picture widths), speed, strength
  vec4 bands[3];
  bands[0] = vec4(floorY + 0.005, 0.10, 0.85, 0.0045);
  bands[1] = vec4(floorY + 0.055, 0.15, 1.25, -0.0065);
  bands[2] = vec4(floorY + 0.14, 0.24, 1.9, 0.0105);
  float strength[3];
  strength[0] = 0.6; strength[1] = 0.82; strength[2] = 0.68;
  for (int i = 0; i < 3; i++) {
    vec4 bd = bands[i];
    float v = (uv.y - (bd.x - bd.y * 0.5)) / bd.y;
    if (v < 0.0 || v > 1.0) continue;
    vec2 q = vec2(uv.x / bd.z + uT * bd.w + float(i) * 0.31, v);
    // softened (two taps a little apart) so the wisps read as vapour, not drawn curls
    vec4 mt = (texture2D(uMist, q) + texture2D(uMist, q + vec2(0.004, 0.03))) * 0.5;
    // broken up by a slow large-scale noise, so the bank thins and thickens along its length like real mist
    float patchy = smoothstep(0.25, 0.75, texture2D(uNoise, vec2(uv.x * 1.3 + uT * bd.w * 0.5 + float(i) * 0.4, v * 0.4 + float(i) * 0.2)).r);
    // soft top and bottom edges of each band
    float edge = smoothstep(0.0, 0.35, v) * (1.0 - smoothstep(0.7, 1.0, v));
    float a = mt.a * strength[i] * (0.45 + 0.55 * patchy) * edge;
    col = mix(col, tint * mix(0.72, 1.0, mt.r), a);
  }

  gl_FragColor = vec4(col, 1.0);
}`;

function noiseTexture() {
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
  const r = layer(3), g = layer(11);
  for (let i = 0; i < N * N; i++) { data[i * 4] = Math.min(255, r[i] / 0.9375 * 255); data[i * 4 + 1] = Math.min(255, g[i] / 0.9375 * 255); data[i * 4 + 3] = 255; }
  return { N, data };
}

export class ThroneGL {
  constructor(src, maskSrc) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'bg';
    this.canvas.width = 1920; this.canvas.height = 1080;
    const gl = this.gl = this.canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    this.ok = !!gl; this.ready = false;
    if (!gl) return;
    const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uImg', 'uNoise', 'uMist', 'uT', 'uCover']) this.u[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(this.u.uImg, 0); gl.uniform1i(this.u.uNoise, 1); gl.uniform1i(this.u.uMist, 2);

    const nz = noiseTexture();
    const tex = (unit, w, h, data, repeat) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      if (data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };
    tex(1, nz.N, nz.N, nz.data, true);
    this.pending = 2;
    const mist = new Image();
    mist.onload = () => {
      tex(2, 0, 0, null, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mist);
      if (--this.pending === 0) this.ready = true;
    };
    mist.src = src.replace(/[^/]+$/, '') + 'mist-tile.png';
    const im = new Image();
    im.onload = () => {
      tex(0); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      const s = Math.max(1920 / im.width, 1080 / im.height);
      gl.uniform2f(this.u.uCover, 1920 / (im.width * s), 1080 / (im.height * s));
      if (--this.pending === 0) this.ready = true;
    };
    im.src = src;
  }

  render(t) {
    if (!this.ready) return;
    const gl = this.gl;
    gl.uniform1f(this.u.uT, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// where the lightning leaves the emperor's raised hand, in stage pixels (picture 0.6235, 0.3447)
export const THRONE_HAND = { x: 1197, y: 371 };
