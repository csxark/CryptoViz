/**
 * Cipher Web Worker.
 *
 * Dispatch is registry-driven. Adding a conventional cipher module requires
 * only its entry in CIPHER_REGISTRY; this worker does not contain cipher cases.
 */

import { CipherError } from "../utils/errors";
import type { WorkerRequest, WorkerResponse } from "../../types/worker";
import type { CipherResult } from "../cipher/types";
import { getDispatcher } from "./cipherDispatchRegistry";

type WorkerRequestMessage = WorkerRequest | Uint8Array;

const workerScope = self as unknown as Worker & typeof globalThis;

workerScope.addEventListener(
  "message",
  async (event: MessageEvent<WorkerRequestMessage>) => {
    const startTime = performance.now();
    let requestData: WorkerRequestMessage = event.data;

    try {
      if (requestData instanceof Uint8Array) {
        requestData = JSON.parse(
          new TextDecoder().decode(requestData),
        ) as WorkerRequest;
      }

      const { type, requestId, payload } = requestData as WorkerRequest;
      const { cipherId, input, key, options } = payload;

      const dispatcher = await getDispatcher(cipherId);
      const handler = type === "encrypt" ? dispatcher.encrypt : dispatcher.decrypt;
      const result = (await handler(input, key, options)) as CipherResult;

      const durationMs = performance.now() - startTime;
      const response: WorkerResponse = {
        requestId,
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: { result: result as any },
        timings: { durationMs },
      };
      workerScope.postMessage(response);
    } catch (error: unknown) {
      const durationMs = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof CipherError ? error.code : undefined;

      const requestId =
        typeof requestData === "object" &&
        requestData !== null &&
        "requestId" in requestData
          ? (requestData as WorkerRequest).requestId
          : "unknown";

      const response: WorkerResponse = {
        requestId,
        success: false,
        payload: {
          error: errorMessage,
          errorCode,
          errorMessage,
        },
        timings: { durationMs },
      };

      workerScope.postMessage(response);
    }
  },
);
