import { describe, expect, it } from "vitest";
import * as threeWay from "@/lib/cipher/symmetric/3way";
import * as aria from "@/lib/cipher/symmetric/aria";
import * as kasumi from "@/lib/cipher/symmetric/kasumi";
import * as kuznyechik from "@/lib/cipher/symmetric/kuznyechik";
import * as hierocrypt3 from "@/lib/cipher/symmetric/hierocrypt3";
import * as shark from "@/lib/cipher/symmetric/shark";
import * as skipjack from "@/lib/cipher/symmetric/skipjack";
import * as rc6 from "@/lib/cipher/symmetric/rc6";
import * as wake from "@/lib/cipher/symmetric/wake";
import * as cast128 from "@/lib/cipher/symmetric/cast128";
import * as misty1 from "@/lib/cipher/symmetric/misty1";
import * as prince from "@/lib/cipher/symmetric/prince";
import * as feal from "@/lib/cipher/symmetric/feal";
import * as clefia from "@/lib/cipher/symmetric/clefia";
type CipherModule = { encrypt: Function; decrypt: Function; TEST_VECTORS?: any[] };
type Case = { name:string; module:CipherModule; blockBytes:number; keyBytes:number; input:string; key:string };
const cases: Case[] = [
  { name: "3-Way", module: threeWay, blockBytes: 12, keyBytes: 12, input: "000000000000000000000000", key: "000000000000000000000000" },
  { name: "ARIA", module: aria, blockBytes: 16, keyBytes: 16, input: "00112233445566778899aabbccddeeff", key: "000102030405060708090a0b0c0d0e0f" },
  { name: "KASUMI", module: kasumi, blockBytes: 8, keyBytes: 16, input: "fedcba0987654321", key: "9900aabbccddeeff1122334455667788" },
  { name: "Kuznyechik", module: kuznyechik, blockBytes: 16, keyBytes: 32, input: "1122334455667700ffeeddccbbaa9988", key: "8899aabbccddeeff0011223344556677fedcba98765432100123456789abcdef" },
  { name: "Hierocrypt-3", module: hierocrypt3, blockBytes: 16, keyBytes: 16, input: "00112233445566778899aabbccddeeff", key: "11223344556677889900aabbccddeeff" },
  { name: "SHARK", module: shark, blockBytes: 8, keyBytes: 16, input: "0011223344556677", key: "11223344556677889900aabbccddeeff" },
  { name: "Skipjack", module: skipjack, blockBytes: 8, keyBytes: 10, input: "0123456789abcdef", key: "00998877665544332211" },
  { name: "RC6", module: rc6, blockBytes: 16, keyBytes: 16, input: "00000000000000000000000000000000", key: "00000000000000000000000000000000" },
  { name: "WAKE", module: wake, blockBytes: 10, keyBytes: 16, input: "48656c6c6f576f726c64", key: "11223344556677889900aabbccddeeff" },
  { name: "CAST-128", module: cast128, blockBytes: 8, keyBytes: 16, input: "0123456789abcdef", key: "0123456789abcdef0123456789abcdef" },
  { name: "MISTY1", module: misty1, blockBytes: 8, keyBytes: 16, input: "0123456789abcdef", key: "00112233445566778899aabbccddeeff" },
  { name: "PRINCE", module: prince, blockBytes: 8, keyBytes: 16, input: "0123456789abcdef", key: "00112233445566778899aabbccddeeff" },
  { name: "FEAL-8", module: feal, blockBytes: 8, keyBytes: 8, input: "0000000000000000", key: "0000000000000000" },
  { name: "CLEFIA", module: clefia, blockBytes: 16, keyBytes: 16, input: "000102030405060708090a0b0c0d0e0f", key: "ffeeddccbbaa99887766554433221100" },
];
function hexByteLength(value:string):number { return value.length / 2; }
function isHex(value:string):boolean { return /^[0-9a-f]+$/i.test(value) && value.length % 2 === 0; }
function repeatHex(byte:number,length:number):string { return byte.toString(16).padStart(2,"0").repeat(length); }
function mutateNibble(value:string):string { const c=value.toLowerCase().split(""); c[0]=c[0]==="0"?"1":"0"; return c.join(""); }
function shape(name:string,output:string,bytes:number):void { expect(output,`${name}: hex`).toMatch(/^[0-9a-f]+$/i); expect(hexByteLength(output)).toBe(bytes); }
function roundTrip(c:Case,input=c.input,key=c.key):void { const enc=c.module.encrypt(input,key); shape(c.name,enc.output,hexByteLength(input)); const dec=c.module.decrypt(enc.output,key); expect(dec.output).toBe(input); }
function deterministic(c:Case):void { expect(c.module.encrypt(c.input,c.key).output).toBe(c.module.encrypt(c.input,c.key).output); }
describe("3-Way",()=>{
  const c=cases.find(x=>x.name==="3-Way")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("ARIA",()=>{
  const c=cases.find(x=>x.name==="ARIA")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("KASUMI",()=>{
  const c=cases.find(x=>x.name==="KASUMI")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("Kuznyechik",()=>{
  const c=cases.find(x=>x.name==="Kuznyechik")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("Hierocrypt-3",()=>{
  const c=cases.find(x=>x.name==="Hierocrypt-3")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("SHARK",()=>{
  const c=cases.find(x=>x.name==="SHARK")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("Skipjack",()=>{
  const c=cases.find(x=>x.name==="Skipjack")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("RC6",()=>{
  const c=cases.find(x=>x.name==="RC6")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("WAKE",()=>{
  const c=cases.find(x=>x.name==="WAKE")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("CAST-128",()=>{
  const c=cases.find(x=>x.name==="CAST-128")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("MISTY1",()=>{
  const c=cases.find(x=>x.name==="MISTY1")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("PRINCE",()=>{
  const c=cases.find(x=>x.name==="PRINCE")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("FEAL-8",()=>{
  const c=cases.find(x=>x.name==="FEAL-8")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("CLEFIA",()=>{
  const c=cases.find(x=>x.name==="CLEFIA")!;
  it("has valid conformance inputs",()=>{ expect(isHex(c.input)).toBe(true); expect(isHex(c.key)).toBe(true); expect(hexByteLength(c.input)).toBe(c.blockBytes); expect(hexByteLength(c.key)).toBe(c.keyBytes); });
  it("is deterministic",()=>deterministic(c));
  it("preserves block size",()=>shape(c.name,c.module.encrypt(c.input,c.key).output,c.blockBytes));
  it("round-trips the primary sample",()=>roundTrip(c));
  it("round-trips zero data",()=>roundTrip(c,repeatHex(0,c.blockBytes)));
  it("round-trips one data",()=>roundTrip(c,repeatHex(0xff,c.blockBytes)));
  it("round-trips alternating data",()=>roundTrip(c,repeatHex(0xa5,c.blockBytes)));
  it("changes for a plaintext bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(mutateNibble(c.input),c.key).output; expect(b).not.toBe(a);});
  it("changes for a key bit flip",{timeout:10000},()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,mutateNibble(c.key)).output; expect(b).not.toBe(a);});
  it("exposes metadata",()=>{const r=c.module.encrypt(c.input,c.key); expect(r.metadata).toBeDefined(); expect(r.metadata.name).toBeTruthy();});
  it("supports instrumentation without changing output",()=>{const a=c.module.encrypt(c.input,c.key).output; const b=c.module.encrypt(c.input,c.key,{instrument:true}).output; expect(b).toBe(a);});
  it("rejects malformed input",()=>expect(()=>c.module.encrypt("zz",c.key)).toThrow());
  it("rejects malformed key",()=>expect(()=>c.module.encrypt(c.input,"zz")).toThrow());
  it("keeps encryption and decryption symmetric",()=>{const e=c.module.encrypt(c.input,c.key); const d=c.module.decrypt(e.output,c.key); expect(typeof e.output).toBe("string"); expect(typeof d.output).toBe("string"); expect(d.output).toBe(c.input);});
  it("round-trips a second nontrivial sample",()=>roundTrip(c,c.input.split("").reverse().join(""),c.key));
  it("handles uppercase hex",()=>{const r=c.module.encrypt(c.input.toUpperCase(),c.key.toUpperCase()); shape(c.name,r.output,c.blockBytes);});
  it("does not mutate input strings",()=>{const input=c.input,key=c.key;c.module.encrypt(input,key);expect(input).toBe(c.input);expect(key).toBe(c.key);});
});
describe("Issue #1461 vector registry",()=>{
  for(const c of cases){
    it(`${c.name} exposes vector metadata`,()=>{
      const vectors=c.module.TEST_VECTORS;
      expect(Array.isArray(vectors)).toBe(true);
      expect(vectors!.length).toBeGreaterThan(0);
      for(const vector of vectors!){
        expect(typeof vector.input).toBe("string");
        expect(typeof vector.key).toBe("string");
        expect(typeof vector.expected).toBe("string");
        expect(vector.description).toBeTruthy();
      }
    });
  }
});
describe("Issue #1461 differential regression matrix",()=>{
  describe("3-Way",()=>{
    const c=cases.find(x=>x.name==="3-Way")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("ARIA",()=>{
    const c=cases.find(x=>x.name==="ARIA")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("KASUMI",()=>{
    const c=cases.find(x=>x.name==="KASUMI")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("Kuznyechik",()=>{
    const c=cases.find(x=>x.name==="Kuznyechik")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("Hierocrypt-3",()=>{
    const c=cases.find(x=>x.name==="Hierocrypt-3")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("SHARK",()=>{
    const c=cases.find(x=>x.name==="SHARK")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("Skipjack",()=>{
    const c=cases.find(x=>x.name==="Skipjack")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("RC6",()=>{
    const c=cases.find(x=>x.name==="RC6")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("WAKE",()=>{
    const c=cases.find(x=>x.name==="WAKE")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("CAST-128",()=>{
    const c=cases.find(x=>x.name==="CAST-128")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("MISTY1",()=>{
    const c=cases.find(x=>x.name==="MISTY1")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("PRINCE",()=>{
    const c=cases.find(x=>x.name==="PRINCE")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("FEAL-8",()=>{
    const c=cases.find(x=>x.name==="FEAL-8")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
  describe("CLEFIA",()=>{
    const c=cases.find(x=>x.name==="CLEFIA")!;
    it("round-trips deterministic pattern 1",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*3+0)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 2",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*4+1)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 3",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*5+2)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 4",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*6+3)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 5",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*7+4)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 6",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*8+5)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 7",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*9+6)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 8",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*10+7)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 9",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*11+8)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
    it("round-trips deterministic pattern 10",()=>{
      const sample=Array.from({length:c.blockBytes},(_,i)=>(i*12+9)&255).map(v=>v.toString(16).padStart(2,"0")).join("");
      const encrypted=c.module.encrypt(sample,c.key);
      const decrypted=c.module.decrypt(encrypted.output,c.key);
      expect(decrypted.output).toBe(sample);
    });
  });
});
