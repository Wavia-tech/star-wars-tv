// Tatooine's twin sunset, brought to life from the picture itself (WebGL, one pass, no added objects):
//  - heat shimmer over the horizon, which makes the two suns and the distant masts waver;
//  - thin veils of sand blown low across the ground, in gusts;
//  - the homestead door lamp flickering;
//  - a light film grain in the distance; Luke, the masts, the skiff and the homestead stay perfectly still.
// Every zone is given in picture coordinates (0..1), measured on assets/gen/sunset-hd.png.

const ZONES = {
  horizon: 0.553,
  tunic: [0.170, 0.283, 0.257, 0.513],   // left, top, right, bottom
  hair: [0.196, 0.208, 0.240, 0.282],
  lamp: [0.941, 0.553, 0.010],           // x, y, radius
};

const SHIP_BASE = 857 / 1520;   // where the crawler's tracks sit on the horizon
const SHIP_START = 987 / 2688;  // its place in the picture
const SHIP_END = 0.80;          // well behind the homestead
const SHIP_TIME = 150;          // seconds to get there

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImg, uNoise, uMask, uShip;
uniform vec4 uShipBox;   // left, top, width, height in picture coordinates
uniform float uT, uGust, uZoom;
uniform vec2 uCover, uDrift;
uniform float uHorizon;
uniform vec4 uTunic, uHair;
uniform vec3 uLamp;

float box(vec2 q, vec4 r, float soft) {
  return smoothstep(r.x - soft, r.x + soft, q.x) * (1.0 - smoothstep(r.z - soft, r.z + soft, q.x))
       * smoothstep(r.y - soft, r.y + soft, q.y) * (1.0 - smoothstep(r.w - soft, r.w + soft, q.y));
}
float hash(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  // screen -> picture (cover crop), then the slow camera breath
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  uv = (uv - 0.5) / uZoom + 0.5 + uDrift;

  vec2 fgm = texture2D(uMask, uv).rg;   // r: foreground objects, g: the same grown and softened
  float far = 1.0 - fgm.g;               // effects live only in the distance, never on Luke or the homestead

  // heat shimmer: strongest on the horizon line, fading above and below
  float band = smoothstep(uHorizon - 0.13, uHorizon - 0.01, uv.y) * (1.0 - smoothstep(uHorizon + 0.006, uHorizon + 0.09, uv.y));
  float n1 = texture2D(uNoise, vec2(uv.x * 4.0, uv.y * 22.0 - uT * 0.55)).r - 0.5;
  float n2 = texture2D(uNoise, vec2(uv.x * 7.0 + 0.37, uv.y * 34.0 - uT * 0.9)).g - 0.5;
  vec2 off = vec2(n1 * 0.0032, n2 * 0.0055) * band * far;

  vec3 col = texture2D(uImg, uv + off).rgb;

  // the big crawler rolling slowly along the horizon, behind Luke, under the suns, behind the homestead
  vec2 sp = (uv + off * 0.6 - uShipBox.xy) / uShipBox.zw;
  if (sp.x > 0.0 && sp.x < 1.0 && sp.y > 0.0 && sp.y < 1.0) {
    vec4 sh = texture2D(uShip, sp);
    col = mix(col, sh.rgb, sh.a * (1.0 - fgm.r));
  }
  // the dust its tracks kick up: anchored to the ground (so it stays behind as the crawler moves on),
  // thick and low at the tracks, rising, spreading and thinning out further back, slowly billowing upward
  float tail = uShipBox.x + uShipBox.z * 0.12;
  float behind = (tail - uv.x) / (uShipBox.z * 2.6);
  if (behind > -0.08 && behind < 1.0) {
    float ground = uShipBox.y + uShipBox.w * 0.93;
    float height = uShipBox.w * (0.18 + 0.75 * max(behind, 0.0));
    float vy = (ground - uv.y) / height;                       // 0 on the ground, 1 at the top of the plume
    float env = pow(1.0 - clamp(behind, 0.0, 1.0), 1.6) * smoothstep(-0.08, 0.06, behind)
              * smoothstep(-0.25, 0.05, vy) * (1.0 - smoothstep(0.35, 1.0, vy));
    float b1 = texture2D(uNoise, vec2(uv.x * 22.0, uv.y * 60.0 + uT * 0.035)).r;
    float b2 = texture2D(uNoise, vec2(uv.x * 47.0 + 0.31, uv.y * 120.0 + uT * 0.07)).g;
    float dens = env * smoothstep(0.32, 0.78, b1 * 0.65 + b2 * 0.35);
    vec3 dust = mix(col, vec3(0.96, 0.74, 0.56), 0.55);        // takes the light of the scene it sits in
    col = mix(col, dust, dens * 0.6 * (1.0 - fgm.r));
  }

  // thin bands of high haze drifting slowly across the sky, passing in front of the suns
  float sky = 1.0 - smoothstep(uHorizon - 0.03, uHorizon, uv.y);
  float h1 = texture2D(uNoise, vec2(uv.x * 0.9 + uT * 0.010, uv.y * 5.0)).r;
  float h2 = texture2D(uNoise, vec2(uv.x * 1.8 + uT * 0.018 + 0.4, uv.y * 9.0 + 0.2)).g;
  float haze = smoothstep(0.45, 0.8, h1 * 0.65 + h2 * 0.35) * sky * far;
  col = mix(col, vec3(1.0, 0.78, 0.6), haze * 0.16);

  // sand veils, blown from right to left just above the ground, finer and slower toward the horizon
  float ground = smoothstep(uHorizon + 0.005, uHorizon + 0.07, uv.y);
  float depth = clamp((uv.y - uHorizon) / (1.0 - uHorizon), 0.0, 1.0);
  float speed = mix(0.05, 0.22, depth);
  float a = texture2D(uNoise, vec2(uv.x * mix(3.4, 1.3, depth) + uT * speed, uv.y * mix(30.0, 8.0, depth))).r;
  float b = texture2D(uNoise, vec2(uv.x * mix(6.0, 2.4, depth) + uT * speed * 1.7 + 0.5, uv.y * mix(52.0, 15.0, depth) + 0.3)).g;
  float veil = smoothstep(0.44, 0.78, a * 0.62 + b * 0.38);
  float amount = veil * ground * far * (0.12 + 0.30 * uGust) * mix(0.6, 1.0, depth);
  col = mix(col, vec3(1.0, 0.86, 0.68), amount);

  // the homestead door lamp
  float ld = distance(vec2(uv.x, uv.y * 0.5625), vec2(uLamp.x, uLamp.y * 0.5625));
  float flick = 0.94 + 0.06 * (texture2D(uNoise, vec2(uT * 0.9, 0.5)).r * 2.0 - 0.5);
  col *= 1.0 + (1.0 - smoothstep(0.0, uLamp.z, ld)) * (flick - 0.97) * 1.6;

  // fine film grain, 24 frames a second
  col += (hash(vUv * 1931.0 + floor(uT * 24.0)) - 0.5) * 0.028 * far;

  gl_FragColor = vec4(col, 1.0);
}`;

// A 256x256 tileable value-noise texture (four octaves), made once.
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
        const v = at(x0, y0) * (1 - sx) * (1 - sy) + at(x0 + 1, y0) * sx * (1 - sy) + at(x0, y0 + 1) * (1 - sx) * sy + at(x0 + 1, y0 + 1) * sx * sy;
        out[y * N + x] += v * amp;
      }
    }
    return out;
  };
  const r = layer(1), g = layer(7);
  for (let i = 0; i < N * N; i++) { data[i * 4] = Math.min(255, r[i] / 0.9375 * 255); data[i * 4 + 1] = Math.min(255, g[i] / 0.9375 * 255); data[i * 4 + 3] = 255; }
  return { N, data };
}

export class TatooineGL {
  constructor(src) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'bg';
    this.canvas.width = 1920; this.canvas.height = 1080;
    const gl = this.gl = this.canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    this.ok = !!gl;
    this.ready = false;
    if (!gl) return;

    const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const prog = this.prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uImg', 'uNoise', 'uMask', 'uShip', 'uShipBox', 'uT', 'uGust', 'uZoom', 'uCover', 'uDrift', 'uHorizon', 'uTunic', 'uHair', 'uLamp']) this.u[n] = gl.getUniformLocation(prog, n);

    const nz = noiseTexture();
    this.noise = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.noise);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, nz.N, nz.N, 0, gl.RGBA, gl.UNSIGNED_BYTE, nz.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(this.u.uImg, 0); gl.uniform1i(this.u.uNoise, 1); gl.uniform1i(this.u.uMask, 2); gl.uniform1i(this.u.uShip, 3);
    gl.uniform1f(this.u.uHorizon, ZONES.horizon);
    gl.uniform4f(this.u.uTunic, ...ZONES.tunic); gl.uniform4f(this.u.uHair, ...ZONES.hair);
    gl.uniform3f(this.u.uLamp, ...ZONES.lamp);

    this.pending = 3;
    const load = (url, unit, fmt, after) => {
      const im = new Image();
      im.onload = () => {
        const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (after) after(im);
        if (--this.pending === 0) this.ready = true;
      };
      im.src = url;
    };
    const base = src.replace(/[^/]+$/, '');
    load(base + 'tatooine-mask.png', 2, gl.RGB);
    load(base + 'tatooine-ship.png', 3, gl.RGBA, (im) => { this.shipW = im.width / 2688; this.shipH = im.height / 1520; });
    const img = new Image();
    img.onload = () => {
      this.tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const s = Math.max(1920 / img.width, 1080 / img.height);
      gl.uniform2f(this.u.uCover, 1920 / (img.width * s), 1080 / (img.height * s));
      if (--this.pending === 0) this.ready = true;
    };
    img.src = src;
  }

  render(t) {
    if (!this.ready) return;
    const gl = this.gl;
    // gusts: a slow, irregular swell between calm and windy
    const gust = Math.max(0, Math.min(1, 0.5 + 0.32 * Math.sin(t * 0.23) + 0.22 * Math.sin(t * 0.61 + 1.3) + 0.12 * Math.sin(t * 1.37 + 0.4)));
    gl.uniform1f(this.u.uT, t);
    gl.uniform1f(this.u.uGust, gust);
    gl.uniform1f(this.u.uZoom, 1.0);   // fixed camera: Luke and the homestead never move
    gl.uniform2f(this.u.uDrift, 0, 0);
    // the crawler: one slow journey from where it stands in the picture to behind the homestead, then it is gone
    if (this.t0 === undefined) this.t0 = t;
    const k = Math.min(1, (t - this.t0) / SHIP_TIME);
    const cx = SHIP_START + (SHIP_END - SHIP_START) * k;
    gl.uniform4f(this.u.uShipBox, cx - this.shipW / 2, SHIP_BASE - this.shipH + Math.sin(t * 1.3) * 0.00025, this.shipW, this.shipH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
