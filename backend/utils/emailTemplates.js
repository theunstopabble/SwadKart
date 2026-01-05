// =================================================================
// 🎨 SWADKART PROFESSIONAL EMAIL TEMPLATES (MODERN UI 2025)
// =================================================================

const BRAND_RED = "#ff4757"; // The Swad Color
const BRAND_DARK = "#1f2937"; // Dark text
const BRAND_GRAY = "#9ca3af"; // Light text
const BG_COLOR = "#f3f4f6"; // Modern Light Grey Background

// 👇 YOUR FRONTEND URL (Dynamic based on Environment)
const FRONTEND_URL = process.env.FRONTEND_URL;

// =================================================================
// 🏗️ 1. BASE LAYOUT (WRAPPER)
// =================================================================
const wrapEmail = (content, title = "Notification") => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      /* Reset & Base */
      body { margin: 0; padding: 0; background-color: ${BG_COLOR}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: ${BRAND_DARK}; }
      table { border-spacing: 0; width: 100%; }
      td { padding: 0; }
      img { border: 0; }
      
      /* Container */
      .wrapper { width: 100%; table-layout: fixed; background-color: ${BG_COLOR}; padding-bottom: 40px; }
      .main-container { background-color: #ffffff; margin: 0 auto; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
      
      /* 🔥 Header (Your Brand) */
      .header { background-color: #0d0d0d; padding: 30px 20px; text-align: center; }
      .logo-text { font-family: 'Arial Black', 'Arial', sans-serif; font-size: 38px; font-weight: 900; margin: 0; letter-spacing: -1px; line-height: 1; }
      .swad { color: ${BRAND_RED}; text-shadow: 2px 2px 0px rgba(255,255,255,0.1); }
      .kart { color: #ffffff; }

      /* Content Body */
      .body-content { padding: 40px 30px; }
      
      /* Typography */
      h1, h2, h3 { margin: 0 0 15px 0; color: ${BRAND_DARK}; line-height: 1.2; }
      p { margin: 0 0 15px 0; font-size: 16px; line-height: 1.6; color: #4b5563; }
      
      /* Components */
      .btn { display: inline-block; background-color: ${BRAND_RED}; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 50px; font-weight: bold; font-size: 16px; text-align: center; transition: background 0.3s; box-shadow: 0 4px 6px rgba(255, 71, 87, 0.25); }
      .btn:hover { background-color: #e04050; }
      
      .card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
      
      /* Order Receipt Styles */
      .receipt-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .receipt-row td { padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
      .receipt-row:last-child td { border-bottom: none; }
      .item-qty { font-weight: bold; color: ${BRAND_RED}; white-space: nowrap; padding-right: 10px; }
      .item-name { font-weight: 600; color: ${BRAND_DARK}; font-size: 15px; }
      .item-meta { font-size: 13px; color: #6b7280; margin-top: 4px; display: block; line-height: 1.4; }
      .item-meta span { background: #fff; border: 1px solid #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #4b5563; margin-right: 4px; display: inline-block; margin-top: 2px; }
      .item-price { font-weight: bold; text-align: right; white-space: nowrap; color: ${BRAND_DARK}; }
      
      .total-row td { padding-top: 15px; border-top: 2px dashed #d1d5db; font-size: 18px; font-weight: 800; color: ${BRAND_DARK}; }
      
      /* Footer */
      .footer { background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb; }
      .footer p { font-size: 12px; color: #9ca3af; margin-bottom: 8px; }
      .footer a { color: ${BRAND_RED}; text-decoration: none; font-weight: 600; }
      
      /* Utilities */
      a.phone-link { text-decoration: none; color: inherit; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="main-container">
        <div class="header">
          <div class="logo-text"><span class="swad">Swad</span><span class="kart">Kart</span></div>
        </div>

        <div class="body-content">
          ${content}
        </div>

        <div class="footer">
          <p>Delivered with ❤️ by SwadKart Team</p>
          <p>© ${new Date().getFullYear()} SwadKart. All rights reserved.</p>
          <p>
            <a href="${FRONTEND_URL}">Visit Website</a> • 
            <a href="mailto:${
              process.env.SMTP_MAIL || "support@swadkart.com"
            }">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};

// =================================================================
// 🔐 2. AUTHENTICATION TEMPLATES
// =================================================================

// OTP Template
export const getOtpTemplate = (otp) => {
  const content = `
    <div style="text-align: center;">
      <h2 style="font-size: 24px; margin-bottom: 10px;">Verify Your Account</h2>
      <p>Use the code below to complete your sign-in process. This code is valid for 10 minutes.</p>
      
      <div style="background: #fff1f2; color: ${BRAND_RED}; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 20px; margin: 30px 0; border-radius: 12px; border: 2px dashed #fecdd3; display: inline-block; min-width: 200px;">
        ${otp}
      </div>
      
      <p style="font-size: 13px; color: #9ca3af;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
  return wrapEmail(content, "Verification Code");
};

// Welcome Template
export const getWelcomeTemplate = (name) => {
  const content = `
    <div style="text-align: center;">
      <h1 style="font-size: 28px; margin-bottom: 15px;">Welcome to the Family! 🍕</h1>
      <p>Hi <strong>${name}</strong>, we are thrilled to have you on board. Get ready to experience the fastest delivery and tastiest meals in town.</p>
      
      <div style="margin: 35px 0;">
        <a href="${FRONTEND_URL}/" class="btn">Order Now</a>
      </div>
      
      <p style="font-size: 14px;">Your taste journey begins here!</p>
    </div>
  `;
  return wrapEmail(content, "Welcome to SwadKart");
};

// Reset Password
export const getResetPasswordTemplate = (resetUrl) => {
  const content = `
    <div style="text-align: center;">
      <h2 style="margin-bottom: 15px;">Reset Your Password 🔒</h2>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      
      <div style="margin: 35px 0;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      
      <p style="font-size: 13px; color: #9ca3af;">This link expires in 1 hour. If you didn't ask for this, you can safely ignore this email.</p>
    </div>
  `;
  return wrapEmail(content, "Reset Password");
};

// =================================================================
// 📦 3. ORDER & NOTIFICATION TEMPLATES
// =================================================================

// Order Confirmation
export const getOrderConfirmationTemplate = (order, isPaid) => {
  const statusColor = isPaid ? "#10b981" : "#f59e0b"; // Green or Amber
  const statusText = isPaid ? "Payment Successful" : "Order Placed (COD)";

  // Logic for Variants & Addons in Table
  const itemsHtml = order.orderItems
    .map((item) => {
      let metaHtml = "";
      // Variants
      if (item.selectedVariant) {
        metaHtml += `<span>Size: ${item.selectedVariant.name}</span>`;
      }
      // Addons
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        const addonNames = item.selectedAddons.map((a) => a.name).join(", ");
        metaHtml += `<span>+ ${addonNames}</span>`;
      }

      return `
      <tr class="receipt-row">
        <td width="10%" class="item-qty">${item.qty}x</td>
        <td width="70%">
          <div class="item-name">${item.name}</div>
          ${metaHtml ? `<div class="item-meta">${metaHtml}</div>` : ""}
        </td>
        <td width="20%" class="item-price">₹${item.price * item.qty}</td>
      </tr>
    `;
    })
    .join("");

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: ${statusColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">${statusText}</div>
      <h2 style="margin: 0;">Thanks for your order!</h2>
      <p style="color: #6b7280; font-size: 14px;">Order ID: #${order._id
        .toString()
        .slice(-6)
        .toUpperCase()}</p>
    </div>

    <div class="card">
      <h3 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 10px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">Receipt</h3>
      <table class="receipt-table">
        ${itemsHtml}
        <tr class="total-row">
          <td colspan="2" style="text-align: left;">TOTAL</td>
          <td style="text-align: right; color: ${BRAND_RED};">₹${
    order.totalPrice
  }</td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 25px;">
      <h3 style="font-size: 16px;">📍 Delivering To:</h3>
      <p style="margin-bottom: 5px; font-weight: bold; color: ${BRAND_DARK};">${
    order.user.name
  }</p>
      <p style="font-size: 14px; margin-bottom: 5px;">${
        order.shippingAddress.address
      }</p>
      <p style="font-size: 14px; color: #6b7280;">${
        order.shippingAddress.city
      } - ${order.shippingAddress.postalCode}</p>
      <p style="font-size: 14px; color: ${BRAND_RED}; font-weight: bold;">
        <a href="tel:${order.shippingAddress.phone}" class="phone-link">📞 ${
    order.shippingAddress.phone
  }</a>
      </p>
    </div>

    <div style="text-align: center; margin-top: 40px;">
      <a href="${FRONTEND_URL}/myorders" class="btn">Track Order</a>
    </div>
  `;
  return wrapEmail(content, "Order Confirmation");
};

// Admin Alert
export const getAdminOrderAlertTemplate = (order) => {
  const itemsHtml = order.orderItems
    .map((item) => {
      let meta = "";
      if (item.selectedVariant)
        meta += ` <span style="color:#6b7280; font-size:12px;">(${item.selectedVariant.name})</span>`;
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        meta += `<div style="font-size:12px; color:#10b981; margin-left:20px;">+ ${item.selectedAddons
          .map((a) => a.name)
          .join(", ")}</div>`;
      }
      return `<li style="margin-bottom: 8px;"><strong>${item.name}</strong> x ${item.qty}${meta}</li>`;
    })
    .join("");

  const content = `
    <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px; display: inline-block;">🚨 New Order Alert</h2>
    
    <div class="card" style="border-left: 4px solid #ef4444; margin-top: 20px;">
      <p><strong>Customer:</strong> ${order.user.name}</p>
      <p><strong>Amount:</strong> ₹${order.totalPrice}</p>
      <p><strong>Payment:</strong> ${order.paymentMethod}</p>
    </div>

    <h3>📋 Order Details</h3>
    <ul style="padding-left: 20px; color: ${BRAND_DARK};">
      ${itemsHtml}
    </ul>

    <div style="margin-top: 20px; padding: 15px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;">
      <p style="font-size: 12px; color: #9ca3af; margin-bottom: 5px;">DELIVERY ADDRESS</p>
      <p style="margin: 0;">${order.shippingAddress.address}, ${order.shippingAddress.city}</p>
      <p style="margin-top: 5px; font-weight: bold;">
        <a href="tel:${order.shippingAddress.phone}" class="phone-link">📞 ${order.shippingAddress.phone}</a>
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${FRONTEND_URL}/admin/dashboard" class="btn" style="background-color: #1f2937;">Admin Dashboard</a>
    </div>
  `;
  return wrapEmail(content, "New Order Received");
};

// Restaurant Alert
export const getRestaurantOrderAlertTemplate = (order, restaurantName) => {
  const itemsHtml = order.orderItems
    .map((item) => {
      let meta = "";
      if (item.selectedVariant)
        meta += `<br><span style="color:#6b7280; font-size:13px; font-weight:bold;">👉 Size: ${item.selectedVariant.name}</span>`;
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        meta += `<br><span style="color:#10b981; font-size:13px; font-weight:bold;">👉 Extras: ${item.selectedAddons
          .map((a) => a.name)
          .join(", ")}</span>`;
      }
      return `<li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #e5e7eb;">
      <span style="font-size: 16px;"><strong>${item.name}</strong> x ${item.qty}</span>
      ${meta}
    </li>`;
    })
    .join("");

  const content = `
    <h2 style="color: ${BRAND_RED}; text-align: center;">🔔 New Order for ${restaurantName}</h2>
    
    <div class="card" style="border-left: 4px solid ${BRAND_RED};">
      <div style="display:flex; justify-content:space-between;">
        <div><strong>Customer</strong><br>${order.user.name}</div>
        <div style="text-align:right;"><strong>Total</strong><br>₹${order.totalPrice}</div>
      </div>
    </div>

    <h3 style="background: #e5e7eb; padding: 10px; border-radius: 6px; text-align: center;">Prepare These Items 👇</h3>
    <ul style="list-style: none; padding: 0; margin-top: 20px;">
      ${itemsHtml}
    </ul>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${FRONTEND_URL}/restaurant/dashboard" class="btn">Go to Kitchen Panel</a>
    </div>
  `;
  return wrapEmail(content, "New Kitchen Order");
};

// Delivery Request
export const getDeliveryRequestTemplate = (order, partner) => {
  const itemsHtml = order.orderItems
    .map((item) => {
      const sizeInfo = item.selectedVariant
        ? ` (${item.selectedVariant.name})`
        : "";
      return `<li style="margin-bottom: 5px;">${item.name}${sizeInfo} x ${item.qty}</li>`;
    })
    .join("");

  const content = `
    <h2 style="text-align: center;">🛵 Delivery Request</h2>
    <p style="text-align: center;">Hi <strong>${
      partner.name
    }</strong>, a new order is available for pickup.</p>
    
    <div class="card">
      <h3 style="margin-bottom: 10px; font-size: 14px; color: #6b7280; text-transform: uppercase;">Order Details</h3>
      <p><strong>ID:</strong> #${order._id
        .toString()
        .slice(-6)
        .toUpperCase()}</p>
      <p><strong>Payment:</strong> ${order.paymentMethod} (₹${
    order.totalPrice
  })</p>
      <hr style="border: 0; border-top: 1px dashed #e5e7eb; margin: 10px 0;">
      <ul style="padding-left: 20px; margin: 0;">${itemsHtml}</ul>
    </div>

    <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-top: 20px;">
      <h3 style="margin: 0 0 5px 0; color: #047857;">📍 Drop Location</h3>
      <p style="margin: 0; font-weight: bold;">${order.user.name}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px;">${
        order.shippingAddress.address
      }, ${order.shippingAddress.city}</p>
      <p style="margin-top: 5px; font-weight: bold; color: ${BRAND_RED};">
        <a href="tel:${order.shippingAddress.phone}" class="phone-link">📞 ${
    order.shippingAddress.phone
  }</a>
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${FRONTEND_URL}/delivery/dashboard" class="btn" style="background-color: #10b981;">Open App to Accept</a>
    </div>
  `;
  return wrapEmail(content, "New Delivery Request");
};

// Driver Assigned
export const getUserDriverAssignedTemplate = (order, partner) => {
  const content = `
    <div style="text-align: center;">
      <h2 style="color: ${BRAND_RED};">On The Way! 🛵</h2>
      <p>Good news! Your food has been picked up.</p>
      
      <div style="margin: 30px auto; max-width: 300px; text-align: center;">
        <div style="width: 80px; height: 80px; background: #e5e7eb; border-radius: 50%; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center; font-size: 30px;">👤</div>
        <h3 style="margin: 0;">${partner.name}</h3>
        <p style="font-size: 14px; color: #6b7280; margin-top: 5px;">is your delivery partner</p>
        
        <div style="margin-top: 15px;">
          <a href="tel:${partner.phone}" style="background: #f3f4f6; color: ${BRAND_DARK}; text-decoration: none; padding: 8px 16px; border-radius: 20px; font-weight: bold; border: 1px solid #d1d5db;">📞 Call Driver</a>
        </div>
      </div>

      <a href="${FRONTEND_URL}/myorders" class="btn">Track on Map</a>
    </div>
  `;
  return wrapEmail(content, "Driver Assigned");
};

// Order Cancelled
export const getOrderCancelledTemplate = (order, reason) => {
  const content = `
    <div style="text-align: center;">
      <h2 style="color: #ef4444;">Order Cancelled 🚫</h2>
      <p>Order <strong>#${order._id
        .toString()
        .slice(-6)
        .toUpperCase()}</strong> has been cancelled.</p>
      
      <div class="card" style="background-color: #fef2f2; border-color: #fecaca; color: #991b1b; text-align: left;">
        <p><strong>Reason:</strong> ${reason || "Changed my mind"}</p>
        <p style="margin-top: 10px; font-size: 13px;"><strong>Refund Note:</strong> If you paid online, the refund will be processed to your original payment source within 5-7 business days.</p>
      </div>
      
      <div style="margin-top: 30px;">
        <a href="${FRONTEND_URL}/" class="btn">Browse Other Restaurants</a>
      </div>
    </div>
  `;
  return wrapEmail(content, "Order Cancelled");
};
