/**
 * Migration script notice:
 * PostgreSQL indexes for SwadKart are declaratively configured in prisma/schema.prisma
 * and automatically pushed via `npx prisma db push`.
 */

import prisma from "../config/prisma.js";

async function verifyIndexes() {
  console.log("ℹ️  Indexes are managed declaratively in prisma/schema.prisma.");
  try {
    const productCount = await prisma.product.count();
    console.log(`✅ Prisma DB connection active. Current product count: ${productCount}`);
  } catch (err) {
    console.error("❌ Prisma DB check failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyIndexes();
