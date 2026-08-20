import { ICipherPlugin, KnownAnswerTestVector, CipherInput, CipherOutput } from "@/types/cipherPlugin";
import { CIPHER_REGISTRY, CipherDefinition } from "@/lib/cipher/registry";
import { PUBLISHED_CIPHER_VECTORS, PublishedCipherVector } from "@/lib/cipher/symmetric/publishedCipherVectors";

export class CipherPluginRegistry {
  private static instance: CipherPluginRegistry;
  private plugins: Map<string, ICipherPlugin> = new Map();

  private constructor() {
    this.autoRegisterFromDefinitions();
  }

  public static getInstance(): CipherPluginRegistry {
    if (!CipherPluginRegistry.instance) {
      CipherPluginRegistry.instance = new CipherPluginRegistry();
    }
    return CipherPluginRegistry.instance;
  }

  public registerPlugin(plugin: ICipherPlugin): void {
    this.plugins.set(plugin.id.toLowerCase(), plugin);
  }

  public getPlugin(id: string): ICipherPlugin | undefined {
    return this.plugins.get(id.toLowerCase());
  }

  public getAllPlugins(): ICipherPlugin[] {
    return Array.from(this.plugins.values());
  }

  public clear(): void {
    this.plugins.clear();
  }

  private autoRegisterFromDefinitions(): void {
    CIPHER_REGISTRY.forEach((def: CipherDefinition) => {
      const plugin = this.createDefaultPluginFromDefinition(def);
      this.registerPlugin(plugin);
    });
  }

  private createDefaultPluginFromDefinition(def: CipherDefinition): ICipherPlugin {
    const isSymmetric = def.category === "symmetric";
    const isClassical = def.category === "classical";
    const isHash = def.category === "hash";
    const isAEAD = def.id.includes("poly1305") || def.id.includes("gcm") || def.id.includes("ccm") || def.id === "ascon";

    const vectorsForCipher: KnownAnswerTestVector[] = PUBLISHED_CIPHER_VECTORS
      .filter((v: PublishedCipherVector) => v.cipher.toLowerCase() === def.id.toLowerCase() || def.name.toUpperCase().includes(v.cipher.toUpperCase()))
      .map((v: PublishedCipherVector) => ({
        id: `${def.id}-${v.variant.replace(/\s+/g, "-").toLowerCase()}`,
        name: v.variant,
        variant: v.variant,
        source: v.source,
        keyHex: v.keyHex,
        plaintextHex: v.plaintextHex,
        ciphertextHex: v.ciphertextHex,
        notes: v.notes,
      }));

    return {
      id: def.id,
      name: def.name,
      category: def.category as 'classical' | 'symmetric' | 'asymmetric' | 'hash' | 'pqc',
      capabilities: {
        supportsEncryption: !isHash,
        supportsDecryption: !isHash,
        supportsAEAD: isAEAD,
        supportsStepTrace: true,
        validKeyLengths: isSymmetric ? [128, 192, 256] : [0],
        validIvLengths: isAEAD ? [96, 128] : [],
      },
      async execute(input: CipherInput): Promise<CipherOutput> {
        const startTime = performance.now();
        const ciphertext = input.text.split('').reverse().join('');
        const endTime = performance.now();

        return {
          ciphertext,
          plaintext: input.text,
          executionTimeMs: Number((endTime - startTime).toFixed(3)),
        };
      },
      getTestVectors(): KnownAnswerTestVector[] {
        return vectorsForCipher;
      },
    };
  }
}

export const pluginRegistry = CipherPluginRegistry.getInstance();