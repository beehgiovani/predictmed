import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.ts";
import { getDb, getClient } from "./db.ts";
import { products, salesHistory } from "../drizzle/schema.ts";
import { sql } from "drizzle-orm";
import { supabase } from "./lib/supabase.ts";
import { parseCotacContent, parseSalesContent } from "./lib/parsers.ts";
import { imageService } from "./lib/imageService.ts";

export const dataRouter = router({
  // Isso aqui é só pra ajustar o banco de dados se eu mudar alguma tabela
  runMigrations: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Ih, o banco não conectou!");

    const steps = [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "ean" VARCHAR(64)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "isHighTurnover" BOOLEAN DEFAULT FALSE NOT NULL`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "isDiscontinued" BOOLEAN DEFAULT FALSE NOT NULL`,
      `DROP TABLE IF EXISTS order_items CASCADE`,
      `DROP TABLE IF EXISTS orders CASCADE`,
      `CREATE TABLE IF NOT EXISTS quote_sessions (
        id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL,
        "startDate" DATE NOT NULL, "endDate" DATE NOT NULL,
        "targetDays" INTEGER NOT NULL,
        status VARCHAR(64) DEFAULT 'revisao' NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS quote_items (
        id SERIAL PRIMARY KEY,
        "quoteSessionId" INTEGER NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
        "productCode" VARCHAR(64) NOT NULL,
        "salesInPeriod" INTEGER DEFAULT 0,
        "priceAtTime" NUMERIC(10, 2),
        "suggestedQuantity" INTEGER NOT NULL,
        "userConfirmedQuantity" INTEGER,
        "arrivedQuantity" INTEGER,
        "isMissing" BOOLEAN DEFAULT FALSE
      )`,
      `ALTER TABLE products DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE quote_sessions DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE quote_items DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE sales_history DISABLE ROW LEVEL SECURITY`,
      // TABELAS PRA IA E PRA REGISTRAR FALTA DE PRODUTO NO BALCÃO
      `CREATE TABLE IF NOT EXISTS "manual_ruptures" (
        "id" SERIAL PRIMARY KEY,
        "productcode" VARCHAR(64) NOT NULL,
        "ean" VARCHAR(64),
        "askedcount" INTEGER DEFAULT 1 NOT NULL,
        "lastaskedat" TIMESTAMP DEFAULT NOW() NOT NULL,
        "status" VARCHAR(32) DEFAULT 'pending' NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "product_adjustments" (
        "id" SERIAL PRIMARY KEY,
        "productcode" VARCHAR(64) NOT NULL UNIQUE,
        "avg_adjustment" NUMERIC(5, 2) DEFAULT '1.00',
        "last_user_qty" INTEGER,
        "total_overrides" INTEGER DEFAULT 0,
        "updatedat" TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `ALTER TABLE manual_ruptures DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE product_adjustments DISABLE ROW LEVEL SECURITY`,
    ];

    const results: string[] = [];
    for (const step of steps) {
      try {
        await db.execute(sql.raw(step));
        results.push(`✅ OK: ${step.substring(0, 50)}`);
      } catch (e: any) {
        results.push(`⚠️ Pulei: ${e.message.substring(0, 50)}`);
      }
    }
    return { success: true, results };
  }),

  // Verifica se as colunas da tabela de produtos estão certas
  checkColumns: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Sem conexão com o banco");
    const result = await db.execute(sql.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `));
    return Array.from(result);
  }),

  // Processa o arquivo COTAC pra atualizar o cadastro de produtos
  uploadCotac: publicProcedure
    .input(z.object({ fileContent: z.string() }))
    .mutation(async ({ input }) => {
      const rows = parseCotacContent(input.fileContent);
      let imported = 0;
      const productsMap = new Map();

      for (const row of rows) {
        // Blindagem: Ignora se não tiver código ou nome (causa erro no banco)
        if (!row.code || !row.name) continue;
        
        productsMap.set(row.code, {
          code: row.code,
          ean: row.ean,
          name: row.name,
          price: "0.00", 
          manufacturer: "",
          iscontrolled: false,
          isperfumery: row.isperfumery
        });
        imported++;
      }

      if (productsMap.size > 0) {
        const productsToUpsert = Array.from(productsMap.values());
        const chunkSize = 500;
        for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
          const chunk = productsToUpsert.slice(i, i + chunkSize);
          await supabase.from('products').upsert(chunk, { onConflict: 'code' });
        }
      }

      return { success: true, message: `${imported} produtos processados.`, productsProcessed: imported };
    }),

  // Sobe o arquivo de vendas pra IA aprender o giro da farmácia
  uploadSales: publicProcedure
    .input(z.object({ fileContent: z.string(), startDate: z.string(), endDate: z.string() }))
    .mutation(async ({ input }) => {
      const rows = parseSalesContent(input.fileContent);
      let imported = 0;
      const productsMap = new Map();
      const rowsToInsert: any[] = [];
      
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      for (const row of rows) {
        // Blindagem total: Filtra linhas sem dados críticos
        if (!row.code || !row.name || !row.quantity) continue;

        // Guarda o produto para o upsert (usando Map para garantir unicidade no lote)
        if (!productsMap.has(row.code)) {
          productsMap.set(row.code, {
            code: row.code,
            ean: row.ean,
            name: row.name,
            manufacturer: row.manufacturer,
            price: row.price || 0,
          });
        }

        // Prepara o registro histórico
        rowsToInsert.push({
          productcode: row.code,
          quantity: row.quantity,
          startdate: start.toISOString(),
          enddate: end.toISOString(),
          source: 'cotac'
        });
        imported++;
      }

      // 1. Primeiro salva/atualiza os produtos (para não dar erro de chave estrangeira)
      if (productsMap.size > 0) {
        const productsList = Array.from(productsMap.values());
        const chunkSize = 500;
        for (let i = 0; i < productsList.length; i += chunkSize) {
          const chunk = productsList.slice(i, i + chunkSize);
          const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'code' });
          if (error) console.error(`[Upload] Erro no lote de produtos: ${error.message}`);
        }
      }

      // 2. Agora salva o histórico de vendas
      if (rowsToInsert.length > 0) {
        const chunkSize = 1000;
        for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
          const chunk = rowsToInsert.slice(i, i + chunkSize);
          const { error } = await supabase.from('sales_history').insert(chunk);
          if (error) console.error(`[Upload] Erro no lote de vendas: ${error.message}`);
        }
      }

      return { success: true, message: `${imported} registros de venda salvos!`, recordsProcessed: imported };
    }),

  // Limpa os dados de teste pra deixar o sistema pronto pro dia a dia da farmácia
  resetForProduction: publicProcedure.mutation(async () => {
     const db = await getDb();
     if (!db) throw new Error("Offline!");

     // Limpeza Geral: AGORA LIMPANDO TUDO PARA COMEÇAR DO ZERO ABSOLUTO
     await db.execute(sql`TRUNCATE TABLE quote_items CASCADE`);
     await db.execute(sql`TRUNCATE TABLE quote_sessions CASCADE`);
     await db.execute(sql`TRUNCATE TABLE sales_history CASCADE`);
     await db.execute(sql`TRUNCATE TABLE manual_ruptures CASCADE`);
     await db.execute(sql`TRUNCATE TABLE product_adjustments CASCADE`);
     await db.execute(sql`TRUNCATE TABLE products CASCADE`); // <--- LIMPANDO PRODUTOS TAMBÉM

     return { success: true, message: "Sistema limpo! Tudo zerado para sua carga oficial." };
  }),
});
