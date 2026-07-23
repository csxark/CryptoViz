import { CIPHER_REGISTRY } from "@/lib/cipher/registry";

export interface CipherTestResult {
  cipherId: string;
  cipherName: string;
  category: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  roundTripSuccess: boolean;
  errorMessage?: string;
  details?: {
    plaintext: string;
    ciphertext: string;
    decryptedText?: string;
  };
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  results: CipherTestResult[];
}

function getCipherParams(cipherId: string, category: string, defaultKey: string): { input: string; key: string } {
  const input = "CRYPTOVIZ INTEGRATION TEST 123";
  let key = defaultKey || "";

  switch (cipherId) {
    case "aes":
    case "3des":
      key = "000102030405060708090a0b0c0d0e0f";
      break;
    case "des":
      key = "0123456789abcdef";
      break;
    case "otp":
      key = "X".repeat(input.length);
      break;
    case "caesar":
      key = "3";
      break;
    default:
      if ((category as string) === "hash") {
        key = "";
      }
      break;
  }

  return { input, key };
}

export async function runCipherIntegrationTests(
  executeCipherFn?: (action: "encrypt" | "decrypt", cipherId: string, input: string, key: string) => Promise<{ output: string }>,
  onProgress?: (completed: number, total: number, currentCipher: string) => void
): Promise<TestSuiteSummary> {
  const startTime = performance.now();
  const results: CipherTestResult[] = [];
  const total = CIPHER_REGISTRY.length;

  for (let i = 0; i < CIPHER_REGISTRY.length; i++) {
    const cipher = CIPHER_REGISTRY[i];
    onProgress?.(i + 1, total, cipher.name);

    const cipherStartTime = performance.now();
    const { input: testInput, key } = getCipherParams(cipher.id, cipher.category, cipher.defaultKey || "");
    const isHash = (cipher.category as string) === "hash";

    try {
      if (!executeCipherFn) {
        throw new Error("Cipher executor function missing");
      }

      const encResult = await executeCipherFn("encrypt", cipher.id, testInput, key);

      if (isHash) {
        const durationMs = performance.now() - cipherStartTime;
        results.push({
          cipherId: cipher.id,
          cipherName: cipher.name,
          category: cipher.category,
          status: encResult?.output ? "passed" : "failed",
          durationMs: Number(durationMs.toFixed(2)),
          roundTripSuccess: true,
          details: {
            plaintext: testInput,
            ciphertext: encResult?.output || "",
          },
        });
      } else {
        let decOutput = "";
        let roundTripSuccess = false;

        if (encResult?.output) {
          const decResult = await executeCipherFn("decrypt", cipher.id, encResult.output, key);
          decOutput = decResult?.output || "";
          roundTripSuccess =
            decOutput.trim().toUpperCase() === testInput.trim().toUpperCase();
        }

        const durationMs = performance.now() - cipherStartTime;

        results.push({
          cipherId: cipher.id,
          cipherName: cipher.name,
          category: cipher.category,
          status: roundTripSuccess ? "passed" : "failed",
          durationMs: Number(durationMs.toFixed(2)),
          roundTripSuccess,
          details: {
            plaintext: testInput,
            ciphertext: encResult?.output || "",
            decryptedText: decOutput,
          },
        });
      }
    } catch (error) {
      const durationMs = performance.now() - cipherStartTime;
      results.push({
        cipherId: cipher.id,
        cipherName: cipher.name,
        category: cipher.category,
        status: "failed",
        durationMs: Number(durationMs.toFixed(2)),
        roundTripSuccess: false,
        errorMessage: (error as Error).message || "Unknown execution failure",
      });
    }
  }

  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const totalDurationMs = performance.now() - startTime;

  return {
    total,
    passed,
    failed,
    skipped,
    durationMs: Number(totalDurationMs.toFixed(2)),
    results,
  };
}