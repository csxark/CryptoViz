import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function csp() {
  const config=JSON.parse(readFileSync(resolve(process.cwd(),"vercel.json"),"utf8"));
  const headers=config.headers.flatMap((x:{headers:{key:string,value:string}[]})=>x.headers);
  const h=headers.find((x:{key:string})=>x.key.toLowerCase()==="content-security-policy");
  if(!h) throw new Error("CSP header missing");
  return h.value as string;
}
function d(value:string,name:string) {
  const found=value.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+" "));
  if(!found) throw new Error(`Missing ${name}`);
  return found;
}

describe("security: CSP",()=>{
  it("has deny-by-default policy",()=>expect(d(csp(),"default-src")).toBe("default-src 'self'"));
  it("blocks inline and eval scripts",()=>{
    const v=csp();
    expect(d(v,"script-src")).not.toContain("'unsafe-inline'");
    expect(d(v,"script-src-elem")).not.toContain("'unsafe-inline'");
    expect(v).not.toContain("'unsafe-eval'");
    expect(d(v,"script-src")).toBe("script-src 'self'");
    expect(d(v,"script-src-elem")).toBe("script-src-elem 'self'");
  });
  it("blocks object embedding and framing",()=>{
    const v=csp();
    expect(d(v,"object-src")).toBe("object-src 'none'");
    expect(d(v,"frame-ancestors")).toBe("frame-ancestors 'none'");
  });
  it("restricts workers",()=>expect(d(csp(),"worker-src")).toBe("worker-src 'self' blob:"));
  it("has no wildcard script/connect grant",()=>{
    expect(csp()).not.toMatch(/script-src[^;]*\*/);
    expect(csp()).not.toMatch(/connect-src[^;]*\*/);
  });
});