'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { extractBitPlane, Channel } from '@/lib/stego/bitPlane';

interface BitPlaneInspectorProps {
  coverImageData: ImageData | null;
  stegoImageData: ImageData | null;
}

export default function BitPlaneInspector({ coverImageData, stegoImageData }: BitPlaneInspectorProps) {
  const [selectedPlane, setSelectedPlane] = useState<number>(0);
  const [selectedChannel, setSelectedChannel] = useState<Channel>('combined');
  const [showCover, setShowCover] = useState<boolean>(true);
  const [showStego, setShowStego] = useState<boolean>(true);

  const coverCanvasRef = useRef<HTMLCanvasElement>(null);
  const stegoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Update canvas when image data or selection changes
  useEffect(() => {
    if (coverImageData && showCover && coverCanvasRef.current) {
      const canvas = coverCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          const bitPlaneData = extractBitPlane(coverImageData, selectedPlane, selectedChannel);
          canvas.width = bitPlaneData.width;
          canvas.height = bitPlaneData.height;
          ctx.putImageData(bitPlaneData, 0, 0);
        } catch (error) {
          console.error('Error extracting cover bit plane:', error);
        }
      }
    }
  }, [coverImageData, selectedPlane, selectedChannel, showCover]);

  useEffect(() => {
    if (stegoImageData && showStego && stegoCanvasRef.current) {
      const canvas = stegoCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          const bitPlaneData = extractBitPlane(stegoImageData, selectedPlane, selectedChannel);
          canvas.width = bitPlaneData.width;
          canvas.height = bitPlaneData.height;
          ctx.putImageData(bitPlaneData, 0, 0);
        } catch (error) {
          console.error('Error extracting stego bit plane:', error);
        }
      }
    }
  }, [stegoImageData, selectedPlane, selectedChannel, showStego]);

  const handlePlaneChange = (plane: number) => {
    setSelectedPlane(plane);
  };

  const handleChannelChange = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  const channels: { value: Channel; label: string }[] = [
    { value: 'combined', label: 'RGB Combined' },
    { value: 'red', label: 'Red Channel' },
    { value: 'green', label: 'Green Channel' },
    { value: 'blue', label: 'Blue Channel' },
  ];

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
        <Layers className="w-4 h-4 text-teal-600" /> Bit-Plane Inspector
      </h3>

      {/* Bit Plane Selection */}
      <div className="space-y-2">
        <label 
          htmlFor="bit-plane-select" 
          className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
        >
          Bit Plane (0-7)
        </label>
        <div 
          className="flex flex-wrap gap-1.5" 
          role="group" 
          aria-label="Bit plane selection"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((plane) => (
            <button
              key={plane}
              onClick={() => handlePlaneChange(plane)}
              aria-pressed={selectedPlane === plane}
              aria-label={`Bit plane ${plane}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                selectedPlane === plane 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {plane}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
          {selectedPlane === 0 
            ? 'Plane 0 (LSB) - Shows noise patterns from steganography' 
            : `Plane ${selectedPlane} - Higher bit planes contain more visual information`}
        </p>
      </div>

      {/* Channel Selection */}
      <div className="space-y-2">
        <label 
          htmlFor="channel-select" 
          className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
        >
          Color Channel
        </label>
        <div 
          className="flex flex-wrap gap-1.5" 
          role="radiogroup" 
          aria-label="Color channel selection"
        >
          {channels.map((channel) => (
            <button
              key={channel.value}
              onClick={() => handleChannelChange(channel.value)}
              aria-pressed={selectedChannel === channel.value}
              aria-label={channel.label}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                selectedChannel === channel.value 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {channel.label}
            </button>
          ))}
        </div>
      </div>

      {/* View Toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowCover(!showCover)}
          aria-pressed={showCover}
          aria-label="Toggle cover image view"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
            showCover 
              ? 'bg-teal-600 text-white shadow-md' 
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {showCover ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Cover
        </button>
        <button
          onClick={() => setShowStego(!showStego)}
          aria-pressed={showStego}
          aria-label="Toggle stego image view"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
            showStego 
              ? 'bg-teal-600 text-white shadow-md' 
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {showStego ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Stego
        </button>
      </div>

      {/* Bit Plane Visualizations */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cover Bit Plane */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Cover</span>
            {!coverImageData && (
              <span className="text-[10px] text-zinc-400 italic">No image loaded</span>
            )}
          </div>
          <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center min-h-[120px]">
            {showCover && coverImageData ? (
              <canvas 
                ref={coverCanvasRef} 
                className="max-w-full rounded-lg shadow-sm"
                aria-label={`Cover image bit plane ${selectedPlane} ${selectedChannel} channel`}
              />
            ) : (
              <div className="text-xs text-zinc-400 italic">
                {showCover ? 'Cover bit plane view' : 'Cover view hidden'}
              </div>
            )}
          </div>
        </div>

        {/* Stego Bit Plane */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Stego</span>
            {!stegoImageData && (
              <span className="text-[10px] text-zinc-400 italic">No stego image</span>
            )}
          </div>
          <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center min-h-[120px]">
            {showStego && stegoImageData ? (
              <canvas 
                ref={stegoCanvasRef} 
                className="max-w-full rounded-lg shadow-sm"
                aria-label={`Stego image bit plane ${selectedPlane} ${selectedChannel} channel`}
              />
            ) : (
              <div className="text-xs text-zinc-400 italic">
                {showStego ? 'Stego bit plane view' : 'Stego view hidden'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl">
        <p className="text-[11px] text-teal-800 dark:text-teal-300">
          <strong>Bit-Plane Analysis:</strong> LSB steganography primarily affects bit plane 0. 
          Compare cover and stego views to see modifications. Higher planes (4-7) contain most visual information.
        </p>
      </div>
    </div>
  );
}
