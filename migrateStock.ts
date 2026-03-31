import { config } from 'dotenv';
config();
import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function mn() { 
  const db = await getDb(); 
  await db.execute(sql`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS shelf_quantity integer;`); 
  console.log('DB DONE'); 
  process.exit(0); 
} 
mn();
