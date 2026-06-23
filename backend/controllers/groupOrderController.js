import asyncHandler from "express-async-handler";
import crypto from "crypto";
import GroupOrder from "../models/groupOrderModel.js";
import Order from "../models/orderModel.js";

// @desc    Create a group order
// @route   POST /api/v1/group-orders
// @access  Private
export const createGroupOrder = asyncHandler(async (req, res) => {
  const { restaurantId, expiresAt, splitType } = req.body;
  if (!restaurantId) {
    res.status(400);
    throw new Error("Restaurant ID is required");
  }

  const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const expiry = new Date(expiresAt || Date.now() + 60 * 60 * 1000); // 1 hour default

  const groupOrder = await GroupOrder.create({
    host: req.user._id,
    restaurant: restaurantId,
    inviteCode,
    expiresAt: expiry,
    members: [{ user: req.user._id, name: req.user.name || "Host", items: [] }],
    splitType: splitType || "itemwise",
  });

  res.status(201).json(groupOrder);
});

// @desc    Join a group order by invite code
// @route   POST /api/v1/group-orders/join
// @access  Private
export const joinGroupOrder = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  const groupOrder = await GroupOrder.findOne({ inviteCode: inviteCode.toUpperCase() });

  if (!groupOrder) {
    res.status(404);
    throw new Error("Group order not found");
  }
  if (groupOrder.status !== "open") {
    res.status(400);
    throw new Error("Group order is no longer accepting members");
  }
  if (groupOrder.expiresAt < new Date()) {
    res.status(400);
    throw new Error("Group order has expired");
  }

  const alreadyMember = groupOrder.members.some((m) => m.user?.toString() === req.user._id.toString());
  if (!alreadyMember) {
    groupOrder.members.push({ user: req.user._id, name: req.user.name || "Guest", items: [] });
    await groupOrder.save();
  }

  res.json(groupOrder);
});

// @desc    Get group order by ID
// @route   GET /api/v1/group-orders/:id
// @access  Private (Member or Host)
export const getGroupOrder = asyncHandler(async (req, res) => {
  const groupOrder = await GroupOrder.findById(req.params.id)
    .populate("host", "name")
    .populate("restaurant", "name image")
    .populate("cart.product", "name image price");

  if (!groupOrder) {
    res.status(404);
    throw new Error("Group order not found");
  }

  const isMember = groupOrder.members.some((m) => m.user?.toString() === req.user._id.toString());
  const isHost = groupOrder.host.toString() === req.user._id.toString();
  if (!isMember && !isHost) {
    res.status(401);
    throw new Error("Not authorized");
  }

  res.json(groupOrder);
});

// @desc    Add item to group cart
// @route   PUT /api/v1/group-orders/:id/cart
// @access  Private (Member)
export const addToGroupCart = asyncHandler(async (req, res) => {
  const { productId, name, price, qty } = req.body;

  if (!productId || !name || price === undefined || price <= 0) {
    res.status(400);
    throw new Error("productId, name, and positive price are required");
  }

  if (qty !== undefined && (!Number.isInteger(qty) || qty <= 0)) {
    res.status(400);
    throw new Error("qty must be a positive integer");
  }

  const groupOrder = await GroupOrder.findById(req.params.id);
  if (!groupOrder) {
    res.status(404);
    throw new Error("Group order not found");
  }

  const isMember = groupOrder.members.some((m) => m.user?.toString() === req.user._id.toString());
  if (!isMember) {
    res.status(401);
    throw new Error("Not a member of this group order");
  }

groupOrder.cart.push({ product: productId, name, price, qty: qty || 1, addedBy: req.user._id });
    groupOrder.totalCartValue = groupOrder.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const member = groupOrder.members.find((m) => m.user?.toString() === req.user._id.toString());
    if (member) {
      member.items.push({ product: productId, name, price, qty: qty || 1 });
    }
    await groupOrder.save();

  res.json(groupOrder);
});

// @desc    Calculate split bill
// @route   GET /api/v1/group-orders/:id/split
// @access  Private (Member)
export const calculateSplit = asyncHandler(async (req, res) => {
  const groupOrder = await GroupOrder.findById(req.params.id);
  if (!groupOrder) {
    res.status(404);
    throw new Error("Group order not found");
  }

  const isMember = groupOrder.members.some((m) => m.user?.toString() === req.user._id.toString());
  const isHost = groupOrder.host.toString() === req.user._id.toString();
  if (!isMember && !isHost) {
    res.status(403);
    throw new Error("Not authorized to view this group order");
  }

  const memberCount = groupOrder.members.length || 1;
  const safeTotalValue = groupOrder.totalCartValue || 0;
  const safeTaxPercent = groupOrder.taxPercent || 0;
  const safeDeliveryFee = groupOrder.deliveryFee || 0;

  const equalShareDelivery = memberCount > 0 ? safeDeliveryFee / memberCount : 0;
  const equalShareTax = memberCount > 0 ? (safeTotalValue * (safeTaxPercent / 100)) / memberCount : 0;

  const splits = groupOrder.members.map((m) => {
    const myItemsTotal = m.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const subtotal = myItemsTotal || (memberCount > 0 ? safeTotalValue / memberCount : 0);
    const shareDelivery = groupOrder.splitType === "equal"
      ? equalShareDelivery
      : (safeTotalValue > 0 ? safeDeliveryFee * (subtotal / safeTotalValue) : 0);
    const shareTax = groupOrder.splitType === "equal"
      ? equalShareTax
      : (subtotal * (safeTaxPercent / 100));
    const total = subtotal + shareDelivery + shareTax + (m.tip || 0);
    return { userId: m.user, name: m.name, subtotal, shareDelivery, shareTax, tip: m.tip || 0, total };
  });

  res.json({ splitType: groupOrder.splitType, totalCartValue: groupOrder.totalCartValue, splits });
});
