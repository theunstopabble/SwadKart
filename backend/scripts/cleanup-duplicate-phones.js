// Migration: Clean up duplicate phone numbers from pre-WhatsApp era
// Run: node backend/scripts/cleanup-duplicate-phones.js
import mongoose from "mongoose";
import User from "../models/userModel.js";
import { config } from "dotenv";
config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Find all non-null phones with count > 1
  const duplicates = await User.aggregate([
    { $match: { phone: { $ne: null } } },
    { $group: { _id: "$phone", count: { $sum: 1 }, users: { $push: { _id: "$_id", name: "$name", email: "$email", role: "$role", phoneVerified: "$phoneVerified" } } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicates.length === 0) {
    console.log("No duplicate phones found.");
    await mongoose.disconnect();
    return;
  }

  for (const dup of duplicates) {
    console.log(`\nPhone: ${dup._id} (${dup.count} users):`);
    // Keep the phone on the most "important" user: admin > user > delivery_partner > restaurant_owner
    const sorted = [...dup.users].sort((a, b) => {
      const rank = { admin: 0, user: 1, delivery_partner: 2, restaurant_owner: 3 };
      return (rank[a.role] ?? 99) - (rank[b.role] ?? 99);
    });
    const keep = sorted[0];
    const toClear = sorted.slice(1);

    for (const u of toClear) {
      await User.findByIdAndUpdate(u._id, { $set: { phone: null, phoneVerified: false } });
      console.log(`  Cleared phone from ${u.name} (${u.email}, ${u.role})`);
    }
    console.log(`  Kept phone on ${keep.name} (${keep.email}, ${keep.role})`);
  }

  // Rebuild sparse index to ensure consistency
  await User.collection.dropIndex("phone_1");
  await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
  console.log("\nPhone index rebuilt.");

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(console.error);
