import { PaddingOracle, recoverBlock, type AttackStep, type OracleMode, BLOCK_SIZE } from '../attacks/paddingOracle';

const workerScope = self as unknown as Worker;

workerScope.addEventListener('message', (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'recoverBlock') {
    const { key, mode, prevBlockBuffer, targetBlockBuffer, blockOffset, blockIndex } = payload;
    
    try {
      const prevBlock = new Uint8Array(prevBlockBuffer);
      const targetBlock = blockOffset !== undefined
        ? new Uint8Array(targetBlockBuffer, blockOffset, BLOCK_SIZE)
        : new Uint8Array(targetBlockBuffer);
      
      const oracle = new PaddingOracle(key, mode);
      
      const plaintext = recoverBlock(
        oracle,
        prevBlock,
        targetBlock,
        (step: AttackStep) => {
          // Send progress updates back to the main thread
          workerScope.postMessage({ type: 'progress', payload: step });
        },
        blockIndex
      );

      workerScope.postMessage({
        type: 'done',
        payload: {
          plaintext: plaintext.buffer,
          queryCount: oracle.queryCount
        }
      });
    } catch (error: any) {
      workerScope.postMessage({
        type: 'error',
        payload: { message: error.message }
      });
    }
  }
});
