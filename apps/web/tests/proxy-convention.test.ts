import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Next.js proxy convention", () => {
  it("uses proxy.ts instead of deprecated middleware.ts", () => {
    const proxyPath = resolve(__dirname, "../proxy.ts");
    const source = readFileSync(proxyPath, "utf8");
    expect(source).toMatch(/export async function proxy\(/);
    expect(source).not.toMatch(/export async function middleware\(/);
  });
});
