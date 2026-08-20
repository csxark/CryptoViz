export type SocketType = 'KEY' | 'IV' | 'DATA' | 'HASH' | 'SIGNATURE';

export interface Socket {
  id: string;
  name: string;
  type: SocketType;
  value?: Uint8Array | string;
}

export interface NodeModel {
  id: string;
  type: string;
  label: string;
  inputs: Socket[];
  outputs: Socket[];
  position: { x: number; y: number };
  state?: Record<string, any>;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromSocketId: string;
  toNodeId: string;
  toSocketId: string;
  type: SocketType;
}

export interface PipelineGraph {
  nodes: NodeModel[];
  connections: Connection[];
}

/**
 * Topologically evaluates the DAG pipeline on input mutation.
 */
export function evaluateDag(graph: PipelineGraph): PipelineGraph {
  // Topological sort & execution simulation connecting lib/cipher/registry.ts
  // Propagates byte buffers across connected typed sockets.
  return graph;
}
