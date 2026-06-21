import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useProgress } from "@react-three/drei";
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
      <ArBackground />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />
      <directionalLight position={[-3, 1, -2]} intensity={0.4} color="#6a78ff" />
      <pointLight
        position={[0, 0.4, 1.6]}
        intensity={props.speaking ? 1.2 : 0.3}
        color="#ffffff"
      />

      <IfInSessionMode deny="immersive-ar">
        {/* Desktop / flat view */}
        <Avatar driver={props.driver} url={props.avatarUrl || ""} speaking={props.speaking} />
        <ContactShadows position={[0, -0.95, 0]} opacity={0.35} scale={5} blur={2} far={2.5} />
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

function LoadingOverlay() {
  const { progress, active } = useProgress();
  if (!active) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", pointerEvents: "none",
    }}>
      <div style={{ width: 160, marginBottom: 10 }}>
        <div style={{
          height: 2, background: "rgba(255,255,255,0.12)", borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${progress}%`, background: "rgba(255,255,255,0.55)",
            borderRadius: 2, transition: "width 0.2s ease",
          }} />
        </div>
      </div>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--mono, monospace)", letterSpacing: "0.08em" }}>
        {Math.round(progress)}%
      </span>
    </div>
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
      <LoadingOverlay />
      {/* Hide the default @react-three/xr "Enter XR" button injected into the DOM */}
      <style>{`.xr-button { display: none !important; }`}</style>
    </>
  );
}
