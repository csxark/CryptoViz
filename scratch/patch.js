const fs = require('fs');

const file = 'lib/workers/cipher.worker.ts';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add streamCache
content = content.replace(
    'const workerScope = self as unknown as Worker & typeof globalThis;',
    `const workerScope = self as unknown as Worker & typeof globalThis;

// State for Stream Cipher Memoization / Substring Caching
let streamCache: {
  cipherId: string;
  type: string;
  key: string;
  optionsHash: string;
  input: string;
  result: import("../cipher/types").CipherResult | null;
} = {
  cipherId: "",
  type: "",
  key: "",
  optionsHash: "",
  input: "",
  result: null
};`
);

// 2. Replace switch block
const switchStart = content.indexOf('    switch (cipherId) {');
const switchEndStr = '      const result = (await handler(input, key, options)) as CipherResult;';
const switchEnd = content.indexOf(switchEndStr) + switchEndStr.length;

if (switchStart !== -1 && switchEnd > switchStart) {
    const newLogic = `      const encryptMode = type === "encrypt";
      const safeOptions = options || {};

      // Memoization for supported stream ciphers
      const cacheableCiphers = ["caesar", "vigenere", "rot13", "atbash"];
      const optionsHash = JSON.stringify(safeOptions);

      if (cacheableCiphers.includes(cipherId)) {
        if (
          streamCache.cipherId === cipherId &&
          streamCache.type === type &&
          streamCache.key === key &&
          streamCache.optionsHash === optionsHash &&
          streamCache.result !== null
        ) {
          safeOptions.incrementalCache = {
            input: streamCache.input,
            result: streamCache.result
          };
        } else {
          streamCache = { cipherId, type, key, optionsHash, input: "", result: null };
        }
      } else {
        streamCache = { cipherId: "", type: "", key: "", optionsHash: "", input: "", result: null };
      }

      const dispatcher = await getDispatcher(cipherId);
      const handler = encryptMode ? dispatcher.encrypt : dispatcher.decrypt;
      const result = (await handler(input, key, safeOptions)) as import("../cipher/types").CipherResult;

      if (cacheableCiphers.includes(cipherId)) {
        streamCache.input = input;
        streamCache.result = result;
      }`;
      
    content = content.substring(0, switchStart) + newLogic + content.substring(switchEnd);
    fs.writeFileSync(file, content, 'utf-8');
    console.log("Successfully patched cipher.worker.ts");
} else {
    console.log("Failed to find switch block limits");
}
