import { describe, expect, it } from "vitest";
import { sanitizePlainText, sanitizeMarkdown, sanitizeSearchQuery, escapeHtml } from "../../lib/security/inputSanitization";

const vectors = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert(1)>',
  '<svg/onload=alert(1)>',
  '<body onload=alert(1)>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<a href="javascript:alert(1)">click</a>',
  '<object data="javascript:alert(1)">',
  '<embed src="javascript:alert(1)">',
  '<script src=//evil.example/x.js></script>',
  'javascript:alert(1)',
  '"><script>alert(document.domain)</script>',
  '<div style="background:url(javascript:alert(1))">x</div>',
];

describe("security: sanitization", () => {
  it.each(vectors)("neutralizes XSS vector: %s", (payload) => {
    const r = sanitizePlainText(payload);
    expect(r.value).not.toMatch(/<script|<img|<svg|onerror=|onload=|javascript:/i);
  });
  
  it("escapes HTML metacharacters", () => {
    expect(escapeHtml(`<>&"'\``)).toBe("&lt;&gt;&amp;&quot;&#39;&#96;");
  });
  
  it("removes control characters", () => {
    expect(sanitizePlainText("safe\r\n\tvalue\u0007").value).toBe("safe value");
  });
  
  it("preserves markdown newlines while neutralizing dangerous links", () => {
    const r = sanitizeMarkdown("[x](javascript:alert(1))\n\ntext");
    expect(r.value).not.toMatch(/javascript:/i);
    expect(r.value).toContain("\n\n");
  });
  
  it("strips angle brackets from search queries", () => {
    expect(sanitizeSearchQuery("<script>alert(1)</script>").value).not.toMatch(/[<>]/);
  });
});
