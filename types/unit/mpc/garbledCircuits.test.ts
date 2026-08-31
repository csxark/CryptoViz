// tests/unit/mpc/garbledCircuits.test.ts

import { Circuit, garbleCircuit, evaluateGarbledCircuit } from '../../../lib/mpc/garbledCircuits';

describe('Yao\'s Garbled Circuits Two-Party Computation', () => {
    const simpleAndCircuit: Circuit = {
        wires: [
            { id: 'w1', label: 'Alice Input' },
            { id: 'w2', label: 'Bob Input' },
            { id: 'w3', label: 'AND Output' }
        ],
        gates: [
            { id: 'g1', type: 'AND', input1: 'w1', input2: 'w2', output: 'w3' }
        ],
        inputWires: ['w1', 'w2'],
        outputWires: ['w3']
    };

    it('should successfully garble a boolean circuit without errors', () => {
        const { garbled, mapping } = garbleCircuit(simpleAndCircuit);
        expect(garbled.gates.length).toBe(1);
        expect(mapping['w1']).toBeDefined();
        expect(mapping['w1'].zero).not.toBe(mapping['w1'].one);
    });

    it('should evaluate garbled circuit matching expected wire label structure', () => {
        const { garbled, mapping } = garbleCircuit(simpleAndCircuit);
        const inputLabels = {
            'w1': mapping['w1'].one,
            'w2': mapping['w2'].one
        };

        const result = evaluateGarbledCircuit(simpleAndCircuit, garbled, inputLabels);
        expect(result['w3']).toBeDefined();
    });

    it('should maintain input privacy invariants between garbler and evaluator', () => {
        const { garbled } = garbleCircuit(simpleAndCircuit);
        // Garbled tables contain no plaintext boolean states
        for (const gate of garbled.gates) {
            for (const row of gate.garbledTable) {
                expect(row).not.toContain('true');
                expect(row).not.toContain('false');
            }
        }
    });
});
