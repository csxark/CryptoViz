import { describe, it, expect } from "vitest";
import {
  decodeJwt,
  createUnsignedJwt,
  describeClaims,
  getJwtExplanation,
  DecodedJwt,
  JwtHeader,
  JwtPayload,
} from "./jwtDecoder";

// ─── Test Helpers ────────────────────────────────────────────────────────────

function b64UrlEncode(obj: Record<string, unknown>): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeJwt(
  header: JwtHeader,
  payload: JwtPayload,
  sig: string = "signature123",
): string {
  return `${b64UrlEncode(header)}.${b64UrlEncode(payload)}.${sig}`;
}

const NOW = 1700000000; // Fixed time for deterministic tests

// ─── Basic Decoding ──────────────────────────────────────────────────────────

describe("JWT Decoder — basic decoding", () => {
  it("decodes a valid JWT with standard claims", () => {
    const token = makeJwt(
      { alg: "RS256", typ: "JWT" },
      {
        iss: "auth.example.com",
        sub: "user-123",
        aud: "api.example.com",
        exp: NOW + 3600,
        iat: NOW,
        jti: "token-abc",
      },
    );

    const result = decodeJwt(token, NOW);
    expect(result.validStructure).toBe(true);
    expect(result.header.alg).toBe("RS256");
    expect(result.header.typ).toBe("JWT");
    expect(result.payload.iss).toBe("auth.example.com");
    expect(result.payload.sub).toBe("user-123");
    expect(result.expired).toBe(false);
    expect(result.expiresIn).toBe(3600);
  });

  it("decodes a minimal JWT", () => {
    const token = makeJwt({ alg: "HS256" }, { sub: "123" });
    const result = decodeJwt(token, NOW);
    expect(result.validStructure).toBe(true);
    expect(result.header.alg).toBe("HS256");
    expect(result.payload.sub).toBe("123");
  });

  it("handles custom claims", () => {
    const token = makeJwt({ alg: "HS256" }, {
      sub: "123",
      custom_field: "custom_value",
      nested: { key: "value" },
    });
    const result = decodeJwt(token, NOW);
    expect(result.payload.custom_field).toBe("custom_value");
  });
});

// ─── Expiration ──────────────────────────────────────────────────────────────

describe("JWT Decoder — expiration", () => {
  it("detects expired token", () => {
    const token = makeJwt(
      { alg: "RS256" },
      { exp: NOW - 100, iat: NOW - 3700 },
    );
    const result = decodeJwt(token, NOW);
    expect(result.expired).toBe(true);
    expect(result.expiresIn).toBe(-100);
    const expFindings = result.securityFindings.filter(
      (f) => f.title.includes("expired") || f.title.includes("Expired"),
    );
    expect(expFindings.length).toBeGreaterThan(0);
  });

  it("detects token not yet valid (nbf in future)", () => {
    const token = makeJwt(
      { alg: "RS256" },
      { nbf: NOW + 3600, exp: NOW + 7200 },
    );
    const result = decodeJwt(token, NOW);
    expect(result.notYetValid).toBe(true);
  });

  it("returns undefined for missing exp", () => {
    const token = makeJwt({ alg: "HS256" }, { sub: "123" });
    const result = decodeJwt(token, NOW);
    expect(result.expired).toBeUndefined();
    expect(result.expiresIn).toBeUndefined();
  });

  it("warns when exp is missing", () => {
    const token = makeJwt({ alg: "HS256" }, { sub: "123" });
    const result = decodeJwt(token, NOW);
    const expFindings = result.securityFindings.filter(
      (f) => f.title.includes("Missing") && f.title.includes("exp"),
    );
    expect(expFindings.length).toBe(1);
  });

  it("warns about very long token lifetime", () => {
    const lifetime = 86400 * 60; // 60 days
    const token = makeJwt({ alg: "HS256" }, {
      iat: NOW,
      exp: NOW + lifetime,
    });
    const result = decodeJwt(token, NOW);
    const longFindings = result.securityFindings.filter(
      (f) => f.title.includes("long token lifetime"),
    );
    expect(longFindings.length).toBe(1);
  });
});

// ─── Algorithm Security ──────────────────────────────────────────────────────

describe("JWT Decoder — algorithm security", () => {
  it("flags alg=none as critical", () => {
    const token = makeJwt({ alg: "none" }, { sub: "123" });
    const result = decodeJwt(token, NOW);
    const algFindings = result.securityFindings.filter(
      (f) => f.category === "algorithm" && f.severity === "critical",
    );
    expect(algFindings.length).toBe(1);
    expect(result.securityRating).toBe("critical");
  });

  it("flags HS1 as critical", () => {
    const token = makeJwt({ alg: "HS1" }, { sub: "123" });
    const result = decodeJwt(token, NOW);
    const findings = result.securityFindings.filter(
      (f) => f.category === "algorithm" && f.severity === "critical",
    );
    expect(findings.length).toBe(1);
  });

  it("flags HS256 as medium risk", () => {
    const token = makeJwt({ alg: "HS256" }, { sub: "123" });
    const result = decodeJwt(token, NOW);
    const findings = result.securityFindings.filter(
      (f) => f.category === "algorithm" && f.severity === "medium",
    );
    expect(findings.length).toBe(1);
  });

  it("RS256 has no algorithm findings (safe default)", () => {
    const token = makeJwt({ alg: "RS256" }, { sub: "123" });
    const result = decodeJwt(token, NOW);
    const algFindings = result.securityFindings.filter(
      (f) => f.category === "algorithm",
    );
    expect(algFindings.length).toBe(0);
  });
});

// ─── Invalid Structure ───────────────────────────────────────────────────────

describe("JWT Decoder — invalid structure", () => {
  it("rejects token with 2 segments", () => {
    const result = decodeJwt("header.payload", NOW);
    expect(result.validStructure).toBe(false);
    expect(result.securityRating).toBe("critical");
  });

  it("rejects token with 4 segments", () => {
    const result = decodeJwt("a.b.c.d", NOW);
    expect(result.validStructure).toBe(false);
  });

  it("rejects empty token", () => {
    const result = decodeJwt("", NOW);
    expect(result.validStructure).toBe(false);
  });

  it("rejects invalid header JSON", () => {
    const badHeader = btoa("NOT_JSON{").replace(/=/g, "");
    const payload = btoa(JSON.stringify({ sub: "123" })).replace(/=/g, "");
    const result = decodeJwt(`${badHeader}.${payload}.sig`, NOW);
    expect(result.header.alg).toBe("UNKNOWN");
  });

  it("rejects invalid payload JSON", () => {
    const header = btoa(JSON.stringify({ alg: "HS256" })).replace(/=/g, "");
    const badPayload = btoa("NOT_JSON{").replace(/=/g, "");
    const result = decodeJwt(`${header}.${badPayload}.sig`, NOW);
    expect(result.validStructure).toBe(true);
    expect(Object.keys(result.payload).length).toBe(0);
  });
});

// ─── Sensitive Data Detection ────────────────────────────────────────────────

describe("JWT Decoder — sensitive data detection", () => {
  it("warns about password in payload", () => {
    const token = makeJwt({ alg: "HS256" }, {
      sub: "123",
      password: "secret123",
    });
    const result = decodeJwt(token, NOW);
    const dataFindings = result.securityFindings.filter(
      (f) => f.category === "data_exposure",
    );
    expect(dataFindings.length).toBe(1);
  });

  it("warns about api_key in payload", () => {
    const token = makeJwt({ alg: "HS256" }, {
      sub: "123",
      api_key: "sk_live_xxx",
    });
    const result = decodeJwt(token, NOW);
    const dataFindings = result.securityFindings.filter(
      (f) => f.category === "data_exposure",
    );
    expect(dataFindings.length).toBe(1);
  });

  it("no warning for safe payload fields", () => {
    const token = makeJwt({ alg: "RS256" }, {
      sub: "123",
      name: "Alice",
      role: "admin",
    });
    const result = decodeJwt(token, NOW);
    const dataFindings = result.securityFindings.filter(
      (f) => f.category === "data_exposure",
    );
    expect(dataFindings.length).toBe(0);
  });
});

// ─── Claims Inventory ────────────────────────────────────────────────────────

describe("JWT Decoder — claims inventory", () => {
  it("identifies registered and custom claims", () => {
    const token = makeJwt({ alg: "RS256" }, {
      iss: "example.com",
      sub: "123",
      exp: NOW + 3600,
      custom_claim: "value",
    });
    const result = decodeJwt(token, NOW);
    const claimsStep = result.steps.find((s) =>
      s.description.includes("registered claim"),
    );
    expect(claimsStep).toBeDefined();
    expect(claimsStep!.output).toContain("custom_claim");
  });
});

// ─── Steps Visualization ─────────────────────────────────────────────────────

describe("JWT Decoder — steps", () => {
  it("produces at least 4 steps for a valid token", () => {
    const token = makeJwt({ alg: "RS256" }, { sub: "123", exp: NOW + 3600 });
    const result = decodeJwt(token, NOW);
    expect(result.steps.length).toBeGreaterThanOrEqual(4);
    for (const step of result.steps) {
      expect(step.step).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it("first step describes the segment split", () => {
    const token = makeJwt({ alg: "HS256" }, { sub: "123" });
    const result = decodeJwt(token, NOW);
    expect(result.steps[0].description).toContain("segments");
  });
});

// ─── Security Rating ─────────────────────────────────────────────────────────

describe("JWT Decoder — security rating", () => {
  it("returns 'critical' for alg=none", () => {
    const token = makeJwt({ alg: "none" }, { sub: "123" });
    expect(decodeJwt(token, NOW).securityRating).toBe("critical");
  });

  it("returns 'high' for expired token", () => {
    const token = makeJwt({ alg: "RS256" }, { exp: NOW - 100 });
    expect(decodeJwt(token, NOW).securityRating).toBe("high");
  });

  it("returns 'safe' for well-formed RS256 token with no issues", () => {
    const token = makeJwt({ alg: "RS256" }, {
      iss: "auth.example.com",
      sub: "user-123",
      aud: "api.example.com",
      exp: NOW + 3600,
      iat: NOW,
    });
    expect(decodeJwt(token, NOW).securityRating).toBe("safe");
  });
});

// ─── createUnsignedJwt ───────────────────────────────────────────────────────

describe("createUnsignedJwt", () => {
  it("creates a decodable unsigned JWT", () => {
    const jwt = createUnsignedJwt(
      { alg: "none", typ: "JWT" },
      { sub: "123", exp: NOW + 3600 },
    );
    expect(jwt.split(".")).toHaveLength(3);
    const result = decodeJwt(jwt, NOW);
    expect(result.validStructure).toBe(true);
    expect(result.payload.sub).toBe("123");
  });
});

// ─── describeClaims ──────────────────────────────────────────────────────────

describe("describeClaims", () => {
  it("returns descriptions for all claims", () => {
    const descriptions = describeClaims({
      iss: "example.com",
      sub: "123",
      custom: "value",
    });
    expect(descriptions).toHaveLength(3);
    const iss = descriptions.find((d) => d.key === "iss");
    expect(iss!.isRegistered).toBe(true);
    expect(iss!.description).toContain("Issuer");
    const custom = descriptions.find((d) => d.key === "custom");
    expect(custom!.isRegistered).toBe(false);
  });
});

// ─── getJwtExplanation ───────────────────────────────────────────────────────

describe("getJwtExplanation", () => {
  it("returns 7 explanation steps", () => {
    const steps = getJwtExplanation();
    expect(steps.length).toBe(7);
    for (const step of steps) {
      expect(step.length).toBeGreaterThan(20);
    }
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe("JWT Decoder — edge cases", () => {
  it("handles very large exp (year 2099)", () => {
    const farFuture = 4070908800; // 2099-01-01
    const token = makeJwt({ alg: "RS256" }, { exp: farFuture, iat: NOW });
    const result = decodeJwt(token, NOW);
    expect(result.expired).toBe(false);
    expect(result.expiresIn).toBeGreaterThan(0);
  });

  it("handles single-character payload claim", () => {
    const token = makeJwt({ alg: "HS256" }, { x: "y" });
    const result = decodeJwt(token, NOW);
    expect(result.payload.x).toBe("y");
  });

  it("handles audience as array", () => {
    const token = makeJwt({ alg: "RS256" }, {
      aud: ["api1.example.com", "api2.example.com"],
    });
    const result = decodeJwt(token, NOW);
    expect(Array.isArray(result.payload.aud)).toBe(true);
  });

  it("handles empty payload", () => {
    const token = makeJwt({ alg: "HS256" }, {});
    const result = decodeJwt(token, NOW);
    expect(Object.keys(result.payload).length).toBe(0);
  });
});
