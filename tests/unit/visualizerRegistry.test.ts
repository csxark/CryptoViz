// tests/unit/visualizerRegistry.test.ts

import React from 'react';
import { 
    registerVisualizer, 
    getVisualizer, 
    createLegacyAdapter,
    VisualizerComponentProps 
} from '../../src/contracts/visualizerRegistry';

describe('Visualizer Registry Contract (#1334)', () => {
    
    it('should successfully register and retrieve a valid visualizer component', () => {
        const MockComponent: React.FC<VisualizerComponentProps> = (props) => 
            React.createElement('div', null, `Step: ${props.activeStep}`);

        registerVisualizer({
            id: 'mock-cipher',
            name: 'Mock Cipher',
            component: MockComponent
        });

        const retrieved = getVisualizer('mock-cipher');
        expect(retrieved).toBe(MockComponent);
    });

    it('should return safe fallback visualizer for unknown cipher IDs', () => {
        const unknownVisualizer = getVisualizer('non-existent-cipher-id');
        expect(unknownVisualizer).toBeDefined();
        
        // Verify fallback renders without throwing errors
        const element = React.createElement(unknownVisualizer, {
            result: { output: 'test', steps: [] },
            activeStep: 0,
            input: 'abc',
            key: 'key',
            options: {}
        });
        expect(element).toBeTruthy();
    });

    it('should correctly adapt legacy render functions via legacy adapter helper', () => {
        const legacyRenderer = (output: string) => `Legacy Output: ${output}`;
        const adaptedComponent = createLegacyAdapter(legacyRenderer);

        registerVisualizer({
            id: 'legacy-cipher',
            name: 'Legacy Cipher',
            component: adaptedComponent
        });

        const retrieved = getVisualizer('legacy-cipher');
        expect(retrieved).toBe(adaptedComponent);
    });
});
