import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { A11yProvider, useA11yAnnouncer } from '../../../lib/accessibility/A11yQueue';
import React from 'react';

// Mock timers for accurate queue simulation
vi.useFakeTimers();

describe('Enterprise A11yQueue System', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('provides a dummy implementation when used outside of Provider', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const { result } = renderHook(() => useA11yAnnouncer());
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('must be used within an A11yProvider'));
    expect(result.current.isActive).toBe(false);
    
    // Should not throw
    result.current.announce('test');
    
    consoleSpy.mockRestore();
  });

  it('renders both polite and assertive aria-live regions', () => {
    render(
      <A11yProvider>
        <div>Test Child</div>
      </A11yProvider>
    );

    const politeRegion = screen.getByTestId('a11y-polite-region');
    const assertiveRegion = screen.getByTestId('a11y-assertive-region');

    expect(politeRegion).toHaveAttribute('aria-live', 'polite');
    expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive');
  });

  it('debounces identical rapid messages using double timeout rendering', async () => {
    const TestComponent = () => {
      const { announce } = useA11yAnnouncer();
      return (
        <button onClick={() => announce('Cipher State Loaded', 'polite')}>
          Announce
        </button>
      );
    };

    render(
      <A11yProvider>
        <TestComponent />
      </A11yProvider>
    );

    const button = screen.getByText('Announce');
    const politeRegion = screen.getByTestId('a11y-polite-region');

    act(() => {
      button.click();
    });

    // Before the 50ms internal toggle timeout, region should be empty
    expect(politeRegion).toHaveTextContent('');

    // Fast-forward inner text toggle timeout
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(politeRegion).toHaveTextContent('Cipher State Loaded');
  });

  it('queues polite messages sequentially based on calculated reading time', async () => {
    const TestComponent = () => {
      const { announce } = useA11yAnnouncer();
      return (
        <button onClick={() => {
          announce('First short message', 'polite'); // 3 words, ~1200ms
          announce('Second short message', 'polite'); // 3 words, ~1200ms
        }}>
          Spam Polite
        </button>
      );
    };

    render(
      <A11yProvider>
        <TestComponent />
      </A11yProvider>
    );

    act(() => {
      screen.getByText('Spam Polite').click();
    });

    const politeRegion = screen.getByTestId('a11y-polite-region');

    // Fast-forward initial toggle
    act(() => { vi.advanceTimersByTime(50); });
    expect(politeRegion).toHaveTextContent('First short message');

    // Fast forward halfway through reading time (e.g. 500ms). Should still be first message.
    act(() => { vi.advanceTimersByTime(500); });
    expect(politeRegion).toHaveTextContent('First short message');

    // Fast forward past read time (1200ms). Queue should pop second message + 50ms toggle.
    act(() => { vi.advanceTimersByTime(1200); });
    expect(politeRegion).toHaveTextContent('Second short message');
  });

  it('assertive messages jump the queue and interrupt immediately', async () => {
    const TestComponent = () => {
      const { announce } = useA11yAnnouncer();
      return (
        <button onClick={() => {
          announce('Polite boring message', 'polite');
          announce('CRITICAL ERROR', 'assertive');
        }}>
          Trigger Interruption
        </button>
      );
    };

    render(
      <A11yProvider>
        <TestComponent />
      </A11yProvider>
    );

    act(() => {
      screen.getByText('Trigger Interruption').click();
    });

    const politeRegion = screen.getByTestId('a11y-polite-region');
    const assertiveRegion = screen.getByTestId('a11y-assertive-region');

    // Advance 50ms for inner text toggle
    act(() => { vi.advanceTimersByTime(50); });

    // The assertive message jumps the queue, so the assertive region fires immediately
    expect(assertiveRegion).toHaveTextContent('CRITICAL ERROR');
    
    // Wait for the assertive reading time to finish (2 words * 400ms = 800ms -> min 1000ms)
    act(() => { vi.advanceTimersByTime(1050); });
    
    // Now the polite message should finally process
    expect(politeRegion).toHaveTextContent('Polite boring message');
  });
  
  it('clearQueue properly aborts reading and flushes memory', async () => {
    const TestComponent = () => {
      const { announce, clearQueue } = useA11yAnnouncer();
      return (
        <div>
          <button onClick={() => announce('Message that gets killed', 'polite')}>Announce</button>
          <button onClick={clearQueue}>Clear</button>
        </div>
      );
    };

    render(
      <A11yProvider>
        <TestComponent />
      </A11yProvider>
    );

    act(() => { screen.getByText('Announce').click(); });
    act(() => { vi.advanceTimersByTime(50); });
    
    const politeRegion = screen.getByTestId('a11y-polite-region');
    expect(politeRegion).toHaveTextContent('Message that gets killed');
    
    act(() => { screen.getByText('Clear').click(); });
    expect(politeRegion).toHaveTextContent('');
  });
});
