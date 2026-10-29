import prisma from "./prisma.js";

const connectDB = async (retries = 5, delay = 3000) => {
  try {
    // Ping database via Prisma query
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Local Database Connected via Prisma ORM");
  } catch (error) {
    console.error(`❌ Prisma Database Connection Error: ${error.message}`);
    if (retries > 0) {
      console.log(`🔄 Retrying database connection in ${delay}ms... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retries - 1, delay * 2);
    }
    console.error("❌ Prisma database connection failed after all retries. Shutting down.");
    // In dev we don't necessarily exit immediately if running outside Docker without DB started yet
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};

export default connectDB;
