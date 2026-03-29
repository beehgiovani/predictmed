import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb, getClient } from "./db";
import { products, salesHistory } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { supabase } from "./lib/supabase";

// Helper para busca automática de imagens via API externa (EAN)
async function fetchProductImage(ean: string | null): Promise<string | null> {
  if (!ean || !ean.length || ean.length < 8) return null;
  try {
    const response = await fetch(`https://api-produtos.seunegocionanuvem.com.br/api/${ean}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.image || data.thumbnail || null;
  } catch (e) {
    console.warn(`[ImageSync] Falha ao buscar imagem para EAN ${ean}`);
    return null;
  }
}

export const dataRouter = router({
  // ✅ Endpoint Temporário de Migração
  runMigrations: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco não conectado");

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
      // ✅ NOVAS TABELAS PARA IA E RUPTURA MANUAL
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
        results.push(`⚠️ SKIP: ${e.message.substring(0, 50)}`);
      }
    }
    return { success: true, results };
  }),

  checkColumns: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection not available");
    const result = await db.execute(sql.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `));
    return Array.from(result);
  }),

  uploadCotac: publicProcedure
    .input(z.object({ fileContent: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection not available");

      const lines = input.fileContent.split('\n').map(l => l.trim()).filter(Boolean);
      let imported = 0;
      const rowsToInsert: any[] = [];
      const seenCodes = new Set<string>();

      for (const line of lines) {
        const fields = line.split(';');
        if (fields.length >= 5) {
          const ean = fields[1]?.trim();
          const code = fields[3]?.trim();
          const name = fields[4]?.trim();

          if (!code || !name || seenCodes.has(code)) continue;
          if (name.includes('**')) continue;
          
          seenCodes.add(code);
          const isperfumery = name.toLowerCase().includes('perfume') || name.toLowerCase().includes('shampoo');

          rowsToInsert.push({
            code,
            ean: ean || null,
            name,
            price: "0.00", 
            manufacturer: "",
            iscontrolled: false,
            isperfumery
          });
          imported++;
        }
      }

      if (rowsToInsert.length > 0) {
        for (const row of rowsToInsert.slice(0, 50)) {
           if (row.ean) {
              row.imageUrl = await fetchProductImage(row.ean);
           }
        }

        const chunkSize = 1000;
        for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
          const chunk = rowsToInsert.slice(i, i + chunkSize);
          await supabase.from('products').upsert(chunk, { onConflict: 'code' });
        }
      }

      return { success: true, message: `${imported} produtos processados.`, productsProcessed: imported };
    }),

  uploadSales: publicProcedure
    .input(z.object({ fileContent: z.string(), startDate: z.string(), endDate: z.string() }))
    .mutation(async ({ input }) => {
      const lines = input.fileContent.split('\n').map(l => l.trim()).filter(Boolean);
      let imported = 0;
      const rowsToInsert: any[] = [];
      const productsToUpsert: any[] = [];
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      for (const line of lines) {
        const fields = line.split(';');
        if (fields.length >= 7 && fields[0] === '2') {
          const ean = fields[1]?.trim();
          const quantity = parseInt(fields[2]?.trim() || '0');
          const code = fields[3]?.trim();
          const name = fields[4]?.trim();
          const lab = fields[5]?.trim();
          const price = parseFloat(fields[6]?.trim() || '0');

          if (!code || isNaN(quantity) || quantity === 0) continue;
          if (name?.startsWith('**')) continue;

          productsToUpsert.push({
            code: code,
            ean: ean || null,
            name: name,
            manufacturer: lab || null,
            price: price || null,
          });

          rowsToInsert.push({
            productcode: code,
            quantity,
            startdate: start.toISOString(),
            enddate: end.toISOString(),
            source: 'cotac'
          });
          imported++;
        }
      }

      if (productsToUpsert.length > 0) {
        for (const p of productsToUpsert.slice(0, 30)) {
           p.imageUrl = await fetchProductImage(p.ean);
        }

        const chunkSize = 500;
        for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
          const chunk = productsToUpsert.slice(i, i + chunkSize);
          await supabase.from('products').upsert(chunk, { onConflict: 'code' });
        }
      }

      if (rowsToInsert.length > 0) {
        const chunkSize = 1000;
        for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
          const chunk = rowsToInsert.slice(i, i + chunkSize);
          await supabase.from('sales_history').upsert(chunk);
        }
      }

      return { success: true, message: `${imported} registros processados.`, recordsProcessed: imported };
    }),

  syncMissingImages: publicProcedure
    .mutation(async () => {
       const { data, error } = await supabase
          .from('products')
          .select('code, ean')
          .is('imageUrl', null)
          .not('ean', 'is', null)
          .limit(100);

       if (error) throw error;
       if (!data || data.length === 0) return { success: true, synced: 0 };

       let synced = 0;
       for (const item of data) {
          const url = await fetchProductImage(item.ean);
          if (url) {
             await supabase.from('products').update({ imageUrl: url }).eq('code', item.code);
             synced++;
          }
       }

       return { success: true, synced };
    }),

  resetForProduction: publicProcedure.mutation(async () => {
     const db = await getDb();
     if (!db) throw new Error("Offline");

     // Limpeza Pesada: Remove TUDO exceto o Catálogo de Produtos
     await db.execute(sql`TRUNCATE TABLE quote_items CASCADE`);
     await db.execute(sql`TRUNCATE TABLE quote_sessions CASCADE`);
     await db.execute(sql`TRUNCATE TABLE sales_history CASCADE`);
     await db.execute(sql`TRUNCATE TABLE manual_ruptures CASCADE`);
     await db.execute(sql`TRUNCATE TABLE product_adjustments CASCADE`);

     return { success: true, message: "Sistema resetado. Catálogo preservado." };
  }),
});
