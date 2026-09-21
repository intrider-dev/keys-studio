import * as THREE from "three";
import { previewKeys, keyPressure } from "./features/practice/key-motion.js";

export class PianoScene {
  constructor(host, onPress, onRelease) {
    this.host = host;
    this.onPress = onPress;
    this.onRelease = onRelease;
    this.keyMap = new Map();
    this.flashes = new Map();
    this.noteMeshes = [];
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.setClearColor(0x080d1a, 0);
    host.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080d1a, 0.017);
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.1, 180);
    this.perspectiveCamera = this.camera;
    this.topCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 180);
    this.viewMode = "3d";
    this.fog = this.scene.fog;
    this.scene.add(new THREE.HemisphereLight(0xdcecff, 0x1b2545, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-15, 30, 8);
    this.scene.add(light);
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = {
      right: new THREE.MeshStandardMaterial({
        color: 0x67dbff,
        emissive: 0x137092,
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.3,
      }),
      left: new THREE.MeshStandardMaterial({
        color: 0xbca3ff,
        emissive: 0x5936a1,
        emissiveIntensity: 0.7,
        metalness: 0.3,
        roughness: 0.3,
      }),
      hit: new THREE.MeshStandardMaterial({
        color: 0x7df4b5,
        emissive: 0x197747,
        emissiveIntensity: 1,
      }),
      miss: new THREE.MeshStandardMaterial({
        color: 0xff596f,
        emissive: 0x8b162a,
        emissiveIntensity: 0.8,
      }),
    };
    let white = 0;
    const black = new Set([1, 3, 6, 8, 10]);
    for (let p = 36; p <= 96; p++) {
      const isBlack = black.has(p % 12);
      const x = isBlack ? white - 0.5 : white++;
      this.keyMap.set(p, { x, isBlack });
    }
    this.width = white;
    for (const k of this.keyMap.values()) k.x -= white / 2 - 0.5;
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(white + 1, 0.5, 67),
      new THREE.MeshStandardMaterial({ color: 0x101a2c, roughness: 0.85 }),
    );
    this.deck = deck;
    deck.material.transparent = true;
    deck.position.set(0, -0.65, -28);
    this.scene.add(deck);
    const linePoints = [];
    for (let x = -white / 2; x <= white / 2; x++)
      linePoints.push(x, 0, 0, x, 0, -61);
    const laneGeo = new THREE.BufferGeometry();
    laneGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePoints, 3),
    );
    this.scene.add(
      new THREE.LineSegments(
        laneGeo,
        new THREE.LineBasicMaterial({
          color: 0x2a3c52,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );
    this.beatLines = [];
    for (let i = 0; i < 40; i++) {
      const l = new THREE.Mesh(
        this.geometry,
        new THREE.MeshBasicMaterial({
          color: 0x354967,
          transparent: true,
          opacity: 0.55,
        }),
      );
      l.scale.set(white, 0.018, 0.035);
      this.scene.add(l);
      this.beatLines.push(l);
    }
    for (const x of [-white / 2 - 0.1, white / 2 + 0.1]) {
      const rail = new THREE.Mesh(
        this.geometry,
        new THREE.MeshBasicMaterial({
          color: 0x526ff4,
          transparent: true,
          opacity: 0.6,
        }),
      );
      rail.scale.set(0.055, 0.08, 61);
      rail.position.set(x, 0.04, -30);
      this.scene.add(rail);
    }
    const target = new THREE.Mesh(
      this.geometry,
      new THREE.MeshBasicMaterial({ color: 0x9ceaff }),
    );
    target.scale.set(white, 0.075, 0.075);
    target.position.set(0, 0.6, -0.12);
    this.scene.add(target);
    this.keys = [];
    for (const [pitch, key] of this.keyMap) {
      const mat = new THREE.MeshStandardMaterial({
        color: key.isBlack ? 0x172237 : 0xd8e3ef,
        roughness: 0.35,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.scale.set(
        key.isBlack ? 0.56 : 0.94,
        key.isBlack ? 0.7 : 0.38,
        key.isBlack ? 2.8 : 4.6,
      );
      mesh.position.set(
        key.x,
        key.isBlack ? 0.62 : 0.08,
        key.isBlack ? 1.51 : 2.35,
      );
      mesh.userData.pitch = pitch;
      this.scene.add(mesh);
      this.keys.push(mesh);
      key.mesh = mesh;
      if (key.isBlack) {
        const outline = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-0.5, 0.505, -0.5),
            new THREE.Vector3(0.5, 0.505, -0.5),
            new THREE.Vector3(0.5, 0.505, 0.5),
            new THREE.Vector3(-0.5, 0.505, 0.5),
          ]),
          new THREE.LineBasicMaterial({ color: 0x08111d }),
        );
        outline.visible = false;
        mesh.add(outline);
        key.outline = outline;
      }
      key.pressure = 0;
      const recess = new THREE.Mesh(
        this.geometry,
        new THREE.MeshStandardMaterial({
          color: key.isBlack ? 0x080e1a : 0x526078,
          roughness: 0.9,
        }),
      );
      recess.scale.set(
        key.isBlack ? 0.57 : 0.95,
        0.025,
        key.isBlack ? 2.82 : 4.62,
      );
      recess.position.set(
        key.x,
        key.isBlack ? 0.285 : -0.135,
        key.isBlack ? 1.51 : 2.35,
      );
      this.scene.add(recess);
      if (pitch % 12 === 0) {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#263b55";
        ctx.font = "500 30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("C" + (Math.floor(pitch / 12) - 1), 64, 44);
        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: texture, depthTest: false }),
        );
        sprite.position.set(key.x, 0.45, 4);
        sprite.scale.set(0.9, 0.45, 1);
        this.scene.add(sprite);
        key.label = sprite;
      }
    }
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerPitch = null;
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      this.ray.setFromCamera(this.pointer, this.camera);
      const hit = this.ray.intersectObjects(this.keys, false)[0];
      if (hit) {
        this.pointerPitch = hit.object.userData.pitch;
        this.onPress(this.pointerPitch);
        this.renderer.domElement.setPointerCapture(e.pointerId);
      }
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      this.renderer.domElement.addEventListener(type, () => {
        if (this.pointerPitch !== null) {
          this.onRelease(this.pointerPitch);
          this.pointerPitch = null;
        }
      });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }
  setAppearance(visual) {
    if (this.appearance === visual) return;
    this.appearance = visual;
    this.materials.right.color.set(visual.right);
    this.materials.right.emissive.set(visual.right).multiplyScalar(0.3);
    this.materials.left.color.set(visual.left);
    this.materials.left.emissive.set(visual.left).multiplyScalar(0.3);
    this.deck.material.opacity = 1 - visual.opacity;
  }
  setViewMode(mode) {
    this.viewMode = mode === "top" ? "top" : "3d";
    this.camera =
      this.viewMode === "top" ? this.topCamera : this.perspectiveCamera;
    this.scene.fog = this.viewMode === "top" ? null : this.fog;
    this.resize();
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    if (this.viewMode === "top") {
      const width = this.width / 0.93;
      const height = (width * h) / w;
      const center = 5.8 - height / 2;
      Object.assign(this.camera, {
        left: -width / 2,
        right: width / 2,
        top: height / 2,
        bottom: -height / 2,
      });
      this.camera.position.set(0, 60, center);
      this.camera.up.set(0, 0, -1);
      this.camera.lookAt(0, 0, center);
      this.camera.updateMatrixWorld();
      this.camera.updateProjectionMatrix();
      return;
    }
    this.camera.aspect = w / h;
    this.camera.zoom = 1;
    const factor = Math.max(1, 1.5 / this.camera.aspect);
    this.camera.position.set(0, 31 * factor, 24 * factor);
    this.camera.lookAt(0, 0, -15);
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    // Fit the full keyboard to the viewport, with room around its outer keys.
    const edge = new THREE.Vector3(this.width / 2, 0.27, 4.65).project(
      this.camera,
    );
    this.camera.zoom = 0.93 / Math.abs(edge.x);
    this.camera.updateProjectionMatrix();
    // Keep its front edge near the bottom while preserving the perspective lanes.
    const bottom = new THREE.Vector3(0, -0.27, 4.65).project(this.camera);
    this.camera.projectionMatrix.elements[9] += bottom.y + 0.89;
    this.camera.projectionMatrixInverse
      .copy(this.camera.projectionMatrix)
      .invert();
  }
  flash(pitch, type) {
    this.flashes.set(pitch, { until: performance.now() + 700, type });
  }
  dispose() {
    this.resizeObserver.disconnect();
    const geometries = new Set(),
      materials = new Set(Object.values(this.materials));
    this.scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) {
      material.map?.dispose();
      material.dispose();
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.noteMeshes.length = 0;
    this.flashes.clear();
    this.keyMap.clear();
  }
  render(notes, beat, held, options = {}) {
    const now = performance.now();
    const seconds =
      this.lastKeyFrame === undefined
        ? 1 / 60
        : Math.max(0, (now - this.lastKeyFrame) / 1000);
    this.lastKeyFrame = now;
    const demoKeys = options.preview
      ? previewKeys(notes, beat, options.start, options.end)
      : new Map();
    for (const [pitch, key] of this.keyMap) {
      const flash = this.flashes.get(pitch);
      const active = held.has(pitch) || demoKeys.has(pitch);
      if (key.outline) key.outline.visible = this.viewMode === "top";
      let color = key.isBlack ? 0x172237 : 0xd8e3ef;
      if (flash && flash.until > now)
        color = flash.type === "bad" ? 0xff6478 : 0x7df4b5;
      else if (active)
        color =
          demoKeys.get(pitch) === "left"
            ? (this.appearance?.left ?? "#bca3ff")
            : (this.appearance?.right ?? "#67dbff");
      key.mesh.material.color.set(color);
      key.pressure = keyPressure(key.pressure, active, seconds);
      const pressure = key.pressure;
      key.mesh.position.y = (key.isBlack ? 0.62 : 0.08) - pressure * 0.12;
      key.mesh.rotation.x = pressure * 0.025;
      // A tiny retreat of the front edge exposes the dark key bed in the top view.
      const depth = key.isBlack ? 2.8 : 4.6;
      const retreat = this.viewMode === "top" ? pressure * depth * 0.025 : 0;
      key.mesh.scale.z = depth - retreat;
      key.mesh.position.z = (key.isBlack ? 1.51 : 2.35) - retreat / 2;
      if (key.label) key.label.position.z = 4 - retreat * 0.85;
    }
    const speed = options.speed || 3.5;
    for (let i = 0; i < this.beatLines.length; i++) {
      const b = Math.ceil(beat) + i;
      const line = this.beatLines[i];
      line.position.set(0, 0.015, -(b - beat) * speed);
      line.material.opacity = b % 4 === 0 ? 0.65 : 0.25;
      line.visible = line.position.z > -61 && line.position.z <= -0.14;
    }
    let count = 0;
    for (const n of notes) {
      if (n.start + n.duration <= beat || n.start > beat + 60 / speed) continue;
      const key = this.keyMap.get(n.pitch);
      if (!key) continue;
      const duration = Math.max(0.15, n.duration);
      const rawFront = -(n.start - beat) * speed - 0.06;
      const front = Math.min(-0.16, rawFront);
      const back = Math.max(
        -61,
        rawFront - Math.max(0.16, duration * speed - 0.1),
      );
      if (front - back < 0.015) continue;
      let mesh = this.noteMeshes[count];
      if (!mesh) {
        mesh = new THREE.Mesh(this.geometry, this.materials.right);
        this.noteMeshes.push(mesh);
        this.scene.add(mesh);
      }
      mesh.material =
        this.materials[
          n.status === "miss" ? "miss" : n.status === "hit" ? "hit" : n.hand
        ];
      mesh.position.set(key.x, key.isBlack ? 0.55 : 0.33, (front + back) / 2);
      // Adjacent white/black centers are only half a key apart. In the top
      // projection their blocks must leave a visible gap instead of overlapping.
      const noteWidth = this.viewMode === "top"
        ? (key.isBlack ? 0.36 : 0.44)
        : (key.isBlack ? 0.52 : 0.78);
      mesh.scale.set(noteWidth, 0.26, front - back);
      mesh.visible = true;
      count++;
    }
    for (let i = count; i < this.noteMeshes.length; i++)
      this.noteMeshes[i].visible = false;
    this.renderer.render(this.scene, this.camera);
  }
}
