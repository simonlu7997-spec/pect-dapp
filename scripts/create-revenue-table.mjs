import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const conn = await mysql.createConnection(connectionString);

try {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`revenue_records\` (
      \`id\` serial AUTO_INCREMENT NOT NULL,
      \`periodLabel\` varchar(32) NOT NULL,
      \`periodYear\` int NOT NULL,
      \`periodMonth\` int NOT NULL,
      \`totalGeneration\` decimal(18,4) NOT NULL,
      \`totalRevenue\` decimal(18,4) NOT NULL,
      \`dividendPool\` decimal(18,4) NOT NULL,
      \`exchangeRate\` decimal(10,4) NOT NULL,
      \`snapshotBlock\` bigint,
      \`txHash\` varchar(66),
      \`note\` text,
      \`createdBy\` varchar(42),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`revenue_records_id\` PRIMARY KEY(\`id\`)
    )
  `);
  console.log("✓ revenue_records table created (or already exists)");
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
} finally {
  await conn.end();
}
