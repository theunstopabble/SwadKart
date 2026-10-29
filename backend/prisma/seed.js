import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Check if already seeded
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("Database already has records, skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1. Create Admin / Restaurant Owner
  const owner = await prisma.user.create({
    data: {
      name: "Swad Chef",
      email: "admin@swadkart.com",
      password: hashedPassword,
      role: "admin",
      isVerified: true,
      phone: "+919876543210",
    },
  });

  // 2. Create Customer
  const customer = await prisma.user.create({
    data: {
      name: "Demo Customer",
      email: "customer@swadkart.com",
      password: hashedPassword,
      role: "user",
      isVerified: true,
      phone: "+919876543211",
    },
  });

  // 3. Create Restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Swad Signature Kitchen",
      description: "Authentic Indian flavors crafted with fresh ingredients.",
      address: "123 Food Street, Sector 18, City Center",
      ownerId: owner.id,
      rating: 4.8,
      numReviews: 42,
      isVerified: true,
      isActive: true,
      isOpenNow: true,
      openingTime: "10:00",
      closingTime: "23:00",
      locationLat: 28.5355,
      locationLng: 77.3910,
    },
  });

  // 4. Create Sample Products
  const sampleProducts = [
    {
      name: "Paneer Butter Masala",
      category: "Main Course",
      price: 280,
      description: "Cubes of fresh cottage cheese simmered in a rich tomato, butter, and cashew gravy.",
      image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
      isVeg: true,
      isRecommended: true,
      countInStock: 25,
      tags: JSON.stringify(["vegetarian", "curry", "bestseller"]),
      restaurantId: restaurant.id,
      userId: owner.id,
      rating: 4.9,
      numReviews: 28,
    },
    {
      name: "Dum Handi Biryani",
      category: "Biryani & Rice",
      price: 340,
      description: "Slow-cooked aromatic basmati rice layered with fragrant spices and saffron gravy.",
      image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
      isVeg: true,
      isRecommended: true,
      countInStock: 20,
      tags: JSON.stringify(["biryani", "spicy", "signature"]),
      restaurantId: restaurant.id,
      userId: owner.id,
      rating: 4.8,
      numReviews: 35,
    },
    {
      name: "Tandoori Malai Chaap",
      category: "Starters",
      price: 240,
      description: "Soy chaap marinated in fresh cream, mild spices, and char-grilled in a clay oven.",
      image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
      isVeg: true,
      isRecommended: false,
      countInStock: 15,
      tags: JSON.stringify(["starters", "tandoori", "creamy"]),
      restaurantId: restaurant.id,
      userId: owner.id,
      rating: 4.7,
      numReviews: 19,
    },
    {
      name: "Hot Gulab Jamun (2 Pcs)",
      category: "Desserts",
      price: 90,
      description: "Classic melt-in-mouth milk solids dumplings soaked in rose and cardamom syrup.",
      image: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=600&auto=format&fit=crop&q=80",
      isVeg: true,
      isRecommended: true,
      countInStock: 40,
      tags: JSON.stringify(["dessert", "sweet", "hot"]),
      restaurantId: restaurant.id,
      userId: owner.id,
      rating: 4.9,
      numReviews: 50,
    },
  ];

  for (const prod of sampleProducts) {
    await prisma.product.create({ data: prod });
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
