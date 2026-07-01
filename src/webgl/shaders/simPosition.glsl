// GPGPU position simulation.
// GPUComputationRenderer injects `texturePosition` (this variable) and `resolution`.
uniform float uTime;
uniform vec2 uMouse;        // world-space pointer on the z=0 plane
uniform float uMouseActive; // 0..1
uniform float uForming;     // 0..1 — how strongly particles snap to the name
uniform float uBurst;       // 0..1 — decaying impulse on click/tap
uniform float uScatter;     // 0..1 — scroll dissolve (name → drifting stardust)
uniform vec2 uShockCenter;  // world xy where the last click landed
uniform float uShockRadius; // expanding shockwave ring radius
uniform float uShockActive; // 0..1 — decaying shockwave strength
uniform sampler2D uTarget;  // target ("home") positions = the name

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 data = texture2D(texturePosition, uv);
  vec3 pos = data.xyz;
  float seed = data.w;

  vec3 target = texture2D(uTarget, uv).xyz;

  // Scroll dissolve loosens the grip on the name.
  float form = uForming * (1.0 - uScatter);

  // Spring toward the name — stiffness grows as we "form".
  vec3 toTarget = target - pos;
  float k = mix(0.010, 0.080, form);
  vec3 acc = toTarget * k;

  // Ambient swirl when loose + a tiny always-on shimmer so the name breathes.
  float t = uTime * 0.15 + seed * 6.2831;
  vec3 swirl = vec3(
    sin(pos.y * 1.3 + t),
    sin(pos.z * 1.3 + t * 1.2),
    sin(pos.x * 1.3 + t * 0.8)
  );
  acc += swirl * (0.006 * (1.0 - form * 0.85) + 0.0018);

  // Pointer force field: repel + swirl tangentially = a little vortex.
  vec2 d2 = pos.xy - uMouse;
  float dist = length(d2);
  float infl = uMouseActive * exp(-dist * dist * 2.5);
  vec2 rad = normalize(d2 + 0.0001);
  vec2 tang = vec2(-rad.y, rad.x);
  acc.xy += rad * infl * 0.052;   // push away
  acc.xy += tang * infl * 0.05;   // orbit → vortex
  acc.z += infl * 0.05 * (seed - 0.5);

  // Burst — quick outward pop on click/tap.
  vec3 outward = normalize(pos + 0.0001);
  acc += outward * uBurst * (0.09 + 0.05 * seed);

  // Shockwave — an expanding ring of force emanating from the click point. The
  // z kick lights up the "energy" term in the fragment shader, so a crisp band
  // of white-hot light sweeps through the letters as the ring passes.
  vec2 sc = pos.xy - uShockCenter;
  float sd = length(sc);
  float ring = exp(-pow(sd - uShockRadius, 2.0) * 3.6) * uShockActive;
  acc.xy += normalize(sc + 0.0001) * ring * 0.55;
  acc.z += ring * 0.5 * (seed - 0.5);

  // Scroll dissolve — drift outward + turbulence as the hero scrolls away.
  vec3 turb = vec3(
    sin(pos.y * 0.7 + uTime * 0.5),
    cos(pos.x * 0.7 - uTime * 0.4),
    sin(pos.z * 0.7 + uTime * 0.6)
  );
  acc += outward * uScatter * 0.06;
  acc += turb * uScatter * 0.03;

  pos += acc;

  // Ease toward the z=0 plane (relaxed while scattering so it feels 3D).
  pos.z *= mix(0.965, 0.994, uScatter);

  gl_FragColor = vec4(pos, seed);
}
