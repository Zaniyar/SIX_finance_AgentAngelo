import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls } from "@react-three/drei";
import Avatar from "./Avatar";
import { LipsyncDriver } from "./lipsync";

export default function TwinScene({ driver, speaking, avatarUrl }: {
  driver: LipsyncDriver;
  speaking: boolean;
  avatarUrl?: string;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.02, 3.15], fov: 30 }}
      dpr={[1, 2]}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />
      <directionalLight position={[-3, 1, -2]} intensity={0.4} color="#6a78ff" />
      <pointLight position={[0, 0.4, 1.6]} intensity={speaking ? 1.2 : 0.3} color="#ffffff" />

      <Avatar driver={driver} url={avatarUrl || ""} speaking={speaking} />

      <ContactShadows position={[0, -0.95, 0]} opacity={0.45} scale={6} blur={2.6} far={3} />
      <Environment preset="city" />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.9}
        minAzimuthAngle={-0.5}
        maxAzimuthAngle={0.5}
      />
    </Canvas>
  );
}
