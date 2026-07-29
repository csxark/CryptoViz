import React from 'react';
import { AlgorithmFamily, KeySizeOption, getNistStatus } from '../../lib/utils/keyEquivalence';
import { BookOpen, Shield, AlertTriangle, Info } from 'lucide-react';

interface EducationalContextProps {
  family: AlgorithmFamily;
  option: KeySizeOption;
}

export default function EducationalContext({ family, option }: EducationalContextProps) {
  const nistStatus = getNistStatus(option.securityBits);

  return (
    <div className="space-y-6">
      {/* Context Card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16161A] p-6 shadow-sm">
        <h3 className="flex items-center text-lg font-bold text-zinc-900 dark:text-zinc-100">
          <BookOpen className="mr-2 h-5 w-5 text-[#00C2AE]" />
          Understanding {family} Key Sizes
        </h3>
        
        <div className="mt-4 space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {family === 'Symmetric' && (
            <p>
              Symmetric algorithms (like AES) use the same key for encryption and decryption. 
              Their security roughly equals their key size. A 128-bit symmetric key has 
              2<sup>128</sup> possible combinations.
            </p>
          )}
          {family === 'RSA' && (
            <p>
              RSA security relies on the mathematical difficulty of factoring large composite numbers. 
              Because algorithms like the General Number Field Sieve (GNFS) can factor numbers faster 
              than brute-force, RSA requires much larger keys (e.g., 3072 bits) to provide the same 
              security as a 128-bit symmetric key.
            </p>
          )}
          {family === 'ECC' && (
            <p>
              Elliptic Curve Cryptography (ECC) relies on the discrete logarithm problem over elliptic curves. 
              There are currently no sub-exponential algorithms to solve it, allowing ECC to provide 
              high security with much shorter keys than RSA (e.g., 256-bit ECC ≈ 3072-bit RSA).
            </p>
          )}
        </div>
      </div>

      {/* Security Status Card */}
      <div className={`rounded-xl border p-6 shadow-sm transition-colors duration-300 ${
        option.securityBits < 112 
          ? 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20' 
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16161A]'
      }`}>
        <h3 className="flex items-center text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          <Shield className="mr-2 h-5 w-5 text-[#00C2AE]" />
          NIST Assessment
        </h3>
        
        <div className="flex items-start space-x-3">
          {option.securityBits < 112 ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          ) : (
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-teal-600 dark:text-teal-400" />
          )}
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              Classification:{' '}
              <span className={nistStatus.color}>{nistStatus.label}</span>
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {option.description}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">
            Reference: NIST Special Publication 800-57 Part 1 Revision 5.
            These are theoretical equivalence mappings and do not represent exact timelines.
          </p>
        </div>
      </div>
    </div>
  );
}
