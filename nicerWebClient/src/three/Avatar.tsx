import { Suspense, useEffect, useMemo, useRef, Component, ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { LipsyncDriver } from "./lipsync";
import { BLINK_TARGETS } from "./visemes";

interface AvatarProps { driver: LipsyncDriver; url?: string; speaking?: boolean; }

function collectMorphTargets(root: THREE.Object3D) {
  const map: { mesh: THREE.Mesh; index: number; name: string }[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.morphTargetDictionary && m.morphTargetInfluences) {
      Object.entries(m.morphTargetDictionary).forEach(([name, index]) => {
        map.push({ mesh: m, index, name });
      });
    }
  });
  return map;
}

// ---- Real GLB avatar (Rocketbox / Ready Player Me) -------------------------
function GltfAvatar({ driver, url, speaking }: { driver: LipsyncDriver; url: string; speaking?: boolean }) {
  const { scene, animations } = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const blink = useRef({ next: 1.5, t: 0, closing: 0 });
  const { actions, mixer } = useAnimations(animations, group);

  // GLB PBR materials look flat/dark without any env response — nudge them for portrait viewing.
  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const raw of materials) {
        const mat = raw as THREE.MeshStandardMaterial;
        if (!mat?.isMeshStandardMaterial) continue;
        mat.envMapIntensity = 0.35;
        mat.roughness = Math.min(mat.roughness ?? 0.55, 0.72);
        mat.metalness = Math.min(mat.metalness ?? 0, 0.08);
        mat.needsUpdate = true;
      }
    });
  }, [scene]);

  // Start idle once on mount, never stop it — just crossfade to wave while speaking.
  useEffect(() => {
    const idle = actions["BreathingIdle"] ?? Object.values(actions)[0];
    if (!idle) return;
    idle.setLoop(THREE.LoopRepeat, Infinity).play();
  }, [actions]);

  useEffect(() => {
    const idle = actions["BreathingIdle"] ?? Object.values(actions)[0];
    const wave = actions["Waving"];
    if (!idle) return;
    if (wave && speaking) {
      wave.setLoop(THREE.LoopRepeat, Infinity).reset().play();
      wave.crossFadeFrom(idle, 0.4, true);
    } else {
      if (wave?.isRunning()) {
        idle.reset().play();
        idle.crossFadeFrom(wave, 0.4, true);
      }
    }
  }, [actions, speaking]);

  // Cache viseme/blink morph targets on the rendered scene graph.
  const targets = useMemo(() => collectMorphTargets(scene), [scene]);

  useFrame((_, dt) => {
    driver.update(dt);
    // Apply visemes on top of the body animation.
    for (const t of targets) {
      if (t.name.startsWith("viseme_")) {
        t.mesh.morphTargetInfluences![t.index] = driver.visemes[t.name] ?? 0;
      }
    }
    // Blink.
    const b = blink.current;
    b.t += dt;
    if (b.t > b.next) { b.closing = 1; b.t = 0; b.next = 1.6 + Math.random() * 3.5; }
    b.closing = Math.max(0, b.closing - dt * 9);
    const blinkVal = Math.sin(Math.min(1, b.closing) * Math.PI);
    for (const t of targets) if (BLINK_TARGETS.includes(t.name)) t.mesh.morphTargetInfluences![t.index] = blinkVal;
  });

  return <group ref={group} position={[0, -1.5, 0]}><primitive object={scene} /></group>;
}

// Nothing to render while loading — the HTML overlay in TwinScene handles it.
function Nothing() { return null; }

class GlbBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function Avatar({ driver, url, speaking }: AvatarProps) {
  if (!url) return <Nothing />;
  return (
    <GlbBoundary fallback={<Nothing />}>
      <Suspense fallback={<Nothing />}>
        <GltfAvatar driver={driver} url={url} speaking={speaking} />
      </Suspense>
    </GlbBoundary>
  );
}
