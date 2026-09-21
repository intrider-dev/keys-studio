import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  VRMLoaderPlugin,
  VRMUtils,
  type VRM,
  type VRMHumanBoneName,
} from "@pixiv/three-vrm";
import { dancePose } from "./dance";
import type { MikuEmotion } from "./miku-emotion";

export async function createMikuScene(host: HTMLElement, flat = false) {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync("/characters/miku.vrm");
  const vrm: VRM = gltf.userData.vrm;
  VRMUtils.rotateVRM0(vrm);
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: flat,
  });
  renderer.setPixelRatio(flat ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.setSize(192, 256);
  renderer.setClearColor(0, 0);
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(vrm.scene);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8088a0, 2));
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(-1, 3, 4);
  scene.add(light);
  const bounds = new THREE.Box3().setFromObject(vrm.scene),
    height = bounds.max.y - bounds.min.y;
  const center = bounds.min.y + height * 0.52,
    span = height * 1.15;
  const camera = flat
    ? new THREE.OrthographicCamera(
        -span * 0.375,
        span * 0.375,
        span * 0.5,
        -span * 0.5,
        0.01,
        100,
      )
    : new THREE.PerspectiveCamera(28, 0.75, 0.01, 100);
  camera.position.set(0, center, span / (2 * Math.tan((14 * Math.PI) / 180)));
  camera.lookAt(0, center, 0);
  const meshes: THREE.Mesh[] = [];
  vrm.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.frustumCulled = false;
      if (object.morphTargetInfluences) meshes.push(object);
    }
  });
  const bone = (name: VRMHumanBoneName) =>
    vrm.humanoid.getNormalizedBoneNode(name);
  const hips = bone("hips"),
    base = hips?.position.clone();
  const rotate = (name: VRMHumanBoneName, x: number, y: number, z: number) =>
    bone(name)?.rotation.set(x, y, z);
  let disposed = false;
  let lastBeat = NaN;
  let lastEmotion: MikuEmotion | undefined;
  return {
    canvas: renderer.domElement,
    render(beat: number, emotion: MikuEmotion = "neutral") {
      if (disposed) return;
      if (lastBeat === beat && lastEmotion === emotion) return;
      lastBeat = beat;
      lastEmotion = emotion;
      const p = dancePose(beat),
        phase = beat * Math.PI;
      if (hips && base)
        hips.position.set(
          base.x + p.sway * height * 0.035,
          base.y + p.bounce * height * 0.09,
          base.z,
        );
      rotate("hips", 0, flat ? 0 : p.turn * 0.5, Math.sin(phase) * 0.04);
      rotate("spine", 0, 0, -Math.sin(phase) * 0.055);
      rotate("head", 0, Math.sin(phase * 0.5) * 0.07, p.head * 0.6);
      rotate("leftUpperArm", 0.15, 0, 0.9 + Math.sin(phase) * 0.5);
      rotate("rightUpperArm", 0.15, 0, -0.9 + Math.sin(phase) * 0.5);
      rotate("leftLowerArm", 0, -0.55, 0);
      rotate("rightLowerArm", 0, 0.55, 0);
      rotate("leftUpperLeg", p.leftLeg * 0.5, 0, -0.03);
      rotate("rightUpperLeg", p.rightLeg * 0.5, 0, 0.03);
      rotate("leftLowerLeg", Math.max(0, -p.leftLeg) * 0.7, 0, 0);
      rotate("rightLowerLeg", Math.max(0, -p.rightLeg) * 0.7, 0, 0);
      vrm.update(0);
      const blink = Math.max(
        0,
        1 - Math.abs((((beat % 8) + 8) % 8) - 7.7) / 0.12,
      );
      for (const mesh of meshes) {
        const a = mesh.morphTargetInfluences!;
        a.fill(0);
        a[0] = blink;
        if (emotion === "happy") {
          a[1] = 0.65;
          a[5] = 0.8;
          a[8] = 0.3;
        }
        if (emotion === "wink") {
          a[2] = 1;
          a[5] = 0.7;
        }
        if (emotion === "surprised") {
          a[3] = 0.8;
          a[4] = 0.4;
        }
        if (emotion === "sad") {
          a[6] = 0.65;
          a[7] = 0.7;
        }
      }
      renderer.render(scene, camera);
    },
    dispose() {
      disposed = true;
      VRMUtils.deepDispose(vrm.scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
