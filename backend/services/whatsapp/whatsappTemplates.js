const WA_SEPARATOR = "\n━━━━━━━━━━━━━━━━━━━\n";

const esc = (s) => {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[*_~`]/g, (c) => `\\${c}`);
};

export const getWELCOME = (name) =>
  `🎉 *Welcome to SwadKart!*\n\nHi *${esc(name)}*, we're thrilled to have you on board. Get ready for the fastest delivery and the tastiest meals in town.\n\n👉 Order now: ${process.env.FRONTEND_URL || "https://swadkart.vercel.app"}\n\nYour taste journey begins here! 🍕🔥`;

export const getOTP = (otp) =>
  `🔐 *SwadKart Verification*\n\nYour OTP is: *${otp}*\n\nValid for 10 minutes. Do not share this code with anyone.\n\nIf you didn't request this, please ignore this message.`;

export const getPhoneOTP = (otp) =>
  `🔐 *SwadKart Phone Verification*\n\nYour OTP is: *${otp}*\n\nValid for 5 minutes. Do not share this code with anyone.`;

export const getRESET_PASSWORD = (resetUrl) =>
  `🔒 *Reset Your Password*\n\nWe received a request to reset your password. Click the link below to choose a new one:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't ask for this, ignore this message.`;

export const getORDER_CONFIRMATION = (order, isPaid) => {
  const statusEmoji = isPaid ? "✅" : "📋";
  const statusText = isPaid ? "Payment Successful" : "Order Placed (COD)";
  const orderRef = order._id.toString().slice(-6).toUpperCase();
  const name = esc(order.user?.name || "Valued Customer");

  const items = order.orderItems
    .map((item) => {
      let meta = "";
      if (item.selectedVariant) meta += ` (${esc(item.selectedVariant.name)})`;
      if (item.selectedAddons?.length) {
        const addons = item.selectedAddons.map((a) => esc(a.name)).join(", ");
        meta += ` + ${addons}`;
      }
      return `🍽 *${esc(item.name)}*${meta} x${item.qty}\n   ₹${item.price * item.qty}`;
    })
    .join("\n");

  const address = order.shippingAddress || {};
  const addrParts = [
    esc(address.address),
    [esc(address.city), esc(address.postalCode)].filter(Boolean).join(" - "),
  ].filter(Boolean);

  return (
    `${statusEmoji} *Order Confirmed!* ${statusEmoji}\n` +
    `${WA_SEPARATOR}` +
    `*Status:* ${statusText}\n` +
    `*Order:* #${orderRef}\n` +
    `${WA_SEPARATOR}` +
    `${items}\n` +
    `${WA_SEPARATOR}` +
    `*Total:* ₹${order.totalPrice}\n` +
    `${WA_SEPARATOR}` +
    `📍 *Delivering To:*\n${name}\n${addrParts.join("\n")}\n📞 ${esc(address.phone || "")}\n` +
    `${WA_SEPARATOR}` +
    `📱 Track: ${process.env.FRONTEND_URL || "https://swadkart.vercel.app"}/myorders\n\n` +
    `_Thank you for ordering with SwadKart! 🍕🔥_`
  );
};

export const getORDER_STATUS = (order, status) => {
  const statusEmojis = {
    Preparing: "👨‍🍳",
    Ready: "📦",
    "Out for Delivery": "🛵",
    Delivered: "✅",
    Cancelled: "❌",
  };
  const emoji = statusEmojis[status] || "📋";
  const orderRef = order._id.toString().slice(-6).toUpperCase();

  let extra = "";
  if (status === "Out for Delivery") {
    extra = "\nYour delivery partner is on the way! 🛵💨";
  } else if (status === "Delivered") {
    extra = "\nEnjoy your meal! 🍽️\n\n*Love your order?* Leave a review on the app! ⭐";
  } else if (status === "Preparing") {
    extra = "\nYour food is being prepared fresh just for you! 👨‍🍳";
  }

  return `${emoji} *Order Update*\n\nOrder #${orderRef} is now: *${status}*${extra}\n\n📱 Track: ${process.env.FRONTEND_URL || "https://swadkart.vercel.app"}/myorders`;
};

export const getDRIVER_ASSIGNED = (order, partner) => {
  const orderRef = order._id.toString().slice(-6).toUpperCase();
  const partnerName = esc(partner?.name || "Your delivery partner");
  const partnerPhone = esc(partner?.phone || "");

  return (
    `🛵 *On The Way!*\n\nYour food has been picked up and is on its way to you! 🎉\n` +
    `${WA_SEPARATOR}` +
    `👤 *Delivery Partner:* ${partnerName}\n` +
    `${partnerPhone ? `📞 *Contact:* ${partnerPhone}\n` : ""}` +
    `${WA_SEPARATOR}` +
    `📱 Track live: ${process.env.FRONTEND_URL || "https://swadkart.vercel.app"}/myorders`
  );
};

export const getORDER_CANCELLED = (order, reason) => {
  const orderRef = order._id.toString().slice(-6).toUpperCase();
  return (
    `❌ *Order Cancelled*\n\nOrder #${orderRef} has been cancelled.\n` +
    `${WA_SEPARATOR}` +
    `*Reason:* ${esc(reason || "No reason provided")}\n` +
    `${WA_SEPARATOR}` +
    `💳 *Refund:* If you paid online, the refund will be processed to your original payment source within 5-7 business days.\n\n` +
    `👉 Browse again: ${process.env.FRONTEND_URL || "https://swadkart.vercel.app"}`
  );
};

export const getDELIVERY_REQUEST = (order, partner) => {
  const orderRef = order._id.toString().slice(-6).toUpperCase();
  const items = order.orderItems
    .map((item) => {
      const size = item.selectedVariant ? ` (${esc(item.selectedVariant.name)})` : "";
      return `• ${esc(item.name)}${size} x${item.qty}`;
    })
    .join("\n");

  const address = order.shippingAddress || {};
  const addrParts = [
    esc(address.address),
    [esc(address.city), esc(address.postalCode)].filter(Boolean).join(" - "),
  ].filter(Boolean);

  return (
    `🛵 *Delivery Request* 🛵\n\nHi *${esc(partner?.name || "Partner")}*, a new order is ready for pickup!\n` +
    `${WA_SEPARATOR}` +
    `*Order:* #${orderRef}\n` +
    `*Payment:* ${order.paymentMethod} — ₹${order.totalPrice}\n` +
    `${WA_SEPARATOR}` +
    `*Items:*\n${items}\n` +
    `${WA_SEPARATOR}` +
    `📍 *Drop Location:*\n${esc(order.user?.name || "")}\n${addrParts.join("\n")}\n📞 ${esc(address.phone || "")}\n` +
    `${WA_SEPARATOR}` +
    `📱 Open app to accept: ${process.env.FRONTEND_URL || "https://swadkart.vercel.app"}/delivery/dashboard`
  );
};

export const getPROMOTIONAL = (coupon) =>
  `🎉 *Exclusive Offer Just for You!* 🎉\n\n` +
  `Use code: *${coupon.code}*\n` +
  `Get *${coupon.discountPercentage}% OFF*\n` +
  `Min order: ₹${coupon.minOrderValue || 0}\n` +
  `Valid till: ${coupon.expirationDate ? new Date(coupon.expirationDate).toLocaleDateString() : "soon"}\n\n` +
  `👉 Order now: ${process.env.FRONTEND_URL || "https://swadkart.vercel.app"}`;

export const getRESTAURANT_ALERT = (order, restaurantName) => {
  const items = order.orderItems
    .map((item) => {
      let meta = "";
      if (item.selectedVariant) meta += ` (${esc(item.selectedVariant.name)})`;
      if (item.selectedAddons?.length) {
        meta += ` + ${item.selectedAddons.map((a) => esc(a.name)).join(", ")}`;
      }
      return `• *${esc(item.name)}*${meta} x${item.qty}`;
    })
    .join("\n");

  return (
    `🔔 *New Order — ${esc(restaurantName)}* 🔔\n` +
    `${WA_SEPARATOR}` +
    `*Customer:* ${esc(order.user?.name || "")}\n` +
    `*Total:* ₹${order.totalPrice}\n` +
    `*Payment:* ${order.paymentMethod}\n` +
    `${WA_SEPARATOR}` +
    `*Items to Prepare:*\n${items}\n` +
    `${WA_SEPARATOR}` +
    `📱 Open Kitchen Panel: ${process.env.FRONTEND_URL || "https://swadkart.vercel.app"}/restaurant/dashboard`
  );
};
