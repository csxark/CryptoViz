import React, { useState, useEffect, useCallback, ReactNode } from 'react';

interface ResizableSplitPaneProps {
  readonly leftChild: ReactNode;
  readonly rightChild: ReactNode;
  readonly direction?: 'vertical' | 'horizontal';
  readonly defaultSplitRatio?: number; // percentage for left/top panel (e.g. 40)
  readonly isZenMode?: boolean;
}

export const ResizableSplitPane: React.FC<ResizableSplitPaneProps> = ({
  leftChild,
  rightChild,
  direction = 'vertical',
  defaultSplitRatio = 40,
  isZenMode = false,
}) => {
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem('cryptoviz_workspace_layout_prefs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.splitRatio ?? defaultSplitRatio;
      } catch {
        return defaultSplitRatio;
      }
    }
    return defaultSplitRatio;
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem(
        'cryptoviz_workspace_layout_prefs',
        JSON.stringify({ splitRatio })
      );
    }
  }, [isDragging, splitRatio]);

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;

      const container = document.getElementById('resizable-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let newRatio = 50;

      if (direction === 'vertical') {
        const offsetX = clientX - rect.left;
        newRatio = (offsetX / rect.width) * 100;
      } else {
        const offsetY = clientY - rect.top;
        newRatio = (offsetY / rect.height) * 100;
      }

      // Clamp between 15% and 85%
      if (newRatio >= 15 && newRatio <= 85) {
        setSplitRatio(newRatio);
      }
    },
    [isDragging, direction]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (isZenMode) {
    return (
      <div className="w-full h-full relative">
        <div className="w-full h-full">{rightChild}</div>
        <div className="absolute top-4 left-4 z-50 bg-gray-900/80 backdrop-blur-md p-2 rounded border border-gray-700 text-white text-xs">
          Zen Mode Active (Press layout toggle to exit)
        </div>
      </div>
    );
  }

  const isVert = direction === 'vertical';

  return (
    <div
      id="resizable-container"
      className={`w-full h-full flex ${
        isVert ? 'flex-row' : 'flex-col'
      } relative overflow-hidden`}
    >
      <div
        style={{ width: isVert ? `${splitRatio}%` : '100%', height: !isVert ? `${splitRatio}%` : '100%' }}
        className="overflow-auto transition-all duration-75"
      >
        {leftChild}
      </div>

      <div
        role="separator"
        aria-orientation={isVert ? 'vertical' : 'horizontal'}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className={`${
          isVert ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'
        } bg-gray-700 hover:bg-blue-500 transition-colors z-10 flex items-center justify-center`}
      />

      <div
        style={{
          width: isVert ? `${100 - splitRatio}%` : '100%',
          height: !isVert ? `${100 - splitRatio}%` : '100%',
        }}
        className="overflow-auto transition-all duration-75"
      >
        {rightChild}
      </div>
    </div>
  );
};
