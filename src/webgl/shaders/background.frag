precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse; // normalized 0..1
uniform float uFade;
uniform float uSchool; // 1 = fish-school mode: full water in the backdrop

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

  // Sunlit water. Kept below the bloom threshold so only the particle
  // name glows — the fbm field reads as caustic light drifting through
  // the column.
  vec3 deep = vec3(0.034, 0.30, 0.50); // sits on the page's #0a639a band
  vec3 col = deep;
  col += vec3(0.18, 0.42, 0.40) * clamp(f * f * 1.4, 0.0, 1.0) * 0.5;
  col += vec3(0.12, 0.30, 0.46) * clamp(length(r) - 0.4, 0.0, 1.0) * 0.45;
  col += vec3(0.22, 0.46, 0.44) * pow(clamp(f, 0.0, 1.0), 4.0) * 0.35;

  // Light from the surface: a bright wash at the top of the frame.
  col += vec3(0.30, 0.55, 0.60) * smoothstep(0.1, 0.9, p.y) * 0.22;

  // School mode: the backdrop carries the page's full water — caustic
  // webs and rising bubbles — so the landing view reads underwater.
  if (uSchool > 0.5) {
    // Ridged noise makes thin crossing filaments (bright only where each
    // field crosses its midline) — raw fbm makes glowing continents that
    // blow out under bloom.
    float c1 = 1.0 - abs(2.0 * fbm(p * 3.4 + vec2(uTime * 0.20, uTime * 0.08)) - 1.0);
    float c2 = 1.0 - abs(2.0 * fbm(p * 3.4 + vec2(-uTime * 0.16, uTime * 0.12) + 4.7) - 1.0);
    float caust = pow(clamp(c1 * c2, 0.0, 1.0), 7.0);
    col += vec3(0.45, 0.95, 0.88) * caust * 0.5 * (0.3 + 0.5 * smoothstep(-0.5, 0.5, p.y));
    float bub = 0.0;
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      float sc = 2.2 + fi * 1.4;
      vec2 bp = vec2(p.x, p.y - uTime * (0.055 + 0.03 * fi)) * sc + vec2(fi * 17.3, 0.0);
      vec2 id = floor(bp);
      float rn = hash(id);
      vec2 l = fract(bp) - 0.5;
      l.x -= (rn - 0.5) * 0.5;
      l.y -= (hash(id + vec2(7.7, 3.1)) - 0.5) * 0.5;
      bub += smoothstep(0.05 + rn * 0.02, 0.02, length(l)) * step(0.8, rn);
    }
    col += vec3(0.75, 0.93, 1.0) * bub * 0.3;
  }

  // Pointer halo — seafoam.
  vec2 mp = uMouse - 0.5;
  mp.x *= aspect;
  col += vec3(0.40, 0.78, 0.68) * exp(-length(p - mp) * 4.5) * 0.16;

  // Vignette settles back into the deep (the page behind is ocean, not
  // black) + scroll dim.
  col = mix(deep * 0.78, col, smoothstep(1.35, 0.25, length(p)));
  col *= mix(0.55, 1.0, uFade);

  gl_FragColor = vec4(col, 1.0);
}
