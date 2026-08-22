export type NetworkType = 'L1' | 'L2' | 'Sidechain';
export type Confidence = 'High' | 'Medium' | 'Low';

export interface ChainNetwork {
    id: string;
    name: string;
    type: NetworkType;
    nativeToken: string;
    currentGasGwei: number;
    transferCostUSD: number;
    swapCostUSD: number;
    tps: number;
    finalityTime: string;
}

export interface BridgeRoute {
    id: string;
    sourceChain: string;
    targetChain: string;
    bridgeName: string;
    estimatedTimeMin: number;
    feeUSD: number;
    securityRating: Confidence;
}

function mulberry32(a: number) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const rand = mulberry32(5678);

const networks = [
    { name: 'Ethereum', type: 'L1', token: 'ETH', gweiBase: 30, xferBase: 2.0, swapBase: 15.0, tps: 15, finality: '12 mins' },
    { name: 'Arbitrum', type: 'L2', token: 'ETH', gweiBase: 0.1, xferBase: 0.05, swapBase: 0.25, tps: 4000, finality: '1 sec' },
    { name: 'Optimism', type: 'L2', token: 'ETH', gweiBase: 0.1, xferBase: 0.04, swapBase: 0.20, tps: 4000, finality: '2 secs' },
    { name: 'Polygon', type: 'Sidechain', token: 'MATIC', gweiBase: 30, xferBase: 0.01, swapBase: 0.05, tps: 65000, finality: '2 secs' },
    { name: 'Base', type: 'L2', token: 'ETH', gweiBase: 0.05, xferBase: 0.02, swapBase: 0.10, tps: 2000, finality: '2 secs' },
    { name: 'Solana', type: 'L1', token: 'SOL', gweiBase: 0, xferBase: 0.0001, swapBase: 0.001, tps: 65000, finality: '400 ms' },
    { name: 'Avalanche', type: 'L1', token: 'AVAX', gweiBase: 25, xferBase: 0.03, swapBase: 0.15, tps: 4500, finality: '2 secs' },
    { name: 'BSC', type: 'Sidechain', token: 'BNB', gweiBase: 3, xferBase: 0.02, swapBase: 0.10, tps: 300, finality: '3 secs' }
];

const bridges = ['Stargate', 'Across', 'Synapse', 'Hop', 'Orbiter'];

export const generateGasTopology = (): ChainNetwork[] => {
    return networks.map(n => {
        const spike = rand() > 0.8 ? (rand() * 2) + 1 : 1; // occasional 1x to 3x spike
        return {
            id: `chain-${n.name.toLowerCase()}`,
            name: n.name,
            type: n.type as NetworkType,
            nativeToken: n.token,
            currentGasGwei: parseFloat((n.gweiBase * spike).toFixed(2)),
            transferCostUSD: parseFloat((n.xferBase * spike).toFixed(4)),
            swapCostUSD: parseFloat((n.swapBase * spike).toFixed(4)),
            tps: n.tps,
            finalityTime: n.finality
        };
    });
};

export const generateBridgeMatrix = (): BridgeRoute[] => {
    const routes: BridgeRoute[] = [];

    for (let i = 0; i < networks.length; i++) {
        for (let j = 0; j < networks.length; j++) {
            if (i === j) continue; // no self bridge

            const source = networks[i].name;
            const target = networks[j].name;

            if (rand() > 0.7) continue; // Not all routes exist

            const bridge = bridges[Math.floor(rand() * bridges.length)];

            // Calculate baseline fee
            let fee = 1.0;
            if (source === 'Ethereum') fee += 5.0;
            if (target === 'Ethereum') fee += 15.0;
            fee += rand() * 2;

            let sec: Confidence = 'High';
            if (bridge === 'Orbiter') sec = 'Medium';
            if (bridge === 'Hop' && source === 'Ethereum') sec = 'Low'; // Simulated incident factor

            let estT = Math.floor(rand() * 15) + 1;
            if (target === 'Ethereum') estT += 10;

            routes.push({
                id: `br-${source}-${target}-${bridge}`,
                sourceChain: source,
                targetChain: target,
                bridgeName: bridge,
                estimatedTimeMin: estT,
                feeUSD: parseFloat(fee.toFixed(2)),
                securityRating: sec
            });
        }
    }
    return routes.sort((a, b) => a.feeUSD - b.feeUSD);
};

export const staticGasNetworks = generateGasTopology();
export const staticBridgeMatrix = generateBridgeMatrix();
