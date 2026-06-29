uniform sampler2D uPosition; // computed positions from the GPGPU pass
uniform float uSize;
uniform float uPixelRatio;

attribute vec2 reference; // uv into the simulation texture

varying float vSeed;
varying vec3 vPos;

void main() {
  vec4 data = texture2D(uPosition, reference);
  vec3 pos = data.xyz;
  vSeed = data.w;
  vPos = pos;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = uSize * (0.55 + vSeed * 0.9);
  // Perspective-correct point size, tuned so particles read as fine grains
  // (a few CSS px) rather than huge overlapping sprites.
  gl_PointSize = size * uPixelRatio * (8.0 / -mv.z);
}
