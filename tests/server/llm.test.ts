import { describe, it, expect, vi, beforeEach } from "vitest";
import { invokeLLM } from "../../server/_core/llm";

// Mock the environment - using the exact relative path from where llm.ts is
vi.mock("../../server/_core/env", () => ({
  ENV: {
    forgeApiKey: "mock-api-key",
    forgeApiUrl: "https://mock-api.com"
  }
}));

// Mock supabase to prevent initialization errors
vi.mock("../../server/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({
        is: vi.fn(() => ({
          not: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  }
}));

// Mock global fetch
global.fetch = vi.fn() as any;

describe("Server LLM: invokeLLM", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should format messages correctly for the LLM", async () => {
    const mockResponse = {
      id: "chat-123",
      created: 123456,
      model: "gemini-3-flash-preview",
      choices: [{
        index: 0,
        message: { role: "assistant", content: "AI Respondeu!" },
        finish_reason: "stop"
      }]
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await invokeLLM({
      messages: [{ role: "user", content: "Olá IA" }]
    });

    expect(result.choices[0].message.content).toBe("AI Respondeu!");
    
    // Check if fetch was called with correct structure
    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);
    
    expect(payload.model).toBe("gemini-3-flash-preview");
    expect(payload.messages[0]).toEqual({ role: "user", content: "Olá IA" });
  });

  it("should throw error if the API returns not ok", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Invalid Key"
    });

    await expect(invokeLLM({ messages: [] })).rejects.toThrow("LLM invoke failed: 401 Unauthorized – Invalid Key");
  });
});
