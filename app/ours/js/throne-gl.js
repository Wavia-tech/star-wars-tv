// The throne room: the picture as painted (with one fix, see tools/throne_fix.py) and a thick mist lying on the
// floor: three bands of the seamless mist picture from Poudlard TV, drifting at different speeds. Nothing else moves; the
// emperor's lightning is drawn on top by home.js. Above the floor the shader only reads the picture.
import { GLScene, noiseTexture, fract } from './glscene.js';

const FLOOR = 0.815;
// band: centre y, height, width on screen (picture widths), speed; and its strength
const BANDS = [
  [FLOOR + 0.005, 0.10, 0.85, 0.0045, 0.60],
  [FLOOR + 0.055, 0.15, 1.25, -0.0065, 0.82],
  [FLOOR + 0.14, 0.24, 1.9, 0.0105, 0.68],
];
const TOP = Math.min(FLOOR - 0.06, ...BANDS.map((b) => b[0] - b[1] / 2));
const STRIP_TOP = Math.floor(TOP * 1080 / 8) * 8 - 8;    // the canvas starts just above the mist

const f = (x) => x.toFixed(4);
const FRAG = `
varying vec2 vUv;
uniform sampler2D uImg, uNoise, uMist;
uniform vec3 uMistPh, uPatchPh;   // each band's drift, as a phase (0..1)
uniform vec2 uCover;
const vec3 TINT = vec3(0.60, 0.66, 0.78);

vec3 band(vec3 col, vec2 uv, float cy, float h, float w, float ph, float pph, float i, float strength) {
  float v = (uv.y - (cy - h * 0.5)) / h;
  if (v < 0.0 || v > 1.0) return col;
  vec2 q = vec2(uv.x / w + ph + i * 0.31, v);
  // softened (two taps a little apart) so the wisps read as vapour, not drawn curls
  vec4 mt = (texture2D(uMist, q) + texture2D(uMist, q + vec2(0.004, 0.03))) * 0.5;
  // broken up by a slow large-scale noise, so the bank thins and thickens along its length like real mist
  float patchy = smoothstep(0.25, 0.75, texture2D(uNoise, vec2(uv.x * 1.3 + pph + i * 0.4, v * 0.4 + i * 0.2)).r);
  float edge = smoothstep(0.0, 0.35, v) * (1.0 - smoothstep(0.7, 1.0, v));
  return mix(col, TINT * mix(0.72, 1.0, mt.r), mt.a * strength * (0.45 + 0.55 * patchy) * edge);
}

void main() {
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  vec3 col = texture2D(uImg, uv).rgb;
  if (uv.y > ${f(TOP)}) {
    // a faint even haze along the floor holds the bands together
    float haze = smoothstep(${f(FLOOR - 0.06)}, ${f(FLOOR + 0.05)}, uv.y) * (1.0 - 0.3 * smoothstep(${f(FLOOR + 0.08)}, 1.0, uv.y));
    col = mix(col, TINT * 0.75, haze * 0.18);
${BANDS.map((b, i) => `    col = band(col, uv, ${f(b[0])}, ${f(b[1])}, ${f(b[2])}, uMistPh[${i}], uPatchPh[${i}], ${i}.0, ${f(b[4])});`).join('\n')}
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export class ThroneGL extends GLScene {
  constructor(src) {
    super({
      strip: [STRIP_TOP, 1080 - STRIP_TOP], scale: 0.5,   // mist is soft: half the resolution never shows
      frag: FRAG,
      uniforms: ['uImg', 'uNoise', 'uMist', 'uMistPh', 'uPatchPh', 'uCover'],
      textures: [
        { name: 'uImg', unit: 0, url: src, after: (im, gl, u) => {
          const s = Math.max(1920 / im.width, 1080 / im.height);
          gl.uniform2f(u.uCover, 1920 / (im.width * s), 1080 / (im.height * s));
        } },
        { name: 'uNoise', unit: 1, data: noiseTexture(3, 11), repeat: true },
        { name: 'uMist', unit: 2, url: src.replace(/[^/]+$/, '') + 'mist-tile.png', repeat: true, rgba: true },
      ],
    });
  }

  render(t) {
    if (!this.ready) return;
    const gl = this.gl, u = this.u;
    gl.uniform3f(u.uMistPh, ...BANDS.map((b) => fract(t * b[3])));
    gl.uniform3f(u.uPatchPh, ...BANDS.map((b) => fract(t * b[3] * 0.5)));
    this.draw();
  }
}

// where the lightning leaves the emperor's raised hand, in stage pixels (picture 0.6235, 0.3447)
export const THRONE_HAND = { x: 1197, y: 371 };
