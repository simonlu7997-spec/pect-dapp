import { getDb } from "../server/db";
import { adminTransactions } from "../drizzle/schema";
import { desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); return; }
  const rows = await db.select().from(adminTransactions).orderBy(desc(adminTransactions.createdAt)).limit(20);
  console.log("Total records:", rows.length);
  rows.forEach(r => console.log(r.id, r.txType, r.status, String(r.createdAt)));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
