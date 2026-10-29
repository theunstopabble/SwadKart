import asyncHandler from "express-async-handler";
import crypto from "crypto";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Create a group order
// @route   POST /api/v1/group-orders
// @access  Private
export const createGroupOrder = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const { restaurantId, expiresAt, splitType } = req.body;
  if (!restaurantId) {
    res.status(400);
    throw new Error("Restaurant ID is required");
  }

  const cleanRestId = sanitizeObjectId(restaurantId);
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: cleanRestId },
    select: { id: true, name: true },
  });

  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const expiry = new Date(expiresAt || Date.now() + 60 * 60 * 1000); // 1 hour default

  const groupOrder = await prisma.groupOrder.create({
    data: {
      hostId: currentUserId,
      restaurantId: cleanRestId,
      inviteCode,
      expiresAt: expiry,
      members: [{ user: currentUserId, name: req.user.name || "Host", items: [] }],
      splitType: splitType || "itemwise",
    },
  });

  res.status(201).json(groupOrder);
});

// @desc    Join a group order by invite code
// @route   POST /api/v1/group-orders/join
// @access  Private
export const joinGroupOrder = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const { inviteCode } = req.body;
  if (!inviteCode) {
    res.status(400);
    throw new Error("Invite code is required");
  }

  const groupOrder = await prisma.groupOrder.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
  });

  if (!groupOrder) {
    res.status(404);
    throw new Error("Group order not found");
  }
  if (groupOrder.status !== "open") {
    res.status(400);
    throw new Error("Group order is no longer accepting members");
  }
  if (new Date(groupOrder.expiresAt) < new Date()) {
    res.status(400);
    throw new Error("Group order has expired");
  }

  let members = Array.isArray(groupOrder.members) ? [...groupOrder.members] : [];
  const alreadyMember = members.some((m) => m.user?.toString() === currentUserId.toString());

  if (!alreadyMember) {
    members.push({ user: currentUserId, name: req.user.name || "Guest", items: [] });
    const updated = await prisma.groupOrder.update({
      where: { id: groupOrder.id },
      data: { members },
    });
    return res.json(updated);
  }

  res.json(groupOrder);
});

// @desc    Get group order by ID
// @route   GET /api/v1/group-orders/:id
// @access  Private (Member or Host)
export const getGroupOrder = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const groupOrder = await prisma.groupOrder.findUnique({
    where: { id: sanitizeObjectId(req.params.id) },
    include: {
      host: { select: { id: true, name: true } },
      restaurant: { select: { id: true, name: true, image: true } },
    },
  });

  if (!groupOrder) {
    res.status(404);
    throw new Error("Group order not found");
  }

  const members = Array.isArray(groupOrder.members) ? groupOrder.members : [];
  const isMember = members.some((m) => m.user?.toString() === currentUserId.toString());
  const isHost = groupOrder.hostId?.toString() === currentUserId.toString();
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
  const currentUserId = req.user.id || req.user._id;
  const { productId, name, price, qty } = req.body;

  if (!productId || !name || price === undefined || price <= 0) {
    res.status(400);
    throw new Error("productId, name, and positive price are required");
  }

  if (qty !== undefined && (!Number.isInteger(qty) || qty <= 0)) {
    res.status(400);
    throw new Error("qty must be a positive integer");
  }

  const groupOrder = await prisma.groupOrder.findUnique({
    where: { id: sanitizeObjectId(req.params.id) },
  });
  if (!groupOrder) {
    res.status(404);
    throw new Error("Group order not found");
  }

  const members = Array.isArray(groupOrder.members) ? [...groupOrder.members] : [];
  const isMember = members.some((m) => m.user?.toString() === currentUserId.toString());
  if (!isMember) {
    res.status(401);
    throw new Error("Not a member of this group order");
  }

  const cart = Array.isArray(groupOrder.cart) ? [...groupOrder.cart] : [];
  cart.push({ product: productId, name, price, qty: qty || 1, addedBy: currentUserId });
  const totalCartValue = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const member = members.find((m) => m.user?.toString() === currentUserId.toString());
  if (member) {
    if (!member.items) member.items = [];
    member.items.push({ product: productId, name, price, qty: qty || 1 });
  }

  const updatedOrder = await prisma.groupOrder.update({
    where: { id: groupOrder.id },
    data: {
      cart,
      totalCartValue,
      members,
    },
  });

  res.json(updatedOrder);
});

// @desc    Calculate split bill
// @route   GET /api/v1/group-orders/:id/split
// @access  Private (Member)
export const calculateSplit = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const groupOrder = await prisma.groupOrder.findUnique({
    where: { id: sanitizeObjectId(req.params.id) },
  });
  if (!groupOrder) {
    res.status(404);
    throw new Error("Group order not found");
  }

  const members = Array.isArray(groupOrder.members) ? groupOrder.members : [];
  const isMember = members.some((m) => m.user?.toString() === currentUserId.toString());
  const isHost = groupOrder.hostId?.toString() === currentUserId.toString();
  if (!isMember && !isHost) {
    res.status(403);
    throw new Error("Not authorized to view this group order");
  }

  const memberCount = members.length || 1;
  const safeTotalValue = groupOrder.totalCartValue || 0;
  const safeTaxPercent = groupOrder.taxPercent || 0;
  const safeDeliveryFee = groupOrder.deliveryFee || 0;

  const equalShareDelivery = memberCount > 0 ? safeDeliveryFee / memberCount : 0;
  const equalShareTax = memberCount > 0 ? (safeTotalValue * (safeTaxPercent / 100)) / memberCount : 0;

  const splits = members.map((m) => {
    const items = Array.isArray(m.items) ? m.items : [];
    const myItemsTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
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
