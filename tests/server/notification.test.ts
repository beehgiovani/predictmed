import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyOwner } from "../../server/_core/notification";
import { TRPCError } from "@trpc/server";

// Mock the environment
vi.mock("../../server/_core/env", () => ({
  ENV: {
    forgeApiKey: "mock-api-key",
    forgeApiUrl: "https://mock-api.com"
  }
}));

// Mock global fetch
global.fetch = vi.fn() as any;

describe("Server Notification: notifyOwner", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should validate and send a proper notification", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    const result = await notifyOwner({
      title: "Alerta de Estoque",
      content: "O produto X está acabando."
    });

    expect(result).toBe(true);
    
    // Check if fetch was called with correct structure
    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);
    
    expect(payload.title).toBe("Alerta de Estoque");
    expect(callArgs[1].headers.authorization).toBe("Bearer mock-api-key");
  });

  it("should throw BAD_REQUEST if title is missing", async () => {
    await expect(notifyOwner({ title: "", content: "qualquer coisa" }))
      .rejects.toThrow("Notification title is required.");
  });

  it("should throw BAD_REQUEST if title is too long", async () => {
    const longTitle = "a".repeat(1201);
    await expect(notifyOwner({ title: longTitle, content: "ok" }))
      .rejects.toThrow("Notification title must be at most 1200 characters.");
  });

  it("should return false if the upstream service fails", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Error"
    });

    const result = await notifyOwner({ title: "Teste", content: "Erro" });
    expect(result).toBe(false);
  });
});
