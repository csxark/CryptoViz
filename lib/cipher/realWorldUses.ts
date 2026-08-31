/**
 * Use Category cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface UseCategory {
  title: string;
  items: string[];
}

/**
 * REAL WORLD USES cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const REAL_WORLD_USES: Record<string, UseCategory[]> = {
  aes: [
    {
      title: "🌐 Web Security",
      items: ["HTTPS / TLS", "VPNs", "SSL Certificates"],
    },
    {
      title: "💬 Secure Messaging",
      items: ["WhatsApp", "Signal", "Telegram Secret Chats"],
    },
    {
      title: "💾 Disk Encryption",
      items: ["BitLocker", "FileVault", "LUKS"],
    },
    {
      title: "☁️ Cloud Services",
      items: ["AWS KMS", "Azure Key Vault", "Google Cloud KMS"],
    },
  ],

  rsa: [
    {
      title: "🔐 Public Key Infrastructure",
      items: [
        "HTTPS Certificates",
        "Digital Signatures",
        "SSH Authentication",
      ],
    },
  ],

  des: [
    {
      title: "📚 Legacy Systems",
      items: [
        "Older Banking Systems",
        "Legacy POS Devices",
        "Educational Demonstrations",
      ],
    },
  ],

  "3des": [
    {
      title: "🏦 Banking",
      items: [
        "EMV Smart Cards",
        "Payment Terminals",
        "ATM Networks",
      ],
    },
  ],

  sha256: [
    {
      title: "🔒 Data Integrity & Systems",
      items: [
        "Git Commit Hashes",
        "Package Verification",
        "Certificate Fingerprints",
        "Password Hashing",
      ],
    },
  ],

  md5: [
    {
      title: "⚠ Legacy Usage",
      items: [
        "File Checksums",
        "Old Software Verification",
      ],
    },
  ],
};