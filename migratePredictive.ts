import { config } from 'dotenv';
config();
import postgres from 'postgres';

async function run() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  try {
    console.log("Adding expected_stock to products...");
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS expected_stock INT;`;
    
    console.log("Adding stock_last_updated to products...");
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_last_updated TIMESTAMP;`;

    console.log("Removing duplicate sales_history reports...");
    // Keep only the first inserted row (MIN id) for each exact period and product
    await sql`
      DELETE FROM sales_history
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM sales_history
        GROUP BY productcode, startdate, enddate
      );
    `;

    console.log("Adding UNIQUE constraint to sales_history...");
    // Drop it if it existed previously
    await sql`ALTER TABLE sales_history DROP CONSTRAINT IF EXISTS sales_history_unq_period;`;
    await sql`ALTER TABLE sales_history ADD CONSTRAINT sales_history_unq_period UNIQUE (productcode, startdate, enddate);`;

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}
run();
