import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useProgress } from "@react-three/drei";
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
  const speaking = props.speaking;

  return (
    <>
      <LoadingBar />
      <ArBackground />

      {/* Soft sky/ground fill — keeps PBR skin readable without HDR environment maps */}
      <hemisphereLight color="#f4f6ff" groundColor="#2a3148" intensity={0.85} />
      <ambientLight intensity={0.42} color="#eef1ff" />

      {/* Key — warm front-left, main portrait light */}
      <directionalLight position={[-1.8, 3.8, 2.8]} intensity={1.85} color="#fff4e8" />
      {/* Fill — cool right side, opens shadows on the face */}
      <directionalLight position={[3.2, 1.8, 1.2]} intensity={0.95} color="#d4e2ff" />
      {/* Rim — separates shoulders/hair from the dark stage background */}
      <directionalLight position={[0.4, 2.8, -3.6]} intensity={1.15} color="#b8c8ff" />
      {/* Face key — always on, lifts eyes/mouth; brighter while speaking */}
      <pointLight
        position={[0, 0.55, 1.85]}
        intensity={speaking ? 2.2 : 1.35}
        color="#fffaf5"
        distance={5.5}
        decay={2}
      />
      {/* Gentle bounce from below — reduces muddy chin/neck shadows */}
      <pointLight position={[0, -0.8, 1.2]} intensity={0.35} color="#c8d4ff" distance={4} decay={2} />

      <IfInSessionMode deny="immersive-ar">
        {/* Desktop / flat view */}
        <Avatar driver={props.driver} url={props.avatarUrl || ""} speaking={speaking} />
        <ContactShadows position={[0, -0.95, 0]} opacity={0.42} scale={4.5} blur={2.2} far={2.2} color="#050508" />
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
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.22;
        gl.outputColorSpace = THREE.SRGBColorSpace;

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
