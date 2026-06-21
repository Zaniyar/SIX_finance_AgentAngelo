import { Suspense, useEffect, useMemo, useRef, Component, ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { LipsyncDriver } from "./lipsync";
import { BLINK_TARGETS } from "./visemes";

interface AvatarProps { driver: LipsyncDriver; url?: string; speaking?: boolean; }

// Sum of the open-mouth viseme weights → a single 0..1 "mouth openness".
function openness(driver: LipsyncDriver): number {
  const v = driver.visemes;
  let o = 0;
  for (const k of Object.keys(v)) if (k !== "viseme_sil") o += v[k] ?? 0;
  return Math.min(1, o);
}

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

  // Switch between BreathingIdle (default) and Waving (while speaking).
  useEffect(() => {
    const idle = actions["BreathingIdle"] ?? Object.values(actions)[0];
    const wave = actions["Waving"];
    if (!idle) return;
    if (wave && speaking) {
      idle.fadeOut(0.3);
      wave.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.3).play();
    } else {
      wave?.fadeOut(0.3);
      idle.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.3).play();
    }
    return () => { mixer.stopAllAction(); };
  }, [actions, mixer, speaking]);

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

// ---- Procedural placeholder (no GLB present) -------------------------------
function PlaceholderAvatar({ driver }: { driver: LipsyncDriver }) {
  const head = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const lids = useRef<THREE.Mesh[]>([]);
  const blink = useRef({ next: 1.5, t: 0, closing: 0 });

  useFrame((_, dt) => {
    driver.update(dt);
    const o = openness(driver);
    if (mouth.current) {
      mouth.current.scale.y = 0.06 + o * 0.9;
      mouth.current.scale.x = 0.55 - o * 0.12;
    }
    const b = blink.current; b.t += dt;
    if (b.t > b.next) { b.closing = 1; b.t = 0; b.next = 1.6 + Math.random() * 3; }
    b.closing = Math.max(0, b.closing - dt * 9);
    const open = 1 - Math.sin(Math.min(1, b.closing) * Math.PI);
    lids.current.forEach((l) => l && (l.scale.y = 0.1 + open * 0.9));
    if (head.current) {
      const t = performance.now() / 1000;
      head.current.rotation.y = Math.sin(t * 0.4) * 0.08;
      head.current.rotation.x = Math.sin(t * 0.7) * 0.03;
    }
  });

  return (
    <group position={[0, 0.05, 0]}>
      <mesh position={[0, -1.25, 0]}>
        <capsuleGeometry args={[0.62, 0.7, 12, 24]} />
        <meshStandardMaterial color="#15171c" roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.62, 0]}>
        <cylinderGeometry args={[0.17, 0.22, 0.4, 24]} />
        <meshStandardMaterial color="#cfccc4" roughness={0.6} />
      </mesh>

      <group ref={head} position={[0, 0.05, 0]}>
        <mesh>
          <capsuleGeometry args={[0.52, 0.34, 16, 32]} />
          <meshStandardMaterial color="#d9d6cf" roughness={0.55} metalness={0.05} />
        </mesh>
        {[-0.2, 0.2].map((x, i) => (
          <group key={i} position={[x, 0.12, 0.46]}>
            <mesh><sphereGeometry args={[0.085, 24, 24]} /><meshStandardMaterial color="#ffffff" /></mesh>
            <mesh position={[0, 0, 0.06]}><sphereGeometry args={[0.038, 16, 16]} /><meshStandardMaterial color="#16181d" /></mesh>
            <mesh ref={(m) => m && (lids.current[i] = m)} position={[0, 0.0, 0.075]}>
              <boxGeometry args={[0.2, 0.1, 0.02]} /><meshStandardMaterial color="#d9d6cf" />
            </mesh>
          </group>
        ))}
        <mesh ref={mouth} position={[0, -0.22, 0.47]}>
          <boxGeometry args={[0.4, 0.1, 0.06]} /><meshStandardMaterial color="#5b2b2b" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

class GlbBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function Avatar({ driver, url, speaking }: AvatarProps) {
  if (!url) {
    return <PlaceholderAvatar driver={driver} />;
  }
  return (
    <GlbBoundary fallback={<PlaceholderAvatar driver={driver} />}>
      <Suspense fallback={<PlaceholderAvatar driver={driver} />}>
        <GltfAvatar driver={driver} url={url} speaking={speaking} />
      </Suspense>
    </GlbBoundary>
  );
}
