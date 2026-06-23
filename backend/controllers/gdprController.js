import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import CouponUsage from "../models/couponUsageModel.js";
import Reservation from "../models/reservationModel.js";

// @desc    Export all user data (Right to Access)
// @route   GET /api/v1/user/gdpr/export
// @access  Private
export const exportUserData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [user, orders, couponUsages, reservations] = await Promise.all([
    User.findById(userId).select("name email phone").lean(),
    Order.find({ user: userId }).select("orderStatus items totalPrice createdAt deliveryAddress").lean(),
    CouponUsage.find({ user: userId }).populate("coupon", "code discountPercentage").select("coupon usedAt").lean(),
    Reservation.find({ user: userId }).select("date time guests status createdAt").lean(),
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
  const userId = req.user._id;

  // Anonymize orders instead of deleting (retain for business/accounting)
  await Order.updateMany(
    { user: userId },
    {
      $set: {
        user: null,
        "shippingAddress.fullName": "[deleted]",
        "shippingAddress.phone": "[deleted]",
        "shippingAddress.address": "[deleted]",
      },
    },
  );

  // Delete personal data from other collections
  await CouponUsage.deleteMany({ user: userId });
  await Reservation.deleteMany({ user: userId });

  // Delete user account
  await User.findByIdAndDelete(userId);

  res.json({ message: "Account and all personal data deleted successfully." });
});
