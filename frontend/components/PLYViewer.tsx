'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface PLYViewerProps {
  plyUrl: string;
  onClose: () => void;
  title?: string;
}

export const PLYViewer: React.FC<PLYViewerProps> = ({ plyUrl, onClose, title = '3D Model' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const loadThreeAndViewer = async () => {
      try {
        // Dynamically import Three.js
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');

        // Setup scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        sceneRef.current = scene;

        // Setup camera
        const camera = new THREE.PerspectiveCamera(
          45,
          containerRef.current!.clientWidth / containerRef.current!.clientHeight,
          0.01,
          100
        );
        camera.position.set(0.5, 0.5, 1.5);
        cameraRef.current = camera;

        // Setup renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(containerRef.current!.clientWidth, containerRef.current!.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current!.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Setup controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2;
        controlsRef.current = controls;

        // Lighting
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        // Load PLY
        const loader = new PLYLoader();
        loader.load(
          plyUrl,
          (geometry: any) => {
            geometry.computeVertexNormals();
            
            const material = new THREE.PointsMaterial({
              size: 0.003,
              vertexColors: geometry.hasAttribute('color'),
            });

            const points = new THREE.Points(geometry, material);
            geometry.center();
            scene.add(points);

            setIsLoading(false);

            // Animation loop
            const animate = () => {
              requestAnimationFrame(animate);
              controls.update();
              renderer.render(scene, camera);
            };
            animate();
          },
          undefined,
          (error: any) => {
            console.error('Error loading PLY:', error);
            setError('Failed to load 3D model');
            setIsLoading(false);
          }
        );

        // Handle window resize
        const handleResize = () => {
          if (!containerRef.current) return;
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          renderer.dispose();
          containerRef.current?.removeChild(renderer.domElement);
        };
      } catch (err) {
        console.error('Error setting up PLY viewer:', err);
        setError('Failed to initialize 3D viewer');
        setIsLoading(false);
      }
    };

    loadThreeAndViewer();
  }, [plyUrl]);

  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0.5, 0.5, 1.5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const toggleAutoRotate = () => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !controlsRef.current.autoRotate;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[80vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetView}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
              title="Reset view"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={toggleAutoRotate}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
              title="Toggle auto-rotate"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
                <p className="text-slate-400">Loading 3D model...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
              <div className="text-center space-y-4">
                <p className="text-red-400 font-semibold">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-800 text-xs text-slate-400">
          <p>💡 Drag to rotate • Scroll to zoom • Right-click to pan</p>
        </div>
      </div>
    </div>
  );
};
