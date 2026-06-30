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
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.0 + 11.3;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = vUv - 0.5;
  float aspect = uResolution.x / uResolution.y;
  p.x *= aspect;

  float t = uTime * 0.035;

  // Domain-warped fbm — a slow, flowing aurora / nebula.
  vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p * 1.4 + 1.9 * q + vec2(1.7, 9.2) + 0.15 * t),
    fbm(p * 1.4 + 1.9 * q + vec2(8.3, 2.8) - 0.12 * t)
  );
  float f = fbm(p * 1.4 + 1.7 * r);

  // Deep, dark nebula. Kept well below the bloom threshold so only the
  // particle name glows — the background just adds slow colour and depth.
  vec3 col = vec3(0.008, 0.014, 0.026);
  col += vec3(0.04, 0.17, 0.23) * clamp(f * f * 1.4, 0.0, 1.0) * 0.5;
  col += vec3(0.17, 0.07, 0.27) * clamp(length(r) - 0.4, 0.0, 1.0) * 0.45;
  col += vec3(0.06, 0.22, 0.30) * pow(clamp(f, 0.0, 1.0), 4.0) * 0.3;

  // Pointer halo.
  vec2 mp = uMouse - 0.5;
  mp.x *= aspect;
  col += vec3(0.10, 0.5, 0.65) * exp(-length(p - mp) * 4.5) * 0.16;

  // Vignette + scroll dim.
  col *= smoothstep(1.35, 0.25, length(p));
  col *= mix(0.4, 1.0, uFade);

  gl_FragColor = vec4(col, 1.0);
}
