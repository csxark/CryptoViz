/**
 * Registry-backed cipher dispatch for the worker.
 *
 * CIPHER_REGISTRY is the source of truth for cipher IDs/categories.
 * import.meta.glob gives Vite a statically analyzable set of lazy module
 * imports, so adding a normal cipher module does not require editing the
 * worker. Only non-conventional modules (for example SHA-224/SHA-384) need
 * a small adapter here.
 */
import { CIPHER_REGISTRY } from "../cipher/registry";
import { CipherError } from "../utils/errors";
import type { CipherOptions, CipherResult } from "../cipher/types";

export type CipherHandler = (
  input: string,
  key: string,
  options?: CipherOptions | Record<string, unknown>,
) => CipherResult | Promise<CipherResult>;

export interface CipherDispatcher {
  encrypt: CipherHandler;
  decrypt: CipherHandler;
}

type CipherModule = {
  encrypt?: CipherHandler;
  decrypt?: CipherHandler;
  encryptSha224?: CipherHandler;
  encryptSha384?: CipherHandler;
  encryptShake128?: CipherHandler;
  encryptShake256?: CipherHandler;
};

type ModuleLoader = () => Promise<CipherModule>;

const MODULES = import.meta.glob<CipherModule>("../cipher/{classical,symmetric,hash,asymmetric}/*.ts");

const PATH_OVERRIDES: Record<string, string> = {
  "sha224": "../cipher/hash/sha2-truncated.ts",
  "sha384": "../cipher/hash/sha2-truncated.ts",
  "shake128": "../cipher/hash/shake.ts",
  "shake256": "../cipher/hash/shake.ts",
  'ripemd256': '../cipher/hash/ripemd256-320',
  'ripemd320': '../cipher/hash/ripemd256-320',
};

const SPECIAL_DISPATCHERS: Record<string, () => Promise<CipherDispatcher>> = {
  sha224: async () => {
    const mod = await loadModule("sha224");
    return {
      encrypt: requireExport(mod, "encryptSha224", "sha224"),
      decrypt: requireExport(mod, "decrypt", "sha224"),
    };
  },
  sha384: async () => {
    const mod = await loadModule("sha384");
    return {
      encrypt: requireExport(mod, "encryptSha384", "sha384"),
      decrypt: requireExport(mod, "decrypt", "sha384"),
    };
  },
  shake128: async () => {
    const mod = await loadModule("shake128");
    return {
      encrypt: requireExport(mod, "encryptShake128", "shake128"),
      decrypt: requireExport(mod, "decrypt", "shake128"),
    };
  },
  shake256: async () => {
    const mod = await loadModule("shake256");
    return {
      encrypt: requireExport(mod, "encryptShake256", "shake256"),
      decrypt: requireExport(mod, "decrypt", "shake256"),
    };
  },
  'ripemd256': async () => {
    const m = await import('../cipher/hash/ripemd256-320');
    return {
      encrypt: m.encryptRipemd256, decrypt: m.decrypt
    }
  },
  'ripemd320': async () => {
    const m = await import('../cipher/hash/ripemd256-320');
    return {
      encrypt: m.encryptRipemd320, decrypt: m.decrypt
    }
  },
};

function getDefinition(cipherId: string) {
  return CIPHER_REGISTRY.find((definition) => definition.id === cipherId);
}

function getModulePath(cipherId: string): string | undefined {
  const definition = getDefinition(cipherId);
  if (!definition) return undefined;
  return PATH_OVERRIDES[cipherId] ?? `../cipher/${definition.category}/${cipherId}.ts`;
}

async function loadModule(cipherId: string): Promise<CipherModule> {
  const path = getModulePath(cipherId);
  const loader = path ? MODULES[path] : undefined;

  if (!loader) {
    throw new CipherError(
      "ALGORITHM_UNSUPPORTED",
      `No cipher module is registered for "${cipherId}".`,
    );
  }

  return loader();
}

function requireExport(
  module: CipherModule,
  exportName: keyof CipherModule,
  cipherId: string,
): CipherHandler {
  const handler = module[exportName];

  if (typeof handler !== "function") {
    throw new CipherError(
      "ALGORITHM_UNSUPPORTED",
      `Cipher "${cipherId}" does not expose the required ${String(exportName)} operation.`,
    );
  }

  return handler;
}

async function createDispatcher(cipherId: string): Promise<CipherDispatcher> {
  const special = SPECIAL_DISPATCHERS[cipherId];
  if (special) return special();

  const mod = await loadModule(cipherId);

  return {
    encrypt: requireExport(mod, "encrypt", cipherId),
    decrypt: requireExport(mod, "decrypt", cipherId),
  };
}

/**
 * Registry cache keeps the lookup path small while preserving lazy loading.
 * The module itself is still loaded only when a cipher is actually requested.
 */
const dispatcherCache = new Map<string, Promise<CipherDispatcher>>();

export function getDispatcher(cipherId: string): Promise<CipherDispatcher> {
  let dispatcher = dispatcherCache.get(cipherId);

  if (!dispatcher) {
    dispatcher = createDispatcher(cipherId);
    dispatcherCache.set(cipherId, dispatcher);
  }

  return dispatcher;
}

/**
 * Exposed for tests/build validation. It checks the registry without importing
 * every cipher implementation, so the normal application remains lazy.
 */
export function getDispatchableCipherIds(): string[] {
  return CIPHER_REGISTRY
    .filter((definition) => definition.id !== "bloom-filter")
    .map((definition) => definition.id);
}
