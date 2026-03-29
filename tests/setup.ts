import { vi } from "vitest";

// Mock global do Supabase para evitar erros de inicialização sem chaves
vi.mock("../server/lib/supabase", () => ({
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

// Mock do Banco de Dados para evitar conexões reais
vi.mock("../server/db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    execute: vi.fn(() => Promise.resolve([]))
  })),
  getClient: vi.fn(() => Promise.resolve({}))
}));
