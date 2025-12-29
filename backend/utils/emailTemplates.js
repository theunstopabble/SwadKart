// =================================================================
// 🎨 SWADKART PROFESSIONAL EMAIL TEMPLATES (BRAND FIXED)
// =================================================================

const BRAND_RED = "#ff4757"; // The Swad Color
const BRAND_WHITE = "#ffffff"; // The Kart Color
const BG_COLOR = "#f4f4f5"; // Light Grey Background for body

// 👇 YOUR FRONTEND URL (Ensure this matches your deployed or local URL)
const FRONTEND_URL = "https://swadkart-pro.vercel.app";

// 🏗️ 1. BASE LAYOUT (Professional Header matching your Logo)
const wrapEmail = (content) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      /* Base Resets */
      body { font-family: 'Verdana', 'Arial', sans-serif; background-color: ${BG_COLOR}; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      
      /* Main Container */
      .container { 
        max-width: 600px; 
        margin: 40px auto; 
        background-color: #ffffff; 
        border-radius: 16px; 
        overflow: hidden; 
        box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
        border: 1px solid #e4e4e7;
      }

      /* 🔥 HEADER - MATCHING YOUR BRAND IMAGE EXACTLY */
      .header { 
        background-color: #0d0d0d; /* Pitch Black Background */
        padding: 40px 20px; 
        text-align: center; 
      }

      /* Logo Styling - Thick, Bold, Two Colors */
      .logo-text { 
        font-family: 'Arial Black', 'Arial', sans-serif; /* Thickest standard font */
        font-size: 42px; 
        font-weight: 900; 
        margin: 0; 
        letter-spacing: -1px; 
        text-transform: none; /* As per your image */
        line-height: 1;
      }
      
      .swad { color: ${BRAND_RED}; text-shadow: 2px 2px 0px rgba(0,0,0,0.5); }
      .kart { color: ${BRAND_WHITE}; text-shadow: 2px 2px 0px rgba(0,0,0,0.5); }

      /* Content Body */
      .content { padding: 40px 30px; color: #3f3f46; line-height: 1.6; font-size: 16px; }

      /* Highlights & Boxes */
      .otp-box { 
        background-color: #fef2f2; 
        color: ${BRAND_RED}; 
        font-size: 36px; 
        font-weight: bold; 
        letter-spacing: 5px; 
        text-align: center; 
        padding: 20px; 
        border-radius: 12px; 
        border: 2px dashed ${BRAND_RED}; 
        margin: 30px 0; 
      }

      .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 25px 0; }
      
      /* Order Items Rows */
      .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-size: 15px; }
      .detail-row:last-child { border-bottom: none; }
      
      /* Address Section */
      .address-box { 
        background: #ffffff; 
        padding: 15px; 
        border-radius: 8px; 
        margin-top: 15px; 
        border-left: 4px solid ${BRAND_RED}; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }

      /* Buttons */
      .button { 
        display: inline-block; 
        background-color: ${BRAND_RED}; 
        color: #ffffff !important; 
        text-decoration: none; 
        padding: 16px 40px; 
        border-radius: 50px; 
        font-weight: bold; 
        font-size: 16px;
        margin-top: 25px; 
        box-shadow: 0 4px 10px rgba(255, 71, 87, 0.3);
      }

      /* Footer */
      .footer { background-color: #18181b; padding: 30px; text-align: center; font-size: 13px; color: #71717a; }
      .footer a { color: ${BRAND_RED}; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo-text">
          <span class="swad">Swad</span><span class="kart">Kart</span>
        </div>
      </div>
      
      <div class="content">
        ${content}
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} SwadKart. Taste Delivered.</p>
        <p>Need help? <a href="mailto:support@swadkart.com">Contact Support</a></p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// 🔐 2. OTP TEMPLATE
export const getOtpTemplate = (otp) => {
  const content = `
    <h2 style="color: #18181b; text-align: center; margin-top: 0;">Verification Code 🔐</h2>
    <p style="text-align: center;">Welcome to <strong>SwadKart</strong>! Verify your account to start ordering.</p>
    
    <div class="otp-box">${otp}</div>
    
    <p style="text-align: center; font-size: 14px; color: #71717a;">Valid for 10 minutes. Do not share this code.</p>
  `;
  return wrapEmail(content);
};

// 👋 3. WELCOME TEMPLATE
export const getWelcomeTemplate = (name) => {
  const content = `
    <h1 style="color: ${BRAND_RED}; text-align: center;">Welcome, ${name}! 🥘</h1>
    <p style="text-align: center; font-size: 18px;">Your journey of taste begins here.</p>
    <p>We have successfully created your SwadKart account.</p>
    
    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/" class="button">Explore Menu</a>
    </div>
  `;
  return wrapEmail(content);
};

// 🔑 4. RESET PASSWORD TEMPLATE
export const getResetPasswordTemplate = (resetUrl) => {
  const content = `
    <h2 style="text-align: center;">Reset Password 🛑</h2>
    <p style="text-align: center;">We received a request to change your password.</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset My Password</a>
    </div>
    <p style="text-align: center; margin-top: 20px; font-size: 13px; color: #888;">If you didn't ask for this, ignore this email.</p>
  `;
  return wrapEmail(content);
};

// 📦 5. ORDER CONFIRMATION (User Receipt -> Link to My Orders)
export const getOrderConfirmationTemplate = (order, isPaid) => {
  const statusColor = isPaid ? "#16a34a" : "#f97316";
  const statusIcon = isPaid ? "✅" : "🚚";
  const statusText = isPaid
    ? "Payment Verified & Successful"
    : "Order Placed (Cash on Delivery)";

  const itemsHtml = order.orderItems
    .map(
      (item) => `
    <div class="detail-row">
      <div style="display:flex; align-items:center;">
        <span style="color:${BRAND_RED}; font-weight:bold; margin-right:8px;">${
        item.qty
      }x</span>
        <span style="font-weight:600;">${item.name}</span>
      </div>
      <span style="font-weight:bold;">₹${item.price * item.qty}</span>
    </div>
  `
    )
    .join("");

  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: ${statusColor}; margin:0;">${statusText} ${statusIcon}</h2>
      <p style="margin-top: 5px; color: #71717a;">Order #${order._id
        .toString()
        .slice(-6)
        .toUpperCase()}</p>
    </div>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #18181b; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">🧾 Order Summary</h3>
      ${itemsHtml}
      <div class="detail-row" style="border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 15px;">
        <span style="font-size: 18px; font-weight: bold;">Grand Total</span>
        <span style="font-size: 18px; font-weight: bold; color: ${BRAND_RED};">₹${
    order.totalPrice
  }</span>
      </div>
    </div>

    <div class="address-box">
      <h3 style="margin: 0 0 10px 0; color: #18181b; font-size: 16px;">📍 Delivery Details</h3>
      <p style="margin: 0 0 5px 0; font-weight: 600;">${order.user.name}</p>
      <p style="margin: 0 0 5px 0; color: #52525b;">${
        order.shippingAddress.address
      }</p>
      <p style="margin: 0 0 10px 0; color: #52525b;">${
        order.shippingAddress.city
      } - ${order.shippingAddress.postalCode}</p>
      <p style="margin: 0; font-weight: bold; color: ${BRAND_RED}; background: #fff1f2; display: inline-block; padding: 4px 8px; border-radius: 4px;">
        📞 ${order.shippingAddress.phone}
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/myorders" class="button">Track My Order</a>
    </div>
  `;
  return wrapEmail(content);
};

// 🚨 6. ADMIN ALERT (Link to Admin Dashboard)
export const getAdminOrderAlertTemplate = (order) => {
  const itemsHtml = order.orderItems
    .map((item) => `<li><strong>${item.name}</strong> x ${item.qty}</li>`)
    .join("");

  const content = `
    <h2 style="color: #dc2626; text-align: center;">🚨 New Order Received</h2>
    
    <div class="info-box" style="border-left: 4px solid #dc2626;">
      <p><strong>Customer:</strong> ${order.user.name}</p>
      <p><strong>Total:</strong> ₹${order.totalPrice}</p>
      <p><strong>Mode:</strong> ${order.paymentMethod}</p>
    </div>
    
    <h3>Items to Prepare:</h3>
    <ul>${itemsHtml}</ul>
    
    <div class="address-box">
      <p><strong>Address:</strong> ${order.shippingAddress.address}, ${order.shippingAddress.city}</p>
      <p><strong>Contact:</strong> ${order.shippingAddress.phone}</p>
    </div>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/admin/dashboard" class="button">Go to Admin Dashboard</a>
    </div>
  `;
  return wrapEmail(content);
};

// 🏪 7. RESTAURANT ALERT (Link to Restaurant Dashboard)
export const getRestaurantOrderAlertTemplate = (order, restaurantName) => {
  const itemsHtml = order.orderItems
    .map((item) => `<li><strong>${item.name}</strong> x ${item.qty}</li>`)
    .join("");

  const content = `
    <h2 style="color: ${BRAND_RED}; text-align: center;">🔔 New Order for ${restaurantName}</h2>
    
    <div class="info-box" style="border-left: 4px solid ${BRAND_RED};">
      <p><strong>Customer:</strong> ${order.user.name}</p>
      <p><strong>Total:</strong> ₹${order.totalPrice}</p>
      <p><strong>Mode:</strong> ${order.paymentMethod}</p>
    </div>
    
    <h3>Items:</h3>
    <ul>${itemsHtml}</ul>
    
    <div class="address-box">
      <p><strong>Deliver To:</strong> ${order.shippingAddress.address}, ${order.shippingAddress.city}</p>
    </div>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/restaurant/dashboard" class="button">Open Restaurant Panel</a>
    </div>
  `;
  return wrapEmail(content);
};

// 🛵 8. DELIVERY PARTNER REQUEST (Links to Dashboard for Safe Acceptance)
export const getDeliveryRequestTemplate = (order, partner) => {
  const itemsHtml = order.orderItems
    .map((item) => `<li>${item.name} x ${item.qty}</li>`)
    .join("");

  const content = `
    <h2 style="color: ${BRAND_RED}; text-align: center;">🛵 New Delivery Request</h2>
    <p style="text-align: center;">Hi <strong>${
      partner.name
    }</strong>, a new order has been assigned to you.</p>
    
    <div class="info-box">
      <h3 style="margin:0; border-bottom:1px solid #ddd; padding-bottom:5px;">📦 Order Details</h3>
      <p><strong>Order ID:</strong> #${order._id
        .toString()
        .slice(-6)
        .toUpperCase()}</p>
      <p><strong>Payment:</strong> ${order.paymentMethod} (Total: ₹${
    order.totalPrice
  })</p>
      <ul>${itemsHtml}</ul>
    </div>

    <div class="address-box" style="border-left: 4px solid #000;">
      <h3 style="margin:0; font-size:16px;">📍 Drop Location</h3>
      <p><strong>Customer:</strong> ${order.user.name}</p>
      <p><strong>Address:</strong> ${order.shippingAddress.address}, ${
    order.shippingAddress.city
  }</p>
      <p><strong>Phone:</strong> <a href="tel:${
        order.shippingAddress.phone
      }" style="font-weight:bold; color:${BRAND_RED}; text-decoration:none;">${
    order.shippingAddress.phone
  }</a></p>
    </div>

    <p style="text-align:center; font-weight:bold; margin-top:20px;">Do you want to accept this delivery?</p>

    <div style="text-align: center; margin-top: 10px;">
      <a href="${FRONTEND_URL}/delivery/dashboard" 
         style="display:inline-block; background-color: #16a34a; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
         🚀 Open App to Accept
      </a>
    </div>
  `;
  return wrapEmail(content);
};

// 👤 9. USER NOTIFICATION: DRIVER ASSIGNED (Link to Track Order)
export const getUserDriverAssignedTemplate = (order, partner) => {
  const content = `
    <h2 style="color: ${BRAND_RED}; text-align: center;">On The Way! 🛵</h2>
    <p style="text-align: center;">Your food has been picked up by <b>${partner.name}</b>.</p>
    
    <div class="info-box" style="text-align: center; background: #fff7ed; border-color: #ffedd5;">
      <h3 style="margin-top: 0; color: #9a3412;">Driver Details</h3>
      <div style="font-size: 20px; font-weight: bold; color: #18181b;">${partner.name}</div>
      <a href="tel:${partner.phone}" style="display: inline-block; background: #ea580c; color: white; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; margin-top: 10px;">
        📞 Call: ${partner.phone}
      </a>
    </div>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/myorders" class="button">Track Live</a>
    </div>
  `;
  return wrapEmail(content);
};

// 🚫 10. ORDER CANCELLED (Notification)
export const getOrderCancelledTemplate = (order, reason) => {
  const content = `
    <h2 style="color: #dc2626; text-align: center;">Order Cancelled 🚫</h2>
    <p style="text-align: center;">Order <strong>#${order._id
      .toString()
      .slice(-6)
      .toUpperCase()}</strong> has been cancelled.</p>
    
    <div class="info-box" style="background: #fff1f2; border-color: #fecdd3;">
      <p><strong>Reason:</strong> ${reason || "Changed my mind"}</p>
      <p><strong>Refund Status:</strong> If paid online, the refund will be processed to your original payment method within 5-7 business days.</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/" class="button">Browse Other Food</a>
    </div>
  `;
  return wrapEmail(content);
};
