// Script direto via postgres.js (driver já instalado no projeto)
import postgres from 'postgres';
import { readFileSync } from 'fs';

const sql = postgres('postgresql://postgres:FH!4WZb6zw_kLjZ@db.pwadniulrydsqjswvmfo.supabase.co:5432/postgres', {
  ssl: 'require'
});

const commands = [
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS "ean" VARCHAR(64)`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS "isHighTurnover" BOOLEAN DEFAULT FALSE NOT NULL`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS "isDiscontinued" BOOLEAN DEFAULT FALSE NOT NULL`,
  `DROP TABLE IF EXISTS order_items CASCADE`,
  `DROP TABLE IF EXISTS orders CASCADE`,
  `CREATE TABLE IF NOT EXISTS quote_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
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
  `ALTER TABLE quote_sessions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Deny anon access" ON quote_sessions`,
  `CREATE POLICY "Deny anon access" ON quote_sessions FOR ALL TO anon USING (false)`,
  `DROP POLICY IF EXISTS "Deny anon access" ON quote_items`,
  `CREATE POLICY "Deny anon access" ON quote_items FOR ALL TO anon USING (false)`,
];

async function runMigrations() {
  console.log('🚀 Conectando ao Supabase...\n');
  try {
    for (const cmd of commands) {
      const preview = cmd.trim().split('\n')[0].substring(0, 80);
      await sql.unsafe(cmd);
      console.log(`  ✅ ${preview}`);
    }
    console.log('\n🎉 Todas as tabelas criadas com sucesso!');
  } catch (e: any) {
    console.error('\n❌ Erro:', e.message);
  } finally {
    await sql.end();
  }
}

runMigrations();
