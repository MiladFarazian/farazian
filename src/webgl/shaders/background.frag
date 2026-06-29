precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse; // normalized 0..1
uniform float uFade;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 p = vUv - 0.5;
  float aspect = uResolution.x / uResolution.y;
  p.x *= aspect;

  float t = uTime * 0.05;
  vec2 g1 = vec2(sin(t * 1.3) * 0.38, cos(t) * 0.22);
  vec2 g2 = vec2(cos(t * 0.8) * 0.42, sin(t * 1.1) * 0.30 + 0.04);
  vec2 mp = uMouse - 0.5;
  mp.x *= aspect;

  // Deep, near-black base.
  vec3 col = vec3(0.014, 0.020, 0.034);

  // Soft, bounded neon glows (exponential falloff — never saturates to white).
  col += vec3(0.06, 0.52, 0.62) * exp(-length(p - g1) * 3.2) * 0.42;
  col += vec3(0.48, 0.22, 0.85) * exp(-length(p - g2) * 3.4) * 0.36;
  col += vec3(0.15, 0.68, 0.85) * exp(-length(p - mp) * 4.2) * 0.28; // pointer halo

  // Faint flowing nebula grain.
  float n = noise(p * 3.0 + t * 1.5) * 0.5 + noise(p * 6.0 - t) * 0.25;
  col += n * 0.022 * vec3(0.3, 0.5, 1.0);

  // Gentle vignette toward the edges.
  float vig = smoothstep(1.35, 0.25, length(p));
  col *= mix(0.55, 1.0, vig);

  // Dim as the visitor scrolls into the content sections.
  col *= mix(0.45, 1.0, uFade);

  gl_FragColor = vec4(col, 1.0);
}
