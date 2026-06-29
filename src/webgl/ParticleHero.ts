import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { gsap } from "gsap";

import type { DeviceProfile } from "../core/device";
import { buildTextTargets } from "./textTargets";

import simPosition from "./shaders/simPosition.glsl";
import particleVert from "./shaders/particle.vert";
import particleFrag from "./shaders/particle.frag";
import bgVert from "./shaders/background.vert";
import bgFrag from "./shaders/background.frag";

export class ParticleHero {
  private canvas: HTMLCanvasElement;
  private profile: DeviceProfile;
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;

  private scene = new THREE.Scene();
  private bgScene = new THREE.Scene();
  private bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private bgMaterial!: THREE.ShaderMaterial;

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
  private running = false;
  private failed = false;

  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private worldWidth = 5;

  // Debug: ?formed=1 seeds particles directly at the name (skips the assemble
  // intro) so the formed state can be verified in software renderers. Inert
  // in normal use.
  private debugFormed =
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).has("formed");
  private lastTargets: Float32Array | null = null;

  constructor(canvas: HTMLCanvasElement, profile: DeviceProfile) {
    this.canvas = canvas;
    this.profile = profile;
    this.size = profile.simSize;

    try {
      this.initRenderer();
      this.initBackground();
      this.initGPU();
      this.initParticles();
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
    this.renderer.autoClear = false;

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

  private initBackground() {
    this.bgMaterial = new THREE.ShaderMaterial({
      vertexShader: bgVert,
      fragmentShader: bgFrag,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uMouse: { value: this.mouseNorm },
        uFade: { value: 1 },
      },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bgMaterial);
    this.bgScene.add(quad);
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
      targets as any, // three's typings vs TS 5.7 typed-array generics
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
        // Seed directly at the name (verification shortcut).
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
    // Pack into RGBA (xyz + keep seed slot, seed actually lives in position tex .w)
    const rgba = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      rgba[i * 4] = positions[i * 3];
      rgba[i * 4 + 1] = positions[i * 3 + 1];
      rgba[i * 4 + 2] = positions[i * 3 + 2];
      rgba[i * 4 + 3] = 1;
    }
    return rgba;
  }

  private initParticles() {
    const count = this.size * this.size;
    const geometry = new THREE.BufferGeometry();

    // A dummy position attribute (real positions come from the sim texture).
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
      },
    });

    this.points = new THREE.Points(geometry, this.particleMat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
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
    // Fade the particles in as they assemble so we never flash the dense cloud.
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
        // Only burst on the hero area (top viewport), not on UI taps below.
        if (e.clientY < window.innerHeight * 0.92 && window.scrollY < window.innerHeight * 0.6) {
          this.burstImpulse();
        }
      },
      { passive: true }
    );

    // Mobile gyroscope → virtual pointer that nudges the field.
    if (this.profile.isTouch && typeof DeviceOrientationEvent !== "undefined") {
      window.addEventListener(
        "deviceorientation",
        (e) => {
          if (e.gamma == null || e.beta == null) return;
          const gx = THREE.MathUtils.clamp(e.gamma / 35, -1, 1); // left/right
          const gy = THREE.MathUtils.clamp((e.beta - 45) / 35, -1, 1); // tilt
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
  }

  setFade(v: number) {
    this.fade = THREE.MathUtils.clamp(v, 0, 1);
  }

  setRunning(v: boolean) {
    this.running = v && !this.failed;
    if (this.running) this.clock.getDelta(); // reset delta to avoid jump
  }

  resize() {
    if (this.failed) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.updateWorldWidth();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.bgMaterial.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
    // Rebuild the name formation for the new aspect.
    const targetTex = this.posVar.material.uniforms.uTarget.value as THREE.DataTexture;
    const targets = this.buildTargets();
    (targetTex.image.data as unknown as Float32Array).set(targets);
    targetTex.needsUpdate = true;
  }

  update() {
    if (!this.running || this.failed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    // Smooth the pointer for buttery force-field motion.
    this.mouseWorld.lerp(this.mouseTarget, 0.12);
    if (this.mouseActive > 0 && !this.profile.isTouch) {
      this.mouseActive = Math.max(0, this.mouseActive - dt * 0.4);
    }

    // Update sim uniforms.
    const u = this.posVar.material.uniforms;
    u.uTime.value = elapsed;
    u.uMouseActive.value = this.mouseActive;
    u.uBurst.value = this.burst;

    this.gpu.compute();

    // Feed computed positions into the render material.
    this.particleMat.uniforms.uPosition.value =
      this.gpu.getCurrentRenderTarget(this.posVar).texture;
    this.particleMat.uniforms.uTime.value = elapsed;
    this.particleMat.uniforms.uFade.value = this.fade;

    this.bgMaterial.uniforms.uTime.value = elapsed;
    this.bgMaterial.uniforms.uFade.value = 0.55 + this.fade * 0.45;

    // Draw: background first, particles on top (additive).
    this.renderer.clear();
    this.renderer.render(this.bgScene, this.bgCamera);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    this.renderer?.dispose();
  }
}
