// GPGPU position simulation.
// GPUComputationRenderer injects `texturePosition` (this variable) and `resolution`.
uniform float uTime;
uniform vec2 uMouse;        // world-space mouse on the z=0 plane
uniform float uMouseActive; // 0..1
uniform float uForming;     // 0..1 — how strongly particles snap to the name
uniform float uBurst;       // 0..1 — decaying impulse on click/tap
uniform sampler2D uTarget;  // target ("home") positions = the name

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 data = texture2D(texturePosition, uv);
  vec3 pos = data.xyz;
  float seed = data.w;

  vec3 target = texture2D(uTarget, uv).xyz;

  // Spring toward the name — stiffness grows as we "form".
  vec3 toTarget = target - pos;
  float k = mix(0.010, 0.080, uForming);
  vec3 acc = toTarget * k;

  // Ambient swirl when loose (fades out as the name resolves).
  float t = uTime * 0.15 + seed * 6.2831;
  vec3 swirl = vec3(
    sin(pos.y * 1.3 + t),
    sin(pos.z * 1.3 + t * 1.2),
    sin(pos.x * 1.3 + t * 0.8)
  );
  acc += swirl * (0.006 * (1.0 - uForming * 0.85));

  // Mouse / touch force field — particles flee the pointer.
  vec2 d2 = pos.xy - uMouse;
  float dist = length(d2);
  float infl = uMouseActive * exp(-dist * dist * 2.5);
  acc.xy += normalize(d2 + 0.0001) * infl * 0.065;
  acc.z += infl * 0.05 * (seed - 0.5);

  // Burst impulse — blow the cloud outward, then it reassembles.
  vec3 outward = normalize(pos + 0.0001);
  acc += outward * uBurst * (0.10 + 0.06 * seed);

  pos += acc;

  // Keep the formation readable by easing toward the z=0 plane.
  pos.z *= 0.965;

  gl_FragColor = vec4(pos, seed);
}
