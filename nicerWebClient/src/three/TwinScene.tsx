import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls, useProgress } from "@react-three/drei";
import { XR, createXRStore, IfInSessionMode, useXR } from "@react-three/xr";
import * as THREE from "three";
import Avatar from "./Avatar";
import { LipsyncDriver } from "./lipsync";

// One store per app — controls the XR session lifecycle
export const xrStore = createXRStore();

interface TwinSceneProps {
  driver: LipsyncDriver;
  speaking: boolean;
  avatarUrl?: string;
}

// In AR: make background transparent so camera passthrough works
function ArBackground() {
  const { gl, scene } = useThree();
  const inAr = useXR((s) => s.session !== null && s.mode === "immersive-ar");
  useFrame(() => {
    if (inAr) {
      scene.background = null;
      gl.setClearColor(0x000000, 0);
    }
  });
  return null;
}

// Avatar anchored in front of user in AR (1.4m ahead, floor level)
function ArAvatarGroup({ driver, speaking, avatarUrl }: TwinSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  return (
    <group ref={groupRef} position={[0, -1.0, -1.4]}>
      <Avatar driver={driver} url={avatarUrl || ""} speaking={speaking} />
      {/* Subtle ground ring so user knows where avatar stands */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0.28, 0.34, 48]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SceneContent(props: TwinSceneProps) {
  const inAr = useXR((s) => s.session !== null && s.mode === "immersive-ar");

  return (
    <>
      <LoadingBar />
      <ArBackground />

      {/* Key light — warm, slightly from above-left like a studio softbox */}
      <directionalLight position={[-1.5, 4, 3]} intensity={1.6} color="#fff5e8" castShadow />
      {/* Fill light — cool blue from the right, softens shadows */}
      <directionalLight position={[3, 2, -1]} intensity={0.55} color="#c8d8ff" />
      {/* Back rim light — separates avatar from dark background */}
      <directionalLight position={[0, 3, -4]} intensity={0.9} color="#a0b8ff" />
      {/* Ambient — very subtle so shadows stay readable */}
      <ambientLight intensity={0.18} color="#e8eeff" />
      {/* Face fill — close, soft, brightens up on speech */}
      <pointLight
        position={[0, 0.6, 1.8]}
        intensity={props.speaking ? 1.4 : 0.5}
        color="#fff8f0"
        distance={4}
        decay={2}
      />
      {/* Subtle upward bounce off imaginary floor */}
      <pointLight position={[0, -1.2, 1.0]} intensity={0.15} color="#dde8ff" distance={3} decay={2} />
      {/* IBL environment — city preset gives sharp reflections on skin + fabric */}
      <Environment preset="city" environmentIntensity={0.4} backgroundBlurriness={1} />

      <IfInSessionMode deny="immersive-ar">
        {/* Desktop / flat view */}
        <Avatar driver={props.driver} url={props.avatarUrl || ""} speaking={props.speaking} />
        <ContactShadows position={[0, -0.95, 0]} opacity={0.55} scale={4} blur={2.5} far={2} color="#0a0a18" />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.9}
          minAzimuthAngle={-0.5}
          maxAzimuthAngle={0.5}
        />
      </IfInSessionMode>

      <IfInSessionMode allow="immersive-ar">
        {/* AR view — avatar placed in real world */}
        <ArAvatarGroup {...props} />
      </IfInSessionMode>
    </>
  );
}

// Runs inside Canvas so useProgress has Suspense context
function LoadingBar() {
  const { progress, active } = useProgress();
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (active) { setVisible(true); return; }
    // Fade out 600ms after loading completes
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible) return null;
  return (
    <Html center style={{ pointerEvents: "none", width: 180 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ width: 160, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "rgba(255,255,255,0.5)",
            borderRadius: 2,
            transition: "width 0.15s ease",
          }} />
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: "0.1em" }}>
          {Math.round(progress)}%
        </span>
      </div>
    </Html>
  );
}

function CanvasStage(props: TwinSceneProps & { canvasKey: number }) {
  return (
    <Canvas
      key={props.canvasKey}
      camera={{ position: [0, 0.02, 3.15], fov: 30 }}
      dpr={[1, 1.5]}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        const onLost = (event: Event) => {
          event.preventDefault();
        };
        const onRestored = () => {
          // Remount the canvas so Three.js re-initialises after GPU context recovery.
          window.dispatchEvent(new CustomEvent("twin-scene-context-restored"));
        };
        canvas.addEventListener("webglcontextlost", onLost);
        canvas.addEventListener("webglcontextrestored", onRestored);
      }}
    >
      <XR store={xrStore}>
        <SceneContent driver={props.driver} speaking={props.speaking} avatarUrl={props.avatarUrl} />
      </XR>
    </Canvas>
  );
}

export default function TwinScene(props: TwinSceneProps) {
  const [mounted, setMounted] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  // WebGL must not run during SSR — defer Canvas until after hydration.
  useEffect(() => {
    setMounted(true);
    const onRestore = () => setCanvasKey((k) => k + 1);
    window.addEventListener("twin-scene-context-restored", onRestore);
    return () => window.removeEventListener("twin-scene-context-restored", onRestore);
  }, []);

  if (!mounted) {
    return <div style={{ width: "100%", height: "100%" }} aria-hidden />;
  }

  return (
    <>
      <CanvasStage {...props} canvasKey={canvasKey} />
      {/* Hide the default @react-three/xr "Enter XR" button injected into the DOM */}
      <style>{`.xr-button { display: none !important; }`}</style>
    </>
  );
}
