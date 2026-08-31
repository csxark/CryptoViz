import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "lib", "cipher");

function walk(dir: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(file));
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) result.push(file);
  }
  return result;
}

function exportedDeclarations(source: string): Array<{ line: number; name: string }> {
  const result: Array<{ line: number; name: string }> = [];
  const lines = source.split(/\r?\n/);
  const pattern =
    /\bexport\s+(?:(?:async)\s+)?(?:function|class|const|let|var|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/;

  lines.forEach((line, index) => {
    const match = line.match(pattern);
    if (match) result.push({ line: index, name: match[1] });
  });
  return result;
}

function precedingJSDoc(lines: string[], line: number): string {
  let cursor = line - 1;
  while (cursor >= 0 && lines[cursor].trim() === "") cursor -= 1;
  if (cursor < 0 || !lines[cursor].includes("*/")) return "";

  const end = cursor;
  while (cursor >= 0 && !lines[cursor].includes("/**")) cursor -= 1;
  return cursor >= 0 ? lines.slice(cursor, end + 1).join("\n") : "";
}

describe("cipher JSDoc coverage", () => {
  it("covers every public export with a JSDoc block", () => {
    const failures: string[] = [];

    for (const file of walk(ROOT)) {
      const source = fs.readFileSync(file, "utf8");
      const lines = source.split(/\r?\n/);

      for (const declaration of exportedDeclarations(source)) {
        const block = precedingJSDoc(lines, declaration.line);
        if (!block) {
          failures.push(`${path.relative(process.cwd(), file)}:${declaration.line + 1} ${declaration.name}`);
        }
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("requires standard or primary references in exported API documentation", () => {
    const failures: string[] = [];

    for (const file of walk(ROOT)) {
      const source = fs.readFileSync(file, "utf8");
      const lines = source.split(/\r?\n/);

      for (const declaration of exportedDeclarations(source)) {
        const block = precedingJSDoc(lines, declaration.line);
        if (block && !/@see\s+https?:\/\//.test(block)) {
          failures.push(`${path.relative(process.cwd(), file)}:${declaration.line + 1} ${declaration.name}`);
        }
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("documents parameters for exported functions that declare parameters inline", () => {
    const failures: string[] = [];

    for (const file of walk(ROOT)) {
      const source = fs.readFileSync(file, "utf8");
      const lines = source.split(/\r?\n/);

      for (const declaration of exportedDeclarations(source)) {
        const line = lines[declaration.line];
        if (!/\bexport\s+(?:async\s+)?function\b/.test(line)) continue;

        const signature = line.slice(line.indexOf(declaration.name));
        const open = signature.indexOf("(");
        const close = signature.indexOf(")");
        if (open < 0 || close < 0 || close <= open) continue;

        const parameters = signature
          .slice(open + 1, close)
          .split(",")
          .map((value) => value.trim().split(":")[0].replace(/^\.\.\./, ""))
          .filter(Boolean);

        const block = precedingJSDoc(lines, declaration.line);
        for (const parameter of parameters) {
          if (!block.includes(`@param ${parameter}`)) {
            failures.push(
              `${path.relative(process.cwd(), file)}:${declaration.line + 1} ${declaration.name}: ${parameter}`,
            );
          }
        }
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
