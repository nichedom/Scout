import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, useTexture, OrbitControls } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect } from 'react';
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
  isSpinning: boolean;
}

function Earth({ targetLat, targetLng, isSpinning }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);
  const spinRef = useRef(0);

  const [colorMap, cloudsMap] = useTexture([EARTH_TEXTURE, CLOUDS_TEXTURE]);

  useFrame((_, delta) => {
    if (isSpinning) {
      spinRef.current += delta * 0.05;
      if (earthRef.current) earthRef.current.rotation.y = spinRef.current;
      if (cloudsRef.current) cloudsRef.current.rotation.y = spinRef.current * 1.3;
    }
  });

  return (
    <>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial map={colorMap} shininess={8} specular={new THREE.Color(0x224466)} />
      </mesh>

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

      {targetLat !== undefined && targetLng !== undefined && (
        <LocationPin lat={targetLat} lng={targetLng} />
      )}
    </>
  );
}

function LocationPin({ lat, lng }: { lat: number; lng: number }) {
  const corePos = latLngToVec3(lat, lng, 2.06);

  const normal = corePos.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal
  );

  return (
    <group>
      <mesh position={corePos}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={corePos} quaternion={quaternion}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function CameraController({ targetLat, targetLng, active }: { targetLat?: number; targetLng?: number; active: boolean }) {
  const { camera } = useThree();
  const targetPosRef = useRef<THREE.Vector3 | null>(null);
  const startRef = useRef<THREE.Vector3 | null>(null);
  const progressRef = useRef(1);

  useEffect(() => {
    if (active && targetLat !== undefined && targetLng !== undefined) {
      const targetOnSphere = latLngToVec3(targetLat, targetLng, 6.5);
      targetPosRef.current = targetOnSphere;
      startRef.current = camera.position.clone();
      progressRef.current = 0;
    }
  }, [active, targetLat, targetLng]);

  useFrame((_, delta) => {
    if (progressRef.current < 1 && targetPosRef.current && startRef.current) {
      progressRef.current = Math.min(1, progressRef.current + delta * 1.2);
      const t = 1 - Math.pow(1 - progressRef.current, 3);
      const start = startRef.current.clone().normalize();
      const end = targetPosRef.current.clone().normalize();
      const interpolated = new THREE.Vector3().lerpVectors(start, end, t).normalize().multiplyScalar(6.5);
      camera.position.copy(interpolated);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

function FallbackSphere() {
  return (
    <mesh>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial color="#1a1a1a" wireframe />
    </mesh>
  );
}

interface Props {
  selectedLocation: LocationData | null;
}

export default function Globe3D({ selectedLocation }: Props) {
  const hasLocation = selectedLocation !== null;

  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'transparent' }}
    >
      <color attach="background" args={['#0a0a0a']} />

      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-5, -2, -3]} intensity={0.1} color="#4466ff" />

      <Stars radius={120} depth={80} count={4000} factor={4} saturation={0} fade speed={0.3} />

      <Suspense fallback={<FallbackSphere />}>
        <Earth
          targetLat={selectedLocation?.lat}
          targetLng={selectedLocation?.lng}
          isSpinning={!hasLocation}
        />
      </Suspense>

      {hasLocation && (
        <CameraController
          targetLat={selectedLocation!.lat}
          targetLng={selectedLocation!.lng}
          active={hasLocation}
        />
      )}

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