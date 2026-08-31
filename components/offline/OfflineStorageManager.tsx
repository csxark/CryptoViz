'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { importPackFromJson } from '@/lib/offline/packManager';

interface StorageData {
  usage: number;
  quota: number;
}

export const OfflineStorageManager: React.FC = () => {
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  const fetchStorageEstimate = useCallback(async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        setStorageData({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      } catch (err) {
        console.error('Failed to retrieve storage estimate:', err);
      }
    }
  }, []);

  useEffect(() => {
    fetchStorageEstimate();
  }, [fetchStorageEstimate]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setStatusMessage(null);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json') && !file.name.endsWith('.cryptoviz-pack.json')) {
      setStatusMessage({ type: 'error', text: 'Please upload a valid .cryptoviz-pack.json file.' });
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await importPackFromJson(json);
      setStatusMessage({ type: 'success', text: `Successfully imported learning pack: "${file.name}"` });
      fetchStorageEstimate();
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to parse or validate pack JSON.' });
    }
  };

  const handlePurgeCaches = async () => {
    if (!window.confirm('Are you sure you want to purge stale browser caches? User preferences and saved achievements will be preserved.')) {
      return;
    }

    setIsPurging(true);
    setStatusMessage(null);

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((name) => {
            if (!name.includes('preferences')) {
              return caches.delete(name);
            }
          })
        );
      }
      await fetchStorageEstimate();
      setStatusMessage({ type: 'success', text: 'Stale offline caches successfully purged.' });
    } catch (err) {
      console.error('Cache purge failed:', err);
      setStatusMessage({ type: 'error', text: 'Failed to clear browser cache storage.' });
    } finally {
      setIsPurging(false);
    }
  };

  const usagePercent = storageData?.quota ? Math.min((storageData.usage / storageData.quota) * 100, 100) : 0;

  return (
    <div className="space-y-6 max-w-xl mx-auto my-6 p-6 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 shadow-xl">
      <h2 className="text-xl font-bold tracking-tight text-teal-400">Offline Storage & Pack Manager</h2>

      {/* Storage Quota Card */}
      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
        <div className="flex justify-between text-sm text-slate-400 mb-2">
          <span>Storage Consumption</span>
          <span>{storageData ? `${formatBytes(storageData.usage)} / ${formatBytes(storageData.quota)}` : 'Estimating...'}</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${usagePercent > 85 ? 'bg-red-500' : 'bg-teal-500'}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Drag & Drop Import Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging ? 'border-teal-400 bg-teal-950/30' : 'border-slate-700 bg-slate-950/50 hover:border-slate-500'
        }`}
      >
        <svg className="mx-auto h-10 w-10 text-teal-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <p className="font-semibold text-sm text-slate-200">Import External Learning Pack</p>
        <p className="text-xs text-slate-400 mt-1">Drag and drop your <code className="text-teal-300">.cryptoviz-pack.json</code> file here</p>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div className={`p-3 rounded-lg text-sm font-medium ${statusMessage.type === 'success' ? 'bg-teal-950/60 text-teal-300 border border-teal-800' : 'bg-red-950/60 text-red-300 border border-red-800'}`}>
          {statusMessage.text}
        </div>
      )}

      {/* Cache Lifecycle Control */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Stale Cache Lifecycle</h4>
          <p className="text-xs text-slate-400">Clear old asset caches to reclaim device disk space.</p>
        </div>
        <button
          onClick={handlePurgeCaches}
          disabled={isPurging}
          className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/50 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {isPurging ? 'Purging...' : 'Purge Stale Caches'}
        </button>
      </div>
    </div>
  );
};
