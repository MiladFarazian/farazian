precision highp float;

uniform float uTime;
uniform float uFade;   // 1 at hero, →0 as you scroll past
uniform float uReveal; // 0→1 intro fade-in as the name assembles
uniform float uGlow;   // per-particle contribution (lower without bloom)

varying float vSeed;
varying vec3 vPos;

float h2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x),
             mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  // Soft round sprite.
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d);

  // Internal contrast cannot come from per-particle color alone: the
  // sprites blend additively, and thousands of overlaps sum to white no
  // matter what each one is tinted. So a drifting spatial noise thins
  // the field in coherent patches — the water shows through INSIDE the
  // letters — and tints the thin patches deeper blue. Reads as dappled
  // light moving across the name.
  float dapple = n2(vPos.xy * 2.6 + vec2(uTime * 0.18, -uTime * 0.12));
  dapple = clamp(dapple * 0.75 + 0.35 * n2(vPos.xy * 6.0 - vec2(uTime * 0.1, 0.0)), 0.0, 1.0);
  alpha *= 0.18 + 0.82 * dapple * dapple;

  vec3 bright = vec3(0.86, 1.0, 0.95);
  vec3 deep = vec3(0.07, 0.34, 0.58);
  vec3 col = mix(deep, bright, 0.15 + 0.85 * dapple);

  // A touch of white-hot energy where particles are pushed off the z=0 plane
  // (mouse / burst). Kept subtle so dense areas don't blow out to white.
  float energy = clamp(abs(vPos.z) * 0.5, 0.0, 1.0);
  col = mix(col, vec3(1.0), energy * 0.35);

  // Subtle twinkle.
  float tw = 0.85 + 0.15 * sin(uTime * 3.0 + vSeed * 30.0);

  // Low per-particle contribution — additive blending + bloom do the glow.
  gl_FragColor = vec4(col * tw, alpha * uFade * uReveal * uGlow);
}
