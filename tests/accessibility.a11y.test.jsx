import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// Mock component simulating an interactive cryptographic visualization with modal, form, and worker status
function MockCryptoVizApp() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [workerStatus, setWorkerStatus] = React.useState('Idle');

  const handleStartWorker = () => {
    setWorkerStatus('Processing cryptographic keys...');
    setTimeout(() => setWorkerStatus('Complete'), 100);
  };

  return (
    <div>
      <header>
        <h1>CryptoViz Accessibility Suite</h1>
      </header>
      
      <main>
        <section aria-labelledby="visualizer-heading">
          <h2 id="visualizer-heading">Visualization Controls</h2>
          <button onClick={() => setIsModalOpen(true)}>Open Configuration Modal</button>
          <button onClick={handleStartWorker}>Run Worker Simulation</button>
          
          {/* Live region for dynamic worker status updates */}
          <div aria-live="polite" aria-atomic="true" data-testid="worker-status">
            Status: {workerStatus}
          </div>
        </section>
      </main>

      {isModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <h3 id="modal-title">Visualization Parameters</h3>
          <form>
            <label htmlFor="algorithm-select">Cipher Algorithm</label>
            <select id="algorithm-select">
              <option value="AES">AES-256</option>
              <option value="RSA">RSA-4096</option>
            </select>
            <button type="button" onClick={() => setIsModalOpen(false)}>Close</button>
          </form>
        </div>
      )}
    </div>
  );
}

describe('CryptoViz Automated Accessibility Regression Tests', () => {
  it('should have no automated accessibility violations on main interactive views (WCAG AA)', async () => {
    const { container } = render(<MockCryptoVizApp />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should correctly announce dynamic worker progress via live regions', async () => {
    render(<MockCryptoVizApp />);
    const workerButton = screen.getByText('Run Worker Simulation');
    fireEvent.click(workerButton);

    const liveRegion = screen.getByTestId('worker-status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    
    await waitFor(() => {
      expect(liveRegion).toHaveTextContent('Status: Complete');
    });
  });

  it('should correctly expose form labels and accessible modal structure', () => {
    render(<MockCryptoVizApp />);
    
    // Open modal
    fireEvent.click(screen.getByText('Open Configuration Modal'));

    // Verify modal attributes and form associations
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    
    const label = screen.getByText('Cipher Algorithm');
    const select = screen.getByRole('combobox');
    expect(label).toHaveAttribute('for', select.id || 'algorithm-select');
  });
});
