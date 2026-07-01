import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { gsap } from "gsap";

import type { DeviceProfile } from "../core/device";
import { buildTextTargets } from "./textTargets";

import simPosition from "./shaders/simPosition.glsl";
import particleVert from "./shaders/particle.vert";
import particleFrag from "./shaders/particle.frag";
import bgVert from "./shaders/background.vert";
import bgFrag from "./shaders/background.frag";

// Cinematic final pass: subtle chromatic aberration toward the edges, film
// grain, and a vignette. Runs after bloom.
const FINAL_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uGrain: { value: 0.04 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uGrain;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      vec2 dir = c * (0.0016 + r2 * 0.0045);     // chromatic aberration
      float rC = texture2D(tDiffuse, uv - dir).r;
      float gC = texture2D(tDiffuse, uv).g;
      float bC = texture2D(tDiffuse, uv + dir).b;
      vec3 col = vec3(rC, gC, bC);
      float grain = hash(uv * uResolution + fract(uTime)) - 0.5;  // film grain
      col += grain * uGrain;
      col *= smoothstep(1.15, 0.32, length(c));   // vignette
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class ParticleHero {
  private canvas: HTMLCanvasElement;
  private profile: DeviceProfile;
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;

  private scene = new THREE.Scene();
  private bgMaterial!: THREE.ShaderMaterial;
  private bgMesh!: THREE.Mesh;

  private composer?: EffectComposer;
  private bloomPass?: UnrealBloomPass;
  private finalPass?: ShaderPass;
  private usePost = false;

  private gpu!: GPUComputationRenderer;
  private posVar!: ReturnType<GPUComputationRenderer["addVariable"]>;
  private particleMat!: THREE.ShaderMaterial;
  private points!: THREE.Points;

  private size: number;
  private clock = new THREE.Clock();
  private mouseWorld = new THREE.Vector2(0, 0);
  private mouseTarget = new THREE.Vector2(0, 0);
  private mouseNorm = new THREE.Vector2(0.5, 0.5);
  private mouseActive = 0;
  private burst = 0;
  private fade = 1;
  private scatter = 0;
  private shockCenter = new THREE.Vector2(0, 0);
  private running = false;
  private failed = false;

  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private worldWidth = 5;

  // Debug: ?formed=1 seeds particles directly at the name (skips the assemble
  // intro) so the formed state can be verified in software renderers.
  private debugFormed =
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).has("formed");
  private lastTargets: Float32Array | null = null;

  constructor(canvas: HTMLCanvasElement, profile: DeviceProfile) {
    this.canvas = canvas;
    this.profile = profile;
    this.size = profile.simSize;
    // Post-processing (bloom + grain). Enabled on any mid/high device — capable
    // phones now get a lightweight, mobile-tuned bloom so the name actually
    // glows; only "low" tier (weak/old hardware) skips it.
    this.usePost = profile.tier !== "low";

    try {
      this.initRenderer();
      this.initBackground();
      this.initGPU();
      this.initParticles();
      this.initPost();
      this.bindEvents();
    } catch (err) {
      console.warn("[ParticleHero] WebGL init failed, falling back:", err);
      this.failed = true;
    }
  }

  get didFail() {
    return this.failed;
  }

  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x04060a, 1);
    this.renderer.setPixelRatio(this.profile.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.z = 6;
    this.updateWorldWidth();
  }

  private updateWorldWidth() {
    const visH = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    const visW = visH * this.camera.aspect;
    this.worldWidth = Math.min(visW * 0.86, 6.2);
  }

  /** A full-frustum backdrop plane behind the particles, in the same scene so a
   *  single RenderPass (and thus bloom) covers everything. */
  private initBackground() {
    this.bgMaterial = new THREE.ShaderMaterial({
      vertexShader: bgVert,
      fragmentShader: bgFrag,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: this.mouseNorm },
        uFade: { value: 1 },
      },
    });
    this.bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.bgMaterial);
    this.bgMesh.position.z = -6;
    this.bgMesh.renderOrder = -1;
    this.scene.add(this.bgMesh);
    this.updateBackdrop();
  }

  private updateBackdrop() {
    const dist = this.camera.position.z - this.bgMesh.position.z;
    const visH = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * dist;
    const visW = visH * this.camera.aspect;
    this.bgMesh.scale.set(visW * 1.1, visH * 1.1, 1);
  }

  private initPost() {
    if (!this.usePost) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.profile.dpr);
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const strong = this.profile.tier === "high";
    const mobile = this.profile.isMobile;
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      strong ? 0.55 : mobile ? 0.5 : 0.42, // strength
      0.4, // radius
      strong ? 0.34 : mobile ? 0.3 : 0.42 // threshold — only bright cores bloom
    );
    this.composer.addPass(this.bloomPass);

    this.finalPass = new ShaderPass(FINAL_SHADER);
    this.finalPass.uniforms.uResolution.value.set(w * this.profile.dpr, h * this.profile.dpr);
    // Lighter grain on mobile — high-DPR small screens make it read as noise.
    this.finalPass.uniforms.uGrain.value = mobile ? 0.018 : 0.04;
    this.composer.addPass(this.finalPass);
  }

  private initGPU() {
    this.gpu = new GPUComputationRenderer(this.size, this.size, this.renderer);

    const targets = this.buildTargets();
    this.lastTargets = targets;

    const posTex = this.gpu.createTexture();
    this.seedPositions(posTex);

    this.posVar = this.gpu.addVariable("texturePosition", simPosition, posTex);
    this.gpu.setVariableDependencies(this.posVar, [this.posVar]);

    const targetTex = new THREE.DataTexture(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      targets as any,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    targetTex.needsUpdate = true;

    Object.assign(this.posVar.material.uniforms, {
      uTime: { value: 0 },
      uMouse: { value: this.mouseWorld },
      uMouseActive: { value: 0 },
      uForming: { value: this.debugFormed ? 1 : 0 },
      uBurst: { value: 0 },
      uScatter: { value: 0 },
      uShockCenter: { value: this.shockCenter },
      uShockRadius: { value: 0 },
      uShockActive: { value: 0 },
      uTarget: { value: targetTex },
    });

    const err = this.gpu.init();
    if (err) throw new Error(err);
  }

  /** Initial cloud: a soft sphere of particles, each with a stable seed in .w */
  private seedPositions(tex: THREE.DataTexture) {
    const data = tex.image.data as unknown as Float32Array;
    for (let i = 0; i < data.length; i += 4) {
      if (this.debugFormed && this.lastTargets) {
        const j = (i / 4) * 3;
        data[i] = this.lastTargets[j] + (Math.random() - 0.5) * 0.02;
        data[i + 1] = this.lastTargets[j + 1] + (Math.random() - 0.5) * 0.02;
        data[i + 2] = this.lastTargets[j + 2];
        data[i + 3] = Math.random();
        continue;
      }
      const r = 3 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      data[i] = r * Math.sin(phi) * Math.cos(theta);
      data[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      data[i + 2] = r * Math.cos(phi);
      data[i + 3] = Math.random(); // seed
    }
  }

  private buildTargets(): Float32Array {
    const count = this.size * this.size;
    const twoLines = window.innerWidth < 760;
    const positions = buildTextTargets({
      text: "MILAD FARAZIAN",
      count,
      worldWidth: this.worldWidth,
      twoLines,
    });
    const yOffset = twoLines ? 0.95 : 0;
    const rgba = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      rgba[i * 4] = positions[i * 3];
      rgba[i * 4 + 1] = positions[i * 3 + 1] + yOffset;
      rgba[i * 4 + 2] = positions[i * 3 + 2];
      rgba[i * 4 + 3] = 1;
    }
    return rgba;
  }

  private initParticles() {
    const count = this.size * this.size;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const references = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      references[i * 2] = (i % this.size) / this.size;
      references[i * 2 + 1] = Math.floor(i / this.size) / this.size;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("reference", new THREE.BufferAttribute(references, 2));

    const baseSize = this.profile.tier === "high" ? 1.7 : this.profile.tier === "mid" ? 2.0 : 2.4;

    this.particleMat = new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPosition: { value: null },
        uSize: { value: baseSize },
        uPixelRatio: { value: this.profile.dpr },
        uTime: { value: 0 },
        uFade: { value: 1 },
        uReveal: { value: this.debugFormed ? 1 : 0 },
        uGlow: { value: 0.42 },
      },
    });

    this.points = new THREE.Points(geometry, this.particleMat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.updateGlow();
  }

  /** Per-particle brightness. Lower when there's no bloom (mobile/low), and
   *  lower again for the denser two-line layout so strokes don't clip to white. */
  private updateGlow() {
    const twoLines = window.innerWidth < 760;
    const mobile = this.profile.isMobile;
    const v = this.usePost
      ? twoLines
        ? mobile
          ? 0.28
          : 0.24
        : 0.42
      : twoLines
        ? 0.18
        : 0.3;
    this.particleMat.uniforms.uGlow.value = v;
  }

  /** Kick off the "assemble the name" intro. */
  form(delay = 0) {
    if (this.failed) return;
    if (this.debugFormed) {
      this.posVar.material.uniforms.uForming.value = 1;
      this.particleMat.uniforms.uReveal.value = 1;
      return;
    }
    gsap.to(this.posVar.material.uniforms.uForming, {
      value: 1,
      duration: 3.4,
      delay,
      ease: "power2.inOut",
    });
    gsap.fromTo(
      this.particleMat.uniforms.uReveal,
      { value: 0 },
      { value: 1, duration: 2.2, delay: delay + 0.3, ease: "power2.out" }
    );
  }

  burstImpulse() {
    if (this.failed) return;
    this.burst = 1;
    gsap.to(this, { burst: 0, duration: 1.1, ease: "power2.out" });
  }

  /** Expanding shockwave ring from a screen-space point (a click/tap). */
  private shockAt(clientX: number, clientY: number) {
    if (this.failed) return;
    const ndc = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.plane, hit)) {
      this.shockCenter.set(hit.x, hit.y);
    }
    const u = this.posVar.material.uniforms;
    gsap.killTweensOf([u.uShockRadius, u.uShockActive]);
    u.uShockRadius.value = 0;
    u.uShockActive.value = 1;
    gsap.to(u.uShockRadius, { value: 9, duration: 1.0, ease: "power2.out" });
    gsap.to(u.uShockActive, { value: 0, duration: 1.15, ease: "power2.in" });
    this.burstImpulse();
  }

  private bindEvents() {
    const onMove = (clientX: number, clientY: number) => {
      this.mouseNorm.set(clientX / window.innerWidth, 1 - clientY / window.innerHeight);
      const ndc = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(ndc, this.camera);
      const hit = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.plane, hit);
      if (hit) this.mouseTarget.set(hit.x, hit.y);
      this.mouseActive = 1;
    };

    window.addEventListener("pointermove", (e) => onMove(e.clientX, e.clientY), {
      passive: true,
    });
    window.addEventListener("pointerleave", () => (this.mouseActive = 0));
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (e.clientY < window.innerHeight * 0.92 && window.scrollY < window.innerHeight * 0.6) {
          this.shockAt(e.clientX, e.clientY);
        }
      },
      { passive: true }
    );

    if (this.profile.isTouch && typeof DeviceOrientationEvent !== "undefined") {
      window.addEventListener(
        "deviceorientation",
        (e) => {
          if (e.gamma == null || e.beta == null) return;
          const gx = THREE.MathUtils.clamp(e.gamma / 35, -1, 1);
          const gy = THREE.MathUtils.clamp((e.beta - 45) / 35, -1, 1);
          this.mouseTarget.set(gx * this.worldWidth * 0.4, -gy * this.worldWidth * 0.25);
          this.mouseNorm.set(0.5 + gx * 0.4, 0.5 - gy * 0.3);
          this.mouseActive = 0.7;
        },
        true
      );
    }
  }

  /** Re-rasterize the name into target positions (e.g. once webfonts load). */
  refreshFormation() {
    if (this.failed) return;
    const targetTex = this.posVar.material.uniforms.uTarget.value as THREE.DataTexture;
    const targets = this.buildTargets();
    (targetTex.image.data as unknown as Float32Array).set(targets);
    targetTex.needsUpdate = true;
    this.updateGlow();
  }

  setFade(v: number) {
    this.fade = THREE.MathUtils.clamp(v, 0, 1);
  }

  /** 0 = name held; →1 dissolves it into drifting stardust (driven by scroll). */
  setScatter(v: number) {
    this.scatter = THREE.MathUtils.clamp(v, 0, 1);
  }

  setRunning(v: boolean) {
    this.running = v && !this.failed;
    if (this.running) this.clock.getDelta();
  }

  resize() {
    if (this.failed) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.updateWorldWidth();
    this.updateBackdrop();
    this.renderer.setSize(w, h);
    this.bgMaterial.uniforms.uResolution.value.set(w, h);
    this.composer?.setSize(w, h);
    this.bloomPass?.setSize(w, h);
    this.finalPass?.uniforms.uResolution.value.set(w * this.profile.dpr, h * this.profile.dpr);
    // The name formation is intentionally NOT rebuilt here (see main.ts resize).
  }

  update() {
    if (!this.running || this.failed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.mouseWorld.lerp(this.mouseTarget, 0.12);
    if (this.mouseActive > 0 && !this.profile.isTouch) {
      this.mouseActive = Math.max(0, this.mouseActive - dt * 0.4);
    }

    const u = this.posVar.material.uniforms;
    u.uTime.value = elapsed;
    u.uMouseActive.value = this.mouseActive;
    u.uBurst.value = this.burst;
    u.uScatter.value = this.scatter;
    this.gpu.compute();

    this.particleMat.uniforms.uPosition.value =
      this.gpu.getCurrentRenderTarget(this.posVar).texture;
    this.particleMat.uniforms.uTime.value = elapsed;
    this.particleMat.uniforms.uFade.value = this.fade;

    this.bgMaterial.uniforms.uTime.value = elapsed;
    this.bgMaterial.uniforms.uFade.value = 0.55 + this.fade * 0.45;

    if (this.composer) {
      if (this.finalPass) this.finalPass.uniforms.uTime.value = elapsed;
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    this.running = false;
    this.composer?.dispose();
    this.renderer?.dispose();
  }
}
