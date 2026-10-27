precision highp float;

uniform float uTime;
uniform float uFade;   // 1 at hero, →0 as you scroll past
uniform float uReveal; // 0→1 intro fade-in as the name assembles
uniform float uGlow;   // per-particle contribution (lower without bloom)

varying float vSeed;
varying vec3 vPos;

void main() {
  // Soft round sprite.
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d);

  // Readability first: the name stays solid and bright (density tricks
  // punch holes in the glyphs — tried, rejected). Contrast against the
  // water comes from the backdrop darkening behind the name instead.
  vec3 col = mix(vec3(0.70, 0.97, 0.90), vec3(0.96, 1.0, 0.98), vSeed);

  // A touch of white-hot energy where particles are pushed off the z=0 plane
  // (mouse / burst). Kept subtle so dense areas don't blow out to white.
  float energy = clamp(abs(vPos.z) * 0.5, 0.0, 1.0);
  col = mix(col, vec3(1.0), energy * 0.35);

  // Subtle twinkle.
  float tw = 0.85 + 0.15 * sin(uTime * 3.0 + vSeed * 30.0);

  // Low per-particle contribution — additive blending + bloom do the glow.
  gl_FragColor = vec4(col * tw, alpha * uFade * uReveal * uGlow);
}
