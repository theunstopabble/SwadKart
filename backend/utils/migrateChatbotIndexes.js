/**
 * Migration script: Drop and recreate the Product text index with weighted fields.
 *
 * The old index was: { name: "text" }
 * The new index is:  { name: "text", tags: "text", category: "text", description: "text" }
 *   with weights:    { name: 10, tags: 5, category: 3, description: 1 }
 *
 * Run once via: npm run migrate:chatbot
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI environment variable is not set.");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected.");

  const db = mongoose.connection.db;
  const collection = db.collection("products");

  // Step 1: Drop existing text index (if any)
  console.log("🗑️  Checking for existing text index on products collection...");
  const indexes = await collection.indexes();
  const textIndex = indexes.find(
    (idx) => idx.key && idx.key._fts === "text"
  );

  if (textIndex) {
    console.log(`🗑️  Dropping existing text index: "${textIndex.name}"...`);
    await collection.dropIndex(textIndex.name);
    console.log("✅ Old text index dropped.");
  } else {
    console.log("ℹ️  No existing text index found. Skipping drop.");
  }

  // Step 2: Create new weighted text index
  console.log("🔨 Creating new weighted text index...");
  await collection.createIndex(
    { name: "text", tags: "text", category: "text", description: "text" },
    {
      weights: { name: 10, tags: 5, category: 3, description: 1 },
      name: "product_text_search",
    }
  );
  console.log("✅ New weighted text index created successfully.");

  // Step 3: Verify
  const updatedIndexes = await collection.indexes();
  const newTextIndex = updatedIndexes.find(
    (idx) => idx.name === "product_text_search"
  );
  if (newTextIndex) {
    console.log("✅ Verification passed. Index details:");
    console.log(JSON.stringify(newTextIndex, null, 2));
  } else {
    console.error("❌ Verification failed — index not found after creation.");
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log("🔌 Disconnected. Migration complete.");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
