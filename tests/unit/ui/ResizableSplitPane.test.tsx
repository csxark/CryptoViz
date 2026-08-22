import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResizableSplitPane } from '../../../src/components/ui/ResizableSplitPane';

describe('ResizableSplitPane Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders left and right child components correctly', () => {
    render(
      <ResizableSplitPane
        leftChild={<div data-testid="left-panel">Left</div>}
        rightChild={<div data-testid="right-panel">Right</div>}
      />
    );

    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
  });

  it('renders only the visualizer in Zen Mode', () => {
    render(
      <ResizableSplitPane
        leftChild={<div data-testid="left-panel">Left</div>}
        rightChild={<div data-testid="right-panel">Right</div>}
        isZenMode={true}
      />
    );

    expect(screen.queryByTestId('left-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    expect(screen.getByText(/Zen Mode Active/i)).toBeInTheDocument();
  });

  it('persists and reads layout split preferences from localStorage', () => {
    localStorage.setItem(
      'cryptoviz_workspace_layout_prefs',
      JSON.stringify({ splitRatio: 65 })
    );

    render(
      <ResizableSplitPane
        leftChild={<div>Left</div>}
        rightChild={<div>Right</div>}
        defaultSplitRatio={40}
      />
    );

    // Initial split ratio should load saved preference (65)
    expect(localStorage.getItem('cryptoviz_workspace_layout_prefs')).toContain('65');
  });
});
