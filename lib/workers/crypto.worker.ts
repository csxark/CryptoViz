import { generateRsaWizard, type RsaWizardInput } from "../asymmetric/rsaKeyGenerationWizard";
import { encrypt, type AesMode } from "../cipher/symmetric/aes";

export type CryptoWorkerRequest = 
  | { id: string; operation: "rsaWizard"; payload: RsaWizardInput }
  | { id: string; operation: "batchModesLab"; payload: { text: string; flipped: string; key: string; iv: string; modes: AesMode[] } };

export type CryptoWorkerResponse = 
  | { id: string; success: true; result: any }
  | { id: string; success: false; error: string };

self.onmessage = async (event: MessageEvent<CryptoWorkerRequest>) => {
  const { id, operation, payload } = event.data;

  try {
    let result: any;

    if (operation === "rsaWizard") {
      result = generateRsaWizard(payload as RsaWizardInput);
    } 
    else if (operation === "batchModesLab") {
      const { text, flipped, key, iv, modes } = payload as any;
      
      const ciphertextHex = (mode: AesMode, data: string) => {
        const options = mode === "ECB" ? { mode } : { mode, iv };
        const out = encrypt(data, key, options).output;
        return mode === "ECB" ? out : out.slice(32);
      };

      const hexToBytes = (hex: string) => {
        const pairs: string[] = [];
        for (let i = 0; i < hex.length; i += 2) pairs.push(hex.slice(i, i + 2));
        return pairs;
      };

      result = modes.map((mode: AesMode) => {
        const original = hexToBytes(ciphertextHex(mode, text));
        const changed = hexToBytes(ciphertextHex(mode, flipped));
        const diff = original.map((b: string, i: number) => b !== changed[i]);
        const changedCount = diff.filter(Boolean).length;
        return { modeId: mode, changed, diff, changedCount, total: changed.length };
      });
    }
    else {
      throw new Error(`Unknown operation: ${operation}`);
    }

    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown worker error",
    });
  }
};

export {};
