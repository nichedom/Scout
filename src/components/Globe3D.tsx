import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, useTexture, OrbitControls } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { LocationData } from '../types';

const EARTH_TEXTURE = '/textures/earth.jpg';
const CLOUDS_TEXTURE = '/textures/clouds.png';

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

interface EarthProps {
  targetLat?: number;
  targetLng?: number;
}

function Earth({ targetLat, targetLng }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);

  const [colorMap, cloudsMap] = useTexture([EARTH_TEXTURE, CLOUDS_TEXTURE]);

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.05;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.065;
  });

  return (
    <>
      {/* Earth sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial map={colorMap} shininess={8} specular={new THREE.Color(0x224466)} />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.04, 64, 64]} />
        <meshPhongMaterial
          map={cloudsMap}
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Atmosphere glow (inner) */}
      <mesh>
        <sphereGeometry args={[2.18, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(0x1155ee)}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Atmosphere glow (outer) */}
      <mesh>
        <sphereGeometry args={[2.35, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(0x0033aa)}
          transparent
          opacity={0.035}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Location pin */}
      {targetLat !== undefined && targetLng !== undefined && (
        <LocationPin lat={targetLat} lng={targetLng} />
      )}
    </>
  );
}

function LocationPin({ lat, lng }: { lat: number; lng: number }) {
  const corePos = latLngToVec3(lat, lng, 2.06);
  const glowRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (glowRef.current) {
      const pulse = Math.sin(t * 2.5) * 0.5 + 0.5;
      glowRef.current.scale.setScalar(1 + pulse * 0.6);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + pulse * 0.25;
    }

    if (ring1Ref.current) {
      const phase1 = (t % 2) / 2;
      ring1Ref.current.scale.setScalar(1 + phase1 * 3);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - phase1) * 0.6;
    }

    if (ring2Ref.current) {
      const phase2 = ((t + 1) % 2) / 2;
      ring2Ref.current.scale.setScalar(1 + phase2 * 3);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - phase2) * 0.6;
    }
  });

  // Orient rings to face outward from sphere center
  const normal = corePos.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal
  );

  return (
    <group>
      {/* Core amber dot */}
      <mesh position={corePos}>
        <sphereGeometry args={[0.038, 16, 16]} />
        <meshBasicMaterial color="#f5a623" />
      </mesh>

      {/* Glow halo */}
      <mesh ref={glowRef} position={corePos}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshBasicMaterial
          color="#f5a623"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Pulse ring 1 */}
      <mesh ref={ring1Ref} position={corePos} quaternion={quaternion}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial
          color="#f5a623"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Pulse ring 2 (offset by 1s) */}
      <mesh ref={ring2Ref} position={corePos} quaternion={quaternion}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial
          color="#00c6ff"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function FallbackSphere() {
  return (
    <mesh>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial color="#0e2044" wireframe />
    </mesh>
  );
}

interface Props {
  selectedLocation: LocationData | null;
}

export default function Globe3D({ selectedLocation }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'transparent' }}
    >
      <color attach="background" args={['#04080f']} />

      {/* Lighting */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-5, -2, -3]} intensity={0.15} color="#4466ff" />

      {/* Stars */}
      <Stars radius={120} depth={80} count={7000} factor={4.5} saturation={0} fade speed={0.6} />

      {/* Earth */}
      <Suspense fallback={<FallbackSphere />}>
        <Earth
          targetLat={selectedLocation?.lat}
          targetLng={selectedLocation?.lng}
        />
      </Suspense>

      {/* Controls — drag to rotate, no zoom/pan */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.4}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={(4 * Math.PI) / 5}
      />
    </Canvas>
  );
}
