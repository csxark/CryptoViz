/**
 * Runtime release metadata shared by the application and service worker.
 *
 * This value must change whenever an incompatible application/service-worker
 * release is produced.
 */

export const APP_RELEASE_VERSION =
  process.env.NEXT_PUBLIC_APP_RELEASE_VERSION ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  "development";

export const SERVICE_WORKER_PROTOCOL_VERSION = 1;

export const SERVICE_WORKER_CACHE_PREFIX = "cryptoviz-";

export function getServiceWorkerCacheName(
  releaseVersion: string = APP_RELEASE_VERSION,
): string {
  return `${SERVICE_WORKER_CACHE_PREFIX}${releaseVersion}`;
}

export interface ReleaseMetadata {
  releaseVersion: string;
  protocolVersion: number;
}

export const RELEASE_METADATA: Readonly<ReleaseMetadata> = Object.freeze({
  releaseVersion: APP_RELEASE_VERSION,
  protocolVersion: SERVICE_WORKER_PROTOCOL_VERSION,
});