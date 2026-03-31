import { config } from 'dotenv';
config();
import postgres from 'postgres';

async function run() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  const res = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'quote_items';`;
  console.log(res);
  process.exit(0);
}
run();
