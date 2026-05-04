import mongoose from "mongoose";

const connectDB = async (retries = 5, delay = 3000) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: isProduction ? 50 : 10,
      minPoolSize: isProduction ? 5 : 1,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      writeConcern: { w: "majority" },
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (retries > 0) {
      console.log(`🔄 Retrying MongoDB connection in ${delay}ms... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retries - 1, delay * 2);
    }
    console.error("❌ MongoDB connection failed after all retries. Shutting down.");
    process.exit(1);
  }
};

export default connectDB;
