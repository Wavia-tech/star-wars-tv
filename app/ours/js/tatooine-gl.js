// Tatooine's twin sunset, brought to life from the picture itself (WebGL, one pass):
//  - heat shimmer over the horizon, which makes the two suns and the distant masts waver;
//  - the big crawler rolling slowly along the horizon, its dust left hanging behind it;
//  - thin haze across the sky, veils of sand blown low across the ground, in gusts;
//  - the homestead door lamp flickering, a light film grain in the distance.
// Luke, the masts, the skiff and the homestead stay perfectly still (the mask keeps every effect off them).
// Each effect is only worked out in its own band of the screen, so most pixels cost a few texture reads.
import { GLScene, noiseTexture, fract } from './glscene.js';

const HORIZON = 0.553;
const LAMP = [0.941, 0.553, 0.010];   // x, y, radius (picture coordinates)

const SHIP_BASE = 857 / 1520;   // where the crawler's tracks sit on the horizon
const SHIP_START = 987 / 2688;  // its place in the picture
const SHIP_END = 0.80;          // well behind the homestead
const SHIP_TIME = 150;          // seconds to get there

const FRAG = `
varying vec2 vUv;
uniform sampler2D uImg, uNoise, uMask, uShip;
uniform vec4 uShipBox;   // left, top, width, height in picture coordinates
uniform vec4 uPh;        // time phases (0..1): shimmer x2, dust x2
uniform vec2 uPh2;       // haze x2
uniform float uVeilT, uGust, uFlick, uGrain;
uniform vec2 uCover;
const float H = ${HORIZON.toFixed(3)};
const vec3 LAMP = vec3(${LAMP.join(', ')});

float hash(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  vec2 fgm = texture2D(uMask, uv).rg;   // r: foreground objects, g: the same grown and softened
  float far = 1.0 - fgm.g;               // effects live only in the distance, never on Luke or the homestead

  // heat shimmer: strongest on the horizon line, fading above and below
  vec2 off = vec2(0.0);
  if (uv.y > H - 0.13 && uv.y < H + 0.09 && far > 0.0) {
    float band = smoothstep(H - 0.13, H - 0.01, uv.y) * (1.0 - smoothstep(H + 0.006, H + 0.09, uv.y));
    float n1 = texture2D(uNoise, vec2(uv.x * 4.0, uv.y * 22.0 - uPh.x)).r - 0.5;
    float n2 = texture2D(uNoise, vec2(uv.x * 7.0 + 0.37, uv.y * 34.0 - uPh.y)).g - 0.5;
    off = vec2(n1 * 0.0032, n2 * 0.0055) * band * far;
  }
  vec3 col = texture2D(uImg, uv + off).rgb;

  // the crawler, behind Luke, under the suns, then behind the homestead
  vec2 sp = (uv + off * 0.6 - uShipBox.xy) / uShipBox.zw;
  if (sp.x > 0.0 && sp.x < 1.0 && sp.y > 0.0 && sp.y < 1.0) {
    vec4 sh = texture2D(uShip, sp);
    col = mix(col, sh.rgb, sh.a * (1.0 - fgm.r));
  }
  // the dust its tracks kick up: anchored to the ground, thick and low at the tracks, rising and thinning further back
  float tail = uShipBox.x + uShipBox.z * 0.12;
  float behind = (tail - uv.x) / (uShipBox.z * 2.6);
  float groundY = uShipBox.y + uShipBox.w * 0.93;
  if (behind > -0.08 && behind < 1.0 && uv.y < groundY + uShipBox.w * 0.3 && uv.y > groundY - uShipBox.w * 1.0) {
    float height = uShipBox.w * (0.18 + 0.75 * max(behind, 0.0));
    float vy = (groundY - uv.y) / height;
    float env = pow(1.0 - clamp(behind, 0.0, 1.0), 1.6) * smoothstep(-0.08, 0.06, behind)
              * smoothstep(-0.25, 0.05, vy) * (1.0 - smoothstep(0.35, 1.0, vy));
    if (env > 0.002) {
      float b1 = texture2D(uNoise, vec2(uv.x * 22.0, uv.y * 60.0 + uPh.z)).r;
      float b2 = texture2D(uNoise, vec2(uv.x * 47.0 + 0.31, uv.y * 120.0 + uPh.w)).g;
      float dens = env * smoothstep(0.32, 0.78, b1 * 0.65 + b2 * 0.35);
      vec3 dust = mix(col, vec3(0.96, 0.74, 0.56), 0.55);
      col = mix(col, dust, dens * 0.6 * (1.0 - fgm.r));
    }
  }

  if (far > 0.0) {
    if (uv.y < H) {
      // thin bands of high haze drifting slowly across the sky, passing in front of the suns
      float sky = 1.0 - smoothstep(H - 0.03, H, uv.y);
      float h1 = texture2D(uNoise, vec2(uv.x * 0.9 + uPh2.x, uv.y * 5.0)).r;
      float h2 = texture2D(uNoise, vec2(uv.x * 1.8 + uPh2.y + 0.4, uv.y * 9.0 + 0.2)).g;
      float haze = smoothstep(0.45, 0.8, h1 * 0.65 + h2 * 0.35) * sky * far;
      col = mix(col, vec3(1.0, 0.78, 0.6), haze * 0.16);
    } else if (uv.y > H + 0.005) {
      // sand veils, blown from right to left just above the ground, finer and slower toward the horizon
      float ground = smoothstep(H + 0.005, H + 0.07, uv.y);
      float depth = clamp((uv.y - H) / (1.0 - H), 0.0, 1.0);
      float speed = mix(0.05, 0.22, depth);
      float a = texture2D(uNoise, vec2(uv.x * mix(3.4, 1.3, depth) + uVeilT * speed, uv.y * mix(30.0, 8.0, depth))).r;
      float b = texture2D(uNoise, vec2(uv.x * mix(6.0, 2.4, depth) + uVeilT * speed * 1.7 + 0.5, uv.y * mix(52.0, 15.0, depth) + 0.3)).g;
      float veil = smoothstep(0.44, 0.78, a * 0.62 + b * 0.38);
      col = mix(col, vec3(1.0, 0.86, 0.68), veil * ground * far * (0.12 + 0.30 * uGust) * mix(0.6, 1.0, depth));
    }
    // fine film grain, 24 frames a second
    col += (hash(vUv * 1931.0 + uGrain) - 0.5) * 0.028 * far;
  }

  // the homestead door lamp
  vec2 ld = vec2(uv.x - LAMP.x, (uv.y - LAMP.y) * 0.5625);
  if (abs(ld.x) < LAMP.z && abs(ld.y) < LAMP.z) col *= 1.0 + (1.0 - smoothstep(0.0, LAMP.z, length(ld))) * (uFlick - 0.97) * 1.6;

  gl_FragColor = vec4(col, 1.0);
}`;

export class TatooineGL extends GLScene {
  constructor(src) {
    const base = src.replace(/[^/]+$/, '');
    const nz = noiseTexture(1, 7);
    super({
      frag: FRAG,
      uniforms: ['uImg', 'uNoise', 'uMask', 'uShip', 'uShipBox', 'uPh', 'uPh2', 'uVeilT', 'uGust', 'uFlick', 'uGrain', 'uCover'],
      textures: [
        { name: 'uImg', unit: 0, url: src, after: (im, gl, u) => {
          const s = Math.max(1920 / im.width, 1080 / im.height);
          gl.uniform2f(u.uCover, 1920 / (im.width * s), 1080 / (im.height * s));
        } },
        { name: 'uNoise', unit: 1, data: nz, repeat: true },
        { name: 'uMask', unit: 2, url: base + 'tatooine-mask.png' },
        { name: 'uShip', unit: 3, url: base + 'tatooine-ship.png', rgba: true, after: (im) => { this.shipW = im.width / 2688; this.shipH = im.height / 1520; } },
      ],
    });
    this.nz = nz;
  }

  render(t) {
    if (!this.ready) return;
    const gl = this.gl, u = this.u;
    // gusts: a slow, irregular swell between calm and windy
    const gust = Math.max(0, Math.min(1, 0.5 + 0.32 * Math.sin(t * 0.23) + 0.22 * Math.sin(t * 0.61 + 1.3) + 0.12 * Math.sin(t * 1.37 + 0.4)));
    // every time term goes in as a phase (0..1), worked out here in double precision: no drift after hours on a TV chip
    gl.uniform4f(u.uPh, fract(t * 0.55), fract(t * 0.9), fract(t * 0.035), fract(t * 0.07));
    gl.uniform2f(u.uPh2, fract(t * 0.010), fract(t * 0.018));
    gl.uniform1f(u.uVeilT, t % 2000);   // the veils' speed varies with depth: a plain time, wrapped every half hour
    gl.uniform1f(u.uGust, gust);
    gl.uniform1f(u.uFlick, 0.94 + 0.06 * (this.nz.r(t * 0.9, 0.5) * 2 - 0.5));
    gl.uniform1f(u.uGrain, Math.floor(t * 24) % 1000);
    // the crawler: one slow journey from where it stands in the picture to behind the homestead, then it is gone
    if (this.t0 === undefined) this.t0 = t;
    const k = Math.min(1, (t - this.t0) / SHIP_TIME);
    const cx = SHIP_START + (SHIP_END - SHIP_START) * k;
    gl.uniform4f(u.uShipBox, cx - this.shipW / 2, SHIP_BASE - this.shipH + Math.sin(t * 1.3) * 0.00025, this.shipW, this.shipH);
    this.draw();
  }
}
