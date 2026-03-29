import { describe, it, expect } from "vitest";
import { cn } from "../../client/src/lib/utils";

describe("Frontend Utils: cn", () => {
  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2", "py-2")).toBe("px-2 py-2");
  });

  it("should handle conditional classes", () => {
    expect(cn("px-2", true && "py-2", false && "mt-1")).toBe("px-2 py-2");
  });

  it("should resolve tailwind conflicts", () => {
    // tailwind-merge should prefer the last class
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("should handle undefined and null", () => {
    expect(cn("px-2", undefined, null)).toBe("px-2");
  });
});
