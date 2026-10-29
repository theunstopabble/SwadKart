import prisma from "../config/prisma.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import { getPhoneConfirmationTemplate } from "../utils/emailTemplates.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { sanitizeString, sanitizeEmail, sanitizePhone } from "../utils/sanitize.js";
import { hashPassword, matchPassword as verifyPassword } from "../utils/password.js";

// =================================================================
// 👤 1. USER PROFILE OPERATIONS (Self)
// =================================================================

export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (user) {
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (req.body.email && req.body.email !== user.email) {
      return res.status(400).json({
        message: "Email cannot be changed directly. Please contact support or re-register.",
      });
    }

    const updateData = {};

    if (req.body.name) {
      updateData.name = sanitizeString(req.body.name) || user.name;
    }
    if (req.body.phone) {
      const cleanPhone = sanitizePhone(req.body.phone);
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(String(cleanPhone))) {
        res.status(400);
        throw new Error("Invalid Indian phone number.");
      }
      updateData.phone = cleanPhone;
      updateData.phoneVerified = false;
    }
    if (req.body.password) {
      if (!req.body.currentPassword) {
        res.status(400);
        throw new Error("Current password is required to set a new password.");
      }
      const isMatch = await verifyPassword(req.body.currentPassword, user.password);
      if (!isMatch) {
        res.status(400);
        throw new Error("Current password is incorrect.");
      }
      if (req.body.password.length < 6) {
        res.status(400);
        throw new Error("Password must be at least 6 characters.");
      }
      updateData.password = await hashPassword(req.body.password);
      updateData.tokenVersion = user.tokenVersion + 1;
    }
    if (req.body.description !== undefined) {
      updateData.description = sanitizeString(req.body.description) || "";
    }
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "swadkart_profiles",
      });
      updateData.image = result.secure_url;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const token = generateToken(res, updatedUser.id, updatedUser.tokenVersion);
    const { password: _, ...safeData } = updatedUser;
    safeData.token = token;

    return res.json(safeData);
  } catch (error) {
    next(error);
  }
};

// =================================================================
// 🔐 BIOMETRIC STATUS
// =================================================================

export const updateBiometricStatus = async (req, res, next) => {
  try {
    const { isEnabled } = req.body;
    const userId = req.user.id || req.user._id;

    const updateData = { isBiometricEnabled: isEnabled };
    if (!isEnabled) {
      updateData.biometricCredentials = [];
      updateData.currentChallenge = null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return res.json({
      success: true,
      isBiometricEnabled: user.isBiometricEnabled,
      message: isEnabled
        ? "Biometric Enabled ✅"
        : "Biometric Disabled & Credentials Cleared 🔒",
    });
  } catch (error) {
    next(error);
  }
};

export const getBiometricStatus = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBiometricEnabled: true, biometricCredentials: true },
    });

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const hasCredentials = Array.isArray(user.biometricCredentials) && user.biometricCredentials.length > 0;

    return res.json({
      isBiometricEnabled: user.isBiometricEnabled,
      hasCredentials,
    });
  } catch (error) {
    next(error);
  }
};

// =================================================================
// 👑 2. ADMIN OPERATIONS (Manage All Users)
// =================================================================

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const count = await prisma.user.count();
    const users = await prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const safeUsers = users.map(({ password: _, ...u }) => u);

    res.json({
      data: safeUsers,
      metadata: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserByAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.image) updateData.image = req.body.image;
    if (req.body.role) updateData.role = req.body.role;
    if (req.body.orderIndex !== undefined) updateData.orderIndex = req.body.orderIndex;

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
    });

    if (req.io) {
      req.io.to(updatedUser.id).emit("userUpdated", updatedUser);
    }

    const { password: _, ...safeUser } = updatedUser;
    return res.json(safeUser);
  } catch (error) {
    next(error);
  }
};

export const deleteUserByAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.role === "admin") {
      res.status(400);
      throw new Error("Cannot delete Admin");
    }

    await prisma.restaurant.deleteMany({ where: { ownerId: user.id } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.product.deleteMany({ where: { userId: user.id } });
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.couponUsage.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    return res.json({ message: "User identity and associated data removed" });
  } catch (error) {
    next(error);
  }
};

// =================================================================
// 🏙️ 3. RESTAURANT & DELIVERY OPERATIONS
// =================================================================

export const getAllRestaurantsPublic = async (req, res, next) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        image: true,
        description: true,
        rating: true,
        numReviews: true,
        address: true,
        isOpenNow: true,
        openingTime: true,
        closingTime: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(restaurants);
  } catch (error) {
    next(error);
  }
};

export const createRestaurantByAdmin = async (req, res, next) => {
  try {
    const { name, email, password, image } = req.body;
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "restaurant_owner",
        phone: req.body.phone || String(Date.now()).slice(-10),
        image: image || "https://images.unsplash.com/photo-1552566626-52f8b828add9",
        isVerified: true,
        orderIndex: 0,
      },
    });

    await prisma.restaurant.create({
      data: {
        name: `${name} (Shop)`,
        ownerId: user.id,
        image: user.image || "",
        address: "Default Address, India",
        description: "Restaurant managed by SwadKart admin.",
        isVerified: true,
        isActive: true,
      },
    });

    const { password: _, ...safeUser } = user;
    return res.status(201).json(safeUser);
  } catch (error) {
    next(error);
  }
};

export const createDummyRestaurant = async (req, res, next) => {
  try {
    const { name, image } = req.body;
    const uniqueTime = Date.now();
    const hashedPassword = await hashPassword(`Dummy@${uniqueTime}`);

    const user = await prisma.user.create({
      data: {
        name: name || "New Dummy Shop",
        email: `${(name || "dummy")
          .toLowerCase()
          .replace(/\s+/g, "")}_${uniqueTime}@dummy.swadkart`,
        password: hashedPassword,
        role: "restaurant_owner",
        image: image || "https://images.unsplash.com/photo-1552566626-52f8b828add9",
        phone: String(uniqueTime).slice(-10),
        isVerified: true,
        orderIndex: 0,
      },
    });

    await prisma.restaurant.create({
      data: {
        name: `${user.name} (Shop)`,
        ownerId: user.id,
        image: user.image || "",
        address: "Synthetic Street, Cyber City",
        description: "Synthetic restaurant for demo purposes.",
        isVerified: false,
        isDummy: true,
        isActive: true,
      },
    });

    const { password: _, ...safeUser } = user;
    return res.status(201).json(safeUser);
  } catch (error) {
    next(error);
  }
};

export const getDeliveryPartners = async (req, res, next) => {
  try {
    const partners = await prisma.user.findMany({
      where: { role: "delivery_partner" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        currentLocationLat: true,
        currentLocationLng: true,
        isAvailable: true,
        role: true,
      },
    });
    return res.json(partners);
  } catch (error) {
    next(error);
  }
};

export const seedDatabase = async (req, res) => {
  return res.json({ message: "Seed functionality called." });
};

// =================================================================
// 📧 4. NEWSLETTER & GOOGLE AUTH
// =================================================================

export const subscribeToNewsletter = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const adminEmail = process.env.SMTP_MAIL;
    if (!adminEmail) {
      console.warn("⚠️ Admin email (SMTP_MAIL) not set in .env");
      return res
        .status(200)
        .json({ message: "Success! You are now subscribed. 🚀" });
    }

    await sendEmail({
      email: adminEmail,
      subject: "New Newsletter Subscriber!",
      html: `
        <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px; max-width: 600px; background-color: #f9f9f9;">
          <h2 style="color: #ef4444;">New Subscriber Alert! 🚀</h2>
          <p>Hi Admin, a new user subscribed to the SwadKart newsletter.</p>
          <div style="background: #fff; padding: 15px; border-radius: 5px; border-left: 4px solid #ef4444; font-weight: bold;">
              Email: <a href="mailto:${email}" style="color: #ef4444;">${email}</a>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #777;">Sent by SwadKart Automated System.</p>
        </div>
      `,
    });

    return res
      .status(200)
      .json({ message: "Success! You are now subscribed. 🚀" });
  } catch (error) {
    console.error("Newsletter Error:", error.message);
    return res
      .status(500)
      .json({ message: "Subscription failed. Please try again later." });
  }
};

export const googleCheck = async (req, res, next) => {
  try {
    const rawEmail = req.body.email;
    const email = sanitizeEmail(rawEmail);
    const user = await prisma.user.findUnique({ where: { email: String(email) } });

    if (user) {
      const token = generateToken(res, user.id, user.tokenVersion);
      const { password: _, ...userSafeData } = user;
      return res.json({ exists: true, user: { ...userSafeData, token } });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    next(error);
  }
};

export const googleRegister = async (req, res, next) => {
  try {
    const { name, email: rawEmail, image, phone: rawPhone } = req.body;
    const email = sanitizeEmail(rawEmail);

    const emailExists = await prisma.user.findUnique({ where: { email: String(email) } });
    if (emailExists) {
      res.status(400);
      throw new Error("Email is already registered. Please login instead.");
    }

    let phone = null;
    if (rawPhone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(String(rawPhone))) {
        return res.status(400).json({ message: "Invalid Indian phone number." });
      }
      phone = sanitizePhone(rawPhone);
      const phoneExists = await prisma.user.findFirst({ where: { phone: String(phone) } });
      if (phoneExists) {
        res.status(400);
        throw new Error("Phone number is already associated with another account");
      }
    }

    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await hashPassword(randomPassword);

    const user = await prisma.user.create({
      data: {
        name,
        email: String(email),
        phone,
        phoneVerified: false,
        image,
        password: hashedPassword,
        isVerified: true,
        role: "user",
      },
    });

    const token = generateToken(res, user.id, user.tokenVersion);
    const { password: _, ...safeUser } = user;
    safeUser.token = token;
    return res.status(201).json(safeUser);
  } catch (error) {
    next(error);
  }
};

export const verifyPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(String(phone))) {
      return res.status(400).json({ message: "Invalid Indian phone number." });
    }

    const userId = req.user.id || req.user._id;

    const existing = await prisma.user.findFirst({
      where: {
        phone: String(phone),
        phoneVerified: true,
        id: { not: userId },
      },
      select: { id: true },
    });
    if (existing) {
      return res.status(400).json({ message: "Phone already linked to another account." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: String(phone),
        phoneVerified: true,
      },
    });

    sendEmail({
      email: updatedUser.email,
      subject: "Phone Number Confirmed — SwadKart",
      html: getPhoneConfirmationTemplate(updatedUser.phone, updatedUser.name),
    }).catch((err) => console.error("[verifyPhone] Email send failed:", err.message));

    const { password: _, ...safeUser } = updatedUser;
    return res.json({ message: "Phone verified successfully", user: safeUser });
  } catch (err) {
    console.error("[verifyPhone] Error:", err.message);
    res.status(500).json({ message: "Failed to verify phone." });
  }
};
