import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";

// @desc    Export all user data (Right to Access)
// @route   GET /api/v1/user/gdpr/export
// @access  Private
export const exportUserData = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;

  const [user, orders, couponUsages, reservations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        orderStatus: true,
        orderItems: true,
        totalPrice: true,
        createdAt: true,
        shippingAddress: true,
      },
    }),
    prisma.couponUsage.findMany({
      where: { userId },
      include: {
        coupon: {
          select: { code: true, discountPercentage: true },
        },
      },
    }),
    prisma.reservation.findMany({
      where: { userId },
      select: {
        id: true,
        date: true,
        time: true,
        guests: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const exportPackage = {
    exportedAt: new Date().toISOString(),
    userProfile: user,
    orders,
    couponUsages,
    reservations,
    dataCategories: ["profile", "orders", "coupons", "reservations"],
  };

  res.setHeader("Content-Disposition", "attachment; filename=swadkart-data-export.json");
  res.setHeader("Content-Type", "application/json");
  res.json(exportPackage);
});

// @desc    Delete user account and all personal data (Right to Erasure)
// @route   DELETE /api/v1/user/gdpr/delete
// @access  Private
export const deleteUserAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;

  // Delete associated user data
  await prisma.couponUsage.deleteMany({ where: { userId } });
  await prisma.reservation.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });

  // Delete user account (schema has cascade relations configured)
  await prisma.user.delete({ where: { id: userId } });

  res.json({ message: "Account and all personal data deleted successfully." });
});
