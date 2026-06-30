// ===== Interactive Browser Ray Tracer =====
// JS port of the C++ ray tracer for real-time interaction

// === Vec3 ===
class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
    mul(t) { return typeof t === 'number' ? new Vec3(this.x * t, this.y * t, this.z * t) : new Vec3(this.x * t.x, this.y * t.y, this.z * t.z); }
    div(t) { return new Vec3(this.x / t, this.y / t, this.z / t); }
    neg() { return new Vec3(-this.x, -this.y, -this.z); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) { return new Vec3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x); }
    len() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    lenSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    norm() { const l = this.len(); return new Vec3(this.x / l, this.y / l, this.z / l); }
}

function reflect(v, n) { return v.sub(n.mul(2 * v.dot(n))); }
function clamp01(v) {
    return new Vec3(Math.max(0, Math.min(1, v.x)), Math.max(0, Math.min(1, v.y)), Math.max(0, Math.min(1, v.z)));
}

// === Ray ===
class Ray {
    constructor(origin, direction) { this.origin = origin; this.direction = direction.norm(); }
    at(t) { return this.origin.add(this.direction.mul(t)); }
}

// === Material ===
const Material = {
    matte: (c) => ({ color: c, ambient: 0.15, diffuse: 0.8, specular: 0.1, shininess: 8, reflectivity: 0 }),
    glossy: (c) => ({ color: c, ambient: 0.1, diffuse: 0.6, specular: 0.6, shininess: 64, reflectivity: 0.15 }),
    mirror: (c) => ({ color: c, ambient: 0.05, diffuse: 0.3, specular: 0.9, shininess: 128, reflectivity: 0.8 }),
    checker: () => ({ color: new Vec3(0.9, 0.9, 0.9), ambient: 0.15, diffuse: 0.7, specular: 0.2, shininess: 16, reflectivity: 0.1 }),
};

// === Hittables ===
class Sphere {
    constructor(center, radius, mat) { this.center = center; this.radius = radius; this.mat = mat; }
    hit(ray, tMin, tMax) {
        const oc = ray.origin.sub(this.center);
        const a = ray.direction.dot(ray.direction);
        const b = oc.dot(ray.direction);
        const c = oc.dot(oc) - this.radius * this.radius;
        const disc = b * b - a * c;
        if (disc < 0) return null;
        const sqrtd = Math.sqrt(disc);
        let t = (-b - sqrtd) / a;
        if (t < tMin || t > tMax) { t = (-b + sqrtd) / a; if (t < tMin || t > tMax) return null; }
        const point = ray.at(t);
        return { t, point, normal: point.sub(this.center).div(this.radius), material: { ...this.mat, color: new Vec3(this.mat.color.x, this.mat.color.y, this.mat.color.z) } };
    }
}

class Plane {
    constructor(point, normal, mat, checker = false) { this.point = point; this.normal_ = normal.norm(); this.mat = mat; this.checker = checker; }
    hit(ray, tMin, tMax) {
        const denom = this.normal_.dot(ray.direction);
        if (Math.abs(denom) < 1e-8) return null;
        const t = this.point.sub(ray.origin).dot(this.normal_) / denom;
        if (t < tMin || t > tMax) return null;
        const point = ray.at(t);
        const normal = denom < 0 ? this.normal_ : this.normal_.neg();
        const material = { ...this.mat, color: new Vec3(this.mat.color.x, this.mat.color.y, this.mat.color.z) };
        if (this.checker) {
            const fx = Math.floor(point.x * 0.5);
            const fz = Math.floor(point.z * 0.5);
            const white = ((fx + fz) % 2 + 2) % 2 === 0;
            material.color = white ? new Vec3(0.85, 0.85, 0.85) : new Vec3(0.15, 0.15, 0.15);
        }
        return { t, point, normal, material };
    }
}

// === Scene ===
class Scene {
    constructor() { this.objects = []; }
    add(obj) { this.objects.push(obj); }
    hit(ray, tMin, tMax) {
        let closest = tMax, rec = null;
        for (const obj of this.objects) {
            const temp = obj.hit(ray, tMin, closest);
            if (temp) { closest = temp.t; rec = temp; }
        }
        return rec;
    }
}

// === Camera ===
class Camera {
    constructor(from, at, up, fovDeg, aspect) {
        const theta = fovDeg * Math.PI / 180;
        const h = Math.tan(theta / 2);
        const vpH = 2 * h, vpW = aspect * vpH;
        const w = from.sub(at).norm();
        const u = up.cross(w).norm();
        const v = w.cross(u);
        this.origin = from;
        this.horizontal = u.mul(vpW);
        this.vertical = v.mul(vpH);
        this.lowerLeft = from.sub(this.horizontal.div(2)).sub(this.vertical.div(2)).sub(w);
    }
    getRay(s, t) {
        return new Ray(this.origin, this.lowerLeft.add(this.horizontal.mul(s)).add(this.vertical.mul(t)).sub(this.origin));
    }
}

// === Renderer ===
const MAX_DEPTH = 3;
const BIAS = 1e-4;

function traceRay(ray, scene, lights, bgColor, depth, maxDepth) {
    maxDepth = maxDepth || MAX_DEPTH;
    if (depth >= maxDepth) return bgColor;

    const rec = scene.hit(ray, BIAS, 1e9);
    if (!rec) {
        const t = 0.5 * (ray.direction.y + 1.0);
        return bgColor.mul(1 - t).add(new Vec3(0.1, 0.15, 0.3).mul(t));
    }

    let color = rec.material.color.mul(rec.material.ambient * 0.1);
    const viewDir = ray.direction.neg();

    for (const light of lights) {
        const lightDir = light.position.sub(rec.point).norm();
        const lightDist = light.position.sub(rec.point).len();

        // Shadow
        const shadowRay = new Ray(rec.point.add(rec.normal.mul(BIAS)), lightDir);
        if (scene.hit(shadowRay, BIAS, lightDist)) continue;

        // Diffuse
        const diff = Math.max(0, rec.normal.dot(lightDir));
        color = color.add(rec.material.color.mul(light.color).mul(diff * rec.material.diffuse * light.intensity));

        // Specular (Blinn-Phong)
        const halfway = lightDir.add(viewDir).norm();
        const spec = Math.pow(Math.max(0, rec.normal.dot(halfway)), rec.material.shininess);
        color = color.add(light.color.mul(spec * rec.material.specular * light.intensity));
    }

    // Reflection
    if (rec.material.reflectivity > 0 && depth < maxDepth) {
        const reflDir = reflect(ray.direction, rec.normal);
        const reflRay = new Ray(rec.point.add(rec.normal.mul(BIAS)), reflDir);
        const reflColor = traceRay(reflRay, scene, lights, bgColor, depth + 1, maxDepth);
        color = color.mul(1 - rec.material.reflectivity).add(reflColor.mul(rec.material.reflectivity));
    }

    return clamp01(color);
}

// === App State ===
const W = 480, H = 270;
const W_FAST = 240, H_FAST = 135;
const lookAt = new Vec3(0, 0, -3);
const bgColor = new Vec3(0.02, 0.02, 0.06);
let orbitRadius, orbitTheta, orbitPhi;
let scene, lights, userSpheres = [];
let nextColor = new Vec3(0.7, 0.2, 0.8);
let renderGen = 0;

// Compute initial orbit from camera pos (0,2,4) relative to lookAt (0,0,-3)
const initOffset = new Vec3(0, 2, 7); // (0,2,4) - (0,0,-3)
orbitRadius = initOffset.len();
orbitPhi = Math.acos(initOffset.y / orbitRadius) * 180 / Math.PI;
orbitTheta = Math.atan2(initOffset.x, initOffset.z) * 180 / Math.PI;

function buildScene() {
    scene = new Scene();
    scene.add(new Plane(new Vec3(0, -1, 0), new Vec3(0, 1, 0), Material.checker(), true));
    scene.add(new Sphere(new Vec3(0, 0.5, -3), 1.5, Material.mirror(new Vec3(0.9, 0.9, 0.95))));
    scene.add(new Sphere(new Vec3(-3, 0, -4), 1.0, Material.matte(new Vec3(0.85, 0.15, 0.1))));
    scene.add(new Sphere(new Vec3(2.5, -0.2, -2.5), 0.8, Material.glossy(new Vec3(0.1, 0.3, 0.85))));
    scene.add(new Sphere(new Vec3(-1, -0.5, -6), 0.5, Material.matte(new Vec3(0.15, 0.7, 0.2))));
    scene.add(new Sphere(new Vec3(1.2, -0.65, -1.5), 0.35, Material.glossy(new Vec3(0.85, 0.65, 0.1))));
    for (const s of userSpheres) scene.add(s);

    lights = [
        { position: new Vec3(-5, 8, -2), color: new Vec3(1, 0.95, 0.9), intensity: 0.8 },
        { position: new Vec3(5, 6, 2), color: new Vec3(0.8, 0.85, 1.0), intensity: 0.5 },
    ];
}

function getCameraPos() {
    const phiRad = orbitPhi * Math.PI / 180;
    const thetaRad = orbitTheta * Math.PI / 180;
    return new Vec3(
        lookAt.x + orbitRadius * Math.sin(phiRad) * Math.sin(thetaRad),
        lookAt.y + orbitRadius * Math.cos(phiRad),
        lookAt.z + orbitRadius * Math.sin(phiRad) * Math.cos(thetaRad)
    );
}

// === Renderer ===
let settleTimer = null;

// Synchronous full-frame render at given resolution (used while dragging)
function renderSync(w, h, maxDepth) {
    const canvas = document.getElementById('rt-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = w;
    canvas.height = h;

    buildScene();
    const camPos = getCameraPos();
    const cam = new Camera(camPos, lookAt, new Vec3(0, 1, 0), 50, w / h);
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            const u = i / (w - 1), v = 1 - j / (h - 1);
            const c = traceRay(cam.getRay(u, v), scene, lights, bgColor, 0, maxDepth);
            const idx = (j * w + i) * 4;
            data[idx] = c.x * 255; data[idx + 1] = c.y * 255; data[idx + 2] = c.z * 255; data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// Async chunked render for high-res settled view
function renderAsync(w, h, maxDepth) {
    const gen = ++renderGen;
    const canvas = document.getElementById('rt-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = w;
    canvas.height = h;

    buildScene();
    const camPos = getCameraPos();
    const cam = new Camera(camPos, lookAt, new Vec3(0, 1, 0), 50, w / h);
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    let row = 0;
    const rowsPerFrame = 8;

    function renderChunk() {
        if (gen !== renderGen) return;
        const end = Math.min(row + rowsPerFrame, h);
        for (let j = row; j < end; j++) {
            for (let i = 0; i < w; i++) {
                const u = i / (w - 1), v = 1 - j / (h - 1);
                const c = traceRay(cam.getRay(u, v), scene, lights, bgColor, 0, maxDepth);
                const idx = (j * w + i) * 4;
                data[idx] = c.x * 255; data[idx + 1] = c.y * 255; data[idx + 2] = c.z * 255; data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        row = end;
        if (row < h) requestAnimationFrame(renderChunk);
    }
    renderChunk();
}

function startRender() {
    // Immediate: render entire frame synchronously at low res
    ++renderGen; // cancel any in-progress async render
    renderSync(W_FAST, H_FAST, 1);

    // After user stops dragging, refine to full resolution
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => renderAsync(W, H, 3), 250);
}

// === Orbit Controls ===
function initControls() {
    const canvas = document.getElementById('rt-canvas');
    let dragging = false, lastX, lastY;
    const sensitivity = 0.4;

    canvas.addEventListener('mousedown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        orbitTheta += (e.clientX - lastX) * sensitivity;
        orbitPhi = Math.max(15, Math.min(165, orbitPhi - (e.clientY - lastY) * sensitivity));
        lastX = e.clientX; lastY = e.clientY;
        startRender();
    });

    // Touch support
    canvas.addEventListener('touchstart', e => { e.preventDefault(); dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }, { passive: false });
    window.addEventListener('touchend', () => { dragging = false; });
    window.addEventListener('touchmove', e => {
        if (!dragging) return;
        const touch = e.touches[0];
        orbitTheta += (touch.clientX - lastX) * sensitivity;
        orbitPhi = Math.max(15, Math.min(165, orbitPhi - (touch.clientY - lastY) * sensitivity));
        lastX = touch.clientX; lastY = touch.clientY;
        startRender();
    }, { passive: false });

    // Buttons
    document.getElementById('btn-add').addEventListener('click', () => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.5 + Math.random() * 2;
        const x = Math.cos(angle) * dist;
        const z = -3 + Math.sin(angle) * dist;
        const r = 0.3 + Math.random() * 0.4;
        userSpheres.push(new Sphere(new Vec3(x, -1 + r, z), r, Material.glossy(new Vec3(nextColor.x, nextColor.y, nextColor.z))));
        startRender();
    });

    document.getElementById('btn-remove').addEventListener('click', () => {
        if (userSpheres.length > 0) { userSpheres.pop(); startRender(); }
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        userSpheres = [];
        orbitRadius = initOffset.len();
        orbitPhi = Math.acos(initOffset.y / orbitRadius) * 180 / Math.PI;
        orbitTheta = Math.atan2(initOffset.x, initOffset.z) * 180 / Math.PI;
        startRender();
    });

    // Color swatches
    document.querySelectorAll('.swatch').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
            el.classList.add('active');
            const [r, g, b] = el.dataset.color.split(',').map(Number);
            nextColor = new Vec3(r, g, b);
        });
    });
}

// === Init ===
function __rtBoot(){ initControls(); startRender(); }
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', __rtBoot);
else __rtBoot();
