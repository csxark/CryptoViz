'use client';

import React from 'react';
import { OrderBookDepthChart } from '../../components/visualizer/OrderBookDepthChart';

export default function OrderBookPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-8 flex flex-col items-center font-sans text-gray-200">
      <div className="max-w-6xl w-full">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            Real-Time Liquidity Visualizer
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            This high-frequency trading visualization offloads standard DOM calculations to the GPU via WebGL, enabling 60fps rendering of tens of thousands of bid/ask delta updates per second without freezing the UI thread.
          </p>
        </header>

        <main className="w-full">
          <OrderBookDepthChart />
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <h3 className="font-bold text-gray-100 mb-2">GPU Accelerated</h3>
              <p className="text-sm text-gray-400">Uses Three.js and custom shaders to push polygon rendering directly to the graphics card.</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <h3 className="font-bold text-gray-100 mb-2">Zero DOM Overhead</h3>
              <p className="text-sm text-gray-400">Avoids the severe layout thrashing caused by SVG-based chart updates during market volatility.</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <h3 className="font-bold text-gray-100 mb-2">Locked 60fps</h3>
              <p className="text-sm text-gray-400">Maintains a buttery smooth frame rate even while streaming thousands of websocket ticks.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
