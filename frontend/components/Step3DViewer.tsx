'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Step3DViewerProps {
  stepIndex: number;
  totalSteps: number;
  imageUrl: string;
  stepInstructions?: string[];
  plyUrl?: string | null;
}

export const Step3DViewer: React.FC<Step3DViewerProps> = ({
  stepIndex,
  totalSteps,
  imageUrl,
  stepInstructions = [],
  plyUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const partsRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to add placeholder
  const addPlaceholder = (THREE: any, scene: any) => {
    const geometry = new THREE.BoxGeometry(1, 1.5, 0.2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.7,
      metalness: 0.1,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    partsRef.current = [mesh];
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const loadThree = async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');

        // Clear previous renderer
        if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);
        sceneRef.current = scene;

        // Camera
        const width = container.clientWidth;
        const height = container.clientHeight;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 0, 2.5);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.0;
        controlsRef.current = controls;

        // Lighting
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        // Content Loading Logic
        if (plyUrl) {
          // Load Real PLY Model
          setIsLoading(true);
          const loader = new PLYLoader();
          loader.load(
            plyUrl,
            (geometry) => {
              geometry.computeVertexNormals();
              geometry.center();

              const material = new THREE.PointsMaterial({
                size: 0.015,
                vertexColors: geometry.hasAttribute('color'),
              });

              const points = new THREE.Points(geometry, material);
              points.rotation.x = -Math.PI;

              scene.add(points);
              partsRef.current = [points];
              setIsLoading(false);
            },
            undefined,
            (err) => {
              console.error("Failed to load PLY", err);
              setIsLoading(false);
              addPlaceholder(THREE, scene);
            }
          );
        } else {
          addPlaceholder(THREE, scene);
        }

        // Animation loop
        let animationId: number;
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
          cancelAnimationFrame(animationId);
          renderer.dispose();
          partsRef.current.forEach((part: any) => {
            if (part.geometry) part.geometry.dispose();
            if (part.material) part.material.dispose();
          });
        };
      } catch (err) {
        console.error('Error loading Three.js:', err);
      }
    };

    loadThree();
  }, [plyUrl]);

  return (
    <div className="relative w-full h-80 bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg border border-slate-700 overflow-hidden shadow-lg">
      <div ref={containerRef} className="w-full h-full" />

      {/* Status Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
        {isLoading ? (
          <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-xs text-blue-300 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
            Loading 3D Model...
          </div>
        ) : plyUrl ? (
          <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-xs text-green-400 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live 3D View
          </div>
        ) : (
          <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-xs text-slate-400">
            Generating 3D Model...
          </div>
        )}
      </div>
    </div>
  );
};
