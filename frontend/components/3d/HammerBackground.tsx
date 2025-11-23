'use client';
import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Custom sine curve for the claw
class CustomSinCurve extends THREE.Curve<THREE.Vector3> {
  scale: number;
  
  constructor(scale = 1) {
    super();
    this.scale = scale;
  }
  
  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    const tx = t * 2 - 1;
    const ty = Math.sin(t * Math.PI * 0.5);
    const tz = 0;
    return optionalTarget.set(tx, ty, tz).multiplyScalar(this.scale);
  }
}

// Hammer component
const Hammer = () => {
  const groupRef = useRef<THREE.Group>(null);

  // Create chrome material - brighter version with blue tint
  const chromeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd0e0f0,
    metalness: 1.0,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 1.0,
    emissive: 0x1a2535,
    emissiveIntensity: 0.3,
  });

  // Create striped texture for grip
  const gripTexture = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#a00000';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(0, i * 40 + 10, 256, 20);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    return texture;
  }, []);

  // Claw geometry
  const clawCurveGeo = React.useMemo(() => {
    const clawPath = new CustomSinCurve(1.5);
    return new THREE.TubeGeometry(clawPath, 20, 0.3, 8, false);
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.1 + (Math.PI / 4);
    }
  });

  return (
    <group ref={groupRef} rotation={[0, 0, Math.PI / 4]} position={[-1.5, 0, 0]}>
      {/* Handle */}
      <mesh position={[0, -1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.45, 7, 32]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Grip */}
      <mesh position={[0, -3, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.5, 4, 32]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Handle End Cap */}
      <mesh position={[0, -5.1, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 32]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Head Center */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 1.8, 1.0]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Striker Neck */}
      <mesh position={[0.95, 2.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.6, 0.7, 0.5, 32]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Striker Face */}
      <mesh position={[1.4, 2.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.4, 32]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Claw Base */}
      <mesh position={[-0.9, 2.2, 0]} castShadow>
        <boxGeometry args={[1.0, 1.8, 0.8]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Claw Curve */}
      <mesh
        position={[-2.2, 1.6, 0]}
        rotation={[0, Math.PI / 2, 0.5]}
        scale={[1, 0.4, 1]}
        castShadow
        receiveShadow
      >
        <primitive object={clawCurveGeo} attach="geometry" />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Claw Tip 1 */}
      <mesh position={[-3.2, 2.6, 0.15]} rotation={[0, 0.2, 0.8]} castShadow>
        <boxGeometry args={[0.6, 0.2, 0.4]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Claw Tip 2 */}
      <mesh position={[-3.2, 2.6, -0.15]} rotation={[0, -0.2, 0.8]} castShadow>
        <boxGeometry args={[0.6, 0.2, 0.4]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>
    </group>
  );
};

// Wrench component
const Wrench = () => {
  const groupRef = useRef<THREE.Group>(null);

  const chromeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd0e0f0,
    metalness: 1.0,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 1.0,
    emissive: 0x1a2535,
    emissiveIntensity: 0.3,
  });

  // Wrench head shape
  const wrenchHeadGeo = React.useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0.7, 0.8);
    shape.lineTo(0.4, 0.6);
    shape.lineTo(0.3, 0.0);
    shape.lineTo(0.4, -0.6);
    shape.lineTo(0.7, -0.8);
    shape.lineTo(1.2, -1.2);
    shape.bezierCurveTo(-1.5, -1.5, -1.5, 1.5, 1.2, 1.2);
    shape.lineTo(0.7, 0.8);

    const extrudeSettings = {
      steps: 2,
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 3,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    return geometry;
  }, []);

  // Star shape for ring end
  const starGeo = React.useMemo(() => {
    const starShape = new THREE.Shape();
    const outerRadius = 0.6;
    const innerRadius = 0.4;
    const numPoints = 12;
    
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (i / (numPoints * 2)) * Math.PI * 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();
    
    return new THREE.ExtrudeGeometry(starShape, { depth: 0.25, bevelEnabled: false });
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = Math.cos(t * 0.3) * 0.1;
    }
  });

  return (
    <group ref={groupRef} rotation={[0, 0, -Math.PI / 4]} position={[1.5, 0, 0]}>
      {/* Handle */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.6, 7, 0.25]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Handle Panel */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 5, 0.27]} />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 4, 0]} rotation={[0, 0, Math.PI / 10]} castShadow receiveShadow>
        <primitive object={wrenchHeadGeo} attach="geometry" />
        <primitive object={chromeMaterial} attach="material" />
      </mesh>

      {/* Ring End Group */}
      <group position={[0, -4, 0]} rotation={[0, 0, -Math.PI / 12]}>
        {/* Torus Ring */}
        <mesh castShadow receiveShadow>
          <torusGeometry args={[0.9, 0.3, 16, 32]} />
          <primitive object={chromeMaterial} attach="material" />
        </mesh>

        {/* Star */}
        <mesh position={[0, 0, -0.125]}>
          <primitive object={starGeo} attach="geometry" />
          <primitive object={chromeMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
};

// Particles
const Particles = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const particlesGeometry = React.useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 300;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 20;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <primitive object={particlesGeometry} attach="geometry" />
      <pointsMaterial size={0.02} color={0xffffff} transparent opacity={0.5} />
    </points>
  );
};

// Scene content with mouse tracking
const SceneContent = () => {
  const groupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseRef.current.x = event.clientX - windowHalfX;
      mouseRef.current.y = event.clientY - windowHalfY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Update target rotations based on mouse
      targetRotationRef.current.y = mouseRef.current.x * 0.003;
      targetRotationRef.current.x = mouseRef.current.y * 0.003;

      // Smooth lerp to target
      groupRef.current.rotation.y += 0.05 * (targetRotationRef.current.y - groupRef.current.rotation.y);
      groupRef.current.rotation.x += 0.05 * (targetRotationRef.current.x - groupRef.current.rotation.x);

      // Idle floating animation
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <Hammer />
      <Wrench />
    </group>
  );
};

// Main component
export const HammerBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        shadows
        camera={{ position: [0, 0, 12], fov: 45 }}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <color attach="background" args={['#09090b']} />
        <fog attach="fog" args={[0x09090b, 10, 30]} />

        {/* Lighting - More colorful and intense */}
        <ambientLight intensity={0.8} color={0x6080a0} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={8}
          color={0xffffff}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <spotLight
          position={[-5, 10, -5]}
          angle={Math.PI / 6}
          penumbra={1}
          intensity={30}
          color={0x88ccff}
          castShadow
        />
        <pointLight position={[0, -5, 5]} intensity={3} color={0xff88cc} />
        <pointLight position={[5, 5, -5]} intensity={2} color={0x88ffcc} />
        <hemisphereLight args={[0x88ccff, 0xff88cc, 1]} />

        <SceneContent />
        <Particles />
      </Canvas>
    </div>
  );
};

