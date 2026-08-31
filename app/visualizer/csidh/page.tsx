import React from 'react';
import { CSIDH_METADATA } from '@/lib/cipher/asymmetric/csidh';

export default function CSIDHVisualizer() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">CSIDH Group Action Visualizer</h1>
        
        {/* Educational Simulation Notice Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Pedagogical Simulation Notice
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                {CSIDH_METADATA.description} To keep the visualization lightweight and responsive, 
                this dashboard uses a simplified scalar addition model <code className="bg-amber-100 px-1 rounded">(A + B) % P</code> 
                to simulate the algebraic properties of the actual class group action on Montgomery curves.
              </p>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
