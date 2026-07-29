"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReedSolomonVisualizer from './ReedSolomonVisualizer';

// Define the shape of messages exchanged with the worker
interface WorkerMessage {
  command: 'encode' | 'injectErrors' | 'decode';
  requestId: string;
  payload: any;
}

interface WorkerResponse {
  requestId: string;
  success: boolean;
  payload: any;
}

const ReedSolomonDemo: React.FC = () => {
  const [input, setInput] = useState('');
  const [paritySymbols, setParitySymbols] = useState(32);
  const [encoded, setEncoded] = useState<number[]>([]);
  const [errorPositions, setErrorPositions] = useState<number[]>([]);
  const [decoded, setDecoded] = useState('');
  const workerRef = useRef<Worker | null>(null);

  // Initialize the web worker once
  useEffect(() => {
    workerRef.current = new Worker(new URL('../lib/workers/reedSolomonWorker.ts', import.meta.url));
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const postToWorker = (msg: WorkerMessage): Promise<WorkerResponse> => {
    return new Promise((resolve) => {
      if (!workerRef.current) return;
      const listener = (e: MessageEvent) => {
        const data: WorkerResponse = e.data;
        if (data.requestId === msg.requestId) {
          workerRef.current?.removeEventListener('message', listener);
          resolve(data);
        }
      };
      workerRef.current.addEventListener('message', listener);
      workerRef.current.postMessage(msg);
    });
  };

  const handleEncode = async () => {
    const requestId = crypto.randomUUID();
    const response = await postToWorker({
      command: 'encode',
      requestId,
      payload: { input, paritySymbols },
    });
    if (response.success) {
      setEncoded(response.payload.encoded);
      setErrorPositions([]);
      setDecoded('');
    }
  };

  const handleInjectErrors = async () => {
    const requestId = crypto.randomUUID();
    const response = await postToWorker({
      command: 'injectErrors',
      requestId,
      payload: { encoded, errorCount: Math.max(1, Math.floor(paritySymbols / 4)) },
    });
    if (response.success) {
      setEncoded(response.payload.corrupted);
      setErrorPositions(response.payload.errorPositions);
    }
  };

  const handleDecode = async () => {
    const requestId = crypto.randomUUID();
    const response = await postToWorker({
      command: 'decode',
      requestId,
      payload: { corrupted: encoded },
    });
    if (response.success) {
      setDecoded(response.payload.decoded);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg space-y-4">
      <h2 className="text-2xl font-bold mb-2">Reed‑Solomon Error‑Correction Demo</h2>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        placeholder="Enter a message"
        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="flex items-center space-x-4">
        <label className="font-medium">Parity symbols:</label>
        <input
          type="number"
          min={4}
          max={64}
          value={paritySymbols}
          onChange={(e) => setParitySymbols(parseInt(e.target.value, 10) || 0)}
          className="w-20 p-1 border rounded-md"
        />
      </div>
      <div className="flex space-x-4">
        <button onClick={handleEncode} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition">
          Encode
        </button>
        <button onClick={handleInjectErrors} disabled={encoded.length === 0} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition">
          Inject Errors
        </button>
        <button onClick={handleDecode} disabled={encoded.length === 0} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition">
          Decode
        </button>
      </div>
      {encoded.length > 0 && (
        <ReedSolomonVisualizer encoded={encoded} errorPositions={errorPositions} decoded={decoded} />
      )}
      {decoded && (
        <div className="mt-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded">
          <strong>Decoded message:</strong> {decoded}
        </div>
      )}
    </div>
  );
};

export default ReedSolomonDemo;
