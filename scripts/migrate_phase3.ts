import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🚀 Iniciando Migração de Banco de Dados (Phase 3 - AI & Manual Ruptures)...");
  const db = await getDb();
  if (!db) {
    console.error("❌ Erro: Não foi possível conectar ao banco de dados.");
    process.exit(1);
  }

  const steps = [
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

  for (const step of steps) {
    try {
      await db.execute(sql.raw(step));
      console.log(`✅ Sucesso: ${step.substring(0, 50)}...`);
    } catch (e: any) {
      console.warn(`⚠️ Aviso (provavelmente já existe): ${e.message}`);
    }
  }

  console.log("✨ Migração concluída com sucesso!");
  process.exit(0);
}

migrate();
