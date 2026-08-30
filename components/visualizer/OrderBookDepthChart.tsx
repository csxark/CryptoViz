import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Order {
  price: number;
  size: number;
  total: number;
}

export const OrderBookDepthChart: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827); // Tailwind gray-900

    const width = mountRef.current.clientWidth;
    const height = 400;

    const camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // 2. Materials
    const bidMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x10B981, // Tailwind emerald-500
      transparent: true,
      opacity: 0.5 
    });
    
    const askMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xEF4444, // Tailwind red-500
      transparent: true,
      opacity: 0.5 
    });

    const bidLineMaterial = new THREE.LineBasicMaterial({ color: 0x10B981, linewidth: 2 });
    const askLineMaterial = new THREE.LineBasicMaterial({ color: 0xEF4444, linewidth: 2 });

    // 3. Meshes (Initialize empty)
    const bidGeometry = new THREE.BufferGeometry();
    const askGeometry = new THREE.BufferGeometry();
    
    const bidMesh = new THREE.Mesh(bidGeometry, bidMaterial);
    const askMesh = new THREE.Mesh(askGeometry, askMaterial);
    
    const bidLine = new THREE.Line(bidGeometry, bidLineMaterial);
    const askLine = new THREE.Line(askGeometry, askLineMaterial);

    scene.add(bidMesh);
    scene.add(askMesh);
    scene.add(bidLine);
    scene.add(askLine);

    // 4. Data Simulation & Geometry Updating
    const updateGeometry = () => {
      // Mock Data: Bids (Buyers)
      const bids: Order[] = [];
      let bidTotal = 0;
      for (let i = 0; i < 100; i++) {
        bidTotal += Math.random() * 5 + 1;
        bids.push({ price: 10000 - i * 10, size: Math.random() * 5 + 1, total: bidTotal });
      }

      // Mock Data: Asks (Sellers)
      const asks: Order[] = [];
      let askTotal = 0;
      for (let i = 0; i < 100; i++) {
        askTotal += Math.random() * 5 + 1;
        asks.push({ price: 10010 + i * 10, size: Math.random() * 5 + 1, total: askTotal });
      }

      const maxTotal = Math.max(bids[bids.length - 1].total, asks[asks.length - 1].total);
      
      // Update Bids Geometry
      const bidVertices = [];
      const midPoint = width / 2;
      
      bidVertices.push(midPoint, 0, 0); // Bottom Right
      
      bids.forEach((bid, i) => {
        const x = midPoint - (i / bids.length) * midPoint;
        const y = (bid.total / maxTotal) * height;
        bidVertices.push(x, y, 0);
      });
      
      bidVertices.push(0, 0, 0); // Bottom Left
      
      bidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bidVertices, 3));
      bidGeometry.computeVertexNormals();

      // Update Asks Geometry
      const askVertices = [];
      askVertices.push(midPoint, 0, 0); // Bottom Left

      asks.forEach((ask, i) => {
        const x = midPoint + (i / asks.length) * midPoint;
        const y = (ask.total / maxTotal) * height;
        askVertices.push(x, y, 0);
      });

      askVertices.push(width, 0, 0); // Bottom Right

      askGeometry.setAttribute('position', new THREE.Float32BufferAttribute(askVertices, 3));
      askGeometry.computeVertexNormals();
    };

    // 5. Render Loop
    let animationFrameId: number;
    const animate = () => {
      // Simulate real-time rapid updates
      updateGeometry();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 6. Cleanup
    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      camera.right = newWidth;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose WebGL resources
      bidGeometry.dispose();
      askGeometry.dispose();
      bidMaterial.dispose();
      askMaterial.dispose();
      bidLineMaterial.dispose();
      askLineMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full flex flex-col bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-800">
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-gray-100">Market Depth (WebGL 60fps)</h2>
        <div className="flex gap-4 text-sm font-medium">
          <span className="text-emerald-500">■ Bids</span>
          <span className="text-red-500">■ Asks</span>
        </div>
      </div>
      <div ref={mountRef} className="w-full h-[400px]" />
    </div>
  );
};
