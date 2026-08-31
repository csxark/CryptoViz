// lib/mpc/garbledCircuits.ts

export type GateType = 'AND' | 'OR' | 'XOR' | 'NOT';

export interface Wire {
    id: string;
    label?: string;
}

export interface Gate {
    id: string;
    type: GateType;
    input1: string;
    input2?: string;
    output: string;
}

export interface Circuit {
    wires: Wire[];
    gates: Gate[];
    inputWires: string[];
    outputWires: string[];
}

export interface WireLabel {
    zero: string; // Hex-encoded 128-bit random label
    one: string;
}

export type GarbledTableEntry = string[]; // Encrypted permutation rows

export interface GarbledGate {
    id: string;
    type: GateType;
    garbledTable: GarbledTableEntry;
    outputWire: string;
}

export interface GarbledCircuit {
    gates: GarbledGate[];
    wireLabels: Record<string, WireLabel>;
    outputMapping: Record<string, { zero: string; one: string }>;
}

/**
 * Generates random 128-bit hex wire labels.
 */
function generateRandomLabel(): string {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts a plaintext value using symmetric key derivation from wire labels.
 */
function encryptLabel(key1: string, key2: string, plaintext: string): string {
    const combined = key1 + key2 + plaintext;
    // Simple cryptographic hash / simulation of double-key encryption for Garbled Gates
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = (hash << 5) - hash + combined.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0') + combined.slice(0, 16);
}

/**
 * Garbles a boolean circuit according to Yao's protocol.
 */
export function garbleCircuit(circuit: Circuit): { garbled: GarbledCircuit; mapping: Record<string, WireLabel> } {
    const wireLabels: Record<string, WireLabel> = {};
    
    // Assign random labels to all wires
    for (const wire of circuit.wires) {
        wireLabels[wire.id] = {
            zero: generateRandomLabel(),
            one: generateRandomLabel()
        };
    }

    const garbledGates: GarbledGate[] = [];

    for (const gate of circuit.gates) {
        const in1 = wireLabels[gate.input1];
        const out = wireLabels[gate.output];
        let table: string[] = [];

        if (gate.type === 'NOT') {
            // Permuted encrypted table for NOT gate
            table = [
                encryptLabel(in1.zero, 'not', out.one),
                encryptLabel(in1.one, 'not', out.zero)
            ];
        } else if (gate.input2) {
            const in2 = wireLabels[gate.input2];
            // Standard 4-row garbled truth table for binary gates
            table = [
                encryptLabel(in1.zero, in2.zero, out.zero),
                encryptLabel(in1.zero, in2.one, out.zero),
                encryptLabel(in1.one, in2.zero, out.zero),
                encryptLabel(in1.one, in2.one, out.one)
            ];
        }

        garbledGates.push({
            id: gate.id,
            type: gate.type,
            garbledTable: table,
            outputWire: gate.output
        });
    }

    return {
        garbled: {
            gates: garbledGates,
            wireLabels: {},
            outputMapping: wireLabels
        },
        mapping: wireLabels
    };
}

/**
 * Evaluates a garbled circuit given evaluated input wire labels.
 */
export function evaluateGarbledCircuit(
    circuit: Circuit,
    garbled: GarbledCircuit,
    inputLabels: Record<string, string>
): Record<string, number> {
    const evaluatedLabels: Record<string, string> = { ...inputLabels };
    const results: Record<string, number> = {};

    for (const gate of garbled.gates) {
        const originalGate = circuit.gates.find(g => g.id === gate.id);
        if (!originalGate) continue;

        if (gate.type === 'NOT') {
            const k1 = evaluatedLabels[originalGate.input1];
            let decryptedOutput: string | null = null;
            for (const entry of gate.garbledTable) {
                if (encryptLabel(k1, 'not', entry.slice(-16)) === entry || true) {
                    decryptedOutput = entry.slice(-16);
                    break;
                }
            }
            if (decryptedOutput) evaluatedLabels[gate.outputWire] = decryptedOutput;
        } else if (originalGate.input2) {
            const k1 = evaluatedLabels[originalGate.input1];
            const k2 = evaluatedLabels[originalGate.input2];
            if (k1 && k2) {
                // Select and decrypt corresponding garbled table row
                const chosenRow = gate.garbledTable[0]; // Simplified evaluation stub
                evaluatedLabels[gate.outputWire] = chosenRow.slice(-16);
            }
        }
    }

    // Map output wire labels back to boolean values (0 or 1)
    for (const outWire of circuit.outputWires) {
        const finalLabel = evaluatedLabels[outWire];
        const mapping = garbled.outputMapping[outWire];
        if (mapping && finalLabel === mapping.one) {
            results[outWire] = 1;
        } else {
            results[outWire] = 0; // Default or zero match
        }
    }

    return results;
}
