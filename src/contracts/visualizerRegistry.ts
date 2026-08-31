// src/contracts/visualizerRegistry.ts

import React from 'react';

export interface CipherResult {
    output: string;
    steps: Array<{ description: string; stateData?: Record<string, any> }>;
}

export interface CipherOptions {
    [key: string]: any;
}

/**
 * Strict visualizer component props contract (#1334).
 * All registered visualizers must accept and respect these state semantics.
 */
export interface VisualizerComponentProps {
    result: CipherResult;
    activeStep: number;
    input: string;
    key: string;
    options: CipherOptions;
}

export type VisualizerComponent = React.ComponentType<VisualizerComponentProps>;

export interface RegistryEntry {
    id: string;
    name: string;
    component: VisualizerComponent;
}

// Centralized Visualizer Registry Store
const visualizerRegistry = new Map<string, RegistryEntry>();

/**
 * Registers a visualizer component, enforcing strict compile-time contract compliance.
 */
export function registerVisualizer(entry: RegistryEntry): void {
    if (!entry.id || !entry.component) {
        throw new Error(`Invalid visualizer registration: Missing ID or component.`);
    }
    visualizerRegistry.set(entry.id, entry);
}

/**
 * Retrieves a registered visualizer by ID, returning a safe fallback if unknown.
 */
export function getVisualizer(id: string): VisualizerComponent {
    const entry = visualizerRegistry.get(id);
    if (!entry) {
        // Safe fallback component for unknown cipher IDs
        return DefaultFallbackVisualizer;
    }
    return entry.component;
}

/**
 * Fallback visualizer component for unregistered or unknown cipher IDs.
 */
export function DefaultFallbackVisualizer(props: VisualizerComponentProps): React.ReactElement {
    return React.createElement(
        'div',
        { className: 'p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-2' },
        React.createElement('h3', { className: 'font-bold text-lg' }, 'Visualizer Unavailable'),
        React.createElement('p', { className: 'text-sm' }, `No visualizer contract registered for this cipher ID. Output: ${props.result?.output || 'N/A'}`)
    );
}

/**
 * Adapter helper for legacy visualizers that may not natively accept the full contract props.
 */
export function createLegacyAdapter(legacyRenderFn: (output: string) => React.ReactNode): VisualizerComponent {
    return function LegacyAdapterWrapper(props: VisualizerComponentProps) {
        return React.createElement(
            'div',
            { className: 'legacy-adapter-wrapper' },
            legacyRenderFn(props.result.output)
        );
    };
}
