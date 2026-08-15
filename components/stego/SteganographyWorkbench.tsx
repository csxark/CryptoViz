'use client';

import React, { useState, useRef } from 'react';
import { encodeLSB, decodeLSB, encodeZeroWidth, decodeZeroWidth } from '@/lib/stego/lsbEngine';
import { runChiSquareSteganalysis, ChiSquareResult } from '@/lib/stego/chiSquare';
import { Sparkles, Image as ImageIcon, FileText, ShieldAlert, CheckCircle2, Layers } from 'lucide-react';

export default function SteganographyWorkbench() {
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [bitDepth, setBitDepth] = useState<number>(1);
  const [secretMessage, setSecretMessage] = useState<string>('Covert Payload 123');
  const [coverText, setCoverText] = useState<string>('The quick brown fox jumps over the lazy dog.');
  const [outputResult, setOutputResult] = useState<string>('');
  const [chiResult, setChiResult] = useState<ChiSquareResult | null>(null);
  const [selectedPlane, setSelectedPlane] = useState<number>(0);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setChiResult(runChiSquareSteganalysis(imgData));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleEmbedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const stegoData = encodeLSB(imgData, secretMessage, bitDepth);
    ctx.putImageData(stegoData, 0, 0);

    setChiResult(runChiSquareSteganalysis(stegoData));
    setOutputResult('Payload successfully embedded via spatial LSB!');
  };

  const handleDecodeImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = decodeLSB(imgData, bitDepth);
    setOutputResult(`Extracted Secret Message: "${decoded}"`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm font-inter text-neutral-900 dark:text-neutral-100">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold font-playfair flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Digital Steganography & Steganalysis Workbench
          </h2>
          <p className="text-xs text-neutral-500 mt-1">Hide secret payloads in media coverfiles and run statistical Chi-squared detection.</p>
        </div>
        <div className="flex gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-medium">
          <button onClick={() => setActiveTab('image')} className={`px-4 py-2 rounded-lg transition ${activeTab === 'image' ? 'bg-white dark:bg-neutral-700 shadow-sm font-bold' : 'text-neutral-500'}`}>
            <ImageIcon className="w-3.5 h-3.5 inline mr-1.5" /> Spatial Image LSB
          </button>
          <button onClick={() => setActiveTab('text')} className={`px-4 py-2 rounded-lg transition ${activeTab === 'text' ? 'bg-white dark:bg-neutral-700 shadow-sm font-bold' : 'text-neutral-500'}`}>
            <FileText className="w-3.5 h-3.5 inline mr-1.5" /> Zero-Width Text
          </button>
        </div>
      </div>

      {activeTab === 'image' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center min-h-[300px]">
              <canvas ref={canvasRef} className="max-w-full rounded-xl shadow-sm border border-neutral-300 dark:border-neutral-700 mb-4" />
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 rounded-xl text-xs font-bold transition">
                Upload Cover Image (PNG/JPEG)
              </button>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Secret Message Payload</label>
              <input
                type="text"
                value={secretMessage}
                onChange={(e) => setSecretMessage(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none"
              />
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Bit Depth:</span>
                  {[1, 2, 3].map(depth => (
                    <button
                      key={depth}
                      onClick={() => setBitDepth(depth)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${bitDepth === depth ? 'bg-amber-500 text-white' : 'bg-neutral-200 dark:bg-neutral-800'}`}
                    >
                      {depth}-Bit
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleEmbedImage} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition">Embed via LSB</button>
                  <button onClick={handleDecodeImage} className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 font-bold text-xs transition">Decode LSB</button>
                </div>
              </div>
              {outputResult && <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium">{outputResult}</div>}
            </div>
          </div>

          {/* Steganalysis & Bit-Plane Inspector */}
          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Chi-Squared Steganalysis
              </h3>
              {chiResult ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <span className="text-neutral-500">Chi-Square Stat ($\chi^2$):</span>
                    <span className="font-mono font-bold">{chiResult.chiSquareStat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <span className="text-neutral-500">Estimated p-value:</span>
                    <span className="font-mono font-bold">{chiResult.pValue.toFixed(4)}</span>
                  </div>
                  <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${chiResult.isPayloadDetected ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-green-500/10 border-green-500/30 text-green-600'}`}>
                    {chiResult.isPayloadDetected ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {chiResult.isPayloadDetected ? 'Payload Anomaly Detected (p-value high)' : 'Clean Cover Media (Natural Distribution)'}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic">Upload an image to run statistical steganalysis.</p>
              )}
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" /> Bit-Plane Inspector
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(plane => (
                  <button
                    key={plane}
                    onClick={() => setSelectedPlane(plane)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedPlane === plane ? 'bg-amber-500 text-white' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700'}`}
                  >
                    Plane {plane}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-neutral-500 italic">Inspecting Bit-Plane {selectedPlane} (Plane 0 highlights LSB noise patterns).</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Cover Carrier Text</label>
            <textarea
              value={coverText}
              onChange={(e) => setCoverText(e.target.value)}
              className="w-full p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none"
              rows={3}
            />
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Secret Message</label>
            <input
              type="text"
              value={secretMessage}
              onChange={(e) => setSecretMessage(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOutputResult(encodeZeroWidth(coverText, secretMessage))}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition"
              >
                Encode Zero-Width Unicode
              </button>
              <button
                onClick={() => setOutputResult(`Decoded Message: "${decodeZeroWidth(outputResult)}"`) }
                className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 font-bold text-xs transition"
              >
                Decode Zero-Width Unicode
              </button>
            </div>
            {outputResult && (
              <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono break-all">
                {outputResult}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
